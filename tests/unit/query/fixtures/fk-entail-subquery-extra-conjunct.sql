-- Gate: the subquery's WHERE must be exactly the key equality.
--
-- The self-lookup licence is that the outer row is itself in the scanned set;
-- another conjunct can filter that very row away, which is the empty result
-- the claim denies. `deleted_at IS NOT NULL` is the plainest form of it, and
-- every live product witnesses the NULL.
SELECT
  p.id                                                        AS id,   -- @notNull
  (SELECT p2.name FROM products p2
    WHERE p2.id = p.id AND p2.deleted_at IS NOT NULL)         AS nm    -- @nullable
FROM products p
