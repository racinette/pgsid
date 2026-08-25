import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import type { CatalogSnapshot } from "../../../src/catalog/types.js";
import {
  inferNullabilityTraced,
  inferQueryContract,
  type QueryContract,
} from "../../../src/query/nullability-walk.js";
import type { OutputNullabilityTraced, TraceNode } from "../../../src/query/types.js";
import {
  PARTIAL_OVERLOADS,
  NON_STRICT_OVERLOADS,
  NON_TOTAL_OPERATOR_SIGNATURES,
  TOTAL_OPERATORS,
  STRICT_OPERATORS,
} from "../../../src/query/operators.js";
import { recordCatalog, type RecordedCall } from "./fallback-spy.js";
import { catalogCache, type CatalogFor } from "./fixture-catalog.js";
import { parseFixtureDirectives } from "./fixture-args.js";
import { GRAMMAR_SAMPLER } from "./grammar-sampler.js";

// ---------------------------------------------------------------------------
// Fallback census.
//
// The walk's third census, on the axis the first two cannot see. The node
// census asks which PARSE-TREE SHAPES have been considered; the catalog census
// asks which CATALOG FEATURES the corpus carries. Neither asks which of the
// walk's FALLBACK branches — the sites that conclude something from a NAME or
// an overload CONSENSUS because richer information (operand types, resolved
// metadata) was unreadable — the corpus actually reaches THROUGH the
// information-missing path.
//
// That is where both NAME-LEVEL unsoundnesses lived: the name-level total
// claim for `+` and the
// name-level strict claim for `||` each fired exactly where operand types were
// unreadable, which is exactly where the recorded hole (`+(path,path)`, the
// array `||`) could not be eliminated — and the corpus could not have caught
// either, because its schema vocabulary was shaped by the same assumption that
// created the hole ("no application schema has a path column", so the corpus
// had none). A fallback with no input arriving through the unreadable path is
// coverage that reads as tested and is not.
//
// What counts as an inventory entry: a branch where a TYPED / RESOLVED channel
// exists and DECLINED — `resolveOperatorTotality` answering `unknown`,
// `resolveOperatorStrictness` answering `null`, `resolveFunctionMetadata`
// answering `null` with the consensus or the curated name tables answering in
// its place. Curated tables with NO richer channel above them (the builtin SRF
// shapes, `NON_NULL_BUILTIN_TABLE_COLUMNS`, `EXTRACT_TOTAL_FIELDS`, the
// aggregate name sets consulted for names the user catalog can never carry)
// are a different instrument's subject — `totality-probe.test.ts`,
// `curated-tables.test.ts` and `builtin-surface.test.ts` hold those against
// PostgreSQL from both sides, and `catalog-census` / `capability-reach` hold
// their accessors warm. The EXCLUDED table at the bottom records each such
// boundary call so the next reader sees it was considered, not missed.
//
// Instrumentation is test-side only, two channels, no engine hook:
//
//   - the TRACE. The traced walk already stamps every fallback conclusion
//     with facts that distinguish it from the typed path — `totalOperator:
//     "true"` (name-level) vs `"true (signature-narrowed)"`, `priority: "6b
//     (built-in, always non-null)"` vs the same with `, signature-narrowed`.
//   - the RECORDING SPY (`fallback-spy.ts`). Untraced sites
//     (`promotionOperatorIsStrict`, `exprStrictlyForces`, param-nullability's
//     `forcedNullBy`) are reached exactly when a typed accessor RETURNS its
//     no-answer value, and catalog-spy's own argument applies one level down:
//     the catalog is a pure data interface, so the declining answer is
//     observable by wrapping it.
//
// Where two sites share one signal shape (`exprStrictlyForces` and
// `forcedNullBy` ask the same three accessors in the same order), the corpus
// sweep attributes conservatively (contract-run-only ⟹ collector-side) and
// the per-entry WITNESS carries the precision: its check asserts the OUTCOME
// only the named site can produce — a promoted output column, a notNull
// parameter — beside the signal.
//
// Both directions, like the sibling censuses:
//   - an inventory entry no corpus input reaches fails (the entry names what
//     it is waiting for, or gets a fixture);
//   - a witness whose entry no longer exists fails (a fallback that was
//     REMOVED takes its census rows with it, so the census cannot rot);
//   - the per-key entries are GENERATED from `PARTIAL_OVERLOADS` /
//     `NON_STRICT_OVERLOADS`, so a row added to either table fails here until
//     a corpus input reaches the new hole through the unreadable path — the
//     exact regression class of 2026-08-24;
//   - the fixture schema's falsifying VOCABULARY is derived from the tables
//     (a column per partial-overload operand type, a NULLABLE column per
//     non-strict overload's absorbing type), so the corpus can always EXPRESS
//     the falsifying input for every recorded hole.
//
// Report: FALLBACK_CENSUS_REPORT=1 prints every entry with the fixtures that
// reach it.
// ---------------------------------------------------------------------------

