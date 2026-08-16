-- Design B's acceptance (docs/subtree-evaluation.md, "Settings-independent
-- datetime literals"; landed 2026-08-16): ivdt's refusal record flipped —
-- its ISO anchors pass the value-shape gate, so the anchor questions close
-- and (-inf, 2019-06-01] misses (2020-01-01, inf), whatever DateStyle any
-- session runs (the exhaustive sweep in param-mechanism is the pin). The
-- overlap guard keeps the boundary: the generator's first row (2020-01-02,
-- the day after the CHECK's anchor) fires both nullable arms — including
-- the AMBIGUOUS one, which is the refusal's new home: '1/2/2020' fails
-- the shape test (Jan 2 / Feb 1 / error across the sweep), the engine
-- claims nothing, and the session's own Jan-2 reading witnesses the NULL.
-- The non-padded widening (2026-08-16): '2019-6-1' passes the widened
-- shape gate — a 4-digit leading year fixes the field roles, swept — and
-- orders against the CHECK's padded anchor exactly like its ISO twin.
SELECT
  CASE WHEN d.d <= '2019-06-01' THEN NULL ELSE 5 END AS iso_gap,          -- @notNull
  CASE WHEN d.d <= '2019-6-1'   THEN NULL ELSE 5 END AS nonpadded_gap,    -- @notNull
  CASE WHEN d.d = '2019-12-31'  THEN NULL ELSE 5 END AS iso_point,        -- @notNull
  CASE WHEN d.d <= '2020-03-01' THEN NULL ELSE 5 END AS overlap_kept,     -- @nullable
  CASE WHEN d.d <= '1/2/2020'   THEN NULL ELSE 5 END AS ambiguous_refused -- @nullable
FROM ivdt d
