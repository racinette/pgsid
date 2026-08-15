-- The interval rung's REFUSALS, recorded rather than silent: both claims
-- below are TRUE for stored rows — 'k' precedes 'm' under "C" too, June
-- 2019 precedes 2020 — and the engine must keep refusing them. ivstxc's
-- column says COLLATE "C": deterministic, but not the session's
-- collation, and ORDER needs collation IDENTITY (the default-collated
-- twin claims — check-interval-text-default.sql); ivdt's anchors run
-- date_in, which reads DateStyle. If either column ever flips notNull, a
-- gate has opened that the charter keeps closed.
-- @unwitnessable 0: no conforming ivstxc row satisfies s <= 'k', so the
--   arm never fires and no NULL can exist; the nullable word is the
--   engine's REFUSAL (order under a non-default collation), held here by
--   annotation.
-- @unwitnessable 1: same shape through the datetime gate — no conforming
--   ivdt row satisfies d <= '2019-06-01'; the refusal is date_in's.
SELECT
  CASE WHEN s.s <= 'k' THEN NULL ELSE 5 END AS coll_order_refused,   -- @nullable
  CASE WHEN d.d <= '2019-06-01' THEN NULL ELSE 5 END AS date_refused -- @nullable
FROM ivstxc s, ivdt d
