// The CLUSTER SWEEP: convict a group of signatures row by row, against input
// classes the shared corpus does not carry.
//
// Why it exists. Promoting the work list in clusters is family-resemblance
// reasoning, and family resemblance was wrong every time it mattered:
// `json_each` is total and `json_each_text` is NULL, one character apart;
// 25 of `<->`'s 26 rows are total and `path <-> path` is NULL for a
// single-point path; four of `##`'s five rows are total and `line ## lseg`
// is NULL for a zero-length segment. Two of those three were found by this
// sweep's throwaway ancestor, in rows that were about to be promoted on the
// corner corpus's silence. So the rule is: a cluster is a HYPOTHESIS, and
// every ROW of it gets probed — never a sample.
//
// What it adds to the corpus. `probe-values.ts` is the committed corner
// corpus, shared by the two gating suites; `ADVERSARIAL` below is a STAGING
// AREA beside it — values under test for admission, not a second corpus.
// The distinction is enforced by the parity report: a staged value that
// changes a verdict MUST be promoted into probe-values.ts, because a
// conviction resting on a value the standing probe never re-tries is a claim
// held more weakly than it was made. A staged value that changes nothing is
// noise and can be dropped.
//
// How to CUT a cluster. By catalog ROLE, never by spelling — the first run of
// this sweep was given `(eq|ne|lt|le|gt|ge|cmp)$` and dutifully swept
// `pg_table_is_visible`, `scale` and `to_regrole`, because those end in "le"
// too. A role is a join: `pg_amproc.amproc`, `pg_operator.oprcode`,
// `pg_cast.castfunc`, `pg_type.typoutput`, `pg_aggregate.aggtransfn`. It says
// what PostgreSQL USES the function for, which is what shares a mechanism.
//
// Run:
//   pnpm exec tsx tests/probe/cluster-sweep.ts --role=oprcode
//   pnpm exec tsx tests/probe/cluster-sweep.ts '^(int2|int4|int8)'
//   pnpm exec tsx tests/probe/cluster-sweep.ts . --operators
//
// Roles: amproc, oprcode, cast, typio, aggsupport, rangesupport, standalone.
//
// The report is per ROW: NULL (with the falsifying expression), total,
// all-raised, or no-generator. Nothing here promotes anything — the verdict
// is evidence for a human, the same discovery/coverage split the register
// mandates for the work list itself.
import { PGlite } from "@electric-sql/pglite";
import {
  VALUES,
  POLYMORPHIC,
  POLYMORPHIC_FAMILIES,
  PROBE_FN_SQL,
  SRF_PROBE_FN_SQL,
  srfQuery,
  qualify,
  variadicArgTypes,
  COHERENT_CALLS,
} from "../unit/query/probe-values.js";

/**
 * Corner values BEYOND the committed corpus, per rendered type name. These
 * are the degenerate shapes and boundary values a cluster's falsifier
 * hypothesis names — the zero-length segment, the zero-radius circle, the
 * single-point polygon — staged here so the sweep can try them before the
 * corpus carries them.
 *
 * Adding one here costs nothing and risks nothing: the gating suites never
 * read this file. Promoting one into probe-values.ts is the decision, and
 * the parity report at the end of every run says which ones earned it.
 */
