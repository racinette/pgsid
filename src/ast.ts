import { parse, type ParseResult, type RawStmt, type Node } from "libpg-query";


export async function parseSql(sql: string): Promise<ParseResult> {
  if (sql.length === 0) {
    return { version: 0, stmts: [] };
  }
  const result = await parse(sql);
  return result as ParseResult;
}

/**
 * Per-statement info: AST node, kind, byte range in the source, and text.
 * Used by the apply pipeline to exec statements one at a time and to
 * compute diagnostic ranges.
 */
export interface StatementInfo {
  raw: RawStmt;
  stmt: Node;
  kind: string;
  /** 0-based byte offset of the statement in `source` (excludes leading whitespace). */
  start: number;
  /** 0-based byte end of the statement (excludes trailing `;` and whitespace). */
  end: number;
  /** The statement text (slice of `source`). */
  text: string;
}

/**
 * Extract per-statement info from a parse result. Handles the libpg-query
 * quirks: `stmt_location` is omitted when 0, `stmt_len` is omitted for the
 * last statement (derived from the next statement's location or EOF).
 *
 * Statement ranges exclude trailing `;` and whitespace, so `text` is the
 * bare statement without the semicolon.
 */
export function getStatements(parsed: ParseResult, source: Buffer): StatementInfo[] {
  const stmts = parsed.stmts ?? [];
  return stmts.map((raw, i) => {
    const start = raw.stmt_location ?? 0;
    let end: number;
    if (typeof raw.stmt_len === "number") {
      end = start + raw.stmt_len;
    } else if (i + 1 < stmts.length) {
      const nextStart = stmts[i + 1]?.stmt_location ?? 0;
      end = nextStart;
      while (end > start && isTrailingSep(source.readUInt8(end - 1))) {
        end--;
      }
    } else {
      end = source.length;
      while (end > start && isTrailingSep(source.readUInt8(end - 1))) {
        end--;
      }
    }
    end = Math.max(end, start);
    const stmt = raw.stmt!;
    return {
      raw,
      stmt,
      kind: Object.keys(stmt)[0]!,
      start,
      end,
      text: source.subarray(start, end).toString("utf8"),
    };
  });
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
  /**
   * Sorted (ascending by `offset`), merged (non-overlapping) list of byte
   * ranges removed from `source`. Source-absolute coordinates. Empty when
   * `modified === false`.
   *
   * Used by `mapStrippedToOriginal` to translate error positions reported
   * by a downstream consumer (e.g. PGlite applying the stripped content)
   * back to positions in the original un-preprocessed file.
   */
  removals: Removal[];
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
    return { modified: false, content: source, removals: [] };
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
  return { modified: true, content: Buffer.concat(chunks), removals: merged };
}

/**
 * Translate a byte position in the preprocessed (stripped) content back to
 * the corresponding byte position in the original un-preprocessed source.
 *
 * Use case: a downstream consumer (e.g. PGlite applying the stripped content
 * in a transaction) reports an error at position `p` into the string it
 * received. We need to map `p` back to a position in the original migration
 * file so the diagnostic points at the right place in the user's editor.
 *
 * Algorithm: walk the removals in ascending order. Each removal
 * `[offset, offset+length)` in the original doesn't appear in the stripped
 * content, so every byte at/after `offset+length` in the original is shifted
 * left by `length` in the stripped content. To invert, we add back the
 * cumulative length of all removals that precede the stripped position.
 *
 * Complexity: O(N) where N = removals.length. For migrations this is tiny
 * (typically 0 or 1 for CONCURRENTLY, or a handful for stripped DML/DO).
 * Could be made O(log N) with binary search if needed; not worth it now.
 *
 * Edge cases:
 * - `removals` must be sorted ascending and non-overlapping (as produced by
 *   `preprocess`). If not, results are undefined.
 * - A `strippedPos` that would land inside a removed range (impossible for
 *   valid stripped content, but defensive) maps to the byte immediately
 *   after the removal in the original.
 * - `strippedPos` beyond the stripped content length maps beyond the
 *   original length (caller's responsibility to clamp).
 */
export function mapStrippedToOriginal(removals: Removal[], strippedPos: number): number {
  let removedSoFar = 0;
  for (const r of removals) {
    // The byte at stripped position `strippedPos` came from original
    // position `strippedPos + removedSoFar`. If that position falls inside
    // this removal [r.offset, r.offset + r.length), then the stripped
    // position is actually the first byte AFTER this removal in the
    // original — so we accumulate this removal's length and continue.
    const strippedOffsetOfThisRemoval = r.offset - removedSoFar;
    if (strippedPos < strippedOffsetOfThisRemoval) {
      // Before this removal — no more adjustments needed.
      return strippedPos + removedSoFar;
    }
    removedSoFar += r.length;
  }
  return strippedPos + removedSoFar;
}

/**
 * Inverse of `mapStrippedToOriginal`: translate a byte position in the
 * original source to the corresponding position in the stripped content.
 *
 * Less commonly needed (the apply pipeline runs the stripped content and
 * reports errors there), but useful for e.g. mapping a known original
 * statement boundary into the stripped view.
 *
 * If `originalPos` falls inside a removed range, returns the position of
 * the first kept byte after that range in the stripped content.
 */
export function mapOriginalToStripped(removals: Removal[], originalPos: number): number {
  let removedSoFar = 0;
  for (const r of removals) {
    if (originalPos < r.offset) {
      return originalPos - removedSoFar;
    }
    if (originalPos < r.offset + r.length) {
      // Inside this removal — snap to the byte after it in the stripped view.
      return r.offset - removedSoFar;
    }
    removedSoFar += r.length;
  }
  return originalPos - removedSoFar;
}

