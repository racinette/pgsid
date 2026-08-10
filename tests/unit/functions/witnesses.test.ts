import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import {
  ALWAYS_NOT_NULL_BUILTINS,
  FIRST_ARG_BUILTINS,
  STRICT_TOTAL_BUILTINS,
  STRICT_TOTAL_BUILTIN_SIGNATURES,
  SWEPT_TOTAL_SIGNATURES,
} from "../../../src/query/nullability-walk.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";

// ---------------------------------------------------------------------------
// The per-overload witness corpus (docs/type-aware-overloads.md, step 5).
//
// A witness is a POSITIVE, checkable claim: *this overload can return NULL*.
// Absence of a witness asserts nothing — the engine's default is already
// conservative nullable — and totality is never inferred from a missing
// file. Each file names ONE pg_proc signature (`<dir>` is the function name,
// `@signature` its argument types; `to_regprocedure` is the validator, and
// exact signatures are unique by construction), a `@null` refutation, and a
// `@value` control. The control is what stops a witness passing for a
// boring reason — a malformed expression or the wrong overload resolved —
// and it is the liveness bar: a witness that stops witnessing FAILS rather
// than passes, since every other assertion here is a negative.
//
// The corpus is the durable home of the evidence the sweeps and audits
// produced by removal: every name that left a totality table has its
// removing overload witnessed here, and assertion four closes the loop — a
// witnessed signature may not be claimed total anywhere.
//
// Directories declaring a schema.sql get their own PGlite; everything else
// shares one (state-major, docs/witness-coverage.md's rule).
// ---------------------------------------------------------------------------

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * `name(arg,arg)` in the spelling the claim tables and the signature capture
 * use. `@signature` is written the way `to_regprocedure` wants it — `text,
 * timestamp without time zone`, with the spaces — so both sides need
 * normalising before either can be compared to a table key. Without it the
 * loop-closer below silently passed for every MULTI-argument witness (it
 * could only ever match a one-argument signature), which is exactly the case
 * it exists to catch.
 */
const sigKey = (fn: string, args: string): string =>
  `${fn}(${args.split(",").map(a => a.trim()).join(",")})`;

interface Witness {
  fn: string;
  slug: string;
  signature: string;
  nullExpr: string;
  valueExpr: string;
  schemaDir: string | null;
}

function parseWitness(fn: string, slug: string, text: string, schemaDir: string | null): Witness {
  /**
   * `@signature` may be EMPTY — a zero-argument function's argument list is
   * — so its pattern ends the line rather than demanding a character. The
   * greedy form was tried and is a trap: `\s+` crosses the newline, so
   * `-- @signature` alone captured the FOLLOWING directive's text and
   * to_regprocedure reported a syntax error from a file that looked right.
   * `@null` and `@value` keep the strict form: an empty expression there is
   * a broken witness, not a legitimate one.
   */
  const directive = (name: string, mayBeEmpty = false): string => {
    const m = new RegExp(`^--\\s*@${name}${mayBeEmpty ? "[ \\t]*(.*)" : "\\s+(.+)"}$`, "m").exec(text);
    if (!m) throw new Error(`${fn}/${slug}: missing @${name}`);
    return m[1]!.trim();
  };
  return {
    fn,
    slug,
    signature: directive("signature", true),
    nullExpr: directive("null"),
    valueExpr: directive("value"),
    schemaDir,
  };
}

const witnesses: Witness[] = [];
for (const dir of readdirSync(HERE)) {
  const dirPath = join(HERE, dir);
  if (!statSync(dirPath).isDirectory()) continue;
  const schemaDir = existsSync(join(dirPath, "schema.sql")) ? dirPath : null;
  for (const file of readdirSync(dirPath)) {
    if (!file.endsWith(".sql") || file === "schema.sql") continue;
    witnesses.push(
      parseWitness(dir, file, readFileSync(join(dirPath, file), "utf8"), schemaDir),
    );
  }
}

let shared: PGlite;
const perSchema = new Map<string, PGlite>();

async function dbFor(w: Witness): Promise<PGlite> {
  if (w.schemaDir === null) return shared;
  let db = perSchema.get(w.schemaDir);
  if (!db) {
    db = await PGlite.create();
    await db.exec(readFileSync(join(w.schemaDir, "schema.sql"), "utf8"));
    perSchema.set(w.schemaDir, db);
  }
  return db;
}

