-- @unwitnessable 6: CURRENT_SCHEMA is NULL only when the search path resolves to no schema
-- @unwitnessable 9: an in-range subscript of a two-element array literal is always defined; A_Indirection stays conservative because indexes are not statically checkable (known imprecision)
-- Expression node types that are easy to get wrong, each with the reason it
-- lands where it does.
SELECT
  -- BooleanTest collapses three-valued logic to a plain boolean: a NULL input
  -- yields FALSE, never NULL.
  (c.name IS NULL) IS TRUE              AS is_true,        -- @notNull
  (c.name = 'x') IS NOT TRUE            AS is_not_true,    -- @notNull

  -- NullTest likewise.
  c.name IS NULL                        AS is_null,        -- @notNull

  -- IS [NOT] DISTINCT FROM is NULL-aware by construction.
  c.name IS DISTINCT FROM 'x'           AS distinct_from,  -- @notNull

  -- SQL value functions are always defined...
  CURRENT_TIMESTAMP                     AS ts,             -- @notNull
  SESSION_USER                          AS who,            -- @notNull
  -- ...except CURRENT_SCHEMA, which is NULL when the search path resolves to
  -- no existing schema.
  CURRENT_SCHEMA                        AS schema_name,    -- @nullable

  -- Constructors are never NULL as values, whatever their members.
  ROW(c.id, c.name)                     AS row_val,        -- @notNull
  ARRAY[c.name, c.name]                 AS arr_val,        -- @notNull

  -- Subscripting is not: an out-of-range index yields NULL, and the index
  -- cannot be checked statically.
  (ARRAY[c.id, c.id])[1]                AS in_range,       -- @nullable
  (ARRAY[c.id])[99]                     AS out_of_range,   -- @nullable

  -- JSON access operators are strict yet still return NULL for a missing key,
  -- so they are not total and cannot propagate non-nullness.
  e.data -> 'a'                         AS json_get,       -- @nullable
  e.data ->> 'a'                        AS json_get_text,  -- @nullable

  -- NULLIF exists to produce NULL.
  NULLIF(p.sku, 'x')                    AS nullif_val,     -- @nullable

  -- GREATEST/LEAST skip NULL arguments — one non-null argument is enough.
  GREATEST(c.name, 'z')                 AS greatest_lit,   -- @notNull
  LEAST(c.name, c.name)                 AS least_both_null, -- @nullable

  -- Casting to a NOT NULL domain never yields NULL: it raises instead.
  p.name::non_empty_text                AS domain_cast,    -- @notNull
  p.price::positive_amount              AS domain_num,     -- @notNull
  -- A cast to an ordinary type just preserves the argument.
  p.deleted_at::text                    AS plain_cast      -- @nullable
FROM customers c
CROSS JOIN products p
CROSS JOIN events e
