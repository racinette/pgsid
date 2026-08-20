# Type-resolution delegation — asking PostgreSQL what an expression is

**CHARTERED 2026-08-20. NOT STARTED.** Written to be handed to a session with
no other context: everything needed to do the work is here or named here, and
the numbers are measurements rather than estimates. Where this document says
"measured", it was — re-deriving those costs a day and changes nothing.

## Charter

`operandTypeSet` in `src/query/nullability-walk.ts` answers "what could this
expression be" as a type SET, and every elimination downstream is decided on
it: which operator overload survives, which function signature is dispatched,
whether a totality verdict may be read. It answers `null` — no claim — for 76
distinct expressions in the fixture corpus, and `null` is where precision goes
to die: an operand that constrains nothing keeps every candidate, so the
verdict falls back to a bare-name rule whose holes are documented and real.

Those 76 are not one problem. They are a COLUMN whose relation is derived
(63), a scalar subquery (10), an array of unknowns (2, and correctly null),
and one expression inside a function body. Typing them symbolically means five
separate pieces of work with five separate boundaries.

**This charter is the other route: ask PostgreSQL.** A `SELECT … WHERE false`
statement reports the resolved type of every output column in its
RowDescription. Splice a probe column into the statement being analysed, run
it against zero rows, and the database performs its own overload resolution
and hands back the answer. One round trip, no data touched, no user code run.

The goal: `operandTypeSet` consults a pre-walk resolution round FIRST and
falls back to the symbolic union. Nothing is deleted.

## What is broken — measured 2026-08-20

The census printed by `tests/unit/query/type-unions.test.ts`, over the fixture
corpus, at the time of writing:

```
readings:              2854
  unknown literal:     218   (correct — not a gap)
  no claim (null):     311   ← the subject
  singleton:          2303
  multi-member:          22
  carrying a pseudo:      2
not probeable by pg:  1332
CONTAINMENT VIOLATIONS:  0
```

Those 311 readings are 76 distinct expressions once literals are excluded:

```
 63  ColumnRef      (20 answered by a naive top-level probe)
 10  SubLink        ( 9 answered)
  2  A_ArrayExpr    ( 2 answered — but these MUST stay null, see the safety rule)
  1  A_Expr         ( 0 answered — inside a function body, out of reach)
```

The 63 columns are all references to a DERIVED relation, failing for five
distinct reasons. `reExportedBaseColumn` (nullability-walk.ts) follows a
CTE or subquery's target list to a base column, and each bucket defeats it
differently:

1. **The column is computed** (~25). `a.total` is `sum(...)`, `pw.rnk` is a
   window function, `pa.new_price` is a CASE. The follower requires the target
   entry to be a bare `ColumnRef`, and there is no base column to look up.
2. **Recursive CTEs and set operations** (~15). A `UNION` SelectStmt has
   `larg`/`rarg` and no top-level `targetList`, so the follower returns on its
   first guard. Every `WITH RECURSIVE` is here by construction.
3. **Subquery alias column lists** (~7). `FROM (SELECT …) s(k0, k1)`.
4. **DML-specific scopes** (~6). `excluded.name`, a MERGE source, RETURNING.
5. **VALUES and function scans** (a few).

A representative worked example, in full, is at the end of this document.

## Why now — the blockers are discharged

**A live connection is guaranteed.** Stated by the project owner 2026-08-20.
The engine's "no `evaluate` → everything else identical" contract was the
standing objection to making types depend on the database; it no longer
applies. (The symbolic path still stays — see Non-goals — but for reasons
about REACH, not availability.)

**The instrument exists.** `tests/unit/query/type-unions.test.ts` holds a
CONTAINMENT invariant over both a purpose-built corpus and every expression
the fixture corpus produces: whatever PostgreSQL resolves an expression to
must be a member of the walk's set. It currently passes with zero violations.
A wrong delegation fails it on the first run. Use it as the safety net — it
was built for exactly this.

**The mechanics are proven.** See "Boundaries" below. Batching, inner-scope
splicing and the zero-row oracle were each measured working before this
charter was written.

## The design

