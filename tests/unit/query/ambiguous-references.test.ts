import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferNullability } from "../../../src/query/nullability-walk.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// Ambiguous unqualified column references.
//
// This cannot be a fixture. PostgreSQL rejects an ambiguous reference at
// parse-analysis time, so the fixture suites' validity gate (PREPARE) fires
// first and the case would fail for the wrong reason. It needs to call the
// walk directly.
//
// PostgreSQL's model: a name that resolves to more than one visible column is
// an error, not a first-match-wins lookup. The walk cannot raise — it is used
// on queries nobody has validated yet, and its contract is to be conservative
// rather than to fail — so the requirement is the weaker one that it must not
// invent a confident answer.
//
// The observable contract is ORDER INDEPENDENCE. Today the walk scans the
// alias map and takes the first hit, so `FROM products, customers` reports
// notNull while `FROM customers, products` reports nullable: the same
// unrunnable query, two opposite answers decided by FROM-clause order.
// ---------------------------------------------------------------------------

const FIXTURES_DIR = join(__dirname, "fixtures");

describe("ambiguous unqualified references", () => {
  let pg: PGlite;
  let catalog: NullabilityCatalog;

  beforeAll(async () => {
    pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
    await pg.exec(readFileSync(join(FIXTURES_DIR, "schema.sql"), "utf8"));
    catalog = await buildNullabilityCatalog(await snapshotCatalog(pg));
  });

  afterAll(async () => {
    if (!pg.closed) await pg.close();
  });

  const infer = async (sql: string) => {
    const parsed = await parseSql(sql);
    return inferNullability(parsed.stmts![0]!.stmt!, catalog);
  };

  /** Every query here is one PostgreSQL rejects as ambiguous. */
  const AMBIGUOUS: { label: string; a: string; b: string }[] = [
    {
      // products.name is NOT NULL, customers.name is nullable.
      label: "two tables, differing nullability",
      a: "SELECT name FROM products, customers",
      b: "SELECT name FROM customers, products",
    },
    {
      // Both id columns are NOT NULL, but the reference is still ambiguous.
      label: "two tables, both NOT NULL",
      a: "SELECT id FROM products, reviews",
      b: "SELECT id FROM reviews, products",
    },
    {
      label: "subquery exposing a duplicated name",
      a: "SELECT n FROM (SELECT p.name AS n, c.name AS n FROM products p, customers c) x",
      b: "SELECT n FROM (SELECT c.name AS n, p.name AS n FROM products p, customers c) x",
    },
  ];

  for (const { label, a, b } of AMBIGUOUS) {
    it(`is order-independent: ${label}`, async () => {
      const [ra, rb] = [await infer(a), await infer(b)];
      expect(ra.length).toBe(1);
      expect(rb.length).toBe(1);
      expect(
        ra[0]!.notNull,
        `Ambiguous reference resolved differently depending on FROM order:\n` +
          `  ${a}\n    -> ${ra[0]!.notNull ? "notNull" : "nullable"}\n` +
          `  ${b}\n    -> ${rb[0]!.notNull ? "notNull" : "nullable"}`,
      ).toBe(rb[0]!.notNull);
    });
  }

  it("does not claim notNull for a reference it cannot resolve uniquely", async () => {
    // The safe answer for an unresolvable name is nullable — the same
    // treatment the walk already gives a name it cannot find at all.
    for (const { a, b } of AMBIGUOUS) {
      for (const sql of [a, b]) {
        const r = await infer(sql);
        expect(r[0]!.notNull, `${sql} claimed notNull for an ambiguous reference`).toBe(false);
      }
    }
  });

  it("a qualified reference is never ambiguous", async () => {
    // Qualification is what disambiguates, and PostgreSQL accepts these.
    const r = await infer("SELECT p.name, c.name FROM products p, customers c");
    expect(r.map(x => x.notNull)).toEqual([true, false]);
  });

  // A name an alias COLUMN LIST has HIDDEN, which is here for the reason at
  // the top of this file rather than as a fixture: PostgreSQL rejects the
  // statement at parse-analysis, so the fixture suites' PREPARE gate fires
  // first and the case would fail for the wrong reason.
  //
  // `FROM refunds_archive AS r(c0, c1, c2)` renames all three columns, so
  // `r.id` names nothing. The engine used to answer `notNull` for it — reading
  // `refunds.id` through a name the query cannot use — which is the same
  // failure this file's other cases pin: inventing a confident answer about a
  // reference that does not resolve. The visible half of the defect (star
  // expansion emitting catalog names) is pinned by the `alias-column-list-*`
  // fixtures, which PostgreSQL does accept.
  it("does not claim notNull for a catalog name an alias column list hides", async () => {
    const hidden = await infer("SELECT r.id FROM refunds_archive AS r(c0, c1, c2)");
    expect(hidden.length).toBe(1);
    expect(hidden[0]!.notNull, "answered for a column the rename hides").toBe(false);

    // The control, and the reason this is not simply "unknown names are
    // nullable": WITHOUT the list the very same reference resolves and the
    // column really is NOT NULL, so the rename is what has to be read.
    const visible = await infer("SELECT r.id FROM refunds_archive AS r");
    expect(visible[0]!.notNull).toBe(true);

    // And the renamed name reaches the same column's facts.
    const renamed = await infer("SELECT r.c0 FROM refunds_archive AS r(c0, c1, c2)");
    expect(renamed[0]!.notNull).toBe(true);
  });
});
