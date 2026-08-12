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
    const lengthRows = await pg.query<{ args: string }>(
      `SELECT pg_get_function_identity_arguments(oid) AS args FROM pg_proc
       WHERE proname = 'length' AND pronamespace = 'pg_catalog'::regnamespace
         AND provolatile <> 'i'`,
    );
    expect(lengthRows.rows.map(r => r.args)).toEqual(["bytea, name"]);
  });
});
