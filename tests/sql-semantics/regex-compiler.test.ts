import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { PGlite } from '@electric-sql/pglite'
import ts from 'typescript'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { printFile } from '../../src/codegen/typescript/ast.js'
import { REGEX_ANALYZER_SOURCES } from '../../src/codegen/typescript/sql/regex-analyzer.generated.js'
import { typescriptSqlRuntime } from '../../src/codegen/typescript/sql/runtime.js'
import { goSqlRuntime } from '../../src/codegen/go/sql/runtime.js'
import type { PostgresRegexOptions } from '../../src/sql-semantics/regex/ast.js'
import { compilePostgresRegex, type CompiledRegex } from '../../src/sql-semantics/regex/compiler.js'
import { REGEX_ENGINE_PROFILES } from '../../src/sql-semantics/regex/profiles.generated.js'
import {
  loadRegexConformanceVectors,
  parseRegexConformanceVectors,
  regexCapabilityReport,
  type RegexConformanceVector,
} from '../fixtures/sql-semantics/regex/conformance.js'
import {
  invalidRegexPatterns,
  validRegexPatterns,
} from '../fixtures/sql-semantics/regex/parser-patterns.js'

const run = promisify(execFile)

const mixedRegexPatterns = (): string[] => {
  const fragments = [
    'a',
    '😀',
    '|',
    '(',
    ')',
    '(?:',
    '(?=',
    '[a-z]',
    '[[:digit:]]',
    '[^x]',
    '*',
    '+?',
    '{2,3}',
    '^',
    '$',
    String.raw`\d`,
    String.raw`\0`,
    String.raw`\A`,
    String.raw`\x41`,
    String.raw`\1`,
  ]
  let seed = 0x5eed
  const next = (): number => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) % 20
  return Array.from({ length: 300 }, () =>
    Array.from({ length: 1 + (next() % 5) }, () => fragments[next()]!).join(''),
  )
}

const requireSupported = (result: CompiledRegex): Extract<CompiledRegex, { kind: 'supported' }> => {
  expect(result.kind).toBe('supported')
  if (result.kind !== 'supported')
    throw new Error(`Expected supported regex, received ${result.kind}`)
  return result
}

const goString = (value: string): string => JSON.stringify(value)

