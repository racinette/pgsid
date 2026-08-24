-- The containment REFUSAL under an explicit collation, recorded rather
-- than silent: the claim below is TRUE for stored rows — 'p' >= 'm'
-- under "C" exactly as under the session's default, so every returned
-- row took the o IS NOT NULL arm — and the engine must keep refusing it.
-- Order needs collation IDENTITY (the standing gate the exclusivity
-- refusal in check-interval-refusals.sql holds), and arm selection
-- inherits it: a deterministic non-default collation answers equality
-- only, the anchor relation lands on `ne`, and `ne` licenses no ray.
-- If this column ever flips notNull, a gate has opened that the charter
-- keeps closed.
-- @unwitnessable 0: every conforming caic row with s >= 'p' satisfied
--   the arm, so no NULL can exist here; the nullable word is the
--   engine's refusal, held by annotation.
SELECT
  o -- @nullable
FROM caic
WHERE s >= 'p'
