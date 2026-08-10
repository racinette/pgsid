// ---------------------------------------------------------------------------
// Mechanical query generation for the nullability engine.
//
// See docs/query-generator.md for the design. In one paragraph: the
// structural space — join kinds and their nesting, grouping, set operations,
// CTEs, subqueries, LATERAL — is enumerated exhaustively as a nested loop
// over axes, while expressions are drawn from a small fixed vocabulary so
// type-correctness costs nothing. Each tuple of axis values builds a
// libpg-query AST; the caller deparses it, re-parses the text, and feeds one
// identical string to both the engine and PostgreSQL. PostgreSQL is the
// answer key, so no query carries a hand-written expectation.
//
// Every generated query is a pure SELECT over the fixture schema's small
// tables (`t`, `u`, `v`) — no writes, so execution needs no transaction
// wrapping.
//
// Each query also carries `expectations`: predicates over the RE-PARSED AST
// asserting that the constructs its axis tuple requested actually survived
// deparsing. A deparser that drops a clause but emits SQL that still parses
// (the recursive-CTE SEARCH/CYCLE failure mode measured in
// deparser-roundtrip.test.ts) would otherwise convert a requested construct
// into silent false confidence. Only the generator knows what each query was
// supposed to contain, which is why the expectations live here and not in the
// node census.
// ---------------------------------------------------------------------------

type Ast = Record<string, unknown>;

export interface Expectation {
  label: string;
  present(root: unknown): boolean;
}

export interface AxisTuple {
  structure: string;
  projection: string;
  setop: string;
  wrapper: string;
}

export interface GeneratedQuery {
  /** Reproduces the query: the axis tuple, serialised. */
  id: string;
  axes: AxisTuple;
  /** The constructed statement, ready for the deparser. */
  ast: Ast;
  /** Checks against the re-parsed AST; a false one is a silent drop. */
  expectations: Expectation[];
  /**
   * The statement writes (generated DML). The suite must wrap its every
   * execution in BEGIN/ROLLBACK; pure SELECTs skip the round-trips.
   */
  writes?: boolean;
  /**
   * The parameters this query takes, with a valid (non-NULL) value each —
   * the all-valid control binding. Positional by `number`; empty for the
   * parameter-free bulk of the corpus. The suite derives NULL-variant
   * bindings from this to verify the engine's argument claims, with
   * PostgreSQL as the answer key in both directions.
   */
  params: { number: number; valid: unknown }[];
}

// --- AST vocabulary --------------------------------------------------------

const str = (sval: string): Ast => ({ String: { sval } });
const colRef = (...parts: string[]): Ast => ({ ColumnRef: { fields: parts.map(str) } });
// libpg-query omits zero-valued fields: integer 0 is `{ival: {}}`.
const intConst = (n: number): Ast => ({ A_Const: { ival: n === 0 ? {} : { ival: n } } });
const textConst = (s: string): Ast => ({ A_Const: { sval: { sval: s } } });
const numConst = (s: string): Ast => ({ A_Const: { fval: { fval: s } } });
const nullConst = (): Ast => ({ A_Const: { isnull: true } });
const boolConst = (b: boolean): Ast => ({ A_Const: { boolval: b ? { boolval: true } : {} } });
const target = (val: Ast, name?: string): Ast => ({
  ResTarget: name ? { name, val } : { val },
});
const funcCall = (name: string, args: Ast[]): Ast => ({
  FuncCall: { funcname: [str(name)], args, funcformat: "COERCE_EXPLICIT_CALL" },
});
const countStar = (): Ast => ({
  FuncCall: { funcname: [str("count")], agg_star: true, funcformat: "COERCE_EXPLICIT_CALL" },
});
const coalesce = (...args: Ast[]): Ast => ({ CoalesceExpr: { args } });
/** `ROW(a, b)::typeName` — a row constructor cast to a known composite. */
const rowCast = (args: Ast[], typeName: string): Ast => ({
  TypeCast: {
    arg: { RowExpr: { args, row_format: "COERCE_EXPLICIT_CALL" } },
    typeName: { names: [str(typeName)], typemod: -1 },
  },
});
/** `(expr).*` — the composite star, which expands to the type's fields. */
const compositeStar = (arg: Ast): Ast => ({
  A_Indirection: { arg, indirection: [{ A_Star: {} }] },
});
const caseWhen = (cond: Ast, then: Ast, otherwise: Ast): Ast => ({
  CaseExpr: { args: [{ CaseWhen: { expr: cond, result: then } }], defresult: otherwise },
});
const nullif = (a: Ast, b: Ast): Ast => ({
  A_Expr: { kind: "AEXPR_NULLIF", name: [str("=")], lexpr: a, rexpr: b },
});
const eq = (l: Ast, r: Ast): Ast => ({
  A_Expr: { kind: "AEXPR_OP", name: [str("=")], lexpr: l, rexpr: r },
});
const rangeVar = (relname: string): Ast => ({
  RangeVar: { relname, inh: true, relpersistence: "p" },
});
/**
 * `ONLY rel` — the relation's own rows, not its inheritance tree. `inh` is
 * the one bit that separates the walk's TREE accessors from their non-tree
 * halves (`resolveForeignKey`, `resolveWriteRewrites`, `resolveColumnNotNull`
 * and friends), and the generator wrote `inh: true` everywhere.
 *
 * The field is OMITTED rather than set to `false`, which is not a style
 * choice: libpg-query serialises protobuf defaults by leaving them out, so
 * `FROM ONLY t` parses to a RangeVar with no `inh` key at all (measured). The
 * deparser reads it the same way and emits `ONLY` for an absent `inh` —
 * `inh: false` round-trips to a plain `FROM t`, silently, which is how the
 * first version of this helper produced 1126 queries that spelled no ONLY
 * anywhere and lit no accessor.
 */
const onlyVar = (relname: string): Ast => ({
  RangeVar: { relname, relpersistence: "p" },
});
const paramRef = (number: number): Ast => ({ ParamRef: { number } });
const castTo = (arg: Ast, typeName: string): Ast => ({
  TypeCast: { arg, typeName: { names: [str(typeName)], typemod: -1 } },
});
const neq = (l: Ast, r: Ast): Ast => ({
  A_Expr: { kind: "AEXPR_OP", name: [str("<>")], lexpr: l, rexpr: r },
});
const concatOp = (l: Ast, r: Ast): Ast => ({
  A_Expr: { kind: "AEXPR_OP", name: [str("||")], lexpr: l, rexpr: r },
});
/** A binary operator by NAME — the user-defined ones the curated sets exclude. */
const opExpr = (name: string, l: Ast, r: Ast): Ast => ({
  A_Expr: { kind: "AEXPR_OP", name: [str(name)], lexpr: l, rexpr: r },
});
const arrayExpr = (elements: Ast[]): Ast => ({ A_ArrayExpr: { elements } });
const isNull = (arg: Ast): Ast => ({ NullTest: { arg, nulltesttype: "IS_NULL" } });
const orExpr = (...args: Ast[]): Ast => ({ BoolExpr: { boolop: "OR_EXPR", args } });
const andExpr = (...args: Ast[]): Ast => ({ BoolExpr: { boolop: "AND_EXPR", args } });
const plus = (l: Ast, r: Ast): Ast => ({
  A_Expr: { kind: "AEXPR_OP", name: [str("+")], lexpr: l, rexpr: r },
});
// DML pieces. A DML statement's relation is an INLINED RangeVar (no tag),
// and RETURNING is a ReturningClause struct: `{ exprs: [ResTarget...] }`.
const relation = (relname: string): Ast => ({ relname, inh: true, relpersistence: "p" });
/** A DML target spelled `ONLY rel` — see `onlyVar` for why `inh` is absent. */
const onlyRelation = (relname: string): Ast => ({ relname, relpersistence: "p" });
const insertCols = (...names: string[]): Ast[] => names.map(n => ({ ResTarget: { name: n } }));
const setItem = (name: string, val: Ast): Ast => ({ ResTarget: { name, val } });
const valuesRow = (...items: Ast[]): Ast => ({ List: { items } });
// ON CONFLICT — the clause is an INLINED OnConflictClause struct; the
// conflict target (`infer`) names index columns via IndexElem.
const onConflictUpdate = (keyCol: string, ...setItems: Ast[]): Ast => ({
  action: "ONCONFLICT_UPDATE",
  infer: { indexElems: [{ IndexElem: { name: keyCol } }] },
  targetList: setItems,
});
const onConflictNothing = (keyCol: string): Ast => ({
  action: "ONCONFLICT_NOTHING",
  infer: { indexElems: [{ IndexElem: { name: keyCol } }] },
});
// MERGE pieces. A when-clause is a tagged MergeWhenClause; the INSERT arm
// carries name-only ResTargets plus positional `values`, the UPDATE arm
// SET-style ResTargets, DELETE and DO NOTHING neither.
const mergeWhen = (matchKind: string, commandType: string, fields: Ast = {}): Ast => ({
  MergeWhenClause: {
    matchKind,
    commandType,
    ...(commandType === "CMD_INSERT" ? { override: "OVERRIDING_NOT_SET" } : {}),
    ...fields,
  },
});
const mergeSource = (select: Ast, colnames?: string[]): Ast => ({
  RangeSubselect: {
    subquery: { SelectStmt: select },
    alias: { aliasname: "s", ...(colnames ? { colnames: colnames.map(str) } : {}) },
  },
});
const isNotNull = (arg: Ast): Ast => ({ NullTest: { arg, nulltesttype: "IS_NOT_NULL" } });
// merge_action() is not a FuncCall: the parser emits a dedicated
// MergeSupportFunc node (msftype is the result type oid — 25, text). A
// constructed FuncCall deparses QUOTED and PostgreSQL then looks up an
// ordinary function that does not exist.
const mergeAction = (): Ast => ({ MergeSupportFunc: { msftype: 25 } });
const join = (jointype: string, larg: Ast, rarg: Ast, quals?: Ast): Ast => ({
  JoinExpr: quals ? { jointype, larg, rarg, quals } : { jointype, larg, rarg },
});
// Window vocabulary. `over` is an INLINED WindowDef; frameOptions 1058 is the
// parser's default frame (RANGE UNBOUNDED PRECEDING TO CURRENT ROW), measured
// by parsing the SQL these helpers are meant to regenerate.
const overClause = (fields: Ast = {}): Ast => ({ frameOptions: 1058, ...fields });
const overPartition = (col: Ast): Ast => overClause({ partitionClause: [col] });
const overOrder = (col: Ast): Ast =>
  overClause({
    orderClause: [
      {
        SortBy: {
          node: col,
          sortby_dir: "SORTBY_DEFAULT",
          sortby_nulls: "SORTBY_NULLS_DEFAULT",
        },
      },
    ],
  });
const winCall = (name: string, args: Ast[], over: Ast): Ast => ({
  FuncCall: {
    funcname: [str(name)],
    ...(args.length ? { args } : {}),
    over,
    funcformat: "COERCE_EXPLICIT_CALL",
  },
});
const winCountStar = (over: Ast): Ast => ({
  FuncCall: { funcname: [str("count")], agg_star: true, over, funcformat: "COERCE_EXPLICIT_CALL" },
});
const bareSelect = (fields: Ast): Ast => ({
  limitOption: "LIMIT_OPTION_DEFAULT",
  op: "SETOP_NONE",
  ...fields,
});

// --- Walking the re-parsed AST for expectations ----------------------------

/** Every object in the tree (depth-first), tagged and untagged alike. */
function* walk(node: unknown): Generator<Record<string, unknown>> {
  if (Array.isArray(node)) {
    for (const n of node) yield* walk(n);
    return;
  }
  if (!node || typeof node !== "object") return;
  yield node as Record<string, unknown>;
  for (const v of Object.values(node)) yield* walk(v);
}

function jointypes(root: unknown): string[] {
  const out: string[] = [];
  for (const n of walk(root)) {
    if (typeof n.jointype === "string") out.push(n.jointype);
  }
  return out.sort();
}

const hasTag =
  (tag: string) =>
  (root: unknown): boolean => {
    for (const n of walk(root)) if (tag in n) return true;
    return false;
  };

const expectJoins = (...kinds: string[]): Expectation => ({
  label: `joins ${kinds.join("+")}`,
  present: root => JSON.stringify(jointypes(root)) === JSON.stringify([...kinds].sort()),
});

const expectLateral: Expectation = {
  label: "LATERAL subquery",
  present: root => {
    for (const n of walk(root)) {
      const sub = (n as { RangeSubselect?: { lateral?: boolean } }).RangeSubselect;
      if (sub?.lateral === true) return true;
    }
    return false;
  },
};

const expectGroupBy: Expectation = {
  label: "GROUP BY",
  present: root => {
    for (const n of walk(root)) {
      if (Array.isArray(n.groupClause) && n.groupClause.length > 0) return true;
    }
    return false;
  },
};

const expectSetOp = (op: string, all: boolean): Expectation => ({
  label: `${op}${all ? " ALL" : ""}`,
  present: root => {
    for (const n of walk(root)) {
      if (n.op === op && Boolean(n.all) === all) return true;
    }
    return false;
  },
});

