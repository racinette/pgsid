-- `CREATE TABLE … AS SELECT` copies column names and TYPES and nothing else.
--
-- `ctas_dst` was created from `ctas_src`, whose `val` is `text NOT NULL`. The
-- constraint does not travel: PostgreSQL's catalog records `ctas_dst.val` with
-- attnotnull false, a NULL inserts cleanly, and it comes back. Nothing about
-- the shape says so — the column has the source's name and the source's type,
-- and only the flag differs.
--
-- ctas-like-not-null-control.sql is the contrast that keeps this from being
-- read as "derived tables lose constraints": `LIKE` copies not-null ALWAYS,
-- without INCLUDING CONSTRAINTS, so a fix here must not reach it.
--
-- The divergence docs/sqlc-disagreements.md records for
-- `create_table_as/GetFirst`. Measured on the pinned sqlc v1.31.1: it carries
-- the source's NOT NULL into the CTAS target (and is right about `LIKE`).
SELECT
  val,   -- @nullable  (the source's NOT NULL did not travel)
  note   -- @nullable
FROM ctas_dst
