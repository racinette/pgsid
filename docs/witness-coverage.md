# Witness coverage for the nullability fixture suite

## What this document is

How the executable fixture suite is made to verify what it claims to verify,
and what it currently measures. Read `docs/nullability-walk.md` first for how
the engine itself works; this document is only about the tests around it.

## Why coverage is the thing to measure

`tests/unit/query/nullability-soundness.test.ts` executes every fixture against
PGlite and checks that no column the engine calls `notNull` ever comes back
NULL. That check is only meaningful when the query actually returns rows: a
statement that returns nothing cannot contradict anything, so unless something
else stands behind them its `notNull` claims are checked by nothing at all. (The
one thing that can stand behind them is PostgreSQL refusing to run the statement
— see "How a fixture is executed".)

The mirror-image question applies to the other flag. A `nullable` claim is
*witnessed* when some execution yields a genuine NULL in that column.
Unwitnessed means one of two things, and they need separating: the column truly
can never be NULL (imprecision in the engine — sound, but a lost guarantee for a
consumer), or the data is too weak to show that it can (a hole in the suite).

Both numbers are reported on every run, and both are held by a bar — see
"The two bars" below.

## How a fixture is executed

Each fixture is run under the cross product of **data states** and **argument
bindings**, and five things are asserted:

| | |
|---|---|
| Validity | PostgreSQL accepts the statement (`PREPARE`) |
| Shape | the engine's output column list equals PostgreSQL's, in order |
| Soundness | no `notNull` column is ever NULL, under *every* state and binding |
| Liveness | the fixture returns at least one row somewhere, or declares the error it raises instead |
| Coverage | one suite-wide test: every nullable claim witnessed, or its unwitnessability recorded with `@unwitnessable` |

Soundness must hold for every binding: a claim contradicted by any argument set
is a bug. Witnesses, by contrast, accumulate — any state or binding that
produces a NULL witnesses that column.

A statement that raises is not a counterexample. It returned no rows, so "never
NULL" still holds for every row it did return; errors are recorded for
diagnostics and otherwise skipped.

The exception is a fixture that can *only* raise. `SELECT CAST(NULL AS nn_text)
FROM products` does not return NULL — PostgreSQL refuses, because the domain
forbids it, and that refusal is exactly what the column's `notNull` claim says.
Such a fixture declares both why it returns nothing and the error it must raise:

```sql
-- @no-rows: CAST(NULL AS nn_text) raises the domain's NOT NULL violation for
-- every row evaluated, which is the behaviour the @notNull claims assert.
-- @raises: domain nn_text does not allow null values
```

Both are required together, and both are checked: the fixture must return no
rows, must actually raise somewhere, and every error it raises must match the
declared text. Returning nothing is not evidence on its own — a false `WHERE`
does that too — so without the refusal the marker would exempt a fixture that
asserts nothing. Matching the text is what keeps an unrelated failure, a
renamed column or a missing table, from being accepted as the expected one.

Execution is arranged state-major: one PGlite instance per data state, loaded
once, with each fixture's own writes rolled back around it. Applying a state per
fixture instead would churn the same rows through WASM linear memory hundreds of
times, which rule 6 in the workspace `AGENTS.md` is about — a long-lived PGlite
instance never returns pages, and `ROLLBACK` reclaims nothing.

## Data states

Two kinds, in `tests/unit/query/fixtures/data/` and in the generator. They
answer different questions and neither subsumes the other.

### Hand-written: `empty`, `sparse`, `dense`, `uniform`

Standalone SQL files, reviewable on their own. Each row in them exists to
construct a structural situation that random generation does not reliably
reach — NULLs come from structure, and structure is built rather than stumbled
into:

- a customer with a NULL `name` *and* a non-NULL `deleted_at`, which is what
  makes `case-path-sensitive.sql`'s `AND`-negation trap actually fire;
- a tag with no matching product, which is what triggers
  `WHEN NOT MATCHED BY SOURCE` in `merge-returning.sql`;
- exactly seven reviews on every product, without which the set-operation cases
  in `scalar-subquery-zero-row-guards.sql` raise instead of returning a row;
- a product whose sku is the sentinel a `NULLIF` compares against, which is the
  only way a `NULLIF` yields NULL.

Explicit ids in these files stay below 1000. The identity columns in
`schema.sql` start there, so a fixture that inserts without naming a key never
collides with a row a data state wrote.

### Generated

Derived from the catalog snapshot, so the schema is the single input: a table or
column added to `fixtures/schema.sql` is populated automatically and cannot
silently go unseeded.