const executeRe2 = async (
  compiled: readonly { regex: Extract<CompiledRegex, { kind: 'supported' }>; subject: string }[],
): Promise<readonly boolean[]> => {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-regex-re2-'))
  try {
    const evaluations = compiled
      .map(({ regex, subject }) => {
        expect(regex.flags).toEqual([])
        return `regexp.MustCompile(${goString(regex.source)}).MatchString(${goString(subject)})`
      })
      .join(',\n')
    await writeFile(join(directory, 'go.mod'), 'module regex-evidence\n\ngo 1.24\n')
    await writeFile(
      join(directory, 'main.go'),
      `package main

import (
  "encoding/json"
  "fmt"
  "regexp"
)

func main() {
  results := []bool{
${evaluations},
  }
  output, _ := json.Marshal(results)
  fmt.Print(string(output))
}
`,
    )
    const { stdout } = await run(process.env.PGSID_GO_BINARY ?? 'go', ['run', '.'], {
      cwd: directory,
      env: {
        ...process.env,
        GOCACHE: join(tmpdir(), 'pgsid-sql-semantics-go-cache'),
        GOTOOLCHAIN: 'local',
        GOFLAGS: '-mod=readonly',
      },
    })
    return JSON.parse(stdout) as boolean[]
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

let pg: PGlite
let vectors: readonly RegexConformanceVector[]

describe('PostgreSQL regex compatibility compiler', () => {
  beforeAll(async () => {
    vectors = await loadRegexConformanceVectors()
    pg = await PGlite.create()
    await pg.exec('BEGIN')
  })

  afterAll(async () => {
    await pg.exec('ROLLBACK')
    await pg.close()
  })

  it('matches PostgreSQL observations for every shared vector', async () => {
    for (const vector of vectors) {
      const { caseSensitive, ...otherOptions } = vector.options
      expect(otherOptions).toEqual({})
      const operator = caseSensitive === false ? '~*' : '~'
      await pg.exec('SAVEPOINT regex_conformance')
      let observed: { match: boolean } | { sqlstate: string }
      try {
        const result = await pg.query<{ value: boolean }>(
          `SELECT ($1::text COLLATE "C") ${operator} $2::text AS value`,
          [vector.subject, vector.pattern],
        )
        observed = { match: result.rows[0]!.value }
        await pg.exec('RELEASE SAVEPOINT regex_conformance')
      } catch (error) {
        observed = { sqlstate: (error as { code?: string }).code ?? '' }
        await pg.exec('ROLLBACK TO SAVEPOINT regex_conformance')
        await pg.exec('RELEASE SAVEPOINT regex_conformance')
      }
      expect(observed, vector.id).toEqual(vector.expected)
    }
  })

  it('executes every supported ECMAScript vector', () => {
    const supported = vectors.flatMap((vector) => {
      const result = compilePostgresRegex(
        vector.pattern,
        REGEX_ENGINE_PROFILES.ecmascript,
        vector.options,
      )
      if (result.kind !== 'supported') return []
      if (!('match' in vector.expected)) throw new Error(`Invalid supported vector ${vector.id}`)
      return [{ subject: vector.subject, expected: vector.expected.match, regex: result }]
    })
    expect(
      supported.map(({ subject, regex }) =>
        new RegExp(regex.source, regex.flags.join('')).test(subject),
      ),
    ).toEqual(supported.map(({ expected }) => expected))
  })

  it('executes every supported RE2 vector', async () => {
    const supported = vectors.flatMap((vector) => {
      const result = compilePostgresRegex(vector.pattern, REGEX_ENGINE_PROFILES.re2, vector.options)
      if (result.kind !== 'supported') return []
      if (!('match' in vector.expected)) throw new Error(`Invalid supported vector ${vector.id}`)
      return [{ subject: vector.subject, expected: vector.expected.match, regex: result }]
    })
    expect(await executeRe2(supported.map(({ subject, regex }) => ({ regex, subject })))).toEqual(
      supported.map(({ expected }) => expected),
    )
  })

  it('reports target decisions and evidence for every enabled feature', () => {
    for (const profile of Object.values(REGEX_ENGINE_PROFILES)) {
      for (const vector of vectors) {
        const result = compilePostgresRegex(vector.pattern, profile, vector.options)
        if ('sqlstate' in vector.expected) {
          expect(result, vector.id).toMatchObject(vector.expected)
          continue
        }
        const unavailable = vector.features.filter(
          (feature) => profile.features[feature] === 'unsupported',
        )
        if (unavailable.length > 0)
          expect(result, vector.id).toEqual({ kind: 'unsupported', features: unavailable })
        else expect(result.kind, vector.id).toBe('supported')
      }
    }
    const report = regexCapabilityReport(vectors, Object.values(REGEX_ENGINE_PROFILES))
    expect(
      report
        .filter((row) => row.strategy !== 'unsupported')
        .every((row) => row.evidence.length > 0),
    ).toBe(true)
    expect(() =>
      regexCapabilityReport(
        vectors.filter((vector) => !vector.features.includes('empty-expression')),
        Object.values(REGEX_ENGINE_PROFILES),
      ),
    ).toThrow(/No conformance evidence for ecmascript.empty-expression/u)
  })

  it('runs shared vectors through a generated TypeScript analyzer', async () => {
    const source = printFile(typescriptSqlRuntime(['evalBoolRegexDynamic', 'evalBoolAnd']))
    expect(source).toContain('function evalBoolRegexAnalyze')
    expect(source).not.toContain('re2.escape-literal')
    expect(printFile(typescriptSqlRuntime(['evalBoolRegex']))).not.toContain(
      'function evalBoolRegexAnalyze',
    )
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-regex-analyzer-typescript-'))
    try {
      const path = join(directory, 'analyzer.ts')
      await writeFile(path, source)
      const program = ts.createProgram([path], {
        strict: true,
        noEmit: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        types: [],
        lib: ['lib.es2022.d.ts'],
        skipLibCheck: true,
      })
      expect(
        ts
          .getPreEmitDiagnostics(program)
          .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')),
      ).toEqual([])
      const output = ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
      }).outputText
      const generated = Function(
        `${output}\nreturn { analyze: evalBoolRegexAnalyze, evaluate: evalBoolRegexDynamic, and: evalBoolAnd, certain: evalBoolCertain }`,
      )() as {
        analyze: (pattern: string, options: RegexConformanceVector['options']) => CompiledRegex
        evaluate: (
          value: string | null,
          pattern: string | null,
          options: RegexConformanceVector['options'],
          negated: boolean,
        ) => { certain: false } | { certain: true; value: boolean | null }
        and: (
          left: () => { certain: true; value: boolean | null },
          right: () => { certain: true; value: boolean | null },
        ) => { certain: true; value: boolean | null }
        certain: (value: boolean | null) => { certain: true; value: boolean | null }
      }
      for (const vector of vectors) {
        expect(generated.analyze(vector.pattern, vector.options), vector.id).toEqual(
          compilePostgresRegex(vector.pattern, REGEX_ENGINE_PROFILES.ecmascript, vector.options),
        )
        if ('sqlstate' in vector.expected) {
          try {
            generated.evaluate(vector.subject, vector.pattern, vector.options, false)
            throw new Error(`Expected SQLSTATE ${vector.expected.sqlstate}`)
          } catch (error) {
            expect(error, vector.id).toMatchObject({ code: vector.expected.sqlstate })
          }
          continue
        }
        const analyzed = generated.analyze(vector.pattern, vector.options)
        const result = generated.evaluate(vector.subject, vector.pattern, vector.options, false)
        expect(result, vector.id).toEqual(
          analyzed.kind === 'supported'
            ? { certain: true, value: vector.expected.match }
            : { certain: false },
        )
      }
      expect(generated.evaluate(null, '(', {}, false)).toEqual({ certain: true, value: null })
      expect(generated.evaluate('abc', null, {}, false)).toEqual({ certain: true, value: null })
      expect(generated.evaluate('ABC', 'abc', {}, true)).toEqual({ certain: true, value: true })
      expect(
        generated.and(
          () => generated.certain(false),
          () => generated.evaluate('abc', '(', {}, false) as { certain: true; value: null },
        ),
      ).toEqual({ certain: true, value: false })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('generates a TypeScript analyzer for the RE2 profile', async () => {
    const source = REGEX_ANALYZER_SOURCES.re2
    expect(source).toContain('re2.escape-literal')
    expect(source).not.toContain('ecmascript.escape-literal')
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-regex-analyzer-re2-'))
    try {
      const path = join(directory, 'analyzer.ts')
      await writeFile(path, source)
      const program = ts.createProgram([path], {
        strict: true,
        noEmit: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        types: [],
        lib: ['lib.es2022.d.ts'],
        skipLibCheck: true,
      })
      expect(
        ts
          .getPreEmitDiagnostics(program)
          .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')),
      ).toEqual([])
      const output = ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
      }).outputText
      const analyze = Function(`${output}\nreturn evalBoolRegexAnalyze`)() as (
        pattern: string,
        options: RegexConformanceVector['options'],
      ) => CompiledRegex
      for (const vector of vectors)
        expect(analyze(vector.pattern, vector.options), vector.id).toEqual(
          compilePostgresRegex(vector.pattern, REGEX_ENGINE_PROFILES.re2, vector.options),
        )
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('runs shared vectors through the generated Go analyzer', async () => {
    const runtime = goSqlRuntime(['evalBoolRegexAnalyze'], 'main')
    expect(runtime).toContain('func regexProfileFeature')
    expect(runtime).not.toContain('ecmascript.escape-literal')
    const cases: { id: string; pattern: string; options: PostgresRegexOptions }[] = [
      ...vectors.map((vector) => ({
        id: vector.id,
        pattern: vector.pattern,
        options: vector.options,
      })),
      ...validRegexPatterns.map((pattern) => ({ id: pattern, pattern, options: {} })),
      ...invalidRegexPatterns.map((pattern) => ({ id: pattern, pattern, options: {} })),
      ...mixedRegexPatterns().map((pattern) => ({ id: pattern, pattern, options: {} })),
      ...(
        [
          { syntax: 'basic' },
          { syntax: 'extended' },
          { syntax: 'literal' },
          { caseSensitive: false },
          { expanded: true },
          { newline: 'sensitive' },
          { newline: 'stop' },
          { newline: 'anchors' },
        ] as const satisfies readonly PostgresRegexOptions[]
      ).flatMap((options) =>
        [...validRegexPatterns, ...invalidRegexPatterns].map((pattern) => ({
          id: `${JSON.stringify(options)} ${pattern}`,
          pattern,
          options,
        })),
      ),
    ]
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-regex-analyzer-go-'))
    try {
      await writeFile(join(directory, 'go.mod'), 'module regex-analyzer\n\ngo 1.24\n')
      await writeFile(join(directory, 'runtime.go'), runtime)
      await writeFile(
        join(directory, 'main.go'),
        `package main
import ("encoding/json"; "os")
func main() {
  results := []regexDecision{
${cases
  .map(
    (fixture) =>
      `evalBoolRegexAnalyze(${goString(fixture.pattern)}, ${goString(fixture.options.syntax ?? 'advanced')}, ${fixture.options.caseSensitive !== false}, ${fixture.options.expanded === true}, ${goString(fixture.options.newline ?? 'ordinary')}),`,
  )
  .join('\n')}
  }
  if err := json.NewEncoder(os.Stdout).Encode(results); err != nil { panic(err) }
}`,
      )
      const { stdout } = await run(process.env.PGSID_GO_BINARY ?? 'go', ['run', '.'], {
        cwd: directory,
        env: {
          ...process.env,
          GOCACHE: join(tmpdir(), 'pgsid-sql-semantics-go-cache'),
          GOTOOLCHAIN: 'local',
          GOFLAGS: '-mod=readonly',
        },
      })
      const decisions = JSON.parse(stdout) as {
        Kind: string
        Source: string
        Flags: string[] | null
        Features: string[] | null
        Error: string
        Position: number
      }[]
      expect(decisions).toHaveLength(cases.length)
      for (const [index, fixture] of cases.entries()) {
        const result = decisions[index]!
        const expected = compilePostgresRegex(
          fixture.pattern,
          REGEX_ENGINE_PROFILES.re2,
          fixture.options,
        )
        expect(result.Kind, fixture.id).toBe(expected.kind)
        if (expected.kind === 'supported') {
          expect({ source: result.Source, flags: result.Flags ?? [] }, fixture.id).toEqual({
            source: expected.source,
            flags: expected.flags,
          })
        } else if (expected.kind === 'unsupported')
          expect(result.Features, fixture.id).toEqual(expected.features)
        else
          expect({ error: result.Error, position: result.Position }, fixture.id).toEqual({
            error: expected.error,
            position: expected.position,
          })
      }
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('reports valid but unavailable semantics separately from invalid patterns', () => {
    expect(compilePostgresRegex('a|b', REGEX_ENGINE_PROFILES.ecmascript)).toEqual({
      kind: 'unsupported',
      features: ['alternation'],
    })
    expect(compilePostgresRegex('(?i)abc', REGEX_ENGINE_PROFILES.re2)).toEqual({
      kind: 'unsupported',
      features: ['case-insensitive'],
    })
    expect(compilePostgresRegex('(', REGEX_ENGINE_PROFILES.ecmascript)).toMatchObject({
      kind: 'invalid',
      sqlstate: '2201B',
    })
  })

  it('uses target recipes for absolute end-of-string semantics', () => {
    expect(requireSupported(compilePostgresRegex('$', REGEX_ENGINE_PROFILES.ecmascript))).toEqual({
      kind: 'supported',
      source: String.raw`(?![\s\S])`,
      flags: ['u'],
    })
    expect(requireSupported(compilePostgresRegex('$', REGEX_ENGINE_PROFILES.re2))).toEqual({
      kind: 'supported',
      source: String.raw`\z`,
      flags: [],
    })
  })

  it('preserves PostgreSQL strictness and lazy invalid-pattern errors', async () => {
    expect((await pg.query("SELECT NULL::text ~ '(' AS value")).rows).toEqual([{ value: null }])
    expect((await pg.query("SELECT false AND ('value'::text ~ '(') AS value")).rows).toEqual([
      { value: false },
    ])
    await expect(pg.query("SELECT true AND ('value'::text ~ '(') AS value")).rejects.toMatchObject({
      code: '2201B',
    })
  })

  it('rejects malformed or mislabeled conformance vectors', () => {
    const raw = `schema: pgsid.regex-conformance/v1
vectors:
  - id: empty
    pattern: ''
    options: {}
    subject: ''
    expected: { match: true }
    features: [empty-expression, case-sensitive, unicode-code-points, substring-search]
`
    expect(() => parseRegexConformanceVectors(raw.replace('empty-expression', 'literal'))).toThrow(
      /Incorrect regex conformance features/u,
    )
    expect(() =>
      parseRegexConformanceVectors(
        raw.replace('  - id: empty', '  - id: empty\n    invented: true'),
      ),
    ).toThrow()
    expect(() =>
      parseRegexConformanceVectors(
        raw
          .replace("pattern: ''", "pattern: &pattern ''")
          .replace("subject: ''", 'subject: *pattern'),
      ),
    ).toThrow(/aliases are not allowed/u)
  })
})
