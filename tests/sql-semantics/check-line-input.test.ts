import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import { lineInputForms, deferredLinePlatformForms } from './check-line-input-forms.js'
const value = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (state: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(state, 36) },
})
const expressions = {
  wire: 'line_send(source::line) = expected',
  varying: 'line_send(source::varchar::line) = expected',
  domain: 'line_send(source::nested_axis) = expected',
  typename: 'line_send(line(source)) = expected',
  same: 'line_eq(source::line, known_line)',
  present: '(source::line IS NOT NULL) = recorded_present',
  lazy: 'CASE WHEN skip THEN true ELSE line_send(source::line) = expected END',
  selected: 'line_send(CASE WHEN skip THEN known_line ELSE source::line END) = expected',
  coalesced: 'line_send(COALESCE(known_line,source::line)) = expected',
  literal: "line_send('[(0,0),(1,1)]'::line) = expected",
  domain_literal: "line_send('{1,-1,0}'::nested_axis) = expected",
  implicit_literal: "line_eq(known_line,'{1,-1,0}')",
  null_literal: 'line_send(NULL::line) = expected',
  constructed: 'line_send(line(first_point,second_point)) = expected',
  constructed_same: 'line_eq(line(first_point,second_point),known_line)',
  recovered_horizontal:
    "line_send(line(point(slope(first_point,second_point),0::float8),'(1,0)'::point)) = expected",
  recovered_vertical:
    "line_send(line(point(0::float8,slope(first_point,second_point)),'(0,1)'::point)) = expected",
}
const line = (wire: string | null): Input => {
  if (wire === null) return value(null)
  const bytes = Buffer.from(wire, 'hex')
  return value({
    a: bytes.readBigInt64BE(),
    b: bytes.readBigInt64BE(8),
    c: bytes.readBigInt64BE(16),
  })
}
const point = async (pg: PGlite, text: string | null): Promise<Input> => {
  if (text === null) return value(null)
  const bytes = (await pg.query<{ wire: Uint8Array }>('SELECT point_send($1::point) wire', [text]))
    .rows[0]!.wire
  const buffer = Buffer.from(bytes)
  return value({ x: buffer.readBigInt64BE(), y: buffer.readBigInt64BE(8) })
}
describe('line text input and point construction', () => {
  let pg: PGlite, directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-line-input-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('matches coefficient and point-pair grammar, catalog coercions, typed literals, constructor errors and semantic NaNs in every target', async () => {
    await pg.exec(`CREATE DOMAIN axis AS line; CREATE DOMAIN nested_axis AS axis;
  CREATE TABLE line_inputs(source text,known_line nested_axis,first_point point,second_point point,expected bytea,recorded_present boolean,skip boolean,${Object.entries(
    expressions,
  )
    .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
    .join(',')})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'line_inputs')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const stored = table.constraints.find((c) => c.name === name)!
      return [
        { ...stored, name: name + '_raw', definition: `CHECK (${sql})` },
        { ...stored, name: name + '_stored' },
      ]
    })
    const invalid = "CASE WHEN skip THEN true ELSE line_send('{0,0,1}'::line) = expected END"
    constraints.push({
      ...table.constraints.find((c) => c.name === 'literal')!,
      name: 'invalid_literal',
      definition: `CHECK (${invalid})`,
    })
    await expect(
      pg.query(`SELECT ${invalid} FROM (SELECT true skip,NULL::bytea expected) inputs`),
    ).rejects.toMatchObject({ code: '22P02' })
    const group = prepareCheckRustGroup(
      constraints.map((constraint) => ({
        expression: lowerTableCheck(table, constraint, [], catalog.domains)!.expression,
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: constraint.name,
        },
      })),
    )
    for (const [index, check] of group.checks.entries())
      expect(check.kind, constraints[index]!.name).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + suffix, row, expected })
    }
    for (const text of lineInputForms) {
      let wire: string | null = null,
        expected: Outcome,
        sameExpected: Outcome,
        computedNan = false
      try {
        const oracle = (
          await pg.query<{ wire: string | null; same: boolean | null }>(
            "SELECT encode(line_send($1::line),'hex') wire,line_eq($1::line,$1::line) same",
            [text],
          )
        ).rows[0]!
        wire = oracle.wire
        sameExpected = { kind: oracle.same === null ? 'Null' : oracle.same ? 'True' : 'False' }
        if (wire !== null && !text!.trimStart().startsWith('{')) {
          const bytes = Buffer.from(wire, 'hex')
          computedNan = [0, 8, 16].some((index) => Number.isNaN(bytes.readDoubleBE(index)))
        }
        expected = { kind: text === null ? 'Null' : 'True' }
      } catch (caught) {
        const code = (caught as { code: string }).code
        expect(['22P02', '22003']).toContain(code)
        expected = error(code)
        sameExpected = expected
      }
      const row: Row = {
        source: value(text),
        known_line: line(wire),
        expected: value(wire),
        recorded_present: value(text !== null),
        skip: value(false),
        first_point: value(null),
        second_point: value(null),
      }
      for (const name of ['wire', 'varying', 'domain', 'typename', 'lazy', 'selected'])
        add(name, row, computedNan ? { kind: 'Unknown' } : expected)
      add('same', row, sameExpected)
      add('present', row, expected.kind === 'Null' ? { kind: 'True' } : expected)
      add('lazy', { ...row, skip: value(true) }, { kind: 'True' })
    }
    const axisWire = '3ff0000000000000bff00000000000000000000000000000'
    const baseline: Row = {
      source: value('{bad,0,0}'),
      known_line: line(axisWire),
      expected: value(axisWire),
      skip: value(true),
      recorded_present: value(true),
      first_point: value(null),
      second_point: value(null),
    }
    for (const name of ['literal', 'domain_literal', 'implicit_literal', 'selected', 'coalesced'])
      add(name, baseline, { kind: 'True' })
    add('null_literal', baseline, { kind: 'Null' })
    for (const skip of [true, false])
      fixtures.push({
        name: 'invalid_literal',
        row: { ...baseline, skip: value(skip) },
        expected: error('22P02'),
      })
    for (const text of [...deferredLinePlatformForms, '{' + '0'.repeat(4097) + ',1,0}']) {
      for (const name of ['wire', 'same', 'present'])
        add(name, { ...baseline, source: value(text) }, { kind: 'Unknown' })
      add('lazy', { ...baseline, source: value(text) }, { kind: 'True' })
    }
    for (const state of [{ kind: 'Null' }, { kind: 'Unknown' }, error('22012')] as Input[]) {
      add('wire', { ...baseline, source: state }, state as Outcome)
      add('selected', { ...baseline, source: state }, { kind: 'True' })
      add('coalesced', { ...baseline, source: state }, { kind: 'True' })
    }
    const pairs: [string | null, string | null][] = [
      ['(0,0)', '(1,1)'],
      ['(-0,-0)', '(1,1)'],
      ['(-0,2)', '(-0,4)'],
      ['(1,-0)', '(3,-0)'],
      ['(0,0)', '(0,0)'],
      ['(0,0)', '(0.0000005,0.0000005)'],
      ['(0,0)', '(0.000002,0.0000005)'],
      ['(Infinity,Infinity)', '(0,0)'],
      ['(NaN,0)', '(1,0)'],
      ['(0,NaN)', '(0,1)'],
      ['(NaN,1)', '(0,0)'],
      ['(NaN,NaN)', '(NaN,NaN)'],
      ['(1e308,0)', '(-1e308,1)'],
      [null, '(0,0)'],
      ['(0,0)', null],
    ]
    for (const [first, second] of pairs) {
      let wire: string | null = null,
        expected: Outcome,
        computedNan = false
      try {
        wire = (
          await pg.query<{ wire: string | null }>(
            "SELECT encode(line_send(line($1::point,$2::point)),'hex') wire",
            [first, second],
          )
        ).rows[0]!.wire
        if (wire !== null) {
          const bytes = Buffer.from(wire, 'hex')
          computedNan = [0, 8, 16].some((index) => Number.isNaN(bytes.readDoubleBE(index)))
        }
        expected = { kind: wire === null ? 'Null' : 'True' }
      } catch (caught) {
        const code = (caught as { code: string }).code
        expect(['22023', '22003']).toContain(code)
        expected = error(code)
      }
      const row: Row = {
        ...baseline,
        first_point: await point(pg, first),
        second_point: await point(pg, second),
        known_line: line(wire),
        expected: value(wire),
      }
      add('constructed', row, computedNan ? { kind: 'Unknown' } : expected)
      add('constructed_same', row, expected)
    }
    const first = await point(pg, '(Infinity,Infinity)'),
      second = await point(pg, '(0,0)')
    for (const name of ['recovered_horizontal', 'recovered_vertical'] as const) {
      const wire = (
        await pg.query<{ wire: string }>(
          `SELECT encode(${expressions[name].slice(0, -' = expected'.length)},'hex') wire FROM (SELECT '(Infinity,Infinity)'::point first_point,'(0,0)'::point second_point) inputs`,
        )
      ).rows[0]!.wire
      add(
        name,
        { ...baseline, first_point: first, second_point: second, expected: value(wire) },
        { kind: 'True' },
      )
    }
    for (const [left, right, expected] of [
      [{ kind: 'Unknown' }, { kind: 'Null' }, { kind: 'Unknown' }],
      [{ kind: 'Null' }, { kind: 'Unknown' }, { kind: 'Unknown' }],
      [error('22012'), { kind: 'Unknown' }, error('22012')],
      [{ kind: 'Unknown' }, error('22003'), error('22003')],
    ] as [Input, Input, Outcome][]) {
      add('constructed', { ...baseline, first_point: left, second_point: right }, expected)
    }
    await runCheckParity(
      directory,
      'lineinput',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  }, 600_000)
  it('unwraps unconstrained line domains while keeping enforced domains and qualified type names distinct', async () => {
    await pg.exec(`CREATE DOMAIN empty_axis AS line;
      CREATE DOMAIN nested_empty_axis AS empty_axis;
      CREATE DOMAIN horizontal_axis AS line CHECK (ishorizontal(VALUE));
      CREATE DOMAIN required_axis AS line NOT NULL;
      CREATE SCHEMA line_shadow;
      CREATE DOMAIN line_shadow.date AS line;
      CREATE TABLE line_domain_checks(source text,expected bytea,
        CONSTRAINT nested CHECK (line_send(source::nested_empty_axis) = expected),
        CONSTRAINT checked CHECK (line_send(source::horizontal_axis) = expected),
        CONSTRAINT required CHECK (line_send(source::required_axis) = expected),
        CONSTRAINT qualified CHECK (line_send(source::line_shadow.date) = expected),
        CONSTRAINT builtin_day CHECK (source::date IS NOT NULL))`)
    await expect(pg.query('SELECT $1::horizontal_axis', ['{1,0,0}'])).rejects.toMatchObject({
      code: '23514',
    })
    await expect(pg.query('SELECT $1::required_axis', [null])).rejects.toMatchObject({
      code: '23502',
    })
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'line_domain_checks')!
    const constraints = table.constraints.filter((constraint) => constraint.type === 'check')
    const group = prepareCheckRustGroup(
      constraints.map((constraint) => ({
        expression: lowerTableCheck(table, constraint, [], catalog.domains)!.expression,
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: constraint.name,
        },
      })),
    )
    for (const [index, check] of group.checks.entries())
      expect(check.kind, constraints[index]!.name).toBe('supported')
    const row: Row = {
      source: value('{1,-1,0}'),
      expected: value('3ff0000000000000bff00000000000000000000000000000'),
    }
    const fixtures = [
      { name: 'nested', row, expected: { kind: 'True' } as Outcome },
      { name: 'qualified', row, expected: { kind: 'True' } as Outcome },
      {
        name: 'nested',
        row: { ...row, source: value(null) },
        expected: { kind: 'Null' } as Outcome,
      },
      { name: 'nested', row: { ...row, source: value('{0,0,1}') }, expected: error('22P02') },
      {
        name: 'builtin_day',
        row: { ...row, source: value('2000-01-01') },
        expected: { kind: 'True' } as Outcome,
      },
      ...['checked', 'required'].flatMap((name) =>
        [null, '{1,-1,0}', '{bad,0,0}'].map((source) => ({
          name,
          row: { ...row, source: value(source) },
          expected: { kind: 'Unknown' } as Outcome,
        })),
      ),
    ]
    await mkdir(join(directory, 'domains'), { recursive: true })
    await runCheckParity(
      join(directory, 'domains'),
      'linedomains',
      group,
      constraints.map((constraint) => constraint.name),
      fixtures,
    )
  }, 120_000)
})
