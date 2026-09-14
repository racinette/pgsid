SELECT payload ->> 'id' AS value
FROM public.events
LEFT JOIN public.event_copies USING (payload);
