import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const profiles: { name: string; sql: string; partial: Outcome['kind']; error?: string }[] = [
  { name: 'element', sql: '(jsonb_build_array(n)->i) IS NULL', partial: 'False' },
  { name: 'element_text', sql: '(jsonb_build_array(n)->>i) IS NULL', partial: 'Unknown' },
  { name: 'negative', sql: '(jsonb_build_array(n)->(-1)) IS NULL', partial: 'False' },
  { name: 'past_end', sql: '(jsonb_build_array(n)->1) IS NULL', partial: 'True' },
  { name: 'before_start', sql: '(jsonb_build_array(n)->(-2)) IS NULL', partial: 'True' },
  { name: 'field', sql: "(jsonb_build_object('n',n)->k) IS NULL", partial: 'Unknown' },
  { name: 'field_text', sql: "(jsonb_build_object('n',n)->>k) IS NULL", partial: 'Unknown' },
  { name: 'array_field', sql: '(jsonb_build_array(n)->k) IS NULL', partial: 'True' },
  { name: 'object_index', sql: "(jsonb_build_object('n',n)->i) IS NULL", partial: 'True' },
  { name: 'exists', sql: "jsonb_build_object('n',n) ? k", partial: 'Unknown' },
  { name: 'array_exists', sql: 'jsonb_build_array(n) ? k', partial: 'Unknown' },
  { name: 'equal', sql: "jsonb_build_array(n) = '[1]'::jsonb", partial: 'Unknown' },
  { name: 'unequal', sql: "'[1]'::jsonb <> jsonb_build_array(n)", partial: 'Unknown' },
  { name: 'contains', sql: "jsonb_build_array(n) @> '[1]'::jsonb", partial: 'Unknown' },
  { name: 'contained', sql: "'[1]'::jsonb <@ jsonb_build_array(n)", partial: 'Unknown' },
  { name: 'ordered', sql: "jsonb_build_array(n) < '[1]'::jsonb", partial: 'Unknown' },
  { name: 'array_type', sql: "jsonb_typeof(jsonb_build_array(n)) = 'array'", partial: 'True' },
  {
    name: 'object_type',
    sql: "jsonb_typeof(jsonb_build_object('n',n)) = 'object'",
    partial: 'True',
  },
  { name: 'length', sql: 'jsonb_array_length(jsonb_build_array(n,2)) = 2', partial: 'True' },
  { name: 'wrong_length', sql: 'jsonb_array_length(jsonb_build_array(n,2)) = 1', partial: 'False' },
  {
    name: 'object_length',
    sql: "jsonb_array_length(jsonb_build_object('n',n)) = 1",
    partial: 'Error',
    error: '22023',
  },
  {
    name: 'dimensions',
    sql: 'jsonb_array_length(to_jsonb(ARRAY[ARRAY[n,2,3],ARRAY[4,5,6]])) = 2',
    partial: 'True',
  },
  {
    name: 'identity',
    sql: 'jsonb_array_length(to_jsonb(jsonb_build_array(n))) = 1',
    partial: 'True',
  },
  {
    name: 'owned_array',
    sql: 'jsonb_array_length((ARRAY[jsonb_build_array(n,2)])[1]) = 2',
    partial: 'True',
  },
  {
    name: 'coalesce',
    sql: 'jsonb_array_length(COALESCE(jsonb_build_array(n),NULL::jsonb)) = 1',
    partial: 'True',
  },
  { name: 'nested_type', sql: 'jsonb_typeof(jsonb_build_array(n)->0) IS NULL', partial: 'False' },
  {
    name: 'nested_shape',
    sql: 'jsonb_array_length(jsonb_build_array(n)->0) IS NULL',
    partial: 'Unknown',
  },
  {
    name: 'empty_path',
    sql: "jsonb_array_length(jsonb_build_array(n) #> '{}'::text[]) = 1",
    partial: 'True',
  },
  { name: 'single_path', sql: "(jsonb_build_array(n) #> '{0}'::text[]) IS NULL", partial: 'False' },
  { name: 'bad_path', sql: "(jsonb_build_array(n) #> '{bad}'::text[]) IS NULL", partial: 'True' },
  {
    name: 'deep_path',
    sql: "(jsonb_build_array(n) #> '{0,n}'::text[]) IS NULL",
    partial: 'Unknown',
  },
  { name: 'boolean_cast', sql: 'jsonb_build_array(n)::boolean', partial: 'Error', error: '22023' },
  {
    name: 'numeric_cast',
    sql: 'jsonb_build_array(n)::numeric = 1',
    partial: 'Error',
    error: '22023',
  },
  { name: 'delete_key', sql: "(jsonb_build_object('n',n)-k) IS NULL", partial: 'False' },
  { name: 'delete_array_key', sql: '(jsonb_build_array(n)-k) IS NULL', partial: 'False' },
  { name: 'delete_index', sql: '(jsonb_build_array(n,2)-i) IS NULL', partial: 'False' },
  {
    name: 'delete_object_index',
    sql: "(jsonb_build_object('n',n)-i) IS NULL",
    partial: 'Error',
    error: '22023',
  },
  { name: 'delete_length', sql: 'jsonb_array_length(jsonb_build_array(n,2)-0)=1', partial: 'True' },
  {
    name: 'delete_negative_length',
    sql: 'jsonb_array_length(jsonb_build_array(n,2)-(-1))=1',
    partial: 'True',
  },
  {
    name: 'delete_outside',
    sql: 'jsonb_array_length(jsonb_build_array(n,2)-2147483647)=2',
    partial: 'True',
  },
  {
    name: 'delete_before',
    sql: 'jsonb_array_length(jsonb_build_array(n,2)-(-2147483648))=2',
    partial: 'True',
  },
  { name: 'delete_empty', sql: "jsonb_build_array(n)-0='[]'::jsonb", partial: 'True' },
  { name: 'delete_bulk', sql: "(jsonb_build_object('n',n)-ARRAY[k]) IS NULL", partial: 'False' },
  {
    name: 'delete_bulk_rank',
    sql: '(jsonb_build_array(n)-ARRAY[ARRAY[k]]) IS NULL',
    partial: 'Error',
    error: '2202E',
  },
  {
    name: 'strip',
    sql: 'jsonb_strip_nulls(jsonb_build_array(n,NULL),i=0) IS NULL',
    partial: 'False',
  },
  {
    name: 'strip_length',
    sql: 'jsonb_array_length(jsonb_strip_nulls(jsonb_build_array(n,NULL),false))=2',
    partial: 'True',
  },
  {
    name: 'strip_unknown_length',
    sql: 'jsonb_array_length(jsonb_strip_nulls(jsonb_build_array(n,NULL),true))=2',
    partial: 'Unknown',
  },
  {
    name: 'strip_type',
    sql: "jsonb_typeof(jsonb_strip_nulls(jsonb_build_object('n',n,'missing',NULL)))='object'",
    partial: 'True',
  },
  {
    name: 'concat_arrays',
    sql: 'jsonb_array_length(jsonb_build_array(n)||jsonb_build_array(n))=2',
    partial: 'True',
  },
  {
    name: 'concat_scalar',
    sql: "jsonb_array_length(jsonb_build_array(n)||'null'::jsonb)=2",
    partial: 'True',
  },
  {
    name: 'concat_scalar_left',
    sql: "jsonb_array_length('null'::jsonb||jsonb_build_array(n))=2",
    partial: 'True',
  },
  {
    name: 'concat_object_array',
    sql: "jsonb_array_length(jsonb_build_object('n',n)||'[]'::jsonb)=1",
    partial: 'True',
  },
  {
    name: 'concat_objects',
    sql: "jsonb_typeof(jsonb_build_object('n',n)||jsonb_build_object('n',n))='object'",
    partial: 'True',
  },
  {
    name: 'concat_empty',
    sql: "jsonb_array_length('[]'::jsonb||jsonb_build_array(n))=1",
    partial: 'True',
  },
  {
    name: 'concat_unknown_kind',
    sql: '((jsonb_build_array(n)->0)||jsonb_build_object()) IS NULL',
    partial: 'False',
  },
  {
    name: 'populate_array',
    sql: '(jsonb_populate_record(NULL::partial_population,jsonb_build_array(n))).n IS NULL',
    partial: 'Error',
    error: '22023',
  },
  {
    name: 'populate_valid_array',
    sql: 'jsonb_populate_record_valid(NULL::partial_population,jsonb_build_array(n))',
    partial: 'False',
  },
  {
    name: 'populate_object',
    sql: "(jsonb_populate_record(NULL::partial_population,jsonb_build_object('n',n))).n IS NULL",
    partial: 'Unknown',
  },
  {
    name: 'populate_empty',
    sql: "jsonb_populate_record_valid(NULL::partial_empty,jsonb_build_object('n',n))",
    partial: 'True',
  },
  {
    name: 'delete_nonnull_key',
    sql: "(jsonb_build_object('n',n)-jsonb_build_array(n)::text) IS NULL",
    partial: 'False',
  },
  {
    name: 'delete_null_keys_length',
    sql: 'jsonb_array_length(jsonb_build_array(n,2)-ARRAY[NULL]::text[])=2',
    partial: 'True',
  },
  {
    name: 'delete_bulk_length_unknown',
    sql: "jsonb_array_length(jsonb_build_array(n,'x')-ARRAY['x'])=1",
    partial: 'Unknown',
  },
  {
    name: 'concat_chained',
    sql: 'jsonb_array_length((jsonb_build_array(n)||jsonb_build_array(n))-0)=1',
    partial: 'True',
  },
  {
    name: 'delete_scalar_nonnull_key',
    sql: "('1'::jsonb-jsonb_build_array(n)::text) IS NULL",
    partial: 'Error',
    error: '22023',
  },
  {
    name: 'delete_bulk_unknown_root_rank',
    sql: '((jsonb_build_array(n)->0)-ARRAY[ARRAY[k]]) IS NULL',
    partial: 'Error',
    error: '2202E',
  },
  {
    name: 'path_delete_empty',
    sql: "jsonb_array_length(jsonb_build_array(n)#- '{}')=1",
    partial: 'True',
  },
  { name: 'path_delete_single', sql: "jsonb_build_array(n)#- '{0}'='[]'::jsonb", partial: 'True' },
  {
    name: 'path_delete_negative',
    sql: "jsonb_array_length(jsonb_build_array(n,2)#- '{-1}')=1",
    partial: 'True',
  },
  {
    name: 'path_delete_missing',
    sql: "jsonb_array_length(jsonb_build_array(n)#- '{2,NULL}')=1",
    partial: 'True',
  },
  { name: 'path_delete_deep', sql: "(jsonb_build_array(n)#- '{0,n}') IS NULL", partial: 'Unknown' },
  {
    name: 'path_delete_null',
    sql: "(jsonb_build_array(n)#- '{NULL}') IS NULL",
    partial: 'Error',
    error: '22004',
  },
  {
    name: 'path_delete_bad_index',
    sql: "(jsonb_build_array(n)#- '{bad}') IS NULL",
    partial: 'Error',
    error: '22P02',
  },
  {
    name: 'path_delete_object',
    sql: "(jsonb_build_object('n',n)#- '{n}') IS NULL",
    partial: 'False',
  },
  {
    name: 'path_delete_rank',
    sql: "((jsonb_build_array(n)->0)#- '{{a},{b}}') IS NULL",
    partial: 'Error',
    error: '2202E',
  },
  {
    name: 'path_set_empty',
    sql: "jsonb_array_length(jsonb_set(jsonb_build_array(n),'{}','2'))=1",
    partial: 'True',
  },
  {
    name: 'path_set_missing',
    sql: "jsonb_array_length(jsonb_set(jsonb_build_array(n),'{2,NULL}','2'))=1",
    partial: 'True',
  },
  {
    name: 'path_set_replace',
    sql: "jsonb_array_length(jsonb_set(jsonb_build_array(n),'{0}','2',false))=1",
    partial: 'True',
  },
  {
    name: 'path_set_append',
    sql: "jsonb_array_length(jsonb_set(jsonb_build_array(n),'{2147483647}',jsonb_build_array(n)))=2",
    partial: 'True',
  },
  {
    name: 'path_set_prepend',
    sql: "jsonb_array_length(jsonb_set(jsonb_build_array(n),'{-2147483648}','2'))=2",
    partial: 'True',
  },
  {
    name: 'path_set_no_create',
    sql: "jsonb_array_length(jsonb_set(jsonb_build_array(n),'{8}','2',false))=1",
    partial: 'True',
  },
  {
    name: 'path_set_object',
    sql: "jsonb_typeof(jsonb_set(jsonb_build_object('n',n),'{new}',jsonb_build_array(n)))='object'",
    partial: 'True',
  },
  {
    name: 'path_insert_array',
    sql: "jsonb_array_length(jsonb_insert(jsonb_build_array(n),'{0}','2'))=2",
    partial: 'True',
  },
  {
    name: 'path_insert_after',
    sql: "jsonb_array_length(jsonb_insert(jsonb_build_array(n),'{-1}','2',true))=2",
    partial: 'True',
  },
  {
    name: 'path_insert_object',
    sql: "jsonb_insert(jsonb_build_object('n',n),'{n}','2') IS NULL",
    partial: 'Unknown',
  },
  {
    name: 'path_nullable_replacement',
    sql: "jsonb_set(jsonb_build_array(n),'{}',to_jsonb(n)) IS NULL",
    partial: 'Unknown',
  },
  {
    name: 'path_known_target_replace',
    sql: "jsonb_array_length(jsonb_set('[1,2]','{0}',jsonb_build_array(n)))=2",
    partial: 'True',
  },
  {
    name: 'path_known_target_append',
    sql: "jsonb_array_length(jsonb_set('[1,2]','{8}',jsonb_build_array(n)))=3",
    partial: 'True',
  },
  {
    name: 'path_known_target_nested',
    sql: "jsonb_array_length(jsonb_set('[[1],2]','{0,0}',jsonb_build_array(n)))=2",
    partial: 'True',
  },
  {
    name: 'path_known_target_insert',
    sql: "jsonb_array_length(jsonb_insert('[1,2]','{0}',jsonb_build_array(n)))=3",
    partial: 'True',
  },
  {
    name: 'path_known_target_insert_after',
    sql: "jsonb_array_length(jsonb_insert('[1,2]','{0}',jsonb_build_array(n),true))=3",
    partial: 'True',
  },
  {
    name: 'path_empty_target_null_key',
    sql: "jsonb_set('[]','{NULL}',jsonb_build_array(n),false)='[]'::jsonb",
    partial: 'True',
  },
  {
    name: 'path_scalar_empty',
    sql: "jsonb_set('1','{}',jsonb_build_array(n)) IS NULL",
    partial: 'Error',
    error: '22023',
  },
  {
    name: 'path_unknown_key',
    sql: '(jsonb_build_array(n)#- ARRAY[k]) IS NULL',
    partial: 'Error',
    error: '22P02',
  },
  {
    name: 'path_delete_reached_null',
    sql: "(jsonb_build_array(n)#- '{0,NULL}') IS NULL",
    partial: 'Error',
    error: '22004',
  },
  {
    name: 'path_set_reached_null',
    sql: "jsonb_set(jsonb_build_array(n),'{0,NULL}','2') IS NULL",
    partial: 'Error',
    error: '22004',
  },
  {
    name: 'path_full_nested_object',
    sql: "jsonb_array_length(jsonb_set('[{}]','{0,界🙂}',jsonb_build_array(n)))=1",
    partial: 'True',
  },
  {
    name: 'equal_different_kind',
    sql: "jsonb_build_array(n)=jsonb_build_object('n',n)",
    partial: 'False',
  },
  {
    name: 'unequal_different_kind',
    sql: "jsonb_build_array(n)<>jsonb_build_object('n',n)",
    partial: 'True',
  },
  {
    name: 'equal_different_length',
    sql: 'jsonb_build_array(n)=jsonb_build_array(n,n)',
    partial: 'False',
  },
  { name: 'equal_empty', sql: "jsonb_build_array(n)='[]'::jsonb", partial: 'False' },
  { name: 'contains_empty_array', sql: "jsonb_build_array(n) @> '[]'::jsonb", partial: 'True' },
  {
    name: 'contains_empty_object',
    sql: "jsonb_build_object('n',n) @> '{}'::jsonb",
    partial: 'True',
  },
  { name: 'contained_empty_array', sql: "'[]'::jsonb <@ jsonb_build_array(n)", partial: 'True' },
  {
    name: 'contains_wrong_container',
    sql: "jsonb_build_array(n) @> jsonb_build_object('n',n)",
    partial: 'False',
  },
  {
    name: 'contained_wrong_container',
    sql: "jsonb_build_array(n) <@ jsonb_build_object('n',n)",
    partial: 'False',
  },
  {
    name: 'contains_scalar_in_array',
    sql: "jsonb_build_array(n) @> '1'::jsonb",
    partial: 'Unknown',
  },
  {
    name: 'contains_scalar_in_object',
    sql: "jsonb_build_object('n',n) @> '1'::jsonb",
    partial: 'False',
  },
  { name: 'contains_array_in_scalar', sql: "'1'::jsonb @> jsonb_build_array(n)", partial: 'False' },
  {
    name: 'contains_duplicate_counts',
    sql: 'jsonb_build_array(n) @> jsonb_build_array(n,n)',
    partial: 'Unknown',
  },
  {
    name: 'ordered_root_kind',
    sql: "jsonb_build_array(n)<jsonb_build_object('n',n)",
    partial: 'True',
  },
  {
    name: 'ordered_root_kind_reverse',
    sql: "jsonb_build_object('n',n)<jsonb_build_array(n)",
    partial: 'False',
  },
  {
    name: 'ordered_array_counts',
    sql: 'jsonb_build_array(n)<jsonb_build_array(n,n)',
    partial: 'True',
  },
  {
    name: 'ordered_array_counts_reverse',
    sql: 'jsonb_build_array(n,n)<=jsonb_build_array(n)',
    partial: 'False',
  },
  { name: 'ordered_nonempty_scalar', sql: "jsonb_build_array(n)>'true'::jsonb", partial: 'True' },
  { name: 'ordered_scalar_nonempty', sql: "'null'::jsonb<jsonb_build_array(n)", partial: 'True' },
  {
    name: 'ordered_unknown_length',
    sql: "jsonb_strip_nulls(jsonb_build_array(n),true)>'null'::jsonb",
    partial: 'Unknown',
  },
  {
    name: 'compared_root_kind',
    sql: "jsonb_cmp(jsonb_build_array(n),jsonb_build_object('n',n))=-1",
    partial: 'True',
  },
  {
    name: 'compared_same_shape',
    sql: 'jsonb_cmp(jsonb_build_array(n),jsonb_build_array(n))=0',
    partial: 'Unknown',
  },
  {
    name: 'ordered_row',
    sql: 'ROW(jsonb_build_array(n),1)<ROW(jsonb_build_array(n,n),0)',
    partial: 'True',
  },
  {
    name: 'ordered_any',
    sql: 'jsonb_build_array(n)<ANY(ARRAY[jsonb_build_array(n,n)])',
    partial: 'True',
  },
  {
    name: 'ordered_selected',
    sql: 'jsonb_array_length(GREATEST(jsonb_build_array(n),jsonb_build_array(n,n)))=2',
    partial: 'True',
  },
]
const value = (value: number | string | boolean): Input => ({ kind: 'Value', value })
const unknown: Input = { kind: 'Unknown' }
const sqlNull: Input = { kind: 'Null' }
const error = (code: string): Outcome & Input => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})
const packet = 'artifacts/goal-checks/jsonb-consumers-active'

