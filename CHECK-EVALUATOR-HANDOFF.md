# CHECK evaluator continuation handoff

The user explicitly requested a usage-limit stop. The goal is paused, not complete. Do not resume implementation without a new user instruction. This checkpoint preserves unfinished code and a failing regression so another agent can continue at the same point. The full scope, contracts and unchecked audits are in `CHECK-EVALUATOR-LEDGER.md`.

## Exact stopping point

Repository: `/home/andy/Projects/pgsid-workspace/pgsid`, branch `main`. Inspect `git status --short` and `git log` first. Last verified semantic commit: `013e1233` (strict NULLs in integer support/state helpers), preceded by `aa63e04d` (integer arithmetic/comparison NULLs), `bca3322f` (temporal field errors), `a8a0f022` (native cast-result identities), and `f348ec2e` (JSONPath character profiles). The pause commit is deliberately unfinished, not a verified semantic release.

Unverified changes preserved in this checkpoint:

- `src/codegen/shared/check-rust-evaluator.ts`, `emitCall` around line 3147: removes only `node.strictNull &&` from the outer condition. The existing wrapper still resolves operator implementation metadata, requires catalog `implementation.strict`, aggregates operand datum-nullness and skips the body on definite NULL. Folded constants remain excluded. This aims to avoid repeating manual NULL-before-Unknown fixes across every family.
- `tests/sql-semantics/check-strict-call-null.test.ts`: new cross-family source/stored matrix with native known-value queries and INSERTs, declared/absent context, synthetic partial inputs and nested expression validity. It currently fails.
- `tools/check-rust/check.sh`: registers that owner alongside metadata and integer-NULL tests. Consequently the full gate includes the known failure until it is fixed.

No Rust implementation, AST, transpiler, WASM or generated golden was changed in this slice. The ignored Rust source mirror matched maintained files at the preceding checkpoint; do not mutate it while workers read it. Existing `node.strictNull` annotations and constant preparation remain; do not remove them as cleanup before proving behavior.

## Current failure and next investigation

Latest report: `artifacts/goal-checks/strict-call-null-active/parity-collated.json`. The Rust runner passes four fixture chunks and fails one:

```text
declared_row_source 1000: unknown=true false=false null=false true=false error=0
```

The failing fixture is the `row` nested expression: `row_to_json(ROW(t,n)) IS NULL`, with `t` SQL NULL and `n` an unknown integer input. Expected False: the record datum is non-NULL and unknown integer contents should not erase the JSON result's nonnull fact. The preceding all-NULL-fields case passes. The root cause is not established; this may be a pre-existing precision gap exposed by the new owner, not a consequence of the guard. Do not weaken the expectation or classify it as missing database context without evidence. Go/TypeScript execution was not reached because parity stops at the Rust failure; passing other Rust chunks is not an all-target pass.

The next action, after authorization to resume, is inspect these sites and trace the failing fixture:

- `crates/check-evaluator/src/operations/pg_catalog/json_construct.rs`: `row_to_json` entrypoints around lines 362–367 and their record conversion helper.
- Search for `JsonRecordInputPlan`, `json_record_input`, `JsonValue`, `json_is_null` and record finish helpers to locate where known nonnullness becomes Unknown.
- `src/codegen/shared/check-rust-evaluator.ts`: JSON record input emission around line 5731 and the `row_to_json` branch around 6098–6155.
- `src/codegen/shared/check-rust-validity.ts`: `rustScalarOwnCanFail` and `rustExpressionCanFail`; distinguish result-facet loss from possibly failing conversion validity.

The test removes its temporary directory in `finally`, so the failed generated evaluator is no longer on disk. If needed, save `evaluatorSource` into the evidence packet before rerunning rather than leaking the temporary tree. A bounded fix or a separately retained precision-gap owner is still a decision to make; the current checkpoint does not settle it.

Separate unresolved binding observation: the original text-order profile `(a < b) IS NULL` lowers to uncertain even when later `prepareCheckRustGroup` receives `defaultCollation: 'C'`; `portableCheckAtoms` did not recover it. The current profile uses `(a COLLATE "C") < (b COLLATE "C")`, which binds. Preserve this default-collation/provenance question in the audit; explicit C coverage does not prove default C binding works. Earlier `parity.json` and `parity-portable.json` record those setup failures.

## Matrix scope and evidence

Profiles cover Boolean equality, text concatenation and explicit C ordering, float8/numeric addition, JSONB/bytea concatenation, point equality, dynamic enum equality, array length, all-NULL-field record equality, context-sensitive text hashing, and non-strict concat/array_cat. Declared context supplies C, UTF8, little-endian hashes and array NULLs; the second group omits context. Strict profiles cover NULL/Unknown in either position, multiple unknowns, original errors, error order and skipped branches. Known-value native queries and actual INSERT acceptance/rejection establish the ordinary outcomes.

Nested profiles cover padding with division, nullable/NOT NULL domain enforcement, array construction with division, row-to-JSON, and literal-NULL strict calls. Preserve reached division/domain errors, possibly failing unknown operands, constant preparation and branch laziness. Native cannot directly supply evaluator Unknown; partial-input expectations are semantic assertions, not literal native observations.

The packet contains `observations.json`, three parity reports and `typecheck.log`. These ignored artifacts supplement the tracked test; a fresh checkout can reproduce them. `typecheck.log` is an earlier failure from reading a nonexistent `group.checks.identity`. The test now collects `names` at plan creation, but typecheck has NOT been rerun. Do not claim a static pass. All recorded test handles (`77645`, `14493`, `61909`) and typecheck handle (`49058`) are terminal.

