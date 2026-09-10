---
description: hand-authored database worlds and their query contracts
---

Each directory is one independently understandable database world. Its schema,
seed data, and queries travel together. Query fixtures state the complete
contract expected from the engine; PostgreSQL execution then adjudicates the
claims.

<!-- espalier adopt: begin /worlds/AGENTS.md -->

## Working rules for isolated-world fixtures

Every fixture in the shared corpus asks its question of ONE world. That world
is shared, so it cannot be varied — changing it re-runs everything. The result
is a corpus rich in queries and fixed in schema, and a whole axis of the
engine's input that no standing suite can move.

This directory is where that axis moves. A fixture here brings its own world.

These rules bind only here. **The shared corpus is grandfathered, not
migrated.** It is small-table-heavy because it was built to maximise query
variety per table, so it fails most of the shape rules below — and rewriting
the schema that hundreds of fixtures depend on would be a large, risky change
to a suite that has already earned its keep. Exclude it from every count;
do not "fix" it.

### 0. The checker, and when to run it

The structural and composition rules through "No dead schema" are enforced by
the Espalier aggregate constraint
`worlds/[...world]/world-health.sql.mjs`. Its explicit `targets` selector
collects the complete governed SQL corpus into one deterministic invocation.
Complete nullable contracts are enforced separately by the per-fixture
Espalier rule and `tests/unit/query/worlds-contract.test.ts`, as described in
rule 9. Both are part of the ordinary development gates.

Run the health aggregate alone while authoring:

```
pnpm exec espalier lint --config tests/unit/query/espalier.config.yaml \
  --rule 'worlds/[...world]/world-health.sql.mjs' --no-cache
```

Absolute violations name the world and attach to its schema or malformed
fixture. A proportion out of range names the ratio and its bound. The
parameter average and generated-column ratio name the whole corpus. A fallen
ratchet names the measure and both values.

A corpus-wide proportion only binds once its denominator reaches
`ceil(1/floor)`. Below that point it is arithmetic rather than a measurement,
so the aggregate deliberately emits no verdict for it.

The ratchet floors live beside the measuring code in the aggregate rule.
Raise them when the corpus improves. If a deliberate world removal or
replacement loses a composition measure, lower that named floor explicitly
and explain why in the commit; there is no environment-controlled rewrite of
the specification.

**Run it after every schema edit, not only at the end.** Most of these rules
are about proportion — constraints per column, NOT NULL share, average arity —
so a table added late can push a world out of compliance that was fine when
each part was written.

#### The other half: did the world buy anything?

Health says a world is not collapsing. It does not say the world was worth
building. The rung-reach aggregate counts which engine decisions, and which
PAIRS of decisions, fire while analysing each world's statements. Nearly every
decision already fires somewhere; compositions between them remain the useful
frontier.

```
pnpm exec espalier lint --config tests/unit/query/espalier.config.yaml \
  --rule 'worlds/[...world]/rung-reach.sql.mjs' --no-cache
```

Every world must exercise at least nine rungs and eighteen pairs. The distinct
pair union across this directory must hold eighteen pairs for the first world
and grow by four for every additional world. Repeating an existing world's
engine paths therefore cannot admit another world merely by satisfying the
schema-health rules.

The shared fixture corpus is excluded completely. It is frozen input and does
not participate in either the measurement or its ratchets.

Presence-group inference and joint parameter rejection run outside the column
trace that supplies these rungs. Their independent fixture declarations and
executable contracts remain the gate for those mechanisms.

#### The two shape reports

Neither gates anything; both exist to be read before writing.

```
pnpm exec vitest run tests/unit/query/corpus-shape.test.ts
VOCABULARY_REGRESS=1 pnpm exec vitest run tests/unit/query/vocabulary.test.ts
```

`corpus-shape` is how the corpus COMPOSES — depth, join-type chains, writing
statements, common table expressions, constraint and generation shape — with a
marginal section naming what this directory reaches that the shared corpus does
not. `vocabulary` is what the corpus HAS: constructs carried by a single
statement, which vanish silently if that fixture goes, and constructs a
borrowed corpus of real SQL produces that neither of ours ever has.

