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

CREATE TABLE guide_imports (
  id integer PRIMARY KEY,
  guide_id integer NOT NULL REFERENCES guide_axes (id),
  label text NOT NULL,
  source_text text,
  recorded_equation survey_axis,
  recorded_wire bytea,
  was_imported boolean,
  skip_validation boolean NOT NULL,
  CONSTRAINT import_equation CHECK (CASE WHEN skip_validation THEN true ELSE line_eq(source_text::survey_axis,recorded_equation) END),
  CONSTRAINT import_wire CHECK (CASE WHEN skip_validation THEN true ELSE line_send(source_text::line) = recorded_wire END),
  CONSTRAINT import_present CHECK (CASE WHEN skip_validation THEN true ELSE (source_text::line IS NOT NULL) = was_imported END)
);
CREATE TABLE guide_constructions (
  id integer PRIMARY KEY,
  guide_id integer NOT NULL REFERENCES guide_axes (id),
  label text NOT NULL,
  first_position point,
  second_position point,
  recorded_equation survey_axis,
  recorded_horizontal boolean,
  recorded_vertical boolean,
  skip_validation boolean NOT NULL,
  CONSTRAINT construction_equation CHECK (CASE WHEN skip_validation THEN true ELSE line_eq(line(first_position,second_position),recorded_equation) END),
  CONSTRAINT construction_horizontal CHECK (CASE WHEN skip_validation THEN true ELSE ishorizontal(line(first_position,second_position)) = recorded_horizontal END),
  CONSTRAINT construction_vertical CHECK (CASE WHEN skip_validation THEN true ELSE isvertical(line(first_position,second_position)) = recorded_vertical END)
);

CREATE TABLE guide_relations (
  id integer PRIMARY KEY,
  guide_id integer NOT NULL REFERENCES guide_axes (id),
  label text NOT NULL,
  first_axis survey_axis,
  second_axis line,
  recorded_parallel boolean,
  recorded_perpendicular boolean,
  recorded_crossing boolean,
  recorded_point point,
  recorded_distance bytea,
  skip_validation boolean NOT NULL,
  CONSTRAINT relation_parallel CHECK (CASE WHEN skip_validation THEN true ELSE line_parallel(first_axis,second_axis) = recorded_parallel AND isparallel(first_axis,second_axis) = recorded_parallel END),
  CONSTRAINT relation_perpendicular CHECK (CASE WHEN skip_validation THEN true ELSE line_perp(first_axis,second_axis) = recorded_perpendicular AND isperp(first_axis,second_axis) = recorded_perpendicular END),
  CONSTRAINT relation_crossing CHECK (CASE WHEN skip_validation THEN true ELSE line_intersect(first_axis,second_axis) = recorded_crossing END),
  CONSTRAINT relation_point CHECK (CASE WHEN skip_validation THEN true ELSE point_eq(line_interpt(first_axis,second_axis),recorded_point) END),
  CONSTRAINT relation_distance CHECK (CASE WHEN skip_validation THEN true ELSE float8send(line_distance(first_axis,second_axis)) = recorded_distance END)
);
CREATE TABLE guide_projections (
  id integer PRIMARY KEY,
  guide_id integer NOT NULL REFERENCES guide_axes (id),
  label text NOT NULL,
  position point,
  axis survey_axis,
  recorded_on_axis boolean,
  recorded_closest point,
  recorded_distance bytea,
  skip_validation boolean NOT NULL,
  CONSTRAINT projection_on_axis CHECK (CASE WHEN skip_validation THEN true ELSE on_pl(position,axis) = recorded_on_axis END),
  CONSTRAINT projection_closest CHECK (CASE WHEN skip_validation THEN true ELSE point_eq(close_pl(position,axis),recorded_closest) END),
  CONSTRAINT projection_distance CHECK (CASE WHEN skip_validation THEN true ELSE float8send(dist_pl(position,axis)) = recorded_distance AND float8send(dist_lp(axis,position)) = recorded_distance END)
);
