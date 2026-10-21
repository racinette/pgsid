export const catalogIdentifierSql = (
  value: string,
) => `(CASE WHEN (${value})::text COLLATE pg_catalog."C" ~ '^[a-z_][a-z0-9_$]*$'
  AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_get_keywords() keyword WHERE keyword.word=(${value})::text AND keyword.catcode<>'U')
  THEN (${value})::text ELSE '"'||pg_catalog.replace((${value})::text,'"','""')||'"' END)`
