import { describe, it, expect } from "vitest";
import { diffCatalogs, emptyCatalogSnapshot } from "../../../src/catalog/diff.js";
import type {
  CatalogSnapshot,
  ColumnInfo,
  ConstraintInfo,
  FunctionInfo,
  TableInfo,
  ViewInfo,
  IndexInfo,
  SequenceInfo,
  ExtensionInfo,
  SchemaInfo,
} from "../../../src/catalog/types.js";

// ---------------------------------------------------------------------------
// Pure-function diff tests (no PGlite). Snapshots are hand-built so we can
// assert exactly which entities are added/removed/modified.
// ---------------------------------------------------------------------------

function col(partial: Partial<ColumnInfo> & { name: string }): ColumnInfo {
  return {
    typeOid: 23,
    typeName: "integer",
    typeMod: null,
    notNull: false,
    // The tree conjunction equals the plain flag for a childless relation,
    // which is what a hand-built column means unless it says otherwise.
    notNullTree: partial.notNull ?? false,
    hasDefault: false,
    defaultExpr: null,
    generated: "none",
    generationDivergesInTree: false,
    identity: null,
    collationDeterministic: null,
    ...partial,
  };
}

function table(
  schema: string,
  name: string,
  columns: ColumnInfo[],
  extra: { constraints?: ConstraintInfo[]; storageParams?: Record<string, string> } = {},
): TableInfo {
  return {
    schema,
    name,
    columns,
    constraints: extra.constraints ?? [],
    storageParams: extra.storageParams ?? {},
    writeRewrites: { beforeRow: [], insteadOf: [], insteadRules: [] },
    writeRewritesTree: { beforeRow: [], insteadOf: [], insteadRules: [] },
    hasDescendants: false,
    relkind: "r",
  };
}

function snapshot(partial: Partial<CatalogSnapshot> = {}): CatalogSnapshot {
  return { ...emptyCatalogSnapshot(), ...partial };
}

describe("diffCatalogs: empty before → everything added", () => {
  it("reports all entities as added on first boot", () => {
    const after = snapshot({
      tables: [table("public", "users", [col({ name: "id" })])],
      enums: [{ schema: "public", name: "status", values: ["active", "inactive"] }],
      schemas: [{ name: "public", owner: "pg_database_owner" }],
    });
    const diff = diffCatalogs(emptyCatalogSnapshot(), after);
    expect(diff.removed).toEqual([]);
    expect(diff.modified).toEqual([]);
    expect(diff.added).toEqual([
      "public",
      "public.status",
      "public.users",
      "public.users.id",
    ]);
  });
});

describe("diffCatalogs: identical snapshots → empty diff", () => {
  it("no added/removed/modified when snapshots match", () => {
    const s = snapshot({
      tables: [table("public", "users", [col({ name: "id" })])],
    });
    const diff = diffCatalogs(s, s);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.modified).toEqual([]);
  });
});

describe("diffCatalogs: tables", () => {
  it("added table emits table + all its columns as added", () => {
    const before = snapshot();
    const after = snapshot({
      tables: [table("public", "users", [col({ name: "id" }), col({ name: "email" })])],
    });
    const diff = diffCatalogs(before, after);
    expect(diff.added).toEqual(["public.users", "public.users.email", "public.users.id"]);
    expect(diff.removed).toEqual([]);
    expect(diff.modified).toEqual([]);
  });

  it("dropped table emits table + all its columns as removed", () => {
    const before = snapshot({
      tables: [table("public", "users", [col({ name: "id" })])],
    });
    const after = snapshot();
    const diff = diffCatalogs(before, after);
    expect(diff.removed).toEqual(["public.users", "public.users.id"]);
    expect(diff.added).toEqual([]);
    expect(diff.modified).toEqual([]);
  });

  it("storage param change → table modified (columns unaffected)", () => {
    const before = snapshot({
      tables: [table("public", "t", [col({ name: "id" })], { storageParams: { fillfactor: "80" } })],
    });
    const after = snapshot({
      tables: [table("public", "t", [col({ name: "id" })], { storageParams: { fillfactor: "90" } })],
    });
    const diff = diffCatalogs(before, after);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.modified.map(m => m.entityId)).toEqual(["public.t"]);
  });

  it("constraint change → table modified", () => {
    const c1: ConstraintInfo = {
      name: "ck", type: "check", columns: [], foreignSchema: null,
      foreignTable: null, foreignColumns: null, definition: "CHECK (x > 0)",
      validated: true, noInherit: false, deferrable: false,
    };
    const c2: ConstraintInfo = { ...c1, definition: "CHECK (x > 5)" };
    const before = snapshot({ tables: [table("public", "t", [col({ name: "id" })], { constraints: [c1] })] });
    const after = snapshot({ tables: [table("public", "t", [col({ name: "id" })], { constraints: [c2] })] });
    const diff = diffCatalogs(before, after);
    expect(diff.modified.map(m => m.entityId)).toEqual(["public.t"]);
  });
});

