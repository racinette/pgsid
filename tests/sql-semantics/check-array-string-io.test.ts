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
const result = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})
const errorOutcome = (error: unknown): Outcome => ({
  kind: 'Error',
  value: { state: parseInt((error as { code: string }).code, 36) },
})
const context = { arrayNulls: true, defaultCollation: 'C', serverEncoding: 'UTF8' } as const

it('splits and joins raw/stored arrays with literal delimiters, NULL markers, Unicode, flattened bounds and lazy composition', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-string-io-shapes-'))
  try {
    await pg.exec(
      'CREATE TABLE string_io(source text,separator text,marker text,a text,expected text,bypass boolean);CREATE TABLE string_io_oracle(LIKE string_io)',
    )
    const forms = {
      split: 'string_to_array(source,separator)::text',
      marked_split: 'string_to_array(source,separator,marker)::text',
      joined: 'array_to_string(a::text[],separator)',
      marked_join: 'array_to_string(a::text[],separator,marker)',
      composed: 'array_to_string(string_to_array(source,separator,marker),separator,marker)',
      removed: "array_to_string(array_remove(string_to_array(source,separator,marker),NULL),'|')",
      trimmed: "array_to_string(trim_array(string_to_array(source,separator,marker),1),'|',marker)",
      guarded: "CASE WHEN bypass THEN 'safe' ELSE array_to_string(a::int[],separator,marker) END",
    }
    const sqlForms = Object.fromEntries(
      Object.entries(forms).map(([name, value]) => [
        name,
        `(${value}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`,
      ]),
    )
    for (const [name, sql] of Object.entries(sqlForms))
      await pg.exec(`ALTER TABLE string_io ADD CONSTRAINT ${name} CHECK(${sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'string_io')!
    const plans = Object.entries(sqlForms).flatMap(([name, sql]) =>
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
    )
    const group = prepareCheckRustGroup(plans, context)
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    expect(group.requiresRegex).toBe(false)
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    const sources = [null, '', 'a,,b,', 'aaa', '雪😊雪', 'NULL,a,NULL', '"a",{b},\\c', 'a\nb\na']
    const separators = [null, '', ',', 'aa', '雪', 'long absent delimiter', '\n']
    const markers = [null, '', 'NULL', '雪', 'a']
    const arrays = [
      null,
      '{}',
      '{NULL,NULL}',
      '{a,"",NULL,b}',
      '[0:1][2:3]={{a,NULL},{b,c}}',
      '{"NULL","a,b","a\\\\b","a\\"b"}',
      '{雪,😊}',
      'bad',
    ]
    for (const [name, sql] of Object.entries(sqlForms)) {
      const rows =
        name === 'joined' || name === 'marked_join' || name === 'guarded'
          ? arrays.flatMap((a) =>
              separators.flatMap((separator) =>
                (name === 'joined' ? [null] : markers).map((marker) => ({
                  source: null,
                  separator,
                  marker,
                  a,
                })),
              ),
            )
          : sources.flatMap((source) =>
              separators.flatMap((separator) =>
                (name === 'split' ? [null] : markers).map((marker) => ({
                  source,
                  separator,
                  marker,
                  a: null,
                })),
              ),
            )
      for (const values of rows) {
        let output: string | null = null
        try {
          output = (
            await pg.query<{ value: string | null }>(
              `SELECT (${forms[name as keyof typeof forms]}) value FROM (SELECT $1::text source,$2::text separator,$3::text marker,$4::text a,false bypass) q`,
              [values.source, values.separator, values.marker, values.a],
            )
          ).rows[0]!.value
        } catch {}
        await pg.exec('TRUNCATE string_io_oracle')
        await pg.query('INSERT INTO string_io_oracle VALUES($1,$2,$3,$4,$5,false)', [
          values.source,
          values.separator,
          values.marker,
          values.a,
          output,
        ])
        let expected: Outcome
        try {
          expected = result(
            (await pg.query<{ value: boolean | null }>(`SELECT ${sql} value FROM string_io_oracle`))
              .rows[0]!.value,
          )
        } catch (error) {
          expected = errorOutcome(error)
        }
        references.push({ name, ...values, output, expected })
        for (const origin of ['source', 'stored'])
          fixtures.push({
            name: name + '_' + origin,
            row: {
              source: known(values.source),
              separator: known(values.separator),
              marker: known(values.marker),
              a: known(values.a),
              expected: known(output),
              bypass: known(false),
            },
            expected,
          })
      }
    }
    for (const origin of ['source', 'stored']) {
      fixtures.push({
        name: 'guarded_' + origin,
        row: {
          bypass: known(true),
          a: known('bad'),
          separator: { kind: 'Unknown' },
          marker: { kind: 'Unknown' },
          expected: known('safe'),
        },
        expected: { kind: 'True' },
      })
      fixtures.push({
        name: 'split_' + origin,
        row: { source: known('a,b'), separator: known(','), expected: known('{wrong}') },
        expected: { kind: 'False' },
      })
    }
    await mkdir('artifacts/array-string-io', { recursive: true })
    await writeFile(
      'artifacts/array-string-io/shapes-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-string-io/shapes-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await writeFile('artifacts/array-string-io/shapes-evaluators.rs', group.evaluatorSource!)
    await runCheckParity(
      directory,
      'arraystringioshapes',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('joins every represented scalar and enum using the shared catalog output renderer and explicit formatting deferrals', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-string-io-families-'))
  try {
    await pg.exec(
      "SET TIME ZONE 'UTC';SET DateStyle='ISO, MDY';SET IntervalStyle='iso_8601';CREATE TYPE array_stage AS ENUM ('new','done');CREATE TABLE join_families(source text,separator text,marker text,expected text)",
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
    const forms: { name: string; sql: string; type: string; array: string; marked: boolean }[] = []
    for (const [index, [type, literal]] of arrayScalarProfiles.entries()) {
      const array = (
        await pg.query<{ value: string }>(
          `SELECT ARRAY[${literal}::${type},NULL::${type}]::text value`,
        )
      ).rows[0]!.value
      for (const marked of [false, true]) {
        const name = `join_${index}_${marked ? 'marker' : 'skip'}`
        const sql = `array_to_string(source::${type}[],separator${marked ? ',marker' : ''}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`
        forms.push({ name, sql, type, array, marked })
        await pg.exec(`ALTER TABLE join_families ADD CONSTRAINT ${name} CHECK(${sql})`)
      }
    }
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'join_families')!
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
      for (const [source, separator, marker] of [
        [form.array, '|', 'NULL'],
        [form.array, null, 'NULL'],
        ['{}', '|', 'NULL'],
        ['{NULL}', '|', 'NULL'],
        ['{NULL}', '|', ''],
        ['{NULL}', '|', null],
        [null, '|', 'NULL'],
      ] as const) {
        const output = (
          await pg.query<{ value: string | null }>(
            `SELECT array_to_string($1::${form.type}[],$2::text${form.marked ? ',$3::text' : ''}) value`,
            form.marked ? [source, separator, marker] : [source, separator],
          )
        ).rows[0]!.value
        const needsContext = source === form.array && separator !== null && deferred.has(form.type)
        references.push({
          name: form.name,
          type: form.type,
          source,
          separator,
          marker,
          output,
          deferral: needsContext ? 'element output requires execution context' : null,
        })
        for (const origin of ['source', 'stored'])
          fixtures.push({
            name: form.name + '_' + origin,
            row: {
              source: known(source),
              separator: known(separator),
              marker: known(marker),
              expected: known(output),
            },
            expected: { kind: needsContext ? 'Unknown' : 'True' },
          })
      }
      if (form.type.startsWith('reg')) {
        const output = (
          await pg.query<{ value: string }>(
            `SELECT array_to_string('{42}'::${form.type}[],'|') value`,
          )
        ).rows[0]!.value
        references.push({
          name: form.name,
          source: '{42}',
          output,
          deferral: 'catalog alias output requires deployment catalog access',
        })
        for (const origin of ['source', 'stored'])
          fixtures.push({
            name: form.name + '_' + origin,
            row: {
              source: known('{42}'),
              separator: known('|'),
              marker: known(null),
              expected: known(output),
            },
            expected: { kind: 'Unknown' },
          })
      }
    }
    expect(arrayScalarProfiles).toHaveLength(58)
    await mkdir('artifacts/array-string-io', { recursive: true })
    await writeFile(
      'artifacts/array-string-io/family-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-string-io/family-references.json',
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
        selected = new Set(names)
      const scratch = await mkdtemp(join(directory, 'batch-'))
      await runCheckParity(
        scratch,
        'arraystringiofamilies',
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

it('preserves partial cells and reached delimiter, marker, encoding and eager-error requirements in all targets', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-array-string-io-partial-'))
  try {
    const evaluatorSource =
        'pub fn evaluate_check()->CheckOutcome {let result=array_string_partial_probe();check_from_bool(result)}',
      source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.push({
        path: 'test/array_string_partial.rs',
        source: String.raw`
fn string_probe_join(cells:ArrayArguments,delimiter:TextValue,marker:TextValue)->TextValue {
 let input=array_string_finish(cells.clone(),2);
 sql__pg_catalog__array_to_string__prn2(input,cells,delimiter,marker)
}
pub fn array_string_partial_probe()->BoolValue {
 let first=make_sql_error(3452547);let second=make_sql_error(3452582);
 let split=sql__pg_catalog__string_to_array__umps(TextValue::Error(first),TextValue::Error(second),TextValue::Null,true,true);
 let failed=prepare_array_output(split);
 if failed.state!= -2 || failed.error!=first {return BoolValue::Value(false);};
 let null_error=sql__pg_catalog__string_to_array__umps(TextValue::Null,TextValue::Unknown,TextValue::Error(first),false,false);
 let null_error_plan=prepare_array_output(null_error);
 if null_error_plan.state!= -2 || null_error_plan.error!=first {return BoolValue::Value(false);};
 let empty=sql__pg_catalog__string_to_array__umps(make_text_value(""),TextValue::Unknown,TextValue::Unknown,false,false);
 if sql__pg_catalog__cardinality__m1rn(empty)!=make_int4_value(0) {return BoolValue::Value(false);};
 let partial=sql__pg_catalog__string_to_array__umps(make_text_value("a,b"),make_text_value(","),TextValue::Unknown,true,true);
 if sql__pg_catalog__cardinality__m1rn(partial)!=make_int4_value(2) {return BoolValue::Value(false);};
 let provider=sql__pg_catalog__string_to_array__umps(make_text_value("a"),make_text_value(""),make_text_value("a"),false,true);
 if sql__pg_catalog__cardinality__m1rn(provider)!=make_int4_value(1) {return BoolValue::Value(false);};
 let characters=sql__pg_catalog__string_to_array__yhwp(make_text_value("ab"),TextValue::Null,false,false);
 if sql__pg_catalog__cardinality__m1rn(characters)!=make_int4_value(2) {return BoolValue::Value(false);};
 let unicode=sql__pg_catalog__string_to_array__yhwp(make_text_value("雪"),TextValue::Null,true,false);
 let unicode_plan=prepare_array_output(unicode);
 if unicode_plan.state!= -1 {return BoolValue::Value(false);};
 let unicode_known=sql__pg_catalog__string_to_array__yhwp(make_text_value("雪😊"),TextValue::Null,false,true);
 if sql__pg_catalog__cardinality__m1rn(unicode_known)!=make_int4_value(2) {return BoolValue::Value(false);};
 let mut cells=make_array_arguments("pg_catalog.text",8);
 cells=append_array_argument(cells,ArrayElement::Null);
 cells=append_array_argument(cells,array_element_from_text(make_text_value("a")));
 if string_probe_join(cells.clone(),TextValue::Unknown,TextValue::Null)!=make_text_value("a") {return BoolValue::Value(false);};
 if string_probe_join(cells.clone(),make_text_value("|"),TextValue::Unknown)!=TextValue::Unknown {return BoolValue::Value(false);};
 if string_probe_join(cells.clone(),TextValue::Null,TextValue::Unknown)!=TextValue::Null {return BoolValue::Value(false);};
 if string_probe_join(cells,make_text_value("|"),TextValue::Error(first))!=TextValue::Error(first) {return BoolValue::Value(false);};
 let mut nulls=make_array_arguments("pg_catalog.text",8);
 nulls=append_array_argument(nulls,ArrayElement::Null);nulls=append_array_argument(nulls,ArrayElement::Null);
 if string_probe_join(nulls.clone(),TextValue::Unknown,TextValue::Null)!=make_text_value("") {return BoolValue::Value(false);};
 if string_probe_join(nulls,TextValue::Unknown,make_text_value(""))!=TextValue::Unknown {return BoolValue::Value(false);};
 let mut uncertain=make_array_arguments("pg_catalog.text",8);
 uncertain=append_array_argument(uncertain,ArrayElement::Unknown);uncertain=append_array_argument(uncertain,ArrayElement::Error(first));
 if string_probe_join(uncertain,make_text_value("|"),TextValue::Null)!=TextValue::Error(first) {return BoolValue::Value(false);};
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
    await mkdir('artifacts/array-string-io', { recursive: true })
    await writeFile(
      'artifacts/array-string-io/partial-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await runCheckParity(directory, 'arraystringiopartial', group, ['partial'], fixtures)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('preserves qualified enum rendering, strict states, preparation and reached collation requirements', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-string-io-context-'))
  try {
    await pg.exec(
      "CREATE SCHEMA io_first;CREATE SCHEMA io_second;CREATE TYPE io_first.stage AS ENUM ('new','done');CREATE TYPE io_second.stage AS ENUM ('done','new');CREATE TABLE io_context(source text,separator text,marker text,bypass boolean)",
    )
    const forms = {
      split_count: 'cardinality(string_to_array(source,separator,marker))>=0',
      split_values:
        "array_to_string(string_to_array(source,separator,marker),'|','missing') IS NOT NULL",
      split_c:
        'cardinality(string_to_array(source COLLATE "C",separator COLLATE "C",marker COLLATE "C"))>=0',
      joined: 'array_to_string(source::text[],separator,marker) IS NOT NULL',
      enum_first:
        "array_to_string(ARRAY['new'::io_first.stage,'done'::io_first.stage],'|') COLLATE \"C\"='new|done' COLLATE \"C\"",
      enum_second:
        "array_to_string(ARRAY['done'::io_second.stage,'new'::io_second.stage],'|') COLLATE \"C\"='done|new' COLLATE \"C\"",
      enum_inferred:
        "array_to_string(array_fill('done'::io_first.stage,ARRAY[2]),'|') COLLATE \"C\"='done|done' COLLATE \"C\"",
      enum_coalesce:
        "array_to_string(COALESCE(NULL::io_second.stage[],ARRAY['done'::io_second.stage]),'|') COLLATE \"C\"='done' COLLATE \"C\"",
      runtime_error:
        'CASE WHEN bypass THEN true ELSE array_to_string(source::int[],separator) IS NULL END',
      prepared_error:
        "CASE WHEN bypass THEN true ELSE array_to_string('{bad}'::int[],separator) IS NULL END",
      pruned: "CASE WHEN true THEN true ELSE array_to_string('{bad}'::int[],separator) IS NULL END",
      eager_error: 'array_to_string(NULL::int[],(1/0)::text) IS NULL',
      split_eager: 'string_to_array(NULL,(1/0)::text) IS NULL',
    }
    const catalog = await snapshotCatalog(pg),
      original = catalog.tables.find((item) => item.name === 'io_context')!
    const table = {
      ...original,
      columns: original.columns.map((column) =>
        column.name === 'bypass'
          ? column
          : {
              ...column,
              collationIsC: false,
              collationDeterministic: false,
              collationIsDefault: false,
            },
      ),
    }
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
    const group = prepareCheckRustGroup(plans, { arrayNulls: true, serverEncoding: 'UTF8' })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const [source, separator, marker] of [
      [null, ',', null],
      ['', null, null],
      ['ab', null, null],
      ['ab', '', null],
      ['ab', '', 'ab'],
      ['a,b', ',', null],
      ['{a,NULL}', '|', 'x'],
      ['bad', null, null],
    ] as const)
      for (const bypass of [false, true]) {
        await pg.exec('TRUNCATE io_context')
        await pg.query('INSERT INTO io_context VALUES($1,$2,$3,$4)', [
          source,
          separator,
          marker,
          bypass,
        ])
        for (const [name, sql] of Object.entries(forms)) {
          let expected: Outcome
          try {
            expected = result(
              (await pg.query<{ value: boolean | null }>(`SELECT ${sql} value FROM io_context`))
                .rows[0]!.value,
            )
          } catch (error) {
            expected = errorOutcome(error)
          }
          const portable = expected
          if (
            (name === 'split_count' || name === 'split_values') &&
            source !== null &&
            source !== '' &&
            separator !== null &&
            separator !== ''
          )
            expected = { kind: 'Unknown' }
          if (name === 'split_values' && source !== null && source !== '' && marker !== null)
            expected = { kind: 'Unknown' }
          references.push({ name, source, separator, marker, bypass, postgres: portable, expected })
          fixtures.push({
            name,
            row: {
              source: known(source),
              separator: known(separator),
              marker: known(marker),
              bypass: known(bypass),
            },
            expected,
          })
        }
      }
    for (const [name, row, expected] of [
      [
        'joined',
        { source: known('{}'), separator: { kind: 'Unknown' }, marker: { kind: 'Unknown' } },
        { kind: 'True' },
      ],
      [
        'joined',
        { source: known('{NULL}'), separator: { kind: 'Unknown' }, marker: known(null) },
        { kind: 'True' },
      ],
      [
        'joined',
        { source: known('{a}'), separator: { kind: 'Unknown' }, marker: { kind: 'Unknown' } },
        { kind: 'True' },
      ],
      [
        'joined',
        { source: { kind: 'Unknown' }, separator: known(null), marker: { kind: 'Unknown' } },
        { kind: 'False' },
      ],
      [
        'split_count',
        { source: known(''), separator: { kind: 'Unknown' }, marker: { kind: 'Unknown' } },
        { kind: 'True' },
      ],
      [
        'split_count',
        { source: known('ab'), separator: known(''), marker: { kind: 'Unknown' } },
        { kind: 'True' },
      ],
    ] as const)
      fixtures.push({ name, row, expected })
    await mkdir('artifacts/array-string-io', { recursive: true })
    await writeFile(
      'artifacts/array-string-io/context-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-string-io/context-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arraystringiocontext',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
