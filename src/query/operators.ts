// ---------------------------------------------------------------------------
// Builtin operators, by the property each consumer actually needs:
//
//   TOTAL  — never NULL for non-null operands. The output walk
//            (nullability-walk.ts) uses this to claim notNull for an A_Expr
//            whose operands are all notNull.
//   STRICT — NULL for any NULL operand. Mechanism-C attribution
//            (param-nullability.ts) and WHERE-side promotion use this to
//            conclude that a parameter being NULL forces the expression NULL,
//            so a runtime NOT NULL coercion downstream will raise.
//
// **These were ONE set until the totality probe ran** (2026-08-06,
// docs/generated-surface.md item 3), on the rule that every member must have
// BOTH properties — with the file's own warning that "an operator with only
// one must not be added, it would be sound for one consumer and wrong for the
// other". Execution found two members with only one, in opposite directions,
// so the warning had come true twice and the shared set was the thing making
// it possible:
//
//   `+`  is not TOTAL. `path + path` returns NULL whenever EITHER operand is
//        a CLOSED path (measured; open + open is a value, and `path + point`
//        is total). Every other `+` overload is total.
//   `||` is not STRICT. `ARRAY[1,2] || NULL` is `{1,2}`, not NULL (measured;
//        `'a' || NULL::text` IS NULL, so the text meaning is strict and the
//        array meaning is not). It IS total in every overload.
//
// Splitting is what the two consumers were already asking for — each use site
// documented which property it wanted — so a defect in one property no longer
// costs the other its precision.
//
// **BOTH names are KEPT, with the hole recorded** in `PARTIAL_OVERLOADS` and
// `NON_STRICT_OVERLOADS` below, each asserted from both sides by
// `totality-probe.test.ts` so it can never widen unnoticed. The reasoning is
// the register's foreign-key-trust precedent rather than the `lower`/`upper`
// one: the falsifying input needs a `path`-typed column, which essentially no
// application schema has, while removing the name costs the general case —
// `id + 1` on a NOT NULL integer, the most common arithmetic in SQL, would
// read nullable. `random` went the OTHER way in the same sitting and the
// contrast is the rule: its `random(min, max)` overloads take ordinary
// integers, so the falsifying input is entirely ordinary and removal was
// right.
//
// Both are name-level dispatch covering two meanings, which is exactly what
// `docs/type-aware-overloads.md` narrows; that charter carries them as its
// worked test cases.
//
// The two files cannot import from each other (nullability-walk already
// imports param-nullability), which is why the sets live here.
// ---------------------------------------------------------------------------

/**
 * Never NULL for non-null operands. Consumed by the output walk.
 *
 * `+` is here despite its `path + path` overload — see the header and
 * `PARTIAL_OVERLOADS`.
 */
