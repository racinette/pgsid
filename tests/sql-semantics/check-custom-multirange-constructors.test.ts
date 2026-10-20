import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import {
  customRangeSchema,
  customRangeProfiles,
  nativeCustomRangeOutcome,
} from './check-custom-range-fixtures.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'

it('constructs captured custom multiranges through actual zero/single/expanded-variadic overloads with normalization, domains and raw/stored INSERT parity', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-custom-multi-constructors-'))
  try {
    await pg.exec(
      "SET DateStyle='ISO,YMD';SET TimeZone='UTC';" +
        customRangeSchema +
        `CREATE DOMAIN "Custom.Range".required AS int4 NOT NULL CHECK(VALUE>0);CREATE TYPE "Custom.Range".required_span AS RANGE(subtype="Custom.Range".required);`,
    )
    let catalog = await snapshotCatalog(pg)
    const profiles = customRangeProfiles(catalog).filter(
      (p) => p.canonical === null && p.name !== 'reverse_span',
    )
    expect(profiles).toHaveLength(8)
    const targets = profiles.flatMap((profile, family) => {
      const c = catalog.rangeTypes
        .find((p) => p.identity === profile.identity)!
        .callables!.find((c) => c.implementation === 'multirange_constructor0')!
      const fn = [c.schema, c.name].map((n) => '"' + n.replaceAll('"', '""') + '"').join('.')
      return [
        { name: 'zero', expr: `${fn}()` },
        { name: 'single', expr: `${fn}(first)` },
        { name: 'many', expr: `${fn}(first,second)` },
        {
          name: 'repeated',
          expr: `COALESCE(NULL::${profile.multirange},${fn}(first,second,first))`,
        },
        { name: 'domain', expr: `(${fn}(first,second))::multi_constructor_checked_${family}` },
      ].map((form, i) => ({
        ...form,
        profile,
        name: `custom_multi_ctor_${family}_${i}`,
        sql: `CASE WHEN bypass THEN true ELSE (${form.expr}) IS NOT DISTINCT FROM expected${profile.elementType === 'pg_catalog."numeric"' ? ` AND (${form.expr})::text IS NOT DISTINCT FROM expected::text` : ''} END`,
      }))
    })
    for (const [family, profile] of profiles.entries())
      await pg.exec(
        `CREATE DOMAIN multi_constructor_checked_${family} AS ${profile.multirange} CHECK(isempty(VALUE) OR lower(VALUE) IS NOT NULL)`,
      )
    for (const target of targets)
      await pg.exec(
        `CREATE TABLE ${target.name}(first ${target.profile.identity},second ${target.profile.identity},expected ${target.profile.multirange},bypass bool,CONSTRAINT valid CHECK(${target.sql}))`,
      )
    catalog = await snapshotCatalog(pg)
    const plans = targets.flatMap((target) => {
      const table = catalog.tables.find((t) => t.name === target.name)!
      return (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: target.name,
          constraint: origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source'
              ? { name: 'valid', type: 'check', definition: `CHECK(${target.sql})` }
              : table.constraints[0]!,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
          )!.expression,
        ),
      }))
    })
    const group = prepareCheckRustGroup(plans),
      names = plans.map((p) => p.identity.owner + '_' + p.identity.constraint)
    for (const [i, c] of group.checks.entries())
      expect(c.kind, names[i] + (c.kind === 'unsupported' ? ': ' + c.reason : '')).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let inserts = 0,
      errors = 0,
      rejections = 0
    for (const [index, target] of targets.entries()) {
      const temporal = [
          'pg_catalog.date',
          'pg_catalog."timestamp"',
          'pg_catalog.timestamptz',
        ].includes(target.profile.elementType),
        suffix = target.profile.elementType === 'pg_catalog.timestamptz' ? ' 00:00:00+00' : ''
      const [a, b, c, d] = temporal
        ? ['2000-01-01', '2000-01-03', '2000-01-05', '2000-01-07'].map((s) => s + suffix)
        : ['1', '3', '5', '7']
      const pairs: readonly (readonly [string | null, string | null])[] = [
        [null, null],
        ['empty', 'empty'],
        ['empty', `[${a},${b})`],
        [`[${a},${b})`, null],
        [`[${a},${b})`, `[${b},${c})`],
        [`[${c},${d})`, `[${a},${b})`],
        [`[${a},${c}]`, `[${b},${d})`],
        ['(,)', `[${a},${b})`],
        [`(,${b})`, `[${c},)`],
        [`[${a},${a}]`, `[${b},${b}]`],
        ...(target.profile.elementType === 'pg_catalog."numeric"'
          ? [['[1.00,3.000)', '[1.0,3.0)'] as const]
          : []),
      ]
      for (const [first, second] of pairs)
        for (const bypass of [false, true]) {
          let expectedText: string | null = null
          try {
            expectedText = (
              await pg.query<{ value: string | null }>(
                `WITH inputs AS MATERIALIZED(SELECT $1::${target.profile.identity} AS first,$2::${target.profile.identity} AS second)SELECT (${target.expr})::text value FROM inputs`,
                [first, second],
              )
            ).rows[0]!.value
          } catch (e) {
            expect(e).toMatchObject({ code: expect.stringMatching(/^(22004|23514)$/) })
          }
          if (first === 'empty' && second === 'empty' && !bypass) expectedText = '{(,)}'
          const expectedPayload = await readMultirangeFixture(
            pg,
            target.profile.multirangeType,
            expectedText,
          )
          const args = [first, second, expectedText, bypass],
            seed = `SELECT $1::${target.profile.identity} AS first,$2::${target.profile.identity} AS second,$3::${target.profile.multirange} AS expected,$4::bool AS bypass`
          const expected = await nativeCustomRangeOutcome(
            pg,
            `WITH inputs AS MATERIALIZED(${seed})SELECT (${target.sql}) value FROM inputs`,
            args,
          )
          const insert = pg.query(`INSERT INTO ${target.name} SELECT * FROM (${seed}) inputs`, args)
          if (expected.kind === 'Error') {
            await expect(insert).rejects.toMatchObject({
              code: expected.value.state.toString(36).toUpperCase().padStart(5, '0'),
            })
            errors++
          } else if (expected.kind === 'False') {
            await expect(insert).rejects.toMatchObject({ code: '23514' })
            rejections++
          } else await insert
          inserts++
          const load = async (text: string | null) => {
            const value = await readRangeFixture(
              pg,
              `SELECT $1::${target.profile.identity} span`,
              'span',
              target.profile.rangeType,
              [text],
            )
            return value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }
          }
          const row: Row = {
            first: await load(first),
            second: await load(second),
            expected:
              expectedPayload === null
                ? { kind: 'Null' }
                : { kind: 'Value', value: expectedPayload },
            bypass: { kind: 'Value', value: bypass },
          }
          for (let origin = 0; origin < 2; origin++)
            fixtures.push({ name: names[index * 2 + origin]!, row, expected })
        }
    }
    await runCheckParity(directory, 'custommulticonstructors', group, names, fixtures)
    expect(errors).toBeGreaterThan(0)
    expect(rejections).toBeGreaterThan(0)
    await mkdir('artifacts/check-custom-multirange-constructors', { recursive: true })
    await writeFile(
      'artifacts/check-custom-multirange-constructors/report.json',
      JSON.stringify(
        {
          profiles: profiles.length,
          plans: plans.length,
          inserts,
          errors,
          rejections,
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
