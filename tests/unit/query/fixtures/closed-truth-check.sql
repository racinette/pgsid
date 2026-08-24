-- A DEAD COMPUTATION as a disjunct of a CHECK — `check-literal-disjunct.sql`
-- one step past a token.
--
-- Both fixtures rest on the same fact: PostgreSQL does no constant folding on
-- the way into `pg_constraint.conbin`, so a disjunct that can never fire
-- survives to the kernel and something must recognise it as dead. What
-- separates them is what the survivor IS. `false` is a literal, and
-- `boolLiteral` reads it. `1 > 2`, `starts_with('abc','z')` and `0::boolean`
-- are COMPUTATIONS, and no token matcher reads those — reading one spelling
-- while missing the next is a rule that looks total and is not, which is
-- exactly why the cast was refused rather than followed.
--
-- They are CLOSED, so `closed-truths.ts` asks PostgreSQL instead, and asking
-- is total where matching is partial. The three guarded columns are three
-- shapes of the same question, not one case repeated: an operator, a function
-- call, and the one cast spelling parse analysis leaves alone (`'f'::boolean`
-- is already `false` in the catalog — the coercion happens at analysis time
-- for an UNKNOWN literal, and only a TYPED argument survives).
--
-- `flow` is the boundary in the other direction: `1 < 2` is live, its
-- constraint is vacuous, and a rule that dropped closed arms without keeping
-- their polarity straight would claim it. The sparse state seeds the NULL, so
-- PostgreSQL does the contradicting rather than an annotation.
--
-- The write side — that PostgreSQL actually REFUSES the NULL under each
-- spelling — is adjudicated in closed-boolean-truths-red.test.ts, which a
-- fixture cannot express: a fixture asserts over rows that exist, and that
-- claim is about a row the database will not let you create.
SELECT
  span,   -- @notNull
  probe,  -- @notNull
  tag,    -- @notNull
  flow    -- @nullable
FROM mesh
