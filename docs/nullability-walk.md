# Output column nullability

## The question, and the rule that shapes every answer

For each output column of a statement, is it provably never NULL?

PostgreSQL will tell you a prepared statement's column names and types but not
their nullability, so it has to be inferred from the parsed statement and the
schema. Both errors cost, and they do not cost the same. Claiming non-null for
a column that can be NULL produces a type that lies, and the lie surfaces as a
runtime failure far from here. Claiming nullable for a column that never is
produces a noisier type than necessary.

So: **correct over precise.** Never claim non-null unless it is proven.
Claiming nullable where non-null was provable is imprecision — a defect worth
fixing, but never a wrong answer.

That asymmetry decides every design argument below. Where a rule could go
either way, it refuses.

## Why this is one recursive walk and not several passes

Three requirements each independently rule out a pipeline of independent
passes over the statement.

**A named subquery's nullability has to escape it.** Selecting a column out of
a common table expression whose body puts it on the optional side of an outer
join must inherit that nullability. Nothing in the schema describes that
column — it belongs to a query, not a table — so the only way to answer is to
analyse the inner query and read its result.

**A scalar subquery's nullability has to escape it too, in the other
direction.** A subquery counting rows is provably non-null; one selecting a
column is not. Answering without looking inside gets it wrong.

**A predicate's guarantee applies deep inside an expression, not at its top.**
If the filter proves a column non-null, then an expression wrapping that
column is affected wherever the column appears — arbitrarily deep. A pass that
produces a set of guaranteed columns and a later pass that inspects only the
outermost node of each output expression cannot connect the two.

All three need scope and context threaded THROUGH the traversal rather than
reconstructed after it. Hence: one leaf-first recursive walk per output
column, resolving each leaf against the facts in scope and combining results
upward. The join analysis, the predicate reading and the per-construct rules
are all applied inside that walk, not beside it.

## The scope is an address book

Before deciding anything, the walk reads the FROM clause and records, for each
relation: what kind of thing it is, what columns it offers, and whether an
outer join can null-extend it.

That last fact is three-valued, and the third value matters. A relation is
REQUIRED when no outer join can null-extend it, OPTIONAL when one can, and NOT
FOUND when a reference resolves to no relation at all. A not-found reference
is answered nullable rather than crashing — it should not happen for a valid
statement, and the walk is not the right place to adjudicate that.

A scope keeps two separate maps, because they answer different questions. One
maps a qualifier to a relation, which is what a qualified reference resolves
against. The other is the ordered list of columns the scope actually exposes,
which is what a star expands to and what an unqualified name resolves against.

They differ wherever a join merges columns. Joining on a shared name makes ONE
merged column visible, and the constituents' own copies stop being visible
even though both remain addressable by qualifier. This mirrors PostgreSQL,
where a join contributes its own column list while the base relations stay
reachable.

Keeping them separate also settles ambiguity. A name matching more than one
visible column is one PostgreSQL rejects outright, so the walk answers
nullable rather than picking a candidate — otherwise the answer would depend
on the order relations appear in the FROM clause, which is not a fact about
the query.

**A merged column is neither constituent and needs its own rule.** Every row
of the join has at least one side present, and the merged value is drawn from
whichever that is. Under an inner join either side proving non-null is enough,
since both are present and equal. Under a one-sided outer join it is the
preserved side that decides. Under a full outer join BOTH must prove it —
which makes the merged column strictly less nullable than either constituent,
the one case where merging loses rather than preserves.

Because star expansion resolves each visible column through the same path as a
named reference, every fact below applies to a star too. This was once not
true, and the symptom was that a star over a view lost every non-null the view
body could prove.

## Null-extension happens to groups, not columns

An outer join null-extends its optional side AS A UNIT. In a join of two
relations that is then made optional by an outer join, either both are present
or the whole composite row is absent; they can never be half-extended.

This is why the walk tracks a **null group** — the set of relations extended
together — alongside each relation's join state. Relations joined inner
inherit the enclosing group; each side an outer join makes optional starts a
fresh one.

It pays off in promotion: a predicate proving ONE member's row exists proves
it for every member of that member's group.

## Which rows actually reach the output

A join condition is not merely a filter; on many shapes it is a fact about
every row that survives. Turning that into evidence is a fixpoint over two
reinforcing facts: a relation is PRESENT when it is never null-extended in any
emitted row, and a join's condition is IMPLIED when it held for every emitted
row.

An inner join's condition is implied once its slice genuinely appears in every
row. An outer join's condition held exactly for its matched rows, so it
becomes implied once its null-extendable side is proven present. A condition
that strictly references a relation's column proves that relation present,
which can imply further joins — so the two facts chase each other outward
until nothing new is learned.

This is what closes the case of a strict condition applied over a
null-extended side: no extended row can pass a strict condition, so the side
was never really optional, and the fixpoint now knows it.

**A narrower version of the same fact needed its own treatment.** Global
presence is the right gate for making a condition scope-wide evidence, but it
is too strong for what a condition also carries: it held on every row where
its arm PARTICIPATES. An arm is non-preserved when a row of it failing the
condition has no path to the output — the join drops it, and its only other
route, being emitted by extending the opposite side, is itself dead.

When that happens, the optional unit involved can never reach the output, and
it DISSOLVES into its enclosing unit. Dissolution is one operation that keeps
every reader coherent at once: co-membership promotion, the exported presence
groups, origin tracking and the join audit all read the same units. Because
dissolutions persist across iterations, they chain outward — each join's death
arming the next, in the same order PostgreSQL's own planner reduces outer
joins. This was found by comparing the walk against the planner over a
generated corpus, where it was the single systematic divergence.