describe("diffCatalogs: columns", () => {
  it("column type change → column modified, table unchanged", () => {
    const before = snapshot({
      tables: [table("public", "users", [col({ name: "id", typeName: "integer", typeOid: 23 })])],
    });
    const after = snapshot({
      tables: [table("public", "users", [col({ name: "id", typeName: "bigint", typeOid: 20 })])],
    });
    const diff = diffCatalogs(before, after);
    expect(diff.modified.map(m => m.entityId)).toEqual(["public.users.id"]);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
  });

  it("NOT NULL change → column modified", () => {
    const before = snapshot({
      tables: [table("public", "users", [col({ name: "email", notNull: false })])],
    });
    const after = snapshot({
      tables: [table("public", "users", [col({ name: "email", notNull: true })])],
    });
    const diff = diffCatalogs(before, after);
    expect(diff.modified.map(m => m.entityId)).toEqual(["public.users.email"]);
  });

  it("DEFAULT change → column modified", () => {
    const before = snapshot({
      tables: [table("public", "users", [col({ name: "created_at", hasDefault: false, defaultExpr: null })])],
    });
    const after = snapshot({
      tables: [table("public", "users", [col({ name: "created_at", hasDefault: true, defaultExpr: "now()" })])],
    });
    const diff = diffCatalogs(before, after);
    expect(diff.modified.map(m => m.entityId)).toEqual(["public.users.created_at"]);
  });

  it("GENERATED change → column modified", () => {
    const before = snapshot({
      tables: [table("public", "t", [col({ name: "gen", generated: "none" })])],
    });
    const after = snapshot({
      tables: [table("public", "t", [col({ name: "gen", generated: "stored" })])],
    });
    const diff = diffCatalogs(before, after);
    expect(diff.modified.map(m => m.entityId)).toEqual(["public.t.gen"]);
  });

  it("added column → column added (table unchanged)", () => {
    const before = snapshot({
      tables: [table("public", "users", [col({ name: "id" })])],
    });
    const after = snapshot({
      tables: [table("public", "users", [col({ name: "id" }), col({ name: "email" })])],
    });
    const diff = diffCatalogs(before, after);
    expect(diff.added).toEqual(["public.users.email"]);
    expect(diff.modified).toEqual([]);
    expect(diff.removed).toEqual([]);
  });

  it("dropped column → column removed", () => {
    const before = snapshot({
      tables: [table("public", "users", [col({ name: "id" }), col({ name: "email" })])],
    });
    const after = snapshot({
      tables: [table("public", "users", [col({ name: "id" })])],
    });
    const diff = diffCatalogs(before, after);
    expect(diff.removed).toEqual(["public.users.email"]);
  });
});

