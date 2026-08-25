import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import type { OverloadCatalog } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// The elimination rule, tested in isolation —
// the walk does not consult these accessors yet. Every clause is asserted
// from BOTH sides, because the property under test is directional:
// `mayCoerceImplicitly` answers false only on CERTAINTY, and a false
// elimination is the unsoundness the governing invariant forbids, while a
// generous true merely retains a candidate. The behavioural ground truth for
// each case is overload-resolution-mechanism.test.ts and the charter's
// measured sections; the catalog data is the environment captures pinned in
// tests/unit/catalog/snapshot.test.ts.
// ---------------------------------------------------------------------------

let pg: PGlite;
let catalog: OverloadCatalog;

beforeAll(async () => {
  pg = await PGlite.create();
  await pg.exec(`
    CREATE TYPE mood AS ENUM ('a', 'b');
    CREATE TYPE pt AS (x integer, y integer);
    CREATE TYPE numr AS RANGE (subtype = numeric);
    CREATE DOMAIN dint AS integer;
    CREATE DOMAIN dint2 AS dint;
    CREATE DOMAIN dvc AS varchar(5);
    CREATE DOMAIN denum AS mood;
    CREATE DOMAIN darr AS integer[];
  `);
  catalog = await buildNullabilityCatalog(await snapshotCatalog(pg));
});

afterAll(async () => {
  await pg.close();
});

describe("resolveCanonicalTypeName", () => {
  it("resolves domains to their bases, recursively and through arrays", () => {
    expect(catalog.resolveCanonicalTypeName("public.dint")).toBe("integer");
    expect(catalog.resolveCanonicalTypeName("public.dint2")).toBe("integer");
    // Typmod never appears: the snapshot renders bases with format_type(oid, null).
    expect(catalog.resolveCanonicalTypeName("public.dvc")).toBe("character varying");
    expect(catalog.resolveCanonicalTypeName("public.darr")).toBe("integer[]");
    expect(catalog.resolveCanonicalTypeName("public.dint[]")).toBe("integer[]");
    // Non-domains pass through untouched.
    expect(catalog.resolveCanonicalTypeName("text")).toBe("text");
    expect(catalog.resolveCanonicalTypeName("public.mood")).toBe("public.mood");
  });
});

describe("mayCoerceImplicitly — retention side", () => {
  it("keeps identity and domain-base identity, both directions", () => {
    expect(catalog.mayCoerceImplicitly("text", "text")).toBe(true);
    // A domain argument reaches a base parameter and vice versa (measured:
    // gd/hd in the mechanism suite).
    expect(catalog.mayCoerceImplicitly("public.dint", "integer")).toBe(true);
    expect(catalog.mayCoerceImplicitly("integer", "public.dint")).toBe(true);
    expect(catalog.mayCoerceImplicitly("public.dint2", "integer")).toBe(true);
  });

  it("keeps unknown against anything", () => {
    expect(catalog.mayCoerceImplicitly("unknown", "timestamp without time zone")).toBe(true);
    expect(catalog.mayCoerceImplicitly("unknown", "public.mood")).toBe(true);
  });

  it("keeps the captured implicit casts, through canonicalisation", () => {
    expect(catalog.mayCoerceImplicitly("bigint", "numeric")).toBe(true);
    expect(catalog.mayCoerceImplicitly("character varying", "text")).toBe(true);
    // The domain over varchar rides the same edge after the smash.
    expect(catalog.mayCoerceImplicitly("public.dvc", "text")).toBe(true);
  });

  it("keeps the polymorphic families on their admitted structures", () => {
    expect(catalog.mayCoerceImplicitly("integer[]", "anyarray")).toBe(true);
    expect(catalog.mayCoerceImplicitly("integer", "anynonarray")).toBe(true);
    expect(catalog.mayCoerceImplicitly("int4range", "anyrange")).toBe(true);
    expect(catalog.mayCoerceImplicitly("int4multirange", "anymultirange")).toBe(true);
    expect(catalog.mayCoerceImplicitly("public.mood", "anyenum")).toBe(true);
    expect(catalog.mayCoerceImplicitly("integer", "anyelement")).toBe(true);
    expect(catalog.mayCoerceImplicitly("integer", '"any"')).toBe(true);
    expect(catalog.mayCoerceImplicitly("integer", "anycompatible")).toBe(true);
  });

  it("keeps a domain over an enum at anyenum — the recorded over-retention", () => {
    // PostgreSQL REFUSES this (measured: denum = denum is "operator does
    // not exist"), and admitting it anyway is safe: retention can only keep
    // a candidate PostgreSQL discarded, never eliminate one it ran.
    expect(catalog.mayCoerceImplicitly("public.denum", "anyenum")).toBe(true);
  });

  it("keeps array pairs whose elements may coerce", () => {
    expect(catalog.mayCoerceImplicitly("character varying[]", "text[]")).toBe(true);
    expect(catalog.mayCoerceImplicitly("public.dint[]", "integer[]")).toBe(true);
  });

  it("keeps anything this catalog cannot fully explain", () => {
    // A user RANGE type reaches no user capture (enums, composites,
    // domains) and no builtin kind — the generous default is what makes an
    // incomplete model safe to ship.
    expect(catalog.mayCoerceImplicitly("public.numr", "anyrange")).toBe(true);
    expect(catalog.mayCoerceImplicitly("public.numr", "integer")).toBe(true);
    expect(catalog.mayCoerceImplicitly("integer", "public.numr")).toBe(true);
  });
});

