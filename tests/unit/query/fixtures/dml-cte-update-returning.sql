-- UPDATE with WITH clause + RETURNING + subquery referencing the CTE.
-- The CTE 'archived' is registered in the DML scope; the RETURNING
-- subquery resolves 'archived' against the scope.
WITH archived AS (
  SELECT id, name FROM products WHERE deleted_at IS NOT NULL
)
UPDATE products SET price = 0 WHERE deleted_at IS NOT NULL
RETURNING
  id                              AS id,          -- 
  name                            AS name,        -- 
  COALESCE(deleted_at, now())     AS deleted,     --  (now() is unknown built-in → nullable)
  (SELECT count(*) FROM archived) AS archived_cnt  -- 