## Resolving a leaf

A column reference combines several facts, in order of strength.

**Is it guaranteed by a predicate?** The evidence is the scope's filter, its
group filter, and every join condition the fixpoint proved implied. Within a
predicate the walk reads null tests, strict comparisons, membership tests and
range tests under conjunction — and under disjunction only by INTERSECTION,
since any arm could have been the true one. The column need not be a direct
operand: the guarantee attributes through strict operators and functions,
casts, and other constructs that cannot produce non-null output from null
input.

A predicate's own references resolve exactly as the output list's do, and
testify only for the entry that owns them. A merged column is owned by
neither constituent, so a null test on it proves nothing about either side's
copy — reading it as a guarantee was a measured unsoundness.

If the column's relation is optional and such a predicate exists, the relation
is PROMOTED to required. This happens during leaf resolution, where the
context is available, not as a pre-pass.

**Does the schema say non-null?** The flag is read for the relation SET the
reference scans, not the named relation alone. Scanning an inheritance parent
scans the whole tree, and marking only the parent non-null is legal — parent
true, child false, the child's NULL returned through the parent — so a tree
scan must read the conjunction over the subtree. Scanning only the named
relation, and writing to it, read its own flag instead. Constraints need no
such care: a parent's constraint is copied into every child and cannot be
dropped or invalidated there.

**Is it a generated column?** Its generation expression is walked in the
reading scope, which is sound because the stored row IS the row being read —
and which lets predicates, branch guards and written values compose into it.
But only where the relation is not null-extendable, because extension nulls a
generated column however non-null its expression is per row.

**Does a constraint entail it?** A plain nullable column gets one last chance
from the relation's validated check constraints, described below.

**Is the relation a query rather than a table?** Then recurse: run this whole
procedure on the inner scope, memoize its per-column results, and read the
one this reference names. This is how nullability crosses a scope boundary.

**Views need their own treatment**, distinct from both tables and subqueries.
PostgreSQL does not propagate non-null flags to view columns — every column of
a view reads as nullable in the catalog, whatever sits behind it. Reading the
flag would therefore make every view column nullable. Instead the view's
stored definition is analysed like a subquery and its results mapped
positionally onto the view's columns.

## Combining upward

An internal node is non-null when its result cannot be NULL given non-null
children. That single criterion, applied per construct against what PostgreSQL
actually does with NULLs there, generates every rule — there is no separate
theory to learn.

Two consequences are worth stating because they are counter-intuitive.

**Strictness is not the criterion for an operator; totality is.** A strict
operator returns NULL for NULL input, which says nothing about its behaviour
on non-null input. Subscripting a JSON document with a missing key is strict
and returns NULL for two perfectly non-null operands. What the walk needs is
that the operator is never NULL for non-null operands, which is a different
and stronger property.

**A conditional expression is non-null only with a fallback arm and non-null
results everywhere.** Without a fallback, an unmatched conditional is NULL.
Each arm's result is walked under the conditions required to REACH it, so an
arm can use facts that hold only on its own path.

## Facts the schema does not state directly

**Check constraints.** A validated check constraint held for every stored row,
so a filter that selects rows the constraint discriminates can entail a column
non-null. The derivation is purely syntactic — the kernel works in three
valued logic over the constraint's structure and the statement's own
predicates, and never evaluates an expression to reach a conclusion. This is
the difference between reading a constraint and reimplementing PostgreSQL's
expression semantics, and only the first is in scope.

**Foreign keys.** A join whose condition is an equality on a non-null foreign
key ALWAYS matches, so the referenced side never null-extends. The same
reading covers a full outer join's referenced side, where the key forbids the
extension that would otherwise apply, and a correlated scalar subquery, where
the question is not "exactly one row" but "at least one".

This entailment reads a validated, enforced, non-deferrable key as a
guarantee. That trust is deliberate and its boundaries are recorded as an open
item, because several operational states falsify it with no trace in the
catalog.

**Set-returning functions in FROM carry a NEGATIVE rule**, and it is the
opposite of what the declaration suggests. A function returning a set of some
table's rows carries that table's ROW TYPE, which describes column types and
nothing else — non-null constraints do not travel with it, and PostgreSQL
re-imposes nothing. Such a function can return a row of all nulls without
error. So the declaration is read for SHAPE and never for nullability; where
nullability is recoverable it comes from analysing the body.

## Refusing rather than guessing

Results are a positional array zipped against PostgreSQL's own column list,
which makes the output column LIST load-bearing. Getting it wrong misassigns
every flag past the divergence, and does so while looking authoritative. Arity
alone is a weak guard, because a construct can preserve the count and change
the order — merged join columns are the standing example, since PostgreSQL
emits the merged column FIRST.

So the walk refuses where silence would corrupt the column list, and degrades
to nullable where it would merely blunt a value. The distinction is the
dispatch site: an unrecognised expression costs nothing structural, because
one output entry is one output column whatever the expression is, so it is
answered nullable. An unrecognised construct in a position that determines the
column list is refused outright.

## What this is not

**Not type inference.** PostgreSQL supplies types from its own analysis; only
nullability is inferred here.

**Not theorem proving.** The predicate analysis is syntactic pattern matching
plus a strict-dependence closure, not logical implication. Conjunction
recurses, disjunction intersects, a listed set of comparison shapes is
understood, and anything else is skipped conservatively. Branch guards run the
same analyser, so they share exactly these limits.

**Not set-theoretic.** Row-shape unions are not modelled from disjunctive
predicates. A disjunction contributes only what every arm proves.
