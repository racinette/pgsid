# Witness coverage

## Why coverage is the thing to measure

The soundness suite executes every fixture against a real database and checks
that no column the engine calls not-null ever comes back NULL.

That check is only meaningful when the query actually RETURNS ROWS. A statement
returning nothing cannot contradict anything, so unless something else stands
behind them, its not-null claims are checked by nothing at all while looking
thoroughly checked.

The mirror-image question applies to the other flag. A nullable claim is
WITNESSED when some execution yields a genuine NULL in that column.
Unwitnessed means one of two things, and they must be separated: either the
column truly can never be NULL — engine imprecision, sound but a lost
guarantee for a consumer — or the data is too weak to show that it can, which
is a hole in the suite.

Collapsing those two into one number is how a suite congratulates itself. Both
are reported on every run, and both are held by a bar.

## What one fixture run asserts

Each fixture runs under the cross product of DATA STATES and ARGUMENT
BINDINGS, and five things are checked:

**Validity** — the database accepts the statement.

**Shape** — the engine's output column list equals the database's, in order.

**Soundness** — no not-null column is ever NULL, under every state and every
binding.

**Liveness** — the fixture returns at least one row somewhere, or declares the
error it raises instead.

**Coverage** — one suite-wide invariant: every nullable claim witnessed, or
its unwitnessability recorded.

**Soundness and witnessing quantify in opposite directions, and that is the
core asymmetry.** A claim contradicted by ANY binding is a bug. Witnesses, by
contrast, ACCUMULATE — any state or binding that produces a NULL witnesses
that column forever after.

## A statement that raises is not a counterexample

It returned no rows, so "never NULL" still holds for every row it did return.
Errors are recorded for diagnostics and otherwise skipped.

The exception is a fixture that can ONLY raise — where the refusal IS the
claim, because a domain forbids the value the statement would produce. Such a
fixture must declare two things: why it returns nothing, and the error text it
must raise. Both are required together and both are checked.

The reason both are needed is that **returning nothing is not evidence on its
own** — a false filter does that too, so without the refusal the marker would
exempt a fixture that asserts nothing at all. And matching the error TEXT is
what stops an unrelated failure, a renamed column or a missing table, from
being quietly accepted as the expected one.

## Two kinds of data state, and neither subsumes the other

**Hand-written states** are standalone files, reviewable on their own. Every
row in them exists to construct a structural situation that random generation
does not reliably reach: a row that is NULL in one column and non-null in
another so a negation trap actually fires; a row with no match so an unmatched
arm is exercised; an exact count so a set-operation case returns a row rather
than raising.

The principle: **NULLs come from structure, and structure is built rather than
stumbled into.**

**Generated states** derive from the schema snapshot, so the schema is the
single input. They reach breadth a hand-written file cannot, and they cannot
construct the specific coincidences above.

One collision hazard is worth knowing: explicit keys written by hand stay
below the range where the schema's own identity columns begin, so a fixture
that inserts without naming a key never collides with a row a state wrote.

## Bindings

Fixtures declare parameter values as JSON, one array per line, each line an
independent case. JSON gives unambiguous typing for free — a null is not the
string "null", a number is not its digits — and needs no parser of our own.

**Arguments are substituted as literals rather than passed as protocol
parameters.** PostgreSQL infers a parameter's type from its use, and several
fixtures deliberately use one where nothing constrains it, which is an error
before any value is considered. A literal carries the same unconstrained type
the fixture author means, and resolves the same way.

Referencing a parameter the bindings do not supply, or supplying one the
statement does not reference, is an error rather than a silent default.

## The two bars

**Liveness is a hard failure.** A fixture returning no rows under any state and
binding asserts nothing, and that must be impossible to add by accident. The
failure names the states whose execution raised, which is usually the whole
explanation.

**Coverage is a per-claim invariant, checked in both directions.** An
unwitnessed claim with no recorded reason fails. A recorded reason on a claim
that IS witnessed now also fails, so a reason is always a current fact rather
than a historical excuse.

An aggregate ratchet — a baseline count that may only rise — held this before
and was replaced deliberately. **A ratchet compares sums, so a witnessing
regression can hide behind an unrelated improvement**, and its single number
conflated engine imprecision with data reach. The per-claim invariant is exact
at any corpus size and cannot be compensated.

