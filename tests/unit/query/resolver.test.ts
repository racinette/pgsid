import { describe, it, expect } from "vitest";
import { parseSql } from "../../../src/ast.js";
import { extractDeps } from "../../../src/query/resolver.js";
import type { DepCatalog, ResolvedTable, ResolvedFunction } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// Helper: build a mock DepCatalog from a set of tables and functions.
// ---------------------------------------------------------------------------

function mockCatalog(
  tables: { schema: string; name: string; columns: string[] }[],
  functions: { schema: string; name: string }[] = [],
): DepCatalog {
  const tableMap = new Map<string, ResolvedTable>();
  for (const t of tables) {
    tableMap.set(`${t.schema}.${t.name}`, {
      schema: t.schema,
      name: t.name,
      columns: t.columns,
    });
  }
  const fnSet = new Set<string>();
  for (const f of functions) {
    fnSet.add(`${f.schema}.${f.name}`);
  }
  return {
    resolveTable(schema: string | undefined, name: string): ResolvedTable | null {
      if (schema) return tableMap.get(`${schema}.${name}`) ?? null;
      // search_path resolution: try "public" first (default).
      return tableMap.get(`public.${name}`) ?? null;
    },
    resolveFunctions(schema: string | undefined, name: string): ResolvedFunction[] {
      const s = schema ?? "public";
      return fnSet.has(`${s}.${name}`) ? [{ schema: s, name }] : [];
    },
  };
}

async function deps(sql: string, catalog: DepCatalog): Promise<string[]> {
  const parsed = await parseSql(sql);
  const stmt = parsed.stmts![0]!.stmt!;
  return extractDeps(stmt, catalog, ["public"]);
}

describe("extractDeps: SELECT", () => {
  const catalog = mockCatalog([
    { schema: "public", name: "users", columns: ["id", "email", "name", "active"] },
    { schema: "public", name: "posts", columns: ["id", "user_id", "title", "body"] },
    { schema: "public", name: "payments", columns: ["order_id", "amount"] },
  ]);

  it("simple SELECT with qualified columns", async () => {
    const d = await deps("SELECT u.id, u.email FROM users u WHERE u.active = true", catalog);
    expect(d).toContain("public.users");
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.users.email");
    expect(d).toContain("public.users.active");
  });

  it("unqualified columns resolve via search_path", async () => {
    const d = await deps("SELECT id, email FROM users", catalog);
    expect(d).toContain("public.users");
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.users.email");
  });

  it("SELECT * expands to all columns", async () => {
    const d = await deps("SELECT * FROM users", catalog);
    expect(d).toContain("public.users");
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.users.email");
    expect(d).toContain("public.users.name");
    expect(d).toContain("public.users.active");
  });

  it("SELECT * with alias expands alias's columns", async () => {
    const d = await deps("SELECT u.* FROM users u", catalog);
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.users.email");
    expect(d).toContain("public.users.active");
  });

  it("JOIN — columns from both tables", async () => {
    const d = await deps(
      "SELECT u.id, p.title FROM users u INNER JOIN posts p ON p.user_id = u.id",
      catalog,
    );
    expect(d).toContain("public.users");
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.posts");
    expect(d).toContain("public.posts.title");
    expect(d).toContain("public.posts.user_id"); // from the JOIN ON
  });

  it("LEFT JOIN — columns from both tables", async () => {
    const d = await deps(
      "SELECT u.id, p.title FROM users u LEFT JOIN posts p ON p.user_id = u.id",
      catalog,
    );
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.posts.title");
  });

  it("nested JOINs", async () => {
    const d = await deps(
      "SELECT u.id, p.title, pm.amount " +
      "FROM users u " +
      "INNER JOIN posts p ON p.user_id = u.id " +
      "LEFT JOIN payments pm ON pm.order_id = p.id",
      catalog,
    );
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.posts.title");
    expect(d).toContain("public.payments.amount");
  });

  it("WHERE with function call", async () => {
    const cat = mockCatalog(
      [{ schema: "public", name: "users", columns: ["id", "email"] }],
      [{ schema: "public", name: "is_active" }],
    );
    const d = await deps("SELECT id FROM users WHERE is_active(id)", cat);
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.is_active");
  });

  it("GROUP BY and HAVING", async () => {
    const d = await deps(
      "SELECT user_id, count(*) FROM posts GROUP BY user_id HAVING count(*) > 0",
      catalog,
    );
    expect(d).toContain("public.posts.user_id");
  });
});

