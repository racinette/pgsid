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
const packet = 'artifacts/goal-checks/tsvector-containers-active'
const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (state: string): Outcome => ({ kind: 'Error', value: { state: parseInt(state, 36) } })

it('composes tsvector array cells, generic operations, record fields and JSON without exposing scalar comparator magnitude in any target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsvector-containers-'))
  try {
    await pg.exec(
      'CREATE DOMAIN imported_vector AS tsvector;CREATE TYPE vector_bundle AS(head tsvector,items tsvector[])',
    )
    const a = 'ARRAY[source::tsvector,NULL::tsvector,other::tsvector]',
      b = 'ARRAY[other::tsvector,NULL::tsvector,source::tsvector]',
      record = `ROW(source::tsvector,${a})::vector_bundle`
    const expressions: Record<string, string> = {
      same: `${a}=${b}`,
      less: `${a}<${b}`,
      greater: `${a}>${b}`,
      raw_order: `btarraycmp(${a},${b})=-1`,
      contains: `${a}@>ARRAY[other::tsvector]`,
      overlap: `${a}&&ARRAY[other::tsvector]`,
      contained: `ARRAY[other::tsvector]<@${a}`,
      position: `array_position(${a},NULL::tsvector)=2`,
      positions: `array_positions(${a},source::tsvector)=ARRAY[1]`,
      removed: `cardinality(array_remove(${a},source::tsvector))<=2`,
      replaced: `array_replace(${a},source::tsvector,other::tsvector)=ARRAY[other::tsvector,NULL::tsvector,other::tsvector]`,
      appended: `(array_append(${a},source::tsvector))[4] IS NOT DISTINCT FROM source::tsvector`,
      prepended: `(array_prepend(source::tsvector,${a}))[1] IS NOT DISTINCT FROM source::tsvector`,
      concatenated: `cardinality(${a}||${b})=6`,
      trimmed: `cardinality(trim_array(${a},1))=2`,
      reversed: `array_reverse(${a})=${b}`,
      sorted: `array_sort(${a})=array_sort(${b})`,
      sort_flags: `array_sort(${a},false,true)=array_sort(${b},false,true)`,
      dimensions: `array_dims(ARRAY[${a},${b}])='[1:2][1:3]'`,
      subscript: `(${a})[1] IS NOT DISTINCT FROM source::tsvector`,
      slice: `(${a})[1:1]=ARRAY[source::tsvector]`,
      bucket: `width_bucket(source::tsvector,ARRAY['a'::tsvector,'z'::tsvector])>=0`,
      output: `array_to_string(${a},'|','missing') IS NOT NULL`,
      record_projection: `(${record}).head IS NOT DISTINCT FROM source::tsvector`,
      record_array: `(${record}).items=${a}`,
      record_order: `${record}<(ROW(other::tsvector,${b})::vector_bundle)`,
      record_text: `(${record})::text IS NOT NULL`,
      json_scalar: 'to_jsonb(source::tsvector)=to_jsonb((source::tsvector)::text)',
      json_array: `to_jsonb(${a})=jsonb_build_array((source::tsvector)::text,NULL,(other::tsvector)::text)`,
      json_record: `to_jsonb(${record})=jsonb_build_object('head',(source::tsvector)::text,'items',to_jsonb(${a}))`,
      raw_json: `array_to_json(${a})::jsonb=to_jsonb(${a})`,
      array_roundtrip: `to_jsonb((${a})::text::tsvector[])=to_jsonb(${a})`,
      record_roundtrip: `to_jsonb((${record})::text::vector_bundle)=to_jsonb(${record})`,
      array_literal: `to_jsonb('{"a:1A",NULL}'::tsvector[])=jsonb_build_array('''a'':1A',NULL)`,
      record_literal: `to_jsonb(('(a,"{z}")'::vector_bundle).head)=to_jsonb('''a'''::text)`,
      domain_cells:
        'ARRAY[source::imported_vector,other::imported_vector]::tsvector[]=ARRAY[source::tsvector,other::tsvector]',
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
      'a:1A',
      'z:2C a:1',
      'é:2C 😀:1',
      "'it''s':2B",
      'a:0',
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
      'tsvectorcontainers',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
    console.log(
      `tsvector containers: ${inserts} native INSERTs, ${fixtures.length} parity fixtures`,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
