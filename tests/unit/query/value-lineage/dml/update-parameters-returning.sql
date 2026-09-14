-- Parameters reach SET expressions through casts, COALESCE, and target-column
-- inference. RETURNING must preserve their numbered leaves beneath NEW.
UPDATE public.events AS e
SET payload = jsonb_set(e.payload, '{actor}', $1::jsonb),
    fallback_payload = $2::jsonb,
    key = coalesce($3::text, e.key)
WHERE e.id = $4
RETURNING WITH (OLD AS before, NEW AS after)
  before.payload #>> '{actor,id}' AS previous_actor_id,
  after.payload #>> '{actor,id}' AS current_actor_id,
  after.fallback_payload #>> '{actor,id}' AS fallback_actor_id,
  after.key;
