# Catalog-driven query generation — handoff

## What this document is

A self-contained brief for the next generation of the generated suite. Read
`docs/query-generator.md` first: it is the design of the generator that exists,
and this document does not replace it — it changes what that generator ranges
over and adds a second mode beside it.

The one-line thesis: **the engine is a function of (AST, CATALOG), and the
generated corpus explores one argument.** Everything below follows from that.

## The measurement that forces this

Not an opinion. Measured 2026-08-07, after the fourth adversarial fix phase.

**The corpus references eight relation names across all 14,964 queries:**

```
 14956  t        9904  v       1004  gm        4  ins
 13446  u        4934  q        329  ck        3  tags
```

`q`, `gm` and `ins` are derived-table aliases. So the corpus queries **five**
relations in earnest, out of the **82** the fixture schema declares. `t`, `u`
and `v` carry no keys, no constraints, no triggers, no domains — they are
placeholders, and 94% of the schema is never queried by a generated statement
at all.

**Every finding of the fourth sweep was unexpressible in it.** Nine for nine,
including the regression the fix phase itself introduced:

| finding | why the corpus cannot state it |
|---|---|
| ROWS FROM padding; ROWS FROM naming | the generator emits no `ROWS FROM` |
| qual-less joins | `JOIN_KINDS` is INNER/LEFT/RIGHT/FULL — no CROSS, no qual-less join — **and** no FK to entail |
| TABLESAMPLE | not emitted |
| FK partition clones (+ the fix's own regression) | no partitioned table, no foreign key |
| JSON_TABLE nested ordinality | not emitted |
| user-function body rejection | no such function class in reach |
| builtin NULL-rejecting arguments | no `array_fill` |

This is not new: `docs/generated-surface.md` recorded the same shape after the
THIRD fix phase — 8,980 queries reporting zero disagreements both before and
after eight closed findings, "because it could not EXPRESS a single falsifying
input". The corpus was widened structurally in response. The measurement above
says the axis that needed widening was the other one.

**Read the corpus's green correctly.** "14,964 queries, 0 violations" means *no
regression in the structural space already covered*. It has never once been the
thing that found a defect. That is a legitimate and valuable role — a
regression net — but it is not the assurance the number looks like, and the
report should say so in its own output.

### The metric that reads green over a corpus this thin

`capability-reach.test.ts` reports **34 of 34** catalog capabilities. That is
true and it measures the wrong thing: it counts *accessors the walk ASKS*, and
`resolveForeignKeyTree` counts as reached when it is asked over `t` and
answered `null`. It measures interrogation, not variety.

The register already caught one consequence and recorded it: the schema axis
moves capability reach by exactly ZERO across its variants, because reach is a
property of query SHAPES alone. That was filed as a curiosity. It was a
warning.

**A replacement is part of this work**: a capability is reached when a
generated query produces a CLAIM that depends on it — an entailed promotion, a
cleared flag, a refusal — not when an accessor returns null. That metric would
not have read 34/34.

## The direction

**Retire `t`/`u`/`v` from the generator and point it at the application schema
that already exists**, then generate over the catalog the way
`tests/unit/query/fixture-data/` already generates DATA over it.

The realistic schema is not work to be done. It is already there, built for the
hand-written half: `customers`, `orders`, `order_items`, `products`, `reviews`,
`addresses`, `shipments`, `payment_methods`, `coupons`, `categories`, `tags`,
`product_tags`, `subscription`, with meaningful foreign keys, NOT NULL columns,
CHECK constraints, domains, generated columns, partitions and triggers. **164
fixtures already query it**; 87 query `t`/`u`/`v`. The generator was simply
never pointed at it.

So the scope is: change what the generator ranges over, not what the schema
contains.

### `t`/`u`/`v` are FROZEN — decided 2026-08-08

Not migrated, not extended, not used again.

- **The 87 fixtures that reference them KEEP them.** They are pinned, passing,
  and each asserts something specific; rewriting them onto a realistic schema
  would change 87 claims in one diff, and a claim that moved during a mechanical
  migration is indistinguishable from one that moved because the migration was
  wrong. The risk buys nothing.
- **Nothing new uses them — generator, fixture, or variant.** They are a closed
  legacy set from here on. Their whole failure mode was becoming the default
  vehicle for anything that needed a table; the fix is to stop, not to
  relitigate the past.

So the placeholders stop growing and stop dictating, without anybody spending a
week moving assertions between schemas.

### The tool, as agreed

The discovery instrument, spec settled 2026-08-08:

1. Generates **syntactically correct** queries.
2. **Tends toward** semantically correct ones — "tends" is deliberate; a
   rejection is a defect to classify, not a reason to constrain the generator
   into safety.
3. Uses **as many discovered SQL constructs as possible** — the language
   surface is the target, and every construct the engine claims about should be
   reachable.
4. **All DML, not just SELECT** — INSERT, UPDATE, DELETE, MERGE. RETURNING is
   where DML nullability claims live, so this is high-value rather than
   optional. Modifying statements roll back (`BEGIN`/`ROLLBACK`, the pattern
   the DML corpus already uses), because the dataset is generated ONCE per
   session and every query must see the same one.
5. **Operators triage the rejected queries** and fix the generator, rather than
   the generator quietly avoiding whatever it gets wrong.
6. **Execution is compared against the engine's claims**; a disagreement is a
   fixture and a fix.

### What the tool DOES owe: the input contract

"Owes no coverage claim" is about ACCOUNTING and must not be read as
permission to be careless with inputs. A query returning nothing burns a run
and produces no signal — bad data does not make the finder wrong, it makes it
WEAK, and inputs are the cheapest control plane there is.

- **Valid data, always.** Foreign keys resolve, domains hold, CHECKs are
  satisfied, keys are unique. Already built and transfers untouched:
  `fixture-data/generate.ts` does exactly this for an arbitrary catalog.
- **A BIG dataset**, generated, so that a genuinely random query returns two or
  three rows rather than none.
- **Volume alone does not buy OVERLAP**, and this is the sharp edge: `WHERE
  p.name = 'zeta-17'` returns nothing against a million rows if the literal was
  invented by a type generator. **Predicate literals must be DRAWN FROM the
  seeded values**, which is `drawFrom`/`ctx.values(table, column)` — the
  mechanism that already makes foreign keys resolve — applied one layer up.
  Range predicates are satisfiable with volume; equality is not.
- **The data must contain what nullability is ABOUT**: real NULLs in nullable
  columns at meaningful rates, and danglable rows wherever a key permits one
  (a nullable FK, a NOT VALID key, a parent with optional children). A dataset
  where every reference resolves turns every outer join into an inner join and
  witnesses nothing.
- **A realistic schema**, which mostly exists already — see above.

Two more the tool owes, added for reasons that only bite later:

- **Reproducibility.** It gates nothing, but a finding must replay from
  `seed + query id` alone. Cheap to build in, impossible to retrofit.
- **The rejection rate is a WORKLIST, not a filter.** Report it, classify the
  causes, close them. The enumerated corpus holds "rejected by PostgreSQL: 0"
  as a hard invariant; a randomiser will start above zero, and each class is a
  generator bug. What is forbidden is silently skipping one.

### The precedent to copy, deliberately

`tests/unit/query/fixture-data/generate.ts` already solves the structurally
identical problem one layer down — "produce type-correct, constraint-satisfying
VALUES for an arbitrary catalog" — and its design decisions transfer almost
verbatim:

- **Tier resolution, most specific first.** Column-specific → foreign key →
  surrogate key → type tier. The query generator wants the same shape:
  column-specific → foreign-key edge → type tier.
- **No match is an ERROR, not a default.** A column whose type nothing knows
  how to fill must force a decision rather than silently producing something a
  CHECK rejects. For queries this is the load-bearing rule: a type the
  generator cannot build a predicate for must FAIL, because the alternative is
  a corpus that silently narrows to the types someone happened to handle —
  which is exactly how `t`/`u`/`v` came to dictate the space.
- **A seeded `Rand`** (`fixture-data/random.ts`), so a failing case is
  reproducible from its id.
- **Foreign keys as first-class structure.** `drawFrom(table, column)` already
  encodes "this value must reference that one". The query generator needs the
  same edge for a different purpose: `ON child.fk = parent.pk` is a JOIN the
  schema itself licenses, and it is the join shape real applications write.

### What the generator becomes

A function of `(CatalogSnapshot, axes, seed)` rather than a closure over three
hard-coded tables. Concretely, four things stop being literals:

1. **The join spine.** Today `t → u → v` with hand-written `ON u.t_id = t.id`.
   Instead: walk the snapshot's foreign keys as a graph, pick a path of length
   1–4, and emit the joins that path licenses. Every such join is type-correct
   by construction and every one is a shape an application actually writes.
   This is what makes entailment, partition and domain claims reachable.
2. **Projections.** Today a fixed list. Instead: draw columns from the
   relations in scope, by type tier, with the NOT NULL / domain / generated
   ones deliberately over-weighted because those are where claims live.
3. **Predicates and parameter values.** Today a small fixed vocabulary.
   Instead: a type tier producing a legal literal or bind value per column
   type — the direct analogue of the data generator's type tier, and the answer
   to "what values can be used as arguments".
4. **The FROM item.** Today a RangeVar or a subquery. This is where five of the
   fourth sweep's seven findings lived, and the corpus emits neither `ROWS
   FROM`, `JSON_TABLE`, `TABLESAMPLE` nor a qual-less join. A FROM-item axis is
   cheap next to the rest and should not wait.

### Two instruments, and they have OPPOSITE requirements

The single most important decision in this document, and getting it wrong is
what made every earlier draft complicated.

|  | COVERAGE instrument | DISCOVERY instrument |
|---|---|---|
| space | bounded, enumerated | unbounded, randomised |
| every claim adjudicated? | yes — that is what coverage MEANS | no — and it must not try |
| deterministic | required | not required |
| speed | must gate CI | must never gate anything |
| success | green | findings per run |
| output | a number you can trust | candidate FIXTURES |
| today | the enumerated corpus + 411 fixtures | the four adversarial sweeps, by hand |

**A finding is SELF-ADJUDICATING; coverage is not.** The engine claims
`notNull` and PostgreSQL returned a NULL — that is a fact, requiring no rule,
no reason and no reviewer. So is an ordered-name disagreement, a traced/untraced
parity break, an engine crash, a PostgreSQL rejection, a presence-group row the
contract forbids. **The only ambiguous signal in the entire apparatus is the
unwitnessed nullable claim** — and that is a coverage metric, not a defect.

Therefore: **the randomiser consumes only self-adjudicating signals, and makes
no coverage claim at all.** It is a sweep that runs itself. Its output is a
falsifying statement, shrunk, promoted to a permanent fixture — which is
precisely the loop all four adversarial sweeps ran by hand, with the human
removed from the SEARCH and kept in the PROMOTION.

What this buys, and it is most of the difficulty in this document disappearing:

- **Emptiness stops being a problem.** A query that returns no rows contributes
  no rank-1 signal, and that is the whole of it — no tag, no excuse, no
  classification, no reason for anyone to write. It still contributes shape,
  parity and rejection signal, which need no rows.
- **No UNWITNESSABLE rules are owed by the randomised half**, so the 12%
  mislabelling rate the reason audit measured has no surface to attach to.
- **It may be slow, non-deterministic and unbounded**, because it gates
  nothing. Run it nightly, or for an hour on demand.
- **The coverage claim stays where it can be honest**: the enumerated corpus
  and the fixtures, both bounded and both reviewable.

The consequence for the corpus that exists: it keeps its current discipline
unchanged — the axes, the bound printed with the result, the UNWITNESSABLE
rules with their bidirectional staleness check. Nothing about it gets looser.
It simply stops being asked to do a job it was never shaped for.

## Emptiness — a question for the COVERAGE instrument only

With the split above, this stops being the question the design lives or dies
on. It applies to the enumerated corpus, whose job is a number that can be
trusted; the randomiser is out of scope for all of it, because it claims no
coverage and therefore owes no excuses.

Two answers remain forbidden for the enumerated half, and they are the two
easy ones:

- **Excusing the claim** — filing it unwitnessable and moving on. That is the
  corpus going green by vacuity, at scale, with a ratchet to hide behind. It is
  the failure this whole refactor exists to remove.
- **Constraining the generator** to emit only queries the current data
  satisfies. That shrinks the query space to fit our expectations, which is
  precisely how three placeholder tables came to dictate 14,964 queries.

### Reframe 1 — the unit is the CLAIM, not the query

A query can return rows and still leave one column's claim unwitnessed: the
outer join produced no absent arm, so the `nullable` on column 3 was never
seen. Disposing of whole queries is too coarse and would throw away the
witnessed claims sitting beside the unwitnessed one.

And a zero-row query is NOT a query that asserts nothing. `res.fields` comes
back from an empty result, so the ORDERED NAME comparison — rank 2, the defect
class that misassigns every later flag, four instances across four sweeps —
runs at full strength. So do the traced/untraced parity check, the deparser
round-trip, and the refusal behaviour. Zero rows costs exactly one thing: the
`notNull` falsification oracle. Say that in the report rather than treating an
empty result as a failure.

### Reframe 2 — it is not the query that is wrong, it is the (query, DATA) pair

Which is the whole opening: do not repair it by deleting queries or excusing
claims. Repair it by making the DATA a function of the query.

### The three-way disposition, per claim

1. **Witnessed** by the shared data states. The common case; unchanged.
2. **REACHABLE BY DECLARATION** — no witness under the current schema, but a
   schema that DECLARES the right thing produces one, with no change to the
   query and no per-query reasoning. This is where the bulk of the residue must
   land, and the mechanism is below.
3. **UNINHABITABLE BY CONSTRUCTION** — no data can witness it, and the
   generator can say why FROM ITS OWN DERIVATION: it emitted `WHERE false`, it
   intersected disjoint literal sets, the absent arm of this join shape cannot
   exist, the column is a builtin SRF's uniformly-conservative one.

**The rule that keeps (3) honest, and it is the load-bearing sentence of this
section: bucket 3 is admitted BY CONSTRUCTION, never by OBSERVATION.** "We ran
it and saw no NULL" is the trigger for bucket 2, not evidence for bucket 3. A
claim may only be called uninhabitable if the generator can name the structural
reason it built in. Anything else is an unproven excuse wearing a category
name.

### Repair is a SCHEMA question, not a query question

The first draft of this section proposed a per-claim WITNESS PLAN — the
generator emitting, beside each query, the rows that would witness its claims.
That was wrong and it is recorded here so nobody rebuilds it.

**The objection that kills it.** To predict a witness you must know what kind
of query you are looking at. That forces a taxonomy of query shapes, and a
taxonomy makes the corpus an expander of fixture templates — variations on
queries someone already enumerated, which is what the static fixtures are for
and where they are better. The generated corpus exists to reach the shapes
nobody enumerated; a mechanism that requires enumerating them defeats it.

It is also unreliable on its own terms. Witness requirements do not compose
through filters: a LEFT JOIN's absent-arm rule asks for a left row with no
match, and `WHERE o.status = 'x'` then discards exactly that row, because its
`o.status` is NULL. The corpus already knows this failure mode by name — the
refilter live-traps. So the plan would have been a taxonomy AND a guess.

**What actually works, with a first-run rank-1 to prove it.** The schema axis
(`schema-axis.test.ts`) found a rank-1 unsoundness on its first run and needed
NO witness engineering, no query analysis and no generator change at all. Its
design note says why: "its schema contract is a set of NAMES, so a variant that
keeps `t`/`u`/`v` and changes only the CATALOG FEATURES behind them runs the
whole structural corpus unchanged."

That is the mechanism. **Vary what the schema DECLARES; the queries and the
data generator both follow for free.** The data generator already seeds
whatever a catalog contains — that is why the schema axis needed nothing — so
enriching the schema enriches the witnesses automatically, with no per-query
reasoning anywhere.

Witnessing then becomes a question about DDL, answerable once per shape and
independent of every query:

| to witness | declare |
|---|---|
| an outer join's absent arm | a NULLABLE foreign-key column, or a parent whose children are optional |
| a key entailment | a NOT NULL foreign-key column |
| an entailment the slice destroys | a relation that some state leaves EMPTY |
| a domain claim, a generated column, a trigger rewrite | the domain, the column, the trigger |

Two of those are in tension and both are wanted, which is a schema-design
answer rather than a query-analysis one: a NOT NULL key entails and never
dangles, a nullable key dangles and never entails. Declare BOTH — they are two
columns, or two variants — and stop reasoning about queries entirely.

**What remains, and what it is not.** Some claims will still go unwitnessed,
and the answer is NOT to chase 100%. Report them per named cause with the
ratchet on a NEW cause appearing, per the reporting rule below. An unwitnessed
claim over a rich catalog is information about coverage; the thing this
document exists to prevent is an unwitnessed claim nobody counted.

### The trap this hits on day one: an FK join always matches

The current corpus gets absent arms from one hand-written trick — 25% of
`u.t_id` dangles, and the comment states the reason: "`u` declares NO foreign
key … with every reference resolving, an outer join is an INNER join and its
NULL-extended columns are never observed."

Follow a REAL key and that trick is illegal: PostgreSQL enforces the reference,
so no row can dangle. An FK-driven join spine therefore produces outer joins
whose absent arm is uninhabitable — the corpus would emit LEFT, RIGHT and FULL
joins by the thousand and witness the NULL-extension of none of them. This is
not a hypothetical; it is the direct consequence of the change this document
proposes, and it must be designed for before the first query is generated.

Which direction of an edge is inhabitable is a property of the SCHEMA:

| shape | absent arm inhabitable? |
|---|---|
| parent → child (`customers LEFT JOIN orders`) | ALWAYS — a parent with no children needs no violation |
| child → parent (`orders LEFT JOIN customers`) | only if the FK column is NULLABLE — this schema has exactly THREE (`categories.parent_id`, `products.category_id`, `customers.default_address_id`) |
| child → parent over a `NOT VALID` key | yes — pre-existing rows are unchecked, which is what that key means; the schema carries one |
| either, under a filtered/sampled/cross-joined side | yes — this is what sweep-4 findings 2 and 3 were about |

So the join-spine walker must carry a per-edge inhabitability verdict and bias
toward the parent→child direction, or the outer-join half of the corpus is
decorative.

**One hazard to name explicitly: common-mode error.** The engine's foreign-key
entailment reasons about exactly this question — when can an outer join over a
key null-extend. If the generator decides inhabitability by the same reasoning,
generator and engine can be wrong TOGETHER and the corpus will confirm the bug.
The mitigation is that a repair is **verified by execution, never asserted**: a
synthesised witness counts only when PostgreSQL actually returns the row. The
generator proposes; PostgreSQL disposes. That keeps the answer key independent
even where the two share a subject.

### Reporting: per cause, never aggregate

The residue is reported as a table of NAMED CAUSES with counts, not a total.
This register's own rule, from the verification philosophy: no aggregate
ratchets, because a regression hides behind an unrelated improvement. A NEW
cause fails the run — it is an unclassified claim, which is the thing held at
zero. A cause whose count moves is visible in the diff.

The precedent to copy exactly is the deep-join axis, which already does this:
44 structures whose `a_ue` is unwitnessable because every u-null-extended row
dies at a strict edge qual — "verified 44/44 against a hand-checked
join-semantics model". Verified against an independent MODEL, not against the
run that produced them. That is the bar for bucket 3.

## Step 0, before any code

Produce the work list by MEASUREMENT rather than judgement, in the shape this
project already trusts:

**Which of the 82 relations carry a catalog feature no generated query can
reach?** That is the converse of capability reach, it is a query rather than a
sweep, and it turns "point it at the schema" into a ranked list. Run it before
choosing which relations the join-spine walker admits first.

Expect the answer to be dominated by foreign keys, partitions and domains,
because that is where the last two sweeps' findings were — but the point is not
to expect, it is to measure.

## Open questions

Genuinely open; they change the design and are not to be answered from the
armchair.

1. **How does a randomised corpus SHRINK a failure?** Property-based testing's
   standard answer is a shrinker, and this corpus has none. Without one, a
   falsifying random query is a 40-line statement nobody can read. With one,
   the shrink IS the fixture. This may be the highest-value single piece of the
   whole refactor.
2. **What replaces exhaustiveness as the coverage claim?** "34 of 34" must not
   be succeeded by another number that reads green over a thin corpus. The
   claim-based capability metric above is a candidate; it needs a definition
   that cannot be satisfied by an accessor returning null.
3. **What is the shared-state / targeted-seed split?** The funnel above says
   shared states first and targeted seeding on the residue, but not where the
   line sits. If shared states witness 95% the funnel is cheap; if they witness
   40% it is the dominant cost. MEASURE it on the first spine before designing
   around either answer.

## Where things are

| | |
|---|---|
| the generator | `tests/unit/query/generated/generator.ts` (~2600 lines, four entry points, axis tuple `{structure, projection, setop, wrapper}`) |
| its oracle | `tests/unit/query/generated/generated-soundness.test.ts` |
| the schema axis | `tests/unit/query/generated/schema-variants.ts` (14 variants), driven by `schema-axis.test.ts` |
| the metric to replace | `tests/unit/query/generated/capability-reach.test.ts` |
| the pattern to copy | `tests/unit/query/fixture-data/generate.ts`, `generators.ts`, `random.ts` |
| the schema | `tests/unit/query/fixtures/schema.sql` — 82 relations, the e-commerce half already realistic |
| the design that stands | `docs/query-generator.md` |
| why volume was not the lever | `docs/generated-surface.md` |
