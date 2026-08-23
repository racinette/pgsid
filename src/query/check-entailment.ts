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
// *distinctness* ('a' ≠ 'b') is derivable only under the collation gate
// (`literalDistinctnessSound`: text-family whitelist + proven-deterministic
// collation, resolved by the catalog) — under a nondeterministic collation
// differently-spelled strings can be equal, and the refusal is what keeps
// the negative branches of a discriminated CHECK safely unprovable there.
// (An earlier revision banned distinctness wholesale; the gate replaced the
// ban when `collationDeterministic` was captured.)
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
  /**
   * The evaluated-comparison oracle (docs/subtree-evaluation.md, the
   * entailment consumer): the truth of `a OP b` with both literals read at
   * `colType` — answered from a PRE-EVALUATED map of closed comparison
   * trees, null when no answer exists (an unclosable type, a question the
   * synthesis never met). Sound because a TRUE equality fact makes the
   * row's value indistinguishable from the literal within the column
   * type's btree family, where every canonical operator lives — so
   * substituting it into a same-column atom answers the atom. This is
   * Wave 11c's order-theory oracle, and it is the subtree evaluator.
   */
  evaluatedComparison?: (colType: string, a: Lit, op: string, b: Lit) => boolean | null;
  /**
   * The oracle's per-column collation gate: whether `op` over this column
   * transfers to a default-collation evaluation. Non-collatable columns
   * transfer every canonical op; a deterministic collation transfers
   * equality only (byte-equality semantics); nondeterministic transfers
   * nothing. REQUIRED for the oracle to answer — absent means closed,
   * because the question keys are type-level while this hazard is
   * column-level (the collation-gate fixture is the measured
   * counterexample).
   */
  comparisonEvaluable?: (alias: string, column: string, op: string) => boolean;
  /**
   * The interval rung's shape sources (docs/subtree-evaluation.md,
   * "Interval exclusivity over btree strategies"): the operator's btree
   * strategy number by pg_catalog consensus (1 `<` … 5 `>`), and whether
   * it is a negator of equality (`<>`, the complement-of-point shape).
   * Both walk-supplied from the evaluation face, both closed under the
   * user-operator collision rule.
   */
  btreeStrategy?: (op: string) => number | null;
  equalityComplement?: (op: string) => boolean;
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

/**
 * The mirror question: whether the same facts prove `goal` IS NULL for every
 * row the scope emits.
 *
 * Nothing new is derived for it. The harvest already records a NullTest of
 * EITHER polarity as a TRUE fact — a NullTest is total, so notFALSE means
 * TRUE outright — so `CHECK (CASE WHEN status = 'paid' THEN amount IS NOT
 * NULL ELSE amount IS NULL END)` has always contributed `amount IS NULL` to
 * the fact set on rows where the CASE selects the ELSE arm. Only the final
 * question was single-polarity.
 *
 * The asymmetry worth knowing: a comparison being TRUE proves its operands
 * non-null, so the non-null side reads `strictlyInvolves` across every atom
 * shape. NOTHING proves a column NULL except a NullTest saying so, which is
 * why `colKnownNull` is the shorter function of the two rather than a
 * transcription.
 */
export function checkConstraintsProveNull(input: CheckEntailmentInput): boolean {
  const kernel = new EntailmentKernel(input);
  return kernel.run(true);
}

/**
 * Whether the facts prove `guard` is NEVER TRUE for an emitted row — the
 * atom-oracle rungs' consumption (docs/subtree-evaluation.md, "The kernel's
 * atom oracle"): the walk prunes a CASE arm whose guard cannot fire, the
 * same arm-pruning the statement map performs, fed from the kernel instead
 * of an evaluation. notTRUE is deliberately the WEAK judgment: a NULL
 * guard also never fires its arm, so trichotomy facts (notFALSE of an
 * exclusive same-token comparison) suffice where FALSE would be
 * underivable. `input.goal` is unused here; pass the guard's owning alias
 * with an empty column.
 */
export function checkConstraintsRefuteGuard(
  input: CheckEntailmentInput,
  guard: Node,
): boolean {
  const kernel = new EntailmentKernel(input);
  return kernel.runGuardRefutation(guard);
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
 * Same-token EXCLUSIVE comparison pairs — no value satisfies both, by a
 * total order's trichotomy (atom-oracle rung: notFALSE(col OP₁ x) forbids
 * TRUE(col OP₂ x) for OP₂ exclusive with OP₁, because a TRUE OP₂ needs a
 * non-null operand, which forces OP₁ to have EVALUATED — to FALSE).
 * Strictly wider than the negator relation: `<` excludes `=` and `>` too,
 * which is what lets notFALSE(a < 5) refute the guard `a > 5`.
 */
const EXCLUSIVE_OPS: Record<string, readonly string[]> = {
  "<": ["=", ">", ">="],
  ">": ["=", "<", "<="],
  "=": ["<", ">", "<>"],
  "<=": [">"],
  ">=": ["<"],
  "<>": ["="],
};

