-- Both right-hand values come from the OLD row. Resolving assignments in
-- target-list order would incorrectly make the second read the new payload.
UPDATE public.events AS e
SET (payload, fallback_payload) = (e.fallback_payload, e.payload)
WHERE e.archived
RETURNING WITH (OLD AS before, NEW AS after)
  before.payload ->> 'id' AS previous_payload_id,
  before.fallback_payload ->> 'id' AS previous_fallback_id,
  after.payload ->> 'id' AS current_payload_id,
  after.fallback_payload ->> 'id' AS current_fallback_id;
