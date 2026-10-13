-- @world checks
CREATE TABLE replicated_resource_limits (
  id integer PRIMARY KEY,
  replica_slots smallint,
  requested_slots integer,
  failover_slots bigint,
  capacity_limit bigint NOT NULL,
  review_waived boolean NOT NULL,
  CONSTRAINT reservation_fits_capacity CHECK (
    CASE WHEN review_waived THEN true
      ELSE GREATEST(replica_slots + replica_slots, requested_slots, failover_slots) <= capacity_limit
    END
  )
);

CREATE TABLE contract_price_limits (
  id integer PRIMARY KEY,
  listed_price numeric,
  negotiated_price numeric,
  minimum_price numeric NOT NULL,
  CONSTRAINT selected_price_meets_floor CHECK (
    LEAST(listed_price, negotiated_price) >= minimum_price
  )
);

CREATE TABLE latency_samples (
  id integer PRIMARY KEY,
  declared_latency integer,
  total_latency integer,
  sample_count integer,
  maximum_latency integer NOT NULL,
  review_waived boolean NOT NULL,
  CONSTRAINT observed_latency_within_limit CHECK (
    CASE WHEN review_waived THEN true
      ELSE GREATEST(declared_latency, total_latency / sample_count) <= maximum_latency
    END
  )
);
