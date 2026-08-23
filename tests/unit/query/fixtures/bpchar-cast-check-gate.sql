-- The gate on unwrapping a cast around a column reference in a CHECK.
--
-- A CHECK on a VARCHAR column deparses its comparison through `(k)::text`,
-- where a bpchar one deparses against the column directly — so recognising
-- the varchar form at all means seeing through that cast
-- (`bpchar-distinctness-varchar-control.sql`). This fixture is the shape that
-- must NOT be seen through, and it gets there by writing the cast by hand so
-- that a CHAR column produces the varchar rendering:
--
--   CHECK (((k)::text = 'a'::text) OR (x IS NOT NULL))
--
-- Everything then turns on whether `character` may join `character varying`
-- and `text` in the blank-significant class. It may not, and this row is why.
-- Two facts about the same value point opposite ways (both measured):
--
--   k stores 'a   ' and `k::text` is 'a'   — the cast STRIPS the padding, so
--                                            the first disjunct is TRUE and a
--                                            NULL x is admissible
--   `k = 'a '` selects it anyway           — bpchar comparison is
--                                            blank-INSENSITIVE
--
-- What actually holds it is the catalog's OID whitelist behind
-- `literalDistinctnessSound` — text (25) and varchar (1043), never bpchar
-- (1042) — and that predicate is asked at three points now, of which only the
-- one inside `litsDistinct` is reachable from here. Mutating either of the
-- other two leaves this fixture green, which is worth writing down rather
-- than leaving to look like coverage: this file pins the SHAPE (a bpchar
-- column whose CHECK deparses through a cast, which nothing else in the
-- corpus has) and the row that would be mis-claimed, not a minimal
-- discriminator for a single gate.
--
-- `bpchar-distinctness-varchar-control.sql` is the same rule from the side
-- where it fires, and `bpchar-literal-distinctness.sql` the untouched bpchar
-- form that never reaches a cast at all — that one is what falsifies the
-- whitelist if it is ever widened.
SELECT
  b.x,  -- @nullable
  b.k   -- @notNull
FROM bcx b
WHERE b.k = 'a '