const ADVERSARIAL: Record<string, string[]> = {
  // Geometry: every degenerate shape its type admits.
  point: ["'(0,0)'::point"],
  box: ["'((0,0),(0,0))'::box"],
  circle: ["'<(0,0),0>'::circle", "'<(0,0),-1>'::circle"],
  polygon: ["'((0,0))'::polygon", "'((0,0),(0,0))'::polygon"],
  path: ["'[(0,0)]'::path", "'((0,0))'::path"],
  lseg: ["'[(0,0),(0,0)]'::lseg"],
  line: ["'{1,0,0}'::line", "'{0,1,0}'::line"],
  // Numbers: the boundaries where a C implementation overflows or divides.
  smallint: ["(-32768)::smallint"],
  integer: ["(-2147483648)"],
  bigint: ["(-9223372036854775808)::bigint"],
  numeric: ["'-Infinity'::numeric", "1e-16383::numeric"],
  "double precision": ["4.9e-324::float8", "1.7976931348623157e308::float8"],
  real: ["1.1754944e-38::float4"],
  money: ["(-92233720368547758.08)::money"],
  // Text and containers: the empty and the boundary-shaped.
  text: ["'\\'", "E'\\\\x00'", "'%'", "'_'"],
  bytea: ["'\\xff'::bytea"],
  "integer[]": ["ARRAY[NULL]::int[]", "'{{1,2},{3,4}}'::int[]"],
  "text[]": ["ARRAY[NULL]::text[]"],
  // Time: the boundaries PostgreSQL stores rather than the ones it rejects.
  date: ["'4713-01-01 BC'::date", "'5874897-12-31'::date"],
  interval: ["'178000000 years'::interval"],
  tsquery: ["'!a'::tsquery", "'a <-> b'::tsquery"],
  tsvector: ["'a:1'::tsvector"],
  inet: ["'0.0.0.0/0'::inet", "'::/0'::inet"],
  cidr: ["'0.0.0.0/0'::cidr"],
  bit: ["B'0'"],
  "bit varying": ["B''::varbit"],
  jsonb: ["'[]'::jsonb", "'{\"\":null}'::jsonb"],
  json: ["'{\"\":null}'::json"],
  record: ["ROW(NULL,NULL)::record"],
};

/** Beyond this many combinations for one row, sample rather than cross. */
const ROW_COMBO_CAP = 2_000;

const roleArg = process.argv.find(a => a.startsWith("--role="))?.slice("--role=".length);
const pattern = new RegExp(process.argv[2]?.startsWith("--") ? "." : (process.argv[2] ?? "."));
const wantOperators = process.argv.includes("--operators");

/**
 * The catalog join behind each role. A function can serve several — a btree
 * support proc is usually an operator's implementation too — so the roles are
 * tested in this order and the FIRST match wins, most specific first. That
 * makes the roles a PARTITION, which is what lets "every row swept" mean
 * something across a sequence of runs.
 */
const ROLE_SQL: Record<string, string> = {
  amproc: `EXISTS (SELECT 1 FROM pg_amproc a WHERE a.amproc = p.oid)`,
  typio: `EXISTS (SELECT 1 FROM pg_type t
                   WHERE p.oid IN (t.typinput, t.typoutput, t.typsend, t.typreceive,
                                   t.typmodin, t.typmodout, t.typanalyze, t.typsubscript))`,
  aggsupport: `EXISTS (SELECT 1 FROM pg_aggregate a
                        WHERE p.oid IN (a.aggtransfn, a.aggfinalfn, a.aggcombinefn,
                                        a.aggserialfn, a.aggdeserialfn, a.aggmtransfn,
                                        a.aggminvtransfn, a.aggmfinalfn))`,
  cast: `EXISTS (SELECT 1 FROM pg_cast c WHERE c.castfunc = p.oid)`,
  rangesupport: `EXISTS (SELECT 1 FROM pg_range r WHERE p.oid IN (r.rngcanonical, r.rngsubdiff))`,
  oprcode: `EXISTS (SELECT 1 FROM pg_operator o WHERE o.oprcode = p.oid)`,
};
const ROLE_ORDER = ["amproc", "typio", "aggsupport", "cast", "rangesupport", "oprcode"];
if (roleArg !== undefined && roleArg !== "standalone" && !(roleArg in ROLE_SQL)) {
  throw new Error(`unknown role ${roleArg}; roles: ${[...ROLE_ORDER, "standalone"].join(", ")}`);
}
/** SQL true for exactly the rows of the requested role, none double-counted. */
const roleFilter =
  roleArg === undefined
    ? "true"
    : roleArg === "standalone"
      ? ROLE_ORDER.map(r => `NOT ${ROLE_SQL[r]!}`).join(" AND ")
      : [
          ROLE_SQL[roleArg]!,
          ...ROLE_ORDER.slice(0, ROLE_ORDER.indexOf(roleArg)).map(r => `NOT ${ROLE_SQL[r]!}`),
        ].join(" AND ");

let pg = await PGlite.create();
const setup = async (db: PGlite): Promise<void> => {
  await db.exec(`CREATE TYPE probe_enum AS ENUM ('a','b');`);
  await db.exec(PROBE_FN_SQL);
  await db.exec(SRF_PROBE_FN_SQL);
};
await setup(pg);

