import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
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
const points = (bytes: Buffer, start: number) => {
  const result: { x: bigint; y: bigint }[] = []
  for (let at = start; at < bytes.length; at += 16)
    result.push({ x: bytes.readBigInt64BE(at), y: bytes.readBigInt64BE(at + 8) })
  return result
}
const decodeBox = (hex: string) => {
  const bytes = Buffer.from(hex, 'hex')
  expect(bytes.length).toBe(32)
  return {
    highX: bytes.readBigInt64BE(),
    highY: bytes.readBigInt64BE(8),
    lowX: bytes.readBigInt64BE(16),
    lowY: bytes.readBigInt64BE(24),
  }
}
const serial = (sql: string, type: string): string => {
  if (type === 'pg_catalog.bytea') return sql
  const send = (
    {
      'pg_catalog.polygon': 'poly_send',
      'pg_catalog.path': 'path_send',
      'pg_catalog.box': 'box_send',
      'pg_catalog.int4': 'int4send',
      'pg_catalog.bool': 'boolsend',
    } as Record<string, string>
  )[type]
  expect(send, type).toBeDefined()
  return `${send}(${sql})`
}
const polygons = [
  "'((0,0))'::polygon",
  "'((0,0),(4,0))'::polygon",
  "'((0,0),(4,0),(4,4),(0,4))'::polygon",
  "'((4,4),(0,4),(0,0),(4,0))'::polygon",
  "'((0,4),(4,4),(4,0),(0,0))'::polygon",
  "'((0,0),(4,0),(4,4),(2,2),(0,4))'::polygon",
  "'((0,0),(4,4),(0,4),(4,0))'::polygon",
  "'((0,0),(0,0),(4,0),(4,4),(0,4))'::polygon",
  "'((-0,-0),(0,0))'::polygon",
  "polygon('(0,0),(-0,-0)'::box)",
  "polygon('(0,0),(-0,-0)'::box)::text::polygon",
  "'((NaN,1),(0,0),(4,4))'::polygon",
  "'((Infinity,0),(0,Infinity))'::polygon",
  "'((1e308,1e308),(-1e308,-1e308))'::polygon",
  "'((1e-320,0),(0,1e-320))'::polygon",
  'NULL::polygon',
]
const routes = [
  "'[(0,0)]'::path",
  "'((0,0))'::path",
  "'[(0,0),(4,0)]'::path",
  "'((0,0),(4,0),(4,4))'::path",
  "'((-0,-0),(0,0))'::path",
  "'((NaN,0),(1,1))'::path",
  'NULL::path',
]
const boxes = ["'(4,4),(0,0)'::box", "'(0,0),(-0,-0)'::box", "'(NaN,1),(0,0)'::box", 'NULL::box']
const positions = [
  "'(0,0)'::point",
  "'(2,0)'::point",
  "'(2,2)'::point",
  "'(5,5)'::point",
  "'(-0.0000005,2)'::point",
  "'(NaN,0)'::point",
  "'(Infinity,0)'::point",
  "'(-1e308,-1e308)'::point",
  'NULL::point',
]

