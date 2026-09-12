-- @null-groups none
-- @param-rejections none
-- The exclusion needs real evidence against the earlier same-result arm.
-- Without `a <= 3`, rows with a > 5 produce 'same' while payload is NULL;
-- PostgreSQL returns that NULL and kills any unconditional arm selection.
SELECT
  payload -- @nullable
FROM gcase_shared
WHERE verdict = 'same'
