-- Gate: a synthesized condition can be MORE than the key, and then it is the
-- same near miss `fk-entail-extra-conjunct.sql` pins for a written ON.
--
-- `sw4_c` is (id, v) and `sw4_r` is (rid, id, v), so NATURAL shares TWO names
-- and synthesizes `id = id AND v = v`. The key covers the first conjunct and
-- says nothing about the second, and a further conjunct can only remove
-- matches — which is exactly the null-extension the entailment would deny.
--
-- This is the control that keeps `fk-entail-using-synthesized-key.sql` from
-- passing for the wrong reason. Reading "a synthesized equality exists on the
-- key column" instead of "the condition IS the key equality" gives the same
-- answer there and the wrong one here, and only one of the two spellings can
-- tell them apart. The pair is the written case's pair — extra-conjunct beside
-- the plain ON — one step further in, where nobody wrote the condition.
--
-- PostgreSQL adjudicates it directly, and the DATA had to be arranged for it:
-- drawn from the type tier the two `v` columns are `word-row` strings that
-- never collide, so every row null-extended and the presence group below never
-- observed its PRESENT arm. `sw4_c.v` and `sw4_r.v` now share the small
-- vocabulary `t.val` and `u.val` already share, for the same reason.
--
-- `cid` is `sw4_c`'s primary key, so it is non-null on every matched row and
-- NULL exactly when the unit is absent — a discriminant.
-- @null-group 1*,2
SELECT
  r.rid AS rid,   -- @notNull  (the preserved side)
  c.id  AS cid,   -- @nullable (the v conjunct can drop the match the key found)
  c.v   AS cv     -- @nullable
FROM sw4_r r
NATURAL LEFT JOIN sw4_c c
