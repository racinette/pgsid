-- café ☕ — non-ASCII comment must not break byte-offset scans
CREATE INDEX CONCURRENTLY u_idx ON public.users (email);
-- trailing DML: tests the stmt_len backfill for last statement
INSERT INTO public.users (id, email) VALUES (1, 'a@b.com');
