-- @world checks

CREATE DOMAIN overflow_stock AS bigint;
CREATE DOMAIN nested_overflow_stock AS overflow_stock;
CREATE TYPE shipment_stage AS ENUM ('ready', 'held', 'dispatched');

CREATE TABLE replenishment_picks (
  id integer PRIMARY KEY,
  small_units smallint,
  warehouse_units integer,
  overflow_units nested_overflow_stock,
  recorded_units bigint,
  recorded_baseline integer,
  recorded_double bigint,
  recorded_ratio bigint,
  CONSTRAINT fallback_units CHECK (COALESCE(small_units, warehouse_units, overflow_units, 0) = recorded_units),
  CONSTRAINT fallback_baseline CHECK (COALESCE(small_units, 0) = recorded_baseline),
  CONSTRAINT fallback_double CHECK (COALESCE(small_units + small_units, overflow_units, 0) = recorded_double),
  CONSTRAINT fallback_ratio CHECK (COALESCE(overflow_units, warehouse_units / small_units, 0) = recorded_ratio)
);

CREATE TABLE delivery_defaults (
  id integer PRIMARY KEY,
  requested_day date,
  backup_day date,
  recorded_day date,
  scheduled_at timestamp,
  backup_schedule timestamp,
  recorded_schedule timestamp,
  confirmed_at timestamptz,
  backup_confirmation timestamptz,
  recorded_confirmation timestamptz,
  enabled boolean,
  backup_enabled boolean,
  recorded_enabled boolean,
  CONSTRAINT fallback_day CHECK (COALESCE(requested_day, backup_day, DATE '2000-01-01') = recorded_day),
  CONSTRAINT fallback_schedule CHECK (COALESCE(scheduled_at, backup_schedule, TIMESTAMP '2000-01-01') = recorded_schedule),
  CONSTRAINT fallback_confirmation CHECK (COALESCE(confirmed_at, backup_confirmation, TIMESTAMPTZ '2000-01-01 00:00:00+00') = recorded_confirmation),
  CONSTRAINT fallback_enabled CHECK (COALESCE(enabled, backup_enabled, false) = recorded_enabled)
);

CREATE TABLE shipment_labels (
  id integer PRIMARY KEY,
  short_label varchar(8) COLLATE "C",
  backup_label text COLLATE "C",
  recorded_label text COLLATE "C",
  code char(8) COLLATE "C",
  backup_code char(8) COLLATE "C",
  recorded_code char(8) COLLATE "C",
  fee numeric,
  backup_fee numeric,
  recorded_fee numeric,
  stage shipment_stage,
  backup_stage shipment_stage,
  recorded_stage shipment_stage,
  CONSTRAINT fallback_label CHECK (COALESCE(short_label, backup_label, 'parcel') = recorded_label),
  CONSTRAINT fallback_code CHECK (COALESCE(code, backup_code, 'P') = recorded_code),
  CONSTRAINT fallback_fee CHECK (COALESCE(fee, backup_fee, 0) = recorded_fee),
  CONSTRAINT fallback_stage CHECK (COALESCE(stage, backup_stage, 'ready') = recorded_stage)
);

CREATE TABLE shipment_fee_sign (
  id integer PRIMARY KEY,
  skip boolean NOT NULL DEFAULT false,
  amount numeric,
  other_amount numeric,
  comparison_record integer,
  larger_record numeric,
  smaller_record numeric,
  absolute_record numeric,
  negated_record numeric,
  original_record numeric,
  sign_record numeric,
  CONSTRAINT fee_order CHECK (CASE WHEN skip THEN true ELSE pg_catalog.numeric_cmp(amount, other_amount) = comparison_record END),
  CONSTRAINT fee_larger CHECK (CASE WHEN skip THEN true ELSE pg_catalog.numeric_larger(amount, other_amount) = larger_record END),
  CONSTRAINT fee_smaller CHECK (CASE WHEN skip THEN true ELSE pg_catalog.numeric_smaller(amount, other_amount) = smaller_record END),
  CONSTRAINT fee_absolute CHECK (CASE WHEN skip THEN true ELSE pg_catalog.abs(amount) = absolute_record END),
  CONSTRAINT fee_numeric_absolute CHECK (CASE WHEN skip THEN true ELSE pg_catalog.numeric_abs(amount) = absolute_record END),
  CONSTRAINT fee_negated CHECK (CASE WHEN skip THEN true ELSE pg_catalog.numeric_uminus(amount) = negated_record END),
  CONSTRAINT fee_original CHECK (CASE WHEN skip THEN true ELSE pg_catalog.numeric_uplus(amount) = original_record END),
  CONSTRAINT fee_sign CHECK (CASE WHEN skip THEN true ELSE pg_catalog.sign(amount) = sign_record END)
);

