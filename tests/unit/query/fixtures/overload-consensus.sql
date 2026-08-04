-- Overload consensus: clean2 has two candidates, both STRICT, so the
-- guarantee closure sees through the call — the WHERE promotes c.name.
-- Consensus strictness now licenses only the NULLABLE direction (a strict
-- function says nothing about non-null input), and the plpgsql bodies are
-- not analysable, so cl stays conservative. tag_of's candidates both
-- return the NOT NULL domain, so tg is notNull whichever runs. The #=#
-- operator's candidates agree on strictness (the predicate side), but its
-- RESULT keeps no single body to dispatch, so `same` stays conservative —
-- and with both operands proven non-null the strict NULL can never
-- actually occur, hence the annotation.
-- @unwitnessable 1: both clean2 candidates return their argument, proven non-null by the WHERE — strictness no longer claims totality, and no data can show the plpgsql bodies returning NULL
-- @unwitnessable 2: a multi-candidate operator has no single backing body to dispatch (bodies differ), and the strict NULL cannot occur here — both operands are proven non-null by the WHERE promotion
SELECT
  tag_of(c.id) AS tg,             -- @notNull
  clean2(c.name) AS cl,           -- @nullable
  (c.name #=# 'Alice') AS same,   -- @nullable
  c.name AS nm                    -- @notNull
FROM customers c
WHERE clean2(c.name) = 'Alice'
