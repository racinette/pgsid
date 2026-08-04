-- The whole-row spelling `(t).*` is `t.*` with parentheses (measured), so
-- it routes through ordinary star expansion and keeps per-column precision
-- — catalog flags, promotion, the works — where the function-call spelling
-- must force everything nullable.
SELECT (t).* FROM t
-- @notNull    (id)
-- @nullable   (name)
-- @nullable   (val)
-- @notNull    (active)
