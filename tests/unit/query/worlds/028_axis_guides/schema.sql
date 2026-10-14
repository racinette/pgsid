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

CREATE DOMAIN imported_segment AS lseg;
CREATE DOMAIN survey_segment AS imported_segment;
CREATE TABLE guide_segment_imports (
  id integer PRIMARY KEY,
  guide_id integer NOT NULL REFERENCES guide_axes (id),
  label text NOT NULL,
  source_text text,
  recorded_wire bytea,
  recorded_length float8,
  recorded_center point,
  recorded_horizontal boolean,
  recorded_vertical boolean,
  recorded_present boolean,
  skip_validation boolean NOT NULL,
  CONSTRAINT segment_import_wire CHECK (CASE WHEN skip_validation THEN true ELSE lseg_send(source_text::survey_segment) = recorded_wire END),
  CONSTRAINT segment_import_length CHECK (CASE WHEN skip_validation THEN true ELSE lseg_length(source_text::lseg) = recorded_length AND length(source_text::lseg) = recorded_length END),
  CONSTRAINT segment_import_center CHECK (CASE WHEN skip_validation THEN true ELSE point_eq(lseg_center(source_text::lseg),recorded_center) AND point_eq(point(source_text::lseg),recorded_center) END),
  CONSTRAINT segment_import_horizontal CHECK (CASE WHEN skip_validation THEN true ELSE lseg_horizontal(source_text::lseg) = recorded_horizontal AND ishorizontal(source_text::lseg) = recorded_horizontal END),
  CONSTRAINT segment_import_vertical CHECK (CASE WHEN skip_validation THEN true ELSE lseg_vertical(source_text::lseg) = recorded_vertical AND isvertical(source_text::lseg) = recorded_vertical END),
  CONSTRAINT segment_import_present CHECK (CASE WHEN skip_validation THEN true ELSE (source_text::lseg IS NOT NULL) = recorded_present END)
);
CREATE TABLE guide_segment_relations (
  id integer PRIMARY KEY,
  guide_id integer NOT NULL REFERENCES guide_axes (id),
  label text NOT NULL,
  first_text text,
  second_text text,
  recorded_same boolean,
  recorded_less boolean,
  recorded_le boolean,
  recorded_greater boolean,
  recorded_ge boolean,
  recorded_parallel boolean,
  recorded_perpendicular boolean,
  prefer_first boolean NOT NULL,
  recorded_wire bytea,
  skip_validation boolean NOT NULL,
  CONSTRAINT segment_relation_same CHECK (CASE WHEN skip_validation THEN true ELSE lseg_eq(first_text::lseg,second_text::lseg) = recorded_same AND lseg_ne(first_text::lseg,second_text::lseg) = NOT recorded_same END),
  CONSTRAINT segment_relation_length CHECK (CASE WHEN skip_validation THEN true ELSE (first_text::lseg < second_text::lseg) = recorded_less AND (first_text::lseg <= second_text::lseg) = recorded_le AND (first_text::lseg > second_text::lseg) = recorded_greater AND (first_text::lseg >= second_text::lseg) = recorded_ge END),
  CONSTRAINT segment_relation_parallel CHECK (CASE WHEN skip_validation THEN true ELSE lseg_parallel(first_text::lseg,second_text::lseg) = recorded_parallel AND isparallel(first_text::lseg,second_text::lseg) = recorded_parallel END),
  CONSTRAINT segment_relation_perpendicular CHECK (CASE WHEN skip_validation THEN true ELSE lseg_perp(first_text::lseg,second_text::lseg) = recorded_perpendicular AND isperp(first_text::lseg,second_text::lseg) = recorded_perpendicular END),
  CONSTRAINT segment_relation_selected CHECK (CASE WHEN skip_validation THEN true ELSE lseg_send(CASE WHEN prefer_first THEN first_text::survey_segment ELSE second_text::lseg END) = recorded_wire END)
);
CREATE TABLE guide_segment_constructions (
  id integer PRIMARY KEY,
  guide_id integer NOT NULL REFERENCES guide_axes (id),
  label text NOT NULL,
  first_text text,
  second_text text,
  recorded_segment survey_segment,
  recorded_wire bytea,
  skip_validation boolean NOT NULL,
  CONSTRAINT segment_construct_same CHECK (CASE WHEN skip_validation THEN true ELSE lseg_eq(lseg(first_text::point,second_text::point),recorded_segment) END),
  CONSTRAINT segment_construct_wire CHECK (CASE WHEN skip_validation THEN true ELSE lseg_send(lseg(first_text::point,second_text::point)) = recorded_wire END)
);

