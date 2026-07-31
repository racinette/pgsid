# Deferred tasks — nullability engine

## What this document is

A register of work on the output-nullability engine that is understood but not
done, so that picking any item up does not require rediscovering why it exists.
Read `docs/nullability-walk.md` for how the engine works.

Each item records what it is, why it is not done, and — where one exists — the
condition that should trigger doing it.

One area is documented elsewhere and not repeated here: how the fixture suite
is made to verify what it claims to verify is in `docs/witness-coverage.md`.

---

## What to do next

The engine's output analysis is verified as far as hand-written fixtures can
take it. Every fixture returns rows or declares the error it raises instead, and
every `notNull` claim is either falsifiable against returned rows or guarded by
a refusal the suite checks — nothing is verified by nothing, and that is held at
zero. The measurements are in `docs/witness-coverage.md`.

What is left is not more assertions about the queries somebody wrote. It is
finding the defects nobody thought to look for, and then a consumer.

1. **Generated queries** ("Unbuilt verification strategies"), specified in
   `docs/query-generator-handoff.md`. The only remaining way to learn something
   new about the output analysis.
2. **Whatever it finds.** Each counterexample becomes a permanent fixture with
   annotations, and an engine fix. This is the point of the generator, not an
   afterthought to it.
3. **The differential oracle** (the other half of that same entry), if
   generation stops producing findings.
4. **Argument typing** — deliberately parked. It is input-side work, and the
   output side comes first.
5. **The arity gate** — small, and waits for the first consumer to exist rather
   than being retrofitted.

---

## 1. Argument typing

**What.** Query parameters (`$1`, `$2`) are reported unconditionally nullable.
The engine has no notion of a parameter's type, nor of whether a caller may
pass NULL for it.

**Why it matters.** Everything the engine does today concerns *output* columns.
Parameters are the input contract, and a consumer generating typed bindings
needs both halves. `PREPARE` already yields parameter types, so the open
question is narrower than it first appears: what, if anything, can be inferred
about a parameter's *nullability* from its use — and is that inference worth
making, given a caller can generally pass NULL wherever the type allows it.

**State.** Parked deliberately, not merely unstarted. The prerequisite is met —
the `-- @args [...]` bindings described in `docs/witness-coverage.md` make the
parameterized fixtures executable under real argument values — but only three
fixtures contain a query-level `ParamRef` at all
(`extreme-parameterized-queries`, `extreme-params-everywhere`,
`extreme-params-in-values`), so the feature would be built against very little
coverage.

**Trigger.** Finish the output side first; see "What to do next". After that,
widening the corpus of parameterized fixtures is what would make this worth more
than it is today.

---

## 2. Arity gate at the consumer boundary

**What.** Nullability is a positional array meant to be zipped against
PostgreSQL's `RowDescription` — the contract is documented on
`OutputNullability` in `src/query/types.ts`. Nothing enforces that the two
lists agree in length before they are zipped.

**Why it matters.** A length mismatch misassigns every flag past the point of
divergence, and does so while looking authoritative. The check is a single
comparison, and the consumer necessarily holds both lists: it runs `PREPARE`
for types anyway. On mismatch the safe response is to treat every column as
nullable and report loudly.

**State.** Not written, because there is no consumer: nothing under `src/`
calls `inferNullability` yet. The engine cannot self-verify — it has no
PostgreSQL.

**Trigger.** Write it together with the first consumer, not retrofitted
afterwards.

---

## 3. Known imprecisions in the walk

Each of these is *sound* — the engine reports nullable where a value is
provably non-null. They cost precision, never correctness, and are listed so
that a decision to close one is deliberate.

