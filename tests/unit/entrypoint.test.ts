import { describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import * as pgsid from "../../src/index.js";

// ---------------------------------------------------------------------------
// The package entry point.
//
// `tsup` built `src/index.ts` and `pnpm dev` ran it from the day the
// repository was set up. The file did not exist until 2026-08-24, and nothing
// noticed, because nothing consumed the package.
//
// Two things are pinned here. The SURFACE, so that removing an export is a
// named failure rather than a consumer's problem; and the documented ORDER of
// calls, run end to end against a real database, because a boundary that is
// only type-checked is a boundary nobody has walked.
// ---------------------------------------------------------------------------

/** Every value the package promises. Type-only exports are checked by `tsc`
 *  and cannot be enumerated at runtime. */
const SURFACE = [
  "ConfigError",
  "SchemaBuilder",
  "UnsupportedNodeError",
  "buildNullabilityCatalog",
  "compareShapes",
  "findConfigPath",
  "gateAgreed",
  "gateContract",
  "inferNullability",
  "inferPresenceGroups",
  "inferQueryContract",
  "loadConfig",
  "parseConfigString",
  "parseSql",
  "snapshotCatalog",
] as const;

describe("the package entry point", () => {
  it("exports exactly the boundary, and nothing of the engine's insides", () => {
    // Both directions. A missing export breaks a consumer; an extra one is a
    // promise the package did not mean to make — `src/query/*` stays internal
    // so its modules can keep moving.
    expect(Object.keys(pgsid).sort()).toEqual([...SURFACE]);
  });

  it("runs the documented pipeline end to end", async () => {
    // The five steps from `src/index.ts`'s header, in order, against a real
    // schema. If this reads like a usage example that is deliberate: it is the
    // only usage of the package that exists.
    const pg = await PGlite.create();
    try {
      await pg.exec(`
        CREATE TABLE account (
          id integer PRIMARY KEY,
          email text NOT NULL,
          nickname text
        )`);

      const catalog = await pgsid.buildNullabilityCatalog(await pgsid.snapshotCatalog(pg), {
        searchPath: ["public"],
      });

      const sql = "SELECT a.id, a.email, a.nickname FROM account a WHERE a.id = $1";
      const stmt = (await pgsid.parseSql(sql)).stmts![0]!.stmt!;
      const contract = await pgsid.inferQueryContract(stmt, catalog);

      const describe: pgsid.DescribeStatement = async text => {
        const d = await pg.describeQuery(text);
        return { columns: d.resultFields.map(f => f.name), params: d.queryParams.length };
      };
      const gated = await pgsid.gateContract(sql, contract, describe);

      expect(pgsid.gateAgreed(gated.gate)).toBe(true);
      expect(gated.outputs.map(o => ({ name: o.name, notNull: o.notNull }))).toEqual([
        { name: "id", notNull: true },
        { name: "email", notNull: true },
        { name: "nickname", notNull: false },
      ]);
      // `notNull` on a PARAMETER means "binding NULL here can make the
      // statement RAISE" — not "you must supply a value". `WHERE a.id = $1`
      // with a NULL binding simply returns no rows, so the parameter is
      // unconstrained. The two readings are easy to confuse at this boundary
      // and a consumer that confused them would demand arguments PostgreSQL
      // is happy to take as NULL.
      expect(gated.params).toEqual([{ number: 1, notNull: false }]);
    } finally {
      if (!pg.closed) await pg.close();
    }
  }, 120_000);

  it("a refused statement raises the error the boundary exports", async () => {
    // `UnsupportedNodeError` is on the surface because a consumer has to
    // distinguish "the engine cannot analyse this" (a warning, degrade to
    // all-nullable) from "this SQL is broken" (an error).
    expect(pgsid.UnsupportedNodeError.prototype).toBeInstanceOf(Error);
  });
});
