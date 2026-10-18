import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { runCheckParity, type Outcome, type Row } from '../../tools/check-rust/parity.js'
import { arrayScalarProfiles } from './check-array-fixtures.js'
const known = (value: string | number | boolean | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }
const errorOutcome = (cause: unknown): Outcome => ({
  kind: 'Error',
  value: { state: parseInt((cause as { code: string }).code, 36) },
})
const context = { arrayNulls: true, defaultCollation: 'C', serverEncoding: 'UTF8' } as const
const arrayText = (values: (string | null)[]) =>
  '{' +
  values
    .map((value) =>
      value === null ? 'NULL' : '"' + value.replaceAll('\\', '\\\\').replaceAll('"', '\\"') + '"',
    )
    .join(',') +
  '}'

it('builds heterogeneous raw JSON arrays and objects with duplicate order, source spelling, scalar keys, ordinary and VARIADIC arrays, eager errors and lazy composition', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-json-builders-shapes-'))
  try {
    await pg.exec(
      'CREATE TABLE raw_builders(label text,number numeric,flag boolean,document json,binary_document jsonb,first text,second text,payload text,expected text,bypass boolean,divisor integer);CREATE TABLE raw_builder_oracle(LIKE raw_builders)',
    )
    const outputs: Record<string, string> = {
      empty_array: 'json_build_array()::text',
      empty_object: 'json_build_object()::text',
      literal: "json_build_array('1',1,NULL,'null',NULL::integer)::text",
      mixed: 'json_build_array(label,number,flag,document,binary_document,NULL)::text',
      object:
        "json_build_object('label',label,'number',number,'flag',flag,'document',document,'binary',binary_document)::text",
      duplicate: 'json_build_object(first,1,second,2)::text',
      scalar_keys: 'json_build_object(flag,label,number,document)::text',
      json_key: 'json_build_object(document,label)::text',
      binary_key: 'json_build_object(binary_document,label)::text',
      odd: 'json_build_object(label,document,number)::text',
      eager: 'json_build_object(NULL::text,document,1/divisor)::text',
      array_eager: 'json_build_array(payload::json[],1/divisor)::text',
      object_eager: 'json_build_object(payload::json[],1/divisor)::text',
      guarded: 'CASE WHEN bypass THEN expected ELSE json_build_array(payload::json[])::text END',
      composed: "json_strip_nulls(json_build_object('document',document,'other',NULL),true)::text",
      retained:
        "json_object(ARRAY['before',document::text,'after',json_build_array(document)::text])::text",
    }
    for (const type of [
      'integer',
      'text',
      'numeric',
      'json',
      'jsonb',
      'boolean',
      'double precision',
    ]) {
      const key = type.replaceAll(' ', '_'),
        array = `payload::${type}[]`
      outputs['nested_' + key] = `json_build_array(${array},NULL,${array})::text`
      outputs['flattened_' + key] = `json_build_array(VARIADIC ${array})::text`
      outputs['object_' + key] = `json_build_object(VARIADIC ${array})::text`
      outputs['key_' + key] = `json_build_object(${array},1)::text`
    }
    const forms = Object.fromEntries(
      Object.entries(outputs).map(([name, sql]) => [
        name,
        `(${sql}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`,
      ]),
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE raw_builders ADD CONSTRAINT "${name}" CHECK(${sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'raw_builders')!,
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
    const scalarRows = [
      {
        label: null,
        number: null,
        flag: null,
        document: null,
        binary_document: null,
        first: null,
        second: null,
      },
      {
        label: '雪😊',
        number: '1.2300',
        flag: true,
        document: ' { "a":1,"a":2 } ',
        binary_document: '{"é":1,"aa":2,"a":3}',
        first: 'a',
        second: 'a',
      },
      {
        label: '"\\\n\t',
        number: '-0.000',
        flag: false,
        document: '"\\u0000"',
        binary_document: 'null',
        first: '雪',
        second: '😊',
      },
      {
        label: 'null',
        number: 'NaN',
        flag: true,
        document: '1e999999',
        binary_document: '1.2300',
        first: '',
        second: 'a',
      },
    ]
    const payloads = [
      null,
      '{}',
      '{NULL}',
      '{1,2}',
      '{1,NULL,2}',
      '{a,1,a,2}',
      '{true,false}',
      '{-0,0,1,-9}',
      '{1.2300,2.5}',
      '{{1,2},{3,4}}',
      '[0:3]={1,2,3,4}',
      arrayText([' { "a":1,"a":2 } ', '"\\u0000"', '"\\u96ea"', null]),
      'bad',
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = [],
      add = (name: string, row: Row, expected: Outcome) => {
        for (const origin of ['source', 'stored'])
          fixtures.push({ name: name + '_' + origin, row, expected })
      }
    for (const scalar of scalarRows)
      for (const payload of payloads)
        for (const divisor of [0, 1])
          for (const [name, sql] of Object.entries(forms)) {
            await pg.exec('TRUNCATE raw_builder_oracle')
            await pg.query(
              'INSERT INTO raw_builder_oracle VALUES($1,$2,$3,$4,$5,$6,$7,$8,NULL,false,$9)',
              [
                scalar.label,
                scalar.number,
                scalar.flag,
                scalar.document,
                scalar.binary_document,
                scalar.first,
                scalar.second,
                payload,
                divisor,
              ],
            )
            let output: string | null = null,
              expected: Outcome
            try {
              output = (
                await pg.query<{ value: string | null }>(
                  `SELECT (${outputs[name]})::text value FROM raw_builder_oracle`,
                )
              ).rows[0]!.value
              await pg.query('UPDATE raw_builder_oracle SET expected=$1', [output])
              expected = {
                kind: (
                  await pg.query<{ value: boolean }>(`SELECT ${sql} value FROM raw_builder_oracle`)
                ).rows[0]!.value
                  ? 'True'
                  : 'False',
              }
            } catch (cause) {
              expect(['22023', '22004', '22012', '22003', '22P02', '22P05']).toContain(
                (cause as { code: string }).code,
              )
              expected = errorOutcome(cause)
            }
            const deferred =
              expected.kind === 'True' &&
              payload === '{1.2300,2.5}' &&
              [
                'nested_double_precision',
                'flattened_double_precision',
                'object_double_precision',
              ].includes(name)
            const row = {
              ...Object.fromEntries(
                Object.entries(scalar).map(([key, value]) => [key, known(value)]),
              ),
              payload: known(payload),
              divisor: known(divisor),
              expected: known(output),
              bypass: known(false),
            }
            references.push({ name, ...scalar, payload, divisor, output, expected, deferred })
            add(name, row, deferred ? { kind: 'Unknown' } : expected)
            if (expected.kind === 'True')
              add(
                name,
                { ...row, expected: known('wrong') },
                deferred ? { kind: 'Unknown' } : { kind: 'False' },
              )
          }
    add(
      'guarded',
      { payload: known('bad'), bypass: known(true), expected: known('safe') },
      { kind: 'True' },
    )
    await mkdir('artifacts/json-builders', { recursive: true })
    await writeFile(
      'artifacts/json-builders/shapes-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/json-builders/shapes-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonbuildersshapes',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)

it('builds every concrete scalar and enum profile through ordinary and VARIADIC arrays while preserving context requirements and exact empty/NULL distinctions', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-json-builders-families-'))
  try {
    await pg.exec(
      "CREATE TYPE array_stage AS ENUM ('new','done');CREATE TABLE raw_builder_families(expected text,marker boolean)",
    )
    const forms: { name: string; sql: string; output: string; type: string; form: string }[] = []
    for (const [index, [type, literal]] of arrayScalarProfiles.entries()) {
      const cell =
          type === 'regrole'
            ? '(CASE WHEN marker THEN 0::oid ELSE NULL::oid END)::regrole'
            : `${literal}::${type}`,
        array = `ARRAY[${cell},NULL::${type}]`
      for (const [form, output] of Object.entries({
        array: `json_build_array(${cell})::text`,
        object: `json_build_object(${cell},1)::text`,
        nested: `json_build_array(${array})::text`,
        flattened: `json_build_array(VARIADIC ${array})::text`,
        empty: `json_build_object(VARIADIC ARRAY[]::${type}[])::text`,
        null_array: `json_build_array(VARIADIC NULL::${type}[])::text`,
      })) {
        const name = `family_${index}_${form}`,
          sql = `(${output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`
        forms.push({ name, sql, output, type, form })
        await pg.exec(`ALTER TABLE raw_builder_families ADD CONSTRAINT "${name}" CHECK(${sql})`)
      }
    }
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'raw_builder_families')!,
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
          deferred.has(form.type) && !['empty', 'null_array'].includes(form.form)
            ? { kind: 'Unknown' }
            : { kind: 'True' }
      } catch (cause) {
        expect((cause as { code: string }).code).toBe('22023')
        expected = errorOutcome(cause)
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
            row: { expected: known('wrong'), marker: known(true) },
            expected: { kind: 'False' },
          })
      }
    }
    expect(arrayScalarProfiles).toHaveLength(58)
    await mkdir('artifacts/json-builders', { recursive: true })
    await writeFile(
      'artifacts/json-builders/family-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/json-builders/family-references.json',
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
        'jsonbuildersfamilies',
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
