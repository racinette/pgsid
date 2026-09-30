import assert from 'node:assert/strict'
import { mkdir, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck, lowerDomainCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Input, type Row, type Outcome } from '../check-rust/parity.js'

const directory = fileURLToPath(new URL('../../artifacts/check-rust-int8/', import.meta.url))
await rm(directory, { recursive: true, force: true })
await mkdir(directory, { recursive: true })
const definitions: Record<string, string> = {
  positive: 'amount > 0',
  exact: 'amount > 9007199254740992',
  maximum: 'amount <= 9223372036854775807',
  minimum: 'amount >= -9223372036854775808',
  null_bound: 'amount > NULL',
  null_test: 'amount IS NULL',
  not_null: 'amount IS NOT NULL',
  in_list: 'amount IN (0, 1, NULL)',
  not_in_list: 'amount NOT IN (0, 1, NULL)',
  in_exact: 'amount IN (-9223372036854775808, 9007199254740993, 9223372036854775807)',
  array_int4: 'amount = ANY(ARRAY[0, 1])',
  array_int8: 'amount = ANY(ARRAY[0::bigint, 1::bigint])',
  between: 'amount BETWEEN 0 AND other',
  symmetric: 'amount NOT BETWEEN SYMMETRIC 0 AND other',
  simple_case: 'CASE amount WHEN 0 THEN flag WHEN 9007199254740993 THEN true ELSE false END',
  scalar_case: '(CASE WHEN flag THEN amount ELSE 0 END) > small',
  scalar_null_case: '(CASE WHEN flag THEN amount ELSE NULL END) IS NULL',
  lazy: 'flag OR amount > other',
  eager_case_guard: 'CASE WHEN flag THEN true ELSE amount > other END',
}
for (const [suffix, operator] of Object.entries({
  eq: '=',
  ne: '<>',
  lt: '<',
  le: '<=',
  gt: '>',
  ge: '>=',
})) {
  definitions['int8_' + suffix] = `amount ${operator} other`
  definitions['int84_' + suffix] = `amount ${operator} small`
  definitions['int48_' + suffix] = `small ${operator} amount`
}
const value = (value: number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const row = (
  amount: bigint | null,
  other: bigint | null,
  small: number | null,
  flag: boolean | null,
): Row => ({
  amount: value(amount),
  other: value(other),
  small: value(small),
  flag: value(flag),
  value: value(amount),
})
const fixtures: { name: string; row: Row; expected: Outcome }[] = []
let group: ReturnType<typeof prepareCheckRustGroup>
const names = Object.keys(definitions).flatMap((name) => [name, name + '_raw'])
names.push('domain_positive')
const pg = await PGlite.create()
try {
  await pg.exec(`CREATE DOMAIN public.positive_bigint AS bigint CONSTRAINT positive CHECK (VALUE > 0);
    CREATE TABLE public.int8_checks (amount bigint, other bigint, small int4, flag bool, ${Object.entries(
      definitions,
    )
      .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
      .join(', ')});
    CREATE TABLE int8_inputs (amount bigint, other bigint, small int4, flag bool)`)
  const catalog = await snapshotCatalog(pg)
  const table = catalog.tables.find((item) => item.name === 'int8_checks')!
  const domain = catalog.domains.find((item) => item.name === 'positive_bigint')!
  group = prepareCheckRustGroup([
    ...Object.entries(definitions).flatMap(([name, sql]) => [
      {
        expression: lowerTableCheck(
          table,
          table.constraints.find((item) => item.name === name)!,
        )!.expression,
        identity: { schema: 'public', kind: 'table' as const, owner: table.name, constraint: name },
      },
      {
        expression: lowerTableCheck(table, {
          name: name + '_raw',
          type: 'check',
          definition: `CHECK (${sql})`,
        })!.expression,
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_raw',
        },
      },
    ]),
    {
      expression: lowerDomainCheck(domain, domain.checks[0]!)!.expression,
      identity: { schema: 'public', kind: 'domain', owner: domain.name, constraint: 'positive' },
    },
  ])
  for (const [index, check] of group.checks.entries())
    assert.equal(check.kind, 'supported', `${names[index]}: ${JSON.stringify(check)}`)
  const values = [
    -9223372036854775808n,
    -9007199254740993n,
    -2147483649n,
    -1n,
    0n,
    1n,
    2147483648n,
    9007199254740992n,
    9007199254740993n,
    9223372036854775807n,
    null,
  ]
  const rows: [bigint | null, bigint | null, number | null, boolean | null][] = []
  for (const amount of values)
    for (const other of values)
      for (const small of [-2147483648, 0, 2147483647, null])
        rows.push([amount, other, small, true])
  for (const flag of [true, false, null]) rows.push([9007199254740993n, 9007199254740992n, 1, flag])
  for (const [amount, other, small, flag] of rows) {
    await pg.exec('TRUNCATE int8_inputs')
    await pg.query('INSERT INTO int8_inputs VALUES ($1,$2,$3,$4)', [
      amount?.toString() ?? null,
      other?.toString() ?? null,
      small,
      flag,
    ])
    for (const [name, sql] of Object.entries(definitions)) {
      const result = (
        await pg.query<{ value: boolean | null }>(`SELECT (${sql}) AS value FROM int8_inputs`)
      ).rows[0]!.value
      const expected: Outcome = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
      for (const suffix of ['', '_raw'])
        fixtures.push({ name: name + suffix, row: row(amount, other, small, flag), expected })
    }
    fixtures.push({
      name: 'domain_positive',
      row: row(amount, other, small, flag),
      expected: { kind: amount === null ? 'Null' : amount > 0n ? 'True' : 'False' },
    })
  }
} finally {
  await pg.close()
}
const unknown: Input = { kind: 'Unknown' }
const error: Input = { kind: 'Error', value: { state: Number.parseInt('22003', 36) } }
const otherError: Input = { kind: 'Error', value: { state: Number.parseInt('22012', 36) } }
const add = (name: string, input: Row, expected: Outcome) => {
  for (const suffix of ['', '_raw']) fixtures.push({ name: name + suffix, row: input, expected })
}
add('int8_gt', { ...row(1n, 0n, 0, true), amount: unknown }, { kind: 'Unknown' })
add(
  'int8_gt',
  { ...row(1n, 0n, 0, true), amount: error, other: otherError },
  { kind: 'Error', value: error.value },
)
add('int84_gt', { ...row(1n, 0n, 0, true), small: unknown }, { kind: 'Unknown' })
add(
  'int48_gt',
  { ...row(1n, 0n, 0, true), small: error, amount: unknown },
  { kind: 'Error', value: error.value },
)
add('lazy', { ...row(1n, 0n, 0, true), amount: error }, { kind: 'True' })
add('eager_case_guard', { ...row(1n, 0n, 0, true), amount: error }, { kind: 'True' })
add('scalar_case', { ...row(1n, 0n, 0, false), amount: error }, { kind: 'False' })
add(
  'scalar_case',
  { ...row(1n, 0n, 0, true), amount: error },
  { kind: 'Error', value: error.value },
)
add('scalar_case', { ...row(1n, 0n, 0, true), flag: unknown }, { kind: 'Unknown' })
add('in_list', { ...row(0n, 0n, 0, true), amount: unknown }, { kind: 'Unknown' })
await runCheckParity(directory, 'int8-checks', group, names, fixtures)
process.stdout.write(
  `int8 CHECK parity: ${fixtures.length} fixtures passed in Rust, Go, and TypeScript.\n`,
)
