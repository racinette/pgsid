# Deferred tasks — nullability engine

## What this document is

A register of work on the output-nullability engine that is understood but not
done, so that picking any item up does not require rediscovering why it exists.
Read `docs/nullability-walk.md` for how the engine works.

Each item records what it is, why it is not done, and — where one exists — the
condition that should trigger doing it.

One area is documented elsewhere and not repeated here: how the fixture suite
is made to verify what it claims to verify is in `docs/witness-coverage.md`.

---

## What to do next

**CLOSED — the function overload merge (2026-08-20).** The function side had
no merged candidate set, and that was a LIVE RANK 1: a user function
shadowing a builtin was invisible to the walk, so the curated totality table
answered for a call PostgreSQL ran against the user's body. `length(text)`
ahead of pg_catalog returned NULL for a non-null input while the walk claimed
notNull. The evaluator had the same absence pointing the other way — a
bare-name gate, so an unrelated user `scale(boolean)` stopped `scale(8.41)`
folding.

Fixed by merging path-visible user rows into the scalar pool, eliminating by
argument type and taking consensus over the survivors — the shape the OPERATOR
side has had since 2026-08-09. The evaluator's refusal is now decided by
SURVIVAL rather than by name, with a `noExecution` rule that keeps a surviving
user row from being run during analysis. Threading the declared parameter type
into LANGUAGE sql body scope came with it, and fixed a latent bug on the way:
a body's `$n` was reading the STATEMENT's `paramTypes`.

Design `docs/function-overload-merge.md`; four targets flipped in the landing
commit in `tests/unit/query/overload-merge-red.test.ts`, which also guards the
one priced cost (a BARE literal beside a colliding user name keeps every
candidate — the preferred-type rule is a declared non-goal). It closed six
sqlc register entries: `minerSqlcStronger` 25 → 19.

**THE BUILTIN SURFACE IS CLOSED (2026-08-09). Read this before touching it.**

All 4201 pg_catalog signatures — functions, operators, aggregates, window
functions — are held by execution, witnessed, or pinned with a reason:
claimed 3149, null-witnessed 364, no-null-found 18, raised-everywhere 108,
no-generator 562. The promotion queue that opened this work at 1832 is at 18,
and those eighteen are pinned individually. Nothing on this surface can change
without a suite failing.

**The volatile bucket is SWEPT and the category is GONE (2026-08-21).** It
was the one exclusion left: 276 signatures skipped on `provolatile = 'v'`
rather than claimed or witnessed, so nothing automated could ever propose a
volatile name. Volatility is about repeat calls, not about whether a result
exists — `nextval` is strict, volatile and total, and read nullable until a
borrowed corpus found it by accident. The gate is removed from all three
probes (`cluster-sweep.ts` gained `--volatile` as a cut, and the classifying
suite no longer has a `volatile` category at all), so those rows classify by
execution like every other row.

Where the 276 went: **134 claimed, 29 witnessed, 97 unprobed with grouped
reasons, 12 no-generator, 4 held** — the four are in `WORK_LIST`, each
because its `PG_RETURN_NULL` is live in a state no query can vary
(`current_query`, `pg_database_size` twice, `pg_get_loaded_modules`). The
promotions are one block in `SWEPT_TOTAL_SIGNATURES`. **`random()` reads
notNull again**, which is what the sweep was for: the NAME left
`ALWAYS_NOT_NULL_BUILTINS` because PG17's two-argument overloads are strict,
and signature keying says what the name could not. Its fixture
`@unwitnessable` record is retired.

**The probe database grew, and every addition was a demand.**
`PROBE_OBJECTS_SQL` now supplies an un-called sequence, a held cursor and a
large object exported to a file; `probe-values.ts` gained a regclass naming
a relation that does NOT exist, plus `refcursor` and `oid[]` generators. It
also gained `REFUSED_CALLS` — three sleeps whose generated calls never
return, and `set_config`, whose generated call sets `search_path` for the
rest of the statement.

**Four things the sweep found that were not the sweep.** Each is a defect
that existed before it and would have kept existing:

1. **Three claimed rows were wrong.** `pg_relation_filenode`,
   `pg_relation_filepath` and `pg_relation_is_publishable` answer NULL for a
   regclass whose relation is gone. They were swept when every regclass in
   the corpus named something that existed; the missing-relation value
   falsified all three the same run, and they are out. Five more rows became
   witnesses for the same reason.
2. **`set_config` un-probed 24 enum signatures in silence** — trap 6 below.
3. **Verdicts depended on alphabetical order** — trap 7 below.
4. **A witness rested on chunk arithmetic.**
   `pg_current_xact_id_if_assigned()` is NULL until the transaction writes;
   the probe's own large-object writes decided it, per 2000-expression
   chunk. The classifier now assigns an xid per batch and both spellings are
   witnessed by hand in `tests/unit/functions/`.

**Then the UNPROBED surface was reached (2026-08-21, same day).** 246 rows
had been recorded as "PostgreSQL declined every call the corpus could
build", and for most of them that was a fact about the CORPUS. **Unprobed
went 246 → 123**, 95 rows were promoted and 35 more became witnesses.

Two things did it. The probe database became a SCHEMA — indexes of each
kind, a range- and a hash-partitioned pair, a publication, a serial column,
a collation, a foreign-data wrapper and server, a NON-SUPERUSER role, a
domain, a composite type, replication slots and origins, a prepared
statement and a prepared transaction — and PGlite's `postgresqlconf` option
turned on the four settings whole families refuse without (`wal_level`,
`track_commit_timestamp`, `max_prepared_transactions`, `summarize_wal`).
`createProbeDb()` builds it, and all five creation sites go through it: the
two suites, the sweep, and the two rebuild paths, which had already drifted
once. The corpus grew with it — one cstring literal per type's input syntax,
correctly shaped aggregate accumulators, typmod lists, an OID naming
nothing, an xid with no commit timestamp.

**Ten more standing claims were falsified**, and the first eight are one
finding: `has_*_privilege(name, oid, text)` answers NULL for an object that
does not exist, and every probe that had ever run them asked as the role
PGlite runs as — a SUPERUSER, whose privilege check short-circuits to true
before the object is looked up at all. One `CREATE ROLE` exposed all eight.
The other two are `int8_avg` and `int2int4_sum`, NULL over a zero-count
accumulator, which only a correctly shaped transition state reaches.

**The source audit gained a distinction it needed.** A `PG_RETURN_NULL`
guarded by an `escontext` is the PG16 SOFT-ERROR path, reachable only
through `pg_input_is_valid`; a direct call raises there instead. Seventeen
input functions are in that class and are claimed. The audit's other rule is
unchanged and now has five entries: a null route the source shows but only a
CONCURRENT DROP reaches is held, not claimed.

**Then the rows no SELECT can reach were reached (2026-08-21, same day).**
Fifteen more, by three mechanisms plus one that turned out not to be needed.
**Unprobed went 123 → 108**, four rows became witnesses and eleven reached a
value. `runOutOfBandProbes()` in `probe-values.ts` is all of it:

- **A SECOND PGlite instance** (`createSideProbeDb`), holding neither a
  prepared transaction nor a session origin — the two objects the main
  instance needs for unrelated rows, each of which BLOCKS a family. It answers
  the logical-slot create and its three copy spellings, and the two session
  origin rows.
- **EVENT TRIGGERS.** The verdict for the four `pg_event_trigger_*` rows is
  computed INSIDE a trigger body, by the same `probe()`/`srfprobe()` the batch
  calls, and carried out in a table. One trigger at a time, created and
  dropped around its own firing DDL — a standing `ddl_command_end` trigger
  fires for the next probe's own bookkeeping and logs a verdict about the
  harness.
- **One statement outside `probe()`.** `pg_export_snapshot()` was pinned under
  a group naming the harness, and the pin was right: an EXCEPTION block is a
  subtransaction, and PostgreSQL will not export a snapshot from one.
- **`EXPR_PROBES` needed no mechanism at all.** The `coldeflist` group said "no
  expression can carry a column definition list", which is false: a scalar
  SUBQUERY over that FROM clause is an ordinary expression. `(SELECT s.b FROM
  json_to_record('{"a":1}'::json) AS s(a int, b text))` witnesses a NULL, and
  all four json/jsonb record populators are witnessed now — the only group of
  the four that matters to a real query.

**THE GATE LEARNED THE MECHANISMS, so the eleven are decided rather than
deferred: 9 claimed, 2 witnessed.** `totality-probe.test.ts` calls the same
`runOutOfBandProbes()` the classifier does and attributes the verdicts to its
claimed signatures — the two probes share these mechanisms exactly as they
share the corpus. Without that, none of the nine could be claimed: a claim
table entry is a standing promise that the gate re-executes the row every run.

The source audit is what split the eleven, after the probe said all eleven
returned a value. Nine return unconditionally with every other exit an
`ereport(ERROR)` — `PG_RETURN_VOID` for the origin pair, `PG_RETURN_OID` and
`PG_RETURN_INT32` for the table-rewrite pair, `pstrdup` for the snapshot
export, `memset(nulls, 0, sizeof(nulls))` before `heap_form_tuple` for the
slot rows. The other two are set-returning and `event_trigger.c` fills
`nulls[]` on named branches, so both are **witnessed** instead: a GRANT takes
`pg_event_trigger_ddl_commands()` down the `SCT_Grant` branch, which nulls
five columns at once, and `DROP SCHEMA` leaves `pg_event_trigger_dropped_
objects().schema_name` null for an object that has no schema. The probe could
not have told those two from the other nine — a `CREATE TABLE` firing fills
every column — which is the whole reason the second stage exists.

**Tightening the gate was part of the price.** Its coverage assertion read
`mine.length > 0 && evaluated === 0`, so a row with NO combinations reported
nothing — and a REFUSED row contributes none, which is exactly what
`pg_create_logical_replication_slot` is. The claim would have rested on a
mechanism that could break silently. Empty now counts as unevaluated, with its
own message.

**Three pins hold it**, all in `builtin-surface.test.ts`, all asserted in
BOTH directions: `WORK_LIST` (the eighteen, each with why it cannot be
promoted or witnessed), `UNPROBED` (108 rows in thirteen groups, each naming
the measured reason), `NO_GENERATOR` (17 types, each marked REFUSED or
DELIBERATELY SKIPPED). A fourth holds the mechanisms themselves: every
out-of-band key must still reach a result, so a broken instance or a trigger
that stops firing says so instead of quietly returning its rows to the
unprobed list. A signature a future PostgreSQL adds fails one of them until
somebody decides about it.

**The loop, when a pin fails.** Run from `pgsid/`:

    pnpm exec vitest run tests/unit/query/builtin-surface.test.ts      # ~30s
    pnpm exec tsx tests/probe/cluster-sweep.ts --role=oprcode          # convict
    pnpm exec tsx tests/probe/cluster-sweep.ts '^has_' --list-total    # or by name
    pnpm exec tsx tests/probe/cluster-sweep.ts --volatile --list-total # the other cut
    BUILTIN_SURFACE_WORKLIST=docs/builtin-surface-worklist.md \
      pnpm exec vitest run tests/unit/query/builtin-surface.test.ts    # regenerate

A convicted row goes into `SWEPT_TOTAL_SIGNATURES` (machine-swept) or a
curated table (hand-argued); a NULL goes into
`tests/unit/functions/<name>/<slug>.sql` with its `@null` and `@value`
control. The gate is `totality-probe.test.ts`, ~10s, which executes every
claimed row.

**Twelve traps, each paid for once. Do not rediscover them.**

1. **PGlite MATERIALISES a FROM-position function scan.** `SELECT * FROM
   generate_series(1::bigint, 9223372036854775807) LIMIT 100` allocates until
   the process dies — `LIMIT` does not bound it, `statement_timeout` does not
   cancel it, and the WASM backend blocks the event loop so no JS timer can
   fire. It exhausted a developer machine twice. Put a set-returning call in
   the TARGET LIST, where `ProjectSet` is lazy and the same expression
   answers in 2ms (`srfQuery`).
2. **The encoding-conversion family poisons the backend.** Never add an
   encoding name to the `name` or `text` corpus; `convert_to(text, name)`
   fires on it.
3. **Promotion subtracts the witness corpus.** The loop-closer caught
   `current_schema()` twice — convicted by the sweep, witnessed by hand,
   because its NULL route is `search_path` state the sweep cannot reach.
4. **Corpus parity**: any corner value used to convict must join
   `probe-values.ts`, or the standing probe cannot re-find what you found.
5. **Arguments that must be valid together go in `COHERENT_CALLS`**, not
   into a bigger `MAX_COMBOS`. The cap was raised three times for one
   signature before the table existed.
6. **A call that changes SESSION state changes every later probe.** The
   whole surface runs in one statement, so `set_config('search_path',
   'abc', false)` — built from two of the corpus's own text values — hid
   the probe's enum type from 24 signatures, which then read
   probed-in-name-only and PASSED. `REFUSED_CALLS` is where such a call
   goes, with a `COHERENT_CALLS` entry keeping the row probed.
7. **A verdict must not depend on where its name SORTS.** The classifier
   orders by `proname` and the gate's fetch does not, so
   `pg_read_file('abc')` convicted in one and raised in the other —
   `lo_export(0::oid,'abc')` had written that file earlier in the batch,
   and `lo_create(1::oid)` had made the object `lo_open(1::oid,…)` found.
   A row that needs an object gets one from `PROBE_OBJECTS_SQL` or creates
   it inside its own `COHERENT_CALLS` entry.
8. **A call can DESTROY what other rows are probed against.**
   `pg_drop_replication_slot`'s generated combinations delete the probe
   database's own slots, because their names are in the `name` corpus —
   which is what made the slot family probeable in the first place. Four
   rows then failed on a missing object. `REFUSED_CALLS` again, with a
   coherent call that creates a slot of its own to drop.
9. **The two probes must key `COHERENT_CALLS` the same way.** The gate built
   its key from VARIADIC-expanded types and the classifier from declared
   ones, so `pg_restore_relation_stats("any","any")` never matched
   `("any")` and five coherent calls silently did not apply. The gate now
   carries the declared key on the signature.
10. **Two probe objects can interact.** Creating a logical replication slot
   waits for every in-progress transaction to reach a consistent snapshot,
   and the prepared transaction — added so `pg_prepared_xact()` would
   return rows — never finishes. The call hangs forever, uninterruptibly,
   and nothing about either object predicts the other.
11. **A zero-row answer can be a DEAD BACKEND rather than an empty set.**
   Reading a slot through `pgoutput` — the only output plugin in this build —
   does not raise: it takes the backend down, and every statement after it on
   that connection returns zero rows while looking like it succeeded.
   `pg_replication_slots` reads empty, then `pg_current_wal_lsn()` finally
   admits `ERRORDATA_STACK_SIZE exceeded`. It was first read as a clean empty
   set, and because the four readers ran FIRST in the side script, the two
   origin rows after them reported `error` — a verdict about a corpse. In a
   scripted probe, put anything that can kill the connection last, or refuse
   it. These four are refused: pgoutput's options are one corpus value away,
   and reaching them costs the whole run rather than one verdict.
12. **An absolute in a pinned reason is a claim, not a fact.** The
   `coldeflist` group read "no expression can carry a column definition list"
   and stood for months; a scalar subquery over the FROM clause is an
   expression and carries one fine. Four rows, including the two json record
   populators that actually appear in queries. When a pin says *cannot*, that
   is the sentence to re-test — `NO_GENERATOR` cost 102 signatures to the same
   habit.

