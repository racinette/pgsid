-- @world checks

CREATE TABLE publication_reviews (
  id integer PRIMARY KEY,
  approved boolean,
  blocked boolean,
  CONSTRAINT publication_approved CHECK (approved IS TRUE),
  CONSTRAINT publication_unblocked CHECK (blocked IS NOT TRUE)
);

CREATE TABLE delivery_permissions (
  id integer PRIMARY KEY,
  revoked boolean,
  allowed boolean,
  CONSTRAINT delivery_not_revoked CHECK (revoked IS FALSE),
  CONSTRAINT delivery_allowed CHECK (allowed IS NOT FALSE)
);

CREATE TABLE review_handoffs (
  id integer PRIMARY KEY,
  previous_result boolean,
  current_result boolean,
  CONSTRAINT previous_review_pending CHECK (previous_result IS UNKNOWN),
  CONSTRAINT current_review_decided CHECK (current_result IS NOT UNKNOWN)
);
