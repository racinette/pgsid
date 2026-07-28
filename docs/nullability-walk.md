# Output Column Nullability — Single Recursive Walk

## What this document is

This is both the **design specification** and the **implementation handoff** for nullability inference. It contains all the context a fresh agent needs to implement the walk from scratch.

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
- Whether it's on the optional side of an outer join (a three-state walk of the join tree: REQUIRED / OPTIONAL / NOT_FOUND — INNER preserves both sides, LEFT makes the right optional, RIGHT makes the left optional, FULL makes both optional).

We do NOT analyze nullability yet. We're just building the address book: "in this scope, alias `a` means this table, alias `b` means that subquery, alias `c` means this table on the optional side of a LEFT JOIN."

We also note the WHERE clause of this scope — we'll consult it during leaf resolution, not as a pre-pass.

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
- Is this column guaranteed non-null by a WHERE predicate? We check by walking this scope's WHERE subtree looking for a predicate that implies this specific column is non-null — `IS NOT NULL` on this column, or a comparison (`=`, `>`, `IN`, `LIKE`, …) with this column as a direct operand, inside an AND-conjunct. If the column's alias is on the optional side of an outer join and such a predicate exists, the alias is **promoted** to required (the LEFT JOIN effectively becomes INNER — the WHERE eliminates all NULL-extended rows). This check happens *here*, during leaf resolution, not as a pre-pass.
- If the alias is a real table/view: read the catalog's `notNull` flag for that column. Combine with the join nullability: `notNull = catalog.notNull(col) && !joinNullable(alias)` (after promotion). If the WHERE guarantees it, override to non-null.
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
| `SubLink` EXISTS/ANY/ALL | non-null | Returns bool |
| `SubLink` EXPR (scalar) | single-row test + recurse (see leaf rules above) | Row count matters |
| `SubLink` ARRAY | non-null | ARRAY constructor never NULL |
| `TypeCast` | recurse into `arg` | Cast preserves nullability |
| `CoalesceExpr` | non-null if any arg is non-null | `args.some(recurse)` |
| `CaseExpr` | nullable (conservative) | Path-sensitive analysis skipped |
| `A_Expr` (comparison/math) | nullable | Three-valued logic: NULL comparison → UNKNOWN |
| `BoolExpr` AND/OR | nullable | Three-valued logic can produce NULL |
| `BoolExpr` NOT | recurse into arg | `NOT EXISTS` → non-null; `NOT (nullable)` → nullable |
| `FuncCall` | see function rules below | Varies by function kind |
| `RowExpr` | non-null | Row constructor never NULL (even with NULL elements) |
| `A_ArrayExpr` | non-null | ARRAY constructor never NULL |
| `MinMaxExpr` (GREATEST/LEAST) | nullable | Conservative — NULL propagates |
| `ScalarArrayOp` | nullable | Conservative |
| `NamedArgExpr` | recurse into `arg` | Unwrap and recurse |
| `CollateClause` | recurse into `arg` | Collation preserves nullability |
| Unknown node | nullable | Conservative — add handler when encountered |

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

If `isAggregate` is true (from the catalog) → **nullable**. Aggregates return NULL over zero rows. This includes built-in `max`/`sum`/`avg`/… and user-defined aggregates.

**Known imprecision for user aggregates:** the initial state value (`pg_aggregate.agginitval`) decides whether a user aggregate returns that initcond or NULL over empty input. We do NOT snapshot `pg_aggregate` today, so user aggregates are conservatively nullable even when their `initcond` is non-null. This is correct (never wrong) but imprecise. A future improvement: add `agginitval` to `snapshotCatalog` and treat non-null initcond aggregates as non-null over empty input.

**Aggregate definition variants** (moving-aggregate mode, ordered-set, partial aggregation, polymorphic) — see https://www.postgresql.org/docs/current/xaggr.html. None of these variants change the nullability question; they're about how state is computed, not whether the result can be NULL. The only thing that decides null-over-empty is `agginitval` (present + non-null → that's the empty result; absent/NULL → NULL over empty) and `count` (special-cased, never NULL).

