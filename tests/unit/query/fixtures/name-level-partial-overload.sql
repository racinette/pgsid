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
-- The refusal is not blanket, and the columns below say exactly where its edge
-- is. The rule is ONE overload subset, narrowed by whatever IS known:
--
--   raw          the column itself, NOT NULL through the union because both
--                branches are — no operator, no subset, no question
--   counted      ONE side known. `1` is `integer`, and no `+` row with an
--                integer-reachable operand is non-total, so the whole
--                surviving subset is total and the claim stands. This is what
--                keeps `id + 1` alive under the refusal.
--   half_path    ONE side known, and knowing it does not help: `path` on the
--                left leaves `+(path,path)` and `+(path,point)` in the subset,
--                and the first is the recorded hole. Knowing an operand
--                narrows; it does not license.
--   combined     both sides `path`. Nullable, and since 2026-08-24 by the
--                SIGNATURE — see below.
--   opaque_sum   the shape that still reaches the NAME-LEVEL fallback, and the
--                only live witness in this fixture for the guard that made it
--                refuse.
--
-- THE WITNESS MOVED, AND THAT IS WORTH READING CAREFULLY. This fixture was
-- written around a set operation because that was how the type got lost:
-- `reExportedBaseColumn` refused a target list under `SETOP_*` outright, so
-- EVERY column of `swapped` read untyped — `s.n` as much as `s.a`. Closing
-- that gap (`reExportedTypeSet`, the same day) types them all, so `combined`
-- is now caught one step EARLIER, by `+(path,path)` losing the signature
-- narrowing rather than by the name-level guard refusing.
--
-- Which would have quietly retired this fixture from the job it was written
-- for. `opaque` is why it did not: a WINDOW call is refused by the type
-- reading BY DESIGN (its semantics live in its own dispatch), so `o.a` and
-- `o.b` are non-null values of an unreadable type — exactly the residue the
-- name-level claim used to be handed for free. `opaque_raw` is the control
-- that makes `opaque_sum` mean something: the operands are notNull, so the
-- ONLY thing producing a nullable sum is the operator refusal itself.
WITH swapped AS (
  SELECT r.seg AS a, r.alt AS b, r.id AS n FROM route r
  UNION ALL
  SELECT r.alt, r.seg, r.id + 1 FROM route r
),
opaque AS (
  SELECT first_value(r.seg) OVER (PARTITION BY r.id) AS a,
         first_value(r.alt) OVER (PARTITION BY r.id) AS b
  FROM route r
)
SELECT
  s.a           AS raw,         -- @notNull
  s.n + 1       AS counted,     -- @notNull
  r2.id + s.n   AS half_int,    -- @notNull
  r2.seg + s.a  AS half_path,   -- @nullable
  s.a + s.b     AS combined,    -- @nullable
  o.a           AS opaque_raw,  -- @notNull
  o.a + o.b     AS opaque_sum   -- @nullable
FROM swapped s, route r2, opaque o
