import type { Node } from "libpg-query";
import type { CatalogSnapshot } from "../catalog/types.js";
import type {
  FunctionInfo,
  NullabilityCatalog,
  OutputNullability,
  ResolvedTable,
  ResolvedFunction,
} from "./types.js";
import { parseSql } from "../ast.js";

// ---------------------------------------------------------------------------
// buildNullabilityCatalog: CatalogSnapshot + pre-parsed function bodies → NullabilityCatalog
//
// The catalog is a pure data structure; the walk is a pure function over
// (AST, catalog). This adapter bridges the gap: it reads the snapshot's
// tables/functions/domains and builds the NullabilityCatalog the walk needs.
//
// LANGUAGE sql function body ASTs are pre-parsed here (synchronously from
// the body string) and stored in fnBodyAsts. The caller may also pass a
// pre-built map to avoid re-parsing.
// ---------------------------------------------------------------------------

export async function buildNullabilityCatalog(
  snapshot: CatalogSnapshot,
  options?: { searchPath?: readonly string[] },
): Promise<NullabilityCatalog> {
  // The search path an UNQUALIFIED name resolves under — the contract the
  // interface has documented all along, now actually true (adversarial-2
  // finding 5: the adapter hardcoded "public", so under a real search path
  // a shadowing relation answered for the WRONG table and a non-public one
  // refused). WHERE the path comes from is the consumer's decision — a
  // per-query/per-project input the engine cannot discover
  // (docs/postgres-language-server-notes.md flags `SET search_path` as a
  // real connection input); the default keeps every existing caller
  // byte-identical.
  const searchPath = options?.searchPath ?? ["public"];
  const inPath = <T>(map: { get(key: string): T | undefined }, name: string): T | undefined => {
    for (const s of searchPath) {
      const hit = map.get(`${s}.${name}`);
      if (hit !== undefined) return hit;
    }
    return undefined;
  };
  // Build table lookup map.
  const tableMap = new Map<
    string,
    {
      schema: string;
      name: string;
      columns: string[];
      notNullCols: Set<string>;
      notNullTreeCols: Set<string>;
      colTypeOids: Map<string, number>;
      colTypeNames: Map<string, string>;
      colDistinctnessSound: Set<string>;
    }
  >();

  // Literal distinctness is sound for a column exactly when byte equality
  // IS value equality for its type under its collation: text/varchar by
  // OID — a whitelist, because a normalising COMPARISON breaks the
  // inference one level below the collation. citext case-folds in its
  // operator; bpchar strips trailing blanks BEFORE the collation is
  // consulted ('a'::char(4) = 'a ' is TRUE — measured), so its distinct
  // tokens can name equal values and OID 1042 is out. The collation must
  // additionally be PROVEN deterministic. Numerics never qualify: 75 and
  // 75.0 are distinct tokens, equal values.
  const TEXT_FAMILY_OIDS = new Set([25, 1043]);
  const distinctnessSound = (cols: { name: string; typeOid: number; collationDeterministic: boolean | null }[]): Set<string> =>
    new Set(
      cols
        .filter(c => TEXT_FAMILY_OIDS.has(c.typeOid) && c.collationDeterministic === true)
        .map(c => c.name),
    );
  for (const t of snapshot.tables) {
    const columns = t.columns.map(c => c.name);
    const notNullCols = new Set(
      t.columns.filter(c => c.notNull).map(c => c.name),
    );
    tableMap.set(`${t.schema}.${t.name}`, {
      schema: t.schema,
      name: t.name,
      columns,
      notNullCols,
      notNullTreeCols: new Set(
        t.columns.filter(c => c.notNullTree).map(c => c.name),
      ),
      colTypeOids: new Map(t.columns.map(c => [c.name, c.typeOid])),
      colTypeNames: new Map(t.columns.map(c => [c.name, c.typeName])),
      colDistinctnessSound: distinctnessSound(t.columns),
    });
  }
  // Views have columns too — treat them like tables for resolution. A view
  // has no inheritance children, so its tree flags are its plain flags.
  for (const v of [...snapshot.views, ...snapshot.materializedViews]) {
    const columns = v.columns.map(c => c.name);
    const notNullCols = new Set(
      v.columns.filter(c => c.notNull).map(c => c.name),
    );
    tableMap.set(`${v.schema}.${v.name}`, {
      schema: v.schema,
      name: v.name,
      columns,
      notNullCols,
      notNullTreeCols: notNullCols,
      colTypeOids: new Map(v.columns.map(c => [c.name, c.typeOid])),
      colTypeNames: new Map(v.columns.map(c => [c.name, c.typeName])),
      colDistinctnessSound: distinctnessSound(v.columns),
    });
  }

  // Group functions by (schema, name) to detect overloads.
  const fnMap = new Map<string, typeof snapshot.functions>();
  for (const f of snapshot.functions) {
    const key = `${f.schema}.${f.name}`;
    const existing = fnMap.get(key);
    if (existing) {
      existing.push(f);
    } else {
      fnMap.set(key, [f]);
    }
  }

  // Domain type OIDs → notNull. Keyed by the domain's own OID (pg_type.oid),
  // NOT by baseTypeOid — FunctionInfo.returnTypeOid stores the domain's own
  // OID when a function returns a domain type.
  const domainOids = new Map<number, boolean>();
  for (const d of snapshot.domains) {
    domainOids.set(d.oid, d.notNull);
  }

  // Domain name → notNull. Keyed by "schema.name" for TypeCast target
  // resolution (the AST carries type names, not OIDs).
  const domainNames = new Map<string, boolean>();
  for (const d of snapshot.domains) {
    domainNames.set(`${d.schema}.${d.name}`, d.notNull);
  }

  // Pre-parse LANGUAGE sql function bodies into ASTs.
  const fnBodyAsts = new Map<string, Node>();
  for (const f of snapshot.functions) {
    if (f.language !== "sql" || f.isAggregate) continue;
    const fnKey = `${f.schema}.${f.name}`;
    const ast = await parseFnBodyAst(f.body, f.definition);
    if (ast) fnBodyAsts.set(fnKey, ast);
  }

  // Pre-parse GENERATED column expressions (pg_get_expr renders them into
  // ColumnInfo.defaultExpr for generated columns). The expression is over
  // the table's OWN columns — PostgreSQL forbids referencing another
  // generated column, so no cycles — and must be immutable, so no volatile
  // surprises. Wrapped in a SELECT to parse, then unwrapped to the bare
  // expression node. Keyed `schema.table.column`.
  const generationExprAsts = new Map<string, Node>();
  // The tree reading drops columns whose generation DIVERGES somewhere in
  // the subtree (a child may redefine an inherited column's expression —
  // measured), so a tree scan never evaluates a formula the row it reads
  // was not computed with.
  const generationExprTreeAsts = new Map<string, Node>();
  for (const t of snapshot.tables) {
    for (const col of t.columns) {
      if (col.generated === "none" || !col.defaultExpr) continue;
      try {
        const parsed = await parseSql(`SELECT ${col.defaultExpr}`);
        const stmt = parsed.stmts?.[0]?.stmt as
          | { SelectStmt?: { targetList?: { ResTarget?: { val?: Node } }[] } }
          | undefined;
        const expr = stmt?.SelectStmt?.targetList?.[0]?.ResTarget?.val;
        if (expr) {
          generationExprAsts.set(`${t.schema}.${t.name}.${col.name}`, expr);
          if (!col.generationDivergesInTree) {
            generationExprTreeAsts.set(`${t.schema}.${t.name}.${col.name}`, expr);
          }
        }
      } catch {
        // Unparseable → the column falls back to the catalog flag.
      }
    }
  }
  const resolveGenerationExpr = (schema: string, table: string, column: string): Node | null =>
    generationExprAsts.get(`${schema}.${table}.${column}`) ?? null;
  const resolveGenerationExprTree = (schema: string, table: string, column: string): Node | null =>
    generationExprTreeAsts.get(`${schema}.${table}.${column}`) ?? null;

  // Pre-parse validated table CHECK constraint expressions, keyed
  // `schema.table`. The rendered definition (`CHECK (expr)`, possibly with a
  // suffix) is parsed by wrapping it in ALTER TABLE ... ADD CONSTRAINT and
  // unwrapping the Constraint node's raw_expr — measured to be robust against
  // the multi-line CASE rendering, unlike stripping the `CHECK (...)` text.
  // Two exclusions happen here:
  //   - convalidated=false (NOT VALID / PG18 NOT ENFORCED): stored rows may
  //     violate the expression, so it is no fact at all.
  //   - PG18 `contype='n'` NOT NULL constraint rows, which the snapshot's
  //     mapConstraintType folds into "check" (definition "NOT NULL col"):
  //     filtered by the PARSED node type, which is CONSTR_NOTNULL for them.
  const checkExprAsts = new Map<string, Node[]>();
  const checkExprTreeAsts = new Map<string, Node[]>();
  for (const t of snapshot.tables) {
    const exprs: Node[] = [];
    const treeExprs: Node[] = [];
    for (const con of t.constraints) {
      if (con.type !== "check" || con.validated !== true) continue;
      try {
        const parsed = await parseSql(
          `ALTER TABLE _pgsid_check_host ADD CONSTRAINT _pgsid_check ${con.definition}`,
        );
        const alter = (parsed.stmts?.[0]?.stmt as Record<string, unknown> | undefined)?.[
          "AlterTableStmt"
        ] as { cmds?: { AlterTableCmd?: { def?: Node } }[] } | undefined;
        const constraint = (alter?.cmds?.[0]?.AlterTableCmd?.def as
          | { Constraint?: { contype?: string; raw_expr?: Node } }
          | undefined)?.Constraint;
        if (constraint?.contype === "CONSTR_CHECK" && constraint.raw_expr) {
          exprs.push(constraint.raw_expr);
          // The tree reading: a NO INHERIT constraint is never copied to a
          // child (measured), so once the relation HAS descendants no tree
          // scan may read it — no child row ever satisfied it. Childless
          // relations keep the full list; so do partitioned parents, where
          // PostgreSQL refuses the construct outright.
          if (!(con.noInherit && t.hasDescendants)) {
            treeExprs.push(constraint.raw_expr);
          }
        }
      } catch {
        // Unparseable definition → the constraint contributes no facts.
      }
    }
    if (exprs.length > 0) checkExprAsts.set(`${t.schema}.${t.name}`, exprs);
    if (treeExprs.length > 0) checkExprTreeAsts.set(`${t.schema}.${t.name}`, treeExprs);
  }
  const resolveCheckConstraints = (schema: string, table: string): Node[] =>
    checkExprAsts.get(`${schema}.${table}`) ?? [];
  const resolveCheckConstraintsTree = (schema: string, table: string): Node[] =>
    checkExprTreeAsts.get(`${schema}.${table}`) ?? [];

  // Pre-parse view definitions. `pg_views.definition` is the rewritten SELECT
  // without a trailing semicolon in some versions — parseSql handles both.
  const viewAsts = new Map<string, Node>();
  for (const v of [...snapshot.views, ...snapshot.materializedViews]) {
    if (!v.definition) continue;
    try {
      const parsed = await parseSql(v.definition);
      const stmt = parsed.stmts?.[0]?.stmt;
      if (stmt) viewAsts.set(`${v.schema}.${v.name}`, stmt);
    } catch {
      // An unparseable definition just means the view falls back to the
      // catalog's (conservative) nullability.
    }
  }

  const resolveTable = (
    schema: string | undefined,
    name: string,
  ): ResolvedTable | null => {
    const t = schema ? tableMap.get(`${schema}.${name}`) : inPath(tableMap, name);
    return t ? { schema: t.schema, name: t.name, columns: t.columns } : null;
  };

  // A function is identified by name AND argument types, so `inPath`'s
  // first-schema-wins rule — right for relations, types and domains, which
  // names alone identify — is WRONG here: PostgreSQL gathers candidates
  // from every schema in the path and picks by argument types. Measured:
  // with `f(text)` in app_s and `f(integer)` in public under
  // `search_path = app_s, public`, `f(42)` runs PUBLIC's, while the engine
  // read app_s's metadata and claimed its NOT NULL domain return. Only an
  // IDENTICAL signature hides, and there first-in-path does win (measured
  // both directions) — `argTypes` is `pg_get_function_identity_arguments`,
  // exactly the key that rule uses.
  //
  // So unqualified lookups MERGE across the path, dedupe by signature, and
  // "a single candidate" means one across the merged set. Everything that
  // consumes this then behaves as it already does for same-schema
  // overloads: no single candidate means no metadata, and the consensus
  // rule takes over — a property EVERY arity-compatible candidate shares
  // holds for whichever one PostgreSQL picks.
  const candidatesInPath = (name: string): FunctionInfo[] => {
    const bySignature = new Map<string, FunctionInfo>();
    for (const s of searchPath) {
      for (const fn of fnMap.get(`${s}.${name}`) ?? []) {
        if (!bySignature.has(fn.argTypes)) bySignature.set(fn.argTypes, fn);
      }
    }
    return [...bySignature.values()];
  };
  const functionCandidates = (schema: string | undefined, name: string): FunctionInfo[] =>
    schema ? (fnMap.get(`${schema}.${name}`) ?? []) : candidatesInPath(name);

  // Dependency extraction's face, and PLURAL for the same reason the
  // metadata lookup merges: a call whose candidates live in two schemas
  // depends on both, since dropping or retyping either changes what the
  // consensus rule may conclude. One entity here would leave the query
  // unregistered against the other and skip its recheck.
  const resolveFunctions = (
    schema: string | undefined,
    name: string,
  ): ResolvedFunction[] => {
    const seen = new Set<string>();
    const out: ResolvedFunction[] = [];
    for (const fn of functionCandidates(schema, name)) {
      if (seen.has(fn.schema)) continue;
      seen.add(fn.schema);
      out.push({ schema: fn.schema, name });
    }
    return out;
  };

  const resolveFunctionReturnTypes = (schema: string | undefined, name: string): string[] =>
    functionCandidates(schema, name).map(f => f.returnType);

  const resolveColumnNotNull = (
    schema: string,
    table: string,
    column: string,
  ): boolean => {
    const t = tableMap.get(`${schema}.${table}`);
    if (!t) return false;
    return t.notNullCols.has(column);
  };

  // The relation-SET answer: attnotnull held across the whole inheritance
  // subtree. `FROM p` scans the tree and a child may lack the parent's
  // constraint (`ALTER TABLE ONLY … SET NOT NULL` — measured), so this is
  // what a tree scan may rely on; `resolveColumnNotNull` remains the
  // named-relation flag, which is the right question for `FROM ONLY p` and
  // for INSERT targets (an INSERT stores its rows in the named relation
  // itself — tuple routing is a partitioned-table mechanism, where the
  // ONLY hole is refused and the two flags agree).
  const resolveColumnNotNullTree = (
    schema: string,
    table: string,
    column: string,
  ): boolean => {
    const t = tableMap.get(`${schema}.${table}`);
    if (!t) return false;
    return t.notNullTreeCols.has(column);
  };

  const resolveColumnTypeOid = (
    schema: string,
    table: string,
    column: string,
  ): number | null => {
    const t = tableMap.get(`${schema}.${table}`);
    return t?.colTypeOids.get(column) ?? null;
  };

  const resolveColumnTypeName = (
    schema: string,
    table: string,
    column: string,
  ): string | null => {
    const t = tableMap.get(`${schema}.${table}`);
    return t?.colTypeNames.get(column) ?? null;
  };

  const resolveLiteralDistinctnessSound = (
    schema: string,
    table: string,
    column: string,
  ): boolean => {
    const t = tableMap.get(`${schema}.${table}`);
    return t?.colDistinctnessSound.has(column) ?? false;
  };

  // Write-path rewriting hooks, keyed like tableMap and resolved with the
  // same default-schema fallback. Two maps: the relation's own hooks, and
  // the tree union (`writeRewritesTree` — a subtree descendant's BEFORE ROW
  // trigger rewrites rows written through the parent). Views have no
  // descendants, so their tree is their own.
  type RewriteSets = {
    beforeRow: Set<string>;
    insteadOf: Set<string>;
    insteadRules: Set<string>;
  };
  const toSets = (wr: {
    beforeRow: string[];
    insteadOf: string[];
    insteadRules: string[];
  }): RewriteSets | null =>
    wr.beforeRow.length || wr.insteadOf.length || wr.insteadRules.length
      ? {
          beforeRow: new Set(wr.beforeRow),
          insteadOf: new Set(wr.insteadOf),
          insteadRules: new Set(wr.insteadRules),
        }
      : null;
  const writeRewriteMap = new Map<string, RewriteSets>();
  const writeRewriteTreeMap = new Map<string, RewriteSets>();
  for (const rel of snapshot.tables) {
    const own = toSets(rel.writeRewrites);
    if (own) writeRewriteMap.set(`${rel.schema}.${rel.name}`, own);
    const tree = toSets(rel.writeRewritesTree);
    if (tree) writeRewriteTreeMap.set(`${rel.schema}.${rel.name}`, tree);
  }
  for (const rel of [...snapshot.views, ...snapshot.materializedViews]) {
    const own = toSets(rel.writeRewrites);
    if (!own) continue;
    writeRewriteMap.set(`${rel.schema}.${rel.name}`, own);
    writeRewriteTreeMap.set(`${rel.schema}.${rel.name}`, own);
  }
  const NO_REWRITES: RewriteSets = {
    beforeRow: new Set<string>(),
    insteadOf: new Set<string>(),
    insteadRules: new Set<string>(),
  };
  // Resolve the RELATION through the path first, then read its hooks by
  // the resolved name: a hookless first-schema table must not fall through
  // to a later schema's same-named, hook-bearing one.
  const resolveIn = (
    map: Map<string, RewriteSets>,
    schema: string | undefined,
    table: string,
  ): RewriteSets => {
    const t = schema ? tableMap.get(`${schema}.${table}`) : inPath(tableMap, table);
    return (t ? map.get(`${t.schema}.${t.name}`) : undefined) ?? NO_REWRITES;
  };
  const resolveWriteRewrites = (
    schema: string | undefined,
    table: string,
  ): { beforeRow: ReadonlySet<string>; insteadOf: ReadonlySet<string>; insteadRules: ReadonlySet<string> } =>
    resolveIn(writeRewriteMap, schema, table);
  const resolveWriteRewritesTree = (
    schema: string | undefined,
    table: string,
  ): { beforeRow: ReadonlySet<string>; insteadOf: ReadonlySet<string>; insteadRules: ReadonlySet<string> } =>
    resolveIn(writeRewriteTreeMap, schema, table);

  // Partitioned relations (relkind 'p'), resolved with the same
  // default-schema fallback as the hook maps — the UPDATE row-movement
  // question is asked about the same target the hooks are.
  const partitionedRels = new Set<string>();
  for (const t of snapshot.tables) {
    if (t.relkind === "p") partitionedRels.add(`${t.schema}.${t.name}`);
  }
  const resolveIsPartitioned = (schema: string | undefined, table: string): boolean => {
    const t = schema ? tableMap.get(`${schema}.${table}`) : inPath(tableMap, table);
    return !!t && partitionedRels.has(`${t.schema}.${t.name}`);
  };

  const compositeTypes = new Map<string, { fields: { name: string; typeOid: number }[] }>();
  for (const ct of snapshot.compositeTypes) {
    compositeTypes.set(`${ct.schema}.${ct.name}`, {
      fields: ct.attributes.map(a => ({ name: a.name, typeOid: a.typeOid })),
    });
  }

  const resolveCompositeType = (
    schema: string | undefined,
    name: string,
  ): { fields: { name: string; typeOid: number }[] } | null => {
    return (schema ? compositeTypes.get(`${schema}.${name}`) : inPath(compositeTypes, name)) ?? null;
  };

  const resolveFunctionMetadata = (
    schema: string | undefined,
    name: string,
  ) => {
    const fns = functionCandidates(schema, name);
    return fns.length === 1 ? fns[0]! : null;
  };

  // Overloaded names, the sound half: the candidates a call with `argCount`
  // arguments could possibly resolve to — PostgreSQL only ever picks one
  // that accepts that many (trailing defaults included), so filtering by
  // arity is partial resolution with no type simulation. Consumers then
  // take CONSENSUS: a property every remaining candidate shares holds for
  // whichever one runs. Variadic candidates absorb arbitrary counts and a
  // named-notation call reorders positions, so both refuse (null), as does
  // an unknown name — an EMPTY array, by contrast, means "known name, no
  // candidate takes this arity" and is the caller's cue to stay
  // conservative.
  const resolveFunctionCandidates = (
    schema: string | undefined,
    name: string,
    argCount: number,
  ): FunctionInfo[] | null => {
    const fns = functionCandidates(schema, name);
    if (fns.length === 0) return null;
    if (fns.some(f => f.args.some(a => a.mode === "variadic"))) return null;
    return fns.filter(f => {
      const inputs = f.args.filter(a => a.mode === "in" || a.mode === "inout");
      const required = inputs.filter(a => !a.hasDefault).length;
      return argCount >= required && argCount <= inputs.length;
    });
  };

  const isNotNullDomain = (typeOid: number): boolean => {
    return domainOids.get(typeOid) ?? false;
  };

  const isNotNullDomainByName = (
    schema: string | undefined,
    typeName: string,
  ): boolean => {
    // `inPath` stops at the FIRST schema holding the name, so a notNull=false
    // domain shadowing a notNull one answers false — resolution order, not
    // best answer.
    return (schema ? domainNames.get(`${schema}.${typeName}`) : inPath(domainNames, typeName)) ?? false;
  };

  // Operators grouped by name (and by schema.name for qualified refs). An
  // oprname can overload across operand types, and arg types are not
  // available to the walk — same single-candidate policy as functions.
  const opByName = new Map<string, typeof snapshot.operators>();
  const opBySchemaName = new Map<string, typeof snapshot.operators>();
  for (const o of snapshot.operators ?? []) {
    const byName = opByName.get(o.name);
    if (byName) byName.push(o);
    else opByName.set(o.name, [o]);
    const key = `${o.schema}.${o.name}`;
    const bySchema = opBySchemaName.get(key);
    if (bySchema) bySchema.push(o);
    else opBySchemaName.set(key, [o]);
  }

  const resolveOperatorMetadata = (
    schema: string | undefined,
    name: string,
  ): { strict: boolean; functionSchema?: string; functionName?: string } | null => {
    const candidates = schema ? opBySchemaName.get(`${schema}.${name}`) : opByName.get(name);
    if (!candidates || candidates.length === 0) return null;
    // Strictness by consensus (holds whichever overload PostgreSQL picks);
    // the backing function only when the pick is determined.
    const strict = candidates.every(o => o.strict);
    if (candidates.length === 1) {
      const o = candidates[0]!;
      return { strict, functionSchema: o.functionSchema, functionName: o.functionName };
    }
    return { strict };
  };

  const builtinStrict = new Set(snapshot.builtinStrictFunctions ?? []);
  const isStrictBuiltin = (name: string): boolean => builtinStrict.has(name);

  return {
    resolveTable,
    resolveFunctions,
    resolveFunctionReturnTypes,
    resolveColumnNotNull,
    resolveColumnNotNullTree,
    resolveWriteRewrites,
    resolveWriteRewritesTree,
    resolveIsPartitioned,
    resolveColumnTypeOid,
    resolveColumnTypeName,
    resolveLiteralDistinctnessSound,
    resolveCompositeType,
    resolveFunctionMetadata,
    resolveFunctionCandidates,
    resolveOperatorMetadata,
    resolveGenerationExpr,
    resolveGenerationExprTree,
    resolveCheckConstraints,
    resolveCheckConstraintsTree,
    isStrictBuiltin,
    isNotNullDomain,
    isNotNullDomainByName,
    fnBodyAsts,
    viewAsts,
  };
}

