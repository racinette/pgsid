-- All producing MERGE shapes occur: DELETE, UPDATE, INSERT, and an UPDATE for
-- NOT MATCHED BY SOURCE. OLD, NEW, and source values therefore each require
-- action-aware choices with the appropriate absent-row alternatives.
MERGE INTO public.events AS e
USING public.event_patches AS p
ON p.event_id = e.id
WHEN MATCHED AND p.should_delete THEN
  DELETE
WHEN MATCHED THEN
  UPDATE SET payload = jsonb_set(e.payload, '{actor}', p.payload -> 'actor'),
             fallback_payload = e.payload
WHEN NOT MATCHED BY TARGET THEN
  INSERT (id, payload, archived, key)
  VALUES (p.event_id, p.payload -> 'event', false, coalesce(p.key, 'merged'))
WHEN NOT MATCHED BY SOURCE THEN
  UPDATE SET archived = true
RETURNING WITH (OLD AS before, NEW AS after)
  merge_action() AS action,
  before.payload #>> '{actor,id}' AS previous_actor_id,
  after.payload #>> '{actor,id}' AS current_actor_id,
  p.payload ->> 'patch_id' AS source_patch_id;
