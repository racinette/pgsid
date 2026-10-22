-- @world checks
CREATE DOMAIN surveyed_boundary AS polygon;
CREATE DOMAIN imported_boundary AS surveyed_boundary;
CREATE TABLE parcel_plans (
 id integer PRIMARY KEY,
 label text NOT NULL,
 boundary imported_boundary,
 reference polygon,
 expected_points integer,
 expected_same boolean,
 wire bytea,
 bounds_wire bytea,
 route_wire bytea,
 choose_reference boolean NOT NULL,
 CONSTRAINT parcel_count CHECK(npoints(boundary)=expected_points),
 CONSTRAINT parcel_same CHECK((boundary ~= reference)=expected_same),
 CONSTRAINT parcel_wire CHECK(poly_send(boundary)=wire),
 CONSTRAINT parcel_bounds CHECK(box_send(box(boundary))=bounds_wire),
 CONSTRAINT parcel_route CHECK(path_send(path(boundary))=route_wire),
 CONSTRAINT parcel_selected CHECK(poly_send(CASE WHEN choose_reference THEN reference ELSE COALESCE(boundary,NULL::polygon) END)=wire)
);
CREATE TABLE parcel_imports (
 id integer PRIMARY KEY,
 plan_id integer NOT NULL REFERENCES parcel_plans(id),
 label text NOT NULL,
 source text,
 expected_points integer,
 wire bytea,
 bypass boolean NOT NULL,
 CONSTRAINT parcel_import_wire CHECK(CASE WHEN bypass THEN true ELSE poly_send(source::imported_boundary)=wire END),
 CONSTRAINT parcel_import_count CHECK(CASE WHEN bypass THEN true ELSE npoints(source::polygon)=expected_points END)
);
CREATE TABLE parcel_memberships (
 id integer PRIMARY KEY,
 plan_id integer NOT NULL REFERENCES parcel_plans(id),
 label text NOT NULL,
 boundary imported_boundary,
 probe point,
 expected_member boolean,
 expected_reverse boolean,
 bypass boolean NOT NULL,
 CONSTRAINT parcel_probe CHECK(CASE WHEN bypass THEN true ELSE (probe <@ boundary)=expected_member END),
 CONSTRAINT parcel_contains CHECK(CASE WHEN bypass THEN true ELSE (boundary @> probe)=expected_reverse END)
);
CREATE TABLE parcel_conversions (
 id integer PRIMARY KEY,
 plan_id integer NOT NULL REFERENCES parcel_plans(id),
 label text NOT NULL,
 route path,
 rectangle box,
 route_wire bytea,
 rectangle_wire bytea,
 enabled boolean NOT NULL,
 CONSTRAINT parcel_from_route CHECK(CASE WHEN enabled THEN poly_send(polygon(route))=route_wire ELSE true END),
 CONSTRAINT parcel_from_box CHECK(CASE WHEN enabled THEN poly_send(polygon(rectangle))=rectangle_wire ELSE true END)
);
CREATE TABLE parcel_centers (
 id integer PRIMARY KEY,
 plan_id integer NOT NULL REFERENCES parcel_plans(id),
 label text NOT NULL,
 boundary imported_boundary,
 center_wire bytea,
 circle_wire bytea,
 expected_radius float8,
 expected_consistent boolean,
 bypass boolean NOT NULL,
 CONSTRAINT parcel_mean_center CHECK(CASE WHEN bypass THEN true ELSE point_send(boundary::point)=center_wire END),
 CONSTRAINT parcel_center_alias CHECK(CASE WHEN bypass THEN true ELSE point_send(@@ boundary)=center_wire END),
 CONSTRAINT parcel_mean_circle CHECK(CASE WHEN bypass THEN true ELSE circle_send(boundary::circle)=circle_wire END),
 CONSTRAINT parcel_mean_radius CHECK(CASE WHEN bypass THEN true ELSE radius(circle(boundary))=expected_radius END),
 CONSTRAINT parcel_center_consistency CHECK(CASE WHEN bypass THEN true ELSE (point(boundary) ~= point(circle(boundary)))=expected_consistent END)
);
CREATE TABLE parcel_envelopes (
 id integer PRIMARY KEY,
 plan_id integer NOT NULL REFERENCES parcel_plans(id),
 label text NOT NULL,
 source circle,
 vertex_count integer,
 expected_points integer,
 expected_size integer,
 expected_default_points integer,
 sample_wire bytea,
 bounds_wire bytea,
 bypass boolean NOT NULL,
 CONSTRAINT parcel_sample_count CHECK(CASE WHEN bypass THEN true ELSE npoints(polygon(vertex_count,source))=expected_points END),
 CONSTRAINT parcel_sample_size CHECK(CASE WHEN bypass THEN true ELSE length(poly_send(polygon(vertex_count,source)))=expected_size END),
 CONSTRAINT parcel_sample_wire CHECK(CASE WHEN bypass THEN true ELSE sample_wire IS NULL OR poly_send(polygon(vertex_count,source))=sample_wire END),
 CONSTRAINT parcel_sample_bounds CHECK(CASE WHEN bypass THEN true ELSE bounds_wire IS NULL OR box_send(box(polygon(vertex_count,source)))=bounds_wire END),
 CONSTRAINT parcel_default_vertices CHECK(CASE WHEN bypass THEN true ELSE npoints(source::imported_boundary)=expected_default_points END)
);
