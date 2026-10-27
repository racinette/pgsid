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
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const root = 'artifacts/goal-checks/jsonpath-abbreviations-active'
const known = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })

it('resolves declared JSONPath abbreviations without confusing missing registry or transaction state with invalid input', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonpath-abbreviations-'))
  try {
    const variants = ['exists', 'match', 'query_array', 'query_first'].flatMap((method) =>
      [false, true].map((tz) => {
        const fn = 'jsonb_path_' + method + (tz ? '_tz' : '')
        const call = `${fn}(document,path,'{}'::jsonb,silent)`
        const bool = method === 'exists' || method === 'match'
        return {
          name: method + (tz ? '_tz' : ''),
          fn,
          call,
          bool,
          sql: `CASE WHEN bypass THEN true ELSE (${call}) IS NOT DISTINCT FROM ${bool ? 'expected_bool' : 'expected_json'} END`,
        }
      }),
    )
    await pg.exec(
      `CREATE TABLE abbreviation_paths(document jsonb,path jsonpath,silent bool,bypass bool,expected_bool bool,expected_json jsonb,${variants.map((v) => `CONSTRAINT ${v.name} CHECK(${v.sql})`).join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'abbreviation_paths')!
    const availableProfiles = [
      { name: 'utc', zone: 'UTC', definitions: true, native: 'Default' },
      { name: 'ny', zone: 'America/New_York', definitions: true, native: 'Default' },
      { name: 'msk', zone: 'Europe/Moscow', definitions: true, native: 'Default' },
      { name: 'session', zone: 'UTC', definitions: false, native: 'Default' },
      { name: 'missing', zone: undefined, definitions: true, native: 'Default' },
      { name: 'registry', zone: 'UTC', definitions: false, native: 'Australia' },
    ]
    const requested = process.env['PGSID_CHECK_JSONPATH_ABBREVIATION_PROFILES']?.split(',')
    if (requested)
      expect(requested.every((n) => availableProfiles.some((p) => p.name === n))).toBe(true)
    const profiles = requested
      ? availableProfiles.filter((p) => requested.includes(p.name))
      : availableProfiles
    const requestedCases = process.env['PGSID_CHECK_JSONPATH_ABBREVIATION_CASES']?.split(',')
    const packet = requested || requestedCases ? root + '/scoped' : root
    const plans = profiles.map((p) =>
      variants.flatMap((v) =>
        (['source', 'stored'] as const).map((origin) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: p.name + '_' + v.name + '_' + origin,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              table.constraints.find((c) => c.name === v.name)!,
              catalog.enums,
              catalog.domains,
              origin,
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
              origin === 'source' ? `CHECK(${v.sql})` : undefined,
            )!.expression,
          ),
        })),
      ),
    )
    const groups = profiles.map((p, i) =>
      prepareCheckRustGroup(plans[i]!, {
        defaultCollation: 'C',
        defaultCtype: 'C.UTF-8',
        serverEncoding: 'UTF8',
        ...(p.zone === undefined ? {} : { timeZone: p.zone }),
        ...(p.definitions ? { timeZoneAbbreviations: 'Default' as const } : {}),
      }),
    )
    for (const g of groups)
      for (const c of g.checks) expect(c.kind, 'reason' in c ? c.reason : '').toBe('supported')
    const evaluatorSource = groups.map((g) => g.evaluatorSource!).join('\n')
    const callables = builtinCallables().flatMap((item) =>
      item.kind === 'function' &&
      item.schema === 'pg_catalog' &&
      variants.some((v) => v.fn === item.name)
        ? [item.rustName]
        : [],
    )
    const group = {
      checks: groups.flatMap((g) => g.checks),
      evaluatorSource,
      requiresRegex: true,
      source: assembleCheckRust({ source: evaluatorSource, callables, requiresRegex: true }),
    }
    const names = plans.flat().map((p) => p.identity.constraint)
    type Case = {
      input: string
      document?: string
      path: string
      word: string
      bare?: boolean
      independent?: boolean
    }
    const cases: Case[] = []
    for (const word of ['Z', 'z', 'UTC', 'GMT', 'EST', 'EDT', 'CST', 'MSK', 'XYZ'])
      for (const bare of [false, true])
        for (const template of [false, true])
          cases.push({
            input:
              (bare
                ? '12:34:56.123456'
                : template
                  ? '2024-02-29 12:34:56.123456'
                  : '2024-02-29T12:34:56.123456') + word,
            path: template
              ? '$.datetime(' +
                JSON.stringify(bare ? 'HH24:MI:SS.USTZ' : 'YYYY-MM-DD HH24:MI:SS.USTZ') +
                ')'
              : '$.datetime()',
            word,
            bare,
          })
    cases.push(
      {
        input: 'EST2024-02-29 12:34:56',
        path: '$.datetime("TZYYYY-MM-DD HH24:MI:SS")',
        word: 'EST',
      },
      {
        input: '2024-02-29 12:34:56ESTUTC',
        path: '$.datetime("YYYY-MM-DD HH24:MI:SSTZTZ")',
        word: 'EST',
      },
      {
        input: '2024-02-29 12:34:56UTC-05',
        path: '$.datetime("YYYY-MM-DD HH24:MI:SSTZTZH")',
        word: 'UTC',
      },
      { input: '2024-13-01T12:34:56Z', path: '$.datetime()', word: 'Z', independent: true },
      { input: '2024-02-29T12:34:56 Z', path: '$.datetime()', word: 'Z', independent: true },
      {
        input: '2024-13-01 12:34:56XYZ',
        path: '$.datetime("YYYY-MM-DD HH24:MI:SSTZ")',
        word: 'XYZ',
      },
      {
        input: '2024-13-01 12:34:56UTC',
        path: '$.datetime("YYYY-MM-DD HH24:MI:SSTZ")',
        word: 'UTC',
      },
      { input: '2024-02-29T01:34:56CST', path: '$.date()', word: 'CST' },
      { input: '12:34:56EST', path: '$.time()', word: 'EST', bare: true },
    )
    cases.push(
      {
        input: '2024-02-29 12:34:56-05UTC',
        path: '$.datetime("YYYY-MM-DD HH24:MI:SSTZHTZ")',
        word: 'UTC',
      },
      {
        input: '2024-02-29 12:34:56EST30',
        path: '$.datetime("YYYY-MM-DD HH24:MI:SSTZTZM")',
        word: 'EST',
      },
      { input: '1900-02-28T12:34:56MSK', path: '$.datetime()', word: 'MSK' },
      { input: '2012-07-01T12:34:56MSK', path: '$.datetime()', word: 'MSK' },
      {
        input: '2024-02-29T12:34:56EST',
        document: '{"a":"2024-02-29T12:34:56EST"}',
        path: '$.keyvalue().value.datetime()',
        word: 'EST',
      },
    )
    const selectedCases = requestedCases?.map((value) => Number(value))
    if (requestedCases)
      expect(
        requestedCases.every(
          (value, index) => /^\d+$/u.test(value) && selectedCases![index]! < cases.length,
        ),
      ).toBe(true)
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations = []
    for (const p of profiles) {
      await pg.query(
        `SELECT set_config('timezone_abbreviations',$1,false),set_config('TimeZone',$2,false)`,
        [p.native, p.zone ?? 'UTC'],
      )
      for (const [caseIndex, item] of cases.entries()) {
        if (selectedCases && !selectedCases.includes(caseIndex)) continue
        for (const silent of [false, true])
          for (const v of variants) {
            let output: string | null = null,
              expected: Outcome = { kind: 'True' }
            const document = item.document ?? JSON.stringify(item.input)
            try {
              output = (
                await pg.query<{ value: string | null }>(
                  `WITH args AS MATERIALIZED(SELECT $1::jsonb document,$2::jsonpath path,$3::bool silent) SELECT (${v.call})::text value FROM args`,
                  [document, item.path, silent],
                )
              ).rows[0]!.value
            } catch (e) {
              expected = failure((e as { code: string }).code)
            }
            const missing =
              !item.independent && (p.zone === undefined || (!p.definitions && item.word !== 'UTC'))
            const date = !item.independent && item.bare && item.word === 'MSK'
            if (missing || date) expected = { kind: 'Unknown' }
            const row: Row = {
              document: known(document),
              path: known(item.path),
              silent: known(silent),
              bypass: known(false),
              expected_bool: known(v.bool && output !== null ? output === 'true' : null),
              expected_json: known(v.bool ? null : output),
            }
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: p.name + '_' + v.name + '_' + origin, row, expected })
            observations.push({
              profile: p.name,
              input: item.input,
              path: item.path,
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
        silent: known(false),
        bypass: known(false),
        expected_bool: known(null),
        expected_json: known(null),
      }
      fixtures.push(
        { name, row, expected: { kind: 'Unknown' } },
        { name, row: { ...row, bypass: known(true) }, expected: { kind: 'True' } },
        {
          name,
          row: { ...row, document: { kind: 'Error', value: { state: parseInt('22012', 36) } } },
          expected: failure('22012'),
        },
      )
    }
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/summary.json',
      JSON.stringify(
        {
          checks: names.length,
          fixtures: fixtures.length,
          profiles: profiles.map((p) => p.name),
          cases: cases.length,
          scope: requested || requestedCases ? 'selected-profiles-or-cases' : 'complete-owner',
          selectedCases: selectedCases ?? null,
          observations,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(directory, 'jsonpath_abbreviations', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