describe("diffCatalogs: functions", () => {
  function fn(
    schema: string,
    name: string,
    argTypes: string,
    extra: Partial<FunctionInfo> = {},
  ): FunctionInfo {
    return {
      schema,
      name,
      argTypes,
      args: [],
      returnType: "integer",
      returnTypeOid: 23,
      returnsSet: false,
      language: "plpgsql",
      isProcedure: false,
      isAggregate: false,
      isWindow: false,
      securityDefiner: false,
      strict: false,
      volatile: "volatile",
      cost: 100,
      rows: 0,
      aggInitVal: null,
      body: "",
      definition: "",
      ...extra,
    };
  }

  it("added function → added with identity-arg id", () => {
    const before = snapshot();
    const after = snapshot({ functions: [fn("public", "calc", "integer, text")] });
    const diff = diffCatalogs(before, after);
    expect(diff.added).toEqual(["public.calc(integer, text)"]);
  });

  it("dropped function → removed", () => {
    const before = snapshot({ functions: [fn("public", "calc", "integer")] });
    const after = snapshot();
    const diff = diffCatalogs(before, after);
    expect(diff.removed).toEqual(["public.calc(integer)"]);
  });

  it("return type change → function modified", () => {
    const before = snapshot({ functions: [fn("public", "calc", "integer", { returnType: "integer" })] });
    const after = snapshot({ functions: [fn("public", "calc", "integer", { returnType: "text", returnTypeOid: 25 })] });
    const diff = diffCatalogs(before, after);
    expect(diff.modified.map(m => m.entityId)).toEqual(["public.calc(integer)"]);
  });

  it("strict change → function modified", () => {
    const before = snapshot({ functions: [fn("public", "calc", "integer", { strict: false })] });
    const after = snapshot({ functions: [fn("public", "calc", "integer", { strict: true })] });
    const diff = diffCatalogs(before, after);
    expect(diff.modified.map(m => m.entityId)).toEqual(["public.calc(integer)"]);
  });

  it("volatile change → function modified", () => {
    const before = snapshot({ functions: [fn("public", "calc", "integer", { volatile: "volatile" })] });
    const after = snapshot({ functions: [fn("public", "calc", "integer", { volatile: "immutable" })] });
    const diff = diffCatalogs(before, after);
    expect(diff.modified.map(m => m.entityId)).toEqual(["public.calc(integer)"]);
  });

  it("body-only change → NOT modified (signature unchanged)", () => {
    const before = snapshot({ functions: [fn("public", "calc", "integer", { body: "old body" })] });
    const after = snapshot({ functions: [fn("public", "calc", "integer", { body: "new body", definition: "new def" })] });
    const diff = diffCatalogs(before, after);
    expect(diff.modified).toEqual([]);
  });

  it("argument default change → modified (the identity args do not carry it)", () => {
    // `pg_get_function_identity_arguments` renders `a integer` whether or not
    // the parameter declares a DEFAULT, so the entity id is unchanged and the
    // state has to say it. A default decides what a call that omits the
    // parameter passes — a query-visible property, unlike the body.
    const arg = (defaultExpr: string | null): FunctionInfo["args"] => [
      { name: "a", typeOid: 23, typeName: "integer", mode: "in", hasDefault: defaultExpr !== null, defaultExpr },
    ];
    const before = snapshot({ functions: [fn("public", "calc", "integer", { args: arg("7") })] });
    const after = snapshot({ functions: [fn("public", "calc", "integer", { args: arg("9") })] });
    const diff = diffCatalogs(before, after);
    expect(diff.modified.map(m => m.entityId)).toEqual(["public.calc(integer)"]);
  });

  it("arg type change → different id (old removed, new added)", () => {
    const before = snapshot({ functions: [fn("public", "calc", "integer")] });
    const after = snapshot({ functions: [fn("public", "calc", "text")] });
    const diff = diffCatalogs(before, after);
    expect(diff.added).toEqual(["public.calc(text)"]);
    expect(diff.removed).toEqual(["public.calc(integer)"]);
    expect(diff.modified).toEqual([]);
  });

  it("no-arg function id has empty parens", () => {
    const before = snapshot();
    const after = snapshot({ functions: [fn("public", "now", "")] });
    const diff = diffCatalogs(before, after);
    expect(diff.added).toEqual(["public.now()"]);
  });
});

