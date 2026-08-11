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
- **nullable** — no claim. The engine found no rejection channel it can see.
  Whether NULL is a *useful* binding is not addressed, and neither is whether
  some code the engine cannot read rejects it anyway.

**The contract is ONE-DIRECTIONAL, and that is a decision** (2026-08-07,
forced by sweep-4 finding 7 — see "What a nullable parameter does not promise"
below). An earlier draft of this document read nullable as *universally safe*:
"no data state, no guard, no path makes it raise". That is not achievable and
never was. A `LANGUAGE plpgsql` body of two lines —
`IF x IS NULL THEN RAISE …` — rejects the binding with nothing catalog-visible
behind it, and no static analysis short of executing the body reaches it. A
rule the engine cannot satisfy is worse than a weaker one it can: it makes a
green suite mean "the corpus happens to contain no such function".

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

## The mechanisms, measured

Two mechanisms were measured first and named A and B; C (value flow) and D
(builtin argument positions) were added later and are described in "The
algorithm" and "What a nullable parameter does not promise" respectively.

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
- **nullable is the ABSENCE of that claim**: no channel the engine models
  rejects NULL here. Not a guarantee that nothing does.

### What a nullable parameter does not promise

The boundary, decided 2026-08-07 and scoped deliberately:

**No claim is made about a USER function's arguments beyond its DECLARED
parameter types.** A function body is not its interface. `sw4_dom_id(x text)
RETURNS nn_text AS $$ SELECT x::nn_text $$` is non-strict, so it runs, and its
body maps the argument into a NOT NULL domain — binding NULL raises. The
engine says nothing, and that is correct rather than a gap to be closed. The
channel a schema author uses to *get* the claim is the declared type: declare
the parameter as a NOT NULL domain and mechanism A rejects at Bind, before the
body is reached at all. Standard types are nullable by design.

That class is catalog-visible and a rule could be written for it — a
non-strict function with a NOT NULL domain return whose body is
NULL-preserving. It is deliberately not written, because it would not close
the question: the plpgsql `RAISE` above is the same rejection with no catalog
trace, so the line would move without arriving anywhere. Reading bodies to
guess at rejections also inverts the interface: two functions with identical
signatures would carry different contracts.

**The must-not-raise convention holds for BUILTINS**, whose behaviour is
documented and knowable, and where a claim is therefore owed. That is
**mechanism D**, built 2026-08-07: some builtin argument positions reject NULL
in their own C implementation with nothing in pg_catalog saying so. Strictness
cannot express the class — a strict function returns NULL rather than raising,
so the whole of it sits inside the non-strict set.

Two tables, because there are two distinct checks and neither implies the
other:

| | positions | message |
|---|---|---|
| a NULL ARGUMENT | `array_fill`'s dimension and low-bound arrays; `array_position`'s three-argument initial position; the six range constructors' flags argument; `jsonb_set_lax`'s `null_value_treatment` | 10 signatures, 11 positions |
| a NULL ELEMENT of an array argument | `array_fill`'s two dimension arrays; `jsonb_set_lax`'s PATH — which accepts a NULL array and rejects a NULL element | 3 signatures, 4 positions |

**These are tables, and that is normally this project's mistake.** The property
has the same shape as TOTALITY, whose four tables drifted three times
(`docs/generated-surface.md` items 2 and 3). What makes these safe is that the
property is cheaply DECIDABLE BY EXECUTION — call the function with NULL in one
position, call it again with a value, and the pair answers exactly — so
`builtin-null-rejection.test.ts` does not CHECK the tables, it DERIVES the
class from pg_catalog and asserts equality. A PostgreSQL upgrade that adds,
removes or moves a rejection fails with the diff. The tables are a cache of
that measurement.

Two things bound the rule. The element rule reaches an ARRAY CONSTRUCTOR only,
where the elements are visible as expressions: `$1::integer[]` bound to an
array CONTAINING a NULL is the same rejection and cannot be claimed, because
the parameter is the whole array and its being non-null says nothing about its
contents. And a USER function of the same name is never matched — the tables
describe pg_catalog's implementations, and the engine claims nothing about a
user body.

