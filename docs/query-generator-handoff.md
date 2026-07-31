# Generating queries to test the nullability engine

## What this document is

The specification for a system that generates SQL queries mechanically and
checks the nullability engine against PostgreSQL on each one. Read
`docs/nullability-walk.md` first for how the engine works, and
`docs/witness-coverage.md` for how the existing fixture suite executes and what
it measures — this system reuses that machinery rather than replacing it.

## The problem

The engine's claims are verified against 134 hand-written fixture queries. Every
one passes, every one returns rows or declares the error it raises instead, and
every claim it makes is checked against a real PostgreSQL.

That is a strong result about 134 queries somebody thought to write. It says
much less about the queries nobody thought to write. The constructs are all
covered individually; what is not covered is their *combinations* — a `FULL
JOIN` inside a `GROUP BY` inside a CTE under an `EXCEPT`, and the thousands of
similar shapes that no author sits down and invents. Nullability reasoning is
compositional, so combinations are exactly where it breaks.

Generation reaches that space. It needs no hand-written expectations, because
PostgreSQL is the answer key.

## What the checks can and cannot prove

Two oracles, and they are not equally strong. Both matter; conflating them
leads to overclaiming.

**Column list — complete.** The engine's output column list is compared against
PostgreSQL's, in order. Any disagreement is a defect, with no interpretation
required. This is the stronger of the two and the easier to trust, and it
matters more than it sounds: nullability is delivered as a positional array
zipped against PostgreSQL's `RowDescription`, so a wrong column *order*
misassigns every flag past the divergence while looking authoritative.

**Nullability — one-sided.** Running a query can only ever falsify a `notNull`
claim: the engine said a column is never NULL, PostgreSQL returned NULL, so the
engine is wrong. The converse proves nothing — a `nullable` claim that never
produces a NULL might be imprecision in the engine or might be data that never
reached the case, and execution cannot distinguish them.

So this system finds **unsoundness**: wrong "never NULL" claims, which are the
ones that would make a consumer skip a NULL check it actually needs. It will not
find imprecision. Imprecision is measured separately, by witness coverage, and
that measurement is not this system's job.

## Shape of the pipeline

```
construct AST → deparse to SQL text → parse that text → engine
                                   ↘ same text          → PostgreSQL
```

**Feed the engine the re-parsed text, not the constructed AST.** Both sides then
analyse one identical string, and the engine only ever sees ASTs the real parser
produces rather than ASTs a generator imagined. A useful consequence: exact
deparser fidelity stops being a requirement. If the deparser renders something
differently than intended, the result is simply a different valid query, which
is still a perfectly good test case.

### The deparser

`pgsql-deparser` (npm, version 18.1.1 at time of writing) is a pure-TypeScript
deparser for PostgreSQL 18 ASTs with no parser dependency of its own. It is
compatible with the ASTs `libpg-query` produces here.

It is a devDependency, and the round-trip comparison is committed as
`tests/unit/query/deparser-roundtrip.test.ts`, which pins the outcome below
per fixture — the regression guard for any future deparser bump.

Measured over all 134 fixtures, `parse → deparse → parse`:

| | |
|---|---|
| identical round-trip | 130 |
| deparse threw | 1 (`xmltable-jsontable` — an unhandled join node type) |
| regenerated SQL did not parse | 1 (`expression-node-coverage` — a stray `[`) |
| parsed, but the AST differed | 2 (`recursive-cte-search-clause`, `recursive-cte-cycle-clause`) |

Comparing ASTs requires stripping source byte offsets first: `location`, and
also `list_start` / `list_end` / `rexpr_list_start` / `rexpr_list_end`, which
are offsets under names that do not say so. Without that, nothing matches and
the deparser looks broken when it is not.

**The one failure mode that needs defending against is the silent one.** For
the two recursive-CTE cases the deparser drops the `SEARCH` / `CYCLE` clause and
emits SQL that parses cleanly without it. A generator that asks for a `SEARCH`
clause, does not get one, and reports success has produced false confidence
rather than a test.

