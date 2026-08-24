# pgsql-deparser limitations — measured, and why they bound the engine

**Measured 2026-08-23 against `pgsql-deparser` 18.1.1 with `libpg-query` 18.0.1
(PostgreSQL 18.3 via PGlite).** Re-measure by version, not by intuition.

This file exists because the exploration behind it has now been performed
TWICE, from scratch, reaching the same conclusions both times. It is not a
list of bugs for their own sake: each entry bounds something the engine can
do, and the second exploration re-derived the bounds because the first one's
conclusions lived only in a `KNOWN_DEVIATIONS` map keyed by fixture name.
**If you are about to test whether the deparser can render some construct,
read this first and add to it rather than restarting.**

## Where the deparser is and is not on the path

It is NOT on the static corpus's execution path. `tests/unit/query/fixtures/*.sql`
are text; `nullability-soundness.test.ts` and `fixture-args.ts` hand that text
to PGlite verbatim and reference no deparser. A deparser defect cannot make a
static fixture wrong.

It IS on two paths:

- **The generated corpus** (`docs/query-generator.md`) constructs ASTs,
  deparses them, and re-parses the text so the engine and PostgreSQL analyse
  one identical string. Everything below is a construct the generator must not
  request, or must request only behind an expected-node check.
- **The subtree evaluator** (`src/query/subtree-evaluator.ts`) renders
  `SELECT (subtree) AS e0, …` for closed subtrees, and DOES run over static
  fixtures. Its allowlist is what keeps the defects below out of its way —
  a window call is refused outright (`f.over !== undefined`), so no frame
  bound is ever inside a closed subtree.

`tests/unit/query/deparser-roundtrip.test.ts` measures the whole fixture
corpus against the deparser and pins the outcome per fixture. The corpus is
the most construct-diverse SQL in the project, which is what makes it a useful
probe; the failure mode it hunts is the SILENT one, where text parses cleanly
and no longer means what the AST said.

## 1. The entire SQL/JSON node family throws

Nine constructs, all `deparse-threw`, no partial support:

    JSON_TABLE(...)              JSON_ARRAY(...)        JSON_SERIALIZE(...)
    JSON_VALUE(...)              JSON_OBJECT(...)       JSON_SCALAR(...)
    JSON_QUERY(...)              JSON_EXISTS(...)       <expr> IS JSON

Repro (any one of them):

```sql
SELECT * FROM JSON_TABLE('{"a":1}'::jsonb, '$' COLUMNS (a int PATH '$.a'));
SELECT JSON_VALUE('{"a":1}'::jsonb, '$.a' RETURNING int);
SELECT JSON_EXISTS('{"a":1}'::jsonb, '$.a');
SELECT ('{"a":1}' IS JSON);
```

The ordinary jsonpath FUNCTIONS and operators are unaffected and round-trip
identically — `jsonb_path_query_array('{"a":1}'::jsonb, '$.a')`,
`'{"a":1}'::jsonb -> 'a'`. So the boundary is the dedicated SQL/JSON parse
nodes, not JSON support.

**What this costs the engine.** FOUR `@unwitnessable` claims stay recorded
that a two-line probe would otherwise close — `xmltable-jsontable` columns 4
and 9, `jsontable-lone-nested-empty-path`, and
`jsontable-nested-in-nested-ordinality`. Each is a JSON_TABLE column over a
document that is a LITERAL IN THE STATEMENT, so the exact question — "is this
column ever NULL over the rows this item produces" — has an exact probe:

```sql
SELECT bool_and(a IS NOT NULL) FROM JSON_TABLE('{"a":1}'::jsonb, '$' COLUMNS (a int PATH '$.a'))
```

That probe delegates every jsonpath and NESTED-PATH semantic to PostgreSQL,
which is the only thing that would make it trustworthy — and it is exactly
what cannot be spelled, because the item cannot be rendered. **The engine
stays CORRECT and becomes CONSERVATIVE**: it calls those columns nullable,
which is never wrong, only imprecise.

Two routes were considered and both rejected for now:

