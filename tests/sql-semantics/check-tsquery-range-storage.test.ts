import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
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

const quote = (value: string) => "'" + value.replaceAll("'", "''") + "'"
const arrayText = (values: (string | null)[]) =>
  '{' +
  values
    .map((v) =>
      v === null ? 'NULL' : '"' + v.replaceAll('\\', '\\\\').replaceAll('"', '\\"') + '"',
    )
    .join(',') +
  '}'
const recordText = (values: (string | null)[]) =>
  '(' +
  values
    .map((v) => (v === null ? '' : '"' + v.replaceAll('\\', '\\\\').replaceAll('"', '""') + '"'))
    .join(',') +
  ')'
const packet = 'artifacts/goal-checks/tsquery-range-storage-active'
const context = {
  serverEncoding: 'UTF8',
  clientEncoding: 'UTF8',
  defaultCollation: 'C',
  arrayNulls: true,
} as const
const grouped = 'a & (b & c)',
  flat = '(a & b) & c'
const rangeText = (lower: string | null, upper: string | null) =>
  '[' +
  [lower, upper]
    .map((v) => (v === null ? '' : '"' + v.replaceAll('\\', '\\\\').replaceAll('"', '\\"') + '"'))
    .join(',') +
  ')'
const spanText = rangeText(grouped, null),
  membersText = '{' + spanText + '}',
  span = quote(spanText) + '::query_span',
  multi = quote(membersText) + '::query_ranges',
  arraySpan = quote(rangeText(arrayText([grouped, null, flat]), null)) + '::query_array_span',
  recordSpan =
    quote(rangeText(recordText(['7', grouped, arrayText([flat, null, grouped])]), null)) +
    '::query_record_span',
  nestedSpan = quote(rangeText(spanText, null)) + '::query_span_span',
  holder =
    quote(
      recordText([spanText, membersText, arrayText([spanText, null]), rangeText(spanText, null)]),
    ) + '::query_range_holder'

