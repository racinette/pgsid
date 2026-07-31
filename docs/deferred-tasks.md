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

1. **Argument nullability** — built, all four sequencing steps, plus
   mechanism-A output narrowing and mechanism-C value-flow rejection; the
   design, its empirical grounding, and what remains deferred
   (`DELETE … USING` and `MERGE` generation) are
   in `docs/argument-nullability.md`.
2. **New generator axes.** The generated suite ran its full axis space and
   found no defect, which per its own criterion is the signal to widen the
   axes — parameters (above), then DML, deeper nesting, window functions.
   Whatever an axis finds becomes a permanent fixture with annotations, and an
   engine fix.
3. **The differential oracle** — assessed and demoted; see "Unbuilt
   verification strategies" for the findings. Neither candidate can verify
   this engine: one has no comparable analysis, the other is unsound in both
   directions outside a band our execution oracle already covers.
4. **The arity gate** — small, and waits for the first consumer to exist rather
   than being retrofitted.

---

## 1. Arity gate at the consumer boundary

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

## 2. Known imprecisions in the walk

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
| Custom operators | no promotion, no narrowing, nullable results | strictness is readable from `pg_proc.proisstrict` via `pg_operator`; see "Custom operator support" below |
| Branch guards | pattern-matched, not solved | `CASE WHEN length(col) > 0 THEN col …` stays nullable: the condition's truth does imply non-nullness, but the guard analyser recognises only specific shapes |
| Strict qual over a NULL-extended side | lower optionality kept | in `(t LEFT u) INNER v ON v.u_id = u.id` no NULL-extended `u` row can pass the strict qual, so `u`'s columns are never NULL in the output; the walk keeps them nullable. Same mechanism through `UPDATE … FROM` WHERE equalities. Found by the generated witness classification (`UNWITNESSABLE` in `generated-soundness.test.ts`) |
| DML `RETURNING` vs written values | catalog nullability only | `INSERT … VALUES (…, 'c') RETURNING val` reports `val` nullable from the catalog even though the written value is a literal; tracking values into RETURNING was judged not worth it. Also found by the witness classification |

---

## 3. Custom operator support

**What.** User-defined operators contribute nothing today: they never promote
a column, never narrow a parameter, and their results are conservatively
nullable. The non-strict `===` in the fixture schema (kept from the
promotion-unsoundness fix) is the measured reason the engine must not simply
trust them.

**Why it is possible.** The load-bearing property is declared, not inferred:
an operator wraps a function (`pg_operator.oprcode`) whose strictness is a
catalog flag (`pg_proc.proisstrict`). Strict + TRUE ⇒ non-null operands,
which is all the WHERE-side consumers (promotion, parameter narrowing,
mechanism-C attribution) need. The output-side totality rule has no catalog
flag, but `LANGUAGE sql` operator bodies could go through the existing
body-inlining machinery; everything else stays conservatively nullable.
Resolution follows the proven single-candidate policy from
`resolveFunctionMetadata`: one non-builtin operator with that name, or
refuse — no type inference. Builtin names keep the curated set and its
documented shadowing blind spot.

**State.** Not started. The snapshot does not capture `pg_operator`, which is
most of the plumbing.

**Why deferred.** Since the promotion fix, custom operators cost precision
only, never soundness — and no consumer with an operator-heavy schema exists
to justify the snapshot surface.

**Trigger.** A consumer whose schemas lean on custom operators, or the
witness classification accumulating rules whose reason is "custom operator
kept it dark".

---

## 4. Unbuilt verification strategies

One of the five strategies proposed for finding engine defects remains
unbuilt, and after assessing the candidates it is **demoted, not queued**.
(Generated queries, formerly listed alongside it, are built — see
`docs/query-generator-handoff.md` and `tests/unit/query/generated/`.)

**Differential oracle — assessed 2026-08, both candidates read in full.**

*postgres-language-server*: no comparable surface at all. It never derives a
query's output column list, contains zero code inspecting join types, and its
"type checking" hands the SQL to a live PostgreSQL via PREPARE — the same
oracle this project already uses directly. Nothing to disagree with. The
reading did produce salvage for pgsid's own language-server surface —
`docs/postgres-language-server-notes.md` records it (dual-parser
architecture for incomplete SQL, statement splitting, the productionized
PREPARE harness, error-cursor mapping).

*sqlc*: closer than expected — its PostgreSQL engine parses with libpg_query
like ours, and `internal/compiler/output_columns.go` is genuinely join-aware
(LEFT/RIGHT/FULL demotion with alias-correct matching, CTE plumbing), with
`sqlc analyze` emitting per-column/per-param `not_null` JSON, no database
needed. But it is unsound in BOTH directions — every resolvable function
including `sum`/`max` is NOT NULL (`ReturnTypeNullable` never populated for
PG), scalar subqueries inherit the inner column's NOT NULL, nested join trees
drop the outer requiredness, UNION takes the left arm only — while having no
WHERE promotion at all, so it cannot serve even as a one-sided bound. Its
parameter `not_null` is also a different *definition* than ours (ergonomic
"which column is it compared to", close to the deadness lint this project
rejected), so param comparison is a category error. A differential run is
informative only in a narrow band (left-deep joins over base tables, no
aggregates, no set ops, no scalar subqueries) where our claims are already
execution-verified with witnesses.

**Trigger, narrowed:** none foreseeable for finding OUR defects. The inverse
is real: our corpus provably exercises sqlc's enumerated holes, so running
`sqlc analyze` over the fixtures would mostly find bugs in *sqlc* — a
possible upstream contribution someday, not verification of this engine.

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
