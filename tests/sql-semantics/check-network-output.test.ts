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

const input = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const expressions: Record<string, string> = {
  host: 'host(a) = expected_host',
  show: 'text(a) = expected_show',
  cast: 'a::text = expected_show',
  cidr_cast: 'c::text = expected_cidrshow',
  abbrev: 'abbrev(a) = expected_abbrev',
  cidr: 'abbrev(c) = expected_cidr',
  wire: 'inet_send(a) = expected_wire',
  cidrwire: 'cidr_send(c) = expected_cidrwire',
  literal: "inet_send(a) = '\\x022000040a010203'::bytea",
  lazy: 'CASE WHEN skip THEN true ELSE host(a) = expected_host AND inet_send(a) = expected_wire END',
  coalesce: "COALESCE(inet_send(a), '\\x'::bytea) = expected_wire",
  scalar_case: 'CASE WHEN skip THEN expected_wire ELSE inet_send(a) END = expected_wire',
  reused_text:
    "host(a) = expected_host AND expected_host = COALESCE(expected_host, 'fallback') AND length(expected_host) > 0",
}

describe('portable PostgreSQL network output', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-network-output-'))
  })
  afterAll(async () => {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  })
  it('matches PGlite formatting and binary bytes through owned values in all targets', async () => {
    await pg.exec(`CREATE TABLE outputs (
      a inet,c cidr,skip boolean,
      expected_host text COLLATE "C",expected_show text COLLATE "C",expected_abbrev text COLLATE "C",expected_cidr text COLLATE "C",expected_cidrshow text COLLATE "C",
      expected_wire bytea,expected_cidrwire bytea,
      ${Object.entries(expressions)
        .map(([name, expression]) => `CONSTRAINT "${name}" CHECK (${expression})`)
        .join(',')}
    )`)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'outputs')!
    const names = Object.keys(expressions)
    const fixtureNames = names.flatMap((name) => [name, name + '_stored'])
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
    expect(group.checks.map((check) => check.kind)).toEqual(fixtureNames.map(() => 'supported'))
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const record = (name: string, row: Row, expected: Outcome) => {
      fixtures.push({ name, row, expected }, { name: name + '_stored', row, expected })
    }
    const oracle = async (name: string, row: Row) => {
      const columns = Object.keys(row)
      const casts: Record<string, string> = {
        a: 'inet',
        c: 'cidr',
        skip: 'boolean',
        expected_wire: 'bytea',
        expected_cidrwire: 'bytea',
      }
      const result = (
        await pg.query<{ result: boolean | null }>(
          `SELECT (${expressions[name]}) result FROM (SELECT ${columns.map((column, index) => `$${index + 1}::${casts[column] ?? 'text'}${column.startsWith('expected_') && !casts[column] ? ' COLLATE "C"' : ''} AS "${column}"`).join(',')}) row`,
          columns.map((column) => {
            const value = row[column]!
            return value.kind === 'Value'
              ? casts[column] === 'bytea'
                ? Buffer.from(String(value.value), 'hex')
                : value.value
              : null
          }),
        )
      ).rows[0]!.result
      record(name, row, { kind: result === null ? 'Null' : result ? 'True' : 'False' })
    }
    const addresses: (string | null)[] = [
      null,
      '0.0.0.0/0',
      '10.1.2.3',
      '255.255.255.255',
      '::',
      '::1',
      '::2',
      '::100',
      '::ffff:192.0.2.1',
      '::192.0.2.1',
      '1:0:0:2:0:0:3:4',
      '1:2:3:4:5:6:7:8',
      '1:2:3:4:5:6:7:0',
      '1:0:2:0:3:0:4:0',
    ]
    for (let prefix = 0; prefix <= 32; prefix++) addresses.push(`165.90.195.60/${prefix}`)
    for (let prefix = 0; prefix <= 128; prefix++) {
      addresses.push(
        `2001:db8:0:0:abcd:0:0:1/${prefix}`,
        `::ffff:192.0.2.129/${prefix}`,
        `::192.0.2.129/${prefix}`,
      )
    }
    for (const a of addresses) {
      const reference = (
        await pg.query<{
          c: string | null
          host: string | null
          show: string | null
          abbrev: string | null
          cidr: string | null
          wire: string | null
          cidrwire: string | null
        }>(
          "SELECT network($1::inet)::text c,host($1::inet) host,text($1::inet) show,abbrev($1::inet) abbrev,abbrev(network($1::inet)) cidr,encode(inet_send($1::inet),'hex') wire,encode(cidr_send(network($1::inet)),'hex') cidrwire",
          [a],
        )
      ).rows[0]!
      const row: Row = {
        a: input(a),
        c: input(reference.c),
        skip: input(false),
        expected_host: input(reference.host),
        expected_show: input(reference.show),
        expected_abbrev: input(reference.abbrev),
        expected_cidr: input(reference.cidr),
        expected_cidrshow: input(reference.c),
        expected_wire: input(reference.wire),
        expected_cidrwire: input(reference.cidrwire),
      }
      for (const name of names) await oracle(name, row)
      for (const [name, column] of [
        ['host', 'expected_host'],
        ['show', 'expected_show'],
        ['abbrev', 'expected_abbrev'],
        ['cidr', 'expected_cidr'],
        ['wire', 'expected_wire'],
        ['cidrwire', 'expected_cidrwire'],
      ]) {
        await oracle(name!, { ...row, [column!]: input(column!.endsWith('wire') ? '00' : 'wrong') })
      }
    }
    const known: Row = {
      a: input('10.1.2.3'),
      c: input('10.0.0.0/8'),
      skip: input(false),
      expected_host: input('10.1.2.3'),
      expected_show: input('10.1.2.3/32'),
      expected_abbrev: input('10.1.2.3'),
      expected_cidr: input('10/8'),
      expected_cidrshow: input('10.0.0.0/8'),
      expected_wire: input('022000040a010203'),
      expected_cidrwire: input('020801040a000000'),
    }
    const error: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    for (const value of [{ kind: 'Unknown' } as Input, { kind: 'Null' } as Input, error]) {
      for (const name of ['host', 'show', 'abbrev', 'wire', 'cidr', 'cidrwire']) {
        record(name, { ...known, [name.startsWith('cidr') ? 'c' : 'a']: value }, value as Outcome)
      }
      record('lazy', { ...known, a: value, skip: input(true) }, { kind: 'True' })
      record('scalar_case', { ...known, a: value, skip: input(true) }, { kind: 'True' })
      record(
        'wire',
        { ...known, a: value, expected_wire: error },
        value.kind === 'Error' ? value : error,
      )
    }
    record('wire', { ...known, expected_wire: input('022000040A010203') }, { kind: 'True' })
    for (const hex of ['0', 'not-hex', '\\x00'])
      record('wire', { ...known, expected_wire: input(hex) }, { kind: 'Unknown' })
    await runCheckParity(directory, 'networkoutput', group, fixtureNames, fixtures)
  }, 180000)
})
