# CHECK evaluator continuation handoff

The goal is paused at the user’s explicit request because usage limits are running low. Stop implementation and audits until the user authorizes resumption. Last implementation commit `b33dce7d` contains cross-family strict NULL handling, raw JSON nonnull facts and SQL-wrapper error ordering with bounded native/Rust/Go/TypeScript evidence. Full goal completion is not claimed. Keep all unchecked audits in `CHECK-EVALUATOR-LEDGER.md` open until individually verified.

## Checkpoint and exact continuation

Work from `/home/andy/Projects/pgsid-workspace/pgsid`, branch `main`. Inspect `git status --short` and `git log` first. Strict-call/JSON checkpoint `b33dce7d` follows unfinished pause commit `c6c87370` and previously verified integer-helper commit `013e1233`. Earlier checkpoints are `aa63e04d` (integer arithmetic NULLs), `bca3322f` (temporal field errors), `a8a0f022` (native cast-result identities), and `f348ec2e` (JSONPath character profiles).

The final XML preparation recheck passed (`xml-preparation-sql-body.json`, terminal handle `79915`). All checkpoint checks are terminal. The inventory's SQL-body classification includes the two-argument XPath wrappers, which is why this owner was rechecked. Commit `b33dce7d` contains the verified slice; no unfinished semantic edit or live worker remains. The following binding investigation is diagnostic-only and has no implementation patch. Resume it only after user authorization.

**Exact stopping point:** a bounded native catalog/lowering probe reproduced the default-C binding gap for both source and stored CHECKs. `a < b`, `(a < b) IS NULL`, `pg_catalog.text_lt(a,b)` and `(a COLLATE "default") < (b COLLATE "default")` are already uncertain after `lowerTableCheck`; `portableCheckAtoms` leaves them uncertain. `(a COLLATE "C") < (b COLLATE "C")` binds. Supplying `{defaultCollation: 'C'}` to `prepareCheckRustGroup` is too late to recover the discarded expression. All groups report supported preparation, which does not prove definite evaluation. No execution-parity fix or wider-default-collation conclusion is established.

The probe completed with exit 0 under a 40-second OS timeout and closed PGlite in `finally`. Local supplementary files are `artifacts/goal-checks/default-c-binding-active/probe.ts` and `probe.json`; they are ignored and may not exist in a fresh checkout. Existing `check-strict-call-null.test.ts` keeps explicit C and passes; do not weaken it to pretend this gap is covered. The older `parity.json` and `parity-portable.json` in the strict-call packet preserve initial failures.

### Next implementation decision, not an implemented solution

- In `src/sql-semantics/collation.ts`, inspect `supportsTextCallableCollation`, `BoundCollation`, `defaultCollation` and `combineCollations`. Default is represented as deterministic with identity default and a default flag. Do not globally change it to C: context can be absent, and default C ordering does not establish C character classification. Consider a catalog-derived ordering-callable classifier using B-tree operators, implementations and comparators, with separately verified selection helpers; avoid ad hoc overload substitution.
- In `src/sql-semantics/catalog-check-binder.ts`, inspect the text-collation rejection sites around lines 1432, 2113 and 4080, plus `callDefaultCollation` around 2157. Ordinary scalar ordering is rejected before preparation, and that helper currently preserves default provenance only for other special families. Admit only the appropriate default-provenance calls and retain their marker. Preserve explicit non-C/conflicting collations and rank native overloads before implementation availability. Check row/minmax/scalar-array paths for manual propagation.
- In `src/codegen/shared/check-rust-evaluator.ts`, inspect text-collation admission around 3865. It does not resolve ordinary scalar `collationDefault` through `executionContext.defaultCollation`; other array/range paths already do. Decide how absent ordering context produces typed Unknown while preserving catalog-strict NULLs, operand errors and lazy branches, instead of throwing away the whole expression. C ordering must not automatically enable lower/upper, ILIKE or Unicode regex classification.
- **First unread follow-up:** inspect `scalarComparisons`, `rustCallCanFail`, `collationDefault` and `supportsTextCallableCollation` in `src/codegen/shared/check-rust-validity.ts`; inspect emitter handling around 3935–4005 and unsupported-group handling in `check-rust-source.ts`. The validity implications of retaining an unresolved ordering call have not yet been established. Also inspect legacy `emitSqlCallable` in `src/sql-semantics/expressions.ts` so new binder admission cannot silently assume C there.
- Required focused evidence for a future fix: source/stored operator and function forms; declared/absent default context; explicit C/non-C/default; NULL/Unknown/error and lazy composition; character-sensitive neighbors remain distinct. Execute native/Rust/Go/TypeScript parity, affected binder/collation owners and a relevant selected public world. Refresh assets/goldens only as affected. No new tests or full suite were run for this diagnostic-only pause.

