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
//   temp relation was recorded by the snapshot, was NOT accompanied by that
//   relation, and — measured — is dropped by the CASCADE that removes the
//   temp namespace at session end. The snapshot described an object the
//   real database would not have, silently.
//
// FIXED 2026-08-25: `validate` now runs `DISCARD TEMP` before it inspects
// anything, so the catalog is captured from the state every OTHER session
// sees. Both defects close at once and from opposite directions — §3's
// dangling function stops being captured at all (consistency by
// construction, no closure check needed), and §1's silent pass becomes the
// error it should always have been. The disappearance is reported, since a
// migration that says CREATE FUNCTION and ends with none must say so.
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
//
// Section 6 is the substrate both axes rest on and was measured last, after
// the sections above had already been written from a weaker reading of it:
// PostgreSQL records a temp dependency when the reference lands in the TYPE
// SYSTEM (return type, argument type, a parsed BEGIN ATOMIC body) and NOT
// when it sits inside an opaque string body. The tracked ones cascade away
// with the temp schema and are self-correcting; the untracked ones SURVIVE
// into the shipped database and fail on every call. Read 6 before 1.
// ---------------------------------------------------------------------------

interface Applied {
  applyOk: boolean;
  diags: string[];
  functions: string[];
  tables: string[];
  /** Temp relations left by the migration, BEFORE validate's session-end discard. */
  tempRelsAfterApply: string[];
  /** …and after it. The pair is what makes the discard visible in the matrix. */
  tempRels: string[];
}