it('preserves original query trees in whole stored ranges, multiranges, recursive containers and constructor defaults', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsquery-range-storage-'))
  const known = (value: string | boolean | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  try {
    const schema = `
CREATE TYPE query_span AS RANGE(subtype=tsquery,multirange_type_name=query_ranges);
CREATE DOMAIN imported_query_span AS query_span CHECK(lower(VALUE)<>'bad'::tsquery);
CREATE TYPE query_array_span AS RANGE(subtype=tsquery[]);
CREATE TYPE query_record AS(marker int,head tsquery,items tsquery[]);
CREATE TYPE query_record_span AS RANGE(subtype=query_record);
CREATE TYPE query_span_span AS RANGE(subtype=query_span);
CREATE TYPE query_multi_span AS RANGE(subtype=query_ranges);
CREATE TYPE query_range_holder AS(span query_span,members query_ranges,history query_span[],nested query_span_span);
CREATE FUNCTION query_range_defaults(lo query_span DEFAULT '${spanText}',hi query_span DEFAULT NULL)
 RETURNS query_span_span LANGUAGE internal IMMUTABLE AS 'range_constructor2';
CREATE FUNCTION query_multi_defaults(lo query_ranges DEFAULT '${membersText}',hi query_ranges DEFAULT NULL)
 RETURNS query_multi_span LANGUAGE internal IMMUTABLE AS 'range_constructor2';`
    await pg.exec(schema)
    const expressions: Record<string, string> = {
      lower: `lower(${span})=source::tsquery`,
      multi_lower: `lower(${multi})=source::tsquery`,
      array_lower: `(lower(${arraySpan}))[1]=source::tsquery`,
      array_last: `(lower(${arraySpan}))[3]=source::tsquery`,
      record_lower: `(lower(${recordSpan})).head=source::tsquery`,
      record_last: `((lower(${recordSpan})).items)[3]=source::tsquery`,
      nested: `lower(lower(${nestedSpan}))=source::tsquery`,
      domain: `lower(${quote(spanText)}::imported_query_span)=source::tsquery`,
      range_array: `lower((${quote(arrayText([spanText, null]))}::query_span[])[1])=source::tsquery`,
      holder_span: `lower((${holder}).span)=source::tsquery`,
      holder_multi: `lower((${holder}).members)=source::tsquery`,
      holder_history: `lower(((${holder}).history)[1])=source::tsquery`,
      holder_nested: `lower(lower((${holder}).nested))=source::tsquery`,
      range_default: 'lower(lower(public.query_range_defaults()))=source::tsquery',
      multi_default: 'lower(lower(public.query_multi_defaults()))=source::tsquery',
      wire: `encode(tsquerysend(lower(${span})),'hex')=encode(tsquerysend(source::tsquery),'hex')`,
      multi_wire: `encode(tsquerysend(lower(${multi})),'hex')=encode(tsquerysend(source::tsquery),'hex')`,
      roundtrip: `lower((${span})::text::query_span)=source::tsquery`,
      multi_roundtrip: `lower((${multi})::text::query_ranges)=source::tsquery`,
      empty: `isempty('empty'::query_span) AND isempty('{}'::query_ranges)`,
      unbounded: `lower('(,)'::query_span) IS NULL AND upper('(,)'::query_span) IS NULL`,
    }
    for (const [name, sql] of Object.entries(expressions))
      await pg.exec(
        `CREATE TABLE stored_${name}(source text,other text,bypass bool,CONSTRAINT rule CHECK(CASE WHEN bypass THEN true ELSE ${sql} END))`,
      )
    await pg.exec('CREATE TEMP TABLE query_input(source text,other text,bypass bool)')
    const catalog = await snapshotCatalog(pg),
      checks = Object.entries(expressions).flatMap(([name, sql]) => {
        const table = catalog.tables.find((t) => t.name === 'stored_' + name)!,
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
              c,
              [],
              catalog.domains,
              origin,
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
              origin === 'source' ? `CHECK(CASE WHEN bypass THEN true ELSE ${sql} END)` : undefined,
            )!.expression,
          ),
        }))
      }),
      group = prepareCheckRustGroup(checks, context)
    group.checks.forEach((c, i) =>
      expect(c.kind, checks[i]!.identity.constraint + ('reason' in c ? ': ' + c.reason : '')).toBe(
        'supported',
      ),
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    let inserts = 0,
      rejections = 0
    for (const source of [null, '', grouped, flat, 'a', 'bad', 'é:*A <2> b', 'a &'])
      for (const bypass of [false, true]) {
        await pg.exec('DELETE FROM query_input')
        await pg.query('INSERT INTO query_input VALUES($1,$2,$3)', [source, null, bypass])
        const row: Row = { source: known(source), other: known(null), bypass: known(bypass) }
        for (const [name, sql] of Object.entries(expressions)) {
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
            await pg.exec(`INSERT INTO stored_${name} SELECT * FROM query_input`)
          } catch (e) {
            failure = (e as { code: string }).code
          }
          expect(failure).toBe(state ?? (value === false ? '23514' : undefined))
          inserts++
          if (failure) rejections++
          const expected: Outcome = state
            ? { kind: 'Error', value: { state: parseInt(state, 36) } }
            : { kind: value === null ? 'Null' : value ? 'True' : 'False' }
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: name + '_' + origin, row, expected })
          references.push({ name, source, bypass, value, state, failure })
        }
      }
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'literal-reference.json'),
      JSON.stringify(
        {
          nativeInserts: inserts,
          nativeRejections: rejections,
          fixtures: fixtures.length,
          references,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      root,
      'tsqueryrangestorage',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)

it('restores both finite bounds and every disjoint multirange member independently of catalog allocation', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsquery-range-storage-members-'))
  const schema = `CREATE TYPE query_span AS RANGE(subtype=tsquery,multirange_type_name=query_ranges);`
  const pairs = Array.from({ length: 5 }, (_, index) => {
    const term = 'x'.repeat(index * 4 + 1)
    return [term + ' & (b & c)', term + ' & (b & dd)'] as const
  })
  const text = '{' + pairs.map(([lo, hi]) => rangeText(lo, hi)).join(',') + '}',
    literal = quote(text) + '::query_ranges',
    constructed =
      'public.query_ranges(' +
      pairs
        .map(([lo, hi]) => `public.query_span(${quote(lo)}::tsquery,${quote(hi)}::tsquery)`)
        .join(',') +
      ')',
    body = `CASE WHEN bypass THEN true ELSE (${literal}=${constructed}) IS NOT DISTINCT FROM expected END`,
    tableSql = `CREATE TABLE stored_members(expected bool,bypass bool,CHECK(${body}))`
  try {
    await pg.exec(schema + tableSql)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'stored_members')!,
      constraint = table.constraints[0]!
    expect(constraint.tsqueryConstants?.complete).toBe(true)
    expect(constraint.tsqueryConstants?.containers?.[0]?.storage).toHaveLength(10)
    const other = await PGlite.create()
    try {
      await other.exec(
        "CREATE TYPE discarded AS ENUM('a');DROP TYPE discarded;" + schema + tableSql,
      )
      const separate = await snapshotCatalog(other),
        second = separate.tables.find((t) => t.name === table.name)!
      const ids = await Promise.all(
        [pg, other].map(
          async (database) =>
            (await database.query<{ id: number }>("SELECT 'query_span'::regtype::oid id")).rows[0]!
              .id,
        ),
      )
      expect(ids[1]).not.toBe(ids[0])
      expect(second.constraints[0]!.tsqueryConstants).toEqual(constraint.tsqueryConstants)
    } finally {
      await other.close()
    }
    const plans = (['source', 'stored'] as const).map((origin) => ({
      identity: { schema: 'public', kind: 'table' as const, owner: table.name, constraint: origin },
      expression: portableCheckAtoms(
        lowerTableCheck(
          table,
          constraint,
          [],
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
          origin === 'source' ? `CHECK(${body})` : undefined,
        )!.expression,
      ),
    }))
    const group = prepareCheckRustGroup(plans, context),
      fixtures: { name: string; row: Row; expected: Outcome }[] = []
    group.checks.forEach((c) => expect(c.kind, 'reason' in c ? c.reason : '').toBe('supported'))
    for (const expected of [true, false, null])
      for (const bypass of [false, true]) {
        const native = (
          await pg.query<{ value: boolean }>(
            `SELECT ${body} value FROM (SELECT $1::bool expected,$2::bool bypass) input`,
            [expected, bypass],
          )
        ).rows[0]!.value
        const insert = pg.query('INSERT INTO stored_members VALUES($1,$2)', [expected, bypass])
        if (native) await insert
        else await expect(insert).rejects.toMatchObject({ code: '23514' })
        for (const origin of ['source', 'stored'])
          fixtures.push({
            name: origin,
            row: {
              expected: expected === null ? { kind: 'Null' } : { kind: 'Value', value: expected },
              bypass: { kind: 'Value', value: bypass },
            },
            expected: { kind: native ? 'True' : 'False' },
          })
      }
    await runCheckParity(root, 'tsqueryrangestorage', group, ['source', 'stored'], fixtures)
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/members-validation.json',
      JSON.stringify(
        {
          nativeInserts: 6,
          fixtures: fixtures.length,
          disjointMembers: 5,
          capturedQueryBounds: 10,
          independentCatalogs: true,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
