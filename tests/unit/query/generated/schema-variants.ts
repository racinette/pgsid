import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fixtureGeneratorRegistry } from "../fixture-data/generators.js";
import type { ColumnGenerator, GeneratorRegistry } from "../fixture-data/generate.js";

// ---------------------------------------------------------------------------
// The schema axis — `docs/generated-surface.md` item 4.
//
// The generator varies query STRUCTURE over a FIXED schema vocabulary, and the
// engine is a function of (AST, CATALOG) with only one argument explored. That
// is the diagnosis; this is the second argument.
//
// **The generator's schema contract is a set of NAMES**, not a set of tables:
// every structure it builds is over `t(id, name, active)`, `u(id, t_id, email,
// val)` and `v(id, u_id, amount)`, with `ck`, `gm` and `tags` for the DML and
// generated-column axes. So a variant that keeps those names and changes only
// the CATALOG FEATURES behind them gets the entire existing structural corpus
// for free, with no generator change at all. That is why this file is a list
// of DDL patches rather than a schema generator.
//
// Each variant declares, by name from `catalog-features.ts`, the census
// features it exists to bring under generation — so a variant claiming a
// feature nobody classified fails, and the suite can report which of the
// census's 22 gaps are now reachable by the corpus and which are not.
//
// **The seed data is the hard part, and it is where the diagnosis got
// sharper.** `u.t_id` carries a column generator that DELIBERATELY dangles a
// quarter of its rows, because the base corpus's RIGHT and FULL JOIN
// structures need a row with no match — without it an outer join is an inner
// join and its NULL-extended columns are never observed. So foreign-key
// entailment had zero generated coverage not merely because `t`/`u`/`v`
// declare no keys, but because the data is BUILT to violate one. A variant
// that adds the key has to replace that generator, and `fk-chain` does.
// Everything else the seed generator handles on its own: it is already
// FK-topological, draws a referencing column from the referenced column's
// emitted values, and drops rows repeating a primary key.
// ---------------------------------------------------------------------------

export const BASE_SCHEMA_SQL = readFileSync(
  join(__dirname, "..", "fixtures", "schema.sql"),
  "utf8",
);

export interface SchemaVariant {
  name: string;
  /** Which claim direction this variant stresses, and why it is worth a run. */
  why: string;
  /** Census feature keys (from `catalog-features.ts`) it brings under generation. */
  covers: string[];
  /** DDL applied after the base schema. */
  patch: string;
  /** Seed-data registry, when the base one would violate the patch. */
  registry?: GeneratorRegistry;
  /** search_path for BOTH the database and the catalog, when not `["public"]`. */
  searchPath?: string[];
  /** Run after the seed data lands — a materialized view has to be refreshed. */
  postLoad?: string;
}

// --- registry helpers ------------------------------------------------------

type ColumnMap = Record<string, ColumnGenerator>;
type TableMap = Record<string, ColumnMap>;

const byColumn = (): Record<string, TableMap> =>
  (fixtureGeneratorRegistry.byColumn ?? {}) as Record<string, TableMap>;

const columnsOf = (schema: string, table: string): ColumnMap =>
  byColumn()[schema]?.[table] ?? {};

/** Draw a value from another column's already-emitted rows. */
const drawFrom =
  (table: string, column: string): ColumnGenerator =>
  (rand, ctx) => {
    const vs = ctx.values(table, column).filter(v => v !== null && v !== undefined);
    if (vs.length === 0) throw new Error(`${table}.${column} emitted nothing for a foreign key to draw from`);
    return rand.pick(vs);
  };

/**
 * The base registry with a table's generators moved to a new name. Registering
 * a column the schema does not have is an error, so a patch that RENAMES a
 * relation has to bring its generators along.
 */
function renamingTable(schema: string, from: string, to: string): GeneratorRegistry {
  const tables: TableMap = { ...(byColumn()[schema] ?? {}) };
  const moved = tables[from];
  delete tables[from];
  if (moved) tables[to] = moved;
  return { ...fixtureGeneratorRegistry, byColumn: { ...byColumn(), [schema]: tables } };
}

