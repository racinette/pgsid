-- A tree scan reads the inheritance SET's flags, not the named relation's.
-- `ALTER TABLE ONLY inh_p … SET NOT NULL` is legal (measured), so the
-- parent carries attnotnull while the child does not, and a child-stored
-- NULL comes back through `FROM inh_p`. The engine once read the parent's
-- own flag and claimed `a` notNull against exactly that row; it now
-- answers with the subtree conjunction (ColumnInfo.notNullTree), and the
-- generated child rows witness the NULL. CHECK constraints cannot reach
-- this shape — children carry their own pg_constraint rows and cannot drop
-- or invalidate them (measured) — so the CHECK path needs nothing.
SELECT
  p.id,  -- @nullable
  p.a    -- @nullable
FROM inh_p p
