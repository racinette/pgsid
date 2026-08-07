-- `array_agg` of a composite column, unnested back into its fields.
--
-- The element type comes from the ARGUMENT: `array_agg` declares
-- `(anynonarray) → anyarray` beside `(anyarray) → anyarray`, and a `sku_pair`
-- column fits the first, so the call yields `sku_pair[]` and `unnest`
-- contributes sku and qty rather than one column named `unnest`. The
-- signatures are read from pg_catalog, not curated.
--
-- Both fields are nullable for the ordinary reason — a composite's fields
-- carry no constraints — and `cc.p` takes an empty-sku and an empty-qty shape
-- by row index, so both are witnessed.
--
-- The second pair takes the other half of the rule: `array_remove` declares
-- `(anycompatiblearray, anycompatible)`, so the ARRAY position answers with
-- its own element type and the call composes onto the aggregate's result.
SELECT
  u.sku,    -- @nullable
  u.qty,    -- @nullable
  r.sku     AS r_sku,  -- @nullable
  r.qty     AS r_qty   -- @nullable
FROM unnest((SELECT array_agg(c.p) FROM cc c)) u,
     unnest(array_remove((SELECT array_agg(c.p) FROM cc c), NULL)) r
