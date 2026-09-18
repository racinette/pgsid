import { numericCases } from '../fixtures/sql-semantics/operations/numeric.js'
import { observeFloat } from '../support/postgres/observe.js'
import { sqlSemanticsCoverage } from '../../scripts/report-sql-semantics-coverage.js'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { factory, identifier, printFile } from '../../src/codegen/typescript/ast.js'
import { typescriptSqlBackend } from '../../src/codegen/typescript/sql/registry.js'
import { typescriptSqlRuntime } from '../../src/codegen/typescript/sql/runtime.js'
import { go, printGoFile } from '../../src/codegen/go/ast.js'
import { goSqlBackend } from '../../src/codegen/go/sql/registry.js'
import { goSqlRuntime } from '../../src/codegen/go/sql/runtime.js'
import { emitSqlExpression } from '../../src/sql-semantics/expressions.js'
import {
  integerAdditionCases,
  integerCompositionCases,
} from '../fixtures/sql-semantics/operations/integer-addition.js'
import { integerOperationCases } from '../fixtures/sql-semantics/operations/integer-operations.js'
import { PG18_NUMERIC } from '../../src/postgres/builtins/numeric.generated.js'
import { observeSql } from '../support/postgres/observe.js'
import type { SqlObservation } from '../support/postgres/observe.js'

const run = promisify(execFile)
const cases = [
  ...integerAdditionCases,
  ...integerCompositionCases,
  ...integerOperationCases,
  ...numericCases,
]
let pg: PGlite

function typescriptProject(): string {
  const emitted = cases.map((fixture) =>
    emitSqlExpression(fixture.expression, typescriptSqlBackend),
  )
  const helpers = emitted.flatMap((result) => result.helpers)
  return printFile([
    ...typescriptSqlRuntime(helpers),
    ...emitted.map((result, index) =>
      factory.createFunctionDeclaration(
        undefined,
        undefined,
        identifier(`evaluate${index}`),
        undefined,
        [],
        undefined,
        factory.createBlock([factory.createReturnStatement(result.value.expression)], true),
      ),
    ),
  ])
}

function goProject(): string {
  const emitted = cases.map((fixture) => emitSqlExpression(fixture.expression, goSqlBackend))
  return printGoFile({
    package: 'main',
    imports: [{ path: 'encoding/json' }, { path: 'os' }, { path: 'fmt' }, { path: 'math' }],
    source:
      goSqlRuntime(
        emitted.flatMap((result) => result.helpers),
        'main',
      ) +
      `
      func main() {
        results := []map[string]string{}
        types := []string{${cases.map((fixture) => JSON.stringify(fixture.expression.type)).join(',')}}
        for index, raw := range []any{${emitted.map((_, i) => `evaluate${i}()`).join(',')}} {
          result := map[string]string{}
          switch value := raw.(type) {
          case SqlInteger:
            if value.Error != "" { result["kind"] = "error"; result["code"] = value.Error
            } else if !value.Valid { result["kind"] = "null"
            } else { result["kind"] = "value"; result["value"] = strconv.FormatInt(value.Value, 10) }
          case SqlBoolean:
            if value.Error != "" { result["kind"] = "error"; result["code"] = value.Error
            } else if !value.Valid { result["kind"] = "null"
            } else { result["kind"] = "value"; result["value"] = strconv.FormatBool(value.Value) }
          case SqlFloat:
            if value.Error != "" { result["kind"] = "error"; result["code"] = value.Error
            } else if !value.Valid { result["kind"] = "null"
            } else {
              result["kind"] = "float"; result["type"] = types[index]
              if math.IsNaN(value.Value) { result["value"] = "NaN"
              } else if math.IsInf(value.Value, 1) { result["value"] = "Infinity"
              } else if math.IsInf(value.Value, -1) { result["value"] = "-Infinity"
              } else if types[index] == "pg_catalog.float4" { result["value"] = fmt.Sprintf("%08x", math.Float32bits(float32(value.Value)))
              } else { result["value"] = fmt.Sprintf("%016x", math.Float64bits(value.Value)) }
            }
          default: panic("unexpected SQL value type")
          }
          results = append(results, result)
        }
        if err := json.NewEncoder(os.Stdout).Encode(results); err != nil { panic(err) }
      }`,
    declarations: emitted.map((result, index) =>
      go.function(
        `evaluate${index}`,
        [],
        [
          {
            type: go.ident(
              result.value.type === 'pg_catalog.bool'
                ? 'SqlBoolean'
                : /^pg_catalog.float[48]$/.test(result.value.type)
                  ? 'SqlFloat'
                  : 'SqlInteger',
            ),
          },
        ],
        [{ kind: 'return', expressions: [result.value.expression] }],
      ),
    ),
  })
}

