import { parse } from 'libpg-query'
// @ts-expect-error -- Espalier input policy is a runtime JavaScript rule.
import { constantInput } from '../unit/query/espalier/worlds/[world]/check-seed.sql.mjs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
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
import { circleInputForms, deferredCirclePlatformForms } from './check-circle-input-forms.js'
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
const point = (wire: string | null): Input => {
  if (wire === null) return known(null)
  const b = Buffer.from(wire, 'hex')
  return known({ x: b.readBigInt64BE(), y: b.readBigInt64BE(8) })
}
const box = (wire: string | null): Input => {
  if (wire === null) return known(null)
  const b = Buffer.from(wire, 'hex')
  return known({
    highX: b.readBigInt64BE(),
    highY: b.readBigInt64BE(8),
    lowX: b.readBigInt64BE(16),
    lowY: b.readBigInt64BE(24),
  })
}
const serial = (sql: string, type: string): string =>
  type === 'pg_catalog.bytea'
    ? sql
    : `${({ 'pg_catalog.circle': 'circle_send', 'pg_catalog.point': 'point_send', 'pg_catalog.box': 'box_send', 'pg_catalog.float8': 'float8send', 'pg_catalog.bool': 'boolsend' } as Record<string, string>)[type]}(${sql})`
const circles = [
  "'<(0,0),0>'::circle",
  "'<(0,0),1>'::circle",
  "'<(3,4),2>'::circle",
  "'<(0,0),1.0000001>'::circle",
  "'<(-0,0),-0>'::circle",
  "'<(NaN,1),3>'::circle",
  "'<(NaN,NaN),NaN>'::circle",
  "'<(Infinity,-Infinity),Infinity>'::circle",
  "'<(1e308,1e308),1e308>'::circle",
  "'<(0,0),1e-320>'::circle",
  "circle('(0,0)'::point,-2::float8)",
  "circle('(1,2)'::point,'-Infinity'::float8)",
  'NULL::circle',
]
const nan = (wire: string): boolean => {
  const b = Buffer.from(wire, 'hex')
  for (let i = 0; i + 8 <= b.length; i += 8) if (Number.isNaN(b.readDoubleBE(i))) return true
  return false
}
describe('portable circles', () => {
  let pg: PGlite, directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-circle-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('matches core catalog identities and operators, stored negative radii, floating boundaries, domains and partial composition in all targets', async () => {
    const source = await readFile(
      'crates/check-evaluator/src/operations/pg_catalog/circle_core.rs',
      'utf8',
    )
    const functions = builtinCallables().filter(
      (fn): fn is FunctionMetadata =>
        fn.kind === 'function' && source.includes(`pub fn ${fn.rustName}(`),
    )
    expect(functions).toHaveLength(17)
    const calls = new Map<
      string,
      { sql: string; result: string; inputs: string[]; computed: boolean }
    >()
    for (const fn of functions) {
      const inputs = fn.args.map((t, i) =>
        t === 'pg_catalog.circle'
          ? i === 0
            ? 'a'
            : 'b'
          : t === 'pg_catalog.point'
            ? 'p'
            : t === 'pg_catalog.box'
              ? 'h'
              : 'r',
      )
      calls.set(fn.rustName, {
        sql: `pg_catalog."${fn.name}"(${inputs.join(',')})`,
        result: fn.result,
        inputs,
        computed:
          fn.name === 'area' ||
          fn.name === 'diameter' ||
          fn.args[0] === 'pg_catalog.box' ||
          fn.result === 'pg_catalog.box',
      })
    }
    const identities = new Set(functions.map(callableIdentity))
    for (const [i, op] of builtinCallables()
      .filter((fn) => fn.kind === 'operator' && identities.has(fn.implementation))
      .entries()) {
      if (op.kind !== 'operator') continue
      const fn = functions.find((fn) => callableIdentity(fn) === op.implementation)!,
        base = calls.get(fn.rustName)!
      const [a, b] = base.inputs
      calls.set('operator_' + i, {
        ...base,
        sql:
          op.left === null
            ? `OPERATOR(pg_catalog.${op.name}) ${a}`
            : op.right === null
              ? `${a} OPERATOR(pg_catalog.${op.name})`
              : `${a} OPERATOR(pg_catalog.${op.name}) ${b}`,
      })
    }
    const expressions: Record<string, string> = Object.fromEntries(
      [...calls].map(([name, c]) => [name, `${serial(c.sql, c.result)}=expected`]),
    )
    Object.assign(expressions, {
      lazy: 'CASE WHEN skip THEN true ELSE circle_send(a)=expected END',
      selected: 'circle_send(CASE WHEN skip THEN a ELSE b END)=expected',
      coalesced: 'circle_send(COALESCE(a,b))=expected',
      absent: 'a IS NULL',
      present: 'a IS NOT NULL',
      null_literal: 'circle_send(NULL::circle) IS NULL',
      nan_present: "circle(p,slope('(Infinity,Infinity)'::point,'(0,0)'::point)) IS NOT NULL",
      nan_same:
        "circle_same(circle(p,slope('(Infinity,Infinity)'::point,'(0,0)'::point)),circle(p,'NaN'::float8))",
      nan_wire:
        "circle_send(circle(p,slope('(Infinity,Infinity)'::point,'(0,0)'::point)))=expected",
      center_recovers:
        "point_send(center(circle(p,slope('(Infinity,Infinity)'::point,'(0,0)'::point))))=expected",
      radius_recovers:
        "float8send(radius(circle(point(slope('(Infinity,Infinity)'::point,'(0,0)'::point),0::float8),r)))=expected",
    })
    await pg.exec(
      `CREATE DOMAIN disk AS circle; CREATE DOMAIN nested_disk AS disk; CREATE TABLE circles(a nested_disk,b circle,p point,r float8,h box,expected bytea,skip boolean,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'circles')!
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
    for (const [i, c] of group.checks.entries())
      expect(c.kind, constraints[i]!.name).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + suffix, row, expected })
    }
    const values = new Map<string, Input>(),
      wires = new Map<string, string | null>()
    for (const a of circles) {
      const wire = (
        await pg.query<{ wire: string | null }>(`SELECT encode(circle_send(${a}),'hex') wire`)
      ).rows[0]!.wire
      values.set(a, circle(wire))
      wires.set(a, wire)
    }
    const baseWires = (
      await pg.query<{ p: string; r: string; h: string }>(
        "SELECT encode(point_send('(3,4)'::point),'hex') p,encode(float8send(2::float8),'hex') r,encode(box_send('((0,0),(3,4))'::box),'hex') h",
      )
    ).rows[0]!
    const base: Row = {
      a: values.get(circles[1]!)!,
      b: values.get(circles[2]!)!,
      p: point(baseWires.p),
      r: known(Buffer.from(baseWires.r, 'hex').readBigInt64BE()),
      h: box(baseWires.h),
      expected: known(wires.get(circles[1]!)!),
      skip: known(true),
    }
    for (const [name, c] of calls)
      for (const a of circles)
        for (const b of c.inputs.includes('b') ? circles : [circles[1]!]) {
          let expected: Outcome,
            wire: string | null = null
          try {
            wire = (
              await pg.query<{ wire: string | null }>(
                `SELECT encode(${serial(c.sql, c.result)},'hex') wire FROM (SELECT ${a} a,${b} b,'(3,4)'::point p,2::float8 r,'((0,0),(3,4))'::box h) input`,
              )
            ).rows[0]!.wire
            expected = {
              kind: wire === null ? 'Null' : c.computed && nan(wire) ? 'Unknown' : 'True',
            }
          } catch (caught) {
            expected = failure((caught as { code: string }).code)
          }
          add(
            name,
            { ...base, a: values.get(a)!, b: values.get(b)!, expected: known(wire) },
            expected,
          )
        }
    for (const a of circles) {
      const row = { ...base, a: values.get(a)!, expected: known(wires.get(a)!) }
      add('selected', row, { kind: a === 'NULL::circle' ? 'Null' : 'True' })
      add(
        'coalesced',
        { ...row, expected: known(a === 'NULL::circle' ? wires.get(circles[2]!)! : wires.get(a)!) },
        { kind: 'True' },
      )
      add('absent', row, { kind: a === 'NULL::circle' ? 'True' : 'False' })
      add('present', row, { kind: a === 'NULL::circle' ? 'False' : 'True' })
      add('null_literal', row, { kind: 'True' })
    }
    for (const state of [{ kind: 'Unknown' }, { kind: 'Null' }, failure('22012')] as Input[]) {
      add('selected', { ...base, b: state }, { kind: 'True' })
      add('coalesced', { ...base, b: state }, { kind: 'True' })
      add('lazy', { ...base, a: state }, { kind: 'True' })
      add('lazy', { ...base, a: state, skip: known(false) }, state as Outcome)
      add(
        'absent',
        { ...base, a: state },
        state.kind === 'Null' ? { kind: 'True' } : (state as Outcome),
      )
      add(
        'present',
        { ...base, a: state },
        state.kind === 'Null' ? { kind: 'False' } : (state as Outcome),
      )
      for (const [name, c] of calls) {
        const first = c.inputs[0]!,
          second = c.inputs[1]
        add(name, { ...base, [first]: state }, state as Outcome)
        if (second) {
          add(
            name,
            { ...base, [first]: { kind: 'Unknown' }, [second]: failure('22003') },
            failure('22003'),
          )
          add(
            name,
            { ...base, [first]: failure('22012'), [second]: failure('22003') },
            failure('22012'),
          )
        }
      }
    }
    add('nan_present', base, { kind: 'True' })
    add('nan_same', base, { kind: 'True' })
    add('nan_wire', base, { kind: 'Unknown' })
    add('center_recovers', { ...base, expected: known(baseWires.p) }, { kind: 'True' })
    add('radius_recovers', { ...base, expected: known(baseWires.r) }, { kind: 'True' })
    for (const [p, r] of [
      ['(-0,0)', '-0'],
      ['(NaN,1)', 'NaN'],
      ['(Infinity,-Infinity)', '-Infinity'],
      ['(1,2)', '-3'],
      [null, '2'],
      ['(1,2)', null],
    ]) {
      const result = (
        await pg.query<{ p: string | null; r: string | null; wire: string | null }>(
          "SELECT encode(point_send($1::point),'hex') p,encode(float8send($2::float8),'hex') r,encode(circle_send(circle($1::point,$2::float8)),'hex') wire",
          [p, r],
        )
      ).rows[0]!
      add(
        functions.find((fn) => fn.name === 'circle' && fn.args.length === 2)!.rustName,
        {
          ...base,
          p: point(result.p),
          r: result.r === null ? known(null) : known(Buffer.from(result.r, 'hex').readBigInt64BE()),
          expected: known(result.wire),
        },
        { kind: result.wire === null ? 'Null' : 'True' },
      )
    }
    await runCheckParity(
      directory,
      'circlecore',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  }, 360_000)
  it('matches circle relations, exact point containment, distances and complex arithmetic with catalog aliases and partial states', async () => {
    const source = await readFile(
      'crates/check-evaluator/src/operations/pg_catalog/circle_operations.rs',
      'utf8',
    )
    const functions = builtinCallables().filter(
      (fn): fn is FunctionMetadata =>
        fn.kind === 'function' && source.includes(`pub fn ${fn.rustName}(`),
    )
    expect(functions).toHaveLength(20)
    const calls = new Map<
      string,
      { sql: string; result: string; inputs: string[]; computed: boolean; copyRadius: boolean }
    >()
    for (const fn of functions) {
      const inputs = fn.args.map((t, i) =>
        t === 'pg_catalog.circle'
          ? i === 0
            ? 'a'
            : 'b'
          : t === 'pg_catalog.point'
            ? 'p'
            : t === 'pg_catalog.box'
              ? 'h'
              : 'r',
      )
      calls.set(fn.rustName, {
        sql: `pg_catalog."${fn.name}"(${inputs.join(',')})`,
        result: fn.result,
        inputs,
        computed: fn.result === 'pg_catalog.circle' || fn.result === 'pg_catalog.float8',
        copyRadius: fn.name === 'circle_add_pt' || fn.name === 'circle_sub_pt',
      })
    }
    const identities = new Set(functions.map(callableIdentity))
    for (const [i, op] of builtinCallables()
      .filter((fn) => fn.kind === 'operator' && identities.has(fn.implementation))
      .entries()) {
      if (op.kind !== 'operator') continue
      const fn = functions.find((fn) => callableIdentity(fn) === op.implementation)!,
        base = calls.get(fn.rustName)!
      const [a, b] = base.inputs
      calls.set('operator_' + i, {
        ...base,
        sql:
          op.left === null
            ? `OPERATOR(pg_catalog.${op.name}) ${a}`
            : op.right === null
              ? `${a} OPERATOR(pg_catalog.${op.name})`
              : `${a} OPERATOR(pg_catalog.${op.name}) ${b}`,
      })
    }
    const expressions: Record<string, string> = Object.fromEntries(
      [...calls].map(([name, c]) => [name, `${serial(c.sql, c.result)}=expected`]),
    )
    Object.assign(expressions, {
      lazy: 'CASE WHEN skip THEN true ELSE circle_send(a)=expected END',
      selected: 'circle_send(CASE WHEN skip THEN a ELSE b END)=expected',
      coalesced: 'circle_send(COALESCE(a,b))=expected',
      absent: 'a IS NULL',
      present: 'a IS NOT NULL',
      null_literal: 'circle_send(NULL::circle) IS NULL',
      nan_present: "circle(p,slope('(Infinity,Infinity)'::point,'(0,0)'::point)) IS NOT NULL",
      nan_same:
        "circle_same(circle(p,slope('(Infinity,Infinity)'::point,'(0,0)'::point)),circle(p,'NaN'::float8))",
      nan_wire:
        "circle_send(circle(p,slope('(Infinity,Infinity)'::point,'(0,0)'::point)))=expected",
      center_recovers:
        "point_send(center(circle(p,slope('(Infinity,Infinity)'::point,'(0,0)'::point))))=expected",
      radius_recovers:
        "float8send(radius(circle(point(slope('(Infinity,Infinity)'::point,'(0,0)'::point),0::float8),r)))=expected",
    })
    await pg.exec(
      `CREATE TABLE circle_operations(a nested_disk,b circle,p point,r float8,h box,expected bytea,skip boolean,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'circle_operations')!
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
    for (const [i, c] of group.checks.entries())
      expect(c.kind, constraints[i]!.name).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + suffix, row, expected })
    }
    const values = new Map<string, Input>(),
      wires = new Map<string, string | null>()
    for (const a of circles) {
      const wire = (
        await pg.query<{ wire: string | null }>(`SELECT encode(circle_send(${a}),'hex') wire`)
      ).rows[0]!.wire
      values.set(a, circle(wire))
      wires.set(a, wire)
    }
    const baseWires = (
      await pg.query<{ p: string; r: string; h: string }>(
        "SELECT encode(point_send('(3,4)'::point),'hex') p,encode(float8send(2::float8),'hex') r,encode(box_send('((0,0),(3,4))'::box),'hex') h",
      )
    ).rows[0]!
    const base: Row = {
      a: values.get(circles[1]!)!,
      b: values.get(circles[2]!)!,
      p: point(baseWires.p),
      r: known(Buffer.from(baseWires.r, 'hex').readBigInt64BE()),
      h: box(baseWires.h),
      expected: known(wires.get(circles[1]!)!),
      skip: known(true),
    }
    const points = [
      '(3,4)',
      '(0,0)',
      '(-0,0)',
      '(0.0000005,0)',
      '(NaN,1)',
      '(Infinity,0)',
      '(1e-320,0)',
      '(1e308,1e308)',
      null,
    ]
    const pointValues = new Map<string | null, Input>()
    for (const p of points)
      pointValues.set(
        p,
        point(
          (
            await pg.query<{ wire: string | null }>(
              "SELECT encode(point_send($1::point),'hex') wire",
              [p],
            )
          ).rows[0]!.wire,
        ),
      )
    for (const [name, c] of calls)
      for (const a of circles)
        for (const b of c.inputs.includes('b') ? circles : [circles[1]!])
          for (const p of c.inputs.includes('p') ? points : ['(3,4)']) {
            let expected: Outcome,
              wire: string | null = null
            try {
              wire = (
                await pg.query<{ wire: string | null }>(
                  `SELECT encode(${serial(c.sql, c.result)},'hex') wire FROM (SELECT ${a} a,${b} b,${p === null ? 'NULL' : `'${p}'`}::point p,2::float8 r,'((0,0),(3,4))'::box h) input`,
                )
              ).rows[0]!.wire
              expected = {
                kind:
                  wire === null
                    ? 'Null'
                    : c.computed && nan(c.copyRadius ? wire.slice(0, 32) : wire)
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
                p: pointValues.get(p)!,
                expected: known(wire),
              },
              expected,
            )
          }
    for (const a of circles) {
      const row = { ...base, a: values.get(a)!, expected: known(wires.get(a)!) }
      add('selected', row, { kind: a === 'NULL::circle' ? 'Null' : 'True' })
      add(
        'coalesced',
        { ...row, expected: known(a === 'NULL::circle' ? wires.get(circles[2]!)! : wires.get(a)!) },
        { kind: 'True' },
      )
      add('absent', row, { kind: a === 'NULL::circle' ? 'True' : 'False' })
      add('present', row, { kind: a === 'NULL::circle' ? 'False' : 'True' })
      add('null_literal', row, { kind: 'True' })
    }
    for (const state of [{ kind: 'Unknown' }, { kind: 'Null' }, failure('22012')] as Input[]) {
      add('selected', { ...base, b: state }, { kind: 'True' })
      add('coalesced', { ...base, b: state }, { kind: 'True' })
      add('lazy', { ...base, a: state }, { kind: 'True' })
      add('lazy', { ...base, a: state, skip: known(false) }, state as Outcome)
      add(
        'absent',
        { ...base, a: state },
        state.kind === 'Null' ? { kind: 'True' } : (state as Outcome),
      )
      add(
        'present',
        { ...base, a: state },
        state.kind === 'Null' ? { kind: 'False' } : (state as Outcome),
      )
      for (const [name, c] of calls) {
        const first = c.inputs[0]!,
          second = c.inputs[1]
        add(name, { ...base, [first]: state }, state as Outcome)
        if (second) {
          add(
            name,
            { ...base, [first]: { kind: 'Unknown' }, [second]: failure('22003') },
            failure('22003'),
          )
          add(
            name,
            { ...base, [first]: failure('22012'), [second]: failure('22003') },
            failure('22012'),
          )
        }
      }
    }
    add('nan_present', base, { kind: 'True' })
    add('nan_same', base, { kind: 'True' })
    add('nan_wire', base, { kind: 'Unknown' })
    add('center_recovers', { ...base, expected: known(baseWires.p) }, { kind: 'True' })
    add('radius_recovers', { ...base, expected: known(baseWires.r) }, { kind: 'True' })
    const target = join(directory, 'operations')
    await mkdir(target)
    await runCheckParity(
      target,
      'circleoperations',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  }, 360_000)
  it('matches circle grammar, literal preparation, catalog I/O casts and unconstrained domains across targets', async () => {
    const expressions = {
      wire: 'circle_send(source::circle)=expected',
      varying: 'circle_send(source::varchar::circle)=expected',
      domain: 'circle_send(source::nested_disk)=expected',
      typename: 'circle_send(circle(source))=expected',
      same: 'circle_same(source::circle,reference)',
      present: '(source::circle IS NOT NULL)=recorded_present',
      lazy: 'CASE WHEN skip THEN true ELSE circle_send(source::circle)=expected END',
      literal: "circle_send('<(0,0),3>'::circle)=expected",
      domain_literal: "circle_send('<(0,0),3>'::nested_disk)=expected",
      implicit_literal: "circle_same(reference,'<(0,0),3>')",
      null_literal: 'circle_send(NULL::circle)=expected',
    }
    await pg.exec(
      `CREATE TABLE circle_inputs(source text,reference nested_disk,expected bytea,recorded_present boolean,skip boolean,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'circle_inputs')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const stored = table.constraints.find((c) => c.name === name)!
      return [
        { ...stored, name: name + '_raw', definition: `CHECK(${sql})` },
        { ...stored, name: name + '_stored' },
      ]
    })
    const invalid = "CASE WHEN skip THEN true ELSE circle_send('<(bad,0),3>'::circle)=expected END"
    await expect(
      pg.query(`SELECT ${invalid} FROM (SELECT true skip,NULL::bytea expected) candidate`),
    ).rejects.toMatchObject({ code: '22P02' })
    for (const suffix of ['raw', 'stored'])
      constraints.push({
        ...table.constraints.find((c) => c.name === 'literal')!,
        name: 'invalid_literal_' + suffix,
        definition: `CHECK(${invalid})`,
      })
    const group = prepareCheckRustGroup(
      constraints.map((c) => ({
        expression: lowerTableCheck(table, c, [], catalog.domains)!.expression,
        identity: { schema: 'public', kind: 'table', owner: table.name, constraint: c.name },
      })),
    )
    for (const [i, c] of group.checks.entries())
      expect(c.kind, constraints[i]!.name).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + suffix, row, expected })
    }
    for (const source of circleInputForms) {
      let wire: string | null = null,
        expected: Outcome
      try {
        wire = (
          await pg.query<{ wire: string | null }>(
            "SELECT encode(circle_send($1::circle),'hex') wire",
            [source],
          )
        ).rows[0]!.wire
        expected = { kind: wire === null ? 'Null' : 'True' }
      } catch (caught) {
        const code = (caught as { code: string }).code
        expect(['22P02', '22003']).toContain(code)
        expected = failure(code)
      }
      const row = {
        source: known(source),
        reference: circle(wire),
        expected: known(wire),
        recorded_present: known(source !== null),
        skip: known(false),
      }
      const nanWire =
        wire !== null &&
        Array.from({ length: 3 }, (_, index) => index * 8).some((at) =>
          Number.isNaN(Buffer.from(wire!, 'hex').readDoubleBE(at)),
        )
      for (const name of ['wire', 'varying', 'domain', 'typename', 'same', 'lazy'])
        add(name, row, nanWire && name !== 'same' ? { kind: 'Unknown' } : expected)
      add('present', row, expected.kind === 'Null' ? { kind: 'True' } : expected)
      add('lazy', { ...row, skip: known(true) }, { kind: 'True' })
    }
    const wire = '000000000000000000000000000000004008000000000000'
    const row = {
      source: known('bad'),
      reference: circle(wire),
      expected: known(wire),
      recorded_present: known(true),
      skip: known(true),
    }
    for (const name of ['literal', 'domain_literal', 'implicit_literal'])
      add(name, row, { kind: 'True' })
    add('null_literal', row, { kind: 'Null' })
    for (const skip of [true, false])
      add('invalid_literal', { ...row, skip: known(skip) }, failure('22P02'))
    for (const source of [...deferredCirclePlatformForms, '[' + '0'.repeat(4096) + ']'])
      for (const name of ['wire', 'same', 'present'])
        add(name, { ...row, source: known(source) }, { kind: 'Unknown' })
    for (const state of [{ kind: 'Unknown' }, { kind: 'Null' }, failure('22012')] as Input[]) {
      for (const name of ['wire', 'varying', 'domain', 'typename', 'same', 'lazy'])
        add(name, { ...row, source: state, skip: known(false) }, state as Outcome)
      add('lazy', { ...row, source: state }, { kind: 'True' })
    }
    const target = join(directory, 'input')
    await mkdir(target)
    await runCheckParity(
      target,
      'circleinput',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  }, 180_000)
  it('validates public circle carriers and retains semantic results when wire precision is unavailable', async () => {
    await pg.exec(`CREATE TABLE circle_payloads(disk circle,reference circle,expected bytea,
      CONSTRAINT wire CHECK(circle_send(disk)=expected),CONSTRAINT same CHECK(circle_same(disk,reference)),
      CONSTRAINT present CHECK(disk IS NOT NULL),CONSTRAINT absent CHECK(disk IS NULL))`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'circle_payloads')!
    const bundle = renderTypescriptSchemaCheckArtifacts([table]),
      target = join(directory, 'public')
    await mkdir(target)
    await writeFile(join(target, 'package.json'), '{"type":"module"}\n')
    await writeFile(join(target, 'checks.ts'), bundle.checks)
    for (const artifact of checkTypescriptArtifacts(bundle.rustFiles!)) {
      const path = join(target, 'checks-rust', artifact.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, artifact.content)
    }
    await promisify(execFile)('node_modules/.bin/tsc', [
      '--strict',
      '--skipLibCheck',
      '--target',
      'es2022',
      '--module',
      'nodenext',
      '--moduleResolution',
      'nodenext',
      '--outDir',
      join(target, 'js'),
      join(target, 'checks.ts'),
    ]).catch((error: { stdout: string; stderr: string }) => {
      throw new Error(error.stdout + error.stderr, { cause: error })
    })
    const generated = await import(pathToFileURL(join(target, 'js/checks.js')).href)
    const payload = {
        x: 0n,
        y: 0n,
        radius: 0x4008000000000000n,
        wireKnown: true,
      },
      value = { kind: 'Value', value: payload }
    const wire = Buffer.from('000000000000000000000000000000004008000000000000', 'hex')
    type Result = { certain: boolean; value?: boolean | null; error?: string }
    const evaluate = (
      disk: unknown,
      reference: unknown = value,
      expected: unknown = wire,
    ): Record<string, Result> =>
      Object.fromEntries(
        generated
          .evaluatePublicCirclePayloadsChecks({ disk, reference, expected })
          .map((c: { constraint: string; result: Result }) => [c.constraint, c.result]),
      )
    const knownResults = {
      wire: { certain: true, value: true },
      same: { certain: true, value: true },
      present: { certain: true, value: true },
      absent: { certain: true, value: false },
    }
    expect(evaluate(value)).toEqual(knownResults)
    expect(evaluate({ kind: 'Value', value: { ...payload, wireKnown: false } })).toEqual({
      ...knownResults,
      wire: { certain: false },
    })
    for (const disk of [
      undefined,
      '((0,0),(3,4))',
      { kind: 'Unknown' },
      { kind: 'Value', value: { ...payload, x: 9223372036854775808n } },
      { kind: 'Value', value: { ...payload, radius: '0' } },
      { kind: 'Value', value: { ...payload, wireKnown: 'false' } },
    ])
      expect(Object.values(evaluate(disk))).toEqual(
        Array.from({ length: 4 }, () => ({ certain: false })),
      )
    for (const disk of [null, { kind: 'Null' }])
      expect(evaluate(disk)).toEqual({
        wire: { certain: true, value: null },
        same: { certain: true, value: null },
        present: { certain: true, value: false },
        absent: { certain: true, value: true },
      })
    expect(Object.values(evaluate(failure('22012')))).toEqual(
      Array.from({ length: 4 }, () => ({ certain: true, error: '22012' })),
    )
    await pg.exec(`CREATE TABLE stored_circle_values(id int,shape circle CHECK(shape IS NOT NULL));
      INSERT INTO stored_circle_values VALUES(1,circle('(0,0)'::point,-3::float8)),
      (2,circle('(NaN,1)'::point,'-Infinity'::float8))`)
    for (const stored of (
      await pg.query<{ wire: string }>(
        "SELECT encode(circle_send(shape),'hex') wire FROM stored_circle_values ORDER BY id",
      )
    ).rows) {
      const bytes = Buffer.from(stored.wire, 'hex')
      const row = {
        kind: 'Value',
        value: {
          x: bytes.readBigInt64BE(),
          y: bytes.readBigInt64BE(8),
          radius: bytes.readBigInt64BE(16),
        },
      }
      expect(evaluate(row, row, bytes)).toEqual(knownResults)
    }
    const nan = { kind: 'Value', value: { ...payload, x: 0x7ff0000000000001n } }
    expect(
      evaluate(nan, nan, Buffer.from('7ff000000000000100000000000000004008000000000000', 'hex')),
    ).toEqual(knownResults)
  }, 120_000)
  it('enforces geometric domains and resolves qualified domain names separately from builtins', async () => {
    await pg.exec(`CREATE DOMAIN checked_circle AS circle CHECK(area(VALUE)=0);
      CREATE DOMAIN required_circle AS circle NOT NULL;
      CREATE SCHEMA circle_shadow;CREATE DOMAIN circle_shadow.date AS circle;
      CREATE TABLE circle_domains(source text,expected bytea,
        CONSTRAINT qualified CHECK(circle_send(source::circle_shadow.date)=expected),
        CONSTRAINT enforced CHECK(circle_send(source::checked_circle)=expected),
        CONSTRAINT required CHECK(circle_send(source::required_circle)=expected),
        CONSTRAINT builtin_day CHECK(source::date IS NOT NULL))`)
    await expect(pg.query('SELECT $1::checked_circle', ['<(0,0),3>'])).rejects.toMatchObject({
      code: '23514',
    })
    await expect(pg.query('SELECT $1::required_circle', [null])).rejects.toMatchObject({
      code: '23502',
    })
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'circle_domains')!
    const constraints = table.constraints.filter((c) => c.type === 'check')
    const plans = constraints.flatMap((constraint) =>
      (['source', 'stored'] as const).map((origin) => ({
        expression: lowerTableCheck(table, constraint, [], catalog.domains, origin)!.expression,
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: constraint.name + '_' + origin,
        },
      })),
    )
    const group = prepareCheckRustGroup(plans)
    for (const [index, check] of group.checks.entries())
      expect(check.kind, plans[index]!.identity.constraint).toBe('supported')
    const row: Row = {
      source: known('<(0,0),3>'),
      expected: known('000000000000000000000000000000004008000000000000'),
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [
      { name: 'qualified', row, expected: { kind: 'True' } },
      { name: 'qualified', row: { ...row, source: known(null) }, expected: { kind: 'Null' } },
      { name: 'qualified', row: { ...row, source: known('bad') }, expected: failure('22P02') },
      {
        name: 'builtin_day',
        row: { ...row, source: known('2000-01-01') },
        expected: { kind: 'True' },
      },
    ]
    for (const name of ['enforced', 'required'])
      for (const source of [null, '<(0,0),3>', 'bad'])
        fixtures.push({
          name,
          row: { ...row, source: known(source) },
          expected:
            source === null
              ? name === 'required'
                ? failure('23502')
                : { kind: 'Null' }
              : source === 'bad'
                ? failure('22P02')
                : name === 'enforced'
                  ? failure('23514')
                  : { kind: 'True' },
        })
    const acceptedSource = '<(0,0),0>'
    const acceptedWire = (
      await pg.query<{ value: string }>(`SELECT encode(circle_send($1::circle),'hex') AS value`, [
        acceptedSource,
      ])
    ).rows[0]!.value
    fixtures.push({
      name: 'enforced',
      row: { source: known(acceptedSource), expected: known(acceptedWire) },
      expected: { kind: 'True' },
    })
    fixtures.push({
      name: 'enforced',
      row: { source: known(acceptedSource), expected: known('00') },
      expected: { kind: 'False' },
    })
    for (const name of ['enforced', 'required'])
      fixtures.push({
        name,
        row: { source: known(acceptedSource), expected: known(null) },
        expected: { kind: 'Null' },
      })
    const references: unknown[] = []
    for (const constraint of constraints) {
      const oracle = table.name + '_oracle_' + constraint.name
      await pg.exec(
        `CREATE TEMP TABLE ${oracle}(source text, expected bytea, CONSTRAINT checked ${constraint.definition})`,
      )
      const sql = constraint.definition.replace(/^CHECK\s*/u, '')
      for (const fixture of fixtures.filter((item) => item.name === constraint.name)) {
        const source = fixture.row.source!,
          wire = fixture.row.expected!
        if (
          (source.kind !== 'Value' && source.kind !== 'Null') ||
          (wire.kind !== 'Value' && wire.kind !== 'Null')
        )
          throw new Error('PostgreSQL witnesses require concrete SQL inputs')
        const sourceValue = source.kind === 'Value' ? source.value : null
        const hex = wire.kind === 'Value' ? wire.value : null
        if (sourceValue !== null && typeof sourceValue !== 'string')
          throw new Error('Expected text input')
        if (hex !== null && typeof hex !== 'string')
          throw new Error('Expected hexadecimal bytea input')
        const parameters = [sourceValue, hex === null ? null : Buffer.from(hex, 'hex')]
        let observed: Outcome
        try {
          const value = (
            await pg.query<{ value: boolean | null }>(
              `WITH candidate AS MATERIALIZED(SELECT $1::text source,$2::bytea expected) SELECT ${sql} AS value FROM candidate`,
              parameters,
            )
          ).rows[0]!.value
          observed = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
        } catch (error) {
          observed = {
            kind: 'Error',
            value: { state: parseInt((error as { code: string }).code, 36) },
          }
        }
        expect(observed, constraint.name + ':' + String(sourceValue)).toEqual(fixture.expected)
        const insert = pg.query(`INSERT INTO ${oracle} VALUES($1,$2)`, parameters)
        if (observed.kind === 'Error' || observed.kind === 'False')
          await expect(insert).rejects.toMatchObject({
            code:
              observed.kind === 'Error'
                ? observed.value.state.toString(36).toUpperCase().padStart(5, '0')
                : '23514',
          })
        else await insert
        references.push({
          constraint: constraint.name,
          source: sourceValue,
          expected: hex,
          outcome: observed,
        })
      }
      await pg.exec(`DROP TABLE ${oracle}`)
    }
    await mkdir('artifacts/geometric-domain-casts', { recursive: true })
    await writeFile(
      'artifacts/geometric-domain-casts/circle.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    expect(references).toHaveLength(fixtures.length)
    expect(fixtures).toHaveLength(14)
    const parityFixtures = fixtures.flatMap((fixture) =>
      (['source', 'stored'] as const).map((origin) => ({
        ...fixture,
        name: fixture.name + '_' + origin,
      })),
    )
    const target = join(directory, 'domains')
    await mkdir(target)
    await runCheckParity(
      target,
      'circledomains',
      group,
      plans.map((plan) => plan.identity.constraint),
      parityFixtures,
    )
  }, 120_000)
  it('admits typed catalog circle construction while rejecting expressions with runtime inputs or other callables', async () => {
    const accepted = [
      "pg_catalog.circle('(0,0)'::point,'-3'::float8)",
      "pg_catalog.circle(NULL::pg_catalog.point,'-Infinity'::pg_catalog.float8)",
    ]
    const rejected = [
      "circle('(0,0)'::point,'-3'::float8)",
      "public.circle('(0,0)'::point,'-3'::float8)",
      "pg_catalog.circle('(0,0)'::text,'-3'::float8)",
      "pg_catalog.circle('(0,0)'::point,-3::numeric)",
      "pg_catalog.circle(position,'-3'::float8)",
      "pg_catalog.circle('(0,0)'::point,random())",
      "pg_catalog.circle('(0,0)'::point,1::float8+2::float8)",
      "pg_catalog.circle('(0,0)'::point)",
    ]
    for (const [expressions, expected] of [
      [accepted, true],
      [rejected, false],
    ] as const)
      for (const sql of expressions) {
        const parsed = await parse('SELECT ' + sql)
        const select = parsed.stmts![0]!.stmt!.SelectStmt!
        const value = select.targetList![0]!.ResTarget!.val!
        expect(constantInput(value), sql).toBe(expected)
      }
  })
  it('keeps optional constructor and inscribed-box wire precision separate from arithmetic error reach', async () => {
    await pg.exec(await readFile('tests/unit/query/worlds/028_axis_guides/schema.sql', 'utf8'))
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'guide_disk_constructions')!
    const bundle = renderTypescriptSchemaCheckArtifacts([table], catalog.domains),
      target = join(directory, 'optional-wire')
    await mkdir(target)
    await writeFile(join(target, 'package.json'), '{"type":"module"}\n')
    await writeFile(join(target, 'checks.ts'), bundle.checks)
    for (const artifact of checkTypescriptArtifacts(bundle.rustFiles!)) {
      const path = join(target, 'checks-rust', artifact.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, artifact.content)
    }
    await promisify(execFile)('node_modules/.bin/tsc', [
      '--strict',
      '--skipLibCheck',
      '--target',
      'es2022',
      '--module',
      'nodenext',
      '--moduleResolution',
      'nodenext',
      '--outDir',
      join(target, 'js'),
      join(target, 'checks.ts'),
    ]).catch((error: { stdout: string; stderr: string }) => {
      throw new Error(error.stdout + error.stderr, { cause: error })
    })
    const generated = await import(pathToFileURL(join(target, 'js/checks.js')).href)
    type Result = { certain: boolean; value?: boolean | null; error?: string }
    const evaluate = (row: object): Record<string, Result> =>
      Object.fromEntries(
        generated
          .evaluatePublicGuideDiskConstructionsChecks(row)
          .map((c: { constraint: string; result: Result }) => [c.constraint, c.result]),
      )
    const radius = 0x7ff8000000000000n,
      one = 0x3ff0000000000000n
    const row = {
      position: { kind: 'Value', value: { x: radius, y: one } },
      radius_value: NaN,
      region: null,
      recorded_disk: { kind: 'Value', value: { x: radius, y: one, radius } },
      recorded_disk_wire: null,
      recorded_circumscribed: null,
      recorded_box_wire: null,
      skip_validation: false,
    }
    expect(evaluate(row)).toEqual({
      disk_construct: { certain: true, value: true },
      disk_circumscribe: { certain: true, value: null },
      disk_inscribe: { certain: true, value: true },
    })
    expect(evaluate({ ...row, recorded_disk_wire: Buffer.from([0]) }).disk_construct).toEqual({
      certain: true,
      value: false,
    })
    expect(evaluate({ ...row, recorded_disk_wire: Buffer.alloc(24) }).disk_construct).toEqual({
      certain: false,
    })
    const large = Buffer.alloc(8)
    large.writeDoubleBE(1.7e308)
    const bits = large.readBigInt64BE()
    expect(
      evaluate({
        ...row,
        recorded_disk: { kind: 'Value', value: { x: bits, y: 0n, radius: bits } },
      }).disk_inscribe,
    ).toEqual({ certain: true, error: '22003' })
    large.writeDoubleBE(1e308)
    const edge = large.readBigInt64BE()
    expect(
      evaluate({
        ...row,
        region: { kind: 'Value', value: { highX: edge, highY: one, lowX: edge, lowY: 0n } },
      }).disk_circumscribe,
    ).toEqual({ certain: true, error: '22003' })
  }, 120_000)
})
