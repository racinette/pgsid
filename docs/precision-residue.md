# The precision residue — handoff

## What this document is

Four items in the output-nullability engine that are covered by neither of the
two efforts already chartered. Items 1 and 2 are CLOSED; two are open. Each open one
is **sound as assessed**: the engine reports nullable where a value is provably
non-null, or refuses a shape rather than guessing it. They are collected here
because they are otherwise scattered across an `@unwitnessable` reason, an
`UNWITNESSABLE` rule in a generated suite, a residue paragraph in a closed
charter, and a numbered entry in the register — four places, none of which
reads as a work list.

Read `docs/nullability-walk.md` for how the engine works and
`docs/deferred-tasks.md` for everything else that is open.

**No consumer is blocked by either of the two, and shipping with both open
costs precision only.** Take them in the order below or not at all; what this
document exists to prevent is rediscovering each one from scratch. Item 1's
entry stays because of what closing it found: a precision question about what a
call MEANS turned out to sit one step from a soundness question about what it
DOES, so measure each neighbourhood before trusting its "sound" label.

## What this is NOT — the two efforts that own everything else

Do not start here if the thing you care about is in one of these.

**`docs/type-aware-overloads.md`** owns every defect whose cause is one NAME
covering several SIGNATURES: `path + path` (the only live unsoundness in
normal operation), `||` on arrays, `lower`/`upper` on text, `random()`, and
the two search-path costs that need `pg_catalog` signatures in the snapshot.
That charter has three unanswered questions at the top of its section list and
a prerequisite that gates all of it; answer those first if you are going there.

**`docs/consumer-design.md`** owns everything whose missing piece is project
configuration or a call site: the arity-and-order gate (register §1), the
foreign-key trust declarations (§1b), search-path half (b), and the
negative-dependency hole. None of them is an engine question.

## The four

### 1. A defaulted argument is not substituted into the body — CLOSED 2026-08-07

**What it was.** `gfn_def(a integer, b integer DEFAULT 7)` called with one
argument. The walk read the body back and bound only the arguments the CALL
supplies, so `b` was unbound and `a + b` read nullable where PostgreSQL
substitutes 7 and the result is total.

**What it is now.** The snapshot captures the default EXPRESSION per argument
(`FunctionArgInfo.defaultExpr`, from `pg_get_function_arg_default`), the
adapter pre-parses it, and the walk fills every position the call left empty
before any rule runs. The default is walked, not evaluated: `DEFAULT 7` and
`DEFAULT length('abc')` are non-null, `DEFAULT nullif(1, 1)` is not.
`docs/nullability-walk.md` section 4 has the rule;
`function-default-argument.sql` pins it.

**What pursuing it found, and this is the part worth carrying.** The premise
at the top of this document — that every item here is sound — did not hold for
this one's neighbourhood. A defaulted parameter can be declared `DEFAULT NULL`,
and asking what a call actually passes led straight to what STRICTNESS does
with it: a strict function handed a NULL argument returns without running, so
nothing its body proves and nothing its declaration promises describes that
call. Five shapes claimed `notNull` where PostgreSQL returned NULL, all of one
cause, all now fixed and pinned (`function-strict-*.sql`,
`aggregate-domain-empty-input.sql`). The register's closure entry has the list.

The lesson for the three items below: each is stated as a precision item, and
each was assessed as sound at the time it was recorded. Re-measure the
neighbourhood before assuming that still holds — a precision question about
what a call means is one step from a soundness question about what it does.

### 2. "This join never extends its left side" is not "every member of that side is present" — CLOSED 2026-08-07

**What it was.** `c.id` read nullable in the FULL-FULL chain of
`fk-entail-optional-referenced.sql`, where every `order_items` row has a
matching order and the left slice keeps every order, so the second join emits
no item-only row and `customers` is present throughout.

**What it is now.** The join-level fact exists, and it is carried without
teaching the fixpoint a second vocabulary: a join that cannot extend a side
leaves the joins INSIDE that side un-extendable from above, which is
`incomingRequired` — a property the walk already records — and the ordinary
key rule on the inner join then promotes `customers`. `orders` stays nullable,
as it must. The fact composes with itself, so a chain proves its own premise
one join at a time; `docs/nullability-walk.md`, "The join-level fact", has the
rule and the two subtree readings it rests on.

**What pursuing it found.** Two live unsoundnesses in the mechanism this item
was a residue OF. Reading a key as "this join always matches" needs the match
to be in the SLICE, not merely in the table, and nothing checked that a join
inside the referenced side had not dropped it — an ordinary status predicate
is enough (`fk-entail-referenced-not-preserved.sql`, and the proven-present arm
beside it). The condition that fixes them is the same one item 2's fact needs,
which is why the two arrived together.

**Cost of the closure, recorded.** A relation the walk cannot prove PRESERVED
loses the promotion even where it is preserved in fact — an INNER join is read
as dropping rows whatever its qual says. Deliberate: the alternative is
reasoning about which rows a qual keeps, which is the analysis the engine does
not do.

### 3. Foreign-key entailment does not compose through a JOIN inside a correlated subquery

**Shape.** From `docs/imprecision-closure.md`, which closed the rest of this
mechanism:

```sql
(SELECT c.email FROM customers c JOIN orders o ON o.customer_id = c.id
  WHERE o.id = s.order_id)
```

Each hop is individually a NOT NULL key the mechanism already reads. What is
missing is proving the INNER join matches for the row the outer key found.

