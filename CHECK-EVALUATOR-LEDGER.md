# CHECK evaluator work ledger

This is the implementation queue for the Rust CHECK engine. Work in the order below unless a task exposes a prerequisite. Complete a bounded task through binding, generated Rust, Go, TypeScript, and PostgreSQL parity before expanding its scope. Check a box only after its completion criteria pass.

## Baseline and measurements

The starting revision is `027d433` (XML well-formedness predicates). The bounded porting effort covered strict, immutable scalar callables on represented values, plus represented enum callables. Session-dependent behavior remains separate. Completion of that effort does not establish complete expression, coercion, collation, input-format, or PostgreSQL type coverage.

Measure each boundary separately:

| Evidence                                                                       | What it measures                                                                         |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `artifacts/check-surface/report.json`                                          | Catalog overloads, operator aliases, binding probes, and uncertain corpus expressions    |
| `artifacts/check-type-audit/report.json`, `artifacts/check-arrays/report.json` | Catalog type representations, row shape, basic preparation and array callable boundaries |
| `artifacts/check-worlds/report.json`                                           | Actual INSERT outcomes, Unknown results, and unexercised constraints                     |
| `artifacts/check-coercions/report.json`                                        | Explicit cast pairs and runtime text conversions, compared in raw/stored CHECKs          |

Generated artifacts are ignored by Git. The census and type-audit producers live under maintained `scripts/check-measurements/`. Refresh world outcomes before measuring the surface. Run from the repository root:

```bash
pnpm check-rust:measure
```

A prepared evaluator may return Unknown. Count useful support from binding and executed outcomes, rather than preparation success alone. Legacy target bindings and catalog function counts are separate from Rust CHECK coverage; dedicated regex paths can work without a catalog-named implementation.

The type report separates nullness from portable value representation and uses catalog row shape for column probes. Column admission is probed in PostgreSQL; rejected types remain inventoried without column probes. The surface report verifies live callable and cast identities, records raw/stored expression probes, and joins bound corpus expressions to executed world outcomes. Required generated inputs and write hooks remain visible beside those outcomes. Values before a BEFORE ROW hook can differ from the values PostgreSQL checks. Callable candidates, context requirements, new representations, and expression gaps remain separate. Surface measurement rejects world outcomes whose input fingerprint differs from the current corpus.

## Preserve the measurement tools

- [x] Move the census and type-audit producers into maintained tooling, adapting imports and output paths; add a documented package command.
- [x] Verify catalog identity checks and separate classifications for pure callables, session dependencies, new representations, and expression gaps.

Done when a fresh checkout can regenerate the reports without recovering scripts from ignored artifacts. Keep generated results separate from maintained sources.

## Close expression gaps on represented values

- [x] Boolean tests: `IS TRUE`, `IS FALSE`, `IS UNKNOWN`, and their negations.
- [x] Null-safe equality: `IS DISTINCT FROM` and `IS NOT DISTINCT FROM`.
- [x] `NULLIF`, including catalog equality resolution and result typing.
- [x] `GREATEST` and `LEAST`, including common types and PostgreSQL NULL rules.
- [x] Row comparisons, including element ordering and NULL behavior.
- [x] Keep scalar null tests type-aware for portable temporal values and nested domains.

Verify each form independently, including NULL, Unknown, SQL errors, ordered computation validity, strict runtime NULL propagation, eager literals, lazy branches and safe unresolved choices whose probes retain their guards. Compare raw SQL and stored CHECK definitions. Unknown has no PostgreSQL counterpart and needs explicit partial-input cases in addition to database comparisons.

Done per form when the binder produces a meaningful expression, production evaluators execute it in every target, and expression probes plus world INSERT cases demonstrate the supported boundary. Broader row/composite representations are a separate prerequisite if a row-comparison slice requires them.

## Resolve uncertain corpus expressions

- [x] Investigate casts from timestamptz to date in the energy-grid world.
- [x] Investigate enum-to-text comparisons in the energy-grid world.
- [x] Investigate integer-to-text comparisons in the identity-access,
      inventory-allocation, and lab-calibration worlds.
- [x] Investigate timestamp-to-text comparisons in the claim-routing world.
- [x] Diagnose the Unknown result for
      `008_inventory_allocation/movement_increases_quantity`, constraint
      `movement_classification_inputs`.

