-- @world checks
CREATE DOMAIN display_toggle AS boolean;
CREATE DOMAIN route_address AS inet;
CREATE DOMAIN route_scope AS cidr;

CREATE TABLE display_flags (
  id integer PRIMARY KEY,
  enabled display_toggle,
  short_label text,
  audit_label text,
  fallback_label text,
  prefer_current boolean,
  CONSTRAINT flag_short_label CHECK (short_label IS NOT DISTINCT FROM enabled::varchar(4)::text),
  CONSTRAINT flag_audit_label CHECK (audit_label IS NOT DISTINCT FROM enabled::char(5)::text),
  CONSTRAINT flag_selected_label CHECK (
    fallback_label IS NOT DISTINCT FROM
      (CASE WHEN prefer_current THEN enabled ELSE false END)::varchar(5)::text
  )
);

CREATE TABLE network_endpoints (
  id integer PRIMARY KEY,
  flag_id integer NOT NULL REFERENCES display_flags (id),
  address route_address,
  short_label text,
  audit_label text,
  address_shift bigint,
  shifted_label text,
  skip_shift boolean,
  CONSTRAINT endpoint_short_label CHECK (short_label IS NOT DISTINCT FROM address::varchar(8)::text),
  CONSTRAINT endpoint_audit_label CHECK (audit_label IS NOT DISTINCT FROM address::char(20)::text),
  CONSTRAINT endpoint_shifted_label CHECK (
    CASE WHEN skip_shift THEN true
      ELSE shifted_label IS NOT DISTINCT FROM (address + address_shift)::varchar(10)::text
    END
  )
);

CREATE TABLE network_scopes (
  id integer PRIMARY KEY,
  flag_id integer NOT NULL REFERENCES display_flags (id),
  scope route_scope,
  display_label text,
  preview_label text,
  backup_scope route_scope,
  prefer_primary boolean,
  selected_label text,
  CONSTRAINT scope_display_label CHECK (display_label IS NOT DISTINCT FROM scope::varchar::text),
  CONSTRAINT scope_preview_label CHECK (preview_label IS NOT DISTINCT FROM scope::char(12)::text),
  CONSTRAINT scope_selected_label CHECK (
    selected_label IS NOT DISTINCT FROM
      (CASE WHEN prefer_primary THEN scope ELSE backup_scope END)::varchar(10)::text
  )
);
