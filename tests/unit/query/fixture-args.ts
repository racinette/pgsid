// ---------------------------------------------------------------------------
// Per-fixture directives: argument bindings, and the opt-out from the
// "must return rows" bar.
//
// Bindings are declared as JSON, one array per line, each line an independent
// case:
//
//     -- @args ["a@b.c", 10, null]
//     -- @args [null, 0, "x"]
//
// JSON gives unambiguous typing for free — `null` is not `"null"`, `10` is not
// `"10"` — and needs no parser beyond `JSON.parse`. A fixture with no `@args`
// line runs once with every parameter bound to NULL.
//
// Arguments are substituted as literals rather than passed as protocol
// parameters. PostgreSQL infers a parameter's type from its use, and several
// fixtures use one where nothing constrains it (`SELECT $1 AS direct_param`),
// which is an error before any value is considered. A literal carries the same
// unknown type a fixture author means and resolves the same way.
// ---------------------------------------------------------------------------

export interface FixtureBinding {
  /** Shown in failure messages, e.g. `args[1]`. */
  label: string;
  /** JSON values, positionally $1..$n. `null` means "no @args line". */
  args: readonly unknown[] | null;
}

export interface FixtureDirectives {
  bindings: FixtureBinding[];
  /**
   * Why this fixture can never return a row, or null if it is expected to.
   * Present only on fixtures whose statement raises for every row it would
   * produce — a cast to a NOT NULL domain, say, which is precisely the
   * behaviour the fixture asserts.
   */
  noRowsReason: string | null;
  /**
   * A substring every error such a fixture raises must contain.
   *
   * Returning no rows is not on its own evidence of anything: a false `WHERE`
   * does it too, and a fixture that merely matches nothing asserts nothing.
   * What makes a `@no-rows` fixture meaningful is that PostgreSQL *refuses* —
   * and refusing to produce a value is exactly the claim its `notNull` columns
   * make. Naming the error is what turns that from an excuse into a check, and
   * keeps an unrelated failure (a renamed column, a missing table) from being
   * accepted as the expected one.
   */
  raisesPattern: string | null;
  /**
   * Expected argument nullability, from `-- @param N notNull|nullable` lines.
   * One entry per annotated parameter, in annotation order. See
   * docs/argument-nullability.md: `notNull` claims binding NULL can make the
   * statement raise; `nullable` claims NULL is a universally safe binding —
   * never that it is a useful one.
   */
  paramClaims: ParamClaim[];
  /**
   * Output columns whose `@nullable` claim is known to be unwitnessable, by
   * 0-based column index, with the reason recorded: `-- @unwitnessable N:
   * reason`. The witness invariant in nullability-soundness.test.ts requires
   * every unwitnessed nullable claim to carry one of these, and requires the
   * annotation to come OFF the moment data witnesses the claim — so a reason
   * is a reviewed, current fact, not a historical excuse.
   */
  unwitnessable: Map<number, string>;
}

export interface ParamClaim {
  /** 1-based parameter number. */
  number: number;
  notNull: boolean;
}

const ARGS_RE = /^\s*--\s*@args\b(.*)$/;
const NO_ROWS_RE = /^\s*--\s*@no-rows\b:?(.*)$/;
const RAISES_RE = /^\s*--\s*@raises\b:?(.*)$/;
const PARAM_RE = /^\s*--\s*@param\b(.*)$/;
const UNWITNESSABLE_RE = /^\s*--\s*@unwitnessable\b:?(.*)$/;

