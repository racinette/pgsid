-- THE CURATED NAME TABLES AT PRIORITY 6b, REACHED THROUGH NAMED NOTATION.
--
-- For a pg_catalog name the signature capture is scoped FROM the claim tables
-- themselves (snapshot.ts CLAIMED_FUNCTION_NAMES), so the typed dispatch
-- answers every positional call PostgreSQL accepts and the name-level rows at
-- the bottom of priority 6b looked unreachable. They are not: NAMED notation
-- breaks the positional lineup, the typed dispatch skips itself, and the bare
-- name decides — the one live route to the branch, measured 2026-08-24
-- (fallback-census.test.ts). `make_date` is the witness because it is on
-- STRICT_TOTAL_BUILTINS *and* declares parameter names, which no
-- ALWAYS_NOT_NULL or FIRST_ARG name does (measured against pg_proc.proargnames
-- the same day — those two branches stay dark, triaged in the census).
--
-- The name-level strict-total claim is order-insensitive — "total over
-- non-null arguments" quantifies over the set, so reordered named arguments
-- cannot invalidate it the way they defeat the positional signature lineup.
--
--   d_id   every argument non-null → the name claims notNull. Kill the branch
--          and this falls to conservative nullable — the annotation is the
--          mutation gate.
--   d_cat  category_id is nullable and `% 28 + 1` preserves that (NULL in,
--          NULL out), so the same branch refuses — witnessed by the seeded
--          NULL category rows. The modulo keeps every non-null day in 1..28,
--          so no execution can raise on an out-of-range date.
SELECT
  make_date(year => 2024, month => 2, day => (p.id % 28) + 1)          AS d_id,  -- @notNull
  make_date(year => 2024, month => 1, day => (p.category_id % 28) + 1) AS d_cat  -- @nullable
FROM products p
