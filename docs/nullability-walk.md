# Output Column Nullability — Single Recursive Walk

## What this document is

The **design specification** for nullability inference, maintained alongside the implementation (`src/query/nullability-walk.ts`). It explains how the walk works and why each rule is shaped the way it is; the open items and deliberate bounds live in `docs/deferred-tasks.md`, and the verification methodology in `docs/witness-coverage.md`.

---

## 1. Problem

For query codegen, we need to know whether each output column of a SELECT is nullable (`T | null`) or non-null (`T`). PostgreSQL's PREPARE gives us output column names and type OIDs but **not** nullability. PG doesn't expose per-column nullability for prepared statement results. So we must infer it from the query AST + catalog.

Getting it wrong in either direction is bad:
- Saying non-null when it's nullable → incorrect types (runtime nulls where the type says there are none).
- Saying nullable when it's non-null → noisy types (`T | null` where `T` suffices).

The design principle is: **correct over precise**. Never say non-null when the result could be null. Saying nullable when it's provably non-null is acceptable imprecision — it's never wrong, just occasionally noisy.

---

## 2. Design constraints: why a single recursive walk

The walk must be a single leaf-first recursive traversal, not a collection of independent passes composed afterward. Three constraints force this:

### Constraint 1: CTE outputs must propagate

```sql
WITH x AS (SELECT a FROM t LEFT JOIN u ON u.id = t.id)
SELECT a FROM x
```

Here `a` inside `x` is nullable (because `u` is on the optional side of a LEFT JOIN inside the CTE body). The outer `SELECT a FROM x` must inherit that nullability. A flat per-scope analysis that doesn't thread results across scope boundaries would treat `x` as opaque — it would look up `catalog.notNull("x.a")`, but `x` is a CTE, not a catalog table. The answer is undefined unless the outer walk can recurse into the CTE body and read its results.

### Constraint 2: Scalar subqueries need inner-output propagation

```sql
SELECT (SELECT count(*) FROM t) AS cnt
```

`count(*)` is provably non-null (count never returns NULL). A rule that returns `false` for all scalar sublinks — without recursing into the subquery — gives the wrong answer (nullable). The walk must recurse into the subquery's output column and propagate its result, gated by a row-count test (see section 3).

### Constraint 3: WHERE guarantees apply to ColumnRefs *inside* expressions, not just at the top level

If the WHERE clause guarantees `t.col` non-null (via `t.col IS NOT NULL`), and an output column is `COALESCE(t.col, '')`, the guarantee affects `t.col` *inside* the COALESCE — which makes the whole COALESCE non-null. A pass that returns a flat set of "guaranteed column keys" and a composition step that only inspects the top-level expression node would miss this. The guarantee must be consulted *at the ColumnRef leaf*, during the expression walk, where the context (the containing expression) is available.

### The shape these constraints dictate

Cross-scope propagation (CTE body → outer ref, subquery output → SubLink leaf) and context-sensitive resolution (WHERE guarantee applied to a ColumnRef inside an expression) require threading scope and context *through* the traversal, not reconstructing them afterward. The solution: **one recursive walk per output column, leaf-first, that resolves each leaf against the current scope's facts and propagates nullability back up the expression tree.** The join-walk algorithm, WHERE predicate patterns, and expression rules table are all applied *inside* the walk's dispatch, not as standalone passes.

---

## 3. The algorithm, told as a story

We are given a SELECT statement (the AST) and a catalog (table/view column metadata + function metadata). We want, for each output column, a single boolean: is it provably non-null?

### Step 1 — Draw the scope. Build the address book.

We stand at the SELECT. We look at the FROM clause and walk the join tree. For each relation we encounter, we record:
- Its alias.
- What kind of thing it is: real table, view, subquery-in-FROM, CTE, VALUES, or table function.
- Its output columns (column names for tables/views from the catalog; for subqueries/CTEs, the output column names of the inner query; for VALUES, positional).
- Whether it's on the optional side of an outer join, as a three-state value assigned during the join-tree walk:
  - **REQUIRED** — the relation is not on the optional side of any outer join. `joinNullable = false`. INNER preserves both sides as required. LEFT makes the right side optional, RIGHT makes the left side optional, FULL makes both sides optional.
  - **OPTIONAL** — the relation is on the optional side of an outer join. `joinNullable = true`. A column from this alias is nullable regardless of the catalog's intrinsic `notNull` flag, because the join can produce NULL-extended rows. A WHERE predicate that guarantees the column is non-null can *promote* the alias back to REQUIRED (see ColumnRef leaf rules).
  - **NOT_FOUND** — the alias wasn't located in the address book at all. This is the defensive fallback for a ColumnRef that can't be resolved to any relation in the FROM clause (e.g. an unresolvable correlated reference). A NOT_FOUND ColumnRef is conservatively nullable. This should not happen for a valid query, but the walk returns nullable rather than crashing.

A scope keeps two distinct things, because they answer two different questions:

- **`aliases`** — qualifier → relation. This is what `a.id` resolves against.
- **`visible`** — the scope's output columns, in order. This is what `SELECT *`
  expands to and what an *unqualified* name resolves against.

They differ wherever a join merges columns. `a JOIN b USING (id)` makes one
merged `id` visible, followed by the left's remaining columns and then the
right's; the constituents' own copies stop being visible even though `a.id` and
`b.id` still resolve through `aliases`. NATURAL is the same rule over every
commonly-named column. This mirrors PostgreSQL, where a join contributes its own
column list while the base relations stay addressable.

Separating the two also settles ambiguity. A name matching more than one visible
column is one PostgreSQL rejects outright, so the walk reports **nullable**
rather than picking a candidate — otherwise the answer depends on FROM-clause
order, which produced opposite results for the same unrunnable query. The trace
records `resolved = AMBIGUOUS` with the candidates.

A **merged** column is not either constituent and has its own rule. Every row of
the join has at least one side present and the column is drawn from whichever
that is:

| Join | Merged column non-null when |
|---|---|
| INNER | either side's column is (both present, values equal) |
| LEFT | the left column is |
| RIGHT | the right column is |
| FULL | **both** are — which makes it strictly less nullable than either |

Because star expansion resolves each visible column through the same path as a
named reference, view definitions, WHERE promotion, null groups and branch
guards all apply to `SELECT *` too. They previously did not: a star over a view
lost every NOT NULL, since a view's own catalog columns are all
`attnotnull = false`.

An alias column list (`v(a, b)`, `f() AS t(x, y)`) renames positionally, and
partially: naming fewer columns than exist leaves the rest at their default,
and only naming *more* than exist is an error.

Alongside the join state we record a **null group**: the set of relations that are NULL-extended *together*. An outer join NULL-extends its optional side as a unit — in `(a JOIN b) LEFT JOIN c`, either both `a` and `b` are present or the whole composite row is absent; they can never be half-NULL-extended. Relations joined by INNER JOIN inherit the enclosing group; each side that an outer join makes optional starts a fresh one.

This matters for promotion: a WHERE predicate proving *one* member's row exists proves it for every member of its group. In `FROM o JOIN oi ON … RIGHT JOIN c ON …`, `WHERE o.id IS NOT NULL` promotes `oi` as well, because `o` and `oi` share a group.

**Views** get a third treatment, distinct from both tables and subqueries. PostgreSQL does not propagate `attnotnull` to view columns — every column of a view reads as nullable in `pg_attribute`, no matter what sits behind it. Reading the catalog flag would therefore make every view column nullable. Instead the walk analyzes the view's stored definition (pre-parsed into `NullabilityCatalog.viewAsts`) like a subquery and maps its output columns positionally onto the view's column list. A view with no parsed definition falls back to the catalog flag.

We do NOT analyze nullability yet. We're just building the address book: "in this scope, alias `a` means this table, alias `b` means that subquery, alias `c` means this table on the optional side of a LEFT JOIN."

We also note the WHERE and HAVING clauses of this scope — consulted during leaf resolution, not as a pre-pass — and whether this SELECT's `GROUP BY` guarantees non-empty groups (consulted by the aggregate dispatch).

**The presence fixpoint (`resolveJoinImplications`).** After the FROM walk, one eager pass turns join quals into row-implied predicates. Two facts reinforce each other to a fixed point: *present(R)* — relation R is never NULL-extended in any emitted row (initially: every REQUIRED relation) — and *implied(J)* — join J's ON qual held for every emitted row. An INNER join's qual is implied when its slice genuinely appears in every row: entered REQUIRED (no ancestor can null-extend it), or any subtree relation proven present. An outer join's qual held exactly for its matched rows, so it is implied once its null-extendable side is proven present (LEFT: a right-side relation; RIGHT: mirrored; FULL: one of each). An implied qual — or a WHERE/HAVING conjunct — that strictly references a relation's column proves that relation present, which can activate further joins: in `((t LEFT u) LEFT v) INNER ck ON ck.id = v.u_id`, the inner qual proves `v` present, which implies the middle LEFT's qual, which proves `u` present. Presence is written back to the join state, and implied quals join WHERE and HAVING as guarantee evidence at the leaves. This is what closes the strict-qual-over-a-NULL-extended-side imprecision: in `(t LEFT u) INNER v ON v.u_id = u.id`, no NULL-extended `u` row can pass the strict qual, and the fixpoint now knows it.