/** Evaluate a witness expression: a full SELECT runs as written; anything
 * else is wrapped. First row, first column. */
async function evaluate(db: PGlite, expr: string): Promise<unknown> {
  const sql = /^\s*select\b/i.test(expr) ? expr : `SELECT (${expr}) AS v`;
  const r = await db.query<Record<string, unknown>>(sql);
  const row = r.rows[0];
  if (row === undefined) throw new Error(`no row: ${expr}`);
  return Object.values(row)[0];
}

describe("per-overload NULL witnesses", () => {
  beforeAll(async () => {
    shared = await PGlite.create();
  });
  afterAll(async () => {
    await shared.close();
    for (const db of perSchema.values()) await db.close();
  });

  it("holds at least the removal evidence", () => {
    expect(witnesses.length).toBeGreaterThan(0);
  });

  it("every @signature resolves to exactly one pg_proc entry", async () => {
    // `to_regprocedure` answers null for an unknown or ambiguous spelling,
    // and an exact signature is unique by construction — so a removed or
    // re-typed overload fails loudly on a PostgreSQL upgrade instead of
    // silently testing nothing.
    const unresolved: string[] = [];
    for (const w of witnesses) {
      const r = await shared.query<{ p: string | null }>(
        `SELECT to_regprocedure($1)::text AS p`,
        [`${w.fn}(${w.signature})`],
      );
      if (r.rows[0]!.p === null) unresolved.push(`${w.fn}(${w.signature}) [${w.slug}]`);
    }
    expect(unresolved).toEqual([]);
  });

  for (const w of witnesses) {
    describe(`${w.fn}(${w.signature}) — ${w.slug}`, () => {
      it("the witness returns NULL", async () => {
        expect(await evaluate(await dbFor(w), w.nullExpr)).toBeNull();
      });
      it("the control returns a value", async () => {
        expect(await evaluate(await dbFor(w), w.valueExpr)).not.toBeNull();
      });
    });
  }

  it("no witnessed signature is claimed total anywhere", () => {
    // The loop-closer: a witness refutes totality for its signature, so the
    // signature may appear neither via its NAME in a totality table nor as
    // a signature-keyed addition. (The operator side's PARTIAL_OVERLOADS
    // "kept with a recorded reason" mechanism has no function instance yet;
    // when one appears, this is where its reason is checked.)
    const nameTables = new Set([
      ...ALWAYS_NOT_NULL_BUILTINS, ...FIRST_ARG_BUILTINS, ...STRICT_TOTAL_BUILTINS,
    ]);
    const offenders: string[] = [];
    for (const w of witnesses) {
      if (nameTables.has(w.fn)) {
        offenders.push(`${w.fn}(${w.signature}) — the NAME is in a totality table`);
      }
      const key = sigKey(w.fn, w.signature);
      if (STRICT_TOTAL_BUILTIN_SIGNATURES.has(key)) {
        offenders.push(`${w.fn}(${w.signature}) — claimed by the signature additions`);
      }
      if (SWEPT_TOTAL_SIGNATURES.has(key)) {
        offenders.push(`${w.fn}(${w.signature}) — claimed by the cluster sweep`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("reports coverage over the captured claim rows", async () => {
    // Assertion five is a REPORT, not a ratchet: how much of the captured
    // claim surface carries evidence either way. A claimed row's evidence
    // is the totality probe (it executes every claimed signature); a
    // witnessed row's is this corpus; the remainder is the honest gap the
    // charter's "who makes the 235 verdicts" question still owns.
    const s = await snapshotCatalog(shared);
    const witnessed = new Set(witnesses.map(w => sigKey(w.fn, w.signature)));
    const fnRows = s.builtinFunctionSignatures.filter(r => r.kind === "f");
    const witnessedRows = fnRows.filter(r => witnessed.has(sigKey(r.name, r.args.join(","))));
    console.log(
      `\nwitness corpus: ${witnesses.length} witnesses over ` +
        `${new Set(witnesses.map(w => w.fn)).size} names; ` +
        `${witnessedRows.length} of the capture's ${fnRows.length} scalar rows ` +
        `carry a NULL witness (the probed totality tables carry the rest of ` +
        `the claimed surface; unclaimed rows need no verdict).`,
    );
    expect(witnessedRows.length).toBeGreaterThan(0);
  });
});
