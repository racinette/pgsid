# Adversarial sweep 4 — handoff

## Charter

Three sweeps have run against the output-nullability engine. The first
(`docs/adversarial-sweep.md` → `docs/adversarial-findings.md`) attacked
mechanisms that had aged under the fixture suites: 246 probes, 15 findings.
The second attacked the code the FIRST fix phase wrote: ~120 probes, 13
findings — roughly double the yield per probe. The third
(`docs/adversarial-sweep-3.md` → `docs/adversarial-findings-3.md`) attacked
the second fix phase's ten fixes.

The project's most reliable empirical fact about itself is that **young code
is where the defects are**, and this charter exists because a single working
session (2026-08-07) added six mechanisms to the walk and produced, along the
way, evidence that sharpens the point:

> Two items were picked up from `docs/precision-residue.md`, a document whose
> opening line asserted that every item in it was SOUND — a nullable where the
> value is provably non-null. Measuring the first turned up five wrong claims.
> Measuring the second turned up two more. Neither item had been carelessly
> recorded; both had been assessed by someone who believed the assessment.

Seven rank-1 unsoundnesses in code nobody suspected, found by probing the
neighbourhood of a precision question. That is your prior for the mechanisms
below, all of which are younger than that.

You are a graybox attacker with full source access and one goal: **break the
claims the 2026-08-07 session introduced**, plus anything its changes
disturbed. Engagement rules, unchanged from the first charter:

1. **Find, don't fix.** Record (protocol below) and move on.
2. **Diversify by mechanism, not by query.** Two falsifications through one
   code path are ONE finding.
3. **Synthesize at the end.** Root-cause, propose, do not implement.

Read the FIRST charter for the full statement of each rule, the rank table
(reuse it verbatim — rank 1 `notNull` unsoundness worst, rank 7 imprecision as
register material), and the oracle setup. Everything there applies; this
document replaces only the ATTACK CATALOG and the boundaries list.

## Why this surface is weaker than it looks

**One session wrote all of it, and verified it with fixtures the same session
authored.** PGlite refereed the outputs — `nullability-soundness.test.ts` is
real and green at 2526 tests over 41 files, 383 fixtures — but the failure
mode `nullability-walk.test.ts`'s own header names applies in full: the engine
and the fixture author agree, which is not the same as either being right.

**The generated corpus cannot reach most of it.** Measured this session: over
11632 generated queries the corpus exercises 24 of the walk's 35 catalog
capabilities, against 34 for the 438 hand-written statements — and the
generated half reaches nothing the fixtures do not. Its `t`/`u`/`v` carry no
foreign keys, no triggers, no custom operators, no composite or domain shapes,
and its function vocabulary contains **zero STRICT functions**. Five of this
session's seven unsoundnesses were in the strict family. Volume did not find
them and cannot: they are outside its vocabulary, not merely unlikely.

So the corpus is not your safety net here. Hand-built probes are.

## Attack surface catalog

The closure entries at the top of section 2 of `docs/deferred-tasks.md`, dated
2026-08-07, are your primary reading — six of them, each carrying the
soundness argument someone made under fix-phase pressure. Attack the argument,
not the code.

### A. The strict short-circuit

A strict function handed a NULL argument returns without running: NULL for a
scalar, one row of all NULLs for a composite return, no rows for a set. The
walk now refuses to read anything off such a call — priority 1's NOT NULL
domain claim, priority 5's body inlining, and the FROM item's whole column
list.

Probe: a strict function whose NULL argument arrives by a route the binding
does not model — a VARIADIC array, a named-notation call, an argument that is
itself a short-circuiting call, a strict operator's backing function, a strict
function called through a view or a CTE, an aggregate's FILTER. The
`returnsSet` exclusion rests on "no rows means nothing to contradict": find a
shape where a set-returning strict call still contributes a row (`ROWS FROM`
padding, `WITH ORDINALITY`, a LEFT JOIN LATERAL over it).

### B. Argument substitution

A defaulted parameter the call omits is bound by walking its DEFAULT
expression. The expression is walked in an empty scope with no function
context.

Probe: a default whose expression is volatile, raises, or references
`CURRENT_USER`; a default on a VARIADIC parameter; named notation that skips
several; a default that is itself a call to a function with defaults; a
default expression whose rendering the parser reads differently than
PostgreSQL evaluated it. The binding stops at the first non-input parameter —
confirm it stops SOUNDLY rather than merely early.

### C. Join-level presence

"This join cannot extend that side" now upgrades `incomingRequired` for joins
INSIDE the side, and the fact composes with itself. Two structural readings
carry it: `subtreePreserves` (which joins drop rows) and `subtreeAlwaysPresent`
(which joins extend them), both read off join TYPES alone.

