-- name: parcel_triangle
INSERT INTO parcel_plans(id,label,boundary,reference,expected_points,expected_same,wire,bounds_wire,route_wire,choose_reference) VALUES(101,'triangular survey','((0,0),(4,0),(0,4))','((4,0),(0,4),(0,0))',3,true,'\x00000003000000000000000000000000000000004010000000000000000000000000000000000000000000004010000000000000','\x4010000000000000401000000000000000000000000000000000000000000000','\x0100000003000000000000000000000000000000004010000000000000000000000000000000000000000000004010000000000000',false);
-- name: parcel_reversed
INSERT INTO parcel_plans(id,label,boundary,reference,expected_points,expected_same,wire,bounds_wire,route_wire,choose_reference) VALUES(101,'reversed survey','((0,0),(4,0),(0,4))','((0,4),(4,0),(0,0))',3,true,NULL,NULL,NULL,false);
-- name: parcel_different_boundary
INSERT INTO parcel_plans(id,label,boundary,reference,expected_points,expected_same,wire,bounds_wire,route_wire,choose_reference) VALUES(101,'different survey','((0,0),(4,0),(0,4))','((0,0),(4,0),(4,4))',3,false,NULL,NULL,NULL,false);
-- name: parcel_null_boundary
INSERT INTO parcel_plans(id,label,boundary,reference,expected_points,expected_same,wire,bounds_wire,route_wire,choose_reference) VALUES(101,'absent survey',NULL,'((0,0))',NULL,NULL,NULL,NULL,NULL,false);
-- name: parcel_wrong_count
INSERT INTO parcel_plans(id,label,boundary,reference,expected_points,expected_same,wire,bounds_wire,route_wire,choose_reference) VALUES(101,'wrong count','((0,0))','((0,0))',2,true,NULL,NULL,NULL,false);
-- name: parcel_wrong_same
INSERT INTO parcel_plans(id,label,boundary,reference,expected_points,expected_same,wire,bounds_wire,route_wire,choose_reference) VALUES(101,'wrong equality','((0,0))','((1,1))',1,true,NULL,NULL,NULL,false);
-- name: parcel_wrong_wire
INSERT INTO parcel_plans(id,label,boundary,reference,expected_points,expected_same,wire,bounds_wire,route_wire,choose_reference) VALUES(101,'wrong point bytes','((0,0))',NULL,1,NULL,'\x00',NULL,NULL,false);
-- name: parcel_wrong_bounds
INSERT INTO parcel_plans(id,label,boundary,reference,expected_points,expected_same,wire,bounds_wire,route_wire,choose_reference) VALUES(101,'wrong bounds','((0,0))',NULL,1,NULL,NULL,'\x00',NULL,false);
-- name: parcel_wrong_route
INSERT INTO parcel_plans(id,label,boundary,reference,expected_points,expected_same,wire,bounds_wire,route_wire,choose_reference) VALUES(101,'wrong route bytes','((0,0))',NULL,1,NULL,NULL,NULL,'\x00',false);
-- name: parcel_selected_reference
INSERT INTO parcel_plans(id,label,boundary,reference,expected_points,expected_same,wire,bounds_wire,route_wire,choose_reference) VALUES(101,'selected reference',NULL,'((0,0))',NULL,NULL,'\x0000000100000000000000000000000000000000',NULL,NULL,true);
-- name: parcel_wrong_selected_reference
INSERT INTO parcel_plans(id,label,boundary,reference,expected_points,expected_same,wire,bounds_wire,route_wire,choose_reference) VALUES(101,'wrong selected reference',NULL,'((0,0))',NULL,NULL,'\x00',NULL,NULL,true);
-- name: parcel_cached_zero_bounds
INSERT INTO parcel_plans(id,label,boundary,reference,expected_points,expected_same,wire,bounds_wire,route_wire,choose_reference) VALUES(101,'box-derived signed zeros','(0,0),(-0,-0)'::box::polygon,'(0,0),(-0,-0)'::box::polygon::text::polygon,4,true,NULL,'\x8000000000000000800000000000000000000000000000000000000000000000',NULL,false);
-- name: parcel_decoded_zero_bounds
INSERT INTO parcel_plans(id,label,boundary,reference,expected_points,expected_same,wire,bounds_wire,route_wire,choose_reference) VALUES(101,'decoded signed zeros','(0,0),(-0,-0)'::box::polygon::text::polygon,'(0,0),(-0,-0)'::box::polygon,4,true,NULL,'\x8000000000000000800000000000000080000000000000008000000000000000',NULL,false);
-- name: parcel_wrong_zero_bounds
INSERT INTO parcel_plans(id,label,boundary,reference,expected_points,expected_same,wire,bounds_wire,route_wire,choose_reference) VALUES(101,'incorrect reconstructed bounds','(0,0),(-0,-0)'::box::polygon,NULL,4,NULL,NULL,'\x8000000000000000800000000000000080000000000000008000000000000000',NULL,false);
-- name: parcel_import_flat
INSERT INTO parcel_imports(id,plan_id,label,source,expected_points,wire,bypass) VALUES(101,1,'flat input','0,0',1,'\x0000000100000000000000000000000000000000',false);
-- name: parcel_import_null
INSERT INTO parcel_imports(id,plan_id,label,source,expected_points,wire,bypass) VALUES(101,1,'null input',NULL,NULL,NULL,false);
-- name: parcel_import_wrong_wire
INSERT INTO parcel_imports(id,plan_id,label,source,expected_points,wire,bypass) VALUES(101,1,'wrong imported bytes','((0,0))',1,'\x00',false);
-- name: parcel_import_wrong_count
INSERT INTO parcel_imports(id,plan_id,label,source,expected_points,wire,bypass) VALUES(101,1,'wrong imported count','((0,0))',2,NULL,false);
-- name: parcel_import_open_error
INSERT INTO parcel_imports(id,plan_id,label,source,expected_points,wire,bypass) VALUES(101,1,'open delimiter before overflow','[1e400,0]',1,NULL,false);
-- name: parcel_import_range_error
INSERT INTO parcel_imports(id,plan_id,label,source,expected_points,wire,bypass) VALUES(101,1,'reached overflow','((1e400,0))',1,NULL,false);
-- name: parcel_import_bypassed_error
INSERT INTO parcel_imports(id,plan_id,label,source,expected_points,wire,bypass) VALUES(101,1,'skipped invalid input','((bad,0))',1,'\x00',true);
-- name: parcel_member_inside
INSERT INTO parcel_memberships(id,plan_id,label,boundary,probe,expected_member,expected_reverse,bypass) VALUES(101,1,'interior marker','((0,0),(4,0),(4,4),(0,4))','(2,2)',true,true,false);
-- name: parcel_member_edge
INSERT INTO parcel_memberships(id,plan_id,label,boundary,probe,expected_member,expected_reverse,bypass) VALUES(101,1,'edge marker','((0,0),(4,0),(4,4),(0,4))','(2,0)',true,true,false);
-- name: parcel_member_outside
INSERT INTO parcel_memberships(id,plan_id,label,boundary,probe,expected_member,expected_reverse,bypass) VALUES(101,1,'outside marker','((0,0),(4,0),(4,4),(0,4))','(5,5)',false,false,false);
-- name: parcel_member_concave
INSERT INTO parcel_memberships(id,plan_id,label,boundary,probe,expected_member,expected_reverse,bypass) VALUES(101,1,'concave notch','((0,0),(4,0),(4,4),(2,2),(0,4))','(2,3)',false,false,false);
-- name: parcel_member_null
INSERT INTO parcel_memberships(id,plan_id,label,boundary,probe,expected_member,expected_reverse,bypass) VALUES(101,1,'unknown boundary',NULL,'(2,2)',NULL,NULL,false);
-- name: parcel_member_wrong_point
INSERT INTO parcel_memberships(id,plan_id,label,boundary,probe,expected_member,expected_reverse,bypass) VALUES(101,1,'wrong point observation','((0,0),(4,0),(4,4),(0,4))','(2,2)',false,true,false);
-- name: parcel_member_wrong_reverse
INSERT INTO parcel_memberships(id,plan_id,label,boundary,probe,expected_member,expected_reverse,bypass) VALUES(101,1,'wrong boundary observation','((0,0),(4,0),(4,4),(0,4))','(2,2)',true,false,false);
-- name: parcel_member_bypassed_overflow
INSERT INTO parcel_memberships(id,plan_id,label,boundary,probe,expected_member,expected_reverse,bypass) VALUES(101,1,'skipped extreme marker','((1e308,0),(-1e308,0),(0,1e308))','(-1e308,-1e308)',true,true,true);
-- name: parcel_conversion_closed
INSERT INTO parcel_conversions(id,plan_id,label,route,rectangle,route_wire,rectangle_wire,enabled) VALUES(101,1,'closed point route','((0,0))','(0,0),(0,0)','\x0000000100000000000000000000000000000000',NULL,true);
-- name: parcel_conversion_open_error
INSERT INTO parcel_conversions(id,plan_id,label,route,rectangle,route_wire,rectangle_wire,enabled) VALUES(101,1,'open route rejected','[(0,0)]',NULL,NULL,NULL,true);
-- name: parcel_conversion_bypassed_open
INSERT INTO parcel_conversions(id,plan_id,label,route,rectangle,route_wire,rectangle_wire,enabled) VALUES(101,1,'skipped open route','[(0,0)]',NULL,'\x00',NULL,false);
-- name: parcel_conversion_null
INSERT INTO parcel_conversions(id,plan_id,label,route,rectangle,route_wire,rectangle_wire,enabled) VALUES(101,1,'null conversion',NULL,NULL,NULL,NULL,true);
-- name: parcel_conversion_wrong_route
INSERT INTO parcel_conversions(id,plan_id,label,route,rectangle,route_wire,rectangle_wire,enabled) VALUES(101,1,'wrong converted route','((0,0))',NULL,'\x00',NULL,true);
-- name: parcel_conversion_wrong_box
INSERT INTO parcel_conversions(id,plan_id,label,route,rectangle,route_wire,rectangle_wire,enabled) VALUES(101,1,'wrong converted box',NULL,'(0,0),(0,0)',NULL,'\x00',true);
-- name: parcel_conversion_box
INSERT INTO parcel_conversions(id,plan_id,label,route,rectangle,route_wire,rectangle_wire,enabled) VALUES(101,1,'box point boundary',NULL,'(0,0),(0,0)',NULL,'\x0000000400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',true);

