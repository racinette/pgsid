-- The OVERSHOOT control for the `ONLY` gate: inheritance is the opposite way
-- round, and its promotion must survive.
--
-- An inheritance parent holds its OWN rows, and a foreign key's target index
-- covers exactly those — a child's rows are not candidates for the match at
-- all. So `ONLY sw4_ip` is precisely where the key says the match is, and the
-- claim stands.
--
-- The gate is therefore on the referenced relation being PARTITIONED, not on
-- `ONLY` appearing. Written as the latter it would look like the same fix and
-- would cost this claim, plus every `ONLY` join over an ordinary table.
SELECT
  p.id AS pid   -- @notNull   (ONLY an inheritance parent is where the match lives)
FROM sw4_iref r
LEFT JOIN ONLY sw4_ip p ON p.id = r.p_id
