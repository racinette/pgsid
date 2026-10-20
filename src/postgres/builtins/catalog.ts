import type { PGlite } from '@electric-sql/pglite'
import type { BuiltinFunctionSignature, BuiltinOperatorSignature } from '../../catalog/types.js'
import { assertUniqueRustCallableNames, rustCallableName } from './rust-name.js'
import { readRangeTypes, type RangeTypeMetadata } from '../range-types.js'

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
  rustName: string
  variadic: string | null
  numArgDefaults: number
  defaultArguments?: string
  aggKind: 'n' | 'o' | 'h' | null
  numDirectArgs: number | null
}

export interface OperatorMetadata extends CallableMetadata {
  kind: 'operator'
  left: string | null
  right: string | null
  implementation: string
}

export interface BuiltinCatalog {
  serverVersion: number
  functions: { metadata: FunctionMetadata; signature: BuiltinFunctionSignature }[]
  operators: { metadata: OperatorMetadata; signature: BuiltinOperatorSignature }[]
  casts: BuiltinCastMetadata[]
  types: BuiltinTypeResolution[]
  btreeComparisons: BuiltinBtreeComparison[]
  typeIO: BuiltinTypeIO[]
  rangeTypes: RangeTypeMetadata[]
}

export interface BuiltinTypeIO {
  identity: string
  input: string | null
  output: string | null
  send: string | null
  receive: string | null
}

export interface BuiltinBtreeComparison {
  operator: string
  family: string
  strategy: 1 | 2 | 3 | 4 | 5
  comparator: string | null
}

export interface BuiltinTypeResolution {
  identity: string
  category: string
  preferred: boolean
}