Vocabulary is close to saturated, so expect its gap list to be short and treat
a long one as suspicious. Composition is not, which is why the marginal rows
are the ones worth moving.

### 1. A world is a directory

One directory holds a schema, the data that populates it, and the fixtures
that ask questions of it. Everything needed to understand a fixture is in one
place, and nothing outside the directory has to be read or disturbed.

Fixtures sharing a world share one database instance. That is the reason for
grouping by directory rather than letting each fixture name a schema: standing
up a database is the cost, and the schema inside it is nearly free.

### 2. Model something real, and make it read that way

Named tables, named columns, a domain a person could describe out loud. An
order has a customer, a line item has a quantity, a shipment has a carrier.

This is the rule nothing can enforce, and it is the one that matters most. A
world of single-letter tables over columns called `a` and `b` makes it
impossible to see whether a claim is PLAUSIBLE — the reviewer can check that
the engine agrees with PostgreSQL, and nothing else. A fixture nobody can
judge by reading is a fixture only its author can review, which is the failure
mode this whole directory exists to escape.

### 3. Table shape

**At least three non-key columns**, unless the table exists only to join two
others. Key columns are structure; the rest are where the facts that reach
nullability live.

**Any table meeting that width carries at least one CHECK.** The world-wide
density rule below could otherwise be satisfied by piling every constraint
onto one table and leaving the rest bare.

### 4. World shape

**At least three tables**, so there is something to join.

**One CHECK per three non-key columns.** Constraints are the normal state of a
real schema, not decoration on one column.

**CHECKs average at least two columns.** This is the guard that makes the
density rule mean something: a single-column `CHECK (qty > 0)` satisfies
density at no thought, and averaging pulls filler back down. If this rule is
ever relaxed, density becomes a formality — the two travel together.

**Between a quarter and three quarters of non-key columns are NOT NULL.** A
band, not a floor. All-NOT-NULL produces no nullable claims, so there is
nothing for the witness discipline to bite on; all-nullable produces no
notNull claims worth proving. Both halves have to exist.

**At least one foreign key, and at least one of them NOT NULL.** Key
entailment — a join on a validated NOT NULL key always matches — is a live
mechanism, and the rules above count only NON-key columns, so nothing else
forces a key to exist in a shape that reaches it.

### 5. What the corpus must ask, across this directory

Proportions rather than counts, and corpus-wide because a world built to test
one thing should not be forced to carry every shape.

**Every one binds only once its denominator can express it.** A five percent
floor says nothing over twelve statements — one statement is already eight
percent. The gate comes from the threshold itself: a floor of _p_ starts
binding at `ceil(1/p)` items, and below that the aggregate emits no verdict.
That is what lets these be written now, while the corpus is still small enough
that a percentage is arithmetic.

- **At least a fifth of statements modify.** Root or inside a CTE — a
  data-modifying CTE writes exactly as much as a top-level statement, and its
  RETURNING is a claim surface either way.
- **Of those, a fifth each INSERT, UPDATE and MERGE, and a twentieth DELETE.**
  That reserves about two thirds of the modifying budget and leaves the rest
  free.
- **Between two fifths and seven tenths of statements carry a parameter.** A
  band, not a floor. Too few and the input contract goes unexercised; too many
  and the LITERAL path starves — the entailment kernel matches literals against
  constraint constants, and a parameter never matches one.
- **A parameter only counts where its nullness can matter**: a predicate, a
  written value, a function argument. One in `LIMIT` or `OFFSET` bounds a row
  count and nothing else, and a bare one in a select list is a nullable output
  column with no reasoning behind it. Neither counts, which is what stops a
  world satisfying the band by tacking `LIMIT $1` onto every query.
- **Parametrized statements average more than one and a half parameters.** A
  corpus of one-parameter queries never asks whether two bindings interact.
