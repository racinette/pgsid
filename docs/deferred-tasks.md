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
| Query generator and its axes | `docs/query-generator.md`, `docs/generated-surface.md` |
| Generated soundness instrument | `tests/unit/query/generated/generated-soundness.test.ts` |
| Subtree evaluation | `docs/subtree-evaluation.md` |
| Argument / parameter contract | `docs/argument-nullability.md` |
| Witness corpus discipline | `docs/witness-coverage.md` |
| Anything needing project config or a call site | `docs/consumer-design.md` |
| Catalog-driven generation | `docs/catalog-driven-generation.md` |
| History of what was built when | `git log` |

---

## Open items

### 1. Arity-and-order gate at the consumer boundary

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

**Why not done.** No consumer — nothing under `src/` calls `inferNullability`
yet, and the engine has no PostgreSQL of its own to compare against.

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
strict enough to notice. `snapshot.indexes` and `DomainInfo.checks` reach
nothing but the diff's entity map.

**Trigger.** Do it the next time any capture is added to `snapshot.ts`, and
before the consumer's first contract-holding slice. A capture whose only
consumer is the diff is where it pays, precisely because no oracle downstream
will complain.

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

### 2a. Or-fact triggers for arm exclusion

Deferred, from the CASE-arm entailment work. An ELSE-selected CASE derives
nothing today, because arms fail on FALSE *or* NULL — 3VL — and the kernel has
no disjunctive fact to carry "one of these arms was taken". Recorded where the
mechanism is, in `docs/nullability-walk.md` and the `check-generated-arm-*`
fixtures.

### 2b. Five sqlc upstream tickets, written and not filed

`tests/unit/query/sqlc-corpus/tickets/T1–T5.md`. The disagreement register is
adjudicated and executable — all 40 per-column disagreements settled by data
that re-runs, 0 pgsid unsoundness, 0 pgsid imprecision, 16 ticket-ready.
Filing them is an upstream contribution, not engine work, and nothing here
waits on it.

**Trigger.** Whenever someone wants to spend the time upstream.

### 3. The precision residue — 666 unwitnessed nullable claims

The generated soundness instrument measures this and prints it under
`WITNESS_REPORT=1`:

```
WITNESS_REPORT=1 pnpm exec vitest run tests/unit/query/generated/generated-soundness.test.ts
```

Across 14,964 queries, 32,419 nullable output claims are made and **31,753 are
witnessed (98%)**. The 666 that are not are places the engine says "could be
null" where nothing in the corpus can show it — either engine imprecision (the
claim can flip to notNull) or a structural property of the shape. Six buckets:

| unwitnessed | bucket | disposition |
|---:|---|---|
| 300/738 | `proj=fn-agg-window \| col=a_fa` | **open** — a user aggregate's sfunc is opaque to `NON_NULL_OVER_NONEMPTY_AGGREGATES`, which is a curated set of builtins |
| 240/738 | `proj=fn-call \| col=a_fv` | permanent — the body is a `nullif`, nullable by construction so the claim has a witness elsewhere |
| 96/498 | `proj=case-nullif \| col=a_case` | permanent — row geometry, `geometry` note |
| 28/526 | `proj=plain \| col=a_tb` | permanent — every unnest field reads nullable |
| 1/1 | `proj=case \| col=r_ce` | permanent — written-value tracking carries non-nullness, not value |
| 1/6 | `proj=plain \| col=r_snm` | permanent — the source row carries an unbound `$1` |

**The triage is done and gated** — this item said otherwise until 2026-08-22,
which is what the blame-file discipline was built to stop. Every one is
classified by an `UNWITNESSABLE` rule in `generated-soundness.test.ts`, and
three gates hold it: an unclassified claim fails, a rule matching nothing fails
as stale, and a rule blaming a MECHANISM must name a `<label>.blame.sql`
fixture that executes it (or carry a `geometry` note saying no statement
isolates its reason).

That third gate is the one the first two cannot substitute for: an expired
REASON leaves the outcome exactly where it was, so the claim stays unwitnessed,
the rule keeps matching, and the suite stays green over a cause that has been
false for weeks. Writing the seven blame files found **three of eight reasons
rotten**:

