-- A generation expression is a per-relation fact and the tree may disagree
-- (adversarial-2 finding 3): gen_c redefines inherited d as nullif(a, a),
-- so a tree scan evaluating the PARENT's a * 2 would claim notNull against
-- rows that are NULL on every one of the child's. The walk's generation
-- dispatch now takes the tree reading (resolveGenerationExprTree — null on
-- any divergence or uncaptured descendant, the notNullTree conventions),
-- and d drops to the catalog flag, witnessed by every generated gen_c row.
-- `FROM ONLY gen_p` keeps the parent's formula — see
-- generated-override-only-control.sql.
SELECT
  g.a,  -- @notNull
  g.d   -- @nullable
FROM gen_p g
