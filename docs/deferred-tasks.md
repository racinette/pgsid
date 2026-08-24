# Deferred tasks — decisions and open items

## What this is, and what it is not

This holds **only what the codebase cannot hold**: open items with their
triggers, decisions taken against doing something, and the handful of process
rules that belong to no single file. Everything else has been deleted.

**It was 5088 lines until 2026-08-21, and about 89% of that was narrative of
completed work** — what was built, in what order, with what corpus counts. All
of it is recoverable from the code, the charters, or a suite that re-derives
the numbers every run, and keeping a second copy cost more than it paid:

- `WORK_LIST` was named for a queue that had emptied. It instructed readers to
  work eighteen rows of which zero were workable.
- The register called `path + path` "the only live unsoundness in normal
  operation". It stopped being true when the operator narrowing landed on
  2026-08-09 — measured across six shapes on 2026-08-21, nullable in all six.
- A pinned reason said "no expression can carry a column definition list". A
  scalar subquery carries one fine; four rows sat unprobed for it, two of them
  functions that appear in ordinary queries.

Three wrong claims found in a single day, each by working with the object
rather than by reading. **The suites are the source of truth.** They execute,
they fail when they drift, and they re-derive their own numbers. A sentence in
a document does none of that.

The rule this document now lives by: **if a fact can live next to the code it
is about, it belongs there, not here.** `nullability-walk.ts` is 32% comments
and `operators.ts` is 74% — that is where rationale is kept, and it works.

## Where the knowledge actually lives

| Area | Home |
|---|---|
| How the walk works | `docs/nullability-walk.md`, and the walk's own comments |
| Builtin totality surface | `builtin-surface.test.ts` (three pinned tables), `totality-probe.test.ts` (the execution gate), `docs/builtin-surface-classification.md` (regenerated snapshot) |
| Probe corpus, probe database, and its traps | `tests/unit/query/probe-values.ts` |
| Operator narrowing, partial and non-strict overloads | `src/query/operators.ts` |
| One-name-many-signatures defects | `docs/type-aware-overloads.md` |
| Asking PostgreSQL to resolve a type (`PREPARE`) | `docs/type-resolution-delegation.md` — all five stages landed 2026-08-24 (`src/query/type-delegation.ts`) |
| Query generator and its axes | `docs/query-generator.md`, `docs/generated-surface.md` |
| Generated soundness instrument | `tests/unit/query/generated/generated-soundness.test.ts` |
| Subtree evaluation | `docs/subtree-evaluation.md` — consumer 3 (closed truths, `src/query/closed-truths.ts`), the computed-argument cast gate, and consumer 1's reverse `isNull` reading all landed 2026-08-24 |
| What `pgsql-deparser` cannot render, and what that costs | `docs/deparser-limitations.md` — read BEFORE testing whether a construct deparses; that exploration has been done twice |
| Argument / parameter contract | `docs/argument-nullability.md` |
| Witness corpus discipline | `docs/witness-coverage.md` |
| Anything needing project config or a call site | `docs/consumer-design.md` — slice 2's boundary half landed 2026-08-24: `src/index.ts` and the arity-and-order gate in `src/contract-gate.ts` |
| Catalog-driven generation | `docs/catalog-driven-generation.md` |
| History of what was built when | `git log` |

---

## What rots here, measured

Every open item below was re-checked against the code on **2026-08-23**, after
five entries turned out in one day to describe work already done or to name the
wrong cause. The sweep's result is a rule worth more than its findings:

> **An entry about what the ENGINE DOES rots. An entry about what the CODEBASE
> IS holds.**

The five that had rotted were all behaviour claims — "this reads nullable",
"the kernel has no disjunctive fact", "per-arm reasoning is not worth it",
"closable". Every one is falsified by a fix landing, which is the failure mode
nothing here can detect: success expires the record, and no suite goes red.

