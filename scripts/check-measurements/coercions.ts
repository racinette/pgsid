import { refcursorInputForms } from '../../tests/sql-semantics/check-refcursor-input-forms.js'
import {
  snapshotInputForms,
  invalidSnapshotInputForms,
} from '../../tests/sql-semantics/check-snapshot-input-forms.js'
import { isSnapshotType } from '../../src/sql-semantics/expressions.js'
import {
  polygonInputForms,
  deferredPolygonPlatformForms,
} from '../../tests/sql-semantics/check-polygon-input-forms.js'
import {
  pathInputForms,
  deferredPathPlatformForms,
} from '../../tests/sql-semantics/check-path-input-forms.js'
import {
  nameInputForms,
  nameContextInputForms,
} from '../../tests/sql-semantics/check-name-input-forms.js'
import { internalCharInputForms } from '../../tests/sql-semantics/check-internal-char-input-forms.js'
import { oidAliasInputForms } from '../../tests/sql-semantics/check-oid-aliases-input-forms.js'
import {
  tidInputForms,
  deferredTidPlatformForms,
} from '../../tests/sql-semantics/check-tid-input-forms.js'
import { pgLsnInputForms } from '../../tests/sql-semantics/check-pg-lsn-input-forms.js'
import {
  identifier32InputForms,
  deferredIdentifier32PlatformForms,
  xid8InputForms,
  deferredXid8PlatformForms,
} from '../../tests/sql-semantics/check-system-identifiers-input-forms.js'
import {
  oidInputForms,
  deferredOidPlatformForms,
} from '../../tests/sql-semantics/check-oid-input-forms.js'
import {
  moneyInputForms,
  deferredMoneyContextForms,
} from '../../tests/sql-semantics/check-money-input-forms.js'
import {
  circleInputForms,
  deferredCirclePlatformForms,
} from '../../tests/sql-semantics/check-circle-input-forms.js'
import {
  boxInputForms,
  deferredBoxPlatformForms,
} from '../../tests/sql-semantics/check-box-input-forms.js'
import {
  lsegInputForms,
  deferredLsegPlatformForms,
} from '../../tests/sql-semantics/check-lseg-input-forms.js'
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

const nanBinaryPrecision = {
  requirement: 'platform',
  semanticValue: 'known',
  binaryOutput: 'Unknown',
  explicitRowBits: 'preserved',
  owner: 'tests/sql-semantics/check-platform-nan.test.ts',
} as const

