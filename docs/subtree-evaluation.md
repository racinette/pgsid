# Subtree evaluation (chartered 2026-08-11; EVALUATOR CORE BUILT 2026-08-11; TYPED OPERAND TRACKING, STATEMENT MAP and CHECK GROUNDER BUILT 2026-08-12; entailment stays the recorded later)

Evaluate closed subtrees of expressions through PostgreSQL and hand the
answers to the engine as data. One evaluator, two consumers now, one
recorded later. Grew out of the Mechanism E charter
(`docs/argument-nullability.md`) when the same capability turned out to
serve the output side; that section remains the CHECK-channel consumer's
design.

The acceptance tests exist before the code: the RED SUITE,
`tests/unit/query/subtree-evaluation-red.test.ts`. Every target in it was
adjudicated against PostgreSQL before it was written down (outputs
executed, params bound); each `it.fails` case flips to a plain `it` in the
commit that lands its consumer, and its boundary guards must never flip.

## The evaluator

A subtree is CLOSED when an ALLOWLIST proves it so: constants, boolean
logic, null tests, `A_Expr`/`FuncCall` whose resolved function is
immutable, casts whose type input function is immutable, CASE, COALESCE,
MinMax, Row/Array constructors over closed members. Everything else —
`ColumnRef`, `ParamRef`, `SubLink`, `SQLValueFunction`, any node kind the
list has not met — is OPEN. Open-by-default is what makes the evaluator
scope-blind: it never resolves a name, it only detects one, so joins,
aliases, correlation and LATERAL are all somebody else's problem by
construction.

Two measured gates the allowlist must carry:

- Volatility covers CASTS, not just calls: `date_in` and `timestamptz_in`
  are STABLE (measured 2026-08-11 — `'now'::timestamptz` differs across two
  evaluations a second apart), so a literal cast is closed only when the
  type's input function is immutable. `int4in`, `textin`, `numeric_in` are
  immutable; `5::integer` folds, `'now'::timestamptz` never does.
- A STABLE function body's analysis-time answer does not bind enforcement
  (pinned in `param-mechanism.test.ts`, "Mechanism E" section).

Evaluation batches the MAXIMAL closed subtrees — topmost closed nodes,
disjoint by construction — into one `SELECT` per statement, via PREPARE.
`pg_prepared_statements.result_types` (measured present, PG 18.3) returns
each subtree's resolved type in the same round trip, so:

    EvalResult = { isNull: boolean, value: unknown, type: string }

An evaluator error (a closed subtree can itself raise — `5 / 0`) makes that
subtree contribute nothing.

The `evaluate` callback is the narrowest thing that works — run one SELECT,
return its single row: `async sql => (await pg.query(sql)).rows[0]` for
PGlite, same one-liner for node-postgres. `src/query` imports no database
type. When built, the contract/walk entry points become async with
`evaluate` optional beside `paramTypes`; the engine internals stay sync and
consume ANSWERS as data. No evaluator → no evaluation claims, everything
else identical.

### As built (2026-08-11) — the measured shape of the gates

`src/query/subtree-evaluator.ts` (`collectClosedSubtrees`,
`evaluateClosedSubtrees`), fed by the `SubtreeEvaluationCatalog` face on
the adapter and three environment captures on the snapshot. Building it
measured four things the charter prose above does not say, and each is now
a gate:

- Volatility of the CALL is not the closure question — the TYPES are. A
  stable INPUT function makes even an immutable call session-dependent
  (`date_part('day', '1/2/2020'::date)` is 2 under MDY and 1 under DMY,
  pinned), and a stable OUTPUT function leaks through I/O coercions
  (`to_timestamp(0)::text` moves with TimeZone while both halves look
  clean). So one set governs everything: pg_catalog types with immutable
  typinput AND typoutput (48 in PG 18.3; no datetime, money, xml, array,
  record, domain or enum). Casts close on LITERAL arguments only; calls
  and operators need every reachable signature immutable over that set.
- The function gate is keyed `(name, arity)`: `length` is immutable at one
  argument and STABLE at two (`length(bytea, name)`).