CREATE TABLE guide_segment_crossings (
  id integer PRIMARY KEY,
  guide_id integer NOT NULL REFERENCES guide_axes (id),
  label text NOT NULL,
  first_text text,
  second_text text,
  axis_text text,
  recorded_crossing boolean,
  recorded_point point,
  recorded_distance float8,
  recorded_closest point,
  recorded_line_crossing boolean,
  recorded_on_line boolean,
  recorded_line_distance float8,
  recorded_line_closest point,
  skip_validation boolean NOT NULL,
  CONSTRAINT segment_cross_intersects CHECK (CASE WHEN skip_validation THEN true ELSE lseg_intersect(first_text::lseg,second_text::lseg) = recorded_crossing END),
  CONSTRAINT segment_cross_point CHECK (CASE WHEN skip_validation THEN true ELSE point_eq(lseg_interpt(first_text::lseg,second_text::lseg),recorded_point) END),
  CONSTRAINT segment_cross_distance CHECK (CASE WHEN skip_validation THEN true ELSE lseg_distance(first_text::lseg,second_text::lseg) = recorded_distance END),
  CONSTRAINT segment_cross_closest CHECK (CASE WHEN skip_validation THEN true ELSE point_eq(close_lseg(first_text::lseg,second_text::lseg),recorded_closest) END),
  CONSTRAINT segment_cross_line_intersects CHECK (CASE WHEN skip_validation THEN true ELSE inter_sl(first_text::lseg,axis_text::line) = recorded_line_crossing END),
  CONSTRAINT segment_cross_on_line CHECK (CASE WHEN skip_validation THEN true ELSE on_sl(first_text::lseg,axis_text::line) = recorded_on_line END),
  CONSTRAINT segment_cross_line_distance CHECK (CASE WHEN skip_validation THEN true ELSE dist_sl(first_text::lseg,axis_text::line) = recorded_line_distance AND dist_ls(axis_text::line,first_text::lseg) = recorded_line_distance END),
  CONSTRAINT segment_cross_line_closest CHECK (CASE WHEN skip_validation THEN true ELSE point_eq(close_ls(axis_text::line,first_text::lseg),recorded_line_closest) END)
);
CREATE TABLE guide_segment_projections (
  id integer PRIMARY KEY,
  guide_id integer NOT NULL REFERENCES guide_axes (id),
  label text NOT NULL,
  point_text text,
  segment_text text,
  recorded_on_segment boolean,
  recorded_closest point,
  recorded_distance float8,
  skip_validation boolean NOT NULL,
  CONSTRAINT segment_project_on CHECK (CASE WHEN skip_validation THEN true ELSE on_ps(point_text::point,segment_text::lseg) = recorded_on_segment END),
  CONSTRAINT segment_project_closest CHECK (CASE WHEN skip_validation THEN true ELSE point_eq(close_ps(point_text::point,segment_text::lseg),recorded_closest) END),
  CONSTRAINT segment_project_distance CHECK (CASE WHEN skip_validation THEN true ELSE dist_ps(point_text::point,segment_text::lseg) = recorded_distance AND dist_sp(segment_text::lseg,point_text::point) = recorded_distance END)
);

