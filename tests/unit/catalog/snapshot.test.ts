import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { SchemaBuilder } from "../../../src/schema-builder.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { diffCatalogs, emptyCatalogSnapshot } from "../../../src/catalog/diff.js";
import {
  ALWAYS_NOT_NULL_BUILTINS,
  FIRST_ARG_BUILTINS,
  STRICT_TOTAL_BUILTINS,
  STRICT_TOTAL_BUILTIN_SIGNATURES,
  SWEPT_TOTAL_SIGNATURES,
  NON_NULL_OVER_NONEMPTY_AGGREGATES,
  NEVER_NULL_WINDOW_SIGNATURES,
  STRICT_TOTAL_WINDOW_SIGNATURES,
} from "../../../src/query/nullability-walk.js";
import {
  TOTAL_OPERATORS,
  STRICT_OPERATORS,
  TOTAL_OPERATOR_SIGNATURES,
} from "../../../src/query/operators.js";
import { cleanupPg } from "../../helpers/cleanup.js";
import type {
  CatalogSnapshot,
  ColumnInfo,
  FunctionInfo,
  TableInfo,
} from "../../../src/catalog/types.js";

const migDir = fileURLToPath(new URL("../../fixtures/migrations", import.meta.url));
function loadMigration(name: string): Buffer {
  return readFileSync(join(migDir, name));
}

/** Helper: find a table in a snapshot by schema.name. */
function findTable(s: CatalogSnapshot, schema: string, name: string): TableInfo | undefined {
  return s.tables.find(t => t.schema === schema && t.name === name);
}

/** Helper: find a column in a table by name. */
function findCol(t: TableInfo | undefined, name: string): ColumnInfo | undefined {
  return t?.columns.find(c => c.name === name);
}

/** Helper: find a function in a snapshot by schema.name(argTypes).
 *  `argTypes` is the `pg_get_function_identity_arguments` string, which
 *  includes arg names when args are named and includes IN/OUT modes when
 *  any arg is not plain IN. */
function findFn(s: CatalogSnapshot, schema: string, name: string, argTypes: string): FunctionInfo | undefined {
  return s.functions.find(f => f.schema === schema && f.name === name && f.argTypes === argTypes);
}

// ---------------------------------------------------------------------------
// Snapshot query tests (need PGlite). Each describe applies its own DDL and
// asserts the snapshot captured the entities with correct properties.
// ---------------------------------------------------------------------------

describe("snapshotCatalog: empty schema", () => {
  let pg: PGlite;
  beforeAll(async () => {
    pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
  });
  afterAll(async () => { if (!pg.closed) await pg.close(); });
  afterEach(async () => { await cleanupPg(pg); });

  it("returns a well-formed (empty-of-user-objects) snapshot for a fresh public schema", async () => {
    const s = await snapshotCatalog(pg);
    expect(s.tables).toEqual([]);
    expect(s.views).toEqual([]);
    expect(s.materializedViews).toEqual([]);
    expect(s.indexes).toEqual([]);
    expect(s.enums).toEqual([]);
    expect(s.domains).toEqual([]);
    expect(s.compositeTypes).toEqual([]);
    expect(s.sequences).toEqual([]);
    // public schema always exists; plpgsql_check + plpgsql extensions present.
    expect(s.schemas.map(x => x.name)).toContain("public");
    expect(s.extensions.map(x => x.name)).toEqual(expect.arrayContaining(["plpgsql", "plpgsql_check"]));
    // The plpgsql_check extension registers functions in `public`; by design
    // the snapshot includes extension functions (they're part of the schema
    // state even though the validate pipeline skips them).
    expect(s.functions.length).toBeGreaterThan(0);
  });

  it("is structurally clean (no Maps/ circular refs; plain data)", async () => {
    const s = await snapshotCatalog(pg);
    // Snapshot is plain data (arrays + plain objects + primitives + bigint).
    // JSON serialization of bigint is deferred to a dedicated serializer;
    // here we just assert the shape is plain (no Map/Set/Buffer instances).
    expect(s).toEqual(expect.any(Object));
    expect(Array.isArray(s.tables)).toBe(true);
    // Replacer-based stringify tolerates bigint so we can sanity-check shape.
    const json = JSON.stringify(s, (_k, v) => typeof v === "bigint" ? v.toString() : v);
    expect(typeof json).toBe("string");
    const parsed = JSON.parse(json);
    expect(parsed.schemas.length).toBeGreaterThan(0);
  });
});

