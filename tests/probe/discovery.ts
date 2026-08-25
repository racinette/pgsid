// The discovery instrument, slice 1.
//
//   pnpm exec tsx tests/probe/discovery.ts [queries] [seed]
//
// It generates random join queries over the tables the fixture schema's
// FOREIGN KEYS connect (§7's list 2), runs each against both the engine and
// PostgreSQL, and classifies every outcome into one of §6's buckets. It gates
// nothing and asserts nothing: per §4 this is the DISCOVERY half, whose only
// product is a falsifying query, and whose success measure is findings per run
// rather than green.
//
// What slice 1 does and does not do, so the report is not read as more than it
// is:
//
//   - joins 2..4 tables by following foreign keys, in any of the four join
//     kinds, plus a self-join where a key points a table at itself. Single and
//     COMPOSITE keys, the latter as a conjunctive ON — which is the input the
//     single-column entailment gate exists to reject, and a gate with nothing
//     to reject is untested. PARTITIONS and inheritance CHILDREN are named
//     directly too, reached through a partition's key CLONE and through a
//     child's inherited COLUMN standing where its parent's key column stands
//     — the latter a join PostgreSQL does not enforce, so it takes the
//     non-entailment path while the same shape over the parent takes the
//     other;
//   - projects a random subset of columns, qualified and aliased, plus 0..3
//     EXPRESSIONS over them (§9.1): CASE, COALESCE, GREATEST/LEAST, ARRAY[…],
//     ROW(…), a cast, a total scalar builtin, IS TRUE/FALSE/UNKNOWN, COLLATE
//     and CURRENT_DATE/TIMESTAMP/ROLE/USER. Target list rather than WHERE by
//     design: the engine makes one claim per OUTPUT COLUMN, so an expression
//     there is adjudicated on every row. FLAT — the three forms needing their
//     operands to agree draw from one bucket keyed on typeName, which is why
//     no nesting and no result-type tracking are needed;
//   - puts a WHERE on about 70% of them, built from `IS [NOT] NULL` and the
//     six comparisons against a literal DRAWN FROM the column's own seeded
//     values (§3 — a literal from a type generator matches nothing), combined
//     with AND, OR, NOT and one mixed tree. OR and NOT are generated on
//     purpose rather than avoided: they must BLOCK the promotion that a strict
//     comparison licenses, and getting that backwards is the classic
//     unsoundness in this area;
//   - is a modifying statement about a quarter of the time (§9.3): INSERT,
//     INSERT … ON CONFLICT, UPDATE, UPDATE … SET (a,b) = (SELECT …), DELETE,
//     each with RETURNING on nine tenths of them. `RETURNING` is the only
//     observable a DML statement has, and the write-rewrite hooks — a BEFORE
//     ROW trigger, an INSTEAD OF trigger on a view, a DO INSTEAD rule — are
//     reachable through nothing else. An INSERT copies a whole sampled ROW
//     rather than assembling one column at a time, which is what keeps a
//     composite key, a partition range and a cross-column CHECK satisfied by
//     construction;
//   - MERGE, whose source is built to STRADDLE the target — some keys drawn
//     from the target's own rows, some absent — because §5.3 measured that a
//     source drawn from the target's keys exercises one arm and never the
//     others. All three match kinds are emitted, with per-arm conditions, and
//     `RETURNING merge_action()` is the only observable that says which arm
//     produced a row. The report tallies those, so "the arm fired" is measured
//     rather than assumed.
//
// Everything absent from that list is a later slice. The bound is printed with
// the result, because §6's closing rule is that a run finding nothing must
// state what it covered — and beside it the saturation curve, which says
// whether running longer would have bought anything.
import { deparseSync } from "pgsql-deparser";
import { parseSql } from "../../src/ast.js";
import { snapshotCatalog } from "../../src/catalog/snapshot.js";
import type { CatalogSnapshot, TableInfo } from "../../src/catalog/types.js";
import { DEDUCTION_FAILURE } from "../unit/query/fixture-args.js";
import { generateFixtureData } from "../unit/query/fixture-data/generate.js";
import { fixtureGeneratorRegistry } from "../unit/query/fixture-data/generators.js";
import { makeRand, type Rand } from "../unit/query/fixture-data/random.js";
import { ProbeLoop, type ProbeResult } from "./harness.js";

// ---------------------------------------------------------------------------
// The join graph
// ---------------------------------------------------------------------------

interface Edge {
  /** The table holding the key column. */
  child: string;
  /** The table it references. */
  parent: string;
  /** Key columns, paired positionally. More than one is a COMPOSITE key,
   *  whose ON is a conjunction — the input `resolveForeignKey`'s
   *  single-column gate exists to reject. */
  childColumns: string[];
  parentColumns: string[];
  /**
   * Whether an outer join over this key can actually produce a NULL-extended
   * row (§5.2). PostgreSQL enforces the key, so joining child -> parent finds
   * a parent for every child row unless the key column is nullable or the key
   * is NOT VALID. Joining parent -> child is always inhabitable: a parent with
   * no children violates nothing.
   */
  childToParentCanExtend: boolean;
}

/**
 * Every join the generator may write, from the keys the catalog declares.
 *
 * Three sources, and the last two are what let a query name a PARTITION or an
 * inheritance CHILD directly — shapes an application writes and the walker
 * could not previously reach, because neither kind of relation declares a key
 * of its own:
 *
 *   1. A declared key.
 *   2. A key CLONE on a partition. `pg_constraint` records one per partition,
 *      and for the partition it is not a duplicate — it is the only key that
 *      partition has. This is the adapter's own rule (prefer the declared row,
 *      fall back to a clone) read from the other end.
 *   3. An INHERITED COLUMN standing where its parent's key column stands. A
 *      child does NOT inherit the key itself (measured, and the reason
 *      `resolveForeignKeyTree` excludes a parent with descendants), so this
 *      edge is a join PostgreSQL does not enforce — which is the point. It
 *      takes the non-entailment path through the engine, and the same shape
 *      over the parent takes the other one.
 */
function edgesOf(snapshot: CatalogSnapshot, childToParent: Map<string, string>): Edge[] {
  const out: Edge[] = [];
  const byName = new Map(snapshot.tables.map(t => [t.name, t]));
  const push = (
    t: TableInfo,
    c: { columns: string[]; foreignColumns: string[] | null; foreignSchema: string | null; foreignTable: string | null; validated: boolean | null },
    enforced: boolean,
    parentOverride?: string,
  ): void => {
    if (!c.foreignTable || !c.foreignColumns) return;
    if (c.foreignColumns.length !== c.columns.length || c.columns.length === 0) return;
    const cols = c.columns.map(n => t.columns.find(x => x.name === n));
    if (cols.some(x => !x)) return;
    out.push({
      child: `${t.schema}.${t.name}`,
      parent: parentOverride ?? `${c.foreignSchema ?? t.schema}.${c.foreignTable}`,
      childColumns: [...c.columns],
      parentColumns: [...c.foreignColumns],
      // An unenforced edge can dangle by construction, so BOTH arms of an
      // outer join over it are inhabitable.
      childToParentCanExtend:
        !enforced || !c.validated || cols.some(x => !x!.notNull),
    });
  };
  for (const t of snapshot.tables) {
    for (const c of t.constraints) {
      if (c.type !== "foreign") continue;
      push(t, c, true);
    }
    // The inherited-column edges: a child's copy of a parent's key column,
    // with no key behind it.
    const parentName = childToParent.get(t.name);
    const parent = parentName ? byName.get(parentName) : undefined;
    if (!parent || parent.relkind === "p") continue; // partitions get clones instead
    for (const c of parent.constraints) {
      if (c.type !== "foreign" || c.inheritedClone) continue;
      if (t.constraints.some(own => own.name === c.name)) continue;
      push(t, c, false);
    }
  }
  // And the mirror: a child standing where its parent stands on the REFERENCED
  // side. `warehouses_overflow` inherits the column a key points at without
  // inheriting anything that enforces it, so joining onto the child is legal,
  // unenforced, and reachable no other way — `warehouses` is only ever a
  // target, so it lends its children no edge through the rule above.
  for (const [childName, parentName] of childToParent) {
    const child = byName.get(childName), parent = byName.get(parentName);
    if (!child || !parent || parent.relkind === "p") continue;
    const childId = `${child.schema}.${child.name}`;
    for (const e of [...out]) {
      if (e.parent !== `${parent.schema}.${parent.name}`) continue;
      if (!e.parentColumns.every(n => child.columns.some(c => c.name === n))) continue;
      out.push({ ...e, parent: childId, childToParentCanExtend: true });
    }
  }
  return out;
}

/** The tables reachable from each other by following edges in either direction. */
function groupsOf(tables: string[], edges: Edge[]): string[][] {
  const up = new Map(tables.map(t => [t, t]));
  const find = (x: string): string => {
    let r = x;
    while (up.get(r) !== r) r = up.get(r)!;
    return r;
  };
  for (const e of edges) {
    if (up.has(e.child) && up.has(e.parent)) up.set(find(e.child), find(e.parent));
  }
  const byRoot = new Map<string, string[]>();
  for (const t of tables) {
    const root = find(t);
    const arr = byRoot.get(root);
    if (arr) arr.push(t); else byRoot.set(root, [t]);
  }
  return [...byRoot.values()].filter(g => g.length > 1).sort((a, b) => b.length - a.length);
}

// ---------------------------------------------------------------------------
// AST construction
//
// ASTs, not text — the decision recorded in §5.1. The deparser round trip is a
// measured 97% clean over the fixture corpus and its five defects are pinned
// upstream bugs, where emitting text means writing a query builder whose hard
// parts DO arise once generation is randomised.
// ---------------------------------------------------------------------------

type Ast = Record<string, unknown>;

const str = (s: string): Ast => ({ String: { sval: s } });
const colRef = (alias: string, column: string): Ast =>
  ({ ColumnRef: { fields: [str(alias), str(column)] } });
const target = (val: Ast, name: string): Ast => ({ ResTarget: { name, val } });
const rangeVar = (schema: string, table: string, alias: string): Ast =>
  ({ RangeVar: { schemaname: schema, relname: table, inh: true, relpersistence: "p", alias: { aliasname: alias } } });
const eq = (l: Ast, r: Ast): Ast =>
  ({ A_Expr: { kind: "AEXPR_OP", name: [str("=")], lexpr: l, rexpr: r } });
const op = (name: string, l: Ast, r: Ast): Ast =>
  ({ A_Expr: { kind: "AEXPR_OP", name: [str(name)], lexpr: l, rexpr: r } });
const nullTest = (arg: Ast, isNull: boolean): Ast =>
  ({ NullTest: { arg, nulltesttype: isNull ? "IS_NULL" : "IS_NOT_NULL" } });
const boolExpr = (boolop: "AND_EXPR" | "OR_EXPR" | "NOT_EXPR", args: Ast[]): Ast =>
  ({ BoolExpr: { boolop, args } });

/**
 * A literal for a value the DATA actually holds.
 *
 * §3: volume does not buy overlap. `WHERE p.name = 'zeta-17'` returns nothing
 * against a million rows if the literal came from a type generator, so every
 * predicate literal is drawn from the column it is compared against — the same
 * mechanism that makes the seeded foreign keys resolve, one layer up.
 */
function literalFor(v: unknown): Ast | null {
  if (v === null) return null;
  if (typeof v === "number") {
    return Number.isInteger(v)
      ? { A_Const: { ival: v === 0 ? {} : { ival: v } } }
      : { A_Const: { fval: { fval: String(v) } } };
  }
  if (typeof v === "boolean") return { A_Const: { boolval: v ? { boolval: true } : {} } };
  if (typeof v === "string") return { A_Const: { sval: { sval: v } } };
  if (typeof v === "bigint") return { A_Const: { ival: { ival: Number(v) } } };
  // Dates, arrays, json and the rest: rendering them faithfully is a type
  // problem, and a wrong rendering is a TOOL defect masquerading as a finding.
  // They are skipped, and the run reports how often.
  return null;
}

// ---------------------------------------------------------------------------
// Expression vocabulary — §9.1.
//
// A target used to be a bare ColumnRef, which is why the generator emitted ten
// of the census's 86 node types. Everything here is a TARGET-LIST entry, and
// that placement is the point rather than a convenience: the engine makes one
// claim per OUTPUT COLUMN, so an expression in the target list is adjudicated
// by PostgreSQL on every row, while an expression in a WHERE only changes which
// rows come back. Predicates already get their traffic from §9.4's shapes.
//
// FLAT — one level, no nesting. Three of the forms need their operands to
// agree on a type (`coalesce`, `greatest`, `ARRAY[…]`), and that is a bucket
// keyed on `ColumnInfo.typeName`, not a type system: pick a bucket, take two
// columns out of it. Nesting is what would force a recursive builder threading
// a wanted type, and its value is unproven — the walk dispatches per node, so
// what matters is that each node kind APPEARS.
//
// A domain counts as its own bucket rather than as its base type. Stricter
// than PostgreSQL needs, and the safe direction: two columns of one domain
// always combine.
// ---------------------------------------------------------------------------

/** A column available in the query, with what the catalog says it is. */
interface Slot { alias: string; column: string; type: string }

/** Total single-argument builtins by argument type — nothing here can raise. */
const SCALAR_BUILTINS: Record<string, { name: string; args: 1 }[]> = {
  text: [{ name: "length", args: 1 }, { name: "upper", args: 1 }, { name: "lower", args: 1 }],
  integer: [{ name: "abs", args: 1 }],
  numeric: [{ name: "abs", args: 1 }],
};

/** `json` has no ordering operators, so GREATEST/LEAST over it raises. */
const ORDERABLE = (t: string): boolean => t !== "json";

/**
 * The spelling the PARSER gives a grammar-keyword cast target: `x::integer`
 * parses as `pg_catalog.int4`, so a cast built with the catalog's rendered
 * name reads as a changed tree to the round-trip guard. Building the
 * qualified name round-trips identically (measured — the deparser prints the
 * keyword back and the parser restores the qualification). Non-keyword names
 * (`text`, `date`, `uuid`, domains) parse as written and stay so.
 */
const CAST_SPELLING: Record<string, string> = {
  integer: "pg_catalog.int4", bigint: "pg_catalog.int8", smallint: "pg_catalog.int2",
  numeric: "pg_catalog.numeric", boolean: "pg_catalog.bool", real: "pg_catalog.float4",
};

const typeCast = (arg: Ast, typeName: string): Ast => {
  const spelled = CAST_SPELLING[typeName] ?? typeName;
  return { TypeCast: { arg, typeName: { names: spelled.split(".").map(str), typemod: -1 } } };
};

/**
 * Whether a rendered type name can be written as a cast target verbatim.
 *
 * `format_type` renders a builtin alias as several words (`timestamp with time
 * zone`) and a user type qualified (`public.positive_amount`). The second is a
 * dotted name list; the first is not a name at all and needs the pg_catalog
 * spelling, which this does not try to map — a column typed that way simply
 * does not get the forms that need an explicit cast.
 */
