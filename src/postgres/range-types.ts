import type { PGlite } from '@electric-sql/pglite'

export interface RangeTypeMetadata {
  identity: string
  array: string
  subtype: string
  multirange: string
  multirangeArray: string
  collation: string | null
  subtypeClass: string
  comparator: string | null
  canonical: string | null
  subtypeDiff: string | null
}

const typeIdentity = `SELECT quote_ident(n.nspname)||'.'||quote_ident(t.typname)
  FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE t.oid=`

export async function readRangeTypes(
  pg: PGlite,
  schema: string | null = null,
): Promise<RangeTypeMetadata[]> {
  const rows = (
    await pg.query<{
      identity: string
      array: string
      subtype: string
      multirange: string
      multirange_array: string
      collation: string | null
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
    }>(
      `SELECT (${typeIdentity} r.rngtypid) AS identity,
        (${typeIdentity} rt.typarray) AS array,
        (${typeIdentity} r.rngsubtype) AS subtype,
        (${typeIdentity} r.rngmultitypid) AS multirange,
        (${typeIdentity} mt.typarray) AS multirange_array,
        (SELECT quote_ident(cn.nspname)||'.'||quote_ident(c.collname)
          FROM pg_collation c JOIN pg_namespace cn ON cn.oid=c.collnamespace
          WHERE c.oid=r.rngcollation) AS collation,
        quote_ident(onsp.nspname)||'.'||quote_ident(o.opcname) AS subtype_class,
        pn.nspname AS comparator_schema,p.proname AS comparator_name,
        (SELECT array_agg((${typeIdentity} u.t) ORDER BY u.ord)
          FROM unnest(p.proargtypes) WITH ORDINALITY u(t,ord)) AS comparator_args,
        cn.nspname AS canonical_schema,c.proname AS canonical_name,
        (SELECT array_agg((${typeIdentity} u.t) ORDER BY u.ord)
          FROM unnest(c.proargtypes) WITH ORDINALITY u(t,ord)) AS canonical_args,
        dn.nspname AS diff_schema,d.proname AS diff_name,
        (SELECT array_agg((${typeIdentity} u.t) ORDER BY u.ord)
          FROM unnest(d.proargtypes) WITH ORDINALITY u(t,ord)) AS diff_args
        FROM pg_range r
        JOIN pg_type rt ON rt.oid=r.rngtypid
        JOIN pg_namespace n ON n.oid=rt.typnamespace
        JOIN pg_type mt ON mt.oid=r.rngmultitypid
        JOIN pg_opclass o ON o.oid=r.rngsubopc
        JOIN pg_namespace onsp ON onsp.oid=o.opcnamespace
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
        ORDER BY 1`,
      [schema],
    )
  ).rows
  return rows.map((row) => ({
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
  }))
}
