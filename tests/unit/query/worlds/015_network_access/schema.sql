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
