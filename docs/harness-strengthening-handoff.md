# Harness strengthening — implementation handoff

Written 2026-08-24. Four independent instruments for the nullability-walk test
harness. Each targets a defect class that actually occurred; none touches the
engine's inference logic. The semantic re-founding (`docs/deferred-tasks.md`
§8) is explicitly OUT of scope for this work.

Line numbers in this document were read on 2026-08-24 and may drift; the file
paths and mechanism names are the stable references. **Re-derive any
behaviour claim before building on it** — that rule is the project's own
(`docs/deferred-tasks.md`, "What rots here, measured").

## Ground rules (read before starting)

- Work from `pgsid/`, not the workspace root. `pnpm` only — `npm install`
  fails here, and `npx` resets the cwd (recorded trap).
- Read `tests/unit/query/AGENTS.md` first and follow its rules, especially:
  rule 1 (a spotted imprecision becomes an `it.fails` RED test, then a fix,
  then a graduated fixture — never a note), rule 2 (reach is not the metric;
  correctness is), rule 3 (mutate every gate you add — a gate whose mutation
  kills nothing is not a gate).
- PGlite is the referee, never the PostgreSQL docs. Every new claim a test
  asserts must be adjudicated against the database before it is written down.
- The suites run with `npx vitest run` from `pgsid/` (vitest 3, PGlite
  in-process — no docker). Fixture directive grammar is in
  `tests/unit/query/fixture-args.ts`.
- Pin by NAME, never by count — a compensating swap must not be able to hide
  behind a stable total (the style of `sqlc-corpus.test.ts`'s registers).

## Why these four

The walk's verification is strong on soundness (execution oracle, witness
discipline, EXPLAIN oracle, adversarial sweeps — inventory in
`docs/witness-coverage.md`) but its residual defect classes are structural:

