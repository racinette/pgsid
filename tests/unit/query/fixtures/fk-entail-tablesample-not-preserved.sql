-- A row-dropper the walk does not MODEL: `TABLESAMPLE` — sweep-4 finding 3.
--
-- The key says every order has a customer, and `BERNOULLI (0)` keeps none of
-- them, so the referenced side is empty and every order NULL-extends.
-- `BERNOULLI (0)` is the deterministic spelling; any fraction below 100
-- falsifies the claim probabilistically.
--
-- The walk unwraps `RangeTableSample` and registers the relation underneath
-- it, so the alias went on standing for the whole table. Every fact keyed on
-- "the STORED rows of this relation" then over-reads — which is the difference
-- from finding 2, where the row-dropper is one the walk cannot SEE rather than
-- one it does not model.
--
-- Where the flag is read: a sampled relation is never a key's side, and is
-- never `subtreePreserves`-preserved. Both, rather than one, so a later reader
-- of the second cannot re-acquire the wrong answer.
SELECT
  c.id AS cid   -- @nullable  (the sample keeps no customers, so every order extends)
FROM orders o
LEFT JOIN customers c TABLESAMPLE BERNOULLI (0) ON c.id = o.customer_id
