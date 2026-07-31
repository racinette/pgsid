// ---------------------------------------------------------------------------
// Parsing names as PostgreSQL prints them.
//
// A catalog snapshot is full of names rendered by PostgreSQL itself —
// `format_type` for a column's type, `pg_get_function_result` for a return
// type. The snapshot is taken with an empty `search_path` so that rendering is
// independent of session state, which means anything outside `pg_catalog`
// arrives schema-qualified and anything inside it does not.
//
// Consumers that look a name up in the catalog therefore have to split it
// first, and splitting on `.` is not enough: an identifier needing quotes keeps
// them, and may contain a dot.
// ---------------------------------------------------------------------------

/**
 * Split a printed name into its schema and its base name.
 *
 * A dot separates only outside double quotes, and a doubled quote inside them
 * is one literal quote — `"my.schema"."odd""name"` is one schema and one name,
 * not four parts. A name with no qualifier yields an undefined schema, which
 * callers pass through to the catalog's own search-path resolution.
 *
 * Only the last two parts are considered, so a type name that is somehow more
 * deeply qualified degrades to its own schema and name rather than failing.
 */
export function splitQualifiedName(printed: string): {
  schema: string | undefined;
  name: string;
} {
  const parts: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < printed.length; i++) {
    const ch = printed[i]!;
    if (ch === '"') {
      if (quoted && printed[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === "." && !quoted) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return {
    schema: parts.length >= 2 ? parts[parts.length - 2] : undefined,
    name: parts[parts.length - 1]!,
  };
}
