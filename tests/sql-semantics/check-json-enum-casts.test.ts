import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const input = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it('captures enum JSON categorization and preserves custom cast requirements, nested arrays, keys, errors and omitted metadata', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-json-enum-casts-'))
  try {
    await pg.exec(`CREATE TYPE plain_label AS ENUM('one','two');
      CREATE TYPE cast_label AS ENUM('one','two');
      CREATE FUNCTION label_json(cast_label) RETURNS json LANGUAGE SQL IMMUTABLE
        AS $$SELECT '{"custom":true}'::json$$;
      CREATE CAST(cast_label AS json) WITH FUNCTION label_json(cast_label);
      CREATE TYPE binary_label AS ENUM('one','two');
      CREATE FUNCTION label_jsonb(binary_label) RETURNS jsonb LANGUAGE SQL IMMUTABLE
        AS $$SELECT '{"binary":true}'::jsonb$$;
      CREATE CAST(binary_label AS jsonb) WITH FUNCTION label_jsonb(binary_label);
      CREATE DOMAIN cast_domain AS cast_label;
      CREATE DOMAIN cast_group AS cast_label[]`)
    const outputs: Record<string, string> = {
      plain_raw: 'to_json(plain)::text',
      plain_binary: 'to_jsonb(plain)::text',
      cast_raw: 'to_json(converted)::text',
      cast_binary: 'to_jsonb(converted)::text',
      binary_only: 'to_jsonb(binary_only)::text',
      cast_domain: 'to_jsonb(converted::cast_domain)::text',
      cast_array: 'to_jsonb(ARRAY[converted,NULL::cast_label])::text',
      cast_nested: 'to_jsonb(ARRAY[ARRAY[converted,NULL]::cast_group,NULL::cast_group])::text',
      cast_raw_array: 'array_to_json(ARRAY[converted,NULL])::text',
      cast_build_array: 'jsonb_build_array(converted,plain)::text',
      cast_object_value: `jsonb_build_object('item',converted)::text`,
      cast_raw_key: 'json_build_object(converted,1)::text',
      cast_binary_key: 'jsonb_build_object(converted,1)::text',
      cast_variadic_key: 'jsonb_build_object(VARIADIC ARRAY[converted,converted])::text',
      cast_raw_variadic_key: 'json_build_object(VARIADIC ARRAY[converted,converted])::text',
      eager_argument: 'jsonb_build_array(converted,1/divisor)::text',
      eager_key: 'jsonb_build_object(converted,1/divisor)::text',
    }
    const forms = Object.entries(outputs).map(([name, output]) => ({
      name,
      output,
      sql: `CASE WHEN bypass THEN true ELSE (${output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END`,
    }))
    for (const form of forms)
      await pg.exec(`CREATE TABLE enum_json_${form.name}(plain plain_label,converted cast_label,
        binary_only binary_label,divisor integer,expected text COLLATE "C",bypass boolean,
        CONSTRAINT matches CHECK(${form.sql}))`)
    const catalog = await snapshotCatalog(pg)
    expect(catalog.enums.find((item) => item.name === 'plain_label')!.jsonConversion).toBe('label')
    expect(catalog.enums.find((item) => item.name === 'cast_label')!.jsonConversion).toBe('cast')
    expect(catalog.enums.find((item) => item.name === 'binary_label')!.jsonConversion).toBe('label')
    const plans = forms.flatMap((form) => {
      const table = catalog.tables.find((item) => item.name === 'enum_json_' + form.name)!
      return (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: table.schema,
          kind: 'table' as const,
          owner: table.name,
          constraint: form.name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source'
              ? { name: 'matches', type: 'check', definition: `CHECK(${form.sql})` }
              : table.constraints[0]!,
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        ),
      }))
    })
    const omitCategory = (value: unknown): void => {
      if (!value || typeof value !== 'object') return
      const record = value as Record<string, unknown>
      delete record['jsonConversion']
      for (const child of Object.values(record)) omitCategory(child)
    }
    for (const origin of ['source', 'stored']) {
      const original = plans.find((plan) => plan.identity.constraint === 'plain_binary_' + origin)!
      const expression = structuredClone(original.expression)
      omitCategory(expression)
      plans.push({
        ...original,
        identity: { ...original.identity, constraint: 'missing_' + origin },
        expression,
      })
    }
    const group = prepareCheckRustGroup(plans, {
      arrayNulls: true,
      defaultCollation: 'C',
      defaultCtype: 'C.UTF-8',
      serverEncoding: 'UTF8',
    })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const scenarios = [
      { plain: 'one', converted: 'one', binary: 'two' },
      { plain: 'two', converted: 'two', binary: 'one' },
      { plain: null, converted: null, binary: null },
      { plain: null, converted: 'one', binary: null },
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    let inserts = 0
    const ordinal = (label: string | null): Input =>
      input(label === null ? null : label === 'one' ? 0 : 1)
    for (const form of forms)
      for (const scenario of scenarios)
        for (const divisor of form.name.startsWith('eager_') ? [1, 0] : [1]) {
          let output: string | null = null
          let failure: string | undefined
          try {
            output = (
              await pg.query<{ value: string | null }>(
                `WITH q AS MATERIALIZED (SELECT $1::plain_label plain,$2::cast_label converted,
                $3::binary_label binary_only,$4::integer divisor) SELECT (${form.output}) value FROM q`,
                [scenario.plain, scenario.converted, scenario.binary, divisor],
              )
            ).rows[0]!.value
          } catch (caught) {
            failure = (caught as { code: string }).code
            expect(['22023', '22004', '22012']).toContain(failure)
          }
          references.push({ form: form.name, scenario, divisor, output, failure })
          for (const bypass of [false, true])
            for (const wrong of [false, true]) {
              const expected = wrong ? '!wrong!' : output
              const accepted = bypass || (!failure && !wrong)
              const insert = pg.query(
                `INSERT INTO enum_json_${form.name} VALUES($1,$2,$3,$4,$5,$6)`,
                [scenario.plain, scenario.converted, scenario.binary, divisor, expected, bypass],
              )
              if (accepted) await insert
              else await expect(insert).rejects.toMatchObject({ code: failure ?? '23514' })
              inserts++
              const customValue =
                scenario.converted !== null &&
                (form.name.startsWith('cast_') || form.name === 'eager_argument')
              const result: Outcome = bypass
                ? { kind: 'True' }
                : failure
                  ? { kind: 'Error', value: { state: parseInt(failure, 36) } }
                  : customValue
                    ? { kind: 'Unknown' }
                    : { kind: wrong ? 'False' : 'True' }
              const row: Row = {
                plain: ordinal(scenario.plain),
                converted: ordinal(scenario.converted),
                binary_only: ordinal(scenario.binary),
                divisor: input(divisor),
                expected: input(expected),
                bypass: input(bypass),
              }
              for (const origin of ['source', 'stored']) {
                fixtures.push({ name: form.name + '_' + origin, row, expected: result })
                if (form.name === 'plain_binary')
                  fixtures.push({
                    name: 'missing_' + origin,
                    row,
                    expected: !bypass && scenario.plain !== null ? { kind: 'Unknown' } : result,
                  })
              }
            }
        }
    expect(inserts).toBe(304)
    expect(fixtures).toHaveLength(640)
    await mkdir('artifacts/json-enum-casts', { recursive: true })
    await writeFile(
      'artifacts/json-enum-casts/report.json',
      JSON.stringify({ inserts, fixtures: fixtures.length, references }, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonenumcasts',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
