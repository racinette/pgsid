-- The varchar control for the padding gate: character varying keeps
-- trailing blanks significant ('a'::varchar(4) = 'a ' is FALSE — measured),
-- so no admissible row pairs k = 'a' with a NULL x — ('a', NULL) is refused
-- (measured) — and the tokens really are distinct values. The engine still
-- refuses the derivation, one gate earlier: a varchar CHECK deparses its
-- comparison through casts (`(k)::text = 'a '::text` — measured), and the
-- literal-cast identity gate equates a cast only at the column's OWN type.
-- bpchar deparsed at its own type (`k = 'a '::bpchar`), which is exactly
-- how the padding unsoundness got through before the OID was dropped.
-- @unwitnessable 0: the CHECK forces x non-null on every k = 'a' row (the
-- varchar comparison really is blank-sensitive), and the engine's cast gate
-- refuses the cross-type match by design, so the claim is conservative and
-- no data can contradict it.
SELECT
  v.x,  -- @nullable
  v.k   -- @notNull
FROM vc v
WHERE v.k = 'a'
