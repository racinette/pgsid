-- `path + path` is NULL whenever EITHER operand is a CLOSED path (measured;
-- open + open concatenates). The name-level allowlist claimed total for every
-- `+` and PARTIAL_OVERLOADS recorded this row as the known hole; with the
-- operand types readable from the casts, the narrowing resolves the exact
-- signature and reads its verdict instead — the hole closes exactly where
-- types are known, and `1 + 2` beside it keeps the general case: the integer
-- operands ELIMINATE the path row, so the claim survives the same candidate
-- set that refuses the path one.
--
-- `closed_sum` and `nested_sum` read @alwaysNull since 2026-08-24. Nothing
-- about the signature narrowing changed: both are CLOSED trees, the map
-- already held their NULLs, and the alwaysNull channel started reading it.
-- The narrowing is still what the fixture is for — it is the reason the
-- claim survives with no evaluator at all, where the map's answer is absent
-- and the verdict has to come from the resolved row.
SELECT
  '((0,0),(1,1))'::path + '((1,1),(2,2))'::path AS closed_sum,  -- @alwaysNull
  '[(0,0),(1,1)]'::path + '[(1,1),(2,2)]'::path AS open_sum,    -- @notNull
  1 + 2                                         AS int_sum,     -- @notNull
  ('((0,0),(1,1))'::path + '((1,1),(2,2))'::path)
    + '[(0,0),(1,1)]'::path                     AS nested_sum,  -- @alwaysNull
  (1 + 2) + (3 + 4)                             AS nested_int,  -- @notNull
  - (1 + 2)                                     AS neg_sum      -- @notNull
-- open_sum flipped nullable→notNull when the statement map landed
-- (2026-08-12, its @unwitnessable retired with it): the whole sum is a
-- closed subtree, open + open CONCATENATES to a value (measured), and the
-- map's exact answer replaces the per-signature nullable verdict — which
-- the censuses still exercise with the evaluator off. Columns 0 and 3 keep
-- the verdict's witness: their closed operand makes the same operator
-- answer NULL, map hit and symbolic walk agreeing.
-- Columns 3 and 4 pin the return-type UNION threading: the inner operator's
-- survivor union is the outer operand's type set, so the nested path sum
-- resolves `path + path` at BOTH levels (NULL propagates through the strict
-- outer call — witnessed), while the nested integer sum composes to notNull
-- through the same mechanism's singleton case.
