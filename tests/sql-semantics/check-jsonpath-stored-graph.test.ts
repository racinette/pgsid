import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  assembleCheckRust,
  prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import { jsonpathStoragePaths } from './check-jsonpath-storage-fixtures.js'
import { builtinMetadata } from '../../src/postgres/builtins/inventory.js'

const packet = 'artifacts/goal-checks/jsonpath-stored-graph-active'
const literal = (s: string) => "'" + s.replaceAll("'", "''") + "'"
const contexts = [{ defaultCollation: 'C' as const, serverEncoding: 'UTF8' as const }, {}]
const known = (value: string | boolean | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }

it('builds captured JSONPath node families and recursive containers without reparsing or runtime settings', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-jsonpath-captured-builders-'))
  try {
    await pg.exec(
      'CREATE DOMAIN captured_path AS jsonpath;CREATE TYPE captured_paths AS(path captured_path,paths captured_path[]);',
    )
    const paths = [...jsonpathStoragePaths, '$.**{2147483647}']
    const forms = paths.flatMap((path, index) => {
      const query = literal(path) + '::jsonpath'
      return [
        {
          index,
          name: `path_${index}_array`,
          output: `jsonb_build_array(${query},NULL::jsonpath)::text`,
        },
        ...(index % 8 === 0
          ? [
              {
                index,
                name: `path_${index}_raw`,
                output: `json_build_object('path',${query},'other',NULL::jsonpath)::text`,
              },
              {
                index,
                name: `path_${index}_container`,
                output: `to_jsonb(ROW(${query}::captured_path,ARRAY[${query}::captured_path,NULL])::captured_paths)::text`,
              },
            ]
          : []),
      ]
    })
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE ${form.name}(expected text,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE (${form.output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END))`,
      )
    const catalog = await snapshotCatalog(pg),
      names: string[] = [],
      plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    for (const [profile] of contexts.entries())
      for (const form of forms)
        for (const origin of ['source', 'stored'] as const) {
          const table = catalog.tables.find((t) => t.name === form.name)!,
            name = `p${profile}_${form.name}_${origin}`
          const lowered = lowerTableCheck(
            table,
            table.constraints[0]!,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
            origin === 'source'
              ? `CHECK(CASE WHEN bypass THEN true ELSE (${form.output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END)`
              : undefined,
          )!
          expect(hasUncertain(lowered.expression), name).toBe(false)
          const expression = portableCheckAtoms(lowered.expression)
          expect(hasUncertain(expression), name).toBe(false)
          names.push(name)
          plans.push({
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: name,
            },
            expression,
          })
        }
    const groups = contexts.map((ctx, index) =>
      prepareCheckRustGroup(
        plans.slice(index * forms.length * 2, (index + 1) * forms.length * 2),
        ctx,
      ),
    )
    for (const group of groups) {
      expect(group.requiresRegex).toBe(false)
      expect(group.evaluatorSource).not.toMatch(
        /\bjsonpath_from_(?:text|stored_text|coerced_source_utf8)\(/u,
      )
    }
    const evaluatorSource = groups.map((g) => g.evaluatorSource).join('\n'),
      group = {
        evaluatorSource,
        requiresRegex: false,
        checks: groups.flatMap((g) => g.checks),
        source: assembleCheckRust({
          source: evaluatorSource,
          callables: [
            ...new Set([...evaluatorSource.matchAll(/\b(sql__\w+)\(/gu)].map((m) => m[1]!)),
          ],
        }),
      }
    for (const [index, check] of group.checks.entries())
      expect(check.kind, names[index]).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations: unknown[] = []
    let inserts = 0
    for (const form of forms) {
      const expected = (await pg.query<{ value: string }>(`SELECT ${form.output} value`)).rows[0]!
        .value
      for (const wanted of [expected, 'wrong', null]) {
        const valid = wanted === expected
        const insert = pg.query(`INSERT INTO ${form.name} VALUES($1,false)`, [wanted])
        if (valid) await insert
        else await expect(insert).rejects.toMatchObject({ code: '23514' })
        inserts++
        for (const [profile] of contexts.entries())
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: `p${profile}_${form.name}_${origin}`,
              row: { expected: known(wanted), bypass: known(false) },
              expected: { kind: valid ? 'True' : 'False' },
            })
      }
      for (const [profile] of contexts.entries())
        for (const origin of ['source', 'stored'])
          fixtures.push({
            name: `p${profile}_${form.name}_${origin}`,
            row: { expected: { kind: 'Unknown' }, bypass: known(true) },
            expected: { kind: 'True' },
          })
      observations.push({ path: paths[form.index], form: form.name, expected })
    }
    await runCheckParity(root, 'jsonpath_captured_builders', group, names, fixtures)
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/builders-summary.json',
      JSON.stringify(
        {
          paths: paths.length,
          forms: forms.length,
          checks: names.length,
          fixtures: fixtures.length,
          inserts,
          profiles: contexts,
          targets: ['Rust', 'Go', 'TypeScript'],
          observations,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 480_000)

it('executes captured grouping without a text round trip while retaining source-input context and lazy errors', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-jsonpath-captured-execution-'))
  try {
    const paths = [
      '(-$.a).abs()',
      '-$.a.abs()',
      '(-$.a.abs()) == 1',
      '((-$.a).abs()) == 1',
      '($.a + ($.b * 2)).double()',
      '$.a.number()',
      '$.a.type()',
      '$.a.floor()',
      '$.a.ceiling()',
      '$.a.size()',
      '$[0,1 to last - 1]',
      '$.**{0 to 1}',
      '$.**{2147483647}',
    ]
    const forms = paths.map((path, index) => ({
      name: `execute_${index}`,
      path,
      output: `jsonb_path_query_first(document::jsonb,${literal(path)}::jsonpath)::text`,
    }))
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE ${form.name}(document text,expected text,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE (${form.output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END))`,
      )
    const catalog = await snapshotCatalog(pg),
      names: string[] = [],
      plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    for (const [profile] of contexts.entries())
      for (const form of forms)
        for (const origin of ['source', 'stored'] as const) {
          const table = catalog.tables.find((t) => t.name === form.name)!,
            name = `p${profile}_${form.name}_${origin}`
          const lowered = lowerTableCheck(
            table,
            table.constraints[0]!,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
            origin === 'source'
              ? `CHECK(CASE WHEN bypass THEN true ELSE (${form.output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END)`
              : undefined,
          )!
          expect(hasUncertain(lowered.expression), name).toBe(false)
          names.push(name)
          plans.push({
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: name,
            },
            expression: portableCheckAtoms(lowered.expression),
          })
        }
    const groups = contexts.map((ctx, index) =>
      prepareCheckRustGroup(
        plans.slice(index * forms.length * 2, (index + 1) * forms.length * 2),
        ctx,
      ),
    )
    for (const group of groups)
      expect(group.evaluatorSource).not.toMatch(
        /\bjsonpath_from_(?:text|stored_text|coerced_source_utf8)\(/u,
      )
    const executor = builtinMetadata(
      'function:["pg_catalog","jsonb_path_query_first"](pg_catalog.jsonb,pg_catalog.jsonpath,pg_catalog.jsonb,pg_catalog.bool)',
    )
    if (executor.kind !== 'function') throw new Error('Expected the native JSONPath scalar query')
    const evaluatorSource = groups.map((g) => g.evaluatorSource).join('\n'),
      group = {
        evaluatorSource,
        requiresRegex: true,
        checks: groups.flatMap((g) => g.checks),
        source: assembleCheckRust({
          source: evaluatorSource,
          requiresRegex: true,
          callables: [
            executor.rustName,
            ...new Set([...evaluatorSource.matchAll(/\b(sql__\w+)\(/gu)].map((m) => m[1]!)),
          ],
        }),
      }
    for (const [index, check] of group.checks.entries())
      expect(check.kind, names[index]).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations: unknown[] = []
    for (const form of forms)
      for (const document of ['{"a":-1,"b":2}', '{"a":"bad"}', '[1,2,3]', null, 'bad']) {
        let expected: string | null = null,
          code: string | undefined
        try {
          expected = (
            await pg.query<{ value: string | null }>(
              `SELECT ${form.output} value FROM (SELECT $1::text document) input`,
              [document],
            )
          ).rows[0]!.value
        } catch (e) {
          code = (e as { code: string }).code
        }
        for (const bypass of [false, true])
          for (const [profile] of contexts.entries())
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: `p${profile}_${form.name}_${origin}`,
                row: {
                  document: known(document),
                  expected: known(expected),
                  bypass: known(bypass),
                },
                expected: bypass
                  ? { kind: 'True' }
                  : code
                    ? { kind: 'Error', value: { state: parseInt(code, 36) } }
                    : { kind: 'True' },
              })
        observations.push({ path: form.path, document, expected, error: code ?? null })
      }
    await runCheckParity(root, 'jsonpath_captured_execution', group, names, fixtures)
    const table = catalog.tables[0]!,
      sql =
        'jsonb_build_array(\'"雪"\'::jsonpath)::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"'
    const uncaptured = lowerTableCheck(
      table,
      { name: 'uncaptured', type: 'check', definition: `CHECK(${sql})` },
      catalog.enums,
      catalog.domains,
      'source',
      catalog.rangeTypes,
      catalog.compositeTypeGraph,
    )!
    expect(
      prepareCheckRustGroup([
        {
          identity: { schema: 'public', kind: 'table', owner: 'uncaptured', constraint: 'value' },
          expression: portableCheckAtoms(uncaptured.expression),
        },
      ]).requiresRegex,
    ).toBe(true)
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/execution-summary.json',
      JSON.stringify(
        {
          paths: paths.length,
          checks: names.length,
          fixtures: fixtures.length,
          targets: ['Rust', 'Go', 'TypeScript'],
          observations,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 480_000)
