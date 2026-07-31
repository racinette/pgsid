-- CAST(x AS T) syntax produces the same TypeCast AST node as x::T.
-- Both are handled identically by the TypeCast handler. This fixture
-- uses SQL-standard CAST syntax to confirm parity, including NOT NULL
-- domain targets.
--
-- @no-rows: CAST(NULL AS nn_text) raises the domain's NOT NULL violation for
-- every row evaluated, which is the behaviour the @notNull claims assert. The
-- statement therefore either fails or has no rows to fail on.
-- @raises: domain nn_text does not allow null values
SELECT
  CAST(p.name AS nn_text)              AS cast_domain,   -- @notNull
  CAST(p.deleted_at AS nn_text)        AS cast_null_domain,  -- @notNull
  CAST(NULL AS nn_text)                AS cast_null_lit,  -- @notNull
  CAST(p.name AS text)                 AS cast_text,     -- @notNull
  CAST(p.deleted_at AS text)           AS cast_nullable,  -- @nullable
  CAST(COALESCE(p.deleted_at::text, 'x') AS nn_text) AS cast_coalesce  -- @notNull
FROM products p
