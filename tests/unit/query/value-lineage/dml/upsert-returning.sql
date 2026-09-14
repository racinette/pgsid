-- The returned NEW row is a choice between the proposed INSERT assignments
-- and the conflict UPDATE assignments. excluded resolves to the proposed row;
-- the UPDATE expressions read the existing target row.
INSERT INTO public.events AS e (id, payload, archived, key)
VALUES (3001, '{"actor":{"id":"incoming"}}'::jsonb, false, 'upsert')
ON CONFLICT (id) DO UPDATE
SET payload = excluded.payload || jsonb_build_object('conflict', true),
    fallback_payload = e.payload
RETURNING WITH (OLD AS previous, NEW AS current)
  previous.payload ->> 'id' AS previous_id,
  current.payload #>> '{actor,id}' AS current_actor_id,
  current.fallback_payload #>> '{actor,id}' AS fallback_actor_id;
