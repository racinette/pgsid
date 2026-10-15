import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { callableIdentity, type FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (state: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(state, 36) },
})
const path = (wire: string | null): Input => {
  if (wire === null) return known(null)
  const bytes = Buffer.from(wire, 'hex'),
    points: { x: bigint; y: bigint }[] = []
  expect(bytes.length).toBe(5 + bytes.readInt32BE(1) * 16)
  for (let i = 5; i < bytes.length; i += 16)
    points.push({ x: bytes.readBigInt64BE(i), y: bytes.readBigInt64BE(i + 8) })
  return known({ closed: bytes[0] === 1, points })
}
const serial = (sql: string, type: string): string =>
  type === 'pg_catalog.bytea'
    ? sql
    : `${({ 'pg_catalog.path': 'path_send', 'pg_catalog.int4': 'int4send', 'pg_catalog.float8': 'float8send', 'pg_catalog.bool': 'boolsend' } as Record<string, string>)[type]}(${sql})`
const paths = [
  "'[(0,0)]'::path",
  "'((0,0))'::path",
  "'[(0,0),(3,4)]'::path",
  "'((0,0),(3,4))'::path",
  "'((0,0),(3,0),(3,4))'::path",
  "'[(3,4),(0,0)]'::path",
  "'((-0,0),(-0,-0))'::path",
  "'[(NaN,1),(2,NaN)]'::path",
  "'[(NaN,1),(NaN,NaN),(0,0),(3,4)]'::path",
  "'((Infinity,-Infinity),(1,2))'::path",
  "'((1e308,1e308),(-1e308,-1e308))'::path",
  "'((1e-320,0),(0,1e-320))'::path",
  'NULL::path',
]
let pg: PGlite, directory: string
beforeAll(async () => {
  pg = await PGlite.create()
  directory = await mkdtemp(join(tmpdir(), 'pgsid-path-'))
})
afterAll(async () => {
  if (pg && !pg.closed) await pg.close()
  if (directory) await rm(directory, { recursive: true, force: true })
})

