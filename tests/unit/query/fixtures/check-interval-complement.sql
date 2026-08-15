-- The complement shape: CHECK (z <> 5) excludes exactly its own point —
-- same-token, the fast path — and says NOTHING about any other value:
-- z = 3 is a conforming row (the generator plants it) whose arm fires.
-- The `<>` shape comes from the equality-negator capture, not a strategy
-- number; the guard column is what keeps it from ever growing teeth.
SELECT
  CASE WHEN t.z = 5 THEN NULL ELSE 5 END AS own_point,    -- @notNull
  CASE WHEN t.z = 3 THEN NULL ELSE 5 END AS other_point   -- @nullable
FROM ivne t
