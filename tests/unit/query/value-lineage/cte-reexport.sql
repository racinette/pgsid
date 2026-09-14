WITH extracted AS (
  SELECT payload -> 'actor' AS actor
  FROM public.events
)
SELECT actor ->> 'id' AS actor_id
FROM extracted;
