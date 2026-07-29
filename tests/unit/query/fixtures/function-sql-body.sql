-- LANGUAGE sql function body recursion (old-style, positional $1):
-- double_val(x integer) → integer, body: SELECT $1
SELECT
  double_val(t.id)       AS c1,  -- 
  double_val(u.t_id)     AS c2,  --  (u is optional side of LEFT JOIN)
  double_val(42)         AS c3   -- 
FROM t LEFT JOIN u ON u.t_id = t.id
