-- name: publication_approved
INSERT INTO publication_reviews (id, approved, blocked) VALUES (2, true, false);
-- name: publication_denied
INSERT INTO publication_reviews (id, approved, blocked) VALUES (2, false, false);
-- name: publication_undecided
INSERT INTO publication_reviews (id, approved, blocked) VALUES (2, NULL, false);
-- name: publication_blocked
INSERT INTO publication_reviews (id, approved, blocked) VALUES (2, true, true);
-- name: publication_block_unspecified
INSERT INTO publication_reviews (id, approved, blocked) VALUES (2, true, NULL);

-- name: delivery_permitted
INSERT INTO delivery_permissions (id, revoked, allowed) VALUES (2, false, true);
-- name: delivery_revoked
INSERT INTO delivery_permissions (id, revoked, allowed) VALUES (2, true, true);
-- name: delivery_revocation_unspecified
INSERT INTO delivery_permissions (id, revoked, allowed) VALUES (2, NULL, true);
-- name: delivery_disallowed
INSERT INTO delivery_permissions (id, revoked, allowed) VALUES (2, false, false);
-- name: delivery_allowance_unspecified
INSERT INTO delivery_permissions (id, revoked, allowed) VALUES (2, false, NULL);

-- name: handoff_accepted
INSERT INTO review_handoffs (id, previous_result, current_result) VALUES (2, NULL, true);
-- name: handoff_declined
INSERT INTO review_handoffs (id, previous_result, current_result) VALUES (2, NULL, false);
-- name: handoff_previous_accepted
INSERT INTO review_handoffs (id, previous_result, current_result) VALUES (2, true, true);
-- name: handoff_previous_declined
INSERT INTO review_handoffs (id, previous_result, current_result) VALUES (2, false, true);
-- name: handoff_current_pending
INSERT INTO review_handoffs (id, previous_result, current_result) VALUES (2, NULL, NULL);
