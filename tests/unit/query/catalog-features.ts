// ---------------------------------------------------------------------------
// The catalog-feature list — the classification `catalog-census.test.ts`
// asserts and the axis vocabulary `generated/schema-axis.test.ts` generates
// against.
//
// It lives in its own module because `docs/generated-surface.md` makes item 1
// the SPECIFICATION for item 4: "The census list from item 1 is the axis
// vocabulary, which is why item 1 comes first." A schema variant declares the
// features it exists to bring under generation by NAME from this map, so a
// variant claiming a feature nobody classified fails, and a feature the
// census marks `absent` that no variant covers is reportable rather than
// merely absent. Two consumers, one list, no second copy to drift.
//
// The assertions over this map, and the enumerated-catalog-column half that
// catches a feature nobody wrote down, stay in `catalog-census.test.ts`.
// ---------------------------------------------------------------------------

import type { CatalogSnapshot } from "../../../src/catalog/types.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";

export type Category =
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
export interface CensusEnv {
  /** child relation name → parent relation name, from pg_inherits. */
  childToParent: Map<string, string>;
}

export interface Feature {
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
  /**
   * The `NullabilityCatalog` accessor a `handled` or `gated` label rests on:
   * the question the walk asks to reach this fact. The census runs the corpus
   * through a recording catalog and asserts it fired.
   *
   * What that proves and does not: the accessor is BRANCH-level, not
   * feature-level, so a passing entry means the branch that carries the fact
   * is still being asked — not that this particular feature reached it. It
   * fails when a branch is deleted or refactored past, which is the drift a
   * `handled` label suffers; distinguishing two features behind one accessor
   * would need per-feature argument predicates and is not built.
   *
   * An adapter-consumed fact names the accessor whose ANSWER the adapter's
   * narrowing changes — `domain-not-null` is `resolveColumnNotNull`, because
   * that is where a NOT NULL domain stops being invisible.
   */
  reads?: keyof NullabilityCatalog;
  /**
   * The source token that makes a `conservative` label FALSIFIABLE: the
   * snapshot field, or the value test, that nothing under `src/query` may
   * read. The census asserts it does not occur there (comments stripped, so
   * the English word "identity" in prose does not answer for
   * `ColumnInfo.identity`), which fails the moment a branch starts reading
   * the fact and the label stops being true.
   *
   * Without it the label is unfalsifiable in the direction that actually
   * drifts — a fact that BECOMES handled leaves the entry reading as open
   * work, which is how ten node-census entries went stale (2026-08-07).
   *
   * `null` opts out and requires `unreadNote`: a feature whose "nothing
   * reads it" is not about a captured field has no token to look for.
   */
  unread?: string | null;
  /** Why `unread` is null — required when it is. */
  unreadNote?: string;
  /**
   * No QUERY can reach this feature, whatever DDL anyone writes — so it is
   * permanently outside a query corpus's reach rather than pending work.
   *
   * `absent` alone conflates two different things: "nobody wrote the DDL",
   * which a schema variant fixes, and "there is no call site", which nothing
   * fixes. Counting them together makes the remaining-gap number read as more
   * work than exists. Only for the second kind.
   */
  unreachableByQuery?: string;
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

export const FEATURES: Record<string, Feature> = {
  // --- the type side ------------------------------------------------------
  //
  // `docs/generated-surface.md`: vary the TYPE side and the NAME side, the
  // two families that produced sweep-3's five schema-dependent findings.

  "domain-over-scalar": {
    category: "handled",
    reads: "isNotNullDomainByName",
    why: "isNotNullDomain / isNotNullDomainByName — the priority-1 function dispatch rule and NOT NULL cast targets",
    detect: s => s.domains.some(d => {
      const composites = qualified(s.compositeTypes);
      const domains = qualified(s.domains);
      return !d.baseTypeName.endsWith("[]") && !composites.has(d.baseTypeName) && !domains.has(d.baseTypeName);
    }),
  },
  "domain-not-null": {
    category: "handled",
    reads: "resolveColumnNotNull",
    why: "notNullDomainOids in the adapter: a column TYPED by a NOT NULL domain is non-null in every stored row while attnotnull stays false",
    detect: s => s.domains.some(d => d.notNull),
  },
  "domain-nullable": {
    category: "handled",
    reads: "resolveColumnNotNull",
    why: "the control for the above — a domain without NOT NULL must not upgrade its column",
    detect: s => s.domains.some(d => !d.notNull),
  },
  "domain-with-check": {
    category: "conservative",
    unread: "d.checks",
    why: "domain CHECKs are a different mechanism from table CHECKs and the entailment kernel does not read them (resolveCheckConstraints)",
    detect: s => s.domains.some(d => d.checks.length > 0),
  },
  "domain-over-composite": {
    category: "handled",
    reads: "resolveCompositeType",
    why: "resolveCompositeType follows a domain to its base composite — one snapshot predicate (typtype='c') decided what 'is a composite' meant for three callers, and a domain over one was not one anywhere (sweep-3 finding 4)",
    detect: s => {
      const composites = qualified(s.compositeTypes);
      return s.domains.some(d => composites.has(d.baseTypeName));
    },
  },
  "domain-over-array-of-composite": {
    category: "handled",
    reads: "resolveDomainBaseTypeName",
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
    reads: "resolveCompositeType",
    why: "resolveCompositeType follows a domain TRANSITIVELY to its base; one hop is all the fixture schema tests",
    detect: s => {
      const domains = qualified(s.domains);
      return s.domains.some(d => domains.has(d.baseTypeName));
    },
  },
  "composite-type": {
    category: "handled",
    reads: "resolveCompositeType",
    why: "resolveCompositeType — SETOF <composite> expands to the type's fields exactly as a table row type does",
    detect: s => s.compositeTypes.length > 0,
  },
  "composite-column": {
    category: "handled",
    reads: "resolveCompositeType",
    why: "expandCompositeStar — `(p).*` over a composite COLUMN, where the parentheses force the value reading over a range-table alias of the same name (sweep-2 finding 13)",
    detect: s => {
      const composites = qualified(s.compositeTypes);
      return anyColumn(s, c => composites.has(c.typeName));
    },
  },
  "array-of-composite-column": {
    category: "handled",
    reads: "resolveCompositeType",
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
    reads: "resolveDomainBaseTypeName",
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
    reads: "resolveDomainBaseTypeName",
    why: "a column whose declared type is a DOMAIN that renders without brackets while being an array — the spelling resolveDomainBaseTypeName exists for",
    detect: s => {
      const domains = qualified(s.domains);
      return anyColumn(s, c => domains.has(c.typeName) && !c.typeName.endsWith("[]"));
    },
  },
  "array-of-table-row-type-column": {
    category: "handled",
    reads: "resolveCompositeType",
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
    reads: "resolveTable",
    why: "the same two-step relation fallback in its BARE spelling — a column declared with a table's row type rather than an array of it",
    detect: s => {
      const tables = qualified(s.tables);
      return anyColumn(s, c => tables.has(c.typeName));
    },
  },
  "enum-type": {
    category: "conservative",
    unread: "enums",
    why: "enums are captured (CatalogSnapshot.enums) and no branch reads them; an enum column is an ordinary scalar to the walk",
    detect: s => s.enums.length > 0,
  },
  "range-type-column": {
    category: "conservative",
    unread: null,
    unreadNote:
      "not about a captured field: the range type is read like any other scalar, " +
      "and what stays conservative is `lower`/`upper` totality, which the curated " +
      "builtin tables own and curated-tables.test.ts asserts",
    why: "no totality entry: lower/upper have a total (text) form AND an (anyrange) form returning NULL for an EMPTY range, so the name left STRICT_TOTAL_BUILTINS and the range spelling must read nullable (the curated-table audit's rank-1 finding; builtin-range-lower-upper.sql pins it)",
    detect: s => anyColumn(s, c => /range$/.test(c.typeName)),
  },

  // --- the name side ------------------------------------------------------

  "second-schema": {
    category: "handled",
    reads: "resolveTable",
    why: "inPath walks searchPath in order for tables, functions, composites and domains (sweep-2 finding 5 half (a))",
    detect: s => s.schemas.some(x => x.name !== "public" && x.name !== "information_schema" && !x.name.startsWith("pg_")),
  },
  "relation-name-in-two-schemas": {
    category: "handled",
    reads: "resolveTable",
    why: "first-schema-wins for relations, and scope.visible rather than scope.aliases resolving a schema-qualified star when two same-named relations are in scope (post-fix audit (b))",
    detect: s => {
      const seen = new Map<string, number>();
      for (const t of s.tables) seen.set(t.name, (seen.get(t.name) ?? 0) + 1);
      return [...seen.values()].some(n => n > 1);
    },
  },
  "function-overloaded-in-one-schema": {
    category: "handled",
    reads: "resolveFunctionCandidates",
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
    reads: "resolveFunctionShapes",
    why: "unqualified lookups merge candidates ACROSS the path deduped by argTypes — a function is identified by name AND argument types, so first-schema-wins is wrong for it (sweep-3 section A)",
    detect: s => {
      const seen = new Map<string, Set<string>>();
      for (const f of s.functions) {
        if (!seen.has(f.name)) seen.set(f.name, new Set());
        seen.get(f.name)!.add(f.schema);
      }
      return [...seen.values()].some(v => v.size > 1);
    },
  },
  "user-function-named-after-a-builtin": {
    category: "handled",
    reads: "isBuiltinFunction",
    why: "isBuiltinFunction — pg_catalog is searched implicitly and FIRST unless the path names it, so for an identical signature the BUILTIN hides the user function, which is the opposite of what every builtin table documented (sweep-3 finding 6)",
    detect: s => {
      const builtins = new Set(s.builtinFunctionNames);
      return s.functions.some(f => builtins.has(f.name));
    },
  },
  "quoted-identifier-with-space": {
    category: "handled",
    reads: "resolveFunctionShapes",
    why: "columnsForReturnType's identifier-aware split — pg_get_function_result renders names with quote_ident, and splitting each TABLE(…) part at indexOf(' ') split INSIDE the quotes (sweep-3 finding 7, arity-preserving and NAME-only, so nothing but an ordered name comparison sees it)",
    detect: s => anyQuotedIdentifier(s, id => id.includes(" ")),
  },
  "quoted-identifier-for-case": {
    category: "handled",
    reads: "resolveFunctionShapes",
    why: "the same split — a name quoted only for its case kept its quote characters and came back spelled with them",
    detect: s => anyQuotedIdentifier(s, id => /[A-Z]/.test(id)),
  },
  "quoted-identifier-with-comma-or-bracket": {
    category: "handled",
    reads: "resolveFunctionShapes",
    why: "splitTopLevel is identifier-aware too, so a comma or bracket inside quotes is text rather than structure (measured: TABLE(\"a,b\" integer, \"c)d\" text) is a faithful rendering)",
    detect: s => anyQuotedIdentifier(s, id => /[,()]/.test(id)),
  },
  "quoted-identifier-with-embedded-quote": {
    category: "handled",
    reads: "resolveFunctionShapes",
    why: "the doubled-quote escape, which is what makes the scan pair-wise rather than character-wise at both the split and the census's own reader",
    detect: s => s.functions.some(f => quotedIdentifiers(f.returnType).some(id => id.includes('""'))),
  },

  // --- function shapes ----------------------------------------------------

  "setof-table-return": {
    category: "handled",
    reads: "resolveFunctionMetadata",
    why: "columnsForReturnType's SETOF branch — a SETOF <table> return ERASES the table's NOT NULLs (measured), so the body is the only sound source of a guarantee and the walk reads it back (imprecision-closure class A)",
    detect: s => {
      const tables = qualified(s.tables);
      return s.functions.some(f => f.returnType.startsWith("SETOF ") && tables.has(f.returnType.slice(6)));
    },
  },
  "setof-composite-return": {
    category: "handled",
    reads: "resolveCompositeType",
    why: "the same branch resolving through resolveCompositeType rather than the relation",
    detect: s => {
      const composites = qualified(s.compositeTypes);
      return s.functions.some(f => f.returnType.startsWith("SETOF ") && composites.has(f.returnType.slice(6)));
    },
  },
  "setof-domain-return": {
    category: "handled",
    reads: "isNotNullDomainByName",
    why: "the scalar element case — one column, whose NOT NULL domain survives the SETOF where a table's constraints do not",
    detect: s => {
      const domains = qualified(s.domains);
      return s.functions.some(f => f.returnType.startsWith("SETOF ") && domains.has(f.returnType.slice(6)));
    },
  },
  "setof-record-return-from-out-params": {
    category: "handled",
    reads: "resolveFunctionMetadata",
    why: "functionOutputColumns reads proargmodes/proargnames/proallargtypes — a function declared with OUT parameters renders `SETOF record` and contributed ONE column named after the function against PostgreSQL's N (post-fix audit item 3)",
    detect: s => s.functions.some(f => f.returnType === "SETOF record" && f.args.some(a => a.mode === "out")),
  },
  "table-return": {
    category: "handled",
    reads: "resolveFunctionMetadata",
    why: "columnsForReturnType's TABLE(…) branch — the column list is the rendering",
    detect: s => s.functions.some(f => f.returnType.startsWith("TABLE(")),
  },
  "table-return-with-one-composite-column": {
    category: "handled",
    reads: "resolveCompositeType",
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
    reads: "fnBodyAsts",
    why: "a non-set-returning composite return whose body can yield zero rows comes back as ONE all-NULL row (measured), so the scalar path's single-row gate applies (imprecision-closure class A, body-shape-* fixtures)",
    detect: s => {
      const composites = qualified(s.compositeTypes);
      const tables = qualified(s.tables);
      return s.functions.some(f => !f.returnsSet && (composites.has(f.returnType) || tables.has(f.returnType)));
    },
  },
  "scalar-return": {
    category: "handled",
    reads: "fnBodyAsts",
    why: "the ordinary case — priority 5 reads a single-candidate LANGUAGE sql body's column 0",
    detect: s => s.functions.some(f => !f.returnsSet && !f.returnType.startsWith("TABLE(")),
  },
  "out-parameter": {
    category: "handled",
    reads: "resolveFunctionMetadata",
    why: "FunctionArgInfo.mode 'o' — what functionOutputColumns reads instead of the lossy rendering",
    detect: s => s.functions.some(f => f.args.some(a => a.mode === "out")),
  },
  "inout-parameter": {
    category: "handled",
    reads: "resolveFunctionCandidates",
    why: "resolveFunctionCandidates counts 'in' and 'inout' as INPUTS when filtering by arity; an INOUT argument is also an output column",
    detect: s => s.functions.some(f => f.args.some(a => a.mode === "inout")),
  },
  "variadic-parameter": {
    category: "gated",
    reads: "resolveFunctionCandidates",
    why: "resolveFunctionCandidates returns null outright for a variadic candidate — arity filtering is unsound against one, and it once sent a whole FROM item to a single wrongly-named column (measured: vp(VARIADIC text[]) beside vp(integer))",
    detect: s => s.functions.some(f => f.args.some(a => a.mode === "variadic")),
  },
  "argument-with-default": {
    category: "handled",
    reads: "resolveFunctionCandidates",
    why: "resolveFunctionCandidates' arity window is `argCount >= required && argCount <= inputs.length`, where `required` counts arguments WITHOUT a default — a call with fewer arguments than the declaration still resolves",
    detect: s => s.functions.some(f => f.args.some(a => a.hasDefault)),
  },
  "set-returning-user-function": {
    category: "handled",
    reads: "functionReturnsSet",
    why: "functionReturnsSet by consensus over candidates — srfPaddedTargets needs a count of TWO, so one unrecognised SRF turned the padding rule off for the WHOLE target list (sweep-3 findings 1 and 2)",
    detect: s => s.functions.some(f => f.returnsSet),
  },
  "user-aggregate-with-initcond": {
    category: "handled",
    reads: "resolveFunctionMetadata",
    why: "FunctionInfo.aggInitVal — a non-null INITCOND is what makes an aggregate non-null over zero input rows, since with no rows to transition the initial state IS the result",
    detect: s => s.functions.some(f => f.isAggregate && f.aggInitVal !== null),
  },
  "user-aggregate-without-initcond": {
    category: "handled",
    reads: "resolveFunctionMetadata",
    why: "the control for the above: no INITCOND means the zero-row result is NULL and the claim must be dropped",
    detect: s => s.functions.some(f => f.isAggregate && f.aggInitVal === null),
  },
  "user-window-function": {
    category: "conservative",
    unread: "isWindow",
    why: "FunctionInfo.isWindow is captured; the walk's window dispatch is keyed on the curated builtin sets (NEVER_NULL_WINDOW_FNS and siblings), so a USER window function falls through to nullable",
    detect: s => s.functions.some(f => f.isWindow),
  },
  "procedure": {
    category: "conservative",
    unread: "isProcedure",
    why: "FunctionInfo.isProcedure is captured and no branch reads it; a CALL is not a query the walk analyses",
    detect: s => s.functions.some(f => f.isProcedure),
  },
  "security-definer-function": {
    category: "conservative",
    unread: "securityDefiner",
    why: "captured and unread — a body's nullability does not depend on whose privileges run it",
    detect: s => s.functions.some(f => f.securityDefiner),
  },
  "strict-function": {
    category: "handled",
    reads: "resolveFunctionMetadata",
    why: "the strict dispatch — a strict function returns NULL for a NULL argument without the body running, which short-circuits body recursion entirely",
    detect: s => s.functions.some(f => f.strict),
  },
  "language-sql-body": {
    category: "handled",
    reads: "fnBodyAsts",
    why: "fnBodyAsts — the walk recurses into a single-candidate LANGUAGE sql body; the map is keyed by NAME alone, so only a single candidate may be read",
    detect: s => s.functions.some(f => f.language === "sql"),
  },
  "language-plpgsql-body": {
    category: "handled",
    reads: "resolveFunctionMetadata",
    why: "the control: an unanalysable body means priority 1 (a NOT NULL domain return) is the only thing that can still speak",
    detect: s => s.functions.some(f => f.language === "plpgsql"),
  },
  "user-operator-strict": {
    category: "handled",
    reads: "resolveOperatorMetadata",
    why: "resolveOperatorMetadata — a strict backing function plus a TRUE comparison licenses WHERE-side promotion and narrowing exactly like a builtin",
    detect: s => s.operators.some(o => o.strict),
  },
  "user-operator-non-strict": {
    category: "handled",
    reads: "resolveOperatorMetadata",
    why: "the counterexample that pins the boundary — the engine's first measured unsoundness was WHERE promotion trusting an arbitrary operator",
    detect: s => s.operators.some(o => !o.strict),
  },
  "user-operator-overloaded": {
    category: "handled",
    reads: "resolveOperatorMetadata",
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
    reads: "resolveIsPartitioned",
    why: "resolveIsPartitioned — an UPDATE through a partitioned parent can MOVE a row, which PostgreSQL performs as DELETE + INSERT and which fires the DESTINATION partition's BEFORE INSERT triggers, so the hook question becomes two-command. The same accessor gates key entailment on the REFERENCED side: a partitioned parent holds none of its own rows, so ONLY that parent is an empty slice and a key promising a match in the tree is silent about it (sweep-4 finding 4)",
    detect: s => s.tables.some(t => t.relkind === "p"),
  },
  "partition-leaf-carrying-a-trigger": {
    category: "handled",
    reads: "resolveWriteRewritesTree",
    why: "writeRewritesTree unions beforeRow over the subtree — the trigger that rewrites a row is the trigger of the relation the row LIVES in (sweep-2's relation-SET lesson)",
    detect: s => s.tables.some(t => t.writeRewrites.beforeRow.length === 0 && t.writeRewritesTree.beforeRow.length > 0),
  },
  "sub-partition": {
    category: "handled",
    reads: "resolveGenerationExprTree",
    why: "the subtree union behind notNullTree, writeRewritesTree, resolveGenerationExprTree and resolveForeignKeyTree is recursive, and the snapshot computes it; a two-level tree is what separates the recursion from its base case",
    detect: (s, env) => s.tables.some(t => t.relkind === "p" && env.childToParent.has(t.name)),
  },
  "inheritance-parent-with-children": {
    category: "handled",
    reads: "resolveColumnNotNullTree",
    why: "hasDescendants gates the NO INHERIT CHECK reading, and the tree variants of notNull, the hooks, the generation expression and the foreign key all diverge from their own-relation forms exactly here",
    detect: s => s.tables.some(t => t.relkind === "r" && t.hasDescendants),
  },
  "inheritance-parent-without-children": {
    category: "handled",
    reads: "resolveColumnNotNullTree",
    why: "the control — with no descendants a tree scan returns the named relation's rows only and every tree accessor equals its plain form",
    detect: s => s.tables.some(t => t.relkind === "r" && !t.hasDescendants),
  },
  "not-null-on-the-parent-only": {
    category: "gated",
    reads: "resolveColumnNotNullTree",
    why: "notNullTree — `ALTER TABLE ONLY p … SET NOT NULL` is legal (measured), so a child may store the NULL the parent's own flag forbids and a tree scan may rely only on the conjunction",
    detect: s => anyColumn(s, c => c.notNull && !c.notNullTree),
  },
  "check-no-inherit": {
    category: "gated",
    reads: "resolveCheckConstraintsTree",
    why: "resolveCheckConstraintsTree excludes it — a CHECK … NO INHERIT is never copied to a child (measured, the only CHECK divergence route PostgreSQL permits), so no child row ever satisfied it",
    detect: s => anyConstraint(s, c => c.type === "check" && c.noInherit),
  },
  "generated-stored-column": {
    category: "handled",
    reads: "resolveGenerationExpr",
    why: "resolveGenerationExpr — the generation expression is walked at the READING site with its refs bound to the read entry, which is how a generated column gets a notNull the catalog flag never carries",
    detect: s => anyColumn(s, c => c.generated === "stored"),
  },
  "generation-diverging-in-the-tree": {
    category: "gated",
    reads: "resolveGenerationExprTree",
    why: "resolveGenerationExprTree returns null — a child may define its OWN generation expression for an inherited column (measured), so a tree scan would otherwise evaluate a formula the row it reads was never computed with",
    detect: s => anyColumn(s, c => c.generationDivergesInTree),
  },
  "generated-virtual-column": {
    category: "handled",
    reads: "resolveGenerationExpr",
    why: "attgenerated 'v', new in PG18 — ColumnInfo.generated carries it and the generation-expression path treats it the same as STORED",
    detect: s => anyColumn(s, c => c.generated === "virtual"),
  },
  "identity-column": {
    category: "conservative",
    unread: "identity",
    why: "ColumnInfo.identity is captured and nothing under src/query reads it; an identity column's non-nullness reaches the walk through attnotnull like any other",
    detect: s => anyColumn(s, c => c.identity !== null),
  },
  "identity-always": {
    category: "conservative",
    unread: "identity",
    why: "the 'a' spelling of the same unread field",
    detect: s => anyColumn(s, c => c.identity === "always"),
  },
  view: {
    category: "handled",
    reads: "viewAsts",
    why: "viewAsts — PostgreSQL does not propagate attnotnull to view columns, so reading the catalog flag alone would make every view column nullable; the walk analyses the stored definition instead",
    detect: s => s.views.length > 0,
  },
  "materialized-view": {
    category: "handled",
    reads: "viewAsts",
    why: "the adapter folds matviews in beside views at three sites, so the same definition analysis applies",
    detect: s => s.materializedViews.length > 0,
  },
  "before-row-trigger": {
    category: "handled",
    reads: "resolveWriteRewrites",
    why: "resolveWriteRewrites — RETURNING reports the row AFTER the rewrite stage, and a BEFORE ROW trigger may replace NEW wholesale, so the walk voids the corresponding reasoning",
    detect: s => s.tables.some(t => t.writeRewrites.beforeRow.length > 0),
  },
  "instead-of-trigger": {
    category: "handled",
    reads: "resolveWriteRewrites",
    why: "an INSTEAD OF trigger's NEW is reported verbatim and the view's own definition expressions are never evaluated (measured — even a literal view column comes back NULL)",
    detect: s => s.views.some(v => v.writeRewrites.insteadOf.length > 0),
  },
  "do-instead-rule": {
    category: "handled",
    reads: "resolveWriteRewrites",
    why: "a DO INSTEAD rule replaces the statement outright; rules attach to the named RTE and do not fire through a parent (measured), which is why insteadRules stays the relation's own",
    detect: s => s.tables.some(t => t.writeRewrites.insteadRules.length > 0) || s.views.some(v => v.writeRewrites.insteadRules.length > 0),
  },
  "foreign-table": {
    category: "conservative",
    unread: 'relkind === "f"',
    why: "TableInfo.relkind admits 'f' and no branch distinguishes it; a foreign table's columns are read like any other relation's",
    detect: s => s.tables.some(t => t.relkind === "f"),
    absent: "IMPOSSIBLE here rather than unwritten — the marker every other feature shed on 2026-08-08 is the last one left, and it is the only one no DDL can lift. relkind 'f' needs a foreign-data wrapper and PGlite ships none (re-measured 2026-08-08: CREATE EXTENSION file_fdw and postgres_fdw both answer \"is not available\").",
    unreachableByQuery:
      "PGlite ships no FDW — `postgres_fdw` and `file_fdw` are both absent from pg_available_extensions (measured) — so relkind 'f' cannot be produced in this harness at all.",
  },

  // --- constraints --------------------------------------------------------

  "validated-check": {
    category: "handled",
    reads: "resolveCheckConstraints",
    why: "resolveCheckConstraints feeds the entailment kernel; these are notFALSE facts, never TRUE facts, because PostgreSQL accepts a row whose CHECK evaluates NULL (measured)",
    detect: s => anyConstraint(s, c => c.type === "check" && c.validated && !/^NOT NULL /.test(c.definition)),
  },
  "not-valid-check": {
    category: "gated",
    reads: "resolveCheckConstraints",
    why: "excluded at adapter build time — stored rows may violate a NOT VALID constraint, so it is no fact at all",
    detect: s => anyConstraint(s, c => c.type === "check" && !c.validated && /NOT VALID/i.test(c.definition)),
  },
  "not-enforced-check": {
    category: "gated",
    reads: "resolveCheckConstraints",
    why: "the same convalidated bit covers it: a PG18 NOT ENFORCED constraint is never validated, and ALTER CONSTRAINT … NOT ENFORCED CLEARS the bit on an already-validated one (measured)",
    detect: s => anyConstraint(s, c => c.type === "check" && /NOT ENFORCED/i.test(c.definition)),
  },
  "pg18-not-null-constraint-row": {
    category: "gated",
    reads: "resolveCheckConstraints",
    why: "PG18 records NOT NULL as contype 'n', which the snapshot's mapConstraintType folds into \"check\"; the adapter filters them by the PARSED node type (CONSTR_NOTNULL) rather than by the rendered definition",
    detect: s => anyConstraint(s, c => c.type === "check" && /^NOT NULL /.test(c.definition)),
  },
  "validated-single-column-foreign-key": {
    category: "handled",
    reads: "resolveForeignKey",
    why: "resolveForeignKey — a join whose ON is an equality on a NOT NULL foreign key always matches, so the referenced side never null-extends (imprecision-closure class B)",
    detect: s => anyConstraint(s, c => c.type === "foreign" && c.validated && !c.deferrable && c.columns.length === 1),
  },
  "not-valid-foreign-key": {
    category: "gated",
    reads: "resolveForeignKey",
    why: "dropped by the adapter — pre-existing rows are unchecked and one survives the ADD CONSTRAINT to be read back through the join",
    detect: s => anyConstraint(s, c => c.type === "foreign" && !c.validated),
  },
  "deferrable-foreign-key": {
    category: "gated",
    reads: "resolveForeignKey",
    why: "dropped — violable mid-transaction and OBSERVABLE there, with INITIALLY IMMEDIATE no protection (SET CONSTRAINTS ALL DEFERRED, measured), so the gate is on condeferrable rather than condeferred",
    detect: s => anyConstraint(s, c => c.type === "foreign" && c.deferrable),
  },
  "foreign-key-on-an-inheritance-parent": {
    category: "gated",
    reads: "resolveForeignKeyTree",
    why: "resolveForeignKeyTree drops it — a parent's FK is NOT copied to a child, so a tree scan reads rows nothing checked (the relation-SET lesson, third instance; partitioning is the opposite and safe)",
    detect: s => anyConstraint(s, (c, t) => c.type === "foreign" && t.hasDescendants),
  },
  "foreign-key-cloned-onto-a-partition": {
    category: "gated",
    reads: "resolveForeignKey",
    why: "dropped by the adapter — a key REFERENCING a partitioned table is recorded once per partition on top of the declared constraint (conparentid names the parent), and no clone means \"every referencing row matches THIS partition\". Reading one as declared both invented a claim and destroyed the real one, since the map keyed on schema.table.column kept whichever came last (sweep-4 finding 4)",
    detect: s => anyConstraint(s, c => c.type === "foreign" && c.inheritedClone),
  },
  "self-referencing-foreign-key": {
    category: "handled",
    reads: "resolveForeignKey",
    why: "the shape a correlated self-lookup reads — the subquery scans what the outer scans, keyed on the same column",
    detect: s => anyConstraint(s, (c, t) => c.type === "foreign" && c.foreignTable === t.name),
  },
  "composite-foreign-key": {
    category: "gated",
    reads: "resolveForeignKey",
    why: "dropped — the entailment reasons about ONE column matching, and a multi-column key under MATCH SIMPLE matches nothing when any part is NULL",
    detect: s => anyConstraint(s, c => c.type === "foreign" && c.columns.length > 1),
  },
  "not-enforced-foreign-key": {
    category: "gated",
    reads: "resolveForeignKey",
    why: "covered by the same convalidated bit as the NOT ENFORCED check, and measured to be so",
    detect: s => anyConstraint(s, c => c.type === "foreign" && /NOT ENFORCED/i.test(c.definition)),
  },
  "primary-key": {
    category: "conservative",
    unread: '"primaryKey"',
    why: "captured and unread — a PK's columns are NOT NULL, which reaches the walk through attnotnull; the key itself licenses nothing the walk asks for",
    detect: s => anyConstraint(s, c => c.type === "primaryKey"),
  },
  "unique-constraint": {
    category: "conservative",
    unread: '"unique"',
    why: "captured and unread. Recorded because it is the obvious candidate for a future at-most-one-row rule, and because a foreign key's referenced side must carry one",
    detect: s => anyConstraint(s, c => c.type === "unique"),
  },
  "exclusion-constraint": {
    category: "conservative",
    unread: '"exclusion"',
    why: "ConstraintType admits 'exclusion' and nothing reads it",
    detect: s => anyConstraint(s, c => c.type === "exclusion"),
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
