-- A builtin call inside a LANGUAGE sql body narrows its signature by the
-- parameter's declared type whether the body spells the parameter `$1` or
-- names it — the second half of the type threading, closed 2026-08-22.
--
-- body-builtin-parameter-type.sql pins the `$n` half and explains why `upper`
-- needs its signature narrowed at all (a total `(text)` row, an `(anyrange)`
-- row that is NULL for an empty range, so the name carries no totality claim).
-- The gap this closes is that `renderedTypeOfExpr` reads a ColumnRef's type
-- through SCOPE RELATIONS, and a body with no FROM has an empty scope — so
-- `SELECT upper(a)` came back untyped where `SELECT UPPER($1)` did not, and
-- fell through to the name-level tables.
--
-- Measured cost of that gap before it closed: 240 unwitnessed nullable claims
-- in the generated corpus, the whole `proj=fn-call | col=a_fi` bucket. It had
-- an UNWITNESSABLE rule and a blame file, both retired here.
--
-- `gfn_io` also makes the parameter INOUT, which is the shape that keeps the
-- lookup honest: `argNames` and `argTypes` are built over INPUT parameters
-- only, so they stay in line with each other and with `argResults` past a
-- parameter of any other mode.
SELECT
  gfn_io('a')     AS by_name,   -- @notNull  body is `SELECT upper(a)`
  body_upper('a') AS by_dollar  -- @notNull  body is `SELECT UPPER($1)`
