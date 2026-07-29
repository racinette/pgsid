-- A VALUES alias list renames the columns positionally. PostgreSQL applies it
-- partially: naming fewer columns than exist leaves the rest as columnN, and
-- only naming MORE than exist is an error.
SELECT *   -- @notNull   renamed to a
           -- @nullable  renamed to b (second row supplies NULL)
FROM (VALUES (1, 2), (3, NULL)) v(a, b)