describe("snapshotCatalog: tables, columns, constraints, indexes", () => {
  let pg: PGlite;
  beforeAll(async () => {
    pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
  });
  afterAll(async () => { if (!pg.closed) await pg.close(); });
  afterEach(async () => { await cleanupPg(pg); });

  it("captures columns with type, NOT NULL, DEFAULT, GENERATED, IDENTITY", async () => {
    await pg.exec(`
      CREATE TABLE public.snap_t (
        id bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
        email text NOT NULL,
        display_name text,
        created_at timestamptz NOT NULL DEFAULT now(),
        tags text[] DEFAULT '{}'
      );
    `);
    const s = await snapshotCatalog(pg);
    const t = findTable(s, "public", "snap_t");
    expect(t).toBeDefined();

    const id = findCol(t, "id");
    expect(id?.typeOid).toBe(20); // int8
    expect(id?.typeName).toBe("bigint");
    expect(id?.notNull).toBe(true);
    expect(id?.identity).toBe("byDefault");
    expect(id?.generated).toBe("none");

    const email = findCol(t, "email");
    expect(email?.notNull).toBe(true);
    expect(email?.hasDefault).toBe(false);

    const displayName = findCol(t, "display_name");
    expect(displayName?.notNull).toBe(false);

    const createdAt = findCol(t, "created_at");
    expect(createdAt?.notNull).toBe(true);
    expect(createdAt?.hasDefault).toBe(true);
    expect(createdAt?.defaultExpr).toBe("now()");

    const tags = findCol(t, "tags");
    expect(tags?.hasDefault).toBe(true);
    expect(tags?.defaultExpr).toBe("'{}'::text[]");
  });

  it("captures constraints (PK, UNIQUE, FK, CHECK) with columns and definition", async () => {
    await pg.exec(`
      CREATE TABLE public.snap_pk (id bigint PRIMARY KEY, code text UNIQUE);
      CREATE TABLE public.snap_fk (
        id bigint PRIMARY KEY,
        pk_id bigint REFERENCES public.snap_pk(id) ON DELETE CASCADE
      );
      CREATE TABLE public.snap_check (
        val integer,
        CONSTRAINT val_pos CHECK (val > 0)
      );
    `);
    const s = await snapshotCatalog(pg);

    const pk = findTable(s, "public", "snap_pk");
    const pkCon = pk?.constraints.find(c => c.type === "primaryKey");
    expect(pkCon?.name).toBe("snap_pk_pkey");
    expect(pkCon?.columns).toEqual(["id"]);
    expect(pkCon?.definition).toContain("PRIMARY KEY");
    const uniqCon = pk?.constraints.find(c => c.type === "unique");
    expect(uniqCon?.columns).toEqual(["code"]);

    const fk = findTable(s, "public", "snap_fk");
    const fkCon = fk?.constraints.find(c => c.type === "foreign");
    expect(fkCon?.foreignSchema).toBe("public");
    expect(fkCon?.foreignTable).toBe("snap_pk");
    expect(fkCon?.foreignColumns).toEqual(["id"]);
    expect(fkCon?.definition).toContain("FOREIGN KEY");
    expect(fkCon?.definition).toContain("ON DELETE CASCADE");

    const chk = findTable(s, "public", "snap_check");
    const chkCon = chk?.constraints.find(c => c.type === "check");
    expect(chkCon?.name).toBe("val_pos");
    expect(chkCon?.definition).toContain("CHECK");
    expect(chkCon?.definition).toContain("val > 0");
  });

  it("captures indexes (unique, partial, method, columns)", async () => {
    await pg.exec(`
      CREATE TABLE public.snap_idx (id bigint PRIMARY KEY, email text, tags text[], published_at timestamptz);
      CREATE UNIQUE INDEX snap_email_uniq ON public.snap_idx (lower(email));
      CREATE INDEX snap_tags_gin ON public.snap_idx USING gin (tags);
      CREATE INDEX snap_published_idx ON public.snap_idx (published_at DESC)
        WHERE published_at IS NOT NULL;
    `);
    const s = await snapshotCatalog(pg);
    const emailIdx = s.indexes.find(i => i.name === "snap_email_uniq");
    expect(emailIdx?.unique).toBe(true);
    expect(emailIdx?.method).toBe("btree");
    expect(emailIdx?.tableSchema).toBe("public");
    expect(emailIdx?.tableName).toBe("snap_idx");
    expect(emailIdx?.definition).toContain("lower(email)");

    const ginIdx = s.indexes.find(i => i.name === "snap_tags_gin");
    expect(ginIdx?.method).toBe("gin");
    expect(ginIdx?.columns).toEqual(["tags"]);

    const partial = s.indexes.find(i => i.name === "snap_published_idx");
    expect(partial?.partial).toContain("published_at IS NOT NULL");
    expect(partial?.columns).toEqual(["published_at"]);
  });

  // One CREATE INDEX on a partitioned table makes the declared index
  // (relkind 'I') plus one CLONE per partition (relkind 'i',
  // relispartition). The capture read relkind = 'i', so it dropped the
  // declaration and registered its clones — named after the partitions,
  // which no migration mentions.
  it("captures the DECLARED index on a partitioned table, not its per-partition clones", async () => {
    await pg.exec(`
      CREATE TABLE public.snap_part (id int, amt int, note text) PARTITION BY RANGE (id);
      CREATE TABLE public.snap_part_1 PARTITION OF public.snap_part FOR VALUES FROM (0) TO (100);
      CREATE TABLE public.snap_part_2 PARTITION OF public.snap_part FOR VALUES FROM (100) TO (200);
      CREATE INDEX snap_part_amt_ix ON public.snap_part (amt);
      -- Written on the partition itself, with no parent index to belong to.
      CREATE INDEX snap_part_1_note_ix ON public.snap_part_1 (note);
    `);
    const s = await snapshotCatalog(pg);
    const named = s.indexes.filter(i => i.name.startsWith("snap_part")).map(i => i.name);
    expect(named).toEqual(["snap_part_1_note_ix", "snap_part_amt_ix"]);
    const declared = s.indexes.find(i => i.name === "snap_part_amt_ix");
    expect(declared?.tableName).toBe("snap_part");
    expect(declared?.columns).toEqual(["amt"]);
  });

  it("captures storage parameters (fillfactor)", async () => {
    await pg.exec(`
      CREATE TABLE public.snap_fill (id int) WITH (fillfactor = 75);
    `);
    const s = await snapshotCatalog(pg);
    const t = findTable(s, "public", "snap_fill");
    expect(t?.storageParams).toEqual({ fillfactor: "75" });
  });
});

