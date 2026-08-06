import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import type { CatalogSnapshot } from "../../../src/catalog/types.js";

// ---------------------------------------------------------------------------
// Catalog-feature census.
//
// `node-census.test.ts`'s shape, on the other axis. The engine is a function
// of (AST, CATALOG), and that suite censuses only the first argument: it
// enumerates every parse-tree node type the walk has considered and fails when
// reality moves outside the set. Nothing censused the catalog features those
// nodes are interpreted against — and that is where the defects were. All
// eight adversarial-sweep-3 findings arrived through node types already
// classified `handled`; five of them needed schema vocabulary
// `fixtures/schema.sql` did not have, so the generated corpus's 8980 queries
// could not express a single falsifying input (docs/generated-surface.md).
//
// So: enumerate the CATALOG features the walk branches on, classify each, and
// fail when the fixture schema stops carrying one. The classification is the
// deliverable. A generator silently does not generate a feature nobody wrote
// down; a census fails loudly on it, and the ABSENT entries below are the
// axis vocabulary for the schema axis (docs/generated-surface.md item 4).
//
// Five assertions:
//
//   1. Every classified feature is present in the fixture schema's snapshot.
//      Deleting the only NOT VALID foreign key, or the only quoted `TABLE(…)`
//      column name, fails here rather than silently retiring a branch's
//      coverage.
//
//   2. Every feature marked `absent` really is absent. That marker is the
//      census's output — a branch the walk has and the fixture schema does not
//      reach — and its note says where the branch IS exercised, or what it
//      would take. When somebody adds the DDL, the marker has to come off,
//      which is the moment to declare the coverage.
//
//   3. Every `environment` feature's captured set is non-empty. These are
//      properties of the PostgreSQL version rather than of a user schema, so
//      assertion 1 cannot speak for them.
//
//   4. Every value each enumerated catalog column actually takes is
//      classified. This is the half that catches an unknown-unknown the way
//      the node census does: the feature list above is hand-written and can
//      only fail on what somebody thought to list, but `pg_type.typtype` and
//      its siblings have finite, PostgreSQL-defined domains, so a version
//      that introduces a new relkind or argument mode fails here.
//
//   5. Every classified value is observed, unless marked `absent`. The
//      complement of 4, and the same argument as the node census's third
//      assertion: a classification for a value reality never produces is an
//      untested claim.
//
// Note on scope: this censuses the catalog as the SNAPSHOT captures it, which
// is what the walk can see. A fact PostgreSQL records and the snapshot does
// not is invisible here by construction — that gap belongs to
// `tests/unit/catalog/snapshot.test.ts`, not to this suite.
// ---------------------------------------------------------------------------

type Category =
  /** A walk branch keys on this catalog fact. */
  | "handled"
  /**
   * The ADAPTER narrows or drops the fact before the walk can ask — the shape
   * `resolveForeignKey`, `resolveCheckConstraintsTree` and
   * `resolveGenerationExprTree` all take, so a fact refused at build time can
   * never be misused downstream. What the fixture schema must carry is the
   * input the gate REJECTS, since a gate with nothing to reject is untested.
   */
  | "gated"
  /** The snapshot captures it and no branch reads it; the walk stays nullable. */
  | "conservative"
  /** A property of the PostgreSQL version, not of any user schema. */
  | "environment";

/**
 * Facts a detector needs that the SNAPSHOT does not carry. There is one, and
 * it is worth naming rather than working around: a sub-partition and a
 * top-level partitioned parent are both `relkind = 'p'` with
 * `hasDescendants = true`, and `TableInfo` has no parent pointer, so the
 * snapshot cannot tell them apart. The recursion that a two-level tree would
 * exercise lives in the snapshot's own subtree computation rather than in the
 * walk, which only ever asks `resolveIsPartitioned`.
 */
interface CensusEnv {
  /** child relation name → parent relation name, from pg_inherits. */
  childToParent: Map<string, string>;
}

interface Feature {
  category: Category;
  /** The walk or adapter branch this feature feeds. */
  why: string;
  /** Whether the fixture schema's snapshot carries it. */
  detect(s: CatalogSnapshot, env: CensusEnv): boolean;
  /**
   * Deliberately NOT in the fixture schema. Every one of these is a line item
   * for the schema axis, and the note says where the branch is exercised
   * instead (a suite that builds its own catalog) or what it would take.
   */
  absent?: string;
}

// --- detector helpers ------------------------------------------------------
//
// Rendered type names are schema-qualified for user types (`public.sku_pair`)
// and bare for builtins (`text`), which is what `format_type` produces and
// what every one of these compares against.

const qualified = <T extends { schema: string; name: string }>(xs: T[]): Set<string> =>
  new Set(xs.map(x => `${x.schema}.${x.name}`));

const elementOf = (rendered: string): string | null =>
  rendered.endsWith("[]") ? rendered.slice(0, -2) : null;

const anyColumn = (s: CatalogSnapshot, p: (c: CatalogSnapshot["tables"][number]["columns"][number]) => boolean): boolean =>
  s.tables.some(t => t.columns.some(p));

const anyConstraint = (
  s: CatalogSnapshot,
  p: (c: CatalogSnapshot["tables"][number]["constraints"][number], t: CatalogSnapshot["tables"][number]) => boolean,
): boolean => s.tables.some(t => t.constraints.some(c => p(c, t)));

/**
 * The quoted identifiers in a rendered type, unquoted. Scanning globally is
 * what makes the pairing right: quotes in a `format_type` rendering come in
 * pairs, so consuming them two at a time never mistakes the gap BETWEEN two
 * identifiers for one — a plain `/"[^"]* [^"]*"/` matches `" integer, "` in
 * `TABLE("Upper" integer, "x" text)` and reports a space that is not in any
 * name. `""` is an embedded quote and stays inside the identifier.
 */
const quotedIdentifiers = (rendered: string): string[] =>
  [...rendered.matchAll(/"((?:[^"]|"")*)"/g)].map(m => m[1]!);

const anyQuotedIdentifier = (s: CatalogSnapshot, p: (ident: string) => boolean): boolean =>
  s.functions.some(f => quotedIdentifiers(f.returnType).some(p));