Reproduce the current failure after resuming, from the repository root:

```sh
timeout --kill-after=5s 280s node node_modules/vitest/vitest.mjs run tests/sql-semantics/check-strict-call-null.test.ts --maxWorkers=1
timeout --kill-after=5s 180s node node_modules/typescript/bin/tsc --noEmit
```

The owner has a 240-second test timeout. Use installed tools directly; avoid incidental package/store installation. Run expensive owners serially, poll exact session handles, and do not restart quiet jobs. No implementation or semantic tests were run to finish this pause; only checkpoint/document checks and a process scan.

## Verification still required for this slice

After fixing or explicitly separating the row precision issue, complete the new matrix in native/Rust/Go/TypeScript and rerun typecheck and affected lint/format. Preserve all known failure evidence until superseded. Then select the relevant existing boundaries:

```sh
timeout --kill-after=5s 360s node node_modules/vitest/vitest.mjs run tests/sql-semantics/check-constant-null.test.ts tests/sql-semantics/check-xml-xpath-preparation.test.ts tests/sql-semantics/check-row-comparisons.test.ts --maxWorkers=1
```

These cover constant preparation, XML diagnostics and existing strict-null row callers; none was run for the new emitter change yet. Add affected domain/non-strict owners only when findings justify them. Check gate coverage after registering the new test. Run appropriate generated public-world INSERT parity, including text/domain and container/composite coverage; native INSERTs inside the new matrix do not replace generated public APIs.

The shared emitter may affect all golden variants. Regenerate affected trees through the producer, then independently compare; do not hand-edit generated snapshots. Select the `emits the complete generated tree byte-for-byte` owner in `tests/unit/codegen-goldens.test.ts`, setting `UPDATE_CODEGEN_GOLDENS=1` only for regeneration. Allow a bounded outer timeout appropriate to the number of selected variants; each owner has its own limit. No new golden verification or regeneration has run yet. Commit the verified fix only after applicable checks; the pause checkpoint itself remains explicitly unverified.

## Last verified slice and remaining goal

Commit `013e1233` reorders state checks in Rust integer support/bitwise/range/hash helpers: original errors first, definite NULL next, unknown values next. It does not change finite algorithms. `check-integer-functions.test.ts` accepts `PGSID_CHECK_INTEGER_CASES=partial|all`, default all; the integration script clears the selector. Partial state/helper coverage, expanded nested composition, complete package-capacity public world, mixed-target golden regeneration/comparison and affected static checks pass. Complete numeric sampling was last run in `aa63e04d`, not repeated for the unchanged algorithms.

Evidence is `artifacts/goal-checks/integer-helper-null-active/`: `partial.json`, `matrix-partial.json`, `composition-quoted.json`, `composition-observations.json`, `world-package-capacity.json`, `golden-regenerate.json`, `golden-compare.json` and static logs. The initial `composition.json` failed on unquoted reserved constraint name `window`, corrected before the passing run. The new broad emitter work has not superseded this evidence with a complete pass.

Remaining unchecked ledger work includes input/coercion/partial-structure audits; overload/common-type/domain binding; session/collation/provider requirements; non-strict callback order/unavailable bodies; stable/volatile invariants; custom-schema/historical/default/projection/polymorphic forms; and final global gates. Most type-family backends exist, but current work still fixes implementation gaps as well as audits them. No credible completion percentage is established. Full `pnpm check-rust:check` and global world/type/surface/coercion/array/historical/non-strict measurements remain incomplete. Clear selectors and compare current fingerprints at final integration; never infer completion from a census or preparation success.

## Process, cleanup and persistent contracts

The pause-time host scan found no pgsid/PGlite/test/compiler workers. No task processes needed killing. Only `/tmp/pgsid-check-rust-go-cache` and `/tmp/pgsid-codegen-go-cache` remain under the task prefix; preserve both. Unrelated MCP/watchdog and other-project processes were left alone. Bound every probe with an OS timeout, close PGlite in `finally`, and remove task-owned temporary trees after workers exit. Never kill processes merely because they use Node or share the workspace parent.

Keep semantics in maintained Rust and generate targets through existing ASTs. Public rows are SQL-coerced: do not repeat input/domain/typmod coercion. Preserve NULL, Unknown, errors, eager constants, argument order, lazy branches and partial facts. The generic strict guard must use datum NULL, not the row predicate that treats all-NULL fields specially; `composite_is_null` currently delegates to `composite_datum_is_null`. Preserve argument-validity tracking and XML diagnostics when skipping strict bodies. Missing implementation is not database context.

Never assume catalog OID consistency, including builtins; capture qualified identities/definitions. Default C ordering differs from C/C.UTF-8 character classification; retain explicit non-C facts. Hash byte order and character profiles are declared settings, not host detection. Never invent a transaction clock/date. JSON uses portable logical values and assumes ordinary execution resources.

Commits along the way are authorized; no push. Use `git -c gc.auto=0 commit --file <message-file>`. No agents or external messages are authorized. Read applicable `AGENTS.md`, especially evaluator/dialect/transpiler/corpus rules. Update ledger and handoff at checkpoints and before task switches, keeping each below 300 lines. Use focused affected tests while developing; reserve full integration for the final gate. Resume only when the user asks.
