-- The `LIKE` control for ctas-drops-not-null.sql: the overshoot bound.
--
-- `like_dst` was created as `LIKE ctas_src` with no INCLUDING clause, and
-- PostgreSQL copies not-null constraints THERE unconditionally — they are not
-- among the things INCLUDING CONSTRAINTS governs. So `val` is genuinely NOT
-- NULL here, no state can put a NULL in it, and a reading that treated every
-- derived table as constraint-free would lose this claim.
--
-- Two tables built from the same source, one clause apart, disagreeing: that
-- is the whole content of the pair.
SELECT
  val,   -- @notNull   (LIKE copies not-null, always)
  note   -- @nullable
FROM like_dst
