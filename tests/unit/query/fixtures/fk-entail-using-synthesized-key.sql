-- Gate: the key equality may be SYNTHESIZED rather than written.
--
-- Foreign-key entailment reads the join's condition to decide whether the join
-- equates exactly the key. `USING` and `NATURAL` never write one — PostgreSQL
-- builds it from the shared column names — so the rule fires here only if the
-- synthesized conjuncts reach it the way `join-using-promotion.sql` shows they
-- reach the presence fixpoint.
--
-- `sw4_c` and `sw4_r` exist for this: both carry a column named `id`, and
-- `sw4_r.id` is a NOT NULL key onto `sw4_c.id`, so `USING (id)` synthesizes
-- exactly the key equality and nothing else. Their comment in schema.sql has
-- always said so ("the control for the join recording"); the fixture was never
-- written, and until it was the two tables were the only relations in the
-- schema that no fixture and no test source named.
--
-- The negative half shipped without it: `fk-entail-natural-no-common-columns.sql`
-- pins that a NATURAL join synthesizing NO equality entails nothing. This is
-- the other direction — the equality IS the key, so `sw4_c` never
-- null-extends and its primary key survives the LEFT JOIN. Its own near miss
-- is `fk-entail-natural-extra-conjunct.sql`, over these same two tables.
--
-- Witnessed under the `generated` state, where every one of the 9 `sw4_r` rows
-- finds its match; the four static states seed neither table and return
-- nothing.
--
-- @planner-keeps 1: the USING-synthesized key equality drives foreign-key
--   entailment; the planner does not reason from keys.
SELECT
  r.rid AS rid,   -- @notNull  (the preserved side)
  c.id  AS cid,   -- @notNull  (the key entails the match, through USING)
  c.v   AS cv     -- @nullable (a nullable column, whatever the join does)
FROM sw4_r r
LEFT JOIN sw4_c c USING (id)
