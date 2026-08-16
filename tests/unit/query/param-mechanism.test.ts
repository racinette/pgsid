import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";

// ---------------------------------------------------------------------------
// Pins the PostgreSQL behaviours the argument-nullability design rests on.
// See docs/argument-nullability.md, "The two mechanisms, measured" — this
// suite is that section as executable assertions, the way
// deparser-roundtrip.test.ts pins the deparser table. The engine is not
// involved anywhere here: this is a test of PostgreSQL, so that a PostgreSQL
// (or PGlite) upgrade that moves a load-bearing behaviour fails loudly with
// the design consequence named, rather than silently invalidating the
// analysis built on it.
//
// The two mechanisms:
//
//   A — bind-time rejection. When parse analysis resolves a parameter's TYPE
//       to a NOT NULL domain, binding NULL raises before anything executes.
//       Guard-immune (a false CASE guard does not protect it), data-immune
//       (an empty table does not protect it), and one domain-typed use
//       decides the type for every use of that parameter.
//
//   B — execution-time rejection. A plain NOT NULL column constraint leaves
//       the parameter base-typed; NULL binds fine and the check fires per
//       row actually written. VALUES always constructs its row; a SELECT
//       over an empty table writes nothing and succeeds.
//
// And the non-mechanism: comparison. Operators resolve on a domain's BASE
// type, so the domain constraint is never consulted and the parameter is
// typed as the base type. A comparison position never rejects NULL.
//
// The mechanism A–C pins pass parameters through the real protocol Bind
// step — mechanism A lives there, and a substituted NULL literal would
// exercise constant coercion instead (a related but different code path).
// The mechanism E pins are the opposite on purpose: E grounds WRITTEN
// literals, so its statements carry none.
// ---------------------------------------------------------------------------

const SCHEMA = `
  CREATE DOMAIN uname AS text NOT NULL;
  CREATE TABLE d (n uname);
  CREATE TABLE plain (e text NOT NULL);
  CREATE TABLE empty_t (x int);
  CREATE TABLE m (id int, e text NOT NULL DEFAULT 'x', n uname DEFAULT 'g');
  CREATE FUNCTION takes_dom(v uname) RETURNS text LANGUAGE sql AS 'SELECT v';
  -- Mechanism E grounding pins (docs/argument-nullability.md, "Mechanism E"):
  CREATE TABLE sub (seats int, oc text, CHECK (seats <= 1 OR oc IS NOT NULL));
  CREATE TABLE bp_ctl (c char(4) CHECK (c = 'a '));
  CREATE FUNCTION cur_max() RETURNS int LANGUAGE sql STABLE
    AS 'SELECT current_setting(''app.max_n'')::int';
  CREATE TABLE lim (n int CHECK (n <= cur_max()));
  -- Partition-bound pins (docs/subtree-evaluation.md, "Partition-bound facts"):
  CREATE TABLE pb_r (id int, v text) PARTITION BY RANGE (id);
  CREATE TABLE pb_r1 PARTITION OF pb_r FOR VALUES FROM (0) TO (100);
  CREATE TABLE pb_rmax PARTITION OF pb_r FOR VALUES FROM (100) TO (MAXVALUE);
  CREATE TABLE pb_rmin PARTITION OF pb_r FOR VALUES FROM (MINVALUE) TO (0);
  CREATE TABLE pb_rd PARTITION OF pb_r DEFAULT;
  CREATE TABLE pb_l (k text) PARTITION BY LIST (k);
  CREATE TABLE pb_l1 PARTITION OF pb_l FOR VALUES IN ('a', 'b');
  CREATE TABLE pb_ln PARTITION OF pb_l FOR VALUES IN (NULL, 'z');
  CREATE TABLE pb_ld PARTITION OF pb_l DEFAULT;
  CREATE TABLE pb_h (id int) PARTITION BY HASH (id);
  CREATE TABLE pb_h0 PARTITION OF pb_h FOR VALUES WITH (MODULUS 2, REMAINDER 0);
  CREATE TABLE pb_h1 PARTITION OF pb_h FOR VALUES WITH (MODULUS 2, REMAINDER 1);
  CREATE TABLE pb_mr (a int, b int) PARTITION BY RANGE (a, b);
  CREATE TABLE pb_mr1 PARTITION OF pb_mr FOR VALUES FROM (0, 0) TO (10, 10);
  CREATE TABLE pb_nest (id int) PARTITION BY RANGE (id);
  CREATE TABLE pb_nest1 PARTITION OF pb_nest FOR VALUES FROM (0) TO (100) PARTITION BY RANGE (id);
  CREATE TABLE pb_nest1a PARTITION OF pb_nest1 FOR VALUES FROM (0) TO (50);
  -- Witness-classification pins (docs/argument-nullability.md, "Witness
  -- classification for constraint-shaped raises"): two CHECKs, one the
  -- parameter can violate and one no binding can rescue.
  CREATE TABLE wcls (a int, n text, CHECK (a > 5), CHECK (n IS NOT NULL));
  -- Always-raises pins (docs/argument-nullability.md, "The always-raises
  -- statement fact"): a CHECK plus an arbiter to conflict against.
  CREATE TABLE arc (id int PRIMARY KEY, a int, n text, CHECK (a > 5));
`;

const DOMAIN_ERROR = "does not allow null values";
const CONSTRAINT_ERROR = "violates not-null constraint";

let pg: PGlite;
let prepareCounter = 0;

/** Runs with real protocol parameters; returns the error message or null. */
async function errorOf(sql: string, params: unknown[]): Promise<string | null> {
  await pg.exec("BEGIN;");
  try {
    await pg.query(sql, params);
    return null;
  } catch (e) {
    return (e as Error).message;
  } finally {
    await pg.exec("ROLLBACK;");
  }
}

/** The types PostgreSQL's parse analysis assigns to a statement's parameters. */
async function paramTypes(sql: string): Promise<string> {
  const name = `mech_probe_${prepareCounter++}`;
  await pg.exec(`PREPARE ${name} AS ${sql}`);
  const r = await pg.query<{ parameter_types: string }>(
    `SELECT parameter_types::text FROM pg_prepared_statements WHERE name = '${name}'`,
  );
  return r.rows[0]!.parameter_types;
}