The rule composes for free: `array_fill(1, coalesce($1, $2))` yields the joint
rejection set `{1,2}`, because mechanism C's implicant machinery already
answers "which parameters force this expression NULL".

**How the suite holds the line.** `param-soundness.test.ts` still falsifies a
nullable claim whose NULL binding raises, because over the hand-written corpus
that is the strongest oracle the input side has. A fixture in the opaque class
declares it with `-- @param-opaque N: <reason>`, and the marker is itself
checked: the raise must be OBSERVED, so a stale marker fails as loudly as a
missing one — the same bar `@unwitnessable` and `@no-rows` are held to.

This is the output side's structure with the polarity flipped. Output
`notNull` is universal (no row ever contains NULL) and execution can only
falsify it; output nullable is existential and execution can only witness it.
So the verification machinery transfers wholesale, mirrored:

| claim | quantifier | execution can… | analogue |
|---|---|---|---|
| output `notNull` | universal | falsify | input nullable |
| output nullable | existential | witness | input `notNull` |

Concretely: a claimed-nullable parameter is checked by binding NULL (others
held valid) — any raise, in any data state, is either a channel the engine
should have seen or an opaque one it must record. A claimed-`notNull`
parameter is checked by binding NULL and requiring the raise to be *observed*
in at least one state — mechanism-A claims raise even under `empty`;
mechanism-B claims need a state that routes a row into the target, exactly the
way `@no-rows` fixtures must observe their declared refusal rather than be
taken on faith. An unwitnessed `notNull` is the input side's version of an
unwitnessed nullable output, and is held to the same standard: witnessed, or
its unwitnessability recorded explicitly.

Both directions of the contract are therefore executable against PostgreSQL —
a stronger oracle than the output side has ever had.

**The existential claim has no reachability qualifier — an open question.**
"There is an execution in which NULL raises" quietly assumes the rejecting
site RUNS in some execution. A provably-dead subtree breaks that for every
execution-time mechanism, not just one: PostgreSQL never executes a
non-data-modifying CTE nobody references (adversarial-2 finding 9, measured
— the frame-offset site inside one accepted the NULL binding its referenced
control raises on), and a `WHERE false` conjunct or a never-taken CASE arm
would kill a site the same way. The collector performs no reachability
analysis; the NARROW fix it carries is exactly the measured shape — an
unreferenced SELECT CTE contributes parameter numbers but no rejection
sites (`visitStatementWithCtes`), name-level and transitively closed, with
over-approximation erring toward the old behaviour. The general question —
whether `notNull` should be read as "raises in some execution that
evaluates the site", or the collector should learn dead-subtree pruning —
stays open here deliberately: nothing short of a constant-folding pass
answers it, and the falsification oracle bounds the damage to claims a dead
site sponsors. Finding 8's tree asymmetry is the same family and is CLOSED:
mechanism B reads `resolveColumnNotNullTree` for update-command targets, so
its claims are witnessable in every data state, not only parent-row ones.

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

**The window frame offset — mechanism B's fourth sibling (adversarial
finding 15).** A parameter as a `WindowDef` frame bound (`ROWS BETWEEN $1
PRECEDING …`) raises `frame starting/ending offset must not be null` for a
NULL binding — for ROWS, RANGE and GROUPS, in both directions, and even
over empty input (all measured). The sibling placement, LIMIT/OFFSET, takes
NULL legally, which is exactly why the site had to be enumerated rather
than assumed. Still execution-time (a subquery that never runs never
evaluates its frame), so it rejects without licensing narrowing; the value
flows through `rejectFlow` like any mechanism-C channel, and the offset
reaches the collector both as `FuncCall.over` (a concrete struct field,
emitted UNWRAPPED by libpg-query) and as a wrapped `WindowDef` in the
windowClause. `param-window-frame-offset.sql` pins it, the raise witnessed.

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

### Joint rejection sets (Wave 10)

