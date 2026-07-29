import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferNullability } from "../../../src/query/nullability-walk.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// Executable soundness check.
//
// nullability-walk.test.ts compares the engine against hand-written
// annotations — it proves the engine and the fixture author agree, not that
// either is right. This suite compares the engine against PostgreSQL itself.
//
// Three independent assertions per fixture:
//
//   1. Validity — PostgreSQL must accept the query. Checked with PREPARE,
//      which resolves tables, columns, operators, and aggregate/GROUP BY
//      rules without running anything. A query PostgreSQL rejects has no
//      output columns to be nullable, so its annotations assert nothing.
//
//   2. Shape — the engine's output columns must match PostgreSQL's, by count
//      and by name. This is the assertion the annotation-based suite cannot
//      make: there, the expected column count comes from the annotations a
//      human wrote, so a misjudged shape is encoded identically in both the
//      fixture and the engine and the test agrees with itself. A wrong column
//      list is also worse than a wrong flag for a codegen consumer.
//
//   3. Soundness — the query is executed under several adversarial data
//      states, and no column the engine calls `notNull` may come back NULL.
//      This step compares by position, so it is only meaningful once step 2
//      has established that the two column lists line up. Without that,
//      a missing column silently shifts every later comparison onto the
//      wrong pair.
//
// A statement that raises is not a counterexample: it returned no rows, so
// the "never NULL" guarantee still holds for every row it did return. Errors
// are therefore skipped during step 3 — several fixtures raise on purpose
// (`NULL::nn_text` throws instead of yielding NULL, which is precisely why
// the cast is treated as non-null), and DML fixtures hit key and FK
// constraints under some states.
// ---------------------------------------------------------------------------

const FIXTURES_DIR = join(__dirname, "fixtures");
const SCHEMA_SQL = readFileSync(join(FIXTURES_DIR, "schema.sql"), "utf8");

const fixtureFiles = readdirSync(FIXTURES_DIR)
  .filter(f => f.endsWith(".sql") && f !== "schema.sql")
  .sort();

/**
 * Adversarial data states, applied in a transaction and rolled back per
 * fixture. `empty` is the important one: it drives every aggregate over zero
 * rows and leaves every outer join unmatched. `dense` fills every table and
 * puts NULLs in every nullable column.
 */
const DATA_STATES: Record<string, string> = {
  empty: "",

  sparse: `
    INSERT INTO categories (id, parent_id, slug, name) VALUES (1, NULL, 'root', 'Root');
    INSERT INTO customers (id, email, name) VALUES (1, 'a@b.c', NULL);
    INSERT INTO products (id, category_id, sku, name, price) VALUES (1, NULL, 'S1', 'P1', 10);
    INSERT INTO orders (id, customer_id, status, placed_at) VALUES (1, 1, 'fulfilled', now());
  `,

  dense: `
    INSERT INTO categories (id, parent_id, slug, name) VALUES
      (1, NULL, 'root', 'Root'), (2, 1, 'sub', 'Sub'), (3, NULL, 'del', 'Deleted');
    UPDATE categories SET deleted_at = now() WHERE id = 3;
    INSERT INTO customers (id, email, name) VALUES
      (1, 'a@b.c', 'Alice'), (2, 'b@b.c', NULL), (3, 'c@b.c', 'Carol'),
      (4, 'd@b.c', NULL);
    -- A NULL name alongside a non-NULL deleted_at makes the conjunction
    -- "name IS NULL AND deleted_at IS NULL" FALSE rather than TRUE, so a CASE
    -- guarded on it really does fall through to its ELSE with name still NULL.
    UPDATE customers SET deleted_at = now() WHERE id = 4;
    INSERT INTO products (id, category_id, sku, name, price) VALUES
      (1, 1, 'S1', 'P1', 10), (2, 2, 'S2', 'P2', 900), (3, NULL, 'S3', 'P3', 5);
    INSERT INTO orders (id, customer_id, status, placed_at) VALUES
      (1, 1, 'fulfilled', now()), (2, 2, 'pending', now()), (3, 1, 'shipped', now());
    INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES
      (1, 1, 1, 2, 10), (2, 1, 2, 60, 900), (3, 3, 3, 1, 5);
    INSERT INTO reviews (id, product_id, customer_id, rating, comment) VALUES
      (1, 1, 1, 5, 'great'), (2, 1, 2, 1, NULL), (3, 2, 3, 4, 'ok');
    INSERT INTO addresses (id, customer_id, line1, line2, city, state, postal_code) VALUES
      (1, 1, 'L1', NULL, 'City', 'ST', NULL);
    -- Tag 99 has no matching product, so a MERGE against products fires
    -- WHEN NOT MATCHED BY SOURCE and returns NULL for every source column.
    INSERT INTO tags (id, name) VALUES (1, 'new'), (2, 'sale'), (99, 'orphan-tag');
    INSERT INTO product_tags (product_id, tag_id) VALUES (1, 1), (1, 2);
    INSERT INTO coupons (id, code, discount_percent, expires_at) VALUES (1, 'C1', 10, NULL);
    INSERT INTO shipments (id, order_id, carrier, tracking_no, shipped_at, delivered_at)
      VALUES (1, 1, 'UPS', NULL, now(), NULL), (2, 3, 'DHL', 'T2', now(), now());
    INSERT INTO events (id, data, meta) VALUES (1, '{"id":1}'::jsonb, NULL);
  `,
};

