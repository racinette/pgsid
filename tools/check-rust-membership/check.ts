import assert from 'node:assert/strict'
import { mkdir, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Input, type Row, type Outcome } from '../check-rust/parity.js'

const directory = fileURLToPath(new URL('../../artifacts/check-rust-membership/', import.meta.url))
await rm(directory, { recursive: true, force: true })
await mkdir(directory, { recursive: true })
const definitions = {
  int4_in: 'amount IN (0, 1, NULL)',
  int4_not_in: 'amount NOT IN (0, 1, NULL)',
  bool_in: 'flag IN (true, NULL)',
  bool_not_in: 'flag NOT IN (true, NULL)',
  text_in: "note IN ('a', '😀', NULL)",
  text_not_in: "note NOT IN ('a', '😀', NULL)",
  exact_in: 'amount IN (-2147483648, 0, 2147483647)',
  exact_not_in: 'amount NOT IN (-2147483648, 0, 2147483647)',
  singleton: 'amount IN (0)',
  computed_subject: '(amount + 1) IN (0, 1)',
  lazy_in: 'amount IN (0, other + 1)',
  lazy_not_in: 'amount NOT IN (0, other + 1)',
  mixed: 'amount IN (other + 1, 0, 1)',
  eager_in: 'amount = ANY (ARRAY[0, other + 1])',
  eager_not_in: 'amount <> ALL (ARRAY[0, other + 1])',
  typed_array: 'amount = ANY (ARRAY[0, 1]::int4[])',
  nested: "CASE WHEN amount IN (0, 1) THEN flag ELSE note NOT IN ('a', '😀') END",
  scalar: '(amount IN (0, NULL)) IS NULL',
  callable: '(amount IN (0, 1)) = flag',
  members_case: 'amount IN (CASE WHEN flag THEN 0 ELSE other END, 1)',
}
type Name = keyof typeof definitions
const value = (value: number | boolean | string | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const row = (
  amount: number | null,
  other: number | null,
  flag: boolean | null,
  note: string | null,
): Row => ({ amount: value(amount), other: value(other), flag: value(flag), note: value(note) })
const fixtures: { name: string; row: Row; expected: Outcome }[] = []
let group: ReturnType<typeof prepareCheckRustGroup>
const pg = await PGlite.create()
try {
  await pg.exec(
    `CREATE TABLE public.membership_checks (amount int4, other int4, flag bool, note text COLLATE "C", ${Object.entries(
      definitions,
    )
      .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
      .join(', ')})`,
  )
  await pg.exec(
    'CREATE TABLE membership_inputs (amount int4, other int4, flag bool, note text COLLATE "C")',
  )
  const catalog = await snapshotCatalog(pg)
  const table = catalog.tables.find((item) => item.name === 'membership_checks')!
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
  for (const amount of [-2147483648, -2, -1, 0, 1, 2147483647, null]) {
    for (const other of [0, 2147483647, null]) {
      for (const flag of [true, false, null]) {
        for (const note of ['a', 'z', '😀', null]) {
          await pg.query('TRUNCATE membership_inputs')
          await pg.query('INSERT INTO membership_inputs VALUES ($1,$2,$3,$4)', [
            amount,
            other,
            flag,
            note,
          ])
          for (const [name, sql] of Object.entries(definitions)) {
            let expected: Outcome
            try {
              const result = await pg.query<{ value: boolean | null }>(
                `SELECT (${sql}) AS value FROM membership_inputs`,
              )
              expected = {
                kind:
                  result.rows[0]!.value === null
                    ? 'Null'
                    : result.rows[0]!.value
                      ? 'True'
                      : 'False',
              }
            } catch (error) {
              assert.ok(error && typeof error === 'object' && 'code' in error)
              assert.equal(error.code, '22003')
              expected = { kind: 'Error', value: { state: Number.parseInt(error.code, 36) } }
            }
            for (const suffix of ['', '_raw'])
              fixtures.push({ name: name + suffix, row: row(amount, other, flag, note), expected })
          }
        }
      }
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
add('int4_in', { ...row(0, 0, true, 'a'), amount: unknown }, { kind: 'Unknown' })
add(
  'int4_not_in',
  { ...row(0, 0, true, 'a'), amount: error },
  { kind: 'Error', value: error.value },
)
add('bool_in', { ...row(0, 0, true, 'a'), flag: unknown }, { kind: 'Unknown' })
add('bool_not_in', { ...row(0, 0, true, 'a'), flag: error }, { kind: 'Error', value: error.value })
add('text_in', { ...row(0, 0, true, 'a'), note: unknown }, { kind: 'Unknown' })
add('text_not_in', { ...row(0, 0, true, 'a'), note: error }, { kind: 'Error', value: error.value })
add('lazy_in', { ...row(0, 0, true, 'a'), other: error }, { kind: 'True' })
add('lazy_not_in', { ...row(0, 0, true, 'a'), other: error }, { kind: 'False' })
add('mixed', { ...row(0, 0, true, 'a'), other: error }, { kind: 'True' })
add('eager_in', { ...row(0, 0, true, 'a'), other: error }, { kind: 'Error', value: error.value })
add(
  'eager_not_in',
  { ...row(0, 0, true, 'a'), other: error },
  { kind: 'Error', value: error.value },
)
add('eager_in', { ...row(0, 0, true, 'a'), other: unknown }, { kind: 'True' })
add('eager_not_in', { ...row(0, 0, true, 'a'), other: unknown }, { kind: 'False' })
add(
  'eager_in',
  { ...row(0, 0, true, 'a'), amount: error, other: otherError },
  { kind: 'Error', value: error.value },
)
add('nested', { ...row(2, 0, true, 'a'), flag: error }, { kind: 'False' })
add('members_case', { ...row(0, 0, true, 'a'), other: error }, { kind: 'True' })
assert.ok(group.evaluatorSource)
for (const suffix of ['', '_raw']) {
  const once: string = group.evaluatorSource
    .split('\n\npub fn ')
    .find((part) => part.includes(`_computed_subject${suffix}_h`))!
  assert.equal((once.match(/sql__pg_catalog__int4pl__[a-z0-9]+\(/gu) ?? []).length, 1)
}
const names = Object.keys(definitions).flatMap((name) => [name, name + '_raw'])
await runCheckParity(directory, 'membership-checks', group, names, fixtures)
process.stdout.write(
  `IN/NOT IN parity: ${fixtures.length} fixtures passed in Rust, Go, and TypeScript.\n`,
)
