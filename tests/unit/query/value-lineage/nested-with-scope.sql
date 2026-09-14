WITH outer_source AS (
  SELECT payload AS document
  FROM public.events
),
outer_extract AS (
  WITH inner_extract AS (
    SELECT document -> 'actor' AS actor
    FROM outer_source
  )
  SELECT actor -> 'profile' AS profile
  FROM inner_extract
)
SELECT profile ->> 'name' AS actor_name
FROM outer_extract;
