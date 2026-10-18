import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { callableIdentity, type FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import { boxInputForms, deferredBoxPlatformForms } from './check-box-input-forms.js'
const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})
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
const boxes = [
  '((0,0),(0,0))',
  '((0,0),(3,4))',
  '((0,0),(6,2))',
  '((3,0),(0,4))',
  '((0,0),(0.0000005,1))',
  '((NaN,1),(0,0))',
  '((0,0),(NaN,1))',
  '((NaN,NaN),(NaN,NaN))',
  '((Infinity,-Infinity),(-Infinity,Infinity))',
  '((1e308,1e308),(1e308,-1e308))',
  '((1e308,1),(1e308,1))',
  '((1e-320,0),(0,1e-320))',
  '((-0,0),(0,-0))',
  null,
]
const serialize = (sql: string, type: string): string =>
  type === 'pg_catalog.bool'
    ? `boolsend(${sql})`
    : type === 'pg_catalog.float8'
      ? `float8send(${sql})`
      : type === 'pg_catalog.point'
        ? `point_send(${sql})`
        : type === 'pg_catalog.box'
          ? `box_send(${sql})`
          : type === 'pg_catalog.lseg'
            ? `lseg_send(${sql})`
            : sql

describe('portable boxes', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-box-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })

  it('matches catalog operations and operators, corner order, area tolerance, center arithmetic, NULLs, errors and lazy composition in every target', async () => {
    const source = await readFile(
      'crates/check-evaluator/src/operations/pg_catalog/box_core.rs',
      'utf8',
    )
    const functions = builtinCallables().filter(
      (fn): fn is FunctionMetadata =>
        fn.kind === 'function' && source.includes(`pub fn ${fn.rustName}(`),
    )
    expect(functions).toHaveLength(17)
    const identities = new Set(functions.map(callableIdentity))
    const calls = new Map<
      string,
      { sql: string; result: string; inputs: string[]; nanDeferred: boolean }
    >()
    for (const fn of functions) {
      const inputs =
        fn.args[0] === 'pg_catalog.point'
          ? fn.args.length === 1
            ? ['p']
            : ['p', 'q']
          : fn.args.length === 1
            ? ['a']
            : ['a', 'b']
      calls.set(fn.rustName, {
        sql: `pg_catalog."${fn.name}"(${inputs.join(',')})`,
        result: fn.result,
        inputs,
        nanDeferred: fn.result === 'pg_catalog.point' || fn.result === 'pg_catalog.float8',
      })
    }
    for (const [index, op] of builtinCallables()
      .filter((fn) => fn.kind === 'operator' && identities.has(fn.implementation))
      .entries()) {
      if (op.kind !== 'operator') continue
      const name = `OPERATOR(pg_catalog.${op.name})`
      const inputs = op.args.length === 1 ? ['a'] : ['a', 'b']
      calls.set('operator_' + index, {
        sql: op.left === null ? `${name} a` : op.right === null ? `a ${name}` : `a ${name} b`,
        result: op.result,
        inputs,
        nanDeferred: calls.get(
          functions.find((fn) => callableIdentity(fn) === op.implementation)!.rustName,
        )!.nanDeferred,
      })
    }
    const expressions: Record<string, string> = Object.fromEntries(
      [...calls].map(([name, call]) => [name, `${serialize(call.sql, call.result)} = expected`]),
    )
    Object.assign(expressions, {
      lazy: 'CASE WHEN skip THEN true ELSE box_send(a)=expected END',
      selected: 'box_send(CASE WHEN skip THEN a ELSE b END)=expected',
      coalesced: 'box_send(COALESCE(a,b))=expected',
      absent: 'a IS NULL',
      present: 'a IS NOT NULL',
      null_literal: 'box_send(NULL::box) IS NULL',
      nan_width: "width(a) = 'NaN'::float8",
      midpoint_same: 'box_center(a) ~= box_center(a)',
      computed_nan_present:
        "box(point(slope('(Infinity,Infinity)'::point,'(0,0)'::point),0::float8),p) IS NOT NULL",
      computed_nan_equal:
        "box_same(box(point(slope('(Infinity,Infinity)'::point,'(0,0)'::point),0::float8),p),box(point('NaN'::float8,0::float8),p))",
      computed_nan_wire:
        "box_send(box(point(slope('(Infinity,Infinity)'::point,'(0,0)'::point),0::float8),p))=expected",
    })
    await pg.exec(`CREATE DOMAIN edge AS box; CREATE DOMAIN nested_edge AS edge;
      CREATE TABLE boxes(a nested_edge,b box,p point,q point,expected bytea,skip boolean,
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'boxes')!
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
    const wires = new Map<string | null, string | null>(),
      values = new Map<string | null, Input>()
    for (const text of boxes) {
      const wire = (
        await pg.query<{ wire: string | null }>("SELECT encode(box_send($1::box),'hex') wire", [
          text,
        ])
      ).rows[0]!.wire
      wires.set(text, wire)
      values.set(text, box(wire))
    }
    const pointValue = (x: bigint, y: bigint) => known({ x, y })
    const p = pointValue(0n, 0n),
      q = pointValue(0x4008000000000000n, 0x4010000000000000n)
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + suffix, row, expected })
    }
    for (const a of boxes)
      for (const [index, b] of boxes.entries())
        for (const [name, call] of calls) {
          if (call.inputs.length === 1 && index !== 0) continue
          if (call.inputs[0] === 'p' && (a !== boxes[0] || index !== 0)) continue
          let wire: string | null = null,
            expected: Outcome
          try {
            wire = (
              await pg.query<{ wire: string | null }>(
                `SELECT encode(${serialize(call.sql, call.result)},'hex') wire FROM (SELECT $1::box a,$2::box b,point(0,0) p,point(3,4) q) candidate`,
                [a, b],
              )
            ).rows[0]!.wire
            const nanPoint =
              call.nanDeferred &&
              wire !== null &&
              (call.result === 'pg_catalog.point' ? [0, 8] : [0]).some((at) =>
                Number.isNaN(Buffer.from(wire!, 'hex').readDoubleBE(at)),
              )
            expected = { kind: nanPoint ? 'Unknown' : wire === null ? 'Null' : 'True' }
          } catch (caught) {
            const code = (caught as { code: string }).code
            expect(['22003', '22012']).toContain(code)
            expected = failure(code)
          }
          const row = {
            a: values.get(a)!,
            b: values.get(b)!,
            p,
            q,
            expected: known(wire),
            skip: known(false),
          }
          add(name, row, expected)
          if (wire !== null && expected.kind !== 'Unknown')
            add(name, { ...row, expected: known('ff') }, { kind: 'False' })
        }
    for (const a of boxes) {
      const row = {
        a: values.get(a)!,
        b: values.get(boxes[1]!)!,
        p,
        q,
        expected: known(wires.get(a)!),
        skip: known(true),
      }
      add('selected', row, { kind: a === null ? 'Null' : 'True' })
      add(
        'coalesced',
        { ...row, expected: known(a === null ? wires.get(boxes[1]!)! : wires.get(a)!) },
        { kind: 'True' },
      )
      add('absent', row, { kind: a === null ? 'True' : 'False' })
      add('present', row, { kind: a === null ? 'False' : 'True' })
      add('null_literal', row, { kind: 'True' })
      let expected: Outcome
      try {
        const result = (
          await pg.query<{ value: boolean | null }>(
            `SELECT ${expressions.midpoint_same} value FROM (SELECT $1::box a) candidate`,
            [a],
          )
        ).rows[0]!.value
        expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
      } catch (caught) {
        expected = failure((caught as { code: string }).code)
      }
      add('midpoint_same', row, expected)
    }
    const row: Row = {
      a: values.get(boxes[1]!)!,
      b: values.get(boxes[1]!)!,
      p,
      q,
      expected: known(wires.get(boxes[1]!)!),
      skip: known(true),
    }
    const sender = functions.find((fn) => fn.name === 'box_send')!,
      width = functions.find((fn) => fn.name === 'width')!,
      area = functions.find((fn) => fn.name === 'area')!
    for (const [i, sql] of [
      "box_intersect('((0,0),(1,1))'::box,'((1.0000005,0),(2,1))'::box)",
      "'((1,1),(-Infinity,0))'::box + '(Infinity,0)'::point",
    ].entries()) {
      const stored = (
        await pg.query<{ wire: string; width: string; area: string }>(
          `SELECT encode(box_send(value),'hex') wire,encode(float8send(width(value)),'hex') width,encode(float8send(area(value)),'hex') area FROM (SELECT ${sql} value) candidate`,
        )
      ).rows[0]!
      const candidate = { ...row, a: box(stored.wire), expected: known(stored.wire) }
      add(sender.rustName, candidate, { kind: 'True' })
      add('present', candidate, { kind: 'True' })
      add(
        width.rustName,
        { ...candidate, expected: known(stored.width) },
        { kind: i === 0 ? 'True' : 'Unknown' },
      )
      add(
        area.rustName,
        { ...candidate, expected: known(stored.area) },
        { kind: i === 0 ? 'True' : 'Unknown' },
      )
      if (i === 1) add('nan_width', candidate, { kind: 'True' })
    }
    const constructor = functions.find(
      (fn) => fn.args.length === 2 && fn.args[0] === 'pg_catalog.point',
    )!
    for (const [first, second] of [
      ['(0,0)', '(0,0)'],
      ['(0,0)', '(0.0000005,0.0000005)'],
      ['(-0,0)', '(0,-0)'],
      ['(NaN,1)', '(0,0)'],
      ['(0,NaN)', '(NaN,0)'],
      ['(Infinity,Infinity)', '(-Infinity,-Infinity)'],
      ['(1e308,0)', '(-1e308,1)'],
      [null, '(0,0)'],
      ['(0,0)', null],
    ]) {
      const result = (
        await pg.query<{ wire: string | null; p: string | null; q: string | null }>(
          "SELECT encode(box_send(box($1::point,$2::point)),'hex') wire,encode(point_send($1::point),'hex') p,encode(point_send($2::point),'hex') q",
          [first, second],
        )
      ).rows[0]!
      const point = (hex: string | null): Input => {
        if (hex === null) return known(null)
        const b = Buffer.from(hex, 'hex')
        return pointValue(b.readBigInt64BE(), b.readBigInt64BE(8))
      }
      add(
        constructor.rustName,
        { ...row, p: point(result.p), q: point(result.q), expected: known(result.wire) },
        { kind: result.wire === null ? 'Null' : 'True' },
      )
    }
    for (const state of [{ kind: 'Unknown' }, { kind: 'Null' }, failure('22012')] as Input[]) {
      add('selected', { ...row, b: state }, { kind: 'True' })
      add('coalesced', { ...row, b: state }, { kind: 'True' })
      add('lazy', { ...row, a: state }, { kind: 'True' })
      add('lazy', { ...row, a: state, skip: known(false) }, state as Outcome)
      add(
        'absent',
        { ...row, a: state },
        state.kind === 'Null' ? { kind: 'True' } : (state as Outcome),
      )
      add(
        'present',
        { ...row, a: state },
        state.kind === 'Null' ? { kind: 'False' } : (state as Outcome),
      )
      for (const [name, call] of calls) {
        const first = call.inputs[0]!,
          second = call.inputs[1]
        add(name, { ...row, [first]: state }, state as Outcome)
        if (second) {
          add(
            name,
            { ...row, [first]: { kind: 'Unknown' }, [second]: failure('22003') },
            failure('22003'),
          )
          add(
            name,
            { ...row, [first]: failure('22012'), [second]: failure('22003') },
            failure('22012'),
          )
        }
      }
    }
    add('computed_nan_present', row, { kind: 'True' })
    add('computed_nan_equal', row, { kind: 'True' })
    add('computed_nan_wire', row, { kind: 'Unknown' })
    await runCheckParity(
      directory,
      'boxcore',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  }, 360_000)

  it('matches point-pair grammar, literal preparation, catalog I/O casts and unconstrained domains across targets', async () => {
    const expressions = {
      wire: 'box_send(source::box)=expected',
      varying: 'box_send(source::varchar::box)=expected',
      domain: 'box_send(source::nested_edge)=expected',
      typename: 'box_send(box(source))=expected',
      same: 'box_same(source::box,reference)',
      present: '(source::box IS NOT NULL)=recorded_present',
      lazy: 'CASE WHEN skip THEN true ELSE box_send(source::box)=expected END',
      literal: "box_send('((0,0),(3,4))'::box)=expected",
      domain_literal: "box_send('((0,0),(3,4))'::nested_edge)=expected",
      implicit_literal: "box_same(reference,'((0,0),(3,4))')",
      null_literal: 'box_send(NULL::box)=expected',
    }
    await pg.exec(
      `CREATE TABLE box_inputs(source text,reference nested_edge,expected bytea,recorded_present boolean,skip boolean,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'box_inputs')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const stored = table.constraints.find((c) => c.name === name)!
      return [
        { ...stored, name: name + '_raw', definition: `CHECK(${sql})` },
        { ...stored, name: name + '_stored' },
      ]
    })
    const invalid = "CASE WHEN skip THEN true ELSE box_send('((bad,0),(0,0))'::box)=expected END"
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
    for (const source of boxInputForms) {
      let wire: string | null = null,
        expected: Outcome
      try {
        wire = (
          await pg.query<{ wire: string | null }>("SELECT encode(box_send($1::box),'hex') wire", [
            source,
          ])
        ).rows[0]!.wire
        expected = { kind: wire === null ? 'Null' : 'True' }
      } catch (caught) {
        const code = (caught as { code: string }).code
        expect(['22P02', '22003']).toContain(code)
        expected = failure(code)
      }
      const row = {
        source: known(source),
        reference: box(wire),
        expected: known(wire),
        recorded_present: known(source !== null),
        skip: known(false),
      }
      const nanWire =
        wire !== null &&
        Array.from({ length: 4 }, (_, index) => index * 8).some((at) =>
          Number.isNaN(Buffer.from(wire!, 'hex').readDoubleBE(at)),
        )
      for (const name of ['wire', 'varying', 'domain', 'typename', 'same', 'lazy'])
        add(name, row, nanWire && name !== 'same' ? { kind: 'Unknown' } : expected)
      add('present', row, expected.kind === 'Null' ? { kind: 'True' } : expected)
      add('lazy', { ...row, skip: known(true) }, { kind: 'True' })
    }
    const wire = '4008000000000000401000000000000000000000000000000000000000000000'
    const row = {
      source: known('bad'),
      reference: box(wire),
      expected: known(wire),
      recorded_present: known(true),
      skip: known(true),
    }
    for (const name of ['literal', 'domain_literal', 'implicit_literal'])
      add(name, row, { kind: 'True' })
    add('null_literal', row, { kind: 'Null' })
    for (const skip of [true, false])
      add('invalid_literal', { ...row, skip: known(skip) }, failure('22P02'))
    for (const source of [...deferredBoxPlatformForms, '[' + '0'.repeat(4096) + ']'])
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
      'boxinput',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  }, 180_000)

  it('validates public corner carriers and retains semantic results when wire precision is unavailable', async () => {
    await pg.exec(`CREATE TABLE box_payloads(edge box,reference box,expected bytea,
      CONSTRAINT wire CHECK(box_send(edge)=expected),CONSTRAINT same CHECK(box_same(edge,reference)),
      CONSTRAINT present CHECK(edge IS NOT NULL),CONSTRAINT absent CHECK(edge IS NULL))`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'box_payloads')!
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
        highX: 0x4008000000000000n,
        highY: 0x4010000000000000n,
        lowX: 0n,
        lowY: 0n,
        wireKnown: true,
      },
      value = { kind: 'Value', value: payload }
    const wire = Buffer.from(
      '4008000000000000401000000000000000000000000000000000000000000000',
      'hex',
    )
    type Result = { certain: boolean; value?: boolean | null; error?: string }
    const evaluate = (
      edge: unknown,
      reference: unknown = value,
      expected: unknown = wire,
    ): Record<string, Result> =>
      Object.fromEntries(
        generated
          .evaluatePublicBoxPayloadsChecks({ edge, reference, expected })
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
    for (const edge of [
      undefined,
      '((0,0),(3,4))',
      { kind: 'Unknown' },
      { kind: 'Value', value: { ...payload, highX: 9223372036854775808n } },
      { kind: 'Value', value: { ...payload, lowY: '0' } },
      { kind: 'Value', value: { ...payload, wireKnown: 'false' } },
    ])
      expect(Object.values(evaluate(edge))).toEqual(
        Array.from({ length: 4 }, () => ({ certain: false })),
      )
    for (const edge of [null, { kind: 'Null' }])
      expect(evaluate(edge)).toEqual({
        wire: { certain: true, value: null },
        same: { certain: true, value: null },
        present: { certain: true, value: false },
        absent: { certain: true, value: true },
      })
    expect(Object.values(evaluate(failure('22012')))).toEqual(
      Array.from({ length: 4 }, () => ({ certain: true, error: '22012' })),
    )
    for (const lower of [0x4008000000000000n, 0x7ff8000000000000n]) {
      const unordered = { kind: 'Value', value: { ...payload, highX: 0n, lowX: lower } }
      expect(evaluate(unordered)).toEqual({
        ...knownResults,
        wire: { certain: true, value: false },
        same: { certain: true, value: false },
      })
    }
    await pg.exec(`CREATE TABLE stored_box_values(id int,shape box CHECK(shape IS NOT NULL));
      INSERT INTO stored_box_values VALUES(1,box_intersect('((0,0),(1,1))'::box,'((1.0000005,0),(2,1))'::box)),
      (2,'((1,1),(-Infinity,0))'::box + '(Infinity,0)'::point)`)
    for (const stored of (
      await pg.query<{ wire: string }>(
        "SELECT encode(box_send(shape),'hex') wire FROM stored_box_values ORDER BY id",
      )
    ).rows) {
      const bytes = Buffer.from(stored.wire, 'hex')
      const row = {
        kind: 'Value',
        value: {
          highX: bytes.readBigInt64BE(),
          highY: bytes.readBigInt64BE(8),
          lowX: bytes.readBigInt64BE(16),
          lowY: bytes.readBigInt64BE(24),
        },
      }
      expect(evaluate(row, row, bytes)).toEqual(knownResults)
    }
    const nan = { kind: 'Value', value: { ...payload, highX: 0x7ff0000000000001n } }
    expect(
      evaluate(
        nan,
        nan,
        Buffer.from('7ff0000000000001401000000000000000000000000000000000000000000000', 'hex'),
      ),
    ).toEqual(knownResults)
  }, 120_000)
  it('enforces geometric domains and resolves qualified domain names separately from builtins', async () => {
    await pg.exec(`CREATE DOMAIN checked_box AS box CHECK(area(VALUE)=0);
      CREATE DOMAIN required_box AS box NOT NULL;
      CREATE SCHEMA box_shadow;CREATE DOMAIN box_shadow.date AS box;
      CREATE TABLE box_domains(source text,expected bytea,
        CONSTRAINT qualified CHECK(box_send(source::box_shadow.date)=expected),
        CONSTRAINT enforced CHECK(box_send(source::checked_box)=expected),
        CONSTRAINT required CHECK(box_send(source::required_box)=expected),
        CONSTRAINT builtin_day CHECK(source::date IS NOT NULL))`)
    await expect(pg.query('SELECT $1::checked_box', ['((0,0),(3,4))'])).rejects.toMatchObject({
      code: '23514',
    })
    await expect(pg.query('SELECT $1::required_box', [null])).rejects.toMatchObject({
      code: '23502',
    })
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'box_domains')!
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
      source: known('((0,0),(3,4))'),
      expected: known('4008000000000000401000000000000000000000000000000000000000000000'),
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
      for (const source of [null, '((0,0),(3,4))', 'bad'])
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
    const acceptedSource = '((0,0),(3,0))'
    const acceptedWire = (
      await pg.query<{ value: string }>(`SELECT encode(box_send($1::box),'hex') AS value`, [
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
      'artifacts/geometric-domain-casts/box.json',
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
      'boxdomains',
      group,
      plans.map((plan) => plan.identity.constraint),
      parityFixtures,
    )
  }, 120_000)
})
