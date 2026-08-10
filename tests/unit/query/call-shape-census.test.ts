import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

// ---------------------------------------------------------------------------
// THE CALL-SHAPE CENSUS.
//
// `node-census.test.ts` catches the unknown-unknown on the PARSE side: every
// node kind is classified, so a kind nobody thought about fails until someone
// does. This is the same instrument pointed at the CATALOG side, and it exists
// because the probes kept missing rows they had already enumerated.
//
// The enumeration was never the problem. `builtin-surface.test.ts` asks
// pg_catalog for every signature and asserts it classified all of them. What
// went wrong four times was narrower and worse: PostgreSQL had RECORDED the
// thing that changes how a call must be built or how its result must be
// tested, in a column or a table, and the probe did not join to it.
//
//   `provariadic`  — names the ELEMENT type. Reading `proargtypes` alone made
//                    the probe pass the declared ARRAY positionally, which is
//                    a type error rather than a call: 19 rows "raised
//                    everywhere" and looked unprobeable, hiding four real
//                    witnesses (`json_extract_path` and its three siblings are
//                    NULL for a missing path).
//   `prorettype`   — a COMPOSITE result makes `IS NULL` mean ROW-is-null, true
//                    when every field is null. Two rows carried witnesses for
//                    a record of NULLs, which the driver receives as a VALUE.
//   `pg_cast`      — never consulted at all, and the only UNSOUND finding of
//                    the set: `ts::time` on a NOT NULL timestamp read notNull
//                    while `'infinity'::timestamp::time` is NULL.
//   `proretset`    — read, but the question was wrong: taking the first
//                    emitted row made `unnest(ARRAY[1,NULL])` and
//                    `unnest(ARRAY[NULL,1])` disagree by sort order.
//
// So the census classifies EVERY column of the four catalogs the probes read.
// A column is `shape` (changes the call), `result` (changes the null test),
// `scope` (decides whether to probe at all), or `irrelevant` WITH a reason —
// and "irrelevant" is the word that would have been visibly false for
// `provariadic`, which is the whole mechanism.
//
// A `consulted` claim is CHECKED, not decorated: the column name must appear
// in one of the probe sources. That is crude — it cannot tell a real join from
// a mention — but it is enough to catch the failure this suite is about, which
// was a column nobody had written down anywhere.
// ---------------------------------------------------------------------------

type Category = "shape" | "result" | "scope" | "irrelevant";

interface ColumnVerdict {
  category: Category;
  /** Why. For `irrelevant`, why it cannot change a call or its verdict. */
  why: string;
}

/** The probe sources a `consulted` claim may appear in. */
const PROBE_SOURCES = [
  "probe-values.ts",
  "builtin-surface.test.ts",
  "totality-probe.test.ts",
  "../../probe/cluster-sweep.ts",
  "../../../src/catalog/snapshot.ts",
];

