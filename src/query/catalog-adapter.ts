import type { Node } from "libpg-query";
import type { CatalogSnapshot } from "../catalog/types.js";
import type {
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
): Promise<NullabilityCatalog> {
  // Build table lookup map.
  const tableMap = new Map<
    string,
    {
      schema: string;
      name: string;
      columns: string[];
      notNullCols: Set<string>;
      colTypeOids: Map<string, number>;
    }
  >();
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
      colTypeOids: new Map(t.columns.map(c => [c.name, c.typeOid])),
    });
  }
  // Views have columns too — treat them like tables for resolution.
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
      colTypeOids: new Map(v.columns.map(c => [c.name, c.typeOid])),
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
    const s = schema ?? "public";
    const key = `${s}.${name}`;
    const t = tableMap.get(key);
    if (t) return { schema: t.schema, name: t.name, columns: t.columns };
    if (!schema) {
      const pub = tableMap.get(`public.${name}`);
      if (pub) return { schema: pub.schema, name: pub.name, columns: pub.columns };
    }
    return null;
  };

  const resolveFunction = (
    schema: string | undefined,
    name: string,
  ): ResolvedFunction | null => {
    const s = schema ?? "public";
    const key = `${s}.${name}`;
    if (fnMap.has(key)) return { schema: s, name };
    if (!schema && fnMap.has(`public.${name}`))
      return { schema: "public", name };
    return null;
  };

  const resolveColumnNotNull = (
    schema: string,
    table: string,
    column: string,
  ): boolean => {
    const t = tableMap.get(`${schema}.${table}`);
    if (!t) return false;
    return t.notNullCols.has(column);
  };

  const resolveColumnTypeOid = (
    schema: string,
    table: string,
    column: string,
  ): number | null => {
    const t = tableMap.get(`${schema}.${table}`);
    return t?.colTypeOids.get(column) ?? null;
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
    const s = schema ?? "public";
    return compositeTypes.get(`${s}.${name}`)
      ?? (schema ? null : compositeTypes.get(`public.${name}`))
      ?? null;
  };

  const resolveFunctionMetadata = (
    schema: string | undefined,
    name: string,
  ) => {
    const s = schema ?? "public";
    const key = `${s}.${name}`;
    const fns = fnMap.get(key);
    if (fns && fns.length === 1) return fns[0]!;
    if (!schema) {
      const pubFns = fnMap.get(`public.${name}`);
      if (pubFns && pubFns.length === 1) return pubFns[0]!;
    }
    return null;
  };

  const isNotNullDomain = (typeOid: number): boolean => {
    return domainOids.get(typeOid) ?? false;
  };

  const isNotNullDomainByName = (
    schema: string | undefined,
    typeName: string,
  ): boolean => {
    const s = schema ?? "public";
    if (domainNames.has(`${s}.${typeName}`)) {
      return domainNames.get(`${s}.${typeName}`)!;
    }
    if (!schema && domainNames.has(`public.${typeName}`)) {
      return domainNames.get(`public.${typeName}`)!;
    }
    return false;
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
  ): { strict: boolean; functionSchema: string; functionName: string } | null => {
    const candidates = schema ? opBySchemaName.get(`${schema}.${name}`) : opByName.get(name);
    if (!candidates || candidates.length !== 1) return null;
    const o = candidates[0]!;
    return { strict: o.strict, functionSchema: o.functionSchema, functionName: o.functionName };
  };

  return {
    resolveTable,
    resolveFunction,
    resolveColumnNotNull,
    resolveColumnTypeOid,
    resolveCompositeType,
    resolveFunctionMetadata,
    resolveOperatorMetadata,
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
