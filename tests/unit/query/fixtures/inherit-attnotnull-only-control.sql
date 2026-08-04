-- The ONLY control: `FROM ONLY inh_p` scans the parent alone, where its
-- own attnotnull holds — the named-relation flag is exactly the right
-- answer there, and the tree conjunction would cost it. RangeVar.inh
-- carries the distinction (the parser emits inh:true for a plain reference
-- and omits it for ONLY — measured). No parent-stored row can have a NULL
-- `a`; the generated parent rows keep the claim falsifiable.
SELECT
  p.id,  -- @nullable
  p.a    -- @notNull
FROM ONLY inh_p p
