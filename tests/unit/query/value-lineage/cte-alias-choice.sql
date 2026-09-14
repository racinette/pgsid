WITH source(document, backup) AS (
  SELECT payload, fallback_payload
  FROM public.events
),
selected AS (
  SELECT COALESCE(document, backup) AS document
  FROM source
)
SELECT document -> 'actor' ->> 'id' AS actor_id
FROM selected;