### Step 2 — List the output columns.

We go through the target list. For each entry:
- If it's `*` (A_Star), we expand it using the address book: one output column per visible column of every visible relation, in order. Each becomes, effectively, a ColumnRef.
- Otherwise it's one output column with a name (from the AS clause or inferred) and an expression subtree.

We now have a flat list of output columns. Each has a name and an AST expression subtree.

### Step 3 — For each output column, recurse into its subtree and decide.

This is the heart. We take one output column, walk its expression **bottom-up (leaf-first)**. At each node we apply a rule. The rule may recurse into children. Leaves resolve to a boolean. Internal nodes combine child booleans. We climb back up and the root's boolean is the answer for that output column.

### What happens at a leaf:

**Literal (`A_Const`):** resolves itself. `'foo'` → non-null. `42` → non-null. `true` → non-null. The `NULL` literal (tagged `isnull: true` in the AST) → nullable. No recursion needed.

**ColumnRef:** resolves itself against the current scope's address book. We look up which alias this column belongs to, and which column of that alias. Then we combine facts:
- Is this column guaranteed non-null by a row-implied predicate? The evidence set is the scope's WHERE, its HAVING (every emitted row passed it — including the zero-input aggregate row, which is why HAVING is exempt from the `rowsImplyWhere` gate on parameter narrowing), and every ON qual the presence fixpoint proved implied. Within a predicate: `IS NOT NULL`, strict comparisons (the shared total+strict operator set), `IN` (tested value only), and `BETWEEN`, inside AND-conjuncts — and inside an OR only by **intersection**: every disjunct must prove the column, since any arm could have been the TRUE one (`col = 'a' OR col = 'b'` promotes; the optional-filter idiom's `IS NULL` arm proves nothing and correctly blocks it). The column need not be a *direct* operand: the strict-expression closure attributes through strict operators, strict functions (catalog metadata, or the measured `STRICT_BUILTIN_FUNCTIONS` set), `NULLIF`'s left side, casts, and `COALESCE` by intersection — `length(col) > 0` proves `col`. If the column's alias is on the optional side of an outer join and such a predicate exists, the alias is **promoted** to required. This check happens *here*, during leaf resolution, not as a pre-pass. In UPDATE RETURNING scopes, SET columns are masked from this evidence: the WHERE tested the OLD row and RETURNING reports the NEW one (`update-set-mask.sql` is the live counterexample).
- If the alias is a real table/view: read the catalog's `notNull` flag for that column. Combine with the join nullability: `notNull = catalog.notNull(col) && !joinNullable(alias)` (after promotion). If the WHERE guarantees it, override to non-null. A **GENERATED column** whose flag is false gets one more chance: its generation expression (pre-parsed from the snapshot) is walked with refs bound to this entry — sound because the stored row IS the read row, which also lets WHERE promotion, guards, and the written-value map compose into it — but only under the same `!joinNullable` gate, because a NULL-extended row nulls a generated column however non-null its expression is per-row (`generated-left-join-gate.sql`). A plain nullable column gets the same last chance through the table's validated CHECK constraints — the entailment kernel, described in its own section below.
- If the alias is a subquery or CTE: **recurse** — run this whole procedure (steps 1–3) on the inner scope, memoize the per-output-column results, and read the Nth one. This is how nullability threads across scope boundaries.
- If the alias is a VALUES list: each column's nullability is the nullability of the corresponding expression in that row of the VALUES list.
- If none of the above give non-null, the leaf is nullable.

**Scalar subquery (`SubLink` with `subLinkType: "EXPR_SUBLINK"`):** gets a special rule based on row-count behavior:
- Can this subquery return zero rows? If yes (plain `FROM table` with no aggregate — it can return nothing), the result is NULL when no row matches, regardless of what the inner output column's nullability is. The leaf is nullable. We stop — we don't recurse into it.
- If the subquery is **single-row-guaranteed** (aggregate without GROUP BY, or no FROM clause), we recurse into its single output column and propagate the result. E.g. `(SELECT count(*) FROM t)` → single-row (count is an aggregate) → recurse → count(*) is non-null → the scalar subquery is non-null.
- `LIMIT 1` does NOT make a subquery single-row-guaranteed — it makes it zero-or-one row, which still includes zero → nullable.

**EXISTS / NOT EXISTS subquery (`SubLink` with `subLinkType: "EXISTS_SUBLINK"`):** resolves to non-null (returns bool, never NULL). No recursion into the subquery needed.

**ALL_SUBLINK / ANY_SUBLINK:** resolves to non-null (returns bool). No recursion.

**ARRAY_SUBLINK:** resolves to non-null (ARRAY constructor of the subquery results; never NULL even when empty).

### What happens at an internal node:

We recurse into the children first (each child resolves to a boolean by the same procedure), then apply the node's rule:

| Node type | Rule | Rationale |
|---|---|---|
| `A_Const` (literal) | non-null, except `NULL` literal (`isnull: true`) → nullable | Literals are never NULL |
| `ColumnRef` | resolve against scope (see leaf rules above) | Conservative; intrinsic + join + WHERE + cross-scope |
| `NullTest` (IS NULL / IS NOT NULL) | non-null | Always returns bool |
| `SubLink` EXISTS | non-null | Only asks whether a row came back; never inspects a value |
| `SubLink` ANY/ALL (incl. `IN`, `NOT IN`) | non-null iff the left operand **and** every subquery output column are non-null | The per-row comparisons are OR-ed/AND-ed under three-valued logic, so `1 IN (SELECT NULL)` is NULL |
| `SubLink` EXPR (scalar) | single-row test + recurse (see leaf rules above) | Row count matters |
| `SubLink` ARRAY | non-null | ARRAY constructor never NULL |
| `TypeCast` | recurse into `arg` | Cast preserves nullability |
| `CoalesceExpr` | non-null if any arg is non-null | `args.some(recurse)` |
| `CaseExpr` | non-null if there is an `ELSE` **and** every branch result is non-null, each walked under its branch guard | Exactly one branch produces the value; without `ELSE`, an unmatched CASE is NULL. See "Branch guards" |
| `A_Expr` (comparison/math) | non-null if the operator is *total* and all operands are non-null | See "Total operators" below |
| `BoolExpr` AND/OR | non-null if all operands are non-null | Three-valued logic only produces NULL from a NULL operand |
| `BoolExpr` NOT | recurse into arg | `NOT EXISTS` → non-null; `NOT (nullable)` → nullable |
| `FuncCall` | see function rules below | Varies by function kind |
| `RowExpr` | non-null | Row constructor never NULL (even with NULL elements) |
| `A_ArrayExpr` | non-null | ARRAY constructor never NULL |
| `MinMaxExpr` (GREATEST/LEAST) | non-null if **any** arg is non-null | GREATEST/LEAST skip NULL args; NULL only when every arg is NULL |
| `BooleanTest` (`IS [NOT] TRUE/FALSE/UNKNOWN`) | non-null | Collapses three-valued logic to a plain boolean |
| `SQLValueFunction` (`CURRENT_DATE`, `SESSION_USER`, …) | non-null, except `CURRENT_SCHEMA` | Always defined; `CURRENT_SCHEMA` is NULL when the search path resolves to nothing |
| `GroupingFunc` (`GROUPING(...)`) | non-null | Returns a bitmask, even in super-aggregate rows |
| `ScalarArrayOp` | nullable | Conservative |
| `NamedArgExpr` | recurse into `arg` | Unwrap and recurse |
| `CollateClause` | recurse into `arg` | Collation preserves nullability |
| Unknown node | nullable | Conservative — add handler when encountered |

### Total operators

`A_Expr` propagation requires the operator to be **total**: never NULL for non-null
operands. Strictness is not the criterion — a strict operator returns NULL for NULL
input, which says nothing about non-null input. `jsonb -> 'missing'` and
`jsonb ->> 'missing'` are both strict and both return NULL for two non-null operands.

**Custom operators** (Wave 3): a name outside the allowlist — or any
schema-qualified name — resolves through the snapshot's `pg_operator` capture
by the single-candidate policy, and the RESULT dispatches the operator's
backing function through the full FuncCall machinery (domain returns,
`LANGUAGE sql` body inlining, the strict rules), with the operands as
arguments. The fixture's non-strict `===` analyses to notNull via its
`SELECT true` body while still promoting nothing; the strict `====` gates
promotion and narrowing exactly like a builtin comparison
(`custom-operator.sql`). Totality is never inferred from strictness — the
WHERE-side gate needs only strictness, the output side only what the
function's own dispatch can prove.