describe("snapshotCatalog: functions and procedures", () => {
  let pg: PGlite;
  beforeAll(async () => {
    pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
  });
  afterAll(async () => { if (!pg.closed) await pg.close(); });
  afterEach(async () => { await cleanupPg(pg); });

  it("captures plpgsql/sql functions and procedures with args, return, volatility", async () => {
    await pg.exec("SET check_function_bodies TO off;");
    await pg.exec("CREATE TABLE public.fn_t (id int, name text);");
    await pg.exec(`
      CREATE FUNCTION public.add(a integer, b integer) RETURNS integer
      LANGUAGE sql IMMUTABLE STRICT AS $$ SELECT a + b; $$;
    `);
    await pg.exec(`
      CREATE FUNCTION public.get_name(uid bigint) RETURNS text
      LANGUAGE plpgsql VOLATILE AS $$
      BEGIN
        PERFORM name FROM public.fn_t WHERE id = uid;
        RETURN 'x';
      END;
      $$;
    `);
    await pg.exec(`
      CREATE PROCEDURE public.count_outs(IN uid bigint, OUT n integer)
      LANGUAGE plpgsql AS $$
      BEGIN
        SELECT count(*)::integer INTO n FROM public.fn_t WHERE id = uid;
      END;
      $$;
    `);

    const s = await snapshotCatalog(pg);

    const add = findFn(s, "public", "add", "a integer, b integer");
    expect(add).toBeDefined();
    expect(add?.language).toBe("sql");
    expect(add?.returnType).toBe("integer");
    expect(add?.volatile).toBe("immutable");
    expect(add?.strict).toBe(true);
    expect(add?.isProcedure).toBe(false);
    expect(add?.args).toHaveLength(2);
    expect(add?.args[0]).toMatchObject({ name: "a", mode: "in", typeOid: 23, typeName: "integer", hasDefault: false });

    const getName = findFn(s, "public", "get_name", "uid bigint");
    expect(getName?.language).toBe("plpgsql");
    expect(getName?.volatile).toBe("volatile");
    expect(getName?.returnType).toBe("text");

    // OUT-only args: pg_get_function_identity_arguments includes the IN/OUT
    // mode keywords when any arg is not plain IN, so the identity string is
    // "IN uid bigint, OUT n integer" (the full arg list), not "bigint".
    const proc = findFn(s, "public", "count_outs", "IN uid bigint, OUT n integer");
    expect(proc?.isProcedure).toBe(true);
    // args array still has both IN and OUT.
    expect(proc?.args).toHaveLength(2);
    const outArg = proc?.args.find(a => a.name === "n");
    expect(outArg?.mode).toBe("out");
  });

  it("captures arg defaults and variadic mode", async () => {
    await pg.exec("SET check_function_bodies TO off;");
    // A default arg followed by a non-default arg is invalid in PG; give the
    // VARIADIC arg a default too so the function is well-formed.
    await pg.exec(`
      CREATE FUNCTION public.defaults_fn(a integer, b integer DEFAULT 5, VARIADIC c integer[] DEFAULT '{}')
      RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT a + b; $$;
    `);
    const s = await snapshotCatalog(pg);
    const f = findFn(s, "public", "defaults_fn", "a integer, b integer, VARIADIC c integer[]");
    expect(f).toBeDefined();
    expect(f?.args).toHaveLength(3);
    expect(f?.args[0]?.hasDefault).toBe(false);
    expect(f?.args[1]?.hasDefault).toBe(true);
    expect(f?.args[2]?.mode).toBe("variadic");

    // The default EXPRESSION, not just the flag: what a call that omits the
    // parameter actually passes. Rendered by PostgreSQL, so it carries the
    // cast it resolved to.
    expect(f?.args[0]?.defaultExpr).toBeNull();
    expect(f?.args[1]?.defaultExpr).toBe("5");
    expect(f?.args[2]?.defaultExpr).toBe("'{}'::integer[]");
  });

  it("counts defaults over INPUT arguments when an OUT parameter interleaves", async () => {
    await pg.exec("SET check_function_bodies TO off;");
    // Legal, and the shape that separates the two readings: PostgreSQL stores
    // the default against `b` — the third POSITION and the second INPUT
    // argument — so counting trailing positions over the whole list marks the
    // OUT parameter instead, and leaves `b` looking required.
    await pg.exec(`
      CREATE FUNCTION public.mid_out_fn(a integer, OUT x integer, b integer DEFAULT NULL)
      LANGUAGE sql AS $$ SELECT a $$;
    `);
    const s = await snapshotCatalog(pg);
    const f = findFn(s, "public", "mid_out_fn", "a integer, OUT x integer, b integer");
    expect(f?.args.map(a => [a.name, a.mode, a.hasDefault, a.defaultExpr])).toEqual([
      ["a", "in", false, null],
      ["x", "out", false, null],
      ["b", "in", true, "NULL::integer"],
    ]);
  });

  it("captures the polymorphic ARRAY signatures, with their argument types", async () => {
    const s = await snapshotCatalog(pg);
    const byName = (name: string) =>
      s.builtinPolymorphicArraySignatures
        .filter(sig => sig.name === name)
        .map(sig => `${sig.args.join(", ")} -> ${sig.returns}`)
        .sort();

    // Both array_agg signatures, which is the pair that makes the resolution
    // a CHOICE rather than a lookup: a composite argument fits the first.
    expect(byName("array_agg")).toEqual([
      "anyarray -> anyarray",
      "anynonarray -> anyarray",
    ]);
    expect(byName("array_remove")).toEqual([
      "anycompatiblearray, anycompatible -> anycompatiblearray",
    ]);
    expect(byName("array_prepend")).toEqual([
      "anycompatible, anycompatiblearray -> anycompatiblearray",
    ]);

    // Every captured signature declares at least one polymorphic ARGUMENT —
    // a polymorphic result with none (`anyarray_in(cstring)`) could never be
    // resolved and is not callable from a query.
    const POLY = new Set([
      "anyarray", "anycompatiblearray", "anyelement",
      "anynonarray", "anycompatible", "anyenum",
    ]);
    for (const sig of s.builtinPolymorphicArraySignatures) {
      expect(sig.args.some(a => POLY.has(a)), `${sig.name}(${sig.args.join(", ")})`).toBe(true);
      expect(["anyarray", "anycompatiblearray"]).toContain(sig.returns);
    }
  });

  it("captures the claim-table signatures, scoped both ways", async () => {
    // The type-aware-overloads prerequisite: pg_catalog signatures for
    // exactly the names the curated tables make claims about. Both
    // directions, the polymorphic-array capture's discipline: every captured
    // name is claimed, and every claimed name resolves to at least one row —
    // a claim about nothing is the `trim`/`!=` dead-entry class.
    const s = await snapshotCatalog(pg);
    const fnNames = new Set([
      ...ALWAYS_NOT_NULL_BUILTINS, ...FIRST_ARG_BUILTINS, ...STRICT_TOTAL_BUILTINS,
      ...NON_NULL_OVER_NONEMPTY_AGGREGATES,
      ...[...NEVER_NULL_WINDOW_SIGNATURES, ...STRICT_TOTAL_WINDOW_SIGNATURES]
        .map(k => k.slice(0, k.indexOf("("))),
      ...[...STRICT_TOTAL_BUILTIN_SIGNATURES].map(k => k.slice(0, k.indexOf("("))),
      ...[...SWEPT_TOTAL_SIGNATURES].map(k => k.slice(0, k.indexOf("("))),
    ]);
    const opNames = new Set([
      ...TOTAL_OPERATORS,
      ...STRICT_OPERATORS,
      // The signature-keyed operator claims scope themselves the same way
      // the function-side additions do: the SYMBOL joins the capture so the
      // typed dispatch can resolve the rows those keys name.
      ...[...TOTAL_OPERATOR_SIGNATURES].map(k => k.slice(0, k.indexOf("("))),
    ]);

    const capturedFn = new Set(s.builtinFunctionSignatures.map(sig => sig.name));
    for (const sig of s.builtinFunctionSignatures) {
      // The WITHIN GROUP classes scope themselves — every aggkind 'h'/'o'
      // row rides along for the class claims (the two name tables that
      // mirrored the classes retired) — so a captured name is either
      // table-claimed or carries such a row.
      if (!fnNames.has(sig.name)) {
        expect(
          s.builtinFunctionSignatures.some(
            r => r.name === sig.name && (r.aggKind === "h" || r.aggKind === "o"),
          ),
          sig.name,
        ).toBe(true);
      }
    }
    for (const name of fnNames) expect(capturedFn, name).toContain(name);

    const capturedOp = new Set(s.builtinOperatorSignatures.map(sig => sig.name));
    for (const sig of s.builtinOperatorSignatures) expect(opNames).toContain(sig.name);
    for (const name of opNames) expect(capturedOp, name).toContain(name);
  });

  it("carries the resolution keys the overload measurements established", async () => {
    // Spot pins from overload-resolution-mechanism.test.ts, here asserted on
    // the CAPTURE so the snapshot's copy of each fact cannot drift from the
    // measured one.
    const s = await snapshotCatalog(pg);

    // rank: one window row, one hypothetical-set row — call-shape dispatch,
    // never type dispatch, because the aggregate's parameter is "any".
    const rank = s.builtinFunctionSignatures.filter(sig => sig.name === "rank");
    expect(rank.map(({ kind, aggKind, numDirectArgs, variadic, args }) =>
      ({ kind, aggKind, numDirectArgs, variadic, args }))).toEqual([
      { kind: "a", aggKind: "h", numDirectArgs: 1, variadic: '"any"', args: ['"any"'] },
      { kind: "w", aggKind: null, numDirectArgs: null, variadic: null, args: [] },
    ]);

    // percentile_cont: four rows keyed on the position AFTER numDirectArgs —
    // the ORDER BY type — which is why WITHIN GROUP exact match must append
    // agg_order types to the direct arguments.
    const pc = s.builtinFunctionSignatures.filter(sig => sig.name === "percentile_cont");
    expect(pc.map(sig => `${sig.args.join(", ")} -> ${sig.returns}`)).toEqual([
      "double precision, double precision -> double precision",
      "double precision, interval -> interval",
      "double precision[], double precision -> double precision[]",
      "double precision[], interval -> interval[]",
    ]);
    for (const sig of pc) {
      expect(sig.aggKind).toBe("o");
      expect(sig.numDirectArgs).toBe(1);
    }

    // ||: strictness DIVERGES across the rows — the three array forms are
    // non-strict (a NULL operand is absorbed), the rest strict. The measured
    // reason tier 2's consensus quantifier is per-property, visible in data.
    const concat = s.builtinOperatorSignatures.filter(sig => sig.name === "||");
    const nonStrict = concat.filter(sig => !sig.strict);
    expect(nonStrict.length).toBeGreaterThan(0);
    expect(nonStrict.length).toBeLessThan(concat.length);
    for (const sig of nonStrict) {
      expect([sig.leftType, sig.rightType]).toContain("anycompatiblearray");
    }

    // + over (path, path): the recorded PARTIAL_OVERLOADS hole is in the
    // capture — and its strict flag is TRUE, which pins the boundary the
    // charter states: strictness is in the catalog, totality is not, so the
    // capture can never settle a totality verdict by itself.
    const pathPlus = s.builtinOperatorSignatures.find(
      sig => sig.name === "+" && sig.leftType === "path" && sig.rightType === "path",
    );
    expect(pathPlus).toMatchObject({ returns: "path", strict: true });

    // Prefix rows survive the capture: unary minus has no left operand.
    expect(s.builtinOperatorSignatures.some(
      sig => sig.name === "-" && sig.leftType === null,
    )).toBe(true);

    // Trailing defaults: arity elimination without this count would
    // falsely eliminate the shorter jsonb_set call.
    const js = s.builtinFunctionSignatures.find(sig => sig.name === "jsonb_set");
    expect(js?.numArgDefaults).toBe(1);
    const lo = s.builtinFunctionSignatures.find(
      sig => sig.name === "lower" && sig.args.join(",") === "text",
    );
    expect(lo).toMatchObject({ numArgDefaults: 0, strict: true, kind: "f" });
  });

  it("captures the implicit casts and the builtin type kinds", async () => {
    const s = await snapshotCatalog(pg);
    const cast = (source: string, target: string) =>
      s.builtinImplicitCasts.find(c => c.source === source && c.target === target);

    // The canonicalisation edge the charter's varchar case rides, present in
    // BOTH directions — which is why canonicalisation tries images rather
    // than following a single canonical target.
    expect(cast("character varying", "text")).toMatchObject({ binary: true });
    expect(cast("text", "character varying")).toMatchObject({ binary: true });
    // Implicit but NOT binary: the numeric tower's worked example.
    expect(cast("bigint", "numeric")).toMatchObject({ binary: false });
    // Assignment and explicit casts stay out — `bigint → integer` is
    // assignment, `boolean → integer` is explicit, and both would make the
    // elimination rule keep candidates PostgreSQL refuses.
    expect(cast("bigint", "integer")).toBeUndefined();
    expect(cast("boolean", "integer")).toBeUndefined();

    // Type kinds: ranges and multiranges are what the polymorphic predicate
    // reads positively; a known base type is what it refuses on with
    // certainty; an absent name keeps the candidate.
    expect(s.builtinTypeKinds["int4range"]).toBe("r");
    expect(s.builtinTypeKinds["int4multirange"]).toBe("m");
    expect(s.builtinTypeKinds["text"]).toBe("b");
    expect(s.builtinTypeKinds["record"]).toBe("p");
    expect(s.builtinTypeKinds["public.mood"]).toBeUndefined();

    // The grammar-to-format_type bridge: a cast's `int4` must find the
    // signature rows keyed `integer`, and a name the two spellings agree on
    // has no entry.
    expect(s.builtinTypeNameAliases["int4"]).toBe("integer");
    expect(s.builtinTypeNameAliases["varchar"]).toBe("character varying");
    expect(s.builtinTypeNameAliases["float8"]).toBe("double precision");
    expect(s.builtinTypeNameAliases["text"]).toBeUndefined();
  });

  it("includes extension functions (plpgsql_check) but they are not validated", async () => {
    const s = await snapshotCatalog(pg);
    const extFns = s.functions.filter(f => f.name === "plpgsql_check_function_tb" || f.name === "plpgsql_check_function");
    expect(extFns.length).toBeGreaterThan(0);
  });
});