| Construct | Current | Note |
|---|---|---|
| `OR` in `WHERE` | no promotion at all | disjunctions are skipped entirely by the promotion analysis |
| Ordered-set aggregates (`percentile_cont`, `mode`) | nullable | the `WITHIN GROUP` argument is not visible to the argument check |
| `A_Indirection` (array subscript, field access) | nullable | an out-of-range subscript really is NULL and the index is not checkable statically |
| `XmlSerialize`, and the JSON constructor/query family | nullable | several are constructors that never return NULL; see the `conservative` entries in `node-census.test.ts` for which |
| Non-strict scalar and `LANGUAGE plpgsql` functions | nullable | bodies are not statically analysable; the NOT NULL domain return is the escape hatch |
| `pg_catalog` built-ins outside the curated tables | nullable | add to `STRICT_TOTAL_BUILTINS` / `ALWAYS_NOT_NULL_BUILTINS` as needed, but only where the function is *total*, not merely strict |
| Branch guards | pattern-matched, not solved | `CASE WHEN length(col) > 0 THEN col …` stays nullable: the condition's truth does imply non-nullness, but the guard analyser recognises only specific shapes |

---

## 4. Unbuilt verification strategies

Two of the five strategies proposed for finding engine defects are unbuilt.
They find different classes, so neither subsumes the other.

**Differential oracle.** `postgres-language-server` (Rust) and `sqlc` are both
checked out in this workspace and perform overlapping analysis. Running the
same fixtures through another implementation costs no authoring effort, and any
disagreement is a candidate bug in one of them. It cannot find defects the two
implementations share, which is why it supplements rather than replaces the
census and the executable suites.

**Generated queries.** Construct queries mechanically over the fixture schema
and check them against PostgreSQL. Best at combinations nobody would write by
hand — nested outer joins under grouping sets under set operations. Specified in
`docs/query-generator-handoff.md`, which covers the pipeline, the two oracles
and their differing strength, and what a finished system reports.

---

## Decided against — do not re-open without new information

**Reproducing PostgreSQL's column-naming rules (`FigureColname`).** PostgreSQL
labels an un-aliased output column by a set of rules in
`src/backend/parser/parse_target.c` — `count(*)` becomes `count`, `1+1` becomes
`?column?`, `p.price::text` becomes `price`, and the rules carry precedence, so
a nested strong name overrides a weak default. The engine implements almost none
of this and reports an empty name for such expressions.

It should stay that way. Names are not the contract and cannot be: they are not
unique — `SELECT a.id, b.id` yields two columns called `id` — so a consumer must
join nullability to columns by position. That consumer also runs `PREPARE` for
types, and `RowDescription` hands it the authoritative names for free. Porting
the rules would mean maintaining a version-drifting reimplementation of
PostgreSQL internals to produce something the consumer already has.

What the engine's best-effort names *are* good for is catching a wrong column
list in the tests. The soundness suite compares the full ordered name list
against PostgreSQL's for every fixture, which catches a misordering that a
column *count* would not — PostgreSQL emits a `USING` join's merged column
first, not in its left-hand position. If an un-aliased expression ever makes
that comparison fail, the cheap fix is usually to alias it in the fixture; the
failure message names the exact rule that would be needed if not.

**Mutating existing queries as a way to generate new ones.** Considered as an
alternative to constructing queries and rejected. Transformations beyond blind
wrapping need the same scope and type knowledge that construction needs, so
mutation buys no validity for free — and it is bounded by the shapes the corpus
already contains, which is the opposite of what a generator is for. See
`docs/query-generator-handoff.md`.

**A diagnostics channel for ambiguous references.** An unqualified name
matching several visible columns resolves to nullable, with the candidates
recorded in the trace. A dedicated reporting channel was considered and
rejected: PostgreSQL rejects such queries at parse-analysis time, so any
consumer running `PREPARE` receives a precise error from PostgreSQL itself,
which is better than anything the walk would emit.

**Name-based joining of nullability to `RowDescription`.** Considered as an
alternative to positional joining and rejected. Column names are not unique —
`SELECT a.id, b.id` yields two columns named `id` — so a name join cannot
distinguish them and must either pick one (wrong) or degrade both to nullable
(lossy, on ordinary queries). Position disambiguates exactly what names cannot.
See "Arity gate at the consumer boundary" for the guard that makes positional
joining safe.
