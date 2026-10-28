# CHECK evaluator continuation handoff

The goal is active following the user’s resume. The prior usage-limit pause is `89c50c11`; temporal validation then landed in `bca3322f`. This handoff accompanies the integer strict-NULL checkpoint. The complete objective and unchecked audits remain in `CHECK-EVALUATOR-LEDGER.md`; focused passes do not complete the goal.

## Exact stopping point

Repository: `/home/andy/Projects/pgsid-workspace/pgsid`, branch `main`. Run commands there. Inspect `git status --short` and `git log` before changing anything. No subsequent semantic slice has been edited.

The integer checkpoint changes only state ordering in maintained `crates/check-evaluator/src/operations/pg_catalog/{integer,bigint,bigint_arithmetic}.rs`: original argument errors precede definite NULL, which precedes Unknown. Arithmetic, ordinary comparisons, smallint and mixed-width wrappers now retain strict NULL when another input is unknown. Finite arithmetic, overflow, division/remainder and comparison rules are unchanged.

Do not equate missing input values with possibly failing expressions. The existing generated expression-validity tracking independently keeps `(unknown_input / 0) + null_input` Unknown and preserves reached errors. It also preserves lazy CASE branches. No emitter, AST, wrapper representation or target API changes were needed. The ignored `src/codegen/go/assets/check-rust-sources.json` matches maintained sources; do not change it while semantic jobs read it.

Maintained owners: `tests/sql-semantics/check-integer-null-state.test.ts` discovers binary integer callables in those files and `smallint.rs`, tests both operand orders, source/stored graphs, injected errors and nested division/CASE/COALESCE. `check-value-metadata.test.ts` now expects the native noncollatable-type error for `pg_collation_for(NULL / unknown_input)`. `tools/check-rust-operations/generate.ts` expects strict NULL for partial integer pairs; other families keep their existing expectations. The new owner is registered in `tools/check-rust/check.sh`.

`tests/unit/query/worlds/012_package_capacity/check-seed.sql` adds NULL-numerator/zero-divisor cases for smallint/int4/int8, errors before NULL comparisons, and skipped errors. Only the mixed-target `pg_catalog/operations.{go,ts}` snapshots changed under `tests/fixtures/codegen/expected/`: Go schema, Go pgx query package, and TypeScript schema. They were regenerated through the producer.

## Evidence and reproduction

Ignored evidence packet: `artifacts/goal-checks/integer-null-active/`. These reports are supplementary; maintained owners regenerate evidence when absent.

- `parity.json` and `observations.json`: the complete new native/Rust/Go/TypeScript matrix passes, including nested possible errors versus plain unknown inputs.
- `operations.log`: the complete direct primitive-operation pipeline passes native comparisons, maintained Rust compilation/execution, generated TypeScript checking/execution and Go tests. Its fixtures are `artifacts/check-rust-operations/fixtures.json`. Existing compiler naming warnings are not failures.
- `metadata.json`: the selected concrete-type/collation metadata owner passes; the other tests were deliberately filtered. `integer-functions.json`: the complete integer-functions regression passes.
- `world-package-capacity.json` and `artifacts/check-worlds/scoped/012_package_capacity/report.json`: the complete selected public world passes, all its constraints exercised, no Unknown, matching native/local rejections. This is not a global-world pass.
- `golden-regenerate.json` and `golden-compare.json`: selected mixed-target producer regeneration and independent byte comparison pass, including TypeScript checking; other project variants are filtered.
- `typecheck.log`, `rustfmt.log`, `lint.log`, `corpus-declarations.log` and `gate-coverage.json`: maintained typecheck, Rust format, affected-test lint, scoped INSERT declarations and integration-gate registration pass. ESLint explicitly ignores the tools generator; its executed pipeline and formatting are separate evidence. Source-mirror byte equality and `git diff --check` pass.

Run affected owners serially, each with an OS timeout:

