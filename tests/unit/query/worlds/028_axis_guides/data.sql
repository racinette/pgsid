INSERT INTO guide_axes (id,label,axis,expected_wire,required_axis,recorded_horizontal,recorded_vertical)
VALUES (1,'Diagonal guide','{1,-1,0}','\x3ff0000000000000bff00000000000000000000000000000',true,false,false);
INSERT INTO guide_matches (id,guide_id,label,first_axis,second_axis,recorded_same,prefer_first,expected_wire,skip_comparison)
VALUES (1,1,'Proportional guides','{1,-1,0}','{2,-2,0}',true,true,'\x3ff0000000000000bff00000000000000000000000000000',false);
INSERT INTO guide_imports (id,guide_id,label,source_text,recorded_equation,recorded_wire,was_imported,skip_validation)
VALUES (1,1,'Imported diagonal','[(0,0),(1,1)]','{1,-1,0}','\x3ff0000000000000bff00000000000000000000000000000',true,false);
INSERT INTO guide_constructions (id,guide_id,label,first_position,second_position,recorded_equation,recorded_horizontal,recorded_vertical,skip_validation)
VALUES (1,1,'Constructed diagonal','(0,0)','(1,1)','{1,-1,0}',false,false,false);
INSERT INTO guide_relations (id,guide_id,label,first_axis,second_axis,recorded_parallel,recorded_perpendicular,recorded_crossing,recorded_point,recorded_distance,skip_validation)
VALUES (1,1,'Crossing axes','{0,-1,0}','{-1,0,0}',false,true,true,'(0,0)','\x0000000000000000',false);
INSERT INTO guide_projections (id,guide_id,label,position,axis,recorded_on_axis,recorded_closest,recorded_distance,skip_validation)
VALUES (1,1,'Horizontal projection','(3,4)','{0,-1,0}',false,'(3,0)','\x4010000000000000',false);

INSERT INTO guide_segment_imports (id,guide_id,label,source_text,recorded_wire,recorded_length,recorded_center,recorded_horizontal,recorded_vertical,recorded_present,skip_validation) VALUES (1,1,'Survey edge','[(0,0),(3,4)]','\x0000000000000000000000000000000040080000000000004010000000000000',5,'(1.5,2)',false,false,true,false);
INSERT INTO guide_segment_relations (id,guide_id,label,first_text,second_text,recorded_same,recorded_less,recorded_le,recorded_greater,recorded_ge,recorded_parallel,recorded_perpendicular,prefer_first,recorded_wire,skip_validation) VALUES (1,1,'Reversed survey edge','[(0,0),(3,4)]','[(3,4),(0,0)]',false,false,true,false,true,true,false,false,'\x4008000000000000401000000000000000000000000000000000000000000000',false);
INSERT INTO guide_segment_constructions (id,guide_id,label,first_text,second_text,recorded_segment,recorded_wire,skip_validation) VALUES (1,1,'Coincident endpoint','(0,0)','(0,0)','[(0,0),(0,0)]','\x0000000000000000000000000000000000000000000000000000000000000000',false);
