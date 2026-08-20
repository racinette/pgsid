import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";
import { readingsFor, oracleType, unionContains, wireRendering } from "./type-unions.js";
import { UNION_SCHEMA, UNION_CASES, CONSISTENCY_CASES } from "./type-union-cases.js";

// ---------------------------------------------------------------------------
// THE TYPE-UNION SUITE.
//
// `operandTypeSet` answers "what could this expression be" as a SET, and
// every elimination downstream is decided on it: which operator overload
// survives, which function signature is dispatched, whether a totality
// verdict may be read. Until now the sets were observed only INDIRECTLY,
// through the nullability verdicts they produce — so a set could be wrong,
// or absent, and only surface as a claim that quietly went nullable.
//
// The governing invariant is CONTAINMENT, not equality. A union is a
// superset by construction, so what PostgreSQL actually resolves the
// expression to must be a member. A set that omits the real type is how a
// wrong elimination happens, and a wrong elimination is how the walk claims
// notNull for an expression that answers NULL — the failure that reached
// production once already on the operator side
// (`bare-name-gates-red.test.ts`).
//
// The oracle is a ZERO-ROW query. `SELECT … WHERE false` still reports every
// output column's resolved type in its RowDescription, so asking PostgreSQL
// costs one round trip and touches no data — which is what makes sweeping
// the whole fixture corpus affordable.
//
// Three things are asserted, in descending order of importance:
//
//   1. CONTAINMENT, over the purpose-built cases AND over every expression
//      the fixture corpus produces. A hard failure.
//   2. The EXACT sets, for the purpose-built cases. These record today's
//      precision, so a change in either direction is a visible diff rather
//      than a silent drift. They are expected to move as the engine
//      improves, and moving them is a deliberate edit.
//   3. CONSISTENCY: one expression, one reading, within a statement.
//      Currently RED — see the test.
//
// The census is PRINTED, not pinned. Pinned counts would make every
// precision improvement a test-maintenance chore; the containment invariant
// is what must never regress.
// ---------------------------------------------------------------------------

