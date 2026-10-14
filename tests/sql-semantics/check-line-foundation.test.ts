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

const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})
const lines = [
  '{1,-1,0}',
  '{2,-2,0}',
  '{0,-1,2}',
  '{-1,0,3}',
  '{0.0000005,1,1}',
  '{0.000001,1,1}',
  '{0.0000010000000002,1,1}',
  '{1,1,NaN}',
  '{NaN,1,1}',
  '{1,NaN,1}',
  '{NaN,NaN,NaN}',
  '{Infinity,-1,0}',
  '{1,Infinity,0}',
  '{-Infinity,Infinity,-Infinity}',
  '{1e308,1e308,1e308}',
  '{1e-5,1e-5,1e308}',
  '{1,1,-0}',
  null,
]

describe('portable line value foundation', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-line-foundation-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })

  it('preserves SQL-coerced coefficient bits, proportional equality, orientation, domains, NULLs and expression composition across evaluator targets', async () => {
    const source = await readFile(
      'crates/check-evaluator/src/operations/pg_catalog/line_core.rs',
      'utf8',
    )
    const functions = builtinCallables().filter(
      (fn): fn is FunctionMetadata =>
        fn.kind === 'function' && source.includes(`pub fn ${fn.rustName}(`),
    )
    expect(functions).toHaveLength(6)
    const identities = new Set(functions.map(callableIdentity))
    const expressions: Record<string, string> = {}
    const arities = new Map<string, number>()
    for (const fn of functions) {
      const call = `pg_catalog."${fn.name}"(${fn.args.length === 2 ? 'a,b' : 'a'})`
      expressions[fn.rustName] =
        (fn.result === 'pg_catalog.bool' ? `boolsend(${call})` : call) + ' = expected'
      arities.set(fn.rustName, fn.args.length)
    }
    for (const [index, operator] of builtinCallables()
      .filter((fn) => fn.kind === 'operator' && identities.has(fn.implementation))
      .entries()) {
      if (operator.kind !== 'operator') continue
      const name = 'operator_' + index
      const spelling = `OPERATOR(pg_catalog.${operator.name})`
      const call =
        operator.left === null
          ? `${spelling} a`
          : operator.right === null
            ? `a ${spelling}`
            : `a ${spelling} b`
      expressions[name] = `boolsend(${call}) = expected`
      arities.set(name, operator.args.length)
    }
    expect(arities.size).toBeGreaterThan(6)
    Object.assign(expressions, {
      lazy: 'CASE WHEN skip THEN true ELSE line_send(a) = expected END',
      selected: 'line_send(CASE WHEN skip THEN a ELSE b END) = expected',
      coalesced: 'line_send(COALESCE(a,b)) = expected',
      absent: 'a IS NULL',
      present: 'a IS NOT NULL',
      null_literal: 'line_send(NULL::line) IS NULL',
    })
    await pg.exec(
      `CREATE DOMAIN imported_axis AS line; CREATE DOMAIN nested_axis AS imported_axis;
       CREATE TABLE line_checks(a nested_axis,b line,expected bytea,skip boolean,${Object.entries(
         expressions,
       )
         .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
         .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'line_checks')!
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
    const values = new Map<string | null, Input>()
    const wires = new Map<string | null, string | null>()
    for (const text of lines) {
      const wire = (
        await pg.query<{ wire: string | null }>("SELECT encode(line_send($1::line),'hex') wire", [
          text,
        ])
      ).rows[0]!.wire
      wires.set(text, wire)
      const bits = (at: number) => BigInt.asIntN(64, BigInt('0x' + wire!.slice(at, at + 16)))
      values.set(
        text,
        wire === null ? known(null) : known({ a: bits(0), b: bits(16), c: bits(32) }),
      )
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + suffix, row, expected })
    }
    for (const a of lines) {
      for (const [index, b] of lines.entries()) {
        for (const [name, arity] of arities) {
          if (arity === 1 && index !== 0) continue
          let wire: string | null = null
          let expected: Outcome
          try {
            const selected = (
              await pg.query<{ wire: string | null }>(
                `SELECT encode(${expressions[name]!.slice(0, -' = expected'.length)},'hex') wire
                 FROM (SELECT $1::line AS a,$2::line AS b) candidate`,
                [a, b],
              )
            ).rows[0]!
            wire = selected.wire
            expected = { kind: wire === null ? 'Null' : 'True' }
          } catch (caught) {
            const code = (caught as { code: string }).code
            expect(['22003', '22012']).toContain(code)
            expected = failure(code)
          }
          const row = {
            a: values.get(a)!,
            b: values.get(b)!,
            expected: known(wire),
            skip: known(false),
          }
          add(name, row, expected)
          if (wire !== null) add(name, { ...row, expected: known('ff') }, { kind: 'False' })
        }
      }
      const row = {
        a: values.get(a)!,
        b: values.get(lines[0]!)!,
        expected: known(wires.get(a)!),
        skip: known(true),
      }
      add('selected', row, { kind: a === null ? 'Null' : 'True' })
      add(
        'coalesced',
        { ...row, expected: known(a === null ? wires.get(lines[0]!)! : wires.get(a)!) },
        { kind: 'True' },
      )
      add('absent', row, { kind: a === null ? 'True' : 'False' })
      add('present', row, { kind: a === null ? 'False' : 'True' })
      add('null_literal', row, { kind: 'True' })
    }
    const row: Row = {
      a: values.get(lines[0]!)!,
      b: values.get(lines[1]!)!,
      expected: known(wires.get(lines[0]!)!),
      skip: known(true),
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
      for (const [name, arity] of arities) {
        add(name, { ...row, a: state }, state as Outcome)
        if (arity === 2) {
          add(name, { ...row, a: { kind: 'Unknown' }, b: failure('22003') }, failure('22003'))
          add(name, { ...row, a: failure('22012'), b: failure('22003') }, failure('22012'))
        }
      }
    }
    for (const [text, payload] of [
      ['{0,0,1}', { a: 0n, b: 0n, c: 0x3ff0000000000000n }],
      ['{0.0000005,0,1}', { a: 0x3ea0c6f7a0b5ed8dn, b: 0n, c: 0x3ff0000000000000n }],
    ] as const) {
      await expect(pg.query('SELECT $1::line', [text])).rejects.toMatchObject({ code: '22P02' })
      const invalid = { ...row, a: known(payload) }
      add('absent', invalid, { kind: 'Unknown' })
      add('present', invalid, { kind: 'Unknown' })
      add('coalesced', invalid, { kind: 'Unknown' })
      add('lazy', invalid, { kind: 'True' })
      for (const name of arities.keys()) add(name, invalid, { kind: 'Unknown' })
    }
    await runCheckParity(
      directory,
      'linefoundation',
      group,
      constraints.map((constraint) => constraint.name),
      fixtures,
    )
  }, 300_000)

  it('validates public coefficient payloads and preserves known semantic results when binary precision is unavailable', async () => {
    await pg.exec(`CREATE TABLE line_payloads(axis line,reference line,expected bytea,
      CONSTRAINT payload_wire CHECK(line_send(axis)=expected),
      CONSTRAINT payload_equal CHECK(line_eq(axis,reference)),
      CONSTRAINT payload_present CHECK(axis IS NOT NULL),
      CONSTRAINT payload_null CHECK(axis IS NULL))`)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'line_payloads')!
    const bundle = renderTypescriptSchemaCheckArtifacts([table])
    const target = join(directory, 'public')
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
    const payload = { a: 0x3ff0000000000000n, b: -4616189618054758400n, c: 0n, wireKnown: true }
    const value = { kind: 'Value', value: payload }
    const wire = Buffer.from('3ff0000000000000bff00000000000000000000000000000', 'hex')
    type Result = { certain: boolean; value?: boolean | null; error?: string }
    const evaluate = (
      axis: unknown,
      reference: unknown = value,
      expected: unknown = wire,
    ): Record<string, Result> =>
      Object.fromEntries(
        generated
          .evaluatePublicLinePayloadsChecks({ axis, reference, expected })
          .map((check: { constraint: string; result: Result }) => [check.constraint, check.result]),
      )
    const knownResults = {
      payload_wire: { certain: true, value: true },
      payload_equal: { certain: true, value: true },
      payload_present: { certain: true, value: true },
      payload_null: { certain: true, value: false },
    }
    expect(evaluate(value)).toEqual(knownResults)
    expect(evaluate({ kind: 'Value', value: { ...payload, wireKnown: false } })).toEqual({
      ...knownResults,
      payload_wire: { certain: false },
    })
    for (const axis of [
      undefined,
      '{1,-1,0}',
      { kind: 'Unknown' },
      { kind: 'Value', value: { ...payload, a: 0n, b: 0n } },
      { kind: 'Value', value: { ...payload, a: 0n, b: 0n, wireKnown: false } },
      { kind: 'Value', value: { ...payload, a: 9223372036854775808n } },
      { kind: 'Value', value: { ...payload, c: '0' } },
      { kind: 'Value', value: { ...payload, wireKnown: 'false' } },
    ])
      expect(Object.values(evaluate(axis))).toEqual(
        Array.from({ length: 4 }, () => ({ certain: false })),
      )
    for (const axis of [null, { kind: 'Null' }])
      expect(evaluate(axis)).toEqual({
        payload_wire: { certain: true, value: null },
        payload_equal: { certain: true, value: null },
        payload_present: { certain: true, value: false },
        payload_null: { certain: true, value: true },
      })
    expect(Object.values(evaluate(failure('22012')))).toEqual(
      Array.from({ length: 4 }, () => ({ certain: true, error: '22012' })),
    )
    const nan = {
      kind: 'Value',
      value: {
        a: 0x7ff0000000000001n,
        b: 0x3ff0000000000000n,
        c: -9223372036854775808n,
        wireKnown: true,
      },
    }
    expect(
      evaluate(nan, nan, Buffer.from('7ff00000000000013ff00000000000008000000000000000', 'hex')),
    ).toEqual(knownResults)
  }, 120_000)
})
