# Regex transpiler working rules

These instructions apply throughout this tool. The root `AGENTS.md`
also applies. Keep the Rust source valid Rust and keep both generated targets
faithful to the behavior of that source. Use stored PGlite fixtures as the
behavioral oracle. Expand the engine only through the shared dialect.

## Write Rust in the shared dialect

- Use constants, named-field structs, unit or single-payload enums, and
  functions with explicit return types. Supported derives are `Clone`, `Copy`,
  `PartialEq`, and `Eq`; use `Clone` and `Copy` together, and pair `Eq` with
  `PartialEq`.
- Use `usize`, `u32`, `i32`, `bool`, `char`, `&str`, shared vectors, or a
  declared struct or enum. Immutable `&DeclaredStruct` parameters can read
  fields and indexed vector elements; direct calls can borrow a local struct
  with `&name`. Borrowed structs cannot be stored or returned. A struct or enum
  may declare one lifetime parameter for a borrowed `&str` field or payload;
  the lifetime is erased in Go and TypeScript, where strings are values.
  Mutable references,
  other references, type generics, and custom type parameters need a lowering
  rule before they can enter this dialect.
- Use initialized local bindings. Mark a binding or parameter `mut` only when
  its value is assigned. Use `if`, `else if`, `else`, `while`, `break`, and
  value-bearing `return` as statements. A function body may end with a tail
  expression. Branches do not produce values. `if let Enum::Variant(name) = value`
  may bind one payload from an enum variable inside its branch, without `else`.
- A mutable `Vec<usize>`, `Vec<char>`, or `Vec` of a declared `Copy` struct may
  be initialized with an explicitly typed `Vec::new()` local, grown with
  `push`, and read or written by index. Direct `=` assignment is limited to
  mutable scalar bindings and elements of these mutable vectors. Keep vector
  indexing within bounds in Rust; the generated targets reject out-of-bounds
  access too. Generated targets copy struct elements and validate their fields
  at input, read, push, and assignment boundaries.
- Use the supported arithmetic, comparisons, field access, vector indexing,
  struct literals, enum variants, `char as u32` and checked `u32 as usize`
  casts, and methods only where the validator can establish a shared meaning.
  Direct calls to declared functions and single-payload enum constructors are
  allowed. Generated functions check and detach their arguments at entry.
- Keep literals within the shared numeric range and write integers as
  unsuffixed decimals. A `char` is one Unicode scalar. A string literal is
  a sequence of Unicode scalars. Avoid Rust operations
  whose Go and TypeScript meanings differ, including string length, vector
  equality, and character or string ordering.
- Use Rust `pub` for the intended external API. Target naming follows each
  language: Go exports capitalized names and uses lower camel case for private
  names; TypeScript uses Pascal case for types, lower camel case for functions,
  constants, and fields, and `export` for public declarations.

The current parser and validator decide whether a proposed Rust construct is
accepted. A construct that parses in Rust is not thereby in the shared dialect.

When implementing regex features, work within the Rust syntax already accepted
by this dialect. Do not expand its syntax to accommodate a feature without
asking the user first. If the feature seems to require new syntax, explain the
specific construct and why the current syntax cannot express it, then wait for
the user's decision before changing the syntax rules.

## Preserve the AST boundary

Rust parses source with `syn`, checks syntax, checks types and operations, then
serializes a source-ordered JSON tree. Its envelope has `schemaVersion` and
`items`. Items have a `kind` discriminator and carry Rust visibility, names,
types, and bodies. Item kinds are `constant`, `struct`, `enum`, and `function`.
The tree transports Rust syntax and Rust spellings; it is not a target-specific
evaluator representation. Keep target casing and target runtime details out
of the wire tree.

Types are paths with segments and, for `Vec`, type arguments; immutable
references have an inner type. Structs carry named fields. Enums carry unit
or single-payload variants. Derives are a list. Blocks are ordered local and
expression statements. Expressions include literals, paths, casts, binary
operations, field and index access, method and constructor calls, struct
literals, `if`, payload `if let`, `while`, `return`, and `break`. Preserve the distinction
between a semicolon statement and a function tail expression. An `if` may
carry an `elseBody`; `else if` is nested there. Integer literals are decimal
strings, characters are Unicode scalar strings, and booleans carry their
value. Source positions and punctuation are absent from the wire tree.

When adding a node or field, update serialization and both consumers in the
same change. Keep the versioned envelope and reject unknown input rather than
guessing a lowering. A rejected tree is a contract error, not a regex
`Uncertain` result. Validate an operation before serialization when its
meaning depends on operand types or mutability. Rust compilation remains part
of verification because the validator does not replace Rust's type and borrow
checks.

## Generate target syntax with target ASTs

- Go generation builds declarations, statements, and expressions with
  `go/ast`, parses the maintained Go runtime prelude, and prints with
  `go/format`.
- TypeScript generation builds declarations, statements, and expressions with
  the TypeScript compiler factory, parses the maintained TypeScript runtime
  prelude, and prints with the compiler printer.
- Do not assemble target program text by concatenating source fragments.
  Strings are appropriate for identifier conversion, diagnostics, and literal
  values that are passed to AST constructors.
- Preserve value semantics in mutable-by-default targets. Check numeric and
  Unicode inputs, detach owned vectors and composites from caller storage,
  and use checked arithmetic where Rust values would otherwise leave the
  shared range. A change to copying or equality needs behavioral coverage in
  both targets.
- Public structs with only private fields act as opaque handles in generated
  targets. Go exposes their type while keeping fields private. TypeScript
  seals instances when they enter an enum payload or return directly from a
  public function, and checks their identity when a public function borrows
  one. Ordinary borrowed structs are copied and checked at the function
  boundary.
- Keep generated artifacts in the producer's bytes. Change an emitter or its
  maintained prelude, then regenerate; do not hand-edit or reformat generated
  output.

## Verify a dialect or lowering change

- Put a small accepted example in the Rust smoke source. Add a rejection test
  for a nearby unsupported form when the boundary could be ambiguous.
- Exercise the same behavior in generated Go and TypeScript, including public
  names and mutations that could reveal aliasing. Compare supported regex
  behavior with the stored PostgreSQL fixtures.
- Run `bash tools/regex-transpiler/check.sh` from the repository root.
  It checks fixture materialization, Rust tests, generated target compilation,
  and generated target behavior.
- Run `bash tools/regex-transpiler/check-wasm.sh` when changing the AST
  transport or either generator. It compares native and WASM output and runs
  the generated smoke checks.
