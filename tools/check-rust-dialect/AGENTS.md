# Generated CHECK Rust dialect

These instructions apply to the dedicated checker and to changes that expand
the Rust syntax emitted for CHECK evaluators. Keep the accepted language as
small as the generated evaluator needs. The checker is the executable boundary;
update its tests when that boundary changes.

## Scope

- Check the generated evaluator fragment before combining it with maintained
  Rust operations. The fragment contains concrete functions for one CHECK
  expression. The combined source still needs Rust compilation and target
  transpilation.
- Keep PostgreSQL operation behavior in maintained Rust. Generated functions
  select operations and control evaluation order; they do not duplicate scalar
  behavior in Go or TypeScript.
- The checker restricts syntax and bound identifier use. Rust compilation
  checks types, call signatures, and references after the fragment is combined
  with its operations. Passing the checker alone does not establish parity.

## Initial language

- Emit functions with explicit `CheckOutcome` returns. The sole public entry
  is `evaluate_check`; helper functions are private `check_part_*` functions.
- Parameters are immutable named values of `Int4Value` or `TextValue`.
  Calls take bound identifiers, unsuffixed decimal integer literals, or
  string literals.
- Bodies contain immutable `let` bindings initialized by direct calls,
  optional `if` statements whose condition is a direct call and whose body
  returns one bound value, and a final direct call as the tail expression.
- Keep evaluation order visible in statements. A deciding boolean result must
  return before code for the unselected operand runs.
- Do not add syntax for convenience. Mutation, loops, generics, methods,
  nested calls, closures, and extra declarations require a concrete CHECK
  expression that cannot be emitted with the accepted forms.

## Growing the boundary

- Start from a CHECK expression and its expected SQL behavior. Try emitting it
  with the current forms before extending the checker.
- Add the smallest new rule, one accepted example, and a nearby rejected
  example. Reject unsupported syntax explicitly.
- Compile the assembled Rust source. Generate both targets and exercise the
  same values, NULL, unknown, errors, and lazy branches in each target.
  Compare supported SQL behavior with PostgreSQL or PGlite fixtures.
- Run `bash tools/check-rust-spike/check.sh` from the repository root while
  this spike is the consumer. Follow the downstream transpiler's own rules
  and verification gates when changing its accepted syntax or lowering.
