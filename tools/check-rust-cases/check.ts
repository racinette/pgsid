import assert from 'node:assert/strict'
import { mkdir, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Input, type Outcome } from '../check-rust/parity.js'

const directory = fileURLToPath(new URL('../../artifacts/check-rust-cases/', import.meta.url))
await rm(directory, { recursive: true, force: true })
await mkdir(directory, { recursive: true })
const definitions = {
  simple_int4:
    'CASE amount WHEN NULL THEN false WHEN 0 THEN flag IS NULL WHEN 1 THEN note IS NULL ELSE amount > 0 END',
  simple_bool: 'CASE flag WHEN true THEN amount > 0 WHEN false THEN note IS NULL END',
  simple_text:
    "CASE note WHEN NULL THEN false WHEN 'a' THEN true WHEN '😀' THEN flag IS NULL ELSE false END",
  simple_once: 'CASE amount + 1 WHEN 0 THEN true WHEN 1 THEN false ELSE flag IS NULL END',
  simple_regex: "CASE amount WHEN 0 THEN note ~ '^a+$' ELSE true END",
  scalar_int4: '(CASE WHEN flag THEN amount + 1 ELSE 0 END) > 0',
  regex_guard: "(CASE WHEN note ~ '^a+$' THEN amount ELSE 0 END) > 0",
  scalar_text: "(CASE WHEN flag THEN note ELSE 'a' END) = 'a'",
  scalar_bool: '(CASE WHEN amount > 0 THEN flag ELSE true END) = true',
  nested: '(CASE amount WHEN 0 THEN (CASE WHEN flag THEN 1 ELSE 0 END) ELSE amount END) > 0',
  scalar_no_else: '(CASE WHEN flag THEN amount END) IS NULL',
  lazy_when: 'CASE amount WHEN 0 THEN true WHEN amount + 1 THEN false ELSE true END',
  guard_error: '(CASE WHEN amount + 1 > 0 THEN note ELSE NULL END) IS NULL',
}
type Name = keyof typeof definitions
type Row = { amount: Input; flag: Input; note: Input }
const value = (value: number | boolean | string | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const row = (amount: number | null, flag: boolean | null, note: string | null): Row => ({
  amount: value(amount),
  flag: value(flag),
  note: value(note),
})
const fixtures: { name: Name; row: Row; expected: Outcome }[] = []
const pg = await PGlite.create()
let group: ReturnType<typeof prepareCheckRustGroup>
try {
  await pg.exec(
    `CREATE TABLE public.case_checks (amount int4, flag bool, note text COLLATE "C", ${Object.entries(
      definitions,
    )
      .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
      .join(', ')})`,
  )
  const catalog = await snapshotCatalog(pg)
  const table = catalog.tables.find((item) => item.name === 'case_checks')!
  group = prepareCheckRustGroup(
    Object.keys(definitions).map((name) => ({
      expression: lowerTableCheck(
        table,
        table.constraints.find((item) => item.name === name)!,
      )!.expression,
      identity: { schema: 'public', kind: 'table', owner: 'case_checks', constraint: name },
    })),
  )
  for (const [index, check] of group.checks.entries())
    assert.equal(
      check.kind,
      'supported',
      `${Object.keys(definitions)[index]}: ${JSON.stringify(check)}`,
    )
  for (const amount of [-2147483648, -2, -1, 0, 1, 2147483647, null]) {
    for (const flag of [true, false, null]) {
      for (const note of ['a', '😀', null]) {
        const input = row(amount, flag, note)
        for (const [name, sql] of Object.entries(definitions)) {
          let expected: Outcome
          try {
            const result = await pg.query<{ value: boolean | null }>(
              `SELECT (${sql}) AS value FROM (SELECT $1::int4 AS amount, $2::bool AS flag, $3::text COLLATE "C" AS note) AS input`,
              [amount, flag, note],
            )
            expected = {
              kind:
                result.rows[0]!.value === null ? 'Null' : result.rows[0]!.value ? 'True' : 'False',
            }
          } catch (error) {
            assert.ok(error && typeof error === 'object' && 'code' in error)
            assert.equal(error.code, '22003')
            expected = { kind: 'Error', value: { state: Number.parseInt(error.code, 36) } }
          }
          fixtures.push({ name: name as Name, row: input, expected })
        }
      }
    }
  }
} finally {
  await pg.close()
}
const unknown: Input = { kind: 'Unknown' }
const error: Input = { kind: 'Error', value: { state: Number.parseInt('22003', 36) } }
const add = (name: Name, input: Row, expected: Outcome) =>
  fixtures.push({ name, row: input, expected })
add('simple_int4', { ...row(0, null, 'a'), amount: unknown }, { kind: 'Unknown' })
add('simple_int4', { ...row(0, null, 'a'), amount: error }, { kind: 'Error', value: error.value })
add('simple_int4', { ...row(0, null, 'a'), note: error }, { kind: 'True' })
add('simple_regex', { ...row(1, true, 'a'), note: error }, { kind: 'True' })
add('scalar_int4', { ...row(2147483647, false, 'a'), amount: error }, { kind: 'False' })
add('scalar_int4', { ...row(0, true, 'a'), flag: unknown }, { kind: 'Unknown' })
add('scalar_int4', { ...row(0, true, 'a'), flag: error }, { kind: 'Error', value: error.value })
add('scalar_int4', { ...row(0, true, 'a'), amount: unknown }, { kind: 'Unknown' })
add('scalar_text', { ...row(0, false, 'a'), note: unknown }, { kind: 'True' })
add('scalar_text', { ...row(0, true, 'a'), note: error }, { kind: 'Error', value: error.value })
add('scalar_text', { ...row(0, true, 'a'), flag: error }, { kind: 'Error', value: error.value })
add('scalar_bool', { ...row(0, true, 'a'), flag: error }, { kind: 'True' })
add('scalar_bool', { ...row(1, true, 'a'), flag: error }, { kind: 'Error', value: error.value })
add('nested', { ...row(1, true, 'a'), flag: unknown }, { kind: 'True' })
add('scalar_no_else', { ...row(0, false, 'a'), amount: error }, { kind: 'True' })
add('regex_guard', { ...row(1, true, 'a'), note: unknown }, { kind: 'Unknown' })
add('regex_guard', { ...row(1, true, 'a'), note: error }, { kind: 'Error', value: error.value })
assert.ok(group.source && group.evaluatorSource)
const once = group.evaluatorSource
  .split('\n\npub fn ')
  .find((part) => part.includes('_simple_once_'))!
assert.equal((once.match(/sql__pg_catalog__int4pl__[a-z0-9]+\(/gu) ?? []).length, 1)
await runCheckParity(directory, 'case-checks', group, Object.keys(definitions), fixtures)
process.stdout.write(
  `CASE parity: ${fixtures.length} fixtures passed in Rust, Go, and TypeScript.\n`,
)
