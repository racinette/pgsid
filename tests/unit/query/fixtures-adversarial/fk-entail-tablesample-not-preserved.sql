-- SWEEP-4 FINDING 3 (rank 1). Quarantined: `cid` is the engine's CURRENT
-- claim and is WRONG.
--
-- Falsifying data:
--   INSERT INTO customers (id, email, name) VALUES (1, 'a@x', 'ay');
--   INSERT INTO orders (id, customer_id, status, placed_at)
--     VALUES (5, 1, 'new', now());
-- Observed: one row, `cid` NULL.
--
-- `TABLESAMPLE BERNOULLI (0)` keeps no rows, so the referenced side is empty
-- and the order is NULL-extended. BERNOULLI (0) is the deterministic
-- spelling; any sampled fraction below 1 falsifies the claim probabilistically.
--
-- Where finding 2 is a row-dropper the walk cannot SEE, this is one it does
-- not MODEL: `RangeTableSample` wraps the RangeVar, `addRangeVar` registers
-- the relation underneath it, and nothing records that the alias now stands
-- for a SAMPLE of the table rather than the table. Every fact keyed on
-- "stored rows of this relation" then over-reads. The correlated-subquery
-- anchor rule asks the same question and comes back SOUND (measured), for a
-- reason that is not a gate: `subqueryFromTree` accepts only a RangeVar leaf,
-- and a sampled relation arrives as a `RangeTableSample` wrapping one. That
-- is an accident of the reading's shape, not a decision.
--
-- The conservative response is one flag: a sampled relation is never
-- `subtreePreserves`-preserved and never a key's referenced side. It costs
-- nothing real — nobody writes a codegen query against TABLESAMPLE — and
-- what it buys is that the walk stops trusting a relation it is not reading.
--
-- Suspected mechanism: nullability-walk.ts `walkFromItem` /
-- `addRangeVar` (the `RangeTableSample` wrapper is unwrapped and forgotten),
-- read by `subtreePreserves` and `keyedRelation`.
--
-- Attack-catalog entry: C — "TABLESAMPLE" from its own probe list.
SELECT
  c.id AS cid   -- @notNull   <- FALSE
FROM orders o
LEFT JOIN customers c TABLESAMPLE BERNOULLI (0) ON c.id = o.customer_id
