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

**State.** Not started. Three fixtures contain a query-level `ParamRef`
(`extreme-parameterized-queries`, `extreme-params-everywhere`,
`extreme-params-in-values`), so this would be built against little coverage.

**Trigger.** The `-- @args [...]` bindings described in
`docs/witness-coverage.md` make those three executable under real argument
values, which is the prerequisite. Widening the corpus of parameterized fixtures
first would make the feature worth more than it is today.

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

## 3. Column naming (`FigureColname`)

**What.** PostgreSQL labels an un-aliased output column by a set of rules in
`src/backend/parser/parse_target.c` — `count(*)` becomes `count`, `1+1` becomes
`?column?`, `p.price::text` becomes `price`. The engine implements almost none
of this and reports an empty name for such expressions.

**Why it is not done.** Measured across the fixture suite: **zero** name
mismatches against PostgreSQL, because fixtures alias their expressions and
`SELECT *` names come from relation resolution rather than expression naming.
A consumer should take names from `PREPARE`'s `RowDescription`, which is
authoritative and which it already consults for types. Porting the rules would
mean maintaining a version-drifting reimplementation of PostgreSQL internals
with no current consumer.

The rules also carry a subtlety worth knowing before attempting them: names
have *precedence*. `FigureColnameInternal` returns a strength (0/1/2) so a
nested strong name overrides a weak default — `CASE WHEN … ELSE p.name END` is
labelled `name`, not `case`, and `p.price::text` is `price` while `1::text` is
`text`.

**Trigger.** The shape assertion in `nullability-soundness.test.ts` compares
full ordered name lists against PostgreSQL, so it fails the moment a fixture
needs a rule, and its failure message names the exact rule required. Implement
rules one at a time as that test demands them, rather than porting the set
speculatively.

---

## 4. Corpus gaps in the node census

**What.** `node-census.test.ts` classifies every AST node type the corpus
reaches. 27 types are classified but never exercised by any fixture or by the
grammar sampler:

```
Alias, BitString, Boolean, CTECycleClause, CTESearchClause, CurrentOfExpr,
DefElem, Float, InferClause, JsonAggConstructor, JsonArgument, JsonArrayAgg,
JsonArrayQueryConstructor, JsonFormat, JsonObjectAgg, JsonOutput,
JsonParseExpr, JsonReturning, JsonSerializeExpr, JsonTablePathSpec,
OnConflictClause, ReturningClause, ReturningOption, ScalarArrayOp,
SetToDefault, TypeName, WithClause
```

**Why it matters.** These are not known bugs — they are *unmeasured*. Their
classification is an assertion nobody has tested. The census only checks
classifications for types the corpus actually produces.

**How to close it.** Extend `grammar-sampler.ts` with queries that produce each
one. The census will then either confirm the classification or fail, which is
the point.

---

## 5. Known imprecisions in the walk

Each of these is *sound* — the engine reports nullable where a value is
provably non-null. They cost precision, never correctness, and are listed so
that a decision to close one is deliberate.

| Construct | Current | Note |
|---|---|---|
| Recursive CTE columns derived from the recursive term | nullable | the self-reference is unresolvable during analysis |
| `OR` in `WHERE` | no promotion at all | disjunctions are skipped entirely by the promotion analysis |
| Ordered-set aggregates (`percentile_cont`, `mode`) | nullable | the `WITHIN GROUP` argument is not visible to the argument check |
| `A_Indirection` (array subscript, field access) | nullable | an out-of-range subscript really is NULL and the index is not checkable statically |
| `ScalarArrayOp` | nullable | — |
| `XmlSerialize`, and the JSON constructor/query family | nullable | several are constructors that never return NULL; see the `conservative` entries in `node-census.test.ts` for which |
| Non-strict scalar and `LANGUAGE plpgsql` functions | nullable | bodies are not statically analysable; the NOT NULL domain return is the escape hatch |
| `pg_catalog` built-ins outside the curated tables | nullable | add to `STRICT_TOTAL_BUILTINS` / `ALWAYS_NOT_NULL_BUILTINS` as needed, but only where the function is *total*, not merely strict |
| Branch guards | pattern-matched, not solved | `CASE WHEN length(col) > 0 THEN col …` stays nullable: the condition's truth does imply non-nullness, but the guard analyser recognises only specific shapes |

---

## 6. Unbuilt verification strategies

Two of the five strategies proposed for finding engine defects are unbuilt.
They find different classes, so neither subsumes the other.

**Differential oracle.** `postgres-language-server` (Rust) and `sqlc` are both
checked out in this workspace and perform overlapping analysis. Running the
same fixtures through another implementation costs no authoring effort, and any
disagreement is a candidate bug in one of them. It cannot find defects the two
implementations share, which is why it supplements rather than replaces the
census and the executable suites.

**Grammar-driven fuzzing.** Generate queries by composing clause kinds over the
fixture schema and check them against PostgreSQL. Best at combinations nobody
would write by hand — nested outer joins under grouping sets under set
operations. Highest cost of the five, so worth building only once the cheaper
strategies stop producing findings.

---

## Decided against — do not re-open without new information

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
See item 2 for the guard that makes positional joining safe.
