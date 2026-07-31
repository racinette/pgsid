-- The engine's first measured unsoundness, kept as its regression test: ===
-- is backed by a non-strict function that returns TRUE even for NULL
-- operands, so this WHERE filters nothing and val arrives NULL in the rows
-- PostgreSQL returns. A promotion trusting arbitrary operators wrongly
-- claimed non-null here; promotion accepts only the shared strict builtin set
-- (promotionOperatorIsStrict in nullability-walk.ts).
SELECT
  val AS c1,   -- @nullable
  name AS c2   -- @nullable
FROM t
WHERE val === 'zzz'
