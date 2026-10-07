-- @world checks
CREATE DOMAIN capability_mask AS bit(8);
CREATE DOMAIN installed_mask AS capability_mask;
CREATE DOMAIN requested_mask AS bit varying;
CREATE DOMAIN device_request AS requested_mask;

CREATE TABLE mask_profiles (
  id integer PRIMARY KEY,
  primary_mask installed_mask,
  recorded_mask bit(8),
  floor_mask bit(8),
  ceiling_mask bit(8),
  declared_bits integer,
  declared_octets integer,
  recorded_comparison integer,
  CONSTRAINT profile_width CHECK (bit_length(primary_mask) = declared_bits),
  CONSTRAINT profile_length CHECK (length(primary_mask) = declared_bits),
  CONSTRAINT profile_octets CHECK (octet_length(primary_mask) = declared_octets),
  CONSTRAINT profile_recorded CHECK (primary_mask = recorded_mask),
  CONSTRAINT profile_range CHECK (primary_mask BETWEEN floor_mask AND ceiling_mask),
  CONSTRAINT profile_comparison CHECK (bitcmp(primary_mask, floor_mask) = recorded_comparison)
);

CREATE TABLE device_mask_rules (
  id integer PRIMARY KEY,
  profile_id integer NOT NULL REFERENCES mask_profiles(id),
  requested_bits device_request,
  backup_bits bit varying,
  recorded_bits bit varying,
  floor_bits bit varying,
  ceiling_bits bit varying,
  use_request boolean,
  declared_bits integer,
  declared_octets integer,
  recorded_comparison integer,
  CONSTRAINT rule_default CHECK (COALESCE(requested_bits, backup_bits) = recorded_bits),
  CONSTRAINT rule_selected CHECK ((CASE WHEN use_request THEN requested_bits ELSE backup_bits END) = recorded_bits),
  CONSTRAINT rule_recognized CHECK (CASE recorded_bits WHEN requested_bits THEN true WHEN backup_bits THEN true ELSE recorded_bits IS NULL END),
  CONSTRAINT rule_membership CHECK (recorded_bits IN (requested_bits, backup_bits)),
  CONSTRAINT rule_window CHECK (recorded_bits BETWEEN floor_bits AND ceiling_bits),
  CONSTRAINT rule_comparison CHECK (varbitcmp(recorded_bits, floor_bits) = recorded_comparison),
  CONSTRAINT rule_width CHECK (bit_length(recorded_bits) = declared_bits),
  CONSTRAINT rule_length CHECK (length(recorded_bits) = declared_bits),
  CONSTRAINT rule_octets CHECK (octet_length(recorded_bits) = declared_octets)
);

CREATE TABLE mask_snapshots (
  id integer PRIMARY KEY,
  profile_id integer NOT NULL REFERENCES mask_profiles(id),
  variable_mask bit varying,
  fixed_mask installed_mask,
  expected_mask bit varying,
  expected_match boolean,
  prefer_fixed boolean,
  CONSTRAINT snapshot_equal CHECK ((variable_mask = fixed_mask) = expected_match),
  CONSTRAINT snapshot_case CHECK ((CASE WHEN prefer_fixed THEN fixed_mask ELSE variable_mask END) = expected_mask),
  CONSTRAINT snapshot_reverse_case CHECK ((CASE WHEN prefer_fixed THEN variable_mask ELSE fixed_mask END) = expected_mask),
  CONSTRAINT snapshot_default CHECK (COALESCE(variable_mask, fixed_mask) = expected_mask),
  CONSTRAINT snapshot_recognized CHECK ((CASE variable_mask WHEN fixed_mask THEN true ELSE false END) = expected_match),
  CONSTRAINT snapshot_allowed CHECK (variable_mask IN (B'00001111', X'FF', fixed_mask)),
  CONSTRAINT snapshot_empty CHECK ((variable_mask = B'') = (expected_mask = B''))
);

