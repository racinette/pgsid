// ---------------------------------------------------------------------------
// Schema-driven data generation.
//
// The catalog snapshot is the single input: every table in it gets rows, so a
// table or column added to `fixtures/schema.sql` is populated automatically and
// cannot silently go unseeded.
//
// What the framework owns, rather than the individual generators:
//
//   - NULL injection. The catalog says which columns are nullable; a nullable
//     column gets NULL according to its own NULL policy, and the generator is
//     called only once non-NULL is decided. Generators therefore never return
//     NULL, and how often a column is NULL is a per-column decision — it is
//     what produces witnesses, so one figure for the whole dataset could only
//     be a compromise.
//   - Foreign keys. A FK column draws from the referenced column's already
//     generated values, so referential integrity is a property of the
//     framework rather than something each generator has to remember.
//   - Surrogate keys. A single-column integer primary key is numbered 1..N.
//   - Uniqueness. Rows duplicating an earlier row's PK/unique key are dropped.
//   - Which columns are filled at all. See the column policy in `build`.
//
// Nothing here keys on a PostgreSQL OID. Tables, columns, types and domains
// are addressed by name throughout, including in the seeds, so recreating the
// schema leaves the generated dataset byte-identical.
//
// Generation is on demand and depth-first: asking for another table's values
// generates that table first, so declared FKs and hand-written cross-table
// generators both get a valid emission order for free. A cycle between two
// tables is an error; a self-reference is not, and resolves against the rows
// generated so far (see `GenContext.values`).
// ---------------------------------------------------------------------------

import type {
  CatalogSnapshot,
  ColumnInfo,
  ConstraintInfo,
  TableInfo,
} from "../../../../src/catalog/types.js";
import { splitQualifiedName } from "../../../../src/catalog/qualified-name.js";
import { FUZZ_SEED, hashSeed, makeRand, type Rand } from "./random.js";

// ---------------------------------------------------------------------------
// Public shapes
// ---------------------------------------------------------------------------

export interface GenContext {
  /** 0-based index of the row being filled. */
  readonly row: number;
  /** Number of rows being generated for this table. */
  readonly rowCount: number;
  /**
   * Values already generated for `table.column`, in row order.
   *
   * Referencing another table generates it first. Referencing the *current*
   * table returns only the rows completed so far, which is what makes a
   * self-referencing FK (`categories.parent_id`) expressible: reference an
   * earlier id, or nothing.
   */
  values(table: string, column: string): unknown[];
  /**
   * A value already assigned to another column of the row being filled.
   * Columns are filled in catalog order, so only columns declared earlier are
   * visible; asking for a later one is an error rather than a silent
   * `undefined`.
   */
  current(column: string): unknown;
  /**
   * The type tier, as a callback: draws one value from the generator
   * registered for this column's type, or for `typeName` if one is named.
   *
   * A column-specific generator therefore *chooses* whether to produce a value
   * itself or delegate — `rand.chance(0.25) ? "x" : ctx.ofType()` puts a
   * literal the fixtures filter on into a quarter of the rows and leaves the
   * rest to the type's own generator, without restating what a text column
   * looks like. Resolution happens on call, so a column that never delegates
   * does not need its type to have a generator at all.
   */
  ofType(typeName?: string): unknown;
}

/** Produces one non-NULL value. NULL is the framework's decision, not this one's. */
export type ColumnGenerator = (rand: Rand, ctx: GenContext) => unknown;

/**
 * Decides whether one cell is NULL. `true` means NULL, and the value generator
 * is not called at all.
 *
 * Consulted only for columns the catalog reports as nullable — a NOT NULL
 * column never gets one, and registering a policy for one is an error rather
 * than dead configuration.
 */
export type NullPolicy = (rand: Rand, ctx: GenContext) => boolean;

/** A NULL policy that fires with fixed probability `p`. */
export function nullRate(p: number): NullPolicy {
  if (p < 0 || p > 1) throw new Error(`null rate must be in [0, 1], got ${p}`);
  return rand => rand.chance(p);
}

/**
 * Generators resolved most-specific-first.
 *
 * `byColumn`, `rowCounts` and `nullPolicies` are keyed by the schema of the
 * *table* being filled. `byType` is keyed by the schema of the *type*, which is
 * what a schema-qualified type name resolves against: two schemas may each
 * declare a `pct` domain and they are not the same type. Built-in types arrive
 * unqualified — pg_catalog is searched implicitly whatever the search path is —
 * and are looked up under the table's schema.
 */