The allowlist (`TOTAL_OPERATORS`) therefore covers only arithmetic (`+ - * / % ^`),
comparison (`= <> != < > <= >=`), concatenation (`||`), and pattern matching
(`~~ !~~ ~~* !~~* ~ !~ ~* !~*`). An operator that raises on bad input still counts as
total: division by zero is an error, not a NULL. Schema-qualified operators are never
matched, since a user-defined operator can shadow a built-in symbol.

By `A_Expr` kind:

| Kind | Rule |
|---|---|
| `AEXPR_OP` | non-null if the operator is on the allowlist and all operands are non-null |
| `AEXPR_DISTINCT` / `AEXPR_NOT_DISTINCT` | always non-null — `IS [NOT] DISTINCT FROM` is NULL-aware and yields a plain boolean |
| `AEXPR_IN`, `AEXPR_LIKE`, `AEXPR_ILIKE`, `AEXPR_SIMILAR`, `AEXPR_BETWEEN` family | non-null if all operands are non-null |
| `AEXPR_NULLIF` | nullable — `NULLIF(a, b)` is NULL exactly when `a = b` |
| `AEXPR_OP_ANY` / `AEXPR_OP_ALL` | nullable — a NULL array element yields NULL with no match |

### Branch guards (path-sensitive CASE)

A `CASE` branch result is walked under the conditions that must hold for that
branch to run, so a nullable column can read as non-null inside a branch that
tested it. Branch *i* is walked with conditions `1..i-1` known **not TRUE** and
condition *i* known **TRUE**; the `ELSE` with every condition known not TRUE.

A guard is pinned to the scope its aliases were written against and applies only
to a column that resolved in that same scope, so an inner query re-using an alias
name cannot pick up an outer guard. Guards are also cleared at every statement
boundary: statement results are memoized by AST-node identity, and a CTE analyzed
once inside a branch is reused everywhere else.

**Positive guards** (condition TRUE) reuse the WHERE analyzer unchanged — a branch
runs only when its condition is TRUE, and a TRUE strict predicate implies its
operands are non-null. This is the same inference WHERE promotion makes, including
promoting an OPTIONAL alias to REQUIRED for the rest of the branch.

**Negative guards** (condition not TRUE) are much weaker, and getting this wrong is
the easiest way to make the walk unsound. A branch is skipped when its condition is
FALSE *or NULL*, so falsity alone proves nothing:

```sql
CASE WHEN a > 5 THEN 'big' ELSE a END   -- a NULL `a` makes the condition NULL,
                                        -- so the ELSE sees `a` still NULL
```

Only conditions that can never evaluate to NULL support an inference here:

| Condition shape | Not-TRUE implies |
|---|---|
| `col IS NULL` | `col` is non-null — `IS NULL` is total, so not-TRUE means FALSE |
| `A OR B` | every disjunct is not TRUE (a TRUE disjunct would make the OR TRUE), so any total disjunct yields its inference |
| `A AND B` | nothing — some conjunct failed, but not which one |

The simple form `CASE x WHEN v THEN ...` compares values rather than evaluating
predicates, so its `WHEN` expressions are not conditions and contribute no guards.

### CHECK-constraint entailment (conditional nullability)

A plain nullable table column whose catalog flag says nothing gets one more
chance, after the generation-expression rule: the table's **validated** CHECK
constraints. `WHERE status = 'housed'` over a status-discriminated table whose
CHECK spells out which arms force `arrived_at` non-null is a bread-and-butter
query shape, and the derivation is pure syntax — no expression is ever
evaluated (the register's rung-ladder ruling stands).

The kernel (`src/query/check-entailment.ts`) works over three judgments in
three-valued logic, seeded by two fact sources of deliberately different
strength:

- **TRUE facts** — the row-implied evidence: the `checkWhereGuarantee` list
  (WHERE conjuncts, HAVING, implied ON quals) plus the scope's taken branch
  guards (`check-guard-entailment.sql`) — a branch runs only when its
  condition is TRUE, the same strength as a WHERE conjunct. Disjunctive
  conjuncts (OR, multi-element IN, `= ANY` over an array literal) become
  **OR-facts**: TRUE(a ∨ b) names no arm, but it makes any superset
  disjunction TRUE, so an OR-fact whose every arm matches an arm of a
  CHECK-side OR/ANY discharges it (`check-or-subset.sql`,
  `check-or-verbatim.sql`; the non-subset negative
  `check-or-not-subset.sql`). NOT-wrapped conjuncts contribute FALSE facts,
  De Morgan included (a negated OR falsifies every disjunct).
- **notFALSE facts** — each validated CHECK expression. Not TRUE: PostgreSQL
  admits a row whose CHECK evaluates NULL, measured and pinned in
  `check-constraint-pins.test.ts`.

Leaves match by **identity over a closed deterministic fragment** (builtin
comparisons by bare name, `IS [NOT] NULL`, `BETWEEN` desugared, bare boolean
columns; refs alias-normalized, offsets ignored, function calls never match —
a CHECK ran at WRITE time, the WHERE holds at READ time, and only expressions
deterministic over the stored row may carry a truth value between the two).
Literal casts join the identity check: the deparser renders `'housed'::text`
where the user's WHERE has the bare literal, and the two equate only when the
cast names the column's own type — an explicit cast to a different type
selects a different operator (a citext column's `=` can be TRUE where a
bytewise comparison of the same tokens is FALSE), so it refuses. The
**builtin negator pairing** runs in both directions: TRUE(`status =
'housed'`) falsifies `status <> 'housed'` with no literal values compared —
which is what makes implication-as-OR
(`CHECK (status <> 'housed' OR room IS NOT NULL)`) work without the banned
literal distinctness — and a FALSE strict comparison certifies its negation
TRUE, since evaluating to FALSE (not NULL) proves the operands were non-null
(`check-negator-dual.sql`). On top sit plain 3VL algebra
(notFALSE distributes over AND, an OR whose other disjuncts are FALSE passes
notFALSE to the survivor, NOT flips), searched-CASE arm selection (arm *i*
inherits notFALSE when conditions before it are FALSE and its own is TRUE —
the ELSE when all are FALSE; a condition neither provable ends the
derivation, which is exactly the distinctness asymmetry keeping the negative
arms dark), `= ANY (ARRAY[...])` decomposed as the OR the deparser rendered
it from, and totality: notFALSE(`col IS NOT NULL`) ⇒ TRUE ⇒ the goal.

The gates:

- **joinState** (shared with generated columns): a NULL-extended row
  satisfies no CHECK, so the entry must not be OPTIONAL after promotion
  (`check-left-join-gate.sql` is the pinned counterexample;
  `check-left-join-promoted.sql` its complement).
- **Row consistency across DML** — a returned DML row has TWO stored,
  CHECK-satisfying versions (OLD and NEW), and every fact must hold on the
  row a derivation runs against, with the goal equal to its value there.
  WHERE-side facts tested the OLD row and transfer to NEW only through
  non-SET columns; guard facts describe the row the guarded expression reads
  (NEW in RETURNING, OLD in a SET expression — the `dmlOldRowRead` flag).
  The walk therefore runs up to two channels: the **NEW row** (WHERE-side
  facts SET-masked, guards free, any goal) and the **OLD row** (WHERE-side
  facts free, guards masked, goal restricted to non-SET columns, whose OLD
  value IS the returned one). `check-update-set-mask.sql` pins both in one
  statement — the discriminator-moving UPDATE whose `arrived_at` must stay
  nullable (the NEW mask) while `room` proves notNull (the OLD channel);
  `check-set-expr-old-read.sql` pins the SET-expression read context, where
  a single unmasked OLD run is sound because every fact source tested that
  same row.

Exclusions: `convalidated=false` covers NOT VALID and PG18 NOT ENFORCED both
(`check-not-valid.sql`, `check-not-enforced.sql`); PG18's `contype='n'`
NOT NULL constraint rows — which the snapshot's type mapping folds into
"check" — are dropped by the PARSED node type in the adapter; domain CHECKs
are a different mechanism (NOT NULL domains, already consumed); inheritance
and partitions need nothing special, because children carry their own
`pg_constraint` rows.

### Generated CTE columns (SEARCH / CYCLE)

A recursive CTE's `SEARCH DEPTH FIRST BY id SET ord` appends one ordering column,
and `CYCLE id SET is_cycle USING path` appends a cycle mark and a path array.
None appear in either branch's target list — the recursion machinery generates
and always populates them — so all are non-null and must be appended to the
CTE's output. Missing them makes `SELECT *` over the CTE the wrong shape.

### MERGE ... RETURNING

`MergeStmt` is dispatched like the other DML forms, arm-aware since Wave 4.
The target relation is REQUIRED (RETURNING reports the row actually
written). The **source is OPTIONAL only when a `NOT MATCHED BY SOURCE` arm
exists** — that is the sole arm that can null-extend it; every other
row-producing arm either matched the source or was driven by it, so without
one the source is REQUIRED and its columns keep base nullability. When
EVERY arm is MATCHED-kind, the join condition is row-implied evidence like
a DML WHERE (parameters narrow, columns promote, SET columns masked).
Written values intersect per row-producing arm exactly like ON CONFLICT's
two paths: UPDATE arms contribute SET expressions, INSERT arms their
positional values, a DELETE arm voids the map (it returns the OLD row),
and DO NOTHING arms are excluded (they produce no row).

### Set-returning functions in FROM

A `RangeFunction` resolves its columns from the function's `pg_get_function_result`
string: `SETOF <table>` expands to that relation's columns, `SETOF <composite>` to the
composite type's fields (composites are resolved separately from relations, so
that `FROM some_type` does not resolve as a table),
`TABLE(a t1, b t2)` to the declared list, and anything else to a single column.