interface Obs {
  file: string;
  /** `${name}\u0000${value}` for every trace fact in every column's tree. */
  facts: Set<string>;
  factList: { name: string; value: string }[];
  /** Calls recorded under `inferNullabilityTraced`. */
  walkCalls: RecordedCall[];
  /** Calls recorded under `inferQueryContract` (a separate recorder). */
  contractCalls: RecordedCall[];
  columns: OutputNullabilityTraced[];
  contract: QueryContract | null;
  /** The statement's root is a DML node — mechanism C's only habitat. */
  isDml: boolean;
}

const factKey = (name: string, value: string): string => `${name}\u0000${value}`;
const hasFact = (o: Obs, name: string, value: string): boolean =>
  o.facts.has(factKey(name, value));
const hasFactWhere = (
  o: Obs,
  name: string,
  pred: (value: string) => boolean,
): boolean => o.factList.some(f => f.name === name && pred(f.value));

/** `resolveOperatorStrictness` answered null — its ONLY call site is
 *  `promotionOperatorIsStrict`, so the event IS the fallback being entered. */
const strictnessDeclined = (calls: RecordedCall[], op: (name: string) => boolean): boolean =>
  calls.some(
    c => c.member === "resolveOperatorStrictness" && c.result === null && op(String(c.args[1])),
  );

/** `resolveOperatorStrictnessSome` answered null — its ONLY call site is
 *  param-nullability's `forcedNullBy`. */
const strictnessSomeDeclined = (calls: RecordedCall[], op: (name: string) => boolean): boolean =>
  calls.some(
    c =>
      c.member === "resolveOperatorStrictnessSome" &&
      c.result === null &&
      op(String(c.args[1])),
  );

const metadataDeclined = (calls: RecordedCall[], name: string): boolean =>
  calls.some(
    c => c.member === "resolveFunctionMetadata" && c.result === null && c.args[1] === name,
  );

const askedSetReturning = (calls: RecordedCall[], name: string): boolean =>
  calls.some(c => c.member === "isSetReturningBuiltin" && c.args[0] === name);

/** Names the traced walk DISPATCHED as a FuncCall (the `name` fact at the top
 *  of `resolveFuncCallTraced`) — the discriminator between the dispatch's own
 *  consensus and the promotion channel asking about a name the target list
 *  never walks. */
const dispatchedNames = (o: Obs): Set<string> => {
  const names = new Set<string>();
  for (const f of o.factList) {
    if (f.name !== "name") continue;
    names.add(f.value);
    const dot = f.value.lastIndexOf(".");
    if (dot >= 0) names.add(f.value.slice(dot + 1));
  }
  return names;
};

const paramNotNull = (o: Obs, n: number): boolean =>
  o.contract?.params.some(p => p.number === n && p.notNull) ?? false;
const columnNotNull = (o: Obs, name: string): boolean =>
  o.columns.some(c => c.name === name && c.notNull);

interface FallbackEntry {
  /** Where the branch lives — file and function, the stable reference. */
  site: string;
  /** What "the richer information was unreadable" means at this site. */
  trigger: string;
  /**
   * `claims` — the fallback can move a verdict in the unsound-if-wrong
   * direction (notNull, a promotion, a parameter rejection). `refuses` — it
   * can only under-claim, which is the safe direction; it is censused so its
   * reach is measured, not because it can be wrong the expensive way.
   */
  direction: "claims" | "refuses";
  detect(o: Obs): boolean;
}

// --- the inventory ----------------------------------------------------------