describe("type unions", () => {
  let pg: PGlite;
  let catalog: NullabilityCatalog;
  let fixturePg: PGlite;
  let fixtureCatalog: NullabilityCatalog;

  beforeAll(async () => {
    pg = await PGlite.create();
    await pg.exec(UNION_SCHEMA);
    catalog = await buildNullabilityCatalog(await snapshotCatalog(pg));

    fixturePg = await PGlite.create({ extensions: { plpgsql_check } });
    await fixturePg.exec("CREATE EXTENSION plpgsql_check;");
    await fixturePg.exec(readFileSync("tests/unit/query/fixtures/schema.sql", "utf8"));
    fixtureCatalog = await buildNullabilityCatalog(await snapshotCatalog(fixturePg));
  }, 300_000);

  afterAll(async () => {
    if (!pg.closed) await pg.close();
    if (!fixturePg.closed) await fixturePg.close();
  });

  // -------------------------------------------------------------------------
  // 1. Containment — the invariant.
  // -------------------------------------------------------------------------

  describe("containment: the real type is always a member", () => {
    for (const [group, cases] of Object.entries(UNION_CASES)) {
      it(group, async () => {
        for (const { sql, expect: expected } of cases) {
          const readings = await readingsFor(sql, catalog);
          for (const probe of Object.keys(expected)) {
            const rec = readings.get(probe);
            expect(rec, `${sql}\n  no reading for \`${probe}\``).toBeDefined();
            const oracle = await oracleType(pg, sql, probe);
            if (oracle === null) continue; // PostgreSQL would not take the probe
            for (const set of rec!.sets) {
              if (set === null) continue; // no claim is always sound
              const ok = await unionContains(pg, set, oracle);
              expect(
                ok,
                `${sql}\n  \`${probe}\` engine [${set.join(", ")}] omits postgres ${oracle}`,
              ).toBe(true);
            }
          }
        }
      });
    }

    it("holds over every expression the fixture corpus produces", async () => {
      const dir = join(__dirname, "fixtures");
      const files = readdirSync(dir)
        .filter(f => f.endsWith(".sql") && f !== "schema.sql")
        .sort();

      let readings = 0;
      let noClaim = 0;
      let singleton = 0;
      let wide = 0;
      let polymorphic = 0;
      let unprobeable = 0;
      const violations: string[] = [];

      for (const file of files) {
        const sql = readFileSync(join(dir, file), "utf8");
        let byExpr;
        try {
          byExpr = await readingsFor(sql, fixtureCatalog);
        } catch {
          continue; // a statement the walk refuses; not this suite's subject
        }
        for (const [probe, rec] of byExpr) {
          if (/\$\d/.test(probe)) continue; // parameters need bindings
          const oracle = await oracleType(fixturePg, sql, probe);
          for (const set of rec.sets) {
            readings++;
            if (set === null) {
              noClaim++;
              continue;
            }
            if (set.length === 1) singleton++;
            else wide++;
            for (const member of set) {
              if ((await wireRendering(fixturePg, member)) === "*") {
                polymorphic++;
                break;
              }
            }
            if (oracle === null) {
              unprobeable++;
              continue;
            }
            if (!(await unionContains(fixturePg, set, oracle))) {
              violations.push(
                `${file}: \`${probe}\` engine [${set.join(", ")}] omits postgres ${oracle}`,
              );
            }
          }
        }
      }

      // eslint-disable-next-line no-console
      console.log(
        [
          "",
          "type-union census over the fixture corpus",
          `  readings:              ${readings}`,
          `    no claim (null):     ${noClaim}`,
          `    singleton:           ${singleton}`,
          `    multi-member:        ${wide}`,
          `    carrying a pseudo:   ${polymorphic}`,
          `  not probeable by pg:   ${unprobeable}  (inner scopes; the probe is spliced`,
          "                                into the TOP-LEVEL target list, so an expression",
          "                                belonging to a CTE interior cannot be asked about)",
          `  CONTAINMENT VIOLATIONS: ${violations.length}`,
          ...violations.slice(0, 40).map(v => `    ${v}`),
        ].join("\n"),
      );

      expect(violations, violations.slice(0, 10).join("\n")).toHaveLength(0);
    }, 600_000);
  });

  // -------------------------------------------------------------------------
  // 2. The exact sets — today's precision, recorded.
  // -------------------------------------------------------------------------

  describe("the sets themselves", () => {
    for (const [group, cases] of Object.entries(UNION_CASES)) {
      it(group, async () => {
        for (const { sql, expect: expected } of cases) {
          const readings = await readingsFor(sql, catalog);
          for (const [probe, want] of Object.entries(expected)) {
            const rec = readings.get(probe);
            expect(
              rec,
              `${sql}\n  no reading for \`${probe}\` — keys: ${[...readings.keys()].join(" ; ")}`,
            ).toBeDefined();
            for (const got of rec!.sets) {
              expect(
                got === null ? null : [...got].sort(),
                `${sql}\n  \`${probe}\``,
              ).toEqual(want === null ? null : [...want].sort());
            }
          }
        }
      });
    }
  });

  // -------------------------------------------------------------------------
  // 3. Consistency — RED.
  // -------------------------------------------------------------------------

  describe("consistency", () => {
    it("one expression gets one reading, wherever it is read", async () => {
      // Written RED. A column read in the target list typed; the SAME column
      // read in a JOIN or WHERE predicate did not, because
      // `promotionOperatorIsStrict` declared `scope: Scope | null = null` and
      // neither call site passed it — so `renderedTypeOfExpr` returned on its
      // first line and every predicate operand read untyped, base tables and
      // CTEs alike. That asymmetry is what this test caught.
      //
      // Green since the scope was threaded through `predicateProvesNonNull`
      // and `exprStrictlyForces` (2026-08-20). Every entry point already held
      // a scope; it was captured in a closure and never passed down.
      for (const { sql, expr } of CONSISTENCY_CASES) {
        const readings = await readingsFor(sql, catalog);
        const rec = readings.get(expr);
        expect(rec, `${sql}\n  no reading for \`${expr}\``).toBeDefined();
        const distinct = new Set(
          rec!.sets.map(s => (s === null ? "null" : [...s].sort().join("|"))),
        );
        expect(
          [...distinct],
          `${sql}\n  \`${expr}\` was read ${rec!.sets.length} times, disagreeing`,
        ).toHaveLength(1);
      }
    });
  });
});
