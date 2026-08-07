-- A column the derived table COMPUTES, unnested by the outer query.
--
-- `ARRAY[c.p]` has no base column behind it, which is what the re-export
-- reading asks for and not what typing it needs: the defining expression is an
-- expression like any other, and reading it one level in — against the derived
-- table's own FROM — gives `sku_pair[]`. So the call contributes the
-- composite's FIELDS rather than one column named `unnest`, which is the shape
-- PostgreSQL emits.
--
-- The fields are nullable for the ordinary reason: a composite's fields carry
-- no constraints, and `cc.p` takes an empty-sku and an empty-qty shape by row
-- index so both are witnessed.
SELECT
  u.sku,   -- @nullable
  u.qty    -- @nullable
FROM (SELECT c.p AS one, ARRAY[c.p] AS ps FROM cc c) s, unnest(s.ps) u