**Two tiers of generator**, in `fixture-data/generators.ts`, resolved
most-specific-first. A type entry has to satisfy every CHECK its type carries,
which is why a domain gets its own entry rather than inheriting its base type's.
A column entry exists when a value must fall inside a *query's* vocabulary
rather than merely its type's — `orders.status` has to sometimes be
`'fulfilled'` because fixtures filter on it.

Full resolution order for a column:

```
column-specific → foreign key → surrogate key → its own type name
  (which is the domain name for a domain column) → the domain's base type
```

The snapshot is taken with an empty `search_path`, so a type outside
`pg_catalog` arrives schema-qualified. The type tier is therefore keyed by the
schema that *owns the type* rather than the one that owns the table: two schemas
may each declare a `pct` domain, and they are not the same type. Built-ins come
through unqualified and resolve under the table's schema.

**No match is an error, not a default.** A column whose type has no generator
fails loudly, so adding one forces a decision — the same discipline
`node-census.test.ts` applies to AST node types. So does the reverse: a registry
entry naming a column or table that does not exist is an error too, since a
misspelled column would otherwise fall through to the type tier and read as
configured while doing nothing.

**The tiers compose, they do not merely override.** A column generator receives
the type tier as a callback and decides whether to use it:

```ts
name: (rand, ctx) => (rand.chance(0.25) ? "x" : ctx.ofType()),
```

A quarter of `customers.name` is the literal several fixtures compare against;
the rest is whatever a `text` column looks like, without restating it. The
callback resolves on call, so a column that never delegates does not need its
type to have a generator at all.

**What the framework owns**, rather than the individual generators:

- **NULL injection.** The catalog says which columns are nullable; a nullable
  column gets NULL according to its own NULL policy, and the generator is called
  only once non-NULL is decided. Generators therefore never return NULL. The
  policy is per column (resolved column → type → default) because how often a
  column is NULL is what produces witnesses: `products.deleted_at` wants NULL in
  most rows so that a soft-delete filter has live rows to keep, and `u.status`
  wants NULL rarely so that rows survive to reach a comparison. A single figure
  for the whole dataset can only be a compromise between the two.
- **Foreign keys.** A FK column draws from the referenced column's already
  generated values, so referential integrity is a property of the framework.
- **Surrogate keys.** A single-column integer primary key is numbered 1..N.
- **Uniqueness.** Rows repeating an earlier row's PK or unique key are dropped.
- **Which columns are filled at all** — see below.

**Column policy.** A `GENERATED ALWAYS AS` column and an `ALWAYS` identity are
omitted from the INSERT: PostgreSQL computes the first and rejects an explicit
value for the second. Nothing can draw a foreign key from either, since their
values do not exist until the INSERT runs.

Everything else is filled explicitly, *including* columns that have a DEFAULT and
`BY DEFAULT` identity columns. A default is what a column takes when nothing is
said about it, and this generator's job is to say something about every column: a
default would silently override the NULL a null policy chose, which is the one
decision that produces witnesses. `BY DEFAULT` identities are filled for a
different reason — a foreign key has to draw from keys that are already known,
and an identity's values are not known until PostgreSQL assigns them.

Generation is on demand and depth-first: asking for another table's values
generates that table first, so declared foreign keys and hand-written
cross-table generators both get a valid emission order for free. A cycle between
two tables is an error. A self-reference is not, and resolves against the rows
generated so far — `categories.parent_id` references an earlier id, or nothing.

`t`, `u` and `v` declare no keys and no foreign keys, but the fixtures join them
as though they did (`ON u.t_id = t.id`). The join predicate is what makes the
reference real, so `u.t_id` draws from `t.id` — and a quarter of its rows dangle
on purpose, because with every reference resolving, an outer join is an inner
join and its NULL-extended columns are never observed.

**Determinism** comes from seeding each value stream by the identity of what it
fills: `hash(schema.table.column) ⊕ FUZZ_SEED` for values,
`hash(schema.table) ⊕ FUZZ_SEED` for row counts, and a separate derived stream
per column for the NULL decision. Adding a column perturbs only that column;
adding a table perturbs nothing else; retuning one column's NULL policy leaves
every other column's data byte-identical, and leaves that column's non-NULL
values unchanged as well. The exception is FK columns, whose values follow their
target's.

Identity here means *names*. Nothing in generation reads a PostgreSQL OID —
tables, columns, types and domains are addressed by name throughout, including
in the seeds — so recreating the schema, which reassigns every OID, produces a
byte-identical dataset. `fixture-data.test.ts` asserts exactly that against a
second database built from the same DDL.

