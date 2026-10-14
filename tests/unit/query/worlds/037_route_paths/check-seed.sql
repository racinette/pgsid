-- name: route_open
INSERT INTO route_plans(id,label,route,reference,expected_points,expected_closed,expected_length,expected_area,wire,selected_wire) VALUES(101,'route_open','[(0,0),(3,4)]','((1,1),(2,2))',2,false,5,0,'\x00000000020000000000000000000000000000000040080000000000004010000000000000','\x00000000020000000000000000000000000000000040080000000000004010000000000000');
-- name: route_closed_triangle
INSERT INTO route_plans(id,label,route,reference,expected_points,expected_closed,expected_length,expected_area,wire,selected_wire) VALUES(101,'route_closed_triangle','((0,0),(3,0),(3,4))','[(9,9),(8,8),(7,7)]',3,true,12,6,'\x0100000003000000000000000000000000000000004008000000000000000000000000000040080000000000004010000000000000','\x0000000003000000000000000000000000000000004008000000000000000000000000000040080000000000004010000000000000');
-- name: route_reversed
INSERT INTO route_plans(id,label,route,reference,expected_points,expected_closed,expected_length,expected_area,wire,selected_wire) VALUES(101,'route_reversed','[(3,4),(0,0)]','((1,1),(2,2))',2,false,5,0,'\x00000000024008000000000000401000000000000000000000000000000000000000000000','\x00000000024008000000000000401000000000000000000000000000000000000000000000');
-- name: route_single_point
INSERT INTO route_plans(id,label,route,reference,expected_points,expected_closed,expected_length,expected_area,wire,selected_wire) VALUES(101,'route_single_point','((2,3))','[(1,1)]',1,true,0,0,'\x010000000140000000000000004008000000000000','\x000000000140000000000000004008000000000000');
-- name: route_null
INSERT INTO route_plans(id,label,route,reference,expected_points,expected_closed,expected_length,expected_area,wire,selected_wire) VALUES(101,'route_null',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
-- name: route_wrong_count
INSERT INTO route_plans(id,label,route,reference,expected_points,expected_closed,expected_length,expected_area,wire,selected_wire) VALUES(101,'route_wrong_count','[(0,0),(3,4)]','((1,1),(2,2))',3,false,5,0,'\x00000000020000000000000000000000000000000040080000000000004010000000000000','\x00000000020000000000000000000000000000000040080000000000004010000000000000');
-- name: route_wrong_closed
INSERT INTO route_plans(id,label,route,reference,expected_points,expected_closed,expected_length,expected_area,wire,selected_wire) VALUES(101,'route_wrong_closed','[(0,0),(3,4)]','((1,1),(2,2))',2,true,5,0,'\x00000000020000000000000000000000000000000040080000000000004010000000000000','\x00000000020000000000000000000000000000000040080000000000004010000000000000');
-- name: route_wrong_length
INSERT INTO route_plans(id,label,route,reference,expected_points,expected_closed,expected_length,expected_area,wire,selected_wire) VALUES(101,'route_wrong_length','[(0,0),(3,4)]','((1,1),(2,2))',2,false,6,0,'\x00000000020000000000000000000000000000000040080000000000004010000000000000','\x00000000020000000000000000000000000000000040080000000000004010000000000000');
-- name: route_wrong_area
INSERT INTO route_plans(id,label,route,reference,expected_points,expected_closed,expected_length,expected_area,wire,selected_wire) VALUES(101,'route_wrong_area','[(0,0),(3,4)]','((1,1),(2,2))',2,false,5,1,'\x00000000020000000000000000000000000000000040080000000000004010000000000000','\x00000000020000000000000000000000000000000040080000000000004010000000000000');
-- name: route_wrong_cardinality
INSERT INTO route_plans(id,label,route,reference,expected_points,expected_closed,expected_length,expected_area,wire,selected_wire) VALUES(101,'route_wrong_cardinality','[(0,0),(3,4)]','[(1,1)]',2,false,5,0,'\x00000000020000000000000000000000000000000040080000000000004010000000000000','\x00000000020000000000000000000000000000000040080000000000004010000000000000');
-- name: route_wrong_wire
INSERT INTO route_plans(id,label,route,reference,expected_points,expected_closed,expected_length,expected_area,wire,selected_wire) VALUES(101,'route_wrong_wire','[(0,0),(3,4)]','((1,1),(2,2))',2,false,5,0,'\x00','\x00000000020000000000000000000000000000000040080000000000004010000000000000');
-- name: route_wrong_selected
INSERT INTO route_plans(id,label,route,reference,expected_points,expected_closed,expected_length,expected_area,wire,selected_wire) VALUES(101,'route_wrong_selected','[(0,0),(3,4)]','((1,1),(2,2))',2,false,5,0,'\x00000000020000000000000000000000000000000040080000000000004010000000000000','\x00');
-- name: route_reached_overflow
INSERT INTO route_plans(id,label,route,reference,expected_points,expected_closed,expected_length,expected_area,wire,selected_wire) VALUES(101,'route_reached_overflow','[(1e308,1e308),(-1e308,-1e308)]','((1,1),(2,2))',2,false,5,0,NULL,NULL);
-- name: route_nan_rejection
INSERT INTO route_plans(id,label,route,reference,expected_points,expected_closed,expected_length,expected_area,wire,selected_wire) VALUES(101,'route_nan_rejection','((NaN,0),(1,1))','((1,1),(2,2))',2,true,5,0,NULL,NULL);
-- name: import_canonical
INSERT INTO route_imports(id,plan_id,label,source,wire,bypass) VALUES(101,1,'import_canonical','[(0,0),(3,4)]','\x00000000020000000000000000000000000000000040080000000000004010000000000000',false);
-- name: import_legacy_flat
INSERT INTO route_imports(id,plan_id,label,source,wire,bypass) VALUES(101,1,'import_legacy_flat','[0,0,3,4]','\x00000000020000000000000000000000000000000040080000000000004010000000000000',false);
-- name: import_nullable
INSERT INTO route_imports(id,plan_id,label,source,wire,bypass) VALUES(101,1,'import_nullable',NULL,NULL,false);
-- name: import_wrong_wire
INSERT INTO route_imports(id,plan_id,label,source,wire,bypass) VALUES(101,1,'import_wrong_wire','[(0,0),(3,4)]','\x00',false);
-- name: import_reached_syntax
INSERT INTO route_imports(id,plan_id,label,source,wire,bypass) VALUES(101,1,'import_reached_syntax','[(bad,0)]',NULL,false);
-- name: import_bypassed_syntax
INSERT INTO route_imports(id,plan_id,label,source,wire,bypass) VALUES(101,1,'import_bypassed_syntax','[(bad,0)]',NULL,true);
