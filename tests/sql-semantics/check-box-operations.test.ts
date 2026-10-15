import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { callableIdentity, type FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
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
const error = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})
const boxes = [
  "'((0,0),(3,4))'::box",
  "'((1,1),(4,5))'::box",
  "'((0,0),(0,0))'::box",
  "'((3.0000005,0),(4,4))'::box",
  "'((NaN,1),(0,0))'::box",
  "'((Infinity,Infinity),(-Infinity,-Infinity))'::box",
  "'((1e308,1),(1e308,0))'::box",
  "'((-0,0),(0,-0))'::box",
  "box_intersect('((0,0),(1,1))'::box,'((1.0000005,0),(2,1))'::box)",
  "'((1,1),(-Infinity,0))'::box + '(Infinity,0)'::point",
  "'((1,1),(-Infinity,0))'::box",
]
const positions = [
  "'(0,0)'::point",
  "'(3.0000001,2)'::point",
  "'(7,8)'::point",
  "'(NaN,1)'::point",
  "'(Infinity,0)'::point",
  "'(1e308,1e308)'::point",
]
const segments = [
  "'[(-1,2),(4,2)]'::lseg",
  "'[(1,1),(2,2)]'::lseg",
  "'[(7,8),(8,9)]'::lseg",
  "'[(0,0),(0,0)]'::lseg",
  "'[(1e308,0),(1e308,1)]'::lseg",
  "'[(NaN,1),(0,0)]'::lseg",
  "'[(Infinity,0),(0,Infinity)]'::lseg",
]
const axes = [
  "'{0,-1,2}'::line",
  "'{-1,0,2}'::line",
  "'{1,-1,0}'::line",
  "'{NaN,-1,NaN}'::line",
  "'{1e308,1,1e308}'::line",
]
const fromWire = (wire: string | null, type: string): Input => {
  if (wire === null) return known(null)
  const b = Buffer.from(wire, 'hex')
  if (type === 'pg_catalog.box')
    return known({
      highX: b.readBigInt64BE(),
      highY: b.readBigInt64BE(8),
      lowX: b.readBigInt64BE(16),
      lowY: b.readBigInt64BE(24),
    })
  if (type === 'pg_catalog.point') return known({ x: b.readBigInt64BE(), y: b.readBigInt64BE(8) })
  if (type === 'pg_catalog.lseg')
    return known({
      x1: b.readBigInt64BE(),
      y1: b.readBigInt64BE(8),
      x2: b.readBigInt64BE(16),
      y2: b.readBigInt64BE(24),
    })
  if (type === 'pg_catalog.line')
    return known({ a: b.readBigInt64BE(), b: b.readBigInt64BE(8), c: b.readBigInt64BE(16) })
  return known(b.readBigInt64BE())
}
const sender = (type: string) =>
  type === 'pg_catalog.box'
    ? 'box_send'
    : type === 'pg_catalog.point'
      ? 'point_send'
      : type === 'pg_catalog.lseg'
        ? 'lseg_send'
        : type === 'pg_catalog.line'
          ? 'line_send'
          : 'float8send'
