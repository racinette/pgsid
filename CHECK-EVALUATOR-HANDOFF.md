# CHECK evaluator continuation handoff

The user requested stopping and handing off; the goal is paused and incomplete. Resume implementation only after a new explicit request. Work from `/home/andy/Projects/pgsid-workspace/pgsid`, branch `main`; inspect status/log before editing. Latest implementation commit is `2adde0cb` (compact calendar/clock input), preceded by `11b36543` (integer Julian dates) and `61e8c0f6` (JSONB overwrite/deletion). No production or test changes are pending. The broad goal remains incomplete; preserve every unchecked ledger audit and final integration requirement.

## Current temporal checkpoint

Baseline is PostgreSQL **18.6**, PGlite **0.5.9**, server_version_num **180006**. Native probes and source inspection use PostgreSQL 18 (REL_18_STABLE datetime.c); do not use 17. The last implementation turn made verified progress in `2adde0cb`, extending compact calendar/clock grammar. Evidence is in artifacts/goal-checks/temporal-compact-active/. The following turn only gathered ordinal-date evidence before the user requested this handoff.

Maintained src/date.rs accepts a standalone digit run of at least six digits, reserving its last four digits for month/day. Exactly two year digits expand through the fixed 1970–2069 window unless BC was specified; longer year widths keep their numeric year, including leading zeroes. Native atoi year overflow is outside the portable contract and returns Unknown: the native probe demonstrates an oversized year wrapping to a valid 2000 date. In-range int4 years still receive ordinary calendar/range validation. Existing ISO and Julian forms retain their prior paths.

src/timestamp.rs decodes that same compact date prefix before the existing ISO/compact clock paths. Four/six-digit clocks split HHMM/HHMMSS and share the fractional-second nearest-even conversion. PostgreSQL deliberately normalizes these compact components arithmetically: 250000 can carry into tomorrow; 999999 carries several days. Colon-separated clocks retain their earlier field and end-of-day errors. The private calendar conversion now receives compact_clock; only the parser enables it, constructors and all existing calls pass false. Native compact clocks skip ordinary clock validation; numeric offset errors precede calendar validation. Missing timezone still defers after calendar validation; final timestamp range checks apply after carry and fixed offset. Compact carry can recover the lower date boundary from earlier calendar days, so only this path bypasses the former one-day lower precheck. The upper arithmetic guard remains.

Affected owners are check-date-text.test.ts, check-timestamp-text.test.ts, check-timestamptz-text.test.ts and their shared form inventory. They cover binary exactness, date-field orders/session zones, raw casts, source literals, errors, Unknown, lazy branches and public APIs. JSON scalar population adds date/timestamp/timestamptz string/array/object forms and hard/soft errors. The 024_temporal_ingestion world adds named compact input/carry/boundary/error/skip cases. Crate guidance states the native distinction and overflow deferral. No AST or public value representation change is needed.

Native probe handles `64540`, `76235`, `7707` are terminal; observations are native.json, native-clocks.json and native-bounds.json. Initial full-crate compile `24369` passed. The initial parser run `67665` failed target generation because TimestampNumber field assignment is outside the dialect; the implementation now uses scalar locals. parsers-final.json/log handle `52164` is terminal: complete date and timestamptz suites pass; timestamp parity/public owners hit their 120-second limits while corpus/static jobs also ran. No semantic mismatch was reported. A serial rerun of only those two owners passes in timestamp-retry.json/log (handle `32560` terminal). All affected parser owners are now verified. Static checks `26866` and final full-crate compile `32083` pass; the cargo target is removed. Espalier lint/build `2826` passes (explicit node --import tsx preload).

JSON population passes for PGSID_CHECK_JSON_POPULATE_TYPES=date,timestamp,timestamptz (json-populate.json, handle `63967` terminal). Maintained formatting and Rust formatting pass. Temporal-ingestion world passes with PGSID_CHECK_WORLDS=024_temporal_ingestion (world-temporal.json, handle `75288` terminal); its scoped report exercises every constraint, has no Unknown results and matches every native rejection. Affected mixed-target regeneration passes (golden-regenerate.json, handle `78760` terminal); independent comparison passes (golden-compare.json, handle `74191` terminal). Only the expected three runtime snapshots changed and their diffs are reviewed. Checkpoint verification is complete: focused parser/consumer parity, public temporal-world INSERTs, crate/static/format checks, corpus lint/build and affected snapshots pass. All jobs are terminal; finished task trees are cleaned and shared Go caches retained. Final documentation/corpus build checks passed before commit `2adde0cb`. No global integration pass is claimed. Keep expensive owners serial and bounded. A prior golden owner sometimes hit its fixed 65-second limit; use both default and JSON reporters and never treat an uninformative failure as a pass. Update the Rust source mirror only with no semantic job reading it.

## Exact stopping point and next work

