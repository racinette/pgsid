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
import { lsegInputForms, deferredLsegPlatformForms } from './check-lseg-input-forms.js'
const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})
const segment = (wire: string | null): Input => {
  if (wire === null) return known(null)
  const b = Buffer.from(wire, 'hex')
  return known({
    x1: b.readBigInt64BE(),
    y1: b.readBigInt64BE(8),
    x2: b.readBigInt64BE(16),
    y2: b.readBigInt64BE(24),
  })
}
const segments = [
  '[(0,0),(0,0)]',
  '[(0,0),(3,4)]',
  '[(3,4),(0,0)]',
  '[(0,0),(0.0000005,0.0000005)]',
  '[(0,0),(1.000001,0)]',
  '[(NaN,1),(0,0)]',
  '[(Infinity,-Infinity),(-Infinity,Infinity)]',
  '[(1e308,1e308),(1e308,-1e308)]',
  '[(-0,0),(0,-0)]',
  null,
]
const serialize = (sql: string, type: string): string =>
  type === 'pg_catalog.bool'
    ? `boolsend(${sql})`
    : type === 'pg_catalog.float8'
      ? `float8send(${sql})`
      : type === 'pg_catalog.point'
        ? `point_send(${sql})`
        : type === 'pg_catalog.lseg'
          ? `lseg_send(${sql})`
          : sql