describe("extractDeps: CTEs", () => {
  const catalog = mockCatalog([
    { schema: "public", name: "users", columns: ["id", "email", "active"] },
    { schema: "public", name: "posts", columns: ["id", "user_id", "title"] },
  ]);

  it("CTE referenced in main query", async () => {
    const d = await deps(
      "WITH active_users AS (SELECT id, email FROM users WHERE active = true) " +
      "SELECT id, email FROM active_users",
      catalog,
    );
    // deps from the CTE body (users table).
    expect(d).toContain("public.users");
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.users.email");
    expect(d).toContain("public.users.active");
    // The CTE itself is not a catalog entity — no dep for "active_users".
    expect(d).not.toContain("public.active_users");
  });

  it("CTE with JOIN to real table", async () => {
    const d = await deps(
      "WITH au AS (SELECT id FROM users WHERE active = true) " +
      "SELECT a.id, p.title FROM au a INNER JOIN posts p ON p.user_id = a.id",
      catalog,
    );
    expect(d).toContain("public.users");
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.posts");
    expect(d).toContain("public.posts.title");
    expect(d).toContain("public.posts.user_id");
  });
});

describe("extractDeps: subqueries", () => {
  const catalog = mockCatalog([
    { schema: "public", name: "users", columns: ["id", "email", "active"] },
    { schema: "public", name: "posts", columns: ["id", "user_id"] },
  ]);

  it("subquery in FROM", async () => {
    const d = await deps(
      "SELECT x.id FROM (SELECT id FROM users WHERE active = true) x",
      catalog,
    );
    expect(d).toContain("public.users");
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.users.active");
  });

  it("subquery in WHERE (IN)", async () => {
    const d = await deps(
      "SELECT email FROM users WHERE id IN (SELECT user_id FROM posts)",
      catalog,
    );
    expect(d).toContain("public.users.email");
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.posts.user_id");
  });

  it("EXISTS subquery", async () => {
    const d = await deps(
      "SELECT email FROM users u WHERE EXISTS (SELECT 1 FROM posts p WHERE p.user_id = u.id)",
      catalog,
    );
    expect(d).toContain("public.users.email");
    expect(d).toContain("public.posts.user_id");
    expect(d).toContain("public.users.id"); // from u.id in the EXISTS subquery
  });
});

describe("extractDeps: INSERT/UPDATE/DELETE", () => {
  const catalog = mockCatalog([
    { schema: "public", name: "users", columns: ["id", "email", "name", "active"] },
    { schema: "public", name: "audit", columns: ["id", "action"] },
  ]);

  it("INSERT with column list + RETURNING", async () => {
    const d = await deps(
      "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id, email",
      catalog,
    );
    expect(d).toContain("public.users");
    expect(d).toContain("public.users.email");
    expect(d).toContain("public.users.name");
    expect(d).toContain("public.users.id");
  });

  it("UPDATE with SET + WHERE + RETURNING", async () => {
    const d = await deps(
      "UPDATE users SET name = $1 WHERE id = $2 RETURNING id, name",
      catalog,
    );
    expect(d).toContain("public.users");
    expect(d).toContain("public.users.name");
    expect(d).toContain("public.users.id");
  });

  it("DELETE with WHERE + RETURNING", async () => {
    const d = await deps("DELETE FROM users WHERE id = $1 RETURNING id", catalog);
    expect(d).toContain("public.users");
    expect(d).toContain("public.users.id");
  });

  it("INSERT ... SELECT", async () => {
    const d = await deps(
      "INSERT INTO users (email, name) SELECT email, name FROM users WHERE active = false",
      catalog,
    );
    expect(d).toContain("public.users");
    expect(d).toContain("public.users.email");
    expect(d).toContain("public.users.name");
    expect(d).toContain("public.users.active");
  });
});

