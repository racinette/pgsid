# CHECK evaluator work ledger

This is the implementation queue for the Rust CHECK engine. Work in the order below unless a task exposes a prerequisite. Complete a bounded task through binding, generated Rust, Go, TypeScript, and PostgreSQL parity before expanding its scope. Check a box only after its completion criteria pass.

## Baseline and measurements

The starting revision is `027d433` (XML well-formedness predicates). The bounded porting effort covered strict, immutable scalar callables on represented values,
plus represented enum callables. Session-dependent behavior remains separate.
Completion of that effort does not establish complete expression, coercion,
collation, input-format, or PostgreSQL type coverage.

Measure each boundary separately:

| Evidence                                 | What it measures                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `artifacts/check-surface/report.json`    | Catalog overloads, operator aliases, binding probes, and uncertain corpus expressions |
| `artifacts/check-type-audit/report.json` | Catalog type representations, row shape, and basic expression preparation             |
| `artifacts/check-worlds/report.json`     | Actual INSERT outcomes, Unknown results, and unexercised constraints                  |
| `artifacts/check-coercions/report.json`  | Explicit cast pairs and runtime text conversions, compared in raw/stored CHECKs       |

Generated artifacts are ignored by Git. The census and type-audit producers live under maintained `scripts/check-measurements/`.

Refresh world outcomes before measuring the surface. Run from the repository root:

```bash
pnpm check-rust:measure
```

A prepared evaluator may return Unknown. Count useful support from binding and executed outcomes, rather than preparation success alone. Legacy target bindings
and catalog function counts are separate from Rust CHECK coverage; dedicated
regex paths can work without a catalog-named implementation.

The type report separates nullness from portable value representation and uses
catalog row shape for column probes. Column admission is probed in PostgreSQL;
rejected types remain inventoried without column probes. The surface report
verifies live callable and cast identities, records raw/stored expression probes,
and joins bound corpus expressions to executed world outcomes. Required generated
inputs and write hooks remain visible beside those outcomes. Values before a
BEFORE ROW hook can differ from the values PostgreSQL checks.
Callable candidates, context requirements, new representations, and expression
gaps remain separate. Surface measurement rejects world outcomes whose input
fingerprint differs from the current corpus.

## Preserve the measurement tools

- [x] Move the census and type-audit producers into maintained tooling, adapting
      imports and output paths; add a documented package command.
- [x] Verify catalog identity checks and separate classifications for pure
      callables, session dependencies, new representations, and expression gaps.

Done when a fresh checkout can regenerate the reports without recovering scripts
from ignored artifacts. Keep generated results separate from maintained sources.

## Close expression gaps on represented values

- [x] Boolean tests: `IS TRUE`, `IS FALSE`, `IS UNKNOWN`, and their negations.
- [x] Null-safe equality: `IS DISTINCT FROM` and `IS NOT DISTINCT FROM`.
- [x] `NULLIF`, including catalog equality resolution and result typing.
- [x] `GREATEST` and `LEAST`, including common types and PostgreSQL NULL rules.
- [x] Row comparisons, including element ordering and NULL behavior.
- [x] Keep scalar null tests type-aware for portable temporal values and nested domains.

Verify each form independently, including NULL,
Unknown, SQL errors, type resolution, and evaluation behavior. Compare raw SQL
and stored CHECK definitions. Unknown has no PostgreSQL counterpart and needs
explicit partial-input cases in addition to database comparisons.

Done per form when the binder produces a meaningful expression, production
evaluators execute it in every target, and expression probes plus world INSERT
cases demonstrate the supported boundary. Broader row/composite representations
are a separate prerequisite if a row-comparison slice requires them.

## Resolve uncertain corpus expressions

- [x] Investigate casts from timestamptz to date in the energy-grid world.
- [x] Investigate enum-to-text comparisons in the energy-grid world.
- [x] Investigate integer-to-text comparisons in the identity-access,
      inventory-allocation, and lab-calibration worlds.
- [x] Investigate timestamp-to-text comparisons in the claim-routing world.
- [x] Diagnose the Unknown result for
      `008_inventory_allocation/movement_increases_quantity`, constraint
      `movement_classification_inputs`.

Use the surface report's constraint identities and bound expressions to locate
each case. A cast, collation restriction, unavailable input, and missing
implementation require different fixes. Existing formatters do not prove that
the binder reaches them through every cast path.

Done when each case either evaluates with parity or has an explicit, tested
context/input requirement. Do not replace an unsupported operation with an
assumption about server settings.

