import { expect, it } from 'vitest'
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
import { arrayFixtureSource, arrayScalarProfiles } from './check-array-fixtures.js'

const known = (value: string | number | boolean | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }

it('appends, prepends and concatenates raw/stored arrays with compatible types, dimensions, bounds, eager errors and lazy composition', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-transform-shapes-'))
  try {
    await pg.exec(
      "CREATE TYPE transform_stage AS ENUM ('new','done');CREATE TABLE transform_values(a text,b text,needle integer,expected text,bypass boolean);CREATE TABLE transform_oracle(LIKE transform_values)",
    )
    const forms = {
      append: 'array_append(a::int[],needle)',
      prepend: 'array_prepend(needle,a::int[])',
      cat: 'array_cat(a::int[],b::int[])',
      append_operator: 'a::int[] || needle',
      prepend_operator: 'needle || a::int[]',
      cat_operator: 'a::int[] || b::int[]',
      promoted: 'a::smallint[] || b::bigint[]',
      nested: 'array_prepend(needle,array_append(a::int[],needle)) || b::int[]',
      guarded: 'CASE WHEN bypass THEN ARRAY[42] ELSE a::int[] || b::int[] END',
      coalesce: 'COALESCE(a::int[] || b::int[],ARRAY[42])',
      high_prepend: 'array_prepend(0,a::int[])',
      repeated_high: 'array_prepend(0,array_prepend(0,a::int[]))',
      append_after_prepend: 'array_append(array_prepend(0,a::int[]),1)',
      enum: "array_prepend('new'::transform_stage,ARRAY['done'::transform_stage]) || ARRAY['new'::transform_stage]",
      constant: "array_cat('[0:1]={1,NULL}'::int[],ARRAY[2])",
    }
    const sqlForms = Object.fromEntries(
      Object.entries(forms).map(([name, value]) => [
        name,
        `(${value})::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`,
      ]),
    )
    for (const [name, sql] of Object.entries(sqlForms))
      await pg.exec(`ALTER TABLE transform_values ADD CONSTRAINT ${name} CHECK(${sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'transform_values')!
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
              catalog.enums,
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
    const arrays = [
      null,
      '{}',
      '{NULL}',
      '{1,2,NULL}',
      '[0:1]={1,2}',
      '[-3:-2]={1,2}',
      '[-2147483648:-2147483647]={1,2}',
      '[2147483645:2147483646]={1,2}',
      '[2147483646:2147483646]={1}',
      '{{1,2}}',
      '{{1},{2}}',
      '[5:6][0:1]={{1,2},{3,4}}',
      '[0:1][0:1]={{1,2},{3,4}}',
      '{{{1,2}}}',
      '{{{{{{1}}}}}}',
      '{bad}',
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const [name, sql] of Object.entries(sqlForms)) {
      const samples =
        name === 'enum' || name === 'constant'
          ? [[null, null, null, false] as const]
          : name.includes('cat') || ['promoted', 'nested', 'guarded', 'coalesce'].includes(name)
            ? arrays.flatMap((a) => arrays.map((b) => [a, b, 3, false] as const))
            : arrays.flatMap((a) => [null, 3].map((needle) => [a, null, needle, false] as const))
      for (const [a, b, needle, bypass] of samples) {
        let output: string | null = null
        try {
          output = (
            await pg.query<{ value: string | null }>(
              `SELECT (${forms[name as keyof typeof forms]})::text AS value FROM (SELECT $1::text a,$2::text b,$3::integer needle,$4::boolean bypass) q`,
              [a, b, needle, bypass],
            )
          ).rows[0]!.value
        } catch {}
        await pg.exec('TRUNCATE transform_oracle')
        await pg.query('INSERT INTO transform_oracle VALUES($1,$2,$3,$4,$5)', [
          a,
          b,
          needle,
          output,
          bypass,
        ])
        let expected: Outcome
        try {
          const value = (
            await pg.query<{ value: boolean | null }>(
              `SELECT ${sql} AS value FROM transform_oracle`,
            )
          ).rows[0]!.value
          expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
        } catch (error) {
          expected = {
            kind: 'Error',
            value: { state: parseInt((error as { code: string }).code, 36) },
          }
        }
        references.push({ name, a, b, needle, output, bypass, expected })
        for (const origin of ['source', 'stored'])
          fixtures.push({
            name: name + '_' + origin,
            row: {
              a: known(a),
              b: known(b),
              needle: known(needle),
              expected: known(output),
              bypass: known(bypass),
            },
            expected,
          })
      }
    }
    fixtures.push({
      name: 'guarded_source',
      row: {
        a: known('{bad}'),
        b: { kind: 'Unknown' },
        needle: known(1),
        expected: known('{42}'),
        bypass: known(true),
      },
      expected: { kind: 'True' },
    })
    fixtures.push({
      name: 'append_source',
      row: { a: known('{}'), needle: { kind: 'Unknown' }, expected: known('{NULL}') },
      expected: { kind: 'Unknown' },
    })
    await mkdir('artifacts/array-transform', { recursive: true })
    await writeFile(
      'artifacts/array-transform/shapes-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-transform/shapes-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arraytransformshapes',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('transforms every represented scalar and enum array without requiring element comparison support', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-transform-families-'))
  try {
    await pg.exec(
      "CREATE TYPE array_stage AS ENUM ('new','done');CREATE TABLE transform_families(a text,b text,needle text,expected integer);CREATE TABLE transform_family_oracle(LIKE transform_families)",
    )
    const forms: { name: string; sql: string; type: string }[] = [],
      samples = new Map<
        string,
        readonly (readonly [string | null, string | null, string | null])[]
      >()
    for (const [index, [type, literal]] of arrayScalarProfiles.entries()) {
      let base = (
        await pg.query<{ value: string }>(`SELECT ARRAY[${literal}::${type}]::text AS value`)
      ).rows[0]!.value
      if (type === 'money' || type.startsWith('reg')) base = '{0}'
      samples.set(type, [
        [base, base, base],
        [null, base, base],
        ['{}', base, null],
        [base, null, null],
      ])
      const needle = `(needle::${type}[])[1]`
      for (const [name, expression] of Object.entries({
        append: `array_append(a::${type}[],${needle})`,
        prepend: `array_prepend(${needle},a::${type}[])`,
        cat: `array_cat(a::${type}[],b::${type}[])`,
      })) {
        const firstNull =
          name === 'prepend'
            ? `${needle} IS NULL`
            : `CASE WHEN a::${type}[] IS NOT NULL AND cardinality(a::${type}[])>0 THEN (a::${type}[])[1] IS NULL ELSE ${name === 'cat' ? `(b::${type}[])[1] IS NULL` : `${needle} IS NULL`} END`
        const sql = `cardinality(${expression}) IS NOT DISTINCT FROM expected AND ((${expression})[1] IS NULL) IS NOT DISTINCT FROM (${firstNull})`
        forms.push({ name: `family_${index}_${name}`, sql, type })
      }
    }
    for (const form of forms)
      await pg.exec(`ALTER TABLE transform_families ADD CONSTRAINT ${form.name} CHECK(${form.sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'transform_families')!
    const plans = forms.flatMap((form) =>
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
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const form of forms)
      for (const [a, b, needle] of samples.get(form.type)!) {
        const count = form.name.endsWith('cat')
          ? (a === null || a === '{}' ? 0 : 1) + (b === null ? 0 : 1)
          : (a === null || a === '{}' ? 0 : 1) + 1
        await pg.exec('TRUNCATE transform_family_oracle')
        await pg.query('INSERT INTO transform_family_oracle VALUES($1,$2,$3,$4)', [
          a,
          b,
          needle,
          count,
        ])
        let expected: Outcome
        try {
          const value = (
            await pg.query<{ value: boolean | null }>(
              `SELECT ${form.sql} AS value FROM transform_family_oracle`,
            )
          ).rows[0]!.value
          expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
        } catch (error) {
          expected = {
            kind: 'Error',
            value: { state: parseInt((error as { code: string }).code, 36) },
          }
        }
        references.push({ name: form.name, a, b, needle, count, expected })
        for (const origin of ['source', 'stored'])
          fixtures.push({
            name: form.name + '_' + origin,
            row: { a: known(a), b: known(b), needle: known(needle), expected: known(count) },
            expected,
          })
      }
    expect(arrayScalarProfiles).toHaveLength(58)
    await mkdir('artifacts/array-transform', { recursive: true })
    await writeFile(
      'artifacts/array-transform/family-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-transform/family-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    for (let offset = 0; offset < plans.length; offset += 72) {
      const selected = plans.slice(offset, offset + 72)
      const group = prepareCheckRustGroup(selected, {
        arrayNulls: true,
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
      })
      for (const [index, check] of group.checks.entries())
        expect(
          check.kind,
          selected[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
        ).toBe('supported')
      const names = selected.map((plan) => plan.identity.constraint),
        allowed = new Set(names)
      const batchDirectory = join(directory, 'batch-' + offset)
      await mkdir(batchDirectory)
      await runCheckParity(
        batchDirectory,
        'arraytransformfamilies' + offset,
        group,
        names,
        fixtures.filter((fixture) => allowed.has(fixture.name)),
      )
    }
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('retains partial cells, argument-order errors and independent owned array results', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-array-transform-owned-'))
  try {
    const evaluatorSource =
      'pub fn evaluate_check()->CheckOutcome {let result=array_transform_owned_probe();check_from_bool(result)}'
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.push({
        path: 'test/array_transform.rs',
        source:
          arrayFixtureSource +
          String.raw`
pub fn array_transform_owned_probe()->BoolValue {
 let first=make_sql_error(3452547);let second=make_sql_error(3452582);
 let error_a=ArrayValue::Error(first);let error_b=ArrayElement::Error(second);
 let appended=sql__pg_catalog__array_append__k9mc(error_a.clone(),error_b.clone(),"pg_catalog.int4",2);
 let mut first_error=false; if let ArrayValue::Error(error)=appended {first_error=error==first;}; if first_error==false {return BoolValue::Value(false);};
 let prepended=sql__pg_catalog__array_prepend__0tgl(error_b,error_a,"pg_catalog.int4",2);
 let mut second_error=false; if let ArrayValue::Error(error)=prepended {second_error=error==second;}; if second_error==false {return BoolValue::Value(false);};
 let mut family:i32=1;
 while family<=40 {
  let cell=array_fixture_element(family);
  let mut builder=make_array_arguments("owned",family);
  builder=append_array_dimension(builder,-2,2);
  builder=append_array_argument(builder,cell.clone());
  builder=append_array_argument(builder,ArrayElement::Unknown);
  let original=finish_array_arguments(builder);
  let appended=sql__pg_catalog__array_append__k9mc(original.clone(),ArrayElement::Null,"owned",family);
  let prepended=sql__pg_catalog__array_prepend__0tgl(cell,original.clone(),"owned",family);
  let joined=sql__pg_catalog__array_cat__6rla(appended.clone(),prepended);
  let original_plan=prepare_array_output(original);
  let appended_plan=prepare_array_output(appended);
  let joined_plan=prepare_array_output(joined);
  if original_plan.state!=1 || original_plan.elements.len()!=2 {return BoolValue::Value(false);};
  if appended_plan.state!=1 || appended_plan.elements.len()!=3 {return BoolValue::Value(false);};
  if joined_plan.state!=1 || joined_plan.elements.len()!=6 || joined_plan.dimensions[0].lower!= -2 {return BoolValue::Value(false);};
  if array_element_family(joined_plan.elements[0].clone())!=family || array_element_family(joined_plan.elements[3].clone())!=family {return BoolValue::Value(false);};
  let unknown=joined_plan.elements[1].clone();
  let mut is_unknown=false; if let ArrayElement::Unknown=unknown {is_unknown=true;}; if is_unknown==false {return BoolValue::Value(false);};
  let sql_null=joined_plan.elements[2].clone();
  let mut is_null=false; if let ArrayElement::Null=sql_null {is_null=true;}; if is_null==false {return BoolValue::Value(false);};
  family=family+1;
 }
 let unknown=sql__pg_catalog__array_append__k9mc(ArrayValue::Null,ArrayElement::Unknown,"pg_catalog.int4",2);
 if sql__pg_catalog__cardinality__m1rn(unknown)!=make_int4_value(1) {return BoolValue::Value(false);};
 let text=array_element_from_text(make_text_value("original"));
 let a=sql__pg_catalog__array_append__k9mc(ArrayValue::Null,text.clone(),"pg_catalog.text",8);
 let b=sql__pg_catalog__array_cat__6rla(a.clone(),a.clone());
 if let ArrayValue::Value(payload)=b {
  let mut cells=payload.elements;
  cells[0]=array_element_from_text(make_text_value("changed"));
  if array_element_to_text(cells[1].clone())!=make_text_value("original") {return BoolValue::Value(false);};
 };
 let plan=prepare_array_output(a);
 if array_element_to_text(plan.elements[0].clone())!=make_text_value("original") {return BoolValue::Value(false);};
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
      'arraytransformowned',
      group,
      ['owned'],
      [{ name: 'owned', row: {}, expected: { kind: 'True' } }],
    ).catch((error) => {
      throw new Error([error.message, error.stdout, error.stderr].filter(Boolean).join('\n'), {
        cause: error,
      })
    })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)

it('preserves immutable transform preparation, pruned branches and stable runtime array casts', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-transform-preparation-'))
  try {
    await pg.exec('CREATE TABLE transform_preparation(bypass boolean)')
    const forms = {
      append_rank:
        "CASE WHEN bypass THEN true ELSE cardinality(array_append('{{1}}'::int[],1))=1 END",
      prepend_rank:
        "CASE WHEN bypass THEN true ELSE cardinality(array_prepend(1,'{{1}}'::int[]))=1 END",
      cat_shape:
        "CASE WHEN bypass THEN true ELSE cardinality('{1}'::int[] || '{{{1}}}'::int[])=1 END",
      runtime_rank:
        "CASE WHEN bypass THEN true ELSE cardinality(array_append('{{1}}'::text::int[],1))=1 END",
      pruned: "CASE WHEN true THEN true ELSE cardinality(array_prepend(1,'{{1}}'::int[]))=1 END",
      null_eager: "array_cat(NULL::int[],array_append('{{1}}'::int[],1)) IS NULL",
      promoted_error: 'array_cat(NULL::smallint[],ARRAY[1/0]::bigint[]) IS NULL',
      known_null: 'array_cat(NULL::int[],NULL::int[]) IS NULL',
      null_element: 'cardinality(array_append(NULL::int[],NULL))=1',
      prepend_high:
        "array_upper(array_prepend(0,'[2147483646:2147483646]={1}'::int[]),1)=2147483647",
      prepend_high_layout:
        'array_dims(array_prepend(0,\'[2147483646:2147483646]={1}\'::int[])) COLLATE "C" = \'[2147483646:2147483647]\' COLLATE "C"',
      cat_high_identity:
        "array_upper(array_cat(array_prepend(0,'[2147483646:2147483646]={1}'::int[]),'{}'::int[]),1)=2147483647",
      cat_high_error:
        "array_cat(array_prepend(0,'[2147483646:2147483646]={1}'::int[]),ARRAY[1]) IS NULL",
      nested_high_error: "ARRAY[array_prepend(0,'[2147483646:2147483646]={1}'::int[])] IS NULL",
      fetch_high: "(array_prepend(0,'[2147483646:2147483646]={1}'::int[]))[2147483647] IS NULL",
      fetch_high_first:
        "(array_prepend(0,'[2147483646:2147483646]={1}'::int[]))[2147483646] IS NULL",
      slice_high:
        '(array_prepend(0,\'[2147483646:2147483646]={1}\'::int[]))[2147483646:2147483647]::text COLLATE "C" = \'{0,1}\' COLLATE "C"',
      coerce_high:
        "array_upper(array_prepend(0,'[2147483646:2147483646]={1}'::int[])::bigint[],1)=2147483647",
      search_high:
        "array_position(array_prepend(0,'[2147483646:2147483646]={1}'::int[]),1)=2147483647",
    }
    const table = (await snapshotCatalog(pg)).tables.find(
      (item) => item.name === 'transform_preparation',
    )!
    const plans = Object.entries(forms).map(([name, sql]) => ({
      identity: { schema: 'public', kind: 'table' as const, owner: table.name, constraint: name },
      expression: portableCheckAtoms(
        lowerTableCheck(
          table,
          { name, type: 'check', definition: `CHECK(${sql})` },
          [],
          [],
          'source',
        )!.expression,
      ),
    }))
    const group = prepareCheckRustGroup(plans, { arrayNulls: true })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const bypass of [false, true]) {
      await pg.exec('TRUNCATE transform_preparation')
      await pg.query('INSERT INTO transform_preparation VALUES($1)', [bypass])
      for (const [name, sql] of Object.entries(forms)) {
        let expected: Outcome
        try {
          const value = (
            await pg.query<{ value: boolean | null }>(
              `SELECT ${sql} AS value FROM transform_preparation`,
            )
          ).rows[0]!.value
          expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
        } catch (error) {
          expected = {
            kind: 'Error',
            value: { state: parseInt((error as { code: string }).code, 36) },
          }
        }
        fixtures.push({ name, row: { bypass: known(bypass) }, expected })
        references.push({ name, bypass, expected })
      }
    }
    await mkdir('artifacts/array-transform', { recursive: true })
    await writeFile(
      'artifacts/array-transform/preparation-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-transform/preparation-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arraytransformpreparation',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)
