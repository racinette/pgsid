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

const known = (value: string | number | boolean | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }
const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})
const errorOutcome = (error: unknown): Outcome => ({
  kind: 'Error',
  value: { state: parseInt((error as { code: string }).code, 36) },
})
const context = { arrayNulls: true, defaultCollation: 'C', serverEncoding: 'UTF8' } as const

it('converts nested arrays and flattened explicit VARIADIC arguments with NULL distinctions, scalar keys and eager errors in every target', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-arrays-shapes-'))
  try {
    await pg.exec(
      'CREATE TABLE jsonb_arrays(a text,expected jsonb,bypass boolean,divisor integer);CREATE TABLE jsonb_array_oracle(LIKE jsonb_arrays)',
    )
    const outputs: Record<string, string> = {}
    for (const type of ['int', 'text', 'numeric', 'json', 'jsonb', 'float8']) {
      outputs['convert_' + type] = `to_jsonb(a::${type}[])`
      outputs['nested_' + type] = `jsonb_build_array(a::${type}[],NULL,a::${type}[])`
      outputs['flattened_' + type] = `jsonb_build_array(VARIADIC a::${type}[])`
      outputs['object_' + type] = `jsonb_build_object(VARIADIC a::${type}[])`
    }
    Object.assign(outputs, {
      ordinary_key: 'jsonb_build_object(a::json[],1)',
      eager_key: 'jsonb_build_object(a::json[],1/divisor)',
      eager_value: 'jsonb_build_array(a::json[],1/divisor)',
      guarded: "CASE WHEN bypass THEN '[]'::jsonb ELSE to_jsonb(a::json[]) END",
      partial: 'to_jsonb(ARRAY[divisor,NULL,divisor])',
      partial_variadic: 'jsonb_build_array(VARIADIC ARRAY[divisor,NULL,divisor])',
    })
    const forms = Object.fromEntries(
      Object.entries(outputs).map(([name, sql]) => [
        name,
        `(${sql}) IS NOT DISTINCT FROM expected`,
      ]),
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE jsonb_arrays ADD CONSTRAINT ${name} CHECK(${sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'jsonb_arrays')!,
      plans = Object.entries(forms).flatMap(([name, sql]) =>
        ['source', 'stored'].map((origin) => ({
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
                ? {
                    ...table.constraints.find((item) => item.name === name)!,
                    definition: `CHECK(${sql})`,
                  }
                : table.constraints.find((item) => item.name === name)!,
              [],
              [],
              origin as 'source' | 'stored',
            )!.expression,
          ),
        })),
      ),
      group = prepareCheckRustGroup(plans, context)
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = [],
      add = (name: string, row: Row, expected: Outcome) => {
        for (const origin of ['source', 'stored'])
          fixtures.push({ name: name + '_' + origin, row, expected })
      }
    for (const [name, sql] of Object.entries(forms)) {
      const samples =
        name.includes('json') ||
        name.includes('key') ||
        name.includes('value') ||
        name === 'guarded'
          ? [
              null,
              '{}',
              '{NULL}',
              '{1,2}',
              '{{1,NULL},{2,3}}',
              String.raw`{"{\"a\":1}","[1,null]"}`,
              String.raw`{"\"\\u0000\"",1}`,
              'bad',
            ]
          : [
              null,
              '{}',
              '{NULL}',
              '{1,2}',
              '{1,NULL,2,NULL}',
              '[0:1][3:4]={{1,NULL},{2,3}}',
              '{{{1,2}},{{3,4}}}',
              '{{{{{{1}}}}}}',
              '{1,2,3}',
              'bad',
            ]
      for (const a of samples)
        for (const divisor of [0, 1]) {
          await pg.exec('TRUNCATE jsonb_array_oracle')
          await pg.query('INSERT INTO jsonb_array_oracle VALUES($1,NULL,false,$2)', [a, divisor])
          let output: string | null = null,
            expected: Outcome
          try {
            output = (
              await pg.query<{ value: string | null }>(
                `SELECT (${outputs[name]})::text value FROM jsonb_array_oracle`,
              )
            ).rows[0]!.value
            await pg.query('UPDATE jsonb_array_oracle SET expected=$1', [output])
            expected = outcome(
              (await pg.query<{ value: boolean }>(`SELECT ${sql} value FROM jsonb_array_oracle`))
                .rows[0]!.value,
            )
          } catch (error) {
            expect(['22P02', '22P05', '22023', '22012']).toContain((error as { code: string }).code)
            expected = errorOutcome(error)
          }
          const row = {
            a: known(a),
            divisor: known(divisor),
            bypass: known(false),
            expected: known(output),
          }
          references.push({ name, a, divisor, output, expected })
          add(name, row, expected)
          if (expected.kind === 'True')
            add(name, { ...row, expected: known('["wrong"]') }, { kind: 'False' })
        }
    }
    add(
      'partial',
      { divisor: { kind: 'Unknown' }, expected: known('[1,null,1]') },
      { kind: 'Unknown' },
    )
    add(
      'partial_variadic',
      { divisor: { kind: 'Unknown' }, expected: known('[1,null,1]') },
      { kind: 'Unknown' },
    )
    add(
      'guarded',
      { a: known('bad'), divisor: known(0), bypass: known(true), expected: known('[]') },
      { kind: 'True' },
    )
    const error = { kind: 'Error' as const, value: { state: parseInt('22003', 36) } }
    add('convert_int', { a: error, expected: known(null) }, error)
    add('flattened_int', { a: { kind: 'Unknown' }, expected: known('[]') }, { kind: 'Unknown' })
    await mkdir('artifacts/jsonb-arrays', { recursive: true })
    await writeFile(
      'artifacts/jsonb-arrays/shapes-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/jsonb-arrays/shapes-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonbarraysshapes',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('converts every concrete scalar/enum array profile and preserves empty/NULL fast paths and scalar context requirements', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-arrays-families-'))
  try {
    await pg.exec(
      "CREATE TYPE array_stage AS ENUM ('new','done');CREATE TABLE jsonb_array_families(expected jsonb,marker boolean)",
    )
    const forms: { name: string; sql: string; output: string; type: string; form: string }[] = []
    for (const [index, [type, literal]] of arrayScalarProfiles.entries()) {
      const cell =
          type === 'regrole'
            ? '(CASE WHEN marker THEN 0::oid ELSE NULL::oid END)::regrole'
            : `${literal}::${type}`,
        array = `ARRAY[${cell},NULL::${type}]`
      for (const [form, output] of Object.entries({
        value: `to_jsonb(${array})`,
        object: `jsonb_build_object(VARIADIC ${array})`,
        empty: `jsonb_build_array(VARIADIC ARRAY[]::${type}[])`,
        null_array: `jsonb_build_array(VARIADIC NULL::${type}[])`,
      })) {
        const name = `family_${index}_${form}`,
          sql = `(${output}) IS NOT DISTINCT FROM expected`
        forms.push({ name, sql, output, type, form })
        await pg.exec(`ALTER TABLE jsonb_array_families ADD CONSTRAINT ${name} CHECK(${sql})`)
      }
    }
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'jsonb_array_families')!,
      plans = forms.flatMap(({ name, sql }) =>
        ['source', 'stored'].map((origin) => ({
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
                ? {
                    ...table.constraints.find((item) => item.name === name)!,
                    definition: `CHECK(${sql})`,
                  }
                : table.constraints.find((item) => item.name === name)!,
              catalog.enums,
              catalog.domains,
              origin as 'source' | 'stored',
            )!.expression,
          ),
        })),
      ),
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = [],
      deferred = new Set(['timestamptz', 'bytea', 'interval', 'money'])
    for (const form of forms) {
      let output: string | null = null,
        expected: Outcome
      try {
        output = (
          await pg.query<{ value: string | null }>(
            `SELECT (${form.output})::text value FROM (SELECT true marker) q`,
          )
        ).rows[0]!.value
        expected =
          deferred.has(form.type) && ['value', 'object'].includes(form.form)
            ? { kind: 'Unknown' }
            : { kind: 'True' }
      } catch (error) {
        expect((error as { code: string }).code).toBe('22023')
        expected = errorOutcome(error)
      }
      references.push({ name: form.name, type: form.type, output, expected })
      for (const origin of ['source', 'stored']) {
        fixtures.push({
          name: form.name + '_' + origin,
          row: { expected: known(output), marker: known(true) },
          expected,
        })
        if (expected.kind === 'True')
          fixtures.push({
            name: form.name + '_' + origin,
            row: { expected: known('["wrong"]'), marker: known(true) },
            expected: { kind: 'False' },
          })
      }
    }
    expect(arrayScalarProfiles).toHaveLength(58)
    await mkdir('artifacts/jsonb-arrays', { recursive: true })
    await writeFile(
      'artifacts/jsonb-arrays/family-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/jsonb-arrays/family-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    for (let offset = 0; offset < plans.length; offset += 64) {
      const batch = plans.slice(offset, offset + 64),
        group = prepareCheckRustGroup(batch, context),
        names = batch.map((plan) => plan.identity.constraint),
        selected = new Set(names),
        scratch = await mkdtemp(join(directory, 'batch-'))
      for (const [index, check] of group.checks.entries())
        expect(check.kind, names[index] + ('reason' in check ? ':' + check.reason : '')).toBe(
          'supported',
        )
      await runCheckParity(
        scratch,
        'jsonbarraysfamilies',
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
}, 600_000)

it('transfers large conversion cursors without per-cell buffer copies and preserves explicit snapshots', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-arrays-owned-'))
  try {
    const observed = (
      await pg.query<{ value: boolean }>(
        "SELECT jsonb_array_length(jsonb_build_array(VARIADIC array_fill('held'::text,ARRAY[50000])))=50000 value",
      )
    ).rows[0]!.value
    expect(observed).toBe(true)
    const evaluatorSource =
        'pub fn evaluate_check()->CheckOutcome {let result=jsonb_array_owned_probe();check_from_bool(result)}',
      source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.push({
        path: 'test/jsonb_array_owned.rs',
        source: String.raw`
pub fn jsonb_array_owned_probe()->BoolValue {
 let mut cells:Vec<ArrayElement>=Vec::new();let mut index:i32=0;
 while index<50000 {cells.push(ArrayElement::Text("held".to_owned()));index=index+1;}
 let mut dimensions:Vec<ArrayDimension>=Vec::new();dimensions.push(ArrayDimension {lower:-2,length:50000});
 let input=make_array_value(ArrayPayload {element_type:"pg_catalog.text".to_owned(),element_kind:8,dimensions:dimensions,elements:cells,null_bitmap:BoolValue::Unknown});
 let initial=prepare_jsonb_array_input(input);let original=initial.clone();let mut cursor=initial;
 while jsonb_array_input_continues(&cursor) {
  let element=jsonb_array_input_element(&cursor);let text=array_element_to_text(element);let converted=jsonb_input_from_text(text);
  cursor=append_jsonb_array_input(cursor,converted);
 }
 if original.values.len()!=0 || original.position!=0 || cursor.values.len()!=50000 || cursor.position!=50000 {return BoolValue::Value(false);};
 if array_element_to_text(original.elements[49999].clone())!=make_text_value("held") {return BoolValue::Value(false);};
 let converted=jsonb_array_input_value(cursor);
 if sql__pg_catalog__jsonb_array_length__1gng(converted)!=make_int4_value(50000) {return BoolValue::Value(false);};
 BoolValue::Value(true)
}
`,
      })
    const group: ReturnType<typeof prepareCheckRustGroup> = {
        source,
        evaluatorSource,
        requiresRegex: false,
        checks: [{ kind: 'supported', entryName: 'evaluate_check', inputs: [] }],
      },
      fixtures = [{ name: 'owned', row: {}, expected: { kind: 'True' as const } }]
    await mkdir('artifacts/jsonb-arrays', { recursive: true })
    await writeFile(
      'artifacts/jsonb-arrays/owned-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/jsonb-arrays/owned-references.json',
      JSON.stringify(
        [
          {
            operation: 'jsonb_build_array VARIADIC array_fill',
            cells: 50000,
            lower: -2,
            expected: observed,
          },
        ],
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(directory, 'jsonbarraysowned', group, ['owned'], fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 120_000)