describe("mayCoerceImplicitly — elimination side", () => {
  it("eliminates where no implicit route exists between understood types", () => {
    expect(catalog.mayCoerceImplicitly("text", "integer")).toBe(false);
    expect(catalog.mayCoerceImplicitly("integer", "text")).toBe(false);
    expect(catalog.mayCoerceImplicitly("public.mood", "text")).toBe(false);
    expect(catalog.mayCoerceImplicitly("integer[]", "text[]")).toBe(false);
  });

  it("eliminates assignment and explicit casts — IMPLICIT only, measured", () => {
    // bigint → integer is assignment, boolean → integer is explicit; the
    // charter's f(int,int)/f(numeric,numeric) worked example rests on the
    // first, and `f(bigint) REJECTS true` on the second.
    expect(catalog.mayCoerceImplicitly("bigint", "integer")).toBe(false);
    expect(catalog.mayCoerceImplicitly("boolean", "integer")).toBe(false);
  });

  it("does not chain casts — no transitivity, measured", () => {
    // boolean → integer exists (explicit) and integer → numeric (implicit);
    // PostgreSQL still rejects boolean at a numeric parameter.
    expect(catalog.mayCoerceImplicitly("boolean", "numeric")).toBe(false);
  });

  it("eliminates on the polymorphic predicate's certain refusals", () => {
    expect(catalog.mayCoerceImplicitly("integer", "anyarray")).toBe(false);
    expect(catalog.mayCoerceImplicitly("integer[]", "anynonarray")).toBe(false);
    expect(catalog.mayCoerceImplicitly("integer", "anyrange")).toBe(false);
    expect(catalog.mayCoerceImplicitly("text", "anyenum")).toBe(false);
    expect(catalog.mayCoerceImplicitly("int4range", "anymultirange")).toBe(false);
  });
});

describe("builtin signature accessors", () => {
  it("answers for bare and pg_catalog-qualified references only", () => {
    expect(catalog.resolveBuiltinOperatorSignatures(undefined, "+").length).toBeGreaterThan(0);
    expect(catalog.resolveBuiltinOperatorSignatures("pg_catalog", "+").length).toBeGreaterThan(0);
    expect(catalog.resolveBuiltinOperatorSignatures("public", "+")).toEqual([]);
    expect(catalog.resolveBuiltinFunctionSignatures(undefined, "rank")).toHaveLength(2);
    expect(catalog.resolveBuiltinFunctionSignatures(undefined, "no_such_name")).toEqual([]);
  });
});

describe("resolveBinaryCoercionTargets", () => {
  it("exposes the canonicalisation images, and nothing for unrecognised names", () => {
    expect(catalog.resolveBinaryCoercionTargets("character varying")).toContain("text");
    expect(catalog.resolveBinaryCoercionTargets("text")).toContain("character varying");
    expect(catalog.resolveBinaryCoercionTargets("public.mood")).toEqual([]);
  });
});
