-- Explicit DEFAULT values and omitted identity/generated columns all cross a
-- database-computed assignment boundary. The generated JSON value still has
-- a declared target column and a transformation from payload.
INSERT INTO public.event_defaults (payload, label)
VALUES (DEFAULT, DEFAULT)
RETURNING
  id,
  payload ->> 'kind' AS kind,
  derived_payload ->> 'id' AS derived_id,
  label;
