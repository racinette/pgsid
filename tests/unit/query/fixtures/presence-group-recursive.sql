-- Recursive CTE groups (the third recorded imprecision, closed): the
-- base branch carries the parent unit's group, the recursive branch
-- copies a.pid/a.pname bare from the self-reference, and the fact holds
-- inductively over the whole fixpoint — the self-reference now lifts
-- from a group ASSUMPTION seeded with the base branch's groups and
-- shrunk to convergence beside the flat one. dense: categories 1/3 are
-- roots (absent arm in the base), category 2 under 1 (present arm) —
-- and the recursion re-emits category 1's NULL pair on category 2's
-- walked row, witnessing the INHERITED absent arm the induction is
-- about.
-- @null-group 1*,2*
WITH RECURSIVE anc AS (
  SELECT
    c.id   AS cid,    -- @notNull
    p.id   AS pid,    -- @nullable
    p.name AS pname   -- @nullable
  FROM categories c
  LEFT JOIN categories p ON p.id = c.parent_id
  UNION ALL
  SELECT p2.id, a.pid, a.pname
  FROM anc a
  JOIN categories p2 ON p2.parent_id = a.cid
)
SELECT cid, pid, pname FROM anc