- Composing the jsonpath strings by hand (splice the root path onto each
  column path, model NESTED PATH's outer-join row semantics). **Rejected**: it
  re-implements the thing being measured, in the one area where the engine's
  own comments record four separately measured behaviours.
- A purpose-built, fail-closed JSON_TABLE printer — print, reparse, compare
  the `JsonTable` AST with locations stripped, refuse unless equal. Sound and
  bounded, and it re-implements no jsonpath semantics. **Deferred**: it is a
  hand-written renderer for one node family, and waiting for upstream costs
  nothing but precision.

**`srf-padding-unlisted-builtin` was grouped with these and does not belong —
but it is not blocked by THIS file either, and the distinction is worth
keeping straight.** It asks a CARDINALITY — how many rows
`jsonb_path_query_tz('[1,2,3]'::jsonb, '$[*]')` emits — of an ORDINARY
function, which renders and runs today:

```
SELECT count(*) AS n FROM jsonb_path_query_tz('[1,2,3]'::jsonb, '$[*]')  ->  3
```

**Rendering the probe is not the gate.** That call is STABLE, so the closure
gate refuses it and should: a stable function's analysis-time cardinality is
not a promise about its cardinality at execution time, and the padding turns
that count into a notNull claim. See `docs/deferred-tasks.md`. Recording it
here only because "it deparses" was briefly mistaken for "it is available".

## 2. Window frame OFFSET bounds are re-emitted wrong, mostly silently

The start bound's `PRECEDING`/`FOLLOWING` keyword is not taken from the start's
own frame option when the start is an offset, and `UNBOUNDED FOLLOWING` as the
END bound is emitted as `CURRENT ROW` in that case. Measured over nine
spellings of `SELECT sum(a) OVER (ORDER BY a <frame>) FROM t`:

| input frame | emitted | |
|---|---|---|
| `ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING` | *(unchanged)* | ok |
| `ROWS BETWEEN 1 PRECEDING AND CURRENT ROW` | *(unchanged)* | ok |
| `ROWS BETWEEN CURRENT ROW AND 1 FOLLOWING` | *(unchanged)* | ok |
| `ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING` | *(unchanged)* | ok |
| `ROWS BETWEEN UNBOUNDED PRECEDING AND 1 FOLLOWING` | *(unchanged)* | ok |
| `ROWS BETWEEN 1 PRECEDING AND 2 PRECEDING` | `1 FOLLOWING AND 2 PRECEDING` | **rejected by the parser** |
| `ROWS BETWEEN 1 FOLLOWING AND 2 FOLLOWING` | `1 PRECEDING AND 2 FOLLOWING` | **silent** |
| `ROWS BETWEEN 1 FOLLOWING AND UNBOUNDED FOLLOWING` | `1 PRECEDING AND CURRENT ROW` | **silent** |
| `ROWS BETWEEN 1 PRECEDING AND UNBOUNDED FOLLOWING` | `1 FOLLOWING AND CURRENT ROW` | **silent** |

So a frame is safe exactly when the start bound is not an offset, or the end
bound is `CURRENT ROW` or an offset `FOLLOWING`. Three of the four failures
produce VALID SQL DESCRIBING A DIFFERENT FRAME — the one loud case
(`frame starting from following row cannot have preceding rows`) is the one
that was already pinned, which is why the wider defect went unnoticed.

**What this costs the engine.** Nothing in correctness: `param-window-frame-offset.sql`
carries the frame controls and is pinned `reparse-failed`. **The generator must
not request an offset frame bound** without an expected-node check.

## 3. XMLTABLE is re-emitted as four separate defects

```
IN : SELECT * FROM XMLTABLE('/r' PASSING xml '<r/>' COLUMNS a int PATH 'a' NOT NULL)
OUT: SELECT * FROM '<r/>'::xml PASSING '/r' COLUMNS (a int PATH ''a'')
```

1. The `XMLTABLE(` keyword and its parentheses are dropped.
2. The row expression `'/r'` and the document are **swapped**.
3. The column PATH literal is emitted with **doubled quotes** — `''a''`.
4. A column's `NOT NULL` is **dropped**, which is a semantic loss: an XMLTABLE
   column declared NOT NULL is enforced, PostgreSQL raising rather than
   emitting NULL.

This was masked until 2026-08-23: the only XMLTABLE fixture is
`xmltable-jsontable.sql`, whose outcome was already `deparse-threw` because of
the JSON_TABLE sitting beside it, so the XMLTABLE defect never had a chance to
report itself. **A fixture pinned at a LOUDER outcome hides every quieter
defect in the same file.**

## 4. Silent drops that were already known

| construct | outcome |
|---|---|
| `WITH RECURSIVE … SEARCH DEPTH FIRST BY n SET s` | clause dropped, SQL still parses — **silent** |
| `WITH RECURSIVE … CYCLE n SET y USING p` | clause dropped, SQL still parses — **silent** |
| subscripting in `expression-node-coverage`, `array-slices` | stray `[`, parser rejects |

Round-trip cleanly, for the record: `MERGE`, array subscripts `a[1]`, array
slices `a[1:2]` in isolation, and every jsonpath function and operator.

### The subscripting defect, measured down to the argument kind (2026-08-24)

The row above says "stray `[`". It is narrower and more useful than that: the
deparser emits the PARENTHESES a subscripted expression needs for some
argument kinds and drops them for others. A bare name (`a[1]`) needs none,
which is why the isolation cases round-trip.

| `SELECT <expr>` | emitted | PostgreSQL |
|---|---|---|
| `(array_remove(…))[1]` | `(array_remove(…))[1]` | accepted |
| `('{"a":1}'::jsonb)['a']` | `('{"a":1}'::jsonb)['a']` | accepted |
| `((SELECT ARRAY['a']))[1]` | `((SELECT ARRAY['a']))[1]` | accepted |
| `(ARRAY['a','b'])[1]` | `ARRAY['a', 'b'][1]` | **syntax error** |
| `(CASE … END)[1]` | `CASE … END[1]` | **syntax error** |
| `(COALESCE(…))[1]` | `COALESCE(…)[1]` | **syntax error** |

So: parenthesised for `FuncCall`, `TypeCast` and `SubLink`; dropped for the
constructor-shaped kinds. `(ROW(1,2))[1]` renders with parentheses and
PostgreSQL rejects it anyway — records are not subscriptable, so that one is
not a deparser defect.

This is a GATE, not a note. The subtree evaluator renders every collected
subtree through `deparseSelect`, and a batch whose render is rejected returns
NOTHING for the whole statement — one unrenderable subtree would cost every
other answer in the same query. `subtree-evaluator.ts` therefore admits
`A_Indirection` only over the three argument kinds above
(`SUBSCRIPTABLE_ARG_TAGS`), and `closed-grammar-subscript.sql` carries both
sides of the split. Remove the gate when the upstream issue lands.

### Every SQL/JSON expression node is unhandled (2026-08-24)

Measured as one blocker rather than seven: `deparseSync` throws
`Deparser does not handle node type` for **all** of `JsonIsPredicate`,
`JsonObjectConstructor`, `JsonArrayConstructor`, `JsonScalarExpr`,
`JsonParseExpr`, `JsonSerializeExpr` and `JsonFuncExpr` — the last covering
`JSON_VALUE`, `JSON_QUERY` and `JSON_EXISTS` alike. `JsonTable` (issue B
below) is the same family seen from the FROM side.

Each of those expressions answers a definite value from all-literal arguments
(measured in `closed-grammar-red.test.ts`), so the closed grammar could admit
every one of them and is blocked on this alone. That makes filing the
missing-feature issue below the single action that unblocks seven node kinds
at once — which is a better reason to send it than tidiness.

## Bug report — drafted, not filed

Ready to send to <https://github.com/launchql/pgsql-parser> (the
`pgsql-deparser` package). Two separate issues; the SQL/JSON one is a missing
feature, the frame and XMLTABLE ones are correctness defects and the more
urgent of the two.

