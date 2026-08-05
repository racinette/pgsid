# Deferred tasks — nullability engine

## What this document is

A register of work on the output-nullability engine that is understood but not
done, so that picking any item up does not require rediscovering why it exists.
Read `docs/nullability-walk.md` for how the engine works.

Each item records what it is, why it is not done, and — where one exists — the
condition that should trigger doing it.

One area is documented elsewhere and not repeated here: how the fixture suite
is made to verify what it claims to verify is in `docs/witness-coverage.md`.

---

## What to do next

The engine's output analysis is verified as far as hand-written fixtures can
take it. Every fixture returns rows or declares the error it raises instead, and
every `notNull` claim is either falsifiable against returned rows or guarded by
a refusal the suite checks — nothing is verified by nothing, and that is held at
zero. The measurements are in `docs/witness-coverage.md`.

What is left is not more assertions about the queries somebody wrote. It is
finding the defects nobody thought to look for, and then a consumer.

**Next up: the consumer — designed; build it.** The design doc exists:
`docs/consumer-design.md` (2026-08-04) opens with the six product
questions and their answers — native dialect (`-- name:` + `@name`, no
macro namespace; sqlc via the one-shot `migrate-from-sqlc` codemod),
types-then-functions artifact, ordered single-dir schema entries,
refusals-warn/rest-error diagnostics — and sets the slice plan. The build
proceeds slice by slice from that document. The engine item that fell out
of the design — exporting **presence groups** as contract vocabulary
(`outputPresenceGroups`) so optional-join outputs emit as factored
discriminated unions — is BUILT: Wave 13 (2026-08-04, the closure entry in
section 2 below records it and its residues); the design doc keeps the
TS 5.9 narrowing measurements. Architectural ground
already settled (2026-08, discussed over the `src/engine.ts` sketch — do
not re-litigate without new information):

- ONE run path for CLI and language server, held by a PARITY SUITE from
  the first vertical slice (batch output over a project ≡ watch-shell
  steady state after replaying the same edits) — the traced/untraced
  drift lesson at product scale.
- The shared path is a PURE, MEMOIZED derived-value graph (migrations →
  applied schema → snapshot → catalog → per-query contract → artifact);
  events exist only in the shells and terminate at "invalidate key K".
  The CLI is a shell that feeds inputs once and exits — no engine mode,
  no stop-after-ready flag; the single-PoV lock falls out of the driver.
- Invalidation is the EXISTING triangle: any migration change → rebuild
  snapshot → `diffCatalogs` → changed `EntityId`s → recheck queries whose
  `extractDeps` touch them. Per-migration incrementality is NOT a lever
  (schema is a fold over the ordered list); the diff is.
- `src/engine.ts` salvage verdict: keep the event taxonomy, the ready
  barrier, and the coalescing/debounce/retry patterns as the WATCH
  SHELL's vocabulary; retire trackers-that-compute (a tracker acquires
  input, the graph computes); the subscription map becomes the
  EntityId-keyed invalidation index (`DatabaseIdentifier` reinvented
  EntityId — drop it). Wall-clock event ordering → monotonic per-source
  sequence numbers if kept at all.
- Emitted types inherit: rejection sets as factored local unions (flat
  types ∩ one union per set), names from RowDescription, contracts from
  `inferQueryContract` verbatim. LSP comes LAST; the dual-parser
  question stays deliberately deferred
  (`docs/postgres-language-server-notes.md`).

The six pre-implementation questions were answered 2026-08-04;
`docs/consumer-design.md` opens with them and their answers (dialect,
artifact, config, migrations, diagnostics, slices). They are not repeated
here.

Before the build starts, one final engine step: the ADVERSARIAL SWEEP —
`docs/adversarial-sweep.md` is a self-contained handoff for a graybox
attacker that probes every claim kind for unsoundness (find-don't-fix,
diversify by mechanism, synthesize at the end into
`docs/adversarial-findings.md` with root causes and proposed fixes).
It is the "finding the defects nobody thought to look for" line above,
made executable; its findings doc folds back into this register during
the fix phase that follows it.

**The sweep RAN (2026-08-04) and its FIX PHASE is COMPLETE
(2026-08-04/05).** 246 probes, fifteen findings: nine rank-1 `notNull`
unsoundnesses, five rank-2 shape defects (two of which also falsify a
flag), one rank-3 param-contract defect; zero parity breaks and zero
crashes. Eight root causes, each fixed in its own commit in the report's
recommended order — soundness first, cheapest first, the widest-radius
strictness/INITCOND/builtin-totality fix last, dry-run against the
generated corpus before landing. Every quarantine fixture graduated into
`tests/unit/query/fixtures/` with corrected claims and witnesses, the
adversarial DDL folded into the fixture schema, the two new refusal
classes (DO INSTEAD rules, unresolvable relations, `(expr).*` over an
unresolvable composite) pinned in `unsupported-nodes.test.ts`, and the
quarantine directory retired empty. The per-fix closure entries — with
what each measured and what it deliberately costs — are at the top of
section 2; the findings doc stands as the sweep's report with a status
header. What remains from the sweep is one scheduled item: the
arity-and-order gate (section 1, amended — ORDER as well as length,
before the emitter slice), which now blocks nothing and belongs to the
consumer build's first contract-holding slice.

A same-day probe of the fix phase's own surface then found — and closed —
one more rank-1 defect (the write-rewrite hooks read the named relation
while triggers fire on the relation the row lives in; the closure entry
below has it). One probe, one conviction, on the first new mechanism
tried: the fix phase's two days of fresh code deserve the same treatment
the aged engine got. **A second, targeted sweep was chartered
(`docs/adversarial-sweep-2.md`), RAN (2026-08-05), and its FIX PHASE is
COMPLETE (2026-08-05).** ~120 probes, thirteen findings: eight rank-1
`notNull` unsoundnesses, three rank-2 shape defects (all three of which
also falsify a flag), two rank-3 param-contract defects; zero parity
breaks and zero crashes across every probe — moving the refusals into
the shared scope builders did what it was meant to. Nine root causes,
five of them one idea: a fact was moved from "the named relation" to
"the relation SET", or from "the statement" to "the row PostgreSQL
reports", at the sites the fix phase was looking at rather than at every
site that asks the question. All thirteen closed, one commit per fix in
the report's recommended order — soundness first, cheapest first, the
corpus dry-run before the one fix that could flip existing claims. Every
quarantine fixture graduated into `tests/unit/query/fixtures/` with
corrected claims and witnesses, the DDL folded into the fixture schema,
the search-path halves pinned in `search-path.test.ts` (they need a
second catalog the fixture harness cannot build), the composite-star
refusal re-pinned on the shapes that remain unresolvable, and the
quarantine directory retired empty. Witness coverage re-measured at 311
fixtures (`docs/witness-coverage.md`); the findings doc stands as the
sweep's report with a status header; the per-fix closure entries are at
the top of section 2. Two items deliberately left open: search-path
half (b) — WHERE the path comes from is a consumer input and belongs to
the consumer design — and the WIDE reachability question behind finding
9 (`notNull`'s existential claim has no reachability qualifier),
recorded beside the claim semantics in `docs/argument-nullability.md`.
**A THIRD sweep is chartered (`docs/adversarial-sweep-3.md`) and has NOT
run.** Same argument as sweep 2's, one generation later: the ten fixes
above are now the youngest code in the repository, and they were verified
almost entirely through fixtures their own author wrote in the same
session — PGlite refereed the outputs, but no independent probe tried an
input class the author did not think of. The yield curve says to go
again: sweep 1 found 15 in 246 probes, sweep 2 found 13 in ~120 aimed at
fresh fix-phase code. The charter is TARGETED and smaller still, with a
ten-section catalog led by the two soft spots the fix phase itself
flagged — `inPath`'s first-schema-wins rule applied to FUNCTIONS, where
PostgreSQL resolves by argument types across the whole path (a possible
rank-1: wrong body metadata), and `BUILTIN_SRF_NAMES`, a new
hand-curated table that is unfalsifiable-by-construction in the way
`ALWAYS_NOT_NULL` was. It carries its own stop condition: if the yield
comes in materially below sweep 2's, the report says so, and that is the
evidence that retires this cycle for good.

**Then the consumer build** — the slice plan is
`docs/consumer-design.md`, as above, with the arity-and-order gate in
its first contract-holding slice, now carrying eight defects across two
sweeps that it would have caught.

The semantic re-founding (section 5) is a standing parallel track; its
executable target list emptied when Wave 12 closed the origin
extensions, so its next candidates come from whatever the consumer's
corpora surface.

1. **Argument nullability** — built in full: the four sequencing steps,
   mechanism-A output narrowing, mechanism-C value-flow rejection, and
   source value-flow attribution with its quantifiers split (universal for
   narrowing, existential for the contract). The design and its empirical
   grounding are in `docs/argument-nullability.md`; no known wrong-claim
   class remains.
2. **New generator axes.** The generated suite ran its full axis space and
   found no defect, which per its own criterion is the signal to widen the
   axes. Widened so far: parameters and DML (item 1 above), then parameter
   *placement* — strict ON conjuncts, the mechanism-A cast inside an ON qual,
   HAVING, parameters inside a LATERAL body, a set operation's second branch,
   and LIMIT/OFFSET, all crossed with the wrappers
   (`generateParamPlacementQueries`). That round found no defect either, and
   confirmed three behaviours worth having on record: bind-time rejection is
   position-blind, inner-scope narrowing in a LATERAL body survives the cross
   join and degrades under LEFT JOIN LATERAL, and EXCEPT keeps the left arm's
   claims. Its residue is two refilter live-traps (`inner-on-refilters`,
   `having-refilters`) that flip with PostgreSQL's agreement if the recorded
   ON/HAVING narrowing extensions ever land.

   Deep join trees and window functions followed, and both came back clean.
   The deep axis (`generateDeepJoinQueries`): three joins over the t—u—v—ck
   chain, all five tree shapes × all 4³ kind combinations — 320 structures,
   plain projection only, setops/wrappers deliberately not crossed (the run
   reports the bound). It found no defect; its residue is 44 structures
   whose `a_ue` is unwitnessable because every u-null-extended row dies at a
   strict edge qual — more instances of the strict-qual imprecision row in
   the table below, verified 44/44 against a hand-checked join-semantics
   model (`deep-strict-edge-refilters-u`). The window axis: two projection
   entries crossing the full structural space (+540 queries), putting the
   walk's window dispatch — never-null ranking set, count's empty-frame
   zero, ntile's argument condition, the conservative offset/frame fallback
   — under the execution oracle for the first time. Zero falsifications, and
   `lag` of a NOT NULL column is witnessed NULL on first rows, as claimed.

   The enumerated axis list is now exhausted with no engine defect found
   since the MERGE-source collector gap. Per the generator doc's own
   criterion, the next widening is either a randomised generator over the
   grammar (now justified by evidence about which constructs are stable) or
   shifting effort to the first consumer, which items 1 and 3 below wait on
   anyway. Whatever a future axis finds becomes a permanent fixture with
   annotations, and an engine fix.
3. **The differential oracle** — assessed and demoted; see "Unbuilt
   verification strategies" for the findings. Neither candidate can verify
   this engine: one has no comparable analysis, the other is unsound in both
   directions outside a band our execution oracle already covers.
4. **The arity gate** — small, and waits for the first consumer to exist rather
   than being retrofitted.

---

## 1. Arity-and-order gate at the consumer boundary

**What.** Nullability is a positional array meant to be zipped against
PostgreSQL's `RowDescription` — the contract is documented on
`OutputNullability` in `src/query/types.ts`. Nothing enforces that the two
lists agree before they are zipped — and the comparison must be the ordered
NAME list, not length alone: the sweep's finding 10 was six columns against
six, permuted (MERGE `RETURNING *`), which arity cannot see. The
constraints on the name comparison are in the findings doc's "gate at the
consumer boundary" subsection: it VERIFIES a positional join (never joins
by name — names are not unique), and it degrades to arity-only at
positions where the engine reports an empty name (`FigureColname` stays
unimplemented by decision).

