-- literals: various literal types
SELECT
  'foo'   AS c1,  -- @notNull
  42      AS c2,  -- @notNull
  true    AS c3,  -- @notNull
  NULL    AS c4,  -- @alwaysNull
  NULL::text AS c5  -- @alwaysNull
