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
  encoded: 'text COLLATE "C"',
  format: 'varchar COLLATE "C"',
  expected_text: 'text COLLATE "C"',
  expected_bytes: 'bytea',
  backup: 'bytea',
  skip: 'boolean',
}
const expressions: Record<string, string> = {
  encode: 'encode(a,format) = expected_text',
  decode: 'decode(encoded,format) = expected_bytes',
  roundtrip: 'decode(encode(a,format),format) = a',
  lazy: 'CASE WHEN skip THEN true ELSE decode(encoded,format) = expected_bytes END',
  selected: '(CASE WHEN skip THEN backup ELSE decode(encoded,format) END) = expected_bytes',
  defaulted: 'COALESCE(backup,decode(encoded,format)) = expected_bytes',
  reuse: 'encode(a,format) = encode(a,format) AND decode(encoded,format) = decode(encoded,format)',
  literal_hex: `decode('00 80\nff' COLLATE "C",'HeX' COLLATE "C") = '\\x0080ff'::bytea`,
  literal_base64: `decode('AA==' COLLATE "C",'BASE64' COLLATE "C") = '\\x00'::bytea`,
  default_hex: `encode(a,'hex') = expected_text`,
  default_decode: `decode(encoded COLLATE "default",'hex') = expected_bytes`,
  default_literal: `decode('00 80ff','HeX') = '\\x0080ff'::bytea`,
  typed_null: `decode(NULL::text COLLATE "C",'hex' COLLATE "C") IS NULL`,
}
const input = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