const inputForms = [
  ...(['pg_catalog.pg_snapshot', 'pg_catalog.txid_snapshot'] as const).map((type) => ({
    type,
    suite: 'tests/sql-semantics/check-snapshot-runtime.test.ts',
    handled: snapshotInputForms,
    rejected: invalidSnapshotInputForms,
    deferred: [],
    platformDependent: [],
    contextRequired: [],
    unimplementedGrammar: [],
    rowInput: {
      representation: 'SnapshotValue with owned unsigned full-transaction words in signed carriers',
      rawQueryParameters: 'defer to PostgreSQL',
      owner: 'tests/sql-semantics/check-snapshot-write-input.test.ts',
    },
    allocationLimits: {
      maximumInProgress: 134217724,
      textBufferMaximum: 1073741823,
      printfMinimumSpace: 16,
      exceededSqlstate: '54000',
      owner: 'tests/sql-semantics/check-snapshot-limits.test.ts',
    },
    stringCasts: {
      inputs: ['text', 'varchar', 'bpchar', 'name'],
      bpcharOutputSpaces: 'preserved',
      nameOutputContext: ['max_identifier_length'],
      owner: 'tests/sql-semantics/check-snapshot.test.ts',
    },
    binaryInput: {
      inProgressUpperBound: 'inclusive',
      textInputUpperBound: 'exclusive',
      duplicates: 'removed by PostgreSQL before row input',
      owner: 'tests/sql-semantics/check-snapshot-payload.test.ts',
    },
    currentSnapshot: {
      contextRequired: ['active PostgreSQL transaction snapshot'],
      owner: 'tests/sql-semantics/check-snapshot.test.ts',
    },
  })),
  {
    type: 'pg_catalog.name',
    binaryOutput: {
      portable: 'ASCII',
      nonAscii: 'Unknown',
      contextRequired: ['client_encoding'],
      conversionCanError: true,
      owner: 'tests/sql-semantics/check-refcursor.test.ts',
    },
    suite: 'tests/sql-semantics/check-name.test.ts',
    handled: nameInputForms,
    deferred: nameContextInputForms,
    platformDependent: [],
    contextRequired: nameContextInputForms,
    unimplementedGrammar: [],
    textCastRequirement:
      'The deployment max_identifier_length build setting is required to truncate nonempty input; explicitly supplied limits are evaluated in Rust.',
  },
  {
    type: 'pg_catalog."char"',
    suite: 'tests/sql-semantics/check-internal-char.test.ts',
    handled: internalCharInputForms,
    deferred: [],
    platformDependent: [],
    contextRequired: [],
    unimplementedGrammar: [],
  },
  ...oidAliasInputForms.map((forms) => ({
    ...forms,
    suite: 'tests/sql-semantics/check-oid-aliases.test.ts',
    deferred: [...forms.contextRequired, ...forms.platformDependent, ...forms.unimplementedGrammar],
    inputLimit: { unicodeScalars: 4096, outcome: 'Unknown' },
    ...(forms.type === 'pg_catalog.regclass'
      ? {
          textCastRequirement:
            'Catalog text-to-regclass function performs relation-name lookup even for numeric text',
        }
      : {}),
    textOutput: {
      portable: 'zero sentinel',
      requirement: 'Matching database catalog and search path for nonzero object names',
      owner: 'tests/sql-semantics/check-oid-aliases.test.ts',
    },
  })),
  {
    type: 'pg_catalog.tid',
    suite: 'tests/sql-semantics/check-tid.test.ts',
    handled: tidInputForms,
    deferred: deferredTidPlatformForms,
    platformDependent: deferredTidPlatformForms,
    contextRequired: [],
    unimplementedGrammar: [],
    inputLimit: { unicodeScalars: 4096, outcome: 'Unknown' },
  },
  {
    type: 'pg_catalog.pg_lsn',
    suite: 'tests/sql-semantics/check-pg-lsn.test.ts',
    handled: pgLsnInputForms,
    deferred: [],
    platformDependent: [],
    contextRequired: [],
    unimplementedGrammar: [],
    inputLimit: { unicodeScalars: 17, outcome: '22P02' },
  },
  {
    type: 'pg_catalog.xid',
    suite: 'tests/sql-semantics/check-system-identifiers.test.ts',
    handled: identifier32InputForms,
    deferred: deferredIdentifier32PlatformForms,
    platformDependent: deferredIdentifier32PlatformForms,
    contextRequired: [],
    unimplementedGrammar: [],
    inputLimit: { unicodeScalars: 4096, outcome: 'Unknown' },
  },
  {
    type: 'pg_catalog.cid',
    suite: 'tests/sql-semantics/check-system-identifiers.test.ts',
    handled: identifier32InputForms,
    deferred: deferredIdentifier32PlatformForms,
    platformDependent: deferredIdentifier32PlatformForms,
    contextRequired: [],
    unimplementedGrammar: [],
    inputLimit: { unicodeScalars: 4096, outcome: 'Unknown' },
  },
  {
    type: 'pg_catalog.xid8',
    suite: 'tests/sql-semantics/check-system-identifiers.test.ts',
    handled: xid8InputForms,
    deferred: deferredXid8PlatformForms,
    platformDependent: deferredXid8PlatformForms,
    contextRequired: [],
    unimplementedGrammar: [],
    inputLimit: { unicodeScalars: 4096, outcome: 'Unknown' },
  },
  {
    type: 'pg_catalog.oid',
    suite: 'tests/sql-semantics/check-oid.test.ts',
    handled: oidInputForms,
    deferred: deferredOidPlatformForms,
    platformDependent: deferredOidPlatformForms,
    contextRequired: [],
    unimplementedGrammar: [],
    inputLimit: { unicodeScalars: 4096, outcome: 'Unknown' },
  },
  {
    type: 'pg_catalog.money',
    suite: 'tests/sql-semantics/check-money.test.ts',
    handled: moneyInputForms,
    deferred: deferredMoneyContextForms,
    platformDependent: [],
    contextRequired: deferredMoneyContextForms,
    unimplementedGrammar: deferredMoneyContextForms,
    inputLimit: { unicodeScalars: 4096, outcome: 'Unknown' },
  },
  {
    type: 'pg_catalog.refcursor',
    suite: 'tests/sql-semantics/check-refcursor.test.ts',
    handled: refcursorInputForms,
    deferred: [],
    platformDependent: [],
    contextRequired: [],
    unimplementedGrammar: [],
    binaryOutput: {
      portable: 'ASCII',
      nonAscii: 'Unknown',
      contextRequired: ['client_encoding'],
      conversionCanError: true,
      owner: 'tests/sql-semantics/check-refcursor.test.ts',
    },
    portalOperations: {
      contextRequired: ['live cursor and session state'],
      owner: 'tests/sql-semantics/check-refcursor.test.ts',
    },
  },
  {
    type: 'pg_catalog.polygon',
    nanBinaryPrecision: {
      ...nanBinaryPrecision,
      owner: 'tests/sql-semantics/check-polygon-input.test.ts',
    },
    suite: 'tests/sql-semantics/check-polygon-input.test.ts',
    handled: polygonInputForms,
    deferred: deferredPolygonPlatformForms,
    platformDependent: deferredPolygonPlatformForms,
    contextRequired: [],
    unimplementedGrammar: [],
    inputLimit: { unicodeScalars: 4096, outcome: 'Unknown' },
    computedNanBinaryOutput: 'Unknown',
    cachedBounds: {
      explicitRowBits: 'preserved',
      omittedUniqueExtrema: 'derived',
      omittedAmbiguousExtrema: 'Unknown',
      nonNull: 'known',
      binaryLength: 32,
      owner: 'tests/sql-semantics/check-polygon.test.ts',
    },
  },
  {
    type: 'pg_catalog.path',
    nanBinaryPrecision,
    suite: 'tests/sql-semantics/check-path.test.ts',
    handled: pathInputForms,
    deferred: deferredPathPlatformForms,
    platformDependent: deferredPathPlatformForms,
    contextRequired: [],
    unimplementedGrammar: [],
    inputLimit: { unicodeScalars: 4096, outcome: 'Unknown' },
    computedNanBinaryOutput: 'Unknown',
  },
  {
    type: 'pg_catalog.circle',
    nanBinaryPrecision,
    suite: 'tests/sql-semantics/check-circle.test.ts',
    handled: circleInputForms,
    deferred: deferredCirclePlatformForms,
    platformDependent: deferredCirclePlatformForms,
    contextRequired: [],
    unimplementedGrammar: [],
    inputLimit: { unicodeScalars: 4096, outcome: 'Unknown' },
    computedNanBinaryOutput: 'Unknown',
  },
  {
    type: 'pg_catalog.box',
    nanBinaryPrecision,
    suite: 'tests/sql-semantics/check-box.test.ts',
    handled: boxInputForms,
    deferred: deferredBoxPlatformForms,
    platformDependent: deferredBoxPlatformForms,
    contextRequired: [],
    unimplementedGrammar: [],
    inputLimit: { unicodeScalars: 4096, outcome: 'Unknown' },
    computedNanBinaryOutput: 'Unknown',
  },
  {
    type: 'pg_catalog.lseg',
    nanBinaryPrecision,
    suite: 'tests/sql-semantics/check-lseg.test.ts',
    handled: lsegInputForms,
    deferred: deferredLsegPlatformForms,
    platformDependent: deferredLsegPlatformForms,
    contextRequired: [],
    unimplementedGrammar: [],
    inputLimit: { unicodeScalars: 4096, outcome: 'Unknown' },
    computedNanBinaryOutput: 'Unknown',
  },
  {
    type: 'pg_catalog.line',
    nanBinaryPrecision,
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
    nanBinaryPrecision,
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
    nanBinaryPrecision,
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
    const cast =
      target === 'pg_catalog.refcursor'
        ? `CAST(CAST(value AS ${target}) AS pg_catalog.text)`
        : `CAST(value AS ${target})`
    const send = isSnapshotType(target)
      ? target.slice('pg_catalog.'.length) + '_send'
      : target === 'pg_catalog.point'
        ? 'point_send'
        : target === 'pg_catalog.polygon'
          ? 'poly_send'
          : target === 'pg_catalog.refcursor'
            ? 'textsend'
            : null
    const sql = send
      ? `${send}(${cast}) IS NOT DISTINCT FROM ${send}(${cast})`
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
