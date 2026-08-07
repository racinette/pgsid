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
   * statement raise; `nullable` claims NOTHING — it records that no channel
   * the engine models rejects NULL, never that nothing does. See
   * `paramOpaque` for the raises that fall outside.
   */
  paramClaims: ParamClaim[];
  /**
   * Parameters whose NULL binding is KNOWN to raise for a reason no static
   * analysis can see, by 1-based number, with the reason recorded:
   * `-- @param-opaque N: reason`.
   *
   * The contract is one-directional — a claim means "binding NULL can raise",
   * and the ABSENCE of a claim promises nothing (sweep-4 finding 7). What
   * forces this to be spelled out rather than assumed is that
   * param-soundness.test.ts falsifies a nullable claim the moment a NULL
   * binding raises, and that check is worth keeping: over THIS corpus it is
   * the strongest oracle the input side has. So a fixture that legitimately
   * raises declares it here, exactly the way `@unwitnessable` declares a
   * nullable output claim no state reaches.
   *
   * The class is a user function whose BODY rejects NULL with nothing
   * catalog-visible behind it: a plpgsql `RAISE`, or a body that maps its
   * argument into a NOT NULL domain. The declared ARGUMENT type is the
   * channel a schema author uses to get a claim — declare the parameter as a
   * NOT NULL domain and mechanism A answers.
   */
  paramOpaque: Map<number, string>;
  /**
   * Expected JOINT rejection sets, from `-- @param-reject N,M[,…]` lines:
   * binding NULL to every listed parameter together must make the statement
   * raise, while each member individually carries a nullable `@param`
   * claim (the trichotomy's conditional state — the agreement suite
   * enforces that pairing). Members sorted ascending, sets in file order.
   */
  rejectClaims: number[][];
  /**
   * Output columns whose `@nullable` claim is known to be unwitnessable, by
   * 0-based column index, with the reason recorded: `-- @unwitnessable N:
   * reason`. The witness invariant in nullability-soundness.test.ts requires
   * every unwitnessed nullable claim to carry one of these, and requires the
   * annotation to come OFF the moment data witnesses the claim — so a reason
   * is a reviewed, current fact, not a historical excuse. A reason continues
   * onto following comment lines indented two or more spaces past the `--`,
   * and is recorded joined: the report prints what is recorded.
   */
  unwitnessable: Map<number, string>;
  /**
   * Expected presence groups, from `-- @null-group N[*],M[*][,…]` lines:
   * 0-based output column indices NULL-extended together by an outer join,
   * `*` marking the discriminants (non-null on the present arm, so NULL ⟺
   * the unit's row was absent). Two or more members, at least one starred —
   * the same floor the engine applies before a group earns contract space.
   * Every member must also carry a per-column `@nullable` marker (a group
   * member has an absent arm, so it is never flat notNull); the agreement
   * suite enforces that pairing, mirroring @param-reject's.
   */
  nullGroupClaims: { columns: number[]; discriminants: number[] }[];
}

export interface ParamClaim {
  /** 1-based parameter number. */
  number: number;
  notNull: boolean;
}

const ARGS_RE = /^\s*--\s*@args\b(.*)$/;
const NO_ROWS_RE = /^\s*--\s*@no-rows\b:?(.*)$/;
const RAISES_RE = /^\s*--\s*@raises\b:?(.*)$/;
const PARAM_REJECT_RE = /^\s*--\s*@param-reject\b(.*)$/;
const PARAM_RE = /^\s*--\s*@param\b(?!-)(.*)$/;
const PARAM_OPAQUE_RE = /^\s*--\s*@param-opaque\b(.*)$/;
const UNWITNESSABLE_RE = /^\s*--\s*@unwitnessable\b:?(.*)$/;
// A reason may run past one line, and what is RECORDED is what WITNESS_REPORT
// prints — a reason whose second half lives only in the file reads as a
// truncated sentence in the report that is supposed to justify it. A comment
// line indented two or more spaces past the `--` continues the reason above
// it; a flush `-- ` line is ordinary prose and ends it.
const UNWITNESSABLE_CONT_RE = /^\s*--\s{2,}(\S.*)$/;
// NOTE: the per-column markers in nullability-walk.test.ts match the bare
// substrings `@notNull` / `@nullable` anywhere in a line; `@null-group`
// contains neither, which is a load-bearing property of the spelling.
const NULL_GROUP_RE = /^\s*--\s*@null-group\b(.*)$/;

