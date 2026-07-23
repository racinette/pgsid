import type { PGlite } from "@electric-sql/pglite";
import type { Node } from "libpg-query";
import {
  parseSql,
  parseMigrationFile,
  mapStrippedToOriginal,
  getFunctionName,
  formatFunctionRef,
  getFunctionLanguage,
  getDoBlockBody,
  getBodyOffsetFromAst,
  type MigrationFile,
  type ParsedStatement,
} from "./ast.js";
import {
  type SqlDiagnostic,
  type PlpgsqlCheckRow,
  DatabaseError,
  extractParseDiagnostic,
  extractExecDiagnostic,
  extractPlpgsqlCheckDiagnostic,
  normalizeSeverity,
} from "./errors.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Provenance for a function that survives in pg_proc.
 *
 * References the statement that last defined the body by `(migrationIndex, statementHash)`
 * — NOT by byte offsets. Byte offsets are resolved on demand at validation time
 * via `MigrationFile.statements` (which are re-parsed when the file is edited).
 *
 * Body fields (`statementHash`, `bodyText`) are updated only when `prosrc`
 * changes (body change). Metadata fields (`signature`, `language`) are updated
 * on any change (xmin/ctid). The invariant `prov.bodyText === current prosrc`
 * holds at all times.
 */
interface FunctionProvenance {
  /** pg_proc OID of the function. */
  oid: number;
  /** Which migration file (index into `migrations` map). */
  migrationIndex: number;
  /** Canonicalized AST hash of the statement that last defined the body. */
  statementHash: string;
  /** The function body text (= pg_proc.prosrc). Always matches current prosrc. */
  bodyText: string;
  /** Language name: "plpgsql" or "sql". */
  language: string;
  /** Regprocedure signature, e.g. `"public"."my_func"(int4)`. Updated on any change. */
  signature: string;
}

/**
 * Provenance for a trigger that survives in pg_trigger.
 *
 * Used at validation time to emit `relatedLocations` diagnostics pointing at
 * the `CREATE TRIGGER` statement when the trigger function has an error.
 */
interface TriggerProvenance {
  /** pg_trigger OID. */
  oid: number;
  /** Which migration file. */
  migrationIndex: number;
  /** Canonicalized AST hash of the statement that created this trigger. */
  statementHash: string;
  /** The relation (table/view) the trigger is on. */
  relation: string;
  /** NEW TABLE transition table name, or null. */
  newTable: string | null;
  /** OLD TABLE transition table name, or null. */
  oldTable: string | null;
}

/**
 * Context passed to every hook. Carries everything the hooks need.
 * The `migration` is a `MigrationFile` (mutable — re-parsed on edit).
 * Byte offsets (`stmtStart`, `stmtEnd`, `stmtBytes`) are the current
 * statement's offsets in stripped space — used for execution and diff,
 * NOT stored in provenance.
 */
interface StmtContext {
  pg: PGlite;
  migration: MigrationFile;
  stmt: Node;
  kind: string;
  statementHash: string;
  stmtStart: number;
  stmtEnd: number;
  stmtText: string;
  stmtBytes: Buffer;
}

/**
 * Lightweight pg_proc row state — no `prosrc` (fetched on-demand when a
 * change is detected). We diff `xmin` and `ctid` to detect whether a
 * function was touched by a statement.
 */
interface PgProcRowState {
  xmin: string;
  ctid: string;
}

/**
 * A snapshot of a pg_trigger row.
 */
interface PgTriggerRowState {
  relation: string;
  tgfoid: number;
  tgnewtable: string | null;
  tgoldtable: string | null;
  xmin: string;
  ctid: string;
}

/**
 * Before-state returned by `onBeforeStatementApplied`.
 */
interface BeforeState {
  pg_proc?: Map<number, PgProcRowState>;
  pg_trigger?: Map<number, PgTriggerRowState>;
}

/**
 * Thrown by hooks to halt the current migration file with diagnostics.
 * The executor catches this, rolls back the transaction, and returns the
 * diagnostics as the migration's result.
 */
class StmtDiagnosticsError extends Error {
  constructor(public diagnostics: SqlDiagnostic[]) {
    super(diagnostics.map(d => d.message).join("; "));
    this.name = "StmtDiagnosticsError";
  }
}

// ---------------------------------------------------------------------------
// SchemaBuilder
// ---------------------------------------------------------------------------

