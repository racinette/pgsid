# Named timezone table spike

Requires the IANA timezone compiler `zic` on PATH, or its path in `ZIC`.
Run from the repository root:

```sh
pnpm check-rust:timezones
```

Source and producers:

- `vendor/postgresql-timezone/tzdata.zi`: copied from the local PostgreSQL
  checkout's `src/timezone/data/tzdata.zi`; preserve its public-domain header.
- `tools/check-timezone-data/src/main.rs`: TZif reader and Rust AST generator.
- `tools/check-rust-timezones/timezone.rs`: maintained Rust lookup prototype.
- `tools/check-rust-timezones/check.ts`: PGlite oracle and cross-target parity.

Inspect generated results:

- `artifacts/check-rust-timezones/tables.rs`
- `artifacts/check-rust-timezones/go/pg_catalog/operations.go`
- `artifacts/check-rust-timezones/typescript/pg_catalog/operations.ts`
- `artifacts/check-rust-timezones/results.json`

The prototype substitutes timezone callables only in its own source graph.
Production callables remain in `crates/check-evaluator/src/operations/pg_catalog/timezone.rs`.
Recurring future DST rules and session abbreviation resolution are outside the
prototype. Their unsupported cases are exercised by the parity command.