const castableType = (typeName: string): boolean =>
  !/[ (\[]/.test(typeName) && typeName.split(".").length <= 2;

/**
 * One target-list expression over the query's columns, or null when no form
 * fits what is in scope. Returns the node kind alongside it, for the shape
 * fingerprint — never the value, or every random literal mints a fresh shape.
 */
function projectionExpr(
  rand: Rand,
  slots: Slot[],
  byType: Map<string, Slot[]>,
): { ast: Ast; form: string } | null {
  if (slots.length === 0) return null;
  const one = rand.pick(slots);
  const ref = (sl: Slot): Ast => colRef(sl.alias, sl.column);

  /** Two columns of ONE type — the same column twice is a legal pair. */
  const pair = (want?: string): [Slot, Slot] | null => {
    const buckets = want
      ? (byType.has(want) ? [byType.get(want)!] : [])
      : [...byType.values()];
    if (buckets.length === 0) return null;
    const b = rand.pick(buckets);
    return [rand.pick(b), rand.pick(b)];
  };
  const ofType = (want: string): Slot | null => {
    const b = byType.get(want);
    return b && b.length ? rand.pick(b) : null;
  };

  const forms = ["cast", "case", "coalesce", "minmax", "array", "row", "sqlvalue", "func", "booltest", "collate"];
  switch (rand.pick(forms)) {
    case "cast":
      return { ast: typeCast(ref(one), "text"), form: "cast" };

    case "case": {
      const p = pair();
      if (!p) return null;
      return {
        ast: {
          CaseExpr: {
            args: [{
              CaseWhen: {
                expr: nullTest(ref(one), rand.chance(0.5)),
                result: ref(p[0]),
              },
            }],
            defresult: ref(p[1]),
          },
        },
        form: "case",
      };
    }

    case "coalesce": {
      const p = pair();
      return p ? { ast: { CoalesceExpr: { args: [ref(p[0]), ref(p[1])] } }, form: "coalesce" } : null;
    }

    case "minmax": {
      const orderable = [...byType.entries()].filter(([t]) => ORDERABLE(t));
      if (orderable.length === 0) return null;
      const b = rand.pick(orderable)[1];
      return {
        ast: {
          MinMaxExpr: {
            op: rand.pick(["IS_GREATEST", "IS_LEAST"]),
            args: [ref(rand.pick(b)), ref(rand.pick(b))],
          },
        },
        form: "minmax",
      };
    }

    case "array": {
      const p = pair();
      return p ? { ast: { A_ArrayExpr: { elements: [ref(p[0]), ref(p[1])] } }, form: "array" } : null;
    }

    case "row": {
      // A record's fields are the engine's claim here, and ROW needs no type
      // agreement at all.
      const other = rand.pick(slots);
      return {
        ast: { RowExpr: { args: [ref(one), ref(other)], row_format: "COERCE_EXPLICIT_CALL" } },
        form: "row",
      };
    }

    case "sqlvalue": {
      const op = rand.pick([
        "SVFOP_CURRENT_DATE", "SVFOP_CURRENT_TIMESTAMP",
        "SVFOP_CURRENT_ROLE", "SVFOP_SESSION_USER",
      ]);
      return { ast: { SQLValueFunction: { op, typmod: -1 } }, form: "sqlvalue" };
    }

    case "func": {
      const candidates = Object.keys(SCALAR_BUILTINS).filter(t => byType.has(t));
      if (candidates.length === 0) return null;
      const t = rand.pick(candidates);
      const fn = rand.pick(SCALAR_BUILTINS[t]!);
      const sl = ofType(t);
      return sl
        ? { ast: { FuncCall: { funcname: [str(fn.name)], args: [ref(sl)], funcformat: "COERCE_EXPLICIT_CALL" } }, form: "func" }
        : null;
    }

    case "booltest": {
      const sl = ofType("boolean");
      return sl
        ? {
            ast: {
              BooleanTest: {
                arg: ref(sl),
                booltesttype: rand.pick([
                  "IS_TRUE", "IS_NOT_TRUE", "IS_FALSE",
                  "IS_NOT_FALSE", "IS_UNKNOWN", "IS_NOT_UNKNOWN",
                ]),
              },
            },
            form: "booltest",
          }
        : null;
    }

    case "collate": {
      const sl = ofType("text");
      return sl
        ? { ast: { CollateClause: { arg: ref(sl), collname: [str("C")] } }, form: "collate" }
        : null;
    }

    default:
      return null;
  }
}

const JOIN_KINDS = ["JOIN_INNER", "JOIN_LEFT", "JOIN_RIGHT", "JOIN_FULL"] as const;

interface Built {
  sql: string;
  /** The statement node the generator assembled — what §5.4's round-trip
   *  guard compares the reparsed tree against. */
  ast: Ast;
  /**
   * Control bindings, `$k` at index k-1, each with the SITE it occupies —
   * the site names the placement class, which is what a param-violated
   * fingerprint keys on. Values come from the same pool the literals draw
   * from, so a parameterized predicate matches rows the way a literal one
   * does. Empty when the statement carries no parameters.
   */
  params: { value: unknown; site: string }[];
  /** Aliases in the order they were joined, with the table each stands for. */
  used: { alias: string; table: string }[];
  kinds: string[];
  /** Stable description of the query's shape, literals and names erased. */
  shape: string;
}

/**
 * The `$n` allocator one built statement owns. Numbering is dense in
 * allocation order — PostgreSQL requires density, not textual order. A caller
 * whose construction can FAIL after allocating (the WHERE retry) must roll
 * the list back to its mark, or the statement binds more parameters than its
 * text mentions and every variant misattributes from there.
 */
function makeParams(): {
  list: { value: unknown; site: string }[];
  ref: (value: unknown, site: string) => Ast;
} {
  const list: { value: unknown; site: string }[] = [];
  return {
    list,
    ref: (value, site) => {
      list.push({ value, site });
      return { ParamRef: { number: list.length } };
    },
  };
}

type ParamRefFn = (value: unknown, site: string) => Ast;

/** Sampled values per `schema.table.column`, for drawing predicate literals. */
type ValuePool = Map<string, unknown[]>;

/**
 * Whole sampled ROWS per relation, which is what an INSERT is built from.
 *
 * Assembling a row column-by-column out of the per-column pool breaks every
 * constraint that spans more than one column: a composite foreign key gets a
 * pair the cross product allows and the table does not, a partition gets a key
 * outside its range, and a cross-column CHECK gets two values that never
 * co-occurred. Copying a row PostgreSQL already accepted satisfies all of them
 * by construction, and only the key columns then have to move.
 */
type RowPool = Map<string, Record<string, unknown>[]>;

/**
 * One WHERE predicate over an alias in the query.
 *
 * The shapes are chosen for what they do to PRESENCE, which is where the walk
 * reasons and so where it can be wrong:
 *
 *   - a STRICT comparison cannot hold on a NULL-extended row, so it cancels an
 *     outer join's extension and promotes the alias — the rule
 *     `whereImpliesAliasNotNull` implements;
 *   - `IS NOT NULL` promotes the one column, and `IS NULL` does the opposite,
 *     keeping only extended rows;
 *   - OR and NOT must BLOCK promotion (`a.x = 1 OR b.y = 2` proves neither
 *     side), and getting that wrong is the classic unsoundness in this area,
 *     so both are generated deliberately rather than avoided.
 */
function predicate(rand: Rand, used: Item[], pool: ValuePool, pr?: ParamRefFn): Ast | null {
  const u = rand.pick(used);
  if (u.columns.length === 0) return null;
  const col = rand.pick(u.columns);
  const ref = colRef(u.alias, col.name);

  const form = rand.int(0, 5);
  if (form === 0) return nullTest(ref, true);
  if (form === 1) return nullTest(ref, false);

  // A function item has no catalog entry, so it contributes no literals.
  const values = (u.table ? pool.get(`${u.table}.${col.name}`) ?? [] : []).filter(v => v !== null);
  if (values.length === 0) return null;
  const v = rand.pick(values);
  let rhs = literalFor(v);
  if (!rhs) return null;
  // A parameter where a literal stood — same drawn value, so the predicate
  // still matches rows; the comparison deduces the type. Binding NULL later
  // is legal here (a strict comparison just returns nothing), which makes
  // this the site where a WRONG notNull claim would be a false rejection.
  if (pr && rand.chance(0.35)) rhs = pr(v, "where-cmp");
  if (form === 2) return op("=", ref, rhs);
  if (form === 3) return op("<>", ref, rhs);
  if (form === 4) return op(rand.pick([">", "<", ">=", "<="]), ref, rhs);
  return op("=", ref, rhs);
}

function whereClause(rand: Rand, used: Item[], pool: ValuePool, pr?: ParamRefFn): { node: Ast; shape: string } | null {
  const one = (): Ast | null => predicate(rand, used, pool, pr);
  const form = rand.int(0, 4);
  if (form === 0) {
    const p = one();
    return p ? { node: p, shape: "1" } : null;
  }
  if (form === 1 || form === 2) {
    const a = one(), b = one();
    if (!a || !b) return null;
    const boolop = form === 1 ? "AND_EXPR" : "OR_EXPR";
    return { node: boolExpr(boolop, [a, b]), shape: form === 1 ? "AND" : "OR" };
  }
  if (form === 3) {
    const p = one();
    return p ? { node: boolExpr("NOT_EXPR", [p]), shape: "NOT" } : null;
  }
  const a = one(), b = one(), c = one();
  if (!a || !b || !c) return null;
  // A mixed tree — the shape where promotion has to survive one level and be
  // blocked at another.
  return { node: boolExpr("AND_EXPR", [a, boolExpr("OR_EXPR", [b, c])]), shape: "AND(OR)" };
}

/**
 * Walk the join graph from a random table, emitting a join tree.
 *
 * Left-deep only in slice 1: the existing enumerated corpus already crosses
 * five tree shapes (`generateDeepJoinQueries`), and what is unexplored here is
 * the CATALOG, not the tree.
 */
// ---------------------------------------------------------------------------
// FROM-item vocabulary — §9.2.
//
// The FROM clause used to be a left-deep chain of bare RangeVars joined on
// declared keys. Sweep-4's own reading was that POSITION, not code age, is the
// discriminating variable — five of its seven findings were FROM items,
// because that is where the engine's model of "what rows does this produce" is
// thinnest and where a wrong answer misassigns every flag after it.
//
// A scope entry is no longer always a table: a function item and a derived
// table have columns and an alias and no `TableInfo` at all, so everything
// downstream reads `Item.columns` rather than the catalog.
// ---------------------------------------------------------------------------

interface Item {
  alias: string;
  /** The relation id, when this item IS one — absent for functions and
   *  derived tables, which is what makes the union type worth having. */
  table?: string;
  /** The names this item ANSWERS TO, which an alias column list can change. */
  columns: { name: string; type: string }[];
  /**
   * Catalog name → the name this item answers to. Only an alias column list
   * makes it non-trivial, and forgetting it on ONE side is what produced 419
   * "column does not exist" rejections: a key join reads its columns from
   * `pg_constraint`, which knows only catalog names, so BOTH ends have to be
   * translated and translating the added end alone is silently wrong.
   */
  renamed: Map<string, string>;
}

const renameOf = (
  catalog: { name: string }[],
  effective: { name: string }[],
): Map<string, string> =>
  new Map(catalog.map((c, i) => [c.name, effective[i]?.name ?? c.name]));

const rangeSubselect = (subquery: Ast, alias: string, lateral: boolean): Ast =>
  ({ RangeSubselect: { ...(lateral ? { lateral: true } : {}), subquery, alias: { aliasname: alias } } });

const funcItem = (calls: Ast[], alias: string, colnames: string[]): Ast => ({
  RangeFunction: {
    ...(calls.length > 1 ? { is_rowsfrom: true } : {}),
    functions: calls.map(c => ({ List: { items: [c, {}] } })),
    alias: { aliasname: alias, colnames: colnames.map(str) },
  },
});

const intConst = (n: number): Ast => ({ A_Const: { ival: n === 0 ? {} : { ival: n } } });
const seriesCall = (lo: number, hi: number): Ast =>
  ({ FuncCall: { funcname: [str("generate_series")], args: [intConst(lo), intConst(hi)], funcformat: "COERCE_EXPLICIT_CALL" } });

/**
 * A relation as a FROM item, sometimes wrapped. The wrappers keep the same
 * column names, so nothing downstream has to know which one it got.
 *
 * TABLESAMPLE is drawn at a HIGH fraction on purpose: the construct is what
 * sweep-4 finding 3 needed, and a low fraction merely empties the side, which
 * costs the run its rows without testing anything the empty relation does not
 * already test.
 */
function relationItem(
  rand: Rand,
  t: TableInfo,
  alias: string,
  cols: { name: string; type: string }[],
): { ast: Ast; form: string; columns: { name: string; type: string }[] } {
  const roll = rand.int(0, 11);
  // An alias COLUMN LIST renames the relation's columns positionally, so every
  // downstream reference and the ordered-name oracle see names the catalog
  // does not carry. PostgreSQL allows a partial list — the columns past its
  // end keep their own names — and both halves are generated.
  if (roll === 10 || roll === 11) {
    const n = roll === 10 ? cols.length : Math.max(1, Math.floor(cols.length / 2));
    const renamed = cols.map((c, i) => (i < n ? { name: `c${i}`, type: c.type } : c));
    return {
      ast: { RangeVar: { schemaname: t.schema, relname: t.name, inh: true, relpersistence: "p",
                         alias: { aliasname: alias, colnames: renamed.slice(0, n).map(c => str(c.name)) } } },
      form: n === cols.length ? "aliasall" : "aliaspart",
      columns: renamed,
    };
  }
  if (roll === 0) {
    return {
      ast: { RangeTableSample: { relation: rangeVar(t.schema, t.name, alias), method: [str("bernoulli")], args: [intConst(rand.int(60, 100))] } },
      form: "sample",
      columns: cols,
    };
  }
  if (roll === 1) {
    // A derived table over the relation — same columns, one more layer for the
    // walk to carry them through.
    return {
      ast: rangeSubselect(
        { SelectStmt: { targetList: [{ ResTarget: { val: { ColumnRef: { fields: [{ A_Star: {} }] } } } }], fromClause: [rangeVar(t.schema, t.name, `${alias}_b`)], limitOption: "LIMIT_OPTION_DEFAULT", op: "SETOP_NONE" } },
        alias, false),
      form: "derived",
      columns: cols,
    };
  }
  return { ast: rangeVar(t.schema, t.name, alias), form: "rel", columns: cols };
}

function buildQuery(
  rand: Rand,
  snapshot: CatalogSnapshot,
  start: string,
  edges: Edge[],
  pool: ValuePool,
  appTables: TableInfo[],
): Built | null {
  const byId = new Map(snapshot.tables.map(t => [`${t.schema}.${t.name}`, t]));
  const colsOf = (t: TableInfo) =>
    t.columns.filter(c => c.generated !== "virtual").map(c => ({ name: c.name, type: c.typeName }));
  const P = makeParams();
  const target_ = rand.int(2, 4);
  const startTable = byId.get(start)!;
  const first = relationItem(rand, startTable, "r0", colsOf(startTable));
  const used: Item[] = [{ alias: "r0", table: start, columns: first.columns,
    renamed: renameOf(colsOf(startTable), first.columns) }];
  const kinds: string[] = [];
  const shapeParts: string[] = [first.form];

  let from: Ast = first.ast;
  /** Comma-joined items — a FROM list rather than a join tree. */
  const extraFrom: Ast[] = [];
  /**
   * Aliases inside the join TREE. A comma-joined item is a sibling of the
   * tree, not a member of it, so a later join's ON cannot reference it —
   * `FROM a JOIN b ON …, c` leaves `c` invisible to that ON, and anchoring
   * there is a "missing FROM-clause entry" rejection. Targets and WHERE see
   * every item, which is why `used` still carries them all.
   */
  const treeAliases = new Set<string>(["r0"]);

  /** Two same-typed columns, one from scope and one from a candidate table. */
  const nonKeyPair = (t: TableInfo): { anchor: Item; a: string; b: string } | null => {
    const options: { anchor: Item; a: string; b: string }[] = [];
    for (const u of used) {
      if (!treeAliases.has(u.alias)) continue;
      for (const c of u.columns) {
        for (const d of colsOf(t)) {
          if (c.type === d.type && c.type !== "json") options.push({ anchor: u, a: c.name, b: d.name });
        }
      }
    }
    return options.length ? rand.pick(options) : null;
  };

  for (let i = 1; i < target_; i++) {
    const alias = `r${i}`;
    const roll = rand.int(0, 11);

    // --- a function item: no relation, no key, columns from its alias ------
    if (roll === 0) {
      const rowsFrom = rand.chance(0.5);
      const cols = rowsFrom ? ["fa", "fb"] : ["fa"];
      const calls = rowsFrom
        ? [seriesCall(1, rand.int(1, 3)), seriesCall(1, rand.int(1, 2))]
        : [seriesCall(1, rand.int(1, 3))];
      from = {
        JoinExpr: {
          jointype: "JOIN_INNER",
          larg: from,
          rarg: funcItem(calls, alias, cols),
          // No qual at all — a CROSS JOIN in join-tree form, which is the
          // route sweep-4 finding 2 took into an unrecorded join.
        },
      };
      used.push({ alias, columns: cols.map(n => ({ name: n, type: "integer" })), renamed: new Map() });
      treeAliases.add(alias);
      kinds.push("JOIN_INNER");
      shapeParts.push(rowsFrom ? "rowsfrom" : "srf");
      continue;
    }

    // --- LATERAL over an earlier alias ------------------------------------
    if (roll === 1) {
      const anchor = rand.pick(used.filter(u => treeAliases.has(u.alias)));
      if (!anchor || anchor.columns.length === 0) continue;
      const c = rand.pick(anchor.columns);
      from = {
        JoinExpr: {
          jointype: rand.pick(["JOIN_INNER", "JOIN_LEFT"]),
          larg: from,
          rarg: rangeSubselect(
            { SelectStmt: { targetList: [target(colRef(anchor.alias, c.name), "lv")], limitOption: "LIMIT_OPTION_DEFAULT", op: "SETOP_NONE" } },
            alias, true),
          quals: { A_Const: { boolval: { boolval: true } } },
        },
      };
      used.push({ alias, columns: [{ name: "lv", type: c.type }], renamed: new Map() });
      treeAliases.add(alias);
      kinds.push("JOIN_LATERAL");
      shapeParts.push("lateral");
      continue;
    }

    // --- a table joined on a NON-KEY condition, or on nothing at all ------
    // Step 0's residue: 18 of the 26 features it measured as unreachable sit
    // on tables no key connects, so a key-only walker cannot get to them at
    // any depth. This path also takes the engine's other route — no
    // entailment, pure join-state reasoning.
    if (roll === 2 || roll === 3) {
      const t = rand.pick(appTables);
      const pair = roll === 2 ? nonKeyPair(t) : null;
      const item = relationItem(rand, t, alias, colsOf(t));
      // A qual-less join is only legal as INNER — PostgreSQL requires ON or
      // USING on every outer join, and emitting one without is a syntax error
      // rather than an interesting shape.
      const kind = pair ? rand.pick(JOIN_KINDS) : "JOIN_INNER";
      from = {
        JoinExpr: {
          jointype: kind,
          larg: from,
          rarg: item.ast,
          ...(pair ? { quals: eq(colRef(pair.anchor.alias, pair.a), colRef(alias, item.columns[colsOf(t).findIndex(x => x.name === pair.b)]!.name)) } : {}),
        },
      };
      used.push({ alias, table: `${t.schema}.${t.name}`, columns: item.columns,
        renamed: renameOf(colsOf(t), item.columns) });
      treeAliases.add(alias);
      kinds.push(kind);
      shapeParts.push(pair ? `${kind}:nonkey` : `${kind}:qualless`);
      continue;
    }

    // --- a comma join: a second FROM entry rather than a join tree --------
    if (roll === 4) {
      const t = rand.pick(appTables);
      const item = relationItem(rand, t, alias, colsOf(t));
      extraFrom.push(item.ast);
      used.push({ alias, table: `${t.schema}.${t.name}`, columns: item.columns,
        renamed: renameOf(colsOf(t), item.columns) });
      shapeParts.push("comma");
      continue;
    }

    // --- the default: follow a declared key ------------------------------
    const inTree = used.filter(u => treeAliases.has(u.alias));
    const candidates = edges.filter(e =>
      inTree.some(u => u.table === e.child) || inTree.some(u => u.table === e.parent));
    if (candidates.length === 0) continue;
    const edge = rand.pick(candidates);
    const childIn = inTree.some(u => u.table === edge.child);
    const parentIn = inTree.some(u => u.table === edge.parent);
    const addParent = edge.child === edge.parent ? rand.chance(0.5) : childIn && !parentIn;
    if (!addParent && parentIn === false) continue;
    const anchorTable = addParent ? edge.child : edge.parent;
    const anchors = inTree.filter(u => u.table === anchorTable);
    if (anchors.length === 0) continue;
    const anchor = rand.pick(anchors);
    const added = addParent ? edge.parent : edge.child;
    const addedTable = byId.get(added);
    if (!addedTable) continue;

    const kind = rand.pick(JOIN_KINDS);
    kinds.push(kind);
    const anchorCols = addParent ? edge.childColumns : edge.parentColumns;
    const addedCols = addParent ? edge.parentColumns : edge.childColumns;
    // A renamed item changes what the ON must say, so the key column is
    // translated through the alias list before the conjuncts are built.
    const addedCatalogCols = colsOf(addedTable);
    const item = relationItem(rand, addedTable, alias, addedCatalogCols);
    const renamedTo = (name: string): string => {
      const i = addedCatalogCols.findIndex(x => x.name === name);
      return i >= 0 ? item.columns[i]!.name : name;
    };
    const conjuncts2 = anchorCols.map((c, k) =>
      eq(colRef(anchor.alias, anchor.renamed.get(c) ?? c),
         colRef(alias, renamedTo(addedCols[k]!))));

    from = {
      JoinExpr: {
        jointype: kind,
        larg: from,
        rarg: item.ast,
        quals: conjuncts2.length === 1 ? conjuncts2[0]! : boolExpr("AND_EXPR", conjuncts2),
      },
    };
    used.push({ alias, table: added, columns: item.columns,
      renamed: renameOf(addedCatalogCols, item.columns) });
    treeAliases.add(alias);
    shapeParts.push(`${kind}:${addParent ? "child->parent" : "parent->child"}${item.form === "rel" ? "" : `/${item.form}`}`);
  }
  if (used.length < 2) return null;

  // Project a few columns per item, always at least one, so a claim exists.
  const targetList: Ast[] = [];
  const slots: Slot[] = [];
  for (const u of used) {
    if (u.columns.length === 0) continue;
    for (const c of u.columns) slots.push({ alias: u.alias, column: c.name, type: c.type });
    const take = Math.min(u.columns.length, rand.int(1, 3));
    const chosen = new Set<string>();
    for (let k = 0; k < take; k++) chosen.add(rand.pick(u.columns).name);
    for (const name of chosen) {
      targetList.push(target(colRef(u.alias, name), `${u.alias}_${name}`));
    }
  }
  if (targetList.length === 0) return null;

  // …and then some EXPRESSIONS over those columns (§9.1). Bare columns stay in
  // the list: they are what every existing claim was measured on, and an
  // expression target is an addition rather than a replacement.
  const byType = new Map<string, Slot[]>();
  for (const sl of slots) {
    const b = byType.get(sl.type);
    if (b) b.push(sl); else byType.set(sl.type, [sl]);
  }
  const exprForms: string[] = [];
  const wanted = rand.int(0, 3);
  for (let k = 0; k < wanted; k++) {
    const e = projectionExpr(rand, slots, byType);
    if (!e) continue;
    exprForms.push(e.form);
    targetList.push(target(e.ast, `e${k}_${e.form}`));
  }


  // A scalar SubLink target — uncorrelated, so it always has a value and
  // cannot fail; its nullability is the aggregate-over-empty question.
  if (rand.chance(0.15)) {
    const t = rand.pick(appTables);
    // `max` has no boolean or json form, so the column has to be one it takes.
    const orderable = colsOf(t).filter(x => !["boolean", "json", "jsonb"].includes(x.type) && !x.type.endsWith("[]"));
    if (orderable.length === 0) return null;
    const c = rand.pick(orderable);
    targetList.push(target(
      { SubLink: { subLinkType: "EXPR_SUBLINK", subselect: { SelectStmt: {
        targetList: [{ ResTarget: { val: { FuncCall: { funcname: [str("max")], args: [colRef("sq", c.name)], funcformat: "COERCE_EXPLICIT_CALL" } } } }],
        fromClause: [rangeVar(t.schema, t.name, "sq")],
        limitOption: "LIMIT_OPTION_DEFAULT", op: "SETOP_NONE" } } } },
      "sub_max"));
    exprForms.push("sublink");
  }

  // A quantified SubLink — IN, `= ANY`, `<> ALL`. Three more `subLinkType`
  // values the walk dispatches on, and unlike EXISTS their result depends on
  // the SUBQUERY's rows rather than only on whether any exist: `x <> ALL
  // (empty)` is TRUE, and `x = ANY (…)` over a NULL row is UNKNOWN.
  let quantified: Ast | null = null;
  if (rand.chance(0.12)) {
    const t = rand.pick(appTables);
    const p = nonKeyPair(t);
    if (p) {
      const kind = rand.int(0, 2);
      quantified = {
        SubLink: {
          subLinkType: kind === 2 ? "ALL_SUBLINK" : "ANY_SUBLINK",
          testexpr: colRef(p.anchor.alias, p.a),
          // Bare IN is an ANY_SUBLINK with no operator named.
          ...(kind === 0 ? {} : { operName: [str(kind === 2 ? "<>" : "=")] }),
          subselect: { SelectStmt: {
            targetList: [{ ResTarget: { val: colRef("qs", p.b) } }],
            fromClause: [rangeVar(t.schema, t.name, "qs")],
            limitOption: "LIMIT_OPTION_DEFAULT", op: "SETOP_NONE" } },
        },
      };
    }
  }

  // An EXISTS predicate, correlated on a same-typed column — the SubLink form
  // whose entailment the walk reasons about separately from a join's.
  let existsPred: Ast | null = null;
  if (rand.chance(0.12)) {
    const t = rand.pick(appTables);
    const p = nonKeyPair(t);
    if (p) {
      const corr = eq(colRef("ex", p.b), colRef(p.anchor.alias, p.a));
      // Sometimes a parameter conjunct beside the correlation — a parameter
      // INSIDE a subquery, where scope-boundary bugs in the collector would
      // live. Drawn from the subquery table's own values, like any literal.
      let inner: Ast = corr;
      if (rand.chance(0.4)) {
        const cands = colsOf(t)
          .map(c => ({ c, vs: (pool.get(`${t.schema}.${t.name}.${c.name}`) ?? []).filter(x => x !== null && literalFor(x) !== null) }))
          .filter(x => x.vs.length > 0);
        if (cands.length) {
          const pick = rand.pick(cands);
          inner = boolExpr("AND_EXPR", [corr, eq(colRef("ex", pick.c.name), P.ref(rand.pick(pick.vs), "exists-cmp"))]);
        }
      }
      existsPred = {
        SubLink: {
          subLinkType: "EXISTS_SUBLINK",
          subselect: { SelectStmt: {
            targetList: [{ ResTarget: { val: intConst(1) } }],
            fromClause: [rangeVar(t.schema, t.name, "ex")],
            whereClause: inner,
            limitOption: "LIMIT_OPTION_DEFAULT", op: "SETOP_NONE" } },
        },
      };
    }
  }

  // Retry: `whereClause` answers null when the column it picked has no
  // drawable literal, and one attempt made the real rate 54% against the 70%
  // this line asks for — a bound the report was stating wrongly. A FAILED
  // attempt may have allocated a parameter before the failing step, and its
  // node dies with the attempt — the allocation must die with it too, or the
  // statement binds more parameters than its text mentions.
  let where: { node: Ast; shape: string } | null = null;
  if (rand.chance(0.7)) {
    for (let attempt = 0; attempt < 5 && !where; attempt++) {
      const mark = P.list.length;
      where = whereClause(rand, used, pool, P.ref);
      if (!where) P.list.length = mark;
    }
  }
  // ANDed on the way the PARSER builds it: `a AND b AND c` is ONE flat
  // BoolExpr, so appending to an existing AND keeps the round trip identical
  // where wrapping it in a fresh AND reads as a changed tree.
  const andWith = (base: Ast, extra: Ast): Ast => {
    const b = base["BoolExpr"] as { boolop?: string; args?: Ast[] } | undefined;
    return b?.boolop === "AND_EXPR" && b.args
      ? boolExpr("AND_EXPR", [...b.args, extra])
      : boolExpr("AND_EXPR", [base, extra]);
  };
  for (const [node, tag] of [[existsPred, "EXISTS"], [quantified, "QUANT"]] as const) {
    if (!node) continue;
    where = where
      ? { node: andWith(where.node, node), shape: `${where.shape}+${tag}` }
      : { node, shape: tag };
  }

  let sel: Record<string, unknown> = {
    targetList,
    fromClause: [from, ...extraFrom],
    ...(where ? { whereClause: where.node } : {}),
    limitOption: "LIMIT_OPTION_DEFAULT",
    op: "SETOP_NONE",
  };
  // §9.4. FOR UPDATE is refused over the nullable side of an outer join, so
  // the decorator is told whether every join here was INNER. The set-op roll
  // happens FIRST because `setOperation` strips LIMIT off both arms — a limit
  // PARAMETER would be stripped from the text while staying in the binding
  // list, and the statement would bind more than it mentions.
  const allInner = kinds.every(k => k === "JOIN_INNER");
  const willSetOp = rand.chance(0.08);
  const dec = decorate(rand, sel, slots, allInner, willSetOp ? undefined : P.ref);
  sel = dec.sel;
  const clauseForms = [...dec.forms];

  // A projected parameter cast — §9's ParamRef, the one genuinely open node
  // that carried weight. The cast types the parameter, so all three forms are
  // deduction-safe, and each exercises a different mechanism of the argument
  // contract: `$n::nn_text` is mechanism A (the NOT NULL domain types the
  // parameter, NULL rejects at Bind, before any execution); `$n::text` is the
  // nullable control; `($n || '!')::nn_text` is mechanism C (the parameter
  // stays text-typed, and its VALUE — forced NULL through the strict
  // concatenation — hits the runtime domain coercion per row evaluated). The
  // value is a constant: a projected cast filters nothing, so drawing from
  // the pool would buy no overlap.
  //
  // AFTER decoration, not before: the GROUP BY decorator REPLACES the target
  // list, and a ParamRef discarded with it leaves its allocation behind — the
  // statement then binds more parameters than its text mentions, which is
  // the bind-arity rejection the first run produced 99 of. A parameter
  // target under GROUP BY is legal (it references no column), so appending
  // here is sound for every decoration.
  if (rand.chance(0.12)) {
    const tl = sel["targetList"] as Ast[];
    const roll = rand.int(0, 2);
    if (roll === 0) {
      tl.push(target(typeCast(P.ref("px", "cast-domain"), "nn_text"), "p_dom"));
      exprForms.push("param-domain");
    } else if (roll === 1) {
      tl.push(target(typeCast(P.ref("px", "cast-text"), "text"), "p_txt"));
      exprForms.push("param-cast");
    } else {
      tl.push(target(
        typeCast(
          op("||", P.ref("px", "cast-domain-flow"), { A_Const: { sval: { sval: "!" } } }),
          "nn_text"),
        "p_flow"));
      exprForms.push("param-flow");
    }
  }
  if (willSetOp) {
    const so = setOperation(rand, sel);
    sel = so.sel;
    clauseForms.push(so.form);
  }
  if (rand.chance(0.08)) {
    sel = asCte(sel);
    clauseForms.push("cte");
  }
  const stmt = { SelectStmt: sel };
  const sql = deparseSync(stmt as Parameters<typeof deparseSync>[0]);
  return {
    sql,
    ast: stmt,
    params: P.list,
    used: used.map(u => ({ alias: u.alias, table: u.table ?? "(function)" })),
    kinds,
    // Table identities matter here — the whole point is that the catalog
    // varies — so the shape keys on tables and join kinds, not on the aliases
    // or the projected column names. The WHERE contributes its STRUCTURE only,
    // for the same reason: a random literal must not mint a fresh shape.
    shape: `${used.map(u => u.table ?? "fn").join("+")}|${shapeParts.join(",")}|W:${where?.shape ?? "-"}` +
      `|E:${[...exprForms].sort().join(",") || "-"}` +
      `|C:${[...clauseForms].sort().join(",") || "-"}` +
      `|P:${[...new Set(P.list.map(p => p.site))].sort().join(",") || "-"}`,
  };
}

// ---------------------------------------------------------------------------
// MERGE — §9.3's deliberate omission, because its arms need the DATA arranged
// for them.
//
// §5.3: "MERGE arms only fire when the data makes them. `WHEN NOT MATCHED BY
// SOURCE` needs a target row with no source match. A source drawn entirely
// from the target's keys exercises one arm and never the others — measured the
// hard way in the sweep-4 fix phase, where a MERGE fixture's presence group
// reported 'present arm never observed' until the source was widened. Sources
// must straddle."
//
// So the source is built to straddle by construction: some keys drawn from the
// target's own seeded values (those MATCH), some past the end of its range
// (those do not), and the target keeps rows no source key names (that is the
// BY SOURCE arm). One VALUES list covers all three.
//
// `RETURNING merge_action()` is the only way to observe WHICH arm produced a
// row, and it is a node — `MergeSupportFunc` — that reaches the walk from
// nowhere else.
// ---------------------------------------------------------------------------

function buildMerge(
  rand: Rand,
  t: TableInfo,
  pool: ValuePool,
  rowPool: RowPool,
  partitioned: Set<string>,
): Built | null {
  const tableId = `${t.schema}.${t.name}`;
  const P = makeParams();
  // A single-column key to join on. A composite one would need a source of
  // matching arity, and the straddle would have to be built per column.
  const keyCon = t.constraints.find(
    c => (c.type === "primaryKey" || c.type === "unique") && c.columns.length === 1,
  );
  if (!keyCon) return null;
  const keyCol = keyCon.columns[0]!;
  const keyInfo = t.columns.find(c => c.name === keyCol);
  if (!keyInfo) return null;
  const existing = (pool.get(`${tableId}.${keyCol}`) ?? []).filter(v => v !== null);
  if (existing.length === 0) return null;
  const rows = rowPool.get(tableId) ?? [];
  if (rows.length === 0) return null;

  // The straddle. Matched keys come from the target; unmatched ones are past
  // the end of its range, the same rule the INSERT builder uses for a fresh
  // key. A partitioned target cannot take an invented key at all, so it gets
  // matched keys only and simply never fires its NOT MATCHED arm — reported
  // rather than hidden, since a source that cannot straddle is exactly what
  // §5.3 warns about.
  const routed = t.relkind === "p" || partitioned.has(tableId);
  const nums = existing.filter(v => typeof v === "number") as number[];
  const sourceKeys: Ast[] = [];
  for (const v of [...existing].slice(0, rand.int(1, 3))) {
    const lit = literalFor(v);
    if (!lit) continue;
    // A matched key sometimes arrives as a parameter. The cast types it — a
    // bare parameter in a VALUES row has no context to deduce from — and the
    // value then flows source → join condition → whichever arm acts on it,
    // which is the attribution path `forcedNullParams` resolves through
    // MERGE USING sources.
    sourceKeys.push(castableType(keyInfo.typeName) && rand.chance(0.3)
      ? typeCast(P.ref(v, "merge-source-key"), keyInfo.typeName)
      : lit);
  }
  let straddles = false;
  if (!routed && rand.chance(0.8)) {
    // An unmatched key must be legal as well as absent. When the target's key
    // is ALSO a foreign key — a 1:1 extension table like `order_gift_wrap`,
    // whose `id` is both its primary key and a reference to `orders.id` — a
    // value past the end of the range satisfies the key and violates the
    // reference. The parent's own values minus the ones the target already
    // carries are exactly the keys that are unmatched AND insertable.
    const keyFk = t.constraints.find(
      c => c.type === "foreign" && c.columns.length === 1 && c.columns[0] === keyCol,
    );
    let unmatched: Ast | null = null;
    if (keyFk?.foreignTable && keyFk.foreignColumns?.length === 1) {
      const parentId = `${keyFk.foreignSchema ?? t.schema}.${keyFk.foreignTable}`;
      const taken = new Set(existing.map(v => String(v)));
      const free = (pool.get(`${parentId}.${keyFk.foreignColumns[0]}`) ?? [])
        .filter(v => v !== null && !taken.has(String(v)));
      if (free.length) unmatched = literalFor(rand.pick(free));
    } else if (nums.length > 0) {
      unmatched = literalFor(Math.max(...nums) + rand.int(1000, 9000));
    }
    if (unmatched) { sourceKeys.push(unmatched); straddles = true; }
  }
  if (sourceKeys.length === 0) return null;

  const writable = writableColumns(t);
  const keys = keyColumns(t);
  const entangled = new Set<string>();
  for (const c of t.constraints) {
    if (c.columns.length > 1) for (const n of c.columns) entangled.add(n);
  }
  const settable = writable.filter(c => !keys.has(c.name) && !entangled.has(c.name));

  const setClause = (): Ast[] | null => {
    if (settable.length === 0) return null;
    const c = rand.pick(settable);
    const v = writtenValue(rand, tableId, c, pool, false);
    return v ? [{ ResTarget: { name: c.name, val: maybeParam(rand, v, P.ref, "merge-set", 0.3) } }] : null;
  };

  const arms: Ast[] = [];
  const armForms: string[] = [];
  const addArm = (matchKind: string, commandType: string, extra: Record<string, unknown> = {}): void => {
    arms.push({
      MergeWhenClause: {
        matchKind, commandType, override: "OVERRIDING_NOT_SET",
        // A per-arm condition narrows which rows the arm claims, and the walk
        // must not read it as narrowing the STATEMENT.
        ...(rand.chance(0.3) && matchKind !== "MERGE_WHEN_NOT_MATCHED_BY_TARGET"
          ? { condition: nullTest(colRef(t.name, rand.pick(t.columns).name), false) }
          : {}),
        ...extra,
      },
    });
    armForms.push(`${matchKind.replace("MERGE_WHEN_", "").toLowerCase()}:${commandType.replace("CMD_", "").toLowerCase()}`);
  };

  // WHEN MATCHED — update, delete, or decline.
  if (rand.chance(0.8)) {
    const roll = rand.int(0, 2);
    const sets = roll === 0 ? setClause() : null;
    if (roll === 0 && sets) addArm("MERGE_WHEN_MATCHED", "CMD_UPDATE", { targetList: sets });
    else if (roll === 1) addArm("MERGE_WHEN_MATCHED", "CMD_DELETE");
    else addArm("MERGE_WHEN_MATCHED", "CMD_NOTHING");
  }

  // WHEN NOT MATCHED (BY TARGET) — the INSERT arm. Its row is copied from an
  // existing one for the reason the INSERT builder copies: a row PostgreSQL
  // already accepted satisfies every constraint spanning more than one column.
  // Only the key moves, and it takes the SOURCE's key, which is unmatched by
  // definition and therefore free.
  if (straddles && rand.chance(0.8)) {
    const base = rand.pick(rows);
    const cols: string[] = [keyCol];
    const vals: Ast[] = [colRef("ms", "k")];
    for (const c of writable) {
      if (c.name === keyCol) continue;
      const required = c.notNull && !c.hasDefault && c.identity === null;
      if (!required && rand.chance(0.4)) continue;
      const lit = literalFor(base[c.name]);
      const v: WrittenValue | null = base[c.name] === null || base[c.name] === undefined
        ? (c.notNull ? writtenValue(rand, tableId, c, pool, false) : { ast: nullConst(), value: null })
        : (lit ? { ast: lit, value: base[c.name] } : null);
      if (!v) { if (required) return null; continue; }
      cols.push(c.name);
      vals.push(maybeParam(rand, v, P.ref, "merge-insert-value", 0.25));
    }
    addArm("MERGE_WHEN_NOT_MATCHED_BY_TARGET", "CMD_INSERT", {
      targetList: cols.map(n => ({ ResTarget: { name: n } })),
      values: vals,
    });
  }

  // WHEN NOT MATCHED BY SOURCE — a target row no source key names. DELETE here
  // would remove most of the table and take every referencing row's key with
  // it, so this arm updates or declines.
  if (rand.chance(0.45)) {
    const sets = rand.chance(0.6) ? setClause() : null;
    if (sets) addArm("MERGE_WHEN_NOT_MATCHED_BY_SOURCE", "CMD_UPDATE", { targetList: sets });
    else addArm("MERGE_WHEN_NOT_MATCHED_BY_SOURCE", "CMD_NOTHING");
  }

  if (arms.length === 0) return null;

  // RETURNING, and with it `merge_action()` — the only observable that says
  // WHICH arm produced a row.
  let ret: Ast | undefined;
  if (rand.chance(0.9)) {
    const cols = t.columns.filter(c => c.generated !== "virtual");
    const take = Math.min(cols.length, rand.int(1, 3));
    const chosen = new Set<string>();
    for (let k = 0; k < take; k++) chosen.add(rand.pick(cols).name);
    const exprs: Ast[] = [...chosen].map(n => target(colRef(t.name, n), `r_${n}`));
    if (rand.chance(0.5)) exprs.push(target({ MergeSupportFunc: { msftype: 25 } }, "r_action"));
    ret = { exprs };
  }

  const stmt = {
    MergeStmt: {
      relation: dmlRelation(t),
      sourceRelation: rangeSubselect(
        { SelectStmt: { valuesLists: sourceKeys.map(k => ({ List: { items: [k] } })), limitOption: "LIMIT_OPTION_DEFAULT", op: "SETOP_NONE" } },
        "ms", false),
      joinCondition: eq(colRef(t.name, keyCol), colRef("ms", "k")),
      mergeWhenClauses: arms,
      ...(ret ? { returningClause: ret } : {}),
    },
  };
  // The source alias needs its column name, which `rangeSubselect` does not
  // carry — a VALUES source is referenced by it in both the ON and the arms.
  ((stmt.MergeStmt.sourceRelation as Record<string, any>)["RangeSubselect"] as Record<string, unknown>)["alias"] =
    { aliasname: "ms", colnames: [str("k")] };

  return {
    sql: deparseSync(stmt as Parameters<typeof deparseSync>[0]),
    ast: stmt,
    params: P.list,
    used: [{ alias: t.name, table: tableId }],
    kinds: [],
    shape: `${tableId}|MERGE:${[...armForms].sort().join(",")}${straddles ? "+straddle" : ""}${ret ? "+RET" : ""}` +
      `|P:${[...new Set(P.list.map(p => p.site))].sort().join(",") || "-"}`,
  };
}

// ---------------------------------------------------------------------------
// Clause vocabulary — §9.4.
//
// Applied as DECORATIONS over a built SELECT rather than woven into it,
// because most of them are independent of how the FROM clause was assembled
// and the few that are not are mutually exclusive in ways SQL itself dictates:
// GROUP BY replaces the target list (only grouped columns and aggregates may
// appear), DISTINCT ON demands an ORDER BY that starts with the same
// expressions, and FOR UPDATE is refused over grouping, DISTINCT, a set
// operation or the nullable side of an outer join. Each guard below is one of
// those rules, not caution.
// ---------------------------------------------------------------------------

const sortBy = (node: Ast, rand: Rand): Ast => ({
  SortBy: {
    node,
    sortby_dir: rand.pick(["SORTBY_DEFAULT", "SORTBY_ASC", "SORTBY_DESC"]),
    sortby_nulls: rand.pick(["SORTBY_NULLS_DEFAULT", "SORTBY_NULLS_FIRST", "SORTBY_NULLS_LAST"]),
  },
});

const cteRangeVar = (name: string, alias: string): Ast =>
  ({ RangeVar: { relname: name, inh: true, relpersistence: "p", alias: { aliasname: alias } } });

const starTarget = (alias?: string): Ast => ({
  ResTarget: {
    val: { ColumnRef: { fields: alias ? [str(alias), { A_Star: {} }] : [{ A_Star: {} }] } },
  },
});

/** An aggregate over one slot, or `count(*)`. */
function aggregateTarget(rand: Rand, slots: Slot[], i: number): Ast {
  const numeric = slots.filter(sl => ["integer", "bigint", "smallint", "numeric", "double precision"].includes(sl.type));
  const roll = rand.int(0, 3);
  if (roll === 0 || slots.length === 0) {
    return target({ FuncCall: { funcname: [str("count")], agg_star: true, funcformat: "COERCE_EXPLICIT_CALL" } }, `a${i}_count`);
  }
  if (roll === 3 && numeric.length) {
    const sl = rand.pick(numeric);
    return target({ FuncCall: { funcname: [str("sum")], args: [colRef(sl.alias, sl.column)], funcformat: "COERCE_EXPLICIT_CALL" } }, `a${i}_sum`);
  }
  const sl = rand.pick(slots.filter(x => !["json", "jsonb", "boolean"].includes(x.type) && !x.type.endsWith("[]")) ) ?? rand.pick(slots);
  const fn = rand.pick(["max", "min", "count"]);
  return target({ FuncCall: { funcname: [str(fn)], args: [colRef(sl.alias, sl.column)], funcformat: "COERCE_EXPLICIT_CALL" } }, `a${i}_${fn}`);
}

/** A window function — DEFAULT frames only; an explicit one is un-deparsable. */
function windowTarget(rand: Rand, slots: Slot[], i: number): Ast | null {
  if (slots.length === 0) return null;
  const part = rand.pick(slots);
  const ord = rand.pick(slots);
  const over = {
    ...(rand.chance(0.7) ? { partitionClause: [colRef(part.alias, part.column)] } : {}),
    orderClause: [sortBy(colRef(ord.alias, ord.column), rand)],
    frameOptions: 1058,
  };
  const kind = rand.int(0, 3);
  const call = kind === 0
    ? { FuncCall: { funcname: [str("row_number")], over, funcformat: "COERCE_EXPLICIT_CALL" } }
    : kind === 1
      ? { FuncCall: { funcname: [str("rank")], over, funcformat: "COERCE_EXPLICIT_CALL" } }
      : kind === 2
        ? { FuncCall: { funcname: [str("lag")], args: [colRef(ord.alias, ord.column)], over, funcformat: "COERCE_EXPLICIT_CALL" } }
        : { FuncCall: { funcname: [str("count")], agg_star: true, over, funcformat: "COERCE_EXPLICIT_CALL" } };
  return target(call, `w${i}_${["rownum", "rank", "lag", "wcount"][kind]}`);
}

interface Decorated { sel: Record<string, unknown>; forms: string[] }

function decorate(
  rand: Rand,
  sel: Record<string, unknown>,
  slots: Slot[],
  allInner: boolean,
  pr?: ParamRefFn,
): Decorated {
  const forms: string[] = [];
  let grouped = false;

  // --- GROUP BY, which REPLACES the target list --------------------------
  if (slots.length > 0 && rand.chance(0.18)) {
    const groupCols = [rand.pick(slots), rand.pick(slots)].filter((v, i, a) => a.indexOf(v) === i);
    const refs = groupCols.map(sl => colRef(sl.alias, sl.column));
    const kind = rand.int(0, 3);
    const grouping = kind === 0
      ? refs
      : [{ GroupingSet: { kind: kind === 1 ? "GROUPING_SET_CUBE" : kind === 2 ? "GROUPING_SET_ROLLUP" : "GROUPING_SET_SETS", content: refs } }];
    sel["groupClause"] = grouping;
    const tl: Ast[] = groupCols.map((sl, i) => target(colRef(sl.alias, sl.column), `g${i}_${sl.column}`));
    for (let i = 0; i < rand.int(1, 2); i++) tl.push(aggregateTarget(rand, slots, i));
    // GROUPING() is only meaningful over a grouping set, and only over a
    // column the query groups by.
    if (kind !== 0) {
      tl.push(target({ GroupingFunc: { args: [refs[0]!] } }, "g_flag"));
    }
    sel["targetList"] = tl;
    // HAVING, which filters the GROUPS rather than the rows.
    if (rand.chance(0.3)) {
      sel["havingClause"] = op(">", { FuncCall: { funcname: [str("count")], agg_star: true, funcformat: "COERCE_EXPLICIT_CALL" } }, intConst(0));
      forms.push("having");
    }
    grouped = true;
    forms.push(kind === 0 ? "groupby" : ["", "cube", "rollup", "groupingsets"][kind]!);
  }

  // --- window functions, which cannot sit over a grouped target list -----
  let windowed = false;
  if (!grouped && slots.length > 0 && rand.chance(0.18)) {
    const w = windowTarget(rand, slots, 0);
    if (w) {
      (sel["targetList"] as Ast[]).push(w);
      windowed = true;
      forms.push("window");
    }
  }

  // --- SELECT * / t.* ----------------------------------------------------
  if (!grouped && rand.chance(0.1)) {
    const alias = rand.chance(0.5) ? slots[0]?.alias : undefined;
    (sel["targetList"] as Ast[]).push(starTarget(alias));
    forms.push(alias ? "qualstar" : "star");
  }

  // --- DISTINCT, and DISTINCT ON with the ORDER BY it requires -----------
  let distinctOn = false;
  if (!grouped && rand.chance(0.12)) {
    if (rand.chance(0.5) && slots.length) {
      // DISTINCT ON needs an ORDER BY starting with the same expressions, and
      // under DISTINCT every ORDER BY expression must APPEAR IN THE SELECT
      // LIST — so the column is drawn from the target list rather than from
      // the scope, or PostgreSQL rejects the statement.
      const sl = rand.pick(slots);
      (sel["targetList"] as Ast[]).push(target(colRef(sl.alias, sl.column), `d_${sl.column}`));
      sel["distinctClause"] = [colRef(sl.alias, sl.column)];
      sel["sortClause"] = [sortBy(colRef(sl.alias, sl.column), rand)];
      distinctOn = true;
      forms.push("distincton");
    } else {
      sel["distinctClause"] = [{}];
      forms.push("distinct");
    }
  }

  // --- ORDER BY ----------------------------------------------------------
  if (!distinctOn && !grouped && slots.length && rand.chance(0.25)) {
    // Same rule when plain DISTINCT is present: order by a column the target
    // list carries, which the first slot is not guaranteed to be.
    const sl = rand.pick(slots);
    if (sel["distinctClause"]) {
      (sel["targetList"] as Ast[]).push(target(colRef(sl.alias, sl.column), `o_${sl.column}`));
    }
    sel["sortClause"] = [sortBy(colRef(sl.alias, sl.column), rand)];
    forms.push("orderby");
  }

  // --- LIMIT / OFFSET ----------------------------------------------------
  // Sometimes a parameter — the placement where NULL is LEGAL (`LIMIT NULL`
  // means no limit), so the contract must stay nullable and a variant binding
  // proves it executes.
  if (rand.chance(0.15)) {
    const n = rand.int(1, 20);
    sel["limitCount"] = pr && rand.chance(0.3) ? pr(n, "limit") : intConst(n);
    sel["limitOption"] = "LIMIT_OPTION_COUNT";
    if (rand.chance(0.4)) {
      const o = rand.int(0, 3);
      sel["limitOffset"] = pr && rand.chance(0.3) ? pr(o, "offset") : intConst(o);
    }
    forms.push("limit");
  }

  // --- FOR UPDATE, which every clause above forbids ----------------------
  if (allInner && !grouped && !windowed && !sel["distinctClause"] && rand.chance(0.05)) {
    sel["lockingClause"] = [{ LockingClause: { strength: rand.pick(["LCS_FORUPDATE", "LCS_FORSHARE"]), waitPolicy: "LockWaitBlock" } }];
    forms.push("forupdate");
  }

  return { sel, forms };
}

/** `a UNION b` over two arms of the same shape, so the types line up. */
function setOperation(rand: Rand, sel: Record<string, unknown>): { sel: Record<string, unknown>; form: string } {
  const right = JSON.parse(JSON.stringify(sel)) as Record<string, unknown>;
  // A set operation forbids these on its ARMS; they belong to the whole.
  for (const k of ["sortClause", "limitCount", "limitOffset", "lockingClause", "distinctClause"]) {
    delete right[k]; delete sel[k];
  }
  sel["limitOption"] = "LIMIT_OPTION_DEFAULT";
  right["limitOption"] = "LIMIT_OPTION_DEFAULT";
  const op_ = rand.pick(["SETOP_UNION", "SETOP_INTERSECT", "SETOP_EXCEPT"]);
  const all = rand.chance(0.5);
  return {
    sel: { op: op_, ...(all ? { all: true } : {}), larg: sel, rarg: right, limitOption: "LIMIT_OPTION_DEFAULT" },
    form: `${op_.replace("SETOP_", "").toLowerCase()}${all ? "-all" : ""}`,
  };
}

/** `WITH c AS (…) SELECT * FROM c` — the query becomes its own CTE. */
function asCte(sel: Record<string, unknown>): Record<string, unknown> {
  return {
    withClause: { ctes: [{ CommonTableExpr: { ctename: "cte0", ctematerialized: "CTEMaterializeDefault", ctequery: { SelectStmt: sel } } }] },
    targetList: [starTarget()],
    fromClause: [cteRangeVar("cte0", "c0")],
    limitOption: "LIMIT_OPTION_DEFAULT",
    op: "SETOP_NONE",
  };
}

// ---------------------------------------------------------------------------
// DML — §9.3.
//
// `RETURNING` is the only observable: without it a modifying statement has no
// output columns, so no nullability claims and no rank-1 signal. It goes on
// almost every statement, and the fraction without one is deliberate — the
// no-output path is a shape too.
//
// The whole difficulty is §5.3's second point: a random written value collides
// on a primary key (23505), dangles a foreign key (23503) or fails a CHECK
// (23514), and the statement raises before it returns anything. The rule that
// makes almost all of it work is to draw every value from the column's OWN
// seeded values — those came out of rows PostgreSQL already accepted, so every
// single-column CHECK and every foreign key holds by construction. The
// exception is a key column, where drawing from the pool guarantees the
// collision instead of avoiding it, so those get a value past the end of the
// existing range.
// ---------------------------------------------------------------------------

const setToDefault = (): Ast => ({ SetToDefault: {} });
const nullConst = (): Ast => ({ A_Const: { isnull: true } });

/** Columns a statement may WRITE: not generated, not an ALWAYS identity. */
const writableColumns = (t: TableInfo) =>
  t.columns.filter(c => c.generated === "none" && c.identity !== "always");

/** The single-column key columns of a table, which must not be drawn from. */
function keyColumns(t: TableInfo): Set<string> {
  const out = new Set<string>();
  for (const c of t.constraints) {
    if (c.type === "primaryKey" || c.type === "unique") for (const n of c.columns) out.add(n);
  }
  return out;
}

/**
 * A value for one column, carrying both spellings: the literal node, and the
 * raw value a call site may BIND instead — a parameter where a literal stood
 * is the argument contract's whole entry point into DML. `fresh` means "must
 * not already exist" — past the end of the numeric range, or a string nothing
 * carries.
 */
interface WrittenValue { ast: Ast; value: unknown }

function writtenValue(
  rand: Rand, tableId: string, col: { name: string; typeName: string; notNull: boolean },
  pool: ValuePool, fresh: boolean,
): WrittenValue | null {
  const values = (pool.get(`${tableId}.${col.name}`) ?? []).filter(v => v !== null);
  if (fresh) {
    const nums = values.filter(v => typeof v === "number") as number[];
    if (nums.length) {
      const v = Math.max(...nums) + rand.int(1000, 9000);
      return { ast: literalFor(v)!, value: v };
    }
    if (values.some(v => typeof v === "string")) {
      const v = `gen-${rand.int(1, 1e6)}`;
      return { ast: literalFor(v)!, value: v };
    }
    return null;
  }
  if (values.length === 0) return col.notNull ? null : { ast: nullConst(), value: null };
  // A nullable column is sometimes written NULL on purpose: that is the value
  // whose claim the engine is making.
  if (!col.notNull && rand.chance(0.2)) return { ast: nullConst(), value: null };
  const v = rand.pick(values);
  const ast = literalFor(v);
  return ast ? { ast, value: v } : null;
}

/**
 * A written value as a literal or, sometimes, as a parameter. A NULL control
 * value stays a literal — binding NULL as the CONTROL makes the variant
 * indistinguishable from it, which buys nothing.
 */
function maybeParam(rand: Rand, v: WrittenValue, pr: ParamRefFn, site: string, chance: number): Ast {
  return v.value !== null && rand.chance(chance) ? pr(v.value, site) : v.ast;
}

/** `col = <a value the table actually holds>` — a WHERE that matches. As a
 *  parameter it exercises the DML RETURNING scope's narrowing paths; binding
 *  NULL later just matches nothing, which is the legal-and-empty shape. */
function matchingWhere(rand: Rand, t: TableInfo, tableId: string, pool: ValuePool, pr?: ParamRefFn): Ast | null {
  const options = t.columns.filter(c => (pool.get(`${tableId}.${c.name}`) ?? []).length > 0);
  if (options.length === 0) return null;
  const col = rand.pick(options);
  const v = rand.pick(pool.get(`${tableId}.${col.name}`)!);
  const lit = literalFor(v);
  if (!lit) return null;
  return op("=", colRef(t.name, col.name), pr && rand.chance(0.3) ? pr(v, "dml-where") : lit);
}

function returningOf(rand: Rand, t: TableInfo): Ast | undefined {
  // The fraction with no RETURNING is deliberate — a modifying statement with
  // no output columns is its own shape, and the engine must say so.
  if (rand.chance(0.1)) return undefined;
  const cols = t.columns.filter(c => c.generated !== "virtual");
  const take = Math.min(cols.length, rand.int(1, 4));
  const chosen = new Set<string>();
  for (let k = 0; k < take; k++) chosen.add(rand.pick(cols).name);
  return { exprs: [...chosen].map(n => target(colRef(t.name, n), `r_${n}`)) };
}

const dmlRelation = (t: TableInfo): Ast =>
  ({ schemaname: t.schema, relname: t.name, inh: true, relpersistence: "p" });

function buildDml(rand: Rand, t: TableInfo, pool: ValuePool, rowPool: RowPool, partitioned: Set<string>): Built | null {
  const tableId = `${t.schema}.${t.name}`;
  const P = makeParams();
  const keys = keyColumns(t);
  // A key column that is ALSO a foreign key cannot be given a fresh value:
  // `order_gift_wrap.id` is its own primary key AND a reference to
  // `orders.id`, so inventing one past the range satisfies the key and
  // violates the reference. Those columns keep the sampled value, which means
  // the insert WILL collide — so it carries ON CONFLICT.
  const fkCols = new Set<string>();
  for (const c of t.constraints) {
    if (c.type === "foreign") for (const n of c.columns) fkCols.add(n);
  }
  const keyIsReference = [...keys].some(k => fkCols.has(k));
  // Columns bound to a sibling by a MULTI-COLUMN constraint — a composite
  // foreign key, or a CHECK over a pair. An INSERT copies a whole row so it
  // never breaks one; an UPDATE setting a single column does, which is what
  // `stock_check`, `subscription_check` and `leg_scans`' composite key were
  // raising on. They stay readable and are not written.
  const entangled = new Set<string>();
  for (const c of t.constraints) {
    if (c.columns.length > 1) for (const n of c.columns) entangled.add(n);
  }
  const writable = writableColumns(t);
  if (writable.length === 0) return null;
  const ret = returningOf(rand, t);
  const shapeOf = (kind: string) =>
    `${tableId}|DML:${kind}${ret ? "+RET" : ""}` +
    `|P:${[...new Set(P.list.map(p => p.site))].sort().join(",") || "-"}`;

  const kind = rand.int(0, 4);

  // --- INSERT, optionally ON CONFLICT ------------------------------------
  if (kind === 0 || kind === 1) {
    const rows = rowPool.get(tableId) ?? [];
    if (rows.length === 0) return null;
    const base = rand.pick(rows);
    // A partition (or a partitioned parent, whose rows route into one) cannot
    // take a fresh key: the value has to stay inside a range this generator
    // does not know. It keeps the sampled key and handles the collision.
    const routed = t.relkind === "p" || partitioned.has(tableId) || keyIsReference;
    const cols: string[] = [];
    const vals: Ast[] = [];
    for (const c of writable) {
      const required = c.notNull && !c.hasDefault && c.identity === null;
      if (!required && rand.chance(0.3)) continue;
      if (c.hasDefault && rand.chance(0.2)) { cols.push(c.name); vals.push(setToDefault()); continue; }
      let v: WrittenValue | null;
      let site = "insert-value";
      if (keys.has(c.name) && !routed && !fkCols.has(c.name)) {
        v = writtenValue(rand, tableId, c, pool, true);
        site = "insert-key";
      } else if (base[c.name] === null || base[c.name] === undefined) {
        v = c.notNull ? writtenValue(rand, tableId, c, pool, false) : { ast: nullConst(), value: null };
      } else {
        const lit = literalFor(base[c.name]);
        v = lit ? { ast: lit, value: base[c.name] } : null;
      }
      if (!v) { if (required) return null; continue; }
      cols.push(c.name);
      // A parameter in a VALUES position is typed by its target column, which
      // is where mechanisms A and B live: a NOT NULL domain rejects at Bind,
      // a plain NOT NULL constraint per row written.
      vals.push(maybeParam(rand, v, P.ref, site, 0.3));
    }
    if (cols.length === 0) return null;

    // ON CONFLICT infers a WHOLE unique constraint — one column of a composite
    // key matches no index and PostgreSQL rejects the specification.
    const keyCon = t.constraints.find(c => c.type === "primaryKey" || c.type === "unique");
    const settable = writable.filter(x => !keys.has(x.name) && !entangled.has(x.name));
    // A routed target always attaches ON CONFLICT, because its key is reused.
    // Decided BEFORE the SET expression is built: building it first allocated
    // an `onconflict-set` parameter that the unattached clause then dropped —
    // the statement bound more than its text mentioned, ~160 bind-arity
    // rejections per 20,000 at seed 7, hiding in pg-raised's tail at other
    // seeds until the class was tiered TOOL.
    const wantConflict = (kind === 1 || routed) && keyCon && keyCon.columns.length > 0;
    const conflictSets = wantConflict && settable.length
      ? (() => {
          const c = rand.pick(settable);
          const v = writtenValue(rand, tableId, c, pool, false);
          return v ? [{ ResTarget: { name: c.name, val: maybeParam(rand, v, P.ref, "onconflict-set", 0.3) } }] : [];
        })()
      : [];
    const onConflict = wantConflict
      ? {
          onConflictClause: {
            // `DO UPDATE SET` with nothing to set is a syntax error, so an
            // empty assignment list becomes DO NOTHING rather than nothing.
            action: conflictSets.length ? "ONCONFLICT_UPDATE" : "ONCONFLICT_NOTHING",
            infer: { indexElems: keyCon!.columns.map(n => ({ IndexElem: { name: n, ordering: "SORTBY_DEFAULT", nulls_ordering: "SORTBY_NULLS_DEFAULT" } })) },
            ...(conflictSets.length ? { targetList: conflictSets } : {}),
          },
        }
      : {};
    const stmt = {
      InsertStmt: {
        relation: dmlRelation(t),
        cols: cols.map(n => ({ ResTarget: { name: n } })),
        selectStmt: { SelectStmt: { valuesLists: [{ List: { items: vals } }], limitOption: "LIMIT_OPTION_DEFAULT", op: "SETOP_NONE" } },
        ...onConflict,
        ...(ret ? { returningClause: ret } : {}),
        override: "OVERRIDING_NOT_SET",
      },
    };
    return {
      sql: deparseSync(stmt as Parameters<typeof deparseSync>[0]),
      ast: stmt,
      params: P.list,
      used: [{ alias: t.name, table: tableId }], kinds: [],
      shape: shapeOf(wantConflict ? "insert-onconflict" : "insert"),
    };
  }

  // --- UPDATE, sometimes with a multi-column assignment ------------------
  if (kind === 2 || kind === 3) {
    const settable = writable.filter(c => !keys.has(c.name) && !entangled.has(c.name));
    if (settable.length === 0) return null;
    const where = matchingWhere(rand, t, tableId, pool, P.ref);
    if (!where) return null;
    let targetList: Ast[];
    let form = "update";
    if (kind === 3 && settable.length >= 2) {
      // `SET (a, b) = (SELECT …)` — the MultiAssignRef node, reachable no
      // other way. Both assignments share ONE source SubLink.
      const [a, b] = [rand.pick(settable), rand.pick(settable.filter(x => x !== settable[0]))];
      if (!a || !b || a === b) return null;
      if (!castableType(a.typeName) || !castableType(b.typeName)) return null;
      const va = writtenValue(rand, tableId, a, pool, false);
      const vb = writtenValue(rand, tableId, b, pool, false);
      if (!va || !vb) return null;
      // Inside a subquery a bare literal types as TEXT rather than staying
      // unknown, so a numeric or domain column rejects it — the cast is what
      // makes `SET (a, b) = (SELECT …)` assignable at all. A parameter under
      // the same cast rides the multi-assignment into its target column,
      // which is value-flow attribution through a derived source.
      const source = { SubLink: { subLinkType: "EXPR_SUBLINK", subselect: { SelectStmt: {
        targetList: [
          { ResTarget: { val: typeCast(maybeParam(rand, va, P.ref, "multiassign", 0.3), a.typeName) } },
          { ResTarget: { val: typeCast(maybeParam(rand, vb, P.ref, "multiassign", 0.3), b.typeName) } },
        ],
        limitOption: "LIMIT_OPTION_DEFAULT", op: "SETOP_NONE" } } } };
      targetList = [
        { ResTarget: { name: a.name, val: { MultiAssignRef: { source, colno: 1, ncolumns: 2 } } } },
        { ResTarget: { name: b.name, val: { MultiAssignRef: { source, colno: 2, ncolumns: 2 } } } },
      ];
      form = "update-multiassign";
    } else {
      const c = rand.pick(settable);
      const v = writtenValue(rand, tableId, c, pool, false);
      if (!v) return null;
      let val: Ast = v.ast;
      if (v.value !== null && rand.chance(0.35)) {
        const v2 = c.notNull && rand.chance(0.4) ? writtenValue(rand, tableId, c, pool, false) : null;
        if (v2 && v2.value !== null) {
          // `SET col = COALESCE($a, $b)` into a rejecting column — the JOINT
          // rejection set {a, b}: neither parameter alone raises (COALESCE
          // absorbs one NULL), binding both together does. The end-to-end
          // exercise of `paramRejectionSets`, and of the harness's
          // all-members-NULL variant.
          val = { CoalesceExpr: { args: [P.ref(v.value, "coalesce-set"), P.ref(v2.value, "coalesce-set")] } };
          form = "update-coalesce-params";
        } else {
          val = P.ref(v.value, "update-set");
        }
      }
      targetList = [{ ResTarget: { name: c.name, val } }];
    }
    const stmt = {
      UpdateStmt: {
        relation: dmlRelation(t), targetList, whereClause: where,
        ...(ret ? { returningClause: ret } : {}),
      },
    };
    return {
      sql: deparseSync(stmt as Parameters<typeof deparseSync>[0]),
      ast: stmt,
      params: P.list,
      used: [{ alias: t.name, table: tableId }], kinds: [], shape: shapeOf(form),
    };
  }

  // --- DELETE -------------------------------------------------------------
  const where = matchingWhere(rand, t, tableId, pool, P.ref);
  if (!where) return null;
  const stmt = {
    DeleteStmt: {
      relation: dmlRelation(t), whereClause: where,
      ...(ret ? { returningClause: ret } : {}),
    },
  };
  return {
    sql: deparseSync(stmt as Parameters<typeof deparseSync>[0]),
    ast: stmt,
    params: P.list,
    used: [{ alias: t.name, table: tableId }], kinds: [], shape: shapeOf("delete"),
  };
}

// ---------------------------------------------------------------------------
// Buckets — §6. Every query lands in exactly one; an outcome nothing
// classifies fails the run rather than being swallowed.
// ---------------------------------------------------------------------------

type Bucket =
  | "generator-threw" | "deparse-threw" | "reparse-failed" | "ast-differed"
  | "pg-rejected" | "pg-raised"
  | "engine-refused" | "engine-crashed" | "shape-mismatch" | "notnull-violated"
  | "param-violated" | "value-conditional" | "always-raises-violated"
  | "group-violated" | "parity-broke" | "agreed-rows" | "agreed-norows";

const TIER: Record<Bucket, "TOOL" | "BUDGET" | "FINDING" | "EXPECTED" | "OK"> = {
  "generator-threw": "TOOL", "deparse-threw": "TOOL", "reparse-failed": "TOOL",
  "ast-differed": "TOOL",
  "pg-rejected": "TOOL", "pg-raised": "BUDGET",
  "engine-refused": "EXPECTED",
  "engine-crashed": "FINDING", "shape-mismatch": "FINDING", "notnull-violated": "FINDING",
  "param-violated": "FINDING",
  // Adjudicated non-claimable, not a defect: the raise is conditioned on a
  // sibling parameter's VALUE (the all-NULL corner passes — see
  // ProbeResult.valueConditional). EXPECTED like engine-refused; the count
  // is the revisit trigger for the value-conditional decision.
  "value-conditional": "EXPECTED",
  // The statement-level claim, falsified: the contract says this write
  // rejects on EVERY execution and the control run wrote the row. Its
  // own bucket because the claim is about the statement — the column and
  // parameter buckets would both name it wrongly.
  "always-raises-violated": "FINDING",
  "group-violated": "FINDING", "parity-broke": "FINDING",
  "agreed-rows": "OK", "agreed-norows": "OK",
};

// ---------------------------------------------------------------------------
// The round-trip guard — §5.4.
//
// Anything the deparser mangles or DROPS is a construct the run believes it
// tested and did not: the text PostgreSQL and the engine both see simply lacks
// it, so every downstream bucket agrees and nothing notices. `reparse-failed`
// only catches the loud half. The quiet half is caught by comparing the tree
// parsed back from the emitted SQL against the tree the generator built — a
// query whose round trip is not identical is counted, classified and DISCARDED
// from finding analysis, because we cannot claim the text tests what the AST
// asked for.
//
// Byte offsets are stripped before comparing — `location` on most nodes, and
// `list_start`/`list_end`, the bracket positions the parser stamps on
// `A_ArrayExpr` — because the parser has a source text to point into and the
// generator does not. Keys are sorted because the two sides build their
// objects in different orders. Nothing else is normalised: §5.4's expectation
// is that the trees match EXACTLY, and a harmless systematic difference,
// when one appears, is made to match rather than allowed for — the first run
// surfaced two (the parser flattens `a AND b AND c` into one three-arm
// BoolExpr, and re-reads a keyword cast target as its `pg_catalog` name) and
// both were fixed by making the GENERATOR build what the parser builds.
// ---------------------------------------------------------------------------

const OFFSET_KEYS = new Set(["location", "list_start", "list_end"]);

function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v).sort()) {
      if (OFFSET_KEYS.has(k)) continue;
      out[k] = canonical((v as Record<string, unknown>)[k]);
    }
    return out;
  }
  return v;
}

