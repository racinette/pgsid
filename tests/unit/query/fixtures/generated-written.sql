-- The written-value map composes into generation expressions: the INSERT
-- writes a literal into b, the RETURNING row's label is b || '!' over that
-- same row, so label is notNull even though b's catalog says nullable —
-- and doubled follows from the literal a. The generated columns themselves
-- are never written; PostgreSQL forbids it at PREPARE.
INSERT INTO gm (a, b) VALUES (7, 'w')
RETURNING
  doubled AS d,   -- @notNull
  label AS l,     -- @notNull
  b AS wb         -- @notNull