export interface GeneratorRegistry {
  /** type schema → bare type name → generator. A domain is keyed by its own name. */
  byType: Record<string, Record<string, ColumnGenerator>>;
  /** schema → table → column → generator. */
  byColumn: Record<string, Record<string, Record<string, ColumnGenerator>>>;
  /** schema → table → [min, max] rows. Defaults to `defaultRows`. */
  rowCounts?: Record<string, Record<string, [number, number]>>;
  /**
   * How often each nullable column is NULL, resolved column-first then by type,
   * falling back to `defaultNullPolicy`.
   *
   * Per-column resolution matters because the NULL rate is what produces
   * witnesses: a column that has to be NULL sometimes for a fixture to observe
   * anything, and a column whose NULLs only add noise, want different rates,
   * and one global figure can only be a compromise between them. Each column
   * draws its NULL decisions from its own seeded stream, so changing one
   * column's policy leaves every other column's data untouched.
   */
  nullPolicies?: {
    byType?: Record<string, Record<string, NullPolicy>>;
    byColumn?: Record<string, Record<string, Record<string, NullPolicy>>>;
  };
}

export interface GenerateOptions {
  registry: GeneratorRegistry;
  /** NULL policy for nullable columns the registry does not name. */
  defaultNullPolicy?: NullPolicy;
  /** Row-count range for tables without an explicit entry. */
  defaultRows?: [number, number];
  seed?: number;
}

export interface GeneratedData {
  /** Multi-row `INSERT`s in FK-topological order, one statement per table. */
  sql: string;
  rowCounts: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

type Row = Map<string, unknown>;

const DEFAULT_NULL_POLICY = nullRate(0.35);
const DEFAULT_ROWS: [number, number] = [4, 9];

export function generateFixtureData(
  snapshot: CatalogSnapshot,
  opts: GenerateOptions,
): GeneratedData {
  return new Generation(snapshot, opts).run();
}

class Generation {
  private readonly registry: GeneratorRegistry;
  private readonly defaultNullPolicy: NullPolicy;
  private readonly defaultRows: [number, number];
  private readonly seed: number;
  /** Completed tables, in a valid emission order (parents before children). */
  private readonly done = new Map<string, { table: TableInfo; rows: Row[] }>();
  private readonly inProgress = new Set<string>();

  constructor(
    private readonly snapshot: CatalogSnapshot,
    opts: GenerateOptions,
  ) {
    this.registry = opts.registry;
    this.defaultNullPolicy = opts.defaultNullPolicy ?? DEFAULT_NULL_POLICY;
    this.defaultRows = opts.defaultRows ?? DEFAULT_ROWS;
    this.seed = opts.seed ?? FUZZ_SEED;
  }

  run(): GeneratedData {
    this.checkRegistry();
    for (const table of this.snapshot.tables) {
      this.ensure(table.schema, table.name);
    }
    const statements: string[] = [];
    const rowCounts: Record<string, number> = {};
    for (const [key, { table, rows }] of this.done) {
      rowCounts[key] = rows.length;
      if (rows.length === 0) continue;
      statements.push(renderInsert(table, rows));
    }
    // A materialized view holds its OWN rows, taken when it is refreshed — so
    // one created with the schema is empty however much data lands afterwards,
    // and every claim over it would be unwitnessable for a reason that is an
    // artefact of load order rather than of the query. Refreshed last, once
    // every table it reads is populated.
    for (const mv of this.snapshot.materializedViews) {
      statements.push(`REFRESH MATERIALIZED VIEW "${mv.schema}"."${mv.name}";`);
    }
    return { sql: `${statements.join("\n\n")}\n`, rowCounts };
  }

  // -- table resolution ----------------------------------------------------

  private ensure(schema: string, name: string): Row[] {
    const key = `${schema}.${name}`;
    const existing = this.done.get(key);
    if (existing) return existing.rows;
    if (this.inProgress.has(key)) {
      throw new Error(
        `circular table dependency at ${key} (in progress: ${[...this.inProgress].join(" → ")}). ` +
          `Break the cycle with a column-specific generator that does not reference the other table.`,
      );
    }
    const table = this.snapshot.tables.find(t => t.schema === schema && t.name === name);
    if (!table) throw new Error(`no table ${key} in the catalog snapshot`);

    this.inProgress.add(key);
    const rows = this.build(table);
    this.inProgress.delete(key);
    this.done.set(key, { table, rows });
    return rows;
  }