describe('generated PostgreSQL numeric evaluation', () => {
  beforeAll(async () => {
    pg = await PGlite.create()
  })
  afterAll(async () => {
    await pg.close()
  })

  it.each(cases)('$name agrees with PostgreSQL', async (fixture) => {
    expect(await observeSql(pg, fixture.sql, fixture.expression.type)).toEqual(fixture.expected)
  })

  it('executes the generated TypeScript against the shared cases', () => {
    const source = typescriptProject()
    const output = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    }).outputText
    const results: SqlObservation[] = runInNewContext(
      output +
        `\n[${cases.map((_, index) => `evaluate${index}`).join(',')}].map((fn,index) => {
      try { const value = fn(); const type = resultTypes[index]; return value === null ? { kind: 'null' } : type === 'pg_catalog.float4' || type === 'pg_catalog.float8' ? observeFloat(value,type) : { kind: 'value', value: value.toString() } }
      catch (error) { return { kind: 'error', code: error.code } }
    })`,
      { observeFloat, resultTypes: cases.map((fixture) => fixture.expression.type) },
    )
    expect(results).toEqual(cases.map((fixture) => fixture.expected))
  })

  it('typechecks the complete generated TypeScript project', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-sql-semantics-typescript-'))
    try {
      const path = join(directory, 'project.ts')
      await writeFile(path, typescriptProject())
      const program = ts.createProgram([path], {
        strict: true,
        noEmit: true,
        target: ts.ScriptTarget.ES2022,
        types: [],
        lib: ['lib.es2022.d.ts'],
        skipLibCheck: true,
      })
      expect(
        ts
          .getPreEmitDiagnostics(program)
          .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')),
      ).toEqual([])
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('executes the generated Go against the shared cases', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-sql-semantics-'))
    try {
      await writeFile(join(directory, 'go.mod'), 'module pgsidsemantics\n\ngo 1.22\n')
      await writeFile(join(directory, 'main.go'), goProject())
      const { stdout } = await run(process.env.PGSID_GO_BINARY ?? 'go', ['run', '.'], {
        cwd: directory,
        timeout: 60000,
        env: {
          ...process.env,
          GOCACHE: join(tmpdir(), 'pgsid-sql-semantics-go-cache'),
          GOTOOLCHAIN: 'local',
        },
      })
      expect(JSON.parse(stdout)).toEqual(cases.map((fixture) => fixture.expected))
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('compiles isolated numeric programs with only their required helpers and imports', async () => {
    const names = [
      'pg_catalog.float4 literal 3',
      'pg_catalog.float4/pg_catalog.float8 / 0',
      'pg_catalog.float4/pg_catalog.float8 = 0',
      'pg_catalog.float8 to pg_catalog.float4 3',
      'pg_catalog.float4 to pg_catalog.int8 0',
      'pg_catalog.int8 to pg_catalog.float4 1',
      'pg_catalog.int8 gcd 12/18',
      'pg_catalog.int8 lcm 12/18',
      'pg_catalog.int2 shift << 1/15',
      'pg_catalog.int8 bitwise # -1/3',
      'pg_catalog.int4 integer unary ~ -1',
      'float8 utility round 19',
      'float8 utility sqrt 3',
      'float8 utility cbrt 3',
      'float8 utility sign 14',
    ]
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-isolated-numerics-'))
    try {
      await writeFile(join(directory, 'go.mod'), 'module isolatednumerics\n\ngo 1.22\n')
      const paths: string[] = []
      for (const [index, name] of names.entries()) {
        const fixture = numericCases.find((fixture) => fixture.name === name)
        if (!fixture) throw new Error(`Missing isolated fixture: ${name}`)
        const typescript = emitSqlExpression(fixture.expression, typescriptSqlBackend)
        const path = join(directory, `numeric${index}.ts`)
        paths.push(path)
        await writeFile(
          path,
          printFile([
            ...typescriptSqlRuntime(typescript.helpers),
            factory.createExpressionStatement(typescript.value.expression),
          ]) + '\nexport {}\n',
        )
        const emitted = emitSqlExpression(fixture.expression, goSqlBackend)
        const packagePath = join(directory, `numeric${index}`)
        await mkdir(packagePath)
        await writeFile(
          join(packagePath, 'numeric.go'),
          printGoFile({
            package: 'numeric',
            imports: [],
            source: goSqlRuntime(emitted.helpers, 'numeric'),
            declarations: [
              go.function(
                'Evaluate',
                [],
                [
                  {
                    type: go.ident(
                      emitted.value.type === 'pg_catalog.bool'
                        ? 'SqlBoolean'
                        : /^pg_catalog.float[48]$/.test(emitted.value.type)
                          ? 'SqlFloat'
                          : 'SqlInteger',
                    ),
                  },
                ],
                [{ kind: 'return', expressions: [emitted.value.expression] }],
              ),
            ],
          }),
        )
      }
      const program = ts.createProgram(paths, {
        strict: true,
        noEmit: true,
        target: ts.ScriptTarget.ES2022,
        types: [],
        lib: ['lib.es2022.d.ts'],
        skipLibCheck: true,
      })
      expect(
        ts
          .getPreEmitDiagnostics(program)
          .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')),
      ).toEqual([])
      await run(process.env.PGSID_GO_BINARY ?? 'go', ['test', './...'], {
        cwd: directory,
        timeout: 60000,
        env: {
          ...process.env,
          GOCACHE: join(tmpdir(), 'pgsid-sql-semantics-go-cache'),
          GOTOOLCHAIN: 'local',
        },
      })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('pins complete generated projects', async () => {
    for (const [name, source] of [
      ['typescript.ts', typescriptProject()],
      ['main.go', goProject()],
    ] as const) {
      const path = new URL(`../fixtures/sql-semantics/projects/${name}`, import.meta.url)
      if (process.env.UPDATE_SQL_SEMANTICS_GOLDENS === '1') await writeFile(path, source)
      expect(await readFile(path, 'utf8')).toBe(source)
    }
  })

  it('reports unsupported overloads and checks support declarations against fixture evidence', () => {
    const rows = sqlSemanticsCoverage()
    expect(() => sqlSemanticsCoverage([])).toThrow('Support without fixture evidence')
    const supported = rows.filter((row) => row.typescript || row.go)
    const integerTypes = new Set(['pg_catalog.int2', 'pg_catalog.int4', 'pg_catalog.int8'])
    const expected = Object.entries(PG18_NUMERIC)
      .filter(([, metadata]) => {
        const floatTypes = new Set(['pg_catalog.float4', 'pg_catalog.float8'])
        const integers = metadata.args.every((type) => integerTypes.has(type))
        const floats = metadata.args.every((type) => floatTypes.has(type))
        const primitives = metadata.args.every(
          (type) => integerTypes.has(type) || floatTypes.has(type),
        )
        if (metadata.kind === 'operator') {
          return integers || (floats && metadata.name !== '^')
        }
        return (
          metadata.kind === 'function' &&
          ((floats &&
            metadata.args.length === 1 &&
            ['ceil', 'ceiling', 'floor', 'round', 'trunc', 'sign', 'sqrt', 'cbrt'].includes(
              metadata.name,
            )) ||
            (primitives &&
              metadata.args.length === 1 &&
              ['abs', 'int2', 'int4', 'int8', 'float4', 'float8'].includes(metadata.name)) ||
            (integers &&
              metadata.args.length === 2 &&
              ['mod', 'gcd', 'lcm'].includes(metadata.name)))
        )
      })
      .map(([signature]) => signature)
      .sort()
    expect(supported.map((row) => row.signature).sort()).toEqual(expected)
    expect(supported).toHaveLength(208)
    expect(supported.every((row) => row.typescript && row.go && row.fixtures.length > 0)).toBe(true)
    expect(rows.some((row) => !row.typescript && !row.go && row.fixtures.length === 0)).toBe(true)
  })

  it('refuses unsupported overloads and inconsistent resolved operands', () => {
    const literal = { kind: 'integer', type: 'pg_catalog.int4', value: '1' } as const
    expect(() =>
      emitSqlExpression(
        {
          kind: 'operator',
          signature: 'operator:["pg_catalog","^"](pg_catalog.float8,pg_catalog.float8)',
          type: 'pg_catalog.float8',
          operands: [
            { kind: 'float', type: 'pg_catalog.float8', bits: '3ff0000000000000' },
            { kind: 'float', type: 'pg_catalog.float8', bits: '3ff0000000000000' },
          ],
        },
        typescriptSqlBackend,
      ),
    ).toThrow('Unsupported overload')
    expect(() =>
      emitSqlExpression(
        {
          kind: 'operator',
          signature: 'operator:["pg_catalog","+"](pg_catalog.int8,pg_catalog.int8)',
          type: 'pg_catalog.int8',
          operands: [literal, literal],
        },
        typescriptSqlBackend,
      ),
    ).toThrow('Operand type mismatch')
    expect(() =>
      emitSqlExpression(
        {
          kind: 'function',
          signature: 'function:["pg_catalog","abs"](pg_catalog.int8)',
          type: 'pg_catalog.int8',
          operands: [literal],
        },
        typescriptSqlBackend,
      ),
    ).toThrow('Operand type mismatch')
    expect(() =>
      emitSqlExpression(
        {
          kind: 'function',
          signature: 'function:["pg_catalog","abs"](pg_catalog.int4)',
          type: 'pg_catalog.bool',
          operands: [literal],
        },
        typescriptSqlBackend,
      ),
    ).toThrow('Invalid resolved expression')
    expect(() =>
      emitSqlExpression(
        {
          kind: 'function',
          signature: 'aggregate:["pg_catalog","sum"](pg_catalog.int4)',
          type: 'pg_catalog.int8',
          operands: [literal],
        },
        typescriptSqlBackend,
      ),
    ).toThrow('Unsupported execution shape')
    expect(() =>
      emitSqlExpression(
        {
          kind: 'function',
          signature: 'function:["pg_catalog","generate_series"](pg_catalog.int4,pg_catalog.int4)',
          type: 'pg_catalog.int4',
          operands: [literal, literal],
        },
        typescriptSqlBackend,
      ),
    ).toThrow('Unsupported execution shape')
    expect(() =>
      emitSqlExpression(
        { kind: 'cast', signature: null, type: 'pg_catalog.int8', operand: literal },
        typescriptSqlBackend,
      ),
    ).toThrow('Invalid numeric relabel cast')
    expect(() =>
      emitSqlExpression(
        {
          kind: 'cast',
          signature: 'function:["pg_catalog","abs"](pg_catalog.int4)',
          type: 'pg_catalog.int4',
          operand: literal,
        },
        typescriptSqlBackend,
      ),
    ).toThrow('Invalid numeric cast function')
    for (const bits of ['xyz', '0000000', '000000000']) {
      expect(() =>
        emitSqlExpression({ kind: 'float', type: 'pg_catalog.float4', bits }, typescriptSqlBackend),
      ).toThrow('Invalid float literal bits')
    }
    expect(() =>
      emitSqlExpression(
        { kind: 'float', type: 'pg_catalog.float8', bits: '3f800000' },
        goSqlBackend,
      ),
    ).toThrow('Invalid float literal bits')
    expect(() => typescriptSqlRuntime(['missing'])).toThrow('Missing TypeScript SQL helper')
    expect(() => goSqlRuntime(['missing'])).toThrow('Missing Go SQL helper')
  })
})
