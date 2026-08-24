# Subtree evaluation (chartered 2026-08-11; EVERY CHARTERED CONSUMER BUILT — evaluator core 2026-08-11; typed operand tracking, statement map, CHECK grounder, first-wave widenings and output-side entailment 2026-08-12)

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
  record, domain or enum). Calls and operators need every reachable
  signature immutable over that set. Casts closed on LITERAL arguments only
  until 2026-08-24 and are now gated on the same set — see "Casts over a
  computed argument" below, which is where the leak above actually lives.
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

### Casts over a computed argument (BUILT 2026-08-24)

The cast gate was SYNTACTIC — `A_Const` argument or refuse — and the
hazard behind it is TYPED. That mismatch is the whole finding. The leak
is a stable OUTPUT function crossing an I/O coercion, which is a
statement about `timestamptz`, not about computation: `('f'::text)::bool`
is two immutable I/O functions end to end and was refused for the SHAPE
of its argument, in a module that decides every other closure question by
type.

So a computed argument now closes when its own resolved type set lies
entirely inside the BUILTIN immutable-I/O set — the same 48 the target is
checked against. The soundness argument is that a cast between two
members is performed one of three ways, each immutable:

- binary coercible (`castmethod 'b'`): no function at all;
- I/O conversion (`castmethod 'i'`, and the fallback an explicit cast
  takes with no `pg_cast` row): the source's typoutput plus the target's
  typinput, both immutable BY THE SET'S DEFINITION;
- a cast function (`castmethod 'f'`): **swept 2026-08-24 over PG 18.3 —
  of every `pg_cast` row whose source AND target are both set members,
  ZERO has a non-immutable cast function.** The sweep runs as an
  assertion in `computed-cast-closure-red.test.ts`, so a future PostgreSQL
  that adds one fails before any claim built on it can.

An ARRAY rendering answers on its element, because that is how PostgreSQL
coerces one (COERCION_PATH_ARRAYCOERCE applies the element cast, so the
sweep's guarantee applies one level down).

TWO THINGS THE GATE DELIBERATELY KEEPS. Design B stays LITERAL-only: its
admission rests on the VALUE's shape against a regex, and a computed
argument has no shape to read at analysis time. And the gate reads the
BUILTIN face (`isBuiltinImmutableIoRendering`), not the wire face
(`isImmutableIoRendering`): a first-wave user domain or enum may cross the
wire — its output route is the base's or a snapshot-pinned label — but a
cast OFF one runs whatever function the user attached, and the sweep swept
pg_catalog only. Same discipline the unknown-literal landings already keep
by reading the builtin set directly.

The leak keeps its gate for the reason it always had: `date` and
`timestamptz` are not in the set. The red suite makes PostgreSQL
demonstrate that rather than asserting it —
`('2020-01-02'::date)::text` is `2020-01-02` under ISO and `02.01.2020`
under German, and a predicate resting on that rendering returns a NULL
under the second that it does not under the first.

MEASURED REACH over the 515-fixture corpus: the collected-subtree COUNT
is unchanged (99 → 99) and the SET changes in four fixtures — the
collector takes the same trees at a HIGHER node. That is the shape of this
widening: not more closed trees, bigger ones.

    array-length-literal-shape   A_ArrayExpr → FuncCall
    builtin-variadic-null        3 A_ArrayExpr → 3 TypeCast
    quantified-sublinks          2 FuncCall → 2 TypeCast
    computed-cast-closure        2 TypeCast → 2 A_Expr   (the new fixture)

A bigger tree is a MOVED KEY, and one consumer was reading the old one:
`evaluatedArrayHasNoNullElement` looked the expression up with its casts
STRIPPED, because `string_to_array('1,2', ',')::int[]` used to collect as
the FuncCall inside. It now collects whole, the stripped lookup missed,
and `quantified-sublinks`'s `any_closed` lost its claim — caught by the
corpus, fixed by trying the expression as written first. Any future
widening of the collector should expect exactly this failure mode: a
consumer that compensated for the old boundary.

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
- FIRST-WAVE SCOPE, foldable under the snapshot contract — BUILT
  2026-08-12 ("first-wave widenings" block in subtree-evaluator.test.ts;
  admission computed at adapter build, read by `closedCastTargetType`
  and the root-rendering gate):
  - domains over immutable-I/O bases, the WHOLE nesting chain's CHECKs
    gated through THIS closure gate (VALUE substitutes as a typed NULL;
    a domain-over-domain constraint renders VALUE pre-cast, measured,
    so under a rendered cast the stand-in is bare). Admitted domains
    thread their canonical BASE — operators resolve on it. A violating
    cast raises at evaluation and contributes nothing.
  - enums — values and sort order are snapshot-pinned, and their
    comparison operators are immutable by PostgreSQL's own book; they
    thread their qualified rendering through the survivor machinery
    unchanged (`anyenum` is pseudo, so the route is clean).
  - array literals over immutable-I/O element types — `array_in`'s
    blanket-stable flag means "elements could be datetime", a question
    the element gate answers better than the flag does. Builtin
    elements only.

  What building it corrected and bounded: admission is by UNIQUENESS,
  not the name-consensus the charter guessed — two same-named enums
  with opposite label orders answer oppositely as search_path moves
  (measured 2026-08-12), so a bare name closes only when exactly one
  user type carries it and no pg_catalog spelling collides. One pass,
  no fixpoint (a CHECK casting to a not-yet-admitted domain over-keeps,
  which only keeps a cast open); the unknown-literal LANDINGS stay
  strict (landing 'red' on an enum runs enum_in — not widened);
  schema-QUALIFIED user casts stay open (uniqueness makes the
  qualified spelling unnecessary for admissible types).

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

#### Polymorphic landings (BUILT 2026-08-24)

Both of `survivorConsensus`'s checks are about the type a value is
ACTUALLY read at, and both were reading the DECLARED spelling:

- an UNKNOWN operand must land on a parameter with immutable I/O,
  because the landing runs that type's input function;
- the RESULT must be base-kind, because a pseudo-typed result names no
  concrete type to thread upward.

For a polymorphic row the declared spelling is `anycompatible` or
`anycompatiblearray`, which is never a base type and never in a set of
them. So the first check refused every polymorphic signature the moment
an argument was an unquoted string literal, and the second refused every
polymorphic RESULT unconditionally — at any argument spelling at all.

The tell was that the same call folded or did not by how an argument had
been WRITTEN:

    array_position(ARRAY['a','b'], 'z')        open
    array_position(ARRAY['a','b'], 'z'::text)  CLOSED
    array_position(ARRAY[1,2], 3)              CLOSED   (`3` types as integer)
    array_remove(ARRAY['a','b'], 'a')          open     (returns anycompatiblearray)

That is not a fact about volatility. `polymorphicElement` resolves the
family from the call's KNOWN operands (`anycompatiblearray` contributing
its element type) and the two checks then run against the resolved type:
the unknown's landing is that type — or the ARRAY over it at an array
position, which still refuses, `array_in` being stable and no array type
being in the set — and the result threads as `E` or `E[]`.

DELIBERATELY THE AGREEMENT CASE ONLY. Every known operand at a
polymorphic position must contribute the SAME element type. That is
exactly PostgreSQL's rule for the `anyelement` family, and a strict
subset of `anycompatible`'s `select_common_type`, whose answer over
identical inputs is that input. Disagreement resolves nothing and falls
back to the pre-existing checks, so the change can only ADD — pinned by
a guard over `array_position(integer[], bigint)`, which folded before and
folds now.

THE CHECK IS STILL DOING REAL WORK, and the red suite proves it with a
value that MOVES rather than an argument:
`array_position(ARRAY['2020-01-02'::date], '01/02/2020')` is **1 under
MDY and NULL under DMY**, because the unknown lands on `date` and runs
the stable `date_in`. `date` is not in the immutable-I/O set, so the
resolved landing fails the same check the declared one used to. Resolving
the family also says nothing about the FUNCTION's volatility:
`array_to_string(anyarray, text)` is stable and stays refused.

SURFACE, measured over PG 18.3 pg_catalog:

    immutable functions with a POLYMORPHIC RESULT      48   (never folded, any spelling)
    immutable functions with a polymorphic PARAM       46   (folded only without a bare literal)
    immutable operators, polymorphic result             3
    immutable operators, polymorphic operand           19

CORPUS EFFECT: one claim, `builtin-totality-table.sql`'s
`array_position(ARRAY['a','b'], 'z')`, nullable → alwaysNull. Its fixture
comment had explained the refusal two days earlier as "a bare unknown
literal beside an array constructor, the syntactic guard" — a mechanism
replaced by this very rung in 2026-08-12 and one the value never went
through. The comment is kept in place, corrected, as the cleanest
instance of that rot mode.

