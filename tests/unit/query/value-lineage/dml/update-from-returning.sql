-- SET expressions read the OLD target row and the FROM source. The NEW image
-- must retain the assignment target while tracing those inputs; p.payload
-- remains an independent source in RETURNING.
UPDATE public.events AS e
SET payload = jsonb_set(e.payload, '{actor,id}', p.payload -> 'replacement'),
    fallback_payload = e.payload -> 'before'
FROM public.event_patches AS p
WHERE p.event_id = e.id
RETURNING WITH (OLD AS before, NEW AS after)
  before.payload #>> '{actor,id}' AS previous_actor_id,
  after.payload #>> '{actor,id}' AS current_actor_id,
  after.fallback_payload ->> 'id' AS fallback_id,
  p.payload ->> 'patch_id' AS patch_id;
