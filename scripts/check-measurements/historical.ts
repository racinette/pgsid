import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { historicalExpressionCases, historicalLiteralSamples } from './historical-cases.js'
import { verifiedCatalog } from './catalog.js'
import { inspectExpression, quote, valueRepresentation } from './probes.js'
import { writeReport } from './worlds.js'

export async function measureHistorical(pg: PGlite, selectedNames: readonly string[] = []) {
  const builtin = await verifiedCatalog(pg),
    schema = '_pgsid_measure_historical',
    original = (await pg.query<{ path: string }>("SELECT current_setting('search_path') path"))
      .rows[0]!,
    cases: {
      name: string
      family: 'literal' | 'expression'
      type: string
      shape: string
      value: string
      definition?: string
      requirement?: string
      table?: string
      admission?: { code: string; message: string }
    }[] = [],
    builtins = (
      await pg.query<{ identity: string; name: string }>(`SELECT
        quote_ident(n.nspname)||'.'||quote_ident(t.typname) identity,t.typname name
        FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
        WHERE n.nspname='pg_catalog' AND t.typtype IN ('b','r','m')
        AND NOT EXISTS(SELECT 1 FROM pg_type e WHERE e.typarray=t.oid) ORDER BY 1`)
    ).rows.filter((t) => valueRepresentation(t.identity).represented),
    missingSamples = builtins.filter((t) => historicalLiteralSamples[t.name] === undefined)
  let created = false
  try {
    await pg.exec(`CREATE SCHEMA ${quote(schema)}`)
    created = true
    await pg.exec(`SET search_path=${quote(schema)},pg_catalog;
      CREATE TYPE named_value AS(v int4,label text);CREATE DOMAIN positive AS int4 CHECK(VALUE>=0);
      CREATE TYPE stage AS ENUM('a','b');CREATE TABLE parent_value(n int4);
      CREATE TABLE child_value(d int4) INHERITS(parent_value);
      CREATE FUNCTION chosen(int4) RETURNS int4 LANGUAGE SQL IMMUTABLE AS 'SELECT $1';`)
    for (const t of builtins) {
      const sample = historicalLiteralSamples[t.name]
      if (sample === undefined) continue
      const value = `(${sample})::${t.identity}`,
        array = (
          await pg.query<{ literal: string }>(
            `SELECT quote_literal(ARRAY[${value},NULL::${t.identity}]::text) literal`,
          )
        ).rows[0]!.literal
      for (const [shape, expression, type] of [
        ['scalar', value, t.identity],
        ['null', `NULL::${t.identity}`, t.identity],
        ['array', `${array}::${t.identity}[]`, `${t.identity}[]`],
      ] as const)
        cases.push({
          name: t.identity + ':' + shape,
          family: 'literal',
          type,
          shape,
          value: expression,
        })
    }
    for (const item of historicalExpressionCases)
      cases.push({ ...item, family: 'expression', shape: 'expression' })
    for (const name of selectedNames)
      assert.ok(
        cases.some((c) => c.name === name),
        'Unknown historical probe: ' + name,
      )
    const selected = selectedNames.length
      ? cases.filter((c) => selectedNames.includes(c.name))
      : cases
    for (const [index, item] of selected.entries()) {
      const table = 'history_' + index,
        type = 'omitted_' + index,
        definition = `CHECK(ROW(n,(${item.value}))::${type} IS NOT NULL)`
      try {
        await pg.exec(`CREATE TYPE ${type} AS(n int4,old ${item.type});
          CREATE TABLE ${table}(n int4,d int4,label text COLLATE "C",
            CONSTRAINT observed ${definition});
          ALTER TYPE ${type} DROP ATTRIBUTE old;`)
        item.table = table
        item.definition = definition
      } catch (error) {
        assert.ok(error && typeof error === 'object' && 'code' in error && 'message' in error)
        assert.equal(typeof error.code, 'string')
        assert.equal(typeof error.message, 'string')
        item.admission = { code: error.code as string, message: error.message as string }
      }
    }
    const catalog = await snapshotCatalog(pg),
      source = (
        await pg.query<{ name: string; expression: string }>(
          `SELECT c.relname name,k.conbin::text expression FROM pg_constraint k
            JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
            WHERE n.nspname=$1 AND k.conname='observed'`,
          [schema],
        )
      ).rows,
      rows = selected.map((item) => {
        if (!item.table)
          return { ...item, classification: 'native-rejection' as const, admission: item.admission }
        const table = catalog.tables.find((t) => t.schema === schema && t.name === item.table)!,
          constraint = table.constraints.find((c) => c.name === 'observed')!,
          definition = source.find((s) => s.name === item.table)!.expression,
          plans = Object.fromEntries(
            (['source', 'stored'] as const).map((origin) => {
              const result = lowerTableCheck(
                table,
                constraint,
                catalog.enums,
                catalog.domains,
                origin,
                catalog.rangeTypes,
                catalog.compositeTypeGraph,
                origin === 'source' ? item.definition : undefined,
              )!
              const inspected = inspectExpression(result.expression)
              return [
                origin,
                {
                  fullyBound: inspected.fullyBound,
                  preparation: inspected.preparation.kind,
                },
              ]
            }),
          ),
          complete = constraint.rowCoercionContext?.complete === true,
          captured =
            complete &&
            Object.values(plans).every((p) => p.fullyBound && p.preparation === 'supported')
        return {
          ...item,
          captureComplete: complete,
          nativeTags: [
            ...new Set([...definition.matchAll(/\{([A-Z][A-Z0-9_]*)\b/gu)].map((m) => m[1]!)),
          ].sort(),
          plans,
          classification: captured
            ? ('captured-and-prepared' as const)
            : item.requirement
              ? 'requires-' + item.requirement
              : 'implementation-gap',
        }
      })
    return {
      serverVersion: builtin.serverVersion,
      scope:
        'Nonempty and NULL literal samples for every represented builtin base/range/multirange type, whole literal arrays, and the maintained historical-expression matrix. Capture and preparation observations do not prove executed cross-target parity, complete input grammar or all native expression forms.',
      selection: selectedNames.length ? [...selectedNames] : null,
      missingSamples: missingSamples.map((t) => t.identity),
      summary: {
        representedBuiltinTypes: builtins.length,
        cases: rows.length,
        capturedAndPrepared: rows.filter((r) => r.classification === 'captured-and-prepared')
          .length,
        implementationGaps: rows.filter((r) => r.classification === 'implementation-gap').length,
        nativeRejections: rows.filter((r) => r.classification === 'native-rejection').length,
        requirementDeferrals: rows.filter((r) => r.classification.startsWith('requires-')).length,
      },
      cases: rows,
    }
  } finally {
    try {
      if (created) await pg.exec(`DROP SCHEMA ${quote(schema)} CASCADE`)
    } finally {
      await pg.query("SELECT set_config('search_path',$1,false)", [original.path])
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const pg = await PGlite.create()
  try {
    const report = await measureHistorical(pg, process.argv.slice(2))
    await writeReport('check-historical', report)
    console.table(report.summary)
  } finally {
    await pg.close()
  }
}
