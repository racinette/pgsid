# Type-resolution delegation — asking PostgreSQL what an expression is

**CHARTERED 2026-08-20. RE-CHARTERED 2026-08-24 on a different mechanism.
ALL FIVE STAGES LANDED 2026-08-24.** Written to be handed to a session with no other context:
everything needed to do the work is here or named here, and the numbers are
measurements rather than estimates. Where this document says "measured", it
was, and the date is given — re-deriving costs a day and changes nothing.

**What changed on 2026-08-24.** The original charter's transport was "splice a
probe column, append `WHERE false`, execute, read the RowDescription". That is
replaced by `PREPARE` + `pg_prepared_statements.result_types`, which reaches
statement kinds the old route cannot express at all. A second route —
substituting typed parameters for known operands — was measured and is folded
in as the first stage. The old charter's SAFETY RULE survives unchanged and is
still the most important section in this document.

**The endpoint is an engine mechanism, not an instrument.** `operandTypeSet`
must consult delegated types during a real walk. A stage that only teaches the
test suite to ask PostgreSQL is a checkpoint, never the destination.

## Charter

`operandTypeSet` in `src/query/nullability-walk.ts` answers "what could this
expression be" as a type SET, and every elimination downstream is decided on
it: which operator overload survives, which function signature is dispatched,
whether a totality verdict may be read. Where it answers `null` — no claim —
an operand that constrains nothing keeps every candidate, and
`resolveOperatorStrictness` falls back to strictness-by-consensus over the
survivors (`catalog-adapter.ts:937-952`). That consensus is sound and blunt.

**This charter's route: ask PostgreSQL.** `PREPARE` runs parse analysis —
including PostgreSQL's own overload resolution — and
`pg_prepared_statements.result_types` reports the resolved type of every
output column. No rows are touched, no plan is built, no user code runs.

The goal: `operandTypeSet` consults a pre-walk resolution round FIRST and falls
back to the symbolic union. Nothing is deleted.

## What is broken — measured 2026-08-24

The census printed by `tests/unit/query/type-unions.test.ts` over the fixture
corpus (509 fixtures):

```
readings:              3718
  unknown literal:     279   (correct — not a gap)
  no claim (null):     302   ← the subject
  singleton:          3115
  multi-member:         22
  carrying a pseudo:     2
not probeable by pg:  1520
CONTAINMENT VIOLATIONS:  0
```

Deduped per fixture and with the safety-refused categories removed, the residue
is **85 eligible expressions**, of which **60 are a bare `ColumnRef`**. Those 60,
classified by which refusal in `reExportedBaseColumn`
(`nullability-walk.ts:6959`) they hit — re-derived 2026-08-24, and the split
differs from the 2026-08-20 one:

```
 16  set operation / WITH RECURSIVE (no top-level targetList)
 14  the column is COMPUTED  (FuncCall 4, Coalesce 4, SubLink 2, Case 2, A_Expr 1, A_Const 1)
 11  pass-through, but the base relation did not resolve
  8  BASE TABLE with an alias column list — the rename is never undone
  4  unqualified column
  3  name not found in the owner's target list
  2  DML scope (excluded.name, a MERGE source)
  1  subquery alias column list
  1  base table, plain alias
```

**The 2026-08-20 charter said all of these are "references to a DERIVED
relation". That is wrong for the 8.** `FROM stock s1(k0, k1)` is a base table;
`s1.k0` IS `stock.qty` and the catalog knows its type. `operandTypeSet` hands
the QUERY's name to a catalog keyed under the CATALOG's name
(`nullability-walk.ts:6942`). The walk already owns the translation —
`entryCatalogColumn` (`nullability-walk.ts:7290`) — and uses it for every other
fact; `alias-column-list-carries-facts.sql` exists to prove the rename survives
into `attnotnull`, CHECK entailment, generation expressions and FK entailment.
`RelationEntry`'s own doc comment names **type OIDs** among the lookups keyed
by catalog names.

**Those 8 are a PREREQUISITE, not part of this charter.** They need no
delegation, no probe, no database — a call to an existing helper. Do them
first; they are being taken separately.

