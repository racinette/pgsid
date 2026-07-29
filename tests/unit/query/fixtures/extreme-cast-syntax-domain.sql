-- CAST(x AS T) syntax produces the same TypeCast AST node as x::T.
-- Both are handled identically by the TypeCast handler. This fixture
-- uses SQL-standard CAST syntax to confirm parity, including NOT NULL
-- domain targets.
SELECT
  CAST(p.name AS nn_text)              AS cast_domain,   -- 
  CAST(p.deleted_at AS nn_text)        AS cast_null_domain,  -- 
  CAST(NULL AS nn_text)                AS cast_null_lit,  -- 
  CAST(p.name AS text)                 AS cast_text,     -- 
  CAST(p.deleted_at AS text)           AS cast_nullable,  -- 
  CAST(COALESCE(p.deleted_at, 'x') AS nn_text) AS cast_coalesce  -- 
FROM products p
