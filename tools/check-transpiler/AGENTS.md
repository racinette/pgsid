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
  API contract. Keep copying for vectors and other mutable aggregates at
  ownership transfers and explicit clones. Private helpers borrow declared records
  without copying their storage; Rust forbids mutation or moving fields through
  those shared references. Crate-visible functions transfer already checked owned
  values without boundary copies; their shared borrows retain storage.
  Internal owned records may use crate visibility with private fields so helpers
  in another source module can borrow metadata and then consume their payload.
  They retain internal transfer semantics and do not become public row wrappers.
  Public parameters retain boundary validation, and explicit clones always copy. XML scans
  need these borrows to inspect a name-sized buffer without copying it per character.
  Run `check-borrowed-state.test.ts` for bounded scanning and ownership after a borrow.
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
- The runtime modules alone decide the runtime output, so one translated
  runtime serves every check: the value contract comes from the runtime
  operations and copy helpers from the runtime's vectors, and checks needing
  more are rejected. Exports follow declared visibility, never use. The parser
  records facts for a validated graph and validates added modules against them;
  added modules declare only functions and constants. Checks-only emission
  resolves runtime names as stubs in the same scope, so its output must equal
  the combined translation; `check-translation-reuse.test.ts` compares both.
- Owned text uses Rust `String`, Go string, and TypeScript string. Accept only
  `String::new`, borrowed `to_owned`, owned `as_str`, Unicode `chars().collect`,
  and local mutable string `push(char)` / `push_str(&str)`. Mutable Go string
  bindings use byte buffers for appends; reads create immutable string snapshots.
  Reassignment replaces the buffer. Large XML entity values exercise bounded
  construction, clones, parameter builders and scoped bindings in `check-owned-text.test.ts`.
  String length methods
  remain rejected because target string lengths measure different units.
  Clone-only public wrappers accept scalar or Copy payloads and owned Clone records
  whose supported vectors have Copy records, owned Clone records or Clone value enums as elements. Exported owned records require public
  fields and a public Clone value-enum owner, directly or through nested owned records. Explicit `clone()` on
  immutable text/wrappers has value semantics; keep aggregate vector copying.
  Unicode scalars cast to `u32` or `i32` without truncation. Other character casts
  remain rejected. The ASCII CHECK and code-point suite exercise signed conversion.
  Construct Unicode scalars only with `char::from_u32(i32_value as u32).unwrap_or(char_fallback)`;
  reject general Option handling and integer-to-u32 casts. Validate both operands eagerly.
  Never append through a wrapper field. The network host and binary-send CHECKs
  exercise builders, and `check-owned-text.test.ts` covers Unicode and rejection.
- Enum tests accept unit variants or a payload with one immutable identifier
  binding or `_`. A wildcard tests the variant without accessing the payload.
  Owned payloads may contain supported vectors of scalars, Copy records, owned Clone records or Clone value enums;
  extraction retains aggregate copying. Private Clone records may own vectors
  of chars, indices, Copy records, owned Clone records or Clone value enums. XML well-formedness CHECKs need this state
  to extend an entity character arena while retaining earlier table snapshots.
  Explicit clones copy vector storage and records in both targets. Whole record
  replacement is allowed; builders require local bindings. Public Clone records with supported vectors may be value-enum payloads with
  public fields. Bare exported vector records, hidden mutable payloads, borrowed mutable aggregates and direct vector cloning remain
  rejected. Exported point-list records and wrappers have readonly TypeScript
  fields while construction, boundary transfers and explicit clones copy their
  storage in both targets. Clone value enum elements copy nested payload storage;
  recursive ownership cycles must cross an owned vector; direct value cycles remain rejected. Run `check-owned-state.test.ts`,
  `check-owned-record-profiles.test.ts` and `check-owned-value-batches.test.ts` for snapshots and adjacent rejection cases.
- Regex starts use `usize::try_from(i32_value).unwrap_or(usize_fallback)`.
  Validate both operands eagerly; negative values select the fallback. Shared
  indices range through the signed int4 maximum and may widen back with `as i32`.
  General Result handling, unchecked signed-to-index casts and other conversions
  remain rejected.
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
- Numeric logarithm CHECKs such as `ln(amount) > 0` need private floating-point
  precision estimates while decimal arithmetic determines the SQL result. Accept
  explicitly suffixed finite `f64` literals, scalar locals/returns, literal constants,
  arithmetic, comparisons, negation, and `abs` / `ln` / `log10` / `sqrt`. Widen only `i32`
  to `f64`; narrowing to `i32` truncates and saturates like Rust, with NaN becoming
  zero. Preserve signed zero and rounded intermediate products in both targets.
  Exponential CHECKs such as `exp(amount) > 0` also need borrowed decimal text
  converted with `parse::<f64>().unwrap_or(f64_fallback)`. Preserve Rust parsing,
  signed zero, infinities and eager fallback evaluation; reject other parse types
  and general Result handling.
  Real narrowing and floating-point binary-send CHECKs need IEEE bit carriers.
  Accept only `f64::from_bits(i64_value as u64)`, `f64_value.to_bits() as i64`,
  `f32::from_bits(i32_value as u32) as f64`, and
  `(f64_value as f32).to_bits() as i32`. Keep signed carrier bits intact;
  single-precision conversion rounds before widening back to the private f64
  primitive. General f32 values and unsigned integer casts remain rejected.
  Run `check-float-bits.test.ts` for native Rust, Go, TypeScript and PostgreSQL
  narrowing behavior, including signed zero, NaN payloads and range errors.
  Floating-point fields, enum payloads, tables, remainder and other methods remain
  rejected. Public SQL numeric values retain their decimal string representation.
- Decimal iteration may replace a mutable Clone record binding as a whole.
  Its fields must remain scalar or Copy payloads; field mutation and assignment
  to immutable bindings remain rejected. Record replacement must preserve prior
  snapshots and inputs in both targets.
- Calendar constructors use signed `i32` multiplication, division, and remainder.
  Division truncates toward zero. Both division and remainder reject zero
  divisors and the signed minimum with a divisor of negative one. Multiplication
  rejects overflow. All arithmetic rejects mixed signed/unsigned operands.
- After changing parsing, lowering, file boundaries or names, run the focused
  acceptance/rejection tests, affected target parity suites and relevant codegen
  goldens. Include dependents of shared behavior and record the selection.
  Run `bash tools/check-rust/check.sh` for broad lowering/runtime changes and
  integration milestones. An isolated extension does not require every unrelated
  type suite; a partial run must remain explicitly partial.