-- name: parcel_center_single_vertex
INSERT INTO parcel_centers(id,plan_id,label,boundary,center_wire,circle_wire,expected_radius,expected_consistent,bypass) VALUES(101,1,'single survey vertex','((3,4))','\x40080000000000004010000000000000','\x400800000000000040100000000000000000000000000000',0,true,false);
-- name: parcel_center_two_vertices
INSERT INTO parcel_centers(id,plan_id,label,boundary,center_wire,circle_wire,expected_radius,expected_consistent,bypass) VALUES(101,1,'endpoints of survey line','((0,0),(6,0))','\x40080000000000000000000000000000','\x400800000000000000000000000000004008000000000000',3,true,false);
-- name: parcel_center_triangle
INSERT INTO parcel_centers(id,plan_id,label,boundary,center_wire,circle_wire,expected_radius,expected_consistent,bypass) VALUES(101,1,'triangular survey mean','((0,0),(2,0),(0,2))','\x3fe55555555555553fe5555555555555','\x3fe55555555555553fe55555555555553ff4ede2d9f8addf',1.308077670527261,true,false);
-- name: parcel_center_duplicate_vertex
INSERT INTO parcel_centers(id,plan_id,label,boundary,center_wire,circle_wire,expected_radius,expected_consistent,bypass) VALUES(101,1,'repeated survey observation','((0,0),(0,0),(6,0))','\x40000000000000000000000000000000','\x400000000000000000000000000000004005555555555555',2.6666666666666665,true,false);
-- name: parcel_center_signed_zero
INSERT INTO parcel_centers(id,plan_id,label,boundary,center_wire,circle_wire,expected_radius,expected_consistent,bypass) VALUES(101,1,'signed origin observation','((-0,-0))','\x00000000000000000000000000000000','\x000000000000000000000000000000000000000000000000',0,true,false);
-- name: parcel_center_null_boundary
INSERT INTO parcel_centers(id,plan_id,label,boundary,center_wire,circle_wire,expected_radius,expected_consistent,bypass) VALUES(101,1,'missing boundary',NULL,NULL,NULL,NULL,NULL,false);
-- name: parcel_center_wrong_point
INSERT INTO parcel_centers(id,plan_id,label,boundary,center_wire,circle_wire,expected_radius,expected_consistent,bypass) VALUES(101,1,'incorrect center report','((3,4))','\x00',NULL,NULL,NULL,false);
-- name: parcel_center_wrong_circle
INSERT INTO parcel_centers(id,plan_id,label,boundary,center_wire,circle_wire,expected_radius,expected_consistent,bypass) VALUES(101,1,'incorrect circle report','((3,4))',NULL,'\x00',NULL,NULL,false);
-- name: parcel_center_wrong_radius
INSERT INTO parcel_centers(id,plan_id,label,boundary,center_wire,circle_wire,expected_radius,expected_consistent,bypass) VALUES(101,1,'incorrect radius report','((3,4))',NULL,NULL,1,NULL,false);
-- name: parcel_center_wrong_consistency
INSERT INTO parcel_centers(id,plan_id,label,boundary,center_wire,circle_wire,expected_radius,expected_consistent,bypass) VALUES(101,1,'incorrect center consistency report','((3,4))',NULL,NULL,NULL,false,false);
-- name: parcel_center_sum_overflow
INSERT INTO parcel_centers(id,plan_id,label,boundary,center_wire,circle_wire,expected_radius,expected_consistent,bypass) VALUES(101,1,'center sum exceeds float range','((1e308,0),(1e308,0),(-1e308,0))',NULL,NULL,NULL,NULL,false);
-- name: parcel_center_radius_overflow
INSERT INTO parcel_centers(id,plan_id,label,boundary,center_wire,circle_wire,expected_radius,expected_consistent,bypass) VALUES(101,1,'finite center with overflowing radius sum','((1e308,0),(-1e308,0))',NULL,NULL,NULL,NULL,false);
-- name: parcel_center_division_underflow
INSERT INTO parcel_centers(id,plan_id,label,boundary,center_wire,circle_wire,expected_radius,expected_consistent,bypass) VALUES(101,1,'center division below float range','((5e-324,0),(0,0))',NULL,NULL,NULL,NULL,false);
-- name: parcel_center_bypassed_radius_overflow
INSERT INTO parcel_centers(id,plan_id,label,boundary,center_wire,circle_wire,expected_radius,expected_consistent,bypass) VALUES(101,1,'skipped overflowing radius sum','((1e308,0),(-1e308,0))','\x00','\x00',1,false,true);

