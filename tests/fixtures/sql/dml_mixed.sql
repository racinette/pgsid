CREATE TABLE public.users (
  id int8 PRIMARY KEY,
  email text NOT NULL
);
SELECT 1;
INSERT INTO public.users (id, email) VALUES (1, 'a@b.com');
UPDATE public.users SET email = 'c@d.com' WHERE id = 1;
DELETE FROM public.users WHERE id = 1;
COPY public.users (id, email) FROM '/dev/null';
TRUNCATE public.users;
