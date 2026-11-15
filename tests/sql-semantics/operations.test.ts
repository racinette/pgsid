import {
  BUILTIN_ARRAY_ELEMENT_TYPES,
  arrayType,
  resolveArrayPolymorphicType,
} from '../../src/sql-semantics/expressions.js'
import { scalarCases } from '../fixtures/sql-semantics/operations/scalar.js'
import { textSignatures } from '../fixtures/sql-semantics/operations/text-signatures.js'
import { numericCases, numericStressCases } from '../fixtures/sql-semantics/operations/numeric.js'
import { sqlSemanticsCoverage } from '../../scripts/report-sql-semantics-coverage.js'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  integerAdditionCases,
  integerCompositionCases,
} from '../fixtures/sql-semantics/operations/integer-addition.js'
import { integerOperationCases } from '../fixtures/sql-semantics/operations/integer-operations.js'
import { operationCheck } from '../fixtures/sql-semantics/operations/check-form.js'
import {
  deploymentOperationChecks,
  undecidedOperationChecks,
} from '../fixtures/sql-semantics/operations/undecided-checks.js'
import { observeSql } from '../support/postgres/observe.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import type { EvalBoolExpression } from '../../src/sql-semantics/check-expressions.js'
import type { EvalExpression } from '../../src/sql-semantics/eval-expressions.js'
import {
  emitCheckRustEvaluator,
  type CheckExecutionContext,
} from '../../src/codegen/shared/check-rust-evaluator.js'
import {
  checkRustCallableNames,
  prepareCheckRust,
  prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { transpileCheckRustFiles } from '../../src/codegen/shared/check-rust-transpile.js'
import { typescriptSqlRuntime } from '../../src/codegen/typescript/sql/runtime.js'
import { goSqlRuntime } from '../../src/codegen/go/sql/runtime.js'
import { builtinMetadata } from '../../src/postgres/builtins/inventory.js'
import { captureRegexCharacterProfile } from '../../tools/check-rust/regex-profile.js'
import { runCheckParity } from '../../tools/check-rust/parity.js'

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

// The cases are evaluated in batches, each compiled as one evaluator.
const batchSize = 1500
const batches = Array.from({ length: Math.ceil(cases.length / batchSize) }, (_, index) => {
  const from = index * batchSize,
    to = Math.min(cases.length, (index + 1) * batchSize)
  return [`${from} to ${to}`, from, to] as const
})

// Cases that each exercise one family's operations alone.
const isolatedCaseNames = [
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
  'bytea length function:["pg_catalog","length"](pg_catalog.bytea) 7',
  'bytea length function:["pg_catalog","bit_length"](pg_catalog.bytea) 3',
  'bytea length function:["pg_catalog","bit_count"](pg_catalog.bytea) 4',
  'bytea slice substring 2/4/2',
  'bytea position 0',
  'bytea overlay 2',
  'bytea trim btrim 0',
  'bytea reverse 3',
  'bytea get byte 0',
  'bytea get bit 4',
  'bytea set byte 2',
  'bytea set bit 1',
  'bytea from pg_catalog.int2 3',
  'bytea to int8 18',
  'bytea encode 10',
  'bytea decode 5',
  'bit compare operator:["pg_catalog","<"](pg_catalog."bit",pg_catalog."bit") 2',
  'bit logic operator:["pg_catalog","&"](pg_catalog."bit",pg_catalog."bit") 0',
  'bit shift operator:["pg_catalog","<<"](pg_catalog."bit",pg_catalog.int4) 2',
  'bit from int8 2',
  'varbit typmod 2',
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

  describe('through the CHECK evaluator', () => {
    let catalogPg: PGlite
    let context: CheckExecutionContext

    // Each case becomes a stored CHECK, bound from the definition PostgreSQL keeps as a project's
    // catalog would hold it. A case PostgreSQL rejects while defining the CHECK, such as a literal
    // out of its type's range, is bound from its source instead.
    const bindStored = async (
      fixtures: readonly (typeof cases)[number][],
      names: readonly string[],
    ) => {
      await catalogPg.exec(
        'DROP TABLE IF EXISTS operation_cases; CREATE TABLE operation_cases (unused boolean)',
      )
      const rejected = new Set<string>()
      for (const [index, fixture] of fixtures.entries())
        try {
          await catalogPg.exec(
            `ALTER TABLE operation_cases ADD CONSTRAINT ${names[index]} CHECK (${operationCheck(fixture).sql})`,
          )
        } catch {
          rejected.add(names[index]!)
        }
      const catalog = await snapshotCatalog(catalogPg)
      const table = catalog.tables.find((item) => item.name === 'operation_cases')!
      return names.map((name, index) => {
        const plan = lowerTableCheck(
          table,
          rejected.has(name)
            ? {
                name,
                type: 'check',
                definition: `CHECK (${operationCheck(fixtures[index]!).sql})`,
              }
            : table.constraints.find((constraint) => constraint.name === name)!,
          catalog.enums,
          catalog.domains,
          rejected.has(name) ? 'source' : 'stored',
          catalog.rangeTypes,
        )
        return plan && plan.expression.kind !== 'uncertain' ? plan.expression : null
      })
    }

    // The settings PostgreSQL observed the cases under, as a project declares them.
    beforeAll(async () => {
      catalogPg = await PGlite.create()
      await catalogPg.exec(`SET timezone = 'UTC'`)
      for (const sql of setupSql) await catalogPg.exec(sql)
      const setting = async (name: string) =>
        (
          await catalogPg.query<{ value: string }>(
            `SELECT pg_catalog.current_setting('${name}') AS value`,
          )
        ).rows[0]!.value
      expect(await setting('DateStyle')).toBe('ISO, MDY')
      expect(await setting('IntervalStyle')).toBe('postgres')
      expect(await setting('extra_float_digits')).toBe('1')
      expect(await setting('client_encoding')).toBe('UTF8')
      context = {
        timeLocale: 'C',
        timeZoneAbbreviations: 'Default',
        timeZone: await setting('TimeZone'),
        intervalStyle: 'postgres',
        dateStyle: { format: 'ISO', order: 'MDY' },
        byteaOutput: (await setting('bytea_output')) as 'hex',
        defaultCollation: 'C',
        defaultCtype: 'C.UTF-8',
        regexCharacterProfile: await captureRegexCharacterProfile(catalogPg),
        serverEncoding: 'UTF8',
        arrayNulls: true,
        nativeByteOrder: 'little',
        maxIdentifierBytes: Number(await setting('max_identifier_length')),
        trigonometry: 'fdlibm',
        mathLibrary: 'musl',
        extraFloatDigits: 1,
        numericLocale: 'C',
        moneyLocale: 'C',
        xpathRecursionLimit: 5000,
        clientEncoding: 'UTF8',
      }
    })

    afterAll(async () => {
      await catalogPg.close()
    })

    it.each(batches)(
      'evaluates cases %s in every target',
      async (_, from, to) => {
        const batch = cases.slice(from, to)
        const names = batch.map((_, index) => `case_${from + index}`)
        const expressions = await bindStored(batch, names)
        const plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
        const fixtures: Parameters<typeof runCheckParity>[4][number][] = []
        const undecided: Record<string, string> = {}
        for (const [index, fixture] of batch.entries()) {
          const expression = expressions[index]
          if (!expression) {
            undecided[fixture.name] = 'unbound'
            continue
          }
          const prepared = prepareCheckRust(expression, undefined, context)
          if (prepared.kind === 'unsupported') {
            undecided[fixture.name] = prepared.reason
            continue
          }
          plans.push({
            expression,
            identity: {
              schema: 'public',
              kind: 'table',
              owner: 'operation_cases',
              constraint: names[index]!,
            },
          })
          fixtures.push({
            name: names[index]!,
            row: {},
            expected: Object.hasOwn(deploymentOperationChecks, fixture.name)
              ? { kind: 'Unknown' }
              : operationCheck(fixture).expected,
          })
        }
        expect(undecided).toEqual(
          Object.fromEntries(
            batch.flatMap((fixture) =>
              Object.hasOwn(undecidedOperationChecks, fixture.name)
                ? [[fixture.name, undecidedOperationChecks[fixture.name]!]]
                : [],
            ),
          ),
        )
        const directory = await mkdtemp(join(tmpdir(), 'pgsid-operation-checks-'))
        try {
          await runCheckParity(
            directory,
            'operation_checks',
            prepareCheckRustGroup(plans, context),
            fixtures.map((fixture) => fixture.name),
            fixtures,
          )
        } finally {
          await rm(directory, { recursive: true, force: true })
        }
      },
      // The translated TypeScript takes minutes on the extreme-precision numeric cases, about
      // 400 seconds for the square root of 1e131071 alone.
      1_800_000,
    )

    it('binds each isolated case and pins the evaluator it generates', async () => {
      const fixtures = isolatedCaseNames.map((name) => {
        const fixture = standardCases.find((fixture) => fixture.name === name)
        if (!fixture) throw new Error(`Missing isolated fixture: ${name}`)
        return fixture
      })
      const expressions = await bindStored(
        fixtures,
        fixtures.map((_, index) => `isolated_${index}`),
      )
      const sources: string[] = []
      for (const [index, name] of isolatedCaseNames.entries()) {
        const expression = expressions[index]
        if (Object.hasOwn(undecidedOperationChecks, name)) {
          expect(expression, name).toBeNull()
          sources.push(`// ${name}\n// ${undecidedOperationChecks[name]}\n`)
          continue
        }
        expect(expression, name).not.toBeNull()
        const prepared = prepareCheckRust(expression!, undefined, context)
        if (prepared.kind === 'unsupported') throw new Error(`${name}: ${prepared.reason}`)
        sources.push(`// ${name}\n${prepared.evaluator.source}`)
      }
      // A change to what an isolated case generates, such as a callable it newly needs, is
      // reviewed here.
      const path = new URL('../fixtures/sql-semantics/projects/evaluators.rs', import.meta.url)
      if (process.env.UPDATE_SQL_SEMANTICS_GOLDENS === '1')
        await writeFile(path, sources.join('\n'))
      expect(await readFile(path, 'utf8')).toBe(sources.join('\n'))
    })
  })

  it('reports evaluator support for every catalog callable and covers it with fixture evidence', () => {
    const rows = sqlSemanticsCoverage()
    expect(() => sqlSemanticsCoverage(undefined, new Set())).toThrow(
      'Fixture evidence without evaluator support',
    )
    const evidenced = rows.filter((row) => row.fixtures.length > 0)
    expect(evidenced).toHaveLength(926)
    expect(evidenced.every((row) => row.evaluator)).toBe(true)
    expect(rows.filter((row) => row.evaluator).length).toBeGreaterThan(evidenced.length)
    expect(rows.some((row) => !row.evaluator && row.fixtures.length === 0)).toBe(true)
  })

  it('carries the math licenses into translated evaluators', () => {
    const plan = prepareCheckRustGroup(
      [
        {
          expression: {
            kind: 'eval-scalar',
            expression: {
              kind: 'null-test',
              type: 'pg_catalog.bool',
              negated: false,
              operand: {
                kind: 'call',
                call: {
                  kind: 'function',
                  signature: 'function:["pg_catalog","exp"](pg_catalog.float8)',
                  type: 'pg_catalog.float8',
                },
                operands: [{ kind: 'input', type: 'pg_catalog.float8', name: 'value' }],
              },
            },
          },
          identity: { schema: 'public', kind: 'table', owner: 'math', constraint: 'exponential' },
        },
      ],
      { mathLibrary: 'musl' },
    )
    const translated = transpileCheckRustFiles(plan.source!)
    for (const files of [translated.typescript, translated.go]) {
      const runtime = Object.values(files).join('\n')
      expect(runtime).toContain('Copyright (c) 2018, Arm Limited.')
      expect(runtime).toContain('Copyright (C) 1993 by Sun Microsystems, Inc.')
      expect(runtime).toContain('Portions Copyright (c) 1996-')
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

  it('rejects malformed expressions and leaves unsupported text collations undecided', () => {
    const input = (type: string, name: string) =>
      ({ kind: 'input', type, name }) as unknown as EvalExpression
    const scalar = (expression: unknown) =>
      ({ kind: 'eval-scalar', expression }) as EvalBoolExpression
    const nullTest = (operand: unknown) =>
      scalar({ kind: 'null-test', type: 'pg_catalog.bool', negated: false, operand })
    expect(() =>
      emitCheckRustEvaluator(
        nullTest({
          kind: 'boolean-logic',
          type: 'pg_catalog.bool',
          operation: 'and',
          operands: [input('pg_catalog.bool', 'flag')],
        }),
      ),
    ).toThrow('Expected binary Boolean operation')
    expect(() =>
      emitCheckRustEvaluator(
        nullTest({
          kind: 'case',
          type: 'pg_catalog.int4',
          branches: [],
          otherwise: input('pg_catalog.int4', 'amount'),
        }),
      ),
    ).toThrow('Expected a CASE branch')
    expect(() =>
      emitCheckRustEvaluator(
        nullTest({
          kind: 'certain',
          expression: { kind: 'float', type: 'pg_catalog.float4', bits: 'xyz' },
        }),
      ),
    ).toThrow('Invalid floating-point literal bits')
    const ordering = emitCheckRustEvaluator(
      scalar({
        kind: 'call',
        call: {
          kind: 'operator',
          signature: 'operator:["pg_catalog","<"](pg_catalog.text,pg_catalog.text)',
          type: 'pg_catalog.bool',
          collation: 'nondeterministic',
        },
        operands: [input('pg_catalog.text', 'left'), input('pg_catalog.text', 'right')],
      }),
    )
    // Ordering under a nondeterministic collation waits on the deployment's collation provider.
    expect(ordering.source).not.toMatch(/sql__pg_catalog__text_lt__/u)
    expect(ordering.source).toMatch(/check_unknown\(\)/u)
  })

  it('evaluates unary cast implementations linked from the catalog', () => {
    for (const [signature, type, operand] of [
      ['function:["pg_catalog","bytea"](pg_catalog.int4)', 'pg_catalog.bytea', 'pg_catalog.int4'],
      ['function:["pg_catalog","int4"](pg_catalog.bytea)', 'pg_catalog.int4', 'pg_catalog.bytea'],
    ] as const) {
      const evaluator = emitCheckRustEvaluator({
        kind: 'eval-scalar',
        expression: {
          kind: 'null-test',
          type: 'pg_catalog.bool',
          negated: false,
          operand: {
            kind: 'call',
            call: { kind: 'cast', signature, type },
            operands: [{ kind: 'input', type: operand, name: 'value' }],
          },
        },
      })
      const metadata = builtinMetadata(signature)
      if (metadata.kind !== 'function') throw new Error(signature)
      expect(evaluator.callables).toContain(metadata.rustName)
      expect(checkRustCallableNames()).toContain(metadata.rustName)
    }
  })

  it('refuses unsupported overloads and inconsistent resolved operands', () => {
    const literal = {
      kind: 'certain',
      expression: { kind: 'integer', type: 'pg_catalog.int4', value: '1' },
    } as const
    const nullTest = (operand: unknown) =>
      ({
        kind: 'eval-scalar',
        expression: { kind: 'null-test', type: 'pg_catalog.bool', negated: false, operand },
      }) as EvalBoolExpression
    const call = (kind: string, signature: string | null, type: string, operands: unknown[]) =>
      nullTest({ kind: 'call', call: { kind, signature, type }, operands })
    for (const [expression, message] of [
      [
        call(
          'operator',
          'operator:["pg_catalog","+"](pg_catalog.int8,pg_catalog.int8)',
          'pg_catalog.int8',
          [literal, literal],
        ),
        'Unsupported Rust CHECK callable arguments',
      ],
      [
        call('function', 'function:["pg_catalog","abs"](pg_catalog.int4)', 'pg_catalog.bool', [
          literal,
        ]),
        'Unsupported Rust CHECK callable',
      ],
      [
        call('function', 'aggregate:["pg_catalog","sum"](pg_catalog.int4)', 'pg_catalog.int8', [
          literal,
        ]),
        'Unsupported Rust CHECK callable',
      ],
      [
        call(
          'function',
          'function:["pg_catalog","generate_series"](pg_catalog.int4,pg_catalog.int4)',
          'pg_catalog.int4',
          [literal, literal],
        ),
        'Unsupported Rust CHECK callable',
      ],
      [call('cast', null, 'pg_catalog.int8', [literal]), 'Invalid Rust CHECK relabel cast'],
      [
        call('cast', 'function:["pg_catalog","abs"](pg_catalog.int4)', 'pg_catalog.int4', [
          literal,
        ]),
        'Invalid Rust CHECK cast function',
      ],
    ] as const)
      expect(() => emitCheckRustEvaluator(expression)).toThrow(message)
    expect(() => typescriptSqlRuntime(['missing'])).toThrow('Missing TypeScript SQL helper')
    expect(() => goSqlRuntime(['missing'])).toThrow('Missing Go SQL helper')
  })
})
