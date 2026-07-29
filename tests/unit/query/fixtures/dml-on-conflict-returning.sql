-- INSERT ... ON CONFLICT ... RETURNING can produce zero rows.
--
-- RETURNING reports only rows actually inserted or updated. DO NOTHING
-- suppresses the row on a conflict, so a single-row VALUES is no longer a
-- single-row guarantee. That distinction only changes an output column's
-- nullability where zero rows becomes NULL rather than "no rows" — i.e. when
-- the statement is wrapped in a scalar function:
--
--   insert_tag          INSERT ... VALUES ... RETURNING id      -> always one row
--   insert_tag_upsert   INSERT ... ON CONFLICT DO NOTHING ...   -> zero or one
--
-- At the top level, zero rows simply means no output rows at all, so the
-- RETURNING columns below keep the target table's catalog nullability.
WITH inserted AS (
  INSERT INTO tags (id, name)
  VALUES (900, 'new-tag')
  ON CONFLICT DO NOTHING
  RETURNING id, name
)
SELECT
  i.id                          AS tag_id,           -- @notNull
  i.name                        AS tag_name,         -- @notNull
  insert_tag(p.name)            AS plain_insert,     -- @notNull
  insert_tag_upsert(p.id, p.name) AS upsert_insert,  -- @nullable
  COALESCE(insert_tag_upsert(p.id, p.name), 0) AS safe_upsert  -- @notNull
FROM inserted i
CROSS JOIN products p
