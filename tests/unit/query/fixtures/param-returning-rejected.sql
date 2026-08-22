-- A projected parameter is notNull when every path that can RETURN a row
-- rejects a NULL binding (`returningRejectedParams`), landed 2026-08-22.
--
-- The walk already made this inference for one of the two ways a NULL
-- binding is rejected: mechanism A types the parameter as a NOT NULL DOMAIN,
-- Bind raises before anything executes, and `bindRejectedParams` narrows a
-- projected `$n` on the reasoning that any returned row proves it non-null.
-- Mechanism B — a plain NOT NULL COLUMN — produces the same certainty and
-- had no channel, because it raises per row WRITTEN and a statement can
-- return rows the writing path never produced. The fix is to ask per PATH
-- instead of per statement; the two counterexample fixtures beside this one
-- are the paths that fail.
--
--   nn_col      $1 lands in ck.val, NOT NULL. THE CLAIM.
--   nullable    $2 lands in ck.name, which takes NULL — no rejection, no
--               narrowing. The control that keeps the claim about the SITE
--               rather than about being a projected parameter at all.
--   through_op  $3 reaches ck.tag through `||`, and a strict operator
--               propagates NULL, so a NULL binding raises there too. Read by
--               `forcedNullParamsAnyRow`, the same implicant machinery the
--               parameter contract uses — which is why a COALESCE around it
--               would NOT narrow, and correctly: COALESCE($3,'x') is never
--               NULL and the write would succeed.
--
-- ck.tag is `nn_text`, a NOT NULL DOMAIN, so `through_op`'s own rejection is
-- mechanism A and `bindRejectedParams` would reach $3 through a bare
-- reference. It does not reach it through the operator — the parameter is
-- typed by the operator, not by the column — which is what makes the column
-- an honest third site rather than a restatement of the first.
-- The binding is the contract's own: NULL where the contract permits it and
-- a value where it does not, so the statement returns a row and `nullable` is
-- witnessed by it rather than excused.
-- @args ["a", null, "b"]
-- @param 1 notNull
-- @param 2 nullable
-- @param 3 notNull
INSERT INTO ck (id, val, name, tag)
VALUES (9051, $1, $2, $3 || 'x')
RETURNING
  $1 AS nn_col,     -- @notNull
  $2 AS nullable,   -- @nullable
  $3 AS through_op  -- @notNull
