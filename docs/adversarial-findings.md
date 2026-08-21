# Adversarial sweep — findings

## What this document is

The report of the graybox sweep specified in `docs/adversarial-sweep.md`:
246 probes over 13 rounds, each running `inferQueryContract` on a statement
AND executing that same statement against inline-seeded data in one PGlite,
comparing per the sweep's rank table. PGlite is the referee throughout; every
behavioural claim below was measured, not read off documentation.

**Fifteen findings**, all confirmed by execution or by PostgreSQL's
RowDescription: nine rank-1 (`notNull` unsoundness), five rank-2 (shape) — two
of which also falsify a flag, so eleven statements in total carry a wrong
`notNull` — and one rank-3 (param contract). **Zero rank-5 (parity)** and
**zero rank-6 (crash)**
across all 246 probes — the traced and untraced walks never disagreed, and
nothing threw outside `UnsupportedNodeError`.

Each finding has a quarantine fixture in `tests/unit/query/fixtures-adversarial/`
carrying the claims the engine CURRENTLY makes, plus a header with the
falsifying data, the observed outcome, and the suspected mechanism. The DDL
those fixtures need is `fixtures-adversarial/schema-adversarial.sql`; it is
deliberately NOT folded into `fixtures/schema.sql`, because the fixtures beside
it record wrong claims and the suite must stay green until the fix phase. The
full suite is green as of this writing.

Nothing was fixed at the time of the sweep. Section 3 proposes fixes with
blast radius and an order.

**Status: the fix phase ran (2026-08-04/05) and closed all fifteen
findings**, one commit per root cause in section 3's recommended order.
The quarantine directory is retired: every fixture graduated into
`tests/unit/query/fixtures/` with corrected claims, the DDL folded into
the fixture schema, and the DO INSTEAD rule and unresolvable-relation
refusals pinned in `unsupported-nodes.test.ts`. The closure entries — with
what each fix measured and what it deliberately costs — are in
`git log -p docs/deferred-tasks.md` (the register was cut back to decisions
and open items on 2026-08-21); the imprecision residue that is still open is
in its "Known imprecision residue" table. This document remains the sweep's report, unmodified
below this line.

---

## 1. Findings

| id | rank | claim vs reality | fixture |
|---|---|---|---|
| 1 | 1 | an unqualified predicate reference is matched by column NAME alone, so a USING-merged `id` guarantees `u.id` on the optional side | `using-merged-unqualified-guarantee.sql` |
| 2 | 1 | BEFORE / INSTEAD OF triggers and DO INSTEAD rules rewrite the returned row; the written-value map and catalog flags describe the statement instead | `trigger-rewrites-written-row.sql`, `rule-rewrites-written-row.sql`, `instead-of-trigger-view.sql` |
| 3 | 1 | `attnotnull` is read from the named relation while the query scans the inheritance tree, where a child may lack the constraint | `inherit-attnotnull-divergence.sql` |
| 4 | 1 | `bpchar` is in the literal-distinctness whitelist, but `'a' = 'a '` is TRUE for it — distinct tokens, equal values | `bpchar-literal-distinctness.sql`, `bpchar-distinctness-case-arm.sql` |
| 5 | 1 | a declared-STRICT user function with non-null arguments is concluded non-null; strictness constrains only the NULL-input case | `strict-not-total-function.sql` |
| 6 | 1 | a non-null aggregate `INITCOND` is concluded non-null over ANY input; it fixes the EMPTY-input result only | `aggregate-initcond-not-total.sql` |
| 7 | 1 | six `STRICT_TOTAL_BUILTINS` members are strict but not total (`array_position`, `substring(… FROM regex)`, `scale`/`min_scale` of NaN, `to_number('','')`, `to_char(<datetime>, '')`) | `builtin-totality-table.sql` |
| 8 | 1 | the grouping-set NULLing override is bypassed by the USING/NATURAL merged-column resolution route | `grouping-set-merged-column.sql` |
| 9 | 1 | `GROUP BY ROLLUP(1)` and `GROUP BY ROLLUP(<output alias>)` record no grouping-set column at all | `grouping-set-ordinal-alias.sql`, `grouping-set-alias-spelling.sql` |
| 10 | 2→1 | MERGE `RETURNING *` — PostgreSQL expands SOURCE first, the engine target first; same arity, wrong order | `merge-returning-star-order.sql` |
| 11 | 2 | a relation the snapshot does not capture (partitioned, temporary, `pg_catalog`, `information_schema`) silently contributes zero columns to `SELECT *` | `unresolvable-relation-shape.sql` |
| 12 | 2→1 | multi-argument `unnest(a, b)` in FROM expands to one column per array; the engine emits one column total | `multi-arg-srf-shape.sql` |
| 13 | 2 | a column definition list (`AS z(a integer, b text)`) on a record-returning function is never read | `coldeflist-shape.sql` |
| 14 | 2 | `(f(x)).*` in the target list expands a composite; the engine emits one column | `composite-star-shape.sql` |
| 15 | 3 | a parameter in a window frame OFFSET is claimed nullable, but a NULL binding raises | `param-window-frame-offset.sql` |

