import { messages } from "@electric-sql/pglite";
import { SqlError, hasSqlDetails } from "libpg-query";

// `DatabaseError` is exported inside the `messages` namespace in PGlite's
// type declarations. Pull it out for `instanceof` checks.
const DatabaseError = messages.DatabaseError;
type DatabaseError = InstanceType<typeof DatabaseError>;

// Re-export so callers can `instanceof`-check without re-deriving.
export { DatabaseError, SqlError, hasSqlDetails };

/**
 * The raw error from a specific source, preserved for source-specific
 * inspection. The `source` tag discriminates which payload is present.
 */
export type DiagnosticSource =
  | { source: "libpg-query"; error: SqlError }
  | { source: "pglite"; error: DatabaseError }
  | { source: "plpgsql-check"; row: PlpgsqlCheckRow };

/**
 * A row returned by `plpgsql_check_function_tb(...)`. One row per issue
 * found in the function body.
 */
export interface PlpgsqlCheckRow {
  functionid: string;
  lineno: number | null;
  statement: string | null;
  sqlstate: string;
  message: string;
  detail: string | null;
  hint: string | null;
  level: string;
  position: number | null;
  query: string | null;
  context: string | null;
}

/**
 * A structured SQL diagnostic extracted from any error source.
 *
 * Positions are normalized to **file-absolute 0-based byte offsets**
 * where the source provides enough information to compute one. When the
 * source doesn't provide a byte position, `lineNumber` is used as a
 * fallback (1-based line in the file). When neither is available, the
 * diagnostic is file-level (no range).
 *
 * Downstream consumers (the diagnostic emitter) read `position` / `lineNumber`
 * and produce an LSP range — they don't need to know which source the
 * error came from.
 */
export interface SqlDiagnostic {
  /** Primary error message, e.g. `column "emial" does not exist`. */
  message: string;
  /** SQLSTATE code, e.g. `42703`. `undefined` for libpg-query parse errors (no SQLSTATE). */
  code: string | undefined;
  /** Normalized severity. */
  severity: "error" | "warning" | "info";
  /** "Did you mean?" suggestion from Postgres. */
  hint: string | undefined;
  /** Additional detail (rare for PREPARE errors; populated for constraint violations). */
  detail: string | undefined;

  /**
   * 0-based byte offset into the FILE. `null` when the source doesn't
   * provide a byte position (callers fall back to `range` or emit a
   * file-level diagnostic).
   *
   * For PGlite exec errors: translated through `mapStrippedToOriginal`
   * when preprocessing was applied (CONCURRENTLY removal shifts positions).
   *
   * Consumer expands this to a token range (e.g. via AST node lookup).
   */
  position: number | null;

  /**
   * Explicit byte range [start, end) in the FILE. Used as a fallback
   * when `position` is null — e.g. underline the whole failing statement.
   * The apply pipeline sets this from the statement's byte range when
   * the error source doesn't provide a precise position.
   *
   * When both `position` and `range` are set, the consumer should prefer
   * `position` (more precise). When `position` is null and `range` is set,
   * use `range`. When both are null, emit a file-level diagnostic.
   */
  range: { start: number; end: number } | null;

  /**
   * 1-based line number (source-specific; for plpgsql-check it's body-relative).
   * `null` when not applicable. The caller translates to a file line number.
   */
  lineNumber: number | null;

  /**
   * The original error, preserved for source-specific inspection.
   * Carries the raw error object from the source library.
   */
  original: DiagnosticSource;
}

/**
 * Normalize a severity string from any source to our three-level scale.
 */
function normalizeSeverity(raw: string | undefined): "error" | "warning" | "info" {
  if (!raw) return "error";
  const lower = raw.toLowerCase();
  if (lower === "error" || lower === "fatal" || lower === "panic") return "error";
  if (lower === "warning") return "warning";
  return "info";
}

// ---------------------------------------------------------------------------
// Extractor 1: libpg-query parse errors
// ---------------------------------------------------------------------------

