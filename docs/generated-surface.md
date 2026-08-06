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
did not move once. (The suite is 2347 tests and 352 fixtures as of
2026-08-06, the census's five included; the corpus is still 8980 queries and
still has not moved.)

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

**The imprecision closure (2026-08-06) repeated the measurement and sharpened
it.** Two mechanisms landed that move claims in the UNSOUND direction —
reading a `LANGUAGE sql` body back for a row-returning function, and
foreign-key entailment — 23 claims graduated from nullable to notNull, and the
corpus reported zero disagreements before and after, again. Same cause, one
degree worse: this is no longer only "the corpus missed findings" but **a
mechanism now in the engine that the corpus cannot exercise at all.**

`t`, `u` and `v` declare no keys and no foreign keys (`docs/witness-coverage.md`
says so explicitly — the fixtures join them *as though* they did), and the
generator's structures are built over exactly those three. So every foreign-key
claim the engine now makes has zero generated coverage, and the same holds for
a table function with a body: the corpus has no such function to call. Both
mechanisms rest entirely on hand-written fixtures and their gate pins.

That is the argument for item 4 in its strongest form. A schema axis is not
only how the next sweep's findings would have been caught — it is the only way
the corpus can reach two mechanisms the engine already ships.

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
tables remained in `nullability-walk.ts` (`ALWAYS_NOT_NULL_BUILTINS`,
`STRICT_TOTAL_BUILTINS`, `FIRST_ARG_BUILTINS`, `AGGREGATE_NAMES`,
`NEVER_NULL_WINDOW_FNS`, `NON_NULL_OVER_NONEMPTY_AGGREGATES`,
`HYPOTHETICAL_SET_AGGREGATES`, `ORDERED_SET_AGGREGATES`) plus
`TOTAL_STRICT_OPERATORS` in `operators.ts` (now split in two). No test
asserted what should be *in* one, so a missing entry was invisible until a
sweep wrote the query.
This yielded three sweeps running — `ALWAYS_NOT_NULL`, then
`STRICT_TOTAL_BUILTINS`, then `BUILTIN_SRF_NAMES` — and a fourth time the
moment item 2 finally asked: `AGGREGATE_NAMES` was wrong in three directions
at once and is now a catalog capture. Seven tables remain — plus the two
operator sets — all under the item-2 suite for kind and the item-3 probe for
totality.

## The work, in cost order

Items 1–3 are each about an afternoon and, together, would have caught
findings 1, 2, 3, 4 and 6. Item 4 is the real fix and would have caught five
of eight on its own. **Items 1, 2 and 3 are built (2026-08-06).** Item 2
closed a rank-1 unsoundness on its first run and item 3 found three more, so
the three have already paid for themselves independently of item 4.

### 1. A catalog-feature census — BUILT (2026-08-06)

`tests/unit/query/catalog-census.test.ts`, in `node-census.test.ts`'s shape on
the other axis. **86 features classified — 57 `handled`, 12 `gated`, 12
`conservative`, 5 `environment`. 64 are carried by the fixture schema and 22
are not**, and those 22 are the axis vocabulary item 4 was waiting for. It
runs in about a second and needs no corpus.

The classification is the deliverable, as specified. Each entry names the walk
or adapter branch it feeds, so the entry is a claim about the engine rather
than a note about the schema, and `gated` earns its own category: for a fact
the ADAPTER drops before the walk can ask — a `NOT VALID` or `DEFERRABLE`
foreign key, a `CHECK … NO INHERIT` in the tree variant, a generation
expression that diverges in the subtree — what the fixture schema must carry
is the input the gate REJECTS, since a gate with nothing to reject is untested.

**Two halves, and only the second can catch a feature nobody wrote down.** The
feature list is hand-written, which is the disease this document diagnoses in
the curated name tables: it fails only on what somebody thought to list. So
the census also declares the value domains of the enumerated catalog columns —
`pg_type.typtype`, `pg_class.relkind`, `pg_proc.prokind`,
`pg_constraint.contype`, `pg_proc.proargmodes`, `pg_attribute.attgenerated`,
`pg_attribute.attidentity` — and compares them against the live catalog in both
directions. These have finite, PostgreSQL-defined domains, so a version that
introduces a new relkind or argument mode fails the way a new parse-tree node
type fails the node census. The two halves ask different questions and the
suite says so: the value map asks what the PostgreSQL VERSION produces, the
feature list asks what the FIXTURE SCHEMA carries, and `contype = 'u'` is the
case where they disagree (pg_catalog has 48 unique constraints; the fixture
schema has none).