### Priority 4: Strict scalar function

If `isAggregate` is false and `strict` is true (from `FunctionInfo.strict` in the catalog) → the result is non-null only if **all arguments resolved non-null**. We have the children's resolved booleans from the recursion; we AND them. `lower(c.name)` where `c` is on the optional side of a LEFT JOIN → `c.name` nullable → `lower(c.name)` nullable. `lower('lit')` → non-null arg → non-null. This is correct in the nullable direction: a strict function with a NULL input always returns NULL.

### Priority 5: `LANGUAGE sql` user function

If the function is a user-defined `LANGUAGE sql` function → **recurse into the function body**. Parse the body (available in `FunctionInfo.body` / `FunctionInfo.definition`), find the last statement's output expression, and run the nullability walk on it. This gives precise results for `LANGUAGE sql` functions — their bodies are plain SQL we can analyze.

**Implementation note:** this means the walk may parse and analyze function bodies, not just the query AST. The body is a SQL string; parse it with `parseSql`, find the last statement, extract its output expressions, and walk them with the same procedure. Arguments to the function are treated as ColumnRef-like leaves whose nullability comes from the call site's resolved arg nullability (mapped by parameter name/position).

### Priority 6: Non-strict scalar / `LANGUAGE plpgsql` / unknown

Conservative **nullable**. We can't determine strictness from the AST alone for non-strict functions, and `LANGUAGE plpgsql` bodies are not statically analyzable for nullability. The NOT NULL domain return path (priority 1) is the escape hatch for these cases — a user who wants a non-null guarantee from a plpgsql function declares the return type as a NOT NULL domain.

### Priority 7: Unknown function (not in catalog, e.g. a pg_catalog built-in we didn't snapshot)

Conservative **nullable**, with one hardcoded exception: `count` (handled in priority 2) since it's so common and never nullable.

### Window functions

`FuncCall` with an `OVER` clause (window function): the OVER clause doesn't affect result nullability — only framing does. The same rule applies; we ignore the OVER subtree for nullability purposes (we may still recurse into it for dependency extraction, but that's `resolver.ts`'s job, not the walk's).

### Summary table

| Function kind | Nullability | Source | Precision |
|---|---|---|---|
| Returns NOT NULL domain | non-null | `DomainInfo.notNull` | precise |
| `count(*)` / `count(col)` | non-null | rule | precise |
| Built-in aggregate (max/sum/avg/…) | nullable | rule | correct |
| User-defined aggregate | nullable | conservative (no `agginitval`) | imprecise |
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

`SELECT a FROM t1 UNION SELECT b FROM t2` — the output column's nullability is the **AND** of all operands' corresponding output columns. If either side is nullable, the result is nullable. INTERSECT and EXCEPT follow the same rule. The walk treats a set-operation SELECT as having N operand scopes, each contributing one output tree per column position; the result is the AND of all operands.

### VALUES as a scope

`FROM (VALUES (1, NULL), (2, 3)) v(a, b)` — column `a` has values `1` and `2` (both non-null literals), so `a` is non-null. Column `b` has values `NULL` and `3` — the NULL makes `b` nullable. Each VALUES row is an expression list; each column's nullability is the AND across all rows (nullable if any row's expression for that column is nullable).

### `SELECT *` expansion

`SELECT *` expands to one output column per visible column of every visible relation, in FROM-clause order. Each expanded column is effectively a ColumnRef to that relation's column. The catalog column list (from `ResolvedTable.columns` — already available via the resolver's scope machinery) drives the expansion. `SELECT t.*` expands to just relation `t`'s columns.

### INSERT / UPDATE / DELETE RETURNING