The structural claims all held on re-check: `buildNullabilityCatalog` does take
an options bag beside `searchPath` and there are exactly two FK maps to empty
(1b's "five lines" is right); nothing under `src/` calls `inferNullability`
(1's blocker is real); T1–T5 exist; PGlite ships 33 contrib extensions and
still no `test_decoding` (6's trigger is unchanged); the annotation arithmetic
is exact at 17 + 6 = 23.

Two things had drifted, both of the "what does the engine do" kind: 1a's claim
that domain CHECKs reach no engine consumer, and 7's path. Both are corrected
in place.

**So: date any behaviour claim written here, and re-derive it rather than
reading it.** The suites re-derive their numbers every run; this file does not.

**A third rot mode, found 2026-08-24 — a PARTIAL check closing a WHOLE row.**
The 2026-08-23 sweep marked "a base-table alias column list is ignored" as
honoured. It measured names and flags, and there are five lookups behind such
an entry; the fifth, type OIDs, was still handing the query's name to a catalog
keyed under the catalog's. The re-check was right about everything it looked
at, and the row it closed was still open. Where an entry names a MECHANISM
rather than one claim, enumerate the mechanism's consumers before closing it —
`RelationEntry`'s own doc comment listed all five.

**A fourth, found 2026-08-24 — a TRUE reason for the WRONG channel.** This one
does not rot in this file at all; it rots in a fixture comment, which is worse,
because a fixture comment reads as settled and no sweep visits it.
`scalar-subquery-union-arm.sql` explained `union_null_both`'s nullable claim
with "the alwaysNull channel needs both branches to claim it, and a cast NULL
constant is not something the walk claims it for". Every word is true OF THE
SYMBOLIC CHANNEL, and the column is a CLOSED sublink whose NULL the statement
map had been holding since 2026-08-12 — the evaluation channel simply was not
read in that direction. A reason that is true of a mechanism the value never
goes through will survive any amount of re-reading. **Check which channel
answers, not whether the reason is correct.**

## Open items

### 1. Arity-and-order gate at the consumer boundary — BUILT 2026-08-24

**Built.** `src/contract-gate.ts`, exported from `src/index.ts`, pinned by
`tests/unit/query/contract-gate.test.ts` and `tests/unit/entrypoint.test.ts`.
The rest of this entry is the design it was built to, kept because it is the
argument for why the gate exists rather than a plan.

The one thing the design did not say, and the build had to decide: **how a
consumer gets PostgreSQL's shape without RUNNING the statement.** A gate that
executed would fire triggers, advance sequences and write rows for every DML
query analysed. The answer is a narrow callback in the shape of `evaluate` and
`resolveColumnTypes` — `DescribeStatement`, two lines over PGlite's
`describeQuery`, returning the ordered column names and the parameter count.
Measured: all 515 corpus statements describe, DML with RETURNING and `$n`
included, and a sequence beside the probe does not advance.

Two things the build measured that the design assumed:

- The engine and PostgreSQL agree on the column NAMES of all 515 fixtures, and
  on the parameter count of all 515. The gate is silent on the corpus, which
  is the expected result and is why the suite injects each divergence shape
  into a real contract instead — a gate that agrees with everything is
  indistinguishable from no gate.
- The empty-name degradation is not a corner: it is the ordinary case outside
  this corpus. Every fixture aliases every column (house style), so the corpus
  has ZERO empty names — but `SELECT 1 + 1` is `""` here and `?column?`
  there, `SELECT CASE WHEN true THEN 1 END` is `""` vs `case`, and
  `SELECT ARRAY[1,2]` is `""` vs `array`. Without the rule the gate would fire
  on every unaliased expression in every query. It degrades PER POSITION, not
  per statement.



**What.** Nullability is a positional array meant to be zipped against
PostgreSQL's `RowDescription` (the contract is on `OutputNullability` in
`src/query/types.ts`). Nothing enforces that the two lists agree before they
are zipped, and the comparison must be the ordered NAME list rather than
length alone.

**Why it matters.** A mismatch misassigns every flag past the point of
divergence, and does so while looking authoritative. Across four adversarial
sweeps this gate carries thirteen defects it would have caught, **four of them
arity-preserving** and therefore invisible to any check but the ordered name
comparison — a permuted MERGE `RETURNING *`, `(p).*` reading the alias where
PostgreSQL reads the column, quoted `TABLE(…)` names split at a space, and a
one-arm `ROWS FROM` ignoring the relation alias. That is a count, not an
argument.

It verifies a positional join and never joins by name (names are not unique).
It degrades to arity-only where the engine reports an empty name, since
`FigureColname` stays unimplemented by decision. On mismatch, the safe
response is to treat every column as nullable and report loudly.

**Why it was not done, until now.** No consumer — nothing under `src/` called
`inferNullability`, and the engine has no PostgreSQL of its own to compare
against. The gate is what ended that: `src/index.ts` now exists, exports the
boundary rather than the engine, and `pnpm build` succeeds for the first time.
Items 1a, 1b and 2 are no longer blocked on "there is no call site".

**What the absence of a consumer had already cost (2026-08-24).** The package
did not build and could not be installed and used:

- `pgsql-deparser` was a **devDependency** while `subtree-evaluator.ts`,
  `srf-cardinality.ts` and `type-delegation.ts` imported it at runtime — a
  consumer would have got a missing module. Fixed, and pinned by
  `tests/unit/runtime-dependencies.test.ts`, which censuses the manifest
  against what `src/` imports in both directions. No suite could have caught
  it: they all run from the repo, where a devDependency resolves exactly like
  a dependency.
- `tsup` built `src/index.ts` and `pnpm dev` ran it. **That file did not
  exist**, and never had. Written with the gate; `pnpm build` now succeeds and
  the built package runs the documented pipeline end to end (verified against
  `dist/`, not just the source tree).
- Five runtime dependencies (`chokidar`, `fast-glob`, `picomatch`, the two
  `vscode-languageserver` packages) are imported nowhere. Recorded in the
  census's `DECLARED_BUT_UNIMPORTED` rather than dropped — the decision is
  someone's to make, and it is now visible instead of implied. **Still open.**

These were not the gate. They were the same absence showing up in the
manifest, and they said the boundary was unbuilt rather than merely unwired.

**Trigger.** Write it with the FIRST slice that holds a contract and a
`PREPARE` result at the same time, **before** the emitter slice, not with it.
Every slice in between would otherwise build on a failure mode that is silent
by construction. Permanent, not transitional.

### 1a. Sweep every catalog READ for rows PostgreSQL adds that nobody wrote

**What.** The converse of a curated-table audit. A catalog read can return
MORE than the schema author declared, and a reader that assumes one row per
declaration is wrong without ever looking wrong.

**Status: ran once (2026-08-08), both findings closed.** `queryIndexes`
captured partition clones and dropped the declaration (`relkind = 'i'` misses
the declared `'I'`); `queryDomains` read one CHECK of many under a `LIMIT 1`
with no `ORDER BY`. Neither moved a nullability claim — **and that is the
finding under the findings**: both survived because nothing downstream was
strict enough to notice.

**The half of that argument about domains expired (re-checked 2026-08-23).**
It said `snapshot.indexes` and `DomainInfo.checks` "reach nothing but the
diff's entity map". True of indexes still — `src/catalog/diff.ts:311` is the
only reader. FALSE of domain checks since the subtree evaluator learned to
walk a domain chain: `catalog-adapter.ts` collects `cur.checks` across nested
domains to decide whether a cast renders immutably, so that capture now has an
ENGINE consumer whose answers reach real claims. The 2026-08-08 `LIMIT 1`
truncation would no longer be silent, and would no longer be harmless.

**Trigger.** Do it the next time any capture is added to `snapshot.ts`, and
before the consumer's first contract-holding slice. The original argument —
"a capture whose only consumer is the diff is where it pays" — still names the
risky case, but it is no longer a description of these two: check which
consumers a capture actually has before assuming it is diff-only, because that
set grows without anyone revisiting this entry.

### 1b. Operational trust declarations — the foreign-key assumption

**What.** Foreign-key entailment reads a validated, enforced, non-deferrable
key as a guarantee that the join matches. Three routes falsify that with no
catalog trace, all measured: `ALTER TABLE … DISABLE TRIGGER ALL` (FKs are
system triggers — the orphan lands and `convalidated`/`conenforced` both stay
TRUE), `SET session_replication_role = 'replica'` (a session GUC, no DDL at
all), and disabling triggers on the REFERENCED side, where `ON DELETE CASCADE`
never fires. Nothing revalidates afterwards: `VALIDATE CONSTRAINT` on an
already-validated key is a no-op.

**The default is settled and is not to be re-litigated.** A declared key is the
schema author's invariant, the dirty state is one where the database
misrepresents itself, and PostgreSQL's own planner has trusted validated keys
for join selectivity since 9.6 without revalidating them. What is missing is a
way for a consumer that KNOWS its keys are unenforced to say so.

**Why not done.** The engine half is five lines — a `trustForeignKeys` option
beside `searchPath` in `buildNullabilityCatalog`, with the two FK maps coming
back empty. The rest is not: the value has to reach the adapter from project
configuration that does not exist, and the natural granularity (per project,
arguably per table) is a consumer-config design question. Deliberately NOT per
query — whether keys are enforced is a property of how a database is OPERATED,
which the query author does not know.

**Trigger.** With the consumer's config slice, beside search-path half (b) —
same input class, same plumbing.

### 2. Search-path half (b)

WHERE the search path comes from is a consumer input, not an engine one.
`buildNullabilityCatalog` already takes `searchPath`; what is missing is the
configuration channel that supplies it. Belongs to `docs/consumer-design.md`,
and shares its trigger with 1b.

**One hole rides with it and is not closable by recording entities**: a
dependency on a function that does not exist YET. A better-matching overload
created later in an earlier schema changes the answer with no recorded
`EntityId` to hang the invalidation on — and the identical hole exists for
unqualified RELATION references (`FROM t` resolving to `public.t` until
someone creates `app_s.t`). It is a property of tracking unqualified names
under a search path, so it belongs to the consumer design, not the engine.

### 2a. Or-fact triggers for arm exclusion — CLOSED 2026-08-23

**Both halves are built, and the entry was wrong about the second one from the
day it was written.** It stays only to say what its cause turned out to be;
the mechanisms live beside the code.

It read: "the kernel has no disjunctive fact to carry 'one of these arms was
taken'". The kernel had one all along — `orFacts`, with `addOrFact` and the
intersection rule in `colKnownNonNull` — and the trigger the entry names had
been built too, in the block titled "OR-fact triggers" in
`check-entailment.ts`: `verdict IN ('fraud','no-fraud')` selects one arm per
value and their conditions join as an or-fact.

What was genuinely missing is the ELSE half, and the *stated reason for it*
was the obstacle. `docs/nullability-walk.md` said an ELSE survivor derives
nothing because "ELSE runs on FALSE *or NULL* conditions, and 3VL grants no
facts from 'not TRUE'" — true of a condition that CAN evaluate NULL, and false
of one that cannot. Over a NOT NULL column `status = 'a'` is total, so not-TRUE
IS FALSE. `elseSelectedConditions` emits those negations, gated on one atom
(not-TRUE of a conjunction says nothing about a conjunct) and on totality (the
3VL twin is the fixture that kills it).

Closing it needed a second thing, and finding that out took removing the first
guess: the kernel reads NO catalog flags, so a NOT NULL column is invisible to
every totality gate inside it. `entryNotNullEvidence` supplies the flags as
ordinary evidence predicates for a relation the walk has established present.
**Measured: 218 firings in the hand corpus and zero claims moved in either
corpus** — it is worth having for what it unlocks, not for what it moves.

**The lesson, and it is the reason this entry is not simply deleted:** a
recorded reason that names a LAW ("3VL grants no facts") reads as settled in a
way that a recorded gap does not, and nothing in the suite disputes a law. It
was over-general by exactly one case, and that case is the ordinary one — a
NOT NULL column.

### 2b. Five sqlc upstream tickets, written and not filed

`tests/unit/query/sqlc-corpus/tickets/T1–T5.md`. The disagreement register is
adjudicated and executable — all 40 per-column disagreements settled by data
that re-runs, 0 pgsid unsoundness, 0 pgsid imprecision, 16 ticket-ready.
Filing them is an upstream contribution, not engine work, and nothing here
waits on it.

**Trigger.** Whenever someone wants to spend the time upstream.

**The `pgsql-parser` reports beside them are no longer "upstream contribution,
nothing waits on it" (2026-08-24).** The SQL/JSON missing-feature issue drafted
in `docs/deparser-limitations.md` is the SOLE blocker on seven expression node
kinds the closed grammar would otherwise admit (§4's table). It is the one item
in this register where filing a report is engine work.

### 3. The precision residue — closed, and held by three gates

Nothing here is open. The entry stays because it is the standing record of what
is permanent and how to re-measure it:

```
WITNESS_REPORT=1 pnpm exec vitest run tests/unit/query/generated/generated-soundness.test.ts
```

Across 14,964 queries, 32,293 nullable output claims and **32,293 witnessed**.
**Nothing in the corpus is dark.** The `UNWITNESSABLE` list is empty, which is
a stronger statement than it looks: every nullable claim the engine makes over
the enumerated structural space is backed by an actual NULL that PostgreSQL
returned, so no claim is excused and no reason can rot.

All four buckets closed on 2026-08-22, and their rules and blame files are
deleted:

| was | bucket | what closed it |
|---:|---|---|
| 60/462 | `proj=case-nullif \| col=a_case` | `guardedPresence` — the guard channel runs the presence fixpoint instead of copying its rules |
| 20/522 | `proj=plain \| col=a_tb` | `presenceProducer` — an unnest field's presence producer is its element expression's relation |
| 1/6 | `proj=plain \| col=r_snm` | `returningRejectedParams` — a projected parameter rejected on every row-producing path |
| 1/1 | `proj=case \| col=r_ce` | `written-value-guards.ts` — a RETURNING CASE guard answered from the constants the statement wrote |

**Three of the four reasons were wrong about their own cause by the time they
closed**, and none of the errors was visible to any gate: an expired reason
leaves the outcome exactly where it was. That is the case for the blame-file
discipline, and it is the reason to argue for the next entry rather than
assume it.

Three gates hold this, in `generated-soundness.test.ts`: an unclassified claim
fails, a rule matching nothing fails as stale, and a rule blaming a MECHANISM
must name a blame fixture that executes it. The third is the one the first two
cannot substitute for — an expired REASON leaves the outcome where it was, so
the claim stays unwitnessed, the rule keeps matching, and the suite stays green
over a cause that has been false for weeks.

**Writing the blame files found five of eight reasons wrong**, and reading one
of the survivors aloud found a sixth. Three species:

| rule | the reason said | measured |
|---|---|---|
| a_case | "sound engine conservatism about the CASE branch" | two promotion rungs were missing, not necessary conservatism; 36 of the 96 flipped when they landed — **imprecision recorded as necessity** |
| a_fi | name-level dispatch can't narrow `upper` | typed dispatch narrows it and reaches `$n` bodies; it did not reach a parameter by NAME — **expired mechanism** |
| a_fv | `resolveFunctionCandidates` refuses VARIADIC | a resolved call never enters the consensus branch; the body's `nullif` is the cause — **expired mechanism** |
| r_snm | the MERGE source is optional unconditionally | `joinState = REQUIRED` with no BY SOURCE arm; the cause is `$1` — **behaviour the engine never had** |
| a_fa | a user aggregate's sfunc is opaque, so the walk cannot prove it non-null | `gfn_sfunc` folds `''` to NULL, so the aggregate IS nullable over non-empty input — **filed unwitnessable when it was merely unwitnessed** |
| a_fv | the nullif "fires only when EVERY argument is NULL" | `array_to_string` SKIPS NULLs, so a NULL beside an empty string joins to `''` and folds — **same mistake, same blind spot** |

a_fa and a_fv (the nullif row) are the species an outcome gate can never reach:
a reason that mistakes a data gap for engine imprecision sends every future
reader at a mechanism that would not have helped. Both rested on the same false
premise — **that a NOT NULL text column rules out the degenerate value**. It
does not rule out `''`.

a_case is the third species and needs no blame file to catch — only reading the
reason next to the code it names. It called the residue conservatism the branch
FORCED, and the word "sound" made it read as settled. Nothing in the suite
disputes a reason that says a thing is impossible; only asking "impossible how?"
does. **Look at the survivors, not just the ones that flip.**

**Three buckets closed 2026-08-22**, only one of them by changing the engine:

- **a_fi (240)** — an engine fix (`body-builtin-parameter-by-name.sql`): a
  body's parameter referenced by NAME now carries its declared type into
  signature dispatch, the way `$n` already did. All 240 flipped to notNull,
  executed against PostgreSQL, none falsified.
- **a_fa (300)** and **a_fv (240)** — four rows of data, no engine change. One
  `t` key with a NULL name, an empty-string `u` partner, an empty-string `gm`
  partner, and a `v` partner so the three-table nests keep the group. Measured:
  a_fa 300 → 120 → 0 as the partners went in; a_fv 240 → 0 the moment the
  name went NULL.

**a_case narrowed 96 → 60 the same day**, by two rungs in `nullability-walk.ts`,
both of them a channel that existed answering one caller and not another:

- `predicateProvesNonNull` enumerates BoolExpr, NullTest and A_Expr, then
  returns false. A predicate that IS a ColumnRef — `WHERE t.active`,
  `CASE WHEN t.active` — had no case, so a boolean column steering a row or a
  branch proved nothing about itself.
- `findNullGroupPromoter` asked `checkWhereAliasPromoted` and nothing else. The
  per-alias rung one level up asks the WHERE **and** the branch guards; the
  group hop asked only the WHERE, so a guard could promote `t` and the
  promotion had no way to reach `u`.

Both were needed: `CASE WHEN t.active THEN u.email` under `(t INNER u) RIGHT v`
requires the first to promote `t` and the second to carry it to `u`. The seven
structures that left the rule are exactly those where t and u share one
null-extension unit. The five that remain put them in different units, and the
guard channel has no cross-unit promotion — which is the same asymmetry one
level deeper, since the WHERE channel reads notNull in all five.

`CASE_DARK_STRUCTURES` was trimmed from twelve entries to five by hand. **No
gate would have caught the seven dead ones**: the staleness check fires when a
RULE matches nothing, and this rule still matches 60 claims. A structure set is
a second place a reason can rot, finer-grained than the rule.

**a_case then closed entirely — 60 → 0 — and the rule is deleted.** The three
guard rungs each copied one fixpoint rule; what none of them could copy is the
rule that is not a predicate test but the fixpoint's own LOOP — presence
activates a join, the join's qual becomes an implied qual, the qual proves
another relation present, that activates the next join. So `guardedPresence`
runs `resolveJoinImplications` itself with the branch guards appended to the
WHERE conjuncts, inside `withSpeculativeScope`, which snapshots the four
places the fixpoint writes (`joinState`/`nullGroup`/`unitChain` per entry,
`incomingRequired` per join, the append-only `impliedQuals`) and restores them
before the answer is returned. The join audit is suppressed during a
speculative run: settledness means "for every emitted row", and a branch
verdict is not that.

The not-taken channel came with it. A guard that is not TRUE is FALSE *or
NULL*, so it is no predicate — but `IS NULL` is total, and `guardPredicates`
flips its polarity into `IS NOT NULL`, a real conjunct the fixpoint consumes.
Without the flip an ELSE arm reads nullable where the identical THEN arm reads
notNull.

Measured: notNull 24373 → 24433 (**exactly +60**, the size of the bucket —
which is also the restore canary, since a leak would widen queries with no
CASE in them), unwitnessed nullable 82 → 22, presence groups unchanged at 2558,
0 violations over 14964 executed queries. `case-needs-t-without-u` matched
nothing afterwards and the staleness check forced its deletion.

`promotion-guarded-fixpoint.sql` pins it. Mutations verified: disabling the
rung drops all four notNull columns while the two older rungs survive;
dropping the polarity flip drops `else_arm` alone with `taken_arm` as its
control; `no_route` is the over-promotion control and stays nullable.
**One route claim did not survive mutation** and is recorded in the fixture
and in `guardedPresence`: the five structures looked like they split into an
activation half and a participation-closure half, because `dissolveUnit` fires
first in the `t k (u k v)` nestings and that is what a trace shows. Suppressing
dissolution under speculation changes no verdict in any of the 32 nestings.
The trace showed which rule won a race, not which rule was load-bearing.

**Mutation-tested afterwards, which found a third.** Each of the day's three
engine changes was disabled in turn and the suite run. All three were caught —
by a SINGLE gate, "every unwitnessed nullable output claim is witnessed or
classified", and by nothing in the 472-fixture hand corpus. That gate sees an
outcome, and it only fires here because the rules and structure sets were
trimmed as each bucket closed; re-widen any of them and all three mechanisms
go dark with a green suite. The setop widening was worse: killing it drops the
exported groups 2558 → 1662 and **nothing asserts that count** — the run went
red only because four unrelated a_tb claims lost their proof downstream.

Three fixtures now pin the mechanisms directly, each verified by re-running
its mutation: `promotion-bare-boolean-and-guard-group` (both rungs, plus a
`guard_only` column that survives the group-hop mutation and so discriminates
between them), `presence-group-pin-across-boundary` (the pin, plus the plain
table that the origin route already reached), and
`presence-group-union-vacuous-arm` (a `@null-group` assertion, since the group
IS the claim there). The lesson generalises: **a precision fix measured only in
corpus claim counts has no regression gate unless something asserts the count,
and nothing does.**

**r_ce closed last, and its reason was wrong twice.** It said the written-value
tracking "deliberately carries only non-nullness" — true when written. But the
walk already PRUNES CASE arms from evaluated guard truth (`evaluatedGuardTruth`
reads the statement evaluation map; a TRUE guard kills every later arm and the
ELSE with it), so nothing needed building on the consumer side. What was
missing is that the evaluator is scope-blind by construction: any node carrying
a name is open, and `active` is a name.

`written-value-guards.ts` closes the tree instead of teaching the evaluator to
resolve. It substitutes each written constant for its column, hands the result
to the same evaluator core the other three grounding passes use, and keys the
answers back to the ORIGINAL guard nodes so they merge into the statement
evaluation map. `CASE WHEN status = 'paid'` over a written `'paid'` and a bare
boolean column are then one question with one answer — the generality is free,
because the walk never computes a PostgreSQL expression itself. Only a guard
that reduces to a bare `A_Const` is read directly, and only because a literal
is closed with nothing to compute, so the evaluator collects no root from one.

The soundness rests on one quantifier: EVERY path that can return a row wrote
the SAME constant. A second VALUES row with a different literal, a
disagreeing MERGE arm, an `ON CONFLICT DO UPDATE` writing something else —
each drops the column; a MERGE DELETE arm drops all of them, since a deleted
row is returned as it was before the statement. Triggers need no new rule: the
walk's own guard applies, and a target with a BEFORE ROW or INSTEAD OF hook
contributes nothing.

**The second error was in the harness, not the engine**, and nothing would have
found it by reading code: this corpus called the walk with no `evaluate`
callback, so the entire subtree-evaluation channel was off and no answer could
have arrived however capable the engine was. Turning it on — one PGlite
instance, schema only, no data, kept alive through the analysis loop — costs no
measurable time and moved exactly one claim. **A reason can be wrong about the
harness as easily as about the engine**, and this one was both.

**r_snm closed the same day, and its own recorded reason was the fix.** The
rule said the claim could not be witnessed because binding NULL *raises*
instead of returning a row — which, read the other way, is the proof that a
returned row had a non-NULL binding. The walk already made exactly that
inference for the bind-time mechanism (`bindRejectedParams`: a NOT NULL domain
rejects at Bind, so any returned row proves the parameter non-null). The
execution-time mechanism produces the same certainty and had no channel.

The naive widening is unsound, and measuring it first is what kept it out.
`params[i].notNull` is a PRECONDITION — "a NULL binding may raise" — while the
output claim is a POSTCONDITION — "no returned row is NULL here". Measured:

```sql
MERGE INTO ck USING (VALUES (905, $1::text)) s(sid, snm) ON ck.id = s.sid
  WHEN NOT MATCHED THEN INSERT (id, val) VALUES (s.sid, s.snm)
  WHEN MATCHED THEN UPDATE SET name = 'x'
RETURNING s.snm
```

Engine: `$1` notNull. PostgreSQL with `$1` bound NULL: one row, `s.snm` NULL —
the MATCHED arm ran and never touched the NOT NULL column. So
`returningRejectedParams` asks per PATH: every action that can produce a
returned row must put the parameter in a rejecting site. One arm, one INSERT,
one UPDATE all qualify; a DELETE arm writes nothing and collapses the
intersection; `ON CONFLICT DO UPDATE` is a second path and is intersected,
while `DO NOTHING` returns no row for a conflict and stands alone. The
existential quantifier over VALUES rows (`forcedNullParamsAnyRow`) is the
right one and the written-value maps' universal one is not — a raise aborts
the whole statement, so ONE row reaching the site is enough. Triggers need no
new guard: `columnRejection` already reports nothing for mechanism B on a
command carrying a BEFORE ROW or INSTEAD OF hook.

The fact is SCOPED, not engine-global, and that is the second half of the
soundness argument. `WITH w AS (INSERT … RETURNING e) SELECT $1 FROM t` — the
Collector's own counterexample — puts the SELECT outside, its rows do not
depend on the write, and the chain walk from that `$1` never reaches the
INSERT's scope. The same walk going the other way is what reaches a MERGE
source, where `RETURNING s.snm` is not a ParamRef at all and `$1` lives in the
source subquery's scope.

Measured: notNull 24453 → 24454, 0 violations. Three fixtures, three
mutations, each caught by BOTH the annotation and execution (a falsified
claim, not a stale marker): `param-returning-rejected` (the rung),
`param-returning-rejected-merge` (the arm intersection),
`param-returning-rejected-outer` (the scoping). The first mutation run on the
last of those passed a broken engine — the fixture declared the CTE without
referencing it, so nothing analyzed the INSERT. **A counterexample fixture
that is never reached reads as coverage and is not**, which is the same lesson
the structure sets taught, one construct over.

**a_tb's UNNEST half closed the same day too — 20 → 0 — and the recorded
reason for it was wrong.** The rule blamed the walk calling every unnest field
nullable "whatever the element expression put there", and marked it deliberate.
True, and not the operative cause. Inside the CTE both fields ARE nullable: `u`
is LEFT-joined, an absent `u` makes `ROW(u.val::text, u.email)` into
`(NULL, NULL)`, and unnest emits that as one row with both fields NULL. What
the refilter needed is that `g.p` and `g.q` are the SAME ROW's columns, so
pinning one settles the other. That is a PRESENCE fact, not a nullability one,
and no amount of typing the field would have produced it.

The producer list has two consumers with different semantics, and that is the
finding. Origins claim "this column IS that table column of that row", which a
CAST breaks — and the corpus's field is `u.val::text`, so
`resolveBareColumnTarget` refuses it and must keep refusing. Groups claim
"these columns are NULL together", which a cast preserves exactly. So
`presenceProducer` reads the same list a different way: it strips casts,
requires every element to name the same (relation, column), and declines when
the unnest item is itself OPTIONAL — a null-extended item makes its fields NULL
while the source is present, which breaks the group in the direction that
matters. Measured: **notNull 24433 → 24453 (+20, the whole bucket), presence
groups 2558 → 2618, all with both arms observed, 0 falsified.**

Two more mechanisms landed beside it, each with its own fixture and each
verified by its own mutation — `unnest-element-presence` (the above),
`unnest-element-origin` (a field's ORIGIN is its element's, which is what
carries CHECK entailment through an unnest: guest's `status <> 'housed' OR room
IS NOT NULL` reaches `pr.q`), and `unnest-composite-shape` (the field's
NULLABILITY read from the constructor's elements, which flipped two
long-standing `@unwitnessable` annotations to plain notNull claims — both
element skus were always non-null literals). The origins half was written
first, changed nothing in the corpus, and was nearly deleted as dead code; the
probe that saved it is the guest CHECK above. **A mechanism with no witness is
not a mechanism yet** — the difference between deleting it and keeping it was
one measurement, not one opinion.

**a_tb's srf half closed entirely the same day** — 8 → 4 → 0 — in two steps.

The first gave presence groups a second consumer. The inner analysis already grouped a_tb with a_tc and marked
a_tb a discriminant; the group says absent ⟹ every member NULL, so a pinned
member proves the row present and every discriminant non-null. That fact was
computed, cached in `groupCache`, lifted across boundaries by
`computePresenceGroups` — and never read by the outer column resolution.
`presenceGroupPins` reads it, called beside `originCheckEntailment` at the four
CTE/subquery sites.

The two escapes are twins with different reach, and the difference is the whole
point: **origins are TABLE-anchored, and `originOf` returns none for a table
function.** So the same query over a plain LEFT JOINed table already read
notNull through origins, while the `RETURNS SETOF` spelling had no channel at
all — only the pairing of a function with a boundary was dark. Groups need no
anchor. Measured before the change: SRF with the refilter in the same query →
notNull; table behind a CTE → notNull; SRF behind a CTE → nullable.

The second closed the remaining four, which were all set operations, and the
cause had moved to the right branch: the generator's UNION arm is a row of
literals. It has no outer join, so no null-extension unit, so no presence group
— and UNION branches were combined by INTERSECTING their groups, so the group
the left branch earned died against a branch that had nothing to disagree with.
`computeSetOpGroups` now also admits a left group whose discriminants are all
notNull on the right: **a branch that cannot be absent cannot break the group.**
Every row it contributes lands in the present arm, and neither half of the
contract has a case to fail on there.

That is a contract widening and it was measured before landing: **presence
groups 1662 → 2558, all 2558 with both arms observed and none falsified.** The
+896 is the point, not the cost. A `UNION` against a constant row is the
add-a-sentinel idiom, and every one of those queries had been handing consumers
two independently-nullable columns where the truth is a two-arm union:

```ts
{ a_tb: string; a_tc: string | null } | { a_tb: null; a_tc: null }
```

The dead-rule filter in the same function looks like it argues the other way and
does not — **it drops groups whose ABSENT arm cannot occur**, because a type
with an unreachable arm is noise. These are the opposite shape: the absent arm
is the reachable, observed, load-bearing one. The two rules read as one only if
you take "fewer groups" for the goal, and it never was.

Wiring it needed one small correction: `analyzeSetOperation` settles its groups
inside the fixpoint and its caller was recomputing them from the combined
verdicts. Identical while nothing inside knew more than a second pass could —
and the vacuous arm reads the right branch's own per-column verdicts, which
exist only in that loop. The groups now travel with the results.

Two rules died on the way, and their blame files with them:
`srf-refilter-implies-the-function-row-is-present` was renamed to
`union-literal-branch-carries-no-presence-group` when its cause moved, then
deleted when the cause closed. The staleness gate flagged it the moment it
stopped matching, which is exactly its job.

Not the parameter side, which this item also misread. **2724 nullable argument
claims, 0 falsified** is 2724 confirmations, not a residue: for an argument,
`nullable` means "NULL is a safe binding", and a run that binds NULL without
raising *is* the witness. The direction that needs witnessing is the
over-restrictive one, and it is gated — 1848 notNull argument claims, 1848
witnessed by an actual null-rejection.

The **17 `@unwitnessable` reasons in the hand corpus** carry the same rot risk.
**This is now the only place a reason can rot**: the generated corpus's list is
empty, so every excuse left in the project is here. (Was 101 on 2026-08-22,
38 on 2026-08-23 before the triage pass below.)

The suite's own readout says 23, and the six-claim gap is not a discrepancy —
it is a SECOND excuse channel, and the note here used to have it backwards.
An `@unwitnessable` line names exactly one column, so lines and claims are the
same number. What the readout adds is the nullable claims inside `@no-rows`
fixtures, excused WHOLESALE by the fixture's own declaration that it returns
nothing rather than per column: four in `cast-jsonb-scalar.sql`, one each in
`extreme-cast-syntax-domain.sql` and `extreme-typecast-not-null-domain.sql`.
Six, measured, and they are the looser channel of the two — no per-column
reason is ever reviewed for them.

The pass over them started with the **largest cluster, and its reason was the
mechanism**: seven fixtures said "unnesting a NULL array produces no rows, so
the column being unnested is never observed NULL through this join". True, and
stated rather than built. A STRICT set-returning function in FROM filters its
own arguments — PostgreSQL never calls it for a NULL, the call yields zero
rows, and an inner join drops the row that supplied it — so every argument is
non-null on every emitted row. `recordStrictSrfImplications` records that as an
`IS NOT NULL` implied qual per argument, which every existing consumer then
picks up unchanged, `rowsImplyWhere` gating included.

Four gates, each a MEASURED counterexample rather than caution, and each with
its own fixture and mutation:

| gate | what breaks without it |
|---|---|
| not OPTIONAL | `LEFT JOIN LATERAL unnest(h.a) ON true` keeps the row with `a` NULL |
| one arm | `ROWS FROM (unnest(a), unnest(b))` pads the empty arm; the b rows survive |
| not the zip form | `unnest(a, b)` is one call over several arrays and pads the same way |
| strict AND set-returning | a strict SCALAR function in FROM returns ONE row of NULL, not none; a non-strict SRF is called with the NULL and returns what it likes |

The strictness fixture needed a new schema object, and the reason is worth
recording: the obvious control was `sw4_dom_rows`, the non-strict twin the
schema already carried — and it is the WRONG control. Its body is `… FROM
generate_series(1, n)`, so a NULL argument empties the series and the call
filters the source row anyway, for a reason that has nothing to do with
strictness. Reading the declaration said "non-strict"; running it said
"filters". `sw4_ignores_arg` exists because of that.

The builtin path rests on one measured fact — no pg_catalog name mixes
set-returning with scalar overloads, so the capture's `bool_or` quantifier and
the `bool_and` the walk needs coincide. That is now a snapshot test rather than
an assumption.

**The second cluster was `composite-star-shape` (5 claims), and its reason was
the mechanism too**: "a row type carries no constraints, but the fields are
real order_items rows". The FROM position already read the body —
`SELECT * FROM get_order_items(1)` claimed all five columns notNull while
`SELECT (get_order_items(1)).*` claimed none, off the same function and the
same body. `expandCompositeStar`'s FuncCall arm now passes its declared shape
through `refineColumnsFromBody`, the same call the FROM path makes.

SET-RETURNING only: a set-returning call contributes one output row per BODY
row, so an empty body contributes no row and there is no NULL composite to
expand. A scalar composite call over a zero-row body IS NULL — measured, one
row of all NULLs. The declared flags stay stripped either way, because a NULL
composite nulls every field including NOT NULL domain ones.

**A sound widening was built, measured, and then removed** — worth recording
because the reasoning is the one this whole pass is about. A scalar composite
call whose body GUARANTEES its row is equally sound, and `guaranteesSingleRow`
is exactly that gate. But no scalar function in the corpus both yields a
readable body shape and lacks the guarantee, so the gate's permissive
direction had no counterexample. Three candidate controls were tried and all
three passed a broken engine: `first_item` (the walk reads no body shape from
it at all), a FROM-less body with a WHERE, and the same with a parameter.
**An ungated widening reads as coverage and is not**, so it came out. Reopening
it needs the control first: a scalar composite function whose body the walk CAN
read and which can still return zero rows.

Two smaller gaps surfaced and are recorded rather than chased: `(f()).field`
is a different A_Indirection from `(f()).*` and takes an unimproved path, and
`first_item`'s body is unreadable to `sqlFunctionBodyShape` while
`get_order_items`' identical star is read.

**The third cluster was the SRF padding / longest arm (9 claims), and it was
two causes wearing one reason.** Every annotation said some version of "the
longer call is never padded, and a builtin SRF's column is uniformly
conservative". The second half was false in the target list and true in FROM,
for the same call — which is what gave the cluster away.

*(a) The FROM-position value reading, 2 claims.* A pg_catalog SRF with no named
output column contributes ONE column, and its values are the CALL's values:
`SELECT generate_series(1, 2)` and `SELECT g FROM generate_series(1, 2) g` emit
the same rows. The target list read that notNull all along
(`srf-strict-nullable-argument-target-list.sql` — a strict SRF's nullable
argument subtracts ROWS, not values); the FROM position never asked. It asks
now, through the same `walkExpr`. The reading DISCRIMINATES rather than
widening, which took a control the corpus did not have:
`string_to_table('a,b,c', ',', 'b')` is non-strict and its third argument is a
null_string, so row two comes back a real SQL NULL. Both answers now come out
of that one line (`builtin-from-position-value.sql`). The builtins WITH named
output columns take the snapshot's shape one branch earlier and did not move.

*(b) The padding's uniformity, 7 claims.* The clip was `counts.map(c => c > 0)`
— every SRF-carrying participant drops. "Longer" was read as "not alone", which
is the same answer only when nothing can be counted. `armRowBounds` counts what
it can and `unpaddedParticipants` compares: a participant survives when its own
MINIMUM covers every other's MAXIMUM. Three readings, and the asymmetry between
min and max is the whole mechanism:

| reading | bound | why |
|---|---|---|
| not set-returning | exactly 1 | one value is one row — including a strict call handed NULL, which still emits its row, of NULLs |
| `generate_series(lo, hi)`, constant integers | exactly `hi - lo + 1`, floored at 0 | the only source of a minimum above one; a backwards range emits nothing |
| SETOF whose body `guaranteesSingleRow` | at most 1, at least 1 unless strict-with-arguments | a strict call handed NULL never runs the body at all |

A lone arm falls out of the arithmetic rather than needing its own rule: with
no others, the maximum to cover is zero. `loneArm` survives only as the NAMING
predicate, which is what it always was — arm count names a column, row count
pads one.

**A per-arm clip broke the presence groups, and the break is the interesting
part.** Once the longer arm keeps its flags it becomes a group DISCRIMINANT,
and a unit spanning both arms then reads "the unit is present" on the very rows
the padding has emptied — the same contract violation
`rowsfrom-pad-presence-group.sql` was written to record, arriving from the
other side. A padded arm's columns go NULL while the ITEM is present, so they
are no part of the item's presence unit; `paddedFunctionColumns` records the
positions and `presenceProducer` drops them.

Six mutations, all caught, and the one that matters most is caught by
PostgreSQL rather than by a fixture: **"nothing is ever padded" fails 8
statements on the witness channel.** The three new fixtures are the controls the
corpus lacked — `rowsfrom-pad-shortest-arms.sql` (nobody padded; the two
minima), `rowsfrom-pad-empty-arm.sql` (the counted arm as a CEILING, with the
padding NULL witnessed), and `srf-padding-overload-body-split.sql`.

*(c) The body map's key.* Closing the 9th claim needed every candidate of an
overloaded name to be readable, and `fnBodyAsts` was keyed by `schema.name` —
so an overloaded name's bodies collided and one answered for all of them. It is
keyed by full SIGNATURE now, as `fnArgDefaultAsts` already was, and as the
adapter's own guard comment had been asking for. The padding bound takes
CONSENSUS over the candidates: a ceiling every candidate satisfies holds
whichever one runs. That is not a permission a FLAG can take, and
`body-shape-overload-collision.sql` still refuses — on the single-candidate
shortcut, which is the reason that was always doing the work.

The trap for the key (`ov_rows`) depends on WHICH body a collision would have
kept, and nothing pins that: it is the order the snapshot's rows came back in.
So it is paired with an order-independent structural assertion in
`catalog-census` — one body AST per sql-bodied signature — and the fixture's
comment says which half it is.

**The adapter's body-map guard was lifted, measured, and put back.** Its stated
reason is void now that the key is unambiguous, but lifting it moves NOTHING:
no fixture reaches a SQL-bodied overloaded name through typed selection, so it
is inert in the corpus rather than load-bearing, and removing it would be a
widening nothing could catch. The comment now says that instead of the old
reason.

**Three of the nine did not close, and their reasons are correct for the first
time.** Two have no bound to be had: `body-shape-rows-from-padding.sql` (the
other arm is `SELECT p.sku, 1 FROM products p`, an unbounded scan — closing it
would mean trusting a row estimate) and `srf-padding-unlisted-builtin.sql`
(`jsonb_path_query_tz` over a literal, countable only by evaluating a
jsonpath). Both now name the missing BOUND rather than a conservatism.

The third is a **route the bound has newly opened and nothing takes yet**.
`rowsfrom-pad-presence-group.sql`'s series column is unpadded now; what leaves
it nullable is the LEFT JOIN LATERAL, whose extension nulls the whole item —
and that extension can never fire, because `generate_series(1, 3)` guarantees
the LATERAL three rows. The same MINIMUM the padding already computes, asked of
the join state instead: an item whose arms guarantee a row cannot be
null-extended, so it promotes to REQUIRED. That is the presence fixpoint's
subsystem rather than the padding's, which is why it is recorded here instead
of built.

**The fourth pass took the two small clusters (10 claims), and eight of the ten
turned on a fact the engine already had.** No new subsystem in any of them:

| what closed | the reason it carried | what was actually true |
|---|---|---|
| `stddev_pop` | "population statistics are outside the curated tables" | the table's own comment said the statistical family is undefined for one row; **six of the twelve are not**. The line is `n` versus `n - 1`, and the whole family was re-measured at once |
| `sum` under `ROLLUP` | "aggregates under GROUPING SETS stay conservative" | what makes an aggregate NULL is an EMPTY generated set. A plain top-level term appears in every set — the fact `collectGroupingSetColumns` already reads to decide which columns get blanked |
| `= ANY (<closed array>)` | "the array expression is opaque to the walk" | the statement map held it evaluated. The walk read only `isNull`, which answers whether the ARRAY is NULL — not the question |
| `array_length(ARRAY[…], 1)` | "the builtin sits outside the curated tables" | true of the NAME and not of the call: the exclusion is about empty arrays and absent dimensions, both of which a literal constructor settles |
| `(ARRAY[…])[1]` | "indexes are not statically checkable" | a constructor's lower bound is 1 and its length is what it lists, so a CONSTANT index is checkable. The element is then walked, which is what makes `(ARRAY[NULL, x])[1]` still nullable |
| `CURRENT_SCHEMA` ×2 | "NULL only when the search path resolves to no schema, which no data state can arrange" | no DATA state can, and the search path is not data — it is the engine option every unqualified name is already resolved through. `searchPathResolves` is the one question the walk cannot derive |

Three of those needed a control the corpus did not have, and each is a pair of
calls one token apart: `string_to_array('1,2', ',', '2')` against the same call
without the null_string, `array_length(ARRAY[]::int[], 1)` and
`array_length(ARRAY[p.id], 2)` against the two-element form, and a fixture
under `-- @search-path nosuch`, where the NULL is witnessed on the only row the
statement can produce.

**The subtree evaluator's red suite had already written down the subscript
change before it happened.** `structural facts about open trees are refused`
carried the note that structural reasoning is "the walk's possible future
business, never the evaluator's" — so the guard's subject moved to an open
INDEX, and the old subject sits beside it asserting the opposite, which is what
keeps the two mechanisms distinguishable.

**The builtin table-function columns were the one place a curated claim was
falsified, and the falsification is the better result.** The admission looked
easy: a JSON null is a json DATUM, so `json_each('{"a": null}')` yields a
`value` PostgreSQL's own `IS NULL` calls non-null — measured, and true. It went
into `NON_NULL_BUILTIN_TABLE_COLUMNS` on that, and **PostgreSQL falsified it in
five data states**, because the claim is not about SQL's notion of NULL. It is
about what reaches the consumer, and the driver parses a `json` datum: the JSON
null arrives as `null`, indistinguishable from the SQL one. `json_each_text`
renders the same document to a real SQL NULL by a completely different route
and produces the same value on the wire. Both are in the fixture, identical
verdicts on different underlying facts.

So only `key` was admitted, on the one argument no rendering can touch — a JSON
object's field names are strings by the grammar. The other two claims came off
the `@unwitnessable` list anyway, by being WITNESSED: the fixture's document now
carries a JSON null, so the nullable claims have NULLs behind them instead of
excuses. That is the better outcome of the two and worth naming as one.

The table is curated and name-keyed, so it has three ways to drift and a
snapshot test pins all three — a name growing an overload breaks the key, and a
renamed column makes the entry SILENTLY INERT, since the flag is set by
matching the column name and a stale spelling matches nothing and reads as
conservatism.

`current_query()` was left alone. Its reason is accurate — NULL only when the
statement has no source text, which nothing executable can arrange — and that
is precisely what makes claiming it a widening no control could catch.

**The fifth pass re-triaged the four "expensive" clusters and found the label
was applied on the wrong axis.** They had been grouped by claim count, which
made them look like one kind of problem. They are three:

| cluster | claims | what is actually missing |
|---|---:|---|
| scalar-subquery guards | 6 | five need nothing from the engine at all — the SIXTH is a small rule |
| user-aggregate transitions | 3 | two catalog columns (`aggtransfn`, `aggfinalfn`) plus an induction hypothesis; the negative controls already exist in the schema |
| multi-statement bodies | 3 | nothing yet — the recorded reasons were wrong about the ROUTE |
| `extreme-order-dashboard` | 7 | a cross-subquery containment proof, one instance, no second in the corpus |

**Five of the six that closed were the fixture obstructing itself, and the
mechanism was a raise.** `scalar-subquery-zero-row-guards.sql` carried
`(SELECT count(*) … UNION SELECT 7)` in its SELECT list, which returns TWO rows
and raises for every product whose review count is not 7. That raise killed the
whole statement, so three correct nullable claims beside it — `having_count`,
`except_count`, `grouped_count` — had no witness for a reason that was nothing
to do with them. Their annotations said "unwitnessable"; the truth was
"unexecutable HERE". Splitting the UNION into its own file closed all three
with **no new data state**: `dense` already holds a product with exactly one
review and six with none, which is every NULL the three needed.

The other two, in `scalar-subquery.sql`, were the same shape one level up. The
outer query scanned `t` and so did the subqueries, so an empty `t` produced the
NULL *and* removed the row that would have shown it. **An uncorrelated scalar
subquery reads no outer column, so what the outer query scans was never part of
the claim** — the outer FROM moved to `products` and both claims are witnessed
under two states.

**The one engine rule is `unionArmEntailsNonEmpty`, and the argument for it was
already written down.** `subqueryKeyEntailedNonEmpty` sits directly below it and
its comment already says why at-least-one is the right predicate for a scalar
subquery: several rows RAISE rather than evaluating to NULL, and a raise returns
nothing to contradict anything. The missing piece was one more route to
at-least-one — a UNION is non-empty as soon as one branch is, because dedup
removes duplicates and never the last row. INTERSECT and EXCEPT are rejected
because either can delete everything the left branch produced.

The rule settles the ROW COUNT only. `combineSetOperation` already ANDs across
branches, so `SELECT NULL UNION SELECT NULL` is guaranteed its row and still
nullable — which is a fixture column, because a rule that reads as "UNION means
non-null" is exactly the misreading to gate against.

**Three branches, three mutations, three kills — and two needed controls the
corpus did not have.** Widening to all set operations is caught by
`except_count` with a real PostgreSQL NULL behind it. The other two were
ungated until built for: `union_limited` (`UNION … LIMIT 0`, where the branch
still guarantees its row and the NODE does not, which is why the guard is on the
node) and `union_nested_arm` (`A UNION B UNION C` nests LEFT, so the only
guaranteeing branch is one level down and the outer node's own two settle
nothing).

**Reach, measured: one fixture.** The rule fires nowhere else in the hand
corpus and changed no other verdict, and the generated corpus's 14964 queries
report zero violations. **That number ranks nothing** — it says the corpus had
one instance, not that the rule is worth less than a wider one. A UNION arm
that guarantees a row is a fact about scalar subqueries whether or not anything
here happens to spell it. What makes this a rule rather than a fixture-shaped
widening is the three controls, and the reach is a note about coverage
(AGENTS.md rule 2).

**The multi-statement cluster closed nothing and the reasons were still wrong.**
All three said some version of "the return derives from NOT NULL inputs".
`multi_stmt_fn`'s body is `INSERT INTO multi_stmt_log VALUES (1, $1); SELECT val
FROM multi_stmt_log WHERE val = $1` — the return derives from a TABLE SCAN, and
the fixture's own prose said so two lines below the annotation. What makes it
non-null is the statement the walk does not read: the INSERT writes `val = $1`,
which is exactly the scan's predicate, so the scan always finds at least the row
it just wrote, and `multi_stmt_log.val` is NOT NULL. The claims are conservative
rather than wrong; the reasons now name the entailment BETWEEN statements of one
body, which is a different question from any single statement's row count.

**The aggregate-transition cluster cost a fraction of its estimate, because the
moving part it was triaged as needing already existed.** The estimate said an
"induction hypothesis" had to be built into the walk — a way to ASSUME a
parameter non-null rather than derive it. `resolveSqlFunctionBodyTraced` has
taken argument nullability as a parameter since it learned to read bodies:
`argResults: boolean[]`. Passing `[true, false]` IS the hypothesis. Nothing to
build.

And every transition body was already parsed. A transition function is an
ordinary LANGUAGE sql function, so `fnBodyAsts` has held `count_it_sfunc`,
`nullify_sfunc`, `gfn_sfunc` and `nn_sfunc` all along. **The entire gap was the
LINK** — nothing recorded which function an aggregate folds through — and it
closed with two strings per catalog row, `aggTransFn` and `aggFinalFn`,
rendered as the key the body map is already keyed by. No new face member, so no
new capability and no census entry; `resolveFunctionMetadata` already returns
the `FunctionInfo` that now carries them.

The rule is an induction with one gate per step, and PostgreSQL falsifies each:

| gate | control | why it fails |
|---|---|---|
| non-null INITCOND | `agg_strict_noinit` | no INITCOND, and its STRICT transition makes PostgreSQL SKIP the NULL input, so nothing transitions and the NULL initial state is the answer |
| transition preserves | `agg_nullify` | throws the state away on the first row |
| final function preserves | `agg_finalnull` | folds through count_it's own transition, then nulls it in the FINALFUNC — the one control where the first two gates both pass |
| the HYPOTHESIS is the weakest one | `agg_sum_step` | `state + val` needs its value argument too, so assuming the arguments non-null would claim it |

Two of those four needed new schema objects, and the first taught something in
the process: PostgreSQL REFUSES `agg_strict_noinit` with `STYPE = bigint`
("must not omit initial value when transition function is strict and transition
type is not compatible with input type"). The reason is the very fact the
control turns on — with a strict transition and no INITCOND the first input
value BECOMES the state, so the types must agree. `STYPE = integer` and it
takes.

**A window-position user aggregate cannot reach the rule**, checked rather than
assumed: `fc.over` concludes and returns before Priority 3. That matters
because a windowed call may fold through the MOVING transition
(`aggmtransfn`/`aggminitval`), which nothing here reads — so the hole the rule
would otherwise have is closed by a dispatch that already existed.

**The one guard that turned out unreachable is recorded as unreachable.** The
fold reaches a body through a NAME-keyed resolver, and rebuilding the signature
key to compare against the recorded one looked like the check that keeps an
overload from speaking for another. Measured: it catches nothing, and not for
the reason first written down. `resolveFunctionMetadata` takes no argument
types, so it declines EVERY overloaded name outright — with both of the
adapter's body-map guards lifted, it still declines. So an aggregate whose
transition name is overloaded is refused whichever overload it declares:
conservative, by construction, and the price of not having a signature-keyed
metadata lookup. `agg_ambiguous` pins the outcome rather than the layer — its
two bodies disagree, and reaching for the wrong one would claim notNull where
PostgreSQL answers NULL.

**The drift tripwire was wrong on its first spelling, in exactly the way it
exists to catch.** `aggTransFn` and the body map's keys are rendered by two
DIFFERENT queries and agree only because both go through
`pg_get_function_identity_arguments`; if either drifts, every user aggregate
becomes unreadable silently and reads as conservatism. The first test filtered
the steps to "signatures the snapshot knows" — which DROPS a drifted key before
asserting anything, so mutating the rendering left it green. Filtering by
schema instead (a builtin step lives in `pg_catalog`, which drift does not move
it out of) makes the mutation fail with all eight aggregates named.

**The dashboard cluster was triaged as the hardest of the four and the triage
had the shape wrong.** It was recorded as seven claims needing a cross-subquery
containment proof. The trace says otherwise: the walk ALREADY computes all
seven `order_totals` columns as non-null inside the CTE, and the only thing
making them nullable outside it is one bit — `ot`'s `joinState = OPTIONAL`.
Seven claims, one alias, one bit; flipping it also collapses a seven-member
presence group the consumer had been handed for an arm no data could reach.

The promotion machinery was already there too. A fixpoint exists whose whole
job is OPTIONAL → REQUIRED, with three routes wired into it. What the dashboard
needed was a fourth, and what made it a genuinely new KIND rather than another
route is where the evidence sits. `foreignKeyEntailedAlias` reads the two
relations the join relates and says so in its own comment — *"a column from
elsewhere in the tree says nothing about whether THIS join matched"*. True for a
key, and exactly the restriction this case has to lift: the fact that saves `ot`
lives in a THIRD FROM item, the `CROSS JOIN LATERAL` at the bottom of the query.

`Scope.rowWitnesses` is the channel, a sibling of `impliedQuals` rather than
part of it: `impliedQuals` carries PREDICATES that eight consumers read as
WHERE conjuncts, and this carries an EXISTENCE claim about a relation, which is
not a predicate over any output column and would mean nothing to them.

**The producer and the consumer need OPPOSITE properties, and getting that
backwards is what over-gated the first draft.** The producing side needs only
`item non-empty ⟹ the source holds a matching row`. Everything that merely
REMOVES rows — LIMIT, OFFSET, HAVING, GROUP BY, a join inside the item, an
extra conjunct — can only turn the item empty, which drops the outer row and
makes the witness VACUOUS rather than wrong. The first draft gated all of them
as soundness gates. They are not, and none is gated now. The consuming side
needs `the row exists ⟹ the group is here`, which those same operations
destroy, so it gates every one of them.

Two conservative refusals are marked as conservative so neither reads as a
soundness fact: a multi-term GROUP BY is still sound (the group for the tuple
exists exactly when a row with the first key does — it may match SEVERAL times,
a row-count question this rule does not own), and the WHERE is required to BE
the equality rather than to CONTAIN it, since a conjunction carrying it would
be sound and reading that needs a conjunct walk nothing yet asks for.

**Five gates, five mutations, five kills, every one by PostgreSQL** rather than
by an annotation — an OPTIONAL witnessing item, a WHERE and a HAVING on the
grouped side, the relation-name match and the outer-column match. A sixth gate
was written, measured, and deleted: a set-operation witness cannot reach an
`sel.op` check, because a set-operation node holds no `fromClause` or
`whereClause` of its own, so requiring exactly one FROM item and a WHERE
already excludes it. The control stays and pins the outcome.

**EXPLAIN now diverges by one join on two fixtures, declared rather than
silenced.** The planner keeps the `ot` join, and not because it disagrees:
PostgreSQL's outer-join removal fires only when the inner side is UNREFERENCED,
and seven columns of `ot` are projected, so it keeps the join whatever the join
can do. The two mechanisms answer different questions and the `@planner-keeps`
reasons say which.

**The multi-statement cluster needed the catalog to stop throwing the evidence
away.** `parseFnBodyAst` returned `stmts[stmts.length - 1]` — a body's last
statement is what the function RETURNS, and for a long time nothing asked for
the rest. The INSERT that settles these three claims was discarded before the
walk could ever see it. It is now `fnBodyPreludeAsts`, and the reading of it is
the third route to AT-LEAST-ONE, after `subqueryKeyEntailedNonEmpty` and
`unionArmEntailsNonEmpty` — the first whose evidence is not in the statement
being judged at all.

The premise was measured before it was built on: `multi_stmt_fn('brand-new
-value')` returns that value out of a table that did not contain it, so a SQL
function really does advance the command counter between statements and the
scan really does see the insert.

Three gates on the insert side (a single-row VALUES, no `ON CONFLICT`, and the
written value equal to what the scan looks for), two on the scan side (HAVING,
LIMIT/OFFSET), and one on the sequence — no OTHER statement may write that
table, which is the gate statement ORDER matters for. **Six mutations, six
kills**, each with its own one-line control function in `schema.sql` and a
column in `multi-stmt-insert-entails-row.sql`.

**Two things fell out of the measurement that were not the plan.**

First, `INSERT … RETURNING` as a body was ALREADY notNull, and
`UPDATE … RETURNING` correctly nullable. The single-statement form — the one
people actually write — needed nothing, which is worth knowing before reaching
for the multi-statement form.

Second, one of the three claims did not move when the row count was settled,
and the reason was a separate gap this work surfaced rather than caused.
**PostgreSQL's deparser renders a `BEGIN ATOMIC` body's parameters QUALIFIED BY
THE FUNCTION NAME once the body has a FROM clause** — `SELECT b FROM t WHERE …`
comes back as `multi_stmt_atomic.b` — and parameter resolution read only the
bare form, so the returned expression resolved to nothing and stayed nullable.
Both halves had to land. The scope is asked FIRST at that site: a relation
aliased with the function's own name is the closer binding, and PostgreSQL
would have resolved it that way too.

Also corrected: `schema.sql`'s own comment on these functions said the body
"can return zero rows → function returns NULL", which was the ENGINE's verdict
written down as if it were PostgreSQL's. It is the same error the fixture
annotations carried, in the schema this time.

#### The triage pass over the remaining 38 (2026-08-23)

The four cluster passes above left 38, described at the time as "roughly twenty
genuinely permanent". Reading all 38 against the code rather than against their
own reasons put the permanent count at **15**, with **7 cheap** and 16 needing a
real build. Sixteen closed: 38 → 22 annotations, 44 → 28 unwitnessed, witnessed
coverage 94% → 96%.

**The recurring finding held for a fifth time: the reason was usually the
route.** Several annotations stated the closing fact outright —
`rowsfrom-pad-presence-group` ended "the route is a REQUIRED promotion for an
item whose arms guarantee a row", and the number it needed was already computed
by the padding bound; `extreme-domain-not-null-left-join` said "the two joins
cannot be separated by data" and had measured it. What was missing in each case
was somewhere for the proof to be written down.

**Where a rule was keyed on a SHAPE that stood in for a PROPERTY, widening it to
the property closed the item and usually more.** Three instances:

| was | is |
|---|---|
| aggregate over the DEFAULT window frame | over any frame that CONTAINS THE CURRENT ROW — measured against 17 spellings, and the predicate and PostgreSQL agree on all 17. Writing the default's own bounds out longhand had not qualified, because that sets the NONDEFAULT bit |
| `extract`/`date_part` excluded BY NAME | per FIELD and per argument TYPE. `day` is total for an interval and NULL for an infinite timestamp; the name-level exclusion was one fact standing for a two-dimensional one. Closed a second annotation (`builtin-functions:10`) with no extra work |
| composite `.*` expansion uniformly nullable | uniform over the arm where the value can be NULL AS A WHOLE, per-field over a ROW CONSTRUCTOR, which cannot be |

**Two measurements contradicted a recorded reason outright.**
`fk-entail-tablesample-full-fraction` argued that reading the fraction "would be
one shape away from unsound: `BERNOULLI (99)` keeps every row in almost every
execution". Measured over twelve runs of a 500-row table, BERNOULLI (99) keeps
489–497 — it really does drop rows — while **SYSTEM (99) keeps all 500**,
because SYSTEM samples by PAGE and 500 rows is one page. So 99 is not one shape
away from 100, it is a different kind of statement, and the trap the old note
was reaching for was the other method. The gate is equality with 100.

`check-origin-expression-death` said the CHECK "forces x non-null on every
housed row" and stopped one step short of why that is true. The CHECK tests the
BARE column against `'housed'`, and `upper(status) = 'HOUSED'` does not imply
it — a row storing `'HOUSED'` passes the filter and takes the ELSE branch. That
row cannot be seeded only because a SECOND constraint closes the column to
lowercase spellings. So the item is not the Tier-B precision fix it looked
like: carrying the origin needs `upper` proven injective over the admitted set.
Reclassified permanent, with the reason corrected.

**Three controls were written, measured, and then deleted for costing what they
bought** — each would have claimed nullable on a value that is never NULL and
paid a fresh `@unwitnessable` for the privilege (a `num_nulls` variadic call, a
`BERNOULLI (99)` join, an `out_pair` over a NOT NULL column). Two of the three
turned out to be already covered by a sibling fixture; the third guards a
REFUSAL, which can only under-claim and needs no witness. **A control that adds
an excuse is not a control.**

**Two gates are recorded as conservative rather than load-bearing**, because
mutating them changed no claim and no fixture could: the IMMUTABLE check on
`constantArrayBodyOf` (a body that IS an array constructor yields the same
constructor whatever its declared volatility, and the elements are walked
individually afterwards), and the third-alias refusal in
`sameRestrictionEntailedAlias` (two joins correlated to the same outer row do
match together). Both kept and both marked. **A gate claimed to be doing work
it is not is the same defect as an ungated widening.**

**Incidental: `pgsql-deparser` corrupts window frame offsets, mostly
silently.** The loud case was already pinned (`window-default-frame`). Measured
while adding frame controls, the defect is wider — it does not distinguish a
bound's DIRECTION and drops `UNBOUNDED FOLLOWING` on the end bound:

    1 FOLLOWING AND 2 FOLLOWING          -> 1 PRECEDING AND 2 FOLLOWING
    1 FOLLOWING AND UNBOUNDED FOLLOWING  -> 1 PRECEDING AND CURRENT ROW
    2 PRECEDING AND 1 PRECEDING          -> 2 FOLLOWING AND 1 PRECEDING

Only the third fails to reparse. The first two come back as VALID SQL meaning a
different frame, so **the generator must not request an offset frame bound**
without an expected-node check.

**Incidental: the `convalidated = false` gate has no executed witness.**
`fk_nv` and `fk_df` are seeded by no data state, so both `fk-entail-*` fixtures
return zero rows in every state and even their notNull claims are vacuous.
`inbound_receipts` (schema.sql:518) carries a **NOT ENFORCED** key and is
referenced by no fixture at all. NOT ENFORCED is the useful difference —
measured, the dangling INSERT that NOT VALID rejects goes through, and the
LEFT JOIN returns NULL — so seeding it would turn three annotations' worth of
evidence into a PostgreSQL-produced NULL with no engine change. Not done; the
two annotations themselves stay either way.

**The cast half of the CHECK kernel closed** (`bpchar-distinctness-varchar-
control`, 2026-08-23). PostgreSQL renders the SAME constraint two ways
depending on the column's type, measured:

    k varchar(4)  ->  CHECK (((k)::text <> 'a '::text) OR (x IS NOT NULL))
    k char(4)     ->  CHECK ((k <> 'a '::bpchar)       OR (x IS NOT NULL))

The bpchar form compares the column directly and the varchar form WRAPS it, so
`columnKey` saw no column at all in the varchar conjunct and the claim read
nullable behind a reason that called the refusal deliberate. It was deliberate
— for bpchar, where a cast to text strips the padding
(`length('a'::char(4)::text)` is 1) while the type's own comparison is
blank-INSENSITIVE, so the value and the operator move in opposite directions.

**The fix duplicated a fact before it stopped duplicating it.** The first
version carried its own name set with `character` excluded; the exclusion
already existed one layer down, as `TEXT_FAMILY_OIDS = {25, 1043}` behind
`literalDistinctnessSound`, measured for the same reason. Restating it would
have created two homes for one fact and a place for them to drift. The
eligibility JUDGMENT is now asked of the catalog at every point and the local
set holds only the two format_type SPELLINGS — a rendering fact.

Two of the three eligibility calls are unreachable from the corpus and are
recorded as such rather than presented as gates: every fixture route runs on
to `litsDistinct`, which asks the same predicate. They are not redundant in
principle — `comparisonAtom` also builds `cmpCol`, a column-to-column atom
that never consults it, and `(k)::text = (j)::text` over two bpchar columns
would become `cmpCol(k, '=', j)`, which is a strictly stronger predicate than
the bpchar comparison it would stand for.

**Still open, and the two halves have different causes.**

FOUR of the remaining claims are **blocked on the deparser, not on effort** —
`xmltable-jsontable` 4 and 9, `jsontable-lone-nested-empty-path`,
`jsontable-nested-in-nested-ordinality`. Each is a JSON_TABLE column over a
document that is a literal in the statement, so the exact probe is to RUN the
item and read `bool_and(col IS NOT NULL)`, delegating every jsonpath and
NESTED-PATH semantic to PostgreSQL. **`pgsql-deparser` 18.1.1 cannot render any
SQL/JSON node**, so the item cannot be turned into SQL at all. The engine is
CORRECT and CONSERVATIVE here: those columns read nullable, which is never
wrong, only imprecise. **Waiting on upstream, deliberately.**

The infrastructure was never the obstacle and neither was its contract —
`comparison-groundings.ts` and `written-value-guards.ts` are already two
pre-walk rounds building synthetic trees and handing answers to the walk as
data, so a third would be a pattern instance rather than a new capability.

**`docs/deparser-limitations.md` is the full measured record**, per construct,
with repro snippets and three drafted bug reports ready to file. It exists
because this exploration has now been performed TWICE from scratch and reached
the same conclusions both times — the first round's findings lived only in a
`KNOWN_DEVIATIONS` map keyed by fixture name, which is the wrong key for
remembering what the DEPARSER does. Read it before testing whether some
construct renders. It also carries two defects found while measuring: window
frame offset bounds are re-emitted with the wrong direction (three of four
cases SILENTLY, as valid SQL naming a different frame), and XMLTABLE comes
back with its row expression and document swapped — the latter masked for as
long as it was, because the only XMLTABLE fixture was already pinned at the
louder `deparse-threw` for the JSON_TABLE beside it.

THE FIFTH, `srf-padding-unlisted-builtin`, was grouped with them and does not
belong — it asks a CARDINALITY of an ORDINARY function, not a SQL/JSON node.
It was then called "blocked on nothing" on the strength of `SELECT count(*)
FROM jsonb_path_query_tz('[1,2,3]'::jsonb, '$[*]')` deparsing and answering 3,
**and that was wrong**: rendering the probe is not the gate. `jsonb_path_query_tz`
is STABLE — jsonpath datetime comparisons read the session TimeZone — so
`closedSetFunctionTypes` refuses it, while the immutable `jsonb_path_query`
beside it is admitted (both measured 2026-08-23, through the built face). A
stable function's analysis-time cardinality is not a promise about its
cardinality at execution time, and the padding turns that count into a notNull
claim, so the refusal is SOUNDNESS and not caution.

The `_tz` spelling is the name that fixture exists for — the direct sibling of
the listed `jsonb_path_query` among the 50 `BUILTIN_SRF_NAMES` was missing — so
swapping it for the immutable one would close the claim and delete the
fixture's reason to exist. **Recorded, not closable.**

A cardinality round for IMMUTABLE closed set-returning calls remains buildable
and would be a fourth instance of the pre-walk pattern. It closes nothing in
the current corpus, which is the argument against building it now: there is no
fixture it would move, so nothing could catch it going wrong.

#### The "permanent" pass (2026-08-23) — 21 down to 17

Reading the supposedly-permanent set against the runtime rather than against
its own reasons closed four more, none of them by an engine change. **The
recurring cause was a fixture standing in its own way, and the recurring fix
was to change the QUESTION rather than the answer.**

`body-shape-rows-from-padding` asked `ROWS FROM (sku_pairs(), generate_series
(1, 200))` and recorded that no state seeds 200 products, "a fact about the
seeds and not about the shape". Both halves true — and the constant was the
problem. Neither arm is provably longest, so the padding reaches every column,
and WHICH arm actually outlasts the other is data. Three against four products
puts the answer on both sides: generate_series is longer in empty/sparse/
uniform, `sku_pairs` is longer in dense. All three columns witnessed, no engine
change, no data change.

`extreme-jsonb-operators` held `(SELECT jsonb_agg(e2.data) FROM events e2)`
under an outer `FROM events e` — empty exactly when the statement returns
nothing. That is the same self-obstruction the scalar-subquery cluster turned
out to be. A WHERE that cannot match asks the same question of a statement that
still returns rows.

**Two gates had NO executed witness anywhere, and both now do.** `fk_nv` and
`fk_df` are seeded by no data state, so `fk-entail-not-valid` and
`fk-entail-deferrable` returned zero rows in every state — even their notNull
claims were vacuous — and `inbound_receipts`, carrying a NOT ENFORCED key since
it was added, was referenced by nothing at all. The route in both cases is a
DATA-MODIFYING CTE, which fits the one statement a fixture gets:

- **NOT ENFORCED** gates no write, so the CTE inserts a dangling row and reads
  it straight back. Same `convalidated = false` bit as NOT VALID.
- **DEFERRABLE INITIALLY DEFERRED** moves the check to COMMIT, so the CTE
  dangles the key and the suite's per-fixture `BEGIN … ROLLBACK` never fires
  the violation. Same `condeferrable` bit as INITIALLY IMMEDIATE, which is
  checked at end of STATEMENT and raises against the same CTE (measured).

Both fixtures now scan the witnessable relation and carry no annotation. The
unwitnessable spellings need no claim of their own: they set the same bit by a
route no single statement can dangle.

**Re-measured and still true:** PGlite CREATES a nondeterministic ICU collation
and then does not honour it — `'a' = 'A' COLLATE ci` is still false — so
`check-distinctness-collation-gate` stays referee-bounded rather than
world-bounded. That reason is correct as written.

**Three reasons were sharpened without changing a count**, because they
understated what was covered: the instead-of-trigger refusal IS witnessed, by
`k` in the same statement (passed in as 'v', returned NULL) — only one COLUMN
of one trigger is uncovered; `extreme-correlated-everywhere`'s column is
`products.category_id`, witnessed all over the corpus, so what is unwitnessed
is that statement's own filter; and `check-not-valid` cannot catch a regression
on its own, its bit being witnessed by `check-not-enforced.sql` on a real row.
**A fixture that pins a claim nothing can falsify should say so.**

### 4. Known imprecision residue

Every row here is correct-and-permanent. **The three that used to be marked
"closable" are gone: all three were closable, and two had already been closed
for weeks while the register went on listing them as work.**

That is the finding, not a bookkeeping note. A row that says "closable"
records the absence of a fix, which is exactly the fact a closed fix stops
making true, and nothing in this table executes:

| the row said | measured 2026-08-23 |
|---|---|
| a NOT NULL domain column reads nullable — closable | reads **notNull**, and serves as a presence-group discriminant. Closed 2026-08-05 (`docs/imprecision-closure.md`), and the register kept the entry for eighteen days |
| a base-table alias column list is ignored | **honoured for names and flags** — `ck AS z(p,q,r,s)` gives both, and a partial list leaves the tail its own. NOT honoured for TYPES, found 2026-08-24: `renderedTypeOfExpr` handed the query's name to a catalog keyed under the catalog's and read no type for 8 residue columns. Fixed the same day (`alias-column-list-types-red.test.ts`) |
| boolean literals in CHECK — closable, *if ever worth it* | genuinely open, and closed the same day by `boolLiteral` in `check-entailment.ts` |

The third row is why the other two matter. Its hedge — **"if ever worth it"**
— was reach dressed as judgment, and the reach was never measured; behind it
the kernel could not read a boolean literal in a CHECK at all, which is a
correctness gap and not a question of return. `AGENTS.md` rule 2 now says so
as a rule.

**And it kept paying out.** The successor row — "a CHECK literal that is not
a truth value", the residue the same-day fix left — read as one cast
spelling. Measured 2026-08-24 it was ten shapes, in two places, and one of
the two spellings it NAMED does not exist (parse analysis folds
`'t'::boolean` before the kernel could refuse it). A row that describes a
refusal in the vocabulary of the refusal will always read smaller than the
gap: the refusal knows what it declined to match, not what walked past.

**A "closable" entry rots faster than a wrong reason does**, because it is
falsified by success rather than by drift: the fix lands, the row keeps
reading as work outstanding, and the only way to notice is to ASK THE ENGINE.
Two of these three needed one query each.

| Construct | Current | Note |
|---|---|---|
| `A_Indirection` element / field / jsonb subscripts | nullable — correctly | out-of-range elements and missing jsonb keys ARE NULL; composite fields carry no constraints. SLICES are closed — they clamp rather than NULL (`array-slices.sql`) — and so is a CONSTANT index into a literal `ARRAY[…]`, where the length is the constructor's own (2026-08-22) |
| `JSON_VALUE` / `JSON_QUERY`, `JSON_ARRAY(subquery)`, `XmlExpr` beyond `XMLELEMENT` | nullable — correctly, permanently | a FOUND JSON null maps to SQL NULL through every ON EMPTY/ON ERROR combination, so no clause analysis can prove these; `JSON_ARRAY(SELECT …)` over an empty subquery is NULL; `xmlconcat`/`xmlforest` of NULLs are NULL. `JSON_EXISTS` is the one provable member and is closed |
| Non-strict scalar and `LANGUAGE plpgsql` functions | nullable | bodies are not statically analysable; a NOT NULL domain return is the escape hatch |
| `pg_catalog` builtins outside the totality tables | nullable | totality has no catalog flag and cannot be proven by sampling, so the tables stay curated, each entry measured on admission. `array_length` used to be the example and is a poor one now: the name's exclusion is real, and a literal `ARRAY[…]` settles both causes behind it |
| Custom operators backed by unanalysable functions | nullable results | the operator machinery is built; what stays conservative is the output side when the backing function is plpgsql or has multiple candidates |
| MERGE with mixed arm kinds | **closed** | the join condition promotes only when every ROW-PRODUCING arm is MATCHED-kind — a NOT MATCHED arm fires precisely on the condition's failure, and a `DO NOTHING` arm returns nothing to fire with (closed 2026-08-23). The other half, an arm's own `AND` condition, closed 2026-08-24: every returned row satisfies the DISJUNCTION of the row-producing arms' conditions, pushed onto `impliedQuals` by `buildMergeScope`, where the kernel's existing OR handling turns it into an or-fact and `predicateProvesNonNull` reads it on the plain path. Refused whole when ANY producing arm carries no condition — such an arm fires on its match kind alone, so the disjunction would contain TRUE. `merge-arm-disjunction-red.test.ts`, and the fixture pair `merge-arm-condition-{disjunction,uncondition}.sql`, one clause apart with opposite verdicts |
| CHECK entailment, conservative edges | nullable | parameters never match (identity needs the literal token; permanent for a per-statement contract), and origin consumption is gated as designed |
| Presence groups | none recorded | every launch and post-launch residue closed 2026-08-04; future entries come from consumer corpora |
| A CHECK literal that is not a truth value | **closed** | The row said "a cast", and measuring it said TEN SHAPES and a second site. Parse analysis coerces an UNKNOWN literal, so `'t'::boolean` is already `true` in `conbin` and the kernel never saw it; the rewriter folds NOTHING, so `1::boolean`, `1 > 2`, `'a' = 'b'`, `starts_with('abc','z')`, `ARRAY[1,2] @> ARRAY[3]`, a jsonb `?`, `false IS TRUE`, a closed CASE, `3 = ANY (ARRAY[1,2])` and a closed `IN` all arrive unreadable, each a dead disjunct with PostgreSQL refusing the NULL behind it. And the walk's own OR rule was blind to a BARE `false` (`WHERE false OR v IS NOT NULL` proved nothing). All closed 2026-08-24 by `closed-truths.ts` — subtree-evaluation.md consumer 3 — which ASKS rather than matching, the statement half free off consumer 1's map. `closed-boolean-truths-red.test.ts`; fixtures `closed-truth-check.sql` and the `closed-truth-predicate{,-live}.sql` pair, one character apart with opposite verdicts |
| **A NAME-LEVEL total claim over UNREADABLE operand types** | **closed — this was UNSOUND** | Found 2026-08-24 while looking for a fixture that DEPENDS on type delegation. `+` is on `TOTAL_OPERATORS` with `+(path,path)` recorded as the hole, kept because "the falsifying input needs a path-typed column, which essentially no application schema has". The reasoning was right about where the hole is and silent about when it is REACHED: the name-level claim fires exactly when the signature narrowing cannot decide, which is exactly when the path row cannot be eliminated. `WITH s AS (SELECT seg AS a, alt AS b FROM route UNION ALL SELECT alt, seg FROM route) SELECT s.a + s.b FROM s` claimed **notNull** and PostgreSQL returned **NULL on every row**. The corpus could not have caught it — it had no path-typed column at all, because the register's own reason for keeping the name said one would be unusual. Fixed by refusing at the fallback when `PARTIAL_OVERLOADS` names the operator; `id + 1` is untouched because it narrows and never reaches that branch. Fixtures `name-level-partial-overload.sql` (the set operation) and `operator-path-column.sql` (the readable control), and the corpus's first `path` columns |
| **A NAME-LEVEL strict claim over UNREADABLE operand types** | **closed — this was UNSOUND** | The twin of the row above, found the same day by asking whether that bug had a sibling. `||` is on `STRICT_OPERATORS` with the array row recorded in `NON_STRICT_OVERLOADS` — array concatenation ABSORBS a NULL, so `NULL::text[] \|\| ARRAY['x']` is `{x}` and a TRUE comparison through it proves nothing about either operand. `promotionOperatorIsStrict` asks the runtime per-signature FIRST and falls back to the curated name only when the narrowing has no candidates, which is exactly where the array row survives. An array column behind a set operation was promoted and PostgreSQL returned a NULL row. **The ledger was right and enforced the whole time** — `totality-probe.test.ts` asserts it against PostgreSQL from both sides — and the walk never read it. A recorded hole with no consumer AT THE POINT OF USE is not a guard. Fixture `non-strict-overload-promotion.sql`, and the corpus's first NULLABLE array columns |
| **A CTE column the re-export reading cannot type** | **closed 2026-08-24, hours after it was opened** | Opened as the measured cost of the two rows above: those refusals fire only where the operand types are unreadable, so the price is exactly the shapes that read unreadable and did not deserve to. It was not "everything behind a CTE" — it was **two shapes, one function**. `reExportedBaseColumn` answers in the vocabulary "WHICH base column is this", which has no word for a value with no base column, so it refused a target list under `SETOP_*` on its first line and a non-`ColumnRef` target on its `cr` check. `reExportedTypeSet` asks it in TYPES instead: an expression is typed by `operandTypeSet` in the inner query's own scope (the shape `elementTypeInSelect` already used), and a set operation is the union of its branches at that position (the rule already used for CASE arms and COALESCE arguments). Cycle guard by AST identity, not depth — `WITH RECURSIVE s AS (SELECT 1 AS v UNION ALL SELECT s.v + 1 FROM s)` types `s.v` from a branch that reads `s.v`, and running that to the depth limit would RAISE where refusing is the answer. A branch nothing can type refuses the whole union rather than answering from the rest, and an unresolved polymorphic spelling (`unnest`'s `anyelement`) is refused outright: a set whose contract is to CONTAIN the resolved type cannot hold a name `format_type` never reports. **Measured across the fixture corpus: 36 column names in 16 fixtures now type that did not, 0 regressed, and 0 nullability claims moved.** The claims did not move because delegation had already rescued the one fixture that depended on it (`cte-self-join`) and the rest were nullable for other reasons — the value is the residue this removes from the name-level fallback, plus the defect below, which is what the reading actually found |
| **A unified member list with an UNREADABLE member** | **closed — this was UNSOUND, and only the row above could expose it** | `COALESCE`/`CASE`/`GREATEST`/`LEAST`/array-literal members are unified by PostgreSQL to ONE common type. The walk read the union of the members it could type and DROPPED the rest, which is right for a member PostgreSQL itself considers UNTYPED — a string literal, a bare `NULL`, an undeclared `$n` all take the common type of the others, and that is why `COALESCE(m.ts, 'x')` still reads `timestamptz` — and wrong for a member whose type the walk merely could not SEE. Both arrived as `null` from `operandTypeSet`, so the two facts were one. Witnessed the hour the re-export reading landed: `extreme-recursive-category-analytics.sql`'s `COALESCE(cp.product_count, 0)` over a `count(*)` column read **`[integer]` where PostgreSQL resolves `bigint`** — a containment violation, the one thing a type set promises never to be, caught by `type-unions.test.ts`'s containment direction. **The defect was older than the reading that exposed it**; nothing had ever asked that node for a type with an unreadable member in it, because the re-export refused before the question could be reached. `unifiableMemberTypes` now refuses the whole list when a member is unreadable and drops only the context-typed ones (`isContextTypedNode`). A closure whose corpus effect is zero claims is not a closure whose effect is nothing |
| The OVERLOAD SUBSET rule, as a property | **pinned 2026-08-24** | Both fixes above refuse over a name; neither refuses over a SUBSET, and nothing tested the difference until it was asked for directly. The rule is that the candidate set is the overload subset the KNOWN operands reach and the verdict quantifies over THAT — so one readable operand is a real narrowing, not a licence. It cuts both ways and the two operators land on opposite sides, which is the point: an `integer` left reaches 14 `+` rows and `+(path,path)` is not among them (read from `pg_operator`/`pg_cast` in the assertion, so a future PostgreSQL adding an integer-reachable non-total row fails the test) → **notNull**; a `path` left reaches exactly `path,path` and `path,point`, hole included → **nullable**. On the strictness side one operand is NOT enough: with `text` on the left, `anycompatible \|\| anycompatiblearray` survives, and PostgreSQL really runs it — `NULL::text \|\| ARRAY['a']` is `{NULL,a}`, so the concatenation absorbs the NULL rather than returning one and a TRUE comparison proves nothing. That refusal is correct, not shy. `half-known-operands.test.ts` (15 targets, every claim adjudicated against the database in the same assertion) and four columns of `name-level-partial-overload.sql` — `counted`, `half_int`, `half_path`, `combined` — which walk the rule from one-side-known-and-clean to neither-side-known |
| A POLYMORPHIC signature, in any consumer | **closed** | The evaluator's two survivor checks — an unknown operand must land on an immutable-I/O parameter, a result must be base-kind — both read the DECLARED spelling, which for a polymorphic row is `anycompatible`/`anycompatiblearray`: never a base type, never in a set of them. So a polymorphic signature refused on contact with a bare string literal, and a polymorphic RESULT refused at any argument spelling. The tell was `array_position(ARRAY['a','b'], 'z')` open while `…, 'z'::text` folded — a difference in SPELLING, not volatility. Closed 2026-08-24 by resolving the family from the call's known operands and running both checks against the resolved type; the AGREEMENT case only, so it falls back to today's answer and can only add. Surface: **48 immutable pg_catalog functions with a polymorphic result could never fold, plus 46 with a polymorphic param, 3 + 19 operators.** The check still works — `array_position(ARRAY['2020-01-02'::date], '01/02/2020')` is 1 under MDY and NULL under DMY, and `date` is out of the set. `polymorphic-landing-red.test.ts`, fixture `polymorphic-landing.sql` |
| `A_Indirection` over a CLOSED array | **closed** | Filed 2026-08-24, closed the same day by the grammar census below. A subscript dispatches a TYPE'S OWN routine, not an I/O function — `array_subscript_handler` and `jsonb_subscript_handler` are both immutable — so the closure question is the argument's. Distinct from the permanent `A_Indirection` row above, which is a subscript over a COLUMN. `closed-grammar-subscript.sql` |
| Every SQL/JSON expression node, in the evaluator | **blocked upstream** | `JsonIsPredicate`, `JsonObjectConstructor`, `JsonArrayConstructor`, `JsonScalarExpr`, `JsonParseExpr`, `JsonSerializeExpr`, `JsonFuncExpr` (JSON_VALUE/QUERY/EXISTS). Each answers a definite value from all-literal arguments (measured), each would close on the ordinary immutable-I/O grounds — `json_in`/`jsonb_in` are immutable — and `pgsql-deparser` throws `Deparser does not handle node type` on ALL SEVEN. The evaluator renders every collected subtree and a rejected render zeroes the whole statement's map, so admitting one would cost every other answer in the same query. **ONE blocker, not seven, and the drafted-and-unfiled missing-feature issue in `docs/deparser-limitations.md` is what unblocks it** — which is a better reason to send that report than tidiness. `closed-grammar-red.test.ts` |
| The closed grammar's census | **third direction added** | The allowlist census caught over-admission and dead gates and could not see ABSENCE: a kind the gate never heard of is never inside a collected subtree and never classified `closed`, so both directions passed while the gate did not exist. **Twenty-six expression kinds were in that blind spot** — two closed and refused anyway, seven blocked upstream, the rest open for reasons now written down and testable. `subtree-evaluator.test.ts`, "every expression kind the corpus writes has been CONSIDERED" |
| A closed subtree that evaluates NULL | **closed** | The statement map's `isNull` had only ever been read forwards — non-null claims notNull — and the reverse is the same argument: closure means no row can move the value, so a closed subtree that evaluated NULL is NULL on EVERY row. `alwaysNullExpr` reads the map since 2026-08-24. Corpus effect **21 → 31 alwaysNull claims, 0 falsified**, across five pre-existing fixtures, and the verification is the strong direction — any non-NULL value on any returned row refutes one. Found while writing a fixture for the row below, which is the only reason it was found: nothing recorded it as open, and one fixture comment recorded it as SETTLED for the wrong reason (see "a fourth rot mode" above) |
| A cast over a COMPUTED argument, in any consumer | **closed** | Opened and closed 2026-08-24, one commit apart. The refusal was the EVALUATOR's rather than the kernel's — `typeSetOf` closed a cast over a LITERAL argument only — and the rule was SYNTACTIC where the hazard it guards is TYPED: the leak is a stable OUTPUT function crossing an I/O coercion, which is a fact about `timestamptz`, not about computation. The gate now reads the same 48-type immutable-I/O set every other closure question uses, on the argument's own resolved types. Sound because a cast between two set members is binary-coercible, an I/O conversion, or a cast function — and of every `pg_cast` row whose source AND target are both members, ZERO has a non-immutable cast function (swept PG18.3, and the sweep RUNS as an assertion in `computed-cast-closure-red.test.ts`, so a future PostgreSQL that adds one fails first). `isBuiltinImmutableIoRendering` was added rather than reusing `isImmutableIoRendering`: the latter admits first-wave USER renderings, whose casts route through user functions of any volatility. Design B stays literal-only (its admission reads the VALUE's shape). Fixture `computed-cast-closure.sql` |

### 5. The datetime settings decision

Re-measured when the atom-oracle rung was built (2026-08-12): 204 + 77
immutable datetime rows are served with no settings assumption, leaving a
90 + 27 stable-row residue, and all six input functions are still stable. The
decision about what to do with that residue **stays open**; the charter is
`docs/subtree-evaluation.md`.

### 6. Four builtin rows blocked on the runtime

`pg_logical_slot_get_changes`, `pg_logical_slot_peek_changes` and their
`_binary_` twins are the only `UNPROBED` group with a nameable revisit
trigger. Reading a slot needs an output plugin whose result a SELECT can
consume; the only plugin in the PGlite build is `pgoutput`, which writes to a
replication connection and takes the backend down when called from a SELECT.
`test_decoding` is contrib and is not in the published dist.

**Trigger.** A future `@electric-sql/pglite` that ships `test_decoding`.

### 7. PostgreSQL's regression suite as a borrowed corpus

Recorded, not scheduled. `pglite/postgres-pglite/src/test/regress/sql` —
verified 2026-08-23, 232 files at that path (the entry used to name it one
directory up, where nothing is) —
PostgreSQL License — is the most adversarial SQL corpus in existence, but it
is stateful scripts rather than schema/query pairs: using it means treating
each file as a continuous migration and intercepting the SELECTs and DMLs
against accumulated state. The query shapes are mostly simplistic; **the prize
is SYNTAX coverage** — every construct PostgreSQL has — so it buys
refusal-census and shape-oracle reach, not nullability depth.

**Trigger.** Wanting the unsupported-node surface swept by the engine authors'
own corpus.

### 8. Semantic re-founding — standing TODO, parallel track

**What.** Re-found the engine on a semantic core instead of the grown rule
system: lower the parsed AST once into a small relational IR (~10 operators —
Scan/Filter/Project/Join/Union/Aggregate/Values/DML — with predicates in one
normalized 3VL language), model a relation as a set of rows carrying a
REFINEMENT (its invariant), and let operators transform refinements
compositionally. Scan emits the catalog's notNull facts, validated CHECKs as
notFALSE, and generated columns as equalities — one uniform refinement where
today those are separate code paths. Filter ADDS TRUE facts, so WHERE
promotion, implied quals, HAVING and branch guards all become the same
operation at different sites. Join contributes presence, derived from the
operator instead of hand-threaded. Column nullability becomes the single
question "does the row refinement entail `col IS NOT NULL`?" — the entailment
kernel promoted from leaf-level consultation to THE engine. Origin tracking
becomes provenance proper (the semiring formulation; `rowPath` is hand-rolled
why-provenance), under which the origin extensions that are architecturally
heavy today compose naturally.

**Why believe it.** Most of the current rule surface is AST-shape
normalization — accidental, and it collapses into the lowering, once. A
smaller part is measured PostgreSQL facts, which are irreducible and become
the model's axioms (the pins already are that). The actual inference is
ALREADY the abstract thing: the kernel is a small sound proof system, and the
waves added fact sources rather than special cases. The tell is features that
are hard here but natural in the cleaner model — origins through UNION,
promotion-at-distance — which means the architecture is fighting its
representation.

**Method — why this is low-risk here.** Not a rewrite. The current engine
stays as is; the prototype is a PARALLEL implementation differential-tested
against it AND the execution oracle over the same corpus. The fixtures,
witness discipline and generated axes are representation-independent, so
parity is a number that goes up and the prototype cannot drift silently. Cut
over only at full parity. The `QueryContract` boundary means the consumer
never notices.

**What it must not change.** The measured-pin culture (PostgreSQL is not its
spec; axioms come from PGlite), the contract surface, and the witness
invariant.

**What it no longer has.** The executable target list — `residue-*.sql`
fixtures pinning conservative answers, so an engine that starts narrowing one
fails in the "you improved, update the claims" direction — **emptied in
2026-08**. Every entry inside the rule engine was closed. So the cut-over test
of whether the abstraction earned its keep is gone with it, and the payoff
argument now rests on uniformity and maintainability rather than pending
precision. New entries come from consumer corpora.

---

## Decided against — do not re-open without new information

**Value tracking for nullability** (the CASE value-dependence rung ladder).
Knowing that `CASE WHEN active THEN 'a' ELSE name END` never takes its ELSE
because `active` was written `true` requires tracking the VALUE, not the
nullability — and the rungs above it each look equally reasonable until the
engine contains a constant evaluator for PostgreSQL expressions that must match
PostgreSQL exactly or produce unsound claims. Ruled out entirely, no rung
implemented.

*New information arrived 2026-08-11*: the premise is dissolved by subtree
evaluation — closed trees are answered BY PostgreSQL through the `evaluate`
callback, so nothing is reimplemented and nothing can drift. **The ban's actual
object — an ENGINE-INTERNAL constant evaluator — stays banned**; the ladder's
rungs become charterable one at a time through the evaluator and the kernel's
atom oracle, per rung, chartered and pinned, never wholesale.

Two boundaries clarified and still standing: cross-literal ORDER reasoning is a
rung of this ladder (concluding FALSE(`qty > 0`) from FALSE(`qty > -20`) needs
a linear-order theory over literals) and reopens only through the evaluator;
collation-gated literal DISTINCTNESS is **not** a rung and its admission does
not reopen anything — it compares two tokens already present in the SQL and
concludes only "unequal", where the catalog proves that sound. Numerics stay
banned there precisely because token inequality would require evaluation.

**Reproducing PostgreSQL's column-naming rules (`FigureColname`).** The engine
reports an empty name for un-aliased expressions and should keep doing so.
Names are not the contract and cannot be — they are not unique (`SELECT a.id,
b.id` yields two columns called `id`), so a consumer must join by position.
That consumer runs `PREPARE` anyway, and `RowDescription` hands it the
authoritative names for free. Porting the rules means maintaining a
version-drifting reimplementation of PostgreSQL internals to produce something
the consumer already has. What the best-effort names ARE good for is catching a
wrong column list in the tests.

**A C source scanner for totality.** Built, used once, then deleted, and it
should not be rebuilt. Three measured reasons: its false-negative rate was 2 in
8 on a hand-picked sample — the unsound direction — because thin entry points
delegate to `_common` helpers; `PG_RETURN_NULL` is only one of four NULL routes
in that tree (24 `isnull` assignments, 346 `DirectFunctionCall` sites whose
callee's flag propagates, 85 SRF/tuplestore sites); and beyond detection the
real barrier is reachability, which needs a PostgreSQL-aware interprocedural
analyzer. It also required a source tree the package will never ship.
Everything the scan gave that was reliable — names, signatures, argument and
return types — is available at runtime from `pg_proc`. **Reading the source by
hand, per signature, as the second stage of a promotion, is a different thing
and is the standing practice.**

**A differential oracle against another implementation.** Both candidates read
in full (2026-08) and demoted, not queued. *postgres-language-server* has no
comparable surface: it never derives a query's output column list, contains
zero code inspecting join types, and its type checking hands the SQL to a live
PostgreSQL via PREPARE — the same oracle this project uses directly. *sqlc* is
closer (libpg_query, genuinely join-aware output columns, `sqlc analyze`
emitting per-column `not_null` with no database) but unsound in BOTH
directions: every resolvable function including `sum`/`max` is NOT NULL, scalar
subqueries inherit the inner column's NOT NULL, nested join trees drop outer
requiredness, UNION takes the left arm only, and there is no WHERE promotion at
all — so it cannot serve even as a one-sided bound. Its parameter `not_null` is
a different *definition* than ours, so param comparison is a category error.
**The inverse is real**: our corpus provably exercises sqlc's enumerated holes,
so running `sqlc analyze` over the fixtures would mostly find bugs in sqlc — a
possible upstream contribution, not verification of this engine.

**Chartering adversarial sweeps against CODE AGE.** Stopped after sweep 3
(yield 8 in ~155 probes, against sweep 2's 13 in ~120, with three of the eight
in code predating both and the four most heavily rewritten sections coming
back clean across 55 probes). Sweep 4 confirmed the reading and sharpened it:
7 in 169, but three of the seven were in mechanisms added days earlier, four
were older, and the two widest were not about age at all. **The discriminating
variable is POSITION, not age** — five of seven were FROM items, where the
engine's model of "what rows does this produce" is thinnest and a shape defect
misassigns every later flag.

What actually produced findings was three older heuristics, and each has a
home now rather than a sweep: sweep every hand-curated table against the
catalog it approximates (a scheduled item); compare ORDERED NAMES, never arity
(open item 1); ask whether a resolver's universe matches PostgreSQL's (a
checklist item for the next mechanism anyone adds). A fifth sweep needs a new
argument, and "the code has grown again" is not one.

**Mutating existing queries as a way to generate new ones.** Rejected.
Transformations beyond blind wrapping need the same scope and type knowledge
that construction needs, so mutation buys no validity for free — and it is
bounded by the shapes the corpus already contains, which is the opposite of
what a generator is for.

**A diagnostics channel for ambiguous references.** An unqualified name
matching several visible columns resolves to nullable with the candidates in
the trace. A dedicated channel was rejected: PostgreSQL rejects such queries at
parse-analysis time, so any consumer running `PREPARE` gets a precise error
from PostgreSQL itself.

**Name-based joining of nullability to `RowDescription`.** Rejected. Column
names are not unique, so a name join must either pick one (wrong) or degrade
both to nullable (lossy, on ordinary queries). Position disambiguates exactly
what names cannot; open item 1 is the guard that makes positional joining safe.

**`remove_useless_joins` as a nullability concern.** Permanently out of scope.
The planner deleting a unique, unreferenced side is a row-count fact, not a
nullability fact, and it is detectable from the plan itself (the scan node is
gone). Pinned as `explain-join-removal.sql`.

**GROUP BY / HAVING and WITH in the subtree evaluator.** Neither should be
re-opened. GROUP BY/HAVING is three admissions buying nothing, and the paying
shape needs a FROM. Consuming a CTE means `SELECT * FROM c` or `SELECT c.x FROM
c` — both ColumnRef, so admitting it means resolving a NAME, the one line the
evaluator is defined by. A CTE inside a sublink reads the outer query's
columns, making it a correlation site rather than an island.

**ORDER BY beside a LIMIT in a closed body.** Declined 2026-08-17. The obstacle
is not collation and no capture lifts it: `VALUES (1.0),(1.00) ORDER BY column1
LIMIT 1` answers `1.0` and the same body written the other way answers `1.00`.
Sorting both directions and admitting on agreement would work, but costs one
more mechanism and a round trip per sliced body, for plain-SRF and VALUES
bodies only, against demand every verification run measures at zero. **DO NOT
RE-OPEN AS CHEAP: the sizing is the reason it was declined, not an argument for
taking it.**

**Claims about a USER function's arguments beyond its declared parameter
types.** Not to be re-litigated. A body is not an interface. The channel a
schema author uses to GET a claim is the declared type, where a NOT NULL domain
is rejected at Bind before the body is reached; standard types are nullable by
design. The catalog-visible class proposed for a rule — a non-strict function
with a NOT NULL domain return whose body is NULL-preserving — is deliberately
not built, because a plpgsql body that simply `RAISE`s on NULL is the same
rejection with no catalog trace, so the line would move without arriving
anywhere.

---

## Process rules that belong to no single file

Everything else the builtin-surface work learned lives in
`tests/unit/query/probe-values.ts` beside the mechanism it constrains. These
three are about how the work is *done*, so they have no such home.

1. **Promotion subtracts the witness corpus.** A signature convicted by a sweep
   may already be witnessed by hand, because its NULL route is state the sweep
   cannot vary. The loop-closer caught `current_schema()` twice.
2. **Corpus parity.** Any corner value used to convict must join
   `probe-values.ts`, or the standing probe cannot re-find what you found.
3. **An absolute in a pinned reason is a claim, not a fact.** When a pin says
   *cannot*, *never*, or *the only*, that is the sentence to re-test. It has
   been wrong three times: `NO_GENERATOR` cost 102 signatures to the habit, the
   `coldeflist` group cost four, and this document's own "only live
   unsoundness" cost a year of pointing at a defect the engine did not have.