describe("diffCatalogs: enums", () => {
  it("added enum → added", () => {
    const before = snapshot();
    const after = snapshot({ enums: [{ schema: "public", name: "status", values: ["a", "b"] }] });
    expect(diffCatalogs(before, after).added).toEqual(["public.status"]);
  });

  it("value added → enum modified", () => {
    const before = snapshot({ enums: [{ schema: "public", name: "status", values: ["a"] }] });
    const after = snapshot({ enums: [{ schema: "public", name: "status", values: ["a", "b"] }] });
    const diff = diffCatalogs(before, after);
    expect(diff.modified.map(m => m.entityId)).toEqual(["public.status"]);
  });

  it("value order change → enum modified", () => {
    const before = snapshot({ enums: [{ schema: "public", name: "status", values: ["a", "b"] }] });
    const after = snapshot({ enums: [{ schema: "public", name: "status", values: ["b", "a"] }] });
    expect(diffCatalogs(before, after).modified.map(m => m.entityId)).toEqual(["public.status"]);
  });
});

describe("diffCatalogs: domains", () => {
  it("base type change → domain modified", () => {
    const before = snapshot({ domains: [{ schema: "public", name: "posint", oid: 90001, baseTypeOid: 23, baseTypeName: "integer", notNull: false, default: null, check: "CHECK (value > 0)" }] });
    const after = snapshot({ domains: [{ schema: "public", name: "posint", oid: 90001, baseTypeOid: 20, baseTypeName: "bigint", notNull: false, default: null, check: "CHECK (value > 0)" }] });
    expect(diffCatalogs(before, after).modified.map(m => m.entityId)).toEqual(["public.posint"]);
  });

  it("NOT NULL change → domain modified", () => {
    const before = snapshot({ domains: [{ schema: "public", name: "posint", oid: 90001, baseTypeOid: 23, baseTypeName: "integer", notNull: false, default: null, check: null }] });
    const after = snapshot({ domains: [{ schema: "public", name: "posint", oid: 90001, baseTypeOid: 23, baseTypeName: "integer", notNull: true, default: null, check: null }] });
    expect(diffCatalogs(before, after).modified.map(m => m.entityId)).toEqual(["public.posint"]);
  });
});

describe("diffCatalogs: views + materialized views", () => {
  function view(schema: string, name: string, columns: ColumnInfo[], definition: string): ViewInfo {
    return {
      schema,
      name,
      columns,
      definition,
      writeRewrites: { beforeRow: [], insteadOf: [], insteadRules: [] },
    };
  }

  it("added view emits view + columns as added", () => {
    const before = snapshot();
    const after = snapshot({ views: [view("public", "v", [col({ name: "id" }), col({ name: "name" })], "SELECT id, name FROM t")] });
    expect(diffCatalogs(before, after).added).toEqual(["public.v", "public.v.id", "public.v.name"]);
  });

  it("definition change → view modified, columns unaffected", () => {
    const before = snapshot({ views: [view("public", "v", [col({ name: "id" })], "SELECT id FROM t")] });
    const after = snapshot({ views: [view("public", "v", [col({ name: "id" })], "SELECT id FROM t WHERE true")] });
    const diff = diffCatalogs(before, after);
    expect(diff.modified.map(m => m.entityId)).toEqual(["public.v"]);
  });

  it("view column type change → column modified, view unchanged", () => {
    const before = snapshot({ views: [view("public", "v", [col({ name: "id", typeOid: 23, typeName: "integer" })], "SELECT id FROM t")] });
    const after = snapshot({ views: [view("public", "v", [col({ name: "id", typeOid: 20, typeName: "bigint" })], "SELECT id FROM t")] });
    const diff = diffCatalogs(before, after);
    expect(diff.modified.map(m => m.entityId)).toEqual(["public.v.id"]);
  });

  it("materialized view columns are tracked like view columns", () => {
    const before = snapshot();
    const after = snapshot({ materializedViews: [view("public", "mv", [col({ name: "id" })], "SELECT id FROM t")] });
    expect(diffCatalogs(before, after).added).toEqual(["public.mv", "public.mv.id"]);
  });
});