The nullability rule is a **negative** one, and it is the opposite of what the
table declaration suggests. A `SETOF <table>` result carries the table's *row
type*, which describes column types and nothing else — **NOT NULL constraints do
not travel with it.** A function declared `RETURNS SETOF order_items` can return
a row of all NULLs without error, even though four of those columns are NOT NULL
in the table. Reading `attnotnull` here would be unsound, so every column of a
composite result is nullable.

Two things do survive, because both are properties of the *type* rather than of
the table:

- **a domain's NOT NULL**, which is still enforced on function output — in a
  `TABLE(...)` column, in a `SETOF <domain>` element, and in a domain-typed
  column of a `SETOF <table>` result;
- **`WITH ORDINALITY`**, a generated `bigint` counter that is always present.

Resolving the columns matters even where they all come out nullable: without it
`SELECT * FROM f()` expands to zero columns and the statement's output shape is
wrong, which for a codegen consumer is worse than an imprecise flag.

Naming follows PostgreSQL: a composite result keeps its own column names and the
alias names only the relation, while a scalar result takes the alias as its
column name. An explicit alias list (`f() AS t(a, b)`) renames positionally.

### Where the recursion crosses scopes:

When a ColumnRef leaf points at a subquery-in-FROM or a CTE, we recurse into that inner scope (steps 1–3 again) and **memoize**. The inner scope's own output columns get resolved by the same procedure; their results are cached and reused by every outer reference. A CTE referenced N times in the outer FROM is analyzed once; all N ColumnRefs read from the cache.

Correlated subqueries — where an inner scope's ColumnRef can't be resolved locally and falls back to the enclosing scope — work because the enclosing scope's results are already memoized by the time we resolve the inner one (we resolve innermost-first).

### Step 4 — Emit the per-output-column booleans.

Once step 3 has run for every output column, we emit the result: a list of `{ name, notNull }`, one per output column, in target-list order.

---

## 4. Function rules (FuncCall dispatch)

When the walk arrives at a `FuncCall` node, it recurses into the function's arguments first (each arg resolves to a boolean), then looks up the function in the catalog by name + arg types and applies the appropriate rule. The rules are checked **in priority order** — the first match wins:

### Priority 1: NOT NULL domain return

If the function's return type is a domain whose `notNull` flag is set (from `DomainInfo.notNull` in the catalog), the result is **non-null**. PG enforces domain constraints at the call boundary — if the function body returns NULL, PG throws an error. This wins over everything below. This is the PG-native escape hatch for guaranteeing non-null returns from user functions (especially `LANGUAGE plpgsql` whose bodies we can't statically analyze).

### Priority 2: `count`

If `agg_star` is true (`count(*)`), or the function name is `count` and `isAggregate` is true → **non-null**. `count` never returns NULL (it returns 0 over zero rows).

### Priority 3: Aggregate (built-in or user-defined, other than count)

The default is **nullable** — an aggregate over zero rows returns NULL. Two things override it:

**Non-null `INITCOND`.** `FunctionInfo.aggInitVal` carries `pg_aggregate.agginitval`. With no rows to transition, the initial state *is* the result, so an aggregate declared with a non-null `INITCOND` is non-null even over empty input.

**Grouping columns are a separate question.** ROLLUP / CUBE / GROUPING SETS also NULL out the *grouping* columns of every super-aggregate row, independently of the aggregates: `GROUP BY ROLLUP(id)` emits a grand-total row whose `id` is NULL even though the column is NOT NULL in the catalog. `Scope.groupingSetColumns` records the columns nested inside a grouping-set construct, and a ColumnRef matching one is nullable — overriding both the catalog flag and any WHERE guarantee, since the row exists and the column is merely blanked. Plain terms alongside a construct (`GROUP BY a, ROLLUP(b)`) appear in every generated grouping set and are unaffected.

**A group that cannot be empty.** When all of the following hold, the aggregate is non-null:

- the enclosing SELECT has a plain `GROUP BY` (`Scope.groupGuaranteesNonEmpty`). ROLLUP / CUBE / GROUPING SETS do *not* qualify: they emit super-aggregate rows over the empty grouping set, so an empty input still produces one row of NULLs;
- there is no `FILTER (WHERE ...)` — the filter can exclude every row of the group, and `sum(x) FILTER (WHERE false)` is NULL;
- the aggregate maps "at least one non-null input" to a non-null result (`NON_NULL_OVER_NONEMPTY_AGGREGATES`: `sum`, `avg`, `min`, `max`, `bit_and`, `bit_or`, `bool_and`, `bool_or`, `every`, `array_agg`, `string_agg`, `json_agg`, `jsonb_agg`). `stddev`, `var_samp`, `corr` and the `regr_*` family are excluded — they are undefined (NULL) for a single-row group, so a non-empty group is not enough;
- every argument is non-null, so the aggregate sees no NULLs to skip.

**Aggregate definition variants** (moving-aggregate mode, ordered-set, partial aggregation, polymorphic) — see https://www.postgresql.org/docs/current/xaggr.html. None of these variants change the nullability question; they're about how state is computed, not whether the result can be NULL. The only thing that decides null-over-empty is `agginitval` (present + non-null → that's the empty result; absent/NULL → NULL over empty) and `count` (special-cased, never NULL).

### Priority 4: Strict scalar function

If `isAggregate` is false and `strict` is true (from `FunctionInfo.strict` in the catalog) → the result is non-null only if **all arguments resolved non-null**. We have the children's resolved booleans from the recursion; we AND them. `lower(c.name)` where `c` is on the optional side of a LEFT JOIN → `c.name` nullable → `lower(c.name)` nullable. `lower('lit')` → non-null arg → non-null. This is correct in the nullable direction: a strict function with a NULL input always returns NULL.

### Priority 5: `LANGUAGE sql` user function

If the function is a user-defined `LANGUAGE sql` function → **recurse into the function body**. Parse the body (available in `FunctionInfo.body` / `FunctionInfo.definition`), find the last statement's output expression, and run the nullability walk on it. This gives precise results for `LANGUAGE sql` functions — their bodies are plain SQL we can analyze.

**Body format handling:** `FunctionInfo.body` (`prosrc`) can be in two formats:
- **Old-style** (pre-PG 14 default): raw SQL, e.g. `SELECT $1 * 2`. Parse directly with `parseSql`.
- **SQL-standard** (PG 14+ `BEGIN ATOMIC`): `BEGIN ATOMIC\n  SELECT $1 * 2;\nEND`. Parse directly first; if parsing fails, strip the `BEGIN ATOMIC ... END` wrapper and parse the inner statements.

In both cases, the last statement's output expression is the function's return value. Find it, walk it with the same procedure. Arguments to the function are treated as ColumnRef-like leaves whose nullability comes from the call site's resolved arg nullability (mapped by parameter name/position).

**Implementation note:** this means the walk may parse and analyze function bodies, not just the query AST. Transitive recursion (a `LANGUAGE sql` function calling another `LANGUAGE sql` function) is supported with cycle detection: maintain a set of function names currently being analyzed; if a name re-enters, treat it as conservative nullable.

### Priority 6: Non-strict scalar / `LANGUAGE plpgsql` / unknown

Conservative **nullable**. We can't determine strictness from the AST alone for non-strict functions, and `LANGUAGE plpgsql` bodies are not statically analyzable for nullability. The NOT NULL domain return path (priority 1) is the escape hatch for these cases — a user who wants a non-null guarantee from a plpgsql function declares the return type as a NOT NULL domain.

### Priority 6b: `pg_catalog` built-in

