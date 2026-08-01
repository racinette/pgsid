-- INSERT ... SELECT feeds the written-value map from the source's own
-- analysis, positionally: name receives the NOT NULL email (notNull even
-- though t.name's catalog says nullable), while val receives the nullable
-- customer name — witnessed by the customers rows whose name is NULL.
INSERT INTO t (id, name, val, active)
SELECT c.id + 700, c.email, c.name, true FROM customers c
RETURNING
  id AS c1,    -- @notNull
  name AS c2,  -- @notNull
  val AS c3    -- @nullable
