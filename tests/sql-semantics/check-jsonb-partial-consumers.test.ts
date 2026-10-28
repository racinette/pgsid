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
      { serverEncoding: 'UTF8', defaultCollation: 'C' },
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
      if (['element', 'element_text', 'object_index'].includes(p.name)) {
        add({ ...base, i: sqlNull }, { kind: 'True' })
        add({ ...base, i: error('22003') }, error('22003'))
        add({ ...base, i: unknown }, { kind: 'Unknown' })
      }
      if (['field', 'field_text', 'array_field', 'exists', 'array_exists'].includes(p.name)) {
        add({ ...base, k: sqlNull }, { kind: p.name.includes('exists') ? 'Null' : 'True' })
        add({ ...base, k: error('22003') }, error('22003'))
        add({ ...base, k: unknown }, { kind: 'Unknown' })
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
