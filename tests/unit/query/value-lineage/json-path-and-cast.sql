SELECT (payload #>> ARRAY['actor', 'id'])::bigint AS actor_id
FROM public.events;
