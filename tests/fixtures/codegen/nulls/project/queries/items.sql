-- name: GetItem :one
SELECT id, user_id, state, payload, maybe_payload, numbers, metadata, payload -> 'requiredNullable' AS nullable_value FROM public.items WHERE id = @id;

-- name: ListItems :many
SELECT id, user_id, state, payload, maybe_payload, numbers, metadata, payload -> 'requiredNullable' AS nullable_value FROM public.items;

-- name: SetItem :exec
UPDATE public.items SET user_id = @user_id, state = @state, payload = @payload, numbers = @numbers, metadata = @metadata WHERE id = @id;
