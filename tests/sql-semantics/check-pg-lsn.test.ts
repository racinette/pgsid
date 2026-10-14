import { pgLsnInputForms } from './check-pg-lsn-input-forms.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
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
const spelling = (bits: bigint | null): string | null => {
  if (bits === null) return null
  const word = BigInt.asUintN(64, bits)
  return `${(word >> 32n).toString(16)}/${(word & 0xffffffffn).toString(16)}`
}
const wire = (sql: string, type: string): string => {
  if (type === 'pg_catalog.bytea') return sql
  const send = (
    {
      'pg_catalog.pg_lsn': 'pg_lsn_send',
      'pg_catalog."numeric"': 'numeric_send',
      'pg_catalog.int4': 'int4send',
      'pg_catalog.int8': 'int8send',
      'pg_catalog.bool': 'boolsend',
    } as Record<string, string>
  )[type]
  if (!send) throw new Error(type)
  return `${send}(${sql})`
}

describe('portable WAL locations', () => {
  let pg: PGlite, directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-pg-lsn-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('matches every pure catalog operation, unsigned boundaries, exact numeric arithmetic and composition in every target', async () => {
    const source = await readFile(
      'crates/check-evaluator/src/operations/pg_catalog/pg_lsn_core.rs',
      'utf8',
    )
    const functions = builtinCallables().filter(
      (fn): fn is FunctionMetadata =>
        fn.kind === 'function' && source.includes(`pub fn ${fn.rustName}(`),
    )
    expect(functions).toHaveLength(18)
    const calls = new Map<string, { sql: string; type: string; args: string[] }>()
    for (const fn of functions) {
      let ordinal = 0
      const args = fn.args.map((type) =>
        type === 'pg_catalog.pg_lsn'
          ? ['a', 'b'][ordinal++]!
          : type === 'pg_catalog."numeric"'
            ? 'n'
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
      .filter((fn) => fn.kind === 'operator' && identities.has(fn.implementation))
      .entries()) {
      if (op.kind !== 'operator') continue
      const fn = functions.find((fn) => callableIdentity(fn) === op.implementation)!
      const base = calls.get(fn.rustName)!
      calls.set('operator_' + i, {
        ...base,
        sql: `${base.args[0]} OPERATOR(pg_catalog.${op.name}) ${base.args[1]}`,
      })
    }
    const expressions = Object.fromEntries(
      [...calls].map(([name, call]) => [name, `${wire(call.sql, call.type)}=expected`]),
    )
    Object.assign(expressions, {
      integer_constructor: 'pg_lsn_send(pg_lsn(1))=expected',
      small_constructor: 'pg_lsn_send(pg_lsn(1::smallint))=expected',
      wide_constructor: 'pg_lsn_send(pg_lsn(1::bigint))=expected',
      fractional_constructor: 'pg_lsn_send(pg_lsn(1.5))=expected',
      variable_constructor: 'pg_lsn_send(pg_lsn(seed))=expected',
      selected: 'pg_lsn_send(CASE WHEN skip THEN a ELSE b END)=expected',
      coalesced: 'pg_lsn_send(COALESCE(a,b))=expected',
      greatest: 'pg_lsn_send(GREATEST(a,b))=expected',
      least: 'pg_lsn_send(LEAST(a,b))=expected',
      nullif: 'pg_lsn_send(NULLIF(a,b))=expected',
      output: 'a::text=expected_text',
      literal: "pg_lsn_send('ffffffff/FFFFFFFF'::nested_location)='\\xffffffffffffffff'::bytea",
      typed_null: 'NULL::pg_lsn IS NULL',
      lazy: 'CASE WHEN skip THEN true ELSE pg_lsn_send(pg_lsn(n))=expected END',
    })
    await pg.exec(
      `CREATE DOMAIN wal_location AS pg_lsn; CREATE DOMAIN nested_location AS wal_location; CREATE TABLE wal_locations(a nested_location,b pg_lsn,n numeric,seed bigint,expected bytea,expected_text text,skip boolean,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK(${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((table) => table.name === 'wal_locations')!
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
    const values = [
      0n,
      1n,
      4294967295n,
      4294967296n,
      9223372036854775807n,
      -9223372036854775808n,
      -2n,
      -1n,
      null,
    ]
    const numbers = [
      '0',
      '1',
      '-1',
      '0.49',
      '0.5',
      '-0.49',
      '-0.5',
      '1.5',
      '-1.5',
      '18446744073709551615',
      '18446744073709551615.49',
      '18446744073709551615.5',
      '18446744073709551616',
      '-18446744073709551615',
      '1e100',
      'NaN',
      'Infinity',
      '-Infinity',
      null,
    ]
    const seeds = [0n, -1n, 9223372036854775807n, null]
    const base: Row = {
      a: known(1n),
      b: known(2n),
      n: known('0'),
      seed: known(0n),
      expected: known('00'),
      expected_text: known('0/1'),
      skip: known(true),
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + suffix, row, expected })
    }
    for (const [name, call] of calls) {
      for (const a of call.args.includes('a') ? values : [1n])
        for (const b of call.args.includes('b') ? values : [2n])
          for (const n of call.args.includes('n') ? numbers : ['0'])
            for (const seed of call.args.includes('seed') ? seeds : [0n]) {
              const row: Row = { ...base, a: known(a), b: known(b), n: known(n), seed: known(seed) }
              try {
                const answer = (
                  await pg.query<{ wire: string | null }>(
                    `SELECT encode(${wire(call.sql, call.type)},'hex') wire FROM (SELECT $1::pg_lsn a,$2::pg_lsn b,$3::numeric n,$4::bigint seed) inputs`,
                    [spelling(a), spelling(b), n, seed?.toString() ?? null],
                  )
                ).rows[0]!.wire
                row.expected = known(answer ?? '00')
                add(name, row, { kind: answer === null ? 'Null' : 'True' })
                if (answer !== null)
                  add(
                    name,
                    { ...row, expected: known(answer === '00' ? '01' : '00') },
                    { kind: 'False' },
                  )
              } catch (e) {
                add(name, row, error((e as { code: string }).code))
              }
            }
      for (const input of new Set(call.args)) {
        add(name, { ...base, [input]: { kind: 'Unknown' } }, { kind: 'Unknown' })
        add(name, { ...base, [input]: error('22012') }, error('22012'))
      }
    }
    for (const name of ['selected', 'coalesced', 'greatest', 'least']) {
      add(
        name,
        { ...base, expected: known(name === 'greatest' ? '0000000000000002' : '0000000000000001') },
        { kind: 'True' },
      )
      add(name, { ...base, expected: known('00') }, { kind: 'False' })
    }
    add('nullif', { ...base, b: known(1n) }, { kind: 'Null' })
    add('nullif', { ...base, expected: known('0000000000000001') }, { kind: 'True' })
    for (const a of values) {
      const output = (
        await pg.query<{ text: string | null }>('SELECT $1::pg_lsn::text text', [spelling(a)])
      ).rows[0]!.text
      add(
        'output',
        { ...base, a: known(a), expected_text: known(output ?? '') },
        { kind: a === null ? 'Null' : 'True' },
      )
    }
    for (const name of [
      'integer_constructor',
      'small_constructor',
      'wide_constructor',
      'fractional_constructor',
      'variable_constructor',
    ]) {
      add(
        name,
        {
          ...base,
          seed: known(1n),
          expected: known(
            name === 'fractional_constructor' ? '0000000000000002' : '0000000000000001',
          ),
        },
        { kind: 'True' },
      )
      add(name, { ...base, seed: known(1n), expected: known('00') }, { kind: 'False' })
    }
    add('variable_constructor', { ...base, seed: known(-1n) }, error('22023'))
    add('variable_constructor', { ...base, seed: known(null) }, { kind: 'Null' })
    for (const name of ['literal', 'typed_null']) add(name, base, { kind: 'True' })
    add('lazy', { ...base, n: error('22012') }, { kind: 'True' })
    add('lazy', { ...base, skip: known(false), n: known('-1') }, error('22023'))
    const target = join(directory, 'core')
    await mkdir(target)
    await runCheckParity(
      target,
      'pg_lsn_core',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  }, 600_000)
  it('retains PostgreSQL numeric cast rejection despite the numeric conversion function', async () => {
    await expect(pg.query('SELECT 1::numeric::pg_lsn')).rejects.toMatchObject({ code: '42846' })
  })
  it('decodes the portable hexadecimal grammar, rejects syntax and preserves input states', async () => {
    await pg.exec(
      'CREATE TABLE wal_location_inputs(source text,expected bytea,CONSTRAINT parsed CHECK(pg_lsn_send(source::pg_lsn)=expected))',
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'wal_location_inputs')!,
      c = table.constraints[0]!
    const group = prepareCheckRustGroup([
      {
        expression: lowerTableCheck(table, c)!.expression,
        identity: { schema: 'public', kind: 'table', owner: table.name, constraint: c.name },
      },
    ])
    expect(group.checks[0]!.kind).toBe('supported')
    const forms = pgLsnInputForms
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const text of forms) {
      try {
        const answer = (
          await pg.query<{ wire: string }>("SELECT encode(pg_lsn_send($1::pg_lsn),'hex') wire", [
            text,
          ])
        ).rows[0]!.wire
        fixtures.push({
          name: c.name,
          row: { source: known(text), expected: known(answer) },
          expected: { kind: 'True' },
        })
      } catch (e) {
        fixtures.push({
          name: c.name,
          row: { source: known(text), expected: known('00') },
          expected: error((e as { code: string }).code),
        })
      }
    }
    for (const [source, expected] of [
      [known(null), { kind: 'Null' }],
      [{ kind: 'Unknown' }, { kind: 'Unknown' }],
      [error('22012'), error('22012')],
    ] as [Input, Outcome][])
      fixtures.push({ name: c.name, row: { source, expected: known('00') }, expected })
    const target = join(directory, 'input')
    await mkdir(target)
    await runCheckParity(target, 'pg_lsn_input', group, [c.name], fixtures)
  }, 600_000)
})
