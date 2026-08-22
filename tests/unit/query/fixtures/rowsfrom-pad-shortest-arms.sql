-- The padding's bound comparison run in the direction the other `rowsfrom-pad`
-- fixtures cannot reach: NOBODY is padded, because no arm is shorter than any
-- other. Both arms emit exactly one row, and PostgreSQL returns the one row
-- with both values present (measured).
--
--     dom_lenient | one_sku
--     ------------+---------
--     d           | only
--
-- This is the control for the two MINIMA the rest of the set never exercises,
-- and each of them is a claim that has to be earned rather than assumed:
--
--   dom_lenient  is not set-returning at all, so it contributes exactly one
--                row — including when it is handed NULL, where it still emits
--                its row, of NULLs. Lowering that minimum to zero passes every
--                other fixture in the corpus and fails this one.
--   one_sku      is SETOF, and a SETOF body's single row is a CEILING
--                elsewhere (rowsfrom-pad-strict-srf.sql) because a STRICT call
--                handed NULL never runs its body. `one_sku` takes no arguments,
--                so strictness has nothing to act through and the body runs on
--                every call — floor and ceiling both one.
--
-- Both @notNull claims are witnessed, so this is not an argument about what
-- the padding would do; it is the padding not happening, on a row that came
-- back. The NOT NULL domain returns are what give the claims something to be:
-- dom_lenient RETURNS nn_text and one_sku RETURNS SETOF non_empty_text.
SELECT
  x.dom_lenient,  -- @notNull
  x.one_sku       -- @notNull
FROM ROWS FROM (dom_lenient('a'), one_sku()) AS x
