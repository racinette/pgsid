-- Gate: a DEFERRABLE foreign key entails nothing — WITNESSED.
--
-- `SET CONSTRAINTS ALL DEFERRED` inside a transaction lets a violating row be
-- written AND observed before the commit that would reject it, so the gate is
-- on `condeferrable` rather than `condeferred`: the engine cannot know which
-- transaction its query will run in.
--
-- The shape that witnesses it is the point. A fixture is ONE STATEMENT, so
-- `SET CONSTRAINTS` is out of reach — but INITIALLY DEFERRED moves the check
-- to COMMIT, and a data-modifying CTE can then insert a dangling row and read
-- it back through a join inside that one statement. The suite's per-fixture
-- `BEGIN … ROLLBACK` never commits, so the violation never fires. `status` is
-- NULL in every state: order -1 exists nowhere, and the key stops the row
-- being neither written nor read.
--
-- This is what the old note gave up on — "the suite runs no deferred
-- transaction, so no fixture row can dangle" — which was true of the SEEDS
-- and not of the statement. Until it was written the deferrable refusal had
-- NO executed witness at all: the fixture scanned `fk_df`, which is seeded by
-- no data state, so it returned zero rows in every state and even its notNull
-- claim was vacuous.
--
-- fk_df is not scanned here any more and needs no claim of its own. Its
-- INITIALLY IMMEDIATE spelling is checked at end of STATEMENT — measured, the
-- same CTE against it raises — so no single-statement fixture could ever
-- dangle it; and both spellings set `condeferrable`, which is the one bit the
-- gate reads, so this column stands behind both.
WITH ins AS (
  INSERT INTO fk_dd (id, o_id) VALUES (1, -1) RETURNING id, o_id
)
SELECT
  i.o_id   AS o_id,     -- @notNull
  o.status AS status    -- @nullable
FROM ins i
LEFT JOIN orders o ON o.id = i.o_id
