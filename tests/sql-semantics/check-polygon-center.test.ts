import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
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
const polygons = [
  null,
  '((0,0))',
  '((-0,-0))',
  '((1,2))',
  '((0,0),(6,0))',
  '((0,0),(2,0),(0,2))',
  '((0,0),(4,0),(4,4),(0,4))',
  '((0,0),(4,0),(4,4),(2,2),(0,4))',
  '((0,0),(4,4),(0,4),(4,0))',
  '((0,0),(0,0),(6,0))',
  '((1e16,0),(1,0),(-1e16,0))',
  '((1e16,0),(-1e16,0),(1,0))',
  '((1e308,0),(-1e308,0))',
  '((1e308,0),(1e308,0),(-1e308,0))',
  '((1e-320,0),(0,1e-320))',
  '((5e-324,0),(0,0))',
  '((Infinity,0))',
  '((Infinity,1),(-Infinity,2))',
  '((NaN,1),(0,2))',
  '((0,NaN),(0,0))',
  '((NaN,NaN))',
]

it('matches polygon mean centers and radii, catalog casts, ordered overflow, NaN precision and lazy composition in all targets', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-polygon-center-'))
  try {
    const wireCalls: Record<string, string> = {
      circle_call: 'circle_send(circle(a))',
      circle_cast: 'circle_send(a::measured_circle)',
      point_call: 'point_send(point(a))',
      point_cast: 'point_send(a::measured_point)',
      center_call: 'point_send(poly_center(a))',
      center_operator: 'point_send(@@ a)',
      nested_array: 'point_send((ARRAY[point(a)])[1])',
      selected: 'point_send(CASE WHEN skip THEN point(a) ELSE point(b) END)',
      coalesced: 'point_send(COALESCE(point(a),point(b)))',
      lazy: 'point_send(point(a))',
      runtime_text: 'point_send(input::nested_shape::point)',
      literal: "point_send('((0,0),(2,0),(0,2))'::polygon::point)",
    }
    const expressions: Record<string, string> = Object.fromEntries(
      Object.entries(wireCalls).map(([name, call]) => [
        name,
        name === 'lazy' ? `CASE WHEN skip THEN true ELSE ${call}=expected END` : `${call}=expected`,
      ]),
    )
    Object.assign(expressions, {
      circle_semantic: 'circle(a) ~= expected_circle',
      point_semantic: 'point(a) ~= expected_point',
      center_consistent: 'point(a) ~= point(circle(a))',
      radius_semantic: 'radius(circle(a))=expected_radius',
      present: 'circle(a) IS NOT NULL',
      circle_length: 'length(circle_send(circle(a)))=24',
      point_length: 'length(point_send(point(a)))=16',
    })
    await pg.exec(`CREATE DOMAIN shape AS polygon; CREATE DOMAIN nested_shape AS shape;
      CREATE DOMAIN measured_circle AS circle; CREATE DOMAIN measured_point AS point;
      CREATE TABLE polygon_centers(a nested_shape,b polygon,input text,expected bytea,
      expected_circle circle,expected_point point,expected_radius float8,skip boolean,
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'polygon_centers')!,
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
      zero = known({ points: [{ x: 0n, y: 0n }] }),
      base: Row = {
        a: zero,
        b: zero,
        input: known('((0,0))'),
        skip: known(true),
        expected: known('00'),
        expected_circle: known({ x: 0n, y: 0n, radius: 0n }),
        expected_point: known({ x: 0n, y: 0n }),
        expected_radius: known(0n),
      }
    for (const input of polygons) {
      const hex = (
        await pg.query<{ wire: string | null }>(
          "SELECT encode(poly_send($1::polygon),'hex') wire",
          [input],
        )
      ).rows[0]!.wire
      let a = known(null)
      if (hex !== null) {
        const bytes = Buffer.from(hex, 'hex'),
          points = []
        for (let at = 4; at < bytes.length; at += 16)
          points.push({ x: bytes.readBigInt64BE(at), y: bytes.readBigInt64BE(at + 8) })
        a = known({ points })
      }
      const row = { ...base, a, input: known(input) },
        native = `FROM (SELECT $1::polygon a,'((0,0))'::polygon b,true skip,$1::text input) inputs`
      for (const [name, call] of Object.entries(wireCalls)) {
        let wire: string | null = null,
          outcome: Outcome
        try {
          wire = (
            await pg.query<{ wire: string | null }>(`SELECT encode(${call},'hex') wire ${native}`, [
              input,
            ])
          ).rows[0]!.wire
          let nan = false
          if (wire !== null) {
            const bytes = Buffer.from(wire, 'hex')
            for (let at = 0; at < bytes.length; at += 8)
              nan ||= Number.isNaN(bytes.readDoubleBE(at))
          }
          outcome = { kind: wire === null ? 'Null' : nan ? 'Unknown' : 'True' }
        } catch (error) {
          outcome = failure((error as { code: string }).code)
        }
        add(name, { ...row, expected: known(wire) }, name === 'lazy' ? { kind: 'True' } : outcome)
        if (name === 'circle_call' || name === 'point_call') {
          const bytes = wire === null ? null : Buffer.from(wire, 'hex'),
            semantic = name === 'circle_call' ? 'circle_semantic' : 'point_semantic',
            key = name === 'circle_call' ? 'expected_circle' : 'expected_point'
          let payload = known(null)
          if (bytes !== null) {
            const center = { x: bytes.readBigInt64BE(), y: bytes.readBigInt64BE(8) }
            payload = known(
              name === 'circle_call' ? { ...center, radius: bytes.readBigInt64BE(16) } : center,
            )
          }
          add(
            semantic,
            { ...row, [key]: payload },
            outcome.kind === 'Unknown' ? { kind: 'True' } : outcome,
          )
          if (name === 'circle_call')
            add(
              'radius_semantic',
              {
                ...row,
                expected_radius: bytes === null ? known(null) : known(bytes.readBigInt64BE(16)),
              },
              outcome.kind === 'Unknown' ? { kind: 'True' } : outcome,
            )
        }
      }
      for (const name of ['present', 'center_consistent', 'circle_length', 'point_length']) {
        let outcome: Outcome
        try {
          const value = (
            await pg.query<{ value: boolean | null }>(
              `SELECT ${expressions[name]} value ${native}`,
              [input],
            )
          ).rows[0]!.value
          outcome = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
        } catch (error) {
          outcome = failure((error as { code: string }).code)
        }
        add(name, row, outcome)
      }
    }
    for (const state of [{ kind: 'Unknown' }, { kind: 'Null' }, failure('22012')] as Input[]) {
      for (const name of [
        'circle_call',
        'point_call',
        'center_call',
        'center_operator',
        'circle_cast',
        'point_cast',
        'circle_length',
        'point_length',
        'nested_array',
      ])
        add(name, { ...base, a: state }, state as Outcome)
      add('lazy', { ...base, a: state }, { kind: 'True' })
      add('lazy', { ...base, a: state, skip: known(false) }, state as Outcome)
      for (const name of ['selected', 'coalesced'])
        add(
          name,
          { ...base, b: state, expected: known('00000000000000000000000000000000') },
          { kind: 'True' },
        )
    }
    const overflow = known({
      points: [
        { x: 0x7fe1ccf385ebc8a0n, y: 0n },
        { x: -0x1e330c7a143760n, y: 0n },
      ],
    })
    add('lazy', { ...base, a: overflow }, { kind: 'True' })
    add('lazy', { ...base, a: overflow, skip: known(false) }, failure('22003'))
    add('point_call', { ...base, a: zero, expected: failure('22012') }, failure('22012'))
    add(
      'point_call',
      { ...base, a: failure('22003'), expected: failure('22012') },
      failure('22003'),
    )
    await runCheckParity(
      root,
      'polygoncenter',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 360_000)
