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
  -- ...CURRENT_SCHEMA included, as long as SOME schema on the analysis
  -- search path exists. It is NULL only when none does, which is an engine
  -- option rather than a data state — current-schema-unresolvable-path.sql
  -- arranges it and witnesses the NULL.
  CURRENT_SCHEMA                        AS schema_name,    -- @notNull

  -- Constructors are never NULL as values, whatever their members.
  ROW(c.id, c.name)                     AS row_val,        -- @notNull
  ARRAY[c.name, c.name]                 AS arr_val,        -- @notNull

  -- Subscripting is not: an out-of-range index yields NULL. Whether it IS
  -- out of range is a shape question, though, and a literal ARRAY[...]
  -- answers it — a constructor's lower bound is 1 and its length is what it
  -- lists, so a constant index inside that range selects a KNOWN element
  -- (2026-08-22). The element is then walked rather than assumed, which is
  -- what `null_element` pins.
  (ARRAY[c.id, c.id])[1]                AS in_range,       -- @notNull
  (ARRAY[c.id])[99]                     AS out_of_range,   -- @nullable
  (ARRAY[NULL::integer, c.id])[1]       AS null_element,   -- @nullable
  (ARRAY[c.id, c.id])[c.id]             AS open_index,     -- @nullable

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
