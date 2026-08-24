-- Collation identity rides containment: cais's column carries the
-- session's own default collation, so 'p' vs 'm' ORDERS (the identity
-- arm of the trichotomy) and ['p',inf) fits the arm's ['m',inf). Every
-- returned row — the generator's 'peak' — was enforced through the
-- o IS NOT NULL arm. The COLLATE "C" twin is the refusal record in
-- check-arm-interval-collation-refusal.sql.
SELECT
  o -- @notNull
FROM cais
WHERE s >= 'p'
