-- RETURNING reports the row AFTER the rewrite stage: trig_t's BEFORE ROW
-- trigger sets NEW.a := NULL after the statement's value was chosen, and
-- the written-value map — which reduces VALUES cells to the values the
-- STATEMENT names — described a row that is never stored. With a BEFORE
-- ROW trigger on the command, the map is void and the claims drop to the
-- catalog flags, which the stored row still satisfies: a is nullable
-- (witnessed by every returned row — the trigger nulls it), b and id keep
-- their constraints.
INSERT INTO trig_t (id, a, b) VALUES (601, 'x', 'y')
RETURNING
  a,   -- @nullable
  b,   -- @notNull
  id   -- @notNull