describe("parameter NULL-rejection mechanisms (PostgreSQL behaviour)", () => {
  beforeAll(async () => {
    pg = await PGlite.create();
    await pg.exec(SCHEMA);
  });

  afterAll(async () => {
    if (!pg.closed) await pg.close();
  });

  // --- Mechanism A: bind-time, via the parameter's resolved type. ----------

  const bindTime: [label: string, sql: string, params: unknown[]][] = [
    ["direct cast", "SELECT $1::uname", [null]],
    // The guard does not protect it: rejection precedes evaluation.
    [
      "cast under a false CASE guard",
      "SELECT CASE WHEN false THEN $1::uname ELSE 'x' END",
      [null],
    ],
    [
      "cast under a parameter-driven false guard",
      "SELECT CASE WHEN $2 THEN $1::uname ELSE 'x' END",
      [null, false],
    ],
    // Zero rows do not protect it, in any clause.
    ["cast over an empty table", "SELECT $1::uname FROM empty_t", [null]],
    ["cast in WHERE over an empty table", "SELECT x FROM empty_t WHERE $1::uname = 'a'", [null]],
    ["function argument declared as the domain", "SELECT takes_dom($1)", [null]],
    ["INSERT into a domain-typed column", "INSERT INTO d VALUES ($1)", [null]],
    // Even when the SELECT would insert nothing: the parameter itself is
    // typed as the domain, and the coercion happens at Bind.
    [
      "INSERT ... SELECT into a domain-typed column, empty source",
      "INSERT INTO d SELECT $1 FROM empty_t",
      [null],
    ],
    ["UPDATE SET on a domain-typed column", "UPDATE d SET n = $1", [null]],
    // One domain-typed use decides the type for every use.
    ["domain-typed use alongside a text use", "SELECT $1::uname, $1 || 'x'", [null]],
  ];

  for (const [label, sql, params] of bindTime) {
    it(`raises at bind: ${label}`, async () => {
      expect(await errorOf(sql, params), sql).toContain(DOMAIN_ERROR);
    });
  }

  it("types the parameter as the domain at every mechanism-A site", async () => {
    expect(await paramTypes("SELECT $1::uname")).toBe("{uname}");
    expect(await paramTypes("SELECT CASE WHEN false THEN $1::uname ELSE 'x' END")).toBe("{uname}");
    expect(await paramTypes("SELECT takes_dom($1)")).toBe("{uname}");
    expect(await paramTypes("INSERT INTO d VALUES ($1)")).toBe("{uname}");
    expect(await paramTypes("UPDATE d SET n = $1")).toBe("{uname}");
    expect(await paramTypes("SELECT $1::uname, $1 || 'x'")).toBe("{uname}");
  });

  // --- Mechanism B: execution-time, via the column constraint. -------------

  it("raises at execution: INSERT ... VALUES into a plain NOT NULL column", async () => {
    expect(await errorOf("INSERT INTO plain VALUES ($1)", [null])).toContain(CONSTRAINT_ERROR);
  });

  it("does not raise when no row reaches the plain NOT NULL column", async () => {
    // The design consequence: mechanism-B `notNull` claims are existential
    // ("there is an execution in which NULL raises") and their verification
    // must witness the raise in a state that routes a row into the target.
    expect(await errorOf("INSERT INTO plain SELECT $1 FROM empty_t", [null])).toBeNull();
  });

  it("types the parameter as the BASE type at mechanism-B sites", async () => {
    expect(await paramTypes("INSERT INTO plain VALUES ($1)")).toBe("{text}");
  });

  // --- The non-mechanism: comparison. --------------------------------------

  it("a comparison against a NOT NULL domain column accepts NULL", async () => {
    // Operators resolve on the base type; the domain constraint is never
    // consulted. This is why a comparison position never makes a parameter
    // `notNull`, whatever the column's constraints say — and why "the column
    // is NOT NULL" is the wrong reason to restrict `$1` in `col = $1`.
    expect(await errorOf("SELECT * FROM d WHERE n = $1", [null])).toBeNull();
  });

  it("types the comparison parameter as the BASE type", async () => {
    expect(await paramTypes("SELECT * FROM d WHERE n = $1")).toBe("{text}");
  });

  // --- Mechanism C: execution-time, via value flow. -------------------------

  it("raises at evaluation: NULL flowing through a strict operator into a domain coercion", async () => {
    expect(await errorOf("SELECT ($1 || 'x')::uname", [null])).toContain(DOMAIN_ERROR);
  });

  it("does NOT raise when the expression is never evaluated — unlike mechanism A", async () => {
    // The property that separates C from A: the parameter stays base-typed,
    // so nothing happens at Bind, and zero rows mean zero evaluations. This
    // is why mechanism C never licenses output narrowing.
    expect(await errorOf("SELECT ($1 || 'x')::uname FROM empty_t", [null])).toBeNull();
  });

  it("types the parameter as the BASE type at mechanism-C sites", async () => {
    expect(await paramTypes("SELECT ($1 || 'x')::uname")).toBe("{text}");
  });

  it("a COALESCE guard absorbs the NULL before the coercion", async () => {
    expect(await errorOf("SELECT (COALESCE($1, 'd') || 'x')::uname", [null])).toBeNull();
  });

  it("NULLIF propagates its left operand only", async () => {
    expect(await errorOf("SELECT NULLIF($1, 'q')::uname", [null])).toContain(DOMAIN_ERROR);
    // A NULL right side just fails the equality; the left value passes through.
    expect(await errorOf("SELECT NULLIF('a', $1)::uname", [null])).toBeNull();
  });

  it("value flow into a domain-typed function argument raises at the call", async () => {
    expect(await errorOf("SELECT takes_dom($1 || 'x')", [null])).toContain(DOMAIN_ERROR);
  });

  it("value flow into a plain NOT NULL column raises via the constraint", async () => {
    expect(await errorOf("INSERT INTO plain VALUES ($1 || 'x')", [null])).toContain(
      CONSTRAINT_ERROR,
    );
  });

  // --- MERGE arms. ----------------------------------------------------------

  const MERGE_E =
    "MERGE INTO m USING (VALUES (1)) s(sid) ON m.id = s.sid " +
    "WHEN MATCHED THEN UPDATE SET e = $1 " +
    "WHEN NOT MATCHED THEN INSERT (id) VALUES (s.sid)";

  it("a MERGE arm's constraint site raises only when the arm fires", async () => {
    // Conditional mechanism B: with an empty target the NOT MATCHED arm
    // inserts and the MATCHED arm's SET never evaluates.
    expect(await errorOf(MERGE_E, [null])).toBeNull();
    await pg.exec("INSERT INTO m (id) VALUES (1);");
    expect(await errorOf(MERGE_E, [null])).toContain(CONSTRAINT_ERROR);
    await pg.exec("DELETE FROM m;");
  });

  it("a MERGE arm's domain-typed SET rejects at Bind, arm or no arm", async () => {
    // Mechanism A transcends the arm exactly as it transcends CASE guards
    // and ON CONFLICT: the parameter is TYPED at parse analysis.
    const sql = MERGE_E.replace("SET e =", "SET n =");
    expect(await errorOf(sql, [null])).toContain(DOMAIN_ERROR); // target is EMPTY
    expect(await paramTypes(sql)).toBe("{uname}");
  });

  it("a parameter flowing through the SOURCE into a rejecting column raises", async () => {
    // The behaviour behind source value-flow attribution: $1 → s.sv → NOT
    // NULL column. The collector attributes this through the derived-table
    // column map; param-merge-source.sql is the trigger fixture, and the
    // multi-row quantifier cases are pinned by param-merge-source-multirow
    // and param-narrow-multirow.
    expect(
      await errorOf(
        "MERGE INTO m USING (VALUES ($1::text)) s(sv) ON m.id = 999 " +
          "WHEN NOT MATCHED THEN INSERT (id, e) VALUES (1, s.sv)",
        [null],
      ),
    ).toContain(CONSTRAINT_ERROR);
  });

  // --- Type deduction boundaries. ------------------------------------------

  it("rejects conflicting deductions rather than letting the domain win", async () => {
    // A bare projection deduces text for $1; the cast deduces uname.
    // PostgreSQL refuses the statement instead of unifying — so "one
    // domain-typed use types every use" holds only for uses that deduce no
    // type of their own (an operator operand qualifies; a bare projection
    // does not). A statement rejected here has no contract at all.
    expect(await errorOf("SELECT $1, $1::uname", [null])).toContain(
      "inconsistent types deduced for parameter $1",
    );
  });

  it("deduces parameter types from the FIRST use, order-dependently", async () => {
    // The optional-filter idiom's gotcha: IS NULL deduces nothing, and a
    // later comparison does not rescue the parameter. Reversing the
    // disjuncts (or casting explicitly) is what makes the idiom preparable.
    expect(await errorOf("SELECT 1 WHERE $1 IS NULL OR 'x' = $1", [null])).toContain(
      "could not determine data type of parameter $1",
    );
    expect(await errorOf("SELECT 1 WHERE 'x' = $1 OR $1 IS NULL", [null])).toBeNull();
  });

  // --- Parameter numbering. -------------------------------------------------

  it("rejects a statement whose parameter numbers have gaps", async () => {
    // The contract can be a dense positional array $1..$n because PostgreSQL
    // refuses anything else before it would ever execute.
    expect(await errorOf("SELECT $2::int", [1, 2])).toContain(
      "could not determine data type of parameter $1",
    );
  });

  // --- Generated columns. ---------------------------------------------------
  //
  // Every write that would reach a GENERATED ALWAYS column — stored or
  // identity — is rejected at parse analysis, BEFORE the nullability
  // contract could matter: a rejected statement has no contract. This is
  // also what makes the written-value map's positional prefix-zip sound:
  // the implicit column list does NOT skip generated columns, so any VALUES
  // row long enough to reach one positionally is refused outright, and
  // positions before the first generated column always align. The DEFAULT
  // keyword is the one legal spelling, and the map already treats it as
  // proving nothing.

  it("rejects writes to GENERATED ALWAYS columns before execution", async () => {
    await pg.exec(`
      CREATE TABLE gen_t (a int, gen int GENERATED ALWAYS AS (a * 2) STORED, b text);
      CREATE TABLE gid_t (id int GENERATED ALWAYS AS IDENTITY, v text);
    `);
    expect(await errorOf("INSERT INTO gen_t (a, gen, b) VALUES ($1, $2, $3)", [1, 2, "x"]))
      .toContain('cannot insert a non-DEFAULT value into column "gen"');
    expect(await errorOf("UPDATE gen_t SET gen = $1", [5])).toContain(
      'column "gen" can only be updated to DEFAULT',
    );
    // The implicit column list includes the generated column: reaching it
    // positionally is refused, never silently skipped.
    expect(await errorOf("INSERT INTO gen_t VALUES ($1, $2, $3)", [1, 2, "x"])).toContain(
      'cannot insert a non-DEFAULT value into column "gen"',
    );
    expect(await errorOf("INSERT INTO gid_t (id, v) VALUES ($1, $2)", [5, "x"])).toContain(
      'cannot insert a non-DEFAULT value into column "id"',
    );
    expect(await errorOf("UPDATE gid_t SET id = $1", [5])).toContain(
      'column "id" can only be updated to DEFAULT',
    );
    // DEFAULT is the legal spelling and executes.
    expect(
      await errorOf("INSERT INTO gen_t (a, gen, b) VALUES ($1, DEFAULT, $2)", [3, "y"]),
    ).toBeNull();
  });

  // --- Mechanism E: CHECK rejection of a written NULL. ----------------------
  //
  // docs/argument-nullability.md, "Mechanism E": ground the parsed CHECK
  // body with the statement's written literals, evaluate only fully-closed
  // subtrees through PostgreSQL, reduce by three-valued algebra, analyze the
  // residue. These pins hold the substitution semantics that make the
  // evaluation step answer the same question enforcement asks.

  it("a grounded CHECK body that evaluates FALSE is the write that raises", async () => {
    // The subscription shape: seats = 5 written beside the tested NULL.
    // Column refs replaced by the written values, each cast to the column's
    // declared type, and the grounded body answers what the INSERT does.
    // FALSE is the claim condition.
    const g = await pg.query<{ g: boolean }>(
      "SELECT (5::integer <= 1 OR NULL::text IS NOT NULL) AS g",
    );
    expect(g.rows[0]!.g).toBe(false);
    expect(await errorOf("INSERT INTO sub VALUES (5, NULL)", [])).toContain(
      "violates check constraint",
    );
  });

  it("a grounded CHECK body that evaluates NULL passes — claim only on FALSE", async () => {
    const g = await pg.query<{ g: boolean | null }>(
      "SELECT (NULL::integer <= 1 OR NULL::text IS NOT NULL) AS g",
    );
    expect(g.rows[0]!.g).toBeNull();
    expect(await errorOf("INSERT INTO sub VALUES (NULL, NULL)", [])).toBeNull();
  });

  it("bp control: substitution must cast to the COLUMN's type, or it answers a different question", async () => {
    // char(4) blank-pads before comparing: 'a' = 'a ' is TRUE as bpchar and
    // FALSE as text, so bp_ctl's CHECK (c = 'a ') ADMITS the written 'a'.
    // A text-typed grounding would evaluate FALSE and claim a rejection
    // that never happens; the cast to the declared type is what makes
    // evaluation agree with enforcement.
    const asText = await pg.query<{ g: boolean }>("SELECT ('a' = 'a ') AS g");
    const asBp = await pg.query<{ g: boolean }>(
      "SELECT ('a'::char(4) = 'a '::char(4)) AS g",
    );
    expect(asText.rows[0]!.g).toBe(false);
    expect(asBp.rows[0]!.g).toBe(true);
    expect(await errorOf("INSERT INTO bp_ctl VALUES ('a')", [])).toBeNull();
  });

  it("a STABLE body's analysis-time answer does not bind enforcement — evaluate immutable only", async () => {
    // cur_max() reads a GUC: TRUE when evaluated under app.max_n=10, and
    // the same write raises after the setting moves. Evaluation is
    // therefore gated on provolatile='i' for every function and operator in
    // a subtree; a stable one leaves the subtree unevaluated, no claim.
    await pg.exec("SET app.max_n = '10'");
    const before = await pg.query<{ g: boolean }>("SELECT (5 <= cur_max()) AS g");
    expect(before.rows[0]!.g).toBe(true);
    await pg.exec("SET app.max_n = '1'");
    expect(await errorOf("INSERT INTO lim VALUES (5)", [])).toContain(
      "violates check constraint",
    );
    const vol = await pg.query<{ provolatile: string }>(
      "SELECT provolatile FROM pg_proc WHERE proname = 'cur_max'",
    );
    expect(vol.rows[0]!.provolatile).toBe("s");
  });

  it("multi-row VALUES: the CHECK fires per row, and one FALSE row rejects the whole statement", async () => {
    // Per-row grounding, existential claim over rows: the first row passes,
    // the second grounds FALSE, the statement raises and writes NOTHING —
    // measured outside any explicit transaction.
    let err: string | null = null;
    try {
      await pg.exec("INSERT INTO sub VALUES (0, NULL), (5, NULL)");
    } catch (e) {
      err = (e as Error).message;
    }
    expect(err).toContain("violates check constraint");
    const n = await pg.query<{ n: number }>("SELECT count(*)::int AS n FROM sub");
    expect(n.rows[0]!.n).toBe(0);
  });

  it("closed subtrees batch: one SELECT evaluates every grounded subtree", async () => {
    const r = await pg.query<{ e1: boolean; e2: boolean; e3: boolean }>(
      "SELECT (5::integer <= 1) AS e1, (NULL::text IS NOT NULL) AS e2, " +
        "('a'::char(4) = 'a '::char(4)) AS e3",
    );
    expect(r.rows[0]).toEqual({ e1: false, e2: false, e3: true });
  });

  it("volatility gates CASTS, not just calls: the I/O functions carry it", async () => {
    // docs/subtree-evaluation.md: `5::integer` folds and `'now'::timestamptz`
    // never does, because a literal cast invokes the target type's INPUT
    // function — and PostgreSQL declares the datetime family's I/O stable
    // (DateStyle/TimeZone state), while the int/text/numeric family is
    // immutable. array_in is stable too (elements could be dates), which is
    // why no array type is ever a closed cast target. The evaluator's whole
    // safe-type capture is this pg_proc column, so a PostgreSQL release that
    // moves one of these rows must fail here, with the consequence named.
    const vol = async (fn: string) => {
      const r = await pg.query<{ v: string }>(
        `SELECT provolatile AS v FROM pg_proc
         WHERE proname = $1 AND pronamespace = 'pg_catalog'::regnamespace`,
        [fn],
      );
      return r.rows[0]!.v;
    };
    expect(await vol("int4in")).toBe("i");
    expect(await vol("textin")).toBe("i");
    expect(await vol("numeric_in")).toBe("i");
    expect(await vol("date_in")).toBe("s");
    expect(await vol("timestamptz_in")).toBe("s");
    expect(await vol("array_in")).toBe("s");
  });

  it("a stable INPUT function makes even an immutable call session-dependent", async () => {
    // The parse-time face of the same gate: date_part(text, date) is
    // IMMUTABLE, yet the answer moves with DateStyle, because coercing the
    // written literal to date runs date_in under session state. Volatility
    // of the call alone is therefore not the closure question — every type
    // an expression touches must have immutable I/O, or the analysis-time
    // answer does not bind other sessions.
    await pg.exec("SET datestyle = 'ISO, MDY'");
    const mdy = await pg.query<{ v: number }>(
      "SELECT date_part('day', '1/2/2020'::date) AS v",
    );
    await pg.exec("SET datestyle = 'ISO, DMY'");
    const dmy = await pg.query<{ v: number }>(
      "SELECT date_part('day', '1/2/2020'::date) AS v",
    );
    await pg.exec("SET datestyle = DEFAULT");
    expect(mdy.rows[0]!.v).toBe(2);
    expect(dmy.rows[0]!.v).toBe(1);
  });

  it("'now' re-evaluates per statement — the cast is never a constant", async () => {
    const a = await pg.query<{ v: string }>("SELECT 'now'::timestamptz::text AS v");
    await new Promise(resolve => setTimeout(resolve, 5));
    const b = await pg.query<{ v: string }>("SELECT 'now'::timestamptz::text AS v");
    expect(a.rows[0]!.v).not.toBe(b.rows[0]!.v);
  });

  it("result_types answers in the same round trip as the values", async () => {
    // The evaluator's protocol: PREPARE the batched SELECT (through the same
    // single-statement query path its callback uses), then one SELECT
    // returns every subtree's value AND the prepared statement's
    // result_types (pg_prepared_statements, present since PG 17) as a
    // text[] column beside them.
    await pg.query("PREPARE eval_probe AS SELECT 2 + 2 AS e0, 'a'::char(4) AS e1, NULL::text AS e2");
    const r = await pg.query<{ __types: string[]; e0: number; e1: string; e2: string | null }>(
      "SELECT (SELECT result_types::text[] FROM pg_prepared_statements" +
        " WHERE name = 'eval_probe') AS __types, __q.*" +
        " FROM (SELECT 2 + 2 AS e0, 'a'::char(4) AS e1, NULL::text AS e2) AS __q",
    );
    expect(r.rows[0]).toEqual({
      __types: ["integer", "character", "text"],
      e0: 4,
      e1: "a   ",
      e2: null,
    });
    await pg.query("DEALLOCATE eval_probe");
  });

  it("a raising subtree still PREPAREs: types stay readable, values retry singly", async () => {
    // `5 / 0` raises at evaluation, not at parse analysis — so the batch's
    // PREPARE succeeds and result_types is already known when the value
    // fetch fails. The evaluator's fallback re-runs each subtree in its own
    // SELECT; the raising one contributes nothing and the rest still answer.
    await pg.query("PREPARE eval_probe2 AS SELECT 5 / 0 AS e0, 2 + 2 AS e1");
    const t = await pg.query<{ t: string[] }>(
      "SELECT result_types::text[] AS t FROM pg_prepared_statements WHERE name = 'eval_probe2'",
    );
    expect(t.rows[0]!.t).toEqual(["integer", "integer"]);
    expect(await errorOf("SELECT 5 / 0 AS e0, 2 + 2 AS e1", [])).toContain("division by zero");
    const ok = await pg.query<{ v: number }>("SELECT 2 + 2 AS v");
    expect(ok.rows[0]!.v).toBe(4);
    await pg.query("DEALLOCATE eval_probe2");
  });

  // --- Unknown-literal landing rules (typed operand tracking rests here). ---
  //
  // docs/subtree-evaluation.md, "Typed operand tracking": a bare string
  // literal is UNTYPED — pseudo-type unknown — and PostgreSQL assigns it a
  // type at its first consumption site, by rules these pins hold. The rung's
  // closure gate applies exactly these rules before candidate elimination,
  // so a PostgreSQL release that moves one must fail here with the design
  // consequence named.

  it("a bare literal is unknown; the statement's OUTPUT coerces it to text", async () => {
    const r = await pg.query<{ t: string }>("SELECT pg_typeof('a')::text AS t");
    expect(r.rows[0]!.t).toBe("unknown");
    await pg.query("PREPARE landing_out AS SELECT 'a'");
    const rt = await pg.query<{ t: string[] }>(
      "SELECT result_types::text[] AS t FROM pg_prepared_statements WHERE name = 'landing_out'",
    );
    expect(rt.rows[0]!.t).toEqual(["text"]);
    await pg.query("DEALLOCATE landing_out");
  });

  it("all-unknown operands land on text; one known operand types the other side", async () => {
    const r = await pg.query<{ both: string; one: string; unified: string }>(
      "SELECT pg_typeof('a' || 'b')::text AS both, pg_typeof(5 + '3')::text AS one," +
        " pg_typeof(COALESCE('a', 'b'))::text AS unified",
    );
    expect(r.rows[0]).toEqual({ both: "text", one: "integer", unified: "text" });
  });

  it("unknown never resolves silently where the rules run out", async () => {
    // The two dead ends the gate may rely on: a polymorphic parameter
    // cannot be instantiated from unknown, and cross-category unary
    // candidates refuse rather than pick — both RAISE, so a statement that
    // reaches them has no answers to be wrong about.
    expect(await errorOf("SELECT array_ndims('{1,2}')", [])).toContain(
      "could not determine polymorphic type",
    );
    expect(await errorOf("SELECT - '5'", [])).toContain("operator is not unique");
  });

  it("the signature forks the survivor gate splits by, as pg_proc declares them", async () => {
    // One operator name, opposite volatilities: `'a' || 'b'` resolves
    // textcat (immutable, foldable) while `'a' || 5` resolves textanycat
    // (STABLE — it renders through the argument type's output function).
    // A name-level gate cannot split these; the per-signature capture the
    // rung adds keys on exactly this data. ts_match_tt is the guard's
    // counterpart: `text @@ text` is stable ITSELF (default_text_search_config),
    // so no gate refinement may ever fold it. length's bytea/name row is
    // the same fact on the function side, already carried by the arity axis.
    const vol = async (fn: string) => {
      const r = await pg.query<{ v: string }>(
        `SELECT provolatile AS v FROM pg_proc
         WHERE proname = $1 AND pronamespace = 'pg_catalog'::regnamespace`,
        [fn],
      );
      return r.rows[0]!.v;
    };
    expect(await vol("textcat")).toBe("i");
    expect(await vol("textanycat")).toBe("s");
    expect(await vol("anytextcat")).toBe("s");
    expect(await vol("ts_match_tt")).toBe("s");
  });

  it("btree strategy numbers are per-name consensus; inequality has none", async () => {
    // The interval-exclusivity rung's shape source
    // (docs/subtree-evaluation.md): the strategy number IS the set shape,
    // and every pg_catalog btree family agrees per name — a release that
    // splits one must fail here, because the capture would silently drop
    // the name. `<>` carries no strategy anywhere (PostgreSQL does not
    // index inequality); its complement shape rides oprnegate instead,
    // where the geometric rows negate `~=` — an operator with NO btree
    // row, which is why the equality-negator capture may tolerate it.
    const strat = await pg.query<{ name: string; strategies: number[] }>(
      `SELECT o.oprname AS name, array_agg(DISTINCT a.amopstrategy)::int[] AS strategies
       FROM pg_amop a
       JOIN pg_operator o ON o.oid = a.amopopr
       JOIN pg_opfamily f ON f.oid = a.amopfamily
       JOIN pg_am am ON am.oid = f.opfmethod
       WHERE am.amname = 'btree' AND o.oprnamespace = 'pg_catalog'::regnamespace
         AND o.oprname IN ('<', '<=', '=', '>=', '>', '<>')
       GROUP BY o.oprname ORDER BY 1;`,
    );
    expect(Object.fromEntries(strat.rows.map(r => [r.name, r.strategies]))).toEqual({
      "<": [1],
      "<=": [2],
      "=": [3],
      ">": [5],
      ">=": [4],
    });
    const neg = await pg.query<{ negator: string }>(
      `SELECT DISTINCT n.oprname AS negator FROM pg_operator o
       JOIN pg_operator n ON n.oid = o.oprnegate
       WHERE o.oprname = '<>' AND o.oprnamespace = 'pg_catalog'::regnamespace
       ORDER BY 1;`,
    );
    expect(neg.rows.map(r => r.negator)).toEqual(["=", "~="]);
    const tildeBtree = await pg.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM pg_amop a
       JOIN pg_operator o ON o.oid = a.amopopr
       JOIN pg_opfamily f ON f.oid = a.amopfamily
       JOIN pg_am am ON am.oid = f.opfmethod
       WHERE am.amname = 'btree' AND o.oprname = '~=';`,
    );
    expect(tildeBtree.rows[0]!.n).toBe(0);
    const lengthRows = await pg.query<{ args: string }>(
      `SELECT pg_get_function_identity_arguments(oid) AS args FROM pg_proc
       WHERE proname = 'length' AND pronamespace = 'pg_catalog'::regnamespace
         AND provolatile <> 'i'`,
    );
    expect(lengthRows.rows.map(r => r.args)).toEqual(["bytea, name"]);
  });

  // --- Partition bounds (docs/subtree-evaluation.md, "Partition-bound facts").
  //
  // A partition's bound is enforced on every stored row — by tuple routing,
  // by direct-insert rejection, and by ATTACH validation — so a DIRECT scan
  // of a partition may feed `pg_get_partition_constraintdef` to the kernel
  // as a validated-CHECK-grade fact. These pins hold the renderings the
  // capture parses and the enforcement facts the soundness argument rests
  // on; a release that moves one must fail here with the consequence named.

  const partDef = async (rel: string) => {
    const r = await pg.query<{ d: string | null }>(
      `SELECT pg_get_partition_constraintdef('${rel}'::regclass) AS d`,
    );
    return r.rows[0]!.d;
  };

  it("range bounds render with every key column's IS NOT NULL in front", async () => {
    // The prefix is what hands a direct partition scan the key's notNull for
    // free, and the comparison conjuncts arrive pre-rendered for the
    // interval machinery. MINVALUE/MAXVALUE drop their arm, never the prefix.
    expect(await partDef("pb_r1")).toBe("((id IS NOT NULL) AND (id >= 0) AND (id < 100))");
    expect(await partDef("pb_rmax")).toBe("((id IS NOT NULL) AND (id >= 100))");
    expect(await partDef("pb_rmin")).toBe("((id IS NOT NULL) AND (id < 0))");
    // Multi-column: one prefix per key column, then lexicographic arms.
    expect(await partDef("pb_mr1")).toBe(
      "((a IS NOT NULL) AND (b IS NOT NULL) AND ((a > 0) OR ((a = 0) AND (b >= 0))) AND ((a < 10) OR ((a = 10) AND (b < 10))))",
    );
  });

  it("list bounds render as = ANY; a NULL-listing bound trades the prefix for an IS NULL disjunct", async () => {
    expect(await partDef("pb_l1")).toBe(
      "((k IS NOT NULL) AND (k = ANY (ARRAY['a'::text, 'b'::text])))",
    );
    // NULL in the value list: no IS NOT NULL, and the remaining single value
    // collapses to bare equality — the parser must take both spellings.
    expect(await partDef("pb_ln")).toBe("((k IS NULL) OR (k = 'z'::text))");
  });

  it("DEFAULT partitions render the negated union of their siblings — the refused shape", async () => {
    expect(await partDef("pb_rd")).toBe(
      "(NOT ((id IS NOT NULL) AND ((id < 0) OR ((id >= 0) AND (id < 100)) OR (id >= 100))))",
    );
    expect(await partDef("pb_ld")).toBe(
      "(NOT ((k IS NULL) OR (k = ANY (ARRAY['a'::text, 'b'::text, 'z'::text]))))",
    );
  });

  it("hash bounds render as a satisfies_hash_partition call over the parent's OID", async () => {
    // No interval or list shape, and the rendering embeds a database-local
    // OID — the refusal is structural, not a first-wave economy.
    const oid = (
      await pg.query<{ o: string }>("SELECT 'pb_h'::regclass::oid::text AS o")
    ).rows[0]!.o;
    expect(await partDef("pb_h0")).toBe(`satisfies_hash_partition('${oid}'::oid, 2, 0, id)`);
  });

  it("a nested leaf renders its whole ancestor conjunction; roots render NULL", async () => {
    // One def carries every level's facts (duplicated, harmlessly), so a
    // direct leaf scan needs no tree walk. A partitioned ROOT has no bound —
    // the capture keys on relispartition, not relkind.
    expect(await partDef("pb_nest1a")).toBe(
      "((id IS NOT NULL) AND (id >= 0) AND (id < 100) AND (id IS NOT NULL) AND (id >= 0) AND (id < 50))",
    );
    expect(await partDef("pb_nest1")).toBe("((id IS NOT NULL) AND (id >= 0) AND (id < 100))");
    expect(await partDef("pb_r")).toBeNull();
    expect(await partDef("pb_nest")).toBeNull();
  });

  it("NULL routing: range NULL keys go to DEFAULT; a non-default range partition never holds one", async () => {
    // These inserts persist; the TRUE-strength pin below reads them.
    const routed = await pg.query<{ id: number | null; part: string }>(
      "INSERT INTO pb_r VALUES (0,'a'), (99,'b'), (100,'c'), (-5,'d'), (NULL,'e') RETURNING id, tableoid::regclass::text AS part",
    );
    expect(routed.rows.map(r => r.part)).toEqual(["pb_r1", "pb_r1", "pb_rmax", "pb_rmin", "pb_rd"]);
    // Direct insert enforces the bound — FALSE for a NULL key.
    expect(await errorOf("INSERT INTO pb_r1 VALUES (NULL, 'x')", [])).toContain(
      "violates partition constraint",
    );
    // Without a DEFAULT, an unroutable key raises before any write; NULL in
    // ANY range key column is unroutable to a non-default partition.
    expect(await errorOf("INSERT INTO pb_mr VALUES (5, NULL)", [])).toContain(
      "no partition of relation",
    );
  });

  it("NULL routing: list NULL keys reach the NULL-listing partition; hash routes NULL like a value", async () => {
    // A NON-default list partition can hold NULL — its bound stays TRUE
    // through the IS NULL disjunct, so the fact survives. Hash partitions
    // hold NULL keys behind a shapeless bound, which the refusal covers.
    const list = await pg.query<{ part: string }>(
      "INSERT INTO pb_l VALUES ('a'), (NULL), ('z'), ('q') RETURNING tableoid::regclass::text AS part",
    );
    expect(list.rows.map(r => r.part)).toEqual(["pb_l1", "pb_ln", "pb_ln", "pb_ld"]);
    const hash = await pg.query<{ part: string }>(
      "INSERT INTO pb_h VALUES (1), (2), (3), (NULL) RETURNING tableoid::regclass::text AS part",
    );
    expect(hash.rows.map(r => r.part)).toEqual(["pb_h0", "pb_h0", "pb_h1", "pb_h0"]);
  });

  it("ATTACH validates every existing row against the bound; DETACH clears it", async () => {
    // The fact's soundness on attached partitions rests on this validation.
    // Its own parent: pb_r's partitions already cover the whole line, and
    // an overlapping bound is refused before validation would run.
    await pg.exec(`
      CREATE TABLE pb_ar (id int, v text) PARTITION BY RANGE (id);
      CREATE TABLE pb_att (id int, v text);
      INSERT INTO pb_att VALUES (500, 'x');
    `);
    expect(
      await errorOf("ALTER TABLE pb_ar ATTACH PARTITION pb_att FOR VALUES FROM (200) TO (300)", []),
    ).toContain('partition constraint of relation "pb_att" is violated by some row');
    await pg.exec("DELETE FROM pb_att; INSERT INTO pb_att VALUES (250, 'ok');");
    await pg.exec("ALTER TABLE pb_ar ATTACH PARTITION pb_att FOR VALUES FROM (200) TO (300);");
    expect(await partDef("pb_att")).toBe(
      "((id IS NOT NULL) AND (id >= 200) AND (id < 300))",
    );
    expect(await errorOf("INSERT INTO pb_att VALUES (500, 'y')", [])).toContain(
      "violates partition constraint",
    );
    // DETACH removes the bound with the membership: no stale fact survives.
    await pg.exec("ALTER TABLE pb_ar DETACH PARTITION pb_att;");
    const r = await pg.query<{ no_bound: boolean; relispartition: boolean }>(
      "SELECT relpartbound IS NULL AS no_bound, relispartition FROM pg_class WHERE relname = 'pb_att'",
    );
    expect(r.rows[0]).toEqual({ no_bound: true, relispartition: false });
    expect(await partDef("pb_att")).toBeNull();
  });

  // --- Write-side enforcement (the write-side rung's pre-work,
  // docs/subtree-evaluation.md "Write-side rung"; the direct-INSERT case is
  // pinned in the NULL-routing pins above). The grounder may feed a
  // direct-named partition's bound for every DML shape it grounds: UPDATE,
  // MERGE arms and ON CONFLICT enforce the bound on the new row exactly as
  // direct INSERT does, per row on multi-row VALUES — and naming the PARENT
  // enforces nothing, because routing moves the row instead.

  it("UPDATE on a direct-named partition enforces the bound on the new row; the parent row-moves instead", async () => {
    await pg.exec(`
      CREATE TABLE pbw (id int, v text) PARTITION BY RANGE (id);
      CREATE TABLE pbw_lo PARTITION OF pbw FOR VALUES FROM (0) TO (100);
      CREATE TABLE pbw_hi PARTITION OF pbw FOR VALUES FROM (100) TO (200);
      CREATE TABLE pbw_def PARTITION OF pbw DEFAULT;
      CREATE UNIQUE INDEX pbw_lo_uq ON pbw_lo (id);
      INSERT INTO pbw VALUES (10, 'a'), (150, 'b');
    `);
    expect(await errorOf("UPDATE pbw_lo SET id = 500 WHERE id = 10", [])).toContain(
      "violates partition constraint",
    );
    expect(await errorOf("UPDATE pbw_lo SET id = $1 WHERE id = 10", [null])).toContain(
      "violates partition constraint",
    );
    // An in-bound new row is taken (persists: errorOf rolls back).
    const inBound = await pg.query<{ id: number }>(
      "UPDATE pbw_lo SET id = 20 WHERE id = 10 RETURNING id",
    );
    expect(inBound.rows).toEqual([{ id: 20 }]);
    // Naming the parent, the same new rows MOVE: into pbw_hi, NULL into
    // DEFAULT — no raise anywhere, which is why parent writes need no gate.
    const moved = await pg.query<{ part: string }>(
      "UPDATE pbw SET id = 120 WHERE id = 20 RETURNING tableoid::regclass::text AS part",
    );
    expect(moved.rows.map(r => r.part)).toEqual(["pbw_hi"]);
    const toNull = await pg.query<{ part: string }>(
      "UPDATE pbw SET id = NULL WHERE id = 120 RETURNING tableoid::regclass::text AS part",
    );
    expect(toNull.rows.map(r => r.part)).toEqual(["pbw_def"]);
  });

  it("MERGE arms targeting a partition enforce the bound like their plain counterparts", async () => {
    const mergeIns = (val: string) =>
      `MERGE INTO pbw_lo t USING (VALUES (1)) s(x) ON t.id = 999` +
      ` WHEN NOT MATCHED THEN INSERT (id, v) VALUES (${val}, 'm')`;
    expect(await errorOf(mergeIns("$1"), [null])).toContain("violates partition constraint");
    expect(await errorOf(mergeIns("500"), [])).toContain("violates partition constraint");
    await pg.query(mergeIns("55")); // in-bound arm succeeds — and plants the matched row

    const mergeUpd = (val: string) =>
      `MERGE INTO pbw_lo t USING (VALUES (1)) s(x) ON t.id = 55` +
      ` WHEN MATCHED THEN UPDATE SET id = ${val}`;
    expect(await errorOf(mergeUpd("$1"), [null])).toContain("violates partition constraint");
    expect(await errorOf(mergeUpd("500"), [])).toContain("violates partition constraint");
  });

  it("ON CONFLICT on a partition: the proposed row is bound-checked; the DO UPDATE arm raises only when the key would leave", async () => {
    // The proposed INSERT row is checked before the arbiter ever looks.
    expect(
      await errorOf(
        "INSERT INTO pbw_lo (id, v) VALUES ($1, 'x') ON CONFLICT (id) DO UPDATE SET v = 'y'",
        [null],
      ),
    ).toContain("violates partition constraint");
    // The update arm may move the key WITHIN the bound (persists: the MERGE
    // pin planted 55)...
    await pg.query(
      "INSERT INTO pbw_lo (id, v) VALUES (55, 'x') ON CONFLICT (id) DO UPDATE SET id = 56",
    );
    // ...but a NULL or out-of-bound key raises when the arm runs — the row
    // cannot leave its partition through ON CONFLICT.
    expect(
      await errorOf(
        "INSERT INTO pbw_lo (id, v) VALUES (56, 'x') ON CONFLICT (id) DO UPDATE SET id = $1",
        [null],
      ),
    ).toContain("invalid ON UPDATE specification");
    expect(
      await errorOf(
        "INSERT INTO pbw_lo (id, v) VALUES (56, 'x') ON CONFLICT (id) DO UPDATE SET id = 500",
        [],
      ),
    ).toContain("invalid ON UPDATE specification");
    // No conflicting row → the arm never runs → no raise from its values:
    // the arm's claims are existential, like every UPDATE claim.
    expect(
      await errorOf(
        "INSERT INTO pbw_lo (id, v) VALUES (60, 'x') ON CONFLICT (id) DO UPDATE SET id = $1",
        [null],
      ),
    ).toBeNull();
  });

  it("multi-row VALUES enforce the bound per row; one violating row rejects the whole statement", async () => {
    // No BEGIN wrapper: the statement is its own transaction, so the zero
    // count below is PostgreSQL's atomicity, not a harness rollback.
    let error: string | null = null;
    try {
      await pg.query("INSERT INTO pbw_lo (id, v) VALUES (61, 'a'), ($1, 'b'), (62, 'c')", [null]);
    } catch (e) {
      error = (e as Error).message;
    }
    expect(error).toContain("violates partition constraint");
    const kept = await pg.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM pbw_lo WHERE id IN (61, 62)",
    );
    expect(kept.rows[0]!.n).toBe(0);
  });

  it("an intermediate partition's own bound gates direct writes before routing — a DEFAULT child rescues nothing", async () => {
    await pg.exec(`
      CREATE TABLE pbn (id int, v text) PARTITION BY RANGE (id);
      CREATE TABLE pbn_1 PARTITION OF pbn FOR VALUES FROM (0) TO (100) PARTITION BY RANGE (id);
      CREATE TABLE pbn_1a PARTITION OF pbn_1 FOR VALUES FROM (0) TO (50);
      CREATE TABLE pbn_1d PARTITION OF pbn_1 DEFAULT;
    `);
    expect(await errorOf("INSERT INTO pbn_1 (id, v) VALUES ($1, 'x')", [null])).toContain(
      "violates partition constraint",
    );
    expect(await errorOf("INSERT INTO pbn_1 (id, v) VALUES (500, 'x')", [])).toContain(
      "violates partition constraint",
    );
    // In-bound but outside every non-default child: the DEFAULT child takes
    // it — the intermediate's own bound was the gate, not its children's.
    const routed = await pg.query<{ part: string }>(
      "INSERT INTO pbn_1 (id, v) VALUES (75, 'x') RETURNING tableoid::regclass::text AS part",
    );
    expect(routed.rows.map(r => r.part)).toEqual(["pbn_1d"]);
    expect(await errorOf("UPDATE pbn_1 SET id = $1 WHERE id = 75", [null])).toContain(
      "violates partition constraint",
    );
  });

  // --- Settings-independent datetime literals — design B's exhaustive sweep.
  //
  // docs/subtree-evaluation.md, "Settings-independent datetime literals": a
  // literal whose ISO spelling fixes every field's ROLE parses identically
  // under each of the finitely many DateStyle values, so the shape gate
  // needs no settings assumption — and the invariance is MEASURED here over
  // the full order/style product, not argued. Values compare via make_date/
  // make_timestamp/make_timestamptz so output rendering cannot confound the
  // input question. A release that moves one of these must fail here: the
  // gate's soundness IS this sweep.

  const DATESTYLES = ["ISO", "Postgres", "SQL", "German"].flatMap(style =>
    ["MDY", "DMY", "YMD"].map(order => `${style}, ${order}`),
  );

  const underEveryDateStyle = async (expr: string): Promise<Set<string>> => {
    const seen = new Set<string>();
    for (const ds of DATESTYLES) {
      await pg.exec(`SET datestyle = '${ds}'`);
      try {
        const r = await pg.query<{ v: unknown }>(`SELECT (${expr}) AS v`);
        seen.add(String(r.rows[0]!.v));
      } catch (e) {
        seen.add(`ERROR:${((e as Error).message.split("\n")[0] ?? "").includes("out of range") ? "range" : "other"}`);
      }
    }
    await pg.exec("SET datestyle = DEFAULT");
    return seen;
  };

  it("every admitted shape parses to the SAME value under all 12 DateStyle settings", async () => {
    // The admitted shapes: strict-ISO date and timestamp (T separator,
    // fractional seconds, omitted seconds, surrounding spaces, hour 24 and
    // a padded low year among the edges), and timestamptz WITH an explicit
    // numeric offset. Non-padded month/day is invariant — a 4-digit
    // leading year fixes the field roles — and the widening landed
    // (2026-08-16): one line per widened family below, mixed paddings
    // included, since the regex language admits them all.
    const invariant: [label: string, expr: string][] = [
      ["date", "'2020-01-01'::date = make_date(2020,1,1)"],
      ["timestamp", "'2020-01-01 12:34:56'::timestamp = make_timestamp(2020,1,1,12,34,56)"],
      ["ts fraction", "'2020-01-01 12:34:56.789'::timestamp = make_timestamp(2020,1,1,12,34,56.789)"],
      ["ts T-separator", "'2020-01-01T12:34:56'::timestamp = make_timestamp(2020,1,1,12,34,56)"],
      ["ts no seconds", "'2020-01-01 12:34'::timestamp = make_timestamp(2020,1,1,12,34,0)"],
      ["ts date-only", "'2020-01-01'::timestamp = make_timestamp(2020,1,1,0,0,0)"],
      ["ts surrounding spaces", "' 2020-01-01 12:34:56 '::timestamp = make_timestamp(2020,1,1,12,34,56)"],
      ["tstz surrounding spaces", "' 2020-01-01 12:34:56+00 '::timestamptz = make_timestamptz(2020,1,1,12,34,56,'UTC')"],
      ["tstz offset hh:mm", "'2020-01-01 12:34:56+05:30'::timestamptz = make_timestamptz(2020,1,1,12,34,56,'+05:30')"],
      ["tstz offset hh", "'2020-01-01 12:34:56+00'::timestamptz = make_timestamptz(2020,1,1,12,34,56,'UTC')"],
      ["tstz T-sep offset", "'2020-01-01T12:34:56+00'::timestamptz = make_timestamptz(2020,1,1,12,34,56,'UTC')"],
      ["surrounding spaces", "' 2020-01-01 '::date = make_date(2020,1,1)"],
      ["non-padded", "'2020-1-2'::date = make_date(2020,1,2)"],
      ["non-padded ts", "'2020-1-2 12:34:56'::timestamp = make_timestamp(2020,1,2,12,34,56)"],
      ["non-padded ts T-sep", "'2020-1-2T12:34'::timestamp = make_timestamp(2020,1,2,12,34,0)"],
      ["non-padded tstz", "'2020-1-2 12:34:56+00'::timestamptz = make_timestamptz(2020,1,2,12,34,56,'UTC')"],
      ["mixed padding day", "'2020-01-2'::date = make_date(2020,1,2)"],
      ["mixed padding month", "'2020-1-02'::date = make_date(2020,1,2)"],
      ["padded low year", "'0020-01-02'::date = make_date(20,1,2)"],
      ["hour 24 rolls over", "'2020-01-01 24:00:00'::timestamp = make_timestamp(2020,1,2,0,0,0)"],
    ];
    for (const [label, expr] of invariant) {
      expect(await underEveryDateStyle(expr), label).toEqual(new Set(["true"]));
    }
  });

  it("the ambiguous form '1/2/2020' answers THREE ways across the sweep — the refusal reason", async () => {
    // Jan 2 under MDY, Feb 1 under DMY, out-of-range under YMD: the exact
    // control the new refusal record holds. Field roles come from the GUC,
    // so no analysis-time answer binds other sessions.
    expect(await underEveryDateStyle("to_char('1/2/2020'::date, 'YYYY-MM-DD')")).toEqual(
      new Set(["2020-01-02", "2020-02-01", "ERROR:range"]),
    );
  });

  it("two-digit-leading forms are order-dependent — the shape test requires a 4-digit year", async () => {
    expect(await underEveryDateStyle("to_char('20-01-02'::date, 'YYYY-MM-DD')")).toEqual(
      new Set(["ERROR:range", "2002-01-20", "2020-01-02"]),
    );
    expect(await underEveryDateStyle("to_char('99-01-02'::date, 'YYYY-MM-DD')")).toEqual(
      new Set(["ERROR:range", "1999-01-02"]),
    );
  });

  it("an offset-less timestamptz moves with TimeZone; an explicit offset pins the instant", async () => {
    // The reason design B admits timestamptz ONLY with a numeric offset:
    // the offset-less spelling reads the TimeZone GUC — a second settings
    // axis the DateStyle sweep does not even see.
    const epoch = async (lit: string) => {
      const r = await pg.query<{ v: string }>(
        `SELECT extract(epoch from ${lit})::text AS v`,
      );
      return r.rows[0]!.v;
    };
    await pg.exec("SET timezone = 'UTC'");
    const bareUtc = await epoch("'2020-01-01 12:34:56'::timestamptz");
    const fullUtc = await epoch("'2020-01-01 12:34:56+00'::timestamptz");
    await pg.exec("SET timezone = 'America/New_York'");
    const bareNy = await epoch("'2020-01-01 12:34:56'::timestamptz");
    const fullNy = await epoch("'2020-01-01 12:34:56+00'::timestamptz");
    await pg.exec("SET timezone = DEFAULT");
    expect(bareUtc).not.toBe(bareNy);
    expect(fullUtc).toBe(fullNy);
    expect(fullUtc).toBe(bareUtc);
  });

  // --- Closed sublinks (docs/subtree-evaluation.md, "Closed sublinks").
  //
  // A sublink whose body references no tables, columns or parameters is a
  // closed tree wearing subquery syntax. These pins hold the execution
  // facts the rung's tiers rest on; the deparser-rendering pin lives in
  // subtree-evaluator.test.ts beside the protocol.

  it("a multi-row EXPR sublink raises — lazily, so the raise itself cannot exhaust", async () => {
    // The raising-subtree fallback absorbs this: the erring subtree
    // contributes nothing. Lazy: row two fires it, measured at 10^10.
    expect(await errorOf("SELECT (SELECT x FROM (VALUES (1),(2)) t(x))", [])).toContain(
      "more than one row returned by a subquery used as an expression",
    );
    expect(await errorOf("SELECT (SELECT generate_series(1, 10000000000))", [])).toContain(
      "more than one row returned by a subquery used as an expression",
    );
    const one = await pg.query<{ r: number }>("SELECT (SELECT generate_series(1,1)) AS r");
    expect(one.rows[0]).toEqual({ r: 1 });
  });

  it("EXISTS early-exits over an unbounded lazy body — no pre-probe needed", async () => {
    // Exhausting 10^10 rows is ~27 minutes and allocation-until-death
    // (recorded); the first row answers EXISTS and a zero-row series
    // terminates immediately, so the question is bounded by construction.
    const t = await pg.query<{ a: boolean; b: boolean }>(
      "SELECT EXISTS (SELECT generate_series(1, 10000000000)) AS a," +
        " EXISTS (SELECT generate_series(1, 0)) AS b",
    );
    expect(t.rows[0]).toEqual({ a: true, b: false });
  });

  it("EXISTS does not evaluate the body's target list", async () => {
    const r = await pg.query<{ r: boolean }>("SELECT EXISTS (SELECT 1/0) AS r");
    expect(r.rows[0]).toEqual({ r: true });
  });

  it("ProjectSet is lazy under LIMIT — the cardinality pre-probe's soundness", async () => {
    // The pre-probe's own shape at 10^10 answers cap+1 without exhausting
    // the series. Trap 1's counterpart is pinned as a PLAN shape, not an
    // execution: FROM position plans a Function Scan, which PGlite
    // MATERIALIZES — LIMIT does not bound it and no timer can cancel it —
    // so the rung refuses those bodies outright and nothing here runs one.
    const n = await pg.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM (SELECT generate_series(1, 10000000000) LIMIT 1001) q",
    );
    expect(n.rows[0]!.n).toBe(1001);
    const tl = await pg.query<Record<string, string>>("EXPLAIN SELECT generate_series(1, 100)");
    expect(String(Object.values(tl.rows[0]!)[0])).toContain("ProjectSet");
    const fp = await pg.query<Record<string, string>>(
      "EXPLAIN SELECT * FROM generate_series(1, 100)",
    );
    expect(String(Object.values(fp.rows[0]!)[0])).toContain("Function Scan");
  });

  it("a set operation resolves its result type exactly as COALESCE does — the unifier the gate already owns", async () => {
    // The body-clause widening's first clause (docs/subtree-evaluation.md,
    // "Body-clause widening"): UNION/INTERSECT/EXCEPT unify their arms by
    // the same "select a common type" rule the CASE/COALESCE gate models
    // with `closedCommonTypes`. If a version ever moved one of the three
    // off that rule, the widened gate would be predicting the wrong type.
    let probe = 0;
    const resultType = async (sql: string): Promise<string> => {
      const name = `setop_probe_${probe++}`;
      await pg.exec(`PREPARE ${name} AS ${sql}`);
      const r = await pg.query<{ t: string }>(
        `SELECT result_types::text AS t FROM pg_prepared_statements WHERE name = '${name}'`,
      );
      return r.rows[0]!.t;
    };
    for (const [a, b] of [
      ["1", "2"], ["1", "1.5"], ["'a'", "'b'"], ["1", "NULL"],
      ["1::int", "2::bigint"], ["'x'::text", "'y'::varchar"], ["1::float4", "2::float8"],
    ] as const) {
      const coalesce = await resultType(`SELECT COALESCE(${a}, ${b})`);
      for (const op of ["UNION", "INTERSECT", "EXCEPT"]) {
        expect(await resultType(`SELECT ${a} ${op} SELECT ${b}`), `${a} ${op} ${b}`).toBe(coalesce);
      }
    }
  });

  it("what a set-operation body can raise: DISTINCT needs equality, and arity must agree", async () => {
    // Both land in the raising-subtree fallback rather than in a wrong
    // answer — the erring subtree contributes nothing. The ALL twin is the
    // control: deduplication is what demands the equality operator, so the
    // raise is a property of the operation and not of the values.
    expect(await errorOf("SELECT '{}'::json UNION SELECT '{}'::json", [])).toContain(
      "could not identify an equality operator for type json",
    );
    expect(await errorOf("SELECT '{}'::json UNION ALL SELECT '{}'::json", [])).toBeNull();
    expect(await errorOf("SELECT 1, 2 UNION SELECT 3", [])).toContain(
      "each UNION query must have the same number of columns",
    );
    // And the row-count story is unchanged by the clause: an EXPR sublink
    // over a two-row body raises, while UNION's own deduplication can make
    // a two-arm body single-row.
    expect(await errorOf("SELECT (SELECT 1 UNION ALL SELECT 2)", [])).toContain(
      "more than one row returned by a subquery used as an expression",
    );
    const one = await pg.query<{ a: number }>("SELECT (SELECT 1 UNION SELECT 1) AS a");
    expect(one.rows[0]).toEqual({ a: 1 });
  });

  it("LIMIT composes with the multi-row raise, and the pre-probe already bounds a LIMITed SRF body", async () => {
    // The widening's second clause. The charter asks whether a syntactic
    // LIMIT ≤ cap should admit an SRF body WITHOUT the runtime pre-probe:
    // the answer measured here is that it need not — the probe answers a
    // LIMIT 1 body over a 10^10 series immediately, so a static bound would
    // be a second mechanism computing what one round trip already gives.
    const capped = await pg.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM (SELECT generate_series(1, 10000000000) LIMIT 1) q LIMIT 1001",
    );
    expect(capped.rows[0]!.n).toBe(1);
    // Composition with the EXPR raise is the plain one: LIMIT decides the
    // row count the sublink is judged on.
    const one = await pg.query<{ a: number }>("SELECT (SELECT generate_series(1,5) LIMIT 1) AS a");
    expect(one.rows[0]).toEqual({ a: 1 });
    expect(await errorOf("SELECT (SELECT generate_series(1,5) LIMIT 2)", [])).toContain(
      "more than one row returned by a subquery used as an expression",
    );
  });

  it("OFFSET is the hazard the clause has to gate: the pre-probe pays for every skipped row", async () => {
    // LIMIT bounds what the probe RETURNS; OFFSET does not bound what it
    // must WALK. Over a lazy SRF the cost is linear in the offset — 100k,
    // 1M and 10M rows here, each an order of magnitude apart in time — so
    // an offset nothing bounds statically would hang the probe exactly the
    // way trap 1's FROM-position scan hangs. Measured, hence the gate: an
    // SRF-carrying body with an OFFSET is refused.
    const timed = async (offset: number): Promise<number> => {
      const t = Date.now();
      await pg.query(
        `SELECT count(*) AS n FROM (SELECT generate_series(1, 10000000000) LIMIT 1 OFFSET ${offset}) q LIMIT 1001`,
      );
      return Date.now() - t;
    };
    const small = await timed(100_000);
    const large = await timed(10_000_000);
    expect(large).toBeGreaterThan(small);
    // And the shape a bare projection has: one row, so OFFSET past it is
    // an empty result rather than a cost.
    const skipped = await pg.query<{ a: number | null }>("SELECT (SELECT 1 OFFSET 1) AS a");
    expect(skipped.rows[0]).toEqual({ a: null });
  });

  it("which row a LIMIT takes from a SET OPERATION is a plan choice, not a value", async () => {
    // Found while building the LIMIT clause. Without ORDER BY, the rows a
    // set operation emits are in whatever order its deduplication produced,
    // and that is a planner decision: the SAME body answers 42 through
    // HashAggregate and 3 through Sort+Unique. An evaluator that folded it
    // would bake one plan's answer into a claim the next plan falsifies, so
    // the widening admits LIMIT/OFFSET on plain bodies only.
    const body = [17, 3, 29, 8, 42, 11, 5, 23].map(v => `SELECT ${v}`).join(" UNION ");
    const first = async (): Promise<number> =>
      (await pg.query<{ x: number }>(`SELECT x FROM (${body}) q(x) LIMIT 1`)).rows[0]!.x;
    const hashed = await first();
    await pg.exec("SET enable_hashagg = off");
    const sorted = await first();
    await pg.exec("SET enable_hashagg = on");
    expect(hashed).not.toBe(sorted);
    expect(await first()).toBe(hashed);
  });

  it("a VALUES body: no set-returning calls, equal row lengths, and COALESCE's unification", async () => {
    // The widening's third clause, whose pre-work the charter made a gate:
    // what the parser and deparser do with the shape. PostgreSQL forbids a
    // set-returning call in VALUES outright, so a VALUES body can never be
    // the pre-probe's business; unequal row lengths are refused before
    // execution; and the column types unify by the same rule COALESCE uses,
    // which is the one `closedCommonTypes` models.
    expect(await errorOf("SELECT 1 IN (VALUES (generate_series(1,3)))", [])).toContain(
      "set-returning functions are not allowed in VALUES",
    );
    expect(await errorOf("SELECT 1 IN (VALUES (1), (2,3))", [])).toContain(
      "VALUES lists must all be the same length",
    );
    let probe = 0;
    const resultType = async (sql: string): Promise<string> => {
      const name = `values_probe_${probe++}`;
      await pg.exec(`PREPARE ${name} AS ${sql}`);
      const r = await pg.query<{ t: string }>(
        `SELECT result_types::text AS t FROM pg_prepared_statements WHERE name = '${name}'`,
      );
      return r.rows[0]!.t;
    };
    expect(await resultType("SELECT * FROM (VALUES (1),(1.5)) q")).toBe(
      await resultType("SELECT COALESCE(1, 1.5)"),
    );
    // Row order is the written order — a Values Scan has no deduplication
    // to reorder it, which is why a LIMIT may slice it where a set
    // operation's may not.
    const first = await pg.query<{ column1: number }>(
      "SELECT * FROM (VALUES (2),(1)) q LIMIT 1",
    );
    expect(first.rows[0]!.column1).toBe(2);
  });

  it("an ANY/IN sublink early-exits on a MATCH; the no-match case is exhaustion", async () => {
    // The match answers immediately even at 10^10; answering FALSE is
    // information-theoretic exhaustion (linear, recorded — NOT executed
    // here), which is why SRF bodies sit behind the cardinality pre-probe.
    const m = await pg.query<{ r: boolean }>(
      "SELECT 5 IN (SELECT generate_series(1, 10000000000)) AS r",
    );
    expect(m.rows[0]).toEqual({ r: true });
  });

  it("the bound holds TRUE per stored row, not merely notFALSE — the rendered shapes are total", async () => {
    // A CHECK admits a NULL evaluation; a partition bound cannot produce
    // one: every rendered shape guards its comparisons with IS NOT NULL (or
    // IS NULL as a disjunct), so over any key value it evaluates TRUE or
    // FALSE. Enforcement rejects FALSE, so stored rows satisfy the bound
    // TRUE — the kernel may feed range bounds as TRUE facts.
    const nullKey = await pg.query<{ r: boolean; l: boolean; ln: boolean }>(
      `SELECT (${await partDef("pb_r1")}) IS FALSE AS r,
              (${await partDef("pb_l1")}) IS FALSE AS l,
              (${await partDef("pb_ln")}) IS TRUE AS ln
       FROM (SELECT NULL::int AS id, NULL::text AS k) s`,
    );
    expect(nullKey.rows[0]).toEqual({ r: true, l: true, ln: true });
    // Over the rows the routing pins planted (boundary rows included:
    // 0 and 99 in pb_r1, the closed 100 in pb_rmax, NULL in pb_rd/pb_ln).
    for (const [rel, n] of [
      ["pb_r1", 2], ["pb_rmax", 1], ["pb_rmin", 1], ["pb_rd", 1],
      ["pb_l1", 1], ["pb_ln", 2], ["pb_ld", 1], ["pb_h0", 3], ["pb_h1", 1],
    ] as const) {
      const r = await pg.query<{ n: number; all_true: boolean }>(
        `SELECT count(*)::int AS n, bool_and(${await partDef(rel)}) AS all_true FROM ${rel}`,
      );
      expect(r.rows[0], rel).toEqual({ n, all_true: true });
    }
  });

  // --- Guard-side IN (docs/subtree-evaluation.md, "Guard-side IN").
  //
  // The rung desugars a multi-element IN guard into the disjunction the
  // kernel's OR rule already walks. These pins are the equivalence that
  // licenses it — over the THREE-valued grid, not just the true/false
  // corner — and the separation from NOT IN, which is a conjunction and
  // would be refuted wrongly by the same rule.

  it("IN is its disjunction and NOT IN its conjunction, over the three-valued grid", async () => {
    // 12 combinations of a NULL-carrying operand and two NULL-carrying
    // list elements, compared with IS NOT DISTINCT FROM so UNKNOWN counts
    // as agreement. If either equivalence ever moved, the desugar in
    // `isNotTrue` would be answering a different question than the guard.
    const g = await pg.query<{ n: number; in_or: boolean; notin_and: boolean; in_any: boolean }>(`
      SELECT count(*)::int AS n,
             bool_and((x IN (a,b)) IS NOT DISTINCT FROM (x = a OR x = b)) AS in_or,
             bool_and((x NOT IN (a,b)) IS NOT DISTINCT FROM (x <> a AND x <> b)) AS notin_and,
             bool_and((x IN (a,b)) IS NOT DISTINCT FROM (x = ANY (ARRAY[a,b]))) AS in_any
      FROM (VALUES ('a'),('q'),(NULL)) t1(x),
           (VALUES ('q'),(NULL)) t2(a),
           (VALUES ('r'),(NULL)) t3(b)
    `);
    expect(g.rows[0]).toEqual({ n: 12, in_or: true, notin_and: true, in_any: true });
  });

  it("the corners the rung's guards rest on: NOT IN holds where IN fails, and a NULL element yields UNKNOWN", async () => {
    // `'a' NOT IN ('q','r')` is TRUE — so a guard the rule wrongly refuted
    // would fire on every conforming row. A NULL in the list makes the
    // whole membership UNKNOWN for a non-member, which is why the engine's
    // refusal of that shape costs nothing a data state could witness.
    const c = await pg.query<Record<string, boolean | null>>(`
      SELECT 'a' IN ('q','r') AS a_in, 'a' NOT IN ('q','r') AS a_not_in,
             'a' IN ('q', NULL) AS a_in_null, 'q' IN ('q', NULL) AS q_in_null,
             (NULL::text) IN ('q','r') AS null_in
    `);
    expect(c.rows[0]).toEqual({
      a_in: false, a_not_in: true, a_in_null: null, q_in_null: true, null_in: null,
    });
  });

  // --- Witness classification for constraint-shaped raises
  // (docs/argument-nullability.md, section of the same name).
  //
  // A grounder or partition-bound claim is refused by a CONSTRAINT, so the
  // raise names the constraint rather than the NULL. These pins are why the
  // widened witness class may not read the message alone: the SAME message
  // arrives whether the NULL caused the rejection or something else in the
  // row did, and only the all-valid control tells them apart.

  it("a CHECK the parameter violates and one it cannot rescue raise the same message", async () => {
    // (7, $1): the row is valid but for the NULL — the control succeeds and
    // the raise is about the binding. (2, $1): `a > 5` is already FALSE, so
    // the control raises too and the NULL is not what rejected the row.
    // Both messages read "violates check constraint".
    expect(await errorOf("INSERT INTO wcls (a, n) VALUES (7, $1)", ["x"])).toBeNull();
    expect(await errorOf("INSERT INTO wcls (a, n) VALUES (7, $1)", [null])).toContain(
      "violates check constraint",
    );
    expect(await errorOf("INSERT INTO wcls (a, n) VALUES (2, $1)", ["x"])).toContain(
      "violates check constraint",
    );
    expect(await errorOf("INSERT INTO wcls (a, n) VALUES (2, $1)", [null])).toContain(
      "violates check constraint",
    );
  });

  it("the partition bound behaves the same way — the message names the bound, not the binding", async () => {
    // A NULL key is unroutable and a direct insert rejects it; an
    // out-of-range key rejects for its own reason, with the control raising
    // beside it. One message class, two causes.
    expect(await errorOf("INSERT INTO pb_r1 (id, v) VALUES ($1, 'x')", [5])).toBeNull();
    expect(await errorOf("INSERT INTO pb_r1 (id, v) VALUES ($1, 'x')", [null])).toContain(
      "violates partition constraint",
    );
    expect(await errorOf("INSERT INTO pb_r1 (id, v) VALUES (500, $1)", ["x"])).toContain(
      "violates partition constraint",
    );
    expect(await errorOf("INSERT INTO pb_r1 (id, v) VALUES (500, $1)", [null])).toContain(
      "violates partition constraint",
    );
  });

  // --- The always-raises statement fact (docs/argument-nullability.md,
  // section of the same name).
  //
  // The flag is claimed only where the write event is UNIVERSAL — a row
  // every execution constructs. These pins draw that line: what ON CONFLICT
  // does to an INSERT's own row, and what the row-matching shapes do when
  // nothing matches.

  it("ON CONFLICT checks the proposed row BEFORE the arbiter — an insert keeps its universal footing", async () => {
    await pg.exec("INSERT INTO arc VALUES (1, 7, 'x')");
    // Conflicting AND violating: DO NOTHING does not save it. So the CHECK
    // is evaluated on the proposed row regardless of whether the row would
    // have been skipped — an ON CONFLICT clause does not make the INSERT's
    // own VALUES row conditional.
    expect(await errorOf("INSERT INTO arc VALUES (1, 2, 'y') ON CONFLICT DO NOTHING", [])).toContain(
      "violates check constraint",
    );
    expect(
      await errorOf("INSERT INTO arc VALUES (1, 2, 'y') ON CONFLICT (id) DO UPDATE SET n = 'z'", []),
    ).toContain("violates check constraint");
    // The control: conflicting but VALID is silently skipped, so the raise
    // above is the CHECK's and not the arbiter's.
    expect(await errorOf("INSERT INTO arc VALUES (1, 9, 'y') ON CONFLICT DO NOTHING", [])).toBeNull();
    await pg.exec("DELETE FROM arc");
  });

  it("the row-matching shapes raise only when a row matches — existential, and out of the flag", async () => {
    await pg.exec("INSERT INTO arc VALUES (1, 7, 'x')");
    // Each pair is the same violating assignment with and without a row to
    // apply it to. A statement that succeeds over an empty match cannot
    // carry a fact that says "every execution raises".
    expect(await errorOf("UPDATE arc SET a = 2 WHERE id = 99", [])).toBeNull();
    expect(await errorOf("UPDATE arc SET a = 2 WHERE id = 1", [])).toContain(
      "violates check constraint",
    );
    const mergeInto = (src: string) =>
      `MERGE INTO arc USING (${src}) s ON arc.id = s.k ` +
      "WHEN NOT MATCHED THEN INSERT (id, a, n) VALUES (9, 2, 'z')";
    expect(await errorOf(mergeInto("SELECT 1 AS k WHERE false"), [])).toBeNull();
    expect(await errorOf(mergeInto("SELECT 9 AS k"), [])).toContain("violates check constraint");
    expect(
      await errorOf("INSERT INTO arc VALUES (2, 7, 'y') ON CONFLICT (id) DO UPDATE SET a = 2", []),
    ).toBeNull();
    expect(
      await errorOf("INSERT INTO arc VALUES (1, 7, 'y') ON CONFLICT (id) DO UPDATE SET a = 2", []),
    ).toContain("violates check constraint");
    // The sourced INSERT ... SELECT is the same story: no source row, no
    // write, no raise — which is why only VALUES rows and the FROM-less
    // select are universal.
    expect(await errorOf("INSERT INTO arc SELECT id, 2, 'd' FROM arc WHERE false", [])).toBeNull();
    expect(await errorOf("INSERT INTO arc SELECT 6, 2, 'c'", [])).toContain(
      "violates check constraint",
    );
    await pg.exec("DELETE FROM arc");
  });
});