## Expand world INSERT coverage

- [x] Add named INSERTs for the report's unexercised constraints, starting with
      constraints already fully bound on represented values.
- [x] Add passing, rejecting, NULL, boundary, and reached-error cases as relevant;
      include branch cases that demonstrate skipped errors.
- [ ] Keep new supported expression and callable slices covered by world INSERTs.

PostgreSQL supplies the expected outcomes. Keep cases in each world's
`check-seed.sql`; use a focused `-- @world checks` world when appropriate.
Existing query-world admission rules still apply.

Done when every targeted constraint has meaningful executed coverage and all
definite local results agree with PostgreSQL. Record remaining Unknown and
unexercised cases explicitly rather than treating them as passes.

## Complete parsing and coercion boundaries

- [x] Measure explicit catalog cast pairs on represented values and their runtime
      text input/output paths, separating PostgreSQL admission from raw/stored binding.
- [x] Bind catalog function casts from Boolean, inet, and cidr to character types,
      including actual argument types, width modifiers, domains, and expression composition.
- [ ] Inventory unsupported input forms and coercions for represented types.
- [x] Share handled and deferred temporal input-form cases between their parity
      suites and the coercion report, retaining the executing owner of each list.
- [x] Expand temporal text parsing in bounded, independently testable slices.
- [x] Assess precision modifiers, assignment coercion, and raw query-parameter
      conversion separately from already SQL-coerced row inputs.
- [ ] Verify casts through catalog links, including domains and mixed-type
      expressions, without selecting overloads by implementation availability.

Done per slice when supported forms have Rust/Go/TypeScript/PostgreSQL parity,
unsupported forms remain distinguishable, and the public input contract is
explicit. Do not use target-native date or numeric parsers to supply SQL behavior.

## Model explicit execution context

- [ ] Enumerate operations requiring session settings or collation providers.
- [x] Establish client-encoding requirements for text and name binary output,
      retaining portable ASCII bytes and deferring non-ASCII conversion without context.
- [ ] Design a portable context boundary before implementing those operations.
- [ ] Address `quote_ident(text)` with explicit `quote_all_identifiers` behavior.
- [ ] Assess implicit temporal conversions and session-dependent formats.
- [ ] Assess locale-sensitive ordering, casing, and nondeterministic collations.

Done when required context is explicit and shared Rust owns behavior across
targets. Missing context must produce a diagnostic Unknown. A catalog immutable
flag alone is insufficient evidence that an implementation is session-free.

## Assess excluded callable categories

- [ ] Review non-strict scalar functions on represented types individually.
- [ ] Separate stable functions with explicit portable context from functions
      that require database state; assess volatile functions independently.
- [ ] Assess custom-schema functions and source-module setup as a separate slice.

Done per admitted category when its execution contract, NULL/error behavior,
binding, and parity are established. Aggregates, windows, set-returning calls,
and internal/cstring interfaces are not an automatic CHECK implementation queue.

- [x] Cache parsed source assets with independent mutable containers and share immutable
      source text; verify unchanged world source graphs and Go fixture cache reuse.

## Expand value representations

- [x] Establish exported owned point-list payloads with independent clones and transfers in Rust, Go and TypeScript; retain private aggregate boundaries.

Implement the remaining concrete PostgreSQL value families after the preceding expression and corpus work.
Complete one bounded slice through the completion gate before expanding it.
Prioritize common CHECK families, including arrays and JSON, before ACL/full-text; follow dependency order unless implementation exposes a prerequisite:

- [x] Establish IEEE bit conversion primitives before floating-point values,
      casts, comparisons, and binary I/O.
- [x] Preserve lossless floating-point literals when reading catalog CHECKs
      and defaults, restoring the caller's rendering settings after the read.
- [x] Floating point (`float4`, `float8`).
- [x] Audit platform-generated NaN binary precision in floating input, literals
      and geometry; retain known NaN semantics when output bits require platform context.
- [x] Establish time, timetz, and interval payloads, comparisons, arithmetic,
      core casts, binary output, and SQL-coerced public inputs.
- [x] Establish interval unit, clock, and ISO designator input, lossless catalog
      literals, and explicit IntervalStyle requirements.
- [x] Establish compact interval grammar, clock precision and scalar time constructors.
- [x] Establish interval scaling, calendar arithmetic, precision-aware literals,
      and clock input/output.
- [x] Establish temporal field extraction, hashes, interval truncation, timestamp
      binning, and local calendar age.
