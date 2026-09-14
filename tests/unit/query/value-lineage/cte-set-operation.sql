WITH candidates AS (
  SELECT payload AS document
  FROM public.events
  UNION ALL
  SELECT fallback_payload AS document
  FROM public.events
),
actors AS (
  SELECT document -> 'actor' AS actor
  FROM candidates
)
SELECT actor ->> 'id' AS actor_id
FROM actors;
