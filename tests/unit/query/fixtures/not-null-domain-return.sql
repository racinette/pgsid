-- NOT NULL domain return wins over everything: always_text returns nn_text
-- (a NOT NULL domain), so the result is non-null even when the argument is
-- a nullable column from a LEFT JOIN.
SELECT
  always_text(p.name)         AS guaranteed,    -- @notNull
  always_text(p.deleted_at::text)   AS from_nullable  -- @notNull
FROM products p