describe("extractDeps: function calls", () => {
  const catalog = mockCatalog(
    [{ schema: "public", name: "users", columns: ["id", "email"] }],
    [{ schema: "public", name: "calculate_total" }, { schema: "public", name: "get_email" }],
  );

  it("qualified function call", async () => {
    const d = await deps("SELECT public.calculate_total($1) FROM users", catalog);
    expect(d).toContain("public.calculate_total");
    expect(d).toContain("public.users");
  });

  it("unqualified function call", async () => {
    const d = await deps("SELECT get_email(id) FROM users", catalog);
    expect(d).toContain("public.get_email");
    expect(d).toContain("public.users.id");
  });

  it("built-in function (lower) not in deps", async () => {
    const d = await deps("SELECT lower(email) FROM users", catalog);
    expect(d).not.toContain("public.lower");
    expect(d).toContain("public.users.email");
  });

  it("function in WHERE", async () => {
    const d = await deps("SELECT id FROM users WHERE calculate_total(id) > 100", catalog);
    expect(d).toContain("public.calculate_total");
    expect(d).toContain("public.users.id");
  });

  // An unqualified call whose candidates live in two schemas depends on
  // BOTH: the nullability engine answers such a call by CONSENSUS over the
  // candidates, so dropping or retyping either changes what may be
  // inferred. Recording only the one that would be picked leaves the query
  // unregistered against the other and silently skips its recheck.
  it("records every candidate schema for an ambiguous unqualified call", async () => {
    const multi: DepCatalog = {
      resolveTable: () => null,
      resolveFunctions: (schema, name) =>
        schema
          ? [{ schema, name }]
          : [
              { schema: "app_s", name },
              { schema: "public", name },
            ],
    };
    const d = await deps("SELECT label(42) AS v", multi);
    expect(d).toContain("app_s.label");
    expect(d).toContain("public.label");
  });

  it("a QUALIFIED call depends on that schema's function alone", async () => {
    const multi: DepCatalog = {
      resolveTable: () => null,
      resolveFunctions: (schema, name) =>
        schema
          ? [{ schema, name }]
          : [
              { schema: "app_s", name },
              { schema: "public", name },
            ],
    };
    const d = await deps("SELECT public.label(42) AS v", multi);
    expect(d).toEqual(["public.label"]);
  });
});

describe("extractDeps: deduplication and determinism", () => {
  const catalog = mockCatalog([
    { schema: "public", name: "users", columns: ["id", "email"] },
  ]);

  it("same column referenced twice — deduplicated", async () => {
    const d = await deps("SELECT id, id, email FROM users WHERE id = $1 AND email = $2", catalog);
    expect(d.filter(x => x === "public.users.id")).toHaveLength(1);
    expect(d.filter(x => x === "public.users.email")).toHaveLength(1);
  });

  it("output is sorted", async () => {
    const d = await deps("SELECT email, id FROM users", catalog);
    expect(d).toEqual([...d].sort());
  });
});

// ---------------------------------------------------------------------------
// Edge cases: expressions, dollar params, set operations, window functions,
// nested CTEs, 3-part refs, multi-schema.
// ---------------------------------------------------------------------------

describe("extractDeps: expression nodes", () => {
  const catalog = mockCatalog([
    { schema: "public", name: "users", columns: ["id", "email", "name", "active", "score"] },
  ]);

  it("CASE WHEN — deps from condition and branches", async () => {
    const d = await deps(
      "SELECT CASE WHEN active = true THEN email ELSE name END FROM users",
      catalog,
    );
    expect(d).toContain("public.users.active");
    expect(d).toContain("public.users.email");
    expect(d).toContain("public.users.name");
  });

  it("COALESCE — deps from all args", async () => {
    const d = await deps("SELECT COALESCE(email, name) FROM users", catalog);
    expect(d).toContain("public.users.email");
    expect(d).toContain("public.users.name");
  });

  it("TypeCast — dep from the cast source expression", async () => {
    const d = await deps("SELECT id::text FROM users", catalog);
    expect(d).toContain("public.users.id");
  });

  it("IS NULL / IS NOT NULL in WHERE — dep from the tested column", async () => {
    const d = await deps("SELECT id FROM users WHERE email IS NOT NULL", catalog);
    expect(d).toContain("public.users.email");
    expect(d).toContain("public.users.id");
  });

  it("IS NULL in target — dep from the tested column", async () => {
    const d = await deps("SELECT email IS NULL AS is_null FROM users", catalog);
    expect(d).toContain("public.users.email");
  });

  it("arithmetic expression — deps from both sides", async () => {
    const d = await deps("SELECT id + score FROM users", catalog);
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.users.score");
  });

  it("BoolExpr (AND/OR) in WHERE — deps from all conditions", async () => {
    const d = await deps(
      "SELECT id FROM users WHERE active = true AND email IS NOT NULL OR score > 0",
      catalog,
    );
    expect(d).toContain("public.users.active");
    expect(d).toContain("public.users.email");
    expect(d).toContain("public.users.score");
  });
});