const INVENTORY: Record<string, FallbackEntry> = {
  // Per-key entries GENERATED from the escape tables, so a new recorded hole
  // demands a reaching input before the suite goes green again.
  ...Object.fromEntries(
    Object.keys(PARTIAL_OVERLOADS).map(op => [
      `aexpr-totality:partial-overload:${op}`,
      {
        site: "nullability-walk.ts walkA_ExprTraced — the PARTIAL_OVERLOADS refusal",
        trigger:
          `resolveOperatorTotality answered unknown for bare '${op}' (both operand ` +
          `type sets unreadable), and the name carries a recorded non-total row`,
        direction: "refuses",
        detect: (o: Obs) =>
          hasFactWhere(o, "partialOverload", v => v === PARTIAL_OVERLOADS[op]),
      } satisfies FallbackEntry,
    ]),
  ),
  ...Object.fromEntries(
    Object.keys(NON_STRICT_OVERLOADS).map(op => [
      `promotion-strictness:non-strict-overload:${op}`,
      {
        site: "nullability-walk.ts promotionOperatorIsStrict — the NON_STRICT_OVERLOADS refusal",
        trigger:
          `resolveOperatorStrictness answered null for bare '${op}' (no candidate ` +
          `narrowed), and the name carries a recorded non-strict row`,
        direction: "refuses",
        detect: (o: Obs) =>
          strictnessDeclined([...o.walkCalls, ...o.contractCalls], n => n === op),
      } satisfies FallbackEntry,
    ]),
  ),

  "aexpr-totality:name-claim": {
    site: "nullability-walk.ts walkA_ExprTraced — TOTAL_OPERATORS by bare name",
    trigger:
      "resolveOperatorTotality (or the unary form) answered unknown — operand types " +
      "unreadable — and the bare name is on the curated total list with no recorded hole",
    direction: "claims",
    detect: o => hasFact(o, "totalOperator", "true"),
  },
  "aexpr-totality:name-refusal": {
    site: "nullability-walk.ts walkA_ExprTraced — the unclaimed-name conclusion",
    trigger:
      "the narrowing answered unknown, the name is not on TOTAL_OPERATORS (or is " +
      "schema-qualified), and no backing function resolved",
    direction: "refuses",
    detect: o => hasFact(o, "totalOperator", "false"),
  },
  "aexpr-totality:custom-operator-dispatch": {
    site: "nullability-walk.ts walkA_ExprTraced — resolveOperatorMetadata at the name fallback",
    trigger:
      "the narrowing answered unknown and a user operator's backing function is " +
      "dispatched through the FuncCall rules instead — a body analysis can then CLAIM",
    direction: "claims",
    detect: o =>
      hasFactWhere(o, "customOperator", v => !v.endsWith("(type-narrowed)")),
  },

  "promotion-strictness:name-claim": {
    site: "nullability-walk.ts promotionOperatorIsStrict — STRICT_OPERATORS by bare name",
    trigger:
      "resolveOperatorStrictness answered null (operand types unreadable, no " +
      "candidates) and the bare name is on the curated strict list — the promotion " +
      "this licenses moves a column to notNull",
    direction: "claims",
    detect: o =>
      strictnessDeclined(
        [...o.walkCalls, ...o.contractCalls],
        n => STRICT_OPERATORS.has(n) && NON_STRICT_OVERLOADS[n] === undefined,
      ),
  },
  "promotion-strictness:operator-metadata": {
    site: "nullability-walk.ts promotionOperatorIsStrict — the user-operator tail",
    trigger:
      "resolveOperatorStrictness answered null and the name is not curated, so the " +
      "single-candidate metadata's declared strict flag decides",
    direction: "claims",
    detect: o =>
      strictnessDeclined(
        [...o.walkCalls, ...o.contractCalls],
        n => !STRICT_OPERATORS.has(n) && NON_STRICT_OVERLOADS[n] === undefined,
      ),
  },

  "funccall:domain-by-consensus": {
    site: "nullability-walk.ts resolveFuncCallTraced — NOT NULL domain return by consensus",
    trigger:
      "resolveFunctionMetadata and resolveUserFunctionTyped both declined (an " +
      "overloaded name over unreadable operand types), and every arity-compatible " +
      "candidate returns a NOT NULL domain",
    direction: "claims",
    detect: o => hasFact(o, "priority", "1 (NOT NULL domain return, by consensus)"),
  },
  "funccall:strict-by-consensus": {
    site: "nullability-walk.ts resolveFuncCallTraced — priority 4 by consensus",
    trigger:
      "metadata unresolvable, every arity-compatible candidate strict, and an " +
      "argument nullable — concludes nullable outright",
    direction: "refuses",
    detect: o => hasFact(o, "priority", "4 (strict, by consensus)"),
  },
  "funccall:aggregate-by-name": {
    site: "nullability-walk.ts resolveFuncCallTraced — isAggregateBuiltin dispatch",
    trigger:
      "no catalog metadata for the name (every pg_catalog aggregate), so the " +
      "aggregate rules run keyed on the curated name sets",
    direction: "claims",
    detect: o => hasFact(o, "priority", "3 (aggregate by name, not in catalog)"),
  },

  "funccall:builtin-name-always": {
    site: "nullability-walk.ts resolveFuncCallTraced — ALWAYS_NOT_NULL_BUILTINS by name",
    trigger:
      "resolveBuiltinScalarTotality answered unknown (the name is outside the " +
      "signature capture, the arity eliminated every row, or named notation broke " +
      "the lineup) and the bare name claims unconditionally",
    direction: "claims",
    detect: o => hasFact(o, "priority", "6b (built-in, always non-null)"),
  },
  "funccall:builtin-name-first-arg": {
    site: "nullability-walk.ts resolveFuncCallTraced — FIRST_ARG_BUILTINS by name",
    trigger: "same decline as builtin-name-always; the first argument then decides",
    direction: "claims",
    detect: o => hasFact(o, "priority", "6b (built-in, first arg decides)"),
  },
  "funccall:builtin-name-strict-total": {
    site: "nullability-walk.ts resolveFuncCallTraced — STRICT_TOTAL_BUILTINS by name",
    trigger: "same decline; non-null arguments then claim a non-null result",
    direction: "claims",
    detect: o => hasFact(o, "priority", "6b (built-in, total over non-null args)"),
  },
  "funccall:variadic-literal-array": {
    site: "nullability-walk.ts resolveFuncCallTraced — the VARIADIC literal-array claim",
    trigger:
      "a VARIADIC array call defeats the typed dispatch structurally (the variadic " +
      "parameter arrives as ONE array), and a literal ARRAY[...] plus the " +
      "ALWAYS/FIRST_ARG name tables still claim",
    direction: "claims",
    detect: o => hasFact(o, "priority", "6b (built-in, VARIADIC literal array)"),
  },
  "funccall:variadic-array-refusal": {
    site: "nullability-walk.ts resolveFuncCallTraced — the VARIADIC array refusal",
    trigger:
      "a VARIADIC call whose array is not a literal constructor, or whose name has " +
      "no unconditional table row — a NULL array yields NULL, so it refuses",
    direction: "refuses",
    detect: o => hasFact(o, "priority", "6b (built-in, VARIADIC array call)"),
  },

  "window:curated-aggregate-frame": {
    site: "nullability-walk.ts resolveFuncCallTraced — NON_NULL_OVER_NONEMPTY_AGGREGATES over a current-row frame",
    trigger:
      "resolveBuiltinWindowTotality holds kind='w' rows only, so an AGGREGATE over a " +
      "window falls past it to the curated aggregate name set plus the frame check",
    direction: "claims",
    detect: o => hasFact(o, "priority", "2b (aggregate over the default frame)"),
  },

  "strictly-forces:builtin-name": {
    site: "nullability-walk.ts exprStrictlyForces — isStrictBuiltin after metadata declined",
    trigger:
      "the WHERE-promotion strict closure meets a function call whose metadata is " +
      "unresolvable and whose name has no user candidates; the measured pg_catalog " +
      "strictness capture answers by name. Signal shared with forcedNullBy — the " +
      "witness pins the site through its outcome (a promoted output column)",
    direction: "claims",
    detect: o =>
      o.walkCalls.some(
        c =>
          c.member === "isStrictBuiltin" &&
          !askedSetReturning(o.walkCalls, String(c.args[0])) &&
          metadataDeclined(o.walkCalls, String(c.args[0])),
      ),
  },
  "strictly-forces:consensus": {
    site: "nullability-walk.ts exprStrictlyForces — overload consensus after metadata declined",
    trigger:
      "same decline, with user candidates present: every arity-compatible candidate " +
      "strict lets the closure conclude. Discriminated from the dispatch's own " +
      "consensus by the name never being DISPATCHED (no `name` trace fact)",
    direction: "claims",
    detect: o => {
      const dispatched = dispatchedNames(o);
      return o.walkCalls.some(
        c =>
          c.member === "resolveFunctionCandidates" &&
          Array.isArray(c.result) &&
          c.result.length > 0 &&
          !dispatched.has(String(c.args[1])) &&
          metadataDeclined(o.walkCalls, String(c.args[1])),
      );
    },
  },

  "forced-null-by:strict-operator-name": {
    site: "param-nullability.ts forcedNullBy — STRICT_OPERATORS by bare name",
    trigger:
      "resolveOperatorStrictnessSome answered null (its only call site) and the " +
      "bare name is on the curated strict list — the attribution this licenses can " +
      "mark a parameter notNull. Includes the recorded `||` over-report, kept " +
      "because under-reporting strictness admits a binding PostgreSQL rejects " +
      "(operators.ts, the measured direction argument)",
    direction: "claims",
    detect: o =>
      strictnessSomeDeclined(
        [...o.walkCalls, ...o.contractCalls],
        n => STRICT_OPERATORS.has(n),
      ),
  },
  "forced-null-by:function-consensus": {
    site: "param-nullability.ts forcedNullBy — overload consensus after metadata declined",
    trigger:
      "an overloaded user function at a rejecting site: metadata unresolvable, " +
      "every arity-compatible candidate strict. The walk asks the same accessors " +
      "on the same statement (measured — its written-value analysis walks the " +
      "VALUES row too), so the attribution is the OUTCOME only the collector " +
      "produces: a notNull parameter on a DML statement, where the rejecting " +
      "sites mechanism C reads live",
    direction: "claims",
    detect: o =>
      o.isDml &&
      (o.contract?.params.some(p => p.notNull) ?? false) &&
      o.contractCalls.some(
        c =>
          c.member === "resolveFunctionCandidates" &&
          Array.isArray(c.result) &&
          c.result.length > 0 &&
          metadataDeclined(o.contractCalls, String(c.args[1])),
      ),
  },
  "forced-null-by:builtin-name": {
    site: "param-nullability.ts forcedNullBy — isStrictBuiltin after metadata declined",
    trigger:
      "a builtin-named call at a rejecting site with no user candidates; the " +
      "measured strictness capture answers by name and the parameter inside is " +
      "marked rejected. Attribution as for the consensus twin: a notNull " +
      "parameter on a DML statement beside the signal",
    direction: "claims",
    detect: o =>
      o.isDml &&
      (o.contract?.params.some(p => p.notNull) ?? false) &&
      o.contractCalls.some(
        c =>
          c.member === "isStrictBuiltin" &&
          metadataDeclined(o.contractCalls, String(c.args[0])),
      ),
  },
};