### Standalone reproduction if ignored artifacts are absent

Save the following as `artifacts/goal-checks/default-c-binding-active/probe.ts` (create that directory), then run `timeout --kill-after=5s 40s node --import tsx artifacts/goal-checks/default-c-binding-active/probe.ts` from the repo root. This diagnoses binding only; it does not execute generated evaluators.

```ts
import { PGlite } from '@electric-sql/pglite'
import { loadModule } from 'libpg-query'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../../scripts/check-measurements/probes.js'
await loadModule()
const pg = await PGlite.create()
try {
  const expressions = {
    direct: 'a<b',
    nullness: '(a<b) IS NULL',
    call: 'pg_catalog.text_lt(a,b)',
    explicit: '(a COLLATE "C")<(b COLLATE "C")',
    explicit_default: '(a COLLATE "default")<(b COLLATE "default")',
  }
  await pg.exec(
    `CREATE TABLE comparison(a text,b text,${Object.entries(expressions)
      .map(([n, s]) => `CONSTRAINT ${n} CHECK(${s})`)
      .join(',')})`,
  )
  const catalog = await snapshotCatalog(pg)
  const table = catalog.tables.find((t) => t.name === 'comparison')!
  for (const c of table.constraints.filter((c) => c.type === 'check')) {
    for (const origin of ['source', 'stored'] as const) {
      const lowered = lowerTableCheck(
        table,
        c,
        catalog.enums,
        catalog.domains,
        origin,
        catalog.rangeTypes,
        catalog.compositeTypeGraph,
        origin === 'source'
          ? `CHECK(${expressions[c.name as keyof typeof expressions]})`
          : undefined,
      )!
      const portable = portableCheckAtoms(lowered.expression)
      const group = prepareCheckRustGroup(
        [
          {
            identity: {
              schema: 'public',
              kind: 'table',
              owner: 'comparison',
              constraint: c.name + '_' + origin,
            },
            expression: portable,
          },
        ],
        { defaultCollation: 'C' },
      )
      console.log(
        c.name,
        origin,
        hasUncertain(lowered.expression),
        hasUncertain(portable),
        group.checks.map((c) => c.kind),
      )
    }
  }
} finally {
  await pg.close()
}
```

Then continue partial JSONB/other-scalar conversion facts and all unchecked ledger audits. Raw JSON nonnull support does not close JSONB, text/context conversion, overload/common-type/domain, provider, historical/default/projection/polymorphic or final-integration work. Most type backends exist, but implementation gaps are still being fixed; no reliable completion percentage is established.

## Implemented behavior and maintained sites

`src/codegen/shared/check-rust-evaluator.ts`, `emitCall`, now guards non-folded catalog-strict calls, including internal row comparator calls. It resolves operator implementations and tests datum NULL. Guarded and ordinary calls share the existing per-call validity classification, retaining expression-specific exceptions. Folded constants skip guard and validity classification. Original operand errors and possibly failing expressions remain visible; lazy later row fields stay skipped. Existing strictNull annotations and constant preparation remain intact.

`src/postgres/builtins/catalog.ts` adds optional `FunctionMetadata.sqlBody`, captured through an actual `pg_language` join without embedding IDs. The inventory producer regenerated the affected `src/postgres/builtins/*.generated.ts` files. SQL bodies bypass the generic runtime NULL guard because native inlining can expose inner conversions first; their maintained Rust implementations retain body order. Literal-NULL folding is unchanged. This is a catalog classification, not a hand-maintained function exception list.

`crates/check-evaluator/src/values.rs` adds `JsonValue::NonNull`, `JsonbInput::ScalarUnknown` and `JsonbInput::JsonNonNull`. Safe unknown numeric/Boolean conversion remains distinct from unavailable or potentially failing conversion. No JSON contents or kind are fabricated. `array_elements.rs` preserves raw JSON nonnullness through array/record carriers and reports its JSON element family.

