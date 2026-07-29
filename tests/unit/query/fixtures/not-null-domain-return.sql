-- NOT NULL domain return wins over everything: always_text returns nn_text
-- (a NOT NULL domain), so the result is non-null even when the argument is
-- a nullable column from a LEFT JOIN.
SELECT
  always_text(p.name)         AS guaranteed,    -- 
  always_text(p.deleted_at)   AS from_nullable  -- 
FROM products p