describe('box spatial operations', () => {
  let pg: PGlite, directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-box-operations-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('matches catalog functions and aliases, noncanonical stored values, checked arithmetic, intersection/projection evaluation, special values, errors and lazy composition', async () => {
    const source = await readFile(
      'crates/check-evaluator/src/operations/pg_catalog/box_operations.rs',
      'utf8',
    )
    const functions = builtinCallables().filter(
      (fn): fn is FunctionMetadata =>
        fn.kind === 'function' && source.includes(`pub fn ${fn.rustName}(`),
    )
    expect(functions).toHaveLength(31)
    type Descriptor = {
      name: string
      sql: string
      type: string
      fn: FunctionMetadata
      args: string[]
    }
    const descriptors: Descriptor[] = functions.map((fn) => {
      let index = 0
      const args = fn.args.map((type) =>
        type === 'pg_catalog.point'
          ? 'position'
          : type === 'pg_catalog.lseg'
            ? 'segment'
            : type === 'pg_catalog.line'
              ? 'axis'
              : index++ === 0
                ? 'a'
                : 'b',
      )
      return {
        name: fn.rustName,
        sql: `pg_catalog.${fn.name}(${args.join(',')})`,
        type: fn.result,
        fn,
        args,
      }
    })
    for (const op of builtinCallables()) {
      if (op.kind !== 'operator') continue
      const fn = descriptors.find((d) => callableIdentity(d.fn) === op.implementation)
      if (fn)
        descriptors.push({
          ...fn,
          name: 'alias_' + descriptors.length,
          sql:
            op.left === null
              ? `OPERATOR(pg_catalog.${op.name}) ${fn.args[0]}`
              : op.right === null
                ? `${fn.args[0]} OPERATOR(pg_catalog.${op.name})`
                : `(${fn.args[0]} OPERATOR(pg_catalog.${op.name}) ${fn.args[1]})`,
        })
    }
    const expressions: Record<string, string> = {}
    for (const d of descriptors) {
      expressions[d.name + '_semantic'] =
        d.type === 'pg_catalog.bool'
          ? `${d.sql}=expected_bool`
          : d.type === 'pg_catalog.box'
            ? `box_same(${d.sql},expected_box)`
            : d.type === 'pg_catalog.point'
              ? `point_eq(${d.sql},expected_point)`
              : `${d.sql} IS NOT DISTINCT FROM expected_float`
      if (d.type !== 'pg_catalog.bool')
        expressions[d.name + '_wire'] = `${sender(d.type)}(${d.sql})=expected_wire`
      if (d.name === d.fn.rustName)
        expressions[d.name + '_lazy'] =
          `CASE WHEN skip THEN true ELSE ${expressions[d.name + '_semantic']} END`
    }
    Object.assign(expressions, {
      selected:
        'box_send(CASE WHEN skip THEN bound_box(a,b) ELSE box_intersect(a,b) END)=expected_wire',
      coalesced: 'box_send(COALESCE(box_intersect(a,b),a))=expected_wire',
      recovered: 'box_send(bound_box(a+position,b))=expected_wire',
    })
    await pg.exec(
      `CREATE DOMAIN operation_region AS box;CREATE TABLE box_operations(a operation_region,b box,position point,segment lseg,axis line,expected_box box,expected_point point,expected_float float8,expected_bool bool,expected_wire bytea,skip bool,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'box_operations')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const stored = table.constraints.find((c) => c.name === name)!
      return [
        { ...stored, name: name + '_raw', definition: `CHECK(${sql})` },
        { ...stored, name: name + '_stored' },
      ]
    })
    const group = prepareCheckRustGroup(
      constraints.map((c) => ({
        expression: lowerTableCheck(table, c, [], catalog.domains)!.expression,
        identity: { schema: 'public', kind: 'table', owner: table.name, constraint: c.name },
      })),
    )
    for (const [i, c] of group.checks.entries())
      expect(c.kind, constraints[i]!.name).toBe('supported')
    const inputs = new Map<string, Input>()
    for (const [type, values] of [
      ['pg_catalog.box', boxes],
      ['pg_catalog.point', positions],
      ['pg_catalog.lseg', segments],
      ['pg_catalog.line', axes],
    ] as const)
      for (const sql of values) {
        const wire = (
          await pg.query<{ wire: string }>(`SELECT encode(${sender(type)}(${sql}),'hex') wire`)
        ).rows[0]!.wire
        inputs.set(sql, fromWire(wire, type))
      }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      trace: unknown[] = []
    let current: unknown = null
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored']) {
        fixtures.push({ name: name + '_' + suffix, row, expected })
        trace.push(current)
      }
    }
    for (const d of descriptors) {
      const others = d.args.includes('position')
        ? positions
        : d.args.includes('segment')
          ? segments
          : d.args.includes('axis')
            ? axes
            : boxes
      for (const a of boxes)
        for (const [index, other] of others.entries()) {
          if (d.args.length === 1 && index !== 0) continue
          const b = d.args.includes('b') ? other : boxes[0]!,
            p = d.args.includes('position') ? other : positions[0]!,
            seg = d.args.includes('segment') ? other : segments[0]!,
            axis = d.args.includes('axis') ? other : axes[0]!
          current = { fn: d.name, a, b, p, seg, axis }
          const row: Row = {
            a: inputs.get(a)!,
            b: inputs.get(b)!,
            position: inputs.get(p)!,
            segment: inputs.get(seg)!,
            axis: inputs.get(axis)!,
            expected_box: known(null),
            expected_point: known(null),
            expected_float: known(null),
            expected_bool: known(null),
            expected_wire: known(null),
            skip: known(false),
          }
          const from = `FROM (SELECT ${a} a,${b} b,${p} position,${seg} segment,${axis} axis) candidate`
          let semantic: Outcome,
            wireOutcome: Outcome = { kind: 'Null' }
          try {
            if (d.type === 'pg_catalog.bool') {
              const actual = (
                await pg.query<{ value: boolean | null }>(`SELECT ${d.sql} value ${from}`)
              ).rows[0]!.value
              row.expected_bool = known(actual)
              semantic = { kind: actual === null ? 'Null' : 'True' }
            } else {
              const wire = (
                await pg.query<{ wire: string | null }>(
                  `SELECT encode(${sender(d.type)}(${d.sql}),'hex') wire ${from}`,
                )
              ).rows[0]!.wire
              row.expected_wire = known(wire)
              row[
                d.type === 'pg_catalog.box'
                  ? 'expected_box'
                  : d.type === 'pg_catalog.point'
                    ? 'expected_point'
                    : 'expected_float'
              ] = fromWire(wire, d.type)
              semantic = { kind: wire === null && d.type !== 'pg_catalog.float8' ? 'Null' : 'True' }
              wireOutcome = { kind: wire === null ? 'Null' : 'True' }
              if (wire !== null) {
                const b = Buffer.from(wire, 'hex'),
                  hasNan = Array.from({ length: b.length / 8 }, (_, i) =>
                    Number.isNaN(b.readDoubleBE(i * 8)),
                  ).some(Boolean)
                if (
                  hasNan &&
                  ((d.type === 'pg_catalog.box' &&
                    ['box_add', 'box_sub', 'box_mul', 'box_div'].includes(d.fn.name)) ||
                    (d.type === 'pg_catalog.point' && d.fn.name === 'center') ||
                    d.type === 'pg_catalog.float8')
                )
                  wireOutcome = { kind: 'Unknown' }
              }
            }
          } catch (caught) {
            const code = (caught as { code: string }).code
            expect(['22003', '22012']).toContain(code)
            semantic = error(code)
            wireOutcome = semantic
          }
          add(d.name + '_semantic', row, semantic)
          if (d.type === 'pg_catalog.bool' && semantic.kind === 'True')
            add(
              d.name + '_semantic',
              {
                ...row,
                expected_bool: known(
                  !(row.expected_bool as Extract<Input, { kind: 'Value' }>).value,
                ),
              },
              { kind: 'False' },
            )
          if (d.type !== 'pg_catalog.bool') {
            add(d.name + '_wire', row, wireOutcome)
            if (wireOutcome.kind === 'True')
              add(d.name + '_wire', { ...row, expected_wire: known('ff') }, { kind: 'False' })
          }
          if (d.name === d.fn.rustName)
            add(d.name + '_lazy', { ...row, skip: known(true) }, { kind: 'True' })
        }
    }
    const baseline: Row = {
      a: inputs.get(boxes[0]!)!,
      b: inputs.get(boxes[1]!)!,
      position: inputs.get(positions[0]!)!,
      segment: inputs.get(segments[0]!)!,
      axis: inputs.get(axes[0]!)!,
      expected_box: known(null),
      expected_point: known(null),
      expected_float: known(null),
      expected_bool: known(true),
      expected_wire: known('ff'),
      skip: known(true),
    }
    current = { partial: true }
    for (const d of descriptors.filter((d) => d.name === d.fn.rustName)) {
      const name = d.name + (d.type === 'pg_catalog.bool' ? '_semantic' : '_wire')
      for (const state of [{ kind: 'Null' }, { kind: 'Unknown' }, error('22012')] as Input[]) {
        for (const arg of d.args) add(name, { ...baseline, [arg]: state }, state as Outcome)
        add(d.name + '_lazy', { ...baseline, [d.args[0]!]: state }, { kind: 'True' })
      }
      if (d.args.length === 2) {
        add(
          name,
          { ...baseline, [d.args[0]!]: error('22012'), [d.args[1]!]: error('22003') },
          error('22012'),
        )
        add(
          name,
          { ...baseline, [d.args[0]!]: { kind: 'Unknown' }, [d.args[1]!]: error('22003') },
          error('22003'),
        )
      }
    }
    for (const name of ['selected', 'coalesced', 'recovered']) {
      const wire = (
        await pg.query<{ wire: string }>(
          `SELECT encode(${expressions[name]!.split('=expected_wire')[0]},'hex') wire FROM (SELECT ${boxes[0]} a,${boxes[1]} b,${positions[0]} position,true skip) candidate`,
        )
      ).rows[0]!.wire
      add(name, { ...baseline, expected_wire: known(wire) }, { kind: 'True' })
    }
    const recoveredSql =
      "bound_box('((1,1),(-Infinity,0))'::box + '(Infinity,0)'::point,'((0,0),(3,4))'::box)"
    const recoveredWire = (
      await pg.query<{ wire: string }>(`SELECT encode(box_send(${recoveredSql}),'hex') wire`)
    ).rows[0]!.wire
    expect(recoveredWire).toBe('7ff0000000000000401000000000000000000000000000000000000000000000')
    add(
      'recovered',
      {
        ...baseline,
        a: inputs.get("'((1,1),(-Infinity,0))'::box")!,
        b: inputs.get(boxes[0]!)!,
        position: inputs.get("'(Infinity,0)'::point")!,
        expected_wire: known(recoveredWire),
      },
      { kind: 'True' },
    )
    const huge = "'((1e308,1),(1e308,0))'::box",
      inside = "'[(1e308,0),(1e308,1)]'::lseg"
    expect(
      (
        await pg.query(
          `SELECT inter_sb(${inside},${huge}) crossing,dist_sb(${inside},${huge}) distance`,
        )
      ).rows[0],
    ).toEqual({ crossing: true, distance: 0 })
    await expect(pg.query(`SELECT close_sb(${inside},${huge})`)).rejects.toMatchObject({
      code: '22003',
    })
    await mkdir('artifacts/box-operations', { recursive: true })
    await writeFile(
      'artifacts/box-operations/fixture-trace.json',
      JSON.stringify(trace, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'boxoperations',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  }, 600_000)
})