Probe: anything that drops or extends rows without being a join type — a
LATERAL whose subquery returns nothing, a set operation inside a side, a
subquery with its own WHERE, a table function, `TABLESAMPLE`, an inheritance
child excluded by ONLY. USING and NATURAL joins synthesise their quals: check
the synthesised form is read the same way. The alias sets come from
registration ORDER; a self-join, a name shadowed by a CTE, or a duplicate
alias in nested scopes is where that could slip.

### D. The subquery chain

A correlated scalar subquery's anchor must reach the output through every
join: preserved by its side, or matched by a NOT NULL key carried by an
already-SETTLED relation and pointing at one still in the slice.

Probe: the settled-relation rule under nesting the flattening did not
anticipate (a join whose ON references a relation from a third subtree); ONLY
scans and inheritance on either side; a key whose referenced side is a
partitioned parent; the same shape with the subquery in a RETURNING clause, a
CHECK-guarded branch, or a LATERAL; a chain where the anchor is settled by a
self-lookup on a tree-scanning outer.

### E. `unnest` element typing

The element type now follows a computed derived-table column, a scalar
sublink's output, and a polymorphic builtin's signature
(`builtinPolymorphicArraySignatures`).

Probe: a polymorphic call whose argument type the walk reads wrongly —
`anycompatible` families mixing types, a domain over an array, a
multidimensional array, an array of a domain over a composite, `array_agg` of
an array. A wrong SHAPE here is rank 2 and shifts every later column's flag.
The refusals that remain are deliberate; widening one is a finding only if the
widened answer is WRONG.

### F. `merge_action()` and MERGE arms

`merge_action()` is now notNull. Probe it where a MERGE emits a row no arm
produced, if such a shape exists — `DO NOTHING` arms, `NOT MATCHED BY SOURCE`
with a RETURNING that references the source, a MERGE inside a CTE.

### G. Cross-mechanism interference

The richest seam, and the one no single-mechanism probe reaches: a claim that
needs two of the above at once. A strict function whose argument is a column
promoted by join-level presence; a subquery chain whose anchor is a table
function; an unnest over a column whose type comes from a defaulted argument.
Sweep 2's highest-value findings were of this shape.

## Known boundaries — do not re-find these

The register's imprecisions table and Decided-against list stand, plus this
session's recorded costs, all deliberate:

- a call is not bound past an interleaved OUT parameter, so a supplied
  argument there reads nullable (`function-strict-out-parameter-gap.sql`);
- an INNER join is read as dropping rows whatever its qual says, so a relation
  it provably preserves still loses the promotion;
- the `unnest` refusals that remain need types the walk does not compute;
- a `handled` catalog-feature label is verified at ACCESSOR granularity, so
  two features behind one accessor are not distinguished.

Converting any documented imprecision into an UNSOUNDNESS is always in scope —
that is a finding, not a boundary violation.

Environment bounds are unchanged from the first report's section 6: no FDW in
this PGlite build, catalog-only ICU, RLS unprobed. The PGlite artefact holds:
two mutually recursive `LANGUAGE sql` functions exhaust the backend and kill
the connection for later probes in the same session — isolate the oracle, not
the engine.

## Oracles, protocol, stop condition

As the first charter, verbatim: PGlite referee via the probe loop — every
probe runs the engine on a statement AND executes that same statement against
inline-seeded data in one PGlite, compared per the rank table. Quarantine
fixtures go in `tests/unit/query/fixtures-adversarial/` (recreate it; it
retires empty after each fix phase) carrying the engine's CURRENT claims plus
a header with the falsifying data, the observed outcome and the suspected
mechanism; their DDL goes in `fixtures-adversarial/schema-adversarial.sql`,
deliberately NOT folded into `fixtures/schema.sql`. The findings log is
`docs/adversarial-findings-4.md`, with failed attacks recorded per section —
negative results earned their keep in all three prior reports.

Keep the suite GREEN throughout: 2526 tests, 41 files, 383 fixtures as you
receive it. Run from `pgsid/`, `npx vitest run`; installs use pnpm.

Stop when every section A–G has taken at least three structurally distinct
shapes and one free-form session beyond the catalog yields nothing. Then
synthesize — root causes, fix sketches, blast radii, recommended order,
negative results — for a fix phase that folds into the register as the first
three did.

**One number to report explicitly:** the yield per probe against sweep 3's.
Three sweeps of diminishing returns would be the evidence that retires this
cycle; a fourth that matches sweep 2's rate says the opposite, and says it
about code that was written with all three prior reports in view.