const FEATURES: Record<string, Feature> = {
  // --- the type side ------------------------------------------------------
  //
  // `docs/generated-surface.md`: vary the TYPE side and the NAME side, the
  // two families that produced sweep-3's five schema-dependent findings.

  "domain-over-scalar": {
    category: "handled",
    why: "isNotNullDomain / isNotNullDomainByName — the priority-1 function dispatch rule and NOT NULL cast targets",
    detect: s => s.domains.some(d => {
      const composites = qualified(s.compositeTypes);
      const domains = qualified(s.domains);
      return !d.baseTypeName.endsWith("[]") && !composites.has(d.baseTypeName) && !domains.has(d.baseTypeName);
    }),
  },
  "domain-not-null": {
    category: "handled",
    why: "notNullDomainOids in the adapter: a column TYPED by a NOT NULL domain is non-null in every stored row while attnotnull stays false",
    detect: s => s.domains.some(d => d.notNull),
  },
  "domain-nullable": {
    category: "handled",
    why: "the control for the above — a domain without NOT NULL must not upgrade its column",
    detect: s => s.domains.some(d => !d.notNull),
  },
  "domain-with-check": {
    category: "conservative",
    why: "domain CHECKs are a different mechanism from table CHECKs and the entailment kernel does not read them (resolveCheckConstraints)",
    detect: s => s.domains.some(d => d.check !== null),
  },
  "domain-over-composite": {
    category: "handled",
    why: "resolveCompositeType follows a domain to its base composite — one snapshot predicate (typtype='c') decided what 'is a composite' meant for three callers, and a domain over one was not one anywhere (sweep-3 finding 4)",
    detect: s => {
      const composites = qualified(s.compositeTypes);
      return s.domains.some(d => composites.has(d.baseTypeName));
    },
  },
  "domain-over-array-of-composite": {
    category: "handled",
    why: "resolveDomainBaseTypeName — how the unnest element-type resolver sees through a domain that hides its array-ness behind its own name (sweep-3 finding 3)",
    detect: s => {
      const composites = qualified(s.compositeTypes);
      return s.domains.some(d => {
        const el = elementOf(d.baseTypeName);
        return el !== null && composites.has(el);
      });
    },
  },
  "domain-over-domain": {
    category: "handled",
    why: "resolveCompositeType follows a domain TRANSITIVELY to its base; one hop is all the fixture schema tests",
    detect: s => {
      const domains = qualified(s.domains);
      return s.domains.some(d => domains.has(d.baseTypeName));
    },
    absent: "No fixture covers the second hop. The transitive walk is written but every domain here reaches its base in one step.",
  },
  "composite-type": {
    category: "handled",
    why: "resolveCompositeType — SETOF <composite> expands to the type's fields exactly as a table row type does",
    detect: s => s.compositeTypes.length > 0,
  },
  "composite-column": {
    category: "handled",
    why: "expandCompositeStar — `(p).*` over a composite COLUMN, where the parentheses force the value reading over a range-table alias of the same name (sweep-2 finding 13)",
    detect: s => {
      const composites = qualified(s.compositeTypes);
      return anyColumn(s, c => composites.has(c.typeName));
    },
  },
  "array-of-composite-column": {
    category: "handled",
    why: "unnestCompositeElementFields — unnest of a composite-element array expands the element's FIELDS, one column per field (sweep-2 finding 4)",
    detect: s => {
      const composites = qualified(s.compositeTypes);
      return anyColumn(s, c => {
        const el = elementOf(c.typeName);
        return el !== null && composites.has(el);
      });
    },
  },
  "array-of-domain-column": {
    category: "handled",
    why: "the same resolver reaching the element type through a domain rather than a composite name",
    detect: s => {
      const domains = qualified(s.domains);
      return anyColumn(s, c => {
        const el = elementOf(c.typeName);
        return el !== null && domains.has(el);
      });
    },
  },
  "domain-over-array-column": {
    category: "handled",
    why: "a column whose declared type is a DOMAIN that renders without brackets while being an array — the spelling resolveDomainBaseTypeName exists for",
    detect: s => {
      const domains = qualified(s.domains);
      return anyColumn(s, c => domains.has(c.typeName) && !c.typeName.endsWith("[]"));
    },
  },
  "array-of-table-row-type-column": {
    category: "handled",
    why: "the element-type resolver falling through to the RELATION — resolveCompositeType is backed by CREATE TYPE entries alone, so `trow[]` resolved to nothing and unnest contributed one column against PostgreSQL's N (post-fix audit (a))",
    detect: s => {
      const tables = qualified(s.tables);
      return anyColumn(s, c => {
        const el = elementOf(c.typeName);
        return el !== null && tables.has(el);
      });
    },
  },
  "table-row-type-column": {
    category: "handled",
    why: "the same two-step relation fallback in its BARE spelling — a column declared with a table's row type rather than an array of it",
    detect: s => {
      const tables = qualified(s.tables);
      return anyColumn(s, c => tables.has(c.typeName));
    },
    absent: "Only the array spelling (`trow_holder.rows trow[]`) exists. A bare `trow` column would reach resolveCompositeType's relation fallback without the array hop.",
  },
  "enum-type": {
    category: "conservative",
    why: "enums are captured (CatalogSnapshot.enums) and no branch reads them; an enum column is an ordinary scalar to the walk",
    detect: s => s.enums.length > 0,
    absent: "No CREATE TYPE … AS ENUM. The claim that an enum is uneventful for the walk is therefore untested.",
  },
  "range-type-column": {
    category: "conservative",
    why: "no totality entry: lower/upper have a total (text) form AND an (anyrange) form returning NULL for an EMPTY range, so the name left STRICT_TOTAL_BUILTINS and the range spelling must read nullable (the curated-table audit's rank-1 finding; builtin-range-lower-upper.sql pins it)",
    detect: s => anyColumn(s, c => /range$/.test(c.typeName)),
  },

  // --- the name side ------------------------------------------------------

  "second-schema": {
    category: "handled",
    why: "inPath walks searchPath in order for tables, functions, composites and domains (sweep-2 finding 5 half (a))",
    detect: s => s.schemas.some(x => x.name !== "public" && x.name !== "information_schema" && !x.name.startsWith("pg_")),
    absent: "The fixture schema is single-schema. search-path.test.ts and resolver.test.ts build their own catalogs with `app_s` because the fixture harness cannot hold two.",
  },
  "relation-name-in-two-schemas": {
    category: "handled",
    why: "first-schema-wins for relations, and scope.visible rather than scope.aliases resolving a schema-qualified star when two same-named relations are in scope (post-fix audit (b))",
    detect: s => {
      const seen = new Map<string, number>();
      for (const t of s.tables) seen.set(t.name, (seen.get(t.name) ?? 0) + 1);
      return [...seen.values()].some(n => n > 1);
    },
    absent: "Needs `second-schema`. Pinned in search-path.test.ts, beside PostgreSQL's own 'ambiguous' rejection of the bare spelling.",
  },
  "function-overloaded-in-one-schema": {
    category: "handled",
    why: "resolveFunctionMetadata refuses to pick one, and resolveFunctionCandidates / resolveFunctionShapes take CONSENSUS over what survives",
    detect: s => {
      const seen = new Map<string, Set<string>>();
      for (const f of s.functions) {
        const k = `${f.schema}.${f.name}`;
        if (!seen.has(k)) seen.set(k, new Set());
        seen.get(k)!.add(f.argTypes);
      }
      return [...seen.values()].some(v => v.size > 1);
    },
  },
  "function-overloaded-across-schemas": {
    category: "handled",
    why: "unqualified lookups merge candidates ACROSS the path deduped by argTypes — a function is identified by name AND argument types, so first-schema-wins is wrong for it (sweep-3 section A)",
    detect: s => {
      const seen = new Map<string, Set<string>>();
      for (const f of s.functions) {
        if (!seen.has(f.name)) seen.set(f.name, new Set());
        seen.get(f.name)!.add(f.schema);
      }
      return [...seen.values()].some(v => v.size > 1);
    },
    absent: "Needs `second-schema`. Four function-resolution cases and both hiding directions are pinned in search-path.test.ts.",
  },
  "user-function-named-after-a-builtin": {
    category: "handled",
    why: "isBuiltinFunction — pg_catalog is searched implicitly and FIRST unless the path names it, so for an identical signature the BUILTIN hides the user function, which is the opposite of what every builtin table documented (sweep-3 finding 6)",
    detect: s => {
      const builtins = new Set(s.builtinFunctionNames);
      return s.functions.some(f => builtins.has(f.name));
    },
  },
  "quoted-identifier-with-space": {
    category: "handled",
    why: "columnsForReturnType's identifier-aware split — pg_get_function_result renders names with quote_ident, and splitting each TABLE(…) part at indexOf(' ') split INSIDE the quotes (sweep-3 finding 7, arity-preserving and NAME-only, so nothing but an ordered name comparison sees it)",
    detect: s => anyQuotedIdentifier(s, id => id.includes(" ")),
  },
  "quoted-identifier-for-case": {
    category: "handled",
    why: "the same split — a name quoted only for its case kept its quote characters and came back spelled with them",
    detect: s => anyQuotedIdentifier(s, id => /[A-Z]/.test(id)),
  },
  "quoted-identifier-with-comma-or-bracket": {
    category: "handled",
    why: "splitTopLevel is identifier-aware too, so a comma or bracket inside quotes is text rather than structure (measured: TABLE(\"a,b\" integer, \"c)d\" text) is a faithful rendering)",
    detect: s => anyQuotedIdentifier(s, id => /[,()]/.test(id)),
  },
  "quoted-identifier-with-embedded-quote": {
    category: "handled",
    why: "the doubled-quote escape, which is what makes the scan pair-wise rather than character-wise at both the split and the census's own reader",
    detect: s => s.functions.some(f => quotedIdentifiers(f.returnType).some(id => id.includes('""'))),
  },

  // --- function shapes ----------------------------------------------------

  "setof-table-return": {
    category: "handled",
    why: "columnsForReturnType's SETOF branch — a SETOF <table> return ERASES the table's NOT NULLs (measured), so the body is the only sound source of a guarantee and the walk reads it back (imprecision-closure class A)",
    detect: s => {
      const tables = qualified(s.tables);
      return s.functions.some(f => f.returnType.startsWith("SETOF ") && tables.has(f.returnType.slice(6)));
    },
  },
  "setof-composite-return": {
    category: "handled",
    why: "the same branch resolving through resolveCompositeType rather than the relation",
    detect: s => {
      const composites = qualified(s.compositeTypes);
      return s.functions.some(f => f.returnType.startsWith("SETOF ") && composites.has(f.returnType.slice(6)));
    },
  },
  "setof-domain-return": {
    category: "handled",
    why: "the scalar element case — one column, whose NOT NULL domain survives the SETOF where a table's constraints do not",
    detect: s => {
      const domains = qualified(s.domains);
      return s.functions.some(f => f.returnType.startsWith("SETOF ") && domains.has(f.returnType.slice(6)));
    },
  },
  "setof-record-return-from-out-params": {
    category: "handled",
    why: "functionOutputColumns reads proargmodes/proargnames/proallargtypes — a function declared with OUT parameters renders `SETOF record` and contributed ONE column named after the function against PostgreSQL's N (post-fix audit item 3)",
    detect: s => s.functions.some(f => f.returnType === "SETOF record" && f.args.some(a => a.mode === "out")),
  },
  "table-return": {
    category: "handled",
    why: "columnsForReturnType's TABLE(…) branch — the column list is the rendering",
    detect: s => s.functions.some(f => f.returnType.startsWith("TABLE(")),
  },
  "table-return-with-one-composite-column": {
    category: "handled",
    why: "a RETURNS TABLE(r <composite>) with a SINGLE output column is a function whose row type IS that composite, so PostgreSQL emits its FIELDS where the rendering reads as one column named r (post-fix audit item 3)",
    detect: s => {
      const composites = qualified(s.compositeTypes);
      return s.functions.some(f => {
        const m = /^TABLE\(([^,]+)\)$/.exec(f.returnType);
        if (!m) return false;
        const parts = m[1]!.trim().split(/\s+/);
        return parts.length === 2 && composites.has(parts[1]!);
      });
    },
  },
  "composite-return-not-set": {
    category: "handled",
    why: "a non-set-returning composite return whose body can yield zero rows comes back as ONE all-NULL row (measured), so the scalar path's single-row gate applies (imprecision-closure class A, body-shape-* fixtures)",
    detect: s => {
      const composites = qualified(s.compositeTypes);
      const tables = qualified(s.tables);
      return s.functions.some(f => !f.returnsSet && (composites.has(f.returnType) || tables.has(f.returnType)));
    },
  },
  "scalar-return": {
    category: "handled",
    why: "the ordinary case — priority 5 reads a single-candidate LANGUAGE sql body's column 0",
    detect: s => s.functions.some(f => !f.returnsSet && !f.returnType.startsWith("TABLE(")),
  },
  "out-parameter": {
    category: "handled",
    why: "FunctionArgInfo.mode 'o' — what functionOutputColumns reads instead of the lossy rendering",
    detect: s => s.functions.some(f => f.args.some(a => a.mode === "out")),
  },
  "inout-parameter": {
    category: "handled",
    why: "resolveFunctionCandidates counts 'in' and 'inout' as INPUTS when filtering by arity; an INOUT argument is also an output column",
    detect: s => s.functions.some(f => f.args.some(a => a.mode === "inout")),
    absent: "proargmodes 'b' appears nowhere. The arity filter's inout half and functionOutputColumns' inout half are both untested.",
  },
  "variadic-parameter": {
    category: "gated",
    why: "resolveFunctionCandidates returns null outright for a variadic candidate — arity filtering is unsound against one, and it once sent a whole FROM item to a single wrongly-named column (measured: vp(VARIADIC text[]) beside vp(integer))",
    detect: s => s.functions.some(f => f.args.some(a => a.mode === "variadic")),
    absent: "No USER variadic function. The gate is pinned in unsupported-nodes.test.ts and resolver.test.ts, which build their own catalogs; builtin-variadic-null.sql covers only the pg_catalog side.",
  },
  "argument-with-default": {
    category: "handled",
    why: "resolveFunctionCandidates' arity window is `argCount >= required && argCount <= inputs.length`, where `required` counts arguments WITHOUT a default — a call with fewer arguments than the declaration still resolves",
    detect: s => s.functions.some(f => f.args.some(a => a.hasDefault)),
    absent: "No DEFAULT argument anywhere, so the lower bound of that window is never exercised: every candidate here has required === inputs.length.",
  },
  "set-returning-user-function": {
    category: "handled",
    why: "functionReturnsSet by consensus over candidates — srfPaddedTargets needs a count of TWO, so one unrecognised SRF turned the padding rule off for the WHOLE target list (sweep-3 findings 1 and 2)",
    detect: s => s.functions.some(f => f.returnsSet),
  },
  "user-aggregate-with-initcond": {
    category: "handled",
    why: "FunctionInfo.aggInitVal — a non-null INITCOND is what makes an aggregate non-null over zero input rows, since with no rows to transition the initial state IS the result",
    detect: s => s.functions.some(f => f.isAggregate && f.aggInitVal !== null),
  },
  "user-aggregate-without-initcond": {
    category: "handled",
    why: "the control for the above: no INITCOND means the zero-row result is NULL and the claim must be dropped",
    detect: s => s.functions.some(f => f.isAggregate && f.aggInitVal === null),
    absent: "All three user aggregates declare INITCOND '0'. Only the non-null branch is reached from the fixture schema.",
  },
  "user-window-function": {
    category: "conservative",
    why: "FunctionInfo.isWindow is captured; the walk's window dispatch is keyed on the curated builtin sets (NEVER_NULL_WINDOW_FNS and siblings), so a USER window function falls through to nullable",
    detect: s => s.functions.some(f => f.isWindow),
    absent: "No CREATE FUNCTION … WINDOW. That the fallthrough is what happens is asserted nowhere.",
  },
  "procedure": {
    category: "conservative",
    why: "FunctionInfo.isProcedure is captured and no branch reads it; a CALL is not a query the walk analyses",
    detect: s => s.functions.some(f => f.isProcedure),
    absent: "No CREATE PROCEDURE. prokind 'p' is unrepresented in the snapshot the walk sees.",
  },
  "security-definer-function": {
    category: "conservative",
    why: "captured and unread — a body's nullability does not depend on whose privileges run it",
    detect: s => s.functions.some(f => f.securityDefiner),
    absent: "No SECURITY DEFINER function. Recorded because the claim that it is uneventful is a claim.",
  },
  "strict-function": {
    category: "handled",
    why: "the strict dispatch — a strict function returns NULL for a NULL argument without the body running, which short-circuits body recursion entirely",
    detect: s => s.functions.some(f => f.strict),
  },
  "language-sql-body": {
    category: "handled",
    why: "fnBodyAsts — the walk recurses into a single-candidate LANGUAGE sql body; the map is keyed by NAME alone, so only a single candidate may be read",
    detect: s => s.functions.some(f => f.language === "sql"),
  },
  "language-plpgsql-body": {
    category: "handled",
    why: "the control: an unanalysable body means priority 1 (a NOT NULL domain return) is the only thing that can still speak",
    detect: s => s.functions.some(f => f.language === "plpgsql"),
  },
  "user-operator-strict": {
    category: "handled",
    why: "resolveOperatorMetadata — a strict backing function plus a TRUE comparison licenses WHERE-side promotion and narrowing exactly like a builtin",
    detect: s => s.operators.some(o => o.strict),
  },
  "user-operator-non-strict": {
    category: "handled",
    why: "the counterexample that pins the boundary — the engine's first measured unsoundness was WHERE promotion trusting an arbitrary operator",
    detect: s => s.operators.some(o => !o.strict),
  },
  "user-operator-overloaded": {
    category: "handled",
    why: "strictness by CONSENSUS across candidates while output-side body dispatch stays single-candidate, because bodies differ across overloads",
    detect: s => {
      const seen = new Map<string, number>();
      for (const o of s.operators) seen.set(o.name, (seen.get(o.name) ?? 0) + 1);
      return [...seen.values()].some(n => n > 1);
    },
  },

  // --- the relation side --------------------------------------------------

  "partitioned-parent": {
    category: "handled",
    why: "resolveIsPartitioned — an UPDATE through a partitioned parent can MOVE a row, which PostgreSQL performs as DELETE + INSERT and which fires the DESTINATION partition's BEFORE INSERT triggers, so the hook question becomes two-command",
    detect: s => s.tables.some(t => t.relkind === "p"),
  },
  "partition-leaf-carrying-a-trigger": {
    category: "handled",
    why: "writeRewritesTree unions beforeRow over the subtree — the trigger that rewrites a row is the trigger of the relation the row LIVES in (sweep-2's relation-SET lesson)",
    detect: s => s.tables.some(t => t.writeRewrites.beforeRow.length === 0 && t.writeRewritesTree.beforeRow.length > 0),
  },
  "sub-partition": {
    category: "handled",
    why: "the subtree union behind notNullTree, writeRewritesTree, resolveGenerationExprTree and resolveForeignKeyTree is recursive, and the snapshot computes it; a two-level tree is what separates the recursion from its base case",
    detect: (s, env) => s.tables.some(t => t.relkind === "p" && env.childToParent.has(t.name)),
    absent: "No partition is itself partitioned, and no inheritance child has a child. Every tree in the fixture schema is one level deep.",
  },
  "inheritance-parent-with-children": {
    category: "handled",
    why: "hasDescendants gates the NO INHERIT CHECK reading, and the tree variants of notNull, the hooks, the generation expression and the foreign key all diverge from their own-relation forms exactly here",
    detect: s => s.tables.some(t => t.relkind === "r" && t.hasDescendants),
  },
  "inheritance-parent-without-children": {
    category: "handled",
    why: "the control — with no descendants a tree scan returns the named relation's rows only and every tree accessor equals its plain form",
    detect: s => s.tables.some(t => t.relkind === "r" && !t.hasDescendants),
  },
  "not-null-on-the-parent-only": {
    category: "gated",
    why: "notNullTree — `ALTER TABLE ONLY p … SET NOT NULL` is legal (measured), so a child may store the NULL the parent's own flag forbids and a tree scan may rely only on the conjunction",
    detect: s => anyColumn(s, c => c.notNull && !c.notNullTree),
  },
  "check-no-inherit": {
    category: "gated",
    why: "resolveCheckConstraintsTree excludes it — a CHECK … NO INHERIT is never copied to a child (measured, the only CHECK divergence route PostgreSQL permits), so no child row ever satisfied it",
    detect: s => anyConstraint(s, c => c.type === "check" && c.noInherit),
  },
  "generated-stored-column": {
    category: "handled",
    why: "resolveGenerationExpr — the generation expression is walked at the READING site with its refs bound to the read entry, which is how a generated column gets a notNull the catalog flag never carries",
    detect: s => anyColumn(s, c => c.generated === "stored"),
  },
  "generation-diverging-in-the-tree": {
    category: "gated",
    why: "resolveGenerationExprTree returns null — a child may define its OWN generation expression for an inherited column (measured), so a tree scan would otherwise evaluate a formula the row it reads was never computed with",
    detect: s => anyColumn(s, c => c.generationDivergesInTree),
  },
  "generated-virtual-column": {
    category: "handled",
    why: "attgenerated 'v', new in PG18 — ColumnInfo.generated carries it and the generation-expression path treats it the same as STORED",
    detect: s => anyColumn(s, c => c.generated === "virtual"),
    absent: "No GENERATED … VIRTUAL column. The two modes are read through one code path, and only one of them is measured.",
  },
  "identity-column": {
    category: "conservative",
    why: "ColumnInfo.identity is captured and nothing under src/query reads it; an identity column's non-nullness reaches the walk through attnotnull like any other",
    detect: s => anyColumn(s, c => c.identity !== null),
  },
  "identity-always": {
    category: "conservative",
    why: "the 'a' spelling of the same unread field",
    detect: s => anyColumn(s, c => c.identity === "always"),
    absent: "All three identity columns are GENERATED BY DEFAULT, because the fixtures insert explicit ids. attidentity 'a' is unrepresented.",
  },
  view: {
    category: "handled",
    why: "viewAsts — PostgreSQL does not propagate attnotnull to view columns, so reading the catalog flag alone would make every view column nullable; the walk analyses the stored definition instead",
    detect: s => s.views.length > 0,
  },
  "materialized-view": {
    category: "handled",
    why: "the adapter folds matviews in beside views at three sites, so the same definition analysis applies",
    detect: s => s.materializedViews.length > 0,
    absent: "No CREATE MATERIALIZED VIEW. The claim that a matview behaves as a view does is made by the adapter and checked by nothing.",
  },
  "before-row-trigger": {
    category: "handled",
    why: "resolveWriteRewrites — RETURNING reports the row AFTER the rewrite stage, and a BEFORE ROW trigger may replace NEW wholesale, so the walk voids the corresponding reasoning",
    detect: s => s.tables.some(t => t.writeRewrites.beforeRow.length > 0),
  },
  "instead-of-trigger": {
    category: "handled",
    why: "an INSTEAD OF trigger's NEW is reported verbatim and the view's own definition expressions are never evaluated (measured — even a literal view column comes back NULL)",
    detect: s => s.views.some(v => v.writeRewrites.insteadOf.length > 0),
  },
  "do-instead-rule": {
    category: "handled",
    why: "a DO INSTEAD rule replaces the statement outright; rules attach to the named RTE and do not fire through a parent (measured), which is why insteadRules stays the relation's own",
    detect: s => s.tables.some(t => t.writeRewrites.insteadRules.length > 0) || s.views.some(v => v.writeRewrites.insteadRules.length > 0),
  },
  "foreign-table": {
    category: "conservative",
    why: "TableInfo.relkind admits 'f' and no branch distinguishes it; a foreign table's columns are read like any other relation's",
    detect: s => s.tables.some(t => t.relkind === "f"),
    absent: "No foreign-data wrapper in the fixture schema. relkind 'f' is declared in the snapshot's type and never produced.",
  },

  // --- constraints --------------------------------------------------------

  "validated-check": {
    category: "handled",
    why: "resolveCheckConstraints feeds the entailment kernel; these are notFALSE facts, never TRUE facts, because PostgreSQL accepts a row whose CHECK evaluates NULL (measured)",
    detect: s => anyConstraint(s, c => c.type === "check" && c.validated && !/^NOT NULL /.test(c.definition)),
  },
  "not-valid-check": {
    category: "gated",
    why: "excluded at adapter build time — stored rows may violate a NOT VALID constraint, so it is no fact at all",
    detect: s => anyConstraint(s, c => c.type === "check" && !c.validated && /NOT VALID/i.test(c.definition)),
  },
  "not-enforced-check": {
    category: "gated",
    why: "the same convalidated bit covers it: a PG18 NOT ENFORCED constraint is never validated, and ALTER CONSTRAINT … NOT ENFORCED CLEARS the bit on an already-validated one (measured)",
    detect: s => anyConstraint(s, c => c.type === "check" && /NOT ENFORCED/i.test(c.definition)),
  },
  "pg18-not-null-constraint-row": {
    category: "gated",
    why: "PG18 records NOT NULL as contype 'n', which the snapshot's mapConstraintType folds into \"check\"; the adapter filters them by the PARSED node type (CONSTR_NOTNULL) rather than by the rendered definition",
    detect: s => anyConstraint(s, c => c.type === "check" && /^NOT NULL /.test(c.definition)),
  },
  "validated-single-column-foreign-key": {
    category: "handled",
    why: "resolveForeignKey — a join whose ON is an equality on a NOT NULL foreign key always matches, so the referenced side never null-extends (imprecision-closure class B)",
    detect: s => anyConstraint(s, c => c.type === "foreign" && c.validated && !c.deferrable && c.columns.length === 1),
  },
  "not-valid-foreign-key": {
    category: "gated",
    why: "dropped by the adapter — pre-existing rows are unchecked and one survives the ADD CONSTRAINT to be read back through the join",
    detect: s => anyConstraint(s, c => c.type === "foreign" && !c.validated),
  },
  "deferrable-foreign-key": {
    category: "gated",
    why: "dropped — violable mid-transaction and OBSERVABLE there, with INITIALLY IMMEDIATE no protection (SET CONSTRAINTS ALL DEFERRED, measured), so the gate is on condeferrable rather than condeferred",
    detect: s => anyConstraint(s, c => c.type === "foreign" && c.deferrable),
  },
  "foreign-key-on-an-inheritance-parent": {
    category: "gated",
    why: "resolveForeignKeyTree drops it — a parent's FK is NOT copied to a child, so a tree scan reads rows nothing checked (the relation-SET lesson, third instance; partitioning is the opposite and safe)",
    detect: s => anyConstraint(s, (c, t) => c.type === "foreign" && t.hasDescendants),
  },
  "self-referencing-foreign-key": {
    category: "handled",
    why: "the shape a correlated self-lookup reads — the subquery scans what the outer scans, keyed on the same column",
    detect: s => anyConstraint(s, (c, t) => c.type === "foreign" && c.foreignTable === t.name),
  },
  "composite-foreign-key": {
    category: "gated",
    why: "dropped — the entailment reasons about ONE column matching, and a multi-column key under MATCH SIMPLE matches nothing when any part is NULL",
    detect: s => anyConstraint(s, c => c.type === "foreign" && c.columns.length > 1),
    absent: "Every foreign key here is single-column, so the gate that drops composite ones has never had anything to drop.",
  },
  "not-enforced-foreign-key": {
    category: "gated",
    why: "covered by the same convalidated bit as the NOT ENFORCED check, and measured to be so",
    detect: s => anyConstraint(s, c => c.type === "foreign" && /NOT ENFORCED/i.test(c.definition)),
    absent: "The fixture schema's NOT ENFORCED constraint is a CHECK (guest_vip_reason). The claim that convalidated covers the FK route too is measured in docs/imprecision-closure.md and pinned by no fixture.",
  },
  "primary-key": {
    category: "conservative",
    why: "captured and unread — a PK's columns are NOT NULL, which reaches the walk through attnotnull; the key itself licenses nothing the walk asks for",
    detect: s => anyConstraint(s, c => c.type === "primaryKey"),
  },
  "unique-constraint": {
    category: "conservative",
    why: "captured and unread. Recorded because it is the obvious candidate for a future at-most-one-row rule, and because a foreign key's referenced side must carry one",
    detect: s => anyConstraint(s, c => c.type === "unique"),
    absent: "Every referenced side here is a PRIMARY KEY. contype 'u' never reaches the snapshot from this schema.",
  },
  "exclusion-constraint": {
    category: "conservative",
    why: "ConstraintType admits 'exclusion' and nothing reads it",
    detect: s => anyConstraint(s, c => c.type === "exclusion"),
    absent: "No EXCLUDE constraint. A declared ConstraintType member the fixture schema never produces.",
  },

  // --- environment --------------------------------------------------------
  //
  // Properties of the PostgreSQL version rather than of any user schema, so
  // assertion 1 cannot speak for them and assertion 3 does instead. Each
  // replaced a hand-curated table that had been asking a question of a
  // smaller universe than the engine ranged over.

  "env-strict-builtins": {
    category: "environment",
    why: "builtinStrictFunctions — bool_and over proisstrict, the source of truth the strict-expression closures consult for builtin names the user catalog does not carry",
    detect: s => s.builtinStrictFunctions.length > 0,
  },
  "env-set-returning-builtins": {
    category: "environment",
    why: "builtinSetReturningFunctions — the measured replacement for a curated table of 21 names that missed 50 of PG18's SRFs (sweep-3 finding 1)",
    detect: s => s.builtinSetReturningFunctions.length > 0,
  },
  "env-builtin-table-functions": {
    category: "environment",
    why: "builtinTableFunctions — reassembled from proargnames/proallargtypes because a builtin declared with OUT parameters renders `SETOF record`, which pg_get_function_result cannot answer for",
    detect: s => Object.keys(s.builtinTableFunctions).length > 0,
  },
  "env-builtin-function-names": {
    category: "environment",
    why: "builtinFunctionNames — answers 'does PostgreSQL search a builtin of this name before the user's?', which the engine had backwards (sweep-3 finding 6)",
    detect: s => s.builtinFunctionNames.length > 0,
  },
  "env-polymorphic-builtins": {
    category: "environment",
    why: "builtinPolymorphicFunctions — a builtin whose return type is CONCRETE can never yield an array of a user composite, which is the whole difference between one unnest column and the element type's fields",
    detect: s => s.builtinPolymorphicFunctions.length > 0,
  },
};

