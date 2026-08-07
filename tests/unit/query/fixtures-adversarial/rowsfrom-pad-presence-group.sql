-- SWEEP-4 FINDING 1, its RANK-4 face. Quarantined: the group below is the
-- engine's CURRENT claim and is WRONG.
--
-- Falsifying data:
--   INSERT INTO customers (id, email, name) VALUES (1, 'a@x', 'ay');
--   INSERT INTO orders (id, customer_id, status, placed_at)
--     VALUES (5, 1, 'new', now());
-- Observed: three rows.
--
--     id | a      | b      | generate_series
--     ---+--------+--------+-----------------
--      5 | v      |      5 |               1
--      5 | (null) | (null) |               2
--      5 | (null) | (null) |               3
--
-- The engine emits `{ columns: [1,2,3], discriminants: [1] }`. On rows two
-- and three the discriminant `a` is NULL — which the group's contract reads
-- as "the unit was ABSENT" — while member 3 (`generate_series`) is 2 and 3.
-- That is `nullability-soundness.test.ts`'s second group assertion verbatim:
-- "absent arm (discriminants NULL) but member column(s) are non-NULL — the
-- unit did not extend as one".
--
-- The group exists only BECAUSE of finding 1: `a` is a discriminant because
-- the declared NOT NULL domain reading survived the padding, and a group is
-- emitted only with ≥ 1 discriminant. Clear the flag and this group is not
-- emitted at all. It is recorded separately because it is a different CLAIM
-- KIND reaching the consumer by a different route — a factored discriminated
-- union whose discriminant does not discriminate — and because it says where
-- the fix has to sit: before the group assembly reads the flags, not after.
--
-- Suspected mechanism: nullability-walk.ts `resolveTableFunctionColumns`
-- (finding 1), consumed by the presence-group assembly.
--
-- Attack-catalog entry: G (cross-mechanism interference) — the padding rule
-- meeting the group vocabulary.
-- @null-group 1,2,3
SELECT
  o.id,               -- @notNull
  x.a,                -- @nullable  (discriminant)
  x.b,                -- @nullable
  x.generate_series   -- @nullable
FROM orders o
LEFT JOIN LATERAL ROWS FROM (sw4_tab_srf(o.id), generate_series(1, 3)) x ON true
