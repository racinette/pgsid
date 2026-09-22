import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { compilePostgresRegex, type CompiledRegex } from '../../src/sql-semantics/regex/compiler.js'
import { postgresRegexFeatures } from '../../src/sql-semantics/regex/features.js'
import { parsePostgresRegex } from '../../src/sql-semantics/regex/parser.js'
import type { RegexSemanticFeature } from '../../src/sql-semantics/regex/profile.js'
import { REGEX_ENGINE_PROFILES } from '../../src/sql-semantics/regex/profiles.generated.js'

const run = promisify(execFile)

const fixtures = [
  { pattern: '', subject: '', expected: true },
  { pattern: '', subject: 'anything', expected: true },
  { pattern: 'abc', subject: 'xxabcyy', expected: true },
  { pattern: 'abc', subject: 'ab', expected: false },
  { pattern: '😀', subject: 'before😀after', expected: true },
  { pattern: String.raw`a\.b`, subject: 'xa.by', expected: true },
  { pattern: String.raw`a\.b`, subject: 'xacby', expected: false },
  { pattern: '***=a.*', subject: 'xa.*y', expected: true },
  { pattern: '***=a.*', subject: 'axxx', expected: false },
  { pattern: '^abc$', subject: 'abc', expected: true },
  { pattern: '^abc$', subject: 'xabc', expected: false },
  { pattern: '^abc$', subject: 'abc\n', expected: false },
  { pattern: String.raw`\Aabc\Z`, subject: 'abc', expected: true },
  { pattern: String.raw`\Aabc\Z`, subject: 'abc\n', expected: false },
  { pattern: '^$', subject: '', expected: true },
  { pattern: '^$', subject: '\n', expected: false },
] as const

const requireSupported = (result: CompiledRegex): Extract<CompiledRegex, { kind: 'supported' }> => {
  expect(result.kind).toBe('supported')
  if (result.kind !== 'supported')
    throw new Error(`Expected supported regex, received ${result.kind}`)
  return result
}

const goString = (value: string): string => JSON.stringify(value)

const executeRe2 = async (
  compiled: readonly Extract<CompiledRegex, { kind: 'supported' }>[],
): Promise<readonly boolean[]> => {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-regex-re2-'))
  try {
    const evaluations = compiled
      .map((regex, index) => {
        expect(regex.flags).toEqual([])
        return `regexp.MustCompile(${goString(regex.source)}).MatchString(${goString(fixtures[index]!.subject)})`
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

describe('PostgreSQL regex compatibility compiler', () => {
  beforeAll(async () => {
    pg = await PGlite.create()
  })

  afterAll(async () => {
    await pg.close()
  })

  it('matches PostgreSQL in ECMAScript and RE2 for every enabled lowering feature', async () => {
    const postgres: boolean[] = []
    for (const fixture of fixtures) {
      const result = await pg.query<{ value: boolean }>('SELECT $1::text ~ $2::text AS value', [
        fixture.subject,
        fixture.pattern,
      ])
      postgres.push(result.rows[0]!.value)
    }
    expect(postgres).toEqual(fixtures.map((fixture) => fixture.expected))

    const ecmascript = fixtures.map((fixture) =>
      requireSupported(compilePostgresRegex(fixture.pattern, REGEX_ENGINE_PROFILES.ecmascript)),
    )
    expect(
      ecmascript.map((regex, index) =>
        new RegExp(regex.source, regex.flags.join('')).test(fixtures[index]!.subject),
      ),
    ).toEqual(postgres)

    const re2 = fixtures.map((fixture) =>
      requireSupported(compilePostgresRegex(fixture.pattern, REGEX_ENGINE_PROFILES.re2)),
    )
    expect(await executeRe2(re2)).toEqual(postgres)

    const evidenced = new Set<RegexSemanticFeature>()
    for (const fixture of fixtures) {
      const parsed = parsePostgresRegex(fixture.pattern)
      if (parsed.kind !== 'valid') throw new Error(`Expected valid fixture ${fixture.pattern}`)
      postgresRegexFeatures(parsed.regex).forEach((feature) => evidenced.add(feature))
    }
    for (const profile of Object.values(REGEX_ENGINE_PROFILES)) {
      const enabled = Object.entries(profile.features)
        .filter(([, disposition]) => disposition !== 'unsupported')
        .map(([feature]) => feature)
      expect([...evidenced].sort()).toEqual(enabled.sort())
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
})
