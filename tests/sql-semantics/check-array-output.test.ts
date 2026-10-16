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
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { runCheckParity, type Outcome, type Row } from '../../tools/check-rust/parity.js'

const known = (value: string | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }
const quote = (value: string) => "'" + value.replaceAll("'", "''") + "'"

it('outputs source and stored array casts with the catalog element representation, preserving pure values and explicit formatting deferrals', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-array-output-families-'))

  try {
    await pg.exec(
      "SET TIME ZONE 'UTC'; SET DateStyle='ISO, MDY'; SET IntervalStyle='iso_8601'; SET array_nulls=on; CREATE TYPE array_stage AS ENUM ('new','done'); CREATE TABLE output_values(source text, expected text)",
    )
    const deferred = new Set([
      'timestamp',
      'timestamptz',
      'date',
      'bytea',
      'interval',
      'point',
      'line',
      'lseg',
      'box',
      'path',
      'polygon',
      'circle',
      'money',
    ])
    const forms: {
      name: string
      sql: string
      type: string
      array: string
      value: string
      deferred: boolean
      runtime: boolean
    }[] = []
    for (const [index, [type, literal]] of arrayScalarProfiles.entries()) {
      const arraySql = `ARRAY[${literal}::${type},NULL::${type}]::${type}[]`
      const value = (await pg.query<{ value: string }>(`SELECT (${arraySql})::text AS value`))
        .rows[0]!.value
      for (const [kind, input] of [
        ['runtime', `source::${type}[]`],
        ['literal', `${quote(value)}::${type}[]`],
        ['constructor', arraySql],
      ] as const) {
        const name = `output_${index}_${kind}`
        const sql = `(${input})::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`
        if (type === 'regrole' && kind === 'constructor') {
          await expect(
            pg.exec(`ALTER TABLE output_values ADD CONSTRAINT ${name} CHECK (${sql})`),
          ).rejects.toMatchObject({
            code: '0A000',
            message: 'constant of the type regrole cannot be used here',
          })
          continue
        }
        forms.push({
          name,
          sql,
          type,
          array: value,
          value,
          deferred: deferred.has(type),
          runtime: kind === 'runtime',
        })
        await pg.exec(`ALTER TABLE output_values ADD CONSTRAINT ${name} CHECK (${sql})`)
      }
    }
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'output_values')!
    const plans = forms.flatMap((form) =>
      ['source', 'stored'].map((origin) => {
        const constraint = table.constraints.find((item) => item.name === form.name)!
        const name = form.name + '_' + origin
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
            constraint: name,
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
    expect(group.requiresRegex).toBe(true)
    expect(group.evaluatorSource).toContain('while array_output_has_element(&')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    for (const form of forms)
      for (const origin of ['source', 'stored']) {
        const name = form.name + '_' + origin
        const row: Row = { source: known(form.array), expected: known(form.value) }
        fixtures.push({ name, row, expected: { kind: form.deferred ? 'Unknown' : 'True' } })
        references.push({
          name,
          array: form.array,
          postgresOutput: form.value,
          deferral: form.deferred ? 'element output formatting requires unavailable context' : null,
        })
        if (!form.runtime) continue
        if (form.type.startsWith('reg')) {
          const value = (
            await pg.query<{ value: string }>(`SELECT $1::${form.type}[]::text AS value`, ['{42}'])
          ).rows[0]!.value
          references.push({
            name,
            array: '{42}',
            postgresOutput: value,
            deferral: 'catalog alias output requires deployment catalog access',
          })
          fixtures.push({
            name,
            row: { source: known('{42}'), expected: known(value) },
            expected: { kind: 'Unknown' },
          })
        }
        for (const [source, expected] of [
          ['{}', '{}'],
          ['{NULL}', '{NULL}'],
          [null, null],
        ] as const) {
          const value = (
            await pg.query<{ value: string | null }>(`SELECT $1::${form.type}[]::text AS value`, [
              source,
            ])
          ).rows[0]!.value
          expect(value).toBe(expected)
          references.push({ name, array: source, postgresOutput: value, deferral: null })
          fixtures.push({
            name,
            row: { source: known(source), expected: known(expected) },
            expected: { kind: 'True' },
          })
        }
        fixtures.push({
          name,
          row: { ...row, source: { kind: 'Unknown' } },
          expected: { kind: 'Unknown' },
        })
        fixtures.push({
          name,
          row: { ...row, source: { kind: 'Error', value: { state: parseInt('22012', 36) } } },
          expected: { kind: 'Error', value: { state: parseInt('22012', 36) } },
        })
        if (!form.deferred)
          fixtures.push({
            name,
            row: { ...row, expected: known('wrong output') },
            expected: { kind: 'False' },
          })
      }
    expect(arrayScalarProfiles).toHaveLength(58)
    await mkdir('artifacts/array-output', { recursive: true })
    await writeFile(
      'artifacts/array-output/family-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-output/family-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arrayoutputfamilies',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('matches array quoting, escaping, dimension prefixes and character-width casts while retaining lazy input errors', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-array-output-grammar-'))
  try {
    await pg.exec(
      'SET array_nulls=on; CREATE DOMAIN output_slots AS text[]; CREATE DOMAIN nested_output_slots AS output_slots; CREATE TABLE output_grammar(source text, expected text, bypass boolean)',
    )
    const expressions = {
      normal: '(source::text[])::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"',
      domain:
        '(source::nested_output_slots)::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"',
      varchar: '(source::text[])::varchar(5) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"',
      bpchar:
        '(source::text[])::character(20) COLLATE "C" IS NOT DISTINCT FROM expected::character(20) COLLATE "C"',
      lazy: 'CASE WHEN bypass THEN true ELSE (source::text[])::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END',
      coalesce:
        '(COALESCE(source::text[], ARRAY[NULL::text, \'NULL\'::text]))::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"',
    }
    for (const [name, sql] of Object.entries(expressions))
      await pg.exec(`ALTER TABLE output_grammar ADD CONSTRAINT ${name} CHECK (${sql})`)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'output_grammar')!
    const plans = Object.entries(expressions).flatMap(([name, sql]) =>
      ['source', 'stored'].map((origin) => {
        const constraint = table.constraints.find((item) => item.name === name)!
        const plan = lowerTableCheck(
          table,
          origin === 'source' ? { ...constraint, definition: `CHECK(${sql})` } : constraint,
          catalog.enums,
          catalog.domains,
          origin as 'source' | 'stored',
        )!
        return {
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: name + '_' + origin,
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
    const textValues = [
      '',
      'NULL',
      'null',
      'NuLl',
      'NULLx',
      'a,b',
      '{x}',
      '"',
      '\\',
      'a b',
      'a\tb',
      'a\nb',
      'a\rb',
      'a\vb',
      'a\fb',
      '雪😊',
      "O'Reilly",
      'a;b',
      '\u00a0',
      '\u2003',
    ]
    const samples: (string | null)[] = [
      '{}',
      '{NULL}',
      '{NULL,"NULL",""}',
      '[-2:-1][3:4]={{a,b},{c,d}}',
      '[-2147483648:-2147483647]={a,b}',
      '[2147483645:2147483646]={a,b}',
      '[1:1][1:1][1:1][1:1][1:1][1:1]={{{{{{a}}}}}}',
      null,
      '{bad,}',
    ]
    for (const value of textValues)
      samples.push(
        (
          await pg.query<{ value: string }>('SELECT ARRAY[$1::text,NULL,$1::text]::text AS value', [
            value,
          ])
        ).rows[0]!.value,
      )
    samples.push(
      (
        await pg.query<{ value: string }>(
          `SELECT ARRAY[ARRAY['a,b', 'NULL'], ARRAY[E'x\\ny', E'a\\\\b']]::text AS value`,
        )
      ).rows[0]!.value,
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    for (const source of samples) {
      let canonical: string | null = source
      try {
        canonical = (
          await pg.query<{ value: string | null }>('SELECT $1::text[]::text AS value', [source])
        ).rows[0]!.value
      } catch {}
      for (const [name, sql] of Object.entries(expressions))
        for (const bypass of [false, true]) {
          let expected: Outcome
          try {
            const value = (
              await pg.query<{ value: boolean | null }>(
                `SELECT (${sql}) AS value FROM (SELECT $1::text source,$2::text expected,$3::boolean bypass) args`,
                [source, canonical, bypass],
              )
            ).rows[0]!.value
            expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
          } catch (error) {
            expected = {
              kind: 'Error',
              value: { state: parseInt((error as { code: string }).code, 36) },
            }
          }
          references.push({ name, source, canonical, bypass, expected })
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: name + '_' + origin,
              row: {
                source: known(source),
                expected: known(canonical),
                bypass: { kind: 'Value', value: bypass },
              },
              expected,
            })
        }
    }
    fixtures.push({
      name: 'lazy_source',
      row: {
        source: { kind: 'Unknown' },
        expected: known(''),
        bypass: { kind: 'Value', value: true },
      },
      expected: { kind: 'True' },
    })
    fixtures.push({
      name: 'normal_stored',
      row: { source: { kind: 'Unknown' }, expected: known('') },
      expected: { kind: 'Unknown' },
    })
    await mkdir('artifacts/array-output', { recursive: true })
    await writeFile(
      'artifacts/array-output/grammar-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-output/grammar-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arrayoutputgrammar',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)

it('serializes already rendered box elements with semicolon delimiters and independently owns output payload snapshots', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-array-output-owned-'))
  try {
    const ownershipEntry = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'output_payload',
      constraint: 'ownership',
    })
    const evaluatorSource = `pub fn evaluate_check(source:TextValue,expected:TextValue)->CheckOutcome {let result=array_box_serializer_probe(source,expected);check_from_bool(result)}
pub fn ${ownershipEntry}()->CheckOutcome {let result=array_output_owner_probe();check_from_bool(result)}`
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.push({
        path: 'test/array_output.rs',
        source: String.raw`
pub fn array_box_serializer_probe(source:TextValue,expected:TextValue)->BoolValue {
 let plan=prepare_array_text(source,true,1);
 let mut builder=make_array_arguments("pg_catalog.text",8);
 let mut index=make_int4_value(0);
 while array_text_has_event(&plan,index) {
  let event=array_text_event_at(&plan,index);
  builder=append_array_argument(builder,array_element_from_text(event));
  index=array_text_next_index(index);
 }
 let saved=builder.clone();
 let array=finish_prepared_array_text(plan,builder);
 let payload=prepare_array_output(array);
 let actual=finish_array_output(payload,saved,true);
 if let TextValue::Error(error)=actual {return BoolValue::Error(error);};
 if let TextValue::Unknown=actual {return BoolValue::Unknown;};
 BoolValue::Value(actual==expected)
}
pub fn array_output_owner_probe()->BoolValue {
 let mut builder=make_array_arguments("pg_catalog.text",8);
 builder=append_array_dimension(builder,0,2);
 builder=append_array_argument(builder,array_element_from_text(make_text_value("a")));
 builder=append_array_argument(builder,array_element_from_text(make_text_value("b")));
 let input=finish_array_arguments(builder);
 let original=ArrayOutputPlan::Value(prepare_array_output(input));
 let copied=original.clone();
 if let ArrayOutputPlan::Value(payload)=copied {
  let mut dimensions=payload.dimensions;
  dimensions[0]=ArrayDimension{lower:-10,length:2};
  let mut elements=payload.elements;
  elements[0]=ArrayElement::Text("changed".to_owned());
  let altered=ArrayOutputPayload{state:payload.state,error:payload.error,dimensions:dimensions,elements:elements};
  if array_element_to_text(array_output_element_at(&altered,make_int4_value(0)))!=make_text_value("changed") {return BoolValue::Value(false);};
 };
 if let ArrayOutputPlan::Value(retained)=original {
  if retained.dimensions[0].lower!=0 {return BoolValue::Value(false);};
  if array_element_to_text(array_output_element_at(&retained,make_int4_value(0)))!=make_text_value("a") {return BoolValue::Value(false);};
 };
 BoolValue::Value(true)
}
`,
      })
    const inputs = ['source', 'expected'].map((name) => ({
      name,
      rustName: name,
      type: 'pg_catalog.text',
      rustType: 'TextValue',
    }))
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      source,
      evaluatorSource,
      requiresRegex: false,
      checks: [
        { kind: 'supported', entryName: 'evaluate_check', inputs },
        { kind: 'supported', entryName: ownershipEntry, inputs: [] },
      ],
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    for (const value of [
      '{}',
      '{NULL}',
      '{(1,2),(3,4);NULL}',
      '[-2:-1]={"(1,1),(0,0)";"(3,3),(2,2)"}',
      '[0:1][3:3]={{(1,1),(0,0)};{(3,3),(2,2)}}',
      '{(NaN,1),(2,3);(Infinity,2),(-Infinity,0)}',
    ]) {
      const canonical = (
        await pg.query<{ value: string }>('SELECT $1::box[]::text AS value', [value])
      ).rows[0]!.value
      references.push({ value, canonical })
      fixtures.push({
        name: 'serialization',
        row: { source: known(canonical), expected: known(canonical) },
        expected: { kind: 'True' },
      })
    }
    fixtures.push({ name: 'ownership', row: {}, expected: { kind: 'True' } })
    await mkdir('artifacts/array-output', { recursive: true })
    await writeFile(
      'artifacts/array-output/owned-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-output/owned-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arrayoutputowned',
      group,
      ['serialization', 'ownership'],
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)

it('retains float spellings that are independent of extra_float_digits and defers finite rendering that varies with that setting', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-array-output-float-'))
  try {
    await pg.exec('CREATE TABLE output_floats(source text, expected text)')
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'output_floats')!
    const plans = ['real', 'double precision'].map((type, index) => ({
      identity: {
        schema: 'public',
        kind: 'table' as const,
        owner: table.name,
        constraint: 'float_' + index,
      },
      expression: portableCheckAtoms(
        lowerTableCheck(
          table,
          {
            name: 'float_' + index,
            type: 'check',
            definition: `CHECK(source::${type}[]::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C")`,
          },
          [],
          [],
          'source',
        )!.expression,
      ),
    }))
    const group = prepareCheckRustGroup(plans, { arrayNulls: true, defaultCollation: 'C' })
    for (const check of group.checks) expect(check.kind).toBe('supported')
    expect(group.requiresRegex).toBe(false)
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: {
      type: string
      setting: number
      source: string
      output: string
      expected: Outcome
    }[] = []
    for (const [index, type] of ['real', 'double precision'].entries())
      for (const setting of [-15, -3, 0, 1, 3]) {
        await pg.exec('SET extra_float_digits=' + setting)
        for (const source of [
          '{NaN,Infinity,-Infinity,-0,0,1,-1,9,-9,NULL}',
          '{1.23456789012345,NULL}',
          '{}',
          '{NULL}',
        ]) {
          const output = (
            await pg.query<{ value: string }>(`SELECT $1::${type}[]::text AS value`, [source])
          ).rows[0]!.value
          const expected: Outcome = { kind: source.includes('1.2345') ? 'Unknown' : 'True' }
          references.push({ type, setting, source, output, expected })
          fixtures.push({
            name: 'float_' + index,
            row: { source: known(source), expected: known(output) },
            expected,
          })
        }
      }
    for (const type of ['real', 'double precision'])
      expect(
        new Set(
          references
            .filter((item) => item.type === type && item.expected.kind === 'Unknown')
            .map((item) => item.output),
        ).size,
      ).toBeGreaterThan(1)
    for (const name of ['float_0', 'float_1']) {
      fixtures.push({
        name,
        row: { source: { kind: 'Unknown' }, expected: known('') },
        expected: { kind: 'Unknown' },
      })
      fixtures.push({
        name,
        row: {
          source: { kind: 'Error', value: { state: parseInt('22012', 36) } },
          expected: known(''),
        },
        expected: { kind: 'Error', value: { state: parseInt('22012', 36) } },
      })
    }
    await mkdir('artifacts/array-output', { recursive: true })
    await writeFile(
      'artifacts/array-output/float-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-output/float-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arrayoutputfloat',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)
