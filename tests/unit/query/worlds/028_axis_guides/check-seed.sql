-- name: guide_vertical_axis
INSERT INTO guide_axes (id,label,axis,expected_wire,required_axis,recorded_horizontal,recorded_vertical)
VALUES (2,'Vertical','{-1,0,3}','\xbff000000000000000000000000000004008000000000000',true,false,true);
-- name: guide_horizontal_axis
INSERT INTO guide_axes (id,label,axis,expected_wire,required_axis,recorded_horizontal,recorded_vertical)
VALUES (2,'Horizontal','{0,-1,2}','\x0000000000000000bff00000000000004000000000000000',true,true,false);
-- name: guide_diagonal_axis
INSERT INTO guide_axes (id,label,axis,expected_wire,required_axis,recorded_horizontal,recorded_vertical)
VALUES (2,'Diagonal','{1,-1,0}','\x3ff0000000000000bff00000000000000000000000000000',true,false,false);
-- name: guide_null_axis
INSERT INTO guide_axes (id,label,axis,expected_wire,required_axis,recorded_horizontal,recorded_vertical)
VALUES (2,'Empty guide',NULL,NULL,false,NULL,NULL);
-- name: guide_null_presence_record
INSERT INTO guide_axes (id,label,axis,expected_wire,required_axis,recorded_horizontal,recorded_vertical)
VALUES (2,'Unrecorded presence',NULL,NULL,NULL,NULL,NULL);
-- name: guide_wrong_wire
INSERT INTO guide_axes (id,label,axis,expected_wire,required_axis,recorded_horizontal,recorded_vertical)
VALUES (2,'Wrong wire','{1,-1,0}','\x00',true,false,false);
-- name: guide_wrong_presence
INSERT INTO guide_axes (id,label,axis,expected_wire,required_axis,recorded_horizontal,recorded_vertical)
VALUES (2,'Wrong presence','{1,-1,0}','\x3ff0000000000000bff00000000000000000000000000000',false,false,false);
-- name: guide_wrong_horizontal
INSERT INTO guide_axes (id,label,axis,expected_wire,required_axis,recorded_horizontal,recorded_vertical)
VALUES (2,'Wrong horizontal','{1,-1,0}','\x3ff0000000000000bff00000000000000000000000000000',true,true,false);
-- name: guide_wrong_vertical
INSERT INTO guide_axes (id,label,axis,expected_wire,required_axis,recorded_horizontal,recorded_vertical)
VALUES (2,'Wrong vertical','{1,-1,0}','\x3ff0000000000000bff00000000000000000000000000000',true,false,true);
-- name: guide_nan_coefficient
INSERT INTO guide_axes (id,label,axis,expected_wire,required_axis,recorded_horizontal,recorded_vertical)
VALUES (2,'NaN coefficient','{NaN,1,1}','\x7ff80000000000003ff00000000000003ff0000000000000',true,false,false);
-- name: guide_infinite_coefficient
INSERT INTO guide_axes (id,label,axis,expected_wire,required_axis,recorded_horizontal,recorded_vertical)
VALUES (2,'Infinite coefficient','{Infinity,-1,0}','\x7ff0000000000000bff00000000000000000000000000000',true,false,false);
-- name: guide_signed_zero_coefficient
INSERT INTO guide_axes (id,label,axis,expected_wire,required_axis,recorded_horizontal,recorded_vertical)
VALUES (2,'Signed zero','{1,1,-0}','\x3ff00000000000003ff00000000000008000000000000000',true,false,false);

