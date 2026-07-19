CREATE TABLE public.users (
  id int8 PRIMARY KEY,
  email text NOT NULL
);
CREATE INDEX users_email_idx ON public.users (email);
