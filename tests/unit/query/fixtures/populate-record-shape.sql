-- json[b]_populate_record'S SHAPE IS ITS FIRST ARGUMENT'S COMPOSITE TYPE.
--
-- Found by the pg-regress replay (json.sql/jsonb.sql: engine 1 column,
-- PostgreSQL 3, across ~38 statements, plus five name mismatches where the
-- one column wore the call's alias). The record-populating builtins return
-- SETOF <first argument's composite>, and the type is IN the statement —
-- `NULL::gfn_pair` is the idiomatic spelling — so the FROM dispatch now
-- reads it and expands the composite's fields; a call whose record argument
-- nothing can type REFUSES, because for these names the one-column guess is
-- wrong on every call PostgreSQL accepts.
--
-- An empty document populates no field, so both columns are NULL on the one
-- returned row — every claim witnessed on every execution.
SELECT
  p.p AS field_p,  -- @nullable
  p.q AS field_q   -- @nullable
FROM jsonb_populate_record(NULL::gfn_pair, '{}'::jsonb) AS p
