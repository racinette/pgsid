# Nullability Walk — Complex Fixture Expansion

## Context

The nullability walk is implemented and tested. It infers whether each output
column of a SQL query is provably non-null or nullable, using a single
leaf-first recursive walk over the AST plus a catalog. The walk is a pure
synchronous function: `inferNullability(stmt, catalog) → OutputNullability[]`.

The test infrastructure uses PGlite (Postgres in WASM) to apply a base schema
migration, snapshot the real catalog via `snapshotCatalog(pg)`, build a
`NullabilityCatalog` via `buildNullabilityCatalog(snapshot)`, and then run
the walk against fixture `.sql` files with inline `-- notNull` / `-- nullable`
annotations.

**38 tests currently pass** across 22 fixture files covering basic cases
(literals, joins, COALESCE, CASE, CTEs, subqueries, functions, set ops,
VALUES, RETURNING, etc.).

## Task

Extend the existing test suite with **15+ complex fixture queries** that push
the nullability walk to its limits. The goal is to test realistic,
deeply-nested, corner-case-heavy SQL against a realistic schema.

### Step 1: Extend the schema

The current schema (`tests/unit/query/fixtures/schema.sql`) has three simple
tables (`t`, `u`, `v`) and a few functions. Extend it (or replace it) with a
**realistic SaaS e-commerce schema** — the kind a real application would have.
The schema should naturally produce queries that exercise:

- **Recursive CTEs** — e.g., a self-referencing category hierarchy
- **Correlated subqueries** — e.g., orders where total > user's average
- **LATERAL joins** — e.g., top product per order
- **Window functions** — e.g., rank products by price within category
- **Multiple join types in one query** — INNER + LEFT + FULL in the same FROM
- **WHERE promotion** — LEFT JOIN + WHERE on the optional side (IS NOT NULL,
  comparison, IN)
- **Aggregates with and without GROUP BY** — count(*), max, sum, user aggregates
- **NOT NULL domain returns** — functions returning a NOT NULL domain type
- **LANGUAGE sql function body recursion** — both old-style (`AS $$ SELECT $1 $$`)
  and BEGIN ATOMIC style, with positional (`$1`) and named parameter references
- **Strict functions with nullable args** — strict function called with a
  nullable column from a LEFT JOIN
- **COALESCE / NULLIF / CASE** — in output columns, in WHERE, in function args
- **Set operations** — UNION / INTERSECT / EXCEPT combining nullable and
  non-null columns
- **Subqueries in FROM** — nested query scopes with internal join structure
- **Scalar subqueries** — aggregate (single-row-guaranteed) vs plain FROM
  (zero-rows-possible)
- **VALUES in FROM** — with NULL and non-null literals
- **INSERT/UPDATE/DELETE RETURNING** — with expressions in the RETURNING list
- **TypeCast, CollateClause, NamedArgExpr** — less common expression nodes
- **Nested function calls** — function calling another function
- **CTEs referenced multiple times** — same CTE joined to itself

Design the schema so these patterns emerge naturally. Include:
- Tables with a realistic mix of NOT NULL and nullable columns
- Foreign keys (some nullable, some not)
- A self-referencing table for recursive CTEs
- Soft-delete columns (nullable timestamp) for WHERE IS NULL / IS NOT NULL
- At least one domain with NOT NULL (for function return types)
- At least one user-defined aggregate
- Functions in both LANGUAGE sql styles (old-style `AS $$ ... $$` and
  `BEGIN ATOMIC ... END`)
- A strict function
- A function returning a NOT NULL domain
- A function with multiple parameters (to test positional vs named param
  resolution in bodies)
- Optionally a view or two (views have columns in the catalog too)

**Important:** The existing 22 fixtures and 38 tests must still pass (unless you eventually find their results invalid). If you
replace the schema entirely, update the existing fixtures to reference the new
tables/columns. If you extend it, the old fixtures keep working as-is. Either
approach is fine — do whichever is cleaner.

### Step 2: Write the fixtures

Each fixture is a `.sql` file in `tests/unit/query/fixtures/`. The format:

```sql
-- Description of what this fixture tests
SELECT
  some_expr   AS col1,  -- notNull
  other_expr  AS col2   -- nullable
FROM ...
```

- `-- notNull` after a column means the walk should infer it as provably
  non-null.
