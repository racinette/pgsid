// ---------------------------------------------------------------------------
// Builtin operators that are both TOTAL and STRICT, shared between the two
// analyses that need one property each:
//
//   TOTAL  — never NULL for non-null operands. The output walk
//            (nullability-walk.ts) uses this to claim notNull for an A_Expr
//            whose operands are all notNull.
//   STRICT — NULL for any NULL operand. Mechanism-C attribution
//            (param-nullability.ts) uses this to conclude that a parameter
//            being NULL forces the expression NULL, so a runtime NOT NULL
//            coercion downstream will raise.
//
// Every listed builtin has BOTH properties; an operator with only one must
// not be added — it would be sound for one consumer and wrong for the other.
// The two files cannot import from each other (nullability-walk already
// imports param-nullability), which is why the set lives here.
// ---------------------------------------------------------------------------

export const TOTAL_STRICT_OPERATORS: ReadonlySet<string> = new Set([
  // Arithmetic. Division and modulo raise on a zero divisor rather than
  // returning NULL, so they are total in the sense that matters here.
  "+", "-", "*", "/", "%", "^",
  // Comparison — always a plain boolean for non-null operands.
  "=", "<>", "!=", "<", ">", "<=", ">=",
  // Concatenation (text, array, jsonb).
  "||",
  // Pattern matching: LIKE / ILIKE / regex, and their negations.
  "~~", "!~~", "~~*", "!~~*", "~", "!~", "~*", "!~*",
]);

// ---------------------------------------------------------------------------
// pg_catalog functions declared STRICT: NULL in → NULL out. Consumed by the
// strict-expression closures in both analyses, always in the same direction:
// "if this leaf is NULL, the whole expression is NULL" — whose contrapositive
// ("the expression was non-null / the predicate was TRUE, so the leaf was
// non-null") is what promotion and narrowing conclude.
//
// STRICTNESS ONLY. Totality is deliberately NOT implied — that property
// belongs to STRICT_TOTAL_BUILTINS in nullability-walk.ts, and the two sets
// are different: quote_nullable, num_nulls, num_nonnulls, pg_typeof, and the
// array_append family are total but NOT strict (measured 2026-08-01 against
// PGlite/PostgreSQL 18: each returns a value for a NULL argument), so adding
// them here would let a promotion fire on a predicate that can be TRUE with
// a NULL column. Every entry below was measured to return NULL for a NULL
// argument in that same run.
// ---------------------------------------------------------------------------

export const STRICT_BUILTIN_FUNCTIONS: ReadonlySet<string> = new Set([
  // Math
  "abs", "ceil", "ceiling", "floor", "round", "trunc", "sign", "sqrt", "cbrt",
  "exp", "ln", "log", "log10", "power", "mod", "div", "gcd", "lcm",
  "degrees", "radians", "sin", "cos", "tan", "asin", "acos", "atan", "atan2",
  "width_bucket",
  // String
  "lower", "upper", "initcap", "length", "char_length", "character_length",
  "octet_length", "bit_length", "md5", "ascii", "chr", "repeat", "reverse",
  "substr", "substring", "replace", "translate", "overlay",
  "ltrim", "rtrim", "btrim", "lpad", "rpad",
  "split_part", "strpos", "left", "right", "starts_with",
  "quote_ident", "quote_literal",
  "to_char", "to_number", "to_date", "to_timestamp", "to_hex",
  "encode", "decode", "sha256",
  // Arrays
  "array_to_string", "string_to_array", "cardinality", "array_remove",
  "array_position",
  // Date / time
  "date_part", "date_trunc", "age", "justify_days", "justify_hours",
  "justify_interval", "make_date", "make_time", "isfinite",
  // JSON
  "to_json", "to_jsonb", "jsonb_typeof", "json_typeof", "jsonb_array_length",
  "json_array_length", "row_to_json", "jsonb_strip_nulls", "jsonb_pretty",
]);
