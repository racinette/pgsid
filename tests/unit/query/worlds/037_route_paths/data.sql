INSERT INTO route_plans(id,label) VALUES(1,'unassigned route');
INSERT INTO route_imports(id,plan_id,label,bypass) VALUES(1,1,'empty import',false);
INSERT INTO route_transforms(id,plan_id,label,check_wires,divide_enabled) VALUES(1,1,'empty transform',true,true);
INSERT INTO route_distances(id,plan_id,label) VALUES(1,1,'empty distance');