## The mechanism — `PREPARE`, measured 2026-08-24

PGlite 0.5.4 / PostgreSQL 18.3. `pg_prepared_statements` carries
`name, statement, prepare_time, parameter_types, result_types, from_sql,
generic_plans, custom_plans`.

Why it replaces `WHERE false`:

| | `WHERE false` + RowDescription | `PREPARE` + `result_types` |
|---|---|---|
| SELECT | works | works |
| INSERT / UPDATE / DELETE / MERGE | **cannot be expressed** — `insert … where false` is a syntax error | works; RETURNING types reported |
| side effects | executes (zero rows) | never executes — measured: table row count 1 before and after preparing four DML statements |
| planning | plans | `generic_plans=0 custom_plans=0` after PREPARE |
| volatile function in the target list | not called | not called |

The volatility row is a WASH and is recorded so nobody re-argues it: a
`WHERE false` SELECT does not call a volatile function in its target list
either (measured, an INSERT-ing SQL function, 0 rows appended by both routes).
The DML rows are the whole case.

Session hygiene: `PREPARE p AS …` then `DEALLOCATE p`. Utility statements
(`CREATE TABLE`) cannot be prepared; the walk does not type them.

## Two routes, and they compose

### Route A — SUBSTITUTE (cheap, no scope analysis)

Replace each operand whose type the walk ALREADY knows with `$n::TYPE`, deparse
the subexpression alone, `PREPARE SELECT <rewritten>`, read `result_types[0]`.

Measured 2026-08-24 over the 85 eligible: 60 are a bare `ColumnRef` and
therefore circular (you would need the answer to build the probe); 10 have a
leaf the walk cannot type; **15 attempted, 15 answered, 0 rejected**. Real
collapses, e.g. `oi.unit_price * oi.quantity` from
`["double precision","numeric","real"]` to `numeric`.

Pinning a sibling genuinely steers dispatch, which is the point:

```
$1::date    + $2::integer  ->  date
$1::integer + $2::integer  ->  integer
```

It also DEFUSES the unknown-literal trap in the one direction that matters:
`'2020-01-01'` alone resolves `text`, but `$1::date = '2020-01-01'` resolves
the literal as a date, because the context was rebuilt rather than discarded.

Route A needs no probe splicing, no owning-scope analysis, no set-operation
arity handling, and no deparse of the whole statement. It is much the cheaper
half.

### Route B — SPLICE (reaches the derived columns)

Splice a probe column into the target list of the SELECT that OWNS the node's
scope, propagate outward so every probe surfaces at the top, deparse once,
PREPARE once, read `result_types` by position.

Route B is what answers the 60 bare `ColumnRef`s. Route A cannot.

### How they compose — the argument for doing both

Route B types the derived columns. A typed derived column is then a TYPED LEAF,
which unblocks Route A on every composed expression above it — including the 10
currently blocked by an untypeable leaf. Route B gets column types; **Route A
converts column types into operator dispatch**, and dispatch is what the walk
actually consumes.

## The safety rule — the whole argument

*(Preserved from 2026-08-20. Unchanged by the mechanism swap.)*

A node may be delegated **only when its type is determined by its own
contents.** PostgreSQL will answer for any well-formed expression, but for a
node whose type comes from OUTSIDE, the standalone answer is not the in-context
answer:

```
'2020-01-01'                     standalone -> text
t.d = '2020-01-01'               in context -> the literal is a DATE
```

Typing the literal `text` eliminates the `date = date` operator — an over-drop,
the failure class that produced the only soundness bug this area has had
(`bare-name-gates-red.test.ts`).

**Predicate: refuse any node whose subtree contains no typed leaf.** A typed
leaf is a column reference, a cast, a numeric/boolean literal, or a call with a
known return. `t.d = '2020-01-01'` is safe — the literal is resolved by its
sibling, INSIDE the probe. A bare `'2020-01-01'`, or `COALESCE('a','b')`, or
`ARRAY['a','b']`, is not.

