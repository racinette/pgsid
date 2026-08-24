// ---------------------------------------------------------------------------
// Rung extraction for the decision-site census (rung-census.test.ts).
//
// The traced walk stamps every verdict with `trace.conclude(decision, reason)`,
// and the REASON STRINGS are the natural rung identifiers — each conclude site
// spells its rule, and the typed/name-level/consensus variants of one rule
// spell themselves differently. This module derives the rung inventory FROM
// THE SOURCE, so a new rule landing in the walk adds its rung here without
// anyone maintaining a second list — the census then fails until the corpus
// reaches it or a triage entry says why it cannot.
//
// The parse is deliberately small: find `.conclude(`, balance parentheses,
// take everything after the first top-level comma as the reason EXPRESSION,
// and reduce that expression to its ALTERNATIVES — a ternary contributes both
// branches, `+`-concatenation joins adjacent pieces, a template literal
// contributes its literal chunks with a wildcard per `${...}` (unless the
// interpolation is itself a ternary of literals, which expands). Every
// alternative becomes an anchored regex whose literal chunks are exact and
// whose wildcards match lazily.
//
// What this cannot see, it must not silently drop: a reason expression that
// yields NO literal text at all (a bare variable) is returned under
// `opaque`, and the census pins that list — today it is empty, and a site
// that starts passing reasons by variable has to be considered there.
// ---------------------------------------------------------------------------

export interface RungPattern {
  /** The pattern's identity: literal chunks joined by the `⟨*⟩` wildcard. */
  key: string;
  regex: RegExp;
  /** 1-based source lines of the conclude( call(s) this pattern came from. */
  lines: number[];
  /** Total literal length — the specificity rank for ambiguous matches. */
  literalLength: number;
}

export interface RungExtraction {
  patterns: RungPattern[];
  /**
   * Conclude sites whose reason yields no literal text — a reason passed by
   * VARIABLE. Keyed by the reason expression's own source text, which is
   * stable where line numbers are not; the census allowlists the known ones
   * and declares their strings as EXTRA_RUNGS.
   */
  opaque: { line: number; expr: string }[];
}

const WILD = Symbol("wild");
type Piece = string | typeof WILD;
type Alternative = Piece[];

/** Split `text` at top-level occurrences of a single-char separator. */
function splitTopLevel(text: string, sep: string): string[] | null {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  let found = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (ch === '"' || ch === "'" || ch === "`") {
      i = skipString(text, i);
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") depth--;
    else if (depth === 0 && ch === sep) {
      parts.push(text.slice(start, i));
      start = i + 1;
      found = true;
    }
  }
  if (!found) return null;
  parts.push(text.slice(start));
  return parts;
}

/** Index of the closing quote of the string starting at `i`. */
function skipString(text: string, i: number): number {
  const quote = text[i]!;
  for (let j = i + 1; j < text.length; j++) {
    const ch = text[j]!;
    if (ch === "\\") {
      j++;
      continue;
    }
    if (quote === "`" && ch === "$" && text[j + 1] === "{") {
      // skip the interpolation with its own nesting (strings included)
      let depth = 1;
      j += 2;
      while (j < text.length && depth > 0) {
        const c = text[j]!;
        if (c === '"' || c === "'" || c === "`") j = skipString(text, j);
        else if (c === "{") depth++;
        else if (c === "}") depth--;
        j++;
      }
      j--; // loop's j++ moves past the closing brace
      continue;
    }
    if (ch === quote) return j;
  }
  return text.length;
}

function unescape(raw: string): string {
  return raw.replace(/\\(.)/g, "$1");
}

/** The alternatives of one expression, each a sequence of pieces. */
function parseExpr(text: string): Alternative[] {
  const trimmed = text.trim();

  // Ternary: everything before the first top-level `?` is the condition.
  // Right-associative, so the else-branch may itself be a ternary — parseExpr
  // handles that by recursion.
  const q = topLevelIndex(trimmed, "?");
  if (q !== null) {
    const rest = trimmed.slice(q + 1);
    const c = topLevelTernaryColon(rest);
    if (c !== null) {
      return [...parseExpr(rest.slice(0, c)), ...parseExpr(rest.slice(c + 1))];
    }
  }

  // Concatenation: cross-product of the parts' alternatives.
  const plusParts = splitTopLevel(trimmed, "+");
  if (plusParts !== null) {
    let acc: Alternative[] = [[]];
    for (const part of plusParts) {
      const partAlts = parseExpr(part);
      const next: Alternative[] = [];
      for (const a of acc) for (const b of partAlts) next.push([...a, ...b]);
      acc = next;
    }
    return acc;
  }

  // Parenthesized.
  if (trimmed.startsWith("(") && matchingParen(trimmed, 0) === trimmed.length - 1) {
    return parseExpr(trimmed.slice(1, -1));
  }

  // String literal.
  if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
    const end = skipString(trimmed, 0);
    if (end === trimmed.length - 1) {
      return [[unescape(trimmed.slice(1, -1))]];
    }
  }

  // Template literal.
  if (trimmed.startsWith("`") && skipString(trimmed, 0) === trimmed.length - 1) {
    return parseTemplate(trimmed.slice(1, -1));
  }

  // Anything else — a variable, a call — is a wildcard.
  return [[WILD]];
}

/** First top-level index of `ch`, or null. */
function topLevelIndex(text: string, ch: string): number | null {
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === '"' || c === "'" || c === "`") {
      i = skipString(text, i);
      continue;
    }
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth--;
    else if (depth === 0 && c === ch) return i;
  }
  return null;
}

/**
 * The `:` that closes the ternary whose `?` this text follows. Nested
 * ternaries in the THEN branch push a pending `?` each; the first `:` at
 * balance zero closes the outermost.
 */
