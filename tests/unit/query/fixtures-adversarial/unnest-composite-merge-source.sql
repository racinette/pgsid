-- FINDING 4, composed with MERGE's source-first RETURNING * order
-- (sweep-1 finding 10's fix). The source contributes ONE engine column and
-- TWO PostgreSQL columns, so the whole target list shifts by one and the
-- target's written-value notNull lands on the source's neighbour.
--
-- Falsifying data: INSERT INTO ck (id, val, tag) VALUES (1, 1, 'k').
-- Observed RowDescription: ["sku","qty","id","name","val","tag"], row
--   ['k', 1, 1, NULL, '9', 'k'] — the engine's position 3 (`val`,
--   @notNull from the UPDATE arm) is PostgreSQL's `name`, which is NULL.
-- Engine list: ["s","id","name","val","tag"].
MERGE INTO ck t USING unnest(ARRAY[ROW('k', 1)::sku_pair]) s ON t.id = s.qty
WHEN MATCHED THEN UPDATE SET val = 9
RETURNING *
-- engine: s @nullable, id @notNull, name @nullable, val @notNull, tag @nullable
