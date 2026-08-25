import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import {
  NON_NULL_OVER_NONEMPTY_AGGREGATES,
  NEVER_NULL_WINDOW_SIGNATURES,
  STRICT_TOTAL_WINDOW_SIGNATURES,
  ALWAYS_NOT_NULL_BUILTINS,
  FIRST_ARG_BUILTINS,
  STRICT_TOTAL_BUILTINS,
} from "../../../src/query/nullability-walk.js";
import { TOTAL_OPERATORS, STRICT_OPERATORS } from "../../../src/query/operators.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import type { BuiltinFunctionSignature } from "../../../src/catalog/types.js";

// ---------------------------------------------------------------------------
// The curated name tables, held to pg_catalog.
//
// Eight hand-curated tables remained in
// the walk, and no test asserted what should be *in* one — so a missing entry
// was invisible until a sweep happened to write the query. That yielded three
// sweeps running (ALWAYS_NOT_NULL, then STRICT_TOTAL_BUILTINS, then
// BUILTIN_SRF_NAMES) and once more when this suite was written: AGGREGATE_NAMES
// had drifted in three directions at once and is now gone, replaced by
// `CatalogSnapshot.builtinAggregateFunctions`. That is the rule the document
// states — wherever PostgreSQL records the property, the table should not
// exist; where it must, a test holds it to the catalog.
//
// What the catalog can and cannot answer, because conflating the two is how a
// suite like this overclaims:
//
//   IT CAN answer KIND. `prokind` distinguishes plain functions, aggregates
//   and window functions; `pg_aggregate.aggkind` distinguishes normal,
//   ordered-set and hypothetical-set aggregates. Three tables are exactly a
//   catalog predicate and are asserted as EQUAL to it — if PostgreSQL grows a
//   fourth hypothetical-set aggregate, this suite fails.
//
//   IT CANNOT answer TOTALITY. `proisstrict` is strictness — NULL in, NULL
//   out — and 2548 of PG18's 2726 builtin names carry it, so it is no proxy
//   for "never returns NULL for non-null arguments". That property lives only
//   in the C implementations, a scanner for it was built and discarded,
//   and the four
//   totality tables are therefore held only to EXISTENCE here. Probing them
//   by execution is item 3.
//
// Existence is worth asserting on its own: it is what convicted `cluster` and
// `listagg` (no such function), `trim` (the grammar rewrites every spelling to
// `pg_catalog.btrim` before a parse tree exists) and `!=` (the lexer converts
// it to `<>`). A name PostgreSQL does not have is dead weight that reads as
// coverage.
//
// The signature counts are printed rather than asserted. They are the premise
// of the narrowing: a curated entry keys on a NAME while
// PostgreSQL keys on a SIGNATURE, which is how `lower`/`upper` carried a total
// `(text)` form and a NULL-returning `(anyrange)` form under one entry.
// ---------------------------------------------------------------------------

interface CatalogFn {
  /** Distinct `prokind` values across every overload of the name. */
  kinds: Set<string>;
  /** Distinct `pg_aggregate.aggkind` values, for the aggregate overloads. */
  aggKinds: Set<string>;
  /** How many pg_catalog entries share this name. */
  signatures: number;
}

