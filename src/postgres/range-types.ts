import type { PGlite } from '@electric-sql/pglite'

import type { RangeTypeMetadata, RangeTypeInfo, RangeCallInfo } from '../catalog/types.js'
export type { RangeTypeMetadata } from '../catalog/types.js'

const typeIdentity = `SELECT quote_ident(n.nspname)||'.'||quote_ident(t.typname)
  FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE t.oid=`

type SelectedFunction = { schema: string; name: string; args: string[] } | null
const functionIdentity = (oid: string): string => `(SELECT json_build_object(
  'schema',fn.nspname,'name',p.proname,'args',ARRAY(
    SELECT (${typeIdentity} u.t) FROM unnest(p.proargtypes) WITH ORDINALITY u(t,ord) ORDER BY u.ord))
  FROM pg_proc p JOIN pg_namespace fn ON fn.oid=p.pronamespace WHERE p.oid=${oid})`
const signature = (fn: SelectedFunction): string | null =>
  fn ? `function:${JSON.stringify([fn.schema, fn.name])}(${fn.args.join(',')})` : null

async function readRangeCallables(
  pg: PGlite,
  identities: readonly string[],
): Promise<Map<string, RangeCallInfo[]>> {
  const result = new Map<string, RangeCallInfo[]>()
  if (!identities.length) return result
  const rows = (
    await pg.query<RangeCallInfo & { range: string }>(
      `WITH RECURSIVE relatives(root,type) AS (
         SELECT r.rngtypid,t.type FROM pg_range r
         CROSS JOIN LATERAL (VALUES(r.rngtypid),(r.rngmultitypid)) t(type)
         WHERE (${typeIdentity} r.rngtypid)=ANY($1::text[])
         UNION ALL
         SELECT r.root,d.oid FROM relatives r JOIN pg_type d ON d.typbasetype=r.type
         WHERE d.typtype='d'
       ), names(root,namespace,name) AS (
         SELECT r.root,t.typnamespace,t.typname FROM relatives r JOIN pg_type t ON t.oid=r.type
         UNION
         SELECT r.root,p.pronamespace,p.proname FROM relatives r
         JOIN pg_proc p ON p.prorettype=r.type
         JOIN pg_language l ON l.oid=p.prolang
         WHERE l.lanname='internal' AND p.prosrc IN (
           'range_constructor2','range_constructor3',
           'multirange_constructor0','multirange_constructor1','multirange_constructor2')
       )
       SELECT (${typeIdentity} candidates.root) AS range,
         n.nspname AS schema,p.proname AS name,
         CASE p.prokind WHEN 'f' THEN 'function' WHEN 'a' THEN 'aggregate'
           WHEN 'w' THEN 'window' ELSE 'procedure' END AS kind,
         ARRAY(SELECT (${typeIdentity} u.t)
           FROM unnest(p.proargtypes) WITH ORDINALITY u(t,ord) ORDER BY u.ord) AS args,
         ARRAY(SELECT p.proargnames[u.ord]
           FROM unnest(coalesce(p.proallargtypes,p.proargtypes::oid[])) WITH ORDINALITY u(t,ord)
           WHERE p.proargmodes IS NULL OR p.proargmodes[u.ord] IN ('i','b','v')
           ORDER BY u.ord) AS "argumentNames",
         (${typeIdentity} p.prorettype) AS result,
         p.proisstrict AS strict,p.provolatile AS volatility,p.proretset AS "returnsSet",
         (${typeIdentity} p.provariadic) AS variadic,p.pronargdefaults AS "numArgDefaults",
         CASE WHEN l.lanname='internal' THEN p.prosrc ELSE NULL END AS implementation
       FROM names candidates
       JOIN pg_proc p ON p.pronamespace=candidates.namespace AND p.proname=candidates.name
       JOIN pg_namespace n ON n.oid=p.pronamespace
       JOIN pg_language l ON l.oid=p.prolang
       ORDER BY range,n.nspname,p.proname,args,p.prokind`,
      [identities],
    )
  ).rows
  for (const { range, ...callable } of rows) {
    const group = result.get(range) ?? []
    group.push(callable)
    result.set(range, group)
  }
  return result
}