/** The first path where two canonical trees disagree — the CLASS of a
 *  round-trip difference, so the report groups by what changed rather than
 *  listing every query it changed in. */
function firstDiff(a: unknown, b: unknown, path = "$"): string {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return `${path}: ${a.length} items became ${b.length}`;
    for (let i = 0; i < a.length; i++) {
      if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return firstDiff(a[i], b[i], `${path}[${i}]`);
    }
    return path;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ao = a as Record<string, unknown>, bo = b as Record<string, unknown>;
    for (const k of new Set([...Object.keys(ao), ...Object.keys(bo)])) {
      if (!(k in ao)) return `${path}.${k}: only after reparse`;
      if (!(k in bo)) return `${path}.${k}: dropped`;
      if (JSON.stringify(ao[k]) !== JSON.stringify(bo[k])) return firstDiff(ao[k], bo[k], `${path}.${k}`);
    }
    return path;
  }
  return `${path}: ${JSON.stringify(a)} became ${JSON.stringify(b)}`;
}

function classify(r: ProbeResult): Bucket {
  if (r.error) return r.error.startsWith("UnsupportedNodeError") ? "engine-refused" : "engine-crashed";
  if (r.pgError) {
    // A deduction failure means the generator emitted a parameter in a
    // position PostgreSQL cannot type — a TOOL defect by decision, never a fallback.
    // A bind-arity mismatch is the sibling defect: an allocation whose node
    // was dropped from the tree, so the statement binds more than its text
    // mentions. Both are the generator's bugs, never budget.
    if (DEDUCTION_FAILURE.test(r.pgError) || /bind message supplies/.test(r.pgError)) {
      return "pg-rejected";
    }
    return /syntax error|does not exist|ambiguous/i.test(r.pgError) ? "pg-rejected" : "pg-raised";
  }
  if (r.shape) return "shape-mismatch";
  if (r.alwaysRaisesViolated) return "always-raises-violated";
  if (r.violations.length) return "notnull-violated";
  if (r.paramViolations.length) return "param-violated";
  if (r.valueConditional.length) return "value-conditional";
  if (r.groupViolations.length) return "group-violated";
  if (r.parity) return "parity-broke";
  return r.rows.length > 0 ? "agreed-rows" : "agreed-norows";
}

