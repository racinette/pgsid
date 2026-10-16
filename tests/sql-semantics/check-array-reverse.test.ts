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
import { arrayScalarProfiles } from './check-array-fixtures.js'

const known = (value: string | boolean | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }
const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})
const failure = (error: unknown): Outcome => ({
  kind: 'Error',
  value: { state: parseInt((error as { code: string }).code, 36) },
})
const context = { arrayNulls: true, defaultCollation: 'C', serverEncoding: 'UTF8' } as const

it('reverses raw/stored first-dimension blocks with retained bounds, partial states, composition and preparation', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-reverse-shapes-'))
  try {
    await pg.exec(
      'CREATE TABLE reverse_values(a text,expected text,bypass boolean);CREATE TABLE reverse_oracle(LIKE reverse_values)',
    )
    const forms = {
      reversed: 'array_reverse(a::int[])',
      twice: 'array_reverse(array_reverse(a::int[]))',
      trimmed: 'trim_array(array_reverse(a::int[]),1)',
      filled: 'array_reverse(array_fill(7,ARRAY[2,2],ARRAY[0,-2]))',
      appended: 'array_reverse(array_append(a::int[],3))',
      coalesce: 'COALESCE(array_reverse(a::int[]),ARRAY[42])',
      guarded: 'CASE WHEN bypass THEN ARRAY[42] ELSE array_reverse(a::int[]) END',
      maximum: "array_reverse(array_prepend(0,'[2147483646:2147483646]={1}'::int[]))",
      maximum_guarded:
        "CASE WHEN bypass THEN ARRAY[42] ELSE array_reverse(array_prepend(0,'[2147483646:2147483646]={1}'::int[])) END",
      maximum_runtime:
        'CASE WHEN bypass THEN ARRAY[42] ELSE array_reverse(array_prepend(0,a::int[])) END',
      pruned:
        "CASE WHEN true THEN ARRAY[42] ELSE array_reverse(array_prepend(0,'[2147483646:2147483646]={1}'::int[])) END",
    }
    const sqlForms = Object.fromEntries(
      Object.entries(forms).map(([name, value]) => [
        name,
        `(${value})::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`,
      ]),
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'reverse_values')!
    const plans = Object.entries(sqlForms).flatMap(([name, sql]) =>
      ['source'].map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            { name, type: 'check', definition: `CHECK(${sql})` },
            catalog.enums,
            catalog.domains,
            origin as 'source' | 'stored',
          )!.expression,
        ),
      })),
    )
    const storedAdmission: unknown[] = []
    for (const [name, sql] of Object.entries(sqlForms)) {
      try {
        await pg.exec(`ALTER TABLE reverse_values ADD CONSTRAINT ${name} CHECK(${sql})`)
        const stored = (
          await pg.query<{ definition: string }>(
            "SELECT pg_get_constraintdef(oid) definition FROM pg_constraint WHERE conrelid='reverse_values'::regclass AND conname=$1",
            [name],
          )
        ).rows[0]!.definition
        plans.push({
          identity: {
            schema: 'public',
            kind: 'table',
            owner: table.name,
            constraint: name + '_stored',
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              { name, type: 'check', definition: stored },
              catalog.enums,
              catalog.domains,
              'stored',
            )!.expression,
          ),
        })
        storedAdmission.push({ name, accepted: true, definition: stored })
      } catch (error) {
        expect((error as { code: string }).code).toBe('54000')
        storedAdmission.push({ name, accepted: false, error: failure(error) })
      }
    }
    const preparedNames = new Set(plans.map((plan) => plan.identity.constraint))
    const group = prepareCheckRustGroup(plans, context)
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    expect(group.requiresRegex).toBe(false)
    const rank6 =
      '{' + '{'.repeat(5) + '1' + '}'.repeat(5) + ',' + '{'.repeat(5) + '2' + '}'.repeat(5) + '}'
    const arrays = [
      null,
      '{}',
      '{NULL}',
      '{1,2,NULL}',
      '[0:2]={1,NULL,3}',
      '[-3:-2]={1,2}',
      '[-2147483648:-2147483647]={1,2}',
      '[2147483645:2147483646]={1,2}',
      '[2147483646:2147483646]={1}',
      '{{1,2}}',
      '{{1},{2}}',
      '[0:1][2:3]={{1,NULL},{2,3}}',
      '{{{1,2}},{{3,4}}}',
      rank6,
      'bad',
      '{bad}',
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const [name, sql] of Object.entries(sqlForms))
      for (const a of arrays)
        for (const bypass of [false, true]) {
          let output: string | null = null
          try {
            output = (
              await pg.query<{ value: string | null }>(
                `SELECT (${forms[name as keyof typeof forms]})::text value FROM (SELECT $1::text a,$2::boolean bypass) q`,
                [a, bypass],
              )
            ).rows[0]!.value
          } catch {}
          await pg.exec('TRUNCATE reverse_oracle')
          await pg.query('INSERT INTO reverse_oracle VALUES($1,$2,$3)', [a, output, bypass])
          let expected: Outcome
          try {
            expected = outcome(
              (await pg.query<{ value: boolean | null }>(`SELECT ${sql} value FROM reverse_oracle`))
                .rows[0]!.value,
            )
          } catch (error) {
            expected = failure(error)
          }
          references.push({ name, a, bypass, output, expected })
          for (const origin of ['source', 'stored'])
            if (preparedNames.has(name + '_' + origin))
              fixtures.push({
                name: name + '_' + origin,
                row: { a: known(a), expected: known(output), bypass: known(bypass) },
                expected,
              })
        }
    for (const origin of ['source', 'stored']) {
      fixtures.push({
        name: 'reversed_' + origin,
        row: { a: { kind: 'Unknown' }, expected: known('{}') },
        expected: { kind: 'Unknown' },
      })
      fixtures.push({
        name: 'reversed_' + origin,
        row: {
          a: { kind: 'Error', value: { state: parseInt('22012', 36) } },
          expected: known('{}'),
        },
        expected: { kind: 'Error', value: { state: parseInt('22012', 36) } },
      })
      fixtures.push({
        name: 'reversed_' + origin,
        row: { a: known('{1,2}'), expected: known('{1,2}') },
        expected: { kind: 'False' },
      })
      fixtures.push({
        name: 'guarded_' + origin,
        row: { a: { kind: 'Unknown' }, bypass: known(true), expected: known('{42}') },
        expected: { kind: 'True' },
      })
    }
    await mkdir('artifacts/array-reverse', { recursive: true })
    await writeFile(
      'artifacts/array-reverse/stored-admission.json',
      JSON.stringify(storedAdmission, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-reverse/shapes-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-reverse/shapes-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arrayreverseshapes',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)

it('moves scalar and enum cells in every represented family without element comparison or output requirements', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-reverse-families-'))
  try {
    await pg.exec(
      "CREATE TYPE array_stage AS ENUM ('new','done');CREATE TABLE reverse_families(source text,expected_layout text)",
    )
    const forms: { name: string; sql: string; type: string; array: string; layout: string }[] = []
    for (const [index, [type, literal]] of arrayScalarProfiles.entries())
      for (const multidimensional of [false, true]) {
        const expression = multidimensional
          ? `ARRAY[ARRAY[NULL::${type},${literal}::${type}],ARRAY[${literal}::${type},NULL::${type}]]`
          : `ARRAY[NULL::${type},${literal}::${type},NULL::${type},${literal}::${type}]`
        let contents = (await pg.query<{ value: string }>(`SELECT (${expression})::text value`))
          .rows[0]!.value
        if (type === 'money')
          contents = multidimensional ? '{{NULL,0},{0,NULL}}' : '{NULL,0,NULL,0}'
        const layout = multidimensional ? '[0:1][2:3]' : '[0:3]',
          array = layout + '=' + contents
        const reversed = `array_reverse(source::${type}[])`,
          name = `reverse_${index}_${multidimensional ? 'matrix' : 'vector'}`
        const first = multidimensional ? `(${reversed})[0][2]` : `(${reversed})[0]`,
          second = multidimensional ? `(${reversed})[0][3]` : `(${reversed})[1]`
        const sql = `array_dims(${reversed}) COLLATE "C" = expected_layout COLLATE "C" AND ${first} IS NOT NULL AND ${second} IS NULL AND cardinality(${reversed})=4`
        await expect(
          pg.query(
            `SELECT (${sql}) value FROM (SELECT $1::text source,$2::text expected_layout) q`,
            [array, layout],
          ),
        ).resolves.toMatchObject({ rows: [{ value: true }] })
        forms.push({ name, sql, type, array, layout })
        await pg.exec(`ALTER TABLE reverse_families ADD CONSTRAINT ${name} CHECK(${sql})`)
      }
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'reverse_families')!
    const plans = forms.flatMap((form) =>
      ['source', 'stored'].map((origin) => ({
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
              ? {
                  ...table.constraints.find((item) => item.name === form.name)!,
                  definition: `CHECK(${form.sql})`,
                }
              : table.constraints.find((item) => item.name === form.name)!,
            catalog.enums,
            catalog.domains,
            origin as 'source' | 'stored',
          )!.expression,
        ),
      })),
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const form of forms) {
      references.push({
        name: form.name,
        type: form.type,
        array: form.array,
        layout: form.layout,
        postgres: true,
      })
      for (const origin of ['source', 'stored']) {
        fixtures.push({
          name: form.name + '_' + origin,
          row: { source: known(form.array), expected_layout: known(form.layout) },
          expected: { kind: 'True' },
        })
        fixtures.push({
          name: form.name + '_' + origin,
          row: { source: known(form.array), expected_layout: known('[1:4]') },
          expected: { kind: 'False' },
        })
      }
    }
    expect(arrayScalarProfiles).toHaveLength(58)
    await mkdir('artifacts/array-reverse', { recursive: true })
    await writeFile(
      'artifacts/array-reverse/family-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-reverse/family-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    for (let offset = 0; offset < plans.length; offset += 64) {
      const batch = plans.slice(offset, offset + 64),
        group = prepareCheckRustGroup(batch, context)
      for (const [index, check] of group.checks.entries())
        expect(
          check.kind,
          batch[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
        ).toBe('supported')
      const names = batch.map((plan) => plan.identity.constraint),
        selected = new Set(names),
        scratch = await mkdtemp(join(directory, 'batch-'))
      await runCheckParity(
        scratch,
        'arrayreversefamilies',
        group,
        names,
        fixtures.filter((fixture) => selected.has(fixture.name)),
      )
      await rm(scratch, { recursive: true, force: true })
    }
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('keeps unknown cells in known reversed positions and owns nested snapshots', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-array-reverse-partial-'))
  try {
    const evaluatorSource =
        'pub fn evaluate_check()->CheckOutcome {let result=array_reverse_partial_probe();check_from_bool(result)}',
      source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.push({
        path: 'test/array_reverse.rs',
        source: String.raw`
pub fn array_reverse_partial_probe()->BoolValue {
 let mut builder=make_array_arguments("pg_catalog.int4",2);
 builder=append_array_dimension(builder,0,2);builder=append_array_dimension(builder,-2,2);
 builder=append_array_argument(builder,ArrayElement::Unknown);builder=append_array_argument(builder,array_element_from_int4(make_int4_value(1)));
 builder=append_array_argument(builder,ArrayElement::Null);builder=append_array_argument(builder,array_element_from_int4(make_int4_value(2)));
 let original=finish_array_arguments(builder);
 let reversed=sql__pg_catalog__array_reverse__iwk0(original.clone());
 if array_element_to_int4(array_flat_element(reversed.clone(),make_int4_value(0)))!=Int4Value::Null {return BoolValue::Value(false);};
 if array_element_to_int4(array_flat_element(reversed.clone(),make_int4_value(1)))!=make_int4_value(2) {return BoolValue::Value(false);};
 if array_element_to_int4(array_flat_element(reversed.clone(),make_int4_value(2)))!=Int4Value::Unknown {return BoolValue::Value(false);};
 if array_element_to_int4(array_flat_element(reversed.clone(),make_int4_value(3)))!=make_int4_value(1) {return BoolValue::Value(false);};
 if array_element_to_int4(array_flat_element(original,make_int4_value(1)))!=make_int4_value(1) {return BoolValue::Value(false);};
 if sql__pg_catalog__array_dims__01ex(reversed)!=make_text_value("[0:1][-2:-1]") {return BoolValue::Value(false);};
 let mut json_builder=make_array_arguments("pg_catalog.jsonb",12);
 json_builder=append_array_dimension(json_builder,1,2);
 json_builder=append_array_argument(json_builder,array_element_from_jsonb(make_jsonb_value("{\"a\":[1]}")));
 json_builder=append_array_argument(json_builder,array_element_from_jsonb(make_jsonb_value("{\"b\":[2]}")));
 let nested=finish_array_arguments(json_builder);let moved=sql__pg_catalog__array_reverse__iwk0(nested.clone());
 let before=array_element_to_jsonb(array_flat_element(nested,make_int4_value(0)));
 let after=array_element_to_jsonb(array_flat_element(moved,make_int4_value(0)));
 if jsonb_to_text(before)!=make_text_value("{\"a\": [1]}") {return BoolValue::Value(false);};
 if jsonb_to_text(after)!=make_text_value("{\"b\": [2]}") {return BoolValue::Value(false);};
 let unknown=sql__pg_catalog__array_reverse__iwk0(ArrayValue::Unknown);let plan=prepare_array_output(unknown);
 if plan.state!= -1 {return BoolValue::Value(false);};
 if array_is_null(sql__pg_catalog__array_reverse__iwk0(ArrayValue::Null))!=BoolValue::Value(true) {return BoolValue::Value(false);};
 let error=make_sql_error(3452547);let failed=sql__pg_catalog__array_reverse__iwk0(ArrayValue::Error(error));let failed_plan=prepare_array_output(failed);
 if failed_plan.state!= -2 || failed_plan.error!=error {return BoolValue::Value(false);};
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
    const fixtures = [{ name: 'partial', row: {}, expected: { kind: 'True' as const } }]
    await mkdir('artifacts/array-reverse', { recursive: true })
    await writeFile(
      'artifacts/array-reverse/partial-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await runCheckParity(directory, 'arrayreversepartial', group, ['partial'], fixtures)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)
