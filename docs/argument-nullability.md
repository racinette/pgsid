# Argument nullability

## What this document is

The design for the input half of the engine's contract: what can be said about
the query parameters (`$1`, `$2`, …) a statement takes, to the same standard
the engine holds for output columns. Read `docs/nullability-walk.md` first for
how the output analysis works; this document leans on its machinery and its
vocabulary throughout.

The work was previously item 1 ("Argument typing") in `docs/deferred-tasks.md`
and is removed from that register because it is being taken on.

## What is being claimed, and what deliberately is not

Per parameter, one boolean, mirroring `OutputNullability`:

- **`notNull`** — binding NULL to this parameter can make the statement
  raise. A caller must not pass NULL.
- **nullable** — NULL is a universally safe binding: no data state, no guard,
  no path makes it raise. Whether it is a *useful* binding is not addressed.

The second half of that sentence is a decision, recorded here so it is not
re-litigated: **the engine models what PostgreSQL does, not what a caller
ought to do.** `SELECT * FROM u WHERE email = $1` with `$1` NULL executes
cleanly and returns zero rows — pointless, but legal, and PostgreSQL's
willingness to run it is the whole story. A "NULL is never useful here"
analysis (the predicate is strict, so a NULL argument dead-ends the query) was
considered and rejected from this contract: it is a lint about caller intent,
not a fact about PostgreSQL behaviour, and folding it into `notNull` would
break the deliberate optional-filter idiom `WHERE ($1 IS NULL OR email = $1)`
that PostgreSQL supports without complaint.

Types are likewise not inferred, at all. `PREPARE` hands the consumer
authoritative parameter types, and a reimplementation of PostgreSQL's type
resolution would be a version-drifting liability producing something the
consumer already holds. The analysis needs *targeted* catalog lookups — is
this cast target a NOT NULL domain, is this INSERT column NOT NULL, what are
this function's declared argument types — and nothing more.

