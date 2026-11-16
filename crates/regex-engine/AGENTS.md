# Regex engine working rules

Keep the Rust source within the regex engine dialect, which the crates
espalier's regex-dialect rule states and checks. Before adding Rust syntax to
that dialect, ask the user to approve the specific construct and explain why
the current syntax cannot express the feature.

The stored PostgreSQL observations under `conformance/` are the oracle. The
crate's tests run them against the native engine, and
`tests/sql-semantics/regex-engine.test.ts` runs them against the Go and
TypeScript translation production emits, so generated code must preserve the
source's value semantics. `pnpm regex-engine:check` also confirms the stored
fixtures still reproduce from their generators.