describe("extractDeps: dollar parameters", () => {
  const catalog = mockCatalog([
    { schema: "public", name: "users", columns: ["id", "email", "name"] },
  ]);

  it("params in WHERE don't generate deps", async () => {
    const d = await deps("SELECT id, email FROM users WHERE id = $1 AND email = $2", catalog);
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.users.email");
    // No stray deps from $1 / $2.
    expect(d).not.toContain("$1");
    expect(d).not.toContain("$2");
  });

  it("params in VALUES — no deps from params themselves", async () => {
    const d = await deps(
      "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id",
      catalog,
    );
    expect(d).toContain("public.users.email");
    expect(d).toContain("public.users.name");
    expect(d).toContain("public.users.id");
    expect(d.filter(x => x.includes("$"))).toHaveLength(0);
  });

  it("param inside function call", async () => {
    const cat = mockCatalog(
      [{ schema: "public", name: "users", columns: ["id", "email"] }],
      [{ schema: "public", name: "get_user" }],
    );
    const d = await deps("SELECT get_user($1) FROM users WHERE id = $2", cat);
    expect(d).toContain("public.get_user");
    expect(d).toContain("public.users.id");
  });
});

describe("extractDeps: set operations (UNION/INTERSECT/EXCEPT)", () => {
  const catalog = mockCatalog([
    { schema: "public", name: "users", columns: ["id", "email"] },
    { schema: "public", name: "posts", columns: ["id", "user_id"] },
    { schema: "public", name: "audit", columns: ["id", "user_id"] },
  ]);

  it("UNION — deps from both sides", async () => {
    const d = await deps("SELECT id FROM users UNION SELECT user_id FROM posts", catalog);
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.posts.user_id");
  });

  it("UNION ALL — deps from both sides", async () => {
    const d = await deps("SELECT id FROM users UNION ALL SELECT user_id FROM audit", catalog);
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.audit.user_id");
  });

  it("INTERSECT — deps from both sides", async () => {
    const d = await deps("SELECT id FROM users INTERSECT SELECT user_id FROM posts", catalog);
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.posts.user_id");
  });
});

describe("extractDeps: window functions", () => {
  const catalog = mockCatalog([
    { schema: "public", name: "posts", columns: ["id", "user_id", "title"] },
  ]);

  it("row_number() OVER PARTITION BY — dep from partition column", async () => {
    const d = await deps(
      "SELECT id, row_number() OVER (PARTITION BY user_id ORDER BY id) FROM posts",
      catalog,
    );
    expect(d).toContain("public.posts.user_id");
    expect(d).toContain("public.posts.id");
    // row_number is a built-in — not in deps.
    expect(d).not.toContain("public.row_number");
  });
});

describe("extractDeps: nested CTEs", () => {
  const catalog = mockCatalog([
    { schema: "public", name: "users", columns: ["id", "email", "active"] },
    { schema: "public", name: "posts", columns: ["id", "user_id", "title"] },
  ]);

  it("CTE referencing another CTE", async () => {
    const d = await deps(
      "WITH a AS (SELECT id FROM users WHERE active = true), " +
      "b AS (SELECT id FROM a) " +
      "SELECT id FROM b",
      catalog,
    );
    // Deps come from CTE a's body (the only real table).
    expect(d).toContain("public.users");
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.users.active");
    // CTEs themselves are not catalog entities.
    expect(d).not.toContain("public.a");
    expect(d).not.toContain("public.b");
  });

  it("CTE with explicit column names", async () => {
    const d = await deps(
      "WITH au(uid, mail) AS (SELECT id, email FROM users) SELECT uid, mail FROM au",
      catalog,
    );
    expect(d).toContain("public.users");
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.users.email");
  });
});

