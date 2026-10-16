import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import {
  callableBoundary,
  jsonValueRequirements,
} from '../../scripts/check-measurements/catalog.js'
import {
  bindProbe,
  hasUncertain,
  valueRepresentation,
} from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('evaluates timezone-enabled JSONPath calls until unavailable context is reached in every target', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonpath-context-'))
  const known = (value: string | boolean | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  const failure = (code: string): Outcome => ({
    kind: 'Error',
    value: { state: parseInt(code, 36) },
  })
  const variants = ['exists', 'match', 'query_array', 'query_first'].flatMap((method) =>
    [false, true].flatMap((tz) =>
      ['typed', 'runtime', 'guarded', 'default'].map((shape) => {
        const fn = 'jsonb_path_' + method + (tz ? '_tz' : '')
        const args =
          shape === 'default'
            ? 'document,path'
            : 'document,' + (shape === 'typed' ? 'path' : 'source::jsonpath') + ',variables,silent'
        const call = fn + '(' + args + ')'
        const expected =
          method === 'exists' || method === 'match' ? 'expected_bool' : 'expected_json'
        const predicate = call + ' IS NOT DISTINCT FROM ' + expected
        return {
          method,
          tz,
          shape,
          fn,
          call,
          name: method + (tz ? '_tz_' : '_') + shape,
          sql:
            shape === 'guarded'
              ? 'CASE WHEN bypass THEN true ELSE ' + predicate + ' END'
              : predicate,
        }
      }),
    ),
  )
  const candidate = `(SELECT $1::jsonb document,$2::jsonpath path,$3::text source,$4::jsonb variables,$5::boolean silent,$6::boolean bypass,$7::boolean expected_bool,$8::jsonb expected_json) AS candidate`
  try {
    await pg.exec(`CREATE TABLE context_checks(document jsonb,path jsonpath,source text,variables jsonb,silent boolean,bypass boolean,expected_bool boolean,expected_json jsonb,
      ${variants.map(({ name, sql }) => `CONSTRAINT "${name}" CHECK(${sql})`).join(',')})`)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'context_checks')!
    const plans = variants.flatMap(({ name, sql }) => {
      const constraint = table.constraints.find((item) => item.name === name)!
      return ['source', 'stored'].map((origin) => ({
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source' ? { ...constraint, definition: `CHECK(${sql})` } : constraint,
            [],
            [],
            origin === 'source' ? 'source' : 'stored',
          )!.expression,
        ),
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
      }))
    })
    for (const plan of plans)
      expect(hasUncertain(plan.expression), plan.identity.constraint).toBe(false)
    for (const [index, plan] of plans.entries())
      if (variants[Math.floor(index / 2)]!.tz)
        expect(hasUncertain(portableCheckAtoms(plan.expression, false))).toBe(true)
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      defaultCtype: 'C.UTF-8',
      serverEncoding: 'UTF8',
    })
    for (const check of group.checks)
      expect(check.kind, 'reason' in check ? check.reason : '').toBe('supported')
    expect(group.evaluatorSource).toContain('jsonpath_exists_tz_context(')
    expect(group.evaluatorSource).toContain('jsonpath_match_tz_context(')
    expect(group.evaluatorSource).toContain('jsonpath_query_array_tz_context(')
    expect(group.evaluatorSource).toContain('jsonpath_query_first_tz_context(')

    type Case = {
      document: string | null
      path: string
      source?: string
      variables?: string | null
      silent?: boolean | null
      bypass?: boolean
      deferred?: boolean
      nonTzDeferred?: boolean
      existsPrefix?: boolean
    }
    const cases: Case[] = [
      { document: 'true', path: '$' },
      { document: 'null', path: '$' },
      { document: '[true,false]', path: '$[*]' },
      { document: '{}', path: '$.missing' },
      { document: '{}', path: 'strict $.missing' },
      { document: '{}', path: '$missing' },
      { document: '{}', path: '(1/0)==1' },
      { document: '{}', path: '1/0' },
      { document: '{}', path: '$v', variables: '{"v":true}' },
      { document: '{}', path: '$', variables: '[]' },
      { document: '"Abc"', path: '$ like_regex "abc" flag "i"' },
      { document: '"12 PM"', path: '$.datetime("HH12 AM").type()' },
      { document: '{"a":"12:34:56+03:00"}', path: '$.keyvalue().value.time()=="12:34:56".time()' },
      {
        document: '"2024-02-29"',
        path: '(1==1)||($.timestamp_tz()=="2024-02-29T00:00:00Z".datetime())',
      },
      {
        document: '"2024-02-29"',
        path: '(1==2)&&($.timestamp_tz()=="2024-02-29T00:00:00Z".datetime())',
      },
      {
        document: '"2024-02-29"',
        path: '($.timestamp_tz()=="2024-02-29T00:00:00Z".datetime()) is unknown',
        deferred: true,
      },
      { document: 'true', path: '$', source: '$ like_regex "["' },
      { document: 'true', path: '$', source: '$ like_regex "["', bypass: true },
      { document: 'true', path: '$', source: '$.time(-2)' },
      { document: 'true', path: '$', source: '$.time(-2)', bypass: true },
      { document: 'true', path: '$', variables: null },
      { document: null, path: '$' },
      { document: 'true', path: '$', silent: null },
      { document: '"bad"', path: '$.datetime()' },
      { document: '1', path: '$.time()' },
      {
        document: '[true,"2024-02-29"]',
        path: '$[*]?(@==true || @.timestamp_tz()=="2024-02-29T00:00:00Z".datetime())',
        deferred: true,
        existsPrefix: true,
      },
    ]
    const temporal = [
      '2024-02-29',
      '12:34:56.123456',
      '12:34:56.123456+03:30',
      '2024-02-29T12:34:56.123456',
      '2024-02-29T12:34:56.123456+03:30',
    ]
    for (const [kind, input] of temporal.entries())
      for (const method of ['date', 'time', 'time_tz', 'timestamp', 'timestamp_tz', 'datetime']) {
        const deferred =
          (method === 'date' && kind === 4) ||
          (method === 'time' && kind === 4) ||
          (method === 'time_tz' && (kind === 1 || kind === 4)) ||
          (method === 'timestamp' && kind === 4) ||
          (method === 'timestamp_tz' && (kind === 0 || kind === 3))
        cases.push({
          document: JSON.stringify(input),
          path: '$.' + method + '()',
          deferred,
          nonTzDeferred: method === 'time_tz' && kind === 4,
        })
      }
    for (const precision of [0, 2, 6, 8])
      cases.push({ document: '"23:59:59.999999-05:30"', path: '$.time(' + precision + ')' })
    for (const [left, input] of temporal.entries())
      for (const [right, other] of temporal.entries()) {
        const calendar = [0, 3, 4]
        const deferred =
          (calendar.includes(left) &&
            calendar.includes(right) &&
            left !== right &&
            (left === 4 || right === 4)) ||
          (left === 1 && right === 2) ||
          (left === 2 && right === 1)
        cases.push({
          document: '{}',
          path: JSON.stringify(input) + '.datetime()==' + JSON.stringify(other) + '.datetime()',
          deferred,
        })
      }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    for (const item of cases) await pg.query('SELECT $1::jsonpath', [item.path])
    for (const zone of ['UTC', 'Pacific/Kiritimati']) {
      await pg.exec('SET TimeZone=' + "'" + zone + "'")
      for (const item of cases)
        for (const suppress of [false, true])
          for (const variant of variants) {
            const silent = Object.hasOwn(item, 'silent') ? item.silent! : suppress
            const parameters = [
              item.document,
              item.path,
              item.source ?? item.path,
              Object.hasOwn(item, 'variables') ? item.variables! : '{}',
              silent,
              item.bypass ?? false,
              null,
              null,
            ]
            let output: string | null = null
            let expected: Outcome = { kind: 'True' }
            if (variant.shape !== 'guarded' || item.bypass !== true) {
              try {
                output = (
                  await pg.query<{ value: string | null }>(
                    `SELECT (${variant.call})::text AS value FROM ${candidate}`,
                    parameters,
                  )
                ).rows[0]!.value
              } catch (error) {
                expected = failure((error as { code: string }).code)
              }
            }
            const bool = variant.method === 'exists' || variant.method === 'match'
            parameters[6] = bool && output !== null ? output === 'true' : null
            parameters[7] = bool ? null : output
            const row: Row = Object.fromEntries(
              [
                'document',
                'path',
                'source',
                'variables',
                'silent',
                'bypass',
                'expected_bool',
                'expected_json',
              ].map((name, index) => [name, known(parameters[index] as string | boolean | null)]),
            )
            let oracle: boolean | null | { error: string }
            try {
              oracle = (
                await pg.query<{ value: boolean | null }>(
                  `SELECT (${variant.sql}) AS value FROM ${candidate}`,
                  parameters,
                )
              ).rows[0]!.value
            } catch (error) {
              oracle = { error: (error as { code: string }).code }
            }
            if (
              ((item.deferred && variant.tz) || item.nonTzDeferred) &&
              !(item.existsPrefix && variant.method === 'exists') &&
              !(variant.shape === 'guarded' && item.bypass)
            )
              expected = { kind: 'Unknown' }
            if (expected.kind !== 'Unknown')
              expect(oracle).toEqual(
                expected.kind === 'Error'
                  ? {
                      error: Number(expected.value.state)
                        .toString(36)
                        .toUpperCase()
                        .padStart(5, '0'),
                    }
                  : true,
              )
            references.push({ zone, variant: variant.name, parameters, output, oracle, expected })
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: variant.name + '_' + origin, row, expected })
          }
    }
    const base: Row = {
      document: known('true'),
      path: known('$'),
      source: known('$'),
      variables: known('{}'),
      silent: known(false),
      bypass: known(false),
      expected_bool: known(true),
      expected_json: known('true'),
    }
    for (const [index, check] of group.checks.entries()) {
      if (check.kind !== 'supported') throw new Error('Unsupported context check')
      const row = {
        ...base,
        expected_json: known(
          variants[Math.floor(index / 2)]!.method === 'query_array' ? '[true]' : 'true',
        ),
      }
      for (const column of ['document', 'path', 'source', 'variables', 'silent'])
        for (const input of [
          { kind: 'Unknown' },
          { kind: 'Error', value: { state: parseInt('22012', 36) } },
        ] as Input[]) {
          const used = check.inputs.some((item) => item.name === column)
          fixtures.push({
            name: plans[index]!.identity.constraint,
            row: { ...row, [column]: input },
            expected: used
              ? input.kind === 'Error'
                ? failure('22012')
                : { kind: 'Unknown' }
              : { kind: 'True' },
          })
        }
    }
    const interfaces = builtinCallables().filter(
      (item) =>
        item.kind === 'function' &&
        item.schema === 'pg_catalog' &&
        [
          'jsonb_path_query',
          'jsonb_path_query_tz',
          'jsonpath_in',
          'jsonpath_out',
          'jsonpath_recv',
        ].includes(item.name),
    )
    expect(interfaces).toHaveLength(5)
    for (const type of ['pg_catalog.cstring', 'pg_catalog.internal']) {
      expect(valueRepresentation(type).represented).toBe(false)
      await expect(
        pg.exec('CREATE TABLE invalid_interface(value ' + type + ')'),
      ).rejects.toMatchObject({ code: '42P16' })
    }
    for (const item of interfaces) {
      const boundary = callableBoundary(
        item,
        new Set(['pg_catalog.jsonb', 'pg_catalog.jsonpath', 'pg_catalog.bool', 'pg_catalog.bytea']),
      )
      expect(boundary.categories).toContain(
        item.returnsSet ? 'set-returning' : 'internal-interface',
      )
      expect(jsonValueRequirements(item)).toEqual(
        expect.arrayContaining([expect.objectContaining({ kind: 'interface' })]),
      )
      if (item.returnsSet) {
        const sql = item.name + "('{}'::jsonb,'$'::jsonpath) IS NULL"
        expect(bindProbe(sql, []).fullyBound).toBe(false)
        await expect(
          pg.exec('CREATE TABLE invalid_query_check(value boolean CHECK(' + sql + '))'),
        ).rejects.toMatchObject({ code: '0A000' })
      }
    }
    await mkdir('artifacts/jsonpath-context', { recursive: true })
    await writeFile(
      'artifacts/jsonpath-context/fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/jsonpath-context/references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonpathcontextparity',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