const expectNullif: Expectation = {
  label: "NULLIF",
  present: root => {
    for (const n of walk(root)) {
      if ((n as { A_Expr?: { kind?: string } }).A_Expr?.kind === "AEXPR_NULLIF") return true;
    }
    return false;
  },
};

const expectCountStar: Expectation = {
  label: "count(*)",
  present: root => {
    for (const n of walk(root)) {
      if ((n as { FuncCall?: { agg_star?: boolean } }).FuncCall?.agg_star === true) return true;
    }
    return false;
  },
};

const expect = (label: string, tag: string): Expectation => ({ label, present: hasTag(tag) });

const expectReturning: Expectation = {
  label: "RETURNING",
  present: root => {
    for (const n of walk(root)) {
      const rc = n.returningClause as { exprs?: unknown[] } | undefined;
      if (rc && Array.isArray(rc.exprs) && rc.exprs.length > 0) return true;
    }
    return false;
  },
};

/** The exact multiset of (matchKind, commandType) arms in the re-parsed AST. */
const expectMergeArms = (...arms: string[]): Expectation => ({
  label: `arms ${arms.join(", ")}`,
  present: root => {
    const found: string[] = [];
    for (const n of walk(root)) {
      const c = n.MergeWhenClause as { matchKind?: string; commandType?: string } | undefined;
      if (c) found.push(`${c.matchKind}/${c.commandType}`);
    }
    return found.length === arms.length && arms.every(a => found.includes(a));
  },
});

const expectOnConflict = (action: string): Expectation => ({
  label: `ON CONFLICT ${action}`,
  present: root => {
    for (const n of walk(root)) {
      const oc = n.onConflictClause as { action?: string } | undefined;
      if (oc?.action === action) return true;
    }
    return false;
  },
});

/**
 * A `RangeVar` for `rel` with inheritance OFF in the re-parsed AST. The
 * deparse/re-parse round trip is where an `inh: false` would go missing, and
 * silently: the query still runs, and every catalog question it asks moves
 * back to the tree accessor.
 */
const expectOnly = (rel: string): Expectation => ({
  label: `ONLY ${rel}`,
  present: root => {
    for (const n of walk(root)) {
      // A FROM item is a wrapped `{RangeVar: …}`; a DML target is the bare
      // message under `relation`, which is why `relation()` builds one.
      const rv = (n.RangeVar ?? n) as { relname?: string; inh?: boolean };
      // `inh !== true`, because absent IS the ONLY spelling — see `onlyVar`.
      if (rv?.relname === rel && rv.inh !== true) return true;
    }
    return false;
  },
});

/** An `A_Expr` naming this operator symbol in the re-parsed AST. */
const expectOperator = (op: string): Expectation => ({
  label: `${op} operator`,
  present: root => {
    for (const n of walk(root)) {
      const ae = n.A_Expr as { name?: unknown[] } | undefined;
      if ((ae?.name ?? []).some(f => (f as { String?: { sval?: string } }).String?.sval === op)) {
        return true;
      }
    }
    return false;
  },
});

/** A call of `fn` carrying an OVER clause in the re-parsed AST. */
const expectWindow = (fn: string): Expectation => ({
  label: `${fn}() OVER`,
  present: root => {
    for (const n of walk(root)) {
      const fc = n.FuncCall as { funcname?: unknown[]; over?: unknown } | undefined;
      if (
        fc?.over &&
        (fc.funcname ?? []).some(
          f => (f as { String?: { sval?: string } }).String?.sval === fn,
        )
      ) {
        return true;
      }
    }
    return false;
  },
});

const expectHaving: Expectation = {
  label: "HAVING",
  present: root => {
    for (const n of walk(root)) if (n.havingClause) return true;
    return false;
  },
};

/** A cast whose target type is the fixture's NOT NULL domain. */
const expectDomainCast: Expectation = {
  label: "cast to nn_text",
  present: root => {
    for (const n of walk(root)) {
      const names = (n.TypeCast as { typeName?: { names?: unknown[] } } | undefined)?.typeName
        ?.names;
      if (names?.some(x => (x as { String?: { sval?: string } }).String?.sval === "nn_text")) {
        return true;
      }
    }
    return false;
  },
};

const expectLimit: Expectation = {
  label: "LIMIT",
  present: root => {
    for (const n of walk(root)) if (n.limitCount) return true;
    return false;
  },
};

/** The exact set of `$n` numbers present in the re-parsed AST. */
const expectParams = (...numbers: number[]): Expectation => ({
  label: `params $${numbers.join(", $")}`,
  present: root => {
    const found = new Set<number>();
    for (const n of walk(root)) {
      const num = (n as { ParamRef?: { number?: number } }).ParamRef?.number;
      if (num !== undefined) found.add(num);
    }
    return (
      found.size === numbers.length && numbers.every(n => found.has(n))
    );
  },
});

// --- Axis 1+2: join structure ----------------------------------------------
//
// Every structure exposes the same slots, so projections compose with any
// structure without caring which relations it contains. Base-table facts:
// t.id / t.active / u.email are NOT NULL, t.name / u.val / v.amount are
// nullable — and the join kind then decides what survives NULL-extension,
// which is exactly the reasoning under test.

interface Slots {
  intKey: Ast;
  boolCol: Ast;
  /** Nullable text from the join's left side. */
  textA: Ast;
  /** NOT NULL text from the join's right side (or the lateral subquery). */
  textB: Ast;
  /** Nullable text from the join's right side (or the lateral subquery). */
  textC: Ast;
}

interface Extra {
  expr: Ast;
  alias: string;
  /** A literal of the same type, for the set-operation branch. */
  literal: Ast;
  /** The value this expression takes on the matched `sparse` row. */
  matchLiteral: Ast;
}

interface JoinStructure {
  key: string;
  fromClause: Ast[];
  slots: Slots;
  extras: Extra[];
  expectations: Expectation[];
}

const JOIN_KINDS = ["JOIN_INNER", "JOIN_LEFT", "JOIN_RIGHT", "JOIN_FULL"] as const;
const kindLabel = (k: string): string => k.replace("JOIN_", "").toLowerCase();

const tuSlots: Slots = {
  intKey: colRef("t", "id"),
  boolCol: colRef("t", "active"),
  textA: colRef("t", "name"),
  textB: colRef("u", "email"),
  textC: colRef("u", "val"),
};

const vExtra: Extra = {
  expr: colRef("v", "amount"),
  alias: "a_amt",
  literal: numConst("0.5"),
  matchLiteral: nullConst(),
};

const tJoinU = (kind: string): Ast =>
  join(kind, rangeVar("t"), rangeVar("u"), eq(colRef("u", "t_id"), colRef("t", "id")));

