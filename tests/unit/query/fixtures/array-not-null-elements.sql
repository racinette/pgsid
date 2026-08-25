-- NOT NULL on an ARRAY column binds the ARRAY, never its ELEMENTS.
--
-- `arr_nn.vals` is `text[] NOT NULL` and every generated row holds
-- `{word-N,NULL}` — a value the constraint accepts, because the constraint is
-- about the array being present and says nothing about what is in it. The
-- unnest expansion therefore produces a NULL element from a column no state
-- can leave NULL, which is the distinction the whole fixture exists for.
--
-- WITH ORDINALITY's counter is generated per row and is always present, so it
-- is the non-null column beside the nullable one it indexes.
--
-- The divergence recorded against sqlc for
-- `unnest_with_ordinality/GetValues`. Measured on the pinned sqlc v1.31.1: the
-- element is correctly nullable there until a CAST is applied to it, at which
-- point it flips to NOT NULL — the cast branch reads the target type name and
-- never the argument (typecast.sql pins the rule it is missing).
SELECT
  a.id,   -- @notNull
  y.val,  -- @nullable  (a NULL element of a NOT NULL array)
  y.ord   -- @notNull   (the ordinality counter)
FROM arr_nn a, unnest(a.vals) WITH ORDINALITY AS y(val, ord)