Five assertions, each mutation-tested to fail alone: every classified feature
is present; every feature marked `absent` really is absent; every
`environment` capture is non-empty; every observed catalog value is
classified; every classified value is observed unless marked `absent`.

**The gap list is the product**, printed every run with the reasons behind
`CATALOG_CENSUS_REPORT=1`. Four of the 22 are exercised by suites that build
their own catalog (`search-path.test.ts`, `resolver.test.ts`,
`unsupported-nodes.test.ts` hold the second schema, the cross-schema overload
and the variadic gate — the fixture harness cannot hold two schemas). The
other 18 are not exercised against the walk anywhere, though several are
captured in `snapshot.test.ts`, which tests the capture and not the branch.
The ones that cost most, in the order they would be cheapest to close: a
DEFAULT argument (the arity window's `argCount >= required` lower bound is
never exercised — every candidate in the schema has `required === inputs.length`);
an INOUT parameter (`proargmodes` 'b' appears nowhere, so both the arity
filter's inout half and `functionOutputColumns`' are untested); a
`GENERATED … VIRTUAL` column (PG18's second mode, read through the same code
path as STORED and measured on neither); a materialized view (the adapter
folds matviews in beside views at three sites and nothing checks that they
behave alike); a sub-partition (every tree in the schema is one level deep, so
the subtree recursion never leaves its base case); a composite and a NOT
ENFORCED foreign key (two gates that have never had anything to reject); a
user aggregate without INITCOND, a user window function, a procedure, an enum,
a unique constraint, an exclusion constraint, a bare table-row-type column, and
a domain over a domain.

**One part of the spec is deliberately deferred to item 2**, rather than
silently dropped: "where the walk has a table of names, the census entry is
the table". The eight tables in `nullability-walk.ts` are module-private, and
the only assertion worth making about them — that their names exist in
`pg_catalog` — is item 2's, not this one's. Exporting them is item 2's first
move and item 3 needs them too; an entry here whose detector is "the table is
non-empty" would be the checkbox this document argues against.

**It found one thing while being written**, and it is item 2's exact shape:
`builtinPolymorphicFunctions` is captured as `rt.typtype = 'p'`
(`src/catalog/snapshot.ts`), but `'p'` is PSEUDO-type, not polymorphic — it
sweeps in `trigger`, `void`, `cstring`, `record` and `internal`. **572 names
where the field's own comment claims 68**, against the 65 whose return renders
`any%`. The direction is safe: the sole consumer is
`isBuiltinFunction(name) && !isPolymorphicBuiltin(name) → scalar`, so
over-capture refuses where PostgreSQL would have answered, costing precision
and never soundness. Left for item 2 because a curated claim the catalog can
falsify is precisely what that item is.

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

**BUILT (2026-08-06): `tests/unit/query/curated-tables.test.ts`**, six
assertions, mutation-tested to fail alone. It convicted on the first run, and
the biggest finding was not in a table at all.

**`AGGREGATE_NAMES` is gone.** `prokind = 'a'` was in the catalog the whole
time, and the table had drifted in three directions at once — the shape a
name table takes when nothing can falsify it. It MISSED 12 of PG18's 54
aggregates (`any_value`, `bit_xor`, `range_agg`, the eight
`json*_agg_strict`/`_unique` forms); it carried two names PostgreSQL has no
function for (`cluster`, `listagg`); and it carried five pure WINDOW
functions (`row_number`, `lag`, `lead`, `first_value`, `last_value` —
`prokind = 'w'`), callable only with `OVER` and therefore unreachable at
every consumer. `CatalogSnapshot.builtinAggregateFunctions` replaces it,
ENVIRONMENT like `builtinStrictFunctions`, and the catalog predicate gets all
three directions right at once.

A missing name was the direction that bites, and the reason it had not: the
strict-scalar gate excludes aggregates by asking this question, so a name it
did not recognise proceeded to the strictness test — and an aggregate over
zero rows is NULL however strict it is. Nothing was reachable in PG18 only
because `builtinStrictFunctions` filters `prokind = 'f'`, so no aggregate name
reaches it. That is safety by coincidence of a DIFFERENT table's filter, and
the suite now asserts the coincidence holds rather than relying on it.

