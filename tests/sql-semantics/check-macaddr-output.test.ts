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
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const expressions: Record<string, string> = {
  text6: 'a::text = expected_text6',
  text8: 'd::text = expected_text8',
  functional6: 'text(a) = expected_text6',
  functional8: 'text(d) = expected_text8',
  wire6: 'macaddr_send(a) = expected_wire6',
  wire8: 'macaddr8_send(d) = expected_wire8',
  hash6: 'hashmacaddr(a) = expected_hash6',
  hash8: 'hashmacaddr8(d) = expected_hash8',
  seeded6: 'hashmacaddrextended(a,seed) = expected_seeded6',
  seeded8: 'hashmacaddr8extended(d,seed) = expected_seeded8',
  zero6: 'hashmacaddrextended(a,0) = expected_zero6',
  zero8: 'hashmacaddr8extended(d,0) = expected_zero8',
  roundtrip6: '(a::text)::macaddr = a',
  roundtrip8: 'macaddr8(text(d)) = d',
  coalesce_text: "COALESCE(a::text,'fallback') = COALESCE(expected_text6,'fallback')",
  coalesce_wire: "COALESCE(macaddr8_send(d),'\\x'::bytea) = COALESCE(expected_wire8,'\\x'::bytea)",
  scalar_case: 'CASE WHEN skip THEN expected_text8 ELSE d::text END = expected_text8',
  lazy: 'CASE WHEN skip THEN true ELSE hashmacaddrextended(a,seed) = expected_seeded6 END',
  reused: 'text(a) = expected_text6 AND expected_text6 = a::text',
  error6: 'hashmacaddrextended(raw::macaddr,seed) = expected_seeded6',
  error8: 'macaddr8_send(raw::macaddr8) = expected_wire8',
  error_text: '(raw::macaddr)::text = expected_text6',
}
const input = (value: string | number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const columns: Record<string, string> = {
  a: 'short_address',
  d: 'long_address',
  seed: 'bigint',
  skip: 'bool',
  raw: 'text',
  expected_text6: 'text COLLATE "C"',
  expected_text8: 'text COLLATE "C"',
  expected_wire6: 'bytea',
  expected_wire8: 'bytea',
  expected_hash6: 'integer',
  expected_hash8: 'integer',
  expected_seeded6: 'bigint',
  expected_seeded8: 'bigint',
  expected_zero6: 'bigint',
  expected_zero8: 'bigint',
}

describe('Rust CHECK MAC output and hashes', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-mac-output-'))
    await pg.exec(`CREATE DOMAIN short_address AS macaddr; CREATE DOMAIN long_address AS macaddr8;
      CREATE TABLE hardware_outputs(${Object.entries(columns)
        .map(([name, type]) => `${name} ${type}`)
        .join(',')},
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
        .join(',')})`)
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('matches PostgreSQL byte order, canonical text, seeded hashes and lazy errors in all targets', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'hardware_outputs')!
    const names = Object.keys(expressions)
    const fixtureNames = names.flatMap((name) => ['raw', 'stored'].map((form) => name + '_' + form))
    const group = prepareCheckRustGroup(
      names.flatMap((name) =>
        ['raw', 'stored'].map((form) => ({
          expression: lowerTableCheck(
            table,
            form === 'stored'
              ? table.constraints.find((check) => check.name === name)!
              : { name, type: 'check', definition: `CHECK (${expressions[name]})` },
            [],
            catalog.domains,
          )!.expression,
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: name + '_' + form,
          },
        })),
      ),
    )
    for (const [index, check] of group.checks.entries())
      expect(check.kind, fixtureNames[index]).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const unknownRow: Row = Object.fromEntries(
      Object.keys(columns).map((name) => [name, { kind: 'Unknown' }]),
    )
    const record = (name: string, row: Row, expected: Outcome) => {
      for (const form of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + form, row: { ...unknownRow, ...row }, expected })
    }
    const oracle = async (name: string, row: Row) => {
      const keys = Object.keys(columns)
      let expected: Outcome
      try {
        const value = (
          await pg.query<{ value: boolean | null }>(
            `SELECT (${expressions[name]}) value FROM (SELECT ${keys.map((key, index) => `$${index + 1}::${columns[key]} AS ${key}`).join(',')}) candidate`,
            keys.map((key) => {
              const value = row[key]
              if (value?.kind !== 'Value') return null
              return columns[key] === 'bytea'
                ? Buffer.from(String(value.value), 'hex')
                : typeof value.value === 'bigint'
                  ? value.value.toString()
                  : value.value
            }),
          )
        ).rows[0]!.value
        expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
      } catch (error) {
        expected = {
          kind: 'Error',
          value: { state: parseInt((error as { code: string }).code, 36) },
        }
      }
      record(name, row, expected)
    }
    const addresses: (string | null)[] = [
      null,
      '00:00:00:00:00:00',
      'ff:ff:ff:ff:ff:ff',
      '08:00:2B:01:02:03',
      '0800.2b01.0203',
      'aa:55:80:01:0f:f0',
    ]
    for (let position = 0; position < 6; position++)
      for (const byte of [1, 15, 16, 127, 128, 255]) {
        const bytes = Array<string>(6).fill('00')
        bytes[position] = byte.toString(16).padStart(2, '0')
        addresses.push(bytes.join(':'))
      }
    const seeds = [
      null,
      0n,
      1n,
      -1n,
      4294967295n,
      4294967296n,
      4294967297n,
      -4294967297n,
      9223372036854775807n,
      -9223372036854775808n,
    ]
    let base: Row = {}
    for (const [index, a] of addresses.entries())
      for (const seed of seeds) {
        const d = a === null ? null : index % 2 ? a : '01:23:45:67:89:ab:cd:ef'
        const ref = (
          await pg.query<Record<string, string | number | null>>(
            `SELECT
        $1::macaddr::text expected_text6,$2::macaddr8::text expected_text8,
        encode(macaddr_send($1::macaddr),'hex') expected_wire6,encode(macaddr8_send($2::macaddr8),'hex') expected_wire8,
        hashmacaddr($1::macaddr) expected_hash6,hashmacaddr8($2::macaddr8) expected_hash8,
        hashmacaddrextended($1::macaddr,$3::bigint)::text expected_seeded6,hashmacaddr8extended($2::macaddr8,$3::bigint)::text expected_seeded8,
        hashmacaddrextended($1::macaddr,0)::text expected_zero6,hashmacaddr8extended($2::macaddr8,0)::text expected_zero8`,
            [a, d, seed?.toString() ?? null],
          )
        ).rows[0]!
        const row: Row = {
          a: input(a),
          d: input(d),
          seed: input(seed),
          skip: input(false),
          raw: input(a),
        }
        for (const [key, value] of Object.entries(ref))
          row[key] = input(value !== null && columns[key] === 'bigint' ? BigInt(value) : value)
        for (const name of names) await oracle(name, row)
        if (a !== null && seed === 1n) base = row
      }
    const mismatches: Record<string, string> = {
      text6: 'expected_text6',
      text8: 'expected_text8',
      functional6: 'expected_text6',
      functional8: 'expected_text8',
      wire6: 'expected_wire6',
      wire8: 'expected_wire8',
      hash6: 'expected_hash6',
      hash8: 'expected_hash8',
      seeded6: 'expected_seeded6',
      seeded8: 'expected_seeded8',
      zero6: 'expected_zero6',
      zero8: 'expected_zero8',
      coalesce_text: 'expected_text6',
      coalesce_wire: 'expected_wire8',
      scalar_case: 'expected_text8',
      lazy: 'expected_seeded6',
      reused: 'expected_text6',
      error6: 'expected_seeded6',
      error8: 'expected_wire8',
      error_text: 'expected_text6',
    }
    for (const [name, column] of Object.entries(mismatches)) {
      const wrong =
        columns[column] === 'bytea'
          ? ''
          : columns[column] === 'bigint'
            ? 0n
            : columns[column] === 'integer'
              ? 0
              : 'WRONG'
      await oracle(name, { ...base, [column]: input(wrong) })
      await oracle(name, { ...base, [column]: input(null) })
    }
    const error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    const other: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    for (const [name, column] of Object.entries({
      text6: 'a',
      functional6: 'a',
      wire6: 'a',
      hash6: 'a',
      seeded6: 'a',
      zero6: 'a',
      text8: 'd',
      functional8: 'd',
      wire8: 'd',
      hash8: 'd',
      seeded8: 'd',
      zero8: 'd',
    })) {
      record(name, { ...base, [column]: { kind: 'Unknown' } }, { kind: 'Unknown' })
      record(name, { ...base, [column]: error }, error as Outcome)
      record(name, { ...base, [column]: input(null) }, { kind: 'Null' })
      record(name, { ...base, [column]: input('garbage') }, { kind: 'Unknown' })
    }
    for (const name of ['seeded6', 'seeded8']) {
      const column = name === 'seeded6' ? 'a' : 'd'
      record(name, { ...base, [column]: error, seed: other }, error as Outcome)
      record(name, { ...base, [column]: { kind: 'Unknown' }, seed: error }, error as Outcome)
      record(name, { ...base, [column]: input(null), seed: error }, error as Outcome)
      record(name, { ...base, seed: { kind: 'Unknown' } }, { kind: 'Unknown' })
    }
    for (const name of ['error6', 'error8', 'error_text'])
      await oracle(name, { ...base, raw: input('garbage') })
    await oracle('error_text', { ...base, raw: input('100:00:00:00:00:00') })
    record('lazy', { ...base, skip: input(true), a: error, seed: other }, { kind: 'True' })
    record('scalar_case', { ...base, skip: input(true), d: error }, { kind: 'True' })
    for (const name of names) {
      for (const kind of name.startsWith('roundtrip')
        ? ['True', 'Null']
        : name.startsWith('coalesce')
          ? ['True', 'False']
          : ['True', 'False', 'Null'])
        expect(
          fixtures.some(
            (fixture) => fixture.name === name + '_raw' && fixture.expected.kind === kind,
          ),
          `${name}: ${kind}`,
        ).toBe(true)
    }
    await runCheckParity(directory, 'macoutput', group, fixtureNames, fixtures)
  }, 180000)
})
