import type { PGlite } from "@electric-sql/pglite";
import type {
  BuiltinFunctionSignature,
  BuiltinOperatorSignature,
  BuiltinSignature,
  ImplicitCastInfo,
  CatalogSnapshot,
  ColumnInfo,
  CompositeTypeInfo,
  CompositeTypeAttrInfo,
  ConstraintInfo,
  ConstraintType,
  DomainInfo,
  EnumInfo,
  ExtensionInfo,
  FunctionArgInfo,
  FunctionInfo,
  ArgMode,
  IndexInfo,
  SchemaInfo,
  SequenceInfo,
  TableInfo,
  ViewInfo,
  Volatility,
  WriteRewriteInfo,
} from "./types.js";
import {
  ALWAYS_NOT_NULL_BUILTINS,
  FIRST_ARG_BUILTINS,
  STRICT_TOTAL_BUILTINS,
  STRICT_TOTAL_BUILTIN_SIGNATURES,
  NON_NULL_OVER_NONEMPTY_AGGREGATES,
  NEVER_NULL_WINDOW_SIGNATURES,
  STRICT_TOTAL_WINDOW_SIGNATURES,
} from "../query/nullability-walk.js";
import {
  TOTAL_OPERATORS,
  STRICT_OPERATORS,
  TOTAL_OPERATOR_SIGNATURES,
} from "../query/operators.js";

// ---------------------------------------------------------------------------
// The names the engine's curated tables make claims about — the scope of the
// two signature captures below (docs/type-aware-overloads.md). Imported from
// the tables themselves so the scope cannot drift from the claims. The
// import direction (catalog ← query) carries no cycle: nothing under
// src/query imports this module, and the walk's own catalog imports are
// type-only or side modules.
// ---------------------------------------------------------------------------

const CLAIMED_FUNCTION_NAMES = [...new Set([
  ...ALWAYS_NOT_NULL_BUILTINS,
  ...FIRST_ARG_BUILTINS,
  ...STRICT_TOTAL_BUILTINS,
  ...NON_NULL_OVER_NONEMPTY_AGGREGATES,
  ...[...NEVER_NULL_WINDOW_SIGNATURES].map(k => k.slice(0, k.indexOf("("))),
  ...[...STRICT_TOTAL_WINDOW_SIGNATURES].map(k => k.slice(0, k.indexOf("("))),
  // The WITHIN GROUP classes scope themselves — the capture's WHERE adds
  // every aggkind 'h'/'o' row, since those verdicts are class claims.
  // A SIGNATURE-keyed claim covers a name no table holds — `lower(text)`
  // after lower's removal — and its rows must be captured for the typed
  // dispatch to resolve against.
  ...[...STRICT_TOTAL_BUILTIN_SIGNATURES].map(k => k.slice(0, k.indexOf("("))),
])];
const CLAIMED_OPERATOR_NAMES = [...new Set([
  ...TOTAL_OPERATORS,
  ...STRICT_OPERATORS,
  // A SIGNATURE-keyed operator claim covers a symbol no name table holds —
  // `tsvector @@ tsquery` under a name `jsonb @@ jsonpath` disqualifies —
  // and its rows must be captured for the typed dispatch to resolve them.
  ...[...TOTAL_OPERATOR_SIGNATURES].map(k => k.slice(0, k.indexOf("("))),
])];

// ---------------------------------------------------------------------------
// User-schema filter (excludes system + temp schemas).
// Mirrors the filter used by SchemaBuilder so the snapshot covers exactly the
// same set of user entities that the apply/validate pipeline tracks.
// ---------------------------------------------------------------------------

const USER_SCHEMA_EXCLUDE = `('pg_catalog', 'information_schema', 'pg_toast')`;
const NOT_TEMP = `n.nspname NOT LIKE 'pg_temp_%' AND n.nspname NOT LIKE 'pg_toast_temp_%'`;
const USER_NS = `n.nspname NOT IN ${USER_SCHEMA_EXCLUDE} AND ${NOT_TEMP}`;

// ---------------------------------------------------------------------------
// Row types (internal — the raw shape returned by each catalog query).
// ---------------------------------------------------------------------------

interface TableRow {
  oid: number;
  schema: string;
  name: string;
  relkind: string;
  reloptions: string[] | null;
}

interface ColumnRow {
  attrelid: number;
  name: string;
  attnum: number;
  type_oid: number;
  type_name: string;
  type_mod: number | null;
  not_null: boolean;
  has_default: boolean;
  default_expr: string | null;
  generated: string; // 'a' | 's' | ''
  identity: string;  // 'a' | 'd' | ''
  collation_deterministic: boolean | null;
}

interface ConstraintRow {
  name: string;
  contype: string; // 'p' | 'u' | 'f' | 'c' | 'x'
  conrelid: number;
  /** The referenced relation for a foreign key; 0 for every other type. */
  confrelid: number;
  foreign_schema: string | null;
  foreign_table: string | null;
  conkey: number[] | string | null;
  confkey: number[] | string | null;
  definition: string;
  validated: boolean;
  noinherit: boolean;
  deferrable: boolean;
  /** `conparentid <> 0`: a row PostgreSQL cloned, not one the author wrote. */
  inherited_clone: boolean;
}

interface ViewRow {
  schemaname: string;
  viewname: string;
  definition: string;
}

interface IndexRow {
  oid: number;
  schema: string;
  name: string;
  table_schema: string;
  table_name: string;
  indkey: number[] | string;
  indisunique: boolean;
  indisprimary: boolean;
  partial: string | null;
  amname: string;
  definition: string;
}

interface FunctionRow {
  oid: number;
  schema: string;
  name: string;
  arg_types: string;
  /** NULL for a procedure — see the mapping, which renders it empty. */
  return_type: string | null;
  return_type_oid: number;
  language: string;
  prokind: string;
  proretset: boolean;
  prosecdef: boolean;
  proisstrict: boolean;
  provolatile: string;
  procost: number;
  prorows: number;
  prosrc: string;
  definition: string;
  // Raw argument arrays:
  proallargtypes: number[] | null;
  proargtypes: string | null; // oidvector → text
  proargnames: string[] | null;
  proargmodes: string[] | null;
  pronargs: number;
  pronargdefaults: number;
  /** One rendered default expression per argument POSITION (null where the
   *  argument has none), aligned with `proallargtypes`/`proargtypes`; null
   *  for a function with no defaults at all. */
  argdefaults: (string | null)[] | null;
  /** `pg_aggregate.agginitval` for aggregates; null otherwise (and null when
   *  the aggregate has no initial condition). */
  agg_init_val: string | null;
}

interface EnumTypeRow {
  oid: number;
  schema: string;
  name: string;
}

interface EnumValueRow {
  enumtypid: number;
  enumlabel: string;
  enumsortorder: number;
}

interface DomainRow {
  oid: number;
  schema: string;
  name: string;
  base_type_oid: number;
  base_type_name: string;
  not_null: boolean;
  default_expr: string | null;
  check_exprs: string[] | null;
}

interface InheritsRow {
  inhrelid: number;
  inhparent: number;
}

interface TriggerRow {
  tgrelid: number;
  tgtype: number;
}

interface RewriteRuleRow {
  ev_class: number;
  ev_type: string;
  is_instead: boolean;
}

interface CompositeTypeRow {
  oid: number;
  typrelid: number;
  schema: string;
  name: string;
}

interface CompositeAttrRow {
  typrelid: number;
  name: string;
  type_oid: number;
  type_name: string;
  attnum: number;
}

interface SequenceRow {
  oid: number;
  schema: string;
  name: string;
  type_oid: number;
  type_name: string;
  /** `int8` — PGlite returns number (small values) or bigint (large values). */
  start: number | bigint;
  increment: number | bigint;
  min: number | bigint;
  max: number | bigint;
  cache: number | bigint;
  cycle: boolean;
  owned_by_schema: string | null;
  owned_by_table: string | null;
  owned_by_column: string | null;
}

interface ExtensionRow {
  name: string;
  version: string;
  schema: string;
}

interface SchemaRow {
  name: string;
  owner: string;
}

