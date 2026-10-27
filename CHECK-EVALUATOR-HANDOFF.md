# CHECK evaluator continuation handoff

The user paused the goal because of usage limits. The goal tool reports `paused`. Do not resume implementation until the user asks. The full objective and unchecked family/cross-family/final-integration work remain in `CHECK-EVALUATOR-LEDGER.md`; no scope has been dropped or declared complete.

## Exact stopping point

Repository: `/home/andy/Projects/pgsid-workspace/pgsid`. Run commands there. Last semantic commit is `a8a0f022` (native cast-result identities), preceded by `f348ec2e` (JSONPath target character profiles). The next documentation commit records this handoff; it does not include the temporal patch. Inspect `git status --short` and preserve the dirty worktree. A checkout of HEAD alone lacks the patch.

The uncommitted slice fixes premature Unknown results for malformed complete ISO date-only and zoneless datetime input cast to timestamptz. The parser previously deferred before validating fields. It now preserves definite calendar/clock errors, then returns Unknown when a valid instant still needs an unavailable timezone. Do not convert this into a general timestamp range check before resolving the offset: native `294277-01-01` fails in UTC and succeeds under `Etc/GMT-15`.

| Dirty implementation/fixture                                    | Change                                                                                                                                                                                                                                                      |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `crates/check-evaluator/src/timestamp.rs`                       | Adds `missing_timezone` to the private calendar helper; checks fields before deferral and defers before instant-range checks. Date-only and complete clock parsing reach that path. Existing explicit-offset and timestamp construction callers pass false. |
| `crates/check-evaluator/src/timestamptz.rs`                     | Supplies false for existing explicit calendar construction.                                                                                                                                                                                                 |
| `tests/sql-semantics/check-temporal-cast-context.test.ts`       | Adds the test named `preserves calendar and clock errors before unknown timestamptz timezone resolution`: scalar/domain/array/record/range composition, source/stored graphs, multiple native styles/zones, NULL/Unknown/errors and skipped branches.       |
| `tests/sql-semantics/check-temporal-input-forms.ts`             | Adds deterministic malformed date-only/zoneless calendar and clock forms to timestamptz handled inputs. Valid context-dependent forms stay deferred.                                                                                                        |
| `tests/unit/query/worlds/024_temporal_ingestion/check-seed.sql` | Adds reached errors and a skipped malformed-input INSERT.                                                                                                                                                                                                   |

The ignored source asset `src/codegen/go/assets/check-rust-sources.json` was refreshed and byte-checked against maintained files. No AST/transpiler change or WASM rebuild was needed. Keep assets stable while tests read them. Inspect the source-mirror recipe in `scripts/build-check-rust-wasm.sh` if another Rust edit requires refreshing it.

## Authoritative evidence

Ignored evidence packet: `artifacts/goal-checks/temporal-calendar-active/`. It is supplementary; the maintained owners above regenerate evidence if artifacts are absent.

- `native.json`: PostgreSQL field errors across actual timezone settings, including the offset-sensitive upper-bound example.
- `parity-quoted.json`: focused native/Rust/Go/TypeScript matrix passes. Its other tests were deliberately filtered out. `observations.json` holds the native matrix and fixture count.
- `world-temporal-ingestion.json`: public temporal-ingestion world passes. The scoped report at `artifacts/check-worlds/scoped/024_temporal_ingestion/report.json` has no Unknown results and matching local/native rejections. This does not prove other worlds or global completion.
- Maintained Rust compilation (`cargo.log`), Rust formatting (`rustfmt.log`), TypeScript (`typecheck.log`), affected ESLint (`lint.log`), formatting (`format.log`) and scoped Espalier INSERT declarations (`corpus-declarations.log`) completed successfully.
- Initial `parity.json` failed because the new test used the reserved constraint name `array` without quoting it. The test was corrected; the passing report is `parity-quoted.json`.
- `parser-regressions.json` does not exist. Its run was intentionally interrupted on the user's stop request, so no aggregate or individual regression pass is claimed.

## Next actions after an explicit resume

First inspect the existing diff; do not implement the same fix again. Re-run the interrupted affected owners with a fresh report:

```sh
timeout --kill-after=5s 480s node node_modules/vitest/vitest.mjs run tests/sql-semantics/check-timestamp-text.test.ts tests/sql-semantics/check-timestamptz-text.test.ts --maxWorkers=1 --reporter=json --outputFile=artifacts/goal-checks/temporal-calendar-active/parser-regressions-resumed.json
```

The runtime helper occurs in mixed-target golden snapshots. Regeneration and comparison were identified but **not started**, and there is no claimed golden failure/pass for this slice. Generate through the established producer; never hand-edit snapshots. Run expensive golden tests serially because each owner has a fixed internal timeout:

```sh
UPDATE_CODEGEN_GOLDENS=1 timeout --kill-after=5s 95s node node_modules/vitest/vitest.mjs run tests/unit/codegen-goldens.test.ts --maxWorkers=1 -t 'emits the complete generated tree byte-for-byte:.*mixed targets'
timeout --kill-after=5s 95s node node_modules/vitest/vitest.mjs run tests/unit/codegen-goldens.test.ts --maxWorkers=1 -t 'emits the complete generated tree byte-for-byte:.*mixed targets'
```

Observed affected snapshot paths:

- `tests/fixtures/codegen/expected/typescript/types/schema/public/checks-rust/checkruntime/runtime.ts`
- `tests/fixtures/codegen/expected/go/schema/public/checkrust/checkruntime/runtime.go`
- `tests/fixtures/codegen/expected/go/queries/pgsid/pgx/checkrust/checkruntime/runtime.go`

Inspect regenerated diffs, complete relevant compilation/static checks after any change, update the ledger and commit the verified slice if prior authorization still applies. Then continue every unchecked ledger audit. Full CHECK/global measurements are reserved for final integration and remain incomplete; passing preparation/type census/subsets cannot complete the goal.

## Process and cleanup state

The interrupted parser regression was session `27771`, with timeout PID `1911187`. Its verified process tree received SIGTERM, and the exact session returned exit 143. That handle is terminal. Other runs are terminal too; a host `/proc` scan found no remaining task workers. Do not restart anything to recover lost output.

Removed the interrupted `/tmp/pgsid-check-timestamptz-text-yGZhJZ` directory and `/tmp/pgsid-temporal-calendar-cargo`. Only `/tmp/pgsid-check-rust-go-cache` and `/tmp/pgsid-codegen-go-cache` remain; preserve them. Poll exact live handles and inspect authoritative state when future jobs are quiet. Every probe/test needs an OS timeout and PGlite closure in `finally`; do not leave detached workers.

## Contracts to preserve

Keep PostgreSQL semantics in maintained Rust and generate Go/TypeScript through the existing ASTs. Public rows are already SQL-coerced; do not reapply input, domains or typmods. Preserve NULL, Unknown, SQL errors, eager constants, argument error order, lazy branches and recoverable partial facts. Missing implementation is not missing database context.

Never assume catalog OID consistency, even for builtins. Retain captured qualified identities and definitions. Default C collation and C/C.UTF-8 character classification are separate; explicit non-C choices remain explicit. Target hash byte order and character profiles are declared facts, not detected from host APIs. Never invent a transaction clock/date. JSON uses portable logical values and assumes ordinary execution resources.

Commits along the way were authorized; no push. Use `git -c gc.auto=0 commit --file <message-file>`. No agents or external messages are authorized. Use focused affected tests during development and maintain the ledger at checkpoints and before task switches. Read applicable `AGENTS.md` before editing, especially under the evaluator, dialect/transpilers and SQL corpus.
