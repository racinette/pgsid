-- name: GetEvent :one
SELECT id, source_id, state, metadata FROM billing.events WHERE id = @id;

-- name: GetEvent_linux :one
SELECT 1 AS value;

-- name: GetEvent_test :one
SELECT 2 AS value;

-- name: _Hidden :one
SELECT 3 AS value;

-- name: GetAliases :one
SELECT p.id AS public_id, q.id AS dotted_id, r.id AS underscored_id
FROM public.events p, "billing.extra".events q, billing_extra.events r;
