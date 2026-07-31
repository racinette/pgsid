import { describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { comparableStates, diffCatalogs } from "../../../src/catalog/diff.js";
import type { CatalogSnapshot } from "../../../src/catalog/types.js";

// ---------------------------------------------------------------------------
// A diff has to survive the schema being rebuilt.
//
// Every OID in a snapshot is assigned when the object is created, so replaying
// the same migrations into a fresh database — which is what happens whenever a
// historical migration is edited — produces a schema that is identical in every
// way a query can observe and different in every OID.
//
// A diff that compares OIDs answers "modified" for entities nobody touched.
// That is not a conservative failure: the real change is somewhere in that list
// too, and a diff that flags everything distinguishes nothing.
// ---------------------------------------------------------------------------

const DDL = `
  CREATE SCHEMA app;

  CREATE DOMAIN pct AS numeric NOT NULL CHECK (VALUE >= 0 AND VALUE <= 100);
  CREATE TYPE pair AS (a text, b integer);
  CREATE TYPE mood AS ENUM ('ok', 'bad');
  CREATE SEQUENCE counter;

  CREATE TABLE t (
    id     integer NOT NULL PRIMARY KEY,
    share  pct,
    m      mood,
    note   text DEFAULT 'x',
    made   timestamptz NOT NULL DEFAULT now(),
    nextup integer NOT NULL DEFAULT nextval('counter')
  );
  CREATE INDEX t_note_idx ON t (note);

  CREATE TABLE app.child (
    id   integer NOT NULL PRIMARY KEY,
    t_id integer NOT NULL REFERENCES t(id),
    p    pair
  );

  CREATE VIEW v AS SELECT id, note FROM t;
  CREATE MATERIALIZED VIEW mv AS SELECT id, share FROM t;

  CREATE FUNCTION f(a integer) RETURNS pct LANGUAGE sql AS $$ SELECT 1::pct $$;
  CREATE FUNCTION g(p pair) RETURNS SETOF t LANGUAGE sql AS $$ SELECT * FROM t $$;
`;

async function snapshotOf(ddl: string): Promise<CatalogSnapshot> {
  const pg = await PGlite.create();
  try {
    await pg.exec(ddl);
    return await snapshotCatalog(pg);
  } finally {
    await pg.close();
  }
}

describe("catalog diff is stable across a rebuild", () => {
  it("reports nothing when the same schema is built in a fresh database", async () => {
    const before = await snapshotOf(DDL);
    // Objects created and dropped first, so the same DDL lands on different
    // OIDs than it did the first time round.
    const after = await snapshotOf(`
      CREATE TABLE decoy (id integer);
      CREATE TYPE decoy_t AS (x integer);
      DROP TABLE decoy;
      DROP TYPE decoy_t;
      ${DDL}
    `);

    const oids = (s: CatalogSnapshot) =>
      s.tables
        .flatMap(t => t.columns.map(c => c.typeOid))
        .concat(s.domains.map(d => d.oid))
        .concat(s.functions.map(f => f.returnTypeOid));
    expect(oids(after)).not.toEqual(oids(before));

    const diff = diffCatalogs(before, after);
    expect(
      diff.modified.map(m => m.entityId),
      "entities reported as modified after a rebuild that changed nothing",
    ).toEqual([]);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
  });

  it("still reports a real change made across the rebuild", async () => {
    const before = await snapshotOf(DDL);
    const after = await snapshotOf(
      DDL.replace("note   text DEFAULT 'x'", "note   text DEFAULT 'y'"),
    );
    expect(diffCatalogs(before, after).modified.map(m => m.entityId)).toEqual([
      "public.t.note",
    ]);
  });

  it("still reports a column whose type changed, and the view column over it", async () => {
    const before = await snapshotOf(DDL);
    const after = await snapshotOf(DDL.replace("note   text", "note   varchar(50)"));
    expect(diffCatalogs(before, after).modified.map(m => m.entityId)).toEqual([
      "public.t.note",
      "public.v.note",
    ]);
  });

  it("reports a domain redefinition at the domain, and not at its columns", async () => {
    const before = await snapshotOf(DDL);
    // The name `pct` is unchanged; the type it denotes is not. A column
    // declared `pct` names the domain and says nothing about what the domain
    // is made of, so the change belongs to the domain entity — which is what a
    // consumer following type dependencies from `public.pct` will find.
    const after = await snapshotOf(DDL.replace("AS numeric NOT NULL", "AS integer NOT NULL"));
    expect(diffCatalogs(before, after).modified.map(m => m.entityId)).toEqual(["public.pct"]);
  });

  it("reports nothing when only the session's search_path differs", async () => {
    // Names in a snapshot are rendered by PostgreSQL, and every renderer omits
    // the schema qualifier for whatever the search path makes visible. Without
    // a pinned path the same unchanged database describes itself differently
    // from two sessions, and the diff reads that as a schema change.
    const pg = await PGlite.create();
    try {
      await pg.exec(`
        CREATE SCHEMA app;
        CREATE DOMAIN app.pct AS numeric;
        CREATE TABLE app.t (id integer NOT NULL PRIMARY KEY, share app.pct);
        CREATE VIEW app.v AS SELECT id, share FROM app.t;
        CREATE FUNCTION app.f(a app.pct) RETURNS app.pct LANGUAGE sql AS $$ SELECT a $$;
      `);
      const fromDefault = await snapshotCatalog(pg);
      await pg.exec("SET search_path TO app, public;");
      const fromApp = await snapshotCatalog(pg);

      expect(diffCatalogs(fromDefault, fromApp).modified.map(m => m.entityId)).toEqual([]);

      // And the rendering is the qualified one either way, not whichever the
      // session happened to make visible.
      const share = fromApp.tables
        .find(t => t.name === "t")!
        .columns.find(c => c.name === "share")!;
      expect(share.typeName).toBe("app.pct");
      expect(fromApp.views.find(v => v.name === "v")!.definition).toContain("FROM app.t");
    } finally {
      await pg.close();
    }
  });

  it("restores the session's search_path afterwards", async () => {
    const pg = await PGlite.create();
    try {
      await pg.exec("CREATE SCHEMA app; SET search_path TO app, public;");
      await snapshotCatalog(pg);
      const after = await pg.query<{ search_path: string }>("SHOW search_path;");
      expect(after.rows[0]!.search_path).toBe("app, public");
    } finally {
      await pg.close();
    }
  });

  it("compares no OID anywhere", async () => {
    const states = comparableStates(await snapshotOf(DDL));
    const offenders: string[] = [];
    const scan = (value: unknown, path: string) => {
      if (Array.isArray(value)) {
        value.forEach((v, i) => scan(v, `${path}[${i}]`));
      } else if (value && typeof value === "object") {
        for (const [key, v] of Object.entries(value)) {
          if (/oid$/i.test(key)) offenders.push(`${path}.${key}`);
          scan(v, `${path}.${key}`);
        }
      }
    };
    for (const [id, state] of states) scan(state, id);
    expect(
      offenders,
      "an OID reached the comparable state; it will churn on any rebuild",
    ).toEqual([]);
  });
});