Stopped immediately before implementing ordinal dates. No ordinal parser, helper, test owner or test selector has been added. Only a bounded read-only PGlite probe and PostgreSQL 18 source inspection were performed after `2adde0cb`. Probe handle `10895` completed with exit 0 and closed PGlite in finally. There are no live test/probe handles. All task temporary trees are removed; the shared Go cache is retained.

Research is in artifacts/goal-checks/temporal-ordinal-active/{probe.mjs,native.json,probe.log}. native.json records the installed version and results for date/timestamp/timestamptz under MDY, DMY and YMD, with TimeZone=UTC. Artifacts are ignored local evidence, not required files in a fresh clone. The command below reconstructs the key probes if they are absent.

Verified observations to preserve:

- `2000-001`, `2000.060`, `2000/060` and `2000 060` are accepted in the probed date-field orders. `2001-366` becomes 2002-01-01; day 366 is not rejected simply because the year is non-leap.
- `2000-000`, `2000-367`, `2000-01` and `2000-0001` fail with 22007. `2000-367 000000+16` still fails with 22007, before the bad timezone. `0000-366 000000+16` fails with 22009 before zero-year validation. Preserve lexical/field/offset order.
- `0002-366 BC` becomes 0001-01-01 BC, whereas `0001-366 BC` stays 0001-12-31 BC. Era adjustment and the absence of a year zero matter.
- `4714-328 BC` is the minimum input date; `4714-327 BC` fails. Timestamp/timestamptz `4714-324 999999Z BC` carries to 4714-11-24 04:40:39 BC. Date input with that same clock still fails: date ignores compact clock carry. Do not implement date-with-clock by casting a normalized timestamp back to date.
- `5874897-365` is the maximum date; `5874897-366` fails. The wasm oracle accepts `2147483647-001` as date 4453803-12-24, while `2147483648-001` raises 22008. This exposes native intermediate arithmetic; it does not authorize portable signed overflow. Do not reject every large ordinal year prematurely or reproduce wasm wraparound without a justified contract.
- Timestamptz `294276-366 240000+00:00:01` produces the final representable calendar date at 23:59:59 UTC; timestamp rejects the same input because it validates but ignores the offset. Missing timezone remains separate from known calendar errors.

Read PostgreSQL 18 [datetime.c](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/backend/utils/adt/datetime.c): DecodeNumber recognizes an ordinal only when a year is already present and the next field has exactly three digits with value 1–366. ValidateDate adjusts era/year, then calls j2date(date2j(year,1,1)+ordinal-1). date2j uses signed integer intermediates; j2date uses unsigned arithmetic. Signed overflow and defined unsigned wrap must not be conflated. No shared-helper design has been selected or implemented. Investigate these boundaries before changing the calendar conversion.

The likely implementation sites are crates/check-evaluator/src/{date,timestamp,timestamptz}.rs and operations/pg_catalog/json_populate_input.rs. Preserve the existing compact_clock distinction in timestamp_calendar_microseconds. Constructors pass false; only compact text clocks enable arithmetic normalization. Space-separated ordinal input needs its own lexical audit: a long first digit run can instead be a compact date. Do not infer two-digit-year interpretation without the native field-order context.

The intended next test task is a combined focused parity owner covering date/timestamp/timestamptz in one generated harness, with raw/stored plans, native binary reference values, source literals, lexical/calendar errors, Unknown/NULL/original errors and lazy branches. It has not been written. Existing per-type owners lack input-form selectors and compile separate harnesses; prefer focused cases and affected regressions during development, retaining full owners for shared refactors and final integration. Add matching 024_temporal_ingestion INSERT cases and select relevant JSON population profiles. No standalone regex rerun is warranted by a calendar parser change.

After ordinal input, retain split/English/escaped forms, combined Julian timestamp/fraction/clock/zone input, date input with appended clocks, and additional timezone-only/named-zone grammar as open work. These are implementation/precision audits, separate from genuine DateStyle/transaction-clock/catalog requirements. Inspect src/time.rs and JSON-population normalization before sharing grammar. All broader unchecked ledger items and final integration remain open.

Reproduce key research from the repository root (no extension compilation):

```sh
timeout --kill-after=5s 60s node --input-type=module <<'JS'
import { PGlite } from '@electric-sql/pglite';
const pg = await PGlite.create();
const inputs = [
  '2000-001', '2000.060', '2000/060', '2000 060', '2001-366',
  '2000-000', '2000-367', '2000-01', '2000-0001', '001-001',
  '000-001', '00-001', '0001-366 BC', '0002-366 BC',
  '4714-327 BC', '4714-328 BC', '5874897-365', '5874897-366',
  '2147483647-001', '2147483648-001',
  '2000-001 12:34:56.000001Z', '2000.001T123456Z',
  '2000-367 000000+16', '0000-366 000000+16',
  '4714-324 999999Z BC', '294276-366 240000+00:00:01',
];
try {
  console.log((await pg.query('SELECT version()')).rows);
  for (const order of ['MDY', 'DMY', 'YMD']) {
    await pg.exec(`SET DateStyle='ISO,${order}'; SET TimeZone='UTC'`);
    for (const type of ['date', 'timestamp', 'timestamptz']) {
      for (const raw of inputs) {
        try {
          const result = await pg.query(
            `SELECT $1::${type}::text value, encode(${type}_send($1::${type}), 'hex') binary`,
            [raw],
          );
          console.log({ order, type, raw, ...result.rows[0] });
        } catch (error) { console.log({ order, type, raw, error: error.code }); }
      }
    }
  }
} finally { await pg.close(); }
JS
```