**Why it matters.** A mismatch misassigns every flag past the point of
divergence, and does so while looking authoritative. The check is a single
comparison, and the consumer necessarily holds both lists: it runs `PREPARE`
for types anyway. On mismatch the safe response is to treat every column as
nullable and report loudly.

**State.** Not written, because there is no consumer: nothing under `src/`
calls `inferNullability` yet. The engine cannot self-verify — it has no
PostgreSQL.

**Trigger.** Write it with the FIRST slice that holds a contract and a
PREPARE result at the same time — BEFORE the emitter slice, not with it
(`docs/consumer-design.md`): every slice between would otherwise build on a
failure mode that is silent by construction. Permanent, not transitional —
the sweep found five shape defects in one sitting and the engine will keep
growing.

---

## 2. Known imprecisions in the walk

Each of these is *sound* — the engine reports nullable where a value is
provably non-null. They cost precision, never correctness, and are listed so
that a decision to close one is deliberate.

Closed by a targeted probe of the search-path fix (2026-08-05), the
sweep-3 charter's section A, measured before the sweep ran — and it
convicted, on four mechanisms plus a second defect nobody was looking
for. `inPath`'s first-schema-wins rule is right for relations, types and
domains, which a NAME identifies; a function is identified by name AND
ARGUMENT TYPES, and PostgreSQL gathers candidates from every schema in
the path. Measured with `f(text)` in app_s and `f(integer)` in public
under `search_path = app_s, public`: `f(42)` runs PUBLIC's and returns
NULL, while the engine read app_s's metadata and claimed its NOT NULL
domain return — and the same mis-pick reached priority 5 (inlining the
wrong BODY, no domain involved), the FROM-clause return-type expansion
(`[sku,qty]` against PostgreSQL's `[a,b,c]`), and calls whose ARGUMENT
COUNT matched neither. Unqualified lookups now merge candidates across
the path, deduped by `argTypes` — `pg_get_function_identity_arguments`,
exactly the key the hiding rule uses, and hiding IS first-in-path
(measured both directions, so the same-signature case keeps its
precision) — and "a single candidate" means one across the merged set,
so an ambiguous name falls to the overload-consensus rule that already
existed for same-schema overloads. The probe's second conviction was
PRE-EXISTING and needed no search path: an overloaded table function in
FROM whose candidates return different SHAPES fell through to one
column named after the function (measured — one against PostgreSQL's
three, two overloads in ONE schema, missed by both sweeps). That site
now takes shape CONSENSUS — candidates agreeing on a column list give
it, disagreeing candidates REFUSE at the from-item site — with the
positive arm pinned so the refusal is not blanket. Costs: an
unqualified call to a cross-schema-overloaded name loses precision even
when PostgreSQL's pick would have been the notNull one (`f('abc')` —
an unknown literal PostgreSQL resolves to app_s.f); a disagreeing
overload in FROM refuses where the caller could have run PREPARE.
Pinned in `search-path.test.ts` (four function-resolution cases, both
hiding directions) and `unsupported-nodes.test.ts` (the refusal and its
agreeing control).

Nothing here changed the RESOLUTION POLICY, which stands as designed: the
engine performs no type simulation, filters candidates by ARITY only, and
takes consensus — a property every surviving candidate shares holds for
whichever one PostgreSQL picks. What was wrong was the candidate SET. A
single-candidate shortcut (one visible function of that name means
PostgreSQL either picks it or rejects the statement, so its metadata may
be read directly) is sound exactly when the set is complete, and the
search-path merge had made it incomplete — so a genuinely overloaded name
took the shortcut and never reached the consensus rule at all. The fix
restores the design rather than amending it; the only extension is of the
consensus QUANTIFIER to a second axis, shape, at a site that had never
consulted candidates.

Both residues the probe recorded were then closed the same day, since the
context was in hand and a sweep should uncover new defects rather than
re-confirm known ones. (a) `DepCatalog.resolveFunction` became
`resolveFunctions`, PLURAL: an unqualified call whose candidates live in
two schemas depends on BOTH, because the consensus rule reads both, and
recording one left the query unregistered against the other — a missed
EntityId, stale invalidation rather than a wrong flag. (b) The FROM
shape question now runs over the FULL candidate set BEFORE any arity
narrowing: agreement needs no resolution at all, so a variadic candidate
— which makes the arity filter unsound and once sent the whole item to
one wrongly-named column (measured: `vp(VARIADIC text[])` beside
`vp(integer)`, both `SETOF sku_pair`, gave `[vp]` against PostgreSQL's
`[sku, qty]`) — costs nothing when the shapes already agree; narrowing is
attempted only on disagreement, and a variadic candidate then leaves
nothing to prove agreement with, so the refusal stands. Pinned four ways
in `unsupported-nodes.test.ts` and twice in `resolver.test.ts`.

One hole is left open and is NOT closable by recording entities: a
dependency on a function that does not exist YET. A better-matching
overload created later in an earlier schema changes the answer with no
recorded EntityId to hang the invalidation on — and the identical hole
exists for unqualified RELATION references (`FROM t` resolving to
public.t until someone creates app_s.t). It is a property of tracking
unqualified names under a search path, so it belongs with search-path
half (b) in the consumer design, not to the engine.

Closed by the second adversarial fix phase (2026-08-05), finding 5 /
RC-5, half (a) — a contract made true rather than a defect fixed:
`NullabilityCatalog.resolveTable` has always documented search-path
resolution and the adapter hardcoded `public`, which the
unresolvable-relation refusal made half-loud (a non-public relation
refuses) while the worse half stayed silent (a same-named public
relation answers for the WRONG table). `buildNullabilityCatalog` takes a
`searchPath` option, default `["public"]` — every existing caller
byte-identical — and every unqualified resolver walks it in order, with
the hook and partitioned lookups resolving the RELATION first so a
hookless first-schema table cannot fall through to a later schema's
same-named one. Pinned in `search-path.test.ts` with PGlite's
RowDescription under the real `SET search_path` as referee. Half (b) —
WHERE the path comes from — is a per-connection consumer input and stays
with the consumer design.

Closed by the second adversarial fix phase (2026-08-05), findings 8 and
9 / the param-side conservatisms. (8) `columnRejection` read the named
relation's `attnotnull` while UPDATE and MERGE's update arm write into
the TREE — a child left unconstrained by `ALTER TABLE ONLY` accepts the
NULL binding a parent-stored row raises on (measured, both states);
update-command targets now take `resolveColumnNotNullTree`, closing the
asymmetry with the output side. A dropped claim, never a wrong one, and
witnessable in every data state (`param-mech-b-inheritance-tree.sql`,
the child's disjoint id range exercising the accepted binding). (9) A
non-data-modifying CTE nobody references is never executed in ANY state
(measured — the frame-offset site inside one accepts what its referenced
control raises on): `visitStatementWithCtes` walks unreferenced SELECT
CTEs for parameter NUMBERS only, name-level references transitively
closed, data-modifying CTEs always walked
(`param-unreferenced-cte.sql`). The WIDE question — the existential
claim has no reachability qualifier, so any provably-dead subtree
falsifies an execution-time mechanism — is recorded beside the claim
semantics in `docs/argument-nullability.md`, deliberately open.

Closed by the second adversarial fix phase (2026-08-05), finding 13 and
the rank-7 over-refusals / RC-9 — the composite-star arm read the alias
before asking whether a column wins, and PostgreSQL's parenthesized
`(x).*` is the VALUE spelling: a composite COLUMN named x beats a
range-table alias named x (measured — same arity, entirely different
columns, the second same-arity permutation this project has met).
`expandCompositeStar` resolves the column FIRST — merged columns landing
in the refusal rather than the alias fallback — and gained the value
arms the first phase refused: a qualified composite column and a cast to
a known composite expand the type's fields, a ROW constructor expands
parse-time arity as f1..fN, all nullable (the FuncCall arm's shared
rule). The refusal keeps unknown cast targets and subquery composite
columns, re-pinned in `unsupported-nodes.test.ts`
(`composite-star-alias-clash.sql`, `composite-column-star.sql`;
`composite-star-whole-row.sql` holds the non-clashing spelling).

Closed by the second adversarial fix phase (2026-08-05), findings 4 and
7 / RC-4 — an SRF's contribution now asks what it actually returns per
row. In FROM: `unnest` of a COMPOSITE-element array expands the
element's FIELDS, one column per field, all nullable (measured through
five spellings); `unnestCompositeElementFields` reads the element type
from the statically-typed shapes (array-bounds casts, ARRAY constructors
of casts, column types rendering `T[]`) and REFUSES when a ROW
constructor's provably-composite cast target is not in the snapshot —
one column there is a wrong shape (`unnest-composite-shape.sql`;
`unnest-composite-merge-source.sql` pins the composition with MERGE's
source-first order, the lists now aligned). In the TARGET LIST: two or
more set-returning calls expand in lockstep and the SHORT one is
NULL-padded AFTER it returned, so `srfPaddedTargets` — shared by both
assemblies like originModeOf — drops every SRF-carrying entry to
nullable; a single SRF keeps its precision, a scalar beside an SRF
repeats rather than pads (both measured;
`srf-target-list-padding.sql`). Set-returningness is catalog
`returnType` or the curated `BUILTIN_SRF_NAMES` — bounded coverage, the
builtin tables' usual deal.

