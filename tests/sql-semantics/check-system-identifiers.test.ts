import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { dirname } from 'node:path'
import { writeFile } from 'node:fs/promises'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import {
  identifier32InputForms,
  deferredIdentifier32PlatformForms,
  xid8InputForms,
  deferredXid8PlatformForms,
} from './check-system-identifiers-input-forms.js'
import { callableBoundary } from '../../scripts/check-measurements/catalog.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
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
const types: Record<string, string> = {
  x: 'xid',
  y: 'xid',
  c: 'cid',
  d: 'cid',
  f: 'xid8',
  g: 'xid8',
  seed: 'bigint',
  i4: 'int4',
}
const word32 = ['0', '1', '2', '2147483647', '2147483648', '4294967294', '4294967295', null]
const word64 = [
  '0',
  '1',
  '4294967295',
  '4294967296',
  '9223372036854775807',
  '9223372036854775808',
  '18446744073709551614',
  '18446744073709551615',
  null,
]
const values: Record<string, (string | null)[]> = {
  x: word32,
  y: word32,
  c: word32,
  d: word32,
  f: word64,
  g: word64,
  seed: ['-9223372036854775808', '-1', '0', '1', '9223372036854775807', null],
  i4: ['-2147483648', '-1', '0', '1', '2147483647', null],
}
const input = (key: string, value: string | null): Input =>
  value === null
    ? known(null)
    : known(
        key === 'i4'
          ? Number(value)
          : types[key] === 'xid8'
            ? BigInt.asIntN(64, BigInt(value))
            : BigInt(value),
      )
const wrap = (sql: string, type: string) =>
  type === 'pg_catalog.bytea'
    ? sql
    : `${({ 'pg_catalog.xid': 'xidsend', 'pg_catalog.cid': 'cidsend', 'pg_catalog.xid8': 'xid8send', 'pg_catalog.bool': 'boolsend', 'pg_catalog.int4': 'int4send', 'pg_catalog.int8': 'int8send' } as Record<string, string>)[type]}(${sql})`
const defaults: Record<string, string | null> = {
  x: '1',
  y: '2',
  c: '1',
  d: '2',
  f: '1',
  g: '2',
  seed: '1',
  i4: '-1',
}
const sqlRow =
  'SELECT ' +
  Object.entries(types)
    .map(([name, type], i) => `$${i + 1}::${type} ${name}`)
    .join(',') +
  ",true skip,'bad'::text source"
