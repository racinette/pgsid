import {
  pointInputForms,
  deferredPointPlatformForms,
} from '../../tests/sql-semantics/check-point-input-forms.js'
import {
  lineInputForms,
  deferredLinePlatformForms,
} from '../../tests/sql-semantics/check-line-input-forms.js'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { verifiedCatalog } from './catalog.js'
import { bindProbe, inspectExpression, valueRepresentation } from './probes.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { writeReport } from './worlds.js'
import { temporalInputForms } from '../../tests/sql-semantics/check-temporal-input-forms.js'
import {
  floatInputForms,
  deferredFloatInputForms,
} from '../../tests/sql-semantics/check-float-input-forms.js'

import {
  clockInputForms,
  timetzInputForms,
  deferredClockContextForms,
  unimplementedClockGrammarForms,
} from '../../tests/sql-semantics/check-time-input-forms.js'

import {
  intervalInputForms,
  deferredIntervalContextForms,
  unimplementedIntervalGrammarForms,
} from '../../tests/sql-semantics/check-interval-input-forms.js'

const inputForms = [
  {
    type: 'pg_catalog.line',
    suite: 'tests/sql-semantics/check-line-input.test.ts',
    handled: lineInputForms,
    deferred: deferredLinePlatformForms,
    platformDependent: deferredLinePlatformForms,
    contextRequired: [],
    unimplementedGrammar: [],
    inputLimit: { unicodeScalars: 4096, outcome: 'Unknown' },
    computedNanBinaryOutput: 'Unknown',
  },
  {
    type: 'pg_catalog.point',
    suite: 'tests/sql-semantics/check-point-input.test.ts',
    handled: pointInputForms,
    deferred: deferredPointPlatformForms,
    platformDependent: deferredPointPlatformForms,
    contextRequired: [],
    unimplementedGrammar: [],
    inputLimit: { unicodeScalars: 4096, outcome: 'Unknown' },
  },
  {
    type: 'pg_catalog."interval"',
    suite: 'tests/sql-semantics/check-interval-input.test.ts',
    handled: intervalInputForms,
    deferred: [...deferredIntervalContextForms, ...unimplementedIntervalGrammarForms],
    contextRequired: deferredIntervalContextForms,
    unimplementedGrammar: unimplementedIntervalGrammarForms,
  },
  ...(['time', 'timetz'] as const).map((family) => ({
    type: family === 'time' ? 'pg_catalog."time"' : 'pg_catalog.timetz',
    suite: 'tests/sql-semantics/check-time-input.test.ts',
    handled: family === 'time' ? clockInputForms : timetzInputForms,
    deferred: [...deferredClockContextForms[family], ...unimplementedClockGrammarForms[family]],
    contextRequired: deferredClockContextForms[family],
    unimplementedGrammar: unimplementedClockGrammarForms[family],
  })),
  ...temporalInputForms,
  ...['pg_catalog.float4', 'pg_catalog.float8'].map((type) => ({
    type,
    suite: 'tests/sql-semantics/check-float-input.test.ts',
    handled: floatInputForms,
    deferred: deferredFloatInputForms,
  })),
]

