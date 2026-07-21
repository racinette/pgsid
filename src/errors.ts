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
 * `range` is a file-absolute byte range [start, end) to highlight, or
 * `null` when the error source gives us no location information (in which
 * case the caller falls back to the whole failing statement's range).
 *
 * Each extractor computes the most precise `range` it can from the source:
 * - libpg-query parse errors: the offending token (expanded from cursorPosition).
 * - PGlite exec errors: the offending token (expanded from `position`).
 * - plpgsql_check: the offending line (from `lineno`) or precise point
 *   (from `query` + `position` when the query is found verbatim in the body).
 *
 * The consumer doesn't need to know which source the error came from —
 * just underline `range` (or the whole statement if null).
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
   * File-absolute byte range [start, end) to highlight, or `null` when
   * the source provides no location (caller underlines the whole statement).
   *
   * Precision varies by source:
   * - Token-level (libpg-query, PGlite with position): the error token.
   * - Line-level (plpgsql_check with lineno but no query): the whole line.
   * - Statement-level (PGlite without position): null → caller fills
   *   the statement range.
   */
  range: { start: number; end: number } | null;

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

/**
 * Expand a 0-based byte position into a token range by walking outward
 * over word characters (letters, digits, underscore). Used for PGlite
 * and libpg-query errors that report a point, not a range.
 *
 * If the byte at `pos` is not a word character (e.g. it's whitespace or
 * punctuation), the range is just `[pos, pos+1)` — a single-byte
 * highlight. This is acceptable for cases like syntax errors at a
 * punctuation token.
 *
 * @param source The file content (for boundary detection).
 * @param pos 0-based byte offset into `source`.
 */
function expandTokenRange(source: Buffer, pos: number): { start: number; end: number } {
  if (pos < 0 || pos >= source.length) {
    return { start: Math.max(0, pos), end: Math.max(0, pos) + 1 };
  }
  let start = pos;
  let end = pos + 1;
  // Walk backward over word chars.
  while (start > 0 && isWordByte(source.readUInt8(start - 1))) {
    start--;
  }
  // Walk forward over word chars.
  while (end < source.length && isWordByte(source.readUInt8(end))) {
    end++;
  }
  return { start, end };
}

function isWordByte(byte: number): boolean {
  // A-Z, a-z, 0-9, underscore
  return (
    (byte >= 0x41 && byte <= 0x5a) || // A-Z
    (byte >= 0x61 && byte <= 0x7a) || // a-z
    (byte >= 0x30 && byte <= 0x39) || // 0-9
    byte === 0x5f                      // _
  );
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
 * @param source The file content (for token-range expansion). If omitted,
 *   `range` is null (caller falls back to statement range).
 */
export function extractParseDiagnostic(
  err: unknown,
  sqlOffset: number,
  source?: Buffer,
): SqlDiagnostic {
  if (err instanceof SqlError && err.sqlDetails) {
    const d = err.sqlDetails;
    // cursorPosition is 0-based into the SQL string passed to parse().
    const pos = d.cursorPosition !== undefined
      ? sqlOffset + d.cursorPosition
      : null;
    const range = pos !== null && source
      ? expandTokenRange(source, pos)
      : null;
    return {
      message: d.message,
      code: undefined, // parse errors have no SQLSTATE
      severity: "error",
      hint: undefined,
      detail: undefined,
      range,
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
    range: null,
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
  /** The original file content (for token-range expansion). If omitted, `range` is null. */
  source?: Buffer;
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
 * - We expand to a token range using `source` (if provided).
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
    let range: { start: number; end: number } | null = null;
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
        const pos0IntoFile = ctx.mapStrippedToOriginal(ctx.removals, pos0IntoStripped);
        // Expand to a token range if we have the source.
        if (ctx.source) {
          range = expandTokenRange(ctx.source, pos0IntoFile);
        }
      }
    }
    return {
      message: err.message,
      code: err.code,
      severity: normalizeSeverity(err.severity),
      hint: err.hint,
      detail: err.detail,
      range,
      original: { source: "pglite", error: err },
    };
  }
  // Non-DatabaseError (e.g. a JS-side bug). Surface the message; no range.
  const message = err instanceof Error ? err.message : String(err);
  return {
    message,
    code: undefined,
    severity: "error",
    hint: undefined,
    detail: undefined,
    range: null,
    original: { source: "pglite", error: new Error(message) as DatabaseError },
  };
}

// ---------------------------------------------------------------------------
// Extractor 3: plpgsql_check errors
// ---------------------------------------------------------------------------

/**
 * Extract a diagnostic from a plpgsql_check_function_tb row.
 *
 * Range computation (decreasing precision):
 * - When `row.position` is set and `row.query` is set: find `query` in
 *   the function body, add the body's file offset, add `position - 1`,
 *   expand to a token range. (Fragile — `query` may be transformed by
 *   plpgsql_check e.g. PERFORM → SELECT. First match is used; falls back
 *   to `lineno` when not found.)
 * - When `query` isn't found but `lineno` is set: compute the byte range
 *   of the whole line (from line start to line end, excluding the newline),
 *   add the body's file offset. Set as `range`.
 * - When neither is set: `range` is null (caller underlines the whole
 *   statement).
 *
 * @param row The plpgsql_check_function_tb row.
 * @param functionBodyOffset 0-based byte offset of the function body
 *   (the text between `$$` and the closing `$$`) in the file.
 * @param functionBodyText The function body text (between `$$` and `$$`).
 * @param source The file content (for token-range expansion). If omitted,
 *   the `query`+`position` path returns a single-byte range instead of a
 *   token range.
 */
export function extractPlpgsqlCheckDiagnostic(
  row: PlpgsqlCheckRow,
  functionBodyOffset: number,
  functionBodyText: string,
  source?: Buffer,
): SqlDiagnostic {
  let range: { start: number; end: number } | null = null;

  // Strategy 1: find `query` in the body, use `position` as offset into it,
  // expand to a token range.
  if (row.position !== null && row.query) {
    const queryOffsetInBody = functionBodyText.indexOf(row.query);
    if (queryOffsetInBody !== -1) {
      const pos0IntoQuery = row.position - 1;
      const pos0IntoBody = queryOffsetInBody + pos0IntoQuery;
      const pos0IntoFile = functionBodyOffset + pos0IntoBody;
      range = source
        ? expandTokenRange(source, pos0IntoFile)
        : { start: pos0IntoFile, end: pos0IntoFile + 1 };
    }
    // If query not found (e.g. PERFORM → SELECT transformation), fall through
    // to the lineno-based fallback below.
  }

  // Strategy 2: use `lineno` to compute the byte range of the whole line.
  if (range === null && row.lineno !== null) {
    const lines = functionBodyText.split("\n");
    if (row.lineno >= 1 && row.lineno <= lines.length) {
      let lineStart = 0;
      for (let i = 0; i < row.lineno - 1; i++) {
        lineStart += Buffer.byteLength(lines[i]!, "utf8") + 1; // +1 for \n
      }
      const lineText = lines[row.lineno - 1]!;
      const lineEnd = lineStart + Buffer.byteLength(lineText, "utf8");
      range = {
        start: functionBodyOffset + lineStart,
        end: functionBodyOffset + lineEnd,
      };
    }
  }

  return {
    message: row.message,
    code: row.sqlstate,
    severity: normalizeSeverity(row.level),
    hint: row.hint ?? undefined,
    detail: row.detail ?? undefined,
    range,
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
