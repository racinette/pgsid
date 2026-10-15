import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { callableIdentity } from '../../src/postgres/builtins/catalog.js'
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
const axes = [
  '{1,-1,0}',
  '{0,-1,0}',
  '{-1,0,0}',
  '{2,-2,4}',
  '{1,1,0}',
  '{1e308,1,1e308}',
  '{0.000002,1,0}',
  '{NaN,-1,NaN}',
  '{Infinity,-Infinity,0}',
]
const positions = ['(0,0)', '(3,4)', '(-0,-0)', '(NaN,1)', '(Infinity,0)', '(1e308,1e308)']
const fromWire = (hex: string | null, type: 'line' | 'point' | 'float'): Input => {
  if (hex === null) return value(null)
  const bytes = Buffer.from(hex, 'hex')
  return type === 'line'
    ? value({ a: bytes.readBigInt64BE(), b: bytes.readBigInt64BE(8), c: bytes.readBigInt64BE(16) })
    : type === 'point'
      ? value({ x: bytes.readBigInt64BE(), y: bytes.readBigInt64BE(8) })
      : value(bytes.readBigInt64BE())
}
describe('line relations, intersections, distances and point projection', () => {
  let pg: PGlite, directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-line-operations-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('matches catalog functions and operator aliases through raw/stored CHECKs, wire precision, special values, errors and lazy branches', async () => {
    const names = new Set(
      [
        ...(
          await readFile(
            'crates/check-evaluator/src/operations/pg_catalog/line_operations.rs',
            'utf8',
          )
        ).matchAll(/pub fn (sql__[a-z0-9_]+)\(/g),
      ].map((match) => match[1]!),
    )
    const functions = builtinCallables().filter(
      (fn) => fn.kind === 'function' && names.has(fn.rustName),
    )
    expect(functions).toHaveLength(11)
    const descriptors = [] as {
      name: string
      sql: string
      type: string
      fn: (typeof functions)[number]
      args: string[]
    }[]
    for (const fn of functions) {
      if (fn.kind !== 'function') continue
      let index = 0
      const args = fn.args.map((type) =>
        type === 'pg_catalog.point' ? 'position' : index++ === 0 ? 'axis' : 'peer',
      )
      descriptors.push({
        name: fn.rustName,
        sql: `pg_catalog.${fn.name}(${args.join(',')})`,
        type: fn.result,
        fn,
        args,
      })
    }
    for (const op of builtinCallables()) {
      if (op.kind !== 'operator') continue
      const fn = descriptors.find((item) => callableIdentity(item.fn) === op.implementation)
      if (fn)
        descriptors.push({
          ...fn,
          name: 'alias_' + descriptors.length,
          sql: `(${fn.args[0]} OPERATOR(pg_catalog.${op.name}) ${fn.args[1]})`,
        })
    }
    const expressions: Record<string, string> = {}
    for (const item of descriptors) {
      if (item.type === 'pg_catalog.bool')
        expressions[item.name + '_semantic'] = `${item.sql} = expected_bool`
      else {
        const sender = item.type === 'pg_catalog.point' ? 'point_send' : 'float8send'
        expressions[item.name + '_wire'] = `${sender}(${item.sql}) = expected_wire`
        expressions[item.name + '_semantic'] =
          item.type === 'pg_catalog.point'
            ? `point_eq(${item.sql},expected_point)`
            : `${item.sql} IS NOT DISTINCT FROM expected_float`
      }
      if (item.fn.kind === 'function' && item.name === item.fn.rustName)
        expressions[item.name + '_lazy'] =
          `CASE WHEN skip THEN true ELSE ${expressions[item.name + '_semantic']} END`
    }
    await pg.exec(
      `CREATE DOMAIN operation_axis AS line; CREATE TABLE line_operations(axis operation_axis,peer line,position point,expected_point point,expected_float float8,expected_wire bytea,expected_bool bool,skip bool,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((table) => table.name === 'line_operations')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const stored = table.constraints.find((constraint) => constraint.name === name)!
      return [
        { ...stored, name: name + '_raw', definition: `CHECK (${sql})` },
        { ...stored, name: name + '_stored' },
      ]
    })
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
    const axisInputs = new Map<string, Input>(),
      pointInputs = new Map<string, Input>()
    for (const text of axes) {
      const wire = (
        await pg.query<{ wire: string }>("SELECT encode(line_send($1::line),'hex') wire", [text])
      ).rows[0]!.wire
      axisInputs.set(text, fromWire(wire, 'line'))
    }
    for (const text of positions) {
      const wire = (
        await pg.query<{ wire: string }>("SELECT encode(point_send($1::point),'hex') wire", [text])
      ).rows[0]!.wire
      pointInputs.set(text, fromWire(wire, 'point'))
    }
    for (const item of descriptors) {
      const pointArgument = item.args.includes('position')
      for (const a of axes)
        for (const other of pointArgument ? positions : axes) {
          const b = pointArgument ? axes[0]! : other,
            p = pointArgument ? other : positions[0]!
          const row: Row = {
            axis: axisInputs.get(a)!,
            peer: axisInputs.get(b)!,
            position: pointInputs.get(p)!,
            expected_wire: value(null),
            expected_point: value(null),
            expected_float: value(null),
            expected_bool: value(null),
            skip: value(false),
          }
          let semantic: Outcome,
            wireExpected: Outcome = { kind: 'Null' }
          try {
            if (item.type === 'pg_catalog.bool') {
              const actual = (
                await pg.query<{ value: boolean | null }>(
                  `SELECT ${item.sql} AS value FROM (SELECT $1::line axis,$2::line peer,$3::point position) data`,
                  [a, b, p],
                )
              ).rows[0]!.value
              row.expected_bool = value(actual)
              semantic = { kind: actual === null ? 'Null' : 'True' }
            } else {
              const sender = item.type === 'pg_catalog.point' ? 'point_send' : 'float8send'
              const wire = (
                await pg.query<{ wire: string | null }>(
                  `SELECT encode(${sender}(${item.sql}),'hex') wire FROM (SELECT $1::line axis,$2::line peer,$3::point position) data`,
                  [a, b, p],
                )
              ).rows[0]!.wire
              row.expected_wire = value(wire)
              row[item.type === 'pg_catalog.point' ? 'expected_point' : 'expected_float'] =
                fromWire(wire, item.type === 'pg_catalog.point' ? 'point' : 'float')
              semantic = {
                kind: item.type === 'pg_catalog.point' && wire === null ? 'Null' : 'True',
              }
              wireExpected = { kind: wire === null ? 'Null' : 'True' }
              if (wire !== null) {
                const bytes = Buffer.from(wire, 'hex'),
                  hasNan =
                    Number.isNaN(bytes.readDoubleBE()) ||
                    (item.type === 'pg_catalog.point' && Number.isNaN(bytes.readDoubleBE(8)))
                if (hasNan) wireExpected = { kind: 'Unknown' }
              }
            }
          } catch (caught) {
            const code = (caught as { code: string }).code
            expect(['22003', '22012']).toContain(code)
            semantic = error(code)
            wireExpected = semantic
          }
          add(item.name + '_semantic', row, semantic)
          if (item.type !== 'pg_catalog.bool') add(item.name + '_wire', row, wireExpected)
          if (item.fn.kind === 'function' && item.name === item.fn.rustName)
            add(item.name + '_lazy', { ...row, skip: value(true) }, { kind: 'True' })
        }
    }
    const baseline: Row = {
      axis: axisInputs.get(axes[0]!)!,
      peer: axisInputs.get(axes[1]!)!,
      position: pointInputs.get(positions[0]!)!,
      expected_wire: value('00'),
      expected_point: value(null),
      expected_float: value(null),
      expected_bool: value(true),
      skip: value(true),
    }
    for (const item of descriptors.filter(
      (item) => item.fn.kind === 'function' && item.name === item.fn.rustName,
    )) {
      const name = item.name + (item.type === 'pg_catalog.bool' ? '_semantic' : '_wire')
      for (const state of [{ kind: 'Null' }, { kind: 'Unknown' }, error('22012')] as Input[]) {
        for (const arg of item.args) add(name, { ...baseline, [arg]: state }, state as Outcome)
        add(item.name + '_lazy', { ...baseline, [item.args[0]!]: state }, { kind: 'True' })
      }
      add(
        name,
        { ...baseline, [item.args[0]!]: error('22012'), [item.args[1]!]: error('22003') },
        error('22012'),
      )
      add(
        name,
        { ...baseline, [item.args[0]!]: { kind: 'Unknown' }, [item.args[1]!]: error('22003') },
        error('22003'),
      )
    }
    await runCheckParity(
      directory,
      'lineoperations',
      group,
      constraints.map((constraint) => constraint.name),
      fixtures,
    )
  }, 600_000)
})
