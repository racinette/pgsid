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
  a: 'installed_bits',
  av: 'varbit',
  source: 'text',
  alternate: 'varchar',
  expected: 'varbit',
  rendered: 'text',
  width: 'integer',
  explicit: 'boolean',
  skip: 'boolean',
}
const transforms: Record<string, string> = {
  fixed: 'a::bit(3)',
  varying: 'av::varbit(3)',
  mixed_fixed: 'av::bit(3)',
  mixed_varying: 'a::varbit(3)',
  default_fixed: 'av::bit',
  unbounded: 'av::pg_catalog."bit"',
  direct_fixed: 'pg_catalog."bit"(a,width,explicit)',
  direct_varying: 'varbit(av,width,explicit)',
  parsed_fixed: 'source::bit(3)',
  parsed_varying: 'source::varbit(3)',
  parsed_default: 'source::bit',
  parsed_unbounded: 'source::pg_catalog."bit"',
  parsed_varchar: 'alternate::varbit(3)',
  parsed_function: 'varbit(source)',
  parsed_bit_function: 'pg_catalog."bit"(source)',
  nested: '(source::pg_catalog."bit")::bit(3)',
}
const expressions: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(transforms).map(([name, sql]) => [name, `(${sql}) = expected`]),
  ),
  output: 'a::text = rendered',
  varying_output: 'text(av) = rendered',
  roundtrip: '(av::text)::varbit = av',
  literal: "'101'::bit(3) = B'101'",
  hex_literal: "'xF'::bit(4) = B'1111'",
  typed_literal: "('101'::text)::bit(2) = B'10'",
  bit_literal: "B'1'::bit(3) = B'100'",
  hex_resize: "X'F'::varbit(3) = B'111'",
  null_literal: 'NULL::bit(3) IS NULL',
  lazy: 'CASE WHEN skip THEN true ELSE source::varbit = expected END',
  scalar_case: '(CASE WHEN skip THEN a::bit(3) ELSE source::bit(3) END) = expected',
  coalesce: 'COALESCE(a::bit(3),source::bit(3)) = expected',
}
const constants: Record<string, string> = {
  literal_width: "'101'::bit(2) = B'10'",
  literal_max: "'101'::varbit(2) = B'10'",
  literal_default: "'101'::bit = B'1'",
  binary_invalid_before_resize: "'2'::bit(2) = B'00'",
  binary_invalid: "'2'::bit(1) = B'0'",
  hex_invalid_before_resize: "'xG'::bit(3) = B'000'",
  hex_invalid: "'xG'::bit(4) = B'0000'",
  unicode_invalid_before_resize: "'é'::bit(1) = B'0'",
  unicode_invalid: "'é'::bit(2) = B'00'",
  unicode_varying: "'😀'::varbit(3) = B'000'",
}
const input = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