/**
 * Manages schema state across multiple migration files and validates
 * surviving functions after all migrations are applied.
 *
 * Two phases:
 * 1. **Apply** — call `applyMigration(pg, source, migrationIndex)` for each
 *    file in order. Statements are executed inside a transaction; the class
 *    observes each statement's effect on `pg_proc` via a before/after diff
 *    and records provenance for created/replaced functions.
 * 2. **Validate** — call `validate(pg)` after all migrations. The class
 *    queries `pg_proc` for surviving user functions, runs `plpgsql_check` or
 *    re-CREATE validation per function, and returns all diagnostics.
 *
 * The class is **unaware of CONCURRENTLY stripping**. Provenance offsets are
 * in stripped space; remapping to original file coordinates happens in
 * `validate()` via the stored `removals` per migration.
 */
export class SchemaBuilder {
  // oid → function provenance. Updated during apply; read during validate.
  private provenance = new Map<number, FunctionProvenance>();

  // oid → trigger provenance. Updated during apply; read during validate.
  private triggerProvenance = new Map<number, TriggerProvenance>();

  // Per-migration files (mutable — re-parsed on edit). Keyed by migration index.
  private migrations = new Map<number, MigrationFile>();

  // Counter for temp functions created during DO block pre-checks.
  private doBlockCounter = 0;

  /**
   * @internal — for testing only. Returns a snapshot of the provenance map
   * with plain data (no internal references).
   */
  getProvenanceForTesting(): Map<number, {
    migrationIndex: number;
    statementHash: string;
    bodyText: string;
    language: string;
    signature: string;
  }> {
    return new Map([...this.provenance.entries()].map(([oid, prov]) => [oid, {
      migrationIndex: prov.migrationIndex,
      statementHash: prov.statementHash,
      bodyText: prov.bodyText,
      language: prov.language,
      signature: prov.signature,
    }]));
  }

  // -------------------------------------------------------------------------
  // Phase 1: Apply
  // -------------------------------------------------------------------------

  /**
   * Apply a single migration file. Parses, preprocesses (strip CONCURRENTLY),
   * and executes each statement inside a transaction. Hooks fire before/after
   * each statement to track pg_proc changes and validate DO blocks.
   *
   * On failure: rolls back, returns `{ success: false, diagnostics }`.
   * On success: commits, returns `{ success: true, diagnostics: [] }`.
   */
  async applyMigration(
    pg: PGlite,
    source: Buffer,
    migrationIndex: number,
  ): Promise<{ success: boolean; diagnostics: SqlDiagnostic[] }> {
    // 1. Parse the migration file into a statement chain with hashes.
    let migration: MigrationFile;
    try {
      migration = await parseMigrationFile(source, migrationIndex);
    } catch (err) {
      // Parse error — could be in the original source or the stripped content.
      const diag = extractParseDiagnostic(err, 0, source);
      return { success: false, diagnostics: [diag] };
    }

    // 2. Store the migration file (mutable — re-parsed on edit).
    this.migrations.set(migrationIndex, migration);

    // 3. Begin transaction. Disable function body validation for the whole txn.
    await pg.query("BEGIN");
    await pg.query("SET LOCAL check_function_bodies TO off");

    try {
      for (const stmt of migration.statements) {
        const ctx: StmtContext = {
          pg,
          migration,
          stmt: stmt.stmt,
          kind: stmt.kind,
          statementHash: stmt.hash,
          stmtStart: stmt.stmtStart,
          stmtEnd: stmt.stmtEnd,
          stmtText: stmt.text,
          stmtBytes: stmt.bytes,
        };

        // --- Before: pre-checks, snapshots ---
        let before: BeforeState;
        try {
          before = await this.onBeforeStatementApplied(ctx);
        } catch (err) {
          if (err instanceof StmtDiagnosticsError) {
            await pg.query("ROLLBACK");
            return { success: false, diagnostics: err.diagnostics };
          }
          throw err;
        }

        // --- Execute ---
        try {
          await pg.exec(stmt.text);
        } catch (err) {
          // Exec failed — wrap into StmtDiagnosticsError (always throws).
          try { await this.onStatementApplicationFailed(ctx, err); } catch (e) {
            if (e instanceof StmtDiagnosticsError) {
              await pg.query("ROLLBACK");
              return { success: false, diagnostics: e.diagnostics };
            }
            throw e;
          }
        }

        // --- After: diff pg_proc, record provenance ---
        await this.onAfterStatementApplied(ctx, before);
      }

      await pg.query("COMMIT");
      return { success: true, diagnostics: [] };
    } catch (err) {
      try { await pg.query("ROLLBACK"); } catch { /* ignore */ }
      if (err instanceof StmtDiagnosticsError) {
        return { success: false, diagnostics: err.diagnostics };
      }
      // Unexpected error — wrap as a single diagnostic.
      const diag: SqlDiagnostic = {
        message: err instanceof Error ? err.message : String(err),
        code: undefined,
        severity: "error",
        hint: undefined,
        detail: undefined,
        range: null,
        original: { source: "pglite", error: err as any },
      };
      return { success: false, diagnostics: [diag] };
    }
  }

