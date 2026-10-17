import { nameInputForms, nameContextInputForms } from './check-name-input-forms.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { callableIdentity, type FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import {
  prepareCheckRustGroup,
  assembleCheckRust,
} from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
const known = (value: string | number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (state: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(state, 36) },
})
describe('SQL-coerced name values', () => {
  let pg: PGlite, directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-name-'))
  })
  afterAll(async () => {
    await pg?.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  const prepare = async (name: string, columns: string, expressions: Record<string, string>) => {
    await pg.exec(
      `CREATE TABLE ${name}(${columns},${Object.entries(expressions)
        .map(([key, sql]) => `CONSTRAINT "${key}" CHECK(${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === name)!
    const checks = Object.entries(expressions).flatMap(([key, sql]) => {
      const constraint = table.constraints.find((c) => c.name === key)!
      return [
        { ...constraint, name: key + '_raw', definition: `CHECK(${sql})` },
        { ...constraint, name: key + '_stored' },
      ].map((c) => ({
        expression: portableCheckAtoms(lowerTableCheck(table, c, [], catalog.domains)!.expression),
        identity: { schema: 'public', kind: 'table' as const, owner: name, constraint: c.name },
      }))
    })
    const group = prepareCheckRustGroup(checks, {
      nativeByteOrder: 'little',
      serverEncoding: 'UTF8',
    })
    for (const [i, c] of group.checks.entries())
      expect(c.kind, checks[i]!.identity.constraint + ('reason' in c ? ':' + c.reason : '')).toBe(
        'supported',
      )
    return { group, names: checks.map((c) => c.identity.constraint) }
  }
  it('matches catalog value operations, aliases, C ordering, hashes, conversions, domains and composition in Rust and both targets', async () => {
    const source = await readFile(
      'crates/check-evaluator/src/operations/pg_catalog/name_core.rs',
      'utf8',
    )
    const functions = builtinCallables().filter(
      (f): f is FunctionMetadata =>
        f.kind === 'function' && source.includes(`pub fn ${f.rustName}(`),
    )
    expect(functions).toHaveLength(27)
    const calls = new Map<string, { sql: string; type: string }>()
    for (const fn of functions) {
      let n = 0
      const args = fn.args.map((t) =>
        t === 'pg_catalog.name'
          ? ['a', 'b'][n++]!
          : t === 'pg_catalog.int8'
            ? 'seed'
            : t === 'pg_catalog.bpchar'
              ? 'padded'
              : t === 'pg_catalog."varchar"'
                ? 'varchar_value'
                : fn.name === 'name'
                  ? 'source'
                  : 'text_value',
      )
      calls.set(fn.rustName, { sql: `pg_catalog."${fn.name}"(${args.join(',')})`, type: fn.result })
    }
    const identities = new Set(functions.map(callableIdentity))
    for (const [index, op] of builtinCallables()
      .filter((f) => f.kind === 'operator' && identities.has(f.implementation))
      .entries())
      if (op.kind === 'operator')
        calls.set('operator_' + index, {
          sql: `${op.left === 'pg_catalog.name' ? 'a' : 'text_value'} OPERATOR(pg_catalog.${op.name}) ${op.right === 'pg_catalog.name' ? 'b' : 'text_value'}`,
          type: op.result,
        })
    const expressions = Object.fromEntries(
      [...calls].map(([name, call]) => [
        name,
        call.type === 'pg_catalog.bool'
          ? `(${call.sql}) IS NOT DISTINCT FROM expected_bool`
          : call.type === 'pg_catalog.int4'
            ? `(${call.sql})=expected_integer`
            : call.type === 'pg_catalog.int8'
              ? `(${call.sql})=expected_bigint`
              : call.type === 'pg_catalog.bytea'
                ? `(${call.sql})=expected_bytes`
                : `(${call.sql})::text COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C"`,
      ]),
    )
    const composition: Record<string, string> = {
      selected: '(CASE WHEN choose THEN a ELSE b END)::text',
      coalesced: 'COALESCE(a,b)::text',
      least: 'LEAST(a,b)::text',
      greatest: 'GREATEST(a,b)::text',
      nullif: 'NULLIF(a,b)::text',
    }
    for (const [name, sql] of Object.entries(composition)) {
      calls.set(name, { sql, type: 'pg_catalog.text' })
      expressions[name] = `(${sql}) COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C"`
    }
    expressions['empty_literal'] = "''::name::text=''::text"
    expressions['typed_null'] = 'NULL::name IS NULL'
    await pg.exec(
      'CREATE DOMAIN name_domain AS name COLLATE "C";CREATE DOMAIN nested_name_domain AS name_domain',
    )
    const prepared = await prepare(
      'name_values',
      'a nested_name_domain,b name COLLATE "C",text_value text COLLATE "C",source text,padded bpchar,varchar_value varchar,seed bigint,choose boolean,expected_bool boolean,expected_integer integer,expected_bigint bigint,expected_bytes bytea,expected_text text COLLATE "C"',
      expressions,
    )
    const base: Row = {
      a: known(''),
      b: known('z'),
      text_value: known('z'),
      source: known(''),
      padded: known('   '),
      varchar_value: known(''),
      seed: known(0n),
      choose: known(true),
      expected_bool: known(true),
      expected_integer: known(0),
      expected_bigint: known(0n),
      expected_bytes: known(''),
      expected_text: known(''),
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const [a, b] of [
      ['', 'z'],
      ['a', 'aa'],
      ['aa', 'a'],
      ['A ', 'A'],
      ['é', '€'],
      ['😀', 'é'],
      ['x'.repeat(63), 'x'.repeat(62) + 'y'],
      [null, null],
      [null, 'a'],
      ['a', null],
    ] as const) {
      for (const [name, call] of calls) {
        const expression =
          call.type === 'pg_catalog.bytea'
            ? `encode(${call.sql},'hex')`
            : [
                  'pg_catalog.name',
                  'pg_catalog.text',
                  'pg_catalog.bpchar',
                  'pg_catalog."varchar"',
                ].includes(call.type)
              ? `(${call.sql})::text`
              : `(${call.sql})::text`
        const result = (
          await pg.query<{ answer: string | null }>(
            `SELECT ${expression} answer FROM (SELECT $1::name a,$2::name b,$2::text text_value,''::text source,'   '::bpchar padded,''::varchar varchar_value,0::bigint seed,true choose) args`,
            [a, b],
          )
        ).rows[0]!.answer
        const key =
          call.type === 'pg_catalog.bool'
            ? 'expected_bool'
            : call.type === 'pg_catalog.int4'
              ? 'expected_integer'
              : call.type === 'pg_catalog.int8'
                ? 'expected_bigint'
                : call.type === 'pg_catalog.bytea'
                  ? 'expected_bytes'
                  : 'expected_text'
        const expectedValue =
          result === null
            ? null
            : call.type === 'pg_catalog.bool'
              ? result === 'true'
              : call.type === 'pg_catalog.int4'
                ? Number(result)
                : call.type === 'pg_catalog.int8'
                  ? BigInt(result)
                  : result
        fixtures.push({
          name,
          row: {
            ...base,
            a: known(a),
            b: known(b),
            text_value: known(b),
            [key]: known(expectedValue),
          },
          expected:
            call.type === 'pg_catalog.bytea' && a !== null && /[^\x00-\x7f]/u.test(a)
              ? { kind: 'Unknown' }
              : result === null &&
                  ['pg_catalog.int4', 'pg_catalog.int8', 'pg_catalog.bytea'].includes(call.type)
                ? { kind: 'Null' }
                : { kind: 'True' },
        })
      }
    }
    for (const name of ['empty_literal', 'typed_null'])
      fixtures.push({ name, row: base, expected: { kind: 'True' } })
    for (const state of [{ kind: 'Unknown' } as const, error('22012')])
      for (const name of [
        'sql__pg_catalog__nameeq__50k8',
        'sql__pg_catalog__hashname__vua3',
        'sql__pg_catalog__text__coz1',
        'sql__pg_catalog__namesend__y7mk',
      ])
        fixtures.push({ name, row: { ...base, a: state }, expected: state })
    const target = join(directory, 'core')
    await mkdir(target)
    await runCheckParity(
      target,
      'name_core',
      prepared.group,
      prepared.names,
      fixtures.flatMap((f) =>
        ['raw', 'stored'].map((suffix) => ({ ...f, name: f.name + '_' + suffix })),
      ),
    )
  }, 300_000)
  it('requires an explicit byte limit for truncation and preserves UTF8 boundaries, NULL and partial input states', async () => {
    const limit = Number(
      (await pg.query<{ value: string }>("SELECT current_setting('max_identifier_length') value"))
        .rows[0]!.value,
    )
    expect(Number.isInteger(limit) && limit >= 0).toBe(true)
    const evaluatorSource =
      'pub fn evaluate_check(input: TextValue, limit: Int4Value, expected: TextValue) -> CheckOutcome { let converted = name_from_text_with_limit(input, limit); let matched = sql__pg_catalog__texteq__aet8(converted, expected); check_from_bool(matched) }'
    const group = {
      source: assembleCheckRust({
        source: evaluatorSource,
        callables: ['sql__pg_catalog__texteq__aet8'],
      }),
      evaluatorSource,
      requiresRegex: false,
      checks: [
        {
          kind: 'supported' as const,
          entryName: 'evaluate_check',
          inputs: [
            { name: 'input', type: 'pg_catalog.text', rustName: 'input', rustType: 'TextValue' },
            { name: 'limit', type: 'pg_catalog.int4', rustName: 'limit', rustType: 'Int4Value' },
            {
              name: 'expected',
              type: 'pg_catalog.text',
              rustName: 'expected',
              rustType: 'TextValue',
            },
          ],
        },
      ],
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const input of [
      '',
      'a',
      'a'.repeat(limit),
      'a'.repeat(limit + 1),
      'é'.repeat(limit),
      '😀'.repeat(limit),
      'a'.repeat(Math.max(0, limit - 1)) + 'é',
    ]) {
      const expected = (await pg.query<{ value: string }>('SELECT $1::name::text value', [input]))
        .rows[0]!.value
      fixtures.push({
        name: 'context',
        row: { input: known(input), limit: known(limit), expected: known(expected) },
        expected: { kind: 'True' },
      })
    }
    fixtures.push(
      {
        name: 'context',
        row: { input: known('éx'), limit: known(1), expected: known('') },
        expected: { kind: 'True' },
      },
      {
        name: 'context',
        row: { input: known('éx'), limit: known(2), expected: known('é') },
        expected: { kind: 'True' },
      },
      {
        name: 'context',
        row: { input: known('a'), limit: { kind: 'Unknown' }, expected: known('a') },
        expected: { kind: 'Unknown' },
      },
      {
        name: 'context',
        row: { input: known(''), limit: { kind: 'Unknown' }, expected: known('') },
        expected: { kind: 'True' },
      },
      {
        name: 'context',
        row: { input: known(null), limit: { kind: 'Unknown' }, expected: known('') },
        expected: { kind: 'Null' },
      },
      {
        name: 'context',
        row: { input: error('22012'), limit: { kind: 'Unknown' }, expected: known('') },
        expected: error('22012'),
      },
    )
    const target = join(directory, 'context')
    await mkdir(target)
    await runCheckParity(target, 'name_context', group, ['context'], fixtures)
  }, 300_000)
  it('defers nonempty SQL input casts without a deployment byte limit while keeping empty, NULL, error and skipped branches definite', async () => {
    const expressions = {
      cast: 'source::name::text COLLATE "C" = expected COLLATE "C"',
      function: 'name(source)::text COLLATE "C" = expected COLLATE "C"',
      padded: 'padded::name::text COLLATE "C" = expected COLLATE "C"',
      varying: 'varchar_value::name::text COLLATE "C" = expected COLLATE "C"',
      lazy: 'CASE WHEN choose THEN true ELSE source::name::text COLLATE "C" = expected COLLATE "C" END',
    }
    const prepared = await prepare(
      'name_input_context',
      'source text,padded bpchar,varchar_value varchar,expected text,choose boolean',
      expressions,
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const value of [...nameInputForms, ...nameContextInputForms, null]) {
      const result = (
        await pg.query<{ value: string | null }>('SELECT $1::name::text value', [value])
      ).rows[0]!.value
      const row: Row = {
        source: known(value),
        padded: known(value),
        varchar_value: known(value),
        expected: known(result),
        choose: known(false),
      }
      const expected: Outcome =
        value === null ? { kind: 'Null' } : value === '' ? { kind: 'True' } : { kind: 'Unknown' }
      for (const name of Object.keys(expressions)) {
        const paddedEmpty = name === 'padded' && value !== null && /^ *$/u.test(value)
        fixtures.push({
          name,
          row,
          expected: paddedEmpty ? { kind: result === '' ? 'True' : 'False' } : expected,
        })
      }
      fixtures.push({
        name: 'lazy',
        row: { ...row, choose: known(true) },
        expected: { kind: 'True' },
      })
    }
    fixtures.push({
      name: 'padded',
      row: {
        source: known(''),
        padded: known('   '),
        varchar_value: known(''),
        expected: known(''),
        choose: known(false),
      },
      expected: { kind: 'True' },
    })
    for (const state of [{ kind: 'Unknown' } as const, error('22012')])
      fixtures.push({
        name: 'cast',
        row: {
          source: state,
          padded: known(''),
          varchar_value: known(''),
          expected: known(''),
          choose: known(false),
        },
        expected: state,
      })
    const target = join(directory, 'sql-context')
    await mkdir(target)
    await runCheckParity(
      target,
      'name_sql_context',
      prepared.group,
      prepared.names,
      fixtures.flatMap((f) =>
        ['raw', 'stored'].map((suffix) => ({ ...f, name: f.name + '_' + suffix })),
      ),
    )
  }, 300_000)
})
