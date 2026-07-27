import type {
  CatalogSnapshot,
  ColumnInfo,
  ConstraintInfo,
  EntityId,
  FunctionInfo,
  SchemaDiff,
  SchemaDiffEntry,
  TableInfo,
  ViewInfo,
} from "./types.js";

// ---------------------------------------------------------------------------
// Catalog diff: a pure function over two `CatalogSnapshot`s.
//
// Compares entity-by-entity at column-level granularity and reports
// added / removed / modified entries. No side effects, no PGlite — easy to
// unit-test with hand-built snapshots.
//
// Entity granularity:
// - Tables/matviews/views/sequences/composite-types/enums/domains/indexes:
//   one entity each, id = `"schema.name"`.
// - Columns of tables/views/matviews: one entity each, id =
//   `"schema.relation.column"`. Column property changes (type, NOT NULL,
//   DEFAULT, GENERATED) are reported at the *column* entity, not the table.
// - Functions/procedures: id = `"schema.name(argTypes)"` (identity args).
// - Extensions: id = `"name"` (globally unique).
// - Schemas: id = `"name"`.
//
// When a table is added/removed, its columns are reported as added/removed
// too (so a column-level dependency graph can match column references
// without separately expanding the table).
//
// "Modified" carries a comparable-state subset (not the full entity) chosen
// per the DESIGN.md diff spec — e.g. function bodies are NOT compared (a
// body-only change doesn't affect query signatures), while column types,
// NOT NULL, DEFAULT, and GENERATED are.
// ---------------------------------------------------------------------------

/** Build the comparable state object for a column. */
function columnState(c: ColumnInfo): ColumnInfo {
  return {
    name: c.name,
    typeOid: c.typeOid,
    typeName: c.typeName,
    typeMod: c.typeMod,
    notNull: c.notNull,
    hasDefault: c.hasDefault,
    defaultExpr: c.defaultExpr,
    generated: c.generated,
    identity: c.identity,
  };
}

/** Build the comparable state object for a table (table-level properties only;
 *  columns are diffed as separate entities). */
function tableState(t: TableInfo): {
  schema: string;
  name: string;
  storageParams: Record<string, string>;
  constraints: ConstraintInfo[];
} {
  return {
    schema: t.schema,
    name: t.name,
    storageParams: t.storageParams,
    constraints: t.constraints,
  };
}

/** Build the comparable state object for a view/matview (definition + columns
 *  are diffed as separate entities, so only the definition is compared here). */
function viewState(v: ViewInfo): { schema: string; name: string; definition: string } {
  return { schema: v.schema, name: v.name, definition: v.definition };
}

/**
 * Build the comparable state object for a function — the signature-defining
 * properties only. `body`, `definition`, arg *names*, `cost`, and `rows` are
 * intentionally excluded: a body-only change (CREATE OR REPLACE with the same
 * signature) does NOT affect query type signatures, so it must not trigger a
 * re-typecheck.
 */
function functionState(f: FunctionInfo): {
  schema: string;
  name: string;
  argTypes: string;
  returnType: string;
  returnTypeOid: number;
  language: string;
  isProcedure: boolean;
  isAggregate: boolean;
  isWindow: boolean;
  securityDefiner: boolean;
  strict: boolean;
  volatile: FunctionInfo["volatile"];
} {
  return {
    schema: f.schema,
    name: f.name,
    argTypes: f.argTypes,
    returnType: f.returnType,
    returnTypeOid: f.returnTypeOid,
    language: f.language,
    isProcedure: f.isProcedure,
    isAggregate: f.isAggregate,
    isWindow: f.isWindow,
    securityDefiner: f.securityDefiner,
    strict: f.strict,
    volatile: f.volatile,
  };
}

/**
 * Deterministic equality check for two comparable-state values. States are
 * plain objects/arrays/primitives (and may contain `bigint` from int8 catalog
 * columns — e.g. sequence bounds). We deliberately avoid `JSON.stringify`
 * here (it cannot serialize `bigint`); instead we use a small structural
 * deep-equal. JSON serialization of snapshots is deferred to a dedicated
 * serializer layer, kept separate from the data model.
 */
function stateEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a === "bigint" && typeof b === "bigint") return a === b;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!stateEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (typeof a === "object" && typeof b === "object") {
    const ak = Object.keys(a as Record<string, unknown>);
    const bk = Object.keys(b as Record<string, unknown>);
    if (ak.length !== bk.length) return false;
    for (const k of ak) {
      if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
      if (!stateEqual(
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k],
      )) return false;
    }
    return true;
  }
  return false;
}

