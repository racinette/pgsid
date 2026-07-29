-- Deeply nested CTE inside a subquery inside a CTE.
-- Outer CTE 'outer_cte' has a subquery in FROM; that subquery has its own
-- WITH clause with CTE 'inner_cte'. Tests CTE visibility: inner_cte is
-- local to the subquery, outer_cte is visible in the outer query.
WITH outer_cte AS (
  SELECT id, name FROM products WHERE deleted_at IS NULL
)
SELECT
  o.id    AS id,        -- @notNull
  o.name  AS name,     -- @notNull
  sub.extra AS extra    -- @notNull
FROM outer_cte o
JOIN (
  WITH inner_cte AS (
    SELECT id, deleted_at AS extra FROM products
  )
  SELECT ic.id, ic.extra
  FROM inner_cte ic
  WHERE ic.extra IS NOT NULL
) sub ON sub.id = o.id
