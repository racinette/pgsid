import type { PGlite } from "@electric-sql/pglite";
import type { CatalogSnapshot } from "../../../src/catalog/types.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";

/**
 * The fixture corpus's catalogs, one per distinct `-- @search-path`.
 *
 * The corpus runs one schema and, until 2026-08-20, one catalog. Type-name
 * resolution depends on the search path — pg_catalog is searched FIRST unless
 * the path names it explicitly — so a fixture that wants to stand on the
 * shadowing side of that rule needs a catalog built with a different path.
 * Rebuilding per fixture would be wasteful; the SNAPSHOT is what costs, and
 * it is captured once and shared. Building a catalog over an existing
 * snapshot is cheap, so this memoizes one per path and no more.
 */
export type CatalogFor = (searchPath: readonly string[] | null) => Promise<NullabilityCatalog>;

const DEFAULT_PATH = ["public"];

export function catalogCache(snapshot: CatalogSnapshot): CatalogFor {
  const byPath = new Map<string, Promise<NullabilityCatalog>>();
  return (searchPath): Promise<NullabilityCatalog> => {
    const path = searchPath && searchPath.length > 0 ? [...searchPath] : DEFAULT_PATH;
    const key = path.join(",");
    const existing = byPath.get(key);
    if (existing) return existing;
    const built = buildNullabilityCatalog(snapshot, { searchPath: path });
    byPath.set(key, built);
    return built;
  };
}

/**
 * Put the SESSION on the fixture's path for the duration of `body`, and put
 * it back afterwards. A suite that EXECUTES a fixture must run it under the
 * same path the engine analysed it under, or the oracle is adjudicating a
 * different statement than the one that was claimed about.
 */
export async function withSearchPath<T>(
  pg: PGlite,
  searchPath: readonly string[] | null,
  body: () => Promise<T>,
): Promise<T> {
  if (!searchPath || searchPath.length === 0) return body();
  const previous = (
    await pg.query<{ search_path: string }>("SHOW search_path")
  ).rows[0]!.search_path;
  await pg.exec(`SET search_path = ${searchPath.join(", ")};`);
  try {
    return await body();
  } finally {
    await pg.exec(`SET search_path = ${previous};`);
  }
}

/**
 * The honour-or-refuse rule. A directive that some suites apply and others
 * quietly drop is worse than no directive: the dropping suite reports a
 * PASS on a claim it never checked. Any suite that reads fixtures and does
 * NOT implement the path axis calls this, and gets a loud failure the moment
 * a fixture starts using it.
 */
export function refuseSearchPathFixture(
  file: string,
  searchPath: readonly string[] | null,
  suite: string,
): void {
  if (!searchPath) return;
  throw new Error(
    `${file} declares \`-- @search-path ${searchPath.join(", ")}\`, and ${suite} ` +
      `does not implement the path axis. Implement it there (catalogCache + ` +
      `withSearchPath in fixture-catalog.ts) or move the fixture — do not let ` +
      `this suite report a pass on a claim it did not check.`,
  );
}