// --- witnesses ---------------------------------------------------------------
//
// Pinned by NAME, never by count. Each entry lists the corpus inputs that
// reach it through the information-missing path; `check` sharpens the generic
// detector with the OUTCOME only the named site can produce, where the signal
// alone is shared between sites. Deleting a witness fixture, or breaking the
// branch it reaches, fails here naming the entry.
interface Witness {
  file: string;
  check?: (o: Obs) => boolean;
}

const WITNESSES: Record<string, Witness[]> = {
  "aexpr-totality:partial-overload:+": [
    // The exemplar: `opaque_sum` is the surviving witness for the refusal —
    // the fixture's own header records how the set-operation spelling retired
    // and the window spelling took over.
    { file: "name-level-partial-overload.sql" },
  ],
  "promotion-strictness:non-strict-overload:||": [
    { file: "non-strict-overload-promotion.sql" },
  ],
  "aexpr-totality:name-claim": [
    // `$1 = $2`-shaped operands: a ParamRef types as nothing, so the narrowing
    // declines and the curated name answers.
    { file: "param-multi-use.sql" },
  ],
  "aexpr-totality:name-refusal": [{ file: "computed-cast-closure.sql" }],
  "aexpr-totality:custom-operator-dispatch": [
    {
      file: "fallback-custom-operator-opaque.sql",
      // The claiming direction: lenient_eq's body analysis proves the column,
      // which only the dispatch can have reached.
      check: o => columnNotNull(o, "lenient") && !columnNotNull(o, "strict_cmp"),
    },
  ],
  "promotion-strictness:name-claim": [
    // The register's own named case for the fallback rule being kept: a
    // computed CTE column in a WHERE comparison, untypeable until the
    // re-export reading — and its `total` columns are typed THROUGH a
    // computation the strictness reading still declines.
    { file: "cte-self-join.sql" },
  ],
  "promotion-strictness:operator-metadata": [{ file: "computed-cast-closure.sql" }],
  "funccall:domain-by-consensus": [
    {
      file: "fallback-overload-consensus.sql",
      check: o => columnNotNull(o, "tagged"),
    },
  ],
  "funccall:strict-by-consensus": [
    {
      file: "fallback-overload-consensus.sql",
      check: o => !columnNotNull(o, "required"),
    },
  ],
  "funccall:aggregate-by-name": [{ file: "aggregate-group-by.sql" }],
  "funccall:builtin-name-strict-total": [
    {
      file: "fallback-named-argument-builtin.sql",
      // Both directions of the same branch: the non-null-argument claim and
      // the nullable-argument refusal.
      check: o => columnNotNull(o, "d_id") && !columnNotNull(o, "d_cat"),
    },
  ],
  "funccall:variadic-literal-array": [{ file: "builtin-variadic-null.sql" }],
  "funccall:variadic-array-refusal": [{ file: "builtin-variadic-null.sql" }],
  "window:curated-aggregate-frame": [{ file: "window-default-frame.sql" }],
  "strictly-forces:builtin-name": [
    {
      // `length(c.name) > 0` promotes c.name: `length` is a drop-rule name
      // (a user length(boolean) sits beside it, so candidates come back
      // empty) and the measured builtin set answers. The promoted column is
      // the outcome only this channel produces here.
      file: "where-promotion-strict-closure.sql",
      check: o => columnNotNull(o, "nm"),
    },
  ],
  "strictly-forces:consensus": [
    {
      // `WHERE ship($1) = 'lb'` — ship is overloaded, arity narrows the
      // candidate set to one strict row, and the closure concludes through
      // the consensus. The name never appears in the target list, so the
      // dispatch's own consensus cannot be the asker.
      file: "param-overload-arity.sql",
    },
  ],
  "forced-null-by:strict-operator-name": [{ file: "param-value-flow.sql" }],
  "forced-null-by:function-consensus": [
    {
      file: "fallback-param-consensus-reject.sql",
      check: o => paramNotNull(o, 1),
    },
  ],
  "forced-null-by:builtin-name": [
    {
      file: "fallback-param-builtin-name-reject.sql",
      check: o => paramNotNull(o, 1),
    },
  ],
};

