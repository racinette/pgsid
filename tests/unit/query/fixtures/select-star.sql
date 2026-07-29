-- SELECT * expansion: multiple relations, column order
-- t: id(notNull), name(nullable), val(nullable), active(notNull)
-- u: id(notNull), t_id(notNull), email(notNull), val(nullable), status(nullable)
SELECT *   --   (t.id)
           --  (t.name)
           --  (t.val)
           --   (t.active)
           --   (u.id)
           --   (u.t_id)
           --   (u.email)
           --  (u.val)
           --  (u.status)
FROM t INNER JOIN u ON u.t_id = t.id
