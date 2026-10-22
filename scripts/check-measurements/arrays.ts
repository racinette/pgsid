import { PGlite } from '@electric-sql/pglite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { verifiedCatalog, hashValueRequirements, jsonValueRequirements } from './catalog.js'
import { writeReport } from './worlds.js'
import { catalogScalarType } from '../../src/sql-semantics/expressions.js'
import { builtinMetadata, builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { callableIdentity } from '../../src/postgres/builtins/catalog.js'
import { checkRustCallableNames } from '../../src/codegen/shared/check-rust-source.js'
import type { BuiltinCallable } from '../../src/postgres/builtins/taxonomy.js'

export function arrayValueRequirements(item: BuiltinCallable, aggregateSupport = false) {
  if (item.kind !== 'function' || item.schema !== 'pg_catalog') return null
  if (
    aggregateSupport &&
    item.name === 'int4_avg_combine' &&
    item.args.join(',') === 'pg_catalog._int8,pg_catalog._int8' &&
    item.result === 'pg_catalog._int8'
  )
    return [
      {
        kind: 'execution',
        requirement:
          'Direct CHECK calls have no aggregate call context: non-NULL arguments raise XX000 before inspecting array storage; strict NULL, Unknown and ordered incoming errors remain distinct.',
        owner: 'tests/sql-semantics/check-array-aggregate-context.test.ts',
      },
    ]
  if (aggregateSupport && item.args[0] === 'pg_catalog._int8')
    return [
      {
        kind: 'native-storage',
        requirement:
          'State validation requires known NULL-bitmap absence; missing metadata defers an otherwise valid state, while a retained bitmap or definitely invalid native byte length raises XX000. Canonical two-word states are portable. A two-dimensional singleton has one available word: zero-count final calls return NULL, while reading or updating the unavailable second native word defers.',
        owner: 'tests/sql-semantics/check-array-integer-state.test.ts',
      },
    ]
  if (
    aggregateSupport &&
    item.args.join(',') === 'pg_catalog._float8' &&
    item.result === 'pg_catalog.float8'
  )
    return [
      {
        kind: 'native-storage',
        requirement:
          'Final state validation requires a one-dimensional float8 array with the catalog aggregate state width and known NULL-bitmap absence. Definite shape errors or retained bitmaps raise XX000; missing bitmap metadata defers otherwise valid states. Arithmetic retains unchecked IEEE results, while exact computed NaN payload bytes remain unavailable and supplied selected payloads are preserved.',
        owner: 'tests/sql-semantics/check-array-float-final.test.ts',
      },
    ]
  if (aggregateSupport && item.args[0] === 'pg_catalog._float8')
    return [
      {
        kind: 'native-storage',
        requirement:
          'Floating transition/combine states require the catalog one-dimensional width and known NULL-bitmap absence. Retained bitmaps and definite shape errors raise XX000; missing metadata defers. Direct calls return fresh lower-bound-one arrays, preserve empty-state selection and use distinct accumulation/combine overflow guards. Computed NaN payload bytes defer independently of semantic values.',
        owner: 'tests/sql-semantics/check-array-float-transition.test.ts',
      },
    ]
  if (
    item.name === 'parse_ident' &&
    item.args.join(',') === 'pg_catalog.text,pg_catalog.bool' &&
    item.result === 'pg_catalog._text'
  )
    return [
      {
        kind: 'encoding',
        requirement:
          'Unquoted non-ASCII identifier parts require declared UTF8 encoding for portable downcasing. ASCII identifiers, quoted contents, strict syntax errors reached before that boundary, SQL NULL and incoming errors remain available independently of collation.',
        owner: 'tests/sql-semantics/check-array-identifiers.test.ts',
      },
    ]
  if (
    item.name === 'array_send' &&
    item.args.join(',') === 'pg_catalog.anyarray' &&
    item.result === 'pg_catalog.bytea'
  )
    return [
      {
        kind: 'database',
        requirement:
          'The binary array header requires the actual deployment element type OID, including for empty arrays; SQL NULL and incoming errors remain portable.',
        owner: 'tests/sql-semantics/check-array-binary-io.test.ts',
      },
    ]
  if (
    item.name === 'ts_lexize' &&
    item.args.join(',') === 'pg_catalog.regdictionary,pg_catalog.text' &&
    item.result === 'pg_catalog._text'
  )
    return [
      {
        kind: 'database',
        requirement:
          'The actual text-search dictionary implementation, configuration and resources are required; a regdictionary OID alone has no portable meaning.',
        owner: 'tests/sql-semantics/check-array-measurements.test.ts',
      },
    ]
  if (
    item.name === 'postgresql_fdw_validator' &&
    item.args.join(',') === 'pg_catalog._text,pg_catalog.oid' &&
    item.result === 'pg_catalog.bool'
  )
    return [
      {
        kind: 'database',
        requirement:
          'Validation selects options by the supplied catalog relation identity; numeric OIDs alone do not establish that identity across deployments.',
        owner: 'tests/sql-semantics/check-array-measurements.test.ts',
      },
    ]
  return null
}

export async function measureArrays(pg: PGlite) {
  const catalog = await verifiedCatalog(pg)
  const arrays = (
    await pg.query<{ identity: string; element: string }>(
      `SELECT quote_ident(n.nspname)||'.'||quote_ident(t.typname) identity,quote_ident(en.nspname)||'.'||quote_ident(e.typname) element FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_type e ON e.oid=t.typelem JOIN pg_namespace en ON en.oid=e.typnamespace WHERE n.nspname='pg_catalog' AND t.typlen=-1 AND t.typinput='array_in'::regproc ORDER BY 1`,
    )
  ).rows
  const arrayTypes = new Set(arrays.map((a) => a.identity)),
    poly = new Set(['pg_catalog.anyarray', 'pg_catalog.anycompatiblearray'])
  const aggregates = (
    await pg.query<{ schema: string; name: string; args: string[] }>(
      `SELECT DISTINCT n.nspname schema,p.proname name,ARRAY(SELECT quote_ident(tn.nspname)||'.'||quote_ident(t.typname) FROM unnest(p.proargtypes) WITH ORDINALITY argument(oid,ord) JOIN pg_type t ON t.oid=argument.oid JOIN pg_namespace tn ON tn.oid=t.typnamespace ORDER BY argument.ord) args FROM pg_aggregate a CROSS JOIN LATERAL unnest(ARRAY[a.aggtransfn,a.aggfinalfn,a.aggcombinefn,a.aggserialfn,a.aggdeserialfn,a.aggmtransfn,a.aggminvtransfn,a.aggmfinalfn]) fn(oid) JOIN pg_proc p ON p.oid=fn.oid JOIN pg_namespace n ON n.oid=p.pronamespace`,
    )
  ).rows
  const aggregateSupport = new Set(
    aggregates.map((a) => `function:${JSON.stringify([a.schema, a.name])}(${a.args.join(',')})`),
  )
  const available = checkRustCallableNames()
  const pseudo = new Set([
    'pg_catalog.anyelement',
    'pg_catalog.anycompatible',
    'pg_catalog.anynonarray',
    'pg_catalog.anyenum',
    'pg_catalog."any"',
    ...poly,
  ])
  const rows = builtinCallables()
    .filter((c) => [...c.args, c.result].some((t) => arrayTypes.has(t) || poly.has(t)))
    .map((item) => {
      const implementation = item.kind === 'operator' ? builtinMetadata(item.implementation) : item
      const signature = callableIdentity(item)
      const types = [...item.args, item.result]
      const missingTypes = [
        ...new Set(types.filter((t) => !pseudo.has(t) && catalogScalarType(t) === null)),
      ]
      const internal = types.some((t) => ['pg_catalog.internal', 'pg_catalog.cstring'].includes(t))
      const implementationPresent =
        implementation.kind === 'function' && available.has(implementation.rustName)
      const requirements = [
        ...(item.kind === 'aggregate' || item.kind === 'window' ? [item.kind + '-expression'] : []),
        ...(item.returnsSet ? ['set-returning-expression'] : []),
        ...(internal ? ['internal-interface'] : []),
        ...(item.volatility === 'v' ? ['volatile-state'] : []),
        ...(item.volatility === 's' ? ['session-or-database-state'] : []),
        ...(aggregateSupport.has(signature) ? ['aggregate-support-callable'] : []),
        ...(missingTypes.length ? ['unrepresented-types'] : []),
      ]
      const publicScalar =
        (item.kind === 'function' || item.kind === 'operator') && !item.returnsSet && !internal
      const unimplementedImmutableCandidate =
        publicScalar && item.volatility === 'i' && !missingTypes.length && !implementationPresent
      const valueRequirements =
        arrayValueRequirements(implementation, aggregateSupport.has(signature)) ??
        hashValueRequirements(implementation) ??
        jsonValueRequirements(implementation)
      const databaseDependentUnimplemented =
        unimplementedImmutableCandidate && !!valueRequirements?.some((r) => r.kind === 'database')
      const representedImmutableGap =
        unimplementedImmutableCandidate && !databaseDependentUnimplemented
      return {
        identity: signature,
        metadata: item,
        implementation: implementation.kind === 'function' ? implementation.rustName : null,
        implementationPresent,
        requirements,
        missingTypes,
        representedImmutableGap,
        unimplementedImmutableCandidate,
        databaseDependentUnimplemented,
        valueRequirements,
      }
    })
  return {
    serverVersion: catalog.serverVersion,
    scope:
      'Builtin callables with concrete or polymorphic array arguments/results; implementation presence does not establish every concrete binding or execution context.',
    summary: {
      arrayTypes: arrays.length,
      representedArrayTypes: arrays.filter((a) => catalogScalarType(a.identity) !== null).length,
      callables: rows.length,
      implementationsPresent: rows.filter((r) => r.implementationPresent).length,
      representedImmutableGaps: rows.filter((r) => r.representedImmutableGap).length,
      unimplementedImmutableCandidates: rows.filter((r) => r.unimplementedImmutableCandidate)
        .length,
      databaseDependentUnimplemented: rows.filter((r) => r.databaseDependentUnimplemented).length,
      aggregateSupportGaps: rows.filter(
        (r) => r.representedImmutableGap && r.requirements.includes('aggregate-support-callable'),
      ).length,
    },
    types: arrays.map((a) => ({ ...a, represented: catalogScalarType(a.identity) !== null })),
    callables: rows,
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const pg = await PGlite.create()
  try {
    const report = await measureArrays(pg)
    await writeReport('check-arrays', report)
    console.table(report.summary)
  } finally {
    await pg.close()
  }
}
