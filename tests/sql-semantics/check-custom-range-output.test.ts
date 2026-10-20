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
  type Row,
  type Outcome,
  type Input,
} from '../../tools/check-rust/parity.js'
import type { RangeInputPayload } from '../../tools/check-rust/range-input.js'
import {
  customRangeSchema,
  customRangeProfiles,
  customRangeSamples,
  customRangeRow,
  nativeCustomRangeOutcome,
  type CustomRangeSample,
} from './check-custom-range-fixtures.js'

const forms = [
  { render: 'v::text', field: 'v' },
  { render: '(v::varchar(7))::text', field: 'v' },
  { render: '(v::char(32))::text', field: 'v' },
  { render: 'COALESCE(v,NULL::RANGE_TYPE)::text', field: 'v' },
  { render: 'CASE WHEN bypass THEN NULL::text ELSE v::text END', field: 'v', lazy: true },
  { render: 'm::text', field: 'm' },
  { render: '(m::varchar(8))::text', field: 'm' },
  { render: '(m::char(32))::text', field: 'm' },
  { render: 'v::custom_output_label::text', field: 'v' },
  {
    render: 'CASE WHEN bypass THEN NULL::text ELSE v::custom_output_label::text END',
    field: 'v',
    lazy: true,
  },
] as const

function finiteTemporalRange(value: RangeInputPayload): boolean {
  return value.bounds.some((cell) => {
    if (cell.kind === 'Date') return cell.value !== -2147483648 && cell.value !== 2147483647
    if (cell.kind === 'Timestamp' || cell.kind === 'Timestamptz')
      return cell.value !== -9223372036854775808n && cell.value !== 9223372036854775807n
    return false
  })
}

function needsOutputContext(input: Input): boolean {
  if (input.kind !== 'Value' || typeof input.value !== 'object') return false
  if ('bounds' in input.value && 'typeName' in input.value) return finiteTemporalRange(input.value)
  if ('ranges' in input.value)
    return input.value.ranges.some(
      (member) => member.kind === 'Value' && finiteTemporalRange(member.value),
    )
  return false
}