| rule | blamed | measured |
|---|---|---|
| a_fi | name-level dispatch can't narrow `upper` | typed dispatch narrows it and reaches `$n` bodies; it did not reach a parameter by NAME — **closed, see below** |
| a_fv | `resolveFunctionCandidates` refuses VARIADIC | a resolved call never enters the consensus branch; the body's `nullif` is the cause, so lifting the refusal would move nothing |
| r_snm | the MERGE source is optional unconditionally | `joinState = REQUIRED` with no BY SOURCE arm; the cause is `$1` |

**a_fi closed 2026-08-22** (`body-builtin-parameter-by-name.sql`): a body's
parameter referenced by NAME now carries its declared type into signature
dispatch, the way `$n` already did. 240 claims flipped to notNull, all executed
against PostgreSQL, none falsified. The rule and its blame file retired.

So the one open precision bucket is **a_fa (300)**. The other 366 are recorded
as permanent, each with an executable reason.

Not the parameter side, which this item also misread. **2724 nullable argument
claims, 0 falsified** is 2724 confirmations, not a residue: for an argument,
`nullable` means "NULL is a safe binding", and a run that binds NULL without
raising *is* the witness. The direction that needs witnessing is the
over-restrictive one, and it is gated — 1848 notNull argument claims, 1848
witnessed by an actual null-rejection.

The **98 `@unwitnessable` reasons in the hand corpus** carry the same rot risk
and are not yet wired to blame files. That is the obvious next pass and it is
not done.

### 4. Known imprecision residue

Each row is either correct-and-permanent or closable. The three marked
closable are the only precision items here with a known route.

| Construct | Current | Note |
|---|---|---|
| `A_Indirection` element / field / jsonb subscripts | nullable — correctly | out-of-range elements and missing jsonb keys ARE NULL; composite fields carry no constraints. SLICES are closed — they clamp rather than NULL (`array-slices.sql`) |
| `JSON_VALUE` / `JSON_QUERY`, `JSON_ARRAY(subquery)`, `XmlExpr` beyond `XMLELEMENT` | nullable — correctly, permanently | a FOUND JSON null maps to SQL NULL through every ON EMPTY/ON ERROR combination, so no clause analysis can prove these; `JSON_ARRAY(SELECT …)` over an empty subquery is NULL; `xmlconcat`/`xmlforest` of NULLs are NULL. `JSON_EXISTS` is the one provable member and is closed |
| Non-strict scalar and `LANGUAGE plpgsql` functions | nullable | bodies are not statically analysable; a NOT NULL domain return is the escape hatch |
| `pg_catalog` builtins outside the totality tables | nullable | totality has no catalog flag and cannot be proven by sampling (`array_length` of an empty array), so the tables stay curated, each entry measured on admission |
| Custom operators backed by unanalysable functions | nullable results | the operator machinery is built; what stays conservative is the output side when the backing function is plpgsql or has multiple candidates |
| MERGE with mixed arm kinds | condition not row-implied | the join condition promotes only when EVERY arm is MATCHED-kind — a NOT MATCHED arm fires precisely on the condition's failure. Per-arm reasoning judged not worth it |
| CHECK entailment, conservative edges | nullable | parameters never match (identity needs the literal token; permanent for a per-statement contract), and origin consumption is gated as designed |
| Presence groups | none recorded | every launch and post-launch residue closed 2026-08-04; future entries come from consumer corpora |
| Base-table alias column list | ignored — sound | `FROM t AS z(p, o, r, s)` renames positionally for subqueries, VALUES and table functions, not for a RangeVar. Positionally correct flags, so diagnostic only — **closable** |
| NOT NULL domain column at a REQUIRED entry | nullable — sound | `attnotnull` stays false for a domain-constrained column, yet the domain rejects every write. `isNotNullDomain` + `resolveColumnTypeOid` are already in the catalog interface; closing would also admit such columns as presence-group discriminants — **closable** |
| Boolean literals in CHECK expressions | not atoms — sound | `CHECK (false OR x IS NOT NULL)` is stored verbatim (no constant folding) and the kernel does not read the `false` disjunct as FALSE. Inside the propositional charter's atom gates — **closable, if ever worth it** |

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

Recorded, not scheduled. `postgres-pglite/src/test/regress/sql` — 232 files,
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