/**
 * Extract a diagnostic from a libpg-query parse error.
 *
 * @param err The thrown error from `parse()`.
 * @param sqlOffset 0-based byte offset of the parsed SQL string in the file.
 *   If parsing the whole file, pass 0. If parsing one statement, pass the
 *   statement's file offset.
 */
export function extractParseDiagnostic(
  err: unknown,
  sqlOffset: number,
): SqlDiagnostic {
  if (err instanceof SqlError && err.sqlDetails) {
    const d = err.sqlDetails;
    // cursorPosition is 0-based into the SQL string passed to parse().
    const position = d.cursorPosition !== undefined
      ? sqlOffset + d.cursorPosition
      : null;
    return {
      message: d.message,
      code: undefined, // parse errors have no SQLSTATE
      severity: "error",
      hint: undefined,
      detail: undefined,
      position,
      range: null,
      lineNumber: null,
      original: { source: "libpg-query", error: err },
    };
  }
  // Non-SqlError (shouldn't happen from parse(), but defensive).
  const message = err instanceof Error ? err.message : String(err);
  return {
    message,
    code: undefined,
    severity: "error",
    hint: undefined,
    detail: undefined,
    position: null,
    range: null,
    lineNumber: null,
    original: err instanceof SqlError
      ? { source: "libpg-query", error: err }
      : { source: "libpg-query", error: new SqlError(message) },
  };
}

// ---------------------------------------------------------------------------
// Extractor 2: PGlite exec/PREPARE errors (DatabaseError)
// ---------------------------------------------------------------------------

/**
 * @param removals The removals from `preprocess` (for CONCURRENTLY
 *   position remapping). Pass `[]` if no preprocessing was applied.
 */
export interface ExtractExecOptions {
  /** 0-based byte offset of the statement in the STRIPPED content. */
  stmtStrippedOffset: number;
  /** Removals from `preprocess` (for CONCURRENTLY remapping). `[]` if none. */
  removals: { offset: number; length: number }[];
  /** A function that maps stripped positions to original file positions. */
  mapStrippedToOriginal: (removals: { offset: number; length: number }[], pos: number) => number;
}

/**
 * Extract a diagnostic from a PGlite exec/PREPARE error.
 *
 * Handles position translation:
 * - PGlite reports `position` as a 1-based string relative to the FULL
 *   query string we sent (e.g. `"PREPARE p_42 AS SELECT badcol FROM t"`
 *   or `"CREATE INDEX u_idx ON ..."`).
 * - We subtract `prefixLen` (0 for exec, prefix length for PREPARE) to
 *   get a 0-based offset into the statement body.
 * - We add `stmtStrippedOffset` to get a 0-based offset into the stripped
 *   content.
 * - We map through `removals` to get a 0-based offset into the original
 *   file.
 *
 * @param prefixLen byte length of the prefix before the statement body
 *   (0 for `exec`, `preparePrefixLength(name)` for PREPARE).
 */
export function extractExecDiagnostic(
  err: unknown,
  prefixLen: number,
  ctx: ExtractExecOptions,
): SqlDiagnostic {
  if (err instanceof DatabaseError) {
    let position: number | null = null;
    if (err.position !== undefined) {
      const parsed = parseInt(err.position, 10);
      if (!Number.isNaN(parsed)) {
        // PG position is 1-based into the full query string.
        const pos0IntoQuery = parsed - 1;
        // Subtract prefix to get 0-based into the statement body.
        const pos0IntoStmt = Math.max(0, pos0IntoQuery - prefixLen);
        // Add the statement's offset in the stripped content.
        const pos0IntoStripped = ctx.stmtStrippedOffset + pos0IntoStmt;
        // Map through removals to get 0-based into the original file.
        position = ctx.mapStrippedToOriginal(ctx.removals, pos0IntoStripped);
      }
    }
    return {
      message: err.message,
      code: err.code,
      severity: normalizeSeverity(err.severity),
      hint: err.hint,
      detail: err.detail,
      position,
      range: null,
      lineNumber: null,
      original: { source: "pglite", error: err },
    };
  }
  // Non-DatabaseError (e.g. a JS-side bug). Surface the message; no position.
  const message = err instanceof Error ? err.message : String(err);
  return {
    message,
    code: undefined,
    severity: "error",
    hint: undefined,
    detail: undefined,
    position: null,
    range: null,
    lineNumber: null,
    original: { source: "pglite", error: new Error(message) as DatabaseError },
  };
}

