CREATE TABLE public.events (
  id bigint PRIMARY KEY,
  payload jsonb NOT NULL,
  fallback_payload jsonb,
  archived_payload jsonb,
  archived boolean NOT NULL,
  key text NOT NULL
);

CREATE FUNCTION public.shadow_json_get(document jsonb, key text)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
STRICT
RETURN document;

CREATE OPERATOR public.-> (
  LEFTARG = jsonb,
  RIGHTARG = text,
  FUNCTION = public.shadow_json_get
);