// ---------------------------------------------------------------------------
// The finding fingerprint — §6.
//
// What groups instances of ONE defect, so a report reads "one finding, 340
// instances" instead of 340 findings. The first version keyed on the query
// SHAPE plus the failure message, and both are properties of the QUERY rather
// than of the bug: the alias-column-list defect reported as 108 findings
// because every query that tripped it produced a different pair of column
// lists. §6 predicted exactly that ("expect the first version to be too
// specific rather than too loose, because that is the direction that
// flatters"), and establishing it was one bug took a manual experiment the
// report should have done.
//
// So it keys on the CAUSE. For a per-column finding the traced walk already
// names the rule that concluded — "CHECK-constraint entailment (row) →
// notNull", "catalog.notNull=true && join REQUIRED" — and those strings
// describe the rule, not the query, so two unrelated queries tripping one bug
// collide and two bugs never do. That second direction matters more than the
// first: fragmentation is noise, but MERGING two distinct defects would hide
// one.
//
// Identifiers are stripped, because some reasons embed a relation name
// (`viewDefinition public.orders`) and the same bug over three tables must not
// read as three.
// ---------------------------------------------------------------------------

const normalise = (s: string): string =>
  s.replace(/"[^"]*"/g, "\"…\"")        // quoted identifiers
    .replace(/\b\w+\.\w+\b/g, "…")      // schema.table / alias.column
    .replace(/\b\d+\b/g, "N")
    .trim();

