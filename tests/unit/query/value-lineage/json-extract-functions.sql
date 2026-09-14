SELECT
  jsonb_extract_path(payload, 'actor', 'profile') ->> 'id' AS actor_id,
  jsonb_extract_path_text(payload, 'actor', 'id')::bigint AS numeric_actor_id,
  jsonb_object_field_text(jsonb_object_field(payload, 'actor'), 'id') AS field_actor_id,
  jsonb_array_element(payload -> 'items', 0) ->> 'sku' AS first_sku,
  jsonb_array_element_text(payload -> 'items', 0) AS first_item_text
FROM public.events;
