import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { oidAliasInputForms } from './check-oid-aliases-input-forms.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { oidAliasTypes } from '../../src/sql-semantics/expressions.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (state: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(state, 36) },
})
describe('catalog OID aliases', () => {
  let pg: PGlite, directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-oid-aliases-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('preserves every SQL alias identity through shared unsigned operations, casts and composition in all targets', async () => {
    expect(oidAliasTypes).toHaveLength(11)
    const source = await readFile(
      'crates/check-evaluator/src/operations/pg_catalog/oid_aliases.rs',
      'utf8',
    )
    const functions = builtinCallables().filter(
      (fn) => fn.kind === 'function' && source.includes(`pub fn ${fn.rustName}(`),
    )
    expect(functions).toHaveLength(21)
    type Case = { name: string; type: string; sql: string; params: string[] }
    const entries: Case[] = []
    for (const type of oidAliasTypes) {
      const name = type.slice('pg_catalog.'.length),
        a = 'a_' + name,
        b = 'b_' + name
      const operations: Record<string, { sql: string; params: string[] }> = {
        send: { sql: `${name}send(${a})`, params: ['a'] },
        equal: { sql: `boolsend(${a}=${b})`, params: ['a', 'b'] },
        less: { sql: `boolsend(${a}<${b})`, params: ['a', 'b'] },
        order: { sql: `int4send(btoidcmp(${a},${b}))`, params: ['a', 'b'] },
        large: { sql: `oidsend(oidlarger(${a},${b}))`, params: ['a', 'b'] },
        hash: { sql: `int4send(hashoid(${a}))`, params: ['a'] },
        selected: { sql: `${name}send(CASE WHEN skip THEN ${a} ELSE ${b} END)`, params: ['a'] },
        coalesced: { sql: `${name}send(COALESCE(${a},${b}))`, params: ['a', 'b'] },
        greatest: { sql: `${name}send(GREATEST(${a},${b}))`, params: ['a', 'b'] },
        least: { sql: `${name}send(LEAST(${a},${b}))`, params: ['a', 'b'] },
        nullif: { sql: `${name}send(NULLIF(${a},${b}))`, params: ['a', 'b'] },
        to_oid: { sql: `oidsend(${a}::oid)`, params: ['a'] },
        to_int4: { sql: `int4send(${a}::int4)`, params: ['a'] },
        to_int8: { sql: `int8send(${a}::int8)`, params: ['a'] },
        from_int4: { sql: `${name}send(i4::${type})`, params: ['i4'] },
        from_int8: { sql: `${name}send(i8::${type})`, params: ['i8'] },
        cross_alias: { sql: `regclasssend(${a}::oid::regclass)`, params: ['a'] },
        constructor: { sql: `${name}send(${name}(i4))`, params: ['i4'] },
        integer_literal: { sql: `${name}send(${name}(1))`, params: [] },
        ...(name === 'regrole'
          ? {}
          : {
              string_literal: { sql: `${name}send('4294967295'::${type})`, params: [] },
            }),
      }
      for (const [operation, entry] of Object.entries(operations))
        entries.push({ name: name + '_' + operation, type, sql: entry.sql, params: entry.params })
    }
    await pg.exec(
      `CREATE TABLE alias_values(${oidAliasTypes
        .flatMap((type) => {
          const n = type.slice('pg_catalog.'.length)
          return [`a_${n} ${type}`, `b_${n} ${type}`]
        })
        .join(
          ',',
        )},i4 integer,i8 bigint,expected bytea,skip boolean,${entries.map((c) => `CONSTRAINT ${c.name} CHECK(${c.sql}=expected)`).join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'alias_values')!
    const constraints = entries.flatMap((entry) => {
      const c = table.constraints.find((c) => c.name === entry.name)!
      return [
        { ...c, name: entry.name + '_raw', definition: `CHECK(${entry.sql}=expected)` },
        { ...c, name: entry.name + '_stored' },
      ]
    })
    const group = prepareCheckRustGroup(
      constraints.map((c) => ({
        expression: portableCheckAtoms(lowerTableCheck(table, c)!.expression),
        identity: { schema: 'public', kind: 'table', owner: table.name, constraint: c.name },
      })),
    )
    for (const [i, c] of group.checks.entries())
      expect(c.kind, constraints[i]!.name).toBe('supported')
    const base: Row = {
      ...Object.fromEntries(
        oidAliasTypes.flatMap((type) => {
          const n = type.slice('pg_catalog.'.length)
          return [
            ['a_' + n, known(1n)],
            ['b_' + n, known(2n)],
          ]
        }),
      ),
      i4: known(-1),
      i8: known(1n),
      skip: known(true),
      expected: known('00'),
    }
    const pairs: [bigint | null, bigint | null][] = [
      [0n, 0n],
      [0n, 4294967295n],
      [4294967295n, 0n],
      [2147483647n, 2147483648n],
      [2147483648n, 2147483647n],
      [4294967295n, 4294967295n],
      [1n, 2n],
      [null, 1n],
      [1n, null],
      [null, null],
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    // A stored nonzero alias constant names an object of one database instance, so it is never
    // embedded, even when it deparses as a number.
    const add = (name: string, row: Row, outcome: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        fixtures.push({
          name: name + '_' + suffix,
          row,
          expected:
            suffix === 'stored' && name.endsWith('_string_literal') && outcome.kind !== 'Error'
              ? { kind: 'Unknown' }
              : outcome,
        })
    }
    for (const entry of entries) {
      const n = entry.type.slice('pg_catalog.'.length)
      for (const [a, b] of entry.params.some((p) => p === 'a' || p === 'b')
        ? pairs
        : ([[1n, 2n]] as [bigint, bigint][]))
        for (const i8 of entry.params.includes('i8')
          ? [-1n, 0n, 4294967295n, 4294967296n, 9223372036854775807n, null]
          : [1n]) {
          const row: Row = { ...base, ['a_' + n]: known(a), ['b_' + n]: known(b), i8: known(i8) }
          try {
            const answer = (
              await pg.query<{ wire: string | null }>(
                `SELECT encode(${entry.sql},'hex') wire FROM(SELECT $1::${entry.type} a_${n},$2::${entry.type} b_${n},$3::integer i4,$4::bigint i8,true skip) inputs`,
                [a?.toString() ?? null, b?.toString() ?? null, -1, i8?.toString() ?? null],
              )
            ).rows[0]!.wire
            row.expected = known(answer ?? '00')
            add(entry.name, row, { kind: answer === null ? 'Null' : 'True' })
            if (answer !== null)
              add(
                entry.name,
                { ...row, expected: known(answer === '00' ? '01' : '00') },
                { kind: 'False' },
              )
          } catch (e) {
            add(entry.name, row, error((e as { code: string }).code))
          }
        }
      for (const param of new Set(entry.params)) {
        const key = param === 'a' || param === 'b' ? param + '_' + n : param
        if (entry.name.endsWith('_coalesced') && param === 'b') {
          add(
            entry.name,
            { ...base, [key]: { kind: 'Unknown' }, expected: known('00000001') },
            { kind: 'True' },
          )
          add(
            entry.name,
            { ...base, [key]: error('22012'), expected: known('00000001') },
            { kind: 'True' },
          )
        } else {
          add(entry.name, { ...base, [key]: { kind: 'Unknown' } }, { kind: 'Unknown' })
          add(entry.name, { ...base, [key]: error('22012') }, error('22012'))
        }
      }
    }
    const target = join(directory, 'core')
    await mkdir(target)
    await runCheckParity(
      target,
      'oid_alias_core',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  }, 600_000)
  it('keeps numeric and sentinel text definite while deferring runtime names and nonzero catalog rendering', async () => {
    const definitions = oidAliasTypes.flatMap((type) => {
      const name = type.slice('pg_catalog.'.length),
        lookup = functionsFor(name)
      return [
        { name: name + '_input', sql: `oidsend(source::${type})=expected` },
        { name: name + '_output', sql: `value_${name}::text=recorded` },
        ...(lookup
          ? [{ name: name + '_lookup', sql: `oidsend(to_${name}(source))=expected` }]
          : []),
      ]
    })
    await pg.exec(
      `CREATE TABLE alias_inputs(source text,expected bytea,recorded text,${oidAliasTypes.map((type) => `value_${type.slice('pg_catalog.'.length)} ${type}`).join(',')},${definitions.map((c) => `CONSTRAINT ${c.name} CHECK(${c.sql})`).join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'alias_inputs')!
    const constraints = definitions.flatMap((d) => {
      const c = table.constraints.find((c) => c.name === d.name)!
      return [
        { ...c, name: d.name + '_raw', definition: `CHECK(${d.sql})` },
        { ...c, name: d.name + '_stored' },
      ]
    })
    const group = prepareCheckRustGroup(
      constraints.map((c) => ({
        expression: portableCheckAtoms(lowerTableCheck(table, c)!.expression),
        identity: { schema: 'public', kind: 'table', owner: table.name, constraint: c.name },
      })),
    )
    for (const [i, c] of group.checks.entries())
      expect(c.kind, constraints[i]!.name).toBe('supported')
    const base: Row = {
      source: known('0'),
      expected: known('00000000'),
      recorded: known('-'),
      ...Object.fromEntries(
        oidAliasTypes.map((type) => ['value_' + type.slice('pg_catalog.'.length), known(0n)]),
      ),
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + suffix, row, expected })
    }
    for (const forms of oidAliasInputForms) {
      const { type } = forms
      const name = type.slice('pg_catalog.'.length)
      for (const text of forms.handled) {
        for (const operation of functionsFor(name) ? ['input', 'lookup'] : ['input']) {
          const sql = operation === 'input' ? `$1::text::${type}` : `to_${name}($1::text)`
          if (name === 'regclass' && operation === 'input' && text.trim() !== '') {
            add(name + '_input', { ...base, source: known(text) }, { kind: 'Unknown' })
            continue
          }
          try {
            const answer = (
              await pg.query<{ wire: string | null }>(`SELECT encode(oidsend(${sql}),'hex') wire`, [
                text,
              ])
            ).rows[0]!.wire
            add(
              name + '_' + operation,
              { ...base, source: known(text), expected: known(answer ?? '00') },
              { kind: answer === null ? 'Null' : 'True' },
            )
          } catch (e) {
            add(
              name + '_' + operation,
              { ...base, source: known(text) },
              error((e as { code: string }).code),
            )
          }
        }
      }
      for (const text of [
        ...forms.contextRequired,
        ...forms.platformDependent,
        ...forms.unimplementedGrammar,
        '9'.repeat(4097),
      ]) {
        add(name + '_input', { ...base, source: known(text) }, { kind: 'Unknown' })
        if (functionsFor(name))
          add(name + '_lookup', { ...base, source: known(text) }, { kind: 'Unknown' })
      }
      for (const operation of functionsFor(name) ? ['input', 'lookup'] : ['input']) {
        add(name + '_' + operation, { ...base, source: known(null) }, { kind: 'Null' })
        add(name + '_' + operation, { ...base, source: error('22012') }, error('22012'))
      }
      add(
        name + '_output',
        { ...base, recorded: known(name === 'regoper' || name === 'regoperator' ? '0' : '-') },
        { kind: 'True' },
      )
      add(name + '_output', { ...base, recorded: known('wrong') }, { kind: 'False' })
      add(name + '_output', { ...base, ['value_' + name]: known(1n) }, { kind: 'Unknown' })
      add(name + '_output', { ...base, ['value_' + name]: known(null) }, { kind: 'Null' })
      add(name + '_output', { ...base, ['value_' + name]: error('22012') }, error('22012'))
    }
    const target = join(directory, 'input')
    await mkdir(target)
    await runCheckParity(
      target,
      'oid_alias_input',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  }, 600_000)
  it('defers named constants because independent databases assign different object OIDs', async () => {
    await pg.exec(
      "CREATE SCHEMA alias_shared;CREATE ROLE alias_shared;CREATE TABLE alias_shared(id integer);CREATE FUNCTION alias_shared(integer) RETURNS integer LANGUAGE sql IMMUTABLE AS 'SELECT $1';CREATE OPERATOR #^# (LEFTARG=integer,RIGHTARG=integer,FUNCTION=pg_catalog.int4eq)",
    )
    const names: Record<string, string> = {
      regclass: 'alias_shared',
      regcollation: '"C"',
      regconfig: 'simple',
      regdictionary: 'simple',
      regnamespace: 'alias_shared',
      regoper: '#^#',
      regoperator: '#^#(integer,integer)',
      regproc: 'alias_shared',
      regprocedure: 'alias_shared(integer)',
      regrole: 'alias_shared',
      regtype: 'alias_shared',
    }
    const quote = (text: string) => "'" + text.replaceAll("'", "''") + "'"
    const values = new Map<string, bigint>()
    for (const type of oidAliasTypes) {
      const n = type.slice('pg_catalog.'.length)
      values.set(
        type,
        BigInt(
          (await pg.query<{ oid: string }>(`SELECT (${quote(names[n]!)}::${type})::oid::text oid`))
            .rows[0]!.oid,
        ),
      )
    }
    expect(
      new Set(
        ['regclass', 'regproc', 'regnamespace', 'regrole', 'regtype'].map((n) =>
          values.get('pg_catalog.' + n),
        ),
      ).size,
    ).toBe(5)
    await expect(
      pg.exec(
        "CREATE TABLE forbidden_role_constant(value regrole CHECK(value='alias_shared'::regrole))",
      ),
    ).rejects.toThrow('constant of the type regrole cannot be used here')
    const storedTypes = oidAliasTypes.filter((type) => type !== 'pg_catalog.regrole')
    await pg.exec(
      `CREATE TABLE named_alias_constants(${oidAliasTypes.map((type) => 'value_' + type.slice('pg_catalog.'.length) + ' ' + type).join(',')},${storedTypes
        .map((type) => {
          const n = type.slice('pg_catalog.'.length)
          return `CONSTRAINT named_${n} CHECK(value_${n}=${quote(names[n]!)}::${type})`
        })
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'named_alias_constants')!
    const constraints = table.constraints,
      group = prepareCheckRustGroup(
        constraints.map((c) => ({
          expression: portableCheckAtoms(lowerTableCheck(table, c)!.expression),
          identity: { schema: 'public', kind: 'table', owner: table.name, constraint: c.name },
        })),
      )
    for (const c of group.checks) expect(c.kind).toBe('supported')
    const base: Row = Object.fromEntries(
      oidAliasTypes.map((type) => [
        'value_' + type.slice('pg_catalog.'.length),
        known(values.get(type)!),
      ]),
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const type of storedTypes) {
      const n = type.slice('pg_catalog.'.length),
        name = 'named_' + n,
        key = 'value_' + n
      fixtures.push(
        { name, row: base, expected: { kind: 'Unknown' } },
        { name, row: { ...base, [key]: known(0n) }, expected: { kind: 'Unknown' } },
        { name, row: { ...base, [key]: known(null) }, expected: { kind: 'Unknown' } },
        { name, row: { ...base, [key]: { kind: 'Unknown' } }, expected: { kind: 'Unknown' } },
        // Unresolved constant preparation can fail before the row operand is evaluated.
        { name, row: { ...base, [key]: error('22012') }, expected: { kind: 'Unknown' } },
      )
    }
    const independent = await PGlite.create()
    try {
      await independent.exec(
        'CREATE TABLE allocation_shift_1(id integer);CREATE TABLE allocation_shift_2(id integer);CREATE TABLE alias_shared(id integer)',
      )
      const other = BigInt(
        (await independent.query<{ oid: string }>("SELECT 'alias_shared'::regclass::oid::text oid"))
          .rows[0]!.oid,
      )
      expect(other).not.toBe(values.get('pg_catalog.regclass'))
    } finally {
      await independent.close()
    }
    const old = values.get('pg_catalog.regclass')!
    const before = (
      await pg.query<{ name: string }>('SELECT $1::oid::regclass::text name', [old.toString()])
    ).rows[0]!.name
    await pg.exec('ALTER TABLE alias_shared RENAME TO alias_renamed')
    const after = (
      await pg.query<{ name: string }>('SELECT $1::oid::regclass::text name', [old.toString()])
    ).rows[0]!.name
    expect(after).not.toBe(before)
    expect(
      (
        await pg.query<{ valid: boolean }>('SELECT $1::oid::regclass=$2::regclass valid', [
          old.toString(),
          after,
        ])
      ).rows[0]!.valid,
    ).toBe(true)
    const target = join(directory, 'constants')
    await mkdir(target)
    await runCheckParity(
      target,
      'oid_alias_constants',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  }, 600_000)
})
const functionsFor = (name: string): boolean =>
  builtinCallables().some(
    (fn) => fn.kind === 'function' && fn.schema === 'pg_catalog' && fn.name === 'to_' + name,
  )
