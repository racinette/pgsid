# Function overload merge — the candidate set the function side never got

**LANDED 2026-08-20.** All four red targets flipped in the same commit as the
fix (`tests/unit/query/overload-merge-red.test.ts`), and the register's
imprecision count fell 10 → 4. What follows is the design as built; the
"priced cost" section is the one place reality is narrower than the plan, and
it is recorded there and guarded in the red suite.

## Charter

The walk's OPERATOR dispatch resolves over a merged candidate set: pg_catalog
signatures plus path-visible user rows, per-signature survivors, consensus.
The FUNCTION dispatch and the subtree evaluator decide the same questions by
BARE NAME, and they fail in opposite directions — the walk discards the user
half, the evaluator discards everything. One is a live unsoundness.

Build the pool on the function side. Then delete both gates, because each
exists only to compensate for the pool being incomplete.

This is the function half of `docs/type-aware-overloads.md` "What must
change" point 3, whose operator half landed 2026-08-09, and point 5 —
"User function overloads come free — the same arity-then-consensus path
serves them" — which is the conclusion this document implements.

## What is broken — measured 2026-08-20

### Defect 1: a user function shadowing a builtin is invisible (RANK 1)

```sql
CREATE TABLE s (t text NOT NULL);
CREATE FUNCTION public.length(x text) RETURNS integer
  LANGUAGE sql IMMUTABLE AS $$ SELECT NULL::integer $$;
SET search_path = public, pg_catalog;

SELECT length(s.t) FROM s;
```

```
walk       : notNull   [every surviving signature of length() is total:
                        non-null arguments → non-null result]
PostgreSQL : [{"v": null}]
```

The walk claims notNull and PostgreSQL returns NULL. The cause is
`resolvableCandidates` (`src/query/catalog-adapter.ts`):

```ts
const resolvableCandidates = (schema, name) =>
  schema === undefined && isBuiltinFunction(name) ? [] : functionCandidates(schema, name);
```

An unqualified call to a name pg_catalog also carries drops EVERY user
candidate, so `meta` is null, the dispatch falls through to the builtin
signature path, and the curated totality table answers for a call PostgreSQL
runs against the user's body.

The drop was correct when it was written and its own comment says why: "with
no builtin signatures to merge in, no consensus over the user's half is
sound." The premise is what changed.

