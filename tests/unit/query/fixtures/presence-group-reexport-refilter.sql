-- The lifted dead rule: the outer WHERE proves the re-exported inner
-- column non-null, which refilters exactly the inner unit's absent rows
-- — so the lifted group must NOT survive. The stale direction fires if
-- the engine ever claims a group here.
--
-- carrier is @notNull by PRESENCE CONSUMPTION (the closure this fixture
-- pinned as a residue while it stood): the pinned sid proves the inner
-- shipment row present on every returned row, and presence plus the
-- catalog's NOT NULL settles carrier with no CHECK involved — the
-- kernel's presence gate short-circuit.
WITH j AS (
  SELECT o.id AS oid, s.id AS sid, s.carrier
  FROM orders o LEFT JOIN shipments s ON s.order_id = o.id
)
SELECT
  j.oid,       -- @notNull
  j.sid,       -- @notNull
  j.carrier    -- @notNull
FROM j
WHERE j.sid IS NOT NULL