describe("snapshotCatalog: views and materialized views", () => {
  let pg: PGlite;
  beforeAll(async () => {
    pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
  });
  afterAll(async () => { if (!pg.closed) await pg.close(); });
  afterEach(async () => { await cleanupPg(pg); });

  it("captures view columns and definition", async () => {
    await pg.exec(`
      CREATE TABLE public.v_t (id int, name text);
      CREATE VIEW public.my_v AS SELECT id, name FROM public.v_t WHERE id > 0;
    `);
    const s = await snapshotCatalog(pg);
    const v = s.views.find(x => x.schema === "public" && x.name === "my_v");
    expect(v).toBeDefined();
    // pg_views.definition is pretty-printed; match on tokens, not exact text.
    expect(v?.definition).toMatch(/SELECT\s+id,\s+name/i);
    expect(v?.definition).toContain("FROM");
    expect(v?.columns.map(c => c.name)).toEqual(["id", "name"]);
    expect(v?.columns[0]?.typeName).toBe("integer");
  });

  it("captures materialized view columns and definition", async () => {
    await pg.exec(`
      CREATE TABLE public.mv_t (id int, val text);
      CREATE MATERIALIZED VIEW public.my_mv AS SELECT id, val FROM public.mv_t;
    `);
    const s = await snapshotCatalog(pg);
    const mv = s.materializedViews.find(x => x.schema === "public" && x.name === "my_mv");
    expect(mv).toBeDefined();
    expect(mv?.columns.map(c => c.name)).toEqual(["id", "val"]);
    expect(mv?.definition).toContain("SELECT");
  });
});

