-- TWO set-returning calls in one target list expand in lockstep to the
-- LONGEST one's row count, and every shorter one is NULL-padded AFTER it
-- returned — max-with-padding, not the cycled LCM this comment used to
-- claim (re-measured for adversarial-3 finding 1: `generate_series(1,3)`
-- beside `generate_series(1,6)` gives six rows with three NULLs)
-- (adversarial-2 finding 7): one_sku() is SETOF non_empty_text, a NOT NULL
-- domain, and its per-call claim is entirely correct — the padding NULL is
-- manufactured by the projection, where no domain constraint applies. Both
-- SRF entries now drop to nullable (srfPaddedTargets); s is witnessed on
-- rows 2 and 3 of every state. A single SRF in a target list keeps its
-- precision, and a scalar call beside an SRF repeats instead of padding
-- (both measured).
--
-- Which of the two drops is a per-call question as of 2026-08-22, and this is
-- the target-list half of the bound the `ROWS FROM` arms use: `one_sku`'s body
-- is `SELECT 'only'::non_empty_text`, no FROM and no WHERE, so it yields at
-- most one row, and `generate_series(1, 3)` over constant integer bounds
-- yields exactly three. Three covers one. `s` is still padded away and still
-- witnessed on rows 2 and 3 of every state; `g` is the call that does the
-- padding, and was reading as though it were also receiving it.
SELECT
  generate_series(1, 3) AS g,  -- @notNull
  one_sku() AS s               -- @nullable