CREATE DOMAIN imported_region AS box;
CREATE DOMAIN survey_region AS imported_region;
CREATE TABLE guide_regions (
  id integer PRIMARY KEY,
  guide_id integer NOT NULL REFERENCES guide_axes (id),
  label text NOT NULL,
  region survey_region,
  recorded_wire bytea,
  recorded_area float8,
  recorded_width float8,
  recorded_height float8,
  recorded_center point,
  recorded_diagonal lseg,
  recorded_present boolean,
  skip_validation boolean NOT NULL,
  CONSTRAINT region_wire CHECK (CASE WHEN skip_validation THEN true ELSE box_send(region) = recorded_wire END),
  CONSTRAINT region_area CHECK (CASE WHEN skip_validation THEN true ELSE area(region) = recorded_area END),
  CONSTRAINT region_width CHECK (CASE WHEN skip_validation THEN true ELSE width(region) = recorded_width END),
  CONSTRAINT region_height CHECK (CASE WHEN skip_validation THEN true ELSE height(region) = recorded_height END),
  CONSTRAINT region_center CHECK (CASE WHEN skip_validation THEN true ELSE point_eq(box_center(region),recorded_center) AND point_eq(point(region),recorded_center) AND point_eq(center(region),recorded_center) END),
  CONSTRAINT region_diagonal CHECK (CASE WHEN skip_validation THEN true ELSE lseg_eq(diagonal(region),recorded_diagonal) AND lseg_eq(lseg(region),recorded_diagonal) END),
  CONSTRAINT region_present CHECK (CASE WHEN skip_validation THEN true ELSE (region IS NOT NULL) = recorded_present END)
);
CREATE TABLE guide_region_imports (
  id integer PRIMARY KEY,
  guide_id integer NOT NULL REFERENCES guide_axes (id),
  label text NOT NULL,
  source_text text,
  recorded_region survey_region,
  recorded_wire bytea,
  skip_validation boolean NOT NULL,
  CONSTRAINT region_import_same CHECK (CASE WHEN skip_validation THEN true ELSE box_same(source_text::survey_region,recorded_region) END),
  CONSTRAINT region_import_wire CHECK (CASE WHEN skip_validation THEN true ELSE box_send(source_text::box) = recorded_wire END)
);
CREATE TABLE guide_region_relations (
  id integer PRIMARY KEY,
  guide_id integer NOT NULL REFERENCES guide_axes (id),
  label text NOT NULL,
  first_region survey_region,
  second_region box,
  recorded_same boolean,
  recorded_equal boolean,
  recorded_less boolean,
  recorded_le boolean,
  recorded_greater boolean,
  recorded_ge boolean,
  recorded_distance float8,
  skip_validation boolean NOT NULL,
  CONSTRAINT region_relation_same CHECK (CASE WHEN skip_validation THEN true ELSE box_same(first_region,second_region) = recorded_same END),
  CONSTRAINT region_relation_area CHECK (CASE WHEN skip_validation THEN true ELSE (first_region = second_region) = recorded_equal AND (first_region < second_region) = recorded_less AND (first_region <= second_region) = recorded_le AND (first_region > second_region) = recorded_greater AND (first_region >= second_region) = recorded_ge END),
  CONSTRAINT region_relation_distance CHECK (CASE WHEN skip_validation THEN true ELSE box_distance(first_region,second_region) = recorded_distance END)
);