/** Entries the corpus does not reach, each with the recorded reason and what
 *  it is waiting for. Per the project's rule, a *cannot* here is a claim the
 *  next reader should re-test. */
const DARK: Record<string, string> = {
  "funccall:builtin-name-always":
    "Unreachable from valid SQL today, measured 2026-08-24: the signature " +
    "capture's scope is DERIVED from the claim tables (snapshot.ts " +
    "CLAIMED_FUNCTION_NAMES), so every ALWAYS name has captured rows; variadic " +
    "arity admission plus the `\"any\"` element rule means no call PostgreSQL " +
    "accepts eliminates them all; and NO ALWAYS name declares parameter names " +
    "(measured against pg_proc.proargnames), so the named-notation route that " +
    "reaches the STRICT_TOTAL twin (fallback-named-argument-builtin.sql) is " +
    "closed here. The branch is the regression BACKSTOP behind the capture — it " +
    "answers only if the capture loses rows, which is exactly when it must " +
    "still be right. Re-test when a PostgreSQL version names concat's or a " +
    "constructor's parameters, or when a table entry escapes the capture's " +
    "scope derivation.",
  "funccall:builtin-name-first-arg":
    "Same argument, same measurement: FIRST_ARG_BUILTINS is exactly " +
    "{concat_ws, format} and neither declares parameter names, so no valid " +
    "call skips the typed dispatch. Backstop behind the capture; re-test on " +
    "the same triggers as builtin-name-always.",
};