function fingerprint(bucket: Bucket, r: ProbeResult, built: Built): string {
  switch (bucket) {
    case "notnull-violated":
    case "group-violated": {
      // The offending columns' decisive reasons, deduped and ordered so the
      // key does not depend on which column the harness happened to list
      // first.
      const idx = [...r.violations, ...r.groupViolations]
        .map(v => /col (\d+)|\{([\d,]+)\}/.exec(v))
        .flatMap(m => (m ? (m[1] ? [Number(m[1])] : (m[2] ?? "").split(",").map(Number)) : []));
      const reasons = [...new Set(idx.map(i => normalise(r.traced[i]?.reason ?? "?")))].sort();
      return `${bucket}|${reasons.join(" + ") || "no-trace"}`;
    }
    case "shape-mismatch": {
      // No offending column — the whole list disagrees — so there is no rule
      // to name. §6's fallback: the CONSTRUCTS that triggered it, plus whether
      // the arity survived, which separates a permutation from a drop.
      const engine = r.engineColumns.length, pg = r.pgColumns.length;
      // The FROM-item FORMS present, as a set — not the join sequence, not the
      // WHERE, not the expressions. Those are all properties of the query, and
      // keying on them is what fragmented this bucket in the first place.
      const ITEM_FORMS = ["rel", "derived", "sample", "aliasall", "aliaspart",
                          "srf", "rowsfrom", "lateral", "comma"];
      const forms = [...new Set(
        (built.shape.split("|")[1] ?? "")
          .split(",")
          .flatMap(part => ITEM_FORMS.filter(f => part.split(/[:\/]/).includes(f))),
      )].sort().join(",");
      const star = /C:[^|]*\bstar\b/.test(built.shape) || /qualstar/.test(built.shape);
      return `${bucket}|${engine === pg ? "same-arity" : "arity-differs"}|from:${forms}|${star ? "star" : "no-star"}`;
    }
    case "param-violated": {
      // The SITE the parameter occupies plus the raise's normalised message —
      // the placement class is the causal axis here, the way the traced
      // reason is for a column claim. Never the parameter number or the
      // query: one collector defect fires from one site class across many
      // statements.
      const nums = [...new Set(
        r.paramViolations.map(v => /^\$(\d+)/.exec(v)?.[1]).filter((x): x is string => !!x),
      )];
      const sites = [...new Set(nums.map(n => built.params[Number(n) - 1]?.site ?? "?"))].sort();
      const msgs = [...new Set(
        r.paramViolations.map(v => normalise(v.replace(/^\$\d+ claimed nullable, binding NULL raised: /, ""))),
      )].sort();
      return `${bucket}|${sites.join(",") || "arity"}|${msgs.join(" + ")}`;
    }
    case "value-conditional": {
      // Same causal axis as param-violated — the SITE class plus the raise's
      // normalised message — so a growing bucket reads as one shape with a
      // count, which is exactly what the revisit trigger needs.
      const nums = [...new Set(
        r.valueConditional.map(v => /^\$(\d+)/.exec(v)?.[1]).filter((x): x is string => !!x),
      )];
      const sites = [...new Set(nums.map(n => built.params[Number(n) - 1]?.site ?? "?"))].sort();
      const msgs = [...new Set(
        r.valueConditional.map(v =>
          normalise(v.replace(/^\$\d+ raised beside sibling values, all-NULL passes: /, "")),
        ),
      )].sort();
      return `${bucket}|${sites.join(",") || "arity"}|${msgs.join(" + ")}`;
    }
    case "always-raises-violated":
      // The WRITE SHAPE the flag came off — `DML:insert`,
      // `DML:insert-onconflict` — which is the causal axis here: the
      // universality rule is per shape, so two shapes getting it wrong are
      // two defects and one shape over three tables is one. Table names
      // stay out, as everywhere else in this function.
      return `${bucket}|${/DML:[a-z-]+/.exec(built.shape)?.[0] ?? "no-dml-shape"}`;
    case "parity-broke":
      return `${bucket}|${normalise(r.parity ?? "")}`;
    case "engine-crashed":
      return `${bucket}|${normalise(r.error ?? "")}`;
    default:
      return `${bucket}|${normalise(r.error ?? r.pgError ?? "")}`;
  }
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const COUNT = Number(process.argv[2] ?? 2000);
const SEED = Number(process.argv[3] ?? 20260808);
/**
 * The WASM backend exhausts itself under sustained protocol traffic —
 * measured at seed 7, ~28,000 executions in (the binding variants raised
 * per-query traffic ~50%): one query raised 54001 "stack depth limit
 * exceeded" with the clearing ROLLBACK re-raising it, and past the
 * in-process recovery the next death was a SIGBUS no JavaScript catches.
 * Not a poisonous statement — the same query is clean on a fresh backend —
 * so the backend is recycled on a fixed cadence, the dataset replayed
 * verbatim, and every query still sees the same rows.
 */
const RECYCLE_EVERY = 5000;

let loop = await ProbeLoop.create();
const snapshot = await snapshotCatalog(loop.pg);
// One dataset for the whole session: `run` wraps each query in
// BEGIN/ROLLBACK, so anything seeded here survives every query and every
// query sees the same rows. Generated ONCE and replayed verbatim on every
// recycled backend, so the invariant survives recycling.
const DATA_SQL = generateFixtureData(snapshot, { registry: fixtureGeneratorRegistry }).sql;
await loop.pg.exec(DATA_SQL);

// Values the seeded data actually holds, per column, for drawing predicate
// literals from (§3). Sampled once — the dataset does not change, since every
// query runs inside its own rolled-back transaction.
const pool: ValuePool = new Map();
for (const t of snapshot.tables) {
  if (t.relkind === "p") continue; // a partitioned parent's rows live in its partitions
  for (const c of t.columns) {
    if (c.generated === "virtual") continue;
    try {
      const res = await loop.pg.query<Record<string, unknown>>(
        `SELECT DISTINCT "${c.name}" AS v FROM "${t.schema}"."${t.name}" WHERE "${c.name}" IS NOT NULL LIMIT 8`,
      );
      const vs = res.rows.map(r => r["v"]).filter(v => v !== null && v !== undefined);
      if (vs.length) pool.set(`${t.schema}.${t.name}.${c.name}`, vs);
    } catch {
      // A type DISTINCT cannot order (json has no equality operator): that
      // column simply contributes no literals.
    }
  }
}

const tableIds = snapshot.tables.map(t => `${t.schema}.${t.name}`);
const inheritsRows = await loop.pg.query<{ child: string; parent: string }>(
  `SELECT cc.relname AS child, pc.relname AS parent
     FROM pg_inherits i
     JOIN pg_class cc ON cc.oid = i.inhrelid
     JOIN pg_class pc ON pc.oid = i.inhparent
    WHERE cc.relkind IN ('r','p','f')`,
);
const childToParent = new Map(inheritsRows.rows.map(r => [r.child, r.parent]));
const edges = edgesOf(snapshot, childToParent);

// Whole rows, for the INSERT builder (see RowPool).
const rowPool: RowPool = new Map();
for (const t of snapshot.tables) {
  try {
    const res = await loop.pg.query<Record<string, unknown>>(
      `SELECT * FROM "${t.schema}"."${t.name}" LIMIT 8`);
    if (res.rows.length) rowPool.set(`${t.schema}.${t.name}`, res.rows);
  } catch { /* unreadable relation contributes no rows */ }
}
/** Relations whose rows live in a partition, so a key cannot be invented. */
const partitionedIds = new Set<string>();
for (const t of snapshot.tables) {
  if (t.relkind === "p") partitionedIds.add(`${t.schema}.${t.name}`);
}
for (const [child, parent] of childToParent) {
  const p = snapshot.tables.find(x => x.name === parent);
  const c = snapshot.tables.find(x => x.name === child);
  if (p?.relkind === "p" && c) partitionedIds.add(`${c.schema}.${c.name}`);
}

const groups = groupsOf(tableIds, edges);
const inGroups = new Set(groups.flat());

// The tables a generated query may name: the APPLICATION schema, and nothing
// else. The fixture schema also holds single-purpose probe relations —
// `sw4_*`, `fk_df`/`fk_nv`/`fk_par`, `t`/`u`/`v` — which exist to make one
// gate testable and read as noise in a generated query. Every catalog feature
// they carried has an application-shaped carrier here (`order_events` for the
// partitioned key and its clones, `refunds` for a key on an inheritance
// parent, `warehouses` for one pointing AT an inheritance parent, `invoices`
// deferrable, `legacy_order_notes` NOT VALID, `order_gift_wrap` for the
// shared column name a USING or NATURAL join needs).
//
// A whitelist rather than a blacklist, because "is this a probe relation" is
// not a catalog fact: nothing distinguishes `sw4_pref` from `shipments` except
// what it is FOR. Hand-maintained, so it is asserted against the snapshot
// below — a renamed or dropped table fails the run instead of quietly
// shrinking what it ranges over.
const APPLICATION_TABLES = [
  "addresses", "categories", "coupons", "customers", "invoices",
  "legacy_order_notes", "order_event_notes", "order_events",
  "order_events_early", "order_events_late", "order_gift_wrap", "order_items",
  "orders", "payment_methods", "product_tags", "products", "refunds",
  "refunds_archive", "reviews", "shipments", "stock", "stock_moves",
  "subscription", "tags", "warehouses", "warehouses_overflow",
  "payment_methods",
  "shipment_legs", "leg_scans",
  // The atom-oracle demand experiment (schema.sql): keyless, so only the
  // non-key/qual-less walker reaches them — which is the point: CASE
  // guards over their constrained columns are the shapes the kernel rungs
  // would claim, and this run measures whether the distribution produces
  // them.
  "tri", "bcorr",
];
{
  const known = new Set(snapshot.tables.map(t => t.name));
  const missing = APPLICATION_TABLES.filter(n => !known.has(n));
  if (missing.length) {
    throw new Error(
      `APPLICATION_TABLES names ${missing.length} relation(s) the schema does not have: ` +
      `${missing.join(", ")}. Renamed or dropped — fix the list rather than let the ` +
      `generator quietly range over less.`,
    );
  }
}
// Uniformly over the application tables the join graph connects. Drawing a
// GROUP first was the earlier bug: each two-table `sw4_*` pair weighed as much
// as the whole 13-table application half, so 82% of a run went to artifacts.
// The relations a non-key join, a comma join or a subquery may draw — the
// application set, whether or not a key connects them, which is the point:
// Step 0 measured 18 of 26 unreachable features on tables no key touches.
const appTableInfos = snapshot.tables.filter(t =>
  APPLICATION_TABLES.includes(t.name) && t.relkind !== "p");

const startTables = [...inGroups]
  .filter(id => APPLICATION_TABLES.includes(id.split(".")[1]!))
  .sort();
// Both ends must be application tables, or the walk starts in the application
// schema and follows a key straight back into a probe relation.
const isApp = (id: string): boolean => APPLICATION_TABLES.includes(id.split(".")[1]!);
const usableEdges = edges.filter(e =>
  inGroups.has(e.child) && inGroups.has(e.parent) && isApp(e.child) && isApp(e.parent));

console.log(`discovery slice 1 — seed ${SEED}, ${COUNT} queries`);
console.log(`join graph: ${usableEdges.length} single-column foreign keys over ` +
  `${groups.length} groups of joinable tables (largest ${groups[0]!.length})`);
console.log(`  child->parent outer joins that can null-extend: ` +
  usableEdges.filter(e => e.childToParentCanExtend).map(e => `${e.child}.${e.childColumns.join("+")}`).join(", "));

const rand = makeRand(SEED);
const counts = new Map<Bucket, number>();
const shapes = new Set<string>();
const tablesTouched = new Set<string>();
interface Finding { id: string; bucket: Bucket; sql: string; detail: string; key: string; instances: number }
const findings: Finding[] = [];
const findingKeys = new Map<string, Finding>();
const rejectionDetail = new Map<string, number>();
const tableUse = new Map<string, number>();
const kindUse = new Map<string, number>();
const whereUse = new Map<string, number>();
const exprUse = new Map<string, number>();
const clauseUse = new Map<string, number>();
// Which MERGE arm actually PRODUCED a row. §5.3's warning is that arms fire
// only when the data makes them, and a source drawn from the target's keys
// exercises one and never the others — so this is the measurement that says
// whether the straddle worked, rather than whether the arm was emitted.
const mergeActions = new Map<string, number>();
// The argument contract's accounting. Witness numbers are COUNTS, never
// gates (§4): notNull is existential, so an unwitnessed claim here means
// this data state did not route a row into the rejecting site — reported,
// like everything else, so a straddle that quietly stops working is visible.
const paramSiteUse = new Map<string, number>();
let paramQueries = 0, paramTotal = 0, variantRuns = 0;
let pWitnessed = 0, pUnwitnessed = 0, pRaisedOther = 0, pNullable = 0;
let setsSeen = 0, setsWitnessed = 0, setsUnwitnessed = 0, setsRaisedOther = 0;
const samples: string[] = [];
const SAMPLE = Number(process.env.DISCOVERY_SAMPLE ?? 0);
let returnable = 0, returned = 0;
const curve: number[] = [];
let lastMark = 0;

for (let i = 0; i < COUNT; i++) {
  if (i > 0 && i % RECYCLE_EVERY === 0) {
    await loop.close();
    loop = await ProbeLoop.create();
    await loop.pg.exec(DATA_SQL);
  }
  const id = `q${i}`;
  let built: Built | null;
  try {
    // A quarter of the run is DML. Every statement is rolled back by the
    // harness, so the dataset every query sees is the same one.
    built = rand.chance(0.25)
      ? (rand.chance(0.25)
          ? buildMerge(rand, rand.pick(appTableInfos), pool, rowPool, partitionedIds)
          : buildDml(rand, rand.pick(appTableInfos), pool, rowPool, partitionedIds))
      : buildQuery(rand, snapshot, rand.pick(startTables), usableEdges, pool, appTableInfos);
  } catch (e) {
    counts.set("generator-threw", (counts.get("generator-threw") ?? 0) + 1);
    rejectionDetail.set(`generator: ${(e as Error).message}`, (rejectionDetail.get(`generator: ${(e as Error).message}`) ?? 0) + 1);
    continue;
  }
  if (!built) { i--; continue; }
  // §6's saturation curve: NEW shapes per 1000 queries, not the total. Falling
  // toward zero means the vocabulary is exhausted and further volume is waste
  // — the fix for which is new vocabulary, never a bigger run.
  if (i > 0 && i % 1000 === 0) { curve.push(shapes.size - lastMark); lastMark = shapes.size; }
  shapes.add(built.shape);
  for (const u of built.used) {
    tablesTouched.add(u.table);
    tableUse.set(u.table, (tableUse.get(u.table) ?? 0) + 1);
  }
  for (const k of built.kinds) kindUse.set(k, (kindUse.get(k) ?? 0) + 1);
  for (const f of (built.shape.split("|E:")[1] ?? "").split("|C:")[0]!.split(",")) {
    if (f && f !== "-") exprUse.set(f, (exprUse.get(f) ?? 0) + 1);
  }
  for (const f of (built.shape.split("|C:")[1] ?? "").split(",")) {
    if (f && f !== "-") clauseUse.set(f, (clauseUse.get(f) ?? 0) + 1);
  }
  const wf = (built.shape.split("|W:")[1] ?? "-").split("|E:")[0]!;
  whereUse.set(wf, (whereUse.get(wf) ?? 0) + 1);
  if (samples.length < SAMPLE) samples.push(built.sql);

  // Reparse FIRST, and on its own. `ProbeLoop.run` parses inside its engine
  // half and reports a failure as an engine error, which put a deparser defect
  // of OURS in `engine-crashed` — a FINDING bucket — and read as 226 engine
  // crashes on the first §9.2 run. §6's tiers exist to stop exactly that
  // misattribution, so the parse is done here where its failure is
  // unambiguous: the text did not survive the round trip, which is a TOOL
  // defect and nothing to do with the walk.
  let reparsed;
  try {
    reparsed = await parseSql(built.sql);
  } catch (e) {
    counts.set("reparse-failed", (counts.get("reparse-failed") ?? 0) + 1);
    const key = `deparse produced unparseable SQL: ${(e as Error).message.split("\n")[0]!.slice(0, 70)}`;
    if (process.env.DISCOVERY_SHOW_REPARSE) console.log(`\n--- reparse-failed\n${built.sql}\n`);
    rejectionDetail.set(key, (rejectionDetail.get(key) ?? 0) + 1);
    continue;
  }
  // §5.4 — a construct the deparser dropped QUIETLY still parses, so the
  // reparse above cannot see it. The comparison can.
  const before = canonical(built.ast);
  const after = canonical(reparsed.stmts?.[0]?.stmt ?? {});
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    counts.set("ast-differed", (counts.get("ast-differed") ?? 0) + 1);
    const key = `round trip changed the tree at ${firstDiff(before, after).slice(0, 80)}`;
    if (process.env.DISCOVERY_SHOW_REPARSE) console.log(`\n--- ast-differed\n${built.sql}\n${firstDiff(before, after)}\n`);
    rejectionDetail.set(key, (rejectionDetail.get(key) ?? 0) + 1);
    continue;
  }

  if (built.params.length) {
    paramQueries++;
    paramTotal += built.params.length;
    for (const p of built.params) paramSiteUse.set(p.site, (paramSiteUse.get(p.site) ?? 0) + 1);
  }

  // The last line echoed before a hard crash names the killer — a WASM-level
  // death (SIGBUS on a stack-depth blowout) survives no in-process recovery,
  // so identification has to happen before the attempt.
  if (process.env.DISCOVERY_ECHO) {
    console.log(`[${id}] ${built.sql.replace(/\s+/g, " ")} :: ${JSON.stringify(built.params)}`);
  }
  const r = await loop.run({
    id,
    sql: built.sql,
    ...(built.params.length ? { params: built.params.map(p => p.value) } : {}),
  });
  const bucket = classify(r);
  counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  returnable++;
  if (bucket === "agreed-rows") returned++;

  // Witness accounting counts only ADJUDICATED claims — the same gate the
  // harness runs variants under. A set on a query whose control raised was
  // never bound, and counting it as "claimed" with no verdict column is a
  // silent gap the totals would paper over.
  const w = r.paramWitness;
  if (!r.error && !r.pgError && built.params.length) {
    variantRuns += r.params.length + r.paramRejectionSets.length;
    pNullable += r.params.filter(p => !p.notNull).length;
    setsSeen += r.paramRejectionSets.length;
  }
  pWitnessed += w.notNullWitnessed.length;
  pUnwitnessed += w.notNullUnwitnessed.length;
  pRaisedOther += w.notNullRaisedOther.length;
  setsWitnessed += w.setsWitnessed.length;
  setsUnwitnessed += w.setsUnwitnessed.length;
  setsRaisedOther += w.setsRaisedOther.length;

  const actionAt = r.pgColumns.indexOf("r_action");
  if (actionAt >= 0) {
    for (const row of r.rows) {
      const a = String(row[actionAt] ?? "?");
      mergeActions.set(a, (mergeActions.get(a) ?? 0) + 1);
    }
  }
  if (bucket === "pg-rejected" || bucket === "pg-raised") {
    const key = (r.pgError ?? "").split("\n")[0]!.slice(0, 90);
    rejectionDetail.set(key, (rejectionDetail.get(key) ?? 0) + 1);
    if (bucket === "pg-rejected" && process.env.DISCOVERY_SHOW_REJECTED) {
      console.log(`\n--- pg-rejected\n${built.sql}\n=> ${r.pgError}\n`);
    }
  }
  if (bucket === "engine-refused") {
    const key = (r.error ?? "").slice(0, 90);
    rejectionDetail.set(key, (rejectionDetail.get(key) ?? 0) + 1);
  }
  if (TIER[bucket] === "FINDING") {
    const detail = r.violations.join("; ") || r.paramViolations.join("; ") ||
      r.groupViolations.join("; ") || r.shape || r.parity || r.error || "";
    const key = fingerprint(bucket, r, built);
    const seen = findingKeys.get(key);
    if (seen) seen.instances++;
    else {
      const entry = { id, bucket, sql: built.sql, detail, key, instances: 1 };
      findingKeys.set(key, entry);
      findings.push(entry);
    }
  }
}

