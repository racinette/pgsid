-- Set operation of two CTE queries with different nullability.
-- CTE 'nonnull_source' selects only NOT NULL columns.
-- CTE 'null_source' selects a nullable column (deleted_at AS name).
-- UNION result: AND of corresponding columns — name is nullable.
WITH nonnull_source AS (
  SELECT id, name FROM products WHERE deleted_at IS NULL
),
null_source AS (
  SELECT id, deleted_at AS name FROM products
)
SELECT id   AS id,    -- 
       name AS name   --  (null_source has nullable deleted_at AS name)
FROM nonnull_source
UNION
SELECT id, name FROM null_source
