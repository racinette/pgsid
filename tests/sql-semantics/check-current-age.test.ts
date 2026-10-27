import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { isTemporalCurrentAge } from '../../src/sql-semantics/temporal-casts.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { checkUnknownMessage } from '../../src/codegen/shared/check-diagnostics.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const packet = 'artifacts/goal-checks/current-age-active'
const known = (value: string | boolean | bigint | number | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })
const interval = (hex: string | null): Input => {
  if (hex === null) return { kind: 'Null' }
  const bytes = Buffer.from(hex, 'hex')
  return {
    kind: 'Value',
    value: {
      time: bytes.readBigInt64BE(),
      days: bytes.readInt32BE(8),
      months: bytes.readInt32BE(12),
    },
  }
}

it('selects only strict one-argument stable calendar age overloads', () => {
  const items = builtinCallables().filter(isTemporalCurrentAge)
  expect(items).toHaveLength(2)
  for (const item of items) {
    expect(isTemporalCurrentAge({ ...item, schema: 'custom' })).toBe(false)
    expect(isTemporalCurrentAge({ ...item, strict: false })).toBe(false)
    expect(isTemporalCurrentAge({ ...item, volatility: 'i' })).toBe(false)
    expect(isTemporalCurrentAge({ ...item, returnsSet: true })).toBe(false)
    expect(isTemporalCurrentAge({ ...item, args: [...item.args, ...item.args] })).toBe(false)
    expect(isTemporalCurrentAge({ ...item, args: ['pg_catalog.xid'] })).toBe(false)
    expect(isTemporalCurrentAge({ ...item, result: 'pg_catalog.int4' })).toBe(false)
  }
})

