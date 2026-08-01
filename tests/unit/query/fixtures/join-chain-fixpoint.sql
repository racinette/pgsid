-- Two chained fixpoint steps: the top INNER qual proves v present (ck.id =
-- v.u_id is strict in v), and v present means the middle LEFT join only ever
-- produced MATCHED rows — so ITS qual held too, proving u present. An
-- outer join's qual becomes row-implied exactly when its null-extendable
-- side is proven present.
SELECT
  u.email AS em,   -- @notNull
  v.u_id AS vu,    -- @notNull
  t.name AS nm     -- @nullable
FROM ((t LEFT JOIN u ON u.t_id = t.id) LEFT JOIN v ON v.u_id = u.id)
JOIN ck ON ck.id = v.u_id
