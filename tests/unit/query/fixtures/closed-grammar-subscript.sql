-- A SUBSCRIPT over a CLOSED argument, and the two reasons one may still be
-- refused.
--
-- `A_Indirection` was excluded from the closed grammar as "structural facts
-- over open trees are refused" — true of `arr[i]` over a COLUMN, and silent
-- about a subscript that is closed all the way down. The allowlist census
-- could not see the gap: its two directions catch a kind admitted WRONGLY and
-- a gate nothing reaches, and a kind the gate never heard of trips neither.
-- Twenty-six expression kinds were sitting in that blind spot.
--
-- What makes the subscript closable is that it dispatches a TYPE'S OWN
-- routine rather than an I/O function: `array_subscript_handler` and
-- `jsonb_subscript_handler` are both immutable, and `json` has no handler at
-- all. PostgreSQL's own rule decides the result type — ANY slice in the list
-- gives the ARRAY type, otherwise the ELEMENT type.
--
-- `unrendered` is the same value as `past_end` with one difference, and it is
-- not about closure at all: every collected subtree goes back out through
-- pgsql-deparser, which drops the parentheses a subscripted ARRAY CONSTRUCTOR
-- needs (`ARRAY['a','b'][5]` — syntax error) while parenthesising a function
-- call correctly. A batch whose render is rejected returns nothing for the
-- WHOLE statement, so the argument kind is gated on what renders rather than
-- tolerated; the measurement is pinned in subtree-evaluator.test.ts.
--
-- `collated` needs the map rather than the shape: NULLIF is nullable by shape,
-- and the whole expression is closed because COLLATE names a catalog
-- collation and changes no value.
SELECT
  (array_remove(ARRAY['a','b'], 'a'))[1]   AS element,    -- @notNull
  (array_remove(ARRAY['a','b'], 'a'))[5]   AS past_end,   -- @alwaysNull
  (array_remove(ARRAY['a','b'], 'z'))[1:1] AS sliced,     -- @notNull
  ('{"a": 1}'::jsonb)['a']                 AS present,    -- @notNull
  ('{"a": 1}'::jsonb)['zz']                AS missing,    -- @alwaysNull
  (ARRAY['a','b'])[5]                      AS unrendered, -- @nullable
  nullif('a'::text COLLATE "C", 'a')       AS collated    -- @alwaysNull
FROM mesh
