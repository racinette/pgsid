-- A CAST OVER A COMPUTED ARGUMENT, on both sides of the gate that admits one.
--
-- The subtree evaluator used to refuse every cast whose argument was not a
-- literal, and the reason was a real leak: a stable OUTPUT function crossing
-- an I/O coercion moves with session state, `to_timestamp(0)::text` being the
-- pinned example. But that is a fact about TIMESTAMPTZ, not about computation,
-- and the module decides every other closure question by TYPE. So the gate
-- reads the type set now: a computed argument closes when its own types lie
-- inside the builtin immutable-I/O set — the same 48 the cast TARGET is
-- checked against.
--
-- `admitted` travels text → jsonb, both members, so the whole expression
-- closes and PostgreSQL answers it. Without the widening the cast is open, the
-- `->>` around it is open with it, and `->>` returns NULL for a missing key —
-- so the walk had to call it nullable on shape alone.
--
-- `absent` is the same expression with a key that is not there. It closes the
-- same way and answers NULL, which is a claim in the other direction and the
-- guard against reading "closed" as "non-null".
--
-- `gated` is the leak, still gated. `date` is NOT in the immutable-I/O set —
-- `date_out` is stable, which is the whole reason the set excludes it — so the
-- cast stays open and the engine claims nothing beyond the shape. It matters
-- that it claims nothing: `('2020-01-02'::date)::text` is '2020-01-02' under
-- ISO and '02.01.2020' under German (measured in
-- computed-cast-closure-red.test.ts), so the NULLIF is NULL under one DateStyle
-- and a string under another. An analysis-time answer here would not bind
-- enforcement, and `@nullable` is the honest word for a value that is NULL in
-- this session and might not be in the next.
SELECT
  ('{"a": 1}'::text)::jsonb ->> 'a'                    AS admitted,  -- @notNull
  ('{"a": 1}'::text)::jsonb ->> 'missing'              AS absent,    -- @alwaysNull
  nullif(('2020-01-02'::date)::text, '2020-01-02')     AS gated      -- @nullable
FROM mesh
