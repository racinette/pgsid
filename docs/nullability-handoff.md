# Handoff: Output Column Nullability Implementation

## What to build

Two pure functions in `pgsid/src/query/` that complete the nullability inference pipeline. Both are pure (testable without PGlite), using real libpg-query-parsed ASTs with mock data — the same pattern as the already-built `resolver.ts` and `join-nullability.ts`.

The full design rationale, layer descriptions, and rules tables are in [`docs/nullability-design.md`](./docs/nullability-design.md). Read that first — it explains the four-layer model and why each layer is separate. This handoff covers implementation specifics only.

## Project context

Read these first:
- **`AGENTS.md`** (workspace root) — build/test commands, PGlite setup, hard-won rules.
- **`DESIGN.md`** (`pgsid/DESIGN.md`) — overall architecture. The "Query type inference" section (around line 657) describes the three separable concerns (extractDeps, inferJoinNullability, PREPARE) and the composition formula. The "Nullability rules" section (around line 729) has the expression rules table and function nullability table.
- **`docs/nullability-design.md`** (`pgsid/docs/nullability-design.md`) — the complete layered nullability design. This is the primary spec.

## What's already built (reference + reuse)

| File | What it does | Tests |
|---|---|---|
| `src/query/types.ts` | `DepCatalog`, `ResolvedTable`, `ResolvedFunction`, `AliasNullability` interfaces | — |
| `src/query/resolver.ts` | `extractDeps(stmt, catalog, searchPath) → EntityId[]` — walks AST for deps | 80 tests |
| `src/query/join-nullability.ts` | `inferJoinNullability(stmt) → AliasNullability[]` — join tree walk | 22 tests |
| `src/catalog/snapshot.ts` | `snapshotCatalog(pg)` — full catalog from PG catalogs | 20 tests |
| `src/catalog/diff.ts` | `diffCatalogs(before, after)` — column-level diff | 37 tests |
| `src/catalog/types.ts` | `CatalogSnapshot`, `ColumnInfo`, `TableInfo`, etc. | — |
| `src/ast.ts` | `parseSql(sql)` — libpg-query wrapper, returns `ParseResult` | — |

**AST unwrapping pattern:** libpg-query wraps every AST node in a discriminator-keyed object: `{ NodeType: { ...fields } }`. To access fields, unwrap first:

```typescript
const node = expr as Record<string, unknown>;
if ("CoalesceExpr" in node) {
  const ce = node["CoalesceExpr"] as CoalesceExpr;
  // ce.args is the inner array
}
```

**Test pattern:** use `parseSql` to get real ASTs, build a mock `DepCatalog`:

```typescript
function mockCatalog(tables, functions): DepCatalog { ... }
async function deps(sql, catalog) {
  const parsed = await parseSql(sql);
  return extractDeps(parsed.stmts![0]!.stmt!, catalog, ["public"]);
}
```

Tests live in `pgsid/tests/unit/query/`. Run with:
```bash
cd pgsid && pnpm vitest run tests/unit/query/
```

## Task 1: WHERE constraint analysis

**New file:** `src/query/where-constraints.ts`

**Function:** `applyWhereConstraints(stmt: Node, joinNullability: AliasNullability[]) → WhereConstraints`

```typescript
interface WhereConstraints {
  /** Aliases promoted from optional to required (LEFT JOIN effectively becomes INNER). */
  promotedAliases: Set<string>;
  /** "alias.col" guaranteed non-null by a WHERE predicate (IS NOT NULL, comparison, etc.). */
  guaranteedNonNull: Set<string>;
}
```

**Input:** the SELECT statement AST + the join nullability result from `inferJoinNullability`.

**Algorithm:** walk the WHERE clause. For `BoolExpr(AND)` — recurse into each conjunct. For `BoolExpr(OR)` — skip (conservative). For leaf predicates, detect patterns that imply a column is non-null (see the rules table in `docs/nullability-design.md` → Layer 3). The three-valued logic rule: any comparison that evaluates to TRUE implies its operands are non-NULL.

**Key patterns to detect:**
- `NullTest(IS_NOT_NULL)` on a `ColumnRef` → column guaranteed non-null.
- `A_Expr` (comparison: `=`, `>`, `<`, `IN`, `LIKE`, etc.) with a `ColumnRef` on either side → that column guaranteed non-null.
- `ScalarArrayOp` with `ColumnRef` as `lexpr` → column guaranteed non-null.

**Alias promotion:** if any column of an optional-side alias (from `joinNullability`) is tested non-null, promote the entire alias to required — all its columns become non-null.

