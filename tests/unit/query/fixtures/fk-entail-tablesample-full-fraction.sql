-- @planner-keeps 1: the walk reads BERNOULLI (100) as the whole relation and
--   the key then settles the join; the planner does not reduce a join whose
--   inner side is a sampling scan, whatever the fraction says
-- The other side of the TABLESAMPLE refusal, and where the refusal stops.
--
-- `BERNOULLI (100)` keeps every row, so the alias still stands for the whole
-- relation and the foreign key entails the match as it always did. The walk
-- reads that now: `cid` is notNull.
--
-- This used to be a recorded refusal, on the argument that a fix reading the
-- fraction "would be one shape away from unsound: BERNOULLI (99) keeps every
-- row in almost every execution". The measurement says otherwise, and says
-- something sharper. Over twelve runs on a 500-row table:
--
--   BERNOULLI (100)  500 every time
--   SYSTEM    (100)  500 every time
--   BERNOULLI  (99)  489, 493, 494, 495, 496, 497 — it really does drop rows
--   SYSTEM     (99)  500 every time
--
-- So 99 is not one shape away from 100; it is a different KIND of statement.
-- And SYSTEM (99) is the trap the old note was reaching for without naming:
-- it keeps everything here because SYSTEM samples by PAGE and 500 rows is one
-- page. Read as evidence that a high fraction is safe, it is an artifact of
-- the table's size. The gate is EQUALITY WITH 100 — a fact about the clause —
-- and no threshold, which would be a guess about the data.
--
-- What holds the gate up is `fk-entail-tablesample-not-preserved.sql`, whose
-- `BERNOULLI (0)` keeps no rows at all and witnesses the NULL on every state.
-- A gate that accepted any fraction would claim notNull there and PostgreSQL
-- would contradict it. No column here needs to carry that, and one claiming
-- nullable over `BERNOULLI (99)` would have cost a recorded reason for a
-- refusal — 99 keeps every row of a table this small in almost every run.
SELECT
  c.id AS cid   -- @notNull
FROM orders o
LEFT JOIN customers c TABLESAMPLE BERNOULLI (100) ON c.id = o.customer_id
