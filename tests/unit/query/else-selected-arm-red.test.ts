import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferNullability } from "../../../src/query/nullability-walk.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// The RED SUITE for an ELSE-SELECTED generated CASE arm (register item 2a).
//
// Arm exclusion already derives from a generated-column equality: TRUE
// `verdict = 'fraud'` rules out every arm whose literal result is provably
// distinct, and a single surviving WHEN arm contributes its condition. The
// OR-fact form is built too — `verdict IN ('a','b')` joins two arms'
// conditions by the intersection rule.
//
// The ELSE is refused outright: `selectedArmCondition` returns null the
// moment the ELSE could be the producing arm, so nothing is derived at all.
// The reason is 3VL necessity — "ELSE runs
// on FALSE *or NULL* conditions, and 3VL grants no facts from 'not TRUE'".
//
// **That is true of a condition that can evaluate NULL, and false of one that
// cannot.** `fraud_score >= 75` over a nullable column is the motivating
// shape and genuinely derives nothing. `status = 'a'` over a NOT NULL column
// is TOTAL, so not-TRUE IS FALSE — and `colKnownNonNull` already reads a
// FALSE strict comparison as pinning its operands. The distinction is the
// whole of this suite: the target and the first boundary are the same
// statement over columns that differ only in nullability.
// ---------------------------------------------------------------------------

const DDL = `
  CREATE TABLE tk (
    id     integer PRIMARY KEY,
    status text NOT NULL,
    note   text,
    tag    text GENERATED ALWAYS AS (
             CASE WHEN status = 'a' THEN 'x'
                  WHEN status = 'b' THEN 'y'
                  ELSE 'z' END) STORED,
    CONSTRAINT tk_note CHECK (status = 'a' OR status = 'b' OR note IS NOT NULL)
  );

  -- The 3VL twin. \`score\` is NULLABLE, so \`score >= 75\` can evaluate NULL
  -- and the ELSE running proves nothing about it — which is exactly the
  -- reason the docs give, correct for this table and not for the one above.
  CREATE TABLE sk (
    id    integer PRIMARY KEY,
    score integer,
    memo  text,
    grade text GENERATED ALWAYS AS (
            CASE WHEN score >= 75 THEN 'hi'
                 ELSE 'lo' END) STORED,
    CONSTRAINT sk_memo CHECK (score >= 75 OR memo IS NOT NULL)
  );

  -- The MULTI-ATOM arm. \`NOT (status = 'a' AND flag)\` does not imply
  -- \`status <> 'a'\` — the row may have taken the ELSE on \`flag\` alone — so
  -- the ELSE derives nothing here however total both conjuncts are.
  CREATE TABLE mk (
    id     integer PRIMARY KEY,
    status text NOT NULL,
    flag   boolean NOT NULL,
    note   text,
    tag    text GENERATED ALWAYS AS (
             CASE WHEN status = 'a' AND flag THEN 'x' ELSE 'z' END) STORED,
    CONSTRAINT mk_note CHECK (status = 'a' OR note IS NOT NULL)
  );

  -- The AMBIGUOUS PRODUCER. A WHEN arm and the ELSE both yield 'z', so a row
  -- with that tag has two possible explanations and neither arm's condition
  -- is known.
  CREATE TABLE ak (
    id     integer PRIMARY KEY,
    status text NOT NULL,
    note   text,
    tag    text GENERATED ALWAYS AS (
             CASE WHEN status = 'a' THEN 'z'
                  WHEN status = 'b' THEN 'y'
                  ELSE 'z' END) STORED,
    CONSTRAINT ak_note CHECK (status = 'a' OR note IS NOT NULL)
  );`;

/** The ELSE ran, so status is neither 'a' nor 'b' — both total comparisons —
 *  and the CHECK's third disjunct is the only survivor. */
const ELSE_TOTAL = `SELECT note FROM tk WHERE tag = 'z'`;

/** A WHEN arm ran and the CHECK is satisfied by its own disjunct. */
const WHEN_ARM = `SELECT note FROM tk WHERE tag = 'x'`;

/** The ELSE ran and its condition is NOT total. Nothing is derivable. */
const ELSE_PARTIAL = `SELECT memo FROM sk WHERE grade = 'lo'`;

let pg: PGlite;
let catalog: NullabilityCatalog;

async function claim(sql: string): Promise<boolean> {
  const stmt = (await parseSql(sql)).stmts![0]!.stmt!;
  const cols = await inferNullability(stmt, catalog, {
    evaluate: async q => (await pg.query<Record<string, unknown>>(q)).rows[0],
  });
  return cols[0]!.notNull;
}

