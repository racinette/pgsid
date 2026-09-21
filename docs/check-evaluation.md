# CHECK predicate evaluation

Settled model for generated domain and table CHECK validators. Scalar
helpers that implement PostgreSQL operators are unchanged: they return SQL
values. This file is the boolean lattice used when those values are *used as
a constraint*.

Stage 1 goldens still compare SQL `TRUE` / `FALSE` / `NULL` to PGlite. Do
not introduce `UNCERTAIN` into that pipeline. Implement this lattice when
CHECK codegen starts, before the first incomplete operator and before the
first generated validator ships as `boolean | null`.

## Two types

**`SqlBoolean`** is PostgreSQL's three-valued boolean: `TRUE`, `FALSE`,
`NULL`. Total operators (`integerLt`, `textEq`, …) keep returning it. A
result of `NULL` here means PostgreSQL would also yield SQL null.

**`EvalBool`** is the CHECK-predicate type. Four constructors:

| Constructor | Meaning | PostgreSQL would |
| ----------- | ------- | ---------------- |
| `Certain(TRUE)` | we evaluated; result is true | true |
| `Certain(FALSE)` | we evaluated; result is false | false |
| `Certain(NULL)` | we evaluated; result is SQL null | null |
| `Uncertain` | we did not evaluate this atom | unknown; maybe any of the three |

`Uncertain` is not SQL `NULL`. SQL null is an answer and CHECK-in-Postgres
treats it as pass. `Uncertain` is the absence of an answer.

Go shape: `Certain(sqlBoolean) EvalBool` at the call site that feeds `AND` /
`OR`. Incomplete operators return `EvalBool` directly and never go through
`Certain`. TypeScript uses the same constructors.

## Why four, not three

A CHECK such as `a < 1000 AND c ~ b` must keep running after a lint-unsafe
pattern. It must not claim `TRUE`. It must not claim `FALSE` from an atom we
did not run. It must still reject when `a < 1000` is already false.

Encoding the missing regex as SQL `NULL` would make the constraint pass
locally. Insert validation would accept rows PostgreSQL would reject.

## Absorption

`AND` / `OR` keep Kleene tables on the SQL component and let a deciding
value **kill** uncertainty. Thunks stay: if the left arm of `AND` is
`Certain(FALSE)`, the right arm is not called.

| Left | Right | `AND` |
| ---- | ----- | ----- |
| `Certain(FALSE)` | anything, including not called | `Certain(FALSE)` |
| `Certain(TRUE)` | `Certain(x)` | `Certain(x)` |
| `Certain(TRUE)` | `Uncertain` | `Uncertain` |
| `Certain(NULL)` | `Certain(FALSE)` | `Certain(FALSE)` |
| `Certain(NULL)` | `Certain(TRUE)` or `Certain(NULL)` | `Certain(NULL)` |
| `Certain(NULL)` | `Uncertain` | `Uncertain` |
| `Uncertain` | `Certain(FALSE)` | `Certain(FALSE)` |
| `Uncertain` | otherwise | `Uncertain` |

| Left | Right | `OR` |
| ---- | ----- | ----- |
| `Certain(TRUE)` | anything, including not called | `Certain(TRUE)` |
| `Certain(FALSE)` | `Certain(x)` | `Certain(x)` |
| `Certain(FALSE)` | `Uncertain` | `Uncertain` |
| `Certain(NULL)` | `Certain(TRUE)` | `Certain(TRUE)` |
| `Certain(NULL)` | `Certain(FALSE)` or `Certain(NULL)` | `Certain(NULL)` |
| `Certain(NULL)` | `Uncertain` | `Uncertain` |
| `Uncertain` | `Certain(TRUE)` | `Certain(TRUE)` |
| `Uncertain` | otherwise | `Uncertain` |

`NOT Uncertain` is `Uncertain`. `NOT Certain(x)` is `Certain` of SQL `NOT x`.

`NULL AND Uncertain` stays `Uncertain` because the other arm might have been
`FALSE`. Same dual for `OR` and `TRUE`.

## CASE

A `WHEN` that is `Uncertain` makes the whole `CASE` `Uncertain`: we cannot
know whether to take that arm or a later one. A `WHEN` that is not
`Certain(TRUE)` is skipped exactly as in SQL (`FALSE` and SQL `NULL`).
`IS TRUE` / `IS FALSE` / `IS UNKNOWN` on `Uncertain` are `Uncertain`.
Comparing `Uncertain` to a boolean is `Uncertain`.

Raising (`22008`, malformed input, …) is not `Uncertain`. Errors still
propagate.

## Where `Uncertain` comes from

Only incomplete atoms, never total operators:

- A regex (or similar) call whose runtime pattern fails the frozen
  whitelist linter. A whitelist hit is a normal evaluation (`Certain`).
- A CHECK node that was not lowered (unsupported overload, session-dependent
  leftover). Never omit the constraint; the atom is `Uncertain`.
- A partial-row validator whose CHECK reads a field that was not supplied.
  Omission is not SQL `NULL`.

Host regex engines are not substitutes for PostgreSQL's ARE. LIKE is a
separate C-port batch and, once faithful, is total — it returns `SqlBoolean`,
lifted with `Certain`.

## Constraint wrapper

The expression yields `EvalBool`. The function an app calls maps that:

| `EvalBool` | Insert validation | `SELECT` of an already-stored row |
| ---------- | ----------------- | --------------------------------- |
| `Certain(TRUE)` or `Certain(NULL)` | pass | pass |
| `Certain(FALSE)` | reject | reject |
| `Uncertain` | do not decide; send the row to PostgreSQL | ignore the flag; the server already accepted the row |

`SELECT` and `INSERT` share the evaluator. They differ only in whether
`Uncertain` is a fall-through or a no-op. Collapsing `Uncertain` to SQL
`NULL` at this boundary is the lie the extra constructor exists to prevent.

PostgreSQL's own CHECK still treats SQL null as pass. Client `Certain(NULL)`
matches that. Client `Uncertain` does not.

## Rejected encodings

- **`boolean | null` as the generated CHECK API.** Every consumer already
  treats null as pass. Adding a fourth state later is a breaking change.
- **SQL `NULL` as the only signal that we did not evaluate.** Same trap.
- **`FALSE` for an unevaluated atom.** Rejects rows PostgreSQL would accept.
- **`TRUE` for an unevaluated atom.** Accepts rows PostgreSQL would reject.
- **Shipping Spencer (WASM/cgo) in every adopter** to avoid `Uncertain`.
- **Binding `textregexeq(text, text)` as a total `SqlBoolean` function.**
  Dynamic patterns are a runtime lint plus `EvalBool`, not a promise that
  every string is an evaluation target.

## What this is not

This is not a change to stage-1 scalar helpers, observations, or goldens.
`integerLt` does not grow a certainty bit. `sqlBooleanAnd` used to evaluate
SQL `AND` against PGlite stays three-valued.

CHECK codegen gets a sibling connective that takes `EvalBool` thunks. The
first incomplete operator plugs into that connective; it does not redesign
it.
