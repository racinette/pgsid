# CHECK transpiler working rules

This tool owns the Rust-to-Go and Rust-to-TypeScript lowering used by CHECK
constraints. The root `AGENTS.md` also applies. Keep the parser, AST contract,
and both target emitters in this directory. A change here must not require a
change to the regex transpiler unless the regex engine itself changes.

- The generated CHECK evaluator fragment is checked by the narrower CHECK
  dialect checker before it is added to the source graph. Keep that
  boundary narrow.
- The source graph records files, module names, and dependencies. Parse files
  individually and retain ownership in the AST. Do not concatenate Rust source
  or infer ownership from item positions or evaluator names. The graph contains
  value wrappers, PostgreSQL operations, control flow helpers, and evaluators.
  Rust compilation and both generated targets must agree on NULL, unknown, errors, and lazy evaluation.
- Public CHECK value wrappers contain only scalar or other immutable value
  fields. Go passes these values by value; TypeScript emits readonly fields.
  A caller that mutates a public input after passing it violates the CHECK
  API contract. Keep copying for vectors and other mutable aggregates.
- Source groups and generated files must have explicit ownership. PostgreSQL
  operations remain maintained Rust, with catalog schemas represented as Rust
  modules. Regex support is a dependency module and a separate target package.
  Value wrappers and expression semantics belong to `checkruntime`; target
  primitive support belongs to `langruntime`. Emit each shared runtime once
  per bundle, with no schema or regex dependency. Generated `pg_catalog`
  operations live in a separate Go package and TypeScript module directory.
  TypeScript CHECK bundles contain a `checks.ts` entry and separate
  `pg_catalog`, `checkruntime`, `langruntime`, and `regexengine` directories.
  Derive relative imports from the same paths used for output artifacts. Keep
  schema-local implementation helpers there. Evaluators and schema modules
  import shared runtime definitions instead of duplicating them. Evaluator
  functions remain in the CHECK entry module and refer to operations through
  the schema namespace. Target operation names
  omit the `sql__pg_catalog__` source prefix while retaining the overload hash.
- Resolve target module references by symbol identity. Local bindings may
  shadow exported functions; declarations, field names, and literal contents
  must retain their meanings when splitting files and adding namespaces.
- Owned text uses Rust `String`, Go string, and TypeScript string. Accept only
  `String::new`, borrowed `to_owned`, owned `as_str`, Unicode `chars().collect`,
  and local mutable string `push(char)` / `push_str(&str)`. String length methods
  remain rejected because target string lengths measure different units.
  Clone-only wrappers require scalar or Copy payloads. Explicit `clone()` on
  immutable text/wrappers has value semantics; keep aggregate vector copying.
  Unicode scalars cast to `u32` or `i32` without truncation. Other character casts
  remain rejected. The ASCII CHECK and code-point suite exercise signed conversion.
  Construct Unicode scalars only with `char::from_u32(i32_value as u32).unwrap_or(char_fallback)`;
  reject general Option handling and integer-to-u32 casts. Validate both operands eagerly.
  Never append through a wrapper field. The network host and binary-send CHECKs
  exercise builders, and `check-owned-text.test.ts` covers Unicode and rejection.
- Payload enum tests accept a single immutable identifier binding or `_`.
  A wildcard tests only the variant and emits no payload access or local binding.
- When adding syntax, first show a CHECK expression that needs it, then add a
  focused parser acceptance test and target behavior in Go and TypeScript.
- Bigint CHECKs use `i64` payloads with explicit decimal `i64` literals and
  signed literals through the i64 minimum. Lower them to Go `int64` and
  TypeScript `bigint`. Widening supports `i32 as i64`; `i64 as i32` truncates
  to the low signed 32 bits before mapping to the target primitive. PostgreSQL
  narrowing functions check their destination range in Rust before casting.
  Arithmetic accepts two explicitly typed i64 operands and rejects overflow
  in both targets. Division truncates toward zero; remainder follows the
  dividend sign. Both reject zero divisors and the signed minimum with negative
  one, matching Rust. Variable negation and other narrowing casts are rejected.
- Private top-level constants may borrow literal slices of `usize`, `u16`, `i32`,
  `i64`, or `&str` for lookup tables. Indexing and length access preserve their
  element types. I64 table entries require explicit i64 literals. Slice aliases,
  parameters, return values, mutation, nested arrays, and computed entries remain
  rejected. Go tables are package-private slices; TypeScript tables are readonly
  arrays. Table initialization emits literal values without per-entry runtime calls.
  U16 tables accept unsuffixed decimal entries through 65535 and lower to Go
  `[]uint16` and TypeScript `Readonly<Uint16Array>`. Reads may widen with `as usize`
  for dictionary indexing. U16 arithmetic, narrowing casts, public parameters,
  return types, and struct fields remain outside the subset.
- Calendar constructors use signed `i32` multiplication, division, and remainder.
  Division truncates toward zero. Both division and remainder reject zero
  divisors and the signed minimum with a divisor of negative one. Multiplication
  rejects overflow. All arithmetic rejects mixed signed/unsigned operands.
- Run `bash tools/check-rust/check.sh` and the relevant codegen golden checks
  after changing parsing, lowering, file boundaries, or names.