const CENSUS: Record<string, ColumnVerdict> = {
  // --- pg_proc: what to call, how to call it, what the result is ----------
  "pg_proc.oid": { category: "scope", why: "identity; the join key every role predicate uses" },
  "pg_proc.proname": { category: "shape", why: "the name in the call" },
  "pg_proc.pronamespace": { category: "scope", why: "pg_catalog only; a user function is not this surface" },
  "pg_proc.prokind": { category: "shape", why: "'f' calls plainly, 'a' needs an aggregate context, 'w' needs OVER" },
  "pg_proc.proretset": {
    category: "shape",
    why: "a set-returning row is asked a different question — does ANY emitted row hold a NULL — through srfprobe, in the TARGET LIST because a FROM-position function scan materialises in PGlite",
  },
  "pg_proc.prorettype": {
    category: "result",
    why: "a COMPOSITE result makes `IS NULL` row-is-null rather than value-is-null; nullTestExpr casts it to text first",
  },
  "pg_proc.proargtypes": { category: "shape", why: "the declared input list a call lines up against" },
  "pg_proc.provariadic": {
    category: "shape",
    why: "names the ELEMENT type of a variadic tail; the declared array passed positionally is a type error, which is what variadicArgTypes exists to prevent",
  },
  "pg_proc.proargmodes": {
    category: "result",
    why: "counts the OUT columns, so a record-returning set function is tested per COLUMN — unnest(tsvector)'s NULL positions sit beside a non-null lexeme",
  },
  "pg_proc.pronargdefaults": {
    category: "shape",
    why: "admits a SHORTER call; the typed dispatch needs it to keep a defaulted row a candidate, and the probe passes every argument, which is always a legal call",
  },
  "pg_proc.provolatile": { category: "scope", why: "'v' is excluded on the catalog's own side-effect marker" },
  "pg_proc.proisstrict": {
    category: "irrelevant",
    why: "STRICTNESS, a different property from totality — 2548 of PG18's builtin names carry it, so it is no proxy. Consumed by the walk, never by the probe: this surface asks about NON-null arguments",
  },
  "pg_proc.proallargtypes": {
    category: "irrelevant",
    why: "the input list plus OUT parameters; the probe lines a call up against proargtypes and counts OUT columns from proargmodes, so this adds nothing either needs",
  },
  "pg_proc.proargnames": { category: "irrelevant", why: "named notation is a call SPELLING the probe never uses (and the walk skips typed dispatch for it)" },
  "pg_proc.proargdefaults": { category: "irrelevant", why: "the default EXPRESSIONS; the probe supplies every argument, so it never elides one" },
  "pg_proc.prosrc": { category: "irrelevant", why: "the C symbol or SQL body; totality lives in the implementation and a source scanner for it was built and discarded" },
  "pg_proc.prosqlbody": { category: "irrelevant", why: "the parsed body of a BEGIN ATOMIC function; no pg_catalog builtin has one" },
  "pg_proc.prolang": { category: "irrelevant", why: "every pg_catalog builtin of interest is internal or C; the language changes nothing about how a call is written" },
  "pg_proc.prosupport": { category: "irrelevant", why: "the planner support function, which never runs as part of evaluating the call" },
  "pg_proc.protrftypes": { category: "irrelevant", why: "transform types for PL languages; no bearing on a SQL-level call" },
  "pg_proc.probin": { category: "irrelevant", why: "the shared library path" },
  "pg_proc.proconfig": { category: "irrelevant", why: "per-function GUC settings; none is set on a pg_catalog builtin" },
  "pg_proc.proacl": { category: "irrelevant", why: "privileges; the probe runs as the owner" },
  "pg_proc.proowner": { category: "irrelevant", why: "ownership; the probe runs as the owner of everything in pg_catalog" },
  "pg_proc.procost": { category: "irrelevant", why: "planner cost estimate; it steers plan choice and never the value returned" },
  "pg_proc.prorows": { category: "irrelevant", why: "planner row estimate for a set function; an estimate, not a shape" },
  "pg_proc.prosecdef": { category: "irrelevant", why: "SECURITY DEFINER; changes who runs it, not what it returns" },
  "pg_proc.proleakproof": { category: "irrelevant", why: "whether it may leak values through errors; a security property" },
  "pg_proc.proparallel": { category: "irrelevant", why: "parallel safety, which decides where PostgreSQL may run it and not what it answers" },
  "pg_proc.pronargs": { category: "irrelevant", why: "the length of proargtypes, which the probe reads directly" },

  // --- pg_operator: the same questions for the infix and prefix forms -----
  "pg_operator.oid": { category: "scope", why: "identity; the join key oprcode and the amproc role predicate use" },
  "pg_operator.oprname": { category: "shape", why: "the symbol in the call" },
  "pg_operator.oprnamespace": { category: "scope", why: "pg_catalog only; a user operator belongs to the walk's merged candidate set, not to this surface" },
  "pg_operator.oprkind": {
    category: "irrelevant",
    why: "'b' binary and 'l' prefix, which `oprleft = 0` says exactly as well — and that is the form the probes and the claim-table keys already use, a prefix key having an EMPTY left side. Postfix operators ('r') were removed in PG14, so the two can no longer disagree",
  },
  "pg_operator.oprleft": { category: "shape", why: "left operand type; 0 marks the prefix form" },
  "pg_operator.oprright": { category: "shape", why: "the right operand type, and the only operand a prefix operator has" },
  "pg_operator.oprcode": {
    category: "shape",
    why: "the implementing function — the role that made the 748-row oprcode cluster an IDENTITY argument rather than a family resemblance, and how each of its 16 NULL-capable rows was matched to an already-witnessed operator",
  },
  "pg_operator.oprresult": { category: "irrelevant", why: "the result type; the probe asks whether the value is NULL, and no operator returns a composite" },
  "pg_operator.oprcom": { category: "irrelevant", why: "the commutator, a planner equivalence" },
  "pg_operator.oprnegate": { category: "irrelevant", why: "the negator, a planner equivalence" },
  "pg_operator.oprcanmerge": { category: "irrelevant", why: "mergejoinability, a planner capability that changes no result the probe reads" },
  "pg_operator.oprcanhash": { category: "irrelevant", why: "hashjoinability, a planner capability that changes no result the probe reads" },
  "pg_operator.oprrest": { category: "irrelevant", why: "restriction selectivity estimator" },
  "pg_operator.oprjoin": { category: "irrelevant", why: "join selectivity estimator" },
  "pg_operator.oprowner": { category: "irrelevant", why: "ownership; the probe runs as the owner of everything in pg_catalog" },

  // --- pg_cast: the table that was not consulted at all -------------------
  "pg_cast.oid": { category: "scope", why: "identity; a cast row is addressed by its (source, target) pair, not by this" },
  "pg_cast.castsource": { category: "shape", why: "the pair a TypeCast resolves on" },
  "pg_cast.casttarget": { category: "shape", why: "the other half of the pair" },
  "pg_cast.castfunc": {
    category: "shape",
    why: "the implementation whose verdict decides the cast; 0 means binary-coercible or an I/O round trip, which computes nothing and cannot invent a NULL",
  },
  "pg_cast.castcontext": {
    category: "scope",
    why: "'i' marks the IMPLICIT rows the coercibility rule reads; the totality question reads every row regardless, since an explicit `::` cast is written by hand",
  },
  "pg_cast.castmethod": {
    category: "irrelevant",
    why: "'f'/'b'/'i' restates what castfunc = 0 already says, and castfunc is what the verdict needs",
  },

  // --- pg_aggregate: the WITHIN GROUP shape and the class claims ----------
  "pg_aggregate.aggfnoid": { category: "scope", why: "identity; the join to pg_proc" },
  "pg_aggregate.aggkind": {
    category: "shape",
    why: "'h' hypothetical-set and 'o' ordered-set need the WITHIN GROUP spelling; the two name tables that mirrored this retired once it was asserted catalog-equal",
  },
  "pg_aggregate.aggnumdirectargs": {
    category: "shape",
    why: "splits an ordered-set row's direct arguments from its ORDER BY ones, which is where the WITHIN GROUP construction cuts",
  },
  "pg_aggregate.agginitval": {
    category: "irrelevant",
    why: "a non-null INITCOND proves NOTHING about a non-empty group — it fixes the EMPTY-input result only, and either transition or final function can return NULL from non-null state (measured)",
  },
  "pg_aggregate.aggminitval": { category: "irrelevant", why: "the moving-aggregate INITCOND, for the same reason" },
  "pg_aggregate.aggtransfn": {
    category: "scope",
    why: "the transition function; one of the joins the aggsupport ROLE predicate makes, and swept as a plain function in its own right — `int4_sum` and `float8_accum` are ordinary calls",
  },
  "pg_aggregate.aggfinalfn": {
    category: "scope",
    why: "the final function; one of the joins the aggsupport ROLE predicate makes, which is how the sweep partitions it away from the plain functions — and it is swept as a plain function in its own right, since PostgreSQL lets one be called directly",
  },
  "pg_aggregate.aggcombinefn": {
    category: "scope",
    why: "the combine function; one of the joins the aggsupport ROLE predicate makes, which is how the sweep partitions it away from the plain functions — and it is swept as a plain function in its own right, since PostgreSQL lets one be called directly",
  },
  "pg_aggregate.aggserialfn": {
    category: "scope",
    why: "the serialisation function; one of the joins the aggsupport ROLE predicate makes, which is how the sweep partitions it away from the plain functions — and it is swept as a plain function in its own right, since PostgreSQL lets one be called directly",
  },
  "pg_aggregate.aggdeserialfn": {
    category: "scope",
    why: "the deserialisation function; one of the joins the aggsupport ROLE predicate makes, which is how the sweep partitions it away from the plain functions — and it is swept as a plain function in its own right, since PostgreSQL lets one be called directly",
  },
  "pg_aggregate.aggmtransfn": {
    category: "scope",
    why: "the moving-aggregate transition function; one of the joins the aggsupport ROLE predicate makes, which is how the sweep partitions it away from the plain functions — and it is swept as a plain function in its own right, since PostgreSQL lets one be called directly",
  },
  "pg_aggregate.aggminvtransfn": {
    category: "scope",
    why: "the moving-aggregate inverse transition function; one of the joins the aggsupport ROLE predicate makes, which is how the sweep partitions it away from the plain functions — and it is swept as a plain function in its own right, since PostgreSQL lets one be called directly",
  },
  "pg_aggregate.aggmfinalfn": {
    category: "scope",
    why: "the moving-aggregate final function; one of the joins the aggsupport ROLE predicate makes, which is how the sweep partitions it away from the plain functions — and it is swept as a plain function in its own right, since PostgreSQL lets one be called directly",
  },
  "pg_aggregate.aggsortop": { category: "irrelevant", why: "the sort operator MIN/MAX optimise through; a planner equivalence" },
  "pg_aggregate.aggtranstype": { category: "irrelevant", why: "the state type, which never appears in a call" },
  "pg_aggregate.aggtransspace": { category: "irrelevant", why: "a state-size estimate" },
  "pg_aggregate.aggmtranstype": { category: "irrelevant", why: "the moving state type" },
  "pg_aggregate.aggmtransspace": { category: "irrelevant", why: "a moving state-size estimate" },
  "pg_aggregate.aggfinalextra": { category: "irrelevant", why: "whether the final function gets extra dummy arguments; internal to execution" },
  "pg_aggregate.aggmfinalextra": { category: "irrelevant", why: "the moving-aggregate equivalent" },
  "pg_aggregate.aggfinalmodify": { category: "irrelevant", why: "whether the final function may modify state; internal to execution" },
  "pg_aggregate.aggmfinalmodify": { category: "irrelevant", why: "the moving-aggregate equivalent" },
};

