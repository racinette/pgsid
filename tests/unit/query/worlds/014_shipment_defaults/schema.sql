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
