import type { PGlite } from '@electric-sql/pglite'
import type { ConstantStorageType } from '../catalog/container-constant-storage.js'
import { catalogIdentifierSql } from './catalog-identities.js'

export async function readConstantStorageTypes(
  pg: PGlite,
): Promise<(ConstantStorageType & { name: string })[]> {
  return (
    await pg.query<ConstantStorageType & { name: string }>(
      `SELECT t.oid, COALESCE(format_type(t.oid, null), t.typname) AS name,
       ${catalogIdentifierSql('n.nspname')}||'.'||${catalogIdentifierSql('t.typname')} AS identity,
       t.typtype AS kind,t.typbasetype AS base,e.oid AS element,
       t.typlen::integer AS length,t.typalign AS alignment,t.typdelim AS delimiter,
       COALESCE((SELECT json_agg(json_build_object('type',a.atttypid::bigint,'length',a.attlen::integer,
         'alignment',a.attalign,'dropped',a.attisdropped) ORDER BY a.attnum)
         FROM pg_attribute a WHERE a.attrelid=t.typrelid AND a.attnum>0),'[]'::json) AS attributes
     FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
     LEFT JOIN pg_type e ON e.oid=t.typelem AND e.typarray=t.oid;`,
    )
  ).rows
}
