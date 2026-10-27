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
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { quoteProfiles } from './check-quote-fixtures.js'

const packet = 'artifacts/goal-checks/format-output-knowledge-active'
const known = (value: string | number | boolean | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }
const fail = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })

it('retains setting-independent errors and success behind unknown formatted bytes', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-format-output-knowledge-'))
  try {
    await pg.exec(
      "SET TimeZone='UTC';SET DateStyle='ISO, MDY';SET extra_float_digits=1;SET IntervalStyle='postgres';SET bytea_output='hex';SET quote_all_identifiers=off",
    )
    const types = [
      'float4',
      'float8',
      'date',
      'timestamp',
      'timestamptz',
      'interval',
      'bytea',
      'point',
      'line',
      'lseg',
      'box',
      'path',
      'polygon',
      'circle',
    ]
    const profiles = [
      ...quoteProfiles.filter((profile) => types.includes(profile.type)),
      { type: 'text', value: "'lower'" },
    ]
    const forms = profiles.map((profile, index) => ({
      ...profile,
      name: 'format_facts_' + index,
      output: `format(pattern,CASE WHEN use_value THEN (${profile.value})::${profile.type} ELSE NULL::${profile.type} END,width,NULL::text)`,
    }))
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE ${form.name}(pattern text,use_value bool,width int,expected text,bypass bool,CONSTRAINT matches CHECK(CASE WHEN bypass THEN true ELSE (${form.output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END),CONSTRAINT nonnull CHECK(CASE WHEN bypass THEN true ELSE format('%s',CASE WHEN use_value THEN (${form.value})::${form.type} ELSE NULL::${form.type} END) IS NOT NULL END))`,
      )
    const catalog = await snapshotCatalog(pg),
      names: string[] = [],
      plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    for (const form of forms)
      for (const origin of ['source', 'stored'] as const)
        for (const constraint of ['matches', 'nonnull']) {
          const table = catalog.tables.find((t) => t.name === form.name)!,
            selected = table.constraints.find((c) => c.name === constraint)!,
            name = form.name + '_' + constraint + '_' + origin
          const source =
            constraint === 'matches'
              ? `CHECK(CASE WHEN bypass THEN true ELSE (${form.output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END)`
              : `CHECK(CASE WHEN bypass THEN true ELSE format('%s',CASE WHEN use_value THEN (${form.value})::${form.type} ELSE NULL::${form.type} END) IS NOT NULL END)`
          const lowered = lowerTableCheck(
            table,
            selected,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
            origin === 'source' ? source : undefined,
          )!
          expect(hasUncertain(lowered.expression), name).toBe(false)
          const expression = portableCheckAtoms(lowered.expression)
          expect(hasUncertain(expression), name).toBe(false)
          names.push(name)
          plans.push({
            identity: { schema: 'public', kind: 'table', owner: form.name, constraint: name },
            expression,
          })
        }
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      timeZone: 'UTC',
    })
    for (const [index, check] of group.checks.entries())
      expect(check.kind, names[index]).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations = []
    const cases: [string, number, string | null][] = [
      ['<%s>%', 3, '22023'],
      ['%s%3$I', 3, '22004'],
      ['%L|%3$I', 3, '22004'],
      ['%I|%3$I', 3, '22004'],
      ['%s%9$s', 3, '22023'],
      ['%1$*2$s%', -2147483648, '22003'],
      ['%1$*2$I', -2147483648, '22003'],
      ['%1$s', 3, null],
      ['%2$s', 3, null],
      ['%1$*1$s', 3, '22P02'],
    ]
    for (const form of forms)
      for (const useValue of [true, false, null])
        for (const [pattern, width, expectedCode] of cases) {
          let value: string | null = null,
            code: string | undefined
          try {
            value = (
              await pg.query<{ value: string | null }>(
                `SELECT ${form.output} value FROM(SELECT $1::text pattern,$2::bool use_value,$3::int width) args`,
                [pattern, useValue, width],
              )
            ).rows[0]!.value
          } catch (e) {
            code = (e as { code: string }).code
          }
          const variableWidth =
            pattern === '%1$*1$s' && useValue === true && ['float4', 'float8'].includes(form.type)
          if (!variableWidth) {
            if (pattern === '%1$*1$s' && !useValue) expect(code).toBeUndefined()
            else if (expectedCode) {
              const wanted = pattern === '%1$*2$I' && !useValue ? '22004' : expectedCode
              expect(code, form.name + pattern + useValue).toBe(wanted)
            } else expect(code).toBeUndefined()
          }
          let expected: Outcome
          if (variableWidth) {
            await pg.exec('SET extra_float_digits=-15')
            const low = (
              await pg.query<{ value: string }>(
                `SELECT format('%1$*1$s',(${form.value})::${form.type}) value`,
              )
            ).rows[0]!.value
            await pg.exec('SET extra_float_digits=1')
            expect(low).toBe('1')
            expect(code).toBe('22P02')
            expected = { kind: 'Unknown' }
          } else if (code) expected = fail(code)
          else
            expected = {
              kind:
                pattern === '%1$s' && useValue === true && form.type !== 'text'
                  ? 'Unknown'
                  : 'True',
            }
          const row = {
            pattern: known(pattern),
            use_value: known(useValue),
            width: known(width),
            expected: known(value),
            bypass: known(false),
          }
          for (const origin of ['source', 'stored']) {
            fixtures.push({ name: form.name + '_matches_' + origin, row, expected })
            fixtures.push({
              name: form.name + '_nonnull_' + origin,
              row,
              expected: { kind: 'True' },
            })
          }
          observations.push({ form: form.name, pattern, useValue, width, value, code, expected })
        }
    for (const form of forms)
      for (const origin of ['source', 'stored'])
        for (const constraint of ['matches', 'nonnull'])
          fixtures.push({
            name: form.name + '_' + constraint + '_' + origin,
            row: {
              pattern: { kind: 'Unknown' },
              use_value: { kind: 'Unknown' },
              width: { kind: 'Unknown' },
              expected: { kind: 'Unknown' },
              bypass: known(true),
            },
            expected: { kind: 'True' },
          })
    await mkdir(packet, { recursive: true })
    await writeFile(packet + '/evaluators.rs', group.evaluatorSource!)
    await writeFile(
      packet + '/summary.json',
      JSON.stringify(
        { profiles: forms.length, checks: names.length, fixtures: fixtures.length, observations },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'format_output_knowledge', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
})

it('defers unavailable captured output bodies while skipping them for NULL datums', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-format-output-body-'))
  try {
    const value = "CASE WHEN use_value THEN 'ready'::opaque_label ELSE NULL::opaque_label END"
    const forms = [
      {
        name: 'formatted',
        expression: `format('%s%',${value}) IS NOT NULL`,
        nullResult: fail('22023'),
      },
      {
        name: 'concatenated',
        expression: `concat('prefix',${value}) IS NOT NULL`,
        nullResult: { kind: 'True' as const },
      },
    ]
    await pg.exec(
      "CREATE TYPE opaque_label AS ENUM ('ready');CREATE TABLE opaque_format(use_value bool," +
        forms.map((form) => `CONSTRAINT ${form.name} CHECK(${form.expression})`).join(',') +
        ')',
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'opaque_format')!
    const enums = catalog.enums.map((item) => ({
      ...item,
      outputFunction: 'public.unavailable_output(public.opaque_label)',
    }))
    const names: string[] = [],
      plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    for (const form of forms)
      for (const origin of ['source', 'stored'] as const) {
        const constraint = table.constraints.find((c) => c.name === form.name)!
        const lowered = lowerTableCheck(
          table,
          constraint,
          enums,
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
          origin === 'source' ? `CHECK(${form.expression})` : undefined,
        )!
        expect(hasUncertain(lowered.expression)).toBe(false)
        const name = 'opaque_' + form.name + '_' + origin
        names.push(name)
        plans.push({
          identity: { schema: 'public', kind: 'table', owner: table.name, constraint: name },
          expression: portableCheckAtoms(lowered.expression),
        })
      }
    const group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    for (const check of group.checks) expect(check.kind).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const form of forms)
      for (const origin of ['source', 'stored']) {
        const name = 'opaque_' + form.name + '_' + origin
        fixtures.push({ name, row: { use_value: known(true) }, expected: { kind: 'Unknown' } })
        for (const value of [false, null])
          fixtures.push({ name, row: { use_value: known(value) }, expected: form.nullResult })
      }
    await expect(pg.query("SELECT format('%s%',NULL::opaque_label)")).rejects.toMatchObject({
      code: '22023',
    })
    expect(
      (await pg.query<{ v: boolean }>("SELECT concat('prefix',NULL::opaque_label) IS NOT NULL v"))
        .rows[0]!.v,
    ).toBe(true)
    await writeFile(packet + '/unavailable-evaluators.rs', group.evaluatorSource!)
    await writeFile(
      packet + '/unavailable-summary.json',
      JSON.stringify({ checks: names.length, fixtures: fixtures.length }, null, 2) + '\n',
    )
    await runCheckParity(root, 'format_unavailable_output', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
})

it('pins the native setting domains used for output bounds', async () => {
  const pg = await PGlite.create()
  try {
    const settings = (
      await pg.query<{
        name: string
        vartype: string
        min_val: string | null
        max_val: string | null
        enumvals: string[] | null
      }>(
        "SELECT name,vartype,min_val,max_val,enumvals FROM pg_settings WHERE name IN('extra_float_digits','IntervalStyle','bytea_output','quote_all_identifiers')",
      )
    ).rows
    expect(settings.find((s) => s.name === 'extra_float_digits')).toMatchObject({
      min_val: '-15',
      max_val: '3',
    })
    expect(settings.find((s) => s.name === 'IntervalStyle')!.enumvals!.sort()).toEqual([
      'iso_8601',
      'postgres',
      'postgres_verbose',
      'sql_standard',
    ])
    expect(settings.find((s) => s.name === 'bytea_output')!.enumvals!.sort()).toEqual([
      'escape',
      'hex',
    ])
    expect(settings.find((s) => s.name === 'quote_all_identifiers')!.vartype).toBe('bool')
    for (const format of ['ISO', 'SQL', 'Postgres', 'German']) {
      const observed = []
      for (const order of ['MDY', 'DMY', 'YMD']) {
        await pg.exec(`SET DateStyle='${format}, ${order}'`)
        observed.push(
          (
            await pg.query(
              "SELECT DATE '2000-01-02'::text AS rendered_date,TIMESTAMP '2000-01-02 03:04:05'::text AS rendered_timestamp",
            )
          ).rows[0],
        )
      }
      expect(observed[2]).toEqual(observed[0])
      if (format === 'ISO' || format === 'German') expect(observed[1]).toEqual(observed[0])
    }
  } finally {
    await pg.close()
  }
})
