-- An EXISTS in the statement's own WHERE is a row witness for a scalar
-- subquery keyed the same way — the third route to at-least-one, after the
-- key and the UNION arm, and the first whose evidence is a SIBLING CLAUSE
-- rather than anything about the subquery itself.
--
-- Every row that survives the WHERE passed the EXISTS, so a categories row
-- with that id is there, so `witnessed` finds one. No KEY reaches this: the
-- foreign key from products.category_id to categories.id entails nothing
-- because the column is NULLABLE, and a product with no category dangles
-- legitimately. The EXISTS excludes that row PER ROW, which a schema-level
-- key cannot do.
--
-- The two WHEREs are held to opposite standards, and each direction has a
-- column here.
--
--   `narrowed` is the CONSUMER gate. Its own WHERE carries a conjunct beyond
--     the correlation, and that conjunct can exclude the very row the EXISTS
--     witnessed — which is exactly what it does: the products that survive
--     have a category, and asking for a SOFT-DELETED one finds nothing.
--     Witnessed NULL.
--   `wider_witness` is the WITNESS gate, and it goes the other way. The
--     EXISTS there is free to be harder to satisfy, because a row that
--     passed a NARROWER test still passes the weaker claim the consumer
--     needs. `extreme-dml-update-pricing.sql` is that shape in earnest —
--     its EXISTS carries `AND c.deleted_at IS NULL` and its RETURNING
--     subquery does not.
--
-- Two more refusals, each isolated so that dropping its check alone is what
-- the fixture catches:
--
--   `other_column` keys the SAME relation off the SAME outer column through
--     a DIFFERENT one of its own — `c.parent_id` rather than `c.id`. The
--     EXISTS witnesses a category whose id is that value; it says nothing
--     about one whose parent_id is.
--   `other_relation` names a different relation entirely.
SELECT
  p.id                                                  AS pid,        -- @notNull
  (SELECT c.name FROM categories c
    WHERE c.id = p.category_id)                         AS witnessed,  -- @notNull
  (SELECT c.name FROM categories c
    WHERE c.id = p.category_id
      AND c.deleted_at IS NOT NULL)                     AS narrowed,   -- @nullable
  (SELECT c.name FROM categories c
    WHERE c.parent_id = p.category_id)                  AS other_column,  -- @nullable
  (SELECT s.tracking_no FROM shipments s
    WHERE s.order_id = p.id)                            AS other_relation -- @nullable
FROM products p
WHERE EXISTS (SELECT 1 FROM categories c WHERE c.id = p.category_id)
