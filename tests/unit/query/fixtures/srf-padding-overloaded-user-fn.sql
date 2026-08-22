-- The padding rule reaching an OVERLOADED user SETOF function
-- (adversarial-3 finding 2). Set-returningness was asked through
-- `resolveFunctionMetadata` — the single-candidate shortcut, which answers
-- null for any overloaded name — and then fell through to a pg_catalog name
-- table where a user function can never appear. So this call was invisible
-- to the padding rule while remaining perfectly visible to the notNull
-- rule, which takes return-type CONSENSUS over the SAME two candidates and
-- reads both overloads' NOT NULL domain return: `o` was claimed notNull and
-- comes back NULL on rows 2 and 3.
-- Set-returningness is a property every candidate here shares, so consensus
-- answers it exactly — the same question the flag rule was already asking of
-- the same set. Independent of finding 1: completing the builtin name table
-- would not have moved this claim.
-- The same consensus answers the padding's ROW BOUND as of 2026-08-22, and
-- for the same reason: both overloads' bodies are `SELECT '…'::non_empty_text`
-- — no FROM, no WHERE, one row each, and neither declared STRICT — so
-- whichever one runs, `o` contributes exactly one row against the series'
-- three. That is a question the body map could not be asked while it was keyed
-- by NAME; srf-padding-overload-body-split.sql is the trap that key change
-- disarms, and body-shape-overload-collision.sql the claim it does NOT open.
SELECT
  ov_sku(1) AS o,             -- @nullable
  generate_series(1, 3) AS g  -- @notNull
