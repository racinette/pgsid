import type { Node } from "libpg-query";

// ---------------------------------------------------------------------------
// CHECK-constraint entailment kernel.
//
// A small derivation engine over three judgments about predicate ASTs,
// evaluated for the single row a scope is emitting:
//
//   TRUE(p)     — p evaluated TRUE for this row.
//   FALSE(p)    — p evaluated FALSE for this row.
//   notFALSE(p) — p evaluated TRUE or NULL for this row.
//
// The inputs are asymmetric in strength and that asymmetry is the design:
//
//   - Row-implied predicates (WHERE conjuncts, implied ON quals, HAVING)
//     are TRUE for every emitted row.
//   - A VALIDATED table CHECK constraint is only notFALSE for every stored
//     row — PostgreSQL accepts a row whose CHECK evaluates NULL (measured,
//     pinned in the check-null-passes test).
//
// The kernel never evaluates anything (the register's rung-ladder ruling
// forbids value tracking): every leaf-level conclusion is syntactic identity
// between an atom of the CHECK expression and an atom of the row-implied
// evidence, or the pairing of an atom with its builtin negator. Literal
// *distinctness* ('a' ≠ 'b') is deliberately underivable — nondeterministic
// collations make differently-spelled strings equal — which is what keeps
// the negative branches of a discriminated CHECK safely unprovable.
//
// Atoms are restricted to the fragment deterministic over the row, because a
// CHECK was evaluated at WRITE time and the evidence holds at READ time:
// transferring a truth value between the two is only sound for expressions
// that are pure functions of the stored row. Function calls therefore never
// match, and the closed operator list is the builtin comparison subset of
// TOTAL_STRICT_OPERATORS by bare name (the same shadowing blind spot the
// promotion gate documents).
//
// Literal casts: pg_get_constraintdef annotates literals with the type the
// comparison resolved at (`'housed'::text`) while a user's WHERE usually
// carries the bare literal. The two match only when the explicit cast names
// the column's own type — then both sides denote the identical comparison —
// and refuse otherwise: an explicit cast to a different type selects a
// different operator, and e.g. a citext column's `=` can be TRUE where a
// bytewise comparison of the same tokens is FALSE. Timestamp-like literals
// are value-rewritten by the deparser ('2020-01-01' becomes
// '2020-01-01 00:00:00+03'), which exact-token matching rejects on its own.
//
// See docs/nullability-walk.md for how the walk feeds this kernel.
// ---------------------------------------------------------------------------

export interface CheckEntailmentTrace {
  addFact(name: string, value: string): void;
}

export interface CheckEntailmentInput {
  /** The column being resolved, as the walk's alias-qualified pair. */
  goal: { alias: string; column: string };
  /**
   * Validated CHECK expressions with bare column refs already qualified to
   * the goal's alias (`qualifyColumnRefs`). Each is notFALSE per stored row.
   */
  checkExprs: Node[];
  /**
   * Row-implied predicates — the exact list `checkWhereGuarantee` iterates:
   * whereClause, havingClause, implied ON quals. Each is TRUE per emitted
   * row; the kernel splits them into conjuncts itself.
   */
  evidence: Node[];
  /**
   * The DML SET mask: true for a column whose WHERE-time (OLD row) value can
   * differ from the stored NEW row the CHECK constrains. Any atom touching a
   * masked column is dropped from the evidence — the Wave-1 rule, applied
   * per-conjunct because entailment consumes evidence about *other* columns
   * than the one being resolved.
   */
  isMasked(alias: string, column: string): boolean;
  /**
   * Resolve an unqualified evidence column name to its owning alias, or null
   * when it is ambiguous, merged, or foreign to the scope. (CHECK-side refs
   * are pre-qualified and never consult this.)
   */
  resolveUnqualified(column: string): string | null;
  /**
   * `format_type` rendering of a column's declared type, or null when
   * unknown. Consulted only for literal-cast compatibility.
   */
  columnTypeName(alias: string, column: string): string | null;
  trace?: CheckEntailmentTrace;
}

/**
 * Whether the validated CHECK constraints, combined with the row-implied
 * evidence, prove `goal` non-null for every row the scope emits.
 */
export function checkConstraintsProveNotNull(input: CheckEntailmentInput): boolean {
  const kernel = new EntailmentKernel(input);
  return kernel.run();
}

// ---------------------------------------------------------------------------
// Atoms — the matchable fragment.
// ---------------------------------------------------------------------------