- [x] Establish temporal range checks, fixed interval timezones, SQL-coerced wide
      offsets, and ISO alternative interval input.
- [x] Establish explicit-zone calendar adjustments, non-strict temporal overlaps,
      legacy timestamp field extraction, and the measured session-timezone
      requirement for instant calendar age.
- [ ] Time and interval (`time`, `timetz`, `interval`).
- [x] Establish point payloads, SQL-coerced public inputs, construction,
      geometric equality, binary output and composition; establish the scalar
      square-root primitive and classify geometric text rendering requirements.
- [x] Establish point direction tests, arithmetic, distance, slope, portable text
      input and literals, and catalog-resolved unconstrained-domain casts;
      preserve semantic NaN values while classifying computed binary precision.
- [x] Establish line coefficient payloads, geometric equality, orientation,
      binary output, domains, SQL-coerced public inputs and composition.
- [x] Retain known scalar NaNs produced by geometry or native JavaScript inputs
      across comparisons, casts and composition while deferring unavailable
      binary precision.
- [x] Establish line text input, point construction, literals and catalog I/O
      casts through unconstrained domains.
- [x] Establish line relations, intersections, distances, point containment
      and closest-point projection.
- [x] Establish line-segment endpoint payloads, public inputs, construction,
      parsing, literals, comparisons, length, midpoint and orientation.
- [x] Establish line-segment intersections, containment, distances and closest points.
- [x] Establish box corner payloads, public inputs, parsing, construction,
      comparisons, dimensions, centers and diagonal conversion.
- [x] Establish box relations, intersection, bounding union, arithmetic and closest points.
- [x] Establish circle center/radius payloads, public inputs, parsing, construction,
      comparisons, box conversions, relations, distances and arithmetic.
- [x] Establish owned path payloads, cardinality comparisons, counts, binary output,
      opening/closing, checked length and area, portable input, literals,
      unconstrained-domain casts and SQL-coerced public inputs.
- [x] Establish open-path concatenation, point transformations, point/path and
      path/path distances; preserve closing-edge order, count limits, reached
      arithmetic errors and no-segment zero/NULL results.
- [x] Establish point/path containment and path intersection, preserving open/closed
      behavior, tolerant boundary tests, traversal order and reached arithmetic errors.
- [x] Establish polygon point lists, cached bounds, public inputs, portable parsing,
      counts, binary output, geometric equality, containment and path/box conversions;
      defer ambiguous omitted bounds while retaining known nullness and lengths.
- [ ] Geometry, after public floating-point support.
- [ ] Full-text search values and operations, with configuration requirements explicit.
- [ ] XML values, with document/content and execution-context requirements explicit.
- [x] Establish money payloads, comparisons, arithmetic, binary output and words,
      and capture stored CHECK literals while classifying monetary context.
- [ ] Money, with scale and locale requirements explicit.
- [x] Establish internal "char" byte values, portable I/O, signed integer casts,
      unsigned relations, public inputs and native signed-char hash requirements.
- [x] Establish unsigned OID values, portable input/output, comparisons, hashes,
      integer casts, domains and SQL-coerced public input validation.
- [x] Establish transaction and command identifiers, unsigned full transaction
      words, portable input/output, pure operations and contextual state boundaries.
- [x] Establish WAL location payloads, portable text input/output, comparisons,
      hashing, exact numeric arithmetic and SQL-coerced public inputs.
- [x] Establish heap tuple pointer payloads, comparisons, binary/text conversion,
      portable hashes and explicit native-layout and heap-state requirements.
- [x] Establish catalog OID aliases with nominal SQL identity, numeric operations, catalog-resolved casts and explicit deferral without deployment catalog access.
- [x] Establish name values, C relations, hashes, conversions, SQL-coerced public
      inputs and explicit build-limit requirements for text truncation.
- [x] Establish nominal refcursor names, explicit text I/O casts, domains, literals,
      composition and SQL-coerced public inputs; retain session requirements for portals.
- [x] Establish owned transaction snapshot values, portable I/O, binary output, bounds,
      visibility, domains, literals, composition and SQL-coerced public inputs;
      retain active-transaction requirements for current snapshot retrieval.