function joinStructures(): JoinStructure[] {
  const out: JoinStructure[] = [];

  for (const k of JOIN_KINDS) {
    out.push({
      key: `single(${kindLabel(k)})`,
      fromClause: [tJoinU(k)],
      slots: tuSlots,
      extras: [],
      expectations: [expectJoins(k)],
    });
  }

  // The ONLY spelling of the same join — `docs/generated-surface.md` item 5.
  //
  // `inh` is the bit that chooses between the walk's TREE accessors and their
  // non-tree halves, and the generator set it true everywhere: every catalog
  // fact the corpus asked for came back through `…Tree`, so `resolveForeignKey`
  // measured cold across all 12962 statements and all thirteen schema variants
  // while `resolveForeignKeyTree` was warm on every one of them. ONLY is not a
  // new relation or a new schema — it is the same join with one bit flipped,
  // which is precisely why no amount of schema variation could reach it.
  //
  // Both sides carry it. `ONLY u` is what puts the non-tree accessor under the
  // key entailment (the entailment's REFERENCING side is `u`, and `scansTree`
  // is a property of the scanned entry), and `ONLY t` is what makes the
  // structure discriminating under the `inherit-child` variant, where
  // `ALTER TABLE ONLY t … SET NOT NULL` leaves a child free to store the NULL
  // the parent forbids: `FROM t` must read the tree and `FROM ONLY t` must
  // not. Under the base schema neither relation has children, so the rows are
  // identical to `single(k)`'s and every projection's literals carry over
  // unchanged.
  for (const k of JOIN_KINDS) {
    out.push({
      key: `only(${kindLabel(k)})`,
      fromClause: [
        join(k, onlyVar("t"), onlyVar("u"), eq(colRef("u", "t_id"), colRef("t", "id"))),
      ],
      slots: tuSlots,
      extras: [],
      expectations: [expectJoins(k), expectOnly("t"), expectOnly("u")],
    });
  }

  for (const k1 of JOIN_KINDS) {
    for (const k2 of JOIN_KINDS) {
      out.push({
        key: `nest-left(${kindLabel(k1)},${kindLabel(k2)})`,
        // (t k1 u) k2 v
        fromClause: [
          join(k2, tJoinU(k1), rangeVar("v"), eq(colRef("v", "u_id"), colRef("u", "id"))),
        ],
        slots: tuSlots,
        extras: [vExtra],
        expectations: [expectJoins(k1, k2)],
      });
      out.push({
        key: `nest-right(${kindLabel(k1)},${kindLabel(k2)})`,
        // t k1 (u k2 v)
        fromClause: [
          join(
            k1,
            rangeVar("t"),
            join(k2, rangeVar("u"), rangeVar("v"), eq(colRef("v", "u_id"), colRef("u", "id"))),
            eq(colRef("u", "t_id"), colRef("t", "id")),
          ),
        ],
        slots: tuSlots,
        extras: [vExtra],
        expectations: [expectJoins(k1, k2)],
      });
    }
  }

  const lateralSub: Ast = {
    RangeSubselect: {
      lateral: true,
      subquery: {
        SelectStmt: bareSelect({
          targetList: [
            target(colRef("u", "email"), "lemail"),
            target(colRef("u", "val"), "lval"),
          ],
          fromClause: [rangeVar("u")],
          whereClause: eq(colRef("u", "t_id"), colRef("t", "id")),
        }),
      },
      alias: { aliasname: "lsub" },
    },
  };
  const lateralSlots: Slots = {
    ...tuSlots,
    textB: colRef("lsub", "lemail"),
    textC: colRef("lsub", "lval"),
  };
  out.push({
    key: "lateral-cross",
    // FROM t, LATERAL (...) — an implicit cross join, so no JoinExpr at all.
    fromClause: [rangeVar("t"), lateralSub],
    slots: lateralSlots,
    extras: [],
    expectations: [expectLateral, expectJoins()],
  });
  out.push({
    key: "lateral-left",
    fromClause: [join("JOIN_LEFT", rangeVar("t"), lateralSub, boolConst(true))],
    slots: lateralSlots,
    extras: [],
    expectations: [expectLateral, expectJoins("JOIN_LEFT")],
  });

  // The FROM-ITEM axis: a SETOF <table> function standing where `u` stood.
  //
  // `RETURNS SETOF u` ERASES u's NOT NULLs — PostgreSQL re-imposes nothing,
  // measured — so the only sound source of a guarantee is the BODY, which the
  // walk reads back and ORs into the declared list. That is the imprecision
  // closure's class A, and it moves claims from nullable to notNull, which is
  // the UNSOUND direction; until this axis it had no generated coverage at
  // all, because the corpus had no table function to call.
  //
  // The slots are the t–u slots with `u` replaced by the function's output, so
  // every projection, set operation and wrapper runs over it unchanged — and
  // the matchLiterals still hold, because `gfn_urows(t.id)` returns exactly
  // the rows `ON u.t_id = t.id` selects.
  //
  // Only the cross and LEFT forms exist, for the same reason the lateral
  // structures have no FULL variant: a function FROM-item referencing an
  // earlier one is lateral, and RIGHT/FULL LATERAL is not legal SQL.
  const srfItem = (lateral: boolean): Ast => ({
    RangeFunction: {
      ...(lateral ? { lateral: true } : {}),
      functions: [
        { List: { items: [funcCall("gfn_urows", [colRef("t", "id")]), {}] } },
      ],
      alias: { aliasname: "g" },
    },
  });
  const srfSlots: Slots = {
    ...tuSlots,
    textB: colRef("g", "email"),
    textC: colRef("g", "val"),
  };
  out.push({
    key: "srf-cross",
    fromClause: [rangeVar("t"), srfItem(false)],
    slots: srfSlots,
    extras: [],
    expectations: [expect("table function", "RangeFunction"), expectJoins()],
  });
  out.push({
    key: "srf-left",
    fromClause: [join("JOIN_LEFT", rangeVar("t"), srfItem(true), boolConst(true))],
    slots: srfSlots,
    extras: [],
    expectations: [expect("table function", "RangeFunction"), expectJoins("JOIN_LEFT")],
  });

  // The UNNEST / builtin-SRF axis — `docs/generated-surface.md` item 5.
  //
  // Four catalog capabilities measured cold across the entire generated corpus
  // AND all thirteen schema variants, all four behind ONE missing call site:
  // `unnestElementType` is entered only by an `unnest` in FROM position, and
  // the generator wrote no unnest anywhere. A fifth, `resolveBuiltinFunctionShape`,
  // is the FROM-item shape branch for a pg_catalog function, and the corpus's
  // only table function was the user-defined `gfn_urows`.
  //
  // Three FROM items, each chosen for the branch it takes and each returning
  // EXACTLY ONE ROW so the whole structural corpus runs over them unchanged —
  // a cross-joined item that multiplied rows would invalidate every
  // projection's matchLiterals at once.
  //
  //   unnest(ARRAY[ROW(t.name, u.email)::gfn_pair]) — the COMPOSITE element
  //     path. The array's first element is a cast, so the element type is read
  //     from the cast's target name, which `fromRendered` must follow through
  //     any domain layer before deciding it is composite: that is
  //     `resolveDomainBaseTypeName`, asked here of a name that is NOT a domain,
  //     which is the answer the branch needs and the one no fixture makes
  //     cheap. The item expands to gfn_pair's two fields, so it supplies the
  //     structure's text slots and the column-list oracle checks the expansion
  //     on every projection.
  //   unnest(string_to_array('z', ',', 'z')) — the FUNCTION-CALL element path:
  //     no user candidate, so the walk asks for polymorphic signatures first
  //     (`resolvePolymorphicArraySignatures`) and then falls to the two builtin
  //     predicates (`isBuiltinFunction`, `isPolymorphicBuiltin`). The
  //     three-argument form's null_string turns the single piece into a NULL,
  //     so the column is one row of NULL — the nullable claim is witnessed by
  //     construction rather than by a data state.
  //   json_each_text('{"a": null}'::json) — a pg_catalog SRF with NAMED OUTPUT
  //     COLUMNS, which is the case `resolveBuiltinFunctionShape` exists for:
  //     the fallback would contribute one column named after the function
  //     where PostgreSQL emits `key` and `value`. Referencing `je.value` is
  //     the test — a wrong shape does not resolve. json_each_text rather than
  //     json_each because it maps a JSON null to a SQL NULL, so the claim is
  //     witnessed; json_each's `value` is a json datum and never NULL.
  //
  // LEFT and FULL only, and that is a coverage decision rather than an
  // oversight: the walk calls every unnest field nullable, so `g.q` (which
  // carries u.email) has a nullable claim that only a NULL-extended `u` can
  // witness. Under INNER and RIGHT the u side is always present and the claim
  // would go dark in every projection at once — an UNWITNESSABLE rule for a
  // structure that need not exist.
  const unnestPairItem = (): Ast => ({
    RangeFunction: {
      functions: [
        {
          List: {
            items: [
              funcCall("unnest", [
                arrayExpr([
                  rowCast(
                    // u.val, not t.name: the refilter wrappers pin the textC
                    // slot IS NOT NULL, so a textC drawn from the same column
                    // as textA would pin textA too and take both claims dark
                    // in one move (measured — 32 unwitnessed claims and two
                    // unobserved presence-group arms). Drawing textB and textC
                    // from `u` reproduces tuSlots exactly, which is what makes
                    // every projection's matchLiterals hold over this
                    // structure.
                    //
                    // The `::text` is for the schema axis: `enum-column`
                    // retypes u.val, and an enum is not implicitly coercible
                    // to gfn_pair's text field. It changes nothing the walk
                    // reads — the element type comes from the RowExpr's own
                    // cast — and it keeps the element-type branch measuring
                    // the same thing under all thirteen variants.
                    [castTo(colRef("u", "val"), "text"), colRef("u", "email")],
                    "gfn_pair",
                  ),
                ]),
              ]),
              {},
            ],
          },
        },
      ],
      alias: { aliasname: "g" },
    },
  });
  const unnestBuiltinItem = (): Ast => ({
    RangeFunction: {
      functions: [
        {
          List: {
            items: [
              funcCall("unnest", [
                funcCall("string_to_array", [textConst("z"), textConst(","), textConst("z")]),
              ]),
              {},
            ],
          },
        },
      ],
      alias: { aliasname: "w" },
    },
  });
  const jsonEachItem = (): Ast => ({
    RangeFunction: {
      functions: [
        {
          List: {
            items: [
              funcCall("json_each_text", [castTo(textConst('{"a": null}'), "json")]),
              {},
            ],
          },
        },
      ],
      alias: { aliasname: "je" },
    },
  });
  // The COLUMN spelling of the element type. An ARRAY constructor with no
  // cast to read from types itself from its MEMBERS, so the walk asks the
  // catalog for the member's rendered type — `resolveColumnTypeName`, which
  // measured cold everywhere else because the corpus's only composite-typed
  // expression was the composite-star projection's CAST. One member, so the
  // item is row-preserving like the others, and its value IS t.name, so the
  // nullable claim is witnessed by the same data that witnesses the slot.
  const unnestColumnItem = (): Ast => ({
    RangeFunction: {
      functions: [
        { List: { items: [funcCall("unnest", [arrayExpr([colRef("t", "name")])]), {}] } },
      ],
      alias: { aliasname: "n" },
    },
  });
  const unnestSlots: Slots = {
    ...tuSlots,
    // gfn_pair is (p text, q text) and the row cast is ROW(t.name, u.email),
    // so q carries the NOT NULL side and p the nullable one — the same values
    // tuSlots' textB and textC take, which is what keeps every projection's
    // matchLiterals correct over this structure.
    textB: colRef("g", "q"),
    textC: colRef("g", "p"),
  };
  for (const k of ["JOIN_LEFT", "JOIN_FULL"]) {
    out.push({
      key: `unnest(${kindLabel(k)})`,
      fromClause: [
        join(k, rangeVar("t"), rangeVar("u"), eq(colRef("u", "t_id"), colRef("t", "id"))),
        unnestPairItem(),
        unnestBuiltinItem(),
        unnestColumnItem(),
        jsonEachItem(),
      ],
      slots: unnestSlots,
      extras: [
        {
          expr: colRef("w", "w"),
          alias: "a_un",
          literal: textConst("un"),
          matchLiteral: nullConst(),
        },
        {
          expr: colRef("n", "n"),
          alias: "a_uc",
          literal: textConst("uc"),
          // sparse's matched row: t.name is NULL there, and this column IS
          // t.name routed through a one-element array.
          matchLiteral: nullConst(),
        },
        {
          expr: colRef("je", "value"),
          alias: "a_je",
          literal: textConst("je"),
          matchLiteral: nullConst(),
        },
      ],
      expectations: [expect("unnest element", "A_ArrayExpr"), expectJoins(k)],
    });
  }

  // The generated-columns structure: gm's text slots are GENERATED columns
  // (safe_label = COALESCE(b,'anon'), label = b||'!'), so every projection
  // and wrapper puts presumePresent-through-generation under the oracle —
  // safe_label and doubled discriminate their unit only because the
  // presumption reaches the generation expressions' sibling refs. sparse
  // matches t.1↔gm(a=1); the unmatched top-up's t.3 misses gm entirely,
  // witnessing the absent arm under outer kinds. INTERSECT is not crossed
  // (the projections' matchLiterals encode the t–u row); the report's
  // axis notes record the cap.
  const gmSlots: Slots = {
    intKey: colRef("t", "id"),
    boolCol: colRef("t", "active"),
    textA: colRef("t", "name"),
    textB: colRef("gm", "safe_label"),
    textC: colRef("gm", "label"),
  };
  for (const k of JOIN_KINDS) {
    out.push({
      key: `gm(${kindLabel(k)})`,
      fromClause: [
        join(k, rangeVar("t"), rangeVar("gm"), eq(colRef("gm", "a"), colRef("t", "id"))),
      ],
      slots: gmSlots,
      extras: [
        {
          expr: colRef("gm", "doubled"),
          alias: "a_dbl",
          literal: intConst(7),
          matchLiteral: intConst(2),
        },
      ],
      expectations: [expectJoins(k)],
    });
  }

  return out;
}

// --- Axis 3: projection and grouping ---------------------------------------
//
// Grouping is folded into this axis rather than crossed with it, because the
// two are not independent: a grouped query's target list must be built from
// group keys and aggregates. Every target carries an explicit alias so that
// wrappers and set operations have deterministic column names to reference.

interface BuiltProjection {
  targets: Ast[];
  groupBy?: Ast[];
  where?: Ast;
  /** Parameters the projection introduced, with valid control values. */
  params?: { number: number; valid: unknown }[];
  colNames: string[];
  /**
   * The set-operation branch: literals matching the targets in arity and type
   * but never in value, so UNION adds a row and EXCEPT subtracts nothing.
   */
  literals: Ast[];
  /**
   * The row this projection produces from `sparse`'s single matched join row
   * (t.name, u.val and v.amount are NULL there; u.email is 'u1@b.c'; t.id is
   * 1). INTERSECT uses these — set intersection with an arbitrary row is
   * empty, which would leave every INTERSECT query returning no rows anywhere
   * and its soundness check vacuously green. INTERSECT treats NULLs as not
   * distinct, so the NULL positions still match.
   */
  matchLiterals: Ast[];
}

interface Projection {
  key: string;
  build(s: JoinStructure): BuiltProjection;
  expectations: Expectation[];
}

