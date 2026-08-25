# Argument nullability

## What is claimed, and what deliberately is not

Per parameter, one boolean, mirroring the output side:

**Not-null** means binding NULL to this parameter can make the statement
raise. A caller must not pass NULL.

**Nullable** means NO CLAIM. The engine found no rejection channel it can see.
It does not promise the binding is safe, and it does not address whether NULL
is a *useful* thing to pass.

**The contract is one-directional, and that is a decision.** An earlier
reading had nullable meaning universally safe — no data state, no guard, no
path makes it raise. That is not achievable and never was. A two-line
procedural body that raises on a null argument rejects the binding with
nothing catalog-visible behind it, and no static analysis short of executing
the body reaches it.

A rule the engine cannot satisfy is worse than a weaker one it can: it makes a
green suite mean "the corpus happens to contain no such function".

## The engine models what PostgreSQL does, not what a caller ought to do

Selecting rows where a column equals a null-bound parameter executes cleanly
and returns nothing. Pointless, but legal, and PostgreSQL's willingness to run
it is the whole story.

An analysis of the "NULL is never useful here" kind — the predicate is strict,
so a null argument dead-ends the query — was considered and rejected from this
contract. It is a lint about caller intent, not a fact about PostgreSQL
behaviour, and folding it into the not-null claim would condemn the deliberate
optional-filter idiom, where a parameter is compared only when it is not null.
PostgreSQL supports that idiom without complaint, so the contract must too.

**Types are not inferred, at all.** Preparing the statement hands the consumer
authoritative parameter types, and reimplementing PostgreSQL's type resolution
would be a version-drifting liability producing something the consumer already
holds. The analysis needs targeted lookups — is this cast target a non-null
domain, is this insert column non-null, what are this function's declared
argument types — and nothing more.

Parameter numbering needs no modelling either. PostgreSQL rejects a statement
whose parameters have gaps, so for any statement it accepts, the contract is a
dense positional array.

## Two rejection mechanisms, and one non-mechanism

**Bind-time rejection.** When parse analysis resolves a parameter's TYPE to a
non-null domain, binding NULL raises before anything executes.

The two properties that matter are both surprising, and both were measured. It
is **guard-immune**: putting the parameter inside a branch that provably never
runs does not protect it. And it is **zero-row-immune**: a statement over an
empty table raises anyway, as does an insert that would write no row. Nothing
about execution is involved, because nothing has executed yet.

Three channels produce a domain-typed parameter: a cast whose operand is the
parameter itself, a function argument whose declared type is the domain, and
assignment into a domain-typed column.

**Execution-time rejection.** A plain non-null column CONSTRAINT leaves the
parameter base-typed. NULL binds fine, and the check fires per row actually
written — so inserting a constructed row raises, while inserting the result of
a query over an empty table succeeds.

**The non-mechanism: comparison never rejects.** PostgreSQL resolves operators
on a domain's BASE type, so a comparison against a domain-typed column never
consults the domain's constraint, whatever the column declares.

**Two deduction boundaries constrain what can even be written.** Unification is
not conflict resolution: a use that deduces its own type makes PostgreSQL
reject the statement outright rather than let the domain win. And deduction is
first-use-ordered, so a disjunction that tests the parameter for null before
comparing it fails where the reverse order prepares fine. Neither changes the
contract — a rejected statement has no contract — but both bound what fixtures
and generated queries may emit.

## What each claim quantifies over

Execution-time rejection makes the not-null claim data-dependent, which forces
precision:

**Not-null is EXISTENTIAL** — there is an execution in which NULL raises. For
bind-time rejection it happens to be universal, but the consumer-facing
meaning does not change: do not pass NULL.

**Nullable is the ABSENCE of that claim** — no channel the engine models
rejects NULL here. Not a guarantee that nothing does.

## What a nullable parameter does not promise

**No claim is made about a user function's arguments beyond its DECLARED
parameter types.** A function body is not its interface. A non-strict function
whose body maps its argument into a non-null domain will raise on a null
binding, and the engine says nothing — which is correct rather than a gap.

The channel a schema author uses to GET the claim is the declared type:
declare the parameter as a non-null domain and bind-time rejection applies
before the body is reached at all. Standard types are nullable by design.

That class is catalog-visible and a rule could be written for it — a
non-strict function with a non-null domain return whose body preserves nulls.
It is deliberately not written, because it would not close the question: a
procedural body that simply raises is the same rejection with no catalog
trace, so the line would move without arriving anywhere. Reading bodies to
guess at rejections also inverts the interface — two functions with identical
signatures would carry different contracts.