CREATE TABLE guide_region_spatial (
 id integer PRIMARY KEY,
 guide_id integer NOT NULL REFERENCES guide_axes(id),
 label text NOT NULL,
 first_region survey_region,
 second_region box,
 recorded_overlap boolean,
 recorded_left boolean,
 recorded_right boolean,
 recorded_overleft boolean,
 recorded_overright boolean,
 recorded_below boolean,
 recorded_above boolean,
 recorded_overbelow boolean,
 recorded_overabove boolean,
 recorded_contains boolean,
 recorded_contained boolean,
 recorded_below_eq boolean,
 recorded_above_eq boolean,
 intersection_wire bytea,
 container_wire bytea,
 skip_validation boolean NOT NULL,
 CONSTRAINT region_space_horizontal CHECK(CASE WHEN skip_validation THEN true ELSE box_left(first_region,second_region)=recorded_left AND box_right(first_region,second_region)=recorded_right AND box_overleft(first_region,second_region)=recorded_overleft AND box_overright(first_region,second_region)=recorded_overright END),
 CONSTRAINT region_space_vertical CHECK(CASE WHEN skip_validation THEN true ELSE box_below(first_region,second_region)=recorded_below AND box_above(first_region,second_region)=recorded_above AND box_overbelow(first_region,second_region)=recorded_overbelow AND box_overabove(first_region,second_region)=recorded_overabove AND box_below_eq(first_region,second_region)=recorded_below_eq AND box_above_eq(first_region,second_region)=recorded_above_eq END),
 CONSTRAINT region_space_topology CHECK(CASE WHEN skip_validation THEN true ELSE box_overlap(first_region,second_region)=recorded_overlap AND box_contain(first_region,second_region)=recorded_contains AND box_contained(first_region,second_region)=recorded_contained END),
 CONSTRAINT region_space_intersection CHECK(CASE WHEN skip_validation THEN true ELSE box_send(box_intersect(first_region,second_region))=intersection_wire END),
 CONSTRAINT region_space_container CHECK(CASE WHEN skip_validation THEN true ELSE box_send(bound_box(first_region,second_region))=container_wire END)
);
CREATE TABLE guide_region_contacts (
 id integer PRIMARY KEY,
 guide_id integer NOT NULL REFERENCES guide_axes(id),
 label text NOT NULL,
 region survey_region,
 position point,
 edge lseg,
 axis line,
 recorded_point_inside boolean,
 recorded_segment_inside boolean,
 recorded_segment_crossing boolean,
 recorded_line_crossing boolean,
 recorded_point_closest point,
 recorded_point_distance float8,
 recorded_segment_closest point,
 recorded_segment_distance float8,
 skip_validation boolean NOT NULL,
 CONSTRAINT region_contact_point_inside CHECK(CASE WHEN skip_validation THEN true ELSE on_pb(position,region)=recorded_point_inside AND box_contain_pt(region,position)=recorded_point_inside END),
 CONSTRAINT region_contact_segment_inside CHECK(CASE WHEN skip_validation THEN true ELSE on_sb(edge,region)=recorded_segment_inside END),
 CONSTRAINT region_contact_crossings CHECK(CASE WHEN skip_validation THEN true ELSE inter_sb(edge,region)=recorded_segment_crossing AND inter_lb(axis,region)=recorded_line_crossing END),
 CONSTRAINT region_contact_point_closest CHECK(CASE WHEN skip_validation THEN true ELSE point_eq(close_pb(position,region),recorded_point_closest) END),
 CONSTRAINT region_contact_point_distance CHECK(CASE WHEN skip_validation THEN true ELSE dist_pb(position,region)=recorded_point_distance AND dist_bp(region,position)=recorded_point_distance END),
 CONSTRAINT region_contact_segment_closest CHECK(CASE WHEN skip_validation THEN true ELSE point_eq(close_sb(edge,region),recorded_segment_closest) END),
 CONSTRAINT region_contact_segment_distance CHECK(CASE WHEN skip_validation THEN true ELSE dist_sb(edge,region)=recorded_segment_distance AND dist_bs(region,edge)=recorded_segment_distance END)
);
CREATE TABLE guide_region_transforms (
 id integer PRIMARY KEY,
 guide_id integer NOT NULL REFERENCES guide_axes(id),
 label text NOT NULL,
 region survey_region,
 adjustment point,
 recorded_addition box,
 recorded_subtraction box,
 recorded_scaled box,
 recorded_divided box,
 addition_wire bytea,
 subtraction_wire bytea,
 scaled_wire bytea,
 divided_wire bytea,
 skip_validation boolean NOT NULL,
 CONSTRAINT region_transform_addition CHECK(CASE WHEN skip_validation THEN true ELSE box_same(region+adjustment,recorded_addition) AND CASE WHEN addition_wire IS NULL THEN true ELSE box_send(region+adjustment)=addition_wire END END),
 CONSTRAINT region_transform_subtraction CHECK(CASE WHEN skip_validation THEN true ELSE box_same(region-adjustment,recorded_subtraction) AND CASE WHEN subtraction_wire IS NULL THEN true ELSE box_send(region-adjustment)=subtraction_wire END END),
 CONSTRAINT region_transform_scale CHECK(CASE WHEN skip_validation THEN true ELSE box_same(region*adjustment,recorded_scaled) AND CASE WHEN scaled_wire IS NULL THEN true ELSE box_send(region*adjustment)=scaled_wire END END),
 CONSTRAINT region_transform_division CHECK(CASE WHEN skip_validation THEN true ELSE box_same(region/adjustment,recorded_divided) AND CASE WHEN divided_wire IS NULL THEN true ELSE box_send(region/adjustment)=divided_wire END END)
);