// ---------------------------------------------------------------------------
// The enumerated catalog columns.
//
// The feature list above is hand-written, which is the disease
// `docs/generated-surface.md` diagnoses in the curated name tables: no test
// asserts what should be *in* one, so a missing entry is invisible until
// somebody writes the query. These columns are the antidote available on this
// axis. Their domains are finite and defined by PostgreSQL, so the values
// reality actually produces can be compared against a declared set, and a
// version that introduces a new one fails assertion 4 the way a new parse-tree
// node type fails the node census.
//
// Observed across the WHOLE live catalog — pg_catalog included — because that
// is the universe the engine's environment captures range over, and because
// several values (relkind 'i', 't') only ever appear there.
// ---------------------------------------------------------------------------

interface EnumValue {
  meaning: string;
  /** No entity in the live catalog carries it; the note says what it needs. */
  absent?: string;
}

interface EnumeratedColumn {
  /** Returns one `v` column: every distinct value the live catalog carries. */
  sql: string;
  values: Record<string, EnumValue>;
}

const ENUMERATED_COLUMNS: Record<string, EnumeratedColumn> = {
  "pg_type.typtype": {
    sql: "SELECT DISTINCT typtype::text AS v FROM pg_type",
    values: {
      b: { meaning: "base type — the ordinary scalar case" },
      c: { meaning: "composite; resolveCompositeType's own predicate, and every relation's row type" },
      d: { meaning: "domain; the NOT NULL carrier and the thing resolveDomainBaseTypeName sees through" },
      e: { meaning: "enum", absent: "see the `enum-type` feature" },
      m: { meaning: "multirange — PG14+; a scalar to the walk, like a range" },
      p: { meaning: "pseudo-type; note that builtinPolymorphicFunctions keys on THIS, which is wider than polymorphic (it admits trigger, void, cstring, record, internal)" },
      r: { meaning: "range; the `range-type-column` feature's type" },
    },
  },
  "pg_class.relkind": {
    sql: "SELECT DISTINCT relkind::text AS v FROM pg_class",
    values: {
      r: { meaning: "ordinary table — TableInfo.relkind 'r'" },
      p: { meaning: "partitioned table — resolveIsPartitioned's whole question" },
      f: { meaning: "foreign table", absent: "see the `foreign-table` feature" },
      v: { meaning: "view — analysed through viewAsts" },
      m: { meaning: "materialized view", absent: "see the `materialized-view` feature" },
      c: { meaning: "composite type's relation row — captured as a compositeType, never as a table" },
      i: { meaning: "index — IndexInfo; the nullability engine reads none of it" },
      I: { meaning: "partitioned index", absent: "no partitioned table here carries an index" },
      S: { meaning: "sequence — SequenceInfo; unread by the walk" },
      t: { meaning: "TOAST table — never captured" },
    },
  },
  "pg_proc.prokind": {
    sql: "SELECT DISTINCT prokind::text AS v FROM pg_proc",
    values: {
      f: { meaning: "plain function — every builtin environment set filters on this" },
      a: { meaning: "aggregate — FunctionInfo.isAggregate, and the INITCOND question" },
      w: { meaning: "window function — FunctionInfo.isWindow" },
      p: { meaning: "procedure", absent: "see the `procedure` feature" },
    },
  },
  "pg_constraint.contype": {
    sql: "SELECT DISTINCT contype::text AS v FROM pg_constraint",
    values: {
      c: { meaning: "check — the entailment kernel's input" },
      f: { meaning: "foreign key — the entailment's input and four gates" },
      n: { meaning: "PG18 NOT NULL constraint row; folded into \"check\" by mapConstraintType and filtered by parsed node type" },
      p: { meaning: "primary key" },
      u: {
        meaning:
          "unique. Observed — but only in pg_catalog's own relations, which is where the two halves of this suite part company: this map asks what the PostgreSQL VERSION produces, and the `unique-constraint` feature asks what the FIXTURE SCHEMA carries. It answers no",
      },
      x: { meaning: "exclusion", absent: "see the `exclusion-constraint` feature" },
      t: { meaning: "constraint trigger", absent: "no CREATE CONSTRAINT TRIGGER; write hooks are read from pg_trigger, not from here" },
    },
  },
  "pg_proc.proargmodes": {
    sql: "SELECT DISTINCT unnest(proargmodes)::text AS v FROM pg_proc WHERE proargmodes IS NOT NULL",
    values: {
      i: { meaning: "IN — ArgMode 'in'" },
      o: { meaning: "OUT — what functionOutputColumns reads" },
      b: { meaning: "INOUT", absent: "see the `inout-parameter` feature" },
      v: { meaning: "VARIADIC — the candidate set resolveFunctionCandidates refuses outright" },
      t: { meaning: "TABLE — RETURNS TABLE(…)'s output columns" },
    },
  },
  "pg_attribute.attgenerated": {
    sql: "SELECT DISTINCT attgenerated::text AS v FROM pg_attribute",
    values: {
      "": { meaning: "not generated — ColumnInfo.generated 'none'" },
      s: { meaning: "STORED — resolveGenerationExpr's subject" },
      v: { meaning: "VIRTUAL (PG18)", absent: "see the `generated-virtual-column` feature" },
    },
  },
  "pg_attribute.attidentity": {
    sql: "SELECT DISTINCT attidentity::text AS v FROM pg_attribute",
    values: {
      "": { meaning: "not an identity column" },
      d: { meaning: "GENERATED BY DEFAULT — captured, unread" },
      a: { meaning: "GENERATED ALWAYS", absent: "see the `identity-always` feature" },
    },
  },
};