  private build(table: TableInfo): Row[] {
    const tableKey = `${table.schema}.${table.name}`;
    const [minRows, maxRows] =
      this.registry.rowCounts?.[table.schema]?.[table.name] ?? this.defaultRows;
    const rowCount = makeRand(hashSeed(tableKey, this.seed)).int(minRows, maxRows);

    const rows: Row[] = Array.from({ length: rowCount }, () => new Map<string, unknown>());

    // Column policy. A `GENERATED ALWAYS AS` column is computed by PostgreSQL
    // and an `ALWAYS` identity rejects an explicit value, so neither can appear
    // in the column list — and neither can be drawn from by a foreign key,
    // since its values do not exist until the INSERT runs.
    //
    // Everything else is filled explicitly, including columns that have a
    // DEFAULT and `BY DEFAULT` identity columns. A default is a value the
    // column takes when nothing is said about it, and this generator's whole
    // job is to say something about every column: a default would silently
    // override the NULL the null policy chose, which is the one decision that
    // produces witnesses. `BY DEFAULT` identities are filled for a different
    // reason — a foreign key has to draw from keys that are already known, and
    // an identity's values are not known until PostgreSQL assigns them.
    const columns = table.columns.filter(
      c => c.generated === "none" && c.identity !== "always",
    );

    for (const column of columns) {
      const columnKey = `${tableKey}.${column.name}`;
      const valueRand = makeRand(hashSeed(columnKey, this.seed));
      // A separate stream for the NULL decision keeps a policy change from
      // shifting the values themselves — retuning one column's rate changes
      // which of its cells are NULL, and touches no other column at all.
      const nullRand = makeRand(hashSeed(`${columnKey}#null`, this.seed));
      const generator = this.resolve(table, column);
      const nullPolicy = this.columnRefusesNull(table, column)
        ? null
        : this.resolveNullPolicy(table, column);

      for (let row = 0; row < rowCount; row++) {
        const ctx = this.context(table, column, rows, row, rowCount, valueRand);
        const value =
          nullPolicy && nullPolicy(nullRand, ctx) ? null : generator(valueRand, ctx);
        rows[row]!.set(column.name, value);
      }
    }

    return dedupe(table, rows);
  }

  private context(
    table: TableInfo,
    column: ColumnInfo,
    rows: Row[],
    row: number,
    rowCount: number,
    rand: Rand,
  ): GenContext {
    const tableKey = `${table.schema}.${table.name}`;
    const context: GenContext = {
      row,
      rowCount,
      ofType: typeName =>
        this.typeGenerator(table, column, typeName)(rand, context),
      values: (target, column) => {
        const targetKey = target.includes(".") ? target : `${table.schema}.${target}`;
        if (targetKey === tableKey) {
          // Self-reference: only rows already completed are visible.
          return rows.slice(0, row).map(r => r.get(column));
        }
        const [schema, name] = splitQualified(targetKey);
        return this.ensure(schema, name).map(r => r.get(column));
      },
      current: column => {
        const current = rows[row]!;
        if (!current.has(column)) {
          throw new Error(
            `${tableKey}.${column} is not filled yet — ctx.current() sees only columns ` +
              `declared earlier in the table`,
          );
        }
        return current.get(column);
      },
    };
    return context;
  }

  // -- generator resolution ------------------------------------------------

  /**
   * Column-specific → foreign key → surrogate key → the type tier.
   *
   * No match is an error, not a default: adding a column whose type nothing
   * knows how to fill must force a decision rather than silently producing
   * something the column's CHECK constraints reject.
   */
  private resolve(table: TableInfo, column: ColumnInfo): ColumnGenerator {
    const specific = this.registry.byColumn[table.schema]?.[table.name]?.[column.name];
    if (specific) return specific;

    const fk = foreignKeyFor(table, column);
    if (fk) return this.foreignKeyGenerator(table, column, fk);

    if (isSurrogateKey(table, column)) return (_rand, ctx) => ctx.row + 1;

    return this.typeGenerator(table, column);
  }

