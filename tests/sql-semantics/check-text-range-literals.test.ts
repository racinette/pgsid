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
import { customRangeProfiles, nativeCustomRangeOutcome } from './check-custom-range-fixtures.js'
import { textRangeSchema } from './check-text-range-fixtures.js'
import { rangeArrayText } from './check-range-array-fixtures.js'

const literal = (value: string) => "'" + value.replaceAll("'", "''") + "'"
const cell = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it('preserves text range literal preparation and lazy scalar, array, element and nested-domain input in source/stored CHECKs', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-text-range-literals-'))
  try {
    await pg.exec(textRangeSchema)
    const initial = await snapshotCatalog(pg)
    const families = customRangeProfiles(initial).flatMap((profile, index) =>
      [false, true].map((multi) => ({
        type: multi ? profile.multirange : profile.identity,
        multi,
        index: index * 2 + Number(multi),
      })),
    )
    for (const family of families)
      await pg.exec(`CREATE DOMAIN literal_history_${family.index} AS ${family.type}[]`)
    const forms = families.flatMap((family) => {
      const finite = family.multi ? '{[é,漢],[a,z]}' : '[é,漢]',
        array = rangeArrayText([finite, null, family.multi ? '{}' : 'empty'], -2)
      return [
        { name: 'literal', output: `${literal(finite)}::${family.type}::text` },
        { name: 'array_literal', output: `${literal(array)}::${family.type}[]::text` },
        { name: 'scalar', output: `payload::${family.type}::text` },
        { name: 'array', output: `payload::${family.type}[]::text` },
        { name: 'elements', output: `ARRAY[payload,other]::${family.type}[]::text` },
        {
          name: 'nested',
          output: `to_jsonb(ARRAY[payload::literal_history_${family.index}])::text`,
        },
        { name: 'runtime_bad', output: `'bad'::text::${family.type}::text` },
        { name: 'bad_literal', output: `'bad'::${family.type}::text`, invalid: true },
        { name: 'bad_array_literal', output: `'{bad}'::${family.type}[]::text`, invalid: true },
      ].map((form) => ({
        ...family,
        ...form,
        invalid: 'invalid' in form && form.invalid,
        table: `text_literal_${family.index}_${form.name}`,
        sql: `CASE WHEN bypass THEN true ELSE (${form.output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END`,
      }))
    })
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE ${form.table}(payload text,other text,expected text,bypass bool${form.invalid ? '' : `,CONSTRAINT matches CHECK(${form.sql})`})`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans = forms.flatMap((form) => {
      const table = catalog.tables.find((table) => table.name === form.table)!
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
    })
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    for (const [index, check] of group.checks.entries())
      expect(check.kind, plans[index]!.identity.owner + JSON.stringify(check).slice(0, 1000)).toBe(
        'supported',
      )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    let inserts = 0
    for (const form of forms) {
      const samples = [null, 'empty', '(,)', '[a,z]', '[é,漢]', '["",z]', '[z,a]', 'bad']
      for (const sample of form.invalid ? [null] : samples) {
        const value = sample === null ? null : form.multi ? `{${sample}}` : sample,
          payload =
            form.name === 'array' || form.name === 'nested'
              ? value === null
                ? null
                : rangeArrayText([value, null], -2)
              : value
        let output: string | null = null
        try {
          output = (
            await pg.query<{ value: string | null }>(
              `SELECT (${form.output}) value FROM(SELECT $1::text payload,$2::text other)q`,
              [payload, value],
            )
          ).rows[0]!.value
        } catch (error) {
          if (!error || typeof error !== 'object' || !('code' in error)) throw error
        }
        for (const bypass of [false, true])
          for (const wrong of [false, true]) {
            const expected = wrong ? '!different!' : output,
              parameters = [payload, value, expected, bypass]
            const native = await nativeCustomRangeOutcome(
              pg,
              `SELECT (${form.sql}) value FROM(SELECT $1::text payload,$2::text other,$3::text expected,$4::bool bypass)q`,
              parameters,
            )
            if (form.invalid)
              expect(native).toEqual({ kind: 'Error', value: { state: parseInt('22P02', 36) } })
            else {
              let insertion: Outcome = { kind: 'True' }
              try {
                await pg.query(`INSERT INTO ${form.table} VALUES($1,$2,$3,$4)`, parameters)
              } catch (error) {
                const failure = error as { code: string; constraint?: string }
                insertion =
                  failure.code === '23514' && failure.constraint === 'matches'
                    ? { kind: 'False' }
                    : { kind: 'Error', value: { state: parseInt(failure.code, 36) } }
              }
              expect(insertion).toEqual(native)
              inserts++
            }
            references.push({ form: form.table, parameters, native })
            for (const plan of plans.filter((plan) => plan.identity.owner === form.table))
              fixtures.push({
                name: form.table + '_' + plan.identity.constraint,
                row: {
                  payload: cell(payload),
                  other: cell(value),
                  expected: cell(expected),
                  bypass: cell(bypass),
                },
                expected: native,
              })
          }
      }
      if (!['scalar', 'array', 'elements', 'nested'].includes(form.name)) continue
      for (const payload of [
        { kind: 'Unknown' },
        { kind: 'Error', value: { state: parseInt('22012', 36) } },
      ] as Input[])
        for (const bypass of [false, true])
          for (const plan of plans.filter((plan) => plan.identity.owner === form.table))
            fixtures.push({
              name: form.table + '_' + plan.identity.constraint,
              row: { payload, other: cell(null), expected: cell(null), bypass: cell(bypass) },
              expected: bypass
                ? { kind: 'True' }
                : payload.kind === 'Error'
                  ? payload
                  : { kind: 'Unknown' },
            })
    }
    await mkdir('artifacts/text-range-literals', { recursive: true })
    await writeFile(
      'artifacts/text-range-literals/report.json',
      JSON.stringify(
        { plans: plans.length, inserts, fixtures: fixtures.length, references },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      directory,
      'textrangeliterals',
      group,
      plans.map((plan) => plan.identity.owner + '_' + plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 360_000)
