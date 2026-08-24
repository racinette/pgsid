-- Both directions in one statement, over a range rather than a point:
-- [5,inf) is disjoint from (-inf,3] so the first arm is refuted, and the
-- second conjunct IS the second arm's guard so it is proven. The CASE
-- lands on 'maybe' for every returned row.
--
-- The pair matters because the two judgments are separate rungs reading
-- separate fact stores — exclusivity off the disjointness table,
-- selection off identity — and a fixture that exercised only one would
-- leave the other's failure looking like conservatism.
SELECT
  c -- @notNull
FROM gpc
WHERE a >= 5 AND a <= 10
