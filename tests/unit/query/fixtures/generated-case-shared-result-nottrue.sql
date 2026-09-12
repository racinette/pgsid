-- @null-groups none
-- @param-rejections none
-- Reverse entailment through a generated CASE when RESULT distinctness cannot
-- choose an arm. Both WHEN arms emit 'same', but TRUE(a <= 3) proves the first
-- guard `a > 5` not-TRUE. CASE skips FALSE and NULL guards alike, so the only
-- remaining producer is the second arm and its condition pins payload.
SELECT
  payload -- @notNull
FROM gcase_shared
WHERE a <= 3
  AND verdict = 'same'
