# Working rules for the nullability corpus

These are not suggestions about style. They are the disciplines that make this
suite mean something, and each exists because skipping it produced a defect.

## 1. An imprecision you spot is work you have started

**The moment you observe the engine being less precise than PostgreSQL, you
owe a fixture.** Not a note, not a deferred item, not a sentence in a doc — a
fixture. "There is nothing in the corpus that would move" is a reason to
INVENT the case, never a reason to stop.

The sequence:

1. **Spot the imprecision.** The engine claims nullable; PostgreSQL never
   produces a NULL, and you understand why.
2. **Capture it RED.** Add an `it.fails` case asserting the TARGET contract —
   what the engine must claim once the fix lands. It passes today precisely
   because the engine does not claim it yet, so the suite is green before the
   work starts.
3. **Fix the engine.**
4. **Graduate.** The `it.fails` starts failing, which forces the flip to a
   plain `it` in the same commit. Then move the case into the fixture corpus
   as a green fixture with its claims and its controls.

The suite is green before, during and after. Each flip is the acceptance test
of the change that caused it. `subtree-evaluation-red.test.ts`,
`always-null-red.test.ts`, `bare-name-gates-red.test.ts` and
`overload-merge-red.test.ts` are the existing instances — follow their shape.

**Adjudicate the target against PostgreSQL BEFORE writing it down.** A red
case claims what PostgreSQL does, ahead of what the engine sees. A target the
oracle would falsify must never sit in a red suite.

**"We are inventing fixtures" is the normal state of this work.** The corpus
is not a fixed set of inputs to be satisfied; it is the record of what has
been explored. Reaching for a case that does not exist yet is the job.

## 2. Every gate gets mutated, and PostgreSQL does the killing

After adding a gate, break it deliberately and re-run. If the suite stays
green the gate is untested — write the case that kills it. Prefer a kill by
`PostgreSQL returned NULL` over a kill by a stale-annotation check: the first
is the database contradicting the engine, the second is bookkeeping.

If a gate cannot be killed by any fixture, say so in its comment and say why.
**A gate claimed to be doing work it is not is the same defect as an ungated
widening.**

## 3. A control that adds an excuse is not a control

A control column that claims nullable on a value which is never NULL costs an
`@unwitnessable` annotation, and has bought nothing: it trades one recorded
excuse for another. Before adding one, check whether a sibling fixture already
kills the mutation. If the branch you are guarding is a REFUSAL — it can only
under-claim — it needs no witness at all.

## 4. The recorded reason is usually the route

An `@unwitnessable` reason that explains why a claim is imprecise has, more
often than not, described the fix. Read the existing reasons before designing
anything; several closures in this corpus were a reason someone had already
written and nobody had asked the engine to act on.

Corollary: **a reason can be wrong.** Several said "conservative by design"
where no design decision had been taken, and several stopped one step short of
the fact that made them true. Re-derive rather than trust.

## 5. Fixtures obstruct themselves more often than you expect

If a claim has no witness, suspect the FIXTURE before the engine. Recurring
shapes:

- a subquery that scans the same table the outer query does, so it is empty
  exactly when the statement returns no rows;
- a constant chosen so large that one arm can never lose (a padding bound of
  200 against a table that seeds four);
- a raise elsewhere in the select list killing the whole statement.

The fix is usually to change the QUESTION, not the answer, and usually needs
no data state and no engine change.

## 6. Witness the GATE, not just the claim

A fixture that returns zero rows in every state witnesses nothing, however
many claims it carries — its notNull claims are vacuous. Two foreign-key
fixtures sat like that for a long time over tables no data state seeded.
Check that a fixture returns rows somewhere before believing it tests
anything.

Where a fixture's own claim genuinely cannot be witnessed, look for a
DIFFERENT ROUTE TO THE SAME CATALOG BIT. `convalidated = false` is set by NOT
VALID (which gates writes, so nothing can dangle it) and by NOT ENFORCED
(which gates nothing, so a data-modifying CTE can) — one bit, and the
witnessable spelling stands behind both.

## 7. Anything you send to PostgreSQL needs a WORK bound

Closure — "this expression has no free variables" — is a soundness property
and says nothing about cost. `generate_series(1, 10000000000)` is perfectly
closed and immutable, and the corpus contains it. A probe that counts it
without a bound does not fail; it HANGS, and in production it takes the
process with it.

The bound is a `LIMIT` at `SUBLINK_SRF_ROW_CAP + 1`, reading a result at the
cap as "no answer" and falling back to whatever the conservative default was.
**A whitelist of safe FUNCTIONS is the wrong axis** — the hazard is in the
ARGUMENTS, and `generate_series(1, 3)` and `generate_series(1, 10^10)` are the
same name. Bounding the work needs no per-function knowledge and no
maintenance.

**Where the call sits decides whether the bound works at all.** A target-list
SRF is a `ProjectSet` and LIMIT stops it lazily; the same call in a FROM item
is a `FunctionScan`, which materialises before any LIMIT above it applies.
That is Trap 1 in `docs/subtree-evaluation.md` — read it before writing a
probe, because a bound that reads as protection and is not is worse than no
bound.

**Never hand a raw `pg` to `WalkOptions.evaluate` in a harness.** Use
`createKillableEvaluator` (`killable-evaluator.ts`), which runs PGlite in a
worker and kills it from the main thread on a 500ms default. Nothing inside
that thread can end a runaway — `statement_timeout` does not fire under PGlite
and a same-thread timer never runs, because the event loop is blocked in WASM
— so a probe that does not finish does not FAIL the suite, it HANGS it. That
is not hypothetical; it is how this file's rule 7 came to be written.

Assert on `evaluator.killedSql`, not on the warning sink. A closed subtree may
RAISE on its own (`5 / 0`, a NULL into a NOT NULL domain) and the evaluator
core is built around that — the corpus has five, all ordinary. Only a KILL
means a probe could not be answered in the time allowed.

## 8. Measure, then write

Every claim in a comment that says "measured" must have been. Numbers, both
directions, and the neighbouring case that does NOT behave the same way —
that neighbour is usually what makes the rule worth stating. Re-measure by
version rather than trusting a note: PGlite and pgsql-deparser both change.

See `docs/deparser-limitations.md` before testing whether some construct can
be rendered; that exploration has been done twice already and must not be
done a third time.
