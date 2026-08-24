-- A VARIADIC-ONLY USER OVERLOAD BESIDE A PLAIN ONE — the projection crash pin.
--
-- Found by the pg-regress replay (2026-08-24): `textmultirange(...)` — the
-- constructor PostgreSQL auto-creates for CREATE TYPE ... AS RANGE — crashed
-- the walk with `Cannot read properties of undefined (reading 'endsWith')`.
-- The user-row projections built a variadic row's `args` WITHOUT the variadic
-- parameter (pg_proc.proargtypes includes it, and the builtin capture
-- therefore does too), so a variadic-only signature arrived as
-- `variadic ≠ null, args = []` and selectBuiltinRows' paramAt indexed
-- args[-1]. fb_var reproduces the shape exactly: the name is overloaded (so
-- metadata declines and the merged 6b pool is consulted at all), and the
-- variadic overload's only parameter is the variadic one.
--
-- The claim itself is ordinary: the variadic body returns NULL on every row,
-- so nullable is witnessed on every execution. What this fixture pins is
-- that the walk ANSWERS — before the fix it threw, and the whole fixture
-- suite is the gate for that.
SELECT
  fb_var('a', ck.val) AS vhit  -- @nullable
FROM ck
