-- CHECK … NO INHERIT is never copied to a child (adversarial-2 finding 2),
-- so a tree scan must not read it: `FROM ni_p` returns ni_c's rows, which
-- no `CHECK (x IS NOT NULL)` ever constrained. The engine once derived
-- x IS NOT NULL from the parent's constraint against exactly those rows;
-- the CHECK consumer now takes the tree list (resolveCheckConstraintsTree),
-- which drops NO INHERIT constraints as soon as the relation has
-- descendants, and ni_c's generated NULLs witness the claim. The ONLY
-- spelling keeps the derivation — see check-no-inherit-only-control.sql.
SELECT
  p.id,  -- @notNull
  p.x    -- @nullable
FROM ni_p p
