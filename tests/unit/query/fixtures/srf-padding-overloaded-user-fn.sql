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
SELECT
  ov_sku(1) AS o,             -- @nullable
  generate_series(1, 3) AS g  -- @nullable
-- @unwitnessable 1: generate_series is the LONGER call, so the padding
--   never reaches it — the padding rule's uniform conservatism
