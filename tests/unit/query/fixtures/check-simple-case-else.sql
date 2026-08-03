-- The simple CASE's other arm: distinctness falsifies the desugared
-- `code = 'assigned'` (text, deterministic collation), selection falls to
-- the ELSE — literal true, which derives nothing — and combo stays
-- nullable, witnessed by the free locker's NULL.
SELECT
  combo   -- @nullable
FROM locker
WHERE code = 'free'
