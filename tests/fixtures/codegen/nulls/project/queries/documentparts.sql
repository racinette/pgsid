-- name: GetParts :one
WITH selected AS (
  SELECT payload FROM public.items WHERE id = @id
)
SELECT
  payload -> 'nested' AS nested,
  payload -> 'members' AS members,
  payload -> 'members' -> 0 AS first_member,
  payload -> 'members' -> -1 AS last_member,
  payload -> 'members' -> 0 -> 'profile' AS profile,
  payload -> 'lookup' -> 'key' AS lookup_value,
  payload -> 'node' AS node
FROM selected;

-- name: GetNestedFunction :one
SELECT jsonb_extract_path(payload, 'nested') AS nested FROM public.items WHERE id = @id;
