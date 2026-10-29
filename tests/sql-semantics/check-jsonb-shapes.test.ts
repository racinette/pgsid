import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
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

// n and b are unknown in the partial row. Builders keep the rest of the tree, so keys, positions
// and the possible kinds of the unknown values decide these results; Unknown marks results that
// depend on n or b.
const profiles: { name: string; sql: string; partial: Outcome['kind']; error?: string }[] = [
  { name: 'key_present', sql: "jsonb_build_object('n',n,'b',b) ? 'b'", partial: 'True' },
  { name: 'key_absent', sql: "jsonb_build_object('n',n) ? 'x'", partial: 'False' },
  { name: 'array_string_absent', sql: "jsonb_build_array(n,b) ? 'n'", partial: 'False' },
  { name: 'array_string_present', sql: "jsonb_build_array(n,'n') ? 'n'", partial: 'True' },
  { name: 'any_key', sql: "jsonb_build_object('n',n) ?| ARRAY['x','n']", partial: 'True' },
  { name: 'all_keys', sql: "jsonb_build_object('n',n) ?& ARRAY['x','n']", partial: 'False' },
  {
    name: 'all_present',
    sql: "jsonb_build_object('n',n,'b',b) ?& ARRAY['b','n']",
    partial: 'True',
  },
  { name: 'field_present', sql: "(jsonb_build_object('n',n)->'n') IS NULL", partial: 'False' },
  { name: 'field_missing', sql: "(jsonb_build_object('n',n)->'x') IS NULL", partial: 'True' },
  { name: 'field_text', sql: "(jsonb_build_object('n',n)->>'n') IS NULL", partial: 'Unknown' },
  {
    name: 'nested_field',
    sql: "(jsonb_build_object('a',jsonb_build_object('n',n))->'a'->'n') IS NULL",
    partial: 'False',
  },
  {
    name: 'exact_member',
    sql: "jsonb_build_object('a',jsonb_build_array(1,2),'n',n)->'a' = '[1,2]'::jsonb",
    partial: 'True',
  },
  {
    name: 'exact_path_text',
    sql: "jsonb_build_object('a',jsonb_build_object('c','x'),'n',n) #>> '{a,c}' = 'x'",
    partial: 'True',
  },
  {
    name: 'path_through_hole',
    sql: "(jsonb_build_object('n',n) #> '{n,0}') IS NULL",
    partial: 'True',
  },
  {
    name: 'path_through_exact_scalar',
    sql: "(jsonb_build_object('s','x','n',n) #> '{s,0}') IS NULL",
    partial: 'True',
  },
  { name: 'element_text', sql: "(jsonb_build_array(n,'x')->>1) = 'x'", partial: 'True' },
  {
    name: 'hole_length',
    sql: "jsonb_array_length(jsonb_build_object('n',n)->'n') = 1",
    partial: 'Error',
    error: '22023',
  },
  {
    name: 'duplicate_key',
    sql: "jsonb_build_object('n',n,'n','x') = '{\"n\":\"x\"}'::jsonb",
    partial: 'True',
  },
  {
    name: 'object_length_contains',
    sql: 'jsonb_build_object(\'n\',n) @> \'{"n":1,"m":2}\'::jsonb',
    partial: 'False',
  },
  {
    name: 'contains_missing_key',
    sql: "jsonb_build_object('n',n) @> '{\"x\":1}'::jsonb",
    partial: 'False',
  },
  {
    name: 'contains_kind_mismatch',
    sql: 'jsonb_build_object(\'n\',n) @> \'{"n":"s"}\'::jsonb',
    partial: 'False',
  },
  {
    name: 'contains_exact_member',
    sql: "jsonb_build_object('n',n,'s','x') @> '{\"s\":\"x\"}'::jsonb",
    partial: 'True',
  },
  {
    name: 'contains_depends',
    sql: "jsonb_build_object('n',n) @> '{\"n\":1}'::jsonb",
    partial: 'Unknown',
  },
  {
    name: 'contained_missing',
    sql: "'{\"x\":1}'::jsonb <@ jsonb_build_object('n',n)",
    partial: 'False',
  },
  {
    name: 'contained_depends',
    sql: "'{\"n\":1}'::jsonb <@ jsonb_build_object('n',n)",
    partial: 'Unknown',
  },
  {
    name: 'root_scalar_present',
    sql: "jsonb_build_array(n,'x') @> '\"x\"'::jsonb",
    partial: 'True',
  },
  { name: 'root_scalar_absent', sql: 'jsonb_build_array(n) @> \'"x"\'::jsonb', partial: 'False' },
  { name: 'root_scalar_depends', sql: "jsonb_build_array(n) @> '1'::jsonb", partial: 'Unknown' },
  {
    name: 'nested_no_scalar_rule',
    sql: "jsonb_build_object('a',jsonb_build_array(n)) @> '{\"a\":1}'::jsonb",
    partial: 'False',
  },
  {
    name: 'nested_element',
    sql: "jsonb_build_array(jsonb_build_object('n',n,'k','v')) @> '[{\"k\":\"v\"}]'::jsonb",
    partial: 'True',
  },
  {
    name: 'exact_nested_scalar_rule',
    sql: "'{\"a\":[1]}'::jsonb @> '{\"a\":1}'::jsonb OR '[[1]]'::jsonb @> '[1]'::jsonb OR n IS NULL",
    partial: 'Unknown',
  },
  { name: 'equal_kind_mismatch', sql: 'jsonb_build_array(n) = \'["x"]\'::jsonb', partial: 'False' },
  {
    name: 'equal_length',
    sql: 'jsonb_build_object(\'n\',n) = \'{"n":1,"m":2}\'::jsonb',
    partial: 'False',
  },
  { name: 'equal_depends', sql: "jsonb_build_array(n) = '[1]'::jsonb", partial: 'Unknown' },
  { name: 'unequal_keys', sql: "jsonb_build_object('n',n) <> '{\"x\":1}'::jsonb", partial: 'True' },
  {
    name: 'partial_pair_keys',
    sql: "jsonb_build_object('n',n) = jsonb_build_object('m',n)",
    partial: 'False',
  },
  {
    name: 'partial_pair_kinds',
    sql: 'jsonb_build_array(n) = jsonb_build_array(jsonb_build_array(b))',
    partial: 'False',
  },
  {
    name: 'concat_key',
    sql: "(jsonb_build_object('n',n) || '{\"b\":1}'::jsonb) ? 'b'",
    partial: 'True',
  },
  {
    name: 'concat_override',
    sql: '(jsonb_build_object(\'n\',n) || \'{"n":"x"}\'::jsonb) = \'{"n":"x"}\'::jsonb',
    partial: 'True',
  },
  {
    name: 'concat_position',
    sql: "(jsonb_build_array(n) || '[\"x\"]'::jsonb)->>1 = 'x'",
    partial: 'True',
  },
  {
    name: 'concat_scalar',
    sql: "(jsonb_build_object('n',n) || '1'::jsonb)->1 = '1'::jsonb",
    partial: 'True',
  },
  {
    name: 'concat_hole_root',
    sql: "jsonb_array_length((jsonb_build_object('n',n)->'n') || '[1]'::jsonb) = 2",
    partial: 'True',
  },
  {
    name: 'concat_partial_pair',
    sql: "(jsonb_build_object('n',n) || jsonb_build_object('b',b)) ?& ARRAY['n','b']",
    partial: 'True',
  },
  { name: 'delete_key', sql: "(jsonb_build_object('n',n,'b',b) - 'b') ? 'b'", partial: 'False' },
  {
    name: 'delete_key_kept',
    sql: "(jsonb_build_object('n',n,'b',b) - 'b') ? 'n'",
    partial: 'True',
  },
  {
    name: 'delete_to_exact',
    sql: "(jsonb_build_object('n',n,'s','x') - 'n') = '{\"s\":\"x\"}'::jsonb",
    partial: 'True',
  },
  {
    name: 'delete_string',
    sql: "jsonb_array_length(jsonb_build_array(n,'x') - 'x') = 1",
    partial: 'True',
  },
  {
    name: 'delete_index',
    sql: "(jsonb_build_array(n,'x') - 0) = '[\"x\"]'::jsonb",
    partial: 'True',
  },
  {
    name: 'delete_last',
    sql: "(jsonb_build_array('x',n) - (-1)) = '[\"x\"]'::jsonb",
    partial: 'True',
  },
  {
    name: 'delete_outside',
    sql: '(jsonb_build_array(n) - 5)->0 IS NULL',
    partial: 'False',
  },
  {
    name: 'delete_bulk_array',
    sql: "jsonb_array_length(jsonb_build_array(n,'x') - ARRAY['x']) = 1",
    partial: 'True',
  },
  {
    name: 'delete_bulk_object',
    sql: "(jsonb_build_object('n',n,'b',b,'s','x') - ARRAY['n','b']) = '{\"s\":\"x\"}'::jsonb",
    partial: 'True',
  },
  {
    name: 'delete_bulk_null',
    sql: "(jsonb_build_object('n',n) - ARRAY[NULL,'n']::text[]) = '{}'::jsonb",
    partial: 'True',
  },
  {
    name: 'insert_existing',
    sql: "jsonb_insert(jsonb_build_object('n',n),'{n}','2') IS NULL",
    partial: 'Error',
    error: '22023',
  },
  {
    name: 'insert_new',
    sql: "jsonb_insert(jsonb_build_object('n',n),'{m}','2') ? 'm'",
    partial: 'True',
  },
  {
    name: 'set_member',
    sql: "jsonb_set(jsonb_build_object('n',n,'s','x'),'{n}','2') = '{\"n\":2,\"s\":\"x\"}'::jsonb",
    partial: 'True',
  },
  {
    name: 'set_without_create',
    sql: "jsonb_set(jsonb_build_object('n',n),'{m}','2',false) ? 'm'",
    partial: 'False',
  },
  {
    name: 'set_create',
    sql: "jsonb_set(jsonb_build_object('n',n),'{m}','2') ->> 'm' = '2'",
    partial: 'True',
  },
  {
    name: 'set_partial_replacement',
    sql: "jsonb_array_length(jsonb_set('{\"a\":1}'::jsonb,'{b}',jsonb_build_array(n))->'b') = 1",
    partial: 'True',
  },
  {
    name: 'delete_path',
    sql: "(jsonb_build_object('n',n,'s','x') #- '{n}') = '{\"s\":\"x\"}'::jsonb",
    partial: 'True',
  },
  {
    name: 'delete_path_through_hole',
    sql: "((jsonb_build_array(n) #- '{0,n}')->0) IS NULL",
    partial: 'False',
  },
  {
    name: 'set_element',
    sql: "jsonb_set(jsonb_build_array(n,'x'),'{0}','\"y\"') = '[\"y\",\"x\"]'::jsonb",
    partial: 'True',
  },
  {
    name: 'insert_before',
    sql: "jsonb_insert(jsonb_build_array(n),'{0}','\"y\"')->>0 = 'y'",
    partial: 'True',
  },
  {
    name: 'insert_after',
    sql: "jsonb_insert(jsonb_build_array(n),'{0}','\"y\"',true)->>1 = 'y'",
    partial: 'True',
  },
  {
    name: 'set_nested',
    sql: "jsonb_set(jsonb_build_object('a',jsonb_build_object('n',n)),'{a,m}','1') #>> '{a,m}' = '1'",
    partial: 'True',
  },
  {
    name: 'set_through_hole',
    sql: "jsonb_set(jsonb_build_object('n',n),'{n,x}','1') ?& ARRAY['n']",
    partial: 'True',
  },
  { name: 'order_rank_below', sql: "jsonb_build_array(n) < '[true]'::jsonb", partial: 'True' },
  {
    name: 'order_rank_overlap',
    sql: 'jsonb_build_array(n) < \'["x"]\'::jsonb',
    partial: 'Unknown',
  },
  { name: 'order_container', sql: "jsonb_build_array(n) < '[[1]]'::jsonb", partial: 'True' },
  {
    name: 'order_key_first',
    sql: "jsonb_build_object('a',n) < '{\"b\":1}'::jsonb",
    partial: 'True',
  },
  {
    name: 'order_value_depends',
    sql: "jsonb_build_object('n',n) < '{\"n\":1}'::jsonb",
    partial: 'Unknown',
  },
  {
    name: 'order_earlier_element',
    sql: "jsonb_build_array('x',n) > '[\"w\",5]'::jsonb",
    partial: 'True',
  },
  {
    name: 'order_object_element',
    sql: 'jsonb_cmp(jsonb_build_array(n,1),\'[{"a":1},0]\'::jsonb) = -1',
    partial: 'True',
  },
  {
    name: 'order_scalar_empty_array',
    sql: "(jsonb_build_object('n',n)->'n') < '[]'::jsonb",
    partial: 'False',
  },
  {
    name: 'order_scalar_array',
    sql: "(jsonb_build_object('n',n)->'n') < '[1]'::jsonb",
    partial: 'True',
  },
  {
    name: 'order_partial_pair',
    sql: "jsonb_build_object('a',n) <= jsonb_build_object('b',b)",
    partial: 'True',
  },
]
const value = (value: number | boolean): Input => ({ kind: 'Value', value })
const unknown: Input = { kind: 'Unknown' }
const sqlNull: Input = { kind: 'Null' }
const error = (code: string): Outcome & Input => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})