- A signature is exempt from the verdict only when UNREACHABLE from a
  closed tree: a concrete non-array operand type outside the set (nothing
  closed produces one, and unknown-literal resolution cannot cross type
  categories silently), or a range-family polymorphic (no range type has
  immutable I/O; unknown cannot instantiate one — both measured). That is
  how `=` keeps its verdict beside the stable `date = timestamptz` row and
  `+`/`-` beside `anyrange` rows, while `||` stays open whole:
  `textanycat(text, anynonarray)` is stable and genuinely reachable, so
  even `'a' || 'b'` refuses.
- Three syntactic guards close the cracks types cannot see: a bare unknown
  literal beside an array/row constructor in any type-unifying position
  (`ARRAY[1,2] = '{1,3}'` answers through array_in, provolatile 's'), a
  bare unknown as a unary operand or as the ANY/ALL array side, and
  BETWEEN/SIMILAR (their A_Expr carries no operator name to gate on). A
  user object of a gated name — function, operator, or type, relation
  rowtypes included — opens the builtin spelling, schema-blind.

Bare literals are never collected as roots (their answer restates the
AST); they stay closed as members. Protocol per statement: one PREPARE
fixes the batch's types, one SELECT returns every value beside
`result_types::text[]`, a raising batch retries each subtree in its own
SELECT so only the raising ones contribute nothing, DEALLOCATE ends it.
The pins: allowlist census, gates and protocol in
`subtree-evaluator.test.ts`; the PostgreSQL facts (I/O volatilities, the
DateStyle demonstration, the result_types round trip, the raise-after-
PREPARE split) beside the Mechanism E pins in `param-mechanism.test.ts`.

The name-level gates and the three syntactic guards this section
describes were the mechanism until typed operand tracking (below)
replaced them with per-signature survivors and the general landing rule;
the measured facts stand, and the guard pins stayed green through the
replacement.

### Typed operand tracking (chartered 2026-08-12, BUILT 2026-08-12)