/**
 * A poisoned backend answers plain SELECTs and lies (the register's
 * encoding-conversion finding), so liveness is tested with the probe itself
 * and a dead instance is rebuilt — the same discipline the surface suite
 * uses, because this sweep reaches the same expressions.
 */
const ensureAlive = async (): Promise<void> => {
  try {
    const r = await pg.query<{ v: string }>(`SELECT probe('1') AS v`);
    if (r.rows[0]?.v === "value") return;
  } catch {
    /* fall through */
  }
  try {
    await pg.close();
  } catch {
    /* already dead */
  }
  pg = await PGlite.create();
  await setup(pg);
};

interface Row {
  name: string;
  types: string[];
  kind: "function" | "operator";
  prefix: boolean;
  retset: boolean;
  ncols: number;
}

const fnRows: Row[] = (
  await pg.query<{ name: string; types: string[]; retset: boolean; ncols: number; variadic: string | null }>(
    `SELECT p.proname AS name,
            COALESCE((SELECT array_agg(format_type(t, null) ORDER BY o)
                        FROM unnest(p.proargtypes) WITH ORDINALITY AS z(t, o)), '{}') AS types,
            p.proretset AS retset,
          CASE WHEN p.provariadic <> 0
               THEN format_type(p.provariadic, null) END AS variadic,
            CASE WHEN p.proargmodes IS NULL THEN 1
                 ELSE greatest(1, (SELECT count(*) FROM unnest(p.proargmodes) m
                                    WHERE m IN ('o','b','t'))) END::int AS ncols
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'pg_catalog' AND p.prokind = 'f' AND p.provolatile <> 'v'
        AND ${roleFilter}
      ORDER BY p.proname, 2;`,
  )
).rows.map(r => ({
  // Same VARIADIC correction the surface suite carries: `provariadic` names
  // the ELEMENT type, and passing the declared array positionally is a type
  // error rather than a call.
  ...r,
  types: variadicArgTypes(r.types, r.variadic),
  kind: "function" as const,
  prefix: false,
}));

const opRows: Row[] = wantOperators
  ? (
      await pg.query<{ name: string; left: string | null; right: string | null }>(
        `SELECT o.oprname AS name,
                CASE WHEN o.oprleft = 0 THEN NULL ELSE format_type(o.oprleft, null) END AS left,
                CASE WHEN o.oprright = 0 THEN NULL ELSE format_type(o.oprright, null) END AS right
           FROM pg_operator o
           JOIN pg_namespace n ON n.oid = o.oprnamespace
           JOIN pg_proc p ON p.oid = o.oprcode
          WHERE n.nspname = 'pg_catalog' AND p.provolatile <> 'v'
          ORDER BY o.oprname, 2, 3;`,
      )
    ).rows.map(r => ({
      name: r.name,
      types: [r.left, r.right].filter((t): t is string => t !== null),
      kind: "operator" as const,
      prefix: r.left === null,
      retset: false,
      ncols: 1,
    }))
  : [];

const rows = [...fnRows, ...opRows].filter(r => pattern.test(r.name));

/** Values for one parameter: the corpus's, then the staged ones. */
const valuesFor = (t: string, family: Record<string, string>): { corpus: string[]; staged: string[] } => {
  if (t in family) return { corpus: [family[t]!], staged: [] };
  return { corpus: VALUES[t] ?? [], staged: ADVERSARIAL[t] ?? [] };
};

const render = (r: Row, combo: string[]): string =>
  r.kind === "operator"
    ? r.prefix
      ? `OPERATOR(pg_catalog.${r.name}) ${combo[0]}`
      : `${combo[0]} OPERATOR(pg_catalog.${r.name}) ${combo[1]}`
    : `${qualify(r.name)}(${combo.join(", ")})`;

const findings: string[] = [];
/**
 * The rows this run convicted: probed, evaluated, and never NULL. Printed by
 * `--list-total` as the promotion list itself, so what lands in the claim
 * table has the sweep as its provenance rather than a hand transcription.
 */
const convicted: string[] = [];
const stagedThatMattered = new Set<string>();
let totals = 0;
let allRaised = 0;
let noGenerator = 0;

