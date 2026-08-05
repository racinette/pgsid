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
-- The candidate set drops wholesale for a name pg_catalog also carries,
-- because with no builtin signatures in the snapshot no consensus over the
-- user's half is sound — the same finding reached a user `lower(integer)`
-- making `lower(NULL::text)` read notNull, where the signatures do not even
-- match. The QUALIFIED spelling is the control and keeps its precision: it
-- names the user's function, which is what then runs.
SELECT
  min_scale('NaN'::numeric) AS shadowed,          -- @nullable
  to_number('', '') AS shadowed2,                 -- @nullable
  public.min_scale('NaN'::numeric) AS qualified   -- @notNull
