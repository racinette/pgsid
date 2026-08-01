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
   since the MERGE-source collector gap. Per the generator doc's own
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

Closed by Wave 5 (2026-08): generated-column reads — the generation
expression (pre-parsed from the snapshot, which now labels `attgenerated`
correctly: stored/virtual, not the identity pair it had borrowed) is walked
at the reading site with refs bound to the read entry, under the joinState
gate a NULL-extended row demands (`generated-left-join-gate.sql` is the
pinned counterexample); the stored row IS the read row, so WHERE promotion
and the written-value map compose into it for free (`generated-promotion`,
`generated-written`). And overloaded names, the sound half — arity
filtering (PostgreSQL never picks a candidate that cannot accept the call's
argument count) plus consensus over what remains (all-strict for the
closures and dispatch, all-NOT-NULL-domain returns, per-position domain
agreement for mechanism A; operators mirror it with strictness by consensus
and body dispatch only when single). Disagreeing candidates stay refused —
`over_fn` still pins that. `overload-consensus.sql`,
`param-overload-arity.sql`. Also pinned: every write reaching a GENERATED
ALWAYS column (stored or identity) fails at PREPARE — a rejected statement
has no contract, and the implicit column list does not skip generated
columns, which is what keeps the written-value map's positional prefix-zip
sound (`param-mechanism.test.ts`).

Closed by Wave 4 (2026-08, measured first throughout): USING/NATURAL join
quals (synthesized as the equality conjuncts they are and fed to the
presence fixpoint; `join-using-promotion.sql`); arm-aware MERGE — the
source is OPTIONAL only when a NOT MATCHED BY SOURCE arm exists (flipped
`param-merge`'s own unwitnessability note), the join condition is
row-implied when every arm is MATCHED-kind, and written values intersect
per-arm exactly like ON CONFLICT's paths (the `merge-returning-written`
trap fired and was acknowledged); `JSON_EXISTS` over a non-null context
(the ONE provable member of the path-query family — a found JSON null
defeats every handler for VALUE/QUERY, measured); builtin STRICTNESS
captured from pg_catalog itself (name-level bool_and over `proisstrict`,
replacing the curated set with the source of truth) plus a 23-entry
measured totality batch; and array SLICES (clamp, never NULL by range).

Closed by Wave 3 (2026-08): custom operators — the snapshot captures
`pg_operator`, strict-backed operators gate promotion/narrowing/attribution,
and results dispatch through the backing function's own rules (section 3
below; `custom-operator.sql`) — and DML RETURNING written values: INSERT
VALUES cells by intersection over rows, INSERT…SELECT via the source's own
analysis, UPDATE SET expressions (the NEW row is what RETURNING reports),
and ON CONFLICT DO UPDATE as the intersection of both producing paths
(`returning-insert.sql`, `returning-update.sql`, `returning-insert-select`,
`returning-conflict-both`, `returning-conflict-existing`). Written evidence
only ever upgrades — a nullable expression written into a rejecting column
raises rather than returning.

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
| `A_Indirection` element / field / jsonb subscripts | nullable — correctly | measured: out-of-range elements and missing jsonb keys ARE NULL, and composite fields carry no constraints. SLICES are closed (Wave 4): they clamp rather than NULL, so a slice of a non-null array with non-null bounds is notNull (`array-slices.sql`) |
| `JSON_VALUE` / `JSON_QUERY`, `JSON_ARRAY(subquery)`, `XmlExpr` beyond `XMLELEMENT` | nullable — correctly, permanently | measured: a FOUND JSON null maps to SQL NULL through every ON EMPTY/ON ERROR handler combination, so no clause analysis can ever prove these; `JSON_ARRAY(SELECT …)` over an empty subquery is NULL; `xmlconcat`/`xmlforest` of NULLs are NULL. `JSON_EXISTS` is the one provable member and IS closed (Wave 4, `json-exists.sql`) |
| Non-strict scalar and `LANGUAGE plpgsql` functions | nullable | bodies are not statically analysable; the NOT NULL domain return is the escape hatch |
| `pg_catalog` built-ins outside the TOTALITY tables | nullable | STRICTNESS is no longer curated — the snapshot captures pg_catalog's `proisstrict` name-level (Wave 4). Totality has no catalog flag and cannot be proven by sampling (`array_length` of an empty array), so `STRICT_TOTAL_BUILTINS` / `ALWAYS_NOT_NULL_BUILTINS` stay docs-curated, each entry measured on admission |
| Custom operators backed by unanalysable functions | nullable results | the operator machinery is built (section 3); what remains conservative is the output side when the backing function is plpgsql or has multiple candidates — the same boundary those functions have when called directly |
| MERGE with mixed arm kinds | condition not row-implied | the join condition narrows and promotes only when EVERY arm is MATCHED-kind (Wave 4) — a NOT MATCHED arm fires precisely on the condition's failure, so mixed statements keep it dark. Per-arm condition reasoning was judged not worth it |

---

## 3. Custom operator support — built (Wave 3)

**What landed.** The snapshot captures `pg_operator` (name, operand types,
backing function, and the function's `proisstrict`), and the adapter resolves
operators by the proven single-candidate policy: one user operator with that
name (schema-qualified references narrow the search), or refuse. Builtin
names keep the curated `TOTAL_STRICT_OPERATORS` set, matched on BARE names
only — the documented shadowing blind spot, unchanged.

Consumers: the WHERE-side gate (`promotionOperatorIsStrict`) and both strict
closures accept a resolved operator whose backing function is declared
strict — strictness is exactly the property those conclusions need, and
totality is deliberately NOT inferred from it. Output-side, a custom
operator's result dispatches its backing function through the full FuncCall
machinery (NOT NULL domain returns, `LANGUAGE sql` body inlining), which is
how the fixture's non-strict `===` — kept from the promotion-unsoundness
fix — now analyses to notNull via its `SELECT true` body while still
promoting nothing. `custom-operator.sql` pins both directions with the
strict `====` / non-strict `===` pair.

**Residue.** Operators backed by unanalysable functions (plpgsql, multiple
candidates) stay conservatively nullable on the output side; the shadowing
blind spot stands.

---

## 4. Unbuilt verification strategies

One of the five strategies proposed for finding engine defects remains
unbuilt, and after assessing the candidates it is **demoted, not queued**.
(Generated queries, formerly listed alongside it, are built — see
`docs/query-generator.md` and `tests/unit/query/generated/`.)

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

**Value tracking for nullability (the “CASE value-dependence” rung
ladder).** Knowing that `CASE WHEN active THEN 'a' ELSE name END` never
takes its ELSE because `active` was written `true` requires tracking the
VALUE, not the nullability — and the rungs above it (NOT of a tracked
boolean, equality over tracked text, comparisons over tracked numbers,
values computed from bindings) each look equally reasonable until the
engine contains a constant evaluator for PostgreSQL expressions that must
match PostgreSQL exactly or produce unsound claims: the FigureColname trap,
larger, and unsound rather than cosmetic when it drifts. Ruled out
entirely, no rung implemented (2026-08). The generated
`dml-returning-case-value-dependence` rule records the shape that motivated
it.

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
`docs/query-generator.md`.

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
