# CHECK evaluator continuation handoff

The goal is active following the user’s resume. The prior usage-limit pause is committed as `89c50c11`. The full objective and unchecked family/cross-family/final-integration work remain in `CHECK-EVALUATOR-LEDGER.md`; no scope has been dropped or declared complete.

## Exact stopping point

Repository: `/home/andy/Projects/pgsid-workspace/pgsid`, branch `main`. Inspect `git status --short` and `git log` first. This handoff accompanies the temporal calendar-error checkpoint; earlier semantic commits are `a8a0f022` (native cast-result identities) and `f348ec2e` (JSONPath target character profiles). No subsequent semantic audit has been edited.

The temporal slice fixes premature Unknown for malformed complete ISO date-only and zoneless datetime input cast to timestamptz. It preserves definite calendar/clock errors, then defers when a valid instant still needs an unavailable timezone. Do not move instant-range validation ahead of offset resolution: native `294277-01-01` fails in UTC and succeeds under `Etc/GMT-15`.

Maintained implementation is in `crates/check-evaluator/src/timestamp.rs` and `timestamptz.rs`. The private calendar helper accepts `missing_timezone`; fields validate before deferral and instant-range checks follow it. Existing explicit-offset/timestamp construction callers pass false. No AST/transpiler change or WASM rebuild was needed. The ignored source mirror `src/codegen/go/assets/check-rust-sources.json` matches maintained sources. Keep it stable while tests read it; its build recipe is `scripts/build-check-rust-wasm.sh`.

Executing owners are `tests/sql-semantics/check-temporal-cast-context.test.ts` (new calendar/clock error test), `check-temporal-input-forms.ts` beside it (handled malformed forms), and `tests/unit/query/worlds/024_temporal_ingestion/check-seed.sql` (reached errors and a skipped malformed input). The mixed-target generated runtime snapshots changed in `tests/fixtures/codegen/expected/{typescript/types/schema/public/checks-rust,go/schema/public/checkrust,go/queries/pgsid/pgx/checkrust}/checkruntime/`; regenerate through the producer, never edit them by hand.

## Evidence and reproduction

Ignored evidence packet: `artifacts/goal-checks/temporal-calendar-active/`. Artifacts are supplementary; maintained owners regenerate evidence if absent.

- `native.json` verifies actual timezone field errors and the offset-sensitive upper-bound example. `parity-quoted.json` passes the focused scalar/domain/array/record/range, source/stored, native/Rust/Go/TypeScript matrix; `observations.json` contains its fixtures. Initial `parity.json` failed on the unquoted reserved constraint name `array`, corrected before the passing run.
- `world-temporal-ingestion.json` and `artifacts/check-worlds/scoped/024_temporal_ingestion/report.json` pass public INSERT parity with no Unknown and matching rejections. Reproduce with `PGSID_CHECK_WORLDS=024_temporal_ingestion timeout --kill-after=5s 440s node node_modules/vitest/vitest.mjs run tests/sql-semantics/check-worlds.test.ts --maxWorkers=1`.
- `cargo.log`, `rustfmt.log`, `typecheck.log`, `lint.log`, `format.log` and `corpus-declarations.log` pass maintained Rust compilation, Rust formatting, TypeScript, affected lint/format and scoped INSERT declarations. Source-mirror byte comparison has no mismatches.
- `parser-regressions-resumed.json` passes both complete affected parser owners. The earlier `parser-regressions.json` never existed because the pause interrupted its run; no pass is credited to that attempt.
- `golden-regenerate.json` and `golden-compare.json` each execute and pass the selected mixed-target byte comparison, including TypeScript checking. Other project variants are deliberately filtered.
- `golden-go-compile.json` failed at the combined owner’s fixed 65-second timeout, without a compiler diagnostic. Its workers are terminal. `golden-go-direct.log` passes the equivalent Go package compilation/tests after separating project generation from compilation. The verified snapshot tree was copied as `generated/` into a copy of `tests/fixtures/codegen/project`, with `go-tests/events` and the admin declaration test copied exactly as in the existing owner. Run `GOCACHE=/tmp/pgsid-codegen-go-cache GOTOOLCHAIN=local timeout --kill-after=5s 120s go test -mod=readonly ./generated/...` there. Do not describe the combined owner as passing.

