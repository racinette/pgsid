-- The padding also covers the shape the strict short-circuit deliberately
-- excludes: a STRICT set-returning function handed NULL.
--
-- `sw4_tab_srf` returns NO rows for a NULL argument, so all three of its
-- output rows are padding:
--
--     a      | b      | generate_series
--     -------+--------+-----------------
--     (null) | (null) |               1
--     (null) | (null) |               2
--     (null) | (null) |               3
--
-- `callCanShortCircuit` excludes set-returning functions on the argument that
-- a claim about columns of rows that do not exist cannot be contradicted.
-- That is true of the CALL and false of the call inside a `ROWS FROM`, where
-- the longer arm supplies the rows and the padding supplies the NULLs.
--
-- The exclusion is not what was fixed, and should not be: the padding clears
-- these flags for a reason that has nothing to do with strictness, and a
-- strict SRF can never BE the longest arm — it returns zero rows.
-- The bound reads the strict arm's ceiling off its BODY rather than off its
-- strictness: `SELECT 'v'::nn_text, n` has no FROM clause and no WHERE, so it
-- yields exactly one row whenever it runs — at most one, since a strict call
-- handed NULL never runs it at all. One is covered by the series arm's three,
-- so the series arm is never padded. The strict-versus-not distinction stays
-- out of the padding rule, which is what this fixture set out to say.
SELECT
  x.a,                  -- @nullable  (the declared NOT NULL domain, padded away)
  x.b,                  -- @nullable
  x.generate_series     -- @notNull   (three rows against at most one)
FROM ROWS FROM (sw4_tab_srf(NULL::integer), generate_series(1, 3)) AS x
