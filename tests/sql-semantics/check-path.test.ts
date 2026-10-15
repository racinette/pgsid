import { pathInputForms, deferredPathPlatformForms } from './check-path-input-forms.js'
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

it('matches path catalog operations, cardinality operators, open/closed paths, floating errors, domains and lazy composition in Rust, Go and TypeScript', async () => {
  const source = await readFile(
    'crates/check-evaluator/src/operations/pg_catalog/path_core.rs',
    'utf8',
  )
  const functions = builtinCallables().filter(
    (fn): fn is FunctionMetadata =>
      fn.kind === 'function' && source.includes(`pub fn ${fn.rustName}(`),
  )
  expect(functions).toHaveLength(15)
  const calls = new Map<
    string,
    { sql: string; result: string; inputs: string[]; computed: boolean }
  >()
  for (const fn of functions) {
    const inputs = fn.args.map((_, index) => (index === 0 ? 'a' : 'b'))
    calls.set(fn.rustName, {
      sql: `pg_catalog."${fn.name}"(${inputs.join(',')})`,
      result: fn.result,
      inputs,
      computed: fn.result === 'pg_catalog.float8',
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
            : `a OPERATOR(pg_catalog.${op.name}) b`,
    })
  }
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
  await pg.exec(`CREATE DOMAIN path_domain AS path; CREATE DOMAIN nested_path AS path_domain;
    CREATE TABLE path_checks(a nested_path,b path,expected bytea,skip boolean,${Object.entries(
      expressions,
    )
      .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
      .join(',')})`)
  const catalog = await snapshotCatalog(pg),
    table = catalog.tables.find((t) => t.name === 'path_checks')!
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
  const base: Row = {
    a: values.get(paths[2]!)!,
    b: values.get(paths[4]!)!,
    expected: known(wires.get(paths[2]!)!),
    skip: known(true),
  }
  for (const [name, call] of calls)
    for (const a of paths)
      for (const b of call.inputs.includes('b') ? paths : [paths[2]!]) {
        let expected: Outcome,
          wire: string | null = null
        try {
          wire = (
            await pg.query<{ wire: string | null }>(
              `SELECT encode(${serial(call.sql, call.result)},'hex') wire FROM (SELECT ${a} a,${b} b) input`,
            )
          ).rows[0]!.wire
          expected = {
            kind:
              wire === null
                ? 'Null'
                : call.computed && Number.isNaN(Buffer.from(wire, 'hex').readDoubleBE())
                  ? 'Unknown'
                  : 'True',
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
  for (const a of paths)
    for (const b of paths) {
      const row = { ...base, a: values.get(a)!, b: values.get(b)! }
      for (const name of ['nullified', 'absent', 'present', 'null_literal', 'is_distinct']) {
        const result = (
          await pg.query<{ value: boolean | null }>(
            `SELECT ${expressions[name]} value FROM (SELECT ${a} a,${b} b) input`,
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
      add(name, { ...base, a: state }, state as Outcome)
      if (call.inputs.includes('b')) {
        add(name, { ...base, a: { kind: 'Unknown' }, b: failure('22003') }, failure('22003'))
        add(name, { ...base, a: failure('22012'), b: failure('22003') }, failure('22012'))
      }
    }
  }
  await mkdir(join(directory, 'core'), { recursive: true })
  await runCheckParity(
    join(directory, 'core'),
    'pathcore',
    group,
    constraints.map((c) => c.name),
    fixtures,
  )
}, 360_000)

it('prepares path literals and type constructors independently of runtime branch selection', async () => {
  const expressions: Record<string, string> = {
    literal: "path_send('[(0,0),(3,4)]'::path)=expected",
    constructor: "path_send(path('[(0,0),(3,4)]'))=expected",
    selected:
      "path_send(CASE WHEN skip THEN '[(0,0),(3,4)]'::path ELSE '((1,2))'::path END)=expected",
    null_literal: 'NULL::path IS NULL',
  }
  await pg.exec(
    `CREATE TABLE path_literals(expected bytea,skip boolean,${Object.entries(expressions)
      .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
      .join(',')})`,
  )
  const catalog = await snapshotCatalog(pg),
    table = catalog.tables.find((t) => t.name === 'path_literals')!
  const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
    const constraint = table.constraints.find((c) => c.name === name)!
    return [
      { ...constraint, name: name + '_raw', definition: `CHECK(${sql})` },
      { ...constraint, name: name + '_stored' },
    ]
  })
  const base = constraints[0]!
  const invalid = "CASE WHEN skip THEN true ELSE path_send('[(bad,0)]'::path)=expected END"
  await expect(
    pg.exec(`CREATE TABLE invalid_path_literal(expected bytea,skip boolean CHECK(${invalid}))`),
  ).rejects.toMatchObject({ code: '22P02' })
  constraints.push({ ...base, name: 'invalid_preparation', definition: `CHECK(${invalid})` })
  const group = prepareCheckRustGroup(
    constraints.map((c) => ({
      expression: lowerTableCheck(table, c, [], catalog.domains)!.expression,
      identity: { schema: 'public', kind: 'table', owner: table.name, constraint: c.name },
    })),
  )
  for (const check of group.checks)
    expect(check.kind, check.kind === 'unsupported' ? check.reason : '').toBe('supported')
  const wire = (
    await pg.query<{ wire: string }>("SELECT encode(path_send('[(0,0),(3,4)]'::path),'hex') wire")
  ).rows[0]!.wire
  const fixtures = constraints.map((c) => ({
    name: c.name,
    row: { expected: known(wire), skip: known(true) },
    expected: c.name === 'invalid_preparation' ? failure('22P02') : ({ kind: 'True' } as Outcome),
  }))
  await mkdir(join(directory, 'literals'), { recursive: true })
  await runCheckParity(
    join(directory, 'literals'),
    'pathliterals',
    group,
    constraints.map((c) => c.name),
    fixtures,
  )
}, 360_000)

it('matches path text input, literals, type constructors and lazy casts with delimiter and floating boundaries', async () => {
  await pg.exec(
    'CREATE TABLE path_input(input text,expected bytea,skip boolean,CONSTRAINT parsed CHECK(path_send(input::path)=expected),CONSTRAINT constructor CHECK(path_send(path(input))=expected),CONSTRAINT lazy CHECK(CASE WHEN skip THEN true ELSE path_send(input::path)=expected END))',
  )
  const catalog = await snapshotCatalog(pg),
    table = catalog.tables.find((t) => t.name === 'path_input')!
  const constraints = table.constraints
    .filter((c) => c.type === 'check')
    .flatMap((c) => [
      { ...c, name: c.name + '_raw' },
      { ...c, name: c.name + '_stored' },
    ])
  const group = prepareCheckRustGroup(
    constraints.map((c) => ({
      expression: lowerTableCheck(table, c, [], catalog.domains)!.expression,
      identity: { schema: 'public', kind: 'table', owner: table.name, constraint: c.name },
    })),
  )
  for (const check of group.checks)
    expect(check.kind, check.kind === 'unsupported' ? check.reason : '').toBe('supported')
  const fixtures: { name: string; row: Row; expected: Outcome }[] = []
  for (const form of pathInputForms) {
    let wire: string | null = null,
      expected: Outcome
    try {
      wire = (
        await pg.query<{ wire: string }>("SELECT encode(path_send($1::path),'hex') wire", [form])
      ).rows[0]!.wire
      expected = {
        kind:
          wire === null
            ? 'Null'
            : Array.from({ length: (wire.length / 2 - 5) / 8 }, (_, index) => 5 + index * 8).some(
                  (at) => Number.isNaN(Buffer.from(wire!, 'hex').readDoubleBE(at)),
                )
              ? 'Unknown'
              : 'True',
      }
    } catch (caught) {
      expected = failure((caught as { code: string }).code)
    }
    for (const c of constraints)
      fixtures.push({
        name: c.name,
        row: { input: known(form), expected: known(wire), skip: known(false) },
        expected,
      })
    for (const suffix of ['raw', 'stored'])
      fixtures.push({
        name: 'lazy_' + suffix,
        row: { input: known(form), expected: known(wire), skip: known(true) },
        expected: { kind: 'True' },
      })
  }
  for (const form of deferredPathPlatformForms)
    for (const c of constraints)
      fixtures.push({
        name: c.name,
        row: { input: known(form), expected: known('00'), skip: known(false) },
        expected: { kind: 'Unknown' },
      })
  for (const state of [{ kind: 'Null' }, { kind: 'Unknown' }, failure('22012')] as Input[])
    for (const c of constraints)
      fixtures.push({
        name: c.name,
        row: { input: state, expected: known('00'), skip: known(false) },
        expected: state as Outcome,
      })
  await mkdir(join(directory, 'input'), { recursive: true })
  await runCheckParity(
    join(directory, 'input'),
    'pathinput',
    group,
    constraints.map((c) => c.name),
    fixtures,
  )
}, 360_000)
