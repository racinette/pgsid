import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const expressions: Record<string, string> = {
  send: 'numeric_send(amount) = recorded_payload',
  repeated: 'numeric_send(amount) = numeric_send(amount)',
  selected: '(CASE WHEN skip THEN backup ELSE numeric_send(amount) END) = recorded_payload',
  defaulted: 'COALESCE(backup,numeric_send(amount)) = recorded_payload',
  lazy: 'CASE WHEN skip THEN true ELSE numeric_send(amount) = recorded_payload END',
  typed_null: 'numeric_send(NULL::numeric) IS NULL',
  literal: "numeric_send(1.23000::numeric) = '\\x0002000000000005000108fc'::bytea",
}
const columns: Record<string, string> = {
  amount: 'stored_amount',
  recorded_payload: 'bytea',
  backup: 'bytea',
  skip: 'boolean',
}
const input = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

describe('Rust CHECK numeric binary send', () => {
  let pg: PGlite
  let directory: string
  const domains = 'CREATE DOMAIN raw_amount AS numeric; CREATE DOMAIN stored_amount AS raw_amount;'
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-numeric-send-'))
    await pg.exec(
      `${domains} CREATE TABLE numeric_send_checks (${Object.entries(columns)
        .map(([name, type]) => `${name} ${type}`)
        .join(',')},${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')})`,
    )
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('matches base-10000 words, weight, sign, display scale and special values in Rust and both targets', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'numeric_send_checks')!
    const names = Object.keys(expressions)
    const fixtureNames = names.flatMap((name) => ['raw', 'stored'].map((form) => name + '_' + form))
    const group = prepareCheckRustGroup(
      names.flatMap((name) =>
        ['raw', 'stored'].map((form) => {
          const plan = lowerTableCheck(
            table,
            form === 'stored'
              ? table.constraints.find((check) => check.name === name)!
              : { name, type: 'check', definition: `CHECK (${expressions[name]})` },
            [],
            catalog.domains,
          )!
          expect(plan.expression.kind, name + '_' + form).not.toBe('uncertain')
          return {
            expression: plan.expression,
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: name + '_' + form,
            },
          }
        }),
      ),
    )
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        fixtureNames[index] + (check.kind === 'unsupported' ? ': ' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const record = (name: string, row: Row, expected: Outcome) => {
      for (const form of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + form, row: { ...row }, expected })
    }
    const oracle = async (name: string, row: Row) => {
      const value = (
        await pg.query<{ value: boolean | null }>(
          `SELECT (${expressions[name]}) value FROM (SELECT $1::stored_amount amount,$2::bytea recorded_payload,$3::bytea backup,$4::boolean skip) candidate`,
          Object.keys(columns).map((column) => {
            const value = row[column]
            if (value?.kind !== 'Value') return null
            return columns[column] === 'bytea'
              ? Buffer.from(String(value.value), 'hex')
              : value.value
          }),
        )
      ).rows[0]!.value
      record(name, row, { kind: value === null ? 'Null' : value ? 'True' : 'False' })
    }
    const known: Row = {
      amount: input('1'),
      recorded_payload: input('00010000000000000001'),
      backup: input(null),
      skip: input(false),
    }
    for (const amount of [
      '0',
      '-0',
      '0.0000',
      '1',
      '-1',
      '9999',
      '10000',
      '10001',
      '99999.99999',
      '.1',
      '.01',
      '.001',
      '.0001',
      '.00001',
      '1.00000',
      '1.23000',
      '-1.23000',
      '1234.56789',
      '1_000.0_01e-1',
      '  +00123.4500  ',
      '1e131071',
      '1e-16383',
      '0e131071',
      '0e-16383',
      'NaN',
      'Infinity',
      '-Infinity',
      ...Array.from(
        { length: 100 },
        (_, index) =>
          `${index * 991 - 49381}.${String(index * 137).padStart(6, '0')}e${(index % 17) - 8}`,
      ),
    ]) {
      const wire = (
        await pg.query<{ wire: string }>("SELECT encode(numeric_send($1::numeric),'hex') wire", [
          amount,
        ])
      ).rows[0]!.wire
      const row = { ...known, amount: input(amount), recorded_payload: input(wire) }
      for (const name of names) await oracle(name, row)
      await oracle('send', { ...row, recorded_payload: input(wire + '00') })
    }
    for (const row of [
      known,
      { ...known, amount: input(null) },
      { ...known, recorded_payload: input(null) },
      { ...known, skip: input(true), backup: known.recorded_payload! },
    ])
      for (const name of names) await oracle(name, row)
    const unknown: Input = { kind: 'Unknown' },
      error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    record('send', { ...known, amount: unknown }, { kind: 'Unknown' })
    record('send', { ...known, amount: error }, error as Outcome)
    record('send', { ...known, amount: unknown, recorded_payload: error }, error as Outcome)
    record('lazy', { ...known, amount: error, skip: input(true) }, { kind: 'True' })
    record(
      'selected',
      { ...known, amount: error, skip: input(true), backup: known.recorded_payload! },
      { kind: 'True' },
    )
    record(
      'defaulted',
      { ...known, amount: error, backup: known.recorded_payload! },
      { kind: 'True' },
    )
    for (const kind of ['True', 'False', 'Null', 'Unknown', 'Error'])
      expect(
        fixtures.some((f) => f.name === 'send_raw' && f.expected.kind === kind),
        'send: ' + kind,
      ).toBe(true)
    await runCheckParity(directory, 'numericsend', group, fixtureNames, fixtures)
  }, 240000)
})