The defence is a technique that exists, not a tool that can be pointed at new
input: `node-census.test.ts` hard-codes its corpus (the grammar sampler plus
the fixtures directory) and keeps its ten-line `collectTags` walker
module-local, so it cannot be run over a generated corpus as-is. Replicate the
walker (or export it), and note that the census alone cannot detect a silent
drop anyway — it reports what a corpus *contains*, and only the generator
knows what each query was *supposed* to contain. So the generator must declare
its expectations: for each axis tuple, the node types that tuple should
produce, asserted against the re-parsed AST. Anything requested but absent is
a silent drop, and should be reported rather than assumed away.

## Design

### Structure-rich, expression-poor

The engine's reasoning lives almost entirely in *structure* — join kinds and
their nesting, grouping, set operations, CTEs, subqueries, LATERAL. At the
expression level it is deliberately conservative: most expressions are nullable
unless proven otherwise, and the ones that matter are a short list (`COALESCE`,
`CASE`, `NULLIF`, aggregates, strict functions, casts to NOT NULL domains).

Spend the generator's complexity on structure and draw every expression from a
small, fixed, known-typed vocabulary — a column reference, `COALESCE(col,
literal)`, `count(*)`, `max(col)`. Type-correctness then costs almost nothing,
because the generator never invents an expression, only places one. Join
structure in particular does not care about column types at all, which makes it
both the richest source of nullability behaviour and the cheapest to keep valid.

### Enumerate rather than randomise, at least first

The structural space is small enough to walk exhaustively. A nested loop over
axes — join kind × nesting shape × wrapper × grouping × set operation ×
projection kind — produces a few thousand queries, each of which is small by
construction.

This is worth preferring to random generation for concrete reasons:

- Every generated query is already minimal, so no shrinker is needed to make a
  failure diagnosable. This is the single largest cost avoided.
- A failure is reproducible from the tuple of axis values, with no seed to
  replay.
- Coverage is systematic rather than lucky: a fuzzer may never happen to nest
  `FULL JOIN` under `GROUP BY` inside a CTE under `EXCEPT`; an enumeration does
  it because that combination is in the list.
- Axes can be added one at a time, each multiplying coverage.

The limitation is real and should be stated rather than hidden: enumeration only
finds what its axes cover, and will not surprise anyone. If it stops finding
defects, that is the point at which a general randomised generator becomes worth
its cost — and by then there will be evidence about which constructs deserve the
effort.

### Validity is the generator's responsibility

A generated query PostgreSQL rejects is a generator defect, not a finding.
Count rejections and report them; a healthy generator's rejection rate is
approximately zero. Silently discarding rejects hides a generator that has
quietly stopped exploring half its space.

The engine's own refusals are different and expected. Where a construct would
change the output column list and the walk does not support it, the walk throws
`UnsupportedNodeError` rather than guessing. Those queries should be counted and
skipped, not failed — refusing is the designed behaviour, and the count is
useful signal about where support is missing.

## Reusing what exists

Do not rebuild execution — but be clear about what "reuse" means here. The
soundness suite's loop lives inline in a `beforeAll` and exports nothing, and
the generator's loop differs anyway (no argument bindings, no `@no-rows`
markers, instance recycling every N queries). What is reusable is
`loadDataStates`, the schema-and-catalog setup, and the patterns below — not
imports from the test file. `tests/unit/query/nullability-soundness.test.ts`
already does the expensive part and is worth reading in full before starting:

- Data states live in `tests/unit/query/fixtures/data/` (`empty`, `sparse`,
  `dense`, `uniform`) plus a generated state built from the catalog snapshot;
  `loadDataStates` in `tests/unit/query/fixture-data/states.ts` returns them.
- Execution is **state-major**: one PGlite instance per data state, loaded once,
  with each query's own writes rolled back around it. This matters — see the
  memory constraint below.
- Rows are read with `rowMode: "array"`. Column names are not unique
  (`SELECT a.id, b.id` yields two columns named `id`), so the object form
  silently collapses them and would compare a column against itself.
  Nullability is positional and must be read positionally.
- A statement that raises is not a counterexample: it returned no rows, so
  "never NULL" still holds for every row it did return.