**Measured 2026-08-24: 135 nodes would have been typed had the rule not
refused them** — `A_Const`, `A_ArrayExpr`, `ParamRef`. The route types
everything it is pointed at. **The guard is not a detail of this design; it is
the design.** The two `A_ArrayExpr` in the residue (`ARRAY['a','b']`,
`ARRAY[NULL,NULL]`) are the ready-made guard tests: a probe answers `text[]` for
both and both must stay null. If an implementation types them, the rule is not
implemented.

## PROHIBITED — reading `parameter_types` back to discover a type

`PREPARE` reports inferred parameter types, and using them to LEARN an unknown
operand's type is unsound. Measured 2026-08-24:

```
select $1 * $2::integer   ->  parameter_types = ["integer","integer"]
```

PostgreSQL committed to `integer` for an operand that was unconstrained. If the
real operand is `numeric`, the correct overload has just been eliminated. This
is preference resolution, not a constraint — the same reason a bare `$1` comes
back `text`.

`parameter_types` is legitimate for exactly two things: a CONTAINMENT check in
the test suite, and confirming a type the engine already declared. The engine's
`paramTypes` — or a function body's `argTypes` — is the contract and always
wins.

## The application plan

Each stage lands in the walk and is witnessed by a fixture or scenario test.
No stage is complete as an instrument only.

**Stage 0 — prerequisite, not delegation.** The alias-column-list rename (the
8). No database involved.

**Stage 1 — the mechanism, plus Route A. LANDED 2026-08-24.**
`src/query/type-delegation.ts`, `ResolveColumnTypes` in `types.ts`,
`WalkOptions.resolveColumnTypes`, the `delegatedTypes` round wired into all
three entry points, and the consultation at the head of `operandTypeSetOf`.
Witnessed by `type-delegation-red.test.ts`, whose last case runs the whole
fixture corpus twice and holds containment.

Measured over the 511 fixtures: **11 probes** (deduped by expression text),
**multi-member readings 16 → 5**, **12 narrowed, 0 containment violations**.
Eleven round trips for the whole corpus is the number that matters for cost.

Three things the implementation settled that this charter had guessed at:

- **The round needs a PRELIMINARY WALK.** A substitution is only legitimate at
  a type the walk itself read, and the walk is the only thing that knows one —
  scope lives there, not in the AST. So the round runs the engine once with
  the audit sink, throws that pass away, and substitutes from its readings.
  Re-deriving leaf types inside the module would be a second opinion about
  every column, and the first disagreement between the two would be invisible.
- **`ParamRef` is refused as a TARGET and accepted as a SOURCE.** Never ask
  PostgreSQL what `$1` is (it guesses `text`); freely substitute `$n::numeric`
  when the engine DECLARED numeric. Treating the two as one rule cost the
  whole mixed-parameter arithmetic surface for nothing.
- **`SubLink` is opaque and must not be entered.** Rewriting the columns
  inside `(SELECT max(m2.i) FROM m AS m2)` yields a different expression that
  PostgreSQL answers confidently. The 2026-08-24 reach measurement of "5 of 10
  SubLinks answered" was arrived at by exactly that route and is WITHDRAWN;
  the honest reach is zero until Stage 3.

Also learned, and it shapes every later stage: **the walk never reads a
comparison node as an operand.** `t.d = '2020-01-01'` produces readings for
`t.d` and for the literal, not for the equality. So Route A cannot demonstrate
in-context literal resolution through `operandTypeSet` — the literal is
refused and stays refused, which is the correct outcome by the safety rule but
not the one this charter's prose implied.

Original specification follows.

- `src/query/types.ts`: the callback, importing no database type.

  ```ts
  /** Run one statement through parse analysis WITHOUT executing it, and
   *  return the resolved TYPE NAME of each output column, in order. The
   *  implementation prepares and deallocates; it appends nothing. */
  export type ResolveColumnTypes = (sql: string) => Promise<string[]>;
  ```

  Plus the `WalkOptions` field that carries it. The consumer maps driver OIDs
  through `format_type(oid, null)` so the engine never sees an OID.