/**
 * The complement-of-point shape's synthetic number, beside the five btree
 * strategies (1 `<`, 2 `<=`, 3 `=`, 4 `>=`, 5 `>`): `<>` has no strategy —
 * PostgreSQL does not index inequality — and takes this one from the
 * equality-negator capture instead.
 */
const COMPLEMENT_SHAPE = 6;

/**
 * Is `W ∩ Q` provably EMPTY? `sw`/`sq` are shapes (strategy numbers plus
 * the complement), `rel` is how W's anchor compares to Q's. Every row of
 * this table is domain-free — no density, no bounds, no inhabitants:
 * "(-∞,4] misses (5,∞)" holds because 4 < 5, never because nothing sits
 * between them. Rows that would need domain knowledge (complement vs
 * complement, adjacent open rays over a discrete type) answer false, the
 * over-keep direction.
 */
function shapesDisjoint(
  sw: number,
  rel: "lt" | "eq" | "gt" | "ne",
  sq: number,
): boolean {
  const leftRay = (s: number): boolean => s === 1 || s === 2;
  const rightRay = (s: number): boolean => s === 4 || s === 5;
  // Point vs point: any known distinctness separates them.
  if (sw === 3 && sq === 3) return rel !== "eq";
  // A complement excludes exactly its own point.
  if (sw === COMPLEMENT_SHAPE) return sq === 3 && rel === "eq";
  if (sq === COMPLEMENT_SHAPE) return sw === 3 && rel === "eq";
  // Point vs ray: the point must sit strictly outside.
  if (sw === 3 && leftRay(sq)) return rel === "gt" || (rel === "eq" && sq === 1);
  if (sw === 3 && rightRay(sq)) return rel === "lt" || (rel === "eq" && sq === 5);
  if (leftRay(sw) && sq === 3) return rel === "lt" || (rel === "eq" && sw === 1);
  if (rightRay(sw) && sq === 3) return rel === "gt" || (rel === "eq" && sw === 5);
  // Opposed rays: disjoint when the left ray's anchor sits at or before
  // the right ray's — touching anchors need an open endpoint on either
  // side ("at or before" with both closed shares the anchor point).
  if (leftRay(sw) && rightRay(sq)) {
    return rel === "lt" || (rel === "eq" && !(sw === 2 && sq === 4));
  }
  if (rightRay(sw) && leftRay(sq)) {
    return rel === "gt" || (rel === "eq" && !(sw === 4 && sq === 2));
  }
  // Same-direction rays always share a tail.
  return false;
}

/**
 * Internal catalog names → the `format_type` rendering the snapshot stores.
 * Fixed pg_catalog spellings; a name not listed renders as itself.
 */
/**
 * How the two members of the distinctness-eligible text family SPELL
 * themselves — a rendering fact, not a semantic one.
 *
 * Which types are eligible is decided in ONE place and not here: the
 * catalog's `TEXT_FAMILY_OIDS` whitelist behind `literalDistinctnessSound`,
 * which admits text (25) and varchar (1043) by OID and excludes bpchar (1042)
 * because it strips trailing blanks before the collation is consulted. Every
 * reader below asks that predicate for the JUDGMENT and this set only for the
 * NAME, so the exclusion has a single home and cannot drift between two.
 *
 * The names are needed at all because a CHECK on a varchar column DEPARSES
 * through casts — PostgreSQL renders `CHECK (k <> 'a ')` on `k varchar(4)` as
 * `(((k)::text <> 'a '::text) …)`, where the same CHECK on `char(4)` renders
 * `(k <> 'a '::bpchar)`. The column reference itself is wrapped, so the
 * varchar conjunct is not recognised as being ABOUT `k` without unwrapping
 * it, and the cast target has to be checked by name when it is.
 */
const TEXT_FAMILY_NAMES = new Set(["text", "character varying"]);

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
// Shared literal surface — module-level so the comparison-grounding
// synthesis (src/query/comparison-groundings.ts) extracts EXACTLY the
// tokens the kernel will later ask about: the key built at synthesis time
// and the key built at judgment time must agree, and sharing the extractor
// is what makes drift impossible. Misalignment anywhere else only loses
// questions (a map miss claims nothing).
// ---------------------------------------------------------------------------

/**
 * The literal token of an A_Const, optionally wrapped in exactly one plain
 * TypeCast. A cast with a typmod or array bounds is not a plain type
 * annotation and refuses; so does NULL (no comparison over it is ever
 * TRUE, and no CHECK atom containing it can be selected).
 */
