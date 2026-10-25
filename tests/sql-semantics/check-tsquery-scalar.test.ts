import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { parseSql } from '../../src/ast.js'
import { planCheckInputs } from '../../src/codegen/shared/check-inputs.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
const packet = 'artifacts/goal-checks/tsquery-scalar-active'
const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })

it('binds tsquery scalar text I/O, domains, type-name calls and lazy composition with source and stored native INSERT parity', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsquery-scalar-'))
  try {
    await pg.exec(
      'CREATE DOMAIN imported_query AS tsquery; CREATE DOMAIN nested_query AS imported_query; CREATE DOMAIN short_query AS tsquery CHECK(numnode(VALUE)<=3); CREATE DOMAIN required_query AS tsquery NOT NULL',
    )
    const definitions: Record<string, string> = {
      rendered: 'source::tsquery::text=expected_text',
      varying: '(source::varchar)::tsquery::text=expected_text',
      padded: '(source::bpchar)::tsquery::text=expected_text',
      constructor: 'pg_catalog.tsquery(source)::text=expected_text',
      padded_constructor: 'pg_catalog.tsquery(source::bpchar)::text=expected_text',
      domain: '(source::nested_query)::text=expected_text',
      checked_domain: '(source::short_query)::text=expected_text',
      required_domain: 'numnode(source::required_query)<=3',
      selected:
        '(CASE WHEN choose_first THEN source::tsquery ELSE other::tsquery END)::text=expected_text',
      coalesced: 'COALESCE(source::tsquery,other::tsquery)::text=expected_text',
      count: 'numnode(source::tsquery)<=3',
      presence: 'source::tsquery IS NULL',
      null_literal: 'NULL::tsquery IS NULL',
    }
    const columns =
      'source text,other text,expected_text text,expected_boolean bool,choose_first bool,bypass bool'
    for (const [name, sql] of Object.entries(definitions))
      await pg.exec(
        `CREATE TABLE query_${name}(${columns},CONSTRAINT rule CHECK(CASE WHEN bypass THEN true ELSE ${sql} END))`,
      )
    await pg.exec(`CREATE TEMP TABLE query_input(${columns})`)
    const catalog = await snapshotCatalog(pg)
    const checks = Object.entries(definitions).flatMap(([name, sql]) => {
      const table = catalog.tables.find((t) => t.name === 'query_' + name)!,
        c = table.constraints[0]!
      return (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source'
              ? { ...c, definition: `CHECK(CASE WHEN bypass THEN true ELSE ${sql} END)` }
              : c,
            [],
            catalog.domains,
            origin,
          )!.expression,
        ),
      }))
    })
    const group = prepareCheckRustGroup(checks, {
      serverEncoding: 'UTF8',
      defaultCollation: 'C',
      clientEncoding: 'UTF8',
    })
    group.checks.forEach((c, i) =>
      expect(c.kind, checks[i]!.identity.constraint + ('reason' in c ? ': ' + c.reason : '')).toBe(
        'supported',
      ),
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    const samples = [
      null,
      '',
      'a',
      'a & b',
      'a & (b & c)',
      "'it''s':*AB",
      '😀 <2> é',
      "'",
      'a <16385> b',
      'a &',
      'a'.repeat(2047),
    ]
    let inserts = 0,
      rejected = 0
    for (let i = 0; i < samples.length; i++)
      for (const bypass of [false, true])
        for (const choose of [false, true]) {
          const source = samples[i]!,
            other = i % 3 === 0 ? null : i % 3 === 1 ? 'a' : 'zz',
            expectedText = i % 2 === 0 ? null : "'a'",
            expectedBoolean = i % 2 === 0
          await pg.query('DELETE FROM query_input')
          await pg.query('INSERT INTO query_input VALUES($1,$2,$3,$4,$5,$6)', [
            source,
            other,
            expectedText,
            expectedBoolean,
            choose,
            bypass,
          ])
          for (const [name, sql] of Object.entries(definitions)) {
            let value: boolean | null = null,
              state: string | undefined
            try {
              value = (
                await pg.query<{ value: boolean | null }>(
                  `SELECT CASE WHEN bypass THEN true ELSE ${sql} END value FROM query_input`,
                )
              ).rows[0]!.value
            } catch (e) {
              state = (e as { code: string }).code
            }
            let failure: string | undefined
            try {
              await pg.query(`INSERT INTO query_${name} SELECT * FROM query_input`)
            } catch (e) {
              failure = (e as { code: string }).code
            }
            expect(failure).toBe(state ?? (value === false ? '23514' : undefined))
            inserts++
            if (failure) rejected++
            const expected: Outcome = state
              ? error(state)
              : { kind: value === null ? 'Null' : value ? 'True' : 'False' }
            const row: Row = {
              source: known(source),
              other: known(other),
              expected_text: known(expectedText),
              expected_boolean: known(expectedBoolean),
              choose_first: known(choose),
              bypass: known(bypass),
            }
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: name + '_' + origin, row, expected })
            references.push({
              source: source?.length && source.length > 100 ? { length: source.length } : source,
              other,
              name,
              bypass,
              choose,
              value,
              state,
              expected,
            })
          }
        }
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'scalar-reference.json'),
      JSON.stringify({ inserts, rejected, fixtures: fixtures.length, references }, null, 2) + '\n',
    )
    await runCheckParity(
      root,
      'tsqueryscalar',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
    console.log(`tsquery scalar: ${inserts} native INSERTs, ${fixtures.length} parity fixtures`)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)

