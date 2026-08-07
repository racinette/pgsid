-- A foreign key onto a PARTITIONED table is recorded once per partition on
-- top of the declared constraint, and the adapter kept whichever came last —
-- sweep-4 finding 4.
--
--     conname               | rel      | fref    | conparentid
--     ----------------------+----------+---------+-------------
--     sw4_pref_p_id_fkey    | sw4_pref | sw4_pp  |           0
--     sw4_pref_p_id_fkey_1  | sw4_pref | sw4_pp1 |       <the declared one>
--     sw4_pref_p_id_fkey_2  | sw4_pref | sw4_pp2 |       <the declared one>
--
-- The clones exist so a delete on one partition fires the right referential
-- trigger. NONE of them means "every referencing row matches THIS partition",
-- which is what reading one as a declared key claims: with `sw4_pp(1,'a')` and
-- `sw4_pp(150,'b')` referenced by `sw4_pref(10,1)` and `sw4_pref(11,150)`, the
-- row whose match lives in the other partition NULL-extends.
--
--     pid    | k
--     -------+--------
--     (null) | (null)     <- r(10, 1), whose match is in sw4_pp1
--     150    | b
--
-- `conparentid` is captured now and clones are skipped when the map is built.
-- That removes this wrong answer and recovers the declared key in one move —
-- the recovered claim is `fk-clone-partitioned-declared.sql`.
--
-- The presence group survives the fix and is correct: `sw4_pp2.id` is the
-- partition's primary key, so it is non-null on every row the join MATCHES
-- and NULL exactly when the unit is absent — which is what a discriminant is.
-- What the wrong flag had done was make it a claim about the whole relation
-- rather than about the join.
-- @null-group 0*,1
SELECT
  p.id AS pid,   -- @nullable  (a clone is not a key about this partition)
  p.k            -- @nullable
FROM sw4_pref r
LEFT JOIN sw4_pp2 p ON p.id = r.p_id