  // -------------------------------------------------------------------------
  // Hooks
  // -------------------------------------------------------------------------

  /**
   * Pre-checks and snapshots before a statement is executed.
   *
   * Responsibilities:
   * - **DO blocks**: validate the body via a temp function + plpgsql_check.
   *   If dirty, throw `StmtDiagnosticsError` to halt this file. If clean,
   *   let the executor run the DO block.
   * - **All statements**: snapshot `pg_proc` and `pg_trigger` before and
   *   after. Any statement can indirectly create/modify/drop functions or
   *   triggers — e.g. `SELECT setup()` where `setup()` does
   *   `EXECUTE 'CREATE FUNCTION ...'`, or `INSERT INTO t` firing a trigger
   *   that creates functions, or `ALTER TABLE ... DROP COLUMN ... CASCADE`
   *   dropping functions using `%TYPE`. Snapshotting around every statement
   *   ensures 100% coverage without maintaining a fragile allowlist.
   *
   * For `CreateFunctionStmt`/`DropFunctionStmt`, the `pg_proc` snapshot is
   * filtered by `proname` (targeted, cheaper). For all other statements,
   * the snapshot is broad (all user functions).
   */
  async onBeforeStatementApplied(ctx: StmtContext): Promise<BeforeState> {
    if (ctx.kind === "DoStmt") {
      await this.validateDoBlock(ctx);
    }

    // Snapshot pg_proc around every statement. For CreateFunctionStmt/
    // DropFunctionStmt, filter by proname (targeted). For everything else,
    // snapshot broadly — any statement could indirectly touch pg_proc.
    const proname = (ctx.kind === "CreateFunctionStmt" || ctx.kind === "DropFunctionStmt")
      ? getFunctionName(ctx.stmt)?.name
      : undefined;

    return {
      pg_proc: await this.snapshotPgProc(ctx.pg, proname),
      pg_trigger: await this.snapshotPgTrigger(ctx.pg),
    };
  }

  /**
   * Diffs the snapshots and records/updates provenance.
   *
   * Checks which fields are present in `before` and diffs accordingly.
   * For `pg_proc`:
   * - New OID → CREATE. Record provenance.
   * - Same OID, xmin or ctid changed → REPLACE. Update provenance.
   *   This detects same-body CREATE OR REPLACE (PG still UPDATEs the row,
   *   bumping xmin/ctid even when prosrc is identical) and disambiguates
   *   in the multi-schema case (only the replaced function's row changes).
   * - Unchanged → skip.
   * - OID in before but not after → DROP. Remove provenance.
   */
  async onAfterStatementApplied(ctx: StmtContext, before: BeforeState): Promise<void> {
    if (before.pg_proc) {
      // Re-query with the same filter as the before snapshot.
      const proname = (ctx.kind === "CreateFunctionStmt" || ctx.kind === "DropFunctionStmt")
        ? getFunctionName(ctx.stmt)?.name
        : undefined;
      const after = await this.snapshotPgProc(ctx.pg, proname);

      // Diff: new + changed.
      for (const [oid, afterState] of after) {
        const beforeState = before.pg_proc.get(oid);
        if (beforeState === undefined) {
          // New function — fetch prosrc, record body provenance.
          const prosrc = await this.fetchProsrc(ctx.pg, oid);
          await this.recordProvenance(ctx, oid, prosrc, true);
        } else if (
          beforeState.xmin !== afterState.xmin ||
          beforeState.ctid !== afterState.ctid
        ) {
          // Row touched — fetch prosrc, compare with stored bodyText.
          const prosrc = await this.fetchProsrc(ctx.pg, oid);
          const existing = this.provenance.get(oid);
          const isBodyChange = !existing || existing.bodyText !== prosrc;
          await this.recordProvenance(ctx, oid, prosrc, isBodyChange);
        }
      }

      // Diff: dropped.
      for (const oid of before.pg_proc.keys()) {
        if (!after.has(oid)) {
          this.provenance.delete(oid);
        }
      }
    }

    if (before.pg_trigger) {
      const after = await this.snapshotPgTrigger(ctx.pg);

      // Diff: new + changed.
      for (const [oid, afterState] of after) {
        const beforeState = before.pg_trigger.get(oid);
        if (beforeState === undefined) {
          this.recordTriggerProvenance(ctx, oid, afterState);
        } else if (
          beforeState.xmin !== afterState.xmin ||
          beforeState.ctid !== afterState.ctid
        ) {
          this.recordTriggerProvenance(ctx, oid, afterState);
        }
      }

      // Diff: dropped.
      for (const oid of before.pg_trigger.keys()) {
        if (!after.has(oid)) {
          this.triggerProvenance.delete(oid);
        }
      }
    }
  }

