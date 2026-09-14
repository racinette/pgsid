-- Star expansion must retain the full target shape for an absent OLD image
-- and a present NEW image, including duplicate output names and column order.
INSERT INTO public.events (id, payload, archived, key)
VALUES (4001, '{"kind":"star"}'::jsonb, false, 'star')
RETURNING WITH (OLD AS before, NEW AS after)
  before.*,
  after.*;