Ruled 2026-08-12: correctness carries its own weight — no instrument
conviction required. The name-level gates above answer a universally
quantified question ("is EVERY signature under this name immutable, over
every operand type a closed tree can produce?"), which cannot split a
name into its signatures: one stable row opens `||` whole, and even
`'a' || 'b'` — deterministically `textcat`, immutable — pays for
`textanycat`. The rung replaces the name-level gate with a
survivor-level one. Four pieces:

1. A scope-free twin of the walk's `operandTypeSet` over the CLOSED
   grammar (no columns, no params — the scope entanglement that keeps the
   original inside the walk does not apply). Type sets thread bottom-up
   as unions, exactly as the walk already does.
2. `unknown` as a first-class member of the type model — today both the
   walk and this rung's precedent collapse it into null ("constrains
   nothing"), which is sound and discards PostgreSQL's landing rules.
   The gate applies those rules (all-unknown → text; one known operand
   types the other side; a declared parameter or target types the
   literal; polymorphic and cross-category dead ends RAISE) before
   elimination; the rules are pinned in `param-mechanism.test.ts`.
   The landing itself runs the landed type's INPUT function, so the
   immutable-I/O set gates every landing — which turns the syntactic
   guards above (constructor-beside-unknown, unary-over-unknown, the
   ANY/ALL array side) into derived consequences of one rule. Their pins
   stay as transition guards: green before, during and after.
3. Per-signature volatility captures over ALL of pg_catalog — the
   existing signature captures cover the curated claim-table names and
   carry `strict` but not `provolatile`.
4. Elimination that may OVER-KEEP candidates but never over-drop
   (`mayCoerceImplicitly` and the canonicalisation images are reusable
   as-is): verdict is consensus — every survivor immutable, every
   landing and result type immutable-I/O. Over-keeping only keeps a
   name open, which is today's answer; this is what makes the rung
   sound without replicating PostgreSQL's resolution exactly, and why
   it does not re-enter the value-tracking ban's premise.

The gate this yields is a WHITELIST, and a MECHANICAL one — that is the
implementation-shaping consequence of the deferral below. Everything
admitting an expression is computed from pg_type/pg_proc flags (the
immutable-I/O set, per-signature provolatile) plus rule tables pinned
as tests (the landing rules, the range-family exemption): no list in
this rung requires a human judgment about an individual function. The
known settings-dependent edge cases need no handling AT ALL here —
datetime literals fail on date_in's flag, `'now'` needs no special-case
because its whole type family is already outside the set, GUC-stable
signatures fail on their own flag. Hand-curated lists (a why-stable
table splitting GUC-stable from clock-stable, the clock-reading special
strings) become necessary exactly and only when the deferred expansion
is picked up — which is what made it deferrable without a placeholder.

The acceptance frame is IN PLACE (2026-08-12, every value adjudicated):
"RED: typed operand tracking" in `subtree-evaluator.test.ts` — four
`it.fails` targets (`'a' || 'b'` → 'ab'; `upper('a') || 'b'` → 'Ab',
today only the inner call folds; chained `||`; BETWEEN through its
bound comparisons) that flip in the commit that lands the gate — and
three guards no refinement may ever fold: `'a' || 5` (textanycat,
stable), `'at: ' || to_timestamp(0)` (measured moving with TimeZone),
and `text @@ text`, whose all-unknown landing IS the stable row
(ts_match_tt reads default_text_search_config) — the shape that proves
signature-splitting has a floor. Orthogonal to the consumer rollout
below: the rung only widens what folds, so it may land before or after
any consumer.

#### As built (2026-08-12)

Landed in three batches: the captures
(`builtinFunctionVolatilities` / `builtinOperatorVolatilities` — every
pg_catalog f/a/w signature and operator row, 3,402 + 799, plus
`provolatile` on the implicit-cast edges), the survivor gate on the
catalog face (`closedOperatorTypes`, `closedFunctionTypes`,
`closedCommonTypes`, `closedCastTargetType`, `isImmutableIoRendering`),
and the evaluator's typed pass replacing the name-level and syntactic
gates. The four red targets flipped in the gate's commit, the guards and
every transition pin held. Building it measured four things the charter
prose above does not say:

- Five implicit-cast edges carry a STABLE cast function (text/varchar →
  regclass, date/time/timestamp → their tz forms), so the verdict checks
  COERCION ROUTES too: a known operand's implicit route to each
  survivor's parameter must be binary-coercible or immutable. This is
  what keeps a text operand from reaching a regclass parameter through
  search_path.
- "Every landing and result type immutable-I/O" splits at the root:
  composition crosses no I/O (`make_date(…)` closes and composes under
  `date_part`), but a COLLECTED root's value crosses typoutput — so
  roots additionally need immutable-I/O RENDERINGS, arrays by element,
  row constructors by their fields. `date_out` reading DateStyle is the
  counterexample that forces the split.
- Survivor result types stay base-kind (`pg_type.typtype = 'b'`): a
  concrete range constructor (`int4range(1, 3)` is immutable over
  integers) would otherwise close, hand a range operand to a parent, and
  break the range-family exemption's premise.
- "A declared parameter types the literal", mechanised: a LONE candidate
  exact at every known singleton position is PostgreSQL's own
  most-exact-matches selection — terminal by its documented resolution —
  and the verdict quantifies over it alone. A plainly-spelled aggregate
  (`max(1)`) refuses at the VERDICT on its rows' prokind, never by
  dropping a row PostgreSQL would pick.

**The datetime re-measurement (2026-08-12, the deferral's revisit
trigger).** Under per-signature gates the name-poisoning that made the
naive expansion strictly worse is gone by construction, and the rung
already serves 204 immutable function signatures and 77 immutable
operator rows touching the datetime family with NO settings assumption —
they compose wherever immutable constructors produce the operands. The
residue that still needs a settings contract: all six family INPUT
functions are stable and four of six outputs (time and timetz render
immutably), so literal admission and root rendering both wait on the
init-script pin; and 90 stable function signatures + 27 stable operator
rows would need the why-stable curated table — `date_part`,
`date_trunc`, `extract` and the date↔timestamptz comparison family are
GUC-stable, while `now`, `statement_timestamp` and six more zero-arg
clock returners type exactly like them. The decision — for or against —
stays open, with those counts as its cost table.

**The dependence model, corrected (2026-08-12).** `provolatile`
conflates two dependences: SESSION state (GUCs, clock, locale,
search_path) and CATALOG state (a domain's constraints, an enum's
values, name→OID maps). PostgreSQL's flags must quantify over both —
they answer for any future catalog. This engine's claims do not: they
are conditioned on the analyzed snapshot, and catalog change is the
system's re-analysis trigger, not a soundness hazard — migrations
rebuild the snapshot, contracts recompute, dependency extraction
rechecks what a changed object touched. The evaluator's real boundary
is session state alone. The exclusions above, re-sorted under that
light:

- PRINCIPLED (session-state): the datetime/money/xml I/O boundaries,
  GUC-stable signatures, the clock strings, `regclass` and friends
  (search_path is session state), every VOLATILE row.
- FIRST-WAVE SCOPE, foldable under the snapshot contract — the
  widening rides this rung, by the same name-consensus shape as the
  collision rule, so scope-blindness holds (NOT TAKEN with the core,
  2026-08-12: the gate landed alone; these ride a later batch):
  - domains over immutable-I/O bases, with each CHECK expression gated
    through THIS closure gate recursively (the snapshot carries them
    parsed);
  - enums — values and sort order are snapshot-pinned, and their
    comparison operators are immutable by PostgreSQL's own book;
  - array literals over immutable-I/O element types — `array_in`'s
    blanket-stable flag means "elements could be datetime", a question
    the element gate answers better than the flag does.

**Stated assumptions, recorded rather than gated (2026-08-12).**

- `float8out` and `byteaout` are declared IMMUTABLE although rendering
  knobs (extra_float_digits, bytea_output) move their text form.
  Trusted per the answer-key principle — and independently, every
  route where a rendered form could re-enter a computation is closed:
  literal-only casts, the stable concatenation exclusions, and the
  consumption rule (only `isNull` and boolean truth are read from the
  map).
- Text-comparison folds are pinned to the analyzed database's DEFAULT
  COLLATION: `'a' < 'B'` answers oppositely under C and ICU en_US, and
  PostgreSQL's "immutable" is per-database — a database's collation
  cannot change under it. This extends the engine's standing
  analysis-database ≡ execution-database assumption from schema to
  collation. No gate; recorded.

**Deferred (2026-08-12): settings-pinned datetime expansion.** Not
rejected — the ruling was: build the simpler rung first, omit the edge
cases that need a config contract, return to this once the main
machinery is done. The proposal — pin DateStyle/IntervalStyle/TimeZone
via an init-script contract and admit the datetime family into the
immutable-I/O set — was measured now (PG 18.3) so the later decision
starts from facts, and in its naive form it is strictly worse under the
NAME-level gates:
admitting the types makes datetime operands REACHABLE, which wakes the
STABLE cross-type rows sleeping under the common operator names
(`date = timestamptz`, `timestamptz + interval` — stable through
TimeZone), and the name-consensus then kills `= <> < <= > >= + -`
wholesale: operator names 71 → 63, four red-suite flip targets lost,
none gained. The function side gains 158 (name, arity) pairs of which
nearly all are internal spellings (`date_eq`, `timestamp_send`,
hashes); `date_part` itself does NOT return — its stable
`(text, timestamptz)` row shares name AND arity with the immutable
`(text, date)` row, so only per-signature typing can split them. Three
blockers stand even past the cascade: pg_proc records THAT a row is
stable, not WHY — splitting GUC-stable from clock-stable (`now()` types
like the admissible rows and must never fold) takes a curated table;
the datetime INPUT functions read the clock through special strings
(`'now'`, `'today'`), so pinned settings do not make them
deterministic; and an init-script promise is unverifiable at analysis
time. The sound part comes free from THIS rung instead: per-signature
survivors fold `date_part('day', make_date(2020, 1, 1))` and
`make_date(…) = make_date(…)` with no settings assumption — operand
types eliminate the stable rows rather than name-poisoning. REVISIT
TRIGGER: after this rung lands, re-run the expansion measurement; the
residue still needing a settings assumption (datetime literals via
`date_in`, rendering via `date_out`, the genuinely GUC-stable
signatures) will then be small and enumerable, and that is the moment
to decide — for or against — with the curated-table and init-script
costs on the table. (RAN 2026-08-12 — the residue is in "As built"
above; the decision remains open.)

## Consumer 1 — the statement map

`Map<Node, EvalResult>` keyed by NODE IDENTITY over the statement's own
AST. The walk consults the map before descending: a hit answers the whole
subtree, a guard hit prunes arms. Verified 2026-08-11: the walk never
clones statement nodes (its two `structuredClone` sites qualify CATALOG
expressions), so identity holds; if it ever breaks, a missed key degrades
to today's symbolic answer — sound, never wrong.

- MAP, NOT REWRITE. A pruned arm is dead only for execution: a parameter
  in a false-guarded arm is still TYPED at Bind (pinned —
  `param-mechanism.test.ts`, "cast under a false CASE guard"). The output
  walk prunes an arm's nullability; the param collector keeps its typing
  sites; a rewritten tree could not serve both.
- CONSUMPTION RULE: the walk reads `isNull` and boolean truth from the
  map — never values carried into typed contexts. Values crossing into a
  typed comparison is blank-padding territory (`bp`), and that path goes
  through the grounder's declared-type casts.

### As built (2026-08-12)

The entry points (`inferNullability`, `inferQueryContract`, the traced
twin) are async with `evaluate` optional beside `paramTypes`
(`WalkOptions`); the map is computed in one pre-walk step and the engine
stays synchronous. Exactly two consumption sites, one per allowed
reading:

- Expression dispatch, before every other branch: a map hit answers the
  node whole — non-null claims notNull, an evaluated NULL keeps today's
  word without walking children. Exact wherever the walk meets the node,
  because closure means no row, guard or parameter can move the value.
- Searched-CASE guards, by boolean truth: FALSE or NULL drops the arm,
  everything after a TRUE guard — later arms and the ELSE — never runs,
  which also rescues a missing ELSE. The simple form has no AST node for
  its comparisons, so the map cannot prune it; a fully closed simple
  CASE still answers at the dispatch site.

The five red targets flipped in the landing commit and all seven
boundary guards held with the evaluator live; the CTE target verified
node identity through the walk's memoization unchanged. The fixture and
soundness harnesses run map-live — the claims the pins assert are the
claims the oracle adjudicates — while both censuses run evaluator-off,
keeping fixture coverage of the symbolic paths a map hit short-circuits.
The witness effect was the surveyed one exactly: `open_sum` flipped
nullable→notNull, its `@unwitnessable` retired, nothing else moved.

## Consumer 2 — the CHECK grounder (Mechanism E)

Design in `docs/argument-nullability.md`, "Mechanism E": ground enforced
CHECK bodies with the statement's written values (each cast to its
column's declared type), evaluate the closed parts, reduce by three-valued
algebra, analyze the residue with the existing machinery. Grounded bodies
are synthesized trees — catalog AST plus substitutions — so they do not
live in the statement map; same evaluator core, second feeder. All
substitution semantics are pinned (`param-mechanism.test.ts`), the
enforcement gate is captured and pinned (`enforced`,
`check-constraint-pins.test.ts`).

Claims land in the existing vocabulary — `params[].notNull`,
`rejectionSets` — and NEVER in `bindRejected`: evaluation claims are
execution-time and must not license output narrowing.

BUILT 2026-08-12: `src/query/check-grounder.ts`, its red block flipped
with every guard green (the bp = direction, NOT ENFORCED, the volatile
body among them). The as-built record lives with the mechanism's design
— `docs/argument-nullability.md`, "Mechanism E", "As built".

## The recorded later — output-side CHECK entailment

Same core, different soundness argument: a VALIDATED CHECK is notFALSE
over stored rows, WHERE equalities supply groundings, and the residue
null-test forces notNull for returned rows — the ordering-shaped gap the
entailment kernel's exact-atom trade cannot reach (eleven of fifteen
covered, neither ordering shape). Its red case is in the suite, expected
to stay red past the first two consumers.

