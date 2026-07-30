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
}

const ARGS_RE = /^\s*--\s*@args\b(.*)$/;
const NO_ROWS_RE = /^\s*--\s*@no-rows\b:?(.*)$/;

export function parseFixtureDirectives(content: string): FixtureDirectives {
  const bindings: FixtureBinding[] = [];
  let noRowsReason: string | null = null;

  for (const line of content.split("\n")) {
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
    }
  }

  if (bindings.length === 0) {
    bindings.push({ label: "unbound", args: null });
  }
  return { bindings, noRowsReason };
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