  /**
   * The type tier: the column's own type name (which is the domain name for a
   * domain column), then the domain's base type. Also reachable from a column
   * generator through `ctx.ofType()`, which is why it resolves on demand rather
   * than being folded into `resolve`.
   */
  private typeGenerator(
    table: TableInfo,
    column: ColumnInfo,
    typeName: string = column.typeName,
  ): ColumnGenerator {
    // The snapshot is taken with an empty search_path, so a type outside
    // pg_catalog arrives qualified (`public.discount_percent`). Registry keys
    // are bare type names under their own schema, so split before looking up;
    // an unqualified name is a built-in and is looked up under the table's
    // schema, which is where base types are registered.
    const { schema: typeSchema, name } = splitQualifiedName(typeName);
    const schema = typeSchema ?? table.schema;
    const byType = this.registry.byType[schema] ?? {};
    const direct = byType[name];
    if (direct) return direct;

    const domain = this.snapshot.domains.find(d => d.schema === schema && d.name === name);
    if (domain) {
      const baseType = splitQualifiedName(domain.baseTypeName);
      const base = this.registry.byType[baseType.schema ?? schema]?.[baseType.name];
      if (base) return base;
    }

    throw new Error(
      `no generator for ${table.schema}.${table.name}.${column.name} of type ` +
        `"${typeName}"${domain ? ` (domain over "${domain.baseTypeName}")` : ""}. ` +
        `Add an entry to typeSpecificGenerators["${schema}"]["${name}"] or to ` +
        `columnSpecificGenerators["${table.schema}"]["${table.name}"] in ` +
        `tests/unit/query/fixture-data/generators.ts.`,
    );
  }

  /** Column-specific → by type → the run's default. */
  /**
   * A column refuses NULL through its own constraint (`attnotnull`) or
   * through its TYPE: a NOT NULL domain rejects the value at coercion, and
   * `attnotnull` does not reflect that. Generating a NULL into such a column
   * does not produce a nullable witness — it makes the whole state fail to
   * load. Same schema-defaulting as `typeGenerator`: an unqualified type
   * name is a built-in, which is never a domain.
   */
  private columnRefusesNull(table: TableInfo, column: ColumnInfo): boolean {
    if (column.notNull) return true;
    const { schema: typeSchema, name } = splitQualifiedName(column.typeName);
    const schema = typeSchema ?? table.schema;
    const domain = this.snapshot.domains.find(d => d.schema === schema && d.name === name);
    return domain?.notNull ?? false;
  }

  private resolveNullPolicy(table: TableInfo, column: ColumnInfo): NullPolicy {
    const policies = this.registry.nullPolicies;
    return (
      policies?.byColumn?.[table.schema]?.[table.name]?.[column.name] ??
      policies?.byType?.[table.schema]?.[column.typeName] ??
      this.defaultNullPolicy
    );
  }

  /**
   * Every registry entry must name something in the snapshot. A misspelled
   * column silently falls through to the type tier and a misspelled table
   * silently keeps its default row count, so both would read as "configured"
   * while doing nothing.
   */
  private checkRegistry(): void {
    const column = (schema: string, table: string, name: string) =>
      this.snapshot.tables
        .find(t => t.schema === schema && t.name === table)
        ?.columns.find(c => c.name === name);

    const complain = (what: string, where: string) => {
      throw new Error(`${what} is registered in ${where} but does not exist in the schema`);
    };

    for (const [schema, tables] of Object.entries(this.registry.byColumn)) {
      for (const [table, columns] of Object.entries(tables)) {
        for (const name of Object.keys(columns)) {
          if (!column(schema, table, name)) {
            complain(`${schema}.${table}.${name}`, "columnSpecificGenerators");
          }
        }
      }
    }

    for (const [schema, tables] of Object.entries(this.registry.rowCounts ?? {})) {
      for (const table of Object.keys(tables)) {
        if (!this.snapshot.tables.some(t => t.schema === schema && t.name === table)) {
          complain(`${schema}.${table}`, "rowCounts");
        }
      }
    }

    for (const [schema, tables] of Object.entries(
      this.registry.nullPolicies?.byColumn ?? {},
    )) {
      for (const [table, columns] of Object.entries(tables)) {
        for (const name of Object.keys(columns)) {
          const found = column(schema, table, name);
          if (!found) complain(`${schema}.${table}.${name}`, "nullPolicies.byColumn");
          // A NOT NULL column never consults a policy, so one registered for it
          // is a claim about behaviour that cannot happen.
          if (found?.notNull) {
            throw new Error(
              `${schema}.${table}.${name} is NOT NULL, so the null policy ` +
                `registered for it can never fire`,
            );
          }
        }
      }
    }
  }