Closed by the second adversarial fix phase (2026-08-05), finding 10 /
RC-7 — grouping-set ordinals number the EXPANDED output list, and the
recorder indexed the RAW one: a star entry is ONE ResTarget and N output
columns, so any preceding star shifted every ordinal and the star's own
`[String, A_Star]` fields recorded nothing — `groupingSetColumns` came
back empty and the NULLing override never applied. The recorder now runs
AFTER the FROM walk (it needs the aliases) and resolves ordinals against
`groupingOrdinalPositions`: star positions carry their (column,
alias.column) keys directly, composite-star positions occupy width with
no keys, plain positions keep `collectColumnRefKeys`. Precision kept
over the report's refuse-flag alternative — the expansion was one
helper. The alias spelling stays on the raw list (a star entry cannot be
aliased); the plain-ref pins from sweep 1 hold
(`grouping-set-ordinal-star.sql`, all three grouped keys witnessed on
the rollup rows).

Closed by the second adversarial fix phase (2026-08-05), finding 3 /
RC-3 — the generation expression got its relation-SET analogue:
`notNullTree` and `writeRewritesTree` existed, and the generation
expression was the third per-column fact read from the named relation
while the query scans the tree. A child MAY redefine an inherited
column's expression (measured — the only accepted divergence besides NO
INHERIT), so the snapshot computes `ColumnInfo.generationDivergesInTree`
— the rendered (generated, defaultExpr) pair compared over the subtree,
uncaptured descendants diverging, generated parent columns only,
diff-comparable on the parent — and `resolveGenerationExprTree` refuses
on the bit: one string comparison, not a per-child expression walk. The
walk dispatches through the `entryGenerationExpr` scanInh split; the
CHECK-entailment equality facts and both origin-side consumers take the
tree unconditionally (`generated-child-override.sql`, witnessed by
gen_c's every-row-NULL `nullif(a, a)`;
`generated-override-only-control.sql` keeps the parent's formula).

Closed by the second adversarial fix phase (2026-08-05), finding 6 /
RC-6 — the LANGUAGE sql body inliner was a THIRD caller of the DML scope
builders, calling `buildDmlScope` directly and bypassing every
rewrite-hook response the first fix phase put INTO the builders
precisely so both entry points would share them: no INSTEAD OF void, no
BEFORE ROW void, no DO INSTEAD rule refusal (the top-level and
data-modifying-CTE spellings of the identical INSERT were measured
correct — a bypassed call site, not a missing rule, made load-bearing by
RC-1's strict fall-through exactly as the charter hypothesized). The arm
routes through `buildInsertScope` and CATCHES the rule refusal: an
inlined body is an optimization, so a refused body costs the call its
precision, not the statement its analysis
(`body-insert-instead-of-view.sql`, `body-insert-do-instead-rule.sql`,
both witnessed on every call).

Closed by the second adversarial fix phase (2026-08-05), finding 1 /
RC-1 — the hook question is per-command and row movement crosses
commands: an UPDATE through a partitioned parent that moves a row is
DELETE + INSERT, and the DESTINATION partition's BEFORE **INSERT**
trigger rewrites NEW (measured — it also rescues the NULL binding the
stationary control raises on). The tree union was right and complete;
it collapses WHICH member contributed WHICH command, so a partitioned
target's UPDATE now asks `beforeRow ∩ {update, insert}`
(`updateBeforeRowHazard`, in both buildUpdateScope and buildMergeScope's
update arm; the same two-command set in mechanism B's gate). The
snapshot carries `relkind` (diff-comparable — a kind flip is
drop-and-recreate) and the adapter answers `resolveIsPartitioned`.
Plain inheritance never routes and keeps the single-command test; zero
radius for partitioned targets without INSERT triggers
(`partition-row-movement-trigger.sql` witnessed on every moved row,
`partition-row-movement-param.sql` with the rescue exercised).

Closed by the second adversarial fix phase (2026-08-05), finding 2 /
RC-2 — RC-3's "the CHECK path needed nothing: children carry their own
pg_constraint rows" was true for inheritable CHECKs and false for
`CHECK … NO INHERIT`, which is never copied to a child at all — the ONE
CHECK divergence route PostgreSQL permits (five others measured refused;
partitioned parents refuse the construct itself). The snapshot captures
`connoinherit` (`ConstraintInfo.noInherit`, diff-included) and
`TableInfo.hasDescendants` (diff-comparable — a FIRST child changes the
reading with every column flag unchanged); the adapter grows
`resolveCheckConstraintsTree`, dropping NO INHERIT constraints exactly
when descendants exist; the walk's entry consumer picks the list by the
same scanInh split the flags use, the origin consumer takes the tree
unconditionally. Four pins: tree and conditional (witnessed by the
unconstrained children's generated NULLs), the ONLY control keeping the
derivation, and the CTE re-export pinning the origin route.

Closed by the second adversarial fix phase (2026-08-05), findings 11 and
12 / RC-8 — the builtin tables were re-swept with new INPUT CLASSES and
two entries failed their own admission criteria. `extract`/`date_part`
(one function, two names) are out of `STRICT_TOTAL_BUILTINS`: month, day
and hour of an infinite timestamp, timestamptz, date or interval are
NULL (measured — the first sweep's finite probes could not see it). And
priority 6b gained a VARIADIC gate ahead of all three tables:
`VARIADIC <array>` passes the variadic parameter as ONE array and a NULL
array yields NULL — measured for concat, concat_ws with a non-null first
argument, and the json constructors, while a non-null array of NULL
elements behaves element-wise — so every variadic-array call drops to
conservative nullable; `ALWAYS_NOT_NULL` was unfalsifiable-by-
construction until the calling convention changed what "the arguments"
means. Costs `date_part('year', finite)` its notNull — the substring
trade again; corpus dry-run clean (`builtin-extract-infinity.sql`
witnessed by inf_t's generated infinity rows,
`builtin-variadic-null.sql` witnessed on every row).

Closed by the post-phase probe (2026-08-05) — an unsoundness the fix
phase itself left, found by composing finding 2's mechanism with finding
3's and convicted by two probes before any code moved: the write-rewrite
hooks were read from the NAMED relation while the trigger that rewrites a
row is the trigger of the relation the row LIVES in. Tuple routing fires
the PARTITION's BEFORE ROW trigger for an INSERT through the parent
(measured — the routed row came back with its written value nulled), and
an UPDATE through an inheritance parent fires the CHILD's trigger for
child rows (measured likewise), so the written-value map and SET-mask
voids never fired for either. The snapshot now computes
`writeRewritesTree` — `beforeRow` unioned over the inheritance subtree,
the hook analogue of `notNullTree`, diff-comparable on the parent for the
same reason; the trigger capture drops its namespace filter so a temp
child's trigger still reaches the union — while rules stay per named
relation (they attach to the named RTE and do not fire through a parent —
measured) and INSTEAD OF stays view-only. The walk honours the same
`RangeVar.inh` bit the flags do: plain references take the tree, `ONLY`
takes the relation's own hooks; the param contract's mechanism-B gate
takes the tree unconditionally (a partition trigger measured rescuing a
NULL binding routed through the parent — conservative for ONLY targets,
where the cost is a dropped claim, never a wrong one). Pinned three ways:
`trigger-partition-routed.sql` (the routed INSERT, written map void, the
rescued NULL binding exercised), `trigger-inherit-child-row.sql` (the
child-row UPDATE, witnessed by every child row), and
`trigger-inherit-only-control.sql`, whose written-literal notNull on an
everywhere-unconstrained column discriminates the hook resolution
itself. Found the day the fix phase closed — the concrete argument for
the second sweep the register now schedules
(`docs/adversarial-sweep-2.md`).

Closed by the adversarial fix phase (2026-08-05), findings 5, 6 and 7 /
RC-1 — the widest-radius fix, deliberately landed LAST so its flips fell
on a codebase whose other claims were already correct: three sites
inferred TOTALITY from properties that constrain one input case. (5)
Priority 4 concluded non-null from strictness plus non-null arguments;
strictness says NULL in ⇒ NULL out and nothing else (`lookup_name` over a
missing row returned NULL from a non-null argument — measured). The
dispatch now concludes only the nullable direction — before the body walk,
which a strict function with a NULL argument never runs — and falls
through otherwise: LANGUAGE sql bodies keep their precision (the zero-row
gate is what makes lookup_name honest; lower_strict's literal calls stay
notNull through `SELECT $1`), everything else drops to conservative. The
consensus twin follows; operators inherit through their backing functions
(`strict-not-total-function.sql`, all four shapes witnessed). (6) The
aggregate dispatch read a non-null INITCOND as totality; `agginitval` is
the state BEFORE any transition and fixes the empty-input result only,
while `agg_nullify`'s transition and `agg_finalnull`'s FINALFUNC returned
NULL over non-empty input (measured). The rule is gone; `count_it` reads
nullable — the honest price of an unanalysable transition, paid across
four re-annotated fixtures with the @unwitnessable reason recorded
(`aggregate-initcond-not-total.sql` is the witness pair). (7) Six
`STRICT_TOTAL_BUILTINS` members failed the table's own admission
criterion, each measured: `array_position`, `substring` (by name — the
total positional form is indistinguishable; `substr` stays), `scale`,
`min_scale`, `to_number`, `to_char` (`builtin-totality-table.sql`, all
six witnessed per row). Dry-run against the generated corpus before
committing, per the report's caution: zero violations, zero
disagreements — the corpus's aggregate and function axes do not carry the
flipping shapes, so the churn stayed in the four hand fixtures.

Closed by the adversarial fix phase (2026-08-05), finding 15 / RC-8 — a
param-contract unsoundness: a window frame OFFSET is a rejection site the
analysis did not enumerate. PostgreSQL raises `frame starting/ending
offset must not be null` for a NULL bound — ROWS, RANGE and GROUPS, both
directions, and even over empty input (all measured) — while the register
pins the sibling placement, LIMIT/OFFSET, as taking NULL legally; the
engine had claimed the frame bound on that analogy. `collectParamFacts`
now treats a `WindowDef` startOffset/endOffset as rejecting: a direct
parameter via mechanism B (execution-time, existential — a subquery that
never runs never evaluates its frame, so no narrowing), an expression via
`rejectFlow`. Two AST spellings land: `FuncCall.over` is a concrete
struct field emitted UNWRAPPED, and named windows arrive wrapped in the
windowClause — the unwrapped one is why the first cut silently missed.
`param-window-frame-offset.sql` graduates with the raise witnessed, and
the param-soundness suite's null-rejection pattern learned the third
message. `docs/argument-nullability.md` records the site.

Closed by the adversarial fix phase (2026-08-05), finding 11 / RC-7's
unresolvable-relation half — the two halves landed together, as the report
prescribes, because the refusal alone would have turned every
partitioned-table query into an error. (a) The snapshot's capture set grew
to relkind 'p' and 'f' beside 'r' (partitions already arrive as 'r'), so
partitioned schemas are tracked at all — new tables appear in
`diffCatalogs`, and part_p's id reads notNull through the RC-3 tree
conjunction, since the `ONLY … SET NOT NULL` that opens the inheritance
hole is refused for partitioned tables (measured). Foreign tables ride
along by inspection — no FDW exists in this PGlite build to measure one.
(b) `addRangeVar`'s zero-column fallback became a REFUSAL
(`UnsupportedNodeError`, from-item): star expansion over the fallback was
measured silent in seven placements, and the walk doc's dispatch-site rule
has always said a FROM item must throw. Temp tables, `pg_catalog` and
`information_schema` now refuse rather than mislead — the caller's escape
is PREPARE plus all-nullable, as documented. The refusal immediately
exposed a latent miss it had been absorbing: INSERT…SELECT written-value
analysis walked its source with the STATEMENT's outer scope instead of the
DML scope carrying the WITH clause's CTEs, so `WITH w AS (…) INSERT …
FROM w` written maps silently resolved nothing; the source now chains
through the DML scope. `unresolvable-relation-shape.sql` pins the
partitioned shape (the generator seeds part_p/part_1 inside the partition
bound); the refusal trio is pinned in `unsupported-nodes.test.ts`.

Closed by the adversarial fix phase (2026-08-05), findings 12, 13, 14 /
RC-7's SRF-and-star third — three shape defects, all in the additive
direction (no existing claim moved). Multi-argument `unnest` (12) is a
special form expanding to one column PER ARRAY ARGUMENT, zip-style with
NULL padding, the same per-item rule inside ROWS FROM (measured); the
engine pushed one column total and handed WITH ORDINALITY's counter to the
previous position — `multi-arg-srf-shape.sql` pins it with both padding
and element-NULL witnesses. A column definition list (13) fully determines
a record-returning item's shape and now wins BEFORE catalog metadata,
whose `SETOF record` would resolve to one scalar column
(`coldeflist-shape.sql` for the builtin family, witnessed;
`coldeflist-user-record.sql` for the user function and the ordering).
`(expr).*` (14) is a target-list expansion in disguise: the FuncCall arm
expands the declared return type's fields with EVERY field forced
nullable — a NULL composite expands to a NULL in every field, domain
types included (measured) — while `(t).*` routes through ordinary star
expansion and keeps per-column precision (`composite-star-shape.sql`,
`composite-star-whole-row.sql`); an unresolvable composite REFUSES with
the new `composite-star` site rather than emitting a wrong list (pinned
in `unsupported-nodes.test.ts`).

Closed by the adversarial fix phase (2026-08-05), finding 2 / RC-2 — an
unsoundness removal: the write path was modelled as the statement text,
and PostgreSQL's rewrite stage sits between the two. The snapshot now
captures the hooks per relation and command (`WriteRewriteInfo`: BEFORE
ROW triggers, INSTEAD OF triggers, DO INSTEAD rules — tgtype bits and
ev_type encodings measured; diff-included, since CREATE TRIGGER changes
inference). The walk's response by hook, all measured: a BEFORE ROW
trigger may replace NEW wholesale, so the written-value map is void and
UPDATE's SET mask widens to every target column (the OLD-row evidence
transfer holds for no column); an INSTEAD OF trigger's NEW is reported
verbatim with the view definition never evaluated — even the literal view
column came back NULL — so the view analysis is void too and everything
drops to the view's all-false catalog flags; a DO INSTEAD rule replaces
the statement outright and RETURNING is REFUSED (`UnsupportedNodeError`,
in the scope builders so the traced walk shares it by construction; DO
ALSO keeps the original RETURNING and is not refused). DELETE proved
immune on the trigger side — a modified OLD is ignored for both forms and
the row is reported as read — so only the rule refusal applies there.
MERGE voids through its insert/update arms the same way. The parameter
contract's mechanism B gates on the same hooks (a trigger measured
rescuing a NULL binding, a rule measured redirecting one — both falsify
"a NULL binding raises"); mechanism A stands, typed at parse analysis and
rejected at Bind before any rewrite. Pins:
`trigger-rewrites-written-row.sql` (catalog flags survive, the written
map does not), `instead-of-trigger-view.sql` (all nullable, the trigger's
kept id recorded @unwitnessable), and the rule refusal quartet in
`unsupported-nodes.test.ts` (refused with RETURNING, empty without,
command-scoped, DO ALSO untouched). The cost falls only on relations that
actually carry such objects — the correct shape for it.

Closed by the adversarial fix phase (2026-08-05), finding 3 / RC-3 — an
unsoundness removal: `attnotnull` was read from the NAMED relation while
the query scans the relation SET. `ALTER TABLE ONLY parent … SET NOT NULL`
is legal (measured): parent attnotnull=true, child false, and a
child-stored NULL comes back through `FROM parent`. The snapshot now
computes `ColumnInfo.notNullTree` — the conjunction over the inheritance
subtree via pg_inherits, a descendant outside the captured namespaces
counting as unconstrained — and it is diff-included, since a child gaining
or losing the constraint changes what a tree scan of the parent may
conclude. The walk honours `RangeVar.inh` per entry (the parser emits
inh:true for a plain reference and omits it for ONLY — measured): tree
scans and UPDATE/DELETE/MERGE targets take the conjunction, `FROM ONLY`
and INSERT targets the relation's own flag (an INSERT stores its rows in
the named relation itself — measured; tuple routing is partitioned-only,
where the flags provably agree). Origin entailment's given-present gate
takes the conjunction unconditionally — origins carry no ONLY bit, and the
cost is precision on a `FROM ONLY parent` origin whose children diverge, a
shape nothing exercises. The CHECK path needed nothing: children carry
their own pg_constraint rows and cannot drop or invalidate them (measured,
recorded in the walk doc). `inherit-attnotnull-divergence.sql` pins the
tree scan witnessed by generated child rows;
`inherit-attnotnull-only-control.sql` pins that ONLY keeps the parent's
own flag.

Closed by the adversarial fix phase (2026-08-05), finding 10 / RC-7's MERGE
half — a shape defect that was simultaneously a notNull falsification:
MERGE's `RETURNING *` expands the SOURCE first, then the target (measured —
`UPDATE … FROM` and `DELETE … USING` are target-first and were already
right), while `buildMergeScope` pushed target-first. Same arity, permuted
order: the engine's `ck.name` written-value notNull landed on PostgreSQL's
`s.snote`, which is NULL — the walk doc's standing warning that arity is a
weak guard, made real, and the concrete argument for the consumer gate
comparing ORDER. The source's visible columns now go in ahead of the
target's; qualified stars resolve through `aliases` and were never
affected. `merge-returning-star-order.sql` pins the order under the
soundness suite's ordered name comparison, snote witnessed NULL on the
matched row.

Closed by the adversarial fix phase (2026-08-05), findings 8 and 9 / RC-6 —
unsoundness removals: the grouping-set NULLing override had two escapes.
Consumer side (finding 8), `mergedColumnNotNull` answered a USING/NATURAL
merged column from its constituents' intrinsic flags and never consulted
`groupingSetColumns` — a third resolution route bypassing the override the
two ordinary ColumnRef sites apply; it now checks the set first
(`grouping-set-merged-column.sql`, witnessed by the super-aggregate row).
Producer side (finding 9), `collectGroupingSetColumns` recorded only
ColumnRefs, while PostgreSQL accepts two more spellings for a term: an
output-column ORDINAL (`ROLLUP(1)` — an A_Const, nothing recorded) and an
output-column ALIAS (`ROLLUP(k)` — recorded "k" while the consumers ask
about "id"/"t.id"). Both now resolve against the target list and record
the selected entry's underlying refs; the alias spelling keeps its own
name key too, since PostgreSQL prefers an input column over an output
alias and the set only ever turns claims nullable — over-recording is the
conservative reading. `grouping-set-ordinal-alias.sql` and
`grouping-set-alias-spelling.sql` pin the spellings, each witnessed by the
grand-total row under every data state. Both fixes can only move claims
notNull→nullable, and no existing fixture flipped.

Closed by the adversarial fix phase (2026-08-04), finding 1 / RC-5 — an
unsoundness removal: unqualified predicate references resolved by NAME
alone. `columnMatches`'s single-part branch trusted its caller ("the caller
already knows this alias owns this column"), but `checkWhereGuarantee`
knows only that the alias owns a column of that NAME, not that the
reference RESOLVES there — and USING/NATURAL is the shape that separates
the two: the merged column is the only visible occurrence (which is what
keeps the query legal) while both constituents stay addressable, and a
LEFT JOIN's merged value is the LEFT side's, so `WHERE id IS NOT NULL`
said nothing about `u.id` yet overrode its OPTIONAL joinState. The branch
now resolves through `scope.visible` (as `rewriteRefsToOrigin` already
did) and requires the owning entry to BE the alias; a merged column owns
no entry and matches nothing, an ambiguous name matches nothing. Blast
radius as predicted: zero fixture flips — in every non-merged shape the
resolution agrees with the name. `using-merged-unqualified-guarantee.sql`
pins it, with u's unit NULL-extended together (`@null-group 1*,2*,3*`)
and both arms witnessed.

Closed by the adversarial fix phase (2026-08-04), finding 4 / RC-4 — the one
closure in this list that removed an UNSOUNDNESS rather than an imprecision:
bpchar literal distinctness. `character(n)` comparison strips trailing
blanks BEFORE the collation is consulted ('a'::char(4) = 'a ' is TRUE —
measured), so distinct tokens can name equal values, and the whitelist's
warrant — restated as "byte equality IS value equality for this type under
this collation" — never held for OID 1042; it is out of `TEXT_FAMILY_OIDS`.
The padding hazard sits in the OPERATOR, one level below the collation,
exactly where the citext exclusion already looked; bpchar's constraint
deparse at its own type (`k = 'a '::bpchar` — measured) is what carried it
past the literal-cast gate that stops varchar (whose CHECKs deparse through
`::text` casts and refuse cross-type — measured, and now pinned). Three
fixtures: the OR-CHECK shape and the multi-WHEN arm step, each witnessed by
the padding-admitted ('a', NULL) row the old derivation falsified
(`bpchar-literal-distinctness.sql`, `bpchar-distinctness-case-arm.sql`), and
the varchar control, where the tokens really are distinct, the row is
refused, and the cast gate keeps the claim conservative
(`bpchar-distinctness-varchar-control.sql`). The cost is precision on a type
where the judgment was never sound.

Closed by Wave 13 (2026-08-04): presence groups — the null-group model
exported as contract vocabulary, the output-side analogue of Wave 10's
joint rejection sets and the first wave DRIVEN by the consumer design
(`docs/consumer-design.md` chose factored unions over `sqlc.embed`).
`QueryContract.outputPresenceGroups` carries, per surviving optional unit,
the output columns NULL-extended together with the discriminants (NULL ⟺
absent) marked; the walk-doc section "Presence groups" is the rule list.
The machinery was already latent: membership keys on `RelationEntry.
nullGroup` by bare-reference producer recording in the four assembly loops
(SELECT + DML RETURNING, traced and untraced — parity by shared recording,
held by the parity suite); discriminants re-run the column computation
under a `presumePresent` flag that lifts only the entry's own gate, giving
them catalog, generated-expression, and CHECK-entailment precision — a
`count(*)` inside an optional aggregate subquery discriminates, and
`view-cte-correlated-multi-join`'s sum does so through CTE → view →
aggregate analysis. Refilters resolve with no new mechanism (the fixpoint
writes promotions back; lazy promotion surfaces as a notNull bare member
and kills the unit — extension is atomic); floors (≥2 members, ≥1
discriminant) keep the contract minimal; MERGE's optional source groups
fell out free (`merge-returning`). Verified at Wave 10's bar:
`@null-group N[*],M` annotations with compulsory bidirectional coverage —
which fired on its FIRST run, flagging six existing fixtures the engine
already claimed groups for — per-row falsification (discriminants agree;
absent ⇒ all members NULL) across the five data states, and a two-arm
witness whose absent-arm exemption is DERIVED from the discriminants' own
@unwitnessable annotations (`docs/witness-coverage.md`, "the two-arm
witness").

The wave's three launch residues all closed the SAME DAY (2026-08-04),
plus a batch of pins: RIGHT JOIN, LATERAL, grouped keys, HAVING-refilter,
DELETE USING, duplicate refs, and parameter-driven refilters each got a
fixture before any behavior changed. R3 (presumption) closed via a
presumed-entries set carried into the fresh walks a discriminant
computation spawns — `generated-left-join-gate` flipped to `1*,2*` as its
own annotation predicted. R1 (re-export) closed by storing groups
per-analysis and LIFTING them through bare projections at
subquery/CTE/view references, with the lifted dead rule (an outer-proven
member means the inner-absent arm is refiltered) — the missing-annotation
direction immediately surfaced the dashboard fixture's addresses-CTE unit
and `presence-group-nested-optional`'s predicted second group. R2
(setops) closed by branch agreement: UNION matches exact member sets and
intersects discriminants, INTERSECT/EXCEPT pass the left branch's groups
(the origins discipline) — and the generated corpus immediately earned
its keep: its two-arm bar exposed 67 INTERSECT groups whose absent arm
could never execute (INTERSECT strengthens flat claims from the right
branch — `left || right` — so an inner-joined right branch leaves no
all-NULL row to pair), now dropped by the setop-level dead rule
(`presence-group-intersect-refilter` pins it). The generated corpus runs
the per-row group oracle over every query with the two-arm witness bar
and a rule mechanism mirroring UNWITNESSABLE: **684 groups, 684 both
arms observed, 0 falsified, the rule list empty**. 29 `@null-group`
claims across 24 fixtures.

Found and fixed by the wave's closing audit: star expansion over
DUPLICATE inner column names (`SELECT s.* FROM (SELECT o.id, g.a AS id
…) s` — the one legal way to reach an ambiguous column; PostgreSQL
rejects every explicit reference) resolved inner columns by
FIRST-NAME-MATCH in three consumers, and all three misattributed: flat
nullability (pre-existing since subquery star support — g.a claimed
notNull from o.id's slot, execution-falsifiable), origins production
(pre-existing since Wave 8), and group lifting (new — a foreign column
pulled into a lifted group as a discriminant, falsified by the first
probe row). Fixed positionally: star expansion is the sole caller that
can reach the shape, so it now hands every consumer the column's ordinal
within its entry, recovered exactly in the unqualified branch by
occurrence counting (a USING merge cannot consume a duplicate-named
column, so the k-th visible occurrence IS the k-th inner one). Pinned six
ways — one per consumer × expansion branch: flat claims
(`dup-name-star-nullability.sql`), the lifted group over the alias-star
branch (`presence-group-dup-name-star.sql`), the occurrence-counting
unqualified-star branch (`dup-name-star-unqualified.sql`), the CTE entry
kind (`dup-name-star-cte.sql`), the ORIGINS face — a positionally-renamed
outer CTE makes the formerly-ambiguous column referenceable, and
first-name-match would have carried the WRONG rowPath into CHECK
entailment, falsified by sparse's in-flight/housed guest pair
(`check-origin-dup-name-star.sql`) — and occurrence exactness across a
USING merge with a nullability-distinguishable duplicate pair
(`dup-name-star-using.sql`). The strength-four stress rides on top: four
`id`s from four entries interleaved with unique names plus a second
independent duplicate, nullabilities alternating so any off-by-one flips
a visible claim, on both expansion branches (`dup-name-star-quad.sql`
unqualified/occurrence-counting, `dup-name-star-quad-cte.sql`
CTE/list-index) — the group there assembles from three positions, two of
them duplicate-named.

The GENERATOR WIDENING followed the closures the same day — four axes the
grammar could not previously produce (refilter wrappers pinning a
re-exported optional column; `union-full-var` with a real all-FULL second
branch; a `dup-names` projection star-re-exported; `gm` structures putting
generation-expression discriminants under the oracle), growing the corpus
~6.1k → ~9k queries and the group census 684 → 1490, all arms observed,
zero falsified (`docs/query-generator.md`, "The presence-group widening").
It earned its keep on arrival, twice. First: the CROSS-UNIT PRESENCE
IMPLICATION imprecision — pinning u.val proves t present when the two
share an extension unit, or when u's unit sits inside t's, but presence
proofs were same-rowPath only — CLOSED the same session: `RelationEntry`
now threads a `unitChain` (the ancestry of optional slices), origins carry
it out as depth-tagged crossings (`ColumnOrigin.units`), and a column
whose crossings COVER the goal's certifies presence through a
NUL-sentinel entry in the rename map that only the kernel's presence gate
can see (`presence-cross-unit-same.sql`, `presence-cross-unit-nested.sql`;
the GROUP_UNWITNESSABLE rule written for the shape went stale within the
session and the staleness assertion forced its removal — the discipline
working end to end). Second: the REQUIRED-ALTERNATIVE gap — a set
operation's flat notNull collapses over branches, so an INNER branch's
certainty must be recovered per-alternative; a required origin alternative
with catalog NOT NULL now succeeds outright in origin entailment. Two
rules briefly stood where closure looked refused or deferred — and BOTH
closed the next session, the first after the user correctly challenged
its "refused by design" framing: the all-or-nothing origins encoding (one
unattributable branch voids the column) was protecting the sibling
alignment invariant, not a semantic boundary. Origins now carry one SLOT
per set-operation branch — an unattributable branch contributes an
explicit NULL slot, alignment stays representable by construction, and
`originNotNull` records each branch's flat verdict so a literal branch
SETTLES its alternative without inventing provenance
(`presence-union-literal-branch.sql`). And the kernel-boundary gap closed
by asking the WALK the given-present question the kernel's atoms cannot:
`storedRowNotNull` evaluates a generated column's expression in a
synthetic single-table scope (catalog flags, nested generation, the
table's own CHECKs — every fact per-stored-row, so presence-sound) and
feeds the same kernel short-circuit the catalog flag uses; required
alternatives consume it too (`check-origin-generated-boundary.sql`). Both
rules were deleted with their closures — the corpus's rule list carries
nothing from the widening.

The three conservatisms that outlived the residue closures were then
closed the same day as well, alongside four more pins
(`presence-group-full-using` — the merged column's exclusion and both
sides' units under FULL USING; `presence-group-dml-cte` — the lift out
of a data-modifying CTE; `presence-group-distinct-on`;
`presence-group-rollup-keys` — plain optional keys grouping beside a
ROLLUP; the full-using draft's unwitnessable annotation was corrected by
the staleness check within one run — the generated state draws order ids
outside the customer set). PRESENCE CONSUMPTION: the kernel's presence
gate now short-circuits a catalog-NOT NULL goal — presence proven means
the emitted value is a stored value, and no stored value of the column
is NULL — so evidence pinning any same-rowPath sibling upgrades a
re-exported column with no CHECK involved, and a table with no CHECKs at
all benefits (`presence-group-reexport-refilter`'s carrier flipped as
its annotation prescribed). UNION SUBSET: branch groups now combine by
pairwise member INTERSECTION (a group's restriction to any subset is
sound within its branch), discriminants intersected, floors re-applied
(`presence-group-union-subset`). RECURSIVE GROUPS: a group assumption
iterates to fixpoint beside the flat one — seeded from the base branch,
consumed by the self-reference's lift, shrunk by branch agreement
(`presence-group-recursive`, whose recursion re-emits an inherited
absent arm). No group-specific conservatism remains recorded; new
entries come from whatever the consumer's corpora surface.

Closed by Wave 12 (2026-08): the four origin extensions, and with them
every `residue-origin-*.sql` fixture flipped in one run — the ritual's
largest firing. The representation grew from one origin to
`origins: ColumnOrigin[]`, index-correlated ALTERNATIVES: a UNION output
row comes from exactly one branch and the same branch as its siblings',
so co-derivation matches index by index and entailment proves EVERY
alternative (`check-origin-setop.sql`); INTERSECT/EXCEPT rows are
left-branch rows and pass the left list through. Promotion-at-distance:
OPTIONAL instances now produce origins MARKED optional, and consumption
demands an evidence-only presence proof — some same-rowPath column pinned
BEFORE the harvest fixpoint, whose facts presuppose the very presence
being established (`check-origin-promotion-at-distance.sql`; the unproven
side `check-origin-presence-unproven.sql`, witnessed by dense's guestless
extension). Group keys keep their origins — every row of a group shares
the key values, so sibling keys are same-row facts — while non-keys and
ROLLUP/CUBE-nulled columns refuse (`check-origin-group-keys.sql`). And
DML RETURNING produces origins outright: returned rows ARE stored rows,
NEW for INSERT/UPDATE and the deleted OLD for DELETE, all
CHECK-satisfying (`check-origin-dml-returning.sql`). Section 5's
executable target list is now EMPTY — the re-founding's "residues close
for free" criterion was instead met by the rule engine itself, wave by
wave, which is its own datum about how far the current architecture
carries.

Closed by Wave 11c (2026-08): comparison totality for NOT-taken guards,
under the PROPOSITIONAL CHARTER the user articulated and this entry
names: atoms are opaque tokens, the engine is complete over the Boolean
structure, and atom-level knowledge enters only through the measured
gates (token identity, same-token negator pairing, collation-gated
distinctness). A builtin total+strict comparison whose operands are a
catalog-NOT NULL column and a non-NULL literal cannot evaluate NULL, so a
CASE's ELSE certifies its FALSITY — and that FALSE fact meets a CHECK
written around the IDENTICAL token (`CASE WHEN qty > 0 …` over
`CHECK (qty > 0 OR discontinued_at IS NOT NULL)`;
`check-negative-guard-comparison.sql`). Nothing about the operator is
interpreted: branching on `qty > -20` proves nothing about the CHECK's
`qty > 0`, because crossing literals is order reasoning over VALUES — see
the Decided-against boundary below. The comparison-HARVEST counterpart
was pinned as a residue and the decision arrived the same day: a
comparison (or bare boolean column) whose every column the facts pin
cannot evaluate NULL, so the harvest promotes its notFALSE to TRUE — the
fixpoint supplying the ordering — and CHECK₁'s `seats > 1` now falsifies
CHECK₂'s same-token `seats <= 1` (`check-comparison-harvest.sql`, née
residue-comparison-harvest.sql: the residue ritual's second firing).

Closed by Wave 11b (2026-08): inter-CHECK chaining — and with it the
kernel's derivation restructured into the shape the semantic re-founding
(section 5) prescribes, in miniature. Per-goal CHECK derivation is gone;
in its place a FACT-HARVEST FIXPOINT: each round, every CHECK's notFALSE
spine is descended (AND splits, an OR whose other disjuncts are FALSE
passes to the survivor, a CASE to the arm the facts select) and every
total leaf reached — a NullTest of either polarity — becomes a TRUE fact,
available to every OTHER constraint's next round; generated-equality arm
exclusion re-runs in the same loop; all fact insertion is deduplicated so
convergence is a count and the round cap is insurance. The goal question
is asked once at the end: does the fact set pin the column? Pinned at
depth three by `check-chain-fixpoint.sql` (each chain3 constraint consumes
its predecessor's conclusion), the off-switch by `check-chain-idle.sql`,
and `check-simple-case.sql`'s opened_at @unwitnessable came off exactly as
the residue mechanism forces. Comparisons stay unharvested (notFALSE of a
strict comparison is TRUE-or-NULL; promoting one needs its operands
pinned first) — recorded, not built.

Closed by Wave 11 (2026-08): the five cheap kernel closures, re-graded
from "obscure" after the user correctly separated SQL-shape frequency from
scenario frequency — the schemas this feature targets are exactly where
the scenarios occur. (1) OR-facts store per-arm conjunct ATOM LISTS and
the subset rule matches by arm-implication (A∧B ⇒ A), so
`(status = 'arrived' AND id > 0) OR status = 'housed'` discharges the
CHECK's WHEN disjunction (`check-compound-disjunct.sql`). (2) CASE
implicants: covering every arm RESULT (implicit NULL ELSE included) forces
the expression whichever arm runs, so `CASE WHEN $1 IS NOT NULL THEN $1
ELSE $2 END` claims {1,2} like the COALESCE it is
(`param-joint-case.sql`) — and `…THEN $1 END` with no ELSE now claims a
flat notNull the CASE-opaque analysis missed. The empty implicant (a
literal NULL in every branch) is representable and skipped by rejectFlow
as the static always-raise it is. (3) Simple CASE desugars to its
implicit `arg = value` equality everywhere the kernel meets a CASE —
CHECKs and generated expressions alike (`check-simple-case.sql`, its ELSE
`check-simple-case-else.sql`). (4) NOT-taken TOTAL guards (NullTests
under AND/OR — falsityImpliesNotNull's rule, as a syntactic gate) enter
the kernel NOT-wrapped and become FALSE facts (`check-negative-guard.sql`).
(5) OR-facts trigger generated-CASE arm exclusion per arm-literal, joining
the arms' conditions as a derived OR-fact — `verdict IN
('fraud','no-fraud')` pins fraud_score by the intersection rule
(`check-or-arm-trigger.sql`). Found and pinned along the way:
inter-CHECK chaining does NOT happen — one constraint's conclusion is not
a fact for another's derivation (`check-simple-case.sql`'s opened_at
records it; closing would mean iterating derived facts to a fixpoint).
Measured en route: PostgreSQL's parameter-type deduction fails on a bare
`$1 IS NOT NULL` condition even when a later occurrence would type it.

Closed by Wave 10 (2026-08): joint rejection sets — the parameter
contract's last vocabulary gap. `COALESCE($1, $2)` into a NOT NULL column
rejects neither parameter alone but both together, a fact the flat
`ParamNullability[]` cannot say and a per-param type emission would
mis-promise. Mechanism-C's value-flow now computes minimal IMPLICANTS
(monotone sets over "$i is NULL": strict ops union, COALESCE cross-unions —
whose singleton projection is the old intersection, keeping the flat
contract bit-identical), rejectFlow files size-≥2 implicants as
`QueryContract.paramRejectionSets`, minimized with singleton absorption so
the trichotomy holds: unconditionally required / conditionally required
(the condition spelled by the sets) / unconstrained. CNF at the API
deliberately — the analysis's native form, per-fact verifiable, and the
factored type emission (flat types ∩ one local union per set) derives from
it directly, where a DNF cross-product would need re-factoring. Bounds
(≤ 4 params per implicant, ≤ 8 joint implicants, singletons exempt) are
recorded in `docs/argument-nullability.md`. Verified at the flat claims'
own bar: `@param-reject` annotations with compulsory bidirectional
coverage, members required to carry their nullable claims, and the
soundness suite observing the all-members-NULL raise
(`param-joint-coalesce.sql`; `param-joint-strict-fanout.sql` pins two sets
from one expression). The generated axis carries the same oracle two-sided:
insert-joint/update-joint shapes over NOT NULL targets produce sets the
harness must witness by their all-members-NULL raise, and every
all-NULL-admissible binding is asserted to never null-reject — the
falsification the flat contract could not even express (the previous
all-NULL run swallowed those errors). The witness bar proved itself on
this axis's FIRST run: the update-joint draft targeted a table no default
state populates, and the unwitnessable claim failed the suite until the
target moved to `u`. CASE-shaped joint facts are deferred, recorded.

Closed by Wave 9 (2026-08, measured first): collation-gated literal
distinctness, and the generated-column reverse entailment it unlocks. The
snapshot captures `collisdeterministic` per column (LEFT JOIN pg_collation
on attcollation; diff-included — a determinism flip changes what may be
concluded), and the kernel's new judgment holds two string tokens provably
DISTINCT only for builtin text-family columns (OID whitelist — citext's
case-folding lives in its operator and never qualifies; numerics never
qualify, 75 vs 75.0) under a proven-deterministic collation. Two consumers:
multi-WHEN CHECK CASEs, whose later arms need earlier conditions FALSE
(`check-multiwhen-second-arm.sql`; the numeric refusal
`check-multiwhen-numeric-negative.sql`); and GENERATED columns as EQUALITY
facts — `verdict = CASE …` holds exactly per stored row, so
TRUE(verdict = 'fraud') excludes every arm with a provably-distinct literal
result and the NULL ELSE, and a lone surviving arm's condition joins the
facts, letting `WHERE verdict = 'fraud'` pin `fraud_score` with no CHECK
constraint at all (`check-generated-arm-fraud.sql`; the two-arm ambiguity
`check-generated-arm-nullable.sql` stays nullable, witnessed). The kernel
gained a direct output path — facts pinning the goal column finish without
CHECK derivation — and both fact sources flow through origin tracking, so
the verdict filter narrows outside a CTE too. The collation gate's
counterexample is `check-distinctness-collation-gate.sql`: under real ICU,
WHERE tag = 'A' returns a stored 'a' row whose first arm was the TRUE one;
measured PGlite limitation — its ICU is catalog-only ('a' = 'A' is false),
so the fixture pins the refusal by annotation and the witness row is
recorded as unreachable. An ELSE-selected CASE still derives nothing (arms
fail on FALSE *or NULL* — 3VL), and or-fact triggers for arm exclusion are
deferred.

Closed by Wave 8 (2026-08): scope locality — origin tracking. A bare
pass-through output column now records its provenance (`ColumnOrigin` in
`src/query/types.ts`): base table plus a rowPath, the chain of
relation-instance ids with each CTE/subquery/view re-export prepending its
own reference instance. Row identity is the PATH — two references to one
memoized analysis share its inner ids, and only the per-reference prefix
keeps a self-join from co-deriving across different base rows
(`check-origin-self-join.sql`). The referencing scope's evidence is renamed
from outer names to base columns for same-rowPath siblings (the swap
fixture `check-origin-rename.sql` pins that names mean nothing, origins
everything) and runs the same kernel against the origin table's CHECKs,
under the referencing site's joinState gate
(`check-origin-left-join-gate.sql`). Origins are produced for REQUIRED
instances only and die at transforming expressions
(`check-origin-expression-death.sql`), USING/NATURAL merges, set
operations, grouping, VALUES, and DML RETURNING; DISTINCT preserves them.
Headline closures: filter-outside-CTE and filter-outside-view
(`check-origin-cte.sql`, `check-origin-view.sql`). Deferred with reasons
recorded: promotion-at-distance (outer evidence proving an OPTIONAL inner
instance present), group-key origins (sound, unbuilt), origins through set
operations and DML RETURNING.

Closed by Wave 7 (2026-08): the entailment kernel's own residue row, all
four sound-to-add items from Wave 6's closure. OR-facts with the subset
rule — TRUE(a ∨ b) names no arm but makes any superset disjunction TRUE, so
disjunctive evidence (OR, multi-element IN, `= ANY` array literals) now
discharges CHECK-side ORs/ANYs whose arm set covers it
(`check-or-subset.sql`, `check-or-verbatim.sql`, negative
`check-or-not-subset.sql`), and an OR-fact every arm of which strictly
involves a column pins that column non-null, mirroring the promotion
analyzer's intersection rule. The negator pairing runs both directions
(FALSE certifies the negation TRUE — a strict comparison that evaluated
FALSE had non-null operands; `check-negator-dual.sql`), with De Morgan over
NOT-wrapped ORs. Taken branch guards join the kernel's evidence
(`check-guard-entailment.sql`). And the SET mask became the row-consistency
channel model: every fact must hold on the row the derivation runs against
— WHERE facts are OLD-row, guard facts belong to the row the guarded
expression reads (NEW in RETURNING, OLD in SET expressions, distinguished
by the new dmlOldRowRead flag) — giving a NEW-row run (core masked, guards
free) and an OLD-row run (core free, guards masked, non-SET goals only,
old = returned). `check-update-set-mask.sql` now pins both channels in one
statement, its `room` @unwitnessable annotation retired as designed, and
`check-set-expr-old-read.sql` pins the SET-expression read context. Sound
wherever dmlSetColumns exists, because both its producers (UPDATE,
all-MATCHED MERGE) guarantee an OLD row per returned row; INSERT never
sets it. Found and fixed in passing: the TRACED walk had rebuilt DML
scopes by hand and drifted (no WHERE channel, no SET mask, no
written-value map), so `inferNullabilityTraced` could report a different
verdict than the engine and "explain" it — the scope builders are now
shared by construction (buildInsertScope/buildUpdateScope/buildDeleteScope,
buildMergeScope already was), and a parity test in
`nullability-walk-traced.test.ts` runs every fixture through both entry
points.

Closed by Wave 6 (2026-08, measured first): CHECK-constraint-aware
nullability — conditional nullability, the register's last precision item.
A validated table CHECK is a **notFALSE** fact per stored row (PostgreSQL
admits a row whose CHECK evaluates NULL — pinned in
`check-constraint-pins.test.ts` with the design consequence named), the
row-implied evidence list is TRUE per emitted row, and the kernel
(`src/query/check-entailment.ts`) derives `col IS NOT NULL` from the two by
syntactic 3VL entailment: identity over a closed deterministic fragment
(builtin comparisons by bare name, `IS [NOT] NULL`, desugared BETWEEN, bare
boolean columns; literal casts equate only at the column's own type — the
deparser writes `'housed'::text` where the WHERE has the bare token, and
matching across types is the citext hazard), builtin **negator pairing** in
place of the banned literal distinctness, AND/OR/NOT algebra, searched-CASE
arm selection, `= ANY (ARRAY[...])` as the OR it renders from, and totality
of IS NOT NULL. The generated-column gates are shared and pinned: joinState
(`check-left-join-gate.sql` / `check-left-join-promoted.sql`) and the SET
mask applied per evidence conjunct — entailment consumes evidence about
OTHER columns, and `check-update-set-mask.sql` would falsify the engine
without it. `convalidated=false` excludes NOT VALID and PG18 NOT ENFORCED
both (`check-not-valid.sql`, `check-not-enforced.sql` — the snapshot now
captures `validated`, diff-included deliberately: VALIDATE CONSTRAINT
changes inference); PG18 `contype='n'` NOT NULL rows, which
`mapConstraintType` folds into "check", are dropped by parsed node type.
The motivating pair is fixture-verbatim (`check-case-discriminator-*`),
plus implication-as-OR and the AND-concatenated split
(`check-implication-or.sql`, `check-and-concatenated.sql`). Decided without
building: the generated-axis check-conditional projection — the `guest`
generators exist (status-correlated NULL policies via `ctx.current`), a
projection would add oracle breadth over shapes the fixtures already pin;
recorded here, no silent cap.

Closed by the Wave-1 analyzer generalization (2026-08: strict-expression
closure, OR by intersection, the presence fixpoint over join quals, HAVING
as ungated evidence, and the DML WHERE channel with its SET-column mask —
see `docs/nullability-walk.md` "The presence fixpoint" and the boundary list
in `docs/argument-nullability.md`): `OR` in WHERE, branch guards beyond the
pattern list, strict quals over a NULL-extended side (including all 44 deep
structures and the `UPDATE … FROM` variant), and INNER `ON` / HAVING /
DML-WHERE narrowing. Each closure is pinned by a fixture
(`where-promotion-or`, `case-guard-strict-closure`, `join-refilter-promotion`,
`join-chain-fixpoint`, `join-on-promotion`, `having-narrowing`,
`dml-where-channel`, `update-set-mask`), and every generated-suite trap rule
those imprecisions carried went stale and was deleted, as designed.

Closed by Wave 5 (2026-08): generated-column reads — the generation
expression (pre-parsed from the snapshot, which now labels `attgenerated`
correctly: stored/virtual, not the identity pair it had borrowed) is walked
at the reading site with refs bound to the read entry, under the joinState
gate a NULL-extended row demands (`generated-left-join-gate.sql` is the
pinned counterexample); the stored row IS the read row, so WHERE promotion
and the written-value map compose into it for free (`generated-promotion`,
`generated-written`). And overloaded names, the sound half — arity
filtering (PostgreSQL never picks a candidate that cannot accept the call's
argument count) plus consensus over what remains (all-strict for the
closures and dispatch, all-NOT-NULL-domain returns, per-position domain
agreement for mechanism A; operators mirror it with strictness by consensus
and body dispatch only when single). Disagreeing candidates stay refused —
`over_fn` still pins that. `overload-consensus.sql`,
`param-overload-arity.sql`. Also pinned: every write reaching a GENERATED
ALWAYS column (stored or identity) fails at PREPARE — a rejected statement
has no contract, and the implicit column list does not skip generated
columns, which is what keeps the written-value map's positional prefix-zip
sound (`param-mechanism.test.ts`).

Closed by Wave 4 (2026-08, measured first throughout): USING/NATURAL join
quals (synthesized as the equality conjuncts they are and fed to the
presence fixpoint; `join-using-promotion.sql`); arm-aware MERGE — the
source is OPTIONAL only when a NOT MATCHED BY SOURCE arm exists (flipped
`param-merge`'s own unwitnessability note), the join condition is
row-implied when every arm is MATCHED-kind, and written values intersect
per-arm exactly like ON CONFLICT's paths (the `merge-returning-written`
trap fired and was acknowledged); `JSON_EXISTS` over a non-null context
(the ONE provable member of the path-query family — a found JSON null
defeats every handler for VALUE/QUERY, measured); builtin STRICTNESS
captured from pg_catalog itself (name-level bool_and over `proisstrict`,
replacing the curated set with the source of truth) plus a 23-entry
measured totality batch; and array SLICES (clamp, never NULL by range).

Closed by Wave 3 (2026-08): custom operators — the snapshot captures
`pg_operator`, strict-backed operators gate promotion/narrowing/attribution,
and results dispatch through the backing function's own rules (section 3
below; `custom-operator.sql`) — and DML RETURNING written values: INSERT
VALUES cells by intersection over rows, INSERT…SELECT via the source's own
analysis, UPDATE SET expressions (the NEW row is what RETURNING reports),
and ON CONFLICT DO UPDATE as the intersection of both producing paths
(`returning-insert.sql`, `returning-update.sql`, `returning-insert-select`,
`returning-conflict-both`, `returning-conflict-existing`). Written evidence
only ever upgrades — a nullable expression written into a rejecting column
raises rather than returning.

Closed by Wave 2 (2026-08, all behaviours measured first and pinned by
fixtures): ordered-set aggregates (`WITHIN GROUP` sort expressions now
visible, plain-aggregate gates; the hypothetical-set `rank` family measured
TOTAL — a position even over zero rows — hence notNull unconditionally;
`ordered-set-aggregates.sql`), the SQL/JSON value-list constructors and
`XMLELEMENT` (always produce a container; `JSON()`/`JSON_SCALAR`/
`JSON_SERIALIZE`/`XMLSERIALIZE` strict; `json-constructors.sql`), and window
aggregates over the default frame (never empty — the window analogue of the
non-empty-group gate; `window-default-frame.sql`, plus the generated
`a_wmin` column across the structural space).

| Construct | Current | Note |
|---|---|---|
| `A_Indirection` element / field / jsonb subscripts | nullable — correctly | measured: out-of-range elements and missing jsonb keys ARE NULL, and composite fields carry no constraints. SLICES are closed (Wave 4): they clamp rather than NULL, so a slice of a non-null array with non-null bounds is notNull (`array-slices.sql`) |
| `JSON_VALUE` / `JSON_QUERY`, `JSON_ARRAY(subquery)`, `XmlExpr` beyond `XMLELEMENT` | nullable — correctly, permanently | measured: a FOUND JSON null maps to SQL NULL through every ON EMPTY/ON ERROR handler combination, so no clause analysis can ever prove these; `JSON_ARRAY(SELECT …)` over an empty subquery is NULL; `xmlconcat`/`xmlforest` of NULLs are NULL. `JSON_EXISTS` is the one provable member and IS closed (Wave 4, `json-exists.sql`) |
| Non-strict scalar and `LANGUAGE plpgsql` functions | nullable | bodies are not statically analysable; the NOT NULL domain return is the escape hatch |
| `pg_catalog` built-ins outside the TOTALITY tables | nullable | STRICTNESS is no longer curated — the snapshot captures pg_catalog's `proisstrict` name-level (Wave 4). Totality has no catalog flag and cannot be proven by sampling (`array_length` of an empty array), so `STRICT_TOTAL_BUILTINS` / `ALWAYS_NOT_NULL_BUILTINS` stay docs-curated, each entry measured on admission |
| Custom operators backed by unanalysable functions | nullable results | the operator machinery is built (section 3); what remains conservative is the output side when the backing function is plpgsql or has multiple candidates — the same boundary those functions have when called directly |
| MERGE with mixed arm kinds | condition not row-implied | the join condition narrows and promotes only when EVERY arm is MATCHED-kind (Wave 4) — a NOT MATCHED arm fires precisely on the condition's failure, so mixed statements keep it dark. Per-arm condition reasoning was judged not worth it |
| CHECK entailment, conservative edges (post-Wave 11b) | nullable | parameters never match (identity needs the literal token — `WHERE status = $1` proves `status` non-null but selects no CHECK arm; permanent for a per-statement contract); and consumption of origins is gated as designed: an unfilterable OPTIONAL chain (`check-origin-presence-unproven.sql`) and a non-key grouped column each keep their columns dark. (An unattributable set-operation BRANCH no longer voids its column — it contributes a NULL slot whose alternative is settled by the branch's own flat verdict, the 2026-08-04 slot closure) |
| Presence groups | none recorded | every launch residue and post-launch conservatism closed 2026-08-04 (re-export propagation, setop groups, generation-expression discriminants, presence consumption of catalog notNull incl. cross-unit implication via unit chains, UNION subset matching, recursive-CTE groups — the Wave 13 closure entry is the history); future entries come from consumer corpora |
| Base-table alias column list | ignored — sound | adversarial section 5: `FROM t AS z(p, o, r, s)` renames positionally for subqueries, VALUES and table functions, not for a RangeVar. References through the new names fail to resolve (nullable), and `SELECT *` emits the CATALOG names where PostgreSQL emits the alias names — positionally correct flags, so diagnostic only, but the soundness suite's name comparison would flag a fixture using it, and the same code path already renames three other ways |
| NOT NULL domain column at a REQUIRED entry | nullable — sound | adversarial section 5: `attnotnull` stays false for a domain-constrained column, yet the domain rejects every write, so a required entry's value cannot be NULL. `isNotNullDomain` + `resolveColumnTypeOid` are both already in the catalog interface; closing would also admit such columns as natural presence-group discriminants |
| Boolean literals in CHECK expressions | not atoms — sound | adversarial section 5: `CHECK (false OR x IS NOT NULL)` is stored verbatim (measured — no constant folding), and the kernel does not read the `false` disjunct as FALSE, so the survivor never gets notFALSE. Squarely inside the propositional charter's atom gates; cheap to close if ever worth it |
| Generation expressions at origin-entailment boundaries | CLOSED 2026-08-04 | the closure candidate was built as prescribed: `storedRowNotNull` dispatches the generation expression through the walk in a synthetic single-table scope and feeds the kernel's given-present short-circuit; the rule that pinned the witness consequence went stale and was deleted (`check-origin-generated-boundary.sql` is the pin) |

---

## 3. Custom operator support — built (Wave 3)

**What landed.** The snapshot captures `pg_operator` (name, operand types,
backing function, and the function's `proisstrict`), and the adapter resolves
operators by the proven single-candidate policy: one user operator with that
name (schema-qualified references narrow the search), or refuse. Builtin
names keep the curated `TOTAL_STRICT_OPERATORS` set, matched on BARE names
only — the documented shadowing blind spot, unchanged.

Consumers: the WHERE-side gate (`promotionOperatorIsStrict`) and both strict
closures accept a resolved operator whose backing function is declared
strict — strictness is exactly the property those conclusions need, and
totality is deliberately NOT inferred from it. Output-side, a custom
operator's result dispatches its backing function through the full FuncCall
machinery (NOT NULL domain returns, `LANGUAGE sql` body inlining), which is
how the fixture's non-strict `===` — kept from the promotion-unsoundness
fix — now analyses to notNull via its `SELECT true` body while still
promoting nothing. `custom-operator.sql` pins both directions with the
strict `====` / non-strict `===` pair.

**Residue.** Operators backed by unanalysable functions (plpgsql, multiple
candidates) stay conservatively nullable on the output side; the shadowing
blind spot stands.

---

## 4. Unbuilt verification strategies

One of the five strategies proposed for finding engine defects remains
unbuilt, and after assessing the candidates it is **demoted, not queued**.
(Generated queries, formerly listed alongside it, are built — see
`docs/query-generator.md` and `tests/unit/query/generated/`.)

**Differential oracle — assessed 2026-08, both candidates read in full.**

*postgres-language-server*: no comparable surface at all. It never derives a
query's output column list, contains zero code inspecting join types, and its
"type checking" hands the SQL to a live PostgreSQL via PREPARE — the same
oracle this project already uses directly. Nothing to disagree with. The
reading did produce salvage for pgsid's own language-server surface —
`docs/postgres-language-server-notes.md` records it (dual-parser
architecture for incomplete SQL, statement splitting, the productionized
PREPARE harness, error-cursor mapping).

*sqlc*: closer than expected — its PostgreSQL engine parses with libpg_query
like ours, and `internal/compiler/output_columns.go` is genuinely join-aware
(LEFT/RIGHT/FULL demotion with alias-correct matching, CTE plumbing), with
`sqlc analyze` emitting per-column/per-param `not_null` JSON, no database
needed. But it is unsound in BOTH directions — every resolvable function
including `sum`/`max` is NOT NULL (`ReturnTypeNullable` never populated for
PG), scalar subqueries inherit the inner column's NOT NULL, nested join trees
drop the outer requiredness, UNION takes the left arm only — while having no
WHERE promotion at all, so it cannot serve even as a one-sided bound. Its
parameter `not_null` is also a different *definition* than ours (ergonomic
"which column is it compared to", close to the deadness lint this project
rejected), so param comparison is a category error. A differential run is
informative only in a narrow band (left-deep joins over base tables, no
aggregates, no set ops, no scalar subqueries) where our claims are already
execution-verified with witnesses.

**Trigger, narrowed:** none foreseeable for finding OUR defects. The inverse
is real: our corpus provably exercises sqlc's enumerated holes, so running
`sqlc analyze` over the fixtures would mostly find bugs in *sqlc* — a
possible upstream contribution someday, not verification of this engine.

---

## 5. Semantic re-founding — standing TODO, parallel-track

**What.** Re-found the engine on a semantic core instead of the grown rule
system: lower the parsed AST once into a small relational IR (~10
operators — Scan/Filter/Project/Join/Union/Aggregate/Values/DML — with
predicates in one normalized 3VL language), model a relation as a set of
rows carrying a REFINEMENT (its invariant), and let operators transform
refinements compositionally. Scan emits the catalog's notNull facts,
validated CHECKs as notFALSE, and generated columns as equalities — one
uniform refinement where today those are separate code paths; Filter ADDS
TRUE facts (WHERE promotion, implied quals, HAVING, and branch guards all
become the same operation at different sites); Join contributes presence
(joinState derived from the operator instead of hand-threaded); column
nullability becomes the single question "does the row refinement entail
col IS NOT NULL?" — the entailment kernel promoted from leaf-level
consultation to THE engine. Origin tracking becomes provenance proper
(the semiring formulation — rowPath is hand-rolled why-provenance), under
which the origin extensions that are architecturally heavy today compose
naturally.

**Why believe it.** The diagnosis: most of the current rule surface is
AST-shape normalization (accidental — collapses into the lowering, once),
a smaller part is measured PostgreSQL facts (irreducible — they become
the model's axioms, and the pins already are that), and the actual
inference is ALREADY the abstract thing (the kernel is a small sound
proof system; the waves added fact sources, not special cases). The tell:
features hard here but natural in the cleaner model — origins through
UNION, promotion-at-distance — mean the architecture is fighting its
representation.

**Method — why this is low-risk for THIS project.** Not a rewrite. The
current engine stays as is; the prototype is a PARALLEL implementation
differential-tested against it AND the execution oracle over the same
corpus — the fixtures, witness discipline, and generated axes are
representation-independent, so parity is a number that goes up and the
prototype cannot drift silently. Cut over only at full parity; the
cut-over test of whether the abstraction earned its keep is that the
residue fixtures below flip from recorded imprecision to claims — if they
don't fall out, the model was wrong and we lost a prototype, not the
engine. The `QueryContract` boundary means the consumer never notices.

**What it must not change.** The measured-pin culture (PostgreSQL is not
its spec; axioms come from PGlite), the contract surface, and the
witness invariant.

**Executable target list.** The mechanism: known-imprecision residue
fixtures (`residue-*.sql`, `@nullable` + `@unwitnessable` with the
residue named) pin conservative answers, and any engine that starts
narrowing one fails the annotation suite in the "you improved — update
the claims" direction. The list EMPTIED on 2026-08: Waves 11b–12 closed
every entry inside the rule engine (the ritual fired six times — see the
Wave 11b/11c/12 closures), so the re-founding's payoff argument now
rests on uniformity and maintainability rather than pending precision;
new entries come from consumer corpora.

## Decided against — do not re-open without new information

**Value tracking for nullability (the “CASE value-dependence” rung
ladder).** Knowing that `CASE WHEN active THEN 'a' ELSE name END` never
takes its ELSE because `active` was written `true` requires tracking the
VALUE, not the nullability — and the rungs above it (NOT of a tracked
boolean, equality over tracked text, comparisons over tracked numbers,
values computed from bindings) each look equally reasonable until the
engine contains a constant evaluator for PostgreSQL expressions that must
match PostgreSQL exactly or produce unsound claims: the FigureColname trap,
larger, and unsound rather than cosmetic when it drifts. Ruled out
entirely, no rung implemented (2026-08). The generated
`dml-returning-case-value-dependence` rule records the shape that motivated
it.

Boundary clarified by Wave 11c (2026-08): cross-literal ORDER reasoning
is a rung of this ladder and stays out. Concluding FALSE(`qty > 0`) from
FALSE(`qty > -20`) requires knowing -20 < 0 as a VALUE — a linear-order
theory over numeric literals, with every coercion and float/numeric edge
the evaluator ban exists to avoid. The kernel stays propositional: the
Boolean algebra is implemented completely, atoms meet only by token
identity, same-token negators, and the collation-gated distinctness. In
the semantic re-founding this line is a MODULE boundary — an
atom-entailment oracle interface whose current implementation is exactly
those three gates; an order-theory oracle could plug in behind it without
touching the Boolean layer, if this entry is ever reopened with the new
information it demands.

Boundary clarified by Wave 9 (2026-08): collation-gated literal
DISTINCTNESS is not a rung of this ladder and its admission does not
re-open it. The ruling bans an EVALUATOR — computing what expressions
produce. Distinctness compares two literal TOKENS already present in the
SQL, concludes only "unequal values", and only where the catalog proves the
conclusion sound (builtin text-family column, `collisdeterministic` — the
new information the ban's collation hazard asked for; captured per column
in the snapshot). Numerics stay banned precisely because token inequality
there WOULD require evaluation to decide.

**Reproducing PostgreSQL's column-naming rules (`FigureColname`).** PostgreSQL
labels an un-aliased output column by a set of rules in
`src/backend/parser/parse_target.c` — `count(*)` becomes `count`, `1+1` becomes
`?column?`, `p.price::text` becomes `price`, and the rules carry precedence, so
a nested strong name overrides a weak default. The engine implements almost none
of this and reports an empty name for such expressions.

It should stay that way. Names are not the contract and cannot be: they are not
unique — `SELECT a.id, b.id` yields two columns called `id` — so a consumer must
join nullability to columns by position. That consumer also runs `PREPARE` for
types, and `RowDescription` hands it the authoritative names for free. Porting
the rules would mean maintaining a version-drifting reimplementation of
PostgreSQL internals to produce something the consumer already has.

What the engine's best-effort names *are* good for is catching a wrong column
list in the tests. The soundness suite compares the full ordered name list
against PostgreSQL's for every fixture, which catches a misordering that a
column *count* would not — PostgreSQL emits a `USING` join's merged column
first, not in its left-hand position. If an un-aliased expression ever makes
that comparison fail, the cheap fix is usually to alias it in the fixture; the
failure message names the exact rule that would be needed if not.

**Mutating existing queries as a way to generate new ones.** Considered as an
alternative to constructing queries and rejected. Transformations beyond blind
wrapping need the same scope and type knowledge that construction needs, so
mutation buys no validity for free — and it is bounded by the shapes the corpus
already contains, which is the opposite of what a generator is for. See
`docs/query-generator.md`.

**A diagnostics channel for ambiguous references.** An unqualified name
matching several visible columns resolves to nullable, with the candidates
recorded in the trace. A dedicated reporting channel was considered and
rejected: PostgreSQL rejects such queries at parse-analysis time, so any
consumer running `PREPARE` receives a precise error from PostgreSQL itself,
which is better than anything the walk would emit.

**Name-based joining of nullability to `RowDescription`.** Considered as an
alternative to positional joining and rejected. Column names are not unique —
`SELECT a.id, b.id` yields two columns named `id` — so a name join cannot
distinguish them and must either pick one (wrong) or degrade both to nullable
(lossy, on ordinary queries). Position disambiguates exactly what names cannot.
See "Arity gate at the consumer boundary" for the guard that makes positional
joining safe.
