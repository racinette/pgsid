import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { checkUnknownMessage } from '../../src/codegen/shared/check-diagnostics.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { circlePolygonTrigonometry } from '../../src/codegen/shared/check-trigonometry-context.js'
import {
  callableBoundary,
  trigonometryValueRequirements,
} from '../../scripts/check-measurements/catalog.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})
const circle = (wire: string | null): Input => {
  if (wire === null) return known(null)
  const b = Buffer.from(wire, 'hex')
  return known({ x: b.readBigInt64BE(), y: b.readBigInt64BE(8), radius: b.readBigInt64BE(16) })
}
const specimens = [
  'NULL::circle',
  "'<(0,0),0>'::circle",
  "'<(0,0),-0>'::circle",
  "'<(0,0),0.000001>'::circle",
  "'<(0,0),0.0000010000000000000002>'::circle",
  "'<(0,0),1>'::circle",
  "'<(3,4),2>'::circle",
  "'<(-0,-0),1>'::circle",
  "circle('(1,2)'::point,-2::float8)",
  "'<(1e308,1e308),1e308>'::circle",
  "'<(-1e308,0),1e308>'::circle",
  "'<(NaN,1),3>'::circle",
  "'<(0,0),NaN>'::circle",
  "'<(Infinity,-Infinity),2>'::circle",
  "'<(0,0),Infinity>'::circle",
  "circle('(0,0)'::point,'-Infinity'::float8)",
]

