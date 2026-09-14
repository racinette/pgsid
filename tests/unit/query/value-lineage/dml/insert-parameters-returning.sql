-- Assignment context types the parameters while the raw trace must retain
-- their positions. The returned JSON access starts at the target assignment.
INSERT INTO public.events (id, payload, archived, key)
VALUES ($1, $2::jsonb, false, $3)
RETURNING WITH (NEW AS inserted)
  inserted.id,
  inserted.payload #>> '{actor,id}' AS actor_id,
  inserted.key;
