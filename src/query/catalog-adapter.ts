import type { Node } from "libpg-query";
import type { CatalogSnapshot } from "../catalog/types.js";
import type {
  BuiltinFunctionSignature,
  BuiltinOperatorSignature,
  DepCatalog,
  FunctionInfo,
  NullabilityCatalog,
  OverloadCatalog,
  OutputNullability,
  ResolvedTable,
  ResolvedFunction,
} from "./types.js";
import { parseSql } from "../ast.js";
import { splitQualifiedName } from "../catalog/qualified-name.js";
import {
  TOTAL_OPERATORS as TOTAL_OPERATOR_NAMES,
  NON_TOTAL_OPERATOR_SIGNATURES,
  TOTAL_OPERATOR_SIGNATURES,
} from "./operators.js";
// The claim tables — the verdict source the signature-keyed dispatch reads
// per surviving row. The import direction (adapter ← walk) carries no cycle:
// the walk imports only interfaces and side modules; snapshot.ts set the
// precedent when the capture took its scope from the same tables.
import {
  ALWAYS_NOT_NULL_BUILTINS,
  FIRST_ARG_BUILTINS,
  STRICT_TOTAL_BUILTINS,
  STRICT_TOTAL_BUILTIN_SIGNATURES,
  NEVER_NULL_WINDOW_SIGNATURES,
  STRICT_TOTAL_WINDOW_SIGNATURES,
} from "./nullability-walk.js";

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
): Promise<NullabilityCatalog & DepCatalog & OverloadCatalog> {
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
  //     no exclusion on the REFERENCING side: the constraint is recorded on
  //     every partition and ATTACH PARTITION validates the incoming rows
  //     (both measured).
  //   - PARTITION CLONES on the REFERENCED side, which is the other question
  //     entirely and the one that sentence was not about (sweep-4 finding 4).
  //     A key pointing AT a partitioned table is recorded once per partition
  //     on top of the declared constraint, and this map keyed on
  //     `schema.table.column` with last-row-wins, so `sw4_pref.p_id` resolved
  //     to whichever partition the snapshot happened to order last. Two wrong
  //     answers from one capture: joining that partition promoted it, and a
  //     referencing row pointing into any OTHER partition NULL-extends; and
  //     joining the DECLARED parent promoted nothing, because the declared
  //     target had been overwritten. Skipping the clones recovers the second
  //     and removes the first in one move.
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
  // PostgreSQL clones a foreign key for TWO different reasons, and only one of
  // them produces a row that must not be read:
  //
  //   - the REFERENCED table is partitioned. One clone per partition of the
  //     TARGET, each with a different `confrelid`, so the same referencing
  //     column acquires several disagreeing targets. None of them means "every
  //     referencing row matches THIS partition" — reading one invents a claim.
  //   - the REFERENCING table is partitioned. One clone per partition of the
  //     SOURCE, all with the SAME `confrelid`. Each is the key for its own
  //     partition, and it is the only key that partition has: a query naming
  //     `rp_src1` directly finds nothing else.
  //
  // So the discriminator is not "is this a clone" but "is there a DECLARED key
  // for this column". Skipping clones outright was the first fix and it cost
  // the second case its promotion (measured) — the same shape as sweep-2's
  // root cause, a fact changed at the sites the fix was looking at rather than
  // at every site that asks. Preferring the declared row and falling back to a
  // clone answers both: a referencing column with a declared key ignores its
  // clones, and a partition whose only key IS a clone still gets one.
  const declared = new Set<string>();
  for (const pass of ["declared", "clone"] as const) {
    for (const t of snapshot.tables) {
      for (const con of t.constraints) {
        if (con.type !== "foreign" || !con.validated || con.deferrable) continue;
        if (con.inheritedClone !== (pass === "clone")) continue;
        // Single-column keys only. A composite key is sound under the same
        // reasoning once every pair is equated in the ON clause, and matching a
        // conjunction against a column list is work with no fixture behind it.
        if (con.columns.length !== 1 || con.foreignColumns?.length !== 1) continue;
        if (!con.foreignSchema || !con.foreignTable) continue;
        const key = `${t.schema}.${t.name}.${con.columns[0]}`;
        if (pass === "declared") declared.add(key);
        else if (declared.has(key)) continue;
        const target = {
          schema: con.foreignSchema,
          table: con.foreignTable,
          column: con.foreignColumns[0]!,
        };
        fkByColumn.set(key, target);
        if (!t.hasDescendants || t.relkind === "p") fkTreeByColumn.set(key, target);
      }
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

  // The signatures behind that flag, grouped by name. Environment data like
  // the flag itself, and consulted only where the flag already sends the
  // walk: a name pg_catalog carries, called without a schema or with
  // `pg_catalog`.
  const polymorphicArraySignatures = new Map<string, { args: string[]; returns: string }[]>();
  for (const sig of snapshot.builtinPolymorphicArraySignatures ?? []) {
    const existing = polymorphicArraySignatures.get(sig.name);
    if (existing) existing.push({ args: sig.args, returns: sig.returns });
    else polymorphicArraySignatures.set(sig.name, [{ args: sig.args, returns: sig.returns }]);
  }
  const resolvePolymorphicArraySignatures = (
    schema: string | undefined,
    name: string,
  ): { args: string[]; returns: string }[] | null =>
    schema === undefined || schema === "pg_catalog"
      ? (polymorphicArraySignatures.get(name) ?? null)
      : null;

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
    // Bare names gather PATH-VISIBLE candidates only (Q1, measured: the
    // path is a visibility filter), deduped by signature with the earliest
    // schema winning — the function side's rule. The old whole-snapshot
    // merge let an off-path operator poison the strictness consensus, an
    // under-report, which for mechanism C is the direction that makes the
    // contract lie.
    let candidates: typeof snapshot.operators | undefined;
    if (schema) {
      candidates = opBySchemaName.get(`${schema}.${name}`);
    } else {
      const merged: typeof snapshot.operators = [];
      const seen = new Set<string>();
      for (const s of searchPath) {
        for (const o of opBySchemaName.get(`${s}.${name}`) ?? []) {
          const sig = `${o.leftType},${o.rightType}`;
          if (!seen.has(sig)) {
            seen.add(sig);
            merged.push(o);
          }
        }
      }
      candidates = merged;
    }
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

  // -------------------------------------------------------------------------
  // Coercibility — the elimination rule of docs/type-aware-overloads.md,
  // implemented from the environment captures. The WALK does not consult any
  // of this yet: the accessors exist so the rule is testable in isolation
  // before argument types are threaded into candidate selection.
  // -------------------------------------------------------------------------

  const builtinFnSigsByName = new Map<string, BuiltinFunctionSignature[]>();
  for (const sig of snapshot.builtinFunctionSignatures ?? []) {
    const existing = builtinFnSigsByName.get(sig.name);
    if (existing) existing.push(sig);
    else builtinFnSigsByName.set(sig.name, [sig]);
  }
  const resolveBuiltinFunctionSignatures = (
    schema: string | undefined,
    name: string,
  ): BuiltinFunctionSignature[] =>
    schema === undefined || schema === "pg_catalog"
      ? (builtinFnSigsByName.get(name) ?? [])
      : [];

  const builtinOpSigsByName = new Map<string, BuiltinOperatorSignature[]>();
  for (const sig of snapshot.builtinOperatorSignatures ?? []) {
    const existing = builtinOpSigsByName.get(sig.name);
    if (existing) existing.push(sig);
    else builtinOpSigsByName.set(sig.name, [sig]);
  }
  const resolveBuiltinOperatorSignatures = (
    schema: string | undefined,
    name: string,
  ): BuiltinOperatorSignature[] =>
    schema === undefined || schema === "pg_catalog"
      ? (builtinOpSigsByName.get(name) ?? [])
      : [];

  const builtinTypeKinds = snapshot.builtinTypeKinds ?? {};
  const implicitCasts = new Set<string>();
  const binaryTargets = new Map<string, string[]>();
  for (const c of snapshot.builtinImplicitCasts ?? []) {
    implicitCasts.add(`${c.source}->${c.target}`);
    if (c.binary) {
      const existing = binaryTargets.get(c.source);
      if (existing) existing.push(c.target);
      else binaryTargets.set(c.source, [c.target]);
    }
  }
  const resolveBinaryCoercionTargets = (typeName: string): string[] =>
    binaryTargets.get(typeName) ?? [];

  // A rendered name is qualified for user types (the snapshot reads with an
  // empty search_path) and bare for builtins — both sides of every
  // comparison here use the same rendering, which is what makes string
  // equality sound. A bare USER-typed name (a cast target as the query
  // wrote it) resolves through the path, like every other bare reference.
  const domainBaseOfRendered = (rendered: string): string | null => {
    const direct = domainBaseNames.get(rendered);
    if (direct !== undefined) return direct;
    if (!rendered.includes(".")) return inPath(domainBaseNames, rendered) ?? null;
    return null;
  };

  const resolveCanonicalTypeName = (typeName: string): string => {
    if (typeName.endsWith("[]")) {
      return `${resolveCanonicalTypeName(typeName.slice(0, -2))}[]`;
    }
    let cur = typeName;
    // Nested domains resolve base-of-base (measured: dint2 + dint2 →
    // integer); the bound only guards a cyclic snapshot, which PostgreSQL
    // cannot produce.
    for (let hops = 0; hops < 32; hops++) {
      const base = domainBaseOfRendered(cur);
      if (base === null) return cur;
      cur = base;
    }
    return cur;
  };

  const enumTypeNames = new Map<string, true>();
  for (const e of snapshot.enums) enumTypeNames.set(`${e.schema}.${e.name}`, true);

  /**
   * What kind of type a rendered name denotes, where this catalog can say:
   * pg_type.typtype for builtins, the user captures for enums, composites
   * and domains; null for anything it cannot explain. Null is what keeps a
   * candidate — the generous default the invariant requires.
   */
  const kindOfRendered = (rendered: string): string | null => {
    const builtin = builtinTypeKinds[rendered];
    if (builtin !== undefined) return builtin;
    const qualified = rendered.includes(".");
    if (qualified ? enumTypeNames.has(rendered) : inPath(enumTypeNames, rendered) !== undefined) return "e";
    if (qualified ? compositeTypes.has(rendered) : resolveCompositeType(undefined, rendered) !== null) return "c";
    if (domainBaseOfRendered(rendered) !== null) return "d";
    return null;
  };

  const typeUnderstood = (rendered: string): boolean =>
    rendered.endsWith("[]")
      ? typeUnderstood(rendered.slice(0, -2))
      : kindOfRendered(rendered) !== null;

  const mayCoerceImplicitly = (fromType: string, toType: string): boolean => {
    if (fromType === toType) return true;
    // An unknown literal is not a gap in our knowledge; PostgreSQL does not
    // consider it typed either, and it constrains no candidate (measured —
    // the charter's literals section).
    if (fromType === "unknown") return true;
    const from = resolveCanonicalTypeName(fromType);
    const to = resolveCanonicalTypeName(toType);
    if (from === to) return true;
    // The polymorphic predicate. Generous on anything not understood, and
    // deliberately generous on domains: every family admits a domain over
    // its structure except anyenum (measured), where admitting anyway is a
    // safe over-retention.
    switch (to) {
      case '"any"':
      case "anyelement":
      case "anycompatible":
        return true;
      case "anyarray":
      case "anycompatiblearray":
        return from.endsWith("[]") || !typeUnderstood(from);
      case "anynonarray":
      case "anycompatiblenonarray":
        return !from.endsWith("[]");
      case "anyrange":
      case "anycompatiblerange":
        return kindOfRendered(from) === "r" || !typeUnderstood(from);
      case "anymultirange":
      case "anycompatiblemultirange":
        return kindOfRendered(from) === "m" || !typeUnderstood(from);
      case "anyenum":
        return kindOfRendered(from) === "e" || !typeUnderstood(from);
      default:
        break;
    }
    if (from.endsWith("[]") && to.endsWith("[]")) {
      return mayCoerceImplicitly(from.slice(0, -2), to.slice(0, -2));
    }
    if (implicitCasts.has(`${from}->${to}`)) return true;
    // No clause holds. Eliminate only when BOTH sides are fully explained;
    // an unrecognised type on either side keeps the candidate.
    return !(typeUnderstood(from) && typeUnderstood(to));
  };

  // A cast's type name arrives in the GRAMMAR's spelling (`x::integer`
  // parses as `int4`) while every signature here renders format_type names;
  // the captured alias map is the bridge, applied to the base name so
  // `int4` plus arrayBounds normalises to `integer[]`.
  const typeAliases = snapshot.builtinTypeNameAliases ?? {};
  const normalizeTypeName = (typeName: string): string => {
    if (typeName.endsWith("[]")) return `${normalizeTypeName(typeName.slice(0, -2))}[]`;
    return typeAliases[typeName] ?? typeName;
  };

  /**
   * The operator half of docs/type-aware-overloads.md tiers 1 and 2, for a
   * BINARY A_Expr: gather the merged candidate set — path-visible user
   * operators plus the captured builtin rows, the answered shadowing
   * question's requirement — take a declared-types exact match where one
   * exists, otherwise eliminate candidates the known operand types
   * certainly cannot reach and read totality by consensus over the
   * survivors, each builtin row against its own signature verdict
   * (NON_TOTAL_OPERATOR_SIGNATURES).
   *
   * "unknown" means this machinery has nothing sound to add and the caller
   * keeps its existing behaviour — including the name-level claim with its
   * RECORDED hole when both operand types are unresolvable and no user
   * operator shares the name: the exotic-operand argument that recorded the
   * hole applies to that residue unchanged.
   */
  const unionOf = (
    users: typeof snapshot.operators,
    builtins: BuiltinOperatorSignature[],
  ): string[] => [
    ...new Set([...users.map(o => o.resultType), ...builtins.map(o => o.returns)]),
  ];

  const resolveOperatorTotality = (
    schema: string | undefined,
    name: string,
    leftTypes: readonly string[] | null,
    rightTypes: readonly string[] | null,
  ):
    | { kind: "user-exact"; functionSchema: string; functionName: string; returns: string[] }
    | { kind: "total"; returns: string[] }
    | { kind: "nullable"; returns: string[] }
    | { kind: "unknown" } => {
    // An operand is a type SET — the survivor return-type union of whatever
    // produced it (charter correction 2026-08-09): null constrains nothing,
    // a singleton is exact, and a multi-member union eliminates with "can
    // ANY member reach P" but never exact-matches.
    const Ls = leftTypes === null ? null : leftTypes.map(normalizeTypeName);
    const Rs = rightTypes === null ? null : rightTypes.map(normalizeTypeName);
    const L = Ls !== null && Ls.length === 1 ? Ls[0]! : null;
    const R = Rs !== null && Rs.length === 1 ? Rs[0]! : null;

    const builtins = resolveBuiltinOperatorSignatures(schema, name)
      .filter(o => o.leftType !== null && o.rightType !== null);
    // Path membership is a VISIBILITY filter (measured, Q1 of the charter's
    // answered questions); position matters only for identical signatures,
    // earliest first — the dedup key the function side already uses.
    const userSchemas = schema ? [schema] : searchPath;
    const users: typeof snapshot.operators = [];
    const seenSig = new Set<string>();
    for (const s of userSchemas) {
      for (const o of opBySchemaName.get(`${s}.${name}`) ?? []) {
        if (o.leftType === null || o.rightType === null) continue;
        const sig = `${o.leftType},${o.rightType}`;
        if (!seenSig.has(sig)) {
          seenSig.add(sig);
          users.push(o);
        }
      }
    }
    if (builtins.length === 0 && users.length === 0) return { kind: "unknown" };

    // The name grants, a signature key grants, and the non-total set
    // exempts — read together so a claimed name's hole and an unclaimed
    // name's total row are both expressible.
    const totalVerdict = (l: string, r: string): "total" | "nullable" =>
      (TOTAL_OPERATOR_NAMES.has(name) || TOTAL_OPERATOR_SIGNATURES.has(`${name}(${l},${r})`)) &&
      !NON_TOTAL_OPERATOR_SIGNATURES.has(`${name}(${l},${r})`)
        ? "total"
        : "nullable";

    if (L !== null && R !== null) {
      // Declared-types exact match — early, terminal, unique per schema,
      // and applicable only to SINGLETON unions (every survivor behind the
      // union returns this type, so the value really has it). A user
      // duplicate of a builtin signature loses the tie because pg_catalog
      // is searched implicitly first (measured, Q1).
      const builtinExact = builtins.find(o => o.leftType === L && o.rightType === R);
      if (builtinExact) return { kind: totalVerdict(L, R), returns: [builtinExact.returns] };
      const userExact = users.find(o => o.leftType === L && o.rightType === R);
      if (userExact) {
        return {
          kind: "user-exact",
          functionSchema: userExact.functionSchema,
          functionName: userExact.functionName,
          returns: [userExact.resultType],
        };
      }
    }

    if (Ls === null && Rs === null) {
      // The name-rule fallback, KEPT BY MEASUREMENT (2026-08-09, the
      // charter's closing item): removing it cost two real claims —
      // `cte-self-join`'s `a.total + b.total`, where `total` is a computed
      // CTE column the re-export reading cannot type, and
      // `function-default-argument`'s body arithmetic over the function's
      // own parameters, which nothing types inside a body scope. Both are
      // typeable in principle (the inner target list; the declared
      // parameter types the snapshot already carries), so the fallback
      // retires when those two sources type — not before, and not by
      // assumption. A user operator sharing a curated name still makes the
      // fallback unsound (the demonstrated rank-1), so that case answers
      // here rather than ceding.
      return users.length > 0 && builtins.length > 0
        ? { kind: "nullable", returns: unionOf(users, builtins) }
        : { kind: "unknown" };
    }

    const reaches = (set: readonly string[] | null, param: string): boolean =>
      set === null || set.some(member => mayCoerceImplicitly(member, param));
    const survives = (l: string, r: string): boolean =>
      reaches(Ls, l) && reaches(Rs, r);
    const userSurvivors = users.filter(o => survives(o.leftType!, o.rightType!));
    const builtinSurvivors = builtins.filter(o => survives(o.leftType!, o.rightType!));

    const count = userSurvivors.length + builtinSurvivors.length;
    if (count === 0) return { kind: "unknown" };
    const returns = unionOf(userSurvivors, builtinSurvivors);
    if (count === 1 && userSurvivors.length === 1) {
      // A superset with one member IS the answer, exact match or not.
      const o = userSurvivors[0]!;
      return {
        kind: "user-exact",
        functionSchema: o.functionSchema,
        functionName: o.functionName,
        returns,
      };
    }
    if (userSurvivors.length > 0) return { kind: "nullable", returns };
    return builtinSurvivors.every(o => totalVerdict(o.leftType!, o.rightType!) === "total")
      ? { kind: "total", returns }
      : { kind: "nullable", returns };
  };

  // The PREFIX form: candidates are the leftType-null rows, matched and
  // narrowed on the single argument by the same rules. No signature-keyed
  // totality exceptions exist among prefix rows today, so the verdict is
  // the name-level one per row.
  const resolveUnaryOperatorTotality = (
    schema: string | undefined,
    name: string,
    argTypes: readonly string[] | null,
  ):
    | { kind: "user-exact"; functionSchema: string; functionName: string; returns: string[] }
    | { kind: "total"; returns: string[] }
    | { kind: "nullable"; returns: string[] }
    | { kind: "unknown" } => {
    const As = argTypes === null ? null : argTypes.map(normalizeTypeName);
    const A = As !== null && As.length === 1 ? As[0]! : null;
    const builtins = resolveBuiltinOperatorSignatures(schema, name)
      .filter(o => o.leftType === null && o.rightType !== null);
    const userSchemas = schema ? [schema] : searchPath;
    const users: typeof snapshot.operators = [];
    const seenSig = new Set<string>();
    for (const s of userSchemas) {
      for (const o of opBySchemaName.get(`${s}.${name}`) ?? []) {
        if (o.leftType !== null || o.rightType === null) continue;
        if (!seenSig.has(o.rightType)) {
          seenSig.add(o.rightType);
          users.push(o);
        }
      }
    }
    if (builtins.length === 0 && users.length === 0) return { kind: "unknown" };
    const verdict = (r: string): "total" | "nullable" =>
      (TOTAL_OPERATOR_NAMES.has(name) || TOTAL_OPERATOR_SIGNATURES.has(`${name}(,${r})`)) &&
      !NON_TOTAL_OPERATOR_SIGNATURES.has(`${name}(,${r})`)
        ? "total"
        : "nullable";
    if (A !== null) {
      const builtinExact = builtins.find(o => o.rightType === A);
      if (builtinExact) return { kind: verdict(A), returns: [builtinExact.returns] };
      const userExact = users.find(o => o.rightType === A);
      if (userExact) {
        return {
          kind: "user-exact",
          functionSchema: userExact.functionSchema,
          functionName: userExact.functionName,
          returns: [userExact.resultType],
        };
      }
    }
    if (As === null) {
      // The binary form's measured fallback rule, unary spelling.
      return users.length > 0 && builtins.length > 0
        ? { kind: "nullable", returns: unionOf(users, builtins) }
        : { kind: "unknown" };
    }
    const userSurvivors = users.filter(o =>
      As.some(m => mayCoerceImplicitly(m, o.rightType!)));
    const builtinSurvivors = builtins.filter(o =>
      As.some(m => mayCoerceImplicitly(m, o.rightType!)));
    const count = userSurvivors.length + builtinSurvivors.length;
    if (count === 0) return { kind: "unknown" };
    const returns = unionOf(userSurvivors, builtinSurvivors);
    if (count === 1 && userSurvivors.length === 1) {
      const o = userSurvivors[0]!;
      return {
        kind: "user-exact",
        functionSchema: o.functionSchema,
        functionName: o.functionName,
        returns,
      };
    }
    if (userSurvivors.length > 0) return { kind: "nullable", returns };
    return builtinSurvivors.every(o => verdict(o.rightType!) === "total")
      ? { kind: "total", returns }
      : { kind: "nullable", returns };
  };

  /**
   * EVERY-quantified strictness over the merged candidate set — the
   * promotion consumer's direction (a wrong "strict" is a wrong notNull).
   * Null cedes to the caller's name rule; a user operator sharing a
   * curated name with nothing known answers false, the shadowing guard.
   */
  const resolveOperatorStrictness = (
    schema: string | undefined,
    name: string,
    leftTypes: readonly string[] | null,
    rightTypes: readonly string[] | null,
  ): boolean | null => {
    const Ls = leftTypes === null ? null : leftTypes.map(normalizeTypeName);
    const Rs = rightTypes === null ? null : rightTypes.map(normalizeTypeName);
    const L = Ls !== null && Ls.length === 1 ? Ls[0]! : null;
    const R = Rs !== null && Rs.length === 1 ? Rs[0]! : null;
    const builtins = resolveBuiltinOperatorSignatures(schema, name)
      .filter(o => o.leftType !== null && o.rightType !== null);
    const userSchemas = schema ? [schema] : searchPath;
    const users: typeof snapshot.operators = [];
    const seenSig = new Set<string>();
    for (const s of userSchemas) {
      for (const o of opBySchemaName.get(`${s}.${name}`) ?? []) {
        if (o.leftType === null || o.rightType === null) continue;
        const sig = `${o.leftType},${o.rightType}`;
        if (!seenSig.has(sig)) {
          seenSig.add(sig);
          users.push(o);
        }
      }
    }
    if (builtins.length === 0 && users.length === 0) return null;
    if (L !== null && R !== null) {
      const builtinExact = builtins.find(o => o.leftType === L && o.rightType === R);
      if (builtinExact) return builtinExact.strict;
      const userExact = users.find(o => o.leftType === L && o.rightType === R);
      if (userExact) return userExact.strict;
    }
    if (Ls === null && Rs === null) {
      return users.length > 0 && builtins.length > 0 ? false : null;
    }
    const reaches = (set: readonly string[] | null, param: string): boolean =>
      set === null || set.some(member => mayCoerceImplicitly(member, param));
    const survivors = [
      ...users.filter(o => reaches(Ls, o.leftType!) && reaches(Rs, o.rightType!)),
      ...builtins.filter(o => reaches(Ls, o.leftType!) && reaches(Rs, o.rightType!)),
    ];
    if (survivors.length === 0) return null;
    return survivors.every(o => o.strict);
  };

  /**
   * The SOME-quantified reading of the same survivors — mechanism C's
   * direction (docs/type-aware-overloads.md, the per-property quantifier):
   * over-reporting strictness only over-tightens a parameter, while
   * under-reporting makes the contract admit a binding that raises. No
   * shadowing guard here for the nothing-known case, deliberately: falling
   * back to the name rule over-reports, which is this consumer's safe
   * error.
   */
  const resolveOperatorStrictnessSome = (
    schema: string | undefined,
    name: string,
    leftTypes: readonly string[] | null,
    rightTypes: readonly string[] | null,
  ): boolean | null => {
    if (leftTypes === null && rightTypes === null) return null;
    const Ls = leftTypes === null ? null : leftTypes.map(normalizeTypeName);
    const Rs = rightTypes === null ? null : rightTypes.map(normalizeTypeName);
    const L = Ls !== null && Ls.length === 1 ? Ls[0]! : null;
    const R = Rs !== null && Rs.length === 1 ? Rs[0]! : null;
    const builtins = resolveBuiltinOperatorSignatures(schema, name)
      .filter(o => o.leftType !== null && o.rightType !== null);
    const userSchemas = schema ? [schema] : searchPath;
    const users: typeof snapshot.operators = [];
    const seenSig = new Set<string>();
    for (const s of userSchemas) {
      for (const o of opBySchemaName.get(`${s}.${name}`) ?? []) {
        if (o.leftType === null || o.rightType === null) continue;
        const sig = `${o.leftType},${o.rightType}`;
        if (!seenSig.has(sig)) {
          seenSig.add(sig);
          users.push(o);
        }
      }
    }
    if (builtins.length === 0 && users.length === 0) return null;
    if (L !== null && R !== null) {
      const builtinExact = builtins.find(o => o.leftType === L && o.rightType === R);
      if (builtinExact) return builtinExact.strict;
      const userExact = users.find(o => o.leftType === L && o.rightType === R);
      if (userExact) return userExact.strict;
    }
    const reaches = (set: readonly string[] | null, param: string): boolean =>
      set === null || set.some(member => mayCoerceImplicitly(member, param));
    const survivors = [
      ...users.filter(o => reaches(Ls, o.leftType!) && reaches(Rs, o.rightType!)),
      ...builtins.filter(o => reaches(Ls, o.leftType!) && reaches(Rs, o.rightType!)),
    ];
    if (survivors.length === 0) return null;
    return survivors.some(o => o.strict);
  };

  /**
   * The typed recovery of the drop rule's cost (adversarial-3 finding 6):
   * for a bare name pg_catalog also carries, the user candidates are not
   * the candidate set and the whole set drops — sound, and it costs every
   * user function named after a builtin its metadata. With the claim
   * names' signatures captured, the merged set is decidable for THEM: a
   * user row that is the declared-types exact match (no builtin row
   * sharing the signature — pg_catalog wins that tie, measured) or the
   * single survivor of elimination across BOTH halves is certainly what
   * PostgreSQL runs, and its full metadata (domain return, body, strict
   * flag) comes back into play. Null everywhere else: names the capture
   * does not hold keep the drop rule, and a name with aggregate or window
   * rows refuses outright — their argument semantics differ.
   */
  const resolveUserFunctionTyped = (
    schema: string | undefined,
    name: string,
    argTypes: readonly (readonly string[] | null)[],
  ): FunctionInfo | null => {
    if (schema !== undefined) return null;
    // A non-builtin name's merged set is the user half alone, so typed
    // selection among ORDINARY user overloads rides the same rule — the
    // charter's item 5, now actually built rather than inherited from
    // consensus. For a builtin name the captured rows join the set; a name
    // the capture does not hold keeps the drop rule.
    let builtinRows: BuiltinFunctionSignature[] = [];
    if (isBuiltinFunction(name)) {
      const captured = builtinFnSigsByName.get(name);
      if (!captured || captured.some(r => r.kind !== "f")) return null;
      builtinRows = captured;
    }
    const users = candidatesInPath(name).filter(f =>
      f.args.every(a => a.mode === "in" || a.mode === "inout" || a.mode === "out"),
    );
    if (users.length === 0) return null;
    const argCount = argTypes.length;
    const sets = argTypes.map(s => (s === null ? null : s.map(normalizeTypeName)));
    const singles = sets.map(s => (s !== null && s.length === 1 ? s[0]! : null));

    const userIns = (f: FunctionInfo): string[] =>
      f.args.filter(a => a.mode === "in" || a.mode === "inout").map(a => a.typeName);
    const userAdmits = (f: FunctionInfo): boolean => {
      const ins = f.args.filter(a => a.mode === "in" || a.mode === "inout");
      const required = ins.filter(a => !a.hasDefault).length;
      return argCount >= required && argCount <= ins.length;
    };
    const builtinAdmits = (r: BuiltinFunctionSignature): boolean =>
      r.variadic !== null
        ? argCount >= r.args.length - 1
        : argCount <= r.args.length && argCount >= r.args.length - r.numArgDefaults;

    const userRows = users.filter(userAdmits);
    const bRows = builtinRows.filter(builtinAdmits);
    if (userRows.length === 0) return null;

    if (singles.every(s => s !== null)) {
      const builtinExact = bRows.some(
        r => r.variadic === null && r.args.length === argCount &&
          r.args.every((a, i) => a === singles[i]),
      );
      const userExact = userRows.find(f => {
        const ins = userIns(f);
        return ins.length === argCount && ins.every((a, i) => a === singles[i]);
      });
      if (userExact && !builtinExact) {
        // Same body-map guard as the survivor path below.
        return userExact.language === "sql" && users.length > 1 ? null : userExact;
      }
      if (builtinExact) return null;
    }

    const reaches = (s: readonly string[] | null, param: string): boolean =>
      s === null || s.some(m => mayCoerceImplicitly(m, param));
    const bParamAt = (r: BuiltinFunctionSignature, i: number): string => {
      if (r.variadic === null || i < r.args.length - 1) return r.args[i]!;
      const v = r.args[r.args.length - 1]!;
      return v.endsWith("[]") ? v.slice(0, -2) : v;
    };
    const userSurvivors = userRows.filter(f => {
      const ins = userIns(f);
      return sets.every((s, i) => i >= ins.length || reaches(s, ins[i]!));
    });
    const builtinSurvivors = bRows.filter(r =>
      sets.every((s, i) => reaches(s, bParamAt(r, i))),
    );
    const winner =
      userSurvivors.length === 1 && builtinSurvivors.length === 0
        ? userSurvivors[0]!
        : null;
    // The body-map guard: `fnBodyAsts` is keyed by name alone, so an
    // overloaded name's SQL bodies collide there — the invariant that made
    // the key unambiguous was resolveFunctionMetadata's single-candidate
    // shortcut, and typed selection must not smuggle a colliding meta past
    // it (the class-A trap fixture is built on exactly that collision).
    // Domain returns, strictness and plpgsql winners carry no body read
    // and stay recoverable; a SQL-bodied overload waits for a
    // signature-keyed body map.
    if (winner && winner.language === "sql" && users.length > 1) return null;
    return winner;
  };

  /**
   * The WITHIN GROUP dispatch's row facts — CLASS claims keyed on
   * `pg_aggregate.aggkind` from the capture, replacing the two retired
   * name tables that mirrored it (they were asserted catalog-equal both
   * ways, the AGGREGATE_NAMES precedent): a hypothetical-set row is total
   * by class, an ordered-set row follows the plain-aggregate gates. Null
   * when the name has no aggregate rows.
   */
  const resolveBuiltinAggregateRows = (
    schema: string | undefined,
    name: string,
  ): { hypothetical: boolean; orderedSet: boolean } | null => {
    const rows = resolveBuiltinFunctionSignatures(schema, name).filter(r => r.kind === "a");
    if (rows.length === 0) return null;
    return {
      hypothetical: rows.some(r => r.aggKind === "h"),
      orderedSet: rows.some(r => r.aggKind === "o"),
    };
  };

  /**
   * The scalar half of the function dispatch, typed
   * (docs/type-aware-overloads.md, the function slice): the kind='f' rows
   * behind a claim-table name, arity-admitted with their captured defaults
   * (five names carry them — eliminating a shorter call would be a false
   * elimination), exact-matched on singleton argument sets, otherwise
   * eliminated per position and read by CONSENSUS over the survivors'
   * verdicts. The verdict source is the name tables plus the
   * signature-keyed additions (`lower(text)` is the founding recovery);
   * the lattice weakens soundly — always ⇒ first-arg ⇒ strict-total, so
   * mixed survivors conclude the weakest claim they all imply.
   */
  /**
   * The rows of one name that a call could resolve to: arity-admitted with
   * the captured defaults, exact-matched on singleton argument sets, and
   * otherwise eliminated per position by implicit coercibility. Shared by the
   * scalar and window resolvers so the elimination cannot fork between them —
   * the two ask different verdict tables about the SAME survivors.
   */
  const selectBuiltinRows = (
    rows: readonly BuiltinFunctionSignature[],
    argTypes: readonly (readonly string[] | null)[],
  ): { exact: BuiltinFunctionSignature } | { survivors: BuiltinFunctionSignature[] } | null => {
    const argCount = argTypes.length;
    const sets = argTypes.map(s => (s === null ? null : s.map(normalizeTypeName)));

    const admitsArity = (r: BuiltinFunctionSignature): boolean =>
      r.variadic !== null
        ? argCount >= r.args.length - 1
        : argCount <= r.args.length && argCount >= r.args.length - r.numArgDefaults;
    const arityRows = rows.filter(admitsArity);
    if (arityRows.length === 0) return null;

    const singles = sets.map(s => (s !== null && s.length === 1 ? s[0]! : null));
    if (singles.length === argCount && singles.every(s => s !== null)) {
      const exact = arityRows.find(
        r =>
          r.variadic === null &&
          r.args.length === argCount &&
          r.args.every((a, i) => a === singles[i]),
      );
      if (exact) return { exact };
    }

    // A variadic row's positions past the fixed prefix check the variadic
    // type — its ELEMENT for a concrete array, and `"any"` admits all.
    const paramAt = (r: BuiltinFunctionSignature, i: number): string => {
      if (r.variadic === null || i < r.args.length - 1) return r.args[i]!;
      const v = r.args[r.args.length - 1]!;
      return v.endsWith("[]") ? v.slice(0, -2) : v;
    };
    const survivors = arityRows.filter(r =>
      sets.every((s, i) => {
        if (s === null) return true;
        const p = paramAt(r, i);
        return s.some(m => mayCoerceImplicitly(m, p));
      }),
    );
    return survivors.length === 0 ? null : { survivors };
  };

  /**
   * The WINDOW half of the same dispatch (2026-08-09). Same survivors, a
   * different pair of verdict tables: `NEVER_NULL_WINDOW_SIGNATURES` claims
   * whatever the arguments, `STRICT_TOTAL_WINDOW_SIGNATURES` claims for
   * non-null ones. The re-key is what lets `lag(price, 1, 0)` claim notNull
   * while `lag(price)` keeps reading nullable — the same shape `lower(text)`
   * gave the scalar side, one table over.
   */
  const resolveBuiltinWindowTotality = (
    schema: string | undefined,
    name: string,
    argTypes: readonly (readonly string[] | null)[],
  ): { kind: "always" | "strict-total" | "nullable" | "unknown" } => {
    const rows = resolveBuiltinFunctionSignatures(schema, name).filter(r => r.kind === "w");
    if (rows.length === 0) return { kind: "unknown" };
    const sel = selectBuiltinRows(rows, argTypes);
    if (sel === null) return { kind: "unknown" };
    const verdictOf = (r: BuiltinFunctionSignature): "always" | "strict-total" | null => {
      const key = `${r.name}(${r.args.join(",")})`;
      if (NEVER_NULL_WINDOW_SIGNATURES.has(key)) return "always";
      if (STRICT_TOTAL_WINDOW_SIGNATURES.has(key)) return "strict-total";
      return null;
    };
    const judged = ("exact" in sel ? [sel.exact] : sel.survivors).map(verdictOf);
    if (judged.some(v => v === null)) return { kind: "nullable" };
    return { kind: judged.every(v => v === "always") ? "always" : "strict-total" };
  };

  /**
   * Is a cast from `sourceTypes` to `target` total — non-null in, non-null
   * out? Answered from `pg_cast` and the SAME verdict tables the function
   * dispatch reads, which is what makes it general: a cast is claimed
   * exactly when its implementation function is, and every future
   * NULL-capable cast falls out without a new list.
   *
   * "a cast preserves its argument's nullability" was the walk's assumption
   * and it is false — `'infinity'::timestamp::time` and `'null'::jsonb::int4`
   * are NULL from wholly non-null input. A `castfunc` of 0 is
   * binary-coercible or an I/O round trip: it computes nothing, so it cannot
   * invent a NULL and is total.
   *
   * "unknown" means the pair is not in pg_cast — a user-defined cast, or a
   * source type the walk could not name — and leaves the caller on its
   * previous behaviour rather than costing every such cast its claim.
   */
  const castsByPair = new Map<string, string | null>();
  for (const c of snapshot.builtinCasts ?? []) {
    castsByPair.set(`${c.source}->${c.target}`, c.func);
  }
  const resolveCastTotality = (
    sourceTypes: readonly string[] | null,
    target: string,
  ): "total" | "nullable" | "unknown" => {
    if (sourceTypes === null || sourceTypes.length === 0) return "unknown";
    const t = normalizeTypeName(target);
    const verdicts = sourceTypes.map(s => {
      // A source equal to the target is not a cast at all.
      const src = normalizeTypeName(s);
      if (src === t) return "total" as const;
      const key = `${src}->${t}`;
      if (!castsByPair.has(key)) return "unknown" as const;
      const func = castsByPair.get(key)!;
      if (func === null) return "total" as const;
      const name = func.slice(0, func.indexOf("("));
      return ALWAYS_NOT_NULL_BUILTINS.has(name) ||
        FIRST_ARG_BUILTINS.has(name) ||
        STRICT_TOTAL_BUILTINS.has(name) ||
        STRICT_TOTAL_BUILTIN_SIGNATURES.has(func)
        ? ("total" as const)
        : ("nullable" as const);
    });
    // The source is a type SET — the survivor union of whatever produced it —
    // so the cast is total only if it is total for every member, and NULLABLE
    // as soon as one member's cast is. An unknown member cedes to the caller.
    if (verdicts.some(v => v === "nullable")) return "nullable";
    if (verdicts.some(v => v === "unknown")) return "unknown";
    return "total";
  };

  const resolveBuiltinScalarTotality = (
    schema: string | undefined,
    name: string,
    argTypes: readonly (readonly string[] | null)[],
  ):
    | { kind: "always"; returns: string[] }
    | { kind: "first-arg"; returns: string[] }
    | { kind: "strict-total"; returns: string[] }
    | { kind: "nullable"; returns: string[] }
    | { kind: "unknown" } => {
    const rows = resolveBuiltinFunctionSignatures(schema, name).filter(r => r.kind === "f");
    if (rows.length === 0) return { kind: "unknown" };
    const sel = selectBuiltinRows(rows, argTypes);
    if (sel === null) return { kind: "unknown" };

    const verdictOf = (r: BuiltinFunctionSignature): "always" | "first-arg" | "strict-total" | null => {
      if (ALWAYS_NOT_NULL_BUILTINS.has(r.name)) return "always";
      if (FIRST_ARG_BUILTINS.has(r.name)) return "first-arg";
      if (STRICT_TOTAL_BUILTINS.has(r.name)) return "strict-total";
      if (STRICT_TOTAL_BUILTIN_SIGNATURES.has(`${r.name}(${r.args.join(",")})`)) {
        return "strict-total";
      }
      return null;
    };

    if ("exact" in sel) {
      const v = verdictOf(sel.exact);
      return v === null
        ? { kind: "nullable", returns: [sel.exact.returns] }
        : { kind: v, returns: [sel.exact.returns] };
    }
    const survivors = sel.survivors;
    const returns = [...new Set(survivors.map(r => r.returns))];
    const verdicts = survivors.map(verdictOf);
    if (verdicts.some(v => v === null)) return { kind: "nullable", returns };
    if (verdicts.every(v => v === "always")) return { kind: "always", returns };
    if (verdicts.every(v => v === "always" || v === "first-arg")) return { kind: "first-arg", returns };
    return { kind: "strict-total", returns };
  };

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
    resolveOperatorTotality,
    resolveUnaryOperatorTotality,
    resolveOperatorStrictness,
    resolveOperatorStrictnessSome,
    resolveBuiltinScalarTotality,
    resolveBuiltinWindowTotality,
    resolveCastTotality,
    resolveBuiltinAggregateRows,
    resolveUserFunctionTyped,
    resolveBuiltinFunctionSignatures,
    resolveBuiltinOperatorSignatures,
    resolveCanonicalTypeName,
    mayCoerceImplicitly,
    resolveBinaryCoercionTargets,
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
    resolvePolymorphicArraySignatures,
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
