import type {
  CatalogSnapshot,
  ColumnInfo,
  CompositeTypeInfo,
  ConstraintInfo,
  DomainInfo,
  EntityId,
  FunctionInfo,
  SchemaDiff,
  SchemaDiffEntry,
  SequenceInfo,
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
//
// No comparable state contains an OID. An OID is assigned when an object is
// created, so replaying the same migrations into a fresh database — which is
// what happens whenever a historical migration is edited — yields a schema
// identical in every way a query can observe and different in every OID. A
// diff that compared them would answer "modified" for entities nobody touched,
// and since the real change is somewhere in that list too, a diff that flags
// everything distinguishes nothing. Entities are identified and compared by
// name throughout; `comparableStates` is exported so the absence of OIDs can be
// asserted rather than assumed.
// ---------------------------------------------------------------------------

/** Build the comparable state object for a column. */
function columnState(c: ColumnInfo): Omit<ColumnInfo, "typeOid"> {
  return {
    name: c.name,
    // `typeName` comes from `format_type`, which renders the modifier into the
    // name (`character varying(50)`) and qualifies any type the search path
    // does not make visible. It says everything the OID did about which type
    // this is, and keeps saying it after the type is recreated.
    typeName: c.typeName,
    typeMod: c.typeMod,
    notNull: c.notNull,
    // A child gaining or losing the constraint changes what a tree scan of
    // the parent can return, hence what may be inferred — so the conjunction
    // is a comparable property of the PARENT's column.
    notNullTree: c.notNullTree,
    hasDefault: c.hasDefault,
    defaultExpr: c.defaultExpr,
    generated: c.generated,
    identity: c.identity,
    // A collation determinism flip changes what the nullability engine may
    // conclude (literal distinctness), so it is a comparable property.
    collationDeterministic: c.collationDeterministic,
  };
}

/** Build the comparable state object for a table (table-level properties only;
 *  columns are diffed as separate entities). */
function tableState(t: TableInfo): {
  schema: string;
  name: string;
  storageParams: Record<string, string>;
  constraints: ConstraintInfo[];
  writeRewrites: TableInfo["writeRewrites"];
  writeRewritesTree: TableInfo["writeRewritesTree"];
} {
  return {
    schema: t.schema,
    name: t.name,
    storageParams: t.storageParams,
    constraints: t.constraints,
    // Creating or dropping a BEFORE ROW / INSTEAD OF trigger or a DO
    // INSTEAD rule changes what RETURNING reports, hence what may be
    // inferred — a comparable property like `validated`. The tree union is
    // comparable on the PARENT for the same reason notNullTree is: a
    // trigger appearing on a child changes what a write through the parent
    // may claim.
    writeRewrites: t.writeRewrites,
    writeRewritesTree: t.writeRewritesTree,
  };
}

/** Build the comparable state object for a view/matview (definition + columns
 *  are diffed as separate entities, so only the definition is compared here). */
function viewState(v: ViewInfo): {
  schema: string;
  name: string;
  definition: string;
  writeRewrites: ViewInfo["writeRewrites"];
} {
  return {
    schema: v.schema,
    name: v.name,
    definition: v.definition,
    writeRewrites: v.writeRewrites,
  };
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
    // Both rendered by PostgreSQL from the same catalog rows the OIDs point at
    // — `pg_get_function_identity_arguments` and `pg_get_function_result`.
    argTypes: f.argTypes,
    returnType: f.returnType,
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
 * Build the comparable state object for a domain. `oid` and `baseTypeOid` are
 * dropped; `baseTypeName` says which type it is built on, and the domain's own
 * identity is the entity id.
 */
function domainState(d: DomainInfo): Omit<DomainInfo, "oid" | "baseTypeOid"> {
  return {
    schema: d.schema,
    name: d.name,
    baseTypeName: d.baseTypeName,
    notNull: d.notNull,
    default: d.default,
    check: d.check,
  };
}

/** Build the comparable state object for a composite type (attribute OIDs dropped). */
function compositeTypeState(t: CompositeTypeInfo): {
  schema: string;
  name: string;
  attributes: { name: string; typeName: string }[];
} {
  return {
    schema: t.schema,
    name: t.name,
    attributes: t.attributes.map(a => ({ name: a.name, typeName: a.typeName })),
  };
}

/** Build the comparable state object for a sequence (`typeOid` dropped). */
function sequenceState(s: SequenceInfo): Omit<SequenceInfo, "typeOid"> {
  return {
    schema: s.schema,
    name: s.name,
    typeName: s.typeName,
    start: s.start,
    increment: s.increment,
    min: s.min,
    max: s.max,
    cache: s.cache,
    cycle: s.cycle,
    ownedByTable: s.ownedByTable,
    ownedByColumn: s.ownedByColumn,
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
 *
 * Exported so a test can assert properties of what the diff actually compares
 * — that no state carries an OID, in particular. Entities whose state is the
 * whole snapshot object (indexes, enums, extensions, schemas) hold nothing but
 * names, and a test pins that rather than leaving it to inspection.
 */
export function comparableStates(snapshot: CatalogSnapshot): Map<EntityId, unknown> {
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

  // Operators (whole entity; operand types are the identity — one oprname
  // can overload across operand types).
  for (const o of snapshot.operators) {
    out.set(`${o.schema}.${o.name}(${o.leftType ?? ""},${o.rightType ?? ""})`, o);
  }

  // Enums (values compared).
  for (const e of snapshot.enums) {
    out.set(`${e.schema}.${e.name}`, e);
  }

  // Domains.
  for (const d of snapshot.domains) {
    out.set(`${d.schema}.${d.name}`, domainState(d));
  }

  // Composite types (attributes compared).
  for (const t of snapshot.compositeTypes) {
    out.set(`${t.schema}.${t.name}`, compositeTypeState(t));
  }

  // Sequences.
  for (const s of snapshot.sequences) {
    out.set(`${s.schema}.${s.name}`, sequenceState(s));
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
  const beforeMap = comparableStates(before);
  const afterMap = comparableStates(after);

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
    operators: [],
    enums: [],
    domains: [],
    compositeTypes: [],
    sequences: [],
    extensions: [],
    schemas: [],
    builtinStrictFunctions: [],
  };
}
