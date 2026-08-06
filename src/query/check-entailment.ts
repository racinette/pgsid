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
// STRICT_OPERATORS by bare name (the same shadowing blind spot the
// promotion gate documents).
//
// Beyond single atoms, three fact forms round out the evidence (Wave 7):
// disjunctive conjuncts (OR, multi-element IN, = ANY over an array literal)
// become OR-facts consumed by the subset rule — TRUE(a ∨ b) makes any
// superset OR TRUE; NOT-wrapped conjuncts become FALSE facts (with De Morgan
// over a negated OR), and the negator pairing runs in both directions — a
// TRUE fact falsifies its negation AND a FALSE fact certifies it, since a
// strict comparison that evaluated FALSE had non-null operands. The walk
// feeds the kernel per-channel evidence lists (OLD row / NEW row / the read
// row of a SET expression) with the SET mask applied per source; see the
// call site in nullability-walk.ts for the row-consistency argument.
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

/**
 * One row-implied predicate. The soundness rule the flag encodes: every fact
 * must hold on the row the derivation applies the CHECK to. A DML statement
 * has two stored rows (OLD and NEW, both CHECK-satisfying); a fact source
 * that described the OTHER row transfers only through columns the statement
 * does not write — so the walk marks each source with whether the SET mask
 * applies for the channel it is running, and the kernel drops masked atoms
 * during collection.
 */
export interface EvidencePred {
  pred: Node;
  applySetMask: boolean;
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
   * Row-implied predicates, TRUE per emitted row: the `checkWhereGuarantee`
   * list (whereClause, havingClause, implied ON quals) plus the taken branch
   * guards of the scope. The kernel splits them into conjuncts itself.
   */
  evidence: EvidencePred[];
  /**
   * The DML SET mask, consulted only for sources flagged `applySetMask`:
   * true for a column the statement writes, whose value on the channel's
   * derivation row is not the one the source tested.
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
  /**
   * Whether unequal literal tokens provably denote unequal values for this
   * column — the collation-gated distinctness relaxation (text-family OID
   * whitelist + proven-deterministic collation, resolved by the catalog).
   * Everything distinctness enables (multi-WHEN arm falsification, the
   * generated-CASE arm exclusion) stays dark when this refuses.
   */
  literalDistinctnessSound(alias: string, column: string): boolean;
  /**
   * Generated columns of the goal's relation, as alias-qualified equality
   * facts: per stored row, `column = expr` holds EXACTLY (both the OLD and
   * NEW rows of a DML statement — the generation expression is recomputed
   * on write). A TRUE evidence fact `col = 'lit'` triggers arm exclusion
   * over a CASE-shaped expr: arms whose literal result is provably distinct
   * from 'lit' (and the NULL result, which a TRUE equality rules out) did
   * not produce the value, and if exactly one arm survives, its condition
   * held and joins the fact set.
   */
  generatedEqualities?: { column: string; expr: Node }[];
  /**
   * Promotion-at-distance (Wave 12): when the goal's origin chain crosses
   * an OPTIONAL slice, its base row exists only for rows the EVIDENCE pins
   * — a NULL-extended slice has every listed column NULL, so at least one
   * of them provably non-null from evidence alone certifies the row. The
   * gate runs BEFORE the harvest fixpoint: harvested facts presuppose the
   * very presence being established. Refusing when the list is empty is
   * what keeps an unfilterable optional chain dark.
   */
  presenceColumns?: string[];
  /**
   * Whether EVERY stored row of the goal's origin table has the column
   * non-null — the catalog's NOT NULL flag, or (for generated columns) the
   * generation expression proven non-null by the walk in a synthetic
   * single-table scope. Set only alongside `presenceColumns` (an optional
   * origin chain): once the presence gate proves the base row exists on
   * every emitted row, this settles the goal — the value IS the stored
   * value. No CHECK derivation needed, which is what lets a table with no
   * CHECKs at all benefit from evidence-pinned presence.
   */
  goalNotNullGivenPresent?: boolean;
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
  /**
   * TRUE OR-facts: one entry per TRUE disjunctive conjunct, holding each
   * arm's conjunct ATOMS (an arm may itself be a conjunction —
   * `(a AND b) OR c` stores [[a,b],[c]]). TRUE(a ∨ b) names no single arm,
   * but whichever arm held, ALL of its conjuncts held — so the subset rule
   * matches by arm-implication: every arm must have SOME atom matching an
   * arm of the CHECK-side OR (A∧B ⇒ A). An arm with no atoms refuses the
   * whole fact, conservatively.
   */
  private orFacts: Atom[][][] = [];
  /**
   * Whether the SET mask applies to atoms being built RIGHT NOW. On only
   * while collecting a masked evidence source — never for CHECK-side
   * atomization: a CHECK sub-predicate over a written column is not
   * evidence, and its truth is judged against facts that were themselves
   * masked at collection.
   */
  private maskingActive = false;