// ---------------------------------------------------------------------------
// Parse a LANGUAGE sql function body into the last statement's AST.
//
// Two cases:
// 1. Old-style (pre-PG 14): prosrc contains raw SQL with positional params
//    (e.g. `SELECT $1`). Parse prosrc directly.
// 2. SQL-standard (PG 14+ BEGIN ATOMIC): prosrc is empty. The body lives in
//    pg_get_functiondef output (definition) as a CREATE FUNCTION statement
//    with a sql_body node tree. Parse the definition, extract sql_body.
//    Note: PG deparsing converts $1 → the parameter name, so the body AST
//    has ColumnRef("paramname") instead of ParamRef(1). The walk handles
//    this via fnParamNames mapping in resolveColumnRef.
// ---------------------------------------------------------------------------

async function parseFnBodyAst(
  body: string,
  definition?: string,
): Promise<Node | null> {
  // Case 1: prosrc has the raw body (old-style functions).
  if (body && body.trim().length > 0) {
    try {
      const parsed = await parseSql(body);
      const stmts = parsed.stmts ?? [];
      if (stmts.length > 0) return stmts[stmts.length - 1]!.stmt!;
    } catch {
      // prosrc might contain BEGIN ATOMIC text (rare) — try stripping.
      const stripped = stripBeginAtomic(body);
      if (stripped) {
        try {
          const parsed = await parseSql(stripped);
          const stmts = parsed.stmts ?? [];
          if (stmts.length > 0) return stmts[stmts.length - 1]!.stmt!;
        } catch {
          // Fall through to definition.
        }
      }
    }
  }

  // Case 2: prosrc is empty (BEGIN ATOMIC). Parse the definition
  // (pg_get_functiondef output) and extract the sql_body node tree.
  if (definition && definition.trim().length > 0) {
    try {
      const parsed = await parseSql(definition);
      const stmts = parsed.stmts ?? [];
      if (stmts.length > 0) {
        const cf = (stmts[0]!.stmt! as Record<string, unknown>)["CreateFunctionStmt"] as
          | { sql_body?: { List?: { items?: Node[] } } }
          | undefined;
        if (cf?.sql_body) {
          const items = cf.sql_body.List?.items ?? [];
          const lastList = items[items.length - 1];
          const innerItems = (lastList as { List?: { items?: Node[] } })?.List?.items ?? [];
          if (innerItems.length > 0) {
            return innerItems[innerItems.length - 1]!;
          }
        }
      }
    } catch {
      // Not parseable.
    }
  }

  return null;
}

function stripBeginAtomic(body: string): string | null {
  const trimmed = body.trim();
  const m = /^BEGIN\s+ATOMIC\s+(.*?)\s+END\s*;?\s*$/is.exec(trimmed);
  if (m) return m[1]!;
  const m2 = /^BEGIN\s+(.*?)\s+END\s*;?\s*$/is.exec(trimmed);
  if (m2) return m2[1]!;
  return null;
}

// Re-export OutputNullability for convenience.
export type { OutputNullability };
