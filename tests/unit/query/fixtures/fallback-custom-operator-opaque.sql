-- THE NAME-LEVEL FALLBACK'S USER-OPERATOR TAIL, REACHED THROUGH OPAQUE TYPES.
--
-- The A_Expr totality fallback has three exits: the PARTIAL_OVERLOADS refusal,
-- the TOTAL_OPERATORS claim, and — for a name on neither — the user-operator
-- dispatch, which hands the backing function to the FuncCall rules and can
-- CLAIM from a body analysis. The first two had reaching inputs
-- (name-level-partial-overload.sql); this exit had none: every `===` / `====`
-- fixture supplied READABLE text operands, so the typed narrowing resolved the
-- operator one branch earlier and the fallback's own dispatch sat dark
-- (fallback-census.test.ts, measured 2026-08-24).
--
-- A window call is the durable opaque spelling, as in the two exemplar
-- fixtures: the type reading refuses one BY DESIGN, so `o.a` and `o.b` are
-- values whose types nothing can narrow, `resolveOperatorTotality` answers
-- unknown, and the name fallback is what decides.
--
--   lenient     `===` dispatches lenient_eq, whose body is `SELECT true` — the
--               body analysis claims notNull THROUGH the fallback, which is
--               the direction worth gating: kill the dispatch and this column
--               goes conservative nullable.
--   strict_cmp  `====` dispatches strict_same (STRICT), and o.a is nullable,
--               so priority 4 refuses — the control that shows the dispatch
--               reads the backing function's own flags rather than claiming
--               for every user operator.
WITH opaque AS (
  SELECT first_value(ck.name) OVER (PARTITION BY ck.id) AS a,
         first_value(ck.val)  OVER (PARTITION BY ck.id) AS b
  FROM ck
)
SELECT
  (o.b === o.b)  AS lenient,    -- @notNull
  (o.a ==== o.b) AS strict_cmp  -- @nullable
FROM opaque o