export async function measureCoercions(pg: PGlite) {
  const catalog = await verifiedCatalog(pg)
  const represented = new Set(
    catalog.types
      .filter((type) => valueRepresentation(type.identity).represented)
      .map((type) => type.identity),
  )
  const collationTypes = new Set(
    (
      await pg.query<{ identity: string }>(
        `SELECT quote_ident(n.nspname)||'.'||quote_ident(t.typname) AS identity
     FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
     WHERE n.nspname='pg_catalog' AND t.typcollation<>0`,
      )
    ).rows.map((type) => type.identity),
  )
  const probe = async (source: string, target: string) => {
    const cast = `CAST(value AS ${target})`
    const sql =
      target === 'pg_catalog.point'
        ? `point_send(${cast}) IS NOT DISTINCT FROM point_send(${cast})`
        : `${cast} IS NOT DISTINCT FROM ${cast}`
    const columns = [
      {
        name: 'value',
        typeName: source,
        ...(collationTypes.has(source)
          ? {
              collationIsC: true,
              collationDeterministic: true,
              collationIsDefault: false,
            }
          : {}),
      },
    ]
    const raw = bindProbe(sql, columns)
    try {
      const stored = await pg.transaction(async (tx) => {
        await tx.exec(
          `CREATE TEMP TABLE _pgsid_measure_cast (value ${source}${collationTypes.has(source) ? ' COLLATE "C"' : ''}, CONSTRAINT probe CHECK (${sql}))`,
        )
        const definition = (
          await tx.query<{ definition: string }>(
            `SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint
           WHERE conrelid = 'pg_temp._pgsid_measure_cast'::regclass AND conname = 'probe'`,
          )
        ).rows[0]!.definition
        const plan = lowerTableCheck({ columns }, { name: 'probe', type: 'check', definition })!
        const result = { definition, ...inspectExpression(plan.expression) }
        await tx.rollback()
        return result
      })
      return { sql, raw, postgres: { accepted: true as const }, stored }
    } catch (error) {
      if (
        !error ||
        typeof error !== 'object' ||
        !('code' in error) ||
        !('message' in error) ||
        typeof error.code !== 'string' ||
        typeof error.message !== 'string'
      )
        throw error
      return {
        sql,
        raw,
        postgres: { accepted: false as const, code: error.code, message: error.message },
        stored: null,
      }
    }
  }
  const casts = []
  for (const cast of catalog.casts) {
    const missingTypes = [cast.source, cast.target].filter((type) => !represented.has(type))
    casts.push({
      ...cast,
      missingTypes,
      probe: missingTypes.length ? null : await probe(cast.source, cast.target),
    })
  }
  const textInput = []
  const textOutput = []
  for (const type of [...represented].sort()) {
    const io = catalog.typeIO.find((io) => io.identity === type)!
    textInput.push({
      type,
      input: io.input,
      cast:
        catalog.casts.find((cast) => cast.source === 'pg_catalog.text' && cast.target === type) ??
        null,
      probe: await probe('pg_catalog.text', type),
    })
    textOutput.push({
      type,
      output: io.output,
      cast:
        catalog.casts.find((cast) => cast.source === type && cast.target === 'pg_catalog.text') ??
        null,
      probe: await probe(type, 'pg_catalog.text'),
    })
  }
  const prepared = (entry: Awaited<ReturnType<typeof probe>>) =>
    entry.postgres.accepted &&
    entry.raw.fullyBound &&
    entry.raw.preparation.kind === 'supported' &&
    entry.stored?.fullyBound &&
    entry.stored.preparation.kind === 'supported'
  return {
    serverVersion: catalog.serverVersion,
    probeContext: {
      valueContract: 'SQL-coerced column values',
      textCollation: 'C',
      castContext: 'explicit',
    },
    summary: {
      catalogCasts: casts.length,
      representedTypes: represented.size,
      representedCastPairs: casts.filter((cast) => !cast.missingTypes.length).length,
      catalogCastsRawAndStoredPrepared: casts.filter((cast) => cast.probe && prepared(cast.probe))
        .length,
      textInputsRawAndStoredPrepared: textInput.filter((entry) => prepared(entry.probe)).length,
      textOutputsRawAndStoredPrepared: textOutput.filter((entry) => prepared(entry.probe)).length,
      maintainedInputForms: inputForms.reduce(
        (count, forms) => count + forms.handled.length + forms.deferred.length,
        0,
      ),
      maintainedDeferredInputForms: inputForms.reduce(
        (count, forms) => count + forms.deferred.length,
        0,
      ),
    },
    casts,
    textInput,
    textOutput,
    inputForms: { evidence: 'maintained parity-suite expectations', types: inputForms },
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const pg = await PGlite.create()
  try {
    const report = await measureCoercions(pg)
    await writeReport('check-coercions', report)
    console.table(report.summary)
  } finally {
    await pg.close()
  }
}
