# Generating queries to test the engine

## The problem generation solves

Hand-written fixtures verify the constructs somebody thought to write. Every
construct is covered individually; what is not covered is their COMBINATIONS —
a full outer join inside a grouping inside a common table expression under a
set operation, and the thousands of similar shapes nobody sits down and
invents.

Nullability reasoning is compositional, so combinations are exactly where it
breaks. Generation reaches that space, and it needs no hand-written
expectations, because PostgreSQL is the answer key.

## What the checks prove, and what they cannot

Two oracles, and they are not equally strong. Conflating them leads to
overclaiming.

**The column list is a COMPLETE oracle.** The engine's output column list is
compared against PostgreSQL's, in order. Any disagreement is a defect with no
interpretation required. This matters more than it sounds: nullability is
delivered as a positional array zipped against PostgreSQL's own column list,
so a wrong column ORDER misassigns every flag past the divergence while
looking authoritative.

**Nullability is a ONE-SIDED oracle.** Running a query can only falsify a
not-null claim — the engine said never null, the database returned null, the
engine is wrong. The converse proves nothing: a nullable claim that never
produces a null might be engine imprecision or might be data that never
reached the case, and execution cannot tell them apart.

So this system finds UNSOUNDNESS — wrong "never null" claims, the ones that
make a consumer skip a check it needs. It does not find imprecision. That is
measured separately and is not this system's job.

## The pipeline, and why the text round-trips

    construct a tree → render it as SQL → parse that SQL → the engine
                                       ↘ the same SQL    → PostgreSQL

**Feed the engine the RE-PARSED text, not the constructed tree.** Both sides
then analyse one identical string, and the engine only ever sees trees the
real parser produces rather than trees a generator imagined.

A useful consequence: exact rendering fidelity stops being a requirement. If
the renderer produces something different from what was intended, the result
is simply a different valid query, which is still a perfectly good test.

**The reachable language is bounded by the RENDERER, not the parser.** A
construct the renderer cannot emit is unreachable however well the parser and
the engine handle it — every such query dies before reaching the database.
Check this before widening the vocabulary, because it is invisible until a
whole axis produces zero signal.

**The one failure mode worth defending against is the silent one.** Where a
renderer drops a clause and emits SQL that parses cleanly without it, a
generator that asks for the clause, does not get it, and reports success has
produced false confidence rather than a test.

A census of what a corpus CONTAINS cannot detect this, because only the
generator knows what each query was supposed to contain. So the generator must
declare its expectations: for each axis tuple, the node kinds that tuple should
produce, asserted against the re-parsed tree. Anything requested but absent is
a silent drop, and is reported rather than assumed away.

## Volume is not the lever — vocabulary is

This is the most important measured fact about the instrument, and it inverts
the obvious instinct.

Half a million generated statements over five seeds produced ZERO findings. The
run was healthy by every internal measure — high return rate, no crashes, no
tool defects.

The saturation curve says why more of it cannot help. At the end of a run, the
overwhelming majority of queries still produce a shape never seen before. The
space is not being exhausted, it is barely dented, so there is no volume at
which this converges and no point at which a clean run means "covered".

Set against that, every defect the instrument has found arrived within the
first few thousand queries AFTER the vocabulary that could express it existed.
None needed volume; each needed a CONSTRUCT.

**So a large run is an excellent post-change regression net and a poor search
strategy.** Effort belongs in widening the vocabulary, and after that in
pointing the instrument at mechanisms it cannot currently express — never in
running the same space longer.

## The corpus and the engine can share a blind spot

The failure mode this guards against: a corpus whose vocabulary was shaped by
the same assumption that created the hole in the engine.

It has happened. Two unsound claims fired precisely at the branches that run
when operand types are unreadable, and the generated corpus could not have
caught either — its schema had no column of the type that would falsify them,
because the reasoning for leaving the hole open was that no application schema
would have one. The corpus could not express what its vocabulary lacked, and
the vocabulary lacked it for the same reason the engine did.

The defence is that **vocabulary must be derived from the tables the engine
reads, not from intuition.** For every escape row a curated table records, the
schema gains a column of the relevant type. The census that enumerates what
the engine can read becomes the specification for what the schema must offer.