it('decides JSONB keys, positions and possible kinds around unknown builder values', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-shapes-'))
  try {
    const checked = (sql: string) => `CASE WHEN bypass THEN true ELSE (${sql}) END`
    await pg.exec(
      `CREATE TABLE jsonb_shapes(n int,b bool,bypass bool,${profiles.map((p) => `CONSTRAINT "${p.name}" CHECK(${checked(p.sql)})`).join(',')})`,
    )
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((t) => t.name === 'jsonb_shapes')!
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
    const base: Row = { n: unknown, b: unknown, bypass: value(false) }
    for (const p of profiles) {
      const add = (row: Row, expected: Outcome) => {
        for (const origin of ['source', 'stored'])
          fixtures.push({ name: `${p.name}_${origin}`, row, expected })
      }
      add(base, p.error ? error(p.error) : ({ kind: p.partial } as Outcome))
      add({ ...base, bypass: value(true) }, { kind: 'True' })
      add({ ...base, n: error('22003') }, error('22003'))
      await pg.exec(
        `CREATE TABLE witness_${p.name}(n int,b bool,bypass bool,CHECK(${checked(p.sql)}))`,
      )
      const observed = new Set<string>()
      for (const n of [1, 2, 0, null])
        for (const b of [true, false, null]) {
          let actual: Outcome
          try {
            const result = (
              await pg.query<{ result: boolean | null }>(
                `SELECT (${p.sql}) result FROM (SELECT $1::int n,$2::bool b) args`,
                [n, b],
              )
            ).rows[0]!.result
            actual = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
          } catch (cause) {
            actual = error((cause as { code: string }).code)
          }
          observed.add(JSON.stringify(actual))
          add(
            {
              n: n === null ? sqlNull : value(n),
              b: b === null ? sqlNull : value(b),
              bypass: value(false),
            },
            actual,
          )
          let code: string | undefined
          try {
            await pg.query(`INSERT INTO witness_${p.name} VALUES($1,$2,false)`, [n, b])
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
          await pg.query(`INSERT INTO witness_${p.name} VALUES($1,$2,true)`, [n, b])
        }
      // A definite partial result must be the native result for every sampled n and b; an
      // Unknown one must actually vary across them.
      const expected = JSON.stringify(p.error ? error(p.error) : { kind: p.partial })
      if (p.partial === 'Unknown') expect(observed.size, p.name).toBeGreaterThan(1)
      else expect([...observed], p.name).toEqual([expected])
    }
    await runCheckParity(directory, 'pgsid-jsonb-shapes', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 360000)