  constructor(input: CheckEntailmentInput) {
    this.input = input;
  }

  run(): boolean {
    for (const src of this.input.evidence) {
      this.maskingActive = src.applySetMask;
      this.collectConjuncts(src.pred);
    }
    this.maskingActive = false;
    // Presence gate — evidence-only, before any derived fact exists.
    if (this.input.presenceColumns) {
      const present = this.input.presenceColumns.some(col => this.colKnownNonNull(col));
      if (!present) {
        this.input.trace?.addFact(
          "presence",
          "UNPROVEN — no evidence fact pins a same-row column of the optional chain",
        );
        return false;
      }
      this.input.trace?.addFact("presence", "proven from evidence");
      // With presence proven, a goal that is non-null on every stored row
      // (catalog NOT NULL, or a generation expression the walk proved) is
      // already done: the emitted value is the stored value. CHECK
      // derivation is for the goals neither can settle.
      if (this.input.goalNotNullGivenPresent) {
        this.input.trace?.addFact("goal", "non-null per stored row — settled by presence alone");
        return true;
      }
    }
    // The derivation fixpoint (Wave 11b): each round lets the generated
    // equalities and every CHECK contribute FACTS — a notFALSE chain
    // reaching a total NullTest is TRUE, whichever constraint it came from
    // — and a fact one constraint derives can select arms or falsify
    // disjuncts in ANOTHER (CHECK₁: assigned ⇒ combo; CHECK₂: combo ⇒
    // opened_at). Fact insertion is deduplicated, the fact universe is the
    // finite set of the CHECKs' sub-atoms, and the round cap is insurance,
    // not a reachable bound.
    for (let round = 0; round < 6; round++) {
      const before =
        this.trueFacts.length + this.falseFacts.length + this.orFacts.length;
      this.applyGeneratedEqualities();
      for (const expr of this.input.checkExprs) this.harvestCheckFacts(expr);
      if (
        this.trueFacts.length + this.falseFacts.length + this.orFacts.length ===
        before
      ) {
        break;
      }
    }
    this.input.trace?.addFact(
      "facts",
      `${this.trueFacts.length} TRUE atom(s), ${this.falseFacts.length} FALSE atom(s), ` +
        `${this.orFacts.length} OR-fact(s) after the derivation fixpoint`,
    );
    // One question at the end: do the facts pin the goal column? A CHECK's
    // own `goal IS NOT NULL` arrives here as a harvested fact (totality),
    // exactly like a generated-CASE arm's strict condition or a chained
    // conclusion from a neighbouring constraint.
    if (this.colKnownNonNull(`${this.input.goal.alias}.${this.input.goal.column}`)) {
      this.input.trace?.addFact("provedBy", "the derived fact set pins the goal column");
      return true;
    }
    return false;
  }

  // -------------------------------------------------------------------------
  // Fact harvesting — notFALSE propagation from each CHECK root.
  // -------------------------------------------------------------------------

