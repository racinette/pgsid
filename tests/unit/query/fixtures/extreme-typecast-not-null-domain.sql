-- TypeCast to NOT NULL domain: PG enforces the domain constraint at cast
-- time. NULL::nn_text throws rather than producing NULL, so the cast result
-- is always non-null (it either succeeds with non-null or the query fails).
-- This mirrors the Priority 1 function-return rule. Compare with a cast to
-- a regular type (text), which preserves the arg's nullability.
SELECT
  NULL::nn_text                    AS null_cast_domain,  -- @notNull
  p.name::nn_text                  AS col_cast_domain,   -- @notNull
  p.deleted_at::nn_text            AS nullable_cast_domain,  -- @notNull
  p.name::text                     AS cast_text,         -- @notNull
  p.deleted_at::text               AS nullable_cast_text,  -- @nullable
  COALESCE(p.deleted_at::text, 'x')::nn_text AS coalesce_domain  -- @notNull
FROM products p
