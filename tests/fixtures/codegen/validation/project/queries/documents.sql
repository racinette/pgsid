-- name: GetDocument :one
WITH selected AS (SELECT * FROM documents)
SELECT payload, payload -> 'node' AS node, unchecked, forced, maybe, strict FROM selected;

-- name: ListDocuments :many
SELECT payload FROM documents;

-- name: GetNode :one
SELECT payload -> 'node' AS node FROM documents;

-- name: UpdateDocument :one
UPDATE documents SET payload = @payload RETURNING payload;

-- name: GetName :one
SELECT payload ->> 'name' AS name FROM documents;

-- name: GetPrototype :one
SELECT payload AS "__proto__" FROM documents;
