import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { customRangeProfiles } from './check-custom-range-fixtures.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import { rangeArrayText, readRangeArrayFixture } from './check-range-array-fixtures.js'
import { readMultirangeArrayFixture } from './check-multirange-array-fixtures.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const cell = (value: string | boolean | number | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it('defers reached custom range JSON casts while retaining NULL skips, scalar-key errors, array roles and eager errors', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-custom-range-json-casts-'))
  try {
    await pg.exec(`CREATE TYPE json_span AS RANGE(subtype=int4,multirange_type_name=json_set);
      CREATE FUNCTION range_json(json_span) RETURNS json LANGUAGE plpgsql IMMUTABLE AS $$
      BEGIN
        IF $1 IS NULL THEN RAISE EXCEPTION 'NULL cast reached' USING ERRCODE='22000'; END IF;
        RETURN '{"cast":"range"}'::json;
      END $$;
      CREATE FUNCTION range_json(json_set) RETURNS json LANGUAGE plpgsql IMMUTABLE AS $$
      BEGIN
        IF $1 IS NULL THEN RAISE EXCEPTION 'NULL cast reached' USING ERRCODE='22000'; END IF;
        RETURN '{"cast":"multi"}'::json;
      END $$;
      CREATE CAST(json_span AS json) WITH FUNCTION range_json(json_span);
      CREATE CAST(json_set AS json) WITH FUNCTION range_json(json_set);
      CREATE DOMAIN json_span_domain AS json_span;
      CREATE DOMAIN json_set_domain AS json_set;
      CREATE DOMAIN json_span_list AS json_span[];
      CREATE DOMAIN json_set_list AS json_set[];`)
    const profile = customRangeProfiles(await snapshotCatalog(pg))[0]!
    const families = [false, true].map((multi) => ({
      multi,
      type: multi ? profile.multirange : profile.identity,
      tag: multi ? 'set' : 'span',
      domain: multi ? 'json_set_domain' : 'json_span_domain',
      list: multi ? 'json_set_list' : 'json_span_list',
    }))
    const forms = families.flatMap((family) =>
      [
        ['raw', 'to_json(payload)::text', 'scalar'],
        ['binary', 'to_jsonb(payload)::text', 'scalar'],
        ['domain', `to_jsonb(payload::${family.domain})::text`, 'scalar'],
        ['array', 'array_to_json(items,true)::text', 'array'],
        ['binary_array', 'to_jsonb(items)::text', 'array'],
        ['nested', `to_jsonb(ARRAY[items::${family.list},NULL::${family.list}])::text`, 'array'],
        ['build', 'jsonb_build_array(payload,items)::text', 'either'],
        ['object_value', `jsonb_build_object('item',payload)::text`, 'scalar'],
        ['raw_key', 'json_build_object(payload,1)::text', 'key'],
        ['binary_key', 'jsonb_build_object(payload,1)::text', 'key'],
        ['variadic_array', 'jsonb_build_array(VARIADIC items)::text', 'array'],
        ['raw_variadic_object', 'json_build_object(VARIADIC items)::text', 'array_key'],
        ['variadic_object', 'jsonb_build_object(VARIADIC items)::text', 'array_key'],
        ['eager_argument', 'jsonb_build_array(payload,1/divisor)::text', 'scalar'],
        ['eager_key', 'jsonb_build_object(payload,1/divisor)::text', 'key'],
        ['later_null_key', `jsonb_build_object('first',payload,NULL,1)::text`, 'later_key'],
        ['earlier_null_key', `jsonb_build_object(NULL,1,'later',payload)::text`, 'earlier_key'],
      ].map(([name, output, source]) => ({
        ...family,
        name: name!,
        output: output!,
        source: source!,
        table: `custom_json_${family.tag}_${name}`,
        sql: `CASE WHEN bypass THEN true ELSE (${output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END`,
      })),
    )
    for (const form of forms)
      await pg.exec(`CREATE TABLE ${form.table}(payload ${form.type},items ${form.type}[],divisor int4,
        expected text,bypass boolean,CONSTRAINT matches CHECK(${form.sql}))`)
    const catalog = await snapshotCatalog(pg)
    const plans = forms.flatMap((form) => {
      const table = catalog.tables.find((table) => table.name === form.table)!
      return (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: form.table,
          constraint: origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source'
              ? { ...table.constraints[0]!, definition: `CHECK(${form.sql})` }
              : table.constraints[0]!,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
          )!.expression,
        ),
      }))
    })
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    for (const [index, check] of group.checks.entries())
      expect(check.kind, plans[index]!.identity.owner + JSON.stringify(check).slice(0, 1500)).toBe(
        'supported',
      )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    let inserts = 0
    for (const family of families) {
      const text = family.multi ? '{[1,3)}' : '[1,3)'
      for (const sample of [
        { text: null, items: null, hasValues: false },
        { text: null, items: '{}', hasValues: false },
        { text: null, items: '{NULL,NULL}', hasValues: false },
        { text, items: rangeArrayText([text, text], -2), hasValues: true },
        {
          text: family.multi ? '{}' : 'empty',
          items: rangeArrayText([text, null], 3),
          hasValues: true,
        },
      ]) {
        const payload = family.multi
          ? await readMultirangeFixture(pg, profile.multirangeType, sample.text)
          : await readRangeFixture(
              pg,
              `SELECT $1::${family.type} span`,
              'span',
              profile.rangeType,
              [sample.text],
            )
        const items = family.multi
          ? await readMultirangeArrayFixture(pg, profile.multirangeType, sample.items)
          : await readRangeArrayFixture(pg, profile.rangeType, sample.items)
        for (const form of forms.filter((form) => form.tag === family.tag))
          for (const divisor of form.name.startsWith('eager_') ? [0, 1] : [1]) {
            let output: string | null = null,
              failure: string | undefined
            try {
              output = (
                await pg.query<{ value: string | null }>(
                  `WITH q AS MATERIALIZED
                (SELECT $1::${family.type} payload,$2::${family.type}[] items,$3::int4 divisor)
                SELECT (${form.output}) value FROM q`,
                  [sample.text, sample.items, divisor],
                )
              ).rows[0]!.value
            } catch (error) {
              failure = (error as { code: string }).code
            }
            const reached =
              form.source === 'scalar'
                ? sample.text !== null
                : form.source === 'array'
                  ? sample.hasValues
                  : form.source === 'either'
                    ? sample.text !== null || sample.hasValues
                    : form.source === 'later_key'
                      ? sample.text !== null
                      : false
            references.push({
              type: family.type,
              form: form.name,
              sample,
              divisor,
              output,
              failure,
              reached,
            })
            for (const bypass of [false, true])
              for (const wrong of [false, true]) {
                const expected = wrong ? '!different!' : output
                const insert = pg.query(`INSERT INTO ${form.table} VALUES($1,$2,$3,$4,$5)`, [
                  sample.text,
                  sample.items,
                  divisor,
                  expected,
                  bypass,
                ])
                if (bypass || (!failure && !wrong)) await insert
                else await expect(insert).rejects.toMatchObject({ code: failure ?? '23514' })
                inserts++
                const eagerFailure = divisor === 0 && form.name.startsWith('eager_')
                const outcome: Outcome = bypass
                  ? { kind: 'True' }
                  : reached && !eagerFailure
                    ? { kind: 'Unknown' }
                    : failure
                      ? { kind: 'Error', value: { state: parseInt(failure, 36) } }
                      : { kind: wrong ? 'False' : 'True' }
                const row: Row = {
                  payload: payload === null ? { kind: 'Null' } : { kind: 'Value', value: payload },
                  items: items === null ? { kind: 'Null' } : { kind: 'Value', value: items },
                  divisor: cell(divisor),
                  expected: cell(expected),
                  bypass: cell(bypass),
                }
                for (const origin of ['source', 'stored'])
                  fixtures.push({ name: form.table + '_' + origin, row, expected: outcome })
              }
          }
      }
    }
    await mkdir('artifacts/custom-range-json-casts', { recursive: true })
    await writeFile(
      'artifacts/custom-range-json-casts/report.json',
      JSON.stringify(
        { inserts, fixtures: fixtures.length, plans: plans.length, references },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      directory,
      'customjsoncasts',
      group,
      plans.map((plan) => plan.identity.owner + '_' + plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
