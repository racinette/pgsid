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
const decodePath = (hex: string | null): Input => {
  if (hex === null) return known(null)
  const bytes = Buffer.from(hex, 'hex'),
    points: { x: bigint; y: bigint }[] = []
  expect(bytes.length).toBe(5 + 16 * bytes.readInt32BE(1))
  for (let at = 5; at < bytes.length; at += 16)
    points.push({ x: bytes.readBigInt64BE(at), y: bytes.readBigInt64BE(at + 8) })
  return known({ closed: bytes[0] === 1, points })
}
const paths = [
  '[(0,0)]',
  '((0,0))',
  '[(0,0),(4,0)]',
  '((0,0),(4,0))',
  '[(0,0),(4,0),(4,4),(0,4)]',
  '((0,0),(4,0),(4,4),(0,4))',
  '((0,4),(4,4),(4,0),(0,0))',
  '((0,0),(4,4),(0,4),(4,0))',
  '((0,0),(4,0),(4,4),(2,2),(0,4))',
  '((0,0),(0,0),(4,0),(4,4),(0,4))',
  '[(2,-1),(2,5)]',
  '[(-0,-0),(0,-0)]',
  '[(NaN,1),(0,0)]',
  '((NaN,1),(0,0),(4,4))',
  '((Infinity,0),(0,Infinity))',
  '[(1e308,1e308),(-1e308,-1e308)]',
  '((1e-320,0),(0,1e-320))',
  null,
]
const positions = [
  '(0,0)',
  '(2,0)',
  '(2,2)',
  '(4,4)',
  '(5,5)',
  '(-1,0)',
  '(2,3)',
  '(0.0000005,2)',
  '(-0.0000005,2)',
  '(-0.0000011,2)',
  '(NaN,0)',
  '(Infinity,0)',
  '(-1e308,-1e308)',
  null,
]