describe('portable transaction and command identifiers', () => {
  let pg: PGlite, directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-system-identifiers-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('matches all pure functions and operator aliases, unsigned64 boundaries, low-word casts, hashes and lazy composition in every target', async () => {
    const source = await readFile(
      'crates/check-evaluator/src/operations/pg_catalog/system_identifiers.rs',
      'utf8',
    )
    const functions = builtinCallables().filter(
      (x): x is FunctionMetadata =>
        x.kind === 'function' && source.includes(`pub fn ${x.rustName}(`),
    )
    expect(functions).toHaveLength(24)
    const calls = new Map<string, { sql: string; type: string; args: string[] }>()
    for (const fn of functions) {
      let ordinal = 0
      const args = fn.args.map((t) =>
        t === 'pg_catalog.xid'
          ? ['x', 'y'][ordinal++]!
          : t === 'pg_catalog.cid'
            ? ['c', 'd'][ordinal++]!
            : t === 'pg_catalog.xid8'
              ? ['f', 'g'][ordinal++]!
              : t === 'pg_catalog.int4'
                ? 'i4'
                : 'seed',
      )
      calls.set(fn.rustName, {
        sql: `pg_catalog.${fn.name}(${args.join(',')})`,
        type: fn.result,
        args,
      })
    }
    const identities = new Set(functions.map(callableIdentity))
    for (const [i, op] of builtinCallables()
      .filter((x) => x.kind === 'operator' && identities.has(x.implementation))
      .entries()) {
      if (op.kind !== 'operator') continue
      const fn = functions.find((x) => callableIdentity(x) === op.implementation)!,
        base = calls.get(fn.rustName)!
      calls.set('operator_' + i, {
        ...base,
        sql: `${base.args[0]} OPERATOR(pg_catalog.${op.name}) ${base.args[1]}`,
      })
    }
    const extras: Record<string, string> = {
      xid_case: 'xidsend(CASE WHEN skip THEN x ELSE y END)',
      cid_case: 'cidsend(CASE WHEN skip THEN c ELSE d END)',
      xid8_case: 'xid8send(CASE WHEN skip THEN f ELSE g END)',
      xid_coalesce: 'xidsend(COALESCE(x,y))',
      cid_coalesce: 'cidsend(COALESCE(c,d))',
      xid8_coalesce: 'xid8send(COALESCE(f,g))',
      xid_nullif: 'xidsend(NULLIF(x,y))',
      cid_nullif: 'cidsend(NULLIF(c,d))',
      xid8_nullif: 'xid8send(NULLIF(f,g))',
      xid8_greatest: 'xid8send(GREATEST(f,g))',
      xid8_least: 'xid8send(LEAST(f,g))',
      xid8_row: 'boolsend(ROW(f,g)<ROW(g,f))',
      xid_distinct: 'boolsend(x IS DISTINCT FROM y)',
      cid_distinct: 'boolsend(c IS DISTINCT FROM d)',
      xid8_distinct: 'boolsend(f IS DISTINCT FROM g)',
      xid_text: "convert_to(x::text,'UTF8')",
      cid_text: "convert_to(c::text,'UTF8')",
      xid8_text: "convert_to(f::text,'UTF8')",
      low_word: 'xidsend(f::xid)',
      lazy: 'xid8send(CASE WHEN skip THEN f ELSE source::xid8 END)',
    }
    const expressions = Object.fromEntries(
      [...calls].map(([name, c]) => [name, `${wrap(c.sql, c.type)}=expected`]),
    )
    for (const [name, sql] of Object.entries(extras))
      expressions[name] = name.endsWith('_text')
        ? `${name.startsWith('xid8') ? 'f' : name.startsWith('cid') ? 'c' : 'x'}::text=expected_text`
        : `${sql}=expected`
    expressions.xid_literal = "xidsend('4294967295'::nested_transaction)='\\xffffffff'::bytea"
    expressions.cid_literal = "cidsend('0xff'::cid)='\\x000000ff'::bytea"
    expressions.xid8_literal =
      "xid8send('18446744073709551615'::nested_full_transaction)='\\xffffffffffffffff'::bytea"
    expressions.typed_null = 'NULL::xid IS NULL AND NULL::cid IS NULL AND NULL::xid8 IS NULL'
    await pg.exec(
      `CREATE DOMAIN transaction_word AS xid;CREATE DOMAIN nested_transaction AS transaction_word;CREATE DOMAIN command_word AS cid;CREATE DOMAIN full_transaction AS xid8;CREATE DOMAIN nested_full_transaction AS full_transaction;CREATE TABLE identifiers(x nested_transaction,y xid,c command_word,d cid,f nested_full_transaction,g xid8,seed bigint,i4 int4,source text,skip boolean,expected bytea,expected_text text,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK(${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((x) => x.name === 'identifiers')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const c = table.constraints.find((x) => x.name === name)!
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
    const base: Row = {
      ...Object.fromEntries(Object.entries(defaults).map(([key, v]) => [key, input(key, v)])),
      source: known('bad'),
      skip: known(true),
      expected: known('00'),
      expected_text: known('1'),
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + suffix, row, expected })
    }
    const args = (row: Record<string, string | null>) => Object.keys(types).map((key) => row[key])
    for (const [name, c] of calls) {
      const [first, second] = c.args
      for (const a of values[first!]!)
        for (const b of second ? values[second]! : ['1']) {
          const fields = { ...defaults, [first!]: a, ...(second ? { [second]: b } : {}) }
          const row: Row = {
            ...base,
            [first!]: input(first!, a),
            ...(second ? { [second]: input(second, b) } : {}),
          }
          const answer = (
            await pg.query<{ wire: string | null }>(
              `SELECT encode(${wrap(c.sql, c.type)},'hex') wire FROM (${sqlRow}) inputs`,
              args(fields),
            )
          ).rows[0]!.wire
          add(
            name,
            { ...row, expected: known(answer ?? '00') },
            { kind: answer === null ? 'Null' : 'True' },
          )
          if (answer !== null)
            add(name, { ...row, expected: known(answer === '00' ? '01' : '00') }, { kind: 'False' })
        }
      for (const field of c.args) {
        add(name, { ...base, [field]: { kind: 'Unknown' } }, { kind: 'Unknown' })
        add(name, { ...base, [field]: error('22012') }, error('22012'))
      }
      if (c.args.length === 2)
        add(
          name,
          { ...base, [c.args[0]!]: error('22003'), [c.args[1]!]: error('22012') },
          error('22003'),
        )
    }
    for (const [name, sql] of Object.entries(extras)) {
      const key = name.startsWith('cid')
        ? 'c'
        : name.startsWith('xid8') || name === 'low_word' || name === 'lazy'
          ? 'f'
          : 'x'
      for (const value of values[key]!) {
        const fields = { ...defaults, [key]: value },
          row = { ...base, [key]: input(key, value) }
        if (name.endsWith('_text')) {
          const result = (
            await pg.query<{ text: string | null }>(
              `SELECT ${key}::text text FROM (${sqlRow}) inputs`,
              args(fields),
            )
          ).rows[0]!.text
          add(
            name,
            { ...row, expected_text: known(result ?? '') },
            { kind: result === null ? 'Null' : 'True' },
          )
        } else {
          const answer = (
            await pg.query<{ wire: string | null }>(
              `SELECT encode(${sql},'hex') wire FROM (${sqlRow}) inputs`,
              args(fields),
            )
          ).rows[0]!.wire
          add(
            name,
            { ...row, expected: known(answer ?? '00') },
            { kind: answer === null ? 'Null' : 'True' },
          )
        }
      }
    }
    for (const name of ['xid_literal', 'cid_literal', 'xid8_literal', 'typed_null'])
      add(name, base, { kind: 'True' })
    add('lazy', { ...base, f: known(-1n), skip: known(false) }, error('22P02'))
    const target = join(directory, 'core')
    await mkdir(target)
    await runCheckParity(
      target,
      'systemidentifiers',
      group,
      constraints.map((x) => x.name),
      fixtures,
    )
  }, 600_000)
  it('preserves portable xid/cid input and full unsigned64 text, overflow precedence and platform deferrals', async () => {
    const expressions = {
      xid_input: 'xidsend(source::xid)=expected',
      cid_input: 'cidsend(source::cid)=expected',
      xid8_input: 'xid8send(source::xid8)=expected',
    }
    await pg.exec(
      `CREATE TABLE identifier_inputs(source text,expected bytea,${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((x) => x.name === 'identifier_inputs')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const c = table.constraints.find((x) => x.name === name)!
      return [
        { ...c, name: name + '_raw', definition: `CHECK(${sql})` },
        { ...c, name: name + '_stored' },
      ]
    })
    const group = prepareCheckRustGroup(
      constraints.map((c) => ({
        expression: lowerTableCheck(table, c)!.expression,
        identity: { schema: 'public', kind: 'table', owner: table.name, constraint: c.name },
      })),
    )
    for (const c of group.checks) expect(c.kind).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const type of ['xid', 'cid', 'xid8']) {
      const forms = type === 'xid8' ? xid8InputForms : identifier32InputForms
      const add = (source: Input, expected: Input, outcome: Outcome) => {
        for (const suffix of ['raw', 'stored'])
          fixtures.push({
            name: type + '_input_' + suffix,
            row: { source, expected },
            expected: outcome,
          })
      }
      for (const text of forms) {
        try {
          const wire = (
            await pg.query<{ wire: string }>(`SELECT encode(${type}send($1::${type}),'hex') wire`, [
              text,
            ])
          ).rows[0]!.wire
          add(known(text), known(wire), { kind: 'True' })
        } catch (e) {
          add(known(text), known('00'), error((e as { code: string }).code))
        }
      }
      for (const text of [
        ...(type === 'xid8' ? deferredXid8PlatformForms : deferredIdentifier32PlatformForms),
        '9'.repeat(4097),
      ])
        add(known(text), known('00'), { kind: 'Unknown' })
      add(known(null), known('00'), { kind: 'Null' })
      add({ kind: 'Unknown' }, known('00'), { kind: 'Unknown' })
      add(error('22012'), known('00'), error('22012'))
    }
    const target = join(directory, 'input')
    await mkdir(target)
    await runCheckParity(
      target,
      'identifierinputs',
      group,
      constraints.map((x) => x.name),
      fixtures,
    )
  }, 600_000)
  it('keeps transaction-state queries deferred while stored identifier operations remain definite', async () => {
    await pg.exec('CREATE TABLE live_transactions(id integer)')
    const observe = async () =>
      (
        await pg.query<{ current: string; age: number; wire: string }>(
          "SELECT pg_current_xact_id()::text AS current, age('100'::xid) AS age, encode(xidsend('100'::xid),'hex') AS wire",
        )
      ).rows[0]!
    const before = await observe()
    await pg.exec('INSERT INTO live_transactions VALUES (1)')
    const after = await observe()
    expect(BigInt(after.current)).toBeGreaterThan(BigInt(before.current))
    expect(after.age).toBeGreaterThan(before.age)
    expect([before.wire, after.wire]).toEqual(['00000064', '00000064'])
    const names = new Set([
      'age',
      'mxid_age',
      'pg_current_xact_id',
      'pg_current_xact_id_if_assigned',
    ])
    const stateCalls = builtinCallables().filter(
      (x) =>
        x.kind === 'function' &&
        names.has(x.name) &&
        (x.args.includes('pg_catalog.xid') || x.result === 'pg_catalog.xid8'),
    )
    expect(stateCalls).toHaveLength(4)
    for (const fn of stateCalls)
      expect(
        callableBoundary(fn, new Set(['pg_catalog.xid', 'pg_catalog.xid8'])).categories,
      ).toContain('session-or-database-state')
    await pg.exec(
      'CREATE TABLE contextual_identifiers(transaction xid,full_transaction xid8,expected bytea,CONSTRAINT word CHECK(xidsend(transaction)=expected),CONSTRAINT age CHECK(age(transaction)>=0),CONSTRAINT current CHECK(pg_current_xact_id()=full_transaction))',
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((x) => x.name === 'contextual_identifiers')!
    const group = prepareCheckRustGroup(
      table.constraints.map((c) => ({
        expression: lowerTableCheck(table, c)!.expression,
        identity: { schema: 'public', kind: 'table', owner: table.name, constraint: c.name },
      })),
    )
    for (const [i, c] of table.constraints.entries())
      expect(group.checks[i]!.kind, c.name).toBe(c.name === 'word' ? 'supported' : 'unsupported')
    const constraint = table.constraints.find((x) => x.name === 'word')!
    const pure = prepareCheckRustGroup([
      {
        expression: lowerTableCheck(table, constraint)!.expression,
        identity: { schema: 'public', kind: 'table', owner: table.name, constraint: 'word' },
      },
    ])
    const row: Row = { transaction: known(100n), expected: known('00000064') }
    const target = join(directory, 'context')
    await mkdir(target)
    await runCheckParity(
      target,
      'identifiercontext',
      pure,
      ['word'],
      [{ name: 'word', row, expected: { kind: 'True' } }],
    )
    const bundle = renderTypescriptSchemaCheckArtifacts([table], catalog.domains)
    const api = join(directory, 'context-public')
    await mkdir(api)
    await writeFile(join(api, 'package.json'), '{"type":"module"}\n')
    await writeFile(join(api, 'checks.ts'), bundle.checks)
    for (const artifact of checkTypescriptArtifacts(bundle.rustFiles!)) {
      const path = join(api, 'checks-rust', artifact.path)
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
      join(api, 'js'),
      join(api, 'checks.ts'),
    ]).catch((error: { stdout: string; stderr: string }) => {
      throw new Error(error.stdout + error.stderr, { cause: error })
    })
    const generated = await import(pathToFileURL(join(api, 'js/checks.js')).href)
    const results = Object.fromEntries(
      generated
        .evaluatePublicContextualIdentifiersChecks({
          transaction: { kind: 'Value', value: 100n },
          full_transaction: { kind: 'Value', value: 100n },
          expected: Buffer.from('00000064', 'hex'),
        })
        .map((row: { constraint: string; result: unknown }) => [row.constraint, row.result]),
    )
    expect(results).toEqual({
      word: { certain: true, value: true },
      age: { certain: false },
      current: { certain: false },
    })
  }, 120_000)
  it('keeps numeric literals distinct from string input according to PostgreSQL type admission', async () => {
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((x) => x.name === 'identifiers')!,
      constraint = table.constraints.find((x) => x.name === 'xid_literal')!
    for (const type of ['xid', 'cid', 'xid8'])
      for (const expression of [`1::${type}`, `${type}(1)`]) {
        await expect(pg.query('SELECT ' + expression)).rejects.toMatchObject({
          code: expression.includes('::') ? '42846' : '42883',
        })
        const expressionPlan = lowerTableCheck(table, {
          ...constraint,
          definition: `CHECK(${type}send(${expression})='\\x00'::bytea)`,
        })!.expression
        expect(expressionPlan.kind, expression).toBe('uncertain')
      }
  })
})
