-- Strictness constrains the NULL-input case only — NULL in ⇒ NULL out —
-- and says NOTHING about non-null input, the same distinction
-- TOTAL_OPERATORS and STRICT_TOTAL_BUILTINS always drew and the user-
-- function path once inferred past. All four shapes returned NULL from
-- non-null arguments (measured): strict_nullish's sql body is NULL and the
-- body walk now sees it; lookup_name's body has a FROM clause and can
-- return zero rows — sparse's customer 1 also has a NULL name, witnessing
-- it live; <-> dispatches its strict backing function's NULL body; and the
-- plpgsql variant has no analysable body at all and falls to conservative.
SELECT
  strict_nullish('a')     AS a,   -- @nullable
  lookup_name(t.id)       AS b,   -- @nullable
  ('a' <-> 'b')           AS c,   -- @nullable
  strict_nullish_pl('a')  AS d,   -- @nullable
  t.id                            -- @notNull
FROM t