This is the exact shape `docs/type-aware-overloads.md` records as a live
rank-1 on the OPERATOR side ("a user `+ (boolean, boolean)` in `public` whose
function returns NULL from non-null inputs gets `notNull` claimed"). That half
was closed by the merge. This half was not.

### Defect 2: an unrelated user name destroys constant folding

```sql
CREATE FUNCTION public.scale(x boolean) RETURNS integer
  LANGUAGE sql IMMUTABLE AS $$ SELECT 1 $$;   -- nothing to do with numerics

SELECT scale(8.41);
```

```
without the user function : notNull    [closed subtree evaluated non-null]
with it                   : nullable   [conservative nullable]
PostgreSQL, both          : 2
```

A user function that merely shares a name silently disables closed-subtree
evaluation for that name, whatever its arity or argument types. The gate:

```ts
const evalUserFunctionNames = new Set(snapshot.functions.map(f => f.name));
// …
if (evalUserFunctionNames.has(name)) return null;
```

No schema, no arity, no types. `evalUserOperatorNames` and `evalUserTypeNames`
have the same shape, so the same collapse is available through an operator
symbol or a type name.

The same collision on `length('abc')` also stops the fold; there the answer
survives only because a totality table happens to catch it, which is luck, not
design.

### One absence, two directions

Both defects are the function side having no merged candidate set. The walk
keeps the builtin half and drops the user half; the evaluator drops both. Each
gate is a blunt guard around the same missing pool.

## Why now — the stated blocker is discharged

The comment on `resolvableCandidates` names what the full form needs:

> The full form needs pg_catalog signatures in the snapshot and waits for the
> consumer's search-path input, which it interacts with.

Both halves are false as of 2026-08-09:

- **The signatures are captured.** `CatalogSnapshot.builtinFunctionSignatures`
  — 153 names over 327 `pg_proc` rows, per-signature strictness, `prokind`,
  `aggkind`/`aggnumdirectargs`, variadic type — and it is already READ:
  `resolveBuiltinFunctionSignatures` plus `selectBuiltinRows` do arity
  filtering, exact match and survivor elimination today. The lookup is
  pg_catalog-only by construction (`schema === undefined || schema ===
  "pg_catalog" ? … : []`), which is the single line the merge changes.
- **The search path is already a caller-declared input.**
  `buildNullabilityCatalog(snapshot, { searchPath })`, and
  `resolveOperatorTotality` already gathers over it
  (`const userSchemas = schema ? [schema] : searchPath`).

There is no third prerequisite, and nothing here waits on a consumer.

**The capture cannot under-cover the claims.** Its scope is imported from the
claim tables themselves (`snapshot.ts` ← the walk's exported tables and
`operators.ts`, verified cycle-free), so every name the walk makes a totality
claim about has signatures to merge against. There is no class of name where
the walk over-claims and the pool cannot be completed.

## The design

### One pool

`resolveFunctionSignatures(schema, name, searchPath)` returns rows from two
sources under one type:

- pg_catalog rows from `builtinFunctionSignatures`, as today;
- user rows built from `snapshot.functions`, gathered over `searchPath` when
  the call is unqualified and from the named schema when it is qualified.

Deduped by signature. The gathering rule is measured and pinned in
`tests/unit/query/overload-resolution-mechanism.test.ts` — do not re-derive
it: the path is a VISIBILITY filter (a candidate iff its schema is on the
path, position irrelevant); an exact match in a later schema beats a
polymorphic candidate in an earlier one; position decides only ties between
IDENTICAL signatures, earliest first, with pg_catalog implicitly FIRST unless
the path names it later.

### Selection

`selectBuiltinRows` already does arity admission, exact match on single-typed
arguments, and survivor elimination. It becomes source-agnostic and is
otherwise unchanged. Elimination may over-keep and must never over-drop; that
invariant is what the whole scheme rests on and it does not move.

### Verdicts, per row and per property

Consensus is per-PROPERTY, not global — the existing rule. What changes is
where a row's verdict comes from:

- **A pg_catalog row** reads the curated signature tables, exactly as today.
  The tables become the property SOURCE for builtin signatures and stop being
  the dispatch. That is the ordering obligation `docs/type-aware-overloads.md`
  states.
- **A user row** reads its own catalog facts — `strict`, `volatile`,
  `returnsSet`, `isAggregate` — and, for `LANGUAGE sql`, the body analysis the
  walk already performs at priority 5. Any user row that cannot be argued
  through those is `nullable`.

Consensus over survivors: a property holds for the call iff it holds for every
surviving row.

### The precision consequence, stated plainly

A surviving user row rarely proves totality, so a mixed survivor set usually
yields `nullable`. That is the correct direction — it trades a wrong `notNull`
for a right `nullable` — but it means precision recovery depends on argument
types being known. An untyped argument keeps every candidate, so a user
function named after a builtin will cost precision at call sites the types do
not reach. That cost is the price of soundness and is not a reason to keep the
drop.

### Executing user code — DECIDED 2026-08-20, and it refunded the cost

The evaluator asks a different question from the walk. The walk asks whether a
result can be NULL; the evaluator asks whether it may hand the subtree to
PostgreSQL and trust the value — which means EXECUTING it. For a builtin that
is inert. For a user function it runs the user's code during ANALYSIS, on a
query the caller never ran, and `IMMUTABLE` is an unenforced promise.

The merge shipped with that question open, behind a rule — *if any SURVIVING
row is a user row, the subtree stays open* — which was strictly weaker than the
bare-name refusal it replaced and needed no trust decision.

**The ruling: `IMMUTABLE` is taken at its word, and the rule is deleted.**
PostgreSQL does not enforce the label either — its own planner constant-folds
immutable calls with constant arguments — so trusting it is the convention the
database already runs on rather than a new one this engine invents. Nothing
special-cases a user row now: `survivorConsensus` already demands
`volatility === "i"`, a base-kind return and immutable-I/O parameters, so an
IMMUTABLE user function folds and a STABLE or VOLATILE one does not. A function
that RAISES was already ordinary — the batch retries subtrees individually and
drops the raisers.

The consequence nobody predicted is in "What it cost" below: delegating
resolution to PostgreSQL closed the untyped-literal gap that the merge alone
could not, without implementing the preferred-type rule this document's parent
declares a non-goal.

`overload-merge-red.test.ts` guards the new line in both directions —
IMMUTABLE folds, STABLE and VOLATILE refuse. If either of the latter flips, the
trust model moved and someone owes the argument.

### The second site the types never reach: function bodies

Measured 2026-08-20, on identical `IMMUTABLE STRICT` `LANGUAGE sql` functions
called with literals:

```
body `SELECT $1 || ' ' || $2`   → notNull
body `SELECT UPPER($1)`         → nullable
```

`||` is decided by the operator path without asking operand types. `upper`
needs its signature narrowed — it has a total `(text)` row and an `(anyrange)`
row that is NULL for an empty range — and `$1`'s declared `text` never reaches
`operandTypeSet` inside a body scope. So the same type threading that fixed
`upper(<text column>)` has a scope it does not enter.

This is the same mechanism at a site it does not reach, and it belongs to this
refactor rather than beside it: the fix is to seed the body scope's parameter
types from the function's declared argument types, which the merged pool now
has to hand for exactly the row that was selected.

> **BOTH SPELLINGS CLOSED.** `$n` landed with the body context's `argTypes`
> (`body-builtin-parameter-type.sql`). The parameter's NAME landed 2026-08-22
> (`body-builtin-parameter-by-name.sql`) — `renderedTypeOfExpr` reads a
> ColumnRef's type through scope relations only, and a body with no FROM has an
> empty scope, so `SELECT upper(a)` stayed untyped for as long as
> `SELECT UPPER($1)` had been fixed. Worth 240 claims in the generated corpus.
> The name reading is a FALLBACK behind the scope reading, deliberately: a
> visible column of the same name wins, measured against PostgreSQL.

## What must change

1. **Snapshot** — nothing. `builtinFunctionSignatures` is captured and read.
2. **Catalog adapter** — `resolveFunctionSignatures` merging user rows over
   `searchPath`; `selectBuiltinRows` made source-agnostic; a verdict function
   branching on row provenance; consensus unchanged.
3. **The walk** — consult the merged set FIRST at every function-shaped site.
   The `if (!meta && …)` gate around the typed dispatch goes away with the
   thing it was guarding.
4. **Body scope** — seed declared parameter types into `operandTypeSet`.
5. **Deletions** — `resolvableCandidates`' drop, and the three
   `evalUserFunctionNames` / `evalUserOperatorNames` / `evalUserTypeNames`
   subtractions, replaced by the survivor-provenance rule above.

## Non-goals

- **No tiebreak algorithm.** Rules 4–8 read `typispreferred` and
  `typcategory`; that is a different project with a much worse risk profile.
  Where survivors cannot be reduced, consensus answers.
- **No type inference.** The closed list in `docs/type-aware-overloads.md`
  stays the whole source of types.
- ~~No admission of user functions to EXECUTION.~~ **Decided 2026-08-20**:
  IMMUTABLE is taken at its word, and volatility is the line. See the section
  above.
- **No polymorphic return types.** A polymorphic call yields no type to thread
  onward; that degradation is expected.

## Boundaries — do not re-derive these

- The gathering rule (visibility filter, pg_catalog implicitly first, position
  only for identical signatures) is measured and pinned.
- Domain-following: exact match on DECLARED types first, canonicalisation
  (recursive domain smash) only as the fallback.
- Elimination may over-keep, never over-drop.
- The capture's scope is imported from the claim tables, so it cannot drift
  from what the walk claims.

## The red suite

`tests/unit/query/overload-merge-red.test.ts`, in
`subtree-evaluation-red.test.ts`'s shape: every `it.fails` asserts the TARGET —
what the engine must claim once this lands — and passes today exactly because
the engine does not claim it. When the merge lands, those cases start failing
under `it.fails`, which forces the flip to a plain `it` in the same commit.
The suite is green before, during and after, and each flip is the acceptance
test of the change that caused it.

Every target is adjudicated against PostgreSQL before it ships. The plain `it`
blocks are boundary guards: behaviour that must stay exactly as it is,
including the qualified-call path and the non-shadowed controls, so the merge
cannot pay for its precision by moving something it was not asked to move.

## Risk and ordering

This touches the hottest path. The corpus dry-run discipline from the fix
phases applies, and there are now two corpora to run it against — the
generated one and the borrowed sqlc one, whose per-case data states and
per-entry pins would surface a regression by name.

Order: fix, then the red flips, then the fixture for Defect 1 (a fixture whose
claim the oracle would falsify must not ship before the fix), then regenerate
`docs/sqlc-disagreements.md`.

## What it closes — measured after landing

- **Defect 1**, the unsoundness. A shadowing `length(text)`/`upper(text)` now
  resolves into the merged pool, the user row survives selection beside the
  builtin, and consensus over the two answers `nullable`. Two red targets.
- **Defect 2**. `scale(8.41)` folds again with an unrelated `scale(boolean)`
  present: the user row is eliminated by argument type and the survivor is a
  pg_catalog row, so the noExecution rule never fires. One red target.
- **The body-scope hole.** `UPPER($1)` inside a LANGUAGE sql body narrows to
  `upper(text)` from the parameter's declared type. One red target, and it
  closed the SIX `sql_syntax_calling_funcs` entries in the sqlc register —
  `minerSqlcStronger` 25 → 19, `minerAgree` 502 → 508, with the per-entry pin
  naming exactly those six.
- **A latent bug found while fixing it**: inside a body, `$n` was reading the
  STATEMENT's `paramTypes`, which describes an unrelated binding that merely
  shares the position. The body context now shadows it outright.

Untouched by the merge, as designed, and closed the same day by the
imprecision batch that followed it: `nextval/GetNextID` ×2 (volatility, not
resolution — the sequence functions joined `STRICT_TOTAL_BUILTINS`),
`pg_generate_series/GenerateSeries` (the strict-SRF `returnsSet` exclusion),
and `builtins/Scale` (a harness gap — the corpus suite was calling the walk
without `evaluate`). **The register carries no `pgsid-imprecision` entries
after that**: every remaining entry is a sqlc conviction or expected
conservatism.

## What it cost — nothing, in the end

The merge shipped with one priced cost, and the execution admission refunded
it the same day.

A BARE literal argument to a name a user function shares with a builtin keeps
every candidate: `length('abc')` beside a user `length(boolean)` has a mixed
survivor set, so no SYMBOLIC verdict is available. Separating them is
PostgreSQL's preferred-type rule, which this document's parent declares a
non-goal ("No tiebreak algorithm": rules 4–8 read `typispreferred` and
`typcategory`, and no cast table substitutes for them).

The evaluator does not need that rule. It hands the whole expression to
PostgreSQL, which applies its own resolution and answers with a value — so the
gap closed by DELEGATING the algorithm rather than reimplementing it, and the
non-goal stays a non-goal. `builtin-name-collision-elimination.sql` pins all
four positions in the shared schema; the bare literal is `@notNull` there, with
no `@unwitnessable` and no excuse.

The general lesson is worth keeping: where a symbolic rule would have to
duplicate PostgreSQL's resolution, and the expression is closed, asking
PostgreSQL is both cheaper and exact.

## Open questions

- A user row whose language the walk cannot analyse (`plpgsql`, C) makes every
  mixed survivor set nullable SYMBOLICALLY — but if the call is closed and the
  function is IMMUTABLE the evaluator now folds it anyway, so the question only
  bites where an argument is open. Is there a cheaper property than totality
  worth reading from `plpgsql_check` for those, or is conservative the end of
  it?
## The other two gates — CLOSED 2026-08-20, and they did not close alike

`evalUserOperatorNames` and `evalUserTypeNames` were the open items above. Both
are gone; the guess that the operator case was "the same shape" was right and
the guess about the type case was wrong in an interesting way.

The measurement was the same one that started this document: append
name-only-colliding user objects to `fixtures/schema.sql` and run the corpus.
Colliding OPERATORS (`||`, `+`, `->` on two booleans) moved eight fixtures;
relations named after pg_catalog TYPES (`date`, `jsonb`, `numeric`, `line`)
moved three. Everything below is pinned in `bare-name-gates-red.test.ts`.

**The operator gate hid an UNSOUNDNESS, not just imprecision.** Two of the
eight went the wrong way: `extreme-jsonb-operators`.json_access and
`expression-node-coverage`.json_get flipped from nullable to NOTNULL. The walk
had read the operand types, `resolveOperatorTotality` had eliminated the user
`->(boolean, boolean)` correctly — and then reported `unknown`, because with
the user row eliminated there was no builtin row left to answer with. `->` is
not a curated name, so `builtinOperatorSignatures` holds nothing for it. The
caller read `unknown` as "nothing was known", fell through to the bare-name
lookup, and dispatched the very row the operand types had just ruled out.
`bool_pair`'s body is `$1 AND $2`, both operands were non-null, and the walk
claimed notNull for `'{}'::jsonb -> 'id'` — which is NULL.

The fix is that the operand type sets now travel WITH the name:
`resolveOperatorMetadata` takes them and drops candidates that cannot accept
them, and eliminating every candidate answers `null` — "no user operator here"
— rather than dispatching one. A null set still constrains nothing, so an
untypeable operand keeps every candidate and nothing is over-dropped.

**The evaluator's operator gate then closed like the function one.**
`closedOperatorTypes` merges path-visible user rows into the pool and lets
`survivorConsensus` judge them, which is why `OperatorInfo` grew the backing
function's `provolatile`: an IMMUTABLE user operator folds, a STABLE or
VOLATILE one does not. `'a' || 'b'` folds again next to a `boolean || boolean`.

**Types answer by PATH, because they have no operands to eliminate with.** The
old gate assumed a user type of the name always wins the spelling. It does not:
pg_catalog is searched FIRST unless the search path names it explicitly.
Measured against a `public."date"` table — under `search_path = public` a bare
`date` is pg_catalog's; under `search_path = public, pg_catalog` it is the
table's rowtype, and `'2020-01-01'::date` then raises *malformed record
literal*, which is the shadow being real rather than theoretical. So
`evalUserTypeShadows` reads the path, and the engine's `searchPath` option
finally means something for types. `numeric` is the instructive one: its
spelling is fixed by PostgreSQL's grammar, so it stays pg_catalog's under
BOTH paths.

The type shadows live in `fixtures/schema.sql` for the reason `scale(boolean)`
does. The colliding OPERATORS do not, and that asymmetry is the honest part:
six of the eight moved fixtures were the name-rule fallback ceding to a user
`||` or `+` over operands nothing types (`$1 || 'x'`, `a.total + b.total`).
That conservatism is correct and its retirement condition is recorded in
`catalog-adapter.ts` — type the operand sources first. Elimination can rescue a
typed function argument; there is nothing to rescue an untypeable operand with,
so the collision would cost six real claims to exercise a rule the red suite
already holds.

## Open questions

- A user row whose language the walk cannot analyse (`plpgsql`, C) makes every
  mixed survivor set nullable SYMBOLICALLY — but if the call is closed and the
  function is IMMUTABLE the evaluator now folds it anyway, so the question only
  bites where an argument is open. Is there a cheaper property than totality
  worth reading from `plpgsql_check` for those, or is conservative the end of
  it?
- ~~`isImmutableFunction` and `isImmutableOperator` are still bare-name~~ —
  **DELETED 2026-08-20.** Neither had a live caller: the closed gates the
  evaluator actually calls are `closedFunctionTypes`, `closedOperatorTypes`
  and `isImmutableIoType`, and these two were never rewired when the closure
  question moved from bare NAME to SIGNATURE. Merging them would have been
  precision built for a consumer that does not exist; deleting removed the
  last bare-name gates of their kind along with the trap they set for the
  next reader, whose tests still asserted the superseded rule.

  What kept them invisible is worth recording: they sat on
  `EVALUATION_CATALOG_ONLY`, which exempts members from the cold-member
  census on the grounds that "the subtree evaluator's own census covers them
  instead" — and for these two, nothing did. An exemption list is a place
  dead code can hide.

  The deletion reached further than the accessors. Their captures —
  `builtinImmutableFunctionArities` and `builtinImmutableOperators`, plus the
  `UNREACHABLE_TYPE` helper they shared — had no other consumer, and the
  arity capture was expensive: a `generate_series(0,8)` join over all of
  pg_proc with a correlated `NOT EXISTS` over `unnest(proargtypes)`, run once
  per snapshot. Dropping both cut `sqlc-corpus.test.ts` from ~102s to ~28s,
  measured three times. Nobody was looking for that; it was the price of a
  capture nothing read.
