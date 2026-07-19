CREATE INDEX CONCURRENTLY users_email_idx ON public.users (email);
CREATE UNIQUE INDEX CONCURRENTLY users_lower_email_idx ON public.users (lower(email));
DROP INDEX CONCURRENTLY public.users_email_idx;
REINDEX INDEX CONCURRENTLY public.users_email_idx;
REINDEX TABLE CONCURRENTLY public.users;