function topLevelTernaryColon(text: string): number | null {
  let depth = 0;
  let pending = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === '"' || c === "'" || c === "`") {
      i = skipString(text, i);
      continue;
    }
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth--;
    else if (depth === 0 && c === "?") pending++;
    else if (depth === 0 && c === ":") {
      if (pending === 0) return i;
      pending--;
    }
  }
  return null;
}

function matchingParen(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const c = text[i]!;
    if (c === '"' || c === "'" || c === "`") {
      i = skipString(text, i);
      continue;
    }
    if (c === "(") depth++;
    else if (c === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function parseTemplate(body: string): Alternative[] {
  let acc: Alternative[] = [[]];
  let literal = "";
  const flush = (piece: Piece): void => {
    acc = acc.map(a => [...a, piece]);
  };
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]!;
    if (ch === "\\") {
      literal += body[i + 1] ?? "";
      i++;
      continue;
    }
    if (ch === "$" && body[i + 1] === "{") {
      if (literal) {
        flush(literal);
        literal = "";
      }
      // find the matching close brace
      let depth = 1;
      let j = i + 2;
      while (j < body.length && depth > 0) {
        const c = body[j]!;
        if (c === '"' || c === "'" || c === "`") j = skipString(body, j) + 1;
        else {
          if (c === "{") depth++;
          else if (c === "}") depth--;
          j++;
        }
      }
      const inner = body.slice(i + 2, j - 1);
      const innerAlts = parseExpr(inner);
      // An interpolation that is a ternary of pure literals expands — that is
      // how `${result ? "notNull" : "nullable"}` yields both outcomes' rungs.
      const allLiteral =
        innerAlts.length > 1 &&
        innerAlts.every(a => a.length === 1 && typeof a[0] === "string");
      if (allLiteral) {
        const next: Alternative[] = [];
        for (const a of acc) for (const alt of innerAlts) next.push([...a, alt[0]!]);
        acc = next;
      } else {
        flush(WILD);
      }
      i = j - 1;
      continue;
    }
    literal += ch;
  }
  if (literal) flush(literal);
  return acc;
}

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function toPattern(alt: Alternative, line: number): RungPattern | null {
  // Collapse adjacent literals, drop empty ones.
  const pieces: Piece[] = [];
  for (const p of alt) {
    if (typeof p === "string") {
      if (p === "") continue;
      const last = pieces[pieces.length - 1];
      if (typeof last === "string") pieces[pieces.length - 1] = last + p;
      else pieces.push(p);
    } else if (pieces[pieces.length - 1] !== WILD) {
      pieces.push(WILD);
    }
  }
  const literalLength = pieces.reduce<number>(
    (n, p) => n + (typeof p === "string" ? p.length : 0),
    0,
  );
  if (literalLength === 0) return null;
  const key = pieces.map(p => (typeof p === "string" ? p : "⟨*⟩")).join("");
  const regex = new RegExp(
    "^" + pieces.map(p => (typeof p === "string" ? escapeRegex(p) : "[\\s\\S]*?")).join("") + "$",
  );
  return { key, regex, lines: [line], literalLength };
}

export function extractConcludeRungs(source: string): RungExtraction {
  const byKey = new Map<string, RungPattern>();
  const opaque: { line: number; expr: string }[] = [];

  let from = 0;
  for (;;) {
    const at = source.indexOf(".conclude(", from);
    if (at === -1) break;
    from = at + 1;
    const line = source.slice(0, at).split("\n").length;
    const open = at + ".conclude".length;
    const close = matchingParen(source, open);
    if (close === -1) continue;
    const args = source.slice(open + 1, close);
    const comma = topLevelIndex(args, ",");
    if (comma === null) continue; // a one-argument conclude is not a verdict site
    // conclude(decision, reason[,]) — a multi-line call carries a trailing
    // comma, which is not a third argument.
    let reasonExpr = args.slice(comma + 1).trim();
    if (reasonExpr.endsWith(",")) reasonExpr = reasonExpr.slice(0, -1).trimEnd();

    const alts = parseExpr(reasonExpr);
    let any = false;
    for (const alt of alts) {
      const p = toPattern(alt, line);
      if (!p) continue;
      any = true;
      const existing = byKey.get(p.key);
      if (existing) {
        if (!existing.lines.includes(line)) existing.lines.push(line);
      } else {
        byKey.set(p.key, p);
      }
    }
    if (!any) opaque.push({ line, expr: reasonExpr });
  }

  return { patterns: [...byKey.values()], opaque };
}

/**
 * A pattern from a hand-declared key — the census's channel for the reasons
 * a conclude site passes by VARIABLE. `⟨*⟩` marks a wildcard, as in extracted
 * keys. Self-policing both ways: if the source string drifts, the observed
 * reason stops matching and the unmatched assertion fails; if the mechanism
 * dies, the rung goes cold and the dark triage catches it.
 */
export function declaredRung(key: string): RungPattern {
  const parts = key.split("⟨*⟩");
  const regex = new RegExp(
    "^" + parts.map(escapeRegex).join("[\\s\\S]*?") + "$",
  );
  return {
    key,
    regex,
    lines: [],
    literalLength: parts.reduce((n, p) => n + p.length, 0),
  };
}

/**
 * The most specific pattern matching `reason`, or null. Specificity is total
 * literal length — `operand of '+' is nullable → nullable` must land on its
 * own rung, not on some all-wildcard cousin.
 */
export function matchRung(patterns: RungPattern[], reason: string): RungPattern | null {
  let best: RungPattern | null = null;
  for (const p of patterns) {
    if (!p.regex.test(reason)) continue;
    if (!best || p.literalLength > best.literalLength) best = p;
  }
  return best;
}
