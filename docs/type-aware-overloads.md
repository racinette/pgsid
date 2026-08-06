# Type-aware overload narrowing — handoff

## Charter

`lower(email)` reads nullable, on a `NOT NULL` text column, for the most
trivial function in SQL. That is the state this document exists to end.

It is not a precision statistic. The contract's whole value is that
`notNull` means something; a consumer who meets the simplest possible case
coming back nullable stops trusting the flags and adds checks everywhere.
The engine is *sound* there and unusable-feeling, which is the worst pair.

Two coupled efforts, and they are coupled because neither pays off alone:

1. **The engine becomes type-aware** — it keeps the types it already knows
   for free and uses them to NARROW a call's candidate overloads before the
   existing consensus rule runs.
2. **A function-nullability test suite** — per-overload witnesses for
   built-in functions, aggregates and window functions, which is the
   evidence base the narrowing consumes and the thing that keeps the
   curated claims honest.

Read `docs/nullability-walk.md` for the walk, in particular priority 6b and
the overload-consensus rule this extends. Read `docs/generated-surface.md`
for the sibling item (the suite's blind spots) — the two are independent but
share the "hand-curated table" diagnosis.

## Why now — the measurement

A curated-table audit (2026-08-05) found `lower`/`upper` claiming totality
while `lower('empty'::int4range)` returns NULL. Both names left
`STRICT_TOTAL_BUILTINS`, which is sound and cost the text meaning its
precision. That is the immediate trigger; the structural reason is worse.

**A name is not a function.** `pg_catalog` holds 3226 implementations under
2726 names, 223 of them overloaded. Of the 137 curated names, **55 are
backed by more than one C implementation** — those entries are claims about
**153 distinct functions**, verified against however many the author had in
mind. Operators are worse: `TOTAL_STRICT_OPERATORS` is 22 names over **558
implementations**, and **21 of 21** are overloaded.

So the tables record a claim against a key coarser than the claim's
subject, with no quantifier. The engine already has the correct pattern one
file over: `builtinStrictFunctions` is `bool_and(proisstrict)` — a
name-level claim that holds only when EVERY overload has the property. The
curated tables collapse with "the author looked at one."

Two distinct failure modes follow, and conflating them is why this recurred
in three consecutive sweeps:

| mode | instances | what fixes it |
|---|---|---|
| **key mismatch** — the name spans overloads the claim never covered | `substring`, `lower`, `upper`, `+`, `\|\|`, `random` | this document |
| **under-verified entry** — the claim was checked against too narrow an input class | `array_position`, `extract`/`date_part`, `to_number`, `to_char`, `scale`/`min_scale` | the witness corpus below |

### The three that made the case (2026-08-06)

The execution probe of `docs/generated-surface.md` item 3 found three more
key mismatches in one run, and two of them are now **kept as recorded holes
rather than removed** — which is what makes them this document's motivating
test cases rather than more of its evidence. They are the first entries whose
removal was measured to cost more than the defect, so they will still be
wrong when this refactor starts, and getting them right is how it should be
judged.

| name | the overload that breaks the claim | why removal was refused | recorded in |
|---|---|---|---|
| `+` | `path + path` is NULL whenever EITHER operand is a CLOSED path (`path + point` is total; open + open is a value) | the falsifying input needs a `path`-typed column, which essentially no application schema has, while removing the name makes `id + 1` on a NOT NULL integer read nullable — the general case | `PARTIAL_OVERLOADS` in `src/query/operators.ts` |
| `\|\|` | array concatenation ABSORBS a NULL operand: `ARRAY[1,2] \|\| NULL` is `{1,2}`, while `'a' \|\| NULL::text` IS NULL | removal was tried and is worse in the direction that matters — the corpus immediately admitted three bindings PostgreSQL rejects, because mechanism C needs the strict TEXT meaning to predict a real rejection | `NON_STRICT_OVERLOADS` in `src/query/operators.ts` |
| `random` | PG17's `random(min, max)` overloads are STRICT, so `random(NULL, NULL)` is NULL while `ALWAYS_NOT_NULL_BUILTINS` claims "never NULL whatever the arguments" | **not refused — removed.** Its falsifying input is ordinary integers, so unlike the two above the exotic-input argument does not apply, and the cost is only `random()` | removed from the table |

The contrast between the first two rows and the third is the rule this
document should encode: **the exotic-operand argument is what makes a hole
tolerable, and narrowing is what makes it unnecessary.** `+` resolved by
operand type keeps `id + 1` AND refuses `path + path`; `||` resolved by
operand type predicts the text rejection AND stops over-reporting the array
one. Both are two-candidate discriminations on concrete, non-polymorphic
operand types — the easiest case the elimination rule has — so if the
refactor cannot recover these two, it is not worth its cost.

`totality-probe.test.ts` asserts both records from BOTH sides, so neither can
outlive the defect it excuses: the probe must still reproduce the NULL, and
any OTHER overload of the same name returning NULL fails immediately rather
than hiding behind the note.

## The design: narrow, do not resolve

PostgreSQL's function resolution is roughly: (1) gather candidates by name
and arity; (2) discard candidates the arguments cannot be *implicitly*
coerced to; (3) if one remains, done; (4–8) tiebreak by exact matches,
preferred types and category rules; else fail as ambiguous.

**We implement step 2 and stop.** Everything after it only ever REMOVES
more candidates, so the set surviving step 2 is a SUPERSET of PostgreSQL's
answer — and consensus over a superset is sound. We never need to know
which candidate wins, only that the ones we dropped were impossible.

This is the same move the walk already makes with arity, and it inherits
the same soundness argument.

### The governing invariant

> **Eliminate a candidate only on certainty. Anything unrecognised keeps
> the candidate.**

A false elimination is UNSOUND. A false retention is merely imprecise. That
asymmetry is what makes an incomplete coercion model safe to ship: every
type family nobody has studied degrades to today's behaviour rather than to
a wrong answer. It is the rule to check any future change against.

### Where types come from — a closed list

Read from the catalog, never inferred:

- a **column reference** — `resolveColumnTypeName`, already used by the
  `unnest` element resolver;
- a **cast** — the target type as written;
- a **function call** — its return type, by consensus across candidates.

Explicitly NOT available, and each degrades to "no type, eliminate
nothing": operator results, `CASE`/`COALESCE` common types, unknown-typed
literals, and the result of an implicit coercion.

### The elimination rule

Drop candidate C at argument position *i* with known type T and parameter
type P iff none of these hold:

1. T and P are identical;
2. P is **polymorphic** and admits T — a predicate, not a lookup:
   `anyrange` admits `typtype='r'`, `anyarray` admits arrays, `anyelement`
   admits anything, and the `anycompatible*` family admits anything (its
   cross-argument unification is out of scope, so it never eliminates);
3. T is a **domain** whose base satisfies this rule — normalise first;
4. T and P are both **arrays** and their element types satisfy this rule;
5. `pg_cast` holds a direct row T→P with `castcontext = 'i'`.

Plus: **T is `unknown` eliminates nothing.**

Two properties measured and worth knowing:

- **IMPLICIT only.** Function arguments do not use assignment casts.
  `bigint → integer` is assignment, `bigint → numeric` is implicit.
- **No transitivity.** PostgreSQL does not chain casts, so this is a direct
  lookup, not a reachability search. `bool → int4` exists (explicit),
  `bool → numeric` does not, and `f(bigint)` REJECTS `true` (measured).

`pg_cast` is small: **117 implicit** rows, 77 assignment, 41 explicit.

### Worked examples, all measured

```
lower(t)   t is text        (text) identity; (anyrange)/(anymultirange) admit no text
                            -> one candidate, total          -> notNull   RECOVERED
lower(r)   r is int4range   (anyrange) admits it; (text) has no cast from a range
                            -> one candidate, not total      -> nullable  CORRECT

f(int,int) / f(numeric,numeric)  called with bigint
   bigint->int is ASSIGNMENT (dropped); bigint->numeric is implicit
   -> one survivor. PostgreSQL agrees. No tiebreak needed.

g(bigint) / g(double precision)  called with int
   both implicit -> BOTH SURVIVE. PostgreSQL picks float8 by preferred type.
   -> we do not tiebreak; consensus over both. Both total -> notNull.
      They disagree -> nullable. Sound either way.
```

The last line is the cost, stated: where survivors disagree on totality we
lose a claim the tiebreak would have kept. Numeric-tower overloads almost
always agree, so it is cheap in practice.

## Non-goals

- **No type inference.** The closed list above is the whole source of
  types.
- **No tiebreak algorithm.** Rules 4–8 read `typispreferred` (8 types) and
  `typcategory` (15 categories); `round(1)` resolves to `double precision`
  and no cast table will tell you that. Implementing it is a different
  project with a much worse risk profile.
- **No polymorphic RETURN types.** `lower(anyrange)` returns `anyelement`,
  whose real type is unification. A polymorphic call therefore yields no
  type to thread onward, and that degradation is expected.
- **Types never leave the engine.** They are a narrowing aid. The consumer
  gets types from `PREPARE`, which stays authoritative — if we ever
  disagree with it, it wins.

## What must change

1. **Snapshot** — `pg_cast` (implicit rows), and whatever `pg_type` needs
   for the polymorphic predicate (`typtype`, element type of arrays).
   ENVIRONMENT facts, like `builtinStrictFunctions`: a property of the
   PostgreSQL version, absent from the diff.
2. **Catalog adapter** — a coercibility accessor implementing the five
   clauses, plus the array/domain normalisation.
3. **The walk** — thread the known argument types into candidate
   selection; narrow; leave consensus untouched. This touches the hottest
   path, so the corpus dry-run discipline the fix phases used applies.
4. **The tables, re-keyed to SIGNATURES.** This is the real cost:
   `STRICT_TOTAL_BUILTINS`, `ALWAYS_NOT_NULL_BUILTINS` and
   `FIRST_ARG_BUILTINS` go from 137 name entries to **235 signature
   entries**, each needing its own verdict rather than inheriting one.
   `TOTAL_STRICT_OPERATORS` likewise, against `pg_operator`'s operand
   types.
5. **User function overloads come free** — the same arity-then-consensus
   path serves them, so `over_fn`, `clean2`, `tag_of` and `ship` improve
   with no extra code, and want the same fixtures.

## The witness corpus

Per-overload evidence, in the fixture suite's shape.

```
tests/unit/functions/<function-name>/
    schema.sql          optional, only where a witness needs data
    <slug>.sql          one per overload
```

The filename is a human slug; the authoritative key is a directive inside,
validated against `pg_proc` to resolve to exactly ONE function — so a
removed or re-typed overload fails loudly on a PostgreSQL upgrade instead
of silently testing nothing.

```sql
-- @signature anyrange
-- @null   lower('empty'::int4range)   the refutation
-- @value  lower(int4range(1, 5))      the control: same overload, ordinary input
```

**Polarity.** A witness is a POSITIVE, checkable claim: *this overload can
return NULL*. Absence of a witness asserts nothing — the engine's default
is already conservative nullable, so it costs nothing. We never infer
totality from a missing file.

**The control line is required.** It stops a fixture passing for a boring
reason (malformed expression, wrong overload resolved) and shows the reader
where the boundary is. It is also the "normal inputs" half: a corpus of
only extremes tests only extremes.

**Three witness constructions, because there are three totality
questions** — and the corpus will quietly cover only the first unless this
is stated: a scalar function's NULL comes from its inputs; an aggregate's
from empty input (needs a FROM, hence `schema.sql`); a window function's
from an empty frame.

**What the suite asserts:**

1. every `@signature` resolves to exactly one `pg_proc` entry;
2. the witness returns NULL;
3. the control returns a value — a witness that stops witnessing is a
   FAILURE, not a pass (the query suite's liveness bar);
4. no signature with a witness appears in a totality table, unless it
   carries a recorded reason;
5. a coverage report: signatures witnessed, curated signatures with no
   evidence either way.

**Cost.** Most witnesses are pure expressions and share one PGlite;
only directories declaring a `schema.sql` get their own. State-major, as
`docs/witness-coverage.md` describes, for the reason `AGENTS.md` rule 6
gives.

**Discovery.** An adversarial probe — calling each curated signature across
the input classes that have historically broken them (NaN, ±infinity, empty
string, no-match, empty array, empty format, empty range) — is a TOOL run
occasionally, like a sweep, not a standing test. Its output is candidate
witnesses a human reviews into fixtures. Measured: that corpus re-finds
every historical failure, all seven. Because the durable artifact is the
fixture, the probe's value generator never has to be complete.

## Boundaries — do not re-derive these

- **Totality is not in the catalog.** `proisstrict` is STRICTNESS — "NULL
  in gives NULL out" — and 2549 of 2726 builtin names have it, so it is no
  proxy. Totality lives only in the implementations.
- **Static analysis of PostgreSQL's C source is a measured dead end.** It
  was built and discarded (2026-08-05). A scan for `PG_RETURN_NULL` in an
  entry point gave **2 false negatives in 8** on a hand-picked sample —
  the unsound direction — because thin wrappers delegate to `_common`
  helpers. Beyond detection there are three other NULL routes in the same
  tree (24 `isnull` assignments, 346 `DirectFunctionCall` sites whose
  callee's flag propagates, 85 SRF/tuplestore sites), and beyond THAT the
  real barrier is reachability: `mod`'s `PG_RETURN_NULL` follows an
  `ereport(ERROR)` and is dead, `concat`'s is live but only under the
  VARIADIC protocol. Separating those needs a PostgreSQL-aware
  interprocedural analyzer. It also needs the source tree, which the
  package does not and will not ship. Runtime gives everything the scan
  gave that was reliable.
- **An incomplete coercion model is safe**, by the governing invariant. Do
  not gate the work on covering every type family.
- **Unknown literals eliminate nothing**, so `lower('abc')` stays nullable
  while `lower(text_column)` becomes notNull. A deliberate, recorded
  asymmetry, not an oversight.

## Open questions

- **Type families not yet measured for the elimination rule**: composite
  and enum arguments, multirange, ranges over domains. Each degrades safely
  today; measure before claiming coverage.
- **The 235 verdicts** — who makes them, in what order, and against what
  evidence. The witness corpus is what makes them reviewable; the honest
  path is probably "the curated set first, everything else stays out of the
  tables".
- **Whether the corpus extends past the curated set.** Witnesses for names
  nobody claims total are free evidence for later, and dead weight now.

## Where things are

| | |
|---|---|
| The walk, priority 6b and the consensus rule | `src/query/nullability-walk.ts` |
| Curated tables | `nullability-walk.ts` (three), `src/query/operators.ts` |
| Candidate selection, arity filter | `src/query/catalog-adapter.ts` |
| Column/cast type accessors already in place | `resolveColumnTypeName`, `resolveColumnTypeOid` |
| Snapshot, where `pg_cast` would land | `src/catalog/snapshot.ts`, `src/catalog/types.ts` |
| Fixture suite design and its discipline | `docs/witness-coverage.md` |
| Suite blind spots, the sibling item | `docs/generated-surface.md` |
| The audit that triggered this, and its limits | `docs/deferred-tasks.md` section 2 |
| The `lower`/`upper` falsification, pinned | `tests/unit/query/fixtures/builtin-range-lower-upper.sql` |

Run from `pgsid/` with `npx vitest run`; installs use `pnpm`.