Use the surface report's constraint identities and bound expressions to locate each case. A cast, collation restriction, unavailable input, and missing implementation require different fixes. Existing formatters do not prove that
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
- [x] Bind Boolean/network character casts and integer/numeric text I/O through catalog identities, including actual argument types, integer radix/underscore grammar, width/precision modifiers, numeric CASE/COALESCE, mixed numeric overloads, literal preparation and composition.
- [x] Admit scalar-domain casts and domain arrays with inherited modifiers, ordered constraints, nominal polymorphic results and original INSERT parity; capture implicit/explicit conversion context during catalog generation and defer missing or ambiguous context.
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
- [x] Establish client-encoding requirements for text, varchar, bpchar and name binary output, retaining portable ASCII bytes.
- [x] Declare database encoding for character codes and construction; defer dependent non-ASCII results without UTF8.
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

Implement the remaining concrete PostgreSQL value families after the preceding expression and corpus work. Complete one bounded slice through the completion gate before expanding it. Prioritize common CHECK families, including arrays and JSON, before ACL/full-text; follow dependency order unless implementation exposes a prerequisite:

- [x] Establish IEEE bit conversion primitives before floating-point values, casts, comparisons, and binary I/O.
- [x] Preserve lossless floating-point literals when reading catalog CHECKs and defaults, restoring the caller's rendering settings after the read.
- [x] Floating point (`float4`, `float8`).
- [x] Audit platform-generated NaN binary precision in floating input, literals and geometry; retain known NaN semantics when output bits require platform context.
- [x] Establish time, timetz, and interval payloads, comparisons, arithmetic, core casts, binary output, and SQL-coerced public inputs.
- [x] Establish interval unit, clock, and ISO designator input, lossless catalog literals, and explicit IntervalStyle requirements.
- [x] Establish compact interval grammar, clock precision and scalar time constructors.
- [x] Establish interval scaling, calendar arithmetic, precision-aware literals, and clock input/output.
- [x] Establish temporal field extraction, hashes, interval truncation, timestamp binning, and local calendar age.
- [x] Establish temporal range checks, fixed interval timezones, SQL-coerced wide offsets, and ISO alternative interval input.
- [x] Establish explicit-zone calendar adjustments, non-strict temporal overlaps, legacy timestamp field extraction, and the measured session-timezone requirement for instant calendar age.
- [ ] Time and interval (`time`, `timetz`, `interval`).
- [x] Establish point payloads, SQL-coerced public inputs, construction, geometric equality, binary output and composition; establish the scalar square-root primitive and classify geometric text rendering requirements.
- [x] Establish point direction tests, arithmetic, distance, slope, portable text input and literals, and catalog-resolved unconstrained-domain casts; preserve semantic NaN values while classifying computed binary precision.
- [x] Establish line coefficient payloads, geometric equality, orientation, binary output, domains, SQL-coerced public inputs and composition.
- [x] Retain known scalar NaNs produced by geometry or native JavaScript inputs
      across comparisons, casts and composition while deferring unavailable
      binary precision.
- [x] Establish line text input, point construction, literals and catalog I/O
      casts through unconstrained domains.
