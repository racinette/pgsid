INSERT INTO guide_axes (id,label,axis,expected_wire,required_axis,recorded_horizontal,recorded_vertical)
VALUES (1,'Diagonal guide','{1,-1,0}','\x3ff0000000000000bff00000000000000000000000000000',true,false,false);
INSERT INTO guide_matches (id,guide_id,label,first_axis,second_axis,recorded_same,prefer_first,expected_wire,skip_comparison)
VALUES (1,1,'Proportional guides','{1,-1,0}','{2,-2,0}',true,true,'\x3ff0000000000000bff00000000000000000000000000000',false);
INSERT INTO guide_imports (id,guide_id,label,source_text,recorded_equation,recorded_wire,was_imported,skip_validation)
VALUES (1,1,'Imported diagonal','[(0,0),(1,1)]','{1,-1,0}','\x3ff0000000000000bff00000000000000000000000000000',true,false);
INSERT INTO guide_constructions (id,guide_id,label,first_position,second_position,recorded_equation,recorded_horizontal,recorded_vertical,skip_validation)
VALUES (1,1,'Constructed diagonal','(0,0)','(1,1)','{1,-1,0}',false,false,false);
