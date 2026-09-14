SELECT payload ->> 'id' AS value
FROM public.events
FULL JOIN public.event_copies USING (payload);
