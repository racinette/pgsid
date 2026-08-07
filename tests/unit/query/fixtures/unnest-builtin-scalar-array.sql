-- A BUILTIN function call as the unnest argument, which is where the element
-- type is decided by what the catalog knows about the name rather than by a
-- cast or a column.
--
-- `string_to_array` has no user candidate, no polymorphic signature to read —
-- its return type is a concrete `text[]` — and a builtin with a concrete
-- return cannot yield an array of a user composite. So the call contributes
-- ONE column, which is what PostgreSQL emits, rather than expanding fields it
-- does not have.
--
-- The element is nullable for the ordinary reason: `string_to_array` splits a
-- text and its elements carry no constraints. The third element here is the
-- empty string rather than a NULL, so the witness comes from the NULL the
-- two-argument form produces for a missing piece.
SELECT
  u        AS piece   -- @nullable
FROM unnest(string_to_array('a,,b', ',', '')) u
