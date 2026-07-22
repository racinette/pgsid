import type { PGlite } from "@electric-sql/pglite";
import type { Node } from "libpg-query";
import {
  parseSql,
  getStatements,
  preprocess,
  stripConcurrently,
  mapStrippedToOriginal,
  getFunctionBody,
  getFunctionName,
  formatFunctionRef,
  getFunctionLanguage,
  getDoBlockBody,
  type Removal,
} from "./ast.js";
import {
  type SqlDiagnostic,
  type PlpgsqlCheckRow,
  DatabaseError,
  extractParseDiagnostic,
  extractExecDiagnostic,
  extractPlpgsqlCheckDiagnostic,
} from "./errors.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Per-migration context: the original file and its CONCURRENTLY-stripping
 * metadata. Stored once per migration file; referenced by provenance entries
 * so no lookup-by-index is needed at validation time.
 */
interface MigrationContext {
  index: number;
  source: Buffer;
  removals: Removal[];
}

/**
 * Provenance for a function that survives in pg_proc.
 *
 * All byte offsets are in **stripped** coordinate space (the preprocessed
 * migration text with CONCURRENTLY removed). They are remapped to original
 * file coordinates at diagnostic-emission time via `mapStrippedToOriginal`
 * using `migration.removals`.
 */
interface FunctionProvenance {
  /** pg_proc OID of the function. */
  oid: number;
  /** The migration file where this function was last created/replaced. */
  migration: MigrationContext;
  /** Byte range of the CREATE FUNCTION statement in stripped space. */
  stmtStart: number;
  stmtEnd: number;
  /** Byte offset of the function body (text between `$$ ... $$`) within the statement. */
  bodyOffset: number;
  /** The function body text (= pg_proc.prosrc, decoded by libpg-query). */
  bodyText: string;
  /** Language name: "plpgsql" or "sql". */
  language: string;
  /** Regprocedure signature, e.g. `"public"."my_func"(int4)`. */
  signature: string;
}

/**
 * Context passed to every hook. Carries everything the hooks need to:
 * - decide whether to snapshot (inspect `kind`),
 * - extract function metadata (inspect `stmt`),
 * - compute provenance byte ranges (`stmtStart`, `stmtEnd`, `stmtText`),
 * - map diagnostics to original file space (`migration.removals`, `migration.source`).
 */
interface StmtContext {
  /** The PGlite instance (same transaction as the executor). */
  pg: PGlite;
  /** The migration context for this file. */
  migration: MigrationContext;
  /** The parsed AST node for this statement. */
  stmt: Node;
  /** AST kind string, e.g. "CreateFunctionStmt", "DoStmt", "DropFunctionStmt". */
  kind: string;
  /** Byte range of the statement in stripped space [stmtStart, stmtEnd). */
  stmtStart: number;
  stmtEnd: number;
  /** The statement text in stripped space (what was actually exec'd). */
  stmtText: string;
  /** The statement bytes in stripped space (for byte-level offset computation). */
  stmtBytes: Buffer;
}

/**
 * A snapshot of a pg_proc row. We diff `xmin` and `ctid` to detect whether
 * a function was touched by a statement:
 * - `xmin` (transaction ID) changes across transactions (between migration files).
 * - `ctid` (physical tuple location) changes within the same transaction
 *   (multiple CREATE OR REPLACE of the same function in one migration file).
 * - `prosrc` is the body text, used for provenance recording.
 *
 * Using both `xmin` and `ctid` gives full coverage: if either changed, the
 * function was modified (even when the body is identical — PG still UPDATEs
 * the row, bumping both). This also disambiguates in the multi-schema case:
 * if `s1.foo()` and `s2.foo()` have the same name and body, only the
 * replaced one's `xmin`/`ctid` changes.
 */
interface PgProcRowState {
  prosrc: string;
  xmin: string;
  ctid: string;
}

/**
 * Before-state returned by `onBeforeStatementApplied`. An extensible object —
 * each field is an optional snapshot of a system catalog. `onAfterStatementApplied`
 * checks which fields are present and diffs accordingly.
 *
 * Currently only `pg_proc` is snapshotted. Future extensions may add
 * `pg_class`, `pg_type`, etc. without changing this type.
 */
