-- SELECT * expansion: multiple relations, column order
-- t: id(notNull), name(nullable), val(nullable), active(notNull)
-- u: id(notNull), t_id(notNull), email(notNull), val(nullable), status(nullable)
SELECT *   -- @notNull
           -- @nullable
           -- @nullable
           -- @notNull
           -- @notNull
           -- @notNull
           -- @notNull
           -- @nullable
           -- @nullable
FROM t INNER JOIN u ON u.t_id = t.id