This consumer does NOT sunset the kernel (ruled 2026-08-11). Evidence
with no grounding value — column-to-column atoms (`WHERE a < b` negator-
paired against `a >= b`), OR-subset facts, guards, generated-column
equalities — is kernel-only territory forever: nothing is closed, no
substitution is justified. Evaluation adds what the rung-ladder ruling
forbids the kernel: computation. The overlap is literal-vs-literal atoms,
where evaluation under the column's declared type is both stronger and
sounder (a nondeterministic-collation comparison evaluates to its actual
answer instead of being banned) — yet the kernel's literal rules stay:
they are the whole entailment story when no `evaluate` is passed, and
where both paths derive, agreement is a free cross-check — a disagreement
is a finding about one of them. Retiring the literal fragment is a
measured decision AFTER this consumer lands and the corpus shows it fully
shadowed, not a decision made here.

## The kernel's atom oracle (recorded 2026-08-11)

Two measured shapes showed CHECK-derivable read-side claims that none of
the three consumers reaches, because nothing in them is closed — they are
KERNEL derivations (red cases: "kernel atom oracle" block in the suite):

- `CHECK (a > 5)` forces `CASE WHEN a <= 5 THEN NULL ELSE 5 END` to 5 on
  every row: notFALSE(`a > 5`) means `a <= 5` is never TRUE, and the NULL
  arm never fires (oracle: 5 even for a NULL `a` — guard UNKNOWN → ELSE).
