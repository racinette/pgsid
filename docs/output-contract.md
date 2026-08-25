# The output contract beyond per-column nullability

Two facts the engine proves that a per-column boolean cannot express. Both
are contract surface rather than new inference — the walk already holds them
internally, and exporting them is what makes them usable.

## Presence groups

### The fact a per-column flag cannot state

Under an outer join, several columns go NULL TOGETHER, exactly when the
optional side's row is absent. A per-column flag says each of them is
individually nullable, which is true and useless: a consumer checking one and
using another gets no help from the type system, and the correlation — the
thing the query actually guarantees — is thrown away.

The common alternative is an embedding macro that shapes the row into a nested
object. That is the application's business rather than the analyser's, and it
has a known wart: the embedded object cannot say *this whole group is null
because the join missed*, so it hands back a nested structure whose fields are
individually optional.

What an engine that reasons about null-extension can do instead is PROVE the
correlation and export it.

### What a group asserts

One group per surviving optional extension UNIT — so an outer join onto a pair
of inner-joined relations is ONE group spanning both, because the unit is what
gets null-extended.

Per returned row: either the unit's row was present, or EVERY column in the
group is NULL. Certain members are marked DISCRIMINANTS — provably non-null on
the present arm — and a discriminant is NULL if and only if the unit was
absent. That biconditional is what makes the group checkable and what makes it
narrow in a type system.

A unit the walk promotes out of optional emits no group at all. There is
nothing to say once the row is proven present.

### Membership is about extension, not about pass-through

The first design assumed a member had to be a column carried through from the
optional side. It does not, and the correction is worth keeping because it
widens the feature considerably.

Extension nulls the optional side's WHOLE output row, computed columns
included. So an aggregate computed inside an optional subquery is a legitimate
discriminant — it is non-null whenever the subquery produced a row, and NULL
exactly when it did not.

What IS excluded is a transforming expression at the group's own scope, where
a coalesce could manufacture a non-null value from an absent row and break the
biconditional in the direction that matters.

### Crossing boundaries

Groups propagate through re-export from a subquery, a common table expression
or a view, with bare projections lifting the inner analysis's groups.

They survive set operations by BRANCH AGREEMENT, with one refinement that took
a real query to find. A branch that cannot be absent — a row of literals has
no outer join, so no unit, so no group to agree with — used to kill the other
branch's group entirely. It no longer does, provided every discriminant is
non-null in that branch: every row such a branch contributes lands in the
present arm, so neither half of the contract has a case to fail on.

That is what lets the add-a-sentinel idiom keep the two-arm union its outer
join earned, instead of degrading to independently nullable columns.

This does not conflict with the rule that drops groups whose ABSENT arm cannot
occur. An unreachable absent arm is noise; a reachable one is the whole
feature.

### Emission is factored, and that is measured rather than assumed

The flat row type intersected with one local union per group.

Narrowing distributes through the intersection, so testing a discriminant
narrows its own group and leaves every other group untouched. A member that is
nullable even when present gives exact asymmetry for free: finding it non-null
proves presence and narrows, while finding it null concludes nothing.
Destructuring co-narrows.

The alternative — expanding the product of all groups into one flat union —
grows multiplicatively for no gain.

## Always-null columns

### What it claims

Proven NULL on EVERY row the statement emits. It is additive and mutually
exclusive with the not-null claim, and its absence means "not proven", exactly
as a false not-null claim does. A consumer reading only not-null sees what it
always saw.

Emission is the null type itself. That is the same tagged union presence
groups express, discriminated by VALUE instead of by row presence.

The motivating cases are ordinary rather than exotic. The soft-delete idiom
selects a column that its own filter has just proven dead. A tagged union
declared as a constraint — this column is non-null on paid rows and null
otherwise — becomes a definite null whenever the query picks the other arm.

### Why it is not a third value in the walk

The walk is two-valued end to end. Making it three-valued would touch every
branch, for a fact with a handful of sources where non-nullness has dozens.

So it is ONE conservative question asked BESIDE the walk, defaulting to false,
over two sources: a NULL literal through any cast, and anything STRICT over a
column the evidence pins null. The second reuses the existing strict-dependence
closure, which brings its care along — a coalesce over a dead column is
correctly not always-null, while an arithmetic operator over one is.

**Nothing new had to be derived to pin a column.** The constraint harvest
already recorded a null test of either polarity as a true fact, because a null
test is total, so "not false" means true. The fact set had always contained
the null side; only the final question was single-polarity.

### Verification is the inverse of the nullable side, and far stronger

A wrong always-null claim is falsified by ANY non-null value, so every returned
row is a test and no witness has to be constructed. That is the opposite
economics to a nullable claim, which needs a NULL to appear and may wait
forever.

### Three findings from building the mirror, none of which reasoning produced

**The optional gate was inert.** Removing it changed nothing, because every
evidence source that constrains an alias also promotes it out of optional. The
one that does not is the extending join's own condition, which is withheld —
correctly for a non-null goal, since on an extended row that condition was not
true. For a NULL goal the case split closes it: matched means the condition
held and the constraints apply; extended means every column is null anyway.
This works for one-sided outer joins only — a full outer join emits rows where
the entry is present and the condition was false, and the control returns a
non-null value there.

**Re-export needs no join-state gate**, which is the one place this channel is
STRONGER than its not-null mirror rather than weaker. For a non-null goal an
optional entry destroys the claim; here both arms agree.

**A mirror goal is not free.** Two shortcuts in origin entailment conclude
NON-null, and reading their result as "proved the goal" while the goal was
null produced a wrong always-null claim. Both are gated on the goal now.

**The annotation gate is what surfaced that last one**, on its first run — an
engine claim with no marker fails, so a new claim cannot appear unannounced.
That is the argument for bidirectional coverage in one sentence.

### What is left

One shape, and it is value tracking rather than a gap in this channel: a write
that forces a column null through a constraint reading a DIFFERENT column the
statement did write. A written value reaches the kernel as a written-value
fact rather than as evidence, which is a different channel. It lives as the
one open case in the red suite rather than as a paragraph here.
