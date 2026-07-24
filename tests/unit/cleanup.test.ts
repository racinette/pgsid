import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { cleanupPg } from "../helpers/cleanup.js";

describe("cleanupPg", () => {
  let pg: PGlite;

  beforeAll(async () => {
    pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
  });
  afterAll(async () => { if (!pg.closed) await pg.close(); });

  it("starts with a clean state", async () => {
    await cleanupPg(pg);
    const tables = await pg.query<{ tablename: string }>(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public';
    `);
    expect(tables.rows).toEqual([]);
  });

  it("after creating objects + cleanup → all gone", async () => {
    // Create a bunch of stuff.
    await pg.exec("SET check_function_bodies TO off;");
    await pg.exec("CREATE TABLE public.t1 (id int);");
    await pg.exec("CREATE FUNCTION public.f1() RETURNS void LANGUAGE plpgsql AS $$ BEGIN PERFORM 1; END; $$;");
    await pg.exec("CREATE SCHEMA s1;");
    await pg.exec("CREATE TABLE s1.t2 (id int);");
    await pg.exec("CREATE FUNCTION s1.f2() RETURNS void LANGUAGE plpgsql AS $$ BEGIN PERFORM 1; END; $$;");
    await pg.exec("CREATE TYPE public.mood AS ENUM ('sad', 'ok');");
    await pg.exec("CREATE DOMAIN public.posint AS int CHECK (value > 0);");
    await pg.exec("SET search_path TO s1, public;");

    // Verify stuff exists.
    const beforeTables = await pg.query<{ tablename: string }>(`
      SELECT tablename FROM pg_tables WHERE schemaname IN ('public', 's1') ORDER BY tablename;
    `);
    expect(beforeTables.rows.map(r => r.tablename)).toEqual(["t1", "t2"]);

    // Clean up.
    await cleanupPg(pg);

    // Verify everything is gone.
    const afterTables = await pg.query<{ tablename: string }>(`
      SELECT tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') ORDER BY tablename;
    `);
    expect(afterTables.rows).toEqual([]);

    // No user schemas.
    const schemas = await pg.query<{ nspname: string }>(`
      SELECT nspname FROM pg_namespace
      WHERE nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        AND nspname NOT LIKE 'pg_temp_%'
        AND nspname NOT LIKE 'pg_toast_temp_%'
      ORDER BY nspname;
    `);
    expect(schemas.rows.map(r => r.nspname)).toEqual(["public"]);

    // No user functions.
    const fns = await pg.query<{ proname: string }>(`
      SELECT p.proname FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
      ORDER BY p.proname;
    `);
    expect(fns.rows).toEqual([]);

    // No user types.
    const types = await pg.query<{ typname: string }>(`
      SELECT t.typname FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND t.typtype IN ('e', 'd')  -- enums and domains
      ORDER BY t.typname;
    `);
    expect(types.rows).toEqual([]);
  });

  it("plpgsql_check extension still loaded after cleanup", async () => {
    await cleanupPg(pg);

    // The extension function should exist (there are 2 overloads).
    const extFns = await pg.query<{ proname: string }>(`
      SELECT p.proname FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'plpgsql_check_function_tb';
    `);
    expect(extFns.rows.length).toBeGreaterThanOrEqual(1);
  });

  it("search_path reset after cleanup", async () => {
    // Set a non-default search_path.
    await pg.exec("SET search_path TO s1, s2, public;");
    await pg.exec("CREATE SCHEMA s1;");

    // Verify it's set.
    const before = await pg.query("SHOW search_path;");
    expect(String(before.rows[0]!["search_path"])).toContain("s1");

    // Clean up.
    await cleanupPg(pg);

    // Verify it's reset.
    const after = await pg.query("SHOW search_path;");
    expect(String(after.rows[0]!["search_path"])).not.toContain("s1");
  });

  it("check_function_bodies reset after cleanup", async () => {
    // Set a non-default value.
    await pg.exec("SET check_function_bodies TO on;");

    // Verify it's set.
    const before = await pg.query("SHOW check_function_bodies;");
    expect(String(before.rows[0]!["check_function_bodies"])).toBe("on");

    // Clean up.
    await cleanupPg(pg);

    // Verify it's reset (default is on).
    const after = await pg.query("SHOW check_function_bodies;");
    expect(String(after.rows[0]!["check_function_bodies"])).toBe("on");
  });

  it("cleanup is idempotent (running twice doesn't error)", async () => {
    await cleanupPg(pg);
    await cleanupPg(pg); // second time — no objects to drop, should not error.

    const tables = await pg.query<{ tablename: string }>(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public';
    `);
    expect(tables.rows).toEqual([]);
  });

  it("can create objects after cleanup", async () => {
    await cleanupPg(pg);

    // Create something and verify it works.
    await pg.exec("CREATE TABLE public.post_cleanup (id int);");
    const tables = await pg.query<{ tablename: string }>(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public';
    `);
    expect(tables.rows.map(r => r.tablename)).toContain("post_cleanup");

    // Clean up for the next test.
    await cleanupPg(pg);
  });
});
