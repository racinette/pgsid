-- TypeCast: cast of nullable → nullable; cast of non-null → non-null
SELECT
  val::text    AS c1,  -- @nullable
  id::text     AS c2,  -- @notNull
  NULL::int    AS c3   -- @nullable
FROM t