- A new module in the shape of `subtree-evaluator.ts` — collection, the safety
  predicate, substitution, deparse, mapping back by node identity. It imports
  no database type.
- `nullability-walk.ts`: the async pre-walk round
  (`resolveStatementTypes(stmt, catalog, resolve) → Map<Node, string>`),
  wired into `inferNullability` / `inferQueryContract` /
  `inferNullabilityTraced` beside the three rounds that already exist, and the
  consultation at the top of `operandTypeSetOf`. **The walk stays
  synchronous**; answers go in as data, exactly as `statementEvaluation` does.
- Expected reach: the 15 measured, and the multi-member collapses.

**Stage 2 — Route B, top-level splicing. LANDED 2026-08-24.** `routeB` in
`type-delegation.ts`: splice the reference into the statement's own output
list (a SELECT's `targetList`, a DML statement's `returningList`), prepare,
read the answers off the END of `result_types`.

Measured: **52 residue bare ColumnRefs, 10 answered.** Corpus totals moved
from 12 narrowed / 11 probes to **22 narrowed / 52 probes, containment
violations still 0**.

**The staging in this charter was on the wrong axis, and Stage 2 proves it.**
Buckets 1–5 classify residue by WHY `reExportedBaseColumn` refused. Route B's
reach is decided by something else entirely — whether the QUALIFIER is visible
at the top level — and that cuts across every bucket. The top-level splice
answered `cte-self-join.sql: a.total` (bucket 1, "computed", assigned to Stage
4), `from-item-kinds.sql: v.a` and `extreme-recursive-category-analytics.sql:
cs.product_count` (bucket 2, set operations, assigned to Stage 3). Do not plan
the remaining stages by bucket.

The honest residue, by what actually blocks the probe:

```
 19  the statement has no output list to splice into
       (a top-level set operation, or DML with no RETURNING)
 10  the qualifier is bound MORE THAN ONCE in the statement
  9  the qualifier is not visible at the top level
       (bound inside a CTE or subquery — needs owning-scope splicing)
  4  the reference is unqualified
```

Two guards carry the soundness, both witnessed:

- **An alias bound twice is refused outright.** A top-level probe resolves
  against whichever binding is visible there, and the answer records nothing
  about which one the walk meant.
- **The position mapping is verified, not assumed.** The UNPROBED statement is
  prepared first, and a batch whose result count did not grow by exactly the
  number of probes is discarded rather than mapped; answers are read from the
  END, so a `SELECT *` ahead of them shifts nothing. A failed batch retries one
  probe at a time.

**Route B runs BEFORE Route A, and the order is load-bearing.** A column Route
B types becomes a typed LEAF, which is what lets Route A resolve the operators
above it. `abs(a.c + b.c)` over two `count(*)` subqueries is unreachable to
either route alone and falls out of the two in sequence — the composition this
charter argued for, now witnessed by a test.

**Stage 3 — set-operation arms. LANDED 2026-08-24.** A top-level set operation
has no `targetList` of its own, so `probePlacements` returns one placement PER
LEAF ARM: the probe goes into one arm and every other arm is padded with a
bare `NULL`. The arity rule is absolute (measured: a probe in one arm alone
fails with "each UNION query must have the same number of columns"), and a
bare NULL is `unknown`, so it takes the other arm's type and cannot change the
answer — measured in both arm positions. Which arm OWNS the reference is never
computed: each is tried, and the alias-uniqueness guard is what makes at most
one able to answer. A cheap syntactic filter skips an arm whose FROM binds
none of the qualifiers being asked about; that is cost only, and PostgreSQL
still adjudicates every probe sent.

**Stage 3 found a Stage 2 defect, and it was worth more than Stage 3.**
`outputList` looked for `returningList`; the parser emits `returningClause`
(renamed in the PG16 grammar, `{exprs: [...]}` rather than a bare array). The
whole DML branch of Route B therefore matched NOTHING, and every DML statement
looked like one with no output list. Silent under-reach — invisible to the
containment test, because a probe that never fires cannot answer wrongly.
Fixing the field name alone moved the corpus from **22 narrowed to 30**, and
multi-member readings from **16 → 5** to **16 → 2**.

