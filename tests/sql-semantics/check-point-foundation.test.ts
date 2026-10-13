import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
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

const value = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})
const points: (string | null)[] = [
  '(0,0)',
  '(-0,-0)',
  '(1,2)',
  '(-1,-2)',
  '(0.0000005,-0.0000005)',
  '(0.000001,0.000001)',
  '(0.0000010000000002,0)',
  '(5e-324,0)',
  '(1e308,-1e308)',
  '(Infinity,0)',
  '(-Infinity,0)',
  '(Infinity,Infinity)',
  '(NaN,0)',
  '(NaN,0.0000005)',
  '(0,NaN)',
  '(NaN,NaN)',
  null,
]
const expressions = {
  present: '(first_point IS NOT NULL) = recorded_equal',
  constructed: 'point_send(point(x,y)) = recorded_wire',
  stored: 'point_send(first_point) = recorded_wire',
  equal: 'point_eq(first_point,second_point) = recorded_equal',
  unequal: 'point_ne(first_point,second_point) = recorded_equal',
  alias: '(first_point ~= second_point) = recorded_equal',
  selected:
    'point_send(CASE WHEN choose_first THEN first_point ELSE second_point END) = recorded_wire',
  coalesced: 'point_send(COALESCE(first_point,second_point)) = recorded_wire',
  typed_null:
    'point_send(CASE WHEN choose_first THEN first_point ELSE NULL::point END) = recorded_wire',
}

describe('portable point value foundation', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-point-foundation-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('preserves SQL-coerced point bits, constructor arguments, geometric equality, domains, searched CASE, COALESCE, typed NULL and value states', async () => {
    await pg.exec(
      `CREATE DOMAIN survey_point AS point; CREATE TABLE point_checks(first_point survey_point,second_point point,x float8,y float8,recorded_equal bool,recorded_wire bytea,choose_first bool,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((table) => table.name === 'point_checks')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const stored = table.constraints.find((constraint) => constraint.name === name)!
      return [
        { ...stored, name: name + '_raw', definition: `CHECK (${sql})` },
        { ...stored, name: name + '_stored' },
      ]
    })
    const group = prepareCheckRustGroup(
      constraints.map((constraint) => {
        const expression = lowerTableCheck(table, constraint, [], catalog.domains)!.expression
        expect(expression.kind, constraint.name).not.toBe('uncertain')
        return {
          expression,
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: constraint.name,
          },
        }
      }),
    )
    for (const [index, check] of group.checks.entries())
      expect(check.kind, constraints[index]!.name).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + suffix, row, expected })
    }
    const decoded = new Map<
      string | null,
      { input: Input; wire: string | null; x: Input; y: Input }
    >()
    for (const point of points) {
      const wire = (
        await pg.query<{ wire: string | null }>("SELECT encode(point_send($1::point),'hex') wire", [
          point,
        ])
      ).rows[0]!.wire
      const bytes = wire === null ? null : Buffer.from(wire, 'hex'),
        x = bytes?.readBigInt64BE() ?? null,
        y = bytes?.readBigInt64BE(8) ?? null
      decoded.set(point, {
        input: value(x === null || y === null ? null : { x, y }),
        wire,
        x: value(x),
        y: value(y),
      })
    }
    for (const first of points)
      for (const second of points) {
        const a = decoded.get(first)!,
          b = decoded.get(second)!
        const equal = (
          await pg.query<{ value: boolean | null }>('SELECT point_eq($1::point,$2::point) value', [
            first,
            second,
          ])
        ).rows[0]!.value
        const row: Row = {
          first_point: a.input,
          second_point: b.input,
          x: a.x,
          y: a.y,
          recorded_equal: value(equal),
          recorded_wire: value(a.wire),
          choose_first: value(true),
        }
        const expected: Outcome = { kind: a.wire === null ? 'Null' : 'True' }
        add('stored', row, expected)
        add('constructed', row, expected)
        if (second === null) {
          add('present', { ...row, recorded_equal: value(first !== null) }, { kind: 'True' })
          add('present', { ...row, recorded_equal: value(first === null) }, { kind: 'False' })
        }
        for (const name of ['equal', 'alias'])
          add(name, row, { kind: equal === null ? 'Null' : 'True' })
        add(
          'unequal',
          { ...row, recorded_equal: value(equal === null ? null : !equal) },
          { kind: equal === null ? 'Null' : 'True' },
        )
        if (equal !== null)
          for (const name of ['equal', 'alias'])
            add(name, { ...row, recorded_equal: value(!equal) }, { kind: 'False' })
        for (const choose of [false, true]) {
          const wire = choose ? a.wire : b.wire
          add(
            'selected',
            { ...row, choose_first: value(choose), recorded_wire: value(wire) },
            { kind: wire === null ? 'Null' : 'True' },
          )
          add(
            'typed_null',
            { ...row, choose_first: value(choose) },
            { kind: choose && a.wire !== null ? 'True' : 'Null' },
          )
        }
        const wire = a.wire ?? b.wire
        add(
          'coalesced',
          { ...row, recorded_wire: value(wire) },
          { kind: wire === null ? 'Null' : 'True' },
        )
      }
    const baseline: Row = {
      first_point: decoded.get('(1,2)')!.input,
      second_point: decoded.get('(1,2)')!.input,
      x: decoded.get('(1,2)')!.x,
      y: decoded.get('(1,2)')!.y,
      recorded_equal: value(true),
      recorded_wire: value(decoded.get('(1,2)')!.wire),
      choose_first: value(true),
    }
    for (const state of [{ kind: 'Null' }, { kind: 'Unknown' }, error('22012')] as Input[]) {
      add(
        'present',
        { ...baseline, first_point: state },
        state.kind === 'Null' ? { kind: 'False' } : (state as Outcome),
      )
      for (const field of ['first_point', 'second_point'])
        add('equal', { ...baseline, [field]: state }, state as Outcome)
      for (const field of ['x', 'y'])
        add('constructed', { ...baseline, [field]: state }, state as Outcome)
      add(
        'typed_null',
        { ...baseline, first_point: state, choose_first: value(false) },
        { kind: 'Null' },
      )
      add(
        'selected',
        { ...baseline, first_point: state, choose_first: value(false) },
        { kind: 'True' },
      )
      if (state.kind !== 'Error')
        add(
          'equal',
          { ...baseline, first_point: state, second_point: error('22003') },
          error('22003'),
        )
    }
    for (const x of [0n, -9223372036854775808n, 0x7ff8000000000001n, 0x7ff0000000000001n, -1n]) {
      const wire = BigInt.asUintN(64, x).toString(16).padStart(16, '0') + '8000000000000000'
      add(
        'stored',
        {
          ...baseline,
          first_point: value({ x, y: -9223372036854775808n }),
          recorded_wire: value(wire),
        },
        { kind: 'True' },
      )
    }
    await runCheckParity(
      directory,
      'pointfoundation',
      group,
      constraints.map((constraint) => constraint.name),
      fixtures,
    )
  }, 300_000)
})
