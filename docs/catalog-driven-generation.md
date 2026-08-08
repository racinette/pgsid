# Catalog-driven query generation — handoff

## What this document is

A self-contained brief for the next generation of the generated suite. Read
`docs/query-generator.md` first — it is the design of the generator that
exists, and this does not replace it. It changes what that generator ranges
over, and adds a second instrument beside it.

**The engine is a function of (AST, CATALOG). The corpus explores one
argument.** Everything here follows from that.

---

## 1. The measurement

Measured 2026-08-07, after the fourth adversarial fix phase. The corpus
references eight relation names across all 14,964 queries:

```
 14956  t        9904  v       1004  gm        4  ins
 13446  u        4934  q        329  ck        3  tags
```

`q` and `ins` are derived-table aliases, so the corpus queries **six**
relations of the **82** the fixture schema declares. (`gm` was counted as an
alias here and is a real table — `fixtures/schema.sql:114`, reached through
`rangeVar("gm")`; corrected by Step 0's own count in §7, which reads relation
names off the ASTs rather than the query text.) `t`, `u` and `v` carry no
keys, no constraints, no triggers, no domains. 93% of the schema is never
queried by a generated statement.

**All nine findings of the fourth sweep and its fix phase were unexpressible
in it:**

| finding | why the corpus cannot state it |
|---|---|
| ROWS FROM padding; ROWS FROM naming | no `ROWS FROM` emitted |
| qual-less joins | `JOIN_KINDS` is INNER/LEFT/RIGHT/FULL — no CROSS, no qual-less — **and** no FK to entail |
| TABLESAMPLE | not emitted |
| FK partition clones, and the fix's own regression | no partitioned table, no foreign key |
| JSON_TABLE nested ordinality | not emitted |
| user-function body rejection | no such function class in reach |
| builtin NULL-rejecting arguments | no `array_fill` |

This is not new. `docs/generated-surface.md` recorded the same shape after the
THIRD fix phase — 8,980 queries reporting zero disagreements both before and
after eight closed findings, "because it could not EXPRESS a single falsifying
input". The response then was to widen the corpus structurally. The
measurement above says the axis that needed widening was the other one.

**Read its green correctly.** "14,964 queries, 0 violations" means *no
regression in the structural space already covered*. It has never been the
thing that found a defect. That is a real role — a regression net — but it is
not the assurance the number looks like, and the report should say so in its
own output.

### `capability-reach` reads 34 of 34 over this, and is not the metric that is missing

**Corrected 2026-08-08 — an earlier draft of this section said it "must be
replaced", and that does not follow from its own argument.** It counts
*accessors the walk ASKS*, so `resolveForeignKeyTree` is "reached" when it is
asked over `t` and answered `null`. That makes it a measure of interrogation
rather than variety — which is why the schema axis moves it by exactly zero —
and interrogation is a real question no other instrument here answers: **when a
new capability lands in the walk, does any query reach it at all?** A corpus
can be endlessly varied in its catalog and still never ask. Deleting it would
delete the only check on that.

The two are complements, and the suite already splits the corpora between them:
`capability-reach.test.ts` holds the GENERATED corpus to a floor in both
directions (a capability going cold is a regression, one going warm undeclared
is drift), and `catalog-census.test.ts` holds the FIXTURE corpus to an exact
set, where a cold capability means a branch has lost its only executable
coverage.

What is genuinely missing beside it is level 2 of the query fingerprint (§6):
count the CATALOG PROFILES the corpus actually queries — which declared
features appeared on the columns and relations a query touched. Over
`t`/`u`/`v` that number is 1; over the six relations the corpus really names it
is 5, against 39 in the schema (§7). That is the number nothing was reporting.

---

## 2. The direction

**Point the generator at the application schema that already exists**, and
generate over the catalog the way `tests/unit/query/fixture-data/` already
generates DATA over it.

The realistic schema is not work to be done. `customers`, `orders`,
`order_items`, `products`, `reviews`, `addresses`, `shipments`,
`payment_methods`, `coupons`, `categories`, `tags`, `product_tags`,
`subscription` — with meaningful foreign keys, NOT NULL columns, CHECK
constraints, domains, generated columns, partitions and triggers. The
hand-written fixtures query it extensively. The generator was never pointed at
it.

So: change what the generator ranges over, not what the schema contains.

### `t`/`u`/`v` are frozen

Not migrated, not extended, not used again.

- **The fixtures that reference them keep them.** They are pinned and passing,
  and each asserts something specific. Rewriting them onto a realistic schema
  moves a large number of claims in one diff, where a claim that moved because
  the migration was wrong is indistinguishable from one that moved correctly.
  The risk buys nothing.
- **Nothing new uses them** — generator, fixture, or variant. Their failure
  mode was becoming the default vehicle for anything needing a table. The fix
  is to stop.

### Do not prune the rest of the schema by looking for unused relations

Measured 2026-08-08, because "point the generator at the realistic tables and
delete the obscure ones" is the obvious next thought and it is a trap. Only
SEVEN of the 82 relations are named by no fixture and no test source, and five
of those are structural counterparts that nothing names BY DESIGN — the point
of each is that scanning its parent reads it:

| relation | what it is |
|---|---|
| `inh_c` | the child that makes `ALTER TABLE ONLY inh_p … SET NOT NULL` observable — it is what makes `notNullTree` false on the parent |
| `fk_chi` | the inheritance child holding rows the key never saw; the gate `resolveForeignKeyTree` exists for |
| `sw4_ic` | sweep-4's inheritance control, the same shape |
| `gen_c` | dropping it loses `generation-diverging-in-the-tree` outright |
| `iot_base` | `DROP … CASCADE` takes `iot_v` with it, and `instead-of-trigger` with that |

