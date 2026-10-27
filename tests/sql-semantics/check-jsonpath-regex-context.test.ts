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
import { captureRegexCharacterProfile } from '../../tools/check-rust/regex-profile.js'
import { jsonValueRequirements } from '../../scripts/check-measurements/catalog.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const root = 'artifacts/goal-checks/jsonpath-regex-context-active'
const known = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })

it('classifies supplied Unicode tables separately from missing context and engine gaps', () => {
  const item = builtinCallables().find(
    (item) => item.kind === 'function' && item.name === 'jsonb_path_query_array',
  )!
  expect(jsonValueRequirements(item)).toContainEqual(
    expect.objectContaining({
      kind: 'database',
      setting: 'database default collation / LC_CTYPE / server_encoding',
      owner: 'tests/sql-semantics/check-jsonpath-regex-context.test.ts',
      requirement: expect.stringContaining('explicitly supplied target class/case tables'),
    }),
  )
  expect(jsonValueRequirements(item)).toContainEqual(
    expect.objectContaining({
      kind: 'implementation',
      requirement: expect.stringContaining(
        'unsupported engine syntax and capacity remain implementation gaps',
      ),
    }),
  )
})

it('uses supplied character facts through public JSONPath settings without replacing independent context or error states', async () => {
  const pg = await PGlite.create(),
    classic = await PGlite.create({ initDbStartParams: ['--lc-collate=C', '--lc-ctype=C'] }),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonpath-regex-context-'))
  try {
    const facts = await captureRegexCharacterProfile(pg)
    const variants = ['exists', 'match', 'query_array', 'query_first'].flatMap((method) =>
      [false, true].map((tz) => {
        const fn = 'jsonb_path_' + method + (tz ? '_tz' : '')
        const call = `${fn}(document,(CASE WHEN runtime_path THEN source_text::jsonpath ELSE path END),'{}'::jsonb,silent)`
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
      const call = `document ${operator} (CASE WHEN runtime_path THEN source_text::jsonpath ELSE path END)`
      variants.push({
        name: name!,
        fn: 'jsonb_path_' + name,
        call,
        bool: true,
        sql: `CASE WHEN bypass THEN true ELSE (${call}) IS NOT DISTINCT FROM expected_bool END`,
      })
    }
    await pg.exec(
      `CREATE TABLE regex_context_paths(document jsonb,path jsonpath,source_text text,runtime_path bool,silent bool,bypass bool,expected_bool bool,expected_json jsonb,${variants.map((v) => `CONSTRAINT ${v.name} CHECK(${v.sql})`).join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'regex_context_paths')!
    const profiles = [
      { name: 'full', collation: true, encoding: true, ctype: 2, facts },
      { name: 'facts_only', collation: true, encoding: true, ctype: 0, facts },
      { name: 'classic', collation: true, encoding: true, ctype: 1, facts },
      { name: 'missing', collation: true, encoding: true, ctype: 2, facts: undefined },
      { name: 'no_collation', collation: false, encoding: true, ctype: 2, facts },
      { name: 'no_encoding', collation: true, encoding: false, ctype: 2, facts },
      {
        name: 'bad_profile',
        collation: true,
        encoding: true,
        ctype: 2,
        facts: { ranges: [0], cases: [] },
      },
      { name: 'no_facts_or_type', collation: true, encoding: true, ctype: 0, facts: undefined },
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
        ...(p.encoding ? { serverEncoding: 'UTF8' as const } : {}),
        ...(p.ctype ? { defaultCtype: p.ctype === 1 ? ('C' as const) : ('C.UTF-8' as const) } : {}),
        ...(p.facts ? { regexCharacterProfile: p.facts } : {}),
      }),
    )
    for (const g of groups)
      for (const c of g.checks) expect(c.kind, 'reason' in c ? c.reason : '').toBe('supported')
    const declarations = new Map(
      groups.flatMap((g) => (g.sharedDeclarations ?? []).map((d) => [d.name, d] as const)),
    )
    const evaluatorSource = groups.map((g) => g.evaluatorSource!).join('\n')
    expect(declarations.size).toBe(2)
    for (const group of groups)
      expect(group.sharedDeclarations?.length).toBe(
        group.evaluatorSource!.includes('check_regex_profile_') ? 1 : 0,
      )
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
      source: assembleCheckRust({
        source: evaluatorSource,
        callables,
        requiresRegex: true,
        sharedDeclarations: [...declarations.values()],
      }),
    }
    const names = plans.flat().map((p) => p.identity.constraint)
    type Case = {
      document: string
      path: string
      locale?: boolean
      unicode?: boolean
      quoted?: boolean
      ascii?: boolean
      raw?: boolean
      hard?: boolean
      collation?: boolean
    }
    const predicate = (
      subject: string,
      pattern: string,
      flags = '',
      extra: Partial<Case> = {},
    ): Case => ({
      document: JSON.stringify(subject),
      path:
        '$ like_regex ' + JSON.stringify(pattern) + (flags ? ' flag ' + JSON.stringify(flags) : ''),
      locale:
        flags.includes('i') ||
        pattern.includes('[') ||
        pattern.includes('\\') ||
        pattern.includes('(?'),
      collation: true,
      unicode: [...(subject + pattern)].some((c) => c.codePointAt(0)! > 127),
      quoted: flags.includes('q') && !flags.includes('i'),
      ...extra,
    })
    const cases: Case[] = [
      predicate('é', '[[:alpha:]]'),
      predicate('中', '[[:upper:]]', 'i'),
      predicate('١', '[[:digit:]]'),
      predicate('é', 'é', 'i'),
      predicate('ſ', 's', 'i'),
      predicate('S', 'ſ', 'i'),
      predicate('s', 'ſ', 'i'),
      predicate('k', 'K', 'i'),
      predicate('K', 'k', 'i'),
      predicate('ǅ', 'ǅ', 'i'),
      predicate('ǅ', '[ǅ-ǅ]', 'i'),
      predicate('𐐨', '\\U00010400', 'i'),
      predicate('é é', '\\m.\\M'),
      predicate('ςΣ', '(ς)\\1', 'i'),
      predicate('ABC', 'abc', 'i', { ascii: true }),
      predicate('abc', '[[:alpha:]]+', '', { ascii: true }),
      predicate('é', '.'),
      predicate('é', 'é', 'q'),
      predicate('abc', 'a', 'q', { ascii: true }),
      predicate('é', '(?c)é'),
      predicate('É', '(?i)é'),
      {
        document: '{"a":"é"}',
        path: '$.keyvalue().value like_regex "[[:alpha:]]"',
        locale: true,
        collation: true,
        unicode: true,
      },
      {
        document: '["é","中","😊"]',
        path: '$[*]?(@ like_regex "[[:alpha:]]")',
        locale: true,
        collation: true,
        unicode: true,
      },
      { document: 'null', path: '$ like_regex "[[:alpha:]]"' },
      { document: '1', path: '$ like_regex "[[:alpha:]]"' },
      { document: '"é"', path: '(1==1)||($ like_regex "[[:alpha:]]")' },
      { document: '"é"', path: '(1==2)&&($ like_regex "[[:alpha:]]")' },
      { document: '"é"', path: '$ like_regex "["', raw: true, hard: true, collation: true },
      {
        document: '"é"',
        path: '$ like_regex "[[:nope:]]"',
        raw: true,
        hard: true,
        collation: true,
      },
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations = []
    for (const p of profiles) {
      const backend = p.ctype === 1 ? classic : pg
      for (const item of cases) {
        const path = item.path
        for (const silent of [false, true])
          for (const v of variants) {
            let output: string | null = null,
              expected: Outcome = { kind: 'True' }
            const document = item.document
            try {
              output = (
                await backend.query<{ value: string | null }>(
                  `WITH args AS MATERIALIZED(SELECT $1::jsonb document,(CASE WHEN $4::bool THEN '$' ELSE $2::text END)::jsonpath path,$2::text source_text,$4::bool runtime_path,$3::bool silent) SELECT (${v.call})::text value FROM args`,
                  [document, path, silent, !!item.raw],
                )
              ).rows[0]!.value
            } catch (e) {
              expected = failure((e as { code: string }).code)
            }
            const missing =
              (!item.quoted && item.collation && !p.collation) ||
              (!item.hard &&
                ((item.unicode && !p.encoding) ||
                  (item.locale &&
                    p.ctype !== 1 &&
                    (p.name === 'bad_profile' || (!p.facts && !(p.ctype === 2 && item.ascii))))))
            if (missing) expected = { kind: 'Unknown' }
            const row: Row = {
              document: known(document),
              path: known(item.raw ? '$' : path),
              source_text: known(path),
              runtime_path: known(!!item.raw),
              silent: known(silent),
              bypass: known(false),
              expected_bool: known(v.bool && output !== null ? output === 'true' : null),
              expected_json: known(v.bool ? null : output),
            }
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: p.name + '_' + v.name + '_' + origin, row, expected })
            observations.push({
              profile: p.name,
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
        source_text: known('$'),
        runtime_path: known(false),
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
    await runCheckParity(directory, 'jsonpath_regex_context', group, names, fixtures)
  } finally {
    await pg.close()
    await classic.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)

it('shares supplied character facts across parent CHECKs and nested domain checks', async () => {
  const pg = await PGlite.create(),
    classic = await PGlite.create({ initDbStartParams: ['--lc-collate=C', '--lc-ctype=C'] }),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonpath-regex-domain-'))
  try {
    const path = '$ like_regex "^é$" flag "i"'
    const sql = {
      domain_only:
        'CASE WHEN bypass THEN true ELSE (value::regex_profile_label)::text IS NOT DISTINCT FROM value END',
      parent_and_domain: `CASE WHEN bypass THEN true ELSE jsonb_path_match(to_jsonb(value),'${path}') IS NOT FALSE AND (value::regex_profile_label)::text IS NOT DISTINCT FROM value END`,
    }
    const setup = `CREATE DOMAIN regex_profile_label AS text CHECK(jsonb_path_match(to_jsonb(VALUE),'${path}'));
      CREATE TABLE regex_profile_domains(value text,bypass bool,${Object.entries(sql)
        .map(([name, body]) => `CONSTRAINT ${name} CHECK(${body})`)
        .join(',')})`
    await pg.exec(setup)
    await classic.exec(setup)
    const facts = await captureRegexCharacterProfile(pg)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'regex_profile_domains')!
    const profiles = [
      { name: 'full', ctype: 'C.UTF-8' as const, facts },
      { name: 'facts_only', ctype: undefined, facts },
      { name: 'classic', ctype: 'C' as const, facts },
      { name: 'missing', ctype: 'C.UTF-8' as const, facts: undefined },
      { name: 'invalid', ctype: 'C.UTF-8' as const, facts: { ranges: [0], cases: [] } },
    ]
    const plans = profiles.map((profile) =>
      Object.entries(sql).flatMap(([name, body]) =>
        (['source', 'stored'] as const).map((origin) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: profile.name + '_' + name + '_' + origin,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              table.constraints.find((c) => c.name === name)!,
              catalog.enums,
              catalog.domains,
              origin,
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
              origin === 'source' ? `CHECK(${body})` : undefined,
            )!.expression,
          ),
        })),
      ),
    )
    const groups = profiles.map((profile, i) =>
      prepareCheckRustGroup(plans[i]!, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        ...(profile.ctype ? { defaultCtype: profile.ctype } : {}),
        ...(profile.facts ? { regexCharacterProfile: profile.facts } : {}),
      }),
    )
    for (const group of groups) {
      for (const check of group.checks)
        expect(check.kind, 'reason' in check ? check.reason : '').toBe('supported')
      expect(group.source!.modules.find((m) => m.name === 'checks')!.files).toHaveLength(
        1 + (group.sharedDeclarations?.length ?? 0),
      )
      expect(group.sharedDeclarations?.length).toBe(
        group.evaluatorSource!.includes('check_regex_profile_') ? 1 : 0,
      )
    }
    const declarations = new Map(
      groups.flatMap((group) => (group.sharedDeclarations ?? []).map((d) => [d.name, d] as const)),
    )
    expect(declarations.size).toBe(2)
    const evaluatorSource = groups.map((group) => group.evaluatorSource).join('\n')
    const callables = builtinCallables().flatMap((item) =>
      item.kind === 'function' && ['jsonb_path_match', 'to_jsonb'].includes(item.name)
        ? [item.rustName]
        : [],
    )
    const group = {
      checks: groups.flatMap((group) => group.checks),
      evaluatorSource,
      requiresRegex: true,
      source: assembleCheckRust({
        source: evaluatorSource,
        callables,
        requiresRegex: true,
        sharedDeclarations: [...declarations.values()],
      }),
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const profile of profiles)
      for (const [name, body] of Object.entries(sql))
        for (const value of ['é', 'É', 's', null])
          for (const bypass of [false, true]) {
            let expected: Outcome
            try {
              const result = await (profile.ctype === 'C' ? classic : pg).query<{
                value: boolean | null
              }>(`SELECT (${body}) AS value FROM (SELECT $1::text value,$2::bool bypass) args`, [
                value,
                bypass,
              ])
              const output = result.rows[0]!.value
              expected = { kind: output === null ? 'Null' : output ? 'True' : 'False' }
            } catch (error) {
              expected = failure((error as { code: string }).code)
            }
            if (
              !bypass &&
              value !== null &&
              (profile.name === 'missing' || profile.name === 'invalid')
            )
              expected = { kind: 'Unknown' }
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: profile.name + '_' + name + '_' + origin,
                row: { value: known(value), bypass: known(bypass) },
                expected,
              })
          }
    await runCheckParity(
      directory,
      'jsonpath_regex_domain',
      group,
      plans.flat().map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await classic.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)
