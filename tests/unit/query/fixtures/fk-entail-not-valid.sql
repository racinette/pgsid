-- Gate: a foreign key with `convalidated = false` entails nothing — WITNESSED.
--
-- Three routes clear that bit and the adapter reads only the bit, so one gate
-- covers all three: a NOT VALID key (pre-existing rows are unchecked when it
-- is added), a PG18 NOT ENFORCED key, and `ALTER CONSTRAINT … NOT ENFORCED`
-- on an already-validated one. All measured.
--
-- NOT ENFORCED is the route a single statement can exercise, and that is why
-- this fixture scans `inbound_receipts` rather than `fk_nv`. NOT VALID still
-- gates new WRITES — measured, the dangling INSERT raises — and the schema is
-- applied before any data state, so no seeded row can dangle there. NOT
-- ENFORCED gates nothing at all, so a data-modifying CTE writes the dangling
-- row and reads it straight back, inside the one statement a fixture gets.
-- `code` is NULL in every state: warehouse -1 exists nowhere, and the key
-- neither stops the write nor supplies a match.
--
-- The old note called this class unwitnessable and it was reasoning about
-- SEEDS. Until this was written the `convalidated` refusal had NO executed
-- witness anywhere: `fk_nv` is seeded by no data state, so the query returned
-- zero rows in every state and even its notNull claim was vacuous — and
-- `inbound_receipts`, which had carried a NOT ENFORCED key since it was
-- added, was referenced by no fixture and no data state at all.
--
-- fk_nv needs no claim of its own now. It sets the same bit by a route no
-- single statement can dangle, so this column stands behind it.
WITH ins AS (
  INSERT INTO inbound_receipts (id, warehouse_id, qty)
  VALUES (1, -1, 5) RETURNING warehouse_id
)
SELECT
  i.warehouse_id AS wh_id,   -- @notNull
  w.code         AS wh_code  -- @nullable
FROM ins i
LEFT JOIN warehouses w ON w.id = i.warehouse_id
