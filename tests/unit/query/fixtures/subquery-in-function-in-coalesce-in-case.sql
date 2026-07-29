-- Subquery in function argument in COALESCE in CASE.
-- Deepest expression nesting: CASE → COALESCE → function call → scalar subquery.
-- The scalar subquery (count) is single-row-guaranteed and count is non-null,
-- so lower_strict(count) is non-null (strict + non-null arg), so COALESCE
-- is non-null. The CASE has an ELSE and both branches are non-null, so the
-- whole expression is non-null.
SELECT
  p.id    AS product_id,   -- @notNull
  p.name  AS name,         -- @notNull
  CASE
    WHEN p.deleted_at IS NOT NULL THEN 'archived'
    ELSE COALESCE(
      lower_strict(
        (SELECT p2.name FROM products p2
         WHERE p2.id = p.id AND p2.deleted_at IS NOT NULL)
      ),
      'active'
    )
  END AS status   -- @notNull
FROM products p