interface BeforeState {
  /** oid → row state for user functions (filtered by proname when targeted). */
  pg_proc?: Map<number, PgProcRowState>;
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
  // oid → provenance. Updated during apply; read during validate.
  private provenance = new Map<number, FunctionProvenance>();

  // Per-migration contexts (source + removals). Referenced by provenance entries.
  private migrations: MigrationContext[] = [];

  // Counter for temp functions created during DO block pre-checks.
  private doBlockCounter = 0;

  /**
   * @internal — for testing only. Returns a snapshot of the provenance map
   * with plain data (no internal references).
   */
  getProvenanceForTesting(): Map<number, {
    migrationIndex: number;
    stmtStart: number;
    stmtEnd: number;
    bodyOffset: number;
    bodyText: string;
    language: string;
    signature: string;
  }> {
    return new Map([...this.provenance.entries()].map(([oid, prov]) => [oid, {
      migrationIndex: prov.migration.index,
      stmtStart: prov.stmtStart,
      stmtEnd: prov.stmtEnd,
      bodyOffset: prov.bodyOffset,
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
    // 1. Parse the original source.
    let parsed;
    try {
      parsed = await parseSql(source.toString("utf8"));
    } catch (err) {
      const diag = extractParseDiagnostic(err, 0, source);
      return { success: false, diagnostics: [diag] };
    }

    // 2. Preprocess (strip CONCURRENTLY only).
    const preprocessed = preprocess(source, parsed, stripConcurrently());
    const strippedContent = preprocessed.content;
    const removals = preprocessed.removals;

    // 3. Re-parse the stripped content to get statement boundaries.
    let strippedParsed;
    try {
      strippedParsed = await parseSql(strippedContent.toString("utf8"));
    } catch (err) {
      const diag = extractParseDiagnostic(err, 0, strippedContent);
      if (diag.range) {
        diag.range = {
          start: mapStrippedToOriginal(removals, diag.range.start),
          end: mapStrippedToOriginal(removals, diag.range.end),
        };
      }
      return { success: false, diagnostics: [diag] };
    }

    // 4. Get per-statement info.
    const statements = getStatements(strippedParsed, strippedContent);

    // 5. Build migration context (stored once, referenced by provenance).
    const migration: MigrationContext = { index: migrationIndex, source, removals };
    this.migrations.push(migration);

    // 6. Begin transaction. Disable function body validation for the whole txn.
    await pg.query("BEGIN");
    await pg.query("SET LOCAL check_function_bodies TO off");

    try {
      for (const stmtInfo of statements) {
        const ctx: StmtContext = {
          pg,
          migration,
          stmt: stmtInfo.stmt,
          kind: stmtInfo.kind,
          stmtStart: stmtInfo.start,
          stmtEnd: stmtInfo.end,
          stmtText: stmtInfo.text,
          stmtBytes: strippedContent.subarray(stmtInfo.start, stmtInfo.end),
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
          await pg.exec(stmtInfo.text);
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
   * - **Function statements** (`CreateFunctionStmt`, `DropFunctionStmt`):
   *   snapshot `pg_proc` by `proname` for the diff in `onAfterStatementApplied`.
   * - **Other statements**: return empty `{}` (no snapshot).
   */
  async onBeforeStatementApplied(ctx: StmtContext): Promise<BeforeState> {
    if (ctx.kind === "DoStmt") {
      // Validate the DO block body before execution.
      await this.validateDoBlock(ctx);
      // DO blocks can dynamically CREATE FUNCTION — snapshot broadly.
      return { pg_proc: await this.snapshotPgProc(ctx.pg) };
    }

    if (ctx.kind === "CreateFunctionStmt" || ctx.kind === "DropFunctionStmt") {
      const name = getFunctionName(ctx.stmt);
      const proname = name?.name;
      const snapshot = proname
        ? await this.snapshotPgProc(ctx.pg, proname)
        : await this.snapshotPgProc(ctx.pg);
      return { pg_proc: snapshot };
    }

    // TODO: handle CreateAggStmt, AlterFunctionStmt if needed.
    return {};
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
      // Re-query the same set of functions.
      let after: Map<number, PgProcRowState>;
      if (ctx.kind === "CreateFunctionStmt" || ctx.kind === "DropFunctionStmt") {
        const name = getFunctionName(ctx.stmt);
        after = await this.snapshotPgProc(ctx.pg, name?.name);
      } else {
        after = await this.snapshotPgProc(ctx.pg);
      }

      // Diff: new + changed.
      for (const [oid, afterState] of after) {
        const beforeState = before.pg_proc.get(oid);
        if (beforeState === undefined) {
          // New function — record provenance.
          await this.recordProvenance(ctx, oid, afterState.prosrc);
        } else if (
          beforeState.xmin !== afterState.xmin ||
          beforeState.ctid !== afterState.ctid
        ) {
          // Replaced function (xmin or ctid changed) — update provenance.
          await this.recordProvenance(ctx, oid, afterState.prosrc);
        }
        // else: unchanged, skip.
      }

      // Diff: dropped.
      for (const oid of before.pg_proc.keys()) {
        if (!after.has(oid)) {
          this.provenance.delete(oid);
        }
      }
    }
    // Future: diff other catalogs here.
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
      // Query surviving user functions.
      const surviving = await pg.query<{
        oid: number;
        proname: string;
        lanname: string;
        prosrc: string;
        def: string;
      }>(`
        SELECT p.oid, p.proname, l.lanname AS lanname, p.prosrc,
               pg_get_functiondef(p.oid) AS def
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        JOIN pg_language l  ON l.oid  = p.prolang
        WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
          AND n.nspname NOT LIKE 'pg_temp_%'
          AND l.lanname IN ('plpgsql', 'sql')
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
          const diags = await this.validatePlpgsqlFunction(pg, row.oid, prov);
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
    const res = await pg.query<{ oid: number; prosrc: string; xmin: string; ctid: string }>(query, params);
    return new Map(res.rows.map(r => [r.oid, {
      prosrc: r.prosrc,
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
   * AST (fast path).
   * For dynamically-created functions (e.g. via DO block `EXECUTE`): query
   * pg_proc and parse `pg_get_functiondef` to extract the same metadata.
   */
  private async recordProvenance(
    ctx: StmtContext,
    oid: number,
    prosrc: string,
  ): Promise<void> {
    let bodyText: string;
    let language: string;
    let signature: string;

    if (ctx.kind === "CreateFunctionStmt") {
      bodyText = getFunctionBody(ctx.stmt) ?? prosrc;
      language = getFunctionLanguage(ctx.stmt) ?? "sql";
      signature = formatFunctionRef(ctx.stmt) ?? "";
    } else {
      // Dynamic creation (e.g. via DO block EXECUTE).
      // Query pg_proc for metadata, parse pg_get_functiondef for body+signature.
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
        bodyText = getFunctionBody(defStmt) ?? prosrc;
        signature = formatFunctionRef(defStmt) ?? "";
      } else {
        bodyText = prosrc;
        language = "sql";
        signature = "";
      }
    }

    const bodyOffset = this.findBodyOffsetInStatement(ctx.stmtBytes, bodyText);

    this.provenance.set(oid, {
      oid,
      migration: ctx.migration,
      stmtStart: ctx.stmtStart,
      stmtEnd: ctx.stmtEnd,
      bodyOffset: bodyOffset >= 0 ? bodyOffset : 0,
      bodyText,
      language,
      signature,
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
   */
  private async validatePlpgsqlFunction(
    pg: PGlite,
    _oid: number,
    prov: FunctionProvenance,
  ): Promise<SqlDiagnostic[]> {
    const { removals, source } = prov.migration;

    let checkRows: PlpgsqlCheckRow[];
    try {
      const res = await pg.query<PlpgsqlCheckRow>(
        `SELECT * FROM plpgsql_check_function_tb('${prov.signature.replace(/'/g, "''")}');`,
      );
      checkRows = res.rows;
    } catch {
      // plpgsql_check failed — skip this function.
      return [];
    }

    if (checkRows.length === 0) return [];

    // Map body offset from stripped to original file space.
    const bodyOffsetInFile = mapStrippedToOriginal(
      removals,
      prov.stmtStart + prov.bodyOffset,
    );

    const diagnostics: SqlDiagnostic[] = checkRows.map(row =>
      extractPlpgsqlCheckDiagnostic(row, bodyOffsetInFile, prov.bodyText, source),
    );

    // Fill statement range for diagnostics without a precise range.
    const stmtStartOriginal = mapStrippedToOriginal(removals, prov.stmtStart);
    const stmtEndOriginal = mapStrippedToOriginal(removals, prov.stmtEnd);
    for (const diag of diagnostics) {
      if (diag.range === null) {
        diag.range = { start: stmtStartOriginal, end: stmtEndOriginal };
      }
    }

    return diagnostics;
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
    const { removals, source } = prov.migration;

    // Get the function definition (re-runnable CREATE OR REPLACE).
    const res = await pg.query<{ def: string }>(
      `SELECT pg_get_functiondef($1) AS def;`,
      [prov.oid],
    );
    const defText = res.rows[0]!.def;

    // Re-CREATE with check_function_bodies=on inside a savepoint.
    // The re-CREATE is a no-op (same body) but triggers PG's body validation.
    // The savepoint ensures we can continue even if validation fails.
    await pg.query("SAVEPOINT pgsid_sql_validate");
    try {
      await pg.query("SET LOCAL check_function_bodies TO on");
      await pg.exec(defText);
      // Success — body is valid. Restore and release.
      await pg.query("ROLLBACK TO SAVEPOINT pgsid_sql_validate");
      await pg.query("SET LOCAL check_function_bodies TO off");
      return [];
    } catch (err) {
      // Validation failed — extract diagnostic.
      await pg.query("ROLLBACK TO SAVEPOINT pgsid_sql_validate");
      await pg.query("SET LOCAL check_function_bodies TO off");

      // Find the body's offset in the re-issued text.
      const defBodyOffset = this.findBodyOffsetInStatement(
        Buffer.from(defText, "utf8"), prov.bodyText,
      );

      // Check if the error position is inside the body.
      const pos1 = err instanceof DatabaseError && err.position
        ? parseInt(err.position, 10) : NaN;

      let diag: SqlDiagnostic;

      if (defBodyOffset >= 0 && !Number.isNaN(pos1) && pos1 > defBodyOffset) {
        // Error is in the body — map through provenance.
        // stmtStrippedOffset = prov.stmtStart + prov.bodyOffset - defBodyOffset
        // so: pos0IntoStripped = stmtStrippedOffset + (pos1 - 1)
        //                        = prov.stmtStart + prov.bodyOffset - defBodyOffset + (pos1 - 1)
        //                        = prov.stmtStart + prov.bodyOffset + (pos1 - 1 - defBodyOffset)
        //                        = prov.stmtStart + prov.bodyOffset + errorPosInBody
        diag = extractExecDiagnostic(err, 0, {
          stmtStrippedOffset: prov.stmtStart + prov.bodyOffset - defBodyOffset,
          removals,
          mapStrippedToOriginal,
          source,
        });
      } else {
        // Error is in the header, or body not found, or position unknown.
        // Can't map — produce a diagnostic with no range; we'll fill the
        // statement range as fallback below.
        diag = extractExecDiagnostic(err, 0, {
          stmtStrippedOffset: 0,
          removals: [],
          mapStrippedToOriginal,
          source: undefined, // prevents token expansion — range stays null
        });
      }

      // Fall back to the whole statement range in the original file.
      if (diag.range === null) {
        diag.range = {
          start: mapStrippedToOriginal(removals, prov.stmtStart),
          end: mapStrippedToOriginal(removals, prov.stmtEnd),
        };
      }

      return [diag];
    }
  }
}