export interface BuiltinCastMetadata {
  source: string
  target: string
  implementation: string | null
  context: 'i' | 'a' | 'e'
  method: 'f' | 'b' | 'i'
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
  const [version, functions, operators, casts, types, btree, typeIO, rangeTypes] =
    await Promise.all([
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
        argument_defaults: string | null
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
      pg_get_expr(p.proargdefaults, 0) AS argument_defaults,
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
        implementation_schema: string
        implementation_name: string
        implementation_args: string[] | null
      }>(`SELECT n.nspname AS schema, o.oprname AS name,
      CASE WHEN o.oprleft <> 0 THEN format_type(o.oprleft, null) END AS left_type,
      CASE WHEN o.oprright <> 0 THEN format_type(o.oprright, null) END AS right_type,
      (${typeIdentity} o.oprleft) AS left,
      (${typeIdentity} o.oprright) AS right,
      format_type(o.oprresult, null) AS returns,
      (${typeIdentity} o.oprresult) AS result,
      p.proisstrict AS strict, p.provolatile AS volatility, p.proretset AS returns_set,
      pn.nspname AS implementation_schema, p.proname AS implementation_name,
      (SELECT array_agg((${typeIdentity} u.t) ORDER BY o)
        FROM unnest(p.proargtypes) WITH ORDINALITY AS u(t, o)) AS implementation_args
      FROM pg_operator o JOIN pg_proc p ON p.oid = o.oprcode
      JOIN pg_namespace n ON n.oid = o.oprnamespace
      JOIN pg_namespace pn ON pn.oid = p.pronamespace
      WHERE n.nspname = 'pg_catalog' ORDER BY o.oprname, 3, 4`),
      pg.query<{
        source: string
        target: string
        implementation_schema: string | null
        implementation_name: string | null
        implementation_args: string[] | null
        context: 'i' | 'a' | 'e'
        method: 'f' | 'b' | 'i'
      }>(`SELECT (${typeIdentity} c.castsource) AS source,
      (${typeIdentity} c.casttarget) AS target,
      pn.nspname AS implementation_schema, p.proname AS implementation_name,
      (SELECT array_agg((${typeIdentity} u.t) ORDER BY o)
        FROM unnest(p.proargtypes) WITH ORDINALITY AS u(t, o)) AS implementation_args,
      c.castcontext AS context, c.castmethod AS method
      FROM pg_cast c JOIN pg_type s ON s.oid = c.castsource
      JOIN pg_namespace sn ON sn.oid = s.typnamespace
      JOIN pg_type t ON t.oid = c.casttarget
      JOIN pg_namespace tn ON tn.oid = t.typnamespace
      LEFT JOIN pg_proc p ON p.oid = c.castfunc
      LEFT JOIN pg_namespace pn ON pn.oid = p.pronamespace
      WHERE sn.nspname = 'pg_catalog' AND tn.nspname = 'pg_catalog'
      ORDER BY 1, 2`),
      pg.query<BuiltinTypeResolution>(`SELECT quote_ident(n.nspname) || '.' || quote_ident(t.typname) AS identity,
      t.typcategory AS category, t.typispreferred AS preferred
      FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'pg_catalog' ORDER BY 1`),
      pg.query<{
        operator_schema: string
        operator_name: string
        left: string
        right: string
        family: string
        strategy: 1 | 2 | 3 | 4 | 5
        comparator_schema: string | null
        comparator_name: string | null
        comparator_args: string[] | null
      }>(`SELECT onsp.nspname AS operator_schema, o.oprname AS operator_name,
      (${typeIdentity} o.oprleft) AS left, (${typeIdentity} o.oprright) AS right,
      quote_ident(fnsp.nspname) || '.' || quote_ident(f.opfname) AS family,
      a.amopstrategy::int AS strategy,
      pnsp.nspname AS comparator_schema, p.proname AS comparator_name,
      (SELECT array_agg((${typeIdentity} u.t) ORDER BY u.ord)
        FROM unnest(p.proargtypes) WITH ORDINALITY u(t, ord)) AS comparator_args
      FROM pg_amop a JOIN pg_am am ON am.oid = a.amopmethod AND am.amname = 'btree'
      JOIN pg_opfamily f ON f.oid = a.amopfamily
      JOIN pg_namespace fnsp ON fnsp.oid = f.opfnamespace
      JOIN pg_operator o ON o.oid = a.amopopr
      JOIN pg_namespace onsp ON onsp.oid = o.oprnamespace
      LEFT JOIN pg_amproc ap ON ap.amprocfamily = f.oid AND ap.amproclefttype = a.amoplefttype
        AND ap.amprocrighttype = a.amoprighttype AND ap.amprocnum = 1
      LEFT JOIN pg_proc p ON p.oid = ap.amproc
      LEFT JOIN pg_namespace pnsp ON pnsp.oid = p.pronamespace
      WHERE onsp.nspname = 'pg_catalog' AND fnsp.nspname = 'pg_catalog'
        AND (p.oid IS NULL OR pnsp.nspname = 'pg_catalog')
      ORDER BY 1, 2, 3, 4, 5, 6`),
      pg.query<{
        identity: string
        input_schema: string | null
        input_name: string | null
        input_args: string[] | null
        output_schema: string | null
        output_name: string | null
        output_args: string[] | null
        send_schema: string | null
        send_name: string | null
        send_args: string[] | null
        receive_schema: string | null
        receive_name: string | null
        receive_args: string[] | null
      }>(`SELECT quote_ident(n.nspname) || '.' || quote_ident(t.typname) AS identity,
      ins.nspname AS input_schema, ip.proname AS input_name,
      (SELECT array_agg((${typeIdentity} u.t) ORDER BY u.ord)
        FROM unnest(ip.proargtypes) WITH ORDINALITY u(t, ord)) AS input_args,
      outs.nspname AS output_schema, op.proname AS output_name,
      (SELECT array_agg((${typeIdentity} u.t) ORDER BY u.ord)
        FROM unnest(op.proargtypes) WITH ORDINALITY u(t, ord)) AS output_args,
      sends.nspname AS send_schema, sp.proname AS send_name,
      (SELECT array_agg((${typeIdentity} u.t) ORDER BY u.ord)
        FROM unnest(sp.proargtypes) WITH ORDINALITY u(t, ord)) AS send_args,
      receives.nspname AS receive_schema, rp.proname AS receive_name,
      (SELECT array_agg((${typeIdentity} u.t) ORDER BY u.ord)
        FROM unnest(rp.proargtypes) WITH ORDINALITY u(t, ord)) AS receive_args
      FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
      LEFT JOIN pg_proc ip ON ip.oid = t.typinput
      LEFT JOIN pg_namespace ins ON ins.oid = ip.pronamespace
      LEFT JOIN pg_proc op ON op.oid = t.typoutput
      LEFT JOIN pg_namespace outs ON outs.oid = op.pronamespace
      LEFT JOIN pg_proc sp ON sp.oid = t.typsend
      LEFT JOIN pg_namespace sends ON sends.oid = sp.pronamespace
      LEFT JOIN pg_proc rp ON rp.oid = t.typreceive
      LEFT JOIN pg_namespace receives ON receives.oid = rp.pronamespace
      WHERE n.nspname = 'pg_catalog' ORDER BY 1`),
      readRangeTypes(pg, 'pg_catalog'),
    ])
  assertUniqueRustCallableNames([
    ...functions.rows.map((row) => ({
      schema: row.schema,
      name: row.name,
      args: row.canonical_args ?? [],
    })),
    ...operators.rows.map((row) => ({
      schema: row.implementation_schema,
      name: row.implementation_name,
      args: row.implementation_args ?? [],
    })),
  ])
  const functionsByIdentity = new Set(
    functions.rows
      .filter((row) => row.kind === 'f')
      .map(
        (row) =>
          `function:${JSON.stringify([row.schema, row.name])}(${(row.canonical_args ?? []).join(',')})`,
      ),
  )
  for (const row of operators.rows) {
    const identity = `function:${JSON.stringify([row.implementation_schema, row.implementation_name])}(${(row.implementation_args ?? []).join(',')})`
    if (!functionsByIdentity.has(identity))
      throw new Error(`Operator implementation is absent from the function inventory: ${identity}`)
  }
  return {
    serverVersion: Number(version.rows[0]!.server_version_num),
    types: types.rows,
    rangeTypes,
    typeIO: typeIO.rows.map((row) => ({
      identity: row.identity,
      input:
        row.input_name === null
          ? null
          : `function:${JSON.stringify([row.input_schema, row.input_name])}(${(row.input_args ?? []).join(',')})`,
      output:
        row.output_name === null
          ? null
          : `function:${JSON.stringify([row.output_schema, row.output_name])}(${(row.output_args ?? []).join(',')})`,
      send:
        row.send_name === null
          ? null
          : `function:${JSON.stringify([row.send_schema, row.send_name])}(${(row.send_args ?? []).join(',')})`,
      receive:
        row.receive_name === null
          ? null
          : `function:${JSON.stringify([row.receive_schema, row.receive_name])}(${(row.receive_args ?? []).join(',')})`,
    })),
    btreeComparisons: btree.rows.map((row) => ({
      operator: `operator:${JSON.stringify([row.operator_schema, row.operator_name])}(${row.left},${row.right})`,
      family: row.family,
      strategy: row.strategy,
      comparator:
        row.comparator_name === null
          ? null
          : `function:${JSON.stringify([row.comparator_schema, row.comparator_name])}(${(row.comparator_args ?? []).join(',')})`,
    })),
    casts: casts.rows.map((row) => ({
      source: row.source,
      target: row.target,
      implementation:
        row.implementation_name === null
          ? null
          : `function:${JSON.stringify([row.implementation_schema, row.implementation_name])}(${(row.implementation_args ?? []).join(',')})`,
      context: row.context,
      method: row.method,
    })),
    functions: functions.rows.map((r) => ({
      metadata: {
        kind: r.kind === 'f' ? 'function' : r.kind === 'a' ? 'aggregate' : 'window',
        schema: r.schema,
        name: r.name,
        rustName: rustCallableName({
          schema: r.schema,
          name: r.name,
          args: r.canonical_args ?? [],
        }),
        args: r.canonical_args ?? [],
        result: r.result,
        strict: r.strict,
        volatility: r.volatility,
        returnsSet: r.returns_set,
        variadic: r.canonical_variadic,
        numArgDefaults: r.num_arg_defaults,
        ...(r.argument_defaults === null ? {} : { defaultArguments: r.argument_defaults }),
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
        implementation: `function:${JSON.stringify([r.implementation_schema, r.implementation_name])}(${(r.implementation_args ?? []).join(',')})`,
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