- **Half of CHECKs carry a null test, and a tenth carry a literal NULL.** Two
  thresholds because they are two different things. `IS NULL` and `IS NOT NULL`
  are what real schemas write and what the fact harvest reads; a bare `NULL`
  inside a constraint is rare in real modelling, which is why its floor is low
  — it is a parse shape worth having, not a shape worth forcing.
- **Three tenths of generation expressions carry a literal NULL.** Higher than
  the CHECK floor, because here the literal IS the realistic form: a branch
  returning NULL is how a generated column becomes nullable at all.

### 6. Corpus composition, across this directory

These are ratios no single world can be judged against, so they are ratcheted:
they may improve or hold, never fall. A change that lowers one fails, and the
failure names the change rather than blaming whoever came last.

- **Generated columns**: at least one per five tables.
- **Constraint additivity**: columns carrying two or more CHECKs. Two
  constraints on one column must be read together before anything follows,
  which exercises accumulation rather than lookup.
- **Constraint chaining**: CHECK pairs sharing a column without covering
  identical columns. That overlap is what lets a conclusion pass through one
  column to reach another.
- **Generated over constrained**: generated columns whose expression reads a
  CHECK-constrained column — where the claim about the generated value depends
  on the constraint reasoning holding.
- **Join composition**: distinct join-type chains, and the deepest. A chain is
  the ORDERED sequence of join types from outermost inward, because an outer
  join under an inner one is a different question from the reverse.

**Every new world should move at least one of these.** A world that satisfies
every shape rule and is then queried with a flat SELECT has spent its cost and
bought nothing.

### 7. Data is written by hand, beside the world

The rows are the interesting part. They are what makes a query return the row
that exposes a claim, and what puts a NULL where a claim says one can appear.

Do not reach for the shared corpus's generator here. Its breadth tier earns
its place over a world too large for one author to hold; inside a world you
wrote, you know every table, and writing the rows is shorter and clearer than
configuring something to write them. Its column tier is schema-specific
anyway, so using it would mean hand-authoring generator entries to produce
rows you could have written directly.

**The witness obligation is unchanged**: every nullable claim needs a NULL to
appear somewhere, or a recorded reason why it cannot. A fixture whose query
returns no rows has proved nothing and must say so.

### 8. No dead schema

Every table, every CHECK and every generated column must be read by at least
one fixture in its own world.

This is what makes the rules above pay off rather than becoming a quota.
Without it the cheapest way to satisfy a ratio is to add constraints nothing
queries, which grows the schema, slows the suite, and measures the corpus
instead of the engine.

**The checker's version of this is a proxy, and knowing where it is weak is
part of using it.** A table counts as read when a fixture names it. A generated
column counts as read when a fixture names the column, or when any fixture in
the world selects a star. A CHECK is only reached through its table, so a
constraint on a queried table always passes. The proxy catches dead TABLES and
dead GENERATED COLUMNS reliably; it cannot tell you that a CHECK never reached
a claim. For that, read the engine-side censuses instead.

### 9. Fixtures state the expected contract independently

A committed fixture here is an oracle, not a transcript of what the engine
currently emits. It states every flat output and parameter verdict, every
output presence group, and every minimal joint parameter rejection set. Empty
group channels are explicit too. Derive those declarations from the query and
world before asking the engine; copying the engine's answer would reproduce the
generated corpus's completeness blind spot.

Espalier enforces that every channel is present. The world contract suite
compares every declaration with the engine in both directions, asks PostgreSQL
to exhibit both arms of each output presence group, and proves each parameter
set is minimal before witnessing its all-members-NULL rejection.

When a sweep exposes an engine disagreement, capture the intended result RED
under the parent guide's discipline. Do not make a committed world green by
recording an answer already known to be wrong.

A world graduates whole and keeps its directory. Folding its schema into the
shared one spends the isolation that made the finding legible, and grows the
shared world on behalf of everyone who never needed it.
<!-- espalier adopt: end /worlds/AGENTS.md -->