`FUZZ_SEED` is fixed by default and overridable by the environment variable of
the same name. A varying seed by default would let coverage drift between runs,
so the suite could weaken on an unlucky draw without failing. Under an
overridden seed the witness invariant is reported but not enforced, since
witnessing is measured against the default seed's data; liveness is still
enforced, because no seed may leave a fixture returning nothing.

`DUMP_GENERATED_DATA=<path>` writes the generated SQL out for inspection.

## Argument bindings

Fixtures declare parameter values as JSON, one array per line, each line an
independent case:

```sql
-- @args ["a@b.c", 10, null]
-- @args [null, 0, "x"]
```

JSON gives unambiguous typing for free — `null` is not `"null"`, `10` is not
`"10"` — and needs no parser beyond `JSON.parse`. A fixture with no `@args` line
runs once with every parameter bound to NULL.

Arguments are substituted as literals rather than passed as protocol parameters.
PostgreSQL infers a parameter's type from its use, and several fixtures use one
where nothing constrains it (`SELECT $1 AS direct_param`), which is an error
before any value is considered. A literal carries the same unknown type a
fixture author means and resolves the same way.

A fixture that references `$n` beyond what `@args` supplies, or supplies more
than it references, is an error.

## The two bars

**Liveness is a hard failure.** A fixture that returns no rows under any state
and binding asserts nothing, and that should be impossible to add by accident.
The failure message names the states whose execution raised, which is usually
the explanation.

A fixture whose statement raises for *every* row it would produce declares that
with a reason:

```sql
-- @no-rows: NULL::nn_text raises for every row evaluated, which is exactly the
-- claim above. The statement either fails or has no rows to fail on.
```

The marker is checked both ways: a fixture that carries it and does return rows
fails too, so the exemption cannot go stale.

**Coverage is a per-claim invariant.** Every `nullable` claim must either be
witnessed, or carry a `-- @unwitnessable <column index>: <reason>` annotation
recording *why* no data can witness it — `CURRENT_SCHEMA` is NULL only when
the search path resolves to nothing, a `SETOF` row type erases the NOT NULL
constraints its columns actually have, and so on. The marker is checked both
ways, like `@no-rows`: an unwitnessed claim with no annotation fails, and an
annotation on a claim that *is* witnessed fails too, so a recorded reason is
always a current fact rather than a historical excuse. Claims inside
`@no-rows` fixtures are exempt wholesale — nothing a rowless statement claims
can be witnessed.

An aggregate ratchet (a baseline count that could only rise) held this before
and was replaced deliberately: a ratchet compares sums, so a witnessing
regression can hide behind an unrelated improvement, and its number conflated
engine imprecision with data reach. The invariant is exact at any corpus
size, and the annotations are the triage, kept where the claim lives. This is
still not a demand for 100% witnessing — an unwitnessable claim is fine — but
non-witnessing must be *explicit*, never incidental.

## Presence groups: the two-arm witness

A `@null-group` annotation (Wave 13) is a JOINT claim and gets a joint
oracle. Statically, the agreement suite holds compulsory bidirectional
coverage against `outputPresenceGroups`, discriminant sets compared exactly,
every member required to carry its per-column `@nullable`. Executably, the
soundness suite checks each engine-claimed group **per returned row**: the
discriminants must agree (all NULL or all non-NULL — a split row falsifies
the unit), and on the absent arm every member must be NULL. Both arms must
then have actually run: some row absent, some row present.

The absent arm's exemption is **derived, not declared**: that arm fires
exactly when a discriminant is NULL, so it is unwitnessable precisely when
every discriminant's own `@nullable` claim is — each already carrying its
`@unwitnessable N: reason`. The per-column staleness check removes those
the moment data witnesses a NULL, which re-arms the group assertion
automatically; the two annotation layers cannot drift. The present arm has
no exemption at all — a fixture that cannot reach it should not claim a
group.

## Current measurement

Across 266 fixtures and 5 data states, at the default seed:

| | count | |
|---|---|---|
| `notNull` claims | 773 | |
| — falsifiable | 763 (99%) | the query returns rows, so a NULL could contradict it |
| — guarded by a checked refusal | 10 | the statement raises, and the raise is asserted |
| — unverified | 0 | held at zero |
| `nullable` claims | 392 | |
| — witnessed | 329 (84%) | some state or binding produces a real NULL there |
| — unwitnessed, reason recorded | 63 | every one carries an `@unwitnessable` annotation |
| `@null-group` claims | 41 (35 fixtures) | every group's two arms observed or absent-arm-exempt by derivation |

The generated corpus carries the same group oracle annotation-free: 1490
engine-claimed groups over ~9k queries (post-widening — refilter wrappers,
union-full-var, dup-names, gm structures), all arms observed, zero per-row
falsifications, the GROUP_UNWITNESSABLE rule list empty. The two-arm bar
has now paid three times: 67 INTERSECT groups with uninhabitable absent
arms (the setop dead rule), the cross-unit presence-implication
imprecision (closed via unit chains the same session), and the
required-alternative gap in origin entailment (closed likewise).

