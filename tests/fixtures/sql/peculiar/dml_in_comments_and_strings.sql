-- This migration tests that DML-looking text inside comments and string
-- literals is NOT mistaken for top-level DML by our naive kind-based filter.

-- INSERT INTO users (id) VALUES (1);  <- looks like DML, but is a comment
-- UPDATE users SET email='x@y.com';   <- same here
-- DELETE FROM users WHERE 1=1;       <- and here

-- A real DDL statement whose CHECK constraint contains DML-looking text:
CREATE TABLE audit_log (
  id bigint PRIMARY KEY,
  note text NOT NULL,
  CHECK (
    note <> 'INSERT INTO audit_log VALUES (1)'  -- DML in a string literal
    AND note <> 'UPDATE audit_log SET note=''hack'''
  )
);

-- A real top-level INSERT (this one MUST be stripped):
INSERT INTO audit_log (id, note) VALUES (1, 'seed');

-- The comment below is the LAST line of the file (no trailing newline).
-- DROP TABLE audit_log; <- this should NOT be stripped, it's a comment
