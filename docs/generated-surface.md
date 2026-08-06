# Widening the generated suite's surface — handoff

## Charter

Three adversarial sweeps have run, and all three found defects the standing
test suite could not have found. This document says why, with the
measurement that establishes it, and specifies the work that closes the gap.

Read `docs/query-generator.md` first — it is the generated suite's
specification and this document extends rather than replaces it. Read
`docs/witness-coverage.md` for how the fixture suite executes.
`docs/deferred-tasks.md` section 1 carries the sibling item (the
arity-and-order gate at the consumer boundary); the two are independent.

## The measurement

After the third fix phase (2026-08-05) the suite stood at 2221 tests, 330
fixtures, and a generated corpus of 8980 queries reporting **zero** column
list disagreements and **zero** nullability violations — before the phase
and after it. Seven engine changes, eight closed findings, and the corpus
did not move once.

That is not a corpus doing badly at its job. It is a corpus that **could not
express a single one of the eight falsifying inputs.** Classified by what
each finding needed to exist at all:

| what it needed | findings |
|---|---|
| schema vocabulary `fixtures/schema.sql` did not have | 2, 3, 4, 6, 7 — an overloaded SETOF function; composite-array columns; a domain over a composite; a user function named after a builtin; a `RETURNS TABLE` with quoted column names |
| a query shape the generator has no axis for | 1, 5, 8 — two SRFs in one target list; a three-part `schema.rel.*` star; an unreferenced CTE carrying a parameter cast |
| only inputs the corpus already covers | **none** |

Five of eight began with a `CREATE` statement. Three needed a query shape
outside the enumerated axes. Zero were reachable from the existing corpus.

## The diagnosis

**The generator varies query STRUCTURE over a FIXED schema vocabulary.**
Every axis widening on record — deep join trees, window functions, parameter
placement, set operations, wrappers — is structural, and every one of them
draws its relations, types and functions from one hand-written schema. The
catalog side has never varied. That is where the last three sweeps found
things, and it is not a coincidence: the engine is a function of (AST,
CATALOG), and only one of its two arguments is being explored.

Three consequences worth stating separately, because they have different
remedies.

**1. Regression pins cannot detect.** Every fixture graduated from a sweep
was written against the already-fixed engine. They stop reintroduction and
nothing else, so the fixture count measures *bugs already found*, not
assurance. A phase in which no existing test breaks is the expected outcome
when every finding's own premise is "this input class is uncovered" — it is
evidence of neither health nor blindness, and the discriminator is whether
the fix changed behaviour on covered input.

**2. The census discipline exists, on one axis only.**
`node-census.test.ts` enumerates every AST node type the walk has considered
and FAILS when reality moves outside the set. That is the pattern that
catches unknown-unknowns, and it is applied to parse-tree node kinds alone.
All eight sweep-3 findings arrived through node types already classified
`handled` — ColumnRef, FuncCall, TypeCast, A_ArrayExpr. Nothing censuses the
CATALOG features those nodes are interpreted against.

**3. Hand-curated tables are unfalsifiable by construction.** Eight name
tables remain in `nullability-walk.ts` (`ALWAYS_NOT_NULL_BUILTINS`,
`STRICT_TOTAL_BUILTINS`, `FIRST_ARG_BUILTINS`, `AGGREGATE_NAMES`,
`NEVER_NULL_WINDOW_FNS`, `NON_NULL_OVER_NONEMPTY_AGGREGATES`,
`HYPOTHETICAL_SET_AGGREGATES`, `ORDERED_SET_AGGREGATES`) plus
`TOTAL_STRICT_OPERATORS` in `operators.ts`. No test asserts what should be
*in* one, so a missing entry is invisible until a sweep writes the query.
This has now yielded three sweeps running — `ALWAYS_NOT_NULL`, then
`STRICT_TOTAL_BUILTINS`, then `BUILTIN_SRF_NAMES`.

## The work, in cost order

Items 1–3 are each about an afternoon and, together, would have caught
findings 1, 2, 3, 4 and 6. Item 4 is the real fix and would have caught five
of eight on its own.

### 1. A catalog-feature census

`node-census.test.ts`'s exact shape, on the other axis: enumerate the
CATALOG features the walk branches on, classify each, and fail when the
fixture schema does not exercise one. The classification is the deliverable
— the failure mode is a feature nobody wrote down, so an explicit list that
reality can move outside of is the whole mechanism.

Seed the list from what the walk actually consults, not from PostgreSQL's
manual. At minimum, and each of these is a real branch today: a domain over
a scalar, over a composite, over an array, over another domain; a composite
type; a TABLE's row type used as a type; an array of each of those; an
identifier needing quotes (space, case, comma, embedded quote); a function
name overloaded within one schema and across two; a function name shared
with `pg_catalog`; a polymorphic return; a relation name shared across two
schemas; `SETOF` versus `TABLE(…)` versus scalar returns; a set-returning
function; a VARIADIC parameter; an inheritance parent with and without
children; a partitioned parent with a leaf and a sub-partition.

Where the walk has a table of names, the census entry is the table.

### 2. Diff each curated table against `pg_catalog`

**A source-based version of this was built and DISCARDED (2026-08-05).** It
scanned the PostgreSQL C source PGlite vendors for reachable
`PG_RETURN_NULL` sites, and it did find a rank-1 unsoundness on its first
run — `lower`/`upper` over an empty range — but its false-negative rate was
2 in 8 on a hand-picked sample, in the unsound direction, and it needed a
source tree the package will never ship. `docs/type-aware-overloads.md`
records why in full, so that nobody rebuilds it. The replacement is the
per-overload witness corpus in that charter, plus the catalog half below.