This is not a demand for total witnessing. An unwitnessable claim is fine.
What is not fine is non-witnessing that is INCIDENTAL rather than explicit.

**Claims inside a rowless fixture are exempt wholesale**, since nothing a
rowless statement claims can be witnessed. That exemption is a different fact
from a recorded reason, and the two are counted and printed separately — folding
them together once made the suite report more recorded reasons than existed.

## A joint claim gets a joint oracle

A presence-group annotation asserts that several columns are NULL together
exactly when some row is absent, with the discriminants marked.

Statically, the agreement suite holds coverage in both directions, comparing
discriminant sets exactly and requiring every member to carry its own
per-column claim. Executably, the soundness suite checks each claimed group
PER RETURNED ROW: the discriminants must agree — all NULL or all non-null,
since a split row falsifies the unit — and on the absent arm every member must
be NULL. Both arms must then have actually run.

**The absent arm's exemption is DERIVED, not declared.** That arm fires
exactly when a discriminant is NULL, so it is unwitnessable precisely when
every discriminant's own claim is — and each of those already carries its own
recorded reason. The per-column staleness check removes those the moment data
witnesses a NULL, which re-arms the group assertion automatically. The two
annotation layers therefore cannot drift apart.

The present arm has no exemption at all. A fixture that cannot reach it should
not be claiming a group.

## The planner as a second static reasoner

The database exposes exactly one static reasoner through public API: the
planner's preparation phase converts an outer join whose optional side a strict
condition above it would reject into a plain join. That is PostgreSQL's own
implementation of filter promotion — logic-based rather than cost-based — and
it is visible in every plan.

So the corpus can be run against it, comparing surviving outer joins in the
plan against the walk's own verdicts. Counts, never identities: the planner
reorders joins, commutes one direction into the other, and pulls subqueries
into join forms that correspond to no join in the written statement.

**The interpretation is asymmetric, and the asymmetry is the instrument's
honesty condition: the planner ACTING is evidence; the planner DECLINING
proves nothing.**

The walk is deliberately stronger, because constraint entailment, foreign-key
entailment and cross-scope refiltering all promote where the planner never
will — it does not make those inferences. So the walk being stronger is
EXPECTED and must merely be classified by which mechanism explains it. The
class that carries information is the planner being stronger, which means a
reduction the walk missed. And a case where the walk is stronger but its only
evidence is a plain strict condition is the soundness smell, because that is
precisely the inference the planner does make.

## Borrowed corpora

A vendored third-party corpus supplies foreign-authored, issue-derived schema
and query pairs — shapes nobody here would have written.

**The judge is PostgreSQL, exactly as for the generated corpus.** Validity is
gated by preparing the statement, the shape oracle compares column lists
against a real execution, and refusals and tallies are pinned in both
directions.

Soundness was originally not asserted, on the reasoning that a borrowed corpus
ships no data and a zero-row execution asserts nothing. The first half is true
and **the second does not follow from it: the data can be ours.** For the cases
where the two tools disagree, a state constructed to BREAK the disputed claim
sits beside the vendored files, and each query executes under it. A column the
walk calls not-null coming back NULL is an unsoundness there exactly as it is
in the fixture corpus.

The remaining cases still assert only shape and validity. A case with no state
executes nothing, because inventing a binding for a query nobody reasoned
about manufactures rows with no argument behind them.

**The other tool's own expectations ride along as a LEAD SOURCE, not a judge.**
They are extracted from its own structured output rather than parsed out of
generated code, so nothing is blurred in translation — and every disagreement
is adjudicated against the database rather than settled by whose output looks
more plausible.

## The measurement

**The suite prints it; this document does not carry a copy.** Run the soundness
suite for the summary, and set the witness-report environment variable to add
the per-claim list with each recorded reason inline.

What the numbers mean:

- **not-null claims, and how many are FALSIFIABLE** — a claim under a query
  that returned rows could have been contradicted. One that never returned
  rows is guarded only if a checked refusal stands behind it, and the count of
  claims with neither is held at zero.
- **nullable claims, and how many are WITNESSED** — the rest split into those
  carrying a recorded reason and those exempt as rowless, counted separately
  because they are different facts.
- **always-null claims** — every returned row tests one, and any non-null
  value falsifies it, which makes this the strongest direction the suite has.