/** The base registry with per-column overrides merged into one schema. */
function withColumns(schema: string, overrides: TableMap): GeneratorRegistry {
  const merged: TableMap = { ...(byColumn()[schema] ?? {}) };
  for (const [table, cols] of Object.entries(overrides)) {
    merged[table] = { ...(merged[table] ?? {}), ...cols };
  }
  return { ...fixtureGeneratorRegistry, byColumn: { ...byColumn(), [schema]: merged } };
}

/**
 * A referencing column that always resolves. Replaces the base generator's
 * deliberate 25% dangle, which a real foreign key forbids — see the header.
 */
const RESOLVING_KEYS: TableMap = {
  u: { t_id: drawFrom("t", "id") },
  v: { u_id: drawFrom("u", "id") },
};

/** The DDL that turns the t—u—v chain into a real key chain. */
const KEY_CHAIN = (modifier: string): string => `
ALTER TABLE t ADD CONSTRAINT gen_t_pk PRIMARY KEY (id);
ALTER TABLE u ADD CONSTRAINT gen_u_pk PRIMARY KEY (id);
ALTER TABLE u ADD CONSTRAINT gen_u_t_fk FOREIGN KEY (t_id) REFERENCES t(id)${modifier};
ALTER TABLE v ADD CONSTRAINT gen_v_u_fk FOREIGN KEY (u_id) REFERENCES u(id)${modifier};
`;

