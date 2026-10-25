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
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
const packet = 'artifacts/goal-checks/tsquery-containers-active'
const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (state: string): Outcome => ({ kind: 'Error', value: { state: parseInt(state, 36) } })

it('composes tsquery array cells, generic operations, record fields and JSON without exposing scalar comparator magnitude in any target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsquery-containers-'))
  try {
    await pg.exec(
      'CREATE DOMAIN imported_query AS tsquery;CREATE TYPE query_bundle AS(head tsquery,items tsquery[])',
    )
    const a = 'ARRAY[source::tsquery,NULL::tsquery,other::tsquery]',
      b = 'ARRAY[other::tsquery,NULL::tsquery,source::tsquery]',
      record = `ROW(source::tsquery,${a})::query_bundle`
    const expressions: Record<string, string> = {
      same: `${a}=${b}`,
      less: `${a}<${b}`,
      greater: `${a}>${b}`,
      raw_order: `btarraycmp(${a},${b})=-1`,
      contains: `${a}@>ARRAY[other::tsquery]`,
      overlap: `${a}&&ARRAY[other::tsquery]`,
      contained: `ARRAY[other::tsquery]<@${a}`,
      position: `array_position(${a},NULL::tsquery)=2`,
      positions: `array_positions(${a},source::tsquery)=ARRAY[1]`,
      removed: `cardinality(array_remove(${a},source::tsquery))<=2`,
      replaced: `array_replace(${a},source::tsquery,other::tsquery)=ARRAY[other::tsquery,NULL::tsquery,other::tsquery]`,
      appended: `(array_append(${a},source::tsquery))[4] IS NOT DISTINCT FROM source::tsquery`,
      prepended: `(array_prepend(source::tsquery,${a}))[1] IS NOT DISTINCT FROM source::tsquery`,
      concatenated: `cardinality(${a}||${b})=6`,
      trimmed: `cardinality(trim_array(${a},1))=2`,
      reversed: `array_reverse(${a})=${b}`,
      sorted: `array_sort(${a})=array_sort(${b})`,
      sort_flags: `array_sort(${a},false,true)=array_sort(${b},false,true)`,
      dimensions: `array_dims(ARRAY[${a},${b}])='[1:2][1:3]'`,
      subscript: `(${a})[1] IS NOT DISTINCT FROM source::tsquery`,
      slice: `(${a})[1:1]=ARRAY[source::tsquery]`,
      bucket: `width_bucket(source::tsquery,ARRAY['a'::tsquery,'z'::tsquery])>=0`,
      output: `array_to_string(${a},'|','missing') IS NOT NULL`,
      record_projection: `(${record}).head IS NOT DISTINCT FROM source::tsquery`,
      record_array: `(${record}).items=${a}`,
      record_order: `${record}<(ROW(other::tsquery,${b})::query_bundle)`,
      record_text: `(${record})::text IS NOT NULL`,
      json_scalar: 'to_jsonb(source::tsquery)=to_jsonb((source::tsquery)::text)',
      json_array: `to_jsonb(${a})=jsonb_build_array((source::tsquery)::text,NULL,(other::tsquery)::text)`,
      json_record: `to_jsonb(${record})=jsonb_build_object('head',(source::tsquery)::text,'items',to_jsonb(${a}))`,
      raw_json: `array_to_json(${a})::jsonb=to_jsonb(${a})`,
      array_roundtrip: `to_jsonb((${a})::text::tsquery[])=to_jsonb(${a})`,
      record_roundtrip: `to_jsonb((${record})::text::query_bundle)=to_jsonb(${record})`,
      domain_cells:
        'ARRAY[source::imported_query,other::imported_query]::tsquery[]=ARRAY[source::tsquery,other::tsquery]',
      hash_unavailable: `hash_array(${a})=0`,
    }
    const columns = 'source text,other text,bypass bool'
    for (const [name, sql] of Object.entries(expressions))
      await pg.exec(
        `CREATE TABLE vector_${name}(${columns},CONSTRAINT rule CHECK(CASE WHEN bypass THEN true ELSE ${sql} END))`,
      )
    await pg.exec(`CREATE TEMP TABLE vector_input(${columns})`)
    const catalog = await snapshotCatalog(pg),
      checks = Object.entries(expressions).flatMap(([name, sql]) => {
        const table = catalog.tables.find((t) => t.name === 'vector_' + name)!,
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
      })
    const group = prepareCheckRustGroup(checks, {
      serverEncoding: 'UTF8',
      defaultCollation: 'C',
      arrayNulls: true,
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
      'z',
      'a:A',
      'z & a',
      'é | 😀',
      "'it''s':B",
      '!a',
      'a & (b & c)',
      '(a & b) & c',
      'a <2> b',
      "'",
      'a'.repeat(2047),
    ]
    let inserts = 0,
      rejections = 0
    for (let i = 0; i < samples.length; i++)
      for (const bypass of [false, true])
        for (const variant of [0, 1]) {
          const source = samples[i]!,
            other = variant === 0 ? 'z' : i % 2 === 0 ? null : source
          await pg.query('DELETE FROM vector_input')
          await pg.query('INSERT INTO vector_input VALUES($1,$2,$3)', [source, other, bypass])
          for (const [name, sql] of Object.entries(expressions)) {
            let value: boolean | null = null,
              state: string | undefined
            try {
              value = (
                await pg.query<{ value: boolean | null }>(
                  `SELECT CASE WHEN bypass THEN true ELSE ${sql} END value FROM vector_input`,
                )
              ).rows[0]!.value
            } catch (e) {
              state = (e as { code: string }).code
            }
            let failure: string | undefined
            try {
              await pg.query(`INSERT INTO vector_${name} SELECT * FROM vector_input`)
            } catch (e) {
              failure = (e as { code: string }).code
            }
            expect(failure).toBe(state ?? (value === false ? '23514' : undefined))
            inserts++
            if (failure) rejections++
            const expected: Outcome = state
                ? error(state)
                : { kind: value === null ? 'Null' : value ? 'True' : 'False' },
              row: Row = { source: known(source), other: known(other), bypass: known(bypass) }
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: name + '_' + origin, row, expected })
            references.push({
              name,
              source: source && source.length > 100 ? { length: source.length } : source,
              other: other && other.length > 100 ? { length: other.length } : other,
              bypass,
              value,
              state,
            })
          }
        }
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'composed-reference.json'),
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
      'tsquerycontainers',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
    console.log(`tsquery containers: ${inserts} native INSERTs, ${fixtures.length} parity fixtures`)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
