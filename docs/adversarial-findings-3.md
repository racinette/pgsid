# Adversarial sweep 3 — findings

## What this document is

The report of the targeted graybox sweep specified in
`docs/adversarial-sweep-3.md`: ~215 probes over 16 rounds aimed at the ten
fixes the second fix phase landed on 2026-08-05 and at the five mechanisms
added the same day the charter was written. ~155 of those probes ran
`inferQueryContract` on a statement AND executed that same statement against
inline-seeded data in one PGlite, compared per the first sweep's rank table;
the remaining ~60 are oracle-only measurements (which DDL PostgreSQL
accepts, which builtins return NULL, what `diffCatalogs` reports for a
constructed schema change). PGlite is the referee throughout; every
behavioural claim below was measured, not read off documentation.

**Eight findings.** Five statements carry a wrong `notNull` (findings 1, 2,
3, 5, 6); four are shape defects (3, 5, 6, 7), three of which also produce
that wrong flag; two are rank-7 register material (4, 8). **Zero rank-5
(parity)** and **zero rank-6 (crash)**: the traced and untraced walks agreed
on columns, groups, and refusal sites in every probe, including the new SRF
padding entry, the grouping-set scope build, the composite-star arms and
every refusal — the third sweep in a row with that result. Nothing threw
outside `UnsupportedNodeError`.

**The yield is materially lower than sweep 2's**, and section 5 says what I
think that means. Sweep 2 found 13 in ~120 comparison probes; this sweep
found 8 in ~155, and **three of the eight are not in the surface it was
chartered against** — findings 5 and 7 are pre-existing code both prior
sweeps walked past, and finding 6 is in the search-path merge written the
day the charter was. Of the five in the chartered surface, two are the same
hand-curated-table failure the charter predicted by name.

The charter's two named suspects both landed, in the shapes it predicted:
`BUILTIN_SRF_NAMES` is unfalsifiable-by-construction exactly as
`ALWAYS_NOT_NULL` was (findings 1 and 2), and section A's "rest" — the part
nobody had touched — produced the sweep's widest defect (finding 6). The
sections the fix phase had just rewritten with its own eyes on them
(D grouping sets, G partitioned hooks, I diff completeness, J parity) came
back **clean across 55 probes**, which is a result in its own right and is
recorded in section 4.

Each finding has a quarantine fixture in `tests/unit/query/fixtures-adversarial/`
carrying the claims the engine CURRENTLY makes, plus a header with the
falsifying data, the observed outcome, and the suspected mechanism. The DDL
those fixtures need is `fixtures-adversarial/schema-adversarial.sql`; it is
deliberately NOT folded into `fixtures/schema.sql`, because the fixtures
beside it record wrong claims — and because one of them (`public.json_each`)
would change what `builtin-table-function-shape.sql` asserts. The full suite
is green as of this writing: 2126 tests, 37 files.

Nothing was fixed. Section 3 proposes fixes with blast radius and an order.

**Status: the fix phase ran (2026-08-05) and closed all eight findings**, in
section 3's recommended order, with two deviations recorded here:

- **Fix 5 widened before it refused.** The sketch's residue — "a function
  return value, an aggregate expression" — would have refused
  `unnest(string_to_array(…))` and every other scalar array whose type the
  walk could not see, which is the common case protecting the rare one. The
  element type is now asked of the catalog everywhere the catalog can
  answer: a domain followed to its base, a user function's declared return
  type by consensus, a CTE/subquery column followed to the base column it
  re-exports, a slice, and `||`/COALESCE through their operands. What
  refuses is what needs type inference the walk does not do — a POLYMORPHIC
  builtin, an aggregate, a sublink, a computed derived-table column, an
  ARRAY constructor over an expression. That needed two new environment
  facts (`builtinFunctionNames`, `builtinPolymorphicFunctions`), the first
  of which fix 3 needs anyway.
- **Fix 1 took the preferable half of its (b).** `proretset` is read into
  `FunctionInfo` and the rendered-string test is gone, rather than kept and
  noted.

Everything else landed as sketched. The quarantine directory is retired:
every fixture graduated into `tests/unit/query/fixtures/` with corrected
claims and witnesses, the DDL folded into the fixture schema, the pg_catalog
precedence pinned in `search-path.test.ts` (it needs a second catalog the
fixture harness cannot build) — including the configuration where the user
function wins and the engine drops the claim anyway, recorded as a cost —
and the new `unnest` refusal class pinned in `unsupported-nodes.test.ts`
with its own positive control, so the refusal is not blanket. The register's
"LCM" wording is corrected to max-with-padding at both sites that carried
it. A post-fix AUDIT of what the eight left behind found five more defects of
the same families and closed them: an array of a TABLE's ROW TYPE, a
schema-qualified star unable to pick its relation out of a duplicate-named
scope, an ARRAY constructor over an expression, a composite array staged
through two CTEs, and `(p).*` over a USING-merged composite column — the
last of which this report filed with finding 4's family, wrongly. A
second pass, prompted by the question "what does the rendered string
actually lose?", closed fix 7's STRUCTURAL half too — and found it was
never hypothetical: a user function declared with OUT parameters, and a
single-output `RETURNS TABLE(r <composite>)`, are four more live wrong
shapes. The register carries all of them with what remains open beside.

