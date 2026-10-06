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
  b: 'pg_catalog."bit"',
  av: 'varbit',
  bv: 'varbit',
  expected: 'varbit',
  distance: 'integer',
  small_distance: 'smallint',
  flag: 'boolean',
}
const transforms: Record<string, string> = {}
for (const [name, operator, fn] of [
  ['intersection', '&', 'bitand'],
  ['union', '|', 'bitor'],
  ['exclusive', '#', 'bitxor'],
]) {
  transforms[name!] = `a ${operator} b`
  transforms['varying_' + name] = `av ${operator} bv`
  transforms['mixed_' + name] = `a ${operator} bv`
  transforms['right_mixed_' + name] = `av ${operator} b`
  transforms['direct_' + name] = `${fn}(a,b)`
  transforms['direct_varying_' + name] = `${fn}(av,bv)`
}
Object.assign(transforms, {
  complement: '~a',
  varying_complement: '~av',
  direct_complement: 'bitnot(a)',
  direct_varying_complement: 'bitnot(av)',
  left: 'a << distance',
  right: 'a >> distance',
  varying_left: 'av << distance',
  varying_right: 'av >> distance',
  direct_left: 'bitshiftleft(a,distance)',
  direct_right: 'bitshiftright(a,distance)',
  direct_varying_left: 'bitshiftleft(av,distance)',
  direct_varying_right: 'bitshiftright(av,distance)',
  small_left: 'a << small_distance',
  small_right: 'av >> small_distance',
})
const expressions: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(transforms).map(([name, sql]) => [name, `(${sql}) = expected`]),
  ),
  double_complement: '~(~a) = a',
  complement_width: 'bit_length(~av) = bit_length(av)',
  left_width: 'bit_length(a << distance) = bit_length(a)',
  right_width: 'bit_length(av >> distance) = bit_length(av)',
  complement_null: '(~a) IS NULL',
  intersection_null: '(av & bv) IS NULL',
  shift_null: '(a << distance) IS NULL',
  lazy: 'CASE WHEN flag THEN true ELSE (a & b) = expected END',
  scalar_case: '(CASE WHEN flag THEN a & b ELSE av END) = expected',
  coalesce: 'COALESCE(a | b, av) = expected',
  conjunction: 'flag AND (a # b) = expected',
  disjunction: 'flag OR (a & b) = expected',
  membership: '(~a) IN (expected,b)',
  range: '(av << distance) BETWEEN expected AND expected',
}
const input = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})

