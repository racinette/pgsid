CREATE INDEX users_email_idx ON public.users (email);
CREATE UNIQUE INDEX users_lower_email_idx ON public.users (lower(email));
DROP INDEX public.users_email_idx;
REINDEX INDEX public.users_email_idx;
REINDEX TABLE public.users;
