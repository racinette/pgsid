-- A POLYMORPHIC SIGNATURE, on both sides of the check that reads it.
--
-- `survivorConsensus` decides two things per candidate row: an UNKNOWN operand
-- must land on a parameter with immutable I/O, because the landing runs that
-- type's input function; and the RESULT must be base-kind, because a
-- pseudo-typed result names no concrete type to thread upward. Both read the
-- SIGNATURE's declared spelling, which for a polymorphic row is
-- `anycompatible` or `anycompatiblearray` — never a base type, never in a set
-- of them. So the check that was meant to catch a stable input function caught
-- every polymorphic call instead.
--
-- The tell was that the same call folded or did not by whether an argument had
-- been SPELLED with its type: `array_position(ARRAY['a','b'], 'z'::text)` was
-- closed while `array_position(ARRAY['a','b'], 'z')` was open, which is not a
-- fact about volatility.
--
-- `found` and `missing` are the unknown-landing half, in both directions.
-- `remaining` and `emptied` are the polymorphic-RESULT half: `array_remove`
-- returns `anycompatiblearray`, so nothing ABOVE it could close either, and
-- the refusal propagated up the whole expression.
--
-- `gated` is the check still doing its job. `date` is not in the immutable-I/O
-- set — `date_in` reads DateStyle — so the resolved landing fails the same
-- check the declared one used to, and the engine claims nothing. That refusal
-- is necessary rather than shy, and polymorphic-landing-red.test.ts carries
-- the value that proves it: `array_position(ARRAY['2020-01-02'::date],
-- '01/02/2020')` is 1 under MDY and NULL under DMY.
SELECT
  array_position(ARRAY['a','b'], 'a')                     AS found,      -- @notNull
  array_position(ARRAY['a','b'], 'z')                     AS missing,    -- @alwaysNull
  array_length(array_remove(ARRAY['a','b'], 'a'), 1)      AS remaining,  -- @notNull
  array_length(array_remove(ARRAY['a'], 'a'), 1)          AS emptied,    -- @alwaysNull
  array_position(ARRAY['2020-01-02'::date], '2020-01-03') AS gated       -- @nullable
FROM mesh