These statements have a RETURNING list that produces output columns. The target table is always required (it's the row being modified, not a join). RETURNING columns are ColumnRefs to the target table; their nullability is `catalog.notNull(col)` (no join nullability). The walk should handle RETURNING lists the same way as SELECT target lists, with the FROM scope being just the target table.

---

## 6. What this is NOT

- **Not type inference.** PREPARE gives us types (PG's own analysis). We only infer nullability.
- **Not theorem proving.** The WHERE analysis is syntactic pattern matching, not logical implication. We detect specific patterns (IS NOT NULL, comparison on a column) in AND-conjuncts. Disjunctions and complex predicates are conservatively skipped.
- **Not path-sensitive.** We don't track how conditions constrain branch values. `CASE WHEN col IS NULL THEN '' ELSE col END` is conservatively nullable, even though it's provably non-null. This matches sqlc's behavior.
- **Not set-theoretic.** We don't model `A | B` row-shape unions from disjunctive WHERE clauses. Conservative: everything nullable.

---

## 7. Pinned policy decisions

These have been decided:

1. **Scalar subquery (`EXPR_SUBLINK`):** nullable unless single-row-guaranteed (aggregate without GROUP BY, or no FROM) AND inner output column is non-null. `LIMIT 1` does NOT count as single-row-guaranteed.

2. **`LANGUAGE sql` function bodies:** recurse into the body. We have the body text in the catalog (`FunctionInfo.body`); we parse it and walk the last statement's output. This is in scope for this implementation.

3. **User aggregates:** conservative nullable (we don't snapshot `pg_aggregate.agginitval`). The NOT NULL domain return path is the escape hatch. Adding `agginitval` is a future improvement.

4. **`CASE` expressions:** conservative nullable. No path-sensitive branch analysis.

5. **Disjunctive WHERE (`OR`):** conservative — no guarantees. All columns nullable.

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

  // Function metadata (for FuncCall dispatch):
  resolveFunctionMetadata(schema: string | undefined, name: string, argTypes: string[]): FunctionInfo | null;

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
7. **CASE:** conservative nullable even with non-null branches.
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
   - The `LANGUAGE sql` function body recursion (parse body, walk last statement's output, map args by position).

3. **Create the fixtures directory** `tests/unit/query/fixtures/` with `.sql` files covering all categories from section 9. Start with the simple categories (literals, ColumnRefs, joins, COALESCE, CASE) and progress to the complex ones (CTEs, subqueries, functions, set operations).

4. **Create the test driver** `tests/unit/query/nullability-walk.test.ts` that globs fixtures, parses them, builds mock catalogs, runs the walk, and asserts per-column expectations.

5. **Run `pnpm typecheck`** (ignore engine.ts errors — pre-existing) and `pnpm vitest run tests/unit/query/` (must pass all existing 80 tests + new fixtures).

6. **Run `pnpm test`** (full suite — must pass all existing 408 tests + new tests; the walk is additive, it doesn't modify existing code).

---

## 14. Open questions (to resolve during implementation)

These may need decisions once the implementation reveals edge cases:

- **`LANGUAGE sql` function body recursion depth:** if a `LANGUAGE sql` function calls another `LANGUAGE sql` function, do we recurse transitively? Likely yes, with a depth limit or cycle detection.
- **Function overload resolution:** the walk needs to resolve a `FuncCall` to a specific `FunctionInfo` to read `strict`, `isAggregate`, `returnTypeOid`, etc. PG resolves overloads by arg types. The walk has arg *expressions* but not arg *types* (types come from PREPARE). Options: (a) use the resolver's name-level `resolveFunction` (any overload), (b) do a simple arg-count match, (c) defer to PREPARE for type info. For nullability, `strict` and `isAggregate` are usually the same across overloads, so (a) is likely sufficient.
- **`SELECT *` with `JOIN ... USING`:** the USING columns appear once in the output. Need to handle the deduplication.
- **Composite types:** `SELECT t FROM t` where `t` is a table — the output is a row type. Is a row type ever NULL? Only if `t` is on the optional side of a join. The `RowExpr` rule says non-null, but a whole-row ColumnRef is different from a RowExpr constructor.
- **Domain over composite:** a domain with `NOT NULL` over a composite type — does the column `notNull` flag already account for this? (Likely yes — PG propagates domain NOT NULL to `pg_attribute.attnotnull`.)