export const TOTAL_OPERATORS: ReadonlySet<string> = new Set([
  // Arithmetic. Division and modulo raise on a zero divisor rather than
  // returning NULL, so they are total in the sense that matters here.
  "+", "-", "*", "/", "%", "^",
  // Comparison — always a plain boolean for non-null operands.
  // `!=` was here and is gone: PostgreSQL's lexer converts it to `<>` before
  // a parse tree exists, so no A_Expr ever carries the spelling (measured).
  "=", "<>", "<", ">", "<=", ">=",
  // Concatenation (text, array, jsonb) — total in every overload, including
  // the array ones that make it a recorded exception in STRICT_OPERATORS.
  "||",
  // Pattern matching: LIKE / ILIKE / regex, and their negations.
  "~~", "!~~", "~~*", "!~~*", "~", "!~", "~*", "!~*",
  // -------------------------------------------------------------------------
  // The operator batch (2026-08-09, docs/builtin-surface-classification.md — the
  // last half of the re-key's surface). Every row of each symbol below was
  // unwitnessed across the corner corpus AND convicted by hand on the classes
  // the corpus reaches for it: an array holding a NULL ELEMENT, the empty
  // array, the empty range and multirange, a jsonb null and a null-VALUED
  // key, mismatched inet families. They are containment, overlap and
  // key-existence tests, so they answer a plain boolean, and where the
  // operands are incompatible they RAISE rather than answer NULL —
  // `inet & inet` across families and `bit & bit` at different widths are
  // the two that prove it.
  //
  // These join TOTAL_OPERATORS only. STRICT_OPERATORS is a separate property
  // with a separate consumer — this file's founding lesson — and nothing
  // here has been measured for it.
  // -------------------------------------------------------------------------
  // Containment and overlap: arrays, ranges, multiranges, jsonb, tsquery.
  "@>", "<@", "&&",
  // Range and network position, including the network containment pair that
  // is the reason `<<=` and `>>=` exist at all (`ip <<= '10.0.0.0/8'`).
  "<<", ">>", "<<=", ">>=", "-|-", "&<", "&>",
  // jsonb key existence, and path deletion.
  "?", "?|", "?&", "#-",
  // Prefix match — the indexable half of `LIKE 'abc%'`.
  "^@",
  // Bitwise AND/OR over the integer types, bit strings and inet.
  "&", "|",
  // -------------------------------------------------------------------------
  // The REST of the operator surface (2026-08-09, second pass — "every
  // operator, no exceptions"). The first pass left these on triage, that
  // being a judgment about where to spend EFFORT rather than an argument for
  // leaving convicted rows unclaimed; the effort was then spent. All 83
  // remaining rows were probed individually against the DEGENERATE shapes the
  // shared corpus lacks — a zero-length lseg, a zero-radius circle, a
  // single-point polygon and path, horizontal and vertical lines — and the
  // sweep convicted 82 and found one NULL, which is the whole reason the pass
  // was worth running.
  //
  // `<->` is the one, and it is OUT: `path <-> path` is NULL whenever either
  // path has a SINGLE POINT (`path_distance`; witnessed). Its other 25 rows
  // are total, but a name cannot say so — and unlike `+`'s recorded hole
  // there is no general case to protect here, so the whole symbol stays
  // unclaimed rather than acquiring a PARTIAL_OVERLOADS excuse.
  //
  // Geometric position and containment: strictly-below/above, overlaps-above/
  // below, intersects, is-horizontal/vertical/perpendicular/parallel, same-as.
  "<<|", "|>>", "&<|", "|&>", "<^", ">^", "?#", "?-", "?-|", "?||", "~=",
  // Prefix arithmetic: absolute value, square and cube root, tsquery
  // negation, and the length of an lseg or path. `|/ (-1)` raises rather
  // than answering NULL, which is the criterion, not an exception to it.
  "@", "|/", "||/", "!!", "@-@",
  // Text search: the deprecated two-argument match spellings.
  "@@@",
  // The pattern-ops class comparisons behind `text_pattern_ops` indexes.
  "~<~", "~<=~", "~>~", "~>=~",
  // The record-image comparisons (amcheck's, and REINDEX's). They compare
  // byte images, so a NULL FIELD is part of the image rather than a NULL
  // result — `ROW(1,NULL)::record *= ROW(1,NULL)::record` is true.
  "*<", "*<=", "*=", "*<>", "*>", "*>=",
]);

/**
 * NULL for any NULL operand. Consumed by mechanism-C attribution and by
 * WHERE-side promotion, neither of which needs totality — both conclude
 * about the OPERANDS, never about the result.
 *
 * `||` is here DESPITE its array overloads not being strict, and that is a
 * measured choice rather than an oversight — `NON_STRICT_OVERLOADS` below
 * records it, and `totality-probe.test.ts` holds the record to the catalog.
 * Removing it was tried and is worse in the direction that matters: the
 * generated corpus immediately produced three bindings the CONTRACT ADMITTED
 * and PostgreSQL rejected (`INSERT INTO tags (name) VALUES (COALESCE($1, $2
 * || $3))` with all three NULL — text `||` IS strict, so the COALESCE is NULL
 * and the NOT NULL column raises). Under-reporting strictness makes the
 * emitted types LIE about a binding that fails; over-reporting it only makes
 * a parameter read non-nullable where NULL would in fact have been accepted.
 * The first is a runtime error, the second an over-strict type, so the
 * over-report is the safer error and is what this set takes.
 */
export const STRICT_OPERATORS: ReadonlySet<string> = new Set([
  "+", "-", "*", "/", "%", "^",
  "=", "<>", "<", ">", "<=", ">=",
  "||",
  "~~", "!~~", "~~*", "!~~*", "~", "!~", "~*", "!~*",
]);

/**
 * Members of `TOTAL_OPERATORS` with a NON-total overload, and why each is kept
 * anyway. An entry is a known unsoundness, bounded by the operand types named
 * in it: for those, the walk claims notNull where PostgreSQL can answer NULL.
 * Recorded rather than tolerated silently, asserted from both sides by
 * `totality-probe.test.ts`, and recovered by `docs/type-aware-overloads.md`.
 */
/**
 * Names KEPT on `TOTAL_OPERATORS` that carry a non-total signature, with the
 * defect recorded. Consulted by the walk at the NAME-LEVEL FALLBACK — the
 * branch reached exactly when the signature narrowing could not decide — where
 * the presence of a key here REFUSES the claim.
 *
 * That consultation was added 2026-08-24, and its absence was a measured
 * unsoundness rather than a rounding error. The reasoning below is right about
 * where the hole is and was silent about when the hole is REACHED: the
 * name-level claim fires precisely where operand types are unreadable, which
 * is precisely where the path row cannot be eliminated. A path column behind a
 * set operation claimed notNull and PostgreSQL returned NULL on every row
 * (`name-level-partial-overload.sql`).
 *
 * The general case survives untouched, because it never reaches that branch:
 * `id + 1` on a NOT NULL integer narrows to `+(integer,integer)` and answers
 * there. What is given up is the claim over operands nothing could type, which
 * is the claim that had no grounds.
 */
