WITH source AS (
  SELECT payload AS document
  FROM public.events
),
actor AS (
  SELECT document -> 'actor' AS value
  FROM source
),
identity_value AS (
  SELECT value ->> 'id' AS value
  FROM actor
)
SELECT value::bigint AS actor_id
FROM identity_value;