describe("snapshotCatalog: enums, domains, composite types, sequences", () => {
  let pg: PGlite;
  beforeAll(async () => {
    pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
  });
  afterAll(async () => { if (!pg.closed) await pg.close(); });
  afterEach(async () => { await cleanupPg(pg); });

  it("captures enum values in order", async () => {
    await pg.exec("CREATE TYPE public.mood AS ENUM ('sad', 'ok', 'happy');");
    const s = await snapshotCatalog(pg);
    const e = s.enums.find(x => x.schema === "public" && x.name === "mood");
    expect(e?.values).toEqual(["sad", "ok", "happy"]);
  });

  it("captures domain base type, NOT NULL, default, check", async () => {
    await pg.exec("CREATE DOMAIN public.posint AS integer CHECK (value > 0);");
    await pg.exec("CREATE DOMAIN public.tagged AS text NOT NULL DEFAULT 'unknown';");
    const s = await snapshotCatalog(pg);
    const posint = s.domains.find(d => d.schema === "public" && d.name === "posint");
    expect(posint?.baseTypeName).toBe("integer");
    // pg_get_constraintdef normalizes identifiers to uppercase.
    expect(posint?.checks).toHaveLength(1);
    expect(posint?.checks[0]).toContain("CHECK");
    expect(posint?.checks[0]?.toLowerCase()).toContain("value > 0");
    const tagged = s.domains.find(d => d.schema === "public" && d.name === "tagged");
    expect(tagged?.notNull).toBe(true);
    expect(tagged?.default).toBe("'unknown'::text");
    expect(tagged?.checks).toEqual([]);
  });

  // A domain may declare any number of CHECKs, and the capture kept one of
  // them — chosen by catalog row order, so the second was invisible and the
  // first was not stable across a replay.
  it("captures EVERY check on a domain, ordered by constraint name", async () => {
    await pg.exec(
      "CREATE DOMAIN public.twochk AS integer" +
        " CONSTRAINT zz_lo CHECK (VALUE > 0) CONSTRAINT aa_hi CHECK (VALUE < 10);",
    );
    const s = await snapshotCatalog(pg);
    const twochk = s.domains.find(d => d.schema === "public" && d.name === "twochk");
    expect(twochk?.checks).toEqual(["CHECK ((VALUE < 10))", "CHECK ((VALUE > 0))"]);
  });

  it("captures composite type attributes", async () => {
    await pg.exec(`
      CREATE TYPE public.address AS (
        city text,
        zip integer
      );
    `);
    const s = await snapshotCatalog(pg);
    const ct = s.compositeTypes.find(t => t.schema === "public" && t.name === "address");
    expect(ct?.attributes.map(a => a.name)).toEqual(["city", "zip"]);
    expect(ct?.attributes[0]?.typeName).toBe("text");
    expect(ct?.attributes[1]?.typeName).toBe("integer");
  });

  it("does NOT capture table row types as composite types", async () => {
    await pg.exec("CREATE TABLE public.row_t (id int);");
    const s = await snapshotCatalog(pg);
    // The auto-created composite type "public.row_t" must NOT appear in
    // compositeTypes (only user CREATE TYPE AS (...) composites belong there).
    expect(s.compositeTypes.find(t => t.name === "row_t")).toBeUndefined();
  });

  it("captures sequence params and owned-by column", async () => {
    await pg.exec(`
      CREATE TABLE public.seq_t (id bigint GENERATED BY DEFAULT AS IDENTITY);
    `);
    const s = await snapshotCatalog(pg);
    // Identity sequences are named <table>_<column>_seq.
    const seq = s.sequences.find(x => x.schema === "public" && x.name === "seq_t_id_seq");
    expect(seq).toBeDefined();
    expect(seq?.typeName).toBe("bigint");
    // PGlite returns small int8 values as a JS number; the diff's deep-equal
    // handles number|bigint transparently.
    expect(seq?.increment).toBe(1);
    expect(seq?.cycle).toBe(false);
    expect(seq?.ownedByTable).toBe("public.seq_t");
    expect(seq?.ownedByColumn).toBe("id");
  });
});