  /**
   * Descend a CHECK expression along its notFALSE spine — AND splits, an OR
   * whose other disjuncts are FALSE passes to the survivor, a CASE passes to
   * the arm the facts select — and turn every total leaf reached into a
   * TRUE fact: a NullTest of EITHER polarity never evaluates NULL, so
   * notFALSE means TRUE outright. (Comparisons stay unharvested: notFALSE
   * of a strict comparison is TRUE-or-NULL, and promoting it would need its
   * operands pinned first — recorded, not built.)
   */
  private harvestCheckFacts(expr: Node): void {
    const node = expr as Record<string, unknown>;

    if ("NullTest" in node) {
      const nt = node["NullTest"] as { arg?: Node; nulltesttype?: string };
      const col = nt.arg ? this.columnKey(nt.arg) : null;
      if (col) {
        this.addTrueFact({ t: "nullTest", col, isNotNull: nt.nulltesttype === "IS_NOT_NULL" });
      }
      return;
    }

    if ("BoolExpr" in node) {
      const be = node["BoolExpr"] as { boolop?: string; args?: Node[] };
      const args = be.args ?? [];
      if (be.boolop === "AND_EXPR") {
        for (const a of args) this.harvestCheckFacts(a);
        return;
      }
      if (be.boolop === "OR_EXPR") {
        const live = args.filter(a => !this.isFalse(a));
        if (live.length === 1) this.harvestCheckFacts(live[0]!);
        return;
      }
      return;
    }

    if ("CaseExpr" in node) {
      const ce = node["CaseExpr"] as { arg?: Node; args?: Node[]; defresult?: Node };
      for (const w of ce.args ?? []) {
        const when = (w as Record<string, unknown>)["CaseWhen"] as
          | { expr?: Node; result?: Node }
          | undefined;
        const cond = this.armCondition(ce, when);
        if (!cond) return;
        if (this.isFalse(cond)) continue;
        if (this.isTrue(cond) && when?.result) this.harvestCheckFacts(when.result);
        return;
      }
      if (ce.defresult) this.harvestCheckFacts(ce.defresult);
      return;
    }

    // Comparison promotion (Wave 11c's harvest counterpart): a builtin
    // total+strict comparison whose every column the facts already pin
    // cannot evaluate NULL — its notFALSE is TRUE outright, and joins the
    // facts for same-token consumers in OTHER constraints. The fixpoint
    // supplies the ordering: `seats IS NOT NULL AND seats > 1` pins seats
    // and promotes the comparison in whichever round both hold. A bare
    // boolean column rides the same rule (pinned ⇒ not NULL ⇒ TRUE).
    for (const atom of this.atomsOf(expr)) {
      if (this.atomOperandsPinned(atom)) this.addTrueFact(atom);
    }
  }

  /** Whether every column an atom reads is already pinned non-null. */
  private atomOperandsPinned(atom: Atom): boolean {
    switch (atom.t) {
      case "cmpLit":
        return this.colKnownNonNull(atom.col); // the literal is non-NULL by construction
      case "cmpCol":
        return this.colKnownNonNull(atom.a) && this.colKnownNonNull(atom.b);
      case "boolCol":
        return this.colKnownNonNull(atom.col);
      case "nullTest":
        return true; // total regardless — handled by the NullTest branch above
    }
  }

  /** Insert a TRUE fact unless an identical one is already present. */
  private addTrueFact(atom: Atom): void {
    if (!this.trueFacts.some(f => this.atomsMatch(atom, f))) this.trueFacts.push(atom);
  }

  private addFalseFact(atom: Atom): void {
    if (!this.falseFacts.some(f => this.atomsMatch(atom, f))) this.falseFacts.push(atom);
  }

  /** Insert an OR-fact unless a structurally identical one exists. All fact
   *  insertion is deduplicated so every producer — evidence collection, the
   *  generated equalities, the harvest — can safely re-run each fixpoint
   *  round and convergence is detectable by count. */
  private addOrFact(arms: Atom[][]): void {
    const same = (a: Atom[][], b: Atom[][]): boolean =>
      a.length === b.length &&
      a.every(
        (arm, i) =>
          arm.length === b[i]!.length && arm.every((x, j) => this.atomsMatch(x, b[i]![j]!)),
      );
    if (!this.orFacts.some(f => same(f, arms))) this.orFacts.push(arms);
  }

  // -------------------------------------------------------------------------
  // Generated-column equalities: reverse entailment by arm exclusion.
  // -------------------------------------------------------------------------