const pct = (n: number, d: number) => `${Math.round((n / d) * 100)}%`.padStart(4);
console.log(`\nbuckets`);
for (const [b, n] of [...counts.entries()].sort((a, b2) => b2[1] - a[1])) {
  console.log(`  ${String(n).padStart(5)}  ${b.padEnd(18)} ${TIER[b]}`);
}
const unclassified = COUNT - [...counts.values()].reduce((a, b) => a + b, 0);
if (unclassified !== 0) {
  console.log(`\n!! ${unclassified} queries landed in no bucket — a bucket is missing, which is itself a finding`);
}

console.log(`\ncoverage of this run`);
console.log(`  distinct query shapes:      ${shapes.size}`);
console.log(`  tables in the join graph:   ${inGroups.size} (the rest of the schema declares no single-column key, by design)`);
console.log(`  return rate:                ${returnable ? Math.round((returned / returnable) * 100) : 0}% (${returned}/${returnable} queries returned a row)`);
console.log(`  columns with drawable literals:  ${pool.size}`);
if (curve.length > 1) {
  console.log(`  new shapes per 1000 queries: ${curve.join(" ")}`);
  const tail = curve.slice(-3);
  const last = tail.reduce((a, b) => a + b, 0) / tail.length;
  // Reported, not judged. A falling curve here is ordinary coupon-collecting
  // over a combinatorially large space — 2..4 tables drawn from 13, four join
  // kinds, five WHERE structures — so it will decelerate forever without ever
  // meaning "exhausted". What the number is good for is COMPARING runs: the
  // same figure after a vocabulary is widened says the widening did nothing.
  console.log(`    marginal yield: ${Math.round(last)}/1000 at the end against ` +
    `${curve[0]} at the start (${Math.round((last / curve[0]!) * 100)}%)`);
}
console.log(`  bound: 2..4 FROM items, left-deep — tables, derived tables, function items, LATERAL,`);
console.log(`         TABLESAMPLE, alias column lists, comma joins, qual-less and non-key joins;`);
console.log(`         application tables only, partitions and inheritance children included;`);
console.log(`         0..3 flat expression targets plus scalar, EXISTS and quantified subqueries;`);
console.log(`         §9.4's clause decorations, set operations and CTE wraps;`);
console.log(`         ~25% DML with RETURNING — ON CONFLICT, multi-assignment, MERGE included;`);
console.log(`         parameters at predicate, written-value, cast, subquery and LIMIT sites,`);
console.log(`         each adjudicated by NULL-binding variants against the contract;`);
console.log(`         single and composite keys;`);
console.log(`         WHERE on ${pct(COUNT - (whereUse.get("-") ?? 0), COUNT).trim()} of queries (measured) — IS [NOT] NULL, and = <> < <= > >= against a literal`);
console.log(`         drawn from the column's own seeded values, combined with AND, OR, NOT, AND(OR)`);

