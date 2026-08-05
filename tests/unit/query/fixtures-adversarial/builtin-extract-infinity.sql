-- FINDING 11 (rank 1) — `extract` and `date_part` are in
-- STRICT_TOTAL_BUILTINS and are not total. For an INFINITE timestamp,
-- timestamptz, date or interval PostgreSQL returns ±Infinity only for the
-- monotonically-increasing fields (epoch, julian, year, decade, century,
-- millennium) and NULL for every other field (measured — month, day, hour,
-- dow). Both names dispatch to the same function; `extract(field FROM x)`
-- and `date_part('field', x)` are the same call.
--
-- Falsifying data: INSERT INTO inf_t VALUES (1, 'infinity', 'infinity').
-- Observed: [1, NULL, NULL, 'Infinity'] — the interval `day` field is the
-- monotone-adjacent case that survives, which is why the entry looked total.
-- Mechanism: nullability-walk.ts STRICT_TOTAL_BUILTINS, same admission
-- criterion that sweep-1 finding 7 pruned six members against; these two
-- survived that sweep because it used finite inputs.
SELECT
  i.id,                              -- @notNull
  extract(month from i.ts) AS m,     -- @notNull  <-- FALSIFIED
  date_part('dow', i.ts) AS d,       -- @notNull  <-- FALSIFIED
  extract(day from i.iv) AS v        -- @notNull  (Infinity, not NULL)
FROM inf_t i
