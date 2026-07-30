// ---------------------------------------------------------------------------
// The data states every fixture is executed under.
//
// Two kinds, and they answer different questions.
//
// The hand-written states in `fixtures/data/` encode specific structural
// situations: a customer with a NULL name *and* a non-NULL `deleted_at`, a tag
// with no matching product, a soft-deleted row nothing references. Those are
// what make a negated conjunction fall through with its operand still NULL, or
// a MERGE fire `WHEN NOT MATCHED BY SOURCE`. They are constructed because
// volume does not reach them.
//
// The generated state gives breadth: every table in the catalog gets rows, so
// a fixture over a table nobody thought to seed still executes.
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CatalogSnapshot } from "../../../../src/catalog/types.js";
import { generateFixtureData } from "./generate.js";
import { fixtureGeneratorRegistry } from "./generators.js";

const DATA_DIR = join(__dirname, "..", "fixtures", "data");

/**
 * Applied in this order. `empty` first: it is the state most likely to falsify
 * a `notNull` claim, so a failure report leads with it.
 */
const STATIC_STATES = ["empty", "sparse", "dense", "uniform"] as const;

export interface DataState {
  name: string;
  /** Statements to apply to a freshly migrated database. May be empty. */
  sql: string;
}

export function loadDataStates(snapshot: CatalogSnapshot): DataState[] {
  const states: DataState[] = STATIC_STATES.map(name => ({
    name,
    sql: readFileSync(join(DATA_DIR, `${name}.sql`), "utf8"),
  }));

  const generated = generateFixtureData(snapshot, {
    registry: fixtureGeneratorRegistry,
  });
  states.push({ name: "generated", sql: generated.sql });

  // The generated SQL is derived, so it is not checked in; dump it when a
  // fixture's behaviour under it needs explaining.
  const dumpTo = process.env.DUMP_GENERATED_DATA;
  if (dumpTo) writeFileSync(dumpTo, generated.sql);

  return states;
}

/** True when the text carries at least one statement rather than only comments. */
export function hasStatements(sql: string): boolean {
  return sql.replace(/--[^\n]*/g, "").trim().length > 0;
}