**The rank-1 unsoundness the audit led to was in the WALK, not in a table.**
Chasing why `row_number` sat in an aggregate table reached
`guaranteesSingleRow`, which licenses a claim from "an aggregate with no GROUP
BY collapses to exactly one row" — true of a BARE aggregate, false of a
WINDOWED one. `sum(x) OVER ()` yields one row per input row, so over empty
input it yields NO rows: a scalar sublink is then NULL, and a `LANGUAGE sql`
body returns NULL. Of the walk's three aggregate tests, this was the one that
never excluded `over`. Measured six ways against PGlite at both call sites,
including `count(*) OVER ()`, which reached the same wrong answer through its
`agg_star` short-circuit without consulting a name table at all — so
correcting the table's membership would not have fixed it. Fixed by excluding
windowed calls while still recursing into their ARGUMENTS (`sum(count(*))
OVER ()` is a genuine single-group query, which the old code got right by
accident), and pinned from both sites by `window-call-not-single-row-*.sql`.

**Three dead entries elsewhere**, each convicted by existence alone and each
measured at the parse tree before removal: `trim` (the grammar rewrites every
spelling to `pg_catalog.btrim`), `!=` (the lexer converts it to `<>`), and
`current_catalog`/`current_role`/`user` (keywords the parser turns into
`SQLValueFunction`, never a FuncCall). A name PostgreSQL does not have is dead
weight that reads as coverage.

**What the catalog could NOT settle, stated so it is not mistaken for
covered.** `proisstrict` is strictness, not totality — 2548 of 2726 builtin
names carry it — so `ALWAYS_NOT_NULL_BUILTINS`, `FIRST_ARG_BUILTINS`,
`STRICT_TOTAL_BUILTINS` and `TOTAL_STRICT_OPERATORS` are held to EXISTENCE
only here. Probing them is item 3. The suite prints the
`docs/type-aware-overloads.md` premise every run rather than leaving it in
prose: **133 curated names cover 235 pg_catalog signatures, and 21 operator
names cover 558.**

Two tables ARE exactly a catalog predicate — `HYPOTHETICAL_SET_AGGREGATES` and
`ORDERED_SET_AGGREGATES` against `pg_aggregate.aggkind` — and are asserted
EQUAL in both directions, so a new hypothetical-set aggregate in a future
PostgreSQL fails here. `NEVER_NULL_WINDOW_FNS` is deliberately a SUBSET of
`prokind = 'w'` (`lag`, `lead`, `nth_value`, `ntile` can each be NULL, and
`first_value`/`last_value` depend on a frame the walk does not analyse), so
only its membership is a catalog question.

**One limit of this item, worth recording because item 1 shares it.** The
catalog can say a name exists; it cannot say the name ever ARRIVES. `trim` and
`!=` exist as concepts and never reach the walk, and `current_user` /
`session_user` are the converse — real pg_catalog functions that the parser
nonetheless turns into `SQLValueFunction`, so their entries are dead too and
no catalog assertion can see it. Both were caught by probing parse trees, not
by the diff.

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

**BUILT (2026-08-06): `tests/unit/query/totality-probe.test.ts`**, seven
assertions, each mutation-tested to fail alone. **789 signatures → 13,270
expressions; 10,866 evaluated, 2,426 raised.** Three findings.

The mechanism is a plpgsql `probe(expr text)` that `EXECUTE`s `SELECT (expr)
IS NULL` and returns `'error'` from an exception handler, so one statement
over `unnest($1::text[])` evaluates the whole surface with per-expression
error isolation. 20,000 probes run in ~130ms, which is why the cap on
combinations is about the report staying honest rather than about time.
Arguments come from a per-type corpus keyed on the input CLASSES that have
historically broken a claim — NaN, the infinities, the empty string, the empty
array, the empty range, the empty format, the JSON null — with a boring
baseline first, because a capped signature varies one argument at a time and
needs the rest valid for anything to evaluate at all. Polymorphic parameters
are instantiated as a FAMILY so a signature does not spend its combinations on
calls PostgreSQL rejects for type mismatch. Calls are `pg_catalog.`-qualified:
`position`, `overlay`, `current_user` and `session_user` are GRAMMAR, and six
signatures raised on every combination until the qualifier went on.