- [x] Establish line relations, intersections, distances, point containment and closest-point projection.
- [x] Establish line-segment endpoint payloads, public inputs, construction, parsing, literals, comparisons, length, midpoint and orientation.
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
- [ ] Deferred: full-text documents (`tsvector`), after common CHECK families. Implement portable lexemes, positions, weights and operations; retain configuration-dependent text processing requirements.
- [ ] Deferred: full-text queries (`tsquery`), after common CHECK families. Implement portable query trees, input/output and matching; retain configuration-dependent query construction requirements.
- [ ] Deferred: ACL entries (`aclitem`), after common CHECK families. Implement portable privilege payloads separately from role-name lookup and runtime authorization; do not assume deployment role OIDs.
- [ ] XML values, with document/content and execution-context requirements explicit.
- [x] Establish money payloads, comparisons, arithmetic, binary output and words, and capture stored CHECK literals while classifying monetary context.
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
- [x] Establish typed scalar/enum arrays with dimensions/lower bounds, NULL/Unknown cells, independent nested clones, SQL-coerced public inputs and array domains, metadata, captured enum ranges/endpoints, CASE/COALESCE, input shapes and INSERT parity; preserve raw database conversion.
- [x] Establish scalar/nested ARRAY constructors, enum/empty/NULL forms, element casts and widths, rectangular lower bounds, computed-element validity, lazy branches, ordered errors, constant preparation and INSERT parity; preserve nominal domain element identities.
- [x] Establish private array-text grammar and ordered element/error events, quoting/escaping, explicit bounds, delimiter profiles, NULL-token context and owned snapshots in every target; public I/O admission follows.
- [x] Admit source/stored array literals and text I/O input, integer/Boolean/numeric/enum input profiles, widths/precision, explicit array_nulls, captured money units and partial name-cell shape; verify lazy preparation, exact cells and INSERT parity.
- [x] Admit array text output and string splitting/joining, shared element I/O, dimensions, quoting/escaping, character widths, delimiters/NULL markers and INSERT parity; retain partial cells, reached encoding/collation and scalar formatting/catalog deferrals; classify binary array send/receive catalog/internal requirements.
- [x] Admit multidimensional element fetches and slices, omitted/mixed bounds, integer assignment casts, copied cells, constant preparation and reached-error order; verify raw/stored composition and INSERT parity.
- [x] Admit array equality/order through catalog-selected element support, NULL cells, dimensional tie-breaks, reached context deferrals, owned snapshots, constant preparation, expression composition and INSERT parity.
- [x] Admit containment/overlap through default element equality, shape/duplicate independence, nonmatching NULL cells, partial-input recovery, reached errors, constant preparation, collation boundaries and INSERT parity.
- [x] Establish catalog-linked binary/function/I/O array element casts and qualified catalog array type spellings, actual callable parameters/results, precision/width and absent modifiers, common CASE/COALESCE/extrema/constructor types, retained bounds/partial cells and nominal enums; verify stored constructor typing, owned loops, narrowing/typmod validity, safe context bounds, preparation and INSERT parity.
- [x] Bind compatible array/element signatures; admit first/all position searches and threshold bucketing; verify NULL matching/rejection, lower bounds/start positions, binary search/duplicates, support/shape error order, partial states, context/preparation, nominal enums and INSERT parity. Admit catalog-selected ANY/SOME/ALL over column/computed arrays, scalar/element coercion, borrowed scans, empty/NULL rules, eager argument validity, reached comparison errors and legacy constructor-list compatibility. Bind concrete array parameters through catalog element and scalar implicit casts; retain assignment-only narrowing rejection, bitmap provenance, name-input context, preparation and INSERT parity.
- [x] Admit fill/trim, append/prepend, concatenation, removal/replacement, first-dimension reversal, sorting and array extrema; verify concrete/polymorphic binding, NULL/partial cells, retained/reset bounds, support/error order, representation-sensitive sort/extrema ties, borrowed comparison cursors, native-count deferral, preparation and INSERT parity.
- [x] Declare PostgreSQL byte order for byte, float and logical JSONB hashes through settings; verify both orders, native numeric/TID/float layouts, canonical JSONB traversal, UTF8 and NaN build requirements, successful constant Unknown computations, catalog hash links and INSERT parity. Admit scalar and recursively nested-domain array hashes through concrete element support, borrowed traversal and bounded modular arithmetic; retain whole-array endian alternatives/cancellation, shape independence, NULL cells, missing-support errors, ordinal-only enum deferrals, preparation and INSERT parity.
- [x] Admit regex capture/split arrays with catalog overloads, first/all match traversal, unmatched NULL captures, zero-length split boundaries, flags, C collation, owned text cells, array composition, strict partial states, preparation and INSERT parity.
- [x] Admit qualified identifier arrays with quoted/escaped parts, ASCII downcasing, exact lexer whitespace, untruncated names, default/strict/relaxed suffix handling, collation independence, reached UTF8 requirements, partial states, eager/lazy composition and INSERT parity.
- [x] Classify aggregate state bitmap/native-size requirements and direct-call combine errors. Preserve optional bitmap provenance through construction, I/O, slices, casts and transformations. Admit wrapping integer transitions/inverses, sum and exact average, plus floating statistical transitions, combiners and finalizers with native count guards, exact IEEE operation order, distinct overflow guards, fresh result bounds, partial cells, selected payload precision and eager/lazy INSERT parity; retain bitmap and missing-word deferrals.
- [x] Retain owned array-valued domain cells with recursive nominal identities, independent shapes, constructors/fetch/slices/fill/append and public inputs; admit recursive text input, input typmods, literal preparation, ordered errors, trusted stored values and encoding/NULL context with INSERT parity. Admit recursive text output/string joining with inherited delimiters, captured enum labels and JSONB output encoding; verify recursive catalog casts, target constraints/modifiers, retained source values and nested error order. Admit recursive equality/order, containment, search/rewrite, sort/extrema, bucketing and quantified comparisons with catalog support, NULL/partial states, preparation and reached context. Recursive ownership crosses vectors only.
- [x] Close array binding, scalar I/O and composed-validity audits for represented element families; preserve catalog/runtime requirements and complete the integration checkpoint.
- [x] Capture stable range/subtype/multirange/array identities, constructor/type-call candidates and selected comparison, collation and canonicalization support; verify custom support, overloads and rebuild/search-path independence without retaining OIDs. Retain user range profiles and collation flags in catalog snapshots and comparable schema states, including quoted identities, selected callbacks, continuous versus canonical integer ranges and independent rebuilds.
- [x] Establish owned SQL-coerced range payloads with typed bounds, nominal identities, empty/unbounded/inclusive distinctions and narrow wrapper admission; verify structural calls, exact bounds, NULL/Unknown/errors, snapshots and Rust/Go/TypeScript INSERT parity.
- [x] Bind builtin ranges and subtype results through nested domains, typed NULLs and CASE/COALESCE; validate public row payloads, preserve raw query conversion and reject malformed bound tags before copying.
- [x] Admit builtin two/three-argument range constructors and discrete canonicalization through catalog identities and subtype comparators; preserve non-strict NULL bounds, flags validation, equal/reversed endpoints, exact bigint/numeric scales, infinity and overflow, ordered errors, eager/lazy composition and reservation INSERT parity.
- [x] Admit builtin range grammar, typed literals and catalog-linked character input through ordered scalar parsers and canonicalization; preserve quoting/escapes, omitted versus empty bounds, nested checked domains, eager literal versus stable runtime preparation and reached DateStyle/TimeZone deferrals with raw/stored and INSERT parity.
- [x] Admit builtin range text output through captured range/subtype I/O, exact integer/numeric rendering, quoting/escapes, omitted and typed infinite bounds, character widths and nested domains; preserve strict states, ordered rendering, eager literal input errors, lazy stable output and reached DateStyle/TimeZone deferrals with raw/stored and INSERT parity.
- [x] Admit builtin range ordering/equality, endpoint relations, containment, adjacency and canonical set operations through captured subtype support; preserve empty/unbounded/inclusive distinctions, exact selected bounds, non-contiguous errors, strict states and argument order, owned partial results, nominal composition and untyped literals, eager/lazy preparation and INSERT parity.
- [x] Capture stable binary input/output links and admit builtin range wire output and hashing through subtype support; preserve flags, exact bounds/scales, seeded arithmetic, strict states, ordered output and eager/lazy preparation. Compare complete byte-order alternatives, retain context-free results and owned partial states, verify deployment-OID independence and INSERT parity, and classify internal-buffer receive separately.
- [x] Establish owned range array cells and admit builtin range arrays and nested/domain cells through captured nominal profiles; validate public inputs before copying and preserve exact bounds, typed nullness, NULL/Unknown/errors, partial states, malformed-bound deferral and independent extracted/reinserted snapshots. Compose metadata, subscripts, constructors, comparisons, searches, rewrites, transformations, text I/O and hashes with checked domains, reached temporal context, ordered errors, eager literals, lazy runtime input and complete byte-order alternatives; verify deployment-OID independence and native/Rust/Go/TypeScript INSERT parity.
- [x] Establish and bind owned builtin SQL-coerced multirange values through captured profiles, nested domains, typed NULLs and CASE/COALESCE; preserve stored member order, exact typed bounds, nominal range/subtype identity, empty versus NULL, partial bounds and ordered errors. Verify scalar boundary accessors, independent extracted/reinserted snapshots, public payload validation before copying, raw query conversion, deployment-OID independence and native/Rust/Go/TypeScript INSERT parity. Keep member-array admission separate.
- [x] Admit builtin empty, single-range and variadic multirange constructors plus catalog range casts; sort/merge stored members with exact equal-bound selection and numeric scales, preserve subtype/canonical profiles, domain-array unwrapping, shape/NULL error order, partial values, input snapshots and eager/lazy composition; verify raw/stored and INSERT parity.
- [x] Admit builtin multirange equality/order, endpoint relations, containment, overlap and outer-edge adjacency, including mixed range and exact subtype operands; preserve nominal polymorphic identities, partial-bound decisions, strict states and argument order. Verify checked domains, extrema, NULLIF, row/list/quantified range comparisons, selected numeric scales, catalog range casts and raw/stored INSERT parity.
- [x] Admit builtin multirange union, intersection, difference and range hulls through captured profiles and shared subtype support; retain exact selected member bounds/scales, multiple cuts, empty identities, partial hulls, strict states and independent snapshots. Verify nested domains, composed selection, checked result domains, eager constant errors, lazy runtime branches and raw/stored INSERT parity.
- [x] Admit builtin multirange text grammar, typed literals and captured character I/O through ordered member parsing, shared normalization and range/subtype output; preserve quoting/escaping, empty removal, exact selected numeric scales, character widths, checked domains, unknown-operand overload resolution, strict/partial states, ordered errors and snapshots. Verify eager literal input versus lazy stable casts, stored normalization, raw/stored composition and INSERT parity; retain reached scalar DateStyle/TimeZone requirements.
- [x] Admit builtin multirange binary send and seeded/unseeded hashes through captured range/subtype support; preserve count/length framing, exact numeric wire scales, strict seeds, partial bounds, reached errors, whole-value byte-order alternatives and independent snapshots. Verify domains, eager/lazy composition, deployment-OID independence and raw/stored INSERT parity; classify internal receivers separately.
- [x] Establish owned multirange array cells and admit builtin multirange arrays and nested/domain cells through captured multirange/range/subtype profiles; validate public inputs before copying and compose metadata, indexing, constructors, comparisons, membership, searches, rewrites, transformations, catalog array casts, text I/O and hashes. Preserve checked domains, exact selected wire scales, exact duplicate sort ties, unspecified unequal tie representations, eager literals, lazy/context-dependent input and complete byte-order alternatives; verify native/raw/stored INSERT parity and retain database/internal interface requirements separately.
- [x] Admit range/multirange JSON string conversion and recursive arrays through captured polymorphic output identities and shared subtype formatters; preserve exact numeric scales, domain cells, object keys, typed VARIADIC builders, raw/stored composition, NULL/Unknown/error states, lazy branches and reached DateStyle/TimeZone requirements; verify native/Rust/Go/TypeScript INSERT parity.
- [x] Admit builtin range subtype-distance support through captured scalar signatures, conversion before floating subtraction, raw temporal infinity markers, timestamp seconds and exact numeric subtraction before float conversion; preserve rounding, strict states, overflow/underflow, domains, constant preparation, lazy composition and native/Rust/Go/TypeScript INSERT parity.
- [x] Establish owned comparison/canonicalization profiles for ranges and multiranges before custom CHECK admission; preserve continuous versus discrete semantics, empty profiles, member normalization, builtin input defaults, readonly support, nested array snapshots and reached unavailable-support deferral across Rust/Go/TypeScript and PostgreSQL.
- [x] Admit captured custom range/multirange row values over established subtype backends, including subtype and whole-value domains, structural access, comparison/set composition, nominal polymorphism and public adapters; attach compiled support without deployment OIDs or caller-selected behavior, and defer reached unavailable callbacks. Verify independent catalogs and native/Rust/Go/TypeScript INSERT parity.
- [x] Admit SQL-coerced custom range/multirange text output through captured range/member/subtype function identities; reuse shared scalar formatters for widths, exact numeric scales, checked domains, NULL/error states and lazy branches. Verify public adapters, independent catalogs and native/Rust/Go/TypeScript INSERT parity; preserve reached temporal context requirements.
- [x] Establish owned range grammar plans before custom subtype input binding; retain decoded bound text, quoted-empty versus omitted bounds, complete grammar before lower/upper conversion, empty/NULL/Unknown/error states and captured support when finishing. Verify domain input order, omitted NOT NULL bounds, unavailable callbacks, snapshots and native/Rust/Go/TypeScript parity while preserving builtin parsing.
- [x] Admit custom range/multirange text casts and eager typed literals through captured input identities and ordered scalar/domain conversion, including omission, typmods, domain preparation, member input before later syntax, final normalization, SQL errors, lazy branches and reached unavailable support. Recover stored owned literals without rechecking subtype domains, comparisons or canonicalizers; verify independent catalogs, public adapters and native/Rust/Go/TypeScript INSERT parity.
- [x] Establish an owned multirange member cursor that converts completed members before later syntax and normalizes only after complete outer input; verify omitted subtype-domain bounds, preparation/error order, unavailable support, borrowed scans, owned snapshots and native/Rust/Go/TypeScript parity while preserving builtin parsing.
- [x] Execute captured custom range/multirange constructors and type-name calls with exact/default/variadic/named overload selection and captured implicit cast eligibility; preserve subtype domains, preparation, callback requirements, actual renamed implementations, stored variadic arrays, public adapters and native/Rust/Go/TypeScript INSERT parity. Defer selected user functions, omitted default expressions and missing resolution context.
- [x] Admit captured custom range/multirange arrays through recursive compiled profile attachment, qualified identities, public inputs, constructors, generic operations, VARIADIC calls and text/element I/O; preserve nested domains, stored bounds/scales, partial states, error/preparation order, lazy callbacks and independent snapshots. Verify independent catalogs, compiled support replacement, nominal validation and native/raw/stored INSERT plus Rust/Go/TypeScript parity.
- [x] Admit custom range/multirange binary output and seeded/unseeded hashes through captured subtype and default operator support, including recursive array hashes, exact numeric wire scales and complete byte-order alternatives. Preserve domain-array missing-hash errors, strict seeds, eager input, lazy branches, successful hash uncertainty during preparation, independent catalogs and public inputs; defer reached user callbacks and explicit runtime type-cache incompatibilities. Verify native/raw/stored INSERT and Rust/Go/TypeScript parity.
- [x] Admit custom range/multirange JSON conversion through captured output and function-cast categories, including recursive/domain arrays and typed VARIADIC builders; preserve exact formatting, SQL NULL skips, staged key errors, eager argument errors, lazy input, missing metadata and reached callback/context requirements. Verify independent public adapters, native INSERTs and Rust/Go/TypeScript parity.
- [x] Bind captured constructor defaults through qualified stored expressions, including named omissions, strict NULLs, domain/scalar coercion and variadic array defaults. Preserve exact numeric scales, stored temporal values and isolated binding without column capture; retain unavailable expression preparation before guards and later errors. Verify native INSERTs, independent catalogs, public adapters and Rust/Go/TypeScript parity.
- [x] Admit owned text ranges/multiranges through captured comparator/collation support and declared C/UTF8 ordering, including subtype domains, constructors, literals, ordered input, output, arrays, JSON, wire and hashes. Preserve compiled support over caller metadata, snapshots, strict/partial states, preparation, lazy branches and reached callback/encoding requirements; verify independent catalogs, public adapters and native/Rust/Go/TypeScript INSERT parity.
- [x] Establish owned range/multirange backends over represented smallint, Boolean, network, bit/binary, MAC, UUID, floating, clock/interval, money and identifier carriers before SQL admission. Reuse scalar comparators, parsers and portable output; preserve continuous semantics, exact selected bounds, NaNs, strict/partial states, snapshots and existing context deferrals across native/Rust/Go/TypeScript checks.
- [x] Admit SQL-coerced scalar range/multirange rows through captured profiles, constructors, comparisons/sets, checked whole-value domains and recursive arrays. Validate scalar bound payloads before copying, preserve compiled support over caller metadata, exact bits/units, NULL/Unknown/errors, snapshots and reached formatting requirements; verify independent public adapters and native/Rust/Go/TypeScript INSERT parity.
- [x] Recover stored money range/multirange bounds and recursive domain-array literals with shared Rust text grammar and exact captured units; preserve stored NULL tokens and avoid replaying domain checks or range callbacks. Verify native/Rust/Go/TypeScript INSERT parity and retain monetary-context requirements for runtime text casts.
- [x] Verify admitted scalar range/multirange text casts, source/stored literals and array input through subtype domains, bit widths and clock/interval precision. Preserve exact wire values, omitted bounds, ordered errors, eager preparation, lazy input and partial states; retain reached monetary, timezone and platform input requirements with native/Rust/Go/TypeScript INSERT parity.
- [x] Reproduce missing subtype hash support errors for ranges, multiranges and recursive/domain arrays, including empty and all-NULL collections. Preserve strict seeds, partial bounds, input errors, constant preparation and lazy branches; verify native/Rust/Go/TypeScript INSERT parity without deployment OIDs.
- [x] Verify admitted scalar range/multirange output, widths, binary send, hashes and JSON conversion through recursive/domain arrays and VARIADIC builders. Preserve exact bounds, signed zero, NaNs, key/error order, NULL and lazy branches with source/stored and native/Rust/Go/TypeScript INSERT parity; retain scalar formatting and hash build/context requirements.
- [x] Admit CIDR ranges/multiranges and subtype domains through captured profiles and binary hash casts; retain host-bit validation and full-width network output with unavailable comparators. Verify constructors, literals, ordered input, public payloads, arrays, JSON, wire, hashes, snapshots and native/Rust/Go/TypeScript INSERT parity.
- [x] Admit varchar, bpchar and name range/multirange subtypes with captured C/UTF8 comparators, padded bounds, selected hashes, wire output, arrays, JSON and source/stored literals. Preserve subtype-domain widths, ownership, callback deferrals and public inputs; retain identifier-limit and client-encoding requirements with native/Rust/Go/TypeScript INSERT parity.
- [x] Admit catalog-OID-alias range/multirange subtypes through captured unsigned comparison, hash and alias I/O profiles, including subtype domains, arrays, constructors and literals. Distinguish input-function parsing from explicit name lookup; preserve missing callbacks, catalog-dependent output/JSON and independent deployment OIDs with native/Rust/Go/TypeScript INSERT parity.
- [x] Admit captured JSONB range/multirange SQL types through owned logical bounds, subtype domains, constructors, source/stored literals, arrays, validated public payloads, I/O, JSON and hashes. Retain UTF8 input/output independently of unavailable comparison, require C/UTF8 ordering, preserve exact scales, ownership and error order, and verify native/Rust/Go/TypeScript INSERT parity.
- [x] Preserve exact Unicode JSONB sort ties across scalar, range/multirange and nested domain arrays through stored logical representations; pass declared UTF8 through direct array input, retain missing-encoding and unequal-display-scale deferrals, and verify source/stored composition and native/Rust/Go/TypeScript INSERT parity.
- [ ] Extend range/multirange support to enums and recursive subtype carriers; reuse established scalar backends, preserve nominal/polymorphic identities and retain unavailable callback, catalog and execution-context requirements.
- [x] Capture nominal enum range subtype definitions and catalog label order through domain chains, including empty enums and inserted labels; preserve legacy metadata views, search-path independence, independent snapshots and comparable schema state without retaining deployment label OIDs. Runtime enum range admission remains pending.
- [x] Establish owned enum range/multirange label tables and ordinal bounds, shared input/output, comparisons, sets and normalization; preserve array/member snapshots, empty enums and blank labels, compiled definition replacement, malformed payload deferral and context-independent structural results. Verify native/Rust/Go/TypeScript parity without deployment OID assumptions; enum SQL admission remains pending.
- [ ] Composite values, including field identity, access, row NULL semantics and JSON record conversion.
- [x] Establish lossless SQL-coerced JSON values, root/source output, domains, literals and text I/O casts; preserve NULL/lazy composition, eager errors, public wrappers and raw writes.
- [x] Paired/separate text-array JSON and JSONB objects: preserve shape/error order, lower-bound independence, NULL keys/values, quoting, raw duplicate/order/layout versus normalization, partial states, preparation, ownership and INSERT parity.
- [x] Raw JSON field/element extraction and lengths, source preservation and encoding requirements.
- [x] Raw JSON scalar/recursive domain-array conversion: reuse scalar output policies, preserve raw sources/duplicates, numeric scales/signed zero, nested/pretty array layout, strict/partial states, canonical UTF8 JSONB text, owned cursors and INSERT parity.
- [x] JSONB logical normalization, shared parsing, SQL-coerced values, domains/literals, text/JSON I/O and stored-format admission; preserve declared Unicode encoding, NULL/lazy composition and eager errors.
- [x] JSONB field/element/path extraction and pretty text honor declared UTF8 key ordering; retain decoded strings, portable subtrees, NULLs and missing-context deferrals.
- [x] JSONB equality/inequality and iterative containment, exact numeric scalars, NULL-safe composition and public inputs.
- [x] JSONB C/UTF8 ordering, exact comparator results and container traversal, with declared database defaults and composed/public INSERT parity.
- [x] JSONB scalar casts, numeric precision/scale and unconstrained scalar-domain targets; preserve NULL, rounding, errors and lazy composition.
- [x] JSONB concatenation and top-level text/index deletion; preserve logical trees, storage admission, ownership and public INSERT parity.
- [x] JSON/JSONB recursive null stripping, raw duplicate/order/number spellings, decoded quoting, default/array flags and pretty layout; preserve encoding requirements and NULL/Unknown/errors.
- [x] Scalar to_jsonb represented values and enums, portable network/MAC/bit, identifier/snapshot, ISO date/timestamp and clock outputs; preserve strict states, interval infinities and invariant geometric output, finite-float, TimeZone, custom-cast and catalog/session requirements without default-setting assumptions.
- [x] Owned heterogeneous argument batches and internal cursors: Clone value enum vectors, nested payload copies, indexed replacement, crate-visible moves and readonly borrows; preserve public boundaries/explicit clones and reject cycles or mutable borrows.
- [x] JSON/JSONB scalar/recursive domain-array argument builders, captured per-input enum labels and JSON conversion categories, custom cast execution requirements, empty/VARIADIC forms, non-strict NULLs, scalar keys, raw source/duplicate layout versus normalization, declared context, staged errors and owned composition.
- [x] JSON/JSONB binary send, source/canonical bytes, version framing and strict states; retain encoding requirements and classify receive functions as internal interfaces.
- [x] Typed VARIADIC binding, JSON/JSONB path extraction/key existence, nested array conversion/flattened builders and JSONB bulk key/path deletion, set/insert/NULL policies; preserve bounds, duplicate/source spans, traversal, partial/staged errors, scalar context, preparation and INSERT parity.
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
- [ ] Audit remaining JSONPath boundaries: Unicode locale-sensitive regex implementation gaps; unavailable locale/timezone/abbreviation context; and stored text whose original grouping requires source graphs. Keep missing implementation separate from justified Unknown results.
- [ ] Classify remaining internal and pseudo-types with tested requirements or exclusion from the public value contract.