Wherever PostgreSQL records the property, the table should not exist — and
where it must, a test should hold it to the catalog. `AGGREGATE_NAMES`
against `prokind = 'a'`, the window sets against `prokind = 'w'`. This is
how `BUILTIN_SRF_NAMES` should have died: `proretset` was in `pg_proc` the
whole time.

### 3. Probe the totality tables by execution

`ALWAYS_NOT_NULL_BUILTINS`, `STRICT_TOTAL_BUILTINS`, `FIRST_ARG_BUILTINS`
and `TOTAL_STRICT_OPERATORS` encode TOTALITY, which `pg_catalog` does not
record — `proisstrict` is strictness, a different property, and the
distinction is exactly what the register's imprecision table is about. So
item 2 cannot reach them and execution must: call every member across the
input classes that have historically broken them — NaN, ±infinity, empty
string, no-match, empty array, empty format — and assert a non-NULL result.
Three sweeps have done this by hand, each time finding members that failed
their own criterion (`substring`, `array_position`, `extract`/`date_part`,
`to_number`, `to_char`, `scale`/`min_scale`). Automate it once.

### 4. A schema axis for the generator

Generate DDL as well as queries: the corpus becomes a function of (schema,
query shape) rather than (query shape) alone. This is the item that changes
what the suite is capable of, and it is the one with real design questions.
Four, with the constraints that bound them:

- **What varies.** The census list from item 1 is the axis vocabulary, which
  is why item 1 comes first: it is the specification for this. Vary the
  TYPE side (domain nesting, composite, row type, array-of-each) and the
  NAME side (cross-schema collisions, builtin collisions, quoting) — the
  two families that produced sweep-3's five schema-dependent findings.
- **Cost.** Every distinct schema needs its own PGlite instance, its own
  snapshot and its own catalog. The existing corpus amortises one schema
  over 8980 queries; this inverts that ratio, and `AGENTS.md` rule 6 (a
  long-lived PGlite never returns pages) is the binding constraint. Expect a
  small number of schemas × the existing query axes, not a cross product,
  and put the wide run behind an environment variable in the style of
  `GENERATED_ALL_STATES`.
- **Data.** `fixture-data/generate.ts` already derives seed data from the
  snapshot and FAILS on a type with no generator, which is the right
  behaviour and becomes load-bearing here: a generated schema's types must
  each have a generator or the run stops. Budget for extending the type tier
  alongside the schema axis; the composite-array generators added in the
  third fix phase are the pattern.
- **What it cannot prove.** The oracle is unchanged and still one-sided
  (`docs/query-generator.md`, "What the checks can and cannot prove"). A
  wider schema finds more UNSOUNDNESS and more wrong COLUMN LISTS. It does
  not find imprecision, and it does not reduce the value of item 1 — a
  census fails loudly on a feature nobody generated, where a generator
  silently does not generate it.

## What "done" looks like

Item 4 inherits `docs/query-generator.md`'s "What done looks like" verbatim —
bounded deterministic run, a self-standing report, every failure reproducible
from the report alone, every finding graduating into a permanent fixture.
Two additions specific to this work:

- **The report names the SCHEMA**, not just the query, in every failure and
  in the header count. A counterexample that cannot be re-created without
  re-running the generator is a story, not a bug report — and with a varying
  schema the DDL is half the reproduction.
- **The census failures are the primary signal, not the query failures.**
  A feature the census names and the generator does not produce is the
  finding: it is the shape of every defect the last three sweeps found.

## Boundaries — do not re-derive these

- **The oracle is not the problem.** The soundness suite compares ordered
  NAMES against PostgreSQL's `RowDescription` under five data states and has
  never reported a false negative on an input it could express. Do not
  redesign it.
- **The fixture suite is not the problem either.** Hand-written fixtures
  encode structural situations volume does not reach
  (`docs/witness-coverage.md`, "Hand-written"); they are complementary to
  generation, not superseded by it.
- **`pg_catalog` signatures stay out of the snapshot** until the consumer's
  search-path input lands — the two interact, and the register's residue
  entry for sweep-3 finding 6 records why.
- **The stop condition for SWEEPS is already decided**
  (`docs/deferred-tasks.md`, "What to do next"): stop chartering them
  against code age. This document is the answer to "then what" for the
  suite; it does not reopen that question.

## Where things are

| | |
|---|---|
| Generated suite + generator | `tests/unit/query/generated/` |
| Generator specification | `docs/query-generator.md` |
| AST node census — the pattern to copy | `tests/unit/query/node-census.test.ts` |
| Curated tables | `src/query/nullability-walk.ts` (eight), `src/query/operators.ts` |
| Fixture schema | `tests/unit/query/fixtures/schema.sql` |
| Seed-data generators | `tests/unit/query/fixture-data/` |
| Fixture suite design + measurements | `docs/witness-coverage.md` |
| Engine + adapter | `src/query/nullability-walk.ts`, `src/query/catalog-adapter.ts` |
| Snapshot (where a new catalog fact lands) | `src/catalog/snapshot.ts`, `src/catalog/types.ts` |
| Open engine work, and this item's siblings | `docs/deferred-tasks.md` |

Run from `pgsid/` with `npx vitest run`; installs use `pnpm`.
