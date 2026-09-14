SELECT jsonb_path_query_first(payload, '$.actor.id') AS actor_id
FROM public.events;