it('renders captured custom ranges and multiranges through selected subtype output, widths, domains and lazy context requirements', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-custom-range-output-'))
  try {
    await pg.exec(
      "SET DateStyle='ISO,YMD';SET TimeZone='UTC';" +
        customRangeSchema +
        'CREATE DOMAIN custom_output_label AS text CHECK(VALUE IS NULL OR octet_length(VALUE)<20)',
    )
    let catalog = await snapshotCatalog(pg)
    const profiles = customRangeProfiles(catalog)
    expect(profiles).toHaveLength(10)
    const targets = profiles.flatMap((profile, family) =>
      forms.map((form, index) => {
        const render = form.render.replaceAll('RANGE_TYPE', profile.identity)
        return {
          ...form,
          profile,
          render,
          name: `custom_output_${family}_${index}`,
          sql: `(${render}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`,
        }
      }),
    )
    for (const target of targets)
      await pg.exec(
        `CREATE TABLE ${target.name}(v ${target.profile.identity},w ${target.profile.identity},m ${target.profile.multirange},n ${target.profile.multirange},bypass bool,expected text,CONSTRAINT valid CHECK(${target.sql}))`,
      )
    catalog = await snapshotCatalog(pg)
    const plans = targets.flatMap((target) => {
      const table = catalog.tables.find((table) => table.name === target.name)!
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
        expect(hasUncertain(plan.expression), target.name + '/' + origin).toBe(false)
        return {
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: target.name,
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
    const rows = new Map<string, Row>()
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let inserts = 0,
      rejections = 0,
      errors = 0,
      deferred = 0
    for (const [targetIndex, target] of targets.entries()) {
      const samples: CustomRangeSample[] =
        target.profile.name === 'reverse_span'
          ? [
              { v: null, w: null, m: null, n: null, e: null, bypass: false },
              { v: 'empty', w: 'empty', m: '{}', n: '{}', e: '1', bypass: false },
              { v: '(,)', w: 'empty', m: '{(,)}', n: '{}', e: '1', bypass: false },
              { v: '[4,1]', w: '[3,1]', m: '{[8,6],[4,2]}', n: '{}', e: '1', bypass: false },
              { v: '(,6]', w: '[4,)', m: '{(,6],[4,)}', n: '{}', e: '1', bypass: true },
            ]
          : customRangeSamples(target.profile)
      if (
        ['pg_catalog.date', 'pg_catalog."timestamp"', 'pg_catalog.timestamptz'].includes(
          target.profile.elementType,
        )
      )
        samples.push({
          v: '[-infinity,infinity]',
          w: 'empty',
          m: '{[-infinity,infinity]}',
          n: '{}',
          e: null,
          bypass: false,
        })
      if (target.profile.elementType === 'pg_catalog."numeric"')
        samples.push({
          v: '[-0.00,1.2300]',
          w: '[NaN,NaN]',
          m: '{[-0.00,1.2300],[NaN,NaN]}',
          n: '{}',
          e: '-0.00',
          bypass: false,
        })
      for (const [sampleIndex, sample] of samples.entries()) {
        const key = target.profile.identity + '/' + sampleIndex
        if (!rows.has(key)) rows.set(key, await customRangeRow(pg, target.profile, sample))
        const input = rows.get(key)!
        const parameters = [sample.v, sample.w, sample.m, sample.n, sample.bypass]
        const seed = `SELECT $1::${target.profile.identity} v,$2::${target.profile.identity} w,$3::${target.profile.multirange} m,$4::${target.profile.multirange} n,$5::bool bypass,$6::text expected`
        let output: string | null = null
        try {
          output = (
            await pg.query<{ value: string | null }>(
              `SELECT (${target.render}) AS value FROM (${seed}) inputs`,
              [...parameters, null],
            )
          ).rows[0]!.value
        } catch (error) {
          if (!error || typeof error !== 'object' || !('code' in error) || error.code !== '23514')
            throw error
        }
        for (const mismatch of [false, true]) {
          const expected = mismatch ? (output ?? '') + ' mismatch' : output
          const args = [...parameters, expected]
          const native = await nativeCustomRangeOutcome(
            pg,
            `SELECT (${target.sql}) AS value FROM (${seed}) inputs`,
            args,
          )
          const insert = pg.query(`INSERT INTO ${target.name} SELECT * FROM (${seed}) inputs`, args)
          if (native.kind === 'False') {
            await expect(insert).rejects.toMatchObject({ code: '23514' })
            rejections++
          } else if (native.kind === 'Error') {
            await expect(insert).rejects.toMatchObject({
              code: native.value.state.toString(36).toUpperCase().padStart(5, '0'),
            })
            errors++
          } else await insert
          inserts++
          const skipped = 'lazy' in target && target.lazy && sample.bypass
          const local: Outcome =
            !skipped && needsOutputContext(input[target.field]!) ? { kind: 'Unknown' } : native
          if (local.kind === 'Unknown') deferred++
          const row: Row = {
            ...input,
            expected: expected === null ? { kind: 'Null' } : { kind: 'Value', value: expected },
          }
          for (let mode = 0; mode < 2; mode++)
            fixtures.push({ name: names[targetIndex * 2 + mode]!, row, expected: local })
        }
      }
    }
    let stateCases = 0
    const stateRenders: readonly string[] = [
      forms[0]!.render,
      forms[4]!.render,
      forms[5]!.render,
      forms[9]!.render,
    ]
    for (const [index, target] of targets.entries()) {
      if (target.profile.name !== 'integer_span' || !stateRenders.includes(target.render)) continue
      const base = rows.get(target.profile.identity + '/3')!
      const states: { input: Input; expected: Outcome; bypass?: boolean }[] = [
        { input: { kind: 'Null' }, expected: { kind: 'True' } },
        { input: { kind: 'Unknown' }, expected: { kind: 'Unknown' } },
        {
          input: { kind: 'Error', value: { state: parseInt('22012', 36) } },
          expected: { kind: 'Error', value: { state: parseInt('22012', 36) } },
        },
      ]
      const partial = structuredClone(base[target.field]!)
      if (partial.kind === 'Value' && typeof partial.value === 'object') {
        if ('bounds' in partial.value && 'typeName' in partial.value)
          partial.value.bounds[0] = { kind: 'Unknown' }
        if ('ranges' in partial.value) {
          const member = partial.value.ranges[0]!
          if (member.kind === 'Value') member.value.bounds[0] = { kind: 'Unknown' }
        }
      }
      states.push({ input: partial, expected: { kind: 'Unknown' } })
      if ('lazy' in target && target.lazy)
        states.push(
          ...states
            .filter((state) => state.input.kind === 'Unknown' || state.input.kind === 'Error')
            .map((state) => ({ ...state, bypass: true, expected: { kind: 'True' as const } })),
        )
      for (const state of states) {
        const row: Row = {
          ...base,
          [target.field]: state.input,
          expected: { kind: 'Null' },
          bypass: { kind: 'Value', value: state.bypass ?? false },
        }
        for (let mode = 0; mode < 2; mode++)
          fixtures.push({ name: names[index * 2 + mode]!, row, expected: state.expected })
        stateCases++
      }
    }
    await runCheckParity(directory, 'customrangeoutput', group, names, fixtures)
    expect(rejections).toBeGreaterThan(0)
    expect(errors).toBeGreaterThan(0)
    expect(deferred).toBeGreaterThan(0)
    await mkdir('artifacts/check-custom-range-output', { recursive: true })
    await writeFile(
      'artifacts/check-custom-range-output/report.json',
      JSON.stringify(
        {
          profiles: profiles.length,
          forms: forms.length,
          plans: plans.length,
          inserts,
          rejections,
          errors,
          deferred,
          stateCases,
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
