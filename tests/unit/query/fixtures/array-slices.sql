-- Slices never fail by range — they clamp, to an empty array if need be
-- (measured: (ARRAY[1,2,3])[5:9] is '{}', not NULL) — so a slice is NULL
-- only when the array or a bound is. Element subscripts stay correctly
-- nullable: out-of-range really is NULL, and el_miss is always exactly
-- that, which is its witness. sl_n's array comes from nullable t.name
-- (sparse's t.1), witnessing the strict side of the slice rule.
SELECT
  (ARRAY[t.id, 1])[1:2] AS sl,                  -- @notNull
  (ARRAY[t.id])[2:3] AS sl_empty,               -- @notNull
  (ARRAY[t.id])[5] AS el_miss,                  -- @nullable
  (string_to_array(t.name, ','))[1:2] AS sl_n   -- @nullable
FROM t
