import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Row,
  type Input,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import {
  customRangeSchema,
  customRangeProfiles,
  nativeCustomRangeOutcome,
} from './check-custom-range-fixtures.js'
import { readRangeFixture, rangeBoundProjection } from './check-range-fixtures.js'

it('executes captured custom bound constructors with scalar/domain coercion, flags, composition, eager preparation and source/stored INSERT parity', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-custom-range-constructors-'))
  try {
    await pg.exec(
      "SET DateStyle='ISO,YMD';SET TimeZone='UTC';" +
        customRangeSchema +
        `
    CREATE DOMAIN "Custom.Range".required AS int4 NOT NULL CHECK(VALUE>0);
    CREATE TYPE "Custom.Range".required_span AS RANGE(subtype="Custom.Range".required);
    CREATE DOMAIN "Custom.Range".rounded AS numeric(4,2) CHECK(VALUE>0);
    CREATE TYPE "Custom.Range".rounded_span AS RANGE(subtype="Custom.Range".rounded);
    CREATE DOMAIN "Custom.Range".preflight AS int4 CHECK(VALUE>0 OR 1/0=0);
    CREATE TYPE "Custom.Range".preflight_span AS RANGE(subtype="Custom.Range".preflight);`,
    )
    let catalog = await snapshotCatalog(pg)
    const profiles = customRangeProfiles(catalog).filter(
      (p) => p.canonical === null && p.name !== 'reverse_span',
    )
    expect(profiles).toHaveLength(10)
    const targets = profiles.flatMap((profile, family) =>
      [
        { name: 'default', expr: `${profile.identity}(lo,hi)` },
        { name: 'flags', expr: `${profile.identity}(lo,hi,flags)` },
        {
          name: 'domain',
          expr: `(${profile.identity}(lo,hi,flags))::constructor_checked_${family}`,
        },
        {
          name: 'coalesce',
          expr: `COALESCE(NULL::${profile.identity},${profile.identity}(lo,hi,flags))`,
        },
      ].map((form, i) => ({
        ...form,
        profile,
        name: `custom_constructor_${family}_${i}`,
        sql: `CASE WHEN bypass THEN true ELSE (${form.expr}) IS NOT DISTINCT FROM expected${profile.elementType === 'pg_catalog."numeric"' ? ` AND (${form.expr})::text IS NOT DISTINCT FROM expected::text` : ''} END`,
      })),
    )
    for (const [family, profile] of profiles.entries())
      await pg.exec(
        `CREATE DOMAIN constructor_checked_${family} AS ${profile.identity} CHECK(isempty(VALUE) OR lower(VALUE) IS NOT NULL)`,
      )
    for (const target of targets)
      await pg.exec(
        `CREATE TABLE ${target.name}(lo ${target.profile.elementType},hi ${target.profile.elementType},flags text,expected ${target.profile.identity},bypass bool,CONSTRAINT valid CHECK(${target.sql}))`,
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
      const [a, b] = temporal ? ['2000-01-01' + suffix, '2000-01-03' + suffix] : ['1', '3']
      const pairs: readonly (readonly [string | null, string | null, string | null])[] = [
        [a!, b!, '[]'],
        [a!, b!, '[)'],
        [a!, b!, '()'],
        [a!, b!, '(]'],
        [null, b!, '[]'],
        [a!, null, '[]'],
        [null, null, '[]'],
        [b!, a!, '[]'],
        [a!, a!, '()'],
        [a!, a!, '[]'],
        [a!, b!, 'invalid'],
        [a!, b!, null],
        ...(temporal ? [['-infinity', 'infinity', '[]'] as const] : [['0', '3', '[]'] as const]),
        ...(target.profile.elementType === 'pg_catalog."numeric"'
          ? [['1.235', '3.456', '[]'] as const, ['99.995', '100', '[]'] as const]
          : []),
      ]
      for (const [lo, hi, flags] of pairs)
        for (const bypass of [false, true]) {
          const cell = async (text: string | null): Promise<Input> => {
            if (text === null) return { kind: 'Null' }
            const projected = (
              await pg.query<{ value: string }>(
                `SELECT ${rangeBoundProjection('$1::' + target.profile.elementType, target.profile.elementType)} value`,
                [text],
              )
            ).rows[0]!.value
            return {
              kind: 'Value',
              value:
                target.profile.elementType === 'pg_catalog."numeric"'
                  ? projected
                  : ['pg_catalog.int4', 'pg_catalog.date'].includes(target.profile.elementType)
                    ? Number(projected)
                    : BigInt(projected),
            }
          }
          let expectedText: string | null = null
          try {
            expectedText = (
              await pg.query<{ value: string }>(
                `WITH inputs AS MATERIALIZED(SELECT $1::${target.profile.elementType} lo,$2::${target.profile.elementType} hi,$3::text flags)SELECT (${target.expr})::text value FROM inputs`,
                [lo, hi, flags],
              )
            ).rows[0]!.value
          } catch (e) {
            if (!(e && typeof e === 'object' && 'code' in e)) throw e
          }
          if (lo === null && hi === null && !bypass) expectedText = 'empty'
          const expectedPayload = await readRangeFixture(
            pg,
            `SELECT $1::${target.profile.identity} span`,
            'span',
            target.profile.rangeType,
            [expectedText],
          )
          const args = [lo, hi, flags, expectedText, bypass]
          const seed = `SELECT $1::${target.profile.elementType} lo,$2::${target.profile.elementType} hi,$3::text flags,$4::${target.profile.identity} expected,$5::bool bypass`
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
          const row: Row = {
            lo: await cell(lo),
            hi: await cell(hi),
            flags: flags === null ? { kind: 'Null' } : { kind: 'Value', value: flags },
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
    await runCheckParity(directory, 'customconstructors', group, names, fixtures)
    expect(errors).toBeGreaterThan(0)
    expect(rejections).toBeGreaterThan(0)
    await mkdir('artifacts/check-custom-range-constructors', { recursive: true })
    await writeFile(
      'artifacts/check-custom-range-constructors/report.json',
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
