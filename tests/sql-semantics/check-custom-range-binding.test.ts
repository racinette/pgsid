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
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import {
  customRangeSchema,
  customRangeProfiles,
  customRangeSamples,
  customRangeRow,
  nativeCustomRangeOutcome,
} from './check-custom-range-fixtures.js'

const forms = [
  'isempty(v)',
  'lower_inc(v)',
  'upper_inf(v)',
  'v IS NULL',
  'm IS NOT NULL',
  'lower(v) IS NOT DISTINCT FROM e',
  'upper(v) IS NOT DISTINCT FROM e',
  'lower(COALESCE(v,w,NULL::RANGE_TYPE)) IS NOT DISTINCT FROM e',
  'upper(CASE WHEN bypass THEN w ELSE v END) IS NOT DISTINCT FROM e',
  'v=w',
  'v<w',
  'v @> e',
  'v @> w',
  'v && w',
  'v -|- w',
  'm @> v',
  'v && m',
  'm @> e',
  'm<n',
  'm && n',
  'isempty(range_merge(m))',
  'isempty(v*w)',
  'isempty(v+w)',
  'isempty(v-w)',
  'isempty(m+n)',
  'isempty(m*n)',
  'isempty(m-n)',
  'lower(GREATEST(v,w)) IS NOT DISTINCT FROM e',
  'upper(NULLIF(v,w)) IS NOT DISTINCT FROM e',
  '(v,m)<=(w,n)',
  'CASE WHEN bypass THEN true ELSE v @> e END',
] as const

it('binds captured custom ranges and multiranges through domains, polymorphism, composition and raw/stored INSERT parity', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-custom-range-binding-'))
  try {
    await pg.exec("SET DateStyle='ISO,YMD';SET TimeZone='UTC';" + customRangeSchema)
    let catalog = await snapshotCatalog(pg)
    const profiles = customRangeProfiles(catalog).filter(
      (p) => p.canonical === null && p.name !== 'reverse_span',
    )
    expect(profiles).toHaveLength(7)
    const targets = profiles.flatMap((profile, family) =>
      forms.map((form, index) => ({
        profile,
        name: `custom_range_${family}_${index}`,
        sql: form.replaceAll('RANGE_TYPE', profile.identity),
      })),
    )
    for (const [family, profile] of profiles.entries())
      await pg.exec(
        `CREATE DOMAIN custom_base_${family} AS ${profile.identity};CREATE DOMAIN custom_domain_${family} AS custom_base_${family}`,
      )
    for (const target of targets) {
      const family = profiles.indexOf(target.profile)
      await pg.exec(
        `CREATE TABLE ${target.name}(v custom_domain_${family},w ${target.profile.identity},m ${target.profile.multirange},n ${target.profile.multirange},e ${target.profile.subtype},bypass bool,CONSTRAINT valid CHECK(${target.sql}))`,
      )
    }
    catalog = await snapshotCatalog(pg)
    const plans = targets.flatMap((target) => {
      const table = catalog.tables.find((t) => t.name === target.name)!
      return (['source', 'stored'] as const).map((mode) => {
        const constraint =
          mode === 'source'
            ? { name: 'valid', type: 'check' as const, definition: `CHECK(${target.sql})` }
            : table.constraints[0]!
        const plan = lowerTableCheck(
          table,
          constraint,
          catalog.enums,
          catalog.domains,
          mode,
          catalog.rangeTypes,
        )!
        expect(hasUncertain(plan.expression), target.name + '/' + mode).toBe(false)
        return {
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: target.name,
            constraint: mode,
          },
          expression: portableCheckAtoms(plan.expression),
        }
      })
    })
    const group = prepareCheckRustGroup(plans)
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        'prepare ' +
          plans[index]!.identity.owner +
          '/' +
          plans[index]!.identity.constraint +
          (check.kind === 'unsupported' ? ': ' + check.reason : ''),
      ).toBe('supported')
    const names = plans.map((p) => p.identity.owner + '_' + p.identity.constraint)
    const rows = new Map<string, Row>()
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let inserts = 0,
      rejections = 0,
      errors = 0
    for (const [targetIndex, target] of targets.entries())
      for (const [sampleIndex, sample] of customRangeSamples(target.profile).entries()) {
        const key = target.profile.identity + '/' + sampleIndex
        if (!rows.has(key)) rows.set(key, await customRangeRow(pg, target.profile, sample))
        const parameters = [sample.v, sample.w, sample.m, sample.n, sample.e, sample.bypass]
        const seed = `SELECT $1::${target.profile.identity} v,$2::${target.profile.identity} w,$3::${target.profile.multirange} m,$4::${target.profile.multirange} n,$5::${target.profile.subtype} e,$6::bool bypass`
        const expected = await nativeCustomRangeOutcome(
          pg,
          `SELECT (${target.sql}) AS value FROM (${seed}) inputs`,
          parameters,
        )
        const insert = pg.query(
          `INSERT INTO ${target.name} SELECT * FROM (${seed}) inputs`,
          parameters,
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
        for (let mode = 0; mode < 2; mode++)
          fixtures.push({ name: names[targetIndex * 2 + mode]!, row: rows.get(key)!, expected })
      }
    await runCheckParity(directory, 'customrangebinding', group, names, fixtures)
    expect(fixtures.some((f) => f.expected.kind === 'Null')).toBe(true)
    expect(rejections).toBeGreaterThan(0)
    expect(errors).toBeGreaterThan(0)
    await mkdir('artifacts/check-custom-range-binding', { recursive: true })
    await writeFile(
      'artifacts/check-custom-range-binding/report.json',
      JSON.stringify(
        {
          profiles: profiles.length,
          forms: forms.length,
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