The flat array has a vocabulary limit: `SET username = COALESCE($1, $2)`
into a NOT NULL column rejects neither parameter alone, yet binding BOTH
NULL raises — a fact `notNull: boolean` per parameter cannot say, and a
consumer emitting `{ $1: string | null; $2: string | null }` admits exactly
the binding class this analysis exists to forbid. The contract therefore
carries a third field:

```ts
interface QueryContract {
  outputs: OutputNullability[];
  params: ParamNullability[];       // singleton facts, semantics unchanged
  paramRejectionSets: number[][];   // minimal sets of size ≥ 2
}
```

The underlying theory is uniform: everything is a minimal **rejection set**
— "binding NULL to every member raises" — and `params[i].notNull` is the
|S| = 1 slice, kept positional for the PREPARE zip. Minimality gives the
trichotomy: a notNull parameter never appears in a set (supersets are
absorbed), so each parameter is unconditionally required, conditionally
required (the condition spelled entirely by its sets), or unconstrained.
The claim direction is unchanged and one-directional — claims mean raises;
absence of a claim promises nothing.

Mechanism-C's value-flow computes this natively: "which params force this
expression NULL" is a monotone function over "$i is NULL" atoms, and the
analysis tracks its minimal implicants — strict operators union the
operands' implicant lists, COALESCE cross-unions its branches (the
singleton projection of which IS the old intersection, so the flat contract
is bit-identical to before). Bounds, recorded here per the no-silent-caps
rule: implicants wider than 4 parameters and joint implicants beyond 8 per
expression are dropped — a dropped implicant is a missing claim, exactly
the pre-lift state — and singletons are NEVER dropped, so the flat contract
cannot regress however wide an expression fans out. CASE expressions
contribute no implicants (unchanged from the singleton analysis); a
CASE-shaped joint fact would need the arm machinery the entailment kernel
has and this traversal does not — deferred, recorded.

Verification mirrors the flat claims: `-- @param-reject 1,2` annotations
with compulsory bidirectional coverage (engine-claimed sets must be
annotated, stale annotations must come off), each member required to carry
its own `nullable` claim (the conditional state), and the soundness suite
binds all members NULL together expecting the observed raise — existential,
like notNull — while the members' individual nullable claims keep the set
irreducible. A type emitter renders each set as one local union over its
members intersected with the flat per-parameter types; ignoring the field
yields the old contract, sound and incomplete.

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

## Mechanism E — CHECK-constraint rejection (chartered 2026-08-11, NOT BUILT)

The evaluation capability this mechanism rides is chartered separately in
`docs/subtree-evaluation.md` (2026-08-11) — the same core also serves the
output side, and the red suite for both lives at
`tests/unit/query/subtree-evaluation-red.test.ts`. This section remains the
CHECK-channel consumer's design.

The discovery instrument's standing conviction
(`docs/catalog-driven-generation.md` §9.7): `INSERT INTO subscription (plan,
seats, overflow_contact) VALUES ('team', 5, $1)` with NULL bound raises
`CHECK (seats <= 1 OR overflow_contact IS NOT NULL)` — a CHECK whose
predicate goes FALSE (not UNKNOWN) on a written NULL is a rejection channel
mechanisms A–D do not cover. Catalog-visible, unlike the plpgsql-body class,
so a claim is owed where one is derivable.

**The design, decided after measuring the alternative.** Mirroring operator
semantics per type is the simulation category, ruled out; connecting the
entailment kernel's exact-atom trade was measured over the schema's fifteen
rejection-capable CHECKs and covers eleven — but not one of the ordering-
shaped ones, which are exactly the two on instrument-reachable tables. The
mechanism instead asks PostgreSQL, confined to the narrowest possible
question:

1. **Ground** — substitute the statement's written literals into the parsed
   CHECK expression (the AST we hold, never `pg_get_constraintdef` text),
   every substituted value AND the tested NULL cast to its column's declared
   type — bare tokens would compare as text and answer a different question.
2. **Evaluate closed subtrees only** — no parameters, no unwritten columns,
   every function and operator immutable (`provolatile = 'i'`, a catalog
   lookup) — via `SELECT`, batchable as one statement; each collapses to
   TRUE/FALSE/NULL.
