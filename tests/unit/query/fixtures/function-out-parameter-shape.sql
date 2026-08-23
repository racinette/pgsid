-- A user function declared with OUT PARAMETERS. `pg_get_function_result`
-- renders it `SETOF record` — the column names and types live in
-- proargnames/proallargtypes, which the snapshot has captured all along —
-- so the walk parsed the rendering, found no shape in it, and fell to its
-- scalar answer: ONE column named after the function, against PostgreSQL's
-- two. Exactly the defect `queryBuiltinTableFunctions` was built to fix for
-- BUILTINS (a builtin with OUT parameters renders `SETOF record` too), left
-- standing for user functions; found by auditing what the sweep-3 fixes had
-- left behind rather than by the suite.
-- The column list now comes from the declared output parameters, and `hi`'s
-- nn_text keeps the domain's NOT NULL — the flag half of the same read.
--
-- `lo` is the function's own PARAMETER, and the body reading used to take
-- every parameter as nullable, because a body is read once for a function
-- while the arguments belong to a call site. The recorded reason named what
-- crossing that would cost: "threading the call's argument nullability and
-- being right about its join state at the call site". A LITERAL argument is
-- where the second half is vacuous — a constant has no join state, and needs
-- no scope to evaluate — so `out_pair(3)` settles `lo` and nothing else had
-- to be reasoned about. That also makes it safe to fold into the MEMOIZED
-- column list, where a column reference would not be: the memo has no scope
-- and a constant does not want one.
--
-- The two controls below are the two ways out of the literal case, and both
-- are nullable in fact as well as by refusal.
SELECT
  p.lo    AS lo,        -- @notNull
  p.hi    AS hi,        -- @notNull   (nn_text, a NOT NULL domain)
  q.lo    AS from_null, -- @nullable  (the literal IS NULL)
  r.lo    AS from_col   -- @nullable  (not a literal at all)
FROM out_pair(3) p, out_pair(NULL) q,
     products pr, out_pair(pr.category_id) r
