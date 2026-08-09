-- Typed selection among ORDINARY user overloads (charter item 5, built):
-- `pick` has two candidates, so resolveFunctionMetadata refuses — the old
-- reading lost the integer row's NOT NULL domain return to consensus. The
-- argument's type eliminates the other candidate, the survivor's metadata
-- comes back, and the two columns diverge exactly where the overloads do.
-- Both rows are plpgsql, deliberately: the name-keyed body map is never
-- consulted, which is what keeps typed selection clear of the class-A
-- collision trap (a SQL-bodied overload among siblings refuses instead).
SELECT
  pick(c.id)   AS by_int,   -- @notNull
  pick(c.name) AS by_text   -- @nullable
FROM customers c
