import type { PGlite } from "@electric-sql/pglite";

import {
  parseSql,
  preprocess,
  stripConcurrently,
  getStatements,
  getFunctionLanguage,
  getFunctionBody,
  getDoBlockBody,
  formatFunctionRef,
  mapStrippedToOriginal,
  type Removal,
  type StatementInfo,
} from "./ast.js";
import {
  extractExecDiagnostic,
  extractPlpgsqlCheckDiagnostic,
  extractParseDiagnostic,
  type SqlDiagnostic,
  type PlpgsqlCheckRow,
} from "./errors.js";

export interface ApplyResult {
  success: boolean;
  diagnostics: SqlDiagnostic[];
}

/**
 * Apply a migration file's SQL to a PGlite instance, statement by statement.
 *
 * Pipeline per statement:
 * - PL/pgSQL functions: `SET LOCAL check_function_bodies=off` → CREATE →
 *   `plpgsql_check_function_tb` → diagnostics. The shallow check is
 *   suppressed so the function always gets created (even with body errors),
 *   and plpgsql_check provides deep semantic analysis with body-relative
 *   positions.
 * - SQL functions: `check_function_bodies=on` (default) → CREATE. PG
 *   validates the body natively at CREATE time; errors carry a `position`
 *   into the CREATE FUNCTION string.
 * - Other DDL/DML: exec directly.
 *
 * On first failure: rollback the transaction, return diagnostics, halt.
 * No SAVEPOINT recovery — the schema is stateful, and continuing after a
 * failed CREATE TABLE would produce cascading nonsensical errors (every
 * subsequent statement referencing the missing table would fail too).
 *
 * When a diagnostic has no precise `position` (PG didn't provide one),
 * the `range` field is set to the whole failing statement's byte range
 * in the original file — the LSP consumer underlines the whole statement.
 *
 * @param pg A PGlite instance (the "builder" — not from the pool).
 * @param source The original migration file content (UTF-8 buffer).
 */
export async function applyMigration(
  pg: PGlite,
  source: Buffer,
): Promise<ApplyResult> {
  // 1. Parse the original source.
  let parsed;
  try {
    parsed = await parseSql(source.toString("utf8"));
  } catch (err) {
    // Parse error in the original file — libpg-query couldn't parse it.
    const diag = extractParseDiagnostic(err, 0, source);
    return { success: false, diagnostics: [diag] };
  }

  // 2. Preprocess (strip CONCURRENTLY only).
  const preprocessed = preprocess(source, parsed, stripConcurrently());
  const strippedContent = preprocessed.content;
  const removals = preprocessed.removals;

  // 3. Re-parse the stripped content to get statement kinds/boundaries
  //    in the stripped coordinate space.
  let strippedParsed;
  try {
    strippedParsed = await parseSql(strippedContent.toString("utf8"));
  } catch (err) {
    // Parse error in the stripped content. This shouldn't happen (stripping
    // CONCURRENTLY doesn't break syntax), but handle it defensively.
    // The parse error range is 0-based into the stripped content; we need
    // to remap it to the original file coordinates.
    const diag = extractParseDiagnostic(err, 0, strippedContent);
    if (diag.range) {
      diag.range = {
        start: mapStrippedToOriginal(removals, diag.range.start),
        end: mapStrippedToOriginal(removals, diag.range.end),
      };
    }
    return { success: false, diagnostics: [diag] };
  }

  // 4. Get per-statement info from the stripped parse.
  const statements = getStatements(strippedParsed, strippedContent);

  // 5. Begin transaction.
  await pg.query("BEGIN");

  // Counter for temp function names used to check DO blocks.
  const doBlockCounter = { n: 0 };

  try {
    for (const stmtInfo of statements) {
      const result = await execStatement(pg, stmtInfo, removals, source, doBlockCounter);
      if (result) {
        // Failure — rollback and return diagnostics.
        await pg.query("ROLLBACK");
        return { success: false, diagnostics: result };
      }
    }
    // All statements succeeded.
    await pg.query("COMMIT");
    return { success: true, diagnostics: [] };
  } catch (err) {
    // Unexpected error (not from exec — e.g. BEGIN/COMMIT failed).
    try { await pg.query("ROLLBACK"); } catch { /* ignore */ }
    const diag = extractExecDiagnostic(err, 0, {
      stmtStrippedOffset: 0,
      removals,
      mapStrippedToOriginal,
      source,
    });
    return { success: false, diagnostics: [diag] };
  }
}

/**
 * Execute a single statement. Returns `null` on success, or an array of
 * `SqlDiagnostic` on failure.
 */
