-- DELETE exposes the OLD target, an absent NEW image, and USING columns as
-- separate sources in the same RETURNING expression scope.
DELETE FROM public.events AS e
USING public.event_patches AS p
WHERE p.event_id = e.id
  AND p.should_delete
RETURNING WITH (OLD AS removed, NEW AS absent)
  removed.payload ->> 'id' AS removed_id,
  absent.payload ->> 'id' AS replacement_id,
  p.payload ->> 'reason' AS reason;
