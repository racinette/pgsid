# CHECK evaluator continuation handoff

The goal is active. This handoff accompanies the integer-helper strict-NULL checkpoint after `aa63e04d` (integer arithmetic/comparisons). Earlier checkpoints are `bca3322f` (temporal field errors), `a8a0f022` (native cast-result identities), and `f348ec2e` (JSONPath character profiles). The original scope and unchecked audits remain in `CHECK-EVALUATOR-LEDGER.md`; no global completion is claimed.

## Exact stopping point

Repository: `/home/andy/Projects/pgsid-workspace/pgsid`, branch `main`. Run commands there. Inspect `git status --short` and `git log` first. No next-slice semantic edit has been made.

The checkpoint reorders state checks in `crates/check-evaluator/src/operations/pg_catalog/{integer_support,integer_bitwise,integer_range,integer_hash}.rs`: original errors first, definite NULL second, Unknown third. This covers support comparators, min/max, GCD/LCM, strict Boolean state functions, bitwise/shift helpers, integer `in_range`, and seeded integer/Boolean hashes. Numeric algorithms and error codes are unchanged. The existing generated expression-validity tracking preserves possible and reached argument failures before a definite outer NULL; lazy branches still skip them.

`tests/sql-semantics/check-integer-functions.test.ts` now accepts `PGSID_CHECK_INTEGER_CASES=partial` or `all` (default). Partial mode skips numeric-value sampling but executes the original state cases plus every NULL argument position, unknown peers, multiple unknowns, argument errors, and NULL before negative frame-offset validation. Invalid selector values fail collection. The full gate in `tools/check-rust/check.sh` unsets the selector. This checkpoint ran partial mode; it does not claim a new complete numeric-sampling pass. The previous complete owner passed in `aa63e04d`.

`check-integer-null-state.test.ts` beside it now discovers helper callables too and exercises nested support/bitwise/shift/hash/window expressions containing a potentially failing division, source/stored plans, error order and lazy branches. Constraint names are quoted after the first setup attempt failed on reserved `window`. The maintained owner writes observations to `artifacts/goal-checks/integer-null-active/observations.json`; a copy matching this checkpoint is retained in the packet below.

The package-capacity world adds negative frame offsets skipped by NULL Boolean arguments, NULL before minimum-magnitude math, NULL bits with extreme shifts, a NULL hash seed, and strict Boolean state cases. Only three mixed-target `pg_catalog/operations.{go,ts}` snapshots changed: Go schema, Go pgx queries and TypeScript schema under `tests/fixtures/codegen/expected/`. They were regenerated through the producer. The ignored Rust source mirror matches maintained files; no AST/transpiler/API change or WASM rebuild was needed.

## Evidence and reproduction

Packet: `artifacts/goal-checks/integer-helper-null-active/`. Ignored artifacts supplement tracked owners and commands; they are not required to continue from a fresh checkout.

- `partial.json` and `matrix-partial.json`: selected helper state matrix passes native/Rust/Go/TypeScript. Numeric-value sampling is explicitly excluded.
- `composition-quoted.json` and `composition-observations.json`: complete expanded composition matrix passes all targets. `composition.json` is the corrected SQL setup failure, not a current semantic blocker.
- `world-package-capacity.json` and `artifacts/check-worlds/scoped/012_package_capacity/report.json`: complete selected public world passes with all constraints exercised, no Unknown and matching native/local rejections. It is not a global-world report.
- `golden-regenerate.json` and `golden-compare.json`: selected mixed-target regeneration and independent byte comparison pass, including generated TypeScript checking. Other variants are deliberately filtered.
- `typecheck.log`, `lint.log`, `rustfmt.log`, `corpus-declarations.log`: maintained typecheck, affected lint, Rust formatting and scoped INSERT declarations pass. Formatting, source-mirror equality, shell syntax and `git diff --check` also pass. Both parity owners compile maintained Rust and generated Go/TypeScript; no unrelated primitive-operation suite was rerun.

Run semantic/golden owners serially with timeouts:

