INSERT INTO guide_axes (id,label,axis,expected_wire,required_axis,recorded_horizontal,recorded_vertical)
VALUES (1,'Diagonal guide','{1,-1,0}','\x3ff0000000000000bff00000000000000000000000000000',true,false,false);
INSERT INTO guide_matches (id,guide_id,label,first_axis,second_axis,recorded_same,prefer_first,expected_wire,skip_comparison)
VALUES (1,1,'Proportional guides','{1,-1,0}','{2,-2,0}',true,true,'\x3ff0000000000000bff00000000000000000000000000000',false);
