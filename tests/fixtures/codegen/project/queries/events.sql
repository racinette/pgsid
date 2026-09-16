-- name: GetEvent :one
WITH selected AS (
  SELECT id, account_id, payload, state, created_at
  FROM public.events
  WHERE id = @id
)
SELECT
  selected.id,
  selected.payload,
  selected.payload -> 'actor' AS actor,
  selected.state,
  selected.created_at,
  accounts.id AS joined_account_id,
  accounts.display_name
FROM selected
LEFT JOIN public.accounts AS accounts ON accounts.id = selected.account_id;

-- name: UpdateEvent :one
UPDATE public.events
SET payload = @payload, note = @note
WHERE id = @id
RETURNING id, payload, payload ->> 'score' AS score, note;

-- name: DeleteFinishedEvents :execrows
DELETE FROM public.events
WHERE state = @state;

-- name: ListEvents :many
WITH selected AS (SELECT id, payload, note FROM public.events)
SELECT id, payload, note FROM selected ORDER BY id;

-- name: RenameEvent :exec
UPDATE public.events SET note = @note WHERE id = @id;

-- name: GetEventStates :one
SELECT states FROM public.events WHERE id = @id;

-- name: GetEventTypes :one
SELECT id, default_id, state, states, ARRAY[1, NULL]::int4[] AS numbers
FROM public.events WHERE id = @id;

-- name: GetBillingEvent :one
SELECT id, source_id, state FROM billing.events WHERE id = @id;
