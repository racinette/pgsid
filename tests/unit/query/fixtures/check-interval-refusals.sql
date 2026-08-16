-- The interval rung's REFUSAL, recorded rather than silent: the claim
-- below is TRUE for stored rows — 'k' precedes 'm' under "C" too — and
-- the engine must keep refusing it. ivstxc's column says COLLATE "C":
-- deterministic, but not the session's collation, and ORDER needs
-- collation IDENTITY (the default-collated twin claims —
-- check-interval-text-default.sql). If this column ever flips notNull, a
-- gate has opened that the charter keeps closed. The DATETIME record
-- that used to sit beside it FLIPPED when design B landed (2026-08-16):
-- ISO anchors order now (check-interval-datetime.sql), and the refusal
-- lives on in that file's ambiguous-form column, witnessed by data
-- instead of held by annotation.
-- @unwitnessable 0: no conforming ivstxc row satisfies s <= 'k', so the
--   arm never fires and no NULL can exist; the nullable word is the
--   engine's REFUSAL (order under a non-default collation), held here by
--   annotation.
SELECT
  CASE WHEN s.s <= 'k' THEN NULL ELSE 5 END AS coll_order_refused -- @nullable
FROM ivstxc s
