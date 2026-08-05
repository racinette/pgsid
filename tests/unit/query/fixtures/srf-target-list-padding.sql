-- @unwitnessable 0: generate_series is the LONGER call here, so the
--   padding never reaches it and its values are non-null literals — the
--   nullable is the padding rule's uniform conservatism
-- TWO set-returning calls in one target list expand in lockstep to the LCM
-- of their row counts, and the SHORT one is NULL-padded AFTER it returned
-- (adversarial-2 finding 7): one_sku() is SETOF non_empty_text, a NOT NULL
-- domain, and its per-call claim is entirely correct — the padding NULL is
-- manufactured by the projection, where no domain constraint applies. Both
-- SRF entries now drop to nullable (srfPaddedTargets); s is witnessed on
-- rows 2 and 3 of every state. A single SRF in a target list keeps its
-- precision, and a scalar call beside an SRF repeats instead of padding
-- (both measured).
SELECT
  generate_series(1, 3) AS g,  -- @nullable
  one_sku() AS s               -- @nullable
