// ---------------------------------------------------------------------------
// The package entry point.
//
// `tsup` has built this file and `pnpm dev` has run it since the repository
// was set up; it did not exist until 2026-08-24. That is the same absence
// `docs/deferred-tasks.md` §1 records from the other side — nothing under
// `src/` called `inferNullability`, so the engine had no boundary, and a
// manifest that could not resolve `pgsql-deparser` at runtime went unnoticed
// for the same reason.
//
// WHAT THIS EXPORTS IS THE BOUNDARY, NOT THE ENGINE. The engine's internal
// modules stay internal: a consumer gets the contract, the gate that makes
// the contract safe to zip, and the two steps needed to obtain one — parse a
// statement, build a catalog from a live schema. `src/query/*` is not
// re-exported wholesale, because every symbol exported here is a promise the
// package has to keep.
//
// The ORDER of a consumer's calls is the whole design:
//
//     snapshotCatalog(pg)                    →  a schema, captured
//     buildNullabilityCatalog(snapshot)      →  the engine's view of it
//     parseSql(sql)                          →  one statement
//     inferQueryContract(stmt, catalog, …)   →  positional claims
//     gateContract(sql, contract, describe)  →  the same claims, or none
//
// The last step is not optional in spirit. A contract that has not been
// gated is a positional array nobody has checked against the positions it
// will be zipped into, and `docs/deferred-tasks.md` §1 is the count of what
// that costs.
// ---------------------------------------------------------------------------

// --- One statement's contract, and the gate that makes it usable ------------
export {
  compareShapes,
  gateAgreed,
  gateContract,
  type DescribeStatement,
  type DescribedShape,
  type GateOutcome,
  type GatedContract,
} from "./contract-gate.js";

export {
  inferNullability,
  inferPresenceGroups,
  inferQueryContract,
  UnsupportedNodeError,
  type EvalWarning,
  type ParamNullability,
  type QueryContract,
  type WalkOptions,
} from "./query/nullability-walk.js";

export type {
  ColumnOrigin,
  NullabilityCatalog,
  OutputNullability,
  OutputPresenceGroup,
  ResolveColumnTypes,
} from "./query/types.js";

export type { Evaluate, EvaluateRow } from "./query/subtree-evaluator.js";

// --- Getting a catalog and a statement --------------------------------------
export { buildNullabilityCatalog } from "./query/catalog-adapter.js";
export { snapshotCatalog } from "./catalog/snapshot.js";
export type { CatalogSnapshot } from "./catalog/types.js";
export { parseSql } from "./ast.js";

// --- Building the schema a catalog is captured from -------------------------
export { SchemaBuilder } from "./schema-builder.js";

// --- Configuration ----------------------------------------------------------
export { ConfigError, findConfigPath, loadConfig, parseConfigString } from "./config/loader.js";
export type { Config } from "./config/schema.js";
