import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { runCheckParity, type Outcome, type Row } from '../../tools/check-rust/parity.js'
import {
  customRangeSchema,
  customRangeProfiles,
  customRangeRow,
  nativeCustomRangeOutcome,
  type CustomRangeSample,
} from './check-custom-range-fixtures.js'

type Case = {
  family: string
  sql: string
  native: Outcome
  local?: Outcome
  sample?: Partial<CustomRangeSample>
  forge?: boolean
}

const yes: Outcome = { kind: 'True' },
  no: Outcome = { kind: 'False' },
  unknown: Outcome = { kind: 'Unknown' }

const cases: Case[] = [
  { family: 'integer_span', sql: 'v -|- w', native: no },
  { family: 'integer_span', sql: 'v -|- w', native: no, forge: true },
  { family: 'integer_span', sql: 'm -|- n', native: no, forge: true },
  { family: 'integer_span', sql: 'v < w', native: yes },
  { family: 'integer_span', sql: 'lower(v)=1', native: yes },
  { family: 'discrete_span', sql: 'upper(v)=3', native: yes },
  { family: 'discrete_span', sql: 'v < w', native: yes },
  { family: 'discrete_span', sql: 'v -|- w', native: yes },
  {
    family: 'discrete_span',
    sql: 'v -|- w',
    native: no,
    local: unknown,
    sample: { w: '[4,5]' },
  },
  {
    family: 'discrete_span',
    sql: 'isempty(v*w)',
    native: no,
    local: unknown,
    sample: { v: '[1,3]', w: '[3,5]' },
  },
  { family: 'discrete_span', sql: 'isempty(v*w)', native: yes },
  {
    family: 'discrete_span',
    sql: 'CASE WHEN bypass THEN true ELSE isempty(v*w) END',
    native: yes,
    sample: { bypass: true, v: '[1,3]', w: '[3,5]' },
  },
  {
    family: 'reverse_span',
    sql: 'v<w',
    native: yes,
    local: unknown,
    forge: true,
    sample: { v: '[4,1]', w: '[3,1]', m: '{}', n: '{}' },
  },
  {
    family: 'reverse_span',
    sql: 'lower(v)=4',
    native: yes,
    sample: { v: '[4,1]', w: '[3,1]', m: '{}', n: '{}' },
  },
  {
    family: 'reverse_span',
    sql: 'v @> w',
    native: yes,
    sample: { v: '[4,1]', w: 'empty', m: '{}', n: '{}' },
  },
  {
    family: 'reverse_span',
    sql: 'v<w',
    native: { kind: 'Null' },
    sample: { v: null, w: '[3,1]', m: '{}', n: '{}' },
  },
  {
    family: 'reverse_span',
    sql: 'CASE WHEN bypass THEN true ELSE v<w END',
    native: yes,
    sample: { bypass: true, v: '[4,1]', w: '[3,1]', m: '{}', n: '{}' },
  },
  {
    family: 'reverse_span',
    sql: 'lower(range_merge(m))=8',
    native: yes,
    local: unknown,
    sample: { v: 'empty', w: 'empty', m: '{[8,6],[4,2]}', n: '{}' },
  },
  {
    family: 'reverse_span',
    sql: 'lower(range_merge(m)) IS NULL',
    native: yes,
    sample: { v: 'empty', w: 'empty', m: '{(,6],[4,)}', n: '{}' },
  },
  {
    family: 'opaque_span',
    sql: 'isempty(range_merge(m))',
    local: unknown,
    native: { kind: 'Error', value: { state: parseInt('22000', 36) } },
    sample: { m: '{[1,2],[5,6]}' },
  },
  {
    family: 'opaque_span',
    sql: 'lower(range_merge(m))=1',
    native: yes,
    sample: { m: '{[1,2]}' },
  },
  {
    family: 'opaque_span',
    sql: 'isempty(range_merge(m))',
    native: yes,
    sample: { m: '{}' },
  },
]