Corpus after both: **1064 readings compared, 77 probes, 30 narrowed,
0 containment violations.**

**Set-op splicing has ZERO corpus reach, and the reason is worth recording.**
The eleven residues in top-level set operations are all refused by
PostgreSQL — `column "ci2.total_spent" must appear in the GROUP BY clause`.
The mechanism is correct and is witnessed by purpose-built cases in both arm
positions, on the same footing `UNION_CASES` stands on: the fixture corpus was
measured first and could not serve.

**The "synthesize a RETURNING" idea is DEAD — do not propose it again.** It
was motivated entirely by the `returningClause` artifact above. Measured
afterwards: a DML statement with no RETURNING has no output columns, so the
walk analyses no expressions and records NO type-set readings at all. There is
nothing to delegate. Pinned by a test.

**Stage 4 — inner scopes, by HOISTING. LANDED 2026-08-24.** `routeBHoist`.

A reference bound inside a CTE or subquery is invisible to a top-level probe,
and the charter's original plan was to thread a new column OUTWARD through
every enclosing scope — each with its own GROUP BY, alias column list and set
operations to satisfy. **Do not build that.** The opposite is far less
machinery and answers the same question: run the OWNING select as a statement
in its own right, carrying the statement's CTEs so its references still
resolve, with the probe appended to its target list.

Hoisting cannot change the answer — a column's type does not depend on the
scopes ABOVE the one that binds it, and everything the owning select itself
says is carried along untouched. What hoisting can do is BREAK: a correlated
reference to an enclosing query stops resolving and PostgreSQL refuses, which
is the outcome we want. Guarded by requiring exactly ONE select whose own FROM
binds the qualifier — the scope-level twin of the alias-uniqueness guard.

Measured: **15 tried, 7 answered**, and every one of the seven is a RECURSIVE
CTE — the case the 2026-08-20 charter singled out as "the hard one". The 8
refusals are 6 non-grouped columns under GROUP BY and 2 lost recursive
self-references.

**Validated against an independent oracle before shipping.** The same hoist
was run over columns the walk ALREADY types and had to reproduce them: 6
checked, 6 agreed, 0 disagreed. Thin, but it is the only check available —
these are null-set residues, so containment is vacuous over them.

Corpus after Stages 1–4: **1064 readings compared, 96 probes, 37 narrowed,
multi-member 16 → 2, 0 containment violations.**

## What four stages of delegation actually bought — measured 2026-08-24

**1868 output nullability claims compared with delegation ON and OFF. ZERO
changed.**

That is the honest headline and it is not a disappointment: it is exactly what
this charter's own worked example predicted — *"The verdict does not move.
What moves is what the verdict rests on."* Thirty-seven readings that were a
union or no claim at all are now the type PostgreSQL resolves, and the claims
that used to rest on the bare-name `TOTAL_OPERATORS` allowlist now rest on a
dispatched signature. Define a `public.+(boolean, boolean)` and the old
derivation flips; the new one does not.

The corpus-claims comparison is now a permanent assertion, and deliberately a
strict one: the list must be EMPTY. Delegation is expected to move claims
eventually, and when it does the change has to be looked at and re-pinned
rather than absorbed silently.

**If the next stage is judged by claims moved, it will look worthless. Judge
it by what the claims rest on.**

**Stage 5 — the GROUP BY escape. LANDED 2026-08-24.** Not "DML scopes": that
entry was written against the `returningList` artifact and Stage 3 dissolved
it. The measured blocker after Stage 4 was grouping — 16 of the 30 unanswered
residue references.

A probe naming a column the query does not group by is refused. **Grouping by
it as well is always legal and changes no type.** Applied only as a RETRY,
only to a select that ALREADY groups (adding a GROUP BY to a query that has
none would make every other target entry illegal), and only after the plain
form fails, so the ordinary path is untouched. It reaches the top-level
splice, the owning arm of a set operation, and the hoist alike.