  /**
   * For each TRUE fact `gencol = 'lit'` over a generated column, decide
   * which CASE arm produced the value. An arm is EXCLUDED when its result
   * is a literal provably distinct from 'lit', a NULL (the equality being
   * TRUE rules it out), or its condition is already FALSE; the implicit or
   * explicit NULL/literal ELSE is treated the same way. If exactly one arm
   * survives and it is a real WHEN arm, its condition evaluated TRUE for
   * this row and its conjuncts join the facts. (An ELSE survivor derives
   * nothing: ELSE runs when the conditions were FALSE *or NULL*, and 3VL
   * grants no facts from "not TRUE".) Single pass: derived facts describe
   * plain columns, and PostgreSQL forbids a generation expression from
   * referencing another generated column, so no new triggers can appear.
   */
  private applyGeneratedEqualities(): void {
    for (const eq of this.input.generatedEqualities ?? []) {
      const triggers = this.trueFacts.filter(
        (f): f is Extract<Atom, { t: "cmpLit" }> =>
          f.t === "cmpLit" && f.col === eq.column && f.op === "=",
      );
      for (const trigger of triggers) {
        const cond = this.selectedArmCondition(eq, trigger.lit);
        if (cond) {
          this.input.trace?.addFact(
            "generatedEquality",
            `${eq.column} = <literal> selects a single CASE arm; its condition joins the facts`,
          );
          this.collectConjuncts(cond);
        }
      }

      // OR-fact triggers: TRUE(gencol IN ('a','b')) names no arm, but if
      // each value selects a single CASE arm, the DISJUNCTION of those
      // arms' conditions held — a derived OR-fact (`verdict IN ('fraud',
      // 'no-fraud')` yields [fs >= 75] ∨ [fs < 30], which pins fs by the
      // intersection rule). An arm of the trigger fact may carry extra
      // conjuncts; the gencol equality among them is what runs exclusion.
      for (const fact of [...this.orFacts]) {
        const derived: Atom[][] = [];
        let complete = true;
        for (const arm of fact) {
          const vAtom = arm.find(
            (a): a is Extract<Atom, { t: "cmpLit" }> =>
              a.t === "cmpLit" && a.col === eq.column && a.op === "=",
          );
          const cond = vAtom ? this.selectedArmCondition(eq, vAtom.lit) : null;
          const condAtoms = cond ? this.armAtoms(cond) : [];
          if (condAtoms.length === 0) {
            complete = false;
            break;
          }
          derived.push(condAtoms);
        }
        if (!complete || derived.length === 0) continue;
        this.input.trace?.addFact(
          "generatedEquality",
          `${eq.column} ∈ <literal set> selects one CASE arm per value; their conditions join as an OR-fact`,
        );
        if (derived.length === 1) for (const a of derived[0]!) this.addTrueFact(a);
        else this.addOrFact(derived);
      }
    }
  }

  /**
   * A CASE arm's effective condition: the WHEN expression for a searched
   * CASE, the implicit `arg = value` equality for a simple one — synthetic,
   * so the ordinary fragment rules (and their refusals) apply unchanged.
   */
  private armCondition(
    ce: { arg?: Node },
    when: { expr?: Node } | undefined,
  ): Node | undefined {
    if (!when?.expr) return undefined;
    if (!ce.arg) return when.expr;
    return {
      A_Expr: {
        kind: "AEXPR_OP",
        name: [{ String: { sval: "=" } }],
        lexpr: ce.arg,
        rexpr: when.expr,
      },
    } as unknown as Node;
  }

