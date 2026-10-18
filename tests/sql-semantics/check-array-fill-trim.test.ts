import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import {
  assembleCheckRust,
  prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { runCheckParity, type Outcome, type Row } from '../../tools/check-rust/parity.js'
import { arrayScalarProfiles } from './check-array-fixtures.js'

const known = (value: string | number | boolean | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }
const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})
const sqlError = (error: unknown): Outcome => ({
  kind: 'Error',
  value: { state: parseInt((error as { code: string }).code, 36) },
})

it('fills and trims raw/stored arrays with concrete dimension signatures, bounds, empty/error order and expression composition', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-fill-trim-shapes-'))
  try {
    await pg.exec(
      'CREATE TABLE fill_trim_values(cell integer,dims text,lbs text,a text,n integer,expected text,bypass boolean);CREATE TABLE fill_trim_oracle(LIKE fill_trim_values)',
    )
    const forms = {
      fill: 'array_fill(cell,dims::int[])',
      bounded: 'array_fill(cell,dims::int[],lbs::int[])',
      promoted: 'array_fill(cell,dims::smallint[],lbs::smallint[])',
      trim: 'trim_array(a::int[],n)',
      composed: 'trim_array(array_fill(cell,dims::int[],lbs::int[]),n)',
      replacement: 'array_replace(array_fill(cell,dims::int[],lbs::int[]),cell,0)',
      guarded: 'CASE WHEN bypass THEN ARRAY[42] ELSE trim_array(a::int[],n) END',
    }
    const sqlForms = Object.fromEntries(
      Object.entries(forms).map(([name, value]) => [
        name,
        `(${value})::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`,
      ]),
    )
    for (const [name, sql] of Object.entries(sqlForms))
      await pg.exec(`ALTER TABLE fill_trim_values ADD CONSTRAINT ${name} CHECK(${sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'fill_trim_values')!
    const plans = Object.entries(sqlForms).flatMap(([name, sql]) =>
      (['source', 'stored'] as const).map((origin) => {
        const constraint = table.constraints.find((item) => item.name === name)!
        return {
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: name + '_' + origin,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              origin === 'source' ? { ...constraint, definition: `CHECK(${sql})` } : constraint,
              [],
              [],
              origin,
            )!.expression,
          ),
        }
      }),
    )
    const group = prepareCheckRustGroup(plans, {
      arrayNulls: true,
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
    })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    expect(group.requiresRegex).toBe(false)
    const dimensions = [
      null,
      '{}',
      '{0}',
      '{2}',
      '{2,2}',
      '{2,0}',
      '{0,-1}',
      '{-1,0}',
      '{0,2147483647}',
      '{2147483647,0}',
      '{65536,65536}',
      '{268435456}',
      '{268435456,0}',
      '{1,1,1,1,1,1}',
      '{1,1,1,1,1,1,1}',
      '{NULL}',
      '{{2}}',
      'bad',
    ]
    const lowers = [
      null,
      '{}',
      '{1}',
      '{0}',
      '{-2,0}',
      '{2147483647}',
      '{2147483646}',
      '{-2147483648}',
      '{NULL}',
      '{{1}}',
      'bad',
    ]
    const arrays = [
      null,
      '{}',
      '{1,2,NULL}',
      '[0:1]={1,2}',
      '[-3:-2]={1,NULL}',
      '[-2147483648:-2147483647]={1,2}',
      '[2147483645:2147483646]={1,2}',
      '[0:1][2:3]={{1,2},{3,NULL}}',
      '{{{1}}}',
      'bad',
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const [name, sql] of Object.entries(sqlForms)) {
      const rows =
        name === 'trim' || name === 'guarded'
          ? arrays.flatMap((a) =>
              [null, -1, 0, 1, 2, 3, 2147483647].map((n) => [1, null, null, a, n] as const),
            )
          : dimensions.flatMap((dims) =>
              (name === 'fill' ? [null] : lowers).flatMap((lbs) =>
                [null, 7].map(
                  (cell) => [cell, dims, lbs, null, name === 'composed' ? 1 : 0] as const,
                ),
              ),
            )
      for (const [cell, dims, lbs, a, n] of rows) {
        let output: string | null = null
        try {
          output = (
            await pg.query<{ value: string | null }>(
              `SELECT (${forms[name as keyof typeof forms]})::text value FROM (SELECT $1::integer cell,$2::text dims,$3::text lbs,$4::text a,$5::integer n,false bypass) q`,
              [cell, dims, lbs, a, n],
            )
          ).rows[0]!.value
        } catch {}
        await pg.exec('TRUNCATE fill_trim_oracle')
        await pg.query('INSERT INTO fill_trim_oracle VALUES($1,$2,$3,$4,$5,$6,false)', [
          cell,
          dims,
          lbs,
          a,
          n,
          output,
        ])
        let expected: Outcome
        try {
          expected = outcome(
            (await pg.query<{ value: boolean | null }>(`SELECT ${sql} value FROM fill_trim_oracle`))
              .rows[0]!.value,
          )
        } catch (error) {
          expected = sqlError(error)
        }
        references.push({ name, cell, dims, lbs, a, n, output, expected })
        for (const origin of ['source', 'stored'])
          fixtures.push({
            name: name + '_' + origin,
            row: {
              cell: known(cell),
              dims: known(dims),
              lbs: known(lbs),
              a: known(a),
              n: known(n),
              expected: known(output),
              bypass: known(false),
            },
            expected,
          })
      }
    }
    fixtures.push({
      name: 'guarded_source',
      row: {
        a: known('bad'),
        n: { kind: 'Unknown' },
        expected: known('{42}'),
        bypass: known(true),
      },
      expected: { kind: 'True' },
    })
    await mkdir('artifacts/array-fill-trim', { recursive: true })
    await writeFile(
      'artifacts/array-fill-trim/shapes-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-fill-trim/shapes-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arrayfilltrimshapes',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('preserves unknown fill cells, strict trim states, eager errors and native-count portability boundaries', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-array-fill-trim-partial-'))
  try {
    const evaluatorSource =
        'pub fn evaluate_check()->CheckOutcome {let result=array_fill_trim_partial_probe();check_from_bool(result)}',
      source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.push({
        path: 'test/array_fill_trim.rs',
        source: String.raw`
fn fill_trim_dimension(value:i32)->ArrayValue {
 let initial=make_array_arguments("pg_catalog.int4",2);
 let cell=array_element_from_int4(make_int4_value(value));
 let builder=append_array_argument(initial,cell);
 finish_array_constructor(builder)
}
pub fn array_fill_trim_partial_probe()->BoolValue {
 let lengths=fill_trim_dimension(2);
 let unknown=sql__pg_catalog__array_fill__8l6w(ArrayElement::Unknown,lengths.clone(),"pg_catalog.int4",2);
 if sql__pg_catalog__cardinality__m1rn(unknown.clone())!=make_int4_value(2) {return BoolValue::Value(false);};
 let trimmed=sql__pg_catalog__trim_array__uzie(unknown,make_int4_value(1));
 if sql__pg_catalog__cardinality__m1rn(trimmed)!=make_int4_value(1) {return BoolValue::Value(false);};
 let empty=sql__pg_catalog__array_fill__8l6w(ArrayElement::Unknown,fill_trim_dimension(0),"pg_catalog.int4",2);
 if sql__pg_catalog__cardinality__m1rn(empty)!=make_int4_value(0) {return BoolValue::Value(false);};
 let null_shape=sql__pg_catalog__array_fill__3xoe(ArrayElement::Unknown,ArrayValue::Unknown,ArrayValue::Null,"pg_catalog.int4",2);
 let null_plan=prepare_array_output(null_shape);
 if null_plan.state!= -2 || null_plan.error!=make_sql_error(3452548) {return BoolValue::Value(false);};
 let mut partial=make_array_arguments("pg_catalog.int4",2);
 partial=append_array_dimension(partial,1,2);
 partial=append_array_argument(partial,ArrayElement::Unknown);
 partial=append_array_argument(partial,ArrayElement::Null);
 let partial_shape=finish_array_arguments(partial);
 let rejected=sql__pg_catalog__array_fill__8l6w(ArrayElement::Null,partial_shape,"pg_catalog.int4",2);
 let rejected_plan=prepare_array_output(rejected);
 if rejected_plan.state!= -2 || rejected_plan.error!=make_sql_error(3452548) {return BoolValue::Value(false);};
 let first=make_sql_error(3452547);let second=make_sql_error(3452582);
 let failed=sql__pg_catalog__array_fill__8l6w(ArrayElement::Error(first),ArrayValue::Error(second),"pg_catalog.int4",2);
 let failed_plan=prepare_array_output(failed);
 if failed_plan.state!= -2 || failed_plan.error!=first {return BoolValue::Value(false);};
 let strict=sql__pg_catalog__trim_array__uzie(ArrayValue::Unknown,Int4Value::Null);
 let strict_null=array_is_null(strict);
 if strict_null!=BoolValue::Value(true) {return BoolValue::Value(false);};
 let limit=sql__pg_catalog__array_fill__8l6w(ArrayElement::Null,fill_trim_dimension(134217728),"pg_catalog.int4",2);
 let limit_plan=prepare_array_output(limit);
 if limit_plan.state!= -1 {return BoolValue::Value(false);};
 let too_large=sql__pg_catalog__array_fill__8l6w(ArrayElement::Null,fill_trim_dimension(268435456),"pg_catalog.int4",2);
 let large_plan=prepare_array_output(too_large);
 if large_plan.state!= -2 || large_plan.error!=make_sql_error(8584704) {return BoolValue::Value(false);};
 BoolValue::Value(true)
}
`,
      })
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      source,
      evaluatorSource,
      requiresRegex: false,
      checks: [{ kind: 'supported', entryName: 'evaluate_check', inputs: [] }],
    }
    await runCheckParity(
      directory,
      'arrayfilltrimpartial',
      group,
      ['partial'],
      [{ name: 'partial', row: {}, expected: { kind: 'True' } }],
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)

it('preserves fill/trim preparation, inferred enum identity, concrete array coercion and extreme slice behavior', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-fill-trim-context-'))
  try {
    await pg.exec(
      "CREATE TYPE fill_stage AS ENUM ('new','done');CREATE DOMAIN fill_seed AS integer;CREATE TABLE fill_trim_context(bypass boolean)",
    )
    const forms = {
      enum_fill:
        'array_fill(\'done\'::fill_stage,ARRAY[2])::text COLLATE "C" = \'{done,done}\' COLLATE "C"',
      enum_trim:
        "trim_array(ARRAY['new'::fill_stage,'done'::fill_stage],1)::text COLLATE \"C\" = '{new}' COLLATE \"C\"",
      enum_null: 'cardinality(array_fill(NULL::fill_stage,ARRAY[2]))=2',
      narrow_dims: 'cardinality(array_fill(1,ARRAY[2]::smallint[]))=2',
      raw_dims: "cardinality(array_fill(1,'{2}'))=2",
      constant_null: 'CASE WHEN bypass THEN true ELSE array_fill(1,NULL::int[]) IS NULL END',
      constant_cell: 'CASE WHEN bypass THEN true ELSE array_fill(1/0,ARRAY[0]) IS NULL END',
      pruned: 'CASE WHEN true THEN true ELSE array_fill(1,NULL::int[]) IS NULL END',
      runtime_null:
        "CASE WHEN bypass THEN true ELSE array_fill(1,'{NULL}'::text::int[]) IS NULL END",
      trim_error: 'CASE WHEN bypass THEN true ELSE trim_array(ARRAY[1],2) IS NULL END',
      trim_runtime: "CASE WHEN bypass THEN true ELSE trim_array('{1}'::text::int[],2) IS NULL END",
      trim_null_error: 'trim_array(NULL::int[],1/0) IS NULL',
      minimum_all:
        'trim_array(\'[-2147483648:-2147483647]={1,2}\'::int[],2)::text COLLATE "C" = \'{1,2}\' COLLATE "C"',
      maximum_one:
        'trim_array(array_prepend(0,\'[2147483646:2147483646]={1}\'::int[]),1)::text COLLATE "C" = \'{0,1}\' COLLATE "C"',
      maximum_slice:
        '(array_prepend(0,\'[2147483646:2147483646]={1}\'::int[]))[2147483646:2147483646]::text COLLATE "C" = \'{0,1}\' COLLATE "C"',
      portable_limit: 'array_fill(NULL::int,ARRAY[268435456]) IS NULL',
      zero_after_large: 'cardinality(array_fill(NULL::int,ARRAY[268435456,0]))=0',
      vector_subscripts:
        "array_fill(7,'[0:1]={2,2}'::int[],'[0:1]={0,-2}'::int[])::text COLLATE \"C\" = '[0:1][-2:-1]={{7,7},{7,7}}' COLLATE \"C\"",
      narrow_trim_count: 'cardinality(trim_array(ARRAY[1,2],1::smallint))=1',
    }
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'fill_trim_context')!
    const plans = Object.entries(forms).map(([name, sql]) => ({
      identity: { schema: 'public', kind: 'table' as const, owner: table.name, constraint: name },
      expression: portableCheckAtoms(
        lowerTableCheck(
          table,
          { name, type: 'check', definition: `CHECK(${sql})` },
          catalog.enums,
          catalog.domains,
          'source',
        )!.expression,
      ),
    }))
    const group = prepareCheckRustGroup(plans, {
      arrayNulls: true,
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
    })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const bypass of [false, true]) {
      await pg.exec('TRUNCATE fill_trim_context')
      await pg.query('INSERT INTO fill_trim_context VALUES($1)', [bypass])
      for (const [name, sql] of Object.entries(forms)) {
        let expected: Outcome
        try {
          expected = outcome(
            (
              await pg.query<{ value: boolean | null }>(
                `SELECT ${sql} value FROM fill_trim_context`,
              )
            ).rows[0]!.value,
          )
        } catch (error) {
          expected = sqlError(error)
        }
        fixtures.push({ name, row: { bypass: known(bypass) }, expected })
        references.push({ name, bypass, expected })
      }
    }
    const domainSql = 'array_fill(1::fill_seed,ARRAY[2]) IS NULL'
    expect(
      (
        await pg.query<{ type: string; value: boolean }>(
          'SELECT pg_typeof(array_fill(1::fill_seed,ARRAY[2]))::text type,' + domainSql + ' value',
        )
      ).rows,
    ).toEqual([{ type: 'fill_seed[]', value: false }])
    expect(
      lowerTableCheck(
        table,
        { name: 'domain', type: 'check', definition: `CHECK(${domainSql})` },
        catalog.enums,
        catalog.domains,
        'source',
      )!.expression.kind,
    ).toBe('eval-scalar')
    await expect(pg.query('SELECT array_fill(ARRAY[1,2],ARRAY[2])')).rejects.toMatchObject({
      code: '42704',
    })
    await mkdir('artifacts/array-fill-trim', { recursive: true })
    await writeFile(
      'artifacts/array-fill-trim/context-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-fill-trim/context-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arrayfilltrimcontext',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

describe('fills and trims every represented scalar and enum profile without comparison or rendering requirements', () => {
  let pg: PGlite
  let directory: string
  let plans: Parameters<typeof prepareCheckRustGroup>[0]
  const fixtures: { name: string; row: Row; expected: Outcome }[] = []
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-fill-trim-families-'))
    await pg.exec(
      "CREATE TYPE array_stage AS ENUM ('new','done');CREATE TABLE fill_trim_families(seed text,a text,dims text,lbs text,n integer,expected_count integer,expected_layout text,expected_null boolean);CREATE TABLE fill_trim_family_oracle(LIKE fill_trim_families)",
    )
    const forms: { name: string; sql: string; expression: string; probe: string; type: string }[] =
        [],
      samples = new Map<
        string,
        readonly (readonly [string | null, string | null, string, string, number | null])[]
      >()
    for (const [index, [type, literal]] of arrayScalarProfiles.entries()) {
      let values = (
        await pg.query<{ single: string; base: string }>(
          `SELECT ARRAY[${literal}::${type}]::text single,ARRAY[NULL::${type},${literal}::${type},NULL::${type},${literal}::${type}]::text base`,
        )
      ).rows[0]!
      if (type === 'money' || type.startsWith('reg'))
        values = { single: '{0}', base: '{NULL,0,NULL,0}' }
      samples.set(type, [
        [values.single, '[0:3]=' + values.base, '{2,2}', '{0,-2}', 1],
        [null, null, '{1,1}', '{0,-2}', null],
        [null, type === 'box' ? '{NULL;NULL}' : '{NULL,NULL}', '{0}', '{0}', 2],
        [values.single, '{}', '{}', '{}', 0],
        [values.single, values.base, '{2,0}', '{1,2147483647}', 0],
      ])
      const seed = `(seed::${type}[])[1]`
      for (const [name, expression] of Object.entries({
        fill: `array_fill(${seed},dims::int[])`,
        bounded: `array_fill(${seed},dims::int[],lbs::int[])`,
        trim: `trim_array(a::${type}[],n)`,
      })) {
        const probe = `(${expression})${name === 'fill' ? '[1][1]' : name === 'bounded' ? '[0][-2]' : '[2]'}`
        const sql = `cardinality(${expression}) IS NOT DISTINCT FROM expected_count AND array_dims(${expression}) COLLATE "C" IS NOT DISTINCT FROM expected_layout COLLATE "C" AND (${probe} IS NULL) IS NOT DISTINCT FROM expected_null`
        forms.push({ name: `family_${index}_${name}`, sql, expression, probe, type })
      }
    }
    for (const form of forms)
      await pg.exec(`ALTER TABLE fill_trim_families ADD CONSTRAINT ${form.name} CHECK(${form.sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'fill_trim_families')!
    plans = forms.flatMap((form) =>
      (['source', 'stored'] as const).map((origin) => {
        const constraint = table.constraints.find((item) => item.name === form.name)!
        return {
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: form.name + '_' + origin,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              origin === 'source'
                ? { ...constraint, definition: `CHECK(${form.sql})` }
                : constraint,
              catalog.enums,
              [],
              origin,
            )!.expression,
          ),
        }
      }),
    )
    const references: unknown[] = []
    for (const form of forms)
      for (const [seed, a, dims, lbs, n] of samples.get(form.type)!) {
        const value = (
          await pg.query<{ count: number | null; layout: string | null; null_cell: boolean }>(
            `SELECT cardinality(${form.expression}) count,array_dims(${form.expression}) layout,(${form.probe} IS NULL) null_cell FROM (SELECT $1::text seed,$2::text a,$3::text dims,$4::text lbs,$5::integer n) q`,
            [seed, a, dims, lbs, n],
          )
        ).rows[0]!
        await pg.exec('TRUNCATE fill_trim_family_oracle')
        await pg.query('INSERT INTO fill_trim_family_oracle VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [
          seed,
          a,
          dims,
          lbs,
          n,
          value.count,
          value.layout,
          value.null_cell,
        ])
        const expected = outcome(
          (
            await pg.query<{ value: boolean | null }>(
              `SELECT ${form.sql} value FROM fill_trim_family_oracle`,
            )
          ).rows[0]!.value,
        )
        references.push({ name: form.name, seed, a, dims, lbs, n, ...value, expected })
        for (const origin of ['source', 'stored'])
          fixtures.push({
            name: form.name + '_' + origin,
            row: {
              seed: known(seed),
              a: known(a),
              dims: known(dims),
              lbs: known(lbs),
              n: known(n),
              expected_count: known(value.count),
              expected_layout: known(value.layout),
              expected_null: known(value.null_cell),
            },
            expected,
          })
      }
    expect(arrayScalarProfiles).toHaveLength(58)
    await mkdir('artifacts/array-fill-trim', { recursive: true })
    await writeFile(
      'artifacts/array-fill-trim/family-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-fill-trim/family-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
  }, 240_000)
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it.each([0, 64, 128, 192, 256, 320])(
    'preserves scalar and enum profile batch %i',
    async (offset) => {
      const selected = plans.slice(offset, offset + 64),
        group = prepareCheckRustGroup(selected, {
          arrayNulls: true,
          defaultCollation: 'C',
          serverEncoding: 'UTF8',
        }),
        batch = join(directory, 'batch-' + offset)
      for (const [index, check] of group.checks.entries())
        expect(
          check.kind,
          selected[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
        ).toBe('supported')
      await mkdir(batch)
      const names = selected.map((plan) => plan.identity.constraint),
        allowed = new Set(names)
      await runCheckParity(
        batch,
        'arrayfilltrimfamilies' + offset,
        group,
        names,
        fixtures.filter((fixture) => allowed.has(fixture.name)),
      )
    },
    240_000,
  )
})
