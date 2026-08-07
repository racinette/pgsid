# The precision residue — handoff

## What this document is

Four items in the output-nullability engine that were covered by neither of
the two efforts already chartered. **All four are now closed** as far as this
engine reaches; what is left of item 4 is one refusal cause that belongs to
`docs/type-aware-overloads.md` and waits behind the same prerequisite that
charter does. This document is now a RECORD rather than a work list, and it is
kept for what closing the four found. They were collected here because they
were otherwise scattered across an `@unwitnessable` reason, an `UNWITNESSABLE`
rule in a generated suite, a residue paragraph in a closed charter, and a
numbered entry in the register — four places, none of which read as a work
list.

Read `docs/nullability-walk.md` for how the engine works and
`docs/deferred-tasks.md` for everything else that is open.

**What closing them found is the reason to keep this document.** Each of the
four was recorded as a precision item and assessed as sound. Two of the four
had a WRONG CLAIM in the same neighbourhood, one step away — what a call means
from what it does, what a key proves from where the join looks — and seven
claims were fixed that nobody had gone looking for. The other two were sound
exactly as recorded. The label on an item is a measurement somebody made once;
re-measure the neighbourhood before trusting it.

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

### 3. Foreign-key entailment does not compose through a JOIN inside a correlated subquery — CLOSED 2026-08-07

**What it was.** The subquery form read a FROM of ONE relation, so
`(SELECT c.email FROM customers c JOIN orders o ON o.customer_id = c.id WHERE
o.id = s.order_id)` fell through to nullable even though each hop is a NOT
NULL key the mechanism already reads.

**What it is now.** The WHERE settles the ANCHOR — the relation it keys into —
and every join between it and the output must then either PRESERVE the
anchor's side or MATCH it, which is the same pair the join form uses. A match
is a NOT NULL key carried by a relation already settled, pointing at a
relation on the other side that no join inside that side has dropped; that
relation is settled in turn, so a chain proves itself one join at a time. The
two claims the register carried as this item's reason are recovered;
`docs/nullability-walk.md`'s foreign-key section has the rule and
`fk-entail-subquery-join-*.sql` the nine fixtures.

**The direction is the whole content of the match arm**, and it is the same
asymmetry the join form turns on: `o.customer_id = c.id` read from `c` says
every order has a customer, and is silent about a customer with no orders.

**No cost recorded, and that is the second lesson after item 1's.** The first
pass restricted the FROM to INNER joins and wrote the outer-join case down as
a deliberate cost. It was not one — the preserved-side arm is four lines — and
the restriction was hiding a claim while making a real requirement look
unwitnessable. A restriction no test can hold you to is not a cost, it is an
unpinned assumption; close it or pin it.

### 4. The `unnest` refusal class — CLOSED 2026-08-07 down to one cause

**What it was.** `unnest` contributes one column per argument unless the
element type is a COMPOSITE, when it contributes one per FIELD — so the shape
depends on a type, and three spellings refused because the walk could not read
one: an aggregate, a sublink, and a derived-table column the inner query
computes.

**What it is now.** Two of the three were not type inference at all, only the
reading stopping at a door it could have opened. A CTE or subquery column with
no base column behind it is one the inner query COMPUTES, and its defining
expression is an expression like any other — typed against a scope built for
that statement's own FROM, `ARRAY[p]` over a composite column answers
`sku_pair[]`. A scalar sublink is its single output column, typed the same
way. Both recurse into the SAME reading rather than growing a second partial
type system, so the CTE spelling, the WHERE-qualified sublink and an
array-of-table-row-type column all fell out with no branch of their own.

**What still refuses, and who owns it.** One cause: a POLYMORPHIC builtin.
`array_agg(p)` yields `sku_pair[]` and PostgreSQL resolves it from the
argument types; saying so needs pg_catalog SIGNATURES in the snapshot — 25
`anyarray`-returning names plus seven `anycompatiblearray` ones, readable
straight off `pg_proc`. That is blocked by a standing decision recorded before
this work: `docs/generated-surface.md`'s boundary keeps pg_catalog signatures
out until the consumer's search-path input lands, and
`docs/type-aware-overloads.md` is sequenced behind the same prerequisite. So
this arm is not an open judgement call — it is one line of that charter's
work, and this document's guess that it "may fall out for free" was right.

**The refusal itself stays deliberate**, with its positive controls beside it
in `unsupported-nodes.test.ts`. Fourteen spellings were measured against
PostgreSQL's own column lists before and after, and the engine answered a
WRONG shape in none of them — which is what kept this item precision rather
than soundness, unlike the three above it.

## Boundaries — do not re-derive these

- **A dropped claim is never a wrong one** — the register's standing rule, and
  none of the four fixes traded soundness for precision. Where an item's
  neighbourhood turned out to hold a wrong claim, fixing that came first and
  the precision followed from the same condition.
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

## How the four were closed

The project's standing loop, unchanged: counterexample → pinned fixture →
engine fix, with the fixture landing BEFORE the fix and failing without it.
What each closure additionally held itself to, and what a fifth item of this
kind should:

- Every claim recovered is WITNESSED or its unwitnessability recorded —
  `docs/witness-coverage.md` is the standard and the suite enforces it.
- Every fix is mutation-checked: revert it, confirm the new fixture fails, and
  that it fails ALONE. Items 2 and 3 both touch the foreign-key fixpoint,
  where a broad change quietly excuses claims that should be witnessed.
- The generated corpus (11632 queries) runs before anything that moves claims
  toward notNull lands. It has caught this class before.
- A stale reason is worse than none: the `@unwitnessable` reason or
  `UNWITNESSABLE` rule that recorded each item came off with it, and the
  suites fail on a reason that no longer matches.
- **A restriction no test can hold you to is not a cost, it is an unpinned
  assumption.** Item 3's first pass left one and it was hiding a claim. Close
  it or pin it; recording it is the wrong third option.

## Where things are

| | |
|---|---|
| Item 1's fixtures (closed) | `function-default-argument.sql`, `function-strict-*.sql`, `aggregate-domain-empty-input.sql` |
| Item 2's fixtures (closed) | `fk-entail-optional-referenced.sql`, `fk-entail-join-level-*.sql`, `fk-entail-referenced-not-preserved*.sql` |
| Item 3's fixtures (closed) | `fk-entail-subquery-join-*.sql` |
| Item 4's fixtures (closed) | `unnest-derived-computed-column.sql`, `unnest-sublink-array-column.sql`, and the pins in `unsupported-nodes.test.ts` |
| The foreign-key gate fixtures | `tests/unit/query/fixtures/fk-entail-*.sql` — eighteen, each pinning a hazard from the side that would produce a wrong `notNull` |
| The engine | `src/query/nullability-walk.ts`, `src/query/catalog-adapter.ts` |
| The snapshot | `src/catalog/snapshot.ts`, `src/catalog/types.ts` |
| Everything else that is open | `docs/deferred-tasks.md` |
| Workspace rules (PGlite memory, build, layout) | `AGENTS.md` at the workspace root — not auto-loaded; read it before adding any long-lived PGlite instance |

Run from `pgsid/` with `npx vitest run`; installs use `pnpm`.