describe("nullability soundness (engine vs PostgreSQL)", () => {
  let pg: PGlite;
  let catalog: NullabilityCatalog;

  beforeAll(async () => {
    pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
    await pg.exec(SCHEMA_SQL);
    catalog = await buildNullabilityCatalog(await snapshotCatalog(pg));
  });

  afterAll(async () => {
    if (!pg.closed) await pg.close();
  });

  let prepareCounter = 0;

  for (const file of fixtureFiles) {
    const filePath = join(FIXTURES_DIR, file);

    it(basename(file, ".sql"), async () => {
      const raw = readFileSync(filePath, "utf8");

      // --- 1. Validity: PostgreSQL must be able to plan this query. ---
      const stmtName = `nullability_probe_${prepareCounter++}`;
      await pg.exec("BEGIN;");
      let planError: string | null = null;
      try {
        await pg.exec(`PREPARE ${stmtName} AS ${raw}`);
      } catch (e) {
        planError = (e as Error).message;
      } finally {
        await pg.exec("ROLLBACK;");
      }
      expect(planError, `PostgreSQL rejected this fixture: ${planError}`).toBeNull();

      // Params carry no type info here; NULL exercises the nullable path.
      const runnable = raw.replace(/\$\d+/g, "NULL");
      const parsed = await parseSql(raw);
      const claimed = inferNullability(parsed.stmts![0]!.stmt!, catalog);

      // --- 2. Shape: engine columns must match PostgreSQL's. ---
      // Run against an EMPTY database. With no rows, target-list expressions
      // are never evaluated, so a fixture that would otherwise raise (a cast
      // to a NOT NULL domain, a conflicting INSERT) still yields a row
      // description — which is all this step needs.
      await pg.exec("BEGIN;");
      let pgColumns: string[] = [];
      let shapeError: string | null = null;
      try {
        pgColumns = (await pg.query(runnable)).fields.map(f => f.name);
      } catch (e) {
        shapeError = (e as Error).message;
      } finally {
        await pg.exec("ROLLBACK;");
      }
      expect(shapeError, `could not determine output shape: ${shapeError}`).toBeNull();
      expect(
        claimed.map(c => c.name),
        `output shape differs from PostgreSQL\n` +
          `  engine (${claimed.length}): ${claimed.map(c => c.name).join(", ")}\n` +
          `  pg     (${pgColumns.length}): ${pgColumns.join(", ")}`,
      ).toEqual(pgColumns);

      // --- 3. Soundness: no notNull column may produce a NULL. ---
      const violations: string[] = [];
      for (const [stateName, data] of Object.entries(DATA_STATES)) {
        await pg.exec("BEGIN;");
        try {
          if (data.trim()) await pg.exec(data);
          // rowMode 'array' is required, not a preference: column names are
          // not unique (`SELECT a.id, b.id` yields two "id" columns), so the
          // object form silently collapses them and would compare one column
          // against itself. Nullability is positional; read it positionally.
          const res = await pg.query(runnable, [], { rowMode: "array" });
          const rows = res.rows as unknown[][];
          res.fields.forEach((f, i) => {
            const c = claimed[i];
            if (!c?.notNull) return;
            if (rows.some(r => r[i] === null)) {
              violations.push(
                `[${stateName}] column ${i} "${f.name}": engine claims notNull, PostgreSQL returned NULL`,
              );
            }
          });
        } catch {
          // Raised instead of returning rows — no observation to make.
        } finally {
          await pg.exec("ROLLBACK;");
        }
      }

      expect(violations, `\n${violations.join("\n")}\n`).toEqual([]);
    });
  }
});