interface TypeNameRow {
  oid: number;
  name: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse an oidvector / int2vector value (returned by PGlite as either a
 * space-delimited string like "1 2 3" or already a number[]) into a number[].
 * OID arrays are 32-bit unsigned → safe to coerce to `number`.
 */
function toNumArray(v: number[] | string | null | undefined): number[] {
  if (v == null) return [];
  if (Array.isArray(v)) return (v as (number | bigint)[]).map(Number);
  if (typeof v === "string") {
    const s = v.trim();
    if (s === "") return [];
    return s.split(/\s+/).map(n => Number(n));
  }
  return [];
}

/**
 * Map `attgenerated` char to the ColumnInfo `generated` enum. The chars are
 * 's' (STORED) and, from PG18, 'v' (VIRTUAL) — the always/byDefault pair
 * belongs to `attidentity`, and an earlier version of this mapping wrongly
 * borrowed it.
 */
function mapGenerated(c: string): ColumnInfo["generated"] {
  if (c === "s") return "stored";
  if (c === "v") return "virtual";
  return "none";
}

/** Map `attidentity` char to the ColumnInfo `identity` enum (or null). */
function mapIdentity(c: string): ColumnInfo["identity"] {
  if (c === "a") return "always";
  if (c === "d") return "byDefault";
  return null;
}

/** Map `contype` char to the ConstraintInfo `type` enum. */
function mapConstraintType(c: string): ConstraintType {
  switch (c) {
    case "p": return "primaryKey";
    case "u": return "unique";
    case "f": return "foreign";
    case "c": return "check";
    case "x": return "exclusion";
    default: return "check";
  }
}

/** Map `proargmodes` char to the ArgMode enum. */
function mapArgMode(c: string): ArgMode {
  switch (c) {
    case "i": return "in";
    case "o": return "out";
    case "b": return "inout";
    case "v": return "variadic";
    case "t": return "table";
    default: return "in";
  }
}

/** Map `provolatile` char to the Volatility enum. */
function mapVolatility(c: string): Volatility {
  if (c === "i") return "immutable";
  if (c === "s") return "stable";
  return "volatile";
}

/** Parse `reloptions` (text[] like ["fillfactor=80"]) into a record. */
function parseStorageParams(reloptions: string[] | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!reloptions) return out;
  for (const opt of reloptions) {
    const eq = opt.indexOf("=");
    if (eq >= 0) {
      out[opt.slice(0, eq)] = opt.slice(eq + 1);
    } else {
      out[opt] = "";
    }
  }
  return out;
}

/**
 * Build a `(relid, attnum) → column-name` map from the column rows. Used to
 * resolve `conkey`/`confkey`/`indkey` integer attnums back to column names.
 */
function buildAttnumIndex(
  columnRows: ColumnRow[],
): Map<string, string> {
  const m = new Map<string, string>();
  for (const c of columnRows) {
    m.set(`${c.attrelid}:${c.attnum}`, c.name);
  }
  return m;
}

/** Resolve an array of attnums for a given relid to column names (skip 0s). */
function resolveAttnums(
  relid: number,
  attnums: number[],
  idx: Map<string, string>,
): string[] {
  const out: string[] = [];
  for (const a of attnums) {
    if (a === 0) continue; // 0 = expression, not a column reference
    const name = idx.get(`${relid}:${a}`);
    if (name) out.push(name);
  }
  return out;
}

/**
 * Resolve a function's arguments from the raw pg_proc arrays into a typed
 * `FunctionArgInfo[]`, using the type-name map for OID→name resolution.
 *
 * - `proallargtypes` (oid[]) is present when any arg is not plain IN; it
 *   carries the full type list. Otherwise `proargtypes` (oidvector) holds the
 *   all-IN types.
 * - `proargmodes` (char[]) is null when all args are IN.
 * - `proargnames` (text[]) is null when all args are unnamed.
 * - The last `pronargdefaults` INPUT args have defaults (PG stores trailing
 *   defaults). Counting over input args is what makes this right when an OUT
 *   parameter sits between them: `(a int, OUT x int, b int DEFAULT 5, OUT y
 *   int)` defaults its THIRD position, not its fourth (measured), and the
 *   count-everything reading marked `y` and left `b` required — which put a
 *   legal one-argument call outside the arity window `resolveFunctionCandidates`
 *   computes from these flags.
 */
function resolveFunctionArgs(
  row: FunctionRow,
  typeNames: Map<number, string>,
): FunctionArgInfo[] {
  const allTypes = row.proallargtypes;
  let typeOids: number[];
  let modes: string[];

  if (allTypes && allTypes.length > 0) {
    typeOids = allTypes;
    modes = row.proargmodes ?? allTypes.map(() => "i");
  } else {
    typeOids = toNumArray(row.proargtypes);
    modes = row.proargmodes ?? typeOids.map(() => "i");
  }

  const names = row.proargnames ?? typeOids.map(() => "");
  const nargs = typeOids.length;
  const nDefaults = row.pronargdefaults ?? 0;
  const isInput = (m: ArgMode): boolean => m !== "out" && m !== "table";
  const inputCount = modes.slice(0, nargs).filter(m => isInput(mapArgMode(m))).length;
  const firstDefaultInput = inputCount - nDefaults;

  const args: FunctionArgInfo[] = [];
  let inputIndex = 0;
  for (let i = 0; i < nargs; i++) {
    const oid = typeOids[i]!;
    const mode = mapArgMode(modes[i] ?? "i");
    args.push({
      name: names[i] ?? "",
      typeOid: oid,
      typeName: typeNames.get(oid) ?? "unknown",
      mode,
      hasDefault: isInput(mode) && inputIndex++ >= firstDefaultInput,
      defaultExpr: row.argdefaults?.[i] ?? null,
    });
  }
  return args;
}

