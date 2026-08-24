-- MECHANISM C'S OVERLOAD-CONSENSUS FALLBACK, AT A REJECTING SITE.
--
-- `forcedNullBy` mirrors the walk's dispatch one mechanism over: metadata for
-- an overloaded name declines, so strictness is a consensus over every
-- arity-compatible candidate — and no corpus input reached that branch until
-- this fixture (fallback-census.test.ts, measured 2026-08-24). Every fb_req
-- candidate is STRICT, so a NULL $1 forces the expression NULL into ck.val's
-- NOT NULL, and the raise is real: param-soundness witnesses the notNull claim
-- by binding NULL and watching PostgreSQL reject it.
--
-- The cast is what makes the statement PostgreSQL-valid — `fb_req($1)` with an
-- untyped parameter is ambiguous — and mechanism C sees through it: forcedNullBy
-- recurses transparently into TypeCast, so the attribution still lands on $1.
--
-- @args ["x"]
-- @param 1 notNull
INSERT INTO ck (id, val) VALUES (901, fb_req($1::text))
RETURNING
  id,  -- @notNull
  val  -- @notNull