/** A literal token: the A_Const payload plus its explicit cast, if any. */
interface Lit {
  kind: "ival" | "fval" | "sval" | "boolval" | "bsval";
  value: number | string | boolean;
  /** Normalized explicit cast target, null for a bare literal. */
  cast: TypeRef | null;
}

interface TypeRef {
  schema: string | null;
  name: string;
}

type Atom =
  | { t: "cmpLit"; col: string; op: string; lit: Lit }
  | { t: "cmpCol"; a: string; op: string; b: string }
  | { t: "nullTest"; col: string; isNotNull: boolean }
  | { t: "boolCol"; col: string };

/** Canonical spellings of the closed comparison-operator list. */
const CANONICAL_OPS: Record<string, string> = {
  "=": "=", "<>": "<>", "!=": "<>", "<": "<", ">": ">", "<=": "<=", ">=": ">=",
};

/** op(a,b) ⇔ FLIPPED[op](b,a) — for canonicalizing literal-on-the-left. */
const FLIPPED_OPS: Record<string, string> = {
  "=": "=", "<>": "<>", "<": ">", ">": "<", "<=": ">=", ">=": "<=",
};

/**
 * TRUE(col NEG_OP x) ⇒ FALSE(col OP x) for the builtin comparison pairs — a
 * total order's negator relation, sound for every btree opclass including
 * NaN. This pairing is what makes implication-as-OR work without literal
 * distinctness: TRUE(status = 'housed') falsifies `status <> 'housed'`.
 */
const NEGATOR_OPS: Record<string, string> = {
  "=": "<>", "<>": "=", "<": ">=", ">=": "<", ">": "<=", "<=": ">",
};

/**
 * Internal catalog names → the `format_type` rendering the snapshot stores.
 * Fixed pg_catalog spellings; a name not listed renders as itself.
 */
const TYPE_RENDERINGS: Record<string, string> = {
  int2: "smallint",
  int4: "integer",
  int8: "bigint",
  float4: "real",
  float8: "double precision",
  decimal: "numeric",
  bool: "boolean",
  varchar: "character varying",
  bpchar: "character",
  timestamptz: "timestamp with time zone",
  timestamp: "timestamp without time zone",
  timetz: "time with time zone",
  time: "time without time zone",
};

// ---------------------------------------------------------------------------
// The kernel.
// ---------------------------------------------------------------------------

class EntailmentKernel {
  private readonly input: CheckEntailmentInput;
  private trueFacts: Atom[] = [];
  private falseFacts: Atom[] = [];

  constructor(input: CheckEntailmentInput) {
    this.input = input;
  }

  run(): boolean {
    for (const pred of this.input.evidence) this.collectConjuncts(pred);
    this.input.trace?.addFact(
      "evidence",
      `${this.trueFacts.length} TRUE atom(s), ${this.falseFacts.length} FALSE atom(s)`,
    );
    // Zero evidence atoms is not an early exit: an unconditional
    // CHECK (col IS NOT NULL), or an AND containing one, derives the goal
    // with no evidence at all.
    for (let i = 0; i < this.input.checkExprs.length; i++) {
      if (this.deriveGoal(this.input.checkExprs[i]!)) {
        this.input.trace?.addFact("provedBy", `CHECK constraint #${i + 1} (notFALSE + evidence)`);
        return true;
      }
    }
    return false;
  }

  // -------------------------------------------------------------------------
  // Evidence: TRUE conjuncts → atoms.
  // -------------------------------------------------------------------------

  private collectConjuncts(pred: Node): void {
    const node = pred as Record<string, unknown>;
    const be = node["BoolExpr"] as { boolop?: string; args?: Node[] } | undefined;
    if (be?.boolop === "AND_EXPR") {
      for (const arg of be.args ?? []) this.collectConjuncts(arg);
      return;
    }
    // TRUE(NOT p) ⇔ FALSE(p) — a NOT conjunct contributes a FALSE fact.
    if (be?.boolop === "NOT_EXPR" && be.args?.length === 1) {
      for (const atom of this.atomsOf(be.args[0]!)) this.falseFacts.push(atom);
      return;
    }
    for (const atom of this.atomsOf(pred)) this.trueFacts.push(atom);
  }