if (rejectionDetail.size) {
  console.log(`\nrejections and refusals, by cause`);
  for (const [k, n] of [...rejectionDetail.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    console.log(`  ${String(n).padStart(5)}  ${k}`);
  }
}

console.log(`\nwhat was generated`);
const totalUse = [...tableUse.values()].reduce((a, b) => a + b, 0);
console.log(`  tables, by how often they appear in a FROM clause:`);
for (const [t, n] of [...tableUse.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`    ${String(n).padStart(6)}  ${pct(n, totalUse)}  ${t}`);
}
const totalKinds = [...kindUse.values()].reduce((a, b) => a + b, 0);
console.log(`  join kinds:  ` + [...kindUse.entries()].sort((a, b) => b[1] - a[1])
  .map(([k, n]) => `${k.replace("JOIN_", "")} ${pct(n, totalKinds)}`).join("   "));
console.log(`  expression targets: ` + ([...exprUse.entries()].sort((a, b) => b[1] - a[1])
  .map(([k, n]) => `${k} ${pct(n, COUNT)}`).join("   ") || "(none)"));
console.log(`  clause forms: ` + ([...clauseUse.entries()].sort((a, b) => b[1] - a[1])
  .map(([k, n]) => `${k} ${pct(n, COUNT)}`).join("   ") || "(none)"));
if (mergeActions.size) {
  const tot = [...mergeActions.values()].reduce((a, b) => a + b, 0);
  console.log(`  MERGE arms that produced a row: ` + [...mergeActions.entries()]
    .sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${pct(n, tot)}`).join("   "));
}
if (paramQueries > 0) {
  console.log(`\nthe parameter contract, adjudicated by binding`);
  console.log(`  ${paramQueries} queries carried ${paramTotal} parameters; ${variantRuns} NULL-binding variants ran`);
  console.log(`  sites: ` + [...paramSiteUse.entries()].sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${k} ${n}`).join("   "));
  console.log(`  notNull claims: ${pWitnessed} witnessed, ${pUnwitnessed} unwitnessed in this state` +
    (pRaisedOther ? `, ${pRaisedOther} raised outside the enumerated rejection list` : "") +
    `; nullable: ${pNullable}`);
  if (setsSeen) {
    console.log(`  joint rejection sets: ${setsSeen} claimed — ${setsWitnessed} witnessed, ` +
      `${setsUnwitnessed} unwitnessed` +
      (setsRaisedOther ? `, ${setsRaisedOther} raised outside the list` : ""));
  }
}
console.log(`  WHERE shape: ` + [...whereUse.entries()].sort((a, b) => b[1] - a[1])
  .map(([k, n]) => `${k === "-" ? "(none)" : k} ${pct(n, COUNT)}`).join("   "));
