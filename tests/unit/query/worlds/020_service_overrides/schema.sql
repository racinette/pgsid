-- @world checks
CREATE TABLE service_efficiency_samples (
  id integer PRIMARY KEY,
  completed_jobs integer,
  duration_seconds integer,
  jobs_per_second_limit integer NOT NULL,
  review_waived boolean NOT NULL,
  CONSTRAINT measured_efficiency_limit CHECK (
    CASE WHEN review_waived THEN true
      ELSE completed_jobs / NULLIF(duration_seconds, 0) <= jobs_per_second_limit
    END
  )
);

CREATE TABLE contact_label_rules (
  id integer PRIMARY KEY,
  display_label text,
  placeholder_label text NOT NULL,
  fallback_label text,
  label_required boolean NOT NULL,
  CONSTRAINT required_label_is_meaningful CHECK (
    label_required IS NOT TRUE OR NULLIF(display_label, placeholder_label) IS NOT NULL
  ),
  CONSTRAINT effective_label_is_nonempty CHECK (
    COALESCE(NULLIF(display_label, placeholder_label), fallback_label) <> ''
  )
);

CREATE TABLE network_route_overrides (
  id integer PRIMARY KEY,
  previous_route cidr,
  next_route inet,
  override_route inet,
  CONSTRAINT changed_route_records_previous CHECK (
    NULLIF(previous_route, next_route) IS NOT DISTINCT FROM override_route
  )
);