The catalog snapshot covers user schemas only, so built-ins arrive with no `FunctionInfo`. Falling through to "unknown → nullable" is safe but badly imprecise for everyday expressions, so three curated tables are consulted — **only when the catalog has no entry for the name**, meaning a user-defined function that shadows a built-in always wins with its real metadata.

| Table | Rule | Examples |
|---|---|---|
| `ALWAYS_NOT_NULL_BUILTINS` | non-null regardless of arguments | `now()`, `random()`, `gen_random_uuid()`, `concat`, `jsonb_build_object` |
| `FIRST_ARG_BUILTINS` | non-null iff the *first* argument is | `concat_ws`, `format` |
| `STRICT_TOTAL_BUILTINS` | non-null iff *every* argument is | `upper`, `length`, `round`, `substr`, `split_part`, `date_part` |

Membership requires being **total**, not merely strict — the same distinction that governs `TOTAL_OPERATORS`. Excluded on that basis: `array_length` / `array_ndims` (NULL for an empty array or bad dimension) and `jsonb_extract_path(_text)` (NULL for a missing path), all of which are strict yet return NULL for non-null arguments.

`concat` is the mirror image: it is *not* strict and ignores NULL arguments entirely, so all-NULL input yields `''` rather than NULL.

### Priority 7: Unknown function

Conservative **nullable**, with one hardcoded exception: `count` (handled in priority 2) since it's so common and never nullable.

### Window functions

A `FuncCall` with an `OVER` clause is dispatched before the aggregate rule, because the ranking functions share names with entries in `AGGREGATE_NAMES`.

- **Ranking functions** (`NEVER_NULL_WINDOW_FNS`: `row_number`, `rank`, `dense_rank`, `percent_rank`, `cume_dist`) → **non-null**. Every row in the partition is assigned a position; even a NULL ordering key still gets a rank.
- **`ntile(n)`** → non-null iff its bucket-count argument is non-null (`ntile(NULL)` is NULL).
- **Aggregates over the DEFAULT frame** → non-null when the aggregate is on the `NON_NULL_OVER_NONEMPTY_AGGREGATES` list (or is `first_value`/`last_value`, which pick a row of the frame), every argument is non-null, and there is no `FILTER` or `DISTINCT`. The default frame — `frameOptions` equal to the parser's `FRAMEOPTION_DEFAULTS` (1058), no named window reference — is `RANGE UNBOUNDED PRECEDING TO CURRENT ROW`, which always contains the current row (measured), so it is the window analogue of the non-empty-group gate. An explicit frame, even one spelling the same bounds, sets the NONDEFAULT bit and stays conservative.
- **Everything else over a window** → **nullable**. An explicit frame can be empty (`ROWS BETWEEN 2 PRECEDING AND 1 PRECEDING` on the first row makes `sum() OVER` return NULL), `FILTER` can exclude every frame row, and the offset functions (`lag`, `lead`, `nth_value`) can address a row outside the partition.
- **`WITHIN GROUP` (checked after the window branch — ordered-set calls carry `agg_within_group`, not `over`):** the hypothetical-set family (`rank`, `dense_rank`, `percent_rank`, `cume_dist` — `HYPOTHETICAL_SET_AGGREGATES`) is **total**: it returns the hypothetical row's position even over zero input rows and for NULL arguments (measured), so non-null unconditionally. The ordered-set proper (`percentile_disc`, `percentile_cont`, `mode`) returns NULL over an empty group, an all-NULL sort column, or a NULL direct argument, so it follows the plain-aggregate gates with the `WITHIN GROUP` sort expressions walked as arguments (`ordered-set-aggregates.sql`).

### Summary table

| Function kind | Nullability | Source | Precision |
|---|---|---|---|
| Returns NOT NULL domain | non-null | `DomainInfo.notNull` | precise |
| `count(*)` / `count(col)` | non-null | rule | precise |
| Built-in aggregate (max/sum/avg/…) | non-null over a guaranteed non-empty group with non-null args; else nullable | `Scope.groupGuaranteesNonEmpty` + rule | precise |
| Aggregate with non-null `INITCOND` | non-null | `FunctionInfo.aggInitVal` | precise |
| Ranking window function | non-null | `NEVER_NULL_WINDOW_FNS` | precise |
| Aggregate / offset function over a window | nullable | frame may be empty | correct |
| Strict scalar | AND of args | `FunctionInfo.strict` + recurse | correct (nullable direction) |
| `LANGUAGE sql` user function | recurse into body | parse `FunctionInfo.body` | precise |
| Non-strict scalar / `LANGUAGE plpgsql` | nullable | conservative | imprecise |
| Unknown function | nullable | conservative | imprecise |
| Any function returning NOT NULL domain | non-null | PG enforces at call boundary | precise |

---

## 5. Scope and DAG semantics

### Innermost-first resolution

Scopes are resolved innermost-first. Before we can resolve a ColumnRef that points at a CTE or subquery relation, we run the full walk on that inner scope and memoize the per-output-column results. This guarantees that when an outer ColumnRef needs the Nth output of an inner scope, the result is already computed.

### Memoization

Each scope's per-output-column nullability results are cached. A CTE referenced N times in the outer FROM is analyzed once; all N ColumnRefs read from the same cache. The cache is keyed by the scope's identity (the AST node pointer is sufficient — a specific subquery AST node produces one set of results).

### Correlated subqueries

A subquery in a WHERE clause or expression may reference columns from the enclosing scope (correlated reference). The inner scope's address book has an `outer` pointer to the enclosing scope. When a ColumnRef can't be resolved locally, the walk falls back to the outer scope — same mechanism as `resolver.ts`'s `withSubqueryScope`. The outer scope's results are already memoized because we resolve innermost-first (the outer scope is "more inner" than the correlated subquery in the resolution order — we resolve the outer SELECT's output columns before resolving the correlated subquery's expressions).

Wait — that's backwards. The correlated subquery is *inside* the outer SELECT's expression tree. When we walk the outer SELECT's output column, we recurse into the expression, hit the subquery, and recurse into it. At that point the outer scope's address book is available (we're inside its walk). The inner ColumnRef resolves against the outer address book. We don't need the outer's *results* — we need the outer's *facts* (catalog notNull, join nullability, WHERE guarantees). These are available during the walk because we're inside the outer scope's traversal. So correlated references work naturally: the inner leaf resolves against the outer scope's address book + facts, not against the outer scope's *output results*.

### Set operations (UNION / INTERSECT / EXCEPT)

The combination rule depends on the operator (`combineSetOpColumn`):

- **UNION** emits rows from both branches → a column is non-null only if **both** sides are.
- **EXCEPT** draws every row from the LEFT branch; the right branch only removes rows → the **left** branch alone decides.
- **INTERSECT** returns values present in both, so **either** side can prove non-nullness — a value drawn from a NOT NULL column cannot be NULL whatever the other side allows.


`SELECT a FROM t1 UNION SELECT b FROM t2` — the output column's nullability is the **AND** of all operands' corresponding output columns. If either side is nullable, the result is nullable. INTERSECT and EXCEPT follow the same rule. The walk treats a set-operation SELECT as having N operand scopes, each contributing one output tree per column position; the result is the AND of all operands.

### VALUES as a scope

`FROM (VALUES (1, NULL), (2, 3)) v(a, b)` — column `a` has values `1` and `2` (both non-null literals), so `a` is non-null. Column `b` has values `NULL` and `3` — the NULL makes `b` nullable. Each VALUES row is an expression list; each column's nullability is the AND across all rows (nullable if any row's expression for that column is nullable).

### `SELECT *` expansion

`SELECT *` expands to one output column per visible column of every visible relation, in FROM-clause order. Each expanded column is effectively a ColumnRef to that relation's column. The catalog column list (from `ResolvedTable.columns` — already available via the resolver's scope machinery) drives the expansion. `SELECT t.*` expands to just relation `t`'s columns.

### INSERT / UPDATE / DELETE RETURNING

