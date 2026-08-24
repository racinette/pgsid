-- Transitive nullability end to end — the shape the whole build was
-- asked for. Three facts meet inside one generated column:
--
--   status = 3         proves the arm's guard `status >= 2` (a point
--                      inside a ray, over the anchor order the GENERATION
--                      expression's own literal 2 puts in the pool);
--   has_duration       makes the CHECK's second disjunct FALSE, so the OR
--                      descends to its survivor and `event_duration IS
--                      NOT NULL` becomes a fact on every returned row;
--   started_at         is declared NOT NULL.
--
-- So the selected arm's `started_at + event_duration` has two non-null
-- operands under a strict operator, and the ELSE never runs. Neither
-- half claims this alone: check-boolean-discriminator-or.sql holds the
-- CHECK half over the plain column, and the guard-TRUE consumer is what
-- carries it through the CASE.
SELECT
  finished_at -- @notNull
FROM evg
WHERE status = 3 AND has_duration