// --- the excluded boundary --------------------------------------------------
//
// Name/shape/curated-table reads considered for this census and excluded,
// because no richer channel exists above them to decline: the curated table IS
// the primary channel for a pg_catalog name (the user catalog never carries
// metadata for one). Each is held to PostgreSQL by the suites named — this
// census owns the FALLBACK class, not the whole curated surface.
const EXCLUDED: Record<string, string> = {
  "count-by-name":
    "priority 2 fires for `count` whether or not richer information is readable — " +
    "a name shortcut, not an unreadability fallback; pinned by the aggregate fixtures",
  "builtin-srf-shape":
    "isSetReturningBuiltin / resolveBuiltinFunctionShape / " +
    "NON_NULL_BUILTIN_TABLE_COLUMNS — FROM-position pg_catalog SRFs have no " +
    "user-catalog channel to decline; the capture is primary. Held by " +
    "curated-tables.test.ts (snapshot pins) and builtin-table-function-shape.sql",
  "strict-srf-implications (isStrictBuiltin && isSetReturningBuiltin)":
    "same primary-channel argument; the four gates are pinned with mutations in " +
    "the strict-SRF fixtures (deferred-tasks.md, the seven-fixture cluster)",
  "extract-total-fields":
    "the TYPED path — it requires a readable field and a singleton operand type; " +
    "the unreadable path concludes nullable one branch later. Pinned by " +
    "builtin-extract-infinity.sql",
  "adapter-internal-name-verdicts":
    "resolveOperatorTotality's mixed-name nullable and resolveBuiltinScalarTotality's " +
    "verdictOf sit inside the typed accessors themselves — the walk sees only the " +
    "returned kind. Held by bare-name-gates-red.test.ts and totality-probe.test.ts",
  "aggregate name sets inside resolveAggregateTraced":
    "reached through funccall:aggregate-by-name (censused above); the per-name " +
    "sets are curated-table subjects held by totality-probe.test.ts",
};

// --- corpus run ---------------------------------------------------------------

const FIXTURES_DIR = join(__dirname, "fixtures");