-- name: parcel_envelope_two_vertices
INSERT INTO parcel_envelopes(id,plan_id,label,source,vertex_count,expected_points,expected_size,expected_default_points,sample_wire,bounds_wire,bypass) VALUES(101,1,'diameter envelope','<(0,0),1>',2,2,36,12,'\x00000002bff000000000000000000000000000003ff00000000000003ca1a62633145c07','\x3ff00000000000003ca1a62633145c07bff00000000000000000000000000000',false);
-- name: parcel_envelope_four_vertices
INSERT INTO parcel_envelopes(id,plan_id,label,source,vertex_count,expected_points,expected_size,expected_default_points,sample_wire,bounds_wire,bypass) VALUES(101,1,'quadrilateral envelope','<(0,0),1>',4,4,68,12,'\x00000004bff00000000000000000000000000000bc91a62633145c073ff00000000000003ff00000000000003ca1a62633145c073caa79394c9e8a0abff0000000000000','\x3ff00000000000003ff0000000000000bff0000000000000bff0000000000000',false);
-- name: parcel_envelope_negative_radius
INSERT INTO parcel_envelopes(id,plan_id,label,source,vertex_count,expected_points,expected_size,expected_default_points,sample_wire,bounds_wire,bypass) VALUES(101,1,'stored reversed radius',pg_catalog.circle('(0,0)'::point,'-2'::float8),2,2,36,12,'\x0000000240000000000000000000000000000000c000000000000000bcb1a62633145c07','\x40000000000000000000000000000000c000000000000000bcb1a62633145c07',false);
-- name: parcel_envelope_eleven_vertices
INSERT INTO parcel_envelopes(id,plan_id,label,source,vertex_count,expected_points,expected_size,expected_default_points,sample_wire,bounds_wire,bypass) VALUES(101,1,'eleven survey bearings','<(3,4),2>',11,11,180,12,NULL,NULL,false);
-- name: parcel_envelope_nan_metadata
INSERT INTO parcel_envelopes(id,plan_id,label,source,vertex_count,expected_points,expected_size,expected_default_points,sample_wire,bounds_wire,bypass) VALUES(101,1,'shape metadata with NaN center','<(NaN,1),3>',3,3,52,12,NULL,NULL,false);
-- name: parcel_envelope_null_circle
INSERT INTO parcel_envelopes(id,plan_id,label,source,vertex_count,expected_points,expected_size,expected_default_points,sample_wire,bounds_wire,bypass) VALUES(101,1,'missing envelope circle',NULL,4,NULL,NULL,NULL,NULL,NULL,false);
-- name: parcel_envelope_null_count
INSERT INTO parcel_envelopes(id,plan_id,label,source,vertex_count,expected_points,expected_size,expected_default_points,sample_wire,bounds_wire,bypass) VALUES(101,1,'missing vertex count','<(0,0),1>',NULL,NULL,NULL,12,NULL,NULL,false);
-- name: parcel_envelope_wrong_count
INSERT INTO parcel_envelopes(id,plan_id,label,source,vertex_count,expected_points,expected_size,expected_default_points,sample_wire,bounds_wire,bypass) VALUES(101,1,'incorrect vertex report','<(0,0),1>',2,3,NULL,NULL,NULL,NULL,false);
-- name: parcel_envelope_wrong_size
INSERT INTO parcel_envelopes(id,plan_id,label,source,vertex_count,expected_points,expected_size,expected_default_points,sample_wire,bounds_wire,bypass) VALUES(101,1,'incorrect wire size','<(0,0),1>',2,NULL,35,NULL,NULL,NULL,false);
-- name: parcel_envelope_wrong_default_count
INSERT INTO parcel_envelopes(id,plan_id,label,source,vertex_count,expected_points,expected_size,expected_default_points,sample_wire,bounds_wire,bypass) VALUES(101,1,'incorrect default vertex count','<(0,0),1>',2,NULL,NULL,13,NULL,NULL,false);
-- name: parcel_envelope_wrong_wire
INSERT INTO parcel_envelopes(id,plan_id,label,source,vertex_count,expected_points,expected_size,expected_default_points,sample_wire,bounds_wire,bypass) VALUES(101,1,'incorrect vertex bytes','<(0,0),1>',2,NULL,NULL,NULL,'\x00',NULL,false);
-- name: parcel_envelope_wrong_bounds
INSERT INTO parcel_envelopes(id,plan_id,label,source,vertex_count,expected_points,expected_size,expected_default_points,sample_wire,bounds_wire,bypass) VALUES(101,1,'incorrect cached bounds','<(0,0),1>',2,NULL,NULL,NULL,NULL,'\x00',false);
-- name: parcel_envelope_zero_before_bad_count
INSERT INTO parcel_envelopes(id,plan_id,label,source,vertex_count,expected_points,expected_size,expected_default_points,sample_wire,bounds_wire,bypass) VALUES(101,1,'zero radius before invalid count','<(0,0),0>',0,NULL,NULL,NULL,NULL,NULL,false);
-- name: parcel_envelope_tolerance_zero
INSERT INTO parcel_envelopes(id,plan_id,label,source,vertex_count,expected_points,expected_size,expected_default_points,sample_wire,bounds_wire,bypass) VALUES(101,1,'radius at geometric zero tolerance','<(0,0),0.000001>',2,NULL,NULL,NULL,NULL,NULL,false);
-- name: parcel_envelope_above_zero_tolerance
INSERT INTO parcel_envelopes(id,plan_id,label,source,vertex_count,expected_points,expected_size,expected_default_points,sample_wire,bounds_wire,bypass) VALUES(101,1,'radius above geometric zero tolerance','<(0,0),0.0000010000000000000002>',2,2,36,12,NULL,NULL,false);
-- name: parcel_envelope_too_few_vertices
INSERT INTO parcel_envelopes(id,plan_id,label,source,vertex_count,expected_points,expected_size,expected_default_points,sample_wire,bounds_wire,bypass) VALUES(101,1,'one requested vertex','<(0,0),1>',1,NULL,NULL,NULL,NULL,NULL,false);
-- name: parcel_envelope_point_limit
INSERT INTO parcel_envelopes(id,plan_id,label,source,vertex_count,expected_points,expected_size,expected_default_points,sample_wire,bounds_wire,bypass) VALUES(101,1,'native point count limit','<(0,0),1>',134217726,NULL,NULL,NULL,NULL,NULL,false);
-- name: parcel_envelope_first_vertex_overflow
INSERT INTO parcel_envelopes(id,plan_id,label,source,vertex_count,expected_points,expected_size,expected_default_points,sample_wire,bounds_wire,bypass) VALUES(101,1,'first vertex exceeds coordinate range','<(-1e308,0),1e308>',4,NULL,NULL,NULL,NULL,NULL,false);
-- name: parcel_envelope_later_vertex_overflow
INSERT INTO parcel_envelopes(id,plan_id,label,source,vertex_count,expected_points,expected_size,expected_default_points,sample_wire,bounds_wire,bypass) VALUES(101,1,'later vertex exceeds coordinate range','<(1e308,1e308),1e308>',4,NULL,NULL,NULL,NULL,NULL,false);
-- name: parcel_envelope_bypassed_error
INSERT INTO parcel_envelopes(id,plan_id,label,source,vertex_count,expected_points,expected_size,expected_default_points,sample_wire,bounds_wire,bypass) VALUES(101,1,'skipped invalid circle conversion','<(0,0),0>',0,1,1,1,'\x00','\x00',true);