it('keeps raw tsquery and domain query parameters on database coercion', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(
      'CREATE DOMAIN imported_query AS tsquery;CREATE DOMAIN nested_query AS imported_query;CREATE TABLE raw_queries(item tsquery,domain_item nested_query,CONSTRAINT limit_terms CHECK(numnode(item)<=3))',
    )
    const catalog = await snapshotCatalog(pg)
    for (const [column, type] of [
      ['item', 'tsquery'],
      ['domain_item', 'public.nested_query'],
    ] as const) {
      const statement = (await parseSql(`INSERT INTO public.raw_queries(${column}) VALUES($1)`))
        .stmts![0]!.stmt!
      const writes = [
        {
          target: { schema: 'public', relation: 'raw_queries', column },
          source: 'insert' as const,
          partial: false,
          value: { kind: 'parameter' as const, number: 1, resolvedType: type },
        },
      ]
      expect(planCheckInputs(statement, writes, catalog, [type])).toEqual([])
    }
    await pg.query('INSERT INTO raw_queries(item,domain_item) VALUES($1,$2)', ['b | a', 'a:A'])
    await expect(
      pg.query('INSERT INTO raw_queries(item) VALUES($1)', ['a & b & c']),
    ).rejects.toMatchObject({ code: '23514' })
    await expect(
      pg.query('INSERT INTO raw_queries(item) VALUES($1)', ['a &']),
    ).rejects.toMatchObject({ code: '42601' })
  } finally {
    await pg.close()
  }
})

it('preserves captured tsquery trees and refuses ambiguous stored literals without their capture', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(
      "CREATE TABLE query_literal(expected_wire text,CONSTRAINT original_tree CHECK(encode(tsquerysend('a & (b & c)'::tsquery),'hex')=expected_wire))",
    )
    const native = (
      await pg.query<{
        left_text: string
        right_text: string
        left_wire: string
        right_wire: string
      }>(
        "SELECT 'a & b & c'::tsquery::text left_text,'a & (b & c)'::tsquery::text right_text,encode(tsquerysend('a & b & c'::tsquery),'hex') left_wire,encode(tsquerysend('a & (b & c)'::tsquery),'hex') right_wire",
      )
    ).rows[0]!
    expect(native.left_text).toBe(native.right_text)
    expect(native.left_wire).not.toBe(native.right_wire)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'query_literal')!,
      constraint = table.constraints[0]!
    const prepared = prepareCheckRustGroup(
      [
        {
          identity: {
            schema: 'public',
            kind: 'table',
            owner: table.name,
            constraint: constraint.name,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(table, constraint, [], catalog.domains, 'stored')!.expression,
          ),
        },
      ],
      { serverEncoding: 'UTF8', clientEncoding: 'UTF8', defaultCollation: 'C' },
    )
    expect(constraint.tsqueryConstants).toMatchObject({ complete: true })
    expect(prepared.checks[0]).toMatchObject({ kind: 'supported' })
    const missing = prepareCheckRustGroup(
      [
        {
          identity: {
            schema: 'public',
            kind: 'table',
            owner: table.name,
            constraint: constraint.name,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              { ...constraint, tsqueryConstants: undefined },
              [],
              catalog.domains,
              'stored',
            )!.expression,
          ),
        },
      ],
      { serverEncoding: 'UTF8', clientEncoding: 'UTF8', defaultCollation: 'C' },
    )
    expect(missing.checks[0]).toMatchObject({
      kind: 'unsupported',
      reason: expect.stringContaining('Stored tsquery constants require captured query trees'),
    })
    await pg.query('INSERT INTO query_literal VALUES($1)', [native.right_wire])
    await expect(
      pg.query('INSERT INTO query_literal VALUES($1)', [native.left_wire]),
    ).rejects.toMatchObject({ code: '23514' })
  } finally {
    await pg.close()
  }
})
