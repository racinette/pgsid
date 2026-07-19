import { parse, type ParseResult, type RawStmt, type Node } from "libpg-query";


export async function parseSql(sql: string): Promise<ParseResult> {
  if (sql.length === 0) {
    return { version: 0, stmts: [] };
  }
  const result = await parse(sql);
  return result as ParseResult;
}

/**
 * A byte range to delete from the source. `offset` is RELATIVE TO THE STATEMENT
 * (zero-based), not to the whole source — `preprocess` translates it to
 * source-absolute before splicing. This keeps filters statement-local.
 *
 * Returning `{ offset: 0, length: ctx.length }` removes the whole statement.
 */
export type Removal = { offset: number; length: number };

export interface StatementContext {
  /** The RawStmt wrapper (carries stmt_location, stmt_len). */
  raw: RawStmt;
  /** The top-level statement node (discriminated union). */
  stmt: Node;
  /** Discriminator key — e.g. "CreateStmt", "InsertStmt", "DoStmt". */
  kind: string;
  /** Absolute byte offset of this statement in the source buffer. */
  sourceOffset: number;
  /** Length of this statement in bytes (excludes the trailing `;`). */
  length: number;
  /**
   * Byte view of this statement's text, zero-offset slice of the source.
   * Use `.toString("utf8")` for text work; `.toString("latin1")` for
   * byte-aligned regex scans (latin1 maps 1 char ↔ 1 byte, so match.index
   * is a byte offset — important when the statement contains non-ASCII
   * comments before the token you're searching for).
   */
  bytes: Buffer;
}

/**
 * A per-statement filter. Receives one statement; returns the byte ranges
 * (statement-relative) to remove, or nothing/empty to keep the statement as-is.
 */
export type StatementFilter = (ctx: StatementContext) => Removal[] | void;

export interface PreprocessResult {
  /** True iff any bytes were removed. */
  modified: boolean;
  /** Preprocessed source as a new Buffer (the input is never mutated). */
  content: Buffer;
}

/**
 * Apply per-statement filters to a parsed SQL source. Operates purely on
 * byte ranges — no deparsing, no AST mutation, comments and formatting of
 * kept statements are preserved verbatim.
 *
 * Contract:
 * - `source` must be the same bytes that produced `parsed` (call
 *   `parseSql(source.toString("utf8"))` — libpg-query's stmt_location/stmt_len
 *   are UTF-8 byte offsets, which align 1:1 with Buffer indices when the
 *   buffer holds UTF-8).
 * - Filter removals are merged (overlaps coalesced) before splicing, so
 *   overlapping ranges from different filters are safe.
 */
