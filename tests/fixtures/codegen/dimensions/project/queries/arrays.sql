-- name: GetArrays :one
SELECT ordinary, matrix, cube, flexible, optional_flexible, owners FROM arrays WHERE id = @id;

-- name: GetNested :one
WITH first AS (SELECT matrix, flexible FROM arrays),
second AS (SELECT matrix AS renamed, flexible FROM first)
SELECT renamed, flexible FROM second;

-- name: GetView :one
SELECT matrix, flexible FROM array_view;

-- name: GetAccess :one
SELECT matrix[1][2] AS element, matrix[1] AS incomplete,
matrix[1:2][1:2] AS sliced, flexible[1:2] AS flexible_slice FROM arrays;

-- name: GetChoice :one
SELECT CASE WHEN id > 0 THEN matrix ELSE ordinary END AS mixed FROM arrays;

-- name: InsertArrays :exec
INSERT INTO arrays (id, ordinary, matrix, flexible, owners)
VALUES (@id, @ordinary, @matrix, @flexible, @owners);

-- name: InsertFromCte :exec
WITH input AS (SELECT @matrix::integer[] AS matrix, @flexible::integer[] AS flexible)
INSERT INTO arrays (id, ordinary, matrix, flexible, owners)
SELECT 1, ARRAY[1], matrix, flexible, ARRAY[1]::user_id[] FROM input;

-- name: UpdateFlexible :execrows
UPDATE arrays SET flexible = @flexible, optional_flexible = @optional WHERE id = @id;

-- name: ReturnFlexible :one
UPDATE arrays SET flexible = @flexible WHERE id = @id RETURNING flexible;

-- name: ReturnMany :many
UPDATE arrays SET flexible = @flexible RETURNING flexible;

-- name: OptionalFlexible :one
SELECT optional_flexible FROM arrays;

-- name: SharedDimensions :exec
INSERT INTO arrays (id, ordinary, matrix, flexible, owners)
VALUES (1, ARRAY[1], @shared, @shared, ARRAY[1]::user_id[]);