  /**
   * The atoms one conjunct asserts, empty when it is outside the fragment.
   * BETWEEN desugars to its two bound comparisons (matching how the deparser
   * renders a CHECK's BETWEEN back as `>= AND <=`); a single-element IN is
   * its equality. Multi-element IN and OR conjuncts assert no single atom
   * and are skipped — conservatively, not incorrectly.
   */
  private atomsOf(pred: Node): Atom[] {
    const node = pred as Record<string, unknown>;

    if ("A_Expr" in node) {
      const ae = node["A_Expr"] as { kind?: string; name?: Node[]; lexpr?: Node; rexpr?: Node };
      if (ae.kind === "AEXPR_OP" && ae.lexpr && ae.rexpr) {
        const op = this.bareOpName(ae.name);
        if (!op) return [];
        const atom = this.comparisonAtom(op, ae.lexpr, ae.rexpr);
        return atom ? [atom] : [];
      }
      // BETWEEN is its two bound comparisons (the deparser itself renders a
      // CHECK's BETWEEN back in that expanded form). The symmetric variant
      // reorders its bounds and is not a plain conjunction — skipped.
      if (ae.kind === "AEXPR_BETWEEN" && ae.lexpr) {
        const bounds = (ae.rexpr as { List?: { items?: Node[] } } | undefined)?.List?.items;
        if (bounds?.length !== 2) return [];
        const lo = this.comparisonAtom(">=", ae.lexpr, bounds[0]!);
        const hi = this.comparisonAtom("<=", ae.lexpr, bounds[1]!);
        return lo && hi ? [lo, hi] : [];
      }
      if (ae.kind === "AEXPR_IN" && this.bareOpName(ae.name) === "=" && ae.lexpr) {
        const items = (ae.rexpr as { List?: { items?: Node[] } } | undefined)?.List?.items;
        if (items?.length !== 1) return [];
        const atom = this.comparisonAtom("=", ae.lexpr, items[0]!);
        return atom ? [atom] : [];
      }
      return [];
    }

    if ("NullTest" in node) {
      const nt = node["NullTest"] as { arg?: Node; nulltesttype?: string };
      const col = nt.arg ? this.columnKey(nt.arg) : null;
      if (!col || this.maskedKey(col)) return [];
      return [{ t: "nullTest", col, isNotNull: nt.nulltesttype === "IS_NOT_NULL" }];
    }

    // A bare boolean column used as a predicate (`WHERE active`).
    if ("ColumnRef" in node) {
      const col = this.columnKey(pred);
      if (!col || this.maskedKey(col)) return [];
      return [{ t: "boolCol", col }];
    }

    return [];
  }

