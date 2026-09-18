import type { PGlite } from '@electric-sql/pglite'
import type { BuiltinFunctionSignature, BuiltinOperatorSignature } from '../../catalog/types.js'

export interface CallableMetadata {
  kind: 'function' | 'aggregate' | 'window' | 'operator'
  schema: string
  name: string
  args: readonly string[]
  result: string
  strict: boolean
  volatility: 'i' | 's' | 'v'
  returnsSet: boolean
}

export interface FunctionMetadata extends CallableMetadata {
  kind: 'function' | 'aggregate' | 'window'
  variadic: string | null
  numArgDefaults: number
  aggKind: 'n' | 'o' | 'h' | null
  numDirectArgs: number | null
}

export interface OperatorMetadata extends CallableMetadata {
  kind: 'operator'
  left: string | null
  right: string | null
}

export interface BuiltinCatalog {
  serverVersion: number
  functions: { metadata: FunctionMetadata; signature: BuiltinFunctionSignature }[]
  operators: { metadata: OperatorMetadata; signature: BuiltinOperatorSignature }[]
}

const typeIdentity = `SELECT quote_ident(n.nspname) || '.' || quote_ident(t.typname)
  FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.oid =`

export function callableIdentity(metadata: FunctionMetadata | OperatorMetadata): string {
  const name = JSON.stringify([metadata.schema, metadata.name])
  if (metadata.kind === 'operator') {
    return `${metadata.kind}:${name}(${metadata.left ?? ''},${metadata.right ?? ''})`
  }
  return `${metadata.kind}:${name}(${metadata.args.join(',')})`
}

export async function readBuiltinCatalog(pg: PGlite): Promise<BuiltinCatalog> {
  const [version, functions, operators] = await Promise.all([
    pg.query<{ server_version_num: string }>('SHOW server_version_num'),
    pg.query<{
      schema: string
      name: string
      args: string[] | null
      canonical_args: string[] | null
      returns: string
      result: string
      strict: boolean
      volatility: 'i' | 's' | 'v'
      kind: 'f' | 'a' | 'w'
      returns_set: boolean
      variadic: string | null
      canonical_variadic: string | null
      num_arg_defaults: number
      agg_kind: 'n' | 'o' | 'h' | null
      num_direct_args: number | null
    }>(`SELECT n.nspname AS schema, p.proname AS name,
      (SELECT array_agg(format_type(t, null) ORDER BY o)
        FROM unnest(p.proargtypes) WITH ORDINALITY AS u(t, o)) AS args,
      (SELECT array_agg((${typeIdentity} u.t) ORDER BY o)
        FROM unnest(p.proargtypes) WITH ORDINALITY AS u(t, o)) AS canonical_args,
      format_type(p.prorettype, null) AS returns,
      (${typeIdentity} p.prorettype) AS result,
      p.proisstrict AS strict, p.provolatile AS volatility, p.prokind AS kind,
      p.proretset AS returns_set,
      CASE WHEN p.provariadic <> 0 THEN format_type(p.provariadic, null) END AS variadic,
      (${typeIdentity} p.provariadic) AS canonical_variadic,
      p.pronargdefaults::int AS num_arg_defaults,
      a.aggkind AS agg_kind, a.aggnumdirectargs::int AS num_direct_args
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      LEFT JOIN pg_aggregate a ON a.aggfnoid = p.oid
      WHERE n.nspname = 'pg_catalog' AND p.prokind IN ('f', 'a', 'w')
      ORDER BY p.proname, 3`),
    pg.query<{
      schema: string
      name: string
      left_type: string | null
      right_type: string | null
      left: string | null
      right: string | null
      returns: string
      result: string
      strict: boolean
      volatility: 'i' | 's' | 'v'
      returns_set: boolean
    }>(`SELECT n.nspname AS schema, o.oprname AS name,
      CASE WHEN o.oprleft <> 0 THEN format_type(o.oprleft, null) END AS left_type,
      CASE WHEN o.oprright <> 0 THEN format_type(o.oprright, null) END AS right_type,
      (${typeIdentity} o.oprleft) AS left,
      (${typeIdentity} o.oprright) AS right,
      format_type(o.oprresult, null) AS returns,
      (${typeIdentity} o.oprresult) AS result,
      p.proisstrict AS strict, p.provolatile AS volatility, p.proretset AS returns_set
      FROM pg_operator o JOIN pg_proc p ON p.oid = o.oprcode
      JOIN pg_namespace n ON n.oid = o.oprnamespace
      WHERE n.nspname = 'pg_catalog' ORDER BY o.oprname, 3, 4`),
  ])
  return {
    serverVersion: Number(version.rows[0]!.server_version_num),
    functions: functions.rows.map((r) => ({
      metadata: {
        kind: r.kind === 'f' ? 'function' : r.kind === 'a' ? 'aggregate' : 'window',
        schema: r.schema,
        name: r.name,
        args: r.canonical_args ?? [],
        result: r.result,
        strict: r.strict,
        volatility: r.volatility,
        returnsSet: r.returns_set,
        variadic: r.canonical_variadic,
        numArgDefaults: r.num_arg_defaults,
        aggKind: r.agg_kind,
        numDirectArgs: r.num_direct_args,
      },
      signature: {
        name: r.name,
        args: r.args ?? [],
        returns: r.returns,
        strict: r.strict,
        kind: r.kind,
        aggKind: r.agg_kind,
        numDirectArgs: r.num_direct_args,
        variadic: r.variadic,
        numArgDefaults: r.num_arg_defaults,
      },
    })),
    operators: operators.rows.map((r) => ({
      metadata: {
        kind: 'operator',
        schema: r.schema,
        name: r.name,
        args: [r.left, r.right].filter((t): t is string => t !== null),
        left: r.left,
        right: r.right,
        result: r.result,
        strict: r.strict,
        volatility: r.volatility,
        returnsSet: r.returns_set,
      },
      signature: {
        name: r.name,
        leftType: r.left_type,
        rightType: r.right_type,
        returns: r.returns,
        strict: r.strict,
      },
    })),
  }
}
