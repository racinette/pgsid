-- A WINDOW call does not collapse a query to one row.
--
-- `guaranteesSingleRow` licenses a scalar sublink's notNull from "an
-- aggregate with no GROUP BY collapses to exactly one row", which is true of
-- a BARE aggregate and false of a windowed one: `count(*) OVER ()` yields one
-- row per input row, so over an empty input it yields NO rows and the scalar
-- sublink is NULL. The aggregate test behind that gate — the only one of the
-- three in the walk that did not exclude `over` — answered yes for every
-- windowed call, and `count(*)` reached the wrong answer through its
-- `agg_star` short-circuit without consulting a name table at all.
--
-- Measured against PGlite in six shapes at both call sites (the other is
-- window-call-not-single-row-body.sql). Found by auditing AGGREGATE_NAMES
-- against pg_catalog: five of its members are prokind 'w', which is what
-- pointed at the gate.
--
-- The derived table bounds the sublink to at most one row in every data
-- state, so the shape is witnessable rather than raising: the LIMIT is inside
-- it, leaving the sublink's own row-count gate exactly as it was.
SELECT
  (SELECT count(*) OVER () FROM (SELECT 1 AS one FROM t LIMIT 1) z)
    AS windowed_count  -- @nullable
