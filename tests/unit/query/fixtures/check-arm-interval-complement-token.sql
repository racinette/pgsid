-- A complement inside a complement, same point under different tokens:
-- 5.0 (fval) evaluates equal to the arm's 5 (ival) at caine's NUMERIC
-- column, so {x <> 5.0} IS {x <> 5} — the one containment a complement
-- witness can prove, reachable only through the evaluated anchors.
SELECT
  o -- @notNull
FROM caine
WHERE a <> 5.0