## How the facts are collected

**Collection happens inside the walk, not in a pass afterwards.** By the time
the walk finishes, the facts a rejection needs — this parameter was a cast
operand, a declared-domain function argument, an assignment source for that
column — are gone. The walk already holds the catalog entries each channel
reads, so it emits per-site facts and a fold reduces them to the contract.

**The fold is a union, and that is why it is simple.** The same parameter may
appear anywhere, any number of times. One rejecting site makes it not-null: a
single domain-typed use decides the parameter's type for every use, and no
other site can un-raise a raise.

**There is no guard analysis on the input side at all.** Bind-time rejection
was measured guard-immune, and execution-time sites are write targets, which
cannot be guarded. This makes the input fold strictly simpler than the output
walk's expression analysis.

**Arguments are computed first**, because the dependency runs one way: no
argument fact depends on output nullability, but output claims can consume
argument facts.

## Bind rejection licenses an output claim; execution rejection does not

A parameter that rejects NULL at bind time was non-null in any execution that
happened at all — so any row the statement returns proves it, and a projected
reference to that parameter is not-null. This is the same rows-exist reasoning
the output side uses elsewhere.

Execution-time rejection does NOT license this, and the counterexample is
sharp: a write that raises per row written can be embedded so that the writing
path sees no row while the statement still returns rows. The two mechanisms
are therefore tracked separately, because only one of them is safe to consume
in the other direction.

## Some rejections belong to a SET of parameters

The flat array has a vocabulary limit. Assigning a coalesce of two parameters
into a non-null column rejects neither parameter alone, yet binding both NULL
raises — a fact a per-parameter boolean cannot express. A consumer that emits
both as independently nullable admits exactly the binding class this analysis
exists to forbid.

So the contract carries a third component beside the outputs and the
per-parameter flags: the MINIMAL rejection sets, each of size two or more.

The underlying theory is uniform — everything is a minimal rejection set,
meaning "binding NULL to every member raises", and the per-parameter flag is
just the single-member slice, kept positional so it still zips against
PostgreSQL's own parameter list. Minimality yields a trichotomy: a not-null
parameter never appears in a set, because supersets are absorbed, so every
parameter is unconditionally required, conditionally required with the
condition spelled entirely by its sets, or unconstrained.

The claim direction is unchanged. Claims mean raises; absence of a claim
promises nothing.

Value-flow computes this natively, because "which parameters force this
expression null" is a monotone function over "this parameter is null" atoms,
and the analysis tracks its minimal implicants. Strict operators union their
operands' implicants; a coalesce cross-unions its branches, whose
single-member projection is exactly the older intersection, so the flat
contract is unchanged by the addition.

**Bounds, recorded because a silent cap reads as coverage.** Implicants beyond
a width limit, and joint implicants beyond a per-expression limit, are
DROPPED. A dropped implicant is a missing claim, which is exactly the state
before any of this existed. Single-member implicants are never dropped, so the
flat contract cannot regress however wide an expression fans out. Conditional
expressions contribute no joint implicants at all — a conditional-shaped joint
fact needs the arm machinery the entailment kernel has and this traversal does
not.

## When the statement raises on every execution

A write whose grounded constraint reduces to false raises on every execution.
Under minimization its empty implicant absorbs every other implicant, so the
statement PostgreSQL rejects unconditionally would otherwise carry the
emptiest contract of all — every parameter claiming nothing, for the best
possible reason, with no way to say so.

So it is surfaced as a statement-level fact, claimed only where the quantifier
is UNIVERSAL: write events that unconditionally process a row. An update, or a
conditional write arm, grounding false is the weaker existential fact — it
raises when a row matches — and stays out.

Absorbed parameter claims stay absorbed. Under the flag they are vacuous, and
the flag explains their absence where otherwise the contract just goes blank.

## Witnessing a constraint-shaped rejection needs a control

Claims derived from constraints raise with a constraint-violation message, not
with one of the messages only a NULL itself can produce. A correct,
raise-confirmed claim of this kind therefore files under a neutral
"raised for some other reason" bucket and can never witness anything — which
is why a whole class of claims once had to ship without fixtures.

The resolution is a SECOND message class, counted as a witness only under a
CONTROL condition: the all-valid binding succeeded in the same data state, so
the raise's only delta is the NULL. That is the principle the soundness suite
already applies in the other direction — a failure the control shares is not
evidence about NULL.

The narrow "a message only a NULL produces" class stays exactly as it is. It
is load-bearing elsewhere and must not blur. A class raise with no succeeding
control stays in the neutral bucket.
