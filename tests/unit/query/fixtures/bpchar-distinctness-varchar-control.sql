-- The varchar control for the padding gate. `character varying` keeps
-- trailing blanks significant ('a'::varchar(4) = 'a ' is FALSE — measured),
-- so no admissible row pairs k = 'a' with a NULL x — ('a', NULL) is refused
-- (measured) — and the tokens really are distinct values. `x` is notNull.
--
-- Getting there took seeing through a CAST, because a CHECK on a varchar
-- column does not deparse as one on a bpchar column does. PostgreSQL renders
-- the SAME constraint two ways depending on the column's type (measured):
--
--   k varchar(4)  ->  CHECK (((k)::text <> 'a '::text) OR (x IS NOT NULL))
--   k char(4)     ->  CHECK ((k <> 'a '::bpchar)       OR (x IS NOT NULL))
--
-- The bpchar form compares the column directly; the varchar form wraps it. So
-- the varchar conjunct was not recognised as being ABOUT `k` at all, and the
-- claim read nullable behind a reason that called the refusal deliberate.
--
-- It was deliberate — for bpchar. The cast is unwrapped only inside the
-- BLANK-SIGNIFICANT class, and `character` is not in it, on this measurement:
--
--   'a  '::varchar(4)::text = 'a  '::text   TRUE, length preserved
--   length('a'::char(4)::text)              1, not 4 — the cast STRIPS
--   'a'::bpchar(4) = 'a '::bpchar           TRUE  — blank-INSENSITIVE
--   'a'::bpchar(4) = 'a '::text             FALSE
--
-- For `character` the cast changes the value AND the operator, in opposite
-- directions, which is exactly how the padding unsoundness got through before
-- the OID was dropped. For `character varying` the cast is an identity and
-- there is nothing to get through. A SIZED cast is out either way —
-- `'abc'::varchar(4)::varchar(1)` is 'a' (measured), so a typmod truncates.
--
-- `bpchar-literal-distinctness.sql` is the other side and must not move.
SELECT
  v.x,  -- @notNull
  v.k   -- @notNull
FROM vc v
WHERE v.k = 'a'
