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
  wire: 'uuid_send(identifier) = expected_wire',
  hash: 'uuid_hash(identifier) = expected_hash',
  seeded: 'uuid_hash_extended(identifier,seed) = expected_seeded',
  zero: 'uuid_hash_extended(identifier,0) = expected_zero',
  version: 'uuid_extract_version(identifier) = expected_version',
  version_null: '(uuid_extract_version(identifier) IS NULL) = (expected_version IS NULL)',
  version_default:
    'COALESCE(uuid_extract_version(identifier),-1::smallint) = COALESCE(expected_version,-1::smallint)',
  wire_default:
    "COALESCE(uuid_send(identifier),'\\x'::bytea) = COALESCE(expected_wire,'\\x'::bytea)",
  selected_wire:
    '(CASE WHEN skip THEN expected_wire ELSE uuid_send(identifier) END) = expected_wire',
  selected_version:
    '(CASE WHEN skip THEN expected_version ELSE uuid_extract_version(identifier) END) = expected_version',
  lazy: 'CASE WHEN skip THEN true ELSE uuid_hash_extended(identifier,seed) = expected_seeded END',
  reused: 'uuid_send(identifier) = expected_wire AND uuid_send(identifier) = expected_wire',
  parsed_wire: 'uuid_send(raw::uuid) = expected_wire',
  parsed_hash: 'uuid_hash(raw::uuid) = expected_hash',
  parsed_seeded: 'uuid_hash_extended(raw::uuid,seed) = expected_seeded',
  parsed_version: 'uuid_extract_version(raw::uuid) = expected_version',
}
const columns: Record<string, string> = {
  identifier: 'installed_identifier',
  raw: 'text',
  seed: 'bigint',
  skip: 'boolean',
  expected_wire: 'bytea',
  expected_hash: 'integer',
  expected_seeded: 'bigint',
  expected_zero: 'bigint',
  expected_version: 'smallint',
}
const input = (value: string | number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

describe('Rust CHECK UUID output and inspection', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-uuid-output-'))
    await pg.exec(`CREATE DOMAIN device_identifier AS uuid; CREATE DOMAIN installed_identifier AS device_identifier;
      CREATE TABLE identifier_outputs(${Object.entries(columns)
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
  it('matches PostgreSQL raw bytes, hash seeds, every version and variant, and lazy errors in all targets', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'identifier_outputs')!
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
      let expected: Outcome
      try {
        const value = (
          await pg.query<{ value: boolean | null }>(
            `SELECT (${expressions[name]}) value FROM (SELECT ${Object.entries(columns)
              .map(([key, type], index) => `$${index + 1}::${type} ${key}`)
              .join(',')}) candidate`,
            Object.entries(columns).map(([key, type]) => {
              const value = row[key]
              return value?.kind !== 'Value'
                ? null
                : type === 'bytea'
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
    const identifiers: (string | null)[] = [
      null,
      '00000000-0000-0000-0000-000000000000',
      'ffffffff-ffff-ffff-ffff-ffffffffffff',
      '01234567-89ab-4def-8123-456789abcdef',
      '{0123456789AB7DEF8123456789ABCDEF}',
    ]
    for (let position = 0; position < 16; position++)
      for (const byte of [1, 15, 16, 127, 128, 255]) {
        const bytes = Array<string>(16).fill('00')
        bytes[position] = byte.toString(16).padStart(2, '0')
        identifiers.push(bytes.join(''))
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
    const makeRow = async (identifier: string | null, seed: bigint | null): Promise<Row> => {
      const ref = (
        await pg.query<Record<string, string | number | null>>(
          `SELECT encode(uuid_send($1::uuid),'hex') expected_wire,
        uuid_hash($1::uuid) expected_hash,uuid_hash_extended($1::uuid,$2::bigint)::text expected_seeded,
        uuid_hash_extended($1::uuid,0)::text expected_zero,uuid_extract_version($1::uuid) expected_version`,
          [identifier, seed?.toString() ?? null],
        )
      ).rows[0]!
      const row: Row = {
        identifier: input(identifier),
        raw: input(identifier),
        seed: input(seed),
        skip: input(false),
      }
      for (const [key, value] of Object.entries(ref))
        row[key] = input(value !== null && columns[key] === 'bigint' ? BigInt(value) : value)
      return row
    }
    for (const [index, identifier] of identifiers.entries())
      for (const seed of index < 5 ? seeds : [1n]) {
        const row = await makeRow(identifier, seed)
        for (const name of names) await oracle(name, row)
        if (identifier === '01234567-89ab-4def-8123-456789abcdef' && seed === 1n) base = row
      }
    for (let version = 0; version < 16; version++)
      for (const variant of [0, 63, 64, 127, 128, 129, 191, 192, 255]) {
        const text = `01234567-89ab-${version.toString(16)}def-${variant.toString(16).padStart(2, '0')}23-456789abcdef`
        const row = await makeRow(text, 1n)
        const actual = (
          await pg.query<{ version: number | null }>(
            'SELECT uuid_extract_version($1::uuid) version',
            [text],
          )
        ).rows[0]!.version
        expect(actual).toBe(variant >= 128 && variant <= 191 ? version : null)
        for (const name of [
          'version',
          'version_null',
          'version_default',
          'selected_version',
          'parsed_version',
        ])
          await oracle(name, row)
      }
    const mismatches: Record<string, string> = {
      wire: 'expected_wire',
      hash: 'expected_hash',
      seeded: 'expected_seeded',
      zero: 'expected_zero',
      version: 'expected_version',
      version_null: 'expected_version',
      version_default: 'expected_version',
      wire_default: 'expected_wire',
      selected_wire: 'expected_wire',
      selected_version: 'expected_version',
      lazy: 'expected_seeded',
      reused: 'expected_wire',
      parsed_wire: 'expected_wire',
      parsed_hash: 'expected_hash',
      parsed_seeded: 'expected_seeded',
      parsed_version: 'expected_version',
    }
    for (const [name, column] of Object.entries(mismatches)) {
      const wrong =
        columns[column] === 'bytea'
          ? ''
          : columns[column] === 'bigint'
            ? 0n
            : columns[column] === 'smallint'
              ? 7
              : 0
      await oracle(name, { ...base, [column]: input(name === 'version_null' ? null : wrong) })
      await oracle(name, { ...base, [column]: input(null) })
    }
    const error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    const other: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    for (const name of ['wire', 'hash', 'seeded', 'zero', 'version', 'version_null']) {
      record(name, { ...base, identifier: { kind: 'Unknown' } }, { kind: 'Unknown' })
      record(name, { ...base, identifier: error }, error as Outcome)
      record(name, { ...base, identifier: input('malformed') }, { kind: 'Unknown' })
    }
    record('seeded', { ...base, identifier: error, seed: other }, error as Outcome)
    for (const identifier of [{ kind: 'Unknown' }, { kind: 'Null' }] as Input[]) {
      record('seeded', { ...base, identifier, seed: error }, error as Outcome)
      record('seeded', { ...base, identifier, seed: { kind: 'Unknown' } }, { kind: 'Unknown' })
    }
    record('seeded', { ...base, seed: { kind: 'Unknown' } }, { kind: 'Unknown' })
    record('lazy', { ...base, skip: input(true), identifier: error, seed: other }, { kind: 'True' })
    record('selected_wire', { ...base, skip: input(true), identifier: error }, { kind: 'True' })
    record('selected_version', { ...base, skip: input(true), identifier: error }, { kind: 'True' })
    for (const name of ['parsed_wire', 'parsed_hash', 'parsed_seeded', 'parsed_version']) {
      await oracle(name, { ...base, raw: input('not-a-uuid') })
      record(name, { ...base, raw: { kind: 'Unknown' } }, { kind: 'Unknown' })
      record(name, { ...base, raw: error }, error as Outcome)
    }
    for (const name of names)
      for (const kind of name === 'version_null' ||
      name === 'version_default' ||
      name === 'wire_default'
        ? ['True', 'False']
        : ['True', 'False', 'Null'])
        expect(
          fixtures.some(
            (fixture) => fixture.name === name + '_raw' && fixture.expected.kind === kind,
          ),
          name + ': ' + kind,
        ).toBe(true)
    await runCheckParity(directory, 'uuidoutput', group, fixtureNames, fixtures)
  }, 180000)
})