Under `crates/check-evaluator/src/operations/pg_catalog/`, `json_construct.rs` and `json_convert.rs` preserve raw JSON nonnull output after safe unknown fields and continue to later conversions/errors. Unknown keys and unresolved conversions still defer. Record traversal stops on ordinary Unknown/errors, not the new safe scalar state. `json_core.rs` preserves nonnull JSON-to-text; `jsonb_construct.rs` defers unknown scalar keys instead of reporting an invalid key type. JSONB output still lacks analogous partial facets and remains an explicit remaining audit.

`temporal_scalar.rs` preserves NULL dates and date-to-timestamp range errors before unknown units in the SQL date_part wrapper. Original argument errors remain first. Unknown dates can still hide a range error, so a runtime NULL unit cannot suppress them; literal-NULL preparation is separate.

Owners: `check-strict-call-null.test.ts` covers representative scalar/container strictness, non-strict neighbors, declared/absent context, source/stored forms, native queries/INSERTs, errors/domains/branches, recursive raw JSON nonnullness and later key/division/context failures. `check-row-comparisons.test.ts` now expects definite NULL when an unknown first operand meets a known NULL in ordering, across represented families; later fields remain skipped. `check-temporal-scalars.test.ts` adds direct/contained partial-unit cases. The strict-call owner is registered in `tools/check-rust/check.sh` by the pause commit.

No AST/transpiler/WASM extension was needed. The ignored `src/codegen/go/assets/check-rust-sources.json` matches maintained Rust. Regeneration changed only the mixed-target checks/runtime/operations snapshots under `tests/fixtures/codegen/expected/`; all variants were independently checked. Never hand-edit generated snapshots or rewrite the source mirror while workers read it.

## Passing evidence and reproduction

Packet: `artifacts/goal-checks/strict-call-null-active/`. Ignored artifacts supplement tracked owners; a fresh checkout can reproduce the checks. Run expensive owners serially with OS timeouts and poll exact handles.

- `row-and-strict-guard.json`: complete row-comparison owner and expanded strict-call matrix pass native/Rust/Go/TypeScript. Earlier `parity-json-boundaries.json` and `observations.json` retain the raw JSON/native witnesses. Use `timeout --kill-after=5s 360s node node_modules/vitest/vitest.mjs run tests/sql-semantics/check-row-comparisons.test.ts tests/sql-semantics/check-strict-call-null.test.ts --maxWorkers=1`.
- `constant-null.json`, `record-states.json`, `builder-context.json`, `jsonb-builders.json`, `gate-coverage.json`: complete corresponding affected owners pass. `builder-shapes.json` selects only `check-json-builders.test.ts -t 'builds heterogeneous raw JSON arrays'`; the expensive all-scalar/enum profile is filtered. Do not describe that as a full builder-file pass.
- `general-guard-preparation.json`: complete constant-NULL and XPath preparation pass after the internal-call extension. The final SQL-body metadata recheck also passes in `xml-preparation-sql-body.json`; constant preparation did not change afterward.
- `sql-wrapper-partial.json`: both scoped temporal tests pass native/Rust/Go/TypeScript, including the last partial-input fix. Reproduce with `PGSID_CHECK_TEMPORAL_SCALAR_FUNCTIONS=date_part timeout --kill-after=5s 480s node node_modules/vitest/vitest.mjs run tests/sql-semantics/check-temporal-scalars.test.ts --maxWorkers=1`. This excludes the unrelated epoch callable. `sql-wrapper-parity.json` is the earlier successful wrapper classification run.
- `world-json.json`: complete selected `041_json_documents` public world passes, with exactly its declared missing-context deferrals and matching native/local rejections. `world-records-sql-body.json`: complete selected `044_inspection_records` passes with no Unknown and matching native/local rejections. Reproduce separately with `PGSID_CHECK_WORLDS=<directory> timeout --kill-after=5s 900s node node_modules/vitest/vitest.mjs run tests/sql-semantics/check-worlds.test.ts --maxWorkers=1`. JSON-world evidence precedes the targeted SQL-wrapper correction; record-world evidence precedes only the final partial-input date reorder. Concrete rows are unchanged by those follow-ups, so those passes were reused deliberately.
- `golden-regenerate-all.json` and `golden-compare-all.json`: all emission-tree variants pass regeneration and independent byte comparison, including their generated TypeScript checks. Reproduce with `timeout --kill-after=5s 1200s node node_modules/vitest/vitest.mjs run tests/unit/codegen-goldens.test.ts --maxWorkers=1 -t 'emits the complete generated tree byte-for-byte'`. Set `UPDATE_CODEGEN_GOLDENS=1` only for regeneration. Native-Go golden owners and diagnostics are filtered; public-world Go execution is separate evidence.
- `inventory-check.log`: `timeout --kill-after=5s 90s node --import tsx scripts/generate-builtin-inventory.ts --check` passes against the released PGlite oracle.
- `typecheck-final.log`, `lint-final.log`, `rustfmt-final.log`: final maintained typecheck, affected lint and the changed normally formatted Rust operation files pass. Existing compact-style Rust files were not reformatted wholesale. Maintained formatter, source-mirror equality and `git diff --check` pass. No corpus declarations changed.