describe("extractDeps: 3-part qualified refs", () => {
  const catalog = mockCatalog([
    { schema: "public", name: "users", columns: ["id", "email"] },
  ]);

  it("schema.table.column in SELECT", async () => {
    const d = await deps("SELECT public.users.id FROM public.users", catalog);
    expect(d).toContain("public.users");
    expect(d).toContain("public.users.id");
  });

  it("schema.table.column in WHERE", async () => {
    const d = await deps(
      "SELECT id FROM public.users WHERE public.users.email IS NOT NULL",
      catalog,
    );
    expect(d).toContain("public.users.email");
  });
});

describe("extractDeps: multi-schema", () => {
  const catalog = mockCatalog([
    { schema: "public", name: "users", columns: ["id", "email"] },
    { schema: "billing", name: "invoices", columns: ["id", "user_id", "amount"] },
  ]);

  it("cross-schema JOIN", async () => {
    const d = await deps(
      "SELECT u.id, i.amount FROM public.users u INNER JOIN billing.invoices i ON i.user_id = u.id",
      catalog,
    );
    expect(d).toContain("public.users");
    expect(d).toContain("public.users.id");
    expect(d).toContain("billing.invoices");
    expect(d).toContain("billing.invoices.amount");
    expect(d).toContain("billing.invoices.user_id");
  });

  it("schema-qualified table without alias", async () => {
    const d = await deps("SELECT id FROM billing.invoices", catalog);
    expect(d).toContain("billing.invoices");
    expect(d).toContain("billing.invoices.id");
  });
});

describe("extractDeps: edge cases", () => {
  const catalog = mockCatalog([
    { schema: "public", name: "users", columns: ["id", "email", "name", "active"] },
    { schema: "public", name: "posts", columns: ["id", "user_id", "title"] },
  ]);

  it("subquery in scalar context (SELECT expr)", async () => {
    const d = await deps(
      "SELECT (SELECT count(*) FROM posts WHERE user_id = u.id) AS post_count FROM users u",
      catalog,
    );
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.posts.user_id");
  });

  it("correlated subquery in WHERE", async () => {
    const d = await deps(
      "SELECT email FROM users u WHERE EXISTS (SELECT 1 FROM posts p WHERE p.user_id = u.id AND p.title = u.email)",
      catalog,
    );
    expect(d).toContain("public.users.email");
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.posts.user_id");
    expect(d).toContain("public.posts.title");
  });

  it("column not in catalog — silently skipped", async () => {
    const d = await deps("SELECT nonexistent_col FROM users", catalog);
    expect(d).toContain("public.users");
    expect(d).not.toContain("nonexistent_col");
  });

  it("table not in catalog — no dep emitted", async () => {
    const d = await deps("SELECT * FROM nonexistent_table", catalog);
    // No table dep, no column deps — the table isn't resolvable.
    expect(d).toEqual([]);
  });

  it("DELETE with USING clause", async () => {
    const d = await deps(
      "DELETE FROM users USING posts WHERE posts.user_id = users.id RETURNING users.id",
      catalog,
    );
    expect(d).toContain("public.users");
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.posts");
    expect(d).toContain("public.posts.user_id");
  });

  it("UPDATE with FROM clause (multi-table)", async () => {
    // PostgreSQL UPDATE...FROM syntax.
    const d = await deps(
      "UPDATE users SET name = posts.title FROM posts WHERE posts.user_id = users.id",
      catalog,
    );
    expect(d).toContain("public.users");
    expect(d).toContain("public.users.name");
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.posts");
    expect(d).toContain("public.posts.title");
    expect(d).toContain("public.posts.user_id");
  });
});

// ---------------------------------------------------------------------------
// New AST node types: MinMaxExpr, ScalarArrayOp, NamedArgExpr, RowExpr,
// ArrayExpr, CollateClause, A_Indirection, windowClause, distinctClause,
// RangeTableSample, MergeStmt, SetToDefault.
// ---------------------------------------------------------------------------