A corollary worth stating: measure how much of the SCHEMA the corpus actually
reaches. A corpus referencing a handful of relations out of dozens has large
shape variety over a single catalog profile, which reads as diversity and is
not.

## Reporting a run

**Every query lands in exactly one bucket, and there is no "other".** An
outcome nothing classifies is itself a finding — a bucket is missing — and it
fails the run rather than being swallowed.

Buckets fall into four tiers, and the tier decides what the count MEANS:

**Finding** — the product. A wrong claim, a disagreeing column list, a crash,
a broken parity between the traced and untraced walks. Each becomes a fixture
and an engine fix.

**Tool** — our bug. The generator could not build the tree, the renderer had
no case, the rendered SQL did not parse, the round trip changed the tree, or
PostgreSQL refused the statement. Never a filter: a rejected query is
classified, not skipped.

**Budget** — legal but wasteful. A statement that raises, or returns no rows,
produces no signal, so a high rate means the run is spending itself on
nothing. A quality metric of the tool, never a correctness problem.

**Expected** — the engine's own declared refusals, counted and classified by
site rather than treated as failures.

Refusals and raises are subdivided by ERROR CODE, never by message text, which
drifts between versions. Each class is a work item with a count.

## Two fingerprints, because they answer different questions

A run that hits one bug ten thousand times must report *one finding, many
instances* rather than ten thousand findings.

**The finding fingerprint** groups instances of one defect. It is composed
from the bucket plus the query's shape and the offending column's position, or
for a tool defect the node kind and the construct that triggered it. **Never
the SQL text**, or every random literal mints a fresh finding. Expect the
first version to be too specific rather than too loose — that is the direction
that flatters.

**The query fingerprint** groups structurally identical queries, so a run can
answer how many genuinely different things it just tested. It has three
levels, all computed from the tree and the schema with no engine involvement,
because diversity is a property of what was GENERATED:

- the SHAPE — the tree with names and literals erased, so node kinds, nesting,
  join kinds and clause presence remain;
- shape plus CATALOG PROFILE — the properties of every column and relation
  used: nullable, not-null, domain, foreign key, partitioned, generated,
  trigger-bearing;
- the NODE-KIND SET, which maps onto the grammar census.

The second level is the one a narrow corpus fails, and failing it looks like
success at the first level.

**Watch new distinct fingerprints per thousand queries, not the total.**
Climbing means volume is buying something. Flattening means the vocabulary is
exhausted and every further query is waste — and the fix is new vocabulary,
never more volume. Flat immediately at high volume is the signature of a
corpus pointed at two or three relations.

**Keep one representative per fingerprint, verbatim.** A finding needs a query
somebody can run.

**A negative result must carry its bound.** "No findings" means nothing
without the shape of what was searched; a clean run reports the vocabulary it
covered so the reader can see what it could not have found.

## Design decisions that hold

**Structure-rich, expression-poor.** The defects live in how rows are produced
— joins, grouping, set operations, scope crossings — not in how values are
computed. Deep expression nesting buys little and costs validity.

**Enumerate rather than randomise, at least first.** An enumerated space is
reproducible, its coverage is countable, and its gaps are visible. Randomness
is what you reach for once enumeration has been exhausted, not before.

**Validity is the generator's responsibility.** A query PostgreSQL rejects
tests nothing and consumes budget. The generator must construct only
well-formed statements, which means it needs the schema, not just a grammar.

## Constraints that bite

**A foreign-key join always matches, so absent arms need a direction.** Follow
a real key and no row can dangle, so an outer-join spine can emit thousands of
outer joins and witness the null-extension of none. Which direction is
inhabitable is a property of the schema, not of the query, and the generator
has to know it.

**Modifying statements need more than a rollback.** A returning clause is the
only observable — without one a modifying statement produces no output
columns, hence no claims and no signal beyond shape and refusal. And written
values have the collision problem: a random value duplicates a key, dangles a
reference, or fails a constraint, so the statement raises and the budget is
gone. Values must be drawn from what the schema admits — a referencing column
from the parent's seeded values, a surrogate key freshly, a constrained column
from its own generator.

**Some relations are frozen and must stay so.** A schema the fixtures depend
on cannot be reshaped to suit the generator, and relations that look unused
are load-bearing for suites that do not appear in a usage scan. Add rather
than prune.