const PROJECTIONS: Projection[] = [
  {
    // Every target under ONE name, required and optional interleaved — the
    // duplicate-name class the misattribution audit exposed, now generated:
    // wrappers must star-expand (the only legal re-export) and every
    // consumer must resolve positionally. Nullabilities alternate by
    // construction (t.id N, u.email optional-disc, t.name n, u.val member),
    // so a first-name-match regression flips a visible claim somewhere in
    // the cross-product.
    key: "dup-names",
    build: s => ({
      targets: [
        target(s.slots.intKey, "c"),
        target(s.slots.textB, "c"),
        target(s.slots.textA, "c"),
        target(s.slots.textC, "c"),
        ...s.extras.map(e => target(e.expr, "c")),
      ],
      colNames: ["c", "c", "c", "c", ...s.extras.map(() => "c")],
      literals: [intConst(1), textConst("a"), textConst("b"), textConst("c"),
        ...s.extras.map(e => e.literal)],
      matchLiterals: [intConst(1), textConst("u1@b.c"), nullConst(), nullConst(),
        ...s.extras.map(e => e.matchLiteral)],
    }),
    expectations: [],
  },
  {
    key: "plain",
    build: s => ({
      targets: [
        target(s.slots.intKey, "a_int"),
        target(s.slots.textA, "a_ta"),
        target(s.slots.textB, "a_tb"),
        target(s.slots.textC, "a_tc"),
        ...s.extras.map(e => target(e.expr, e.alias)),
      ],
      colNames: ["a_int", "a_ta", "a_tb", "a_tc", ...s.extras.map(e => e.alias)],
      literals: [intConst(1), textConst("a"), textConst("b"), textConst("c"),
        ...s.extras.map(e => e.literal)],
      matchLiterals: [intConst(1), nullConst(), textConst("u1@b.c"), nullConst(),
        ...s.extras.map(e => e.matchLiteral)],
    }),
    expectations: [],
  },
  {
    key: "coalesce",
    build: s => ({
      targets: [
        target(coalesce(s.slots.textA, textConst("za")), "a_ca"),
        target(coalesce(s.slots.textC, textConst("zc")), "a_cc"),
        target(s.slots.intKey, "a_int"),
      ],
      colNames: ["a_ca", "a_cc", "a_int"],
      literals: [textConst("a"), textConst("c"), intConst(1)],
      matchLiterals: [textConst("za"), textConst("zc"), intConst(1)],
    }),
    expectations: [expect("COALESCE", "CoalesceExpr")],
  },
  {
    key: "case-nullif",
    build: s => ({
      targets: [
        target(caseWhen(s.slots.boolCol, s.slots.textB, textConst("e")), "a_case"),
        target(nullif(s.slots.textB, textConst("z")), "a_nif"),
        target(s.slots.intKey, "a_int"),
      ],
      colNames: ["a_case", "a_nif", "a_int"],
      literals: [textConst("a"), textConst("b"), intConst(1)],
      matchLiterals: [textConst("u1@b.c"), textConst("u1@b.c"), intConst(1)],
    }),
    expectations: [expect("CASE", "CaseExpr"), expectNullif],
  },
  {
    key: "agg",
    build: s => ({
      targets: [
        target(countStar(), "a_cnt"),
        target(funcCall("max", [s.slots.textA]), "a_mxa"),
        target(funcCall("max", [s.slots.textB]), "a_mxb"),
      ],
      colNames: ["a_cnt", "a_mxa", "a_mxb"],
      literals: [intConst(1), textConst("a"), textConst("b")],
      matchLiterals: [intConst(1), nullConst(), textConst("u1@b.c")],
    }),
    expectations: [expectCountStar],
  },
  {
    key: "group",
    build: s => ({
      targets: [
        target(s.slots.intKey, "a_key"),
        target(countStar(), "a_cnt"),
        target(funcCall("max", [s.slots.textC]), "a_mxc"),
      ],
      groupBy: [s.slots.intKey],
      colNames: ["a_key", "a_cnt", "a_mxc"],
      literals: [intConst(1), intConst(2), textConst("c")],
      matchLiterals: [intConst(1), intConst(1), nullConst()],
    }),
    expectations: [expectGroupBy, expectCountStar],
  },
  {
    // Parameters in non-rejecting positions, so both stay nullable: $1 as a
    // COALESCE branch (deduced text by unification with textB — the
    // deduction-safe shape; a BARE $1 projected first would deduce its own
    // type and conflict with later uses, see param-mechanism.test.ts), and
    // $2 in the generator's first WHERE clause, comparison first because
    // deduction is first-use. The `intKey <> $2` disjunct is deliberately
    // near-vacuous under the control value: filtering is not its job,
    // putting a parameter under an OR over outer-join output is.
    key: "param-mix",
    build: s => ({
      targets: [
        target(coalesce(paramRef(1), s.slots.textB), "a_cp"),
        target(s.slots.textA, "a_ta"),
        target(s.slots.intKey, "a_int"),
      ],
      // The $2 disjunction doubles as WHERE-narrowing's built-in negative:
      // OR must not narrow, and a_cp's witnesses depend on the all-NULL pass
      // returning rows — which is also why the narrowing conjunct lives on
      // param-reject, not here.
      where: orExpr(neq(s.slots.intKey, paramRef(2)), isNull(paramRef(2))),
      params: [
        { number: 1, valid: "px" },
        { number: 2, valid: 999 },
      ],
      colNames: ["a_cp", "a_ta", "a_int"],
      literals: [textConst("a"), textConst("b"), intConst(1)],
      matchLiterals: [textConst("px"), nullConst(), intConst(1)],
    }),
    expectations: [expect("COALESCE", "CoalesceExpr"), expectParams(1, 2)],
  },
  {
    // One rejecting position (the mechanism-A cast: $1 is TYPED nn_text, so
    // NULL raises at Bind in every data state) alongside a non-rejecting
    // one — the engine must claim notNull and nullable respectively, and
    // the suite verifies both against PostgreSQL with no annotations.
    key: "param-reject",
    build: s => ({
      targets: [
        target(castTo(paramRef(1), "nn_text"), "a_pd"),
        // Mechanism-A narrowing under the whole structural space: the cast
        // types $1 as nn_text, so this bare use in a strict concatenation is
        // claimed notNull — any returned row proves $1 was non-NULL. A wrong
        // narrowing would surface as a nullability violation here.
        target(concatOp(paramRef(1), textConst("n")), "a_pn"),
        target(coalesce(paramRef(2), s.slots.textC, textConst("z")), "a_c2"),
        // Mechanism C under the whole structural space: $2's VALUE flows
        // through the strict concatenation into a runtime nn_text coercion,
        // so $2 is claimed notNull (execution-time — witnessed wherever rows
        // reach the evaluation, never narrowing).
        target(castTo(concatOp(paramRef(2), textConst("f")), "nn_text"), "a_pf"),
        // WHERE-conjunct narrowing under the whole structural space: the
        // `$3 = 'p3x'` conjunct is only TRUE with $3 non-null, so this bare
        // projection is claimed notNull — while $3's ARGUMENT contract stays
        // nullable (a NULL binding legally returns zero rows). The conjunct
        // compares the parameter alone, so under valid bindings it filters
        // nothing and no witness depends on it. (Bare $3 deduces text.)
        target(paramRef(3), "a_p3"),
        target(s.slots.intKey, "a_int"),
      ],
      where: eq(paramRef(3), textConst("p3x")),
      params: [
        { number: 1, valid: "pd" },
        { number: 2, valid: "pc" },
        { number: 3, valid: "p3x" },
      ],
      colNames: ["a_pd", "a_pn", "a_c2", "a_pf", "a_p3", "a_int"],
      literals: [
        textConst("d"),
        textConst("dn"),
        textConst("c"),
        textConst("df"),
        textConst("e3"),
        intConst(1),
      ],
      matchLiterals: [
        textConst("pd"),
        textConst("pdn"),
        textConst("pc"),
        textConst("pcf"),
        textConst("p3x"),
        intConst(1),
      ],
    }),
    expectations: [expectParams(1, 2, 3), expect("COALESCE", "CoalesceExpr")],
  },
  {
    // Window functions across the structural space: the walk's window
    // dispatch (never-null ranking set, count's empty-frame zero, the
    // conservative fallback) has never faced the execution oracle. a_rn and
    // a_wc are notNull claims falsified by any NULL PostgreSQL returns;
    // a_wm is nullable, witnessed wherever the partition's t.name is NULL
    // (sparse's matched row) or t is null-extended.
    key: "window",
    build: s => ({
      targets: [
        target(winCall("row_number", [], overClause()), "a_rn"),
        target(winCountStar(overPartition(s.slots.intKey)), "a_wc"),
        target(winCall("max", [s.slots.textA], overPartition(s.slots.intKey)), "a_wm"),
        // The default-frame rule under the whole structural space: min over
        // the never-empty default frame inherits textB's nullability, which
        // the join axis varies — notNull where the fixpoint proves textB's
        // side present, nullable where it null-extends. Partitioned BY the
        // aggregated column so the claim is witness-aligned by construction:
        // the NULL partition's min is NULL exactly when a textB NULL exists
        // (an unpartitioned min would swallow it behind any non-null email
        // elsewhere in the result).
        target(winCall("min", [s.slots.textB], overPartition(s.slots.textB)), "a_wmin"),
        target(s.slots.intKey, "a_int"),
      ],
      colNames: ["a_rn", "a_wc", "a_wm", "a_wmin", "a_int"],
      literals: [intConst(9), intConst(9), textConst("wm"), textConst("wn"), intConst(9)],
      matchLiterals: [intConst(1), intConst(1), nullConst(), textConst("u1@b.c"), intConst(1)],
    }),
    expectations: [
      expectWindow("row_number"),
      expectWindow("count"),
      expectWindow("max"),
      expectWindow("min"),
    ],
  },
  {
    // The offset and bucketing window functions: lag of a NOT NULL column is
    // still NULL on each partition's first row (nullable, witnessed at
    // one-row volume — sparse's single row IS a first row), while ntile
    // with a non-null bucket count assigns every row a bucket (notNull,
    // falsifiable wherever rows return).
    key: "window-lag",
    build: s => ({
      targets: [
        target(winCall("lag", [s.slots.textB], overOrder(s.slots.intKey)), "a_lg"),
        target(winCall("ntile", [intConst(2)], overOrder(s.slots.intKey)), "a_nt"),
        target(s.slots.textB, "a_tb"),
        target(s.slots.intKey, "a_int"),
      ],
      colNames: ["a_lg", "a_nt", "a_tb", "a_int"],
      literals: [textConst("lg"), intConst(9), textConst("b"), intConst(9)],
      matchLiterals: [nullConst(), intConst(1), textConst("u1@b.c"), intConst(1)],
    }),
    expectations: [expectWindow("lag"), expectWindow("ntile")],
  },
  {
    // The COMPOSITE-STAR axis. `expandCompositeStar` is a walk branch with
    // history — sweep-2 finding 13 was its alias-versus-column precedence,
    // where the parentheses in `(x).*` force the VALUE reading and the engine
    // expanded a range-table alias of the same name instead, at the same
    // arity — and it had no generated coverage at all.
    //
    // A star target expands to N columns, which the projection model can carry
    // because N is statically known: it is the composite's field count. So the
    // colNames, literals and matchLiterals below are written for the EXPANDED
    // list, `p` and `q`, not for the star.
    //
    // Both fields are forced nullable by the expansion rule whatever the
    // arguments, so both claims are conservative — and both are witnessed by
    // ordinary data, since the two text slots are nullable to begin with.
    key: "composite-star",
    build: s => ({
      targets: [
        target(compositeStar(rowCast([s.slots.textA, s.slots.textC], "gfn_pair"))),
        target(s.slots.intKey, "a_int"),
      ],
      colNames: ["p", "q", "a_int"],
      literals: [textConst("cp"), textConst("cq"), intConst(61)],
      // sparse's matched row: t.name and u.val are both NULL there.
      matchLiterals: [nullConst(), nullConst(), intConst(1)],
    }),
    expectations: [expect("composite star", "A_Star")],
  },
  {
    // The FUNCTION-CALL axis. The generator called exactly ONE function —
    // `max` — while the fixture schema defined 66, so an entire family of
    // catalog features had no call site: a VARIADIC parameter, a DEFAULTED
    // argument, an INOUT parameter, a SECURITY DEFINER body, and — the one
    // that matters most — a `LANGUAGE sql` body being READ BACK, which
    // docs/generated-surface.md measured at zero generated coverage.
    //
    // Every claim here is witness-aligned by construction, because the suite
    // requires it: gfn_var nullifs its empty join so an all-NULL argument
    // list comes back NULL rather than ''; gfn_sd and double_val are
    // pass-throughs, so they inherit the slot's nullability and the join axis
    // witnesses both directions; gfn_io wraps `upper`, which left
    // STRICT_TOTAL_BUILTINS over the empty-range finding and is therefore
    // nullable whatever its argument.
    //
    // gfn_def is called with ONE argument against a two-parameter
    // declaration — the lower bound of resolveFunctionCandidates' arity
    // window (`argCount >= required`), which every other candidate in this
    // schema leaves untested because required always equals inputs.
    key: "fn-call",
    build: s => ({
      targets: [
        target(funcCall("gfn_def", [s.slots.intKey]), "a_fd"),
        // textB rather than textC: the schema axis's `enum-column` variant
        // retypes textC, and an enum is not implicitly coercible to `text`,
        // so a call taking it would not resolve there. The slot a
        // function-call axis reads has to stay text-compatible across every
        // variant — measured, when that variant rejected 128 queries.
        target(funcCall("gfn_var", [s.slots.textA, s.slots.textB]), "a_fv"),
        target(funcCall("gfn_io", [s.slots.textB]), "a_fi"),
        target(funcCall("gfn_sd", [s.slots.textA]), "a_fs"),
        target(funcCall("double_val", [s.slots.intKey]), "a_fb"),
        // The STRICT family — `docs/generated-surface.md` item 5, step 3.
        // Every function the generator called was non-strict, and five of the
        // seven rank-1 unsoundnesses found on 2026-08-07 were strict ones: a
        // strict call handed a NULL does not run, so it returns NULL past its
        // body, past its declared NOT NULL domain, and past the whole column
        // list of a FROM-position return.
        //
        // No new DDL was needed, which is the one place the item's own
        // estimate was wrong: `fixtures/schema.sql` already declares the
        // strict vocabulary, and what it had no call site for was the
        // GENERATOR. Both members here are the mechanism at its sharpest.
        //
        // dom_strict returns nn_text — a NOT NULL DOMAIN — and is STRICT, so
        // `dom_strict(NULL)` is NULL and the domain is enforced on a value the
        // call never produces. Reading the declared return type would claim
        // notNull; t.name's NULLs falsify that on real rows.
        //
        // def_strict declares `b integer DEFAULT NULL` and the call supplies
        // one argument, so the two mechanisms meet: PostgreSQL SUBSTITUTES the
        // default, strictness then sees a NULL argument, and the body (`SELECT
        // a`, a non-null value) never runs. It is NULL for every input there
        // is, which makes the claim witnessed under every state.
        target(funcCall("dom_strict", [s.slots.textA]), "a_fst"),
        target(funcCall("def_strict", [s.slots.intKey]), "a_fdn"),
      ],
      colNames: ["a_fd", "a_fv", "a_fi", "a_fs", "a_fb", "a_fst", "a_fdn"],
      literals: [
        intConst(31), textConst("fv"), textConst("fi"), textConst("fs"), intConst(32),
        textConst("fst"), intConst(33),
      ],
      // sparse's matched t–u row: t.id 1, t.name NULL, u.val NULL,
      // u.email 'u1@b.c'. Measured against PGlite rather than reasoned.
      // t.name is NULL there, so the strict dom_strict short-circuits; the
      // strict def_strict is NULL whatever the row.
      matchLiterals: [
        intConst(8), textConst("u1@b.c"), textConst("U1@B.C"), nullConst(), intConst(1),
        nullConst(), nullConst(),
      ],
    }),
    expectations: [expect("gfn_def", "FuncCall")],
  },
  {
    // The aggregate and window halves of the same axis, grouped so the window
    // call can read a grouped column.
    //
    // gfn_noinit has NO INITCOND, which is the branch `aggInitVal` gates and
    // which the schema's other three user aggregates (all INITCOND '0')
    // cannot reach: with no initial state there is nothing to return over
    // zero rows, so it is NULL under `empty` and non-NULL wherever a group
    // exists. gfn_win is a USER window function — `CREATE FUNCTION … WINDOW`
    // is documented C-only and PostgreSQL runs a LANGUAGE sql one anyway
    // (measured) — and it is deliberately absent from NEVER_NULL_WINDOW_SIGNATURES,
    // so the walk must fall through to conservative and the fall-through is
    // witnessed wherever t.name is NULL.
    key: "fn-agg-window",
    build: s => ({
      targets: [
        target(s.slots.intKey, "a_key"),
        target(funcCall("gfn_noinit", [s.slots.textB]), "a_fa"),
        // The window call reads an AGGREGATE rather than a grouped column, so
        // the projection groups by the key alone. Grouping by textA as well
        // would work, but it makes the aggregate's own argument constant
        // within its group and the claim degenerate.
        target(
          winCall("gfn_win", [funcCall("max", [s.slots.textA])], overOrder(s.slots.intKey)),
          "a_fw",
        ),
      ],
      groupBy: [s.slots.intKey],
      colNames: ["a_key", "a_fa", "a_fw"],
      literals: [intConst(41), textConst("fa"), textConst("fw")],
      matchLiterals: [intConst(1), textConst("u1@b.c"), nullConst()],
    }),
    expectations: [expectGroupBy, expectWindow("gfn_win")],
  },
  {
    // The USER-OPERATOR axis. `docs/generated-surface.md` item 5 measured
    // `resolveOperatorMetadata` cold across the whole generated corpus and all
    // thirteen schema variants: the fixture schema declares four custom
    // operators and the generator wrote only bare builtin symbols, every one
    // of which the curated `TOTAL_OPERATORS`/`STRICT_OPERATORS` sets answer
    // for without asking the catalog anything.
    //
    // Both directions of the trust boundary, in one projection, because they
    // are one branch taking opposite exits — and because a schema axis cannot
    // reach either: an operator can be DECLARED and never APPLIED.
    //
    //   === is backed by the NON-strict lenient_eq, whose body is `SELECT
    //     true`. The walk dispatches the backing function through the FuncCall
    //     rules and reads that body, so the result is notNull however NULL its
    //     operands — the claim PostgreSQL agrees with, and the one a blanket
    //     "operators are strict" reading would get backwards.
    //   ==== is backed by the STRICT strict_same (`SELECT a = b`), so it is
    //     NULL whenever either operand is, and t.name is NULL across the
    //     sparse and generated states.
    //
    // textA and textB, never textC: `enum-column` retypes the textC slot and
    // an enum is not implicitly coercible to the operators' text arguments —
    // the same constraint the fn-call projection records, measured there at
    // 128 rejections.
    key: "op-custom",
    build: s => ({
      targets: [
        target(opExpr("===", s.slots.textA, s.slots.textB), "a_ol"),
        target(opExpr("====", s.slots.textA, s.slots.textB), "a_os"),
        target(s.slots.intKey, "a_int"),
      ],
      colNames: ["a_ol", "a_os", "a_int"],
      literals: [boolConst(true), boolConst(false), intConst(71)],
      // sparse's matched t–u row: t.name is NULL there, so lenient_eq still
      // returns true and strict_same returns NULL.
      matchLiterals: [boolConst(true), nullConst(), intConst(1)],
    }),
    expectations: [expectOperator("==="), expectOperator("====")],
  },
  {
    // The CHECK-ENTAILMENT axis, and the one place items 4 and 5 COMPOSE.
    //
    // `resolveLiteralDistinctnessSound` was the last capability the generated
    // corpus could not reach, and it sits two levels down: the kernel asks it
    // only from `litsDistinct`, which runs only when a TRUE fact `col = 'a'`
    // meets a constraint atom `col = 'b'` on the same column. So it needs BOTH
    // halves — a literal comparison in the query (this projection) and a CHECK
    // constraint carrying one (the `check-entail` schema variant).
    //
    // That is why the corpus already ENTERED the kernel and learned nothing:
    // `resolveCheckConstraintsTree` is warm over the base schema and comes
    // back empty, because t/u/v carry no CHECK. A question asked of an empty
    // answer never reaches the questions behind it.
    //
    // `t.val` and `t.name` are named directly rather than through slots. Every
    // structure in the axis contains `t` — that is the generator's schema
    // contract — and the pair has to be two columns of ONE table for a CHECK
    // to relate them at all, which no combination of slots can guarantee.
    //
    // 'x' is the sparse state's `t.1` value, so the WHERE selects the row every
    // projection's matchLiterals are written against, and t.1's NULL name
    // witnesses the base schema's nullable claim. Under `check-entail` the
    // constraint promotes it and PostgreSQL is asked to agree.
    key: "check-lit",
    build: s => ({
      targets: [
        target(colRef("t", "name"), "a_ckn"),
        target(s.slots.intKey, "a_int"),
      ],
      where: eq(colRef("t", "val"), textConst("x")),
      colNames: ["a_ckn", "a_int"],
      literals: [textConst("cn"), intConst(72)],
      matchLiterals: [nullConst(), intConst(1)],
    }),
    expectations: [],
  },
  {
    key: "group-coalesce",
    build: s => ({
      targets: [
        target(s.slots.intKey, "a_key"),
        target(coalesce(funcCall("max", [s.slots.textC]), textConst("zm")), "a_cmx"),
      ],
      groupBy: [s.slots.intKey],
      colNames: ["a_key", "a_cmx"],
      literals: [intConst(1), textConst("c")],
      matchLiterals: [intConst(1), textConst("zm")],
    }),
    expectations: [expectGroupBy, expect("COALESCE", "CoalesceExpr")],
  },
];