CREATE DOMAIN imported_disk AS circle;
CREATE DOMAIN survey_disk AS imported_disk;
CREATE TABLE guide_disk_imports (
  id integer PRIMARY KEY,
  guide_id integer NOT NULL REFERENCES guide_axes (id),
  label text NOT NULL,
  source_text text,
  recorded_disk survey_disk,
  recorded_wire bytea,
  recorded_present boolean,
  skip_validation boolean NOT NULL,
  CONSTRAINT disk_import_same CHECK (CASE WHEN skip_validation THEN true ELSE circle_same(source_text::survey_disk,recorded_disk) END),
  CONSTRAINT disk_import_wire CHECK (CASE WHEN skip_validation THEN true ELSE circle_send(source_text::circle)=recorded_wire END),
  CONSTRAINT disk_import_present CHECK (CASE WHEN skip_validation THEN true ELSE (source_text::circle IS NOT NULL)=recorded_present END)
);
CREATE TABLE guide_disk_metrics (
  id integer PRIMARY KEY,
  guide_id integer NOT NULL REFERENCES guide_axes (id),
  label text NOT NULL,
  disk survey_disk,
  other_disk circle,
  recorded_center point,
  recorded_radius float8,
  recorded_diameter float8,
  recorded_area float8,
  recorded_same boolean,
  recorded_equal boolean,
  recorded_not_equal boolean,
  recorded_less boolean,
  recorded_greater boolean,
  recorded_le boolean,
  recorded_ge boolean,
  skip_validation boolean NOT NULL,
  CONSTRAINT disk_center CHECK (CASE WHEN skip_validation THEN true ELSE point_eq(center(disk),recorded_center) AND point_eq(circle_center(disk),recorded_center) AND point_eq(point(disk),recorded_center) END),
  CONSTRAINT disk_dimensions CHECK (CASE WHEN skip_validation THEN true ELSE radius(disk)=recorded_radius AND diameter(disk)=recorded_diameter END),
  CONSTRAINT disk_area CHECK (CASE WHEN skip_validation THEN true ELSE area(disk)=recorded_area END),
  CONSTRAINT disk_same CHECK (CASE WHEN skip_validation THEN true ELSE circle_same(disk,other_disk)=recorded_same END),
  CONSTRAINT disk_order CHECK (CASE WHEN skip_validation THEN true ELSE circle_eq(disk,other_disk)=recorded_equal AND circle_ne(disk,other_disk)=recorded_not_equal AND circle_lt(disk,other_disk)=recorded_less AND circle_gt(disk,other_disk)=recorded_greater AND circle_le(disk,other_disk)=recorded_le AND circle_ge(disk,other_disk)=recorded_ge END)
);
CREATE TABLE guide_disk_constructions (
  id integer PRIMARY KEY,
  guide_id integer NOT NULL REFERENCES guide_axes (id),
  label text NOT NULL,
  position point,
  radius_value float8,
  region box,
  recorded_disk circle,
  recorded_disk_wire bytea,
  recorded_circumscribed circle,
  recorded_box_wire bytea,
  skip_validation boolean NOT NULL,
  CONSTRAINT disk_construct CHECK (CASE WHEN skip_validation THEN true ELSE circle_same(circle(position,radius_value),recorded_disk) AND CASE WHEN recorded_disk_wire IS NULL THEN true ELSE circle_send(circle(position,radius_value))=recorded_disk_wire END END),
  CONSTRAINT disk_circumscribe CHECK (CASE WHEN skip_validation THEN true ELSE circle_same(circle(region),recorded_circumscribed) END),
  CONSTRAINT disk_inscribe CHECK (CASE WHEN skip_validation THEN true ELSE box_same(box(recorded_disk),box(recorded_disk)) AND CASE WHEN recorded_box_wire IS NULL THEN true ELSE box_send(box(recorded_disk))=recorded_box_wire END END)
);

