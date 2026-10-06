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
  timestamp: 'uuid_extract_timestamp(identifier) = recorded_at',
  timestamp_null: '(uuid_extract_timestamp(identifier) IS NULL) = (recorded_at IS NULL)',
  timestamp_default:
    "COALESCE(uuid_extract_timestamp(identifier),'-infinity'::timestamptz) = COALESCE(recorded_at,'-infinity'::timestamptz)",
  timestamp_after: "uuid_extract_timestamp(identifier) >= '2000-01-01 00:00:00+00'::timestamptz",
  timestamp_between: 'uuid_extract_timestamp(identifier) BETWEEN recorded_at AND recorded_at',
  timestamp_selected:
    '(CASE WHEN skip THEN recorded_at ELSE uuid_extract_timestamp(identifier) END) = recorded_at',
  timestamp_recognized:
    'CASE uuid_extract_timestamp(identifier) WHEN recorded_at THEN true ELSE recorded_at IS NULL END',
  timestamp_reused:
    'uuid_extract_timestamp(identifier) = recorded_at AND uuid_extract_timestamp(identifier) = recorded_at',
  parsed: 'uuid_extract_timestamp(raw::uuid) = recorded_at',
  lazy: 'CASE WHEN skip THEN true ELSE uuid_extract_timestamp(raw::uuid) = recorded_at END',
}
const columns: Record<string, string> = {
  identifier: 'installed_identifier',
  raw: 'text',
  recorded_at: 'device_instant',
  skip: 'boolean',
}
const input = (value: string | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const uuid1 = (ticks: bigint, tail = '8000-000000000000'): string => {
  const hex = ticks.toString(16).padStart(15, '0')
  return `${hex.slice(7)}-${hex.slice(3, 7)}-1${hex.slice(0, 3)}-${tail}`
}
const uuid7 = (milliseconds: bigint, tail = '7000-8000-000000000000'): string => {
  const hex = milliseconds.toString(16).padStart(12, '0')
  return `${hex.slice(0, 8)}-${hex.slice(8)}-${tail}`
}

describe('Rust CHECK UUID timestamp extraction', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-uuid-timestamp-'))
    await pg.exec(`SET timezone='UTC'; CREATE DOMAIN device_identifier AS uuid;
      CREATE DOMAIN installed_identifier AS device_identifier; CREATE DOMAIN device_instant AS timestamptz;
      CREATE TABLE identifier_times(${Object.entries(columns)
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
  it('matches PostgreSQL epochs, tick truncation, extreme timestamps, versions, variants and lazy errors in every target', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'identifier_times')!
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
    const record = (name: string, row: Row, expected: Outcome) => {
      for (const form of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + form, row, expected })
    }
    const oracle = async (name: string, row: Row, recordedAt: string | null) => {
      let expected: Outcome
      try {
        const value = (
          await pg.query<{ value: boolean | null }>(
            `SELECT (${expressions[name]}) value FROM (SELECT $1::installed_identifier identifier,$2::text raw,$3::device_instant recorded_at,$4::bool skip) candidate`,
            [
              row.identifier.kind === 'Value' ? row.identifier.value : null,
              row.raw.kind === 'Value' ? row.raw.value : null,
              recordedAt,
              row.skip.kind === 'Value' ? row.skip.value : null,
            ],
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
    const identifiers: (string | null)[] = [
      null,
      '00000000-0000-0000-0000-000000000000',
      'ffffffff-ffff-ffff-ffff-ffffffffffff',
    ]
    const gregorianTicks = 131659776000000000n
    for (const ticks of [
      0n,
      1n,
      9n,
      10n,
      11n,
      19n,
      20n,
      4294967295n,
      4294967296n,
      281474976710655n,
      281474976710656n,
      1152921504606846975n,
      ...[-11n, -10n, -9n, -1n, 0n, 1n, 9n, 10n, 11n].map((delta) => gregorianTicks + delta),
    ])
      identifiers.push(uuid1(ticks))
    for (const milliseconds of [
      0n,
      1n,
      65535n,
      65536n,
      4294967295n,
      4294967296n,
      946684799999n,
      946684800000n,
      946684800001n,
      1700000000123n,
      281474976710655n,
    ]) {
      identifiers.push(uuid7(milliseconds))
      identifiers.push(uuid7(milliseconds, '7fff-bfff-ffffffffffff'))
    }
    for (let version = 0; version < 16; version++)
      for (const variant of [0, 63, 64, 127, 128, 129, 191, 192, 255])
        identifiers.push(
          `01234567-89ab-${version.toString(16)}def-${variant.toString(16).padStart(2, '0')}23-456789abcdef`,
        )
    identifiers.push('{01-8B-CF-E5-68-7B-7F-FF-BF-FF-FF-FF-FF-FF-FF-FF}'.replaceAll('-', ''))
    const extracted = new Map<string | null, bigint | null>()
    let base: Row = {}
    let baseText: string | null = null
    for (const identifier of identifiers) {
      const ref = (
        await pg.query<{ binary: string | null; text: string | null }>(
          "SELECT encode(timestamptz_send(uuid_extract_timestamp($1::uuid)),'hex') binary,uuid_extract_timestamp($1::uuid)::text text",
          [identifier],
        )
      ).rows[0]!
      const microseconds =
        ref.binary === null ? null : Buffer.from(ref.binary, 'hex').readBigInt64BE()
      extracted.set(identifier, microseconds)
      const row: Row = {
        identifier: input(identifier),
        raw: input(identifier),
        recorded_at: input(microseconds),
        skip: input(false),
      }
      for (const name of names) await oracle(name, row, ref.text)
      if (identifier === uuid1(gregorianTicks)) {
        base = row
        baseText = ref.text
      }
      expect(microseconds === null, String(identifier)).toBe(
        identifier === null ||
          !['1', '7'].includes(identifier.replace(/[{}-]/g, '')[12]!) ||
          !['8', '9', 'a', 'b', 'B'].includes(identifier.replace(/[{}-]/g, '')[16]!),
      )
    }
    expect(extracted.get(uuid1(0n))).toBe(-13165977600000000n)
    expect(extracted.get(uuid1(gregorianTicks - 1n))).toBe(-1n)
    expect(extracted.get(uuid1(gregorianTicks + 9n))).toBe(0n)
    expect(extracted.get(uuid1(gregorianTicks + 10n))).toBe(1n)
    expect(extracted.get(uuid1(1152921504606846975n))).toBe(102126172860684697n)
    expect(extracted.get(uuid7(0n))).toBe(-946684800000000n)
    expect(extracted.get(uuid7(946684800000n))).toBe(0n)
    expect(extracted.get(uuid7(281474976710655n))).toBe(280528291910655000n)
    for (const name of names) {
      await oracle(name, { ...base, recorded_at: input(1n) }, '2000-01-01 00:00:00.000001+00')
      await oracle(name, { ...base, recorded_at: input(null) }, null)
    }
    const error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    const other: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    for (const name of [
      'timestamp',
      'timestamp_null',
      'timestamp_default',
      'timestamp_after',
      'timestamp_between',
    ]) {
      record(name, { ...base, identifier: error }, error as Outcome)
      record(name, { ...base, identifier: { kind: 'Unknown' } }, { kind: 'Unknown' })
      record(name, { ...base, identifier: input('malformed') }, { kind: 'Unknown' })
    }
    record('timestamp', { ...base, identifier: error, recorded_at: other }, error as Outcome)
    record(
      'timestamp',
      { ...base, identifier: { kind: 'Unknown' }, recorded_at: other },
      other as Outcome,
    )
    record('timestamp', { ...base, identifier: input(null), recorded_at: other }, other as Outcome)
    record(
      'timestamp_selected',
      { ...base, identifier: error, skip: input(true) },
      { kind: 'True' },
    )
    record('lazy', { ...base, raw: error, skip: input(true) }, { kind: 'True' })
    await oracle('parsed', { ...base, raw: input('not-a-uuid') }, baseText)
    await oracle('lazy', { ...base, raw: input('not-a-uuid') }, baseText)
    await oracle('lazy', { ...base, raw: input('not-a-uuid'), skip: input(true) }, baseText)
    for (const name of ['parsed', 'lazy']) {
      record(name, { ...base, raw: error }, error as Outcome)
      record(name, { ...base, raw: { kind: 'Unknown' } }, { kind: 'Unknown' })
    }
    for (const name of names) {
      for (const kind of ['True', 'False'])
        expect(
          fixtures.some(
            (fixture) => fixture.name === name + '_raw' && fixture.expected.kind === kind,
          ),
          name + ': ' + kind,
        ).toBe(true)
      if (!['timestamp_null', 'timestamp_default', 'timestamp_recognized'].includes(name))
        expect(
          fixtures.some(
            (fixture) => fixture.name === name + '_raw' && fixture.expected.kind === 'Null',
          ),
          name + ': Null',
        ).toBe(true)
    }
    await runCheckParity(directory, 'uuidtimestamp', group, fixtureNames, fixtures)
  }, 180000)
})