it('preserves partial JSONB shape without inventing NULL extraction or comparison results', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-consumers-'))
  try {
    await pg.exec('CREATE TYPE partial_population AS(n int); CREATE TYPE partial_empty AS()')
    const checked = (sql: string) => `CASE WHEN bypass THEN true ELSE (${sql}) END`
    await pg.exec(
      `CREATE TABLE partial_consumers(n int,k text,i int,bypass bool,${profiles.map((p) => `CONSTRAINT "${p.name}" CHECK(${checked(p.sql)})`).join(',')})`,
    )
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((t) => t.name === 'partial_consumers')!
    const names: string[] = []
    const group = prepareCheckRustGroup(
      profiles.flatMap((p) =>
        ['source', 'stored'].map((origin) => {
          const constraint = table.constraints.find((c) => c.name === p.name)!
          const expression = portableCheckAtoms(
            lowerTableCheck(
              table,
              constraint,
              catalog.enums,
              catalog.domains,
              origin as 'source' | 'stored',
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
              origin === 'source' ? `CHECK(${checked(p.sql)})` : undefined,
            )!.expression,
          )
          expect(hasUncertain(expression), p.name + origin).toBe(false)
          const name = `${p.name}_${origin}`
          names.push(name)
          return {
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: name,
            },
            expression,
          }
        }),
      ),
      { serverEncoding: 'UTF8', defaultCollation: 'C', arrayNulls: true },
    )
    for (const check of group.checks) expect(check.kind, JSON.stringify(check)).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const observations: unknown[] = []
    const base: Row = { n: unknown, k: value('n'), i: value(0), bypass: value(false) }
    for (const p of profiles) {
      const add = (row: Row, expected: Outcome) => {
        for (const origin of ['source', 'stored'])
          fixtures.push({ name: `${p.name}_${origin}`, row, expected })
      }
      add(base, p.error ? error(p.error) : ({ kind: p.partial } as Outcome))
      add({ ...base, bypass: value(true) }, { kind: 'True' })
      add({ ...base, n: error('22003') }, error('22003'))
      if (
        [
          'element',
          'element_text',
          'object_index',
          'delete_index',
          'delete_object_index',
          'strip',
        ].includes(p.name)
      ) {
        add({ ...base, i: sqlNull }, { kind: 'True' })
        add({ ...base, i: error('22003') }, error('22003'))
        add({ ...base, i: unknown }, { kind: 'Unknown' })
      }
      if (
        [
          'field',
          'field_text',
          'array_field',
          'exists',
          'array_exists',
          'delete_key',
          'delete_array_key',
        ].includes(p.name)
      ) {
        add({ ...base, k: sqlNull }, { kind: p.name.includes('exists') ? 'Null' : 'True' })
        add({ ...base, k: error('22003') }, error('22003'))
        add({ ...base, k: unknown }, { kind: 'Unknown' })
      }
      if (p.name === 'delete_bulk') {
        add({ ...base, k: unknown }, { kind: 'False' })
        add({ ...base, k: error('22003') }, error('22003'))
      }
      await pg.exec(
        `CREATE TABLE witness_${p.name}(n int,k text,i int,bypass bool,CHECK(${checked(p.sql)}))`,
      )
      for (const n of [1, 2, null])
        for (const nullArgs of [false, true]) {
          const row: Row = {
            n: n === null ? sqlNull : value(n),
            k: nullArgs ? sqlNull : value('n'),
            i: nullArgs ? sqlNull : value(0),
            bypass: value(false),
          }
          let actual: Outcome
          try {
            const result = (
              await pg.query<{ result: boolean | null }>(
                `SELECT (${p.sql}) result FROM (SELECT $1::int n,$2::text k,$3::int i) args`,
                [n, nullArgs ? null : 'n', nullArgs ? null : 0],
              )
            ).rows[0]!.result
            actual = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
          } catch (cause) {
            actual = error((cause as { code: string }).code)
          }
          if (!nullArgs && p.partial !== 'Unknown')
            expect(actual, p.name + ' native invariant').toEqual(
              p.error ? error(p.error) : { kind: p.partial },
            )
          add(row, actual)
          let code: string | undefined
          try {
            await pg.query(`INSERT INTO witness_${p.name} VALUES($1,$2,$3,false)`, [
              n,
              nullArgs ? null : 'n',
              nullArgs ? null : 0,
            ])
          } catch (cause) {
            code = (cause as { code: string }).code
          }
          expect(code, p.name).toBe(
            actual.kind === 'Error'
              ? actual.value.state.toString(36).toUpperCase().padStart(5, '0')
              : actual.kind === 'False'
                ? '23514'
                : undefined,
          )
          await pg.query(`INSERT INTO witness_${p.name} VALUES($1,$2,$3,true)`, [
            n,
            nullArgs ? null : 'n',
            nullArgs ? null : 0,
          ])
          observations.push({ name: p.name, n, nullArgs, actual, code, skippedAccepted: true })
        }
    }
    await mkdir(packet, { recursive: true })
    await writeFile(join(packet, 'observations.json'), JSON.stringify(observations, null, 2) + '\n')
    await runCheckParity(directory, 'pgsid-jsonb-consumers', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 360000)
