-- INSERT ... SELECT maps the select list positionally onto the target
-- columns, and the parameter rejects NULL exactly as a VALUES row would —
-- for the domain-typed variant this raises even when the SELECT produces no
-- rows (measured in param-mechanism.test.ts).
-- @args [520]
-- @param 1 notNull
INSERT INTO t (id, val, active)
SELECT $1, u.val, true
FROM u
WHERE u.id = 1
RETURNING id  -- @notNull