describe("extractDeps: new expression node types", () => {
  const catalog = mockCatalog([
    { schema: "public", name: "users", columns: ["id", "email", "score", "tag", "name"] },
  ]);

  it("MinMaxExpr (GREATEST/LEAST)", async () => {
    const d = await deps("SELECT GREATEST(id, score) FROM users", catalog);
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.users.score");
  });

  it("ScalarArrayOp (ANY) — parsed as A_Expr with AEXPR_OP_ANY", async () => {
    const d = await deps("SELECT id FROM users WHERE tag = ANY($1)", catalog);
    expect(d).toContain("public.users.tag");
  });

  it("NamedArgExpr — named function argument", async () => {
    const cat = mockCatalog(
      [{ schema: "public", name: "users", columns: ["id"] }],
      [{ schema: "public", name: "my_fn" }],
    );
    const d = await deps("SELECT public.my_fn(arg => id) FROM users", cat);
    expect(d).toContain("public.my_fn");
    expect(d).toContain("public.users.id");
  });

  it("RowExpr — row constructor in WHERE", async () => {
    const d = await deps("SELECT id FROM users WHERE (id, email) = ($1, $2)", catalog);
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.users.email");
  });

  it("A_ArrayExpr — ARRAY constructor", async () => {
    const d = await deps("SELECT ARRAY[id, email] FROM users", catalog);
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.users.email");
  });

  it("CollateClause — COLLATE", async () => {
    const d = await deps('SELECT id COLLATE "C" FROM users', catalog);
    expect(d).toContain("public.users.id");
  });

  it("A_Indirection — composite field access (users).id", async () => {
    const d = await deps("SELECT (users).id FROM users", catalog);
    // The table dep is extracted from the FROM clause; the A_Indirection
    // wraps a ColumnRef for the table name.
    expect(d).toContain("public.users");
  });

  it("SetToDefault — UPDATE SET col = DEFAULT", async () => {
    const d = await deps("UPDATE users SET name = DEFAULT WHERE id = $1", catalog);
    expect(d).toContain("public.users");
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.users.name");
  });
});

describe("extractDeps: SELECT structure (windowClause, distinctClause)", () => {
  const catalog = mockCatalog([
    { schema: "public", name: "users", columns: ["id", "email", "active"] },
  ]);

  it("WINDOW clause — partition + order deps", async () => {
    const d = await deps(
      "SELECT id, count(*) OVER w FROM users WINDOW w AS (PARTITION BY email ORDER BY id)",
      catalog,
    );
    expect(d).toContain("public.users.email");
    expect(d).toContain("public.users.id");
  });

  it("DISTINCT ON — dep from distinct column", async () => {
    const d = await deps("SELECT DISTINCT ON (id) id, email FROM users", catalog);
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.users.email");
  });
});

describe("extractDeps: FROM items (RangeTableSample)", () => {
  const catalog = mockCatalog([
    { schema: "public", name: "users", columns: ["id", "email"] },
  ]);

  it("TABLESAMPLE — table dep extracted", async () => {
    const d = await deps("SELECT id FROM users TABLESAMPLE BERNOULLI(50)", catalog);
    expect(d).toContain("public.users");
    expect(d).toContain("public.users.id");
  });
});

describe("extractDeps: MergeStmt", () => {
  const catalog = mockCatalog([
    { schema: "public", name: "target", columns: ["id", "name"] },
    { schema: "public", name: "source", columns: ["id", "name"] },
  ]);

  it("MERGE INTO ... USING ... WHEN MATCHED THEN UPDATE", async () => {
    const d = await deps(
      "MERGE INTO target t USING source s ON t.id = s.id " +
      "WHEN MATCHED THEN UPDATE SET name = s.name",
      catalog,
    );
    expect(d).toContain("public.target");
    expect(d).toContain("public.target.id");
    expect(d).toContain("public.target.name");
    expect(d).toContain("public.source");
    expect(d).toContain("public.source.id");
    expect(d).toContain("public.source.name");
  });
});

// ---------------------------------------------------------------------------
// Comprehensive edge cases: nested expressions, CTE chains, MERGE variants,
// XmlExpr, GROUPING SETS, FOR UPDATE, LATERAL.
// ---------------------------------------------------------------------------