describe('portable line segments', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-lseg-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })

  it('matches catalog operations and operators, endpoint order, length tolerance, midpoint arithmetic, NULLs, errors and lazy composition in every target', async () => {
    const source = await readFile(
      'crates/check-evaluator/src/operations/pg_catalog/lseg_core.rs',
      'utf8',
    )
    const functions = builtinCallables().filter(
      (fn): fn is FunctionMetadata =>
        fn.kind === 'function' && source.includes(`pub fn ${fn.rustName}(`),
    )
    expect(functions).toHaveLength(20)
    const identities = new Set(functions.map(callableIdentity))
    const calls = new Map<string, { sql: string; result: string; inputs: string[] }>()
    for (const fn of functions) {
      const inputs =
        fn.args[0] === 'pg_catalog.point' ? ['p', 'q'] : fn.args.length === 1 ? ['a'] : ['a', 'b']
      calls.set(fn.rustName, {
        sql: `pg_catalog."${fn.name}"(${inputs.join(',')})`,
        result: fn.result,
        inputs,
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
      })
    }
    const expressions: Record<string, string> = Object.fromEntries(
      [...calls].map(([name, call]) => [name, `${serialize(call.sql, call.result)} = expected`]),
    )
    Object.assign(expressions, {
      lazy: 'CASE WHEN skip THEN true ELSE lseg_send(a)=expected END',
      selected: 'lseg_send(CASE WHEN skip THEN a ELSE b END)=expected',
      coalesced: 'lseg_send(COALESCE(a,b))=expected',
      absent: 'a IS NULL',
      present: 'a IS NOT NULL',
      null_literal: 'lseg_send(NULL::lseg) IS NULL',
      midpoint_same: 'lseg_center(a) ~= lseg_center(a)',
      computed_nan_present:
        "lseg(point(slope('(Infinity,Infinity)'::point,'(0,0)'::point),0::float8),p) IS NOT NULL",
      computed_nan_equal:
        "lseg_eq(lseg(point(slope('(Infinity,Infinity)'::point,'(0,0)'::point),0::float8),p),lseg(point('NaN'::float8,0::float8),p))",
      computed_nan_wire:
        "lseg_send(lseg(point(slope('(Infinity,Infinity)'::point,'(0,0)'::point),0::float8),p))=expected",
    })
    await pg.exec(`CREATE DOMAIN edge AS lseg; CREATE DOMAIN nested_edge AS edge;
      CREATE TABLE segments(a nested_edge,b lseg,p point,q point,expected bytea,skip boolean,
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'segments')!
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
    for (const text of segments) {
      const wire = (
        await pg.query<{ wire: string | null }>("SELECT encode(lseg_send($1::lseg),'hex') wire", [
          text,
        ])
      ).rows[0]!.wire
      wires.set(text, wire)
      values.set(text, segment(wire))
    }
    const pointValue = (x: bigint, y: bigint) => known({ x, y })
    const p = pointValue(0n, 0n),
      q = pointValue(0x4008000000000000n, 0x4010000000000000n)
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + suffix, row, expected })
    }
    for (const a of segments)
      for (const [index, b] of segments.entries())
        for (const [name, call] of calls) {
          if (call.inputs.length === 1 && index !== 0) continue
          if (call.inputs[0] === 'p' && (a !== segments[0] || index !== 0)) continue
          let wire: string | null = null,
            expected: Outcome
          try {
            wire = (
              await pg.query<{ wire: string | null }>(
                `SELECT encode(${serialize(call.sql, call.result)},'hex') wire FROM (SELECT $1::lseg a,$2::lseg b,point(0,0) p,point(3,4) q) candidate`,
                [a, b],
              )
            ).rows[0]!.wire
            const nanPoint =
              call.result === 'pg_catalog.point' &&
              wire !== null &&
              [0, 8].some((at) => Number.isNaN(Buffer.from(wire!, 'hex').readDoubleBE(at)))
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
    for (const a of segments) {
      const row = {
        a: values.get(a)!,
        b: values.get(segments[1]!)!,
        p,
        q,
        expected: known(wires.get(a)!),
        skip: known(true),
      }
      add('selected', row, { kind: a === null ? 'Null' : 'True' })
      add(
        'coalesced',
        { ...row, expected: known(a === null ? wires.get(segments[1]!)! : wires.get(a)!) },
        { kind: 'True' },
      )
      add('absent', row, { kind: a === null ? 'True' : 'False' })
      add('present', row, { kind: a === null ? 'False' : 'True' })
      add('null_literal', row, { kind: 'True' })
      let expected: Outcome
      try {
        const result = (
          await pg.query<{ value: boolean | null }>(
            `SELECT ${expressions.midpoint_same} value FROM (SELECT $1::lseg a) candidate`,
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
      a: values.get(segments[1]!)!,
      b: values.get(segments[1]!)!,
      p,
      q,
      expected: known(wires.get(segments[1]!)!),
      skip: known(true),
    }
    const constructor = functions.find((fn) => fn.args[0] === 'pg_catalog.point')!
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
          "SELECT encode(lseg_send(lseg($1::point,$2::point)),'hex') wire,encode(point_send($1::point),'hex') p,encode(point_send($2::point),'hex') q",
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
      'lsegcore',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  }, 360_000)

  it('matches point-pair grammar, literal preparation, catalog I/O casts and unconstrained domains across targets', async () => {
    const expressions = {
      wire: 'lseg_send(source::lseg)=expected',
      varying: 'lseg_send(source::varchar::lseg)=expected',
      domain: 'lseg_send(source::nested_edge)=expected',
      typename: 'lseg_send(lseg(source))=expected',
      same: 'lseg_eq(source::lseg,reference)',
      present: '(source::lseg IS NOT NULL)=recorded_present',
      lazy: 'CASE WHEN skip THEN true ELSE lseg_send(source::lseg)=expected END',
      literal: "lseg_send('[(0,0),(3,4)]'::lseg)=expected",
      domain_literal: "lseg_send('[(0,0),(3,4)]'::nested_edge)=expected",
      implicit_literal: "lseg_eq(reference,'[(0,0),(3,4)]')",
      null_literal: 'lseg_send(NULL::lseg)=expected',
    }
    await pg.exec(
      `CREATE TABLE segment_inputs(source text,reference nested_edge,expected bytea,recorded_present boolean,skip boolean,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'segment_inputs')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const stored = table.constraints.find((c) => c.name === name)!
      return [
        { ...stored, name: name + '_raw', definition: `CHECK(${sql})` },
        { ...stored, name: name + '_stored' },
      ]
    })
    const invalid = "CASE WHEN skip THEN true ELSE lseg_send('[(bad,0),(0,0)]'::lseg)=expected END"
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
    for (const source of lsegInputForms) {
      let wire: string | null = null,
        expected: Outcome
      try {
        wire = (
          await pg.query<{ wire: string | null }>("SELECT encode(lseg_send($1::lseg),'hex') wire", [
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
        reference: segment(wire),
        expected: known(wire),
        recorded_present: known(source !== null),
        skip: known(false),
      }
      for (const name of ['wire', 'varying', 'domain', 'typename', 'same', 'lazy'])
        add(name, row, expected)
      add('present', row, expected.kind === 'Null' ? { kind: 'True' } : expected)
      add('lazy', { ...row, skip: known(true) }, { kind: 'True' })
    }
    const wire = '0000000000000000000000000000000040080000000000004010000000000000'
    const row = {
      source: known('bad'),
      reference: segment(wire),
      expected: known(wire),
      recorded_present: known(true),
      skip: known(true),
    }
    for (const name of ['literal', 'domain_literal', 'implicit_literal'])
      add(name, row, { kind: 'True' })
    add('null_literal', row, { kind: 'Null' })
    for (const skip of [true, false])
      add('invalid_literal', { ...row, skip: known(skip) }, failure('22P02'))
    for (const source of [...deferredLsegPlatformForms, '[' + '0'.repeat(4096) + ']'])
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
      'lseginput',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  }, 180_000)

  it('validates public endpoint carriers and retains semantic results when wire precision is unavailable', async () => {
    await pg.exec(`CREATE TABLE segment_payloads(edge lseg,reference lseg,expected bytea,
      CONSTRAINT wire CHECK(lseg_send(edge)=expected),CONSTRAINT same CHECK(lseg_eq(edge,reference)),
      CONSTRAINT present CHECK(edge IS NOT NULL),CONSTRAINT absent CHECK(edge IS NULL))`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'segment_payloads')!
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
        x1: 0n,
        y1: 0n,
        x2: 0x4008000000000000n,
        y2: 0x4010000000000000n,
        wireKnown: true,
      },
      value = { kind: 'Value', value: payload }
    const wire = Buffer.from(
      '0000000000000000000000000000000040080000000000004010000000000000',
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
          .evaluatePublicSegmentPayloadsChecks({ edge, reference, expected })
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
      '[(0,0),(3,4)]',
      { kind: 'Unknown' },
      { kind: 'Value', value: { ...payload, x1: 9223372036854775808n } },
      { kind: 'Value', value: { ...payload, y2: '0' } },
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
    const nan = { kind: 'Value', value: { ...payload, x1: 0x7ff0000000000001n } }
    expect(
      evaluate(
        nan,
        nan,
        Buffer.from('7ff0000000000001000000000000000040080000000000004010000000000000', 'hex'),
      ),
    ).toEqual(knownResults)
  }, 120_000)
  it('keeps constrained domain coercions deferred and resolves qualified domain names separately from builtins', async () => {
    await pg.exec(`CREATE DOMAIN checked_segment AS lseg CHECK(ishorizontal(VALUE));
      CREATE DOMAIN required_segment AS lseg NOT NULL;
      CREATE SCHEMA segment_shadow;CREATE DOMAIN segment_shadow.date AS lseg;
      CREATE TABLE segment_domains(source text,expected bytea,
        CONSTRAINT qualified CHECK(lseg_send(source::segment_shadow.date)=expected),
        CONSTRAINT enforced CHECK(lseg_send(source::checked_segment)=expected),
        CONSTRAINT required CHECK(lseg_send(source::required_segment)=expected),
        CONSTRAINT builtin_day CHECK(source::date IS NOT NULL))`)
    await expect(pg.query('SELECT $1::checked_segment', ['[(0,0),(3,4)]'])).rejects.toMatchObject({
      code: '23514',
    })
    await expect(pg.query('SELECT $1::required_segment', [null])).rejects.toMatchObject({
      code: '23502',
    })
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'segment_domains')!
    const constraints = table.constraints.filter((c) => c.type === 'check')
    const group = prepareCheckRustGroup(
      constraints.map((c) => ({
        expression: lowerTableCheck(table, c, [], catalog.domains)!.expression,
        identity: { schema: 'public', kind: 'table', owner: table.name, constraint: c.name },
      })),
    )
    for (const [i, c] of group.checks.entries())
      expect(c.kind, constraints[i]!.name).toBe('supported')
    const row: Row = {
      source: known('[(0,0),(3,4)]'),
      expected: known('0000000000000000000000000000000040080000000000004010000000000000'),
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
      for (const source of [null, '[(0,0),(3,4)]', 'bad'])
        fixtures.push({
          name,
          row: { ...row, source: known(source) },
          expected: { kind: 'Unknown' },
        })
    const target = join(directory, 'domains')
    await mkdir(target)
    await runCheckParity(
      target,
      'lsegdomains',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  }, 120_000)
})