**What is open on this surface: nothing that any mechanism here reaches.**
Everything a CREATE, a trigger, a second instance or a statement outside
`probe()` can produce is claimed or witnessed. Six groups are gone since the
pins were written: `io-syntax` (one cstring literal per type's input syntax),
`no-such-object` (a foreign-data wrapper, a foreign server, a sequence),
`coldeflist` (a scalar subquery), `event-trigger`, `session-origin` and
`probe-subtransaction`. What remains in `UNPROBED` needs something no session
can produce: a standby, binary-upgrade mode, a second session for a multixact,
a textual output plugin this build does not ship, a pseudo-type value
PostgreSQL refuses outright. Each group says which.

**The QUEUED item is elsewhere**: `docs/catalog-driven-generation.md`,
chartered. STEP 0 DONE, §§9.1–9.4 BUILT (2026-08-08), §5.4's round-trip
guard in the instrument (2026-08-11: `ast-differed` live, 0 in 25,000 after
three classes were made to match), and **ParamRef BUILT (2026-08-11, §9.7)**
— the discovery instrument now places parameters at seventeen sites and
adjudicates the ARGUMENT contract by binding: per-parameter NULL variants,
joint rejection sets bound together, witness accounting, `param-violated`
live at rank 3. It convicted twice on its first run: the MultiAssignRef
attribution gap is FIXED and pinned (`param-multiassign-target.sql`), and
the second conviction produced a decision. **QUEUED NEXT: SUBTREE
EVALUATION** (`docs/subtree-evaluation.md`, chartered 2026-08-11 — grew out
of Mechanism E when the capability turned out to serve both sides of the
contract): closed subtrees evaluate through PostgreSQL, answers enter the
sync engine as data; consumer 1 is the statement map (output claims from
folded guards), consumer 2 is Mechanism E's CHECK grounder
(`docs/argument-nullability.md` keeps that channel's design), the
output-side entailment site is the recorded later. The pre-work is DONE
(2026-08-11): substitution semantics pinned in `param-mechanism.test.ts`
("Mechanism E" section), and the snapshot captures
`pg_constraint.conenforced` as `enforced` (PG18 carries the distinction the
old capture dropped), pinned in `check-constraint-pins.test.ts` with
NOT VALID rejecting a violating new write. The RED SUITE exists and is
green (`subtree-evaluation-red.test.ts`, 2026-08-11): fifteen
oracle-verified `it.fails` targets that flip to plain `it` per consumer —
two of them kernel-directed, awaiting the atom-oracle charter — and seven
boundary guards that must never flip (the bp must-not-claim control, the
NOT ENFORCED no-claim, and the arm-selection overreach guard among them).
**Rollout step 1 — the EVALUATOR CORE — is BUILT (2026-08-11)**:
`src/query/subtree-evaluator.ts`, the `SubtreeEvaluationCatalog` face on
the adapter, three environment captures on the snapshot, pins in
`subtree-evaluator.test.ts` (allowlist census, gates, protocol) and
`param-mechanism.test.ts` (the PostgreSQL facts). The charter's "As built"
section records what building it measured — the immutable-I/O type set
gates everything, casts close on literals only, the function gate is
(name, arity), and three syntactic guards close the unknown-literal
cracks. Nothing flipped, correctly: no consumer is wired. **TYPED
OPERAND TRACKING is BUILT (2026-08-12**, ruled: correctness carries its
own weight, no instrument gate): the survivor-level gate replaced the
name-level one in three batches — the unscoped per-signature volatility
captures (all 3,402 pg_catalog function rows and 799 operator rows,
with cast-function volatility on the implicit-cast edges), the survivor
gate on the catalog face (`closedOperatorTypes` and siblings), the
evaluator's typed pass — and the four red targets flipped in the gate's
commit while the three never-fold guards and every syntactic transition
pin held. The charter's "As built (2026-08-12)" records what building
measured (the five STABLE implicit-cast edges and the coercion-route
check they force, the root-vs-member split, base-kind results, the
lone-exact landing rule) AND the datetime re-measurement the deferral's
trigger asked for: 204 + 77 immutable datetime rows now served with no
settings assumption, a 90 + 27 stable-row residue for the why-stable
table, all six input functions still stable — the settings decision
stays OPEN. The first-wave widenings (domains over safe bases with
CHECKs through the gate, enums, array literals over safe elements) were
NOT taken with the core — recorded in the charter, they ride a later
batch. The rung stays ORTHOGONAL to the
consumer order — it only widens what folds. **The STATEMENT MAP —
rollout step 2 — is BUILT (2026-08-12)**: the walk's entry points are
async with `evaluate` optional beside `paramTypes`, the engine consumes
the map synchronously at exactly two sites (expression dispatch reads
`isNull`; searched-CASE guards prune by boolean truth, a TRUE guard
also rescuing a missing ELSE), its five red targets flipped in the
landing commit with all seven boundary guards green under the live
evaluator, and the witness effect was the surveyed one exactly —
`open_sum` flipped notNull, its `@unwitnessable` retired, nothing else
moved. The fixture and soundness harnesses run map-live; both censuses
run evaluator-off so fixture coverage of the symbolic paths holds. The
charter's consumer-1 "As built" records the shape. **The CHECK GROUNDER —
rollout step 3, Mechanism E — is BUILT (2026-08-12)**:
`src/query/check-grounder.ts`, claims merged into `collectParamFacts` as
data, its seven red targets flipped with the bp and NOT ENFORCED guards
green; as-built record in `docs/argument-nullability.md`. The STANDING
FINDING IS CLOSED, verified with 20,000-query runs at seeds 20260808 and
7: the literal-grounded fingerprint went 6+6 → 0, after the first run
convicted the CASE-shaped sibling constraint (`subscription_check`) and
CASE joined the reduction skeleton the same day (pinned, red-suite
grounder block). What remains is a NEW, thinner standing finding — the
PARAM-SIBLING shape (`($1, $2, 'x')` through the CASE guard;
`('team', $1, $2)` through `$1 <= 1 OR $2 IS NOT NULL`), 2-3 instances
per 20,000 at each seed, one fingerprint per constraint. The charter's
"no false findings in the instrument's variants" sentence was FALSIFIED
by this measurement (correction recorded in the Mechanism E section):
the rank-3 variant keeps the sibling's control value, which witnesses
the raise. Claiming it needs satisfiability reasoning over the sibling's
value space — a soundness argument the mechanism deliberately does not
carry. The DECISION was MADE (2026-08-12): re-scope the variant
adjudication, ruled in docs/subtree-evaluation.md ("Value-conditional
rejections") — the instrument now probes the ALL-NULL corner before
convicting, files corner-passing raises under the EXPECTED bucket
`value-conditional`, and keeps corner-raising ones conservatively.
Measured at both verification seeds: the bucket took 0, and BOTH
residual shapes are conservative keeps (their corners raise through an
already-claimed sibling or the sibling constraint), so the thinner
finding survives the probe by design and STAYS REPORTED; the bucket
count and the charter's revisit trigger govern when to look again.
The probe harness and both fixture-facing suites now run with `evaluate`
live; both censuses stay evaluator-off.
RE-VERIFIED after the atom-oracle demand experiment landed `tri`/`bcorr`
in the pool (2026-08-12, 20,000 × seeds 20260808/7): the experiment
immediately convicted the grounder's CASE-DISCRIMINATOR gap (6+2
instances — a NULLed discriminator routes to the arm the written value
fails), fixed the same day by making a guard's null-implicants
arm-removal implicants in the reduction, pinned with its must-not-claim
control in the red-suite grounder block. After the fix: seed 20260808
finds NOTHING in 20,000; seed 7 finds ONE instance — a MERGE insert arm
whose discriminator claim is value-conditional on a param sibling,
kept conservatively (its all-NULL corner raises through the primary
key) — and the `value-conditional` bucket took its first live instance.
The experiment's demand verdict — 1,225/20,000 queries reach the
tables, 97 carry CASE expressions there, ZERO carry comparison guards —
was then RE-READ (2026-08-12, ruled): the zero exposed the gate's
circularity, not the shapes' irrelevance — the generator cannot emit a
comparison guard by construction, so the distribution can only convict
shapes someone first taught it. The DEMAND DISCIPLINE IS AMENDED:
crafted fixtures convict beside the distribution, under the corpus's
own gates (shape argued real in the fixture header, claims adjudicated,
data states witnessing). Under the amended rule the two adjudicated red
cases already convicted, and **the ATOM-ORACLE RUNGS are BUILT
(2026-08-12)** — all four, purely propositional, no evaluator consulted:
evidence shaping (IS TRUE/IS FALSE), notFALSE harvest, same-token
trichotomy by an exclusivity table wider than the negator relation, and
notTRUE consumed as searched-CASE guard refutation
(`checkConstraintsRefuteGuard`, gated per entry on NULL-extension and
wholesale on DML scopes). Both red cases flipped; the overreach guard
held; conviction fixtures check-guard-trichotomy and
check-guard-arm-selection pin the rungs with witnessed nullable
controls. As-built in the charter's atom-oracle section.
**INTERVAL EXCLUSIVITY over btree strategies is BUILT (2026-08-12)**,
chartered the same day under the AMENDED demand discipline (crafted
fixtures convict beside the generated distribution — the distribution
experiment's zero was a fact about the generator's grammar, not about
demand): notFALSE(`a > 5`) now refutes `a <= 3` from pg_amop strategy
shapes plus evaluated anchor order, EMPTINESS-only conclusions; six red
targets flipped with two same-token controls and seven boundary guards
green; as-built in the charter's interval section. Soundness re-run
MEASURED (20,000 queries, seed 20260808, rung live): 0 findings, 0
instances — one value-conditional routed to its EXPECTED bucket, the
known class. GROUNDED IN THE CORPUS (2026-08-12): seven shape-family
tables (`ivp`/`ivge`/`ivf`/`ivnm`/`ivne`/`ivstx`/`ivdt`) with
boundary-DETERMINISTIC data (row-index rotation, not draws — a rate
could erase the very row a guard witnesses with), seven fixture files:
eleven notNull claims falsifiable against every data state, six
boundary guards witnessed by planted rows (g=5 on the shared closed
point, 5.5 inside (5,6], NaN satisfying `f > 5`), and the collation and
datetime REFUSALS held as `@unwitnessable` records rather than silence.
With random generation past this functionality's reach, the corpus is
its standing adjudication.
**COLLATION IDENTITY is CAPTURED (2026-08-12)** — the last mystery that
was only an uncaptured fact: `collationIsDefault` on the column capture
(attcollation against `pg_catalog."default"`), the IDENTITY arm added
to the comparison gate (default-collated columns transfer every
canonical op — same collation, same semantics; explicit COLLATE keeps
deterministic-equality only), text order anchors now fold where the
column is default-collated. The old refusal record flipped into
`check-interval-text-default.sql` (claim + overlap guard) and the
refusal moved to the COLLATE "C" twin, held by annotation as before.
Verified: suite 51 files / 3,030 + 1 skipped, ~73s; 20,000-query
instrument run with the arm live, 0 findings. Grounding completed after
interrogation (2026-08-12): a DOMAIN's collation flows into
pg_attribute (measured — the capture needs no special case; face pin on
the ctext column), a collation change on either axis surfaces as a
modified column entity (diff test, with the no-change control), and the
equality arm under an explicit collation is pinned both ways — red
suite and `check-interval-collated-equality.sql` (point exclusion
claims via `ne`; the own point stays witnessed-nullable). Suite
3,037 + 1 skipped.
**THE DATETIME DECISION IS MADE (2026-08-12) and its two chartered
rungs are BOTH BUILT (2026-08-16)** (both in docs/subtree-evaluation.md,
each with an "As built" section; entries below record the batches):
1. **PARTITION-BOUND FACTS** ("Partition-bound facts" section): capture
   `relpartbound` via `pg_get_partition_constraintdef`, feed non-default
   range/list bounds to the kernel as validated-CHECK-grade facts on
   DIRECT partition scans. Pays immediately on integer-range partitions
   through the live interval machinery, and its date-partitioned
   fixtures are the second rung's argued-real testing ground. The
   charter lists the pre-work measurements (bound renderings per
   strategy, the IS NOT NULL prefix, NULL routing, ATTACH validation,
   TRUE-vs-notFALSE strength) — measure and pin them FIRST, then the
   red frame, then the build. BUILT (2026-08-16): the snapshot captures
   every partition's bound raw (strategy, isDefault, rendered
   definition; `partitionBound` on the table capture, diff-comparable
   with the DETACH-clears control pinned); the ADAPTER gates — range
   and list, non-default — and parses the rendering through the same
   ALTER-wrapper as CHECK definitions into BOTH scan faces, never the
   enforced list, so the write side and the grounder stay out by
   construction; parent scans are refused structurally (a partitioned
   root renders no bound, so there is no fact to leak). All three red
   targets flipped in the landing commit, all six guards held. Corpus
   grounding same commit: partition-bound-interval (five claims over
   order_events_early, overlap witness id=50 deterministic),
   partition-bound-parent (the leak witnessed nullable via late rows),
   partition-bound-nested (part_2a's ancestor conjunction claims;
   its generator now rotates [120, 100, 149] by row index so the
   overlap witness exists in every state). The fixture schema has no
   list/hash/DEFAULT partitions, so those shapes stay red-suite-held.
   Suite 51 files / 3,071 + 1 skipped, ~72s. VERIFIED (2026-08-16,
   20,000-query discovery runs, rung live): seed 20260808 — 0 findings,
   0 instances; seed 7 — exactly the recorded standing state and
   nothing else (the one param-sibling MERGE instance through
   bcorr_check, kept conservatively by design, plus the
   value-conditional bucket's 1 EXPECTED instance). The rung introduced
   zero new findings at both seeds.
   PRE-WORK MEASURED AND PINNED (2026-08-16,
   nine pins, param-mechanism.test.ts "Partition bounds" section): range
   bounds carry EVERY key column's IS NOT NULL (the notNull claim is
   confirmed free); list bounds render `= ANY` with the prefix, or an
   IS NULL disjunct when NULL is listed (single value collapses to bare
   `=` — the parser takes both); DEFAULT renders the negated sibling
   union and hash renders `satisfies_hash_partition` over a
   database-local OID (both refusals structural); a nested leaf renders
   its whole ancestor conjunction, roots/detached render NULL; ATTACH
   validates every row; and the bound holds TRUE per stored row, not
   notFALSE — the rendered shapes are total, so range facts enter at
   TRUE strength. RED FRAME WRITTEN (2026-08-16, red suite "partition
   bounds" block): three targets — the interval refutation and the
   range/list key notNull, each verified reachable through the EXISTING
   CHECK machinery by running the rendered bound as a plain CHECK body,
   so feeding is the whole build — and six guards (parent leak, DEFAULT,
   NULL-listing list, hash, overlap exactness, write-side scope). List
   point exclusion is NOT a target: the subset rule draws no such
   conclusion from a CHECK today, and the rung adds no machinery.
2. **DESIGN B — settings-independent datetime literals** ("Settings-
   independent datetime literals" section): the value-SHAPE gate over
   ISO spellings, invariance pinned by an EXHAUSTIVE DateStyle sweep,
   input side only, `'now'` dying by shape. Its acceptance flips the
   `ivdt`/`dtc` refusal records. PRE-WORK MEASURED AND PINNED
   (2026-08-16, four pins beside the partition-bound section): every
   admitted shape — strict ISO date/timestamp with T-separator,
   fraction, omitted-seconds, surrounding-spaces, hour-24 and padded-
   low-year edges, timestamptz with explicit numeric offset — parses
   to the SAME value under all 12 DateStyle settings (values compared
   via make_date/make_timestamp so rendering cannot confound);
   '1/2/2020' answers THREE ways (Jan 2 / Feb 1 / out-of-range);
   two-digit-leading years are order-dependent, so the shape test
   requires a 4-digit year; offset-less timestamptz moves with
   TimeZone while the explicit offset pins the instant. Non-padded
   '2020-1-2' measured invariant and recorded for a future widening;
   the first-wave regex stays padded-strict. BUILT (2026-08-16): three
   regexes in the evaluator's TypeCast arm behind a new narrow face
   (`closedDatetimeCastTarget` — family + rendering, alias-normalized,
   user-shadowing disqualifies), consulted only after the immutable-I/O
   gate refuses; string literals only, typmods and NULL literals
   refused; one gate site covers folds, groundings and anchors alike;
   the rendering gate untouched, so no datetime ever collects as a
   root. Acceptance as chartered plus one: the dtc anchor guard AND the
   entailment dt guard flipped (same refusal, two channels), each
   keeping an ambiguous-form '1/2/2020' control beside it;
   check-interval-datetime.sql carries ivdt's flipped record with the
   ambiguous refusal WITNESSED by the generator's 2020-01-02 row
   (stronger than annotation; the collation twin's annotation stays);
   partition-bound-datetime.sql over the NEW date-range daily_metrics
   family is the composed ground — the bound renders ISO-shaped ::date
   anchors, the shape gate admits them, date anchors order on a direct
   partition scan, and `day` (deliberately not declared NOT NULL)
   carries the bound's own notNull claim in the corpus. Suite 51 files
   / 3,086 + 1 skipped, ~72s. VERIFIED (2026-08-16, 20,000-query
   discovery runs, gate live): seed 20260808 — 0 findings, the
   value-conditional bucket's 1 EXPECTED instance (the known class);
   seed 7 — exactly the recorded standing state (the param-sibling
   MERGE instance, same query q2575, kept conservatively by design,
   plus 1 value-conditional EXPECTED). Zero new findings at both seeds.
DESIGN C — the full settings contract — is CLOSED by ruling, not
deferred (the charter records why: unverifiable trust model, curated
lists, silent breakage); the general session-settings rule is stated
there too (explicit caller input where unavoidable, refusal where
avoidable).
**THE REMAINING ENGINE GAPS WERE TRIAGED (2026-08-16, every example
adjudicated live), FOUR RUNGS WERE CHARTERED in
docs/subtree-evaluation.md, and ALL FOUR ARE BUILT AND VERIFIED
(2026-08-16, one session — each rung's own 20,000-query runs at both
seeds, zero new findings anywhere)**:
1. WRITE-SIDE PARTITION BOUNDS ("Write-side rung" in the
   partition-bound section) — feed the gated bounds to the grounder on
   direct-partition DML; the scope guard flips. Pre-work: UPDATE,
   MERGE and ON CONFLICT enforcement measurements (the INSERT case is
   already pinned). BUILT 2026-08-16, "As built" in the charter. The
   pre-work answered uniformly (five pins, param-mechanism "Write-side
   enforcement"): UPDATE, MERGE arms and ON CONFLICT all enforce the
   bound on a direct-named partition's new row, per row on multi-row
   VALUES; the parent row-moves instead of raising, and an
   intermediate's own bound gates before routing. The build is one
   line — the gated bound joins the ENFORCED list — and the scope
   guard flipped into four write-side targets (INSERT, UPDATE, list
   prefix, hash-nested range) with the parent-naming control and
   NULL-listing/DEFAULT/hash guards beside them. No corpus fixtures:
   the param-side fixture suites run evaluator-off by design, the
   Mechanism E pattern. Suite 51 files / 3,099 + 1 skipped, ~73s (the
   3,086 recorded below was a miscount; the pre-rung baseline measured
   3,087). VERIFIED (2026-08-16, 20,000-query discovery runs, feed
   live): seed 20260808 — 0 findings, value-conditional 1 EXPECTED
   (the known class); seed 7 — exactly the recorded standing state
   (the param-sibling MERGE instance, same query q2575, kept
   conservatively by design, plus 1 value-conditional EXPECTED). Zero
   new findings at both seeds.
2. LIST MEMBERSHIP EXCLUSION ("List membership exclusion" section) —
   an OR-fact refutes a guard when every disjunct does; pays for CHECK
   IN-lists and list partition bounds through the same code. BUILT
   2026-08-16, "As built" in the charter. The charter's premise needed
   one correction: the harvest made OR-facts from TRUE evidence only,
   so CHECK-spine disjuncts now join a notFALSE OR-fact list consumed
   solely by the new conclusion (the subset rule keeps TRUE), and
   `scanLitComparisons` now emits the IN/`= ANY` element questions the
   arms ask. Three red targets flipped, three guards held; corpus:
   check-membership-exclusion.sql over guest's own IN-list, the new
   courier_jobs list family grounding partition-bound-list.sql and the
   NULL-listing claims-nothing twin (refusal by @unwitnessable
   annotation). Suite 51 files / 3,120 + 1 skipped, ~70s. VERIFIED
   (2026-08-16, 20,000-query discovery runs, rung live): seed 20260808
   — 0 findings, value-conditional 1 EXPECTED; seed 7 — the recorded
   standing state only (the q2575 param-sibling MERGE instance plus 1
   value-conditional EXPECTED). Zero new findings at both seeds.
3. NON-PADDED DATETIME WIDENING ("Non-padded widening" in design B) —
   `\d{1,2}` month/day; the invariance pin already exists; two-digit
   years stay refused. BUILT 2026-08-16, "As built" in the charter:
   one DATE_BODY edit, sweep pins per widened family with the mixed
   paddings the regex language admits (all measured invariant before
   the edit), and check-interval-datetime.sql's non-padded '2019-6-1'
   anchor ordering against the padded CHECK anchor. Suite unchanged at
   3,120 + 1 skipped. VERIFIED (2026-08-16, 20,000-query discovery
   runs, widened gate live): seed 20260808 — 0 findings,
   value-conditional 1 EXPECTED; seed 7 — the recorded standing state
   only (q2575 plus 1 value-conditional EXPECTED). Zero new findings
   at both seeds.
4. CLOSED SUBLINKS ("Closed sublinks" section) — non-contextual
   bodies evaluate; target-list-SRF bodies behind the runtime
   cardinality pre-probe (cap 1000, recorded; measured 0ms over a
   10^10 series); FROM-position SRF bodies refused by name (trap 1);
   correlated bodies refused forever (the no-query-context wall).
   BUILT 2026-08-16, "As built" in the charter. The pre-work widened
   the answer: EXISTS needs no pre-probe (first row answers, pinned at
   10^10) and the EXPR multi-row raise is itself lazy, so no admitted
   shape can exhaust. The build: typeSetVerdict learned SubLink over a
   bare-projection body gate (every other clause refuses by
   unknown-field default, FROM of any kind included), tier 2 through
   the new face member closedSetFunctionTypes (the set-returning twin
   over the SAME capture — no new capture) and the runtime pre-probe
   in evaluateClosedSubtrees; consumers unchanged, the same map
   identity. Census reclassified SubLink closed; the old
   (SELECT 7)-stays-open pin flipped to the correlated form. Three red
   targets flipped against a stashed-build red run; correlated,
   FROM-position and over-cap guards green, each with a witnessed NULL
   a claim would reject. Corpus: closed-sublink.sql over
   order_events_early, all three tiers beside both refusals. Suite 51
   files / 3,141 + 1 skipped, ~72s. VERIFIED (2026-08-16,
   20,000-query discovery runs, rung live): seed 20260808 — 0
   findings, value-conditional 1 EXPECTED; seed 7 — the recorded
   standing state only (q2575 plus 1 value-conditional EXPECTED). Zero
   new findings at both seeds.
ALSO RULED (2026-08-16): the PARAM-SIBLING standing finding is CLOSED
— the value-conditional ruling's vocabulary trigger is retired, since
no mainstream type system renders a value-range discriminant
(TypeScript has neither numeric-range nor negation types); the shape
is documented behavior, the instrument keeps reporting instances, and
the BUCKET COUNT is the only revisit trigger. NOT queued, deliberately:
the instrument-reach items (CurrentOfExpr and §9.6's DDL nodes, the 57
io-syntax and 9 no-such-object builtin rows) — no claim is wrong
anywhere in them; they stay recorded where they are.
**A SECOND WAVE OF FOUR RUNGS WAS CHARTERED (2026-08-16, from the
post-landing review — every example adjudicated live against engine
and oracle before chartering), queued in this order, small first:**
1. GUARD-SIDE IN ("Guard-side IN" in docs/subtree-evaluation.md's
   list-membership section) — a multi-element IN guard desugars
   through disjunctArms so the IN and OR spellings reach the same
   refutation; NOT IN must not ride; a NULL in the guard's list
   refuses the desugar. BUILT 2026-08-16, "As built" in the charter.
   The charter needed no correction: the leaf case tries
   `disjunctArms` after its atom pass, and all three guards are that
   helper's EXISTING refusals rather than new gates. Pre-work (four
   pins, param-mechanism "Guard-side IN"): both equivalences hold over
   the whole three-valued grid, `'a' NOT IN ('q','r')` is TRUE (so an
   unsound refutation would fire on every conforming row), and a NULL
   element makes a non-member's membership UNKNOWN — the refused shape
   costs no witnessable claim. Three red targets flipped (the CHECK
   table, its `= ANY` spelling, the list-partition twin) with the NOT
   IN, member and NULL-element guards green; corpus:
   check-membership-exclusion.sql and partition-bound-list.sql each
   gained the IN-spelled claim and a NOT IN control witnessed in every
   data state. Suite 51 files / 3,149 + 1 skipped, ~73s. VERIFIED
   (2026-08-16, 20,000-query discovery runs, rung live): seed 20260808
   — 0 findings, value-conditional 1 EXPECTED; seed 7 — the recorded
   standing state only (the q2575 param-sibling MERGE instance plus 1
   value-conditional EXPECTED). Zero new findings at both seeds.
2. WITNESS CLASSIFICATION ("Witness classification for
   constraint-shaped raises", docs/argument-nullability.md) — the two
   constraint-violation messages count as notNull witnesses only
   beside a succeeded all-valid control; NULL_REJECTION itself stays
   pure; grounder and write-side bound claims become
   corpus-witnessable, and their missing param fixtures land as the
   rung's acceptance. BUILT 2026-08-16, "As built" in the charter.
   `CONSTRAINT_REJECTION` sits beside `NULL_REJECTION` in
   fixture-args.ts, unmerged; param-soundness checks the control PER
   STATE (and asserts the constraint-witnessed states are a subset of
   the states whose control passed — the guard), the probe harness has
   it structurally (its all-valid run returns before any variant when
   it raised). Pre-work (two pins, param-mechanism "Witness
   classification"): the identical message arrives whether the NULL
   caused the rejection or another value in the row did, for both the
   CHECK and the bound — which is why the control cannot be skipped.
   A SECOND blocker the charter had not named turned up while
   building: param-nullability inferred evaluator-OFF, and with no
   evaluator the grounder claims nothing at all, so it now infers with
   `evaluate` live like the output-side fixture harnesses — measured
   first, evaluator-on and evaluator-off agree on every claim and
   every rejection set over the 42 parameterized fixtures that existed
   then. Acceptance: param-check-grounded.sql and
   param-partition-bound-write.sql, both red on the witness bar before
   the rung, both witnessed through the new class after it; the
   separation from NULL_REJECTION is pinned both ways beside the
   derived-message tie in builtin-null-rejection.test.ts. Suite 51
   files / 3,162 + 1 skipped, ~74s. VERIFIED (2026-08-16,
   20,000-query discovery runs): the chartered delta exactly — seed
   20260808's 10 raised-outside-the-list entries and seed 7's 6 both
   went to ZERO, moving into witnessed, with unwitnessed unchanged at
   20260808; findings unchanged (seed 20260808 — 0 findings,
   value-conditional 1 EXPECTED; seed 7 — the q2575 param-sibling
   MERGE instance plus 1 value-conditional EXPECTED). Noted while
   diffing runs: agreed-rows/agreed-norows drift by a few dozen
   between identical invocations, because the generator's TABLESAMPLE
   carries no REPEATABLE clause — the row counts are not reproducible
   and never were; the buckets that matter are.
3. ALWAYS-RAISES ("The always-raises statement fact",
   docs/argument-nullability.md) — the grounder's empty implicant
   surfaces as `QueryContract.alwaysRaises` for unconditionally
   written rows only (VALUES rows, FROM-less INSERT ... SELECT);
   pre-work: ON CONFLICT DO NOTHING's CHECK-before-arbiter timing;
   the fixture suites' control expectation inverts under an
   `@always-raises` annotation. BUILT 2026-08-16, "As built" in the
   charter. Universality is decided where WRITES are collected, not
   where implicants are: `Write`/`GroundedCheck` carry a `universal`
   flag and only an empty implicant off a universal check sets the
   fact; claims are untouched, and the rewrite gate needed no work
   (a hooked table produces no Write at all). Pre-work (two pins,
   param-mechanism): ON CONFLICT checks the proposed row BEFORE the
   arbiter — DO NOTHING does not rescue a violating row, while a
   conflicting VALID row is skipped — so OC-carrying inserts stay
   universal; and UPDATE, MERGE arms, the OC update arm and the
   sourced INSERT ... SELECT all succeed over an empty match. The
   absorption path read as expected (`[]` sorts first in
   `minimizeImplicants` and its superset test swallows the rest; the
   length-1/length-≥2 filters are where the fact was dropped). Three
   red targets flipped, four guards green — the BEFORE ROW trigger
   one oracle-adjudicated, since the trigger rewrites the row into
   validity and PostgreSQL accepts it under every binding. TWO suites
   inverted, not one: param-soundness's control must now RAISE and be
   seen to, and nullability-soundness determines a fixture's output
   shape by EXECUTING it — which an unconditional write cannot
   survive — so under the flag that failure is the expected
   observation and the fixture must claim no output columns. Corpus:
   param-always-raises.sql. The instrument adjudicates it in its own
   bucket, `always-raises-violated` (DECIDED 2026-08-16 with the
   user: the existing violation lists are column- and
   parameter-shaped and would have named a statement-level claim
   wrongly), fingerprinted on the write shape, costing no execution —
   the control run already runs the statement. Wiring verified by
   forcing the flag on: the bucket classifies, fingerprints per DML
   shape and reports. Suite 51 files / 3,177 + 1 skipped, ~74s.
   VERIFIED (2026-08-16, 20,000-query discovery runs): zero
   always-raises-violated instances at both seeds; seed 20260808 — 0
   findings, value-conditional 1 EXPECTED; seed 7 — the q2575
   param-sibling MERGE instance plus 1 value-conditional EXPECTED.
4. THREE OF ITS FOUR CLAUSES ARE BUILT (2026-08-16), each its own
   batch with its own pre-work, red frame, corpus line and pair of
   20,000-query runs — the charter's one-at-a-time rule taken
   literally. SET OPERATIONS: all three operations type their result
   exactly as COALESCE does (measured over seven operand pairs), the
   arms arrive UNWRAPPED in `larg`/`rarg` (pinned — a release that
   wrapped them would silently refuse every set operation), four
   targets flipped, correlated-arm and table-in-one-arm guards green.
   LIMIT/OFFSET: the pre-work's own question answered NO — the runtime
   pre-probe already bounds a LIMITed SRF body, so a static rule would
   be a second mechanism — and bought two refusals instead, one of
   them found while building: OFFSET on an SRF body (the probe walks
   every skipped row, linear, measured), and LIMIT or OFFSET on a SET
   OPERATION, because the row a limit takes from a deduplicating body
   is a PLANNER choice — the same body answers 42 under HashAggregate
   and 3 under Sort+Unique (measured, pinned, with its own red-suite
   guard). VALUES: the pre-work came back clean and made the gate
   smaller — set-returning calls are forbidden there, so the pre-probe
   question does not arise. Suite 51 files / 3,199 + 1 skipped, ~73s.
   VERIFIED after each clause (20,000-query runs, both seeds): seed
   20260808 — 0 findings, value-conditional 1 EXPECTED; seed 7 — the
   q2575 param-sibling MERGE instance plus 1 value-conditional
   EXPECTED. Zero new findings anywhere.
   THE FOURTH BATCH REPLACED THE CHARTER'S CLAUSE LIST WITH ONE RULE
   (decided 2026-08-16 with the user, BUILT the same day): measuring
   what the gate still refused showed the list was arbitrary and the
   REASONS were not — scope (any FROM, forever), plan freedom (a limit
   slicing a body whose surviving order the planner chose), unbounded
   work (an offset over an SRF). Everything else was refused only
   because nobody had written the clause. The rule: a clause that
   changes WHICH ROWS a body has is admitted, and joins the no-slice
   family unless the row order is structural. WHERE (no FROM), ORDER
   BY and DISTINCT landed together under it; DISTINCT ON and ORDER
   BY ... USING stay refused with their reasons; five targets flipped,
   four guards green, `SortBy` joined the allowlist census. ORDER BY
   BESIDE A LIMIT is the one piece deliberately not taken: it would
   decide the sliced value. Suite 51 files / 3,206 + 1 skipped, ~71s.
   VERIFIED (20,000-query runs, both seeds): seed 20260808 — 0
   findings, value-conditional 1 EXPECTED; seed 7 — the q2575
   param-sibling MERGE instance plus 1 value-conditional EXPECTED.
   ORIGINAL CHARTER: set-operation and LIMIT bodies first,
   one clause at a time, each with its own closure argument; ORDER BY
   refuses collatable sort keys; VALUES bodies need parser/deparser
   pre-work.
   THE FOURTH BATCH LEFT A HOLE AND TWO QUESTIONS; ALL THREE ARE
   SETTLED (2026-08-17). The hole was a SOUNDNESS defect, found by
   reading the gate after the batch: `sortClause` joined
   `SUBLINK_BODY_FIELDS` — the set the unknown-field loop consults —
   while the branch that reads a VALUES body still returned ABOVE the
   gate that inspects sort keys, so `VALUES … ORDER BY <key> LIMIT 1`
   folded with the key never read. `ORDER BY random()` gave a
   different constant on each of ten analyses of ONE statement
   (3 2 2 3 2 7 2 3 5 7); `USING >`, `now()` and a key reading a TABLE
   all folded too. Fixed structurally — the three clause gates and the
   no-slice bar moved above the branch, so no future branch can return
   past them — with the general rule written down in the charter: a
   listed field must have a gate that READS it on every path. Guards
   at the gate (six shapes, plus the unsorted `VALUES … LIMIT 1` fold
   as the over-refusal control), at the contract (both bodies would
   have claimed notNull), and in `closed-sublink.sql` witnessed by
   rows.
   THE QUESTIONS ARE CLOSED, not deferred — charter section
   "Closed for good", with the measurements. GROUP BY: the recorded
   reason ("degenerate without a FROM") is false — GROUPING SETS and
   CUBE return TWO rows from no FROM, HAVING returns none — and the
   true reason is worse for the clause, since it is three admissions
   (`groupClause` sets, CUBE/ROLLUP, `havingClause`) buying nothing,
   the paying shape needing a FROM. WITH: consuming a CTE means
   `SELECT * FROM c` or `SELECT c.x FROM c`, both ColumnRef, so
   admitting it means resolving a NAME — the one line the evaluator is
   defined by. Measured beside it: a CTE inside a sublink reads the
   outer query's columns, so it is a correlation site, not an island.
   NEITHER SHOULD BE RE-OPENED.
   ORDER BY BESIDE A LIMIT IS CLOSED TOO (2026-08-17, decided with the
   user), after two corrections that are both recorded because the
   first was published. The price was written as a per-TYPE
   `pg_type.typcollation` capture; measurement retired that — a closed
   body can carry only `pg_catalog."default"` or, via `name`, `"C"`,
   neither of them session state, which is the argument the entailment
   kernel already ships. But the REAL obstacle is not collation and no
   capture lifts it: `VALUES (1.0),(1.00) ORDER BY column1 LIMIT 1`
   answers 1.0 and the same body written the other way answers 1.00,
   because `1.0 = 1.00` holds under numeric's btree opclass while the
   renderings differ. A sort orders the key's EQUIVALENCE CLASS, not
   the value — so ORDER BY fails the one-rule test's "unless the row
   order is structural" on the rule's own terms, and the rule needs no
   exception. Pinned in param-mechanism ("an ORDER BY orders the KEY's
   class"), numeric and float8 both in the closed 48. Building it
   anyway would be MECHANICAL, not structural — a tie probe as a
   sibling of `srfBodiesWithinCap`, appending the output's rendering to
   the sort keys in both directions and admitting on agreement — but it
   costs one more mechanism and a round trip per sliced body, for
   plain-SRF and VALUES bodies only, against demand every verification
   run measures at zero. Refusing is the sound side; the trade was
   DECLINED. DO NOT RE-OPEN AS CHEAP: the sizing is the reason it was
   declined, not an argument for taking it.
   Suite 51 files / 3,210 + 1 skipped, ~74s. VERIFIED (2026-08-17,
   20,000-query discovery runs): seed 20260808 — 0 findings,
   value-conditional 1 EXPECTED; seed 7 — the q2575 param-sibling
   MERGE instance plus 1 value-conditional EXPECTED. The standing
   state exactly; a narrowing fix could only have moved claims out of
   the corpus, and none moved.
**The FIRST-WAVE WIDENINGS and the OUTPUT-SIDE ENTAILMENT consumer are
BOTH BUILT (2026-08-12)** — every consumer the subtree-evaluation
charter names now exists. Widenings: unique enums and domains fold
(uniqueness by measurement, not the charter's guessed name-consensus —
same-named enums answer oppositely as search_path moves), domains
thread their canonical base with the whole chain's CHECKs gated
recursively, array casts gate per element; as-built in the charter's
first-wave section. Entailment: the kernel's atom oracle consults
pre-evaluated literal comparisons (`comparison-groundings.ts`) —
`SELECT overflow_contact FROM subscription WHERE seats = 5` claims
notNull; its first build was CONVICTED by the collation-gate fixture
and now carries a per-column collation trichotomy (non-collatable: all
ops; deterministic: equality only; nondeterministic: nothing); the
numeric multi-WHEN negative flipped nullable→notNull with its
`@unwitnessable` retired. As-built in the charter's entailment section.
Suite 51 files / 2,963 + 1 skipped, ~74s.
The suite total dropped 3301 → 2879 honestly: builtin-null-rejection's old
import of param-soundness.test.js was re-running its 428 tests in a second
worker, and the shared constants moved to fixture-args.ts. §9's remaining
open nodes are four, none carrying much weight. `docs/generated-surface.md`
is FINISHED — all five of its items are built, item 4's schema axis included
(2026-08-06), and the "four items in cost order" sentence further down this
register predates that and describes the plan rather than the state. Read
the documents' own headers, not this register's older prose, when the two
disagree — that rule has now paid for itself twice: a session opened on the
claim that §9.2 and §9.3 were unbuilt, and both had been committed for three
days.

---

The engine's output analysis is verified as far as hand-written fixtures can
take it. Every fixture returns rows or declares the error it raises instead, and
every `notNull` claim is either falsifiable against returned rows or guarded by
a refusal the suite checks — nothing is verified by nothing, and that is held at
zero. The measurements are in `docs/witness-coverage.md`.

What is left is not more assertions about the queries somebody wrote. It is
finding the defects nobody thought to look for, and then a consumer.

**Next up: the consumer — designed; build it.** The design doc exists:
`docs/consumer-design.md` (2026-08-04) opens with the six product
questions and their answers — native dialect (`-- name:` + `@name`, no
macro namespace; sqlc via the one-shot `migrate-from-sqlc` codemod),
types-then-functions artifact, ordered single-dir schema entries,
refusals-warn/rest-error diagnostics — and sets the slice plan. The build
proceeds slice by slice from that document. The engine item that fell out
of the design — exporting **presence groups** as contract vocabulary
(`outputPresenceGroups`) so optional-join outputs emit as factored
discriminated unions — is BUILT: Wave 13 (2026-08-04, the closure entry in
section 2 below records it and its residues); the design doc keeps the
TS 5.9 narrowing measurements. Architectural ground
already settled (2026-08, discussed over the `src/engine.ts` sketch — do
not re-litigate without new information):

- ONE run path for CLI and language server, held by a PARITY SUITE from
  the first vertical slice (batch output over a project ≡ watch-shell
  steady state after replaying the same edits) — the traced/untraced
  drift lesson at product scale.
- The shared path is a PURE, MEMOIZED derived-value graph (migrations →
  applied schema → snapshot → catalog → per-query contract → artifact);
  events exist only in the shells and terminate at "invalidate key K".
  The CLI is a shell that feeds inputs once and exits — no engine mode,
  no stop-after-ready flag; the single-PoV lock falls out of the driver.
- Invalidation is the EXISTING triangle: any migration change → rebuild
  snapshot → `diffCatalogs` → changed `EntityId`s → recheck queries whose
  `extractDeps` touch them. Per-migration incrementality is NOT a lever
  (schema is a fold over the ordered list); the diff is.
- `src/engine.ts` salvage verdict: keep the event taxonomy, the ready
  barrier, and the coalescing/debounce/retry patterns as the WATCH
  SHELL's vocabulary; retire trackers-that-compute (a tracker acquires
  input, the graph computes); the subscription map becomes the
  EntityId-keyed invalidation index (`DatabaseIdentifier` reinvented
  EntityId — drop it). Wall-clock event ordering → monotonic per-source
  sequence numbers if kept at all.
- Emitted types inherit: rejection sets as factored local unions (flat
  types ∩ one union per set), names from RowDescription, contracts from
  `inferQueryContract` verbatim. LSP comes LAST; the dual-parser
  question stays deliberately deferred
  (`docs/postgres-language-server-notes.md`).

The six pre-implementation questions were answered 2026-08-04;
`docs/consumer-design.md` opens with them and their answers (dialect,
artifact, config, migrations, diagnostics, slices). They are not repeated
here.

Before the build starts, one final engine step: the ADVERSARIAL SWEEP —
`docs/adversarial-sweep.md` is a self-contained handoff for a graybox
attacker that probes every claim kind for unsoundness (find-don't-fix,
diversify by mechanism, synthesize at the end into
`docs/adversarial-findings.md` with root causes and proposed fixes).
It is the "finding the defects nobody thought to look for" line above,
made executable; its findings doc folds back into this register during
the fix phase that follows it.

**The sweep RAN (2026-08-04) and its FIX PHASE is COMPLETE
(2026-08-04/05).** 246 probes, fifteen findings: nine rank-1 `notNull`
unsoundnesses, five rank-2 shape defects (two of which also falsify a
flag), one rank-3 param-contract defect; zero parity breaks and zero
crashes. Eight root causes, each fixed in its own commit in the report's
recommended order — soundness first, cheapest first, the widest-radius
strictness/INITCOND/builtin-totality fix last, dry-run against the
generated corpus before landing. Every quarantine fixture graduated into
`tests/unit/query/fixtures/` with corrected claims and witnesses, the
adversarial DDL folded into the fixture schema, the two new refusal
classes (DO INSTEAD rules, unresolvable relations, `(expr).*` over an
unresolvable composite) pinned in `unsupported-nodes.test.ts`, and the
quarantine directory retired empty. The per-fix closure entries — with
what each measured and what it deliberately costs — are at the top of
section 2; the findings doc stands as the sweep's report with a status
header. What remains from the sweep is one scheduled item: the
arity-and-order gate (section 1, amended — ORDER as well as length,
before the emitter slice), which now blocks nothing and belongs to the
consumer build's first contract-holding slice.

A same-day probe of the fix phase's own surface then found — and closed —
one more rank-1 defect (the write-rewrite hooks read the named relation
while triggers fire on the relation the row lives in; the closure entry
below has it). One probe, one conviction, on the first new mechanism
tried: the fix phase's two days of fresh code deserve the same treatment
the aged engine got. **A second, targeted sweep was chartered
(`docs/adversarial-sweep-2.md`), RAN (2026-08-05), and its FIX PHASE is
COMPLETE (2026-08-05).** ~120 probes, thirteen findings: eight rank-1
`notNull` unsoundnesses, three rank-2 shape defects (all three of which
also falsify a flag), two rank-3 param-contract defects; zero parity
breaks and zero crashes across every probe — moving the refusals into
the shared scope builders did what it was meant to. Nine root causes,
five of them one idea: a fact was moved from "the named relation" to
"the relation SET", or from "the statement" to "the row PostgreSQL
reports", at the sites the fix phase was looking at rather than at every
site that asks the question. All thirteen closed, one commit per fix in
the report's recommended order — soundness first, cheapest first, the
corpus dry-run before the one fix that could flip existing claims. Every
quarantine fixture graduated into `tests/unit/query/fixtures/` with
corrected claims and witnesses, the DDL folded into the fixture schema,
the search-path halves pinned in `search-path.test.ts` (they need a
second catalog the fixture harness cannot build), the composite-star
refusal re-pinned on the shapes that remain unresolvable, and the
quarantine directory retired empty. Witness coverage re-measured at 311
fixtures (`docs/witness-coverage.md`); the findings doc stands as the
sweep's report with a status header; the per-fix closure entries are at
the top of section 2. Two items deliberately left open: search-path
half (b) — WHERE the path comes from is a consumer input and belongs to
the consumer design — and the WIDE reachability question behind finding
9 (`notNull`'s existential claim has no reachability qualifier),
recorded beside the claim semantics in `docs/argument-nullability.md`.
**A THIRD sweep was chartered (`docs/adversarial-sweep-3.md`), RAN
(2026-08-05), and its FIX PHASE is COMPLETE (2026-08-05).** Same argument as sweep 2's, one
generation later: the ten fixes above were the youngest code in the
repository, verified almost entirely through fixtures their own author
wrote in the same session. ~215 probes (~155 of them engine-vs-PGlite
comparisons), **eight findings**, in `docs/adversarial-findings-3.md`:
five statements carrying a wrong `notNull`, four shape defects (three of
which produce that wrong flag), two rank-7; zero parity breaks and zero
crashes — three sweeps at zero. Both suspects the charter named by name
landed: `BUILTIN_SRF_NAMES` failed as a hand-curated table exactly the
way `ALWAYS_NOT_NULL` had (a missing name disables the padding rule for
the WHOLE target list, so a KNOWN call keeps a claim PostgreSQL pads
away), and section A's untouched rest produced the widest defect —
**pg_catalog is searched implicitly and FIRST**, so the engine's rule
that "a user function of the same name always wins" is backwards, and
the search-path candidate set is still short by one schema.

All eight are CLOSED, in the report's recommended order, with two
deviations recorded in the findings doc's status header and in the closure
entries at the top of section 2: fix 5 asks the catalog for the `unnest`
element type everywhere the catalog can answer BEFORE refusing (the
sketch's residue would have refused every scalar array whose type the walk
could not see, which is the common case protecting the rare one), and fix 1
took the preferable half of its (b) — `proretset` in `FunctionInfo`, the
rendered-string test gone. The quarantine directory is retired: every
fixture graduated into `tests/unit/query/fixtures/` with corrected claims
and witnesses, the DDL folded into the fixture schema, the pg_catalog
precedence pinned in `search-path.test.ts` (it needs a second catalog the
fixture harness cannot build), and the new `unnest` refusal class pinned in
`unsupported-nodes.test.ts` WITH its positive control, so it can never
quietly become blanket. Three new environment facts joined
`builtinStrictFunctions` — `builtinSetReturningFunctions`,
`builtinFunctionNames`, `builtinPolymorphicFunctions` — each replacing a
question the engine was answering from a smaller universe than it ranged
over. Suite: 2216 tests, 327 fixtures; the generated corpus's 8980 queries
moved by nothing.

Its stop condition fired. The yield is 8 in ~155 against sweep 2's 13 in
~120, three of the eight are in code that predates both sweeps, and the
four sections the fix phase had rewritten most heavily (grouping sets,
the partitioned hook, diff completeness, parity) came back clean across
55 probes. The report's reading, recorded here because it decides what
happens after the fix phase: **stop chartering sweeps against code age.**
What produced findings was three older heuristics the register already
trusts — sweep every hand-curated table against the catalog it
approximates; compare ORDERED NAMES, never arity; ask whether a
resolver's universe matches PostgreSQL's. The first is a scheduled item,
not a sweep. The second is the arity-and-order gate in section 1, which
now carries TWELVE defects across three sweeps that it would have
caught, and belongs in the consumer build's first commit. The third is a
checklist item for the next mechanism anyone adds.

**Chartered, step 0 done: closing the recorded imprecisions** —
`docs/imprecision-closure.md` (2026-08-05, audited 2026-08-06). The suite
records 100 `@unwitnessable` reasons across 336 fixtures; the doc now
classifies every one of them exactly. **The audit of the REASONS ran
first, and earned its place**: ten were wrong or misleading, and they
clustered where the classification depended on them — five of the six
claims labelled a data gap were not gaps at all but filters in the
fixture's own query, and two claims nobody had labelled are. One claim's
reason had already been corrected once and was wrong the second time too.
Each correction is measured against PGlite and recorded on the fixture;
`parseFixtureDirectives` now records a reason's continuation lines, since
eleven were half-recorded and the report printed the first clause as the
whole justification.

**Class C then closed the same day**: three claims, all now witnessed by
real NULLs. One needed seed data (`dense` sells product 6, so a correlated
`avg(rating)` finally has an ordered-but-unreviewed product to be NULL
over); the other two cost a fixture one literal — an id no state can seed,
so a LEFT JOIN LATERAL exercises both arms, and an aggregate over the
column `sparse` leaves NULL rather than the one it fills. Nothing else in
the corpus moved.

**Class A closed the same day too** — ROW-TYPE ERASURE, 14 of its 15
claims. `SETOF order_items` erases the table's NOT NULLs and PostgreSQL
re-imposes nothing (a body selecting NULL into such a column is accepted
and comes back NULL, measured), so the declaration is right to erase and
the BODY is the only sound source of a guarantee — which for these
functions selects the very columns the constraints sit on. The walk reads
a single-candidate `LANGUAGE sql` body's target list per column and ORs it
into the declared list, either positionally or through a ROW constructor
delivering the whole row as one column (both spellings accepted,
measured). It is the row-return counterpart of priority 5, which reads the
same bodies for scalar returns and takes column 0.

Four gates carry the soundness argument, each measured and each pinned
from BOTH sides by a new `body-shape-*` fixture: a multi-function `ROWS
FROM` NULL-pads the shorter call (measured against this very body); a
non-set-returning composite return whose body can yield zero rows comes
back as one all-NULL row, so the scalar path's single-row gate applies;
`fnBodyAsts` is keyed by name alone, so only a SINGLE candidate may be
read — that fixture loads the trap, calling the overload that emits NULLs
while the shared key holds the one that does not; and a one-against-one
reading is refused for a row-typed return, where the two readings
disagree. What it deliberately does not do is thread the call's ARGUMENT
nullability, which costs the fifteenth claim (`out_pair`'s `lo` returns
its own argument) and is recorded on the fixture.

**Class B closed the same day, 8 of its 10 claims, and the charter with
it.** A join whose ON is an equality on a NOT NULL foreign key always
matches, so the referenced side never null-extends — a promotion inside the
existing presence fixpoint, which makes it cascade and carry null-group
co-members for free. The same key answers a correlated subquery, where the
predicate is at-least-one rather than exactly-one: several rows RAISE
instead of evaluating to NULL, and a raise contradicts nothing. Both
self-lookups (the subquery scans what the outer scans, keyed on the same
column — no constraint needed at all) and key lookups are read.

**The measurement pass paid for itself before a line was written.** Of the
five hazards the charter named, one was not a hazard (PostgreSQL refuses a
foreign key onto a non-unique column) and one collapsed into another
(MATCH SIMPLE's partial NULLs cannot arise once the referencing column is
NOT NULL). It found three more: PG18's NOT ENFORCED keys, which need no
gate of their own because `convalidated` is false for one and
`ALTER CONSTRAINT … NOT ENFORCED` clears it on a validated one; INHERITANCE,
where a parent's key is not copied to a child so a TREE scan reads rows
nothing checked (the relation-SET lesson, third instance — partitioning is
the opposite and safe); and `ALTER TABLE … DISABLE TRIGGER ALL`, which lets
violations in while the catalog still reads validated and enforced. That
last one has NO catalog trace and is recorded as an explicit assumption in
`docs/nullability-walk.md`: it is the first fact the engine trusts that an
administrative command can silently falsify, and the same command does not
bypass a CHECK (measured). `condeferrable` is the one new snapshot fact.

Eleven gate fixtures pin the rest — NOT VALID, DEFERRABLE, inheritance and
its ONLY control, an extra ON conjunct, a referencing side extended one join
earlier, and the subquery form's four — each from the side that would
produce a wrong `notNull`. The residue is one shape, recorded on both its
fixtures: a correlated subquery whose FROM carries a JOIN, where each hop is
a key the engine already reads and only the composition is missing.

**The imprecision-closure charter is discharged**: 25 of 28 claims across
classes C, A and B, with three residues each naming what it would take. The
78 that remain are correct — 39 conservative by design (four of them the
overload charter's) and 39 structurally unwitnessable.

**A refactor chartered, not started: type-aware overload narrowing** —
`docs/type-aware-overloads.md` (2026-08-05). The curated-table audit's
`lower`/`upper` finding forced a sound removal that costs `lower(<text
column>)` its notNull, and that is indefensible to a consumer: the
simplest function in SQL reading nullable is a credibility problem before
it is a precision one. The structural cause is that a curated entry keys
on a NAME while PostgreSQL keys on a SIGNATURE — 137 curated names cover
235 signatures, 55 of them backed by more than one C implementation, and
`TOTAL_STRICT_OPERATORS`' 22 names cover 558. The charter's design was
NARROW, DO NOT RESOLVE and was **substantially revised 2026-08-06** after
that premise was measured and found wrong: it filed EXACT MATCH under
"later tiebreaks", when exact match is early, terminal and unique by
construction (two operators cannot share a name and operand types), so
where the argument types are known the overload is a LOOKUP rather than a
resolution. The design is now layered — tier 0 reads PREPARE's PARAMETER
TYPES as an input (the consumer runs it anyway, and it collapses most
vagueness: `ARRAY[1,2] || $1` types `$1` as `integer[]`); tier 1 takes the
exact match and reads that one candidate's flags, which composes through
nesting; tier 2 is the original superset narrowing as fallback, with the
consensus quantifier now PER-PROPERTY (`every` for totality, `some` for
strictness, because the two fail in opposite directions); tier 3 — letting
a receiver constrain the set — is sound for valid statements but optional,
and PostgreSQL itself is measured NOT to resolve that way.

**THE THREE PRE-REFACTOR QUESTIONS ARE ANSWERED (2026-08-09)**, by
measurement against PGlite 18.3, pinned in
`tests/unit/query/overload-resolution-mechanism.test.ts` (15 assertions,
PostgreSQL only — `param-mechanism.test.ts`'s shape). The full answers are in
the charter's "The three pre-refactor questions, ANSWERED" section; the
one-line versions:

1. **Operator shadowing: tier 1 closes it only if candidate gathering merges
   path-visible user operators with the pg_catalog signatures** — the
   function side's merge rule, confirmed for operators: path is a visibility
   filter, exact match beats path position, position breaks only
   identical-signature ties, pg_catalog implicitly first unless explicitly
   demoted. The blind spot is demonstrated live rank-1 (a user
   `+ (boolean, boolean)` returning NULL from non-null inputs reads notNull,
   because `TOTAL_OPERATORS` is consulted by bare name BEFORE
   `resolveOperatorMetadata`), so the refactor must consult the merged set
   FIRST and demote the curated tables to property source.
2. **Aggregates and window functions: three rules, none the scalar exact
   match.** A WITHIN GROUP signature includes the ORDER BY types
   (`percentile_cont`'s four rows differ only there); the hypothetical-set
   family resolves by call shape alone (`VARIADIC "any"` + mutually
   exclusive shapes); a `VARIADIC "any"` candidate is never eliminable by
   type nor exact-matchable. FILTER/DISTINCT/`*` are orthogonal.
3. **Domain-following generalises across every base measured, with the smash
   as FALLBACK, not first step** — a candidate declared ON the domain type
   wins exact match over the base's — **and one polymorphic exception:
   `anyenum` refuses domains** (every other family admits them; admitting
   generously is a safe over-retention under the governing invariant).

A fourth item is decided rather than open, and is the first thing to build:
tier 1 must CANONICALISE an argument type — through binary-coercible casts
and domain bases — or it misses `character varying`, which has ZERO operators
declared on it (measured; `varchar || varchar` resolves to `text` by binary
coercion). Everyday SQL would never reach the fast path. Answer 3 added the
ordering: exact match tries the DECLARED types against the merged candidate
set FIRST (a candidate declared on a domain wins), and canonicalises only
when that finds nothing.

**The refactor is STARTED (2026-08-09): steps 1 and 2 of the charter's
"What must change" are LANDED** — the `pg_cast`/`pg_type` captures
(`builtinImplicitCasts`, `builtinTypeKinds`) and the coercibility accessor
(`OverloadCatalog` in `src/query/catalog-adapter.ts`, five members behind
`OVERLOAD_CATALOG_ONLY` so the censuses hold the walk's face to fixture
coverage while the walk does not yet consult them;
`tests/unit/query/coercibility.test.ts` asserts the elimination rule from
both sides). **Step 3's OPERATOR half is LANDED (2026-08-09)**: the walk
types a binary A_Expr's operands (`operandTypeName` — the charter's literal
table plus `renderedTypeOfExpr`, with the captured `int4`→`integer` alias
bridge for casts) and consults `resolveOperatorTotality`, which merges
path-visible user operators with the captured builtin rows, takes a
declared-types exact match, and otherwise reads totality by consensus over
the non-eliminated survivors, each builtin row against
`NON_TOTAL_OPERATOR_SIGNATURES`. Both recorded defects CLOSED where types
are known: `path + path` reads nullable (`operator-path-plus.sql`, NULL
witnessed, with `1 + 2` beside it eliminating the path row) and the
operator-shadowing rank-1 dispatches the user operator's body
(`search-path.test.ts`, four pins with PostgreSQL as referee). **The return-type UNION threads upward (2026-08-09, same day)**: an
operand is a type SET — null constrains nothing, a singleton is exact, a
wider union eliminates with "can ANY member reach P" — and a nested binary
operator's operand is the inner resolution's survivor union, so
`(a + b) + (c + d)` composes with exact composition as the singleton case.
The charter's 2026-08-06 note dismissing set-carrying is superseded in
place; `OperatorInfo` grew `resultType` so user operators compose;
`operator-path-plus.sql`'s nested columns pin it discriminatingly. The
residue keeping the name rule with its recorded holes is now only what
nothing types yet (string/NULL literals — untyped by PostgreSQL itself —
parameters, function results, CASE/COALESCE); the exotic-operand argument
covers it unchanged. The corpus dry-run moved nothing;
`resolveOperatorMetadata` went cold in the generated corpus (triaged: only
the strictness sites still consult it). **The strictness and unary slice LANDED (2026-08-09)**: WHERE promotion
asks EVERY-quantified strictness over the typed merged candidate set
(`resolveOperatorStrictness` — a wrong "strict" there is a wrong notNull,
so one unvouched survivor denies it; the shadowing guard answers false for
a user operator on a curated name with nothing known), PREFIX operators
narrow through `resolveUnaryOperatorTotality` (pinned by `neg_sum` in
`operator-path-plus.sql`), and `resolveOperatorMetadata` became
PATH-VISIBLE for bare names — the whole-snapshot merge let an off-path
operator poison the strictness consensus in the under-report direction,
which for mechanism C makes the contract lie. Mechanism C itself keeps its
RECORDED over-report (`NON_STRICT_OVERLOADS`) — its module has no scope to
type operands with; it joins the function half's shared typing work. **TIER 0 LANDED (2026-08-09)**: the walk's entry points take an optional
`paramTypes` input (`paramTypes[n-1]` types `$n`, exactly as PREPARE
reports them), `operandTypeSet` types a ParamRef from it, and the probe
harness PREPAREs each parameterized probe against its own PGlite and
threads `pg_prepared_statements.parameter_types` in — the input was never
gated on a consumer. A parameter operand cannot move an OUTPUT claim (a
parameter is nullable by design), so `param-types-input.test.ts` pins the
RESOLUTION: typed → signature-narrowed, untyped → name rule, plus the seam
that regtype text is format_type's spelling. The input's claim-level
consumers are mechanism C (where `ARRAY[1,2] || $1` stops over-reporting
strictness) and the function half. **The SCALAR function slice LANDED (2026-08-09), with the founding
recovery.** Priority 6b resolves a builtin call over the captured kind='f'
rows — arity admitted with captured `pronargdefaults` (five claim names
carry them; eliminating a shorter call would be a false elimination),
exact match on singleton argument sets, elimination and verdict CONSENSUS
over survivors on the lattice always ⇒ first-arg ⇒ strict-total. The
verdict source is the name tables plus `STRICT_TOTAL_BUILTIN_SIGNATURES`,
the signature-keyed additions whose first entries are `lower(text)` and
`upper(text)`: **`lower(<NOT NULL text column>)` claims notNull again**
(`builtin-lower-upper-text.sql`; `builtin-functions.sql`'s `upper_name`
flipped from its recorded name-level cost, annotation retired), while the
range rows keep reading nullable (`builtin-range-lower-upper.sql`,
unchanged). The additions ride the totality probe's universe (791
signatures now) — a NULL from an addition row fails the run — and the
probe asserts each addition is probed and non-redundant. **Mechanism C's
recorded `||` over-report is CLOSED where the operand types**: a
context-free type resolver (literals, casts, uniform ARRAY constructors,
nested operators) feeds SOME-quantified strictness
(`resolveOperatorStrictnessSome`), so `ARRAY[1,2] || $1` no longer calls
$1 rejected — pinned with PostgreSQL refereeing both directions in
`param-types-input.test.ts`. Residues, each named: mechanism C's ParamRef
typing waits on threading the tier-0 input through
`param-nullability`'s recursion (the `$1 || $2` shape keeps the name
rule's safe over-report); named-notation builtin calls skip the typed
dispatch. **The AGGREGATE/WINDOW half LANDED (2026-08-09): two more tables
RETIRED.** `HYPOTHETICAL_SET_AGGREGATES` and `ORDERED_SET_AGGREGATES` were
asserted catalog-equal to `pg_aggregate.aggkind` in both directions — the
retirement criterion `AGGREGATE_NAMES` established, and the criterion
their own assertion text named — so the WITHIN GROUP dispatch now reads
the capture's aggkind directly (`resolveBuiltinAggregateRows`), the
capture scopes the h/o CLASSES itself (the verdicts are class claims), and
the both-directions assertion in `curated-tables.test.ts` now holds the
CAPTURE to the catalog instead. The two VERDICT tables
(`NEVER_NULL_WINDOW_FNS`, `NON_NULL_OVER_NONEMPTY_AGGREGATES`) keep their
name keys deliberately: each window name has exactly one 'w' row, the
aggregate names' rows are claim-uniform, and no per-row evidence exists to
diverge them — that evidence is step 5's job. **STEP 5's WITNESS CORPUS LANDED (2026-08-09)**:
`tests/unit/functions/<name>/<slug>.sql`, thirteen seed witnesses over
eleven names — the durable per-overload home of every removal's evidence
(the `lower`/`upper` range and multirange forms, `substring`'s regex form,
`to_number`, `to_char`'s datetime form, `scale`/`min_scale` on NaN,
`array_position`'s no-match, `date_part` on infinity) plus the aggregate
and window constructions (`percentile_cont` over an empty group, `lag` on
a first row). Each file names ONE signature (`to_regprocedure` validates;
exact signatures are unique by construction), a `@null` refutation and a
`@value` control — the liveness bar, since every other assertion is a
negative. The suite (`witnesses.test.ts`, 30 assertions) closes the loop:
a witnessed signature may be claimed total nowhere — not by name, not by
the signature additions — and prints the coverage report over the
capture's claim rows. Growth is by evidence: a removed name earns a row
back through `STRICT_TOTAL_BUILTIN_SIGNATURES` only with the probe holding
it, and the verdict tables earn per-row keys the same way. **THE MERGED GATHERING LANDED (2026-08-09)**: `resolveUserFunctionTyped`
recovers the drop rule's cost for CAPTURED names — a user function under a
builtin name whose declared types exact-match (with no builtin row sharing
the signature; pg_catalog wins that tie) or that survives elimination
alone across the merged set gets its metadata back, domain return and body
included. Pinned by the charter's own example (`public.lower(integer)`
returning a NOT NULL domain, `search-path.test.ts` — PostgreSQL as
referee, with the builtin text side untouched beside it). The drop rule
STAYS, correctly, for names the capture does not hold, for names carrying
aggregate or window rows, and for undecided sets.

**THE FALLBACK MEASUREMENT RAN (2026-08-09), and the charter's last open
item is CLOSED with a kept fallback.** Function results now feed
`operandTypeSet` (the scalar dispatch returns its survivors' return-type
union; a resolved user function contributes its declared scalar return),
which was the measurement's precondition. Then the both-unknown name-rule
fallback was removed and the suite run: **two real claims regressed**, and
they name the fallback's residual load exactly — `cte-self-join`'s
`a.total + b.total` (a COMPUTED CTE column the re-export reading cannot
type) and `function-default-argument`'s body arithmetic over the
function's own parameters (nothing types inside a body scope). Both are
typeable in principle — the inner target list, and the declared parameter
types the snapshot already carries — so the fallback retires when those
two sources type, not before and not by assumption; the reasoning is
recorded at the fallback itself in `catalog-adapter.ts`. The
type-aware-overloads charter has NO open items: what its residue reduces
to is those two typing sources, the mechanism-C ParamRef threading, and
named-notation dispatch — each a precision extension of landed machinery,
none a soundness question.

**THE PREDICATE SIDE READS NO TYPES AT ALL (found 2026-08-20, by the
type-union suite's measurement).** `promotionOperatorIsStrict` declares
`scope: Scope | null = null`, and BOTH of its call sites —
`predicateProvesNonNull`'s `AEXPR_OP` arm and `exprStrictlyForces`'s —
pass three arguments. So `renderedTypeOfExpr` returns on its first line
(`if (!("ColumnRef" in rec) || !scope) return null`) and every column
reference in a WHERE or JOIN predicate reads UNTYPED. Base tables and CTEs
alike: `a.quantity` in the target list reads `[integer]` while
`a.order_id` in `ON a.order_id < b.order_id` reads null, in the same
statement, over the same table. That asymmetry is what
`type-unions.test.ts`'s consistency test is red on.

Precision, not soundness — with nothing known the strictness accessor
answers false and the promotion does not happen.

**FIXED 2026-08-20** by threading `scope` through `predicateProvesNonNull`
and `exprStrictlyForces`; every entry point already held one, captured in a
closure and never passed down. The census moved hard: no-claim readings
2024 → 530, singletons 699 → 2286, multi-member unions 115 → 22, zero
containment violations either side. `generated-soundness` was watched
across it — 14964 queries, 24089 notNull claims, 0 violations — because
giving the promotion gate real types is the direction that can only be
proven, never assumed.

No corpus claim moved, and that is the point rather than a
disappointment: the claims were already right, they were resting on
nobody having defined a `=`. The capability gain shows only against a
polluted schema, where it is decisive — a user `=` over an unrelated
composite used to cost EVERY LEFT JOIN promotion, and now costs none
(`bare-name-gates-red.test.ts`, "predicate gate", measured against the
pre-threading engine).

**MEMBER-LIST NODES TYPE (2026-08-20).** `CaseExpr`, `CoalesceExpr`,
`MinMaxExpr`, `A_ArrayExpr` and `RowExpr` answered null at every reading;
they now answer the UNION of their known members (a ROW is `record`
outright). PostgreSQL unifies a member list to ONE common type by its
resolution rules — `CASE … THEN int ELSE numeric END` is `numeric` — and
the union contains it without reimplementing them, which is all the
elimination downstream ever needed.

`closedCommonTypes` looked like the rule to reuse and is NOT: it lands an
all-unknown list on `text` and demands immutable-I/O of the known members
when an unknown one is present. Both are correct for the EVALUATOR, which
has to run the input function, and both are wrong for typing —
`COALESCE(m.ts, 'x')` is plainly `timestamptz` however DateStyle-dependent
its output is. The all-unknown landing is the more dangerous of the two: a
node whose members are all unknown takes its type from OUTSIDE
(`m.d = COALESCE('a','b')` is a date), so answering `text` would eliminate
the overload PostgreSQL actually picks. Answering null is the only sound
option, and it is pinned as a case.

Real gap 319 → 311 readings, with 5 corpus expressions and 12 suite cases
witnessed. The first census reported this as 530 → 529 and looked like
nothing: the metric was counting bare string literals — `unknown` in
PostgreSQL too, and not a gap — beside the nodes genuinely untyped, and
typing a node ADDS readings for its members. The census now separates them,
which is what makes the number mean anything.

SubLink stayed out. A scalar subquery's type is its single output column's,
and reading that needs the SUBQUERY's scope — the same inner-scope problem
the census's 1332 unprobeable readings have, and the same one a delegated
probe would have to solve. It belongs with that work, not this one.

**What is left is chartered, not deferred: see
`docs/type-resolution-delegation.md` (2026-08-20).** The residue after the
member-list work is 76 distinct expressions — 63 columns of a DERIVED
relation in five buckets, 10 scalar subqueries, 2 all-unknown arrays that
must STAY null, and one expression inside a function body. Typing them
symbolically is five separate pieces of work; the charter takes the other
route and asks PostgreSQL, through a zero-row probe whose RowDescription
carries the resolved types. That document is written to be handed to a
fresh session and carries the measurements, the safety rule and the
boundaries. This entry stays as the record of how the residue was reached.

**THE NEXT BARE-NAME GATE: `btreeStrategyOf` and `isEqualityComplement`
(found the same day, by trying to put that pollution in the shared
schema).** Both are keyed on `evalUserOperatorNames` by NAME —
`btreeStrategyOf(op)` returns null and `isEqualityComplement(op)` false for
any symbol a user operator carries. Adding `=` and `<` over a composite to
`fixtures/schema.sql` cost NINE fixtures in the CHECK-interval machinery
(`check-interval-*`, `check-membership-exclusion`, `partition-bound-*`),
all in the safe direction. Unlike the operator and function gates these
accessors take a name and NO operand types, so elimination is not available
without widening their signatures — which is the piece of design work this
entry defers. The pollution stays local to the red suite until then, for
the same reason the colliding `||`/`+` do: nine real claims is too much to
pay to exercise a rule a scenario test already holds.

**The fallback's price is not two claims, it is two PLUS whatever the
schema names (measured 2026-08-20).** The two above are what it costs on a
schema with no user operator on a curated symbol. Add one — a `boolean ||
boolean`, an ordinary thing for a schema to have — and the same fallback
cedes six fixtures: `$1 || 'x'` in three parameter fixtures,
`a.total + b.total`, the default-argument body arithmetic, and
`param-overload-arity`'s `$1 || '!'`. Every one is an untypeable operand
beside a typed literal, so the retirement condition does not change; what
changes is the payoff, which now scales with the user's schema rather than
sitting at two. Recorded, not scheduled. The measurement lives in
`bare-name-gates-red.test.ts`'s header, and it is also the reason the
colliding operators are NOT in `fixtures/schema.sql` — six real claims is
too much to pay to exercise a rule the red suite already holds.

**A review question then found — and closed — the charter's item 5 gap
(2026-08-09):** "user overloads come free" had been true of consensus
only; typed SELECTION among ordinary user overloads was never wired.
`resolveUserFunctionTyped` now serves non-builtin names too (the merged
set is just the user half), with the body-map guard the class-A trap
demands: a `LANGUAGE sql` winner among siblings refuses, because
`fnBodyAsts` is keyed by name alone and typed selection must not smuggle a
colliding meta past resolveFunctionMetadata's single-candidate shortcut —
a signature-keyed body map is that residue's price. Pinned by
`typed-overload-selection.sql` (the `pick` pair: integer row's NOT NULL
domain return recovered, text row's NULL witnessed) and by the corrected
`overload-consensus.sql` annotation, whose reason had gone stale the
moment the narrowing started dispatching `same_tt` — the 12%
reason-drift class, caught by a review question. On the OTHER question that review asked — per-builtin corner-case tests —
the answer CHANGED by decision (2026-08-09): **the charter's open question
is decided, and the FULL builtin scalar surface is witnessed or
classified** (`builtin-surface.test.ts`). The reasoning, the user's: the
engine's default "nullable" for an unclaimed builtin is itself a CLAIM,
and this project's discipline says a nullable claim is witnessed or its
unwitnessability is explicit — the fixture suite enforced that per column
and exempted the whole unclaimed surface. Every pg_catalog `prokind='f'`
signature now lands in exactly one category: claimed 237 (the totality
probe's jurisdiction), volatile 281 (excluded on the catalog's own
side-effect marker), no-generator 801 (explicit), raised-everywhere 160,
**null-witnessed 139** (the machine found the NULL; asserted never to
acquire a totality claim), and **no-null-found 1608 — THE WORK LIST**:
claimed nullable, no witness found, each a graduation candidate for a
human to promote (name table or signature addition, where the totality
probe takes over) or to find the missing input class for. Promotion stays
human — the discovery/coverage split. The probe corpus is shared with the
totality probe (`probe-values.ts`, one copy). Engineering note recorded
for the next person: PGlite's backend, once an expression overflows the
errordata stack, stays POISONED while plain SELECTs still answer — the
suite detects poison with the probe itself, treats short results as
failures, bisects to the culprit, and rebuilds; the run costs ~2.5
minutes, all of it in poison recovery. **The culprits are ISOLATED
(2026-08-09, `tests/probe/poison-hunt.ts` — kept as tooling): across all
51,148 probe expressions, exactly the ENCODING-CONVERSION family** —
`convert_to(text, name)`, `convert_from(bytea, name)`, `convert(bytea,
name, name)` — and the boundary is measured precisely: an UNKNOWN encoding
name raises the ordinary clean error (healthy); an identity or
ascii-degenerate conversion (UTF8→UTF8, SQL_ASCII) works; **a REAL
conversion attempt (e.g. →LATIN1) returns a zero-row "success" and leaves
the backend broken** — called directly, even `SELECT 1` fails afterward;
called inside a plpgsql exception context, the backend enters the
answers-but-lies state (ERRORDATA_STACK_SIZE on error paths, short
results). Deterministic, single-call, self-contained. Reading: the WASM
build lacks the loadable conversion modules real PostgreSQL dlopens, and
the failed attempt aborts below PostgreSQL's error machinery instead of
through it. Consumer guidance: treat `convert`/`convert_to`/`convert_from`
in analysed SQL as a rebuild trigger or refuse to execute them; the
error-path sentinel plus result-cardinality checks remain the general
detectors, since this list is one build's ground truth, not a warranty. **The OPERATOR surface joined the same discipline (2026-08-09, same
day)**: every pg_operator row classified alongside — 4025 signatures
total, claimed 795 (the 558 operator rows are the totality probe's
jurisdiction), null-witnessed 154 (15 operator witnesses, `->` on a
missing jsonb key the positive control), no-null-found 1826 (218 operator
rows join the work list), the shell-operator drop per the 1a sweep's
measurement. **The work list is a durable handoff**:
`docs/builtin-surface-worklist.md`, written by the suite itself
(`BUILTIN_SURFACE_WORKLIST=docs/builtin-surface-worklist.md` on the run,
regeneration command in the file's header) — every category listed in
full, null-witnessed entries with their runnable witnesses, ready for a
session to work the no-null-found promotions signature by signature. **Aggregates and window functions JOINED the discipline (2026-08-09), with
the second regime their claims required**: their claimed rows had NO
execution hold (the totality probe covers scalar claims only), so the
suite both classifies the unclaimed rows AND holds every claimed row to
its own claim's conditions — an "always" claim (count, the hypothetical
class, the never-null window set, ntile with a non-null argument) fails on
any NULL; a "nonempty" claim (the nonempty table, the ordered-set gate)
fails only under the nonempty non-null-input construction, empty and
all-NULL input being the class's documented NULLs. Constructions: three-row
and SINGLE-row corner tables, WHERE false, all-NULL arguments, WITHIN
GROUP spellings keyed on the post-aggnumdirectargs types, and window
scalar subqueries at the first row, last row and a one-row partition.
**Zero claim failures** — the first execution evidence those two verdict
tables have ever had — and 70 new witnesses (stddev_samp over a single
row and lag on a first row are the positive controls). Final surface:
4201 signatures, all categorized, the work list regenerated with per-kind
splits.

**THE FIRST PROMOTION BATCH RAN (2026-08-09)**: 126 signatures over 64
names left `no-null-found`, each convicted individually on input classes
the corpus does not carry rather than on the probe's silence. Triaged for
what real SQL calls — the internal machinery (aclitem, RI_*, binary I/O,
the C functions behind operators, the cast functions `::` never routes
through this dispatch) was deliberately skipped, and so were the
set-returning rows, where the probe's scalar construction reads a zero-row
result as a value and could not witness anything (measured, not assumed:
`generate_series(1,0)` and `unnest('{}'::int[])` both come back "value").
What went in: 60 whole
names into `STRICT_TOTAL_BUILTINS` — `timezone` and `overlaps` first,
since `AT TIME ZONE` and OVERLAPS are ordinary SQL arriving under a name
nobody writes; then the network set, the range predicates and constructors,
the degree-argument trig and PG18's special functions, the JSON and array
constructors, `get_bit`/`set_byte` and friends — plus 15
`STRICT_TOTAL_BUILTIN_SIGNATURES` rows recovering names that can never
carry the claim: `substring`'s six POSITIONAL forms (the FROM-regex ones
are witnessed), `to_char`'s five NUMBER forms (the datetime ones are), and
`extract`/`date_part` over `time` and `timetz`, which have no infinity and
so escape the class that removed the pair. **Two convictions went the
other way and are the better outcome**: PG17's INFINITE INTERVAL is the
infinite timestamp's class one type over — `date_part('month',
'infinity'::interval)` is NULL while `'day'` and `'hour'` are ±Infinity —
so `date_part(text,interval)` and `extract(text,interval)` are witnessed
and barred forever. **Three more NULLs sit past the combination cap**
(`regexp_substr`'s five- and six-argument rows and `regexp_match`'s
three-argument one): reaching them needs a non-matching pattern AND a
valid flags string, two arguments varied at once, which one-at-a-time
sampling cannot do — found by hand, and in the witness corpus with the
cap named as the reason the machine cannot re-find them. Corpus additions,
each measured against the whole claimed surface first (no claimed NULL):
`'hour'`, `'month'` and `'[]'` to text, `'r'` to `"char"`, the two
infinite intervals — which closed 11 `raised-everywhere` rows that were a
corpus gap rather than a gutted function (`to_ascii` is the other
population and stays: this database is UTF8 and it raises for every input,
and the encoding name that would fix it is exactly what must never enter
the corpus). `MAX_COMBOS` moved 512 → 1024 because the three text values
took `date_trunc(text, timestamptz, text)` — the signature the cap was
sized for — past it. **Two defects in the harness itself, both found by
this batch and both fixed**: the witness corpus compared `@signature`'s
`text, interval` spelling against the capture's `text,interval`, so its
LOOP-CLOSER — no witnessed signature may be claimed total — could only
ever match a ONE-argument witness and passed vacuously for every other;
and the surface suite read a signature addition's whole NAME as claimed,
which hid that name's witnessed rows and left its own loop-closer nothing
to check. Surface now: claimed 1013, no-null-found 1715, null-witnessed
230, raised-everywhere 155, no-generator 807, volatile 281.

**THE `no-generator` TRIAGE FOLLOWED (2026-08-09, same day), and it was
the cheaper half**: 706 of the 807 are `internal` (520) or `cstring`
(186), and the two are unprobeable for DIFFERENT reasons — PostgreSQL
refuses a value of type `internal` from SQL at all, while `cstring` is
merely never written by anyone (`textin('abc'::cstring)` runs fine,
measured, which is why the reason had to be checked rather than assumed).
Both are permanent skips, as are the transition-state arrays, the snapshot
and statistics types, the `reg*` out/send pairs and the handler
pseudo-types. What the triage KEPT was four generators for types real
application SQL passes — `jsonpath`, `regconfig`, the six concrete range
types with their arrays, and `ts_rank`'s `real[]` weight vector — and they
paid for themselves twice over. **Ten new witnesses, all jsonpath**: under
`silent => true` a STRICT path error is suppressed into a NULL rather than
a false, so `jsonb_path_exists`, `jsonb_path_match`, their _tz twins and
the `@?`/`@@` operators all answer NULL for wholly non-null input — and
`jsonb_path_query_first`, named in the walk's own excluded list since the
beginning, finally has the witness that list always asserted. The lax
paths alone missed every one of them; `'strict $.a'` is in the corpus for
that reason. **47 more promotions**: full-text search entire —
`to_tsvector`, the four tsquery spellings, `ts_headline`, `ts_rank`,
`ts_rank_cd`, `setweight`, `strip`, `querytree` and the rest — which was
never a hard case, only an unprobed one (empty input is the class to beat
and every one survives it), plus `jsonb_path_query_array` and its _tz
twin, which answer `[]` where their siblings answer NULL. Six rows moved
to `raised-everywhere` rather than being probed: the VARIADIC multirange
constructors, which can only be called through the `VARIADIC` keyword —
the totality probe supplies a variadic tail twice and the surface suite
does not, and closing that is a construction change, not a corpus one.
Surface now: claimed 1060, no-null-found 1705, null-witnessed 240,
raised-everywhere 161, no-generator 754, volatile 281.

**SUPERSEDED (2026-08-09, same day) — the set-returning class IS probed,
and the construction below was wrong about which position it needs.** Read
the entry that follows for the trap it records, then the closure beneath it:
the FROM-position measurement stands, and the conclusion drawn from it did
not.

**THE SET-RETURNING CLASS IS CLASSIFIED, NOT PROBED (2026-08-09), and the
attempt to probe it is the entry's real content.** 71 rows were sitting in
the work list on evidence the construction never took: `probe()` runs
`EXECUTE 'SELECT (expr) IS NULL' INTO r`, which takes the FIRST emitted row
and reads zero rows as a value — so `unnest(ARRAY[NULL,1])` was witnessed
and `unnest(ARRAY[1,NULL])` was not, the same function over the same
elements, and an empty set passed as evidence of non-nullness. A row-wise
construction was designed, approved and then ABANDONED on measurement,
which is the part worth keeping: **PGlite MATERIALISES a function scan**,
so `generate_series(1::bigint, 9223372036854775807)` — which the corner
corpus produces on its own — allocates until the process is killed. It
exhausted the developer machine's memory twice before the cause was found.
`LIMIT` above the scan does NOT bound it and `statement_timeout` does NOT
cancel it (both measured); and because the WASM backend runs synchronously
in-process, a JS watchdog cannot fire either — the event loop is blocked,
so only killing the process ends it. **That is a live trap for any future
probe design and is the reason to read this entry**: a runaway query here
is not slow, it is fatal, and nothing inside the suite can recover from it
the way the poison machinery recovers from a corrupted backend.

The fallback — promote the class on bounded hand evidence — was tried and
reverted for a second measured reason. Every set-returning row measured
TOTAL over bounded arguments (`generate_series` in all nine forms,
`generate_subscripts`, `regexp_split_to_table`, `json_object_keys`,
`json_array_elements`, `string_to_table`'s two-argument form), but neither
suite can HOLD the claim: the totality probe's `INTO` raises on any
multi-row result, so every honest combination records as an error, and each
raise costs 2-3.5s over the corpus's large bounds — promoting the class
took the gating suite from 4.6s to past its 120s hook timeout. A claim no
suite can falsify is what this project does not ship, so the class stays
unclaimed and says so. Recovering the precision needs a probe whose
arguments are bounded independently of the shared corpus; that is the open
item, deliberately not attempted here.

What the classification bought: the queue is honest (1705 → 1651), and the
surface run went from ~147s to **18s** — which corrects the earlier note in
this register that the run cost was "all of it in poison recovery". Most of
it was set-returning probes raising slowly. Five witnesses record the
NULL-capable members, since the new category would otherwise swallow the
one the probe had found by luck: `unnest` over an array holding a NULL,
`unnest(tsvector)`'s positions column (a per-COLUMN NULL a whole-row test
would miss), `json_array_elements_text` and its jsonb twin — which turn a
JSON null into a SQL NULL where the non-`_text` versions return it as a
value — and `string_to_table`'s null_string form. One trap for whoever
writes the next such fixture: the non-`_text` twin cannot serve as the
CONTROL, because `json_array_elements('[null]')` hands the driver a JSON
null that deserialises to a JavaScript null and reads exactly like the SQL
NULL it is not. Surface now: claimed 1060, no-null-found 1651,
null-witnessed 239, raised-everywhere 148, set-returning 71,
no-generator 751, volatile 281.

**A THIRD BATCH CLOSED THE APPLICATION-FACING TAIL (2026-08-09)**: with the
internal prefixes and suffixes stripped, only 85 names / 125 rows of the
queue were left that an application query can reach at all, and most of
those are geometry or the C functions behind operators. 19 promoted, and
the shape of the group is a claimed name with unclaimed relatives —
`sha256` was in the table and `sha224`/`sha384`/`sha512` were not;
`normalize` was and its `is_normalized` predicate was not. With them:
`crc32`/`crc32c`, the unicode-version trio, the XML constructors and the
three well-formedness predicates (which answer false, not NULL), and
`like_escape`/`similar_escape`/`similar_to_escape` — what `LIKE … ESCAPE`
and `SIMILAR TO` rewrite to, so the names are reached by SQL nobody wrote.
Geometry and the `d*` float8 internals (`dexp`, `dpow`, …, the private
implementations of names already claimed under their public spelling) were
measured total and deliberately SKIPPED: no application query calls them,
and the queue's meaning thins if it fills with rows nobody was going to
ask about. **One witness, and it is a class the surface probe cannot see
at all**: `current_schema()` returns NULL when `search_path` names no
existing schema — a zero-argument function whose NULL route is session
state rather than input. The fixture sets it with `set_config(…, true)` so
the setting reverts at statement end and the shared PGlite is untouched.
Two residues from writing it, both now fixed in the harness: `@signature`
must be allowed to be EMPTY for a zero-argument function, and the greedy
`\s+` in the directive pattern crossed the newline and captured the
FOLLOWING directive, so `to_regprocedure` reported a syntax error from a
file that read correctly. Surface: claimed 1079, no-null-found 1632.

**THE SET-RETURNING CLASS IS CLOSED (2026-08-09), and the entry above is
kept because being wrong about it is the useful part.** The measurement
that killed the row-wise probe was real and still is: a FROM-position
function scan MATERIALISES in PGlite, so `SELECT * FROM
generate_series(1::bigint, 9223372036854775807) LIMIT 100` allocates until
the process dies, unbounded by `LIMIT` and uncancellable by
`statement_timeout`. What was wrong was the conclusion — the position was
never forced. **In the TARGET LIST the same call is a lazy `ProjectSet`,
`LIMIT` stops it, and the whole question answers in ~2ms**:

    SELECT count(*), bool_or(c0 IS NULL)
      FROM (SELECT (pg_catalog.generate_series(1::bigint,
                                               9223372036854775807::bigint))
            LIMIT 100) s(c0);

The prompt for looking again was the user's, and it is the better argument:
the engine's default nullable IS a claim, so an unwitnessable nullable
reading on a function that never returns NULL is exactly what the surface
suite exists to flag — letting the prober's limitation decide the verdict
is backwards. `srfprobe` and `srfQuery` now live beside `probe()` in
probe-values.ts, shared by BOTH suites, so a promoted set-returning claim
is held by execution like every other. The bound is recorded rather than
implied: 100 emitted rows, and a NULL past it goes unseen. Record rows are
projected `(call).*` and tested per COLUMN — `unnest(tsvector)`'s NULL
positions sit beside a non-null lexeme and a whole-row `IS NULL` misses
them. `empty` is its own verdict and counts as no evidence, exactly like a
raise: `generate_series(1, 0)` must not pass for a probe.

**24 promoted, 13 witnessed by the machine.** In: `generate_series` (all
nine rows), `generate_subscripts`, `regexp_split_to_table`,
`regexp_matches`, the json/jsonb key and element expanders, `jsonb_path_query`
and its _tz twin, plus `string_to_table(text,text)` signature-keyed.
Permanently out, and the split is the sharpest thing here: the `_text` json
expanders turn a JSON null into a SQL NULL where their non-`_text` twins
return it as a value, so `json_each` is claimed and `json_each_text` is
witnessed — the machine found that pair itself once the corpus could reach
it. `unnest` stays out on both its witnessed rows.

Two corpus gaps closed to get there, each verified against the whole
claimed surface first: a non-empty JSON array and a null-VALUED key (without
them every json expander either raised — `json_array_elements` rejects a
non-array — or never saw a JSON null), and a THIRD polymorphic family whose
array holds a NULL ELEMENT. That last one closed a real inconsistency: a
hand fixture witnessed `unnest(anyarray)` while the probe read the same
signature as no-null-found, because every array in the corpus was
NULL-free. The fixture and the classifier now agree, which is the state
they should never have been out of.

**THE WINDOW TABLE IS RE-KEYED TO SIGNATURES (2026-08-09)** — the decision
this register recorded above ("ALL SEVEN plus the two operator sets,
aggregates and window functions not excepted"), carried out for the window
half. `NEVER_NULL_WINDOW_FNS` became `NEVER_NULL_WINDOW_SIGNATURES` (the
five ranking rows, all zero-argument) and gained a sibling,
`STRICT_TOTAL_WINDOW_SIGNATURES` — the window analogue of
`STRICT_TOTAL_BUILTINS`, and the reason the re-key was needed at all:
**`lag(price, 1, 0)` cannot be NULL** because the third argument is the
DEFAULT PostgreSQL returns instead of the out-of-partition NULL, while
`lag(price)` and `lag(price, 1)` can and are witnessed. One name, opposite
verdicts, exactly the `lower`/`upper` shape one table over. `ntile` stopped
being a hard-coded branch in the walk and became an ordinary row of the new
table, which is what its claim always meant. The dispatch is
`resolveBuiltinWindowTotality`, sharing its survivor selection with the
scalar resolver through an extracted `selectBuiltinRows` so the two cannot
fork — they ask different verdict tables about the SAME survivors. Measured
against the engine, before and after: `lag(price, 1, 0)` and
`lead(price, 1, 0)` moved nullable → notNull; `lag(price)`, `lag(price, 1)`,
`nth_value(price, 2)` and a NULLABLE third argument all stayed nullable.

One correction the measurement forced, worth keeping because it was
asserted wrongly in this register a paragraph ago: `first_value`/
`last_value` were ALREADY notNull under the parser's default frame — the
walk has handled them at the `FRAMEOPTION_DEFAULTS` gate since the window
slice, and reading the claim tables rather than running the walk is what
produced the false claim that they were not. The curated-table suite gained
the stronger assertion the re-key makes possible: each window key must be a
real `prokind = 'w'` row, so a typo fails instead of silently claiming
nothing.

**THE OPERATOR BATCH LANDED (2026-08-09), and it is the largest single
precision move of the session**: 115 rows over 17 symbols into
`TOTAL_OPERATORS` — containment and overlap (`@>`, `<@`, `&&`), range and
network position (`<<`, `>>`, `<<=`, `>>=`, `-|-`, `&<`, `&>`), jsonb key
existence and path deletion (`?`, `?|`, `?&`, `#-`), prefix match (`^@`)
and the bitwise pair (`&`, `|`). These are the operators an application
actually writes — `tags @> ARRAY['urgent']`, `meta ? 'user_id'`,
`ip <<= '10.0.0.0/8'`, `span && int4range(10, 20)` — and all of them read
nullable until now. Every row was unwitnessed across the corner corpus AND
convicted by hand on the classes that corpus reaches for it: an array
holding a NULL ELEMENT, the empty array, the empty range and multirange, a
jsonb null and a null-VALUED key. They answer a plain boolean, and where
the operands are incompatible they RAISE — `inet & inet` across families
and `bit & bit` at different widths are the two that prove the criterion
rather than assume it.

`TOTAL_OPERATORS` only. `STRICT_OPERATORS` is a separate property with a
separate consumer — that file's founding lesson, learned when one shared
set turned out to be wrong for each half in opposite directions — and
nothing in this batch was measured for strictness. The totality probe holds
all of it: 38 operator names → 673 signatures, every one executed.

**THE WORK LIST IS EMPTY BUT FOR NINE ROWS (2026-08-09): 1832 → 9.** The
remaining clusters went through `tests/probe/cluster-sweep.ts` by catalog
ROLE — `pg_amproc` 158, `pg_type`'s I/O 123, `pg_aggregate`'s support 75,
`pg_cast` 107, `pg_range` 9, `pg_operator.oprcode` 748, and the 633 rows no
role claims — every row probed against the corner corpus plus the sweep's
degenerate staging values, never a sample. 1292 landed in
`SWEPT_TOTAL_SIGNATURES`, a table kept SEPARATE from the curated ones by
decision: those are an argument, each name there because somebody reasoned
about it, and burying that under a thousand rows nobody argued about
individually would cost the comments their meaning. Signature-keyed without
exception, because a name-level claim would re-import exactly the
family-resemblance reasoning the sweep exists to refute.

**The oprcode cluster is the one worth reading.** Its argument is not
resemblance but IDENTITY: each of those 748 rows is the implementation of an
operator whose totality was convicted individually one batch earlier. The
sweep then found 16 NULL-capable, and every single one backs an operator
already witnessed NULL — `close_ls`→`##(line,lseg)`,
`path_add`→`+(path,path)`, `json_object_field`→`->(json,text)`. Two
independent derivations agreeing across 748 rows is the strongest evidence
this surface has produced.

**Two guards fired, and both were right to.** The witness corpus's
loop-closer refused `current_schema()`: the sweep convicted it, but its NULL
route is `search_path` state rather than input, and a hand fixture had
witnessed it — the hand witness outranks the sweep's silence, which is the
whole reason that assertion exists. And the surface suite's "actually
evaluated a substantial surface" guard failed at 270, because its premise
INVERTED: the rows did not stop being executed, they moved into `claimed`,
where the totality probe runs them instead. Re-based on every row some suite
decides by RUNNING it, with the migration recorded rather than the threshold
quietly lowered.

The sweep also showed a staged value can HIDE a row as well as convict one:
its money value sits at the type's negative extreme, every combination
overflowed, and the three `cash_div_int*` rows came back all-raised. They
are claimed on the corner corpus's evidence instead, with that noted.

**What the nine are**, and none is an open question: two are the poison
family (`convert_to`/`convert_from`, permanently skipped), four are
hand-witnessed past what the machine can reach (`current_schema()`,
`regexp_match`'s three-argument row, `regexp_substr`'s five- and
six-argument ones), and three are window rows the walk decides at the FRAME
rather than from a table (`first_value`, `last_value` under the default
frame; `nth_value` is witnessed — a frame shorter than N has no Nth row, and
unlike `lag`/`lead` it has no DEFAULT argument to answer with).

**`COHERENT_CALLS` CLOSED THE LAST HARNESS LIMIT (2026-08-09).** The corpus
is keyed by TYPE, which is right for almost everything — a value good for
`text` is good in any text position — and breaks exactly where a row needs
several arguments valid AT ONCE:
`has_column_privilege(name, text, text, text)` wants a role, a relation, a
column OF that relation and a privilege, and one `text` list cannot be a
relation and a privilege simultaneously. Past the combination cap the
sampler varies one argument from a baseline, so every combination it built
had an invalid member and 28 rows raised everywhere with the corpus holding
every value they needed.

`COHERENT_CALLS` is a signature-keyed table of argument lists known valid
together, appended to the generated combinations and run like any other —
evidence, not a shortcut, and a NULL from one witnesses as loudly. **19 rows
claimed, and the `privilege-triple` group is gone from the unprobed pin
entirely.** The other 9 moved to a new group that names the real blocker:
a fresh PGlite has no foreign-data wrapper, no foreign server and no
sequence, so a coherent call cannot name an object that does not exist —
the DATABASE rather than the corpus, and closeable only by creating them.

**It arrives late, and that is the lesson worth keeping**:
`date_trunc(text, timestamptz, text)` is the same problem and was answered
three times by RAISING `MAX_COMBOS` instead — 512 → 1024 → 2048, once per
growth of the text corpus, each time restoring one row's coverage by
enlarging every capped signature's cross product. Its entry is in the table
now, so that row no longer depends on the cap at all.

**THE `cstring` SKIP WAS WRONG AND IS REVERSED (2026-08-09, on review).**
The pin recorded it as a DECISION — 186 type-I/O entry points no query
writes — and writing the decision down is what made it reviewable, which is
the case for pins in one line. The reasoning was triage ("spend effort where
a claim changes a real query") applied where the effort is ONE corpus value,
and that is the same mistake `generate_series` drew out: if the engine reads
186 signatures as nullable and nothing witnesses it, "nobody calls them" is
not a reason. `int4in('42')` is a legal call. **45 promoted, and
`no-generator` fell 652 → 550.**

What the reversal left behind is honest and new: 57 rows moved to
`raised-everywhere` under their own group — an input function whose type's
INPUT SYNTAX none of the corpus's cstrings matches. That group is marked
CLOSEABLE by more cstring shapes, unlike the eight above it, which are
PostgreSQL refusing.

**THE `no-generator` PIN LANDED (2026-08-09) AND PAID IMMEDIATELY.** It was
the last of the four unclaimed categories with no recorded reason, and the
reason belongs to the TYPE rather than the row — one missing type blocks
every signature taking it, and `internal` alone blocked 520. Writing those
reasons forced the question nobody had asked: is a literal IMPOSSIBLE, or
merely ABSENT?

**The answer for nineteen of the thirty-eight types was "merely absent".**
`'{1,2}'::float8[]`, `'<a/>'::xml`, `'pg_class'::regclass`,
`'{a}'::cstring[]`, `'1:1:'::pg_snapshot` and the whole reg* family all run,
and had never been tried. 102 signatures had been classified unprobeable
behind them for no reason anybody could state — 60 promoted on the sweep's
evidence, 5 newly witnessed, the rest joining the unprobed pin with a real
reason. `anycompatiblemultirange` turned out to be missing from the
polymorphic families outright.

What is left is nineteen types and every entry names which of two things it
is: REFUSED (`internal`, the statistics and BRIN summary types, the handler
return-contracts — PostgreSQL declines the cast) or DELIBERATELY SKIPPED
(`cstring`, which is not refused — `textin('abc'::cstring)` runs — but is
186 type-I/O entry points no query writes). That distinction was the whole
point of writing it down: the two ask completely different things of the
next reader, and only one of them is permanent.

**The loop-closer caught `current_schema()` for the SECOND time**, and the
repeat is the useful part rather than an embarrassment: the promotion filter
selected rows that were convicted and on the work list, and forgot to
subtract rows that already have a WITNESS. The rule is now explicit —
promotion subtracts the witness corpus, always — and the guard is what
enforces it either way.

Surface after: claimed 2852, no-null-found 9, null-witnessed 293,
raised-everywhere 114, no-generator 652, volatile 281. **All four unclaimed
categories now carry a pin with reasons** (`WORK_LIST`, `UNPROBED`,
`NO_GENERATOR`; `volatile` is the catalog's own marker and self-explaining),
so nothing on this surface can change silently.

**THE CALL-SHAPE CENSUS (2026-08-09) closes the class of bug the rest of
this work kept hitting**, and the user's question is what named it: the
ENUMERATION was never wrong — `builtin-surface.test.ts` asks pg_catalog for
every signature and asserts it classified all 4201 — so nothing was ever
"missed" in the sense of going unlisted. What went wrong four times was
narrower and worse: **PostgreSQL had RECORDED the thing that changes how a
call must be built or how its result must be tested, and the probe did not
join to it.**

  - `provariadic` names the ELEMENT type; reading `proargtypes` alone made
    the probe pass the declared ARRAY positionally, a type error rather than
    a call — 19 rows read as unprobeable and four real witnesses were hidden
    behind that.
  - `prorettype`'s composite kind makes `IS NULL` mean ROW-is-null; two rows
    carried witnesses for a record of NULLs, which is a value.
  - `pg_cast` was not consulted at all, and that one was UNSOUND.
  - `proretset` was read, but the question asked of it took one arbitrary
    row.

`tests/unit/query/call-shape-census.test.ts` classifies EVERY column of the
four catalogs the probes read — 73 of them across pg_proc, pg_operator,
pg_cast and pg_aggregate — as `shape` (changes the call), `result` (changes
the null test), `scope` (decides whether to probe at all) or `irrelevant`
WITH a reason. It is `node-census.test.ts`'s instrument pointed at the
catalog, and the mechanism is the same: writing "irrelevant" next to
`provariadic` would have been visibly false, which is the sentence nobody
was ever asked to write. A `shape` or `result` verdict is CHECKED rather
than decorated — the column name must appear in a probe source, crude enough
to miss a wrong join but exactly enough to catch a column that appears
nowhere, which was the actual failure four times over.

It convicted twice while being written, which is the liveness that matters:
`oprkind` was classified `shape` and nothing reads it (the probes take
prefix-ness from `oprleft = 0`, the same fact said better — and postfix
operators went in PG14, so the two can no longer disagree), and ten verdicts
were markers rather than reasons.

**THE UNPROBED SURFACE IS AUDITED AND PINNED (2026-08-09): 162 → 79.** The
`raised-everywhere` column was the last place a nullable claim could sit
with nobody having looked, and it is now closed the same way the work list
was — every row grouped by the REASON PostgreSQL declined it, asserted in
both directions, so a future function landing there fails until someone
says why.

Getting there closed three gaps and found one bug. **The bug: every VARIADIC
row was probed with its declared ARRAY type passed positionally**, which is
a type error rather than a call — `provariadic` names the ELEMENT type, and
`json_extract_path(j, 'a', 'b')` is the call PostgreSQL wants. Nineteen rows
had been probed in name only because of it. Fixing it produced four
witnesses immediately: all four `*_extract_path*` rows are NULL for a
missing path, which the walk's own exclusion comment had asserted since the
beginning with nothing checking it. **The construction had to be written
three times before it was written once** — the surface suite passed the
array, the totality probe appended the array type a SECOND time (the same
mistake spelled differently), and the sweep repeated the first. It lives in
probe-values.ts now, beside `nullTestExpr`, for the reason that file exists.

Three corpus values closed the rest of what was closeable: a real GUC name,
a text-search parser name, and a macaddr8 with FF:FE in the middle (which is
what `macaddr(macaddr8)` needs to narrow to six bytes). **What remains is
seven reason groups, and only one is about the harness rather than
PostgreSQL**: 27 `has_*_privilege` rows need a role, an object AND a
privilege valid together, and capped sampling varies one argument at a time
from a baseline — the same limit `MAX_COMBOS` documents, now hitting a
family the cap cannot reach at any affordable size. The other six are
PostgreSQL declining: an OID of an object the probe database does not have
(20), a shape the probe cannot supply — a column definition list, a
composite target, a valid modulus/remainder pair (12), the WASM build's own
limits (libnuma for the XML exporters, no LATIN source for `to_ascii` — 6),
a pseudo-type no literal constructs (5), an aggregate transition function
called outside its aggregate (2), and two whose implementation PostgreSQL
removed outright.

**THE PRIVILEGE-NAME GAP CLOSED, AND THE PIN EARNED ITSELF ON ITS FIRST RUN
(2026-08-09).** Two corpus values — a real role name and a real relation
name — closed the last 52 of the `has_*_privilege` family, whose remaining
spellings identify the grantee or the object by NAME and raise for one that
does not exist. `raised-everywhere` went 127 → 93, 25 more witnesses, 25
promotions. The pin fired the moment the newly evaluable rows landed, which
is the whole point of it: they could not sit in the queue unexplained.

**It also exposed a real defect in the probe itself, and the route to it is
the instructive part.** Chasing one of those rows produced a witness the
harness REJECTED — PostgreSQL returned `(,,,)` rather than NULL. `IS NULL`
on a COMPOSITE is ROW-is-null, true when every field is null, and that is
not the question either suite asks: a record of NULLs is a value, and a NOT
NULL column holding one is not lying. Two witnesses rested on it
(`pg_stat_get_wal_receiver`, `pg_stat_get_backend_subxact`) and were wrong
evidence — conservative, so nothing unsound shipped, but wrong.

The fix is `nullTestExpr` in probe-values.ts, casting a composite result to
text before the test. It landed in the surface suite FIRST and the totality
probe immediately disagreed with it about the same signature inside one run
— the two-drifting-copies failure the shared corpus file exists to prevent,
demonstrated in miniature. It belongs in the shared file, and that is where
it now is.

**THE WORK LIST IS PINNED (2026-08-09), which closes the last drift gap in
this surface.** Everything else here already enforced no drift on every run
— the totality probe EXECUTES all 2753 claimed rows against the corner
corpus and fails if PostgreSQL ever answers NULL, the witness corpus
re-checks that each witness still witnesses, the curated tables are held to
pg_catalog's existence, the capture's scope is asserted both ways — but the
CLASSIFICATION had a hole: a function a future PostgreSQL adds arrives
unclaimed, lands in `no-null-found`, and the run PASSES with the queue
quietly larger. Nobody would learn until they regenerated the work-list
document by hand.

`node-census.test.ts`'s pattern closes it: `WORK_LIST` names the nine
remaining signatures WITH the reason each is still there, asserted in BOTH
directions. Deliberately not a count — a ratchet lets a regression hide
behind an unrelated improvement, which this project rejects everywhere else
— and deliberately a reason rather than a marker: an entry is a decision,
and if the reason would be "nobody has looked yet" then the honest move is
to look. Both directions were verified by MUTATION rather than assumed: an
entry removed fails as unexplained, an entry invented fails as stale.

**THE NON-FuncCall NODE KINDS WERE AUDITED (2026-08-09) AND THE CAST WAS
THE ONLY HOLE.** The cast finding raised an obvious question — what ELSE
reaches a builtin without parsing as a `FuncCall`? — so every expression
node kind in `node-census.test.ts` went through an engine-versus-PostgreSQL
differential on NOT NULL columns: 41 cases, `A_Indirection` subscript and
slice, `MinMaxExpr`, `SQLValueFunction`, all six `XmlExpr` spellings,
`XmlSerialize`, every `SubLink` form, `RowExpr`, `A_ArrayExpr`,
`CollateClause`, `NullTest`, `BooleanTest`, `CaseExpr`, `CoalesceExpr`, the
`A_Expr` sublanguages (IN, BETWEEN, LIKE, ANY/ALL over an array, IS
DISTINCT FROM), `GroupingFunc`, and the seven JSON node kinds.

**Zero unsound claims**, and the audit CONVICTS rather than merely passing:
five of the cases produced a real NULL from PostgreSQL — `arr[5]` past the
end, a scalar subquery over zero rows, `CASE` with no `ELSE` and no branch
taken, `JSON_VALUE`/`JSON_QUERY` on a missing path, and `JSON_ARRAY` over an
empty subquery — and the walk reads every one of them nullable. The census's
per-kind `why` strings turn out to be load-bearing and accurate; the ONE
that had gone stale was `TypeCast`'s own ("preserves arg"), corrected in
place.

**THE PRIVILEGE FAMILY CLOSED THE LARGEST RAISED-EVERYWHERE BLOCK
(2026-08-09)**: 84 of the 162 rows were `has_*_privilege` and `pg_has_role`,
which reject any word that is not a privilege — so seven of them joined the
text corpus and the block resolved. It resolved by SPLITTING, which is the
part worth recording: `has_table_privilege(oid, …)`,
`has_column_privilege`, `has_any_column_privilege`, `has_sequence_privilege`
and `has_largeobject_privilege` answer NULL for an object that does not
exist, while `has_database_privilege`, `has_schema_privilege`,
`has_function_privilege`, `has_type_privilege` and `pg_has_role` answer a
value for the same input. Nothing about the names predicts which, so the
family is keyed row by row: 20 new witnesses, 15 promotions. `MAX_COMBOS`
moved 1024 → 2048 for the third time, always for the same signature —
`date_trunc(text, timestamptz, text)` is `len(text)² × 3`, so growing the
text corpus is what moves the cap, and that rule is now written where the
constant is.

**FINAL SURFACE (2026-08-09): 4201 signatures — claimed 2753,
null-witnessed 277, no-null-found 9, raised-everywhere 127, no-generator
754, volatile 281.** The work list went 1832 → 9 in one session, and the
nine are the accounted-for ones listed above. What remains is structural
rather than open: `no-generator` is `internal` (PostgreSQL refuses the type
from SQL) and `cstring` (type I/O entry points), `raised-everywhere` is what
PostgreSQL declines for every input the corpus can build, and `volatile` is
excluded on the catalog's own marker. Each is EXPLICIT, which is the
discipline's bar — a nullable claim is witnessed or its unwitnessability is
recorded — and none is a promotion candidate hiding as a gap.

**A RANK-1 UNSOUNDNESS, FOUND BY THE CLUSTER SWEEP AND FIXED (2026-08-09):
a cast does NOT preserve its argument's nullability.** The walk's `TypeCast`
branch concluded "cast preserves arg nullability" and that is false for ten
pg_cast rows, on input no application would call exotic:

    SELECT ts::time  FROM t;   -- engine: notNull, PostgreSQL: NULL ('infinity')
    SELECT j::int4   FROM t;   -- engine: notNull, PostgreSQL: NULL ('null'::jsonb)

`ts` and `j` are NOT NULL columns; the NULLs are the CAST's own. The ten are
the seven jsonb → scalar conversions (a JSON null becomes a SQL NULL) and
the three timestamp → time ones (an infinite timestamp has no time of day).

**Why a whole session of function and operator work could not reach it**:
`x::time` parses as a `TypeCast`, never a `FuncCall`, so it does not enter
the builtin dispatch where every other totality question is answered. It
surfaced only because the cluster methodology cuts by CATALOG ROLE rather
than by name — `pg_cast.castfunc` is a role, and sweeping it reaches
functions by the job PostgreSQL gives them instead of by how a query spells
them. That is the argument for finishing the role sweep rather than the
reverse.

**Fixed from the CAPTURE rather than a list** (the user's call, and the more
general one): `CatalogSnapshot.builtinCasts` holds every pg_cast row with its
implementation function's signature, and `resolveCastTotality` answers a cast
by asking the SAME verdict tables the function dispatch asks. So every future
NULL-capable cast is answered without anybody maintaining a list of the ones
somebody noticed. A `castfunc` of 0 — binary-coercible or an I/O round trip —
computes nothing and is total by construction. A pair pg_cast does not carry
is "unknown" and keeps the old reading, so this NARROWS a wrong claim rather
than withdrawing every cast's.

The soundness fix would have been a precision regression on its own —
`n::integer` reads nullable if `int4(numeric)` carries no claim — so the
`cast` role sweep's convictions landed with it: 24 cast function NAMES and 57
SIGNATURES, the split falling exactly where the family does (`int4(numeric)`
total, `int4(jsonb)` witnessed). Measured after: `ts::date` notNull,
`ts::time` nullable, in the same query. Pinned by `cast-non-total.sql`; the
jsonb half is `cast-jsonb-scalar.sql`, which carries an explicit `@raises` /
`@no-rows` pair because every shared `events` row holds a jsonb OBJECT and
casting one RAISES rather than returning the NULL the fixture is about — the
execution oracle's gap, declared rather than left silent.

**THE OPERATOR SURFACE IS CLOSED (2026-08-09, second pass): ZERO operator
rows remain in the work list.** The first pass left the geometry-only
symbols, the prefix math and the pattern-ops comparisons on triage; the
user's correction is the one to keep — triage decides where to spend
INVESTIGATION, and is not an argument for leaving convicted rows unclaimed.
So all 83 remaining rows were probed individually against the DEGENERATE
shapes the corpus lacks: a zero-length lseg, a zero-radius circle, a
single-point polygon and path, horizontal and vertical lines. **That sweep
paid for itself twice**, and both findings were rows about to be promoted
on the corner corpus's silence:

  - `path <-> path` is NULL whenever either path holds a SINGLE POINT
    (`path_distance`), which is what keeps `<->` out of the name table.
  - `line ## lseg` is NULL for a ZERO-LENGTH segment (`close_ls`) — and
    only for a line with no horizontal component, so BOTH halves of that
    combination had to enter the corpus before the machine could re-find
    it.

Both are witnessed. Four corpus values closed the gaps that hid them, each
checked against the whole claimed surface first: the single-point path, the
zero-length lseg, the vertical line, and `record`'s CAST spellings — an
uncast `ROW(1,2)` is decomposed by the parser, so `ROW(1,2) *< ROW(1,2)`
looked for `integer *< integer` and left all six record-image comparisons
probed in name only.

**`TOTAL_OPERATOR_SIGNATURES` completes the re-key** the charter decided for
all nine tables: the POSITIVE signature-keyed half, read beside
`NON_TOTAL_OPERATOR_SIGNATURES` — one granting where a name cannot, the
other exempting where a name over-grants. Four symbols needed it, each one
witnessed row away from being claimable outright, and one of them matters a
great deal: `jsonb @@ jsonpath` is NULL under a strict path, and it had been
holding `tsvector @@ tsquery` — the full-text search match — hostage to the
shared name. Likewise `line # line` held bitwise XOR on the integers. Both
loop-closers were extended to the new table, and the totality probe filters
a signature-keyed symbol to exactly the rows its keys claim, the same way
the function side treats an addition-only name.

Final operator state: **0 no-null-found, 0 raised-everywhere, 0
no-generator**, 19 witnessed, 12 volatile, everything else claimed and held
by execution. It is the first of the four kinds to be finished.

Surface after the session's five batches: claimed 1220, no-null-found 1526,
null-witnessed 252, raised-everywhere 168, no-generator 754, volatile 281.
What remains in the queue is internal machinery — the C functions behind
operators, type I/O, cast functions and geometry — plus the two mechanism
items (`no-generator`'s `internal`/`cstring` bulk, and the six VARIADIC
multirange rows the surface suite calls positionally).

**The prerequisite is DISCHARGED (2026-08-09): pg_catalog signatures reach
the snapshot.** `CatalogSnapshot.builtinFunctionSignatures` (153 claim-table
names → 327 pg_proc rows, carrying per-signature strictness, prokind,
aggkind/aggnumdirectargs and the variadic type — the resolution keys the
three answers established) and `builtinOperatorSignatures` (21 symbols → 558
pg_operator rows, operand/result types plus backing-function strictness).
ENVIRONMENT beside the seven sibling captures, out of the diff by
construction; scope imported from the claim tables themselves so it cannot
drift. **Captured but NOT read** — nothing in the walk or adapter consults
either field until the refactor starts; spot pins are in
`tests/unit/catalog/snapshot.test.ts`, including `path + path` with
`strict = true`, the in-data reminder that the capture settles strictness
and never totality. Governing invariant: eliminate only on certainty,
which makes an incomplete coercion model safe. Non-goals are explicit —
no type inference, no tiebreak algorithm, no polymorphic return types, and
types never leave the engine (`PREPARE` stays the type oracle). It carries
its own test suite: per-overload NULL witnesses for functions, aggregates
and window functions, with the control line that keeps a witness honest.
The real cost is re-keying the claim tables — ALL SEVEN plus the two
operator sets, aggregates and window functions not excepted (decided
2026-08-09) — from name entries to signature entries (153 names → 327 rows,
21 symbols → 558), each needing its own verdict.

**Before or beside the consumer build: widen the generated suite's
surface** — `docs/generated-surface.md` (2026-08-05), a self-contained
handoff. The third fix phase produced the measurement that justifies it:
across seven engine changes and eight closed findings the generated
corpus's 8980 queries reported zero disagreements both before and after,
because it could not EXPRESS a single falsifying input — five of the eight
needed schema vocabulary `fixtures/schema.sql` does not have, three needed
a query shape with no axis, and none was reachable from the existing
corpus. The generator varies query STRUCTURE over a FIXED schema
vocabulary, and the engine is a function of (AST, CATALOG) with only one
argument explored. Four items in cost order: a CATALOG-feature census in
`node-census.test.ts`'s exact shape (the pattern that catches
unknown-unknowns, currently applied to parse-tree node kinds alone — every
sweep-3 finding arrived through a node type already classified `handled`);
diffing each curated name table against `pg_catalog` where the catalog
records the property; probing the TOTALITY tables by execution where it
does not (`proisstrict` is strictness, a different property — this is the
third sweep running where a curated table yielded); and a schema axis for
the generator, which would have caught five of eight on its own. The first
three are an afternoon each.

**The imprecision closure raised this item's priority** (2026-08-06, recorded
in the doc): the corpus reported zero disagreements across both new
mechanisms too, and this time the cause is sharper than "it missed a
finding". `t`, `u` and `v` — the three relations every generated structure is
built over — declare NO foreign keys, and the corpus has no table function
with a body to call. So foreign-key entailment and the body reading, both of
which move claims in the UNSOUND direction, have ZERO generated coverage and
rest entirely on hand-written fixtures and their gate pins. A schema axis is
now the only way the corpus can reach two mechanisms the engine already
ships.

**Item 1 is BUILT (2026-08-06): the catalog-feature census**,
`tests/unit/query/catalog-census.test.ts`, in `node-census.test.ts`'s shape on
the other axis. 86 features classified — 57 handled, 12 gated, 12
conservative, 5 environment — of which **64 are carried by the fixture schema
and 22 are not**, and those 22 are the axis vocabulary item 4 was waiting for.
Each entry names the walk or adapter branch it feeds, so it is a claim about
the engine rather than a note about the schema; `gated` is its own category
because for a fact the ADAPTER drops before the walk can ask — a NOT VALID or
DEFERRABLE key, a `CHECK … NO INHERIT` in the tree variant — what the schema
must carry is the input the gate REJECTS, and a gate with nothing to reject is
untested. The hand-written list can only fail on what somebody listed, so the
census also declares the value domains of seven enumerated catalog columns
(typtype, relkind, prokind, contype, proargmodes, attgenerated, attidentity)
and compares them against the live catalog both ways: that half is what
catches a feature nobody wrote down, and a PG version adding a relkind fails
it the way a new node type fails the node census. Five assertions, each
mutation-tested to fail alone; the gap list prints every run, with reasons
behind `CATALOG_CENSUS_REPORT=1`. Four of the 22 gaps are held by suites that
build their own catalog (the second schema, the cross-schema overload, the
variadic gate — the fixture harness cannot hold two schemas); the other 18
reach the walk from nowhere. Deliberately deferred rather than dropped:
"where the walk has a table of names, the census entry is the table" — the
eight tables are module-private and the only assertion worth making about
them is item 2's, so exporting them is item 2's first move. It found one
thing on the way, item 2's exact shape and left for it:
`builtinPolymorphicFunctions` is captured as `typtype = 'p'`, which is
PSEUDO-type and not polymorphic (trigger, void, cstring, record, internal
ride along), so it holds 572 names where its own comment claims 68 — safe
direction, since the sole consumer refuses on it and over-capture costs
precision only.

**Item 4 is BUILT (2026-08-06): the schema axis**,
`tests/unit/query/generated/schema-axis.test.ts` with `schema-variants.ts` —
seven variants, eight assertions, and a rank-1 unsoundness on the first run
(closure entry at the top of section 2). The design collapsed once the
generator was read properly: its schema contract is a set of NAMES, so a
variant that keeps `t`/`u`/`v` and changes only the CATALOG FEATURES behind
them runs the whole structural corpus unchanged, with no generator change at
all. Item 1 is the vocabulary literally — the census list moved to
`tests/unit/query/catalog-features.ts`, both suites read one copy, and each
variant declares by NAME what it brings under generation with the suite
asserting its snapshot actually carries it. Two oracles only, ordered column
NAMES and no falsified notNull, because a wider schema finds unsoundness and
wrong column lists and no imprecision; parameterised queries are skipped and
counted. Bounded at 420 queries per variant (a stride sample of 8854) against
`empty` and the variant's own generated state, ~14s, with
`GENERATED_ALL_SCHEMAS=1` for the full corpus. **5 of the census's 22 gaps are
now under generation**; the other 17 are reported by name, and most are not a
schema-patch problem at all — a `LANGUAGE sql` table function has nothing
calling it until the generator grows a FROM-item axis, and a procedure has no
call site in any query. That distinction, unreachable-by-a-schema-patch versus
uncovered, is this item's residue. One thing the build found on its own, which
sharpens the register's measurement: FK entailment had zero generated coverage
not merely because t/u/v declare no keys — `u.t_id`'s seed generator
DELIBERATELY dangles a quarter of its rows so the corpus's RIGHT and FULL JOIN
structures have something to extend, so the data was built to violate the key
the mechanism reasons from.

**Item 4's residue is CLOSED (2026-08-06): the function-call axis.** The
generator called exactly ONE function — `max` — while the fixture schema
defined 66, so a VARIADIC parameter, a DEFAULTED argument, an INOUT
parameter, a user aggregate without INITCOND, a user window function, a
SECURITY DEFINER body and — the one that mattered — a `LANGUAGE sql` body
being READ BACK all had no call site. Two projections (`fn-call`,
`fn-agg-window`) and six new schema functions close it: **the corpus grew
8980 → 10456 queries, notNull claims 16631 → 17747, all falsifiable, with
zero rejections, refusals, column-list disagreements or violations.** Both
mechanisms the register measured at zero generated coverage are now covered
— foreign-key entailment by the schema axis, the body read-back by this.
**The FROM-ITEM axis followed immediately**: `srf-cross` and `srf-left` put a
`RETURNS SETOF u` function where `u` stood, closing the ROW-returning half of
the body read-back (class A — the declaration erases the table's NOT NULLs and
the body is the only sound source of a guarantee). Corpus 10456 → 10864,
notNull claims 17747 → 18683, all falsifiable. `function-overloaded-across-schemas`
closed with it, via an `app_s.gfn_sd(integer)` beside public's `gfn_sd(text)`.
**The COMPOSITE-STAR projection closed it out**, and found a defect on the way:
`expandCompositeStar` expanded a cast to a `CREATE TYPE` composite and REFUSED
a cast to a TABLE's row type, which PostgreSQL expands — `(NULL::trow).*` and
`(h.row1).*` both give [a, b], measured, and the walk answered
UnsupportedNodeError. The two-step fallback (composite first, relation second)
that `columnsForReturnType` has always taken was never wired into
`fieldsOf`; it is the SAME latent defect the third fix phase's audit closed for
the unnest element-type resolver, at its second site. Sound — a refusal, not a
wrong shape — but unnecessary, since the engine held the information. Fixed and
pinned by `composite-star-table-row-type.sql` in both spellings, which reach
`fieldsOf` by different routes. Corpus 10864 → 11632, notNull claims 18683 →
19043. **`sub-partition` then closed the list**, and was cheaper than twice
predicted: "needs t/u/v restructured" was true of the GENERATION half and
false of the census half, which only wanted a two-level tree somewhere.
`part_2` is now itself partitioned under `part_p`. Making it discriminating
needed a fact that can DIVERGE at depth, and for partitions there is
essentially one — a partition may not drop a parent's NOT NULL, so the flag
facts are identical however deep the tree, while a BEFORE ROW trigger on a
GRANDCHILD fires on a write naming the root (measured). Pinned by
`trigger-subpartition-routed.sql`, mutation-tested: a one-level subtree union
fails that fixture and ONLY it. Deliberately NOT under generation — the
discriminating fact is a DML/RETURNING shape and the corpus's DML axis targets
t/ck/tags, while the facts it does generate cannot differ at depth; the
suite's report says so where the count is printed, so "0 actionable" is not
misread as "everything is generated". **Actionable census gaps: 9 → 0.** `table-row-type-column` is narrower than it
reads — the WALK BRANCH (resolveCompositeType falling through to the relation)
is now exercised by `SETOF u`; only the column SPELLING is missing, and that
needs a composite-star projection the target-list model cannot express, since
a `(col).*` target has no fixed arity. `sub-partition` needs t/u/v
restructured and is disproportionate. It found one
NEW imprecision, recorded not fixed: the walk reads a body back but binds
only the arguments the CALL supplies, so a DEFAULTED parameter is unbound
and reads nullable where PostgreSQL substitutes the default and the result
is total. Closing it means substituting declared defaults into the body
scope before descending.

**Item 3 is BUILT (2026-08-06): the totality tables, probed by execution**,
`tests/unit/query/totality-probe.test.ts`, seven assertions each
mutation-tested to fail alone. 789 signatures → 13,270 expressions, 10,866
evaluated and 2,426 raised; a plpgsql probe with per-expression error
isolation evaluates the whole surface in one statement, and 20,000 probes run
in ~130ms. Arguments come from a per-type corpus keyed on the input CLASSES
that historically broke a claim, with polymorphic parameters instantiated as a
FAMILY and every call `pg_catalog.`-qualified (six signatures raised on every
combination until the qualifier went on — `position`, `overlay`,
`current_user` and `session_user` are grammar). Each table is asked its OWN
claim, which is three different claims. Because a raise is not a finding,
silent non-coverage is the failure mode: every parameter type must have a
value generator, every signature must have evaluated at least once, and the
two exemptions are named with reasons and asserted both ways (`aclitem[] +
aclitem` and `aclitem[] - aclitem` are still declared with their
implementations removed, so they raise forever). The harness carries its own
POSITIVE CONTROL, asserted first: the ten expressions three sweeps removed
must still come back NULL, since every other assertion here is a negative.
Its three findings have their closure entry at the top of section 2.

**Item 2 is BUILT (2026-08-06): the curated tables, held to pg_catalog**,
`tests/unit/query/curated-tables.test.ts`, six assertions, each
mutation-tested to fail alone. It convicted on its first run and the biggest
finding was not in a table at all.

**`AGGREGATE_NAMES` is gone**, the `BUILTIN_SRF_NAMES` treatment applied to
the table the register had trusted longest. `prokind = 'a'` was in the
catalog the whole time, and the table had drifted in three directions at
once: 12 of PG18's 54 aggregates MISSING (`any_value`, `bit_xor`,
`range_agg`, the eight `json*_agg_strict`/`_unique` forms), two names
PostgreSQL has no function for (`cluster`, `listagg`), and five pure WINDOW
functions (`row_number`, `lag`, `lead`, `first_value`, `last_value`) that
can only be called with OVER and so reach no consumer.
`CatalogSnapshot.builtinAggregateFunctions` replaces it, ENVIRONMENT like
`builtinStrictFunctions`, and one predicate fixes all three directions.
Completeness had to be the goal rather than correction: the strict-scalar
gate excludes aggregates by asking this question, so an unrecognised name
proceeded to the strictness test, and an aggregate over zero rows is NULL
however strict it is. Nothing was reachable in PG18 only because
`builtinStrictFunctions` filters `prokind = 'f'` — safety by coincidence of a
DIFFERENT table's filter, now asserted rather than relied on.

**The rank-1 unsoundness it led to is in the WALK** and has its own closure
entry at the top of section 2: chasing why `row_number` sat in an aggregate
table reached `guaranteesSingleRow` and the windowed-call defect. That is the
audit heuristic paying its third dividend — sweep every hand-curated table
against the catalog it approximates — and the first time the table was the
route rather than the destination.

Three dead entries elsewhere, each measured at the parse tree before removal:
`trim` (the grammar rewrites every spelling to `pg_catalog.btrim`), `!=` (the
lexer converts it to `<>`), and `current_catalog`/`current_role`/`user`
(keywords the parser makes `SQLValueFunction`, never a FuncCall).
`builtinPolymorphicFunctions` re-keyed from `typtype = 'p'` to the `any…`
type names, 572 down to 65, closing item 1's residue.

What the catalog could NOT settle, recorded so it is not mistaken for
covered: `proisstrict` is strictness, not totality, so the four totality
tables are held to EXISTENCE only and probing them is item 3, now BUILT. The suite
prints the type-aware-overloads premise every run — **133 curated names cover
235 pg_catalog signatures; 21 operator names cover 558.**
`HYPOTHETICAL_SET_AGGREGATES` and `ORDERED_SET_AGGREGATES` are exactly
`pg_aggregate.aggkind` and are asserted EQUAL in both directions;
`NEVER_NULL_WINDOW_FNS` is deliberately a subset of `prokind = 'w'`, so only
its membership is a catalog question. One limit item 1 shares: the catalog
says a name EXISTS, never that it ARRIVES — `trim` and `!=` exist and never
reach the walk, and `current_user`/`session_user` are real functions whose
entries are dead anyway. Both took parse-tree probes, not the diff.

**Then the consumer build** — the slice plan is
`docs/consumer-design.md`, as above, with the arity-and-order gate in
its first contract-holding slice, now carrying twelve defects across
three sweeps that it would have caught — one of them (sweep-3 finding 7)
arity-preserving and therefore invisible to any check but the ordered
name comparison, which is the third such instance.

The semantic re-founding (section 5) is a standing parallel track; its
executable target list emptied when Wave 12 closed the origin
extensions, so its next candidates come from whatever the consumer's
corpora surface.

1. **Argument nullability** — built in full: the four sequencing steps,
   mechanism-A output narrowing, mechanism-C value-flow rejection, and
   source value-flow attribution with its quantifiers split (universal for
   narrowing, existential for the contract). The design and its empirical
   grounding are in `docs/argument-nullability.md`; no known wrong-claim
   class remains.
2. **New generator axes.** The generated suite ran its full axis space and
   found no defect, which per its own criterion is the signal to widen the
   axes. Widened so far: parameters and DML (item 1 above), then parameter
   *placement* — strict ON conjuncts, the mechanism-A cast inside an ON qual,
   HAVING, parameters inside a LATERAL body, a set operation's second branch,
   and LIMIT/OFFSET, all crossed with the wrappers
   (`generateParamPlacementQueries`). That round found no defect either, and
   confirmed three behaviours worth having on record: bind-time rejection is
   position-blind, inner-scope narrowing in a LATERAL body survives the cross
   join and degrades under LEFT JOIN LATERAL, and EXCEPT keeps the left arm's
   claims. Its residue is two refilter live-traps (`inner-on-refilters`,
   `having-refilters`) that flip with PostgreSQL's agreement if the recorded
   ON/HAVING narrowing extensions ever land.

   Deep join trees and window functions followed, and both came back clean.
   The deep axis (`generateDeepJoinQueries`): three joins over the t—u—v—ck
   chain, all five tree shapes × all 4³ kind combinations — 320 structures,
   plain projection only, setops/wrappers deliberately not crossed (the run
   reports the bound). It found no defect; its residue is 44 structures
   whose `a_ue` is unwitnessable because every u-null-extended row dies at a
   strict edge qual — more instances of the strict-qual imprecision row in
   the table below, verified 44/44 against a hand-checked join-semantics
   model (`deep-strict-edge-refilters-u`). The window axis: two projection
   entries crossing the full structural space (+540 queries), putting the
   walk's window dispatch — never-null ranking set, count's empty-frame
   zero, ntile's argument condition, the conservative offset/frame fallback
   — under the execution oracle for the first time. Zero falsifications, and
   `lag` of a NOT NULL column is witnessed NULL on first rows, as claimed.

   The enumerated axis list is now exhausted with no engine defect found
   since the MERGE-source collector gap. Per the generator doc's own
   criterion, the next widening is either a randomised generator over the
   grammar (now justified by evidence about which constructs are stable) or
   shifting effort to the first consumer, which items 1 and 3 below wait on
   anyway. Whatever a future axis finds becomes a permanent fixture with
   annotations, and an engine fix.
3. **The differential oracle** — assessed and demoted; see "Unbuilt
   verification strategies" for the findings. Neither candidate can verify
   this engine: one has no comparable analysis, the other is unsound in both
   directions outside a band our execution oracle already covers.
4. **The arity gate** — small, and waits for the first consumer to exist rather
   than being retrofitted.

**Two handoffs were chartered 2026-08-07 from that session's measurements.**
`docs/adversarial-sweep-4.md` attacks the six mechanisms that session added —
the prior it opens with is that probing two items recorded as SOUND produced
seven rank-1 unsoundnesses, and that the generated corpus cannot express five
of them. `docs/generated-surface.md` item 5 carries the other half: the corpus
exercises 24 of the walk's 34 catalog capabilities against the fixtures' 34, so
volume is blind on the axis where those findings lived. The sweep did not wait
for it; the two are independent.

**The FOURTH sweep RAN (2026-08-07) and its FIX PHASE is COMPLETE
(2026-08-07).** The report is `docs/adversarial-findings-4.md`. 169 probes,
**seven findings**: five rank-1 `notNull` unsoundnesses, two of which also
falsify a presence group; one rank-2 shape defect; one rank-3 param-contract
defect. Zero parity breaks and zero crashes — four sweeps at zero on both.

All seven are CLOSED, one commit per fix in the report's recommended order, with
the per-fix closure entries at the top of section 2. The quarantine directory is
retired: every fixture graduated into `tests/unit/query/fixtures/` with
corrected claims and witnesses, the sweep's DDL folded into the fixture schema,
and the section-B objects that produced nothing dropped rather than folded
(`sw4_def_*`, `sw4_ovd`, `sw4_def_body`, `sw4_self` — named here so "0
actionable" is not misread as "everything is covered"). Suite: 43 files, 3088
tests, 410 fixtures; the generated corpus's 14964 queries and the schema axis
both ran clean.

**Two deviations from the report, both recorded in the closure entries.** Its
recommended fix for finding 5 was WRONG — a sibling test, resting on two
measurements taken only over JSON_TABLE paths that always match — and four
shapes nobody had run put the boundary one step wider, at "inside a NESTED
path". And finding 7 landed as the wording decision alone, with no rule: the
class the report sketched is real and catalog-visible, and building for it would
have moved the line without arriving anywhere, because a plpgsql `RAISE` is the
same rejection with no catalog trace.

**`tests/probe/` does NOT retire empty, and did not.** `harness.ts` stays as
tooling — three sweeps rebuilt it privately and threw it away — beside
`builtin-null-rejection.ts`, the standing measurement behind finding 8 below.
The round files retired with the quarantine; each fix's CONTROLS graduated as
fixtures instead, which is what makes an OVERSHOOT fail rather than pass
quietly, and the negative sections' three uncovered shapes (`E4`, `E6`, `F2`)
graduated on the report's own criterion while the rest stand as the report's
record.

**An EIGHTH finding came out of taking finding 7's decision, and it is CLOSED
too** — as MECHANISM D, the fourth rejection channel in the parameter contract.
The decision scopes the must-not-raise convention to BUILTINS; probing that
carve-out instead of assuming it falsified it on the first try. Two tables (a
NULL argument, and a NULL element of an array argument) covering 13 signatures
across 15 positions, DERIVED by execution every run rather than curated — which
is what makes a table defensible here at all, given that this register's
totality tables drifted three times. The closure entry in section 2 has the
reasoning and the two deliberate boundaries.

Yield is 7 in 169 against sweep 3's 8 in ~155 — the same rate on findings and
a heavier severity mix, from two thirds of the budget. **What it does NOT
confirm is the charter's own prior.** Three of the seven are in the six
mechanisms the 2026-08-07 session added; four are older, and the two widest —
a foreign key onto a partitioned table captured from its per-partition CLONES,
and a `ROWS FROM` whose padding the declared column reading survives — are not
about code age at all. The report's reading, which is what should decide
whether a fifth sweep is ever chartered: **the discriminating variable is
POSITION, not age.** Five of seven are FROM items, where the engine's model of
"what rows does this produce" is thinnest and where a wrong answer is worst,
because a shape defect there misassigns every later flag. Two items for this
register fall out of it — the arity-and-order gate (section 1) now carries
THIRTEEN defects across four sweeps, four of them arity-preserving; and a new
standing check that is the converse of the curated-table audit: sweep every
catalog READ for rows PostgreSQL adds that nobody wrote (partition-cloned
constraints are the instance found; inherited constraints and index-backing
rows are the same class).

That decision is TAKEN (2026-08-07) and recorded in
`docs/argument-nullability.md` under "What a nullable parameter does not
promise": the contract is one-directional, and **no claim is made about a user
function's arguments beyond its declared parameter types**. The declared type
is the channel — a parameter declared as a NOT NULL domain is rejected at Bind
by mechanism A — and standard types are nullable by design. It is the dual, on
the nullable side, of the reachability question that document already records
as open on the `notNull` side.

**Chartered, STEP 0 DONE (2026-08-08): CATALOG-DRIVEN QUERY GENERATION** —
`docs/catalog-driven-generation.md` (2026-08-07), a self-contained handoff. Its
§7 now carries the measurement and the ranked list. **Six relations of 82** are
named across all 14,964 queries (five, plus `gm`, which §1 had miscounted as a
derived-table alias), giving 5 catalog profiles against the schema's 39. Of the
**47 census features that are relation-scoped** — itself measured, by removing
every relation from the snapshot and seeing which detectors go off — 33 are in
the fixture schema and **7 are reachable**. Every constraint mechanism the
engine reasons from is in the other 26: not one validated CHECK, not one
foreign key, no trigger, no view, no partition. The step's own deliverable is
that **the two admission orders barely intersect** — the 16-relation minimum
cover is mostly ISOLATED singletons, while the one 13-relation FK component
already contains `tags` (so the walker needs no new relation to start) and
carries only 8 of the 26; the other **18 sit on relations no single-column key
connects to anything**, which turns §3's "non-canonical joins are in scope"
from an option into a requirement. §5.2's nullable-FK list is corrected there
too: the column is `addresses.default_address_id` referencing `addresses`, a
SELF-reference, not `customers.default_address_id`. The
measurement that forces it: the generated corpus references EIGHT relation
names across all 14,964 queries, three of which are derived-table aliases, so
it queries FIVE of the fixture schema's 82 relations — and `t`/`u`/`v` carry no
keys, no constraints, no triggers. All NINE findings of the fourth sweep and
its fix phase were unexpressible in it, including the two ordinary ones. The
engine is a function of (AST, CATALOG) and the corpus explores one argument.

The direction is to FREEZE `t`/`u`/`v` — the fixtures that reference them keep
them, and nothing new uses them ever again, so the placeholders stop dictating
without anyone moving a pile of assertions between schemas — and point the
generator at the application schema already in `fixtures/schema.sql`, which is
not work to be done, since the hand-written fixtures query it extensively; generating over the catalog the way
`tests/unit/query/fixture-data/` already generates DATA over it, with the same
tier resolution and the same "no match is an ERROR, not a default" rule.
**The handoff's central decision is that COVERAGE and DISCOVERY are separate
instruments with opposite requirements**, and that conflating them is what has
made the generated suite hard to reason about. Coverage needs a bounded space
where every claim is adjudicated, deterministic and fast enough to gate CI —
that is the enumerated corpus and the fixtures, and their discipline is
unchanged. Discovery needs an unbounded space, consumes only SELF-ADJUDICATING
signals (a claimed notNull against an observed NULL, a name-list disagreement,
a parity break, a crash, a rejection), and must never gate anything — that is
the randomiser, which is the four adversarial sweeps with the human removed
from the search and kept in the promotion. Its output is a falsifying statement
that becomes a fixture VERBATIM: the traced walk already names the rule that
concluded wrongly, and this suite's 32 `extreme-*` fixtures are large by design
because interactions are what they pin. Emptiness stops being
a problem for it: a query returning no rows contributes no signal, which is the
whole of it — no tag, no excuse, and no surface for the 12% mislabelling rate
the reason audit measured. RETURN RATE — the fraction of queries that
return a row, over queries that can — replaces the coverage claim without
pretending to be one, because it is emergent where NULL rates and row counts
are merely settings. Nothing else is a design fork: nullability is witnessed by
absence, and ordinary random generation supplies most of it once a null rate
per column and a row count per table (including zero for one or two) are set.

**One metric was said to be retired by this, and that is WITHDRAWN
(2026-08-08).** `capability-reach.test.ts` reads 34 of 34 over a corpus this
thin because it counts accessors the walk ASKS — `resolveForeignKeyTree` is
"reached" when it is asked over `t` and answered null. It measures
interrogation, not variety, and the schema axis moves reach by exactly ZERO.
But "different question" is not "wrong question": it is the only check that a
newly landed walk capability is reached by ANY query, which no amount of
catalog variety implies, and the two corpora are already split between the two
suites — generated held to a floor here, fixtures held exactly in
`catalog-census.test.ts`. It stays, as a diagnostic beside the profile count,
not under it.

**The precision residue is now its own handoff** — `docs/precision-residue.md`
(2026-08-07). Items that neither chartered effort owns, collected because they
were otherwise scattered across an `@unwitnessable` reason, an `UNWITNESSABLE`
rule in a generated suite, a residue paragraph in a closed charter and an entry
in this register — four places, none of which read as a work list. **All four
are now closed as far as this engine reaches**; what is left of item 4 is one
refusal cause that belongs to `docs/type-aware-overloads.md` and waits behind
the same prerequisite that charter does. None of it blocks a consumer.

1. **A defaulted argument is not substituted into the body** — CLOSED
   2026-08-07, and it did not stay a precision item: `DEFAULT NULL` plus
   strictness made five claims wrong. The closure entry in section 2 has the
   list and the fix; the standing lesson is that "sound" on an item in that
   handoff is a measurement someone made once, not a property.
2. **Join-level versus member-level presence** — CLOSED 2026-08-07, and it did
   not stay a precision item either: reading a key as "this join always
   matches" was missing the condition that the match is still in the SLICE, and
   two shapes claimed notNull against PostgreSQL's NULL. The closure entry in
   section 2 has both.
3. **Foreign-key entailment does not compose through a JOIN inside a
   correlated subquery** — CLOSED 2026-08-07, and the one of the four that was
   exactly what it said: the composition, iterated from the anchor, with the
   two claims recovered. The closure entry in section 2 has the rule.
4. **The `unnest` refusal class** — CLOSED 2026-08-07 down to one cause. The
   sublink and the computed derived-table column were the reading stopping
   early, not type inference; what remains is the POLYMORPHIC builtin, which
   needs pg_catalog signatures and belongs to `docs/type-aware-overloads.md`
   behind the same standing boundary. The closure entry in section 2 has the
   measurement.

What that document deliberately does NOT own is stated at its top:
`docs/type-aware-overloads.md` has every one-name-many-signatures defect —
including `path + path`, the only live unsoundness in normal operation — and
`docs/consumer-design.md` has everything whose missing piece is project
configuration or a call site.

---

## 1. Arity-and-order gate at the consumer boundary

**What.** Nullability is a positional array meant to be zipped against
PostgreSQL's `RowDescription` — the contract is documented on
`OutputNullability` in `src/query/types.ts`. Nothing enforces that the two
lists agree before they are zipped — and the comparison must be the ordered
NAME list, not length alone: the sweep's finding 10 was six columns against
six, permuted (MERGE `RETURNING *`), which arity cannot see. The
constraints on the name comparison are in the findings doc's "gate at the
consumer boundary" subsection: it VERIFIES a positional join (never joins
by name — names are not unique), and it degrades to arity-only at
positions where the engine reports an empty name (`FigureColname` stays
unimplemented by decision).

**Why it matters.** A mismatch misassigns every flag past the point of
divergence, and does so while looking authoritative. The check is a single
comparison, and the consumer necessarily holds both lists: it runs `PREPARE`
for types anyway. On mismatch the safe response is to treat every column as
nullable and report loudly.

**State.** Not written, because there is no consumer: nothing under `src/`
calls `inferNullability` yet. The engine cannot self-verify — it has no
PostgreSQL.

**Trigger.** Write it with the FIRST slice that holds a contract and a
PREPARE result at the same time — BEFORE the emitter slice, not with it
(`docs/consumer-design.md`): every slice between would otherwise build on a
failure mode that is silent by construction. Permanent, not transitional —
the sweep found five shape defects in one sitting and the engine will keep
growing. Across four sweeps this gate now carries THIRTEEN defects it would
have caught, FOUR of them arity-preserving and therefore invisible to any
check but the ordered name comparison: sweep-1 finding 10 (the permuted
MERGE `RETURNING *`), sweep-2 finding 13 (`(p).*` reading the alias where
PostgreSQL reads the column — same arity, entirely different columns),
sweep-3 finding 7 (quoted `TABLE(…)` column names split at a space), and
sweep-4 finding 6 (a one-arm `ROWS FROM` ignoring the relation alias — one
column, the wrong name, and three sweeps plus a census walked past it). That
is no longer an argument; it is a count.

---

## 1a. Sweep every catalog READ for rows PostgreSQL adds that nobody wrote

**RAN 2026-08-08, and its two findings are CLOSED.** Every capture in
`snapshot.ts` was asked for its derived rows against PG 18.3, with constructed
DDL for the cases `fixtures/schema.sql` does not carry. Both of this item's
named candidates were wrong in an instructive direction, and both findings
landed in the two captures the nullability walk never reads.

*What was clean.* Partition TRIGGER clones are `tgisinternal = FALSE` with
`tgparentid <> 0`, so the `NOT tgisinternal` filter KEEPS them and a trigger
declared once on a partitioned parent is a hook on every partition — measured
end to end, `resolveWriteRewrites('pp1').beforeRow` carries it. The six clones
in the fixture schema are FK machinery and ARE internal, so the one filter
separates the two populations correctly. **Inherited constraints, the candidate
named below, carry `coninhcount > 0` and `conparentid = 0`** — a different
provenance column from the partition clones that produced sweep-4 finding 4 —
and they need no gate at all: the row is a true fact about the child, which
does enforce the constraint. Only FK and PK clones set `conparentid`.
Elsewhere: 36 of 245 fixture columns are inherited (`attinhcount > 0`) and
per-`relid` grouping is right; the five view `_RETURN` rules are excluded;
shell operators (`oprcode = 0`, from a forward `COMMUTATOR` reference) are
dropped by the `JOIN pg_proc` and cannot be invoked, so dropping is sound;
`CREATE TYPE … AS RANGE` puts five constructor functions in the user schema
that nobody wrote and they are read as the ordinary callable functions they
are; the three identity-derived sequences produce exactly one `pg_depend` row
each, so the LEFT JOIN does not multiply them; and `pg_inherits`, captured
unfiltered, holds INDEX edges too, inert only because an index OID can never
appear as a table OID.

*Finding 1 — `queryIndexes` captured the clones and dropped the declaration.*
`WHERE c.relkind = 'i'`: one `CREATE INDEX` on a partitioned table makes the
declared index as relkind `'I'` plus one relkind `'i'` clone per partition, so
`CREATE INDEX pp_amt_ix ON pp (amt)` snapshotted as `pp1_amt_idx` and
`pp2_amt_idx` — entities named after partitions, which no migration mentions —
while the index the author wrote was invisible. Now `relkind IN ('i','I') AND
NOT relispartition`: one entity per declaration. An index written directly on a
partition keeps its row, because `relispartition` is false until a parent
partitioned index adopts it, at which point it IS a clone of that declaration
(measured). The count that says how well this was hiding: the fixture schema
declares ZERO explicit indexes and captured 30 rows, every one materialised by
a `PRIMARY KEY`.

*Finding 2 — `queryDomains` read one row of many.* The `check_expr` subquery
was `LIMIT 1` with no `ORDER BY`, so a domain declaring two CHECKs captured one
of them, chosen by catalog row order. Dropping the other produced no diff, and
the same domain could compare unequal to itself across a replay into a fresh
database — the exact property `comparableStates`' header argues must hold.
`DomainInfo.check: string | null` is now `checks: string[]`, aggregated
`ORDER BY conname`. The item's own class mirrored: not a row PostgreSQL added,
but the same reader assuming one row per declaration.

Neither moved a nullability claim, and the sweep says exactly why: the walk
reads only `check` and `foreign` constraints — never `primaryKey`, `unique` or
`exclusion` — and never a domain's CHECK, so `snapshot.indexes` and
`DomainInfo.checks` reach nothing but the diff's entity map. **That is the
finding under the findings**, and it is what this check should be pointed at
next: both defects survived because nothing downstream was strict enough to
notice. Three tests pin the two fixes, each mutation-tested to fail alone.

**What.** The converse of the curated-table audit, and the second standing
check this register carries. The existing heuristic is "sweep every
hand-curated TABLE against the catalog it approximates". This is the other
direction: a catalog read can return MORE than the schema author declared,
and a reader that assumes one row per declaration is wrong without ever
looking wrong.

**Why it matters — it has one confirmed instance and two candidates.**
Sweep-4 finding 4 is the instance: `pg_constraint` holds three rows where the
author wrote one foreign key, because a key referencing a PARTITIONED table is
cloned once per partition, and the adapter's last-row-wins map kept a clone.
That produced an unsound claim and destroyed a correct one at the same time.
The same class, not yet swept:

- **inherited constraints** (`coninhcount > 0`) — a child's copy of a parent's
  CHECK is a row nobody wrote;
- **index-backing rows** — a PRIMARY KEY or UNIQUE constraint materialises a
  `pg_index` row and, on a partitioned table, a partitioned index plus one per
  partition (`relkind = 'I'`, which the catalog census now observes).

**What it costs.** It is a QUERY, not a sweep: ask each captured catalog for
the rows whose provenance column says "derived", and check the reader. Cheap
to do once.

**Trigger.** Do it the next time any capture is added to `snapshot.ts`, and
before the consumer's first contract-holding slice. `queryConstraints` now
captures `conparentid`, so the partition case is closed and the pattern for
the rest is written down. The 2026-08-08 run recorded above is the pattern
worked end to end; a capture whose consumer is the diff alone is where it pays,
since no oracle downstream will complain.

---

## 1b. Operational trust declarations — the foreign-key assumption

**What.** Foreign-key entailment (2026-08-06) reads a validated, enforced,
non-deferrable key as a guarantee that the join matches. Three routes
falsify that without leaving a catalog trace, all measured: `ALTER TABLE …
DISABLE TRIGGER ALL` (FKs are system triggers — the orphan lands and
`convalidated`/`conenforced` both stay TRUE), `SET session_replication_role
= 'replica'` (a session GUC, no DDL at all), and disabling triggers on the
REFERENCED side, where a delete's `ON DELETE CASCADE` never fires and
orphans rows that were valid a moment earlier. Nothing revalidates
afterwards: `VALIDATE CONSTRAINT` on an already-validated key is a no-op.

The gap is the escape hatch, not the default. **The default is settled and
is not to be re-litigated**: a declared key is the schema author's
invariant, the dirty state is one where the database misrepresents itself,
and PostgreSQL's own planner has trusted validated keys for join
selectivity since 9.6 without revalidating them. What is missing is a way
for a consumer that KNOWS its keys are unenforced to say so.

**Why it matters — and why it is small.** Wrong in the unsound direction
when it is wrong, but it needs a database dirtied by one of those routes
and left that way. Against that: the shape is the most common join in SQL,
and refusing it costs the eight claims plus the general case.

**Why not done.** The engine half is genuinely five lines — a
`trustForeignKeys` option beside `searchPath` in `buildNullabilityCatalog`,
with the two FK maps coming back empty. The rest is not: the value has to
reach the adapter from project configuration that does not exist yet, which
is the same wiring search-path half (b) waits on, and the natural
granularity (per project, arguably per TABLE — `DISABLE TRIGGER` is
per-table) is a consumer-config design question. Deliberately NOT per
query: whether keys are enforced is a property of how a database is
OPERATED, the query author does not hold that knowledge, forty queries
joining the same two tables would each need the annotation, and putting the
unsafe reading on by default at every site inverts which reading is easy to
forget.

**Trigger.** With the consumer's config slice, beside search-path half (b)
— the same input class, the same plumbing. Worth doing together with the
SYMMETRIC declaration, which recovers precision rather than giving it up: a
project that never defers constraints could reclaim the `DEFERRABLE` keys
the adapter currently drops unconditionally. If a per-query hatch is ever
wanted after all, it spells like `@args` and `@unwitnessable`, not a new
`@pgsid:`-style macro namespace (`docs/consumer-design.md` settled the
dialect).

**Where.** The assumption itself is recorded on the mechanism in
`docs/nullability-walk.md` ("Foreign-key entailment"), with the three
routes named; `docs/imprecision-closure.md` carries the measurements.

---

## 2. Known imprecisions in the walk

Each of these is *sound* — the engine reports nullable where a value is
provably non-null. They cost precision, never correctness, and are listed so
that a decision to close one is deliberate.

Closed 2026-08-08, and it is the DISCOVERY GENERATOR's first finding — the
instrument `docs/catalog-driven-generation.md` charters, on the first run that
had a real join graph under it. The join-level fact reads "a join that cannot
extend one of its sides leaves the joins INSIDE that side un-extendable too",
and "from above" was taken to mean the top of that side rather than everything
above. `tags JOIN product_tags RIGHT JOIN products FULL JOIN product_tags`: the
last join cannot extend its left side, so the rule reached both joins nested in
it — including the RIGHT JOIN, which null-extends the first two for a product
with no tags. The damage came from where `incomingRequired` lands: on an INNER
join it makes the join ACTIVE, pushing its qual into `scope.impliedQuals`,
which is a claim about every emitted row. `r0.id = r1.tag_id` was implied over
rows where both are NULL and two columns read notNull against PostgreSQL's
NULLs. An inner join is now skipped when another join within the SAME side has
an optional group covering it; the fact still reaches the joins nothing inside
the side extends, which is what it was built for. Pinned by
`fk-entail-join-level-inner-extended.sql` with its presence group, mutation
-tested to fail alone, and every one of the shape's four conditions measured
necessary on its own.

**What the finding says about the instrument, which is the reason it is
recorded here rather than only on the fixture.** Three thousand random joins
found it in under three seconds, and it needed FOUR joins over THREE tables
carrying two foreign keys — a shape the enumerated corpus cannot express, since
it queries six relations and `t`/`u`/`v` declare no keys. The register measured
that gap twice (`docs/generated-surface.md`, and §1 of the generation handoff)
without being able to act on it. The first run acting on it convicted.

Closed by the FOURTH adversarial fix phase (2026-08-07), finding 4 / RC-C — a
catalog READ that answered a different question than the one asked.
`pg_constraint` holds THREE rows where the schema author wrote one key: a
foreign key referencing a PARTITIONED table is recorded as the declared
constraint plus one CLONE per partition, and `fkByColumn` keyed on
`schema.table.column` with last-row-wins kept whichever the snapshot ordered
last. Two wrong answers from one capture, and they point opposite ways —
joining the landed-on partition PROMOTED it, so a referencing row pointing into
any other partition NULL-extended (rank 1), while joining the DECLARED parent,
the shape anyone actually writes, promoted nothing at all (rank 7). Skipping
clones (`conparentid <> 0`, one new snapshot column) removes the first and
recovers the second in one move. The adapter's existing comment was not wrong,
it was about the other side: partitioning of the REFERENCING table needs no
exclusion, and the referenced side is a different mechanism.

**The first version of this fix was WRONG in the other direction, and a probe
of its own blast radius caught it.** PostgreSQL clones a key for TWO reasons
and only one produces an unreadable row: when the REFERENCED table is
partitioned the clones carry DIFFERENT `confrelid`s and disagree about where
the match lives, but when the REFERENCING table is partitioned they all share
the declared target and each is simply that partition's copy. Skipping every
clone cost the second case its promotion — a query naming `sw4_rs1` directly
finds no other key, because the declared row sits on the parent. Sound, and
wrong for nothing. The discriminator is not "is this a clone" but "is there a
DECLARED key for this column": prefer the declared row, fall back to a clone
only when there is none. Both arms have fixtures. This is sweep-2's root cause
one generation later — a fact changed at the sites the fix phase was looking
at rather than at every site that asks the question — and it says something
about method: the fix phase's own changes deserve the probe loop as much as
the code they replace.

**The two halves had to land together, and the report was right that a
half-landed version is a new rank-1.** Recovering the declared key makes `ONLY
<partitioned parent>` live: a partitioned table holds NONE of its own rows, so
that scan is empty and every referencing row NULL-extends — measured going from
`ok` to `RANK1` between the two edits. The gate reads the scan mode of the
REFERENCED relation, which nothing did before (`keyedRelation` carried
`scansTree` for the referencing side alone), and it keys on being PARTITIONED
rather than on `ONLY`: inheritance is the opposite way round and its promotion
must survive, because a parent holds its own rows and the key's target index
covers exactly those. Four fixtures, one per corner, plus a generator change —
`sw4_pp`'s rows alternate across both partitions so the clone fixture's
presence group observes both arms rather than only its absent one.

Closed by the same phase, finding 2 / RC-B — a structural reading over a data
structure built for a different question. `scope.joins` carried QUALS for the
presence fixpoint, and a join was pushed onto it only when it HAD one; the
2026-08-07 session then made the same array carry the JOIN TREE for
`subtreePreserves` / `subtreeAlwaysPresent` / `joinWithin`, and the reading that
arrived second inherited the first one's filter. So a side containing a CROSS
JOIN read as a leaf that drops nothing, and the foreign-key entailment's "the
match is still in the SLICE" gate — the condition that session had just added —
passed on a side that had been emptied. This is
`fk-entail-referenced-not-preserved.sql`'s own counterexample with the INNER
join replaced by a CROSS join: the reasoning it pins is right, the structure it
reads could not see the case.

Four routes in, all measured: CROSS JOIN, a comma join, CROSS JOIN LATERAL over
a subquery returning nothing, and NATURAL JOIN sharing no column name. `ON TRUE`
was the control and always behaved, because it carries a qual. Every join is
recorded now and `quals` gains a null case; the fixpoint skips an entry with
nothing to imply, and the three reading sites needed no new branch because
`equalityColumnRefs` answers null for a missing qual — which is what they
already do with "not a key equality". The same array feeds
`joinCannotExtendSide`, so one record closed both sites. Dry-run before landing,
as the report asked: the generated corpus (14964 queries) and the schema axis
both clean. What it costs: nothing measured — an unrecorded cross join in the
REFERENCING side was always harmless, and its fixture is the overshoot control,
because the cheapest wrong fix refuses whenever any qual-less join is in scope.

Closed by the same phase, finding 1 / RC-A — a rule stated at the site and
applied to one of three readings. `resolveTableFunctionColumns` knows that a
multi-arm `ROWS FROM` expands in lockstep to the LONGEST arm and NULL-pads the
others; `bodyReadable` gated the BODY reading on it and the DECLARED reading —
a NOT NULL domain return, or a NOT NULL domain among the OUT/TABLE parameters —
was pushed unclipped on all three arms. Six shapes, one cause. The clearance
now sits where the item's columns are ASSEMBLED, beside the strict
short-circuit that was already cleared there.

`returnsSet` was not the bug and did not move: `callCanShortCircuit` excludes
set-returning functions because a claim about rows that do not exist cannot be
contradicted, which is true of the call and false of the call inside a `ROWS
FROM`, where the long arm supplies the rows and the padding the NULLs. The
padding covers that shape for a reason of its own, and a strict SRF can never BE
the longest arm. `WITH ORDINALITY` is unaffected and has the fixture that says
so: the counter belongs to the FROM item as a whole and is present on every
emitted row, so a clearance written as "this FROM item is padded" would be
wrong where "this ITEM is padded" is right. The rank-4 face needed no second
fix — a padded column was a presence-group DISCRIMINANT precisely because the
flag survived, and a group needs at least one, so clearing the flag removes the
group rather than correcting it. That is why the clearance had to sit before the
group assembly reads the flags.

Closed by the same phase, finding 5 / RC-A — **and the report's recommended fix
was wrong, which is worth recording because the measurement that corrected it
cost one probe file.** The sweep found sibling NESTED paths in a JSON_TABLE
NULLing each other's `FOR ORDINALITY` columns and proposed a SIBLING test, on
the measurements that one nested path is sound and that NESTED-inside-NESTED is
sound. Both were taken over paths that always MATCH. Four shapes nobody had run
— a lone nested path over an EMPTY array, one whose key is absent from the
document, an empty inner array under NESTED-in-NESTED, and either beside a root
column — all emit a row with the counter NULL and no sibling anywhere. A NESTED
PATH is an OUTER JOIN against the level above it, so the boundary is "inside a
NESTED path", which the report carried as its conservative fallback. A
root-level counter keeps its claim however many NESTED siblings it has
(measured), and has the fixture that fails if that moves outward. The standing
lesson is the register's own, one turn later: a "sound" verdict in a findings
doc is a measurement someone made once, over the shapes they happened to try.

Closed by the same phase, finding 3 / RC-A — a row-dropper the walk does not
MODEL, where finding 2 is one it cannot SEE. The `RangeTableSample` arm was one
line that unwrapped the node and registered the relation underneath, so the
alias went on standing for the whole table and every fact keyed on "the STORED
rows of this relation" over-read: `keyedRelation` handed it to the entailment as
a plain table and `subtreePreserves` found no join dropping it. One flag on
`RelationEntry`, read at both sites rather than one, so a later reader of the
second cannot re-acquire the wrong answer. The correlated-subquery anchor rule
was SOUND for a reason that is not a gate — `subqueryFromTree` accepts only a
plain RangeVar leaf and a sampled relation arrives wrapped — and the probes
confirm it still refuses rather than having been turned into a wrong answer.
What it deliberately costs has its own fixture: `BERNOULLI (100)` keeps every
row and is refused anyway, because the walk does not reason about which rows a
fraction keeps, the same stance it takes on which rows a qual keeps.

Closed by the same phase, finding 6 / RC-A — two gates one line apart
disagreeing about what "single" means. `const single = functions.length === 1
&& !rf?.is_rowsfrom` gated the alias-as-column-name rule, and PostgreSQL's rule
has no `is_rowsfrom` in it: a lone arm returning a SCALAR takes the relation
alias, `ROWS FROM` or not. The seven-row spelling table is measured and three
rows of it are now fixtures, including the two overshoot controls — a composite
arm keeps its own field names, and `WITH ORDINALITY` renames the scalar column
while the counter keeps its own name. One predicate serves the naming, body and
declared readings now, which is also what finding 1's clearance keys on.
Arity-preserving and NAME-only: the FOURTH defect of that kind, after sweep-1's
permuted MERGE `RETURNING *`, sweep-2's `(p).*` and sweep-3's quoted `TABLE(…)`
names, and more argument for section 1's gate. It survives re-export and a
qualified star; a VIEW does not, because PostgreSQL re-renders the definition
with an explicit alias column list — which is why no view fixture could have
caught it.

Closed by the same phase, finding 7 / RC-D — **a WORDING decision, taken first
because the report was right that the code depended on it.** Two documents
disagreed: `param-soundness.test.ts` said a nullable parameter means "binding
NULL must never raise, in any state", and `docs/argument-nullability.md` said
"claims mean raises; absence of a claim promises nothing". The decision, and it
is not to be re-litigated: **no claim is made about a USER function's arguments
beyond its DECLARED parameter types — a body is not an interface.** The channel
a schema author uses to GET a claim is the declared type, where a NOT NULL
domain is rejected at Bind by mechanism A before the body is reached; standard
types are nullable by design.

The catalog-visible class the report proposed a rule for — a non-strict
function with a NOT NULL domain return whose body is NULL-preserving — is
deliberately NOT built. It would not close the question, because a plpgsql body
that simply `RAISE`s on NULL is the same rejection with no catalog trace, so the
line would move without arriving anywhere; and reading bodies inverts the
interface, giving two functions with identical signatures different contracts.
What the suite keeps is its oracle: over the hand-written corpus a nullable
claim whose NULL binding raises must be ACCOUNTED FOR, either as a channel the
engine should have seen or by `-- @param-opaque N: <reason>`, whose raise must
be OBSERVED — mutation-checked in both directions, so a stale marker fails as
loudly as a missing one.

**Taking that decision produced an EIGHTH finding, now CLOSED as mechanism D.**
The decision scopes the must-not-raise convention to BUILTINS, whose behaviour
is documented and knowable, and probing that carve-out rather than assuming it
falsified it immediately: `array_fill(1, $1)` raises `dimension array or low
bound array cannot be null` and the engine claimed the parameter nullable. Two
distinct checks, neither implying the other — a NULL ARGUMENT (10 signatures,
11 positions) and a NULL ELEMENT of an array argument (3 signatures, 4
positions), where `jsonb_set_lax` accepts a NULL path array and rejects a NULL
path element.

**It is a TABLE, which is normally this register's mistake, and the reason it
is not here is worth stating.** The property has totality's exact shape —
invisible to `proisstrict`, living only in the C implementations — and this
project's four totality tables drifted three times. What differs is that this
one is cheaply DECIDABLE BY EXECUTION: call the function with NULL in one
position and again with a value, and the pair answers exactly. So
`builtin-null-rejection.test.ts` does not CHECK the tables, it DERIVES the
class from pg_catalog every run and asserts equality, both directions in one
assertion; the tables are a cache of that measurement, and a PostgreSQL upgrade
that moves a rejection fails with the diff. The suite also asserts its own
coverage bounds (silent non-coverage would agree with an empty table) and ties
the derived MESSAGES to `param-soundness.test.ts`'s rejection pattern, so a
claim cannot go quietly unwitnessed behind an unmatched string.

Two boundaries are deliberate and have fixtures: the element rule reaches an
ARRAY CONSTRUCTOR only — `$1::integer[]` bound to an array CONTAINING a NULL is
the same rejection, and the parameter is the whole array — and a USER function
of the same name is never matched, because the tables describe pg_catalog's
implementations. The rule composes for free through mechanism C's implicants:
`array_fill(1, coalesce($1, $2))` yields the joint rejection set `{1,2}`.

Closed by the CATALOG SPY (2026-08-07), which finishes the `handled` half the
category check named and left. The catalog is a pure data interface, so which
QUESTIONS a statement asks is observable by wrapping it — a `Proxy` recording
each member on call, no instrument inside the walk and nothing it can tell
apart (`tests/unit/query/catalog-spy.ts`). Two assertions run off one corpus
pass (the grammar sampler plus every fixture, 437 statements).

Every `handled`/`gated` entry now names the accessor its label rests on and
the census asserts it fired — 68 annotated, 25 of which already named it in
prose. What that proves is stated at the field rather than assumed: accessor
granularity is BRANCH-level, so it fails when a branch is deleted or
refactored past (mutation-checked: disabling the foreign-key read reports
every entry that names `resolveForeignKeyTree`, and mis-naming an accessor
reports that entry alone) and it does not separate two features behind one
accessor. Per-feature argument predicates would; they are not built, and the
field says so.

**Which corpus the spy should run, measured rather than assumed.** The
generated corpus is 11632 queries against the fixture corpus's 438, and it
touches FEWER catalog capabilities: 24 of 35 against the fixtures' 34, and the
union is 34 — the generated half reaches nothing the fixtures do not. It is
broad in STRUCTURE and narrow in CATALOG SURFACE: its `t`/`u`/`v` carry no
foreign keys, no triggers or rules, no custom operators, and no
unnest/composite/domain shapes, so `resolveForeignKey`,
`resolveWriteRewrites`, `resolveOperatorMetadata`,
`resolveLiteralDistinctnessSound`, `resolveColumnTypeName`,
`resolveDomainBaseTypeName`, `resolveBuiltinFunctionShape`,
`resolvePolymorphicArraySignatures` and the two builtin predicates are all
cold there. (Measured over the four default generator entry points.) So the
census keeps the cheap corpus: adding minutes of generation would buy zero
capability coverage. It is the standing "hand-written fixtures reach what
volume does not" claim, in the direction nobody had measured.

**Two corrections from the follow-up measurement (2026-08-07), both worth
keeping because the parenthesis above got them wrong.** The first draft
guessed that the schema axis "runs the same generator against 22 variants
including `fk-chain`, which would reach the key path". Measured: 13 variants,
not 22, and every one of them touches the IDENTICAL 18 members — the schema
axis moves capability reach by exactly ZERO. The spy records the QUESTION, not
the ANSWER: `resolveForeignKeyTree` is already warm over the base schema
because `keyEntails` asks it and is told `null`, and `fk-chain` changes only
what comes back. Reach is a property of the QUERY SHAPES alone.

The conclusion for THIS suite is unchanged and now rests on a measurement
rather than a guess — the census keeps the fixture corpus. What changed is the
generated one: `docs/generated-surface.md` item 5 closed all ten with five new
call-site families, and `capability-reach.test.ts` now holds it at **34 of 34
over 14964 statements**, asserted in both directions. The two corpora are
still asserted separately and for different reasons, which that item states.

The second assertion needs no annotation and asks a question nothing asked
before: which capabilities the corpus never exercises. Three of 35 came back
cold. `resolveFunctions` belonged to `extractDeps`, a different consumer of the same
catalog shape, and the interfaces were SPLIT rather than the member exempted:
`NullabilityCatalog` is now the questions the walk asks and only those, one
adapter builds both faces from one snapshot (`resolveTable` is genuinely in
both), and `DEP_CATALOG_ONLY` beside the interfaces is type-checked against
`keyof DepCatalog`. So the census's scope is a type boundary rather than a
list of excuses, asserted both ways: a dep-only member nobody declares shows
up as an unexercised capability, and one the walk starts asking fails as a
wrong split.
The other two were a real gap: `isBuiltinFunction` and `isPolymorphicBuiltin`
are reached only at the tail of the unnest element-type reading, which every
fixture happened to miss and only `unsupported-nodes.test.ts` covered. Closed
with a fixture rather than an exemption
(`unnest-builtin-scalar-array.sql`), so the branch is now executed against
PostgreSQL like every other claim.

Closed by the CATALOG-CENSUS CATEGORY CHECK (2026-08-07), the same class as
the node-census audit below and the wider half: `category` appeared in that
suite only in the report and in one filter, so all 86 labels were
unfalsifiable. The `conservative` half is now asserted — each entry names the
snapshot field, or the value test, that nothing under `src/query` may read,
and the census fails when it appears. Comments are stripped first, because
prose is not a read: "identity" occurs twelve times under `src/query` and
every one is the English word rather than `ColumnInfo.identity`. Twelve
entries annotated, one opting out with a reason (a range column is read like
any other scalar; what stays conservative there is `lower`/`upper` totality,
which the curated tables own and assert).

**The `handled` half is NOT done, and a token check would be the wrong
instrument for it.** Measured: 42 of the 68 `handled`/`gated` entries name an
identifier that exists in the walk, and the other 26 describe a shared branch
or a control ("the same resolver…", "the control for the above"). A
presence-of-token assertion over 8000 lines proves a string exists, not that a
branch keys on this fact — a green that means nothing is worse than a label
nobody checks. The instrument that would work is a SPY on the
`NullabilityCatalog` accessors during the corpus run, asserting each entry's
declared accessor actually fires; the facts the ADAPTER consumes
(`notNullDomainOids` and its siblings) reach the walk through no accessor at
all and need their own reading. That is the next piece, described rather than
half-built.

Closed by the NODE-CENSUS AUDIT (2026-08-07), which began as "fix the
fourteen conservative nodes" and found that ten of them were not conservative
at all. The walk answers for `JSON_OBJECT`, `JSON_ARRAY`, `JSON_SCALAR`,
`JSON()`, `JSON_SERIALIZE`, `IS JSON`, `XMLSERIALIZE` and the JSON_VALUE
family; `MultiAssignRef` is recognised and skipped by the written-value map at
all three DML sites; `WHERE CURRENT OF` reaches no dispatch at all. Every one
carried a `why` describing an imprecision that had already been closed — work
that read as outstanding and was not.

**The census could not detect it, and now can.** Its three assertions caught a
node classified `handled` that falls through, a node nobody classified, and a
classification the corpus never reaches. Nothing caught the converse — a node
classified `conservative` that the walk in fact handles — so the label was
unfalsifiable in one direction. A fourth assertion closes it, in the shape the
fixture suite already uses for `@unwitnessable`: a reason on a claim that IS
answered fails as loudly as a missing one.

One real imprecision was in the list: `merge_action()` reached the fallback and
is never NULL — it names the arm a returned row came from, measured across
INSERT, UPDATE and NOT MATCHED BY SOURCE, and PostgreSQL allows the call
nowhere but a MERGE's RETURNING. It now reads notNull, which retired the
`merge-action-conservative` rule in the generated suite and one
`@unwitnessable` on `param-merge.sql`.

The census reads 43 handled, 33 structural, 7 ignored, **3 conservative** —
`JSON_ARRAY` over a subquery (NULL over zero rows, unlike the value-list form)
and the two JSON aggregates (NULL over zero input rows, and the non-empty-group
rule is keyed on curated aggregate NAMES a syntactic node never reaches). All
three are correctly nullable, each with the measurement in its reason. One
recorded reason was also WRONG rather than stale: `IS JSON` was described as
"could be tightened to non-null boolean", and `NULL IS JSON` is NULL, not
false — acting on it would have produced a wrong claim.

Closed by the UNNEST ELEMENT TYPE (2026-08-07, `docs/precision-residue.md`
item 4), as far as the engine's own boundary reaches — and the residue has an
owner rather than a shrug. `unnest` contributes one column per argument unless
the element type is a COMPOSITE, when it contributes one per field, so the
shape depends on a type and the walk refuses where it cannot read one. Two of
the three refusing causes were not type inference at all, only the reading
stopping at a door it could have opened:

- a CTE or subquery column with no base column behind it is one the inner
  query COMPUTES, and its defining expression is an expression like any
  other. Typed against a scope built for that statement's own FROM,
  `ARRAY[p]` over a composite column answers `sku_pair[]` — and the const-array
  rule that was already there answers `ARRAY[1, 2]` as one column;
- a scalar SUBLINK is its single output column, typed the same way.

Both reuse `unnestElementType` recursively rather than growing a second
partial type system, which is why the answer improves everywhere at once: the
CTE spelling, the WHERE-qualified sublink and the array-of-table-row-type
column all fell out with no branch of their own. Measured against PostgreSQL's
own column lists across fourteen spellings before and after; the engine never
answered a WRONG shape in any of them, before or after, which is the property
that made this item precision rather than soundness.

**The third cause closed the same day, and the "blocked" reading that briefly
stood here was wrong.** A POLYMORPHIC builtin takes its type from its
arguments — `array_agg(p)` yields `sku_pair[]`, `array_remove`/`array_cat`/
`array_append`/`trim_array`/`array_fill` the same — and saying so needs the
pg_catalog SIGNATURES. Those are now captured as
`builtinPolymorphicArraySignatures`: the 26 signatures whose declared return
is `anyarray` or `anycompatiblearray`, with their declared argument types,
ENVIRONMENT data beside `builtinStrictFunctions` and the five other pg_catalog
captures that landed the same way. One rule covers all 26 — the result takes
its type from the argument declared with the matching ARRAY pseudo-type, or
from the one declared with the matching ELEMENT pseudo-type plus a dimension —
so nothing here is curated.

Two details earned their own gates. A signature the call does not fit is
DISCARDED rather than counted as disagreement (`array_agg` declares
`(anynonarray)` beside `(anyarray)`, and a composite argument fits exactly the
one PostgreSQL picks), which needs the argument to be provably an ARRAY rather
than merely "not a composite array" — the same verdict a non-array expression
gives. And `WITHIN GROUP` is excluded because its aggregated argument never
appears in the call's argument list; no fixture can tell that guard from its
absence, since the arity test rejects those calls anyway, and the code says so.

**What still refuses is common-type resolution** — a CASE arm, a set
operation — which `docs/type-aware-overloads.md` lists as its own residue.

The sequencing claim that stood here for an afternoon said the capture was
blocked until "the consumer's search-path input lands". It was not: the walk
has taken `searchPath` as an argument since the adversarial-2 fix phase, and
six pg_catalog environment captures had already shipped. The boundary that
sentence cited is about how to USE signatures in candidate resolution, which
sweep-3 finding 6 had already answered.

Closed by the SUBQUERY CHAIN (2026-08-07, `docs/precision-residue.md` item
3), the third of the four and the one that was exactly what it said. Key
entailment reads a correlated scalar subquery as returning at least one row
when its WHERE keys into a relation a key guarantees a match in; it read a
FROM of ONE relation, and the shape that needed it carries a JOIN:
`(SELECT c.email FROM orders o JOIN customers c ON c.id = o.customer_id WHERE
o.id = oi.order_id)`. The outer key settles the ANCHOR — the relation the
WHERE keys into — and the join is then the ordinary key one hop further in:
that order's NOT NULL `customer_id` onto an unfiltered `customers`.

The rule is the join form's preserve-or-match pair, asked of every join
between the anchor and the output. A join that PRESERVES the anchor's side —
LEFT with the anchor on the left, RIGHT on the right, FULL either — needs
nothing at all from the other side. A join that can DROP the anchor row needs
it to MATCH: a NOT NULL key carried by a relation already settled, pointing at
a relation on the other side that no join inside that side has dropped, which
settles that relation in turn. Three parts are load-bearing and each has its
gate: the direction (`o.customer_id = c.id` read from `c` says every order has
a customer and is silent about a customer with no orders), the key being
carried by a SETTLED relation rather than one the anchor's side merely
acquired, and the pointed-at relation still being in the slice.

Nine fixtures — the chain, a three-relation chain anchored by a self-lookup, a
preserved-side positive whose match arm cannot carry it, and gates for the
direction, a nullable key one hop in, an extra conjunct on the JOIN's own ON,
an anchor on the side an outer join extends, a key read off an unsettled
relation, and a settled relation dropped inside its own side — each
mutation-checked to fail alone. The two claims the register carried as this
item's reason are recovered and their `@unwitnessable` reasons retired
(`extreme-activity-feed-union` #7, `extreme-dml-insert-shipping-pipeline` #9);
the generated corpus ran clean.

The first pass of this fix restricted the FROM to INNER joins and recorded the
outer-join case as a cost. It was not one: the preserved-side arm is four
lines beside the match arm, and the restriction was hiding a claim
(`SELECT o.status` through a LEFT JOIN the anchor sits on the left of). It
also made the settled-relation requirement look unwitnessable — under an
all-INNER chain the only shape needing it is a CYCLE of NOT NULL keys, which
admits no rows at all — while with outer joins admitted it is ordinary data
and has a fixture.

Closed by the JOIN-LEVEL PRESENCE FACT (2026-08-07,
`docs/precision-residue.md` item 2), which — like item 1 before it — began as
a precision item and turned up wrong claims on the way. The precision item:
"this join never extends its left side" is not "every member of that side is
present", and the presence fixpoint's vocabulary is aliases, so the first had
nowhere to live. It now lives where it already fits: a join that cannot extend
a side leaves the joins INSIDE that side un-extendable from above, which is
`incomingRequired`, and the ordinary key rule on the inner join then promotes
`customers` in the FULL-FULL chain of `fk-entail-optional-referenced.sql`.
`orders` stays nullable there, as it must — it is the FIRST join that extends
it. The fact composes with itself, so a chain proves its own premise one join
at a time (`fk-entail-join-level-composed.sql` and its mirrored spelling), and
a nullable key at the inner join stops the composition dead
(`-nullable-key.sql`).

**Two live unsoundnesses in the mechanism this item was a residue of.**
Reading a key as "this join always matches" needs the match to be in the
SLICE, and nothing checked that a join inside the referenced side had not
already dropped it. `customers c INNER JOIN orders o ON o.customer_id = c.id
AND o.status = 'fulfilled' FULL JOIN order_items oi ON oi.order_id = o.id`
emits an item-only row for an item on any other order — an ordinary status
predicate is the whole counterexample — and the proven-present arm fails the
same way through `orders o LEFT JOIN (customers c INNER JOIN addresses a ON
a.customer_id = c.id) ON c.id = o.customer_id`, where an order's customer is
dropped for having no address. Presence of the REFERENCING side is no defence:
those rows carry a stored referencing row and are exactly the extended ones.
Both measured against PG18, both now pinned
(`fk-entail-referenced-not-preserved*.sql`).

One condition fixes both and is what the join-level fact needed anyway — the
referenced relation must be PRESERVED on its side — so the two arrived
together. Two subtree readings carry it, both read off join types alone: a
LEFT join preserves its left side and extends its right, a RIGHT join the
mirror, a FULL join preserves and extends both, an INNER join neither. WHERE
is not consulted; it filters after the joins and can only remove a row, never
create the extended one a claim is about. The deeper-join gate the schema axis
added generalises into the same vocabulary and keeps its counterexample
failing.

Five fixtures, each mutation-checked to fail alone; the generated corpus
(11632 queries) and the schema axis both ran clean. What it costs: a relation
the walk cannot prove preserved loses the promotion even where it is preserved
in fact, because an INNER join is read as dropping rows whatever its qual
says — the alternative is reasoning about which rows a qual keeps, which is
the analysis this engine deliberately does not do.

Closed by ARGUMENT SUBSTITUTION (2026-08-07, `docs/precision-residue.md` item
1), which began as one precision item and ended as five wrong claims. The
precision item first: a defaulted parameter the call omits was left unbound
and read nullable, where PostgreSQL substitutes the declared expression —
`gfn_def(a integer, b integer DEFAULT 7)` called with one argument is total. A
snapshot change before a walk change, as the handoff predicted:
`pg_get_function_arg_default` per argument POSITION (its second argument
indexes the full list and answers NULL for an OUT position — measured), parsed
in the adapter beside the generation expressions, filled into the argument
vector before any FuncCall rule runs. Walked, never evaluated: `DEFAULT 7` and
`DEFAULT length('abc')` are non-null, `DEFAULT nullif(1, 1)` is not.

Then the question the item forces — what does a call actually PASS — met
strictness, and `DEFAULT NULL` is where they meet. **A strict function handed
a NULL argument does not run**, so no guarantee read off the function
describes that call. Five shapes claimed notNull against PostgreSQL's NULL,
one cause:

1. a strict `LANGUAGE sql` body inlined for a call whose omitted argument
   defaults to NULL (the body's own claim, never reached);
2. the NOT NULL DOMAIN return at priority 1, which preempted the strict rule —
   `dom_strict(t.name) RETURNS nn_text` is NULL for a NULL name, `LANGUAGE sql`
   and plpgsql alike, because the domain is enforced on a value the call never
   produces;
3. the same in the FROM position, where a non-set-returning strict call emits
   one row of ALL NULLs — the declared domain columns among them;
4. the BODY reading in the FROM position, on that same all-NULL row (measured
   through the plain spelling, a `ROWS FROM` and a column definition list);
5. an AGGREGATE returning a NOT NULL domain, which priority 1 also claimed —
   over zero input rows there is no final value for the domain to constrain.

The fixes are one idea in three places: the argument vector is built once and
asked per INPUT parameter (a position the call never reached counts as
unproven); priority 1 stands down for a call that can short-circuit and for
aggregates; the FROM item's flags are cleared where its column list is
assembled, since one row falsifies the declared and body readings together.
Set-returning functions are excluded throughout — strictness makes them return
NO rows, and a claim about columns of rows that do not exist cannot be
contradicted. `FunctionArgInfo.hasDefault` was wrong too, and fixed on the
way: it counted trailing positions over ALL arguments, so an interleaved OUT
parameter took the flag and the defaulted input lost it, putting a legal call
arity outside the window `resolveFunctionCandidates` computes. Argument
defaults joined the diff's comparable state with it —
`pg_get_function_identity_arguments` does not render them, so a default-only
change was invisible.

Seven fixtures, each mutation-checked to fail alone; the generated corpus
(11632 queries) ran clean and `a_fd` moved to notNull, retiring the
`default-argument-not-substituted` rule. What it costs: a call is not bound
past an interleaved OUT parameter, so `mid_out(t.id, 2)` reads nullable where
PostgreSQL returns the id — recorded on
`function-strict-out-parameter-gap.sql`, the one shape where positional
arguments and the parameter list stop lining up.

Closed by the SCHEMA AXIS (2026-08-06, `docs/generated-surface.md` item 4) on
its first run, in the mechanism the register had measured as having zero
generated coverage: foreign-key entailment promoted a referenced side that a
DEEPER join had already extended. Reduced to `SELECT u.email FROM t FULL JOIN u
ON u.t_id = t.id FULL JOIN v ON v.u_id = u.id` — `u.email` is NOT NULL, the
engine claimed notNull, PostgreSQL returns NULL. Characterised before anything
changed: it needs the key whose REFERENCED side is `u`, and a FULL join to `v`
while `u` is already extended; `FULL u, LEFT v` is fine and the `u → t` key
alone changes nothing. The cause is that the second arm of the gate is
conditioned on `incomingRequired`, which is a property of the incoming SLICE
rather than of the member being promoted — the slice is required, and `u`
inside it is not. The key says every stored `v` has a matching `u` and is
silent about a row with no `v` at all. The walk's own comment already named the
case ("a side already extended by a DEEPER join is neither"); it was enforced
for the referencing side and never for the referenced one, so the fix is one
line beside the check it mirrors. Pinned by
`fk-entail-optional-referenced.sql`, the mirror of
`fk-entail-optional-referencer.sql`, whose comment had flagged this exact arm
as "the near miss to keep in view". Positive control: reverting the fix gives
36 violations under the `fk-chain` variant and ZERO under the other six.
Recorded on the fixture as the cost: `c.id` there is genuinely never NULL and
the engine no longer says so — it had that answer by the wrong route, the
unsound promotion cascading through null-group co-membership, and recovering it
soundly needs a distinction the walk does not draw ("this join never extends
its left side" is not "every member of that side is present").

Closed by the totality probe (2026-08-06, `docs/generated-surface.md` item
3), three findings in one run — the first automated pass over a question
three sweeps had answered by hand. `random` left ALWAYS_NOT_NULL_BUILTINS:
PG17 added `random(min, max)` for integer, bigint and numeric and they are
STRICT, so `random(NULL, NULL)` is NULL while the table claims "never NULL
whatever the arguments" (measured; the engine claimed notNull). The other two
are KEPT with the hole recorded, on the FOREIGN-KEY-TRUST precedent rather
than the `lower`/`upper` one — the falsifying operands are exotic and removal
costs the general case. `+` is not TOTAL (`path + path` is NULL whenever
either operand is a CLOSED path; `path + point` is total and open + open is a
value), and removing it makes `id + 1` on a NOT NULL integer read nullable;
`PARTIAL_OVERLOADS` records it. `||` is not STRICT (array concatenation
ABSORBS a NULL operand — `ARRAY[1,2] || NULL` is `{1,2}` — while `'a' ||
NULL::text` IS NULL), and removing it was TRIED, not merely weighed: the
generated corpus immediately admitted three bindings PostgreSQL rejects,
because mechanism C needs the strict TEXT meaning to predict a real
rejection. Under-reporting strictness makes the emitted types lie about a
binding that FAILS; over-reporting only makes a parameter read non-nullable
where NULL would have been accepted, so the over-report is the safer error
and `NON_STRICT_OVERLOADS` records it. Both records are asserted from BOTH
sides, so neither outlives the defect it excuses, and
`docs/type-aware-overloads.md` carries all three as its worked test cases:
the contrast between `random` and the other two IS the rule — the
exotic-operand argument is what makes a hole tolerable, and narrowing is what
makes it unnecessary. `TOTAL_STRICT_OPERATORS` split into `TOTAL_OPERATORS`
and `STRICT_OPERATORS` on the way: it required BOTH properties and warned
that a member with one "would be sound for one consumer and wrong for the
other", execution found one member failing each half in opposite directions,
and all four use sites already documented which property they wanted. The
only claim lost is `random()`'s, recorded on `builtin-functions.sql`.

Closed by the curated-table diff (2026-08-06, `docs/generated-surface.md`
item 2), and found by chasing a table entry rather than by writing a query:
a WINDOW call does not collapse a query to one row. `guaranteesSingleRow`
licenses a claim from "an aggregate with no GROUP BY collapses to exactly
one row", which is true of a BARE aggregate and false of a windowed one —
`sum(x) OVER ()` yields one row per input row, so over EMPTY input it yields
no rows, a scalar sublink is NULL and a `LANGUAGE sql` body returns NULL.
The walk has three aggregate tests and this was the one that never excluded
`over`; `count(*) OVER ()` reached the same wrong answer through its
`agg_star` short-circuit without consulting a name table at all, so
correcting the table's membership would NOT have fixed it. Measured six ways
against PGlite at both call sites (scalar sublink and function body), with
the bare-aggregate and GROUP BY controls unchanged. The fix excludes windowed
calls while still recursing into their ARGUMENTS, since `sum(count(*)) OVER
()` is a genuine single-group query — a reading the old code reached by
accident, via `sum` being in the aggregate table. Pinned from both sites by
`window-call-not-single-row-sublink.sql` and `-body.sql`, both witnessed by a
real NULL under `empty`; the sublink's derived table bounds it to at most one
row in every state, so the shape is witnessable rather than raising.

Closed by the THIRD adversarial fix phase (2026-08-05), finding 5 /
RC-5 — a two-part AST test standing in for a shape test. `alias.*` is
two fields, and it is not the only qualified star: PostgreSQL accepts
`schema.rel.*` and the four-part `db.schema.rel.*` too, so
`fields.length === 2` sent both to the UNQUALIFIED branch, which expands
every visible column in the scope. Nine columns for four, with `u.email`'s
notNull landing on `t.val` — NULL on the seeded row. Invisible with one
relation in scope, which is why every pinned `t.*` fixture passed over it,
and pre-existing code both prior sweeps walked past. `starQualifier` and
`resolveStarRelation` are now shared by `expandStar` and
`groupingOrdinalPositions` (the second copy was WRITTEN by the sweep-2
fix, faithfully mirroring the first — how a latent defect acquires a
second site), and a schema-qualified name resolves to the RELATION rather
than through the alias map: two same-named relations from different
schemas can both be in scope, where PostgreSQL rejects the bare name as
ambiguous and accepts either qualified spelling. Also measured and NOT
modelled, because it only ever concerns statements PostgreSQL rejects: a
schema qualifier matches only a plain relation reference carrying no
explicit alias (`public.t.*` under `FROM t AS t` is an error). Four pins,
one per placement — plain, join, CTE body, grouping-set ordinal.

Closed by the same phase, finding 8 / RC-7 — the unreferenced-CTE gate
gated the WALK where it meant to gate the MECHANISMS. The licence is "a
non-data-modifying CTE nobody references is never executed in ANY state",
which is true (re-measured, `MATERIALIZED` included) and licenses dropping
the EXECUTION-TIME mechanisms. Mechanism A is not one of them: parse
analysis types the parameter from the cast or the argument position it
sits in, and Bind rejects a NULL before anything runs — measured inside an
unreferenced CTE for both mechanism-A sites and in three further shapes
(`NOT MATERIALIZED`, a CTE referenced only from another unreferenced one,
the cast nested inside a subquery), while the frame-offset site and a
value-flow cast in the same position both accept the binding. `visitSeenOnly`
becomes `visitBindOnly`: the walk runs in full and `reject`/`rejectFlow` do
the gating, so the claim the engine held before the sweep-2 fix is back and
the three it correctly dropped stay dropped
(`param-unreferenced-cte-mechanism-a.sql` beside `param-unreferenced-cte.sql`).

Closed by the same phase, finding 7 / RC-6 — a rendered string parsed by
hand. `columnsForReturnType` split each `TABLE(…)` part at
`indexOf(" ")`, and PostgreSQL renders those names with `quote_ident`: a
quoted name containing a space split INSIDE the quotes, and one quoted
only for its case kept its quote characters. Arity-preserving and
NAME-only — the third defect this project has met that nothing but an
ordered-name comparison can see, and the argument for section 1's gate.
The split is identifier-aware now, and so is `splitTopLevel`: `TABLE("a,b"
integer, "c)d" text, "e""f" text)` is a faithful rendering (measured), so
a comma or bracket inside quotes is text rather than structure. The
structural alternative — capturing proargnames/proallargtypes for USER
functions the way `queryBuiltinTableFunctions` already does for builtins —
is NOT done: it touches `FunctionInfo` and the diff's function state for
no measured defect, and the string path is now correct on every rendering
PG18 produces.

Closed by the same phase, finding 4 / RC-3 — `resolveCompositeType` knew
base composites only. One snapshot predicate, `typtype = 'c'`, decided
what "is a composite" meant for `expandCompositeStar`,
`unnestCompositeElementFields` and `columnsForReturnType`'s SETOF branch,
so a DOMAIN over a composite was not one anywhere the engine asks — and
the three callers failed differently: two REFUSED statements PostgreSQL
expands, one guessed a single column. Both refusals were the correct
RESPONSE to a wrong PREMISE, which is why the fix is in the adapter and
not at the sites: a domain is followed to its base composite (transitively;
a domain over an ARRAY of a composite falls out on its own, since
`format_type` renders that base with its `[]`) and registered under its own
name in the same map, so `inPath` keeps first-schema-wins across both kinds
— which is PostgreSQL's rule, domains and composites sharing one type
namespace. Nothing about the domain's own constraint is needed: both sites
force every field nullable anyway.

Closed by the same phase, findings 1 and 2 / RC-1 — set-returningness was
asked of two incomplete oracles. `BUILTIN_SRF_NAMES` held 21 of PG18's 71
non-pg_stat/pg_ls pg_catalog SRFs, and `isSetReturningCall` asked the
SINGLE-CANDIDATE shortcut, which answers null for any overloaded name. The
damage is not where a name table's usual bounded-coverage deal puts it: a
missing name costs the unrecognised call nothing (it had no precision), but
`srfPaddedTargets` needs a count of TWO, so one unseen SRF turned the
padding rule off for the ENTIRE target list and left the recognised call
carrying a notNull PostgreSQL pads away. Both halves now ask the catalog:
`pg_proc.proretset` rides in `FunctionInfo` and answers by CONSENSUS over
the name's candidates (`some`, not `every` — the rule only ever turns claims
nullable, so over-reporting costs precision and under-reporting is the bug),
and `CatalogSnapshot.builtinSetReturningFunctions` is the measured
replacement for the table, ENVIRONMENT like `builtinStrictFunctions`. The
rendered-string test is gone with it, which retires half of RC-6. Also
corrected at both sites that carried it: the lockstep is
max-with-NULL-padding, not LCM cycling — `generate_series(1,3)` beside
`generate_series(1,6)` gives six rows with three NULLs (measured).

Closed by the same phase, finding 3 / RC-4 — an enumerated spelling list
where a type query belongs. `unnestCompositeElementFields` reconstructed
"what is the element type of this expression" from three AST shapes and
read every other spelling as a scalar's; six more were measured
contributing ONE column against PostgreSQL's two, and a FROM item's wrong
shape is every later column's flag on the wrong column (the engine's
notNull at what it called `u.id` landed on PostgreSQL's `qty`). The
element type is asked of the catalog everywhere the catalog can answer —
a domain followed to its base, a user function's declared return type by
consensus, a CTE/subquery column followed to the base column it
re-exports, an array slice, and `||`/COALESCE through their operands —
and REFUSES where it cannot. **That refusal is a new class**, landed the
way sweep 1's unresolvable-relation refusal was: what it costs is bounded
by the widening above, and `unsupported-nodes.test.ts` pins both
directions, so it can never quietly become blanket. What remains refused
needs type inference the walk deliberately does not do: a POLYMORPHIC
builtin (`array_cat` of two `sku_pair[]` yields `sku_pair[]`), an
aggregate, a sublink, a derived-table column the inner query COMPUTES, an
ARRAY constructor over an expression. Two environment facts pay for the
widening — `builtinFunctionNames` and `builtinPolymorphicFunctions` (68 of
2726 names) — the first of which finding 6 needs anyway: a builtin whose
return type is CONCRETE can never yield an array of a user composite,
which is the whole difference between one column and the element's fields.

### The curated-table audit (2026-08-05) — what it found, and why the tool is gone

The recurring lesson of three sweeps was "sweep every hand-curated table
against the catalog it approximates", scheduled but never automated. It
could not be automated the obvious way: the tables claim TOTALITY (non-NULL
arguments give a non-NULL result) and PostgreSQL records only STRICTNESS
(`proisstrict`, which 2549 of 2726 builtin names carry, so it is no proxy).
Totality lives only in the C implementations.

A scanner was built against the PostgreSQL source PGlite vendors, asking
not "is this total?" but "does any reachable path return NULL?" — the only
direction sound to ask, since over-approximating costs a claim and
under-approximating produces a wrong notNull.

**It found a rank-1 unsoundness on its first run, and that finding
stands.** `lower` and `upper` each have a total `(text)` form AND an
`(anyrange)`/`(anymultirange)` form returning NULL for an EMPTY range
(measured: `lower('empty'::int4range)` is NULL, and the engine claimed
notNull through a NOT NULL column). The walk dispatches builtins by NAME,
so one table entry covered both meanings. Both names left
`STRICT_TOTAL_BUILTINS` on the criterion that had already removed
`substring`, and `builtin-range-lower-upper.sql` pins the falsifying shape
with empty ranges seeded by row index.

**The scanner itself was then deleted**, and should not be rebuilt. Three
reasons, all measured: its false-negative rate was 2 in 8 on a hand-picked
sample — the unsound direction — because thin entry points delegate to
`_common` helpers; `PG_RETURN_NULL` is only one of four NULL routes in that
tree (24 `isnull` assignments, 346 `DirectFunctionCall` sites whose
callee's flag propagates, 85 SRF/tuplestore sites); and beyond detection
the real barrier is reachability, which needs a PostgreSQL-aware
interprocedural analyzer (`mod`'s NULL return is dead code after
`ereport(ERROR)`; `concat`'s is live but only under the VARIADIC protocol).
It also required a source tree the package will never ship. Everything the
scan gave that was RELIABLE — names, signatures, argument and return types
— is available at runtime from `pg_proc`.

The replacement is `docs/type-aware-overloads.md`: per-overload NULL
witnesses executed against PGlite, which refute exactly rather than
heuristically, cover SQL-bodied builtins, and need no external source. The
cost the finding leaves behind — `lower(<text column>)` now reads nullable
— is what that charter's narrowing recovers.

### Residue after the third fix phase

A post-fix audit re-measured the surface the eight touched, and closed five
more defects of the same families before recording what is left.

**Closed by the audit.** (a) An array of a TABLE's ROW TYPE (`trow[]`)
resolved to nothing, because `resolveCompositeType` is backed by
`CREATE TYPE … AS (…)` entries alone — `unnest` contributed one column
against PostgreSQL's N. The element-type resolver falls through to the
relation now, the two-step `columnsForReturnType` has always taken for
`SETOF <table>` versus `SETOF <composite>`
(`unnest-table-row-type.sql`). (b) A schema-qualified star could not pick
its relation out of a scope holding TWO same-named ones from different
schemas — `Scope.aliases` is keyed by name, so `app_s.t.*` under
`FROM app_s.t, t` yielded an EMPTY column list for a statement PostgreSQL
answers, and that scope is precisely what a qualifier exists to
disambiguate. It resolves through `scope.visible`, which carries both
entries in FROM order (pinned in `search-path.test.ts`, with PostgreSQL's
own "ambiguous" rejection of the bare spelling beside it). (c) An ARRAY
constructor over an EXPRESSION rather than a cast (`ARRAY[c.p]`) — the
element type IS the member's type, which the catalog holds for a column
reference (`unnest-array-of-column.sql`). (d) A composite array staged
through TWO CTEs: the re-export read stopped at the first, where a chain is
still a pass-through (`unnest-composite-cte-chain.sql`, with a seen-set so
a `WITH RECURSIVE` self-reference cannot loop). (e) `(p).*` over a
USING/NATURAL-MERGED composite column refused, where PostgreSQL expands it
like any other; the merge requires a common type, so either constituent
answers (`composite-star-merged-column.sql`). The sweep had recorded (e) as
a rank-7 note and filed it with the composite-DOMAIN family — it is not
that, and the domain fix did not touch it.

Two of those needed the seed data to be made deterministic rather than
probabilistic: `cc.p` now takes its three composite shapes (whole, empty
qty, empty sku) by row index, and `pair_holder`'s three array columns
rotate their NULLs the same way. At these tables' row counts a rate left
the witness to luck. Recorded because it generalises: a field claim inside
a present composite has no other witness, and a whole-column NULL is not a
substitute.

**What the audit did NOT close**, in descending order of what it costs:

1. **The `unnest` refusal class.** Statements PostgreSQL accepts that the
   walk refuses rather than answering with a wrong shape: a POLYMORPHIC
   builtin (`array_cat`/`array_remove` of composite arrays), an aggregate
   (`array_agg`), a sublink, and a derived-table column the inner query
   COMPUTES rather than re-exports. Each needs the type of an expression the
   walk does not compute, which is the boundary the engine has held
   everywhere else. Pinned in `unsupported-nodes.test.ts` with a positive
   control beside them so the refusal cannot quietly widen.
2. **Fix 3's two costs**, both pinned in `search-path.test.ts`: a user
   function merely NAMED after a builtin with a different signature loses
   its claims, and so does the `search_path = public, pg_catalog`
   configuration where the user's function genuinely wins. Closing either
   needs pg_catalog SIGNATURES in the snapshot, which waits for the
   consumer's search-path input.
3. **Nothing for fix 7's structural half — it is CLOSED**, and it was never
   the hypothesis this entry first recorded. Asked for an example of what
   the rendered string loses, the answer turned out to be four live wrong
   shapes, all in user functions: `f(OUT a int, OUT b text)` renders
   `SETOF record` (or the bare type, or nothing at all without a RETURNS
   clause) and contributed ONE column named after the function against
   PostgreSQL's two, and `RETURNS TABLE(r <composite>)` with a SINGLE output
   column is a function whose row type IS that composite, so PostgreSQL
   emits its FIELDS where the rendering reads as one column named `r`. This
   is precisely the defect `queryBuiltinTableFunctions` was built to fix for
   BUILTINS, left standing for user functions. `functionOutputColumns` reads
   the declared output parameters — `proargmodes`/`proargnames`/
   `proallargtypes`, captured all along — and falls back to the rendering
   only where there are none; a single output column expands its type, two
   or more are the column list directly, and a bare table alias does not
   rename a named output column (measured). `resolveFunctionReturnTypes`
   became `resolveFunctionShapes` and hands back the whole `FunctionInfo`,
   because the rendering is what was lossy. No snapshot or diff change was
   needed.

One side effect worth recording rather than rediscovering: fix 3 closes the
negative-dependency hole for BUILTIN names. A query calling `min_scale`
unqualified no longer depends on whether a user `public.min_scale` exists —
the answer is the builtin's either way — so the "a dependency on a function
that does not exist YET is not expressible" gap no longer applies to that
class. It still applies to every non-builtin name.

The audit's own lesson is a separate item: none of these was reachable by
the standing suite, for the reason `docs/generated-surface.md` measures.

Closed by the same phase, finding 6 / RC-2 — the search path is not the
whole resolution order. Sweep 2 fixed `inPath` for functions by merging
candidates ACROSS the path; the path is not the universe. PostgreSQL
prepends `pg_catalog` unless the path names it, so for an identical
signature the BUILTIN hides the user function — the exact opposite of the
rule every builtin table in the engine documented ("consulted only where
the user catalog has no candidate, so a user function of the same name
still wins"). Measured both directions: under the default path
`min_scale('NaN'::numeric)` returns NULL from pg_catalog's while the
engine claimed the user function's NOT NULL domain return, and under
`search_path = public, pg_catalog` the user's runs. Three mechanisms
reached it — the flag, the FROM SHAPE (`SELECT * FROM json_each(…)` gave
`[sku, qty]` against `[key, value]`), and a case where the signatures do
not even match (a user `lower(integer)` made `lower(NULL::text)` read
notNull, because the user's overload was the SOLE candidate and
pg_catalog's was not in the set at all). The CHEAP form landed:
`resolvableCandidates` drops the user candidate set wholesale for an
unqualified name pg_catalog also carries, so every consumer — metadata,
arity consensus, return types, set-returningness — falls to the builtin
tables, which are now correctly the FIRST answer rather than the last.
Dependency extraction is deliberately NOT gated: the user function is a
real dependency whether or not it currently wins. Two costs recorded and
pinned in `search-path.test.ts`: precision for user functions merely NAMED
after builtins with a different signature, and the one configuration where
the user's function does win (`pg_catalog` named late in the path) where
the engine drops the claim anyway. The FULL form needs pg_catalog
signatures in the snapshot and waits for the consumer's search-path input,
which it interacts with.

Closed by the same probe session (2026-08-05), one turn later and
against my own deferral: the unknown-function-in-FROM fall-through is a
LIVE wrong shape, not the design tension it had been recorded as. The
walk answers an unknown symbol with `nullable` wherever it feeds a FLAG
and with a REFUSAL wherever it feeds a SHAPE — a column list has no
conservative value — and the ONE site breaking that rule guessed a
single column named after the function. That guess exists so uncaptured
`pg_catalog` SRFs keep working, and it is right for `generate_series`;
measured against PGlite it is wrong for every builtin with NAMED OUTPUT
COLUMNS: `json_each` and `jsonb_each(_text)` emit `key, value` against
the guess's one column, `pg_get_keywords()` five, and
`jsonb_array_elements` emits one named `value` — the guess's own arity
with the wrong name, the class only an ordered-name comparison catches.
Six of ten probed builtins disagreed, in default configuration, with no
user function involved. `pg_get_function_result` cannot fix it (a
builtin declared with OUT parameters renders `SETOF record` — measured),
so `queryBuiltinTableFunctions` reassembles the shape from
proargnames/proallargtypes into `CatalogSnapshot.builtinTableFunctions`,
keyed by name as `TABLE(col type, …)` so the existing return-type
expansion consumes it unchanged; a name whose overloads disagree is
excluded and keeps the guess (none does in PG18 — measured). It is
ENVIRONMENT like `builtinStrictFunctions`: a property of the PostgreSQL
version, absent from the diff. Consulted only where the user catalog has
no candidate, so a user function of the same name still wins — that last
clause is BACKWARDS and sweep-3 finding 6 corrected it: pg_catalog is
searched implicitly and FIRST, so the builtin is consulted for a name it
also carries. Verified
nine ways against PostgreSQL including the alias-rename and coldeflist
controls, and pinned by `builtin-table-function-shape.sql` under the
soundness suite's ordered name comparison. The scalar SRFs keep the
single-column answer, which is what PostgreSQL emits for them.

Closed by a targeted probe of the search-path fix (2026-08-05), the
sweep-3 charter's section A, measured before the sweep ran — and it
convicted, on four mechanisms plus a second defect nobody was looking
for. `inPath`'s first-schema-wins rule is right for relations, types and
domains, which a NAME identifies; a function is identified by name AND
ARGUMENT TYPES, and PostgreSQL gathers candidates from every schema in
the path. Measured with `f(text)` in app_s and `f(integer)` in public
under `search_path = app_s, public`: `f(42)` runs PUBLIC's and returns
NULL, while the engine read app_s's metadata and claimed its NOT NULL
domain return — and the same mis-pick reached priority 5 (inlining the
wrong BODY, no domain involved), the FROM-clause return-type expansion
(`[sku,qty]` against PostgreSQL's `[a,b,c]`), and calls whose ARGUMENT
COUNT matched neither. Unqualified lookups now merge candidates across
the path, deduped by `argTypes` — `pg_get_function_identity_arguments`,
exactly the key the hiding rule uses, and hiding IS first-in-path
(measured both directions, so the same-signature case keeps its
precision) — and "a single candidate" means one across the merged set,
so an ambiguous name falls to the overload-consensus rule that already
existed for same-schema overloads. The probe's second conviction was
PRE-EXISTING and needed no search path: an overloaded table function in
FROM whose candidates return different SHAPES fell through to one
column named after the function (measured — one against PostgreSQL's
three, two overloads in ONE schema, missed by both sweeps). That site
now takes shape CONSENSUS — candidates agreeing on a column list give
it, disagreeing candidates REFUSE at the from-item site — with the
positive arm pinned so the refusal is not blanket. Costs: an
unqualified call to a cross-schema-overloaded name loses precision even
when PostgreSQL's pick would have been the notNull one (`f('abc')` —
an unknown literal PostgreSQL resolves to app_s.f); a disagreeing
overload in FROM refuses where the caller could have run PREPARE.
Pinned in `search-path.test.ts` (four function-resolution cases, both
hiding directions) and `unsupported-nodes.test.ts` (the refusal and its
agreeing control).

Nothing here changed the RESOLUTION POLICY, which stands as designed: the
engine performs no type simulation, filters candidates by ARITY only, and
takes consensus — a property every surviving candidate shares holds for
whichever one PostgreSQL picks. What was wrong was the candidate SET. A
single-candidate shortcut (one visible function of that name means
PostgreSQL either picks it or rejects the statement, so its metadata may
be read directly) is sound exactly when the set is complete, and the
search-path merge had made it incomplete — so a genuinely overloaded name
took the shortcut and never reached the consensus rule at all. The fix
restores the design rather than amending it; the only extension is of the
consensus QUANTIFIER to a second axis, shape, at a site that had never
consulted candidates.

Both residues the probe recorded were then closed the same day, since the
context was in hand and a sweep should uncover new defects rather than
re-confirm known ones. (a) `DepCatalog.resolveFunction` became
`resolveFunctions`, PLURAL: an unqualified call whose candidates live in
two schemas depends on BOTH, because the consensus rule reads both, and
recording one left the query unregistered against the other — a missed
EntityId, stale invalidation rather than a wrong flag. (b) The FROM
shape question now runs over the FULL candidate set BEFORE any arity
narrowing: agreement needs no resolution at all, so a variadic candidate
— which makes the arity filter unsound and once sent the whole item to
one wrongly-named column (measured: `vp(VARIADIC text[])` beside
`vp(integer)`, both `SETOF sku_pair`, gave `[vp]` against PostgreSQL's
`[sku, qty]`) — costs nothing when the shapes already agree; narrowing is
attempted only on disagreement, and a variadic candidate then leaves
nothing to prove agreement with, so the refusal stands. Pinned four ways
in `unsupported-nodes.test.ts` and twice in `resolver.test.ts`.

One hole is left open and is NOT closable by recording entities: a
dependency on a function that does not exist YET. A better-matching
overload created later in an earlier schema changes the answer with no
recorded EntityId to hang the invalidation on — and the identical hole
exists for unqualified RELATION references (`FROM t` resolving to
public.t until someone creates app_s.t). It is a property of tracking
unqualified names under a search path, so it belongs with search-path
half (b) in the consumer design, not to the engine.

Closed by the second adversarial fix phase (2026-08-05), finding 5 /
RC-5, half (a) — a contract made true rather than a defect fixed:
`NullabilityCatalog.resolveTable` has always documented search-path
resolution and the adapter hardcoded `public`, which the
unresolvable-relation refusal made half-loud (a non-public relation
refuses) while the worse half stayed silent (a same-named public
relation answers for the WRONG table). `buildNullabilityCatalog` takes a
`searchPath` option, default `["public"]` — every existing caller
byte-identical — and every unqualified resolver walks it in order, with
the hook and partitioned lookups resolving the RELATION first so a
hookless first-schema table cannot fall through to a later schema's
same-named one. Pinned in `search-path.test.ts` with PGlite's
RowDescription under the real `SET search_path` as referee. Half (b) —
WHERE the path comes from — is a per-connection consumer input and stays
with the consumer design.

Closed by the second adversarial fix phase (2026-08-05), findings 8 and
9 / the param-side conservatisms. (8) `columnRejection` read the named
relation's `attnotnull` while UPDATE and MERGE's update arm write into
the TREE — a child left unconstrained by `ALTER TABLE ONLY` accepts the
NULL binding a parent-stored row raises on (measured, both states);
update-command targets now take `resolveColumnNotNullTree`, closing the
asymmetry with the output side. A dropped claim, never a wrong one, and
witnessable in every data state (`param-mech-b-inheritance-tree.sql`,
the child's disjoint id range exercising the accepted binding). (9) A
non-data-modifying CTE nobody references is never executed in ANY state
(measured — the frame-offset site inside one accepts what its referenced
control raises on): `visitStatementWithCtes` walks unreferenced SELECT
CTEs for parameter NUMBERS only, name-level references transitively
closed, data-modifying CTEs always walked
(`param-unreferenced-cte.sql`). The WIDE question — the existential
claim has no reachability qualifier, so any provably-dead subtree
falsifies an execution-time mechanism — is recorded beside the claim
semantics in `docs/argument-nullability.md`, deliberately open.

Closed by the second adversarial fix phase (2026-08-05), finding 13 and
the rank-7 over-refusals / RC-9 — the composite-star arm read the alias
before asking whether a column wins, and PostgreSQL's parenthesized
`(x).*` is the VALUE spelling: a composite COLUMN named x beats a
range-table alias named x (measured — same arity, entirely different
columns, the second same-arity permutation this project has met).
`expandCompositeStar` resolves the column FIRST — merged columns landing
in the refusal rather than the alias fallback — and gained the value
arms the first phase refused: a qualified composite column and a cast to
a known composite expand the type's fields, a ROW constructor expands
parse-time arity as f1..fN, all nullable (the FuncCall arm's shared
rule). The refusal keeps unknown cast targets and subquery composite
columns, re-pinned in `unsupported-nodes.test.ts`
(`composite-star-alias-clash.sql`, `composite-column-star.sql`;
`composite-star-whole-row.sql` holds the non-clashing spelling).

Closed by the second adversarial fix phase (2026-08-05), findings 4 and
7 / RC-4 — an SRF's contribution now asks what it actually returns per
row. In FROM: `unnest` of a COMPOSITE-element array expands the
element's FIELDS, one column per field, all nullable (measured through
five spellings); `unnestCompositeElementFields` reads the element type
from the statically-typed shapes (array-bounds casts, ARRAY constructors
of casts, column types rendering `T[]` — sweep-3 finding 3 found six more
spellings and replaced the enumeration with a catalog query plus a
refusal) and REFUSES when a ROW constructor's provably-composite cast
target is not in the snapshot —
one column there is a wrong shape (`unnest-composite-shape.sql`;
`unnest-composite-merge-source.sql` pins the composition with MERGE's
source-first order, the lists now aligned). In the TARGET LIST: two or
more set-returning calls expand in lockstep and the SHORT one is
NULL-padded AFTER it returned, so `srfPaddedTargets` — shared by both
assemblies like originModeOf — drops every SRF-carrying entry to
nullable; a single SRF keeps its precision, a scalar beside an SRF
repeats rather than pads (both measured;
`srf-target-list-padding.sql`). Set-returningness is catalog
`returnType` or the curated `BUILTIN_SRF_NAMES` — bounded coverage, the
builtin tables' usual deal, and sweep-3 findings 1 and 2 showed the deal
does not hold here: both oracles now come from the catalog. The lockstep
is also max-with-padding rather than the LCM this entry claimed.

Closed by the second adversarial fix phase (2026-08-05), finding 10 /
RC-7 — grouping-set ordinals number the EXPANDED output list, and the
recorder indexed the RAW one: a star entry is ONE ResTarget and N output
columns, so any preceding star shifted every ordinal and the star's own
`[String, A_Star]` fields recorded nothing — `groupingSetColumns` came
back empty and the NULLing override never applied. The recorder now runs
AFTER the FROM walk (it needs the aliases) and resolves ordinals against
`groupingOrdinalPositions`: star positions carry their (column,
alias.column) keys directly, composite-star positions occupy width with
no keys, plain positions keep `collectColumnRefKeys`. Precision kept
over the report's refuse-flag alternative — the expansion was one
helper. The alias spelling stays on the raw list (a star entry cannot be
aliased); the plain-ref pins from sweep 1 hold
(`grouping-set-ordinal-star.sql`, all three grouped keys witnessed on
the rollup rows).

Closed by the second adversarial fix phase (2026-08-05), finding 3 /
RC-3 — the generation expression got its relation-SET analogue:
`notNullTree` and `writeRewritesTree` existed, and the generation
expression was the third per-column fact read from the named relation
while the query scans the tree. A child MAY redefine an inherited
column's expression (measured — the only accepted divergence besides NO
INHERIT), so the snapshot computes `ColumnInfo.generationDivergesInTree`
— the rendered (generated, defaultExpr) pair compared over the subtree,
uncaptured descendants diverging, generated parent columns only,
diff-comparable on the parent — and `resolveGenerationExprTree` refuses
on the bit: one string comparison, not a per-child expression walk. The
walk dispatches through the `entryGenerationExpr` scanInh split; the
CHECK-entailment equality facts and both origin-side consumers take the
tree unconditionally (`generated-child-override.sql`, witnessed by
gen_c's every-row-NULL `nullif(a, a)`;
`generated-override-only-control.sql` keeps the parent's formula).

Closed by the second adversarial fix phase (2026-08-05), finding 6 /
RC-6 — the LANGUAGE sql body inliner was a THIRD caller of the DML scope
builders, calling `buildDmlScope` directly and bypassing every
rewrite-hook response the first fix phase put INTO the builders
precisely so both entry points would share them: no INSTEAD OF void, no
BEFORE ROW void, no DO INSTEAD rule refusal (the top-level and
data-modifying-CTE spellings of the identical INSERT were measured
correct — a bypassed call site, not a missing rule, made load-bearing by
RC-1's strict fall-through exactly as the charter hypothesized). The arm
routes through `buildInsertScope` and CATCHES the rule refusal: an
inlined body is an optimization, so a refused body costs the call its
precision, not the statement its analysis
(`body-insert-instead-of-view.sql`, `body-insert-do-instead-rule.sql`,
both witnessed on every call).

Closed by the second adversarial fix phase (2026-08-05), finding 1 /
RC-1 — the hook question is per-command and row movement crosses
commands: an UPDATE through a partitioned parent that moves a row is
DELETE + INSERT, and the DESTINATION partition's BEFORE **INSERT**
trigger rewrites NEW (measured — it also rescues the NULL binding the
stationary control raises on). The tree union was right and complete;
it collapses WHICH member contributed WHICH command, so a partitioned
target's UPDATE now asks `beforeRow ∩ {update, insert}`
(`updateBeforeRowHazard`, in both buildUpdateScope and buildMergeScope's
update arm; the same two-command set in mechanism B's gate). The
snapshot carries `relkind` (diff-comparable — a kind flip is
drop-and-recreate) and the adapter answers `resolveIsPartitioned`.
Plain inheritance never routes and keeps the single-command test; zero
radius for partitioned targets without INSERT triggers
(`partition-row-movement-trigger.sql` witnessed on every moved row,
`partition-row-movement-param.sql` with the rescue exercised).

Closed by the second adversarial fix phase (2026-08-05), finding 2 /
RC-2 — RC-3's "the CHECK path needed nothing: children carry their own
pg_constraint rows" was true for inheritable CHECKs and false for
`CHECK … NO INHERIT`, which is never copied to a child at all — the ONE
CHECK divergence route PostgreSQL permits (five others measured refused;
partitioned parents refuse the construct itself). The snapshot captures
`connoinherit` (`ConstraintInfo.noInherit`, diff-included) and
`TableInfo.hasDescendants` (diff-comparable — a FIRST child changes the
reading with every column flag unchanged); the adapter grows
`resolveCheckConstraintsTree`, dropping NO INHERIT constraints exactly
when descendants exist; the walk's entry consumer picks the list by the
same scanInh split the flags use, the origin consumer takes the tree
unconditionally. Four pins: tree and conditional (witnessed by the
unconstrained children's generated NULLs), the ONLY control keeping the
derivation, and the CTE re-export pinning the origin route.

Closed by the second adversarial fix phase (2026-08-05), findings 11 and
12 / RC-8 — the builtin tables were re-swept with new INPUT CLASSES and
two entries failed their own admission criteria. `extract`/`date_part`
(one function, two names) are out of `STRICT_TOTAL_BUILTINS`: month, day
and hour of an infinite timestamp, timestamptz, date or interval are
NULL (measured — the first sweep's finite probes could not see it). And
priority 6b gained a VARIADIC gate ahead of all three tables:
`VARIADIC <array>` passes the variadic parameter as ONE array and a NULL
array yields NULL — measured for concat, concat_ws with a non-null first
argument, and the json constructors, while a non-null array of NULL
elements behaves element-wise — so every variadic-array call drops to
conservative nullable; `ALWAYS_NOT_NULL` was unfalsifiable-by-
construction until the calling convention changed what "the arguments"
means. Costs `date_part('year', finite)` its notNull — the substring
trade again; corpus dry-run clean (`builtin-extract-infinity.sql`
witnessed by inf_t's generated infinity rows,
`builtin-variadic-null.sql` witnessed on every row).

Closed by the post-phase probe (2026-08-05) — an unsoundness the fix
phase itself left, found by composing finding 2's mechanism with finding
3's and convicted by two probes before any code moved: the write-rewrite
hooks were read from the NAMED relation while the trigger that rewrites a
row is the trigger of the relation the row LIVES in. Tuple routing fires
the PARTITION's BEFORE ROW trigger for an INSERT through the parent
(measured — the routed row came back with its written value nulled), and
an UPDATE through an inheritance parent fires the CHILD's trigger for
child rows (measured likewise), so the written-value map and SET-mask
voids never fired for either. The snapshot now computes
`writeRewritesTree` — `beforeRow` unioned over the inheritance subtree,
the hook analogue of `notNullTree`, diff-comparable on the parent for the
same reason; the trigger capture drops its namespace filter so a temp
child's trigger still reaches the union — while rules stay per named
relation (they attach to the named RTE and do not fire through a parent —
measured) and INSTEAD OF stays view-only. The walk honours the same
`RangeVar.inh` bit the flags do: plain references take the tree, `ONLY`
takes the relation's own hooks; the param contract's mechanism-B gate
takes the tree unconditionally (a partition trigger measured rescuing a
NULL binding routed through the parent — conservative for ONLY targets,
where the cost is a dropped claim, never a wrong one). Pinned three ways:
`trigger-partition-routed.sql` (the routed INSERT, written map void, the
rescued NULL binding exercised), `trigger-inherit-child-row.sql` (the
child-row UPDATE, witnessed by every child row), and
`trigger-inherit-only-control.sql`, whose written-literal notNull on an
everywhere-unconstrained column discriminates the hook resolution
itself. Found the day the fix phase closed — the concrete argument for
the second sweep the register now schedules
(`docs/adversarial-sweep-2.md`).

Closed by the adversarial fix phase (2026-08-05), findings 5, 6 and 7 /
RC-1 — the widest-radius fix, deliberately landed LAST so its flips fell
on a codebase whose other claims were already correct: three sites
inferred TOTALITY from properties that constrain one input case. (5)
Priority 4 concluded non-null from strictness plus non-null arguments;
strictness says NULL in ⇒ NULL out and nothing else (`lookup_name` over a
missing row returned NULL from a non-null argument — measured). The
dispatch now concludes only the nullable direction — before the body walk,
which a strict function with a NULL argument never runs — and falls
through otherwise: LANGUAGE sql bodies keep their precision (the zero-row
gate is what makes lookup_name honest; lower_strict's literal calls stay
notNull through `SELECT $1`), everything else drops to conservative. The
consensus twin follows; operators inherit through their backing functions
(`strict-not-total-function.sql`, all four shapes witnessed). (6) The
aggregate dispatch read a non-null INITCOND as totality; `agginitval` is
the state BEFORE any transition and fixes the empty-input result only,
while `agg_nullify`'s transition and `agg_finalnull`'s FINALFUNC returned
NULL over non-empty input (measured). The rule is gone; `count_it` reads
nullable — the honest price of an unanalysable transition, paid across
four re-annotated fixtures with the @unwitnessable reason recorded
(`aggregate-initcond-not-total.sql` is the witness pair). (7) Six
`STRICT_TOTAL_BUILTINS` members failed the table's own admission
criterion, each measured: `array_position`, `substring` (by name — the
total positional form is indistinguishable; `substr` stays), `scale`,
`min_scale`, `to_number`, `to_char` (`builtin-totality-table.sql`, all
six witnessed per row). Dry-run against the generated corpus before
committing, per the report's caution: zero violations, zero
disagreements — the corpus's aggregate and function axes do not carry the
flipping shapes, so the churn stayed in the four hand fixtures.

Closed by the adversarial fix phase (2026-08-05), finding 15 / RC-8 — a
param-contract unsoundness: a window frame OFFSET is a rejection site the
analysis did not enumerate. PostgreSQL raises `frame starting/ending
offset must not be null` for a NULL bound — ROWS, RANGE and GROUPS, both
directions, and even over empty input (all measured) — while the register
pins the sibling placement, LIMIT/OFFSET, as taking NULL legally; the
engine had claimed the frame bound on that analogy. `collectParamFacts`
now treats a `WindowDef` startOffset/endOffset as rejecting: a direct
parameter via mechanism B (execution-time, existential — a subquery that
never runs never evaluates its frame, so no narrowing), an expression via
`rejectFlow`. Two AST spellings land: `FuncCall.over` is a concrete
struct field emitted UNWRAPPED, and named windows arrive wrapped in the
windowClause — the unwrapped one is why the first cut silently missed.
`param-window-frame-offset.sql` graduates with the raise witnessed, and
the param-soundness suite's null-rejection pattern learned the third
message. `docs/argument-nullability.md` records the site.

Closed by the adversarial fix phase (2026-08-05), finding 11 / RC-7's
unresolvable-relation half — the two halves landed together, as the report
prescribes, because the refusal alone would have turned every
partitioned-table query into an error. (a) The snapshot's capture set grew
to relkind 'p' and 'f' beside 'r' (partitions already arrive as 'r'), so
partitioned schemas are tracked at all — new tables appear in
`diffCatalogs`, and part_p's id reads notNull through the RC-3 tree
conjunction, since the `ONLY … SET NOT NULL` that opens the inheritance
hole is refused for partitioned tables (measured). Foreign tables ride
along by inspection — no FDW exists in this PGlite build to measure one.
(b) `addRangeVar`'s zero-column fallback became a REFUSAL
(`UnsupportedNodeError`, from-item): star expansion over the fallback was
measured silent in seven placements, and the walk doc's dispatch-site rule
has always said a FROM item must throw. Temp tables, `pg_catalog` and
`information_schema` now refuse rather than mislead — the caller's escape
is PREPARE plus all-nullable, as documented. The refusal immediately
exposed a latent miss it had been absorbing: INSERT…SELECT written-value
analysis walked its source with the STATEMENT's outer scope instead of the
DML scope carrying the WITH clause's CTEs, so `WITH w AS (…) INSERT …
FROM w` written maps silently resolved nothing; the source now chains
through the DML scope. `unresolvable-relation-shape.sql` pins the
partitioned shape (the generator seeds part_p/part_1 inside the partition
bound); the refusal trio is pinned in `unsupported-nodes.test.ts`.

Closed by the adversarial fix phase (2026-08-05), findings 12, 13, 14 /
RC-7's SRF-and-star third — three shape defects, all in the additive
direction (no existing claim moved). Multi-argument `unnest` (12) is a
special form expanding to one column PER ARRAY ARGUMENT, zip-style with
NULL padding, the same per-item rule inside ROWS FROM (measured); the
engine pushed one column total and handed WITH ORDINALITY's counter to the
previous position — `multi-arg-srf-shape.sql` pins it with both padding
and element-NULL witnesses. A column definition list (13) fully determines
a record-returning item's shape and now wins BEFORE catalog metadata,
whose `SETOF record` would resolve to one scalar column
(`coldeflist-shape.sql` for the builtin family, witnessed;
`coldeflist-user-record.sql` for the user function and the ordering).
`(expr).*` (14) is a target-list expansion in disguise: the FuncCall arm
expands the declared return type's fields with EVERY field forced
nullable — a NULL composite expands to a NULL in every field, domain
types included (measured) — while `(t).*` routes through ordinary star
expansion and keeps per-column precision (`composite-star-shape.sql`,
`composite-star-whole-row.sql`); an unresolvable composite REFUSES with
the new `composite-star` site rather than emitting a wrong list (pinned
in `unsupported-nodes.test.ts`).

Closed by the adversarial fix phase (2026-08-05), finding 2 / RC-2 — an
unsoundness removal: the write path was modelled as the statement text,
and PostgreSQL's rewrite stage sits between the two. The snapshot now
captures the hooks per relation and command (`WriteRewriteInfo`: BEFORE
ROW triggers, INSTEAD OF triggers, DO INSTEAD rules — tgtype bits and
ev_type encodings measured; diff-included, since CREATE TRIGGER changes
inference). The walk's response by hook, all measured: a BEFORE ROW
trigger may replace NEW wholesale, so the written-value map is void and
UPDATE's SET mask widens to every target column (the OLD-row evidence
transfer holds for no column); an INSTEAD OF trigger's NEW is reported
verbatim with the view definition never evaluated — even the literal view
column came back NULL — so the view analysis is void too and everything
drops to the view's all-false catalog flags; a DO INSTEAD rule replaces
the statement outright and RETURNING is REFUSED (`UnsupportedNodeError`,
in the scope builders so the traced walk shares it by construction; DO
ALSO keeps the original RETURNING and is not refused). DELETE proved
immune on the trigger side — a modified OLD is ignored for both forms and
the row is reported as read — so only the rule refusal applies there.
MERGE voids through its insert/update arms the same way. The parameter
contract's mechanism B gates on the same hooks (a trigger measured
rescuing a NULL binding, a rule measured redirecting one — both falsify
"a NULL binding raises"); mechanism A stands, typed at parse analysis and
rejected at Bind before any rewrite. Pins:
`trigger-rewrites-written-row.sql` (catalog flags survive, the written
map does not), `instead-of-trigger-view.sql` (all nullable, the trigger's
kept id recorded @unwitnessable), and the rule refusal quartet in
`unsupported-nodes.test.ts` (refused with RETURNING, empty without,
command-scoped, DO ALSO untouched). The cost falls only on relations that
actually carry such objects — the correct shape for it.

Closed by the adversarial fix phase (2026-08-05), finding 3 / RC-3 — an
unsoundness removal: `attnotnull` was read from the NAMED relation while
the query scans the relation SET. `ALTER TABLE ONLY parent … SET NOT NULL`
is legal (measured): parent attnotnull=true, child false, and a
child-stored NULL comes back through `FROM parent`. The snapshot now
computes `ColumnInfo.notNullTree` — the conjunction over the inheritance
subtree via pg_inherits, a descendant outside the captured namespaces
counting as unconstrained — and it is diff-included, since a child gaining
or losing the constraint changes what a tree scan of the parent may
conclude. The walk honours `RangeVar.inh` per entry (the parser emits
inh:true for a plain reference and omits it for ONLY — measured): tree
scans and UPDATE/DELETE/MERGE targets take the conjunction, `FROM ONLY`
and INSERT targets the relation's own flag (an INSERT stores its rows in
the named relation itself — measured; tuple routing is partitioned-only,
where the flags provably agree). Origin entailment's given-present gate
takes the conjunction unconditionally — origins carry no ONLY bit, and the
cost is precision on a `FROM ONLY parent` origin whose children diverge, a
shape nothing exercises. The CHECK path needed nothing: children carry
their own pg_constraint rows and cannot drop or invalidate them (measured,
recorded in the walk doc). `inherit-attnotnull-divergence.sql` pins the
tree scan witnessed by generated child rows;
`inherit-attnotnull-only-control.sql` pins that ONLY keeps the parent's
own flag.

Closed by the adversarial fix phase (2026-08-05), finding 10 / RC-7's MERGE
half — a shape defect that was simultaneously a notNull falsification:
MERGE's `RETURNING *` expands the SOURCE first, then the target (measured —
`UPDATE … FROM` and `DELETE … USING` are target-first and were already
right), while `buildMergeScope` pushed target-first. Same arity, permuted
order: the engine's `ck.name` written-value notNull landed on PostgreSQL's
`s.snote`, which is NULL — the walk doc's standing warning that arity is a
weak guard, made real, and the concrete argument for the consumer gate
comparing ORDER. The source's visible columns now go in ahead of the
target's; qualified stars resolve through `aliases` and were never
affected. `merge-returning-star-order.sql` pins the order under the
soundness suite's ordered name comparison, snote witnessed NULL on the
matched row.

Closed by the adversarial fix phase (2026-08-05), findings 8 and 9 / RC-6 —
unsoundness removals: the grouping-set NULLing override had two escapes.
Consumer side (finding 8), `mergedColumnNotNull` answered a USING/NATURAL
merged column from its constituents' intrinsic flags and never consulted
`groupingSetColumns` — a third resolution route bypassing the override the
two ordinary ColumnRef sites apply; it now checks the set first
(`grouping-set-merged-column.sql`, witnessed by the super-aggregate row).
Producer side (finding 9), `collectGroupingSetColumns` recorded only
ColumnRefs, while PostgreSQL accepts two more spellings for a term: an
output-column ORDINAL (`ROLLUP(1)` — an A_Const, nothing recorded) and an
output-column ALIAS (`ROLLUP(k)` — recorded "k" while the consumers ask
about "id"/"t.id"). Both now resolve against the target list and record
the selected entry's underlying refs; the alias spelling keeps its own
name key too, since PostgreSQL prefers an input column over an output
alias and the set only ever turns claims nullable — over-recording is the
conservative reading. `grouping-set-ordinal-alias.sql` and
`grouping-set-alias-spelling.sql` pin the spellings, each witnessed by the
grand-total row under every data state. Both fixes can only move claims
notNull→nullable, and no existing fixture flipped.

Closed by the adversarial fix phase (2026-08-04), finding 1 / RC-5 — an
unsoundness removal: unqualified predicate references resolved by NAME
alone. `columnMatches`'s single-part branch trusted its caller ("the caller
already knows this alias owns this column"), but `checkWhereGuarantee`
knows only that the alias owns a column of that NAME, not that the
reference RESOLVES there — and USING/NATURAL is the shape that separates
the two: the merged column is the only visible occurrence (which is what
keeps the query legal) while both constituents stay addressable, and a
LEFT JOIN's merged value is the LEFT side's, so `WHERE id IS NOT NULL`
said nothing about `u.id` yet overrode its OPTIONAL joinState. The branch
now resolves through `scope.visible` (as `rewriteRefsToOrigin` already
did) and requires the owning entry to BE the alias; a merged column owns
no entry and matches nothing, an ambiguous name matches nothing. Blast
radius as predicted: zero fixture flips — in every non-merged shape the
resolution agrees with the name. `using-merged-unqualified-guarantee.sql`
pins it, with u's unit NULL-extended together (`@null-group 1*,2*,3*`)
and both arms witnessed.

Closed by the adversarial fix phase (2026-08-04), finding 4 / RC-4 — the one
closure in this list that removed an UNSOUNDNESS rather than an imprecision:
bpchar literal distinctness. `character(n)` comparison strips trailing
blanks BEFORE the collation is consulted ('a'::char(4) = 'a ' is TRUE —
measured), so distinct tokens can name equal values, and the whitelist's
warrant — restated as "byte equality IS value equality for this type under
this collation" — never held for OID 1042; it is out of `TEXT_FAMILY_OIDS`.
The padding hazard sits in the OPERATOR, one level below the collation,
exactly where the citext exclusion already looked; bpchar's constraint
deparse at its own type (`k = 'a '::bpchar` — measured) is what carried it
past the literal-cast gate that stops varchar (whose CHECKs deparse through
`::text` casts and refuse cross-type — measured, and now pinned). Three
fixtures: the OR-CHECK shape and the multi-WHEN arm step, each witnessed by
the padding-admitted ('a', NULL) row the old derivation falsified
(`bpchar-literal-distinctness.sql`, `bpchar-distinctness-case-arm.sql`), and
the varchar control, where the tokens really are distinct, the row is
refused, and the cast gate keeps the claim conservative
(`bpchar-distinctness-varchar-control.sql`). The cost is precision on a type
where the judgment was never sound.

Closed by Wave 13 (2026-08-04): presence groups — the null-group model
exported as contract vocabulary, the output-side analogue of Wave 10's
joint rejection sets and the first wave DRIVEN by the consumer design
(`docs/consumer-design.md` chose factored unions over `sqlc.embed`).
`QueryContract.outputPresenceGroups` carries, per surviving optional unit,
the output columns NULL-extended together with the discriminants (NULL ⟺
absent) marked; the walk-doc section "Presence groups" is the rule list.
The machinery was already latent: membership keys on `RelationEntry.
nullGroup` by bare-reference producer recording in the four assembly loops
(SELECT + DML RETURNING, traced and untraced — parity by shared recording,
held by the parity suite); discriminants re-run the column computation
under a `presumePresent` flag that lifts only the entry's own gate, giving
them catalog, generated-expression, and CHECK-entailment precision — a
`count(*)` inside an optional aggregate subquery discriminates, and
`view-cte-correlated-multi-join`'s sum does so through CTE → view →
aggregate analysis. Refilters resolve with no new mechanism (the fixpoint
writes promotions back; lazy promotion surfaces as a notNull bare member
and kills the unit — extension is atomic); floors (≥2 members, ≥1
discriminant) keep the contract minimal; MERGE's optional source groups
fell out free (`merge-returning`). Verified at Wave 10's bar:
`@null-group N[*],M` annotations with compulsory bidirectional coverage —
which fired on its FIRST run, flagging six existing fixtures the engine
already claimed groups for — per-row falsification (discriminants agree;
absent ⇒ all members NULL) across the five data states, and a two-arm
witness whose absent-arm exemption is DERIVED from the discriminants' own
@unwitnessable annotations (`docs/witness-coverage.md`, "the two-arm
witness").

The wave's three launch residues all closed the SAME DAY (2026-08-04),
plus a batch of pins: RIGHT JOIN, LATERAL, grouped keys, HAVING-refilter,
DELETE USING, duplicate refs, and parameter-driven refilters each got a
fixture before any behavior changed. R3 (presumption) closed via a
presumed-entries set carried into the fresh walks a discriminant
computation spawns — `generated-left-join-gate` flipped to `1*,2*` as its
own annotation predicted. R1 (re-export) closed by storing groups
per-analysis and LIFTING them through bare projections at
subquery/CTE/view references, with the lifted dead rule (an outer-proven
member means the inner-absent arm is refiltered) — the missing-annotation
direction immediately surfaced the dashboard fixture's addresses-CTE unit
and `presence-group-nested-optional`'s predicted second group. R2
(setops) closed by branch agreement: UNION matches exact member sets and
intersects discriminants, INTERSECT/EXCEPT pass the left branch's groups
(the origins discipline) — and the generated corpus immediately earned
its keep: its two-arm bar exposed 67 INTERSECT groups whose absent arm
could never execute (INTERSECT strengthens flat claims from the right
branch — `left || right` — so an inner-joined right branch leaves no
all-NULL row to pair), now dropped by the setop-level dead rule
(`presence-group-intersect-refilter` pins it). The generated corpus runs
the per-row group oracle over every query with the two-arm witness bar
and a rule mechanism mirroring UNWITNESSABLE: **684 groups, 684 both
arms observed, 0 falsified, the rule list empty**. 29 `@null-group`
claims across 24 fixtures.

Found and fixed by the wave's closing audit: star expansion over
DUPLICATE inner column names (`SELECT s.* FROM (SELECT o.id, g.a AS id
…) s` — the one legal way to reach an ambiguous column; PostgreSQL
rejects every explicit reference) resolved inner columns by
FIRST-NAME-MATCH in three consumers, and all three misattributed: flat
nullability (pre-existing since subquery star support — g.a claimed
notNull from o.id's slot, execution-falsifiable), origins production
(pre-existing since Wave 8), and group lifting (new — a foreign column
pulled into a lifted group as a discriminant, falsified by the first
probe row). Fixed positionally: star expansion is the sole caller that
can reach the shape, so it now hands every consumer the column's ordinal
within its entry, recovered exactly in the unqualified branch by
occurrence counting (a USING merge cannot consume a duplicate-named
column, so the k-th visible occurrence IS the k-th inner one). Pinned six
ways — one per consumer × expansion branch: flat claims
(`dup-name-star-nullability.sql`), the lifted group over the alias-star
branch (`presence-group-dup-name-star.sql`), the occurrence-counting
unqualified-star branch (`dup-name-star-unqualified.sql`), the CTE entry
kind (`dup-name-star-cte.sql`), the ORIGINS face — a positionally-renamed
outer CTE makes the formerly-ambiguous column referenceable, and
first-name-match would have carried the WRONG rowPath into CHECK
entailment, falsified by sparse's in-flight/housed guest pair
(`check-origin-dup-name-star.sql`) — and occurrence exactness across a
USING merge with a nullability-distinguishable duplicate pair
(`dup-name-star-using.sql`). The strength-four stress rides on top: four
`id`s from four entries interleaved with unique names plus a second
independent duplicate, nullabilities alternating so any off-by-one flips
a visible claim, on both expansion branches (`dup-name-star-quad.sql`
unqualified/occurrence-counting, `dup-name-star-quad-cte.sql`
CTE/list-index) — the group there assembles from three positions, two of
them duplicate-named.

The GENERATOR WIDENING followed the closures the same day — four axes the
grammar could not previously produce (refilter wrappers pinning a
re-exported optional column; `union-full-var` with a real all-FULL second
branch; a `dup-names` projection star-re-exported; `gm` structures putting
generation-expression discriminants under the oracle), growing the corpus
~6.1k → ~9k queries and the group census 684 → 1490, all arms observed,
zero falsified (`docs/query-generator.md`, "The presence-group widening").
It earned its keep on arrival, twice. First: the CROSS-UNIT PRESENCE
IMPLICATION imprecision — pinning u.val proves t present when the two
share an extension unit, or when u's unit sits inside t's, but presence
proofs were same-rowPath only — CLOSED the same session: `RelationEntry`
now threads a `unitChain` (the ancestry of optional slices), origins carry
it out as depth-tagged crossings (`ColumnOrigin.units`), and a column
whose crossings COVER the goal's certifies presence through a
NUL-sentinel entry in the rename map that only the kernel's presence gate
can see (`presence-cross-unit-same.sql`, `presence-cross-unit-nested.sql`;
the GROUP_UNWITNESSABLE rule written for the shape went stale within the
session and the staleness assertion forced its removal — the discipline
working end to end). Second: the REQUIRED-ALTERNATIVE gap — a set
operation's flat notNull collapses over branches, so an INNER branch's
certainty must be recovered per-alternative; a required origin alternative
with catalog NOT NULL now succeeds outright in origin entailment. Two
rules briefly stood where closure looked refused or deferred — and BOTH
closed the next session, the first after the user correctly challenged
its "refused by design" framing: the all-or-nothing origins encoding (one
unattributable branch voids the column) was protecting the sibling
alignment invariant, not a semantic boundary. Origins now carry one SLOT
per set-operation branch — an unattributable branch contributes an
explicit NULL slot, alignment stays representable by construction, and
`originNotNull` records each branch's flat verdict so a literal branch
SETTLES its alternative without inventing provenance
(`presence-union-literal-branch.sql`). And the kernel-boundary gap closed
by asking the WALK the given-present question the kernel's atoms cannot:
`storedRowNotNull` evaluates a generated column's expression in a
synthetic single-table scope (catalog flags, nested generation, the
table's own CHECKs — every fact per-stored-row, so presence-sound) and
feeds the same kernel short-circuit the catalog flag uses; required
alternatives consume it too (`check-origin-generated-boundary.sql`). Both
rules were deleted with their closures — the corpus's rule list carries
nothing from the widening.

The three conservatisms that outlived the residue closures were then
closed the same day as well, alongside four more pins
(`presence-group-full-using` — the merged column's exclusion and both
sides' units under FULL USING; `presence-group-dml-cte` — the lift out
of a data-modifying CTE; `presence-group-distinct-on`;
`presence-group-rollup-keys` — plain optional keys grouping beside a
ROLLUP; the full-using draft's unwitnessable annotation was corrected by
the staleness check within one run — the generated state draws order ids
outside the customer set). PRESENCE CONSUMPTION: the kernel's presence
gate now short-circuits a catalog-NOT NULL goal — presence proven means
the emitted value is a stored value, and no stored value of the column
is NULL — so evidence pinning any same-rowPath sibling upgrades a
re-exported column with no CHECK involved, and a table with no CHECKs at
all benefits (`presence-group-reexport-refilter`'s carrier flipped as
its annotation prescribed). UNION SUBSET: branch groups now combine by
pairwise member INTERSECTION (a group's restriction to any subset is
sound within its branch), discriminants intersected, floors re-applied
(`presence-group-union-subset`). RECURSIVE GROUPS: a group assumption
iterates to fixpoint beside the flat one — seeded from the base branch,
consumed by the self-reference's lift, shrunk by branch agreement
(`presence-group-recursive`, whose recursion re-emits an inherited
absent arm). No group-specific conservatism remains recorded; new
entries come from whatever the consumer's corpora surface.

Closed by Wave 12 (2026-08): the four origin extensions, and with them
every `residue-origin-*.sql` fixture flipped in one run — the ritual's
largest firing. The representation grew from one origin to
`origins: ColumnOrigin[]`, index-correlated ALTERNATIVES: a UNION output
row comes from exactly one branch and the same branch as its siblings',
so co-derivation matches index by index and entailment proves EVERY
alternative (`check-origin-setop.sql`); INTERSECT/EXCEPT rows are
left-branch rows and pass the left list through. Promotion-at-distance:
OPTIONAL instances now produce origins MARKED optional, and consumption
demands an evidence-only presence proof — some same-rowPath column pinned
BEFORE the harvest fixpoint, whose facts presuppose the very presence
being established (`check-origin-promotion-at-distance.sql`; the unproven
side `check-origin-presence-unproven.sql`, witnessed by dense's guestless
extension). Group keys keep their origins — every row of a group shares
the key values, so sibling keys are same-row facts — while non-keys and
ROLLUP/CUBE-nulled columns refuse (`check-origin-group-keys.sql`). And
DML RETURNING produces origins outright: returned rows ARE stored rows,
NEW for INSERT/UPDATE and the deleted OLD for DELETE, all
CHECK-satisfying (`check-origin-dml-returning.sql`). Section 5's
executable target list is now EMPTY — the re-founding's "residues close
for free" criterion was instead met by the rule engine itself, wave by
wave, which is its own datum about how far the current architecture
carries.

Closed by Wave 11c (2026-08): comparison totality for NOT-taken guards,
under the PROPOSITIONAL CHARTER the user articulated and this entry
names: atoms are opaque tokens, the engine is complete over the Boolean
structure, and atom-level knowledge enters only through the measured
gates (token identity, same-token negator pairing, collation-gated
distinctness). A builtin total+strict comparison whose operands are a
catalog-NOT NULL column and a non-NULL literal cannot evaluate NULL, so a
CASE's ELSE certifies its FALSITY — and that FALSE fact meets a CHECK
written around the IDENTICAL token (`CASE WHEN qty > 0 …` over
`CHECK (qty > 0 OR discontinued_at IS NOT NULL)`;
`check-negative-guard-comparison.sql`). Nothing about the operator is
interpreted: branching on `qty > -20` proves nothing about the CHECK's
`qty > 0`, because crossing literals is order reasoning over VALUES — see
the Decided-against boundary below. The comparison-HARVEST counterpart
was pinned as a residue and the decision arrived the same day: a
comparison (or bare boolean column) whose every column the facts pin
cannot evaluate NULL, so the harvest promotes its notFALSE to TRUE — the
fixpoint supplying the ordering — and CHECK₁'s `seats > 1` now falsifies
CHECK₂'s same-token `seats <= 1` (`check-comparison-harvest.sql`, née
residue-comparison-harvest.sql: the residue ritual's second firing).

Closed by Wave 11b (2026-08): inter-CHECK chaining — and with it the
kernel's derivation restructured into the shape the semantic re-founding
(section 5) prescribes, in miniature. Per-goal CHECK derivation is gone;
in its place a FACT-HARVEST FIXPOINT: each round, every CHECK's notFALSE
spine is descended (AND splits, an OR whose other disjuncts are FALSE
passes to the survivor, a CASE to the arm the facts select) and every
total leaf reached — a NullTest of either polarity — becomes a TRUE fact,
available to every OTHER constraint's next round; generated-equality arm
exclusion re-runs in the same loop; all fact insertion is deduplicated so
convergence is a count and the round cap is insurance. The goal question
is asked once at the end: does the fact set pin the column? Pinned at
depth three by `check-chain-fixpoint.sql` (each chain3 constraint consumes
its predecessor's conclusion), the off-switch by `check-chain-idle.sql`,
and `check-simple-case.sql`'s opened_at @unwitnessable came off exactly as
the residue mechanism forces. Comparisons stay unharvested (notFALSE of a
strict comparison is TRUE-or-NULL; promoting one needs its operands
pinned first) — recorded, not built.

Closed by Wave 11 (2026-08): the five cheap kernel closures, re-graded
from "obscure" after the user correctly separated SQL-shape frequency from
scenario frequency — the schemas this feature targets are exactly where
the scenarios occur. (1) OR-facts store per-arm conjunct ATOM LISTS and
the subset rule matches by arm-implication (A∧B ⇒ A), so
`(status = 'arrived' AND id > 0) OR status = 'housed'` discharges the
CHECK's WHEN disjunction (`check-compound-disjunct.sql`). (2) CASE
implicants: covering every arm RESULT (implicit NULL ELSE included) forces
the expression whichever arm runs, so `CASE WHEN $1 IS NOT NULL THEN $1
ELSE $2 END` claims {1,2} like the COALESCE it is
(`param-joint-case.sql`) — and `…THEN $1 END` with no ELSE now claims a
flat notNull the CASE-opaque analysis missed. The empty implicant (a
literal NULL in every branch) is representable and skipped by rejectFlow
as the static always-raise it is. (3) Simple CASE desugars to its
implicit `arg = value` equality everywhere the kernel meets a CASE —
CHECKs and generated expressions alike (`check-simple-case.sql`, its ELSE
`check-simple-case-else.sql`). (4) NOT-taken TOTAL guards (NullTests
under AND/OR — falsityImpliesNotNull's rule, as a syntactic gate) enter
the kernel NOT-wrapped and become FALSE facts (`check-negative-guard.sql`).
(5) OR-facts trigger generated-CASE arm exclusion per arm-literal, joining
the arms' conditions as a derived OR-fact — `verdict IN
('fraud','no-fraud')` pins fraud_score by the intersection rule
(`check-or-arm-trigger.sql`). Found and pinned along the way:
inter-CHECK chaining does NOT happen — one constraint's conclusion is not
a fact for another's derivation (`check-simple-case.sql`'s opened_at
records it; closing would mean iterating derived facts to a fixpoint).
Measured en route: PostgreSQL's parameter-type deduction fails on a bare
`$1 IS NOT NULL` condition even when a later occurrence would type it.

Closed by Wave 10 (2026-08): joint rejection sets — the parameter
contract's last vocabulary gap. `COALESCE($1, $2)` into a NOT NULL column
rejects neither parameter alone but both together, a fact the flat
`ParamNullability[]` cannot say and a per-param type emission would
mis-promise. Mechanism-C's value-flow now computes minimal IMPLICANTS
(monotone sets over "$i is NULL": strict ops union, COALESCE cross-unions —
whose singleton projection is the old intersection, keeping the flat
contract bit-identical), rejectFlow files size-≥2 implicants as
`QueryContract.paramRejectionSets`, minimized with singleton absorption so
the trichotomy holds: unconditionally required / conditionally required
(the condition spelled by the sets) / unconstrained. CNF at the API
deliberately — the analysis's native form, per-fact verifiable, and the
factored type emission (flat types ∩ one local union per set) derives from
it directly, where a DNF cross-product would need re-factoring. Bounds
(≤ 4 params per implicant, ≤ 8 joint implicants, singletons exempt) are
recorded in `docs/argument-nullability.md`. Verified at the flat claims'
own bar: `@param-reject` annotations with compulsory bidirectional
coverage, members required to carry their nullable claims, and the
soundness suite observing the all-members-NULL raise
(`param-joint-coalesce.sql`; `param-joint-strict-fanout.sql` pins two sets
from one expression). The generated axis carries the same oracle two-sided:
insert-joint/update-joint shapes over NOT NULL targets produce sets the
harness must witness by their all-members-NULL raise, and every
all-NULL-admissible binding is asserted to never null-reject — the
falsification the flat contract could not even express (the previous
all-NULL run swallowed those errors). The witness bar proved itself on
this axis's FIRST run: the update-joint draft targeted a table no default
state populates, and the unwitnessable claim failed the suite until the
target moved to `u`. CASE-shaped joint facts are deferred, recorded.

Closed by Wave 9 (2026-08, measured first): collation-gated literal
distinctness, and the generated-column reverse entailment it unlocks. The
snapshot captures `collisdeterministic` per column (LEFT JOIN pg_collation
on attcollation; diff-included — a determinism flip changes what may be
concluded), and the kernel's new judgment holds two string tokens provably
DISTINCT only for builtin text-family columns (OID whitelist — citext's
case-folding lives in its operator and never qualifies; numerics never
qualify, 75 vs 75.0) under a proven-deterministic collation. Two consumers:
multi-WHEN CHECK CASEs, whose later arms need earlier conditions FALSE
(`check-multiwhen-second-arm.sql`; the numeric refusal
`check-multiwhen-numeric-negative.sql`); and GENERATED columns as EQUALITY
facts — `verdict = CASE …` holds exactly per stored row, so
TRUE(verdict = 'fraud') excludes every arm with a provably-distinct literal
result and the NULL ELSE, and a lone surviving arm's condition joins the
facts, letting `WHERE verdict = 'fraud'` pin `fraud_score` with no CHECK
constraint at all (`check-generated-arm-fraud.sql`; the two-arm ambiguity
`check-generated-arm-nullable.sql` stays nullable, witnessed). The kernel
gained a direct output path — facts pinning the goal column finish without
CHECK derivation — and both fact sources flow through origin tracking, so
the verdict filter narrows outside a CTE too. The collation gate's
counterexample is `check-distinctness-collation-gate.sql`: under real ICU,
WHERE tag = 'A' returns a stored 'a' row whose first arm was the TRUE one;
measured PGlite limitation — its ICU is catalog-only ('a' = 'A' is false),
so the fixture pins the refusal by annotation and the witness row is
recorded as unreachable. An ELSE-selected CASE still derives nothing (arms
fail on FALSE *or NULL* — 3VL), and or-fact triggers for arm exclusion are
deferred.

Closed by Wave 8 (2026-08): scope locality — origin tracking. A bare
pass-through output column now records its provenance (`ColumnOrigin` in
`src/query/types.ts`): base table plus a rowPath, the chain of
relation-instance ids with each CTE/subquery/view re-export prepending its
own reference instance. Row identity is the PATH — two references to one
memoized analysis share its inner ids, and only the per-reference prefix
keeps a self-join from co-deriving across different base rows
(`check-origin-self-join.sql`). The referencing scope's evidence is renamed
from outer names to base columns for same-rowPath siblings (the swap
fixture `check-origin-rename.sql` pins that names mean nothing, origins
everything) and runs the same kernel against the origin table's CHECKs,
under the referencing site's joinState gate
(`check-origin-left-join-gate.sql`). Origins are produced for REQUIRED
instances only and die at transforming expressions
(`check-origin-expression-death.sql`), USING/NATURAL merges, set
operations, grouping, VALUES, and DML RETURNING; DISTINCT preserves them.
Headline closures: filter-outside-CTE and filter-outside-view
(`check-origin-cte.sql`, `check-origin-view.sql`). Deferred with reasons
recorded: promotion-at-distance (outer evidence proving an OPTIONAL inner
instance present), group-key origins (sound, unbuilt), origins through set
operations and DML RETURNING.

Closed by Wave 7 (2026-08): the entailment kernel's own residue row, all
four sound-to-add items from Wave 6's closure. OR-facts with the subset
rule — TRUE(a ∨ b) names no arm but makes any superset disjunction TRUE, so
disjunctive evidence (OR, multi-element IN, `= ANY` array literals) now
discharges CHECK-side ORs/ANYs whose arm set covers it
(`check-or-subset.sql`, `check-or-verbatim.sql`, negative
`check-or-not-subset.sql`), and an OR-fact every arm of which strictly
involves a column pins that column non-null, mirroring the promotion
analyzer's intersection rule. The negator pairing runs both directions
(FALSE certifies the negation TRUE — a strict comparison that evaluated
FALSE had non-null operands; `check-negator-dual.sql`), with De Morgan over
NOT-wrapped ORs. Taken branch guards join the kernel's evidence
(`check-guard-entailment.sql`). And the SET mask became the row-consistency
channel model: every fact must hold on the row the derivation runs against
— WHERE facts are OLD-row, guard facts belong to the row the guarded
expression reads (NEW in RETURNING, OLD in SET expressions, distinguished
by the new dmlOldRowRead flag) — giving a NEW-row run (core masked, guards
free) and an OLD-row run (core free, guards masked, non-SET goals only,
old = returned). `check-update-set-mask.sql` now pins both channels in one
statement, its `room` @unwitnessable annotation retired as designed, and
`check-set-expr-old-read.sql` pins the SET-expression read context. Sound
wherever dmlSetColumns exists, because both its producers (UPDATE,
all-MATCHED MERGE) guarantee an OLD row per returned row; INSERT never
sets it. Found and fixed in passing: the TRACED walk had rebuilt DML
scopes by hand and drifted (no WHERE channel, no SET mask, no
written-value map), so `inferNullabilityTraced` could report a different
verdict than the engine and "explain" it — the scope builders are now
shared by construction (buildInsertScope/buildUpdateScope/buildDeleteScope,
buildMergeScope already was), and a parity test in
`nullability-walk-traced.test.ts` runs every fixture through both entry
points.

Closed by Wave 6 (2026-08, measured first): CHECK-constraint-aware
nullability — conditional nullability, the register's last precision item.
A validated table CHECK is a **notFALSE** fact per stored row (PostgreSQL
admits a row whose CHECK evaluates NULL — pinned in
`check-constraint-pins.test.ts` with the design consequence named), the
row-implied evidence list is TRUE per emitted row, and the kernel
(`src/query/check-entailment.ts`) derives `col IS NOT NULL` from the two by
syntactic 3VL entailment: identity over a closed deterministic fragment
(builtin comparisons by bare name, `IS [NOT] NULL`, desugared BETWEEN, bare
boolean columns; literal casts equate only at the column's own type — the
deparser writes `'housed'::text` where the WHERE has the bare token, and
matching across types is the citext hazard), builtin **negator pairing** in
place of the banned literal distinctness, AND/OR/NOT algebra, searched-CASE
arm selection, `= ANY (ARRAY[...])` as the OR it renders from, and totality
of IS NOT NULL. The generated-column gates are shared and pinned: joinState
(`check-left-join-gate.sql` / `check-left-join-promoted.sql`) and the SET
mask applied per evidence conjunct — entailment consumes evidence about
OTHER columns, and `check-update-set-mask.sql` would falsify the engine
without it. `convalidated=false` excludes NOT VALID and PG18 NOT ENFORCED
both (`check-not-valid.sql`, `check-not-enforced.sql` — the snapshot now
captures `validated`, diff-included deliberately: VALIDATE CONSTRAINT
changes inference); PG18 `contype='n'` NOT NULL rows, which
`mapConstraintType` folds into "check", are dropped by parsed node type.
The motivating pair is fixture-verbatim (`check-case-discriminator-*`),
plus implication-as-OR and the AND-concatenated split
(`check-implication-or.sql`, `check-and-concatenated.sql`). Decided without
building: the generated-axis check-conditional projection — the `guest`
generators exist (status-correlated NULL policies via `ctx.current`), a
projection would add oracle breadth over shapes the fixtures already pin;
recorded here, no silent cap.

Closed by the Wave-1 analyzer generalization (2026-08: strict-expression
closure, OR by intersection, the presence fixpoint over join quals, HAVING
as ungated evidence, and the DML WHERE channel with its SET-column mask —
see `docs/nullability-walk.md` "The presence fixpoint" and the boundary list
in `docs/argument-nullability.md`): `OR` in WHERE, branch guards beyond the
pattern list, strict quals over a NULL-extended side (including all 44 deep
structures and the `UPDATE … FROM` variant), and INNER `ON` / HAVING /
DML-WHERE narrowing. Each closure is pinned by a fixture
(`where-promotion-or`, `case-guard-strict-closure`, `join-refilter-promotion`,
`join-chain-fixpoint`, `join-on-promotion`, `having-narrowing`,
`dml-where-channel`, `update-set-mask`), and every generated-suite trap rule
those imprecisions carried went stale and was deleted, as designed.

Closed by Wave 5 (2026-08): generated-column reads — the generation
expression (pre-parsed from the snapshot, which now labels `attgenerated`
correctly: stored/virtual, not the identity pair it had borrowed) is walked
at the reading site with refs bound to the read entry, under the joinState
gate a NULL-extended row demands (`generated-left-join-gate.sql` is the
pinned counterexample); the stored row IS the read row, so WHERE promotion
and the written-value map compose into it for free (`generated-promotion`,
`generated-written`). And overloaded names, the sound half — arity
filtering (PostgreSQL never picks a candidate that cannot accept the call's
argument count) plus consensus over what remains (all-strict for the
closures and dispatch, all-NOT-NULL-domain returns, per-position domain
agreement for mechanism A; operators mirror it with strictness by consensus
and body dispatch only when single). Disagreeing candidates stay refused —
`over_fn` still pins that. `overload-consensus.sql`,
`param-overload-arity.sql`. Also pinned: every write reaching a GENERATED
ALWAYS column (stored or identity) fails at PREPARE — a rejected statement
has no contract, and the implicit column list does not skip generated
columns, which is what keeps the written-value map's positional prefix-zip
sound (`param-mechanism.test.ts`).

Closed by Wave 4 (2026-08, measured first throughout): USING/NATURAL join
quals (synthesized as the equality conjuncts they are and fed to the
presence fixpoint; `join-using-promotion.sql`); arm-aware MERGE — the
source is OPTIONAL only when a NOT MATCHED BY SOURCE arm exists (flipped
`param-merge`'s own unwitnessability note), the join condition is
row-implied when every arm is MATCHED-kind, and written values intersect
per-arm exactly like ON CONFLICT's paths (the `merge-returning-written`
trap fired and was acknowledged); `JSON_EXISTS` over a non-null context
(the ONE provable member of the path-query family — a found JSON null
defeats every handler for VALUE/QUERY, measured); builtin STRICTNESS
captured from pg_catalog itself (name-level bool_and over `proisstrict`,
replacing the curated set with the source of truth) plus a 23-entry
measured totality batch; and array SLICES (clamp, never NULL by range).

Closed by Wave 3 (2026-08): custom operators — the snapshot captures
`pg_operator`, strict-backed operators gate promotion/narrowing/attribution,
and results dispatch through the backing function's own rules (section 3
below; `custom-operator.sql`) — and DML RETURNING written values: INSERT
VALUES cells by intersection over rows, INSERT…SELECT via the source's own
analysis, UPDATE SET expressions (the NEW row is what RETURNING reports),
and ON CONFLICT DO UPDATE as the intersection of both producing paths
(`returning-insert.sql`, `returning-update.sql`, `returning-insert-select`,
`returning-conflict-both`, `returning-conflict-existing`). Written evidence
only ever upgrades — a nullable expression written into a rejecting column
raises rather than returning.

Closed by Wave 2 (2026-08, all behaviours measured first and pinned by
fixtures): ordered-set aggregates (`WITHIN GROUP` sort expressions now
visible, plain-aggregate gates; the hypothetical-set `rank` family measured
TOTAL — a position even over zero rows — hence notNull unconditionally;
`ordered-set-aggregates.sql`), the SQL/JSON value-list constructors and
`XMLELEMENT` (always produce a container; `JSON()`/`JSON_SCALAR`/
`JSON_SERIALIZE`/`XMLSERIALIZE` strict; `json-constructors.sql`), and window
aggregates over the default frame (never empty — the window analogue of the
non-empty-group gate; `window-default-frame.sql`, plus the generated
`a_wmin` column across the structural space).

| Construct | Current | Note |
|---|---|---|
| `A_Indirection` element / field / jsonb subscripts | nullable — correctly | measured: out-of-range elements and missing jsonb keys ARE NULL, and composite fields carry no constraints. SLICES are closed (Wave 4): they clamp rather than NULL, so a slice of a non-null array with non-null bounds is notNull (`array-slices.sql`) |
| `JSON_VALUE` / `JSON_QUERY`, `JSON_ARRAY(subquery)`, `XmlExpr` beyond `XMLELEMENT` | nullable — correctly, permanently | measured: a FOUND JSON null maps to SQL NULL through every ON EMPTY/ON ERROR handler combination, so no clause analysis can ever prove these; `JSON_ARRAY(SELECT …)` over an empty subquery is NULL; `xmlconcat`/`xmlforest` of NULLs are NULL. `JSON_EXISTS` is the one provable member and IS closed (Wave 4, `json-exists.sql`) |
| Non-strict scalar and `LANGUAGE plpgsql` functions | nullable | bodies are not statically analysable; the NOT NULL domain return is the escape hatch |
| `pg_catalog` built-ins outside the TOTALITY tables | nullable | STRICTNESS is no longer curated — the snapshot captures pg_catalog's `proisstrict` name-level (Wave 4). Totality has no catalog flag and cannot be proven by sampling (`array_length` of an empty array), so `STRICT_TOTAL_BUILTINS` / `ALWAYS_NOT_NULL_BUILTINS` stay docs-curated, each entry measured on admission |
| Custom operators backed by unanalysable functions | nullable results | the operator machinery is built (section 3); what remains conservative is the output side when the backing function is plpgsql or has multiple candidates — the same boundary those functions have when called directly |
| MERGE with mixed arm kinds | condition not row-implied | the join condition narrows and promotes only when EVERY arm is MATCHED-kind (Wave 4) — a NOT MATCHED arm fires precisely on the condition's failure, so mixed statements keep it dark. Per-arm condition reasoning was judged not worth it |
| CHECK entailment, conservative edges (post-Wave 11b) | nullable | parameters never match (identity needs the literal token — `WHERE status = $1` proves `status` non-null but selects no CHECK arm; permanent for a per-statement contract); and consumption of origins is gated as designed: an unfilterable OPTIONAL chain (`check-origin-presence-unproven.sql`) and a non-key grouped column each keep their columns dark. (An unattributable set-operation BRANCH no longer voids its column — it contributes a NULL slot whose alternative is settled by the branch's own flat verdict, the 2026-08-04 slot closure) |
| Presence groups | none recorded | every launch residue and post-launch conservatism closed 2026-08-04 (re-export propagation, setop groups, generation-expression discriminants, presence consumption of catalog notNull incl. cross-unit implication via unit chains, UNION subset matching, recursive-CTE groups — the Wave 13 closure entry is the history); future entries come from consumer corpora |
| Base-table alias column list | ignored — sound | adversarial section 5: `FROM t AS z(p, o, r, s)` renames positionally for subqueries, VALUES and table functions, not for a RangeVar. References through the new names fail to resolve (nullable), and `SELECT *` emits the CATALOG names where PostgreSQL emits the alias names — positionally correct flags, so diagnostic only, but the soundness suite's name comparison would flag a fixture using it, and the same code path already renames three other ways |
| NOT NULL domain column at a REQUIRED entry | nullable — sound | adversarial section 5: `attnotnull` stays false for a domain-constrained column, yet the domain rejects every write, so a required entry's value cannot be NULL. `isNotNullDomain` + `resolveColumnTypeOid` are both already in the catalog interface; closing would also admit such columns as natural presence-group discriminants |
| Boolean literals in CHECK expressions | not atoms — sound | adversarial section 5: `CHECK (false OR x IS NOT NULL)` is stored verbatim (measured — no constant folding), and the kernel does not read the `false` disjunct as FALSE, so the survivor never gets notFALSE. Squarely inside the propositional charter's atom gates; cheap to close if ever worth it |
| Generation expressions at origin-entailment boundaries | CLOSED 2026-08-04 | the closure candidate was built as prescribed: `storedRowNotNull` dispatches the generation expression through the walk in a synthetic single-table scope and feeds the kernel's given-present short-circuit; the rule that pinned the witness consequence went stale and was deleted (`check-origin-generated-boundary.sql` is the pin) |

---

## 3. Custom operator support — built (Wave 3)

**What landed.** The snapshot captures `pg_operator` (name, operand types,
backing function, and the function's `proisstrict`), and the adapter resolves
operators by the proven single-candidate policy: one user operator with that
name (schema-qualified references narrow the search), or refuse. Builtin
names keep the curated `TOTAL_STRICT_OPERATORS` set, matched on BARE names
only — the documented shadowing blind spot, unchanged.

Consumers: the WHERE-side gate (`promotionOperatorIsStrict`) and both strict
closures accept a resolved operator whose backing function is declared
strict — strictness is exactly the property those conclusions need, and
totality is deliberately NOT inferred from it. Output-side, a custom
operator's result dispatches its backing function through the full FuncCall
machinery (NOT NULL domain returns, `LANGUAGE sql` body inlining), which is
how the fixture's non-strict `===` — kept from the promotion-unsoundness
fix — now analyses to notNull via its `SELECT true` body while still
promoting nothing. `custom-operator.sql` pins both directions with the
strict `====` / non-strict `===` pair.

**Residue.** Operators backed by unanalysable functions (plpgsql, multiple
candidates) stay conservatively nullable on the output side; the shadowing
blind spot stands.

---

## 4. Unbuilt verification strategies

One of the five strategies proposed for finding engine defects remains
unbuilt, and after assessing the candidates it is **demoted, not queued**.
(Generated queries, formerly listed alongside it, are built — see
`docs/query-generator.md` and `tests/unit/query/generated/`.)

**Differential oracle — assessed 2026-08, both candidates read in full.**

*postgres-language-server*: no comparable surface at all. It never derives a
query's output column list, contains zero code inspecting join types, and its
"type checking" hands the SQL to a live PostgreSQL via PREPARE — the same
oracle this project already uses directly. Nothing to disagree with. The
reading did produce salvage for pgsid's own language-server surface —
`docs/postgres-language-server-notes.md` records it (dual-parser
architecture for incomplete SQL, statement splitting, the productionized
PREPARE harness, error-cursor mapping).

*sqlc*: closer than expected — its PostgreSQL engine parses with libpg_query
like ours, and `internal/compiler/output_columns.go` is genuinely join-aware
(LEFT/RIGHT/FULL demotion with alias-correct matching, CTE plumbing), with
`sqlc analyze` emitting per-column/per-param `not_null` JSON, no database
needed. But it is unsound in BOTH directions — every resolvable function
including `sum`/`max` is NOT NULL (`ReturnTypeNullable` never populated for
PG), scalar subqueries inherit the inner column's NOT NULL, nested join trees
drop the outer requiredness, UNION takes the left arm only — while having no
WHERE promotion at all, so it cannot serve even as a one-sided bound. Its
parameter `not_null` is also a different *definition* than ours (ergonomic
"which column is it compared to", close to the deadness lint this project
rejected), so param comparison is a category error. A differential run is
informative only in a narrow band (left-deep joins over base tables, no
aggregates, no set ops, no scalar subqueries) where our claims are already
execution-verified with witnesses.

**Trigger, narrowed:** none foreseeable for finding OUR defects. The inverse
is real: our corpus provably exercises sqlc's enumerated holes, so running
`sqlc analyze` over the fixtures would mostly find bugs in *sqlc* — a
possible upstream contribution someday, not verification of this engine.

**The EXPLAIN oracle — built as an observatory (2026-08-19), ratchet
deferred.** The differential oracle that works is the one that compares
against PostgreSQL itself rather than a reimplementation: the planner's
`reduce_outer_joins` is WHERE promotion, run by the engine that defines
correctness, and its verdict is public API — surviving outer joins are
visible in `EXPLAIN (FORMAT JSON)` as plan-node `Join Type`s.
`tests/unit/query/explain-oracle.test.ts` counts them against the raw AST's
outer `JoinExpr`s per fixture; `docs/witness-coverage.md` ("The EXPLAIN
oracle") records the mechanics, the count-not-identity design, and the
interpretation asymmetry (the planner acting is evidence; the planner
declining proves nothing, because CHECK and FK entailment promote where the
planner cannot).

The export is built (2026-08-19): `WalkOptions.joinAudit` — one record per
syntactic outer join, deduped on the `JoinExpr` node across fixpoint re-runs
and set-operation rebuilds, settled flags per extended side, null-group ids
in the same id space as `ColumnOrigin.units` so the oracle attributes output
claims to joins (a notNull column whose origin crosses a unit refilters that
unit's absent arm — the statement-level survival a scope-local flag cannot
state). Reconciled measurement: 430 agree, 20 engine-stronger all classified
(13 FK/CHECK, 6 MERGE, 1 INTERSECT-arm refilter), 0 planner-stronger, no
strict-qual-settled join the planner declined.

The BAR is set (2026-08-19), fixture-side rather than test-side: each
engine-stronger fixture declares `-- @planner-keeps N: reason` (parsed in
`fixture-args.ts`, enforced both directions by the oracle — undeclared
divergence, stale count, and any `planner-stronger` fixture all fail).
Twenty fixtures carry annotations: thirteen FK/CHECK entailments, six
MERGE matching joins (no `JoinExpr`, invisible to the audit), one
INTERSECT-arm refilter.

The generated-corpus extension is built (2026-08-19):
`generated/generated-explain.test.ts`, agreement measured rather than
declared, and every planner-stronger divergence CLASSIFIED by
`explain-instrument.ts` — an unexplained one fails naming the query, and the
census is pinned both directions. First census, 14,964 queries: 13,047
agree, 1,340 engine-stronger (reported, unasserted — keys, CHECKs,
cross-branch refilters at scale), 577 planner-stronger, all explained:

- **slice-local-strict-qual — CLOSED 2026-08-19 (was 436, now 0).** The
  participation closure is built into the fixpoint
  (`resolveJoinImplications`; spec in `docs/nullability-walk.md`, "The
  participation closure"). The landed rule, one level more general than
  the candidate: an ARM of a join is non-preserved when a failing row is
  DROPPED by the join type or its only other path — emission by extending
  the opposite side — is DEAD (that unit dissolved, or a member proven
  present); a strict qual over an alias then DISSOLVES any nested unit
  whose extension nulls it, chains shrinking outside-in so each join's
  death arms the next (`t LEFT (u RIGHT (v RIGHT ck))` settles fully).
  Dissolution — remove the unit from every chain, innermost memberships
  falling back outward, empty chain meaning genuine presence — is what
  keeps co-membership, presence groups, origins, and the audit coherent
  through one operation. The tripwires worked as designed: both
  `@planner-reduces` annotations went stale and flipped to positive pins
  now carrying recovered presence groups; the two FK composition fixtures'
  `@planner-keeps` also went stale (their key chains settle SIDES while
  both FULL JOINs keep a genuinely extending side — agreement at join
  granularity, the walk still stronger at side granularity). One
  implementation finding, caught by the audit before landing: sibling
  entries of a join side SHARE the unitChain array, so dissolution must
  reassign a filtered copy, never splice in place.
- **join-removal — 0 in the census (was 138 as first classified).**
  remove_useless_joins deletes a unique, unreferenced side: a row-count
  fact, not a nullability fact, permanently out of scope and detected from
  the plan itself (the scan node is gone). The 138 vanished because the
  closure settles the same joins those queries' quals already killed; a
  PURE removal with no settling qual remains possible and stays pinned as
  `explain-join-removal.sql`.
- **srf-unit-blindspot — CLOSED 2026-08-19 (was 3, now 0).** An
  outer-joined set-returning function has no base table, hence no
  `ColumnOrigin.units` entry, so the instrument could not subtract a
  cross-scope refilter the engine's claims already made. Closed by the
  `unitCrossings` diagnostic channel: under `WalkOptions.collectUnitCrossings`
  (the oracle's flag; never in production output) a bare pass-through claim
  carries the units its production chain crosses, composed by `originOf`'s
  lift without the table anchor origins require, passing through
  set-operation combines by branch concatenation (a UNION claim proven
  notNull held on every branch's rows). Origins stay untouched — they exist
  to name what CHECKs and keys are stated over, and an anchor-less origin
  would have been an invented object. Pinned as
  `explain-srf-refilter-blindspot.sql`, now a positive pin.

**No remaining trigger.** planner-stronger is EXTINCT on both corpora
(hand: 1 declared join-removal pin; generated: 0 across all classes), and
every classifier stays armed with a pinned count of 0 so any regression
re-opens its class by name.

**The sqlc disagreement register — ADJUDICATED AND EXECUTABLE
(2026-08-20).** All 40 per-column disagreements between sqlc's IR and the
walk are settled, and settled BY DATA that re-runs. Census: ticket-ready
16, pgsid unsoundness 0, pgsid-imprecision 10, conservatism-expected 14,
unresolved 0.

The shape it landed in matters more than the numbers. The truth is now
per case, beside the vendored files — `cases/<case>/data.sql` (the state
sqlc does not ship) and `cases/<case>/adjudication.json` (the conclusion
it supports, with `adjudicatedAgainst` naming the sqlc release the
reasoning was done against). `docs/sqlc-disagreements.md` is GENERATED
from them and is no longer a source of truth; regenerating is safe, which
it was not before. `sqlc-corpus.test.ts` re-derives every verdict from
rows on every run and pins the disagreements and their verdicts BY NAME
(`DISAGREEMENTS` / `ADJUDICATED` in `sqlc-corpus.ts`), so a compensating
swap can no longer hide behind a count. Four drift checks fail loudly: a
conclusion drawn against another release, a state with no conclusion, a
disagreement with no entry, an entry whose disagreement is gone.

**What is now open from it.** Five upstream drafts
(`sqlc-corpus/tickets/T1–T5.md`), written and NOT filed. Nothing else — all
TEN pgsid imprecisions closed 2026-08-20, each with a fixture that graduated
from recording the imprecision to asserting the fix: six to the function
overload merge (`body-builtin-parameter-type.sql`), two to admitting the
sequence functions to `STRICT_TOTAL_BUILTINS`
(`builtin-sequence-nextval.sql`), one to excluding `returnsSet` from the
strict-total branch (`srf-strict-nullable-argument-target-list.sql`), and one
that was never an engine defect: this corpus was calling the walk without the
subtree evaluator both fixture suites pass, which was the whole of
`builtins/Scale`. The census is 30 entries, 16 ticket-ready and 14 expected
conservatism, with no imprecision and no unsoundness on either side.

**PostgreSQL regression suite as a borrowed corpus — recorded, not
scheduled.** `postgres-pglite/src/test/regress/sql` (232 files, PostgreSQL
License) is the most adversarial SQL corpus in existence but is stateful
scripts, not schema/query pairs: using it means treating each file as a
continuous migration and intercepting the SELECTs/DMLs against
accumulated state. Query shapes are mostly simplistic — the prize is
SYNTAX coverage (every construct PostgreSQL has), i.e. refusal-census and
shape-oracle reach, not nullability depth. Trigger: wanting the
unsupported-node surface swept by the engine's own authors' corpus.

---

## 5. Semantic re-founding — standing TODO, parallel-track

**What.** Re-found the engine on a semantic core instead of the grown rule
system: lower the parsed AST once into a small relational IR (~10
operators — Scan/Filter/Project/Join/Union/Aggregate/Values/DML — with
predicates in one normalized 3VL language), model a relation as a set of
rows carrying a REFINEMENT (its invariant), and let operators transform
refinements compositionally. Scan emits the catalog's notNull facts,
validated CHECKs as notFALSE, and generated columns as equalities — one
uniform refinement where today those are separate code paths; Filter ADDS
TRUE facts (WHERE promotion, implied quals, HAVING, and branch guards all
become the same operation at different sites); Join contributes presence
(joinState derived from the operator instead of hand-threaded); column
nullability becomes the single question "does the row refinement entail
col IS NOT NULL?" — the entailment kernel promoted from leaf-level
consultation to THE engine. Origin tracking becomes provenance proper
(the semiring formulation — rowPath is hand-rolled why-provenance), under
which the origin extensions that are architecturally heavy today compose
naturally.

**Why believe it.** The diagnosis: most of the current rule surface is
AST-shape normalization (accidental — collapses into the lowering, once),
a smaller part is measured PostgreSQL facts (irreducible — they become
the model's axioms, and the pins already are that), and the actual
inference is ALREADY the abstract thing (the kernel is a small sound
proof system; the waves added fact sources, not special cases). The tell:
features hard here but natural in the cleaner model — origins through
UNION, promotion-at-distance — mean the architecture is fighting its
representation.

**Method — why this is low-risk for THIS project.** Not a rewrite. The
current engine stays as is; the prototype is a PARALLEL implementation
differential-tested against it AND the execution oracle over the same
corpus — the fixtures, witness discipline, and generated axes are
representation-independent, so parity is a number that goes up and the
prototype cannot drift silently. Cut over only at full parity; the
cut-over test of whether the abstraction earned its keep is that the
residue fixtures below flip from recorded imprecision to claims — if they
don't fall out, the model was wrong and we lost a prototype, not the
engine. The `QueryContract` boundary means the consumer never notices.

**What it must not change.** The measured-pin culture (PostgreSQL is not
its spec; axioms come from PGlite), the contract surface, and the
witness invariant.

**Executable target list.** The mechanism: known-imprecision residue
fixtures (`residue-*.sql`, `@nullable` + `@unwitnessable` with the
residue named) pin conservative answers, and any engine that starts
narrowing one fails the annotation suite in the "you improved — update
the claims" direction. The list EMPTIED on 2026-08: Waves 11b–12 closed
every entry inside the rule engine (the ritual fired six times — see the
Wave 11b/11c/12 closures), so the re-founding's payoff argument now
rests on uniformity and maintainability rather than pending precision;
new entries come from consumer corpora.

## Decided against — do not re-open without new information

**Value tracking for nullability (the “CASE value-dependence” rung
ladder).** Knowing that `CASE WHEN active THEN 'a' ELSE name END` never
takes its ELSE because `active` was written `true` requires tracking the
VALUE, not the nullability — and the rungs above it (NOT of a tracked
boolean, equality over tracked text, comparisons over tracked numbers,
values computed from bindings) each look equally reasonable until the
engine contains a constant evaluator for PostgreSQL expressions that must
match PostgreSQL exactly or produce unsound claims: the FigureColname trap,
larger, and unsound rather than cosmetic when it drifts. Ruled out
entirely, no rung implemented (2026-08). The generated
`dml-returning-case-value-dependence` rule records the shape that motivated
it.

New information arrived 2026-08-11: the premise is dissolved by subtree
evaluation (`docs/subtree-evaluation.md`) — closed trees are answered BY
PostgreSQL through the `evaluate` callback, nothing is reimplemented,
there is nothing to drift. The ban's actual object — an ENGINE-INTERNAL
constant evaluator — stays banned; the ladder's rungs become charterable
one at a time through the evaluator and the kernel's atom oracle. The
`dml-returning-case-value-dependence` shape stays unclaimed until a
consumer charters it.

Boundary clarified by Wave 11c (2026-08): cross-literal ORDER reasoning
is a rung of this ladder and stays out. Concluding FALSE(`qty > 0`) from
FALSE(`qty > -20`) requires knowing -20 < 0 as a VALUE — a linear-order
theory over numeric literals, with every coercion and float/numeric edge
the evaluator ban exists to avoid. The kernel stays propositional: the
Boolean algebra is implemented completely, atoms meet only by token
identity, same-token negators, and the collation-gated distinctness. In
the semantic re-founding this line is a MODULE boundary — an
atom-entailment oracle interface whose current implementation is exactly
those three gates; an order-theory oracle could plug in behind it without
touching the Boolean layer, if this entry is ever reopened with the new
information it demands.

That information exists as of 2026-08-11: cross-literal order facts are
CLOSED TREES — `-20 < 0` is a one-row SELECT — so the plug-in oracle is
the subtree evaluator itself (`docs/subtree-evaluation.md`, "The kernel's
atom oracle", with the same-operand trichotomy rung recorded beside it).
Reopening happens per rung, chartered and pinned, not wholesale.

Boundary clarified by Wave 9 (2026-08): collation-gated literal
DISTINCTNESS is not a rung of this ladder and its admission does not
re-open it. The ruling bans an EVALUATOR — computing what expressions
produce. Distinctness compares two literal TOKENS already present in the
SQL, concludes only "unequal values", and only where the catalog proves the
conclusion sound (builtin text-family column, `collisdeterministic` — the
new information the ban's collation hazard asked for; captured per column
in the snapshot). Numerics stay banned precisely because token inequality
there WOULD require evaluation to decide.

**Reproducing PostgreSQL's column-naming rules (`FigureColname`).** PostgreSQL
labels an un-aliased output column by a set of rules in
`src/backend/parser/parse_target.c` — `count(*)` becomes `count`, `1+1` becomes
`?column?`, `p.price::text` becomes `price`, and the rules carry precedence, so
a nested strong name overrides a weak default. The engine implements almost none
of this and reports an empty name for such expressions.

It should stay that way. Names are not the contract and cannot be: they are not
unique — `SELECT a.id, b.id` yields two columns called `id` — so a consumer must
join nullability to columns by position. That consumer also runs `PREPARE` for
types, and `RowDescription` hands it the authoritative names for free. Porting
the rules would mean maintaining a version-drifting reimplementation of
PostgreSQL internals to produce something the consumer already has.

What the engine's best-effort names *are* good for is catching a wrong column
list in the tests. The soundness suite compares the full ordered name list
against PostgreSQL's for every fixture, which catches a misordering that a
column *count* would not — PostgreSQL emits a `USING` join's merged column
first, not in its left-hand position. If an un-aliased expression ever makes
that comparison fail, the cheap fix is usually to alias it in the fixture; the
failure message names the exact rule that would be needed if not.

**Mutating existing queries as a way to generate new ones.** Considered as an
alternative to constructing queries and rejected. Transformations beyond blind
wrapping need the same scope and type knowledge that construction needs, so
mutation buys no validity for free — and it is bounded by the shapes the corpus
already contains, which is the opposite of what a generator is for. See
`docs/query-generator.md`.

**A diagnostics channel for ambiguous references.** An unqualified name
matching several visible columns resolves to nullable, with the candidates
recorded in the trace. A dedicated reporting channel was considered and
rejected: PostgreSQL rejects such queries at parse-analysis time, so any
consumer running `PREPARE` receives a precise error from PostgreSQL itself,
which is better than anything the walk would emit.

**Name-based joining of nullability to `RowDescription`.** Considered as an
alternative to positional joining and rejected. Column names are not unique —
`SELECT a.id, b.id` yields two columns named `id` — so a name join cannot
distinguish them and must either pick one (wrong) or degrade both to nullable
(lossy, on ordinary queries). Position disambiguates exactly what names cannot.
See "Arity gate at the consumer boundary" for the guard that makes positional
joining safe.