if (samples.length) {
  console.log(`\nsample of what that looks like (DISCOVERY_SAMPLE=${SAMPLE})`);
  for (const q of samples) console.log(`\n${q.split("\n").map(l => "  " + l).join("\n")}`);
}

const instances = findings.reduce((a, f) => a + f.instances, 0);
console.log(`\nFINDINGS: ${findings.length} distinct, ${instances} instances`);

// Which CONSTRUCT appears in a bucket's findings against how often it appears
// at all. A construct present in most instances of a bucket and a minority of
// the run is the thing to look at — and unlike the fingerprint it needs no
// guess about what causes what, so it stays useful for a defect nobody has
// seen. `shape-mismatch` is the bucket that needs it: it has no offending
// COLUMN, so no rule to name, and its key falls back to the constructs the
// query used, which fragments once an unrelated third table joins in.
if (findings.length > 0) {
  const byBucket = new Map<Bucket, Map<string, number>>();
  for (const f of findings) {
    const forms = f.key.match(/from:([^|]*)/)?.[1]?.split(",").filter(Boolean) ?? [];
    const m = byBucket.get(f.bucket) ?? new Map<string, number>();
    for (const x of forms) m.set(x, (m.get(x) ?? 0) + f.instances);
    byBucket.set(f.bucket, m);
  }
  for (const [b, m] of byBucket) {
    if (m.size === 0) continue;
    const total = findings.filter(f => f.bucket === b).reduce((a, f) => a + f.instances, 0);
    const ranked = [...m.entries()].sort((a, b2) => b2[1] - a[1])
      .map(([k, n]) => `${k} ${Math.round((n / total) * 100)}%`);
    console.log(`  constructs across ${b} instances: ${ranked.join("   ")}`);
    console.log(`    (a construct near 100% here and rare in the run is the suspect;` +
      ` "what was generated" above has the run-wide rates)`);
  }
}
for (const f of [...findings].sort((a, b) => b.instances - a.instances).slice(0, 20)) {
  console.log(`\n  [${f.bucket}] ${f.instances} instance${f.instances === 1 ? "" : "s"}  (first: ${f.id}, seed ${SEED})`);
  console.log(`  cause: ${f.key.slice(f.bucket.length + 1)}`);
  console.log(`  ${f.detail}`);
  console.log(`  ${f.sql}`);
}

await loop.close();
