-- TypeCast: cast of nullable → nullable; cast of non-null → non-null
SELECT
  val::text    AS c1,  -- 
  id::text     AS c2,  -- 
  NULL::int    AS c3   -- 
FROM t
