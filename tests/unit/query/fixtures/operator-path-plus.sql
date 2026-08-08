-- `path + path` is NULL whenever EITHER operand is a CLOSED path (measured;
-- open + open concatenates). The name-level allowlist claimed total for every
-- `+` and PARTIAL_OVERLOADS recorded this row as the known hole; with the
-- operand types readable from the casts, the narrowing resolves the exact
-- signature and reads its verdict instead — the hole closes exactly where
-- types are known, and `1 + 2` beside it keeps the general case: the integer
-- operands ELIMINATE the path row, so the claim survives the same candidate
-- set that refuses the path one.
SELECT
  '((0,0),(1,1))'::path + '((1,1),(2,2))'::path AS closed_sum,  -- @nullable
  '[(0,0),(1,1)]'::path + '[(1,1),(2,2)]'::path AS open_sum,    -- @nullable
  1 + 2                                         AS int_sum,     -- @notNull
  ('((0,0),(1,1))'::path + '((1,1),(2,2))'::path)
    + '[(0,0),(1,1)]'::path                     AS nested_sum,  -- @nullable
  (1 + 2) + (3 + 4)                             AS nested_int,  -- @notNull
  - (1 + 2)                                     AS neg_sum      -- @notNull
-- @unwitnessable 1: open + open CONCATENATES to a value (measured) — the
--   NULL needs a closed operand, which column 0 supplies; the claim is the
--   same per-signature verdict, nullable because the row is the recorded
--   non-total one, not because this operand pair can produce NULL
-- Columns 3 and 4 pin the return-type UNION threading: the inner operator's
-- survivor union is the outer operand's type set, so the nested path sum
-- resolves `path + path` at BOTH levels (NULL propagates through the strict
-- outer call — witnessed), while the nested integer sum composes to notNull
-- through the same mechanism's singleton case.
