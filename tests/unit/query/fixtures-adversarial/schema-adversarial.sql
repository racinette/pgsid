-- DDL for the second adversarial sweep's quarantine fixtures.
--
-- Deliberately NOT folded into fixtures/schema.sql: the fixtures beside it
-- record the claims the engine CURRENTLY makes, several of which PostgreSQL
-- falsifies, and the suite must stay green until the fix phase graduates
-- them. Everything here was created and measured against PGlite (PG18)
-- during the sweep; the per-fixture headers name what each entity is for.

-- Finding 9 — the unreferenced-CTE fixture reads fixtures/schema.sql's gs
-- (graduated with finding 10). gs2 was a sweep-probe subject only.

