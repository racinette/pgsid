# Decided against

Decisions taken against doing something, with the argument that settled each
one and the new information that would reopen it. A rejection is the absence
of code, so nothing executes it and nothing else can hold it.

Do not re-open an entry here without new information. "It looks cheap" is not
new information; several of these were declined ON their sizing.

---

**Value tracking for nullability.** Concluding that a branch never runs
because a value was written a certain way requires tracking the VALUE, which
needs a constant evaluator that must match PostgreSQL exactly or produce
unsound claims.

*New information arrived:* the premise is dissolved by subtree evaluation —
closed trees are answered BY PostgreSQL, so nothing is reimplemented and
nothing can drift. **The ban's actual object, an engine-internal constant
evaluator, stays banned.** The rungs become charterable one at a time through
the evaluator and the kernel's atom oracle, per rung, never wholesale.

Two boundaries stand: cross-literal ORDER reasoning is a rung of this ladder
and reopens only through the evaluator; collation-gated literal DISTINCTNESS
is not a rung, because it compares two tokens already present in the SQL and
concludes only "unequal". Numerics stay banned there precisely because token
inequality would require evaluation.

**Reproducing PostgreSQL's column-naming rules.** The engine reports an empty
name for un-aliased expressions and should keep doing so. Names are not the
contract and cannot be — they are not unique, so a consumer must join by
position. That consumer prepares the statement anyway and gets the
authoritative names for free. Porting the rules means maintaining a
version-drifting reimplementation to produce something the consumer already
has. Best-effort names are good for catching a wrong column list in tests.

**A C source scanner for totality.** Built, used once, deleted, and not to be
rebuilt. Three measured reasons: a false-negative rate of two in eight on a
hand-picked sample — the unsound direction — because thin entry points
delegate to shared helpers; the obvious return macro is one of four null
routes in that tree; and beyond detection the real barrier is reachability,
needing an interprocedural analyzer. It also required a source tree the
package will never ship. Everything reliable it gave is available at runtime
from the catalog. **Reading the source by hand, per signature, as the second
stage of a promotion, is a different thing and is the standing practice.**

**A differential oracle against another implementation.** Both candidates
read in full and demoted, not queued. One has no comparable surface: it never
derives a query's output column list, contains no code inspecting join types,
and hands type checking to a live PostgreSQL — the same oracle this project
uses directly. The other is closer but unsound in BOTH directions: every
resolvable function is treated as non-null, scalar subqueries inherit the
inner column's non-nullness, nested join trees drop outer requiredness, set
operations take the left arm only, and there is no filter promotion at all,
so it cannot serve even as a one-sided bound. Its parameter flag is a
different definition, so comparing parameters is a category error.

**The inverse is real:** our corpus provably exercises the other tool's
enumerated holes, so running it over the fixtures would mostly find bugs in
it — a possible upstream contribution, not verification of this engine.

**Chartering adversarial sweeps against CODE AGE.** Stopped after the third:
yields fell run over run, code predating the sweeps came back clean, and the
widest findings were not about age at all. **The discriminating variable is
POSITION, not age** — findings cluster in FROM items, where the model of
"what rows does this produce" is thinnest and a shape defect misassigns every
later flag. What actually produced findings was three older heuristics, each
with a home now rather than a sweep. A further sweep needs a new argument,
and "the code has grown again" is not one.

*New argument, and it is not aimed at the code:* the sweep that found
something was aimed at the project's own PROSE — every negative claim written
down and never executed. Its three findings were one shape: a number or a
judgment copied out of an instrument that re-derives it, then outliving the
instrument's answer. The largest surface left unswept is the negative claims
in code comments, which is where two of the known rot modes have landed.

**Mutating existing queries as a way to generate new ones.** Transformations
beyond blind wrapping need the same scope and type knowledge that
construction needs, so mutation buys no validity for free — and it is bounded
by the shapes the corpus already contains, which is the opposite of what a
generator is for.

*The wrap-invariance suite is not a re-opening.* Its oracle is the engine's
own MONOTONICITY across a representation crossing, not execution: it detects
precision LOSS, which the execution oracle is one-sided against and which no
other suite checks. Blind wrapping preserves validity trivially, so the
validity half of the rejection does not apply, and the new information is the
crossing-loss defect class, every instance of which is wrap-variance.

**A diagnostics channel for ambiguous references.** An unqualified name
matching several visible columns resolves to nullable with the candidates in
the trace. A dedicated channel was rejected: PostgreSQL rejects such queries
at parse-analysis time, so any consumer preparing the statement gets a
precise error from PostgreSQL itself.

**Name-based joining of nullability to the wire-protocol row description.**
Column names are not unique, so a name join must either pick one, which is
wrong, or degrade both to nullable, which is lossy on ordinary queries.
Position disambiguates exactly what names cannot, and the arity-and-order
gate is what makes positional joining safe.

**Useless-join removal as a nullability concern.** Permanently out of scope.
The planner deleting a unique, unreferenced side is a row-count fact, not a
nullability fact, and it is detectable from the plan itself.

**Grouping clauses and common table expressions in the subtree evaluator.**
Neither should be re-opened. Grouping is three admissions buying nothing, and
the paying shape needs a FROM. Consuming a common table expression means
resolving a NAME, which is the one thing the evaluator is defined by not
doing. One inside a sublink reads the outer query's columns, making it a
correlation site rather than an island.

**Ordering beside a limit in a closed body.** The obstacle is not collation
and no capture lifts it: two numerically equal literals with different
renderings sort ambiguously, so the same body written two ways answers two
ways. Sorting both directions and admitting on agreement would work, but
costs one more mechanism and a round trip per sliced body, for two body
shapes only, against demand every verification run measures at zero. **DO NOT
RE-OPEN AS CHEAP: the sizing is the reason it was declined, not an argument
for taking it.**

**Claims about a user function's arguments beyond its declared parameter
types.** A body is not an interface. The channel a schema author uses to GET
a claim is the declared type, where a non-null domain is rejected before the
body is reached; standard types are nullable by design. The catalog-visible
class proposed for a rule — a non-strict function with a non-null domain
return whose body preserves nulls — is deliberately not built, because a body
that simply raises on null is the same rejection with no catalog trace, so
the line would move without arriving anywhere.