/** Whether PostgreSQL REFUSES to store a row that would falsify the claim. */
async function refuses(sql: string): Promise<string | null> {
  try {
    await pg.exec(sql);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

beforeAll(async () => {
  pg = await PGlite.create();
  await pg.exec(DDL);
  await pg.exec(`
    INSERT INTO tk (id, status, note) VALUES (1, 'a', NULL), (2, 'c', 'filled');
    INSERT INTO sk (id, score, memo) VALUES (1, 90, NULL), (2, NULL, 'why');
    -- The witnesses. Both took the ELSE with a NULL note, which is exactly
    -- what the two guards refuse to claim against.
    INSERT INTO mk (id, status, flag, note) VALUES (1, 'a', false, NULL), (2, 'c', true, 'filled');
    INSERT INTO ak (id, status, note) VALUES (1, 'a', NULL), (2, 'c', 'filled');`);
  catalog = await buildNullabilityCatalog(await snapshotCatalog(pg), { searchPath: ["public"] });
}, 120_000);

afterAll(async () => {
  if (pg && !pg.closed) await pg.close();
});

describe("ELSE-selected arm — the premise", () => {
  it("PostgreSQL cannot produce the counterexample", async () => {
    // The adjudication. `status = 'c'` routes to the ELSE, and the CHECK then
    // demands a note — so no row with tag 'z' has a NULL one, ever.
    expect(await refuses(`INSERT INTO tk (id, status, note) VALUES (3, 'c', NULL)`)).toMatch(
      /tk_note/,
    );
    // ...and the same row IS storable through a WHEN arm, which is what makes
    // the control below a real nullable rather than an empty relation.
    expect(await refuses(`INSERT INTO tk (id, status, note) VALUES (4, 'b', NULL)`)).toBeNull();
  });

  it("and the 3VL twin genuinely admits it", async () => {
    // A NULL score routes to the ELSE and satisfies `score >= 75` as NULL —
    // not TRUE, so the CHECK's first disjunct is not FALSE, and a NULL memo
    // goes in. Nothing here is derivable, and PostgreSQL says so.
    expect(await refuses(`INSERT INTO sk (id, score, memo) VALUES (3, NULL, NULL)`)).toBeNull();
  });
});

describe("ELSE-selected arm — target", () => {
  it("an ELSE over TOTAL conditions carries their negations", async () => {
    // Flipped from `it.fails` by `entryNotNullEvidence`. The producer landed
    // first and this stayed red on its INPUT: the kernel reads no catalog
    // flags, so `status` being NOT NULL was invisible to the totality gate
    // until the walk started supplying it as an ordinary evidence predicate.
    expect(await claim(ELSE_TOTAL)).toBe(true);
  });

  it("...and the same holds with the pin written out by hand", async () => {
    // `status IS NOT NULL` spelled in the WHERE. Redundant now, and it is
    // what proved the PRODUCER correct while its input was still missing —
    // the two halves were separable and were separated.
    expect(await claim(`SELECT note FROM tk WHERE tag = 'z' AND status IS NOT NULL`)).toBe(true);
  });
});

describe("ELSE-selected arm — boundary guards", () => {
  it("an ELSE over a condition that can be NULL still derives nothing", async () => {
    // The 3VL case the docs describe, and the reason the totality gate is not
    // optional: without it this column would be claimed and PostgreSQL has
    // the row to refute it.
    expect(await claim(ELSE_PARTIAL)).toBe(false);
  });

  it("a WHEN-selected arm is unaffected", async () => {
    expect(await claim(WHEN_ARM)).toBe(false);
  });

  it("a MULTI-ATOM arm condition derives nothing from the ELSE", async () => {
    // Coverage said this guard had never fired: no fixture carried a
    // conjunctive arm condition. not-TRUE of `a AND b` leaves both conjuncts
    // live, so the ELSE proves nothing about `status` — and the row that says
    // so is `('a', false, NULL)`, which reaches the ELSE through `flag`
    // while satisfying the CHECK's first disjunct.
    expect(await claim(`SELECT note FROM mk WHERE tag = 'z'`)).toBe(false);
    const r = await pg.query<{ note: string | null }>(`SELECT note FROM mk WHERE tag = 'z'`);
    expect(r.rows.some(x => x.note === null)).toBe(true);
  });

  it("an ELSE sharing a literal with a WHEN arm derives nothing", async () => {
    // The other never-fired guard. Arm one and the ELSE both yield 'z', so a
    // row carrying that tag has two possible producers and neither arm's
    // condition is known to have held. Witnessed by ('a', NULL): it took the
    // WHEN arm, not the ELSE.
    expect(await claim(`SELECT note FROM ak WHERE tag = 'z'`)).toBe(false);
    const r = await pg.query<{ note: string | null }>(`SELECT note FROM ak WHERE tag = 'z'`);
    expect(r.rows.some(x => x.note === null)).toBe(true);
  });
});
