-- A boolean LITERAL as a disjunct of a CHECK. PostgreSQL stores the
-- expression verbatim — no constant folding into `pg_constraint.conbin` — so
-- `false OR route IS NOT NULL` arrives at the kernel with the dead arm
-- intact, and until `boolLiteral` (check-entailment.ts) nothing could read
-- it: `isTrue`/`isFalse` enumerate BoolExpr, A_Expr and NullTest and then
-- fall through to the atom matchers, and a literal atomizes to nothing. The
-- OR harvest therefore kept both arms, the disjunction stayed a two-armed
-- notFALSE fact, and a column PostgreSQL will not let you write NULL into
-- read nullable.
--
-- The two guarded columns are not the same case twice. `route` needs FALSE
-- read off the literal; `hop`'s guard is `NOT true OR …`, and FALSE(NOT p)
-- is TRUE(p), so its arm dies only through the OTHER half of the reading —
-- it is the only column in the corpus that reaches it, and removing that
-- half leaves every other claim here standing (measured).
--
-- `note` is the boundary in the opposite direction: `true OR note IS NOT
-- NULL` is vacuous, and a rule that dropped literal arms without keeping
-- their polarity straight would claim it. The sparse state seeds the NULL,
-- so PostgreSQL does the contradicting rather than an annotation.
--
-- The write side — that PostgreSQL actually REFUSES the NULL under each
-- spelling — is adjudicated in check-literal-atoms-red.test.ts, which a
-- fixture cannot express: a fixture asserts over rows that exist, and that
-- claim is about a row the database will not let you create.
SELECT
  route,   -- @notNull
  hop,     -- @notNull
  note     -- @nullable
FROM relay