3. **Reduce** by three-valued algebra (`FALSE OR x → x`, `FALSE AND x →
   FALSE`, …) — the skeleton logic the kernel already owns.
4. **Analyze the residue** with existing machinery: an `$n IS NOT NULL`
   residue rejects exactly on NULL (`notNull`, execution-time — never
   licenses narrowing); value flow through strict operators is
   `forcedNullParams`.

The boundaries FALL OUT instead of being ruled: an unwritten column
surviving reduction → no claim (no blanket coverage rule — `FALSE AND col >
0` still reduces); a parameter sibling surviving (`$2 <= 1 OR $1 IS NOT
NULL`) → no claim, correctly, because binding $2 NULL makes its atom
UNKNOWN, which CHECK passes — so the shape also produces no false findings
in the instrument's variants. A `NULL` evaluation result means the CHECK
passes (measured, pinned in check-null-passes); claim only on FALSE.

**Architecture (DECIDED 2026-08-11, superseding the two-phase proposal).**
The contract/param entry points become async and accept an optional
`evaluate` callback — run one SELECT, return its row — while the engine
internals stay sync and consume evaluation ANSWERS as data, the way they
consume `paramTypes`. No evaluator passed → no E claims, everything else
identical. Full design and rationale: `docs/subtree-evaluation.md`.

**Pre-work, measured before any code**, param-mechanism style:

- Pin the substitution semantics against PGlite: the cast requirement, the
  NULL-passes rule, a stable-vs-immutable body, multi-row VALUES (per row,
  existential), and `bp` as the correctness control — its char(4) blank
  padding makes `'a' = 'a '` TRUE, so evaluation must claim NOTHING where
  token reasoning would wrongly claim. DONE (2026-08-11): all six pinned in
  `param-mechanism.test.ts`, "Mechanism E" section — the bp control measured
  exactly as predicted (text grounding says FALSE, the char(4) column admits
  the row), and a STABLE body flipped its answer between evaluation and
  enforcement via a GUC, which is the immutable-only gate made executable.
- The input channel gates on ENFORCEMENT, not validation: NOT VALID still
  gates new writes, NOT ENFORCED does not — and the snapshot was measured
  treating `convalidated=false` as covering both (schema comment at the
  `guest` negatives). CHECKED (2026-08-11): the snapshot did not carry the
  distinction, `pg_constraint.conenforced` (PG18) does — the snapshot now
  captures it as `enforced` (NOT VALID: true, and a violating new write
  raises; NOT ENFORCED: false), pinned in `check-constraint-pins.test.ts`.
  Stored-row reasoning keeps gating on `validated`; E gates on `enforced`.
- UPDATE channels read OLD values for unwritten columns and INSERT reads
  defaults — both stay dynamic in the residue and drop claims; a
  literal-default substitution is a recorded later, not part of the first
  build.

**Hazard, recorded:** claim production and adjudication both become
PostgreSQL — common-mode in principle, though expression evaluation and
constraint enforcement are different code paths, and the pinned fixture
corpus is the standing hedge. E-claims themselves never license output
narrowing (never `bindRejected`); the output side gains its OWN consumers
of the shared core — the statement map now, entailment later — chartered
in `docs/subtree-evaluation.md`, each under its own soundness argument.

## Where things are

| | |
|---|---|
| Output walk to extend | `src/query/nullability-walk.ts` |
| Catalog facts (domains, functions) | `src/query/catalog-adapter.ts`, `src/query/types.ts` (`NullabilityCatalog`, `FunctionInfo`) |
| Binding machinery to reuse | `tests/unit/query/fixture-args.ts` (`@args`, literal substitution) |
| Existing parameterized fixtures | `extreme-parameterized-queries`, `extreme-params-everywhere`, `extreme-params-in-values` in `tests/unit/query/fixtures/` |
| Generator to extend (steps 3–4) | `tests/unit/query/generated/generator.ts` |
| Witness/ratchet precedent | `docs/witness-coverage.md`, `tests/unit/query/nullability-soundness.test.ts` |
