-- A CLOSED set-returning call is COUNTED, by running it.
--
-- The lockstep padding expands `ROWS FROM` arms to the longest one's row count
-- and NULL-pads the rest, so an arm survives on its MINIMUM and pads the others
-- on their MAXIMUM. `armRowBounds` can count two shapes on its own — a call
-- returning one value, and `generate_series` over constant integer bounds — and
-- everything else was UNBOUNDED, which both fails to survive and pads everyone
-- else. `jsonb_path_query('[1]'::jsonb, '$[*]')` is one row and no arithmetic
-- on constants says so: counting a jsonpath match is PostgreSQL's job, so the
-- engine asks it before the walk and reads the answer as data
-- (`srf-cardinality.ts`, the third pre-walk round).
--
-- `kept` is what the count buys. Both arms emit exactly one row, so nothing is
-- padded and `dom_lenient`'s NOT NULL domain survives — the flag it would
-- otherwise lose to an arm the walk could not measure.
--
-- `padded` is the other side of the same number: three rows against one, so the
-- domain arm IS padded on rows 2 and 3 and PostgreSQL returns NULL there. The
-- count has to be read per DOCUMENT, not per name — the two columns call the
-- same function.
--
-- `empty_match` is the zero end. A path matching nothing is still a known
-- count, so the one-row arm is longest and keeps its flag; the jsonpath column
-- beside it is the one that goes NULL.
--
-- The refusals live next door and are not restated here:
-- `srf-padding-unlisted-builtin.sql` holds the VOLATILITY gate, where the
-- `_tz` sibling reads the session TimeZone and so cannot be counted ahead of
-- execution, and `srf-cardinality-red.test.ts` holds both that and the
-- open-argument gate as boundary guards.
SELECT
  a.dom_lenient          AS kept,        -- @notNull
  b.dom_lenient          AS padded,      -- @nullable
  c.dom_lenient          AS empty_kept,  -- @notNull
  c.jsonb_path_query     AS empty_match  -- @nullable
FROM ROWS FROM (dom_lenient('a'), jsonb_path_query('[1]'::jsonb, '$[*]')) a,
     ROWS FROM (dom_lenient('a'), jsonb_path_query('[1,2,3]'::jsonb, '$[*]')) b,
     ROWS FROM (dom_lenient('a'), jsonb_path_query('[]'::jsonb, '$[*]')) c
