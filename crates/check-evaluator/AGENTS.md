# CHECK operation source

The files under `src/operations/` are maintained Rust implementations of
PostgreSQL callables. The CHECK generator emits only control flow and calls to
these functions. Their source is combined with the generated evaluator, then
compiled as Rust and transpiled to Go and TypeScript.

- Use the function name generated from the catalog's underlying `pg_proc`
  identity. Operators use their implementation function's identity. Do not add
  a hand-written signature map or an alias for an operator spelling.
- Keep each function within the syntax accepted by the regex transpiler. The
  source files are concatenated as flat Rust items, so do not add `mod`, `use`,
  macros, or conditional compilation to an operation file.
- Accept and return the concrete value wrappers in `src/values.rs`. Unknown
  input, SQL NULL, and SQL errors have distinct meanings. An operation must
  preserve them according to PostgreSQL behavior.
- Encode a five-character SQLSTATE as its base-36 integer in a named Rust
  constant. Target adapters decode that integer to five uppercase characters.
  Preserve an incoming error before considering unknown or NULL operands.
- Keep operation behavior in Rust. Go and TypeScript adapters only convert row
  values and expose the stable validator interface.
- Add a PostgreSQL/PGlite comparison for migrated behavior and exercise the
  same cases in Rust, generated Go, and generated TypeScript. Run
  `pnpm check-rust:check` from the repository root.
- CHECK evaluation requires the C collation only. Collation-sensitive
  operations implement C-collation behavior, and parity comparisons use that
  collation. Text ordering compares Unicode scalars.
- The operation parity command discovers immutable, strict
  `int4 × int4 → bool` and `text × text → bool` implementations in the
  operation sources and tests them automatically.
- If a callable needs a new value representation, primitive, SQL error, or
  Rust syntax rule, surface that as a separate foundation change before
  porting more functions that depend on it. The transpiler's own `AGENTS.md`
  requires user approval before adding syntax to its Rust dialect.
