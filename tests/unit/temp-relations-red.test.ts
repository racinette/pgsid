import { describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { SchemaBuilder } from "../../src/schema-builder.js";
import { snapshotCatalog } from "../../src/catalog/snapshot.js";

// ---------------------------------------------------------------------------
// RED SUITE: temporary relations across the MIGRATION pipeline.
//
// The question this file answers, case by case: where does the snapshot's
// deliberate temp-blindness actually cost us, and where does it cost nothing?
// Every case was measured before it was written down; each `it.fails` states
// the TARGET contract and passes today because the engine does not meet it.
//
// The organising distinction — the one that took a while to see:
//
//   TEMP + TEMP is CONSISTENT. A temp table and a temp function over its
//   type both vanish at session end and neither is captured. Nothing is
//   claimed, so nothing is wrong. These are guards.
//
//   PERMANENT + TEMP is NOT. A captured function whose return type is a
//   temp relation is recorded by the snapshot, is NOT accompanied by that
//   relation, and — measured — is dropped by the CASCADE that removes the
//   temp namespace at session end. The snapshot describes an object the
//   real database will not have, silently. That is the defect.
//
// The second axis is WHO CREATES the table, and it splits cleanly:
//
//   A MIGRATION STATEMENT creates it by EXECUTING, so the relation exists
//   for anything that looks afterwards — including plpgsql_check, which
//   reads the live catalog. Dynamic SQL is no obstacle: the snapshot
//   observes state, not text.
//
//   A FUNCTION BODY creates it at CALL time, which never happens during a
//   migration. plpgsql_check cannot see it, and reports valid code as an
//   error. This is not the snapshot's doing and does not close by
//   capturing anything; it needs body knowledge pgsid does not have
//   (libpg-query exposes no plpgsql parser).
// ---------------------------------------------------------------------------

interface Applied {
  applyOk: boolean;
  diags: string[];
  functions: string[];
  tables: string[];
  tempRels: string[];
}

async function apply(sql: string): Promise<Applied> {
  const pg = await PGlite.create({ extensions: { plpgsql_check } });
  try {
    await pg.exec("CREATE EXTENSION plpgsql_check;");
    const builder = new SchemaBuilder();
    await builder.snapshotBeforeMigrations(pg);
    const result = await builder.applyMigration(pg, Buffer.from(sql, "utf8"), 0);
    const diags = result.success
      ? (await builder.validate(pg)).map(d => `${d.severity}: ${d.message}`)
      : result.diagnostics.map(d => `${d.severity}: ${d.message}`);
    const snap = (await snapshotCatalog(pg)) as unknown as {
      functions?: { schema: string; name: string; returnType?: string }[];
      tables?: { schema: string; name: string }[];
    };
    // plpgsql_check ships its own functions into public; only ours matter.
    const functions = (snap.functions ?? [])
      .filter(f => !f.name.startsWith("plpgsql_") && !f.name.startsWith("__plpgsql_"))
      .map(f => `${f.schema}.${f.name} -> ${f.returnType ?? "?"}`);
    const tables = (snap.tables ?? []).map(t => `${t.schema}.${t.name}`);
    const tempRels = (
      await pg.query<{ relname: string }>(
        `SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname LIKE 'pg_temp%' AND c.relkind = 'r' ORDER BY 1`,
      )
    ).rows.map(r => r.relname);
    return { applyOk: result.success, diags, functions, tables, tempRels };
  } finally {
    if (!pg.closed) await pg.close();
  }
}

// ===========================================================================
// 1. Migration statements — measured to cost NOTHING. Guards, so that
//    "temp-unawareness is free on the migration side" cannot quietly stop
//    being true.
// ===========================================================================

describe("1. a migration statement creates the temp table", () => {
  it("left in place, a function reads it: clean", async () => {
    // plpgsql_check reads the LIVE catalog, and the relation is sitting in
    // it. The snapshot never needs to know.
    const r = await apply(`
      CREATE TEMP TABLE staging (id int NOT NULL, val text);
      CREATE FUNCTION public.reads_staging() RETURNS bigint LANGUAGE plpgsql AS $$
      BEGIN RETURN (SELECT count(*) FROM staging WHERE val IS NOT NULL); END $$;
    `);
    expect(r.applyOk).toBe(true);
    expect(r.diags).toEqual([]);
    expect(r.tempRels).toEqual(["staging"]);
  });

  it("created DYNAMICALLY, the relation still exists afterwards", async () => {
    // The reason snapshot-level awareness WOULD reach dynamic SQL on this
    // side, if we ever wanted it: a migration RUNS, so the table is state
    // by the time anything looks. Text never enters into it.
    const r = await apply(`DO $$ BEGIN EXECUTE 'CREATE TEMP TABLE t_dyn (i int)'; END $$;`);
    expect(r.applyOk).toBe(true);
    expect(r.diags).toEqual([]);
    expect(r.tempRels).toEqual(["t_dyn"]);
  });

  it("pure scratch — created, used, dropped — is silent", async () => {
    // The shape sqlc's own ddl_pg_temp case has, and the commonest real
    // one. Nothing depends on the table afterwards, so nothing notices.
    const r = await apply(`
      CREATE TABLE old_rows (val int);
      CREATE TABLE new_rows (val int);
      CREATE TEMP TABLE migrate_scratch (val int);
      INSERT INTO migrate_scratch (val) SELECT val FROM old_rows;
      INSERT INTO new_rows (val) SELECT val FROM migrate_scratch;
      DROP TABLE migrate_scratch;
    `);
    expect(r.applyOk).toBe(true);
    expect(r.diags).toEqual([]);
    expect(r.tables).toEqual(["public.new_rows", "public.old_rows"]);
  });

  it("dropped while a function still reads it: errors, and CORRECTLY", async () => {
    // A true positive, pinned so nobody "fixes" it. After this migration
    // commits, calling reads_staging2() really does fail — the relation is
    // gone and it is not coming back.
    const r = await apply(`
      CREATE TEMP TABLE staging (id int NOT NULL, val text);
      CREATE FUNCTION public.reads_staging2() RETURNS bigint LANGUAGE plpgsql AS $$
      BEGIN RETURN (SELECT count(*) FROM staging WHERE val IS NOT NULL); END $$;
      DROP TABLE staging;
    `);
    expect(r.diags).toEqual(['error: relation "staging" does not exist']);
  });
});

// ===========================================================================
// 2. TEMP + TEMP — consistent, and the guard that shows why the defect in
//    section 3 is about PERMANENCE, not about temp tables.
// ===========================================================================

describe("2. a temp function over a temp table's type", () => {
  it("neither is captured, and nothing is claimed", async () => {
    // Both vanish together at session end. The snapshot holds neither, so
    // it makes no promise it cannot keep. This is the CONSISTENT case, and
    // the reason section 3's fix must not be phrased as "warn about temp".
    const r = await apply(`
      CREATE TEMP TABLE users_t (userid text, seq int);
      CREATE FUNCTION pg_temp.get_users_t() RETURNS SETOF users_t LANGUAGE sql
        AS $$ SELECT * FROM users_t $$;
    `);
    expect(r.applyOk).toBe(true);
    expect(r.functions).toEqual([]);
    expect(r.tables).toEqual([]);
    expect(r.diags).toEqual([]);
  });
});

// ===========================================================================
// 3. PERMANENT + TEMP — the defect. The snapshot records an object the real
//    database will not have, and says nothing.
// ===========================================================================

describe("3. a permanent function over a temp table's type", () => {
  it("today: captured, dangling, silent", async () => {
    // Not a target — a description, so the flip in the next case is legible.
    // The function IS in the snapshot; the relation its type names is NOT.
    const r = await apply(`
      CREATE TEMP TABLE users_t (userid text, seq int);
      CREATE FUNCTION public.get_users_t() RETURNS SETOF users_t LANGUAGE sql
        AS $$ SELECT * FROM users_t $$;
    `);
    expect(r.functions).toEqual(["public.get_users_t -> SETOF users_t"]);
    expect(r.tables).toEqual([]);
  });

  it.fails("TARGET: the capture-closure violation is reported", async () => {
    // The contract: a captured object whose dependency is NOT captured gets
    // a warning naming both. Measured beside this file: session end drops
    // the temp namespace CASCADE and takes get_users_t with it, so the
    // snapshot is describing a function the database will not have.
    const r = await apply(`
      CREATE TEMP TABLE users_t (userid text, seq int);
      CREATE FUNCTION public.get_users_t() RETURNS SETOF users_t LANGUAGE sql
        AS $$ SELECT * FROM users_t $$;
    `);
    expect(r.diags.some(d => /warning/.test(d) && /get_users_t/.test(d) && /tempor/i.test(d)))
      .toBe(true);
  });

  it("guard: a permanent function over a PERMANENT type says nothing", async () => {
    // The gate on the rule above. If the closure check fires here it is
    // firing on everything, and a warning on every function is no warning.
    const r = await apply(`
      CREATE TABLE users_p (userid text, seq int);
      CREATE FUNCTION public.get_users_p() RETURNS SETOF users_p LANGUAGE sql
        AS $$ SELECT * FROM users_p $$;
    `);
    expect(r.diags).toEqual([]);
    expect(r.tables).toEqual(["public.users_p"]);
  });
});

// ===========================================================================
// 4. A FUNCTION BODY creates the table — a different axis entirely. Not the
//    snapshot's doing, and not closed by capturing anything: the table is
//    created at CALL time, and a migration never calls the function.
// ===========================================================================

describe("4. the function creates its own temp table", () => {
  it.fails("TARGET: the column-list form is valid code and must not error", async () => {
    // Measured: stager() returns 1. plpgsql_check reports
    // `relation "tmp_stage" does not exist` at severity ERROR.
    const r = await apply(`
      CREATE FUNCTION public.stager() RETURNS bigint LANGUAGE plpgsql AS $$
      BEGIN
        CREATE TEMP TABLE tmp_stage (i int) ON COMMIT DROP;
        INSERT INTO tmp_stage VALUES (1);
        RETURN (SELECT count(*) FROM tmp_stage);
      END $$;
    `);
    expect(r.diags).toEqual([]);
  });

  it.fails("TARGET: the CTAS form too", async () => {
    // Worth its own case: `CREATE TEMP TABLE x AS SELECT …` has no column
    // list, so plpgsql_check's own `pragma table:` escape cannot be written
    // without the user hand-transcribing the types.
    const r = await apply(`
      CREATE TABLE src (id int NOT NULL, val text);
      CREATE FUNCTION public.ctas() RETURNS bigint LANGUAGE plpgsql AS $$
      BEGIN
        CREATE TEMP TABLE t_ctas AS SELECT id, val FROM src;
        RETURN (SELECT count(*) FROM t_ctas WHERE val IS NOT NULL);
      END $$;
    `);
    expect(r.diags).toEqual([]);
  });

  it("BOUNDARY: the dynamic form stays unresolvable, recorded as it is", async () => {
    // Not a target. The DDL is a string inside a body that has not run, so
    // no catalog knows about it and no snapshot scope can. Pinned so that
    // if it ever changes, it changes loudly.
    const r = await apply(`
      CREATE FUNCTION public.dyn() RETURNS bigint LANGUAGE plpgsql AS $$
      BEGIN
        EXECUTE 'CREATE TEMP TABLE t_dyn (i int)';
        RETURN (SELECT count(*) FROM t_dyn);
      END $$;
    `);
    expect(r.diags).toEqual(['error: relation "t_dyn" does not exist']);
  });
});

// ===========================================================================
// 5. Silences worth knowing about. Neither is a target yet; both are pinned
//    so the silence is a recorded decision rather than an unexamined one.
// ===========================================================================

describe("5. recorded silences", () => {
  it("a function created in pg_temp is skipped without a provenance warning", async () => {
    // Its body is broken, and validate() says nothing: the pg_temp filter
    // in snapshotPgProc removes it before provenance is ever consulted.
    // Benign — the function cannot survive the session either — but silent.
    const r = await apply(`
      CREATE FUNCTION pg_temp.only_here() RETURNS int LANGUAGE plpgsql AS $$
      BEGIN RETURN nonexistent_col; END $$;
    `);
    expect(r.applyOk).toBe(true);
    expect(r.diags).toEqual([]);
    expect(r.functions).toEqual([]);
  });

  it("a migration that leaves search_path at pg_temp loses its DDL silently", async () => {
    // The product-side twin of the pg-regress harness bug: the table is
    // created, apply reports success, validate reports nothing, and the
    // snapshot is empty. Contrived on its own; the realistic harm is a
    // LATER migration inheriting a non-LOCAL search_path.
    const r = await apply(`
      SET search_path TO pg_temp;
      CREATE TABLE accounts (id int NOT NULL, email text NOT NULL);
    `);
    expect(r.applyOk).toBe(true);
    expect(r.diags).toEqual([]);
    expect(r.tables).toEqual([]);
    expect(r.tempRels).toEqual(["accounts"]);
  });
});
