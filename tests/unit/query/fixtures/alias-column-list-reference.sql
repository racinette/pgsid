-- The reference side of the rename, in both directions — and the second is
-- the one that shows the engine was not merely mislabelling.
--
-- Under `AS r(c0, c1, c2)` the name `c0` means the catalog's first column, so
-- a reference to it must reach that column's facts: `refunds.id` is NOT NULL,
-- and before the fix `r.c0` resolved to nothing and read nullable.
--
-- The other direction is pinned by `alias-column-list-hidden-name.sql`: the
-- catalog name is HIDDEN by the rename, and the engine used to answer for it.
--
-- A qualified star takes the same path as the bare one, so it is here rather
-- than in a fixture of its own.
SELECT
  r.c0 AS by_alias_name,   -- @notNull
  r.*                      -- @notNull
                           -- @notNull
                           -- @notNull
FROM refunds_archive AS r(c0, c1, c2)
