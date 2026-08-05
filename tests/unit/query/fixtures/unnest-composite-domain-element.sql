-- The second site of adversarial-3 finding 4: `unnest` over an array whose
-- ELEMENT is a domain over a composite. The element type is provable here
-- (an ARRAY constructor of casts), so this arm refused rather than guessing
-- — the dispatch-site rule working correctly on a premise the catalog got
-- wrong. With domains resolved to their base composite it expands, and the
-- second element witnesses both fields.
SELECT * FROM unnest(ARRAY[ROW('a', 1)::d_sku, ROW(NULL, NULL)::d_sku])
-- @nullable   (sku)
-- @nullable   (qty)