describe("extractDeps: deeply nested expressions", () => {
  const catalog = mockCatalog([
    { schema: "public", name: "users", columns: ["id", "email", "score", "active"] },
  ]);

  it("CASE inside COALESCE inside TypeCast", async () => {
    const d = await deps(
      "SELECT COALESCE(CASE WHEN id > 0 THEN 'yes' ELSE NULL END, 'no')::text FROM users",
      catalog,
    );
    expect(d).toContain("public.users.id");
  });

  it("nested function calls (lower(upper(col)))", async () => {
    const d = await deps("SELECT lower(upper(email)) FROM users", catalog);
    expect(d).toContain("public.users.email");
  });

  it("COALESCE with nested CASE and arithmetic", async () => {
    const d = await deps(
      "SELECT COALESCE(CASE WHEN score > 0 THEN score + 1 ELSE NULL END, 0) FROM users",
      catalog,
    );
    expect(d).toContain("public.users.score");
  });

  it("subquery inside COALESCE", async () => {
    const d = await deps(
      "SELECT COALESCE((SELECT max(score) FROM users WHERE active = true), 0) FROM users",
      catalog,
    );
    expect(d).toContain("public.users.score");
    expect(d).toContain("public.users.active");
  });

  it("CASE with subquery in condition", async () => {
    const d = await deps(
      "SELECT CASE WHEN EXISTS (SELECT 1 FROM users WHERE active = false) THEN 'has_inactive' ELSE 'all_active' END FROM users",
      catalog,
    );
    expect(d).toContain("public.users.active");
  });
});

describe("extractDeps: CTE chains (3+ levels)", () => {
  const catalog = mockCatalog([
    { schema: "public", name: "users", columns: ["id", "email", "active", "score"] },
    { schema: "public", name: "posts", columns: ["id", "user_id", "title"] },
    { schema: "public", name: "comments", columns: ["id", "post_id", "body"] },
  ]);

  it("three CTEs chaining through each other", async () => {
    const d = await deps(
      "WITH " +
      "a AS (SELECT id, email FROM users WHERE active = true), " +
      "b AS (SELECT a.id, p.title FROM a JOIN posts p ON p.user_id = a.id), " +
      "c AS (SELECT b.id, count(c2.body) AS cnt FROM b JOIN comments c2 ON c2.post_id = b.id GROUP BY b.id) " +
      "SELECT id, cnt FROM c",
      catalog,
    );
    expect(d).toContain("public.users");
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.users.email");
    expect(d).toContain("public.users.active");
    expect(d).toContain("public.posts");
    expect(d).toContain("public.posts.title");
    expect(d).toContain("public.posts.user_id");
    expect(d).toContain("public.comments");
    expect(d).toContain("public.comments.body");
    expect(d).toContain("public.comments.post_id");
  });

  it("recursive CTE (WITH RECURSIVE)", async () => {
    const d = await deps(
      "WITH RECURSIVE r AS (" +
      "  SELECT id FROM users WHERE active = true " +
      "  UNION " +
      "  SELECT u.id FROM users u JOIN r ON r.id = u.id " +
      ") SELECT id FROM r",
      catalog,
    );
    expect(d).toContain("public.users");
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.users.active");
  });

  it("CTE used in subquery in WHERE", async () => {
    const d = await deps(
      "WITH active AS (SELECT id FROM users WHERE active = true) " +
      "SELECT email FROM users WHERE id IN (SELECT id FROM active)",
      catalog,
    );
    expect(d).toContain("public.users.active");
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.users.email");
  });
});

describe("extractDeps: deeply nested subqueries (3+ levels)", () => {
  const catalog = mockCatalog([
    { schema: "public", name: "a", columns: ["id", "val"] },
    { schema: "public", name: "b", columns: ["id", "a_id", "b_id", "val"] },
    { schema: "public", name: "c", columns: ["id", "b_id", "val"] },
  ]);

  it("subquery in subquery in subquery", async () => {
    const d = await deps(
      "SELECT id FROM a WHERE val IN (" +
      "  SELECT val FROM b WHERE b_id IN (" +
      "    SELECT id FROM b WHERE a_id IN (" +
      "      SELECT id FROM a WHERE val = 'x'" +
      "    )" +
      "  )" +
      ")",
      catalog,
    );
    expect(d).toContain("public.a");
    expect(d).toContain("public.a.id");
    expect(d).toContain("public.a.val");
    expect(d).toContain("public.b");
    expect(d).toContain("public.b.val");
    expect(d).toContain("public.b.b_id");
    expect(d).toContain("public.b.a_id");
  });
});