CREATE TABLE mask_transforms (
  id integer PRIMARY KEY,
  profile_id integer NOT NULL REFERENCES mask_profiles(id),
  source_mask installed_mask,
  filter_mask bit(8),
  flexible_mask device_request,
  flexible_filter bit varying,
  recorded_intersection bit varying,
  recorded_union bit varying,
  recorded_exclusive bit varying,
  recorded_complement bit varying,
  recorded_left bit varying,
  recorded_right bit varying,
  shift_distance integer,
  use_fixed boolean,
  CONSTRAINT transform_intersection CHECK ((source_mask & filter_mask) = recorded_intersection),
  CONSTRAINT transform_union CHECK ((source_mask | filter_mask) = recorded_union),
  CONSTRAINT transform_exclusive CHECK ((source_mask # filter_mask) = recorded_exclusive),
  CONSTRAINT transform_complement CHECK ((~source_mask) = recorded_complement),
  CONSTRAINT transform_left CHECK ((flexible_mask << shift_distance) = recorded_left),
  CONSTRAINT transform_right CHECK ((flexible_mask >> shift_distance) = recorded_right),
  CONSTRAINT transform_selected CHECK ((CASE WHEN use_fixed THEN source_mask & filter_mask ELSE flexible_mask & flexible_filter END) = recorded_intersection),
  CONSTRAINT transform_default CHECK (CASE WHEN use_fixed THEN true ELSE COALESCE(flexible_mask & flexible_filter, source_mask & filter_mask) = recorded_intersection END),
  CONSTRAINT transform_direct CHECK (CASE WHEN use_fixed THEN true ELSE bitxor(flexible_mask, flexible_filter) = recorded_exclusive END)
);

CREATE TABLE mask_imports (
  id integer PRIMARY KEY,
  profile_id integer NOT NULL REFERENCES mask_profiles(id),
  source_text text,
  source_varchar varchar,
  installed_bits installed_mask,
  flexible_bits device_request,
  expected_fixed bit(3),
  expected_varying bit varying,
  expected_assignment bit varying,
  rendered_text text,
  assignment_width integer,
  assignment_explicit boolean,
  use_installed boolean,
  CONSTRAINT import_fixed CHECK (CASE WHEN use_installed THEN true ELSE source_text::bit(3) = expected_fixed END),
  CONSTRAINT import_varying CHECK (CASE WHEN use_installed THEN true ELSE source_text::varbit(3) = expected_varying END),
  CONSTRAINT import_varchar CHECK (CASE WHEN use_installed THEN true ELSE source_varchar::varbit(3) = expected_varying END),
  CONSTRAINT import_resize CHECK (installed_bits::bit(3) = expected_fixed),
  CONSTRAINT import_maximum CHECK (installed_bits::varbit(3) = expected_varying),
  CONSTRAINT import_output CHECK (installed_bits::text = rendered_text),
  CONSTRAINT import_selected CHECK ((CASE WHEN use_installed THEN installed_bits::bit(3) ELSE source_text::bit(3) END) = expected_fixed),
  CONSTRAINT import_default CHECK (COALESCE(installed_bits::bit(3), source_text::bit(3)) = expected_fixed),
  CONSTRAINT import_fixed_assignment CHECK (pg_catalog."bit"(flexible_bits, assignment_width, assignment_explicit) = expected_assignment),
  CONSTRAINT import_varying_assignment CHECK (varbit(flexible_bits, assignment_width, assignment_explicit) = expected_assignment)
);

CREATE DOMAIN integer_mask_bits AS pg_catalog."bit";

CREATE TABLE mask_encodings (
  id integer PRIMARY KEY,
  profile_id integer NOT NULL REFERENCES mask_profiles(id),
  source_integer integer,
  source_bigint bigint,
  source_bits integer_mask_bits,
  expected_integer_bits bit(8),
  expected_bigint_bits bit(16),
  expected_integer integer,
  expected_bigint bigint,
  expected_low_bit bit(1),
  skip_decode boolean,
  select_integer boolean,
  CONSTRAINT encoding_integer CHECK (source_integer::bit(8) = expected_integer_bits),
  CONSTRAINT encoding_bigint CHECK (source_bigint::bit(16) = expected_bigint_bits),
  CONSTRAINT encoding_decode_integer CHECK (CASE WHEN skip_decode THEN true ELSE source_bits::int4 = expected_integer END),
  CONSTRAINT encoding_decode_bigint CHECK (CASE WHEN skip_decode THEN true ELSE source_bits::int8 = expected_bigint END),
  CONSTRAINT encoding_low_bit CHECK (source_integer::bit = expected_low_bit),
  CONSTRAINT encoding_selected CHECK ((CASE WHEN select_integer THEN source_integer ELSE source_bits::int4 END) = expected_integer),
  CONSTRAINT encoding_default CHECK (COALESCE(source_integer, source_bits::int4) = expected_integer),
  CONSTRAINT encoding_direct CHECK (pg_catalog."bit"(source_bigint,16) = expected_bigint_bits)
);

CREATE TABLE mask_patches (
  id integer PRIMARY KEY,
  profile_id integer NOT NULL REFERENCES mask_profiles(id),
  original_mask installed_mask,
  flexible_mask device_request,
  suffix_mask bit varying,
  recorded_combination bit varying,
  bit_position integer,
  replacement_bit integer,
  recorded_bit integer,
  recorded_patch bit varying,
  use_original boolean,
  CONSTRAINT patch_combination CHECK ((original_mask || suffix_mask) = recorded_combination),
  CONSTRAINT patch_direct_combination CHECK (bitcat(original_mask, suffix_mask) = recorded_combination),
  CONSTRAINT patch_read CHECK (CASE WHEN use_original THEN true ELSE get_bit(original_mask,bit_position) = recorded_bit END),
  CONSTRAINT patch_write CHECK (CASE WHEN use_original THEN true ELSE set_bit(original_mask,bit_position,replacement_bit) = recorded_patch END),
  CONSTRAINT patch_flexible_read CHECK (CASE WHEN use_original THEN true ELSE get_bit(flexible_mask,bit_position) = recorded_bit END),
  CONSTRAINT patch_flexible_write CHECK (CASE WHEN use_original THEN true ELSE set_bit(flexible_mask,bit_position,replacement_bit) = recorded_patch END),
  CONSTRAINT patch_selected CHECK ((CASE WHEN use_original THEN original_mask ELSE set_bit(original_mask,bit_position,replacement_bit) END) = recorded_patch),
  CONSTRAINT patch_default CHECK (COALESCE(flexible_mask,set_bit(original_mask,bit_position,replacement_bit)) = recorded_patch)
);

CREATE TABLE mask_windows (
  id integer PRIMARY KEY,
  profile_id integer NOT NULL REFERENCES mask_profiles(id),
  original_mask installed_mask,
  flexible_mask device_request,
  start_position integer,
  window_length integer,
  recorded_window bit varying,
  recorded_suffix bit varying,
  default_window bit varying,
  use_original boolean,
  CONSTRAINT window_fixed CHECK (CASE WHEN use_original THEN true ELSE substring(original_mask FROM start_position FOR window_length) = recorded_window END),
  CONSTRAINT window_flexible CHECK (CASE WHEN use_original THEN true ELSE substring(flexible_mask FROM start_position FOR window_length) = recorded_window END),
  CONSTRAINT window_direct CHECK (CASE WHEN use_original THEN true ELSE pg_catalog.substring(original_mask,start_position,window_length) = recorded_window END),
  CONSTRAINT window_suffix CHECK (substring(original_mask FROM start_position) = recorded_suffix),
  CONSTRAINT window_flexible_suffix CHECK (substring(flexible_mask FROM start_position) = recorded_suffix),
  CONSTRAINT window_selected CHECK ((CASE WHEN use_original THEN original_mask ELSE substring(original_mask FROM start_position FOR window_length) END) = recorded_window),
  CONSTRAINT window_default CHECK (COALESCE(default_window,substring(original_mask FROM start_position FOR window_length)) = recorded_window)
);

CREATE TABLE mask_overlays (
  id integer PRIMARY KEY,
  profile_id integer NOT NULL REFERENCES mask_profiles(id),
  original_mask installed_mask,
  flexible_mask device_request,
  replacement_mask bit varying,
  start_position integer,
  replacement_length integer,
  recorded_overlay bit varying,
  recorded_default_overlay bit varying,
  default_mask bit varying,
  use_original boolean,
  CONSTRAINT overlay_fixed CHECK (CASE WHEN use_original THEN true ELSE overlay(original_mask PLACING replacement_mask FROM start_position FOR replacement_length) = recorded_overlay END),
  CONSTRAINT overlay_flexible CHECK (CASE WHEN use_original THEN true ELSE overlay(flexible_mask PLACING replacement_mask FROM start_position FOR replacement_length) = recorded_overlay END),
  CONSTRAINT overlay_direct CHECK (CASE WHEN use_original THEN true ELSE pg_catalog.overlay(original_mask,replacement_mask,start_position,replacement_length) = recorded_overlay END),
  CONSTRAINT overlay_omitted CHECK (CASE WHEN use_original THEN true ELSE overlay(original_mask PLACING replacement_mask FROM start_position) = recorded_default_overlay END),
  CONSTRAINT overlay_flexible_omitted CHECK (CASE WHEN use_original THEN true ELSE overlay(flexible_mask PLACING replacement_mask FROM start_position) = recorded_default_overlay END),
  CONSTRAINT overlay_selected CHECK ((CASE WHEN use_original THEN original_mask ELSE overlay(original_mask PLACING replacement_mask FROM start_position FOR replacement_length) END) = recorded_overlay),
  CONSTRAINT overlay_default CHECK (COALESCE(default_mask,overlay(original_mask PLACING replacement_mask FROM start_position FOR replacement_length)) = recorded_overlay)
);

CREATE TABLE mask_searches (
  id integer PRIMARY KEY,
  profile_id integer NOT NULL REFERENCES mask_profiles(id),
  original_mask installed_mask,
  flexible_mask device_request,
  pattern_mask device_request,
  recorded_position integer,
  recorded_presence boolean,
  default_position integer,
  use_default boolean,
  CONSTRAINT search_fixed CHECK (CASE WHEN use_default THEN true ELSE position(pattern_mask IN original_mask) = recorded_position END),
  CONSTRAINT search_flexible CHECK (CASE WHEN use_default THEN true ELSE position(pattern_mask IN flexible_mask) = recorded_position END),
  CONSTRAINT search_direct CHECK (CASE WHEN use_default THEN true ELSE pg_catalog.position(original_mask,pattern_mask) = recorded_position END),
  CONSTRAINT search_present CHECK (CASE WHEN use_default THEN true ELSE (position(pattern_mask IN original_mask) > 0) = recorded_presence END),
  CONSTRAINT search_selected CHECK ((CASE WHEN use_default THEN default_position ELSE position(pattern_mask IN original_mask) END) = recorded_position),
  CONSTRAINT search_default CHECK (COALESCE(default_position,position(pattern_mask IN original_mask)) = recorded_position),
  CONSTRAINT search_flexible_default CHECK (COALESCE(default_position,position(pattern_mask IN flexible_mask)) = recorded_position)
);

CREATE TABLE mask_counts (
  id integer PRIMARY KEY,
  profile_id integer NOT NULL REFERENCES mask_profiles(id),
  original_mask installed_mask,
  flexible_mask device_request,
  recorded_count bigint,
  recorded_small_count smallint,
  default_count bigint,
  use_default boolean,
  CONSTRAINT count_fixed CHECK (CASE WHEN use_default THEN true ELSE bit_count(original_mask) = recorded_count END),
  CONSTRAINT count_flexible CHECK (CASE WHEN use_default THEN true ELSE bit_count(flexible_mask) = recorded_count END),
  CONSTRAINT count_direct CHECK (CASE WHEN use_default THEN true ELSE pg_catalog.bit_count(original_mask) = recorded_count END),
  CONSTRAINT count_small CHECK (CASE WHEN use_default THEN true ELSE bit_count(original_mask) = recorded_small_count END),
  CONSTRAINT count_selected CHECK ((CASE WHEN use_default THEN default_count ELSE bit_count(original_mask) END) = recorded_count),
  CONSTRAINT count_default CHECK (COALESCE(default_count,bit_count(original_mask)) = recorded_count),
  CONSTRAINT count_flexible_default CHECK (COALESCE(default_count,bit_count(flexible_mask)) = recorded_count)
);

CREATE TABLE mask_packets (
  id integer PRIMARY KEY,
  profile_id integer NOT NULL REFERENCES mask_profiles(id),
  original_mask installed_mask,
  flexible_mask device_request,
  recorded_wire bytea,
  default_wire bytea,
  use_default boolean,
  CONSTRAINT packet_fixed CHECK (CASE WHEN use_default THEN true ELSE bit_send(original_mask) = recorded_wire END),
  CONSTRAINT packet_flexible CHECK (CASE WHEN use_default THEN true ELSE varbit_send(flexible_mask) = recorded_wire END),
  CONSTRAINT packet_relabel CHECK (CASE WHEN use_default THEN true ELSE bit_send(flexible_mask) = recorded_wire END),
  CONSTRAINT packet_selected CHECK ((CASE WHEN use_default THEN default_wire ELSE bit_send(original_mask) END) = recorded_wire),
  CONSTRAINT packet_default CHECK (COALESCE(default_wire,bit_send(original_mask)) = recorded_wire),
  CONSTRAINT packet_flexible_default CHECK (COALESCE(default_wire,varbit_send(flexible_mask)) = recorded_wire)
);

CREATE DOMAIN raw_payload AS bytea;
CREATE DOMAIN stored_payload AS raw_payload;

CREATE TABLE mask_payloads (
  id integer PRIMARY KEY,
  profile_id integer NOT NULL REFERENCES mask_profiles(id),
  packet stored_payload,
  peer_packet stored_payload,
  recorded_comparison integer,
  larger_packet bytea,
  smaller_packet bytea,
  reversed_packet bytea,
  transmitted_packet bytea,
  recorded_length integer,
  recorded_bits integer,
  recorded_count bigint,
  CONSTRAINT payload_compare CHECK (byteacmp(packet,peer_packet) = recorded_comparison),
  CONSTRAINT payload_less CHECK ((packet < peer_packet) = (recorded_comparison < 0)),
  CONSTRAINT payload_less_equal CHECK ((packet <= peer_packet) = (recorded_comparison <= 0)),
  CONSTRAINT payload_greater CHECK ((packet > peer_packet) = (recorded_comparison > 0)),
  CONSTRAINT payload_greater_equal CHECK ((packet >= peer_packet) = (recorded_comparison >= 0)),
  CONSTRAINT payload_larger CHECK (bytea_larger(packet,peer_packet) = larger_packet),
  CONSTRAINT payload_smaller CHECK (bytea_smaller(packet,peer_packet) = smaller_packet),
  CONSTRAINT payload_length CHECK (length(packet) = recorded_length),
  CONSTRAINT payload_octets CHECK (octet_length(packet) = recorded_length),
  CONSTRAINT payload_bits CHECK (bit_length(packet) = recorded_bits),
  CONSTRAINT payload_count CHECK (bit_count(packet) = recorded_count),
  CONSTRAINT payload_reversed CHECK (reverse(packet) = reversed_packet),
  CONSTRAINT payload_sent CHECK (byteasend(packet) = transmitted_packet)
);

CREATE TABLE payload_patches (
  id integer PRIMARY KEY,
  profile_id integer NOT NULL REFERENCES mask_profiles(id),
  packet stored_payload,
  byte_position integer,
  bit_position bigint,
  replacement_byte integer,
  replacement_bit integer,
  recorded_byte integer,
  recorded_bit integer,
  byte_patch bytea,
  bit_patch bytea,
  CONSTRAINT patch_byte_value CHECK (get_byte(packet, byte_position) = recorded_byte),
  CONSTRAINT patch_bit_value CHECK (get_bit(packet, bit_position) = recorded_bit),
  CONSTRAINT patch_byte_result CHECK (set_byte(packet, byte_position, replacement_byte) = byte_patch),
  CONSTRAINT patch_bit_result CHECK (set_bit(packet, bit_position, replacement_bit) = bit_patch),
  CONSTRAINT patch_preserves_byte CHECK (set_byte(packet, byte_position, get_byte(packet, byte_position)) = packet),
  CONSTRAINT patch_preserves_bit CHECK (set_bit(packet, bit_position, get_bit(packet, bit_position)) = packet)
);

CREATE TABLE payload_ranges (
  id integer PRIMARY KEY,
  profile_id integer NOT NULL REFERENCES mask_profiles(id),
  packet stored_payload,
  pattern stored_payload,
  start_position integer,
  window_length integer,
  combined_packet bytea,
  window_packet bytea,
  suffix_packet bytea,
  overlaid_packet bytea,
  default_overlay bytea,
  recorded_position integer,
  trimmed_packet bytea,
  left_trimmed bytea,
  right_trimmed bytea,
  CONSTRAINT range_combination CHECK (packet || pattern = combined_packet),
  CONSTRAINT range_window CHECK (substring(packet FROM start_position FOR window_length) = window_packet),
  CONSTRAINT range_window_alias CHECK (substr(packet, start_position, window_length) = window_packet),
  CONSTRAINT range_suffix CHECK (substring(packet FROM start_position) = suffix_packet),
  CONSTRAINT range_suffix_alias CHECK (substr(packet, start_position) = suffix_packet),
  CONSTRAINT range_overlay CHECK (overlay(packet PLACING pattern FROM start_position FOR window_length) = overlaid_packet),
  CONSTRAINT range_default_overlay CHECK (overlay(packet PLACING pattern FROM start_position) = default_overlay),
  CONSTRAINT range_position CHECK (position(pattern IN packet) = recorded_position),
  CONSTRAINT range_trim CHECK (btrim(packet, pattern) = trimmed_packet),
  CONSTRAINT range_left_trim CHECK (ltrim(packet, pattern) = left_trimmed),
  CONSTRAINT range_right_trim CHECK (rtrim(packet, pattern) = right_trimmed)
);

CREATE TABLE payload_scalar_wires (
  id integer PRIMARY KEY,
  profile_id integer NOT NULL REFERENCES mask_profiles(id),
  input_wire stored_payload,
  source_small smallint,
  source_integer integer,
  source_bigint bigint,
  source_flag boolean,
  source_day date,
  source_local timestamp,
  source_instant timestamptz,
  expected_small smallint,
  expected_integer integer,
  expected_bigint bigint,
  small_wire bytea,
  integer_wire bytea,
  bigint_wire bytea,
  bool_wire bytea,
  day_wire bytea,
  local_wire bytea,
  instant_wire bytea,
  CONSTRAINT scalar_small_read CHECK (input_wire::smallint = expected_small),
  CONSTRAINT scalar_integer_read CHECK (input_wire::integer = expected_integer),
  CONSTRAINT scalar_bigint_read CHECK (input_wire::bigint = expected_bigint),
  CONSTRAINT scalar_small_cast CHECK (source_small::bytea = small_wire),
  CONSTRAINT scalar_small_send CHECK (int2send(source_small) = small_wire),
  CONSTRAINT scalar_integer_cast CHECK (source_integer::bytea = integer_wire),
  CONSTRAINT scalar_integer_send CHECK (int4send(source_integer) = integer_wire),
  CONSTRAINT scalar_bigint_cast CHECK (source_bigint::bytea = bigint_wire),
  CONSTRAINT scalar_bigint_send CHECK (int8send(source_bigint) = bigint_wire),
  CONSTRAINT scalar_boolean_send CHECK (boolsend(source_flag) = bool_wire),
  CONSTRAINT scalar_date_send CHECK (date_send(source_day) = day_wire),
  CONSTRAINT scalar_timestamp_send CHECK (timestamp_send(source_local) = local_wire),
  CONSTRAINT scalar_instant_send CHECK (timestamptz_send(source_instant) = instant_wire)
);

CREATE TABLE payload_hashes (
  id integer PRIMARY KEY,
  profile_id integer NOT NULL REFERENCES mask_profiles(id),
  packet stored_payload,
  seed bigint,
  recorded_hash integer,
  recorded_seeded bigint,
  recorded_crc bigint,
  recorded_crc_c bigint,
  CONSTRAINT digest_hash CHECK (hashbytea(packet) = recorded_hash),
  CONSTRAINT digest_seeded CHECK (hashbyteaextended(packet, seed) = recorded_seeded),
  CONSTRAINT digest_crc CHECK (crc32(packet) = recorded_crc),
  CONSTRAINT digest_crc_c CHECK (crc32c(packet) = recorded_crc_c)
);

CREATE TABLE payload_labels (
  id integer PRIMARY KEY,
  profile_id integer NOT NULL REFERENCES mask_profiles(id),
  label text COLLATE "C",
  short_label varchar COLLATE "C",
  fixed_label char(8) COLLATE "C",
  recorded_code integer,
  recorded_trim text COLLATE "C",
  CONSTRAINT label_code CHECK (ascii(label) = recorded_code),
  CONSTRAINT label_varchar_code CHECK (ascii(short_label) = recorded_code),
  CONSTRAINT label_fixed_code CHECK (ascii(fixed_label::text) = recorded_code),
  CONSTRAINT label_trimmed CHECK (fixed_label::text = recorded_trim)
);
