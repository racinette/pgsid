-- `groupingOrdinalPositions` carried the same two-part test as expandStar
-- (adversarial-3 finding 5, the second site — written by the sweep-2 fix,
-- faithfully mirroring the first, which is how a latent defect acquires a
-- second copy). Both sites now share `starQualifier`, so the ordinals here
-- number t's four expanded positions rather than the whole scope's nine,
-- and every grouped key is NULLed by the super-aggregate rows the grouping
-- sets produce. The count is the control: it is not a grouping key and
-- keeps its notNull.
SELECT public.t.*, count(*)
FROM u, t
GROUP BY GROUPING SETS ((1), (2), (3), (4))
-- @nullable   (id: NULL on every set that does not group it)
-- @nullable   (name)
-- @nullable   (val)
-- @nullable   (active)
-- @notNull    (count)
