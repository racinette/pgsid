import { oidInputForms, deferredOidPlatformForms } from './check-oid-input-forms.js'
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
const wrap = (sql: string, type: string): string =>
  type === 'pg_catalog.bytea'
    ? sql
    : `${({ 'pg_catalog.oid': 'oidsend', 'pg_catalog.int4': 'int4send', 'pg_catalog.int8': 'int8send', 'pg_catalog.bool': 'boolsend' } as Record<string, string>)[type]}(${sql})`
describe('portable OID values', () => {
  let pg: PGlite, directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-oid-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('matches every pure catalog function and operator, unsigned ordering, hashing, casts, composition and reached errors in Rust, Go and TypeScript', async () => {
    const source = await readFile(
      'crates/check-evaluator/src/operations/pg_catalog/oid_core.rs',
      'utf8',
    )
    const functions = builtinCallables().filter(
      (x): x is FunctionMetadata =>
        x.kind === 'function' && source.includes(`pub fn ${x.rustName}(`),
    )
    expect(functions).toHaveLength(14)
    const calls = new Map<string, { sql: string; type: string; args: string[] }>()
    for (const fn of functions) {
      let ordinal = 0
      const args = fn.args.map((type) =>
        type === 'pg_catalog.oid' ? ['a', 'b'][ordinal++]! : 'seed',
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
    const expressions = Object.fromEntries(
      [...calls].map(([name, c]) => [name, `${wrap(c.sql, c.type)}=expected`]),
    )
    const extras: Record<string, string> = {
      mixed_small: 'boolsend(a=i2)=expected',
      mixed_signed: 'boolsend(i4<a)=expected',
      mixed_wide: 'boolsend(a=seed)=expected',
      mixed_case: 'oidsend(CASE WHEN skip THEN a ELSE i2 END)=expected',
      mixed_coalesce: 'oidsend(COALESCE(a,i4))=expected',
      mixed_greatest: 'oidsend(GREATEST(a,i4))=expected',
      row_order: 'boolsend(ROW(a,b)<ROW(b,a))=expected',
      int4_cast: 'int4send(a::int4)=expected',
      int4_input: 'oidsend(i4::oid)=expected',
      int2_input: 'oidsend(i2::oid)=expected',
      selected: 'oidsend(CASE WHEN skip THEN a ELSE b END)=expected',
      coalesced: 'oidsend(COALESCE(a,b))=expected',
      nullif: 'oidsend(NULLIF(a,b))=expected',
      greatest: 'oidsend(GREATEST(a,b))=expected',
      least: 'oidsend(LEAST(a,b))=expected',
      distinct: '(a IS DISTINCT FROM b)=recorded',
      present: 'a IS NOT NULL',
      absent: 'a IS NULL',
      typed_null: 'NULL::oid IS NULL',
      literal: "oidsend('0xffffffff'::oid)='\\xffffffff'::bytea",
      nested_literal: "oidsend('4294967295'::nested_object_id)='\\xffffffff'::bytea",
      output: 'a::text=expected_text',
      lazy: 'CASE WHEN skip THEN true ELSE oidsend(seed::oid)=expected END',
    }
    Object.assign(expressions, extras)
    await pg.exec(
      `CREATE DOMAIN object_id AS oid; CREATE DOMAIN nested_object_id AS object_id; CREATE TABLE object_ids(a nested_object_id,b oid,seed bigint,i4 integer,i2 smallint,expected bytea,expected_text text,recorded boolean,skip boolean,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((x) => x.name === 'object_ids')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const c = table.constraints.find((x) => x.name === name)!
      return [
        { ...c, name: name + '_raw', definition: `CHECK (${sql})` },
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
    const values = [0n, 1n, 255n, 2147483647n, 2147483648n, 4294967294n, 4294967295n, null]
    const seeds = [
      -9223372036854775808n,
      -1n,
      0n,
      1n,
      2147483648n,
      4294967295n,
      4294967296n,
      9223372036854775807n,
      null,
    ]
    const base: Row = {
      a: known(1n),
      b: known(2n),
      seed: known(1n),
      i4: known(-1),
      i2: known(-1),
      expected: known('00000001'),
      expected_text: known('1'),
      recorded: known(true),
      skip: known(true),
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + suffix, row, expected })
    }
    for (const [name, c] of calls) {
      for (const a of values)
        for (const b of c.args.includes('b') ? values : [2n])
          for (const seed of c.args.includes('seed') ? seeds : [1n]) {
            const row: Row = { ...base, a: known(a), b: known(b), seed: known(seed) }
            try {
              const answer = (
                await pg.query<{ wire: string | null }>(
                  `SELECT encode(${wrap(c.sql, c.type)},'hex') wire FROM (SELECT $1::oid a,$2::oid b,$3::bigint seed) inputs`,
                  [a?.toString() ?? null, b?.toString() ?? null, seed?.toString() ?? null],
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
      for (const input of new Set(c.args)) {
        add(name, { ...base, [input]: { kind: 'Unknown' } }, { kind: 'Unknown' })
        add(name, { ...base, [input]: error('22012') }, error('22012'))
      }
    }
    for (const [name, sql] of Object.entries(extras)) {
      for (const a of values) {
        const row = { ...base, a: known(a) }
        if (
          name === 'present' ||
          name === 'absent' ||
          name === 'typed_null' ||
          name.includes('literal') ||
          name === 'lazy'
        ) {
          const expected = (
            await pg.query<{ ok: boolean | null }>(
              `SELECT ${sql} ok FROM (SELECT $1::oid a,$2::oid b,$3::bigint seed,decode('00000001','hex') expected,true skip) inputs`,
              [a?.toString() ?? null, '2', '1'],
            )
          ).rows[0]!.ok
          add(name, row, { kind: expected === null ? 'Null' : expected ? 'True' : 'False' })
          continue
        }
        const value = sql.slice(0, sql.lastIndexOf('='))
        const text = name === 'output'
        const answer = (
          await pg.query<{ value: string | null }>(
            `SELECT ${text ? value : name === 'distinct' ? value : `encode(${value},'hex')`} value FROM (SELECT $1::oid a,$2::oid b,$3::bigint seed,-1::int4 i4,-1::int2 i2,true skip) inputs`,
            [a?.toString() ?? null, '2', '1'],
          )
        ).rows[0]!.value
        add(
          name,
          {
            ...row,
            ...(text
              ? { expected_text: known(answer ?? '') }
              : name === 'distinct'
                ? { recorded: known(answer as unknown as boolean) }
                : { expected: known(answer ?? '00') }),
          },
          { kind: answer === null ? 'Null' : 'True' },
        )
      }
    }
    add('lazy', { ...base, seed: known(-1n), skip: known(true) }, { kind: 'True' })
    add('lazy', { ...base, seed: known(-1n), skip: known(false) }, error('22003'))
    add('literal', { ...base, a: { kind: 'Unknown' } }, { kind: 'True' })
    const target = join(directory, 'core')
    await mkdir(target)
    await runCheckParity(
      target,
      'oidcore',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  }, 600_000)
  it('decodes portable unsigned input while deferring platform-dependent forms and retaining cast errors', async () => {
    await pg.exec(
      'CREATE TABLE oid_inputs(source text, expected bytea, CONSTRAINT parsed CHECK(oidsend(source::oid)=expected))',
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((x) => x.name === 'oid_inputs')!,
      c = table.constraints[0]!
    const group = prepareCheckRustGroup([
      {
        expression: lowerTableCheck(table, c)!.expression,
        identity: { schema: 'public', kind: 'table', owner: table.name, constraint: c.name },
      },
    ])
    expect(group.checks[0]!.kind).toBe('supported')
    const portable = oidInputForms
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const text of portable) {
      try {
        const wire = (
          await pg.query<{ wire: string }>("SELECT encode(oidsend($1::oid),'hex') wire", [text])
        ).rows[0]!.wire
        fixtures.push({
          name: 'parsed',
          row: { source: known(text), expected: known(wire) },
          expected: { kind: 'True' },
        })
      } catch (e) {
        fixtures.push({
          name: 'parsed',
          row: { source: known(text), expected: known('00') },
          expected: error((e as { code: string }).code),
        })
      }
    }
    for (const text of [...deferredOidPlatformForms, '9'.repeat(4097)])
      fixtures.push({
        name: 'parsed',
        row: { source: known(text), expected: known('00') },
        expected: { kind: 'Unknown' },
      })
    fixtures.push(
      {
        name: 'parsed',
        row: { source: known(null), expected: known('00') },
        expected: { kind: 'Null' },
      },
      {
        name: 'parsed',
        row: { source: { kind: 'Unknown' }, expected: known('00') },
        expected: { kind: 'Unknown' },
      },
      {
        name: 'parsed',
        row: { source: error('22012'), expected: known('00') },
        expected: error('22012'),
      },
    )
    const target = join(directory, 'input')
    await mkdir(target)
    await runCheckParity(target, 'oidinput', group, [c.name], fixtures)
  }, 600_000)
})
