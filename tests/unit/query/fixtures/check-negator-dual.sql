-- The negator pairing's second direction: TRUE(NOT (status <> 'housed'))
-- makes `status <> 'housed'` FALSE, and a strict comparison that evaluated
-- FALSE had non-null operands — so FALSE(col <> lit) certifies
-- TRUE(col = lit), which selects the CHECK CASE's arm exactly as the plain
-- equality would. Nobody writes the double negation on purpose; generated
-- SQL does.
SELECT
  arrived_at   -- @notNull
FROM guest
WHERE NOT (status <> 'housed')