async function execStatement(
  pg: PGlite,
  stmtInfo: StatementInfo,
  removals: Removal[],
  source: Buffer,
  doBlockCounter: { n: number },
): Promise<SqlDiagnostic[] | null> {
  const { stmt, kind } = stmtInfo;

  if (kind === "CreateFunctionStmt") {
    const lang = getFunctionLanguage(stmt);
    if (lang === "plpgsql") {
      return execPlpgsqlFunction(pg, stmtInfo, removals, source);
    }
    // LANGUAGE sql (or other) — PG validates the body natively.
    return execSimple(pg, stmtInfo, removals, source);
  }

  if (kind === "DoStmt") {
    return execDoBlock(pg, stmtInfo, removals, source, doBlockCounter);
  }

  // Regular DDL/DML.
  return execSimple(pg, stmtInfo, removals, source);
}

/**
 * Execute a PL/pgSQL function: suppress shallow check, CREATE, run
 * plpgsql_check_function_tb, restore shallow check.
 */
async function execPlpgsqlFunction(
  pg: PGlite,
  stmtInfo: StatementInfo,
  removals: Removal[],
  source: Buffer,
): Promise<SqlDiagnostic[] | null> {
  const { stmt, start, text } = stmtInfo;

  // Suppress PG's shallow body check so the function always gets created.
  await pg.query("SET LOCAL check_function_bodies TO off");

  try {
    await pg.exec(text);
  } catch (err) {
    // Even with check_function_bodies=off, the CREATE FUNCTION itself
    // can fail (e.g. syntax error in the CREATE, not the body).
    const diag = extractExecDiagnostic(err, 0, {
      stmtStrippedOffset: start,
      removals,
      mapStrippedToOriginal,
      source,
    });
    fillStatementRange(diag, stmtInfo, removals);
    // Restore check_function_bodies for subsequent SQL functions.
    // Wrap in try/catch: the transaction may be aborted (the exec error
    // above leaves the txn in a failed state), in which case SET LOCAL
    // also fails. The outer applyMigration catch will ROLLBACK anyway.
    try { await pg.query("SET LOCAL check_function_bodies TO on"); } catch { /* txn aborted */ }
    return [diag];
  }

  // Run plpgsql_check for deep semantic analysis.
  const funcRef = formatFunctionRef(stmt);
  if (!funcRef) {
    // Can't construct the function reference — skip plpgsql_check.
    await pg.query("SET LOCAL check_function_bodies TO on");
    return null;
  }

  let checkRows: PlpgsqlCheckRow[];
  try {
    const res = await pg.query<PlpgsqlCheckRow>(
      `SELECT * FROM plpgsql_check_function_tb('${funcRef.replace(/'/g, "''")}');`,
    );
    checkRows = res.rows;
  } catch {
    // plpgsql_check might fail for various reasons (e.g. function not found
    // due to a subtle name mismatch, or the regprocedure cast aborts the
    // transaction). Don't block the migration — just skip.
    try { await pg.query("SET LOCAL check_function_bodies TO on"); } catch { /* txn aborted */ }
    return null;
  }

  // Restore check_function_bodies for subsequent SQL functions.
  try { await pg.query("SET LOCAL check_function_bodies TO on"); } catch { /* txn aborted */ }

  if (checkRows.length === 0) {
    return null; // no issues found
  }

  // Extract diagnostics for each plpgsql_check row.
  const bodyText = getFunctionBody(stmt) ?? "";
  const bodyOffsetInStripped = findBodyOffsetInStatement(text, bodyText);
  const bodyOffsetInFile = bodyOffsetInStripped !== -1
    ? mapStrippedToOriginal(removals, start + bodyOffsetInStripped)
    : mapStrippedToOriginal(removals, start);

  const diagnostics: SqlDiagnostic[] = checkRows.map(row =>
    extractPlpgsqlCheckDiagnostic(row, bodyOffsetInFile, bodyText, source),
  );

  // Fill in statement range for diagnostics without a range.
  for (const diag of diagnostics) {
    if (diag.range === null) {
      fillStatementRange(diag, stmtInfo, removals);
    }
  }

  return diagnostics;
}

/**
 * Execute a simple statement (DDL, DML, or LANGUAGE sql function).
 * PG validates natively; errors carry a `position` into the statement text.
 */
async function execSimple(
  pg: PGlite,
  stmtInfo: StatementInfo,
  removals: Removal[],
  source: Buffer,
): Promise<SqlDiagnostic[] | null> {
  const { start, text } = stmtInfo;
  try {
    await pg.exec(text);
    return null;
  } catch (err) {
    const diag = extractExecDiagnostic(err, 0, {
      stmtStrippedOffset: start,
      removals,
      mapStrippedToOriginal,
      source,
    });
    fillStatementRange(diag, stmtInfo, removals);
    return [diag];
  }
}

