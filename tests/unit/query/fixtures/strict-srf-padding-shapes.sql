-- The two PADDING gates on `recordStrictSrfImplications` (see
-- strict-srf-filters-its-argument.sql for the mechanism).
--
-- Both are the same hazard in two spellings, and both were measured before
-- the gates were written rather than guessed:
--
--   rows_from  `ROWS FROM (unnest(a), unnest(b))` pads the arm that returned
--              nothing. With `a` NULL and `b` populated, the b arm supplies
--              the rows and the source row comes back with `a` NULL — so the
--              call did NOT filter its argument, and the mechanism must not
--              claim it did. Gated on the arm count.
--   zip_form   `unnest(a, b)` is ONE call over several arrays and pads
--              exactly the same way. Gated on `unnest`'s argument count
--              specifically, not on argument count in general: a two-argument
--              `generate_series(1, n)` is a single series over a scalar
--              bound and filters perfectly well.
--
-- Both columns must stay nullable, and `pair_holder`'s NULL-array seed is
-- what witnesses them. Widen either gate and this file goes red against
-- PostgreSQL's own rows, not against an annotation.
SELECT h3.pairs AS rows_from, h4.pairs AS zip_form
FROM pair_holder h3, ROWS FROM (unnest(h3.pairs), unnest(h3.dpairs)) r3,
     pair_holder h4, unnest(h4.pairs, h4.dpairs) AS z4(za, zb)
-- @nullable   (rows_from)
-- @nullable   (zip_form)
