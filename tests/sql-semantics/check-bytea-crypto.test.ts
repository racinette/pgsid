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
  packet: 'stored_payload',
  label: 'text COLLATE "C"',
  short_label: 'varchar COLLATE "C"',
  plain_label: 'text',
  recorded_md5: 'text COLLATE "C"',
  recorded_text_md5: 'text COLLATE "C"',
  recorded_sha224: 'bytea',
  recorded_sha256: 'bytea',
  recorded_sha384: 'bytea',
  recorded_sha512: 'bytea',
  backup: 'bytea',
  skip: 'boolean',
}
const transforms: Record<string, { sql: string; binary?: boolean }> = {
  md5: { sql: 'md5(packet)' },
  md5_text: { sql: 'md5(label)' },
  md5_varchar: { sql: 'md5(short_label)' },
  sha224: { sql: 'sha224(packet)', binary: true },
  sha256: { sql: 'sha256(packet)', binary: true },
  sha384: { sql: 'sha384(packet)', binary: true },
  sha512: { sql: 'sha512(packet)', binary: true },
}
const expressions: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(transforms).map(([name, transform]) => [
      name,
      `(${transform.sql}) = ${name.startsWith('md5_') ? 'recorded_text_md5' : 'recorded_' + name}`,
    ]),
  ),
  repeated: 'sha256(packet) = sha256(packet) AND md5(packet) = md5(packet)',
  lazy: 'CASE WHEN skip THEN true ELSE sha512(packet) = recorded_sha512 END',
  selected: '(CASE WHEN skip THEN backup ELSE sha256(packet) END) = recorded_sha256',
  defaulted: 'COALESCE(backup,sha256(packet)) = recorded_sha256',
  typed_null: 'sha384(NULL::bytea) IS NULL',
  default_text: 'md5(plain_label) = recorded_text_md5',
}
const input = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