```sh
PGSID_CHECK_INTEGER_CASES=partial timeout --kill-after=5s 240s node node_modules/vitest/vitest.mjs run tests/sql-semantics/check-integer-functions.test.ts --maxWorkers=1
timeout --kill-after=5s 280s node node_modules/vitest/vitest.mjs run tests/sql-semantics/check-integer-null-state.test.ts --maxWorkers=1
PGSID_CHECK_WORLDS=012_package_capacity timeout --kill-after=5s 440s node node_modules/vitest/vitest.mjs run tests/sql-semantics/check-worlds.test.ts --maxWorkers=1
UPDATE_CODEGEN_GOLDENS=1 timeout --kill-after=5s 95s node node_modules/vitest/vitest.mjs run tests/unit/codegen-goldens.test.ts --maxWorkers=1 -t 'emits the complete generated tree byte-for-byte:.*mixed targets'
timeout --kill-after=5s 95s node node_modules/vitest/vitest.mjs run tests/unit/codegen-goldens.test.ts --maxWorkers=1 -t 'emits the complete generated tree byte-for-byte:.*mixed targets'
```

For complete integer numeric sampling use `PGSID_CHECK_INTEGER_CASES=all` and an outer timeout of 660 seconds. Do not describe a partial run as a complete owner pass. The old temporal combined Go owner hit its fixed 65-second limit; equivalent standalone generated Go tests passed. Its historical failed report is not a current blocker.

## Exact next task

Assess generalizing the existing strict-call NULL control flow in `src/codegen/shared/check-rust-evaluator.ts`, in `emitCall`, currently enabled only by `node.strictNull`. It already resolves operator implementation metadata and requires `implementation.strict`, aggregates operand nullness, and skips the function body on definite NULL. Other families still contain Unknown-before-NULL helpers; investigate whether the shared control flow can close those CHECK-level gaps without a repeated manual sweep. This is a candidate approach, not a verified fix; no emitter change has been made.

Preserve eager operand errors, possible operand failures via `src/codegen/shared/check-rust-validity.ts` and the outer validity scope, constant preparation, diagnostics, branch laziness, domain enforcement and non-strict call behavior. Check missing context independently from unknown input values. Cover representative scalar and container families and actual public INSERTs. Keep true datum NULL distinct from a composite whose fields are all NULL: `composite_is_null` currently delegates to `composite_datum_is_null`, while row null tests have separate helpers. Prove these boundaries with native/Rust/Go/TypeScript tests before broadening the guard. Integer hashes are excluded by `nativeHashContext`; do not generalize that observation to byte-sensitive hashes or infer host byte order.

Then continue all unchecked ledger audits: temporal split/Julian/English/escaped input and coercion; partial container structures and raw/SQL-coerced boundaries; overload/common-type/domain binding; session/collation/provider requirements; non-strict callback order and unavailable bodies; stable/volatile invariants; custom-schema/historical/default/projection/polymorphic forms; final global gates. Full `pnpm check-rust:check` and global world/type/surface/coercion/array/historical/non-strict measurements remain incomplete. Clear selectors, compare current fingerprints, and never infer completion from type census/preparation success.

## Process and contracts

All handles are terminal: helper parity `27777`, initial composition `34193`, corrected composition `55995`, world `83505`, regeneration `70652`, comparison `39040`, typecheck `14670`, lint `30499`. A host scan found no task test/compiler workers; unrelated MCP watchdogs were left alone. Only `/tmp/pgsid-check-rust-go-cache` and `/tmp/pgsid-codegen-go-cache` remain; preserve them. Poll exact live handles when quiet, never restart to recover output, bound every process, close PGlite in `finally`, and remove task-owned temporary trees after workers exit.

Keep semantics in maintained Rust and generate targets through existing ASTs. Public rows are SQL-coerced: do not reapply input/domain/typmod coercion. Preserve NULL, Unknown, errors, eager constants, argument order, lazy branches and partial facts. Missing implementation is not database context. Never assume catalog OID consistency, even for builtins; capture qualified identities/definitions. Default C collation differs from C/C.UTF-8 character classification; retain explicit non-C facts. Hash byte order and character profiles are declared settings, not host detection. Never invent a transaction clock/date. JSON uses portable logical values and assumes ordinary resources.

Commits along the way are authorized; no push. Use `git -c gc.auto=0 commit --file <message-file>`. No agents or external messages are authorized. Maintain the ledger at checkpoints and before task switches. Read applicable `AGENTS.md` before editing, especially the evaluator, dialect/transpilers and SQL corpus. Use focused affected tests during development and reserve global integration for the final gate.