export function parseFixtureDirectives(content: string): FixtureDirectives {
  const bindings: FixtureBinding[] = [];
  const paramClaims: ParamClaim[] = [];
  const unwitnessable = new Map<number, string>();
  let noRowsReason: string | null = null;
  let raisesPattern: string | null = null;

  for (const line of content.split("\n")) {
    const unwitnessableMatch = UNWITNESSABLE_RE.exec(line);
    if (unwitnessableMatch) {
      const m = /^(\d+)\s*:\s*(.+)$/.exec(unwitnessableMatch[1]!.trim());
      const index = m ? Number(m[1]) : NaN;
      if (!m || !Number.isInteger(index)) {
        throw new Error(
          `@unwitnessable must be \`-- @unwitnessable <column index>: <reason>\`, ` +
            `got: ${unwitnessableMatch[1]!.trim()}`,
        );
      }
      if (unwitnessable.has(index)) {
        throw new Error(`duplicate @unwitnessable annotation for column ${index}`);
      }
      unwitnessable.set(index, m[2]!.trim());
      continue;
    }

    const paramMatch = PARAM_RE.exec(line);
    if (paramMatch) {
      const parts = paramMatch[1]!.trim().split(/\s+/);
      const number = Number(parts[0]);
      const claim = parts[1];
      if (
        parts.length !== 2 ||
        !Number.isInteger(number) ||
        number < 1 ||
        (claim !== "notNull" && claim !== "nullable")
      ) {
        throw new Error(
          `@param must be \`-- @param <n> notNull|nullable\`, got: ${paramMatch[1]!.trim()}`,
        );
      }
      if (paramClaims.some(p => p.number === number)) {
        throw new Error(`duplicate @param annotation for $${number}`);
      }
      paramClaims.push({ number, notNull: claim === "notNull" });
      continue;
    }

    const argsMatch = ARGS_RE.exec(line);
    if (argsMatch) {
      const raw = argsMatch[1]!.trim();
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        throw new Error(`@args is not valid JSON: ${raw}\n  ${(e as Error).message}`);
      }
      if (!Array.isArray(parsed)) {
        throw new Error(`@args must be a JSON array, got ${raw}`);
      }
      bindings.push({ label: `args[${bindings.length}]`, args: parsed });
      continue;
    }

    const noRowsMatch = NO_ROWS_RE.exec(line);
    if (noRowsMatch) {
      const reason = noRowsMatch[1]!.trim();
      if (!reason) {
        throw new Error("@no-rows requires a reason on the same line");
      }
      noRowsReason = reason;
      continue;
    }

    const raisesMatch = RAISES_RE.exec(line);
    if (raisesMatch) {
      const pattern = raisesMatch[1]!.trim();
      if (!pattern) {
        throw new Error("@raises requires the expected error text on the same line");
      }
      raisesPattern = pattern;
    }
  }

  // The two directives only mean anything together. `@no-rows` without
  // `@raises` is an unexamined exemption from the "must return rows" bar, and
  // `@raises` without `@no-rows` claims something the suite does not check —
  // a fixture that raises under one data state and returns rows under another
  // is ordinary, and says nothing in particular.
  if (noRowsReason && !raisesPattern) {
    throw new Error(
      "@no-rows must be accompanied by `-- @raises: <expected error text>`. " +
        "Returning nothing is only evidence when PostgreSQL refuses to run the " +
        "statement, and the error is what says so.",
    );
  }
  if (raisesPattern && !noRowsReason) {
    throw new Error("@raises is only meaningful on a fixture marked @no-rows");
  }

  if (bindings.length === 0) {
    bindings.push({ label: "unbound", args: null });
  }
  return { bindings, noRowsReason, raisesPattern, paramClaims, unwitnessable };
}

/**
 * Replace every `$n` with a literal. With `args === null` every parameter
 * becomes NULL, which is the nullable path and the one a fixture that declares
 * no bindings is asserting about.
 */
export function bindParams(sql: string, args: readonly unknown[] | null): string {
  let highest = 0;
  const bound = sql.replace(/\$(\d+)/g, (_match, digits: string) => {
    const index = Number(digits);
    highest = Math.max(highest, index);
    if (args === null) return "NULL";
    if (index > args.length) {
      throw new Error(
        `fixture references $${index} but @args supplies only ${args.length} value(s)`,
      );
    }
    return toSqlLiteral(args[index - 1]);
  });

  if (args !== null && args.length > highest) {
    throw new Error(
      `@args supplies ${args.length} value(s) but the fixture references only $1..$${highest}`,
    );
  }
  return bound;
}

function toSqlLiteral(value: unknown): string {
  if (value === null) return "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`@args value is not finite: ${value}`);
    return String(value);
  }
  if (typeof value === "string") return quote(value);
  // Objects and arrays reach SQL as JSON text, which is what a jsonb or array
  // parameter position coerces from.
  return quote(JSON.stringify(value));
}

function quote(text: string): string {
  // A backslash means something different under `standard_conforming_strings`
  // off, and nothing in these fixtures needs one.
  if (text.includes("\\")) {
    throw new Error(`@args values must not contain backslashes: ${text}`);
  }
  return `'${text.replace(/'/g, "''")}'`;
}