const FIXTURES_DIR = join(__dirname, "fixtures");

describe("catalog-feature census", () => {
  let pg: PGlite;
  let snapshot: CatalogSnapshot;
  let env: CensusEnv;
  /** column name → the distinct values the live catalog carries. */
  const observedValues = new Map<string, Set<string>>();

  beforeAll(async () => {
    pg = await PGlite.create();
    await pg.exec(readFileSync(join(FIXTURES_DIR, "schema.sql"), "utf8"));
    snapshot = await snapshotCatalog(pg);

    const inherits = await pg.query<{ child: string; parent: string }>(
      `SELECT c.relname AS child, p.relname AS parent
         FROM pg_inherits i
         JOIN pg_class c ON c.oid = i.inhrelid
         JOIN pg_class p ON p.oid = i.inhparent
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public';`,
    );
    env = { childToParent: new Map(inherits.rows.map(r => [r.child, r.parent])) };

    for (const [column, spec] of Object.entries(ENUMERATED_COLUMNS)) {
      const res = await pg.query<{ v: string }>(spec.sql);
      observedValues.set(column, new Set(res.rows.map(r => r.v)));
    }
  }, 60_000);

  afterAll(async () => {
    // The gap list is this suite's product, not a by-product: every `absent`
    // entry is a catalog feature the walk branches on and the generated corpus
    // cannot reach, which is the specification for the schema axis
    // (docs/generated-surface.md item 4). Printed every run in the style of the
    // WITNESS_REPORT / GENERATED_ALL_STATES knobs, with the reasons behind
    // CATALOG_CENSUS_REPORT=1.
    const entries = Object.entries(FEATURES);
    const gaps = entries.filter(([, f]) => f.absent);
    const byCategory = (c: Category) => entries.filter(([, f]) => f.category === c).length;
    console.log(
      `\ncatalog-feature census: ${entries.length} features — ` +
        `${byCategory("handled")} handled, ${byCategory("gated")} gated, ` +
        `${byCategory("conservative")} conservative, ${byCategory("environment")} environment.\n` +
        `  ${entries.length - gaps.length} carried by the fixture schema, ` +
        `${gaps.length} not reachable from it.`,
    );
    if (process.env.CATALOG_CENSUS_REPORT) {
      console.log(
        `\nfeatures the fixture schema cannot reach (${gaps.length}):\n  ` +
          gaps.map(([k, f]) => `${k} [${f.category}] — ${f.absent}`).join("\n  "),
      );
    }
    if (!pg.closed) await pg.close();
  });

  it("every classified feature is present in the fixture schema", () => {
    const missing = Object.entries(FEATURES)
      .filter(([, f]) => f.category !== "environment" && !f.absent)
      .filter(([, f]) => !f.detect(snapshot, env))
      .map(([k, f]) => `${k} — ${f.why}`)
      .sort();
    expect(
      missing,
      `Classified as carried by the fixture schema, but the snapshot does not ` +
        `have it. Either the DDL was removed — in which case a walk branch just ` +
        `lost its only coverage and the DDL should come back — or the feature ` +
        `is genuinely gone and its entry should be marked \`absent\` with a note ` +
        `saying where the branch is exercised instead:\n  ${missing.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every feature marked `absent` really is absent", () => {
    // The other side of the marker, and the census's actual output: an
    // `absent` entry names a branch the fixture schema cannot reach, which is
    // a line item for the schema axis (docs/generated-surface.md item 4).
    // Adding the DDL is exactly when somebody has to say what now covers it.
    const present = Object.entries(FEATURES)
      .filter(([, f]) => f.absent && f.detect(snapshot, env))
      .map(([k]) => k)
      .sort();
    expect(
      present,
      `Marked \`absent\` but the fixture schema now carries it. Drop the ` +
        `marker, and check that a fixture actually exercises the branch — the ` +
        `DDL existing is not the same as a query reaching it:\n  ${present.join(", ")}`,
    ).toEqual([]);
  });

  it("every `environment` capture is non-empty", () => {
    const empty = Object.entries(FEATURES)
      .filter(([, f]) => f.category === "environment" && !f.detect(snapshot, env))
      .map(([k, f]) => `${k} — ${f.why}`)
      .sort();
    expect(
      empty,
      `An environment set the snapshot captures came back empty. These describe ` +
        `the PostgreSQL version rather than the user schema, so an empty one ` +
        `means the capturing query stopped matching — silently turning a ` +
        `measured answer back into the hand-curated table it replaced:\n  ${empty.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every value an enumerated catalog column takes is classified", () => {
    const unclassified: string[] = [];
    for (const [column, spec] of Object.entries(ENUMERATED_COLUMNS)) {
      for (const v of observedValues.get(column) ?? []) {
        if (!(v in spec.values)) unclassified.push(`${column} = '${v}'`);
      }
    }
    unclassified.sort();
    expect(
      unclassified,
      `Unclassified catalog value(s). PostgreSQL has produced a value this ` +
        `census does not know about — a version bump, or an extension. Classify ` +
        `each with what it means and what the walk does with it; if a walk ` +
        `branch is needed, an entry here is not a substitute for one:\n  ${unclassified.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every classified value is observed, unless marked `absent`", () => {
    // The complement, and the node census's third assertion transposed: a
    // classification for a value reality never produces is an untested claim,
    // and a value that is not a member of the column's domain at all fails
    // here too, since nothing can ever observe it.
    const unobserved: string[] = [];
    for (const [column, spec] of Object.entries(ENUMERATED_COLUMNS)) {
      const observed = observedValues.get(column) ?? new Set<string>();
      for (const [v, meta] of Object.entries(spec.values)) {
        if (meta.absent) {
          if (observed.has(v)) unobserved.push(`${column} = '${v}' is marked absent but IS observed — drop the marker`);
        } else if (!observed.has(v)) {
          unobserved.push(`${column} = '${v}' (${meta.meaning}) is classified but never observed`);
        }
      }
    }
    unobserved.sort();
    expect(
      unobserved,
      `A classified catalog value and reality disagree about whether it ` +
        `exists. Mark it \`absent\` with what it would take, or — if it is not ` +
        `a member of the column's domain at all — delete it:\n  ${unobserved.join("\n  ")}`,
    ).toEqual([]);
  });
});
