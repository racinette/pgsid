-- Collation identity (flipped from a refusal record 2026-08-12): ivstx's
-- column carries pg_catalog."default" — the very collation the analysis
-- session evaluates under — so text anchors ORDER, and (-inf,'k'] misses
-- ('m',inf) because 'k' < 'm' by the session's own answer. The overlap
-- guard keeps the boundary: (-inf,'peak'] reaches into ('m','peak'],
-- where the generator's s = 'n' row fires the arm. The COLLATE "C" twin
-- stays a refusal record in check-interval-refusals.sql.
SELECT
  CASE WHEN t.s <= 'k' THEN NULL ELSE 5 END AS text_order,     -- @notNull
  CASE WHEN t.s <= 'peak' THEN NULL ELSE 5 END AS text_overlap -- @nullable
FROM ivstx t