  /** The single surviving arm's condition, or null. See applyGeneratedEqualities. */
  private selectedArmCondition(
    eq: { column: string; expr: Node },
    lit: Lit,
  ): Node | null {
    const node = eq.expr as Record<string, unknown>;
    const ce = node["CaseExpr"] as { arg?: Node; args?: Node[]; defresult?: Node } | undefined;
    if (!ce) return null;

    /** true = provably NOT the producing arm; false = might be. */
    const resultExcluded = (result: Node | undefined): boolean => {
      if (!result) return true; // no result → NULL → excluded by the TRUE equality
      const r = this.litOf(result);
      if (r === null) {
        // Either a NULL literal (excluded) or a non-literal (inconclusive).
        return this.isNullLiteral(result);
      }
      return this.litsDistinct(eq.column, lit, r);
    };

    let survivor: { cond: Node } | null = null;
    for (const w of ce.args ?? []) {
      const when = (w as Record<string, unknown>)["CaseWhen"] as
        | { expr?: Node; result?: Node }
        | undefined;
      const cond = this.armCondition(ce, when);
      if (!cond) return null;
      if (this.isFalse(cond) || resultExcluded(when?.result)) continue;
      if (survivor) return null; // two candidates — no single arm
      survivor = { cond };
    }
    // The ELSE (implicit NULL when absent) competes like an arm but can
    // never be the derivation source.
    const elseExcluded = ce.defresult ? resultExcluded(ce.defresult) : true;
    if (!elseExcluded) return null;
    return survivor?.cond ?? null;
  }

  /** Whether `expr` is the literal NULL, possibly under a plain cast. */
  private isNullLiteral(expr: Node): boolean {
    let node = expr as Record<string, unknown>;
    const tc = node["TypeCast"] as { arg?: Node } | undefined;
    if (tc?.arg) node = tc.arg as Record<string, unknown>;
    const ac = node["A_Const"] as { isnull?: boolean } | undefined;
    return ac?.isnull === true;
  }

  /**
   * Whether two literal tokens provably denote DISTINCT values in
   * comparisons against `colKey` — the collation-gated judgment: only under
   * the catalog's eligibility (byte equality is value equality for the
   * type under a deterministic collation — text/varchar; bpchar's
   * blank-stripping comparison disqualifies it), only for string tokens,
   * and only at the same effective type.
   */
  private litsDistinct(colKey: string, a: Lit, b: Lit): boolean {
    if (a.kind !== "sval" || b.kind !== "sval" || a.value === b.value) return false;
    const dot = colKey.indexOf(".");
    if (!this.input.literalDistinctnessSound(colKey.slice(0, dot), colKey.slice(dot + 1))) {
      return false;
    }
    const colType = this.colTypeRef(colKey);
    const effA = a.cast ?? colType;
    const effB = b.cast ?? colType;
    if (!effA || !effB) return false;
    return effA.name === effB.name && effA.schema === effB.schema;
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
    // TRUE(NOT p) ⇔ FALSE(p) — a NOT conjunct contributes FALSE facts, and
    // by De Morgan a negated OR falsifies every disjunct (an OR is FALSE
    // exactly when all its arms are).
    if (be?.boolop === "NOT_EXPR" && be.args?.length === 1) {
      const inner = be.args[0]! as Record<string, unknown>;
      const innerOr = inner["BoolExpr"] as { boolop?: string; args?: Node[] } | undefined;
      if (innerOr?.boolop === "OR_EXPR") {
        for (const arg of innerOr.args ?? []) {
          for (const atom of this.atomsOf(arg)) this.addFalseFact(atom);
        }
        return;
      }
      for (const atom of this.atomsOf(be.args[0]!)) this.addFalseFact(atom);
      return;
    }
    const atoms = this.atomsOf(pred);
    if (atoms.length > 0) {
      for (const a of atoms) this.addTrueFact(a);
      return;
    }
    // Disjunctive conjuncts (OR, multi-element IN, = ANY over an array
    // literal): a single-arm fact means that arm held outright, so its
    // conjuncts are plain TRUE facts; the rest become OR-facts.
    const arms = this.disjunctArms(pred);
    if (arms) {
      if (arms.length === 1) for (const a of arms[0]!) this.addTrueFact(a);
      else this.addOrFact(arms);
    }
  }

