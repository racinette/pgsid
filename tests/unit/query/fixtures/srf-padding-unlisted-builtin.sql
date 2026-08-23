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
-- @unwitnessable 1: the padding IS per-arm as of 2026-08-22, and this call
--   still has no bound — counting `'$[*]'` over `'[1,2,3]'` means evaluating
--   a jsonpath, which is not arithmetic on constants the way
--   `generate_series(1, 3)` is. `one_sku()` beside it has a ceiling of one,
--   so the comparison fails on this side only. The route is a pre-walk round
--   asking a closed set-returning call for its row count, and it is blocked
--   on NOTHING: `SELECT count(*) FROM jsonb_path_query_tz('[1,2,3]'::jsonb,
--   '$[*]')` deparses and answers 3 (measured 2026-08-23). This was filed
--   beside the JSON_TABLE claims that ARE deparser-blocked and does not
--   belong with them — an ordinary function is not a SQL/JSON node
