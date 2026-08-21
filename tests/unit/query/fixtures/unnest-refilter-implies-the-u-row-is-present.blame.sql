-- BLAME FILE for `unnest-refilter-implies-the-u-row-is-present` in
-- tests/unit/query/generated/generated-soundness.test.ts (the unnest half of
-- the plain/a_tb bucket). See body-parameter-by-name-is-untyped.blame.sql for
-- what a blame file is.
--
-- The mechanism: the walk calls EVERY field of an unnested composite nullable,
-- whatever the element expression put there. The array element is an arbitrary
-- expression and the field's own type carries no flag, so there is nothing to
-- read — deliberate conservatism, and the reason depends on it being the
-- operative cause rather than the refilter's row geometry.
--
-- `src` and `field` carry the SAME value. If `field` ever flips to notNull the
-- walk has learned to type unnest fields from the element expression, and the
-- reason — which says no data can witness the claim because the u row is
-- present — is answering a question nobody is asking any more: there would be
-- no nullable claim there to excuse.
-- @unwitnessable 1: the field carries t.id, which the catalog says is NOT
--   NULL, so no row can put a NULL there. The claim the rule excuses,
--   executed — and the contrast with column 0 is the whole reason.
SELECT
  t.id AS src,   -- @notNull   the catalog's NOT NULL, read directly
  g.p  AS field  -- @nullable  the same value, through an unnest field
FROM t, unnest(ARRAY[ROW(t.id::text, t.name)::gfn_pair]) AS g