Suite: 2257 tests, 37 files, 335 fixtures; the generated corpus's 8980
queries moved by nothing — which is itself the finding behind
`docs/generated-surface.md`. The per-fix closure entries are in
`docs/deferred-tasks.md` section 2. This document remains the sweep's
report, unmodified below this line.

---

## 1. Findings

| id | rank | claim vs reality | fixture |
|---|---|---|---|
| 1 | 1 | an SRF the name table does not list scores the target list at ONE set-returning call, so the padding rule silently does not apply — to either entry | `srf-padding-unlisted-builtin.sql` |
| 2 | 1 | an OVERLOADED user SETOF function is invisible to the padding rule: set-returningness is asked through the single-candidate shortcut | `srf-padding-overloaded-user-fn.sql` |
| 3 | 2→1 | a composite-element array reaching `unnest` by any spelling outside the enumerated three contributes ONE column against PostgreSQL's N | `unnest-composite-spellings.sql` |
| 4 | 7 | a DOMAIN over a composite is "not a composite" everywhere: two sites refuse legal SQL, a third answers one column | `composite-domain-refusal.sql` |
| 5 | 2→1 | `schema.table.*` — a THREE-part star PostgreSQL accepts — expands the whole scope instead of that relation | `qualified-star-schema-prefix.sql` |
| 6 | 1 + 2 | pg_catalog is searched IMPLICITLY and FIRST; the engine's rule is that a user function of the same name always wins | `pg-catalog-shadowed-function.sql` |
| 7 | 2 | a QUOTED column name in a rendered `TABLE(…)` result is split at its first space | `return-table-quoted-colname.sql` |
| 8 | 7 | the unreferenced-CTE gate drops mechanism A, which is BIND-time and raises whether or not the subtree runs | `param-unreferenced-cte-mechanism-a.sql` |

Findings 3, 5, 6 and 7 are shape defects. Three of them (3, 5, 6) also
produce a live `notNull` falsification, because the misalignment lands a
non-null flag on a column that comes back NULL — measured in each case, not
argued. Finding 7 is arity-preserving and NAME-only: the third instance this
project has met of the ordered-name gate (register section 1) being the only
guard that can see a defect.

### 1.1 Detail

**Finding 1 — rank 1.** `BUILTIN_SRF_NAMES` (`nullability-walk.ts:6909`)
lists 21 names. PG18's `pg_catalog` holds 71 set-returning functions once
the `pg_stat*`/`pg_ls*` families are set aside (109 counting them), so **50
are absent** — including `jsonb_path_query_tz`, the direct sibling of the
listed `jsonb_path_query`, plus `pg_get_keywords`, `pg_timezone_names`,
`pg_options_to_table`, `aclexplode`, `pg_partition_tree`, `ts_token_type`,
`pg_config`, `pg_available_extensions`, and the whole `pg_logical_slot_*`
family.

The damage is not where the table's usual "bounded coverage" deal puts it.
A missing name costs the UNKNOWN call nothing — it had no precision to lose
— but `srfPaddedTargets` (`:672`) returns null below a count of two, so one
unlisted SRF **turns the rule off for the entire target list**, and the
KNOWN call keeps a `notNull` PostgreSQL pads away:

```sql
SELECT one_sku() AS s, jsonb_path_query_tz('[1,2,3]'::jsonb, '$[*]') AS j
-- engine: s notNull; PostgreSQL: ("only",1), (NULL,2), (NULL,3)
```

Five distinct unlisted builtins were measured in this shape, all falsifying.
The listed sibling `jsonb_path_query` is the control and is correctly
nullable. Recorded separately, because it bears on the fix: PG18's lockstep
is **max-with-NULL-padding, not LCM cycling** — `generate_series(1,3)` beside
`generate_series(1,6)` gives six rows with three NULLs, not a cycled 3.
The closure entry describes it as LCM; the fix is conservative under either
reading, but the register's wording is wrong.

**Finding 2 — rank 1.** `isSetReturningCall` (`:713`) asks
`resolveFunctionMetadata`, which is the SINGLE-CANDIDATE shortcut and
answers null for any overloaded name, then falls through to
`BUILTIN_SRF_NAMES`, where a user function's name can never appear. So two
overloads of one SETOF function are invisible to the padding rule — while
remaining perfectly visible to the `notNull` rule, which takes return-type
CONSENSUS over the same candidates and reads both overloads' NOT NULL domain
return:

```sql
SELECT ov_sku(1) AS o, generate_series(1, 3) AS g
-- engine: o notNull; PostgreSQL: ("ov1",1), (NULL,2), (NULL,3)
```

This is sweep 2's own headline lesson one generation on: the candidate SET
was made complete for the flag rules and the shape rule, and this site still
asks the question that cannot see a set. Set-returningness is a property
every candidate here SHARES, so consensus answers it exactly.

**Finding 3 — rank 2, amplified to rank 1.**
`unnestCompositeElementFields` (`:3360`) recognises three spellings that
carry an element type statically. Six more were measured, each contributing
one column against PostgreSQL's two:

| spelling | why it falls through |
|---|---|
| `unnest(<domain over sku_pair[]>)` — cast | `TypeCast.typeName.arrayBounds` is empty for a domain name |
| `unnest(h.dpairs)` — the same domain as a column | `resolveColumnTypeName` renders `sku_pair_arr`, not `T[]` |
| `unnest(h.dompairs)` — `d_sku[]`, a domain as the ELEMENT | renders `d_sku[]`, and `resolveCompositeType` has no domains (finding 4) |
| `WITH w AS (…) SELECT * FROM w, unnest(w.pairs)` | the ColumnRef branch needs `owner.table`, which a CTE entry lacks |
| `SELECT * FROM (SELECT pairs FROM …) s, unnest(s.pairs)` | same |
| `unnest(mk_pairs())` / `unnest((SELECT array_agg(…)))` | not a TypeCast, A_ArrayExpr or ColumnRef at all |

A VIEW re-export is NOT affected — views live in the same table map, which
is why the shape held there and made the CTE case look safe.

The amplification is measured, not argued:

```sql
SELECT * FROM pair_holder h, unnest(h.dpairs), u
-- PostgreSQL: [id, pairs, dpairs, dompairs, sku, qty, id, t_id, email, val, status]
-- engine:     [id, pairs, dpairs, dompairs, unnest,   id, t_id, email, val, status]
```

Everything past the item shifts by one, and the engine's `notNull` at what
it calls `u.id` lands on PostgreSQL's `qty`, which the seed makes NULL.

**Finding 4 — rank 7 (over-refusal), two sites.**
`NullabilityCatalog.resolveCompositeType` is backed by
`snapshot.compositeTypes`, whose query is `typtype = 'c' AND relkind = 'c'`
(`snapshot.ts:1279`) — base composite types only. A DOMAIN over a composite
is therefore "not a composite" everywhere the engine asks, and the callers
respond differently to the same blindness:

- `SELECT (ROW('a',1)::d_sku).*` — `expandCompositeStar` REFUSES; PostgreSQL
  emits `[sku, qty]`.
- `SELECT * FROM unnest(ARRAY[ROW('a',1)::d_sku])` —
  `unnestCompositeElementFields`'s provably-composite arm REFUSES; PostgreSQL
  emits `[sku, qty]`.
- `SELECT * FROM pair_holder h, unnest(h.dompairs)` — the non-ROW arm falls
  through to ONE column. (That instance is a wrong SHAPE and rides with
  finding 3; the cause is here.)

Both refusals are the correct RESPONSE to a wrong PREMISE. Following the
domain to its base type answers all three, and needs nothing about the
domain's own constraint: the fields are forced nullable at both sites
anyway.

**Finding 5 — rank 2, amplified to rank 1.** `expandStar`'s qualified branch
tests `fields.length === 2` (`:2922`). A schema-qualified star —
`public.t.*`, which PostgreSQL accepts — arrives as `[String, String,
A_Star]`, falls through to the UNQUALIFIED branch, and expands **every
visible column in the scope**:

```sql
SELECT public.t.* FROM u, t
-- PostgreSQL: [id, name, val, active]                (4 columns)
-- engine:     u's five, then t's four                (9 columns)
```

The engine's position 2 — claimed notNull, named `email` — is PostgreSQL's
`val`, NULL on the second seeded row. It is invisible whenever exactly one
relation is in scope, which is why every `t.*` fixture in the suite passes
over it, and it blows the shape open as soon as a second one is. Measured in
four placements (plain FROM, under a JOIN, inside a CTE body, re-exported
through a star); DML `RETURNING public.t.*` is unaffected — that path builds
a single-relation scope. `groupingOrdinalPositions` (`:6676`) carries the
identical `fields.length === 2` test, so a grouping-set ordinal over such a
star resolves against the same wrong position list.

Pre-existing code. Both prior sweeps missed it; so did the fixture suite,
the generated corpus, and the census.

**Finding 6 — rank 1, and rank 2 at the FROM site.** Every builtin table in
the engine is documented as "consulted only where the user catalog has no
candidate, so a user function of the same name still wins" — the priority-6b
gate (`:6153`), `resolveBuiltinFunctionShape` (`catalog-adapter.ts:541`),
`isStrictBuiltin`. **PostgreSQL's rule is the opposite.** `pg_catalog` is
searched implicitly and FIRST unless it is named in the path, so for an
identical signature the builtin HIDES the user function:

```sql
CREATE FUNCTION public.min_scale(v numeric) RETURNS non_empty_text …;
SELECT min_scale('NaN'::numeric);
-- PostgreSQL: NULL, and pg_typeof(…) is `integer` — pg_catalog's ran
-- engine: notNull, from the user function's NOT NULL domain return
```

Measured both directions: under `search_path = public, pg_catalog` — the
configuration nobody uses — PostgreSQL runs the user's and returns `'user'`,
and the engine's answer is right. Three mechanisms reached, mirroring the
sweep-2 search-path conviction exactly one level up:

- the flag: `min_scale`, `to_number` — both falsified;
- the SHAPE: `SELECT * FROM json_each('{"k":"v"}'::json)` with a user
  `json_each(json) RETURNS SETOF sku_pair` in place gives `[sku, qty]`
  against PostgreSQL's `[key, value]`;
- and it is not limited to identical signatures — a user `lower(integer)`
  makes `lower(NULL::text)` read notNull, because `candidatesInPath`
  (`catalog-adapter.ts:277`) returns the user's overload as the SOLE
  candidate and pg_catalog's is not in the set at all.

**Finding 7 — rank 2.** `columnsForReturnType` (`:3449`) parses the string
`pg_get_function_result` renders and splits each `TABLE(…)` part at
`trimmed.indexOf(" ")` (`:3460`). A quoted identifier containing a space
splits inside the quotes; one without keeps its quote characters:

```sql
CREATE FUNCTION q_cols() RETURNS TABLE("my col" integer, "Upper" text, plain text) …;
SELECT * FROM q_cols()
-- PostgreSQL: ["my col", "Upper", "plain"]
-- engine:     ["\"my",   "\"Upper\"", "plain"]
```

Type MODIFIERS are safe — the renderer drops them (`numeric(10,2)` renders
`numeric`, `character varying(4)` renders `character varying`), so
`splitTopLevel`'s comma handling is never stressed. Identifier quoting is
the whole defect. `queryBuiltinTableFunctions` assembles its shapes with
`quote_ident` (`snapshot.ts:1157`), so the same parser would mis-read a
builtin with such a name; none exists in PG18, which makes that half latent
rather than live.

**Finding 8 — rank 7 (a dropped claim).** `visitStatementWithCtes`
(`param-nullability.ts:869`) sends an unreferenced non-DML CTE to
`visitSeenOnly` (`:929`), which collects parameter NUMBERS and nothing else.
The closure entry's argument — "a non-data-modifying CTE nobody references
is never executed in ANY state" — is TRUE, and I re-measured it holding even
for `MATERIALIZED` (`WITH a AS MATERIALIZED (SELECT 1/0) SELECT 2` returns
2). It licenses dropping the EXECUTION-TIME mechanisms. Mechanism A is not
one of them: it is BIND-time and position-blind, which the register pins
elsewhere, and it raises regardless:

```sql
WITH a AS (SELECT $1::non_empty_text AS z) SELECT 1 AS x   -- $1 = NULL
-- PostgreSQL: raises `domain non_empty_text does not allow null values`
-- engine: $1 nullable
```

Three shapes measured identical (plain unreferenced, `NOT MATERIALIZED`, and
a CTE referenced only from another unreferenced CTE). Sound — the contract
promises only that claims mean raises — so this is register material, but it
is a claim the engine held BEFORE the sweep-2 fix and holds no longer, and
the argument for dropping it is measurably wrong for this mechanism. The gate
gated the WALK where it meant to gate the MECHANISMS.

---

## 2. Root causes

Six mechanisms account for all eight, and three of the six are one idea —
the same idea sweep 2 named, arriving from a new direction:

> **A question is asked through a resolver that answers for a smaller
> universe than the question ranges over.** The candidate set is the user
> catalog when PostgreSQL's is the user catalog plus pg_catalog (RC-2). The
> composite universe is base composites when PostgreSQL's includes domains
> over them (RC-3). The set-returning universe is a hand-written list of 21
> names when PostgreSQL's is 109 (RC-1).

**RC-1 — set-returningness is asked of two incomplete oracles.**
(Findings 1, 2.) `isSetReturningCall` has two answers and both under-report:
a hand-curated name table missing 50 of 71 builtins, and the
single-candidate metadata shortcut, which is blind to overloads. The
compounding factor is `srfPaddedTargets`' count threshold: an under-report
does not degrade one entry, it disables the rule for the whole list. The
engine already knows how to answer this correctly — the snapshot reads
`proretset` from the same `pg_proc` scan that captures
`builtinTableFunctions`, and the consensus quantifier already exists for
overloads.