// --- Axis 4: set operation -------------------------------------------------
//
// The second branch is a SELECT of literals matching the first branch's
// column types, so validity never depends on which structure or projection
// the tuple chose.

interface SetOp {
  key: string;
  op: string | null;
  all: boolean;
}

const SET_OPS: SetOp[] = [
  { key: "none", op: null, all: false },
  { key: "union", op: "SETOP_UNION", all: false },
  { key: "union-all", op: "SETOP_UNION", all: true },
  // The second branch is the same projection over the structure's all-FULL
  // variant — real groups on BOTH sides, so UNION group agreement and the
  // pairwise member intersection run under generation instead of only in
  // fixtures. UNION ALL keeps every branch's rows for arm witnessing.
  { key: "union-full-var", op: "SETOP_UNION", all: true },
  { key: "intersect", op: "SETOP_INTERSECT", all: false },
  { key: "except", op: "SETOP_EXCEPT", all: false },
];

// --- Axis 5: wrapper -------------------------------------------------------

type WrapperKey = "none" | "cte" | "subquery" | "cte-refilter" | "subquery-refilter";
const WRAPPERS: WrapperKey[] = ["none", "cte", "subquery", "cte-refilter", "subquery-refilter"];

/**
 * The refilter wrappers pin `a_tc` — the projection of the optional side's
 * NULLABLE column (u.val / lsub.lval) — with an outer IS NOT NULL. One
 * predicate exercises three closures at once: promotion of the pinned
 * column, the lifted dead rule (the optional unit's group must not survive
 * the refilter), and presence consumption (the pinned column proves the
 * base row present, upgrading its catalog-NOT NULL sibling `a_tb` with no
 * CHECK involved). Crossed only with tuples whose colNames carry `a_tc` —
 * the enumeration gates the rest; the report's axis notes record the cap.
 *
 * Duplicate-named columns can only be re-exported by star — an explicit
 * reference to one is ambiguous and PostgreSQL rejects it — so wrappers
 * star-expand whenever colNames collide, which is also the shape the
 * positional-resolution fix exists for.
 */
function wrap(wrapper: WrapperKey, core: Ast, colNames: string[]): Ast {
  if (wrapper === "none") return { SelectStmt: core };
  const refilter = wrapper === "cte-refilter" || wrapper === "subquery-refilter";
  const outerAlias = wrapper.startsWith("cte") ? "q" : "s";
  const dupNames = new Set(colNames).size !== colNames.length;
  const outerTargets = dupNames
    ? [target({ ColumnRef: { fields: [{ String: { sval: outerAlias } }, { A_Star: {} }] } })]
    : colNames.map(n => target(colRef(outerAlias, n)));
  const outerWhere = refilter ? { whereClause: isNotNull(colRef(outerAlias, "a_tc")) } : {};
  if (outerAlias === "q") {
    return {
      SelectStmt: bareSelect({
        withClause: {
          ctes: [
            {
              CommonTableExpr: {
                ctename: "q",
                ctematerialized: "CTEMaterializeDefault",
                ctequery: { SelectStmt: core },
              },
            },
          ],
          recursive: false,
        },
        targetList: outerTargets,
        fromClause: [rangeVar("q")],
        ...outerWhere,
      }),
    };
  }
  return {
    SelectStmt: bareSelect({
      targetList: outerTargets,
      fromClause: [
        { RangeSubselect: { subquery: { SelectStmt: core }, alias: { aliasname: "s" } } },
      ],
      ...outerWhere,
    }),
  };
}

const expectPlainSubquery: Expectation = {
  label: "subquery in FROM",
  present: root => {
    for (const n of walk(root)) {
      const sub = (n as { RangeSubselect?: { lateral?: boolean } }).RangeSubselect;
      if (sub && sub.lateral !== true) return true;
    }
    return false;
  },
};

const WRAPPER_EXPECTATIONS: Record<WrapperKey, Expectation[]> = {
  none: [],
  cte: [expect("CTE", "CommonTableExpr")],
  "cte-refilter": [expect("CTE", "CommonTableExpr"), expect("refilter IS NOT NULL", "NullTest")],
  "subquery-refilter": [expectPlainSubquery, expect("refilter IS NOT NULL", "NullTest")],
  subquery: [expectPlainSubquery],
};

// --- The enumeration -------------------------------------------------------

// --- Generated DML ---------------------------------------------------------
//
// Step 4 of docs/argument-nullability.md. Four kinds, each pure-rollback
// (the suite wraps every execution in BEGIN/ROLLBACK via `writes`):
//
//   insert-values  — INSERT ... VALUES ($1, $2, ...) RETURNING: parameters
//                    as written values through both rejection channels, and
//                    RETURNING nullability from the target catalog.
//   update-from    — UPDATE v SET ... FROM <t⋈u structure>: the join axis
//                    inside DML scope semantics (target REQUIRED, FROM
//                    inner-joined to it, outer joins within intact).
//   insert-select  — INSERT ... SELECT over EVERY join structure: source
//                    rows shaped by outer joins flow into the target, and
//                    the parameter rejects positionally (mechanism B).
//   dml-cte        — WITH ins AS (INSERT ... RETURNING) SELECT ... FROM
//                    ins ⟨k⟩ u: DML output recombined with the join axis,
//                    which is exactly the "combinations nobody writes by
//                    hand" this generator exists for.
//
// t and v carry no unique or foreign-key constraints, so explicit ids (800+)
// can never collide with a data state, and every write is rolled back anyway.