**Why it is open.** It is a composition rather than a gap: the mechanism
reads a single hop, and this shape needs two. Two claims carry it as their
reason, in `extreme-activity-feed-union` (#7) and
`extreme-dml-insert-shipping-pipeline` (#9).

**What closing it takes.** Chaining the existing subquery-form entailment
through the subquery's own FROM. Thirteen gate fixtures pin the hazards from
the side that would produce a wrong `notNull` (`fk-entail-not-valid`,
`-deferrable`, `-inheritance` and its `ONLY` control, `-extra-conjunct`,
`-optional-referencer`, `-optional-referenced`, the two
`-referenced-not-preserved` and the four `-subquery-*`); any composition rule
has to keep every one of them passing, and they are the specification. The
subquery's FROM raises the same question the join form answered in the
`-referenced-not-preserved` pair — the key proves a row exists in the TABLE,
and an INNER join inside the subquery can have dropped it before the
correlation is evaluated.

**Cost of leaving it.** Two claims today.

### 4. The `unnest` refusal class

**Shape.** Statements PostgreSQL accepts that the walk REFUSES rather than
answering with a wrong shape, pinned in `unsupported-nodes.test.ts` with a
positive control beside them so the refusal cannot quietly widen:

```sql
SELECT * FROM unnest((SELECT array_agg(p) FROM cc))                  -- aggregate
SELECT * FROM unnest(array_remove((SELECT array_agg(p) FROM cc), NULL))  -- polymorphic builtin
SELECT * FROM (SELECT ARRAY[p] AS ps FROM cc) s, unnest(s.ps)        -- derived-table column
```

**Why it is open.** Each needs the TYPE of an expression the walk does not
compute, which is the boundary the engine has held everywhere else. The
refusal is the designed behaviour: a column list has no conservative value, so
refusing beats guessing.

**What closing it takes — and check the other charter first.** The
POLYMORPHIC-builtin arm may fall out of `docs/type-aware-overloads.md` for
free: with per-signature return types, `array_remove` of a `sku_pair[]` is
answerable. Re-measure that arm after the refactor lands before treating it as
work. The aggregate, the sublink and the derived-table column are genuinely
this document's, and they need expression typing the walk deliberately does
not do — which is exactly the boundary to think hard about before crossing.

**Cost of leaving it.** A refusal the consumer must handle, on shapes that are
rare. The consumer's escape is `PREPARE` plus all-nullable, which it holds
anyway.

## Boundaries — do not re-derive these

- **Neither open item is unsound as assessed.** If you find
  yourself trading soundness for precision on one of them, stop: the register's
  standing rule is that a dropped claim is never a wrong one. What items 1 and 2
  showed is that the assessment is a measurement, not a property — each turned
  up wrong claims in its own neighbourhood. Probe first, and if one is there,
  that becomes the work.
- **The refusal in item 4 is deliberate**, and its positive controls exist so
  that a fix cannot silently widen it into a blanket refusal. Keep them.
- **The foreign-key gates are load-bearing and mutation-tested**: a referenced
  side extended by a DEEPER join, or one whose rows an inner join has dropped,
  may not be promoted. `fk-entail-*.sql` pins each from the side that would
  produce a wrong `notNull`, and item 3 has to keep every one of them passing.
- **A guarantee read off a FUNCTION describes a call that RUNS.** Item 1's
  fix rests on it: strictness, an empty aggregate input and a zero-row body are
  three ways a call produces no value for the declaration to constrain. Any new
  rule that reads something off `FunctionInfo` owes the same question.

## What "done" looks like

The project's standing loop, unchanged: counterexample → pinned fixture →
engine fix, with the fixture landing BEFORE the fix and failing without it.
Specifically for this document:

- Every claim recovered must be WITNESSED or its unwitnessability recorded —
  `docs/witness-coverage.md` is the standard, and the suite enforces it.
- Every fix needs a mutation check: revert it and confirm the new fixture
  fails, and that it fails ALONE. Items 2 and 3 both touch the foreign-key
  fixpoint, where a broad change quietly excuses claims that should be
  witnessed.
- Run the generated corpus before landing anything that moves claims toward
  notNull. It is 11632 queries and it has caught this class before.
- Update the `@unwitnessable` reason or `UNWITNESSABLE` rule that currently
  records the item — a stale reason is worse than none, and the reason audit
  of 2026-08-05 found ten of them wrong.

## Where things are

| | |
|---|---|
| Item 1's fixtures (closed) | `function-default-argument.sql`, `function-strict-*.sql`, `aggregate-domain-empty-input.sql` |
| Item 2's fixtures (closed) | `fk-entail-optional-referenced.sql`, `fk-entail-join-level-*.sql`, `fk-entail-referenced-not-preserved*.sql` |
| Item 3's record | `docs/imprecision-closure.md`, "The residue is one shape" |
| Item 3's gate fixtures | `tests/unit/query/fixtures/fk-entail-*.sql` |
| Item 4's pins | `tests/unit/query/unsupported-nodes.test.ts`, "unnest's element type" |
| The engine | `src/query/nullability-walk.ts`, `src/query/catalog-adapter.ts` |
| The snapshot | `src/catalog/snapshot.ts`, `src/catalog/types.ts` |
| Everything else that is open | `docs/deferred-tasks.md` |
| Workspace rules (PGlite memory, build, layout) | `AGENTS.md` at the workspace root — not auto-loaded; read it before adding any long-lived PGlite instance |

Run from `pgsid/` with `npx vitest run`; installs use `pnpm`.
