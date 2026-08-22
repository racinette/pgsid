-- The vacuous arm of `computeSetOpGroups`, pinned as a GROUP rather than as
-- a nullability claim — because the group is the thing the change is for,
-- and the group is the thing nothing else checks.
--
-- UNION branches agree on presence groups by INTERSECTING them, and a
-- branch of literals has no outer join, so no null-extension unit, so no
-- group to agree with. It also cannot break one: every row it contributes
-- has the discriminants non-null, so it lands in the present arm and
-- neither half of the contract ("absent ⇒ every member NULL", "a
-- discriminant is NULL iff absent") has a case to fail on. So a left group
-- survives when every discriminant is notNull on the right.
--
-- That is what keeps the add-a-sentinel idiom's two-arm union type instead
-- of degrading it to two independently-nullable columns. Corpus-wide it
-- admitted 896 groups on landing, all with both arms observed and none
-- falsified.
--
-- Why this fixture exists: mutating the vacuous arm away drops the
-- generated corpus from 2558 groups to 1662 and NOTHING FAILS on that
-- count — the run goes red only because four unrelated a_tb claims lose
-- their proof downstream and trip the classification gate. Break that
-- coupling (close a_tb another way, or re-add its rule) and 896 exported
-- groups vanish in silence. `@null-group` is a direct assertion on the
-- claim itself.
--
-- Columns 0 and 1 are u.email and u.val across a LEFT JOIN, so they
-- null-extend together; email is NOT NULL given presence and is therefore
-- the discriminant. The literal branch supplies non-null values for both,
-- which is exactly the vacuous case.
-- @null-group 0*,1
SELECT u.email AS em, u.val AS vl   -- @nullable
                                    -- @nullable
FROM t LEFT JOIN u ON u.t_id = t.id
UNION ALL
SELECT 'lit@b.c'::text, 'lv'::text