describe('Rust CHECK bit casts and width coercion', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-bit-casts-'))
    await pg.exec(`CREATE DOMAIN raw_bits AS pg_catalog."bit";
      CREATE DOMAIN installed_bits AS raw_bits;
      CREATE TABLE bit_cast_checks (${Object.entries(columns)
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
  it('matches input validation, explicit and implicit widths, text parsing, NULLs, diagnostics and lazy branches in Rust and both targets', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'bit_cast_checks')!
    const names = Object.keys(expressions)
    const fixtureNames = [
      ...names.flatMap((name) => ['raw', 'stored'].map((form) => name + '_' + form)),
      ...Object.keys(constants),
    ]
    const group = prepareCheckRustGroup([
      ...names.flatMap((name) =>
        ['raw', 'stored'].map((form) => ({
          expression: lowerTableCheck(
            table,
            form === 'stored'
              ? table.constraints.find((item) => item.name === name)!
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
      ...Object.entries(constants).map(([name, sql]) => ({
        expression: lowerTableCheck(
          table,
          { name, type: 'check', definition: `CHECK (${sql})` },
          [],
          catalog.domains,
        )!.expression,
        identity: { schema: 'public', kind: 'table' as const, owner: table.name, constraint: name },
      })),
    ])
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
    const params = (row: Row) =>
      Object.keys(columns).map((name) => (row[name]?.kind === 'Value' ? row[name].value : null))
    const query = async (sql: string, row: Row): Promise<Outcome> => {
      try {
        const value = (
          await pg.query<{ value: boolean | null }>(
            `SELECT (${sql}) value FROM ${candidate}`,
            params(row),
          )
        ).rows[0]!.value
        return { kind: value === null ? 'Null' : value ? 'True' : 'False' }
      } catch (error) {
        const code = (error as { code: string }).code
        expect(['22026', '22001', '22P02']).toContain(code)
        return { kind: 'Error', value: { state: parseInt(code, 36) } }
      }
    }
    const oracle = async (name: string, row: Row) =>
      record(name, row, await query(expressions[name]!, row))
    const known: Row = {
      a: input('101'),
      av: input('101'),
      source: input('101'),
      alternate: input('101'),
      expected: input('101'),
      rendered: input('101'),
      width: input(3),
      explicit: input(true),
      skip: input(false),
    }
    const falseNames = new Set<string>()
    for (const bits of [
      '',
      '1',
      '01',
      '101',
      '10101',
      '1010101',
      '10101010',
      '101010101',
      '10101010101010101',
    ]) {
      for (const width of [-2147483648, -1, 0, 1, 2, 3, 7, 8, 9, 17, 2147483641, 2147483647]) {
        for (const explicit of [true, false, null]) {
          const row = {
            ...known,
            a: input(bits),
            av: input(bits),
            source: input(bits),
            alternate: input(bits),
            rendered: input(bits),
            width: input(width),
            explicit: input(explicit),
          }
          const selected =
            width === 3 && explicit === true
              ? Object.keys(transforms)
              : ['direct_fixed', 'direct_varying']
          for (const name of selected) {
            try {
              const value = (
                await pg.query<{ value: string | null }>(
                  `SELECT (${transforms[name]}) value FROM ${candidate}`,
                  params(row),
                )
              ).rows[0]!.value
              await oracle(name, { ...row, expected: input(value) })
              if (value !== null && !falseNames.has(name)) {
                await oracle(name, { ...row, expected: input(value + '0') })
                falseNames.add(name)
              }
            } catch {
              await oracle(name, row)
            }
          }
        }
      }
      for (const name of ['output', 'varying_output', 'roundtrip'])
        await oracle(name, { ...known, a: input(bits), av: input(bits), rendered: input(bits) })
    }
    for (const source of [
      '',
      'b',
      'B',
      'x',
      'X',
      'b01',
      'B10101',
      'x0f',
      'XAF',
      'xAb',
      'x001',
      '2',
      'xG',
      'b2',
      ' 101',
      '101 ',
      'é',
      '😀',
    ]) {
      for (const name of Object.keys(transforms).filter(
        (name) => name.startsWith('parsed') || name === 'nested',
      ))
        await oracle(name, { ...known, source: input(source), alternate: input(source) })
    }
    for (const row of [
      known,
      { ...known, a: input(null), av: input(null), source: input(null), alternate: input(null) },
      { ...known, width: input(null) },
      { ...known, explicit: input(null) },
      { ...known, expected: input('0'), rendered: input('0') },
    ])
      for (const name of names) await oracle(name, row)
    for (const [name, sql] of Object.entries(constants))
      fixtures.push({ name, row: known, expected: await query(sql, known) })
    const error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    const other: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    const unknown: Input = { kind: 'Unknown' }
    for (const name of ['fixed', 'direct_fixed', 'output']) {
      record(name, { ...known, a: unknown }, { kind: 'Unknown' })
      record(name, { ...known, a: error }, error as Outcome)
      record(name, { ...known, a: input('b101') }, { kind: 'Unknown' })
    }
    for (const name of ['parsed_fixed', 'parsed_varying', 'parsed_default', 'parsed_unbounded']) {
      record(name, { ...known, source: unknown }, { kind: 'Unknown' })
      record(name, { ...known, source: error }, error as Outcome)
    }
    record('direct_fixed', { ...known, a: error, width: other, explicit: other }, error as Outcome)
    for (const a of [unknown, input(null)])
      record('direct_fixed', { ...known, a, width: other }, other as Outcome)
    record('direct_fixed', { ...known, width: unknown }, { kind: 'Unknown' })
    record('direct_fixed', { ...known, explicit: other }, other as Outcome)
    for (const skip of [true, false, null])
      for (const name of ['lazy', 'scalar_case'])
        await oracle(name, { ...known, source: input('xG'), skip: input(skip) })
    record('coalesce', { ...known, source: error }, { kind: 'True' })
    for (const name of Object.keys(transforms)) {
      for (const kind of ['True', 'False', 'Null'])
        expect(
          fixtures.some((f) => f.name === name + '_raw' && f.expected.kind === kind),
          name + ': ' + kind,
        ).toBe(true)
    }
    expect(fixtures.find((f) => f.name === 'unicode_invalid_before_resize')!.expected).toEqual({
      kind: 'Error',
      value: { state: parseInt('22P02', 36) },
    })
    expect(fixtures.find((f) => f.name === 'unicode_invalid')!.expected).toEqual({
      kind: 'Error',
      value: { state: parseInt('22P02', 36) },
    })
    await runCheckParity(directory, 'bitcastchecks', group, fixtureNames, fixtures)
  }, 180000)
})
