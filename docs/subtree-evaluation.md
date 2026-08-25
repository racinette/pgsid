# Subtree evaluation

## The idea, and what it dissolves

Parts of a statement have a value that nothing about the query can change. In
`CASE WHEN 1 > 2 THEN NULL ELSE x END`, the guard is false for every row, every
parameter binding and every session — so the arm is dead and the expression is
just `x`.

Reasoning about that syntactically means building a constant evaluator for
PostgreSQL expressions, which has to match PostgreSQL exactly or produce
unsound claims. That is a standing ban here, and rightly.

Subtree evaluation dissolves the ban rather than arguing with it: **ask
PostgreSQL.** Identify the subtrees whose value nothing can move, send them to
the database once, and consume the answers as data. Nothing is reimplemented,
so nothing can drift.

Everything below is the consequence of taking that seriously. The whole design
is one question — *which subtrees genuinely cannot be moved?* — and the
answers are stricter than they first look.

## What makes a subtree closed

A subtree is CLOSED when an allowlist proves it so: constants, boolean logic,
null tests, calls and operators whose resolved functions are immutable, casts
whose type conversion is immutable, and the various constructors over closed
members.

Everything else is OPEN — including, importantly, every node kind the
allowlist has never met. **Open-by-default is what makes the evaluator
scope-blind: it never resolves a name, it only detects one.** Joins, aliases,
correlation and lateral references are therefore somebody else's problem by
construction rather than by care.

## The gate is about types, not calls

This is the part that is not obvious, and it was found by measurement rather
than reasoning.

**Volatility of the CALL is not the closure question.** A stable INPUT
function makes even an immutable call session-dependent: extracting a field
from a date literal gives different answers under different date-order
settings, because the literal's own parsing moved. A stable OUTPUT function
leaks the same way through an implicit conversion, where both halves look
clean individually.

So one set governs everything: the built-in types whose input AND output
functions are both immutable. It is computed from the catalog, not curated —
and it excludes every datetime type, along with arrays, records, domains and
enums. A call or operator qualifies only when every reachable signature is
immutable over that set. A cast qualifies on the same ground.

**Names are too coarse a unit, so the gate is per signature.** Asking whether
EVERY signature under a name is immutable cannot split a name into its parts:
one stable overload opens the name whole, so even an unambiguously immutable
concatenation of two string literals pays for a stable sibling overload it
could never reach.

The gate therefore tracks operand TYPE SETS bottom-up through the closed
grammar and eliminates candidate signatures against them, with untyped
literals modelled as a first-class member rather than collapsed away — the
landing rules that decide what an untyped literal becomes are PostgreSQL's
own, pinned as tests. The landing itself runs the landed type's input
function, so the immutable-I/O set gates it too. Several syntactic guards that
once had to be written by hand fall out of that one rule as consequences.

**Elimination may over-keep but must never over-drop.** This is what makes the
gate sound without replicating PostgreSQL's resolution exactly: keeping a
candidate that could not really be chosen only keeps a name OPEN, which is the
conservative answer already. Nothing needs to be resolved correctly, only
never resolved away.

The result is a mechanical whitelist. Everything admitting an expression is
computed from catalog flags plus rule tables pinned as tests. No entry
requires a human judgment about an individual function, which is what keeps it
from becoming a curated list that rots.

## The protocol

Evaluation batches the MAXIMAL closed subtrees — the topmost closed nodes,
disjoint by construction — into one statement per query. Preparing it fixes
the batch's types, and the prepared statement's own metadata returns each
subtree's resolved type in the same round trip, so each answer carries whether
it is null, what its value is, and what type it landed as.

A closed subtree can raise on its own — dividing by a literal zero is
perfectly closed — so a raising batch is retried per subtree, and only the
genuinely raising ones contribute nothing.

The database-facing surface is deliberately the narrowest thing that works:
run one statement, return its single row. The engine imports no database type,
and its internals stay synchronous, consuming answers as data. With no
evaluator supplied, no evaluation claims are made and everything else is
identical.

## Three consumers

**The statement map** keys answers by node identity over the statement's own
tree. The walk consults it before descending: a hit answers a whole subtree, a
guard hit prunes an arm.

*It is a map, not a rewrite,* and that distinction is load-bearing. A pruned
arm is dead only for EXECUTION — a parameter inside a false-guarded arm is
still typed when the statement is prepared. The output analysis prunes the
arm's nullability while the parameter analysis keeps its typing sites, and a
rewritten tree could not serve both.

*The null answer is read in both directions.* A non-null answer claims the
subtree never null. A NULL answer claims it ALWAYS null — the same argument run
the other way, since closure means nothing can move the value. The reverse
reading was absent rather than declined for a long time, and a fixture comment
had been explaining the gap as a property of a different channel entirely,
which was true of that channel and beside the point here.

The verification story for the always-null direction is the stronger one: a
wrong claim is falsified by ANY non-null value, so every returned row tests it.

**The constraint grounder** substitutes a statement's written values into
enforced constraint bodies, each cast to the target column's declared type,
evaluates the closed parts and reduces what remains. Grounded bodies are
synthesized trees rather than parts of the statement, so they never enter the
statement map — same core, second feeder. Its claims are execution-time and
must never license output narrowing.

**Closed truths** is the narrowest consumer, and its subject is a fact about
PostgreSQL rather than about the engine: parse analysis COERCES an untyped
literal, but the rewriter FOLDS nothing on the way into a stored constraint. So
a constraint containing a trivially true computation arrives at the engine
still spelled as a computation. A token matcher can read a literal `true`; it
cannot read a cast, a comparison, a containment test or a closed conditional,
and each of those is a dead disjunct that a harvest would have dropped had it
been able to read it at all.

