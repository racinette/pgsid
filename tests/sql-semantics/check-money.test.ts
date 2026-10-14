import { moneyInputForms, deferredMoneyContextForms } from './check-money-input-forms.js'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { lowerDomainCheck } from '../../src/sql-semantics/catalog-checks.js'
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
const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})
const amounts = [
  '-92233720368547758.08',
  '-92233720368547758.07',
  '-90071992547409.93',
  '-1000.01',
  '-1.25',
  '-0.05',
  '-0.01',
  '0',
  '0.01',
  '0.05',
  '0.15',
  '0.25',
  '0.50',
  '1',
  '1.25',
  '1000',
  '90071992547409.93',
  '92233720368547758.07',
  null,
]
const cases: Record<string, (string | null)[]> = {
  f4: [
    '-Infinity',
    '-3.5',
    '-2',
    '-1',
    '-0.5',
    '-0',
    '0',
    '0.1',
    '0.5',
    '1',
    '1.5',
    '2',
    '3.5',
    'Infinity',
    'NaN',
    null,
    '1e-40',
  ],
  f8: [
    '-Infinity',
    '-1e308',
    '-2',
    '-1',
    '-0.5',
    '-0',
    '0',
    '0.1',
    '0.5',
    '1',
    '1.5',
    '2',
    '1e308',
    'Infinity',
    'NaN',
    null,
    '1e-320',
  ],
  i2: ['-32768', '-3', '-1', '0', '1', '2', '3', '32767', null],
  i4: ['-2147483648', '-3', '-1', '0', '1', '2', '3', '2147483647', null],
  i8: [
    '-9223372036854775808',
    '-9007199254740993',
    '-3',
    '-1',
    '0',
    '1',
    '2',
    '3',
    '9007199254740993',
    '9223372036854775807',
    null,
  ],
}
const types: Record<string, string> = {
  a: 'money',
  b: 'money',
  f4: 'float4',
  f8: 'float8',
  i2: 'int2',
  i4: 'int4',
  i8: 'int8',
}
const serialize = (sql: string, type: string): string =>
  type === 'pg_catalog.bytea' || type === 'pg_catalog.text'
    ? sql
    : `${({ 'pg_catalog.money': 'cash_send', 'pg_catalog.bool': 'boolsend', 'pg_catalog.int4': 'int4send', 'pg_catalog.float8': 'float8send' } as Record<string, string>)[type]}(${sql})`
const sqlInput = (value: string | null, type: string) =>
  value === null ? `NULL::${type}` : `'${value}'::${type}`
