// ---------------------------------------------------------------------------
// A psql-style statement splitter for the PostgreSQL regression scripts.
//
// The regress corpus cannot be split by parsing whole files: 121 of the 232
// scripts contain psql METACOMMANDS (`\getenv`, `\d`, `\gset`, `\if`), inline
// COPY data terminated by `\.`, or statements whose syntax error IS the test
// — pg_regress feeds them through psql, which cuts on top-level semicolons
// and treats backslash lines as its own commands. This reproduces exactly
// that cut: comments, single/double quotes, dollar-quoting, and semicolon
// termination, with three unit kinds so the replay can count what it skips
// instead of silently swallowing it.
//
// psql-isms deliberately NOT emulated, each surfacing as an ordinary failed
// execution the census counts: `:'var'` interpolation (the COPY ... FROM
// :'filename' loads — so the big regress tables simply stay empty, which is
// fine for a shape-and-refusal pass), `\gset` variable capture, and `\if`
// conditionals (both branches' statements replay; their failures count).
// ---------------------------------------------------------------------------

export interface SqlUnit {
  kind: "statement" | "metacommand" | "copy-data";
  text: string;
  /** 1-based line where the unit starts, for census keys. */
  line: number;
}

export function splitPsql(source: string): SqlUnit[] {
  const units: SqlUnit[] = [];
  const n = source.length;
  let i = 0;
  let line = 1;
  let stmtStart = -1;
  let stmtLine = 1;
  /** Only whitespace/comments seen since the last statement boundary. */
  let atBoundary = true;
  /** psql cuts on `;` only at parenthesis depth 0 — a CREATE RULE's action
   *  list carries inner semicolons. */
  let parenDepth = 0;

  const advance = (to: number): void => {
    for (let k = i; k < to; k++) if (source[k] === "\n") line++;
    i = to;
  };

  const push = (kind: SqlUnit["kind"], from: number, to: number, atLine: number): void => {
    const text = source.slice(from, to).trim();
    if (text.length > 0) units.push({ kind, text, line: atLine });
  };

  const lineEnd = (from: number): number => {
    const nl = source.indexOf("\n", from);
    return nl === -1 ? n : nl;
  };

  while (i < n) {
    const ch = source[i]!;

    // Comments and whitespace never open a statement.
    if (ch === "-" && source[i + 1] === "-") {
      advance(lineEnd(i));
      continue;
    }
    if (ch === "/" && source[i + 1] === "*") {
      let depth = 1;
      let k = i + 2;
      while (k < n && depth > 0) {
        if (source[k] === "/" && source[k + 1] === "*") {
          depth++;
          k += 2;
        } else if (source[k] === "*" && source[k + 1] === "/") {
          depth--;
          k += 2;
        } else k++;
      }
      advance(k);
      continue;
    }
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      advance(i + 1);
      continue;
    }

    // A backslash at a statement boundary is a psql metacommand — one line.
    if (ch === "\\" && atBoundary) {
      const end = lineEnd(i);
      push("metacommand", i, end, line);
      advance(end);
      continue;
    }

    if (stmtStart === -1) {
      stmtStart = i;
      stmtLine = line;
      atBoundary = false;
    }

    if (ch === "'") {
      // Standard string: '' is an escaped quote, a backslash is literal.
      // E'…' strings (an [eE] immediately before the quote that is not the
      // tail of an identifier) escape with backslash — psql draws the same
      // distinction when it cuts.
      const before = source[i - 1] ?? "";
      const beforeBefore = source[i - 2] ?? "";
      const escapeString =
        (before === "e" || before === "E") && !/[A-Za-z0-9_$]/.test(beforeBefore);
      let k = i + 1;
      while (k < n) {
        if (escapeString && source[k] === "\\" && k + 1 < n) {
          k += 2;
          continue;
        }
        if (source[k] === "'") {
          if (source[k + 1] === "'") {
            k += 2;
            continue;
          }
          break;
        }
        k++;
      }
      advance(Math.min(k + 1, n));
      continue;
    }
    if (ch === '"') {
      let k = i + 1;
      while (k < n && source[k] !== '"') k++;
      advance(Math.min(k + 1, n));
      continue;
    }
    if (ch === "$") {
      // Dollar quoting: $tag$ … $tag$. A lone $n parameter falls through.
      const m = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(source.slice(i, i + 64));
      if (m) {
        const tag = m[0];
        const close = source.indexOf(tag, i + tag.length);
        advance(close === -1 ? n : close + tag.length);
        continue;
      }
    }

    if (ch === "(") {
      parenDepth++;
      advance(i + 1);
      continue;
    }
    if (ch === ")") {
      parenDepth = Math.max(0, parenDepth - 1);
      advance(i + 1);
      continue;
    }

    if (ch === ";" && parenDepth === 0) {
      const from = stmtStart;
      const atLine = stmtLine;
      const text = source.slice(from, i);
      push("statement", from, i + 1, atLine);
      stmtStart = -1;
      atBoundary = true;
      parenDepth = 0; // an unbalanced statement must not poison the next cut
      advance(i + 1);

      // Inline COPY data: `COPY … FROM stdin;` is followed by raw rows the
      // splitter must consume to the `\.` terminator, or every data line
      // replays as a syntax error.
      if (/\bfrom\s+stdin\b/i.test(text)) {
        const dataStart = i;
        const dataLine = line;
        const term = /^\\\.\s*$/m;
        const rest = source.slice(i);
        const tm = term.exec(rest);
        const end = tm ? i + tm.index + tm[0].length : n;
        push("copy-data", dataStart, end, dataLine);
        advance(end);
      }
      continue;
    }

    advance(i + 1);
  }
  if (stmtStart !== -1) push("statement", stmtStart, n, stmtLine);
  return units;
}
