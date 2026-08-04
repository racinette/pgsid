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

## 1. Arity gate at the consumer boundary

**What.** Nullability is a positional array meant to be zipped against
PostgreSQL's `RowDescription` — the contract is documented on
`OutputNullability` in `src/query/types.ts`. Nothing enforces that the two
lists agree in length before they are zipped.

**Why it matters.** A length mismatch misassigns every flag past the point of
divergence, and does so while looking authoritative. The check is a single
comparison, and the consumer necessarily holds both lists: it runs `PREPARE`
for types anyway. On mismatch the safe response is to treat every column as
nullable and report loudly.

**State.** Not written, because there is no consumer: nothing under `src/`
calls `inferNullability` yet. The engine cannot self-verify — it has no
PostgreSQL.

**Trigger.** Write it together with the first consumer, not retrofitted
afterwards. Scheduled: the emitter slice (`docs/consumer-design.md`).

---

## 2. Known imprecisions in the walk

Each of these is *sound* — the engine reports nullable where a value is
provably non-null. They cost precision, never correctness, and are listed so
that a decision to close one is deliberate.

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