**The aggregate wrapper was tried and is UNSOUND — do not reach for it.**
`(array_agg(c))[1]` looks like an elegant "make anything legal under GROUP BY"
trick. Over a `numeric[]` column it answers `numeric` where the truth is
`numeric[]`, because PostgreSQL arrays do not nest. It silently strips a
dimension, which is an over-drop.

**Stage 5 also found a Stage 4 defect worth more than the escape.**
`owningSelect` counted every wrapped `{SelectStmt: …}` TWICE — it considered
the body, then recursed into the wrapper's values and met the same body again
through the bare set-operation-arm branch. Two candidates reads as "bound at
two levels", so the uniqueness guard refused every hoist except the bare arms.
That is why Stage 4 answered only recursive CTEs: they were the sole shape the
bug let through.

Attribution, measured separately:

```
after Stage 4                 37 narrowed,  96 probes
+ owningSelect double-count   43 narrowed, 109 probes
+ GROUP BY escape             48 narrowed, 138 probes
```

Corpus after Stages 1–5: **48 narrowed, multi-member readings 16 → 0, 0
containment violations, and still 0 of 1868 output claims changed.**

A test written as a Stage 2 guard — "a qualifier not visible at the top level
drops to the union" — became a WIN here and was rewritten as one. The hoist is
precisely the mechanism that removes that limit.

## What is left, and it is not much

The unanswered residue is now dominated by the two guards, which is the right
place for it to be: a qualifier bound at more than one level (refused, because
a probe cannot say which the walk meant), an unqualified reference (refused,
because resolving it needs the scope this module does not have), and
`excluded.name`, whose qualifier is a pseudo-alias no FROM item binds.

None of those is a mechanism gap. Each is a case where the question itself is
ambiguous without the walk's scope, and the walk is where that lives.

A probe that raises must drop that node silently to the symbolic path and must
never fail the statement. Run the batch; on error, bisect or fall back
wholesale — measure which is cheaper before choosing.

Where a probe cannot go (establish the full list by measurement):

- a non-grouped column under `GROUP BY` — measured to raise; note that a probe
  BESIDE a legal grouped column is fine, so the constraint is on WHICH probe
- set-operation arms without symmetric splicing (Stage 3)
- anything `pgsql-deparser` cannot round-trip — read
  `docs/deparser-limitations.md` FIRST; that exploration has been done twice

## Non-goals

- **Deleting the symbolic path.** It is the answer for function bodies, CHECK
  expressions and generation expressions, which the walk analyses and which
  have no statement to prepare. It is also the fallback for every refused
  probe.
- **Reimplementing PostgreSQL's overload resolution.**
  `docs/type-aware-overloads.md` declares the tiebreak a non-goal; it stays one.
- **Changing what a type SET means.** Delegation produces singletons; the
  representation and the containment invariant are unchanged.
- **The `btreeStrategyOf` / `isEqualityComplement` bare-name gate.** Recorded in
  `docs/deferred-tasks.md`. Easier after this lands, which is why it is
  sequenced after and must not be started here.

## Boundaries — do not re-derive these

2026-08-20 unless marked.

- **The oracle.** `PREPARE` + `result_types` reports every output column's
  resolved type. No rows, no plan, no execution. *(2026-08-24)*
- **Batching works.** Six probe columns in one statement returned six types.
- **Inner scopes are reachable.** A probe added to a CTE's own target list and
  re-exported outward resolved correctly at the top.
- **Symmetric arm splicing works; asymmetric does not.** *(2026-08-24)*
- **The unknown-literal trap is real, and Route A is the only thing that sees
  through it.** The single most important fact in this document.
- **Domains smash on the wire.** A `pos` domain over `integer` reports
  `integer`. `wireRendering` in `tests/unit/query/type-unions.ts` normalizes
  both sides; reuse it rather than writing another.
- **Arrays do not nest.** `ARRAY[text[], text[]]` is `text[]`.
- **A bare `$1` is guessed** — PostgreSQL answered `text`. Declared parameter
  types win, always.