  /**
   * Wraps an exec error into `StmtDiagnosticsError` and throws (always).
   * Extracts a diagnostic from the PG error, maps the position to original
   * file space, and fills the statement range as fallback.
   */
  async onStatementApplicationFailed(ctx: StmtContext, err: unknown): Promise<never> {
    const { removals, source } = ctx.migration;
    const diag = extractExecDiagnostic(err, 0, {
      stmtStrippedOffset: ctx.stmtStart,
      removals,
      mapStrippedToOriginal,
      source,
    });
    // Fill statement range if the diagnostic has no precise range.
    if (diag.range === null) {
      diag.range = {
        start: mapStrippedToOriginal(removals, ctx.stmtStart),
        end: mapStrippedToOriginal(removals, ctx.stmtEnd),
      };
    }
    throw new StmtDiagnosticsError([diag]);
  }

  // -------------------------------------------------------------------------
  // Phase 2: Validate
  // -------------------------------------------------------------------------

  /**
   * Validate all surviving user functions after migrations are applied.
   *
   * Queries `pg_proc` for surviving user functions, intersects with tracked
   * provenance, and validates each:
   * - **PL/pgSQL**: `plpgsql_check_function_tb(signature)` → extract diagnostics.
   * - **SQL**: re-CREATE via `pg_get_functiondef` with `check_function_bodies=on`
   *   → extract diagnostics from the exec error.
   *
   * Returns all diagnostics (collect-all, no halt).
   */
  async validate(pg: PGlite): Promise<SqlDiagnostic[]> {
    // Wrap in a transaction: validateSqlFunction uses SAVEPOINT for
    // isolation, which requires a transaction block.
    await pg.query("BEGIN");
    try {
      // Query surviving user functions (exclude aggregates — no body to validate).
      const surviving = await pg.query<{
        oid: number;
        proname: string;
        lanname: string;
        prosrc: string;
        def: string;
        is_trigger: boolean;
      }>(`
        SELECT p.oid, p.proname, l.lanname AS lanname, p.prosrc,
               pg_get_functiondef(p.oid) AS def,
               (p.prorettype = (SELECT oid FROM pg_type WHERE typname = 'trigger')) AS is_trigger
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        JOIN pg_language l  ON l.oid  = p.prolang
        WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
          AND n.nspname NOT LIKE 'pg_temp_%'
          AND l.lanname IN ('plpgsql', 'sql')
          AND p.prokind != 'a'
          AND NOT EXISTS (
            SELECT 1 FROM pg_depend d
            WHERE d.objid = p.oid AND d.deptype = 'e'
          );
      `);

      const allDiagnostics: SqlDiagnostic[] = [];

      for (const row of surviving.rows) {
        const prov = this.provenance.get(row.oid);
        if (!prov) {
          // No provenance — function existed before our apply or was created
          // by an extension/DO block we didn't track. Skip validation.
          continue;
        }

        if (row.lanname === "plpgsql") {
          const diags = await this.validatePlpgsqlFunction(
            pg, row.oid, prov, row.is_trigger,
          );
          allDiagnostics.push(...diags);
        } else if (row.lanname === "sql") {
          const diags = await this.validateSqlFunction(pg, row.oid, prov);
          allDiagnostics.push(...diags);
        }
      }

      return allDiagnostics;
    } finally {
      await pg.query("ROLLBACK");
    }
  }

  // -------------------------------------------------------------------------
  // Internal: pg_proc snapshot
  // -------------------------------------------------------------------------

  /**
   * Snapshot `pg_proc` as `oid → { prosrc, xmin, ctid }` for user functions.
   *
   * `xmin` and `ctid` are used to detect whether a function was touched by
   * a statement — even when the body is identical (PG still UPDATEs the row,
   * bumping both). This also disambiguates when multiple schemas have the
   * same function name and body: only the replaced one's row is modified.
   *
   * @param proname If provided, filter by function name (targeted snapshot
   *   for `CreateFunctionStmt`/`DropFunctionStmt`). If omitted, snapshot all
   *   user functions (broader, for `DoStmt` which may create functions dynamically).
   */
  private async snapshotPgProc(
    pg: PGlite,
    proname?: string,
  ): Promise<Map<number, PgProcRowState>> {
    const baseWhere = `
      n.nspname NOT IN ('pg_catalog', 'information_schema')
      AND n.nspname NOT LIKE 'pg_temp_%'
      AND l.lanname IN ('plpgsql', 'sql')
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.objid = p.oid AND d.deptype = 'e'
      )
    `;
    const select = "p.oid, p.prosrc, p.xmin::text AS xmin, p.ctid::text AS ctid";
    const query = proname
      ? `SELECT ${select} FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         JOIN pg_language l  ON l.oid  = p.prolang
         WHERE ${baseWhere} AND p.proname = $1;`
      : `SELECT ${select} FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         JOIN pg_language l  ON l.oid  = p.prolang
         WHERE ${baseWhere};`;
    const params = proname ? [proname] : [];
    const res = await pg.query<{ oid: number; xmin: string; ctid: string }>(query, params);
    return new Map(res.rows.map(r => [r.oid, {
      xmin: r.xmin,
      ctid: r.ctid,
    }]));
  }

