import assert from 'node:assert/strict'
import { mkdir, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Input, type Row, type Outcome } from '../check-rust/parity.js'

const directory = fileURLToPath(new URL('../../artifacts/check-rust-between/', import.meta.url))
await rm(directory, { recursive: true, force: true })
await mkdir(directory, { recursive: true })
const definitions = {
  between: 'amount BETWEEN low AND high',
  not_between: 'amount NOT BETWEEN low AND high',
  symmetric: 'amount BETWEEN SYMMETRIC low AND high',
  not_symmetric: 'amount NOT BETWEEN SYMMETRIC low AND high',
  explicit_asymmetric: 'amount BETWEEN ASYMMETRIC low AND high',
  limits: 'amount BETWEEN -2147483648 AND 2147483647',
  bool_between: 'flag BETWEEN false AND true',
  bool_not_between: 'flag NOT BETWEEN true AND false',
  text_between: "note BETWEEN 'a' AND '😀'",
  text_not_symmetric: "note NOT BETWEEN SYMMETRIC '😀' AND 'a'",
  lazy_between: 'amount BETWEEN low AND high + 1',
  lazy_not_between: 'amount NOT BETWEEN low AND high + 1',
  lazy_symmetric: 'amount BETWEEN SYMMETRIC low AND high + 1',
  lazy_not_symmetric: 'amount NOT BETWEEN SYMMETRIC low AND high + 1',
  computed_subject: '(amount + 1) BETWEEN low AND high',
  scalar: '(amount BETWEEN low AND high) IS NULL',
  callable: '(amount BETWEEN low AND high) = flag',
  nested: "CASE WHEN amount BETWEEN low AND high THEN flag ELSE note BETWEEN 'a' AND 'z' END",
  scalar_case: '(CASE WHEN flag THEN amount ELSE low END) BETWEEN low AND high',
  null_bound: 'amount BETWEEN NULL AND high',
  null_subject: 'NULL BETWEEN low AND high',
  literal_null_bound: '0 BETWEEN NULL AND 1',
}
type Name = keyof typeof definitions
const value = (value: number | boolean | string | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const row = (
  amount: number | null,
  low: number | null,
  high: number | null,
  flag: boolean | null,
  note: string | null,
): Row => ({
  amount: value(amount),
  low: value(low),
  high: value(high),
  flag: value(flag),
  note: value(note),
})
const fixtures: { name: string; row: Row; expected: Outcome }[] = []
let group: ReturnType<typeof prepareCheckRustGroup>
const pg = await PGlite.create()
try {
  await pg.exec(
    `CREATE TABLE public.between_checks (amount int4, low int4, high int4, flag bool, note text COLLATE "C", ${Object.entries(
      definitions,
    )
      .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
      .join(', ')})`,
  )
  await pg.exec(
    'CREATE TABLE between_inputs (amount int4, low int4, high int4, flag bool, note text COLLATE "C")',
  )
  const catalog = await snapshotCatalog(pg)
  const table = catalog.tables.find((item) => item.name === 'between_checks')!
  group = prepareCheckRustGroup(
    Object.entries(definitions).flatMap(([name, sql]) => [
      {
        expression: lowerTableCheck(
          table,
          table.constraints.find((item) => item.name === name)!,
        )!.expression,
        identity: { schema: 'public', kind: 'table', owner: table.name, constraint: name },
      },
      {
        expression: lowerTableCheck(table, {
          name: name + '_raw',
          type: 'check',
          definition: `CHECK (${sql})`,
        })!.expression,
        identity: { schema: 'public', kind: 'table', owner: table.name, constraint: name + '_raw' },
      },
    ]),
  )
  for (const [index, check] of group.checks.entries())
    assert.equal(check.kind, 'supported', `${index}: ${JSON.stringify(check)}`)
  const inputs: [number | null, number | null, number | null, boolean | null, string | null][] = []
  for (const amount of [-2147483648, -1, 0, 1, 2, 2147483647, null])
    for (const low of [-2147483648, 0, 1, 2147483647, null])
      for (const high of [-2147483648, 0, 1, 2147483647, null])
        inputs.push([amount, low, high, true, 'a'])
  for (const flag of [true, false, null])
    for (const note of ['', 'a', 'z', '😀', '😁', null]) inputs.push([0, -1, 1, flag, note])
  for (const [amount, low, high, flag, note] of inputs) {
    await pg.exec('TRUNCATE between_inputs')
    await pg.query('INSERT INTO between_inputs VALUES ($1,$2,$3,$4,$5)', [
      amount,
      low,
      high,
      flag,
      note,
    ])
    for (const [name, sql] of Object.entries(definitions)) {
      let expected: Outcome
      try {
        const result = await pg.query<{ value: boolean | null }>(
          `SELECT (${sql}) AS value FROM between_inputs`,
        )
        expected = {
          kind: result.rows[0]!.value === null ? 'Null' : result.rows[0]!.value ? 'True' : 'False',
        }
      } catch (error) {
        assert.ok(error && typeof error === 'object' && 'code' in error)
        assert.equal(error.code, '22003')
        expected = { kind: 'Error', value: { state: Number.parseInt(error.code, 36) } }
      }
      for (const suffix of ['', '_raw'])
        fixtures.push({ name: name + suffix, row: row(amount, low, high, flag, note), expected })
    }
  }
} finally {
  await pg.close()
}
const unknown: Input = { kind: 'Unknown' }
const error: Input = { kind: 'Error', value: { state: Number.parseInt('22003', 36) } }
const otherError: Input = { kind: 'Error', value: { state: Number.parseInt('22012', 36) } }
const add = (name: Name, input: Row, expected: Outcome) => {
  for (const suffix of ['', '_raw']) fixtures.push({ name: name + suffix, row: input, expected })
}
add('between', { ...row(-1, 0, 1, true, 'a'), high: error }, { kind: 'False' })
add('not_between', { ...row(-1, 0, 1, true, 'a'), high: error }, { kind: 'True' })
add('between', { ...row(0, 0, 1, true, 'a'), high: error }, { kind: 'Error', value: error.value })
add('symmetric', { ...row(0, 0, 1, true, 'a'), amount: unknown }, { kind: 'Unknown' })
add('between', { ...row(2, 0, 1, true, 'a'), low: unknown }, { kind: 'False' })
add('not_between', { ...row(2, 0, 1, true, 'a'), low: unknown }, { kind: 'True' })
add('between', { ...row(0, 0, 1, true, 'a'), amount: unknown }, { kind: 'Unknown' })
add(
  'between',
  { ...row(0, 0, 1, true, 'a'), amount: error, low: otherError },
  { kind: 'Error', value: error.value },
)
add(
  'symmetric',
  { ...row(-1, 0, 1, true, 'a'), high: error },
  { kind: 'Error', value: error.value },
)
add(
  'not_symmetric',
  { ...row(-1, 0, 1, true, 'a'), high: error },
  { kind: 'Error', value: error.value },
)
add('nested', { ...row(2, 0, 1, true, 'a'), flag: error }, { kind: 'True' })
add('scalar', { ...row(0, 0, 1, true, 'a'), amount: unknown }, { kind: 'Unknown' })
add('bool_between', { ...row(0, 0, 1, true, 'a'), flag: unknown }, { kind: 'Unknown' })
add(
  'text_between',
  { ...row(0, 0, 1, true, 'a'), note: error },
  { kind: 'Error', value: error.value },
)
await runCheckParity(
  directory,
  'between-checks',
  group,
  Object.keys(definitions).flatMap((name) => [name, name + '_raw']),
  fixtures,
)
process.stdout.write(
  `BETWEEN/NOT BETWEEN parity: ${fixtures.length} fixtures passed in Rust, Go, and TypeScript.\n`,
)