CREATE TABLE shipment_fee_scale (
  id integer PRIMARY KEY,
  skip boolean NOT NULL DEFAULT false,
  amount numeric,
  display_scale integer,
  minimum_scale integer,
  trimmed_record numeric,
  CONSTRAINT fee_display_scale CHECK (CASE WHEN skip THEN true ELSE pg_catalog.scale(amount) = display_scale END),
  CONSTRAINT fee_minimum_scale CHECK (CASE WHEN skip THEN true ELSE pg_catalog.min_scale(amount) = minimum_scale END),
  CONSTRAINT fee_trimmed CHECK (CASE WHEN skip THEN true ELSE pg_catalog.trim_scale(amount) = trimmed_record END)
);

CREATE TABLE shipment_fee_whole (
  id integer PRIMARY KEY,
  skip boolean NOT NULL DEFAULT false,
  amount numeric,
  ceiling_record numeric,
  floor_record numeric,
  CONSTRAINT fee_ceil CHECK (CASE WHEN skip THEN true ELSE pg_catalog.ceil(amount) = ceiling_record END),
  CONSTRAINT fee_ceiling CHECK (CASE WHEN skip THEN true ELSE pg_catalog.ceiling(amount) = ceiling_record END),
  CONSTRAINT fee_floor CHECK (CASE WHEN skip THEN true ELSE pg_catalog.floor(amount) = floor_record END)
);

CREATE TABLE shipment_fee_precision (
  id integer PRIMARY KEY,
  skip boolean NOT NULL DEFAULT false,
  amount numeric,
  places integer,
  rounded_record numeric,
  whole_rounded_record numeric,
  truncated_record numeric,
  whole_truncated_record numeric,
  CONSTRAINT fee_round_places CHECK (CASE WHEN skip THEN true ELSE pg_catalog.round(amount, places) = rounded_record END),
  CONSTRAINT fee_round_whole CHECK (CASE WHEN skip THEN true ELSE pg_catalog.round(amount) = whole_rounded_record END),
  CONSTRAINT fee_trunc_places CHECK (CASE WHEN skip THEN true ELSE pg_catalog.trunc(amount, places) = truncated_record END),
  CONSTRAINT fee_trunc_whole CHECK (CASE WHEN skip THEN true ELSE pg_catalog.trunc(amount) = whole_truncated_record END)
);

CREATE TABLE shipment_fee_small_units (
  id integer PRIMARY KEY,
  suppress_invalid boolean NOT NULL DEFAULT false,
  amount numeric,
  recorded_units smallint,
  recorded_amount numeric,
  CONSTRAINT fee_small_rounded CHECK (CASE WHEN suppress_invalid THEN true ELSE CAST(amount AS smallint) = recorded_units END),
  CONSTRAINT fee_small_numeric CHECK (CASE WHEN suppress_invalid THEN true ELSE CAST(recorded_units AS numeric) = recorded_amount END)
);

CREATE TABLE shipment_fee_regular_units (
  id integer PRIMARY KEY,
  suppress_invalid boolean NOT NULL DEFAULT false,
  amount numeric,
  recorded_units integer,
  recorded_amount numeric,
  CONSTRAINT fee_regular_rounded CHECK (CASE WHEN suppress_invalid THEN true ELSE CAST(amount AS integer) = recorded_units END),
  CONSTRAINT fee_regular_numeric CHECK (CASE WHEN suppress_invalid THEN true ELSE CAST(recorded_units AS numeric) = recorded_amount END)
);

CREATE TABLE shipment_fee_bulk_units (
  id integer PRIMARY KEY,
  suppress_invalid boolean NOT NULL DEFAULT false,
  amount numeric,
  recorded_units bigint,
  recorded_amount numeric,
  CONSTRAINT fee_bulk_rounded CHECK (CASE WHEN suppress_invalid THEN true ELSE CAST(amount AS bigint) = recorded_units END),
  CONSTRAINT fee_bulk_numeric CHECK (CASE WHEN suppress_invalid THEN true ELSE CAST(recorded_units AS numeric) = recorded_amount END)
);