describe("curated name tables vs pg_catalog", () => {
  let pg: PGlite;
  let fns: Map<string, CatalogFn>;
  let operators: Map<string, number>;
  /** pg_catalog names by the property the catalog records directly. */
  let byKind: Map<string, Set<string>>;
  let strictBuiltins: Set<string>;
  /** The signature capture, for the assertions that hold IT to the catalog. */
  let capturedSignatures: BuiltinFunctionSignature[];
  /** Every `prokind = 'w'` row, keyed the way the window tables key. */
  let windowSignatures: Set<string>;

  beforeAll(async () => {
    pg = await PGlite.create();
    capturedSignatures = (await snapshotCatalog(pg)).builtinFunctionSignatures;
    const rows = (
      await pg.query<{ name: string; kinds: string; aggkinds: string | null; n: number }>(
        `SELECT p.proname AS name,
                string_agg(DISTINCT p.prokind::text, '')  AS kinds,
                string_agg(DISTINCT a.aggkind::text, '')  AS aggkinds,
                count(*)::int                             AS n
           FROM pg_proc p
           JOIN pg_namespace ns ON ns.oid = p.pronamespace
           LEFT JOIN pg_aggregate a ON a.aggfnoid = p.oid
          WHERE ns.nspname = 'pg_catalog'
          GROUP BY p.proname;`,
      )
    ).rows;
    fns = new Map(
      rows.map(r => [
        r.name,
        {
          kinds: new Set(r.kinds.split("")),
          aggKinds: new Set((r.aggkinds ?? "").split("").filter(Boolean)),
          signatures: r.n,
        },
      ]),
    );

    windowSignatures = new Set(
      (
        await pg.query<{ key: string }>(
          `SELECT p.proname || '(' ||
                  COALESCE((SELECT string_agg(format_type(t, null), ',' ORDER BY o)
                              FROM unnest(p.proargtypes) WITH ORDINALITY AS z(t, o)), '')
                  || ')' AS key
             FROM pg_proc p
             JOIN pg_namespace ns ON ns.oid = p.pronamespace
            WHERE ns.nspname = 'pg_catalog' AND p.prokind = 'w';`,
        )
      ).rows.map(r => r.key),
    );

    byKind = new Map();
    for (const [name, f] of fns) {
      for (const k of f.kinds) {
        if (!byKind.has(k)) byKind.set(k, new Set());
        byKind.get(k)!.add(name);
      }
      for (const k of f.aggKinds) {
        const key = `agg:${k}`;
        if (!byKind.has(key)) byKind.set(key, new Set());
        byKind.get(key)!.add(name);
      }
    }

    strictBuiltins = new Set(
      (
        await pg.query<{ name: string }>(
          `SELECT p.proname AS name
             FROM pg_proc p
             JOIN pg_namespace ns ON ns.oid = p.pronamespace
            WHERE ns.nspname = 'pg_catalog' AND p.prokind = 'f'
            GROUP BY p.proname
           HAVING bool_and(p.proisstrict);`,
        )
      ).rows.map(r => r.name),
    );

    operators = new Map(
      (
        await pg.query<{ name: string; n: number }>(
          `SELECT o.oprname AS name, count(*)::int AS n
             FROM pg_operator o
             JOIN pg_namespace ns ON ns.oid = o.oprnamespace
            WHERE ns.nspname = 'pg_catalog'
            GROUP BY o.oprname;`,
        )
      ).rows.map(r => [r.name, r.n]),
    );
  }, 60_000);

  afterAll(async () => {
    // The type-aware-overloads premise, measured rather than remembered.
    const tables: [string, ReadonlySet<string>][] = [
      ["ALWAYS_NOT_NULL_BUILTINS", ALWAYS_NOT_NULL_BUILTINS],
      ["FIRST_ARG_BUILTINS", FIRST_ARG_BUILTINS],
      ["STRICT_TOTAL_BUILTINS", STRICT_TOTAL_BUILTINS],
    ];
    let names = 0;
    let sigs = 0;
    for (const [, set] of tables) {
      names += set.size;
      for (const n of set) sigs += fns.get(n)?.signatures ?? 0;
    }
    let opSigs = 0;
    const opNames = new Set([...TOTAL_OPERATORS, ...STRICT_OPERATORS]);
    for (const o of opNames) opSigs += operators.get(o) ?? 0;
    console.log(
      `\ncurated totality tables: ${names} names → ${sigs} pg_catalog signatures; ` +
        `operator sets: ${opNames.size} distinct names → ${opSigs} signatures.\n` +
        `  A curated entry keys on a NAME and PostgreSQL keys on a SIGNATURE; ` +
        `the type-aware narrowing is what closes the gap.`,
    );
    if (!pg.closed) await pg.close();
  });

  // --- existence: the assertion every table gets ---------------------------

  // HYPOTHETICAL_SET_AGGREGATES and ORDERED_SET_AGGREGATES are gone from
  // this list because they are gone entirely (2026-08-09): both were
  // asserted EQUAL to `pg_aggregate.aggkind` in both directions, which is
  // this suite's own retirement criterion — they stopped being tables and
  // became the capture (`builtinFunctionSignatures.aggKind`, whose spot
  // pins live in snapshot.test.ts), the way AGGREGATE_NAMES did.
  const ALL: [string, ReadonlySet<string>][] = [
    ["NON_NULL_OVER_NONEMPTY_AGGREGATES", NON_NULL_OVER_NONEMPTY_AGGREGATES],
    ["ALWAYS_NOT_NULL_BUILTINS", ALWAYS_NOT_NULL_BUILTINS],
    ["FIRST_ARG_BUILTINS", FIRST_ARG_BUILTINS],
    ["STRICT_TOTAL_BUILTINS", STRICT_TOTAL_BUILTINS],
  ];

  it("every curated function name exists in pg_catalog", () => {
    const unknown = ALL.flatMap(([label, set]) =>
      [...set].filter(n => !fns.has(n)).sort().map(n => `${label}: ${n}`),
    );
    expect(
      unknown,
      `Curated name(s) PostgreSQL has no function for. Either the name is ` +
        `spelled by the GRAMMAR and rewritten before the walk sees it (\`trim\` ` +
        `becomes \`pg_catalog.btrim\`), or it is a keyword the parser turns into ` +
        `a SQLValueFunction (\`user\`, \`current_role\`), or it was never a ` +
        `PostgreSQL function at all (\`cluster\`, \`listagg\`). All three are ` +
        `dead weight that reads as coverage — delete them:\n  ${unknown.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every curated operator name exists in pg_catalog", () => {
    const unknown = [...new Set([...TOTAL_OPERATORS, ...STRICT_OPERATORS])]
      .filter(o => !operators.has(o))
      .sort();
    expect(
      unknown,
      `Curated operator(s) pg_operator does not carry. \`!=\` was one: the ` +
        `lexer converts it to \`<>\` before a parse tree exists, so no A_Expr ` +
        `can ever carry the spelling:\n  ${unknown.join(", ")}`,
    ).toEqual([]);
  });

  // --- kind: where the catalog records the property directly ---------------

  it("every aggregate table holds only aggregates", () => {
    const wrong = [
      ...[...NON_NULL_OVER_NONEMPTY_AGGREGATES].map(n => ["NON_NULL_OVER_NONEMPTY_AGGREGATES", n] as const),
    ]
      .filter(([, n]) => fns.has(n) && !fns.get(n)!.kinds.has("a"))
      .map(([label, n]) => `${label}: ${n} (prokind '${[...fns.get(n)!.kinds].join("")}')`)
      .sort();
    expect(
      wrong,
      `Classified as an aggregate, but pg_catalog says otherwise. A pure ` +
        `window function (prokind 'w') can only be called with OVER, so an ` +
        `aggregate rule can never reach it — that was five of AGGREGATE_NAMES' ` +
        `entries:\n  ${wrong.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every curated window SIGNATURE is a real prokind 'w' row", () => {
    // Stronger than the membership check the NAME table got, and that is the
    // point of the re-key (2026-08-09): a signature key names ONE pg_proc
    // row, so a typo or a re-typed overload fails here instead of silently
    // claiming nothing. Still deliberately a SUBSET of prokind 'w' —
    // `nth_value` can be NULL however non-null its input, and `lag`/`lead`
    // can for every row but the three-argument one.
    const wrong = [...NEVER_NULL_WINDOW_SIGNATURES, ...STRICT_TOTAL_WINDOW_SIGNATURES]
      .filter(key => !windowSignatures.has(key))
      .sort();
    expect(
      wrong,
      `Curated window signature(s) pg_catalog has no prokind 'w' row for. A ` +
        `key is \`name(argtype,argtype)\` in format_type spelling, so an ` +
        `argument type PostgreSQL renders differently reads as a missing row:` +
        `\n  ${wrong.join("\n  ")}`,
    ).toEqual([]);
  });

  it("the capture's aggkind classes match the catalog predicate", () => {
    // The successor of "the aggkind tables EQUAL their catalog predicate":
    // the two tables took this suite's advice and became the capture, so
    // the both-directions assertion now holds the CAPTURE's h/o rows to
    // pg_aggregate — a drift here is a capture bug, not a curation one.
    const captured = new Map<string, Set<string>>([["h", new Set()], ["o", new Set()]]);
    for (const sig of capturedSignatures) {
      if (sig.aggKind === "h" || sig.aggKind === "o") captured.get(sig.aggKind)!.add(sig.name);
    }
    const drift = (["h", "o"] as const).flatMap(k => {
      const catalog = byKind.get(`agg:${k}`) ?? new Set<string>();
      const cap = captured.get(k)!;
      return [
        ...[...catalog].filter(n => !cap.has(n)).map(n => `aggkind '${k}' capture is MISSING ${n}`),
        ...[...cap].filter(n => !catalog.has(n)).map(n => `aggkind '${k}' capture has EXTRA ${n}`),
      ].sort();
    });
    expect(drift).toEqual([]);
  });

  // --- the latent hazard the AGGREGATE_NAMES replacement closed ------------

  it("no pg_catalog aggregate or window name is treated as a strict builtin", () => {
    // Why the aggregate capture had to be complete rather than merely
    // corrected. The strict-scalar gate excludes aggregates by NAME and then
    // asks `isStrictBuiltin`; an aggregate the name test missed would proceed
    // to the strictness test, and an aggregate over zero rows is NULL however
    // strict it is. Nothing was reachable in PG18 only because
    // `builtinStrictFunctions` filters `prokind = 'f'` — safety by coincidence
    // of a different table's filter. This asserts the coincidence holds, so
    // that a PostgreSQL version shipping a plain function sharing a name with
    // an aggregate fails here rather than in a consumer's output.
    const overlap = [...(byKind.get("a") ?? []), ...(byKind.get("w") ?? [])]
      .filter(n => strictBuiltins.has(n))
      .sort();
    expect(
      overlap,
      `A pg_catalog aggregate or window name also has an all-strict ` +
        `plain-function overload. The strict-scalar gate would claim notNull ` +
        `for a call PostgreSQL can answer NULL over zero rows:\n  ${overlap.join(", ")}`,
    ).toEqual([]);
  });
});