export function parseFixtureDirectives(content: string): FixtureDirectives {
  const bindings: FixtureBinding[] = [];
  const paramClaims: ParamClaim[] = [];
  const rejectClaims: number[][] = [];
  const nullGroupClaims: { columns: number[]; discriminants: number[] }[] = [];
  const unwitnessable = new Map<number, string>();
  const paramOpaque = new Map<number, string>();
  let noRowsReason: string | null = null;
  let raisesPattern: string | null = null;

  // The column index whose reason is still open, or null. Only the line
  // immediately following an @unwitnessable line (or one of its own
  // continuations) can continue it.
  let openReason: number | null = null;

  for (const line of content.split("\n")) {
    if (openReason !== null) {
      const cont = UNWITNESSABLE_CONT_RE.exec(line);
      if (cont) {
        // nullability-walk.test.ts counts a per-column claim by matching
        // `@notNull`/`@nullable` anywhere after a `--`, so a reason carrying
        // one would invent a column.
        if (/@(notNull|nullable)\b/.test(cont[1]!)) {
          throw new Error(
            `@unwitnessable reason for column ${openReason} contains a per-column ` +
              `marker, which would be counted as a claim: ${cont[1]!.trim()}`,
          );
        }
        unwitnessable.set(openReason, `${unwitnessable.get(openReason)!} ${cont[1]!.trim()}`);
        continue;
      }
      openReason = null;
    }

    const nullGroupMatch = NULL_GROUP_RE.exec(line);
    if (nullGroupMatch) {
      const raw = nullGroupMatch[1]!.trim();
      const columns: number[] = [];
      const discriminants: number[] = [];
      for (const part of raw.split(",")) {
        const m = /^(\d+)(\*?)$/.exec(part.trim());
        if (!m) {
          throw new Error(
            `@null-group must be \`-- @null-group <col>[*],<col>[*][,…]\` with 0-based ` +
              `output column indices (\`*\` marks a discriminant), got: ${raw}`,
          );
        }
        const index = Number(m[1]);
        if (columns.includes(index)) {
          throw new Error(`@null-group lists column ${index} twice: ${raw}`);
        }
        columns.push(index);
        if (m[2]) discriminants.push(index);
      }
      if (columns.length < 2 || discriminants.length === 0) {
        throw new Error(
          `@null-group needs two or more members and at least one \`*\` discriminant ` +
            `(a smaller group says nothing the flat contract does not), got: ${raw}`,
        );
      }
      columns.sort((a, b) => a - b);
      discriminants.sort((a, b) => a - b);
      const key = columns.join(",");
      if (nullGroupClaims.some(g => g.columns.join(",") === key)) {
        throw new Error(`duplicate @null-group annotation for {${key}}`);
      }
      nullGroupClaims.push({ columns, discriminants });
      continue;
    }

    const rejectMatch = PARAM_REJECT_RE.exec(line);
    if (rejectMatch) {
      const members = rejectMatch[1]!
        .trim()
        .split(",")
        .map(p => Number(p.trim()));
      if (members.length < 2 || members.some(m => !Number.isInteger(m) || m < 1)) {
        throw new Error(
          `@param-reject must be \`-- @param-reject <n>,<m>[,…]\` with two or more ` +
            `parameter numbers, got: ${rejectMatch[1]!.trim()}`,
        );
      }
      const sorted = [...new Set(members)].sort((a, b) => a - b);
      if (sorted.length !== members.length) {
        throw new Error(`@param-reject lists a parameter twice: ${rejectMatch[1]!.trim()}`);
      }
      const key = sorted.join(",");
      if (rejectClaims.some(s => s.join(",") === key)) {
        throw new Error(`duplicate @param-reject annotation for {${key}}`);
      }
      rejectClaims.push(sorted);
      continue;
    }

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
      openReason = index;
      continue;
    }

    const opaqueMatch = PARAM_OPAQUE_RE.exec(line);
    if (opaqueMatch) {
      const m = /^(\d+)\s*:\s*(.+)$/.exec(opaqueMatch[1]!.trim());
      const number = m ? Number(m[1]) : NaN;
      if (!m || !Number.isInteger(number) || number < 1) {
        throw new Error(
          `@param-opaque must be \`-- @param-opaque <n>: <reason>\`, ` +
            `got: ${opaqueMatch[1]!.trim()}`,
        );
      }
      if (paramOpaque.has(number)) {
        throw new Error(`duplicate @param-opaque annotation for $${number}`);
      }
      paramOpaque.set(number, m[2]!.trim());
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

  // A reject set's members are by definition the CONDITIONALLY required
  // parameters, which is a claim about their individual nullability too —
  // require the pairing so the two annotation layers cannot drift.
  for (const set of rejectClaims) {
    for (const member of set) {
      const claim = paramClaims.find(p => p.number === member);
      if (!claim || claim.notNull) {
        throw new Error(
          `@param-reject member $${member} must also carry \`-- @param ${member} nullable\`: ` +
            `a set member is conditionally required, never unconditionally so`,
        );
      }
    }
  }

  // An opaque marker is about a claim, so the claim has to exist and has to be
  // the one it explains: a notNull parameter is already claimed and needs no
  // excuse, and an unannotated number is a marker pointing at nothing.
  for (const [number] of paramOpaque) {
    const claim = paramClaims.find(p => p.number === number);
    if (!claim || claim.notNull) {
      throw new Error(
        `@param-opaque $${number} must also carry \`-- @param ${number} nullable\`: ` +
          `it records that an UNCLAIMED parameter raises anyway`,
      );
    }
  }

  if (bindings.length === 0) {
    bindings.push({ label: "unbound", args: null });
  }
  return {
    bindings,
    noRowsReason,
    raisesPattern,
    paramClaims,
    paramOpaque,
    rejectClaims,
    nullGroupClaims,
    unwitnessable,
  };
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
