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

1. **Argument nullability** — built in full: the four sequencing steps,
   mechanism-A output narrowing, mechanism-C value-flow rejection, and
   source value-flow attribution with its quantifiers split (universal for
   narrowing, existential for the contract). The design and its empirical
   grounding are in `docs/argument-nullability.md`; no known wrong-claim
   class remains.
2. **New generator axes.** The generated suite ran its full axis space and
   found no defect, which per its own criterion is the signal to widen the
   axes. Widened so far: parameters and DML (item 1 above), then parameter
   *placement* — strict ON conjuncts, the mechanism-A cast inside an ON qual,
   HAVING, parameters inside a LATERAL body, a set operation's second branch,
   and LIMIT/OFFSET, all crossed with the wrappers
   (`generateParamPlacementQueries`). That round found no defect either, and
   confirmed three behaviours worth having on record: bind-time rejection is
   position-blind, inner-scope narrowing in a LATERAL body survives the cross
   join and degrades under LEFT JOIN LATERAL, and EXCEPT keeps the left arm's
   claims. Its residue is two refilter live-traps (`inner-on-refilters`,
   `having-refilters`) that flip with PostgreSQL's agreement if the recorded
   ON/HAVING narrowing extensions ever land.

   Deep join trees and window functions followed, and both came back clean.
   The deep axis (`generateDeepJoinQueries`): three joins over the t—u—v—ck
   chain, all five tree shapes × all 4³ kind combinations — 320 structures,
   plain projection only, setops/wrappers deliberately not crossed (the run
   reports the bound). It found no defect; its residue is 44 structures
   whose `a_ue` is unwitnessable because every u-null-extended row dies at a
   strict edge qual — more instances of the strict-qual imprecision row in
   the table below, verified 44/44 against a hand-checked join-semantics
   model (`deep-strict-edge-refilters-u`). The window axis: two projection
   entries crossing the full structural space (+540 queries), putting the
   walk's window dispatch — never-null ranking set, count's empty-frame
   zero, ntile's argument condition, the conservative offset/frame fallback
   — under the execution oracle for the first time. Zero falsifications, and
   `lag` of a NOT NULL column is witnessed NULL on first rows, as claimed.

   The enumerated axis list is now exhausted with no engine defect found
   since the MERGE-source collector gap. Per the handoff doc's own
   criterion, the next widening is either a randomised generator over the
   grammar (now justified by evidence about which constructs are stable) or
   shifting effort to the first consumer, which items 1 and 3 below wait on
   anyway. Whatever a future axis finds becomes a permanent fixture with
   annotations, and an engine fix.
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

Closed by the Wave-1 analyzer generalization (2026-08: strict-expression
closure, OR by intersection, the presence fixpoint over join quals, HAVING
as ungated evidence, and the DML WHERE channel with its SET-column mask —
see `docs/nullability-walk.md` "The presence fixpoint" and the boundary list
in `docs/argument-nullability.md`): `OR` in WHERE, branch guards beyond the
pattern list, strict quals over a NULL-extended side (including all 44 deep
structures and the `UPDATE … FROM` variant), and INNER `ON` / HAVING /
DML-WHERE narrowing. Each closure is pinned by a fixture
(`where-promotion-or`, `case-guard-strict-closure`, `join-refilter-promotion`,
`join-chain-fixpoint`, `join-on-promotion`, `having-narrowing`,
`dml-where-channel`, `update-set-mask`), and every generated-suite trap rule
those imprecisions carried went stale and was deleted, as designed.

Closed by Wave 2 (2026-08, all behaviours measured first and pinned by
fixtures): ordered-set aggregates (`WITHIN GROUP` sort expressions now
visible, plain-aggregate gates; the hypothetical-set `rank` family measured
TOTAL — a position even over zero rows — hence notNull unconditionally;
`ordered-set-aggregates.sql`), the SQL/JSON value-list constructors and
`XMLELEMENT` (always produce a container; `JSON()`/`JSON_SCALAR`/
`JSON_SERIALIZE`/`XMLSERIALIZE` strict; `json-constructors.sql`), and window
aggregates over the default frame (never empty — the window analogue of the
non-empty-group gate; `window-default-frame.sql`, plus the generated
`a_wmin` column across the structural space).

| Construct | Current | Note |
|---|---|---|
| `A_Indirection` (array subscript, field access) | nullable | an out-of-range subscript really is NULL and the index is not checkable statically |
| JSON query functions, `JSON_ARRAY(subquery)`, and `XmlExpr` beyond `XMLELEMENT` | nullable | correctly so in general: a missing path is NULL, `JSON_ARRAY(SELECT …)` over an empty subquery is NULL (measured), `xmlconcat`/`xmlforest` of NULLs are NULL. Genuine imprecision remaining here is per-shape and small |
| Non-strict scalar and `LANGUAGE plpgsql` functions | nullable | bodies are not statically analysable; the NOT NULL domain return is the escape hatch |
| `pg_catalog` built-ins outside the curated tables | nullable | add to `STRICT_TOTAL_BUILTINS` / `ALWAYS_NOT_NULL_BUILTINS` (totality required) or `STRICT_BUILTIN_FUNCTIONS` in `operators.ts` (strictness required, for the guarantee closure) as needed — the properties are different and each entry must be measured for the set it joins |
| Custom operators | no promotion, no narrowing, nullable results | strictness is readable from `pg_proc.proisstrict` via `pg_operator`; see "Custom operator support" below |
| `USING` / `NATURAL` join quals | not consulted by the presence fixpoint | the merged-column equality is strict and could imply presence like an ON qual; the merged-column machinery is separate and the fixpoint reads `quals` only |
| MERGE join condition and arm conditions | no narrowing, no promotion | NOT MATCHED arms fire precisely for rows that did NOT pass the join condition, so it is not row-implied; per-arm reasoning was judged not worth it |
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
