# Named timezone CHECK parity

Requires the IANA timezone compiler `zic` on PATH, or its path in `ZIC`.
Run from the repository root:

```sh
pnpm check-rust:timezones
```

Source and producers:

- `vendor/postgresql-timezone/tzdata.zi`: copied from the local PostgreSQL
  checkout's `src/timezone/data/tzdata.zi`; preserve its public-domain header.
- `tools/check-timezone-data/src/lib.rs`: TZif reader and Rust AST generator.
- `crates/check-evaluator/src/operations/pg_catalog/timezone_named.rs`: named lookup.
- `crates/check-evaluator/src/operations/pg_catalog/timezone_recurring.rs`: footer parsing and
  future transition calculation.
- `tools/check-rust-timezones/rule-fixtures.rs`: synthetic footer tables for parity.
- `tools/check-rust-timezones/check.ts`: PGlite oracle and cross-target parity.

Inspect generated results:

- `artifacts/check-rust-timezones/tables.rs`
- `artifacts/check-rust-timezones/go/pg_catalog/operations.go`
- `artifacts/check-rust-timezones/typescript/pg_catalog/operations.ts`
- `artifacts/check-rust-timezones/results.json`

Production callables live in `crates/check-evaluator/src/operations/pg_catalog/timezone.rs`.
The parity command uses the production source graph; synthetic footer tests
substitute only the generated tables in their separate bundle.
The parity command discovers future transitions through PGlite and checks their
boundaries in native Rust, Go, and TypeScript. Session abbreviation resolution
remains unsupported; unsupported names are exercised by the command.
