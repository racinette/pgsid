-- The joinState gate over generation expressions, pinned by its
-- counterexample: safe_label's COALESCE(b, 'anon') is non-null on every row
-- that EXISTS, but a NULL-extended row nulls generated columns exactly like
-- the rest — so the expression may only speak when the entry is present.
-- dense has customers and no gm rows, so every row there is null-extended
-- and witnesses s; sparse's customer 1 matches gm.a = 1 for liveness.
-- @null-group 1*,2*
-- (Both discriminate: given the row present, safe_label's COALESCE and
-- doubled's a*2 over NOT NULL a are non-null — the latter required the
-- presumption to reach the generation expression's ref resolution, the
-- R3 residue closed 2026-08-04. This annotation was 1*,2 while it stood.)
SELECT
  c.id AS cid,          -- @notNull
  g.safe_label AS s,    -- @nullable
  g.doubled AS d        -- @nullable
FROM customers c
LEFT JOIN gm g ON g.a = c.id