describe('Rust CHECK bytea encodings', () => {
  let pg: PGlite
  let directory: string
  const domains = 'CREATE DOMAIN raw_payload AS bytea; CREATE DOMAIN stored_payload AS raw_payload;'
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-bytea-codec-'))
    await pg.exec(
      `${domains} CREATE TABLE bytea_encoding_checks (${Object.entries(columns)
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
  it('matches hex, base64, escape, UTF8, malformed padding and lazy errors in Rust and both targets', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'bytea_encoding_checks')!
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
      try {
        const value = await execute(expressions[name]!, row)
        record(name, row, { kind: value === null ? 'Null' : value ? 'True' : 'False' })
      } catch (error) {
        const code = (error as { code?: string }).code
        if (!code) throw error
        record(name, row, { kind: 'Error', value: { state: parseInt(code, 36) } })
      }
    }
    const known: Row = {
      a: input('0080ff'),
      encoded: input('0080ff'),
      format: input('hex'),
      expected_text: input('0080ff'),
      expected_bytes: input('0080ff'),
      backup: input(null),
      skip: input(false),
    }
    const values = [
      '',
      '00',
      'ff',
      '5c',
      '0080ff',
      '313233343536373839',
      ...Array.from({ length: 256 }, (_, byte) => byte.toString(16).padStart(2, '0')),
      ...[1, 2, 3, 56, 57, 58, 113, 114, 115].map((length) =>
        Array.from({ length }, (_, index) =>
          ((index * 137) % 256).toString(16).padStart(2, '0'),
        ).join(''),
      ),
    ]
    for (const format of ['hex', 'base64', 'escape'])
      for (const bytes of values) {
        const row = {
          ...known,
          a: input(bytes),
          format: input(format),
          expected_bytes: input(bytes),
        }
        const encoded = (await execute('encode(a,format)', row)) as string
        const complete = { ...row, encoded: input(encoded), expected_text: input(encoded) }
        for (const name of ['encode', 'decode', 'roundtrip', 'reuse']) await oracle(name, complete)
      }
    for (const format of [
      'HEX',
      'HeX',
      'BASE64',
      'BaSe64',
      'ESCAPE',
      'eScApE',
      ' hex',
      'hex ',
      '',
      'utf8',
      '🦀',
    ])
      for (const name of ['encode', 'decode'])
        await oracle(name, { ...known, format: input(format) })
    for (const encoded of [
      '',
      '00 80\nff',
      '00\t80\rff',
      '0',
      '0 0',
      '0\n0',
      '00z0',
      'gg',
      'é',
      '00\vff',
      '00\fff',
    ])
      await oracle('decode', { ...known, encoded: input(encoded) })
    for (const encoded of [
      '',
      'AA==',
      'AB==',
      'AAB=',
      'AA=A',
      'AA==AAAA',
      'AA==AA==',
      'AAAA====',
      'AAA',
      'A',
      '====',
      'A===',
      'AAA==',
      'AAAA=',
      'AA',
      'AA=',
      'AA===',
      'AA==!',
      'AA==\v',
      'AA==\f',
      ' A\tA\r=\n= ',
      'éAAA',
      '/w==',
      '////',
    ]) {
      const row = { ...known, format: input('base64'), encoded: input(encoded) }
      try {
        const decoded = (await execute('decode(encoded,format)', row)) as Uint8Array
        await oracle('decode', {
          ...row,
          expected_bytes: input(Buffer.from(decoded).toString('hex')),
        })
      } catch (error) {
        if (!(error as { code?: string }).code) throw error
        await oracle('decode', row)
      }
    }
    for (const encoded of [
      '',
      'a',
      'é',
      '界',
      '😀',
      '\u007f',
      '\u0080',
      '\u07ff',
      '\u0800',
      '\uffff',
      '\u{10000}',
      '\u{10ffff}',
      '\\000',
      '\\377',
      '\\\\',
      '\\000\\377é',
      '\\',
      '\\0',
      '\\00',
      '\\400',
      '\\778',
      '\\08a',
      '\\x00',
      '\\1234',
      '\\\\000',
    ]) {
      const row = { ...known, format: input('escape'), encoded: input(encoded) }
      try {
        const decoded = (await execute('decode(encoded,format)', row)) as Uint8Array
        await oracle('decode', {
          ...row,
          expected_bytes: input(Buffer.from(decoded).toString('hex')),
        })
      } catch (error) {
        if (!(error as { code?: string }).code) throw error
        await oracle('decode', row)
      }
    }
    for (const row of [
      known,
      { ...known, a: input(null), encoded: input(null) },
      { ...known, format: input(null) },
      { ...known, expected_text: input(null), expected_bytes: input(null) },
      { ...known, expected_text: input('wrong'), expected_bytes: input('00') },
      { ...known, skip: input(true) },
    ])
      for (const name of names) await oracle(name, row)
    const unknown: Input = { kind: 'Unknown' },
      error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } },
      other: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    for (const [name, column] of [
      ['encode', 'a'],
      ['decode', 'encoded'],
    ] as const) {
      for (const value of [unknown, input(null)])
        record(name, { ...known, [column]: value, format: error }, error as Outcome)
      record(name, { ...known, [column]: error, format: other }, error as Outcome)
      record(name, { ...known, [column]: unknown }, { kind: 'Unknown' })
      record(name, { ...known, format: unknown }, { kind: 'Unknown' })
    }
    record('lazy', { ...known, encoded: error, skip: input(true) }, { kind: 'True' })
    record(
      'selected',
      { ...known, encoded: error, backup: known.expected_bytes!, skip: input(true) },
      { kind: 'True' },
    )
    record(
      'defaulted',
      { ...known, encoded: error, backup: known.expected_bytes! },
      { kind: 'True' },
    )
    record('defaulted', { ...known, encoded: unknown }, { kind: 'Unknown' })
    for (const name of ['encode', 'decode'])
      for (const kind of ['True', 'False', 'Null', 'Error'])
        expect(
          fixtures.some((f) => f.name === name + '_raw' && f.expected.kind === kind),
          name + ': ' + kind,
        ).toBe(true)
    await runCheckParity(directory, 'byteacodecs', group, fixtureNames, fixtures)
  }, 180000)
})