async function readRangeTypeInfos(
  pg: PGlite,
  schema: string | null,
  schemas: readonly string[] | null,
): Promise<RangeTypeInfo[]> {
  const rows = (
    await pg.query<{
      schema: string
      name: string
      multirange_schema: string
      multirange_name: string
      identity: string
      array: string
      subtype: string
      multirange: string
      multirange_array: string
      collation: string | null
      collation_deterministic: boolean | null
      collation_is_c: boolean | null
      collation_is_default: boolean | null
      subtype_class: string
      comparator_schema: string | null
      comparator_name: string | null
      comparator_args: string[] | null
      canonical_schema: string | null
      canonical_name: string | null
      canonical_args: string[] | null
      diff_schema: string | null
      diff_name: string | null
      diff_args: string[] | null
      output: SelectedFunction
      multirange_output: SelectedFunction
      subtype_output: SelectedFunction
      input: SelectedFunction
      multirange_input: SelectedFunction
      subtype_input: SelectedFunction
    }>(
      `SELECT n.nspname AS schema,rt.typname AS name,mn.nspname AS multirange_schema,mt.typname AS multirange_name,
        (${typeIdentity} r.rngtypid) AS identity,
        (${typeIdentity} rt.typarray) AS array,
        (${typeIdentity} r.rngsubtype) AS subtype,
        (${typeIdentity} r.rngmultitypid) AS multirange,
        (${typeIdentity} mt.typarray) AS multirange_array,
        (SELECT quote_ident(cn.nspname)||'.'||quote_ident(c.collname)
          FROM pg_collation c JOIN pg_namespace cn ON cn.oid=c.collnamespace
          WHERE c.oid=r.rngcollation) AS collation,
        rco.collisdeterministic AS collation_deterministic,
        CASE WHEN r.rngcollation=0 THEN NULL ELSE r.rngcollation='pg_catalog."C"'::regcollation END AS collation_is_c,
        CASE WHEN r.rngcollation=0 THEN NULL ELSE r.rngcollation='pg_catalog."default"'::regcollation END AS collation_is_default,
        quote_ident(onsp.nspname)||'.'||quote_ident(o.opcname) AS subtype_class,
        pn.nspname AS comparator_schema,p.proname AS comparator_name,
        (SELECT array_agg((${typeIdentity} u.t) ORDER BY u.ord)
          FROM unnest(p.proargtypes) WITH ORDINALITY u(t,ord)) AS comparator_args,
        cn.nspname AS canonical_schema,c.proname AS canonical_name,
        (SELECT array_agg((${typeIdentity} u.t) ORDER BY u.ord)
          FROM unnest(c.proargtypes) WITH ORDINALITY u(t,ord)) AS canonical_args,
        dn.nspname AS diff_schema,d.proname AS diff_name,
        (SELECT array_agg((${typeIdentity} u.t) ORDER BY u.ord)
          FROM unnest(d.proargtypes) WITH ORDINALITY u(t,ord)) AS diff_args,
        ${functionIdentity('rt.typoutput')} AS output,
        ${functionIdentity('mt.typoutput')} AS multirange_output,
        ${functionIdentity('st.typoutput')} AS subtype_output,
        ${functionIdentity('rt.typinput')} AS input,
        ${functionIdentity('mt.typinput')} AS multirange_input,
        ${functionIdentity('st.typinput')} AS subtype_input
        FROM pg_range r
        JOIN pg_type rt ON rt.oid=r.rngtypid
        JOIN pg_namespace n ON n.oid=rt.typnamespace
        JOIN pg_type mt ON mt.oid=r.rngmultitypid
        JOIN pg_type st ON st.oid=r.rngsubtype
        JOIN pg_namespace mn ON mn.oid=mt.typnamespace
        JOIN pg_opclass o ON o.oid=r.rngsubopc
        JOIN pg_namespace onsp ON onsp.oid=o.opcnamespace
        LEFT JOIN pg_collation rco ON rco.oid=r.rngcollation
        LEFT JOIN pg_amproc ap ON ap.amprocfamily=o.opcfamily
          AND ap.amproclefttype=o.opcintype AND ap.amprocrighttype=o.opcintype
          AND ap.amprocnum=1
        LEFT JOIN pg_proc p ON p.oid=ap.amproc
        LEFT JOIN pg_namespace pn ON pn.oid=p.pronamespace
        LEFT JOIN pg_proc c ON c.oid=r.rngcanonical
        LEFT JOIN pg_namespace cn ON cn.oid=c.pronamespace
        LEFT JOIN pg_proc d ON d.oid=r.rngsubdiff
        LEFT JOIN pg_namespace dn ON dn.oid=d.pronamespace
        WHERE ($1::text IS NULL OR n.nspname=$1)
          AND ($2::text[] IS NULL OR n.nspname=ANY($2::text[]))
        ORDER BY identity`,
      [schema, schemas],
    )
  ).rows
  const callables = await readRangeCallables(
    pg,
    rows.map((row) => row.identity),
  )
  return rows.map((row) => ({
    schema: row.schema,
    name: row.name,
    multirangeSchema: row.multirange_schema,
    multirangeName: row.multirange_name,
    collationDeterministic: row.collation_deterministic,
    collationIsC: row.collation_is_c,
    collationIsDefault: row.collation_is_default,
    identity: row.identity,
    array: row.array,
    subtype: row.subtype,
    multirange: row.multirange,
    multirangeArray: row.multirange_array,
    collation: row.collation,
    subtypeClass: row.subtype_class,
    comparator:
      row.comparator_name === null
        ? null
        : `function:${JSON.stringify([row.comparator_schema, row.comparator_name])}(${(row.comparator_args ?? []).join(',')})`,
    canonical:
      row.canonical_name === null
        ? null
        : `function:${JSON.stringify([row.canonical_schema, row.canonical_name])}(${(row.canonical_args ?? []).join(',')})`,
    subtypeDiff:
      row.diff_name === null
        ? null
        : `function:${JSON.stringify([row.diff_schema, row.diff_name])}(${(row.diff_args ?? []).join(',')})`,
    output: signature(row.output),
    multirangeOutput: signature(row.multirange_output),
    subtypeOutput: signature(row.subtype_output),
    input: signature(row.input),
    multirangeInput: signature(row.multirange_input),
    subtypeInput: signature(row.subtype_input),
    callables: callables.get(row.identity) ?? [],
  }))
}

export async function readRangeTypes(
  pg: PGlite,
  schema: string | null = null,
): Promise<RangeTypeMetadata[]> {
  const rows = await readRangeTypeInfos(pg, schema, null)
  return rows.map(
    ({
      schema: _schema,
      name: _name,
      multirangeSchema: _multirangeSchema,
      multirangeName: _multirangeName,
      collationDeterministic: _deterministic,
      collationIsC: _isC,
      collationIsDefault: _isDefault,
      output: _output,
      multirangeOutput: _multirangeOutput,
      subtypeOutput: _subtypeOutput,
      input: _input,
      multirangeInput: _multirangeInput,
      subtypeInput: _subtypeInput,
      callables: _callables,
      ...metadata
    }) => metadata,
  )
}

export async function readCatalogRangeTypes(
  pg: PGlite,
  schemas: readonly string[],
): Promise<RangeTypeInfo[]> {
  return readRangeTypeInfos(pg, null, schemas)
}
