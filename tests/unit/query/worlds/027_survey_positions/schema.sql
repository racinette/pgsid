-- @world checks
CREATE DOMAIN survey_point AS point;
CREATE TABLE survey_locations (
  id integer PRIMARY KEY,
  label text NOT NULL,
  position survey_point,
  recorded_wire bytea,
  was_measured boolean NOT NULL,
  CONSTRAINT location_wire CHECK (point_send(position) = recorded_wire),
  CONSTRAINT location_presence CHECK (was_measured = (position IS NOT NULL))
);
CREATE TABLE coordinate_constructions (
  id integer PRIMARY KEY,
  location_id integer NOT NULL REFERENCES survey_locations (id),
  x double precision,
  y double precision,
  recorded_position survey_point,
  recorded_wire bytea,
  skip_validation boolean NOT NULL,
  CONSTRAINT construction_position CHECK (CASE WHEN skip_validation THEN true ELSE point(x,y) ~= recorded_position END),
  CONSTRAINT construction_wire CHECK (CASE WHEN skip_validation THEN true ELSE point_send(point(x,y)) = recorded_wire END)
);
CREATE TABLE survey_matches (
  id integer PRIMARY KEY,
  location_id integer NOT NULL REFERENCES survey_locations (id),
  candidate_point survey_point,
  reference_point point,
  recorded_match boolean,
  choose_candidate boolean NOT NULL,
  recorded_selection bytea,
  recorded_coalesced bytea,
  skip_validation boolean NOT NULL,
  CONSTRAINT survey_same_position CHECK (CASE WHEN skip_validation THEN true ELSE (candidate_point ~= reference_point) = recorded_match END),
  CONSTRAINT survey_selection CHECK (CASE WHEN skip_validation THEN true ELSE point_send(CASE WHEN choose_candidate THEN candidate_point ELSE reference_point END) = recorded_selection END),
  CONSTRAINT survey_coalesced CHECK (CASE WHEN skip_validation THEN true ELSE point_send(COALESCE(candidate_point,reference_point)) = recorded_coalesced END)
);

CREATE TABLE survey_offsets (
  id integer PRIMARY KEY,
  location_id integer NOT NULL REFERENCES survey_locations (id),
  label text NOT NULL,
  base_position survey_point,
  adjustment point,
  recorded_sum point,
  recorded_difference point,
  skip_validation boolean NOT NULL,
  CONSTRAINT offset_sum CHECK (CASE WHEN skip_validation THEN true ELSE (base_position + adjustment) ~= recorded_sum END),
  CONSTRAINT offset_difference CHECK (CASE WHEN skip_validation THEN true ELSE (base_position - adjustment) ~= recorded_difference END)
);
CREATE TABLE survey_transforms (
  id integer PRIMARY KEY,
  location_id integer NOT NULL REFERENCES survey_locations (id),
  label text NOT NULL,
  source_position survey_point,
  factor point,
  recorded_product point,
  recorded_quotient point,
  skip_validation boolean NOT NULL,
  CONSTRAINT transform_product CHECK (CASE WHEN skip_validation THEN true ELSE (source_position * factor) ~= recorded_product END),
  CONSTRAINT transform_quotient CHECK (CASE WHEN skip_validation THEN true ELSE (source_position / factor) ~= recorded_quotient END)
);
CREATE TABLE survey_measurements (
  id integer PRIMARY KEY,
  location_id integer NOT NULL REFERENCES survey_locations (id),
  label text NOT NULL,
  origin survey_point,
  destination point,
  recorded_distance bytea,
  recorded_slope bytea,
  recorded_left boolean,
  recorded_right boolean,
  recorded_above boolean,
  recorded_below boolean,
  recorded_horizontal boolean,
  recorded_vertical boolean,
  skip_validation boolean NOT NULL,
  skip_slope boolean NOT NULL,
  CONSTRAINT measurement_distance CHECK (CASE WHEN skip_validation THEN true ELSE float8send(origin <-> destination) = recorded_distance END),
  CONSTRAINT measurement_slope CHECK (CASE WHEN skip_validation OR skip_slope THEN true ELSE float8send(slope(origin,destination)) = recorded_slope END),
  CONSTRAINT measurement_left CHECK (CASE WHEN skip_validation THEN true ELSE point_left(origin,destination) = recorded_left END),
  CONSTRAINT measurement_right CHECK (CASE WHEN skip_validation THEN true ELSE point_right(origin,destination) = recorded_right END),
  CONSTRAINT measurement_above CHECK (CASE WHEN skip_validation THEN true ELSE point_above(origin,destination) = recorded_above END),
  CONSTRAINT measurement_below CHECK (CASE WHEN skip_validation THEN true ELSE point_below(origin,destination) = recorded_below END),
  CONSTRAINT measurement_horizontal CHECK (CASE WHEN skip_validation THEN true ELSE point_horiz(origin,destination) = recorded_horizontal AND ishorizontal(origin,destination) = recorded_horizontal END),
  CONSTRAINT measurement_vertical CHECK (CASE WHEN skip_validation THEN true ELSE point_vert(origin,destination) = recorded_vertical AND isvertical(origin,destination) = recorded_vertical END)
);
CREATE TABLE survey_imports (
  id integer PRIMARY KEY,
  location_id integer NOT NULL REFERENCES survey_locations (id),
  label text NOT NULL,
  source_text text,
  recorded_position survey_point,
  recorded_wire bytea,
  recorded_origin boolean,
  skip_validation boolean NOT NULL,
  CONSTRAINT import_position CHECK (CASE WHEN skip_validation THEN true ELSE point_eq(source_text::survey_point,recorded_position) END),
  CONSTRAINT import_wire CHECK (CASE WHEN skip_validation THEN true ELSE point_send(point(source_text)) = recorded_wire END),
  CONSTRAINT import_origin CHECK (CASE WHEN skip_validation THEN true ELSE (source_text::point ~= '(0,0)'::point) = recorded_origin END)
);