/**
 * Execute a DO block.
 *
 * DO blocks are anonymous PL/pgSQL — not stored in pg_proc, so
 * plpgsql_check_function_tb can't check them directly. Instead:
 *   1. Extract the body text from the DoStmt AST.
 *   2. Create a `pg_temp` function with the same body.
 *   3. Run `plpgsql_check_function_tb` on the temp function.
 *   4. If errors: extract diagnostics, drop temp function, return (halt).
 *   5. If no errors: drop temp function, exec the DO block (for side effects).
 */
async function execDoBlock(
  pg: PGlite,
  stmtInfo: StatementInfo,
  removals: Removal[],
  source: Buffer,
  counter: { n: number },
): Promise<SqlDiagnostic[] | null> {
  const { stmt, start, text } = stmtInfo;
  const bodyText = getDoBlockBody(stmt) ?? "";

  // Create a temp function with the same body for plpgsql_check analysis.
  const tempName = `pg_temp.pgsid_do_check_${counter.n++}`;
  const tempFuncRef = `${tempName}()`;

  await pg.query("SET LOCAL check_function_bodies TO off");
  try {
    await pg.exec(
      `CREATE FUNCTION ${tempName}() RETURNS void LANGUAGE plpgsql AS $$${bodyText}$$;`,
    );
  } catch (err) {
    // The temp function CREATE failed — this means the body has a syntax
    // error that even check_function_bodies=off can't suppress.
    // Fall back to exec'ing the DO block directly (PG will report the
    // same syntax error with a position).
    await pg.query("SET LOCAL check_function_bodies TO on");
    return execSimple(pg, stmtInfo, removals, source);
  }

  // Run plpgsql_check on the temp function.
  let checkRows: PlpgsqlCheckRow[];
  try {
    const res = await pg.query<PlpgsqlCheckRow>(
      `SELECT * FROM plpgsql_check_function_tb('${tempFuncRef}');`,
    );
    checkRows = res.rows;
  } catch {
    // plpgsql_check failed — drop the temp function and exec the DO block directly.
    try { await pg.exec(`DROP FUNCTION ${tempName}();`); } catch { /* ignore */ }
    await pg.query("SET LOCAL check_function_bodies TO on");
    return execSimple(pg, stmtInfo, removals, source);
  }

  // Drop the temp function.
  try { await pg.exec(`DROP FUNCTION ${tempName}();`); } catch { /* ignore */ }
  await pg.query("SET LOCAL check_function_bodies TO on");

  if (checkRows.length > 0) {
    // plpgsql_check found errors — extract diagnostics and halt.
    const bodyOffsetInStripped = findBodyOffsetInStatement(text, bodyText);
    const bodyOffsetInFile = bodyOffsetInStripped !== -1
      ? mapStrippedToOriginal(removals, start + bodyOffsetInStripped)
      : mapStrippedToOriginal(removals, start);

    const diagnostics: SqlDiagnostic[] = checkRows.map(row =>
      extractPlpgsqlCheckDiagnostic(row, bodyOffsetInFile, bodyText, source),
    );

    for (const diag of diagnostics) {
      if (diag.range === null) {
        fillStatementRange(diag, stmtInfo, removals);
      }
    }

    return diagnostics;
  }

  // No errors from plpgsql_check — exec the DO block for its side effects.
  return execSimple(pg, stmtInfo, removals, source);
}

/**
 * When a diagnostic has no `range`, set it to the statement's byte range
 * in the original file. The LSP consumer uses this to underline the whole
 * statement as a last-resort fallback.
 */
function fillStatementRange(
  diag: SqlDiagnostic,
  stmtInfo: StatementInfo,
  removals: Removal[],
): void {
  if (diag.range !== null) return; // range already set
  const startInOriginal = mapStrippedToOriginal(removals, stmtInfo.start);
  const endInOriginal = mapStrippedToOriginal(removals, stmtInfo.end);
  diag.range = { start: startInOriginal, end: endInOriginal };
}

/**
 * Find the byte offset of the function body (the text between `$$ ... $$`)
 * within the statement text. Used to translate plpgsql_check body-relative
 * positions to file offsets.
 *
 * Searches for the body text (from the AST) in the statement text first.
 * Falls back to finding the dollar-quote delimiter (`$$` or `$tag$`).
 * Returns -1 if not found (caller falls back to the statement start).
 */
function findBodyOffsetInStatement(stmtText: string, bodyText: string): number {
  // The body text from the AST is the decoded content (without `$$`).
  // Find it directly in the statement text.
  if (bodyText) {
    const idx = stmtText.indexOf(bodyText);
    if (idx !== -1) return idx;
  }
  // Fallback: find the first `$$` or `$tag$` delimiter.
  const m = /\$[\w]*\$/.exec(stmtText);
  if (m) return m.index + m[0].length;
  return -1;
}