describe('Rust CHECK cryptographic digests', () => {
  let pg: PGlite
  let directory: string
  const domains = 'CREATE DOMAIN raw_payload AS bytea; CREATE DOMAIN stored_payload AS raw_payload;'
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-bytea-crypto-'))
    await pg.exec(
      `${domains} CREATE TABLE digest_checks (${Object.entries(columns)
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
  it('matches MD5 and SHA digests, Unicode text, every octet, block boundaries, domains and lazy value states in Rust and both targets', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'digest_checks')!
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
      .map(
        ([name, type], index) =>
          `$${index + 1}::${type.replace(/ COLLATE "C"/u, '')} ${type.includes('COLLATE') ? 'COLLATE "C"' : ''} AS "${name}"`,
      )
      .join(',')}) candidate`
    let executions = 0
    const execute = async (sql: string, row: Row) => {
      if (executions > 0 && executions % 500 === 0) {
        await pg.close()
        pg = await PGlite.create()
        await pg.exec(domains)
      }
      executions++
      return (
        await pg.query<{ value: string | boolean | Uint8Array | null }>(
          `SELECT (${sql}) value FROM ${candidate}`,
          Object.keys(columns).map((name) => {
            const value = row[name]
            if (value?.kind !== 'Value') return null
            if (columns[name] === 'stored_payload') return '\\x' + String(value.value)
            if (columns[name] === 'bytea') return Buffer.from(String(value.value), 'hex')
            return value.value
          }),
        )
      ).rows[0]!.value
    }
    const oracle = async (name: string, row: Row) => {
      const value = await execute(expressions[name]!, row)
      record(name, row, { kind: value === null ? 'Null' : value ? 'True' : 'False' })
    }
    const known: Row = {
      packet: input('616263'),
      label: input('abc'),
      short_label: input('abc'),
      plain_label: input('abc'),
      recorded_md5: input('900150983cd24fb0d6963f7d28e17f72'),
      recorded_text_md5: input('900150983cd24fb0d6963f7d28e17f72'),
      recorded_sha224: input(''),
      recorded_sha256: input(''),
      recorded_sha384: input(''),
      recorded_sha512: input(''),
      backup: input(null),
      skip: input(false),
    }
    const bytes = [
      '',
      '616263',
      '313233343536373839',
      ...Array.from({ length: 256 }, (_, byte) => byte.toString(16).padStart(2, '0')),
      ...[
        2, 3, 4, 54, 55, 56, 57, 63, 64, 65, 110, 111, 112, 113, 127, 128, 129, 255, 256, 257,
      ].map((length) =>
        Array.from({ length }, (_, index) =>
          ((index * 137) % 256).toString(16).padStart(2, '0'),
        ).join(''),
      ),
    ]
    for (const value of bytes) {
      const row: Row = { ...known, packet: input(value) }
      for (const [name, operation] of Object.entries(transforms))
        if (!name.startsWith('md5_')) {
          const digest = await execute(operation.sql, row)
          row['recorded_' + name] = input(
            operation.binary
              ? Buffer.from(digest as Uint8Array).toString('hex')
              : (digest as string),
          )
        }
      for (const name of ['md5', 'sha224', 'sha256', 'sha384', 'sha512']) await oracle(name, row)
      if (value.length === 128 || value.length === 256) await oracle('repeated', row)
    }
    for (const label of [
      '',
      'abc',
      '123456789',
      'é',
      '界',
      '😀',
      'é',
      ' ',
      '\t\n\\',
      '\u007f',
      '\u0080',
      '\u07ff',
      '\u0800',
      '\uffff',
      '\u{10000}',
      '\u{10ffff}',
    ]) {
      const row = {
        ...known,
        label: input(label),
        short_label: input(label),
        plain_label: input(label),
      }
      const digest = (await execute('md5(label)', row)) as string
      for (const name of ['md5_text', 'md5_varchar', 'default_text'])
        await oracle(name, { ...row, recorded_text_md5: input(digest) })
    }
    for (const row of [
      known,
      {
        ...known,
        packet: input(null),
        label: input(null),
        short_label: input(null),
        plain_label: input(null),
      },
      {
        ...known,
        recorded_md5: input(null),
        recorded_text_md5: input(null),
        recorded_sha224: input(null),
        recorded_sha256: input(null),
        recorded_sha384: input(null),
        recorded_sha512: input(null),
      },
      { ...known, recorded_md5: input('wrong'), recorded_text_md5: input('wrong') },
      { ...known, skip: input(true) },
    ])
      for (const name of names) await oracle(name, row)
    const unknown: Input = { kind: 'Unknown' },
      error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    for (const name of Object.keys(transforms)) {
      const column =
        name === 'md5_text' ? 'label' : name === 'md5_varchar' ? 'short_label' : 'packet'
      record(name, { ...known, [column]: unknown }, { kind: 'Unknown' })
      record(name, { ...known, [column]: error }, error as Outcome)
      const expected = name.startsWith('md5_') ? 'recorded_text_md5' : 'recorded_' + name
      record(name, { ...known, [column]: unknown, [expected]: error }, error as Outcome)
      for (const kind of ['True', 'False', 'Null', 'Unknown', 'Error'])
        expect(
          fixtures.some((f) => f.name === name + '_raw' && f.expected.kind === kind),
          name + ': ' + kind,
        ).toBe(true)
    }
    record('lazy', { ...known, packet: error, skip: input(true) }, { kind: 'True' })
    record(
      'selected',
      { ...known, packet: error, backup: known.recorded_sha256!, skip: input(true) },
      { kind: 'True' },
    )
    record(
      'defaulted',
      { ...known, packet: error, backup: known.recorded_sha256! },
      { kind: 'True' },
    )
    record('defaulted', { ...known, packet: unknown }, { kind: 'Unknown' })
    await runCheckParity(directory, 'byteacrypto', group, fixtureNames, fixtures)
  }, 240000)
})
