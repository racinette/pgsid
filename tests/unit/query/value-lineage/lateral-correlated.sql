SELECT extracted.actor_id
FROM public.events AS e
CROSS JOIN LATERAL (
  SELECT e.payload -> 'actor' ->> 'id' AS actor_id
) AS extracted;