function forgeSupport(row: Row): Row {
  const output = structuredClone(row)
  for (const input of Object.values(output)) {
    if (input.kind !== 'Value' || typeof input.value !== 'object') continue
    if ('bounds' in input.value && 'typeName' in input.value)
      input.value.support = { comparison: 2, canonical: 2 }
    if ('ranges' in input.value) {
      input.value.support = { comparison: 2, canonical: 2 }
      for (const member of input.value.ranges)
        if (member.kind === 'Value') member.value.support = { comparison: 2, canonical: 2 }
    }
  }
  return output
}

it('attaches captured support and defers only reached unavailable callbacks, including multirange hull canonicalization', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-custom-range-state-'))
  try {
    await pg.exec(customRangeSchema)
    let catalog = await snapshotCatalog(pg)
    const profiles = customRangeProfiles(catalog)
    const targets = cases.map((probe, index) => ({
      ...probe,
      name: `range_state_${index}`,
      profile: profiles.find((profile) => profile.name === probe.family)!,
    }))
    for (const target of targets) {
      expect(target.profile, target.family).toBeDefined()
      await pg.exec(
        `CREATE TABLE ${target.name}(v ${target.profile.identity},w ${target.profile.identity},m ${target.profile.multirange},n ${target.profile.multirange},e int4,bypass bool,CONSTRAINT valid CHECK(${target.sql}))`,
      )
    }
    catalog = await snapshotCatalog(pg)
    const plans = targets.flatMap((target) => {
      const table = catalog.tables.find((table) => table.name === target.name)!
      return (['source', 'stored'] as const).map((mode) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: target.name,
          constraint: mode,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            mode === 'source'
              ? { name: 'valid', type: 'check', definition: `CHECK(${target.sql})` }
              : table.constraints[0]!,
            catalog.enums,
            catalog.domains,
            mode,
            catalog.rangeTypes,
          )!.expression,
        ),
      }))
    })
    const group = prepareCheckRustGroup(plans)
    for (const [index, plan] of group.checks.entries())
      expect(plan.kind, plans[index]!.identity.owner).toBe('supported')
    const names = plans.map((plan) => plan.identity.owner + '_' + plan.identity.constraint)
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const [index, target] of targets.entries()) {
      const sample: CustomRangeSample = {
        v: '[1,2]',
        w: '[3,4]',
        m: '{[1,2]}',
        n: '{[3,4]}',
        e: '1',
        bypass: false,
        ...target.sample,
      }
      const parameters = [sample.v, sample.w, sample.m, sample.n, sample.e, sample.bypass]
      const seed = `SELECT $1::${target.profile.identity} v,$2::${target.profile.identity} w,$3::${target.profile.multirange} m,$4::${target.profile.multirange} n,$5::int4 e,$6::bool bypass`
      expect(
        await nativeCustomRangeOutcome(
          pg,
          `SELECT (${target.sql}) AS value FROM (${seed}) inputs`,
          parameters,
        ),
        target.name,
      ).toEqual(target.native)
      const insert = pg.query(
        `INSERT INTO ${target.name} SELECT * FROM (${seed}) inputs`,
        parameters,
      )
      if (target.native.kind === 'False')
        await expect(insert).rejects.toMatchObject({ code: '23514' })
      else if (target.native.kind === 'Error')
        await expect(insert).rejects.toMatchObject({
          code: target.native.value.state.toString(36).toUpperCase().padStart(5, '0'),
        })
      else await insert
      const input = await customRangeRow(pg, target.profile, sample)
      const row = target.forge ? forgeSupport(input) : input
      for (let mode = 0; mode < 2; mode++)
        fixtures.push({
          name: names[index * 2 + mode]!,
          row,
          expected: target.local ?? target.native,
        })
    }
    await runCheckParity(directory, 'customrangestate', group, names, fixtures)
    expect(fixtures.filter((fixture) => fixture.expected.kind === 'Unknown')).toHaveLength(10)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
