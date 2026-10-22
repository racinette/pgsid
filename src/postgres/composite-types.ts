import { catalogIdentifierSql as identifier } from './catalog-identities.js'
import type { PGlite } from '@electric-sql/pglite'
import type { CompositeTypeDefinition, CompositeTypeGraph } from '../catalog/types.js'
import { readTypeComparisons } from './builtins/type-comparisons.js'

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
  identities: readonly string[] = [],
): Promise<CompositeTypeGraph> {
  const rows = (
    await pg.query<CompositeTypeDefinition & { root: boolean; comparisonCollation: string | null }>(
      `WITH RECURSIVE roots(type) AS (
      SELECT t.oid FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace
      WHERE t.typtype='c' AND (
        ($1::text[] IS NULL AND n.nspname NOT LIKE 'pg\\_%' ESCAPE '\\' AND n.nspname<>'information_schema')
        OR n.nspname=ANY($1::text[])
        OR t.oid IN(SELECT pg_catalog.to_regtype(identity)::oid FROM pg_catalog.unnest($2::text[]) identity))
    ),domain_bases(type,base) AS (
      SELECT t.oid,t.typbasetype FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace
      WHERE t.typtype='d' AND (
        ($1::text[] IS NULL AND n.nspname NOT LIKE 'pg\\_%' ESCAPE '\\' AND n.nspname<>'information_schema')
        OR n.nspname=ANY($1::text[]))
      UNION
      SELECT d.type,child.type FROM domain_bases d JOIN pg_catalog.pg_type t ON t.oid=d.base
      LEFT JOIN pg_catalog.pg_type e ON e.oid=t.typelem AND e.typarray=t.oid
      CROSS JOIN LATERAL (SELECT t.typbasetype AS type WHERE t.typtype='d' UNION SELECT e.oid) child
      WHERE child.type IS NOT NULL AND child.type<>0
    ),needed(type) AS (
      SELECT type FROM roots UNION
      SELECT d.type FROM domain_bases d JOIN pg_catalog.pg_type t ON t.oid=d.base WHERE t.typtype='c' UNION
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
      (SELECT ${identifier('ccn.nspname')}||'.'||${identifier('cc.collname')} FROM pg_catalog.pg_collation cc
        JOIN pg_catalog.pg_namespace ccn ON ccn.oid=cc.collnamespace WHERE cc.oid=t.typcollation) AS "comparisonCollation",
      c.relkind AS "relationKind",c.relnatts::integer AS "attributeCount",${typeIdentity('t.typarray')} AS array,
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
      ${functionIdentity('t.typreceive')} AS receive,${functionIdentity('t.typsend')} AS send,
      ${functionIdentity("(SELECT castfunc FROM pg_catalog.pg_cast WHERE castsource=t.oid AND casttarget='pg_catalog.json'::regtype AND castmethod='f')")} AS "jsonCast"
    FROM needed d JOIN pg_catalog.pg_type t ON t.oid=d.type
    JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace
    LEFT JOIN pg_catalog.pg_class c ON t.typtype='c' AND c.oid=t.typrelid
    LEFT JOIN pg_catalog.pg_type e ON e.oid=t.typelem AND e.typarray=t.oid
    LEFT JOIN pg_catalog.pg_range r ON r.rngtypid=t.oid
    LEFT JOIN pg_catalog.pg_range m ON m.rngmultitypid=t.oid
    ORDER BY n.nspname COLLATE pg_catalog."C",t.typname COLLATE pg_catalog."C"`,
      [schemas, identities],
    )
  ).rows
  const comparisons = new Map(
    (
      await readTypeComparisons(
        pg,
        rows.map((row) => ({ identity: row.identity, collation: row.comparisonCollation })),
        true,
      )
    ).map((support) => [support.identity, support]),
  )
  return {
    roots: rows.filter((row) => row.root).map((row) => row.identity),
    definitions: rows.map(({ root: _root, comparisonCollation: _collation, ...definition }) => {
      const support = comparisons.get(definition.identity)!
      if (support.equalityAvailable === undefined || support.comparisonAvailable === undefined)
        throw new Error(
          'Composite comparison availability was not captured: ' + definition.identity,
        )
      return {
        ...definition,
        comparison: {
          btreeClass: support.btreeClass,
          hashClass: support.hashClass,
          equality: support.equality,
          equalityImplementation: support.equalityImplementation,
          comparator: support.comparator,
          equalityAvailable: support.equalityAvailable,
          comparisonAvailable: support.comparisonAvailable,
        },
      }
    }),
  }
}