it('retains current-age NULL and infinite results without sampling a client clock or generation date', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-current-age-'))
  try {
    await pg.exec(`CREATE DOMAIN local_age_stamp AS timestamp;
      CREATE DOMAIN instant_age_stamp AS timestamptz;
      CREATE DOMAIN current_age_interval AS interval`)
    const profiles = [
      { name: 'local', type: 'timestamp', base: 'timestamp' },
      { name: 'instant', type: 'timestamptz', base: 'timestamptz' },
      { name: 'local_domain', type: 'local_age_stamp', base: 'timestamp' },
      { name: 'instant_domain', type: 'instant_age_stamp', base: 'timestamptz' },
    ]
    const forms = profiles.flatMap((profile) => {
      const call = 'pg_catalog.age(stamp)'
      return [
        { name: 'direct', call, bool: false },
        {
          name: 'nested',
          call: `(ARRAY[${call}::current_age_interval,NULL::current_age_interval])[1]`,
          bool: false,
        },
        { name: 'coalesced', call: `COALESCE(${call},fallback)`, bool: false },
        { name: 'input', call: `pg_catalog.age(raw_stamp::${profile.base})`, bool: false },
        { name: 'nullness', call: `${call} IS NULL`, bool: true },
      ].map((form) => ({
        ...form,
        profile,
        name: profile.name + '_' + form.name,
        expression: `CASE WHEN bypass THEN true ELSE (${form.call}) IS NOT DISTINCT FROM ${form.bool ? 'expected_bool' : 'expected'} END`,
      }))
    })
    for (const form of forms)
      await pg.exec(`CREATE TABLE current_age_${form.name}(
        stamp ${form.profile.type},raw_stamp text,fallback interval,
        expected interval,expected_bool bool,bypass bool,CHECK(${form.expression}))`)
    const catalog = await snapshotCatalog(pg),
      plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    for (const form of forms)
      for (const origin of ['source', 'stored'] as const) {
        const table = catalog.tables.find((t) => t.name === 'current_age_' + form.name)!,
          lowered = lowerTableCheck(
            table,
            table.constraints[0]!,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
            origin === 'source' ? `CHECK(${form.expression})` : undefined,
          )!
        expect(
          hasUncertain(lowered.expression),
          form.name + origin + JSON.stringify(lowered.expression),
        ).toBe(false)
        expect(checkUnknownMessage(lowered.expression, undefined, { timeZone: 'UTC' })).toContain(
          'transaction current local date',
        )
        plans.push({
          identity: {
            schema: 'public',
            kind: 'table',
            owner: table.name,
            constraint: form.name + '_' + origin,
          },
          expression: portableCheckAtoms(lowered.expression),
        })
      }
    const contexts = [
      { name: 'missing', context: {} },
      { name: 'utc', context: { timeZone: 'UTC' as const } },
    ]
    const groups = contexts.map(({ name, context }) => ({
      name,
      group: prepareCheckRustGroup(plans, context),
    }))
    for (const { group } of groups)
      for (const [index, check] of group.checks.entries())
        expect(check.kind, plans[index]!.identity.constraint + JSON.stringify(check)).toBe(
          'supported',
        )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations = []
    const stamps = [
      null,
      'infinity',
      '-infinity',
      'epoch',
      '2000-02-29 12:34:56.123456+00',
      '4713-01-01+00 BC',
      '294276-12-31 23:59:59.999999+00',
    ]
    for (const zone of ['UTC', 'America/New_York', '167.999', '-167.999']) {
      await pg.query(`SELECT set_config('TimeZone',$1,false)`, [zone])
      for (const form of forms)
        for (const stamp of stamps)
          for (const fallback of [null, '1 day']) {
            const hex = (
              await pg.query<{ value: string | null }>(
                `SELECT encode(${form.profile.base}_send($1::${form.profile.type}),'hex') value`,
                [stamp],
              )
            ).rows[0]!.value
            const input =
              hex === null ? known(null) : known(Buffer.from(hex, 'hex').readBigInt64BE())
            const output = (
              await pg.query<{ value: string | boolean | null }>(
                `WITH args AS MATERIALIZED(SELECT $1::${form.profile.type} stamp,$3::text raw_stamp,$2::interval fallback) SELECT ${form.bool ? `(${form.call})` : `encode(interval_send(${form.call}),'hex')`} value FROM args`,
                [stamp, fallback, stamp],
              )
            ).rows[0]!.value
            const finite = stamp !== null && stamp !== 'infinity' && stamp !== '-infinity'
            const expected: Outcome = { kind: finite ? 'Unknown' : 'True' }
            const row: Row = {
              stamp: input,
              raw_stamp: known(stamp),
              fallback: interval(
                (
                  await pg.query<{ value: string | null }>(
                    `SELECT encode(interval_send($1::interval),'hex') value`,
                    [fallback],
                  )
                ).rows[0]!.value,
              ),
              expected: interval(form.bool ? null : (output as string | null)),
              expected_bool: known(form.bool ? (output as boolean | null) : null),
              bypass: known(false),
            }
            for (const origin of ['source', 'stored']) {
              const name = form.name + '_' + origin
              fixtures.push({ name, row, expected })
              if (!finite)
                fixtures.push({
                  name,
                  row: {
                    ...row,
                    ...(form.bool
                      ? { expected_bool: known(!output) }
                      : {
                          expected: interval(
                            output === null ? '00000000000000000000000100000000' : null,
                          ),
                        }),
                  },
                  expected: { kind: 'False' },
                })
            }
            observations.push({ zone, form: form.name, stamp, fallback, output, expected })
          }
    }
    for (const form of forms)
      for (const origin of ['source', 'stored']) {
        const name = form.name + '_' + origin
        const row: Row = {
          stamp: { kind: 'Unknown' },
          raw_stamp: { kind: 'Unknown' },
          fallback: known(null),
          expected: known(null),
          expected_bool: known(null),
          bypass: known(false),
        }
        fixtures.push({ name, row, expected: { kind: 'Unknown' } })
        fixtures.push({
          name,
          row: { ...row, stamp: error('22008') as Input, raw_stamp: error('22008') as Input },
          expected: error('22008'),
        })
        fixtures.push({
          name,
          row: {
            ...row,
            stamp: error('22008') as Input,
            raw_stamp: error('22008') as Input,
            bypass: known(true),
          },
          expected: { kind: 'True' },
        })
        if (form.name.endsWith('_input')) {
          await expect(
            pg.query(
              `WITH args AS MATERIALIZED(SELECT '2000-13-01 00:00:00+00'::text raw_stamp) SELECT ${form.call} FROM args`,
            ),
          ).rejects.toMatchObject({ code: '22008' })
          fixtures.push({
            name,
            row: { ...row, raw_stamp: known('2000-13-01 00:00:00+00') },
            expected: error('22008'),
          })
        }
      }
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/summary.json',
      JSON.stringify(
        {
          profiles: profiles.length,
          checks: plans.length,
          contexts: contexts.map((c) => c.name),
          fixturesPerContext: fixtures.length,
          observations,
        },
        null,
        2,
      ) + '\n',
    )
    for (const { name, group } of groups)
      await runCheckParity(
        directory,
        'current_age_' + name,
        group,
        plans.map((p) => p.identity.constraint),
        fixtures,
      )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
