SELECT payload ->> 'id' AS value
FROM public.events
RIGHT JOIN public.event_copies USING (payload);
