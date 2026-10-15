-- @world checks
CREATE DOMAIN surveyed_route AS path;
CREATE DOMAIN imported_route AS surveyed_route;
CREATE TABLE route_plans (
 id integer PRIMARY KEY,
 label text NOT NULL,
 route imported_route,
 reference path,
 expected_points integer,
 expected_closed boolean,
 expected_length float8,
 expected_area float8,
 wire bytea,
 selected_wire bytea,
 CONSTRAINT route_count CHECK(npoints(route)=expected_points),
 CONSTRAINT route_closed CHECK(isclosed(route)=expected_closed),
 CONSTRAINT route_length CHECK(path_length(route)=expected_length),
 CONSTRAINT route_area CHECK(area(pclose(route))=expected_area),
 CONSTRAINT route_cardinality CHECK(route=reference),
 CONSTRAINT route_wire CHECK(path_send(route)=wire),
 CONSTRAINT route_selected CHECK(path_send(COALESCE(popen(route),pclose(reference)))=selected_wire)
);
CREATE TABLE route_imports (
 id integer PRIMARY KEY,
 plan_id integer NOT NULL REFERENCES route_plans(id),
 label text NOT NULL,
 source text,
 wire bytea,
 bypass boolean NOT NULL,
 CONSTRAINT route_import CHECK(CASE WHEN bypass THEN true ELSE path_send(source::path)=wire END)
);
CREATE TABLE route_transforms (
 id integer PRIMARY KEY,
 plan_id integer NOT NULL REFERENCES route_plans(id),
 label text NOT NULL,
 route imported_route,
 vector point,
 extension path,
 check_wires boolean NOT NULL,
 divide_enabled boolean NOT NULL,
 translated_wire bytea,
 subtracted_wire bytea,
 scaled_wire bytea,
 divided_wire bytea,
 extended_wire bytea,
 original_wire bytea,
 CONSTRAINT route_translated CHECK(CASE WHEN check_wires THEN path_send(route+vector)=translated_wire ELSE true END),
 CONSTRAINT route_subtracted CHECK(CASE WHEN check_wires THEN path_send(route-vector)=subtracted_wire ELSE true END),
 CONSTRAINT route_scaled CHECK(CASE WHEN check_wires THEN path_send(route*vector)=scaled_wire ELSE true END),
 CONSTRAINT route_divided CHECK(CASE WHEN check_wires AND divide_enabled THEN path_send(route/vector)=divided_wire ELSE true END),
 CONSTRAINT route_extended CHECK(path_send(route+extension)=extended_wire),
 CONSTRAINT route_original_retained CHECK(path_send(route)=original_wire),
 CONSTRAINT route_transformed_count CHECK(npoints(route+vector)=npoints(route)),
 CONSTRAINT route_transformed_closure CHECK(isclosed(route*vector)=isclosed(route))
);
CREATE TABLE route_distances (
 id integer PRIMARY KEY,
 plan_id integer NOT NULL REFERENCES route_plans(id),
 label text NOT NULL,
 route imported_route,
 reference path,
 probe point,
 expected_point float8,
 expected_reverse float8,
 expected_paths float8,
 CONSTRAINT route_probe_distance CHECK((probe <-> route)=expected_point),
 CONSTRAINT route_reverse_distance CHECK((route <-> probe)=expected_reverse),
 CONSTRAINT route_pair_distance CHECK((route <-> reference)=expected_paths),
 CONSTRAINT route_distance_aliases CHECK(dist_ppath(probe,route)=dist_pathp(route,probe))
);
