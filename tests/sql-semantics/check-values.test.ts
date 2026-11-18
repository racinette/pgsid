import { expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { parseSync } from 'libpg-query'
import { bindCatalogValue } from '../../src/sql-semantics/catalog-check-binder.js'
import {
  prepareCheckRustValueGroup,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import {
  checkRustEntryName,
  checkRustValueEntryName,
} from '../../src/codegen/shared/check-rust-names.js'
import { checkRustValueType } from '../../src/codegen/shared/check-rust-evaluator.js'
import { runCheckParity, type Outcome } from '../../tools/check-rust/parity.js'

// Closed expressions evaluated for their values. Each is checked twice in every target: its
// text rendering against the one PostgreSQL produces, and its typed value's state (a value,
// NULL or an error) against PostgreSQL's.
const expressions = [
  '1 + 2',
  '2147483647 + 1',
  '7 % 3',
  '-5 / 2',
  'abs(-3)',
  "int8 '9223372036854775807' + 1",
  '2::numeric / 3',
  'sqrt(2::numeric)',
  'round(2.5)',
  'power(2::numeric, 10)',
  'factorial(20)',
  '1.5::float8 * 2',
  '0.1::float8 + 0.2',
  "'ab' || 'cd'",
  "length('héllo')",
  "substr('abcdef', 2, 3)",
  "replace('aXbX', 'X', '-')",
  "repeat('ab', 3)",
  "lpad('7', 3, '0')",
  "position('c' in 'abc')",
  "md5('abc')",
  '1 > 2 OR true',
  'NOT (1 = 1)',
  'NULL::int + 1',
  'NULL::text IS NULL',
  'coalesce(NULL, 2, 3)',
  'nullif(1, 1)',
  'greatest(1, 5, 3)',
  "CASE WHEN 1 > 2 THEN 'a' ELSE 'b' END",
  '1 / 0',
  "'abc'::int",
  'true::int',
  "'t'::bool",
  'ARRAY[1,2] || 3',
  'array_length(ARRAY[1,2,3], 1)',
  "(ARRAY['a','b'])[2]",
  `'{"a":1}'::jsonb -> 'a'`,
  "jsonb_build_object('k', 1)",
  "'[1,2]'::json ->> 1",
  "date '2024-01-31' + 1",
  "interval '1 day' * 2",
  "'1 day'::interval + '2 hours'::interval",
  "'\\x0102'::bytea",
]
// Case mapping follows the database's character classification, which no declared setting
// here names, so these stay unresolved.
const contextual = ["upper('x')", "lower('Ä')"]

const context = {
  dateStyle: { format: 'ISO', order: 'MDY' },
  intervalStyle: 'postgres',
  extraFloatDigits: 1,
  byteaOutput: 'hex',
  timeZone: 'UTC',
} as const

const expressionOf = (sql: string): unknown =>
  (
    parseSync(`SELECT ${sql}`) as {
      stmts: { stmt: { SelectStmt: { targetList: { ResTarget: { val: unknown } }[] } } }[]
    }
  ).stmts[0]!.stmt.SelectStmt.targetList[0]!.ResTarget.val

const probe = `
fn value_probe_text(actual: TextValue, expected: TextValue) -> BoolValue {
    if let TextValue::Value(text) = actual {
        if let TextValue::Value(wanted) = expected {
            return BoolValue::Value(text == wanted);
        }
        return BoolValue::Value(false);
    }
    if let TextValue::Null = actual {
        return BoolValue::Null;
    }
    if let TextValue::Error(error) = actual {
        return BoolValue::Error(error);
    }
    if let TextValue::Unimplemented = actual {
        return bool_unresolved(2);
    }
    bool_unresolved(1)
}
`

const prefixOf = (type: string): string =>
  checkRustValueType(type)
    .slice(0, -'Value'.length)
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()

it('evaluates closed expressions to the values and states PostgreSQL computes in every target', async () => {
  const pg = await PGlite.create()
  await pg.exec(
    "SET TimeZone = 'UTC'; SET DateStyle = 'ISO, MDY'; SET IntervalStyle = 'postgres'; SET extra_float_digits = 1; SET bytea_output = 'hex'",
  )
  const all = [...expressions, ...contextual]
  const server: Outcome[] = []
  const texts: (string | null)[] = []
  for (const sql of all) {
    try {
      const row = (await pg.query<{ t: string | null }>(`SELECT (${sql})::text AS t`)).rows[0]!
      texts.push(row.t)
      server.push(row.t === null ? { kind: 'Null' } : { kind: 'True' })
    } catch (error) {
      texts.push(null)
      server.push({
        kind: 'Error',
        value: { state: parseInt((error as { code: string }).code, 36) },
      })
    }
  }
  await pg.close()

  const values: { expression: never; type: string; entryName: string }[] = []
  const typeOf: string[] = []
  all.forEach((sql, index) => {
    const typed = bindCatalogValue(expressionOf(sql))
    const text = bindCatalogValue(expressionOf(`(${sql})::text`))
    expect([sql, typed.expression.kind], sql).not.toEqual([sql, 'uncertain'])
    expect(text.type, sql).toBe('pg_catalog.text')
    typeOf.push(typed.type!)
    values.push(
      {
        expression: typed.expression as never,
        type: typed.type!,
        entryName: checkRustValueEntryName('typed', String(index)),
      },
      {
        expression: text.expression as never,
        type: 'pg_catalog.text',
        entryName: checkRustValueEntryName('text', String(index)),
      },
    )
  })
  const prepared = prepareCheckRustValueGroup(values, context)
  expect(prepared.values.filter((value) => value.kind === 'unsupported')).toEqual([])

  const entry = (constraint: string) =>
    checkRustEntryName({ schema: 'public', kind: 'table', owner: 'values', constraint })
  const checks: string[] = []
  const names: string[] = []
  const fixtures: { name: string; row: Record<string, never>; expected: Outcome }[] = []
  all.forEach((sql, index) => {
    const textName = entry(`text_${index}`)
    const stateName = entry(`state_${index}`)
    const literal = JSON.stringify(texts[index] ?? '')
    checks.push(
      `pub fn ${textName}() -> CheckOutcome {\n    let actual = ${checkRustValueEntryName('text', String(index))}();\n    let expected = make_text_value(${literal});\n    let result = value_probe_text(actual, expected);\n    check_from_bool(result)\n}`,
      `pub fn ${stateName}() -> CheckOutcome {\n    let value = ${checkRustValueEntryName('typed', String(index))}();\n    let result = ${prefixOf(typeOf[index]!)}_is_null(value);\n    check_from_bool(result)\n}`,
    )
    names.push(`text_${index}`, `state_${index}`)
    const expected = server[index]!
    const unresolved = contextual.includes(sql)
    fixtures.push(
      {
        name: `text_${index}`,
        row: {},
        expected: unresolved ? { kind: 'Unknown' } : expected,
      },
      {
        name: `state_${index}`,
        row: {},
        expected: unresolved
          ? { kind: 'Unknown' }
          : expected.kind === 'True'
            ? { kind: 'False' }
            : expected.kind === 'Null'
              ? { kind: 'True' }
              : expected,
      },
    )
  })
  const source = prepared.source!
  const evaluators = source.modules.find((module) => module.name === 'checks')!
  // The probe helper is test scaffolding beside the generated entries, outside their dialect.
  const entries = checks.join('\n') + '\n'
  evaluators.files.push({ path: 'test/values.rs', source: probe + entries })
  const group: ReturnType<typeof prepareCheckRustGroup> = {
    source,
    evaluatorSource: evaluators.files[0]!.source + entries,
    requiresRegex: source.modules.some((module) => module.name === 'regex_engine'),
    checks: names.map((name) => ({ kind: 'supported', entryName: entry(name), inputs: [] })),
  }
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-values-'))
  try {
    await runCheckParity(directory, 'valuesparity', group, names, fixtures)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 900_000)
