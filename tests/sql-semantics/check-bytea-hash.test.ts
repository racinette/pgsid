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

const columns: Record<string, string> = {
  a: 'stored_payload',
  seed: 'bigint',
  small_seed: 'integer',
  recorded_hash: 'integer',
  recorded_seeded: 'bigint',
  recorded_crc: 'bigint',
  recorded_crc_c: 'bigint',
  backup: 'bigint',
  skip: 'boolean',
}
const transforms: Record<string, { sql: string; expected: string }> = {
  hash: { sql: 'hashbytea(a)', expected: 'recorded_hash' },
  seeded: { sql: 'hashbyteaextended(a,seed)', expected: 'recorded_seeded' },
  promoted_seed: { sql: 'hashbyteaextended(a,small_seed)', expected: 'recorded_seeded' },
  crc: { sql: 'crc32(a)', expected: 'recorded_crc' },
  crc_c: { sql: 'crc32c(a)', expected: 'recorded_crc_c' },
}
const expressions: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(transforms).map(([name, operation]) => [
      name,
      `(${operation.sql}) = ${operation.expected}`,
    ]),
  ),
  reuses_input: 'hashbytea(a) = hashbytea(a) AND crc32(a) = crc32(a)',
  lazy: 'CASE WHEN skip THEN true ELSE hashbyteaextended(a,seed) = recorded_seeded END',
  selected: '(CASE WHEN skip THEN backup ELSE crc32(a) END) = recorded_crc',
  defaulted: 'COALESCE(backup,crc32c(a)) = recorded_crc_c',
  crc_unsigned:
    'crc32(a) >= 0 AND crc32(a) <= 4294967295 AND crc32c(a) >= 0 AND crc32c(a) <= 4294967295',
  empty_crc: "crc32('\\x'::bytea) = 0 AND crc32c('\\x'::bytea) = 0",
  reference_crc: "crc32('\\x313233343536373839'::bytea) = 3421780262",
  reference_crc_c: "crc32c('\\x313233343536373839'::bytea) = 3808858755",
}
const input = (value: string | number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

describe('Rust CHECK bytea hashes and checksums', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-bytea-hash-'))
    await pg.exec(`CREATE DOMAIN raw_payload AS bytea; CREATE DOMAIN stored_payload AS raw_payload;
      CREATE TABLE bytea_hash_checks (${Object.entries(columns)
        .map(([name, type]) => `${name} ${type}`)
        .join(',')},
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')})`)
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('matches Jenkins hashes, every seed bit, both CRC polynomials, domains and value states in Rust and both targets', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'bytea_hash_checks')!
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
    const candidate = `(SELECT ${Object.entries(columns)
      .map(([name, type], index) => `$${index + 1}::${type} ${name}`)
      .join(',')}) candidate`
    let executions = 0
    const execute = async (sql: string, row: Row) => {
      if (executions > 0 && executions % 500 === 0) {
        await pg.close()
        pg = await PGlite.create()
        await pg.exec(
          'CREATE DOMAIN raw_payload AS bytea; CREATE DOMAIN stored_payload AS raw_payload;',
        )
      }
      executions++
      return (
        await pg.query<{ value: string | number | boolean | null }>(
          `SELECT (${sql}) value FROM ${candidate}`,
          Object.keys(columns).map((name) =>
            row[name]?.kind !== 'Value'
              ? null
              : columns[name] === 'stored_payload'
                ? '\\x' + String(row[name].value)
                : typeof row[name].value === 'bigint'
                  ? String(row[name].value)
                  : row[name].value,
          ),
        )
      ).rows[0]!.value
    }
    const oracle = async (name: string, row: Row) => {
      const value = await execute(expressions[name]!, row)
      record(name, row, { kind: value === null ? 'Null' : value ? 'True' : 'False' })
    }
    const known: Row = {
      a: input('0080ff'),
      seed: input(0n),
      small_seed: input(0),
      recorded_hash: input(0),
      recorded_seeded: input(0n),
      recorded_crc: input(0n),
      recorded_crc_c: input(0n),
      backup: input(null),
      skip: input(false),
    }
    const falseNames = new Set<string>()
    const transform = async (name: string, row: Row) => {
      const operation = transforms[name]!
      const value = await execute(operation.sql, row)
      const expected =
        value === null
          ? null
          : operation.expected === 'recorded_hash'
            ? Number(value)
            : BigInt(value as string | number)
      await oracle(name, { ...row, [operation.expected]: input(expected) })
      if (value !== null && !falseNames.has(name)) {
        const wrong =
          operation.expected === 'recorded_hash'
            ? Number(value) === 0
              ? 1
              : 0
            : BigInt(value as string | number) === 0n
              ? 1n
              : 0n
        await oracle(name, { ...row, [operation.expected]: input(wrong) })
        falseNames.add(name)
      }
    }
    const values = [
      '',
      '00',
      'ff',
      '0080ff',
      '313233343536373839',
      '00'.repeat(12),
      'ff'.repeat(13),
      ...Array.from({ length: 256 }, (_, byte) => byte.toString(16).padStart(2, '0')),
      ...Array.from({ length: 40 }, (_, length) =>
        Array.from({ length }, (_, index) =>
          ((index * 137) % 256).toString(16).padStart(2, '0'),
        ).join(''),
      ),
    ]
    for (const bytes of values) {
      const row = { ...known, a: input(bytes) }
      for (const name of ['hash', 'crc', 'crc_c']) await transform(name, row)
      for (const name of ['reuses_input', 'crc_unsigned']) await oracle(name, row)
    }
    const seeds = [
      -9223372036854775808n,
      -9223372036854775807n,
      -4294967297n,
      -1n,
      0n,
      1n,
      4294967295n,
      4294967296n,
      9223372036854775807n,
      ...Array.from({ length: 63 }, (_, bit) => 1n << BigInt(bit)),
    ]
    for (const bytes of ['', '00', '0080ff', 'ff'.repeat(12), '0123456789abcdef00'])
      for (const seed of seeds)
        await transform('seeded', { ...known, a: input(bytes), seed: input(seed) })
    for (const smallSeed of [-2147483648, -1, 0, 1, 255, 2147483647])
      await transform('promoted_seed', { ...known, small_seed: input(smallSeed) })
    for (const row of [
      known,
      { ...known, a: input(null) },
      { ...known, seed: input(null), small_seed: input(null) },
      {
        ...known,
        recorded_hash: input(null),
        recorded_seeded: input(null),
        recorded_crc: input(null),
        recorded_crc_c: input(null),
      },
    ])
      for (const name of names) await oracle(name, row)
    const unknown: Input = { kind: 'Unknown' },
      error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } },
      other: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    for (const name of Object.keys(transforms)) {
      record(name, { ...known, a: unknown }, { kind: 'Unknown' })
      record(name, { ...known, a: error }, error as Outcome)
      record(name, { ...known, a: input('g0') }, { kind: 'Unknown' })
    }
    record('seeded', { ...known, a: error, seed: other }, error as Outcome)
    for (const value of [unknown, input(null)])
      record('seeded', { ...known, a: value, seed: error }, error as Outcome)
    record('seeded', { ...known, seed: unknown }, { kind: 'Unknown' })
    record('lazy', { ...known, a: error, skip: input(true) }, { kind: 'True' })
    record(
      'selected',
      { ...known, a: error, skip: input(true), backup: known.recorded_crc! },
      { kind: 'True' },
    )
    record('defaulted', { ...known, a: error, backup: known.recorded_crc_c! }, { kind: 'True' })
    for (const name of Object.keys(transforms))
      for (const kind of ['True', 'False', 'Null'])
        expect(
          fixtures.some((f) => f.name === name + '_raw' && f.expected.kind === kind),
          name + ': ' + kind,
        ).toBe(true)
    await runCheckParity(directory, 'byteahashchecks', group, fixtureNames, fixtures)
  }, 180000)
})
