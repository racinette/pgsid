-- pg_catalog is searched IMPLICITLY and FIRST (adversarial-3 finding 6).
-- Every builtin table in the engine was documented the other way round —
-- "consulted only where the user catalog has no candidate, so a user
-- function of the same name still wins" — and PostgreSQL's rule is the
-- opposite: unless the path names pg_catalog, a builtin with an identical
-- signature HIDES the user function. `public.min_scale(numeric)` and
-- `public.to_number(text, text)` exist in this schema and return the NOT
-- NULL domain non_empty_text; the engine read them as the single candidate
-- and claimed notNull, while both calls below return NULL, from
-- pg_catalog's (`pg_typeof` is `integer` for the first — measured).
-- The candidate set USED to drop wholesale for a name pg_catalog also
-- carries, because with no builtin signatures in the snapshot no consensus
-- over the user's half was sound. That compensation is gone (2026-08-20,
-- docs/function-overload-merge.md) and it was never safe: dropping the user
-- half let a curated totality table answer for a call PostgreSQL runs against
-- a user body, which is a rank 1 whenever the user's returns NULL. Both rows
-- now enter one pool, neither is dropped, and the two claims below come from
-- CONSENSUS over survivors that share a signature exactly — which is also why
-- no search-path position has to be modelled to reach them.
--
-- builtin-name-collision-elimination.sql pins the other half: a collision at
-- DIFFERENT argument types, where elimination separates the rows and the
-- builtin keeps its precision outright.
--
-- The QUALIFIED spelling is the control and keeps its precision: it names the
-- user's function, which is what then runs, and the walk reads that function's
-- own body rather than any table.
SELECT
  min_scale('NaN'::numeric) AS shadowed,          -- @nullable
  to_number('', '') AS shadowed2,                 -- @nullable
  public.min_scale('NaN'::numeric) AS qualified   -- @notNull