-- name: parcel_relation_separated
INSERT INTO parcel_relations(id,plan_id,label,boundary,reference,directions,expected_overlap,expected_contains,expected_contained,bounds_wire,bypass) VALUES(101,1,'northeast survey point','((0,0),(4,0),(4,4),(0,4))','((5,5))',ARRAY[true,true,false,false,true,true,false,false],false,false,false,'\x4010000000000000401000000000000000000000000000000000000000000000',false);
-- name: parcel_relation_exact_direction
INSERT INTO parcel_relations(id,plan_id,label,boundary,reference,directions,expected_overlap,expected_contains,expected_contained,bounds_wire,bypass) VALUES(101,1,'direction uses exact coordinate comparison','((0,0),(4,0),(4,4),(0,4))','((4.000000000000001,0))',ARRAY[true,true,false,false,false,false,false,true],true,true,false,NULL,false);
-- name: parcel_relation_identical
INSERT INTO parcel_relations(id,plan_id,label,boundary,reference,directions,expected_overlap,expected_contains,expected_contained,bounds_wire,bypass) VALUES(101,1,'identical outlines','((0,0),(4,0),(4,4),(0,4))','((0,0),(4,0),(4,4),(0,4))',ARRAY[false,true,false,true,false,true,false,true],true,true,true,NULL,false);
-- name: parcel_relation_nested
INSERT INTO parcel_relations(id,plan_id,label,boundary,reference,directions,expected_overlap,expected_contains,expected_contained,bounds_wire,bypass) VALUES(101,1,'nested triangle','((0,0),(4,0),(4,4),(0,4))','((1,1),(2,1),(1,2))',ARRAY[false,false,false,false,false,false,false,false],true,true,false,NULL,false);
-- name: parcel_relation_notch_crossing
INSERT INTO parcel_relations(id,plan_id,label,boundary,reference,directions,expected_overlap,expected_contains,expected_contained,bounds_wire,bypass) VALUES(101,1,'endpoints inside but edge crosses notch','((0,0),(6,0),(6,6),(4,6),(4,2),(2,2),(2,6),(0,6))','((1,4),(5,4))',NULL,true,false,false,NULL,false);
-- name: parcel_relation_disjoint_interiors
INSERT INTO parcel_relations(id,plan_id,label,boundary,reference,directions,expected_overlap,expected_contains,expected_contained,bounds_wire,bypass) VALUES(101,1,'overlapping bounds with disjoint interiors','((0,0),(4,0),(0,4))','((4,4),(4,3),(3,4))',NULL,false,false,false,NULL,false);
-- name: parcel_relation_collinear
INSERT INTO parcel_relations(id,plan_id,label,boundary,reference,directions,expected_overlap,expected_contains,expected_contained,bounds_wire,bypass) VALUES(101,1,'shared boundary segment','((0,0),(4,0),(4,4),(0,4))','((1,0),(3,0))',NULL,true,true,false,NULL,false);
-- name: parcel_relation_wrong_directions
INSERT INTO parcel_relations(id,plan_id,label,boundary,reference,directions,expected_overlap,expected_contains,expected_contained,bounds_wire,bypass) VALUES(101,1,'incorrect directional observations','((0,0),(4,0),(4,4),(0,4))','((0,0),(4,0),(4,4),(0,4))',ARRAY[true,false,true,false,true,false,true,false],true,true,true,NULL,false);
-- name: parcel_relation_wrong_overlap
INSERT INTO parcel_relations(id,plan_id,label,boundary,reference,directions,expected_overlap,expected_contains,expected_contained,bounds_wire,bypass) VALUES(101,1,'incorrect intersection observation','((0,0),(4,0),(4,4),(0,4))','((1,1))',NULL,false,true,false,NULL,false);
-- name: parcel_relation_wrong_containment
INSERT INTO parcel_relations(id,plan_id,label,boundary,reference,directions,expected_overlap,expected_contains,expected_contained,bounds_wire,bypass) VALUES(101,1,'incorrect enclosing observations','((0,0),(4,0),(4,4),(0,4))','((0,0),(4,0),(4,4),(0,4))',NULL,true,false,false,NULL,false);
-- name: parcel_relation_wrong_compression
INSERT INTO parcel_relations(id,plan_id,label,boundary,reference,directions,expected_overlap,expected_contains,expected_contained,bounds_wire,bypass) VALUES(101,1,'incorrect cached bounds','((0,0))','((0,0))',NULL,true,true,true,'\x00',false);
-- name: parcel_relation_null
INSERT INTO parcel_relations(id,plan_id,label,boundary,reference,directions,expected_overlap,expected_contains,expected_contained,bounds_wire,bypass) VALUES(101,1,'missing outline',NULL,'((0,0))',ARRAY[true,true,true,true,true,true,true,true],true,true,true,'\x00',false);
-- name: parcel_relation_overflow
INSERT INTO parcel_relations(id,plan_id,label,boundary,reference,directions,expected_overlap,expected_contains,expected_contained,bounds_wire,bypass) VALUES(101,1,'reached extreme edge arithmetic','((1e308,1e308),(-1e308,-1e308))','((0,0),(1,1))',NULL,true,true,false,NULL,false);
-- name: parcel_relation_skipped_overflow
INSERT INTO parcel_relations(id,plan_id,label,boundary,reference,directions,expected_overlap,expected_contains,expected_contained,bounds_wire,bypass) VALUES(101,1,'skipped extreme edge arithmetic','((1e308,1e308),(-1e308,-1e308))','((0,0),(1,1))',NULL,true,true,false,'\x00',true);
-- name: parcel_relation_bounds_skip_edges
INSERT INTO parcel_relations(id,plan_id,label,boundary,reference,directions,expected_overlap,expected_contains,expected_contained,bounds_wire,bypass) VALUES(101,1,'disjoint bounds avoid overflowing edge arithmetic','((1e308,0),(-1e308,0))','((0,5))',NULL,false,false,false,NULL,false);

