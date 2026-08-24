-- STAR EXPANSION KEEPS THE alwaysNull CHANNEL — the wrap-invariance crop's fix.
--
-- Wrapper 1 of the wrap-invariance suite (2026-08-24) found the corpus's one
-- weakening class in its first run: zero notNull claims died across 432
-- wrapped fixtures, and 32 of the 37 alwaysNull claims did — every loss at a
-- star. The explicit re-export read the inner flag all along
-- (`columnIsAlwaysNull`); `expandStar`, the one consumer that resolves
-- POSITIONALLY, built its outputs from the notNull channel alone. Same shape
-- as the alias-column-list finding: five consumers of one mechanism, four
-- honouring it, and the partial check reading as a whole one.
--
-- `guest.arrived_at` is forced BOTH ways by guest_arrival_state, and
-- 'checked-out' selects its ELSE arm, so the kernel's mirror goal proves the
-- column NULL inside the subselect:
--
--   gone     the star re-export must carry the proof — this is the claim
--            that dies if expandStar stops asking entryColumnAlwaysNull.
--   id_out   the over-claim control: a value-bearing sibling through the
--            same star stays plain notNull.
--   ord      a nullable sibling (room carries values on some checked-out
--            rows); neither channel may claim it.
SELECT *
  -- @notNull
  -- @nullable
  -- @alwaysNull
FROM (
  SELECT g.id AS id_out, g.room AS ord, g.arrived_at AS gone
  FROM guest g
  WHERE g.status = 'checked-out'
) w
