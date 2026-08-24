-- The evidence gate: with no WHERE there is nothing for the kernel to
-- run on, so no arm is refuted, none is selected, and the generated
-- column reads as what the catalog says it is. The sibling fixtures'
-- claims are the PREDICATE doing the work, not gpc's data happening to
-- avoid the ELSE band — a = 12 is seeded in every state and comes back
-- NULL here.
SELECT
  c -- @nullable
FROM gpc