These statements have a RETURNING list that produces output columns. The target table is always required (it's the row being modified, not a join). RETURNING columns are ColumnRefs to the target table; their nullability is `catalog.notNull(col)`, upgraded by the **written-value map** (Wave 3): a column whose written value is provably non-null on every path that can produce a returned row is notNull regardless of the catalog. INSERT VALUES cells reduce by intersection over rows; INSERT…SELECT reads the source's own analysis positionally (plain shape only); UPDATE SET expressions are exactly the returned values (RETURNING reports the NEW row — the complement of the SET-column predicate mask); ON CONFLICT DO UPDATE intersects the insert and update paths, where a non-SET column on the update path is the EXISTING row and contributes nothing (`returning-conflict-existing.sql` is the witnessed negative). MERGE, multi-assignment SET, and DEFAULT-taking columns keep the catalog. The walk handles RETURNING lists the same way as SELECT target lists, with the FROM scope being just the target table.

`UPDATE ... FROM` and `DELETE ... USING` add further relations to that scope. They join to the target with **inner-join** semantics — a target row with no match is simply not modified — so those relations are REQUIRED, not OPTIONAL. Outer joins written *inside* the FROM/USING list are still honoured normally.

---

## 5b. Refusing rather than guessing

Results are a **positional array** zipped against PostgreSQL's RowDescription,
which makes the output column *list* load-bearing: getting it wrong misassigns
every flag past the divergence, and does so while looking authoritative. Arity
is a weak guard on its own — a construct can preserve the count and change the
order. `USING` is the standing example: PostgreSQL emits the merged column
**first**, so an implementation that instead dropped the right-hand duplicate
would produce `x, id, y` against PostgreSQL's `id, x, y` — same arity, wrong
order, silently wrong flags.

So the walk refuses where silence would corrupt the column list, and degrades
where it would merely blunt a value. The distinction is the **dispatch site**:

| Site | Unknown node costs | Behaviour |
|---|---|---|
| expression | nothing structural — one target-list entry is one output column whatever the expression is | report nullable |
| FROM item | contributes columns; an unknown one silently removes them | throw `UnsupportedNodeError` |
| statement | an unknown one yields no columns at all | throw `UnsupportedNodeError` |

This means DDL, `SET`, `EXPLAIN` and `SHOW` all raise at the top level. DDL has
no output columns and no parameters, so there is nothing to be nullable and
asking is a caller mistake; `EXPLAIN` and `SHOW` *do* return columns we cannot
model, which is precisely why returning an empty list would be a bug rather
than an answer.

A **function body is an expression site in disguise** — it decides one value's
nullability, not a column list. So a SQL function whose body is DDL reports
nullable rather than raising: `SELECT f()` is a perfectly good query whatever
`f`'s body does, and only its return value is unknowable.

The caller always has a correct escape, because it runs PREPARE for types
anyway: catch the error and treat every column as nullable. That is always
sound, just imprecise.

---

## 6. What this is NOT

- **Not type inference.** PREPARE gives us types (PG's own analysis). We only infer nullability.
- **Not theorem proving.** The predicate analysis is syntactic pattern matching plus a strict-expression closure, not logical implication. AND recursion, OR by per-arm intersection, the listed comparison shapes, and strict-dependence attribution (`length(col) > 0` proves `col`) — anything else is conservatively skipped. Branch guards run the same analyzer over CASE conditions, so they share exactly these limits.
- **Not set-theoretic.** We don't model `A | B` row-shape unions from disjunctive WHERE clauses; an OR contributes only what every arm proves.

---

## 7. Pinned policy decisions

These have been decided:

1. **Scalar subquery (`EXPR_SUBLINK`):** nullable unless single-row-guaranteed AND the inner output column is non-null. `guaranteesSingleRow` is the sole authority on the row count and must reject every construct that can drop it to zero: `HAVING`, `LIMIT`, `OFFSET`, set operations (`UNION`/`INTERSECT`/`EXCEPT`), and a `WHERE` on a FROM-less SELECT. The two qualifying shapes are an ungrouped aggregate and a bare `SELECT <expr>` with neither FROM nor WHERE.

   A set-operation node carries no `fromClause` of its own, so it must be rejected *before* the FROM-less check or it will be mistaken for an always-one-row SELECT.

2. **`LANGUAGE sql` function bodies:** recurse into the body. We have the body text in the catalog (`FunctionInfo.body`); we parse it and walk the last statement's output. This is in scope for this implementation.

3. **User aggregates:** `pg_aggregate.agginitval` is snapshotted as `FunctionInfo.aggInitVal`. A non-null `INITCOND` makes the aggregate non-null even over zero rows.

4. **`CASE` expressions:** non-null iff there is an `ELSE` and every branch result is non-null. Branch results are path-sensitive — each is walked under the conditions required to reach it (see "Branch guards").

5. **Disjunctive WHERE (`OR`):** guarantees by intersection — an OR proves a target non-null only when EVERY disjunct does (whichever arm was TRUE, it could not have been TRUE with the target NULL). An arm that proves nothing (`$1 IS NULL`) blocks the whole disjunction, which is what keeps the optional-filter idiom legal.

6. **`NOT EXISTS`:** non-null (returns bool). The `BoolExpr(NOT_EXPR)` rule recurses into its arg; if the arg is an EXISTS subquery (non-null), NOT of it is non-null.

7. **Testing strategy:** end-to-end fixtures (`.sql` files with inline expectations), not unit tests of individual rules. See section 9.

---

## 8. Implementation map

### Files to create

| File | Purpose |
|---|---|
| `src/query/nullability-walk.ts` | The main walk: `inferNullability(stmt, catalog) → OutputNullability[]`. Contains the scope builder (including the join-tree walk that marks each alias REQUIRED/OPTIONAL), the leaf-first recursive walk, the function dispatch, the cross-scope memoization, and the WHERE consultation. Imports the scope machinery from `resolver.ts`. |
| `tests/unit/query/nullability-walk.test.ts` | The test driver: parses `.sql` fixture files, runs the walk, asserts per-column expectations. |
| `tests/unit/query/fixtures/*.sql` | Fixture files with inline `-- notNull` / `-- nullable` annotations per output column. See section 9. |

### Files to reuse (already exist, tested)

| File | What to reuse |
|---|---|
| `src/query/resolver.ts` | The scope machinery: `withSubqueryScope`, alias/CTE resolution, `DepCatalog` interface, the `ExtractContext` class's alias/table tracking. The walk needs the same scope resolution to map ColumnRefs to relations. Consider extracting the scope-building part of `ExtractContext` into a shared helper, or build a parallel `NullabilityScope` class that reuses the same patterns. The existing 80 tests validate the scope resolution. |
| `src/query/types.ts` | `DepCatalog`, `ResolvedTable`, `ResolvedFunction`, `AliasNullability` interfaces — used by `resolver.ts` and available for the walk to reuse or extend. |
| `src/ast.ts` | `parseSql(sql)` — the libpg-query wrapper. Used by the walk for parsing `LANGUAGE sql` function bodies, and by the test driver for parsing fixtures. |
| `src/catalog/types.ts` | `FunctionInfo` (for function dispatch: `strict`, `isAggregate`, `returnTypeOid`, `language`, `body`), `DomainInfo` (for NOT NULL domain returns: `notNull`, `baseTypeOid`), `ColumnInfo` (for catalog column `notNull`), `TableInfo`/`ViewInfo` (for column lists). |

### The catalog interface

The walk needs a richer catalog than `DepCatalog` (which only does name resolution). It needs:

```typescript
interface NullabilityCatalog {
  // Name resolution (same as DepCatalog):
  resolveTable(schema: string | undefined, name: string): ResolvedTable | null;
  resolveFunction(schema: string | undefined, name: string): ResolvedFunction | null;

  // Column nullability (intrinsic):
  resolveColumnNotNull(schema: string, table: string, column: string): boolean;

  // Function metadata (for FuncCall dispatch).
  // Resolves by (schema, name) only — arg types are NOT available to the walk
  // (they come from PREPARE, which the walk does not run). If the catalog has
  // exactly one FunctionInfo for this (schema, name), return it. If multiple
  // overloads exist, return null — the walk treats it as an unknown function
  // (conservative nullable, with `count` as the hardcoded exception). This is
  // correct because we cannot determine which overload is being called without
  // arg types, and guessing is never correct.
  resolveFunctionMetadata(schema: string | undefined, name: string): FunctionInfo | null;

  // Domain metadata (for NOT NULL domain returns):
  isNotNullDomain(typeOid: number): boolean;
}
```

This is built from a `CatalogSnapshot` (the full introspection result — see `src/catalog/types.ts`). The catalog is a pure data structure; the walk is a pure function over `(AST, catalog)`. No PGlite needed.

### The output type

```typescript
interface OutputNullability {
  name: string;
  notNull: boolean;
}
```

The walk returns `OutputNullability[]`, one per output column, in target-list order.

---

## 9. Testing strategy

### Why end-to-end fixtures

The walk's correctness depends on cross-scope threading (CTE body → outer ref, subquery output → SubLink leaf) and context-sensitive resolution (WHERE guarantees applied to ColumnRefs inside expressions). These are properties of the *whole traversal*, not of individual rules in isolation. Unit tests of individual rules — "does the join-walk mark LEFT JOIN aliases correctly?" — can't catch composition bugs. End-to-end fixtures test the actual property we care about: given a real query, is each output column's nullability correct?

The approach: **end-to-end fixtures** — real SQL parsed by libpg-query into real ASTs, a mock catalog for table/function metadata, and the walk's per-output-column result compared against inline annotations.

### Fixture format

Each fixture is a `.sql` file in `tests/unit/query/fixtures/`. The SQL query is annotated with `-- notNull` or `-- nullable` after each output column:

```sql
-- fixtures/coalesce.sql
SELECT
  COALESCE(a.val, '')    AS c1,  -- notNull
  COALESCE(a.val, b.val)  AS c2,  -- nullable
  a.val                   AS c3   -- nullable
FROM a LEFT JOIN b ON b.id = a.id
```

For fixtures that need catalog facts (strict functions, NOT NULL domains, user aggregates, LANGUAGE sql function bodies), a companion mock-catalog is declared in a header comment or a sibling `.catalog.json` file:

```sql
-- fixtures/strict-function.sql
-- @catalog: { "functions": { "lower": { "strict": true, "isAggregate": false } } }
SELECT
  lower(a.val)    AS c1,  -- nullable (a.val nullable, lower is strict)
  lower('lit')    AS c2   -- notNull  (literal non-null, lower is strict)
FROM a LEFT JOIN b ON b.id = a.id
```

### Test driver

The test driver (`tests/unit/query/nullability-walk.test.ts`):
1. Globs all `*.sql` fixtures in the fixtures directory.
2. For each fixture: parses the SQL with `parseSql`, extracts the mock catalog from the header comment (if present), runs `inferNullability(stmt, mockCatalog)`, and asserts each output column matches its annotation.

### Suggested fixture categories

Each category should have multiple fixtures covering the cases listed:

1. **Literals:** `'lit'` → non-null, `NULL` → nullable, `42` → non-null, `true` → non-null, `NULL::text` → nullable.
2. **ColumnRefs (single table):** `col` with catalog NOT NULL → non-null; `col` without → nullable.
3. **Joins:** INNER JOIN (both required), LEFT JOIN (right optional), RIGHT JOIN, FULL JOIN, nested joins, self-joins.
4. **WHERE promotion:** LEFT JOIN + `WHERE t.col IS NOT NULL` → t promoted; comparison in WHERE; AND conjuncts; OR (no promotion); NOT (no promotion).
5. **WHERE guarantees:** `WHERE col IS NOT NULL` → col guaranteed; `WHERE col = 5` → guaranteed; `WHERE col IN (...)` → guaranteed; `WHERE func(col) = x` → NOT guaranteed (strict fn deferred at WHERE level).
6. **COALESCE:** with literal → non-null; with two columns → nullable; with three args.
7. **CASE:** non-null with an `ELSE` and non-null branches; nullable without an `ELSE`. Branch results are walked under their branch guards.
8. **TypeCast:** cast of nullable → nullable; cast of non-null → non-null.
9. **CTEs:** CTE with internal LEFT JOIN → outer ref inherits nullability; CTE with non-null output → outer ref non-null; CTE referenced multiple times.
10. **Subqueries (FROM):** subquery in FROM with internal join structure; output columns inherit.
11. **Scalar subqueries (EXPR_SUBLINK):** plain FROM → nullable; aggregate → recurse; count(*) → non-null; LIMIT 1 → still nullable.
12. **EXISTS / NOT EXISTS:** → non-null.
13. **Functions:** strict scalar (AND of args); non-strict (nullable); count (non-null); max/sum (nullable); NOT NULL domain return (non-null); LANGUAGE sql body (recurse); window function (ignore OVER).
14. **Set operations:** UNION (AND of operands); INTERSECT; EXCEPT.
15. **VALUES:** with NULL and non-null literals.
16. **`SELECT *` expansion:** multiple relations, column order.
17. **BoolExpr:** AND → nullable; OR → nullable; NOT EXISTS → non-null; NOT (col = 5) → nullable.
18. **RowExpr / ArrayExpr:** → non-null.
19. **MinMaxExpr (GREATEST/LEAST):** → nullable.
20. **RETURNING:** INSERT/UPDATE/DELETE RETURNING — target table is required (no join nullability), columns use catalog `notNull` directly; expressions in RETURNING (e.g. COALESCE) follow the normal expression rules.

---

## 10. AST unwrapping pattern (critical for implementation)

libpg-query wraps every AST node in a discriminator-keyed object: `{ NodeType: { ...fields } }`. To access fields, unwrap first:

```typescript
const node = expr as Record<string, unknown>;
if ("CoalesceExpr" in node) {
  const ce = node["CoalesceExpr"] as CoalesceExpr;
  // ce.args is the inner array
}
```

The `ParseResult` from `parseSql(sql)` has shape `{ stmts: RawStmt[] }`. Each `RawStmt` has `{ stmt: Node, stmt_location: number, stmt_len: number }`. The top-level `stmt` is a Node like `{ SelectStmt: { ... } }`.

Key AST node shapes (confirmed against libpg-query 18.0.1 by dumping real parse trees):

- **A_Const** (literal): `{ A_Const: { sval: { sval: "text" }, location } }` for strings, `{ A_Const: { ival: { ival: 42 }, location } }` for integers, `{ A_Const: { boolval: { boolval: true }, location } }` for booleans, `{ A_Const: { isnull: true, location } }` for NULL.
- **ColumnRef**: `{ ColumnRef: { fields: [{ String: { sval: "col" } }], location } }` for unqualified, `{ ColumnRef: { fields: [{ String: { sval: "alias" } }, { String: { sval: "col" } }], location } }` for qualified. `SELECT *` has `{ A_Star: {} }` in fields.
- **NullTest**: `{ NullTest: { arg: <expr>, nulltesttype: "IS_NULL" | "IS_NOT_NULL", location } }`.
- **A_Expr**: `{ A_Expr: { kind: "AEXPR_OP" | "AEXPR_IN" | "AEXPR_OP_ANY" | "AEXPR_OP_ALL" | ..., name: [{ String: { sval: "=" } }], lexpr: <expr>, rexpr: <expr>, location } }`. `IN`, `= ANY(...)`, `= ALL(...)` are all A_Expr variants.
- **BoolExpr**: `{ BoolExpr: { boolop: "AND_EXPR" | "OR_EXPR" | "NOT_EXPR", args: [<expr>, ...], location } }`.
- **TypeCast**: `{ TypeCast: { arg: <expr>, typeName: { names: [...], typemod, location }, location } }`.
- **CoalesceExpr**: `{ CoalesceExpr: { args: [<expr>, ...], location } }`.
- **CaseExpr**: `{ CaseExpr: { args: [{ CaseWhen: { expr: <condition>, result: <expr>, location } }, ...], defresult: <expr>, location } }`.
- **SubLink**: `{ SubLink: { subLinkType: "EXISTS_SUBLINK" | "EXPR_SUBLINK" | "ARRAY_SUBLINK" | "ALL_SUBLINK" | "ANY_SUBLINK", subselect: <SelectStmt>, location } }`.
- **FuncCall**: `{ FuncCall: { funcname: [{ String: { sval: "name" } }, ...], args: [<expr>, ...], agg_star: boolean, over: <WindowDef>, funcformat, location } }`.
- **RowExpr**: `{ RowExpr: { args: [<expr>, ...], row_format, location } }`.
- **A_ArrayExpr**: `{ A_ArrayExpr: { elements: [<expr>, ...], list_start, list_end, location } }`.
- **MinMaxExpr**: `{ MinMaxExpr: { op: "IS_GREATEST" | "IS_LEAST", args: [<expr>, ...], location } }`.
- **ScalarArrayOp**: `{ ScalarArrayOp: { lexpr: <expr>, rexpr: <expr>, useOr: boolean, location } }` (older builds; modern builds emit A_Expr variants for IN/ANY/ALL).
- **NamedArgExpr**: `{ NamedArgExpr: { arg: <expr>, name: string, location } }`.
- **CollateClause**: `{ CollateClause: { arg: <expr>, collname: [...], location } }`.
- **SelectStmt**: `{ SelectStmt: { targetList: [{ ResTarget: { val: <expr>, name: string, location } }, ...], fromClause: [<RangeVar | RangeSubselect | JoinExpr | ...>], whereClause: <expr>, withClause: { ctes: [{ CommonTableExpr: { ctename, ctequery, aliascolnames, ... } }, ...] }, groupClause, havingClause, sortClause, distinctClause, windowClause, lockingClause, larg, rarg, op, ... } }`.
- **RangeVar**: `{ RangeVar: { relname, schemaname, alias: { aliasname }, inh, relpersistence, location } }`.
- **RangeSubselect**: `{ RangeSubselect: { subquery: <SelectStmt>, alias: { aliasname }, ... } }`.
- **JoinExpr**: `{ JoinExpr: { jointype: "JOIN_INNER" | "JOIN_LEFT" | "JOIN_RIGHT" | "JOIN_FULL" | ..., larg, rarg, quals, ... } }`.

---

## 11. Project context (for the implementing agent)

### Workspace layout

Read `AGENTS.md` in the workspace root (`/Users/witaju/Projects/pgsid-workspace/AGENTS.md`) first — it covers the build/test commands, PGlite setup, and hard-won rules.

The application lives in `pgsid/` (a separate git repo within the workspace). The key directories:

```
pgsid/
├── src/
│   ├── query/
│   │   ├── types.ts              # DepCatalog, ResolvedTable, ResolvedFunction, AliasNullability
│   │   └── resolver.ts           # extractDeps + scope machinery (withSubqueryScope, alias/CTE resolution)
│   ├── catalog/
│   │   ├── types.ts              # FunctionInfo, DomainInfo, ColumnInfo, TableInfo, CatalogSnapshot, ...
│   │   ├── snapshot.ts           # snapshotCatalog(pg) — full catalog from PG system catalogs
│   │   └── diff.ts              # diffCatalogs(before, after) — column-level diff
│   ├── ast.ts                    # parseSql(sql) — libpg-query wrapper
│   └── schema-builder.ts         # SchemaBuilder (DDL apply + validation — NOT the nullability walk)
├── tests/
│   └── unit/query/
│       └── resolver.test.ts      # 80 tests for extractDeps
└── docs/
    └── nullability-walk.md       # THIS FILE
```

### Build and test commands

```bash
cd pgsid
pnpm typecheck          # tsc --noEmit (ignore engine.ts errors — pre-existing)
pnpm vitest run tests/unit/query/   # query tests (currently 80: resolver only; walk tests added by this task)
pnpm test               # full suite (currently 408 tests)
```

### AST parsing

```typescript
import { parseSql } from "../../src/ast.js";

const parsed = await parseSql(sql);
const stmt = parsed.stmts![0]!.stmt!;  // top-level statement node
```

`parseSql` returns a `ParseResult` from `libpg-query`. It's async (WASM-based parser).

### Test pattern (existing tests)

Look at `tests/unit/query/resolver.test.ts` for the established test pattern: `parseSql` to get real ASTs, helper functions to reduce boilerplate, `vitest` as the runner.

### Catalog types available

See `src/catalog/types.ts` for the full catalog type definitions. The key types for the walk:

- `FunctionInfo` (line 135): `schema`, `name`, `argTypes`, `args`, `returnType`, `returnTypeOid`, `language`, `isAggregate`, `isWindow`, `strict`, `body`, `definition`.
- `DomainInfo` (line 169): `schema`, `name`, `baseTypeOid`, `baseTypeName`, `notNull`.
- `ColumnInfo` (line 37): `name`, `typeOid`, `typeName`, `notNull`, `hasDefault`, ...
- `TableInfo` (line 74): `schema`, `name`, `columns: ColumnInfo[]`, `constraints`.
- `ViewInfo` (line 87): `schema`, `name`, `columns: ColumnInfo[]`, `definition`.
- `CatalogSnapshot`: the full snapshot containing all of the above.

### What the walk does NOT do

- **Does not run PREPARE.** PREPARE is a runtime operation on PGlite that gives output column names + type OIDs. The walk only infers nullability. The composition with PREPARE results (names + types from PREPARE, nullability from the walk) happens at a future codegen layer, not in the walk.
- **Does not extract dependencies.** That's `extractDeps` in `resolver.ts`. The walk and `extractDeps` are separate concerns; they both walk the AST but for different purposes.
- **Does not need PGlite.** The walk is a pure function over `(AST, catalog)`. The catalog is a pure data structure built from a `CatalogSnapshot`. Tests use mock catalogs.

---

## 12. Reference: DESIGN.md sections

The overall architecture is in `pgsid/DESIGN.md`. The relevant sections for nullability:

- **"Query type inference: three separable concerns"** (line ~657): describes `extractDeps` and PREPARE — both accurate and used by the walk. The nullability portion of that section describes a different approach; **this document is the authoritative nullability spec**. Do not modify DESIGN.md during this task.
- **"Nullability rules (beyond join structure)"** (line ~729): the expression rules table and function nullability table. These rules are **reused** in the walk's dispatch (section 4 of this document). The DESIGN.md section should be updated to point to this document once the walk is implemented, but DO NOT modify DESIGN.md during this task.

---

## 13. Implementation tasks (ordered)

1. **Define the `NullabilityCatalog` interface** in `src/query/types.ts` — the richer catalog the walk needs (name resolution + column notNull + function metadata + domain metadata).

2. **Create `src/query/nullability-walk.ts`** with:
   - The `OutputNullability` type.
   - The `inferNullability(stmt, catalog)` entry point.
   - The scope builder (address book: aliases → relations, join nullability per alias, WHERE clause).
   - The leaf-first recursive walk over expression trees.
   - The ColumnRef leaf resolver (catalog + join + WHERE + cross-scope).
   - The WHERE consultation (walk the WHERE subtree for predicates implying this column is non-null — reuse the predicate detection patterns: NullTest IS_NOT_NULL, A_Expr with ColumnRef operand, in AND-conjuncts only).
   - The FuncCall dispatch (7 priorities from section 4).
   - The SubLink dispatch (EXISTS/ANY/ALL → non-null; EXPR → single-row test + recurse; ARRAY → non-null).
   - The cross-scope memoization (CTE/subquery inner scope results cached and reused).
   - The `SELECT *` expansion.
   - The set-operation handling (UNION/INTERSECT/EXCEPT → AND of operands).
   - The VALUES handling.
   - The `LANGUAGE sql` function body recursion (parse body — handle both old-style raw SQL and `BEGIN ATOMIC ... END`; walk last statement's output, map args by position; transitive recursion with cycle detection).
   - The RETURNING handling (INSERT/UPDATE/DELETE — target table is the sole required relation, no join nullability; RETURNING list treated as the target list).

3. **Create the fixtures directory** `tests/unit/query/fixtures/` with `.sql` files covering all categories from section 9. Start with the simple categories (literals, ColumnRefs, joins, COALESCE, CASE) and progress to the complex ones (CTEs, subqueries, functions, set operations).

4. **Create the test driver** `tests/unit/query/nullability-walk.test.ts` that globs fixtures, parses them, builds mock catalogs, runs the walk, and asserts per-column expectations.

5. **Run `pnpm typecheck`** (ignore engine.ts errors — pre-existing) and `pnpm vitest run tests/unit/query/` (must pass all existing 80 tests + new fixtures).

6. **Run `pnpm test`** (full suite — must pass all existing 408 tests + new tests; the walk is additive, it doesn't modify existing code).

---

## 14. Resolved design decisions

These decisions are final — implement per these rules:

1. **`LANGUAGE sql` function body recursion depth:** transitively recurse with cycle detection. Maintain a set of `(schema, name)` keys currently being analyzed; if a key re-enters, treat it as conservative nullable. This prevents infinite recursion when functions are mutually recursive.

2. **Function overload resolution:** name-level only — `resolveFunctionMetadata(schema, name)` ignores arg types (they come from PREPARE, not the AST). Exactly one `FunctionInfo` → full metadata, body inlining included. Multiple overloads → no guessing, but two sound recoveries (Wave 5): **arity filtering** (`resolveFunctionCandidates` keeps only candidates a call with N arguments could resolve to — PostgreSQL never picks one that can't accept them; variadic and named notation refuse) and **consensus** over what remains — a property EVERY candidate shares (all strict, all returning a NOT NULL domain, a position all declare as a NOT NULL domain) holds whichever one runs, the same quantification the builtin strictness capture rests on. Candidates that *disagree* stay conservative (`over_fn` pins that; `overload-consensus.sql` and `param-overload-arity.sql` pin the agreements). Body inlining stays single-candidate: it analyses a specific body, and bodies differ. Operators mirror this: strictness by consensus, backing-function dispatch only when single.

3. **`LANGUAGE sql` body format:** handle both old-style (raw SQL like `SELECT $1 * 2`) and SQL-standard (`BEGIN ATOMIC ... END`). Try parsing the body string directly with `parseSql`; if that fails, strip the `BEGIN ATOMIC ... END` wrapper and parse the inner statements.

4. **RETURNING in scope:** INSERT/UPDATE/DELETE RETURNING is handled in the initial implementation. The target table is the sole relation in scope and is always REQUIRED (no join nullability). The RETURNING list is treated as the target list. Fixture category 20 (section 9) covers this.

---

## 15. Open questions (to resolve during implementation)

These remain open and may need decisions once the implementation reveals edge cases:

- **`SELECT *` with `JOIN ... USING`:** the USING columns appear once in the output. Need to handle the deduplication.
- **Composite types:** `SELECT t FROM t` where `t` is a table — the output is a row type. Is a row type ever NULL? Only if `t` is on the optional side of a join. The `RowExpr` rule says non-null, but a whole-row ColumnRef is different from a RowExpr constructor.
- **Domain over composite:** a domain with `NOT NULL` over a composite type — does the column `notNull` flag already account for this? (Likely yes — PG propagates domain NOT NULL to `pg_attribute.attnotnull`.)
