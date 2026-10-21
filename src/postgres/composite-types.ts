import type { PGlite } from '@electric-sql/pglite'
import type { CompositeTypeDefinition, CompositeTypeGraph } from '../catalog/types.js'

const identifier = (
  value: string,
) => `(CASE WHEN (${value})::text COLLATE pg_catalog."C" ~ '^[a-z_][a-z0-9_$]*$'
  AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_get_keywords() keyword WHERE keyword.word=(${value})::text AND keyword.catcode<>'U')
  THEN (${value})::text ELSE '"'||pg_catalog.replace((${value})::text,'"','""')||'"' END)`
const typeIdentity = (
  value: string,
) => `(SELECT ${identifier('identity_namespace.nspname')}||'.'||${identifier('identity_type.typname')}
  FROM pg_catalog.pg_type identity_type JOIN pg_catalog.pg_namespace identity_namespace ON identity_namespace.oid=identity_type.typnamespace WHERE identity_type.oid=${value})`
const functionIdentity = (
  value: string,
) => `(SELECT 'function:['||pg_catalog.to_json(ns.nspname)::text||','||pg_catalog.to_json(p.proname)::text||']('||COALESCE((
  SELECT pg_catalog.string_agg(${typeIdentity('a.type')},',' ORDER BY a.position)
  FROM pg_catalog.unnest(p.proargtypes) WITH ORDINALITY a(type,position)), '')||')'
  FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace ns ON ns.oid=p.pronamespace WHERE p.oid=${value})`

export async function readCatalogCompositeTypes(
  pg: PGlite,
  schemas: readonly string[] | null = null,
): Promise<CompositeTypeGraph> {
  const rows = (
    await pg.query<CompositeTypeDefinition & { root: boolean }>(
      `WITH RECURSIVE roots(type) AS (
      SELECT t.oid FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace
      WHERE t.typtype='c' AND (
        ($1::text[] IS NULL AND n.nspname NOT LIKE 'pg\\_%' ESCAPE '\\' AND n.nspname<>'information_schema')
        OR n.nspname=ANY($1::text[]))
    ),needed(type) AS (
      SELECT type FROM roots UNION
      SELECT child.type FROM needed parent JOIN pg_catalog.pg_type t ON t.oid=parent.type
      LEFT JOIN pg_catalog.pg_type e ON e.oid=t.typelem AND e.typarray=t.oid
      LEFT JOIN pg_catalog.pg_range r ON r.rngtypid=t.oid
      LEFT JOIN pg_catalog.pg_range m ON m.rngmultitypid=t.oid
      CROSS JOIN LATERAL (
        SELECT t.typbasetype AS type UNION SELECT t.typarray UNION SELECT e.oid
        UNION SELECT r.rngsubtype UNION SELECT r.rngmultitypid UNION SELECT m.rngtypid
        UNION SELECT a.atttypid FROM pg_catalog.pg_attribute a
          WHERE t.typtype='c' AND a.attrelid=t.typrelid AND a.attnum>0 AND NOT a.attisdropped
      ) child WHERE child.type IS NOT NULL AND child.type<>0
    ) SELECT t.oid IN(SELECT type FROM roots) root,
      ${typeIdentity('t.oid')} identity,n.nspname AS schema,t.typname AS name,t.typtype AS kind,
      c.relkind AS "relationKind",${typeIdentity('t.typarray')} AS array,
      ${typeIdentity('t.typbasetype')} AS base,t.typtypmod AS "baseTypeMod",t.typnotnull AS "notNull",
      ${typeIdentity('e.oid')} AS element,${typeIdentity('r.rngsubtype')} AS subtype,
      ${typeIdentity('m.rngtypid')} AS member,
      CASE WHEN t.typtype='e' THEN ARRAY(SELECT en.enumlabel FROM pg_catalog.pg_enum en
        WHERE en.enumtypid=t.oid ORDER BY en.enumsortorder) ELSE NULL END AS "enumLabels",
      COALESCE((SELECT pg_catalog.json_agg(pg_catalog.json_build_object(
        'position',a.attnum,'name',a.attname,'type',${typeIdentity('a.atttypid')},'typeMod',a.atttypmod,
        'collation',CASE WHEN co.oid IS NOT NULL THEN ${identifier('cn.nspname')}||'.'||${identifier('co.collname')} ELSE NULL END,
        'collationDeterministic',co.collisdeterministic,
        'collationIsC',CASE WHEN co.oid IS NOT NULL THEN co.oid='pg_catalog."C"'::regcollation ELSE NULL END,
        'collationIsDefault',CASE WHEN co.oid IS NOT NULL THEN co.oid='pg_catalog."default"'::regcollation ELSE NULL END
      ) ORDER BY a.attnum) FROM pg_catalog.pg_attribute a
        LEFT JOIN pg_catalog.pg_collation co ON co.oid=a.attcollation
        LEFT JOIN pg_catalog.pg_namespace cn ON cn.oid=co.collnamespace
        WHERE t.typtype='c' AND a.attrelid=t.typrelid AND a.attnum>0 AND NOT a.attisdropped),'[]'::json) AS fields,
      ${functionIdentity('t.typinput')} AS input,${functionIdentity('t.typoutput')} AS output,
      ${functionIdentity('t.typreceive')} AS receive,${functionIdentity('t.typsend')} AS send
    FROM needed d JOIN pg_catalog.pg_type t ON t.oid=d.type
    JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace
    LEFT JOIN pg_catalog.pg_class c ON t.typtype='c' AND c.oid=t.typrelid
    LEFT JOIN pg_catalog.pg_type e ON e.oid=t.typelem AND e.typarray=t.oid
    LEFT JOIN pg_catalog.pg_range r ON r.rngtypid=t.oid
    LEFT JOIN pg_catalog.pg_range m ON m.rngmultitypid=t.oid
    ORDER BY n.nspname COLLATE pg_catalog."C",t.typname COLLATE pg_catalog."C"`,
      [schemas],
    )
  ).rows
  return {
    roots: rows.filter((row) => row.root).map((row) => row.identity),
    definitions: rows.map(({ root: _root, ...definition }) => definition),
  }
}