The same blindness sat on the statement side, where a dead disjunct made a
whole disjunction prove nothing — a rule that is exactly right about arms that
CAN fire, and needed restricting to those.

## The kernel's atom oracle

Some constraint-derived facts reach none of the three consumers, because
nothing in them is closed. They are derivations rather than evaluations, and
they run in the entailment kernel over three-valued judgments.

The founding shape: a validated constraint holding `a > 5` means `a <= 5` is
never true, so a conditional arm guarded on `a <= 5` never fires. No value is
consulted anywhere in that argument.

Everything built on it holds to the same standard — **propositional or
catalog-structural, never evaluative.**

**Trichotomy over identical operands.** Refuting one comparison from another
on the same tokens, through operator negation and exclusivity.

**Interval exclusivity over ordered anchors.** Generalizing that to different
anchors: a constraint holding `a > 5` refutes `a <= 3` because the two sets
share nothing. "Share nothing" decomposes entirely into facts PostgreSQL
publishes — the catalog records each comparison operator's index strategy,
which IS the shape of its set: open and closed rays either side, and the point.
Inequality has no strategy, because inequality is not indexable, so its shape
comes from the operator's declared negation instead. Both are captures, not
tables somebody maintains.

**List membership exclusion.** A constraint restricting a column to a list
refutes a guard naming something outside it — when EVERY disjunct refutes,
each answered by the machinery above. This pays twice, because a list
partition's bound has exactly the same shape.

**Containment, the exclusivity table's dual.** If exclusivity concludes two
sets share nothing, containment concludes one sits inside another — so a
filter selecting a narrower range SELECTS the constraint arm that covers it,
rather than merely refuting the others. Containment is domain-free in the same
way emptiness is: one anchor exceeds another and the order is transitive,
never because of what lies between them. The cells where a closed bound sits
inside its strict twin at the same anchor refuse.

**Predicate-aware generated columns.** A generated column's expression is
already walked in the reading scope, so it composes with filter promotion.
What was missing was everything that lets the filter reach the expression's
ARMS: a guard can now be proven TRUE rather than only refuted, which is what
lets a conditional with a null fallback conclude anything at all, and the
always-null side reads arm reachability so that everything after a proven
guard — the fallback included — is known never to run.

**Partition bounds.** A partition's bound is a constraint-grade fact that
lives outside the constraint catalog entirely, rendered as an expression by
its own function. Every stored row of a non-default partition satisfies it,
enforced by routing and by attach-time validation, so a DIRECT scan of a
partition may feed the bound to the kernel exactly as it feeds a validated
constraint. Range bounds are interval facts, so exclusivity applies with no
new machinery.

## Collation gates every ordered conclusion

Building the comparison oracle surfaced something the design had not: the
synthesized questions evaluate under the ANALYSIS session's default collation,
which is not necessarily the column's.

So a per-column trichotomy gates it. A non-collatable column transfers every
canonical operator. A column with a deterministic collation transfers EQUALITY
only, because deterministic means equality is byte equality whatever the
locale. ORDER over a collatable column needs collation IDENTITY — the column
must carry the very collation the analysis session evaluates under.

This is also why the host database's own default collation is an open
question: column collations travel in schema definitions, and the database
default does not.

## Session settings are not an input

A settings contract — pinning date and time-zone settings by promise — is
CLOSED, not deferred. Its trust model is unverifiable and silently breakable,
since changing a setting anywhere invalidates every claim with no signal, and
it would introduce the first hand-curated lists into a mechanical gate.

The general rule, stated once: **a session setting enters the engine only as
an explicit caller-declared input, and only where analysis is impossible
without it.** The search path and resolved parameter types pass that bar —
nothing resolves without them, and the hazard when they are wrong is loud and
structural. The datetime settings fail it, because they are avoidable and
their mismatch corrupts values quietly.

What IS admissible is the settings-INDEPENDENT middle: a literal whose
spelling means the same thing under every possible date-order setting needs no
settings assumption at all. That invariance is a property of the literal's
shape, checkable without trusting anything about the session.

## Closed sublinks

A subquery whose body references no tables, columns or parameters is a closed
tree wearing subquery syntax. It is semantically constant, it renders as a
scalar expression, and it batches through the existing protocol unchanged.

The classification is the evaluator's own closure question extended to a
statement body: non-contextual, meaning every part closed with no scan over
relations, versus contextual, meaning anything that names scope. Contextual
stays refused forever under the boundary below.

A body containing a set-returning call is admitted only behind a runtime
cardinality probe, because closure is a soundness property and says nothing
about cost — a perfectly closed generator can produce ten billion rows.

## Boundaries, each verified against a real candidate

**No query context, ever.** A filter proving something about a column does not
make an expression over that column evaluable. A consumer that can argue a
substitution is sound makes that argument itself, and hands the evaluator
another closed tree.

**Structural facts over open trees are refused.** The length of an array
constructed from two copies of a column is always two, but the tree holds
names. That is symbolic business, not evaluation.

**Session state and function-body reasoning stay out.**

## Closed for good

**Ordering beside a limit in a closed body.** The obstacle is not collation,
and no capture lifts it: a sort orders the KEY's equivalence class, not the
value, so two numerically equal literals with different renderings sort
ambiguously and the same body written two ways answers two ways. Sorting both
directions and admitting on agreement would work, and costs one more mechanism
and a round trip per body against demand measured at zero.

**Grouping clauses.** Three admissions buying nothing, and the shape that
would pay needs a scan over a relation.

**Common table expressions in a closed body.** Consuming one means resolving a
NAME, which is the single thing the evaluator is defined by not doing. One
inside a sublink reads the outer query's columns, making it a correlation site
rather than an island.

None of these is deferred, and no reason above expires.
