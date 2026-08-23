import { describe, it, expect } from "vitest";
import { parseSql } from "../../../src/ast.js";
import { extractDeps } from "../../../src/query/resolver.js";
import type { DepCatalog, ResolvedTable, ResolvedFunction } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// The RED SUITE for CTE COLUMN ATTRIBUTION in `extractDeps`.
//
// `registerCtes` recorded a CTE's output columns only from an explicit
// `WITH w(a, b)`, commented "skip for now — rare in practice". Two things were
// wrong with that, and the second is why it never got fixed:
//
//   1. A CTE WITHOUT a column list is the ordinary spelling, not the rare one.
//   2. Recording the names would not have helped. `resolveUnqualifiedColumn`
//      gates every alias on `table.schema &&`, and a CTE's schema is "" — so
//      it SKIPS the CTE whether or not the columns are known and falls through
//      to the next candidate. Measured: with `WITH w(sku) AS …`, the case the
//      resolver already handled, the spurious dependency was identical.
//
// So the defect is not the missing names. It is that a CTE match must STOP
// the search; the names are what makes stopping possible.
//
// DIRECTION MATTERS HERE and decides the fallback. A spurious dep over-
// invalidates, which is safe; a MISSING dep leaves a stale contract behind a
// changed table, which is not. So the search may only stop where the CTE's
// column list is known to be COMPLETE — `SELECT *`, a VALUES body or an
// unnamed expression leaves it incomplete, and the old over-reporting
// behaviour is the right answer there.
// ---------------------------------------------------------------------------

function mockCatalog(tables: { schema: string; name: string; columns: string[] }[]): DepCatalog {
  const tableMap = new Map<string, ResolvedTable>();
  for (const t of tables) {
    tableMap.set(`${t.schema}.${t.name}`, { schema: t.schema, name: t.name, columns: t.columns });
  }
  return {
    resolveTable(schema: string | undefined, name: string): ResolvedTable | null {
      return tableMap.get(`${schema ?? "public"}.${name}`) ?? null;
    },
    resolveFunctions(): ResolvedFunction[] {
      return [];
    },
  };
}

const catalog = mockCatalog([
  { schema: "public", name: "products", columns: ["id", "sku", "name"] },
  { schema: "public", name: "users", columns: ["id", "email", "active"] },
  // A second carrier of `sku`, so a scope-order test can actually go wrong.
  { schema: "public", name: "other", columns: ["id", "sku"] },
]);

async function deps(sql: string): Promise<string[]> {
  const parsed = await parseSql(sql);
  return extractDeps(parsed.stmts![0]!.stmt!, catalog, ["public"]);
}

describe("CTE column attribution — targets", () => {
  it("an inferred CTE column is not attributed to an outer table", async () => {
    // PostgreSQL resolves this `sku` to the CTE — inner scope wins — so
    // `products.sku` is no part of what this query reads.
    const d = await deps(
      `WITH w AS (SELECT 'x' AS sku) SELECT (SELECT sku FROM w) AS s FROM products p`,
    );
    expect(d).not.toContain("public.products.sku");
  });

  it("nor is an EXPLICITLY listed one — the case that was already handled", async () => {
    // The control that proves the recorded fix was inert: the names were
    // recorded here all along and the spurious dep came out just the same.
    const d = await deps(
      `WITH w(sku) AS (SELECT 'x') SELECT (SELECT sku FROM w) AS s FROM products p`,
    );
    expect(d).not.toContain("public.products.sku");
  });

  it("a CTE column name taken from a bare column reference is inferred", async () => {
    // `SELECT id FROM users` names its output column `id` with no AS, and
    // `products` carries an `id` of its own — so the two tables have to be
    // DIFFERENT for this to discriminate. The first draft of this test read
    // the CTE and the outer table off the same table and asserted a column
    // neither could produce; it passed against the broken resolver.
    const d = await deps(
      `WITH w AS (SELECT id FROM users) SELECT (SELECT id FROM w) AS s FROM products p`,
    );
    // The CTE's BODY genuinely reads users.id — that dep must stay.
    expect(d).toContain("public.users.id");
    // Nothing reads products.id: the outer FROM contributes the RELATION, and
    // the only column reference in the query belongs to the CTE.
    expect(d).not.toContain("public.products.id");
  });

  it("a CTE emits no entity id of its own", async () => {
    // `resolveAndAddTable` wrote `${schema}.${name}` unconditionally, so every
    // CTE reference put a malformed `.w` into the dependency set. The test
    // that meant to catch this asserted `not.toContain("public.active_users")`
    // — true for the wrong reason, since the emitted string has no schema.
    const d = await deps(`WITH w AS (SELECT id FROM users) SELECT id FROM w`);
    expect(d.filter(e => e.startsWith("."))).toEqual([]);
  });
});

describe("CTE column attribution — boundary guards", () => {
  it("a real outer column is still attributed", async () => {
    // The same shape with a name the CTE does NOT carry: the search must run
    // past the CTE and find the table.
    const d = await deps(
      `WITH w AS (SELECT 'x' AS zz) SELECT (SELECT zz FROM w) AS s, p.sku FROM products p`,
    );
    expect(d).toContain("public.products.sku");
  });

  it("an unqualified outer column resolves past a CTE that does not carry it", async () => {
    const d = await deps(
      `WITH w AS (SELECT 'x' AS zz) SELECT (SELECT zz FROM w) AS s, sku FROM products`,
    );
    expect(d).toContain("public.products.sku");
  });

  it("a CTE body's own dependencies are unaffected", async () => {
    const d = await deps(
      `WITH w AS (SELECT id, email FROM users WHERE active) SELECT id FROM w`,
    );
    expect(d).toContain("public.users");
    expect(d).toContain("public.users.id");
    expect(d).toContain("public.users.email");
    expect(d).toContain("public.users.active");
  });

  it("an inner scope still outranks an outer one for a plain table", async () => {
    // Both relations carry `sku`, and PostgreSQL resolves the inner one. This
    // was written as a TARGET on the belief that the search consulted outer
    // aliases before inner un-aliased tables; measured, it never did, because
    // `resolveAndAddTable` registers an un-aliased table in `aliases` under
    // its own name and the inner alias map is always searched first. It stays
    // as a guard on a rule nothing else in this file states.
    const d = await deps(`SELECT (SELECT sku FROM products) AS s FROM other o`);
    expect(d).toContain("public.products.sku");
    expect(d).not.toContain("public.other.sku");
  });

  it("a STAR body leaves the list incomplete, and over-reporting is the safe answer", async () => {
    // `SELECT *` gives no confident name list. A missing dep leaves a stale
    // contract behind a changed table; a spurious one only over-invalidates.
    // So this keeps the OLD behaviour deliberately, and the assertion is that
    // it does.
    const d = await deps(
      `WITH w AS (SELECT * FROM users) SELECT (SELECT email FROM w) AS s FROM products p`,
    );
    expect(d).toContain("public.users");
  });
});