export function generateDmlQueries(): GeneratedQuery[] {
  const out: GeneratedQuery[] = [];
  const dml = (
    kind: string,
    structure: string,
    projection: string,
    ast: Ast,
    params: GeneratedQuery["params"],
    expectations: Expectation[],
  ): void => {
    const axes: AxisTuple = { structure, projection, setop: "none", wrapper: kind };
    out.push({
      id: `s=${structure}|p=${projection}|o=none|w=${kind}`,
      axes,
      ast,
      params,
      writes: true,
      expectations,
    });
  };

  // --- insert-values: three RETURNING shapes over one write. ---------------
  const insertReturning: [key: string, targets: Ast[]][] = [
    ["plain", [target(colRef("id"), "r_id"), target(colRef("name"), "r_nm")]],
    [
      "coalesce",
      [target(colRef("id"), "r_id"), target(coalesce(colRef("name"), textConst("z")), "r_cn")],
    ],
    [
      "case",
      [
        target(colRef("id"), "r_id"),
        target(caseWhen(colRef("active"), textConst("a"), colRef("name")), "r_ce"),
      ],
    ],
  ];
  for (const [key, targets] of insertReturning) {
    dml(
      "insert-values",
      "values",
      key,
      {
        InsertStmt: {
          relation: relation("t"),
          cols: insertCols("id", "name", "active"),
          selectStmt: {
            SelectStmt: bareSelect({
              valuesLists: [valuesRow(paramRef(1), paramRef(2), boolConst(true))],
            }),
          },
          returningClause: { exprs: targets },
          override: "OVERRIDING_NOT_SET",
        },
      },
      [
        { number: 1, valid: 810 },
        { number: 2, valid: "nm" },
      ],
      [expect("INSERT", "InsertStmt"), expectReturning, expectParams(1, 2)],
    );
  }

  // --- update-from: the single-join structures against target v. -----------
  for (const k of JOIN_KINDS) {
    const updateReturning: [key: string, targets: Ast[]][] = [
      [
        "plain",
        [
          target(colRef("v", "id"), "r_vid"),
          target(colRef("v", "amount"), "r_amt"),
          target(colRef("t", "name"), "r_tn"),
          target(colRef("u", "email"), "r_ue"),
        ],
      ],
      [
        "coalesce",
        [
          target(colRef("v", "id"), "r_vid"),
          target(coalesce(colRef("u", "email"), textConst("z")), "r_ce"),
          target(coalesce(colRef("t", "name"), textConst("z")), "r_cn"),
        ],
      ],
    ];
    for (const [key, targets] of updateReturning) {
      dml(
        "update-from",
        `single(${kindLabel(k)})`,
        key,
        {
          UpdateStmt: {
            relation: relation("v"),
            targetList: [
              setItem("amount", paramRef(1)),
              setItem("u_id", paramRef(2)),
            ],
            fromClause: [tJoinU(k)],
            whereClause: eq(colRef("v", "u_id"), colRef("u", "id")),
            returningClause: { exprs: targets },
          },
        },
        [
          { number: 1, valid: 2.5 },
          { number: 2, valid: 1 },
        ],
        [expect("UPDATE", "UpdateStmt"), expectReturning, expectJoins(k), expectParams(1, 2)],
      );
    }
  }

  // --- delete-using: update-from's mirror, minus assignment channels. ------
  // DELETE has no SET, so its parameter rides a WHERE disjunct: the contract
  // is nullable (comparison position, NULL legal via the IS NULL arm). The
  // projected `$1 + 1` is a live GUARD on the DML WHERE channel's OR
  // handling, not a beacon: the disjunction proves nothing (intersection —
  // the IS NULL arm proves nothing), so the claim stays nullable and is
  // witnessed by the NULL binding's deleted rows. An implementation that
  // wrongly narrowed through OR would claim notNull here and be falsified
  // immediately by that same run. (An earlier version of this comment
  // predicted the claim would FLIP when the channel landed — wrong, for
  // exactly the intersection reason above; the channel landed and it holds.)
  for (const k of JOIN_KINDS) {
    const deleteReturning: [key: string, targets: Ast[]][] = [
      [
        "plain",
        [
          target(colRef("v", "id"), "r_vid"),
          target(colRef("v", "amount"), "r_amt"),
          target(colRef("t", "name"), "r_tn"),
          target(colRef("u", "email"), "r_ue"),
          target(plus(paramRef(1), intConst(1)), "r_p1"),
        ],
      ],
      [
        "coalesce",
        [
          target(colRef("v", "id"), "r_vid"),
          target(coalesce(colRef("u", "email"), textConst("z")), "r_ce"),
          target(coalesce(colRef("t", "name"), textConst("z")), "r_cn"),
          target(plus(paramRef(1), intConst(1)), "r_p1"),
        ],
      ],
    ];
    for (const [key, targets] of deleteReturning) {
      dml(
        "delete-using",
        `single(${kindLabel(k)})`,
        key,
        {
          DeleteStmt: {
            relation: relation("v"),
            usingClause: [tJoinU(k)],
            whereClause: andExpr(
              eq(colRef("v", "u_id"), colRef("u", "id")),
              orExpr(neq(colRef("v", "id"), paramRef(1)), isNull(paramRef(1))),
            ),
            returningClause: { exprs: targets },
          },
        },
        [{ number: 1, valid: 999 }],
        [
          expect("DELETE", "DeleteStmt"),
          expectReturning,
          expectJoins(k),
          expectParams(1),
        ],
      );
    }
  }

  // --- ONLY: the non-tree write-rewrite accessor. --------------------------
  //
  // `targetWriteRewrites` reads the target RangeVar's `inh` and takes
  // `resolveWriteRewritesTree` when it is set — which it was for every DML
  // statement the generator wrote, so the non-tree half measured cold across
  // the whole corpus (`docs/generated-surface.md` item 5). The distinction is
  // real work, not a spelling: a BEFORE ROW trigger on a CHILD fires on a
  // write that names the parent, and `ONLY` is what excludes it.
  //
  // `t` carries no children under the base schema, so these are `single`'s
  // rows through a different accessor; under `inherit-child` they are the
  // discriminating pair. RETURNING projects the same two columns as the
  // insert-values shapes so the claims are comparable: `id` is NOT NULL and
  // `name` is nullable and witnessed by the seeded NULL names.
  dml(
    "update-only",
    "only(t)",
    "plain",
    {
      UpdateStmt: {
        relation: onlyRelation("t"),
        targetList: [setItem("name", paramRef(1))],
        whereClause: eq(colRef("id"), paramRef(2)),
        returningClause: {
          exprs: [target(colRef("id"), "r_id"), target(colRef("name"), "r_nm")],
        },
      },
    },
    [
      { number: 1, valid: "nm" },
      { number: 2, valid: 1 },
    ],
    [expect("UPDATE", "UpdateStmt"), expectReturning, expectOnly("t"), expectParams(1, 2)],
  );
  dml(
    "delete-only",
    "only(t)",
    "plain",
    {
      DeleteStmt: {
        relation: onlyRelation("t"),
        // The disjunct keeps the parameter in comparison position with NULL
        // legal, which is delete-using's contract shape — and it keeps the
        // statement from depending on a particular id existing.
        whereClause: orExpr(neq(colRef("id"), paramRef(1)), isNull(paramRef(1))),
        returningClause: {
          exprs: [target(colRef("id"), "r_id"), target(colRef("name"), "r_nm")],
        },
      },
    },
    [{ number: 1, valid: 999 }],
    [expect("DELETE", "DeleteStmt"), expectReturning, expectOnly("t"), expectParams(1)],
  );

  // --- insert-select: every join structure as the source. -------------------
  for (const structure of joinStructures()) {
    dml(
      "insert-select",
      structure.key,
      "plain",
      {
        InsertStmt: {
          relation: relation("t"),
          cols: insertCols("id", "name", "val", "active"),
          selectStmt: {
            SelectStmt: bareSelect({
              targetList: [
                target(paramRef(1)),
                target(structure.slots.textA),
                target(structure.slots.textC),
                target(boolConst(true)),
              ],
              fromClause: structure.fromClause,
            }),
          },
          returningClause: {
            exprs: [
              target(colRef("id"), "r_id"),
              target(colRef("name"), "r_nm"),
              target(colRef("val"), "r_val"),
            ],
          },
          override: "OVERRIDING_NOT_SET",
        },
      },
      [{ number: 1, valid: 820 }],
      [
        expect("INSERT", "InsertStmt"),
        expectReturning,
        ...structure.expectations,
        expectParams(1),
      ],
    );
  }

  // --- ON CONFLICT: the conditional rejection sites, executed both ways. ---
  // Control key 1 conflicts under sparse/unmatched (ck.1 is seeded there) and
  // inserts cleanly under empty, so the DO UPDATE arm runs in some states and
  // not others — which is the whole point: its rejection sites only fire
  // with the arm.
  //
  // oc-update: $3 → ck.val is CONDITIONAL mechanism B — witnessed only where
  // the arm fires, silent on the insert path. oc-update-domain: $2 → ck.tag
  // is mechanism A THROUGH the arm — the parameter is TYPED nn_text at parse
  // time, so NULL raises at Bind in every state, insert path or not, and the
  // narrowing applies to its projection. oc-nothing: a conflict returns NO
  // row, a liveness shape nothing else produces.
  dml(
    "oc-update",
    "conflict",
    "plain",
    {
      InsertStmt: {
        relation: relation("ck"),
        cols: insertCols("id", "name"),
        selectStmt: {
          SelectStmt: bareSelect({
            valuesLists: [valuesRow(paramRef(1), paramRef(2))],
          }),
        },
        onConflictClause: onConflictUpdate(
          "id",
          setItem("val", paramRef(3)),
          setItem("name", colRef("excluded", "name")),
        ),
        returningClause: {
          exprs: [
            target(colRef("id"), "r_id"),
            target(colRef("name"), "r_nm"),
            target(colRef("val"), "r_val"),
          ],
        },
        override: "OVERRIDING_NOT_SET",
      },
    },
    [
      { number: 1, valid: 1 },
      { number: 2, valid: "nm" },
      { number: 3, valid: "cv" },
    ],
    [
      expect("INSERT", "InsertStmt"),
      expectOnConflict("ONCONFLICT_UPDATE"),
      expectReturning,
      expectParams(1, 2, 3),
    ],
  );
  dml(
    "oc-update-domain",
    "conflict",
    "domain",
    {
      InsertStmt: {
        relation: relation("ck"),
        cols: insertCols("id", "name"),
        selectStmt: {
          SelectStmt: bareSelect({
            valuesLists: [valuesRow(paramRef(1), textConst("n"))],
          }),
        },
        onConflictClause: onConflictUpdate("id", setItem("tag", paramRef(2))),
        returningClause: {
          exprs: [
            target(colRef("id"), "r_id"),
            target(concatOp(paramRef(2), textConst("!")), "r_echo"),
          ],
        },
        override: "OVERRIDING_NOT_SET",
      },
    },
    [
      { number: 1, valid: 1 },
      { number: 2, valid: "tg" },
    ],
    [
      expect("INSERT", "InsertStmt"),
      expectOnConflict("ONCONFLICT_UPDATE"),
      expectReturning,
      expectParams(1, 2),
    ],
  );
  dml(
    "oc-nothing",
    "conflict",
    "nothing",
    {
      InsertStmt: {
        relation: relation("ck"),
        cols: insertCols("id", "name"),
        selectStmt: {
          SelectStmt: bareSelect({
            valuesLists: [valuesRow(paramRef(1), paramRef(2))],
          }),
        },
        onConflictClause: onConflictNothing("id"),
        returningClause: {
          exprs: [target(colRef("id"), "r_id"), target(colRef("name"), "r_nm")],
        },
        override: "OVERRIDING_NOT_SET",
      },
    },
    [
      { number: 1, valid: 1 },
      { number: 2, valid: "nm" },
    ],
    [
      expect("INSERT", "InsertStmt"),
      expectOnConflict("ONCONFLICT_NOTHING"),
      expectReturning,
      expectParams(1, 2),
    ],
  );

  // --- merge: the arm combinations over the conflict-key table. -------------
  // Sources draw sids from t (never NULL: t.id is NOT NULL and only inner
  // joins appear inside), so the INSERT arm's PK is safe. Parameters in
  // SOURCES are attributed through the derived-table column map
  // (merge-src-param below). Under sparse, sid 1 exercises
  // the MATCHED arms against the seeded ck.1; under unmatched, ck.55
  // exercises NOT MATCHED BY SOURCE, which is the only way s.* columns are
  // ever witnessed NULL.
  {
    // Both sources GROUP BY the sid: MERGE refuses a source that acts on the
    // same target row twice ("cannot affect row a second time"), and
    // duplicates are real — t.1 has two u partners in the unmatched state,
    // and fuzzed states can duplicate t.id itself (t has no unique
    // constraint). Grouping is the data-independent guarantee, and puts an
    // aggregate inside a MERGE source while it is at it.
    const srcPlain = bareSelect({
      targetList: [
        target(colRef("t", "id"), "sid"),
        target(funcCall("max", [colRef("t", "name")]), "snm"),
      ],
      fromClause: [rangeVar("t")],
      groupClause: [colRef("t", "id")],
    });
    const srcJoin = bareSelect({
      targetList: [
        target(colRef("t", "id"), "sid"),
        target(funcCall("max", [colRef("u", "val")]), "snm"),
      ],
      fromClause: [tJoinU("inner")],
      groupClause: [colRef("t", "id")],
    });
    const RET = {
      exprs: [
        target(mergeAction(), "act"),
        target(colRef("ck", "id"), "r_id"),
        target(colRef("ck", "name"), "r_nm"),
        target(colRef("ck", "val"), "r_val"),
        target(colRef("s", "sid"), "r_sid"),
        target(colRef("s", "snm"), "r_snm"),
      ],
    };
    const UPD = mergeWhen("MERGE_WHEN_MATCHED", "CMD_UPDATE", {
      targetList: [setItem("val", paramRef(1))],
    });
    const INS = (nameParam: number): Ast =>
      mergeWhen("MERGE_WHEN_NOT_MATCHED_BY_TARGET", "CMD_INSERT", {
        targetList: insertCols("id", "name"),
        values: [colRef("s", "sid"), paramRef(nameParam)],
      });
    const BYSRC = mergeWhen("MERGE_WHEN_NOT_MATCHED_BY_SOURCE", "CMD_UPDATE", {
      targetList: [setItem("name", textConst("orph"))],
    });
    const DELC = mergeWhen("MERGE_WHEN_MATCHED", "CMD_DELETE", {
      condition: isNotNull(colRef("ck", "name")),
    });
    const NOTHING = mergeWhen("MERGE_WHEN_MATCHED", "CMD_NOTHING");
    const armSig = (arms: Ast[]): string[] =>
      arms.map(a => {
        const c = (a as { MergeWhenClause: { matchKind: string; commandType: string } })
          .MergeWhenClause;
        return `${c.matchKind}/${c.commandType}`;
      });

    const kinds: [
      kind: string,
      source: Ast,
      srcLabel: string,
      arms: Ast[],
      params: GeneratedQuery["params"],
    ][] = [
      ["merge-upd-ins", srcPlain, "src-plain", [UPD, INS(2)],
        [{ number: 1, valid: "mv" }, { number: 2, valid: "mn" }]],
      ["merge-bysource", srcPlain, "src-plain", [UPD, INS(2), BYSRC],
        [{ number: 1, valid: "mv" }, { number: 2, valid: "mn" }]],
      ["merge-delete", srcPlain, "src-plain", [DELC, UPD, INS(2)],
        [{ number: 1, valid: "mv" }, { number: 2, valid: "mn" }]],
      ["merge-nothing", srcPlain, "src-plain", [NOTHING, INS(1)],
        [{ number: 1, valid: "mn" }]],
      ["merge-join-src", srcJoin, "src-join(inner)", [UPD, INS(2)],
        [{ number: 1, valid: "mv" }, { number: 2, valid: "mn" }]],
    ];
    for (const [kind, source, srcLabel, arms, params] of kinds) {
      dml(
        kind,
        srcLabel,
        "plain",
        {
          MergeStmt: {
            relation: relation("ck"),
            sourceRelation: mergeSource(source),
            joinCondition: eq(colRef("ck", "id"), colRef("s", "sid")),
            mergeWhenClauses: arms,
            returningClause: RET,
          },
        },
        params,
        [
          expect("MERGE", "MergeStmt"),
          expectReturning,
          expectMergeArms(...armSig(arms)),
          expectParams(...params.map(p => p.number)),
        ],
      );
    }

    // Source value-flow attribution under the oracle: $1 rides the source
    // VALUES row and lands, via s.snm, in ck.val's NOT NULL constraint — the
    // engine claims notNull through the derived-column map, and every
    // default state witnesses the raise (sid 905 conflicts with nothing, so
    // the INSERT arm always receives the row).
    const srcParam = bareSelect({
      valuesLists: [valuesRow(intConst(905), paramRef(1))],
    });
    const INSP = mergeWhen("MERGE_WHEN_NOT_MATCHED_BY_TARGET", "CMD_INSERT", {
      targetList: insertCols("id", "val"),
      values: [colRef("s", "sid"), colRef("s", "snm")],
    });
    dml(
      "merge-src-param",
      "src-values-param",
      "plain",
      {
        MergeStmt: {
          relation: relation("ck"),
          sourceRelation: mergeSource(srcParam, ["sid", "snm"]),
          joinCondition: eq(colRef("ck", "id"), colRef("s", "sid")),
          mergeWhenClauses: [INSP],
          returningClause: RET,
        },
      },
      [{ number: 1, valid: "sv" }],
      [
        expect("MERGE", "MergeStmt"),
        expectReturning,
        expectMergeArms("MERGE_WHEN_NOT_MATCHED_BY_TARGET/CMD_INSERT"),
        expectParams(1),
      ],
    );
  }

  // --- dml-cte: INSERT ... RETURNING joined back through every kind. --------
  // The control value 1 makes ins.id match sparse's u.t_id, so even the
  // inner variant returns rows somewhere; the NULL variant raises in every
  // state (a VALUES row is always constructed).
  for (const k of JOIN_KINDS) {
    dml(
      "dml-cte",
      `cte-join(${kindLabel(k)})`,
      "plain",
      {
        SelectStmt: bareSelect({
          withClause: {
            ctes: [
              {
                CommonTableExpr: {
                  ctename: "ins",
                  ctematerialized: "CTEMaterializeDefault",
                  ctequery: {
                    InsertStmt: {
                      relation: relation("t"),
                      cols: insertCols("id", "name", "val", "active"),
                      selectStmt: {
                        SelectStmt: bareSelect({
                          valuesLists: [
                            valuesRow(paramRef(1), paramRef(2), textConst("c"), boolConst(true)),
                          ],
                        }),
                      },
                      returningClause: {
                        exprs: [
                          target(colRef("id")),
                          target(colRef("name")),
                          target(colRef("val")),
                        ],
                      },
                      override: "OVERRIDING_NOT_SET",
                    },
                  },
                },
              },
            ],
            recursive: false,
          },
          targetList: [
            target(colRef("ins", "id"), "a_ci"),
            target(coalesce(colRef("ins", "name"), textConst("z")), "a_cn"),
            target(colRef("ins", "val"), "a_cv"),
            target(colRef("u", "email"), "a_ce"),
          ],
          fromClause: [
            join(k, rangeVar("ins"), rangeVar("u"), eq(colRef("u", "t_id"), colRef("ins", "id"))),
          ],
        }),
      },
      [
        { number: 1, valid: 1 },
        { number: 2, valid: "cn" },
      ],
      [
        expect("INSERT", "InsertStmt"),
        expect("CTE", "CommonTableExpr"),
        expectReturning,
        expectJoins(k),
        expectParams(1, 2),
      ],
    );
  }

  // --- joint rejection sets: writes into tags.name (NOT NULL) through -----
  // COALESCE fan-ins. The only generated shapes whose contract carries
  // paramRejectionSets, plus the no-set control whose all-NULL binding the
  // contract deems admissible — the harness asserts claimed sets witness
  // their all-members-NULL raise AND that admissible bindings never
  // null-raise, the two directions of the joint oracle.
  const jointInsert = (projection: string, nameExpr: Ast, params: GeneratedQuery["params"]): void =>
    dml(
      "insert-joint",
      "values",
      projection,
      {
        InsertStmt: {
          relation: relation("tags"),
          cols: insertCols("name"),
          selectStmt: { SelectStmt: bareSelect({ valuesLists: [valuesRow(nameExpr)] }) },
          returningClause: {
            exprs: [target(colRef("id"), "r_id"), target(colRef("name"), "r_nm")],
          },
          override: "OVERRIDING_NOT_SET",
        },
      },
      params,
      [
        expect("INSERT", "InsertStmt"),
        expect("COALESCE", "CoalesceExpr"),
        expectReturning,
        expectParams(...params.map(p => p.number)),
      ],
    );
  jointInsert("joint-pair", coalesce(paramRef(1), paramRef(2)), [
    { number: 1, valid: "jt-a" },
    { number: 2, valid: "jt-b" },
  ]);
  jointInsert("joint-fanout", coalesce(paramRef(1), concatOp(paramRef(2), paramRef(3))), [
    { number: 1, valid: "jt-c" },
    { number: 2, valid: "jt-d" },
    { number: 3, valid: "jt-e" },
  ]);
  jointInsert("joint-none", coalesce(paramRef(1), textConst("jt-fallback")), [
    { number: 1, valid: "jt-f" },
  ]);
  dml(
    "update-joint",
    "target-only",
    "joint-pair",
    {
      UpdateStmt: {
        // u: populated in sparse (a DEFAULT state), email plain NOT NULL,
        // no CHECK constraints to satisfy. The first draft targeted tags,
        // which no default state populates, and the witness bar caught the
        // unwitnessable claim on this axis's very first run — kept as u so
        // the joint raise is observed without GENERATED_ALL_STATES.
        relation: relation("u"),
        targetList: [setItem("email", coalesce(paramRef(1), paramRef(2)))],
        whereClause: {
          A_Expr: {
            kind: "AEXPR_OP",
            name: [{ String: { sval: ">=" } }],
            lexpr: colRef("u", "id"),
            rexpr: paramRef(3),
          },
        },
        returningClause: { exprs: [target(colRef("id"), "r_id")] },
      },
    },
    [
      { number: 1, valid: "jt-u@x.y" },
      { number: 2, valid: "jt-v@x.y" },
      { number: 3, valid: 0 },
    ],
    [
      expect("UPDATE", "UpdateStmt"),
      expect("COALESCE", "CoalesceExpr"),
      expectReturning,
      expectParams(1, 2, 3),
    ],
  );

  return out;
}