REMAINING, filed rather than reached past: `A_Indirection` is not in the
closed grammar, so `(array_remove(ARRAY['a','b'], 'a'))[1]` is open even
though its argument now closes. Measured non-NULL on every row and
claimed nothing (`polymorphic-landing-red.test.ts`, "a SUBSCRIPT over the
same call is refused"). The symbolic rule that covers
`(ARRAY['a','b'])[1]` reads the constructor's own length and has nothing
to read here.

#### The closed grammar, censused (2026-08-24)

The allowlist census in `subtree-evaluator.test.ts` ran TWO directions and
needed a third:

- every kind INSIDE a collected subtree must be classified — catches
  over-admission, the soundness direction;
- every kind classified `closed` must actually be collected somewhere —
  catches a dead gate, the reachability direction.

Neither can see ABSENCE. A kind the gate has never heard of is never inside
a collected subtree and is never classified `closed`, so both assertions
pass while the gate does not exist. The third direction closes it: **every
expression kind the corpus writes in a `ResTarget.val` must be CONSIDERED**
— classified with a gate, or listed open with a reason. Being listed is not
a promise to fold; it is a promise that somebody looked.

It went red with **twenty-six** kinds. What they turned out to be:

- **Closed, and refused anyway — 2.** `A_Indirection` and `CollateClause`.
  The first is the one the polymorphic-landing commit had just filed as an
  open row; its exclusion read "structural facts over open trees are
  refused", which is right about `arr[i]` over a column and silent about
  `(array_remove(ARRAY['a','b'], 'a'))[1]`. Both are now gates, with
  `A_Indices` structural beside them.
- **Deferred behind ONE upstream blocker — 7.** Every SQL/JSON expression
  node (`JsonIsPredicate`, the two constructors, `JsonScalarExpr`,
  `JsonParseExpr`, `JsonSerializeExpr`, `JsonFuncExpr`). Each answers a
  definite value from all-literal arguments; `pgsql-deparser` throws on all
  seven, and the evaluator renders every collected subtree. Recorded as
  BLOCKED rather than designed-open, because "closable, if ever worth it" is
  the entry shape this project has twice measured to rot fastest.
- **Open for a measured reason — the rest.** A relation reached through a
  sublink body is context; an aggregate needs rows; `xml_in` is STABLE
  (measured) so xml is outside the immutable-I/O set; and `NamedArgExpr`
  carries its arguments in the order they were WRITTEN with `argnumber`
  unresolved, while the survivor consensus matches parameters positionally.

`A_Indirection`'s gate carries one restriction that is NOT a closure
question, and it is worth stating where it will be found: the ARGUMENT KIND
is limited to what `pgsql-deparser` parenthesises. `(ARRAY['a','b'])[1]`
renders as `ARRAY['a', 'b'][1]`, which PostgreSQL rejects, and a batch whose
render is rejected returns nothing for the WHOLE statement — so one
unrenderable subtree would cost every other answer in the same query. The
measured split is in docs/deparser-limitations.md §4.

CORPUS EFFECT: none. Every claim in the corpus stood, and the fixture
written for this — `closed-grammar-subscript.sql` — is the whole of the
reach. That is the expected shape for a grammar widening whose subject is
all-literal expressions, and it is also why the census matters more than
the gates it produced: the instrument now fails when a node kind arrives
unexamined, instead of waiting for somebody to trip over one.

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
- `isNull` IS READ BOTH WAYS (2026-08-24). A non-null answer claims the
  subtree notNull; a NULL answer claims it **alwaysNull**. Same argument,
  run the other direction: closure means no row, guard, parameter or
  session state can move the value, so a closed subtree that evaluated
  NULL is NULL on every row. It had only ever been run forwards — the
  reverse reading was absent rather than declined, and a fixture comment
  in `scalar-subquery-union-arm.sql` had been explaining the gap as a
  property of the SYMBOLIC channel ("needs both branches to claim it"),
  which is true of that channel and beside the point for a closed body.

  The verification story is the inverse of the notNull side's and much
  stronger: a wrong `alwaysNull` is falsified by ANY non-NULL value, so
  every returned row tests it. Corpus effect, measured: **21 → 31
  alwaysNull claims, 0 falsified**, across five pre-existing fixtures —
  `array_length(ARRAY[]::int[], 1)`, `substring('abc' FROM 'z+')`,
  `scale('NaN'::numeric)`, closed `path + path` twice, three empty
  set-operation sublinks, and `(SELECT 1 WHERE false)`. One of the ten
  (`array_length` over an empty literal array) needed the cast widening
  above to be closed at all; the other nine were closed all along and the
  channel was not looking.

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

BUILT 2026-08-12 — the "As built" record lives with the mechanism's
design in `docs/argument-nullability.md` ("Mechanism E"); its seven red
targets flipped in the landing commit and both must-not-claim guards
(bp equality, NOT ENFORCED) held.

**Value-conditional rejections (ruled 2026-08-12).** A raise conditioned
on a SIBLING parameter's value — `$1 <= 1 OR $2 IS NOT NULL` binding
`(5, NULL)` — is adjudicated NON-CLAIMABLE: deriving it needs
satisfiability over the sibling's domain (the engine modeling operator
semantics, the banned category), and no claim in the contract's
vocabulary can carry it — flat `notNull` over-forbids bindings the
consumer's own choices make legal, and a rejection set says all-NULL
raises, which this shape's all-NULL corner does not (the `$1` atom goes
UNKNOWN and CHECK passes). The instrument routes these instead of
convicting: when a nullable parameter's NULL binding raises, one extra
execution at the ALL-NULL corner — the only binding pattern with no
value freedom left — decides it. Passing there files the query under
the EXPECTED bucket `value-conditional`, fingerprinted and counted per
run; raising there keeps the finding, CONSERVATIVELY — the corner can
raise through an already-claimed sibling (`plan`'s NOT NULL under
`($1, $2, 'x')`) or a sibling constraint, and the instrument keeps
rather than guesses, because no binding-corner can search the sibling's
VALUE space (measured 2026-08-12: both residual `subscription` shapes
are kept this way, so the thinner standing finding survives the probe
by design and stays reported). REVISIT TRIGGER: the bucket growing past
a few per 20,000, or the contract gaining value-conditional vocabulary
some consumer can render.

CLOSED BY RULING (2026-08-16): the vocabulary trigger is RETIRED. The
claim's discriminant is a value-range predicate (`seats <= 1`), and no
mainstream type system can carry that split — TypeScript has neither
numeric-range nor negation types, so the union arm `{seats > 1; oc:
string}` is unwritable, and even boolean-discriminant shapes (`bcorr`)
condition their arms on ranges. A claim the consumer cannot render is
diagnostics with no type, which this contract does not trade in. The
shape is therefore documented behavior, not a standing finding: the
instrument keeps reporting instances (the honest conservative word) and
the BUCKET-COUNT trigger stays as the only revisit condition.

BUILT 2026-08-12: `src/query/check-grounder.ts`, its red block flipped
with every guard green (the bp = direction, NOT ENFORCED, the volatile
body among them). The as-built record lives with the mechanism's design
— `docs/argument-nullability.md`, "Mechanism E", "As built".

## Consumer 3 — closed truths (BUILT 2026-08-24)

`src/query/closed-truths.ts`. The narrowest consumer here, and the one
whose subject is a fact about PostgreSQL rather than about the engine:

> Parse analysis COERCES an unknown literal. The rewriter FOLDS nothing
> on the way into `pg_constraint.conbin`.

Both halves measured 2026-08-24 through `pg_get_constraintdef`:

    CHECK (a > 0 OR 't'::boolean)  →  ((a > 0) OR true)
    CHECK (a > 0 OR 1::boolean)    →  ((a > 0) OR (1)::boolean)
    CHECK (a > 0 OR 1 > 2)         →  ((a > 0) OR (1 > 2))

The first the kernel already read — `boolLiteral` matches a TOKEN. The
rest it could not, and neither could any token matcher, because they are
COMPUTATIONS: a cast through an input function, a comparison, a function
call, `ARRAY[1,2] @> ARRAY[3]`, a jsonb `?`, `false IS TRUE`, a closed
CASE, `3 = ANY (ARRAY[1,2])`. Ten shapes measured unreadable, each a dead
disjunct the OR harvest would have dropped had it been able to read it.
The register carried this as ONE row about ONE cast spelling; measuring
the refusal is what showed the row was ten.

The same blindness sat on the STATEMENT side, where it needed no cast at
all: `WHERE false OR v IS NOT NULL` proved nothing, because
`predicateProvesNonNull` requires EVERY disjunct to prove and a dead
disjunct proves nothing. That rule is exactly right about arms that can
fire; the fix is to restrict it to those.

TWO SOURCES, ONE KEY SPACE, ONE COST. The statement's own closed subtrees
are already evaluated by consumer 1, so its boolean answers are RE-KEYED
here rather than re-asked — the statement half cost no probe at all. What
needs asking is the CHECK constraints of the statement's tables, which
consumer 1 never sees because they are catalog trees.

Keys are STRUCTURAL, not node identity, and must be: the walk hands the
kernel `qualifyColumnRefs` output, which is a `structuredClone`, so every
catalog-side identity is destroyed before the kernel reads it. `location`
is skipped, so a statement's `1 > 2` and a CHECK's converge on one entry.

Two gates keep the probe honest, both measured:

- COLLECTION IS GATED TO BOOLEAN POSITIONS — the CHECK root, BoolExpr
  arms, a CASE's conditions and results. Whole-tree collection over the
  corpus's 49 CHECKs yields 28 closed subtrees, NONE of them a truth
  value (every one an operand like `'x'::text`); the gate spends nothing
  on answers no consumer can read.
- A CAST OF THE NULL CONSTANT IS SKIPPED. `NULL::boolean` is what
  `pg_get_constraintdef` renders for the implicit ELSE of a CASE that has
  none, its truth is NULL by construction, and it was the ONLY question
  four corpus fixtures produced. Exact, not conservative.

Corpus cost after both gates: 3 fixtures of 514 ask anything, 12
questions total, max 4 per statement. The corpus as it STOOD asked
nothing — every one of those 12 belongs to a fixture written for this
round, which is the honest reading of the reach: the shapes are real and
PostgreSQL rejects the NULLs behind them, but nobody here had written one.

BOUNDARY WHEN THIS LANDED, and it was the evaluator's rather than this
consumer's: `('f'::text)::boolean` stayed unclaimed, because `typeSetOf`
closed a cast over a LITERAL argument only. Recorded rather than worked
around — reaching past that gate from a consumer would have been one
closure question decided in two places.