---

### Issue A — window frame offset bounds are emitted with the wrong direction

**Version:** `pgsql-deparser` 18.1.1, `libpg-query` 18.0.1

When a window frame's START bound is an offset (`N PRECEDING` / `N FOLLOWING`),
the emitted direction keyword does not follow the start bound's own frame
option, and an end bound of `UNBOUNDED FOLLOWING` is emitted as `CURRENT ROW`.
Three of the four broken cases produce valid SQL that describes a different
frame, so the corruption is silent.

```js
import { parse } from "libpg-query";
import { deparse } from "pgsql-deparser";

for (const frame of [
  "ROWS BETWEEN 1 PRECEDING AND 2 PRECEDING",
  "ROWS BETWEEN 1 FOLLOWING AND 2 FOLLOWING",
  "ROWS BETWEEN 1 FOLLOWING AND UNBOUNDED FOLLOWING",
  "ROWS BETWEEN 1 PRECEDING AND UNBOUNDED FOLLOWING",
]) {
  const sql = `SELECT sum(a) OVER (ORDER BY a ${frame}) FROM t`;
  console.log(frame, "->", await deparse(await parse(sql)));
}
```

| input | emitted | |
|---|---|---|
| `1 PRECEDING AND 2 PRECEDING` | `1 FOLLOWING AND 2 PRECEDING` | parser rejects |
| `1 FOLLOWING AND 2 FOLLOWING` | `1 PRECEDING AND 2 FOLLOWING` | silent |
| `1 FOLLOWING AND UNBOUNDED FOLLOWING` | `1 PRECEDING AND CURRENT ROW` | silent |
| `1 PRECEDING AND UNBOUNDED FOLLOWING` | `1 FOLLOWING AND CURRENT ROW` | silent |