// --- Deep join trees -------------------------------------------------------
//
// Three joins over the four-relation chain t—u—v—ck, with strict edge quals
//   e1: u.t_id = t.id    e2: v.u_id = u.id    e3: ck.id = v.u_id
// enumerated over all five join-tree shapes and all 4³ kind combinations —
// 320 structures. The 2-join axis found the strict-qual-refiltering
// imprecision class; depth 3 is where optionality has to PROPAGATE through
// an intermediate join (including `balanced`, which joins two composite
// sides — a shape the 2-join axis cannot produce at all). Projection is
// fixed to one column per relation: join reasoning does not interact with
// expression shape, and the projection axis is exercised against the 2-join
// structures already. Set operations and wrappers are likewise not crossed
// here — a deliberate, logged bound (the run reports it), since both compose
// over the output column list, not over the join tree that produces it.
//
// Under `sparse` the fully-matched chain row (t.1—u.1—v.1—ck.1) satisfies
// every edge, so every kind combination returns at least that row; the
// `unmatched` top-up carries an orphan for every presence pattern the chain
// data can express (see its comments).

export function generateDeepJoinQueries(): GeneratedQuery[] {
  const out: GeneratedQuery[] = [];
  const e1 = (): Ast => eq(colRef("u", "t_id"), colRef("t", "id"));
  const e2 = (): Ast => eq(colRef("v", "u_id"), colRef("u", "id"));
  const e3 = (): Ast => eq(colRef("ck", "id"), colRef("v", "u_id"));
  const SHAPES: { key: string; build: (k1: string, k2: string, k3: string) => Ast }[] = [
    {
      key: "left-deep", // ((t k1 u) k2 v) k3 ck
      build: (k1, k2, k3) =>
        join(
          k3,
          join(k2, join(k1, rangeVar("t"), rangeVar("u"), e1()), rangeVar("v"), e2()),
          rangeVar("ck"),
          e3(),
        ),
    },
    {
      key: "right-deep", // t k1 (u k2 (v k3 ck))
      build: (k1, k2, k3) =>
        join(
          k1,
          rangeVar("t"),
          join(k2, rangeVar("u"), join(k3, rangeVar("v"), rangeVar("ck"), e3()), e2()),
          e1(),
        ),
    },
    {
      key: "balanced", // (t k1 u) k2 (v k3 ck)
      build: (k1, k2, k3) =>
        join(
          k2,
          join(k1, rangeVar("t"), rangeVar("u"), e1()),
          join(k3, rangeVar("v"), rangeVar("ck"), e3()),
          e2(),
        ),
    },
    {
      key: "mid-left", // (t k1 (u k2 v)) k3 ck
      build: (k1, k2, k3) =>
        join(
          k3,
          join(k1, rangeVar("t"), join(k2, rangeVar("u"), rangeVar("v"), e2()), e1()),
          rangeVar("ck"),
          e3(),
        ),
    },
    {
      key: "mid-right", // t k1 ((u k2 v) k3 ck)
      build: (k1, k2, k3) =>
        join(
          k1,
          rangeVar("t"),
          join(k3, join(k2, rangeVar("u"), rangeVar("v"), e2()), rangeVar("ck"), e3()),
          e1(),
        ),
    },
  ];
  for (const shape of SHAPES) {
    for (const k1 of JOIN_KINDS) {
      for (const k2 of JOIN_KINDS) {
        for (const k3 of JOIN_KINDS) {
          const structure =
            `deep-${shape.key}(${kindLabel(k1)},${kindLabel(k2)},${kindLabel(k3)})`;
          out.push({
            id: `s=${structure}|p=deep-plain|o=none|w=none`,
            axes: { structure, projection: "deep-plain", setop: "none", wrapper: "none" },
            ast: {
              SelectStmt: bareSelect({
                targetList: [
                  target(colRef("t", "id"), "a_int"),
                  target(colRef("t", "name"), "a_ta"),
                  target(colRef("u", "email"), "a_ue"),
                  target(colRef("v", "amount"), "a_va"),
                  target(colRef("ck", "val"), "a_ck"),
                ],
                fromClause: [shape.build(k1, k2, k3)],
              }),
            },
            params: [],
            expectations: [expectJoins(k1, k2, k3)],
          });
        }
      }
    }
  }
  return out;
}

// --- Parameter placements --------------------------------------------------
//
// Widening the parameter axis by POSITION rather than mechanism. The
// projections above put parameters in target lists, in WHERE, and in DML
// write positions; every placement here is one the corpus otherwise never
// generates, and each sits on a boundary docs/argument-nullability.md
// records deliberately:
//
//   on-param     — a strict `u.email = $1` conjunct in the JOIN ON qual,
//                  with $1 also projected bare. ON-conjunct narrowing is a
//                  recorded NOT-TAKEN extension, so the projection stays
//                  nullable — under INNER the NULL binding refilters every
//                  row, making it a live-trap unwitnessable that flips
//                  (with PostgreSQL's agreement) if the extension lands.
//   on-reject    — the mechanism-A domain cast INSIDE the ON qual: bind-time
//                  rejection is position-blind, so the argument claim and
//                  its output narrowing ($1 || 'x' is notNull) must hold
//                  regardless of join kind or wrapper.
//   having-param — the HAVING twin of on-param: strict conjunct, contract
//                  nullable, projection a live-trap unwitnessable.
//   lateral-param— parameters INSIDE a LATERAL body: the inner scope's
//                  WHERE-conjunct narrowing licenses lx notNull for rows the
//                  subquery produces, which must survive a cross join and
//                  degrade under LEFT JOIN LATERAL's null-extension.
//   branch-param — parameters in a set operation's second branch, including
//                  a mechanism-A cast: set-op column merging meets both
//                  claim directions, and the branch parameters deduce their
//                  types from the first arm (measured).
//   limit-param  — LIMIT $1 OFFSET $2: nullable in a non-expression clause
//                  (LIMIT NULL means no limit; OFFSET NULL means 0).
//
// Everything is crossed with the wrapper axis, so every claim above must
// also propagate through a CTE and a FROM-subquery boundary. All shapes
// were measured against PGlite before generation (deduction rules included:
// FROM/ON is analysed before the target list, HAVING after it, and set-op
// branch parameters unify with the first arm's column types).