Findings 10 and 12 are shape defects that also produce a live `notNull`
falsification, because the misalignment lands a non-null flag on a column that
comes back NULL. Those are the cases the walk doc's own warning is about:
arity is a weak guard, and a wrong order is silently wrong.

---

## 2. Root causes

Eight mechanisms account for all fifteen.

### RC-1 — a property that constrains one input case is used to conclude the general case

**Findings 5, 6, 7.** `src/query/nullability-walk.ts`.

The engine draws the total-vs-strict distinction rigorously in three places and
says so in comments: `TOTAL_OPERATORS` ("Strictness is NOT the criterion"),
`STRICT_TOTAL_BUILTINS` ("Membership requires being *total*, not merely
strict"), and `promotionOperatorIsStrict` ("Totality is NOT required here — the
conclusion is about the operands, never the result"). Three sites then infer
totality anyway:

- **Priority 4** of the FuncCall dispatch, `if (meta && meta.strict &&
  !meta.isAggregate)` and the consensus twin below it: all arguments non-null →
  non-null. `proisstrict` says NULL in ⇒ NULL out. It says nothing about
  non-null in — `SELECT lookup_name(t.id)` where the looked-up row does not
  exist is the everyday counterexample. Priority 4 also runs BEFORE priority 5,
  so it discards an answer the body walk would have got right: `lookup_name`'s
  body has a FROM clause and can return zero rows.
- **The aggregate dispatch's first rule**, `if (meta?.aggInitVal != null)`.
  `agginitval` is the state before any transition, so it settles the EMPTY-input
  result and nothing else. Over a non-empty group the answer is whatever the
  transition and final functions produced, neither of which is analysed.
- **`STRICT_TOTAL_BUILTINS` membership**, whose admission criterion is right and
  whose contents contain six members that fail it (measured 2026-08-04):
  `array_position` (NULL when absent), `substring(text FROM regex)` (NULL on no
  match — the POSITIONAL form is total and name-level dispatch cannot tell them
  apart), `scale`/`min_scale` of NaN, `to_number('','')`, and
  `to_char(<timestamp|date|interval>, '')`. `to_char(numeric, '')` and
  `to_char(int, '')` return `''` and are total, so the entry is half-right.

The operator path inherits RC-1 for free: a custom operator's result dispatches
its backing function through the same FuncCall machinery, so `<->` backed by a
strict-but-not-total function is claimed non-null (measured).

### RC-2 — the write path is modelled as the statement text

**Finding 2.** `src/query/nullability-walk.ts` (`attachInsertWrittenColumns`,
`analyzeInsert`/`analyzeUpdate`), `src/catalog/snapshot.ts`.

The written-value map reduces VALUES cells and SET expressions to the values
the STATEMENT names, and the catalog flag describes the stored row. Between
the two sits PostgreSQL's rewriting stage, and the engine models none of it:

- a **BEFORE ROW trigger** may set `NEW.a := NULL` after the statement's value
  was chosen — RETURNING reports the trigger's row;
- an **INSTEAD OF trigger** on a view returns whatever NEW it builds, and the
  view's own definition expressions are never evaluated, so even a literal
  column of the view (`'x'::text AS lit`) comes back NULL;
- a **DO INSTEAD rule** replaces the statement outright, and RETURNING reports
  the rule's query against a different table.

The catalog snapshot captures no triggers and no rules, so the engine cannot
currently even detect that a target is affected.

### RC-3 — `attnotnull` is read from the named relation, not the relation set the query scans

**Finding 3.** `src/query/catalog-adapter.ts` (`resolveColumnNotNull`).

`SELECT … FROM parent` scans the whole inheritance tree.
`ALTER TABLE ONLY <parent> ALTER <col> SET NOT NULL` is accepted by PostgreSQL
(measured) and leaves parent `attnotnull = true`, child `attnotnull = false`; a
NULL inserted into the child is then returned by a query against the parent.

The CHECK path does NOT have this hole and the measurement is worth recording:
a parent's CHECK is copied into every child's own `pg_constraint`, cannot be
dropped there (`cannot drop inherited constraint`), cannot be made NOT VALID
there (`constraints cannot be altered to be NOT VALID`), and cannot be added
`ONLY` to the parent in the first place (`constraint must be added to child
tables too`). So `resolveCheckConstraints` is sound as written, and its comment
about per-relation `pg_constraint` rows is correct. Partitioned tables are also
immune: the `ONLY … SET NOT NULL` that opens the hole is refused for them.

### RC-4 — the byte-distinctness whitelist admits a type whose equality is not byte equality

**Finding 4.** `src/query/catalog-adapter.ts` (`TEXT_FAMILY_OIDS`),
`src/query/check-entailment.ts` (`litsDistinct`).

The judgment's stated warrant is that "unequal bytes are unequal values by the
definition of a deterministic collation". That holds for `text` (25) and
`varchar` (1043). It does not hold for **`bpchar` (1042)**: `character(n)`
comparison strips trailing blanks before the collation is consulted, so
`'a'::char(4) = 'a '` is TRUE (measured) while the tokens differ. The whitelist
was built against the collation hazard — which is real and correctly handled —
and the padding hazard sits one level below it, in the operator rather than the
collation, exactly where the comment already says citext's case-folding lives.

`colTypeRef` strips the typmod, so `character(4)` and the constraintdef's
`'a '::bpchar` both normalise to `character` and the effective-type guard lets
the pair through.

### RC-5 — a predicate's unqualified column reference is matched by NAME alone

**Finding 1.** `src/query/nullability-walk.ts` (`columnMatches`, the
`parts.length === 1` branch).

The branch comments "Unqualified — match by column name only. The caller
already knows this alias owns this column." The caller
(`checkWhereGuarantee(alias, colName, scope)`) knows only that the alias owns a
column of that NAME; it does not know that the predicate's unqualified
reference RESOLVES to that alias. Normally the two coincide, because a name
visible from two relations is ambiguous and PostgreSQL rejects the query.

**USING / NATURAL is the shape that separates them.** The merged column is the
only visible `id`, so `WHERE id IS NOT NULL` is unambiguous and legal, while
both constituents remain addressable through `aliases`. The merged column of a
LEFT JOIN is the LEFT side's value, so the predicate says nothing about the
right side — but `checkWhereGuarantee` reads it as a guarantee for `u.id` and
overrides the OPTIONAL joinState.

The alias-level promotion path is NOT affected: `columnRefMatchesAlias` requires
a qualified reference. Only the per-column guarantee escapes, which is enough —
the guarantee overrides the join state on its own.

### RC-6 — grouping-set NULLing has two escapes

**Findings 8 and 9.** `src/query/nullability-walk.ts`.

`Scope.groupingSetColumns` is consulted at the two ordinary ColumnRef
resolution sites and correctly overrides the catalog flag, WHERE guarantees,
and generated-column reasoning (all measured sound). Two routes get past it:

- **Escape (a), the consumer side.** `mergedColumnNotNull` answers a
  USING/NATURAL-merged column from its constituents' `relationColumnsIntrinsic`
  and never consults `groupingSetColumns`. It is a third resolution route, and
  it bypasses the override. Re-exporting the merged column through a subquery
  first makes it an ordinary column again, and the claim is then correct.
- **Escape (b), the producer side.** `collectGroupingSetColumns` records only
  ColumnRefs found inside a `GroupingSet` term. PostgreSQL accepts two other
  spellings for a GROUP BY term: an output-column **ordinal** (`ROLLUP(1)` — an
  `A_Const`, so nothing is recorded) and an output-column **alias**
  (`ROLLUP(k)` — records the key `"k"` while the consumers ask about `"id"` /
  `"t.id"`). Both are ordinary SQL and the wrong claim survives re-export
  through a subquery projection and a CTE star.

### RC-7 — the output column list is assembled by routes that do not mirror PostgreSQL

**Findings 10, 11, 12, 13, 14.** `src/query/nullability-walk.ts`,
`src/catalog/snapshot.ts`.

The walk doc's dispatch-site table is explicit: at a FROM item, an unknown
construct must **throw**, because contributing the wrong columns is worse than
refusing. Five routes contribute a wrong list without throwing.

- **MERGE `RETURNING *` order (10).** `buildMergeScope` pushes the target's
  visible columns (via `buildDmlScope`) and then the source's. PostgreSQL
  expands source first (measured directly). Same arity, wrong order — which
  lands `ck.name`'s notNull flag on the source's nullable column.
  `UPDATE … FROM` and `DELETE … USING` expand target-first and the engine is
  right for both, so this is MERGE-specific.
- **Unresolvable relations (11).** `snapshotCatalog` takes relkind `'r'`,
  `'v'`, `'m'` in user namespaces, so partitioned tables (`'p'`), temporary
  tables, foreign tables (`'f'`), `pg_catalog` and `information_schema` are
  absent. `addRangeVar` then builds a fallback entry with `columns: []`, and
  star expansion over it contributes nothing. Measured silent in seven
  placements: bare, inside a CTE, through `RETURNING *`, on the optional side
  of a LEFT JOIN, over a temp table, over `pg_catalog.pg_namespace`, over
  `information_schema.schemata`. A view over a partitioned table is unaffected
  (the view's own catalog columns carry the shape), and named target-list
  entries are unaffected (each is one output column whatever it resolves to).
- **Multi-argument `unnest` (12).** `resolveTableFunctionColumns` pushes one
  column per function item for a name with no catalog metadata. `unnest(a, b)`
  in FROM is a special form that expands to one column PER ARRAY ARGUMENT,
  zip-style with NULL padding. With `WITH ORDINALITY` the off-by-one hands the
  always-present counter's notNull flag to the previous position.
- **Column definition lists (13).** The same function renames positionally from
  `entry.cteColumns` — the alias NAME list. A coldeflist (`AS z(a integer, b
  text)`) is a different AST field carrying names and types, and it is what
  makes a `RETURNS SETOF record` call legal at all. It is never read, so every
  `jsonb_to_recordset` / `json_to_record` / user-record-function call has the
  wrong shape.
- **`(expr).*` (14).** An `A_Indirection` ending in `A_Star` is a target-list
  expansion handled at the expression dispatch site, where one entry means one
  column. `expandStar` handles only the ColumnRef spellings. `(alias.*)` over a
  table entry IS correct (measured).

### RC-8 — a parameter rejection site the analysis does not enumerate

**Finding 15.** `src/query/param-nullability.ts`.

Three rejection mechanisms are modelled (bind-time NOT NULL domain,
execution-time NOT NULL site, value flow into one). A **window frame offset** is
a fourth: PostgreSQL raises `frame starting offset must not be null` for a NULL
bound, for ROWS/RANGE/GROUPS and in both directions. The sibling placement —
LIMIT/OFFSET — takes NULL legally and is pinned in the register; a frame bound
reads like the same shape and behaves oppositely. Verified against a control
run with a valid binding, which succeeds.

---

## 3. Proposed fixes, blast radius, order

Proposals only — nothing here is implemented.

| # | root cause | fix sketch | blast radius |
|---|---|---|---|
| 1 | RC-5 | in `columnMatches`, resolve the unqualified reference through `scope.visible` (as `rewriteRefsToOrigin` already does) and require the owning entry to be `alias`; a merged column owns no entry and matches nothing | narrow. No current fixture relies on a name-only match, because in every non-merged shape the resolution agrees. Expect zero fixture flips and possibly one imprecision where a merged column previously promoted correctly by accident |
| 2 | RC-6(a) | `mergedColumnNotNull` consults `scope.groupingSetColumns` for `name` before answering, returning false when it is a grouping-set column — the same override the two ColumnRef sites apply | narrow, and it can only ever turn a claim from notNull to nullable |
| 3 | RC-6(b) | `collectGroupingSetColumns` resolves each GroupingSet term against the target list first: an `A_Const` integer selects the n-th entry, a bare name matches a `ResTarget.name`, and the resolved entry's underlying `alias.col` is what gets recorded | narrow. Adds keys, never removes them, so only notNull→nullable |
| 4 | RC-1 | (a) split priority 4: keep strictness for the NULLABLE direction (any arg nullable ⇒ nullable) and require TOTALITY for the notNull direction. There is no `prototal` catalog flag, so the sound recovery is to fall through to priority 5 (body inlining) for `LANGUAGE sql`, and to nullable otherwise. (b) gate the INITCOND rule on `groupGuaranteesNonEmpty` being FALSE — i.e. it only speaks about input that may be empty — or drop it to "nullable unless the group is provably empty". (c) remove the six non-total members from `STRICT_TOTAL_BUILTINS`; `substring` must go by name because the total positional form is indistinguishable without arg types | **the widest of the set.** Every fixture asserting notNull through a strict user function or a non-null INITCOND flips, and the generated corpus's aggregate and function axes will move. `count_it` (INITCOND `'0'`, value-preserving sfunc) is exactly the case the rule was written for and would become nullable — the honest cost of not being able to analyse a transition function. Losing `substring` costs precision on its common positional use |
| 5 | RC-7 (10) | `buildMergeScope` pushes the source's visible columns before the target's; `RETURNING ck.*` is unaffected either way | narrow but load-bearing — `merge-returning*.sql` fixtures' column order changes, and the soundness suite's name comparison is what will confirm it |
| 6 | RC-7 (11) | two halves. (a) `snapshotCatalog` captures relkind `'p'` and `'f'` alongside `'r'`; partitions already arrive as `'r'`. (b) independently, `addRangeVar`'s fallback becomes a REFUSAL (`UnsupportedNodeError`) rather than a zero-column entry — the walk doc's own rule for a FROM item, and the caller's documented escape is to treat every column as nullable | (a) is additive: new tables appear in the snapshot and in `diffCatalogs`, so partitioned schemas start being tracked at all. (b) is the behaviour change — statements that silently produced a short column list start raising. That is the intended direction, but any consumer corpus containing a temp table or a `pg_catalog` query will now refuse rather than mislead |
| 7 | RC-7 (12, 13, 14) | (12) special-case `unnest` with >1 argument in `resolveTableFunctionColumns`: one nullable column per argument. (13) read the RangeFunction's per-function coldeflist and use its names; every column is nullable (a record's fields carry no constraints). (14) route `A_Indirection` ending in `A_Star` through `expandStar`, resolving the composite through `resolveCompositeType` / `columnsForReturnType` | moderate, all in the shape direction. No existing fixture uses these forms, so the flips are additions rather than changes |
| 8 | RC-4 | drop OID 1042 (`bpchar`) from `TEXT_FAMILY_OIDS`. The gate's warrant should be restated as "byte equality IS value equality for this type under this collation", which excludes any blank-padded or otherwise normalising comparison | narrow. No current fixture uses a `character(n)` column; the loss is precision on a type where the judgment was never sound |
| 9 | RC-8 | `collectParamFacts` treats a parameter appearing directly as a `WindowDef` frame offset (`startOffset` / `endOffset`) as a rejecting site — bind-independent, execution-time, so existential like mechanism B | narrow. Adds one notNull param claim shape; `param-soundness.test.ts` will want a witness fixture |
| 10 | RC-3 | `resolveColumnNotNull` must answer for the relation SET. Two options: (a) the snapshot records, per column, whether every descendant also carries the constraint, and the adapter answers with the conjunction; (b) the walk honours `RangeVar.inh` — `FROM ONLY p` uses the parent's flag, `FROM p` uses the conjunction. (b) subsumes (a) and is the more faithful model. Note the same `inh` flag would let the CHECK path stay exactly as it is | narrow in the fixtures, wider in the snapshot: a new per-column fact, hence a `diffCatalogs` entry, since adding a child can now change inference |
| 11 | RC-2 | the snapshot captures, per relation, whether a BEFORE ROW / INSTEAD OF trigger or a rule exists on the relevant command. The walk then voids the written-value map and drops to catalog flags for a trigger, and REFUSES for a DO INSTEAD rule (whose returned rows come from a statement the engine never saw). An INSTEAD OF trigger must also void the view-definition reasoning | moderate: a new snapshot fact and a new refusal class. It costs precision only on tables that actually carry such objects, which is the correct shape for the cost |

**Recommended order.** Soundness first, cheapest-first within that, and the
widest-radius item deliberately not first so the fixture churn lands on a
codebase whose other claims are already correct:

1. **#8 (bpchar)** and **#1 (unqualified name match)** — one-line gates,
   narrow radius, both rank 1.
2. **#2 and #3 (both grouping-set escapes)** — small, and both can only weaken
   claims.
3. **#5 (MERGE order)** — one statement's worth of code, and it is a shape
   defect, which is worse per the ranking than any single flag.
4. **#10 (inheritance) and #11 (triggers/rules)** — both need a snapshot fact,
   so they are one piece of work on the catalog side; do them together.
5. **#7 (the three SRF/star shapes)** — additive, no existing claim moves.
6. **#6 (unresolvable relations)** — do (a) and (b) together, because (b)
   alone turns every partitioned-table query into a refusal while (a) is what
   makes those queries work.
7. **#9 (frame offset)** — needs its own witness fixture; independent of
   everything else.
8. **#4 (strict/INITCOND/builtins)** last. It is the widest and the one most
   likely to expose second-order consequences in the generated corpus, and
   every other fix landing first means those consequences are readable.

### The gate at the consumer boundary

Register section 1 schedules an **arity gate** — compare the engine's
`OutputNullability[]` against PostgreSQL's RowDescription before zipping them,
and on mismatch treat every column as nullable and report loudly — for the
emitter slice, on the reasoning that it should be written with the first
consumer rather than retrofitted. This sweep says two things about it.

**It must compare ORDER, not just length.** Arity alone catches findings 11,
12, 13 and 14 (the engine's list is short by 2, 1, 1 and 4 columns). It does
NOT catch finding 10: MERGE `RETURNING *` is six columns against six, permuted.
That is the walk doc's own standing warning made real — "a construct can
preserve the count and change the order" — so the gate should compare the
ordered NAME list, which is exactly what `nullability-soundness.test.ts`'s
assertion 2 already does in-tree, for the same reason.

Two constraints on the name comparison, both from the register's
Decided-against entries. It is a *verification* of a positional join, never a
name-based join — names are not unique and joining by them was ruled out. And
`FigureColname` is deliberately not reimplemented, so the engine reports an
empty name for un-aliased expressions: the check can only compare positions
where the engine produced a name, and degrades to arity-only for an
expression-heavy target list. All five shape findings here are bare column
references, so all five are inside the part it can see.

**It belongs before the emitter slice, not with it.** The gate does not need
the emitter — it needs the first slice that holds a contract and a PREPARE
result at the same time, which is upstream of rendering. Scheduling it at the
emitter leaves every slice in between building on a failure mode that is
silent by construction: a wrong column list misassigns every flag past the
divergence and does so while looking authoritative. The cost is one comparison
over two lists the consumer already holds.

**What it does not do.** It catches nothing in findings 1–9. Those produce a
correct column list with a wrong boolean in it, which no boundary check can
see. The gate is a cheap permanent net under one class of defect, not a
substitute for section 3's fixes — and it is permanent rather than
transitional, since this sweep found five shape defects in one sitting and the
engine will keep growing.

---

## 4. Negative results

What was attacked and held. A mechanism that survived several structurally
distinct shapes is worth as much as a bug.

**A. Promotion trust** — 15 shapes; one hit (finding 1). Held: `IS NOT
DISTINCT FROM NULL`, `(x = 'z') IS NOT TRUE`, `IS UNKNOWN`,
`COALESCE(x,'d') = 'd'`, `x IS NULL OR x = 'z'`, `NOT (x <> x)`, the non-strict
custom operator `===` in WHERE, an INNER qual using `IS NOT DISTINCT FROM` over
an outer-joined side, a CASE in WHERE that is TRUE on extended rows,
`u IS NULL` as a whole-row test, `LEFT JOIN LATERAL … ON TRUE`, a RowExpr
comparison and RowExpr NullTest, `IN` over a subquery, a `NOT EXISTS` whose
body pins an outer column, and promotion inside a LATERAL body reaching for the
outer alias. The `predicateProvesNonNull` shape list and the
`promotionOperatorIsStrict` gate did their job in every one.

**B. This session's fresh code** — 13 shapes; no hits. Slot-per-branch setop
origins survived INTERSECT under UNION under EXCEPT, `EXCEPT ALL` /
`INTERSECT ALL`, a literal branch inside INTERSECT ALL, and a literal-NULL
branch under EXCEPT. Unit chains survived a self-join of one CTE (the
cross-reference certification the closure was written for), sibling units
(pinning `u.email` did not certify a `guest` in a different unit), nested units,
and a FULL JOIN chain with multi-element chains on both sides. `storedRowNotNull`
correctly ignored the NOT VALID CHECK. SEARCH/CYCLE `extraColumns` were correct
under four shapes: star over the CTE, CYCLE alone, SEARCH+CYCLE together with a
CTE column alias list, and the CTE on the optional side of a LEFT JOIN with the
group lifted. Quoted identifiers of maximal weirdness (`"a b"`, `"A"`,
`"select"`) resolved correctly on both the star and the group path.

**C. Things the engine does not model** — 20 shapes; four hits (findings 2, 3,
11, and the inheritance half of 3). Held: dropped columns (`attisdropped` is
skipped and `SELECT *` has the right shape), zero-column tables (bare and
joined), whole-row references over an optional side, system columns
(`ctid`/`xmin`/`tableoid` read nullable — sound), partitions themselves
(relkind `'r'`, resolved correctly), and **updatable-view DML in all three
renderings**: renamed columns, reordered columns, and UPDATE RETURNING each
produced the right shape and the right flags. `SELECT * FROM ONLY t` and
TABLESAMPLE were unaffected.

**D. The entailment kernel's edges** — 10 shapes; one hit (finding 4).
The **NaN** attack failed and the reason is worth recording: PostgreSQL's
float8 btree opclass orders NaN above every non-NaN, so `NaN > 0` is TRUE and
`NaN <= 0` is FALSE (measured) — `>` and `<=` remain exact negators and the
pairing is sound for NaN. Literal re-rendering held for every value class
tried: intervals (`interval '1 day'` vs `interval '24 hours'`), numerics with
trailing zeros (`1.50` vs `1.5`), array literals, and domains over domains —
all refused to match and stayed nullable. Mutually-referring CHECKs terminated
and derived nothing. The varchar control confirmed that the finding-4 shape is
specific to blank padding: without it, no admissible row reaches the derivation.

The **collation-gate bypass could not be convicted in PGlite** and this is a
measurement limitation, not a negative result: `'a' = 'A' COLLATE ci` is false
here, confirming the register's pinned catalog-only-ICU note. A
deterministic-column-versus-nondeterministic-comparison attack needs a build
whose ICU actually folds.

**E. DML corners** — 13 shapes; one hit (finding 10). Held: MERGE with a
DO NOTHING arm, MERGE with `NOT MATCHED BY SOURCE THEN DELETE` and
`merge_action()`, ON CONFLICT with a partial-index arbiter (`WHERE live` on the
conflict target did not change the written-value intersection's soundness), the
`DEFAULT` keyword in a VALUES cell and in `SET`, `OVERRIDING SYSTEM VALUE`,
multi-row VALUES with per-row nullability disagreement, `INSERT … SELECT` from
a set operation and from a LEFT JOIN, multi-assignment `SET (a, b) = (SELECT
…)`, PG18 `OLD.`/`NEW.` RETURNING qualifications (flat and conservative, and
correct), `UPDATE … FROM` and `DELETE … USING` over an outer join with the
group lifted onto RETURNING, and a data-modifying CTE feeding an outer join.

**F. Rows that multiply or vanish** — 14 shapes; two hits (findings 8, 9, both
grouping-set). Held: `GROUPING SETS ((), (a))`, `GROUPING SETS ((a), (b))` with
neither set empty, ROLLUP over a WHERE-guaranteed column, ROLLUP over a
generated column, ROLLUP qualified-in-GROUP-BY/unqualified-in-target and the
mirror, `CUBE((a, b))` over a parenthesised group, the `GROUPING()` function,
plain `GROUP BY 1` with no construct, grouping sets under a filtering HAVING,
grouping sets combined with an outer join, and grouping sets across UNION ALL
and EXCEPT. SRFs in the target list with zero expansion, `WITH ORDINALITY`
renames, `ROWS FROM` with two functions, window frames with
`EXCLUDE CURRENT ROW`, aggregate `FILTER` excluding every row, and `DISTINCT ON`
with an expression not in the target list were all correct.

**G. Parameters** — 11 shapes; one hit (finding 15). Held: `$1` compared to
itself (the narrowing is sound — the NULL binding returns no rows), NULL in
LIMIT and OFFSET (legal, re-measured), a mechanism-A domain cast inside a
never-taken CASE arm (raises at Bind, claimed notNull, correct), a parameter
inside a recursive CTE's recursive arm, and joint sets — including two sets
sharing a member (`[[1,2],[1,3]]`, both correct and minimal). The
type-deduction boundary the register pins (`$1 IS NOT NULL` alone does not type
the parameter) reproduced exactly.

**H. Recursion** — 8 shapes; no hits. Recursive UNION (dedup, not UNION ALL),
a recursive CTE referenced twice at different join states, a recursive base
branch that re-exports another CTE, a recursive CTE on the optional side with
its group lifted, and a recursive CTE inside a set operation inside another CTE
were all correct, groups included.

**Parity and crashes.** `inferNullability` and `inferNullabilityTraced` were run
on all 246 probes and never disagreed on a flag, a name, or a group. Nothing
threw outside `UnsupportedNodeError`, including 400-deep nested parentheses and
a 300-arm OR in WHERE.

---

## 5. Imprecisions (rank 7, register material)

Sound, but surprising in the sense the sweep asks for — the engine's own
machinery reaches them.

- **A base-table alias column list is ignored.** `FROM t AS z(p, o, r, s)`
  renames positionally for subqueries, VALUES and table functions; for a
  RangeVar it does not. References through the new names then fail to resolve
  (nullable — sound), and `SELECT *` emits the CATALOG names while PostgreSQL
  emits the alias names. The flags stay positionally correct, so this is not a
  shape defect by the contract's letter — names are diagnostic — but the
  soundness suite's name comparison would flag it, and the same code path
  already does the right thing three other ways.
- **A NOT NULL domain column reads nullable at a REQUIRED entry.**
  `SELECT c.tag FROM ck c`, where `tag` is `nn_text`, is nullable. A NOT NULL
  domain is enforced on every write, so a required entry's value cannot be
  NULL; `attnotnull` stays false for such a column, and `isNotNullDomain` +
  `resolveColumnTypeOid` are both already in the catalog interface. It also
  keeps the column out of presence-group discriminants, where it would be a
  natural one.
- **A boolean literal is not an atom.** `CHECK (false OR x IS NOT NULL)` is
  stored verbatim by PostgreSQL (measured — no constant folding), and the
  kernel does not recognise the `false` disjunct as FALSE, so the survivor
  never gets notFALSE. This lands squarely in the propositional charter's atom
  gates and is cheap to close if it is ever worth closing.

---

## 6. What was not tried

Stated so the next pass does not assume coverage it does not have.

- **Foreign tables** (relkind `'f'`) were not exercised — no FDW is available
  in this PGlite build. They are in the same snapshot-coverage class as
  partitioned tables (finding 11) by inspection, not by measurement.
- **Row-level security** was not probed. A policy filters rows and cannot
  change a value, so it is not a nullability surface, but that is an argument
  rather than a measurement.
- **Collation-driven attacks** are bounded by PGlite's catalog-only ICU, as
  above.
- **Second-order effects of the proposed fixes** on the generated corpus were
  not estimated beyond the blast-radius column; item #4 in particular deserves
  a dry run before it lands.
- The sweep ran on **PG18 via PGlite**. Version-specific behaviours measured
  here (`ALTER TABLE ONLY … SET NOT NULL` acceptance, MERGE `RETURNING *`
  order, `to_char(<datetime>, '')`) should be re-pinned if the target version
  ever moves.
