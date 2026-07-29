# Nullability Walk — Extreme Fixture Expansion

## Context

The nullability walk is implemented and tested with 76 passing fixtures. It
infers whether each output column of a SQL query is provably non-null or
nullable, using a single leaf-first recursive walk over the AST plus a
catalog.

The test infrastructure uses PGlite to apply a base schema migration
(`tests/unit/query/fixtures/schema.sql`), snapshot the real catalog via
`snapshotCatalog(pg)`, build a `NullabilityCatalog` via
`buildNullabilityCatalog(snapshot)`, and then run the walk against fixture
`.sql` files with inline `-- notNull` / `-- nullable` annotations.

## Task

Write **10+ extreme complexity fixtures** — the kind of queries that make a
query planner sweat. These should be realistic but deeply nested, combining
multiple advanced features in a single query. Also add **parameterized
queries** (using `$1`, `$2` params) — the walk currently treats `$N` params as
conservative nullable (since it doesn't have PREPARE's type info), and this
behavior must be tested.

### What's missing and needs coverage

1. **Parameterized queries** (`$1`, `$2`, `$3`, ...) — in SELECT, in WHERE,
   in function args, in VALUES, in subqueries, in RETURNING. The walk treats
   `ParamRef` as conservative nullable. Verify this works correctly when params
   are combined with COALESCE, strict functions, CASE, etc.

2. **Deeper nesting** — the current "most complex" queries are 3-4 levels deep.
   Push to 5+ levels: CTE containing a subquery containing a CTE containing a
   correlated subquery containing a scalar subquery.

3. **More expression node types in combination** — RowExpr inside CoalesceExpr
   inside CaseExpr; A_ArrayExpr as a function argument; MinMaxExpr with
   subquery args; CollateClause on a cast of a COALESCE; NamedArgExpr with
   nested function calls.

4. **DML with CTEs that reference each other** — INSERT...SELECT from a CTE
   that joins another CTE, with RETURNING expressions that reference the
   target table and use functions.

5. **Recursive CTE + set operation** — a recursive CTE whose result is fed
   into a UNION/EXCEPT with a non-recursive query.

6. **Window functions in deeply nested contexts** — window function inside a
   CTE, referenced by an outer query with joins, where the window column is
   used in a COALESCE or strict function.

7. **Correlated subqueries in unexpected places** — in ORDER BY (not an output
   column, but the walk should still handle it), in a CASE condition, in a
   function argument inside an aggregate.

8. **Multiple join types in a single FROM with complex ON clauses** — INNER +
   LEFT + RIGHT + FULL in one query, with ON clauses that reference columns
   from earlier joins, and WHERE clauses that promote some optional sides.

9. **Domain types and NOT NULL domain returns in nested contexts** — a function
   returning a NOT NULL domain, called inside a COALESCE, inside a CASE, in a
   subquery in a CTE.

10. **Set operations with different column counts and types** — UNION of a
    3-column query with a 3-column query where one side has a scalar subquery
    and the other has a COALESCE.

### Schema expansion

You may extend `tests/unit/query/fixtures/schema.sql` with additional tables,
domains, functions, views, etc. to support the new fixtures. Ideas:

- A `payment_methods` table with a `positive_amount` domain (numeric NOT NULL
  CHECK > 0) for testing NOT NULL domain columns
- A `non_empty_text` domain (text NOT NULL CHECK length > 0)
- A function that takes 3+ parameters and uses all of them in the body
- A function returning a setof/table for testing setof return types
- An `addresses` table with nullable columns (line2, postal_code) and a
  self-referencing `default_address_id`
- A `tags` table + `product_tags` join table for many-to-many
- A `coupons` table with a `discount_percent` domain
- A `shipments` table linking to orders with nullable `shipped_at`/`delivered_at`

**Do not modify existing tables or functions** — existing fixtures depend on
them. Only add new entities.

### Top 5 current queries by complexity (use as reference)

These are the most complex fixtures currently in the suite. The new fixtures
should be more complex than these.

---

**1. `triple-nested-correlated-subquery.sql`**

```sql
SELECT
  o.id     AS order_id,
  o.status AS status,
  COALESCE(
    (SELECT count(*) FROM order_items oi
     WHERE oi.order_id = o.id
       AND oi.product_id IN (
         SELECT p.id FROM products p
         WHERE p.deleted_at IS NULL
           AND p.price > (SELECT avg(p2.price) FROM products p2
                         WHERE p2.category_id = p.category_id)
       )),
    0
  ) AS premium_item_count
FROM orders o
```

3-level nesting: outer SELECT → scalar subquery (count) → IN subquery →
correlated scalar subquery (avg). All correlated references resolve through
scope chain.

---

**2. `recursive-cte-with-functions.sql`**

