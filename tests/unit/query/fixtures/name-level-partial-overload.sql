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
-- A set operation is how the type is lost: `reExportedBaseColumn` refuses a
-- target list under `SETOP_*` outright, so EVERY column of `swapped` reads
-- untyped — `s.n` as much as `s.a` (measured 2026-08-24 through the type-set
-- audit, with delegation both on and off).
--
-- The refusal is not blanket, and the four columns below say exactly where its
-- edge is. The rule is ONE overload subset, narrowed by whatever IS known:
--
--   raw        the column itself, NOT NULL through the union because both
--              branches are — no operator, no subset, no question
--   counted    ONE side known. `1` is `integer`, and no `+` row with an
--              integer-reachable operand is non-total, so the whole surviving
--              subset is total and the claim stands. This is what keeps
--              `id + 1` alive under the refusal, and it is NOT the union
--              agreeing on a type — `s.n` is untyped here, the LITERAL is what
--              narrows.
--   half_path  ONE side known, and knowing it does not help: `path` on the
--              left leaves `+(path,path)` and `+(path,point)` in the subset,
--              and the first is the recorded hole. Knowing an operand narrows;
--              it does not license.
--   combined   NEITHER side known, so the subset is every `+` row PostgreSQL
--              has, the hole among them. Nullable.
WITH swapped AS (
  SELECT r.seg AS a, r.alt AS b, r.id AS n FROM route r
  UNION ALL
  SELECT r.alt, r.seg, r.id + 1 FROM route r
)
SELECT
  s.a           AS raw,        -- @notNull
  s.n + 1       AS counted,    -- @notNull
  r2.id + s.n   AS half_int,   -- @notNull
  r2.seg + s.a  AS half_path,  -- @nullable
  s.a + s.b     AS combined    -- @nullable
FROM swapped s, route r2