CREATE TABLE guide_disk_spatial (
  id integer PRIMARY KEY,
  guide_id integer NOT NULL REFERENCES guide_axes (id),
  label text NOT NULL,
  first_disk circle,
  second_disk circle,
  position point,
  recorded_left boolean,
  recorded_right boolean,
  recorded_overleft boolean,
  recorded_overright boolean,
  recorded_below boolean,
  recorded_above boolean,
  recorded_overbelow boolean,
  recorded_overabove boolean,
  recorded_overlap boolean,
  recorded_contains boolean,
  recorded_contained boolean,
  recorded_point_inside boolean,
  recorded_distance float8,
  recorded_point_distance float8,
  skip_validation boolean NOT NULL,
  CONSTRAINT disk_horizontal CHECK (CASE WHEN skip_validation THEN true ELSE circle_left(first_disk,second_disk)=recorded_left AND circle_right(first_disk,second_disk)=recorded_right AND circle_overleft(first_disk,second_disk)=recorded_overleft AND circle_overright(first_disk,second_disk)=recorded_overright END),
  CONSTRAINT disk_vertical CHECK (CASE WHEN skip_validation THEN true ELSE circle_below(first_disk,second_disk)=recorded_below AND circle_above(first_disk,second_disk)=recorded_above AND circle_overbelow(first_disk,second_disk)=recorded_overbelow AND circle_overabove(first_disk,second_disk)=recorded_overabove END),
  CONSTRAINT disk_topology CHECK (CASE WHEN skip_validation THEN true ELSE circle_overlap(first_disk,second_disk)=recorded_overlap AND circle_contain(first_disk,second_disk)=recorded_contains AND circle_contained(first_disk,second_disk)=recorded_contained END),
  CONSTRAINT disk_point_inside CHECK (CASE WHEN skip_validation THEN true ELSE circle_contain_pt(first_disk,position)=recorded_point_inside AND pt_contained_circle(position,first_disk)=recorded_point_inside END),
  CONSTRAINT disk_distance CHECK (CASE WHEN skip_validation THEN true ELSE circle_distance(first_disk,second_disk)=recorded_distance END),
  CONSTRAINT disk_point_distance CHECK (CASE WHEN skip_validation THEN true ELSE dist_cpoint(first_disk,position)=recorded_point_distance AND dist_pc(position,first_disk)=recorded_point_distance END)
);
CREATE TABLE guide_disk_transforms (
  id integer PRIMARY KEY,
  guide_id integer NOT NULL REFERENCES guide_axes (id),
  label text NOT NULL,
  disk circle,
  adjustment point,
  recorded_addition circle,
  recorded_subtraction circle,
  recorded_scaled circle,
  recorded_divided circle,
  addition_wire bytea,
  subtraction_wire bytea,
  scaled_wire bytea,
  divided_wire bytea,
  skip_validation boolean NOT NULL,
  CONSTRAINT disk_addition CHECK (CASE WHEN skip_validation THEN true ELSE circle_same(disk+adjustment,recorded_addition) AND CASE WHEN addition_wire IS NULL THEN true ELSE circle_send(disk+adjustment)=addition_wire END END),
  CONSTRAINT disk_subtraction CHECK (CASE WHEN skip_validation THEN true ELSE circle_same(disk-adjustment,recorded_subtraction) AND CASE WHEN subtraction_wire IS NULL THEN true ELSE circle_send(disk-adjustment)=subtraction_wire END END),
  CONSTRAINT disk_scale CHECK (CASE WHEN skip_validation THEN true ELSE circle_same(disk*adjustment,recorded_scaled) AND CASE WHEN scaled_wire IS NULL THEN true ELSE circle_send(disk*adjustment)=scaled_wire END END),
  CONSTRAINT disk_division CHECK (CASE WHEN skip_validation THEN true ELSE circle_same(disk/adjustment,recorded_divided) AND CASE WHEN divided_wire IS NULL THEN true ELSE circle_send(disk/adjustment)=divided_wire END END)
);