// ---------------------------------------------------------------------------
// Extractor 3: plpgsql_check errors
// ---------------------------------------------------------------------------

/**
 * Extract a diagnostic from a plpgsql_check_function_tb row.
 *
 * Position translation:
 * - When `row.position` is set and `row.query` is set: find `query` in
 *   the function body, add the body's file offset, add `position - 1`.
 *   (Fragile — `query` may appear multiple times, or may be transformed
 *   by plpgsql_check e.g. PERFORM → SELECT. First match is used; falls
 *   back to `lineno` when not found.)
 * - When `position`/`query` are null or `query` isn't found in the body
 *   but `lineno` is set: compute the 0-based byte offset of the start
 *   of line `lineno` in the body, add the body's file offset. Used as
 *   `position` (imprecise — points at the line start).
 * - When neither is set: `position` is null (file-level diagnostic).
 *
 * `lineNumber` is always set to `row.lineno` (1-based, body-relative)
 * when available. The caller translates to a file line number using
 * the body's starting line in the file (which the caller knows but
 * we don't).
 *
 * @param row The plpgsql_check_function_tb row.
 * @param functionBodyOffset 0-based byte offset of the function body
 *   (the text between `$$` and the closing `$$`) in the file.
 * @param functionBodyText The function body text (between `$$` and `$$`).
 */
export function extractPlpgsqlCheckDiagnostic(
  row: PlpgsqlCheckRow,
  functionBodyOffset: number,
  functionBodyText: string,
): SqlDiagnostic {
  let position: number | null = null;

  // Strategy 1: find `query` in the body, use `position` as offset into it.
  if (row.position !== null && row.query) {
    const queryOffsetInBody = functionBodyText.indexOf(row.query);
    if (queryOffsetInBody !== -1) {
      const pos0IntoQuery = row.position - 1;
      const pos0IntoBody = queryOffsetInBody + pos0IntoQuery;
      position = functionBodyOffset + pos0IntoBody;
    }
    // If query not found (e.g. PERFORM → SELECT transformation), fall through
    // to the lineno-based fallback below.
  }

  // Strategy 2: use `lineno` to compute the byte offset of the line start.
  if (position === null && row.lineno !== null) {
    const lines = functionBodyText.split("\n");
    if (row.lineno >= 1 && row.lineno <= lines.length) {
      let byteOffset = 0;
      for (let i = 0; i < row.lineno - 1; i++) {
        byteOffset += Buffer.byteLength(lines[i]!, "utf8") + 1; // +1 for \n
      }
      position = functionBodyOffset + byteOffset;
    }
  }

  return {
    message: row.message,
    code: row.sqlstate,
    severity: normalizeSeverity(row.level),
    hint: row.hint ?? undefined,
    detail: row.detail ?? undefined,
    position,
    range: null,
    // lineNumber is body-relative (1-based). The caller translates to a
    // file line number using the body's starting line in the file.
    lineNumber: row.lineno,
    original: { source: "plpgsql-check", row },
  };
}

/**
 * The byte length of a `PREPARE <name> AS ` prefix.
 *
 * The apply pipeline sends `PREPARE pgsid_stmt_N AS <stmt>` to PGlite;
 * PGlite's reported error position is 1-based into this whole string.
 * We need the prefix length to translate to a 0-based offset into <stmt>.
 *
 * Computed from the actual prefix string (not hardcoded) so renames
 * (e.g. `pgsid_stmt_N` → `pgsid_stmt_NN`) don't silently break offsets.
 */
export function preparePrefixLength(name: string): number {
  // "PREPARE " + name + " AS " — all ASCII, so byte length === char length.
  return "PREPARE ".length + name.length + " AS ".length;
}
