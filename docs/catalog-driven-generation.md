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

### Enumerated and randomised, both

The existing axes are exhaustive over a defined space, and the suite prints its
bound. That is worth keeping where it is affordable — the structural space is
the part the corpus genuinely covers, and it should not be traded away.

What the product space forces is a second mode: **randomised exploration under
a seed**, which `docs/query-generator.md` already names as the widening to take
once the enumerated axes stop finding defects. They have. The goal is stated
plainly: reach the queries nobody thought to write.

The two modes answer different questions and both belong:

- **enumerated** — "no regression in the space we defined", printed with its
  bound;
- **randomised** — "expansion", with a seed corpus per run and any falsifying
  case promoted to a permanent fixture, which is the loop every sweep has used
  by hand.

## What must not be lost

Six properties the current suite has that a rewrite can quietly drop. Each is
load-bearing and each has been paid for once already.

1. **PostgreSQL is the answer key.** No generated query carries a hand-written
   expectation. A query PostgreSQL REJECTS is a generator defect, not a skip —
   the current corpus holds "rejected by PostgreSQL: 0" and that must stay a
   hard zero, or type-incorrect generation hides behind a filter.
2. **Every query must RETURN ROWS somewhere.** "returned rows somewhere:
   14964" is the assertion that stops the corpus asserting nothing. This gets
   HARDER with a realistic schema and randomised predicates, because selective
   predicates over seeded data return nothing — and a zero-row query falsifies
   no claim. Budget design effort here; it is the single biggest way this
   refactor could go green by vacuity, which is the failure mode the whole
   effort exists to remove.
3. **Expected-node checks.** `expectations` assert the construct an axis
   requested survived deparsing. A deparser that drops a clause and still emits
   parseable SQL turns a requested construct into silent false confidence
   (measured: the recursive-CTE SEARCH/CYCLE drop). Randomised generation needs
   these more, not less.
4. **No silent caps.** Any sampling bound must be REPORTED, the way implicant
   widths and the deep-join axis bound are. A corpus that truncates quietly
   reads as "covered everything".
5. **Reproducibility.** A failing random query must be reconstructible from its
   id and seed alone, with no wall-clock or unseeded randomness anywhere.
6. **PGlite memory.** `docs/query-generator.md`'s constraint section, and rule
   6 of the workspace `AGENTS.md`: replaying hundreds of single-row statements
   against a long-lived instance exhausts WASM linear memory. Batch.

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
3. **Do `t`/`u`/`v` survive at all?** 87 fixtures use them, and they are the
   right vehicle for a fixture that wants NO constraints in the way. Retiring
   them from the GENERATOR does not require deleting them; migrating the 87 is
   a separate, optional cleanup that should not gate this work.
4. **How is seed data kept in step with a wider corpus?** The generated data
   state seeds every table in the catalog, which is why this is not already
   blocking — but selective predicates over realistic data is question 2 of the
   "must not be lost" list, and the two are the same problem seen from both
   ends.

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
