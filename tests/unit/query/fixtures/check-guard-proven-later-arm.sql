-- The same fact one arm further out: everything AFTER a proven guard is
-- unreachable, not just the ELSE. `name IS NULL` sits between the two
-- and would otherwise contribute its non-null 'y'.
--
-- Sibling of check-guard-proven-else.sql, and separate because the two
-- exercise different halves of the reachability rule — that one needs
-- only the ELSE suppressed, this one needs the arm scan to stop.
SELECT
  CASE WHEN active THEN NULL WHEN name IS NULL THEN 'y' ELSE 'x' END AS chain_ends -- @alwaysNull
FROM t
WHERE active