/** Compose multiple filters into one (left-to-right; outputs concatenated). */
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

// ---------------------------------------------------------------------------
// Function-AST helpers: extract language, name, body, arg types from
// CreateFunctionStmt nodes. Used by the apply pipeline to decide whether
// to use plpgsql_check (LANGUAGE plpgsql) or PG native validation (LANGUAGE sql).
// ---------------------------------------------------------------------------

type CreateFunctionNode = {
  CreateFunctionStmt?: {
    funcname?: { String?: { sval?: string } }[];
    parameters?: { FunctionParameter?: { name?: string; argType?: { names?: { String?: { sval?: string } }[] } } }[];
    options?: { DefElem?: { defname?: string; arg?: { String?: { sval?: string } } | { List?: { items?: { String?: { sval?: string } }[] } } } }[];
  };
};

/**
 * Extract the LANGUAGE from a CreateFunctionStmt (e.g. "plpgsql", "sql").
 * Returns `undefined` if the node isn't a CreateFunctionStmt or has no
 * language option.
 */
export function getFunctionLanguage(stmt: Node): string | undefined {
  const node = stmt as CreateFunctionNode;
  if (!node.CreateFunctionStmt) return undefined;
  for (const opt of node.CreateFunctionStmt.options ?? []) {
    const def = opt?.DefElem;
    if (def?.defname === "language" && def.arg && "String" in def.arg) {
      return def.arg.String?.sval;
    }
  }
  return undefined;
}

/**
 * Extract the function name as `{ schema, name }` from a CreateFunctionStmt.
 * The `funcname` list is a path like `["public", "my_func"]`; the last
 * element is the function name, the second-to-last is the schema.
 */
export function getFunctionName(stmt: Node): { schema: string | undefined; name: string } | undefined {
  const node = stmt as CreateFunctionNode;
  if (!node.CreateFunctionStmt) return undefined;
  const parts = (node.CreateFunctionStmt.funcname ?? [])
    .map(n => n?.String?.sval)
    .filter((s): s is string => typeof s === "string");
  if (parts.length === 0) return undefined;
  if (parts.length === 1) return { schema: undefined, name: parts[0]! };
  return { schema: parts[parts.length - 2], name: parts[parts.length - 1]! };
}

/**
 * Extract the function body text (the SQL/PL/pgSQL source between `$$ ... $$`).
 * Returns the decoded body without the dollar-quote delimiters.
 */
export function getFunctionBody(stmt: Node): string | undefined {
  const node = stmt as CreateFunctionNode;
  if (!node.CreateFunctionStmt) return undefined;
  for (const opt of node.CreateFunctionStmt.options ?? []) {
    const def = opt?.DefElem;
    if (def?.defname === "as" && def.arg && "String" in def.arg) {
      return def.arg.String?.sval;
    }
  }
  return undefined;
}

/**
 * Extract the function's argument type names (last part of the qualified
 * type name, e.g. "int4" from ["pg_catalog", "int4"]).
 * Used to construct the regprocedure text for plpgsql_check_function_tb.
 *
 * Only *input* arguments are included (IN, INOUT, VARIADIC) — OUT-only
 * parameters are not part of a function's regprocedure signature, and
 * plpgsql_check_function_tb rejects a regprocedure with extra args.
 */
export function getFunctionArgTypes(stmt: Node): string[] {
  const node = stmt as CreateFunctionNode;
  if (!node.CreateFunctionStmt) return [];
  return (node.CreateFunctionStmt.parameters ?? [])
    .filter(p => {
      const mode = p?.FunctionParameter?.mode;
      // mode is undefined for plain IN args in some PG versions; treat
      // absence as IN. Exclude OUT-only.
      return mode !== "FUNC_PARAM_OUT";
    })
    .map(p => {
      const names = p?.FunctionParameter?.argType?.names ?? [];
      const last = names[names.length - 1]?.String?.sval;
      return last ?? "unknown";
    });
}

/**
 * Format the function name + arg types as a regprocedure text string
 * (e.g. `"public"."my_func"(integer, text)`), suitable for passing to
 * `plpgsql_check_function_tb`.
 */
export function formatFunctionRef(stmt: Node): string | undefined {
  const name = getFunctionName(stmt);
  if (!name) return undefined;
  const types = getFunctionArgTypes(stmt);
  const schemaPart = name.schema ? `"${name.schema}".` : "";
  const typesPart = types.length > 0 ? types.join(", ") : "";
  return `${schemaPart}"${name.name}"(${typesPart})`;
}

// ---------------------------------------------------------------------------
// DO block helpers: extract the body from a DoStmt node.
// DO blocks are anonymous PL/pgSQL code blocks, always LANGUAGE plpgsql.
// ---------------------------------------------------------------------------

type DoStmtNode = {
  DoStmt?: {
    args?: { DefElem?: { defname?: string; arg?: { String?: { sval?: string } } } }[];
  };
};

/**
 * Extract the body text from a DoStmt (the PL/pgSQL code between `$$ ... $$`).
 * DO blocks are always LANGUAGE plpgsql.
 */
export function getDoBlockBody(stmt: Node): string | undefined {
  const node = stmt as DoStmtNode;
  if (!node.DoStmt) return undefined;
  for (const opt of node.DoStmt.args ?? []) {
    const def = opt?.DefElem;
    if (def?.defname === "as" && def.arg && "String" in def.arg) {
      return def.arg.String?.sval;
    }
  }
  return undefined;
}
