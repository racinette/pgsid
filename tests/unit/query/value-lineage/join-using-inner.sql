SELECT payload ->> 'id' AS value
FROM public.events
INNER JOIN public.event_copies USING (payload);
