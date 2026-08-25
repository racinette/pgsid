# Type-resolution delegation

## The question, and why asking is better than deriving

The walk answers "what could this expression be" as a type SET, and every
elimination downstream is decided on it: which operator overload survives,
which function signature is dispatched, whether a totality verdict may be
read. Where it answers NO CLAIM, an operand that constrains nothing keeps
every candidate, and the verdict falls back to consensus over the survivors.
That consensus is sound and blunt.

The alternative to deriving the type symbolically is to ask the database.
PREPARING a statement runs parse analysis — including PostgreSQL's own
overload resolution — and the prepared statement reports the resolved type of
every output column. No rows are touched, no plan is built, no user code runs.

So the type reader consults a resolution round FIRST and falls back to the
symbolic union. Nothing is deleted, and the symbolic path remains the answer
wherever there is no statement to prepare.

**Preparing, rather than executing under a false filter.** The obvious cheaper
trick — append a filter that matches nothing and read the result description —
cannot express modifying statements at all, and it executes. Preparing reaches
every statement kind and never executes. The volatility question is a wash
between the two and is recorded here so nobody re-argues it: neither route
calls a volatile function in the output list.

## The safety rule is the whole design

**A node may be delegated only when its type is determined by its own
contents.**

PostgreSQL will answer for any well-formed expression, but for a node whose
type comes from OUTSIDE, the standalone answer is not the in-context answer. A
bare date-shaped string literal standing alone resolves as text. The same
literal compared against a date column resolves as a date, because the sibling
supplies the context.

Typing that literal as text eliminates the date-to-date operator — an
OVER-DROP, which is the failure class that produced the only soundness bug
this area has had.

**The predicate: refuse any node whose subtree contains no typed leaf.** A
typed leaf is a column reference, a cast, a numeric or boolean literal, or a
call with a known return type. A comparison against a column is safe, because
the literal is resolved by its sibling INSIDE the probe. A bare literal, a
coalesce of two bare literals, or an array of them, is not.

The route types everything it is pointed at, and a large number of nodes would
have been typed had the rule not refused them. **The guard is not a detail of
this design; it is the design.** An implementation that types a bare array of
string literals has not implemented the rule, whatever else it does.

## Prohibited: reading inferred parameter types back

Preparing also reports the types PostgreSQL inferred for the statement's
parameters, and using those to LEARN an unknown operand's type is unsound.

Multiplying an unconstrained parameter by an integer-typed one reports both as
integer. PostgreSQL committed to a type for an operand that constrained
nothing — that is PREFERENCE resolution, not a constraint. If the real operand
is numeric, the correct overload has just been eliminated. It is the same
reason a bare parameter comes back as text.

Inferred parameter types are legitimate for exactly two things: a containment
check in the test suite, and confirming a type the engine already declared.
The engine's own declared parameter types, or a function body's declared
argument types, are the contract and always win.

## Two routes, and they compose

**SUBSTITUTE** replaces each operand whose type the walk already knows with a
typed parameter, then prepares the subexpression alone and reads its type.

It is much the cheaper half: no probe splicing, no analysis of which scope
owns the node, no set-operation handling, no rendering of the whole statement.

Pinning a sibling genuinely steers dispatch, which is the point — the same
addition resolves differently depending on what its operands are pinned to.
And it DEFUSES the unknown-literal trap in the one direction that matters,
because the context is rebuilt rather than discarded.

**SPLICE** adds a probe column to the output list of the scope that owns the
node, propagates it outward so every probe surfaces at the top, renders the
statement once and reads the types back by position.

Splice is what answers a bare column reference; substitute cannot, because
building its probe would need the answer it is trying to find.

**They compose in one direction.** Splice types the derived columns. A typed
derived column is then a typed LEAF, which unblocks substitute on every
expression composed above it. Splice gets column types; **substitute converts
column types into operator dispatch**, and dispatch is what the walk actually
consumes.

## What stays refused, and why that is the right residue

A qualifier bound at more than one level is refused, because a probe cannot
say which one the walk meant. An unqualified reference is refused, because
resolving it needs the scope this mechanism does not have. A pseudo-alias that
no source item binds is refused for the same reason.

None of those is a mechanism gap. Each is a case where the question itself is
ambiguous without the walk's scope, and the walk is where scope lives.

**A probe that raises drops that node silently to the symbolic path and must
never fail the statement.** Places a probe cannot go are established by
measurement, not assumption — a column that is not grouped under a grouping
clause raises, though a probe BESIDE a legal grouped column is fine, so the
constraint is on WHICH probe rather than on probing at all.

## A mechanism that changes nothing may be carrying a defect

This is the most useful thing the work produced, and it is not about types.

Delegation shipped wired into the walk but switched OFF in every suite that
adjudicates against the database, so its answers had never met a row. Switched
on, it made dozens of delegated answers and changed NO claims — apparently
confirming that the engine already knew everything the database could tell it.

The reason was a WRONG RULE ANSWERING FIRST. A name-level totality claim was
being reached precisely where operand types are unreadable, so an untypeable
operand got its verdict for free and delegation had nothing left to buy. That
shortcut was separately measured unsound. With it removed, the corpus gained
its first claim that genuinely RESTS on a delegated type.

The lesson generalizes past this mechanism: when a new source of information
changes nothing, the first hypothesis should be that something upstream is
answering when it should not, not that the engine was already complete.

## Non-goals

**Deleting the symbolic path.** It is the answer for function bodies,
constraint expressions and generation expressions — all of which the walk
analyses and none of which has a statement to prepare. It is also the fallback
for every refused probe.

**Reimplementing PostgreSQL's overload resolution.** The preference tiebreak
is a declared non-goal and stays one. This mechanism exists so that it never
has to be written.

**Changing what a type set means.** Delegation produces singletons; the
representation and the containment invariant are unchanged.

## Boundaries, each measured

**Batching works.** Several probe columns in one statement return several
types.

**Inner scopes are reachable.** A probe added to a nested query's own output
list and re-exported outward resolves correctly at the top.

**Symmetric arm splicing works; asymmetric does not.** Every arm of a set
operation must receive the probe, or the arities disagree.

**Domains smash on the wire.** A domain over an integer reports as the base
type, so both sides of any comparison must be normalized the same way.

**Arrays do not nest.** An array constructed from arrays reports as the same
array type, not as an array of arrays.

**A bare parameter is guessed**, not resolved. Declared types win, always.

**The substitute route's soundness evidence is THIN.** Only a handful of
expressions could be cross-checked against an in-context oracle. Widening that
agreement set is the real acceptance test for that route — not the census
delta, which measures reach rather than correctness.

## One thing that will bite

**The output-claim parser matches its annotation keywords as bare substrings
anywhere in a line.** Writing either keyword in a fixture's header prose
silently adds a phantom column, and the fixture then fails on arity rather
than on anything to do with types. Spell the words out in prose instead.