const HERE = dirname(fileURLToPath(import.meta.url));
const CATALOGS = ["pg_proc", "pg_operator", "pg_cast", "pg_aggregate"];

describe("call-shape census: the catalog columns a probe must consult", () => {
  let pg: PGlite;
  let columns: string[];
  let sources: string;

  beforeAll(async () => {
    pg = await PGlite.create();
    columns = (
      await pg.query<{ key: string }>(
        `SELECT c.relname || '.' || a.attname AS key
           FROM pg_attribute a
           JOIN pg_class c ON c.oid = a.attrelid
          WHERE c.relname = ANY($1) AND a.attnum > 0 AND NOT a.attisdropped
          ORDER BY c.relname, a.attnum;`,
        [CATALOGS],
      )
    ).rows.map(r => r.key);
    sources = PROBE_SOURCES.map(f => readFileSync(join(HERE, f), "utf8")).join("\n");
  }, 60_000);

  afterAll(async () => {
    if (!pg.closed) await pg.close();
  });

  it("every catalog column is classified, and every classification is a real column", () => {
    // Both directions, like every census here. A PostgreSQL release that adds
    // a column fails until somebody decides whether it changes a call — which
    // is the decision nobody was asked to make about `provariadic`.
    const unclassified = columns.filter(c => !(c in CENSUS)).sort();
    const phantom = Object.keys(CENSUS).filter(c => !columns.includes(c)).sort();
    expect(
      unclassified,
      `Catalog column(s) no verdict covers. Decide whether each changes how a ` +
        `call must be BUILT (shape), how its result must be TESTED (result), ` +
        `whether it is probed at all (scope), or neither — and if neither, say ` +
        `why in a sentence that would be visibly false if it were wrong:\n  ` +
        `${unclassified.join("\n  ")}`,
    ).toEqual([]);
    expect(
      phantom,
      `The census records a column this PostgreSQL does not have. It was ` +
        `renamed or removed, and the verdict is now about nothing:\n  ` +
        `${phantom.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every shape- or result-bearing column is named in a probe source", () => {
    // The check that makes a verdict a claim rather than a decoration. Crude
    // by design — it cannot tell a real join from a mention — but the failure
    // it guards was a column that appeared NOWHERE, four times.
    const missing = Object.entries(CENSUS)
      .filter(([, v]) => v.category === "shape" || v.category === "result")
      .map(([key]) => key.split(".")[1]!)
      .filter(col => !sources.includes(col))
      .sort();
    expect(
      missing,
      `Classified as changing a call or its verdict, but the column name ` +
        `appears in no probe source. Either a probe should be reading it — ` +
        `that was provariadic's state while 19 rows read as unprobeable — ` +
        `or the verdict is wrong:\n  ${missing.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every verdict carries a reason", () => {
    const bare = Object.entries(CENSUS)
      .filter(([, v]) => v.why.trim().length < 20)
      .map(([k]) => k)
      .sort();
    expect(
      bare,
      `A verdict with no reason is a marker, and a marker cannot be checked ` +
        `against reality by the next reader:\n  ${bare.join("\n  ")}`,
    ).toEqual([]);
  });

  it("reports the shape of the surface it covers", () => {
    const counts = new Map<Category, number>();
    for (const v of Object.values(CENSUS)) counts.set(v.category, (counts.get(v.category) ?? 0) + 1);
    console.log(
      `\ncall-shape census: ${columns.length} columns over ${CATALOGS.length} catalogs — ` +
        [...counts.entries()].sort().map(([c, n]) => `${c}: ${n}`).join(", ") + ".",
    );
    expect(columns.length).toBeGreaterThan(60);
  });
});
