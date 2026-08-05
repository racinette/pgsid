-- The padding rule reaching a builtin SRF no hand-written table listed
-- (adversarial-3 finding 1). `BUILTIN_SRF_NAMES` held 21 names; PG18's
-- pg_catalog holds 71 set-returning functions once the pg_stat/pg_ls
-- families are set aside, so 50 were missing — `jsonb_path_query_tz` among
-- them, the direct sibling of the listed `jsonb_path_query`.
-- A missing name cost the unrecognised call nothing, because it had no
-- precision to lose. It cost the OTHER entry everything: `srfPaddedTargets`
-- needs a count of two, so one unseen SRF turned the rule off for the whole
-- target list and `one_sku()` — SETOF non_empty_text, a NOT NULL domain —
-- kept a notNull that PostgreSQL pads away on rows 2 and 3. The name set is
-- a snapshot fact now (`bool_or(proretset)` over pg_catalog), so the table
-- that could not be falsified by construction became one that is measured.
SELECT
  one_sku() AS s,                                     -- @nullable
  jsonb_path_query_tz('[1,2,3]'::jsonb, '$[*]') AS j  -- @nullable
-- @unwitnessable 1: jsonb_path_query_tz is the LONGER call, so the padding
--   never reaches it — the nullable is the padding rule's uniform
--   conservatism, as in srf-target-list-padding.sql