## Previous JSONB checkpoint

`61e8c0f6` reconstructs sole-element array replacement through the existing logical builder, discarding the old target bound while enforcing replacement admission. It preserves bounded nonnull deletion results for unknown nonnull keys, including reached nested object keys and scalar traversal no-ops. Full replacements recover exact text/pretty output. artifacts/goal-checks/jsonb-overwrite-active/ records native/Rust/Go/TypeScript consumers/boundaries, affected mutation regressions, lane-allocation INSERTs, static/full-crate checks and mixed-target snapshots. All those jobs are terminal and task temporary trees were cleaned. See that commit's handoff for exact prior failures/handles; no global integration pass is claimed.

`JsonbKnowledge` carries maximum storage/compact-output bound, root kind (-1 unavailable, 5 array, 6 object), and outer container count (-1 unavailable). JsonbValue/JsonbInput/ArrayElement retain these facts. Builders bound safe unknown scalar output and nested growth; object builder arity cannot establish key count because keys repeat. Comparisons use root facts without storage measurement; mutations measure complete values. Unmeasured maximum=-1 cannot be admitted as a partial carrier. Relations preserve empty-array/scalar ordering and duplicate-insensitive containment.

Remaining JSONB precision gaps are general pretty-output depth bounds, object keys/leaf positions, nonempty record population callbacks, conversion roundtrip origin, and deeper partial paths needing child kind/key presence. General partial-container pretty output cannot use the compact/storage bound as an indentation bound. Do not waive fixed format limits as ordinary resource exhaustion or relabel lost precision as database context. Full-known operations already exist. Scalar/array JSONB-to-JSON conversion preserves root nonnullness through jsonb_to_json_context; roundtrips through JSON/text may lose origin/admission facts.

## Prior checkpoints and contracts

`07678f78` verifies array I/O and empty-path text facts in `jsonb-array-io-active/`; `439efc1e` verifies root facts and consumer NULL fixes in `jsonb-consumers-active/`; `05516706` verifies bounded builders in `jsonb-partial-active/`. Each includes its scoped evidence and previous handoff in git. Two old extraction/relation expectations were corrected at `439efc1e`: a known SQL NULL defeats an unknown strict-call operand, making surrounding distinctness comparisons definite. Native witnesses assert that correction.

`adeecad7` preserves declared default-C provenance for scalar text/name/bpchar ordering and validated extrema; explicit non-C choices and character classification remain separate. `b33dce7d` adds shared strict runtime NULL guards, excluding modeled SQL bodies because inlining can expose inner conversions before outer NULL handling. Preserve `FunctionMetadata.sqlBody`, eager constants, original errors and lazy branches. Raw JSON already has its own nonnull carrier. Earlier temporal/native-cast/JSONPath context checkpoints are recorded in the ledger; do not regress binary-compatible captured cast identities or owned locale/timezone/profile facts.

Keep semantics in maintained Rust; target adapters convert inputs and expose validators. Public rows are SQL-coerced: do not repeat input/domain/typmod coercion. Datum NULL differs from all-NULL record fields. Never assume deployment OID consistency, even for builtins; capture qualified identities/definitions. Default C ordering differs from C/C.UTF-8 character classification. Hash byte order and character profiles are declared settings, not host detection. Never invent transaction date/clock. JSON uses logical values and assumes ordinary execution resources; fixed representation limits still apply.

PGlite uses the released dependency. The extension comes from checksummed prebuilt assets through `scripts/fetch-plpgsql-check.sh` and authenticated gh; do not routinely compile PostgreSQL/PGlite/the extension. Fresh checkouts need locked dependencies and the established parser/emitter asset build. Operation-only edits need an updated Rust source mirror, not a blind WASM rebuild. Installed tool CLIs can run directly when pnpm store writes are restricted.

Bound every probe/test with an OS timeout, retain and poll its exact handle, and close PGlite in finally. A sandbox-local process scan cannot prove that a separately managed handle stopped. Never kill unrelated Node/MCP processes. Commits along the way are authorized; use `git -c gc.auto=0 commit --file <message-file>`. No pushes, external messages or subagents are authorized. Read applicable AGENTS rules. Update the ledger and handoff at every checkpoint; keep each below 300 lines.

Use focused affected tests during development. Full `pnpm check-rust:check` and refreshed global world/type/surface/coercion/array/historical/non-strict measurements remain open. Clear selectors and verify report fingerprints at final integration. Historical scoped passes are evidence of their named slices, not a completion claim.