### One pre-walk round, mirroring the one that already exists

The walk is deliberately SYNCHRONOUS. `statementEvaluation` in
nullability-walk.ts already solves this exact shape for the subtree evaluator:
an async round runs before the walk, its answers go in as data, and the walk
never awaits. Do the same.

```
resolveStatementTypes(stmt, catalog, resolve) → Map<Node, string>
```

1. Walk the AST collecting DELEGABLE nodes (see the safety rule).
2. For each, splice a probe column into the target list of the SELECT that
   OWNS its scope, propagating outward so every probe surfaces at the top.
3. Deparse once, run once, with `WHERE false` at the outermost level.
4. Read the RowDescription; map each probe position back to its node.

`operandTypeSet` then consults the map by node identity before its existing
logic, and falls back when there is no entry.

### The safety rule — the whole argument

A node may be delegated **only when its type is determined by its own
contents.** PostgreSQL will answer a probe for any well-formed expression,
but for a node whose type comes from OUTSIDE, the answer it gives standalone
is not the answer it gives in context:

```
'2020-01-01'                     standalone → text
t.d = '2020-01-01'               in context → the literal is a DATE
```

You cannot observe the second from outside; asking about the literal alone
returns `text`. Today `operandTypeSet` returns null there, which is humble and
correct. A delegation that returned `text` would eliminate the `date = date`
operator — an over-drop, which is the failure class that produced the only
soundness bug this area has had (see `bare-name-gates-red.test.ts`).

**Proposed predicate: refuse any node whose subtree contains no typed leaf.**
A typed leaf is a column reference, a cast, a numeric/boolean literal, or a
call with a known return. `t.d = '2020-01-01'` is safe — the literal is
resolved by its sibling, INSIDE the probe. A bare `'2020-01-01'`, or
`COALESCE('a','b')`, or `ARRAY['a','b']`, is not.

The two `A_ArrayExpr` in the residue are exactly this: `ARRAY['a','b']` and
`ARRAY[NULL,NULL]`. A probe answers `text[]` for both. Both must stay null.
They are the ready-made guard tests for this rule — if an implementation types
them, the rule is not implemented.

`ParamRef` is refused for a different reason: PostgreSQL guesses (a bare `$1`
came back `text`), and the engine's declared `paramTypes` — or the function
body's `argTypes` — is the contract. Delegation must never override it.

### Where probes cannot go

Not every scope accepts a probe column. Establish the list by measurement, but
expect at least:

- a non-grouped column under `GROUP BY` (the probe would raise)
- set-operation arms, where arity must match on both sides — this bites
  bucket 2, which is ~15 of the 63, and is the largest single unknown in
  this charter
- anything the deparser cannot round-trip

A probe that raises must drop that node silently to the symbolic path. It must
never fail the statement. Run the probe batch, and on error either bisect or
fall back wholesale — measure which is cheaper before choosing.

### The callback

`Evaluate` cannot serve. It is `(sql: string) => Promise<EvaluateRow>` — it
returns the first ROW, and this needs column TYPES over zero rows. Add a
sibling in the same style, importing no database type:

```ts
/** Run one statement and return the resolved TYPE NAME of each output
 *  column, in order. The implementation appends nothing; the caller has
 *  already made the statement return no rows. */
export type ResolveColumnTypes = (sql: string) => Promise<string[]>;
```

The consumer maps driver OIDs through `format_type(oid, null)`, so the engine
never sees an OID. For PGlite that is `r.fields.map(f => f.dataTypeID)` plus
one catalog lookup; `tests/unit/query/type-unions.ts` already does it.

## What must change

- `src/query/nullability-walk.ts` — the pre-walk round, its wiring into
  `inferNullability` / `inferQueryContract` / `inferNullabilityTraced`, and
  the consultation at the top of `operandTypeSetOf`.
- A new module is probably right for the collection + splicing + mapping, in
  the shape of `subtree-evaluator.ts`. It should import no database type.
- `src/query/types.ts` — the `ResolveColumnTypes` callback, and whatever
  `WalkOptions` field carries it.
