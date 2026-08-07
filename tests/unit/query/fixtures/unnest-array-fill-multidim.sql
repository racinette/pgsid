-- `array_fill`'s polymorphic signature: the result takes its element type from
-- the position declared `anyelement`, and the DIMENSION argument is not one.
--
-- `array_fill(anyelement, integer[])` is the half of the polymorphic-array
-- rule that reads an ELEMENT-typed position plus a dimension, rather than an
-- ARRAY-typed one. Two dimensions deliberately: the rule takes the element
-- type and adds the dimensionality, and a one-element `ARRAY[2]` would not
-- tell a correct reading from one that ignored the dimensions.
--
-- So `unnest` contributes sku and qty, not one column called `array_fill`.
--
-- Kept from the fourth sweep's section-E probes, which found no defect: this
-- is the one shape there that the corpus did not already reach.
-- `unnest-polymorphic-aggregate.sql` covers the ARRAY-typed position.
SELECT
  x.sku,   -- @nullable
  x.qty    -- @nullable
FROM unnest(array_fill(NULL::sku_pair, ARRAY[2, 2])) x
