-- A window frame OFFSET is a rejection site of its own: a NULL bound raises
-- `frame starting offset must not be null` — for ROWS, RANGE and GROUPS, in
-- both directions, and even over empty input (all measured). The register pins
-- the sibling placement — LIMIT/OFFSET take NULL legally — and a frame bound
-- reads like the same shape while behaving oppositely; the engine once claimed
-- $1 nullable on exactly that analogy. Execution-time like mechanism B, so no
-- output narrowing. The first binding is the control; the second witnesses the
-- raise.
--
-- The OUTPUT side is settled here too, and by the frame rather than by the
-- binding. `s` is notNull: the frame ends at CURRENT ROW and starts at `$1
-- PRECEDING`, which is at or before it — a negative offset RAISES rather than
-- inverting the bound, so every offset that reaches execution puts the current
-- row inside the frame. t.id is NOT NULL, so the sum has at least one non-null
-- input and cannot be NULL.
--
-- It read nullable behind a recorded reason ("the engine stays conservative
-- for every explicit frame by design") until the rule was asked as a PROPERTY
-- instead of as a shape. It had been keyed on the DEFAULT frame, which is one
-- member of the family — and writing that default's own bounds out longhand
-- sets the NONDEFAULT bit, so the explicit spelling of the very frame the rule
-- accepted did not qualify.
--
-- The three controls are the three ways to fall out, each witnessed on the
-- first or last rows of the partition:
--
--   `starts_after`  starts at 1 FOLLOWING — past the current row.
--   `ends_before`   ends at 1 PRECEDING — short of it.
--   `excluded`      contains it and then throws it away. EXCLUDE GROUP does
--                   the same; EXCLUDE TIES does NOT, keeping the row and
--                   dropping only its peers, which is why `ties` is notNull.
-- @args [1]
-- @args [null]
-- @param 1 notNull
SELECT
  sum(t.id) OVER (ORDER BY t.id ROWS BETWEEN $1 PRECEDING AND CURRENT ROW)
    AS s,            -- @notNull
  sum(t.id) OVER (ORDER BY t.id ROWS BETWEEN 1 FOLLOWING AND 2 FOLLOWING)
    AS starts_after, -- @nullable
  sum(t.id) OVER (ORDER BY t.id ROWS BETWEEN 2 PRECEDING AND 1 PRECEDING)
    AS ends_before,  -- @nullable
  sum(t.id) OVER (ORDER BY t.id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                  EXCLUDE CURRENT ROW)
    AS excluded,     -- @nullable
  sum(t.id) OVER (ORDER BY t.id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                  EXCLUDE TIES)
    AS ties          -- @notNull
FROM t
