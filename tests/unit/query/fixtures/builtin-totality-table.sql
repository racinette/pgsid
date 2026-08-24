-- Six former STRICT_TOTAL_BUILTINS members failed the table's own
-- admission criterion — total, not merely strict — and are out, each
-- measured returning NULL from non-null literal arguments: array_position
-- of an absent element; substring's FROM-regex form on no match (the total
-- positional form is indistinguishable at name level, so the name goes —
-- `substr` stays); scale and min_scale of NaN; to_number('',''); and
-- to_char(<datetime>, '') — the numeric/int to_char forms are total, but
-- name-level dispatch cannot tell them apart. Every row witnesses all six.
--
-- Three of the six read @alwaysNull since 2026-08-24, and the split is not
-- about totality at all — it is about CLOSURE. `a`, `b` and `c` are closed
-- trees, so the statement map holds their NULLs and closure makes them NULL on
-- every row. `f` reads `now()`; `d` and `e` are name-shadowed by this schema's
-- own `min_scale` and `to_number` (the user-object collision rule, deliberate
-- — see the shadow declarations in schema.sql) and `to_number` is stable
-- besides. The exclusions all six carry are unaffected: the table's entry is
-- about the NAME, and none of these got one.
--
-- `a` was the last to flip, two days later than the note above first claimed
-- to explain it. That note said "open — a bare unknown literal beside an array
-- constructor, the syntactic guard", which named a mechanism the value does
-- not go through: the syntactic guards were replaced by typed operand tracking
-- in 2026-08-12. The real refusal was `array_position`'s POLYMORPHIC signature,
-- where an unknown operand was checked against the declared `anycompatible`
-- instead of the `text` it resolves to. Left here as written, because it is the
-- cleanest instance of the rot mode it caused to be filed.
SELECT
  array_position(ARRAY['a','b'], 'z') AS a,   -- @alwaysNull
  substring('abc' FROM 'z+')          AS b,   -- @alwaysNull
  scale('NaN'::numeric)               AS c,   -- @alwaysNull
  min_scale('NaN'::numeric)           AS d,   -- @nullable
  to_number('', '')                   AS e,   -- @nullable
  to_char(now(), '')                  AS f    -- @nullable
