SELECT
  COALESCE(payload, fallback_payload) AS available_payload,
  CASE WHEN archived THEN archived_payload ELSE payload END AS selected_payload
FROM public.events;
