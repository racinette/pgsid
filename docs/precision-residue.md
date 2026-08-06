# The precision residue — handoff

## What this document is

Four items in the output-nullability engine that are covered by neither of the
two efforts already chartered. Item 1 is CLOSED; three are open. Each open one
is **sound as assessed**: the engine reports nullable where a value is provably
non-null, or refuses a shape rather than guessing it. They are collected here
because they are otherwise scattered across an `@unwitnessable` reason, an
`UNWITNESSABLE` rule in a generated suite, a residue paragraph in a closed
charter, and a numbered entry in the register — four places, none of which
reads as a work list.

Read `docs/nullability-walk.md` for how the engine works and
`docs/deferred-tasks.md` for everything else that is open.

**No consumer is blocked by any of the three, and shipping with all three open
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

### 2. "This join never extends its left side" is not "every member of that side is present"

**Shape.** Measured, in `fk-entail-optional-referenced.sql`:

```sql
SELECT c.id
FROM customers c
FULL JOIN orders o       ON o.customer_id = c.id
FULL JOIN order_items oi ON oi.order_id   = o.id
```

`c.id` is never NULL: every `order_items` row has a matching order, the left
slice keeps every order, so the second FULL JOIN produces no order-items-only
row and never extends its left side at all — which makes `customers` present
throughout. The engine reads it nullable.

**Why it is open.** The evidence concludes about a JOIN and the presence
fixpoint concludes about ALIASES, so there is nowhere to put the fact. The
claim is recoverable only by giving the fixpoint that second vocabulary.

**What closing it takes.** A JOIN-LEVEL fact the walk does not currently
carry: "this join cannot extend its left side", distinct from the
member-level `present` set the fixpoint maintains. The evidence is available —
every referencing row has a match, and the left slice retains every referenced
row — but it concludes about the JOIN, and the fixpoint's vocabulary is about
ALIASES. Note that `o` genuinely can be absent, from the FIRST join's
extension, so the fact cannot simply be pushed down to the members.

**Cost of leaving it.** Deep FULL-JOIN chains over foreign keys. Narrow.

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
through the subquery's own FROM. Eleven gate fixtures already pin the hazards
from the side that would produce a wrong `notNull` (`fk-entail-not-valid`,
`-deferrable`, `-inheritance` and its `ONLY` control, `-extra-conjunct`,
`-optional-referencer`, `-optional-referenced`, and the four `-subquery-*`);
any composition rule has to keep every one of them passing, and they are the
specification.

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

- **None of the three open items is unsound as assessed.** If you find
  yourself trading soundness for precision on one of them, stop: the register's
  standing rule is that a dropped claim is never a wrong one. What item 1
  showed is that the assessment is a measurement, not a property — probe the
  neighbourhood first, and if a wrong claim is in it, that becomes the work.
- **The refusal in item 4 is deliberate**, and its positive controls exist so
  that a fix cannot silently widen it into a blanket refusal. Keep them.
- **The foreign-key gate that `fk-entail-optional-referenced.sql` pins is
  load-bearing and mutation-tested**: it is what stops a referenced side
  extended by a DEEPER join from being promoted. Item 2's claim must be
  recovered by adding the join-level fact, never by relaxing that gate.
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
| Item 2's record | `tests/unit/query/fixtures/fk-entail-optional-referenced.sql` (`@unwitnessable 0`) |
| Item 3's record | `docs/imprecision-closure.md`, "The residue is one shape" |
| Item 3's gate fixtures | `tests/unit/query/fixtures/fk-entail-*.sql` |
| Item 4's pins | `tests/unit/query/unsupported-nodes.test.ts`, "unnest's element type" |
| The engine | `src/query/nullability-walk.ts`, `src/query/catalog-adapter.ts` |
| The snapshot | `src/catalog/snapshot.ts`, `src/catalog/types.ts` |
| Everything else that is open | `docs/deferred-tasks.md` |
| Workspace rules (PGlite memory, build, layout) | `AGENTS.md` at the workspace root — not auto-loaded; read it before adding any long-lived PGlite instance |

Run from `pgsid/` with `npx vitest run`; installs use `pnpm`.
