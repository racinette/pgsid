import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { callableIdentity, type FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
import {
  polygonOperationCases,
  knownPolygonOperationInput,
} from './check-polygon-operation-cases.js'
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
const points = [
  "'(0,0)'::point",
  "'(2,2)'::point",
  "'(2,3)'::point",
  "'(5,5)'::point",
  "'(0.3,4.9)'::point",
  "'(-0.0000005,2)'::point",
  "'(NaN,1)'::point",
  "'(Infinity,0)'::point",
  "'(1e308,1e308)'::point",
  "'(1e-320,0)'::point",
  'NULL::point',
]
const circles = [
  "'<(0,0),1>'::circle",
  "'<(3,4),2>'::circle",
  "circle('(0,0)'::point,'-2'::float8)",
  "circle('(0,0)'::point,'-Infinity'::float8)",
  "'<(0,0),Infinity>'::circle",
  "'<(0,0),NaN>'::circle",
  "'<(NaN,1),2>'::circle",
  "'<(1e308,1e308),1e308>'::circle",
  'NULL::circle',
]

it('matches polygon area distances, rounded edge projections, ordered failures and composed partial values across targets', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-polygon-distance-'))
  try {
    const source = await readFile(
        'crates/check-evaluator/src/operations/pg_catalog/polygon_distance.rs',
        'utf8',
      ),
      functions = builtinCallables().filter(
        (f): f is FunctionMetadata =>
          f.kind === 'function' && source.includes(`pub fn ${f.rustName}(`),
      ),
      calls = new Map<string, { sql: string; inputs: string[] }>()
    expect(functions).toHaveLength(5)
    for (const f of functions) {
      const inputs = f.args.map((type, i) =>
        type === 'pg_catalog.point'
          ? 'p'
          : type === 'pg_catalog.circle'
            ? 'c'
            : f.args[0] === 'pg_catalog.polygon' && i === 1
              ? 'b'
              : 'a',
      )
      calls.set(f.rustName, { sql: `pg_catalog.${f.name}(${inputs.join(',')})`, inputs })
    }
    const identities = new Set(functions.map(callableIdentity))
    for (const [i, op] of builtinCallables()
      .filter((f) => f.kind === 'operator' && identities.has(f.implementation))
      .entries()) {
      if (op.kind !== 'operator') continue
      const f = functions.find((f) => callableIdentity(f) === op.implementation)!,
        call = calls.get(f.rustName)!
      calls.set('alias_' + i, {
        ...call,
        sql: `${call.inputs[0]} OPERATOR(pg_catalog.${op.name}) ${call.inputs[1]}`,
      })
    }
    expect(calls.size).toBe(10)
    calls.set('array_distance', {
      sql: 'poly_distance((ARRAY[a,b])[1],(ARRAY[a,b])[2])',
      inputs: ['a', 'b'],
    })
    calls.set('constructed_distance', {
      sql: "dist_ppoly(p,polygon(path(a)+'(0,0)'::point))",
      inputs: ['p', 'a'],
    })
    calls.set('nan_distance', {
      sql: "dist_ppoly(p,polygon(path(a)+point('NaN'::float8,0::float8)))",
      inputs: ['p', 'a'],
    })
    const expressions: Record<string, string> = {}
    for (const [name, call] of calls) {
      expressions[name + '_value'] = `(${call.sql})=target`
      expressions[name + '_wire'] = `float8send(${call.sql})=wire`
    }
    expressions.lazy = 'CASE WHEN skip THEN true ELSE float8send(poly_distance(a,b))=wire END'
    await pg.exec(`CREATE DOMAIN parcel_outline AS polygon; CREATE DOMAIN imported_outline AS parcel_outline;
      CREATE TABLE polygon_distances(a imported_outline,b polygon,p point,c circle,target float8,wire bytea,skip boolean,
        ${Object.entries(expressions)
          .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
          .join(',')});
      CREATE TABLE native_polygons(id int PRIMARY KEY,shape polygon)`)
    const polygons = [...polygonOperationCases, "'((0.1,0.3),(2.7,1.9),(0.8,5.2))'::polygon"],
      inputs: Input[] = []
    for (const [i, sql] of polygons.entries()) {
      await pg.query(`INSERT INTO native_polygons VALUES($1,${sql})`, [i])
      const r = (
        await pg.query<{ wire: string | null; bounds: string | null }>(
          "SELECT encode(poly_send(shape),'hex') wire,encode(box_send(box(shape)),'hex') bounds FROM native_polygons WHERE id=$1",
          [i],
        )
      ).rows[0]!
      inputs.push(knownPolygonOperationInput(r.wire, r.bounds))
    }
    const carriers = async (specimens: string[], circle: boolean): Promise<Input[]> => {
        const result: Input[] = []
        for (const sql of specimens) {
          const wire = (
            await pg.query<{ wire: string | null }>(
              `SELECT encode(${circle ? 'circle_send' : 'point_send'}(${sql}),'hex') wire`,
            )
          ).rows[0]!.wire
          if (wire === null) result.push(known(null))
          else {
            const bytes = Buffer.from(wire, 'hex'),
              x = bytes.readBigInt64BE(),
              y = bytes.readBigInt64BE(8)
            result.push(known(circle ? { x, y, radius: bytes.readBigInt64BE(16) } : { x, y }))
          }
        }
        return result
      },
      pointInputs = await carriers(points, false),
      circleInputs = await carriers(circles, true),
      catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'polygon_distances')!,
      constraints = Object.entries(expressions).flatMap(([name, sql]) => {
        const c = table.constraints.find((c) => c.name === name)!
        return [
          { ...c, name: name + '_raw', definition: `CHECK(${sql})` },
          { ...c, name: name + '_stored' },
        ]
      }),
      group = prepareCheckRustGroup(
        constraints.map((c) => ({
          expression: lowerTableCheck(table, c, [], catalog.domains)!.expression,
          identity: { schema: 'public', kind: 'table', owner: table.name, constraint: c.name },
        })),
      )
    for (const check of group.checks)
      expect(check.kind, check.kind === 'unsupported' ? check.reason : '').toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      add = (name: string, row: Row, expected: Outcome) => {
        for (const suffix of ['raw', 'stored'])
          fixtures.push({ name: name + '_' + suffix, row, expected })
      },
      base: Row = {
        a: inputs[4]!,
        b: inputs[6]!,
        p: pointInputs[0]!,
        c: circleInputs[0]!,
        target: known(0n),
        wire: known('0000000000000000'),
        skip: known(true),
      }
    for (const [name, call] of calls)
      for (let i = 0; i < inputs.length; i++)
        for (const j of call.inputs.includes('b') ? inputs.keys() : [6])
          for (const k of call.inputs.includes('p') ? points.keys() : [0])
            for (const l of call.inputs.includes('c') ? circles.keys() : [0]) {
              let wire: string | null = null,
                expected: Outcome
              try {
                wire = (
                  await pg.query<{ wire: string | null }>(
                    `SELECT encode(float8send(${call.sql}),'hex') wire
                  FROM (SELECT a.shape a,b.shape b,${points[k]} p,${circles[l]} c
                    FROM native_polygons a,native_polygons b WHERE a.id=$1 AND b.id=$2) input`,
                    [i, j],
                  )
                ).rows[0]!.wire
                expected = { kind: wire === null ? 'Null' : 'True' }
              } catch (e) {
                expected = failure((e as { code: string }).code)
              }
              const bytes = wire === null ? null : Buffer.from(wire, 'hex'),
                row = {
                  ...base,
                  a: inputs[i]!,
                  b: inputs[j]!,
                  p: pointInputs[k]!,
                  c: circleInputs[l]!,
                  target: known(bytes?.readBigInt64BE() ?? null),
                  wire: known(wire),
                }
              add(name + '_value', row, expected)
              add(
                name + '_wire',
                row,
                bytes !== null && Number.isNaN(bytes.readDoubleBE())
                  ? { kind: 'Unknown' }
                  : expected,
              )
              if (name === 'sql__pg_catalog__poly_distance__hh70') {
                add(
                  'lazy',
                  { ...row, skip: known(false) },
                  bytes !== null && Number.isNaN(bytes.readDoubleBE())
                    ? { kind: 'Unknown' }
                    : expected,
                )
                if (i === 15 || j === 15) {
                  const omit = (v: Input): Input =>
                    v.kind === 'Value' && typeof v.value === 'object' && 'points' in v.value
                      ? known({ points: v.value.points })
                      : v
                  add(name + '_value', { ...row, a: omit(row.a), b: omit(row.b) }, expected)
                }
              }
              if (
                i === 4 &&
                j === 6 &&
                k === 0 &&
                l === 0 &&
                bytes !== null &&
                !Number.isNaN(bytes.readDoubleBE())
              )
                add(
                  name + '_value',
                  { ...row, target: known(0x7ff0000000000000n) },
                  { kind: 'False' },
                )
            }
    for (const state of [{ kind: 'Unknown' }, { kind: 'Null' }, failure('22012')] as Input[]) {
      add('lazy', { ...base, a: state, b: failure('22003') }, { kind: 'True' })
      for (const [name, call] of calls) {
        for (const input of call.inputs) {
          add(name + '_value', { ...base, [input]: state }, state as Outcome)
          add(name + '_wire', { ...base, [input]: state }, state as Outcome)
        }
        add(
          name + '_value',
          { ...base, [call.inputs[0]!]: failure('22012'), [call.inputs[1]!]: failure('22003') },
          failure('22012'),
        )
        add(
          name + '_value',
          { ...base, [call.inputs[0]!]: { kind: 'Unknown' }, [call.inputs[1]!]: failure('22003') },
          failure('22003'),
        )
      }
    }
    await runCheckParity(
      root,
      'polygondistances',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 360_000)
