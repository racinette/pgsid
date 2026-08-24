-- WITHIN GROUP OVER A USER ORDERED-SET AGGREGATE — the unknown-aggregate refusal.
--
-- The WITHIN GROUP dispatch answers hypothetical-set and ordered-set CLASSES
-- from the capture's aggkind — for pg_catalog rows. A USER ordered-set
-- aggregate has no captured row, so the dispatch must refuse it outright, and
-- nothing in the corpus had ever asked (rung-census.test.ts): fb_osa exists
-- for exactly this. Over the empty state the ungrouped aggregate returns its
-- one NULL row, which witnesses the claim.
SELECT
  fb_osa() WITHIN GROUP (ORDER BY v.amount) AS osa  -- @nullable
FROM v
