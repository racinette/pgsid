-- The gate's witness: unfiltered, the same column is genuinely nullable
-- — every has_duration = false row carries NULL — so the sibling
-- fixtures' notNull is the WHERE walking the CHECK, not the column
-- happening to be filled.
SELECT
  event_duration -- @nullable
FROM evg
