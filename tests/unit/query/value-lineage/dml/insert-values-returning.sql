-- Each target column is an assignment choice over both VALUES rows. The
-- omitted fallback_payload comes from the target's default/stored contract.
INSERT INTO public.events (id, payload, archived, key)
VALUES
  (2001, '{"kind":"created","actor":{"id":1}}'::jsonb, false, 'first'),
  (2002, '{"kind":"created","actor":{"id":2}}'::jsonb, false, 'second')
RETURNING
  id,
  payload ->> 'kind' AS kind,
  payload #>> '{actor,id}' AS actor_id,
  fallback_payload ->> 'id' AS fallback_id;