export function preprocess(
  source: Buffer,
  parsed: ParseResult,
  filter: StatementFilter,
): PreprocessResult {
  const stmts = parsed.stmts ?? [];

  // Precompute each statement's [start, end) byte range. libpg-query
  // omits `stmt_location` when it's 0 and omits `stmt_len` for the LAST
  // statement (it derives length from the next statement's location).
  // We reconstruct both here so filters get reliable ranges.
  type Range = { start: number; end: number };
  const ranges: Range[] = stmts.map((raw, i) => {
    const start = raw.stmt_location ?? 0;
    let end: number;
    if (typeof raw.stmt_len === "number") {
      end = start + raw.stmt_len;
    } else if (i + 1 < stmts.length) {
      // Next statement's location gives us an upper bound; the gap between
      // them is the trailing `;` and whitespace. Walk back over those.
      const nextStart = stmts[i + 1]?.stmt_location ?? 0;
      end = nextStart;
      while (end > start && isTrailingSep(source.readUInt8(end - 1))) {
        end--;
      }
    } else {
      // Last statement: walk back over trailing `;`/whitespace from EOF.
      end = source.length;
      while (end > start && isTrailingSep(source.readUInt8(end - 1))) {
        end--;
      }
    }
    return { start, end: Math.max(end, start) };
  });

  const removals: Removal[] = [];
  for (let i = 0; i < stmts.length; i++) {
    const raw = stmts[i]!;
    const stmt = raw.stmt!;
    const kind = Object.keys(stmt)[0]!;
    const range = ranges[i]!;
    const ctx: StatementContext = {
      raw,
      stmt,
      kind,
      sourceOffset: range.start,
      length: range.end - range.start,
      bytes: source.subarray(range.start, range.end),
    };
    const r = filter(ctx);
    if (r && r.length) {
      for (const { offset, length: len } of r) {
        const isWholeStmt = offset === 0 && len >= ctx.length;
        if (isWholeStmt) {
          // Whole-statement removal: also consume the trailing `;` and any
          // trailing whitespace so we don't leave a stray `;` or empty line.
          // Leading whitespace is NOT consumed — keeping the newline before
          // the removed statement preserves the visual gap between the
          // previous and next kept statements.
          let end = range.start + len;
          while (end < source.length && isTrailingSep(source.readUInt8(end))) {
            end++;
          }
          removals.push({ offset: range.start, length: end - range.start });
        } else {
          removals.push({ offset: range.start + offset, length: len });
        }
      }
    }
  }
  if (removals.length === 0) {
    return { modified: false, content: source };
  }
  // Sort ascending, merge overlaps, then stitch kept segments.
  removals.sort((a, b) => a.offset - b.offset);
  const merged: Removal[] = [];
  for (const r of removals) {
    const last = merged[merged.length - 1];
    if (last && r.offset <= last.offset + last.length) {
      last.length = Math.max(last.length, r.offset + r.length - last.offset);
    } else {
      merged.push({ ...r });
    }
  }
  const chunks: Buffer[] = [];
  let cursor = 0;
  for (const { offset, length } of merged) {
    if (offset > cursor) chunks.push(source.subarray(cursor, offset));
    cursor = offset + length;
  }
  if (cursor < source.length) chunks.push(source.subarray(cursor));
  return { modified: true, content: Buffer.concat(chunks) };
}

/** Compose multiple filters into one (left-to-right; outputs concatenated). */
export function combine(...filters: StatementFilter[]): StatementFilter {
  return (ctx) => {
    const out: Removal[] = [];
    for (const f of filters) {
      const r = f(ctx);
      if (r) out.push(...r);
    }
    return out.length ? out : undefined;
  };
}

// ---------------------------------------------------------------------------
// Built-in filters derived from DESIGN.md "Schema build pipeline > preprocess"
// ---------------------------------------------------------------------------

const DML_KINDS = new Set([
  "SelectStmt",
  "InsertStmt",
  "UpdateStmt",
  "DeleteStmt",
  "CopyStmt",
  "TruncateStmt",
  "MergeStmt",
]);

/**
 * `preprocess.strip.dml: true` — drop top-level DML statements
 * (SELECT/INSERT/UPDATE/DELETE/COPY/TRUNCATE/MERGE). SELECT is included
 * per the conventional definition of DML (Data Manipulation Language =
 * read + write); a top-level SELECT in a migration is typically seeding
 * or a function-call side effect, which we don't want applied to the
 * schema-only catalog.
 */
export function stripDml(): StatementFilter {
  return (ctx) => {
    if (DML_KINDS.has(ctx.kind)) {
      return [{ offset: 0, length: ctx.length }];
    }
  };
}

/**
 * `preprocess.strip.do: true` — drop `DO` blocks. The optional `onStrip`
 * hook lets the Engine surface the DESIGN-mandated ambiguity warning
 * ("DO blocks can perform DDL the catalog won't see").
 */
export function stripDo(
  onStrip?: (ctx: StatementContext) => void,
): StatementFilter {
  return (ctx) => {
    if (ctx.kind === "DoStmt") {
      onStrip?.(ctx);
      return [{ offset: 0, length: ctx.length }];
    }
  };
}

