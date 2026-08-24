-- MECHANISM C'S MEASURED-BUILTIN NAME FALLBACK, AT A REJECTING SITE.
--
-- The tail of forcedNullBy's dispatch: metadata declines (a pg_catalog name),
-- the user catalog has no candidates, and the measured strictness capture
-- answers by NAME — `isStrictBuiltin('btrim')`. Dark until this fixture
-- (fallback-census.test.ts, measured 2026-08-24): every existing mechanism-C
-- fixture attributed through operators or user functions, so the one branch
-- that answers for ordinary builtin calls around a parameter had no reaching
-- input.
--
-- btrim is strict, so a NULL $1 forces the value NULL into ck.val's NOT NULL
-- and binding NULL raises — the notNull claim's witness.
--
-- @args ["  x  "]
-- @param 1 notNull
INSERT INTO ck (id, val) VALUES (902, btrim($1))
RETURNING
  id,  -- @notNull
  val  -- @notNull
