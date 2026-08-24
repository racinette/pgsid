-- AN INSERT-WITHOUT-RETURNING BODY — the void refusal's verdict site.
--
-- A sql body whose last statement is an INSERT with no RETURNING can only
-- belong to a RETURNS void function, and no fixture called one, so the site
-- was dark (rung-census.test.ts). The refusal is the point: a void call
-- contributes a column the walk can say nothing about — and the nullable
-- claim is WITNESSED, because a void value reaches this driver as NULL
-- (measured by the soundness suite on this very fixture; a first draft
-- carried an @unwitnessable claiming '' instead, and the stale-annotation
-- gate rejected it the same run).
SELECT
  fb_ins_void(u.id) AS acted,  -- @nullable
  u.id              AS uid     -- @notNull
FROM u