- `tests/unit/query/type-union-cases.ts` — the pinned sets for the cases that
  start answering, and NEW guard cases for the safety rule.

## Non-goals

- **Deleting the symbolic path.** It is the answer for function bodies, CHECK
  expressions and generation expressions, which the walk analyses and which
  have no statement to splice a probe into. It is also the fallback for every
  refused probe. Nothing is removed by this work.
- **Reimplementing PostgreSQL's overload resolution.** The whole point is not
  to. `docs/type-aware-overloads.md` declares the tiebreak a non-goal and it
  stays one.
- **Changing what a type SET means.** Delegation produces singletons, but the
  representation and the containment invariant are unchanged.
- **The `btreeStrategyOf` / `isEqualityComplement` bare-name gate.** Recorded
  in `docs/deferred-tasks.md` as the next gate. It needs operand types at
  accessors that take only a name, so it is probably EASIER after this lands —
  which is exactly why it is sequenced after and must not be started here.

## Boundaries — do not re-derive these

Each was measured 2026-08-20. They are why this charter is short.

- **The oracle.** `SELECT … WHERE false` reports every output column's
  resolved type in the RowDescription. Zero rows, one round trip, no data.
- **Batching works.** Six probe columns in one statement returned six types.
- **Inner scopes are reachable.** A probe column added to a CTE's own target
  list and re-exported outward resolved correctly (`numeric`) at the top.
- **The unknown-literal trap is real and unobservable from outside.** See the
  safety rule. This is the single most important fact in this document.
- **Domains smash on the wire.** A `pos` domain over `integer` reports
  `integer`. `wireRendering` in `tests/unit/query/type-unions.ts` normalizes
  both sides; reuse it rather than writing another.
- **Arrays do not nest.** `ARRAY[text[], text[]]` is `text[]`, not `text[][]`.
- **A bare `$1` is guessed.** PostgreSQL answered `text`. Declared parameter
  types win, always.
- **Reach of the crudest possible probe: 31 of 76.** A top-level splice,
  SELECT statements only, answered 20 ColumnRefs and 9 SubLinks. The other 45
  include statements that harness did not handle at all (it bails on anything
  that is not a `SelectStmt`), so the REAL reach is unmeasured and measuring
  it is the first task, not a guess to inherit.

## Do not touch — landed and pinned 2026-08-20

Four pieces of work landed the same day this was chartered. Each is pinned by
tests that will fight an "improvement":

- **The bare-name gates.** Operators eliminate by operand type before
  dispatch; type names resolve by search path. `bare-name-gates-red.test.ts`,
  `docs/function-overload-merge.md`.
- **The predicate-side scope threading.** `promotionOperatorIsStrict` receives
  a scope now. Do not revert it to the name rule.
- **Member-list typing.** CASE / COALESCE / GREATEST / LEAST / ARRAY / ROW
  answer their member union. Note especially that `closedCommonTypes` is NOT
  the rule to reuse and the reason is recorded in `docs/deferred-tasks.md`.
- **The type-union suite itself.** The census is PRINTED, not pinned, on
  purpose: pinned counts would make every precision improvement a maintenance
  chore. Keep it that way. The CONTAINMENT invariant is the thing that must
  never regress.
- **The fixture search-path axis.** A fixture may declare
  `-- @search-path public, pg_catalog`, and all six suites that read fixtures
  honour it — per-path catalogs via `tests/unit/query/fixture-catalog.ts`,
  and the session set to match wherever the fixture is executed. If you add a
  suite that reads fixtures, honour it or call `refuseSearchPathFixture`; a
  directive some suites drop silently is worse than none.

## Two things that will bite if you do not know them

- **The catalog census has a second pass, with the evaluator ON.** If this
  work adds a member to `SubtreeEvaluationCatalog` (or to
  `EVALUATION_CATALOG_ONLY`), a corpus statement must REACH it or
  `catalog-census.test.ts` fails by name. That check was added 2026-08-20
  after two members were found dead behind the exemption, and it is
  deliberately hard to satisfy vacuously. A new callback type — which is
  what `ResolveColumnTypes` should be — is not a face member and is not
  subject to it.
