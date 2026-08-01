-- Arity filtering resolves what name-level lookup cannot: ship has two
-- overloads, but a one-argument call can only be ship(nn_text), so $1 is
-- typed as the NOT NULL domain and rejected at Bind (mechanism A) — the
-- [null] binding raises in every state — and any returned row proves $1
-- non-null, narrowing the strict concatenation.
-- @args ["lb"]
-- @param 1 notNull
SELECT
  t.id AS tid,     -- @notNull
  $1 || '!' AS echo -- @notNull
FROM t
WHERE ship($1) = 'lb'
