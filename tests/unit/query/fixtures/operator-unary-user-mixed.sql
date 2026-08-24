-- A USER PREFIX OPERATOR ON A CURATED NAME, OVER AN OPAQUE OPERAND.
--
-- Every pg_catalog PREFIX row is claimed total (the operator batch convicted
-- the whole surface; `<->`'s hole is binary), so the unary narrowing's
-- "keeps a non-total or unvouched candidate" refusal was unreachable through
-- builtins alone — the branch serves MIXED pools, where a user row shares a
-- curated symbol and an unreadable operand cannot eliminate it. That is the
-- demonstrated rank-1 shape (a user operator shadowing a curated name), one
-- arity down. `@` over text is the user row (schema.sql, fb_neg — no builtin
-- prefix @ takes text, so PostgreSQL's resolution is undisturbed); the window
-- call keeps the operand's type unreadable; and since fb_neg is STRICT, the
-- seeded NULL names witness the refusal.
WITH opaque AS (
  SELECT first_value(ck.name) OVER (PARTITION BY ck.id) AS a
  FROM ck
)
SELECT
  @ o.a AS tagged_neg  -- @nullable
FROM opaque o
