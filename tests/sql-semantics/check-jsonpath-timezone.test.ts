import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  prepareCheckRustGroup,
  assembleCheckRust,
} from '../../src/codegen/shared/check-rust-source.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { jsonValueRequirements } from '../../scripts/check-measurements/catalog.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const packet = 'artifacts/goal-checks/jsonpath-timezone-active'
const known = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })

it('separates JSONPath timezone settings, transaction date and abbreviation implementation requirements', () => {
  const item = builtinCallables().find(
    (item) => item.kind === 'function' && item.name === 'jsonb_path_query_array_tz',
  )!
  const requirements = jsonValueRequirements(item)!
  expect(requirements).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: 'session',
        setting: 'TimeZone',
        owner: 'tests/sql-semantics/check-jsonpath-timezone.test.ts',
      }),
      expect.objectContaining({
        kind: 'transaction',
        setting: 'local_date',
        owner: 'tests/sql-semantics/check-jsonpath-timezone.test.ts',
      }),
      expect.objectContaining({
        kind: 'implementation',
        requirement: expect.stringContaining('Alphabetic datetime suffix'),
      }),
    ]),
  )
})

it('uses declared session zones for reached JSONPath temporal conversions and comparisons', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonpath-timezone-'))
  try {
    const variants = ['exists', 'match', 'query_array', 'query_first'].flatMap((method) =>
      [false, true].flatMap((tz) =>
        [false, true].map((runtime) => {
          const fn = 'jsonb_path_' + method + (tz ? '_tz' : '')
          const call = `${fn}(document,${runtime ? 'source::jsonpath' : 'path'},variables,silent)`
          const bool = method === 'exists' || method === 'match'
          return {
            name: method + (tz ? '_tz' : '') + (runtime ? '_runtime' : '_typed'),
            fn,
            call,
            bool,
            sql: `CASE WHEN bypass THEN true ELSE (${call}) IS NOT DISTINCT FROM ${bool ? 'expected_bool' : 'expected_json'} END`,
          }
        }),
      ),
    )
    await pg.exec(
      `CREATE TABLE timezone_paths(document jsonb,path jsonpath,source text,variables jsonb,silent bool,bypass bool,expected_bool bool,expected_json jsonb,${variants.map((v) => `CONSTRAINT ${v.name} CHECK(${v.sql})`).join(',')})`,
    )
    const c = await snapshotCatalog(pg),
      table = c.tables.find((t) => t.name === 'timezone_paths')!
    const availableZones = [
      undefined,
      'UTC',
      'America/New_York',
      'Australia/Lord_Howe',
      'Pacific/Apia',
      '167.999',
    ]
    const requestedZones = process.env['PGSID_CHECK_JSONPATH_TIMEZONE_ZONES']?.split(',')
    if (requestedZones)
      expect(
        requestedZones.every((zone) => availableZones.some((item) => (item ?? 'missing') === zone)),
      ).toBe(true)
    const zones = requestedZones
      ? availableZones.filter((zone) => requestedZones.includes(zone ?? 'missing'))
      : availableZones
    const groups = zones.map((zone, index) =>
      prepareCheckRustGroup(
        variants.flatMap((v) =>
          (['source', 'stored'] as const).map((origin) => ({
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: `z${index}_${v.name}_${origin}`,
            },
            expression: portableCheckAtoms(
              lowerTableCheck(
                table,
                table.constraints.find((n) => n.name === v.name)!,
                c.enums,
                c.domains,
                origin,
                c.rangeTypes,
                c.compositeTypeGraph,
                origin === 'source' ? `CHECK(${v.sql})` : undefined,
              )!.expression,
            ),
          })),
        ),
        {
          defaultCollation: 'C',
          defaultCtype: 'C.UTF-8',
          serverEncoding: 'UTF8',
          ...(zone === undefined ? {} : { timeZone: zone }),
        },
      ),
    )
    for (const g of groups)
      for (const check of g.checks)
        expect(check.kind, 'reason' in check ? check.reason : '').toBe('supported')
    const evaluatorSource = groups.map((g) => g.evaluatorSource!).join('\n')
    const callables = builtinCallables()
      .filter(
        (item) =>
          item.kind === 'function' &&
          item.schema === 'pg_catalog' &&
          variants.some((v) => v.fn === item.name),
      )
      .flatMap((item) => (item.kind === 'function' ? [item.rustName] : []))
    const group = {
      checks: groups.flatMap((g) => g.checks),
      evaluatorSource,
      requiresRegex: true,
      source: assembleCheckRust({ source: evaluatorSource, callables, requiresRegex: true }),
    }
    expect(
      group.source.modules
        .find((m) => m.name === 'pg_catalog')!
        .files.some((f) => f.path.endsWith('/timezone_casts.rs')),
    ).toBe(true)
    expect(evaluatorSource).toContain('jsonpath_query_array_tz_session(')
    const names = zones.flatMap((_, i) =>
      variants.flatMap((v) => ['source', 'stored'].map((o) => `z${i}_${v.name}_${o}`)),
    )
    type Case = {
      document: string
      path: string
      context: boolean
      date?: boolean
      nonTzAllowed?: boolean
    }
    const cases: Case[] = []
    const inputs = [
      '2024-03-10',
      '12:34:56.123456',
      '12:34:56.123456+03:30',
      '2024-03-10T02:30:00.123456',
      '2024-03-10T07:30:00.123456+00',
      '2024-11-03T01:30:00.999999',
      '2011-12-30T12:00:00',
    ]
    for (const [kind, input] of inputs.entries())
      for (const method of ['date', 'time', 'time_tz', 'timestamp', 'timestamp_tz', 'datetime']) {
        const local = kind === 3 || kind >= 5,
          instant = kind === 4
        const context =
          (['date', 'time', 'timestamp'].includes(method) && instant) ||
          (method === 'time_tz' && (kind === 1 || instant)) ||
          (method === 'timestamp_tz' && (kind === 0 || local))
        cases.push({
          document: JSON.stringify(input),
          path: `$.${method}()`,
          context,
          date: method === 'time_tz' && kind === 1,
          nonTzAllowed: method === 'time_tz' && instant,
        })
        if (['time', 'time_tz', 'timestamp', 'timestamp_tz'].includes(method))
          cases.push({
            document: JSON.stringify(input),
            path: `$.${method}(0)`,
            context,
            date: method === 'time_tz' && kind === 1,
            nonTzAllowed: method === 'time_tz' && instant,
          })
      }
    const pairs: readonly (readonly [string, string])[] = [
      ['2024-03-10', '2024-03-10T05:00:00+00'],
      ['2024-03-10T02:30:00', '2024-03-10T07:30:00+00'],
      ['2024-11-03T01:30:00', '2024-11-03T06:30:00+00'],
      ['12:34:56', '12:34:56+00'],
    ]
    for (const [a, b] of pairs)
      for (const reverse of [false, true])
        for (const op of ['==', '<', '>'])
          cases.push({
            document: '{}',
            path: `${JSON.stringify(reverse ? b : a)}.datetime()${op}${JSON.stringify(reverse ? a : b)}.datetime()`,
            context: true,
            date: a.startsWith('12:'),
          })
    cases.push(
      {
        document: '{"a":"2024-03-10T02:30:00"}',
        path: '$.keyvalue().value.timestamp_tz()',
        context: true,
      },
      {
        document: '"2024-03-10T02:30:00"',
        path: '(1==1)||($.timestamp_tz()=="2024-03-10T07:30:00+00".datetime())',
        context: false,
      },
    )
    const requestedCases = process.env['PGSID_CHECK_JSONPATH_TIMEZONE_CASES']?.split(',')
    const selectedCases = requestedCases?.map((value) => Number(value))
    if (requestedCases)
      expect(
        requestedCases.every(
          (value, index) => /^\d+$/u.test(value) && selectedCases![index]! < cases.length,
        ),
      ).toBe(true)
    const reportPacket = requestedCases || requestedZones ? packet + '/scoped' : packet
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations = []
    for (const [index, zone] of zones.entries()) {
      await pg.query(`SELECT set_config('TimeZone',$1,false)`, [zone ?? 'UTC'])
      const variable = zone !== undefined && !['UTC', '167.999'].includes(zone)
      for (const [caseIndex, item] of cases.entries()) {
        if (selectedCases && !selectedCases.includes(caseIndex)) continue
        for (const silent of [false, true])
          for (const v of variants) {
            let output: string | null = null,
              expected: Outcome = { kind: 'True' }
            try {
              output = (
                await pg.query<{ value: string | null }>(
                  `WITH args AS MATERIALIZED(SELECT $1::jsonb document,$2::jsonpath path,$2::text source,'{}'::jsonb variables,$3::bool silent) SELECT (${v.call})::text value FROM args`,
                  [item.document, item.path, silent],
                )
              ).rows[0]!.value
            } catch (e) {
              expected = failure((e as { code: string }).code)
            }
            const tz = v.fn.endsWith('_tz')
            if (
              item.context &&
              (tz || item.nonTzAllowed) &&
              (zone === undefined || (variable && item.date))
            )
              expected = { kind: 'Unknown' }
            const row: Row = {
              document: known(item.document),
              path: known(item.path),
              source: known(item.path),
              variables: known('{}'),
              silent: known(silent),
              bypass: known(false),
              expected_bool: known(v.bool && output !== null ? output === 'true' : null),
              expected_json: known(v.bool ? null : output),
            }
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: `z${index}_${v.name}_${origin}`, row, expected })
            observations.push({
              zone: zone ?? null,
              path: item.path,
              document: item.document,
              fn: v.fn,
              silent,
              output,
              expected,
            })
          }
      }
    }
    for (const name of names) {
      const row: Row = {
        document: { kind: 'Unknown' },
        path: known('$'),
        source: known('$'),
        variables: known('{}'),
        silent: known(false),
        bypass: known(false),
        expected_bool: known(null),
        expected_json: known(null),
      }
      fixtures.push(
        { name, row, expected: { kind: 'Unknown' } },
        {
          name,
          row: { ...row, document: { kind: 'Error', value: { state: parseInt('22012', 36) } } },
          expected: failure('22012'),
        },
        { name, row: { ...row, bypass: known(true) }, expected: { kind: 'True' } },
      )
    }
    await mkdir(reportPacket, { recursive: true })
    await writeFile(
      reportPacket + '/summary.json',
      JSON.stringify(
        {
          checks: names.length,
          fixtures: fixtures.length,
          zones: zones.map((z) => z ?? null),
          cases: cases.length,
          selectedCases: selectedCases ?? null,
          scope: requestedCases || requestedZones ? 'selected-cases-or-zones' : 'complete-owner',
          observations,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(directory, 'jsonpath_timezone', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