**Each table is asked its OWN claim**, because they are three different claims
and one assertion would be wrong for two of them: `ALWAYS_NOT_NULL_BUILTINS`
is probed with NULL arguments too (`concat(NULL)` is `''`, which is the
point), `FIRST_ARG_BUILTINS` with a non-null first argument and NULL for the
rest, `STRICT_TOTAL_BUILTINS` with non-null arguments throughout.

**A raise is not a finding** — that is the tables' own admission criterion —
which makes silent non-coverage the failure mode to guard, and three
assertions do: every parameter type must have a value generator, every
signature must have at least one combination that actually evaluated, and the
exemptions from that are named with reasons and asserted from both sides. Two
exist: `aclitem[] + aclitem` and `aclitem[] - aclitem`, still DECLARED by
PostgreSQL with their implementations removed, so they raise for every input
forever. **The harness carries its own positive control** — the ten
expressions three sweeps removed must STILL come back NULL, asserted first,
because every other assertion here is a negative and a negative is worth only
what the harness can detect.

### The three findings, and why two were kept

| name | the overload that breaks the claim | outcome |
|---|---|---|
| `random` | PG17 added `random(min, max)` for integer/bigint/numeric, and they are STRICT — `random(NULL, NULL)` is NULL while the table claims "never NULL whatever the arguments" | **removed.** Its falsifying input is ordinary integers, so the exotic-input argument does not apply. Cost: `random()` reads nullable |
| `+` | `path + path` is NULL whenever EITHER operand is a CLOSED path (`path + point` is total, open + open is a value) | **kept**, recorded in `PARTIAL_OVERLOADS` |
| `\|\|` | array concatenation ABSORBS a NULL operand — `ARRAY[1,2] \|\| NULL` is `{1,2}` — so it is not STRICT, while `'a' \|\| NULL::text` IS NULL | **kept**, recorded in `NON_STRICT_OVERLOADS` |

The two that were kept follow the register's FOREIGN-KEY-TRUST precedent
rather than the `lower`/`upper` one: the falsifying input needs a `path`-typed
column, and removing the name costs the general case — `id + 1` on a NOT NULL
integer would read nullable. Removing `||` was not merely weighed but TRIED,
and measured worse in the direction that matters: the generated corpus
immediately admitted three bindings PostgreSQL rejects (`INSERT INTO tags
(name) VALUES (COALESCE($1, $2 || $3))` with all three NULL), because
mechanism C needs the strict TEXT meaning to predict a real rejection.
Under-reporting strictness makes the emitted types lie about a binding that
fails; over-reporting only makes a parameter read non-nullable where NULL
would have been accepted. Both records are asserted from BOTH sides, so
neither can outlive the defect it excuses, and
`docs/type-aware-overloads.md` now carries all three as its worked test
cases — a refactor that cannot recover these two is not worth its cost.

**One curated table became two.** `TOTAL_STRICT_OPERATORS` required members to
be total AND strict, with the file's own warning that "an operator with only
one must not be added — it would be sound for one consumer and wrong for the
other". Execution found one member failing each half, in opposite directions,
so the warning had come true twice and the shared set was what made it
possible. It is now `TOTAL_OPERATORS` and `STRICT_OPERATORS`; all four use
sites already documented which property they wanted.

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
| Catalog-feature census — item 1 | `tests/unit/query/catalog-census.test.ts` (`CATALOG_CENSUS_REPORT=1` for the gap list) |
| Curated tables vs pg_catalog — item 2 | `tests/unit/query/curated-tables.test.ts` |
| Totality probed by execution — item 3 | `tests/unit/query/totality-probe.test.ts` |
| Curated tables | `src/query/nullability-walk.ts` (seven), `src/query/operators.ts` |
| Fixture schema | `tests/unit/query/fixtures/schema.sql` |
| Seed-data generators | `tests/unit/query/fixture-data/` |
| Fixture suite design + measurements | `docs/witness-coverage.md` |
| Engine + adapter | `src/query/nullability-walk.ts`, `src/query/catalog-adapter.ts` |
| Snapshot (where a new catalog fact lands) | `src/catalog/snapshot.ts`, `src/catalog/types.ts` |
| Open engine work, and this item's siblings | `docs/deferred-tasks.md` |

Run from `pgsid/` with `npx vitest run`; installs use `pnpm`.