- **Route A's soundness evidence is THIN.** Only 4 expressions could be
  cross-checked against the in-context oracle (4 agreed, 0 disagreed).
  *(2026-08-24)* Widening that agreement set is Stage 1's real acceptance test,
  not the census delta.

## Do not touch — landed and pinned

- **The bare-name gates.** `bare-name-gates-red.test.ts`,
  `docs/function-overload-merge.md`.
- **The predicate-side scope threading.** `promotionOperatorIsStrict` receives a
  scope. Do not revert it to the name rule.
- **Member-list typing.** CASE / COALESCE / GREATEST / LEAST / ARRAY / ROW answer
  their member union. `closedCommonTypes` is NOT the rule to reuse; the reason is
  in `docs/deferred-tasks.md`.
- **The type-union census is PRINTED, not pinned**, on purpose: pinned counts
  make every precision improvement a maintenance chore. The CONTAINMENT
  invariant is the thing that must never regress.
- **The fixture search-path axis.** A fixture may declare
  `-- @search-path public, pg_catalog`, and all six fixture-reading suites honour
  it via `tests/unit/query/fixture-catalog.ts`. A new suite honours it or calls
  `refuseSearchPathFixture`.

## Two things that will bite if you do not know them

- **The catalog census has a second pass, with the evaluator ON.** If this work
  adds a member to `SubtreeEvaluationCatalog` (or `EVALUATION_CATALOG_ONLY`), a
  corpus statement must REACH it or `catalog-census.test.ts` fails by name. A
  new callback type — which is what `ResolveColumnTypes` should be — is not a
  face member and is not subject to it.
- **The per-column fixture parser matches `@notNull` and `@nullable` as bare
  substrings ANYWHERE in a line.** Writing either word in a fixture's header
  prose silently adds a phantom column and the fixture fails on arity. Spell
  them out in prose.

## The red suite

House protocol: write the target as `it.fails` FIRST, watch it fail for the
right reason, then fix, then flip it to plain `it` in the same commit as the
fix. A target that passes before the fix is worthless, and a target adjudicated
only against the engine is worse — **every one must carry PostgreSQL's own
answer in the assertion.** `bare-name-gates-red.test.ts` is the worked example.

Starting targets, all currently null and all in `type-union-cases.ts`:

- `oi.unit_price * oi.quantity` → `["numeric"]` (Route A, Stage 1, measured)
- `(SELECT max(m2.i) FROM m AS m2)` → `["integer"]`
- `a.total` / `b.total` in `cte-self-join.sql` → `["numeric"]` (Route B, Stage 4)
- `ct.depth` in any recursive fixture (Route B, Stage 3)
- `ARRAY['a','b']` and `ARRAY[NULL,NULL]` → **must stay null**, as guards

## How to know it worked

- `pnpm vitest run tests/unit/query/type-unions.test.ts` — containment must stay
  at zero violations and the `no claim` line must fall. The 2026-08-24 numbers
  above are the baseline.
- The Route-A-vs-in-context agreement count must RISE and disagreements must
  stay at zero. This matters more than the census.
- `pnpm vitest run` — specifically `generated-soundness.test.ts`, which
  falsifies notNull claims over 14964 generated queries per run. More precise
  types produce MORE notNull claims, and that direction can only be proven,
  never assumed. Watch the count move and watch violations stay at zero.
- `tests/unit/query/sqlc-corpus.test.ts` runs separately, ~30s.

## House constraints

- Work from `pgsid/`, not the workspace root. `pnpm` only, never `npx`.
- Measure before asserting. This codebase's documents say "measured" and mean
  it; do not add a claim you have not run.
- No engine change without a fixture or a scenario test that witnesses it.
- Scratch scripts go inside `pgsid/` (module resolution) and get deleted.
- `pnpm run lint` works as of 2026-08-24 (`eslint.config.js`) and must stay at
  zero. Its three type-aware promise rules exist because the pre-walk rounds are
  async and a floating one measures something other than what it reads as.
