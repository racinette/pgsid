import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
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

it('keeps every ordinary builtin geometry callable implemented and classifies server interfaces separately', async () => {
  const directory = 'crates/check-evaluator/src/operations/pg_catalog',
    sources = await Promise.all(
      (await readdir(directory))
        .filter((f) => f.endsWith('.rs'))
        .map((f) => readFile(join(directory, f), 'utf8')),
    ),
    geometry = new Set(
      ['point', 'line', 'lseg', 'box', 'path', 'polygon', 'circle'].map((t) => 'pg_catalog.' + t),
    ),
    missing = builtinCallables().filter(
      (f): f is FunctionMetadata =>
        f.kind === 'function' &&
        [...f.args, f.result].some((t) => geometry.has(t)) &&
        !sources.some((source) => source.includes(`pub fn ${f.rustName}(`)),
    )
  expect(missing.length).toBeGreaterThan(0)
  expect(
    missing.filter(
      (f) =>
        ![...f.args, f.result].some(
          (t) => t === 'pg_catalog.internal' || t === 'pg_catalog.cstring',
        ),
    ),
  ).toEqual([])
})

it('matches exact polygon directions, edge overlap, recursive containment, cached bounds and partial-input guards across targets', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-polygon-relations-'))
  try {
    const source = await readFile(
        'crates/check-evaluator/src/operations/pg_catalog/polygon_relations.rs',
        'utf8',
      ),
      functions = builtinCallables().filter(
        (f): f is FunctionMetadata =>
          f.kind === 'function' && source.includes(`pub fn ${f.rustName}(`),
      ),
      predicates = functions.filter((f) => f.result === 'pg_catalog.bool')
    expect(functions).toHaveLength(12)
    expect(predicates).toHaveLength(11)
    const calls = new Map(predicates.map((f) => [f.rustName, `pg_catalog.${f.name}(a,b)`])),
      identities = new Set(predicates.map(callableIdentity))
    for (const [i, op] of builtinCallables()
      .filter((f) => f.kind === 'operator' && identities.has(f.implementation))
      .entries()) {
      if (op.kind === 'operator') calls.set('alias_' + i, `a OPERATOR(pg_catalog.${op.name}) b`)
    }
    const expressions: Record<string, string> = Object.fromEntries(
      [...calls].map(([name, sql]) => [name, `(${sql})=expected`]),
    )
    Object.assign(expressions, {
      compressed: 'box_send(spg_poly_quad_compress(a))=wire',
      compressed_length: 'length(box_send(spg_poly_quad_compress(a)))=32',
      constructed_overlap: "(polygon(path(a)+'(0,0)'::point) && b)=expected",
      quantified: '(a << ANY(ARRAY[b]))=expected',
      safe_and: '(a << b) AND decision',
      unsafe_and: "(polygon(path(a)+'(1e308,1e308)'::point) << b) AND decision",
      lazy: 'CASE WHEN skip THEN true ELSE (a && b)=expected END',
      literal:
        "('((0,0),(4,0),(4,4),(0,4))'::polygon << '((4.000000000000001,0))'::polygon)=expected",
    })
    await pg.exec(`CREATE DOMAIN parcel_boundary AS polygon; CREATE DOMAIN imported_parcel AS parcel_boundary;
      CREATE TABLE polygon_relations(a imported_parcel,b polygon,expected boolean,wire bytea,skip boolean,decision boolean,
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')});
      CREATE TABLE native_polygons(id int PRIMARY KEY,shape polygon);`)
    const inputs: Input[] = [],
      wires: (string | null)[] = []
    for (const [i, sql] of polygonOperationCases.entries()) {
      await pg.query(`INSERT INTO native_polygons(id,shape) VALUES($1,${sql})`, [i])
      const r = (
        await pg.query<{ wire: string | null; bounds: string | null }>(
          "SELECT encode(poly_send(shape),'hex') wire,encode(box_send(box(shape)),'hex') bounds FROM native_polygons WHERE id=$1",
          [i],
        )
      ).rows[0]!
      inputs.push(knownPolygonOperationInput(r.wire, r.bounds))
      wires.push(r.bounds)
    }
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'polygon_relations')!,
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
        expected: known(true),
        wire: known(wires[4]!),
        skip: known(true),
        decision: known(false),
      },
      from =
        'FROM (SELECT a.shape a,b.shape b FROM native_polygons a,native_polygons b WHERE a.id=$1 AND b.id=$2) input'
    const native = async (sql: string, i: number, j: number): Promise<boolean | null | Outcome> => {
      try {
        return (await pg.query<{ value: boolean | null }>(`SELECT ${sql} value ${from}`, [i, j]))
          .rows[0]!.value
      } catch (e) {
        return failure((e as { code: string }).code)
      }
    }
    for (let i = 0; i < inputs.length; i++)
      for (let j = 0; j < inputs.length; j++) {
        const row = { ...base, a: inputs[i]!, b: inputs[j]! }
        for (const [name, sql] of [
          ...calls,
          ['constructed_overlap', "polygon(path(a)+'(0,0)'::point) && b"],
          ['quantified', 'a << ANY(ARRAY[b])'],
        ] as [string, string][]) {
          const result = await native(sql, i, j),
            expected: Outcome =
              typeof result === 'object' && result !== null
                ? result
                : { kind: result === null ? 'Null' : 'True' },
            complete = {
              ...row,
              expected: typeof result === 'object' ? known(null) : known(result),
            }
          add(name, complete, expected)
          if (i === 4 && j === 6 && typeof result === 'boolean')
            add(name, { ...row, expected: known(!result) }, { kind: 'False' })
          if (i === 15 || j === 15) {
            const omit = (input: Input): Input =>
              input.kind === 'Value' && typeof input.value === 'object' && 'points' in input.value
                ? known({ points: input.value.points })
                : input
            add(name, { ...complete, a: omit(row.a), b: omit(row.b) }, expected)
          }
        }
        const overlap = await native('a && b', i, j),
          expected: Outcome =
            typeof overlap === 'object' && overlap !== null
              ? overlap
              : { kind: overlap === null ? 'Null' : 'True' }
        add(
          'lazy',
          {
            ...row,
            skip: known(false),
            expected: typeof overlap === 'object' ? known(null) : known(overlap),
          },
          expected,
        )
        add('lazy', row, { kind: 'True' })
      }
    for (const [i, a] of inputs.entries()) {
      add(
        'compressed',
        { ...base, a, wire: known(wires[i]!) },
        { kind: a.kind === 'Null' ? 'Null' : 'True' },
      )
      add('compressed_length', { ...base, a }, { kind: a.kind === 'Null' ? 'Null' : 'True' })
    }
    const ambiguous = inputs[15]!
    if (
      ambiguous.kind !== 'Value' ||
      typeof ambiguous.value !== 'object' ||
      !('points' in ambiguous.value)
    )
      throw Error('Missing signed-zero shape')
    add(
      'compressed',
      { ...base, a: known({ points: ambiguous.value.points }), wire: known(wires[15]!) },
      { kind: 'Unknown' },
    )
    add(
      'compressed_length',
      { ...base, a: known({ points: ambiguous.value.points }) },
      { kind: 'True' },
    )
    add('literal', base, { kind: 'True' })
    for (const state of [{ kind: 'Unknown' }, { kind: 'Null' }, failure('22012')] as Input[]) {
      add('lazy', { ...base, a: state, b: failure('22003') }, { kind: 'True' })
      for (const [name] of calls) {
        add(name, { ...base, a: state }, state as Outcome)
        add(name, { ...base, b: state }, state as Outcome)
        add(name, { ...base, a: failure('22012'), b: failure('22003') }, failure('22012'))
        add(name, { ...base, a: { kind: 'Unknown' }, b: failure('22003') }, failure('22003'))
      }
    }
    add('safe_and', { ...base, a: { kind: 'Unknown' } }, { kind: 'False' })
    add('safe_and', { ...base, b: { kind: 'Unknown' } }, { kind: 'False' })
    add('safe_and', { ...base, a: failure('22012') }, failure('22012'))
    add('unsafe_and', { ...base, a: { kind: 'Unknown' } }, { kind: 'Unknown' })
    await runCheckParity(
      root,
      'polygonrelations',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 360_000)