  /**
   * The per-arm conjunct atoms of a disjunctive predicate, or null when any
   * arm contributes no atoms at all (an arm nothing can match refuses the
   * whole fact — TRUE(a ∨ opaque) proves nothing, since the opaque arm may
   * have been the true one).
   */
  private disjunctArms(pred: Node): Atom[][] | null {
    const node = pred as Record<string, unknown>;

    const be = node["BoolExpr"] as { boolop?: string; args?: Node[] } | undefined;
    if (be?.boolop === "OR_EXPR") {
      const out: Atom[][] = [];
      for (const arg of be.args ?? []) {
        const atoms = this.armAtoms(arg);
        if (atoms.length === 0) return null;
        out.push(atoms);
      }
      return out.length > 0 ? out : null;
    }

    if ("A_Expr" in node) {
      const ae = node["A_Expr"] as { kind?: string; name?: Node[]; lexpr?: Node; rexpr?: Node };
      const op = this.bareOpName(ae.name);
      if (!op || !ae.lexpr) return null;
      const items =
        ae.kind === "AEXPR_IN" && op === "="
          ? (ae.rexpr as { List?: { items?: Node[] } } | undefined)?.List?.items
          : ae.kind === "AEXPR_OP_ANY"
            ? (ae.rexpr as { A_ArrayExpr?: { elements?: Node[] } } | undefined)?.A_ArrayExpr
                ?.elements
            : undefined;
      if (!items?.length) return null;
      const out: Atom[][] = [];
      for (const item of items) {
        const atom = this.comparisonAtom(op, ae.lexpr, item);
        if (!atom) return null;
        out.push([atom]);
      }
      return out;
    }

    return null;
  }