-- name: parcel_clearance_interior
INSERT INTO parcel_clearances(id,plan_id,label,boundary,reference,marker,exclusion,marker_distance,exclusion_distance,boundary_distance,bypass) VALUES(101,1,'inside area has zero clearance','((0,0),(4,0),(4,4),(0,4))','((1,1),(2,1),(1,2))','(2,2)','<(2,2),1>',0,0,0,false);
-- name: parcel_clearance_outside
INSERT INTO parcel_clearances(id,plan_id,label,boundary,reference,marker,exclusion,marker_distance,exclusion_distance,boundary_distance,bypass) VALUES(101,1,'three four five projection','((0,0),(4,0),(4,4),(0,4))','((7,8))','(7,8)','<(7,8),2>',5,3,5,false);
-- name: parcel_clearance_negative_radius
INSERT INTO parcel_clearances(id,plan_id,label,boundary,reference,marker,exclusion,marker_distance,exclusion_distance,boundary_distance,bypass) VALUES(101,1,'stored negative radius increases clearance','((0,0),(4,0),(4,4),(0,4))','((2,2))','(2,2)',pg_catalog.circle('(2,2)'::point,'-2'::float8),0,2,0,false);
-- name: parcel_clearance_wrong_marker
INSERT INTO parcel_clearances(id,plan_id,label,boundary,reference,marker,exclusion,marker_distance,exclusion_distance,boundary_distance,bypass) VALUES(101,1,'incorrect marker clearance','((0,0),(4,0),(4,4),(0,4))','((2,2))','(2,2)','<(2,2),1>',1,0,0,false);
-- name: parcel_clearance_wrong_circle
INSERT INTO parcel_clearances(id,plan_id,label,boundary,reference,marker,exclusion,marker_distance,exclusion_distance,boundary_distance,bypass) VALUES(101,1,'incorrect exclusion clearance','((0,0),(4,0),(4,4),(0,4))','((2,2))','(2,2)','<(2,2),1>',0,1,0,false);
-- name: parcel_clearance_wrong_boundary
INSERT INTO parcel_clearances(id,plan_id,label,boundary,reference,marker,exclusion,marker_distance,exclusion_distance,boundary_distance,bypass) VALUES(101,1,'incorrect boundary clearance','((0,0),(4,0),(4,4),(0,4))','((2,2))','(2,2)','<(2,2),1>',0,0,1,false);
-- name: parcel_clearance_null
INSERT INTO parcel_clearances(id,plan_id,label,boundary,reference,marker,exclusion,marker_distance,exclusion_distance,boundary_distance,bypass) VALUES(101,1,'missing outline',NULL,'((2,2))','(2,2)','<(2,2),1>',1,1,1,false);
-- name: parcel_clearance_overflow
INSERT INTO parcel_clearances(id,plan_id,label,boundary,reference,marker,exclusion,marker_distance,exclusion_distance,boundary_distance,bypass) VALUES(101,1,'reached coordinate subtraction overflow','((1e308,1e308))','((-1e308,-1e308))','(-1e308,-1e308)','<(-1e308,-1e308),1>',1,1,1,false);
-- name: parcel_clearance_skipped_overflow
INSERT INTO parcel_clearances(id,plan_id,label,boundary,reference,marker,exclusion,marker_distance,exclusion_distance,boundary_distance,bypass) VALUES(101,1,'skipped coordinate subtraction overflow','((1e308,1e308))','((-1e308,-1e308))','(-1e308,-1e308)','<(-1e308,-1e308),1>',1,1,1,true);