describe("fallback census", () => {
  let pg: PGlite;
  let snapshot: CatalogSnapshot;
  const observations: Obs[] = [];
  /** entry key → files whose observation the generic detector fired on. */
  const reached = new Map<string, string[]>();

  beforeAll(async () => {
    pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
    await pg.exec(readFileSync(join(FIXTURES_DIR, "schema.sql"), "utf8"));
    snapshot = await snapshotCatalog(pg);
    const catalogFor: CatalogFor = catalogCache(snapshot);

    const corpus: { file: string; sql: string; searchPath: string[] | null }[] = [
      ...GRAMMAR_SAMPLER.map((sql, i) => ({
        file: `sampler#${i}`,
        sql,
        searchPath: null,
      })),
      ...readdirSync(FIXTURES_DIR)
        .filter(f => f.endsWith(".sql") && f !== "schema.sql")
        .map(f => {
          const sql = readFileSync(join(FIXTURES_DIR, f), "utf8");
          return { file: f, sql, searchPath: parseFixtureDirectives(sql).searchPath };
        }),
    ];

    for (const { file, sql, searchPath } of corpus) {
      let stmt;
      try {
        stmt = (await parseSql(sql)).stmts?.[0]?.stmt;
      } catch {
        continue; // a fixture the parser refuses is the base suite's business
      }
      if (!stmt) continue;
      const catalog = await catalogFor(searchPath);

      const walkRec = recordCatalog(catalog);
      let columns: OutputNullabilityTraced[] = [];
      try {
        columns = await inferNullabilityTraced(stmt, walkRec.catalog);
      } catch {
        // a refusal still asked its questions on the way to refusing
      }
      const contractRec = recordCatalog(catalog);
      let contract: QueryContract | null = null;
      try {
        contract = await inferQueryContract(stmt, contractRec.catalog);
      } catch {
        /* as above */
      }

      const facts = new Set<string>();
      const factList: { name: string; value: string }[] = [];
      const visit = (n: TraceNode): void => {
        for (const f of n.facts) {
          facts.add(factKey(f.name, f.value));
          factList.push(f);
        }
        n.children.forEach(visit);
      };
      for (const c of columns) if (c.trace) visit(c.trace);

      const rootKeys = Object.keys(stmt as Record<string, unknown>);
      const obs: Obs = {
        file,
        facts,
        factList,
        walkCalls: walkRec.calls,
        contractCalls: contractRec.calls,
        columns,
        contract,
        isDml: ["InsertStmt", "UpdateStmt", "DeleteStmt", "MergeStmt"].some(k =>
          rootKeys.includes(k),
        ),
      };
      observations.push(obs);
      for (const [key, entry] of Object.entries(INVENTORY)) {
        if (entry.detect(obs)) {
          const files = reached.get(key) ?? [];
          files.push(file);
          reached.set(key, files);
        }
      }
    }
  }, 300_000);

  afterAll(async () => {
    console.log(
      `\nfallback census: ${Object.keys(INVENTORY).length} entries — ` +
        `${reached.size} reached, ${Object.keys(DARK).length} dark by triage, over ` +
        `${observations.length} statements.`,
    );
    if (process.env.FALLBACK_CENSUS_REPORT) {
      const lines = Object.entries(INVENTORY).map(([key, e]) => {
        const files = reached.get(key) ?? [];
        return `  ${key} [${e.direction}] (${files.length})\n    ${files.slice(0, 6).join(", ")}${files.length > 6 ? ", …" : ""}`;
      });
      console.log(`\nfallback reach:\n${lines.join("\n")}`);
    }
    if (!pg.closed) await pg.close();
  });

  it("every inventory entry is reached through the information-missing path, or triaged dark", () => {
    const cold = Object.keys(INVENTORY)
      .filter(key => !reached.has(key) && !DARK[key])
      .sort();
    expect(
      cold,
      `Fallback branches no corpus input reaches through the unreadable path. ` +
        `Each is exactly where the 2026-08-24 class of unsoundness hides — write ` +
        `the input (the exemplars are name-level-partial-overload.sql and ` +
        `non-strict-overload-promotion.sql: a window call makes a value's type ` +
        `unreadable while PostgreSQL still executes it), or record in DARK what ` +
        `it is waiting for:\n  ${cold.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every DARK entry really is dark", () => {
    const warm = Object.keys(DARK)
      .filter(key => reached.has(key))
      .sort();
    expect(
      warm,
      `Triaged as unreachable, and the corpus now reaches them. Move each to ` +
        `WITNESSES:\n  ${warm.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every witness and DARK key names a live inventory entry", () => {
    // The rot direction: a fallback that is REMOVED from the engine (a
    // PARTIAL_OVERLOADS row deleted, a branch retired) takes its generated
    // entry with it, and the witness pointing at nothing must fail rather
    // than survive as dead weight.
    const orphans = [...Object.keys(WITNESSES), ...Object.keys(DARK)]
      .filter(key => !INVENTORY[key])
      .sort();
    expect(
      orphans,
      `Witness or DARK keys for inventory entries that no longer exist — the ` +
        `fallback was removed or renamed; delete the row or rename it:\n  ${orphans.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every reached entry is pinned by witness NAME", () => {
    // Pin by name, never by count: a compensating swap (one fixture stops
    // reaching, another starts) must not hide behind a stable total.
    const unpinned = [...reached.keys()]
      .filter(key => !(WITNESSES[key]?.length))
      .sort();
    expect(
      unpinned,
      `Entries the corpus reaches with no named witness. Add each to WITNESSES ` +
        `with the fixture that reaches it (FALLBACK_CENSUS_REPORT=1 prints the ` +
        `candidates):\n  ${unpinned.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every witness still reaches its entry", () => {
    const failures: string[] = [];
    for (const [key, witnesses] of Object.entries(WITNESSES)) {
      const entry = INVENTORY[key];
      if (!entry) continue; // the orphan assertion reports it
      for (const w of witnesses) {
        const obs = observations.find(o => o.file === w.file);
        if (!obs) {
          failures.push(`${key} — witness ${w.file} is not in the corpus`);
          continue;
        }
        if (!entry.detect(obs)) {
          failures.push(
            `${key} — ${w.file} no longer reaches the fallback (the typed channel ` +
              `now answers there, or the branch is gone)`,
          );
          continue;
        }
        if (w.check && !w.check(obs)) {
          failures.push(
            `${key} — ${w.file} reaches the signal but the site-pinning outcome ` +
              `check failed`,
          );
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it("the fixture schema carries the falsifying vocabulary the escape tables name", () => {
    // Fed FROM the tables, not from intuition (the corpus gained its first
    // path columns only AFTER the bug, because the schema's vocabulary had
    // been shaped by the same assumption that created the hole). A row added
    // to either table fails here until the schema can express its falsifier.
    const columns = snapshot.tables.flatMap(t => t.columns);
    const missing: string[] = [];

    for (const sig of NON_TOTAL_OPERATOR_SIGNATURES) {
      const m = /^(.+)\((.*)\)$/.exec(sig);
      if (!m) {
        missing.push(`${sig} — unparseable signature key`);
        continue;
      }
      for (const type of m[2]!.split(",").map(s => s.trim()).filter(s => s.length > 0)) {
        if (!columns.some(c => c.typeName === type)) {
          missing.push(
            `${sig} — no fixture-schema column of type '${type}', so the corpus ` +
              `cannot express the falsifying input for the recorded hole`,
          );
        }
      }
    }

    // The strictness side has no signature-keyed set; the vocabulary each
    // name needs is recorded here beside the entry it serves. A NULLABLE
    // column, deliberately: the absorbing overload's counterexample is a NULL
    // operand surviving the operation, which a NOT NULL column can never seed.
    const NON_STRICT_VOCABULARY: Record<string, { needs: string; carried: boolean }> = {
      "||": {
        needs: "a NULLABLE array-typed column (array concatenation absorbs NULL)",
        carried: columns.some(c => c.typeName.endsWith("[]") && !c.notNull),
      },
    };
    for (const op of Object.keys(NON_STRICT_OVERLOADS)) {
      const v = NON_STRICT_VOCABULARY[op];
      if (!v) {
        missing.push(
          `NON_STRICT_OVERLOADS['${op}'] — no vocabulary row here; say what column ` +
            `type the falsifying input needs and check the schema carries it`,
        );
      } else if (!v.carried) {
        missing.push(`NON_STRICT_OVERLOADS['${op}'] — schema lacks ${v.needs}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("the escape tables stay subsets of the names they exempt", () => {
    // Structural sanity for the generated entries: an escape row for a name
    // that is not claimed exempts nothing, and the walk would never consult it.
    const stray = [
      ...Object.keys(PARTIAL_OVERLOADS).filter(op => !TOTAL_OPERATORS.has(op)),
      ...Object.keys(NON_STRICT_OVERLOADS).filter(op => !STRICT_OPERATORS.has(op)),
    ];
    expect(stray).toEqual([]);
  });

  it("the excluded boundary is recorded", () => {
    // Not an assertion about the engine — a record that each boundary read
    // was CONSIDERED, so absence from the inventory reads as a decision.
    expect(Object.keys(EXCLUDED).length).toBeGreaterThan(0);
  });
});