it('matches point/path and path/path distances, closing edges, no-segment results, NaN selection and reached errors in Rust, Go and TypeScript', async () => {
  const source = await readFile(
    'crates/check-evaluator/src/operations/pg_catalog/path_distance.rs',
    'utf8',
  )
  const functions = builtinCallables().filter(
    (fn): fn is FunctionMetadata =>
      fn.kind === 'function' && source.includes(`pub fn ${fn.rustName}(`),
  )
  expect(functions).toHaveLength(3)
  const calls = new Map<
    string,
    { sql: string; result: string; inputs: string[]; computed: boolean }
  >()
  for (const fn of functions) {
    const inputs = fn.args.map((type, index) =>
      type === 'pg_catalog.point'
        ? 'p'
        : index === 0 || fn.args[0] === 'pg_catalog.point'
          ? 'a'
          : 'b',
    )
    calls.set(fn.rustName, {
      sql: `pg_catalog."${fn.name}"(${inputs.join(',')})`,
      result: fn.result,
      inputs,
      computed: true,
    })
  }
  const identities = new Set(functions.map(callableIdentity))
  for (const [index, op] of builtinCallables()
    .filter((fn) => fn.kind === 'operator' && identities.has(fn.implementation))
    .entries()) {
    if (op.kind !== 'operator') continue
    const fn = functions.find((fn) => callableIdentity(fn) === op.implementation)!,
      base = calls.get(fn.rustName)!
    calls.set(`operator_${index}`, {
      ...base,
      sql:
        op.left === null
          ? `OPERATOR(pg_catalog.${op.name}) a`
          : op.right === null
            ? `a OPERATOR(pg_catalog.${op.name})`
            : `${base.inputs[0]} OPERATOR(pg_catalog.${op.name}) ${base.inputs[1]}`,
    })
  }
  calls.set('computed_path_distance', {
    sql: "dist_ppath(p,a+point('NaN'::float8,0::float8))",
    result: 'pg_catalog.float8',
    inputs: ['p', 'a'],
    computed: true,
  })
  calls.set('computed_path_pair_distance', {
    sql: "path_distance(a+point('NaN'::float8,0::float8),b)",
    result: 'pg_catalog.float8',
    inputs: ['a', 'b'],
    computed: true,
  })
  calls.set('semantic_computed_nan', {
    sql: "dist_ppath(p,a+point('NaN'::float8,0::float8))='NaN'::float8",
    result: 'pg_catalog.bool',
    inputs: ['p', 'a'],
    computed: false,
  })
  calls.set('semantic_pair_nan', {
    sql: "path_distance(a+point('NaN'::float8,0::float8),b)='NaN'::float8",
    result: 'pg_catalog.bool',
    inputs: ['a', 'b'],
    computed: false,
  })
  const expressions: Record<string, string> = Object.fromEntries(
    [...calls].map(([name, call]) => [name, `${serial(call.sql, call.result)}=expected`]),
  )
  Object.assign(expressions, {
    selected: 'path_send(CASE WHEN skip THEN a ELSE b END)=expected',
    coalesced: 'path_send(COALESCE(a,b))=expected',
    nullified: 'NULLIF(a,b) IS NULL',
    absent: 'a IS NULL',
    present: 'a IS NOT NULL',
    null_literal: 'path_send(NULL::path) IS NULL',
    lazy: 'CASE WHEN skip THEN true ELSE path_send(a)=expected END',
    is_distinct: 'a IS DISTINCT FROM b',
    copied: 'path_send(COALESCE(popen(a),pclose(b)))=expected',
  })
  await pg.exec(`CREATE DOMAIN distance_path_domain AS path; CREATE DOMAIN nested_distance_path AS distance_path_domain;
    CREATE TABLE path_distance_checks(a nested_distance_path,b path,p point,original bytea,expected bytea,skip boolean,${Object.entries(
      expressions,
    )
      .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
      .join(',')})`)
  const catalog = await snapshotCatalog(pg),
    table = catalog.tables.find((t) => t.name === 'path_distance_checks')!
  const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
    const c = table.constraints.find((c) => c.name === name)!
    return [
      { ...c, name: name + '_raw', definition: `CHECK(${sql})` },
      { ...c, name: name + '_stored' },
    ]
  })
  const group = prepareCheckRustGroup(
    constraints.map((c) => ({
      expression: lowerTableCheck(table, c, [], catalog.domains)!.expression,
      identity: { schema: 'public', kind: 'table', owner: table.name, constraint: c.name },
    })),
  )
  for (const [index, check] of group.checks.entries())
    expect(
      check.kind,
      constraints[index]!.name + (check.kind === 'unsupported' ? ': ' + check.reason : ''),
    ).toBe('supported')
  const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
    values = new Map<string, Input>(),
    wires = new Map<string, string | null>()
  const add = (name: string, row: Row, expected: Outcome) => {
    for (const suffix of ['raw', 'stored'])
      fixtures.push({ name: name + '_' + suffix, row, expected })
  }
  for (const sql of paths) {
    const wire = (
      await pg.query<{ wire: string | null }>(`SELECT encode(path_send(${sql}),'hex') wire`)
    ).rows[0]!.wire
    values.set(sql, path(wire))
    wires.set(sql, wire)
  }
  const vectors = [
    "'(1,2)'::point",
    "'(0,0)'::point",
    "'(-0,0)'::point",
    "'(NaN,1)'::point",
    "'(1,NaN)'::point",
    "'(Infinity,1)'::point",
    "'(1,-Infinity)'::point",
    "'(1e-320,0)'::point",
    "'(1e308,1e308)'::point",
    'NULL::point',
  ]
  const pointValues = new Map<string, Input>()
  for (const vector of vectors) {
    const wire = (
      await pg.query<{ wire: string | null }>(`SELECT encode(point_send(${vector}),'hex') wire`)
    ).rows[0]!.wire
    const bytes = wire === null ? null : Buffer.from(wire, 'hex')
    pointValues.set(
      vector,
      bytes === null
        ? known(null)
        : known({ x: bytes.readBigInt64BE(), y: bytes.readBigInt64BE(8) }),
    )
  }
  const base: Row = {
    p: known({ x: 0x3ff0000000000000n, y: 0x4000000000000000n }),
    a: values.get(paths[2]!)!,
    b: values.get(paths[4]!)!,
    expected: known(wires.get(paths[2]!)!),
    skip: known(true),
  }
  for (const [name, call] of calls)
    for (const a of paths)
      for (const b of call.inputs.includes('b') ? paths : [paths[2]!])
        for (const vector of call.inputs.includes('p') ? vectors : [vectors[0]!]) {
          let expected: Outcome,
            wire: string | null = null
          try {
            wire = (
              await pg.query<{ wire: string | null }>(
                `SELECT encode(${serial(call.sql, call.result)},'hex') wire FROM (SELECT ${a} a,${b} b,${vector} p) input`,
              )
            ).rows[0]!.wire
            const bytes = wire === null ? null : Buffer.from(wire, 'hex')
            expected = {
              kind:
                bytes === null
                  ? 'Null'
                  : call.computed && Number.isNaN(bytes.readDoubleBE())
                    ? 'Unknown'
                    : 'True',
            }
          } catch (caught) {
            expected = failure((caught as { code: string }).code)
          }
          add(
            name,
            {
              ...base,
              a: values.get(a)!,
              b: values.get(b)!,
              p: pointValues.get(vector)!,
              expected: known(wire),
            },
            expected,
          )
        }
  for (const a of paths)
    for (const b of paths) {
      const row = { ...base, a: values.get(a)!, b: values.get(b)! }
      for (const name of ['nullified', 'absent', 'present', 'null_literal', 'is_distinct']) {
        const result = (
          await pg.query<{ value: boolean | null }>(
            `SELECT ${expressions[name]} value FROM (SELECT ${a} a,${b} b,'(1,2)'::point p) input`,
          )
        ).rows[0]!.value
        add(name, row, { kind: result === null ? 'Null' : result ? 'True' : 'False' })
      }
      for (const [name, sql] of [
        ['selected', `CASE WHEN true THEN ${a} ELSE ${b} END`],
        ['coalesced', `COALESCE(${a},${b})`],
        ['copied', `COALESCE(popen(${a}),pclose(${b}))`],
      ]) {
        const wire = (
          await pg.query<{ wire: string | null }>(`SELECT encode(path_send(${sql}),'hex') wire`)
        ).rows[0]!.wire
        add(name!, { ...row, expected: known(wire) }, { kind: wire === null ? 'Null' : 'True' })
      }
    }
  for (const state of [{ kind: 'Unknown' }, { kind: 'Null' }, failure('22012')] as Input[]) {
    add('selected', { ...base, b: state }, { kind: 'True' })
    add('coalesced', { ...base, b: state }, { kind: 'True' })
    add('lazy', { ...base, a: state }, { kind: 'True' })
    add('lazy', { ...base, a: state, skip: known(false) }, state as Outcome)
    for (const [name, call] of calls) {
      add(name, { ...base, [call.inputs[0]!]: state }, state as Outcome)
      if (call.inputs.length === 2) {
        add(
          name,
          { ...base, [call.inputs[0]!]: { kind: 'Unknown' }, [call.inputs[1]!]: failure('22003') },
          failure('22003'),
        )
        add(
          name,
          { ...base, [call.inputs[0]!]: failure('22012'), [call.inputs[1]!]: failure('22003') },
          failure('22012'),
        )
      }
    }
  }
  for (const name of ['sql__pg_catalog__dist_ppath__e16q', 'sql__pg_catalog__dist_pathp__9d28']) {
    add(
      name,
      {
        ...base,
        a: values.get(paths[1]!)!,
        p: pointValues.get("'(NaN,1)'::point")!,
        expected: known('7fffffffffffffff'),
      },
      { kind: 'Unknown' },
    )
  }
  await mkdir(join(directory, 'core'), { recursive: true })
  await runCheckParity(
    join(directory, 'core'),
    'pathdistances',
    group,
    constraints.map((c) => c.name),
    fixtures,
  )
}, 360_000)