it('matches polygon catalog operations, cyclic and reversed equality, cached bounds, containment, conversions and lazy composition in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-polygon-'))
  try {
    for (const sql of [
      "SELECT NULLIF('((0,0))'::polygon,'((0,0))'::polygon)",
      "SELECT '((0,0))'::polygon IS DISTINCT FROM '((0,0))'::polygon",
    ])
      await expect(pg.query(sql)).rejects.toMatchObject({ code: '42883' })
    const source = await readFile(
      'crates/check-evaluator/src/operations/pg_catalog/polygon_core.rs',
      'utf8',
    )
    const functions = builtinCallables().filter(
      (fn): fn is FunctionMetadata =>
        fn.kind === 'function' && source.includes(`pub fn ${fn.rustName}(`),
    )
    expect(functions).toHaveLength(10)
    const calls = new Map<string, { sql: string; result: string; args: string[] }>()
    for (const fn of functions) {
      const args = fn.args.map((type, index) =>
        type === 'pg_catalog.path'
          ? 'route'
          : type === 'pg_catalog.box'
            ? 'bounds'
            : type === 'pg_catalog.point'
              ? 'p'
              : index === 1 && fn.args[0] === 'pg_catalog.polygon'
                ? 'b'
                : 'a',
      )
      calls.set(fn.rustName, {
        sql: `pg_catalog."${fn.name}"(${args.join(',')})`,
        result: fn.result,
        args,
      })
    }
    const identities = new Set(functions.map(callableIdentity))
    for (const [index, op] of builtinCallables()
      .filter((fn) => fn.kind === 'operator' && identities.has(fn.implementation))
      .entries()) {
      if (op.kind !== 'operator') continue
      const fn = functions.find((fn) => callableIdentity(fn) === op.implementation)!,
        base = calls.get(fn.rustName)!
      calls.set(`alias_${index}`, {
        ...base,
        sql:
          op.left === null
            ? `OPERATOR(pg_catalog.${op.name}) ${base.args[0]}`
            : op.right === null
              ? `${base.args[0]} OPERATOR(pg_catalog.${op.name})`
              : `${base.args[0]} OPERATOR(pg_catalog.${op.name}) ${base.args[1]}`,
      })
    }
    const expressions: Record<string, string> = Object.fromEntries(
      [...calls].map(([name, call]) => [name, `${serial(call.sql, call.result)}=expected`]),
    )
    Object.assign(expressions, {
      selected: 'poly_send(CASE WHEN skip THEN a ELSE b END)=expected',
      coalesced: 'poly_send(COALESCE(a,b))=expected',
      absent: 'a IS NULL',
      present: 'a IS NOT NULL',
      lazy: 'CASE WHEN skip THEN true ELSE poly_send(a)=expected END',
      roundtrip: 'poly_send(polygon(path(a)))=expected',
      cached: 'box_send(box(a))=expected',
      bounds_present: 'box(a) IS NOT NULL',
      bounds_length: 'length(box_send(box(a)))=32',
      bounds_short: "box_send(box(a))='\\x00'::bytea",
      bounds_index: 'get_byte(box_send(box(a)),32)=0',
    })
    await pg.exec(`CREATE DOMAIN shape AS polygon; CREATE DOMAIN nested_shape AS shape;
      CREATE TABLE polygon_checks(a nested_shape,b polygon,route path,bounds box,p point,expected bytea,skip boolean,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'polygon_checks')!
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
    for (const check of group.checks)
      expect(check.kind, check.kind === 'unsupported' ? check.reason : '').toBe('supported')
    const values = new Map<string, Input>(),
      wires = new Map<string, string | null>(),
      boundWires = new Map<string, string | null>()
    for (const sql of polygons) {
      const row = (
        await pg.query<{ wire: string | null; bounds: string | null }>(
          `SELECT encode(poly_send(a),'hex') wire,encode(box_send(box(a)),'hex') bounds FROM (SELECT ${sql} a) input`,
        )
      ).rows[0]!
      if (row.wire === null) values.set(sql, known(null))
      else {
        const bytes = Buffer.from(row.wire, 'hex')
        expect(bytes.length).toBe(4 + bytes.readInt32BE() * 16)
        values.set(sql, known({ points: points(bytes, 4), bounds: decodeBox(row.bounds!) }))
      }
      wires.set(sql, row.wire)
      boundWires.set(sql, row.bounds)
    }
    expect(wires.get(polygons[9]!)).toBe(wires.get(polygons[10]!))
    expect(boundWires.get(polygons[9]!)).not.toBe(boundWires.get(polygons[10]!))
    for (const sql of routes) {
      const hex = (
        await pg.query<{ wire: string | null }>(`SELECT encode(path_send(${sql}),'hex') wire`)
      ).rows[0]!.wire
      if (hex === null) values.set(sql, known(null))
      else {
        const bytes = Buffer.from(hex, 'hex')
        values.set(sql, known({ closed: bytes[0] === 1, points: points(bytes, 5) }))
      }
    }
    for (const sql of boxes) {
      const hex = (
        await pg.query<{ wire: string | null }>(`SELECT encode(box_send(${sql}),'hex') wire`)
      ).rows[0]!.wire
      values.set(sql, hex === null ? known(null) : known(decodeBox(hex)))
    }
    for (const sql of positions) {
      const hex = (
        await pg.query<{ wire: string | null }>(`SELECT encode(point_send(${sql}),'hex') wire`)
      ).rows[0]!.wire
      values.set(sql, hex === null ? known(null) : known(points(Buffer.from(hex, 'hex'), 0)[0]!))
    }
    const baseSql = {
      a: polygons[2]!,
      b: polygons[4]!,
      route: routes[3]!,
      bounds: boxes[0]!,
      p: positions[2]!,
    }
    const toRow = (sql: typeof baseSql): Row =>
      Object.fromEntries(Object.entries(sql).map(([key, value]) => [key, values.get(value)!]))
    const base = { ...toRow(baseSql), expected: known(wires.get(baseSql.a)!), skip: known(true) }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + suffix, row, expected })
    }
    for (const [name, call] of calls) {
      const variants = call.args.includes('route')
        ? routes.map((route) => ({ ...baseSql, route }))
        : call.args.includes('bounds')
          ? boxes.map((bounds) => ({ ...baseSql, bounds }))
          : polygons.flatMap((a) =>
              call.args.includes('b')
                ? polygons.map((b) => ({ ...baseSql, a, b }))
                : call.args.includes('p')
                  ? positions.map((p) => ({ ...baseSql, a, p }))
                  : [{ ...baseSql, a }],
            )
      for (const sql of variants) {
        let wire: string | null = null,
          expected: Outcome
        try {
          wire = (
            await pg.query<{ wire: string | null }>(
              `SELECT encode(${serial(call.sql, call.result)},'hex') wire FROM (SELECT ${Object.entries(
                sql,
              )
                .map(([key, value]) => `${value} ${key}`)
                .join(',')}) input`,
            )
          ).rows[0]!.wire
          expected = { kind: wire === null ? 'Null' : 'True' }
        } catch (caught) {
          expected = failure((caught as { code: string }).code)
        }
        add(name, { ...base, ...toRow(sql), expected: known(wire) }, expected)
      }
    }
    for (const a of polygons)
      for (const b of polygons) {
        const row = { ...base, a: values.get(a)!, b: values.get(b)! }
        for (const name of ['absent', 'present']) {
          const value = (
            await pg.query<{ value: boolean | null }>(
              `SELECT ${expressions[name]} value FROM (SELECT ${a} a,${b} b) input`,
            )
          ).rows[0]!.value
          add(name, row, { kind: value === null ? 'Null' : value ? 'True' : 'False' })
        }
        for (const [name, sql] of [
          ['selected', a],
          ['coalesced', `COALESCE(${a},${b})`],
          ['roundtrip', `polygon(path(${a}))`],
        ]) {
          const wire = (
            await pg.query<{ wire: string | null }>(`SELECT encode(poly_send(${sql}),'hex') wire`)
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
        const row = { ...base, [call.args[0]!]: state }
        add(name, row, state as Outcome)
        if (call.args.length === 2) {
          add(
            name,
            { ...row, [call.args[0]!]: { kind: 'Unknown' }, [call.args[1]!]: failure('22003') },
            failure('22003'),
          )
          add(
            name,
            { ...row, [call.args[0]!]: failure('22012'), [call.args[1]!]: failure('22003') },
            failure('22012'),
          )
        }
      }
    }
    for (const index of [2, 9, 10]) {
      const value = values.get(polygons[index]!)!
      expect(value.kind).toBe('Value')
      if (value.kind !== 'Value' || typeof value.value !== 'object' || !('points' in value.value))
        throw new Error('Missing polygon input')
      const row = { ...base, a: known({ points: value.value.points }) }
      for (const name of ['present', 'bounds_present', 'bounds_length'])
        add(name, row, { kind: 'True' })
      add('bounds_short', row, { kind: 'False' })
      add('bounds_index', row, failure('2202E'))
      add('roundtrip', { ...row, expected: known(wires.get(polygons[index]!)!) }, { kind: 'True' })
      add(
        'cached',
        { ...row, expected: known(boundWires.get(polygons[index]!)!) },
        { kind: index === 2 ? 'True' : 'Unknown' },
      )
    }
    await mkdir(join(root, 'core'))
    await runCheckParity(
      join(root, 'core'),
      'polygoncore',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 360_000)