```sql
WITH RECURSIVE cat_tree AS (
  SELECT id, parent_id, slug, name, 0 AS depth
  FROM categories WHERE parent_id IS NULL
  UNION ALL
  SELECT c.id, c.parent_id, c.slug, c.name, ct.depth + 1
  FROM categories c JOIN cat_tree ct ON c.parent_id = ct.id
)
SELECT
  ct.id, lower_strict(ct.name), COALESCE(ct.parent_id, 0), ct.depth,
  (SELECT count(*) FROM products p WHERE p.category_id = ct.id AND p.deleted_at IS NULL)
FROM cat_tree ct WHERE ct.depth < 3
```

Recursive CTE + strict function + COALESCE + scalar subquery + WHERE
promotion. Recursive self-reference resolved conservatively.

---

**3. `subquery-in-function-in-coalesce-in-case.sql`**

```sql
SELECT p.id, p.name,
  CASE
    WHEN p.deleted_at IS NOT NULL THEN 'archived'
    ELSE COALESCE(lower_strict(
      (SELECT p2.name FROM products p2 WHERE p2.id = p.id AND p2.deleted_at IS NOT NULL)
    ), 'active')
  END AS status
FROM products p
```

4-level expression nesting: CASE → COALESCE → strict function → scalar
subquery. Tests body recursion, strict function with subquery arg, CASE
conservative nullable.

---

**4. `window-cte-coalesce-subquery.sql`**

```sql
WITH product_reviews AS (
  SELECT p.id, p.name, p.price, p.deleted_at, r.rating
  FROM products p LEFT JOIN reviews r ON r.product_id = p.id
)
SELECT
  pr.id, pr.name,
  rank() OVER (PARTITION BY pr.id ORDER BY pr.rating DESC),
  count(*) OVER (PARTITION BY pr.id),
  COALESCE(lower_strict(pr.name), (SELECT c.name FROM categories c WHERE c.id = 1))
FROM product_reviews pr WHERE pr.deleted_at IS NULL
```

CTE with LEFT JOIN + window functions (rank nullable, count non-null) +
COALESCE with strict function and scalar subquery fallback.

---

**5. `multi-cte-self-join.sql`**

```sql
WITH with_reviews AS (
  SELECT p.id, p.name, p.deleted_at, r.rating
  FROM products p LEFT JOIN reviews r ON r.product_id = p.id
),
with_orders AS (
  SELECT wr.id, wr.name, wr.deleted_at, wr.rating, oi.order_id
  FROM with_reviews wr JOIN order_items oi ON oi.product_id = wr.id
)
SELECT wo.id, wo.name, wo.rating, wo.order_id, c.email
FROM with_orders wo
LEFT JOIN orders o ON o.id = wo.order_id
LEFT JOIN customers c ON c.id = o.customer_id
WHERE c.email IS NOT NULL
```

2 CTEs referencing each other + outer query with 2 LEFT JOINs + WHERE
promotion. Cross-scope nullability propagation through CTE chain.

---

### Fixture format

Each fixture is a `.sql` file in `tests/unit/query/fixtures/`. Format:

```sql
-- Description of what this fixture tests
SELECT
  some_expr   AS col1,  -- notNull
  other_expr  AS col2   -- nullable
FROM ...
```

- `-- notNull` after a column = the walk should infer it as provably non-null.
- `-- nullable` = it could be null.
- The test driver counts annotations top-to-bottom, matches to walk output.
- `schema.sql` is excluded from the fixture list.

Name files descriptively (e.g., `extreme-recursive-cte-set-op.sql`).

### How to run

```bash
cd pgsid
pnpm vitest run tests/unit/query/nullability-walk.test.ts   # just the walk tests
pnpm test                                                    # full suite (484 tests)
pnpm typecheck                                               # ignore engine.ts errors — pre-existing
```

### How the walk works (quick reference)

- **Literals** (`A_Const`): non-null, except `NULL` literal → nullable
- **ParamRef** (`$1`, `$2`): conservative nullable (no PREPARE type info)
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

WHERE promotion: `col IS NOT NULL`, `col = <expr>`, `col IN (...)` in AND-conjuncts
promotes optional-side columns to required.

Join nullability: INNER → both required; LEFT → right optional; RIGHT → left
optional; FULL → both optional.

### Key files

| File | Purpose |
|---|---|
| `tests/unit/query/fixtures/schema.sql` | Base schema migration (extend with new entities) |
| `tests/unit/query/fixtures/*.sql` | Existing 76 fixtures — don't modify these |
| `tests/unit/query/nullability-walk.test.ts` | Test driver |
| `src/query/nullability-walk.ts` | The walk engine |
| `src/query/catalog-adapter.ts` | Builds NullabilityCatalog from CatalogSnapshot |
| `docs/nullability-walk.md` | Full design spec — read for detailed rules |
| `AGENTS.md` (workspace root) | Build/test commands, project layout |

### Workspace

Read `AGENTS.md` in the workspace root first. The application lives in `pgsid/`.