async function apply(sql: string): Promise<Applied> {
  const pg = await PGlite.create({ extensions: { plpgsql_check } });
  try {
    await pg.exec("CREATE EXTENSION plpgsql_check;");
    const builder = new SchemaBuilder();
    await builder.snapshotBeforeMigrations(pg);
    const result = await builder.applyMigration(pg, Buffer.from(sql, "utf8"), 0);
    const tempRelsOf = async (): Promise<string[]> =>
      (
        await pg.query<{ relname: string }>(
          `SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname LIKE 'pg_temp%' AND c.relkind = 'r' ORDER BY 1`,
        )
      ).rows.map(r => r.relname);
    // Read the temp relations the migration left BEFORE validate runs —
    // validate discards them, which is the whole point, and the observation
    // would otherwise be destroyed by the thing it is describing.
    const tempRelsAfterApply = await tempRelsOf();
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
    return {
      applyOk: result.success,
      diags,
      functions,
      tables,
      tempRelsAfterApply,
      tempRels: await tempRelsOf(),
    };
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
  it("left in place, a function reads it: reported (was a FALSE NEGATIVE)", async () => {
    // THE CASE THE FIX EXISTS FOR. It read `diags: []` until 2026-08-25:
    // plpgsql_check reads the LIVE catalog, `staging` was sitting in it, so
    // the check passed. But §6 shows the reference lives in an opaque body,
    // so nothing records it — `reads_staging` SURVIVES session end and
    // fails on every call the application makes. The visibility that made
    // the check pass was exactly what made the silence wrong.
    //
    // `validate` now discards temporary objects first, so the check runs
    // against the catalog every OTHER session sees, and the relation is
    // correctly missing.
    const r = await apply(`
      CREATE TEMP TABLE staging (id int NOT NULL, val text);
      CREATE FUNCTION public.reads_staging() RETURNS bigint LANGUAGE plpgsql AS $$
      BEGIN RETURN (SELECT count(*) FROM staging WHERE val IS NOT NULL); END $$;
    `);
    expect(r.applyOk).toBe(true);
    expect(r.diags).toEqual(['error: relation "staging" does not exist']);
    // The migration really did leave it behind; the discard is what removes it.
    expect(r.tempRelsAfterApply).toEqual(["staging"]);
    expect(r.tempRels).toEqual([]);
  });

  it("created DYNAMICALLY, the relation still exists afterwards", async () => {
    // The reason snapshot-level awareness WOULD reach dynamic SQL on this
    // side, if we ever wanted it: a migration RUNS, so the table is state
    // by the time anything looks. Text never enters into it.
    const r = await apply(`DO $$ BEGIN EXECUTE 'CREATE TEMP TABLE t_dyn (i int)'; END $$;`);
    expect(r.applyOk).toBe(true);
    expect(r.diags).toEqual([]);
    expect(r.tempRelsAfterApply).toEqual(["t_dyn"]);
    // …and is gone once validate simulates session end, dynamic or not.
    expect(r.tempRels).toEqual([]);
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
  it("the dangling capture is gone — consistency by construction", async () => {
    // Until 2026-08-25 this read `functions: ["public.get_users_t -> SETOF
    // users_t"]` against `tables: []` — a snapshot promising a function
    // that cannot exist, since session end drops the temp namespace CASCADE
    // and takes it along (§6). The discard now happens BEFORE the snapshot,
    // so the function is simply not there.
    //
    // Worth stating plainly: this needed no closure check, no pg_depend
    // walk, no diagnosis. Simulating session end makes the catalog agree
    // with reality structurally, which is the stronger kind of fix.
    const r = await apply(`
      CREATE TEMP TABLE users_t (userid text, seq int);
      CREATE FUNCTION public.get_users_t() RETURNS SETOF users_t LANGUAGE sql
        AS $$ SELECT * FROM users_t $$;
    `);
    expect(r.functions).toEqual([]);
    expect(r.tables).toEqual([]);
  });

  it("and the disappearance is REPORTED, not silent", async () => {
    // The other half. A migration that says CREATE FUNCTION and ends with
    // no function has to say so — otherwise the fix above trades a wrong
    // snapshot for a mysterious one. The diagnostic carries the statement's
    // range, so it lands on the CREATE that will not stick.
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
    //
    // The session-end discard does not help here and is not meant to — it
    // makes the loss more thorough, not more visible. `accounts` was a
    // temp table all along; nothing depends on it, so no cascade
    // diagnostic fires. Still the clearest candidate for a warning of its
    // own: a migration whose DDL contributed NOTHING to the snapshot.
    const r = await apply(`
      SET search_path TO pg_temp;
      CREATE TABLE accounts (id int NOT NULL, email text NOT NULL);
    `);
    expect(r.applyOk).toBe(true);
    expect(r.diags).toEqual([]);
    expect(r.tables).toEqual([]);
    expect(r.tempRelsAfterApply).toEqual(["accounts"]);
    expect(r.tempRels).toEqual([]);
  });
});

// ===========================================================================
// 6. PostgreSQL's OWN dependency tracking — the substrate every section above
//    sits on, and the reason §1 and §3 behave so differently.
//
//    No pgsid in these: they are observations about the database, pinned
//    here so the sections that reason from them cannot drift away from what
//    the database actually does.
// ===========================================================================

/** Every function referencing a temp table, four ways, plus what survives. */
async function dependencyMatrix(): Promise<{
  tracked: string[];
  dropRefused: boolean;
  survivors: string[];
  callSurvivor: string;
}> {
  const pg = new PGlite();
  try {
    await pg.exec(`
      CREATE SCHEMA app; CREATE SCHEMA other;
      CREATE TEMP TABLE tt (i int);
      -- return type
      CREATE FUNCTION app.by_sig() RETURNS SETOF tt LANGUAGE sql AS $$ SELECT * FROM tt $$;
      -- ARGUMENT type — same tracking, and in a third schema again
      CREATE FUNCTION other.by_arg(x tt) RETURNS int LANGUAGE sql AS $$ SELECT 1 $$;
      -- opaque string body
      CREATE FUNCTION app.by_body() RETURNS int LANGUAGE sql AS $$ SELECT i FROM tt LIMIT 1 $$;
      -- parsed body (PG14+ standard form)
      CREATE FUNCTION app.by_atomic() RETURNS int LANGUAGE sql
        BEGIN ATOMIC SELECT i FROM tt LIMIT 1; END;
      -- plpgsql, also opaque
      CREATE FUNCTION app.by_plpgsql() RETURNS int LANGUAGE plpgsql AS $$
        BEGIN RETURN (SELECT i FROM tt LIMIT 1); END $$;
    `);
    const tracked = (
      await pg.query<{ f: string }>(`
        SELECT DISTINCT p.proname AS f
        FROM pg_depend d JOIN pg_proc p ON p.oid = d.objid
        WHERE d.refobjid = 'tt'::regclass
           OR d.refobjid IN (SELECT oid FROM pg_type WHERE typrelid = 'tt'::regclass)
        ORDER BY 1`)
    ).rows.map(r => r.f);

    let dropRefused = false;
    try {
      await pg.exec("DROP TABLE tt");
    } catch {
      dropRefused = true;
    }

    // What session end does, minus ending the session.
    await pg.exec("DISCARD TEMP");

    const survivors = (
      await pg.query<{ f: string }>(`
        SELECT n.nspname || '.' || p.proname AS f
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname IN ('app', 'other') ORDER BY 1`)
    ).rows.map(r => r.f);

    let callSurvivor = "";
    try {
      await pg.query("SELECT app.by_body()");
      callSurvivor = "succeeded";
    } catch (e) {
      callSurvivor = (e as Error).message;
    }
    return { tracked, dropRefused, survivors, callSurvivor };
  } finally {
    if (!pg.closed) await pg.close();
  }
}

describe("6. PostgreSQL tracks a temp dependency by TYPE, never through a string body", () => {
  it("signature and parsed-body references are tracked; opaque bodies are not", async () => {
    // The whole asymmetry in one assertion. A reference that lands in the
    // TYPE SYSTEM — return type, argument type, or a BEGIN ATOMIC body the
    // server parsed — becomes a pg_depend row. A reference inside an
    // opaque string never does, in `sql` or `plpgsql` alike.
    const m = await dependencyMatrix();
    expect(m.tracked).toEqual(["by_arg", "by_atomic", "by_sig"]);
  });

  it("a plain DROP refuses, but the schema-level cascade takes them silently", async () => {
    // Worth stating together: the loud path and the quiet path disagree,
    // and only the quiet one runs at session end.
    const m = await dependencyMatrix();
    expect(m.dropRefused).toBe(true);
  });

  it("the cascade crosses schemas — pg_depend decides, not where the function lives", async () => {
    // by_sig is in `app`, by_arg in `other`, and both go. The surviving
    // one is not surviving because of its schema; it survives because
    // nothing recorded that it depended on anything.
    const m = await dependencyMatrix();
    expect(m.survivors).toEqual(["app.by_body", "app.by_plpgsql"]);
  });

  it("and the survivors are the broken ones", async () => {
    // The direction that matters: tracked references are self-correcting
    // (they leave together), untracked ones outlive the table and fail on
    // every call thereafter. This is what makes §1's silence a false
    // negative rather than a harmless gap.
    const m = await dependencyMatrix();
    expect(m.callSurvivor).toContain('relation "tt" does not exist');
  });
});

describe("6b. DISCARD TEMP is the session-end simulation validate() can afford", () => {
  it("clears temp relations while PRESERVING search_path, which DISCARD ALL does not", async () => {
    // The gate on the proposed placement. `validate()` deliberately does
    // not override search_path — a migration's non-LOCAL `SET search_path`
    // has to survive into body validation — so the stronger DISCARD is
    // unusable however well it cleans.
    const pg = new PGlite();
    try {
      await pg.exec(`CREATE SCHEMA app; SET search_path TO app, public;
                     CREATE TEMP TABLE staging (i int);`);
      await pg.exec("DISCARD TEMP");
      const kept = (await pg.query<{ search_path: string }>("SHOW search_path")).rows[0]!;
      const left = (
        await pg.query<{ n: number }>(
          `SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname LIKE 'pg_temp%' AND c.relkind = 'r'`)
      ).rows[0]!;
      expect(kept.search_path).toBe("app, public");
      expect(left.n).toBe(0);

      await pg.exec("DISCARD ALL");
      const reset = (await pg.query<{ search_path: string }>("SHOW search_path")).rows[0]!;
      expect(reset.search_path).not.toBe("app, public");
    } finally {
      if (!pg.closed) await pg.close();
    }
  });
});

// ===========================================================================
// 7. WHY the escape hatch is a pre-created relation and not a pragma.
//
//    plpgsql_check documents four ways to let a function that builds its own
//    temp table pass its checks (§4's open case). Choosing between them took
//    a discussion, and every step of it was a measurement; without these the
//    decision reads as taste. It is not — three of the four are unavailable
//    to us, and the fourth costs something specific.
//
//    The decisive one is 7.1. The pragma is not a call pgsid makes; it is a
//    PERFORM inside the FUNCTION BODY, and that body is the user's migration
//    text, which also runs against a production database that does not have
//    plpgsql_check installed. Advising it would ship a broken function.
// ===========================================================================

/** A database WITHOUT plpgsql_check — i.e. the user's production. */
async function withoutExtension<T>(fn: (pg: PGlite) => Promise<T>): Promise<T> {
  const pg = new PGlite();
  try {
    return await fn(pg);
  } finally {
    if (!pg.closed) await pg.close();
  }
}

/** A database WITH it — i.e. pgsid's own instance. */
async function withExtension<T>(fn: (pg: PGlite) => Promise<T>): Promise<T> {
  const pg = await PGlite.create({ extensions: { plpgsql_check } });
  try {
    await pg.exec("CREATE EXTENSION plpgsql_check;");
    return await fn(pg);
  } finally {
    if (!pg.closed) await pg.close();
  }
}

async function checkOf(pg: PGlite, signature: string): Promise<string[]> {
  const rows = (
    await pg.query<{ level: string; message: string }>(
      `SELECT level, message FROM public.plpgsql_check_function_tb('${signature}')`,
    )
  ).rows;
  return rows.map(r => `${r.level}: ${r.message}`);
}

describe("7. the pragma is unavailable to us, and why", () => {
  it("7.1 a pragma in a migration body POISONS production", async () => {
    // The measurement that ended the discussion. CREATE succeeds — so
    // nothing warns while the migration runs — and the function then fails
    // at CALL time on every deployment without the extension. A tool that
    // emits "add plpgsql_check_pragma(...)" as a hint is shipping a bug to
    // fix a false positive.
    const outcome = await withoutExtension(async pg => {
      await pg.exec(`CREATE FUNCTION stager() RETURNS bigint LANGUAGE plpgsql AS $$
        BEGIN
          PERFORM plpgsql_check_pragma('table: tmp_stage(i int)');
          CREATE TEMP TABLE tmp_stage (i int) ON COMMIT DROP;
          RETURN (SELECT count(*) FROM tmp_stage);
        END $$;`);
      try {
        await pg.query("SELECT stager()");
        return "call succeeded";
      } catch (e) {
        return (e as Error).message;
      }
    });
    expect(outcome).toContain("function plpgsql_check_pragma(unknown) does not exist");
  });

  it("7.2 the pragma cannot be supplied from OUTSIDE the body", async () => {
    // The reading that would have rescued it: let pgsid declare the shape
    // in its own session, leaving the user's SQL clean. It does not work.
    // The session-level call is accepted and does nothing, in or out of a
    // transaction, and `plpgsql_check_function_tb` has no parameter for
    // declaring a relation (`oldtable`/`newtable` are trigger transition
    // tables). The pragma is body-scoped by construction.
    const [beforePragma, afterPragma, hasTableParam] = await withExtension(async pg => {
      await pg.exec(`CREATE FUNCTION stager() RETURNS bigint LANGUAGE plpgsql AS $$
        BEGIN
          CREATE TEMP TABLE tmp_stage (i int) ON COMMIT DROP;
          RETURN (SELECT count(*) FROM tmp_stage WHERE i > 0);
        END $$;`);
      const before = await checkOf(pg, "public.stager()");
      await pg.query(`SELECT public.plpgsql_check_pragma('table: tmp_stage(i int)')`);
      const after = await checkOf(pg, "public.stager()");
      const args = (
        await pg.query<{ args: string }>(
          `SELECT pg_get_function_arguments(oid) AS args FROM pg_proc
           WHERE proname = 'plpgsql_check_function_tb'`)
      ).rows[0]!.args;
      return [before, after, /\btable\b/.test(args)] as const;
    });
    expect(beforePragma).toEqual(['error: relation "tmp_stage" does not exist']);
    expect(afterPragma).toEqual(beforePragma); // the outside call changed nothing
    expect(hasTableParam).toBe(false);
  });

  it("7.3 the fourth documented escape does not exist in this runtime", async () => {
    // `SET plpgsql.enable_check TO false` is the per-function opt-out the
    // extension's docs name. PGlite's build does not register the GUC, so
    // the function cannot even be created. Recorded so the option is not
    // re-proposed from the documentation alone.
    const outcome = await withExtension(async pg => {
      try {
        await pg.exec(`CREATE FUNCTION opted_out() RETURNS bigint LANGUAGE plpgsql
          SET plpgsql.enable_check TO false AS $$
          BEGIN CREATE TEMP TABLE tmp_z (i int); RETURN (SELECT count(*) FROM tmp_z); END $$;`);
        return "created";
      } catch (e) {
        return (e as Error).message;
      }
    });
    expect(outcome).toContain('invalid configuration parameter name "plpgsql.enable_check"');
  });
});

describe("7b. a pre-created relation is the escape we CAN use", () => {
  it("it DECLARES rather than silences — a real typo is still caught", async () => {
    // The property that rules out `-- pgsid-ignore` and any other
    // suppression: the body stays fully checked. Creating the relation
    // tells the checker its shape, exactly as the pragma would, so a wrong
    // column name in the same function is still an error.
    const [typo, clean] = await withExtension(async pg => {
      await pg.exec(`
        CREATE FUNCTION has_typo() RETURNS bigint LANGUAGE plpgsql AS $$
          BEGIN
            CREATE TEMP TABLE tmp_stage (i int) ON COMMIT DROP;
            RETURN (SELECT count(*) FROM tmp_stage WHERE nope > 0);
          END $$;
        CREATE FUNCTION is_clean() RETURNS bigint LANGUAGE plpgsql AS $$
          BEGIN
            CREATE TEMP TABLE tmp_stage (i int) ON COMMIT DROP;
            RETURN (SELECT count(*) FROM tmp_stage WHERE i > 0);
          END $$;
        CREATE TEMP TABLE tmp_stage (i int);`);
      return [await checkOf(pg, "public.has_typo()"), await checkOf(pg, "public.is_clean()")] as const;
    });
    expect(typo).toEqual(['error: column "nope" does not exist']);
    expect(clean).toEqual([]);
  });

  it("DISCARD TEMP wipes it — so the declaration must come AFTER the discard", async () => {
    // The ordering constraint the session-end fix imposes on this one.
    // `validate` discards temporary objects before it checks anything, so a
    // declaration made earlier is gone by the time it would be read. It
    // belongs inside validate's transaction, after the discard.
    const [before, after] = await withExtension(async pg => {
      await pg.exec(`CREATE FUNCTION stager() RETURNS bigint LANGUAGE plpgsql AS $$
        BEGIN
          CREATE TEMP TABLE tmp_stage (i int) ON COMMIT DROP;
          RETURN (SELECT count(*) FROM tmp_stage WHERE i > 0);
        END $$;
        CREATE TEMP TABLE tmp_stage (i int);`);
      const b = await checkOf(pg, "public.stager()");
      await pg.exec("DISCARD TEMP");
      return [b, await checkOf(pg, "public.stager()")] as const;
    });
    expect(before).toEqual([]);
    expect(after).toEqual(['error: relation "tmp_stage" does not exist']);
  });

  it("the cost we accept: a declared relation MASKS an unrelated genuine error", async () => {
    // The one thing the pragma's per-function scope bought that this does
    // not. `mistake()` names tmp_stage by accident — it meant a permanent
    // table nobody created — and the declaration silences it along with the
    // function that deserved silencing.
    //
    // Accepted because it is opt-in per RELATION NAME rather than per
    // diagnostic, which is far narrower than a general ignore mechanism.
    // The escalation, if it ever bites: make a declared relation visible
    // only while checking a function whose body textually contains
    // `CREATE TEMP TABLE <name>` — that would keep `intended()` passing and
    // `mistake()` failing, with a substring match and no parser.
    const [mistakeBefore, intendedAfter, mistakeAfter] = await withExtension(async pg => {
      await pg.exec(`
        CREATE FUNCTION intended() RETURNS bigint LANGUAGE plpgsql AS $$
          BEGIN CREATE TEMP TABLE tmp_stage (i int); RETURN (SELECT count(*) FROM tmp_stage); END $$;
        CREATE FUNCTION mistake() RETURNS bigint LANGUAGE plpgsql AS $$
          BEGIN RETURN (SELECT count(*) FROM tmp_stage); END $$;`);
      const mb = await checkOf(pg, "public.mistake()");
      await pg.exec(`CREATE TEMP TABLE tmp_stage (i int)`);
      return [mb, await checkOf(pg, "public.intended()"), await checkOf(pg, "public.mistake()")] as const;
    });
    expect(mistakeBefore).toEqual(['error: relation "tmp_stage" does not exist']);
    expect(intendedAfter).toEqual([]);
    expect(mistakeAfter).toEqual([]); // masked — the accepted cost
  });
});
