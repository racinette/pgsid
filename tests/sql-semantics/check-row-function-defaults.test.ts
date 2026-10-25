import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import type { EvalBoolExpression } from '../../src/sql-semantics/check-expressions.js'

it('preserves selected defaults, named positions, supplied expressions and preparation across live and historical calls', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-function-defaults-')),
    artifact = 'artifacts/goal-checks/row-function-defaults-active'
  try {
    await pg.exec(`CREATE TYPE result_row AS(n int4,old int4); CREATE TYPE bool_row AS(n int4,old bool);
      CREATE FUNCTION unavailable() RETURNS jsonb LANGUAGE SQL IMMUTABLE AS 'SELECT ''{"min":2}''::jsonb';`)
    const path = "'$ ? (@ > $min)'::jsonpath",
      base = `jsonb_path_exists(document,${path})`,
      named = `jsonb_path_exists(path=>${path},target=>document)`,
      gap = `jsonb_path_exists(target=>document,path=>${path},silent=>false)`,
      vars = `jsonb_path_exists(document,${path},vars)`,
      full = `jsonb_path_exists(document,${path},vars,false)`,
      historical = (call: string) =>
        `ROW(n,CASE WHEN ${call} THEN 1/d ELSE NULL::int4 END)::result_row IS NOT NULL`,
      forms = [
        {
          name: 'live_default',
          expression: `${base} IS NOT DISTINCT FROM expected`,
          defaultVars: true,
        },
        { name: 'historical_default', expression: historical(base), defaultVars: true },
        {
          name: 'live_named',
          expression: `${named} IS NOT DISTINCT FROM expected`,
          defaultVars: true,
        },
        { name: 'historical_named', expression: historical(named), defaultVars: true },
        { name: 'live_gap', expression: `${gap} IS NOT DISTINCT FROM expected`, defaultVars: true },
        { name: 'historical_gap', expression: historical(gap), defaultVars: true },
        {
          name: 'live_vars',
          expression: `${vars} IS NOT DISTINCT FROM expected`,
          defaultVars: false,
        },
        { name: 'historical_vars', expression: historical(vars), defaultVars: false },
        {
          name: 'live_full',
          expression: `${full} IS NOT DISTINCT FROM expected`,
          defaultVars: false,
        },
        { name: 'historical_full', expression: historical(full), defaultVars: false },
        { name: 'nullable', expression: base, defaultVars: true },
        { name: 'bool_row', expression: `ROW(n,${base})::bool_row IS NOT NULL`, defaultVars: true },
        {
          name: 'complex_named',
          expression: `jsonb_path_exists(target=>to_jsonb(GREATEST(n,d)),path=>${path}) IS NOT DISTINCT FROM expected`,
          defaultVars: true,
        },
        {
          name: 'mutation',
          expression: `(jsonb_set('{}'::jsonb,ARRAY['value'],to_jsonb(GREATEST(n,d)))->>'value')::int4 IS NOT DISTINCT FROM GREATEST(n,d)`,
          defaultVars: false,
        },
        {
          name: 'interval',
          expression: `(make_interval(days=>n,months=>d)>INTERVAL '30 days') IS NOT DISTINCT FROM expected`,
          defaultVars: false,
        },
        {
          name: 'historical_interval',
          expression: historical(`make_interval(days=>n,months=>d)>INTERVAL '30 days'`),
          defaultVars: false,
        },
        {
          name: 'complex_interval',
          expression: `(make_interval(secs=>GREATEST(n,d))>INTERVAL '1 second') IS NOT DISTINCT FROM expected`,
          defaultVars: false,
        },
      ]
    for (const f of forms)
      for (const witness of [false, true])
        await pg.exec(
          `CREATE TABLE ${witness ? 'null_' : 'evolving_'}${f.name}(n int4,d int4,document jsonb,vars jsonb,expected bool,bypass bool,CONSTRAINT valid CHECK(${witness ? '(' : ''}CASE WHEN bypass THEN true ELSE ${f.expression} END${witness ? ') IS NULL' : ''}))`,
        )
    await pg.exec(`ALTER TYPE result_row DROP ATTRIBUTE old; ALTER TYPE bool_row DROP ATTRIBUTE old;
      CREATE FUNCTION public.jsonb_path_exists(jsonb,jsonpath) RETURNS bool LANGUAGE SQL IMMUTABLE STRICT AS 'SELECT false';`)
    const profiles = [
        { name: 'original', vars: "'{}'::jsonb", silent: 'false' },
        {
          name: 'computed',
          vars: "jsonb_set('{}'::jsonb,ARRAY['min'],'2'::jsonb)",
          silent: 'true',
        },
        { name: 'error', vars: '\'{"min":2}\'::jsonb', silent: '((1/0)=0)' },
        { name: 'unavailable', vars: 'public.unavailable()', silent: 'false' },
      ],
      plans: {
        name: string
        identity: { schema: string; kind: 'table'; owner: string; constraint: string }
        expression: EvalBoolExpression
      }[] = [],
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      native: unknown[] = [],
      contexts: unknown[] = []
    const input = (value: number | string | boolean | null): Row[string] =>
      value === null ? { kind: 'Null' } : { kind: 'Value', value }
    for (const profile of profiles) {
      await pg.exec(
        `CREATE OR REPLACE FUNCTION pg_catalog.jsonb_path_exists(target jsonb,path jsonpath,vars jsonb DEFAULT ${profile.vars},silent bool DEFAULT ${profile.silent}) RETURNS bool LANGUAGE internal IMMUTABLE STRICT AS 'jsonb_path_exists'`,
      )
      const c = await snapshotCatalog(pg)
      for (const f of forms) {
        const t = c.tables.find((t) => t.name === 'evolving_' + f.name)!,
          k = t.constraints[0]!,
          deferred = profile.name === 'unavailable' && f.defaultVars
        expect(k.rowCoercionContext?.complete ?? true, profile.name + '/' + f.name).toBe(!deferred)
        expect(JSON.stringify(k.rowCoercionContext ?? null)).not.toMatch(/"\w*oid\w*":/iu)
        contexts.push({ profile: profile.name, name: f.name, constraint: k })
        for (const origin of ['source', 'stored'] as const)
          plans.push({
            name: profile.name + '_' + f.name + '_' + origin,
            identity: {
              schema: 'public',
              kind: 'table',
              owner: f.name,
              constraint: profile.name + '_' + origin,
            },
            expression: lowerTableCheck(
              t,
              k,
              c.enums,
              c.domains,
              origin,
              c.rangeTypes,
              c.compositeTypeGraph,
              origin === 'source'
                ? `CHECK(CASE WHEN bypass THEN true ELSE ${f.expression} END)`
                : undefined,
            )!.expression,
          })
        for (const [n, d, document, vars, expected, bypass] of [
          [1, 1, '3', '{"min":2}', true, false],
          [1, 0, '3', '{"min":2}', true, false],
          [1, 0, '0', '{"min":2}', false, false],
          [null, 0, '3', '{"min":2}', true, false],
          [1, 1, null, null, null, false],
          [1, 1, '3', null, null, false],
          [1, null, '3', '{}', false, false],
          [1, 1, '{"a":[1,2]}', '{}', false, false],
          [1, 1, '3', '{"min":2}', false, false],
          [1, 0, '3', '{"min":2}', true, true],
        ] as const) {
          const params = [n, d, document, vars, expected, bypass]
          let error: string | undefined,
            isNull = false
          try {
            await pg.query(
              `INSERT INTO evolving_${f.name} VALUES($1,$2,$3::jsonb,$4::jsonb,$5,$6)`,
              params,
            )
          } catch (e) {
            error = (e as { code: string }).code
          }
          if (!error)
            try {
              await pg.query(
                `INSERT INTO null_${f.name} VALUES($1,$2,$3::jsonb,$4::jsonb,$5,$6)`,
                params,
              )
              isNull = true
            } catch (e) {
              expect((e as { code: string }).code).toBe('23514')
            }
          const nativeExpected: Outcome = error
              ? error === '23514'
                ? { kind: 'False' }
                : { kind: 'Error', value: { state: parseInt(error, 36) } }
              : { kind: isNull ? 'Null' : 'True' },
            row: Row = {
              n: input(n),
              d: input(d),
              document: input(document),
              vars: input(vars),
              expected: input(expected),
              bypass: input(bypass),
            }
          native.push({
            profile: profile.name,
            name: f.name,
            row,
            expected: nativeExpected,
            deferred,
          })
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: profile.name + '_' + f.name + '_' + origin,
              row,
              expected: deferred ? { kind: 'Unknown' } : nativeExpected,
            })
        }
      }
    }
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      clientEncoding: 'UTF8',
    })
    for (const [i, check] of group.checks.entries())
      expect(check.kind, plans[i]!.name + ('reason' in check ? ': ' + check.reason : '')).toBe(
        'supported',
      )
    await mkdir(artifact, { recursive: true })
    for (const [file, value] of Object.entries({
      plans,
      contexts,
      'native-reference': native,
      fixtures,
    }))
      await writeFile(join(artifact, file + '.json'), JSON.stringify(value, null, 2) + '\n')
    await runCheckParity(
      root,
      'example.com/row-function-defaults',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)
