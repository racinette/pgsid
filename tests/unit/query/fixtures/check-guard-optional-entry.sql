-- The NULL-extendable refusal in the kernel's guard consumer, witnessed.
-- The per-entry runs skip an OPTIONAL entry because an extended row
-- satisfies no CHECK of the table it stands for — and this statement is
-- where that stops being caution: `ni_p`'s `CHECK (x IS NOT NULL)`
-- refutes the guard `g.x IS NULL` on every STORED row, and on an
-- extended row that same guard is TRUE. Pruning the arm would drop the
-- only branch that can return NULL and leave the literal ELSE claiming
-- notNull; PostgreSQL returns NULL on every t row `ni_p` has no match
-- for.
--
-- `ONLY` is load-bearing twice over: the constraint is NO INHERIT, so a
-- tree scan does not read it at all and the refutation the refusal
-- guards against would never arise.
--
-- The refusal predates the guard consumer's TRUE direction (2026-08-25);
-- this file is what stops the older half from being a gate nothing
-- tests, now that more rides on it.
SELECT
  CASE WHEN g.x IS NULL THEN g.x ELSE 'stored' END AS arm_or_else -- @nullable
FROM t
LEFT JOIN ONLY ni_p g ON t.id = g.id
