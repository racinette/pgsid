# Output Column Nullability — Design

## Problem

For query codegen, we need to know whether each output column is nullable (`T | null`) or non-null (`T`). This determines the emitted TypeScript types. Getting it wrong in either direction is bad: saying non-null when it's nullable produces incorrect types (runtime nulls where the type says there are none); saying nullable when it's non-null produces noisy types (`T | null` where `T` suffices).

PostgreSQL's PREPARE gives us output column **names and type OIDs** — but not nullability. PG doesn't expose per-column nullability for prepared statement results. So we must infer it ourselves from the query AST + catalog.

## Architecture: layered, pure functions

Nullability is determined by four layers that compose. Each layer is a pure function (testable without PGlite). The layers are composed at the codegen layer, not inside any single function.

```
Layer 1: Intrinsic          — catalog column.notNull (NOT NULL constraint, domain)
Layer 2: Join structure      — inferJoinNullability(ast) → per-alias
Layer 3: WHERE constraints   — applyWhereConstraints(stmt, joinNullability) → adjusted joins + per-column guarantees
Layer 4: Expression rules    — inferExprNotNull(expr) → boolean

Composition (codegen layer):
  for each output column:
    if the expression is a plain ColumnRef:
      notNull = catalog.notNull(col) && !joinNullable(alias, after WHERE adjustment)
      || whereGuaranteedNonNull(alias, col)
    else:
      notNull = inferExprNotNull(expr)
      || whereGuaranteedNonNull(alias, col)  — if the expression is a bare column reference under WHERE
```

The composition is a merge: the expression-level result, the WHERE guarantees, and (for plain ColumnRef outputs) the intrinsic + join nullability. The codegen layer has all three results available (it called `inferJoinNullability`, `applyWhereConstraints`, `inferExprNotNull`, and has the catalog + PREPARE results).

## Layer 2: Join nullability (structural)

**Function:** `inferJoinNullability(stmt: Node) → AliasNullability[]`

**Input:** AST only (no catalog, no types).

**Output:** per table alias in the FROM clause, whether it's on the optional side of a LEFT/RIGHT/FULL outer join.

