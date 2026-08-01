-- The strict-expression closure in WHERE promotion: c.name is not a direct
-- operand of the comparison, but length() is a strict builtin (measured set
-- in operators.ts), so `length(c.name) > 0` being TRUE implies length(name)
-- was non-null, hence name was — the contrapositive the closure computes.
-- Formerly the register's branch-guard example shape; closed by Wave 1.
SELECT
  c.name AS nm   -- @notNull
FROM customers c
WHERE length(c.name) > 0