export function litOf(expr: Node): Lit | null {
  let node = expr as Record<string, unknown>;
  let cast: TypeRef | null = null;
  if ("TypeCast" in node) {
    const tc = node["TypeCast"] as {
      arg?: Node;
      typeName?: { names?: Node[]; typmods?: Node[]; arrayBounds?: Node[] };
    };
    if (!tc.arg || !tc.typeName) return null;
    if (tc.typeName.typmods?.length || tc.typeName.arrayBounds?.length) return null;
    cast = typeRefOf(tc.typeName.names ?? []);
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

/**
 * A boolean literal's own truth value, or null for anything that is not one.
 *
 * The kernel matches tokens rather than computing, so every other literal
 * kind is an OPERAND of a truth value and only this one IS one. It has to be
 * read because PostgreSQL stores a CHECK expression VERBATIM — there is no
 * constant folding on the way into `pg_constraint.conbin` (measured;
 * `pg_get_constraintdef` reads `false` back out) — so a dead disjunct
 * survives to the kernel and something must recognise it as dead.
 *
 * A CAST is refused rather than followed. `'t'::boolean` and `1::boolean`
 * are both TRUE, but the general form is an input function whose result is
 * not a token, and reading one spelling while missing the next would be a
 * rule that looks total and is not.
 */
function boolLiteral(expr: Node): boolean | null {
  const lit = litOf(expr);
  if (!lit || lit.kind !== "boolval" || lit.cast) return null;
  return lit.value as boolean;
}

/** Normalized cast target from a TypeName's names list. */
function typeRefOf(names: Node[]): TypeRef | null {
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

/** The bare canonical operator name, refusing schema-qualified spellings. */
function bareOpName(name: Node[] | undefined): string | null {
  if (name?.length !== 1) return null;
  const s = (name[0] as { String?: { sval?: string } }).String?.sval;
  if (!s) return null;
  return CANONICAL_OPS[s] ?? null;
}

export type { Lit };

/**
 * The evaluated-comparison question key: the DECLARED COLUMN TYPE the
 * literals are read at (full `format_type` rendering, typmod included —
 * `character(4)` is the bp case) plus the two payloads and the canonical
 * operator. Casts are deliberately absent: both callsites gate literals
 * to column-typed effective readings before asking.
 */
export function comparisonKey(colType: string, a: Lit, op: string, b: Lit): string {
  const tok = (l: Lit): string => `${l.kind}:${String(l.value)}`;
  return `${colType}|${tok(a)}|${op}|${tok(b)}`;
}

/**
 * Every column-vs-literal comparison in `expr`, scope-blind and
 * orientation-normalized (literal-left flips the operator) — the
 * synthesis side's scanner. The COLUMN is the reference's last name part;
 * over-collection is free (unused questions cost one evaluation slot).
 */
export function scanLitComparisons(
  expr: Node,
): { column: string; op: string; lit: Lit }[] {
  const out: { column: string; op: string; lit: Lit }[] = [];
  const lastColumnName = (n: unknown): string | null => {
    const fields = ((n as Record<string, unknown>)?.["ColumnRef"] as
      | { fields?: Node[] }
      | undefined)?.fields;
    if (!Array.isArray(fields) || fields.length === 0) return null;
    return (
      (fields[fields.length - 1] as { String?: { sval?: string } })?.String?.sval ?? null
    );
  };
  const visit = (n: unknown): void => {
    if (Array.isArray(n)) {
      for (const x of n) visit(x);
      return;
    }
    if (!n || typeof n !== "object") return;
    const ae = (n as Record<string, unknown>)["A_Expr"] as
      | { kind?: string; name?: Node[]; lexpr?: Node; rexpr?: Node }
      | undefined;
    if (ae && ae.kind === "AEXPR_OP" && ae.lexpr && ae.rexpr) {
      const op = bareOpName(ae.name);
      if (op) {
        const lcol = lastColumnName(ae.lexpr);
        const rcol = lastColumnName(ae.rexpr);
        if (lcol && !rcol) {
          const lit = litOf(ae.rexpr);
          if (lit) out.push({ column: lcol, op, lit });
        } else if (rcol && !lcol) {
          const lit = litOf(ae.lexpr);
          if (lit) out.push({ column: rcol, op: FLIPPED_OPS[op]!, lit });
        }
      }
    }
    // IN-lists and their rendered `= ANY (ARRAY[...])` form: one entry per
    // element — the list-membership rung's arms ask exactly these
    // point/order questions, so the synthesis must emit them.
    if (ae && ae.lexpr && ae.rexpr) {
      const op = bareOpName(ae.name);
      const col = op ? lastColumnName(ae.lexpr) : null;
      if (op && col) {
        const items =
          ae.kind === "AEXPR_IN" && op === "="
            ? (ae.rexpr as { List?: { items?: Node[] } }).List?.items
            : ae.kind === "AEXPR_OP_ANY"
              ? (ae.rexpr as { A_ArrayExpr?: { elements?: Node[] } }).A_ArrayExpr?.elements
              : undefined;
        for (const item of items ?? []) {
          const lit = litOf(item);
          if (lit) out.push({ column: col, op, lit });
        }
      }
    }
    for (const v of Object.values(n as Record<string, unknown>)) visit(v);
  };
  visit(expr);
  return out;
}

// ---------------------------------------------------------------------------
// The kernel.
// ---------------------------------------------------------------------------

class EntailmentKernel {
  private readonly input: CheckEntailmentInput;
  private trueFacts: Atom[] = [];
  private falseFacts: Atom[] = [];
  /**
   * notFALSE facts — the atom-oracle rungs (docs/subtree-evaluation.md,
   * "The kernel's atom oracle"): comparison atoms on a CHECK's notFALSE
   * spine, too weak to be TRUE (a strict comparison's notFALSE is
   * TRUE-or-NULL) yet strong enough for TRICHOTOMY — an exclusive
   * same-token comparison can never be TRUE beside one. Consumed only by
   * `atomNotTrue`; never by the TRUE/FALSE matchers.
   */
  private notFalseFacts: Atom[] = [];
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
   * notFALSE OR-facts (the list-membership rung, docs/subtree-evaluation.md
   * "List membership exclusion"): disjunctive conjuncts on a CHECK's
   * notFALSE spine — `k IN ('a','b')` rendered `= ANY (ARRAY[...])`, a
   * list partition bound — held as arms exactly like `orFacts` but at
   * notFALSE strength: too weak for the subset rule (the OR may be
   * UNKNOWN over a stored row), strong enough for guard refutation,
   * where the argument runs through evaluation (see `orFactRefuted`).
   * Consumed ONLY there.
   */
  private notFalseOrFacts: Atom[][][] = [];
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

  /** Evidence collection — shared by both questions. */
  private collectEvidence(): void {
    for (const src of this.input.evidence) {
      this.maskingActive = src.applySetMask;
      this.collectConjuncts(src.pred);
    }
    this.maskingActive = false;
  }

  /** The derivation fixpoint — shared by both questions. Each round lets
   *  the generated equalities and every CHECK contribute FACTS; insertion
   *  is deduplicated, the fact universe is the finite set of the CHECKs'
   *  sub-atoms, and the round cap is insurance, not a reachable bound. */
  private deriveFixpoint(): void {
    for (let round = 0; round < 6; round++) {
      const before =
        this.trueFacts.length +
        this.falseFacts.length +
        this.orFacts.length +
        this.notFalseOrFacts.length +
        this.notFalseFacts.length;
      this.applyGeneratedEqualities();
      for (const expr of this.input.checkExprs) this.harvestCheckFacts(expr);
      if (
        this.trueFacts.length +
          this.falseFacts.length +
          this.orFacts.length +
          this.notFalseOrFacts.length +
          this.notFalseFacts.length ===
        before
      ) {
        break;
      }
    }
    this.input.trace?.addFact(
      "facts",
      `${this.trueFacts.length} TRUE atom(s), ${this.falseFacts.length} FALSE atom(s), ` +
        `${this.orFacts.length} OR-fact(s), ${this.notFalseOrFacts.length} notFALSE ` +
        `OR-fact(s), ${this.notFalseFacts.length} notFALSE atom(s) ` +
        "after the derivation fixpoint",
    );
  }

  /** notTRUE(guard) for every emitted row — see checkConstraintsRefuteGuard. */
  runGuardRefutation(guard: Node): boolean {
    this.collectEvidence();
    this.deriveFixpoint();
    const refuted = this.isNotTrue(guard);
    if (refuted) {
      this.input.trace?.addFact("guardRefuted", "the facts prove the guard is never TRUE");
    }
    return refuted;
  }

  run(goalIsNull = false): boolean {
    this.collectEvidence();
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
      // derivation is for the goals neither can settle. Non-null goals
      // only — the flag says nothing about a null goal, and for one it
      // would be the counterexample rather than the shortcut.
      if (this.input.goalNotNullGivenPresent && !goalIsNull) {
        this.input.trace?.addFact("goal", "non-null per stored row — settled by presence alone");
        return true;
      }
    }
    // The derivation fixpoint (Wave 11b) — see deriveFixpoint.
    this.deriveFixpoint();
    // One question at the end: do the facts pin the goal column? A CHECK's
    // own `goal IS NOT NULL` arrives here as a harvested fact (totality),
    // exactly like a generated-CASE arm's strict condition or a chained
    // conclusion from a neighbouring constraint. `goalIsNull` asks the
    // mirror question of the SAME fact set — see checkConstraintsProveNull.
    const key = `${this.input.goal.alias}.${this.input.goal.column}`;
    if (goalIsNull ? this.colKnownNull(key) : this.colKnownNonNull(key)) {
      this.input.trace?.addFact(
        "provedBy",
        `the derived fact set pins the goal column ${goalIsNull ? "NULL" : "non-null"}`,
      );
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
        else {
          // The list-membership rung: the disjunction joins the notFALSE
          // OR-facts, arms as written (liveness already has its stronger
          // single-survivor descent above).
          const arms = this.disjunctArms(expr);
          if (arms && arms.length > 1) this.addNotFalseOrFact(arms);
        }
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
    // Unpinned, the spine still carries the WEAK fact (atom-oracle rung):
    // notFALSE, which trichotomy consumes.
    const atoms = this.atomsOf(expr);
    if (atoms.length === 0) {
      // A multi-element IN / `= ANY` conjunct asserts no single atom; it
      // joins the notFALSE OR-facts instead (the list-membership rung).
      const arms = this.disjunctArms(expr);
      if (arms && arms.length > 1) this.addNotFalseOrFact(arms);
      return;
    }
    for (const atom of atoms) {
      this.addNotFalseFact(atom);
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

  private addNotFalseFact(atom: Atom): void {
    if (!this.notFalseFacts.some(f => this.atomsMatch(atom, f))) this.notFalseFacts.push(atom);
  }

  /** Insert an OR-fact unless a structurally identical one exists. All fact
   *  insertion is deduplicated so every producer — evidence collection, the
   *  generated equalities, the harvest — can safely re-run each fixpoint
   *  round and convergence is detectable by count. */
  private addOrFact(arms: Atom[][]): void {
    if (!this.orFacts.some(f => this.orFactsSame(f, arms))) this.orFacts.push(arms);
  }

  private addNotFalseOrFact(arms: Atom[][]): void {
    if (!this.notFalseOrFacts.some(f => this.orFactsSame(f, arms))) {
      this.notFalseOrFacts.push(arms);
    }
  }

  private orFactsSame(a: Atom[][], b: Atom[][]): boolean {
    return (
      a.length === b.length &&
      a.every(
        (arm, i) =>
          arm.length === b[i]!.length && arm.every((x, j) => this.atomsMatch(x, b[i]![j]!)),
      )
    );
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
      const r = litOf(result);
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
    return this.sameEffectiveType(colKey, a, b);
  }

  /**
   * Whether two literal tokens are being compared AT THE SAME TYPE against
   * `colKey` — a bare literal takes the column's own type, an explicitly cast
   * one takes its target.
   *
   * The two sides of one question can land on DIFFERENT SPELLINGS of the same
   * comparison. A CHECK on a varchar column deparses its literal as
   * `'a '::text`, while the query's own `k = 'a'` carries no cast and takes
   * the column's `character varying`. Same operator, same collation, same
   * answer — two names.
   *
   * Equating them is sound exactly where a cast between them is, so this asks
   * the same catalog predicate `columnKeyThroughCast` does. bpchar is out
   * there and out here, from the one whitelist.
   */
  private sameEffectiveType(colKey: string, a: Lit, b: Lit): boolean {
    const colType = this.colTypeRef(colKey);
    const effA = a.cast ?? colType;
    const effB = b.cast ?? colType;
    if (!effA || !effB) return false;
    if (effA.name === effB.name && effA.schema === effB.schema) return true;
    return (
      TEXT_FAMILY_NAMES.has(effA.name) &&
      TEXT_FAMILY_NAMES.has(effB.name) &&
      this.textFamilyColumn(colKey)
    );
  }

  // -------------------------------------------------------------------------
  // Evidence: TRUE conjuncts → atoms.
  // -------------------------------------------------------------------------

  private collectConjuncts(pred: Node): void {
    const node = pred as Record<string, unknown>;
    // Evidence shaping (atom-oracle rung 1): TRUE(col IS TRUE) ⇒ TRUE(col),
    // TRUE(col IS FALSE) ⇒ FALSE(col) — a BooleanTest never evaluates NULL,
    // so a WHERE conjunct of this shape pins the bare boolean outright.
    // The other test kinds ("not true", "unknown") name no single truth.
    const bt = node["BooleanTest"] as { arg?: Node; booltesttype?: string } | undefined;
    if (bt?.arg) {
      const col = this.columnKey(bt.arg);
      if (col && !this.maskedKey(col)) {
        if (bt.booltesttype === "IS_TRUE") this.addTrueFact({ t: "boolCol", col });
        else if (bt.booltesttype === "IS_FALSE") this.addFalseFact({ t: "boolCol", col });
      }
      return;
    }
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
      const op = bareOpName(ae.name);
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
        const op = bareOpName(ae.name);
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
      if (ae.kind === "AEXPR_IN" && bareOpName(ae.name) === "=" && ae.lexpr) {
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

  /**
   * A column reference, seeing through a cast that CANNOT change what the
   * comparison around it decides — `(k)::text` for a `character varying`
   * column, which is how PostgreSQL deparses a CHECK on one.
   *
   * Only here, in the comparison atom. Every other reader of a column
   * reference wants the reference itself.
   *
   * Three conditions. The COLUMN must be distinctness-eligible — the
   * catalog's OID whitelist plus a proven deterministic collation, which
   * excludes bpchar (the cast strips its padding, `length('a'::char(4)::text)`
   * is 1) and also a varchar column under a NON-deterministic collation, where
   * casting to text changes which comparison runs. The cast TARGET must be in
   * the same family by name. And the cast must carry no TYPMOD, because a
   * sized one truncates — `'abc'::varchar(4)::varchar(1)` is 'a' (measured).
   *
   * The eligibility check here is NOT reachable by any corpus fixture, and it
   * is not therefore redundant. Every fixture route runs on to `litsDistinct`,
   * which asks the same predicate and refuses bpchar there — but
   * `comparisonAtom` also builds `cmpCol`, a COLUMN-TO-COLUMN atom that never
   * consults it. `(k)::text = (j)::text` over two bpchar columns would become
   * `cmpCol(k, '=', j)`, and the two are not the same predicate: the cast
   * comparison is exact where the bpchar one is blank-insensitive, so the
   * implication holds in one direction only. This is the only thing standing
   * in that path. Recorded as unwitnessed rather than claimed as tested.
   */
  private columnKeyThroughCast(expr: Node): string | null {
    const direct = this.columnKey(expr);
    if (direct) return direct;
    const tc = (expr as Record<string, unknown>)["TypeCast"] as
      | { arg?: Node; typeName?: { names?: Node[]; typmods?: Node[]; arrayBounds?: Node[] } }
      | undefined;
    if (!tc?.arg || !tc.typeName) return null;
    if (tc.typeName.typmods?.length || tc.typeName.arrayBounds?.length) return null;
    const col = this.columnKey(tc.arg);
    if (!col || !this.textFamilyColumn(col)) return null;
    const target = typeRefOf(tc.typeName.names ?? []);
    if (!target || (target.schema !== null && target.schema !== "pg_catalog")) return null;
    return TEXT_FAMILY_NAMES.has(target.name) ? col : null;
  }

  /**
   * Whether `colKey` is in the text family whose byte equality is value
   * equality — asked of the CATALOG, so bpchar's exclusion lives in exactly
   * one place (`TEXT_FAMILY_OIDS`) rather than being restated by name here.
   */
  private textFamilyColumn(colKey: string): boolean {
    const dot = colKey.indexOf(".");
    return this.input.literalDistinctnessSound(colKey.slice(0, dot), colKey.slice(dot + 1));
  }

  private comparisonAtom(op: string, lexpr: Node, rexpr: Node): Atom | null {
    const canonical = CANONICAL_OPS[op];
    if (!canonical) return null;
    const lcol = this.columnKeyThroughCast(lexpr);
    const rcol = this.columnKeyThroughCast(rexpr);
    if (lcol && rcol) {
      if (this.maskedKey(lcol) || this.maskedKey(rcol)) return null;
      return { t: "cmpCol", a: lcol, op: canonical, b: rcol };
    }
    if (lcol) {
      const lit = litOf(rexpr);
      if (!lit || this.maskedKey(lcol)) return null;
      return { t: "cmpLit", col: lcol, op: canonical, lit };
    }
    if (rcol) {
      const lit = litOf(lexpr);
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

    const bool = boolLiteral(expr);
    if (bool !== null) return bool;

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
        const op = bareOpName(ae.name);
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

    // The polarity matters as much as the reading: a rule that dropped any
    // literal arm would also drop the LIVE `true` of a vacuous constraint
    // and claim the column beside it.
    const bool = boolLiteral(expr);
    if (bool !== null) return !bool;

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
        const op = bareOpName(ae.name);
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
    if (atom.t === "cmpLit" && this.oracleAnswer(atom) === true) return true;
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
    if (atom.t === "cmpLit" && this.oracleAnswer(atom) === false) return true;
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

  /**
   * The oracle consult: a TRUE equality fact on the atom's column, both
   * literals effectively COLUMN-typed (bare, or cast to the column's own
   * type — the litsMatch gate), the answer looked up at the column's FULL
   * declared rendering (typmods included, the bp case). Generalizes the
   * two distinctness rules to the whole comparison set through evaluation;
   * inherits every evidence gate, because it consumes only the
   * already-collected, already-masked TRUE facts.
   */
  private oracleAnswer(atom: Extract<Atom, { t: "cmpLit" }>): boolean | null {
    const ask = this.input.evaluatedComparison;
    if (!ask) return null;
    if (!this.litColumnTyped(atom.col, atom.lit)) return null;
    const dot = atom.col.indexOf(".");
    const alias = atom.col.slice(0, dot);
    const column = atom.col.slice(dot + 1);
    // The collation gate — column-level, so it cannot live in the
    // type-level question key. Closed by default.
    if (!this.input.comparisonEvaluable?.(alias, column, atom.op)) return null;
    const colType = this.input.columnTypeName(alias, column);
    if (!colType) return null;
    for (const f of this.trueFacts) {
      if (f.t !== "cmpLit" || f.col !== atom.col || f.op !== "=") continue;
      if (!this.litColumnTyped(atom.col, f.lit)) continue;
      const answer = ask(colType, f.lit, atom.op, atom.lit);
      if (answer !== null) {
        this.input.trace?.addFact(
          "evaluatedComparison",
          `${atom.col} ${atom.op} <literal> decided ${answer} by the equality fact's literal`,
        );
        return answer;
      }
    }
    return null;
  }

  /** Bare, or explicitly cast to the column's own type. */
  private litColumnTyped(colKey: string, lit: Lit): boolean {
    if (lit.cast === null) return true;
    const colType = this.colTypeRef(colKey);
    return (
      colType !== null && lit.cast.name === colType.name && lit.cast.schema === colType.schema
    );
  }

  /**
   * notTRUE(atom) — the trichotomy judgment: some TRUE or notFALSE fact
   * over the IDENTICAL tokens carries an operator exclusive with the
   * atom's. No values consulted; `litsMatch` holds the token identity and
   * the effective-type agreement.
   */
  private atomNotTrue(atom: Atom): boolean {
    if (atom.t !== "cmpLit") return false;
    const exclusive = EXCLUSIVE_OPS[atom.op] ?? [];
    const witness = (f: Atom): boolean =>
      f.t === "cmpLit" &&
      f.col === atom.col &&
      exclusive.includes(f.op) &&
      this.litsMatch(atom.col, f.lit, atom.lit);
    if (this.trueFacts.some(witness) || this.notFalseFacts.some(witness)) return true;
    if (this.intervalRefuted(atom)) return true;
    return this.orFactRefuted(atom);
  }

  /**
   * List membership exclusion (docs/subtree-evaluation.md, "List
   * membership exclusion"): an OR-fact refutes an atom when EVERY arm
   * carries a comparison over the atom's column whose value set provably
   * shares nothing with it — same-token exclusivity or the interval
   * judgment, per arm, under the same per-column gates. Sound at notFALSE
   * strength: were the atom TRUE its column would be non-null, each arm's
   * refuting comparison would have EVALUATED — to FALSE, the sets being
   * disjoint — a conjunction with a FALSE member is FALSE, and an
   * all-FALSE OR contradicts notFALSE. (A TRUE OR-fact is stronger and
   * concludes directly: whichever arm held, its refuting comparison held
   * beside the atom, in an empty intersection.) An arm without such a
   * comparison refuses the whole fact, conservatively — the NULL-listing
   * bound's IS NULL arm is the standing example.
   */
  private orFactRefuted(atom: Extract<Atom, { t: "cmpLit" }>): boolean {
    if (this.orFacts.length === 0 && this.notFalseOrFacts.length === 0) return false;
    const exclusive = EXCLUSIVE_OPS[atom.op] ?? [];
    const refutes = (w: Atom): boolean =>
      w.t === "cmpLit" &&
      w.col === atom.col &&
      ((exclusive.includes(w.op) && this.litsMatch(atom.col, w.lit, atom.lit)) ||
        this.cmpDisjointRel(w, atom) !== null);
    for (const fact of [...this.orFacts, ...this.notFalseOrFacts]) {
      if (fact.length > 0 && fact.every(arm => arm.some(refutes))) {
        this.input.trace?.addFact(
          "listMembershipExclusion",
          `${atom.col} ${atom.op} <literal> is excluded by every arm of an OR-fact → never TRUE`,
        );
        return true;
      }
    }
    return false;
  }

  /**
   * The interval-exclusivity judgment over ORDERED ANCHORS
   * (docs/subtree-evaluation.md, "Interval exclusivity over btree
   * strategies"): the witness fact's set and the atom's set share nothing,
   * decided from the shapes PostgreSQL publishes and the evaluated anchor
   * order. If the atom were TRUE the column would be non-null, the
   * witness comparison would have EVALUATED, and notFALSE would force it
   * TRUE — landing the value in an empty intersection. EMPTINESS is the
   * only conclusion this may draw: nonemptiness needs a type's
   * inhabitants, which is the wall the charter names.
   */
  private intervalRefuted(atom: Extract<Atom, { t: "cmpLit" }>): boolean {
    for (const f of [...this.trueFacts, ...this.notFalseFacts]) {
      if (f.t !== "cmpLit" || f.col !== atom.col) continue;
      const rel = this.cmpDisjointRel(f, atom);
      if (rel !== null) {
        this.input.trace?.addFact(
          "intervalExclusivity",
          `${atom.col} ${atom.op} <anchor> shares nothing with the ` +
            `${f.op} fact's set (anchors ${rel}) → never TRUE`,
        );
        return true;
      }
    }
    return false;
  }

  /**
   * The per-witness core of the interval judgment, shared with the
   * OR-fact rule: the anchor relation when witness `w`'s set and question
   * `q`'s set are provably disjoint, null otherwise. Same-column callers
   * only; every gate — captures present, column-typed literals, the
   * collation trichotomy through `comparisonEvaluable` — applies here.
   */
  private cmpDisjointRel(
    w: Extract<Atom, { t: "cmpLit" }>,
    q: Extract<Atom, { t: "cmpLit" }>,
  ): "lt" | "eq" | "gt" | "ne" | null {
    const strat = this.input.btreeStrategy;
    const compl = this.input.equalityComplement;
    if (!strat || !compl || !this.input.evaluatedComparison) return null;
    const shapeOf = (op: string): number | null =>
      strat(op) ?? (compl(op) ? COMPLEMENT_SHAPE : null);
    const sq = shapeOf(q.op);
    const sw = shapeOf(w.op);
    if (sq === null || sw === null) return null;
    if (!this.litColumnTyped(q.col, q.lit) || !this.litColumnTyped(q.col, w.lit)) return null;
    const dot = q.col.indexOf(".");
    const alias = q.col.slice(0, dot);
    const column = q.col.slice(dot + 1);
    const colType = this.input.columnTypeName(alias, column);
    if (colType === null) return null;
    const eqOk = this.input.comparisonEvaluable?.(alias, column, "=") ?? false;
    const ltOk = this.input.comparisonEvaluable?.(alias, column, "<") ?? false;
    const rel = this.anchorRelation(colType, w.lit, q.lit, eqOk, ltOk);
    return rel !== null && shapesDisjoint(sw, rel, sq) ? rel : null;
  }

  /**
   * How the witness anchor relates to the question anchor: lt/eq/gt when
   * order is derivable, `ne` when only inequality is (a deterministic
   * collatable column answers `=` but never `<`), null when nothing is.
   * Identical tokens are `eq` for free — token identity needs no session.
   */
  private anchorRelation(
    colType: string,
    w: Lit,
    q: Lit,
    eqOk: boolean,
    ltOk: boolean,
  ): "lt" | "eq" | "gt" | "ne" | null {
    if (w.kind === q.kind && w.value === q.value) return "eq";
    const ask = this.input.evaluatedComparison!;
    if (eqOk) {
      const e = ask(colType, w, "=", q);
      if (e === true) return "eq";
      if (e === false) {
        if (!ltOk) return "ne";
        const l = ask(colType, w, "<", q);
        if (l === true) return "lt";
        if (l === false) return "gt"; // not equal, not less: the order is total
        return "ne";
      }
    }
    if (ltOk) {
      const l = ask(colType, w, "<", q);
      if (l === true) return "lt";
      const g = ask(colType, q, "<", w);
      if (g === true) return "gt";
      if (l === false && g === false) return "eq";
    }
    return null;
  }

  /**
   * notTRUE(expr) — for every emitted row. The compound rules are the weak
   * duals: an AND is not TRUE when SOME conjunct is not TRUE, an OR when
   * EVERY disjunct is, NOT p when p is TRUE. Leaves answer through FALSE
   * (stronger) or trichotomy; a conjunction-shaped atom list (BETWEEN's
   * two bounds) needs only one refuted member.
   *
   * Guard-side IN (docs/subtree-evaluation.md, "Guard-side IN"): a
   * multi-element IN — and its `= ANY (ARRAY[...])` rendering — is a
   * disjunction wearing leaf syntax, so it takes the OR rule through
   * `disjunctArms` rather than atomizing to nothing. `atomsOf` skips these
   * shapes because on the FACT side a disjunction asserts no single atom;
   * on the GUARD side the disjunction IS the question. `NOT IN` is a
   * conjunction and `disjunctArms` refuses it (AEXPR_IN carrying `<>`), as
   * it refuses a list with a NULL in it — that arm carries no atom.
   */
  private isNotTrue(expr: Node): boolean {
    if (this.isFalse(expr)) return true;
    const node = expr as Record<string, unknown>;
    const be = node["BoolExpr"] as { boolop?: string; args?: Node[] } | undefined;
    if (be) {
      const args = be.args ?? [];
      if (be.boolop === "AND_EXPR") return args.some(a => this.isNotTrue(a));
      if (be.boolop === "OR_EXPR") return args.length > 0 && args.every(a => this.isNotTrue(a));
      if (be.boolop === "NOT_EXPR") return args.length === 1 && this.isTrue(args[0]!);
      return false;
    }
    const refutedAtom = (a: Atom): boolean => this.atomIsFalse(a) || this.atomNotTrue(a);
    const atoms = this.atomsOf(expr);
    if (atoms.some(refutedAtom)) return true;
    const arms = this.disjunctArms(expr);
    return !!arms && arms.length > 0 && arms.every(arm => arm.some(refutedAtom));
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
    return this.sameEffectiveType(colKey, a, b);
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

  /**
   * Whether the facts pin `col` NULL — the mirror of `colKnownNonNull` over
   * the same three stores, and deliberately shorter.
   *
   * There is no `strictlyInvolves` arm here. That helper exists because a
   * comparison, a boolean column, a literal test — anything TRUE — proves
   * its operands non-null by strictness. No atom shape has the dual
   * property: nothing is TRUE *because* a column is NULL. So a NullTest
   * saying so, in one of the three polarities the stores can carry, is the
   * only evidence there is.
   */
  private colKnownNull(col: string): boolean {
    const saysNull = (a: Atom): boolean => a.t === "nullTest" && a.col === col && !a.isNotNull;
    // TRUE `col IS NULL`.
    if (this.trueFacts.some(saysNull)) return true;
    // FALSE `col IS NOT NULL` — total either way, so the negation is TRUE.
    if (this.falseFacts.some(a => a.t === "nullTest" && a.col === col && a.isNotNull)) {
      return true;
    }
    // Every arm of a disjunction concludes it, so whichever arm held did.
    return this.orFacts.some(fact => fact.every(arm => arm.some(saysNull)));
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

}
