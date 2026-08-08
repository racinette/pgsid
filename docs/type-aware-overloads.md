# Type-aware overload narrowing — handoff

## Charter

`lower(email)` reads nullable, on a `NOT NULL` text column, for the most
trivial function in SQL. That is the state this document exists to end.

It is not a precision statistic. The contract's whole value is that
`notNull` means something; a consumer who meets the simplest possible case
coming back nullable stops trusting the flags and adds checks everywhere.
The engine is *sound* there and unusable-feeling, which is the worst pair.

Two coupled efforts, and they are coupled because neither pays off alone:

1. **The engine becomes type-aware** — it keeps the types it already knows
   for free and uses them to NARROW a call's candidate overloads before the
   existing consensus rule runs.
2. **A function-nullability test suite** — per-overload witnesses for
   built-in functions, aggregates and window functions, which is the
   evidence base the narrowing consumes and the thing that keeps the
   curated claims honest.

Read `docs/nullability-walk.md` for the walk, in particular priority 6b and
the overload-consensus rule this extends. Read `docs/generated-surface.md`
for the sibling item (the suite's blind spots) — the two are independent but
share the "hand-curated table" diagnosis.

## Why now — the measurement

A curated-table audit (2026-08-05) found `lower`/`upper` claiming totality
while `lower('empty'::int4range)` returns NULL. Both names left
`STRICT_TOTAL_BUILTINS`, which is sound and cost the text meaning its
precision. That is the immediate trigger; the structural reason is worse.

**A name is not a function.** `pg_catalog` holds 3226 implementations under
2726 names, 223 of them overloaded. Of the 137 curated names, **55 are
backed by more than one C implementation** — those entries are claims about
**153 distinct functions**, verified against however many the author had in
mind. Operators are worse: `TOTAL_STRICT_OPERATORS` is 22 names over **558
implementations**, and **21 of 21** are overloaded.

So the tables record a claim against a key coarser than the claim's
subject, with no quantifier. The engine already has the correct pattern one
file over: `builtinStrictFunctions` is `bool_and(proisstrict)` — a
name-level claim that holds only when EVERY overload has the property. The
curated tables collapse with "the author looked at one."

Two distinct failure modes follow, and conflating them is why this recurred
in three consecutive sweeps:

| mode | instances | what fixes it |
|---|---|---|
| **key mismatch** — the name spans overloads the claim never covered | `substring`, `lower`, `upper`, `+`, `\|\|`, `random` | this document |
| **under-verified entry** — the claim was checked against too narrow an input class | `array_position`, `extract`/`date_part`, `to_number`, `to_char`, `scale`/`min_scale` | the witness corpus below |

### The three that made the case (2026-08-06)

The execution probe of `docs/generated-surface.md` item 3 found three more
key mismatches in one run, and two of them are now **kept as recorded holes
rather than removed** — which is what makes them this document's motivating
test cases rather than more of its evidence. They are the first entries whose
removal was measured to cost more than the defect, so they will still be
wrong when this refactor starts, and getting them right is how it should be
judged.

| name | the overload that breaks the claim | why removal was refused | recorded in |
|---|---|---|---|
| `+` | `path + path` is NULL whenever EITHER operand is a CLOSED path (`path + point` is total; open + open is a value) | the falsifying input needs a `path`-typed column, which essentially no application schema has, while removing the name makes `id + 1` on a NOT NULL integer read nullable — the general case | `PARTIAL_OVERLOADS` in `src/query/operators.ts` |
| `\|\|` | array concatenation ABSORBS a NULL operand: `ARRAY[1,2] \|\| NULL` is `{1,2}`, while `'a' \|\| NULL::text` IS NULL | removal was tried and is worse in the direction that matters — the corpus immediately admitted three bindings PostgreSQL rejects, because mechanism C needs the strict TEXT meaning to predict a real rejection | `NON_STRICT_OVERLOADS` in `src/query/operators.ts` |
| `random` | PG17's `random(min, max)` overloads are STRICT, so `random(NULL, NULL)` is NULL while `ALWAYS_NOT_NULL_BUILTINS` claims "never NULL whatever the arguments" | **not refused — removed.** Its falsifying input is ordinary integers, so unlike the two above the exotic-input argument does not apply, and the cost is only `random()` | removed from the table |

The contrast between the first two rows and the third is the rule this
document should encode: **the exotic-operand argument is what makes a hole
tolerable, and narrowing is what makes it unnecessary.** `+` resolved by
operand type keeps `id + 1` AND refuses `path + path`; `||` resolved by
operand type predicts the text rejection AND stops over-reporting the array
one. Both are two-candidate discriminations on concrete, non-polymorphic
operand types — the easiest case the elimination rule has — so if the
refactor cannot recover these two, it is not worth its cost.

`totality-probe.test.ts` asserts both records from BOTH sides, so neither can
outlive the defect it excuses: the probe must still reproduce the NULL, and
any OTHER overload of the same name returning NULL fails immediately rather
than hiding behind the note.

## The design: resolve exactly where you can, narrow everywhere else

**Corrected 2026-08-06, and the correction matters more than the original
text.** This section previously described PostgreSQL's algorithm as "(1)
gather by name and arity; (2) discard what cannot be implicitly coerced; (3)
if one remains, done; (4–8) tiebreak by exact matches, preferred types and
category rules", and concluded "we implement step 2 and stop… we never need to
know which candidate wins". Filing EXACT MATCH under "tiebreak" is wrong, and
it is load-bearing: an exact match is not a tiebreak at all. It is an early,
terminal, deterministic step, and it comes BEFORE the coercion narrowing:

> Check for an operator accepting exactly the input argument types. If one
> exists — and there can be only one — use it.

Its uniqueness is structural rather than probabilistic: two operators cannot
share a name and a pair of operand types, so the "exact match" set has at most
one member (measured: 0 of `+`'s pg_catalog signatures share a (left, right)
pair). So where every argument type is known exactly, naming the overload is a
LOOKUP, not a resolution algorithm, and the engine may read that one
candidate's properties directly — totality, strictness, and its return type.

So the design is two tiers, and the first is the one that carries the weight:

1. **Exact match.** Every argument type known exactly and some candidate's
   parameter types equal them → that candidate IS what PostgreSQL runs.
   Read it directly. Its return type is exact, which is what makes the rule
   COMPOSE: `(a + b) + (c + d)` over integer columns resolves to
   `integer + integer` at every level and keeps its claim (measured —
   `pg_typeof` says `integer` throughout).
2. **Superset narrowing**, when tier 1 does not apply: discard the candidates
   the arguments cannot be implicitly coerced to, and take CONSENSUS over what
   survives. Everything after step 2 only ever removes candidates, so the
   survivors are a superset of PostgreSQL's answer and consensus over a
   superset is sound.

Tier 2 alone was the original design, and it is not enough. `a + b` over two
`integer` columns leaves NINE survivors — integer coerces implicitly to
bigint, numeric, real and double precision, so `bigint + bigint` and
`numeric + numeric` survive beside `integer + integer` — returning FIVE
distinct types. That is fine for the totality question (all nine are total)
and useless for the type question, so a nested operator had no type for its
parent to narrow with, and `(a + b) + (c + d)` would have LOST a claim it
holds today. Tier 1 removes the problem rather than working around it.

**Tier 1 needs a NORMALISATION step, or it misses the commonest types**
(measured 2026-08-06). `character varying` has ZERO operators declared on it —
no `+`, no `||`, no `=` — and `'a'::varchar || 'b'::varchar` resolves to `text`
by BINARY COERCION rather than by an exact match. The same holds for `uuid`
(`=` only), `character`, and every domain. So a naive exact-match lookup fires
for `integer` and `text` and misses varchar, which is one of the most common
column types in real schemas, with `||` on it being everyday SQL.

This is a REACH hole, not a correctness one: tier 2 handles varchar correctly
(it coerces to text, the array candidates die, consensus holds). But the fast
path would silently never fire. Canonicalise the argument type before lookup —
through binary-coercible casts (`pg_cast.castmethod = 'b'`) and domain bases —
and then attempt exact match.

**Ordering caveat, measured 2026-08-09** (the third pre-refactor question):
exact match must try the DECLARED types against the merged candidate set
BEFORE canonicalising, because a candidate declared ON a domain type wins —
`+ (dint, dint)` beats integer's builtin, `gd(dint)` beats `gd(integer)` for
a domain argument. Canonicalise-first is safe only against pg_catalog
signatures, where no candidate takes a user domain. Pinned in
`overload-resolution-mechanism.test.ts`.

Three further things tier 1 must get right, each measured:

- **Domains follow to their base.** A column typed `dint` (a domain over
  integer) renders as `dint` and no `dint + dint` operator exists; PostgreSQL
  resolves it as integer. `resolveDomainBaseTypeName` already does this.
- **Typmod is stripped.** A column renders `character varying(20)`; operator
  parameters carry no typmod. Compare `format_type(oid, null)`.
- **An unknown-typed literal is not an exact type.** `ty.i + 1` is fine (an
  integer constant is typed), a string literal is `unknown` and PostgreSQL has
  a separate rule for it. Fall back to tier 2 rather than implement that rule.

This is the same move the walk already makes with arity, and it inherits
the same soundness argument.

### Literals: what may be assumed, measured

A quoted literal is **not a string** in PostgreSQL's type system. `pg_typeof('a')`
answers `unknown`, and the SAME literal resolves differently by context —
measured: `coalesce('2020-01-01', <timestamp col>)` is `timestamp`,
`coalesce('2020-01-01', <text col>)` is `text`, `coalesce('{1,2}', <int[] col>)`
is `integer[]`. So an unknown literal is not a gap in OUR knowledge; PostgreSQL
does not consider it typed either.

That is why "no type, eliminate nothing" is the CORRECT model rather than a
concession: `unknown` is a wildcard, implicitly coercible to almost anything,
so it constrains no candidate. It can never COST a claim — only fail to
contribute one.

| A_Const node | assume | safe? |
|---|---|---|
| `ival` | `integer` | yes, always |
| `boolval` | `boolean` | yes, always |
| `fval` | INSPECT THE VALUE | node kind is not enough — see below |
| `sval` | `unknown` | **never assume `text`** |
| `isnull` (bare NULL) | `unknown` | same |

**`fval` is the sharp edge.** PostgreSQL's lexer emits `ival` only for values
fitting in int32 and spills everything else — including plain integers — into
`fval` as digit text. Measured: `2147483647` → `ival`/integer, `2147483648` →
`fval`/**bigint**, `9223372036854775808` → `fval`/**numeric**, `1.5` →
`fval`/numeric. So `fval` means "numeric-ish literal" and the digits must be
read to tell bigint from numeric.

**Assuming `sval` is text is UNSOUND**, not merely imprecise: it would
eliminate the timestamp candidate from `coalesce('2020-01-01', ts_col)`, which
is the one PostgreSQL picks. A false elimination is what the governing
invariant forbids.

Two of PostgreSQL's own rules are cheap and deterministic and worth taking:
a binary operator with ONE unknown operand gives it the other operand's type
(measured: settles 80 of the corpus's 129 unknown literals), and when ALL
inputs are unknown the resolution is `text` (which is why `'a' = 'b'` is
accepted and returns boolean).

### Tier 0: PREPARE's parameter types are an INPUT, and they collapse most vagueness

**Added 2026-08-06, and it reorders the whole design.** The main source of a
vague operand is an untyped parameter — and the consumer runs `PREPARE`
anyway, which reports the resolved type of every parameter. Measured:

| statement | parameters PostgreSQL reports |
|---|---|
| `SELECT ARRAY[1,2] \|\| $1` | `integer[]` |
| `INSERT INTO arrt (a) VALUES (ARRAY[1,2] \|\| $1)` | `integer[]` |
| `SELECT $1 \|\| 'x'` | `text` |
| `SELECT $1 + $2` | REJECTED — "operator is not unique" |

So a parameter is not an unknown to be modelled; it is a FACT to be read, from
the oracle this document already defers to. Feeding those types into the walk
makes `ARRAY[1,2] || $1` a tier-1 exact match on the array `||`, which is NOT
strict, so mechanism C correctly declines to attribute — closing
`NON_STRICT_OVERLOADS`' `||` entry precisely rather than approximately.

The last row matters as much as the others: where NOTHING determines the
types, PostgreSQL rejects the statement outright. The engine only ever
analyses statements PostgreSQL accepts, so the both-operands-vague case is
substantially rarer than it looks — which is the argument for keeping the
candidate-set machinery below small.

**This does not make the walk impure.** It stays a pure function; it gains an
optional argument, the way `buildNullabilityCatalog` gained `searchPath`. The
impurity — running PREPARE — lives in the consumer, which does it regardless
and which the arity-and-order gate already requires to hold a contract and a
PREPARE result at the same time. The walk must remain CORRECT without the
input, degrading to tier 1/2 on the AST alone, so that callers without a
database keep working and the engine's own purity property survives.

### A vague type is a candidate SET, not a type

When no exact type is available for an operand — a sublink, a `CASE` common
type, an unknown literal — tier 2 leaves a residual set whose members disagree
on return type. Measured for `+` with a known `integer` on the left and an
unknown right: FOURTEEN survivors returning EIGHT distinct types (bigint,
date, double precision, inet, integer, numeric, pg_lsn, real — `integer + date`
and `numeric + pg_lsn` are why the spread is wider than the numeric tower).

Carry that set rather than collapsing it to "unknown". The only question ever
asked of it is **"can ANY member reach parameter type P?"**, never "what is
it?" — so it needs no convergence, and it still does real work: none of those
eight reaches `path`, so a parent operator can discard `path + path` even
though its operand's type is vague.

It matters less often than it looks, for two reasons now. The elimination rule
is a CONJUNCTION over arguments — a candidate dies if ANY argument cannot reach
its parameter — so one exactly-known operand settles the whole call:
`(a + $1) + c` is decided by `c`. And with tier 0, `$1` is usually not vague at
all.

### Tier 3, optional and probably unnecessary: the receiver constrains the set

The tempting extension is to let an outer call narrow an inner one — `f` accepts
only `bigint`, so the inner's `text`-returning candidates are impossible.

**PostgreSQL itself does not resolve this way, measured.** With `ov3(integer,
integer) → bigint` and `ov3(integer, text) → text`, and `eat(bigint)`:

```
SELECT eat(ov3($1::integer, $2))   →   ERROR: function eat(text) does not exist
```

The inner resolved bottom-up to the `text` overload and the statement FAILED,
rather than reconsidering the `bigint` one that would have made it valid.
Expression resolution is bottom-up and assignment coercion applies to the
result afterwards.

That refutes it as a model of PostgreSQL, but not as an ENGINE rule, and the
distinction is worth keeping: PostgreSQL has ONE answer where the engine has a
SET, and for a statement PostgreSQL accepts the real answer must satisfy the
receiver. So discarding inner candidates that no surviving outer candidate can
accept is sound — it relies on the statement being valid, which the engine
already assumes everywhere.

It is nonetheless the last thing to build, if ever: it needs a constraint pass
rather than a bottom-up walk, and tier 0 removes most of what motivates it.
Recorded so the idea is not re-derived from scratch, with its soundness
argument and its cost attached.

### The prerequisite: pg_catalog SIGNATURES must reach the snapshot

**A first slice of this landed 2026-08-07, and it is a worked precedent for
the rest.** `unnest` of a POLYMORPHIC builtin's result — `array_agg(p)`,
`array_remove`, `array_cat` — needed the signatures to answer, so the 26
whose declared return is `anyarray`/`anycompatiblearray` are now captured with
their argument types as `CatalogSnapshot.builtinPolymorphicArraySignatures`,
ENVIRONMENT beside `builtinStrictFunctions`. It closes
`docs/precision-residue.md` item 4.

What that slice demonstrates for this document: the capture needed no consumer
and no search-path decision — the walk has taken `searchPath` as an argument
since the adversarial-2 fix phase, and the boundary in
`docs/generated-surface.md` is about how candidate RESOLUTION uses signatures,
which sweep-3 finding 6 already settled. The sequencing paragraph below should
be read as "resolve the candidate-set question", not "wait for a build".

**The full capture LANDED 2026-08-09.**
`CatalogSnapshot.builtinFunctionSignatures` — 153 claim-table names over 327
`pg_proc` rows, each row carrying per-signature strictness, `prokind`,
`aggkind`/`aggnumdirectargs` and the variadic type, which are the resolution
keys the three answered questions established — and
`builtinOperatorSignatures` — 21 symbols over 558 `pg_operator` rows, operand
and result types plus backing-function strictness, shell operators dropped by
the `pg_proc` join. ENVIRONMENT beside the seven sibling captures, out of the
diff by construction; the scope is imported from the claim tables themselves
(`snapshot.ts` ← the walk's exported tables and `operators.ts`, verified
cycle-free) so it cannot drift from the claims. **Captured but NOT read**:
nothing in the walk or adapter consults either field until this refactor
starts. Spot-pinned in `tests/unit/catalog/snapshot.test.ts` — both-ways
scope, `rank`'s two rows, `percentile_cont`'s four, `||`'s strictness
divergence, and `path + path` with `strict = true`, the in-data demonstration
that strictness is in the catalog and totality is not.

**Measured 2026-08-06, and it was the sequencing constraint for this whole
document — DISCHARGED by the capture above.** The snapshot then carried
user-schema signatures only — 69 functions and 5 operators for the fixture
schema, all `public`. pg_catalog was captured as NAME SETS
(`builtinFunctionNames`, 2726 names; `builtinStrictFunctions`; and siblings),
which answer "is this name strict?" and cannot answer "which overload is
`integer + integer`?". That is what made tier 1 unimplementable for BUILTIN
operators, and `+` and `||` — this document's two worked cases — are builtins.

**The capture is this document's own first slice, and it is not blocked on
anything.** An earlier reading had it waiting on "the consumer's search-path
input"; both halves of that are false, measured 2026-08-07. The search path is
already an INPUT to the engine — `buildNullabilityCatalog(snapshot, {
searchPath })`, with a documented default — and pg_catalog metadata already
reaches the snapshot as ENVIRONMENT in six captures
(`builtinStrictFunctions`, `builtinTableFunctions`,
`builtinSetReturningFunctions`, `builtinAggregateFunctions`,
`builtinFunctionNames`, `builtinPolymorphicFunctions`), one of which already
reassembles per-name SHAPES from `proargnames`/`proallargtypes`. What the
search path actually interacts with is how candidates are MERGED once
signatures exist, and finding 6 of sweep 3 settled that: unqualified lookups
gather candidates from every schema in the path, deduped by
`pg_get_function_identity_arguments`, with pg_catalog searched implicitly and
first.

**A seventh capture landed on 2026-08-07 and is the working precedent.**
`builtinPolymorphicArraySignatures` carries `(name, argument type names,
return type name)` for the pg_catalog functions and aggregates whose return is
a polymorphic ARRAY — read from `pg_proc` rather than curated, asserted
against the catalog in both directions, and ENVIRONMENT like its siblings so
it stays out of the diff. It exists to answer one question (the element type
of `unnest(array_agg(p))`) and it answers it by exactly the rule this document
needs at full scale: match the call's argument types against the signature's
polymorphic positions, then read the return type off the match. Roughly 30
rows. The remaining capture — 133 function names over 235 signatures, 21
operator names over 558 — is the same shape, wider, and `BuiltinSignature` is
the type to grow.

**The scope is far smaller than "all of pg_catalog", and that is the way
through.** Signatures are needed only for names the engine makes a CLAIM
about — every other builtin has no totality or strictness verdict to narrow, so
its overloads are never consulted. That is exactly the curated tables: 133
function names covering 235 signatures, and 21 operator names covering 558.
Under 800 rows, bounded, and ENVIRONMENT rather than schema — it changes with
the PostgreSQL version, never with a migration, so it belongs beside
`builtinStrictFunctions` and stays out of the diff for the same reason.

Each row needs `(name, parameter types, return type)` plus the backing
function's `proisstrict` for operators — the same shape `OperatorInfo` already
has for user operators.

### How much of the tree gets typed — measured

Over 411 statements (the fixture corpus plus the grammar sampler), 1592
operator and function ARGUMENT positions, which are the places a type is needed:

| where the type comes from | share |
|---|---|
| catalog — a column reference | 71.0% |
| exact — a typed literal, a cast target, a row/boolean-valued node | 12.5% |
| recursion — an operator, function call or subquery below it | 4.0% |
| PREPARE — a parameter (tier 0) | 1.8% |
| **UNKNOWN — a string or NULL literal** | **8.1%** |
| **needs common-type resolution — ARRAY, COALESCE, CASE** | **1.4%** |

**90.5% is typeable from catalog + PREPARE + recursion.** Of the unknown
literals, 80 of 129 sit OPPOSITE a typeable operand, where PostgreSQL's own
rule — one unknown operand of a binary operator takes the other's type — settles
them deterministically and cheaply. Implementing that one rule takes the total
to roughly 95%. The residue is 44 unknown literals in FUNCTION-argument
positions (which need the category/preferred-type rule this document still
declines), 22 common-type constructs, and 5 literals with nothing typed
opposite them.

None of that residue is a failure mode: an untyped operand degrades to tier 2's
candidate set, which answers the property question whenever the survivors
agree. Filling the whole tree is a stronger goal than the engine's purpose
requires — it needs a type only where candidates DISAGREE about totality or
strictness.

### The three pre-refactor questions, ANSWERED (2026-08-09)

Measured against PGlite 18.3 and pinned as executable assertions in
`tests/unit/query/overload-resolution-mechanism.test.ts` — that suite is this
section in `param-mechanism.test.ts`'s shape, PostgreSQL only, no engine.

- **Operator shadowing under `search_path`: tier 1 closes it ONLY IF the
  candidate set merges path-visible user operators with the pg_catalog
  signatures** — a pg_catalog-only lookup inherits it. The measured gathering
  rule is the function side's (adversarial-3 finding 6), now confirmed for
  operators: the path is a VISIBILITY filter (an operator is a candidate iff
  its schema is on the path, position irrelevant); an exact match in a later
  schema beats a polymorphic candidate in an earlier one; position decides
  only ties between IDENTICAL signatures, earliest first, with pg_catalog
  implicitly FIRST unless the path names it later (a user duplicate of
  `+ (integer, integer)` wins `1 + 2` under `search_path = s1, pg_catalog` —
  measured). The blind spot is meanwhile a live rank-1, demonstrated: a user
  `+ (boolean, boolean)` in `public` whose function returns NULL from
  non-null inputs gets `notNull` claimed for `b1 + b2` over NOT NULL columns,
  because the walk consults `TOTAL_OPERATORS` by bare name BEFORE
  `resolveOperatorMetadata`; the same operator under a non-curated name or as
  `OPERATOR(public.+)` correctly reads nullable. So the refactor's ordering
  obligation: consult the merged candidate set FIRST; the curated tables
  become the property source for builtin signatures, never the dispatch.

- **Aggregates and window functions: three separate rules, none of them the
  scalar exact match.** (1) An ordered-set aggregate's pg_proc signature
  INCLUDES the ORDER BY types — `percentile_cont`'s four rows differ only in
  the position after `aggnumdirectargs`, and the ORDER BY expression's type
  picks the row (`… (ORDER BY interval_col)` returns `interval`, measured) —
  so the WITHIN GROUP type key is direct args ++ `agg_order` types, and an
  exact match ignoring `agg_order` picks a wrong row or none. A plain
  aggregate's ORDER BY (`agg_order` WITHOUT `agg_within_group`) is NOT part
  of the key. (2) The hypothetical-set family (`rank`, `dense_rank`,
  `percent_rank`, `cume_dist`) resolves by call SHAPE, not by types: each
  name is one window row plus one `aggkind='h'` row declared `VARIADIC
  "any"`, the shapes are mutually exclusive (bare `rank()` demands OVER;
  `WITHIN GROUP … OVER ()` is an error), and the direct arguments are
  unified with the ORDER BY types, contributing nothing (`rank('a') …
  ORDER BY int_col` fails coercing `'a'` to integer). (3) `VARIADIC "any"`
  admits every argument untouched (`concat(int, text, interval)` keeps each
  type), so such a candidate can never be eliminated by argument type and
  never exact-matched; where it overlaps a fixed-arity row (`format`),
  consensus over both is the sound reading. FILTER, DISTINCT and `*` are
  orthogonal — `agg_filter`/`agg_distinct`/`agg_star` sit beside `args` and
  resolution ignores them.

- **Domain-following generalises, with one ordering caveat and one
  polymorphic exception.** The base-resolution rule holds for every base
  measured — text, varchar (two hops: domain smash, then binary coercion),
  numeric, integer, NESTED domains (recursive smash), arrays (both `||`
  overloads), ranges, constrained domains (CHECK and NOT NULL never join
  resolution), cross-domain numeric towers. But the smash is the FALLBACK,
  not the first step: a candidate declared ON the domain type exact-matches
  the domain and WINS — `+ (dint, dint)` beats integer's builtin, `gd(dint)`
  beats `gd(integer)` for a domain argument, and a base value coerces
  implicitly INTO a domain parameter. So tier 1 tries exact match on the
  DECLARED types against the merged candidate set first, and canonicalises
  only when that finds nothing. For a pg_catalog-only lookup
  canonicalise-first stays safe — no builtin takes a user domain. And the
  polymorphic families all admit a domain over their required structure
  EXCEPT `anyenum` (`denum = denum` is "operator does not exist" while
  `lower(domain-over-range)` resolves — this document's `lower(anyrange)`
  example survives). For the elimination rule the asymmetry is safe in the
  only direction that matters: admitting a domain generously can only
  RETAIN a candidate PostgreSQL discarded, never eliminate one it ran.

### Tier 2's consensus quantifier is per-PROPERTY, not global

`every` is the right quantifier for TOTALITY and the wrong one for
STRICTNESS, and the difference is which way each property fails.

- **Totality**: claiming total when a survivor is not is UNSOUND (a wrong
  notNull). Consensus with `every` under-claims, which costs precision only.
- **Strictness**: it is the ABSENCE of the claim that hurts. Mechanism C uses
  strictness to predict a raise; not claiming strict where PostgreSQL is
  strict makes the emitted contract ADMIT a binding that raises — a lie about
  a call that fails. Claiming strict where it is not merely reads a parameter
  as non-nullable where NULL would have been accepted.

So tier 2 takes `every` for totality and `some` for strictness. This is not a
new principle: it is `builtinSetReturningFunctions`' `bool_or` argument
(2026-08-05) and the reason `TOTAL_OPERATORS` and `STRICT_OPERATORS` became
two sets (2026-08-06) — measured, when dropping `||` from the strict set made
the generated corpus admit three bindings PostgreSQL rejects.

Tier 1 needs no quantifier at all: one candidate, read its flags.

### The governing invariant

> **Eliminate a candidate only on certainty. Anything unrecognised keeps
> the candidate.**

A false elimination is UNSOUND. A false retention is merely imprecise. That
asymmetry is what makes an incomplete coercion model safe to ship: every
type family nobody has studied degrades to today's behaviour rather than to
a wrong answer. It is the rule to check any future change against.

### Where types come from — a closed list

Read from the catalog, never inferred:

- a **column reference** — `resolveColumnTypeName`, already used by the
  `unnest` element resolver;
- a **cast** — the target type as written;
- a **function call** — its return type, by consensus across candidates.

Explicitly NOT available, and each degrades to "no type, eliminate
nothing": operator results, `CASE`/`COALESCE` common types, unknown-typed
literals, and the result of an implicit coercion.

**Operator results DO have a type, via tier 1** — corrected 2026-08-06, after
two wrong answers. The closed list above excludes them, which was right only
under the tier-2-only design: there, `a + b` yields five possible return types
and no consensus, so `(a + b) + (c + d)` loses its claim. Two remedies were
proposed and both were wrong — "take the return type by consensus across
survivors" (there is none) and "carry the SET of survivor return types" (sound,
but solving a problem that need not exist). Under tier 1 an operator whose
arguments resolve exactly HAS an exact return type, and the nesting composes
with no new machinery at all.

The exclusion therefore stands only for operands tier 1 cannot resolve, where
it means what it always meant: no type, eliminate nothing, degrade to today's
behaviour. `CASE`/`COALESCE` common types and unknown-typed literals stay
excluded outright — those need the common-type resolution this document still
refuses to implement.

### The elimination rule

Drop candidate C at argument position *i* with known type T and parameter
type P iff none of these hold:

1. T and P are identical;
2. P is **polymorphic** and admits T — a predicate, not a lookup:
   `anyrange` admits `typtype='r'`, `anyarray` admits arrays, `anyelement`
   admits anything, and the `anycompatible*` family admits anything (its
   cross-argument unification is out of scope, so it never eliminates).
   Domains count as their base for this predicate — measured 2026-08-09:
   every family admits a domain over its required structure except
   `anyenum`, and admitting one there anyway is a safe over-retention;
3. T is a **domain** whose base satisfies this rule — normalise first;
4. T and P are both **arrays** and their element types satisfy this rule;
5. `pg_cast` holds a direct row T→P with `castcontext = 'i'`.

Plus: **T is `unknown` eliminates nothing.**

Two properties measured and worth knowing:

- **IMPLICIT only.** Function arguments do not use assignment casts.
  `bigint → integer` is assignment, `bigint → numeric` is implicit.
- **No transitivity.** PostgreSQL does not chain casts, so this is a direct
  lookup, not a reachability search. `bool → int4` exists (explicit),
  `bool → numeric` does not, and `f(bigint)` REJECTS `true` (measured).

`pg_cast` is small: **117 implicit** rows, 77 assignment, 41 explicit.

### Worked examples, all measured

```
lower(t)   t is text        (text) identity; (anyrange)/(anymultirange) admit no text
                            -> one candidate, total          -> notNull   RECOVERED
lower(r)   r is int4range   (anyrange) admits it; (text) has no cast from a range
                            -> one candidate, not total      -> nullable  CORRECT

f(int,int) / f(numeric,numeric)  called with bigint
   bigint->int is ASSIGNMENT (dropped); bigint->numeric is implicit
   -> one survivor. PostgreSQL agrees. No tiebreak needed.

g(bigint) / g(double precision)  called with int
   both implicit -> BOTH SURVIVE. PostgreSQL picks float8 by preferred type.
   -> we do not tiebreak; consensus over both. Both total -> notNull.
      They disagree -> nullable. Sound either way.
```

The last line is the cost, stated: where survivors disagree on totality we
lose a claim the tiebreak would have kept. Numeric-tower overloads almost
always agree, so it is cheap in practice.

## Non-goals

- **No type inference.** The closed list above is the whole source of
  types.
- **No tiebreak algorithm.** Rules 4–8 read `typispreferred` (8 types) and
  `typcategory` (15 categories); `round(1)` resolves to `double precision`
  and no cast table will tell you that. Implementing it is a different
  project with a much worse risk profile.
- **No polymorphic RETURN types.** `lower(anyrange)` returns `anyelement`,
  whose real type is unification. A polymorphic call therefore yields no
  type to thread onward, and that degradation is expected.
- **Types never leave the engine.** They are a narrowing aid. The consumer
  gets types from `PREPARE`, which stays authoritative — if we ever
  disagree with it, it wins.

## What must change

1. **Snapshot** — `pg_cast` (implicit rows), and whatever `pg_type` needs
   for the polymorphic predicate (`typtype`, element type of arrays).
   ENVIRONMENT facts, like `builtinStrictFunctions`: a property of the
   PostgreSQL version, absent from the diff. **LANDED 2026-08-09**:
   `builtinImplicitCasts` (117 rows, with the binary flag that marks the
   canonicalisation edges — the graph is two-way, `text ↔ varchar`, so
   canonicalisation tries images) and `builtinTypeKinds` (every pg_catalog
   name → typtype; array elements need no capture, the `[]` rendering
   carries them). Pinned in `tests/unit/catalog/snapshot.test.ts`.
2. **Catalog adapter** — a coercibility accessor implementing the five
   clauses, plus the array/domain normalisation. **LANDED 2026-08-09** as
   the `OverloadCatalog` face: `mayCoerceImplicitly` (false only on
   certainty), `resolveCanonicalTypeName` (recursive domain smash, the
   FALLBACK key per the answered third question),
   `resolveBinaryCoercionTargets`, and the two builtin signature lookups.
   Deliberately a SEPARATE interface from `NullabilityCatalog`
   (`OVERLOAD_CATALOG_ONLY`, the `DEP_CATALOG_ONLY` pattern): the census
   demands a fixture for every walk-facing member, so each member moves
   over exactly when step 3 makes the walk consult it.
   `tests/unit/query/coercibility.test.ts` asserts every clause from both
   sides — the elimination side is what the invariant polices.
3. **The walk** — thread the known argument types into candidate
   selection; narrow; leave consensus untouched. This touches the hottest
   path, so the corpus dry-run discipline the fix phases used applies.
4. **The tables, re-keyed to SIGNATURES — all seven, plus the two operator
   sets. Decided 2026-08-09: aggregates and window functions are NOT
   exceptions.** This is the real cost: the three scalar tables AND
   `NON_NULL_OVER_NONEMPTY_AGGREGATES`, `NEVER_NULL_WINDOW_FNS`,
   `HYPOTHETICAL_SET_AGGREGATES`, `ORDERED_SET_AGGREGATES` go from 153 name
   entries to **327 signature entries** (the capture's live count), each
   needing its own verdict rather than inheriting one;
   `TOTAL_OPERATORS`/`STRICT_OPERATORS` likewise against `pg_operator`'s
   operand types, 21 symbols over 558 rows. Call shape (`agg_within_group`,
   OVER) is part of candidate GATHERING, not an exemption from signature
   keying: a hypothetical-set call narrows to its one `aggkind='h'` row by
   shape and is then the ordinary single-candidate case — read that row's
   verdict; an ordered-set call's exact-match key appends the `agg_order`
   types to the direct arguments; window overloads (`lag`'s one-, two- and
   three-argument forms, whose out-of-frame results differ — NULL versus
   the supplied default) key on their argument types like any scalar.
5. **User function overloads come free** — the same arity-then-consensus
   path serves them, so `over_fn`, `clean2`, `tag_of` and `ship` improve
   with no extra code, and want the same fixtures.

## The witness corpus

Per-overload evidence, in the fixture suite's shape.

```
tests/unit/functions/<function-name>/
    schema.sql          optional, only where a witness needs data
    <slug>.sql          one per overload
```

The filename is a human slug; the authoritative key is a directive inside,
validated against `pg_proc` to resolve to exactly ONE function — so a
removed or re-typed overload fails loudly on a PostgreSQL upgrade instead
of silently testing nothing.

```sql
-- @signature anyrange
-- @null   lower('empty'::int4range)   the refutation
-- @value  lower(int4range(1, 5))      the control: same overload, ordinary input
```

**Polarity.** A witness is a POSITIVE, checkable claim: *this overload can
return NULL*. Absence of a witness asserts nothing — the engine's default
is already conservative nullable, so it costs nothing. We never infer
totality from a missing file.

**The control line is required.** It stops a fixture passing for a boring
reason (malformed expression, wrong overload resolved) and shows the reader
where the boundary is. It is also the "normal inputs" half: a corpus of
only extremes tests only extremes.

**Three witness constructions, because there are three totality
questions** — and the corpus will quietly cover only the first unless this
is stated: a scalar function's NULL comes from its inputs; an aggregate's
from empty input (needs a FROM, hence `schema.sql`); a window function's
from an empty frame.

**What the suite asserts:**

1. every `@signature` resolves to exactly one `pg_proc` entry;
2. the witness returns NULL;
3. the control returns a value — a witness that stops witnessing is a
   FAILURE, not a pass (the query suite's liveness bar);
4. no signature with a witness appears in a totality table, unless it
   carries a recorded reason;
5. a coverage report: signatures witnessed, curated signatures with no
   evidence either way.

**Cost.** Most witnesses are pure expressions and share one PGlite;
only directories declaring a `schema.sql` get their own. State-major, as
`docs/witness-coverage.md` describes, for the reason `AGENTS.md` rule 6
gives.

**Discovery.** An adversarial probe — calling each curated signature across
the input classes that have historically broken them (NaN, ±infinity, empty
string, no-match, empty array, empty format, empty range) — is a TOOL run
occasionally, like a sweep, not a standing test. Its output is candidate
witnesses a human reviews into fixtures. Measured: that corpus re-finds
every historical failure, all seven. Because the durable artifact is the
fixture, the probe's value generator never has to be complete.

## Boundaries — do not re-derive these

- **Totality is not in the catalog.** `proisstrict` is STRICTNESS — "NULL
  in gives NULL out" — and 2549 of 2726 builtin names have it, so it is no
  proxy. Totality lives only in the implementations.
- **Static analysis of PostgreSQL's C source is a measured dead end.** It
  was built and discarded (2026-08-05). A scan for `PG_RETURN_NULL` in an
  entry point gave **2 false negatives in 8** on a hand-picked sample —
  the unsound direction — because thin wrappers delegate to `_common`
  helpers. Beyond detection there are three other NULL routes in the same
  tree (24 `isnull` assignments, 346 `DirectFunctionCall` sites whose
  callee's flag propagates, 85 SRF/tuplestore sites), and beyond THAT the
  real barrier is reachability: `mod`'s `PG_RETURN_NULL` follows an
  `ereport(ERROR)` and is dead, `concat`'s is live but only under the
  VARIADIC protocol. Separating those needs a PostgreSQL-aware
  interprocedural analyzer. It also needs the source tree, which the
  package does not and will not ship. Runtime gives everything the scan
  gave that was reliable.
- **An incomplete coercion model is safe**, by the governing invariant. Do
  not gate the work on covering every type family.
- **Unknown literals eliminate nothing**, so `lower('abc')` stays nullable
  while `lower(text_column)` becomes notNull. A deliberate, recorded
  asymmetry, not an oversight.

## Open questions

- **Type families not yet measured for the elimination rule**: composite
  and enum arguments, multirange, ranges over domains. Each degrades safely
  today; measure before claiming coverage.
- **The 235 verdicts** — who makes them, in what order, and against what
  evidence. The witness corpus is what makes them reviewable; the honest
  path is probably "the curated set first, everything else stays out of the
  tables".
- **Whether the corpus extends past the curated set.** Witnesses for names
  nobody claims total are free evidence for later, and dead weight now.

## Where things are

| | |
|---|---|
| The walk, priority 6b and the consensus rule | `src/query/nullability-walk.ts` |
| Curated tables | `nullability-walk.ts` (three), `src/query/operators.ts` |
| Candidate selection, arity filter | `src/query/catalog-adapter.ts` |
| Column/cast type accessors already in place | `resolveColumnTypeName`, `resolveColumnTypeOid` |
| Snapshot, where `pg_cast` would land | `src/catalog/snapshot.ts`, `src/catalog/types.ts` |
| Fixture suite design and its discipline | `docs/witness-coverage.md` |
| Suite blind spots, the sibling item | `docs/generated-surface.md` |
| The audit that triggered this, and its limits | `docs/deferred-tasks.md` section 2 |
| The `lower`/`upper` falsification, pinned | `tests/unit/query/fixtures/builtin-range-lower-upper.sql` |

Run from `pgsid/` with `npx vitest run`; installs use `pnpm`.