it('matches path containment and intersection, ray boundaries, closing-edge order, short circuits, NaNs and reached errors in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-path-predicates-'))
  try {
    const source = await readFile(
      'crates/check-evaluator/src/operations/pg_catalog/path_predicates.rs',
      'utf8',
    )
    const functions = builtinCallables().filter(
      (fn): fn is FunctionMetadata =>
        fn.kind === 'function' && source.includes(`pub fn ${fn.rustName}(`),
    )
    expect(functions).toHaveLength(3)
    const calls = new Map<string, { sql: string; args: string[] }>()
    for (const fn of functions) {
      const args = fn.args.map((type, index) =>
        type === 'pg_catalog.point'
          ? 'p'
          : index === 0 || fn.args[0] === 'pg_catalog.point'
            ? 'a'
            : 'b',
      )
      calls.set(fn.rustName, { sql: `pg_catalog."${fn.name}"(${args.join(',')})`, args })
    }
    const identities = new Set(functions.map(callableIdentity))
    for (const [index, op] of builtinCallables()
      .filter((fn) => fn.kind === 'operator' && identities.has(fn.implementation))
      .entries()) {
      if (op.kind !== 'operator') continue
      const fn = functions.find((fn) => callableIdentity(fn) === op.implementation)!,
        base = calls.get(fn.rustName)!
      calls.set('alias_' + index, {
        sql: `${base.args[0]} OPERATOR(pg_catalog.${op.name}) ${base.args[1]}`,
        args: base.args,
      })
    }
    const expressions: Record<string, string> = Object.fromEntries(
      [...calls].map(([name, call]) => [name, `${call.sql}=expected_value`]),
    )
    for (const fn of functions)
      expressions[fn.rustName + '_lazy'] =
        `CASE WHEN skip THEN true ELSE ${expressions[fn.rustName]} END`
    expressions.composed =
      'on_ppath(p,CASE WHEN choose_closed THEN pclose(a) ELSE popen(a) END)=expected_value'
    await pg.exec(
      `CREATE DOMAIN route AS path; CREATE TABLE path_predicates(a route,b path,p point,expected_value boolean,skip boolean,choose_closed boolean,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'path_predicates')!
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
    const pathInputs = new Map<string | null, Input>(),
      pointInputs = new Map<string | null, Input>()
    for (const a of paths) {
      const wire = (
        await pg.query<{ wire: string | null }>("SELECT encode(path_send($1::path),'hex') wire", [
          a,
        ])
      ).rows[0]!.wire
      pathInputs.set(a, decodePath(wire))
    }
    for (const p of positions) {
      const wire = (
        await pg.query<{ wire: string | null }>("SELECT encode(point_send($1::point),'hex') wire", [
          p,
        ])
      ).rows[0]!.wire
      const bytes = wire === null ? null : Buffer.from(wire, 'hex')
      pointInputs.set(
        p,
        bytes === null
          ? known(null)
          : known({ x: bytes.readBigInt64BE(), y: bytes.readBigInt64BE(8) }),
      )
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + suffix, row, expected })
    }
    const base: Row = {
      a: pathInputs.get(paths[5]!)!,
      b: pathInputs.get(paths[10]!)!,
      p: pointInputs.get('(2,2)')!,
      expected_value: known(true),
      skip: known(false),
      choose_closed: known(true),
    }
    for (const [name, call] of calls) {
      const pairs = call.args.includes('p')
        ? paths.flatMap((a) => positions.map((p) => ({ a, b: paths[10]!, p })))
        : paths.flatMap((a) => paths.map((b) => ({ a, b, p: '(2,2)' })))
      for (const { a, b, p } of pairs) {
        let result: boolean | null = null,
          expected: Outcome
        try {
          result = (
            await pg.query<{ result: boolean | null }>(
              `SELECT ${call.sql} result FROM (SELECT $1::path a,$2::path b,$3::point p) input`,
              [a, b, p],
            )
          ).rows[0]!.result
          expected = { kind: result === null ? 'Null' : 'True' }
        } catch (caught) {
          expected = failure((caught as { code: string }).code)
        }
        const row = {
          ...base,
          a: pathInputs.get(a)!,
          b: pathInputs.get(b)!,
          p: pointInputs.get(p)!,
          expected_value: known(result),
        }
        add(name, row, expected)
        if (result !== null)
          add(name, { ...row, expected_value: known(!result) }, { kind: 'False' })
      }
    }
    for (const fn of functions) {
      const call = calls.get(fn.rustName)!,
        [first, second] = call.args
      for (const state of [{ kind: 'Null' }, { kind: 'Unknown' }, failure('22012')] as Input[]) {
        add(fn.rustName, { ...base, [first!]: state }, state as Outcome)
        add(
          fn.rustName + '_lazy',
          { ...base, [first!]: state, skip: known(true) },
          { kind: 'True' },
        )
      }
      add(
        fn.rustName,
        { ...base, [first!]: { kind: 'Unknown' }, [second!]: failure('22003') },
        failure('22003'),
      )
      add(
        fn.rustName,
        { ...base, [first!]: failure('22012'), [second!]: failure('22003') },
        failure('22012'),
      )
    }
    for (const a of paths)
      for (const p of positions)
        for (const choose of [true, false]) {
          let result: boolean | null = null,
            expected: Outcome
          try {
            result = (
              await pg.query<{ result: boolean | null }>(
                'SELECT on_ppath($1::point,CASE WHEN $3 THEN pclose($2::path) ELSE popen($2::path) END) result',
                [p, a, choose],
              )
            ).rows[0]!.result
            expected = { kind: result === null ? 'Null' : 'True' }
          } catch (caught) {
            expected = failure((caught as { code: string }).code)
          }
          add(
            'composed',
            {
              ...base,
              a: pathInputs.get(a)!,
              p: pointInputs.get(p)!,
              choose_closed: known(choose),
              expected_value: known(result),
            },
            expected,
          )
        }
    await mkdir(join(root, 'parity'))
    await runCheckParity(
      join(root, 'parity'),
      'pathpredicates',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 360_000)