- `-- nullable` means it could be null.
- The test driver counts annotations top-to-bottom and matches them to the
  walk's output columns in order.
- `schema.sql` is excluded from the fixture list (it's the migration, not a
  test query).

Write fixtures that are **realistic and complex** — the kind of queries a real
application would run, not artificial constructs. Each fixture should test
multiple nullability rules simultaneously (e.g., a recursive CTE with a LEFT
JOIN and a COALESCE and a strict function call). Name files descriptively
(e.g., `recursive-category-tree.sql`, `correlated-subquery-avg.sql`).

### Step 3: Run and fix

Run the tests:

```bash
cd pgsid
pnpm vitest run tests/unit/query/nullability-walk.test.ts
```

If any fixture fails, determine whether the expectation or the walk is wrong.
The walk is conservative (never says non-null when it could be null), so:
- If the walk says `nullable` but you expected `notNull`, the walk may be
  missing a rule — check the spec in `docs/nullability-walk.md` to see if the
  rule is defined. If it is, the walk has a bug worth investigating. If it
  isn't (e.g., path-sensitive CASE analysis), the expectation should be
  `nullable`.
- If the walk says `notNull` but you expected `nullable`, that's a walk bug
  (it's saying non-null when it shouldn't) — investigate and fix.

Also run the full suite to ensure nothing else broke:

```bash
pnpm test
pnpm typecheck   # ignore engine.ts errors — pre-existing
```

## Key files

| File | Purpose |
|---|---|
| `tests/unit/query/fixtures/schema.sql` | The base schema migration (extend or replace this) |
| `tests/unit/query/fixtures/*.sql` | Existing fixtures (22 files) — update if schema changes |
| `tests/unit/query/nullability-walk.test.ts` | Test driver (PGlite + snapshot + adapter + walk) |
| `src/query/nullability-walk.ts` | The walk engine (read to understand dispatch rules) |
| `src/query/catalog-adapter.ts` | Builds NullabilityCatalog from CatalogSnapshot |
| `src/query/types.ts` | NullabilityCatalog + OutputNullability interfaces |
| `src/catalog/snapshot.ts` | `snapshotCatalog(pg)` — reads PG system catalogs |
| `src/catalog/types.ts` | CatalogSnapshot, FunctionInfo, DomainInfo, TableInfo, etc. |
| `src/ast.ts` | `parseSql(sql)` — libpg-query wrapper |
| `docs/nullability-walk.md` | The full design spec — expression rules table, function dispatch priorities, WHERE guarantee patterns, SubLink rules, etc. Read this to understand what the walk should do. |

## How the walk works (quick reference)

The walk is a single leaf-first recursive traversal per output column. At each
AST node it applies a rule:

- **Literals** (`A_Const`): non-null, except `NULL` literal → nullable
- **ColumnRef**: resolves against scope (catalog notNull + join nullability +
  WHERE promotion); recurses into CTE/subquery bodies for cross-scope
- **SubLink**: EXISTS/ANY/ALL/ARRAY → non-null; EXPR (scalar) → nullable unless
  single-row-guaranteed (aggregate without GROUP BY, or no FROM) AND inner
  output is non-null; LIMIT 1 does NOT count as single-row
- **CoalesceExpr**: non-null if any arg is non-null
- **CaseExpr**: conservative nullable (no path-sensitive analysis)
- **A_Expr** (comparisons/math): nullable (three-valued logic)
- **BoolExpr** AND/OR: nullable; NOT: recurse into arg
- **FuncCall**: 7-priority dispatch (NOT NULL domain → count → aggregate →
  strict → LANGUAGE sql body → conservative nullable)
- **TypeCast**: recurse into arg
- **RowExpr / A_ArrayExpr**: non-null (constructors never NULL)
- **MinMaxExpr / ScalarArrayOp**: nullable (conservative)
- **NullTest** (IS NULL / IS NOT NULL): non-null (returns bool)

WHERE promotion: if the WHERE clause has `col IS NOT NULL` or `col = <expr>`
(in an AND-conjunct) for a column on the optional side of an outer join, that
column is promoted to non-null.

Join nullability: INNER → both required; LEFT → right optional; RIGHT → left
optional; FULL → both optional.

## Workspace

Read `AGENTS.md` in the workspace root first — it covers the build/test
commands and project layout. The application lives in `pgsid/`.
