# Adversarial sweep 4 — findings

**Status: FIX PHASE COMPLETE (2026-08-07).** All seven findings are closed,
one commit per fix in the recommended order below. The quarantine directory is
retired: every fixture graduated into `tests/unit/query/fixtures/` with
corrected claims and witnesses, and the sweep's DDL is folded into
`fixtures/schema.sql`. Suite 42 files / 2662 tests / 408 fixtures, green;
`pnpm typecheck` passes. (`pnpm lint` fails, and did before this sweep too:
there is no `eslint.config.*` in the repository at all. Untouched — it is not
this sweep's business.) The per-fix closure entries are at the top of section 2
of `docs/deferred-tasks.md`; this document stands as the sweep's report.

**Two things below are now WRONG, and are left in place with this header
correcting them rather than edited away — the reasoning that produced them is
the useful part.**

1. **Finding 5's recommended fix (the sibling test) is wrong.** It rests on
   "one NESTED path is sound" and "NESTED inside NESTED is sound", both
   measured only over paths that always MATCH. A NESTED PATH is an OUTER JOIN
   against the level above it: a lone path over an EMPTY array, or one whose
   key is absent from the document, emits a row with the counter NULL and no
   sibling anywhere — as does an empty inner array under NESTED-in-NESTED. The
   boundary is "inside a NESTED path", which this document carries as its
   conservative fallback. A ROOT-level counter is unaffected however many
   siblings it has, and has a fixture that fails if that moves.
2. **Finding 7 landed as the wording decision alone, with no rule.** The
   sketched mechanism-C rule is not built and should not be: the class is real
   and catalog-visible, but a plpgsql body that simply `RAISE`s on NULL is the
   same rejection with no catalog trace, so the line would move without
   arriving anywhere. The decision — no claim about a user function's arguments
   beyond its DECLARED parameter types — is in
   `docs/argument-nullability.md`.

**An EIGHTH finding came out of taking that decision, and it is OPEN.** The
decision scopes the must-not-raise convention to BUILTINS; probing that
carve-out rather than assuming it falsified it immediately. 10 signatures
across 11 argument positions reject a NULL argument where the engine claims
nothing — `array_fill`'s dimension and low-bound arrays, `array_position`'s
three-argument initial position, the six range constructors' flags argument,
`jsonb_set_lax`'s `null_value_treatment` — measured with a per-position control
over the 208 non-strict pg_catalog functions. Registered in
`docs/deferred-tasks.md` rather than built: the fix is a curated table, and
this project's standing lesson about those is that they drift.

**The probe loop was kept rather than deleted this time**, and the disposition
below held. `tests/probe/harness.ts` stays as TOOLING, beside
`builtin-null-rejection.ts` — the standing measurement behind finding 8. The
per-round files retired with the quarantine; each fix's CONTROLS graduated as
fixtures instead, which is what makes an overshoot fail rather than pass
quietly. Probe ids cited below (`A1`, `C11`, `FF13`, …) no longer resolve to a
live file; the shapes that earned a permanent home are named in the closure
entries.

**Yield: 7 findings in 169 probes (157 of them engine-vs-PGlite comparisons
through the probe loop, 12 parameter probes with a real Bind).** Sweep 3 was 8
in ~155; sweep 2 was 13 in ~120; sweep 1 was 15 in 246. So this sweep matches
sweep 3's rate on findings-per-probe and beats it on severity mix — five rank-1
against sweep 3's five, from two thirds of the probe budget, and two of the
seven are in code that predates every sweep.

The charter asked for that number explicitly, and for the reading that goes
with it. The reading is in the synthesis: **the fourth sweep did not confirm
"young code is where the defects are".** Three of the seven are in the six
mechanisms the 2026-08-07 session added; four are not, and the two widest are
old. What the sweep confirms instead is the heuristic sweep 3 ended on — ask
whether a rule's universe matches PostgreSQL's — now with a second axis: **a
FROM item is where the engine's universe is narrowest**, and five of seven
findings are FROM items.

---

## 1. `ROWS FROM` pads its shorter arms, and the declared column reading survives it

**Rank 1**, with a **rank 4** face. Fixtures:
`rowsfrom-pad-domain-return.sql`, `rowsfrom-pad-strict-srf.sql`,
`rowsfrom-pad-presence-group.sql`.

**Claim vs reality.** `SELECT * FROM ROWS FROM (dom_lenient('a'),
generate_series(1, 3))` — the engine claims `dom_lenient` notNull; PostgreSQL
returns three rows and only the first carries a value.

```
 dom_lenient | generate_series
-------------+-----------------
 d           |               1
 (null)      |               2
 (null)      |               3
```

No seed data: the shape alone does it, over no tables at all.

**Mechanism.** `nullability-walk.ts` `resolveTableFunctionColumns`. Its own
comment states the rule —

> Two or more functions in one `ROWS FROM` expand in lockstep to the LONGEST
> one's row count, and every shorter one's columns are NULL-padded after it
> has returned — measured, and measured for a body whose columns are provably
> non-null, which is exactly the claim the body reading would otherwise make.

— and then acts on it in ONE place: `bodyReadable` gates the BODY reading. The
DECLARED reading (`functionOutputColumns`, which marks a NOT NULL domain
return or a NOT NULL domain OUT/TABLE parameter notNull) is pushed unclipped,
on all three arms — the coldeflist arm, the overload-consensus arm and the
single-candidate arm. The clearance the site needs already exists one line
away: `clearShortCircuitedColumns` clips exactly these flags for a different
reason at the same point.

**Six shapes measured, one cause:**

| shape | probe |
|---|---|
| non-strict scalar with a NOT NULL domain return, short by two rows | `A1` |
| `SETOF <NOT NULL domain>`, short by two | `A2` |
| STRICT `SETOF` handed NULL — no rows at all | `A3` |
| STRICT `RETURNS TABLE(a nn_text, …)` handed NULL | `A4` |
| the same plus `WITH ORDINALITY` | `A17` |
| an alias column list renaming the padded column | `FF2` |

**`returnsSet` is not the bug, and should stay.** `callCanShortCircuit`
excludes set-returning functions because "a claim about columns of rows that
do not exist cannot be contradicted", which is true of the call alone. `ROWS
FROM` is where the rows come back anyway — the long arm supplies them and the
padding supplies the NULLs — and the padding rule clears these flags for a
reason that has nothing to do with strictness. Fixing the padding covers `A3`
and `A4` without touching the exclusion. Confirmed from the other side: a
strict SRF can never BE the longest arm, since it returns zero rows.

**The rank-4 face.** Under an outer join the padded column is a presence-group
DISCRIMINANT, because the same wrong flag is what "proven non-null on the
present arm" means. `SELECT o.id, x.a, x.b, x.generate_series FROM orders o
LEFT JOIN LATERAL ROWS FROM (sw4_tab_srf(o.id), generate_series(1, 3)) x ON
true` emits `{columns: [1,2,3], discriminants: [1]}` and then a row where the
discriminant is NULL — the group's "unit absent" — while member 3 is `2`.
That is `nullability-soundness.test.ts`'s second group assertion verbatim.
Clearing the flag removes the group entirely (≥ 1 discriminant is the floor),
so this is not a second fix; it is where the first one has to sit — before
the group assembly reads the flags.

**Blast radius of the WRONG claim, measured.** It survives every placement
tried: a set operation's branch (`S1`), `EXCEPT ALL`'s left arm (`S2`),
`GROUP BY` (`S5`), `DISTINCT ON` (`S9`), a MERGE source's `RETURNING`
(`FF4`), and it feeds a strict call's argument and makes THAT notNull too
(`G10`). An `INSERT … SELECT` from it into a NOT NULL column raises (`S3`) —
which is a consumer discovering the defect at runtime. Two placements
recover the claim honestly: a `WHERE … IS NOT NULL` refilters (`S6`) and a
CTE re-export under a LEFT JOIN goes nullable by join state (`FF9`).

**Fix sketch.** In `resolveTableFunctionColumns`, clear every `notNull` on a
multi-function `ROWS FROM` — the same predicate `bodyReadable` uses,
`functions.length === 1`, applied to `push` rather than only to the body
branch. `WITH ORDINALITY` is unaffected: the counter belongs to the ROWS FROM
as a whole and is present on every row (measured, `A17`). Blast radius: the
existing `body-shape-rows-from-padding.sql` fixture already asserts the
correct behaviour for the body half and does not move; nothing in the
generated corpus writes `ROWS FROM`, so no generated claim moves.

## 2. A join whose qual is never recorded is invisible to the subtree readings

**Rank 1.** Fixtures: `fk-entail-crossjoin-not-preserved.sql`,
`fk-entail-crossjoin-join-level.sql`.

**Claim vs reality.** `SELECT c.id FROM orders o LEFT JOIN (customers c CROSS
JOIN tags g) ON c.id = o.customer_id`, with one customer, one order on it, and
`tags` EMPTY — the engine claims `c.id` notNull; PostgreSQL returns one row
with NULL.

**Mechanism.** `walkFromItem`'s JoinExpr arm pushes onto `scope.joins` only
from `if (join.quals)` and from the USING/NATURAL synthesis. A join with no
qual to record is therefore absent from `scope.joins` entirely — and
`subtreePreserves`, `subtreeAlwaysPresent` and `joinWithin` all read the join
TREE off that array. A side containing an unrecorded join reads as a leaf that
drops nothing, so the foreign-key entailment's "the match is still in the
SLICE" gate — the condition the 2026-08-07 session added and pinned with
`fk-entail-referenced-not-preserved.sql` — passes on a side that has been
emptied.

This is that fixture's own counterexample with the INNER join replaced by a
CROSS join. The reasoning it pins is right; the data structure it reads cannot
see the case.

**Three routes into an unrecorded join, all measured:**

| route | probe |
|---|---|
| `CROSS JOIN` | `C11`, `C27` |
| `CROSS JOIN LATERAL` over a subquery that returns nothing | `C9` |
| `NATURAL JOIN` with no common column names (a cross join in disguise) | `C30` |

A fourth exists by construction and could not be given falsifying data cheaply:
a USING join whose merged name has no concrete owning entry — an already-merged
column of a nested USING — skips its synthesis and records nothing
(`walkFromItem`, `if (!l?.entry || !r?.entry) continue`).

**`ON TRUE` is the control and behaves correctly** (`C31`): it carries a qual,
so the join is recorded, `subtreePreserves` sees an INNER join and refuses the
promotion.

**Two call sites, one fix.** `foreignKeyEntailedAlias` reaches it directly;
`joinCannotExtendSide` reaches it through its own `subtreePreserves` and then
promotes via `incomingRequired` (`C23`, the second fixture). Both read the
same array.

**Blast radius of the wrong claim.** It propagates into a strict call's
argument (`G5`), through star expansion — `SELECT c.*` gives two wrong
`notNull`s (`S4`) — and through a VIEW definition (`G9`).

**Fix sketch.** Record the join in `scope.joins` whatever its qual: the
subtree readings want the join's TYPE and its two alias sets, both of which
exist with or without a qual; only the fixpoint's `impliedQuals` wants a qual.
Give `JoinPredicate.quals` a null case, or split the structural record from
the qual record. The presence fixpoint must then skip a qual-less join when it
implies quals — an INNER join with no qual implies nothing — which is what
`equalityColumnRefs` already answers null for. Blast radius: every existing
`fk-entail-*` fixture keeps its claims (they all carry ON quals); the
generated corpus has no parenthesised cross join inside a join side.

## 3. `TABLESAMPLE` is a row-dropper the walk unwraps and forgets

**Rank 1.** Fixture: `fk-entail-tablesample-not-preserved.sql`.

**Claim vs reality.** `SELECT c.id FROM orders o LEFT JOIN customers c
TABLESAMPLE BERNOULLI (0) ON c.id = o.customer_id` — the engine claims `c.id`
notNull; PostgreSQL returns one row with NULL. `BERNOULLI (0)` is the
deterministic spelling; any fraction below 1 falsifies the claim
probabilistically.

**Mechanism.** `walkFromItem`'s `RangeTableSample` arm is one line:

```ts
if (rts.relation) return this.walkFromItem(rts.relation, joinState, scope, nullGroup, unitChain, depth);
```

The sampling is discarded and the relation is registered as itself. Every fact
keyed on "the stored rows of this relation" then over-reads: `keyedRelation`
hands the alias to the foreign-key entailment as a plain table, and
`subtreePreserves` finds no join dropping it.

Where finding 2 is a row-dropper the walk cannot SEE, this is one it does not
MODEL — the alias no longer stands for the table, and nothing in the scope
says so.

**The correlated-subquery anchor rule comes back SOUND** (`D8`, `D14`), and
for a reason that is not a gate: `subqueryFromTree` accepts only a RangeVar
leaf, and a sampled relation arrives as a `RangeTableSample` wrapping one. An
accident of the reading's shape, not a decision — worth recording because the
fix must not turn it into a wrong answer.

**Fix sketch.** One flag on `RelationEntry` (`sampled: true`), set by the
`RangeTableSample` arm, consulted by `keyedRelation` (never a key's referenced
or referencing side) and by `subtreePreserves` (never preserved). It costs
nothing real — no codegen consumer writes `TABLESAMPLE` — and what it buys is
that the walk stops trusting a relation it is not reading. Blast radius: zero
existing fixtures; `TABLESAMPLE` appears in no corpus.

## 4. A foreign key onto a partitioned table is captured from its per-partition clones

**Rank 1**, with a rank-7 companion. Fixture:
`fk-clone-partitioned-referenced.sql`.

**Claim vs reality.** With `sw4_pp` partitioned into `sw4_pp1` (ids 0–99) and
`sw4_pp2` (100–199), and `sw4_pref.p_id` a NOT NULL key onto `sw4_pp(id)`:

```sql
SELECT p.id, p.k FROM sw4_pref r LEFT JOIN sw4_pp2 p ON p.id = r.p_id
```

seeded with `sw4_pp(1,'a'), (150,'b')` and `sw4_pref(10,1), (11,150)` — the
engine claims `p.id` notNull; PostgreSQL NULL-extends the row whose match
lives in the other partition.

**Mechanism.** PostgreSQL records a key referencing a partitioned table more
than once: the declared constraint (`confrelid` = `sw4_pp`, `conparentid` = 0)
plus one CLONE per partition (`confrelid` = `sw4_pp1` / `sw4_pp2`,
`conparentid` = the declared one). Measured:

```
 conname               | rel      | fref    | conparentid
-----------------------+----------+---------+-------------
 sw4_pref_p_id_fkey    | sw4_pref | sw4_pp  |           0
 sw4_pref_p_id_fkey_1  | sw4_pref | sw4_pp1 |       17156
 sw4_pref_p_id_fkey_2  | sw4_pref | sw4_pp2 |       17156
```

The clones exist so that a delete on one partition fires the right referential
trigger. None of them means "every referencing row matches THIS partition".

`catalog-adapter.ts` keys its FK map on `schema.table.column` and lets the last
row win (`fkByColumn.set(key, target)`), so `sw4_pref.p_id` resolves to
whichever partition the snapshot orders last. `snapshot.ts` `queryConstraints`
does not capture `conparentid`, so the adapter cannot currently tell a declared
key from a clone.

**Two wrong answers from one capture.**

1. **Unsound**: joining the partition the map landed on promotes it (above).
2. **Imprecise (rank 7)**: joining the DECLARED parent — `LEFT JOIN sw4_pp p ON
   p.id = r.p_id`, the shape anyone would write — promotes nothing, because
   the declared target was overwritten (`C17`, `C21`). The same loss reaches
   the correlated-subquery anchor rule (`D1`, `D3`).

**The adapter's existing comment is not wrong, it is about the other side.** It
says "Partitioning is the opposite and needs no exclusion: the constraint is
recorded on every partition and ATTACH PARTITION validates the incoming rows"
— true of the REFERENCING table being partitioned, which is what it was
reasoning about. The referenced side is a different question and the clones
are a different mechanism.

**What the charter predicted, and where it actually was.** Section D named "a
key whose referenced side is a partitioned parent". It landed one layer below
where the charter pointed: not in the walk's slice reasoning (`ONLY <partitioned
parent>` scans no rows and is a real hazard — `C1`, `D1` — but the engine is
accidentally safe there, because the same capture bug has already destroyed
the key) but in what the catalog answers.

**Fix sketch.** Capture `conparentid` in `queryConstraints`; skip clones
(`conparentid <> 0`) when building `fkByColumn` / `fkTreeByColumn`. That
recovers the declared key and removes the wrong one in one move. THEN the
`ONLY` hazard becomes live and needs its own gate — `keyedRelation` reads
`scansTree` for the REFERENCING relation and nothing reads it for the
REFERENCED one, so a referenced partitioned parent scanned `ONLY` must not be
entailed. Both halves are needed and the order matters: fixing the capture
alone turns `C1` into a rank-1. Blast radius: `part_p` in the fixture schema
is the target of no key, so no existing claim moves; the `fk-chain` schema
variant has no partitioned key either.

## 5. JSON_TABLE's sibling NESTED paths NULL each other's columns, ordinality included

**Rank 1**, with a **rank 4** face. Fixtures:
`jsontable-sibling-nested-ordinality.sql`, `jsontable-sibling-nested-group.sql`.

**Claim vs reality.**

```sql
SELECT j.na, j.nb FROM JSON_TABLE('{"a":[1],"b":[3]}'::jsonb, '$' COLUMNS (
  NESTED PATH '$.a[*]' COLUMNS (na FOR ORDINALITY),
  NESTED PATH '$.b[*]' COLUMNS (nb FOR ORDINALITY))) j
```

The engine claims BOTH notNull. PostgreSQL returns two rows, each with one of
them NULL. No seed data.

**Mechanism.** `collectJsonTableColumns` flattens a `JTC_NESTED` column's
children into the same output array and marks `JTC_FOR_ORDINALITY` notNull, on
the true premise that an ordinality counter is generated for every row it
counts. What it counts is its OWN path. PostgreSQL evaluates sibling NESTED
paths as a UNION: a row produced by `$.a[*]` carries NULL in every column of
`$.b[*]`, ordinality included.

**The boundary is exactly "has a sibling", measured four ways:**

| shape | verdict |
|---|---|
| one NESTED path (`FF16`) | sound — nothing to leave NULL |
| NESTED inside NESTED (`FF24`) | sound — a child's rows all belong to one parent row |
| two siblings (`R2`) | **both ordinalities falsified** |
| two siblings, one over an empty array (`FF17`) | **the empty side's ordinality falsified** |

**The rank-4 face.** Under an outer join both ordinalities are discriminants,
so a row from either path has ONE discriminant NULL — the first group
assertion's failure, "discriminants disagree in one row". `R1` returns all
three rows: two present-arm rows that disagree, and one genuine absent-arm row
that makes the group look meaningful.

**XMLTABLE is the control and is sound.** `FOR ORDINALITY` there has no NESTED
form, and a column declared `NOT NULL` is enforced: PostgreSQL raises `null is
not allowed in column "a"` rather than emitting NULL (`N8`, `N9`). JSON_TABLE
has no `NOT NULL` column option at all.

**Fix sketch.** The sibling test, not the ordinality rule: a `FOR ORDINALITY`
column is notNull when its path is the only one at its level and nullable when
it has a sibling. `collectJsonTableColumns` flattens before anything can ask,
so the question has to be asked during the descent — pass down "this level has
more than one NESTED sibling" and OR it into the ancestor's answer. The
conservative first cut is one line: any `FOR ORDINALITY` inside a `JTC_NESTED`
reads nullable, which costs the single-path and nested-under-nested cases their
(correct) claims. Blast radius: no fixture writes JSON_TABLE with a NESTED
path; the node census classifies `JsonTable` `handled` and its accessor fires,
which is how a FROM item nobody had put two nested paths in stayed
unfalsified.

## 6. A one-arm `ROWS FROM` ignores the relation alias when naming its column

**Rank 2.** Fixture: `rowsfrom-single-arm-alias-name.sql`.

**Claim vs reality.** `SELECT * FROM ROWS FROM (generate_series(1, 2)) AS z` —
PostgreSQL's RowDescription says `z`; the engine says `generate_series`.

**Mechanism.** `resolveTableFunctionColumns`:

```ts
const single = (rf?.functions?.length ?? 0) === 1 && !rf?.is_rowsfrom;
```

PostgreSQL's rule has no `is_rowsfrom` in it. The spelling space, measured:

| statement | PostgreSQL | engine |
|---|---|---|
| `ROWS FROM (generate_series(1,2)) AS z` | `[z]` | `[generate_series]` |
| `ROWS FROM (dom_lenient('a')) AS z` | `[z]` | `[dom_lenient]` |
| `ROWS FROM (generate_series(1,2)) WITH ORDINALITY AS z` | `[z, ordinality]` | `[generate_series, ordinality]` |
| `ROWS FROM (generate_series(1,2)) AS z(w)` | `[w]` | agree |
| `ROWS FROM (gs(1,2), gs(1,3)) AS z` | `[generate_series, generate_series]` | agree |
| `ROWS FROM (sw4_tab_srf(1)) AS z` | `[a, b]` | agree |
| `ROWS FROM (generate_series(1,2))` | `[generate_series]` | agree |

So the rule is the lone-function rule and nothing else: one arm returning a
SCALAR takes the relation alias as its column name, `ROWS FROM` or not. That
is the same predicate `bodyReadable` uses one line below —
`functions.length === 1` — so the two gates disagree about what "single" means
and only one of them is right.

**Arity-preserving and NAME-only.** The FOURTH defect this project has met
that nothing but an ordered-name comparison can see, after sweep-1's permuted
MERGE `RETURNING *`, sweep-2's `(p).*` and sweep-3's quoted `TABLE(…)` names.
The arity-and-order gate (register section 1) now carries thirteen defects
across four sweeps, four of them invisible to arity.

**Why nothing caught it.** It survives re-export — a CTE over it reports
`generate_series` too (`R3`) — and a qualified star reaches the same wrong
name (`R4`). A VIEW does not: PostgreSQL re-renders the definition with an
explicit alias column list (`… z(z)`) and the engine then agrees (`S7`), so a
view fixture never could have caught it.

**Fix sketch.** Drop `&& !rf?.is_rowsfrom` from `single`. That also enables
`rf.coldeflist` for the one-arm ROWS FROM spelling — which is correct, since
PostgreSQL parks a one-arm ROWS FROM's column definition list on the List item
rather than the RangeFunction, so the `single ? rf?.coldeflist : undefined`
fallback simply never fires there. Blast radius: no existing fixture writes a
one-arm `ROWS FROM` with an alias.

## 7. A parameter that raises inside a NOT NULL domain return is claimed nullable

**Rank 3.** Fixture: `param-domain-return-body.sql`.

**Claim vs reality.** `SELECT sw4_dom_id($1)`, where `sw4_dom_id(x text)
RETURNS nn_text LANGUAGE sql AS $$ SELECT x::nn_text $$` — the engine claims
`$1` nullable; binding NULL raises `domain nn_text does not allow null values`
in every state, while the all-valid control succeeds.

`param-soundness.test.ts` states the rule it breaks at the top of the file:
*"nullable — universal: binding NULL must never raise, in any state."*

**Mechanism.** `param-nullability.ts` — no rule consumes
`funcReturnsNotNullDomain` at a call site, so mechanism C's value flow stops
at the function boundary.

**The engine already holds both halves of the fact that convicts it.**
Priority 1 claims this statement's OUTPUT notNull on the reasoning "returns
NOT NULL domain → PG enforces at call boundary" — the call either yields a
non-null value or RAISES. Whether it raises depends on whether the body maps
NULL to NULL, and the walk reads exactly that (priority 5,
`resolveSqlFunctionBody` with the call's argument vector). The output side
consumes both; the parameter side consumes neither.

**The class is bounded and catalog-visible**, which is what makes it fixable —
a NON-STRICT function declared to return a NOT NULL DOMAIN whose body is
NULL-preserving. Measured, with its controls:

| statement | NULL binding | engine's param claim |
|---|---|---|
| `sw4_dom_id($1)` — body casts the argument | RAISES | nullable — **wrong** |
| `sw4_dom_echo($1)` — body echoes the argument | RAISES | nullable — **wrong** |
| `dom_lenient($1)` — body is a constant | accepted | nullable — correct |
| `dom_strict($1)` — STRICT, short-circuits | accepted | nullable — correct |
| `$1::nn_text` — mechanism A | RAISES | notNull — correct |
| `INSERT … VALUES ($1)` into NOT NULL | RAISES | notNull — correct |

**The corpus cannot express it.** Every NOT-NULL-domain-returning function in
`fixtures/schema.sql` returns a CONSTANT — `always_text`, `tag_of` (both
overloads), `over_fn`, `always_positive`, `safe_name`, `plpgsql_domain_fn`,
`dom_lenient`, `dom_strict`. The class is unreached rather than merely
unlikely, which is the charter's thesis about the generated half, one level up:
the same is true of the HAND-WRITTEN half here.

**Wider, and a contract question rather than a bug.** A plpgsql body that
simply `RAISE`s on NULL rejects the same binding with nothing catalog-visible
behind it (`sw4_raiser`, measured), and no static analysis can see it. So the
suite's "nullable is universal" rule is not achievable for arbitrary user
functions, while `docs/argument-nullability.md` says a few hundred lines later
that "claims mean raises; absence of a claim promises nothing" — which reads
the other way. **The fix phase has to decide the wording before it decides the
code.** This is the dual, on the nullable side, of the reachability question
that document already records as open on the `notNull` side.

**Fix sketch, if the wording stays as the suite has it.** Mechanism C gains
one rule: a call to a non-strict function with a NOT NULL domain return
rejects every parameter whose NULL forces the BODY's result NULL — the body
walk with `argResults` already computes that, and the implicant machinery
already unions such facts. It is narrow by construction (strict calls
short-circuit and are excluded; a constant body proves nothing about the
argument). If the wording moves instead, the finding becomes a doc change plus
a note on the fixture.

---

## Synthesis

### Root causes, grouped

**RC-A — a FROM item's column list is assembled from readings that do not
know what the FROM item does to rows.** Findings 1, 3, 5, 6 and half of 2.
`resolveTableFunctionColumns` knows about padding and applies it to one of
three readings; `collectJsonTableColumns` knows about nesting and flattens it
before the sibling question can be asked; the `RangeTableSample` arm knows
about sampling and discards it; `single` knows about arity and adds a
condition PostgreSQL does not have. Each is a place where the walk holds the
right fact one line away from the rule that needed it.

That is a sharper statement than "young code": findings 5 and 6 are older than
every sweep, and finding 3 is older than two. What they share is a POSITION —
the FROM item — where the engine's model of "what rows does this produce" is
thinnest and where a wrong answer is worst, because a shape defect there
misassigns every later flag.

**RC-B — a structural reading over a data structure that was built for a
different question.** Finding 2. `scope.joins` was built to carry QUALS for
the presence fixpoint; the 2026-08-07 session then made it carry the JOIN TREE
for `subtreePreserves` / `subtreeAlwaysPresent` / `joinWithin`. Those two
purposes disagree about which joins belong in it, and the reading that arrived
second inherited the first one's filter. This is the same shape as sweep 2's
five-in-one root cause ("a fact was moved from the named relation to the
relation SET at the sites the fix phase was looking at rather than at every
site that asks the question") — here it is a fact moved from "quals" to "tree"
at the reader and not at the writer.

**RC-C — a catalog capture that answers a different question than the one
asked.** Finding 4. `pg_constraint` holds three rows where the schema author
wrote one key, and the adapter's map keeps whichever comes last. The
recurring heuristic the register already trusts — sweep every hand-curated
table against the catalog it approximates — has a converse this is the first
instance of: **sweep every catalog READ for rows PostgreSQL adds that nobody
wrote.** Partition clones, inherited constraints and index-backing rows are
all of that kind.

**RC-D — a contract whose two sides consume different subsets of the same
facts.** Finding 7. The output side reads "NOT NULL domain return" and "body
maps NULL to NULL"; the input side reads neither, though both are already
computed for the same call in the same walk.

### Recommended fix order

Soundness first, cheapest first, the widest-radius one last — the order the
three prior fix phases used.

1. **Finding 6** (rank 2, one boolean). It is the smallest and it is a SHAPE
   defect, which misassigns flags rather than just being one. Land it first so
   the later ROWS FROM work is done against the right column list.
2. **Finding 5** (rank 1, one descent parameter). Self-contained, no shared
   machinery, no fixture moves.
3. **Finding 3** (rank 1, one flag on `RelationEntry`). Self-contained; the
   only care needed is not to disturb `subqueryFromTree`'s accidental safety.
4. **Finding 1** (rank 1 + rank 4, one predicate). Must land before anything
   touches presence groups, since the group is a consequence.
5. **Finding 2** (rank 1, a change to what `scope.joins` holds). The widest
   radius of the five: every reader of that array is affected, and the
   presence fixpoint must learn to skip a qual-less entry. Dry-run against the
   generated corpus and the schema axis before landing.
6. **Finding 4** (rank 1 + rank 7, a snapshot column plus an adapter filter
   plus a NEW gate). Last because it is two changes that must land together —
   the capture fix makes the `ONLY <partitioned parent>` hazard live, and a
   half-landed version is a new rank-1.
7. **Finding 7** (rank 3). Last, and gated on a DECISION rather than on code:
   what a `nullable` parameter claim means when a user function's body can
   raise. Do not write the rule before the wording is settled.

### What happens to `tests/probe/` — it does NOT retire empty

That convention belongs to the quarantine directory, whose contents GRADUATE;
this directory has no destination for its negative half. Checked rather than
assumed: the three prior sweeps' probe loops were never committed at all, so
"deleted after use" means "never landed", and the one probe harness that WAS
committed — `totality-probe.test.ts` — is permanent, with seven assertions each
mutation-tested to fail alone. Three dispositions:

1. **`harness.ts` stays**, as tooling. Three sweeps have now paid to rebuild it
   privately.
2. **Each fix's CONTROLS graduate beside it, as assertions** — `A5`/`A20`,
   `C31`, `C2`/`C3`, `FF16`/`FF24`, the seven-row ROWS FROM naming table
   (`N1`–`N7`), the XMLTABLE control (`N8`/`N9`), and finding 7's six-row
   accept/raise table. They currently sit as PROSE in the quarantine fixture
   headers, which asserts nothing. Each fails if its fix OVERSHOOTS — the
   failure mode a soundness fix has and the suite cannot presently see, and the
   reason `unsupported-nodes.test.ts` pins its refusals "WITH its positive
   control".
3. **The mechanism sweeps that held — B, D, E, F, ~40 probes, zero findings —
   are not graduated wholesale.** Run them through `capability-reach.test.ts` /
   the catalog spy and keep what moves capability reach or reaches a shape the
   corpus lacks (`E4`, `E6`, `F2` are the likely ones); drop the rest and let
   the section below stand as their record. Name the dropped ones in the
   closure entry, so "0 actionable" is not misread as "everything is covered".

Re-expressing, not copying: `A16`, `A18`, `A21` and `F1` return NO rows.
Copied naively they become fixtures that assert nothing while looking like they
do — the thing this suite holds at zero.

### Negative results — what held, under what shapes

Worth as much as the bugs, per the first charter. Recorded per section.

**A — the strict short-circuit (18 probes).** The mechanism itself held
everywhere except through the padding, which is not its fault. Sound under:
named notation with a nullable argument (`A7`) and with a name matching no
parameter (`A8`); a VARIADIC strict call with a NULL ELEMENT (which does NOT
stop the call — `A9`) and with a NULL ARRAY (which does — `A10`); a strict
operator's backing function (`A11`); a strict call inside a VIEW (`A12`) and
inside a CTE (`A13`); an argument that is itself a short-circuiting call
(`A14`); an aggregate over a NOT NULL domain with an empty FILTER (`A15`); a
strict SRF under `LEFT JOIN LATERAL` (`A6`) and with `WITH ORDINALITY` alone
(`A16`, no rows, so nothing to contradict); a strict SRF as a MERGE source
(`A21`, no rows); the `ROWS FROM` coldeflist arm, whose declared columns carry
no flags to lose (`A19`); a one-arm `ROWS FROM` (`A20`).

**B — argument substitution (12 probes). Nothing.** The most thoroughly
attacked section and the cleanest. Sound under: a default that is itself a
call to a defaulted function whose own default is NULL (`B1`); a default
naming `CURRENT_USER` (`B2`) and a volatile one (`B3`); a default that raises
when evaluated (`B4` — a raise contradicts nothing); an overloaded name whose
picked candidate defaults to NULL and is strict (`B5`, `B6`, `B12`); the
substituted default reaching the body that is read back, both ways (`B7`,
`B8`); named notation skipping the middle of three (`B9`); the FROM-position
shape question asking the same argument vector (`B10`). The recorded
OUT-parameter boundary behaves as recorded (`B11`): `mid_out(t.id, 2)` reads
nullable where PostgreSQL returns the id — imprecise, not unsound.

Two structural checks were made by reading rather than probing and both hold:
`bindDefaultArguments` breaking at the first non-input parameter is SOUND, not
merely early (a position past it is absent from `bound` and
`allArgumentsNonNull` requires `bound[i] === true` per input parameter), and
the OUT-parameter misalignment in `fnParamNames` cannot leak, because an OUT
parameter is not referenceable from a `LANGUAGE sql` body.

**C — join-level presence (21 probes, 2 findings).** Beyond findings 2 and 3,
sound under: `ONLY` on an INHERITANCE parent, which is exactly where a key's
target lives (`C2`); the tree scan (`C3`); a USING join synthesising exactly
the key equality (`C5`); a NATURAL join synthesising a CONJUNCTION, which is
correctly not read as a key (`C6`); a subquery with its own WHERE as the
referenced side, refused because it is not a table (`C10`, `C12`); a CTE
shadowing the referenced table's name (`C28`); a NOT NULL self-referencing key
across a self-join (`C26`); an unrecorded CROSS JOIN in the referencing side
of `joinCannotExtendSide`, where it is genuinely harmless (`C14`, `C24`); the
same inside a recursive CTE's recursive arm (`S8`).

Two unaliased FROM functions both register under the empty alias, and the side
slicing (`keys.slice(aliasesBefore, aliasesAfterLeft)`) indexes
`scope.aliases.size`, so the second overwrites the first and one side's alias
set comes back EMPTY. Measured twice (`C7`, `C8`): no shape defect and no
wrong flag — the effect is conservative, because an empty alias set makes the
fixpoint's `rightPresent` false. Recorded as a latent hazard rather than a
finding: it is one legal statement away from mattering, and the fix for
finding 2 will be editing this exact code.

**D — the subquery chain (14 probes). Nothing.** Sound under: a join whose ON
references a relation from a third subtree (`D9`); the chain inside a LATERAL
(`D10`); an anchor settled by a self-lookup then one key hop (`D11`); a
self-lookup where both sides are `ONLY` a partitioned parent (`D12`); an outer
relation that is itself NULL-extendable but promoted (`D13`); the chain in a
RETURNING clause (`D6`); the anchor sampled away (`D14`) and its second hop
sampled away (`D8`) or cross-joined away (`D7`) — all three safe because
`subqueryFromTree` refuses any leaf that is not a plain RangeVar, and refuses
a join with no ON clause. The composition the 2026-08-07 session built is
correct on every shape tried (`D5`).

**E — `unnest` element typing (11 probes). Nothing.** Sound under:
`array_agg` of a composite column (`E1`), of an array (`E6`), with an inline
`ORDER BY` (`N11`) and with an empty FILTER (`N12`); `array_cat` mixing a
plain array and a DOMAIN over the same array (`E2`); `array_append` under
`anycompatible` unification (`E3`); `array_fill`'s element position plus TWO
dimensions (`E4`); an array of a DOMAIN over a composite through
`array_remove` (`E5`); a computed derived-table column (`E7`); a derived
column whose NAME collides with another table's base column (`E8`); a scalar
sublink (`E9`); a composite array concatenated with NULL (`E10`); the element
type through a defaulted call (`G6`). One new instance of the documented
refusal class, sound: `unnest(array_prepend(ROW('a',1)::sku_pair, NULL))`
refuses where PostgreSQL expands two columns, because the ARRAY-declared
position is a bare NULL and no signature answers (`FF21`). Rank 7, and it
belongs to `docs/type-aware-overloads.md`'s residue with the rest.

**F — `merge_action()` and MERGE arms (4 probes). Nothing.** The claim is
right on every shape the charter named: a `DO NOTHING` arm produces no row for
it to name (`F1`); `NOT MATCHED BY SOURCE` with a RETURNING referencing the
source names `DELETE` correctly while the source columns go NULL (`F2`); a
MERGE inside a CTE lifted through a LEFT JOIN goes nullable by join state
(`F3`); an arm firing for a source that never matched still names its arm
(`F4`). There is no shape in which a MERGE emits a row no arm produced.

**G — cross-mechanism (10 probes, no NEW mechanism).** Every hit was an
existing finding propagating, which is the useful negative result: the seams
between the six mechanisms are clean, and what crosses them is damage, not new
damage. The target-list SRF padding rule — finding 1's twin one clause over —
is CORRECT and clears the domain claim (`G1`, `G2`), which is the sharpest
evidence that the FROM-position gap is a gap rather than a policy.

**Parity and crashes: zero, across all 157 comparisons.** Every probe ran
`inferNullability` against `inferNullabilityTraced` and `inferPresenceGroups`
both ways. Four sweeps at zero. The engine threw no exception that was not an
`UnsupportedNodeError`; the "SqlError" lines in the probe logs are the PARSER
rejecting SQL PostgreSQL also rejected — my syntax errors, not the engine's.

### For the register

Two items belong in the register beyond the fixes.

**The arity-and-order gate (section 1) now carries thirteen defects across
four sweeps, four of them arity-preserving.** Finding 6 is the fourth. That is
no longer an argument; it is a count.

**A new standing check, the converse of the curated-table audit.** The
existing heuristic is "sweep every hand-curated TABLE against the catalog it
approximates". Finding 4 is the other direction: **sweep every catalog READ
for rows PostgreSQL adds that nobody wrote.** Partition-cloned constraints are
the instance found; inherited constraints (`coninhcount > 0`) and
index-backing rows are the same class, and the snapshot reads
`pg_constraint` without ever asking which rows are derived. Cheap to do once,
and it is a query, not a sweep.
