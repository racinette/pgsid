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