/**
 * DESIGN: "Strip `CONCURRENTLY` on supported DDL so the file can run in a
 * transaction (optional hint)."
 *
 * `CONCURRENTLY` shows up in three statement kinds, and libpg-query exposes
 * it differently in each:
 *
 * - `IndexStmt` (`CREATE [UNIQUE] INDEX CONCURRENTLY`):
 *     `IndexStmt.concurrent: true` — boolean flag, NO keyword location.
 *     We scan the statement header, bounded by `relation.location` (which
 *     must appear AFTER the CONCURRENTLY keyword). The scan uses `latin1`
 *     so the regex match index is a byte offset (robust against non-ASCII
 *     comments in the header).
 *
 * - `DropStmt` (`DROP INDEX CONCURRENTLY`):
 *     `DropStmt.concurrent: true` — same situation. The object-list `String`
 *     nodes don't reliably carry `location`, so we scan the whole statement.
 *
 * - `ReindexStmt` (`REINDEX ... CONCURRENTLY`):
 *     `ReindexStmt.params` carries a `DefElem` with `defname: "concurrently"`
 *     AND a `location` pointing at the keyword. We use that directly — no
 *     text scan needed.
 *
 * IMPORTANT: all `location` fields in the libpg-query AST are SOURCE-ABSOLUTE
 * byte offsets. We translate them to statement-relative coordinates by
 * subtracting `ctx.sourceOffset` (since removals are statement-relative per
 * the preprocess contract).
 *
 * In all cases we also consume one trailing whitespace char to avoid a
 * double space in the output.
 */
export function stripConcurrently(): StatementFilter {
  return (ctx) => {
    const stmt = ctx.stmt as
      | { IndexStmt?: { concurrent?: boolean; relation?: { location?: number } } }
      | { DropStmt?: { concurrent?: boolean } }
      | { ReindexStmt?: { params?: { DefElem?: { defname?: string; location?: number } }[] } };

    let keywordOffset: number | null = null;

    if ("IndexStmt" in stmt) {
      if (!stmt.IndexStmt?.concurrent) return;
      // relation.location is source-absolute; convert to statement-relative.
      const relLoc = stmt.IndexStmt.relation?.location;
      const headerEnd = typeof relLoc === "number"
        ? Math.min(relLoc - ctx.sourceOffset, ctx.length)
        : ctx.length;
      keywordOffset = scanConcurrently(ctx.bytes, 0, headerEnd);
    } else if ("DropStmt" in stmt) {
      if (!stmt.DropStmt?.concurrent) return;
      // No reliable location on object-list String nodes; scan whole stmt.
      keywordOffset = scanConcurrently(ctx.bytes, 0, ctx.length);
    } else if ("ReindexStmt" in stmt) {
      const params = stmt.ReindexStmt?.params ?? [];
      const def = params.find((p) => p.DefElem?.defname === "concurrently");
      if (typeof def?.DefElem?.location === "number") {
        // Source-absolute → statement-relative.
        keywordOffset = def.DefElem.location - ctx.sourceOffset;
      }
    }

    if (keywordOffset === null || keywordOffset < 0) return;
    if (keywordOffset + "CONCURRENTLY".length > ctx.length) return;

    let length = "CONCURRENTLY".length;
    const after = ctx.bytes.readUInt8(keywordOffset + length);
    if (after === 0x20 || after === 0x09 || after === 0x0a || after === 0x0d) {
      length += 1;
    }
    return [{ offset: keywordOffset, length }];
  };
}

/**
 * Scan `buf` in [start, end) for the keyword `CONCURRENTLY` (case-insensitive,
 * word-bounded). Returns the byte offset of the match, or null.
 *
 * `latin1` semantics: 1 char ↔ 1 byte, so the regex match index is a byte
 * offset even when the statement contains non-ASCII comments before the
 * keyword. This is robust against the one realistic edge case (a comment
 * with multibyte chars appearing before the CONCURRENTLY token in the
 * statement header).
 */
function scanConcurrently(buf: Buffer, start: number, end: number): number | null {
  const slice = buf.subarray(start, end).toString("latin1");
  const m = /\bCONCURRENTLY\b/i.exec(slice);
  return m ? start + m.index : null;
}

/** `;`, space, tab, newline, CR — the bytes that can trail a statement. */
function isTrailingSep(byte: number): boolean {
  return byte === 0x3b || byte === 0x20 || byte === 0x09 || byte === 0x0a || byte === 0x0d;
}
