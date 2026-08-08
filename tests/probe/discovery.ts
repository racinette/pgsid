// The discovery instrument, slice 1 — `docs/catalog-driven-generation.md` §3.
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
//   - SELECT only. No DML, no set operations, no subqueries.
//
// Everything absent from that list is a later slice. The bound is printed with
// the result, because §6's closing rule is that a run finding nothing must
// state what it covered — and beside it the saturation curve, which says
// whether running longer would have bought anything.
import { deparseSync } from "pgsql-deparser";
import { snapshotCatalog } from "../../src/catalog/snapshot.js";
import type { CatalogSnapshot, TableInfo } from "../../src/catalog/types.js";
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

const typeCast = (arg: Ast, typeName: string): Ast =>
  ({ TypeCast: { arg, typeName: { names: [str(typeName)], typemod: -1 } } });

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
  /** Aliases in the order they were joined, with the table each stands for. */
  used: { alias: string; table: string }[];
  kinds: string[];
  /** Stable description of the query's shape, literals and names erased. */
  shape: string;
}

/** Sampled values per `schema.table.column`, for drawing predicate literals. */
type ValuePool = Map<string, unknown[]>;

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
function predicate(rand: Rand, used: { alias: string; table: string }[], byId: Map<string, TableInfo>, pool: ValuePool): Ast | null {
  const u = rand.pick(used);
  const t = byId.get(u.table);
  if (!t) return null;
  const cols = t.columns.filter(c => c.generated !== "virtual");
  if (cols.length === 0) return null;
  const col = rand.pick(cols);
  const ref = colRef(u.alias, col.name);

  const form = rand.int(0, 5);
  if (form === 0) return nullTest(ref, true);
  if (form === 1) return nullTest(ref, false);

  const values = (pool.get(`${u.table}.${col.name}`) ?? []).filter(v => v !== null);
  if (values.length === 0) return null;
  const lit = literalFor(rand.pick(values));
  if (!lit) return null;
  if (form === 2) return op("=", ref, lit);
  if (form === 3) return op("<>", ref, lit);
  if (form === 4) return op(rand.pick([">", "<", ">=", "<="]), ref, lit);
  return op("=", ref, lit);
}

