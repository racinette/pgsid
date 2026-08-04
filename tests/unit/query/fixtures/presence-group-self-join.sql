-- Two references to one table are two relation instances and two units:
-- the child's own columns stay required while the parent reference forms
-- its own group. dense: categories 1 and 3 are roots (parent absent),
-- category 2 hangs under 1 (present).
-- @null-group 2*,3*
SELECT
  c.id   AS cid,     -- @notNull
  c.name AS cname,   -- @notNull
  p.id   AS pid,     -- @nullable
  p.name AS pname    -- @nullable
FROM categories c
LEFT JOIN categories p ON p.id = c.parent_id