CLOSED 2026-08-24, one commit later, by widening the gate itself ("Casts
over a computed argument" above). Nothing in this module changed, which
is what it looks like when a boundary is filed against its actual owner:
the flip shows up here as a test whose name still says "the boundary that
was NOT this module's".

## The recorded later — output-side CHECK entailment (BUILT 2026-08-12)

Same core, different soundness argument: a VALIDATED CHECK is notFALSE
over stored rows, WHERE equalities supply groundings, and the residue
null-test forces notNull for returned rows — the ordering-shaped gap the
entailment kernel's exact-atom trade cannot reach (eleven of fifteen
covered, neither ordering shape). Its red case is in the suite, expected
to stay red past the first two consumers.

**As built (2026-08-12).** The seam is Wave 11c's designed one — the
kernel's atom oracle, at `atomIsTrue`/`atomIsFalse`: a TRUE equality
fact substitutes its literal into a same-column comparison atom, and the
pre-evaluated answer decides the atom (`src/query/comparison-groundings.ts`
synthesizes the questions before the walk — every statement equality
crossed with every referenced table's CHECK atoms, both literals cast to
the column's DECLARED type, one evaluator-core call, table-free keys —
and the kernel looks answers up through a walk-supplied callback). The
oracle consumes only already-collected, already-masked TRUE facts, so
every evidence gate is inherited by construction; substitution is sound
within the column type's btree family, where every canonical operator
lives. It generalizes the kernel's two literal-distinctness rules to the
whole comparison set; the kernel's own rules stay — they are the whole
story when no `evaluate` is passed.

What building it corrected: the questions evaluate under the ANALYSIS
SESSION'S DEFAULT COLLATION, and the collation-gate fixture caught the
first build claiming against a nondeterministically-collated column —
so a per-column COLLATION TRICHOTOMY gates the oracle (new face member,
`resolveColumnCollationDeterministic`): non-collatable transfers every
canonical op; a deterministic collation transfers equality only
(byte-equality semantics, shared with the deterministic analysis
default — bp included, `character(4)` reading both literals padded);
ORDER over collatable columns needed collation IDENTITY — CAPTURED
2026-08-12 (`collationIsDefault`, `pg_attribute.attcollation` against
`pg_catalog."default"`): a default-collated column's comparisons run
under the very collation the analysis session evaluates with, so every
canonical operator transfers there, determinism regardless; an
explicitly-collated column keeps the deterministic-equality-only arm,
and its refusal is the standing record
(`check-interval-refusals.sql`, the COLLATE "C" twin beside the
flipped default-collated claim in `check-interval-text-default.sql`).
The gate is kernel-side — the question keys are type-level, the hazard
is column-level — with a synthesis-side mirror that only saves
evaluations. Witness effects:
`check-multiwhen-numeric-negative` flipped nullable→notNull and its
`@unwitnessable` retired (`2 = 1` evaluates FALSE where token
distinctness is rightly banned — 1 vs 1.0 would evaluate EQUAL);
`check-distinctness-collation-gate` held, which is the fixture doing
its job. Red: the flip target plus three adjudicated guards (an
equality satisfying the comparison disjunct claims nothing; the bp
direction claims; a datetime comparison is never evaluated).

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

## The kernel's atom oracle (recorded 2026-08-11, BUILT 2026-08-12)

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

### Interval exclusivity over btree strategies (chartered 2026-08-12)

Generalizes the same-token trichotomy to ORDERED ANCHORS: notFALSE
(`a > 5`) refutes `a <= 3` because the two sets share nothing, and
"share nothing" decomposes into facts PostgreSQL publishes — no operator
is modeled anywhere:

- The SHAPE of each comparison's set is catalog data: `pg_amop` records
  every btree operator's STRATEGY NUMBER (1 `<`, 2 `<=`, 3 `=`, 4 `>=`,
  5 `>`) — left rays open and closed, the point, right rays closed and
  open. Captured by CONSENSUS across pg_catalog btree families (an
  operator with conflicting strategies is refused; a user operator of
  the name disqualifies it, the standing collision rule). `<>` has NO
  strategy — PostgreSQL does not index inequality — and takes its shape
  (complement-of-point) from `pg_operator.oprnegate` instead, a second
  mechanical capture. The hand tables NEGATOR_OPS and EXCLUSIVE_OPS
  retire into these captures: curated → captured, the project's
  standing direction.
- The ORDER between two anchors is a point question the evaluator
  answers: per same-column anchor pair the synthesis adds `p < q`,
  `q < p`, `p = q` beside the comparison questions it already batches.
  The existing gates compose unchanged: immutable-I/O keeps datetime
  anchors out, and the collation trichotomy limits collatable columns
  to point/complement shapes (order anchors need collation identity,
  not captured).
- The algebra on top is interval bookkeeping whose ONE axiom is the
  btree contract (a total consistent order per family) — PostgreSQL's
  own documented invariant, the same one `predtest.c` and our negator
  pairing already lean on. Same-token stays a fast path needing no
  evaluation, so the no-evaluate mode keeps today's power exactly.

THE DIRECTION WALL, which is what keeps this inside the ban: the
algebra may conclude EMPTINESS ONLY — "these sets share nothing", the
refuting direction, which can only prune claims. NONEMPTINESS is never
concluded: deciding "this set has members" needs a type's inhabitants
(`a < -2147483648` over int4 is empty), which is where reimplementation
would re-enter. One direction open, one walled — the engine's standing
over-keep asymmetry, applied to sets.

Exotica resolve structurally: no btree membership (`||`, `@@`, `~~`,
the geometric operators) → no shape → no claim; LIKE's prefix-range
trick needs pattern semantics and stays out; equality-only types via
hash families are a possible later rung, not a corner of this one.
Cross-type comparisons inside one family work (the integer family
spans int2/int4/int8; the anchor question evaluates whichever widths
the literals carry).

Acceptance frame: "RED: interval exclusivity" in the red suite — every
target and guard adjudicated against PostgreSQL before writing, the
guards pinning the boundary exactness the algebra must not blur
(touching rays with one open endpoint refute; both closed share the
point and must NOT; an overlapping ray must NOT; collatable and
datetime anchors stay refused).