describe('portable stored money', () => {
  let pg: PGlite, directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    await pg.exec("SET lc_monetary='C'")
    directory = await mkdtemp(join(tmpdir(), 'pgsid-money-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('matches pure catalog operations and aliases, every signed storage boundary, float rounding and errors, domains and partial composition in every target', async () => {
    const source = (
      await Promise.all(
        ['money_core.rs', 'money_words.rs'].map((name) =>
          readFile('crates/check-evaluator/src/operations/pg_catalog/' + name, 'utf8'),
        ),
      )
    ).join('\n')
    const functions = builtinCallables().filter(
      (fn): fn is FunctionMetadata =>
        fn.kind === 'function' && source.includes(`pub fn ${fn.rustName}(`),
    )
    expect(functions).toHaveLength(29)
    const calls = new Map<string, { sql: string; result: string; inputs: string[] }>()
    for (const fn of functions) {
      const inputs = fn.args.map((type, i) =>
        type === 'pg_catalog.money'
          ? i === 0
            ? 'a'
            : 'b'
          : (
              {
                'pg_catalog.float4': 'f4',
                'pg_catalog.float8': 'f8',
                'pg_catalog.int2': 'i2',
                'pg_catalog.int4': 'i4',
                'pg_catalog.int8': 'i8',
              } as Record<string, string>
            )[type]!,
      )
      calls.set(fn.rustName, {
        sql: `pg_catalog."${fn.name}"(${inputs.join(',')})`,
        result: fn.result,
        inputs,
      })
    }
    const identities = new Set(functions.map(callableIdentity))
    for (const [i, op] of builtinCallables()
      .filter((fn) => fn.kind === 'operator' && identities.has(fn.implementation))
      .entries()) {
      if (op.kind !== 'operator') continue
      const fn = functions.find((fn) => callableIdentity(fn) === op.implementation)!,
        base = calls.get(fn.rustName)!,
        [a, b] = base.inputs
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
      [...calls].map(([name, c]) => [
        name,
        `${serialize(c.sql, c.result)}=${c.result === 'pg_catalog.text' ? 'expected_text' : 'expected'}`,
      ]),
    )
    Object.assign(expressions, {
      selected: 'cash_send(CASE WHEN skip THEN a ELSE b END)=expected',
      coalesced: 'cash_send(COALESCE(a,b))=expected',
      lazy: 'CASE WHEN skip THEN true ELSE cash_send(a+b)=expected END',
      absent: 'a IS NULL',
      present: 'a IS NOT NULL',
      null_literal: 'cash_send(NULL::money) IS NULL',
      zero_literal: "cash_send('0'::money)=decode('0000000000000000','hex')",
      nested_zero: "cash_send('0'::nested_price)=decode('0000000000000000','hex')",
      nullif: 'cash_send(NULLIF(a,b))=expected',
      greatest: 'cash_send(GREATEST(a,b))=expected',
      least: 'cash_send(LEAST(a,b))=expected',
      distinct: '(a IS DISTINCT FROM b)=recorded_distinct',
    })
    expressions.zero_literal = "cash_send('0'::money)='\\x0000000000000000'::bytea"
    expressions.nested_zero = "cash_send('0'::nested_price)='\\x0000000000000000'::bytea"
    await pg.exec(
      `CREATE DOMAIN price AS money;CREATE DOMAIN nested_price AS price;CREATE TABLE prices(a nested_price,b money,f4 float4,f8 float8,i2 smallint,i4 integer,i8 bigint,expected bytea,expected_text text,recorded_distinct boolean,skip boolean,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK(${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'prices')!
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
    const values = new Map<string, Input>(),
      moneyWires = new Map<string | null, string | null>()
    const input = (key: string, value: string | null): Input =>
      values.get(key + ':' + String(value))!
    for (const [key, list] of Object.entries({ a: amounts, b: amounts, ...cases }))
      for (const value of list) {
        const type = types[key]!
        let decoded: Input
        if (value === null) decoded = known(null)
        else if (type === 'money' || type === 'float8' || type === 'float4') {
          const wire = (
            await pg.query<{ wire: string }>(
              `SELECT encode(${type === 'money' ? 'cash_send' : type + 'send'}($1::${type}),'hex') wire`,
              [value],
            )
          ).rows[0]!.wire
          const bytes = Buffer.from(wire, 'hex')
          decoded = known(type === 'float4' ? bytes.readInt32BE() : bytes.readBigInt64BE())
          if (key === 'a') moneyWires.set(value, wire)
        } else decoded = known(type === 'int8' ? BigInt(value) : Number(value))
        values.set(key + ':' + String(value), decoded)
      }
    moneyWires.set(null, null)
    const base: Row = {
      a: input('a', '1'),
      b: input('b', '1.25'),
      f4: input('f4', '1'),
      f8: input('f8', '1'),
      i2: input('i2', '2'),
      i4: input('i4', '2'),
      i8: input('i8', '2'),
      expected: known(moneyWires.get('1')!),
      expected_text: known('One dollar and zero cents'),
      recorded_distinct: known(true),
      skip: known(true),
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + suffix, row, expected })
    }
    for (const [name, c] of calls) {
      const moneyKey = c.inputs.includes('a') ? 'a' : 'b',
        factor = c.inputs.find((key) => key !== 'a' && key !== 'b'),
        second = c.inputs.includes('a') && c.inputs.includes('b') ? 'b' : factor
      const variations = second === 'b' ? amounts : second ? cases[second]! : ['1']
      for (const a of amounts)
        for (const b of variations) {
          const params: Record<string, string | null> = {
            a: '1',
            b: '1.25',
            f4: '1',
            f8: '1',
            i2: '2',
            i4: '2',
            i8: '2',
            [moneyKey]: a,
            ...(second ? { [second]: b } : {}),
          }
          const row = {
            ...base,
            [moneyKey]: input(moneyKey, a),
            ...(second ? { [second]: input(second, b) } : {}),
          }
          let expected: Outcome,
            value: string | null = null
          try {
            value = (
              await pg.query<{ value: string | null }>(
                `SELECT ${c.result === 'pg_catalog.text' ? c.sql : `encode(${serialize(c.sql, c.result)},'hex')`} value FROM (SELECT ${Object.entries(
                  params,
                )
                  .map(([key, v]) => sqlInput(v, types[key]!) + ' ' + key)
                  .join(',')}) input`,
              )
            ).rows[0]!.value
            expected = { kind: value === null ? 'Null' : 'True' }
          } catch (caught) {
            expected = failure((caught as { code: string }).code)
          }
          add(
            name,
            {
              ...row,
              [c.result === 'pg_catalog.text' ? 'expected_text' : 'expected']: known(value),
            },
            expected,
          )
        }
    }
    for (const a of amounts)
      for (const b of amounts) {
        const row = { ...base, a: input('a', a), b: input('b', b) }
        for (const name of ['nullif', 'greatest', 'least']) {
          const wire = (
            await pg.query<{ wire: string | null }>(
              `SELECT encode(${name === 'nullif' ? 'cash_send(NULLIF(a,b))' : name === 'greatest' ? 'cash_send(GREATEST(a,b))' : 'cash_send(LEAST(a,b))'},'hex') wire FROM (SELECT $1::money a,$2::money b) input`,
              [a, b],
            )
          ).rows[0]!.wire
          add(name, { ...row, expected: known(wire) }, { kind: wire === null ? 'Null' : 'True' })
        }
        const distinct = (
          await pg.query<{ value: boolean }>('SELECT $1::money IS DISTINCT FROM $2::money value', [
            a,
            b,
          ])
        ).rows[0]!.value
        add('distinct', { ...row, recorded_distinct: known(distinct) }, { kind: 'True' })
      }
    for (const a of amounts) {
      const row = { ...base, a: input('a', a), expected: known(moneyWires.get(a)!) }
      add('selected', row, { kind: a === null ? 'Null' : 'True' })
      add(
        'coalesced',
        { ...row, expected: known(moneyWires.get(a === null ? '1.25' : a)!) },
        { kind: 'True' },
      )
      add('absent', row, { kind: a === null ? 'True' : 'False' })
      add('present', row, { kind: a === null ? 'False' : 'True' })
      for (const name of ['null_literal', 'zero_literal', 'nested_zero'])
        add(name, row, { kind: 'True' })
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
    const wordFunction = functions.find((fn) => fn.name === 'cash_words')!
    for (const amount of [
      '100.01',
      '101.01',
      '110.10',
      '111.11',
      '119.19',
      '120.20',
      '121.21',
      '999.99',
      '1000000',
      '-101.01',
    ]) {
      const result = (
        await pg.query<{ wire: string; words: string }>(
          "SELECT encode(cash_send($1::money),'hex') wire,cash_words($1::money) words",
          [amount],
        )
      ).rows[0]!
      add(
        wordFunction.rustName,
        {
          ...base,
          a: known(Buffer.from(result.wire, 'hex').readBigInt64BE()),
          expected_text: known(result.words),
        },
        { kind: 'True' },
      )
    }
    await runCheckParity(
      directory,
      'moneycore',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  }, 600_000)
  it('captures stored money constants exactly while restoring rendering settings and keeping runtime text conversion contextual', async () => {
    await pg.exec(`CREATE DOMAIN positive_price AS money CONSTRAINT positive CHECK(VALUE > '0'::money);
      CREATE TABLE money_literals(a money,source text,expected bytea,
      CONSTRAINT same CHECK(cash_eq(a,'1.25'::money)),
      CONSTRAINT lower_edge CHECK(cash_ge(a,'-92233720368547758.08'::money)),
      CONSTRAINT upper_edge CHECK(cash_le(a,'92233720368547758.07'::money)),
      CONSTRAINT rendered_runtime CHECK(cash_send(('$1.25'::text)::money)=expected),
      CONSTRAINT source_runtime CHECK(cash_send(source::money)=expected))`)
    await pg.exec("SET lc_monetary='POSIX'")
    const before = (await pg.query<{ value: string }>('SHOW lc_monetary')).rows[0]!
    const catalog = await snapshotCatalog(pg)
    expect((await pg.query('SHOW lc_monetary')).rows[0]).toEqual(before)
    const table = catalog.tables.find((t) => t.name === 'money_literals')!,
      domain = catalog.domains.find((d) => d.name === 'positive_price')!
    const constraints = table.constraints.filter((c) => c.type === 'check')
    const captured = Object.fromEntries(
      constraints.flatMap((c) =>
        (c.moneyLiterals ?? []).map((literal) => [literal.text, literal.units]),
      ),
    )
    expect(Object.values(captured).sort()).toEqual(
      ['-9223372036854775808', '125', '9223372036854775807'].sort(),
    )
    expect(domain.checks[0]!.moneyLiterals).toEqual([{ text: '$0.00', units: '0' }])
    const group = prepareCheckRustGroup([
      ...constraints.map((c) => ({
        expression: lowerTableCheck(table, c, [], catalog.domains)!.expression,
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: c.name,
        },
      })),
      {
        expression: lowerDomainCheck(domain, domain.checks[0]!, [], catalog.domains)!.expression,
        identity: { schema: 'public', kind: 'domain', owner: domain.name, constraint: 'positive' },
      },
    ])
    for (const check of group.checks) expect(check.kind).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const value of [-9223372036854775808n, -1n, 0n, 125n, 9223372036854775807n]) {
      const row: Row = {
        a: known(value),
        source: known('0'),
        expected: known('0000000000000000'),
        value: known(value),
      }
      fixtures.push(
        { name: 'same', row, expected: { kind: value === 125n ? 'True' : 'False' } },
        { name: 'lower_edge', row, expected: { kind: 'True' } },
        { name: 'upper_edge', row, expected: { kind: 'True' } },
        { name: 'rendered_runtime', row, expected: { kind: 'Unknown' } },
        { name: 'source_runtime', row, expected: { kind: 'True' } },
        { name: 'positive', row, expected: { kind: value > 0n ? 'True' : 'False' } },
      )
    }
    for (const source of ['$1.25', '1.25', '(1.25)', '1,25', 'bad'])
      fixtures.push({
        name: 'source_runtime',
        row: { source: known(source), expected: known('000000000000007d') },
        expected: { kind: 'Unknown' },
      })
    const target = join(directory, 'literals')
    await mkdir(target)
    await runCheckParity(
      target,
      'moneyliterals',
      group,
      [...constraints.map((c) => c.name), 'positive'],
      fixtures,
    )
    await pg.exec('RESET lc_monetary')
  }, 180_000)

  it('validates SQL-coerced minor-unit carriers and retains known stored literal comparisons in the public API', async () => {
    await pg.exec(`CREATE TABLE money_payloads(amount money,reference money,expected bytea,
      CONSTRAINT wire CHECK(cash_send(amount)=expected),CONSTRAINT same CHECK(cash_eq(amount,reference)),
      CONSTRAINT present CHECK(amount IS NOT NULL),CONSTRAINT absent CHECK(amount IS NULL),
      CONSTRAINT price CHECK(amount >= '1.25'::money))`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'money_payloads')!
    const bundle = renderTypescriptSchemaCheckArtifacts([table], catalog.domains),
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
    type Result = { certain: boolean; value?: boolean | null; error?: string }
    const evaluate = (
      amount: unknown,
      reference: unknown = { kind: 'Value', value: 125n },
      expected: unknown = Buffer.from('000000000000007d', 'hex'),
    ): Record<string, Result> =>
      Object.fromEntries(
        generated
          .evaluatePublicMoneyPayloadsChecks({ amount, reference, expected })
          .map((c: { constraint: string; result: Result }) => [c.constraint, c.result]),
      )
    expect(evaluate({ kind: 'Value', value: 125n })).toEqual({
      wire: { certain: true, value: true },
      same: { certain: true, value: true },
      present: { certain: true, value: true },
      absent: { certain: true, value: false },
      price: { certain: true, value: true },
    })
    expect(evaluate({ kind: 'Value', value: 124n }).price).toEqual({ certain: true, value: false })
    for (const value of [-9223372036854775808n, 9223372036854775807n]) {
      const bytes = Buffer.alloc(8)
      bytes.writeBigInt64BE(value)
      expect(evaluate({ kind: 'Value', value }, { kind: 'Value', value }, bytes).wire).toEqual({
        certain: true,
        value: true,
      })
    }
    for (const amount of [
      undefined,
      '$1.25',
      1.25,
      125n,
      { kind: 'Value', value: 125 },
      { kind: 'Value', value: '125' },
      { kind: 'Value', value: 9223372036854775808n },
      { kind: 'Value', value: -9223372036854775809n },
    ])
      expect(Object.values(evaluate(amount))).toEqual(
        Array.from({ length: 5 }, () => ({ certain: false })),
      )
    for (const amount of [null, { kind: 'Null' }])
      expect(evaluate(amount)).toEqual({
        wire: { certain: true, value: null },
        same: { certain: true, value: null },
        present: { certain: true, value: false },
        absent: { certain: true, value: true },
        price: { certain: true, value: null },
      })
    expect(Object.values(evaluate(failure('22003')))).toEqual(
      Array.from({ length: 5 }, () => ({ certain: true, error: '22003' })),
    )
  }, 120_000)
  it('keeps context-free zero input definite and distinguishes locale-required parsing from stored constants', async () => {
    const expressions = {
      wire: 'cash_send(source::money)=expected',
      varying: 'cash_send(source::varchar::money)=expected',
      domain: 'cash_send(source::nested_price)=expected',
      typename: 'cash_send(money(source))=expected',
      present: '(source::money IS NOT NULL)=recorded_present',
      lazy: 'CASE WHEN skip THEN true ELSE cash_send(source::money)=expected END',
    }
    await pg.exec(
      `CREATE TABLE money_inputs(source text,expected bytea,recorded_present boolean,skip boolean,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK(${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'money_inputs')!
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
    for (const check of group.checks) expect(check.kind).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + suffix, row, expected })
    }
    const base: Row = {
      source: known('0'),
      expected: known('0000000000000000'),
      recorded_present: known(true),
      skip: known(false),
    }
    for (const source of moneyInputForms) {
      const wire = (
        await pg.query<{ wire: string | null }>("SELECT encode(cash_send($1::money),'hex') wire", [
          source,
        ])
      ).rows[0]!.wire
      expect(wire).toBe(source === null ? null : '0000000000000000')
      const row = {
        ...base,
        source: known(source),
        expected: known(wire),
        recorded_present: known(source !== null),
      }
      for (const name of ['wire', 'varying', 'domain', 'typename', 'lazy'])
        add(name, row, { kind: source === null ? 'Null' : 'True' })
      add('present', row, { kind: 'True' })
    }
    for (const source of [...deferredMoneyContextForms, '0'.repeat(4097)]) {
      const row = { ...base, source: known(source) }
      for (const name of ['wire', 'varying', 'domain', 'typename', 'present', 'lazy'])
        add(name, row, { kind: 'Unknown' })
      add('lazy', { ...row, skip: known(true) }, { kind: 'True' })
    }
    for (const source of [{ kind: 'Unknown' }, { kind: 'Null' }, failure('22012')] as Input[]) {
      for (const name of ['wire', 'varying', 'domain', 'typename', 'lazy'])
        add(name, { ...base, source }, source as Outcome)
      add('lazy', { ...base, source, skip: known(true) }, { kind: 'True' })
    }
    const target = join(directory, 'input')
    await mkdir(target)
    await runCheckParity(
      target,
      'moneyinput',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  }, 180_000)
})