1. **Fallback blindness.** On 2026-08-24 two UNSOUND claims were found
   (`docs/deferred-tasks.md` §4, the two "NAME-LEVEL … over UNREADABLE
   operand types" rows): a name-level total claim (`+` over `path`) and a
   name-level strict claim (`||` over arrays). Both fired at fallback
   branches that run precisely when operand types are unreadable, and the
   generated corpus could not have caught either — its schema vocabulary was
   shaped by the same assumption that created the hole ("no application
   schema has a path column", so the generator had none). The corpus and the
   walk shared a blind spot.
2. **Crossing losses.** The August bug run included: origins dying at UNION,
   the CTE re-export reading unable to type computed columns, an alias
   column list honoured by four of its five consumers. Same shape every
   time: the fact existed, a representation crossing dropped it. The
   execution oracle is structurally unable to see these — it is one-sided
   (it can falsify `notNull`, it can never detect a lost guarantee;
   `docs/query-generator.md` states this).
3. **Corpus vocabulary bound.** `docs/catalog-driven-generation.md`: across
   ~15k generated queries the corpus references six real relations out of 82
   in the fixture schema; 500,000 random queries produced zero findings
   while hand probes kept producing them. "The corpus cannot express what
   its vocabulary lacks."
4. **Position, not age.** Sweep 4's conclusion (`docs/deferred-tasks.md`,
   "Decided against", sweeps entry): defects cluster in FROM items, where
   the model of "what rows does this produce" is thinnest.

---

## Item 1 — Fallback census

**Claim to make testable:** every site where the walk concludes something
from a NAME, SHAPE, or CURATED TABLE — because richer information (operand
types, catalog metadata) was unreadable — is reached by at least one corpus
input through the unreadable path.

**Template:** the two existing censuses, which are the house style for this:
`tests/unit/query/node-census.test.ts` (every observed node type classified,
both directions) and `tests/unit/query/catalog-census.test.ts` (every
`handled` feature names an accessor the corpus actually asks; every
`conservative` feature really is unread).

**What to build:**

1. Enumerate the fallback inventory. Known members (verify and complete the
   list by reading the code — do not trust this document's enumeration):
   - `TOTAL_OPERATORS` / `STRICT_OPERATORS` name-level claims and their
     escape rows `PARTIAL_OVERLOADS` / `NON_STRICT_OVERLOADS`
     (`src/query/operators.ts`).
   - The three curated builtin tables in
     `src/query/builtin-totality-tables.ts` (`STRICT_TOTAL_BUILTINS`,
     `ALWAYS_NOT_NULL_BUILTINS`, `FIRST_ARG_BUILTINS`).
   - The overload-consensus fallbacks in the FuncCall dispatch
     (`nullability-walk.ts`, priority ladder ~`:11898`) and the mirrored one
     in `param-nullability.ts` (~`:565`).
   - Any other branch that answers when `operandTypeSet` /
     `renderedTypeOfExpr` / metadata resolution returns null. Grep for the
     fallback pattern rather than assuming these are all.
2. For each inventory entry, the census asserts a corpus input (hand fixture
   or generated axis tuple) **reaches that entry through the
   information-missing path** — not merely a query that uses the operator
   with readable types. Reaching typically means: the operand behind a set
   operation, CTE, or `unknown`-typed spelling, per the two 2026-08-24
   fixtures (`name-level-partial-overload.sql`,
   `non-strict-overload-promotion.sql` — read both before starting; they are
   the exemplars).
3. Feed the schema from the tables, not from intuition: for every
   `PARTIAL_OVERLOADS` row a column of the partial type (the corpus gained
   its first `path` columns this way — after the bug); for every
   `NON_STRICT_OVERLOADS` row a NULLABLE column of the relevant type. The
   generated corpus already has a schema axis
   (`tests/unit/query/generated/schema-variants.ts`) — extend it rather than
   inventing a second mechanism.
4. Both directions, like the existing censuses: an inventory entry with no
   reaching input fails; a reaching input whose inventory entry no longer
   exists fails (so the census cannot rot when a fallback is removed).

**Instrumentation:** the walk already has a spy pattern —
`tests/unit/query/catalog-spy.ts` instruments catalog accessors for
`capability-reach.test.ts`. Follow that pattern (wrap/observe from the test
side). If reaching a fallback cannot be observed without touching engine
source, STOP and ask the maintainer before adding any hook to
`nullability-walk.ts` — engine changes are not authorized by this handoff.

**Acceptance:** census suite green with a complete inventory; at least one
previously-unreached fallback found and covered (if every fallback turns out
already reached, say so explicitly with the evidence — do not pad); mutation
check per AGENTS.md rule 3 (e.g. remove one reaching query, census must go
red naming the entry).

## Item 2 — Decision-site reach

**Claim to make testable:** every verdict rung in the walk actually fires on
the corpus, in both verdict directions where it has two.

**Template:** `tests/unit/query/generated/capability-reach.test.ts` — it
holds a both-directions floor over catalog ACCESSORS (a capability going
cold is a regression; one going warm undeclared is drift, and every cold
entry must name a triaged fixture that really reaches it). This item is the
same instrument one level up: over the walk's DECISION rungs instead of its
catalog reads.

**What to build:**

1. A rung inventory: the rung ladder in `computeColumnNullabilityTraced`
   (~`:9486`), the FuncCall priority ladder (~`:11898`), the `A_Expr` kind
   dispatch (~`:9032`), the SubLink dispatch (~`:11207`), the presence
   fixpoint's seven inner rules (~`:2797`), the guard channels. The traced
   walk already emits `trace.conclude(decision, reason)` at verdict sites
   (~333 trace call sites; `ITrace` at ~`:584`) — **the trace reasons are
   the natural rung identifiers**, so this likely needs no engine changes at
   all: run the corpus under `inferNullabilityTraced`, collect `reason`
   strings, and hold floors over the observed set.
2. Report per rung: fired / never fired / fired with only one outcome.
   Floors both directions: a rung going cold fails; a reason string
   appearing that the inventory doesn't know fails (this doubles as a
   tripwire for new rules landing without corpus reach).
3. Never-fired and one-outcome rungs get the capability-reach treatment: a
   triage entry naming either a fixture that reaches it or a recorded reason
   it cannot be reached (and per the project's rule, a *cannot* in a reason
   is the claim to re-test).

**Acceptance:** the census runs in the standard suite without meaningful
wall-clock cost (reuse an existing corpus pass if possible — piggyback on
the generated-soundness run rather than re-analyzing everything); the
dark-rung list is empty or fully triaged by name; mutation check (delete a
reaching fixture locally → red naming the rung).

## Item 3 — Wrap-invariance suite

**Claim to make testable:** a verdict must not WEAKEN when a query is
embedded in a semantics-preserving wrapper. For every annotated fixture
whose statement is a plain SELECT, wrap it and assert that pass-through
columns keep their claims.

Wrappers, in order of implementation:
1. Subselect: `SELECT * FROM (<fixture>) w` — verdicts must be identical
   per column.
2. CTE: `WITH w AS (<fixture>) SELECT * FROM w` — identical.
3. View: register the fixture body as a view in a schema variant and select
   from it — identical (this is where the alias-list and view-path consumers
   get exercised).

**Decided-against caveat — handle this first.** `docs/deferred-tasks.md`
("Decided against") rejects "mutating existing queries as a way to generate
new ones". That entry rejects mutation as a COVERAGE GENERATOR ("buys no
validity for free… bounded by the shapes the corpus already contains"). This
suite is a different instrument with new information behind it:

- The oracle is the engine's own monotonicity across a representation
  crossing, not execution — it detects PRECISION LOSS, which the execution
  oracle is one-sided against and which no existing suite checks.
- Blind wrapping preserves validity trivially, so the entry's validity
  argument does not apply.
- The new information is the August crossing-loss bug class (origins at
  UNION, CTE re-export typing, alias-list fifth consumer): every one is
  wrap-variance, and every one postdates the decided-against entry.

Per project convention, record this re-opening argument as an amendment
under that entry in `docs/deferred-tasks.md` in the same commit that lands
the suite. If the maintainer disagrees with the re-opening, this item is
dropped — ask before building if in doubt.

**Design constraints:**

- Assert per column by POSITION, comparing wrapped vs unwrapped engine
  output directly — do not duplicate the annotation files.
- Expect and allowlist principled exceptions BY NAME with a recorded
  reason. Known candidates: constructs where a crossing legitimately erases
  a guarantee (e.g. origins are documented to die at grouping, set
  operations, VALUES, DML RETURNING — `docs/nullability-walk.md`, origin
  tracking). An allowlist entry is a claim; adjudicate each against the
  engine's documented semantics, and treat a growing allowlist as the
  finding, not as noise.
- Fixtures with `@args`, DML statements, and statements the wrapper would
  make invalid are skipped with a counted, named skip list (no silent
  truncation).
- Start with wrapper 1 only, measure the failure crop, and report before
  building wrappers 2–3. A large crop on wrapper 1 is itself the deliverable
  (each failure is an imprecision → AGENTS.md rule 1: capture as RED,
  fix, graduate).

**Acceptance:** wrapper 1 running over the fixture corpus; every
divergence either fixed (RED-test workflow) or allowlisted by name with an
adjudicated reason; the suite fails on any NEW divergence.

## Item 4 — PostgreSQL regression suite as a borrowed corpus

This is deferred item 7 in `docs/deferred-tasks.md` — already scoped there;
this handoff just pulls the trigger. Read that entry first. Summary: 232
stateful `.sql` scripts at `pglite/postgres-pglite/src/test/regress/sql`
(verified 2026-08-23; PostgreSQL License). The prize is SYNTAX coverage —
refusal-census and shape-oracle reach over the engine authors' own corpus —
not nullability depth. Sweep 4 found defects cluster in FROM-item shape,
which is exactly what this corpus stresses.

**What to build:**

1. A replay harness in the style of `tests/unit/query/sqlc-corpus.ts`
   (vendored corpus, pinned provenance, PostgreSQL as the judge): treat each
   file as a continuous migration, execute statements in order against
   PGlite, and intercept each SELECT/DML: run the engine's analysis against
   the accumulated schema state, and hold the sqlc-corpus suite's bars —
   PREPARE accepts, no engine crash, `UnsupportedNodeError` refusals counted
   and pinned by name, column list matches PostgreSQL's by ordered name.
2. No nullability assertions in the first pass — shape and refusal only.
   Witnessing against regression-suite data is a later, separate decision.
3. Expect breakage in the plumbing, not the engine: PGlite quirks (some
   backends can be POISONED by certain expressions — see
   `tests/probe/poison-hunt.ts`; `statement_timeout` does not fire — use
   `tests/unit/query/killable-evaluator.ts`), and files that need superuser
   or unavailable extensions. Skip whole files by name with a reason;
   pin the counts.

**Acceptance:** a pinned census (files replayed / skipped-by-name /
statements analyzed / refusals by node type / shape mismatches). Every shape
mismatch is a finding — triage each (engine defect vs harness defect) before
closing the item.

## Order and sizing

| Item | Depends on | Rough size | Note |
|---|---|---|---|
| 1. Fallback census | — | days | highest defect-yield expectation (its class produced the only two 2026-08 unsoundnesses) |
| 2. Decision-site reach | — | days | likely zero engine changes (trace reasons) |
| 3. Wrap-invariance | re-open note in deferred-tasks.md | days for wrapper 1, then re-scope | failure crop is the deliverable |
| 4. Regression corpus | — | the largest; plumbing-heavy | shape/refusal only in the first pass |

Items are independent; 1 and 2 first. After any item lands, update
`docs/witness-coverage.md`'s oracle inventory — that document is the map
the next reader trusts.