export const SCHEMA_VARIANTS: SchemaVariant[] = [
  {
    name: "exclusion-constraint",
    why:
      "`ConstraintType` admits `exclusion` and no fixture ever produced one, so the walk's constraint reading had never been shown to IGNORE it — an exclusion constraint is not a CHECK and must not be read as one. Placed on `t`, which every structure in the corpus scans, so the constraint is in the list the walk actually consults.",
    covers: ["exclusion-constraint"],
    patch: `
ALTER TABLE t ADD COLUMN gen_span int4range;
ALTER TABLE t ADD CONSTRAINT gen_t_excl EXCLUDE USING gist (gen_span WITH &&);
`,
    // Range types carry gist support built in, so this needs no extension —
    // `btree_gist` is unavailable in PGlite and is not required here. The
    // column stays NULL because an exclusion constraint ignores NULLs, so no
    // seed row can violate it while the constraint still reaches the snapshot.
    registry: withColumns("public", { t: { gen_span: () => null } }),
  },
  {
    name: "enum-column",
    why:
      "An enum is an ordinary scalar to the walk — `catalog-features.ts` classifies it `conservative`, meaning no branch reads it — and that claim was asserted nowhere. Retyping `u.val`, which the corpus projects, COALESCEs and joins on, puts the claim under the oracle: if an enum were eventful anywhere, the column lists or the flags would move.",
    covers: ["enum-type"],
    patch: `
CREATE TYPE gen_kind AS ENUM ('a', 'b', 'c', 'zc', 'zm');
ALTER TABLE u ALTER COLUMN val TYPE gen_kind USING val::gen_kind;
`,
    // `u.val` is the generator's `textC` slot, so the corpus pairs it with TEXT
    // LITERALS — `COALESCE(u.val, 'zc')` and friends. An enum rejects a label
    // it does not declare, so the two fallbacks the corpus actually uses,
    // 'zc' and 'zm' (measured: they are the only ones that reach this column),
    // are declared as labels. Retyping a column the corpus merely PROJECTED
    // would have been easier and would have exercised nothing.
    registry: withColumns("public", { u: { val: rand => rand.pick(["a", "b", "c"]) } }),
  },
  {
    name: "domain-over-domain",
    why:
      "`resolveCompositeType` and `resolveDomainBaseTypeName` follow a domain to its base TRANSITIVELY, and every domain in the fixture schema reaches its base in ONE hop — so the second hop is written and never taken. `t.name` is read by the whole corpus, so a two-level domain exercises the walk rather than only the snapshot.",
    covers: ["domain-over-domain"],
    patch: `
CREATE DOMAIN gen_inner AS text;
CREATE DOMAIN gen_outer AS gen_inner NOT NULL;
ALTER TABLE t ALTER COLUMN name TYPE gen_outer USING name::gen_outer;
`,
  },
  {
    name: "generated-virtual",
    why:
      "PG18's second generation mode. STORED and VIRTUAL are read through ONE code path — `resolveGenerationExpr` walks the expression at the READING site either way — and only STORED was ever measured. The corpus reads all three of `gm`'s generated columns across the join kinds, so the claim that the modes are interchangeable is put under execution.",
    covers: ["generated-virtual-column"],
    patch: `
DROP TABLE gm;
CREATE TABLE gm (
  a          integer NOT NULL,
  b          text,
  doubled    integer GENERATED ALWAYS AS (a * 2) VIRTUAL,
  label      text    GENERATED ALWAYS AS (b || '!') VIRTUAL,
  safe_label text    GENERATED ALWAYS AS (coalesce(b, 'anon')) VIRTUAL
);
`,
  },
  {
    name: "not-enforced-fk",
    why:
      "The third route by which a key entails nothing, and the only one with no fixture: PG18's NOT ENFORCED. `convalidated` is false for such a key, which is what the adapter gates on, so the claim is that one bit covers the NOT VALID and NOT ENFORCED routes alike. Unlike `fk-chain` this variant does NOT resolve the dangling rows — a NOT ENFORCED key permits them, which is exactly what makes a promoted claim falsifiable here.",
    covers: ["not-enforced-foreign-key"],
    patch: `
ALTER TABLE t ADD CONSTRAINT gen_t_uq3 UNIQUE (id);
ALTER TABLE u ADD CONSTRAINT gen_u_ne FOREIGN KEY (t_id) REFERENCES t(id) NOT ENFORCED;
`,
  },
  {
    name: "identity-always",
    why:
      "`ColumnInfo.identity` is captured and nothing under `src/query` reads it, so like the enum this variant asserts an absence. Applied to `v.id` rather than `t.id` because the seed generator skips an ALWAYS identity — PostgreSQL assigns it — and `t.id` is what `u.t_id` draws from, so making it invisible would starve the reference.",
    covers: ["identity-always"],
    patch: `
ALTER TABLE v ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
`,
  },
  {
    name: "composite-key",
    why:
      "Two gates that had never had anything to reject: the adapter drops a COMPOSITE foreign key (the entailment reasons about one column matching, and MATCH SIMPLE matches nothing when any part is NULL), and `unique-constraint` was a ConstraintType member no fixture produced. Both ride on the join the corpus already writes, so the drop is observed rather than assumed — a claim that appeared here would be the finding.",
    covers: ["composite-foreign-key", "unique-constraint"],
    patch: `
ALTER TABLE t ADD CONSTRAINT gen_t_uq UNIQUE (id);
ALTER TABLE t ADD CONSTRAINT gen_t_uq2 UNIQUE (id, active);
ALTER TABLE u ADD COLUMN gen_t_active boolean;
ALTER TABLE u ADD CONSTRAINT gen_u_cfk FOREIGN KEY (t_id, gen_t_active) REFERENCES t(id, active);
`,
    // `gen_t_active` stays NULL, which MATCH SIMPLE satisfies unconditionally —
    // so the key exists to be DROPPED by the adapter, and no seed row can
    // violate it.
    registry: withColumns("public", { u: { gen_t_active: () => null } }),
  },
  {
    name: "matview-relation",
    why:
      "`v` becomes a MATERIALIZED VIEW over the real rows. The adapter folds matviews in beside views at three sites and analyses their definition instead of the catalog flag — PostgreSQL propagates no `attnotnull` to either — and nothing checked that the two behave alike. The corpus joins `v` in every deep structure, so the definition analysis is exercised across the whole space.",
    covers: ["materialized-view"],
    patch: `
ALTER TABLE v RENAME TO gen_v_base;
CREATE MATERIALIZED VIEW v AS SELECT id, u_id, amount FROM gen_v_base;
`,
    registry: renamingTable("public", "v", "gen_v_base"),
    // The seed fills the base table; the matview holds a snapshot and is empty
    // until refreshed, which would make every structure over `v` vacuous.
    postLoad: `REFRESH MATERIALIZED VIEW v;`,
  },
  {
    name: "fk-chain",
    why:
      "Foreign-key entailment — 'a join on a NOT NULL foreign key always matches, so the referenced side never null-extends' — moves claims from nullable to notNull, which is the UNSOUND direction, and had ZERO generated coverage. `u.t_id` and `v.u_id` are already NOT NULL, so the key makes every join in the corpus non-extending and the engine promotes across the whole structural space at once.",
    covers: ["validated-single-column-foreign-key"],
    patch: KEY_CHAIN(""),
    registry: withColumns("public", RESOLVING_KEYS),
  },
  {
    name: "fk-deferrable",
    why:
      "The gate's control, and the half a wrong fix would break silently. A DEFERRABLE key is violable mid-transaction and observable there, so the adapter drops it and every promoted claim must come back. Same structures, same data, opposite verdict — if the adapter ever stopped gating, this variant fails where `fk-chain` still passes.",
    covers: ["deferrable-foreign-key"],
    patch: KEY_CHAIN(" DEFERRABLE"),
    registry: withColumns("public", RESOLVING_KEYS),
  },
  {
    name: "nn-domain",
    why:
      "A column TYPED by a NOT NULL domain is non-null in every stored row while `attnotnull` stays FALSE, so the engine upgrades a flag the catalog does not carry — again the unsound direction. Applied to `t.name` and `u.val`, which the corpus projects, COALESCEs and joins on, so the upgrade is observed through every wrapper rather than at one site.",
    covers: ["domain-not-null", "domain-over-scalar"],
    patch: `
CREATE DOMAIN gen_nn_text AS text NOT NULL;
ALTER TABLE t ALTER COLUMN name TYPE gen_nn_text;
ALTER TABLE u ALTER COLUMN val TYPE gen_nn_text;
`,
  },
  {
    name: "inherit-child",
    why:
      "`ALTER TABLE ONLY t … SET NOT NULL` leaves a child free to store the NULL the parent forbids, and `FROM t` scans the whole tree — so the parent's own flag is the wrong question and `notNullTree` is the right one. The corpus reads `t.name` everywhere, so a child row with a NULL name falsifies any claim that took the parent's flag.",
    covers: ["inheritance-parent-with-children", "not-null-on-the-parent-only"],
    patch: `
CREATE TABLE gen_t_child () INHERITS (t);
ALTER TABLE ONLY t ALTER COLUMN name SET NOT NULL;
`,
  },
  {
    name: "second-schema",
    why:
      "The corpus references `t`, `u` and `v` UNQUALIFIED, so which relation they name is a search-path question — the one sweep-3 found the engine had backwards. A shadow schema first in the path makes every structure resolve through `inPath`, with the public originals still present as the wrong answer.",
    covers: [
      "second-schema",
      "relation-name-in-two-schemas",
      "function-overloaded-across-schemas",
    ],
    searchPath: ["app_s", "public"],
    patch: `
CREATE SCHEMA app_s;
CREATE TABLE app_s.t (id integer NOT NULL, name text, val text, active boolean NOT NULL);
CREATE TABLE app_s.u (id integer NOT NULL, t_id integer NOT NULL, email text NOT NULL, val text, status text);
CREATE TABLE app_s.v (id integer NOT NULL, u_id integer NOT NULL, amount numeric);
-- A cross-schema OVERLOAD of a name the corpus calls. gfn_sd exists in
-- public taking text; this one takes integer, so an unqualified call has
-- candidates in TWO schemas with different signatures — the shape sweep-3
-- found the engine had backwards, and which it must now resolve by merging
-- candidates across the path rather than stopping at the first schema.
CREATE FUNCTION app_s.gfn_sd(a integer) RETURNS text
  LANGUAGE sql AS $$ SELECT a::text $$;
`,
    get registry(): GeneratorRegistry {
      const { byType } = fixtureGeneratorRegistry;
      return {
        ...fixtureGeneratorRegistry,
        // The registry is schema-keyed on BOTH tiers, and registering a column
        // the schema does not have is an error — so a new schema mirrors the
        // public generators for exactly the tables it actually declares.
        byType: { ...byType, app_s: byType.public! },
        byColumn: {
          ...byColumn(),
          app_s: {
            t: columnsOf("public", "t"),
            u: { ...columnsOf("public", "u"), ...RESOLVING_KEYS.u },
            v: columnsOf("public", "v"),
          },
        },
      };
    },
  },
];
