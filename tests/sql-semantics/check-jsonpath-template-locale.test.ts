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

const root = 'artifacts/goal-checks/jsonpath-template-locale-active'
const known = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })

it('classifies translated JSONPath names as supplied locale requirements', () => {
  const item = builtinCallables().find(
    (item) => item.kind === 'function' && item.name === 'jsonb_path_query_array',
  )!
  const requirements = jsonValueRequirements(item)!
  expect(requirements).toContainEqual(
    expect.objectContaining({
      kind: 'session',
      setting: 'lc_time / database default collation',
      owner: 'tests/sql-semantics/check-jsonpath-template-locale.test.ts',
    }),
  )
  expect(
    requirements.some(
      (item) => item.kind === 'implementation' && item.requirement.startsWith('Translated'),
    ),
  ).toBe(false)
})

it('uses declared C time locale and default collation for reached JSONPath translated fields in every target', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonpath-template-locale-'))
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
    for (const [name, operator] of [
      ['exists_opr', '@?'],
      ['match_opr', '@@'],
    ]) {
      const call = `document ${operator} path`
      variants.push({
        name: name!,
        fn: 'jsonb_path_' + name,
        call,
        bool: true,
        sql: `CASE WHEN bypass THEN true ELSE (${call}) IS NOT DISTINCT FROM expected_bool END`,
      })
    }
    await pg.exec(
      `CREATE TABLE locale_paths(document jsonb,path jsonpath,silent bool,bypass bool,expected_bool bool,expected_json jsonb,${variants.map((v) => `CONSTRAINT ${v.name} CHECK(${v.sql})`).join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'locale_paths')!
    const profiles = [
      { name: 'complete', locale: true, collation: true, zone: 'UTC', definitions: true },
      { name: 'minimal', locale: true, collation: true, zone: undefined, definitions: false },
      { name: 'no_locale', locale: false, collation: true, zone: 'UTC', definitions: true },
      { name: 'no_collation', locale: true, collation: false, zone: 'UTC', definitions: true },
      { name: 'neither', locale: false, collation: false, zone: 'UTC', definitions: true },
    ]
    const packet = root
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
        ...(p.collation ? { defaultCollation: 'C' as const } : {}),
        ...(p.locale ? { timeLocale: 'C' as const } : {}),
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
      format: string
      independent?: boolean
      zone?: boolean
      object?: boolean
      path?: string
    }
    const cases: Case[] = [
      { input: '2024-February-29', format: 'YYYY-TMMonth-DD' },
      { input: '2024-fEbRuArY-29', format: 'YYYY-TMMonth-DD' },
      { input: '2024-Feb-29', format: 'YYYY-TMMon-DD' },
      { input: '2024-09-Thursday', format: 'IYYY-IW-TMDay' },
      { input: '2024-09-Thu', format: 'IYYY-IW-TMDy' },
      { input: '2024-09-Thu', format: 'iyyy-iw-tmdy' },
      { input: '2024-Fébruary-29', format: 'YYYY-TMMonth-DD' },
      { input: '2024-February-30', format: 'YYYY-TMMonth-DD' },
      { input: '2023-February-29', format: 'YYYY-TMMonth-DD' },
      { input: 'January January', format: 'TMMonth TMMonth' },
      { input: 'January February', format: 'TMMonth TMMonth' },
      { input: 'Monday Tuesday', format: 'TMDay TMDay' },
      { input: '5 Thursday', format: 'D TMDay' },
      { input: '4 Thursday', format: 'D TMDay' },
      { input: 'Januaryx', format: 'TMMonth' },
      { input: 'Januaryx', format: 'TMMonth"x"' },
      { input: 'January', format: 'TMMonthTH' },
      { input: 'Januaryth', format: 'TMMonthTH' },
      { input: '', format: 'TMMonth', independent: true },
      { input: 'bad-February', format: 'YYYY-TMMonth', independent: true },
      { input: '2024-February', format: 'IYYY-TMMonth', independent: true },
      { input: '2024', format: 'TMYYYY', independent: true },
      { input: '12 PM', format: 'TMHH12 TMAM', independent: true },
      { input: 'IX', format: 'TMRM', independent: true },
      { input: '2024-February-29', format: 'YYYY-TMMonth-DD', object: true },
      { input: '2024-February-29 12:34:56EST', format: 'YYYY-TMMonth-DD HH24:MI:SSTZ', zone: true },
      {
        input: '2024-February-29 12:34:56EST',
        format: 'YYYY-TMMonth-DD HH24:MI:SSTZ',
        zone: true,
        object: true,
      },
      {
        input: 'January',
        format: 'TMMonth',
        path: '(1==1)||exists($.datetime("TMMonth"))',
        independent: true,
      },
      {
        input: 'January',
        format: 'TMMonth',
        path: '(1==2)&&exists($.datetime("TMMonth"))',
        independent: true,
      },
      { input: '2024-02-29', format: 'YYYY-MM-DD', independent: true },
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations = []
    for (const p of profiles) {
      await pg.exec("SET lc_time='C'; SET TimeZone='UTC'; SET timezone_abbreviations='Default'")
      for (const item of cases) {
        const path =
          item.path ??
          (item.object ? '$.keyvalue().value' : '$') +
            '.datetime(' +
            JSON.stringify(item.format) +
            ')'
        for (const silent of [false, true])
          for (const v of variants) {
            let output: string | null = null,
              expected: Outcome = { kind: 'True' }
            const document = JSON.stringify(item.object ? { a: item.input } : item.input)
            try {
              output = (
                await pg.query<{ value: string | null }>(
                  `WITH args AS MATERIALIZED(SELECT $1::jsonb document,$2::jsonpath path,$3::bool silent) SELECT (${v.call})::text value FROM args`,
                  [document, path, silent],
                )
              ).rows[0]!.value
            } catch (e) {
              expected = failure((e as { code: string }).code)
            }
            const missing =
              !item.independent && (!p.locale || !p.collation || (item.zone && !p.definitions))
            if (missing) expected = { kind: 'Unknown' }
            const row: Row = {
              document: known(document),
              path: known(path),
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
              path,
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
        {
          name,
          row: { ...row, document: { kind: 'Null' } },
          expected: { kind: 'True' },
        },
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
          scope: 'complete-owner',
          observations,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(directory, 'jsonpath_template_locale', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