function whereClause(rand: Rand, used: { alias: string; table: string }[], byId: Map<string, TableInfo>, pool: ValuePool): { node: Ast; shape: string } | null {
  const one = (): Ast | null => predicate(rand, used, byId, pool);
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
function buildQuery(
  rand: Rand,
  snapshot: CatalogSnapshot,
  start: string,
  edges: Edge[],
  pool: ValuePool,
): Built | null {
  const byId = new Map(snapshot.tables.map(t => [`${t.schema}.${t.name}`, t]));
  const target_ = rand.int(2, 4);
  const used: { alias: string; table: string }[] = [{ alias: "r0", table: start }];
  const kinds: string[] = [];

  let from: Ast = fromItem(byId.get(start)!, "r0");
  const shapeParts: string[] = [];

  for (let i = 1; i < target_; i++) {
    // Any edge touching a table already in the query, in either direction. A
    // self-referencing key qualifies too: it joins the table to itself under a
    // second alias, which §7 measured to be the only way two of the three
    // inhabitable child->parent keys can be reached at all.
    const candidates = edges.filter(e =>
      used.some(u => u.table === e.child) || used.some(u => u.table === e.parent));
    if (candidates.length === 0) break;
    const edge = rand.pick(candidates);

    // Which end is already present decides which end we are adding, and a
    // self-reference is present at both ends — pick a direction.
    const childIn = used.some(u => u.table === edge.child);
    const parentIn = used.some(u => u.table === edge.parent);
    const addParent = edge.child === edge.parent ? rand.chance(0.5) : childIn && !parentIn;
    if (!addParent && parentIn === false) continue;

    const anchorTable = addParent ? edge.child : edge.parent;
    const anchor = rand.pick(used.filter(u => u.table === anchorTable));
    const added = addParent ? edge.parent : edge.child;
    const addedTable = byId.get(added);
    if (!addedTable) continue;

    const alias = `r${i}`;
    const kind = rand.pick(JOIN_KINDS);
    kinds.push(kind);
    // A composite key becomes a CONJUNCTIVE ON — the whole key equated, which
    // is what the entailment gate must decline as a unit rather than reading
    // one column of.
    const anchorCols = addParent ? edge.childColumns : edge.parentColumns;
    const addedCols = addParent ? edge.parentColumns : edge.childColumns;
    const conjuncts = anchorCols.map((c, k) =>
      eq(colRef(anchor.alias, c), colRef(alias, addedCols[k]!)));

    from = {
      JoinExpr: {
        jointype: kind,
        larg: from,
        rarg: fromItem(addedTable, alias),
        quals: conjuncts.length === 1
          ? conjuncts[0]!
          : boolExpr("AND_EXPR", conjuncts),
      },
    };
    used.push({ alias, table: added });
    shapeParts.push(`${kind}:${addParent ? "child->parent" : "parent->child"}`);
  }
  if (used.length < 2) return null;

  // Project a few columns per table, always at least one, so a claim exists.
  const targetList: Ast[] = [];
  const slots: Slot[] = [];
  for (const u of used) {
    const t = byId.get(u.table)!;
    const cols = t.columns.filter(c => c.generated !== "virtual");
    if (cols.length === 0) continue;
    for (const c of cols) slots.push({ alias: u.alias, column: c.name, type: c.typeName });
    const take = Math.min(cols.length, rand.int(1, 3));
    const chosen = new Set<string>();
    for (let k = 0; k < take; k++) chosen.add(rand.pick(cols).name);
    for (const name of chosen) {
      targetList.push(target(colRef(u.alias, name), `${u.alias}_${name}`));
    }
  }
  if (targetList.length === 0) return null;

  // …and then some EXPRESSIONS over those columns. Bare columns stay in the
  // list: they are what every existing claim was measured on, and an
  // expression target is an addition to the query rather than a replacement
  // for it.
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

  // A WHERE clause on most queries, and deliberately none on the rest: the
  // unfiltered path is the one every existing claim was measured on.
  // Retry: `whereClause` answers null when the column it picked has no
  // drawable literal, and one attempt made the real rate 54% against the 70%
  // this line asks for — a bound the report was stating wrongly.
  let where: { node: Ast; shape: string } | null = null;
  if (rand.chance(0.7)) {
    for (let attempt = 0; attempt < 5 && !where; attempt++) {
      where = whereClause(rand, used, byId, pool);
    }
  }

  const stmt = {
    SelectStmt: {
      targetList,
      fromClause: [from],
      ...(where ? { whereClause: where.node } : {}),
      limitOption: "LIMIT_OPTION_DEFAULT",
      op: "SETOP_NONE",
    },
  };
  const sql = deparseSync(stmt as Parameters<typeof deparseSync>[0]);
  return {
    sql,
    used,
    kinds,
    // Table identities matter here — the whole point is that the catalog
    // varies — so the shape keys on tables and join kinds, not on the aliases
    // or the projected column names. The WHERE contributes its STRUCTURE only,
    // for the same reason: a random literal must not mint a fresh shape.
    shape: `${used.map(u => u.table).join("+")}|${shapeParts.join(",")}|W:${where?.shape ?? "-"}` +
      `|E:${[...exprForms].sort().join(",") || "-"}`,
  };
}

function fromItem(t: TableInfo, alias: string): Ast {
  return rangeVar(t.schema, t.name, alias);
}

// ---------------------------------------------------------------------------
// Buckets — §6. Every query lands in exactly one; an outcome nothing
// classifies fails the run rather than being swallowed.
// ---------------------------------------------------------------------------

type Bucket =
  | "generator-threw" | "deparse-threw" | "reparse-failed" | "pg-rejected" | "pg-raised"
  | "engine-refused" | "engine-crashed" | "shape-mismatch" | "notnull-violated"
  | "group-violated" | "parity-broke" | "agreed-rows" | "agreed-norows";

const TIER: Record<Bucket, "TOOL" | "BUDGET" | "FINDING" | "EXPECTED" | "OK"> = {
  "generator-threw": "TOOL", "deparse-threw": "TOOL", "reparse-failed": "TOOL",
  "pg-rejected": "TOOL", "pg-raised": "BUDGET",
  "engine-refused": "EXPECTED",
  "engine-crashed": "FINDING", "shape-mismatch": "FINDING", "notnull-violated": "FINDING",
  "group-violated": "FINDING", "parity-broke": "FINDING",
  "agreed-rows": "OK", "agreed-norows": "OK",
};

function classify(r: ProbeResult): Bucket {
  if (r.error) return r.error.startsWith("UnsupportedNodeError") ? "engine-refused" : "engine-crashed";
  if (r.pgError) return /syntax error|does not exist|ambiguous/i.test(r.pgError) ? "pg-rejected" : "pg-raised";
  if (r.shape) return "shape-mismatch";
  if (r.violations.length) return "notnull-violated";
  if (r.groupViolations.length) return "group-violated";
  if (r.parity) return "parity-broke";
  return r.rows.length > 0 ? "agreed-rows" : "agreed-norows";
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const COUNT = Number(process.argv[2] ?? 2000);
const SEED = Number(process.argv[3] ?? 20260808);

const loop = await ProbeLoop.create();
const snapshot = await snapshotCatalog(loop.pg);
// One dataset for the whole session: `run` wraps each query in
// BEGIN/ROLLBACK, so anything seeded here survives every query and every
// query sees the same rows.
await loop.pg.exec(generateFixtureData(snapshot, { registry: fixtureGeneratorRegistry }).sql);

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
const findings: { id: string; bucket: Bucket; sql: string; detail: string }[] = [];
const findingKeys = new Set<string>();
const rejectionDetail = new Map<string, number>();
const tableUse = new Map<string, number>();
const kindUse = new Map<string, number>();
const whereUse = new Map<string, number>();
const exprUse = new Map<string, number>();
const samples: string[] = [];
const SAMPLE = Number(process.env.DISCOVERY_SAMPLE ?? 0);
let returnable = 0, returned = 0;
const curve: number[] = [];
let lastMark = 0;

for (let i = 0; i < COUNT; i++) {
  const id = `q${i}`;
  let built: Built | null;
  try {
    built = buildQuery(rand, snapshot, rand.pick(startTables), usableEdges, pool);
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
  for (const f of (built.shape.split("|E:")[1] ?? "").split(",")) {
    if (f && f !== "-") exprUse.set(f, (exprUse.get(f) ?? 0) + 1);
  }
  const wf = (built.shape.split("|W:")[1] ?? "-").split("|E:")[0]!;
  whereUse.set(wf, (whereUse.get(wf) ?? 0) + 1);
  if (samples.length < SAMPLE) samples.push(built.sql);

  const r = await loop.run({ id, sql: built.sql });
  const bucket = classify(r);
  counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  returnable++;
  if (bucket === "agreed-rows") returned++;

  if (bucket === "pg-rejected" || bucket === "pg-raised") {
    const key = (r.pgError ?? "").split("\n")[0]!.slice(0, 90);
    rejectionDetail.set(key, (rejectionDetail.get(key) ?? 0) + 1);
  }
  if (bucket === "engine-refused") {
    const key = (r.error ?? "").slice(0, 90);
    rejectionDetail.set(key, (rejectionDetail.get(key) ?? 0) + 1);
  }
  if (TIER[bucket] === "FINDING") {
    const detail = r.violations.join("; ") || r.groupViolations.join("; ") ||
      r.shape || r.parity || r.error || "";
    // One entry per (bucket, shape, detail) — 10,000 queries hitting one bug
    // must read as one finding, not as hundreds.
    const key = `${bucket}|${built.shape}|${detail.replace(/\d+/g, "N")}`;
    if (!findingKeys.has(key)) {
      findingKeys.add(key);
      findings.push({ id, bucket, sql: built.sql, detail });
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
console.log(`  bound: 2..4 tables, left-deep, SELECT only, no subqueries, no set operations, no DML;`);
console.log(`         application tables only, partitions and inheritance children included,`);
console.log(`         0..3 flat expression targets per query;`);
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
console.log(`  WHERE shape: ` + [...whereUse.entries()].sort((a, b) => b[1] - a[1])
  .map(([k, n]) => `${k === "-" ? "(none)" : k} ${pct(n, COUNT)}`).join("   "));
if (samples.length) {
  console.log(`\nsample of what that looks like (DISCOVERY_SAMPLE=${SAMPLE})`);
  for (const q of samples) console.log(`\n${q.split("\n").map(l => "  " + l).join("\n")}`);
}

console.log(`\nFINDINGS: ${findings.length} distinct`);
for (const f of findings.slice(0, 20)) {
  console.log(`\n  [${f.bucket}] ${f.id}  (seed ${SEED})`);
  console.log(`  ${f.detail}`);
  console.log(`  ${f.sql}`);
}

await loop.close();
