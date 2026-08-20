-- Data state for the sqlc disagreement register. OURS, not vendored:
-- applied after schema.sql, inside the case's transaction. Why this state
-- is the one that decides the case is recorded in adjudication.json.

-- `organisation.legal_name` carries no constraint — the NOT NULL in the
-- schema belongs to `llc`, its CHILD, and merging runs parent -> child only.
INSERT INTO organisation (party_id, name, legal_name)
VALUES ('11111111-1111-1111-1111-111111111111', 'acme', NULL);
