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

export function arrayValueRequirements(item: BuiltinCallable) {
  if (item.kind !== 'function' || item.schema !== 'pg_catalog') return null
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
      const representedImmutableGap =
        publicScalar && item.volatility === 'i' && !missingTypes.length && !implementationPresent
      return {
        identity: signature,
        metadata: item,
        implementation: implementation.kind === 'function' ? implementation.rustName : null,
        implementationPresent,
        requirements,
        missingTypes,
        representedImmutableGap,
        valueRequirements:
          arrayValueRequirements(implementation) ??
          hashValueRequirements(implementation) ??
          jsonValueRequirements(implementation),
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