/** Lexicographic comparator for `[a, b]` string tuples (schema, name). */
function bySchemaName<T extends { schema: string; name: string }>(a: T, b: T): number {
  return a.schema < b.schema ? -1 : a.schema > b.schema ? 1
    : a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

// ---------------------------------------------------------------------------
// snapshotCatalog
// ---------------------------------------------------------------------------

/**
 * Capture the full catalog state from a PGlite instance's system catalogs.
 *
 * Runs a set of parameterized catalog queries and assembles a typed
 * `CatalogSnapshot`. All arrays are sorted deterministically (schema, name,
 * attnum, enumsortorder) so two snapshots of identical schema state are
 * byte-identical — enabling stable diffing and future cache persistence.
 *
 * Call this after `SchemaBuilder.validate()` succeeds (or any time the schema
 * state is known-good). The snapshot is the single source of truth for
 * query typechecking, codegen, selective re-typecheck, and future linting.
 */
export async function snapshotCatalog(pg: PGlite): Promise<CatalogSnapshot> {
  return withEmptySearchPath(pg, () => readCatalog(pg));
}

/**
 * Run `read` with an empty `search_path`, restoring the session's own value
 * afterwards.
 *
 * Every name in a snapshot is rendered by PostgreSQL — `format_type` for a
 * column's type, `pg_get_viewdef`, `pg_get_constraintdef`, `pg_get_expr` for a
 * default, `pg_get_function_result` — and each of them omits the schema
 * qualifier for whatever the current `search_path` makes visible. The same
 * unchanged database therefore describes itself differently depending on
 * session state: a column is `app.pct` from one session and `pct` from another,
 * and a view is `FROM app.t` or `FROM t`.
 *
 * Those strings are what the diff compares and what the nullability walk
 * resolves, so a name that shifts with session state is not an identity.
 * Emptying the path removes the choice rather than guessing which value was in
 * effect: `pg_catalog` is searched implicitly whatever the setting, so
 * built-ins keep their standard names (`integer`, not `pg_catalog.int4`) and
 * everything else comes out fully qualified.
 */
async function withEmptySearchPath<T>(pg: PGlite, read: () => Promise<T>): Promise<T> {
  const saved = (await pg.query<{ search_path: string }>("SHOW search_path;")).rows[0]
    ?.search_path;
  await pg.query("SELECT set_config('search_path', '', false);");
  try {
    return await read();
  } finally {
    // Passing the value as a parameter means a path containing quotes — the
    // default is `"$user", public` — needs no escaping on the way back.
    await pg.query("SELECT set_config('search_path', $1, false);", [saved ?? ""]);
  }
}

async function readCatalog(pg: PGlite): Promise<CatalogSnapshot> {
  // Run all independent catalog queries in parallel.
  const [
    typeRows,
    tableRows,
    columnRows,
    constraintRows,
    viewRows,
    matviewRows,
    indexRows,
    functionRows,
    operatorRows,
    enumTypeRows,
    enumValueRows,
    domainRows,
    compositeTypeRows,
    compositeAttrRows,
    sequenceRows,
    extensionRows,
    schemaRows,
    builtinStrictFunctions,
    builtinTableFunctions,
    builtinSetReturningFunctions,
    builtinAggregateFunctions,
    builtinFunctionNames,
    builtinPolymorphicFunctions,
    builtinPolymorphicArraySignatures,
    builtinFunctionSignatures,
    builtinOperatorSignatures,
    builtinImplicitCasts,
    builtinTypeKinds,
    builtinTypeNameAliases,
    inheritsRows,
    triggerRows,
    rewriteRuleRows,
  ] = await Promise.all([
    queryTypeNames(pg),
    queryTables(pg),
    queryColumns(pg),
    queryConstraints(pg),
    queryViews(pg),
    queryMatViews(pg),
    queryIndexes(pg),
    queryFunctions(pg),
    queryOperators(pg),
    queryEnumTypes(pg),
    queryEnumValues(pg),
    queryDomains(pg),
    queryCompositeTypes(pg),
    queryCompositeAttrs(pg),
    querySequences(pg),
    queryExtensions(pg),
    querySchemas(pg),
    queryBuiltinStrictFunctions(pg),
    queryBuiltinTableFunctions(pg),
    queryBuiltinSetReturningFunctions(pg),
    queryBuiltinAggregateFunctions(pg),
    queryBuiltinFunctionNames(pg),
    queryBuiltinPolymorphicFunctions(pg),
    queryBuiltinPolymorphicArraySignatures(pg),
    queryBuiltinFunctionSignatures(pg),
    queryBuiltinOperatorSignatures(pg),
    queryBuiltinImplicitCasts(pg),
    queryBuiltinTypeKinds(pg),
    queryBuiltinTypeNameAliases(pg),
    queryInherits(pg),
    queryTriggers(pg),
    queryRewriteRules(pg),
  ]);

  // Global type-name map (oid → format_type name) for resolving arg OIDs.
  const typeNames = new Map<number, string>();
  for (const t of typeRows) typeNames.set(t.oid, t.name);

  // (relid, attnum) → column-name index for resolving conkey/confkey/indkey.
  const attnumIdx = buildAttnumIndex(columnRows);

  // --- Columns grouped by relid (sorted by attnum, which the query does). ---
  const columnsByRel = new Map<number, ColumnInfo[]>();
  for (const c of columnRows) {
    const ci: ColumnInfo = {
      name: c.name,
      typeOid: c.type_oid,
      typeName: c.type_name,
      typeMod: c.type_mod,
      notNull: c.not_null,
      notNullTree: c.not_null,
      hasDefault: c.has_default,
      defaultExpr: c.default_expr,
      generated: mapGenerated(c.generated),
      generationDivergesInTree: false,
      identity: mapIdentity(c.identity),
      collationDeterministic: c.collation_deterministic,
    };
    const arr = columnsByRel.get(c.attrelid);
    if (arr) arr.push(ci);
    else columnsByRel.set(c.attrelid, [ci]);
  }

  // --- The inheritance closure, shared by the two relation-SET facts
  // below (notNullTree, writeRewritesTree). ---
  const childrenOf = new Map<number, number[]>();
  for (const ih of inheritsRows) {
    const arr = childrenOf.get(ih.inhparent);
    if (arr) arr.push(ih.inhrelid);
    else childrenOf.set(ih.inhparent, [ih.inhrelid]);
  }

  // --- The inheritance-tree conjunction for attnotnull. ---
  // `FROM p` scans the whole tree, and `ALTER TABLE ONLY p … SET NOT NULL`
  // is legal (measured): parent attnotnull=true, child false, and the
  // child's NULL comes back through the parent. So notNullTree weakens a
  // parent column to the conjunction over its descendants, matched by
  // column name (inherited columns share it). A descendant the column
  // capture did not see — a temp child, say — makes the conjunction false:
  // its rows are in the scan and nothing is known about them.
  {
    const descendantNotNull = (relid: number, column: string): boolean => {
      const kids = childrenOf.get(relid) ?? [];
      return kids.every(kid => {
        const col = columnsByRel.get(kid)?.find(c => c.name === column);
        return (col?.notNull ?? false) && descendantNotNull(kid, column);
      });
    };
    for (const parent of childrenOf.keys()) {
      for (const col of columnsByRel.get(parent) ?? []) {
        col.notNullTree = col.notNull && descendantNotNull(parent, col.name);
      }
    }
  }

  // --- The inheritance-tree agreement for generation expressions. ---
  // A child may define its OWN generation expression for an inherited
  // column (measured — the only accepted divergence besides CHECK … NO
  // INHERIT), and a tree scan evaluating the parent's formula would then
  // describe rows never computed with it. The comparison is the rendered
  // (generated, defaultExpr) pair per descendant, an uncaptured descendant
  // diverging — the notNullTree conventions. Only generated parent columns
  // get the bit: DEFAULT divergence is legal, common, and never read
  // through a scan.
  {
    const descendantGenerationAgrees = (
      relid: number,
      parentCol: ColumnInfo,
    ): boolean => {
      const kids = childrenOf.get(relid) ?? [];
      return kids.every(kid => {
        const col = columnsByRel.get(kid)?.find(c => c.name === parentCol.name);
        return (
          !!col &&
          col.generated === parentCol.generated &&
          col.defaultExpr === parentCol.defaultExpr &&
          descendantGenerationAgrees(kid, parentCol)
        );
      });
    };
    for (const parent of childrenOf.keys()) {
      for (const col of columnsByRel.get(parent) ?? []) {
        if (col.generated === "none") continue;
        col.generationDivergesInTree = !descendantGenerationAgrees(parent, col);
      }
    }
  }

  // --- Constraints grouped by conrelid. ---
  const constraintsByRel = new Map<number, ConstraintInfo[]>();
  for (const con of constraintRows) {
    const ci: ConstraintInfo = {
      name: con.name,
      type: mapConstraintType(con.contype),
      columns: resolveAttnums(con.conrelid, toNumArray(con.conkey), attnumIdx),
      foreignSchema: con.foreign_schema,
      foreignTable: con.foreign_table,
      // `confkey` numbers columns of the *referenced* relation, so it resolves
      // against `confrelid`. Resolving it against `conrelid` yields the
      // referencing table's column at the same position, which is a plausible
      // name and the wrong one.
      foreignColumns: con.contype === "f"
        ? resolveAttnums(con.confrelid, toNumArray(con.confkey), attnumIdx)
        : null,
      definition: con.definition,
      validated: con.validated,
      noInherit: con.noinherit,
      deferrable: con.deferrable,
      inheritedClone: con.inherited_clone,
    };
    const arr = constraintsByRel.get(con.conrelid);
    if (arr) arr.push(ci);
    else constraintsByRel.set(con.conrelid, [ci]);
  }
  // Constraints aren't ordered by the query; sort by name for determinism.
  for (const arr of constraintsByRel.values()) {
    arr.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  }

  // --- Write-path rewriting hooks per relation (finding 2). ---
  // tgtype bits and ev_type encodings are documented on the two queries.
  const writeRewritesByRel = new Map<number, WriteRewriteInfo>();
  const rewritesOf = (relid: number): WriteRewriteInfo => {
    let wr = writeRewritesByRel.get(relid);
    if (!wr) {
      wr = { beforeRow: [], insteadOf: [], insteadRules: [] };
      writeRewritesByRel.set(relid, wr);
    }
    return wr;
  };
  const addSorted = (arr: string[], cmd: string): void => {
    if (!arr.includes(cmd)) {
      arr.push(cmd);
      arr.sort();
    }
  };
  for (const t of triggerRows) {
    if (!(t.tgtype & 1)) continue; // statement-level: no row to rewrite
    const commands = [
      ...(t.tgtype & 4 ? ["insert"] : []),
      ...(t.tgtype & 8 ? ["delete"] : []),
      ...(t.tgtype & 16 ? ["update"] : []),
    ];
    const wr = rewritesOf(t.tgrelid);
    for (const cmd of commands) {
      if (t.tgtype & 64) addSorted(wr.insteadOf, cmd);
      else if (t.tgtype & 2) addSorted(wr.beforeRow, cmd);
    }
  }
  const RULE_COMMANDS: Record<string, string> = { "2": "update", "3": "insert", "4": "delete" };
  for (const r of rewriteRuleRows) {
    const cmd = RULE_COMMANDS[r.ev_type];
    // DO ALSO leaves the original statement (and its RETURNING) in place.
    if (!cmd || !r.is_instead) continue;
    addSorted(rewritesOf(r.ev_class).insteadRules, cmd);
  }
  const NO_REWRITES: WriteRewriteInfo = { beforeRow: [], insteadOf: [], insteadRules: [] };
  const writeRewritesFor = (relid: number | undefined): WriteRewriteInfo =>
    (relid !== undefined ? writeRewritesByRel.get(relid) : undefined) ?? NO_REWRITES;

  // The relation-SET hooks: the trigger that rewrites a row is the trigger
  // of the relation the row LIVES in, so `beforeRow` unions over the
  // inheritance subtree — an INSERT through a partitioned parent fires the
  // PARTITION's BEFORE ROW trigger, an UPDATE through an inheritance parent
  // fires the CHILD's for child rows (both measured). Rules attach to the
  // named RTE and do not fire through a parent (measured), and INSTEAD OF
  // triggers live on views, which have no descendants — both stay the
  // relation's own.
  const writeRewritesTreeFor = (relid: number): WriteRewriteInfo => {
    const own = writeRewritesFor(relid);
    const beforeRow = new Set(own.beforeRow);
    const visit = (id: number): void => {
      for (const kid of childrenOf.get(id) ?? []) {
        for (const cmd of writeRewritesByRel.get(kid)?.beforeRow ?? []) beforeRow.add(cmd);
        visit(kid);
      }
    };
    visit(relid);
    return {
      beforeRow: [...beforeRow].sort(),
      insteadOf: own.insteadOf,
      insteadRules: own.insteadRules,
    };
  };

  // --- Tables. ---
  const tables: TableInfo[] = tableRows.map(t => ({
    schema: t.schema,
    name: t.name,
    relkind: t.relkind as TableInfo["relkind"],
    columns: columnsByRel.get(t.oid) ?? [],
    constraints: constraintsByRel.get(t.oid) ?? [],
    storageParams: parseStorageParams(t.reloptions),
    writeRewrites: writeRewritesFor(t.oid),
    writeRewritesTree: writeRewritesTreeFor(t.oid),
    hasDescendants: childrenOf.has(t.oid),
  })).sort(bySchemaName);

  // For views/matviews we need their column lists. The view-definition
  // queries (pg_views/pg_matviews) don't expose the OID, so look up the
  // relid per (schema, name, relkind) in a single query each.
  const viewRelIds = await queryRelIdsByKind(pg, "v");
  const matviewRelIds = await queryRelIdsByKind(pg, "m");

  const views: ViewInfo[] = viewRows.map(v => {
    const relid = viewRelIds.get(`${v.schemaname}.${v.viewname}`);
    return {
      schema: v.schemaname,
      name: v.viewname,
      columns: relid !== undefined ? (columnsByRel.get(relid) ?? []) : [],
      definition: v.definition,
      writeRewrites: writeRewritesFor(relid),
    };
  }).sort(bySchemaName);

  const materializedViews: ViewInfo[] = matviewRows.map(v => {
    const relid = matviewRelIds.get(`${v.schemaname}.${v.viewname}`);
    return {
      schema: v.schemaname,
      name: v.viewname,
      columns: relid !== undefined ? (columnsByRel.get(relid) ?? []) : [],
      definition: v.definition,
      writeRewrites: writeRewritesFor(relid),
    };
  }).sort(bySchemaName);

  // --- Indexes. ---
  const indexes: IndexInfo[] = indexRows.map(ix => ({
    schema: ix.schema,
    name: ix.name,
    tableSchema: ix.table_schema,
    tableName: ix.table_name,
    // indkey's attnums are relative to the *table* (indrelid), not the index.
    // We resolve via the table's columns. For the index we only know the
    // index relid; the table relid isn't returned, so resolve against the
    // table columns by matching table name. Simpler: resolve by looking up
    // the table's relid from tableRows.
    columns: resolveIndexColumns(ix, tableRows, attnumIdx),
    unique: ix.indisunique,
    primary: ix.indisprimary,
    partial: ix.partial,
    method: ix.amname,
    definition: ix.definition,
  })).sort((a, b) =>
    a.schema < b.schema ? -1 : a.schema > b.schema ? 1
      : a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );

  // --- Functions. ---
  const functions: FunctionInfo[] = functionRows.map(f => ({
    schema: f.schema,
    name: f.name,
    argTypes: f.arg_types,
    args: resolveFunctionArgs(f, typeNames),
    // `pg_get_function_result` answers NULL for a PROCEDURE — it returns no
    // rows, so there is no result to render — while `FunctionInfo.returnType`
    // is declared `string` and eight readers do prefix or regex work on it.
    // The empty rendering is the honest one (a procedure's result shape is
    // nothing) and it matches none of them, where the raw NULL crashed the
    // first caller to meet a procedure.
    returnType: f.return_type ?? "",
    returnTypeOid: f.return_type_oid,
    returnsSet: f.proretset,
    language: f.language,
    isProcedure: f.prokind === "p",
    isAggregate: f.prokind === "a",
    aggInitVal: f.agg_init_val ?? null,
    isWindow: f.prokind === "w",
    securityDefiner: f.prosecdef,
    strict: f.proisstrict,
    volatile: mapVolatility(f.provolatile),
    cost: f.procost,
    rows: f.prorows,
    body: f.prosrc,
    definition: f.definition,
  })).sort(bySchemaName);

  // --- Enums. ---
  const enumValuesByType = new Map<number, string[]>();
  for (const ev of enumValueRows) {
    const arr = enumValuesByType.get(ev.enumtypid);
    if (arr) arr.push(ev.enumlabel);
    else enumValuesByType.set(ev.enumtypid, [ev.enumlabel]);
  }
  const enums: EnumInfo[] = enumTypeRows.map(e => ({
    schema: e.schema,
    name: e.name,
    values: enumValuesByType.get(e.oid) ?? [],
  })).sort(bySchemaName);

  // --- Domains. ---
  const domains: DomainInfo[] = domainRows.map(d => ({
    schema: d.schema,
    name: d.name,
    oid: d.oid,
    baseTypeOid: d.base_type_oid,
    baseTypeName: d.base_type_name,
    notNull: d.not_null,
    default: d.default_expr,
    checks: d.check_exprs ?? [],
  })).sort(bySchemaName);

  // --- Composite types (user-defined CREATE TYPE AS (...), not table row types). ---
  const attrsByRel = new Map<number, CompositeTypeAttrInfo[]>();
  for (const a of compositeAttrRows) {
    const ai: CompositeTypeAttrInfo = {
      name: a.name,
      typeOid: a.type_oid,
      typeName: a.type_name,
    };
    const arr = attrsByRel.get(a.typrelid);
    if (arr) arr.push(ai);
    else attrsByRel.set(a.typrelid, [ai]);
  }
  const compositeTypes: CompositeTypeInfo[] = compositeTypeRows.map(t => ({
    schema: t.schema,
    name: t.name,
    attributes: attrsByRel.get(t.typrelid) ?? [],
  })).sort(bySchemaName);

  // --- Sequences. ---
  const sequences: SequenceInfo[] = sequenceRows.map(s => {
    const ownedTable = s.owned_by_schema && s.owned_by_table
      ? `${s.owned_by_schema}.${s.owned_by_table}` : null;
    return {
      schema: s.schema,
      name: s.name,
      typeOid: s.type_oid,
      typeName: s.type_name,
      start: s.start,
      increment: s.increment,
      min: s.min,
      max: s.max,
      cache: s.cache,
      cycle: s.cycle,
      ownedByTable: ownedTable,
      ownedByColumn: s.owned_by_column,
    };
  }).sort(bySchemaName);

  // --- Extensions. ---
  const extensions: ExtensionInfo[] = extensionRows.map(e => ({
    name: e.name,
    version: e.version,
    schema: e.schema,
  })).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

  // --- Schemas. ---
  const schemas: SchemaInfo[] = schemaRows.map(s => ({
    name: s.name,
    owner: s.owner,
  })).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

  const operators = operatorRows.map(o => ({
    schema: o.schema,
    name: o.name,
    leftType: o.left_type,
    rightType: o.right_type,
    functionSchema: o.function_schema,
    functionName: o.function_name,
    strict: o.strict,
    resultType: o.result_type,
  }));

  return {
    tables,
    views,
    materializedViews,
    indexes,
    functions,
    operators,
    enums,
    domains,
    compositeTypes,
    sequences,
    extensions,
    schemas,
    builtinStrictFunctions,
    builtinTableFunctions,
    builtinSetReturningFunctions,
    builtinAggregateFunctions,
    builtinFunctionNames,
    builtinPolymorphicFunctions,
    builtinPolymorphicArraySignatures,
    builtinFunctionSignatures,
    builtinOperatorSignatures,
    builtinImplicitCasts,
    builtinTypeKinds,
    builtinTypeNameAliases,
  };
}

/**
 * Resolve an index's key column names. `indkey` attnums are relative to the
 * *table* (indrelid); we look up the table relid by (schema, name) from the
 * table rows, then resolve attnums via the global attnum index.
 */
function resolveIndexColumns(
  ix: IndexRow,
  tableRows: TableRow[],
  attnumIdx: Map<string, string>,
): string[] {
  // Find the table's relid by matching schema + table name.
  let tableOid: number | undefined;
  for (const t of tableRows) {
    if (t.schema === ix.table_schema && t.name === ix.table_name) {
      tableOid = t.oid;
      break;
    }
  }
  if (tableOid === undefined) return [];
  return resolveAttnums(tableOid, toNumArray(ix.indkey), attnumIdx);
}

/**
 * Look up `pg_class.oid` for every (schema, name) of a given relkind in user
 * schemas, in a single query. Used to attach the right column list to each
 * view/matview (the view-definition queries don't expose the OID).
 */
async function queryRelIdsByKind(
  pg: PGlite,
  relkind: string,
): Promise<Map<string, number>> {
  const res = await pg.query<{ oid: number; schema: string; name: string }>(
    `SELECT c.oid, n.nspname AS schema, c.relname AS name
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.relkind = $1 AND ${USER_NS};`,
    [relkind],
  );
  const out = new Map<string, number>();
  for (const r of res.rows) out.set(`${r.schema}.${r.name}`, r.oid);
  return out;
}

// ---------------------------------------------------------------------------
// Individual catalog queries
// ---------------------------------------------------------------------------

/** All type OIDs → canonical names (format_type). Used for arg-type resolution. */
async function queryTypeNames(pg: PGlite): Promise<TypeNameRow[]> {
  const res = await pg.query<TypeNameRow>(
    `SELECT t.oid, COALESCE(format_type(t.oid, null), t.typname) AS name
     FROM pg_type t;`,
  );
  return res.rows;
}

/**
 * Plain tables ('r'), partitioned tables ('p' — the parents; their
 * partitions arrive as 'r'), and foreign tables ('f'). A relation absent
 * here is one the nullability walk REFUSES rather than resolves — star
 * expansion over an unknown relation would silently drop its columns — so
 * the capture set is the resolution set.
 */
async function queryTables(pg: PGlite): Promise<TableRow[]> {
  const res = await pg.query<TableRow>(
    `SELECT c.oid, n.nspname AS schema, c.relname AS name, c.relkind, c.reloptions
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.relkind IN ('r', 'p', 'f') AND ${USER_NS}
     ORDER BY n.nspname, c.relname;`,
  );
  return res.rows;
}

/**
 * Columns for tables (relkind 'r'/'p'/'f' — the same set queryTables
 * captures), views ('v'), and materialized views ('m'). One row per
 * (relid, attnum). Sorted by relid then attnum so grouping preserves
 * column order.
 */
async function queryColumns(pg: PGlite): Promise<ColumnRow[]> {
  const res = await pg.query<ColumnRow>(
    `SELECT a.attrelid, a.attname AS name, a.attnum,
            a.atttypid AS type_oid,
            format_type(a.atttypid, a.atttypmod) AS type_name,
            a.atttypmod AS type_mod,
            a.attnotnull AS not_null,
            (ad.adbin IS NOT NULL) AS has_default,
            pg_get_expr(ad.adbin, ad.adrelid) AS default_expr,
            a.attgenerated AS generated,
            a.attidentity AS identity,
            co.collisdeterministic AS collation_deterministic
     FROM pg_attribute a
     JOIN pg_class c ON c.oid = a.attrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
     LEFT JOIN pg_collation co ON co.oid = a.attcollation
     WHERE c.relkind IN ('r', 'p', 'f', 'v', 'm')
       AND ${USER_NS}
       AND a.attnum > 0 AND NOT a.attisdropped
     ORDER BY a.attrelid, a.attnum;`,
  );
  return res.rows;
}

/**
 * Every inheritance edge, unfiltered by namespace: a child outside the
 * captured namespaces (a temp child, say) still contributes rows to a tree
 * scan of its parent, and the conjunction must know it exists even when its
 * columns were not captured.
 */
async function queryInherits(pg: PGlite): Promise<InheritsRow[]> {
  const res = await pg.query<InheritsRow>(
    `SELECT inhrelid, inhparent FROM pg_inherits;`,
  );
  return res.rows;
}

/**
 * User triggers (tgisinternal excludes the FK/constraint machinery), with the
 * packed tgtype: bit 0 ROW, bit 1 BEFORE, bits 2/3/4 INSERT/DELETE/UPDATE,
 * bit 6 INSTEAD (encodings measured against real triggers).
 *
 * Deliberately unfiltered by namespace: `writeRewritesTree` unions a parent's
 * hooks over its inheritance subtree, and a descendant outside the captured
 * namespaces (a temp child, say) still rewrites rows written through the
 * parent. System relations contribute nothing — their machinery is
 * tgisinternal.
 */
async function queryTriggers(pg: PGlite): Promise<TriggerRow[]> {
  const res = await pg.query<TriggerRow>(
    `SELECT t.tgrelid, t.tgtype
     FROM pg_trigger t
     WHERE NOT t.tgisinternal;`,
  );
  return res.rows;
}

/**
 * Rewrite rules other than a view's own `_RETURN` SELECT rule. ev_type is a
 * CmdType character: '1' SELECT, '2' UPDATE, '3' INSERT, '4' DELETE
 * (measured — pg_settings' update rules carry '2').
 */
async function queryRewriteRules(pg: PGlite): Promise<RewriteRuleRow[]> {
  const res = await pg.query<RewriteRuleRow>(
    `SELECT r.ev_class, r.ev_type, r.is_instead
     FROM pg_rewrite r
     JOIN pg_class c ON c.oid = r.ev_class
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE r.rulename <> '_RETURN' AND ${USER_NS};`,
  );
  return res.rows;
}

async function queryConstraints(pg: PGlite): Promise<ConstraintRow[]> {
  const res = await pg.query<ConstraintRow>(
    `SELECT con.conname AS name, con.contype, con.conrelid, con.confrelid,
            tn.nspname AS foreign_schema,
            tc.relname AS foreign_table,
            con.conkey, con.confkey,
            pg_get_constraintdef(con.oid) AS definition,
            con.convalidated AS validated,
            con.connoinherit AS noinherit,
            con.condeferrable AS deferrable,
            con.conparentid <> 0 AS inherited_clone
     FROM pg_constraint con
     JOIN pg_class c ON c.oid = con.conrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     LEFT JOIN pg_class tc ON tc.oid = con.confrelid
     LEFT JOIN pg_namespace tn ON tn.oid = tc.relnamespace
     WHERE ${USER_NS};`,
  );
  return res.rows;
}

async function queryViews(pg: PGlite): Promise<ViewRow[]> {
  const res = await pg.query<ViewRow>(
    `SELECT schemaname, viewname, definition
     FROM pg_views
     WHERE schemaname NOT IN ${USER_SCHEMA_EXCLUDE}
       AND schemaname NOT LIKE 'pg_temp_%'
       AND schemaname NOT LIKE 'pg_toast_temp_%'
     ORDER BY schemaname, viewname;`,
  );
  return res.rows;
}

async function queryMatViews(pg: PGlite): Promise<ViewRow[]> {
  const res = await pg.query<ViewRow>(
    `SELECT schemaname, matviewname AS viewname, definition
     FROM pg_matviews
     WHERE schemaname NOT IN ${USER_SCHEMA_EXCLUDE}
       AND schemaname NOT LIKE 'pg_temp_%'
       AND schemaname NOT LIKE 'pg_toast_temp_%'
     ORDER BY schemaname, matviewname;`,
  );
  return res.rows;
}

/**
 * One row per index the schema author DECLARED.
 *
 * `relkind = 'i'` alone captured the wrong set on a partitioned table:
 * `CREATE INDEX` there creates the declared index as relkind 'I' plus one
 * relkind 'i' CLONE per partition, so the declaration was dropped and its
 * clones — named after the partitions, which no migration mentions —
 * registered in its place. Both halves are fixed here: 'I' joins the capture,
 * and `relispartition` (true only for an index that is part of a partitioned
 * index) removes the clones.
 *
 * An index written directly on a partition keeps its row: `relispartition` is
 * false until a parent partitioned index adopts it, at which point it IS a
 * clone of that declaration (measured).
 */
async function queryIndexes(pg: PGlite): Promise<IndexRow[]> {
  const res = await pg.query<IndexRow>(
    `SELECT c.oid, n.nspname AS schema, c.relname AS name,
            tn.nspname AS table_schema, tc.relname AS table_name,
            i.indkey, i.indisunique, i.indisprimary,
            pg_get_expr(i.indpred, i.indrelid) AS partial,
            am.amname,
            pg_get_indexdef(c.oid) AS definition
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     JOIN pg_index i ON i.indexrelid = c.oid
     JOIN pg_class tc ON tc.oid = i.indrelid
     JOIN pg_namespace tn ON tn.oid = tc.relnamespace
     JOIN pg_am am ON am.oid = c.relam
     WHERE c.relkind IN ('i', 'I') AND NOT c.relispartition AND ${USER_NS}
     ORDER BY n.nspname, c.relname;`,
  );
  return res.rows;
}

/**
 * Functions/procedures in user schemas. Extension functions (deptype='e') are
 * INCLUDED — they're part of the schema state even though the validate
 * pipeline skips them. Aggregates are included too (prokind='a') for the
 * snapshot; the diff handles them like any function.
 */
async function queryFunctions(pg: PGlite): Promise<FunctionRow[]> {
  const res = await pg.query<FunctionRow>(
    `SELECT p.oid, n.nspname AS schema, p.proname AS name,
            pg_get_function_identity_arguments(p.oid) AS arg_types,
            pg_get_function_result(p.oid) AS return_type,
            p.prorettype AS return_type_oid,
            l.lanname AS language,
            p.prokind,
            p.proretset,
            p.prosecdef,
            p.proisstrict,
            p.provolatile,
            p.procost,
            p.prorows,
            p.prosrc,
            -- pg_get_functiondef raises "is an aggregate function" (42809,
            -- ruleutils.c) for prokind 'a' — it supports only functions and
            -- procedures — so aggregates snapshot with a NULL definition.
            CASE WHEN p.prokind != 'a'
                 THEN pg_get_functiondef(p.oid)
                 ELSE NULL
            END AS definition,
            p.proallargtypes,
            p.proargtypes::text AS proargtypes,
            p.proargnames,
            p.proargmodes,
            p.pronargs,
            p.pronargdefaults,
            -- One default expression per argument POSITION. The second
            -- argument of pg_get_function_arg_default indexes the FULL
            -- argument list (it maps that position to the input-argument
            -- number itself, and answers NULL for an OUT position —
            -- measured), so the array lines up with proallargtypes and needs
            -- no mode arithmetic on this side. Skipped entirely for the
            -- functions that have no defaults, which is nearly all of them.
            CASE WHEN p.pronargdefaults > 0
                 THEN ARRAY(SELECT pg_get_function_arg_default(p.oid, i)
                            FROM generate_series(
                                   1,
                                   coalesce(array_length(p.proallargtypes, 1), p.pronargs)
                                 ) i)
                 ELSE NULL
            END AS argdefaults,
            a.agginitval AS agg_init_val
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     JOIN pg_language l ON l.oid = p.prolang
     LEFT JOIN pg_aggregate a ON a.aggfnoid = p.oid
     WHERE ${USER_NS}
     ORDER BY n.nspname, p.proname;`,
  );
  return res.rows;
}

/**
 * pg_catalog function names whose EVERY plain-function overload is declared
 * STRICT — the source of truth the strict-expression closures consult,
 * replacing hand-curated measurement. Name-level bool_and is what makes the
 * unknown-overload policy sound: whichever overload PostgreSQL resolves, it
 * is strict. prokind = 'f' excludes aggregates and window functions, whose
 * NULL semantics are not per-row strictness.
 */
/**
 * pg_catalog functions that emit MORE THAN A BARE SCALAR in FROM position,
 * as `TABLE(col type, …)` — the rendering `columnsForReturnType` already
 * consumes.
 *
 * `pg_get_function_result` is useless for these: a builtin declared with OUT
 * parameters renders as `SETOF record` (measured — json_each, jsonb_each,
 * pg_get_keywords all do), while the column names and types live in
 * proargnames/proallargtypes. So the shape is reassembled here from the
 * output-mode arguments ('o' OUT, 't' TABLE, 'b' INOUT).
 *
 * Without it the walk falls to its unknown-function guess — ONE column named
 * after the function — which is right for `generate_series` and wrong for
 * every builtin with named output columns: `SELECT * FROM json_each(...)`
 * has two (`key`, `value`), and `jsonb_array_elements` has one named
 * `value`, the same arity as the guess and a different name.
 *
 * A name whose overloads disagree on the rendered shape is EXCLUDED and
 * keeps the guess — no such name exists in PG18 (measured), but the
 * consensus rule is what makes name-level capture sound at all.
 *
 * ENVIRONMENT, not schema, exactly like `builtinStrictFunctions`: it
 * describes the PostgreSQL version, never changes with a migration, and is
 * absent from the diff's comparable states.
 */
async function queryBuiltinTableFunctions(pg: PGlite): Promise<Record<string, string>> {
  const res = await pg.query<{ name: string; shape: string }>(
    `WITH outs AS (
       SELECT p.oid, p.proname AS name,
              string_agg(
                quote_ident(a.argname) || ' ' || format_type(a.argtype, NULL),
                ', ' ORDER BY a.ord
              ) AS cols
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       CROSS JOIN LATERAL unnest(p.proallargtypes, p.proargmodes, p.proargnames)
            WITH ORDINALITY AS a(argtype, argmode, argname, ord)
       WHERE n.nspname = 'pg_catalog'
         AND p.prokind = 'f'
         AND a.argmode IN ('o', 't', 'b')
         AND a.argname IS NOT NULL
       GROUP BY p.oid, p.proname
     )
     SELECT name, min(cols) AS shape
     FROM outs
     GROUP BY name
     HAVING count(DISTINCT cols) = 1
     ORDER BY name;`,
  );
  const out: Record<string, string> = {};
  for (const row of res.rows) out[row.name] = `TABLE(${row.shape})`;
  return out;
}

/**
 * pg_catalog function names with at least one SET-RETURNING overload — the
 * measured replacement for a hand-curated table of 21 names (adversarial-3
 * finding 1). See CatalogSnapshot.builtinSetReturningFunctions for why the
 * quantifier is bool_or and why this is ENVIRONMENT rather than schema.
 */
async function queryBuiltinSetReturningFunctions(pg: PGlite): Promise<string[]> {
  const res = await pg.query<{ name: string }>(
    `SELECT p.proname AS name
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'pg_catalog' AND p.prokind = 'f'
     GROUP BY p.proname
     HAVING bool_or(p.proretset)
     ORDER BY p.proname;`,
  );
  return res.rows.map(r => r.name);
}

/**
 * Every pg_catalog function name — the set PostgreSQL searches implicitly
 * and FIRST (adversarial-3 finding 6). See
 * CatalogSnapshot.builtinFunctionNames.
 */
async function queryBuiltinFunctionNames(pg: PGlite): Promise<string[]> {
  const res = await pg.query<{ name: string }>(
    `SELECT DISTINCT p.proname AS name
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'pg_catalog' AND p.prokind = 'f'
     ORDER BY p.proname;`,
  );
  return res.rows.map(r => r.name);
}

/**
 * pg_catalog function names with a POLYMORPHIC return type, where the type
 * a call actually yields comes from its arguments. See
 * CatalogSnapshot.builtinPolymorphicFunctions.
 *
 * The predicate is the `any…` type NAMES, not `typtype = 'p'`. Those are not
 * the same question and the difference is 572 names against 65: `'p'` is
 * PSEUDO-type, which also covers `trigger`, `void`, `cstring`, `record`,
 * `internal` and the handler types, none of which is polymorphic. The
 * direction was safe — the only consumer concludes `scalar` from a builtin
 * being NON-polymorphic, so over-capture refuses where PostgreSQL would have
 * answered — but it made a documented 68-name set silently nine times wider
 * than its own comment. Found by the catalog-feature census
 * (docs/generated-surface.md item 1) while classifying `pg_type.typtype`.
 */
async function queryBuiltinPolymorphicFunctions(pg: PGlite): Promise<string[]> {
  const res = await pg.query<{ name: string }>(
    `SELECT DISTINCT p.proname AS name
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     JOIN pg_type rt ON rt.oid = p.prorettype
     WHERE n.nspname = 'pg_catalog' AND p.prokind = 'f'
       AND rt.typname LIKE 'any%'
     ORDER BY p.proname;`,
  );
  return res.rows.map(r => r.name);
}

/**
 * The pg_catalog signatures whose return type is a polymorphic ARRAY. See
 * CatalogSnapshot.builtinPolymorphicArraySignatures for the resolution rule
 * they exist to answer.
 *
 * `proargtypes` rather than `proallargtypes` deliberately: it is the INPUT
 * list, which is what a call's own argument list lines up against, and none
 * of these declares an OUT parameter. Aggregates are included — `array_agg`
 * is one, and it is the shape that made this capture necessary.
 */
async function queryBuiltinPolymorphicArraySignatures(
  pg: PGlite,
): Promise<BuiltinSignature[]> {
  const res = await pg.query<{ name: string; args: string[] | null; returns: string }>(
    `SELECT p.proname AS name,
            (SELECT array_agg(format_type(t, null) ORDER BY o)
               FROM unnest(p.proargtypes) WITH ORDINALITY AS u(t, o)) AS args,
            format_type(p.prorettype, null) AS returns
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'pg_catalog'
       AND p.prokind IN ('f', 'a')
       AND format_type(p.prorettype, null) IN ('anyarray', 'anycompatiblearray')
       AND EXISTS (
         SELECT 1 FROM unnest(p.proargtypes) t
         WHERE format_type(t, null) IN ('anyarray', 'anycompatiblearray', 'anyelement',
                                        'anynonarray', 'anycompatible', 'anyenum')
       )
     ORDER BY p.proname, 2;`,
  );
  return res.rows.map(r => ({ name: r.name, args: r.args ?? [], returns: r.returns }));
}

/**
 * The pg_catalog signatures behind the curated claim tables. See
 * CatalogSnapshot.builtinFunctionSignatures for scope; the extra columns are
 * the resolution keys docs/type-aware-overloads.md measured — prokind for
 * call-shape dispatch, aggnumdirectargs for the WITHIN GROUP split,
 * provariadic for the never-exact `"any"` variadic, per-row strictness.
 *
 * `proargtypes` for the same reason as the polymorphic capture above: it is
 * the INPUT list a call's arguments line up against — and for an ordered-set
 * aggregate it includes the ORDER BY positions, which is exactly what the
 * capture must preserve.
 */
async function queryBuiltinFunctionSignatures(
  pg: PGlite,
): Promise<BuiltinFunctionSignature[]> {
  const res = await pg.query<{
    name: string;
    args: string[] | null;
    returns: string;
    strict: boolean;
    kind: string;
    agg_kind: string | null;
    num_direct_args: number | null;
    variadic: string | null;
    num_arg_defaults: number;
  }>(
    `SELECT p.proname AS name,
            (SELECT array_agg(format_type(t, null) ORDER BY o)
               FROM unnest(p.proargtypes) WITH ORDINALITY AS u(t, o)) AS args,
            format_type(p.prorettype, null) AS returns,
            p.proisstrict AS strict,
            p.prokind AS kind,
            a.aggkind AS agg_kind,
            a.aggnumdirectargs::int AS num_direct_args,
            CASE WHEN p.provariadic <> 0
                 THEN format_type(p.provariadic, null) END AS variadic,
            p.pronargdefaults::int AS num_arg_defaults
     FROM pg_proc p
     LEFT JOIN pg_aggregate a ON a.aggfnoid = p.oid
     JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'pg_catalog'
       AND p.prokind IN ('f', 'a', 'w')
       AND (p.proname = ANY($1)
            -- The WITHIN GROUP verdicts are CLASS claims — "hypothetical-set
            -- → never NULL" holds per aggkind, not per curated name — so the
            -- class scopes itself; the two name tables that mirrored it
            -- retired (they were asserted catalog-equal both ways).
            OR a.aggkind IN ('h', 'o'))
     ORDER BY p.proname, 2;`,
    [CLAIMED_FUNCTION_NAMES],
  );
  return res.rows.map(r => ({
    name: r.name,
    args: r.args ?? [],
    returns: r.returns,
    strict: r.strict,
    kind: r.kind as "f" | "a" | "w",
    aggKind: r.agg_kind as "n" | "o" | "h" | null,
    numDirectArgs: r.num_direct_args,
    variadic: r.variadic,
    numArgDefaults: r.num_arg_defaults,
  }));
}

/**
 * The pg_catalog rows for the curated operator symbols. See
 * CatalogSnapshot.builtinOperatorSignatures. The JOIN on pg_proc drops shell
 * operators (`oprcode = 0`) — the register's 1a sweep measured they cannot
 * be invoked, so dropping is sound; none exists in pg_catalog anyway.
 */
async function queryBuiltinOperatorSignatures(
  pg: PGlite,
): Promise<BuiltinOperatorSignature[]> {
  const res = await pg.query<{
    name: string;
    left_type: string | null;
    right_type: string | null;
    returns: string;
    strict: boolean;
  }>(
    `SELECT o.oprname AS name,
            CASE WHEN o.oprleft <> 0
                 THEN format_type(o.oprleft, null) END AS left_type,
            CASE WHEN o.oprright <> 0
                 THEN format_type(o.oprright, null) END AS right_type,
            format_type(o.oprresult, null) AS returns,
            p.proisstrict AS strict
     FROM pg_operator o
     JOIN pg_proc p ON p.oid = o.oprcode
     JOIN pg_namespace n ON n.oid = o.oprnamespace
     WHERE n.nspname = 'pg_catalog'
       AND o.oprname = ANY($1)
     ORDER BY o.oprname, 2, 3;`,
    [CLAIMED_OPERATOR_NAMES],
  );
  return res.rows.map(r => ({
    name: r.name,
    leftType: r.left_type,
    rightType: r.right_type,
    returns: r.returns,
    strict: r.strict,
  }));
}

/**
 * The pg_cast implicit rows. See CatalogSnapshot.builtinImplicitCasts;
 * IMPLICIT only because function arguments never use assignment casts
 * (docs/type-aware-overloads.md, the elimination rule).
 */
async function queryBuiltinImplicitCasts(pg: PGlite): Promise<ImplicitCastInfo[]> {
  const res = await pg.query<{ source: string; target: string; binary: boolean }>(
    `SELECT format_type(c.castsource, null) AS source,
            format_type(c.casttarget, null) AS target,
            c.castmethod = 'b' AS binary
     FROM pg_cast c
     WHERE c.castcontext = 'i'
     ORDER BY 1, 2;`,
  );
  return res.rows.map(r => ({ source: r.source, target: r.target, binary: r.binary }));
}

/**
 * Every pg_catalog type's typtype, keyed by rendered name. See
 * CatalogSnapshot.builtinTypeKinds for the both-directions reading the
 * polymorphic predicate makes of it.
 */
async function queryBuiltinTypeKinds(pg: PGlite): Promise<Record<string, string>> {
  const res = await pg.query<{ name: string; kind: string }>(
    `SELECT format_type(t.oid, null) AS name, t.typtype AS kind
     FROM pg_type t
     JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = 'pg_catalog'
     ORDER BY 1;`,
  );
  const out: Record<string, string> = {};
  for (const r of res.rows) out[r.name] = r.kind;
  return out;
}

/**
 * typname → format_type for the pg_catalog types where they differ. See
 * CatalogSnapshot.builtinTypeNameAliases; array spellings (`_int4`) are
 * excluded because a cast's array-ness arrives as `arrayBounds`, not in the
 * name.
 */
async function queryBuiltinTypeNameAliases(pg: PGlite): Promise<Record<string, string>> {
  const res = await pg.query<{ alias: string; name: string }>(
    `SELECT t.typname AS alias, format_type(t.oid, null) AS name
     FROM pg_type t
     JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = 'pg_catalog'
       AND t.typname NOT LIKE '\\_%'
       AND t.typname <> format_type(t.oid, null)
     ORDER BY 1;`,
  );
  const out: Record<string, string> = {};
  for (const r of res.rows) out[r.alias] = r.name;
  return out;
}

/**
 * pg_catalog aggregate names. See CatalogSnapshot.builtinAggregateFunctions
 * for the three ways the hand-curated table it replaces had drifted.
 */
async function queryBuiltinAggregateFunctions(pg: PGlite): Promise<string[]> {
  const res = await pg.query<{ name: string }>(
    `SELECT DISTINCT p.proname AS name
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'pg_catalog' AND p.prokind = 'a'
     ORDER BY p.proname;`,
  );
  return res.rows.map(r => r.name);
}

async function queryBuiltinStrictFunctions(pg: PGlite): Promise<string[]> {
  const res = await pg.query<{ name: string }>(
    `SELECT p.proname AS name
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'pg_catalog' AND p.prokind = 'f'
     GROUP BY p.proname
     HAVING bool_and(p.proisstrict)
     ORDER BY p.proname;`,
  );
  return res.rows.map(r => r.name);
}

interface OperatorRow {
  schema: string;
  name: string;
  left_type: string | null;
  right_type: string | null;
  function_schema: string;
  function_name: string;
  strict: boolean;
  result_type: string;
}

/**
 * User-defined operators, with the strictness of their backing function.
 * Only user namespaces — builtin operator semantics live in the curated
 * TOTAL_STRICT_OPERATORS set, and a user operator shadowing a builtin NAME
 * over custom types is the documented blind spot of that policy.
 */
async function queryOperators(pg: PGlite): Promise<OperatorRow[]> {
  const res = await pg.query<OperatorRow>(
    `SELECT n.nspname AS schema, o.oprname AS name,
            CASE WHEN o.oprleft = 0 THEN NULL
                 ELSE format_type(o.oprleft, NULL) END AS left_type,
            CASE WHEN o.oprright = 0 THEN NULL
                 ELSE format_type(o.oprright, NULL) END AS right_type,
            fn.nspname AS function_schema, p.proname AS function_name,
            p.proisstrict AS strict,
            format_type(o.oprresult, NULL) AS result_type
     FROM pg_operator o
     JOIN pg_namespace n ON n.oid = o.oprnamespace
     JOIN pg_proc p ON p.oid = o.oprcode
     JOIN pg_namespace fn ON fn.oid = p.pronamespace
     WHERE ${USER_NS}
     ORDER BY n.nspname, o.oprname, left_type, right_type;`,
  );
  return res.rows;
}

async function queryEnumTypes(pg: PGlite): Promise<EnumTypeRow[]> {
  const res = await pg.query<EnumTypeRow>(
    `SELECT t.oid, n.nspname AS schema, t.typname AS name
     FROM pg_type t
     JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE t.typtype = 'e' AND ${USER_NS}
     ORDER BY n.nspname, t.typname;`,
  );
  return res.rows;
}

async function queryEnumValues(pg: PGlite): Promise<EnumValueRow[]> {
  // All enum values (filtered to user enums at assembly time via the type map).
  const res = await pg.query<EnumValueRow>(
    `SELECT e.enumtypid, e.enumlabel, e.enumsortorder
     FROM pg_enum e
     ORDER BY e.enumtypid, e.enumsortorder;`,
  );
  return res.rows;
}

async function queryDomains(pg: PGlite): Promise<DomainRow[]> {
  const res = await pg.query<DomainRow>(
    `SELECT t.oid, n.nspname AS schema, t.typname AS name,
            t.typbasetype AS base_type_oid,
            format_type(t.typbasetype, null) AS base_type_name,
            t.typnotnull AS not_null,
            -- Domain defaults: typdefault is the pre-deparsed SQL text
            -- (e.g. 'unknown'::text). pg_get_expr(typdefaultbin, oid) returns
            -- null for domains, so use typdefault directly.
            t.typdefault AS default_expr,
            -- EVERY check, ordered by name. A domain may declare any number
            -- of them; this was LIMIT 1 with no ORDER BY, which kept one
            -- arbitrarily — the rest were invisible to the diff, and the one
            -- kept depended on catalog row order, so the same domain could
            -- compare unequal to itself across a replay.
            (SELECT array_agg(pg_get_constraintdef(con.oid) ORDER BY con.conname)
               FROM pg_constraint con
              WHERE con.contypid = t.oid AND con.contype = 'c') AS check_exprs
     FROM pg_type t
     JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE t.typtype = 'd' AND ${USER_NS}
     ORDER BY n.nspname, t.typname;`,
  );
  return res.rows;
}

/** User-defined composite types (CREATE TYPE AS (...)), excluding table row types. */
async function queryCompositeTypes(pg: PGlite): Promise<CompositeTypeRow[]> {
  const res = await pg.query<CompositeTypeRow>(
    `SELECT t.oid, t.typrelid, n.nspname AS schema, t.typname AS name
     FROM pg_type t
     JOIN pg_namespace n ON n.oid = t.typnamespace
     JOIN pg_class c ON c.oid = t.typrelid
     WHERE t.typtype = 'c' AND c.relkind = 'c' AND ${USER_NS}
     ORDER BY n.nspname, t.typname;`,
  );
  return res.rows;
}

async function queryCompositeAttrs(pg: PGlite): Promise<CompositeAttrRow[]> {
  const res = await pg.query<CompositeAttrRow>(
    `SELECT a.attrelid AS typrelid, a.attname AS name,
            a.atttypid AS type_oid,
            format_type(a.atttypid, a.atttypmod) AS type_name,
            a.attnum
     FROM pg_attribute a
     JOIN pg_type t ON t.typrelid = a.attrelid
     JOIN pg_class c ON c.oid = t.typrelid
     JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE t.typtype = 'c' AND c.relkind = 'c' AND ${USER_NS}
       AND a.attnum > 0 AND NOT a.attisdropped
     ORDER BY a.attrelid, a.attnum;`,
  );
  return res.rows;
}

async function querySequences(pg: PGlite): Promise<SequenceRow[]> {
  const res = await pg.query<SequenceRow>(
    `SELECT c.oid, n.nspname AS schema, c.relname AS name,
            s.seqtypid AS type_oid,
            format_type(s.seqtypid, null) AS type_name,
            s.seqstart AS start, s.seqincrement AS increment,
            s.seqmin AS min, s.seqmax AS max,
            s.seqcache AS cache, s.seqcycle AS cycle,
            own_ns.nspname AS owned_by_schema,
            own_tbl.relname AS owned_by_table,
            own_att.attname AS owned_by_column
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     JOIN pg_sequence s ON s.seqrelid = c.oid
     LEFT JOIN pg_depend d ON d.objid = c.oid AND d.deptype IN ('a', 'i')
     LEFT JOIN pg_attribute own_att
            ON own_att.attrelid = d.refobjid AND own_att.attnum = d.refobjsubid
     LEFT JOIN pg_class own_tbl ON own_tbl.oid = own_att.attrelid
     LEFT JOIN pg_namespace own_ns ON own_ns.oid = own_tbl.relnamespace
     WHERE c.relkind = 'S' AND ${USER_NS}
     ORDER BY n.nspname, c.relname;`,
  );
  return res.rows;
}

async function queryExtensions(pg: PGlite): Promise<ExtensionRow[]> {
  const res = await pg.query<ExtensionRow>(
    `SELECT e.extname AS name, e.extversion AS version, n.nspname AS schema
     FROM pg_extension e
     JOIN pg_namespace n ON n.oid = e.extnamespace
     ORDER BY e.extname;`,
  );
  return res.rows;
}

async function querySchemas(pg: PGlite): Promise<SchemaRow[]> {
  const res = await pg.query<SchemaRow>(
    `SELECT n.nspname AS name, r.rolname AS owner
     FROM pg_namespace n
     JOIN pg_roles r ON r.oid = n.nspowner
     WHERE n.nspname NOT IN ${USER_SCHEMA_EXCLUDE}
       AND n.nspname NOT LIKE 'pg_temp_%'
       AND n.nspname NOT LIKE 'pg_toast_temp_%'
     ORDER BY n.nspname;`,
  );
  return res.rows;
}
