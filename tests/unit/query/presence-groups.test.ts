// Presence-group edges the line-based fixture annotations cannot express:
// star expansion has no one-line-one-column annotation slot, a group over
// UPDATE … FROM rides RETURNING, and the two floors plus the
// expression-exclusion rule are claims about groups NOT emitted — which a
// fixture can only pin implicitly. The fixture suite remains the
// execution-oracle authority for every positive claim.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferPresenceGroups } from "../../../src/query/nullability-walk.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";

const SCHEMA_SQL = readFileSync(join(__dirname, "fixtures", "schema.sql"), "utf8");

describe("presence groups (pure-function edges)", () => {
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

  async function groups(sql: string) {
    const parsed = await parseSql(sql);
    return inferPresenceGroups(parsed.stmts![0]!.stmt!, catalog);
  }

  it("a transforming expression at the group scope is not a member", async () => {
    // COALESCE could manufacture non-NULL from an extended row; bareness is
    // what makes "absent" mean "NULL".
    expect(
      await groups(`SELECT o.id AS oid, s.id AS sid, s.carrier, coalesce(s.tracking_no, 'n/a')
        FROM orders o LEFT JOIN shipments s ON s.order_id = o.id`),
    ).toEqual([{ columns: [1, 2], discriminants: [1, 2] }]);
  });

  it("floors: one member, or no discriminant, emits nothing", async () => {
    expect(
      await groups(`SELECT o.id AS oid, s.carrier
        FROM orders o LEFT JOIN shipments s ON s.order_id = o.id`),
    ).toEqual([]);
    expect(
      await groups(`SELECT o.id AS oid, s.tracking_no, s.shipped_at
        FROM orders o LEFT JOIN shipments s ON s.order_id = o.id`),
    ).toEqual([]);
  });

  it("star expansion joins the group", async () => {
    expect(
      await groups(`SELECT o.id AS oid, s.*
        FROM orders o LEFT JOIN shipments s ON s.order_id = o.id`),
    ).toEqual([
      // shipments: id, order_id, carrier, tracking_no, shipped_at, delivered_at
      { columns: [1, 2, 3, 4, 5, 6], discriminants: [1, 2, 3] },
    ]);
  });

  it("UPDATE … FROM an outer join groups its RETURNING columns", async () => {
    expect(
      await groups(`UPDATE orders SET status = 'shipped'
        FROM shipments s LEFT JOIN customers c ON c.id = s.order_id
        WHERE s.order_id = orders.id
        RETURNING orders.id, c.id AS cid, c.email`),
    ).toEqual([{ columns: [1, 2], discriminants: [1, 2] }]);
  });
});
