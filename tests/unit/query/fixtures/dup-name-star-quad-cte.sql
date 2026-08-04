-- The four-id shape through a CTE and `j.*` — the list-index branch of
-- the positional fix at the same strength, same alternating claims, same
-- three-position group with two duplicate-named members. Identical
-- expectations to dup-name-star-quad.sql by design: the two expansion
-- branches must agree, and the fixture pair holds them to it.
-- @null-group 0*,2*,6
WITH j AS (
  SELECT
    sh.id,                    -- @nullable
    o.id AS id,               -- @notNull
    sh.carrier,               -- @nullable
    g.a AS id,                -- @nullable
    o.status,                 -- @notNull
    c.id AS id,               -- @notNull
    sh.tracking_no AS status  -- @nullable
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  LEFT JOIN shipments sh ON sh.order_id = o.id
  LEFT JOIN gm g ON g.a = o.id
)
SELECT j.* FROM j
