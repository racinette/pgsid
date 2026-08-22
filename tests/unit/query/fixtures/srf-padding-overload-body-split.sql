-- The trap the body map's SIGNATURE key disarms, aimed at the padding bound.
--
-- `ov_rows` is overloaded, and its two bodies disagree about how many rows
-- they yield: the integer one is `SELECT 'one'::non_empty_text`, the text one
-- scans products. The bound is taken by CONSENSUS over the candidates —
-- whichever overload PostgreSQL picks, a ceiling every candidate satisfies
-- holds — and here they do not agree, so this call has no ceiling and the
-- series arm cannot be shown to cover it. Both drop.
--
-- Under the name-keyed body map the call read the WRONG body. One entry held
-- both and the integer overload won it (measured), so its single row would
-- have said the series arm is the longer one. This call takes the TEXT
-- overload, whose scan returns eight to twelve rows in the generated state, so
-- `g` is padding from row three on and the falsification is a row that comes
-- back NULL — not an argument about what the map might have held.
--
-- Distinct from body-shape-overload-collision.sql in what it permits: this
-- reads every candidate and takes the weakest answer, which is sound whichever
-- one runs. Reading ONE candidate's body for its FLAGS is still refused, and
-- still by resolveFunctionMetadata's single-candidate shortcut.
SELECT
  ov_rows('a'::text) AS o,    -- @nullable
  generate_series(1, 2) AS g  -- @nullable
