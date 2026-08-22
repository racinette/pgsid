-- Adversarial-2 finding 4 composed with MERGE's source-first RETURNING *
-- order (sweep-1 finding 10): the composite-element source contributes TWO
-- columns, so the engine's old one-column reading shifted the entire
-- target list by one and the UPDATE arm's written-value notNull for val
-- landed on PostgreSQL's name — NULL in sparse. With the element's fields
-- expanded the lists align: sku, qty, then the target's four.
MERGE INTO ck t USING unnest(ARRAY[ROW('k', 1)::sku_pair]) s ON t.id = s.qty
WHEN MATCHED THEN UPDATE SET val = 9
RETURNING *
-- @notNull    (sku: the source's one element has a non-null literal there,
--              which the walk reads through the MERGE source position too)
-- @notNull    (qty: every arm is MATCHED, so the ON equality is row-implied
--              and promotes it — a claim the old shape landed on `id`)
-- @notNull    (id)
-- @nullable   (name: witnessed by sparse's NULL-named ck row)
-- @notNull    (val: written 9 by the sole arm)
-- @notNull    (tag: nn_text, a NOT NULL domain — attnotnull stays false
--              for one, which is why this read nullable until it was closed)
