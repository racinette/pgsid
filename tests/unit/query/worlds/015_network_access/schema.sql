-- @world checks
CREATE DOMAIN peer_address AS inet;

CREATE TABLE network_peers (
  id integer PRIMARY KEY,
  address peer_address,
  allowed cidr,
  floor_address inet,
  ceiling_address inet,
  backup_address inet,
  recorded_address inet,
  prefer_primary boolean,
  CONSTRAINT peer_within_allowed CHECK (address <<= allowed),
  CONSTRAINT peer_in_address_range CHECK (address BETWEEN floor_address AND ceiling_address),
  CONSTRAINT peer_default_recorded CHECK (COALESCE(address, backup_address) = recorded_address),
  CONSTRAINT peer_selected_recorded CHECK ((CASE WHEN prefer_primary THEN address ELSE backup_address END) = recorded_address)
);

CREATE TABLE network_subnets (
  id integer PRIMARY KEY,
  subnet cidr,
  parent_network cidr,
  forbidden_network cidr,
  CONSTRAINT subnet_strictly_inside_parent CHECK (subnet << parent_network),
  CONSTRAINT subnet_avoids_forbidden CHECK (NOT (subnet && forbidden_network))
);

CREATE TABLE network_imports (
  id integer PRIMARY KEY,
  raw_address text,
  raw_network text,
  expected_address inet,
  expected_network cidr,
  skip_import boolean,
  CONSTRAINT import_address_parsed CHECK (CASE WHEN skip_import THEN true ELSE raw_address::inet = expected_address END),
  CONSTRAINT import_network_parsed CHECK (CASE WHEN skip_import THEN true ELSE raw_network::cidr = expected_network END)
);

CREATE TABLE network_allocations (
  id integer PRIMARY KEY,
  address inet,
  address_offset bigint,
  allocated_address inet,
  comparison_address inet,
  address_distance bigint,
  CONSTRAINT allocation_shifted CHECK (address + address_offset = allocated_address),
  CONSTRAINT allocation_shifted_reverse CHECK (address_offset + address = allocated_address),
  CONSTRAINT allocation_restored CHECK (allocated_address - address_offset = address),
  CONSTRAINT allocation_distance CHECK (address - comparison_address = address_distance)
);
