# CHECK evaluator work ledger

This is the implementation queue for the Rust CHECK engine. Work in the order
below unless a task exposes a prerequisite. Complete a bounded task through
binding, generated Rust, Go, TypeScript, and PostgreSQL parity before expanding
its scope. Check a box only after its completion criteria pass.

## Baseline and measurements

The starting revision is `027d433` (XML well-formedness predicates). The bounded
porting effort covered strict, immutable scalar callables on represented values,
plus represented enum callables. Session-dependent behavior remains separate.
Completion of that effort does not establish complete expression, coercion,
collation, input-format, or PostgreSQL type coverage.

Measure each boundary separately:

| Evidence                                    | What it measures                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------------- |
| `artifacts/check-surface/report.json`       | Catalog overloads, operator aliases, binding probes, and uncertain corpus expressions |
| `artifacts/check-type-audit/report.json`    | Base-type representation and basic expression preparation                             |
| `artifacts/check-worlds/report.json`        | Actual INSERT outcomes, Unknown results, and unexercised constraints                  |
| `artifacts/check-xml/completion-audit.json` | Evidence for the completed bounded porting effort                                     |

These artifacts are ignored by Git. The census producers currently also live
under ignored `artifacts/`; preserve them in this workspace until the first task
below makes measurement reproducible from a checkout.

Refresh world outcomes before measuring the surface. Run from the repository root:

```bash
pnpm check-rust:build-wasm
pnpm exec vitest run tests/sql-semantics/check-worlds.test.ts
node --import tsx artifacts/check-type-audit/audit.ts
node --import tsx artifacts/check-surface/measure.ts
```

A prepared evaluator may return Unknown. Count useful support from binding and
executed outcomes, rather than preparation success alone. Legacy target bindings
and catalog function counts are separate from Rust CHECK coverage; dedicated
regex paths can work without a catalog-named implementation.

## Preserve the measurement tools

- [ ] Move the census and type-audit producers into maintained tooling, adapting
      imports and output paths; add a documented package command.
- [ ] Verify catalog identity checks and separate classifications for pure
      callables, session dependencies, new representations, and expression gaps.

Done when a fresh checkout can regenerate the reports without recovering scripts
from ignored artifacts. Keep generated results separate from maintained sources.

## Close expression gaps on represented values

- [ ] Boolean tests: `IS TRUE`, `IS FALSE`, `IS UNKNOWN`, and their negations.
- [ ] Null-safe equality: `IS DISTINCT FROM` and `IS NOT DISTINCT FROM`.
- [ ] `NULLIF`, including catalog equality resolution and result typing.
- [ ] `GREATEST` and `LEAST`, including common types and PostgreSQL NULL rules.
- [ ] Row comparisons, including element ordering and NULL behavior.

Start with Boolean tests. Verify each form independently, including NULL,
Unknown, SQL errors, type resolution, and evaluation behavior. Compare raw SQL
and stored CHECK definitions. Unknown has no PostgreSQL counterpart and needs
explicit partial-input cases in addition to database comparisons.

Done per form when the binder produces a meaningful expression, production
evaluators execute it in every target, and expression probes plus world INSERT
cases demonstrate the supported boundary. Broader row/composite representations
are a separate prerequisite if a row-comparison slice requires them.

## Resolve uncertain corpus expressions

- [ ] Investigate casts from timestamptz to date in the energy-grid world.
- [ ] Investigate enum-to-text comparisons in the energy-grid world.
- [ ] Investigate integer-to-text comparisons in the identity-access,
      inventory-allocation, and lab-calibration worlds.
- [ ] Investigate timestamp-to-text comparisons in the claim-routing world.
- [ ] Diagnose the Unknown result for
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

- [ ] Add named INSERTs for the report's unexercised constraints, starting with
      constraints already fully bound on represented values.
- [ ] Add passing, rejecting, NULL, boundary, and reached-error cases as relevant;
      include branch cases that demonstrate skipped errors.
- [ ] Keep new supported expression and callable slices covered by world INSERTs.

PostgreSQL supplies the expected outcomes. Keep cases in each world's
`check-seed.sql`; use a focused `-- @world checks` world when appropriate.
Existing query-world admission rules still apply.

Done when every targeted constraint has meaningful executed coverage and all
definite local results agree with PostgreSQL. Record remaining Unknown and
unexercised cases explicitly rather than treating them as passes.

## Complete parsing and coercion boundaries

- [ ] Inventory unsupported input forms and coercions for represented types.
- [ ] Expand temporal text parsing in bounded, independently testable slices.
- [ ] Assess precision modifiers, assignment coercion, and raw query-parameter
      conversion separately from already SQL-coerced row inputs.
- [ ] Verify casts through catalog links, including domains and mixed-type
      expressions, without selecting overloads by implementation availability.

Done per slice when supported forms have Rust/Go/TypeScript/PostgreSQL parity,
unsupported forms remain distinguishable, and the public input contract is
explicit. Do not use target-native date or numeric parsers to supply SQL behavior.

## Model explicit execution context

- [ ] Enumerate operations requiring session settings or collation providers.
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

## Expand value representations

Choose the next family after the preceding expression and corpus work. This is
an assessment queue, not authorization to implement every family at once:

- [ ] Floating point (`float4`, `float8`).
- [ ] Time and interval (`time`, `timetz`, `interval`).
- [ ] JSON and JSONB, with JSONPath assessed separately.
- [ ] Arrays, including dimensions, lower bounds, NULL elements, and polymorphism.
- [ ] Ranges and multiranges.
- [ ] Geometry, full-text search, XML values, money, and catalog-oriented types.

Use the type audit to enumerate the entire remaining surface, including internal
types. XML text predicates do not establish an XML value representation; private
floating-point helpers do not establish public SQL float support.

Done per family when its portable values, input conversion, literals, casts,
core operations, expression composition, and world INSERT parity work together.
Establish representation or dialect changes before porting dependent callables.

## Completion gate for implementation tasks

Keep PostgreSQL behavior in maintained Rust. Generate evaluator control flow and
target code through ASTs. Preserve schema namespaces, separate CHECK and regex
transpilers, errors as values, and diagnostic Unknown results.

For each implementation task, run the applicable `AGENTS.md` gates: rebuild
assets, execute the full CHECK gate, verify codegen goldens, and run typecheck,
maintained-code lint/format, and corpus health checks. Include parser/transpiler
checks when those foundations change. Refresh measurements after the verified
change and update this ledger. Commit only when requested.
