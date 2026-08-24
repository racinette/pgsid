-- A VALUES BODY, BOTH DIRECTIONS OF ITS SUMMARY RUNG.
--
-- analyzeSqlFunctionReturnTraced has a distinct verdict site per body
-- statement kind, and the VALUES site had no reaching input in the corpus
-- (rung-census.test.ts): every sql-bodied fixture function returns from a
-- SELECT or a DML. `fb_vals_nn`'s body is `VALUES (1)` — one row, one
-- non-null value, so the call claims notNull and every execution agrees.
-- `fb_vals_n`'s body is `VALUES (NULL::integer)`, the refusing twin, and its
-- NULL is on every returned row.
SELECT
  fb_vals_nn() AS vn,  -- @notNull
  fb_vals_n()  AS vx   -- @nullable