## Corrected failures and limits

The original `declared_row_source 1000` failure was `row_to_json(ROW(NULL, unknown_int)) IS NULL` returning Unknown instead of False. Safe scalar conversion knowledge and a nonnull raw JSON carrier fix it. The initial Rust `if let ... else` attempt was outside the dialect and replaced with supported control flow; no dialect change was made.

`row-comparisons.json` initially failed on old Unknown expectations after integer-helper precision improved. The internal-call guard plus corrected NULL expectations supersede it in `row-and-strict-guard.json`.

`world-records.json` exposed `LegacyFieldLargeDateNullUnit/legacy_field_array`: True instead of native 22008. `sql-wrapper-native.json` captures native LANGUAGE SQL/STRICT definition and EXPLAIN for `date_part(text,date)`: its date-to-timestamp cast is inlined before the inner strict call. Dynamic NULL units preserve the cast error; literal NULL units fold to NULL. The SQL-body classification and scoped/native/public tests fix this regression. The old aggregate-count failure was a consequence of that same failed INSERT case.

Combined regression handle `87809` hit its outer 600-second timeout before JSON reporter completion; it is not a passing run. No worker remained, and its orphan temp tree was removed. The replacement runner `23378` used independent reports/timeouts (`affected-results.json`) and finished; its row failure is superseded as above. Avoid repeating the expensive all-scalar builder owner for unchanged scalar algorithms during this bounded audit. The complete owner/full gate remain part of final integration.

## Process and persistent contracts

At this pause, the worktree had no semantic changes after `b33dce7d`; only this handoff and ledger are being committed. The diagnostic probe is terminal. All prior handles, including final XPath `79915`, are terminal. The pause-time process scan showed no task test/compiler workers in the visible process namespace; prior terminal results and cleanup are confirmed. Only `/tmp/pgsid-check-rust-go-cache` and `/tmp/pgsid-codegen-go-cache` remain under the task prefix. Preserve both caches. Bound every probe, close PGlite in `finally`, poll exact handles, and remove task-owned temporary trees only after workers exit. Never kill unrelated Node/MCP processes.

Keep semantics in maintained Rust and generate targets through existing ASTs. Public rows are SQL-coerced; do not reapply input/domain/typmod coercion. Preserve NULL/Unknown/errors, original errors, eager constants, argument order, lazy branches, diagnostics and partial facts. Datum NULL differs from all-NULL record fields. Missing implementation is not database context. Never assume deployment OID consistency, even builtins; capture qualified identities/definitions. Default C ordering differs from character classification; preserve explicit non-C facts. Native hash byte order and character profiles are declared settings, not host detection. Never invent transaction date/clock. JSON uses portable logical values and assumes ordinary resources.

Commits along the way are authorized: `git -c gc.auto=0 commit --file <message-file>`. No push, subagents or external messages. Read applicable AGENTS rules before editing. Keep ledger and handoff current, below 300 lines each. Use focused affected tests during development. Full `pnpm check-rust:check` and global world/type/surface/coercion/array/historical/non-strict measurements remain incomplete; clear selectors and compare current fingerprints at final integration. A census, successful preparation or bounded passes do not complete the goal.
