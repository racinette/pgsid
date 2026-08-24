-- Equal anchors under DIFFERENT tokens: the WHERE's 3.0 (fval) and the
-- arm's 3 (ival), both exact at cail's NUMERIC column, evaluate equal —
-- (-inf,3.0) IS (-inf,3), and a strict witness fits its strict twin.
-- The identity fast path cannot see this pair; the evaluated anchor
-- relation is the only route. (The INTEGER twin of this shape is the
-- lossy-anchor refusal — check-arm-interval-lossy-anchor.sql.)
SELECT
  o -- @notNull
FROM cail
WHERE a < 3.0