  private comparisonAtom(op: string, lexpr: Node, rexpr: Node): Atom | null {
    const canonical = CANONICAL_OPS[op];
    if (!canonical) return null;
    const lcol = this.columnKey(lexpr);
    const rcol = this.columnKey(rexpr);
    if (lcol && rcol) {
      if (this.maskedKey(lcol) || this.maskedKey(rcol)) return null;
      return { t: "cmpCol", a: lcol, op: canonical, b: rcol };
    }
    if (lcol) {
      const lit = this.litOf(rexpr);
      if (!lit || this.maskedKey(lcol)) return null;
      return { t: "cmpLit", col: lcol, op: canonical, lit };
    }
    if (rcol) {
      const lit = this.litOf(lexpr);
      if (!lit || this.maskedKey(rcol)) return null;
      return { t: "cmpLit", col: rcol, op: FLIPPED_OPS[canonical]!, lit };
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // Judgments over the CHECK expression tree.
  // -------------------------------------------------------------------------

  /**
   * Derive the goal from one CHECK expression known notFALSE. Every step is
   * one of the closed rules; each recursion re-establishes notFALSE for the
   * node it descends into.
   */
  private deriveGoal(expr: Node): boolean {
    const node = expr as Record<string, unknown>;

    // Totality: notFALSE(goal IS NOT NULL) ⇒ TRUE (IS NOT NULL never
    // returns NULL) ⇒ the goal column is non-null.
    if ("NullTest" in node) {
      const nt = node["NullTest"] as { arg?: Node; nulltesttype?: string };
      return (
        nt.nulltesttype === "IS_NOT_NULL" &&
        !!nt.arg &&
        this.columnKey(nt.arg) === `${this.input.goal.alias}.${this.input.goal.column}`
      );
    }

    if ("BoolExpr" in node) {
      const be = node["BoolExpr"] as { boolop?: string; args?: Node[] };
      const args = be.args ?? [];
      // notFALSE(a ∧ b) ⇒ notFALSE(a) and notFALSE(b): an AND splits into
      // independent facts, one derivation per conjunct.
      if (be.boolop === "AND_EXPR") {
        return args.some(a => this.deriveGoal(a));
      }
      // FALSE(every other disjunct) ∧ notFALSE(or) ⇒ notFALSE(survivor).
      if (be.boolop === "OR_EXPR") {
        const live = args.filter(a => !this.isFalse(a));
        return live.length === 1 && this.deriveGoal(live[0]!);
      }
      return false;
    }

    // notFALSE(CASE): the arm the row selected inherits notFALSE. Arm i is
    // selected when conditions 1..i-1 are FALSE and condition i is TRUE;
    // when every condition is FALSE, the ELSE is. A condition neither
    // provably TRUE nor FALSE ends the derivation — arm selection past it
    // would need literal distinctness. Simple CASE (`CASE expr WHEN ...`)
    // compares by an implicit equality the fragment does not model: skipped.
    if ("CaseExpr" in node) {
      const ce = node["CaseExpr"] as { arg?: Node; args?: Node[]; defresult?: Node };
      if (ce.arg) return false;
      for (const w of ce.args ?? []) {
        const when = (w as Record<string, unknown>)["CaseWhen"] as
          | { expr?: Node; result?: Node }
          | undefined;
        if (!when?.expr) return false;
        if (this.isFalse(when.expr)) continue;
        if (this.isTrue(when.expr)) return !!when.result && this.deriveGoal(when.result);
        return false;
      }
      return !!ce.defresult && this.deriveGoal(ce.defresult);
    }

    return false;
  }

  /** TRUE(expr) — for this emitted row. */
  private isTrue(expr: Node): boolean {
    const node = expr as Record<string, unknown>;

    if ("BoolExpr" in node) {
      const be = node["BoolExpr"] as { boolop?: string; args?: Node[] };
      const args = be.args ?? [];
      if (be.boolop === "AND_EXPR") return args.length > 0 && args.every(a => this.isTrue(a));
      if (be.boolop === "OR_EXPR") return args.some(a => this.isTrue(a));
      if (be.boolop === "NOT_EXPR") return args.length === 1 && this.isFalse(args[0]!);
      return false;
    }

    // `col = ANY (ARRAY[...])` — the deparser's rendering of IN. One
    // element comparison TRUE suffices, exactly the OR rule.
    if ("A_Expr" in node) {
      const ae = node["A_Expr"] as { kind?: string; name?: Node[]; lexpr?: Node; rexpr?: Node };
      if (ae.kind === "AEXPR_OP_ANY" && ae.lexpr) {
        const op = this.bareOpName(ae.name);
        const elements = (ae.rexpr as { A_ArrayExpr?: { elements?: Node[] } } | undefined)
          ?.A_ArrayExpr?.elements;
        if (!op || !elements) return false;
        return elements.some(el => {
          const atom = this.comparisonAtom(op, ae.lexpr!, el);
          return !!atom && this.atomIsTrue(atom);
        });
      }
    }

    // A TRUE strict comparison involving `col` proves col IS NOT NULL —
    // the same inference WHERE promotion makes, folded into the kernel so a
    // CHECK's own `col IS NOT NULL` guard matches comparison evidence.
    if ("NullTest" in node) {
      const nt = node["NullTest"] as { arg?: Node; nulltesttype?: string };
      const col = nt.arg ? this.columnKey(nt.arg) : null;
      if (col && nt.nulltesttype === "IS_NOT_NULL" && this.colKnownNonNull(col)) return true;
    }

    const atom = this.atomsOf(expr);
    return atom.length > 0 && atom.every(a => this.atomIsTrue(a));
  }

  /** FALSE(expr) — for this emitted row. */
  private isFalse(expr: Node): boolean {
    const node = expr as Record<string, unknown>;

    if ("BoolExpr" in node) {
      const be = node["BoolExpr"] as { boolop?: string; args?: Node[] };
      const args = be.args ?? [];
      if (be.boolop === "AND_EXPR") return args.some(a => this.isFalse(a));
      if (be.boolop === "OR_EXPR") return args.length > 0 && args.every(a => this.isFalse(a));
      if (be.boolop === "NOT_EXPR") return args.length === 1 && this.isTrue(args[0]!);
      return false;
    }

    if ("A_Expr" in node) {
      const ae = node["A_Expr"] as { kind?: string; name?: Node[]; lexpr?: Node; rexpr?: Node };
      if (ae.kind === "AEXPR_OP_ANY" && ae.lexpr) {
        const op = this.bareOpName(ae.name);
        const elements = (ae.rexpr as { A_ArrayExpr?: { elements?: Node[] } } | undefined)
          ?.A_ArrayExpr?.elements;
        if (!op || !elements) return false;
        return (
          elements.length > 0 &&
          elements.every(el => {
            const atom = this.comparisonAtom(op, ae.lexpr!, el);
            return !!atom && this.atomIsFalse(atom);
          })
        );
      }
    }

    // FALSE(col IS NULL) when a TRUE strict comparison pins col non-null.
    if ("NullTest" in node) {
      const nt = node["NullTest"] as { arg?: Node; nulltesttype?: string };
      const col = nt.arg ? this.columnKey(nt.arg) : null;
      if (col && nt.nulltesttype === "IS_NULL" && this.colKnownNonNull(col)) return true;
    }

    const atoms = this.atomsOf(expr);
    return atoms.length > 0 && atoms.every(a => this.atomIsFalse(a));
  }

  // -------------------------------------------------------------------------
  // Atom-level matching.
  // -------------------------------------------------------------------------

  private atomIsTrue(atom: Atom): boolean {
    return this.trueFacts.some(f => this.atomsMatch(atom, f));
  }

  private atomIsFalse(atom: Atom): boolean {
    if (this.falseFacts.some(f => this.atomsMatch(atom, f))) return true;
    const negated = this.negateAtom(atom);
    return !!negated && this.trueFacts.some(f => this.atomsMatch(negated, f));
  }

  /** The atom whose TRUTH makes `atom` FALSE, or null when there is none. */
  private negateAtom(atom: Atom): Atom | null {
    switch (atom.t) {
      case "cmpLit": {
        const neg = NEGATOR_OPS[atom.op];
        return neg ? { ...atom, op: neg } : null;
      }
      case "cmpCol": {
        const neg = NEGATOR_OPS[atom.op];
        return neg ? { ...atom, op: neg } : null;
      }
      case "nullTest":
        return { ...atom, isNotNull: !atom.isNotNull };
      case "boolCol":
        // FALSE(col) would need `NOT col` in the evidence, which arrives as
        // a falseFacts entry already; there is no single negated atom.
        return null;
    }
  }

  private atomsMatch(a: Atom, b: Atom): boolean {
    if (a.t !== b.t) return false;
    switch (a.t) {
      case "cmpLit": {
        const o = b as Extract<Atom, { t: "cmpLit" }>;
        return a.col === o.col && a.op === o.op && this.litsMatch(a.col, a.lit, o.lit);
      }
      case "cmpCol": {
        const o = b as Extract<Atom, { t: "cmpCol" }>;
        return (
          (a.a === o.a && a.op === o.op && a.b === o.b) ||
          (a.a === o.b && FLIPPED_OPS[a.op] === o.op && a.b === o.a)
        );
      }
      case "nullTest": {
        const o = b as Extract<Atom, { t: "nullTest" }>;
        return a.col === o.col && a.isNotNull === o.isNotNull;
      }
      case "boolCol":
        return a.col === (b as Extract<Atom, { t: "boolCol" }>).col;
    }
  }

  /**
   * Two literal tokens denote the same comparison against `colKey` when the
   * payloads are identical AND their effective types agree — a bare literal's
   * effective type is the column's own (that is what an untyped literal in a
   * column comparison resolves to), an explicitly cast one is its cast
   * target. Unknown column type + one bare side refuses: nothing pins the
   * bare side's resolution.
   */
  private litsMatch(colKey: string, a: Lit, b: Lit): boolean {
    if (a.kind !== b.kind || a.value !== b.value) return false;
    if (a.cast === null && b.cast === null) return true;
    const colType = this.colTypeRef(colKey);
    const effA = a.cast ?? colType;
    const effB = b.cast ?? colType;
    if (!effA || !effB) return false;
    return effA.name === effB.name && effA.schema === effB.schema;
  }

  /** True TRUE strict comparison (or IS NOT NULL fact) involving `col`. */
  private colKnownNonNull(col: string): boolean {
    return this.trueFacts.some(f => {
      switch (f.t) {
        case "cmpLit":
          return f.col === col;
        case "cmpCol":
          return f.a === col || f.b === col;
        case "nullTest":
          return f.col === col && f.isNotNull;
        case "boolCol":
          return f.col === col;
      }
    });
  }

  // -------------------------------------------------------------------------
  // Leaves: column keys, literals, operator and type names.
  // -------------------------------------------------------------------------

  /** `alias.column` for a plain ColumnRef, null for anything else. */
  private columnKey(expr: Node): string | null {
    const node = expr as Record<string, unknown>;
    if (!("ColumnRef" in node)) return null;
    const fields = (node["ColumnRef"] as { fields?: Node[] }).fields ?? [];
    const parts: string[] = [];
    for (const f of fields) {
      const s = (f as { String?: { sval?: string } }).String?.sval;
      if (s === undefined) return null; // A_Star or unexpected shape
      parts.push(s);
    }
    if (parts.length === 1) {
      const alias = this.input.resolveUnqualified(parts[0]!);
      return alias ? `${alias}.${parts[0]}` : null;
    }
    if (parts.length === 2) return `${parts[0]}.${parts[1]}`;
    if (parts.length === 3) return `${parts[1]}.${parts[2]}`;
    return null;
  }

  private maskedKey(key: string): boolean {
    const dot = key.indexOf(".");
    return this.input.isMasked(key.slice(0, dot), key.slice(dot + 1));
  }

  /**
   * The literal token of an A_Const, optionally wrapped in exactly one plain
   * TypeCast. A cast with a typmod or array bounds is not a plain type
   * annotation and refuses; so does NULL (no comparison over it is ever
   * TRUE, and no CHECK atom containing it can be selected).
   */
  private litOf(expr: Node): Lit | null {
    let node = expr as Record<string, unknown>;
    let cast: TypeRef | null = null;
    if ("TypeCast" in node) {
      const tc = node["TypeCast"] as {
        arg?: Node;
        typeName?: { names?: Node[]; typmods?: Node[]; arrayBounds?: Node[] };
      };
      if (!tc.arg || !tc.typeName) return null;
      if (tc.typeName.typmods?.length || tc.typeName.arrayBounds?.length) return null;
      cast = this.typeRefOf(tc.typeName.names ?? []);
      if (!cast) return null;
      node = tc.arg as Record<string, unknown>;
    }
    if (!("A_Const" in node)) return null;
    const ac = node["A_Const"] as Record<string, Record<string, unknown> | undefined> & {
      isnull?: boolean;
    };
    if (ac.isnull) return null;
    if (ac["ival"]) return { kind: "ival", value: (ac["ival"]["ival"] as number) ?? 0, cast };
    if (ac["fval"]) return { kind: "fval", value: (ac["fval"]["fval"] as string) ?? "", cast };
    if (ac["sval"]) return { kind: "sval", value: (ac["sval"]["sval"] as string) ?? "", cast };
    if (ac["boolval"])
      return { kind: "boolval", value: (ac["boolval"]["boolval"] as boolean) ?? false, cast };
    if (ac["bsval"]) return { kind: "bsval", value: (ac["bsval"]["bsval"] as string) ?? "", cast };
    return null;
  }

  /** Normalized cast target from a TypeName's names list. */
  private typeRefOf(names: Node[]): TypeRef | null {
    const parts: string[] = [];
    for (const n of names) {
      const s = (n as { String?: { sval?: string } }).String?.sval;
      if (s === undefined) return null;
      parts.push(s);
    }
    if (parts[0] === "pg_catalog") parts.shift();
    if (parts.length === 1) return { schema: null, name: TYPE_RENDERINGS[parts[0]!] ?? parts[0]! };
    if (parts.length === 2) return { schema: parts[0]!, name: parts[1]! };
    return null;
  }

  /** The column's declared type as a TypeRef, from the format_type string. */
  private colTypeRef(colKey: string): TypeRef | null {
    const dot = colKey.indexOf(".");
    const rendered = this.input.columnTypeName(colKey.slice(0, dot), colKey.slice(dot + 1));
    if (!rendered) return null;
    // format_type folds the typmod into the name (`character varying(20)`,
    // `timestamp(3) with time zone`) — strip it; unquote quoted identifiers.
    const stripped = rendered.replace(/\(.*?\)/, "").replace(/\s+/g, " ").trim().replace(/"/g, "");
    const dotIdx = stripped.indexOf(".");
    if (dotIdx > 0 && !stripped.includes(" ")) {
      return { schema: stripped.slice(0, dotIdx), name: stripped.slice(dotIdx + 1) };
    }
    return { schema: null, name: stripped };
  }

  /** The bare operator name, refusing schema-qualified operators. */
  private bareOpName(name: Node[] | undefined): string | null {
    if (name?.length !== 1) return null;
    const s = (name[0] as { String?: { sval?: string } }).String?.sval;
    if (!s) return null;
    return CANONICAL_OPS[s] ?? null;
  }
}
