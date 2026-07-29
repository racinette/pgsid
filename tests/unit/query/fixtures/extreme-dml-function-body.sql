-- LANGUAGE sql functions wrapping DML with RETURNING, called in query contexts.
-- INSERT with single-row VALUES → single-row-guaranteed → propagate column
-- nullability. UPDATE/DELETE → can match zero rows → conservative nullable.
-- These functions can be called in scalar subqueries (unlike raw DML, which
-- is forbidden in subquery positions — only CTEs allow it).
SELECT
  insert_tag(p.name)               AS insert_id,    -- @notNull
  insert_tag(NULL)                 AS insert_nullarg, -- @notNull
  update_tag_price(p.id, p.name)  AS update_result, -- @nullable
  COALESCE(update_tag_price(1, p.name), 'none') AS safe_update  -- @notNull
FROM products p
