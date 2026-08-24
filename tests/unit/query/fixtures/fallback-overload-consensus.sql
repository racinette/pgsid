-- THE OVERLOAD-CONSENSUS FALLBACKS, REACHED THROUGH OPAQUE TYPES.
--
-- `resolveFunctionMetadata` declines an overloaded name outright, and the
-- typed recovery (`resolveUserFunctionTyped`) needs readable operand types to
-- pick a survivor — so a call over an OPAQUE value is decided by consensus
-- over every arity-compatible candidate. Both consensus rungs sat dark until
-- this fixture (fallback-census.test.ts, measured 2026-08-24): the schema had
-- strict overloaded names and domain-returning names, never both properties
-- on one name, so `fb_tag` / `fb_req` exist for exactly this
-- (schema.sql, "the fallback census's overload pool").
--
--   tagged    every fb_tag candidate returns the NOT NULL domain fb_label and
--             neither is STRICT, so no call can short-circuit past the domain
--             and the consensus claims notNull whichever overload PostgreSQL
--             picks. Kill the consensus rung and this column goes nullable —
--             the annotation is the mutation gate.
--   required  every fb_req candidate is STRICT and o.a is nullable, so the
--             strict-by-consensus rung refuses outright. Its NULL is
--             witnessed on the seeded rows where ck.name is NULL — upper(NULL)
--             through a strict function is NULL. Killing THIS rung changes no
--             annotation (the conservative default answers the same), so its
--             regression gate is the census's witness check, which names the
--             rung the moment the trace stops carrying it.
WITH opaque AS (
  SELECT first_value(ck.name) OVER (PARTITION BY ck.id) AS a
  FROM ck
)
SELECT
  fb_tag(o.a) AS tagged,   -- @notNull
  fb_req(o.a) AS required  -- @nullable
FROM opaque o