- [x] Remove generation-time enum OIDs from emitted literals and public label adapters, and verify hash deferral across independent databases.
- [ ] Catalog/system values, separating portable payload operations from database lookup.
- [x] Establish typed scalar/enum arrays with dimensions/lower bounds, NULL/Unknown cells, independent nested clones, SQL-coerced public inputs and array domains, metadata, CASE/COALESCE, input shapes and INSERT parity; preserve raw database conversion.
- [x] Establish scalar/nested ARRAY constructors, enum/empty/NULL forms, element casts and widths, rectangular lower bounds, eager errors, constant preparation and INSERT parity; preserve nominal domain-element deferrals.
- [x] Establish private array-text grammar and ordered element/error events, quoting/escaping, explicit bounds, delimiter profiles, NULL-token context and owned snapshots in every target; public I/O admission follows.
- [x] Admit source/stored array literals and text I/O input, integer/Boolean/numeric/enum input profiles, widths/precision, explicit array_nulls, captured money units and coerced name facets; verify lazy preparation, exact cells and INSERT parity.
- [x] Admit array text output, element-specific I/O, dimensions, quoting/escaping, character widths and INSERT parity; retain scalar formatting/catalog deferrals and known empty/NULL-only arrays.
- [x] Admit multidimensional element fetches and slices, omitted/mixed bounds, integer assignment casts, copied cells, constant preparation and reached-error order; verify raw/stored composition and INSERT parity.
- [x] Admit array equality/order through catalog-selected element support, NULL cells, dimensional tie-breaks, reached context deferrals, owned snapshots, constant preparation, expression composition and INSERT parity.
- [x] Admit containment/overlap through default element equality, shape/duplicate independence, nonmatching NULL cells, partial-input recovery, reached errors, constant preparation, collation boundaries and INSERT parity.
- [x] Establish catalog-linked array element casts, precision/width arguments, common CASE/COALESCE/extrema/constructor types, retained bounds and partial cells, nominal enums and INSERT parity; generic compatible signatures and I/O coercions follow.
- [x] Bind compatible array/element signatures and admit first/all position searches, NULL matching, lower bounds/start positions, support/shape error order, partial-input prefixes, context/preparation boundaries, nominal enums and INSERT parity.
- [x] Admit compatible append/prepend and concatenation, NULL identities, copied scalar/enum cells, rank/shape and bound errors, extreme-bound composition, constant preparation and public INSERT parity.
- [ ] Arrays, including dimensions, lower bounds, NULL elements, and polymorphism.
- [ ] Ranges and multiranges, after their subtype operations.
- [ ] Composite values, including field identity, access, and row NULL semantics.
- [x] Establish lossless SQL-coerced JSON values, root type, source output, domains, NULL literals, lazy composition, public wrappers and raw-write preservation.
- [x] JSON literals and runtime text I/O casts, preserving eager input errors and lazy branches.
- [x] Raw JSON field/element extraction and lengths, source preservation and encoding requirements.
- [x] JSONB logical normalization, shared parsing, SQL-coerced public inputs, domains, NULL and lazy composition.
- [x] JSONB literals, text/JSON I/O casts and stored-format admission; preserve eager errors and lazy branches.
- [x] JSONB field/element extraction, decoded text, array length and top-level existence, including scalar indexing.
- [x] JSONB equality/inequality and iterative containment, exact numeric scalars, NULL-safe composition and public inputs.
- [x] JSONB C/UTF8 ordering, exact comparator results and container traversal, with declared database defaults and composed/public INSERT parity.
- [x] JSONB scalar casts, numeric precision/scale and unconstrained scalar-domain targets; preserve NULL, rounding, errors and lazy composition.
- [x] JSONB concatenation and top-level text/index deletion; preserve logical trees, storage admission, ownership and public INSERT parity.
- [x] JSONB recursive null stripping, default/array flags and pretty layout; preserve renderer encoding requirements and NULL/Unknown/error states.
- [x] Scalar to_jsonb core values and portable network/MAC/bit, identifier/snapshot, ISO date/timestamp and clock outputs; retain finite-float, TimeZone and custom-cast requirements.
- [x] Remaining represented to_jsonb types and enums: strict states, catalog/session deferral, interval infinities and invariant geometric output; no catalog or default-setting assumptions.
- [x] Owned heterogeneous argument batches: Clone value enum vectors, nested payload copies, indexed replacement and split-target ownership; reject cycles and mutable borrows.
- [x] JSONB scalar-argument builders, empty overloads, non-strict NULLs, scalar keys, duplicate normalization, eager argument errors and owned composition.
- [x] JSON/JSONB binary send, source/canonical bytes, version framing and strict states; retain encoding requirements and classify receive functions as internal interfaces.
- [ ] Explicit VARIADIC arrays and path-array access follow arrays.
- [x] JSONPath lexical/grammar foundation: owned arenas, comments, names, variables, numeric/Unicode forms, precedence, accessor/method arguments, @/last scopes and ordered validation events; no public SQL admission.
- [x] Owned JSONPath graph, exact source graphs, unary numeric folding, iterative output and clone/state semantics; retain regex compiler limits and lossy PostgreSQL text rendering.
- [x] JSONPath SQL row values, source/stored literal provenance, text I/O casts, JSONB conversion/builders, CASE/COALESCE, binary send and INSERT parity; checked graph/stored-text facets, explicit UTF8/C requirements and raw assignment deferral.
- [x] JSONPath structural execution: roots, members/wildcards, variables, numeric subscripts/ranges, last and descendants; strict/lax, silent prefixes, existence/match/query calls, safe stored-text recovery, UTF8 object order and INSERT parity.
- [x] JSONPath sequence arithmetic and subscript expressions: numeric signs/operators, single-number operands, last scopes, one-level lax result unwrapping, error order and silent prefixes; preserve stored-text grouping requirements and INSERT parity.
- [x] JSONPath filters/current scopes, three-valued comparisons, starts-with, exists, NOT/is-unknown and lazy AND/OR; preserve suppression, missing-variable errors, known JSON null versus evaluator Unknown, encoding and stored-text grouping requirements.
- [x] JSONPath type/size and abs/floor/ceiling/double methods; retain strict/lax target handling, numeric display scales, finite-float validation versus string conversion, predicate suppression and INSERT parity.
- [x] JSONPath integer/bigint/boolean/number/decimal/string conversions, owned string results and chained predicates; preserve parsing, numeric scales, argument validation, suppression and INSERT parity.
- [x] JSONPath keyvalue objects: owned logical nodes, document/variable/generated IDs, wrapping counters and offsets, partially unknown identities, strict/lax prefixes, format limits and INSERT parity.
- [x] JSONPath temporal methods and numeric calendar/clock templates: typed intermediates, widths/literals, grouped years/eras, ordinal/Julian/week calendars, 12-hour clocks, English/Roman names, fractions/offsets, comparisons and INSERT parity; preserve partial-field validation, integer widths, error hardness and context requirements.
- [x] JSONPath regex execution under declared C/C.UTF-8 character profiles: flags, strict/lax sequences, lazy guards, error hardness and INSERT parity; retain engine limits and Unicode locale requirements.
- [x] Establish scalar JSONPath _tz calls, context-independent paths, fixed-offset clock removal and explicit reached session deferrals; classify set-returning query and internal I/O interfaces with PostgreSQL checks and INSERT parity.
- [ ] JSONPath Unicode locale-sensitive regex matching; retain declared locale, timezone and abbreviation requirements separately from implementation gaps.
- [ ] Classify remaining internal and pseudo-types with tested requirements or exclusion from the public value contract.

