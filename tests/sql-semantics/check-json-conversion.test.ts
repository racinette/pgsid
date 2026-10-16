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

it('converts scalar and nested arrays to raw JSON with exact numeric/text/source spellings, NULL distinctions, pretty outer layout and owned composition', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-json-conversion-shapes-'))
  try {
    await pg.exec(
      'CREATE DOMAIN json_slots AS integer[];CREATE TABLE json_conversions(payload text,pretty boolean,expected text,bypass boolean);CREATE TABLE json_conversion_oracle(LIKE json_conversions)',
    )
    const outputs: Record<string, string> = {}
    for (const type of [
      'integer',
      'text',
      'numeric',
      'json',
      'jsonb',
      'boolean',
      'real',
      'double precision',
    ]) {
      const key = type.replaceAll(' ', '_'),
        array = `payload::${type}[]`
      outputs['convert_' + key] = `to_json(${array})::text`
      outputs['array_' + key] = `array_to_json(${array})::text`
      outputs['pretty_' + key] = `array_to_json(${array},pretty)::text`
    }
    Object.assign(outputs, {
      domain: 'to_json(payload::json_slots)::text',
      scalar_json: 'to_json(payload::json)::text',
      scalar_text: 'to_json(payload)::text',
      scalar_float: 'to_json(payload::double precision)::text',
      scalar_binary: 'to_json(payload::jsonb)::text',
      binary_text: 'payload::jsonb::text',
      owned: "json_object(ARRAY['original',payload,'result',to_json(payload::json[])::text])::text",
      composed: 'json_strip_nulls(to_json(payload::json[]),true)::text',
      guarded:
        'CASE WHEN bypass THEN expected ELSE array_to_json(payload::json[],pretty)::text END',
    })
    const forms = Object.fromEntries(
      Object.entries(outputs).map(([name, sql]) => [
        name,
        `(${sql}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`,
      ]),
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE json_conversions ADD CONSTRAINT "${name}" CHECK(${sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'json_conversions')!,
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
              catalog.enums,
              catalog.domains,
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
    expect(group.requiresRegex).toBe(false)
    const values = [
      null,
      '{}',
      '{NULL}',
      '{1,NULL,2}',
      '{true,false,NULL}',
      '{1.2300,-0.000,NaN,Infinity,-Infinity}',
      '{-0,0,1,-9,2.5}',
      '{{1,2},{3,NULL}}',
      '[0:1][5:6]={{1,2},{3,NULL}}',
      '[1:1][1:1][1:1][1:1][1:1][0:1]={{{{{{1,2}}}}}}',
      arrayText(['  {"a":1,"a":2}  ', ' null ', '"\\u0000"', '"\\u96ea"', '1e999999', null]),
      arrayText(['', 'null', 'true', '雪😊', 'line\nvalue', '"\\']),
      'bad',
      '',
      '1.2300',
      '-0.000',
      '1e100',
      'NaN',
      'Infinity',
      '-Infinity',
      '-0',
      '0',
      '1',
      '2.5',
      ' null ',
      ' 1e999999 ',
      ' { "a":1,"a":2 } ',
      '"\\u0000"',
      '"\\ud800"',
      '"\\u96ea"',
      '{"é":1,"aa":2,"a":3,"雪":4,"😊":5,"aaa":6,"éa":7}',
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = [],
      add = (name: string, row: Row, expected: Outcome) => {
        for (const origin of ['source', 'stored'])
          fixtures.push({ name: name + '_' + origin, row, expected })
      }
    for (const payload of values)
      for (const pretty of [false, true, null])
        for (const [name, sql] of Object.entries(forms)) {
          await pg.exec('TRUNCATE json_conversion_oracle')
          await pg.query('INSERT INTO json_conversion_oracle VALUES($1,$2,NULL,false)', [
            payload,
            pretty,
          ])
          let output: string | null = null,
            expected: Outcome
          try {
            output = (
              await pg.query<{ value: string | null }>(
                `SELECT (${outputs[name]})::text value FROM json_conversion_oracle`,
              )
            ).rows[0]!.value
            await pg.query('UPDATE json_conversion_oracle SET expected=$1', [output])
            expected = {
              kind: (
                await pg.query<{ value: boolean }>(
                  `SELECT ${sql} value FROM json_conversion_oracle`,
                )
              ).rows[0]!.value
                ? 'True'
                : 'False',
            }
          } catch (cause) {
            expect(['22P02', '22P05', '22003']).toContain((cause as { code: string }).code)
            expected = errorOutcome(cause)
          }
          const deferred =
            expected.kind === 'True' &&
            ((name === 'scalar_float' && ['1.2300', '1e100', '2.5'].includes(payload ?? '')) ||
              (['{-0,0,1,-9,2.5}', '{1.2300,-0.000,NaN,Infinity,-Infinity}'].includes(
                payload ?? '',
              ) &&
                ([
                  'convert_real',
                  'array_real',
                  'convert_double_precision',
                  'array_double_precision',
                ].includes(name) ||
                  (['pretty_real', 'pretty_double_precision'].includes(name) && pretty !== null))))
          const row = {
            payload: known(payload),
            pretty: known(pretty),
            expected: known(output),
            bypass: known(false),
          }
          references.push({ name, payload, pretty, output, expected, deferred })
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
      { payload: known('bad'), pretty: known(true), bypass: known(true), expected: known('safe') },
      { kind: 'True' },
    )
    await mkdir('artifacts/json-conversion', { recursive: true })
    await writeFile(
      'artifacts/json-conversion/shapes-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/json-conversion/shapes-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonconversionshapes',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('converts every concrete scalar and enum profile with scalar output policies, nested array formatting and empty/NULL fast paths', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-json-conversion-families-'))
  try {
    await pg.exec(
      "CREATE TYPE array_stage AS ENUM ('new','done');CREATE TABLE json_family_inputs(expected text,marker boolean)",
    )
    const forms: { name: string; sql: string; output: string; type: string; form: string }[] = []
    for (const [index, [type, literal]] of arrayScalarProfiles.entries()) {
      const cell =
          type === 'regrole'
            ? '(CASE WHEN marker THEN 0::oid ELSE NULL::oid END)::regrole'
            : `${literal}::${type}`,
        array = `ARRAY[${cell},NULL::${type}]`
      for (const [form, output] of Object.entries({
        scalar: `to_json(${cell})::text`,
        array: `array_to_json(${array},true)::text`,
        empty: `to_json(ARRAY[]::${type}[])::text`,
        null_array: `array_to_json(NULL::${type}[])::text`,
      })) {
        const name = `family_${index}_${form}`,
          sql = `(${output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`
        forms.push({ name, sql, output, type, form })
        await pg.exec(`ALTER TABLE json_family_inputs ADD CONSTRAINT "${name}" CHECK(${sql})`)
      }
    }
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'json_family_inputs')!,
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
      deferred = new Set(['array_stage', 'timestamptz', 'bytea', 'interval', 'money'])
    for (const form of forms) {
      const output = (
          await pg.query<{ value: string | null }>(
            `SELECT (${form.output})::text value FROM (SELECT true marker) q`,
          )
        ).rows[0]!.value,
        expected: Outcome =
          deferred.has(form.type) && ['scalar', 'array'].includes(form.form)
            ? { kind: 'Unknown' }
            : { kind: 'True' }
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
    await mkdir('artifacts/json-conversion', { recursive: true })
    await writeFile(
      'artifacts/json-conversion/family-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/json-conversion/family-references.json',
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
        'jsonconversionfamilies',
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
