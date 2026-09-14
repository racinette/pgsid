SELECT outer_query.actor ->> 'id' AS actor_id
FROM (
  SELECT inner_query.document -> 'actor' AS actor
  FROM (
    SELECT e.payload AS document
    FROM public.events AS e
  ) AS inner_query
) AS outer_query;