it('matches circle polygonization, native error order, casts and recursive arrays under an explicit PostgreSQL trig profile in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-circle-polygon-'))
  try {
    const calls = {
      counted: { sql: 'poly_send(polygon(n,c))', offset: 4, counted: true },
      default_count: { sql: 'poly_send(polygon(c))', offset: 4, counted: false },
      domain_cast: { sql: 'poly_send(c::nested_polygon)', offset: 4, counted: false },
      array_cast: { sql: 'poly_send((ARRAY[c]::polygon[])[1])', offset: 4, counted: false },
      domain_array_cast: {
        sql: 'poly_send((ARRAY[c]::nested_polygon[])[1])',
        offset: 4,
        counted: false,
      },
      nested_array_cast: {
        sql: 'poly_send(((ARRAY[ARRAY[c]::circle_batch]::polygon_batch[])[1])[1])',
        offset: 4,
        counted: false,
      },
      coalesced: {
        sql: "poly_send(COALESCE(polygon(n,c),'((0,0))'::polygon))",
        offset: 4,
        counted: true,
      },
      bounds: { sql: 'box_send(box(polygon(n,c)))', offset: 0, counted: true },
      roundtrip: { sql: 'float8send(radius(circle(polygon(n,c))))', offset: 0, counted: true },
      literal: { sql: "poly_send(polygon('<(0,0),1>'::circle))", offset: 4, counted: false },
    }
    const expressions: Record<string, string> = Object.fromEntries(
      Object.entries(calls).map(([name, call]) => [name, call.sql + '=expected']),
    )
    Object.assign(expressions, {
      count: 'npoints(polygon(n,c))=n',
      wire_size: 'length(poly_send(polygon(n,c)))=4+16*n',
      present: 'polygon(n,c) IS NOT NULL',
      lazy: 'CASE WHEN skip THEN true ELSE poly_send(polygon(n,c))=expected END',
    })
    await pg.exec(`CREATE DOMAIN measured_circle AS circle; CREATE DOMAIN nested_circle AS measured_circle;
      CREATE DOMAIN measured_polygon AS polygon; CREATE DOMAIN nested_polygon AS measured_polygon;
      CREATE DOMAIN circle_batch AS circle[]; CREATE DOMAIN polygon_batch AS polygon[];
      CREATE TABLE circle_polygon_checks(c nested_circle,n int4,expected bytea,skip boolean,
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')});
      CREATE TABLE native_cases(id int4 PRIMARY KEY,c circle,n int4);`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'circle_polygon_checks')!,
      constraints = Object.entries(expressions).flatMap(([name, sql]) => {
        const c = table.constraints.find((c) => c.name === name)!
        return [
          { ...c, name: name + '_raw', definition: `CHECK(${sql})` },
          { ...c, name: name + '_stored' },
        ]
      }),
      plans = constraints.map((c) => ({
        expression: lowerTableCheck(table, c, [], catalog.domains)!.expression,
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: c.name,
        },
      }))
    const functions = builtinCallables().filter(circlePolygonTrigonometry)
    expect(functions).toHaveLength(2)
    for (const fn of functions) {
      expect(trigonometryValueRequirements(fn)).toMatchObject([
        { kind: 'platform', owner: 'tests/sql-semantics/check-circle-polygon.test.ts' },
      ])
      expect(
        callableBoundary(
          fn,
          new Set(['pg_catalog.circle', 'pg_catalog.int4', 'pg_catalog.polygon']),
        ).categories,
      ).toContain('platform-setting:trigonometry')
    }
    expect(checkUnknownMessage(plans[0]!.expression)).toContain('trigonometry: fdlibm')
    expect(
      checkUnknownMessage(plans[0]!.expression, undefined, { trigonometry: 'fdlibm' }),
    ).not.toContain('trigonometry: fdlibm')
    const fixtures: { name: string; row: Row; expected: Outcome; withoutProfile: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome, withoutProfile: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + suffix, row, expected, withoutProfile })
    }
    let id = 0
    for (const sql of specimens) {
      const wire = (
          await pg.query<{ wire: string | null }>(`SELECT encode(circle_send(${sql}),'hex') wire`)
        ).rows[0]!.wire,
        input = circle(wire)
      let firstVertexError: Outcome | null = null
      try {
        await pg.query(
          `SELECT point((point(c))[0]-radius(c),(point(c))[1]+radius(c)*0::float8) FROM (SELECT ${sql} c) input`,
        )
      } catch (error) {
        firstVertexError = failure((error as { code: string }).code)
      }
      const withoutTrigonometry = (outcome: Outcome, nullable: boolean): Outcome => {
        if (nullable) return outcome
        if (
          outcome.kind === 'Error' &&
          ['0A000', '22023', '54000'].some((code) => parseInt(code, 36) === outcome.value.state)
        )
          return outcome
        return firstVertexError ?? { kind: 'Unknown' }
      }
      for (const n of [null, -1, 0, 1, 2, 3, 4, 11, 12, 17, 32, 129, 134217726, 2147483647]) {
        await pg.query(`INSERT INTO native_cases(id,c,n) VALUES($1,${sql},$2)`, [++id, n])
        const row: Row = { c: input, n: known(n), expected: known(null), skip: known(true) }
        for (const [name, call] of Object.entries(calls)) {
          let result: string | null = null,
            outcome: Outcome
          try {
            result = (
              await pg.query<{ wire: string | null }>(
                `SELECT encode(${call.sql},'hex') wire FROM native_cases WHERE id=$1`,
                [id],
              )
            ).rows[0]!.wire
            let nan = false
            if (result !== null) {
              const bytes = Buffer.from(result, 'hex')
              for (let at = call.offset; at < bytes.length; at += 8)
                nan ||= Number.isNaN(bytes.readDoubleBE(at))
            }
            outcome = { kind: result === null ? 'Null' : nan ? 'Unknown' : 'True' }
          } catch (e) {
            outcome = failure((e as { code: string }).code)
          }
          const withoutProfile: Outcome =
            name === 'literal'
              ? { kind: 'Unknown' }
              : withoutTrigonometry(outcome, wire === null || (call.counted && n === null))
          add(name, { ...row, expected: known(result) }, outcome, withoutProfile)
          if (name === 'counted') {
            add('lazy', { ...row, expected: known(result) }, { kind: 'True' }, { kind: 'True' })
            add(
              'lazy',
              { ...row, expected: known(result), skip: known(false) },
              outcome,
              withoutProfile,
            )
          }
        }
        for (const name of ['count', 'wire_size', 'present']) {
          let outcome: Outcome
          try {
            const value = (
              await pg.query<{ value: boolean | null }>(
                `SELECT ${expressions[name]} value FROM native_cases WHERE id=$1`,
                [id],
              )
            ).rows[0]!.value
            outcome = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
          } catch (e) {
            outcome = failure((e as { code: string }).code)
          }
          const withoutProfile = withoutTrigonometry(outcome, wire === null || n === null)
          add(name, row, outcome, withoutProfile)
        }
      }
    }
    const base: Row = {
      c: circle(
        (
          await pg.query<{ wire: string }>(
            "SELECT encode(circle_send('<(0,0),1>'::circle),'hex') wire",
          )
        ).rows[0]!.wire,
      ),
      n: known(12),
      expected: known('00'),
      skip: known(true),
    }
    add('counted', base, { kind: 'False' }, { kind: 'Unknown' })
    for (const state of [{ kind: 'Unknown' }, { kind: 'Null' }, failure('22012')] as Input[]) {
      for (const key of ['c', 'n']) {
        add('counted', { ...base, [key]: state }, state as Outcome, state as Outcome)
        add('lazy', { ...base, [key]: state }, { kind: 'True' }, { kind: 'True' })
      }
    }
    add(
      'counted',
      { ...base, n: failure('22012'), c: failure('22003') },
      failure('22012'),
      failure('22012'),
    )
    add(
      'counted',
      { ...base, n: { kind: 'Unknown' }, c: failure('22003') },
      failure('22003'),
      failure('22003'),
    )
    add(
      'counted',
      { ...base, n: known(null), c: failure('22003') },
      failure('22003'),
      failure('22003'),
    )
    add(
      'counted',
      { ...base, c: { kind: 'Unknown' }, expected: failure('22012') },
      { kind: 'Unknown' },
      { kind: 'Unknown' },
    )
    add('counted', { ...base, expected: failure('22012') }, failure('22012'), { kind: 'Unknown' })
    for (const profile of [true, false]) {
      const group = prepareCheckRustGroup(plans, profile ? { trigonometry: 'fdlibm' } : {})
      for (const check of group.checks)
        expect(check.kind, check.kind === 'unsupported' ? check.reason : '').toBe('supported')
      const directory = join(root, profile ? 'fdlibm' : 'unspecified')
      await mkdir(directory)
      await runCheckParity(
        directory,
        profile ? 'circlepolygon' : 'circlepolygonmissing',
        group,
        constraints.map((c) => c.name),
        fixtures.map((f) => ({
          name: f.name,
          row: f.row,
          expected: profile ? f.expected : f.withoutProfile,
        })),
      )
    }
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 360_000)