Focused reproduction commands (run serially):

```sh
timeout --kill-after=5s 480s node node_modules/vitest/vitest.mjs run tests/sql-semantics/check-timestamp-text.test.ts tests/sql-semantics/check-timestamptz-text.test.ts --maxWorkers=1
timeout --kill-after=5s 300s node node_modules/vitest/vitest.mjs run tests/sql-semantics/check-temporal-cast-context.test.ts --maxWorkers=1 -t 'preserves calendar and clock errors'
UPDATE_CODEGEN_GOLDENS=1 timeout --kill-after=5s 95s node node_modules/vitest/vitest.mjs run tests/unit/codegen-goldens.test.ts --maxWorkers=1 -t 'emits the complete generated tree byte-for-byte:.*mixed targets'
timeout --kill-after=5s 95s node node_modules/vitest/vitest.mjs run tests/unit/codegen-goldens.test.ts --maxWorkers=1 -t 'emits the complete generated tree byte-for-byte:.*mixed targets'
```

## Exact next task

Investigate strict NULL preservation behind Unknown in `crates/check-evaluator/src/operations/pg_catalog/integer.rs`: `sql__pg_catalog__int4div__8ogr` checks Unknown before NULL, as does neighboring remainder. The queued example affects operand expressions in `tests/sql-semantics/check-value-metadata.test.ts`: the fixture with unknown divisor currently expects Unknown even when the other operand is NULL. No fix or new proof has been made. Establish PostgreSQL strict-call behavior and distinguish unknown input values from unavailable expressions/errors; retain original argument-error ordering. Inspect neighboring arithmetic helpers before choosing the bounded scope. Add affected native/Rust/Go/TypeScript and public INSERT witnesses, refresh source mirrors, and run only affected owners during development.

After that, preserve every unchecked ledger item: temporal grammar/coercion and partial container facts; overload/common-type/domain binding; session/collation/provider requirements; non-strict callback order and unavailable bodies; stable/volatile invariants; custom-schema/historical/default/projection/polymorphic forms; and final global measurements. Existing type implementations are bounded slices. Full `pnpm check-rust:check` and global world/type/surface/coercion/array/historical/non-strict gates remain incomplete; clear scoped selectors for final integration. Do not infer completion from census/preparation success.

## Process, cleanup and contracts

All checkpoint test handles are terminal: parser `66741`, golden regeneration `79145`, comparison `71980`, combined Go timeout `90156`, standalone Go `64838`. The prior paused parser handle `27771` ended with exit 143. Do not restart terminal jobs merely to recover output. Poll exact live handles when quiet; every probe/test needs an OS timeout and PGlite closure in `finally`.

Clean only task-owned temporary paths after workers finish. Preserve `/tmp/pgsid-check-rust-go-cache` and `/tmp/pgsid-codegen-go-cache`. The direct compilation tree recorded in ignored `golden-go-root.txt` has been removed after its terminal pass. A host worker scan is empty; only the preserved shared caches remain. Recheck live host process state before cleanup or a new long run.

Keep PostgreSQL semantics in maintained Rust, generate Go/TypeScript through existing ASTs, and preserve SQL-coerced public rows without repeating input/domain/typmod enforcement. Preserve NULL, Unknown, errors, eager constants, argument order, lazy branches and recoverable partial facts. Missing implementation is not database context.

Never assume catalog OID consistency, even for builtins. Retain captured qualified identities/definitions. Default C collation and C/C.UTF-8 character classification are separate; explicit non-C choices remain explicit. Target byte order and character profiles are declared facts, not host detection. Never invent a transaction clock/date. JSON uses portable logical values and assumes ordinary execution resources.

Commits along the way are authorized; no push. Use `git -c gc.auto=0 commit --file <message-file>`. No agents or external messages are authorized. Maintain the ledger at checkpoints and before task switches. Read applicable `AGENTS.md` before editing, especially the evaluator, dialect/transpilers and SQL corpus. Use focused affected tests while developing and reserve full integration for the final gate.
