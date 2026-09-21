import {
  BUILTIN_ARRAY_ELEMENT_TYPES,
  arrayType,
  enumType,
  resolveArrayPolymorphicType,
  type SqlExpression,
} from '../../src/sql-semantics/expressions.js'
import { floatMathCopyright } from '../../src/sql-semantics/float-math-license.js'
import { numericMathCopyright } from '../../src/sql-semantics/numeric-math-license.js'
import { scalarCases } from '../fixtures/sql-semantics/operations/scalar.js'
import { PG18_BOOLEAN } from '../../src/postgres/builtins/boolean.generated.js'
import {
  byteaLikeSignatures,
  byteaOrderSignatures,
  nameLikeSignatures,
  textSignatures,
} from '../fixtures/sql-semantics/operations/text-signatures.js'
import { fileURLToPath } from 'node:url'
import { numericCases, numericStressCases } from '../fixtures/sql-semantics/operations/numeric.js'
import { observeFloat } from '../support/postgres/observe.js'
import { sqlSemanticsCoverage } from '../../scripts/report-sql-semantics-coverage.js'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
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
import { PG18_UUID } from '../../src/postgres/builtins/uuid.generated.js'
import {
  typescriptJsonFunctions,
  typescriptJsonOperators,
} from '../../src/codegen/typescript/sql/json.js'
import {
  typescriptTemporalFunctions,
  typescriptTemporalOperators,
} from '../../src/codegen/typescript/sql/temporal.js'
import { observeSql } from '../support/postgres/observe.js'
import type { SqlObservation } from '../support/postgres/observe.js'

const run = promisify(execFile)
const standardCases = [
  ...integerAdditionCases,
  ...integerCompositionCases,
  ...integerOperationCases,
  ...numericCases,
  ...scalarCases,
]
const cases =
  process.env.PGSID_SQL_SEMANTICS_STRESS === '1'
    ? [...standardCases, ...numericStressCases]
    : standardCases
const setupSql = [...new Set(cases.flatMap((fixture) => fixture.setupSql ?? []))]
let pg: PGlite

async function initializePostgres(): Promise<void> {
  await pg.exec(`SET timezone = 'UTC'`)
  for (const sql of setupSql) await pg.exec(sql)
}

