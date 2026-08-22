-- The STRICTNESS gate on `recordStrictSrfImplications` (see
-- strict-srf-filters-its-argument.sql for the mechanism).
--
--   loose_srf   `sw4_ignores_arg` is not STRICT, so it is CALLED with the
--               NULL, runs, and returns its row — the source row survives
--               with `seats` NULL and nothing about the argument follows.
--   strict_srf  `sw4_dom_srf` is never called, yields no rows, and the comma
--               join drops the source row, so `seats` is non-null on every
--               row this can emit.
--
-- The obvious control was `sw4_dom_rows`, the non-strict twin the schema
-- already carried — and it is the wrong one, which measurement said and
-- reading did not. Its body is `… FROM generate_series(1, n)`, so a NULL
-- argument empties the series and the call filters the source row anyway, for
-- a reason that has nothing to do with strictness. `sw4_ignores_arg` exists
-- because of that: it returns its row whatever it is handed.
--
-- Strictness is enforced by the executor, so `sql` and `plpgsql` bodies
-- behave alike; both were measured before the gate was written. The other
-- half of the same gate is SET-RETURNING, and it has no fixture because it
-- has no interesting shape: a strict SCALAR function in FROM returns ONE row
-- of NULL rather than none (`FROM h, upper(h.x) s` keeps every h), so it
-- fails the gate for a reason the walk reads off the metadata rather than
-- off the query.
SELECT s1.seats AS loose_srf, s2.seats AS strict_srf
FROM subscription s1, sw4_ignores_arg(s1.seats) g1,
     subscription s2, sw4_dom_srf(s2.seats) g2
-- @nullable   (loose_srf)
-- @notNull    (strict_srf)
