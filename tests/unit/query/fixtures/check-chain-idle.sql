-- The chain's off switch: 'idle' discharges nothing (proving stage <> 'go'
-- would need distinctness against a literal the evidence does not carry —
-- it carries the equality itself, which falsifies nothing here), so no
-- link fires and every column stays nullable, witnessed by the idle row.
SELECT
  a,   -- @nullable
  b,   -- @nullable
  c    -- @nullable
FROM chain3
WHERE stage = 'idle'
