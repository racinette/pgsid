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

Row rejection and diagnostic matching are separate measurements. A definite
failure in any CHECK rejects a row even when another CHECK's result is Unknown.
The world counter for native rejection matching follows PostgreSQL's reported
constraint or SQLSTATE; the surface report also counts rejected rows with any
definite local failure and exposes unresolved or incorrectly rejected rows.

The type audit separates reading a portable value from testing its nullness.
Nullness may be available for a type without a portable value representation.
Column probes retain catalog row-type metadata, including for arrays and ranges.
Column admission is probed in PostgreSQL rather than inferred from catalog kind.
Rejected types remain in the inventory with the rejection reason and column
probes marked inapplicable. Composite NULL tests require row semantics.
Basic equality and NULL probes describe expression preparation, not exhaustive
input or coercion support.

The builtin census separates missing concrete value families from catalog row
types, their arrays, and server storage. Catalog rows require captured field
descriptors; an unavailable predefined scalar binding does not classify each row
as a new scalar family. Ordinary arrays inherit their element boundary. Specialized
vectors retain their own input contracts. Pseudo-types describe concrete-type
resolution or server interfaces. Native text-input rejection remains visible for
server storage even when PostgreSQL permits a column of that type.

The surface census checks the live catalog against the generated overload, cast,
and type I/O inventories. Operator aliases retain their implementation identities.
I/O casts retain type output identities separately from explicit cast links;
enum output also requires concrete catalog label definitions.
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

Array reports retain unimplemented immutable candidates separately from portable
implementation gaps. A candidate whose tested value requirements need deployment
catalogs or dictionary resources remains a database-context dependency.

Expression probes compare raw SQL with PostgreSQL's stored CHECK definitions.
Corpus entries retain constraint identities, bound expressions, INSERT outcomes,
named Unknown cases, and required materialized generated-column inputs. A CHECK
reads a supplied generated value; its source columns do not supply that value.
Write-hook metadata identifies tables whose INSERT inputs may be rewritten before
PostgreSQL evaluates their CHECKs, including hooks on descendant partitions.
World outcomes distinguish definite values, SQL errors,
Unknown results, and constraints without INSERT cases. A prepared Unknown is
deferred work, and an unexercised constraint supplies no execution evidence.

The coercion census probes explicit catalog casts between represented types and
their runtime text input/output paths, retaining actual type I/O identities.
It compares raw and stored CHECKs and records PostgreSQL admission separately
from local preparation. Binding a conversion does not establish all input
spellings, precision modifiers, assignment coercion, or raw parameter handling.
Named input-form cases are shared with their parity suites. Handled cases include
SQL errors; deferred cases require Unknown. These lists inventory tested
spellings and retain their executing owner without claiming complete grammar coverage.

The historical-expression inventory creates CHECKs with operands that disappear
from rendered SQL after a composite field is dropped. It compares capture and
source/stored preparation for nonempty values, typed NULLs, whole literal arrays,
and a maintained expression matrix. Missing literal samples remain explicit when
the represented type set grows. PostgreSQL rejection, missing implementation, and
declared session or callback requirements are separate outcomes. These probes do
not establish executed parity or exhaustive grammar coverage.

To rerun individual reports after refreshing world parity:

```sh
node --import tsx scripts/check-measurements/types.ts
node --import tsx scripts/check-measurements/surface.ts
node --import tsx scripts/check-measurements/coercions.ts
node --import tsx scripts/check-measurements/arrays.ts
node --import tsx scripts/check-measurements/historical.ts
```

Pass exact historical probe names to select a development subset. Selected
reports retain their selection instead of presenting it as the full inventory:

```sh
node --import tsx scripts/check-measurements/historical.ts 'pg_catalog.int4:array' boolean_test
```
