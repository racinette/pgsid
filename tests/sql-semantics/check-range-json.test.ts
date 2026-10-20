import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import type { RangeType, MultirangeType } from '../../src/sql-semantics/expressions.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import { customRangeSchema, customRangeProfiles } from './check-custom-range-fixtures.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import {
  rangeArrayText,
  readRangeArrayFixture,
  rangeArrayNeedsOutputContext,
} from './check-range-array-fixtures.js'
import {
  readMultirangeArrayFixture,
  multirangeArrayNeedsOutputContext,
} from './check-multirange-array-fixtures.js'

const cell = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it.each(['builtin', 'captured'] as const)(
  'converts %s ranges, multiranges and their arrays through JSON builders with exact text, domains and reached context requirements',
  async (mode) => {
    const pg = await PGlite.create()
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-range-json-'))
    try {
      await pg.exec("SET DateStyle='ISO,YMD';SET TimeZone='UTC'")
      if (mode === 'captured') await pg.exec(customRangeSchema)
      const profiles = mode === 'captured' ? customRangeProfiles(await snapshotCatalog(pg)) : []
      const definitions =
        mode === 'builtin'
          ? Object.values(PG18_RANGE_TYPES).map((metadata) => ({
              metadata,
              rangeType: metadata.identity as RangeType,
              multirangeType: metadata.multirange as MultirangeType,
            }))
          : profiles.map((profile) => ({
              metadata: {
                ...Object.values(PG18_RANGE_TYPES).find(
                  (metadata) => metadata.subtype === profile.elementType,
                )!,
                identity: profile.identity,
                multirange: profile.multirange,
              },
              rangeType: profile.rangeType,
              multirangeType: profile.multirangeType,
            }))
      const families = definitions.flatMap(({ metadata, rangeType, multirangeType }, index) =>
        [false, true].map((multi) => ({
          rangeType,
          multirangeType,
          metadata,
          multi,
          index: index * 2 + Number(multi),
          type: multi ? metadata.multirange : metadata.identity,
        })),
      )
      const forms = families.flatMap((family) => {
        const dom = `json_span_domain_${family.index}`
        return [
          ['json', 'to_json(payload)::text'],
          ['jsonb', 'to_jsonb(payload)::text'],
          ['array', 'array_to_json(items)::text'],
          ['pretty', 'array_to_json(items,true)::text'],
          ['json_array', 'json_build_array(payload,items)::text'],
          ['jsonb_array', 'jsonb_build_array(payload,items)::text'],
          ['json_object', "json_build_object('span',payload,'spans',items)::text"],
          ['jsonb_object', "jsonb_build_object('span',payload,'spans',items)::text"],
          ['json_key', 'json_build_object(payload,payload)::text'],
          ['jsonb_key', 'jsonb_build_object(payload,payload)::text'],
          ['json_array_key', 'json_build_object(items,payload)::text'],
          ['jsonb_array_key', 'jsonb_build_object(items,payload)::text'],
          ['json_variadic', 'json_build_array(VARIADIC items)::text'],
          ['jsonb_variadic', 'jsonb_build_array(VARIADIC items)::text'],
          ['variadic_object', 'jsonb_build_object(VARIADIC ARRAY[payload,payload])::text'],
          ['domain', `to_jsonb(payload::${dom})::text`],
          ['domain_array', `to_jsonb(items::${dom}[])::text`],
          ['nested_array', 'to_jsonb(ARRAY[ARRAY[payload,NULL]])::text'],
          [
            'coalesce',
            `to_jsonb(COALESCE(payload,'${family.multi ? '{}' : 'empty'}'::${family.type}))::text`,
          ],
        ].map(([name, expr], index) => ({
          ...family,
          name: name!,
          expr: expr!,
          table: `range_json_${family.index}_${index}`,
          sql: `CASE WHEN bypass THEN true ELSE (${expr}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END`,
        }))
      })
      for (const family of families)
        await pg.exec(`CREATE DOMAIN json_span_domain_${family.index} AS ${family.type}`)
      for (const form of forms)
        await pg.exec(
          `CREATE TABLE ${form.table}(payload ${form.type},items ${form.type}[],expected text,bypass boolean,CONSTRAINT output CHECK(${form.sql}))`,
        )
      const catalog = await snapshotCatalog(pg)
      const plans = forms.flatMap((form) => {
        const table = catalog.tables.find((t) => t.name === form.table)!
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
      const group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
      for (const check of group.checks)
        expect(check.kind, JSON.stringify(check).slice(0, 1500)).toBe('supported')
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      const references: unknown[] = []
      let inserts = 0
      for (const family of families) {
        const short = Object.values(PG18_RANGE_TYPES)
          .find((metadata) => metadata.subtype === family.metadata.subtype)!
          .identity.slice('pg_catalog.'.length)
        const samples: (string | null)[] = [null, 'empty', '(,)']
        if (short === 'int4range') samples.push('[1,10)', '[-2147483648,2147483647)')
        else if (short === 'int8range')
          samples.push(
            '[9007199254740993,9007199254740999)',
            '[-9223372036854775808,9223372036854775807)',
          )
        else if (short === 'numrange')
          samples.push('[-0.00,1.2300]', '[1.00,1.000]', '[-Infinity,Infinity]', '[NaN,NaN]')
        else
          samples.push(
            '[-infinity,infinity]',
            '[infinity,infinity]',
            short === 'daterange'
              ? '[2000-01-02,2000-03-04)'
              : short === 'tsrange'
                ? '[2000-01-02 00:00:00.000001,2000-03-04)'
                : '[2000-01-02 00:00:00.000001+00,2000-03-04 00:00+00)',
          )
        if (mode === 'captured' && family.metadata.identity.includes('positive_span'))
          samples.splice(3, samples.length, '[1,3)', '[3,5]')
        if (mode === 'captured' && family.metadata.identity.includes('reverse_span'))
          samples.splice(3)
        if (mode === 'captured' && family.metadata.identity.includes('opaque_span'))
          samples.splice(3, samples.length, '[1,3)')
        if (family.multi)
          for (let index = 0; index < samples.length; index++)
            if (samples[index] !== null)
              samples[index] = samples[index] === 'empty' ? '{}' : `{${samples[index]}}`
        if (family.multi && short === 'numrange') samples.push('{[1.0000,3.00000),[5.00,7.000]}')
        if (
          family.multi &&
          short === 'int4range' &&
          !family.metadata.identity.includes('reverse_span')
        )
          samples.push('{[1,3),[5,9)}')
        for (const text of samples) {
          const itemsText = text === null ? null : rangeArrayText([text, null, text], -2)
          const payload = family.multi
            ? await readMultirangeFixture(pg, family.multirangeType, text)
            : await readRangeFixture(
                pg,
                `SELECT $1::${family.type} span`,
                'span',
                family.rangeType,
                [text],
              )
          const items = family.multi
            ? await readMultirangeArrayFixture(pg, family.multirangeType, itemsText)
            : await readRangeArrayFixture(pg, family.rangeType, itemsText)
          const context = family.multi
            ? multirangeArrayNeedsOutputContext(items)
            : rangeArrayNeedsOutputContext(items)
          for (const form of forms.filter((f) => f.index === family.index)) {
            let output: string | null = null
            let outputError: string | undefined
            try {
              output = (
                await pg.query<{ output: string | null }>(
                  `SELECT (${form.expr}) output FROM (SELECT $1::${family.type} payload,$2::${family.type}[] items) q`,
                  [text, itemsText],
                )
              ).rows[0]!.output
            } catch (error) {
              outputError = (error as { code: string }).code
            }
            references.push({
              type: family.type,
              form: form.name,
              text,
              output,
              outputError,
              context,
            })
            for (const expected of [output, 'deliberately different'])
              for (const bypass of [false, true]) {
                let outcome: Outcome
                try {
                  const result = (
                    await pg.query<{ result: boolean | null }>(
                      `INSERT INTO ${form.table} VALUES($1::${family.type},$2::${family.type}[],$3,$4) RETURNING (${form.sql}) result`,
                      [text, itemsText, expected, bypass],
                    )
                  ).rows[0]!.result
                  outcome = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
                } catch (error) {
                  const code = (error as { code: string }).code
                  outcome =
                    code === '23514'
                      ? { kind: 'False' }
                      : { kind: 'Error', value: { state: parseInt(code, 36) } }
                }
                inserts++
                if (!bypass && context && !outputError) outcome = { kind: 'Unknown' }
                for (const origin of ['source', 'stored'])
                  fixtures.push({
                    name: form.table + '_' + origin,
                    row: {
                      payload:
                        payload === null ? { kind: 'Null' } : { kind: 'Value', value: payload },
                      items: items === null ? { kind: 'Null' } : { kind: 'Value', value: items },
                      expected: cell(expected),
                      bypass: cell(bypass),
                    },
                    expected: outcome,
                  })
              }
          }
        }
        for (const form of forms.filter((f) => f.index === family.index))
          for (const input of [
            { kind: 'Unknown' },
            { kind: 'Error', value: { state: parseInt('22012', 36) } },
          ] as Input[])
            for (const bypass of [false, true])
              for (const origin of ['source', 'stored'])
                fixtures.push({
                  name: form.table + '_' + origin,
                  row: {
                    payload: input,
                    items: input,
                    expected: cell('empty'),
                    bypass: cell(bypass),
                  },
                  expected: bypass ? { kind: 'True' } : (input as Outcome),
                })
      }
      const witnesses: unknown[] = []
      for (const family of families.filter((f) =>
        ['pg_catalog.daterange', 'pg_catalog.tsrange', 'pg_catalog.tstzrange'].includes(
          Object.values(PG18_RANGE_TYPES).find(
            (metadata) => metadata.subtype === f.metadata.subtype,
          )!.identity,
        ),
      )) {
        const short = Object.values(PG18_RANGE_TYPES)
          .find((metadata) => metadata.subtype === family.metadata.subtype)!
          .identity.slice('pg_catalog.'.length)
        let text =
          short === 'daterange'
            ? '[2000-01-02,2000-03-04)'
            : short === 'tsrange'
              ? '[2000-01-02 00:00:00.000001,2000-03-04)'
              : '[2000-01-02 00:00:00.000001+00,2000-03-04 00:00+00)'
        if (family.multi) text = `{${text}}`
        const settings =
          short === 'tstzrange'
            ? ["SET TimeZone='UTC'", "SET TimeZone='Europe/Minsk'"]
            : ["SET DateStyle='ISO,YMD'", "SET DateStyle='SQL,DMY'"]
        const outputs: string[] = []
        const form = forms.find((f) => f.index === family.index && f.name === 'jsonb')!
        for (const setting of settings) {
          await pg.exec(setting)
          outputs.push(
            (
              await pg.query<{ output: string }>(
                `SELECT to_jsonb($1::${family.type})::text output`,
                [text],
              )
            ).rows[0]!.output,
          )
          for (const bypass of [false, true]) {
            try {
              await pg.query(
                `INSERT INTO ${form.table}(payload,expected,bypass) VALUES($1::${family.type},$2,$3)`,
                [text, outputs[0], bypass],
              )
              expect(bypass || outputs.length === 1).toBe(true)
            } catch (error) {
              expect((error as { code: string }).code).toBe('23514')
              expect(bypass).toBe(false)
            }
            inserts++
          }
        }
        expect(outputs[0]).not.toBe(outputs[1])
        witnesses.push({ type: family.type, settings, outputs })
        await pg.exec("SET DateStyle='ISO,YMD';SET TimeZone='UTC'")
      }
      await mkdir('artifacts/' + mode + '-range-json', { recursive: true })
      await writeFile(
        'artifacts/' + mode + '-range-json/references.json',
        JSON.stringify({ inserts, plans: plans.length, references, witnesses }, null, 2) + '\n',
      )
      await writeFile(
        'artifacts/' + mode + '-range-json/fixtures.json',
        JSON.stringify(
          fixtures,
          (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
          2,
        ) + '\n',
      )
      await runCheckParity(
        directory,
        mode + 'rangejson',
        group,
        plans.map((p) => p.identity.owner + '_' + p.identity.constraint),
        fixtures,
      )
    } finally {
      await pg.close()
      await rm(directory, { recursive: true, force: true })
    }
  },
  600_000,
)