describe('Rust CHECK bitwise operations and shifts', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-bitwise-'))
    await pg.exec(`CREATE DOMAIN raw_bits AS pg_catalog."bit";
      CREATE DOMAIN installed_bits AS raw_bits;
      CREATE TABLE bitwise_checks (${Object.entries(columns)
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
  it('matches PostgreSQL for exact widths, partial bytes, signed shifts, length errors, domains and lazy branches in every target', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'bitwise_checks')!
    const names = Object.keys(expressions)
    const fixtureNames = names.flatMap((name) => ['raw', 'stored'].map((form) => name + '_' + form))
    const group = prepareCheckRustGroup(
      names.flatMap((name) =>
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
    const parameters = (row: Row) =>
      Object.keys(columns).map((name) => (row[name]?.kind === 'Value' ? row[name].value : null))
    const oracle = async (name: string, row: Row) => {
      let result: Outcome
      try {
        const value = (
          await pg.query<{ value: boolean | null }>(
            `SELECT (${expressions[name]}) value FROM ${candidate}`,
            parameters(row),
          )
        ).rows[0]!.value
        result = outcome(value)
      } catch (error) {
        expect((error as { code: string }).code, name).toBe('22026')
        result = { kind: 'Error', value: { state: parseInt('22026', 36) } }
      }
      record(name, row, result)
    }
    const falseNames = new Set<string>()
    const matchesTransform = async (name: string, row: Row) => {
      let value: string | null
      try {
        value = (
          await pg.query<{ value: string | null }>(
            `SELECT (${transforms[name]}) value FROM ${candidate}`,
            parameters(row),
          )
        ).rows[0]!.value
      } catch (error) {
        expect((error as { code: string }).code).toBe('22026')
        await oracle(name, row)
        return
      }
      await oracle(name, { ...row, expected: input(value) })
      if (value !== null && !falseNames.has(name)) {
        await oracle(name, { ...row, expected: input(value + '0') })
        falseNames.add(name)
      }
    }
    const known: Row = {
      a: input('101'),
      b: input('011'),
      av: input('101'),
      bv: input('011'),
      expected: input('001'),
      distance: input(1),
      small_distance: input(1),
      flag: input(false),
    }
    const shifts = Object.keys(transforms).filter(
      (name) => name.endsWith('left') || name.endsWith('right'),
    )
    for (const width of [0, 1, 2, 3, 7, 8, 9, 15, 16, 17, 31, 32, 33, 64, 65, 129]) {
      for (const [pattern, a] of [
        '10'.repeat(width).slice(0, width),
        '0'.repeat(width),
        '1'.repeat(width),
      ].entries()) {
        const b = '01'.repeat(width).slice(0, width)
        const row = { ...known, a: input(a), b: input(b), av: input(a), bv: input(b) }
        for (const name of Object.keys(transforms).filter((name) => !shifts.includes(name)))
          await matchesTransform(name, row)
        for (const distance of [
          -2147483648, -2147483647, -2147483640, -129, -17, -9, -8, -1, 0, 1, 7, 8, 9, 17, 129,
          2147483647,
        ]) {
          if (pattern !== 0) continue
          const shifted = {
            ...row,
            distance: input(distance),
            small_distance: input(distance >= -32768 && distance <= 32767 ? distance : 0),
          }
          for (const name of shifts) await matchesTransform(name, shifted)
          for (const name of ['left_width', 'right_width']) await oracle(name, shifted)
        }
      }
    }
    for (const row of [
      known,
      { ...known, a: input(''), av: input('') },
      { ...known, b: input('1'), bv: input('1') },
      { ...known, a: input(null), av: input(null) },
      { ...known, b: input(null), bv: input(null) },
      { ...known, distance: input(null), small_distance: input(null) },
    ])
      for (const name of names) await oracle(name, row)
    const lengthError: Outcome = { kind: 'Error', value: { state: parseInt('22026', 36) } }
    const error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    const other: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    const unknown: Input = { kind: 'Unknown' }
    for (const name of [
      'intersection',
      'union',
      'exclusive',
      'direct_intersection',
      'direct_union',
      'direct_exclusive',
    ]) {
      record(name, { ...known, a: unknown }, { kind: 'Unknown' })
      record(name, { ...known, b: unknown }, { kind: 'Unknown' })
      record(name, { ...known, a: error, b: other }, error as Outcome)
      for (const a of [unknown, input(null)])
        record(name, { ...known, a, b: other }, other as Outcome)
      record(name, { ...known, a: input('10') }, lengthError)
    }
    for (const name of [
      'complement',
      'direct_complement',
      'left',
      'right',
      'direct_left',
      'direct_right',
    ]) {
      record(name, { ...known, a: unknown }, { kind: 'Unknown' })
      record(name, { ...known, a: error }, error as Outcome)
      for (const invalid of ['2', 'b101', ' 101', '０１'])
        record(name, { ...known, a: input(invalid) }, { kind: 'Unknown' })
    }
    for (const name of ['left', 'right', 'direct_left', 'direct_right']) {
      record(name, { ...known, distance: unknown }, { kind: 'Unknown' })
      record(name, { ...known, distance: error }, error as Outcome)
      record(name, { ...known, a: error, distance: other }, error as Outcome)
      for (const a of [unknown, input(null)])
        record(name, { ...known, a, distance: other }, other as Outcome)
    }
    const mismatch = { ...known, b: input('1'), bv: input('1') }
    for (const name of ['lazy', 'conjunction', 'disjunction', 'scalar_case'])
      for (const flag of [false, true, null]) await oracle(name, { ...mismatch, flag: input(flag) })
    record('lazy', { ...mismatch, flag: unknown }, { kind: 'Unknown' })
    record('coalesce', { ...known, av: error, expected: input('111') }, { kind: 'True' })
    record('scalar_case', { ...known, a: error, expected: input('101') }, { kind: 'True' })
    for (const name of Object.keys(transforms)) {
      for (const kind of ['True', 'False', 'Null'])
        expect(
          fixtures.some((item) => item.name === name + '_raw' && item.expected.kind === kind),
          name + ': ' + kind,
        ).toBe(true)
    }
    for (const name of ['intersection', 'union', 'exclusive'])
      expect(
        fixtures.some((item) => item.name === name + '_raw' && item.expected.kind === 'Error'),
        name,
      ).toBe(true)
    await runCheckParity(directory, 'bitwisechecks', group, fixtureNames, fixtures)
  }, 180000)
})
