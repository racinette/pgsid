# Subtree evaluation (chartered 2026-08-11, NOT BUILT)

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
that closes (survey 2026-08-11); the census majority records data-shape
reasons, which the boundaries above refuse by design. New statement-map
claims land mostly on the literal-heavy generated corpus, where the oracle
adjudicates automatically; the CHECK grounder closes the discovery
instrument's standing finding (`subscription_check1`, ~9 per 20,000, both
seeds — verify with 20,000-query runs at two seeds when it flips).

## Rollout

1. Evaluator core, standalone, with its pins (allowlist census, the
   volatility-of-casts pin, batching, `result_types`).
2. Statement map consumer — flip its red block.
3. CHECK grounder — flip its block; the standing finding goes to zero.
4. Entailment later, under its own soundness argument, when chartered.
