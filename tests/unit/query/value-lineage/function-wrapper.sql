SELECT lower(payload #>> ARRAY['actor', 'name']) AS actor_name
FROM public.events;