  /**
   * Fetch `prosrc` for a single function OID (tier-2 on-demand fetch).
   * Called only when the lightweight snapshot detects a change.
   */
  private async fetchProsrc(pg: PGlite, oid: number): Promise<string> {
    const res = await pg.query<{ prosrc: string }>(
      "SELECT prosrc FROM pg_proc WHERE oid = $1",
      [oid],
    );
    return res.rows[0]?.prosrc ?? "";
  }

  /**
   * Snapshot `pg_trigger` as `oid → row state` for user triggers.
   * Only non-internal triggers (user-created, not system-generated constraints).
   */
  private async snapshotPgTrigger(
    pg: PGlite,
  ): Promise<Map<number, PgTriggerRowState>> {
    const res = await pg.query<{
      oid: number; relation: string; tgfoid: number;
      tgnewtable: string | null; tgoldtable: string | null;
      xmin: string; ctid: string;
    }>(`
      SELECT t.oid,
             t.tgrelid::regclass::text AS relation,
             t.tgfoid,
             t.tgnewtable,
             t.tgoldtable,
             t.xmin::text AS xmin,
             t.ctid::text AS ctid
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE NOT t.tgisinternal
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')
        AND n.nspname NOT LIKE 'pg_temp_%';
    `);
    return new Map(res.rows.map(r => [r.oid, {
      relation: r.relation,
      tgfoid: r.tgfoid,
      tgnewtable: r.tgnewtable,
      tgoldtable: r.tgoldtable,
      xmin: r.xmin,
      ctid: r.ctid,
    }]));
  }

  // -------------------------------------------------------------------------
  // Internal: provenance recording
  // -------------------------------------------------------------------------

  /**
   * Record or update provenance for a function OID.
   * Called from `onAfterStatementApplied` when the diff detects a new or
   * replaced function.
   *
   * For `CreateFunctionStmt`: extract body, language, and signature from the
  /**
   * Record or update provenance for a function OID.
   *
   * When `isBodyChange` is true (or new function): update all fields —
   * `statementHash` points at the current statement, `bodyText` is the
   * current prosrc.
   *
   * When `isBodyChange` is false (metadata-only: RENAME, OWNER, SET):
   * preserve `statementHash` and `bodyText` from the existing provenance
   * (pointing at the last body-defining statement), update only `signature`
   * and `language`.
   */
  private async recordProvenance(
    ctx: StmtContext,
    oid: number,
    prosrc: string,
    isBodyChange: boolean,
  ): Promise<void> {
    const existing = this.provenance.get(oid);

    // Always fetch metadata for the signature (name may have changed via RENAME).
    let language: string;
    let signature: string;

    if (ctx.kind === "CreateFunctionStmt") {
      language = getFunctionLanguage(ctx.stmt) ?? "sql";
      signature = formatFunctionRef(ctx.stmt) ?? "";
    } else {
      // Dynamic creation or metadata-only change — query pg_proc.
      const meta = await ctx.pg.query<{ lanname: string; def: string }>(
        `SELECT l.lanname, pg_get_functiondef(p.oid) AS def
         FROM pg_proc p JOIN pg_language l ON l.oid = p.prolang
         WHERE p.oid = $1`,
        [oid],
      );
      if (meta.rows.length > 0) {
        language = meta.rows[0]!.lanname;
        const defParsed = await parseSql(meta.rows[0]!.def);
        const defStmt = defParsed.stmts![0]!.stmt!;
        signature = formatFunctionRef(defStmt) ?? "";
      } else {
        language = existing?.language ?? "sql";
        signature = existing?.signature ?? "";
      }
    }

    if (isBodyChange || !existing) {
      // Body change (or new function) — update everything.
      this.provenance.set(oid, {
        oid,
        migrationIndex: ctx.migration.index,
        statementHash: ctx.statementHash,
        bodyText: prosrc,
        language,
        signature,
      });
    } else {
      // Metadata-only change — preserve body provenance, update metadata.
      this.provenance.set(oid, {
        ...existing,
        language,
        signature,
      });
    }
  }

  /**
   * Record or update provenance for a trigger OID.
   */
  private recordTriggerProvenance(
    ctx: StmtContext,
    oid: number,
    state: PgTriggerRowState,
  ): void {
    this.triggerProvenance.set(oid, {
      oid,
      migrationIndex: ctx.migration.index,
      statementHash: ctx.statementHash,
      relation: state.relation,
      newTable: state.tgnewtable,
      oldTable: state.tgoldtable,
    });
  }

