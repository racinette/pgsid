import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { readRangeFixture } from './check-range-fixtures.js'
import {
  customRangeSchema,
  customRangeProfiles,
  nativeCustomRangeOutcome,
} from './check-custom-range-fixtures.js'

const cell = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it('binds custom range text input through selected scalar/domain input, ordered preparation, composition and raw/stored INSERT parity', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-custom-range-input-'))
  try {
    await pg.exec(
      "SET DateStyle='ISO,YMD';SET TimeZone='UTC';" +
        customRangeSchema +
        `
      CREATE DOMAIN "Custom.Range".nonnull_positive AS int4 NOT NULL CHECK(VALUE>0);
      CREATE TYPE "Custom.Range".nonnull_span AS RANGE(subtype="Custom.Range".nonnull_positive);
      CREATE DOMAIN "Custom.Range".rounded AS numeric(4,2) CHECK(VALUE>0);
      CREATE TYPE "Custom.Range".rounded_span AS RANGE(subtype="Custom.Range".rounded);
      CREATE DOMAIN "Custom.Range".preflight AS int4 CHECK(VALUE>0 OR 1/0=0);
      CREATE TYPE "Custom.Range".preflight_span AS RANGE(subtype="Custom.Range".preflight);`,
    )
    let catalog = await snapshotCatalog(pg)
    const profiles = customRangeProfiles(catalog).filter(
      (profile) => profile.canonical === null && profile.name !== 'reverse_span',
    )
    expect(profiles).toHaveLength(10)
    const targets = profiles.flatMap((profile, family) =>
      [
        { name: 'cast', expr: `payload::${profile.identity}` },
        { name: 'domain', expr: `payload::input_nested_${family}` },
        { name: 'checked', expr: `payload::input_checked_${family}` },
        { name: 'varchar', expr: `(payload::varchar)::${profile.identity}` },
        { name: 'bpchar', expr: `(payload::bpchar)::${profile.identity}` },
        { name: 'name', expr: `payload::${profile.identity}` },
        {
          name: 'case',
          expr: `CASE WHEN take_input THEN payload::${profile.identity} ELSE NULL::${profile.identity} END`,
        },
        {
          name: 'coalesce',
          expr: `COALESCE(NULL::${profile.identity},payload::${profile.identity})`,
        },
      ].map((form, index) => ({
        ...form,
        profile,
        family,
        table: `custom_input_${family}_${index}`,
        inputType: form.name === 'name' ? 'pg_catalog.name' : 'pg_catalog.text',
        sql: `CASE WHEN bypass THEN true ELSE (${form.expr}) IS NOT DISTINCT FROM expected${profile.elementType === 'pg_catalog."numeric"' ? ['lower', 'upper'].map((fn) => ` AND scale(${fn}(${form.expr})) IS NOT DISTINCT FROM scale(${fn}(expected))`).join('') : ''} END`,
      })),
    )
    for (const [family, profile] of profiles.entries())
      await pg.exec(
        `CREATE DOMAIN input_base_${family} AS ${profile.identity};CREATE DOMAIN input_nested_${family} AS input_base_${family};CREATE DOMAIN input_checked_${family} AS input_nested_${family} NOT NULL CHECK(isempty(VALUE) OR lower(VALUE) IS NOT NULL)`,
      )
    for (const target of targets)
      await pg.exec(
        `CREATE TABLE ${target.table}(payload ${target.inputType},expected ${target.profile.identity},take_input bool,bypass bool,CONSTRAINT valid CHECK(${target.sql}))`,
      )
    catalog = await snapshotCatalog(pg)
    const plans = targets.flatMap((target) => {
      const table = catalog.tables.find((table) => table.name === target.table)!
      return (['source', 'stored'] as const).map((origin) => {
        const plan = lowerTableCheck(
          table,
          origin === 'source'
            ? { name: 'valid', type: 'check', definition: `CHECK(${target.sql})` }
            : table.constraints[0]!,
          catalog.enums,
          catalog.domains,
          origin,
          catalog.rangeTypes,
        )!
        expect(hasUncertain(plan.expression), target.table + '/' + origin).toBe(false)
        return {
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: target.table,
            constraint: origin,
          },
          expression: portableCheckAtoms(plan.expression),
        }
      })
    })
    const group = prepareCheckRustGroup(plans)
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.owner + (check.kind === 'unsupported' ? ': ' + check.reason : ''),
      ).toBe('supported')
    const names = plans.map((plan) => plan.identity.owner + '_' + plan.identity.constraint)
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let inserts = 0,
      rejections = 0,
      errors = 0
    for (const [targetIndex, target] of targets.entries()) {
      const temporal = [
        'pg_catalog.date',
        'pg_catalog."timestamp"',
        'pg_catalog.timestamptz',
      ].includes(target.profile.elementType)
      const offset = target.profile.elementType === 'pg_catalog.timestamptz' ? ' 00:00:00+00' : ''
      const [a, b] = temporal ? ['2000-01-01' + offset, '2000-01-03' + offset] : ['1', '3']
      const inputs: (string | null)[] = [
        null,
        'empty',
        ' EMPTY ',
        '(,)',
        `[${a},${b}]`,
        `(${a},${b})`,
        `[${a},)`,
        `(,${b}]`,
        `["${a}","${b}")`,
        temporal ? `[2000-99-01${offset},${b})` : '[bad,3)',
        temporal ? `[${a},2000-99-01${offset})` : '[1,bad)',
        `[${a},${b}]junk`,
        `["",${b}]`,
        `(${b},${a})`,
        `[${a},${a})`,
      ]
      if (!temporal)
        inputs.push(
          '[0,bad)',
          '[bad,0)',
          '[0,0)',
          '[2147483648,bad)',
          '[bad,2147483648)',
          '[2147483648,3',
        )
      if (target.profile.elementType === 'pg_catalog."numeric"')
        inputs.push(
          '[-0.00,1.2300]',
          '[1.235,3.456]',
          '[99.995,100]',
          '[NaN,NaN]',
          '[-Infinity,Infinity]',
        )
      for (const payload of inputs)
        for (const bypass of [false, true]) {
          const take = payload !== null
          const coerced = (
            await pg.query<{ value: string | null }>(
              `SELECT $1::${target.inputType}::text AS value`,
              [payload],
            )
          ).rows[0]!.value
          let expectedText: string | null = null
          try {
            expectedText = (
              await pg.query<{ value: string | null }>(
                `SELECT (${target.expr})::text AS value FROM (SELECT $1::${target.inputType} payload,$2::bool take_input) inputs`,
                [payload, take],
              )
            ).rows[0]!.value
          } catch (error) {
            if (!error || typeof error !== 'object' || !('code' in error)) throw error
          }
          if (payload === '(,)' && !bypass) expectedText = 'empty'
          const expectedPayload = await readRangeFixture(
            pg,
            `SELECT $1::${target.profile.identity} AS value`,
            'value',
            target.profile.rangeType,
            [expectedText],
          )
          const args = [payload, expectedText, take, bypass]
          const seed = `SELECT $1::${target.inputType} payload,$2::${target.profile.identity} expected,$3::bool take_input,$4::bool bypass`
          const expected = await nativeCustomRangeOutcome(
            pg,
            `SELECT (${target.sql}) AS value FROM (${seed}) inputs`,
            args,
          )
          const insert = pg.query(
            `INSERT INTO ${target.table} SELECT * FROM (${seed}) inputs`,
            args,
          )
          if (expected.kind === 'False') {
            await expect(insert).rejects.toMatchObject({ code: '23514' })
            rejections++
          } else if (expected.kind === 'Error') {
            await expect(insert).rejects.toMatchObject({
              code: expected.value.state.toString(36).toUpperCase().padStart(5, '0'),
            })
            errors++
          } else await insert
          inserts++
          const row: Row = {
            payload: cell(coerced),
            expected:
              expectedPayload === null
                ? { kind: 'Null' }
                : { kind: 'Value', value: expectedPayload },
            take_input: cell(take),
            bypass: cell(bypass),
          }
          for (let origin = 0; origin < 2; origin++)
            fixtures.push({ name: names[targetIndex * 2 + origin]!, row, expected })
        }
    }
    await runCheckParity(directory, 'customrangeinput', group, names, fixtures)
    expect(errors).toBeGreaterThan(0)
    expect(rejections).toBeGreaterThan(0)
    await mkdir('artifacts/check-custom-range-input', { recursive: true })
    await writeFile(
      'artifacts/check-custom-range-input/report.json',
      JSON.stringify(
        {
          profiles: profiles.length,
          forms: targets.length / profiles.length,
          plans: plans.length,
          inserts,
          rejections,
          errors,
          fixtures: fixtures.length,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 480_000)