Dropping the first three fails NO test — the census only asserts a feature
exists somewhere, and each of theirs survives on another relation — while
silently flipping the exact gates the fixtures querying `inh_p` and `fk_par`
assert. That is the removal to be careful of: green, and wrong.

The remaining two, `sw4_c`/`sw4_r`, were genuinely orphaned, and the reason was
a missing test rather than dead DDL. Their schema comment ("a key whose two
columns share a NAME, so a USING or NATURAL join synthesises exactly the key
equality — the control for the join recording") describes a case no fixture
covered: `fk-entail-natural-no-common-columns.sql` pins that a NATURAL join
synthesising NO equality entails nothing, and the direction where the
synthesised equality IS the key was never written. Both halves exist now
(`fk-entail-using-synthesized-key.sql`, `fk-entail-natural-extra-conjunct.sql`),
each mutation-tested to fail alone, and `sw4_c.v`/`sw4_r.v` gained a shared
vocabulary so the second one's presence group observes both arms.

---

## 3. The tool

A discovery instrument. It:

1. generates **syntactically correct** queries;
2. **tends toward** semantically correct ones — "tends" is deliberate: a
   rejection is a defect to classify, not a reason to constrain the generator
   into safety;
3. uses **as many SQL constructs as it can reach** (bounded by §5.1);
4. emits **all DML, not just SELECT** — INSERT, UPDATE, DELETE, MERGE — rolled
   back in `BEGIN`/`ROLLBACK`, because the dataset is generated once per
   session and every query must see the same one;
5. leaves **rejected queries for an operator to triage**, so the generator gets
   fixed rather than quietly narrowed;
6. **compares execution against the engine's claims**; a disagreement is a
   fixture and a fix.

### What it owes on inputs

It owes no coverage claim (§4). That is about ACCOUNTING and is not permission
to be careless with inputs: a query returning nothing burns a run and produces
no signal. Bad data does not make the finder wrong, it makes it weak, and
inputs are the cheapest control plane available.

- **Valid data.** Foreign keys resolve, domains hold, CHECKs are satisfied,
  keys are unique. `fixture-data/generate.ts` already does this — though not
  for a fully arbitrary catalog: it needs a per-table entry whenever a
  constraint is not inferable from types. Adding the sweep-4 partitioned tables
  produced duplicate-key violations until explicit range generators were
  written for the parent AND each partition, because a partitioned parent's
  routed rows share a unique index with rows seeded into a partition directly.
  Budget one entry per table with a range or cross-table invariant; the type
  and foreign-key tiers cover the rest.
- **A big dataset**, so a random query returns two or three rows rather than
  none. Set a **NULL rate per nullable column** (`generate.ts` carries
  `nullRate(p)` already) and a **row count per table — including zero for one
  or two**, since an empty relation is the one witness random data never
  produces on its own, and it is what made sweep-4 finding 2 observable.
- **Literals drawn from the data.** Volume does not buy overlap: `WHERE p.name
  = 'zeta-17'` returns nothing against a million rows if the literal came from
  a type generator. Predicate and parameter literals come from
  `drawFrom`/`ctx.values(table, column)` — the mechanism that already makes
  foreign keys resolve — applied one layer up. Ranges survive volume; equality
  does not.
- **Danglable rows wherever a key permits one** (a nullable FK, a NOT VALID
  key, a parent with optional children). A dataset where every reference
  resolves turns every outer join into an inner join. See §5.2.
- **Reproducibility.** It gates nothing, but a finding must replay from
  `seed + query id` alone. Cheap now, impossible to retrofit.
- **The rejection rate is a worklist, not a filter.** Report it, classify the
  causes, close them. Silently skipping one is forbidden.

### Non-canonical joins are in scope

A join on columns no key relates is legal SQL, common in applications, and
takes a different path through the engine — no entailment, no key gate, pure
join-state reasoning. Both paths need traffic, so the schema should carry a few
relations with no foreign keys and the walker should sometimes join on a
non-key column or relate two tables nothing connects.

This is what `t`/`u`/`v` were doing by accident for years. It becomes one
deliberate case among many, over a schema that declares things.

---

## 4. Two instruments, with opposite requirements

The central decision. Conflating these is what made every earlier draft of this
document complicated.

|  | COVERAGE | DISCOVERY |
|---|---|---|
| space | bounded, enumerated | unbounded, randomised |
| every claim adjudicated | yes — that is what coverage means | no, and it must not try |
| deterministic | required | not required |
| speed | gates CI | gates nothing |
| success | green | findings per run |
| output | a number you can trust | candidate fixtures |
| today | the enumerated corpus + 411 fixtures | the four adversarial sweeps, by hand |

**A finding is self-adjudicating; coverage is not.** The engine claims
`notNull` and PostgreSQL returned a NULL — a fact, needing no rule, no reason
and no reviewer. So is an ordered-name disagreement, a parity break, a crash, a
rejection, a presence-group row the contract forbids. The only ambiguous signal
in the apparatus is the unwitnessed nullable claim, and that is a coverage
metric rather than a defect.

**So the randomiser consumes only self-adjudicating signals and makes no
coverage claim.** It is a sweep that runs itself: the human leaves the search
and stays in the promotion. What that buys:

- **Emptiness stops being a problem.** A query returning no rows contributes no
  rank-1 signal, and that is the whole of it — no tag, no excuse, no
  classification. It still contributes shape, parity and rejection signal:
  `res.fields` comes back from an empty result (measured — `WHERE false` still
  returns the full column list), so the ordered-name comparison runs at full
  strength on zero rows.
- **No unwitnessable rules are owed**, so the 12% mislabelling rate the reason
  audit measured has no surface to attach to.
- **It may be slow, non-deterministic and unbounded**, because it gates
  nothing. Run it nightly, or for an hour on demand.

The enumerated corpus keeps its current discipline unchanged — the axes, the
bound printed with the result, the UNWITNESSABLE rules and their bidirectional
staleness check. Nothing about it gets looser. It stops being asked to do a job
it was never shaped for.

---

## 5. Constraints that bite

### 5.1 The reachable language is bounded by the DEPARSER, not the parser

The generator builds an AST and the suite deparses it to get the text both the
engine and PostgreSQL see. A construct the deparser cannot emit is unreachable
however well the parser and engine handle it — every such query lands in
`deparse-threw` and never reaches PostgreSQL. Check this before widening the
vocabulary; it is invisible until a whole axis produces zero signal.

Measured 2026-08-08:

| construct | deparses? |
|---|---|
| `ROWS FROM (…)`, multi-arm | yes |
| `TABLESAMPLE BERNOULLI (n)` | yes |
| `CROSS JOIN` | yes |
| comma join | yes |
| `unnest(…)` | yes |
| `JSON_TABLE(…)` | **no** |

`KNOWN_DEVIATIONS` in `deparser-roundtrip.test.ts` is the full boundary, and it
is wider than one node: the SQL/JSON constructor family is un-deparsable,
`array-slices` and `expression-node-coverage` re-parse wrongly,
`window-default-frame` comes back with mangled bounds, and recursive-CTE
`SEARCH`/`CYCLE` are dropped while still parsing.

**DECIDED 2026-08-08: the generator keeps building ASTs.** This section
previously floated generating TEXT instead, on the argument that one would only
render *what the generator emits, not the language*. That argument fails for
this instrument specifically: the discovery generator is RANDOMISED over an
unbounded space (§3), so what it emits approaches the language, and the
rendering cost is a query builder — precedence, identifier quoting, literal
escaping, type-name rendering — which is harder to get right than juggling AST
nodes and has no oracle of its own.

The ceiling is smaller than the table above reads. The 13 pinned deviations
across 411 fixtures are **five upstream defects in `pgsql-deparser`**, not a
structural boundary: the `JsonTable` node is unhandled (6 fixtures), the
SQL/JSON constructor and `JsonFuncExpr` nodes are unhandled (2), subscripting
emits a stray `[` (2), recursive-CTE `SEARCH`/`CYCLE` are dropped (2), and an
explicit window frame comes back with its bounds mangled (1). Each is a bug
report, and each is already pinned in both directions by `KNOWN_DEVIATIONS`, so
a fix upstream fails the suite with "was pinned as `deparse-threw`, now
`identical`" rather than passing unnoticed.

So the gap is ACCOUNTED, not silent, and §5.4's promotion rule is what keeps it
that way: one static fixture per non-deparseable class, which the soundness
suite reads as SQL text and never deparses. Reporting the five upstream is the
standing follow-up.

### 5.2 An FK join always matches, so absent arms need a direction

The current corpus gets absent arms from one hand-written trick — 25% of
`u.t_id` dangles, and the comment says why: "`u` declares NO foreign key … with
every reference resolving, an outer join is an INNER join and its NULL-extended
columns are never observed."

Follow a real key and that is illegal: PostgreSQL enforces the reference, so no
row can dangle. An FK-driven spine emits LEFT, RIGHT and FULL joins by the
thousand and witnesses the null-extension of none. Which direction is
inhabitable is a property of the schema:

| shape | absent arm inhabitable? |
|---|---|
| parent → child (`customers LEFT JOIN orders`) | always — a parent with no children needs no violation |
| child → parent (`orders LEFT JOIN customers`) | only if the FK column is NULLABLE — this schema has three: `categories.parent_id`, `products.category_id`, `customers.default_address_id` |
| child → parent over a `NOT VALID` key | yes — pre-existing rows are unchecked; the schema carries one |
| either, under a filtered / sampled / cross-joined side | yes — sweep-4 findings 2 and 3 |

So the walker carries a per-edge verdict and biases toward parent→child, or the
outer-join half of the corpus is decorative.

**Hazard: common-mode error.** The engine's foreign-key entailment reasons
about this exact question. If the generator decides it the same way, both can
be wrong together and the corpus confirms the bug. What keeps the answer key
independent is that PostgreSQL always adjudicates — a claim is falsified by a
returned row, never by the generator's model of what should have been returned.

### 5.3 Modifying statements need more than a rollback

DML is where a third of the engine's mechanisms live.

1. **`RETURNING` is the only observable.** Without it a DML statement produces
   no output columns, so no nullability claims and no rank-1 or rank-4 signal —
   only shape, parity and refusal. Emit it on almost every modifying statement;
   the fraction without one should exist deliberately, to exercise the
   no-output path.
2. **Written values have the overlap problem too, with worse consequences.** A
   random `INSERT` value collides on a PK (`23505`), dangles an FK (`23503`) or
   fails a CHECK (`23514`) — the statement raises, no rows, budget gone. Same
   fix one layer over: an FK column draws from the parent's seeded values, a
   surrogate key takes a fresh one, a constrained column uses its own
   generator.
3. **`UPDATE` and `DELETE` need their WHERE to match**, or they return zero
   `RETURNING` rows.
4. **MERGE arms only fire when the data makes them.** `WHEN NOT MATCHED BY
   SOURCE` needs a target row with no source match. A source drawn entirely
   from the target's keys exercises one arm and never the others — measured the
   hard way in the sweep-4 fix phase, where a MERGE fixture's presence group
   reported "present arm never observed" until the source was widened. Sources
   must straddle.
5. **The write-rewrite hooks are the high-value target.** `RETURNING` reports
   the row AFTER PostgreSQL's rewrite stage, and the engine models all three
   rewriters: a BEFORE ROW trigger replacing NEW, an INSTEAD OF trigger on a
   view, a DO INSTEAD rule. The schema already carries trigger-bearing tables,
   rule-bearing views, and partitioned targets whose triggers fire on the
   DESTINATION partition after row movement.

**Sequences ignore ROLLBACK.** Identity columns are non-transactional — two
rolled-back inserts returned `id` 1 then 2 (measured in PGlite 2026-08-08). So
`INSERT … RETURNING id` yields different values on a re-run with an identical
seed. Harmless for nullability, fatal for a fingerprint or a repro keyed on
returned VALUES. Key on structure.

### 5.4 The round-trip guard

Anything the deparser mangles or drops is a construct the corpus believes it
tested and did not. **Compare the whole re-parsed AST to the one the generator
built.** This replaces the current per-axis `expectations` predicates rather
than supplementing them: it catches drops nobody thought to predict, and needs
no per-construct work.

The obvious objection is that deparse/re-parse normalises legitimately, so
equality would false-positive. Measured 2026-08-08 over 411 fixtures:
**398 identical**, 8 deparse-threw, 3 reparse-failed, **2 AST-differed** — and
those two are the recursive-CTE `SEARCH`/`CYCLE` drop, precisely what the check
exists to find. Whether randomised generation produces *harmless* differences
is unknown, because those fixtures were written by a person who may simply have
avoided the spellings a deparser normalises; check the identical rate on the
first few thousand random queries.

A query whose round trip is not identical is **discarded from finding analysis**
— we cannot claim the text tests what the AST asked for — and **counted**. The
run reports the rate and the classes, which are the raw material for upstream
bug reports.

**Every non-deparseable class is promoted to a static fixture**, so nothing is
silently unreachable: one minimal fixture per class (not per instance, or the
corpus fills with fifty JSON_TABLE variants) plus a `KNOWN_DEVIATIONS` entry.
That list is bidirectional — if the deparser is fixed upstream the suite fails
with "was pinned as `deparse-threw`, now `identical`" — so a construct can
neither quietly stay broken nor quietly become fixed. The fixture keeps full
value elsewhere: the soundness suite reads SQL text from the file and never
deparses, which is why the five `jsontable-*` fixtures are pinned deviations in
one suite and ordinary falsifiable fixtures in the other.

---

## 6. The error protocol

What a 10,000-query run produces, and how anything acts on it.

### Every query lands in exactly one bucket

No `other`. An outcome nothing classifies is itself a finding — a bucket is
missing — and it fails the run rather than being swallowed.

| bucket | what happened | tier |
|---|---|---|
| `generator-threw` | the generator could not build the AST | TOOL |
| `deparse-threw` | deparser has no case for a node | TOOL |
| `reparse-failed` | deparser emitted SQL PostgreSQL cannot parse | TOOL |
| `ast-differed` | round trip changed the tree | TOOL |
| `pg-rejected` | PostgreSQL refused the statement | TOOL |
| `pg-raised` | executed and raised | BUDGET |
| `engine-refused` | `UnsupportedNodeError` | EXPECTED — count, classify by site+tag |
| `engine-crashed` | any other exception from the walk | **FINDING** (rank 6) |
| `shape-mismatch` | ordered column names disagree | **FINDING** (rank 2) |
| `notnull-violated` | claimed `notNull`, a row had NULL | **FINDING** (rank 1) |
| `group-violated` | a row the presence-group contract forbids | **FINDING** (rank 4) |
| `parity-broke` | traced and untraced walks disagree | **FINDING** (rank 5) |
| `param-violated` | claimed nullable, binding NULL raised | **FINDING** (rank 3) |
| `agreed-rows` | executed, rows returned, everything agreed | signal, no action |
| `agreed-norows` | executed, no rows | not an error |

- **FINDING** — the product. Becomes a fixture and an engine fix.
- **TOOL** — our bug. Fix the generator or the deparser. Never a filter: a
  rejected query is classified, not skipped.
- **BUDGET** — legal but wasteful. `pg-raised` and `agreed-norows` produce no
  signal, so a high rate means the run is spending itself on nothing. A quality
  metric of the tool, never a correctness problem.

`pg-rejected` and `pg-raised` are subdivided by **SQLSTATE** (`42601` syntax,
`42883` undefined function, `23505` unique violation, …), never by message
text, which drifts between versions. Each class is a work item with a count.

### Two fingerprints

- the **FINDING fingerprint** groups instances of one defect, so a report reads
  *one finding, 340 instances* rather than 340 findings;
- the **QUERY fingerprint** groups structurally identical queries, so a run can
  answer *how many genuinely different things did I just test?*

10,000 random queries hitting one bug produce hundreds of instances. A report
listing them all is unusable and hides how many DISTINCT things were found.

The finding fingerprint is composed from the bucket, plus — for an engine
finding — the query's SHAPE and the index of the offending column, or for a
tool defect the node kind or SQLSTATE and the construct that triggered it.
**Never the SQL text**, or every random literal mints a fresh finding. Expect
to iterate on it, and expect the first version to be too specific rather than
too loose, because that is the direction that flatters.

### The query fingerprint, at three granularities

| level | key | answers |
|---|---|---|
| 1. shape | the AST with names and literals erased — node kinds, nesting, join types, clause presence | how many structural skeletons? |
| 2. shape + catalog profile | shape, plus the properties of each column and relation used: nullable / NOT NULL / domain / FK / partitioned / generated / trigger-bearing | how many skeletons over genuinely different catalogs? |
| 3. node-kind set | which parse-tree node kinds appeared | maps onto the node census |

All three are computed from the AST and the catalog snapshot — no engine
involvement, because diversity is a property of what was GENERATED.

Level 2 is the one the current corpus fails: large shape variety, a single
catalog profile. A run reporting *14,964 queries, ~9,000 shapes, 3 catalog
profiles* would have said so in one line, years ago.

### The saturation curve

Watch **new distinct fingerprints per 1,000 queries**, at each level, not the
total.

- Climbing: volume is buying something.
- Flattening: the generator has exhausted its vocabulary and every further
  query is waste. The fix is new vocabulary — relations, constructs, catalog
  features — never more volume.
- Flat immediately at high volume is the `t`/`u`/`v` signature.

### Return rate

The fraction of queries returning at least one row, over queries that CAN
return — a SELECT, or DML with RETURNING. An INSERT without one is excluded
from the denominator rather than counted as a failure.

Worth tracking because it is EMERGENT: it measures whether the query space and
the data overlap, controlled indirectly through literal-drawing and dataset
size. NULL rates and row counts are settings, so measuring those only confirms
they took effect. Something near half is a reasonable working figure — watch it
move rather than hit a target.

Not a coverage claim. We cannot guarantee every query returns, nor that what
returns witnesses every claim it carries. The reliance is on volume: enough
queries returning over a varied catalog exercises many claim shapes, some more
than others.

### One representative per fingerprint, kept verbatim

Promoted as a fixture exactly as generated. It needs no reduction:

- **the trace names the cause** — `inferNullabilityTraced` gives a decision tree
  per output column with the decisive reason at each node, so a finding arrives
  with the rule that concluded wrongly;
- **large fixtures are normal here** — 32 `extreme-*` fixtures, up to 224
  lines, exist precisely to pin interactions between constructs.

Deduplication needs nothing either, since fingerprints key on shape rather than
text.

### Output

One JSONL record per unique fingerprint, ranked most-severe first, carrying:
fingerprint, bucket, tier, instance count, repro SQL verbatim, seed and query
id, the engine's claim, PostgreSQL's observation, and the construct set. Enough
that the next step is mechanical:

| tier | next action |
|---|---|
| FINDING | graduate the query as a fixture with the corrected claim, then fix the engine |
| TOOL | fix the generator or deparser; the fingerprint is the regression test |
| BUDGET | tune the data or the literal-drawing; no code is wrong |

Each run reports everything it found, with no memory of previous runs. Suppress
nothing.

### The negative result carries its bound

A run that finds nothing states what it covered: queries generated, distinct
fingerprints at each level, relations touched, rejection rate with its SQLSTATE
breakdown, and the budget lost to `pg-raised` and `agreed-norows`. A bare "0
findings" over an unstated space is the number this document exists to
distrust.

---

## 7. Step 0 — RUN 2026-08-08

Produce the work list by measurement rather than judgement:

**Which of the 82 relations carry a catalog feature no generated query can
reach?** The converse of capability reach — a query, not a sweep — and it turns
"point it at the schema" into a ranked list. Run it before choosing which
tables the generator is allowed to put in a `FROM` clause first.

Expect foreign keys, partitions and domains to dominate, because that is where
the last two sweeps' findings were. But the point is to measure, not to expect.

### The vocabulary is `catalog-features.ts`, called per relation

Not a second list. The census's own `detect` predicates run against a snapshot
restricted to ONE relation, which needs no new classification and cannot drift
from the census. Two mechanical rules make that work:

- **Which census features are relation-scoped** is itself measured: a feature is
  relation-scoped exactly when removing every relation from the snapshot turns
  its detector off. Domains, composites, function shapes and the environment
  sets survive that and fall out on their own. **47 of the 87 are
  relation-scoped**; 33 of those are carried by the fixture schema and 14 are
  the census's existing `absent` markers.
- **A relation carries a feature two ways.** SUFFICIENT — it still detects with
  only that relation present. NECESSARY — it detects over the whole schema and
  stops when that relation is removed. The second is not decoration:
  `table-row-type-column` needs the holder AND the table whose row type it is,
  so restriction alone credited it to neither and it disappeared between the
  schema total and the per-relation sum. With both, all 33 are attributed.

A hand-written vocabulary was the first attempt and it drifted inside an hour —
it tested `ColumnInfo.identity` against the catalog chars `'a'`/`'d'` rather
than the enum `"always"`/`"byDefault"`, so identity columns read as absent, and
it minted `quoted-identifier-for-case`, a name the census already uses for a
function's return-type identifiers. Both were caught only by asking which
detectors never fired anywhere, which is the check any list like this needs.

### The measurement

**Six relations of 82**, across all 14,964 queries: `t`, `u`, `v`, `ck`, `gm`,
`tags`. §1 above says five and calls `gm` a derived-table alias — `gm` is a
real table (`fixtures/schema.sql:114`), queried through `rangeVar("gm")`; `q`
and `ins` are the aliases. The relation names come from every `relname` key at
any depth, because the generator spells a DML target as an INLINED RangeVar
struct and keying on the `RangeVar` wrapper alone misses every write target.

**5 distinct catalog profiles across the queried set, against 39 in the
schema** — the level-2 fingerprint of §6, which predicted 1 over `t`/`u`/`v`
alone and is not much better over the six.

**7 of the 33 relation-scoped features are reachable. 26 are not.**

| | |
|---|---|
| reachable | `domain-over-array-column` (ck), `generated-stored-column` (gm), `identity-column` (tags), `inheritance-parent-without-children` (all six), `pg18-not-null-constraint-row` (all six), `primary-key` (ck, tags), `setof-table-return` (u) |
| unreachable | `array-of-composite-column`, `array-of-domain-column`, `array-of-table-row-type-column`, `before-row-trigger`, `check-no-inherit`, `composite-column`, `deferrable-foreign-key`, `do-instead-rule`, `foreign-key-cloned-onto-a-partition`, `foreign-key-on-an-inheritance-parent`, `generation-diverging-in-the-tree`, `inheritance-parent-with-children`, `instead-of-trigger`, `not-enforced-check`, `not-null-on-the-parent-only`, `not-valid-check`, `not-valid-foreign-key`, `partition-leaf-carrying-a-trigger`, `partitioned-parent`, `range-type-column`, `self-referencing-foreign-key`, `sub-partition`, `table-row-type-column`, `validated-check`, `validated-single-column-foreign-key`, `view` |

**Every constraint mechanism the engine reasons from is in the second column.**
Not one validated CHECK, not one foreign key of any kind, no trigger, no view,
no partition. §1's "`t`, `u` and `v` carry no keys, no constraints, no
triggers" is exact as far as it goes, and the three relations it does not name
add a domain-over-array column, a stored generated column, an identity column
and a `SETOF u` return — nothing structural.

### Two ranked lists, answering two different questions

The same 82 tables order differently depending on what you ask for, and the two
orders barely overlap. Both are printed by the script.

**List 1 — the fewest tables that touch every missing feature.** Take the table
carrying the most features nothing else has, cross those off, repeat. Sixteen
tables reach all 26:

```
 1. inh_p       +4  check-no-inherit, inheritance-parent-with-children,
                    not-null-on-the-parent-only, partition-leaf-carrying-a-trigger
 2. guest       +3  not-enforced-check, not-valid-check, validated-check
 3. sw4_rs      +3  foreign-key-on-an-inheritance-parent, partitioned-parent,
                    validated-single-column-foreign-key
 4. pair_holder +2  array-of-composite-column, array-of-domain-column
 5. trow        +2  array-of-table-row-type-column, table-row-type-column
 6. iot_v       +2  instead-of-trigger, view
 7. addresses   +1  self-referencing-foreign-key
 8. cc          +1  composite-column
 9. fk_df       +1  deferrable-foreign-key
10. fk_nv       +1  not-valid-foreign-key
11. gen_p       +1  generation-diverging-in-the-tree
12. inh_c       +1  before-row-trigger
13. part_2      +1  sub-partition
14. rng         +1  range-type-column
15. rule_src    +1  do-instead-rule
16. sw4_pref    +1  foreign-key-cloned-onto-a-partition
```

**List 2 — the tables that can be joined to each other.** Following the 19
single-column foreign keys splits the schema into five separate groups, where a
generated query can only join tables within one group:

```
13: addresses categories customers fk_df fk_nv fk_par order_items
    orders product_tags products reviews shipments tags
 2: sw4_c sw4_r     2: sw4_ip sw4_iref
 2: sw4_pp sw4_pref 2: sw4_rs sw4_rt
61 tables have no single-column foreign key in either direction, so nothing
can be joined to them by a key at all.
```

**The two lists barely overlap, and choosing between them is what this step
exists to force.** Thirteen of list 1's sixteen tables are in that group of 61:
a generator can put each in a `FROM` clause, but cannot join them to anything,
so it gets catalog variety and one-table queries. The group of 13 is the
opposite — it is the whole e-commerce half, and it already contains `tags`, one
of the six tables the corpus queries today, so a generator can start joining
without being given any new table at all. But those 13 carry only **8 of the
26** missing features.

The other **18 are only on tables no key connects to anything**. So no amount
of following foreign keys reaches them, however many tables the generator is
allowed to use. Reaching them means also joining on ordinary non-key columns,
which §3 already asks for under "non-canonical joins are in scope" — this
measurement turns that from a nice-to-have into a requirement, and says how
much rides on it.

The expectation at the head of this section holds for foreign keys and
partitions, which are most of what the group of 13 contributes. It does not
hold for domains: `domain-over-array-column` is already reachable through `ck`,
and what remains (`array-of-domain-column`, and the composite and row-type
families) are column-TYPE features on unjoinable tables — they arrive with a
table, not with a join.

### One correction to §5.2

Its table names `customers.default_address_id` as one of the three nullable
keys pointing from a child row to its parent. The column is on `addresses` and
references `addresses` — a table pointing at itself, not `customers` pointing
at `addresses`.

That matters because of what §5.2 is about: PostgreSQL enforces a foreign key,
so if you `LEFT JOIN` from the child to the parent, every child row finds its
parent and the join never produces a NULL-extended row — there is nothing for
the outer join to be outer about. It can only produce one where the key column
is nullable (the child may point at nothing) or the key is `NOT VALID` (rows
predating it were never checked). Measured, that is true of exactly four
foreign keys in this schema:

| foreign key | why a NULL-extended row is possible |
|---|---|
| `addresses.default_address_id → addresses` | the column is nullable |
| `categories.parent_id → categories` | the column is nullable |
| `products.category_id → categories` | the column is nullable |
| `fk_nv.o_id → orders` | the key is `NOT VALID` |

For the other 15, only the reverse direction works — join from the parent to
the child, where a parent with no children needs no violation to exist. And two
of the three nullable ones point a table at ITSELF, so unless the generator can
join a table to itself under two aliases, the child-to-parent direction has
exactly one usable instance in this schema (`products.category_id`).

---

## 9. The vocabulary work list

Measured 2026-08-08. `node-census.test.ts` classifies **86** parse-tree node
types (excluding `analyzed-only`, which `parseSql` cannot produce). The
discovery generator emits **10**:

```
A_Const  A_Expr  BoolExpr  ColumnRef  JoinExpr
NullTest  RangeVar  ResTarget  SelectStmt  String
```

**25 are unreachable on the AST path** (§9.5 — the deparser cannot emit them,
which is the ceiling §5.1 accepted). **51 remain**, grouped below by what it
takes to add them rather than alphabetically, because most arrive in batches:
one projection axis brings a dozen expression nodes at once.

Status per node is measured, not assumed. A node the ENUMERATED corpus emits is
proven deparsable — that suite deparses every query it generates. The rest were
round-tripped individually (parse → deparse → reparse → compare).

### 9.1 Expression vocabulary — BUILT 2026-08-08

All ten forms emit; the generator now reaches 20 node types rather than 10.
`SubLink` is the one entry that moved out of this group — it is a query shape
rather than an expression form and belongs with §9.2.

The design decision worth keeping: these are TARGET-LIST entries, not WHERE
entries. The engine makes one claim per OUTPUT COLUMN, so an expression in the
target list is adjudicated by PostgreSQL on every returned row, where one in a
WHERE only changes which rows come back — and predicates already get their
traffic from the shapes §9.4 covers.

FLAT, one level, no nesting. Only three forms need their operands to agree on a
type (`coalesce`, `greatest`, `ARRAY[…]`), and that is a bucket keyed on
`ColumnInfo.typeName` — pick a bucket, take two columns out of it. A recursive
builder threading a wanted type was drafted and withdrawn: nesting is what
forces it, and nesting's value is unproven, since the walk dispatches per node
and what matters is that each kind APPEARS. Add it later against evidence if
ever.

One thing it exposed: `booltest` had nothing to apply to. The schema's only
BOOLEAN columns were on `t` (frozen), `billing.invoices` (not generated) and
`payment_methods` — which no foreign key reached, so an e-commerce schema had
orders that referenced no payment method. `orders.payment_method_id` is that
missing key, nullable because an order exists before it is paid for, and it
brings both the table and the form into reach.

### 9.1a Expression vocabulary — the original list

Today a target is always a bare `ColumnRef` and a predicate always a comparison
or a null test. Everything here is a target-list or WHERE entry:

| node | spelling | proven by |
|---|---|---|
| `CaseExpr`, `CaseWhen` | `CASE WHEN … THEN … END` | enumerated |
| `CoalesceExpr` | `coalesce(a, b)` | enumerated |
| `MinMaxExpr` | `greatest(a, b)` / `least` | round-trip |
| `A_ArrayExpr` | `ARRAY[…]` | enumerated |
| `RowExpr` | `ROW(a, b)` | enumerated |
| `TypeCast` | `x::text` | enumerated |
| `A_Indirection` | `(x).field` | enumerated |
| `BooleanTest` | `x IS TRUE` / `IS NOT UNKNOWN` | round-trip |
| `CollateClause` | `x COLLATE "C"` | round-trip |
| `SQLValueFunction` | `CURRENT_DATE`, `SESSION_USER` | round-trip |
| `FuncCall` | any call — and with it aggregates, `FILTER`, `OVER`, `WITHIN GROUP` | enumerated |
| `NamedArgExpr` | `f(x => 1)` | round-trip |
| `XmlExpr`, `XmlSerialize` | `xmlelement`, `xmlserialize` | round-trip |
| `SubLink` | a scalar subquery, `EXISTS`, `IN`, `ANY`/`ALL` | round-trip |
| `ParamRef` | `$1` — and the whole parameter contract with it | enumerated |
| `Boolean`, `Float`, `BitString`, `Integer` | literal leaves, arriving with the above | — |

`FuncCall` and `SubLink` are the two that carry the most engine behind them:
strictness, totality, aggregate emptiness and the builtin tables for the first;
correlated-subquery entailment for the second.

### 9.2 FROM-item vocabulary

The `FROM` clause is a left-deep chain of `RangeVar`s. The engine's model of
"what rows does this produce" is thinnest here, and sweep-4's own reading was
that **position, not age, is the discriminating variable** — five of its seven
findings were FROM items.

| node | spelling | proven by |
|---|---|---|
| `RangeSubselect` | a derived table | enumerated |
| `RangeFunction` | `f(…)` in FROM, and `ROWS FROM (…)` | enumerated |
| `RangeTableSample` | `TABLESAMPLE BERNOULLI (n)` | round-trip |
| `Alias` | column aliases on a FROM item | arrives with the above |
| — | `LATERAL` | round-trip |
| — | `CROSS JOIN`, comma join, qual-less join | §5.1's table |
| — | non-key join conditions | Step 0's residue |

### 9.3 Statement vocabulary — DML

`RETURNING` is the only observable (§5.3), and the write-rewrite hooks are only
reachable through it. The schema now carries all three rewriters.

| node | spelling | proven by |
|---|---|---|
| `InsertStmt`, `ReturningClause`, `ReturningOption` | `INSERT … RETURNING` | enumerated / round-trip |
| `UpdateStmt` | `UPDATE … RETURNING` | enumerated |
| `DeleteStmt` | `DELETE … RETURNING` | enumerated |
| `MergeStmt`, `MergeWhenClause`, `MergeSupportFunc` | `MERGE` and its arms | enumerated |
| `OnConflictClause`, `InferClause` | `ON CONFLICT … DO UPDATE` | round-trip |
| `MultiAssignRef` | `SET (a, b) = (SELECT …)` | round-trip |
| `SetToDefault` | `DEFAULT` in a VALUES row | round-trip |
| `TypeName` | arrives with casts and column definitions | — |

### 9.4 Clause vocabulary — BUILT 2026-08-08, and it convicted

`WITH`, set operations (UNION/INTERSECT/EXCEPT, ALL and distinct), `GROUP BY`
with `CUBE`/`ROLLUP`/`GROUPING SETS` and `GROUPING()`, `HAVING`, window
functions (default frames — an explicit one is un-deparsable, §9.5),
`DISTINCT`, `DISTINCT ON`, `ORDER BY`, `LIMIT`/`OFFSET`, `FOR UPDATE`, and
`SELECT *` / `t.*`. Applied as DECORATIONS over a built SELECT, since most are
independent of how the FROM clause was assembled and the few that are not are
mutually exclusive by SQL's own rules rather than by caution: GROUP BY replaces
the target list, DISTINCT ON demands an ORDER BY starting with the same
expressions, and FOR UPDATE is refused over grouping, DISTINCT, a set operation
or the nullable side of an outer join.

**FINDING (rank 2) — the engine ignores a FROM item's alias COLUMN LIST.**
`FROM refunds_archive AS r(c0, c1, c2)` renames the columns and the walk keeps
reading the catalog names. Measured, with a passing control:

| query | engine | PostgreSQL |
|---|---|---|
| `SELECT * FROM refunds_archive AS r(c0,c1,c2)` | `id, order_id, amount` | `c0, c1, c2` |
| `SELECT r.* …` | `id, order_id, amount` | `c0, c1, c2` |
| partial list `AS r(c0)` | `id, order_id, amount` | `c0, order_id, amount` |
| `… AS r` (control) | `id, order_id, amount` | identical |

It is worse than a name mismatch, and wrong in BOTH directions: `r.c0` resolves
to nothing and falls back to `nullable` where the column is NOT NULL, while
`r.id` — which PostgreSQL REJECTS, because the rename hides the catalog name —
is answered `notNull`.

`addRangeVar` never reads `rv.alias.colnames`. The machinery exists:
`addColumnListRelation` does exactly this for function items and join aliases,
and only the RangeVar path skips it.

**Decision taken: SUPPORT it, not refuse it.** Refusing would have been five
lines and sound — the engine's documented FROM-item policy is that contributing
the wrong columns is worse than refusing — but the construct is ordinary SQL and
the rename is information the walk already holds. The cost is that ten sites
read `entry.table.columns` and every catalog lookup behind them
(`entryColumnNotNull`, generation expressions, type OIDs, foreign keys, check
constraints) is keyed by COLUMN NAME, so each has to translate back.

**One thing this run says about the instrument itself:** those 108 reported
findings are ONE defect. The finding fingerprint keys on the query shape, and a
shape defect produces a different column list per shape, so it fragments —
exactly what §6 predicted ("expect the first version to be too specific rather
than too loose, because that is the direction that flatters"). Confirmed by
disabling only the alias-list form, which took `shape-mismatch` to zero.

### 9.4a Clause vocabulary — the original list

| node | spelling | proven by |
|---|---|---|
| `CommonTableExpr`, `WithClause` | `WITH`, and `WITH RECURSIVE` | enumerated |
| `GroupingSet`, `GroupingFunc` | `GROUPING SETS`, `CUBE`, `ROLLUP`, `GROUPING()` | round-trip |
| `SortBy`, `IndexElem` | `ORDER BY`, and `DISTINCT ON` | enumerated |
| `WindowDef` | a named or inline `OVER` window — DEFAULT frames only | round-trip |
| `LockingClause` | `FOR UPDATE` | unproven |
| `A_Star` | `SELECT *`, and `t.*` | enumerated |
| — | `UNION` / `INTERSECT` / `EXCEPT`, `LIMIT`/`OFFSET`, `VALUES` | round-trip |

### 9.5 Unreachable on the AST path — do not put these on the work list

Measured individually. Each is an upstream `pgsql-deparser` defect, and §5.4's
rule applies: one static fixture per class plus a `KNOWN_DEVIATIONS` entry, so
the gap is accounted rather than silent, and a fix upstream fails the suite
loudly.

| family | nodes | verdict |
|---|---|---|
| SQL/JSON constructors | `JsonObjectConstructor`, `JsonArrayConstructor`, `JsonAggConstructor`, `JsonObjectAgg`, `JsonArrayAgg`, `JsonArrayQueryConstructor`, `JsonIsPredicate`, `JsonKeyValue`, `JsonValueExpr`, `JsonOutput`, `JsonReturning`, `JsonFormat`, `JsonParseExpr`, `JsonScalarExpr`, `JsonSerializeExpr` | deparse throws |
| SQL/JSON query | `JsonFuncExpr`, `JsonArgument` | deparse throws |
| `JSON_TABLE` | `JsonTable`, `JsonTableColumn`, `JsonTablePathSpec` | deparse throws |
| `XMLTABLE` | `RangeTableFunc`, `RangeTableFuncCol` | **reparse fails** — a SIXTH upstream defect, found 2026-08-08 and distinct from the `JsonTable` one `xmltable-jsontable` is pinned for: that fixture carries both constructs and the deviation list records only the first |
| subscripting | `A_Indices` | reparse fails — the deparser emits a stray `[` |
| recursive-CTE `SEARCH`/`CYCLE` | `CTESearchClause`, `CTECycleClause` | silently dropped; the round trip differs |
| explicit window frames | (not a node — `WindowDef.frameOptions`) | reparse fails; bounds come back mangled |

### 9.6 Needs something other than a query

| node | why |
|---|---|
| `CurrentOfExpr` | `WHERE CURRENT OF cur` needs an open cursor. It deparses cleanly; the harness has no cursor to name |
| `ColumnDef`, `DefElem` | DDL vocabulary — they reach the walk only through a `CREATE TABLE AS` or a function's `RETURNS TABLE`, not through a query the generator writes |

## 8. Where things are

| | |
|---|---|
| the generator | `tests/unit/query/generated/generator.ts` — ~2600 lines, four entry points, axis tuple `{structure, projection, setop, wrapper}` |
| its oracle | `tests/unit/query/generated/generated-soundness.test.ts` |
| the schema axis | `tests/unit/query/generated/schema-variants.ts` (14 variants), driven by `schema-axis.test.ts` |
| the interrogation metric, which STAYS | `tests/unit/query/generated/capability-reach.test.ts` |
| the variety metric beside it | `tests/probe/catalog-reach.ts` — a diagnostic, gates nothing |
| the pattern to copy | `tests/unit/query/fixture-data/generate.ts`, `generators.ts`, `random.ts` |
| the deparser boundary | `KNOWN_DEVIATIONS` in `tests/unit/query/deparser-roundtrip.test.ts` |
| the schema | `tests/unit/query/fixtures/schema.sql` — 82 relations, the e-commerce half already realistic |
| the design that stands | `docs/query-generator.md` |
| why volume was not the lever | `docs/generated-surface.md` |
