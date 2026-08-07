-- `array_agg` of an ARRAY column takes the OTHER declared signature, and the
-- result is one dimension deeper.
--
-- `array_agg` declares `(anynonarray) → anyarray` beside `(anyarray) →
-- anyarray`. `unnest-polymorphic-aggregate.sql` fits the first with a
-- composite column; this one fits the second, so aggregating a `trow[]` column
-- yields `trow[][]` and unnesting it gives back the element's FIELDS.
--
-- The gate that matters here is the one the polymorphic rule states in its own
-- comment: a signature the call does not fit is DISCARDED rather than counted
-- as disagreement. Both signatures are declared for this name, and only one of
-- them describes this call.
--
-- The `IS NOT NULL` filter is load-bearing rather than cosmetic: `array_agg`
-- of an ARRAY raises "cannot accumulate null arrays" the moment one input is
-- NULL, and `trow_holder.rows` is nullable. Without it the statement raises in
-- every state that seeds a NULL, which asserts nothing.
--
-- Kept from the fourth sweep's section-E probes, which found no defect.
SELECT
  x.a,   -- @nullable
  x.b    -- @nullable
FROM unnest((SELECT array_agg(q.rows) FROM trow_holder q WHERE q.rows IS NOT NULL)) x
