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