**Algorithm:** three-state recursive walk over the join tree (per sqlc's `isTableRequired`):

- `REQUIRED` — not on any optional side.
- `OPTIONAL` — on the optional side of an outer join (columns from this alias can be NULL due to no matching row).
- `NOT_FOUND` — table not in this branch.

| Join type | Left side | Right side |
|---|---|---|
| INNER | inherits prior | inherits prior |
| LEFT | inherits prior | OPTIONAL |
| RIGHT | OPTIONAL | inherits prior |
| FULL | OPTIONAL | OPTIONAL |
| CROSS | inherits prior | inherits prior |

**Key property:** join nullability overrides intrinsic nullability. A NOT NULL domain on the optional side of a LEFT JOIN is nullable in the output (the NULL comes from the join, not the column — PG enforces domain constraints at insert/update, not at join time).

**Scope:** each subquery has its own FROM clause and its own join structure. When recursing into a subquery, a fresh `inferJoinNullability` call is made for the subquery's FROM. The outer query's join structure does not propagate into the subquery.

**Status:** implemented (`src/query/join-nullability.ts`), 22 tests.

## Layer 3: WHERE constraints

**Function:** `applyWhereConstraints(stmt: Node, joinNullability: AliasNullability[]) → { adjustedJoinNullable: Map<string, boolean>, guaranteedNonNull: Set<string> }`

**Input:** AST (the SELECT statement) + the join nullability result from layer 2.

**Output:**
1. **Adjusted join nullability** — optional-side aliases that have `IS NOT NULL` or any comparison predicate on their columns in the WHERE clause are promoted to required (effectively turning the LEFT JOIN into an INNER JOIN).
2. **Per-column non-null guarantees** — columns directly tested by a comparison predicate in an AND-conjunct are guaranteed non-null in the output.

**Algorithm:**

Walk the WHERE clause:
- `BoolExpr(AND)` — recurse into each conjunct independently. Each conjunct's guarantees apply.
- `BoolExpr(OR)` — skip (conservative). Disjunctive predicates don't guarantee individual columns. The conservative fallback is "all nullable."
- Leaf predicate — check if it implies a column is non-null:

**Three-valued logic rule:** in SQL, `NULL = anything` yields `UNKNOWN`, not `TRUE`. So any comparison predicate that evaluates to `TRUE` implies its operands are non-NULL. The detectable patterns:

| Predicate pattern | Implies | Detection |
|---|---|---|
| `col IS NOT NULL` | col non-null | `NullTest(IS_NOT_NULL)` on a `ColumnRef` |
| `col = literal` / `col > n` / any comparison | col non-null | `A_Expr` with `ColumnRef` on one side |
| `col IN (...)` | col non-null | `ScalarArrayOp` with `ColumnRef` as `lexpr` |
| `func(col) = x` (strict fn) | col non-null | `A_Expr` with `FuncCall(strict)` on one side (deferred — needs function strictness) |

**Alias promotion:** if any column of an optional-side alias is tested non-null (via the patterns above), the alias is promoted to required — ALL of its columns become non-null, not just the tested one. This is because `WHERE t.col IS NOT NULL` eliminates all NULL-extended rows from the LEFT JOIN, making the entire row non-null.

**Column-level guarantee:** if the column's alias was already required (not on any optional side), the guarantee is column-level only (the alias stays required, and the specific column is marked non-null).

**Scope:** WHERE constraints apply to the current query level. Subqueries in the FROM clause have their own WHERE clauses analyzed in their own scope.

**What we skip (out of scope):**
- Disjunctive (`OR`) WHERE clauses → conservative (no guarantees). Modeling `A | B` row-shape unions is a set-theoretic problem with poor TS ergonomics. Not worth the complexity.
- Path-sensitive CASE analysis (`CASE WHEN col IS NULL THEN '' ELSE col END` is provably non-null, but proving it requires reasoning about how the WHEN condition constrains the ELSE branch). Conservative: `CASE` is nullable if any branch is nullable.

**Status:** not yet implemented.

## Layer 4: Expression nullability

**Function:** `inferExprNotNull(expr: Node) → boolean`

**Input:** AST only (no catalog, no callback, no types).

**Design principle:** `ColumnRef` returns `false` (conservatively nullable). The expression rules compute whether the expression **structure itself** guarantees non-null, independent of what the columns' intrinsic nullability is. Intrinsic nullability is applied at the composition layer, only for plain ColumnRef outputs.

This means:
- `COALESCE(col, 'literal')` → `true` (the literal is provably non-null — no catalog needed).
- `COALESCE(col1, col2)` → `false` (both args are ColumnRefs → `false || false` → false). Conservative — even if both columns are NOT NULL, we don't know that at this level.
- `TypeCast(col)` → `false` (inherits from ColumnRef). Conservative for NOT NULL columns; correct for nullable columns.
- `col IS NULL` → `true` (always returns bool, never NULL).

The trade-off: correct (never says non-null when nullable), imprecise for some cases (says nullable when the result is provably non-null due to NOT NULL inputs). The imprecision only affects non-ColumnRef expressions whose inputs are NOT NULL columns — a narrow case. For plain `SELECT col`, the composition layer overrides with the real nullability.

**Rules (recursive dispatch over AST node types):**

| Node type | `notNull` result | Rationale |
|---|---|---|
| `A_Const` (literal) | `true` (except `NULL` literal → `false`) | Literals are never NULL |
| `ColumnRef` | `false` | Conservative — intrinsic handled at composition layer |
| `NullTest` (IS NULL / IS NOT NULL) | `true` | Always returns bool |
| `SubLink` (EXISTS) | `true` | Always returns bool |
| `SubLink` (scalar subquery) | `false` | Conservative — would need subquery output analysis |
| `TypeCast` | `inferExprNotNull(arg)` | Cast preserves nullability |
| `CoalesceExpr` | `args.some(a => inferExprNotNull(a))` | Non-null if any arg is provably non-null |
| `CaseExpr` | `false` (conservative) | Nullable if any branch nullable; path-sensitive analysis skipped |
| `A_Expr` (comparison op) | `false` | Three-valued logic: NULL comparison → UNKNOWN, not TRUE |
| `A_Expr` (math op) | `false` | NULL propagates through arithmetic |
| `BoolExpr` (AND/OR) | `false` | Three-valued logic: AND/OR can produce NULL |
| `BoolExpr` (NOT EXISTS) | `true` | NOT EXISTS → bool |
| `FuncCall` — `count(*)` | `true` | Never returns NULL |
| `FuncCall` — aggregate (max/sum/avg) | `false` | Returns NULL over zero rows |
| `FuncCall` — strict scalar (lower/upper) | `inferExprNotNull(args)` — but args are ColumnRefs → `false` | Strict: NULL in → NULL out; non-null if all args non-null (but we don't know at this level) |
| `FuncCall` — other | `false` | Conservative |
| `MinMaxExpr` (GREATEST/LEAST) | `false` | Conservative — NULL propagates |
| `ScalarArrayOp` (ANY/ALL) | `false` | Conservative — returns bool but NULL comparison → UNKNOWN |
| `RowExpr` | `true` | Row constructor is never NULL (even with NULL elements) |
| `ArrayExpr` | `true` | ARRAY constructor is never NULL |
| `NamedArgExpr` | `inferExprNotNull(arg)` | Unwrap and recurse |
| Unknown node | `false` | Conservative — add handler when encountered |

**Comparison to sqlc:** sqlc hard-codes `NotNull: true` for `TypeCast` (with a `// XXX: How do we know if this should be null?` comment) and only checks the ELSE branch of `CASE`. Our approach is conservative-nullable (never wrong, sometimes imprecise). sqlc's approach is false-precise (sometimes wrong in the dangerous direction). The NOT NULL domain path (composition layer, for plain ColumnRef outputs) is the precise escape hatch for cases that matter.

**Status:** not yet implemented.

## Composition layer (codegen-time)

The codegen layer merges all layers with PREPARE results:

```
PREPARE gives:   { name: string, typeOid: number }[]     — output column names + types
PREPARE gives:   { typeName: string }[]                    — input parameter types

inferJoinNullability gives:  AliasNullability[]            — per-alias join nullability
applyWhereConstraints gives: adjusted joins + guaranteed non-null columns
inferExprNotNull gives:      boolean per output expression
catalog gives:               column.notNull (intrinsic)

For each output column:
  1. If the expression is a plain ColumnRef:
     notNull = whereGuaranteedNonNull(alias, col)
               || (catalog.notNull(col) && !adjustedJoinNullable(alias))
  2. If the expression is something else (COALESCE, cast, IS NULL, etc.):
     notNull = inferExprNotNull(expr)
               || whereGuaranteedNonNull(alias, col)   — only if the expression is a bare column ref under WHERE

  typeOid/typeName from PREPARE
  → emit { name, typeOid, notNull }
```

## What this is NOT

- **Not type inference.** PREPARE gives us types (PG's own analysis). We only infer nullability.
- **Not theorem proving.** The WHERE analysis is syntactic pattern matching, not logical implication. We detect specific patterns (IS NOT NULL, comparison on a column) in AND-conjuncts. Disjunctions and complex predicates are conservatively skipped.
- **Not path-sensitive.** We don't track how conditions constrain branch values. `CASE WHEN col IS NULL THEN '' ELSE col END` is conservatively nullable, even though it's provably non-null. This matches sqlc's behavior.
- **Not set-theoretic.** We don't model `A | B` row-shape unions from disjunctive WHERE clauses. Conservative: everything nullable.

## Implementation status

| Component | File | Status |
|---|---|---|
| Join nullability | `src/query/join-nullability.ts` | ✅ Built, 22 tests |
| WHERE constraints | (not yet) | Designed, not built |
| Expression nullability | (not yet) | Designed, not built |
| extractDeps (dependency tracking) | `src/query/resolver.ts` | ✅ Built, 80 tests |
| PREPARE (runtime types) | (on SchemaBuilder) | Designed in DESIGN.md, not built |
| Composition layer | (codegen) | Not built |