Every fixture returns rows under some state and binding, except the two that
declare `@no-rows`.

## What remains unwitnessed

Every remaining claim's reason lives on its fixture as an `@unwitnessable`
annotation — `WITNESS_REPORT=1` prints the per-column list with those reasons
inline. They fall into four groups; annotations whose reason begins "data
gap:" mark the ones a richer data state could witness, and the staleness
check removes each annotation automatically the moment that happens.

**A row type carries no constraints (10 claims).** `SETOF <table>` and
`SETOF <composite>` results are nullable because NOT NULL constraints do not
travel with a row type. The functions behind them select NOT NULL columns, so
PostgreSQL never emits NULL there. Witnessing these would need a function whose
body actually produces NULL, which asserts something different from what the
fixtures are for. `from-item-kinds`, `table-function-return-types`,
`setof-composite-type`.

**Conservative by design (18 claims).** The value is provably non-null and the
engine reports nullable anyway. Each is a known imprecision registered in
the "Known imprecisions in the walk" entry in
`docs/deferred-tasks.md` — array subscripting, ordered-set
aggregates, population statistics, built-ins outside the curated tables,
multi-statement function bodies, JSON_TABLE columns, multi-candidate
operators — or `CURRENT_SCHEMA`,
which is unwitnessable by construction. These are the candidates for engine
work; closing one turns its claim into `notNull` rather than witnessing it
(the presence-consumption entry retired exactly that way — its fixture's
carrier now reads notNull and the annotation came off).

**The query's own shape rules out the NULL case (33 claims).** The largest
group, and the least interesting: the fixture selects away the rows that would
show the NULL. A `LEFT JOIN` whose `ON` is an equality on a NOT NULL foreign key
always matches. A `CROSS JOIN LATERAL` drops exactly the orders that would leave
the aggregate side of an earlier `LEFT JOIN` unmatched. A correlated subquery
keyed on a primary key always finds its row. `RETURNING` a column a literal was
just written into reports that literal. Two of `scalar-subquery-zero-row-guards`'
cases need a review count that its own set-operation cases forbid.
`presence-group-full`'s orders side never extends because `shipments.order_id`
is a NOT NULL foreign key — the annotations that also exempt its group's
absent arm by derivation. Changing any
of these means changing what the fixture asserts, which is a worse trade than
leaving the claim unwitnessed.

**Inside a `@no-rows` fixture (2 claims).** Nothing in a statement that never
returns a row can be witnessed.

## Where things are

| | |
|---|---|
| Engine | `src/query/nullability-walk.ts`, `src/query/catalog-adapter.ts` |
| Engine design | `docs/nullability-walk.md` |
| Fixtures + schema | `tests/unit/query/fixtures/` |
| Hand-written data states | `tests/unit/query/fixtures/data/` |
| Data generation | `tests/unit/query/fixture-data/` |
| Generation framework's own rules | `tests/unit/query/fixture-data.test.ts` |
| Fixture directives (`@args`, `@no-rows`) | `tests/unit/query/fixture-args.ts` |
| Unwitnessability annotations | `-- @unwitnessable N: reason` in each fixture; parsed in `fixture-args.ts` |
| Presence-group annotations | `-- @null-group N[*],M[*]` in each fixture; parsed in `fixture-args.ts`, agreement in `nullability-walk.test.ts`, per-row + two-arm oracle in `nullability-soundness.test.ts` |
| Presence-group pure-function edges | `tests/unit/query/presence-groups.test.ts` (star expansion, `UPDATE … FROM`, the floors) |
| Annotation-based suite | `tests/unit/query/nullability-walk.test.ts` |
| Executable suite (validity, shape, soundness, liveness, coverage) | `tests/unit/query/nullability-soundness.test.ts` |
| AST node coverage | `tests/unit/query/node-census.test.ts`, `grammar-sampler.ts` |
| Column order vs PostgreSQL | `tests/unit/query/column-sequence.test.ts` |
| Generating queries to extend this corpus | `docs/query-generator.md` |

Run the suite with `npx vitest run` from `pgsid/`.

Environment variables it honours:

| | |
|---|---|
| `FUZZ_SEED` | seed for generated data; the witness invariant is reported but not enforced when set |
| `WITNESS_REPORT=1` | list every unwitnessed claim with its recorded reason, and every claim guarded by a refusal |
| `DUMP_GENERATED_DATA=<path>` | write the generated SQL to a file |
