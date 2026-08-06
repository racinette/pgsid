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
  // `!=` was here and is gone: PostgreSQL's lexer converts it to `<>` before
  // a parse tree exists, so no A_Expr ever carries the spelling (measured).
  "=", "<>", "<", ">", "<=", ">=",
  // Concatenation (text, array, jsonb).
  "||",
  // Pattern matching: LIKE / ILIKE / regex, and their negations.
  "~~", "!~~", "~~*", "!~~*", "~", "!~", "~*", "!~*",
]);