  /**
   * Find the byte offset of the function body within the statement.
   * Uses `Buffer.indexOf` for byte-level search — `String.indexOf` would
   * return UTF-16 code unit indices, which differ from byte offsets when
   * the statement contains multi-byte UTF-8 characters before the body
   * (e.g. comments with accented characters or non-Latin scripts).
   */
  private findBodyOffsetInStatement(stmtBytes: Buffer, bodyText: string): number {
    if (bodyText) {
      const idx = stmtBytes.indexOf(bodyText, 0, "utf8");
      if (idx !== -1) return idx;
    }
    // Fallback: find the first dollar-quote delimiter.
    const stmtText = stmtBytes.toString("latin1");
    const m = /\$[\w]*\$/.exec(stmtText);
    if (m) return m.index + m[0].length;
    return -1;
  }

  /**
   * Resolve `(migrationIndex, statementHash)` to the matching `ParsedStatement`
   * and its `MigrationFile`. Returns null if the migration file or the statement
   * is not found (deleted or fundamentally changed).
   *
   * This is the bridge between immutable provenance (set during apply) and
   * mutable file state (re-parsed on edit). The statement's byte offsets are
   * always fresh from the latest parse.
   */
  private resolveStatement(
    migrationIndex: number,
    stmtHash: string,
  ): { file: MigrationFile; stmt: ParsedStatement } | null {
    const file = this.migrations.get(migrationIndex);
    if (!file) return null;
    const stmt = file.statements.find(s => s.hash === stmtHash);
    if (!stmt) return null;
    return { file, stmt };
  }

  // -------------------------------------------------------------------------
  // Internal: DO block pre-check
  // -------------------------------------------------------------------------

  /**
   * Validate a DO block before it's executed.
   *
   * Creates a `pg_temp` function with the same body, runs
   * `plpgsql_check_function_tb` on it, and throws `StmtDiagnosticsError`
   * if the check finds errors. The temp function is always dropped.
   *
   * If the temp function CREATE fails (syntax error in the body), falls
   * back to letting the executor run the DO block directly — PG will
   * report the same syntax error with a position.
   */
  private async validateDoBlock(ctx: StmtContext): Promise<void> {
    const { removals, source } = ctx.migration;
    const bodyText = getDoBlockBody(ctx.stmt) ?? "";
    const tempName = `pg_temp.pgsid_do_check_${this.doBlockCounter++}`;

    // Create temp function with the same body.
    try {
      await ctx.pg.exec(
        `CREATE FUNCTION ${tempName}() RETURNS void LANGUAGE plpgsql AS $$${bodyText}$$;`,
      );
    } catch {
      // Temp CREATE failed — body has a syntax error. Let the executor
      // run the DO block; PG will report the error with a position.
      return;
    }

    // Run plpgsql_check on the temp function.
    let checkRows: PlpgsqlCheckRow[];
    try {
      const res = await ctx.pg.query<PlpgsqlCheckRow>(
        `SELECT * FROM plpgsql_check_function_tb('${tempName}()');`,
      );
      checkRows = res.rows;
    } catch {
      // plpgsql_check itself failed — drop temp and let executor run.
      try { await ctx.pg.exec(`DROP FUNCTION ${tempName}();`); } catch { /* ignore */ }
      return;
    }

    // Drop temp function.
    try { await ctx.pg.exec(`DROP FUNCTION ${tempName}();`); } catch { /* ignore */ }

    if (checkRows.length === 0) return; // clean — let executor run the DO block.

    // plpgsql_check found errors — extract diagnostics and throw to halt.
    const bodyOffsetInStripped = this.findBodyOffsetInStatement(ctx.stmtBytes, bodyText);
    const bodyOffsetInFile = bodyOffsetInStripped !== -1
      ? mapStrippedToOriginal(removals, ctx.stmtStart + bodyOffsetInStripped)
      : mapStrippedToOriginal(removals, ctx.stmtStart);

    const diagnostics: SqlDiagnostic[] = checkRows.map(row =>
      extractPlpgsqlCheckDiagnostic(row, bodyOffsetInFile, bodyText, source),
    );

    // Fill statement range for diagnostics without a precise range.
    for (const diag of diagnostics) {
      if (diag.range === null) {
        diag.range = {
          start: mapStrippedToOriginal(removals, ctx.stmtStart),
          end: mapStrippedToOriginal(removals, ctx.stmtEnd),
        };
      }
    }

    throw new StmtDiagnosticsError(diagnostics);
  }