describe("extractDeps: MERGE variants", () => {
  const catalog = mockCatalog([
    { schema: "public", name: "target", columns: ["id", "name"] },
    { schema: "public", name: "source", columns: ["id", "name"] },
  ]);

  it("MERGE WHEN NOT MATCHED THEN INSERT", async () => {
    const d = await deps(
      "MERGE INTO target t USING source s ON t.id = s.id " +
      "WHEN NOT MATCHED THEN INSERT (id, name) VALUES (s.id, s.name)",
      catalog,
    );
    expect(d).toContain("public.target");
    expect(d).toContain("public.target.id");
    expect(d).toContain("public.target.name");
    expect(d).toContain("public.source");
    expect(d).toContain("public.source.id");
    expect(d).toContain("public.source.name");
  });

  it("MERGE WHEN MATCHED THEN DELETE with condition", async () => {
    const d = await deps(
      "MERGE INTO target t USING source s ON t.id = s.id " +
      "WHEN MATCHED AND s.name = 'x' THEN DELETE",
      catalog,
    );
    expect(d).toContain("public.target");
    expect(d).toContain("public.target.id");
    expect(d).toContain("public.source");
    expect(d).toContain("public.source.id");
    expect(d).toContain("public.source.name");
  });

  it("MERGE with multiple WHEN clauses", async () => {
    const d = await deps(
      "MERGE INTO target t USING source s ON t.id = s.id " +
      "WHEN MATCHED AND s.name = 'update' THEN UPDATE SET name = s.name " +
      "WHEN NOT MATCHED THEN INSERT (id, name) VALUES (s.id, s.name)",
      catalog,
    );
    expect(d).toContain("public.target");
    expect(d).toContain("public.target.id");
    expect(d).toContain("public.target.name");
    expect(d).toContain("public.source");
    expect(d).toContain("public.source.id");
    expect(d).toContain("public.source.name");
  });
});

describe("extractDeps: niche AST node types", () => {
  const catalog = mockCatalog([
    { schema: "public", name: "users", columns: ["id", "email", "score"] },
  ]);

  it("XmlExpr (xmlelement)", async () => {
    const d = await deps("SELECT xmlelement(name foo, id) FROM users", catalog);
    expect(d).toContain("public.users.id");
  });

  it("GROUPING SETS", async () => {
    const d = await deps(
      "SELECT id, count(*) FROM users GROUP BY GROUPING SETS (id, ())",
      catalog,
    );
    expect(d).toContain("public.users.id");
  });

  it("FOR UPDATE — locked relations", async () => {
    const d = await deps("SELECT id FROM users FOR UPDATE", catalog);
    expect(d).toContain("public.users.id");
  });

  it("FOR UPDATE OF aliased table", async () => {
    const d = await deps("SELECT u.id FROM users u FOR UPDATE OF u", catalog);
    expect(d).toContain("public.users.id");
  });
});

describe("extractDeps: LATERAL joins", () => {
  const catalog = mockCatalog([
    { schema: "public", name: "users", columns: ["id", "email"] },
    { schema: "public", name: "posts", columns: ["id", "user_id", "title"] },
  ]);

  it("LATERAL subquery referencing outer table", async () => {
    const d = await deps(
      "SELECT u.id, x.title FROM users u, " +
      "LATERAL (SELECT title FROM posts WHERE user_id = u.id LIMIT 1) x",
      catalog,
    );
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.posts.title");
    expect(d).toContain("public.posts.user_id");
  });

  it("LATERAL in JOIN syntax", async () => {
    const d = await deps(
      "SELECT u.id, x.title FROM users u " +
      "LEFT JOIN LATERAL (SELECT title FROM posts WHERE user_id = u.id) x ON true",
      catalog,
    );
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.posts.title");
    expect(d).toContain("public.posts.user_id");
  });
});