export function generateParamPlacementQueries(): GeneratedQuery[] {
  const out: GeneratedQuery[] = [];
  const add = (
    structure: string,
    projection: string,
    setop: string,
    core: Ast,
    colNames: string[],
    params: GeneratedQuery["params"],
    expectations: Expectation[],
  ): void => {
    for (const wrapper of WRAPPERS) {
      // The refilter wrappers pin `a_tc`; these placements do not project
      // it, so the cross is skipped exactly as in generateQueries.
      if (
        (wrapper === "cte-refilter" || wrapper === "subquery-refilter") &&
        !colNames.includes("a_tc")
      ) {
        continue;
      }
      out.push({
        id: `s=${structure}|p=${projection}|o=${setop}|w=${wrapper}`,
        axes: { structure, projection, setop, wrapper },
        ast: wrap(wrapper, core, colNames),
        params,
        expectations: [...expectations, ...WRAPPER_EXPECTATIONS[wrapper]],
      });
    }
  };

  // --- on-param: strict ON conjunct, parameter projected bare. -------------
  // The control value matches sparse's single u row, so INNER returns rows;
  // under a NULL binding the conjunct is never TRUE, so only the outer join
  // kinds still emit (null-extended) rows — which is exactly where a_p1's
  // NULL is witnessed.
  for (const k of JOIN_KINDS) {
    add(
      `single(${kindLabel(k)})`,
      "on-param",
      "none",
      bareSelect({
        targetList: [
          target(paramRef(1), "a_p1"),
          target(colRef("t", "name"), "a_ta"),
          target(colRef("u", "email"), "a_tb"),
          target(colRef("t", "id"), "a_int"),
        ],
        fromClause: [
          join(
            k,
            rangeVar("t"),
            rangeVar("u"),
            andExpr(
              eq(colRef("u", "t_id"), colRef("t", "id")),
              eq(colRef("u", "email"), paramRef(1)),
            ),
          ),
        ],
      }),
      ["a_p1", "a_ta", "a_tb", "a_int"],
      [{ number: 1, valid: "u1@b.c" }],
      [expectJoins(k), expectParams(1)],
    );
  }

  // --- on-reject: the mechanism-A cast inside the ON qual. -----------------
  // $1 is TYPED nn_text by the cast, so NULL raises at Bind in every state
  // (the argument claim's witness), and any returned row proves $1 non-NULL
  // — the projected concatenation is claimed notNull under every join kind
  // and wrapper. The control value matches no email, so the inequality
  // holds wherever a join partner exists.
  for (const k of JOIN_KINDS) {
    add(
      `single(${kindLabel(k)})`,
      "on-reject",
      "none",
      bareSelect({
        targetList: [
          target(concatOp(paramRef(1), textConst("x")), "a_pn"),
          target(colRef("t", "name"), "a_ta"),
          target(colRef("u", "email"), "a_tb"),
          target(colRef("t", "id"), "a_int"),
        ],
        fromClause: [
          join(
            k,
            rangeVar("t"),
            rangeVar("u"),
            andExpr(
              eq(colRef("u", "t_id"), colRef("t", "id")),
              neq(colRef("u", "email"), castTo(paramRef(1), "nn_text")),
            ),
          ),
        ],
      }),
      ["a_pn", "a_ta", "a_tb", "a_int"],
      [{ number: 1, valid: "zzz" }],
      [expectJoins(k), expectDomainCast, expectParams(1)],
    );
  }

  // --- having-param: strict HAVING conjunct, parameter projected bare. -----
  // Deduction: the bare projection is analysed before HAVING and both
  // deduce text. NULL filters every group (HAVING NULL), returning zero
  // rows cleanly — contract nullable, projection unwitnessable by refilter.
  for (const k of ["JOIN_INNER", "JOIN_LEFT"]) {
    add(
      `single(${kindLabel(k)})`,
      "having-param",
      "none",
      bareSelect({
        targetList: [
          target(colRef("t", "id"), "a_key"),
          target(countStar(), "a_cnt"),
          target(funcCall("max", [colRef("u", "val")]), "a_mxc"),
          target(paramRef(1), "a_ph"),
        ],
        fromClause: [tJoinU(k)],
        groupClause: [colRef("t", "id")],
        havingClause: neq(funcCall("max", [colRef("u", "email")]), paramRef(1)),
      }),
      ["a_key", "a_cnt", "a_mxc", "a_ph"],
      [{ number: 1, valid: "zzz" }],
      [expectJoins(k), expectGroupBy, expectHaving, expectCountStar, expectParams(1)],
    );
  }

  // --- lateral-param: parameters inside the LATERAL body. ------------------
  // The body's own WHERE has a strict `u.email = $1` conjunct, so within
  // that scope lx ($1 projected) is narrowed notNull; the cross join keeps
  // the guarantee, LEFT JOIN LATERAL null-extends past it. lc is COALESCE
  // over $2 and a nullable column, witnessed by the single-NULL variant
  // ($2 NULL, $1 valid) on the row where u.val is NULL.
  const lateralParamBody = (): Ast => ({
    RangeSubselect: {
      lateral: true,
      subquery: {
        SelectStmt: bareSelect({
          targetList: [
            target(paramRef(1), "lx"),
            target(coalesce(paramRef(2), colRef("u", "val")), "lc"),
          ],
          fromClause: [rangeVar("u")],
          whereClause: andExpr(
            eq(colRef("u", "t_id"), colRef("t", "id")),
            eq(colRef("u", "email"), paramRef(1)),
          ),
        }),
      },
      alias: { aliasname: "lsub" },
    },
  });
  const lateralTargets = (): Ast[] => [
    target(colRef("t", "id"), "a_int"),
    target(colRef("lsub", "lx"), "a_lx"),
    target(colRef("lsub", "lc"), "a_lc"),
  ];
  const lateralParams = [
    { number: 1, valid: "u1@b.c" },
    { number: 2, valid: "pz" },
  ];
  add(
    "lateral-cross",
    "lateral-param",
    "none",
    bareSelect({
      targetList: lateralTargets(),
      fromClause: [rangeVar("t"), lateralParamBody()],
    }),
    ["a_int", "a_lx", "a_lc"],
    lateralParams,
    [expectLateral, expectJoins(), expect("COALESCE", "CoalesceExpr"), expectParams(1, 2)],
  );
  add(
    "lateral-left",
    "lateral-param",
    "none",
    bareSelect({
      targetList: lateralTargets(),
      fromClause: [join("JOIN_LEFT", rangeVar("t"), lateralParamBody(), boolConst(true))],
    }),
    ["a_int", "a_lx", "a_lc"],
    lateralParams,
    [
      expectLateral,
      expectJoins("JOIN_LEFT"),
      expect("COALESCE", "CoalesceExpr"),
      expectParams(1, 2),
    ],
  );

  // --- branch-param: parameters in the set operation's second branch. ------
  // $1 and $3 deduce text/integer from the first arm (measured); $2 is the
  // mechanism-A cast firing from inside a branch. The control row matches
  // no first-arm row, so UNION adds it and EXCEPT subtracts nothing.
  const branchLeftArm = (): Ast =>
    bareSelect({
      targetList: [
        target(colRef("t", "name"), "a_ta"),
        target(colRef("u", "email"), "a_tb"),
        target(colRef("t", "id"), "a_int"),
      ],
      fromClause: [tJoinU("JOIN_LEFT")],
    });
  for (const setop of SET_OPS.filter(s => ["union", "union-all", "except"].includes(s.key))) {
    add(
      "single(left)",
      "branch-param",
      setop.key,
      {
        op: setop.op!,
        all: setop.all || undefined,
        larg: branchLeftArm(),
        rarg: bareSelect({
          targetList: [
            target(paramRef(1)),
            target(castTo(paramRef(2), "nn_text")),
            target(paramRef(3)),
          ],
        }),
        limitOption: "LIMIT_OPTION_DEFAULT",
      },
      ["a_ta", "a_tb", "a_int"],
      [
        { number: 1, valid: "q" },
        { number: 2, valid: "e2" },
        { number: 3, valid: 7 },
      ],
      [
        expectJoins("JOIN_LEFT"),
        expectSetOp(setop.op!, setop.all),
        expectDomainCast,
        expectParams(1, 2, 3),
      ],
    );
  }

  // --- limit-param: LIMIT $1 OFFSET $2. ------------------------------------
  // Measured: NULL is legal in both (no limit / zero offset), so both
  // contracts are nullable and the NULL variants still scan rows.
  add(
    "single(left)",
    "limit-param",
    "none",
    bareSelect({
      targetList: [
        target(colRef("t", "id"), "a_int"),
        target(colRef("t", "name"), "a_ta"),
        target(colRef("u", "email"), "a_tb"),
      ],
      fromClause: [tJoinU("JOIN_LEFT")],
      limitCount: paramRef(1),
      limitOffset: paramRef(2),
      limitOption: "LIMIT_OPTION_COUNT",
    }),
    ["a_int", "a_ta", "a_tb"],
    [
      { number: 1, valid: 100 },
      { number: 2, valid: 0 },
    ],
    [expectJoins("JOIN_LEFT"), expectLimit, expectParams(1, 2)],
  );

  return out;
}

export function generateQueries(): GeneratedQuery[] {
  const out: GeneratedQuery[] = [];
  const structures = joinStructures();
  // The union-full-var branch: the SAME structure key with every join kind
  // flipped to FULL — richest group set on the right, so the pairwise
  // member-intersection of UNION group agreement runs with genuinely
  // DIFFERING branch groups across the whole axis. Laterals have no FULL
  // form and skip the setop (recorded in the axis notes, not silent).
  const fullVariants = new Map<string, JoinStructure>();
  for (const s of structures) {
    const fullKey = s.key
      .replace(/\((inner|left|right|full)/, "(full")
      .replace(/,(inner|left|right|full)\)/, ",full)");
    const variant = structures.find(v => v.key === fullKey);
    if (variant && variant !== s) fullVariants.set(s.key, variant);
    else if (variant === s && s.key.includes("full")) fullVariants.set(s.key, s);
  }
  for (const structure of structures) {
    for (const projection of PROJECTIONS) {
      const built = projection.build(structure);
      const core: Ast = bareSelect({
        targetList: built.targets,
        fromClause: structure.fromClause,
        ...(built.where ? { whereClause: built.where } : {}),
        ...(built.groupBy ? { groupClause: built.groupBy } : {}),
      });

      for (const setop of SET_OPS) {
        // The projections' matchLiterals encode sparse's t–u row; gm
        // structures would intersect to empty everywhere and assert
        // nothing. Gated, recorded in the axis notes.
        if (setop.key === "intersect" && structure.key.startsWith("gm(")) continue;
        // union-full-var needs a real second branch; skip tuples with no
        // FULL variant (laterals) — the report's axis notes carry the cap.
        let rarg: Ast | null = null;
        if (setop.key === "union-full-var") {
          const variant = fullVariants.get(structure.key);
          if (!variant) continue;
          const vBuilt = projection.build(variant);
          rarg = bareSelect({
            targetList: vBuilt.targets,
            fromClause: variant.fromClause,
            ...(vBuilt.where ? { whereClause: vBuilt.where } : {}),
            ...(vBuilt.groupBy ? { groupClause: vBuilt.groupBy } : {}),
          });
        } else if (setop.op) {
          const branch = setop.key === "intersect" ? built.matchLiterals : built.literals;
          rarg = bareSelect({ targetList: branch.map(l => target(l)) });
        }
        const combined: Ast = setop.op
          ? {
              op: setop.op,
              all: setop.all || undefined,
              larg: core,
              rarg: rarg!,
              limitOption: "LIMIT_OPTION_DEFAULT",
            }
          : core;

        for (const wrapper of WRAPPERS) {
          // The refilter wrappers pin `a_tc`; a tuple that does not project
          // it has nothing to pin — and an INTERSECT tuple's only possible
          // row is the matchLiterals row, whose a_tc is NULL by design, so
          // refilter × intersect can never return a row and would assert
          // nothing. Both gated, noted in the report's axis notes.
          if (
            (wrapper === "cte-refilter" || wrapper === "subquery-refilter") &&
            (!built.colNames.includes("a_tc") || setop.key === "intersect")
          ) {
            continue;
          }
          const axes: AxisTuple = {
            structure: structure.key,
            projection: projection.key,
            setop: setop.key,
            wrapper,
          };
          // expectJoins matches the WHOLE tree's join-kind multiset, so a
          // union-full-var tuple expects both branches' kinds together.
          const kindsOf = (key: string): string[] => {
            const m = /\((\w+)(?:,(\w+))?\)/.exec(key);
            if (!m) return [];
            return [m[1]!, ...(m[2] ? [m[2]] : [])].map(k => `JOIN_${k.toUpperCase()}`);
          };
          const structureExpectations =
            setop.key === "union-full-var"
              ? [
                  expectJoins(
                    ...kindsOf(structure.key),
                    ...kindsOf(fullVariants.get(structure.key)!.key),
                  ),
                ]
              : structure.expectations;
          out.push({
            id: `s=${axes.structure}|p=${axes.projection}|o=${axes.setop}|w=${axes.wrapper}`,
            axes,
            ast: wrap(wrapper, combined, built.colNames),
            params: built.params ?? [],
            expectations: [
              ...structureExpectations,
              ...projection.expectations,
              ...(setop.op ? [expectSetOp(setop.op, setop.all)] : []),
              ...WRAPPER_EXPECTATIONS[wrapper],
            ],
          });
        }
      }
    }
  }
  return out;
}