export const PARTIAL_OVERLOADS: Record<string, string> = {
  "+":
    "`path + path` is NULL whenever EITHER operand is a CLOSED path — " +
    "`'((0,0),(1,1))'::path + '[(0,0),(1,1)]'::path` (measured; open + open " +
    "is a value, and `path + point` is total). Kept because the falsifying " +
    "input needs a path-typed column and removing the name costs `id + 1` on " +
    "a NOT NULL integer, which is the general case.",
};

/**
 * The SIGNATURE-keyed half of `PARTIAL_OVERLOADS` — the rows of a kept name
 * that are not total, keyed `name(left,right)` in format_type renderings.
 * The operator narrowing (docs/type-aware-overloads.md tier 2) consults
 * this per SURVIVOR: a survivor in this set fails the totality consensus,
 * which is what turns the recorded name-level hole into a typed claim —
 * `id + 1` eliminates the path row and keeps notNull; a path-typed operand
 * keeps the row and reads nullable. The prose record above stays the
 * human-facing reason; the two must list the same defects.
 */
export const NON_TOTAL_OPERATOR_SIGNATURES: ReadonlySet<string> = new Set([
  "+(path,path)",
]);

/**
 * The POSITIVE signature-keyed half (2026-08-09), completing the re-key for
 * the operator surface: rows that are total under a symbol whose NAME cannot
 * carry the claim, because a SIBLING row of the same symbol is witnessed
 * NULL. `NON_TOTAL_OPERATOR_SIGNATURES` above is the same idea in the other
 * direction — a hole in a claimed name — and the two are read together, this
 * set granting and that one exempting.
 *
 * Four symbols needed it, and each is one witnessed row away from being
 * claimable outright:
 *
 *   `@@` — `jsonb @@ jsonpath` is NULL for a strict path under `silent`, so
 *          the name is out and `tsvector @@ tsquery`, the full-text search
 *          match every application writes, was out with it.
 *   `#`  — `line # line` and `lseg # lseg` are NULL for non-intersecting
 *          operands, which took bitwise XOR on the integer types with them.
 *   `##` — `lseg ## lseg` and `line ## lseg` are NULL (coincident and
 *          zero-length operands respectively).
 *   `<->`— `path <-> path` is NULL for a single-point path; the other 25
 *          distance rows are total.
 *
 * A key is `name(left,right)` in format_type renderings, with an EMPTY left
 * for a prefix operator — the spelling the operator capture and the surface
 * work list both use.
 */
export const TOTAL_OPERATOR_SIGNATURES: ReadonlySet<string> = new Set([
  // Text search match, and the geometric centre prefix.
  "@@(tsvector,tsquery)", "@@(tsquery,tsvector)", "@@(text,text)", "@@(text,tsquery)",
  "@@(,box)", "@@(,circle)", "@@(,lseg)", "@@(,polygon)",
  // Bitwise XOR, box intersection, and the point-count prefix.
  "#(integer,integer)", "#(bigint,bigint)", "#(smallint,smallint)", "#(bit,bit)",
  "#(box,box)", "#(,path)", "#(,polygon)",
  // Closest point — every row but the two witnessed ones.
  "##(lseg,box)", "##(point,box)", "##(point,line)", "##(point,lseg)",
  // Distance — every row but `path <-> path`.
  "<->(box,box)", "<->(box,lseg)", "<->(box,point)", "<->(circle,circle)",
  "<->(circle,point)", "<->(circle,polygon)", "<->(line,line)", "<->(line,lseg)",
  "<->(line,point)", "<->(lseg,box)", "<->(lseg,line)", "<->(lseg,lseg)",
  "<->(lseg,point)", "<->(path,point)", "<->(point,box)", "<->(point,circle)",
  "<->(point,line)", "<->(point,lseg)", "<->(point,path)", "<->(point,point)",
  "<->(point,polygon)", "<->(polygon,circle)", "<->(polygon,point)",
  "<->(polygon,polygon)", "<->(tsquery,tsquery)",
]);

/**
 * Members of `STRICT_OPERATORS` with a NON-strict overload, and why each is
 * kept anyway. An entry is a known over-report: for these operand types the
 * contract calls a parameter rejected where the statement would have
 * succeeded.
 */
export const NON_STRICT_OVERLOADS: Record<string, string> = {
  "||":
    "array concatenation ABSORBS a NULL operand — `ARRAY[1,2] || NULL` is " +
    "`{1,2}` (measured), while `'a' || NULL::text` IS NULL. Dropping the name " +
    "loses the text meaning, and the text meaning is what mechanism C needs " +
    "to predict a real rejection; measured, dropping it made the corpus admit " +
    "three bindings PostgreSQL rejects.",
};
