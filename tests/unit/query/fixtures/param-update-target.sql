-- UPDATE SET is the same assignment channel as INSERT: a NOT NULL target
-- column rejects NULL, a nullable one accepts it.
-- The second binding writes the NULL that $1's nullable claim permits — and
-- witnesses RETURNING val actually coming back NULL.
-- @args ["w", 530]
-- @args [null, 531]
-- @param 1 nullable
-- @param 2 notNull
UPDATE t SET val = $1, id = $2
WHERE active
RETURNING
  id,   -- @notNull
  val   -- @nullable