**RC-2 — the search path is not the whole resolution order.** (Finding 6.)
Sweep 2 fixed `inPath` for functions by merging candidates ACROSS the path.
The path is not the universe: PostgreSQL prepends `pg_catalog` unless it is
named explicitly, so the merge is still missing a schema — and it is missing
the one the engine models by NAME TABLES rather than by candidates, which is
why the omission reads as a design rule ("a user function of the same name
still wins") instead of a gap. The resolution policy is fine; the candidate
set is short by one schema, exactly as it was before the sweep-2 fix.

**RC-3 — `resolveCompositeType` knows base composites only.** (Findings 4,
and one of finding 3's six spellings.) A single query predicate,
`typtype = 'c'`, decides what "is a composite" means for
`expandCompositeStar`, `unnestCompositeElementFields`, and
`columnsForReturnType`'s SETOF branch. Domains over composites are
invisible, and the three callers fail differently — two refuse, one guesses.

**RC-4 — an enumerated spelling list where a type query belongs.**
(Finding 3.) `unnestCompositeElementFields` reconstructs "what is the
element type of this expression" from AST shapes: three of them, chosen
because they are the ones that carry the type textually. Six more spellings
exist, and the two structural ones (CTE and subquery re-export) are not
exotic — they are what any query that stages a composite array through a
`WITH` looks like. The engine HAS the type for the re-export cases (the
inner analysis resolves the column) and does not ask.

**RC-5 — an AST arity test standing in for a shape test.** (Finding 5.)
`fields.length === 2` encodes "qualified star" and is wrong for the
three-part spelling. It appears twice, in `expandStar` and in
`groupingOrdinalPositions` — the second copy was WRITTEN by the sweep-2 fix,
faithfully mirroring the first, which is how a latent defect acquires a
second site.

**RC-6 — rendered strings parsed by hand.** (Finding 7, and the LCM/padding
wording under finding 1.) `columnsForReturnType` and `isSetReturningCall`
both reason about `pg_get_function_result` output as text. The string is a
faithful rendering of catalog rows the snapshot could read directly
(`proargnames`/`proallargtypes` — which `queryBuiltinTableFunctions` already
does for builtins, and `proretset`).

**RC-7 — the unreferenced-CTE gate gates the walk, not the mechanisms.**
(Finding 8.) One boolean decides whether a subtree contributes ANY
parameter facts, when the licence it rests on (never executed) applies to
three of the four mechanisms and not the fourth.

---

## 3. Proposed fixes, blast radius, order

Sketches. Nothing implemented.

**Fix 1 (RC-1, findings 1 and 2) — ask the catalog, then ask consensus.**
Two halves, both small:
(a) Replace `BUILTIN_SRF_NAMES` with a snapshot fact —
`CatalogSnapshot.builtinSetReturningFunctions`, the `proretset = true`
names from `pg_catalog`, captured in the same pass as
`builtinTableFunctions` and ENVIRONMENT like it (absent from the diff, for
the same reason). That converts an unfalsifiable-by-construction table into
a measured one and closes all 50 names at once.
(b) Make set-returningness a CONSENSUS question over
`resolveFunctionReturnTypes` rather than a single-candidate one: every
candidate's rendered return type starting `SETOF `/`TABLE(` means the call
returns a set whichever overload runs. While there, either read `proretset`
into `FunctionInfo` and drop the string test entirely (preferable — it also
retires half of RC-6), or keep the prefix test and note it.
*Blast radius:* additive in the direction that matters — more target lists
gain the padding, so claims drop from notNull to nullable. Any fixture with
two SRFs in one target list flips; `srf-target-list-padding.sql` is the only
one today. Re-run the generated corpus: its SRF axis is single-call, so I
expect zero churn, but the closure entry for finding 7 said the same about
its own fix and was right, which is the level of confidence to hold.
Also correct the register's "LCM" wording to max-with-padding.

**Fix 2 (RC-5, finding 5) — `fields.length >= 2`, alias at `[length-2]`.**
Both sites, and a shared helper so a third copy cannot drift. The last
field is `A_Star`; everything before it is a qualified name whose LAST part
is the relation alias (PostgreSQL ignores the schema qualifier for an
in-scope alias — measured: `public.t.*` under `FROM t` and under
`FROM public.t` behave identically).
*Blast radius:* nothing in the suite spells a three-part star, so the fix is
pure addition. Worth a fixture in each placement (plain, join, CTE,
grouping ordinal) and one in the ordered-name gate's own material — this is
its third live case.

**Fix 3 (RC-2, finding 6) — put pg_catalog in the candidate set.**
`candidatesInPath` prepends `pg_catalog` unless the caller's `searchPath`
names it, then appends it in the position given. That requires the snapshot
to capture pg_catalog function SIGNATURES, which it does not today
(`USER_NS` filters them out) — the cheapest complete form is a name→
`argTypes[]` map alongside `builtinStrictFunctions`, ENVIRONMENT again, big
but flat. A cheaper 80% form: keep the name tables, and make the
single-candidate shortcut REFUSE to read a user function's metadata when the
name is also a pg_catalog name (drop to consensus/conservative). That is
sound, loses precision only for user functions that shadow builtin names,
and needs one new snapshot fact (the pg_catalog name set) instead of a
signature map. I recommend the cheap form now and the full one when the
consumer's search-path input lands, because the two interact.
*Blast radius:* user functions named after builtins are rare and none exists
in the fixture schema, so the suite should not move. The generated corpus
does not name its functions after builtins either. Verify by dry-run.

**Fix 4 (RC-3, finding 4) — follow domains to their base composite.**
The snapshot already captures domains (`snapshot.domains`); add
`baseTypeOid`'s composite identity, or resolve `typtype = 'd'` types whose
base is a composite into `compositeTypes` under the domain's own name. Then
`resolveCompositeType` answers for both, and the two refusals become
expansions.
*Blast radius:* two refusals become answers (fewer refused statements — the
safe direction), one wrong shape becomes right. `unsupported-nodes.test.ts`
gains cases it must stop refusing; check that the remaining composite-star
refusals (unknown cast targets, subquery composite columns) still fire —
those are separate pins and must not be widened away.

**Fix 5 (RC-4, finding 3) — ask the scope for the element type.**
`unnestCompositeElementFields` keeps its three static spellings and gains a
fall-back: for a ColumnRef whose owner is a CTE/subquery/view entry, take
the column's type from the inner analysis the engine already runs; for
anything else that resolves to a known array-of-composite, expand. The two
domain spellings come free with fix 4. The remaining residue — a function
return value, an aggregate expression — needs a type the walk genuinely does
not compute, and the honest answer there is the dispatch-site rule: REFUSE
rather than contribute one column, since the current answer is measurably a
wrong shape and a wrong shape is worse than a refusal.
*Blast radius:* the refusal half will refuse statements that "worked"
before, which is the same trade the sweep-1 unresolvable-relation fix made
and should be landed with the same care. `unnest-composite-shape.sql` and
`unnest-composite-merge-source.sql` are the pins to re-check.

**Fix 6 (RC-7, finding 8) — gate the mechanisms, not the walk.**
`visitSeenOnly` becomes "numbers plus BIND-TIME facts": walk `TypeCast`
nodes for mechanism A, skip `checkInsert`/`checkUpdate`/`checkMerge`/
`checkWindowDef`/`rejectFlow`. That restores the pre-sweep-2 claim for the
one mechanism whose licence never applied.
*Blast radius:* `param-unreferenced-cte.sql` gains a mechanism-A claim; the
param-soundness suite's raise pattern must accept the domain message for
that fixture. Small and local.

**Fix 7 (RC-6, finding 7) — parse identifiers, not spaces.**
`columnsForReturnType`'s TABLE branch splits the name off with an
identifier-aware scan (a leading `"` runs to the matching `""`-escaped
close, otherwise to the first space) and unquotes. Better still, and in the
same direction as fix 1(a): stop rendering and re-parsing at all for user
functions — capture `proargnames`/`proallargtypes` for them the way
`queryBuiltinTableFunctions` already does for builtins, and let
`columnsForReturnType` keep the string path only for the SETOF-scalar case.
*Blast radius:* no fixture uses a quoted output name, so the string fix is
inert on the suite; the structural version touches `FunctionInfo` and the
diff's function state and should be its own commit.

### Recommended order

Soundness first, cheapest first, widest radius last — the order both prior
fix phases used.

1. **Fix 2** (three-part star). Rank 1, pure addition, no radius. One
   afternoon, and it removes a shape defect the consumer's arity gate would
   otherwise have to catch.
2. **Fix 6** (mechanism A in unreferenced CTEs). Rank 7 but tiny, local, and
   it corrects a soundness ARGUMENT in the register, which is worth more
   than the claim it restores.
3. **Fix 7's string half** (quoted names). Rank 2, inert on the suite.
4. **Fix 4** (domains over composites). Enables fix 5 and only ever removes
   refusals.
5. **Fix 1** (set-returningness). Rank 1 ×2. Land after 4 so the corpus
   dry-run has one flipping fix to attribute churn to, not two.
6. **Fix 5** (unnest spellings). Rank 2→1, and carries a new refusal class —
   the same shape as sweep 1's unresolvable-relation landing, which is the
   precedent for how to do it.
7. **Fix 3** (pg_catalog precedence). Last: it is the widest, it interacts
   with the consumer's search-path input (`docs/consumer-design.md`), and
   the cheap form should be measured against the corpus before the full
   signature map is contemplated.

---

## 4. Negative results

Per section, what held and under what shapes. These are the load-bearing
half of the report: four sections came back completely clean, and three of
those are the ones the fix phase rewrote most heavily.

**A (search path, the rest).** The parts the charter left open all held.
A bare type name in a cast IS first-schema-wins — measured both directions
with `app_s.dm` (NOT NULL) shadowing `public.dm` and back, and
`isNotNullDomainByName`'s deliberate `false` for a shadowing non-notNull
domain is PostgreSQL's answer. Composite type resolution under the path is
first-schema-wins likewise (`app_s.pr` with three fields vs `public.pr` with
two, both spellings correct). `resolveOperatorMetadata`'s path-agnostic
collection is sound by superset: with a non-strict `###` in `app_s` and a
strict one in `public`, the consensus is non-strict under either path — a
dropped claim under the path where the strict one wins, never a wrong one.
Six exotic paths behaved: the empty path refuses every unqualified name
(consistent with the refusal rule and a caller error anyway); a nonexistent
schema followed by `public` resolves through; duplicates are idempotent;
naming `pg_catalog` explicitly changes nothing, including for `pg_class`
itself, which still refuses (the documented capture boundary).
**The residual builtin FROM-shape guess held on every shape I could reach**:
of PG18's 109 pg_catalog SRFs, 27 have no `proargnames` and none of those
returns a composite row type, so the one-column guess is right for all of
them by construction — and 15 callable builtins compared engine-vs-PGlite
by ordered name, including six the name table misses, agreed 15/15.

**B (padding rule).** Beyond the two findings: `countSetReturningCalls`'
SubLink exclusion is right (PostgreSQL rejects a multi-row scalar subquery,
so no lockstep can cross that boundary); an SRF inside a CAST is counted;
two SRFs inside ONE target entry pad correctly; a single target-list SRF
beside a FROM-clause SRF does not pad and keeps its precision (measured
three rows of `'only'`); `DISTINCT` over the expansion and a set-operation
branch both behave; PostgreSQL rejects SRFs in CASE and COALESCE, so those
arms of the charter's question are moot. `isSetReturningCall`'s
`SETOF `/`TABLE(` prefix test survived every rendering I could produce —
`SETOF record`, `SETOF "Q Type"`, `SETOF public.sku_pair`, `TABLE(…)` — the
defeat is by overload (finding 2), not by rendering.

**C/E (composite star).** The arms the fix phase added are right. A
composite COLUMN named after ANOTHER relation's alias resolves to the column
(the sweep-2 rule generalises). A SCALAR column colliding with an alias
refuses, and PostgreSQL agrees by ERRORING (`type text is not composite`) —
the refusal is not merely conservative there, it is correct.
`(ROW()).*` with zero fields gives zero columns in both. Nested `((c.p)).*`
works. `(h.pairs).*` over an array of composite refuses and PostgreSQL
errors. `(t.c).*` over a CTE or subquery refuses — a documented boundary,
re-confirmed as a costed one: PostgreSQL emits `[sku, qty]` there.
**One new rank-7 note, deliberately not a numbered finding** (same site,
same fix as finding 4's family): a USING- or NATURAL-merged composite column
`(p).*` refuses, and PostgreSQL expands it — the charter asked whether the
refusal is PostgreSQL's answer, and it is not. It costs precision only.

**D (grouping-set recorder) — clean, 13 shapes.** Ordinals mixed with
aliases in one `GROUPING SETS`; an output alias colliding with a base
column; an ordinal at the last expanded position; ordinals across two
relations; a star over a `JOIN USING` where the merge shortens the list
(`scope.visible` and `expandStar` agree on the merged count, so the position
lists cannot drift); grouping sets over a FUNCTION from-item and over a
coldeflist item; ordinals under a set operation; a CTE re-export whose
star-derived column is aliased; a composite star occupying width before an
ordinal. All three hazards the charter named came back clean. Sequencing:
the traced and untraced walks build identical scopes for every one, and the
memo-runs-earlier worry is unfounded — `relationColumnsIntrinsic` for a
LATERAL `unnest` inside a JOIN gives the same columns with and without a
grouping set (three shapes measured). Refusal site: a grouping-set query
over an unresolvable composite star refuses from the same site with the same
message as without the grouping set. One deliberate over-approximation
confirmed sound: an integer A_Const anywhere inside a grouping-set
EXPRESSION is read as an ordinal (`GROUPING SETS ((id + 1))` records
position 1's keys too), which only ever adds keys and only ever turns claims
nullable.

**F (unreferenced-CTE gate) — clean apart from finding 8, 10 shapes.**
The transitive closure starts from the body and is correct: a CTE referenced
only from another UNREFERENCED CTE stays unwalked; one referenced only
inside a sub-SELECT's FROM is walked. Nested `WITH` inside a CTE body
recurses. `WITH RECURSIVE` with an unreferenced sibling behaves. A CTE whose
name collides with a real table over-approximates to "referenced" only when
the name actually appears in the body — otherwise the gate applies, which is
correct, not a lost claim. DML-in-CTE feeding an UPDATE walks both. The
`rest` walk loses nothing: `checkInsert`/`checkUpdate`/`checkMerge` run on
the wrapped node BEFORE the withClause branch returns, so the hand-rolled
recursion never needs to re-dispatch them. And the soundness premise is
real: `MATERIALIZED` does not force execution of an unreferenced CTE
(`WITH a AS MATERIALIZED (SELECT 1/0) SELECT 2` returns 2).

**G (partitioned two-command hook) — clean, 11 shapes.** Row movement into a
SUB-partition's leaf two levels down is caught (the tree union recurses and
the gate reads the named relation, which IS relkind `'p'`); through the
middle partitioned level likewise; naming the LEAF keeps the per-command
test and the precision, correctly (a leaf cannot route). A DEFAULT partition
carrying the trigger is caught. `DELETE` on a partitioned parent was not
widened. `UPDATE ONLY` on a partitioned parent updates ZERO rows in
PostgreSQL, so the retained precision there is unwitnessable rather than
wrong. MERGE with a moving update arm is caught, and so is
`WHEN NOT MATCHED BY SOURCE THEN UPDATE`. A routed INSERT into the
trigger-bearing partition is caught.

**H (a fifth relation-SET fact) — none found, and I believe none exists
today.** I enumerated every catalog read the walk makes through a named
relation and checked each against PostgreSQL: `notNull`, the write hooks,
the generation expression and the CHECK list all have tree analogues and
take them by the `scanInh` split; `resolveIsPartitioned` is correctly the
NAMED relation's question (routing is a property of the target, and a
partitioned table cannot inherit from a plain one — `INHERITS` is a syntax
error beside `PARTITION BY`); `hasDefault`/`identity` are not read by the
walk at all (`SetToDefault` is conservative); the type/collation reads
CANNOT diverge, because PostgreSQL refuses both (`cannot alter inherited
column`, `column "s" has a collation conflict` — measured); the column
ORDER of a tree scan is the parent's by construction. The one route to a
CHECK divergence I had not seen recorded — `ALTER TABLE ONLY p VALIDATE
CONSTRAINT` after a `NOT VALID` add — PostgreSQL refuses
(`constraint must be validated on child tables too`), confirming the schema
comment. `generationDivergesInTree`'s rendered-string comparison: I could
not make `pg_get_expr` render two semantically DIFFERENT expressions
identically, which is the only direction that would be unsound.

**I (diff completeness) — clean, 8 constructions.** Every flip reported the
entity whose inference changed, the parent included: a FIRST child appearing
reports the parent (`hasDescendants`); a NO INHERIT constraint dropped
reports the parent's constraint list; a child redefining a generation
expression reports both the parent table AND the parent's COLUMN
(`generationDivergesInTree`); a drop-and-recreate as partitioned reports the
`relkind` flip; a BEFORE INSERT trigger appearing on a PARTITION reports the
parent (`writeRewritesTree`) and the partition; dropping the last child
recovers the parent's `notNullTree` and reports it. ATTACH and DETACH of a
partition whose flags and hooks match the parent's report NOTHING — which is
correct, not a miss: the four derived facts ARE the abstraction the
inference depends on, and none of them moved. The deliberate omission of
`builtinTableFunctions` from the diff is right for the same reason
`builtinStrictFunctions` is: it is a property of the PostgreSQL version, and
the one user action that changes what it answers — creating a same-named
function — is itself a diffed entity. (The residue is the already-open
negative-dependency hole: a query resolving to a builtin records no EntityId
for the user function that does not exist yet. That is search-path half (b)
and stays with the consumer design.)

**J (parity and the builtin flips) — clean.** Zero traced/untraced
disagreements across every probe in this sweep, including the SRF padding
entry that fabricates a trace node, the grouping-set scope build, all three
new composite-star value arms, and every refusal site (the traced walk threw
the same error with the same site in each case). That is three sweeps at
zero. The two builtin flips re-checked against their own criterion and both
hold: `extract`'s exclusion is COMPLETE for its family — `date_trunc`,
`age`, `justify_days`/`justify_hours`/`justify_interval` and
`to_timestamp` all return `±infinity` rather than NULL for infinite inputs,
`isfinite` returns `false`, and `make_interval` RAISES (an error is not a
NULL); `to_date('','')` and `to_timestamp('','')` return values, so the
sibling that killed `to_number` does not reach them. Fourteen further
members were probed with untried input classes (NaN through `round`,
`trim_scale`, `width_bucket`; empty and no-match inputs through
`split_part`, `regexp_replace`, `decode`, `string_to_array`,
`array_positions`, `array_remove`, `trim_array`) and none returned NULL —
they return values or raise. The `func_variadic` gate covers what it claims:
an ordinary-argument call to a variadic builtin behaves element-wise
(`concat('a', NULL)` → `'a'`, `num_nonnulls(NULL, 1)` → 1) and only the
`VARIADIC <array>` convention nulls out, so the gate is neither too wide nor
too narrow. A VARIADIC call to a USER function is not gated and does not
need to be: it goes through priorities 4/5, which handle it correctly.

**Free-form.** `WITH ORDINALITY`'s notNull `ordinality` column is correctly
overridden by an outer join's extension (both the lone-function and
`ROWS FROM` spellings). A `RETURNS TABLE(a <NOT NULL domain>)` whose body
yields NULL RAISES, so the claim `columnsForReturnType` makes from the
domain is honest; likewise a `SETOF <composite with a NOT NULL domain
field>`; and both are correctly overridden under `LEFT JOIN LATERAL … ON
false`. `SELECT (q_type()).*` over a quoted composite type name is right —
the quoting defect is the `TABLE(…)` branch only.

---

## 5. The yield, and what it means

The charter asked for this explicitly, so: **the yield is materially lower
than sweep 2's, and the composition matters more than the count.**

| | sweep 1 | sweep 2 | sweep 3 |
|---|---|---|---|
| comparison probes | 246 | ~120 | ~155 |
| findings | 15 | 13 | 8 |
| rank-1 statements | 9 | 11 | 5 |
| per 100 probes | 6.1 | 10.8 | 5.2 |

Half sweep 2's rate, and lower than sweep 1's against an aged engine. But
the counts hide the shape, and the shape is the argument:

**Five of the eight are in the chartered surface; three are not.** Findings
1, 2, 3, 4 and 8 are in the ten fixes' own code. Findings 5 (`expandStar`'s
arity test) and 7 (`columnsForReturnType`'s space split) are in code that
predates both sweeps and that 2126 tests, 312 fixtures, a generated corpus
and two prior sweeps all walked past. Finding 6 is in the search-path merge
written the day the charter was, which the charter itself flagged as the
likeliest place for a defect — and it was right.

**The premise "young code is where the defects are" survives, weakened.**
Five findings in ten fixes' worth of code is still a high density. But the
two highest-value findings by blast radius — 5 and 6 — say something the
first two sweeps could not: the engine now has enough MECHANISM that its
defects are increasingly *composition* defects (a two-part test meeting a
three-part spelling; a resolver meeting a universe one schema larger) rather
than *omission* defects, and those do not correlate with code age. Sweep 2's
finding was "a fact moved to the right place at the sites someone was
looking at." Sweep 3's is "a resolver answers for a smaller universe than
the question." The first is a property of a fix phase; the second is a
property of an engine, and re-sweeping fresh code will not find more of it.

**My reading of the stop condition: this cycle has paid out, and the next
sweep should not be chartered against code age.** Four sections came back
completely clean across 55 probes, and they are the four the fix phase
rewrote most heavily (D, G, I, J) — the fixtures its author wrote in the
same sitting turn out to have been aimed correctly. What produced findings
was not "look at the newest code" but three older heuristics the register
already trusts:

1. **Sweep a hand-curated table against the catalog it approximates.** That
   is findings 1 and 2, and it is the third sweep in a row where this
   yielded (ALWAYS_NOT_NULL, then STRICT_TOTAL_BUILTINS, now
   BUILTIN_SRF_NAMES). Every remaining name table in the engine deserves the
   same treatment as a scheduled item, not as a sweep.
2. **Compare ORDERED NAMES, not arity.** Findings 5, 6 and 7 are all shape
   defects, and 7 is invisible to arity. The register's section-1 gate now
   carries twelve defects across three sweeps that it would have caught. It
   should stop being a scheduled item and become the consumer build's first
   commit.
3. **Ask whether a resolver's universe matches PostgreSQL's.** That is
   findings 3, 4 and 6, and it is a checklist item for the next mechanism
   anyone adds, not a sweep.

If a fourth sweep is wanted, charter it against a QUESTION (are the engine's
resolvers complete? are its enumerated lists?) rather than against a diff.
Otherwise the evidence says: fix these eight, land the arity-and-order gate
with the consumer's first contract-holding slice, and send the register to
the consumer build.