  private foreignKeyGenerator(
    table: TableInfo,
    column: ColumnInfo,
    fk: ConstraintInfo,
  ): ColumnGenerator {
    const at = fk.columns.indexOf(column.name);
    const targetSchema = fk.foreignSchema ?? table.schema;
    const targetTable = fk.foreignTable!;
    const targetColumn = fk.foreignColumns![at]!;
    const selfReferencing =
      targetSchema === table.schema && targetTable === table.name;

    return (rand, ctx) => {
      const candidates = ctx
        .values(`${targetSchema}.${targetTable}`, targetColumn)
        .filter(v => v !== null && v !== undefined);
      if (candidates.length === 0) {
        if (selfReferencing) {
          // Row 0 has nothing earlier to point at. A NOT NULL self-reference
          // has no first row and no generator can invent one.
          if (column.notNull) {
            throw new Error(
              `${table.schema}.${table.name}.${column.name} is a NOT NULL self-reference: ` +
                `the first row has no earlier row to reference`,
            );
          }
          return null;
        }
        throw new Error(
          `${table.schema}.${table.name}.${column.name} references ` +
            `${targetSchema}.${targetTable}.${targetColumn}, which generated no non-NULL values`,
        );
      }
      return rand.pick(candidates);
    };
  }
}

// ---------------------------------------------------------------------------
// Catalog helpers
// ---------------------------------------------------------------------------

function splitQualified(key: string): [string, string] {
  const dot = key.indexOf(".");
  return [key.slice(0, dot), key.slice(dot + 1)];
}

function foreignKeyFor(table: TableInfo, column: ColumnInfo): ConstraintInfo | null {
  for (const c of table.constraints) {
    if (c.type !== "foreign") continue;
    if (!c.columns.includes(column.name)) continue;
    if (!c.foreignTable || !c.foreignColumns) continue;
    if (c.foreignColumns.length !== c.columns.length) {
      throw new Error(`malformed FK ${c.name} on ${table.schema}.${table.name}`);
    }
    return c;
  }
  return null;
}

/** A single-column integer primary key, numbered 1..N rather than drawn. */
function isSurrogateKey(table: TableInfo, column: ColumnInfo): boolean {
  const pk = table.constraints.find(c => c.type === "primaryKey");
  if (!pk || pk.columns.length !== 1 || pk.columns[0] !== column.name) return false;
  return ["integer", "bigint", "smallint"].includes(column.typeName);
}

/** Drop rows that repeat an earlier row's primary key or unique key. */
function dedupe(table: TableInfo, rows: Row[]): Row[] {
  const keys = table.constraints
    .filter(c => c.type === "primaryKey" || c.type === "unique")
    .map(c => c.columns);
  if (keys.length === 0) return rows;

  const seen = keys.map(() => new Set<string>());
  return rows.filter(row =>
    keys.every((columns, i) => {
      // A unique constraint does not constrain rows with a NULL member.
      if (columns.some(c => row.get(c) === null)) return true;
      const key = JSON.stringify(columns.map(c => row.get(c)));
      if (seen[i]!.has(key)) return false;
      seen[i]!.add(key);
      return true;
    }),
  );
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/**
 * One multi-row `VALUES` per table. Volume matters here: replaying hundreds of
 * single-row `INSERT`s against a long-lived PGlite instance is what exhausts
 * its WASM linear memory (rule 6 in the workspace `AGENTS.md`); the same rows
 * as one statement do not.
 */
function renderInsert(table: TableInfo, rows: Row[]): string {
  const columns = [...rows[0]!.keys()];
  const tuples = rows.map(
    row => `  (${columns.map(c => renderLiteral(row.get(c))).join(", ")})`,
  );
  return (
    `INSERT INTO ${quoteIdent(table.schema)}.${quoteIdent(table.name)} ` +
    `(${columns.map(quoteIdent).join(", ")}) VALUES\n${tuples.join(",\n")};`
  );
}

/**
 * Literals are emitted untyped. In `INSERT ... VALUES` PostgreSQL coerces an
 * unknown-typed literal to the target column's type, so a timestamp, a jsonb
 * document and a domain value all render as plain quoted strings and no cast
 * has to be threaded through the generator.
 */
function renderLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`non-finite generated value: ${value}`);
    return String(value);
  }
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return quoteLiteral(value.toISOString());
  if (typeof value === "string") return quoteLiteral(value);
  return quoteLiteral(JSON.stringify(value));
}

function quoteLiteral(text: string): string {
  if (text.includes("\\")) {
    throw new Error(`generated literals must not contain backslashes: ${text}`);
  }
  return `'${text.replace(/'/g, "''")}'`;
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}