- `CHECK (CASE WHEN b THEN a < 5 ELSE a >= 5 END)` under `WHERE b IS
  TRUE` forces `CASE WHEN a > 5 THEN NULL ELSE 5 END` to 5: the evidence
  selects the CHECK's arm, and trichotomy refutes the guard.

The decomposition, four rungs, all propositional or catalog-structural:
evidence shaping (`b IS TRUE` → TRUE(`b`)); arm selection under a proven
guard (the kernel's generated-CASE arm machinery, extended to CASE-shaped
CHECK facts); same-operand trichotomy (notFALSE(`a < 5`) ⊢
notTRUE(`a > 5`) — NOT negator pairing; btree-opfamily exclusivity over
identical operand tokens, no values consulted); and a fourth judgment,
notTRUE, consumed as guard refutation — the same arm-pruning the
statement map consumer builds, fed from the kernel instead of the map.

**Relation to the register's "Decided against" entries.** The
value-tracking ban's premise — "the engine contains a constant evaluator
for PostgreSQL expressions that must match PostgreSQL exactly or produce
unsound claims" — is DISSOLVED by this charter: closed trees are answered
BY PostgreSQL, nothing is reimplemented, there is nothing to drift. What
stays banned is the ban's actual object, an engine-internal evaluator.
Wave 11c's module boundary — "an atom-entailment oracle interface whose
current implementation is exactly those three gates" — is the designed
integration seam, and its strengthening path is: (1) same-operand
opfamily trichotomy, structural, no values; (2) cross-literal order
facts through the subtree evaluator — `-20 < 0` is a closed tree, so the
order-theory oracle Wave 11c said "could plug in behind it" is the
evaluator itself. The Boolean layer stays complete and untouched; the
kernel still never evaluates; only the atom oracle strengthens, behind
the existing boundary, one chartered rung at a time.

