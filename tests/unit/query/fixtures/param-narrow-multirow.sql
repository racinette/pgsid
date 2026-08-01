-- The universal face of attribution, pinned from the narrowing side: $1
-- defines only row one of s.v, so the WHERE conjunct proves nothing about
-- $1 — row two survives with $1 NULL and carries it into the output, which
-- the [null] binding witnesses. An existential answer here would have
-- claimed x notNull and been falsified by exactly that row.
-- @args ["fallback"]
-- @args [null]
-- @param 1 nullable
SELECT $1 AS x  -- @nullable
FROM (VALUES ($1), ('fallback')) s(v)
WHERE s.v = 'fallback'
