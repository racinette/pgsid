-- Overload consensus: clean2 has two candidates, both STRICT, so the
-- guarantee closure sees through the call — the WHERE promotes c.name, and
-- the strict-by-consensus dispatch then makes cl notNull too. tag_of's
-- candidates both return the NOT NULL domain, so tg is notNull whichever
-- runs. The #=# operator's candidates agree on strictness (the predicate
-- side), but its RESULT keeps no single body to dispatch, so `same` stays
-- conservative — and with both operands proven non-null the strict NULL
-- can never actually occur, hence the annotation.
-- @unwitnessable 2: a multi-candidate operator has no single backing body to dispatch (bodies differ), and the strict NULL cannot occur here — both operands are proven non-null by the WHERE promotion
SELECT
  tag_of(c.id) AS tg,             -- @notNull
  clean2(c.name) AS cl,           -- @notNull
  (c.name #=# 'Alice') AS same,   -- @nullable
  c.name AS nm                    -- @notNull
FROM customers c
WHERE clean2(c.name) = 'Alice'
