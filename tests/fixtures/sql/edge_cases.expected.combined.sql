-- café ☕ — non-ASCII comment must not break byte-offset scans
CREATE INDEX u_idx ON public.users (email);
-- trailing DML: tests the stmt_len backfill for last statement
