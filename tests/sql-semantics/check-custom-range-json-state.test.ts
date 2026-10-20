import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import type { RangeTypeInfo } from '../../src/catalog/types.js'
import { customRangeProfiles, nativeCustomRangeOutcome } from './check-custom-range-fixtures.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import {
  runCheckParity,
  type Row,
  type Outcome,
  type Input,
} from '../../tools/check-rust/parity.js'

it('preserves custom JSON metadata requirements, partial states, eager literals and lazy runtime conversion', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-custom-json-state-'))
  try {
    await pg.exec(`CREATE TYPE json_state_span AS RANGE(subtype=int4,multirange_type_name=json_state_set);
      CREATE TABLE json_state(v json_state_span,m json_state_set,payload text,expected text,bypass bool);`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables[0]!,
      profile = customRangeProfiles(catalog)[0]!,
      v = await readRangeFixture(pg, 'SELECT $1::json_state_span span', 'span', profile.rangeType, [
        '[1,3)',
      ]),
      m = await readMultirangeFixture(pg, profile.multirangeType, '{[1,3)}')
    const variants: [string, Partial<RangeTypeInfo>][] = [
      ['ordinary', {}],
      ['missing_category', { jsonConversion: null, multirangeJsonConversion: null }],
      ['missing_output', { subtypeOutput: null }],
      [
        'private_output',
        {
          output: 'function:["private","output"](pg_catalog.anyrange)',
          multirangeOutput: 'function:["private","output"](pg_catalog.anymultirange)',
        },
      ],
      ['cast_without_link', { jsonConversion: 'cast', multirangeJsonConversion: 'cast' }],
      [
        'selected_cast',
        {
          jsonConversion: 'cast',
          multirangeJsonConversion: 'cast',
          jsonCast: 'function:["public","custom"](public.json_state_span)',
          multirangeJsonCast: 'function:["public","custom"](public.json_state_set)',
        },
      ],
    ]
    const forms = [false, true].flatMap((multi) => {
      const field = multi ? 'm' : 'v',
        type = multi ? 'json_state_set' : 'json_state_span',
        empty = multi ? '{}' : 'empty'
      return Object.entries({
        output: `to_jsonb(${field})::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`,
        key: `jsonb_build_object(${field},1) IS NOT NULL`,
        literal: `to_jsonb('${empty}'::${type}) IS NOT NULL`,
        bad_literal: `to_jsonb('bad'::${type}) IS NOT NULL`,
        lazy_input: `to_jsonb(payload::${type}) IS NOT NULL`,
        eager: `jsonb_build_object(${field},payload::int4) IS NOT NULL`,
      }).map(([name, sql]) => ({ name, multi, sql: `CASE WHEN bypass THEN true ELSE ${sql} END` }))
    })
    const plans = variants.flatMap(([variant, change]) =>
      forms.map((form) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: variant + '_' + Number(form.multi) + '_' + form.name,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            { name: 'test', type: 'check', definition: `CHECK(${form.sql})` },
            catalog.enums,
            catalog.domains,
            'source',
            [{ ...catalog.rangeTypes[0]!, ...change }],
          )!.expression,
        ),
      })),
    )
    const group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + JSON.stringify(check).slice(0, 1000),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const [variant] of variants)
      for (const form of forms)
        for (const present of [false, true])
          for (const bypass of [false, true]) {
            const native = await nativeCustomRangeOutcome(
              pg,
              `SELECT (${form.sql}) value FROM
          (SELECT $1::json_state_span v,$2::json_state_set m,$3::text payload,$4::text expected,$5::bool bypass)q`,
              [
                present ? '[1,3)' : null,
                present ? '{[1,3)}' : null,
                'bad',
                form.multi ? '"{[1,3)}"' : '"[1,3)"',
                bypass,
              ],
            )
            let expected = native
            if (
              !bypass &&
              variant !== 'ordinary' &&
              ['output', 'key', 'literal'].includes(form.name) &&
              (present || form.name === 'literal')
            )
              expected =
                variant === 'selected_cast' && form.name === 'key'
                  ? { kind: 'Error', value: { state: parseInt('22023', 36) } }
                  : { kind: 'Unknown' }
            fixtures.push({
              name: variant + '_' + Number(form.multi) + '_' + form.name,
              row: {
                v: present ? { kind: 'Value', value: v! } : { kind: 'Null' },
                m: present ? { kind: 'Value', value: m! } : { kind: 'Null' },
                payload: { kind: 'Value', value: 'bad' },
                expected: { kind: 'Value', value: form.multi ? '"{[1,3)}"' : '"[1,3)"' },
                bypass: { kind: 'Value', value: bypass },
              },
              expected,
            })
          }
    for (const [variant] of variants)
      for (const form of forms.filter((form) => ['output', 'key'].includes(form.name)))
        for (const input of [
          { kind: 'Unknown' },
          { kind: 'Error', value: { state: parseInt('22012', 36) } },
        ] as Input[])
          for (const bypass of [false, true])
            fixtures.push({
              name: variant + '_' + Number(form.multi) + '_' + form.name,
              row: {
                v: input,
                m: input,
                payload: { kind: 'Value', value: 'bad' },
                expected: { kind: 'Null' },
                bypass: { kind: 'Value', value: bypass },
              },
              expected: bypass ? { kind: 'True' } : (input as Outcome),
            })
    await runCheckParity(
      directory,
      'customjsonstate',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