Use the type audit for the remaining surface, including internals; defer ACL/full-text behind common CHECK families, arrays and JSON.
Done per family when its portable values, SQL-coerced row input conversion, literals, catalog-resolved casts, applicable comparisons, core operations, expression composition, and world INSERT parity work together. Preserve distinct SQL NULL, Unknown, and SQL error outcomes in every target. Keep raw input parsing, session-dependent behavior, and unimplemented callables visible in the reports; representation support alone does not complete them.
Assess recursive ownership before arrays, JSON, and composites. JSON evaluation assumes sufficient execution resources; server stack/allocation exhaustion is separate. Catalog identities and pseudo-types share families; polymorphic signatures resolve to concrete values. Database lookups and internal server interfaces require explicit requirements rather than fabricated local results.

## Completion gate for implementation tasks

Keep PostgreSQL behavior in maintained Rust. Generate evaluator control flow and target code through ASTs. Preserve schema namespaces, separate CHECK and regex transpilers, errors as values, and diagnostic Unknown results.

For each implementation task, select focused family suites and regressions for the shared behavior it changes. Verify Rust, Go and TypeScript against PostgreSQL, including raw/stored binding, public inputs and NULL/Unknown/error behavior. Rebuild affected assets, verify relevant codegen goldens, and run applicable static, corpus and measurement checks. Record selected dependencies and any reused evidence. Select INSERT worlds with `PGSID_CHECK_WORLDS=directory[,directory]`; keep scoped reports separate. Run the full CHECK gate for broad semantic changes and integration milestones. Keep partial runs explicitly partial. Refresh applicable measurements and this ledger, then commit the verified slice.