**As built (2026-08-12).** Six red targets flipped, two same-token
controls pinning that the delta is exactly the cross-anchor cases, all
seven guards green; `check-interval-exclusivity.sql` carries the
corpus witnesses over `tri`. The captures: `builtinBtreeStrategies`
(HAVING-gated consensus — a strategy split drops the name) and
`builtinEqualityNegators` (every row negated, any btree-carrying
negator strategy 3, at least one actually so — the last clause is what
keeps `=` itself out, its own negator carrying no strategy); the
pg_amop facts pinned in param-mechanism.test.ts, `~=`'s
btree-absence included. The kernel's `intervalRefuted` runs after the
same-token fast path — which needs no captures and no evaluation, so
the no-evaluate mode keeps today's power exactly — deriving the anchor
relation lt/eq/gt/ne from the synthesized `<`/`=` questions (identical
tokens are `eq` for free), gated per column by the collation
trichotomy: non-collatable columns order, deterministic ones answer
equality only (so text still gets point-vs-point exclusion), and the
witness list spans TRUE and notFALSE facts alike — if the atom were
TRUE the column would be non-null, the witness would have evaluated,
and notFALSE would force it into the empty intersection. The hand
tables NEGATOR_OPS and EXCLUSIVE_OPS did NOT retire (correcting this
charter's guess): they are the no-evaluate mode's whole power and the
same-token fast path, and the capture pins now hold their content
consistent instead.

**Corrected 2026-08-24** — the anchor reading carried a SOUNDNESS hole
for twelve days: a cast-less fval read at an integer column ROUNDS
while the query's comparison runs at numeric, so the rung refuted
guards the true set contains. Found while building the containment
rung, measured, closed by `litReadExactAt` — the full story in
"Interval containment — membership transport" below.

### List membership exclusion (chartered 2026-08-16, BUILT 2026-08-16)

The measured gap (2026-08-16, the CHECK-twin probe): `CHECK (k IN
('a', 'b'))` — and its rendered form `= ANY (ARRAY[...])`, which is
also every list partition bound — does not refute `k = 'q'` today.
The conjunct harvest already turns these into OR-facts; what is
missing is one conclusion: an OR-fact refutes a guard when EVERY
disjunct refutes it, each arm answered by the point/interval machinery
that already exists, under the same per-column collation trichotomy.
No new captures, no evaluation beyond the anchor questions the arms
already ask. Pays twice: CHECK IN-lists and list partition bounds
(`plst_ab`-shaped scans) through the same code. Acceptance frame: red
targets over a CHECK IN table and the list-partition twin; guards — a
guard naming a MEMBER still fires (`k = 'a'`), the NULL-listing bound
shape (`(k IS NULL) OR ...`) still claims nothing, and an OR-fact with
one non-refuting arm claims nothing.

**As built (2026-08-16).** One correction to the charter's premise,
measured while building: the conjunct harvest turned only TRUE
evidence into OR-facts — a CHECK's spine dropped its disjunctive
conjuncts entirely. They now join a SECOND list, notFALSE OR-facts,
consumed by the new conclusion alone (the subset rule keeps the TRUE
list: notFALSE licenses no arm-implication upward). The conclusion —
`orFactRefuted`, after the same-token and interval judgments in
`atomNotTrue` — takes an OR-fact from either list and refutes the atom
when every arm carries a same-column comparison whose set is provably
disjoint (same-token exclusivity, or the interval core factored out of
`intervalRefuted` as `cmpDisjointRel`, every gate intact). Soundness at
notFALSE strength runs through evaluation: were the atom TRUE, its
column would be non-null, each arm's refuting comparison would have
evaluated — to FALSE, being disjoint — an arm with a FALSE conjunct is
FALSE, and an all-FALSE OR contradicts notFALSE. The synthesis side
had the matching gap: `scanLitComparisons` skipped `IN`/`= ANY`
shapes, so the anchor questions the arms ask were never emitted; it
now yields one entry per element. Acceptance as chartered: three red
targets flipped (CHECK IN text, integer IN point-and-ray, the
plst_ab twin) with the member, non-refuting-arm (`k = 'a' OR k = 'b'
OR v > 10` satisfied through `v`) and NULL-listing guards green.
Corpus: `check-membership-exclusion.sql` rides guest's own
`status IN (...)` constraint; the new `courier_jobs` list family
(row-rotated, NULL only in the NULL-listing partition) grounds
`partition-bound-list.sql` and the claims-nothing twin
`partition-bound-list-null.sql`, whose outside-guard refusal is held
by `@unwitnessable` annotation — no data state can fire an arm the
bound excludes.

**Guard-side IN (chartered 2026-08-16, BUILT 2026-08-16).** The measured gap
(post-landing review, adjudicated live): over `lme` — `CHECK (k IN
('a','b'))` — the guard `k IN ('q','r')` stays nullable while its OR
spelling `k = 'q' OR k = 'r'` claims notNull, and the oracle returns
no NULL either way. The conclusion is spelling-dependent: `isNotTrue`
walks a BoolExpr OR arm by arm, but a multi-element IN guard
atomizes to nothing — `atomsOf` skips it by design on the FACT side,
where a disjunction asserts no single atom; on the GUARD side the
disjunction IS the question. The rung: in `isNotTrue`'s leaf case,
desugar a multi-element IN (and its `= ANY` array-literal rendering)
through `disjunctArms` — the guard is notTRUE when EVERY arm carries
some refuted-or-notTRUE atom, the same weak-dual rule the OR branch
already applies; the arms answer through the existing point/interval
judgments and the OR-fact rule, no new machinery. Guards: `NOT IN`
(AEXPR_IN carrying `<>`) is a conjunction, not a disjunction — it
must NOT ride this rule; a guard listing one non-excluded member
(`k IN ('a','q')`) stays unrefuted; a NULL in the guard's list
leaves its arm atomless and refuses the whole desugar (litOf's
standing NULL refusal). Acceptance frame: red target — the IN
spelling reaching the OR spelling's conclusion over the CHECK table
and the list-partition twin; the three guards beside it, each
adjudicated.

**As built (2026-08-16).** The charter held with nothing to correct:
`isNotTrue`'s leaf case keeps its atom pass and then tries
`disjunctArms`, refuting when every arm carries some FALSE-or-notTRUE
atom. On a leaf the OR branch has already returned, so only the A_Expr
half of `disjunctArms` is reachable — and all three guards are its
existing refusals, not new gates: `NOT IN` fails the `AEXPR_IN` +
`=` test (`<>` never reaches the item list), a list carrying NULL
yields no atom for that arm and returns null wholesale, and a member
arm simply is not refuted. `= ANY (ARRAY[...])` rides the same branch.
Pre-work (param-mechanism, "Guard-side IN"): the disjunction and
conjunction equivalences hold over the whole three-valued grid — 12
combinations with NULLs in the operand and both elements — and the
corners the guards rest on are pinned (`'a' NOT IN ('q','r')` is TRUE,
so an unsound refutation there would fire on every conforming row; a
NULL element makes a non-member's membership UNKNOWN, which is why
refusing that shape costs no witnessable claim). Acceptance as
chartered plus the rendering: three red targets flipped (`lme`, its
`= ANY` spelling, the `plst_ab` twin) with the NOT IN, member and
NULL-element guards green. Corpus: `check-membership-exclusion.sql`
and `partition-bound-list.sql` each gained the IN-spelled claim beside
their existing `=` one and a NOT IN control witnessed in every data
state (every guest status is a member; every courier_north region is
'north' or 'east', so the conjunction is TRUE on every row).

### Interval containment — membership transport (found 2026-08-24, BUILT 2026-08-24)

The gap surfaced by a maintainer question, not a charter: arm selection
inside a CHECK's CASE was EQUALITY-shaped — `WHERE status = 'housed'`
selects its arm — while the ORDER theory above concluded emptiness
alone. `SELECT o FROM t WHERE a >= 4` under `CHECK (CASE WHEN a >= 3
THEN o IS NOT NULL ELSE o IS NULL END)` stayed nullable, though
[4,∞) ⊆ [3,∞) is bookkeeping over the very anchors the exclusivity
rung already evaluates. Measured before writing (the red-suite bar),
captured RED the same day (`check-arm-interval-red.test.ts`), built the
same day.

The judgment is the exclusivity table's dual over the SAME core:
`cmpShapeRel` (one home for every gate — captures, column-typed
literals, the collation trichotomy) now feeds two thin conclusions,
`shapesDisjoint` and `shapesContained`. Containment is domain-free like
emptiness: `{x ≥ 4} ⊆ {x ≥ 3}` because 4 > 3 and the order is
transitive, never because of what sits between; the closed-into-strict
cells (a closed ray inside its strict twin at the same anchor) refuse,
held by boundary data (`check-arm-interval-strict-boundary.sql` and its
left mirror).

WHY THIS STAYS INSIDE THE DIRECTION WALL: the wall bans concluding
NONEMPTINESS — "this set has members" needs a type's inhabitants. The
transport concludes nothing about sets having members. A TRUE witness
places the emitted row's value in the witness set; the algebra proves
that set sits inside the question's; the value rides along — the member
travels WITH the conclusion. That is also why the strength gates are
what they are, each held by a PostgreSQL-witnessed control: TRUE facts
only (`check-arm-interval-notfalse-control.sql` — a notFALSE witness
may be NULL, and the question is NULL beside it), and TRUE OR-facts
only for the disjunctive face `orFactImpliesAtom`
(`check-arm-interval-or-notfalse.sql` — a notFALSE disjunction may have
had no arm hold at all).

Three companions landed in the same pass, each measured first:

- **The lossy anchor read — a SOUNDNESS hole in the exclusivity rung,
  found while designing the containment fixtures and closed before
  them.** The anchor questions read both literals at the column's
  declared type, and for a cast-less fval over an integer column that
  read ROUNDS: `2.4::integer` is 2, while the query's own `z < 2.4`
  promotes the COLUMN to numeric and keeps the literal exact. The
  misread anchor named the wrong set, and exclusivity refuted a guard
  the true set contains (measured: the z = 2 row fires the arm the
  engine called dead — an OVERCLAIM, adjudicated before fixing).
  `litReadExactAt` now gates the evaluated path: typmods refuse for
  every kind (the read re-rounds/truncates on its own), sval-ish kinds
  pass (unknown-literal resolution takes the column's type in the query
  too), ival passes everywhere but `real`, fval only at plain `numeric`
  and `double precision`. Identical tokens stay exempt — one resolution
  serves both sides. The equality-anchored oracle needed no gate: a
  satisfiable equality fact pins the value to something
  column-representable, which is its substitution argument. Corpus:
  `check-interval-lossy-anchor.sql` (exclusivity),
  `check-arm-interval-lossy-anchor.sql` (containment), and the
  double-held typmod records (`-typmod-numeric`, `-typmod-refusal`) —
  the typmod bar has no single-gate kill, and the fixtures' headers
  carry the measured reasons.
- **OR-fact containment**: TRUE(a >= 4 OR a >= 5) selects the `a >= 3`
  arm — whichever disjunct held, its set lands inside. The subset rule
  with containment where it matched by identity;
  `check-arm-interval-or-containment.sql` and the escaping-disjunct
  control.
- **Arm stepping by notTRUE**: the harvest stepped past a CASE arm only
  on FALSE, and TRUE(a <= 3) proves `a > 5` notTRUE — never FALSE. A
  NULL guard skips its arm exactly as a FALSE one does, so notTRUE is
  the right stepping judgment; the ELSE's own enforcement then claims
  (`check-arm-interval-step-notrue.sql`, with the overlap control that
  keeps stepping a judgment).

Text rides the identity arm of the collation trichotomy (default
collation orders, `check-arm-interval-text.sql`); an explicit collation
stays refused, recorded as the family's `@unwitnessable` entry
(`check-arm-interval-collation-refusal.sql`). The point-witness row of
the containment table is provable only through HARVEST-derived
equalities (`check-arm-interval-point-witness.sql` — the oracle's
question key needs a statement-side equality that isn't there), which
is what makes that cell testable at all.

### Predicate-aware generated columns (found 2026-08-24, BUILT 2026-08-25)

The maintainer question the containment rung came from, asked one level
up: is a GENERATED column predicate aware? `SELECT c FROM t WHERE a >= 5`
where `c GENERATED ALWAYS AS (CASE WHEN a <= 3 THEN 'yes' WHEN a <= 10
THEN 'maybe' ELSE NULL END) STORED`. Explored under an explicit "just
check, don't rush fixing it", captured RED the same day
(`generated-predicate-red.test.ts`, 7 targets and 4 boundary guards, all
adjudicated over real rows), built the next.

The forward inline already existed and had for a long time: a selected
generated column's expression is walked in the READING scope, so it
composes with WHERE promotion and with the CHECK kernel — which is why
`SELECT event_duration FROM evg WHERE has_duration` claimed notNull
through a boolean-discriminated OR-CHECK before any of this. What was
missing was everything that lets the WHERE reach the CASE's ARMS:

- **A guard-TRUE consumer.** `CASE … ELSE NULL` can only claim notNull
  when some guard is provably TRUE — that is what makes the ELSE
  unreachable — and only the statement map could say TRUE, for closed
  guards. The kernel's `isTrue` (identity, equality substitution, the
  containment rungs) was consumed on the CHECK-harvest side alone.
  `checkConstraintsRefuteGuard` became `checkConstraintsGuardTruth`,
  three-valued over ONE fact derivation — the fixpoint is the expensive
  half and both answers read off it.
- **Evidence-only runs.** The consumer skipped a CHECK-less table
  outright, so pure WHERE evidence never reached the kernel. The
  evidence-only question is now asked FIRST and once: a WHERE holds on
  every emitted row whatever produced them, so it needs no entry, no
  CHECK and no table. (The per-entry loop keeps its `checkExprs.length`
  skip as a cost skip, and says so.)
- **An alwaysNull channel through the inline.** `entryColumnAlwaysNull`
  now inlines the generation expression the notNull side inlines, and
  `alwaysNullExpr`'s CASE rule consults arm REACHABILITY. Reachability
  had been skipped there deliberately — ignoring it is the conservative
  direction, since a branch that cannot run only removes a way to be
  non-null — and conservative is exactly what kept an ELSE-only
  predicate from concluding NULL. Both halves landed: a refuted guard
  excuses its own arm, and a PROVEN guard silences every later arm and
  the ELSE (`always-null-red.test.ts` describe F — filed in
  deferred-tasks 2d as unmeasured, falsified by one probe within the
  hour, red-then-fixed; corpus `check-guard-proven-*`). The notNull
  side's joinState gate has no counterpart here and needs none: an
  extended row nulls the column outright, a present row is the stored
  row the expression describes, and both arms end at NULL.
- **The anchor pool, which was the real floor.** Found while flipping
  the first two and invisible from the consumer side:
  `collectComparisonQuestions` drew its per-table literal pool from
  CHECK constraints ALONE. For a table whose only constraint-shaped
  expression is a generation expression it synthesized ZERO questions
  (measured), so `7 <= 10` and `7 < 10` had no answers and neither the
  substitution route nor the interval rung could fire however the
  consumers were wired. Generation expressions now sit in the pool
  beside the CHECKs — same declared column types, same atoms.

Reach beyond the subject: `alwaysNullExpr`'s new pruning immediately
made `dml-returning-written-case-guard.sql` exact in two columns, off
the STATEMENT MAP rather than the kernel — a written-value guard that
was already answering FALSE had nothing consuming it on the null side.

Both older refusals in the guard consumer were unkillable by the corpus
until the TRUE direction gave them something to hold back, and both are
now killed by `PostgreSQL returned NULL`:
`dml-returning-case-guard-old-row.sql` (an UPDATE whose SET inverts the
column its guard tests — the WHERE describes the OLD row, RETURNING
reads the NEW one, and the written-value pass cannot rescue it because
`NOT active` is no constant) and `check-guard-optional-entry.sql` (a NO
INHERIT `CHECK (x IS NOT NULL)` read through `FROM ONLY` under a LEFT
JOIN — on an extended row the guard it refutes IS true). The simple-form
gate on the new pruning has its own kill in
`always-null-simple-case-form.sql`: a bare `false` in a WHEN slot is a
VALUE, and reading it as a FALSE guard prunes the arm that fires when
the column IS false.

### Partition-bound facts (chartered 2026-08-12, BUILT 2026-08-16)

A partition's bound is a validated-CHECK-grade fact the capture never
sees: it lives in `relpartbound`, not `pg_constraint`, and
`pg_get_partition_constraintdef` renders it as an expression. Every
stored row of a non-default partition satisfies its bound — enforced by
routing and by ATTACH validation — so a DIRECT scan of a partition may
feed the bound to the kernel exactly as it feeds a validated CHECK.
Range bounds are INTERVAL facts, and interval exclusivity is live:
integer-range partitions (the fixture schema's `order_events` family is
one) yield cross-anchor refutations with no new machinery. The demand
rationale, recorded: date-range partitioning is the single most common
real-world source of constant-date constraints, which makes this rung
the organic testing ground for the datetime design below.

PRE-WORK, measured before any code (param-mechanism style, each a pin):

- What `pg_get_partition_constraintdef` renders per strategy — range,
  list, hash — and whether a range bound carries the partition key's
  `IS NOT NULL` in front (if so, direct partition scans get the key's
  notNull FREE).
- NULL routing per strategy: which partition takes a NULL key, whether
  a non-default range partition can ever hold one, and what the DEFAULT
  partition's rendered bound looks like (expected: the negated union of
  its siblings').
- ATTACH PARTITION validation: that an attached partition's rows were
  checked against the bound (the fact's soundness rests on it).
- Whether the bound holds TRUE per stored row or only notFALSE — the
  kernel's fact strength depends on the answer.

FIRST-WAVE SCOPE: range and list bounds of NON-DEFAULT partitions, fed
on direct scans of the partition relation only. Refused: DEFAULT
partitions (negated-union bounds), hash bounds (no interval or list
shape), and any bound fact on a scan of the PARENT (a tree scan reads
every partition; only the union holds, and the union says nothing).
List bounds arrive as IN-shaped facts the kernel's OR machinery already
consumes — take them if the rendering cooperates, else record.

Acceptance frame to write FIRST, adjudicated: a red block over an
integer-range partitioned family — a bound-vs-guard interval refutation
on a direct partition scan, the partition-key notNull claim (if the
IS NOT NULL measurement confirms), a parent-scan guard proving bounds
never leak upward, and a DEFAULT-partition guard proving its bound is
refused. Corpus grounding in the same commit: fixture files over the
fixture schema's own partitions, boundary rows planted.

**As built (2026-08-16).** The pre-work answered every open question in
the fact's favor (pins: param-mechanism "Partition bounds"): range
bounds carry EVERY key column's IS NOT NULL, so the notNull claim is
free; the rendered shapes are total — never NULL over any key value —
so the bound holds TRUE per stored row, stronger than a CHECK's
notFALSE (fed at validated-CHECK grade regardless; nothing needed
more); ATTACH validates every row; a nested partition renders its whole
ancestor conjunction, so a direct scan of any bound-carrying relation
— leaf or intermediate — reads facts for its entire subtree with no
tree walk. The capture is raw and ungated (`partitionBound` on the
table capture: strategy, isDefault, definition; diff-comparable, DETACH
clears it); the ADAPTER gates — non-default range and list — and
parses the rendering through the same ALTER-wrapper as CHECK
definitions into both scan faces, never the enforced list: the write
side stays out by construction, and a red-suite guard pins that scope
(PostgreSQL raises on the direct-partition NULL insert; the engine
does not claim it until a write-side rung is chartered). Parent-scan
refusal is structural, not a check: a partitioned root renders no
bound, so there is no fact to leak. Each red target's conclusion was
verified reachable through the EXISTING machinery before the frame was
written, by running the rendered bound as a plain CHECK body — feeding
was the whole build. What that measurement also showed, recorded: list
point exclusion (`k = 'q'` against `= ANY ('{a,b}')`) is NOT concluded
by today's subset rule even from a plain CHECK, so list bounds arrive
(the prefix claims notNull) but exclude no points; if that conclusion
is ever wanted it is OR-machinery work, not bound work (chartered —
"List membership exclusion" below). Hash bounds are doubly refused: no
shape, and the rendering embeds a database-local OID.

**Write-side rung (chartered 2026-08-16, BUILT 2026-08-16).** `INSERT
INTO prt_lo (id) VALUES ($1)` binding NULL raises `violates partition
constraint` (pinned), and the engine claims nothing — the first wave
fed scans only, and a red-suite guard pins that scope. The rung: feed
the same gated bounds (non-default range/list) into the GROUNDER's
channel — `resolveEnforcedCheckConstraints`'s partition arm — for DML
naming the partition directly. Writes naming the PARENT need no gate:
the grounder grounds the target relation's own constraints, and the
parent carries no bound. PRE-WORK, measured before code (the insert
case is already pinned; these are not): UPDATE on a direct-named
partition whose new row leaves the bound; MERGE arms and ON CONFLICT
targeting a partition; whether NOT-NULL-grade grounding through the
bound behaves per row on multi-row VALUES the way CHECKs do.
Acceptance: the "write side stays out" guard FLIPS into a claim, with
a parent-naming control beside it.

**As built (2026-08-16).** The pre-work answered uniformly (pins:
param-mechanism "Write-side enforcement"): UPDATE, both MERGE arms and
ON CONFLICT enforce the bound on a direct-named partition's new row
exactly as direct INSERT does, per row on multi-row VALUES with the
whole statement rejected; naming the PARENT raises nowhere — routing
moves the row, NULL to DEFAULT — and an intermediate partition's own
bound gates direct writes before routing, so a DEFAULT child rescues
nothing. One wrinkle, pinned: ON CONFLICT's update arm may move the
key WITHIN the bound and raises only when the new key would leave
(`invalid ON UPDATE specification`), while the proposed insert row is
bound-checked before the arbiter looks; the arm's claims stay
existential like every UPDATE claim (no conflict, no raise). The
build is one line: the gated bound joins the ENFORCED list beside the
two scan faces, and the grounder's existing collection does the rest —
parent writes ground nothing because a partitioned root renders no
bound. Acceptance landed as chartered plus two: the scan wave's guard
flipped into the INSERT claim with the parent-naming control beside
it, and UPDATE, list-prefix and hash-nested-range targets flipped
through the same feed; guards pin NULL-listing, DEFAULT and hash as
write-side claims-nothing. No corpus fixtures, the Mechanism E
pattern: the param-side fixture suites run evaluator-off by design,
so the claims are held by the red suite and adjudicated live by the
instrument (partition raises join the notNullRaisedOther accounting,
outside the enumerated null-rejection list).

### Settings-independent datetime literals — design B (chartered 2026-08-12, BUILT 2026-08-16)

RULING, recorded with it (2026-08-12): the full settings contract —
design C, pinning DateStyle/IntervalStyle/TimeZone by init-script
promise — is CLOSED, not deferred. Its trust model is unverifiable and
silently breakable (`SET datestyle` anywhere invalidates every claim
with no signal), and it would carry the gate's first hand-curated
lists. Reopening requires a consumer that OWNS its sessions end to end,
and starts from a fresh argument. The general rule, stated once: a
session setting enters the engine only as an EXPLICIT caller-declared
input, and only where analysis is impossible without it — `searchPath`
and `paramTypes` pass that bar (nothing resolves without them; the
hazard is loud and structural, the wrong-database class); the datetime
GUCs fail it (avoidable, and their mismatch corrupts values quietly).

Design B is the settings-INDEPENDENT middle the original deferral never
priced: a literal whose spelling is invariant under EVERY DateStyle
needs no settings assumption at all. `'2020-01-01'` parses identically
under each of the finitely many DateStyle values, so the invariance is
measurable EXHAUSTIVELY and pinned as a sweep, not assumed. The gate is
a value-SHAPE rule (precedent: the walk already reads fval digits to
split bigint from numeric):

- `date` and `timestamp` literals in strict ISO shape — admitted;
- `timestamptz` only WITH an explicit numeric offset — admitted;
- everything else — `'1/2/2020'`, offset-less timestamptz, intervals
  (IntervalStyle), and the clock strings, which FAIL THE SHAPE TEST
  automatically (`'now'` needs no curated list) — refused.

INPUT side only: the immutable-I/O rendering gate is untouched, so no
datetime value ever crosses to the driver and no datetime root is ever
collected; literals close as members and casts, where the claims live
(anchors, groundings, guards). The GUC-stable function rows stay out
with C.

PRE-WORK: the exhaustive sweep — every DateStyle value (the
order/style product) × every admitted shape × a refused-shape control,
pinned in param-mechanism.test.ts; and the shape regexes adjudicated
against PostgreSQL's own parser behavior, including the edge spellings
(two-digit years, trailing spaces, `T` separators).

Acceptance: the `ivdt` refusal record in
`check-interval-refusals.sql` flips (its ISO anchors order) and the
red-suite `dtc` guard flips likewise; date-partitioned fixtures from
the partition-bound rung become the argued-real corpus ground; a NEW
refusal record holds an ambiguous-form literal (`'1/2/2020'`) exactly
as the COLLATE "C" twin holds the collation arm.

**As built (2026-08-16).** The sweep ran FIRST and answered wider than
the charter guessed (param-mechanism, the sweep pins): every admitted
shape — T-separator, fractional and omitted seconds, date-only
timestamp, surrounding spaces, hour 24, padded low years, even
non-padded `'2020-1-2'` — is invariant across the full 12-value
order/style product, because a 4-digit leading year fixes every field's
role; `'1/2/2020'` answers THREE ways (Jan 2 / Feb 1 / out-of-range
under YMD); two-digit-leading years are order-dependent, which is why
the shape test requires 4 digits; the offset-less timestamptz moves
with TimeZone while an explicit numeric offset pins the instant. The
gate is three regexes in the evaluator beside a new narrow face,
`closedDatetimeCastTarget` (family + rendering for the three names,
alias-normalized, user-shadowing disqualifies — the standing collision
rule): the TypeCast arm consults it only AFTER `closedCastTargetType`
refuses, admits STRING literals matching the family's regex, and
refuses typmods (outside the swept language) and NULL literals (not a
spelling; kept out deliberately). One gate site covers everything —
statement-map folds, groundings, anchor questions all funnel through
the same TypeCast closure — and the rendering gate is untouched, so a
closed datetime composes as a member and never collects as a root. The
first-wave regex stays padded-strict; the measured non-padded
invariance is recorded above for any future widening. Acceptance
landed exactly as chartered plus one: the `dtc` anchor guard and the
entailment `dt` guard both flipped (the second was the same refusal
through the grounding channel); `check-interval-datetime.sql` carries
ivdt's flipped record with the ambiguous form as a WITNESSED nullable
(the generator's 2020-01-02 row fires the session's Jan-2 reading —
stronger than the collation twin's annotation, which stays for the
genuinely unwitnessable arm); and `partition-bound-datetime.sql` over
the new date-range `daily_metrics` family is the composed ground the
charter's demand rationale promised — the bound renders ISO-shaped
`::date` anchors, the shape gate admits them, and date anchors order
on a direct partition scan. `'now'`, `'today'`, intervals and named
zones die by shape with no curated list anywhere.

**Non-padded widening (chartered 2026-08-16, BUILT 2026-08-16).**
`'2020-1-2'` is already MEASURED invariant across the full sweep (a
4-digit leading year fixes the field roles — the pin exists), so the
widening is `\d{1,2}` for month/day in the three regexes and nothing
else. Two-digit YEARS stay refused — that measurement went the other
way. Acceptance: a sweep-pin line per widened family and a fixture
claim carrying a non-padded anchor beside the existing padded ones.

**As built (2026-08-16).** One edit — `DATE_BODY` takes `\d{1,2}`
month/day; the time and offset bodies stay padded, and the 4-digit
year keeps two-digit forms refused by shape. The widened regex
language admits MIXED paddings too ('2020-01-2', '2020-1-02'), so the
sweep pins cover them beside one non-padded line per family (date,
timestamp with and without T-separator, timestamptz with offset) —
all invariant across the 12-value product, measured before the edit.
`check-interval-datetime.sql` carries the fixture acceptance: a
non-padded '2019-6-1' anchor orders against ivdt's padded CHECK
anchor beside the existing ISO claims.

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

**Demand discipline, AMENDED (2026-08-12): crafted fixtures convict
beside the generated distribution.** The distribution experiment ran
first — `tri` and `bcorr` in the schema, generators and instrument
pool; 20,000 queries at seed 20260808: 1,225 reach the tables, 97
carry CASE expressions, ZERO carry comparison guards — and the zero
exposed the gate's circularity rather than the shapes' irrelevance:
the generator's CASE guards are IS-NOT-NULL-shaped BY CONSTRUCTION, so
it could only ever convict shapes someone first taught it, at which
point the vote is manufactured. The ruling: conviction by crafted
fixture is first-class, under the corpus's own gates — the fixture's
header argues the shape is one a person would write, every claim is
adjudicated against PostgreSQL before it ships, and the data states
keep the oracle checking it. The generated corpus keeps its distinct
job: finding the shapes nobody thought to craft. Under the amended
rule the two adjudicated red cases already convicted, and the RUNGS
ARE BUILT — see "As built" below. (The distribution experiment still
paid: it convicted the grounder's CASE-discriminator gap within 28
queries — a NULLed discriminator routes to the arm the written value
fails — fixed and pinned the same day.)

**As built (2026-08-12).** All four rungs, in `check-entailment.ts`,
purely propositional, no values consulted, no evaluator needed:

- Evidence shaping: `b IS TRUE` shapes into TRUE(b) and `b IS FALSE`
  into FALSE(b) at conjunct collection (a BooleanTest never evaluates
  NULL).
- notFALSE facts: comparison atoms on a CHECK's notFALSE spine — too
  weak to harvest as TRUE — join a third fact list only trichotomy
  consumes; arm selection reaches them because the harvest already
  descends into a selected CASE arm.
- Same-token trichotomy: an EXCLUSIVE_OPS table (wider than the negator
  relation — `<` excludes `=` and `>` too) gives notTRUE(col OP₂ x)
  from any TRUE or notFALSE fact (col OP₁ x) with OP₁ exclusive: a TRUE
  OP₂ needs a non-null operand, which forces OP₁ to have evaluated — to
  FALSE.
- notTRUE consumed as guard refutation: `checkConstraintsGuardTruth`
  (shared evidence collection and fixpoint with the goal question) and
  the walk's searched-CASE dispatch prunes a refuted arm exactly like a
  map-answered FALSE guard. Since 2026-08-25 the same call also answers
  TRUE, which the map-answered side always could: a proven guard ends
  the arm chain and rescues a missing ELSE. Gated per entry on
  NULL-extension (an extended row satisfies no CHECK, and `a IS NULL`
  IS true there) and wholesale on DML scopes (the OLD/NEW channel split
  is not built for guards) — both gates fixture-killed since the TRUE
  direction gave them something to hold back.

Both red cases flipped with no evaluator passed; the overreach guard
held (`<` and `<=` are not exclusive, which is the table's honesty);
the crafted conviction fixtures (`check-guard-trichotomy`,
`check-guard-arm-selection`) pin both rungs with witnessed nullable
controls across the data states.

### Closed sublinks (chartered 2026-08-16, BUILT 2026-08-16)

A sublink whose body references no tables, columns or parameters is a
closed tree wearing subquery syntax: `(SELECT 7) = 7` is semantically
constant, deparses as a scalar expression, and batches through the
existing protocol unchanged. The classification is the evaluator's own
closure question extended to a STATEMENT body — non-contextual (every
part closed, no FROM over relations) versus contextual (anything
naming scope), and contextual stays refused FOREVER under the
no-query-context wall; that boundary is not this rung's business.

First-wave scope, three tiers:

- EXPR, ANY/IN and EXISTS sublinks over table-free, SRF-free bodies —
  admitted unconditionally. A multi-row EXPR body raises ("more than
  one row"), which the raising-subtree protocol already absorbs.
- Bodies with a TARGET-LIST set-returning call — admitted behind a
  RUNTIME cardinality pre-probe: `SELECT count(*) FROM (<body> LIMIT
  cap+1) q` first; `cap+1` rows → refuse, no claim. Cap 1000, an
  explicit recorded bound. The probe is sound because target-list
  ProjectSet is LAZY under LIMIT (trap 1's own workaround, measured
  again 2026-08-16: the capped count over a 10^10 series answers in
  0ms). A static bound is impossible without interpreting SRF argument
  semantics — the banned category; the probe asks PostgreSQL instead.
- FROM-position SRF bodies — REFUSED by name. Trap 1 is exactly that
  LIMIT does not bound a FROM-position function scan in PGlite; the
  guard query itself would hang.

The cost measurements that shaped this (2026-08-16): `x IN (SELECT
generate_series(...))` early-exits on a MATCH (0ms even at 10^10) but
answering FALSE is information-theoretic exhaustion — measured linear,
~160ns/row, with the subplan's Materialize node buffering as it goes;
the 10^10 no-match case is ~27 minutes AND allocation-until-death.
Data-dependent, so no static analysis bounds it; only the pre-probe
does.

PRE-WORK, each a pin: the EXPR multi-row raise; EXISTS early-exit over
an unbounded lazy body (safe or not — decides whether EXISTS needs the
pre-probe too); the ProjectSet-LIMIT laziness the pre-probe's
soundness rests on, pinned beside trap 1's FROM-position counterpart;
what the deparser renders for each sublink type. Acceptance frame: red
targets — the `(SELECT 7) = 7` guard prune, an IN over a small
generated series through the pre-probe; guards — a correlated body
stays open, a FROM-position SRF body stays open, an over-cap body
stays open, and the statement-map/grounding consumers take sublink
answers only through the same map identity they already use.

**As built (2026-08-16).** The pre-work answered generously
(param-mechanism "Closed sublinks"; the deparser pin beside the
protocol pins): EXISTS early-exits at the first row even over a 10^10
series — it needs NO pre-probe — and the EXPR multi-row raise is
itself lazy (row two fires it at 10^10), so no admitted shape can
exhaust; the pre-probe's capped count answers 1001 in milliseconds at
10^10; EXISTS does not evaluate the body's target list; the plan-shape
pin holds trap 1's line without executing it (target list plans
ProjectSet, FROM position plans the materializing Function Scan). The
build: `typeSetVerdict` learned SubLink — EXPR takes the body's single
target set, EXISTS is boolean, ANY/ALL resolve testexpr-vs-column
through the closed-operator gate (bare `IN` means `=`) — over a body
gate that admits ONE shape, the bare projection: every clause beyond
targetList refuses by unknown-field default (FROM of any kind included:
a relation is context, a function scan is trap 1; VALUES lists and set
operations recorded as outside the wave). Tier 2 rides a new face
member, `closedSetFunctionTypes` — the set-returning twin of the
scalar gate over the SAME per-signature capture, no new capture, its
verdict the element type — admitted only at a body target's top level
(PostgreSQL's own SRF position rule) and only through the runtime
cardinality pre-probe in `evaluateClosedSubtrees` (cap 1000 recorded
as `SUBLINK_SRF_ROW_CAP`; an over-cap or raising probe drops the whole
subtree). Everything downstream was already true: the deparser renders
sublinks as scalar expressions, the batch protocol carries them, the
consumers read the same map identity — no walk or grounder change.
The allowlist census reclassified SubLink closed (SelectStmt/ResTarget
structural) and the old `(SELECT 7)`-stays-open pin flipped into the
correlated form. Acceptance as chartered plus one: three red targets
(the EXPR prune, the pre-probed IN, the unbounded EXISTS) flipped
against a stashed-build red run, with the correlated, FROM-position
and over-cap guards green — each guard's data fires the NULL a claim
would reject (the over-cap membership is in fact TRUE; refusal must
not read as FALSE). Corpus: `closed-sublink.sql` over
order_events_early carries all three tiers beside both refusals,
witnessed per data state.

**Body-clause widening (chartered 2026-08-16, NOT BUILT).** Two
shapes the first wave refuses while the oracle holds them constant
(post-landing review, adjudicated live): `(SELECT 1 UNION SELECT 1)
= 1` — a set operation over two closed halves — and `(SELECT
generate_series(1,5) LIMIT 1) = 1` — a closed LIMIT over an SRF
projection; both guards claim nothing today and neither ever fires.
The widening is PER CLAUSE, one at a time, each with its own closure
argument and measurement before code:

- Set operations: UNION/INTERSECT/EXCEPT with both halves passing the
  same body gate, result columns unified through `closedCommonTypes`.
  ALL-vs-DISTINCT is a row-count question, not a closure one.
  **BUILT 2026-08-16**, exactly as chartered. Pre-work (two pins,
  param-mechanism "Closed sublinks"): all THREE operations resolve
  their result type identically to `COALESCE` over seven operand pairs
  — the rule `closedCommonTypes` already models — and what a
  set-operation body can raise is enumerated (DISTINCT needs an
  equality operator, `json` proving it, with the ALL twin as control;
  arity must agree), each absorbed by the raising-subtree fallback.
  One parse-shape fact shaped the code and is pinned beside the
  protocol: `larg`/`rarg` hold BARE SelectStmt FIELDS, not tagged
  nodes, so the body gate recurses on fields; a release that wrapped
  them would silently refuse every set operation. Deduplication also
  keeps `(SELECT 1 UNION SELECT 1)` single-row, which is what lets an
  EXPR sublink take a two-arm body at all. Four red targets flipped
  (UNION, INTERSECT, EXCEPT, and IN over a set-operation body) with
  two guards green — a correlated ARM and a table in ONE arm each keep
  the whole body open, both witnessed by data that fires the NULL a
  claim would reject. Corpus: `closed-sublink.sql` grew the two
  claims and the correlated-arm control.
- LIMIT/OFFSET: closed count expressions. A syntactic LIMIT also
  BOUNDS an SRF body — pre-work decides whether LIMIT ≤ cap admits
  the body without the runtime pre-probe, and how LIMIT composes with
  the EXPR multi-row raise.
  **BUILT 2026-08-16**, with one gate the charter's sketch did not
  have. The pre-work's own question answered NO: the runtime pre-probe
  already bounds a LIMITed SRF body (a `LIMIT 1` body over a 10^10
  series counts immediately), so a static LIMIT ≤ cap rule would be a
  second mechanism computing what one round trip already gives.
  Composition with the EXPR raise is the plain one — LIMIT decides the
  row count the sublink is judged on. What the pre-work DID buy is two
  refusals:
  - OFFSET on an SRF-carrying body. LIMIT bounds what the probe
    RETURNS; OFFSET bounds nothing it must WALK, and the cost is
    linear in the offset (measured across 10^5/10^6/10^7 rows).
    Nothing bounds an offset statically without interpreting the
    SRF's arguments — the banned category — so the shape stays out.
  - LIMIT or OFFSET on a SET OPERATION. Found while building: without
    ORDER BY the row a LIMIT takes is whatever the deduplication
    produced, and THAT is a planner decision — the same body answers
    42 through HashAggregate and 3 through Sort+Unique (measured and
    pinned). Folding it would bake one plan's answer into a claim the
    next plan falsifies. A plain body has one row and a target-list
    SRF yields in the function's own order through ProjectSet, which
    no plan reorders; the set operation has no such guarantee.
  Four red targets flipped (the LIMITed SRF EXPR body, LIMIT and
  OFFSET on a plain projection, a membership over a LIMITed series)
  with three guards green — the SRF-with-OFFSET body, the
  set-operation LIMIT, and a correlated LIMIT count, each witnessed by
  data that fires the NULL a claim would reject. Corpus:
  `closed-sublink.sql` grew the bounded claim and the OFFSET refusal.
- ORDER BY: meaningful only beside LIMIT, and a sort key's order is
  the collation wall for collatable types — a first widening refuses
  collatable sort keys outright (the `stxc` lesson).
  **REPLACED BY ONE RULE, BUILT 2026-08-16** (decided with the user
  after the first three clauses landed, because "which clause is
  next" turned out to be the wrong question). The clause LIST was
  arbitrary — what is not arbitrary is WHY a shape is refused, and
  measuring the gate produced three reasons: SCOPE (any FROM, refused
  forever), PLAN FREEDOM (a limit slicing a body whose surviving
  order the planner chose), and UNBOUNDED WORK (an offset over an SRF
  body). Everything else was refused only because nobody had written
  the clause. So the rule: **a clause that changes WHICH ROWS a body
  has is admitted, and joins the no-slice family unless the row order
  is structural.** Under it, WHERE (with no FROM), ORDER BY and
  DISTINCT all landed in one batch:
  - WHERE keeps or drops the single Result row — the closed predicate
    is gated like any expression, and slicing is unaffected because
    a filter does not reorder.
  - ORDER BY cannot move an admitted answer at all: membership is a
    set question, EXISTS is existence, and an EXPR body still raises
    above one row. Beside a LIMIT it WOULD decide the value, so the
    charter's collatable-key refusal becomes the whole no-slice rule.
    The reason recorded here at first was the sort key's collatability
    and a `pg_type.typcollation` capture to decide it; both were wrong,
    and the shape is now CLOSED FOR GOOD below rather than priced.
  - DISTINCT deduplicates and leaves the same planner-chosen order a
    set operation leaves — 42 through HashAggregate, 3 through
    Sort+Unique, measured for both — so it is admitted and barred
    from slicing for the same reason.
  - `DISTINCT ON` and `ORDER BY ... USING <op>` stay refused: the
    first returns an unspecified row per group, the second names an
    ordering operator no gate here checks.
  Five red targets flipped with four guards green (limit-beside-
  DISTINCT, limit-beside-ORDER BY, a correlated WHERE, and the two
  refused spellings). `SortBy` joined the allowlist census as
  structural. This batch also left a hole in the VALUES branch —
  "A field admitted by the loop but read by no gate", below — and
  left GROUP BY and WITH open as questions, both now CLOSED under
  "Closed for good".
- VALUES bodies (`x IN (VALUES (1), (2))`): pre-work first — what the
  parser and deparser even do with the shape.
  **BUILT 2026-08-16**; the pre-work came back clean and made the gate
  smaller than expected. `valuesLists` is a plain array of `List` nodes
  and the deparser round-trips it, so nothing structural was in the
  way; PostgreSQL FORBIDS set-returning calls in VALUES, which takes
  the whole pre-probe question off the table (`hasSrf` is false by
  construction); row lengths must agree and are refused before
  execution; and the columns unify by position exactly as COALESCE
  unifies. A Values Scan keeps the written row order with no
  deduplication to reorder it, so a LIMIT may slice a VALUES body
  where it may not slice a set operation — the distinction the
  previous clause established. Three red targets flipped (membership
  over a VALUES body, a single-row body as an EXPR sublink, a LIMITed
  two-row body) with two guards green: a correlated element and a
  VOLATILE element, both witnessed by data that fires the NULL a claim
  would reject. Corpus: `closed-sublink.sql` carries the membership
  claim and the correlated control.

Demand is unmeasured (every verification run stayed clean without
these); the clauses ride one at a time, never as a batch.

**A field admitted by the loop but read by no gate (found and fixed
2026-08-17).** The free-clause batch put `whereClause`, `sortClause`
and `distinctClause` into `SUBLINK_BODY_FIELDS` — the set the
unknown-field loop consults — but wired the gates that JUSTIFY them
into the plain branch only, below the point where the VALUES branch
returns. WHERE and DISTINCT are syntax errors on a VALUES body, so
nothing was exposed through those; a sort is not, and `VALUES … ORDER
BY <key> LIMIT 1` was admitted with the key never read. What folded:
`ORDER BY random()` gave a DIFFERENT constant on each of ten analyses
of one statement (3 2 2 3 2 7 2 3 5 7), so the claim moved with the
analysis rather than with the statement; `ORDER BY 1 USING >` folded
2, the spelling refused on every other branch; `ORDER BY now()`
folded; and `ORDER BY (SELECT c FROM coll_probe LIMIT 1)` folded — a
sort key reading a TABLE, inside the one component whose safety
argument is that it never reaches scope.

The fix is structural rather than a fourth copy of the checks: the
three clause gates and the no-slice bar moved ABOVE the branch, so
every body shape pays them and no future branch can return past them.
The rule it leaves, which is the general form of the defect: **a field
in `SUBLINK_BODY_FIELDS` must have a gate that READS it on every path.
Listing a field is admission, and admission without inspection is not
a gate.** Guards: `subtree-evaluator.test.ts` pins all six shapes open
at the gate and keeps the unsorted `VALUES … LIMIT 1` fold as the
over-refusal control; the red suite pins the contract (both bodies
would have claimed notNull); `closed-sublink.sql` carries the
`USING >` refusal witnessed by rows.

### Closed for good: ORDER BY beside a LIMIT, GROUP BY, WITH

The free-clause batch left one shape priced-but-unbuilt and two
"still refused and unexplored". Examined 2026-08-17 and all three
CLOSED — not deferred, not costed for later. None is a clause the
one-rule test admits, and no reason below expires.

**ORDER BY beside a LIMIT — closed because a sort orders the KEY's
equivalence class, not the VALUE.** This one took two corrections to
reach, and both are recorded because the first was published.

The refusal was originally written as a collation problem needing a
per-TYPE capture (`pg_type.typcollation`, the collation captures being
per COLUMN). That was wrong, and measurement retired it: a bare
unknown literal carries no collation at all, `'a'::text` carries
`pg_catalog."default"`, and the one member of the immutable-I/O set
with a collation of its own is `name`, which carries `"C"` and
propagates it through `||`, CASE, COALESCE and `substr`; the other
nine collatable members of the 48 (`text`, `varchar`, `bpchar`, six
internal statistics types) carry `"default"`. There is no third
possibility, because both ways to name another collation are already
refused — a spelled `COLLATE` is a `CollateClause`, a column is a
`ColumnRef`, both open by default. Neither `"default"` nor `"C"` is
SESSION state: PG 18.3 has no `lc_collate` parameter to set, and
`"default"` is the database's own `datcollate`, fixed at CREATE
DATABASE. That is precisely the argument the entailment kernel already
ships for order questions on default-collated columns
(`comparison-groundings.ts`, the collation lattice). No capture was
ever owed.

The REAL obstacle is not collation and is not liftable by a capture at
all (pinned, param-mechanism "an ORDER BY orders the KEY's class"):

    VALUES (1.0),(1.00) ORDER BY column1 LIMIT 1  ->  1.0
    VALUES (1.00),(1.0) ORDER BY column1 LIMIT 1  ->  1.00

The same sorted body, two surviving values. `1.0 = 1.00` holds under
numeric's btree opclass while their typoutput renderings differ, so a
sort makes the order total on the key's EQUIVALENCE CLASS and leaves
the value inside that class undetermined — decided, here, by written
order alone. `numeric`, `float4` and `float8` all sit in the closed
48, and float8 carries the same hazard as `0.0 = -0.0` rendering `0`
and `-0`. So ORDER BY genuinely fails the one-rule test's "unless the
row order is structural": the order it establishes is not an order on
what the sublink answers. The rule needs no exception written for it —
it was always the rule's own verdict, reached for the wrong reason.

A set operation cannot be rescued by an ORDER BY either, for a second
reason measured beside the first: the deduplication picks the survivor
BEFORE the sort sees it (`1.00 UNION 1.0` answers 1.00 and `1.0 UNION
1.00` answers 1.0), and the tiebreaker below is not even spellable
there — `invalid UNION/INTERSECT/EXCEPT ORDER BY clause`.

What building it would have cost, recorded so the question is not
re-opened as cheap. It is MECHANICAL, not structural: no capture, no
walk change, no protocol change: a tie probe is a sibling of
`srfBodiesWithinCap` — clone the body's fields, deparse, one probe
query, refuse the subtree on a bad answer. The probe would append the
output's RENDERING to the sort keys in both directions and admit only
on agreement, which is exact for `LIMIT 1` (if a tie group's
text-least and text-greatest render alike, every member does):
measured, the numeric pair disagrees (`1.0` vs `1.00`) while
`VALUES (2),(1)` agrees. But it cannot edit the sort clause in place —
a set operation rejects the tiebreaker outright and
`SELECT generate_series(1,3) AS g ORDER BY g, g::text` fails with
`column "g" does not exist` — so it must wrap the body, and it spends
a round trip per sliced body. That is one more mechanism and one more
round trip, bought for plain-SRF and VALUES bodies only, against
demand that every verification run has measured at zero. Refusing is
the sound side; the trade was declined 2026-08-17 with the user.

**GROUP BY — closed because the value is zero and the cost is not.**
The recorded reason, "degenerate without a FROM", is FALSE, and the
true one is worse for the clause. With no FROM there is one input row,
but grouping does not therefore leave one output row: measured,
`SELECT 7 GROUP BY GROUPING SETS ((), ())` returns TWO rows and
`SELECT 7 GROUP BY CUBE (1)` returns two — enough to make an EXPR body
raise — while `SELECT (SELECT 7 GROUP BY 1 HAVING false)` returns
NONE, which makes it NULL. Grouping sets, CUBE/ROLLUP and HAVING all
arrive through the same two fields (`groupClause`, `havingClause`), so
"admit GROUP BY" is three admissions needing three separate arguments.
Against that cost: the shape that would PAY is `SELECT max(x) FROM t`,
which needs a FROM and is refused forever under the first boundary,
and what is left over buys nothing — `(SELECT 7 GROUP BY 1)` is the
same 7. Zero value, non-zero cost, and no path to value that does not
cross the scope wall.

**WITH — closed because consuming a CTE means resolving a NAME.** The
CTE's own body is not the obstacle: it would pass through
`closedSelectBody` like any other and die honestly on the first
`ColumnRef`. The obstacle is the outer body that USES it. `SELECT *
FROM c` is a `ColumnRef` carrying `A_Star`; `SELECT c.x FROM c` is a
`ColumnRef` carrying fields. There is no third spelling — a CTE is
consumed by naming its columns — so admitting WITH means admitting
ColumnRef and expanding names out of a CTE's target list. That is the
one line this evaluator is defined by: *it never resolves a name, it
only detects one*, which is what makes joins, aliases, correlation and
LATERAL somebody else's problem BY CONSTRUCTION rather than by a list
of handled cases. It is not a trade worth making for `(WITH c AS
(SELECT 7) SELECT * FROM c)`.

One further measurement, against the framing that a CTE is a sealed
sub-statement — "a small scope of its own". It is not: `SELECT (WITH c
AS (SELECT t.x) SELECT * FROM c) FROM (SELECT 1 AS x) t` returns 1, so
a CTE inside a sublink reads the OUTER query's columns. Closure
catches that today (the reference is a ColumnRef and refuses), but it
means a CTE is a correlation SITE, not an island, and any future
argument for admitting one starts from a worse position than the
framing that opened this question.

## Boundaries, each verified against a real candidate

- NO QUERY CONTEXT, ever. `WHERE col = 5 AND f(col)` does not make
  `f(col)` evaluable. A consumer that can argue a substitution is sound
  makes that argument itself and hands the evaluator another closed tree.
- Structural facts over open trees are refused:
  `array_length(ARRAY[p.id, p.id], 1)` is always 2, but the tree holds
  names — that is (possible, future) symbolic business, not evaluation.
- Set-returning shapes and table-free SubLinks were excluded from the
  first build and are now BUILT — "Closed sublinks" above; the
  contextual/correlated form stays refused under the first bullet.
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