for (const r of rows) {
  const families = r.types.some(t => POLYMORPHIC.has(t)) ? POLYMORPHIC_FAMILIES : [{}];
  /** expression -> whether it uses a value the corpus does not carry. */
  const exprs = new Map<string, boolean>();
  let missingGenerator = false;

  for (const family of families) {
    const lists = r.types.map(t => valuesFor(t, family));
    if (lists.some(l => l.corpus.length === 0 && l.staged.length === 0)) {
      missingGenerator = true;
      continue;
    }
    // Cross the corpus values with the staged ones, tracking per combination
    // whether any staged value took part — that is what the parity report
    // needs, and it cannot be recovered after the fact.
    let combos: { vals: string[]; staged: boolean }[] = [{ vals: [], staged: false }];
    for (const l of lists) {
      const all = [...l.corpus.map(v => [v, false] as const), ...l.staged.map(v => [v, true] as const)];
      combos = combos.flatMap(c => all.map(([v, s]) => ({ vals: [...c.vals, v], staged: c.staged || s })));
      if (combos.length > ROW_COMBO_CAP) combos = combos.slice(0, ROW_COMBO_CAP);
    }
    for (const c of combos) {
      const e = render(r, c.vals);
      exprs.set(e, exprs.get(e) === false ? false : c.staged);
    }
    if (r.types.every(t => !POLYMORPHIC.has(t))) break;
  }

  const key = `${r.name}(${r.types.join(",")})`;
  // Calls whose arguments must be valid TOGETHER; see probe-values.ts.
  for (const c of COHERENT_CALLS[key] ?? []) exprs.set(render(r, [...c]), false);
  if (exprs.size === 0) {
    if (missingGenerator) noGenerator++;
    continue;
  }

  const list = [...exprs.keys()];
  const verdicts = new Map<string, string>();
  for (let i = 0; i < list.length; i += 500) {
    const batch = list.slice(i, i + 500);
    try {
      const res = await pg.query<{ e: string; v: string }>(
        `SELECT e, CASE WHEN srf THEN srfprobe(q) ELSE probe(q) END AS v
           FROM unnest($1::text[], $2::text[], $3::bool[]) AS z(e, q, srf);`,
        [
          batch,
          batch.map(e => (r.retset ? srfQuery(e, r.ncols) : e)),
          batch.map(() => r.retset),
        ],
      );
      if (res.rows.length !== batch.length) throw new Error("short result");
      for (const row of res.rows) verdicts.set(row.e, row.v);
    } catch {
      await ensureAlive();
      for (const e of batch) verdicts.set(e, "error");
    }
  }

  const nullExprs = list.filter(e => verdicts.get(e) === "NULL");
  const evaluated = list.filter(e => {
    const v = verdicts.get(e);
    return v !== "error" && v !== "empty";
  });
  if (nullExprs.length > 0) {
    const corpusReaches = nullExprs.some(e => exprs.get(e) === false);
    findings.push(
      `NULL  ${key}\n      ${nullExprs[0]}` +
        (corpusReaches ? "" : `\n      ^ only reachable from a STAGED value — promote it into probe-values.ts`),
    );
    if (!corpusReaches) for (const e of nullExprs) if (exprs.get(e)) stagedThatMattered.add(key);
  } else if (evaluated.length === 0) {
    allRaised++;
    findings.push(`RAISE ${key} — every combination raised or emitted nothing`);
  } else {
    totals++;
    convicted.push(key);
  }
}

if (process.argv.includes("--list-total")) {
  console.log(convicted.sort().map(k => `  ${JSON.stringify(k)},`).join("\n"));
}
console.log(findings.join("\n"));
console.log(
  `\n${rows.length} rows swept (${roleArg ? `role=${roleArg}` : `/${pattern.source}/`}` +
    `${wantOperators ? " +operators" : ""}): ` +
    `${totals} total, ${findings.length - allRaised} NULL-capable, ${allRaised} all-raised, ` +
    `${noGenerator} no-generator.`,
);
if (stagedThatMattered.size > 0) {
  console.log(
    `\nPARITY: ${stagedThatMattered.size} row(s) were convicted ONLY by a staged value. ` +
      `Those values must join probe-values.ts, or the standing probe cannot re-find ` +
      `what this sweep found:\n  ${[...stagedThatMattered].sort().join("\n  ")}`,
  );
}
await pg.close();