function typescriptProject(fixtures = cases): string {
  const emitted = fixtures.map((fixture) =>
    emitSqlExpression(fixture.expression, typescriptSqlBackend),
  )
  const helpers = emitted.flatMap((result) => result.helpers)
  return printFile([
    ...typescriptSqlRuntime(helpers),
    ...emitted.map((result, index) =>
      factory.createFunctionDeclaration(
        [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
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

function goProject(fixtures = cases): string {
  const emitted = fixtures.map((fixture) => emitSqlExpression(fixture.expression, goSqlBackend))
  return printGoFile({
    package: 'main',
    imports: [{ path: 'encoding/json' }, { path: 'os' }, { path: 'fmt' }, { path: 'math' }],
    source:
      goSqlRuntime(
        [
          ...emitted.flatMap((result) => result.helpers),
          'sqlDecimalText',
          'uuidText',
          'enumText',
          'arrayText',
          'jsonText',
          'jsonbText',
          'dateText',
          'timeText',
          'timestampText',
          'intervalText',
          'timestamptzText',
          'timetzText',
        ],
        'main',
      ) +
      `
      ${Array.from(
        { length: Math.ceil(fixtures.length / 128) },
        (_, batch) =>
          `func evaluateBatch${batch}() []any { return []any{${emitted
            .slice(batch * 128, (batch + 1) * 128)
            .map((_, i) => `evaluate${batch * 128 + i}()`)
            .join(',')}} }`,
      ).join('\n')}
      func evaluatedValues() []any {
        values := make([]any, 0, ${fixtures.length})
        ${Array.from({ length: Math.ceil(fixtures.length / 128) }, (_, batch) => `values = append(values, evaluateBatch${batch}()...)`).join('\n')}
        return values
      }
      func main() {
        results := []map[string]string{}
        types := []string{${fixtures.map((fixture) => JSON.stringify(fixture.expression.type)).join(',')}}
        for index, raw := range evaluatedValues() {
          result := map[string]string{}
          switch value := raw.(type) {
          case SqlInteger:
            if value.Error != "" { result["kind"] = "error"; result["code"] = value.Error
            } else if !value.Valid { result["kind"] = "null"
            } else { result["kind"] = "value"; result["value"] = strconv.FormatInt(value.Value, 10) }
          case SqlText:
            if value.Error != "" { result["kind"] = "error"; result["code"] = value.Error
            } else if !value.Valid { result["kind"] = "null"
            } else { result["kind"] = "value"; result["value"] = value.Value }
          case SqlBoolean:
            if value.Error != "" { result["kind"] = "error"; result["code"] = value.Error
            } else if !value.Valid { result["kind"] = "null"
            } else { result["kind"] = "value"; result["value"] = strconv.FormatBool(value.Value) }
          case SqlDecimal:
            if value.Error != "" { result["kind"] = "error"; result["code"] = value.Error
            } else if !value.Valid { result["kind"] = "null"
            } else { result["kind"] = "value"; result["value"] = sqlDecimalText(value) }
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
          case SqlUuid:
            if value.Error != "" { result["kind"] = "error"; result["code"] = value.Error
            } else if !value.Valid { result["kind"] = "null"
            } else { result["kind"] = "value"; result["value"] = uuidText(value).Value }
          case SqlEnum:
            if value.Error != "" { result["kind"] = "error"; result["code"] = value.Error
            } else if !value.Valid { result["kind"] = "null"
            } else { result["kind"] = "value"; result["value"] = enumText(value).Value }
          case SqlArray:
            if value.Error != "" { result["kind"] = "error"; result["code"] = value.Error
            } else if !value.Valid { result["kind"] = "null"
            } else { result["kind"] = "value"; result["value"] = arrayText(value).Value }
          case SqlJson:
            if value.Error != "" { result["kind"] = "error"; result["code"] = value.Error
            } else if !value.Valid { result["kind"] = "null"
            } else { result["kind"] = "value"; result["value"] = jsonText(value).Value }
          case SqlJsonb:
            if value.Error != "" { result["kind"] = "error"; result["code"] = value.Error
            } else if !value.Valid { result["kind"] = "null"
            } else { result["kind"] = "value"; result["value"] = jsonbText(value).Value }
          case SqlDate:
            if value.Error != "" { result["kind"] = "error"; result["code"] = value.Error
            } else if !value.Valid { result["kind"] = "null"
            } else { result["kind"] = "value"; result["value"] = dateText(value).Value }
          case SqlTime:
            if value.Error != "" { result["kind"] = "error"; result["code"] = value.Error
            } else if !value.Valid { result["kind"] = "null"
            } else { result["kind"] = "value"; result["value"] = timeText(value).Value }
          case SqlTimestamp:
            if value.Error != "" { result["kind"] = "error"; result["code"] = value.Error
            } else if !value.Valid { result["kind"] = "null"
            } else { result["kind"] = "value"; result["value"] = timestampText(value).Value }
          case SqlInterval:
            if value.Error != "" { result["kind"] = "error"; result["code"] = value.Error
            } else if !value.Valid { result["kind"] = "null"
            } else { result["kind"] = "value"; result["value"] = intervalText(value).Value }
          case SqlTimestamptz:
            if value.Error != "" { result["kind"] = "error"; result["code"] = value.Error
            } else if !value.Valid { result["kind"] = "null"
            } else { result["kind"] = "value"; result["value"] = timestamptzText(value).Value }
          case SqlTimeTz:
            if value.Error != "" { result["kind"] = "error"; result["code"] = value.Error
            } else if !value.Valid { result["kind"] = "null"
            } else { result["kind"] = "value"; result["value"] = timetzText(value).Value }
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
                  : result.value.type === 'pg_catalog."numeric"'
                    ? 'SqlDecimal'
                    : [
                          'pg_catalog.text',
                          'pg_catalog."varchar"',
                          'pg_catalog.bpchar',
                          'pg_catalog.name',
                          'pg_catalog.bytea',
                        ].includes(result.value.type)
                      ? 'SqlText'
                      : result.value.type === 'pg_catalog.uuid'
                        ? 'SqlUuid'
                        : result.value.type === 'pg_catalog."json"'
                          ? 'SqlJson'
                          : result.value.type === 'pg_catalog.jsonb'
                            ? 'SqlJsonb'
                            : result.value.type === 'pg_catalog.date'
                              ? 'SqlDate'
                              : result.value.type === 'pg_catalog."time"'
                                ? 'SqlTime'
                                : result.value.type === 'pg_catalog."timestamp"'
                                  ? 'SqlTimestamp'
                                  : result.value.type === 'pg_catalog."interval"'
                                    ? 'SqlInterval'
                                    : result.value.type === 'pg_catalog.timestamptz'
                                      ? 'SqlTimestamptz'
                                      : result.value.type === 'pg_catalog.timetz'
                                        ? 'SqlTimeTz'
                                        : result.value.type.startsWith('enum:')
                                          ? 'SqlEnum'
                                          : result.value.type.startsWith('array:')
                                            ? 'SqlArray'
                                            : 'SqlInteger',
            ),
          },
        ],
        [{ kind: 'return', expressions: [result.value.expression] }],
      ),
    ),
  })
}

describe('generated PostgreSQL scalar evaluation', () => {
  beforeAll(async () => {
    pg = await PGlite.create()
    await initializePostgres()
  })
  afterAll(async () => {
    await pg.close()
  })

  it.each(cases.map((fixture, index) => ({ ...fixture, index })))(
    '$name agrees with PostgreSQL',
    async (fixture) => {
      if (fixture.index > 0 && fixture.index % 1024 === 0) {
        await pg.close()
        pg = await PGlite.create()
        await initializePostgres()
      }
      expect(await observeSql(pg, fixture.sql, fixture.expression.type)).toEqual(fixture.expected)
    },
  )

  it(
    'executes the generated TypeScript against the shared cases',
    { timeout: 120000 },
    async () => {
      const source = typescriptProject()
      const output = ts.transpileModule(source, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.CommonJS,
          esModuleInterop: true,
        },
      }).outputText
      const script =
        output +
        `\n[${cases.map((_, index) => `evaluate${index}`).join(',')}].map((fn,index) => {
      try { const value = fn(); const type = resultTypes[index]; return value === null ? { kind: 'null' } : type === 'pg_catalog.float4' || type === 'pg_catalog.float8' ? observeFloat(value,type) : { kind: 'value', value: value.toString() } }
      catch (error) { return { kind: 'error', code: error.code } }
    })`
      const directory = await mkdtemp(join(tmpdir(), 'pgsid-sql-semantics-typescript-run-'))
      try {
        const path = join(directory, 'run.cjs'),
          resultPath = join(directory, 'results.json')
        await writeFile(
          path,
          `
        const { runInNewContext } = require('node:vm');
        const { createRequire } = require('node:module');
        const { writeFileSync } = require('node:fs');
        const results = runInNewContext(${JSON.stringify(script)}, {
          require: createRequire(${JSON.stringify(fileURLToPath(import.meta.url))}),
          exports: {}, observeFloat: ${observeFloat.toString()},
          resultTypes: ${JSON.stringify(cases.map((fixture) => fixture.expression.type))}
        });
        writeFileSync(${JSON.stringify(resultPath)}, JSON.stringify(results));
      `,
        )
        await run(process.execPath, [path], { timeout: 110000 })
        const results: SqlObservation[] = JSON.parse(await readFile(resultPath, 'utf8'))
        expect(results).toHaveLength(cases.length)
        for (const [index, fixture] of cases.entries())
          expect(results[index], fixture.name).toEqual(fixture.expected)
      } finally {
        await rm(directory, { recursive: true, force: true })
      }
    },
  )

  it('typechecks the complete generated TypeScript project', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-sql-semantics-typescript-'))
    try {
      await symlink(
        fileURLToPath(new URL('../../node_modules', import.meta.url)),
        join(directory, 'node_modules'),
        'dir',
      )
      const path = join(directory, 'project.ts')
      await writeFile(path, typescriptProject())
      const program = ts.createProgram([path], {
        strict: true,
        noEmit: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        esModuleInterop: true,
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
      await writeFile(
        join(directory, 'go.mod'),
        await readFile(new URL('../fixtures/sql-semantics/projects/go.mod', import.meta.url)),
      )
      await writeFile(
        join(directory, 'go.sum'),
        await readFile(new URL('../fixtures/sql-semantics/projects/go.sum', import.meta.url)),
      )
      await writeFile(join(directory, 'main.go'), goProject())
      const { stdout } = await run(process.env.PGSID_GO_BINARY ?? 'go', ['run', '.'], {
        cwd: directory,
        maxBuffer: 16 * 1024 * 1024,
        timeout: 60000,
        env: {
          ...process.env,
          GOCACHE: join(tmpdir(), 'pgsid-sql-semantics-go-cache'),
          GOTOOLCHAIN: 'local',
          GOMODCACHE: process.env.GOMODCACHE ?? join(tmpdir(), 'pgsid-decimal-go-mod-cache'),
          GOFLAGS: '-mod=readonly',
        },
      })
      const results: SqlObservation[] = JSON.parse(stdout)
      expect(results).toHaveLength(cases.length)
      for (const [index, fixture] of cases.entries())
        expect(results[index], fixture.name).toEqual(fixture.expected)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('compiles isolated expression programs with only their required helpers and imports', async () => {
    const names = [
      ...textSignatures.map((signature) => `text utility ${signature} 0`),
      'text pg_catalog.bpchar CASE padding',
      'text pg_catalog."varchar" COALESCE padding',
      'boolean literal false',
      'boolean and null/false',
      'boolean or null/true',
      'boolean not null',
      'boolean comparison < false/true',
      'text literal 8',
      'text length 8',
      'text octet_length 8',
      'text comparison < 8/9',
      'text comparison || 8/9',
      'null-test pg_catalog.text 0/false',
      'null-test pg_catalog.int4 0/true',
      'case pg_catalog.text first match',
      'case pg_catalog.int4 true',
      'case pg_catalog.float4 true',
      'case pg_catalog.float8 true',
      'case pg_catalog."numeric" true',
      'case pg_catalog.bool true',
      'coalesce pg_catalog.text 1',
      'coalesce pg_catalog.int4 1',
      'coalesce pg_catalog.float4 1',
      'coalesce pg_catalog.float8 1',
      'coalesce pg_catalog."numeric" 1',
      'coalesce pg_catalog.bool 1',
      'uuid input 3',
      'uuid operator < 0',
      'uuid function eq',
      'uuid cmp 2',
      'uuid extract version 2',
      'uuid from text 1',
      'uuid to text 1',
      'uuid null test',
      'uuid case',
      'uuid coalesce',
      'enum input 3',
      'enum operator < 0',
      'enum declaration order differs from lexical order beta',
      'enum from text 1',
      'enum to text 3',
      'enum null test',
      'enum case',
      'enum coalesce',
      'array input 6',
      'array cardinality 2',
      'array dims 4',
      'array lower 4/1',
      'array comparison > 2',
      'array contains 0',
      'array concat 7',
      'array subscript 5',
      'array null test',
      'array case',
      'array coalesce',
      'array slice multidimensional',
      'array assign 1',
      'array assign multidimensional',
      'array append 0',
      'array prepend 2',
      'array scalar concat append',
      'array position 0',
      'array positions 1',
      'array remove 0',
      'array replace 1',
      'array fill custom bounds',
      'array trim 1',
      'array reverse multidimensional',
      'array sort 3',
      'array sort multidimensional',
      'array anycompatible int2 int4',
      'array anycompatible int8 numeric',
      'array anycompatible int4 float4',
      'array anycompatible float4 float8',
      'array anycompatible text varchar',
      'array anycompatible varchar bpchar',
      'json input 11',
      'jsonb input 11',
      'json typeof object',
      'jsonb typeof number',
      'json array length',
      'json object field 0',
      'jsonb object field text 2',
      'json array element 3',
      'jsonb array element on scalar',
      'json path 2',
      'jsonb path text 4',
      'jsonb operator < 4',
      'jsonb cmp 0',
      'jsonb contains 1',
      'jsonb exists 4',
      'jsonb exists all 1',
      'json from text 1',
      'jsonb to json 2',
      'json null test',
      'json case',
      'jsonb coalesce',
      'jsonb concat 0',
      'jsonb delete key',
      'jsonb set replace',
      'jsonb insert before',
      'jsonb set_lax delete',
      'json strip nulls',
      'jsonb pretty object',
      'jsonb to int4',
      'json object pairs',
      'to json array',
      'json build array values',
      'json build object values',
      'bytea order operator:["pg_catalog","="](pg_catalog.bytea,pg_catalog.bytea) 0',
      'bytea order function:["pg_catalog","byteacmp"](pg_catalog.bytea,pg_catalog.bytea) 3',
      'bytea order operator:["pg_catalog","||"](pg_catalog.bytea,pg_catalog.bytea) 0',
      'date input 1',
      'date operator < 0',
      'date function eq',
      'date cmp 1',
      'date finite infinity',
      'make date',
      'date null test',
      'date case',
      'date coalesce',
      'time input 3',
      'time operator < 0',
      'time cmp 1',
      'make time',
      'timestamp input 2',
      'timestamp operator < 0',
      'timestamp finite',
      'make timestamp',
      'timestamp coalesce',
      'interval input 6',
      'interval operator = 0',
      'interval cmp 0',
      'interval finite infinity',
      'make interval',
      'interval case',
      ...[
        'int2',
        'int8',
        'float4',
        'float8',
        'numeric',
        'boolean',
        'text',
        'varchar',
        'bpchar',
        'uuid',
        'enum',
      ].flatMap((family) => [
        `polymorphic array ${family} input`,
        `polymorphic array ${family} ordering`,
        `polymorphic array ${family} subscript`,
      ]),
      'numeric utility scale 1.2300',
      'numeric utility min_scale 1.2300',
      'numeric utility trim_scale 1.2300',
      'numeric width_bucket boundary 1',
      'float width_bucket boundary 1',
      'float math exp 3',
      'float math ln 3',
      'float math log10 3',
      'float math power 5/5',
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
      'numeric parsing: parse 1.2300',
      'numeric finite arithmetic: add 0.1 / 0.2',
      'numeric comparisons: eq NaN / NaN',
      'numeric rounding: round -1.005 at 2',
      'numeric function gcd 12.00/18.0',
      'numeric to pg_catalog.int8 2.5',
      'pg_catalog.float4 to numeric 0.1',
      'numeric to pg_catalog.float4 7.038531e-26',
      'numeric typmod 3/2 9.995',
      'numeric math sqrt 2',
      'numeric math power 2 / 10',
      'numeric math exp 1',
      'numeric math ln 2',
      'numeric math log10 2',
      'numeric math log 2 / 1.00000000000000000001',
    ]
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-isolated-numerics-'))
    try {
      await symlink(
        fileURLToPath(new URL('../../node_modules', import.meta.url)),
        join(directory, 'node_modules'),
        'dir',
      )
      await writeFile(
        join(directory, 'go.mod'),
        await readFile(new URL('../fixtures/sql-semantics/projects/go.mod', import.meta.url)),
      )
      await writeFile(
        join(directory, 'go.sum'),
        await readFile(new URL('../fixtures/sql-semantics/projects/go.sum', import.meta.url)),
      )
      const paths: string[] = []
      for (const [index, name] of names.entries()) {
        const fixture = standardCases.find((fixture) => fixture.name === name)
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
                          : emitted.value.type === 'pg_catalog."numeric"'
                            ? 'SqlDecimal'
                            : [
                                  'pg_catalog.text',
                                  'pg_catalog."varchar"',
                                  'pg_catalog.bpchar',
                                  'pg_catalog.name',
                                  'pg_catalog.bytea',
                                ].includes(emitted.value.type)
                              ? 'SqlText'
                              : emitted.value.type === 'pg_catalog.uuid'
                                ? 'SqlUuid'
                                : emitted.value.type === 'pg_catalog."json"'
                                  ? 'SqlJson'
                                  : emitted.value.type === 'pg_catalog.jsonb'
                                    ? 'SqlJsonb'
                                    : emitted.value.type === 'pg_catalog.date'
                                      ? 'SqlDate'
                                      : emitted.value.type === 'pg_catalog."time"'
                                        ? 'SqlTime'
                                        : emitted.value.type === 'pg_catalog."timestamp"'
                                          ? 'SqlTimestamp'
                                          : emitted.value.type === 'pg_catalog."interval"'
                                            ? 'SqlInterval'
                                            : emitted.value.type === 'pg_catalog.timestamptz'
                                              ? 'SqlTimestamptz'
                                              : emitted.value.type === 'pg_catalog.timetz'
                                                ? 'SqlTimeTz'
                                                : emitted.value.type.startsWith('enum:')
                                                  ? 'SqlEnum'
                                                  : emitted.value.type.startsWith('array:')
                                                    ? 'SqlArray'
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
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        esModuleInterop: true,
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
          GOMODCACHE: process.env.GOMODCACHE ?? join(tmpdir(), 'pgsid-decimal-go-mod-cache'),
          GOFLAGS: '-mod=readonly',
        },
      })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('pins complete generated projects', async () => {
    for (const [name, source] of [
      ['typescript.ts', typescriptProject(standardCases)],
      ['main.go', goProject(standardCases)],
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
        const decimals = metadata.args.some((type) => type === 'pg_catalog."numeric"')
        const decimalFunctions = [
          'scale',
          'min_scale',
          'trim_scale',
          'width_bucket',
          'sqrt',
          'exp',
          'ln',
          'log',
          'log10',
          'pow',
          'power',
          'abs',
          'ceil',
          'ceiling',
          'floor',
          'sign',
          'round',
          'trunc',
          'mod',
          'div',
          'gcd',
          'lcm',
          'numeric',
          'int2',
          'int4',
          'int8',
          'float4',
          'float8',
        ]
        const primitives = metadata.args.every(
          (type) => integerTypes.has(type) || floatTypes.has(type),
        )
        if (metadata.kind === 'operator') {
          return (
            integers ||
            (metadata.name === '^' &&
              (floats || metadata.args.every((type) => type === 'pg_catalog."numeric"'))) ||
            ((floats || metadata.args.every((type) => type === 'pg_catalog."numeric"')) &&
              ['+', '-', '*', '/', '%', '=', '<>', '<', '<=', '>', '>=', '@', '|/', '||/'].includes(
                metadata.name,
              ))
          )
        }
        return (
          metadata.kind === 'function' &&
          ((metadata.name === 'width_bucket' && metadata.args.length === 4 && primitives) ||
            (floats && ['exp', 'ln', 'log', 'log10', 'pow', 'power'].includes(metadata.name)) ||
            (decimals && decimalFunctions.includes(metadata.name)) ||
            (metadata.name === 'numeric' && primitives && metadata.args.length === 1) ||
            (floats &&
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
    const additional = [
      ...Object.keys(PG18_BOOLEAN).filter((signature) => signature.startsWith('operator:')),
      ...textSignatures,
      ...nameLikeSignatures,
      ...byteaLikeSignatures,
      ...byteaOrderSignatures,
      ...Object.keys(PG18_UUID).filter(
        (signature) =>
          signature.startsWith('operator:') ||
          /"uuid_(?:eq|ne|lt|le|gt|ge|cmp|extract_version)"/.test(signature),
      ),
      ...Object.keys(typescriptJsonOperators),
      ...Object.keys(typescriptJsonFunctions),
      ...Object.keys(typescriptTemporalOperators),
      ...Object.keys(typescriptTemporalFunctions),
    ]
    expect(supported.map((row) => row.signature).sort()).toEqual(
      [...expected, ...additional].sort(),
    )
    expect(supported).toHaveLength(788)
    expect(supported.every((row) => row.typescript && row.go && row.fixtures.length > 0)).toBe(true)
    expect(rows.some((row) => !row.typescript && !row.go && row.fixtures.length === 0)).toBe(true)
  })

  it('preserves math licenses in generated projects', () => {
    for (const source of [typescriptProject(), goProject()]) {
      expect(source).toContain(floatMathCopyright)
      expect(source).toContain(numericMathCopyright)
    }
  })

  it('substitutes PostgreSQL array pseudo-types with resolved concrete types', () => {
    expect(BUILTIN_ARRAY_ELEMENT_TYPES).toHaveLength(11)
    expect(
      resolveArrayPolymorphicType(['pg_catalog.anyarray'], 'pg_catalog.anyelement', [
        arrayType('pg_catalog.uuid'),
      ]),
    ).toBe('pg_catalog.uuid')
    expect(
      resolveArrayPolymorphicType(
        ['pg_catalog.anycompatiblearray', 'pg_catalog.anycompatiblearray'],
        'pg_catalog.anycompatiblearray',
        [arrayType('pg_catalog.text'), arrayType('pg_catalog.text')],
      ),
    ).toBe(arrayType('pg_catalog.text'))
    expect(
      resolveArrayPolymorphicType(
        ['pg_catalog.anycompatiblearray', 'pg_catalog.anycompatiblearray'],
        'pg_catalog.anycompatiblearray',
        [arrayType('pg_catalog.int2'), arrayType('pg_catalog.int4')],
      ),
    ).toBe(arrayType('pg_catalog.int4'))
    expect(
      resolveArrayPolymorphicType(
        ['pg_catalog.anyarray', 'pg_catalog.anyarray'],
        'pg_catalog.bool',
        [arrayType('pg_catalog.int4'), arrayType('pg_catalog.int8')],
      ),
    ).toBeNull()
  })

  it('rejects malformed syntax and unsupported text collations in both backends', () => {
    const integer = { kind: 'integer', type: 'pg_catalog.int4', value: '1' } as const
    const text = { kind: 'text', type: 'pg_catalog.text', value: 'a' } as const
    const boolean = { kind: 'boolean', type: 'pg_catalog.bool', value: true } as const
    const uuid = {
      kind: 'uuid',
      type: 'pg_catalog.uuid',
      value: '00000000-0000-0000-0000-000000000000',
    } as const
    const enumDefinition = { schema: 'public', name: 'state', values: ['first', 'second'] } as const
    const enumValue = {
      kind: 'enum',
      type: enumType(enumDefinition),
      enum: enumDefinition,
      value: 'first',
    } as const
    const otherEnumDefinition = {
      schema: 'other',
      name: 'state',
      values: ['first', 'second'],
    } as const
    const otherEnumValue = {
      kind: 'enum',
      type: enumType(otherEnumDefinition),
      enum: otherEnumDefinition,
      value: 'first',
    } as const
    const arrayValue = {
      kind: 'array',
      type: arrayType('pg_catalog.int4'),
      elementType: 'pg_catalog.int4',
      dimensions: [2],
      lowerBounds: [1],
      elements: [integer, integer],
    } as const
    const invalid: [SqlExpression, string][] = [
      [
        { kind: 'boolean-logic', type: 'pg_catalog.bool', operation: 'and', operands: [boolean] },
        'Invalid boolean',
      ],
      [
        { kind: 'boolean-logic', type: 'pg_catalog.bool', operation: 'not', operands: [integer] },
        'Invalid boolean',
      ],
      [{ kind: 'case', type: 'pg_catalog.int4', branches: [], otherwise: integer }, 'Invalid CASE'],
      [
        {
          kind: 'case',
          type: 'pg_catalog.int4',
          branches: [{ when: integer, then: integer }],
          otherwise: integer,
        },
        'Invalid CASE',
      ],
      [
        {
          kind: 'case',
          type: 'pg_catalog.int4',
          branches: [{ when: boolean, then: text }],
          otherwise: integer,
        },
        'Invalid CASE',
      ],
      ...[0, -1, 1.5, 10485761].map(
        (length) =>
          [
            {
              kind: 'text-coercion',
              type: 'pg_catalog.bpchar',
              length,
              explicit: true,
              operand: text,
            },
            'Invalid text coercion',
          ] as [SqlExpression, string],
      ),
      [
        {
          kind: 'text-coercion',
          type: 'pg_catalog.text',
          length: 1,
          explicit: true,
          operand: text,
        },
        'Invalid text coercion',
      ],
      [{ kind: 'uuid-coercion', type: 'pg_catalog.uuid', operand: uuid }, 'Invalid UUID coercion'],
      [{ kind: 'uuid-coercion', type: 'pg_catalog.text', operand: text }, 'Invalid UUID coercion'],
      [
        {
          kind: 'json-coercion',
          type: 'pg_catalog."json"',
          operand: { kind: 'json', type: 'pg_catalog."json"', value: '1' },
        },
        'Invalid JSON coercion',
      ],
      [
        { kind: 'json-coercion', type: 'pg_catalog.text', operand: integer },
        'Invalid JSON coercion',
      ],
      [
        {
          kind: 'enum-coercion',
          type: enumType(enumDefinition),
          enum: enumDefinition,
          operand: enumValue,
        },
        'Invalid enum coercion',
      ],
      [
        {
          kind: 'enum-comparison',
          type: 'pg_catalog.bool',
          enum: enumDefinition,
          operation: '=',
          operands: [enumValue, text],
        },
        'Invalid enum comparison',
      ],
      [
        {
          kind: 'enum-comparison',
          type: 'pg_catalog.bool',
          enum: enumDefinition,
          operation: '=',
          operands: [enumValue, otherEnumValue],
        },
        'Invalid enum comparison',
      ],
      [
        {
          kind: 'enum',
          type: enumType({ schema: 'public', name: 'bad' }),
          enum: { schema: 'public', name: 'bad', values: ['duplicate', 'duplicate'] },
          value: 'duplicate',
        },
        'Invalid enum definition',
      ],
      [
        {
          ...arrayValue,
          dimensions: [2, 2],
          lowerBounds: [1, 1],
          elements: [integer, integer, integer],
        },
        'Invalid array literal',
      ],
      [{ ...arrayValue, dimensions: [2], lowerBounds: [] }, 'Invalid array literal'],
      [
        {
          kind: 'array-operation',
          type: 'pg_catalog.int4',
          elementType: 'pg_catalog.int4',
          operation: 'cardinality',
          operands: [integer],
        },
        'Invalid array operation',
      ],
      [
        {
          kind: 'array-subscript',
          type: 'pg_catalog.int4',
          elementType: 'pg_catalog.int4',
          array: arrayValue,
          subscripts: [],
        },
        'Invalid array subscript',
      ],
      [
        {
          kind: 'array-slice',
          type: arrayType('pg_catalog.int4'),
          elementType: 'pg_catalog.int4',
          array: arrayValue,
          bounds: [],
        },
        'Invalid array slice',
      ],
      [
        {
          kind: 'array-assign',
          type: arrayType('pg_catalog.int4'),
          elementType: 'pg_catalog.int4',
          array: arrayValue,
          subscripts: [integer],
          value: uuid,
        },
        'Invalid array assignment',
      ],
      [
        {
          kind: 'text-coercion',
          type: 'pg_catalog.bpchar',
          length: null,
          explicit: true,
          operand: integer,
        },
        'Invalid text coercion',
      ],
      [{ kind: 'coalesce', type: 'pg_catalog.int4', operands: [] }, 'Invalid COALESCE'],
      [{ kind: 'coalesce', type: 'pg_catalog.int4', operands: [text] }, 'Invalid COALESCE'],
      ...['a\0b', '\uD800', '\uDC00'].map(
        (value) =>
          [{ kind: 'text', type: 'pg_catalog.text', value }, 'Invalid PostgreSQL UTF8'] as [
            SqlExpression,
            string,
          ],
      ),
      ...['a\0b', '\uD800'].map(
        (value) =>
          [{ kind: 'name', type: 'pg_catalog.name', value }, 'Invalid PostgreSQL UTF8'] as [
            SqlExpression,
            string,
          ],
      ),
      ...['zz', 'a', 'A G'].map(
        (value) =>
          [{ kind: 'bytea', type: 'pg_catalog.bytea', value }, 'Invalid bytea'] as [
            SqlExpression,
            string,
          ],
      ),
      [
        {
          kind: 'function',
          signature: 'function:["pg_catalog","namelike"](pg_catalog.name,pg_catalog.text)',
          type: 'pg_catalog.bool',
          operands: [
            { kind: 'name', type: 'pg_catalog.name', value: 'abc' },
            { kind: 'text', type: 'pg_catalog.text', value: 'a%' },
          ],
        },
        'Unsupported text collation',
      ],
      ...[undefined, 'en-US'].map(
        (collation) =>
          [
            {
              kind: 'operator',
              signature: 'operator:["pg_catalog","<"](pg_catalog.text,pg_catalog.text)',
              type: 'pg_catalog.bool',
              operands: [text, text],
              collation,
            },
            'Unsupported text collation',
          ] as [SqlExpression, string],
      ),
    ]
    for (const signature of textSignatures) {
      const guarded =
        /(?:"(?:bpchareq|bpcharne|bpcharlt|bpcharle|bpchargt|bpcharge|strpos|replace|split_part|starts_with|textlike|textnlike|bpcharlike|bpcharnlike|like|notlike|lower|upper|initcap|casefold|texticlike|texticnlike|bpchariclike|bpcharicnlike|~~\*|!~~\*|~~|!~~)"|^operator:.*pg_catalog.bpchar)/.test(
          signature,
        )
      if (!guarded) continue
      const fixture = standardCases.find(
        (fixture) => fixture.name === `text utility ${signature} 0`,
      )!
      for (const collation of [undefined, 'en-US'])
        invalid.push([
          { ...fixture.expression, collation } as SqlExpression,
          'Unsupported text collation',
        ])
    }
    const textArrayComparison = standardCases.find(
      (fixture) => fixture.name === 'polymorphic array text ordering',
    )!
    for (const collation of [undefined, 'en-US'])
      invalid.push([
        { ...textArrayComparison.expression, collation } as SqlExpression,
        'Unsupported array element collation',
      ])
    for (const [expression, message] of invalid) {
      expect(() => emitSqlExpression(expression, typescriptSqlBackend)).toThrow(message)
      expect(() => emitSqlExpression(expression, goSqlBackend)).toThrow(message)
    }
  })

  it('pins PostgreSQL ragged array rejection categories', async () => {
    expect(await observeSql(pg, 'ARRAY[[1,2],[3]]::int4[]')).toEqual({
      kind: 'error',
      code: '2202E',
    })
    expect(await observeSql(pg, "'{{1,2},{3}}'::int4[]")).toEqual({
      kind: 'error',
      code: '22P02',
    })
  })

  it('refuses unsupported overloads and inconsistent resolved operands', () => {
    const literal = { kind: 'integer', type: 'pg_catalog.int4', value: '1' } as const
    expect(() =>
      emitSqlExpression(
        {
          kind: 'function',
          signature: 'function:["pg_catalog","sin"](pg_catalog.float8)',
          type: 'pg_catalog.float8',
          operands: [{ kind: 'float', type: 'pg_catalog.float8', bits: '3ff0000000000000' }],
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
    ).toThrow('Invalid relabel cast')
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
    ).toThrow('Invalid cast function')
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
    for (const value of ['', '1.2.3', '0x10', 'NaN ', 'Infinity;']) {
      expect(() =>
        emitSqlExpression(
          { kind: 'decimal', type: 'pg_catalog."numeric"', value },
          typescriptSqlBackend,
        ),
      ).toThrow('Invalid decimal literal')
    }
    expect(() => typescriptSqlRuntime(['missing'])).toThrow('Missing TypeScript SQL helper')
    expect(() => goSqlRuntime(['missing'])).toThrow('Missing Go SQL helper')
  })
})
