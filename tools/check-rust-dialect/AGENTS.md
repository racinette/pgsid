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

## Generated language

- Emit one function with an explicit `CheckOutcome` return per constraint. A
  standalone expression exports `evaluate_check`; catalog entries derive their
  names from schema, table/domain, constraint, and a short identity hash.
  Inherited domain entries also identify the declaring domain. Keep expression parts inside that function.
- Parameters are immutable named values of `Int4Value`, `Int8Value`, `DateValue`, `TimestamptzValue`, `EnumValue`, `TextValue`, or
  `BoolValue`. Calls take bound identifiers, in-range signed `int4`/`int8` literals,
  string literals, or boolean literals. The `int4` minimum uses
  `-2147483647 - 1`. Int8 literals use an explicit `i64` suffix, including
  `-9223372036854775808i64`. Keep integer literals in decimal syntax.
- Bodies contain local bindings initialized by direct calls or bound values.
  Mutable `CheckOutcome`, `Int4Value`, `Int8Value`, `DateValue`, `TimestamptzValue`, `EnumValue`, `TextValue`, and `BoolValue` locals hold
  results shared across branches and may be
  assigned a direct call or bound value. `if` and `else` branches may contain
  those same statements; conditions are direct calls or a direct call compared
  with `false`. The final expression is a bound result or direct call.
- Keep evaluation order visible in statements. A deciding boolean result must
  skip code for the unselected operand.
- Do not add syntax for convenience. Loops, generics, methods, nested calls,
  closures, and extra declarations require a concrete CHECK expression that
  cannot be emitted with the accepted forms.

## Growing the boundary

- Start from a CHECK expression and its expected SQL behavior. Try emitting it
  with the current forms before extending the checker.
- Add the smallest new rule, one accepted example, and a nearby rejected
  example. Reject unsupported syntax explicitly.
- Compile the assembled Rust source. Generate both targets and exercise the
  same values, NULL, unknown, errors, and lazy branches in each target.
  Compare supported SQL behavior with PostgreSQL or PGlite fixtures.
- Run `bash tools/check-rust/check.sh` from the repository root. Follow the
  downstream transpiler's own rules and verification gates when changing its
  accepted syntax or lowering.