  /** An OR arm's conjunct atoms: AND splits, everything else via atomsOf. */
  private armAtoms(arm: Node): Atom[] {
    const be = (arm as Record<string, unknown>)["BoolExpr"] as
      | { boolop?: string; args?: Node[] }
      | undefined;
    if (be?.boolop === "AND_EXPR") {
      return (be.args ?? []).flatMap(a => this.armAtoms(a));
    }
    return this.atomsOf(arm);
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

  /** TRUE(expr) — for this emitted row. */
  private isTrue(expr: Node): boolean {
    const node = expr as Record<string, unknown>;

    if ("BoolExpr" in node) {
      const be = node["BoolExpr"] as { boolop?: string; args?: Node[] };
      const args = be.args ?? [];
      if (be.boolop === "AND_EXPR") return args.length > 0 && args.every(a => this.isTrue(a));
      if (be.boolop === "OR_EXPR") {
        return args.some(a => this.isTrue(a)) || this.orFactImplies(expr);
      }
      if (be.boolop === "NOT_EXPR") return args.length === 1 && this.isFalse(args[0]!);
      return false;
    }

    // `col = ANY (ARRAY[...])` — the deparser's rendering of IN. One
    // element comparison TRUE suffices (the OR rule), or a TRUE OR-fact
    // whose disjunct set this ANY covers.
    if ("A_Expr" in node) {
      const ae = node["A_Expr"] as { kind?: string; name?: Node[]; lexpr?: Node; rexpr?: Node };
      if (ae.kind === "AEXPR_OP_ANY" && ae.lexpr) {
        const op = this.bareOpName(ae.name);
        const elements = (ae.rexpr as { A_ArrayExpr?: { elements?: Node[] } } | undefined)
          ?.A_ArrayExpr?.elements;
        if (!op || !elements) return false;
        return (
          elements.some(el => {
            const atom = this.comparisonAtom(op, ae.lexpr!, el);
            return !!atom && this.atomIsTrue(atom);
          }) || this.orFactImplies(expr)
        );
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

  /**
   * The subset rule, by arm-implication: a TRUE OR-fact makes a CHECK-side
   * OR TRUE when EVERY fact arm implies some CHECK arm — whichever arm
   * held, all its conjuncts held, so one of them matching a CHECK arm
   * (A∧B ⇒ A) makes the wider disjunction TRUE. CHECK arms that do not
   * atomize to a single atom only widen the disjunction and cannot
   * invalidate the rule.
   */
  private orFactImplies(expr: Node): boolean {
    if (this.orFacts.length === 0) return false;
    const node = expr as Record<string, unknown>;
    const be = node["BoolExpr"] as { boolop?: string; args?: Node[] } | undefined;
    const checkArms: Atom[] = [];
    if (be?.boolop === "OR_EXPR") {
      for (const arg of be.args ?? []) {
        const atoms = this.atomsOf(arg);
        if (atoms.length === 1) checkArms.push(atoms[0]!);
      }
    } else {
      const arms = this.disjunctArms(expr);
      for (const arm of arms ?? []) {
        if (arm.length === 1) checkArms.push(arm[0]!);
      }
    }
    if (checkArms.length === 0) return false;
    return this.orFacts.some(fact =>
      fact.every(arm => arm.some(a => checkArms.some(c => this.atomsMatch(c, a)))),
    );
  }

  private atomIsTrue(atom: Atom): boolean {
    if (this.trueFacts.some(f => this.atomsMatch(atom, f))) return true;
    // The negator dual: FALSE(col <> lit) certifies TRUE(col = lit) — a
    // strict comparison that evaluated FALSE (not NULL) had non-null
    // operands, and the builtin negator relation does the rest.
    const negated = this.negateAtom(atom);
    if (negated && this.falseFacts.some(f => this.atomsMatch(negated, f))) return true;
    // Distinctness: TRUE(col = 'a') makes `col <> 'b'` TRUE when 'a' and
    // 'b' are provably distinct values for this column.
    return (
      atom.t === "cmpLit" &&
      atom.op === "<>" &&
      this.trueFacts.some(
        f =>
          f.t === "cmpLit" &&
          f.col === atom.col &&
          f.op === "=" &&
          this.litsDistinct(atom.col, atom.lit, f.lit),
      )
    );
  }

  private atomIsFalse(atom: Atom): boolean {
    if (this.falseFacts.some(f => this.atomsMatch(atom, f))) return true;
    const negated = this.negateAtom(atom);
    if (negated && this.trueFacts.some(f => this.atomsMatch(negated, f))) return true;
    // Distinctness: TRUE(col = 'a') falsifies `col = 'b'` for provably
    // distinct values — what lets a multi-WHEN CHECK CASE step past the
    // arms an earlier discriminator value rules out.
    return (
      atom.t === "cmpLit" &&
      atom.op === "=" &&
      this.trueFacts.some(
        f =>
          f.t === "cmpLit" &&
          f.col === atom.col &&
          f.op === "=" &&
          this.litsDistinct(atom.col, atom.lit, f.lit),
      )
    );
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

  /**
   * Whether the facts pin `col` non-null. Three sources: a TRUE strict
   * comparison (or IS NOT NULL, or bare-boolean truth) involving it; a
   * FALSE strict comparison involving it — FALSE means the comparison
   * evaluated, so its operands were non-null, and FALSE(col IS NULL) is the
   * direct statement; and a TRUE OR-fact every arm of which involves it —
   * whichever arm held, it pins the column (the OR-shaped mirror of the
   * promotion analyzer's intersection rule).
   */
  private colKnownNonNull(col: string): boolean {
    const strictlyInvolves = (f: Atom): boolean => {
      switch (f.t) {
        case "cmpLit":
          return f.col === col;
        case "cmpCol":
          return f.a === col || f.b === col;
        case "nullTest":
          return false; // direction-dependent; handled per fact list below
        case "boolCol":
          return f.col === col;
      }
    };
    if (
      this.trueFacts.some(
        f => strictlyInvolves(f) || (f.t === "nullTest" && f.col === col && f.isNotNull),
      )
    ) {
      return true;
    }
    if (
      this.falseFacts.some(
        f => strictlyInvolves(f) || (f.t === "nullTest" && f.col === col && !f.isNotNull),
      )
    ) {
      return true;
    }
    // An OR-fact pins the column when EVERY arm does — whichever arm held,
    // some conjunct of it involves the column (the intersection rule).
    return this.orFacts.some(fact =>
      fact.every(arm =>
        arm.some(
          a => strictlyInvolves(a) || (a.t === "nullTest" && a.col === col && a.isNotNull),
        ),
      ),
    );
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
    // The mask is an evidence-collection concern only. CHECK-side atoms are
    // never masked: they are judged against facts that were already masked
    // when collected, and dropping them here would (unsoundly conservatively)
    // hide a guard fact about a written column from the NEW-row channel.
    if (!this.maskingActive) return false;
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
