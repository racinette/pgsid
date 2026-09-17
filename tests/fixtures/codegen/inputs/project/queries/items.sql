-- name: InsertPayload :exec
INSERT INTO items (payload) VALUES (@payload);

-- name: UpdatePayload :execrows
UPDATE items SET payload = @payload WHERE id = @id;

-- name: ReturningPayload :one
UPDATE items SET payload = @payload RETURNING payload;

-- name: ReturningMany :many
UPDATE items SET payload = @payload RETURNING payload;

-- name: InsertFromCte :exec
WITH a AS (SELECT @payload::jsonb AS payload), b AS (SELECT payload FROM a)
INSERT INTO items (payload) SELECT payload FROM b;

-- name: WriteInCte :one
WITH written AS (INSERT INTO items (payload) VALUES (@payload) RETURNING payload)
SELECT payload FROM written;

-- name: InsertMany :exec
INSERT INTO items (payload) VALUES (@first), (@second);

-- name: Upsert :exec
INSERT INTO items (id, payload) VALUES (@id, @first)
ON CONFLICT (id) DO UPDATE SET payload = @second;

-- name: InsertUnchecked :exec
INSERT INTO items (payload, unchecked) VALUES ('{"actor":1}', @payload);

-- name: InsertMaybe :exec
INSERT INTO items (payload, maybe) VALUES ('{"actor":1}', @payload);

-- name: InsertJSONNull :exec
INSERT INTO items (payload, literal) VALUES ('{"actor":1}', @payload);

-- name: InsertArray :exec
INSERT INTO items (payload, numbers) VALUES ('{"actor":1}', @payload);

-- name: MultipleSchemas :exec
INSERT INTO items (payload, audit) VALUES (@payload, @payload);

-- name: TupleUpdate :exec
UPDATE items SET (payload, unchecked) = (@first, @second);

-- name: CastJSON :exec
INSERT INTO items (payload) VALUES (@payload::json::jsonb);

-- name: MergePayload :exec
MERGE INTO items USING (SELECT @id::integer AS id, @payload::jsonb AS payload) AS source
ON items.id = source.id
WHEN MATCHED THEN UPDATE SET payload = source.payload
WHEN NOT MATCHED THEN INSERT (id, payload) VALUES (source.id, source.payload);

-- name: SelectActor :one
SELECT payload -> 'actor' AS actor FROM items WHERE id = @id;

-- name: SelectActorFromCte :one
WITH source AS (SELECT payload FROM items WHERE id = @id),
projected AS (SELECT payload -> 'actor' AS actor FROM source)
SELECT actor FROM projected;

-- name: SelectActorChoice :one
SELECT CASE WHEN id > 0 THEN payload -> 'actor' ELSE audit -> 'actor' END AS actor
FROM items WHERE id = @id;
