# CHECK measurements

Run from the repository root after installing dependencies and the CHECK build
toolchain:

```sh
pnpm check-rust:measure
```

This rebuilds CHECK assets, executes world INSERT parity, and writes type and
callable reports under ignored `artifacts/`. Generated results are observations;
keep the producers in Git. The world report fingerprints schema, data, and INSERT
sources. Surface measurement rejects outcomes from different world inputs.

The type audit separates reading a portable value from testing its nullness.
Nullness may be available for a type without a portable value representation.
Basic equality and NULL probes describe expression preparation, not exhaustive
input or coercion support.

The surface census checks the live catalog against the generated overload and
cast inventories. Operator aliases retain their implementation identities.
Probes record whether the requested overload survives binding and whether Rust
preparation succeeds; neither proves executed behavior. Dedicated regex paths
may bind without retaining a catalog-named call.
Callable and type probes use C-collated columns; they do not measure other
collation providers. Polymorphic enum probes use a concrete enum definition.

Callable categories overlap. Immutable strict scalar calls on represented types
are candidates for pure evaluation, subject to context assessment. Immutability
alone does not prove independence from server settings. The identifier-quoting
setting has its own category. Stable, volatile, non-strict, internal, set-returning,
aggregate, window, and representation boundaries remain explicit.

Expression probes compare raw SQL with PostgreSQL's stored CHECK definitions.
Corpus entries retain constraint identities, bound expressions, INSERT outcomes,
and named Unknown cases. World outcomes distinguish definite values, SQL errors,
Unknown results, and constraints without INSERT cases. A prepared Unknown is
deferred work, and an unexercised constraint supplies no execution evidence.

To rerun individual reports after refreshing world parity:

```sh
node --import tsx scripts/check-measurements/types.ts
node --import tsx scripts/check-measurements/surface.ts
```
