-- Trace the CTE transformations through positional INSERT assignments. OLD
-- is absent on every returned row; NEW carries the target-column contracts.
WITH prepared AS (
  SELECT
    p.patch_id + 1000 AS id,
    p.payload -> 'event' AS payload,
    coalesce(p.key, 'generated') AS key,
    p.payload -> 'fallback' AS fallback_payload
  FROM public.event_patches AS p
)
INSERT INTO public.events (id, payload, fallback_payload, archived, key)
SELECT id, payload, fallback_payload, false, key
FROM prepared
RETURNING WITH (OLD AS absent, NEW AS inserted)
  absent.payload ->> 'id' AS previous_id,
  inserted.payload ->> 'id' AS inserted_id,
  inserted.fallback_payload ->> 'id' AS fallback_id,
  inserted.key AS inserted_key;
