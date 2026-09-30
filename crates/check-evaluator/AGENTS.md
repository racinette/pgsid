# CHECK operation source

The files under `src/operations/<schema>/` are maintained Rust implementations
of PostgreSQL callables. The crate mounts each schema as a Rust module. The
CHECK generator emits only control flow and calls to these functions. The
transpilation source graph preserves individual files, module ownership, and
module dependencies through parsing and target emission. Value wrappers and
expression semantics belong to the shared runtime module; schema implementations
import them. Keep schema-only helpers with their callables.

- Use the function name generated from the catalog's underlying `pg_proc`
  identity. Operators use their implementation function's identity. Do not add
  a hand-written signature map or an alias for an operator spelling.
- Keep each function within the syntax accepted by the CHECK transpiler. Each
  source file contains module items; imports and dependencies belong to the
  source graph. Do not add `mod`, `use`, macros, or conditional compilation to
  an operation file.
- Export callables and control flow helpers used across module boundaries with
  `pub fn`. Keep helpers used only inside a schema module private.
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
- The operation parity command discovers the immutable, strict
  `int4 × int4 → bool`, `bool × bool → bool`, and `text × text → bool`
  implementations in the operation sources, including `starts_with`, plus
  `int4 × int4 → int4` arithmetic and `text → int4`, and tests them
  automatically.
- If a callable needs a new value representation, primitive, SQL error, or
  Rust syntax rule, surface that as a separate foundation change before
  porting more functions that depend on it. The CHECK transpiler's own `AGENTS.md`
  requires user approval before adding syntax to its Rust dialect.
