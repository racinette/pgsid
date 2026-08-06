# The precision residue — handoff

## What this document is

Four open items in the output-nullability engine that are covered by neither
of the two efforts already chartered. Each is **sound**: the engine reports
nullable where a value is provably non-null, or refuses a shape rather than
guessing it. None is a wrong claim. They are collected here because they are
otherwise scattered across an `@unwitnessable` reason, an `UNWITNESSABLE` rule
in a generated suite, a residue paragraph in a closed charter, and a numbered
entry in the register — four places, none of which reads as a work list.

Read `docs/nullability-walk.md` for how the engine works and
`docs/deferred-tasks.md` for everything else that is open.

**Everything here is optional.** No consumer is blocked by any of it, and
shipping with all four open costs precision only. Take them in the order below
or not at all; what this document exists to prevent is rediscovering each one
from scratch.

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

### 1. A defaulted argument is not substituted into the body

**Shape.** `gfn_def(a integer, b integer DEFAULT 7)` called with one argument.
The walk reads a single-candidate `LANGUAGE sql` body back — here
`SELECT a + b` — and binds only the arguments the CALL supplies. `b` is left
unbound and therefore nullable, so `a + b` reads nullable. PostgreSQL
substitutes 7 and the result is total.

**Why it is open.** Reaching the case needs a call that OMITS a defaulted
argument, and the function-call generator axis is what produces one. It is
recorded as the `default-argument-not-substituted` rule in
`generated-soundness.test.ts`.

**What closing it takes, and the prerequisite nobody will expect.**
`FunctionArgInfo.hasDefault` is a BOOLEAN — the default EXPRESSION is not
captured anywhere in the snapshot (`pg_proc.proargdefaults` /
`pg_get_function_arg_default` are unread; the only `defaultExpr` in the
snapshot is `ColumnInfo`'s, which is a different thing). So this is a snapshot
change before it is a walk change: capture the expression, parse it the way
generation expressions and CHECK constraints are already pre-parsed in the
adapter, then bind it into the body scope for unsupplied parameters before the
walk descends.

**Watch for.** The arity window already computes `required` versus
`inputs.length` correctly (`resolveFunctionCandidates`), so candidate
selection is not the problem — only the binding is. And a default expression
is an arbitrary expression, so it wants the same conservative treatment as any
other: walk it, do not evaluate it.

**Cost of leaving it.** One nullable claim per defaulted parameter actually
used. Rare in application SQL.

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

- **None of these is unsound.** If you find yourself trading soundness for
  precision on any of them, stop: the register's standing rule is that a
  dropped claim is never a wrong one, and every item here is already on the
  safe side.
- **The refusal in item 4 is deliberate**, and its positive controls exist so
  that a fix cannot silently widen it into a blanket refusal. Keep them.
- **The foreign-key gate that `fk-entail-optional-referenced.sql` pins is
  load-bearing and mutation-tested**: it is what stops a referenced side
  extended by a DEEPER join from being promoted. Item 2's claim must be
  recovered by adding the join-level fact, never by relaxing that gate.
- **Item 1 is a snapshot change first.** Do not try to infer defaults from the
  rendered `pg_get_functiondef`; the structured route exists.

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
| Item 1's record | `UNWITNESSABLE` rule `default-argument-not-substituted`, `tests/unit/query/generated/generated-soundness.test.ts` |
| Item 1's schema vocabulary | `gfn_def` in `tests/unit/query/fixtures/schema.sql` |
| Item 2's record | `tests/unit/query/fixtures/fk-entail-optional-referenced.sql` (`@unwitnessable 0`) |
| Item 3's record | `docs/imprecision-closure.md`, "The residue is one shape" |
| Item 3's gate fixtures | `tests/unit/query/fixtures/fk-entail-*.sql` |
| Item 4's pins | `tests/unit/query/unsupported-nodes.test.ts`, "unnest's element type" |
| The engine | `src/query/nullability-walk.ts`, `src/query/catalog-adapter.ts` |
| The snapshot (item 1 lands here first) | `src/catalog/snapshot.ts`, `src/catalog/types.ts` |
| Everything else that is open | `docs/deferred-tasks.md` |
| Workspace rules (PGlite memory, build, layout) | `AGENTS.md` at the workspace root — not auto-loaded; read it before adding any long-lived PGlite instance |

Run from `pgsid/` with `npx vitest run`; installs use `pnpm`.
