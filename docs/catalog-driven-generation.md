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

`q`, `gm` and `ins` are derived-table aliases, so the corpus queries **five**
relations of the **82** the fixture schema declares. `t`, `u` and `v` carry no
keys, no constraints, no triggers, no domains. 94% of the schema is never
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

### `capability-reach` reads 34 of 34 over this, and must be replaced

It counts *accessors the walk ASKS*, so `resolveForeignKeyTree` is "reached"
when it is asked over `t` and answered `null`. It measures interrogation, not
variety — which is why the register already recorded, as a curiosity, that the
schema axis moves it by exactly zero.

The replacement is level 2 of the query fingerprint (§6): count the CATALOG
PROFILES the corpus actually queries — which declared features appeared on the
columns and relations a query touched. Over `t`/`u`/`v` that number is 1.

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

**A live alternative worth evaluating before the vocabulary grows: generate
TEXT instead of an AST.** Emit the text, parse it once, hand that AST to the
engine and that same text to PostgreSQL. No round trip, nothing to survive,
four outcome buckets gone, and the ceiling with them. The cost is rendering
valid SQL — but only *what the generator emits*, not the language: parenthesise
defensively, quote identifiers always, and a general deparser's hard parts
never arise.

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

## 7. Step 0

Produce the work list by measurement rather than judgement:

**Which of the 82 relations carry a catalog feature no generated query can
reach?** The converse of capability reach — a query, not a sweep — and it turns
"point it at the schema" into a ranked list. Run it before choosing which
relations the join-spine walker admits first.

Expect foreign keys, partitions and domains to dominate, because that is where
the last two sweeps' findings were. But the point is to measure, not to expect.

---

## 8. Where things are

| | |
|---|---|
| the generator | `tests/unit/query/generated/generator.ts` — ~2600 lines, four entry points, axis tuple `{structure, projection, setop, wrapper}` |
| its oracle | `tests/unit/query/generated/generated-soundness.test.ts` |
| the schema axis | `tests/unit/query/generated/schema-variants.ts` (14 variants), driven by `schema-axis.test.ts` |
| the metric to replace | `tests/unit/query/generated/capability-reach.test.ts` |
| the pattern to copy | `tests/unit/query/fixture-data/generate.ts`, `generators.ts`, `random.ts` |
| the deparser boundary | `KNOWN_DEVIATIONS` in `tests/unit/query/deparser-roundtrip.test.ts` |
| the schema | `tests/unit/query/fixtures/schema.sql` — 82 relations, the e-commerce half already realistic |
| the design that stands | `docs/query-generator.md` |
| why volume was not the lever | `docs/generated-surface.md` |
