-- The padding gate: bpchar comparison strips trailing blanks BEFORE the
-- collation is consulted, so 'a' and 'a ' are distinct tokens naming EQUAL
-- values ('a'::char(4) = 'a ' is TRUE — measured), and byte distinctness
-- proves nothing however deterministic the collation. The stored ('a', NULL)
-- row satisfies the CHECK through its k = 'a ' disjunct and comes back for
-- WHERE k = 'a' with x NULL — the row an ungated derivation would falsify
-- (TRUE(k = 'a') is NOT allowed to falsify the CHECK's k = 'a ').
-- The engine refuses bpchar distinctness, so x stays nullable, witnessed.
SELECT
  b.x,  -- @nullable
  b.k   -- @notNull
FROM bp b
WHERE b.k = 'a'
