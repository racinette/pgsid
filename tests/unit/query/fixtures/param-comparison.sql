-- A comparison position never rejects NULL: operators resolve on the base
-- type, so neither a NOT NULL constraint nor a domain on the column is ever
-- consulted. A NULL binding matches nothing — legal, merely useless — and
-- "useless" is deliberately not this contract's business.
-- @args ["x"]
-- @param 1 nullable
SELECT id  -- @notNull
FROM t
WHERE val = $1
