-- Inside a LANGUAGE sql body, a builtin CALL narrows its signature by the
-- PARAMETER'S DECLARED TYPE — the site the type threading did not reach until
-- the function overload merge (docs/function-overload-merge.md, "The second
-- site the types never reach").
--
-- Both functions are IMMUTABLE STRICT, both are called with literals, both
-- bodies are a single expression over their own parameters, and the walk
-- inlines both (priority 5, LANGUAGE sql body recursion). They used to part
-- on what the body expression needed to know:
--
--   body_concat  `SELECT $1 || ' ' || $2`   → notNull, then and now
--   body_upper   `SELECT UPPER($1)`         → nullable BEFORE, notNull now
--
-- `||` is total over non-null operands and the operator path decides that
-- without asking what type the operands are. `upper` needs its SIGNATURE
-- narrowed: it has a total `(text)` row and an `(anyrange)` row that is NULL
-- for an empty range, which is why it is not in the name-level totality set at
-- all (builtin-range-lower-upper.sql pins that side). Typed dispatch separates
-- them whenever the argument's type is known — builtin-lower-upper-text.sql
-- pins `upper(<a NOT NULL text column>)`. Here the argument is `$1`, and a
-- body's `$1` is the FUNCTION's parameter, declared `text`.
--
-- Two things had to be true for that to reach the dispatch, and the fix is
-- both: the body context now carries the declared argument TYPES beside the
-- argument nullability it already carried, and a `$n` inside a body reads them
-- INSTEAD of the statement's `paramTypes` — which described an unrelated
-- binding that merely shared the position.
SELECT
  body_upper('a')        AS up,   -- @notNull   (narrowed to upper(text))
  body_concat('a', 'b')  AS cat   -- @notNull   (the operator path, unchanged)
