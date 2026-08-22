-- A pg_catalog SRF with no named output column contributes ONE column in the
-- FROM position, and its values are the CALL's values — so the expression
-- reading applies there verbatim. Until 2026-08-22 the walk did not ask:
-- `SELECT generate_series(1, 2)` read notNull and `SELECT g FROM
-- generate_series(1, 2) g` read nullable, the same call and the same rows,
-- differing in nothing but position.
--
-- Both answers come out of that one line here, which is the point of pairing
-- them: the reading DISCRIMINATES rather than widening.
--
--   g  generate_series is strict, and a strict SRF's nullable argument
--      subtracts ROWS rather than values — the totality argument
--      srf-strict-nullable-argument-target-list.sql establishes for the
--      target list, unchanged by the clause it is written in.
--   s  string_to_table is NOT strict, and its third argument is a
--      null_string: every field equal to it comes back a real SQL NULL.
--      Measured — `string_to_table('a,b,c', ',', 'b')` gives `a`, NULL, `c`
--      — so this nullable is witnessed on row two of every state, not argued.
--
-- The builtins WITH named output columns take the snapshot's shape one branch
-- earlier and are untouched by this; builtin-table-function-shape.sql holds
-- that side, where json_each's key and value are still uniformly conservative.
SELECT
  s,  -- @nullable
  g   -- @notNull
FROM string_to_table('a,b,c', ',', 'b') s
CROSS JOIN generate_series(1, 2) g