**What to skip:** `OR` branches (conservative — no guarantees). Path-sensitive analysis. Strict-function-based detection (`func(col) = x` implies col non-null — deferred, needs function strictness from catalog).

**Tests:** `tests/unit/query/where-constraints.test.ts` — pure AST, no PGlite. Test cases:
- `WHERE col IS NOT NULL` → col guaranteed.
- `WHERE col = 5` → col guaranteed.
- `WHERE col IS NOT NULL OR other_col IS NOT NULL` → nothing guaranteed (OR).
- `WHERE col1 IS NOT NULL AND col2 > 0` → both guaranteed.
- `LEFT JOIN ... WHERE t.col IS NOT NULL` → t promoted to required.
- `WHERE func(col) = x` → NOT detected (strict fn detection deferred).
- No WHERE clause → empty result.

## Task 2: Expression nullability

**New file:** `src/query/expr-nullability.ts`

**Function:** `inferExprNotNull(expr: Node) → boolean`

Pure AST, no catalog, no callback. `ColumnRef` returns `false` (conservatively nullable). The rules compute whether the expression **structure itself** guarantees non-null. See the full rules table in `docs/nullability-design.md` → Layer 4.

**Implementation:** recursive dispatch over AST node types. For each recognized type, apply its rule (some recurse into children, some return constants). For unrecognized types, return `false`.

**Key rules (from the design doc):**
- `A_Const` (literal) → `true` (except `NULL` literal → `false`)
- `ColumnRef` → `false`
- `NullTest` (IS NULL / IS NOT NULL) → `true`
- `SubLink` EXISTS → `true`; scalar subquery → `false`
- `TypeCast` → recurse into `arg`
- `CoalesceExpr` → `args.some(inferExprNotNull)` — non-null if any arg is provably non-null
- `CaseExpr` → `false` (conservative; path-sensitive analysis skipped)
- `A_Expr` (comparison/math) → `false` (three-valued logic)
- `BoolExpr` (AND/OR) → `false`; `NOT EXISTS` → `true`
- `FuncCall` — `count(*)` → `true`; aggregates (max/sum) → `false`; strict scalar → recurse into args (but args are ColumnRefs → `false`); other → `false`
- `RowExpr` → `true`; `ArrayExpr` → `true`
- `NamedArgExpr` → recurse into `arg`
- Unknown → `false`

**How to detect aggregate functions:** `FuncCall` with `agg_star: true` is `count(*)`. For other aggregates (`max`, `sum`, `avg`), check `funcname` against a small hand-maintained set. This is the only place function identity matters — for nullability, we don't resolve to a catalog OID.

**How to detect strict functions at the AST level:** we can't (strictness is in the catalog). So `FuncCall` for non-aggregate, non-`count` functions defaults to `false` (conservative). This is acceptable — the composition layer handles plain ColumnRef outputs precisely; for function-call outputs, conservative-nullable is correct.

**Tests:** `tests/unit/query/expr-nullability.test.ts` — pure AST, no PGlite, no catalog. Test cases:
- `SELECT COALESCE(col, 'literal')` → non-null
- `SELECT COALESCE(col, col2)` → nullable (both ColumnRefs)
- `SELECT col IS NULL` → non-null
- `SELECT col::text` → nullable
- `SELECT count(*)` → non-null
- `SELECT 'literal'` → non-null
- `SELECT NULL::text` → nullable
- `SELECT col + 1` → nullable
- `SELECT EXISTS(SELECT 1 FROM t)` → non-null
- `SELECT CASE WHEN ... THEN ... END` → nullable (conservative)

## What NOT to build (deferred)

- **PREPARE (runtime types)** — the SchemaBuilder method that runs PREPARE and returns column names + type OIDs. This is runtime (needs PGlite), designed in DESIGN.md, separate from these pure functions.
- **Composition layer** — the codegen-time merge of all layers + PREPARE + catalog. Not part of the query resolver; it's in the codegen module.
- **Path-sensitive CASE analysis** — `CASE WHEN col IS NULL THEN '' ELSE col END` is provably non-null, but proving it requires reasoning about how conditions constrain branches. Conservative: nullable.
- **Disjunctive WHERE → union types** — set-theoretic problem, poor TS ergonomics. Conservative: all nullable.
- **Type inference** — PREPARE gives us types (PG's own analysis). We only infer nullability.

## Verification

```bash
cd pgsid
pnpm typecheck          # tsc --noEmit (ignore engine.ts errors — pre-existing)
pnpm vitest run tests/unit/query/   # the new tests + existing 102 tests
pnpm test               # full suite (currently 430 tests)
```

The full suite includes catalog tests (57), schema-builder tests (271), and query tests (102). All must pass.
