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
  hash4: 'hashinet(a) = expected4',
  hash8: 'hashinetextended(a,seed) = expected8',
  hash_cidr: 'hashinet(c) = expected4',
  hash_cidr8: 'hashinetextended(c,seed) = expected8',
  lazy: 'CASE WHEN skip THEN true ELSE hashinetextended(a,seed) = expected8 END',
  coalesce: 'COALESCE(hashinet(a), expected4) = expected4',
}
const input = (value: string | number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})

describe('portable PostgreSQL network hashes', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-network-hash-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('matches exact PGlite integer hashes, seeds, prefixes and value states in all targets', async () => {
    await pg.exec(`CREATE TABLE network_hashes(a inet,c cidr,seed bigint,expected4 integer,expected8 bigint,skip boolean,
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')});`)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'network_hashes')!
    const names = Object.keys(expressions)
    const fixtureNames = names.flatMap((name) => ['raw', 'stored'].map((form) => name + '_' + form))
    const group = prepareCheckRustGroup(
      names.flatMap((name) =>
        ['raw', 'stored'].map((form) => ({
          expression: lowerTableCheck(
            table,
            form === 'stored'
              ? table.constraints.find((c) => c.name === name)!
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
    expect(group.checks.filter((check) => check.kind !== 'supported')).toEqual([])
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const unknownRow: Row = Object.fromEntries(
      table.columns.map((c) => [c.name, { kind: 'Unknown' }]),
    )
    const record = (name: string, row: Row, expected: Outcome) => {
      for (const form of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + form, row: { ...unknownRow, ...row }, expected })
    }
    const candidate =
      '(SELECT $1::inet a,$2::cidr c,$3::bigint seed,$4::integer expected4,$5::bigint expected8,$6::boolean skip) candidate'
    const oracle = async (name: string, row: Row) => {
      const parameters = ['a', 'c', 'seed', 'expected4', 'expected8', 'skip'].map((key) => {
        const value = row[key]
        return value?.kind === 'Value'
          ? typeof value.value === 'bigint'
            ? value.value.toString()
            : value.value
          : null
      })
      const value = (
        await pg.query<{ value: boolean | null }>(
          `SELECT (${expressions[name]}) value FROM ${candidate}`,
          parameters,
        )
      ).rows[0]!.value
      record(name, row, outcome(value))
    }
    const addresses: (string | null)[] = [
      null,
      '0.0.0.0/0',
      '0.0.0.0',
      '10.1.2.3/8',
      '10.1.2.3/24',
      '10.1.2.3',
      '255.255.255.255',
      '::/0',
      '::',
      '::1',
      '::ffff:192.0.2.1/120',
      '2001:db8::1/32',
      '2001:db8::1/65',
      'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
    ]
    for (let prefix = 0; prefix <= 32; prefix++) addresses.push(`165.90.195.60/${prefix}`)
    for (let prefix = 0; prefix <= 128; prefix++)
      addresses.push(`a55a:c33c:9669:f00f:5aa5:3cc3:6996:ff0/${prefix}`)
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
      -9223372036854775807n,
    ]
    for (const a of addresses)
      for (const seed of seeds) {
        const reference = (
          await pg.query<{
            c: string | null
            hash4: number | null
            hash8: string | null
            cidr4: number | null
            cidr8: string | null
          }>(
            'SELECT network($1::inet)::text c,hashinet($1::inet) hash4,hashinetextended($1::inet,$2::bigint)::text hash8,hashinet(network($1::inet)) cidr4,hashinetextended(network($1::inet),$2::bigint)::text cidr8',
            [a, seed?.toString() ?? null],
          )
        ).rows[0]!
        const row = {
          a: input(a),
          c: input(reference.c),
          seed: input(seed),
          expected4: input(reference.hash4),
          expected8: input(reference.hash8 === null ? null : BigInt(reference.hash8)),
          skip: input(false),
        }
        for (const name of names) await oracle(name, row)
        await oracle('hash4', { ...row, expected4: input(reference.hash4 === 0 ? 1 : 0) })
        await oracle('hash8', { ...row, expected8: input(reference.hash8 === '0' ? 1n : 0n) })
        await oracle('hash_cidr', { ...row, expected4: input(reference.cidr4) })
        await oracle('hash_cidr8', {
          ...row,
          expected8: input(reference.cidr8 === null ? null : BigInt(reference.cidr8)),
        })
      }
    const error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    const otherError: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    const known: Row = {
      a: input('10.1.2.3'),
      c: input('10.0.0.0/8'),
      seed: input(0n),
      expected4: input(0),
      expected8: input(0n),
      skip: input(false),
    }
    for (const value of [{ kind: 'Unknown' } as Input, { kind: 'Null' } as Input, error]) {
      record('hash4', { ...known, a: value }, value as Outcome)
      for (const name of ['hash8', 'hash_cidr8']) {
        const column = name === 'hash8' ? 'a' : 'c'
        record(name, { ...known, [column]: value }, value as Outcome)
        record(name, { ...known, seed: value }, value as Outcome)
        record(
          name,
          { ...known, [column]: value, seed: otherError },
          value.kind === 'Error' ? error : otherError,
        )
        record(
          name,
          { ...known, [column]: { kind: 'Unknown' }, seed: input(null) },
          { kind: 'Unknown' },
        )
      }
      record('lazy', { ...known, a: value, seed: otherError, skip: input(true) }, { kind: 'True' })
    }
    await runCheckParity(directory, 'networkhash', group, fixtureNames, fixtures)
  }, 180000)
})