Parameter numbering needs no modelling either: PostgreSQL rejects a statement
whose parameters have gaps (`SELECT $2` fails at parse analysis with "could
not determine data type of parameter $1"), so the contract is a dense
positional array `$1..$n` for any statement PostgreSQL accepts.

## The two mechanisms, measured

Everything below was measured against PGlite (PostgreSQL 18) on 2026-07-31,
with `CREATE DOMAIN uname AS text NOT NULL`, a table `d (n uname)`, a table
`plain (e text NOT NULL)`, an empty table `empty_t`, and a function
`takes_dom(v uname)`. The implementation must pin these behaviours as an
executable test the way `deparser-roundtrip.test.ts` pins the deparser table —
they are load-bearing for the design, and a PostgreSQL upgrade should fail
loudly if it moves them.

**Mechanism A — bind-time rejection.** When parse analysis resolves a
parameter's *type* to a NOT NULL domain, binding NULL raises before anything
executes. No guard, no empty table, no unreached branch prevents it:

| statement, `$1` bound to NULL | parameter type | result |
|---|---|---|
| `SELECT $1::uname` | `uname` | raises |
| `SELECT CASE WHEN false THEN $1::uname ELSE 'x' END` | `uname` | **raises** — the guard does not protect it |
| `SELECT $1::uname FROM empty_t` | `uname` | **raises** — zero rows do not protect it |
| `SELECT takes_dom($1)` | `uname` | raises |
| `INSERT INTO d VALUES ($1)` | `uname` | raises |
| `INSERT INTO d SELECT $1 FROM empty_t` | `uname` | **raises** — even though no row would be inserted |
| `UPDATE d SET n = $1` | `uname` | raises |
| `SELECT $1::uname, $1 \|\| 'x'` | `uname` | raises — the domain-typed use types the parameter, and the operator operand deduces nothing of its own |

The channels that produce a domain-typed parameter: a cast whose operand is
the parameter itself, a function argument whose declared type is the domain,
and assignment into a domain-typed column (directly or through the select
list of `INSERT … SELECT`).

**Mechanism B — execution-time rejection.** A plain NOT NULL *column
constraint* leaves the parameter base-typed; NULL binds fine and the check
fires per row actually written:

| statement, `$1` bound to NULL | parameter type | result |
|---|---|---|
| `INSERT INTO plain VALUES ($1)` | `text` | raises (a `VALUES` row is always constructed) |
| `INSERT INTO plain SELECT $1 FROM empty_t` | `text` | **succeeds**, zero rows |

**Non-mechanism — comparison.** `SELECT * FROM d WHERE n = $1` with NULL
executes cleanly and returns zero rows, and the parameter's type is `text`:
PostgreSQL resolves operators on the domain's *base* type, so the domain
constraint is never consulted. A comparison position never rejects, whatever
the column's constraints say.

**Two deduction boundaries, found by the fixture suite's PREPARE gate and
pinned alongside the mechanisms.** Unification is not conflict-resolution: a
use that deduces its own type makes PostgreSQL reject the statement rather
than let the domain win (`SELECT $1, $1::uname` fails with "inconsistent
types deduced" — a bare projection deduces text). And deduction is
first-use-ordered: `WHERE $1 IS NULL OR col = $1` fails with "could not
determine data type", while the reversed disjunction prepares fine. Neither
changes the contract — a rejected statement has no contract — but both
constrain what fixtures and the generator may emit.

## Claim semantics, and a symmetry worth writing down

Mechanism B makes `notNull` data-dependent, which forces precision about what
each claim quantifies over:

- **`notNull` is existential**: there is an execution in which NULL raises.
  (For mechanism A it is in fact universal — it always raises — but the
  consumer-facing meaning does not change: do not pass NULL.)
- **nullable is universal**: NULL never raises, anywhere.

This is the output side's structure with the polarity flipped. Output
`notNull` is universal (no row ever contains NULL) and execution can only
falsify it; output nullable is existential and execution can only witness it.
So the verification machinery transfers wholesale, mirrored:

| claim | quantifier | execution can… | analogue |
|---|---|---|---|
| output `notNull` | universal | falsify | input nullable |
| output nullable | existential | witness | input `notNull` |

Concretely: a claimed-nullable parameter is checked by binding NULL (others
held valid) — any raise, in any data state, falsifies it. A claimed-`notNull`
parameter is checked by binding NULL and requiring the raise to be *observed*
in at least one state — mechanism-A claims raise even under `empty`;
mechanism-B claims need a state that routes a row into the target, exactly the
way `@no-rows` fixtures must observe their declared refusal rather than be
taken on faith. An unwitnessed `notNull` is the input side's version of an
unwitnessed nullable output, and is held to the same standard: witnessed, or
its unwitnessability recorded explicitly.

Both directions of the contract are therefore executable against PostgreSQL —
a stronger oracle than the output side has ever had.

## The algorithm

**Collection happens in the walk, not a post-pass.** By the time the walk has
finished, "this `ParamRef` was a cast operand / a declared-domain function
argument / an assignment source for column k" is gone — and the walk already
holds the catalog facts each channel needs (it consults NOT NULL domains for
output casts and function returns today; the input direction reads the same
entries). The walk emits per-site facts; a fold afterwards reduces them to the
per-parameter contract.

Per site, the walk records a rejection when:

1. **[A] the parameter is the direct operand of a cast to a NOT NULL
   domain.** Direct matters: in `($1 || 'x')::uname` the parameter is typed
   `text` and the cast applies to the concatenation's result — a different
   situation (see deferred, below).
2. **[A] the parameter is an argument in a function call whose declared
   parameter type at that position is a NOT NULL domain.** Requires declared
   argument types in the catalog's `FunctionInfo`; extend the adapter if they
   are not yet carried through.
3. **[A] the parameter is assigned to a domain-typed NOT NULL column** — an
   `INSERT` VALUES/SELECT position or an `UPDATE SET`, mapped to its target
   column, which the walk already does for `RETURNING` analysis.
4. **[B] the parameter is assigned to a plain NOT NULL column** in the same
   positions.

**The fold, and multiple occurrences.** The same `$n` may appear anywhere any
number of times. One rejecting site makes the parameter `notNull` — measured
above: a single domain-typed use decides the parameter's type for every use,
and no other site can un-raise a raise. Everything else is nullable. There is
no guard analysis on the input side at all: mechanism A was measured to be
guard-immune, and mechanism B's sites (DML targets) cannot be guarded. This
makes the fold strictly simpler than the output walk's expression analysis —
a union of per-site verdicts.

**Order of analyses: arguments first.** The dependency between the two halves
runs one way. No argument fact depends on output nullability; but output
claims can consume argument facts, and the walk computes them first for
exactly that reason.

**Mechanism-A narrowing (implemented).** A parameter whose resolved type is a
NOT NULL domain rejects NULL at Bind, before any execution — so any row the
statement returns proves that parameter was non-NULL, and a projected
`ParamRef` for it is `notNull`. The same rows-exist reasoning that lets a
`@no-rows` refusal guard a claim. The collector exposes the mechanism-A
subset separately (`ParamFacts.bindRejected`) because mechanism B does NOT
license this: a B-site raises per row written, and a statement can return
rows without the writing path ever seeing one — `WITH w AS (INSERT INTO
plain SELECT $1 FROM empty_src RETURNING e) SELECT $1 FROM t` succeeds with
NULL bound and returns rows. Fixtures: `param-multi-use` (`$1 || 'x'` is
notNull), `param-fn-domain-arg` (the inlined body echoes a proven-non-null
argument).

**Source value-flow attribution (implemented).** `forcedNullParams` resolves
a derived-table column to its DEFINING EXPRESSIONS and recurses: alias →
column → definitions, for MERGE `USING` sources, `INSERT … SELECT` derived
tables, `UPDATE … FROM`, and ON CONFLICT's `excluded` pseudo-alias — whose
columns are simply the proposed row's expressions, so `SET val =
EXCLUDED.name` with `name` bound to `$2` rejects `$2` (case-folded like
every identifier; attribution composes through strict operators). The
reduction over a multi-row source carries the caller's quantifier — the
UNIVERSAL face (intersection) for WHERE-narrowing, where one unforced row
can smuggle a NULL past the conjunct (`param-narrow-multirow.sql`), and the
EXISTENTIAL face (union) for the contract's rejecting sites, where one
forced row reaching the site is enough to raise
(`param-merge-source-multirow.sql`). Trigger fixtures:
`param-merge-source.sql`, `param-insert-source.sql`,
`param-onconflict-excluded.sql`, and the two quantifier pins above.

**The overload hazard, and its Wave-5 resolution.** Which overload of
`f($1)` PostgreSQL executes depends on the argument types *it* resolves, so
consulting a different overload than PostgreSQL picked could read the wrong
declared types — a path to unsoundness. The original rule (refuse any
ambiguous name) is now refined without ever guessing: **arity filtering**
keeps only the candidates a call with that many arguments could resolve to
(PostgreSQL never picks one that cannot accept them; variadic and named
notation still refuse), and **consensus** concludes only what EVERY
remaining candidate agrees on — all strict for the closures, a position all
declare as a NOT NULL domain for mechanism A (`param-overload-arity.sql`:
two `ship` overloads, a one-argument call, $1 rejected at Bind).
Disagreeing candidates stay conservative, pinned by `over_fn`. Full
type-based resolution remains rejected — it is a reimplementation of
PostgreSQL's coercion rules, the simulation category ruled out three times
now.

**Mechanism C — value-flow rejection (implemented).** The third mechanism,
found by hand as the exact trigger the first version of this document
predicted: in `INSERT … RETURNING ($2 || '!')::nn_text`, the parameter stays
typed `text`, but its VALUE — forced NULL through the strict concatenation —
hits the runtime domain coercion and raises. Execution-time like B (zero
evaluations, zero raises: the same statement over an empty source succeeds
with NULL bound), so C claims are existential and never license narrowing.
Attribution asks "which `$n` being NULL forces this expression NULL?" and
counts only guaranteed propagation: strict operators (`operators.ts`, shared
with the output walk — every entry is both total and strict), `NULLIF`'s
left operand only, `COALESCE` by intersection of its branches, casts
transparently, strict single-overload catalog functions by union. Anything
unrecognised attributes nothing, and the falsification oracle keeps that
honest. Channels: expression casts to NOT NULL domains, domain-typed
function arguments, and rejecting DML target columns (both the domain and
plain-constraint flavours). Measured behaviours — including the
COALESCE-absorption and NULLIF-asymmetry boundaries — are pinned in
`param-mechanism.test.ts`; the trigger statement is `param-value-flow.sql`;
the generated `param-reject` projection carries the shape across the whole
structural space.

**WHERE-conjunct narrowing (implemented).** In `SELECT $1 AS x FROM t WHERE
t.a = $1`, any returned row passed the WHERE, a strict comparison is only
TRUE with non-null operands, so `x` is notNull for every row that exists —
while the ARGUMENT stays nullable: NULL is a legal binding that simply
returns nothing. The parameter mirror of the column WHERE-promotion the walk
already had, built on `forcedNullParams` and the shared strict-operator set,
with three boundaries each carried by a fixture or generated negative:

- *Conjuncts, and disjunctions by intersection.* NOT guarantees nothing; an
  OR narrows only when EVERY arm proves the parameter — whichever arm was
  TRUE could not have been TRUE with it NULL. The optional-filter idiom
  stays legal by exactly that rule: its `$1 IS NULL` arm proves nothing, so
  the intersection is empty (`param-optional-filter`). Qualifying shapes:
  strict comparisons, `= ANY`/`ALL`, `BETWEEN [SYMMETRIC]`, `IN` (tested
  value only — `x IN ($1, 5)` is TRUE via 5), `IS NOT NULL` — with operands
  attributed through the shared strict closure (`forcedNullParams`, now
  including the measured `STRICT_BUILTIN_FUNCTIONS` set).
- *Rows must imply the predicate.* An ungrouped aggregate query (or empty
  grouping sets) emits its row over ZERO input rows — `SELECT $1, count(*) …
  WHERE val = $1` returns `[NULL, 0]` — so WHERE and ON-qual narrowing are
  gated on `rowsImplyWhere` (`param-where-agg-norows` is the live trap).
  Plain GROUP BY qualifies via the non-empty-groups guarantee. HAVING is
  exempt from the gate: even the zero-input row must pass HAVING to be
  emitted (`having-narrowing.sql`).
- *Current scope only.* Subquery/CTE/view analyses are memoized by node
  identity, so guarantees never travel the outer chain — a context-dependent
  result would leak across references.
- *The formerly recorded extensions, all taken (Wave 1):* INNER `ON` and
  outer-join quals proven held by the presence fixpoint
  (`resolveJoinImplications` in the walk; `join-on-promotion.sql`), HAVING
  conjuncts (`having-narrowing.sql`), and the DML WHERE channel — UPDATE and
  DELETE RETURNING scopes now carry their whereClause with
  `rowsImplyWhere = true` (every RETURNING row is an affected row, and
  RETURNING cannot contain aggregates). Parameters narrow unconditionally
  there; COLUMN promotion applies to FROM/USING relations and non-SET target
  columns (old row = new row for those), while SET columns are masked —
  `update-set-mask.sql` is the live counterexample that forces the mask.
  MERGE joined in Wave 4, arm-aware: the join condition is row-implied
  (narrowing included) exactly when EVERY arm is MATCHED-kind — a NOT
  MATCHED arm fires precisely on the condition's failure, so mixed
  statements keep it dark.

**Deferred, recorded so the boundary is deliberate:**

- *The deadness lint*, decided against for the contract; if it ever exists it
  is a separate diagnostics channel, not a nullability fact.

## API shape

A second positional array alongside the existing one, produced by the same
walk over the same tree:

```ts
interface ParamNullability {
  /** 1-based parameter number; the array is dense $1..$n. */
  number: number;
  /** Binding NULL can make the statement raise. */
  notNull: boolean;
}
```

`inferNullability`'s existing signature stays; a new entry point returns both
halves. Naming and whether the old entry point becomes a thin wrapper are
implementation decisions, with one constraint: the two arrays must come from
one traversal, so they can never disagree about which statement they describe.

## Sequencing

Agreed order of work, each stage giving the next something real to test:

1. **Engine-side argument treatment** — this document. Includes the
   mechanism-pinning test, the fixture-format extension for expected
   argument contracts (an `-- @param 1 notNull`-style annotation next to the
   existing output annotations), and the overload-resolution audit described
   above.
2. **Argument generation in the test machinery** — built:
   `tests/unit/query/param-soundness.test.ts`. Per-parameter NULL bindings
   derived from the `@param` claims, run state-major over every data state;
   both verification directions from "Claim semantics" above, with an
   all-valid control run per state so a failure the control shares is never
   attributed to NULL. Bindings go through the real protocol Bind step —
   mechanism A lives there; a substituted `NULL` literal exercises constant
   coercion, a related but different code path — with literal substitution
   as the per-statement fallback when a deduction failure shows the protocol
   cannot type it (no current fixture needs the fallback). An unwitnessed
   `notNull` is a hard failure, not a ratchet, until a fixture exists that
   legitimately cannot witness its raise.
3. **Parameters in the generated SELECT pipeline** — built: two projection-axis
   entries in `tests/unit/query/generated/generator.ts` (`param-mix`:
   parameters in COALESCE and in a WHERE disjunction with `$n IS NULL`, both
   nullable; `param-reject`: a mechanism-A domain cast, notNull), each
   crafted deduction-safe per the boundaries above and carrying valid
   control values. The generated suite runs the all-valid control binding
   through the output oracle, then per-parameter NULL variants through the
   two-sided argument oracle — no annotations anywhere, PostgreSQL is the
   answer key in both directions, and a deduction failure counts as a
   generator defect rather than falling back to literals.
4. **Generated DML** — built: `generateDmlQueries()` in the generator, four
   kinds (`insert-values` with both channels through the written values;
   `update-from` running the join axis inside DML scope semantics against
   target `v`; `insert-select` over every join structure as the source;
   `dml-cte` — `INSERT … RETURNING` in a CTE recombined with the join axis).
   All executions BEGIN/ROLLBACK-wrapped via the `writes` flag; parameters
   are the written values, so constraint collisions are a binding choice
   rather than a literal-crafting problem. First run: zero rejections, zero
   refusals, zero violations — the engine's DML support survived the space.
   `ON CONFLICT` joined later (the `oc-*` kinds over the `ck` conflict
   table, seeded in `sparse` so the DO UPDATE arm fires in some states and
   not others): the conditional mechanism-B site is witnessed only where the
   arm fires, the domain-typed SET rejects at Bind arm-or-no-arm with its
   narrowing intact through the arm, and DO NOTHING contributes the
   returns-no-row-on-conflict liveness shape. `delete-using` mirrors
   `update-from` without assignment channels; its projected parameter pins
   the deliberate absence of WHERE-conjunct narrowing in DML RETURNING (a
   live trap for the recorded param-only extension). `merge-*` closes the
   surface: arm combinations (UPDATE/INSERT/DELETE/DO NOTHING/BY SOURCE,
   `WHEN … AND` conditions) over grouped sources — grouping is load-bearing,
   since MERGE refuses a source acting on a target row twice — with
   conditional-B witnessed where arms fire, mechanism A arm-immune (pinned),
   and `merge_action()` classified (a dedicated `MergeSupportFunc` node,
   conservative). Parameters in sources are attributed (`merge-src-param`
   and the trigger fixtures); the multi-row ∃-residual was closed by the
   quantifier split ("Source value-flow attribution" above).
5. **Parameter placement** — built: `generateParamPlacementQueries()`.
   Positions the corpus otherwise never used, each measured against PGlite
   before generation and crossed with the wrapper axis: a strict ON conjunct
   with the parameter projected bare (ON-conjunct narrowing is the recorded
   not-taken extension, so the projection is a live-trap unwitnessable —
   refiltered under INNER, witnessed through the outer join kinds); the
   mechanism-A cast inside the ON qual (bind rejection is position-blind,
   and its output narrowing holds under every join kind and wrapper); the
   HAVING twin of the ON trap; parameters inside a LATERAL body (the inner
   scope's WHERE-conjunct narrowing propagates notNull through the derived
   table under a cross join and degrades under LEFT JOIN LATERAL — verified
   by the run: absent from both the violation and the unwitnessed lists); a
   set operation's second branch (branch parameters deduce from the first
   arm; EXCEPT keeps the left arm's claims); and LIMIT/OFFSET (NULL is
   legal in both). Zero rejections, refusals, or violations; the two
   refilter classifications are recorded as live traps that flip with
   PostgreSQL's agreement if the ON/HAVING extensions land.

## Where things are

| | |
|---|---|
| Output walk to extend | `src/query/nullability-walk.ts` |
| Catalog facts (domains, functions) | `src/query/catalog-adapter.ts`, `src/query/types.ts` (`NullabilityCatalog`, `FunctionInfo`) |
| Binding machinery to reuse | `tests/unit/query/fixture-args.ts` (`@args`, literal substitution) |
| Existing parameterized fixtures | `extreme-parameterized-queries`, `extreme-params-everywhere`, `extreme-params-in-values` in `tests/unit/query/fixtures/` |
| Generator to extend (steps 3–4) | `tests/unit/query/generated/generator.ts` |
| Witness/ratchet precedent | `docs/witness-coverage.md`, `tests/unit/query/nullability-soundness.test.ts` |
