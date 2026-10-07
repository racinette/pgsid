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
  position: 'integer',
  bit_position: 'bigint',
  small_position: 'smallint',
  replacement: 'integer',
  expected: 'bytea',
  expected_value: 'integer',
  backup: 'bytea',
  skip: 'boolean',
}
const transforms: Record<string, { sql: string; binary?: boolean }> = {
  get_byte: { sql: 'get_byte(a,position)' },
  get_small_byte: { sql: 'get_byte(a,small_position)' },
  get_bit: { sql: 'get_bit(a,bit_position)' },
  get_integer_bit: { sql: 'get_bit(a,position)' },
  set_byte: { sql: 'set_byte(a,position,replacement)', binary: true },
  set_bit: { sql: 'set_bit(a,bit_position,replacement)', binary: true },
  set_integer_bit: { sql: 'set_bit(a,position,replacement)', binary: true },
}
const expressions: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(transforms).map(([name, transform]) => [
      name,
      `(${transform.sql}) = ${transform.binary ? 'expected' : 'expected_value'}`,
    ]),
  ),
  reuse_byte: 'set_byte(a,position,get_byte(a,position)) = a',
  reuse_bit: 'set_bit(a,bit_position,get_bit(a,bit_position)) = a',
  edited_byte:
    'get_byte(set_byte(a,position,replacement),position) = ((replacement % 256 + 256) % 256)',
  edited_bit: 'get_bit(set_bit(a,bit_position,replacement),bit_position) = replacement',
  lazy: 'CASE WHEN skip THEN true ELSE get_byte(a,position) = expected_value END',
  selected: '(CASE WHEN skip THEN backup ELSE set_byte(a,position,replacement) END) = expected',
  defaulted: 'COALESCE(backup,set_byte(a,position,replacement)) = expected',
  low_bit: "get_bit('\\x80'::bytea,0) = 0 AND get_bit('\\x80'::bytea,7) = 1",
  second_byte: "get_bit('\\x8001'::bytea,8) = 1",
  unsigned_byte: "get_byte('\\xff'::bytea,0) = 255",
  truncates_byte: "set_byte('\\x00'::bytea,0,-1) = '\\xff'::bytea",
  truncates_minimum: "set_byte('\\xff'::bytea,0,-2147483648) = '\\x00'::bytea",
}
const input = (value: string | number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

describe('Rust CHECK bytea access and editing', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-bytea-edit-'))
    await pg.exec(`CREATE DOMAIN raw_payload AS bytea; CREATE DOMAIN stored_payload AS raw_payload;
      CREATE TABLE bytea_edit_checks (${Object.entries(columns)
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
  it('matches unsigned bytes, low-bit indices, replacement truncation, immutable edits and errors in Rust and both targets', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'bytea_edit_checks')!
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
              : columns[name] === 'bytea'
                ? Buffer.from(String(row[name].value), 'hex')
                : columns[name] === 'stored_payload'
                  ? '\\x' + String(row[name].value)
                  : typeof row[name].value === 'bigint'
                    ? String(row[name].value)
                    : row[name].value,
          ),
        )
      ).rows[0]!.value
    }
    const query = async (sql: string, row: Row): Promise<Outcome> => {
      try {
        const value = await execute(sql, row)
        return { kind: value === null ? 'Null' : value ? 'True' : 'False' }
      } catch (error) {
        const code = (error as { code: string }).code
        expect(['2202E', '22023'], sql + ': ' + String(error)).toContain(code)
        return { kind: 'Error', value: { state: parseInt(code, 36) } }
      }
    }
    const oracle = async (name: string, row: Row) =>
      record(name, row, await query(expressions[name]!, row))
    const known: Row = {
      a: input('0080ff'),
      position: input(1),
      bit_position: input(15n),
      small_position: input(1),
      replacement: input(0),
      expected: input('0000ff'),
      expected_value: input(128),
      backup: input('0000ff'),
      skip: input(false),
    }
    const falseNames = new Set<string>()
    const transform = async (name: string, row: Row) => {
      const operation = transforms[name]!
      try {
        const value = await execute(
          operation.binary ? `encode(${operation.sql},'hex')` : operation.sql,
          row,
        )
        const column = operation.binary ? 'expected' : 'expected_value'
        await oracle(name, { ...row, [column]: input(value) })
        if (value !== null && !falseNames.has(name)) {
          await oracle(name, {
            ...row,
            [column]: input(operation.binary ? value + '00' : value === 0 ? 1 : 0),
          })
          falseNames.add(name)
        }
      } catch (error) {
        if (!(error as { code?: string }).code) throw error
        await oracle(name, row)
      }
    }
    for (let byte = 0; byte < 256; byte++) {
      const row = {
        ...known,
        a: input(byte.toString(16).padStart(2, '0')),
        position: input(0),
        small_position: input(0),
      }
      await transform('get_byte', row)
      for (let bit = 0; bit < 8; bit++) {
        const indexed = { ...row, bit_position: input(BigInt(bit)) }
        await transform('get_bit', indexed)
        if (bit === 0 || bit === 3 || bit === 7)
          for (const replacement of [0, 1])
            await transform('set_bit', { ...indexed, replacement: input(replacement) })
      }
    }
    for (const bytes of [
      '',
      '00',
      'ff',
      '0080ff',
      '0102030405',
      '0123456789abcdef',
      '00'.repeat(33),
    ]) {
      for (const position of new Set([
        -2147483648,
        -1,
        0,
        1,
        2,
        7,
        bytes.length / 2 - 1,
        bytes.length / 2,
        2147483647,
      ])) {
        const row = {
          ...known,
          a: input(bytes),
          position: input(position),
          small_position: input(Math.max(-32768, Math.min(32767, position))),
          bit_position: input(BigInt(position)),
        }
        for (const name of ['get_byte', 'get_small_byte', 'get_integer_bit'])
          await transform(name, row)
        for (const name of ['reuse_byte', 'reuse_bit']) await oracle(name, row)
        for (const replacement of [-2147483648, -257, -256, -1, 0, 1, 255, 256, 257, 2147483647]) {
          const edited = { ...row, replacement: input(replacement) }
          await transform('set_byte', edited)
          await oracle('edited_byte', edited)
        }
        for (const replacement of [-1, 0, 1, 2]) {
          const edited = { ...row, replacement: input(replacement) }
          await transform('set_integer_bit', edited)
          await oracle('edited_bit', edited)
        }
      }
      for (const position of new Set([
        -9223372036854775808n,
        -1n,
        0n,
        7n,
        8n,
        15n,
        BigInt(bytes.length * 4),
        2147483648n,
        9223372036854775807n,
      ])) {
        const row = { ...known, a: input(bytes), bit_position: input(position) }
        await transform('get_bit', row)
        for (const replacement of [-1, 0, 1, 2])
          await transform('set_bit', { ...row, replacement: input(replacement) })
      }
    }
    for (const row of [
      known,
      { ...known, a: input(null) },
      { ...known, position: input(null), bit_position: input(null), small_position: input(null) },
      { ...known, replacement: input(null) },
      { ...known, expected: input(null), expected_value: input(null) },
    ])
      for (const name of names) await oracle(name, row)
    for (const skip of [true, false, null])
      for (const name of ['lazy', 'selected'])
        await oracle(name, {
          ...known,
          position: input(-1),
          replacement: input(2),
          skip: input(skip),
        })
    await oracle('defaulted', { ...known, position: input(-1) })
    await oracle('defaulted', { ...known, backup: input(null), position: input(-1) })
    const unknown: Input = { kind: 'Unknown' }
    const error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    const other: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    for (const name of Object.keys(transforms)) {
      record(name, { ...known, a: unknown }, { kind: 'Unknown' })
      record(name, { ...known, a: error }, error as Outcome)
      record(name, { ...known, a: input('g0') }, { kind: 'Unknown' })
    }
    for (const [name, position] of [
      ['get_byte', 'position'],
      ['get_bit', 'bit_position'],
      ['set_byte', 'position'],
      ['set_bit', 'bit_position'],
    ] as const) {
      record(name, { ...known, a: error, [position]: other }, error as Outcome)
      record(name, { ...known, [position]: unknown }, { kind: 'Unknown' })
      for (const value of [unknown, input(null)])
        record(name, { ...known, a: value, [position]: error }, error as Outcome)
    }
    for (const [name, position] of [
      ['set_byte', 'position'],
      ['set_bit', 'bit_position'],
    ] as const) {
      record(name, { ...known, a: error, [position]: other, replacement: other }, error as Outcome)
      record(name, { ...known, [position]: error, replacement: other }, error as Outcome)
      record(name, { ...known, [position]: unknown, replacement: other }, other as Outcome)
      record(name, { ...known, replacement: unknown }, { kind: 'Unknown' })
    }
    record('lazy', { ...known, a: error, skip: input(true) }, { kind: 'True' })
    record('selected', { ...known, a: error, skip: input(true) }, { kind: 'True' })
    record('defaulted', { ...known, a: error }, { kind: 'True' })
    for (const name of Object.keys(transforms))
      for (const kind of ['True', 'False', 'Null'])
        expect(
          fixtures.some((f) => f.name === name + '_raw' && f.expected.kind === kind),
          name + ': ' + kind,
        ).toBe(true)
    for (const name of ['get_byte', 'get_bit', 'set_byte', 'set_bit'])
      expect(
        fixtures.some(
          (f) =>
            f.name === name + '_raw' &&
            f.expected.kind === 'Error' &&
            f.expected.value.state === parseInt('2202E', 36),
        ),
        name,
      ).toBe(true)
    expect(
      await query(expressions.set_bit!, {
        ...known,
        bit_position: input(-1n),
        replacement: input(2),
      }),
    ).toEqual({ kind: 'Error', value: { state: parseInt('2202E', 36) } })
    expect(await query(expressions.set_bit!, { ...known, replacement: input(2) })).toEqual({
      kind: 'Error',
      value: { state: parseInt('22023', 36) },
    })
    await runCheckParity(directory, 'byteaeditchecks', group, fixtureNames, fixtures)
  }, 180000)
})
