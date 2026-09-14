-- A data-modifying UPDATE CTE feeds an INSERT CTE whose RETURNING values feed
-- the outer SELECT. This pins lineage composition across two write boundaries.
WITH changed AS (
  UPDATE public.events AS e
  SET payload = p.payload -> 'event'
  FROM public.event_patches AS p
  WHERE p.event_id = e.id
  RETURNING WITH (OLD AS before, NEW AS after)
    e.id,
    before.payload AS before_payload,
    after.payload AS after_payload
), archived AS (
  INSERT INTO public.event_archive (event_id, before_payload, after_payload)
  SELECT id, before_payload, after_payload
  FROM changed
  RETURNING event_id, before_payload, after_payload
)
SELECT
  event_id,
  before_payload #>> '{actor,id}' AS previous_actor_id,
  after_payload #>> '{actor,id}' AS current_actor_id
FROM archived;
