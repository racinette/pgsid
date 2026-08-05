-- An UPDATE through an inheritance parent fires the CHILD's BEFORE ROW
-- trigger for child rows (measured) — the parent carries no trigger at
-- all, and the child's nulls a after the SET expression ran. The hooks
-- answer for the relation set: the written map is void and the SET mask
-- widens, so the written 'set' claims nothing and a stays nullable,
-- witnessed by every child row. id keeps the tree flags it already had —
-- unconstrained everywhere, witnessed by generated NULL ids.
UPDATE inh_p SET a = 'set'
RETURNING
  a,   -- @nullable
  id   -- @nullable
