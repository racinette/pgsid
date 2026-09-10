-- Email and phone are individually optional, but the member-contact CHECK
-- rejects a new member only when both bindings are NULL.
-- @args [10, "Daria Novak", "daria@example.test", "+7-555-0110", "active", "2024-04-01"]
-- @param 1 notNull
-- @param 2 notNull
-- @param 3 nullable
-- @param 4 nullable
-- @param 5 notNull
-- @param 6 notNull
-- @null-groups none
-- @param-reject 3,4
INSERT INTO library_members (id, full_name, email, phone, state, joined_on)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING
  id,    -- @notNull
  email, -- @nullable
  phone  -- @nullable