-- name: guides_proportional
INSERT INTO guide_matches (id,guide_id,label,first_axis,second_axis,recorded_same,prefer_first,expected_wire,skip_comparison)
VALUES (2,1,'Proportional','{1,-1,0}','{2,-2,0}',true,true,'\x3ff0000000000000bff00000000000000000000000000000',false);
-- name: guides_distinct
INSERT INTO guide_matches (id,guide_id,label,first_axis,second_axis,recorded_same,prefer_first,expected_wire,skip_comparison)
VALUES (2,1,'Distinct','{1,-1,0}','{1,-1,1}',false,true,'\x3ff0000000000000bff00000000000000000000000000000',false);
-- name: guides_tolerance
INSERT INTO guide_matches (id,guide_id,label,first_axis,second_axis,recorded_same,prefer_first,expected_wire,skip_comparison)
VALUES (2,1,'Within tolerance','{1,-1,0}','{1,-1,0.0000005}',true,true,'\x3ff0000000000000bff00000000000000000000000000000',false);
-- name: guides_wrong_same_record
INSERT INTO guide_matches (id,guide_id,label,first_axis,second_axis,recorded_same,prefer_first,expected_wire,skip_comparison)
VALUES (2,1,'Wrong equality','{1,-1,0}','{2,-2,0}',false,true,'\x3ff0000000000000bff00000000000000000000000000000',false);
-- name: guides_wrong_selection
INSERT INTO guide_matches (id,guide_id,label,first_axis,second_axis,recorded_same,prefer_first,expected_wire,skip_comparison)
VALUES (2,1,'Wrong selection','{1,-1,0}','{2,-2,0}',true,false,'\x3ff0000000000000bff00000000000000000000000000000',false);
-- name: guides_wrong_default
INSERT INTO guide_matches (id,guide_id,label,first_axis,second_axis,recorded_same,prefer_first,expected_wire,skip_comparison)
VALUES (2,1,'Wrong default',NULL,'{2,-2,0}',NULL,true,'\x3ff0000000000000bff00000000000000000000000000000',false);
-- name: guides_choose_second
INSERT INTO guide_matches (id,guide_id,label,first_axis,second_axis,recorded_same,prefer_first,expected_wire,skip_comparison)
VALUES (2,1,'Choose second',NULL,'{2,-2,0}',NULL,false,'\x4000000000000000c0000000000000000000000000000000',false);
-- name: guides_both_null
INSERT INTO guide_matches (id,guide_id,label,first_axis,second_axis,recorded_same,prefer_first,expected_wire,skip_comparison)
VALUES (2,1,'Both empty',NULL,NULL,NULL,false,NULL,false);
-- name: guides_nan_exact
INSERT INTO guide_matches (id,guide_id,label,first_axis,second_axis,recorded_same,prefer_first,expected_wire,skip_comparison)
VALUES (2,1,'Exact NaN coefficients','{NaN,1,1}','{NaN,1,1}',true,true,'\x7ff80000000000003ff00000000000003ff0000000000000',false);
-- name: guides_nan_exact_mismatch
INSERT INTO guide_matches (id,guide_id,label,first_axis,second_axis,recorded_same,prefer_first,expected_wire,skip_comparison)
VALUES (2,1,'NaN forces exact comparison','{NaN,1,1}','{NaN,1,1.0000005}',false,true,'\x7ff80000000000003ff00000000000003ff0000000000000',false);
-- name: guides_infinity_self_comparison
INSERT INTO guide_matches (id,guide_id,label,first_axis,second_axis,recorded_same,prefer_first,expected_wire,skip_comparison)
VALUES (2,1,'Infinite self comparison','{Infinity,-1,0}','{Infinity,-1,0}',false,true,'\x7ff0000000000000bff00000000000000000000000000000',false);
-- name: guides_ratio_overflow_reached
INSERT INTO guide_matches (id,guide_id,label,first_axis,second_axis,recorded_same,prefer_first,expected_wire,skip_comparison)
VALUES (2,1,'Ratio overflow','{1e308,1e308,1e308}','{1e-5,1e-5,1e308}',true,true,'\x7fe1ccf385ebc8a07fe1ccf385ebc8a07fe1ccf385ebc8a0',false);
-- name: guides_ratio_overflow_skipped
INSERT INTO guide_matches (id,guide_id,label,first_axis,second_axis,recorded_same,prefer_first,expected_wire,skip_comparison)
VALUES (2,1,'Skip ratio overflow','{1e308,1e308,1e308}','{1e-5,1e-5,1e308}',true,true,'\x7fe1ccf385ebc8a07fe1ccf385ebc8a07fe1ccf385ebc8a0',true);
