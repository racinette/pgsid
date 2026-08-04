-- Occurrence counting across a USING merge, with a DISTINGUISHABLE
-- duplicate pair: the merged k disappears from s1's remainder, and the
-- two surviving `id` columns differ in nullability (o.id NOT NULL,
-- g.a null-extended) — so any off-by-one in the per-entry occurrence
-- count would flip a claim. It cannot shift by construction: counting is
-- per NAME, and a duplicate-named column can never be the USING column
-- (the merge itself would be ambiguous) — this fixture holds that
-- reasoning to execution. dense: gm is empty, witnessing column 2.
-- Column order: USING emits the merged column first, then remainders.
-- @notNull (k — merged, supplied by whichever side is present; both required here)
SELECT * FROM (
  SELECT
    o.id AS k,
    o.id AS id,     -- @notNull
    g.a  AS id      -- @nullable
  FROM orders o
  LEFT JOIN gm g ON g.a = o.id
) s1
JOIN (
  SELECT
    o2.id AS k,
    o2.status       -- @notNull
  FROM orders o2
) s2 USING (k)