Which states get the full enumeration matters, and the answer is two of them,
for different halves of the space. `empty` is where ungrouped aggregates and
scalar subqueries are most adversarial: zero input is exactly where `count(*)`
stays 0 but `max(col)` goes NULL. But `empty` is *vacuous* for join structure —
an outer join over two empty tables returns no rows at all, and a query that
returns no rows falsifies nothing (a `GROUP BY` over zero rows likewise yields
zero groups). The unmatched-join shape — one side produces a row, the other is
NULL-extended — needs one side populated and the other not. `sparse` was built
for that shape, but only for the commerce tables: its single `t`/`u`/`v` rows
all match each other, and those are the tables the generator joins. The
generated suite therefore runs a third, suite-local state — `unmatched`, which
is `sparse` plus one row on each side that nothing matches — so that a NOT
NULL base column actually comes back NULL-extended somewhere. Run the full
enumeration against `empty`, `sparse`, and `unmatched`, and a reduced set
against the others if the total execution count needs bounding.

## Constraint: PGlite memory

A long-lived `PGlite` instance leaks; see rule 6 in the workspace `AGENTS.md`
for the measurements. WASM linear memory only grows, `ROLLBACK` returns nothing,
and the ceiling is a self-imposed 2 GB. Thousands of generated queries against
one instance will reach it.

Prefer few large statements over many small ones, and recreate the instance
every N queries rather than expecting a transaction to reclaim anything. The
state-major arrangement already limits this: data is loaded once per state, and
only each query's own writes are rolled back.

## What "done" looks like

**A bounded, deterministic run in the normal test suite.** Fixed axis
enumeration, no seed-dependent behaviour, and a query count that does not
meaningfully slow `npx vitest run`. A longer exploratory run behind an
environment variable, in the style of the existing `FUZZ_SEED` /
`WITNESS_REPORT` knobs documented in `docs/witness-coverage.md`.

**A report that stands on its own**, printed every run:

| | |
|---|---|
| queries generated | |
| rejected by PostgreSQL | expected ≈ 0; anything else is a generator defect |
| refused by the engine | `UnsupportedNodeError`, by node type |
| column-list disagreements | each a defect |
| nullability violations | each a defect |
| nullable claims witnessed by an actual NULL | the reward half, enforced census-style: every unwitnessed claim must match a named `UNWITNESSABLE` rule with its reason, and rules that match nothing are stale. Soundness alone punishes a wrong `notNull` and rewards nothing; an aggregate ratchet was rejected because a regression can hide behind an unrelated improvement |
| constructs requested but absent from the generated corpus | silent deparser drops |

**Every failure reproducible from the report alone** — the SQL text, the data
state, and the axis values that produced it. A finding that requires re-running
the generator to see again is a story, not a bug report.

**A path from finding to regression test.** A generated counterexample should
become a permanent fixture in `tests/unit/query/fixtures/` with hand-written
`-- @notNull` / `-- @nullable` annotations, so that the specific defect stays
covered by the annotation suite once fixed. That is the loop closing: the
generator finds it, the corpus keeps it.

## Where things are

| | |
|---|---|
| The generator itself | `tests/unit/query/generated/generator.ts` |
| The generated suite | `tests/unit/query/generated/generated-soundness.test.ts` (`GENERATED_ALL_STATES=1` for every data state) |
| Deparser round-trip measurement | `tests/unit/query/deparser-roundtrip.test.ts` |
| Engine | `src/query/nullability-walk.ts`, `src/query/catalog-adapter.ts` |
| Engine design | `docs/nullability-walk.md` |
| Engine's refusal contract | `UnsupportedNodeError` in `nullability-walk.ts`; `tests/unit/query/unsupported-nodes.test.ts` |
| Fixture suite design + measurements | `docs/witness-coverage.md` |
| Executable suite to reuse | `tests/unit/query/nullability-soundness.test.ts` |
| Data states | `tests/unit/query/fixtures/data/`, `tests/unit/query/fixture-data/states.ts` |
| Fixture schema | `tests/unit/query/fixtures/schema.sql` |
| AST node classification + census | `tests/unit/query/node-census.test.ts`, `grammar-sampler.ts` |
| Column order vs PostgreSQL | `tests/unit/query/column-sequence.test.ts` |
| Open work on the engine | `docs/deferred-tasks.md` |

Run the suite with `npx vitest run` from `pgsid/`. Use `pnpm` for installs —
`npm install` fails in this workspace.
