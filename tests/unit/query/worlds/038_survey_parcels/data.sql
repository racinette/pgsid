INSERT INTO parcel_plans(id,label,boundary,reference,expected_points,expected_same,wire,bounds_wire,route_wire,choose_reference) VALUES
(1,'triangular parcel','((0,0),(4,0),(0,4))','((4,0),(0,4),(0,0))',3,true,'\x00000003000000000000000000000000000000004010000000000000000000000000000000000000000000004010000000000000','\x4010000000000000401000000000000000000000000000000000000000000000','\x0100000003000000000000000000000000000000004010000000000000000000000000000000000000000000004010000000000000',false);
INSERT INTO parcel_imports(id,plan_id,label,source,expected_points,wire,bypass) VALUES
(1,1,'survey import','((0,0),(4,0),(0,4))',3,'\x00000003000000000000000000000000000000004010000000000000000000000000000000000000000000004010000000000000',false);
INSERT INTO parcel_memberships(id,plan_id,label,boundary,probe,expected_member,expected_reverse,bypass) VALUES
(1,1,'interior marker','((0,0),(4,0),(0,4))','(1,1)',true,true,false);
INSERT INTO parcel_conversions(id,plan_id,label,route,rectangle,route_wire,rectangle_wire,enabled) VALUES
(1,1,'point boundary','((0,0))','(0,0),(0,0)','\x0000000100000000000000000000000000000000',NULL,true);