describe("diffCatalogs: indexes", () => {
  function idx(schema: string, name: string, extra: Partial<IndexInfo> = {}): IndexInfo {
    return {
      schema, name, tableSchema: schema, tableName: "t", columns: ["id"],
      unique: false, primary: false, partial: null, method: "btree",
      definition: "CREATE INDEX ...", ...extra,
    };
  }

  it("added index → added", () => {
    expect(diffCatalogs(snapshot(), snapshot({ indexes: [idx("public", "i")] })).added)
      .toEqual(["public.i"]);
  });

  it("unique change → index modified", () => {
    const before = snapshot({ indexes: [idx("public", "i", { unique: false })] });
    const after = snapshot({ indexes: [idx("public", "i", { unique: true })] });
    expect(diffCatalogs(before, after).modified.map(m => m.entityId)).toEqual(["public.i"]);
  });
});

describe("diffCatalogs: composite types, sequences, extensions, schemas", () => {
  it("composite type attribute change → type modified", () => {
    const before = snapshot({ compositeTypes: [{ schema: "public", name: "addr", attributes: [{ name: "city", typeOid: 25, typeName: "text" }] }] });
    const after = snapshot({ compositeTypes: [{ schema: "public", name: "addr", attributes: [{ name: "city", typeOid: 23, typeName: "integer" }] }] });
    expect(diffCatalogs(before, after).modified.map(m => m.entityId)).toEqual(["public.addr"]);
  });

  it("sequence increment change → sequence modified", () => {
    const seq = (inc: bigint): SequenceInfo => ({
      schema: "public", name: "s", typeOid: 20, typeName: "bigint",
      start: 1n, increment: inc, min: 1n, max: 9223372036854775807n, cache: 1n,
      cycle: false, ownedByTable: null, ownedByColumn: null,
    });
    const before = snapshot({ sequences: [seq(1n)] });
    const after = snapshot({ sequences: [seq(2n)] });
    expect(diffCatalogs(before, after).modified.map(m => m.entityId)).toEqual(["public.s"]);
  });

  it("extension version change → extension modified (id is name, no schema)", () => {
    const ext = (version: string): ExtensionInfo => ({ name: "plpgsql_check", version, schema: "public" });
    const before = snapshot({ extensions: [ext("2.10.1")] });
    const after = snapshot({ extensions: [ext("2.11.0")] });
    expect(diffCatalogs(before, after).modified.map(m => m.entityId)).toEqual(["plpgsql_check"]);
  });

  it("schema owner change → schema modified", () => {
    const sch = (owner: string): SchemaInfo => ({ name: "public", owner });
    const before = snapshot({ schemas: [sch("a")] });
    const after = snapshot({ schemas: [sch("b")] });
    expect(diffCatalogs(before, after).modified.map(m => m.entityId)).toEqual(["public"]);
  });
});

describe("diffCatalogs: determinism + mixed", () => {
  it("output arrays are sorted by entityId", () => {
    const before = snapshot();
    const after = snapshot({
      tables: [
        table("public", "zebra", [col({ name: "id" })]),
        table("public", "alpha", [col({ name: "id" })]),
      ],
      enums: [{ schema: "public", name: "mood", values: ["x"] }],
    });
    const diff = diffCatalogs(before, after);
    expect(diff.added).toEqual([
      "public.alpha",
      "public.alpha.id",
      "public.mood",
      "public.zebra",
      "public.zebra.id",
    ]);
  });

  it("mixed add/remove/modify across entity types", () => {
    const before = snapshot({
      tables: [table("public", "old_t", [col({ name: "id" })])],
      functions: [{
        schema: "public", name: "f", argTypes: "integer", args: [],
        returnType: "integer", returnTypeOid: 23, returnsSet: false, language: "plpgsql",
        isProcedure: false, isAggregate: false, isWindow: false,
        securityDefiner: false, strict: false, volatile: "volatile",
        cost: 100, rows: 0, aggInitVal: null, body: "", definition: "",
      }],
    });
    const after = snapshot({
      tables: [table("public", "new_t", [col({ name: "id" }), col({ name: "name" })])],
      enums: [{ schema: "public", name: "status", values: ["a"] }],
    });
    const diff = diffCatalogs(before, after);
    expect(diff.added).toEqual(["public.new_t", "public.new_t.id", "public.new_t.name", "public.status"]);
    expect(diff.removed).toEqual(["public.f(integer)", "public.old_t", "public.old_t.id"]);
    expect(diff.modified).toEqual([]);
  });
});