  // -------------------------------------------------------------------------
  // Internal: per-function validation (phase 2)
  // -------------------------------------------------------------------------

  /**
   * Validate a PL/pgSQL function via `plpgsql_check_function_tb`.
   * Maps diagnostics to the original migration file using stored provenance.
   *
   * For trigger functions (`RETURNS trigger`):
   * - Query `pg_trigger` for all triggers using this function (non-internal).
   * - For each trigger, call `plpgsql_check_function_tb` with the relation
   *   and transition table names (`newtable`/`oldtable` parameters).
   * - A function used by multiple triggers is checked once per trigger —
   *   the body might reference a column that exists on one table but not another.
   * - If no triggers are attached (orphan), skip validation — plpgsql_check
   *   can't resolve `NEW`/`OLD` without a relation.
   * - For each error, attach a `relatedLocations` entry pointing at the
   *   `CREATE TRIGGER` statement (from trigger provenance).
   */
  private async validatePlpgsqlFunction(
    pg: PGlite,
    oid: number,
    prov: FunctionProvenance,
    isTrigger: boolean,
  ): Promise<SqlDiagnostic[]> {
    // Resolve statement hash to current byte offsets.
    const resolved = this.resolveStatement(prov.migrationIndex, prov.statementHash);
    if (!resolved) return []; // statement not found — stale provenance.
    const { file: migration, stmt } = resolved;
    const { removals, source } = migration;

    // Compute body offset within the statement.
    let bodyOffset: number;
    if (stmt.kind === "CreateFunctionStmt") {
      bodyOffset = getBodyOffsetFromAst(stmt.stmt, stmt.bytes, stmt.stmtStart);
      if (bodyOffset < 0) {
        bodyOffset = this.findBodyOffsetInStatement(stmt.bytes, prov.bodyText);
      }
    } else if (stmt.kind === "DoStmt") {
      bodyOffset = this.findBodyOffsetInStatement(stmt.bytes, prov.bodyText);
    } else {
      bodyOffset = -1;
    }

    // For trigger functions, query pg_trigger for all trigger bindings.
    let triggerBindings: { relation: string; newTable: string | null; oldTable: string | null; triggerOid: number }[] = [];
    if (isTrigger) {
      const trgRes = await pg.query<{
        oid: number; relation: string; tgnewtable: string | null; tgoldtable: string | null;
      }>(`
        SELECT t.oid, t.tgrelid::regclass::text AS relation,
               t.tgnewtable, t.tgoldtable
        FROM pg_trigger t
        WHERE t.tgfoid = $1 AND NOT t.tgisinternal;
      `, [oid]);
      triggerBindings = trgRes.rows.map(r => ({
        relation: r.relation,
        newTable: r.tgnewtable,
        oldTable: r.tgoldtable,
        triggerOid: r.oid,
      }));
      if (triggerBindings.length === 0) return []; // orphan — can't validate
    }

    const allDiagnostics: SqlDiagnostic[] = [];

    const checkCalls = isTrigger
      ? triggerBindings.map(b => ({
          query: `SELECT * FROM plpgsql_check_function_tb('${prov.signature.replace(/'/g, "''")}', '${b.relation.replace(/'/g, "''")}'${b.newTable ? `, newtable := '${b.newTable.replace(/'/g, "''")}'` : ""}${b.oldTable ? `, oldtable := '${b.oldTable.replace(/'/g, "''")}'` : ""});`,
          triggerOid: b.triggerOid,
        }))
      : [{
          query: `SELECT * FROM plpgsql_check_function_tb('${prov.signature.replace(/'/g, "''")}');`,
          triggerOid: null as number | null,
        }];

    for (const { query, triggerOid } of checkCalls) {
      let checkRows: PlpgsqlCheckRow[];
      try {
        const res = await pg.query<PlpgsqlCheckRow>(query);
        checkRows = res.rows;
      } catch {
        continue;
      }

      if (checkRows.length === 0) continue;

      const canMapPosition = bodyOffset >= 0;
      const bodyOffsetInFile = canMapPosition
        ? mapStrippedToOriginal(removals, stmt.stmtStart + bodyOffset)
        : -1;

      const diagnostics: SqlDiagnostic[] = checkRows.map(row =>
        canMapPosition
          ? extractPlpgsqlCheckDiagnostic(row, bodyOffsetInFile, prov.bodyText, source)
          : {
              message: row.message,
              code: row.sqlstate,
              severity: normalizeSeverity(row.level),
              hint: row.hint ?? undefined,
              detail: row.detail ?? undefined,
              range: null,
              original: { source: "plpgsql-check" as const, row },
            },
      );

      const stmtStartOriginal = mapStrippedToOriginal(removals, stmt.stmtStart);
      const stmtEndOriginal = mapStrippedToOriginal(removals, stmt.stmtEnd);
      for (const diag of diagnostics) {
        if (diag.range === null) {
          diag.range = { start: stmtStartOriginal, end: stmtEndOriginal };
        }

        if (triggerOid !== null) {
          const trgProv = this.triggerProvenance.get(triggerOid);
          if (trgProv) {
            const trgResolved = this.resolveStatement(trgProv.migrationIndex, trgProv.statementHash);
            if (trgResolved) {
              const { file: trgFile, stmt: trgStmt } = trgResolved;
              const trgStart = mapStrippedToOriginal(trgFile.removals, trgStmt.stmtStart);
              const trgEnd = mapStrippedToOriginal(trgFile.removals, trgStmt.stmtEnd);
              diag.relatedLocations = [{
                range: { start: trgStart, end: trgEnd },
                message: `trigger on table "${trgProv.relation}"`,
              }];
            }
          }
        }
      }

      allDiagnostics.push(...diagnostics);
    }

    return allDiagnostics;
  }

