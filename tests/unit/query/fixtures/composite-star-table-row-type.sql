-- `(x).*` over a TABLE's row type, in both spellings.
--
-- `resolveCompositeType` is backed by `CREATE TYPE … AS (…)` entries alone, so
-- `expandCompositeStar` asked a question that could only answer for a standalone
-- composite and REFUSED a table's row type — while PostgreSQL expands it
-- happily: `(h.row1).*` and `(NULL::trow).*` both yield [a, b] (measured).
--
-- This is the same latent defect the third fix phase's audit closed for the
-- unnest ELEMENT-type resolver, at its second site: there an array of a table's
-- row type resolved to nothing, here the bare row type did. The remedy is the
-- same two-step `columnsForReturnType` has always taken for `SETOF <table>`
-- versus `SETOF <composite>` — composite first, relation second.
--
-- Found by the composite-star generator axis,
-- which could not use `trow` until it landed. The corpus's own composite star
-- casts to a standalone composite, so this fixture is the relation arm's only
-- coverage; both spellings are here because they enter `fieldsOf` by different
-- routes — a COLUMN's rendered type, and a CAST's target name.
--
-- Every expanded field is nullable: the expansion rule forces it regardless of
-- what the fields are declared as, and `trow.a` is NOT NULL in the table.
-- Witnessed by the second row, whose `row1` is NULL.
SELECT
  (h.row1).*,      -- @nullable   (a: NOT NULL in trow, but the expansion rule
                   --              forces every field nullable regardless)
                   -- @nullable   (b)
  (NULL::trow).*,  -- @nullable   (a)
                   -- @nullable   (b)
  h.id AS hid      -- @notNull
FROM trow_holder h