Unaffected: any frame whose start is `UNBOUNDED PRECEDING` or `CURRENT ROW`,
and `N PRECEDING AND <CURRENT ROW | N FOLLOWING>`.

Expected: the emitted text re-parses to the same `WindowDef.frameOptions`.

---

### Issue B — XMLTABLE is emitted unparseable, with the row expression and document swapped

**Version:** `pgsql-deparser` 18.1.1, `libpg-query` 18.0.1

```js
const sql = `SELECT * FROM XMLTABLE('/r' PASSING xml '<r/>' COLUMNS a int PATH 'a' NOT NULL)`;
console.log(await deparse(await parse(sql)));
// SELECT * FROM '<r/>'::xml PASSING '/r' COLUMNS (a int PATH ''a'')
```

Four defects in one rendering: the `XMLTABLE(…)` wrapper is dropped; the row
expression and the document argument are swapped; the column PATH literal is
quoted twice (`''a''`); and a column's `NOT NULL` is dropped, which changes
meaning, since PostgreSQL enforces it by raising rather than emitting NULL.

---

### Issue C — the SQL/JSON node family is unsupported

**Version:** `pgsql-deparser` 18.1.1, `libpg-query` 18.0.1

`deparse` throws for every dedicated SQL/JSON parse node. Ordinary jsonpath
functions and operators are unaffected.

```sql
SELECT * FROM JSON_TABLE('{"a":1}'::jsonb, '$' COLUMNS (a int PATH '$.a'));
SELECT JSON_VALUE('{"a":1}'::jsonb, '$.a' RETURNING int);
SELECT JSON_QUERY('{"a":1}'::jsonb, '$.a');
SELECT JSON_EXISTS('{"a":1}'::jsonb, '$.a');
SELECT JSON_ARRAY(1, 2);
SELECT JSON_OBJECT('k': 1);
SELECT JSON_SERIALIZE('{"a":1}'::jsonb);
SELECT JSON_SCALAR(1);
SELECT ('{"a":1}' IS JSON);
```

`JSON_TABLE` is the one we would most like: rendering a JSON_TABLE whose
document and paths are literals lets it be executed as a probe, which is the
only way to ask a jsonpath question without re-implementing jsonpath.
