-- The OR-transport's STRENGTH gate, held by data: caiow's disjunctive
-- CHECK (a >= 4 OR a = 3) is only notFALSE per stored row — both its
-- arms sit inside the CASE arm's [3,inf), and it still licenses nothing,
-- because nothing here pins `a`: the a-NULL rows are real, the
-- disjunction was NULL outright on them (no arm held), they took the
-- ELSE, and o's NULL is in every result. A transport widened to
-- notFALSE OR-facts would select the arm and PostgreSQL would falsify
-- it on exactly those rows — the disjunctive mirror of
-- check-arm-interval-notfalse-control.sql.
SELECT
  o -- @nullable
FROM caiow
WHERE b <> 0
