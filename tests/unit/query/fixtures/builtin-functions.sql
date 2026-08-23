-- @unwitnessable 24: current_query() is NULL only when the statement has no source text, which no data state can arrange
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
  -- `random` left ALWAYS_NOT_NULL_BUILTINS (2026-08-06, the totality probe):
  -- PG17 added `random(min, max)` overloads for integer, bigint and numeric
  -- which are STRICT, so `random(NULL, NULL)` is NULL while the table claimed
  -- "never NULL whatever the arguments". Name-level dispatch cannot separate
  -- them from the total zero-argument form.
  --
  -- RECOVERED 2026-08-21 by the volatile sweep, and this is the row that
  -- sweep existed for: `random` is VOLATILE, the whole family sat in a
  -- bucket excluded from execution on that marker alone, and all five rows
  -- probe total for non-null arguments. Signature keying says what the name
  -- could not — the two-argument overloads keep their strictness and this
  -- call keeps its claim. Its `@unwitnessable` record is retired with it.
  random()                                AS rnd,             -- @notNull
  gen_random_uuid()                       AS uuid,            -- @notNull

  -- Total over non-null arguments.
  -- `upper` left the NAME table for its `(anyrange)` overload (NULL on an
  -- empty range — builtin-range-lower-upper.sql pins that side), and the
  -- typed dispatch RECOVERED the text meaning: the argument's type resolves
  -- the `(text)` row exactly and reads its signature-keyed verdict
  -- (STRICT_TOTAL_BUILTIN_SIGNATURES), so the name-level cost is paid off.
  upper(p.name)                           AS upper_name,      -- @notNull
  length(p.sku)                           AS sku_len,         -- @notNull
  round(p.price, 1)                       AS rounded,         -- @notNull
  abs(p.id)                               AS abs_id,          -- @notNull
  substr(p.name, 1, 3)                    AS prefix,          -- @notNull
  split_part(p.sku, '-', 9)               AS missing_part,    -- @notNull
  -- date_part/extract are OUT of the total table: month/day/hour of an
  -- infinite timestamp are NULL (adversarial-2 finding 11), and name-level
  -- dispatch cannot see the input. Conservative even over a NOT NULL column.
  -- `year` is one of the fields that stays a number even for an INFINITE
  -- timestamp, so this needs nothing of `placed_at` beyond its being non-null.
  -- It read nullable behind a recorded reason until the totality question was
  -- asked per FIELD and TYPE rather than per name — builtin-extract-infinity.sql.
  date_part('year', o.placed_at)          AS yr,              -- @notNull
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

  -- CURRENT_SCHEMA is NULL only when the search path names no existing
  -- schema — an engine option, not a data state, and one the walk may read.
  -- current-schema-unresolvable-path.sql arranges it and witnesses the NULL.
  CURRENT_SCHEMA                          AS schema_name,     -- @notNull

  -- Not in any table and not in the catalog → still conservatively nullable.
  -- `pg_sleep(0)` held this position and is claimed now (the volatile sweep,
  -- 2026-08-21). `current_query` is the replacement because it is a builtin
  -- the sweep deliberately did NOT promote: its `PG_RETURN_NULL` fires when
  -- the statement has no source text, and builtin-surface.test.ts's
  -- SETTLED_ELSEWHERE
  -- carries that reason — so the fallback control cannot quietly become a
  -- claimed row again without something failing first.
  current_query()                         AS unknown_builtin, -- @nullable

  -- A user-defined function shadowing a built-in name keeps its own metadata:
  -- lower_strict is STRICT, so a nullable argument makes it nullable.
  lower_strict(c.name)                    AS user_fn          -- @nullable
FROM products p
CROSS JOIN orders o
CROSS JOIN customers c
CROSS JOIN events e