  /**
   * Validate a SQL function by re-issuing `pg_get_functiondef` with
   * `check_function_bodies=on`. The body is verbatim in both the re-issued
   * text and the original migration (verified by the AST comparison test
   * suite), so we can map the error position through the body offset.
   *
   * Position mapping:
   * - `err.position` is a 1-based byte offset into the re-issued `defText`.
   * - `defBodyOffset` is the byte offset of the body within `defText`.
   * - If `position > defBodyOffset` (error is in the body), we translate:
   *     `errorPosInBody = (position - 1) - defBodyOffset`
   *     `errorPosInStripped = prov.stmtStart + prov.bodyOffset + errorPosInBody`
   *     `errorPosInOriginal = mapStrippedToOriginal(removals, errorPosInStripped)`
   *   This works because the body text is identical in both texts.
   * - If the error is in the header (before the body), the re-issued text's
   *   header differs from the original migration's — we can't map. Fall back
   *   to the whole statement range.
   */
  private async validateSqlFunction(
    pg: PGlite,
    _oid: number,
    prov: FunctionProvenance,
  ): Promise<SqlDiagnostic[]> {
    // Resolve statement hash to current byte offsets.
    const resolved = this.resolveStatement(prov.migrationIndex, prov.statementHash);
    if (!resolved) return [];
    const { file: migration, stmt } = resolved;
    const { removals, source } = migration;

    // Compute body offset within the statement.
    let bodyOffset: number;
    if (stmt.kind === "CreateFunctionStmt") {
      bodyOffset = getBodyOffsetFromAst(stmt.stmt, stmt.bytes, stmt.stmtStart);
      if (bodyOffset < 0) {
        bodyOffset = this.findBodyOffsetInStatement(stmt.bytes, prov.bodyText);
      }
    } else {
      bodyOffset = this.findBodyOffsetInStatement(stmt.bytes, prov.bodyText);
    }

    // Get the function definition (re-runnable CREATE OR REPLACE).
    const res = await pg.query<{ def: string }>(
      `SELECT pg_get_functiondef($1) AS def;`,
      [prov.oid],
    );
    const defText = res.rows[0]!.def;

    await pg.query("SAVEPOINT pgsid_sql_validate");
    try {
      await pg.query("SET LOCAL check_function_bodies TO on");
      await pg.exec(defText);
      await pg.query("ROLLBACK TO SAVEPOINT pgsid_sql_validate");
      await pg.query("SET LOCAL check_function_bodies TO off");
      return [];
    } catch (err) {
      await pg.query("ROLLBACK TO SAVEPOINT pgsid_sql_validate");
      await pg.query("SET LOCAL check_function_bodies TO off");

      const defBodyOffset = this.findBodyOffsetInStatement(
        Buffer.from(defText, "utf8"), prov.bodyText,
      );

      const pos1 = err instanceof DatabaseError && err.position
        ? parseInt(err.position, 10) : NaN;

      let diag: SqlDiagnostic;

      if (defBodyOffset >= 0 && !Number.isNaN(pos1) && pos1 > defBodyOffset && bodyOffset >= 0) {
        diag = extractExecDiagnostic(err, 0, {
          stmtStrippedOffset: stmt.stmtStart + bodyOffset - defBodyOffset,
          removals,
          mapStrippedToOriginal,
          source,
        });
      } else {
        diag = extractExecDiagnostic(err, 0, {
          stmtStrippedOffset: 0,
          removals: [],
          mapStrippedToOriginal,
          source: undefined,
        });
      }

      if (diag.range === null) {
        diag.range = {
          start: mapStrippedToOriginal(removals, stmt.stmtStart),
          end: mapStrippedToOriginal(removals, stmt.stmtEnd),
        };
      }

      return [diag];
    }
  }
}