/** A relation (table/view/matview) + the function emitting its column entities. */
function emitRelationEntities(
  out: Map<EntityId, unknown>,
  relState: unknown,
  id: EntityId,
  columns: ColumnInfo[],
): void {
  out.set(id, relState);
  for (const c of columns) {
    out.set(`${id}.${c.name}`, columnState(c));
  }
}

/**
 * Enumerate every entity in a snapshot as `EntityId → comparable state`.
 * The returned map is the input to the set-difference comparison.
 */
function enumerate(snapshot: CatalogSnapshot): Map<EntityId, unknown> {
  const out = new Map<EntityId, unknown>();

  // Tables (+ columns).
  for (const t of snapshot.tables) {
    emitRelationEntities(out, tableState(t), `${t.schema}.${t.name}`, t.columns);
  }

  // Views (+ columns).
  for (const v of snapshot.views) {
    emitRelationEntities(out, viewState(v), `${v.schema}.${v.name}`, v.columns);
  }

  // Materialized views (+ columns).
  for (const v of snapshot.materializedViews) {
    emitRelationEntities(out, viewState(v), `${v.schema}.${v.name}`, v.columns);
  }

  // Indexes (whole entity).
  for (const ix of snapshot.indexes) {
    out.set(`${ix.schema}.${ix.name}`, ix);
  }

  // Functions (whole-signature state; identity args in the id).
  for (const f of snapshot.functions) {
    out.set(
      `${f.schema}.${f.name}(${f.argTypes})`,
      functionState(f),
    );
  }

  // Enums (values compared).
  for (const e of snapshot.enums) {
    out.set(`${e.schema}.${e.name}`, e);
  }

  // Domains.
  for (const d of snapshot.domains) {
    out.set(`${d.schema}.${d.name}`, d);
  }

  // Composite types (attributes compared).
  for (const t of snapshot.compositeTypes) {
    out.set(`${t.schema}.${t.name}`, t);
  }

  // Sequences.
  for (const s of snapshot.sequences) {
    out.set(`${s.schema}.${s.name}`, s);
  }

  // Extensions (globally-unique name, no schema qualifier).
  for (const e of snapshot.extensions) {
    out.set(e.name, e);
  }

  // Schemas.
  for (const s of snapshot.schemas) {
    out.set(s.name, s);
  }

  return out;
}

/**
 * Compute the diff between two catalog snapshots.
 *
 * Pure function — no side effects, no PGlite. Deterministic output: the
 * `added`, `removed`, and `modified` arrays are each sorted by `entityId`
 * (lexicographic), so identical inputs always produce byte-identical diffs.
 *
 * On first boot (empty `before`), every entity is `added`.
 */
export function diffCatalogs(
  before: CatalogSnapshot,
  after: CatalogSnapshot,
): SchemaDiff {
  const beforeMap = enumerate(before);
  const afterMap = enumerate(after);

  const added: EntityId[] = [];
  const removed: EntityId[] = [];
  const modified: SchemaDiffEntry[] = [];

  // Collect the union of ids from both maps.
  const allIds = new Set<EntityId>();
  for (const id of beforeMap.keys()) allIds.add(id);
  for (const id of afterMap.keys()) allIds.add(id);

  for (const id of allIds) {
    const b = beforeMap.get(id);
    const a = afterMap.get(id);
    if (b === undefined && a !== undefined) {
      added.push(id);
    } else if (b !== undefined && a === undefined) {
      removed.push(id);
    } else if (b !== undefined && a !== undefined && !stateEqual(b, a)) {
      modified.push({ entityId: id, old: b, new: a });
    }
  }

  added.sort(cmpString);
  removed.sort(cmpString);
  modified.sort((x, y) => cmpString(x.entityId, y.entityId));

  return { added, removed, modified };
}

function cmpString(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Convenience: build an empty snapshot (useful as the "before" on first boot
// and as a base for hand-built diff-test fixtures).
// ---------------------------------------------------------------------------

export function emptyCatalogSnapshot(): CatalogSnapshot {
  return {
    tables: [],
    views: [],
    materializedViews: [],
    indexes: [],
    functions: [],
    enums: [],
    domains: [],
    compositeTypes: [],
    sequences: [],
    extensions: [],
    schemas: [],
  };
}
