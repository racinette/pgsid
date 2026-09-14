-- PostgreSQL expands MERGE RETURNING * source-first, then target. The equal
-- payload/key names make a silent ordering reversal observable.
MERGE INTO public.events AS e
USING public.event_patches AS p
ON p.event_id = e.id
WHEN MATCHED THEN
  UPDATE SET payload = p.payload
RETURNING *;