```sh
timeout --kill-after=5s 280s node node_modules/vitest/vitest.mjs run tests/sql-semantics/check-integer-null-state.test.ts --maxWorkers=1
timeout --kill-after=5s 300s bash tools/check-rust-operations/check.sh
timeout --kill-after=5s 240s node node_modules/vitest/vitest.mjs run tests/sql-semantics/check-value-metadata.test.ts --maxWorkers=1 -t 'uses concrete argument types'
timeout --kill-after=5s 660s node node_modules/vitest/vitest.mjs run tests/sql-semantics/check-integer-functions.test.ts --maxWorkers=1
PGSID_CHECK_WORLDS=012_package_capacity timeout --kill-after=5s 440s node node_modules/vitest/vitest.mjs run tests/sql-semantics/check-worlds.test.ts --maxWorkers=1
UPDATE_CODEGEN_GOLDENS=1 timeout --kill-after=5s 95s node node_modules/vitest/vitest.mjs run tests/unit/codegen-goldens.test.ts --maxWorkers=1 -t 'emits the complete generated tree byte-for-byte:.*mixed targets'
timeout --kill-after=5s 95s node node_modules/vitest/vitest.mjs run tests/unit/codegen-goldens.test.ts --maxWorkers=1 -t 'emits the complete generated tree byte-for-byte:.*mixed targets'
```

The previous temporal slice’s combined Go owner reached its fixed 65-second timeout; equivalent standalone generated Go tests passed. That historical failed report remains under `artifacts/goal-checks/temporal-calendar-active/`; it is not a current regression or a passing owner. No failed attempt remains unresolved in the integer checkpoint.

## Exact next task and remaining scope

Audit strict NULL preservation in `integer_support.rs`, `integer_bitwise.rs`, `integer_range.rs` and `integer_hash.rs` beside the changed files. Inspected helpers `integer_support_compare`, `integer_bitwise`, `integer_shift`, `integer_in_range` and `integer_hash_extended` still place Unknown before NULL. This is an observed candidate precision gap, not a completed semantic proof. Native strictness, multiple-argument errors, partial inputs and context guards need executing coverage. `btint2cmp` already delegates to the changed int4 subtraction; do not assume every support helper follows that path. Extend the existing integer-functions owner’s partial-state matrix rather than duplicating its full numeric sampling. Check missing-context guards separately from missing input values, especially hashes; do not invent byte order.

Continue all other unchecked ledger work afterward: temporal split/Julian/English/escaped grammar and coercion; partial container structures and raw versus SQL-coerced boundaries; overload/common-type/domain binding; session/collation/provider requirements; non-strict callback order and unavailable bodies; stable/volatile invariants; custom-schema/historical/default/projection/polymorphic forms; and final global gates. Existing type entries are bounded implementations, not claims of universal support. Full `pnpm check-rust:check` and global world/type/surface/coercion/array/historical/non-strict measurements remain incomplete. Clear scoped selectors and compare current fingerprints during final integration.

## Process and contracts

All checkpoint handles are terminal: new parity `78926`, direct operations `40888`, metadata `82331`, world `4530`, integer functions `87700`, regeneration `79231`, comparison `75339`, typecheck `26638`, lint `66973`. A host process scan found no task workers. Only `/tmp/pgsid-check-rust-go-cache` and `/tmp/pgsid-codegen-go-cache` remain; preserve them. Never restart a quiet live job to recover output. Poll exact handles; close every PGlite probe in `finally`, bound every job, and clean task-owned temporary paths after termination.

Keep semantics in maintained Rust and generate Go/TypeScript through existing ASTs. Public rows are SQL-coerced: do not reapply input/domain/typmod enforcement. Preserve NULL, Unknown, errors, eager constants, argument order, lazy branches and partial facts. Missing implementation is not database context. Never assume catalog OID consistency, even for builtins; retain captured qualified identities/definitions. Default C collation differs from C/C.UTF-8 character classification. Explicit non-C choices, hash byte order and character profiles remain declared facts, not host detection. Never invent a transaction clock/date. JSON uses portable logical values and assumes ordinary resources.

Commits along the way are authorized; no push. Use `git -c gc.auto=0 commit --file <message-file>`. No agents or external messages are authorized. Maintain the ledger at checkpoints and before task switches. Read applicable `AGENTS.md` before editing, particularly the evaluator, dialect/transpilers and SQL corpus. Use focused affected tests during development; reserve full integration for the final gate.
