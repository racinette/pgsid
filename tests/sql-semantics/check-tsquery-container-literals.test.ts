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
const packet = 'artifacts/goal-checks/tsquery-container-storage-active'
const context = {
  serverEncoding: 'UTF8',
  clientEncoding: 'UTF8',
  defaultCollation: 'C',
  arrayNulls: true,
} as const
const grouped = 'a & (b & c)',
  flat = '(a & b) & c'
const full = quote(arrayText([grouped, null, flat])) + '::tsquery[]'
const record =
  quote(recordText(['7', grouped, arrayText([flat, null, grouped])])) + '::query_record'
const nested =
  quote(recordText(['tag', recordText(['7', grouped, arrayText([flat, null, grouped])])])) +
  '::query_envelope'

it('preserves full captured query trees through stored arrays, domains and nested records with native source/stored INSERT parity', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsquery-container-storage-'))
  const known = (value: string | boolean | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  try {
    await pg.exec(
      "CREATE DOMAIN query_leaf AS tsquery;CREATE DOMAIN query_list AS query_leaf[];CREATE DOMAIN checked_query_list AS query_leaf[] CHECK(cardinality(VALUE)>0 AND (VALUE)[1]<>'bad'::tsquery);CREATE TYPE query_record AS(marker int,head query_leaf,items query_list);CREATE TYPE query_envelope AS(tag text,payload query_record)",
    )
    const expressions: Record<string, string> = {
      first: `(${full})[1]=source::tsquery`,
      last: `(${full})[3]=source::tsquery`,
      whole: `${full}=ARRAY[source::tsquery,NULL::tsquery,other::tsquery]`,
      wire: `encode(tsquerysend((${full})[1]),'hex')=encode(tsquerysend(source::tsquery),'hex')`,
      lower: `(${quote('[0:2]=' + arrayText([grouped, null, flat]))}::tsquery[])[0]=source::tsquery`,
      multidimensional: `(${quote('{' + arrayText([grouped, null]) + ',' + arrayText([flat, 'z']) + '}')}::tsquery[])[2][1]=source::tsquery`,
      scalar_domain: `(${quote(arrayText([grouped, flat]))}::query_leaf[])[1]=source::tsquery`,
      array_domain: `(${quote(arrayText([grouped, flat]))}::query_list)[2]=source::tsquery`,
      checked_domain: `(${quote(arrayText([grouped, flat]))}::checked_query_list)[1]=source::tsquery`,
      nested_array: `((${quote(arrayText([arrayText([grouped, flat]), null]))}::query_list[])[1])[2]=source::tsquery`,
      record_head: `(${record}).head=source::tsquery`,
      record_item: `((${record}).items)[1]=source::tsquery`,
      record_last: `((${record}).items)[3]=source::tsquery`,
      record_wire: `encode(tsquerysend((${record}).head),'hex')=encode(tsquerysend(source::tsquery),'hex')`,
      nested_record: `((${nested}).payload).head=source::tsquery`,
      nested_record_item: `(((${nested}).payload).items)[1]=source::tsquery`,
      record_array: `(${quote(arrayText([recordText(['7', grouped, arrayText([flat, null, grouped])]), null]))}::query_record[])[1].head=source::tsquery`,
      output: `array_to_string(${full},'|','missing') IS NOT NULL`,
      json: `to_jsonb(${full})=jsonb_build_array(to_jsonb((${full})[1]),NULL,to_jsonb((${full})[3]))`,
      record_json: `to_jsonb(${record})=jsonb_build_object('marker',7,'head',to_jsonb((${record}).head),'items',to_jsonb((${record}).items))`,
      roundtrip: `((${full})::text::tsquery[])[1]=source::tsquery`,
      record_roundtrip: `((${record})::text::query_record).head=source::tsquery`,
      empty: `cardinality('{}'::tsquery[])=0`,
      null_cells: `array_position('{NULL,NULL}'::tsquery[],NULL::tsquery)=1`,
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
              origin === 'source'
                ? { ...c, definition: `CHECK(CASE WHEN bypass THEN true ELSE ${sql} END)` }
                : c,
              [],
              catalog.domains,
              origin,
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
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
      for (const other of [flat, grouped])
        for (const bypass of [false, true]) {
          await pg.exec('DELETE FROM query_input')
          await pg.query('INSERT INTO query_input VALUES($1,$2,$3)', [source, other, bypass])
          const row: Row = { source: known(source), other: known(other), bypass: known(bypass) }
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
            references.push({ name, source, other, bypass, value, state, failure })
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
      'tsquerycontainerstorage',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)

it('keeps document-size and query-tree capture plans independent inside mixed stored records', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsquery-mixed-storage-'))
  try {
    await pg.exec(
      'CREATE TYPE mixed_search_capture AS(document tsvector,query tsquery,options tsquery[])',
    )
    const literal =
      quote(recordText(['a:1A', grouped, arrayText([flat, null, grouped])])) +
      '::mixed_search_capture'
    const body = `CASE WHEN bypass THEN true ELSE (${literal}).document=source::tsvector AND (${literal}).query=other::tsquery END`
    await pg.exec(
      `CREATE TABLE mixed_search_storage(source text,other text,bypass bool,CHECK(${body}))`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'mixed_search_storage')!,
      c = table.constraints[0]!
    expect(c.tsvectorConstants?.containers).toHaveLength(2)
    expect(c.tsqueryConstants?.containers).toHaveLength(2)
    const checks = (['source', 'stored'] as const).map((origin) => ({
      identity: { schema: 'public', kind: 'table' as const, owner: table.name, constraint: origin },
      expression: portableCheckAtoms(
        lowerTableCheck(
          table,
          origin === 'source' ? { ...c, definition: `CHECK(${body})` } : c,
          [],
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
        )!.expression,
      ),
    }))
    const group = prepareCheckRustGroup(checks, context)
    group.checks.forEach((c) => expect(c.kind, 'reason' in c ? c.reason : '').toBe('supported'))
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let inserts = 0
    for (const [source, other] of [
      ['a:1A', grouped],
      ['a:1A', flat],
      ['z', grouped],
      [null, grouped],
      [null, null],
      ['a:', 'a &'],
    ] as const)
      for (const bypass of [false, true]) {
        let value: boolean | null = null,
          state: string | undefined
        try {
          value = (
            await pg.query<{ v: boolean | null }>(
              `SELECT ${body} v FROM(SELECT $1::text source,$2::text other,$3::bool bypass) input`,
              [source, other, bypass],
            )
          ).rows[0]!.v
        } catch (e) {
          state = (e as { code: string }).code
        }
        let failure: string | undefined
        try {
          await pg.query('INSERT INTO mixed_search_storage VALUES($1,$2,$3)', [
            source,
            other,
            bypass,
          ])
        } catch (e) {
          failure = (e as { code: string }).code
        }
        expect(failure).toBe(state ?? (value === false ? '23514' : undefined))
        inserts++
        const expected: Outcome = state
          ? { kind: 'Error', value: { state: parseInt(state, 36) } }
          : { kind: value === null ? 'Null' : value ? 'True' : 'False' }
        const row: Row = {
          source: source === null ? { kind: 'Null' } : { kind: 'Value', value: source },
          other: other === null ? { kind: 'Null' } : { kind: 'Value', value: other },
          bypass: { kind: 'Value', value: bypass },
        }
        for (const name of ['source', 'stored']) fixtures.push({ name, row, expected })
      }
    await runCheckParity(
      root,
      'mixedquerystorage',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
    await writeFile(
      join(packet, 'mixed-reference.json'),
      JSON.stringify({ nativeInserts: inserts, fixtures: fixtures.length }, null, 2) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
