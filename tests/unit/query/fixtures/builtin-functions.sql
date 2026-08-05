-- @unwitnessable 10: date_part of a FINITE timestamp is never NULL; the exclusion exists for the infinite inputs (adversarial-2 finding 11), and orders.placed_at seeds none — builtin-extract-infinity.sql witnesses that class
-- @unwitnessable 23: CURRENT_SCHEMA is NULL only when the search path resolves to no schema, which no data state can arrange
-- @unwitnessable 24: pg_sleep returns void and never NULL, but sits outside the curated builtin tables (known imprecision)
-- pg_catalog built-ins.
--
-- The catalog snapshot covers user schemas only, so built-ins arrive with no
-- FunctionInfo. Rather than falling through to "unknown function → nullable",
-- they are matched against curated tables. Membership requires being *total*
-- (never NULL for non-null arguments), not merely strict — raising on bad
-- input still counts, since an error is not a NULL.
--
-- products.name/sku/price are NOT NULL; customers.name and products.deleted_at
-- are nullable.
SELECT
  -- Always non-null, whatever the arguments.
  now()                                   AS ts,              -- @notNull
  CURRENT_DATE                            AS today,           -- @notNull
  random()                                AS rnd,             -- @notNull
  gen_random_uuid()                       AS uuid,            -- @notNull

  -- Total over non-null arguments.
  upper(p.name)                           AS upper_name,      -- @notNull
  length(p.sku)                           AS sku_len,         -- @notNull
  round(p.price, 1)                       AS rounded,         -- @notNull
  abs(p.id)                               AS abs_id,          -- @notNull
  substr(p.name, 1, 3)                    AS prefix,          -- @notNull
  split_part(p.sku, '-', 9)               AS missing_part,    -- @notNull
  -- date_part/extract are OUT of the total table: month/day/hour of an
  -- infinite timestamp are NULL (adversarial-2 finding 11), and name-level
  -- dispatch cannot see the input. Conservative even over a NOT NULL column.
  date_part('year', o.placed_at)          AS yr,              -- @nullable
  md5(p.sku)                              AS digest,          -- @notNull

  -- ...and nullable as soon as an argument is.
  upper(c.name)                           AS upper_cust,      -- @nullable
  length(c.name)                          AS cust_len,        -- @nullable

  -- concat ignores NULL arguments entirely; all-NULL input yields ''.
  concat(c.name, p.deleted_at)            AS joined,          -- @notNull

  -- concat_ws and format hinge on their FIRST argument only.
  concat_ws(',', c.name, p.deleted_at)    AS joined_ws,       -- @notNull
  concat_ws(c.name, 'a', 'b')             AS ws_null_sep,     -- @nullable
  format('%s/%s', c.name, p.deleted_at)   AS formatted,       -- @notNull
  format(c.name, 'x')                     AS format_null_fmt, -- @nullable

  -- JSON constructors always produce a container.
  jsonb_build_object('k', c.name)         AS obj,             -- @notNull
  jsonb_build_array(c.name, p.deleted_at) AS arr,             -- @notNull

  -- NOT total: NULL for an empty array or a missing path, so excluded from
  -- the tables even though both are strict.
  array_length(ARRAY[p.id], 2)            AS bad_dim,         -- @nullable
  jsonb_extract_path(e.data, 'nope')      AS missing_path,    -- @nullable

  -- CURRENT_SCHEMA is NULL when the search path resolves to nothing.
  CURRENT_SCHEMA                          AS schema_name,     -- @nullable

  -- Not in any table and not in the catalog → still conservatively nullable.
  pg_sleep(0)                             AS unknown_builtin, -- @nullable

  -- A user-defined function shadowing a built-in name keeps its own metadata:
  -- lower_strict is STRICT, so a nullable argument makes it nullable.
  lower_strict(c.name)                    AS user_fn          -- @nullable
FROM products p
CROSS JOIN orders o
CROSS JOIN customers c
CROSS JOIN events e