**Demand discipline unchanged**: no predtest.c pre-build. Rungs charter
on conviction — the instrument's schema should gain a branch-correlated
CHECK so the distribution can convict these shapes if they carry weight.

## Boundaries, each verified against a real candidate

- NO QUERY CONTEXT, ever. `WHERE col = 5 AND f(col)` does not make
  `f(col)` evaluable. A consumer that can argue a substitution is sound
  makes that argument itself and hands the evaluator another closed tree.
- Structural facts over open trees are refused:
  `array_length(ARRAY[p.id, p.id], 1)` is always 2, but the tree holds
  names — that is (possible, future) symbolic business, not evaluation.
- Set-returning shapes are out of the first build even over literals:
  `generate_series(1, 3)`, `json_each` and JSON_TABLE over literal
  documents produce row sets, not scalar answers. Recorded later.
- Table-free SubLinks (`(SELECT 7)`) are semantically constant and still
  excluded first; recorded later.
- Session state (`CURRENT_SCHEMA`) and function-body reasoning stay out.

## Witness effects when consumers land

`operator-path-plus.sql` `open_sum` flips nullable→notNull and its
`@unwitnessable` annotation retires — the one entry of the current census
that closes (survey 2026-08-11; HAPPENED as surveyed when the statement
map landed, 2026-08-12); the census majority records data-shape
reasons, which the boundaries above refuse by design. New statement-map
claims land mostly on the literal-heavy generated corpus, where the oracle
adjudicates automatically; the CHECK grounder closes the discovery
instrument's standing finding (`subscription_check1`, ~9 per 20,000, both
seeds — verify with 20,000-query runs at two seeds when it flips).

## Rollout

1. Evaluator core, standalone, with its pins (allowlist census, the
   volatility-of-casts pin, batching, `result_types`). BUILT 2026-08-11 —
   see "As built" above; consumer-facing surface is
   `evaluateClosedSubtrees(stmt, catalog, evaluate) → Map<Node, EvalResult>`.
2. Statement map consumer — flip its red block. BUILT 2026-08-12 — see
   the consumer's "As built" above.
3. CHECK grounder — flip its block; the standing finding goes to zero.
   BUILT 2026-08-12 — see consumer 2 above.
4. Entailment later, under its own soundness argument, when chartered.
