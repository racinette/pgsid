import { arrayScalarProfiles } from './check-array-fixtures.js'
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

const known = (value: string | number | boolean | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }

it('fetches multidimensional elements and slices through raw/stored CHECKs with PostgreSQL bounds, coercion and evaluation order', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-array-subscripts-grammar-'))
  try {
    await pg.exec(
      'SET array_nulls=on;CREATE DOMAIN subscript_slots AS integer[];CREATE TABLE subscript_values(source text,i integer,j integer,lo integer,hi integer,n numeric,divlo integer,divhi integer,bypass boolean,expected_i integer,expected_s text);CREATE TABLE subscript_oracle(LIKE subscript_values)',
    )
    const values = {
      fetch: '(source::integer[])[i]',
      fetch_two: '(source::integer[])[i][j]',
      fetch_numeric: '(source::integer[])[n]',
      fetch_bigint: '(source::integer[])[n::bigint]',
      fetch_six: '(source::integer[])[i][j][i][j][i][j]',
      slice: '((source::integer[])[lo:hi])::text',
      slice_two: '((source::integer[])[lo:hi][i:j])::text',
      slice_mixed: '((source::integer[])[lo:hi][j])::text',
      slice_rest: '((source::integer[])[lo:hi][:])::text',
      slice_open_low: '((source::integer[])[:hi])::text',
      slice_open_high: '((source::integer[])[lo:])::text',
      slice_full: '((source::subscript_slots)[:])::text',
      slice_fetch: '((source::integer[])[lo:hi])[i]',
      upper_before_lower: '((source::integer[])[lo/divlo:hi/divhi])::text',
      null_before_error: '(source::integer[])[i][j/divhi]',
    }
    const expressions = Object.entries(values).map(([name, value]) => ({
      name,
      value,
      text: value.endsWith('::text'),
      sql: `(${value}) ${value.endsWith('::text') ? 'COLLATE "C"' : ''} IS NOT DISTINCT FROM ${value.endsWith('::text') ? 'expected_s COLLATE "C"' : 'expected_i'}`,
    }))
    for (const form of expressions)
      await pg.exec(`ALTER TABLE subscript_values ADD CONSTRAINT "${form.name}" CHECK(${form.sql})`)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'subscript_values')!
    const plans = expressions.flatMap((form) =>
      ['source', 'stored'].map((origin) => {
        const constraint = table.constraints.find((item) => item.name === form.name)!
        const plan = lowerTableCheck(
          table,
          origin === 'source' ? { ...constraint, definition: `CHECK(${form.sql})` } : constraint,
          catalog.enums,
          catalog.domains,
          origin as 'source' | 'stored',
        )!
        return {
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: form.name + '_' + origin,
          },
          expression: portableCheckAtoms(plan.expression),
        }
      }),
    )
    const group = prepareCheckRustGroup(plans, { arrayNulls: true, defaultCollation: 'C' })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    expect(group.requiresRegex).toBe(false)
    expect(group.evaluatorSource).toContain('if array_subscript_continues(')
    const sources = [
      '{10,NULL,30}',
      '[0:2]={10,NULL,30}',
      '[-2:0]={10,NULL,30}',
      '[0:1][-1:1]={{10,NULL,30},{40,50,60}}',
      '{{{1,2},{3,4}},{{5,6},{7,8}}}',
      '{{{{{{1}}}}}}',
      '[-2147483648:-2147483647]={10,20}',
      '[2147483645:2147483646]={10,20}',
      '{}',
      null,
    ]
    const bounds = [
      [1, 1, 1, 2, '1.5', 1, 1],
      [0, -1, -2, 1, '-1.5', 1, 1],
      [-2147483648, 2147483647, -2147483648, 2147483647, '2147483648', 1, 1],
      [2, 3, 3, 1, '-2147483648.5', 1, 1],
      [null, 1, 1, 2, '1', 1, 0],
      [1, null, null, 2, 'NaN', 1, 1],
      [1, 1, 1, null, '2', 0, 1],
      [1, 1, -2147483648, 1, '1', -1, 0],
    ] as const
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    const candidate = 'subscript_oracle'
    for (const source of sources)
      for (const bound of bounds) {
        await pg.exec('TRUNCATE subscript_oracle')
        await pg.query(
          'INSERT INTO subscript_oracle(source,i,j,lo,hi,n,divlo,divhi) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
          [source, ...bound],
        )
        const row: Row = Object.fromEntries(
          ['source', 'i', 'j', 'lo', 'hi', 'n', 'divlo', 'divhi'].map((name, index) => [
            name,
            known([source, ...bound][index]!),
          ]),
        )
        for (const form of expressions) {
          let actual: string | number | null = null,
            expected: Outcome = { kind: 'True' }
          try {
            actual = (
              await pg.query<{ actual: string | number | null }>(
                `SELECT ${form.value} AS actual FROM ${candidate}`,
              )
            ).rows[0]!.actual
          } catch (error) {
            expected = {
              kind: 'Error',
              value: { state: parseInt((error as { code: string }).code, 36) },
            }
          }
          references.push({ name: form.name, source, bound, actual, expected })
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: form.name + '_' + origin,
              row: { ...row, [form.text ? 'expected_s' : 'expected_i']: known(actual) },
              expected,
            })
        }
      }
    const base: Row = {
      source: known('{1,2}'),
      i: known(1),
      j: known(1),
      lo: known(1),
      hi: known(2),
      n: known('1'),
      divlo: known(1),
      divhi: known(1),
      expected_i: known(99),
      expected_s: known('wrong'),
    }
    for (const name of ['fetch_source', 'slice_stored'])
      fixtures.push({ name, row: base, expected: { kind: 'False' } })
    fixtures.push({
      name: 'fetch_source',
      row: {
        ...base,
        source: { kind: 'Unknown' },
        i: { kind: 'Error', value: { state: parseInt('22012', 36) } },
      },
      expected: { kind: 'Unknown' },
    })
    fixtures.push({
      name: 'fetch_source',
      row: {
        ...base,
        source: known(null),
        i: { kind: 'Error', value: { state: parseInt('22012', 36) } },
        expected_i: known(null),
      },
      expected: { kind: 'True' },
    })
    fixtures.push({
      name: 'slice_source',
      row: { ...base, lo: { kind: 'Unknown' }, hi: known(null) },
      expected: { kind: 'Unknown' },
    })
    fixtures.push({
      name: 'fetch_source',
      row: {
        ...base,
        source: { kind: 'Error', value: { state: parseInt('22003', 36) } },
        i: { kind: 'Error', value: { state: parseInt('22012', 36) } },
      },
      expected: { kind: 'Error', value: { state: parseInt('22003', 36) } },
    })
    await mkdir('artifacts/array-subscripts', { recursive: true })
    await writeFile(
      'artifacts/array-subscripts/grammar-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-subscripts/grammar-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arraysubscriptgrammar',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('preserves every represented scalar family and nominal array type through fetches and slices, including enum result metadata', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-array-subscripts-families-'))
  try {
    await pg.exec(
      "SET TIME ZONE 'UTC'; SET DateStyle='ISO, MDY'; SET IntervalStyle='iso_8601'; SET array_nulls=on; CREATE TYPE array_stage AS ENUM ('new','done'); CREATE TABLE subscript_families(source text)",
    )
    const forms: { name: string; sql: string; source: string }[] = []
    for (const [index, [type, literal]] of arrayScalarProfiles.entries()) {
      let source = (
        await pg.query<{ value: string }>(
          `SELECT ARRAY[${literal}::${type},NULL::${type}]::text AS value`,
        )
      ).rows[0]!.value
      if (type === 'money') source = '{0,NULL}'
      const input = `(source::${type}[])`
      for (const [kind, sql] of [
        ['first', `${input}[1] IS NOT NULL`],
        ['null', `${input}[2] IS NULL`],
        ['missing', `${input}[3] IS NULL`],
        ['slice_first', `(${input}[1:1])[1] IS NOT NULL`],
        ['slice_null', `(${input}[2:2])[1] IS NULL`],
        [
          'slice_dims',
          `array_dims(${input}[1:2]) COLLATE "C" IS NOT DISTINCT FROM '[1:2]' COLLATE "C"`,
        ],
        ['nested_slice', `cardinality((${input}[:])[1:1]) = 1`],
      ] as const)
        forms.push({ name: `family_${index}_${kind}`, sql, source })
    }
    const enumSource = forms.find((form) => form.name === 'family_5_first')!.source
    for (const [name, sql] of [
      ['enum_scalar', "(source::array_stage[])[1] = 'new'::array_stage"],
      ['enum_text', '(source::array_stage[])[1]::text COLLATE "C" = \'new\' COLLATE "C"'],
      [
        'enum_slice_case',
        "(CASE WHEN true THEN (source::array_stage[])[:1] ELSE NULL::array_stage[] END)[1] = 'new'::array_stage",
      ],
    ])
      forms.push({ name: name!, sql: sql!, source: enumSource })
    for (const form of forms)
      await pg.exec(`ALTER TABLE subscript_families ADD CONSTRAINT ${form.name} CHECK(${form.sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'subscript_families')!
    const plans = forms.flatMap((form) =>
      ['source', 'stored'].map((origin) => {
        const constraint = table.constraints.find((item) => item.name === form.name)!
        const plan = lowerTableCheck(
          table,
          origin === 'source' ? { ...constraint, definition: `CHECK(${form.sql})` } : constraint,
          catalog.enums,
          catalog.domains,
          origin as 'source' | 'stored',
        )!
        return {
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: form.name + '_' + origin,
          },
          expression: portableCheckAtoms(plan.expression),
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
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const form of forms)
      for (const source of [form.source, '{}', null]) {
        const value = (
          await pg.query<{ value: boolean | null }>(
            `SELECT (${form.sql}) AS value FROM (SELECT $1::text source) row`,
            [source],
          )
        ).rows[0]!.value
        const expected: Outcome = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
        references.push({ name: form.name, source, expected })
        for (const origin of ['source', 'stored'])
          fixtures.push({
            name: form.name + '_' + origin,
            row: { source: known(source) },
            expected,
          })
      }
    expect(arrayScalarProfiles).toHaveLength(58)
    await mkdir('artifacts/array-subscripts', { recursive: true })
    await writeFile(
      'artifacts/array-subscripts/family-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-subscripts/family-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arraysubscriptfamilies',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('prepares immutable bound errors while preserving pruned branches and runtime NULL source short circuits', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-subscripts-constants-'))
  try {
    await pg.exec('CREATE TABLE subscript_constants(source text,bypass boolean,divisor integer)')
    const values = {
      null_constant: '(NULL::integer[])[1/0] IS NULL',
      null_dynamic: '(NULL::integer[])[1/divisor] IS NULL',
      pruned: 'CASE WHEN true THEN true ELSE (ARRAY[1])[1/0] IS NULL END',
      conditional_constant: 'CASE WHEN bypass THEN true ELSE (source::integer[])[1/0] IS NULL END',
      literal_input: "CASE WHEN true THEN true ELSE ('{bad}'::integer[])[1] IS NULL END",
      runtime_input: "CASE WHEN true THEN true ELSE ('{bad}'::text::integer[])[1] IS NULL END",
      scalar_numeric: '(ARRAY[1,2])[1.5::numeric] = 2',
      parenthesized: '((ARRAY[1,2])[1:2])[0] IS NULL',
      parent_constant: 'CASE WHEN bypass THEN true ELSE 1 / ((ARRAY[0])[1]) = 1 END',
      slice_parent_constant: 'CASE WHEN bypass THEN true ELSE 1 / (((ARRAY[0])[1:1])[1]) = 1 END',
      null_guard_bound_fold: '(NULL::integer[])[1 / ((ARRAY[0])[1])] IS NULL',
      pruned_parent: 'CASE WHEN true THEN true ELSE 1 / ((ARRAY[0])[1]) = 1 END',
      coalesce_nullable: 'COALESCE((ARRAY[1])[2], 1 / divisor) = 1',
    }
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'subscript_constants')!
    const plans = Object.entries(values).map(([name, sql]) => ({
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
    for (const [source, bypass, divisor] of [
      [null, true, 0],
      ['{1}', true, 0],
      ['{1}', false, 1],
    ] as const) {
      await pg.exec('TRUNCATE subscript_constants')
      await pg.query('INSERT INTO subscript_constants VALUES($1,$2,$3)', [source, bypass, divisor])
      for (const [name, sql] of Object.entries(values)) {
        let expected: Outcome
        try {
          const value = (
            await pg.query<{ value: boolean | null }>(
              `SELECT ${sql} AS value FROM subscript_constants`,
            )
          ).rows[0]!.value
          expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
        } catch (error) {
          expected = {
            kind: 'Error',
            value: { state: parseInt((error as { code: string }).code, 36) },
          }
        }
        references.push({ name, source, bypass, divisor, expected })
        fixtures.push({
          name,
          row: { source: known(source), bypass: known(bypass), divisor: known(divisor) },
          expected,
        })
      }
    }
    await mkdir('artifacts/array-subscripts', { recursive: true })
    await writeFile(
      'artifacts/array-subscripts/constant-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-subscripts/constant-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arraysubscriptconstants',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)

it('owns copied slice cells and bound snapshots independently and recovers known JSONB cells from partially unknown arrays', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-array-subscripts-owned-'))
  try {
    const evaluatorSource =
      'pub fn evaluate_check()->CheckOutcome {let result=array_subscript_owned_probe();check_from_bool(result)}'
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.push({
        path: 'test/array_subscripts.rs',
        source: String.raw`
pub fn array_subscript_owned_probe()->BoolValue {
 let original=make_jsonb_value("{\"a\": [1, 2]}");
 let mut builder=make_array_arguments("pg_catalog.jsonb",12);
 builder=append_array_dimension(builder,-1,3);
 builder=append_array_argument(builder,ArrayElement::Unknown);
 builder=append_array_argument(builder,array_element_from_jsonb(original.clone()));
 builder=append_array_argument(builder,ArrayElement::Null);
 let array=finish_array_arguments(builder);
 let bounds=make_array_subscripts();
 let upper=append_array_subscript(bounds,make_int4_value(1),false,true);
 let indices=append_array_subscript(upper,make_int4_value(0),true,true);
 let snapshot=indices.clone();
 if let ArraySubscripts::Value(payload)=snapshot {
  let mut upper_bounds=payload.upper;upper_bounds[0]=ArraySubscriptBound{provided:true,state:1,value:-1};
  let changed=ArraySubscripts::Value(ArraySubscriptPayload{upper:upper_bounds,lower:payload.lower});
  if sql__pg_catalog__cardinality__m1rn(array_slice_subscript(array.clone(),changed))!=make_int4_value(0) {return BoolValue::Value(false);};
 };
 let sliced=array_slice_subscript(array.clone(),indices);
 if sql__pg_catalog__array_dims__01ex(sliced.clone())!=make_text_value("[1:2]") {return BoolValue::Value(false);};
 let index=append_array_subscript(make_array_subscripts(),make_int4_value(1),false,true);
 let restored=array_element_to_jsonb(array_fetch_subscript(sliced.clone(),index));
 if jsonb_to_text(restored)!=jsonb_to_text(original.clone()) {return BoolValue::Value(false);};
 let copied=sliced.clone();
 if let ArrayValue::Value(payload)=copied {
  let mut elements=payload.elements;
  let first=elements[0].clone();
  if let ArrayElement::Jsonb(value)=first {
   let mut characters=value.characters;characters[0]='x';
   elements[0]=ArrayElement::Jsonb(JsonbPayload{root:value.root,nodes:value.nodes,characters:characters});
  };
  let mut dimensions=payload.dimensions;dimensions[0]=ArrayDimension{lower:5,length:2};
  let modified=ArrayValue::Value(ArrayPayload{element_type:payload.element_type,element_kind:payload.element_kind,dimensions:dimensions,elements:elements});
  if sql__pg_catalog__array_dims__01ex(modified)!=make_text_value("[5:6]") {return BoolValue::Value(false);};
 };
 if sql__pg_catalog__array_dims__01ex(sliced.clone())!=make_text_value("[1:2]") {return BoolValue::Value(false);};
 let original_index=append_array_subscript(make_array_subscripts(),make_int4_value(0),false,true);
 if jsonb_to_text(array_element_to_jsonb(array_fetch_subscript(array,original_index)))!=jsonb_to_text(original) {return BoolValue::Value(false);};
 let sliced_index=append_array_subscript(make_array_subscripts(),make_int4_value(1),false,true);
 if jsonb_to_text(array_element_to_jsonb(array_fetch_subscript(sliced,sliced_index)))!=make_text_value("{\"a\": [1, 2]}") {return BoolValue::Value(false);};
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
      'arraysubscriptowned',
      group,
      ['ownership'],
      [{ name: 'ownership', row: {}, expected: { kind: 'True' } }],
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)
