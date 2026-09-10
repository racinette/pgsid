-- The stored test name is built from two independently optional name parts.
-- Either part alone makes a valid non-empty name; only their joint absence
-- constructs the empty string rejected by the table CHECK.
-- @args [10, 2, "Blood", "panel"]
-- @param 1 notNull
-- @param 2 notNull
-- @param 3 nullable
-- @param 4 nullable
-- @null-groups none
-- @param-reject 3,4
INSERT INTO lab_samples (id, visit_id, test_name, state)
VALUES ($1, $2, trim(concat_ws(' ', $3::text, $4::text)), 'ordered')
RETURNING
  id,              -- @notNull
  test_name,       -- @notNull
  result_display   -- @alwaysNull
