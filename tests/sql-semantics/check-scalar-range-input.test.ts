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
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import {
  scalarRangeBatchStarts,
  scalarRangeBatch,
  scalarRangeText,
} from './check-scalar-range-fixtures.js'
import { rangeArrayText } from './check-range-array-fixtures.js'
import { nativeCustomRangeOutcome } from './check-custom-range-fixtures.js'

const literal = (value: string) => "'" + value.replaceAll("'", "''") + "'"
const cell = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it.each(scalarRangeBatchStarts)(
  'checks scalar range input, subtype domains and source/stored literals across targets, batch %s',
  async (start) => {
    const pg = await PGlite.create(),
      directory = await mkdtemp(join(tmpdir(), 'pgsid-scalar-range-input-'))
    try {
      await pg.exec("SET lc_monetary='C';SET IntervalStyle='postgres';SET bytea_output='hex'")
      const profiles = scalarRangeBatch(start).flatMap((backend, offset) => {
        const index = start + offset
        return [false, true].map((checked) => ({
          backend,
          index,
          checked,
          values:
            checked && ['pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(backend.type)
              ? ['aaa', 'b', 'ccc']
              : checked && (backend.kind === 19 || backend.kind === 20)
                ? ['-3', '0', '3']
                : checked && backend.kind === 14 && backend.type === 'pg_catalog."bit"'
                  ? ['000', '010', '111']
                  : checked && backend.kind === 31
                    ? ['-1', '0', '1']
                    : checked && backend.kind === 22
                      ? ['00:00:00+00', '01:00:00.123456+00', '00:00:00-02']
                      : checked && backend.kind === 23
                        ? ['0 days', '1 mon 0.123456 seconds', '60 days']
                        : [...backend.values],
          name: `input_span_${index}_${Number(checked)}`,
          multiName: `input_set_${index}_${Number(checked)}`,
        }))
      })
      for (const p of profiles) {
        const subtype = p.checked ? `input_bound_${p.index}` : p.backend.type
        const modifier =
          p.backend.kind === 14 ||
          [21, 22, 23].includes(p.backend.kind) ||
          ['pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(p.backend.type)
            ? '(3)'
            : ''
        const declaration = p.backend.kind === 23 ? 'interval(3)' : p.backend.type + modifier
        if (p.checked)
          await pg.exec(
            `CREATE DOMAIN ${subtype} AS ${declaration} NOT NULL CHECK(${p.backend.type.startsWith('pg_catalog.reg') ? 'VALUE::oid<>0' : `VALUE IS DISTINCT FROM ${literal(p.values[0]!)}::${p.backend.type}${p.backend.type === 'pg_catalog."bit"' ? '(3)' : ''}`})`,
          )
        await pg.exec(
          `CREATE TYPE ${p.name} AS RANGE(subtype=${subtype},multirange_type_name=${p.multiName})`,
        )
      }
      const families = profiles.flatMap((p) =>
        [false, true].map((multi) => ({ ...p, multi, type: multi ? p.multiName : p.name })),
      )
      const forms = families.flatMap((family, index) => {
        const text = scalarRangeText(family.values[1]!, family.values[2]!),
          finite = family.multi ? `{${text}}` : text,
          array = rangeArrayText([finite, null, family.multi ? '{}' : 'empty'], -2),
          send = family.multi ? 'multirange_send' : 'range_send'
        return [
          { name: 'runtime', value: `payload::${family.type}`, constant: false, invalid: false },
          {
            name: 'literal',
            value: `${literal(finite)}::${family.type}`,
            constant: true,
            invalid: false,
          },
          {
            name: 'array_literal',
            value: `(${literal(array)}::${family.type}[])[-2]`,
            constant: true,
            invalid: false,
          },
          {
            name: 'array',
            value: `(payload::${family.type}[])[-2]`,
            constant: false,
            invalid: false,
          },
          { name: 'bad_literal', value: `'bad'::${family.type}`, constant: true, invalid: true },
          ...(family.backend.type === 'pg_catalog.cidr'
            ? [
                {
                  name: 'host_literal',
                  value: `${literal(family.multi ? '{[10.0.0.1/8,::1/128]}' : '[10.0.0.1/8,::1/128]')}::${family.type}`,
                  constant: true,
                  invalid: true,
                },
              ]
            : []),
          {
            name: 'lazy_bad',
            value: `('bad'::text)::${family.type}`,
            constant: false,
            invalid: false,
          },
        ].map((form) => ({
          ...family,
          ...form,
          finite,
          array,
          table: `scalar_input_${index}_${form.name}`,
          output: `encode(${send}(${form.value}),'hex')`,
          sql: `CASE WHEN bypass THEN true ELSE encode(${send}(${form.value}),'hex') COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END`,
        }))
      })
      for (const form of forms)
        await pg.exec(
          `CREATE TABLE ${form.table}(payload text,expected text,bypass bool${form.invalid ? '' : `,CONSTRAINT matches CHECK(${form.sql})`})`,
        )
      const catalog = await snapshotCatalog(pg),
        plans = forms.flatMap((form) => {
          const table = catalog.tables.find((t) => t.name === form.table)!
          return (form.invalid ? (['source'] as const) : (['source', 'stored'] as const)).map(
            (origin) => ({
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
                    ? { name: 'matches', type: 'check', definition: `CHECK(${form.sql})` }
                    : table.constraints[0]!,
                  catalog.enums,
                  catalog.domains,
                  origin,
                  catalog.rangeTypes,
                )!.expression,
              ),
            }),
          )
        }),
        group = prepareCheckRustGroup(plans, {
          defaultCollation: 'C',
          serverEncoding: 'UTF8',
          arrayNulls: true,
        })
      for (const [index, check] of group.checks.entries())
        expect(
          check.kind,
          plans[index]!.identity.owner + JSON.stringify(check).slice(0, 1200),
        ).toBe('supported')
      const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
        references: unknown[] = []
      let inserts = 0
      for (const form of forms) {
        const [a, b, c] = form.values,
          wrap = (text: string) => (form.multi ? `{${text}}` : text)
        const platformForms = [19, 20].includes(form.backend.kind)
          ? ['NaN', '0x1p0', 'NaN(payload)'].map((text) => wrap(scalarRangeText(text, text)))
          : []
        const cidrForms =
          form.backend.type === 'pg_catalog.cidr'
            ? [
                '10',
                '0x0a000000/8',
                '10.0.0.1/8',
                '2001:db8::1/64',
                '2001:db8::/64',
                '::ffff:192.0.2.1/128',
              ].map((text) => wrap(scalarRangeText(text, text)))
            : []
        const textForms =
          form.backend.kind === 8 && form.backend.type !== 'pg_catalog.name'
            ? ['', 'a', 'a ', 'alpha', 'longer', 'é', '𐍈'].map((text) =>
                wrap(scalarRangeText(text, text)),
              )
            : []
        const contextualForms =
          form.backend.kind === 22 ? [wrap(scalarRangeText('12:00', '13:00'))] : []
        const samples = form.constant
          ? [form.finite]
          : [
              null,
              wrap('empty'),
              wrap('(,)'),
              ...cidrForms,
              ...textForms,
              wrap(scalarRangeText(b!, c!)),
              wrap(scalarRangeText(a!, c!)),
              wrap(scalarRangeText(c!, b!)),
              wrap(scalarRangeText(null, c!)),
              wrap(scalarRangeText(b!, null)),
              wrap('[a,b,c]'),
              'bad',
              ...platformForms,
              ...contextualForms,
            ]
        for (const sample of samples) {
          const payload =
            sample === null
              ? null
              : form.name === 'array'
                ? rangeArrayText([sample, null], -2)
                : sample
          let output: string | null = null
          try {
            output = (
              await pg.query<{ value: string | null }>(
                `SELECT (${form.output}) value FROM(SELECT $1::text payload)q`,
                [payload],
              )
            ).rows[0]!.value
          } catch (error) {
            expect(error).toHaveProperty('code')
          }
          for (const bypass of [false, true])
            for (const wrong of [false, true]) {
              const expected = wrong ? '!different!' : output,
                args = [payload, expected, bypass]
              const native = await nativeCustomRangeOutcome(
                pg,
                `SELECT (${form.sql}) value FROM(SELECT $1::text payload,$2::text expected,$3::bool bypass)q`,
                args,
              )
              if (!form.invalid) {
                let inserted: Outcome = { kind: 'True' }
                try {
                  await pg.query(
                    `INSERT INTO ${form.table}(payload,expected,bypass) VALUES($1,$2,$3)`,
                    args,
                  )
                } catch (error) {
                  const e = error as { code: string; constraint?: string }
                  inserted =
                    e.code === '23514' && e.constraint === 'matches'
                      ? { kind: 'False' }
                      : { kind: 'Error', value: { state: parseInt(e.code, 36) } }
                }
                expect(inserted, JSON.stringify({ form: form.table, args })).toEqual(native)
                inserts++
              }
              for (const plan of plans.filter((p) => p.identity.owner === form.table)) {
                const sourceMoney =
                  plan.identity.constraint === 'source' &&
                  form.constant &&
                  form.backend.kind === 31 &&
                  form.checked &&
                  !form.invalid
                const runtimeMoney =
                  !form.constant &&
                  form.name !== 'lazy_bad' &&
                  form.backend.kind === 31 &&
                  form.checked &&
                  sample !== null &&
                  [
                    wrap(scalarRangeText(b!, c!)),
                    wrap(scalarRangeText(a!, c!)),
                    wrap(scalarRangeText(c!, b!)),
                    wrap(scalarRangeText(null, c!)),
                  ].includes(sample)
                const sourceName =
                  form.backend.type === 'pg_catalog.name' &&
                  form.constant &&
                  !form.invalid &&
                  plan.identity.constraint === 'source'
                const runtimeName =
                  form.backend.type === 'pg_catalog.name' &&
                  ['runtime', 'array'].includes(form.name) &&
                  sample !== null &&
                  ![wrap('empty'), wrap('(,)'), wrap('[a,b,c]'), 'bad'].includes(sample)
                const textWire =
                  form.backend.kind === 8 &&
                  ['runtime', 'array'].includes(form.name) &&
                  sample !== null &&
                  /[^\x00-\x7f]/u.test(sample) &&
                  native.kind !== 'Error'
                const result: Outcome =
                  sourceName ||
                  (!bypass && (runtimeName || textWire)) ||
                  sourceMoney ||
                  (!bypass &&
                    (sourceMoney ||
                      runtimeMoney ||
                      (!form.constant &&
                        sample !== null &&
                        [...platformForms, ...contextualForms].includes(sample) &&
                        form.name !== 'lazy_bad')))
                    ? { kind: 'Unknown' }
                    : native
                references.push({
                  table: form.table,
                  origin: plan.identity.constraint,
                  payload,
                  expected,
                  bypass,
                  native,
                  result,
                })
                fixtures.push({
                  name: form.table + '_' + plan.identity.constraint,
                  row: { payload: cell(payload), expected: cell(expected), bypass: cell(bypass) },
                  expected: result,
                })
              }
            }
        }
        if (!['runtime', 'array'].includes(form.name)) continue
        for (const payload of [
          { kind: 'Unknown' },
          { kind: 'Error', value: { state: parseInt('22012', 36) } },
        ] as Input[])
          for (const bypass of [false, true])
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: form.table + '_' + origin,
                row: { payload, expected: cell(null), bypass: cell(bypass) },
                expected: bypass
                  ? { kind: 'True' }
                  : payload.kind === 'Error'
                    ? payload
                    : { kind: 'Unknown' },
              })
      }
      await mkdir('artifacts/scalar-range-input', { recursive: true })

      await writeFile(
        `artifacts/scalar-range-input/batch-${start}.json`,
        JSON.stringify(
          {
            profiles: profiles.length,
            plans: plans.length,
            inserts,
            fixtures: fixtures.length,
            references,
          },
          null,
          2,
        ) + '\n',
      )
      await runCheckParity(
        directory,
        'scalarrangeinput' + start,
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