Use the type audit for the remaining surface, including internals; defer ACL/full-text behind common CHECK families, arrays and JSON. Done per family when its portable values, SQL-coerced row input conversion, literals, catalog-resolved casts, applicable comparisons, core operations, expression composition, and world INSERT parity work together. Preserve distinct SQL NULL, Unknown, and SQL error outcomes in every target. Keep raw input parsing, session-dependent behavior, and unimplemented callables visible in the reports; representation support alone does not complete them. Assess recursive ownership before arrays, JSON, and composites. JSON evaluation assumes sufficient execution resources; server stack/allocation exhaustion is separate. Catalog identities and pseudo-types share families; polymorphic signatures resolve to concrete values. Database lookups and internal server interfaces require explicit requirements rather than fabricated local results.

## Completion gate for implementation tasks

Keep PostgreSQL behavior in maintained Rust. Generate evaluator control flow and target code through ASTs. Preserve schema namespaces, separate CHECK and regex transpilers, errors as values, and diagnostic Unknown results.

For each implementation task, select focused family suites and regressions for the shared behavior it changes. Verify Rust, Go and TypeScript against PostgreSQL, including raw/stored binding, public inputs and NULL/Unknown/error behavior. Rebuild affected assets, verify relevant codegen goldens, and run applicable static, corpus and measurement checks. Record selected dependencies and any reused evidence. Select INSERT worlds with `PGSID_CHECK_WORLDS=directory[,directory]`; keep scoped reports separate. Run the full CHECK gate for broad semantic changes and integration milestones. Keep partial runs explicitly partial. Refresh applicable measurements and this ledger, then commit the verified slice.
