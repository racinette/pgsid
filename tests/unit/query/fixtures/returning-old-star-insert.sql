-- @null-groups none
-- @param-rejections none
-- PG18's `RETURNING old.*` — the absent-row direction of the old/new stars.
--
-- Found by the pg-regress replay (updatable_views: engine 0 columns,
-- PostgreSQL 4/8): star expansion resolved `old` and `new` against the scope
-- aliases, found nothing, and emitted NOTHING — the misalignment class, on a
-- PG18 feature no fixture spelled. Expansion now reads the RETURNING
-- context (target alias plus the WITH (OLD AS …) renames) and emits the
-- target's columns. A plain INSERT has no old row, so all four columns are
-- always NULL on every returned row — which is what makes every claim here
-- witnessed rather than excused.
INSERT INTO ck (id, val) VALUES (904, 'x')
RETURNING old.*,
  -- @alwaysNull
  -- @alwaysNull
  -- @alwaysNull
  -- @alwaysNull
  new AS inserted_row -- @notNull
