-- @world checks
CREATE DOMAIN imported_axis AS line;
CREATE DOMAIN survey_axis AS imported_axis;

CREATE TABLE guide_axes (
  id integer PRIMARY KEY,
  label text NOT NULL,
  axis survey_axis,
  expected_wire bytea,
  required_axis boolean,
  recorded_horizontal boolean,
  recorded_vertical boolean,
  CONSTRAINT guide_wire CHECK (line_send(axis) = expected_wire),
  CONSTRAINT guide_presence CHECK ((axis IS NOT NULL) = required_axis),
  CONSTRAINT guide_horizontal CHECK (line_horizontal(axis) = recorded_horizontal AND ishorizontal(axis) = recorded_horizontal),
  CONSTRAINT guide_vertical CHECK (line_vertical(axis) = recorded_vertical AND isvertical(axis) = recorded_vertical)
);

CREATE TABLE guide_matches (
  id integer PRIMARY KEY,
  guide_id integer NOT NULL REFERENCES guide_axes (id),
  label text NOT NULL,
  first_axis survey_axis,
  second_axis line,
  recorded_same boolean,
  prefer_first boolean NOT NULL,
  expected_wire bytea,
  skip_comparison boolean NOT NULL,
  CONSTRAINT guide_same CHECK (CASE WHEN skip_comparison THEN true ELSE (first_axis = second_axis) = recorded_same END),
  CONSTRAINT guide_selected CHECK (line_send(CASE WHEN prefer_first THEN first_axis ELSE second_axis END) = expected_wire),
  CONSTRAINT guide_default CHECK (line_send(COALESCE(first_axis,second_axis,NULL::line)) = expected_wire)
);
