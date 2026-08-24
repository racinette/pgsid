-- unnest(tsvector) IS A DIFFERENT SHAPE — three named columns, not one.
--
-- Found by the pg-regress replay (tstypes.sql: engine 1 column, PostgreSQL
-- 3) — the FROM-item misalignment class sweep 4 named. pg_catalog holds
-- exactly three unnest rows and only this one changes the column list:
-- unnest(tsvector) is SETOF record (lexeme, positions, weights), where the
-- array and multirange rows contribute one column. The walk now dispatches
-- the lone-argument spelling on the operand's type; a set CONTAINING
-- tsvector beside other survivors refuses outright (wrong columns are worse
-- than refusing), and the fully-untyped residue is recorded in the walk and
-- in docs/deferred-tasks.md §4 rather than guessed either way.
--
-- 'dog' carries no positions, so PostgreSQL returns NULL positions and
-- weights on its row — both claims witnessed on every execution. The FULL
-- three-column expansion (lexeme included) is held by the replay's shape
-- oracle over tstypes.sql; lexeme itself is a word by the grammar and stays
-- an unclaimed nullable in this shape-only dispatch, so this fixture
-- projects the two columns whose NULLs are real rather than paying an
-- excuse for one that can never be.
SELECT
  u.positions AS pos,  -- @nullable
  u.weights   AS wts   -- @nullable
FROM unnest('cat:3 dog'::tsvector) AS u
