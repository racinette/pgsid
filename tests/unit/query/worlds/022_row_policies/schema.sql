-- @world checks
CREATE TABLE dispatch_windows (
  id integer PRIMARY KEY,
  requested_priority smallint,
  requested_ticket bigint,
  opening_priority integer NOT NULL,
  opening_ticket bigint NOT NULL,
  closing_priority integer NOT NULL,
  closing_ticket bigint NOT NULL,
  CONSTRAINT dispatch_after_opening CHECK (
    ROW(requested_priority, requested_ticket) > ROW(opening_priority, opening_ticket)
  ),
  CONSTRAINT dispatch_before_or_at_closing CHECK (
    ROW(requested_priority, requested_ticket) <= ROW(closing_priority, closing_ticket)
  )
);

CREATE TABLE parcel_reconciliations (
  id integer PRIMARY KEY,
  recorded_count integer,
  recorded_label text COLLATE "C",
  observed_count integer,
  observed_label text COLLATE "C",
  confirmation_required boolean NOT NULL,
  CONSTRAINT known_parcel_fields_agree CHECK (
    ROW(recorded_count, recorded_label) = ROW(observed_count, observed_label)
  ),
  CONSTRAINT confirmed_parcel_fields_match CHECK (
    confirmation_required IS NOT TRUE OR
    ROW(recorded_count, recorded_label) IS NOT DISTINCT FROM ROW(observed_count, observed_label)
  )
);

CREATE TABLE batch_quality_samples (
  id integer PRIMARY KEY,
  quality_category integer,
  total_score integer,
  sample_count integer,
  minimum_category integer NOT NULL,
  minimum_score integer NOT NULL,
  review_waived boolean NOT NULL,
  CONSTRAINT sampled_quality_meets_floor CHECK (
    CASE WHEN review_waived THEN true
      ELSE ROW(quality_category, total_score / sample_count) >= ROW(minimum_category, minimum_score)
    END
  )
);

CREATE TABLE replacement_requests (
  id integer PRIMARY KEY,
  current_quantity integer,
  current_size integer,
  proposed_quantity integer,
  proposed_size integer,
  shrink_only boolean NOT NULL,
  change_confirmed boolean NOT NULL,
  CONSTRAINT known_replacement_changes CHECK (
    ROW(proposed_quantity, proposed_size) <> ROW(current_quantity, current_size)
  ),
  CONSTRAINT shrinking_replacement_decreases CHECK (
    shrink_only IS NOT TRUE OR
    ROW(proposed_quantity, proposed_size) < ROW(current_quantity, current_size)
  ),
  CONSTRAINT confirmed_replacement_changes CHECK (
    change_confirmed IS NOT TRUE OR
    ROW(proposed_quantity, proposed_size) IS DISTINCT FROM ROW(current_quantity, current_size)
  )
);
