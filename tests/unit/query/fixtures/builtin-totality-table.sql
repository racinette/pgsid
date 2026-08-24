-- Six former STRICT_TOTAL_BUILTINS members failed the table's own
-- admission criterion — total, not merely strict — and are out, each
-- measured returning NULL from non-null literal arguments: array_position
-- of an absent element; substring's FROM-regex form on no match (the total
-- positional form is indistinguishable at name level, so the name goes —
-- `substr` stays); scale and min_scale of NaN; to_number('',''); and
-- to_char(<datetime>, '') — the numeric/int to_char forms are total, but
-- name-level dispatch cannot tell them apart. Every row witnesses all six.
--
-- Two of the six read @alwaysNull since 2026-08-24, and the split is not about
-- totality at all — it is about CLOSURE. `b` and `c` are closed trees, so the
-- statement map holds their NULLs and closure makes them NULL on every row.
-- `a` is open (a bare unknown literal beside an array constructor, the
-- syntactic guard), `f` reads `now()`, and `d`/`e` are outside the closed
-- signature pool. The exclusions all six carry are unaffected: the table's
-- entry is about the NAME, and none of these got one.
SELECT
  array_position(ARRAY['a','b'], 'z') AS a,   -- @nullable
  substring('abc' FROM 'z+')          AS b,   -- @alwaysNull
  scale('NaN'::numeric)               AS c,   -- @alwaysNull
  min_scale('NaN'::numeric)           AS d,   -- @nullable
  to_number('', '')                   AS e,   -- @nullable
  to_char(now(), '')                  AS f    -- @nullable
