import type { PGlite } from "@electric-sql/pglite";

/**
 * Reset a PGlite instance to a clean state for test isolation.
 *
 * Drops ALL non-system schemas (including `public`), recreates `public`,
 * recreates the `plpgsql_check` extension, and resets session GUCs
 * (`search_path`, `check_function_bodies`) to defaults.
 *
 * After cleanup:
 * - No user tables, functions, triggers, types, or domains exist.
 * - `public` schema is empty and available.
 * - `plpgsql_check` extension is loaded (functions in `public`, filtered by `deptype='e'`).
 * - Session GUCs are at defaults (no leaked `SET search_path` from migrations).
 *
 * The `xmin` counter keeps increasing (PG never resets it), but our diff
 * only compares before/after snapshots within a single `applyMigration`
 * call — absolute `xmin` values don't matter.
 */
export async function cleanupPg(pg: PGlite): Promise<void> {
  // Reset session GUCs FIRST — a migration may have done `SET search_path TO s1`
  // (non-LOCAL) which persists. If we drop s1 before resetting, search_path
  // points to a non-existent schema and CREATE EXTENSION fails with
  // "no schema has been selected to create in".
  await pg.exec("RESET search_path;");
  await pg.exec("RESET check_function_bodies;");

  // Drop all non-system schemas (CASCADE drops everything in them).
  await pg.exec(`
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN
        SELECT nspname FROM pg_namespace
        WHERE nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
          AND nspname NOT LIKE 'pg_temp_%'
          AND nspname NOT LIKE 'pg_toast_temp_%'
      LOOP
        EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', r.nspname);
      END LOOP;
    END;
    $$;
  `);

  // Drop any remaining extensions (DROP SCHEMA CASCADE drops their functions,
  // but the extension registration in pg_extension persists).
  await pg.exec(`
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN SELECT extname FROM pg_extension WHERE extname != 'plpgsql'
      LOOP
        EXECUTE format('DROP EXTENSION IF EXISTS %I CASCADE', r.extname);
      END LOOP;
    END;
    $$;
  `);

  // Recreate public schema.
  await pg.exec("CREATE SCHEMA public;");

  // Recreate the plpgsql_check extension.
  await pg.exec("CREATE EXTENSION plpgsql_check;");
}
