-- `+` IS ON THE NAME-LEVEL TOTAL LIST, AND `+(path,path)` IS NOT TOTAL.
--
-- The register kept the name on `TOTAL_OPERATORS` deliberately: `+(path,path)`
-- is NULL whenever either operand is a CLOSED path, but "the falsifying input
-- needs a path-typed column, which essentially no application schema has",
-- while dropping the name would cost `id + 1` on a NOT NULL integer — the most
-- common arithmetic in SQL. The signature narrowing was then built to close the
-- hole wherever operand types are READABLE.
--
-- What nobody asked was what happens where they are not. The name-level claim
-- was reached EXACTLY when the narrowing could not decide, so an operand
-- nothing could type got notNull for free. Measured 2026-08-24: `combined`
-- claimed notNull and PostgreSQL returned NULL on every row. The corpus could
-- not have caught it — it had no path-typed column at all, because the
-- register's own reason for keeping the name said one would be unusual.
--
-- A set operation is how the type is lost. `counted` is the control that the
-- refusal is not blanket: the same shape over integers still claims, because
-- the branches agree on `integer` and that eliminates the path row. `raw` is
-- the column itself, NOT NULL through the union because both branches are.
WITH swapped AS (
  SELECT r.seg AS a, r.alt AS b, r.id AS n FROM route r
  UNION ALL
  SELECT r.alt, r.seg, r.id + 1 FROM route r
)
SELECT
  s.a        AS raw,       -- @notNull
  s.n + 1    AS counted,   -- @notNull
  s.a + s.b  AS combined   -- @nullable
FROM swapped s