describe("snapshotCatalog: integration with migration fixtures + diff", () => {
  let pg: PGlite;
  beforeAll(async () => {
    pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
  });
  afterAll(async () => { if (!pg.closed) await pg.close(); });
  afterEach(async () => { await cleanupPg(pg); });

  async function applyFixtures(...names: string[]): Promise<SchemaBuilder> {
    const builder = new SchemaBuilder();
    await builder.snapshotBeforeMigrations(pg);
    for (let i = 0; i < names.length; i++) {
      const res = await builder.applyMigration(pg, loadMigration(names[i]!), i);
      expect(res.success).toBe(true);
    }
    return builder;
  }

  it("captures the 0001+0002+0003 migration set", async () => {
    await applyFixtures(
      "0001_initial_schema.sql",
      "0002_add_functions.sql",
      "0003_add_concurrently_index.sql",
    );
    const s = await snapshotCatalog(pg);

    // Tables.
    const users = findTable(s, "public", "users");
    expect(users?.columns.map(c => c.name)).toEqual([
      "id", "email", "display_name", "created_at", "updated_at",
    ]);
    expect(findCol(users, "id")?.identity).toBe("byDefault");
    expect(findCol(users, "email")?.notNull).toBe(true);
    expect(findCol(users, "created_at")?.defaultExpr).toBe("now()");

    const posts = findTable(s, "public", "posts");
    const fk = posts?.constraints.find(c => c.type === "foreign");
    expect(fk?.foreignTable).toBe("users");
    expect(fk?.foreignColumns).toEqual(["id"]);

    // Indexes (incl. CONCURRENTLY-built + partial + gin from 0003).
    expect(s.indexes.map(i => i.name)).toEqual(expect.arrayContaining([
      "users_email_uniq", "posts_user_id_idx", "posts_published_idx",
      "posts_tags_gin", "posts_user_published_idx",
    ]));
    expect(s.indexes.find(i => i.name === "posts_tags_gin")?.method).toBe("gin");
    expect(s.indexes.find(i => i.name === "posts_published_idx")?.partial).toContain("published_at IS NOT NULL");

    // Functions (plpgsql + sql). Identity args include arg names (fixtures
    // use named parameters).
    expect(findFn(s, "public", "publish_post", "post_id bigint")?.language).toBe("plpgsql");
    expect(findFn(s, "public", "get_user_email", "uid bigint")?.language).toBe("sql");
    expect(findFn(s, "public", "get_user_email", "uid bigint")?.volatile).toBe("immutable");
    expect(findFn(s, "public", "get_user_email", "uid bigint")?.strict).toBe(true);
    expect(findFn(s, "public", "count_user_posts", "uid bigint")?.returnType).toBe("integer");
  });

  it("diff: snapshot A → apply schema change → snapshot B → diff", async () => {
    // State A: 0001 only.
    await applyFixtures("0001_initial_schema.sql");
    const snapA = await snapshotCatalog(pg);

    // State B: create the enum FIRST, then add a column referencing it.
    // (A column's type must exist at ALTER-ADD time — check_function_bodies
    // doesn't affect type resolution, so the order matters.)
    const builder = new SchemaBuilder();
    await builder.snapshotBeforeMigrations(pg);
    const res = await builder.applyMigration(
      pg,
      Buffer.from(
        "CREATE TYPE public.mood AS ENUM ('active', 'inactive');\n" +
        "ALTER TABLE public.users ADD COLUMN status public.mood;\n",
        "utf8",
      ),
      0,
    );
    expect(res.success).toBe(true);
    const snapB = await snapshotCatalog(pg);

    const diff = diffCatalogs(snapA, snapB);

    // Added: the new enum + the new column.
    expect(diff.added).toEqual(expect.arrayContaining(["public.mood", "public.users.status"]));
    expect(diff.removed).toEqual([]);
    // The users table itself is NOT modified (only a column was added).
    expect(diff.modified.find(m => m.entityId === "public.users")).toBeUndefined();
  });

  it("diff: column type change shows as column modified", async () => {
    await applyFixtures("0001_initial_schema.sql");
    const snapA = await snapshotCatalog(pg);

    const builder = new SchemaBuilder();
    await builder.snapshotBeforeMigrations(pg);
    await builder.applyMigration(
      pg,
      Buffer.from("ALTER TABLE public.users ALTER COLUMN email TYPE varchar(255);\n", "utf8"),
      0,
    );
    const snapB = await snapshotCatalog(pg);

    const diff = diffCatalogs(snapA, snapB);
    expect(diff.modified.find(m => m.entityId === "public.users.email")).toBeDefined();
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
  });

  it("diff against empty snapshot reports everything as added", async () => {
    await applyFixtures("0001_initial_schema.sql");
    const s = await snapshotCatalog(pg);
    const diff = diffCatalogs(emptyCatalogSnapshot(), s);
    expect(diff.removed).toEqual([]);
    expect(diff.modified).toEqual([]);
    // Tables + their columns all added.
    expect(diff.added).toEqual(expect.arrayContaining([
      "public.users", "public.users.id", "public.users.email",
      "public.posts", "public.posts.id",
    ]));
  });
});
