SELECT (
  SELECT e.payload -> 'actor' ->> 'id'
) AS actor_id
FROM public.events AS e;
