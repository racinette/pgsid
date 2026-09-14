WITH source AS (
  SELECT payload AS document
  FROM public.events
)
SELECT nested.document ->> 'id' AS actor_id
FROM (
  WITH source AS (
    SELECT fallback_payload AS document
    FROM public.events
  )
  SELECT document
  FROM source
) AS nested;