- **The per-column fixture parser matches `@notNull` and `@nullable` as bare
  substrings ANYWHERE in a line.** Writing either word in a fixture's header
  prose silently adds a phantom column and the fixture fails with an
  arity mismatch. Spell them out in prose.

## The red suite

House protocol: write the target as `it.fails` FIRST, watch it fail for the
right reason, then fix, then flip it to plain `it` in the same commit as the
fix. A target that passes before the fix is worthless and a target adjudicated
only against the engine is worse — every one must carry PostgreSQL's own
answer in the assertion. `bare-name-gates-red.test.ts` is the worked example.

Starting targets, all currently null and all in `type-union-cases.ts`:

- `(SELECT max(m2.i) FROM m AS m2)` → `["integer"]` (already pinned null in
  the "still untyped" group; it is 9-of-10 top-level probeable, so SubLink is
  the cheapest first win)
- `a.total` / `b.total` in `cte-self-join.sql` → `["numeric"]`
- `ct.depth` in any recursive fixture → the set-operation bucket, the hard one
- `ARRAY['a','b']` and `ARRAY[NULL,NULL]` → **must stay null**, as guards

## Risk and ordering

1. **Measure the real reach first.** Build the probe harness properly (all
   statement kinds, owning-scope splicing) and re-run the residue census. That
   number decides whether buckets 2 and 4 are worth chasing.
2. **SubLink first.** 9 of 10 are top-level probeable and a scalar subquery
   has no scope subtleties beyond its own.
3. **Then the plain derived columns** — buckets 1, 3, 5.
4. **Then set operations and recursive CTEs**, or record why not.
5. **DML scopes last**, or defer with a reason.

The ordering risk worth naming: it is tempting to build the general mechanism
and then discover set-operation arity makes bucket 2 unreachable. Measure that
bucket before committing to a design that assumes it.

## How to know it worked

- `pnpm vitest run tests/unit/query/type-unions.test.ts` — containment must
  stay at zero violations, and the census's `no claim` line must fall. Report
  the before and after; the numbers in this document are the baseline.
- `pnpm vitest run` — the full suite, and specifically
  `generated-soundness.test.ts`, which falsifies 24089 notNull claims over
  14964 generated queries per run. More precise types produce MORE notNull
  claims, and that direction can only be proven, never assumed. Watch that
  count move and watch violations stay at zero.
- `tests/unit/query/sqlc-corpus.test.ts` runs separately and takes ~30s.

## House constraints

- Work from `pgsid/`, not the workspace root. `pnpm` only.
- Measure before asserting. This codebase's documents say "measured" and mean
  it; do not add a claim you have not run.
- No engine change without a fixture or a scenario test that witnesses it.
- Scratch scripts go inside `pgsid/` (module resolution) and get deleted.
- `pnpm lint` is broken repo-wide — no `eslint.config.js`. Not your doing and
  not your job.

## The worked example

`tests/unit/query/fixtures/cte-self-join.sql`:

```sql
WITH order_totals AS (
  SELECT oi.order_id                      AS order_id,
         sum(oi.unit_price * oi.quantity) AS total
  FROM order_items oi GROUP BY oi.order_id
)
SELECT a.order_id, a.total, b.total,
       a.total + b.total AS combined
FROM order_totals a JOIN order_totals b ON a.order_id < b.order_id
```

Today the walk reads:

```
oi.unit_price               => [numeric]
oi.quantity                 => [integer]
oi.unit_price * oi.quantity => [double precision, numeric, real]
a.total                     => null
b.total                     => null
```

`combined` still reads notNull — but through the bare-name allowlist, because
`+` is in `TOTAL_OPERATORS`. The trace carries no `operandTypes` fact at all.
The claim rests on nobody having defined a `+`; add one
`public.+(boolean, boolean)` to the schema and `combined` goes nullable.

With a probe column spliced into the CTE's own target list, PostgreSQL answers
`numeric` for `total`. `resolveOperatorTotality("+", [numeric], [numeric])`
then exact-matches one builtin and reads ITS totality. The verdict does not
move. What moves is what the verdict rests on — and that is the point of this
work, not the census delta.
