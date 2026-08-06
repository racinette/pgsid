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
import { splitQualifiedName } from "../catalog/qualified-name.js";

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
  // A column whose TYPE is a NOT NULL domain is non-null in every stored
  // row, and `attnotnull` does not say so — it stays FALSE for a
  // domain-constrained column (measured), which left the engine reading such
  // columns nullable. Every route to a stored NULL is closed by PostgreSQL
  // itself: an INSERT omitting the column, an UPDATE to NULL, ADD COLUMN on
  // a non-empty table, ALTER COLUMN TYPE over existing NULLs, and
  // `ALTER DOMAIN … SET NOT NULL` while a column holds one are all rejected
  // — and unlike a CHECK, `SET NOT NULL` on a domain has no NOT VALID form
  // to bypass the validation with (syntax error — measured). That absence is
  // what makes the fact usable rather than merely usual.
  //
  // TABLES only. A VIEW column can carry the domain as its type and still be
  // NULL, because a LEFT JOIN inside the definition null-extends it after
  // the domain has had its say (measured, matviews too) — the view path
  // analyses the definition and gets that right on its own.
  //
  // Tree-wide by construction: a child cannot retype an inherited column
  // (`cannot alter inherited column` — measured), so the domain fact needs
  // no per-child conjunction the way `attnotnull` does.
  const notNullDomainOids = new Set(
    snapshot.domains.filter(d => d.notNull).map(d => d.oid),
  );
  const domainForcedNotNull = (c: { typeOid: number }): boolean =>
    notNullDomainOids.has(c.typeOid);

  for (const t of snapshot.tables) {
    const columns = t.columns.map(c => c.name);
    const notNullCols = new Set(
      t.columns.filter(c => c.notNull || domainForcedNotNull(c)).map(c => c.name),
    );
    tableMap.set(`${t.schema}.${t.name}`, {
      schema: t.schema,
      name: t.name,
      columns,
      notNullCols,
      notNullTreeCols: new Set(
        t.columns.filter(c => c.notNullTree || domainForcedNotNull(c)).map(c => c.name),
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

  // Pre-parse ARGUMENT DEFAULT expressions, one entry per argument position
  // (null where a parameter has no default). A call that omits a defaulted
  // parameter passes this expression, so the walk needs it as an AST to bind
  // into the body scope.
  //
  // Keyed by the FULL signature — `schema.name(argTypes)` — rather than by
  // `schema.name` the way the body map is: an overloaded name's entries would
  // otherwise collide, and a default belongs to one signature. The rendering
  // is an expression already (`7`, `NULL::integer`, `nullif(1, 1)`), so it
  // parses through the same SELECT wrapper the generation expressions use.
  const fnArgDefaultAsts = new Map<string, (Node | null)[]>();
  for (const f of snapshot.functions) {
    if (!f.args.some(a => a.defaultExpr !== null)) continue;
    const parsed: (Node | null)[] = [];
    for (const a of f.args) {
      parsed.push(a.defaultExpr === null ? null : await parseExprAst(a.defaultExpr));
    }
    fnArgDefaultAsts.set(`${f.schema}.${f.name}(${f.argTypes})`, parsed);
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
      // Unparseable → the column falls back to the catalog flag.
      const expr = await parseExprAst(col.defaultExpr);
      if (expr) {
        generationExprAsts.set(`${t.schema}.${t.name}.${col.name}`, expr);
        if (!col.generationDivergesInTree) {
          generationExprTreeAsts.set(`${t.schema}.${t.name}.${col.name}`, expr);
        }
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

  // ---------------------------------------------------------------------
  // Foreign keys a join may reason FROM.
  //
  // "A join on a NOT NULL foreign key always matches" is only true of a key
  // PostgreSQL is actually enforcing over every row the scan reads, and four
  // catalog-visible things break that. Each was measured against PG18 before
  // this map was built, and each is a gate here rather than at the walk,
  // because a fact the adapter refuses can never be misused downstream — the
  // shape `resolveCheckConstraintsTree` and `resolveGenerationExprTree`
  // already take.
  //
  //   - NOT VALID: pre-existing rows are unchecked, and one survives the ADD
  //     CONSTRAINT to be read back through the join.
  //   - NOT ENFORCED (PG18): violations insert freely. It needs no gate of
  //     its own — `convalidated` is false for a NOT ENFORCED constraint, and
  //     `ALTER CONSTRAINT … NOT ENFORCED` CLEARS it on an already-validated
  //     key (measured), so the validated bit covers every route.
  //   - DEFERRABLE: violable mid-transaction and observable there, with
  //     `INITIALLY IMMEDIATE` no protection (`SET CONSTRAINTS ALL DEFERRED`).
  //   - INHERITANCE: a parent's FK is NOT copied to a child — pg_constraint
  //     records it on the parent alone and a violating child row inserts
  //     without complaint (measured), so a TREE scan of a relation with
  //     descendants may not read it. Partitioning is the opposite and needs
  //     no exclusion: the constraint is recorded on every partition and
  //     ATTACH PARTITION validates the incoming rows (both measured).
  //
  // The remaining hazards are not catalog-visible and are not gated here:
  // the referencing column must be NOT NULL and the join must equate exactly
  // the key, which are the walk's questions. MATCH SIMPLE's partial-NULL hole
  // closes with the NOT NULL one. A referenced column is always unique —
  // PostgreSQL refuses the constraint otherwise (measured).
  const fkByColumn = new Map<
    string,
    { schema: string; table: string; column: string }
  >();
  const fkTreeByColumn = new Map<
    string,
    { schema: string; table: string; column: string }
  >();
  for (const t of snapshot.tables) {
    for (const con of t.constraints) {
      if (con.type !== "foreign" || !con.validated || con.deferrable) continue;
      // Single-column keys only. A composite key is sound under the same
      // reasoning once every pair is equated in the ON clause, and matching a
      // conjunction against a column list is work with no fixture behind it.
      if (con.columns.length !== 1 || con.foreignColumns?.length !== 1) continue;
      if (!con.foreignSchema || !con.foreignTable) continue;
      const target = {
        schema: con.foreignSchema,
        table: con.foreignTable,
        column: con.foreignColumns[0]!,
      };
      const key = `${t.schema}.${t.name}.${con.columns[0]}`;
      fkByColumn.set(key, target);
      if (!t.hasDescendants || t.relkind === "p") fkTreeByColumn.set(key, target);
    }
  }
  const resolveForeignKey = (schema: string, table: string, column: string) =>
    fkByColumn.get(`${schema}.${table}.${column}`) ?? null;
  const resolveForeignKeyTree = (schema: string, table: string, column: string) =>
    fkTreeByColumn.get(`${schema}.${table}.${column}`) ?? null;

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

  const builtinFunctionNames = new Set(snapshot.builtinFunctionNames ?? []);
  const isBuiltinFunction = (name: string): boolean => builtinFunctionNames.has(name);

  /**
   * The candidates a consumer may REASON from — the merged set above, minus
   * the case where it is provably incomplete.
   *
   * pg_catalog is part of every resolution and the snapshot captures none of
   * its signatures, so for a name pg_catalog also carries, the user
   * candidates are not the candidate set (adversarial-3 finding 6). The
   * engine had it backwards: every builtin table is documented as "consulted
   * only where the user catalog has no candidate, so a user function of the
   * same name still wins", while PostgreSQL searches pg_catalog IMPLICITLY
   * and FIRST unless the path names it — so an identical signature means the
   * BUILTIN hides the user function. Measured both directions: under the
   * default path `min_scale('NaN'::numeric)` runs pg_catalog's and returns
   * NULL while the engine claimed the user function's NOT NULL domain
   * return; under `search_path = public, pg_catalog` the user's runs.
   *
   * And it is not only identical signatures: PostgreSQL picks by argument
   * types across the WHOLE path, pg_catalog included, so a user
   * `lower(integer)` leaves `lower(NULL::text)` resolving to the builtin
   * while the engine saw the user's overload as the SOLE candidate. That is
   * why the whole set drops rather than the matching signature: with no
   * builtin signatures to merge in, no consensus over the user's half is
   * sound.
   *
   * Qualified references are unaffected — `public.min_scale(…)` names the
   * user's and `pg_catalog.min_scale(…)` the builtin. The cost is precision
   * for user functions named after builtins, which is the trade the register
   * records; the full form needs pg_catalog signatures in the snapshot and
   * waits for the consumer's search-path input, which it interacts with.
   */
  const resolvableCandidates = (schema: string | undefined, name: string): FunctionInfo[] =>
    schema === undefined && isBuiltinFunction(name) ? [] : functionCandidates(schema, name);

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

  const resolveFunctionShapes = (schema: string | undefined, name: string): FunctionInfo[] =>
    resolvableCandidates(schema, name);

  const functionReturnsSet = (schema: string | undefined, name: string): boolean | null => {
    const candidates = resolvableCandidates(schema, name);
    return candidates.length === 0 ? null : candidates.some(f => f.returnsSet);
  };

  const builtinSetReturning = new Set(snapshot.builtinSetReturningFunctions ?? []);
  const isSetReturningBuiltin = (name: string): boolean => builtinSetReturning.has(name);
  const builtinAggregates = new Set(snapshot.builtinAggregateFunctions ?? []);
  const isAggregateBuiltin = (name: string): boolean => builtinAggregates.has(name);

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

  // A DOMAIN over a composite IS a composite everywhere the walk asks
  // (adversarial-3 finding 4). The snapshot's composite query reads
  // `typtype = 'c'`, which is base composites only, and the three callers
  // answered the same blindness differently: `expandCompositeStar` and the
  // provably-composite arm of `unnestCompositeElementFields` REFUSED
  // statements PostgreSQL expands to the base type's fields, while the
  // non-ROW arm fell through to one column — the correct response to a
  // wrong premise, twice, and a wrong shape once.
  //
  // Following the domain to its base needs nothing about the domain's own
  // constraint: both sites force every field nullable anyway. Domains over
  // domains resolve transitively; a domain over an ARRAY of a composite
  // falls out on its own, since `format_type` renders the base as
  // `public.sku_pair[]` and no composite is keyed under that name. The
  // entry is registered under the domain's own name in the same map, so
  // `inPath` keeps first-schema-wins across both kinds — which is
  // PostgreSQL's rule, since domains and composites share one type
  // namespace.
  const domainBase = new Map<string, string>();
  for (const d of snapshot.domains) {
    const { schema, name } = splitQualifiedName(d.baseTypeName);
    domainBase.set(`${d.schema}.${d.name}`, `${schema ?? d.schema}.${name}`);
  }
  for (const [key, firstBase] of domainBase) {
    let base = firstBase;
    const seen = new Set([key]);
    while (!seen.has(base) && domainBase.has(base)) {
      seen.add(base);
      base = domainBase.get(base)!;
    }
    const composite = compositeTypes.get(base);
    if (composite) compositeTypes.set(key, composite);
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
    const fns = resolvableCandidates(schema, name);
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
    const fns = resolvableCandidates(schema, name);
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

  const domainBaseNames = new Map<string, string>();
  for (const d of snapshot.domains) {
    domainBaseNames.set(`${d.schema}.${d.name}`, d.baseTypeName);
  }
  const resolveDomainBaseTypeName = (
    schema: string | undefined,
    typeName: string,
  ): string | null =>
    (schema ? domainBaseNames.get(`${schema}.${typeName}`) : inPath(domainBaseNames, typeName))
      ?? null;

  const builtinPolymorphic = new Set(snapshot.builtinPolymorphicFunctions ?? []);
  const isPolymorphicBuiltin = (name: string): boolean => builtinPolymorphic.has(name);

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

  // The FROM-position shape of a pg_catalog function with named output
  // columns. Consulted where the user catalog has no candidate the walk may
  // reason from — which now INCLUDES a name pg_catalog also carries, since
  // that is the one PostgreSQL searches first (adversarial-3 finding 6; see
  // resolvableCandidates). The rule every builtin table follows, corrected.
  const builtinTableFunctions = snapshot.builtinTableFunctions ?? {};
  const resolveBuiltinFunctionShape = (
    schema: string | undefined,
    name: string,
  ): string | null =>
    schema === undefined || schema === "pg_catalog"
      ? (builtinTableFunctions[name] ?? null)
      : null;

  return {
    resolveTable,
    resolveFunctions,
    resolveFunctionShapes,
    functionReturnsSet,
    isSetReturningBuiltin,
    isAggregateBuiltin,
    resolveBuiltinFunctionShape,
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
    fnArgDefaultAsts,
    resolveCheckConstraints,
    resolveCheckConstraintsTree,
    resolveForeignKey,
    resolveForeignKeyTree,
    isStrictBuiltin,
    isBuiltinFunction,
    isPolymorphicBuiltin,
    isNotNullDomain,
    isNotNullDomainByName,
    resolveDomainBaseTypeName,
    fnBodyAsts,
    viewAsts,
  };
}

/**
 * Parse a PostgreSQL-rendered EXPRESSION (a generation expression, an
 * argument default) into its bare AST node, by wrapping it in a SELECT and
 * unwrapping the target. Null when it does not parse, which leaves every
 * caller on its conservative path.
 */
async function parseExprAst(expr: string): Promise<Node | null> {
  try {
    const parsed = await parseSql(`SELECT ${expr}`);
    const stmt = parsed.stmts?.[0]?.stmt as
      | { SelectStmt?: { targetList?: { ResTarget?: { val?: Node } }[] } }
      | undefined;
    return stmt?.SelectStmt?.targetList?.[0]?.ResTarget?.val ?? null;
  } catch {
    return null;
  }
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
