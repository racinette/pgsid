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
-- name: import_coefficients
INSERT INTO guide_imports (id,guide_id,label,source_text,recorded_equation,recorded_wire,was_imported,skip_validation) VALUES (100,1,'Coefficients','{1,-1,0}','{1,-1,0}','\x3ff0000000000000bff00000000000000000000000000000',true,false);
-- name: import_point_pair
INSERT INTO guide_imports (id,guide_id,label,source_text,recorded_equation,recorded_wire,was_imported,skip_validation) VALUES (100,1,'Point pair','[(0,0),(1,1)]','{1,-1,0}','\x3ff0000000000000bff00000000000000000000000000000',true,false);
-- name: import_mixed_closing_delimiter
INSERT INTO guide_imports (id,guide_id,label,source_text,recorded_equation,recorded_wire,was_imported,skip_validation) VALUES (100,1,'Mixed closing delimiter','[(0,0),(1,1))','{1,-1,0}','\x3ff0000000000000bff00000000000000000000000000000',true,false);
-- name: import_bare_coordinates
INSERT INTO guide_imports (id,guide_id,label,source_text,recorded_equation,recorded_wire,was_imported,skip_validation) VALUES (100,1,'Bare coordinates','0,0 1,1','{1,-1,0}','\x3ff0000000000000bff00000000000000000000000000000',true,false);
-- name: import_negative_zero
INSERT INTO guide_imports (id,guide_id,label,source_text,recorded_equation,recorded_wire,was_imported,skip_validation) VALUES (100,1,'Negative zero coefficient','{1,-1,-0}','{1,-1,-0}','\x3ff0000000000000bff00000000000008000000000000000',true,false);
-- name: import_nan_coefficients
INSERT INTO guide_imports (id,guide_id,label,source_text,recorded_equation,recorded_wire,was_imported,skip_validation) VALUES (100,1,'NaN coefficients','{NaN,-1,NaN}','{NaN,-1,NaN}','\x7ff8000000000000bff00000000000007ff8000000000000',true,false);
-- name: import_missing_source
INSERT INTO guide_imports (id,guide_id,label,source_text,recorded_equation,recorded_wire,was_imported,skip_validation) VALUES (100,1,'Missing source',NULL,NULL,NULL,false,false);
-- name: import_nullable_reports
INSERT INTO guide_imports (id,guide_id,label,source_text,recorded_equation,recorded_wire,was_imported,skip_validation) VALUES (100,1,'Nullable reports','{1,-1,0}',NULL,NULL,NULL,false);
-- name: import_wrong_equation
INSERT INTO guide_imports (id,guide_id,label,source_text,recorded_equation,recorded_wire,was_imported,skip_validation) VALUES (100,1,'Wrong equation','{1,-1,0}','{1,-1,2}','\x3ff0000000000000bff00000000000000000000000000000',true,false);
-- name: import_wrong_binary
INSERT INTO guide_imports (id,guide_id,label,source_text,recorded_equation,recorded_wire,was_imported,skip_validation) VALUES (100,1,'Wrong binary report','{1,-1,0}','{1,-1,0}','\x00',true,false);
-- name: import_wrong_presence
INSERT INTO guide_imports (id,guide_id,label,source_text,recorded_equation,recorded_wire,was_imported,skip_validation) VALUES (100,1,'Wrong presence report','{1,-1,0}','{1,-1,0}','\x3ff0000000000000bff00000000000000000000000000000',false,false);
-- name: import_degenerate_coefficients
INSERT INTO guide_imports (id,guide_id,label,source_text,recorded_equation,recorded_wire,was_imported,skip_validation) VALUES (100,1,'Degenerate coefficients','{0,0,1}',NULL,NULL,false,false);
-- name: import_overflow_before_syntax
INSERT INTO guide_imports (id,guide_id,label,source_text,recorded_equation,recorded_wire,was_imported,skip_validation) VALUES (100,1,'Overflow before syntax','{1e400,junk,0}',NULL,NULL,false,false);
-- name: import_skips_invalid_source
INSERT INTO guide_imports (id,guide_id,label,source_text,recorded_equation,recorded_wire,was_imported,skip_validation) VALUES (100,1,'Skipped invalid source','{bad,0,0}','{1,-1,0}','\x00',false,true);
-- name: import_nonreflexive_infinity
INSERT INTO guide_imports (id,guide_id,label,source_text,recorded_equation,recorded_wire,was_imported,skip_validation) VALUES (100,1,'Nonreflexive infinity','{Infinity,-Infinity,0}','{Infinity,-Infinity,0}','\x7ff0000000000000fff00000000000000000000000000000',true,false);
-- name: construct_diagonal
INSERT INTO guide_constructions (id,guide_id,label,first_position,second_position,recorded_equation,recorded_horizontal,recorded_vertical,skip_validation) VALUES (100,1,'Diagonal','(0,0)','(1,1)','{1,-1,0}',false,false,false);
-- name: construct_horizontal
INSERT INTO guide_constructions (id,guide_id,label,first_position,second_position,recorded_equation,recorded_horizontal,recorded_vertical,skip_validation) VALUES (100,1,'Horizontal','(1,2)','(3,2)','{0,-1,2}',true,false,false);
-- name: construct_vertical
INSERT INTO guide_constructions (id,guide_id,label,first_position,second_position,recorded_equation,recorded_horizontal,recorded_vertical,skip_validation) VALUES (100,1,'Vertical','(1,2)','(1,4)','{-1,0,1}',false,true,false);
-- name: construct_computed_nan
INSERT INTO guide_constructions (id,guide_id,label,first_position,second_position,recorded_equation,recorded_horizontal,recorded_vertical,skip_validation) VALUES (100,1,'Computed NaN equation','(Infinity,Infinity)','(0,0)','{NaN,-1,NaN}',false,false,false);
-- name: construct_ignored_nan_x
INSERT INTO guide_constructions (id,guide_id,label,first_position,second_position,recorded_equation,recorded_horizontal,recorded_vertical,skip_validation) VALUES (100,1,'Ignored NaN x','(NaN,0)','(1,0)','{0,-1,0}',true,false,false);
-- name: construct_ignored_nan_y
INSERT INTO guide_constructions (id,guide_id,label,first_position,second_position,recorded_equation,recorded_horizontal,recorded_vertical,skip_validation) VALUES (100,1,'Ignored NaN y','(0,NaN)','(0,1)','{-1,0,0}',false,true,false);
-- name: construct_missing_point
INSERT INTO guide_constructions (id,guide_id,label,first_position,second_position,recorded_equation,recorded_horizontal,recorded_vertical,skip_validation) VALUES (100,1,'Missing point',NULL,'(0,0)',NULL,NULL,NULL,false);
-- name: construct_nullable_reports
INSERT INTO guide_constructions (id,guide_id,label,first_position,second_position,recorded_equation,recorded_horizontal,recorded_vertical,skip_validation) VALUES (100,1,'Nullable reports','(0,0)','(1,1)',NULL,NULL,NULL,false);
-- name: construct_wrong_equation
INSERT INTO guide_constructions (id,guide_id,label,first_position,second_position,recorded_equation,recorded_horizontal,recorded_vertical,skip_validation) VALUES (100,1,'Wrong equation','(0,0)','(1,1)','{1,-1,2}',false,false,false);
-- name: construct_wrong_horizontal
INSERT INTO guide_constructions (id,guide_id,label,first_position,second_position,recorded_equation,recorded_horizontal,recorded_vertical,skip_validation) VALUES (100,1,'Wrong horizontal report','(0,0)','(1,1)','{1,-1,0}',true,false,false);
-- name: construct_wrong_vertical
INSERT INTO guide_constructions (id,guide_id,label,first_position,second_position,recorded_equation,recorded_horizontal,recorded_vertical,skip_validation) VALUES (100,1,'Wrong vertical report','(0,0)','(1,1)','{1,-1,0}',false,true,false);
-- name: construct_coincident_points
INSERT INTO guide_constructions (id,guide_id,label,first_position,second_position,recorded_equation,recorded_horizontal,recorded_vertical,skip_validation) VALUES (100,1,'Coincident points','(0,0)','(0,0)',NULL,NULL,NULL,false);
-- name: construct_near_coincident_points
INSERT INTO guide_constructions (id,guide_id,label,first_position,second_position,recorded_equation,recorded_horizontal,recorded_vertical,skip_validation) VALUES (100,1,'Near coincident points','(0,0)','(0.0000005,0.0000005)',NULL,NULL,NULL,false);
-- name: construct_reached_overflow
INSERT INTO guide_constructions (id,guide_id,label,first_position,second_position,recorded_equation,recorded_horizontal,recorded_vertical,skip_validation) VALUES (100,1,'Reached overflow','(1e308,0)','(-1e308,1)',NULL,NULL,NULL,false);
-- name: construct_skips_overflow
INSERT INTO guide_constructions (id,guide_id,label,first_position,second_position,recorded_equation,recorded_horizontal,recorded_vertical,skip_validation) VALUES (100,1,'Skipped overflow','(1e308,0)','(-1e308,1)','{1,-1,1}',true,true,true);
-- name: relation_crossing_axes
INSERT INTO guide_relations (id,guide_id,label,first_axis,second_axis,recorded_parallel,recorded_perpendicular,recorded_crossing,recorded_point,recorded_distance,skip_validation) VALUES (100,1,'Crossing axes','{0,-1,0}','{-1,0,0}',false,true,true,'(0,0)','\x0000000000000000',false);
-- name: relation_parallel_axes
INSERT INTO guide_relations (id,guide_id,label,first_axis,second_axis,recorded_parallel,recorded_perpendicular,recorded_crossing,recorded_point,recorded_distance,skip_validation) VALUES (100,1,'Parallel axes','{0,-1,0}','{0,-1,2}',true,false,false,NULL,'\x4000000000000000',false);
-- name: relation_scaled_parallel_axes
INSERT INTO guide_relations (id,guide_id,label,first_axis,second_axis,recorded_parallel,recorded_perpendicular,recorded_crossing,recorded_point,recorded_distance,skip_validation) VALUES (100,1,'Scaled parallel axes','{0,-2,0}','{0,1,-2}',true,false,false,NULL,'\x4000000000000000',false);
-- name: relation_identical_axes
INSERT INTO guide_relations (id,guide_id,label,first_axis,second_axis,recorded_parallel,recorded_perpendicular,recorded_crossing,recorded_point,recorded_distance,skip_validation) VALUES (100,1,'Identical axes','{1,-1,0}','{2,-2,0}',true,false,false,NULL,'\x0000000000000000',false);
-- name: relation_diagonal_crossing
INSERT INTO guide_relations (id,guide_id,label,first_axis,second_axis,recorded_parallel,recorded_perpendicular,recorded_crossing,recorded_point,recorded_distance,skip_validation) VALUES (100,1,'Diagonal crossing','{1,-1,0}','{1,1,-4}',false,true,true,'(2,2)','\x0000000000000000',false);
-- name: relation_nan_coefficients
INSERT INTO guide_relations (id,guide_id,label,first_axis,second_axis,recorded_parallel,recorded_perpendicular,recorded_crossing,recorded_point,recorded_distance,skip_validation) VALUES (100,1,'NaN coefficients','{NaN,-1,NaN}','{1,-1,0}',false,false,true,'(NaN,NaN)','\x0000000000000000',false);
-- name: relation_infinite_coefficients
INSERT INTO guide_relations (id,guide_id,label,first_axis,second_axis,recorded_parallel,recorded_perpendicular,recorded_crossing,recorded_point,recorded_distance,skip_validation) VALUES (100,1,'Infinite coefficients','{Infinity,-Infinity,0}','{1,-1,0}',false,false,true,'(NaN,NaN)','\x0000000000000000',false);
-- name: relation_missing_axis
INSERT INTO guide_relations (id,guide_id,label,first_axis,second_axis,recorded_parallel,recorded_perpendicular,recorded_crossing,recorded_point,recorded_distance,skip_validation) VALUES (100,1,'Missing axis',NULL,'{1,-1,0}',NULL,NULL,NULL,NULL,NULL,false);
-- name: relation_nullable_reports
INSERT INTO guide_relations (id,guide_id,label,first_axis,second_axis,recorded_parallel,recorded_perpendicular,recorded_crossing,recorded_point,recorded_distance,skip_validation) VALUES (100,1,'Nullable reports','{0,-1,0}','{-1,0,0}',NULL,NULL,NULL,NULL,NULL,false);
-- name: relation_wrong_parallel
INSERT INTO guide_relations (id,guide_id,label,first_axis,second_axis,recorded_parallel,recorded_perpendicular,recorded_crossing,recorded_point,recorded_distance,skip_validation) VALUES (100,1,'Wrong parallel report','{0,-1,0}','{-1,0,0}',true,true,true,'(0,0)','\x0000000000000000',false);
-- name: relation_wrong_perpendicular
INSERT INTO guide_relations (id,guide_id,label,first_axis,second_axis,recorded_parallel,recorded_perpendicular,recorded_crossing,recorded_point,recorded_distance,skip_validation) VALUES (100,1,'Wrong perpendicular report','{0,-1,0}','{-1,0,0}',false,false,true,'(0,0)','\x0000000000000000',false);
-- name: relation_wrong_crossing
INSERT INTO guide_relations (id,guide_id,label,first_axis,second_axis,recorded_parallel,recorded_perpendicular,recorded_crossing,recorded_point,recorded_distance,skip_validation) VALUES (100,1,'Wrong crossing report','{0,-1,0}','{-1,0,0}',false,true,false,'(0,0)','\x0000000000000000',false);
-- name: relation_wrong_point
INSERT INTO guide_relations (id,guide_id,label,first_axis,second_axis,recorded_parallel,recorded_perpendicular,recorded_crossing,recorded_point,recorded_distance,skip_validation) VALUES (100,1,'Wrong crossing point','{0,-1,0}','{-1,0,0}',false,true,true,'(1,1)','\x0000000000000000',false);
-- name: relation_wrong_distance
INSERT INTO guide_relations (id,guide_id,label,first_axis,second_axis,recorded_parallel,recorded_perpendicular,recorded_crossing,recorded_point,recorded_distance,skip_validation) VALUES (100,1,'Wrong distance report','{0,-1,0}','{-1,0,0}',false,true,true,'(0,0)','\x00',false);
-- name: relation_intersection_overflow
INSERT INTO guide_relations (id,guide_id,label,first_axis,second_axis,recorded_parallel,recorded_perpendicular,recorded_crossing,recorded_point,recorded_distance,skip_validation) VALUES (100,1,'Intersection overflow','{1e308,1,1e308}','{1,1e308,0}',NULL,NULL,NULL,NULL,NULL,false);
-- name: relation_skips_overflow
INSERT INTO guide_relations (id,guide_id,label,first_axis,second_axis,recorded_parallel,recorded_perpendicular,recorded_crossing,recorded_point,recorded_distance,skip_validation) VALUES (100,1,'Skipped intersection overflow','{1e308,1,1e308}','{1,1e308,0}',false,false,false,'(0,0)','\x00',true);
-- name: relation_parallel_tolerance
INSERT INTO guide_relations (id,guide_id,label,first_axis,second_axis,recorded_parallel,recorded_perpendicular,recorded_crossing,recorded_point,recorded_distance,skip_validation) VALUES (100,1,'Parallel tolerance','{1,-1,0}','{1.0000005,-1,2}',true,false,false,NULL,'\x3ff6a09da8af3ff8',false);
-- name: relation_perpendicular_overflow
INSERT INTO guide_relations (id,guide_id,label,first_axis,second_axis,recorded_parallel,recorded_perpendicular,recorded_crossing,recorded_point,recorded_distance,skip_validation) VALUES (100,1,'Perpendicular overflow','{1e308,1,0}','{1e308,1,0}',true,NULL,false,NULL,'\x0000000000000000',false);
-- name: projection_horizontal
INSERT INTO guide_projections (id,guide_id,label,position,axis,recorded_on_axis,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'Horizontal projection','(3,4)','{0,-1,0}',false,'(3,0)','\x4010000000000000',false);
-- name: projection_vertical
INSERT INTO guide_projections (id,guide_id,label,position,axis,recorded_on_axis,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'Vertical projection','(3,4)','{-1,0,0}',false,'(0,4)','\x4008000000000000',false);
-- name: projection_diagonal
INSERT INTO guide_projections (id,guide_id,label,position,axis,recorded_on_axis,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'Diagonal projection','(2,0)','{1,-1,0}',false,'(1,1)','\x3ff6a09e667f3bcd',false);
-- name: projection_on_axis
INSERT INTO guide_projections (id,guide_id,label,position,axis,recorded_on_axis,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'Point on axis','(1,1)','{1,-1,0}',true,'(1,1)','\x0000000000000000',false);
-- name: projection_signed_zero
INSERT INTO guide_projections (id,guide_id,label,position,axis,recorded_on_axis,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'Signed zero projection','(-0,-0)','{0,-1,0}',true,'(0,0)','\x0000000000000000',false);
-- name: projection_nan_point
INSERT INTO guide_projections (id,guide_id,label,position,axis,recorded_on_axis,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'NaN point','(NaN,1)','{0,-1,0}',false,NULL,'\x7ff8000000000000',false);
-- name: projection_nan_axis
INSERT INTO guide_projections (id,guide_id,label,position,axis,recorded_on_axis,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'NaN axis','(0,0)','{NaN,-1,NaN}',false,NULL,'\x7ff8000000000000',false);
-- name: projection_infinite_point
INSERT INTO guide_projections (id,guide_id,label,position,axis,recorded_on_axis,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'Infinite point','(Infinity,0)','{0,-1,0}',false,NULL,'\x7ff8000000000000',false);
-- name: projection_missing_point
INSERT INTO guide_projections (id,guide_id,label,position,axis,recorded_on_axis,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'Missing point',NULL,'{0,-1,0}',NULL,NULL,NULL,false);
-- name: projection_nullable_reports
INSERT INTO guide_projections (id,guide_id,label,position,axis,recorded_on_axis,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'Nullable reports','(3,4)','{0,-1,0}',NULL,NULL,NULL,false);
-- name: projection_wrong_presence
INSERT INTO guide_projections (id,guide_id,label,position,axis,recorded_on_axis,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'Wrong on-axis report','(3,4)','{0,-1,0}',true,'(3,0)','\x4010000000000000',false);
-- name: projection_wrong_closest
INSERT INTO guide_projections (id,guide_id,label,position,axis,recorded_on_axis,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'Wrong closest point','(3,4)','{0,-1,0}',false,'(99,99)','\x4010000000000000',false);
-- name: projection_wrong_distance
INSERT INTO guide_projections (id,guide_id,label,position,axis,recorded_on_axis,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'Wrong distance report','(3,4)','{0,-1,0}',false,'(3,0)','\x00',false);
-- name: projection_reached_overflow
INSERT INTO guide_projections (id,guide_id,label,position,axis,recorded_on_axis,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'Reached projection overflow','(1e308,1e308)','{1e308,1,1e308}',NULL,NULL,NULL,false);
-- name: projection_skips_overflow
INSERT INTO guide_projections (id,guide_id,label,position,axis,recorded_on_axis,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'Skipped projection overflow','(1e308,1e308)','{1e308,1,1e308}',true,'(99,99)','\x00',true);
-- name: projection_missing_axis
INSERT INTO guide_projections (id,guide_id,label,position,axis,recorded_on_axis,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'Missing projection axis','(3,4)',NULL,NULL,NULL,NULL,false);

-- name: segment_import_ordinary
INSERT INTO guide_segment_imports (id,guide_id,label,source_text,recorded_wire,recorded_length,recorded_center,recorded_horizontal,recorded_vertical,recorded_present,skip_validation) VALUES (100,1,'segment_import_ordinary','[(0,0),(3,4)]','\x0000000000000000000000000000000040080000000000004010000000000000',5,'(1.5,2)',false,false,true,false);
-- name: segment_import_reverse
INSERT INTO guide_segment_imports (id,guide_id,label,source_text,recorded_wire,recorded_length,recorded_center,recorded_horizontal,recorded_vertical,recorded_present,skip_validation) VALUES (100,1,'segment_import_reverse','[(3,4),(0,0)]','\x4008000000000000401000000000000000000000000000000000000000000000',5,'(1.5,2)',false,false,true,false);
-- name: segment_import_coincident
INSERT INTO guide_segment_imports (id,guide_id,label,source_text,recorded_wire,recorded_length,recorded_center,recorded_horizontal,recorded_vertical,recorded_present,skip_validation) VALUES (100,1,'segment_import_coincident','[(0,0),(0,0)]','\x0000000000000000000000000000000000000000000000000000000000000000',0,'(0,0)',true,true,true,false);
-- name: segment_import_unwrapped
INSERT INTO guide_segment_imports (id,guide_id,label,source_text,recorded_wire,recorded_length,recorded_center,recorded_horizontal,recorded_vertical,recorded_present,skip_validation) VALUES (100,1,'segment_import_unwrapped','0,0,3,4','\x0000000000000000000000000000000040080000000000004010000000000000',5,'(1.5,2)',false,false,true,false);
-- name: segment_import_horizontal
INSERT INTO guide_segment_imports (id,guide_id,label,source_text,recorded_wire,recorded_length,recorded_center,recorded_horizontal,recorded_vertical,recorded_present,skip_validation) VALUES (100,1,'segment_import_horizontal','[(0,0),(3,0)]','\x0000000000000000000000000000000040080000000000000000000000000000',3,'(1.5,0)',true,false,true,false);
-- name: segment_import_vertical
INSERT INTO guide_segment_imports (id,guide_id,label,source_text,recorded_wire,recorded_length,recorded_center,recorded_horizontal,recorded_vertical,recorded_present,skip_validation) VALUES (100,1,'segment_import_vertical','[(0,0),(0,4)]','\x0000000000000000000000000000000000000000000000004010000000000000',4,'(0,2)',false,true,true,false);
-- name: segment_import_nan
INSERT INTO guide_segment_imports (id,guide_id,label,source_text,recorded_wire,recorded_length,recorded_center,recorded_horizontal,recorded_vertical,recorded_present,skip_validation) VALUES (100,1,'segment_import_nan','[(NaN,1),(0,0)]',NULL,'NaN','(NaN,0.5)',false,false,true,false);
-- name: segment_import_missing
INSERT INTO guide_segment_imports (id,guide_id,label,source_text,recorded_wire,recorded_length,recorded_center,recorded_horizontal,recorded_vertical,recorded_present,skip_validation) VALUES (100,1,'segment_import_missing',NULL,NULL,NULL,NULL,NULL,NULL,NULL,false);
-- name: segment_import_nullable
INSERT INTO guide_segment_imports (id,guide_id,label,source_text,recorded_wire,recorded_length,recorded_center,recorded_horizontal,recorded_vertical,recorded_present,skip_validation) VALUES (100,1,'segment_import_nullable','[(0,0),(3,4)]',NULL,NULL,NULL,NULL,NULL,NULL,false);
-- name: segment_import_invalid
INSERT INTO guide_segment_imports (id,guide_id,label,source_text,recorded_wire,recorded_length,recorded_center,recorded_horizontal,recorded_vertical,recorded_present,skip_validation) VALUES (100,1,'segment_import_invalid','[(bad,0),(0,0)]',NULL,NULL,NULL,NULL,NULL,NULL,false);
-- name: segment_import_midpoint_overflow
INSERT INTO guide_segment_imports (id,guide_id,label,source_text,recorded_wire,recorded_length,recorded_center,recorded_horizontal,recorded_vertical,recorded_present,skip_validation) VALUES (100,1,'segment_import_midpoint_overflow','[(1e308,0),(1e308,0)]',NULL,NULL,NULL,NULL,NULL,NULL,false);
-- name: segment_import_length_overflow
INSERT INTO guide_segment_imports (id,guide_id,label,source_text,recorded_wire,recorded_length,recorded_center,recorded_horizontal,recorded_vertical,recorded_present,skip_validation) VALUES (100,1,'segment_import_length_overflow','[(1e308,0),(-1e308,0)]',NULL,NULL,NULL,NULL,NULL,NULL,false);
-- name: segment_import_skipped
INSERT INTO guide_segment_imports (id,guide_id,label,source_text,recorded_wire,recorded_length,recorded_center,recorded_horizontal,recorded_vertical,recorded_present,skip_validation) VALUES (100,1,'segment_import_skipped','[(bad,0),(0,0)]',NULL,NULL,NULL,NULL,NULL,NULL,true);
-- name: segment_import_wrong_wire
INSERT INTO guide_segment_imports (id,guide_id,label,source_text,recorded_wire,recorded_length,recorded_center,recorded_horizontal,recorded_vertical,recorded_present,skip_validation) VALUES (100,1,'segment_import_wrong_wire','[(0,0),(3,4)]','\x00',5,'(1.5,2)',false,false,true,false);
-- name: segment_import_wrong_length
INSERT INTO guide_segment_imports (id,guide_id,label,source_text,recorded_wire,recorded_length,recorded_center,recorded_horizontal,recorded_vertical,recorded_present,skip_validation) VALUES (100,1,'segment_import_wrong_length','[(0,0),(3,4)]','\x0000000000000000000000000000000040080000000000004010000000000000',6,'(1.5,2)',false,false,true,false);
-- name: segment_import_wrong_center
INSERT INTO guide_segment_imports (id,guide_id,label,source_text,recorded_wire,recorded_length,recorded_center,recorded_horizontal,recorded_vertical,recorded_present,skip_validation) VALUES (100,1,'segment_import_wrong_center','[(0,0),(3,4)]','\x0000000000000000000000000000000040080000000000004010000000000000',5,'(99,99)',false,false,true,false);
-- name: segment_import_wrong_horizontal
INSERT INTO guide_segment_imports (id,guide_id,label,source_text,recorded_wire,recorded_length,recorded_center,recorded_horizontal,recorded_vertical,recorded_present,skip_validation) VALUES (100,1,'segment_import_wrong_horizontal','[(0,0),(3,4)]','\x0000000000000000000000000000000040080000000000004010000000000000',5,'(1.5,2)',true,false,true,false);
-- name: segment_import_wrong_vertical
INSERT INTO guide_segment_imports (id,guide_id,label,source_text,recorded_wire,recorded_length,recorded_center,recorded_horizontal,recorded_vertical,recorded_present,skip_validation) VALUES (100,1,'segment_import_wrong_vertical','[(0,0),(3,4)]','\x0000000000000000000000000000000040080000000000004010000000000000',5,'(1.5,2)',false,true,true,false);
-- name: segment_import_wrong_present
INSERT INTO guide_segment_imports (id,guide_id,label,source_text,recorded_wire,recorded_length,recorded_center,recorded_horizontal,recorded_vertical,recorded_present,skip_validation) VALUES (100,1,'segment_import_wrong_present','[(0,0),(3,4)]','\x0000000000000000000000000000000040080000000000004010000000000000',5,'(1.5,2)',false,false,false,false);
-- name: segment_relation_identical
INSERT INTO guide_segment_relations (id,guide_id,label,first_text,second_text,recorded_same,recorded_less,recorded_le,recorded_greater,recorded_ge,recorded_parallel,recorded_perpendicular,prefer_first,recorded_wire,skip_validation) VALUES (100,1,'segment_relation_identical','[(0,0),(3,4)]','[(0,0),(3,4)]',true,false,true,false,true,true,false,true,'\x0000000000000000000000000000000040080000000000004010000000000000',false);
-- name: segment_relation_reversed
INSERT INTO guide_segment_relations (id,guide_id,label,first_text,second_text,recorded_same,recorded_less,recorded_le,recorded_greater,recorded_ge,recorded_parallel,recorded_perpendicular,prefer_first,recorded_wire,skip_validation) VALUES (100,1,'segment_relation_reversed','[(0,0),(3,4)]','[(3,4),(0,0)]',false,false,true,false,true,true,false,false,'\x4008000000000000401000000000000000000000000000000000000000000000',false);
-- name: segment_relation_perpendicular
INSERT INTO guide_segment_relations (id,guide_id,label,first_text,second_text,recorded_same,recorded_less,recorded_le,recorded_greater,recorded_ge,recorded_parallel,recorded_perpendicular,prefer_first,recorded_wire,skip_validation) VALUES (100,1,'segment_relation_perpendicular','[(0,0),(3,0)]','[(0,0),(0,4)]',false,true,true,false,false,false,true,true,'\x0000000000000000000000000000000040080000000000000000000000000000',false);
-- name: segment_relation_zero
INSERT INTO guide_segment_relations (id,guide_id,label,first_text,second_text,recorded_same,recorded_less,recorded_le,recorded_greater,recorded_ge,recorded_parallel,recorded_perpendicular,prefer_first,recorded_wire,skip_validation) VALUES (100,1,'segment_relation_zero','[(0,0),(0,0)]','[(0,0),(0,0)]',true,false,true,false,true,true,false,true,'\x0000000000000000000000000000000000000000000000000000000000000000',false);
-- name: segment_relation_nan
INSERT INTO guide_segment_relations (id,guide_id,label,first_text,second_text,recorded_same,recorded_less,recorded_le,recorded_greater,recorded_ge,recorded_parallel,recorded_perpendicular,prefer_first,recorded_wire,skip_validation) VALUES (100,1,'segment_relation_nan','[(NaN,1),(0,0)]','[(0,0),(3,4)]',false,false,false,false,false,false,false,false,'\x0000000000000000000000000000000040080000000000004010000000000000',false);
-- name: segment_relation_missing
INSERT INTO guide_segment_relations (id,guide_id,label,first_text,second_text,recorded_same,recorded_less,recorded_le,recorded_greater,recorded_ge,recorded_parallel,recorded_perpendicular,prefer_first,recorded_wire,skip_validation) VALUES (100,1,'segment_relation_missing',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,true,NULL,false);
-- name: segment_relation_nullable
INSERT INTO guide_segment_relations (id,guide_id,label,first_text,second_text,recorded_same,recorded_less,recorded_le,recorded_greater,recorded_ge,recorded_parallel,recorded_perpendicular,prefer_first,recorded_wire,skip_validation) VALUES (100,1,'segment_relation_nullable','[(0,0),(3,4)]','[(0,0),(3,4)]',NULL,NULL,NULL,NULL,NULL,NULL,NULL,true,NULL,false);
-- name: segment_relation_invalid
INSERT INTO guide_segment_relations (id,guide_id,label,first_text,second_text,recorded_same,recorded_less,recorded_le,recorded_greater,recorded_ge,recorded_parallel,recorded_perpendicular,prefer_first,recorded_wire,skip_validation) VALUES (100,1,'segment_relation_invalid','bad','[(0,0),(3,4)]',NULL,NULL,NULL,NULL,NULL,NULL,NULL,true,NULL,false);
-- name: segment_relation_overflow
INSERT INTO guide_segment_relations (id,guide_id,label,first_text,second_text,recorded_same,recorded_less,recorded_le,recorded_greater,recorded_ge,recorded_parallel,recorded_perpendicular,prefer_first,recorded_wire,skip_validation) VALUES (100,1,'segment_relation_overflow','[(1e308,0),(-1e308,0)]','[(0,0),(3,4)]',NULL,NULL,NULL,NULL,NULL,NULL,NULL,true,NULL,false);
-- name: segment_relation_skipped
INSERT INTO guide_segment_relations (id,guide_id,label,first_text,second_text,recorded_same,recorded_less,recorded_le,recorded_greater,recorded_ge,recorded_parallel,recorded_perpendicular,prefer_first,recorded_wire,skip_validation) VALUES (100,1,'segment_relation_skipped','bad','bad',true,true,true,true,true,true,true,true,'\x00',true);
-- name: segment_relation_wrong_same
INSERT INTO guide_segment_relations (id,guide_id,label,first_text,second_text,recorded_same,recorded_less,recorded_le,recorded_greater,recorded_ge,recorded_parallel,recorded_perpendicular,prefer_first,recorded_wire,skip_validation) VALUES (100,1,'segment_relation_wrong_same','[(0,0),(3,4)]','[(0,0),(3,4)]',false,false,true,false,true,true,false,true,'\x0000000000000000000000000000000040080000000000004010000000000000',false);
-- name: segment_relation_wrong_length
INSERT INTO guide_segment_relations (id,guide_id,label,first_text,second_text,recorded_same,recorded_less,recorded_le,recorded_greater,recorded_ge,recorded_parallel,recorded_perpendicular,prefer_first,recorded_wire,skip_validation) VALUES (100,1,'segment_relation_wrong_length','[(0,0),(3,4)]','[(0,0),(3,4)]',true,true,true,false,true,true,false,true,'\x0000000000000000000000000000000040080000000000004010000000000000',false);
-- name: segment_relation_wrong_parallel
INSERT INTO guide_segment_relations (id,guide_id,label,first_text,second_text,recorded_same,recorded_less,recorded_le,recorded_greater,recorded_ge,recorded_parallel,recorded_perpendicular,prefer_first,recorded_wire,skip_validation) VALUES (100,1,'segment_relation_wrong_parallel','[(0,0),(3,4)]','[(0,0),(3,4)]',true,false,true,false,true,false,false,true,'\x0000000000000000000000000000000040080000000000004010000000000000',false);
-- name: segment_relation_wrong_perpendicular
INSERT INTO guide_segment_relations (id,guide_id,label,first_text,second_text,recorded_same,recorded_less,recorded_le,recorded_greater,recorded_ge,recorded_parallel,recorded_perpendicular,prefer_first,recorded_wire,skip_validation) VALUES (100,1,'segment_relation_wrong_perpendicular','[(0,0),(3,4)]','[(0,0),(3,4)]',true,false,true,false,true,true,true,true,'\x0000000000000000000000000000000040080000000000004010000000000000',false);
-- name: segment_relation_wrong_selected
INSERT INTO guide_segment_relations (id,guide_id,label,first_text,second_text,recorded_same,recorded_less,recorded_le,recorded_greater,recorded_ge,recorded_parallel,recorded_perpendicular,prefer_first,recorded_wire,skip_validation) VALUES (100,1,'segment_relation_wrong_selected','[(0,0),(3,4)]','[(0,0),(3,4)]',true,false,true,false,true,true,false,true,'\x00',false);
-- name: segment_construct_ordinary
INSERT INTO guide_segment_constructions (id,guide_id,label,first_text,second_text,recorded_segment,recorded_wire,skip_validation) VALUES (100,1,'segment_construct_ordinary','(0,0)','(3,4)','[(0,0),(3,4)]','\x0000000000000000000000000000000040080000000000004010000000000000',false);
-- name: segment_construct_coincident
INSERT INTO guide_segment_constructions (id,guide_id,label,first_text,second_text,recorded_segment,recorded_wire,skip_validation) VALUES (100,1,'segment_construct_coincident','(0,0)','(0,0)','[(0,0),(0,0)]','\x0000000000000000000000000000000000000000000000000000000000000000',false);
-- name: segment_construct_reverse
INSERT INTO guide_segment_constructions (id,guide_id,label,first_text,second_text,recorded_segment,recorded_wire,skip_validation) VALUES (100,1,'segment_construct_reverse','(3,4)','(0,0)','[(3,4),(0,0)]','\x4008000000000000401000000000000000000000000000000000000000000000',false);
-- name: segment_construct_missing
INSERT INTO guide_segment_constructions (id,guide_id,label,first_text,second_text,recorded_segment,recorded_wire,skip_validation) VALUES (100,1,'segment_construct_missing',NULL,'(3,4)',NULL,NULL,false);
-- name: segment_construct_nullable
INSERT INTO guide_segment_constructions (id,guide_id,label,first_text,second_text,recorded_segment,recorded_wire,skip_validation) VALUES (100,1,'segment_construct_nullable','(0,0)','(3,4)',NULL,NULL,false);
-- name: segment_construct_invalid
INSERT INTO guide_segment_constructions (id,guide_id,label,first_text,second_text,recorded_segment,recorded_wire,skip_validation) VALUES (100,1,'segment_construct_invalid','bad','(3,4)',NULL,NULL,false);
-- name: segment_construct_skipped
INSERT INTO guide_segment_constructions (id,guide_id,label,first_text,second_text,recorded_segment,recorded_wire,skip_validation) VALUES (100,1,'segment_construct_skipped','bad','bad',NULL,'\x00',true);
-- name: segment_construct_wrong_same
INSERT INTO guide_segment_constructions (id,guide_id,label,first_text,second_text,recorded_segment,recorded_wire,skip_validation) VALUES (100,1,'segment_construct_wrong_same','(0,0)','(3,4)','[(3,4),(0,0)]','\x0000000000000000000000000000000040080000000000004010000000000000',false);
-- name: segment_construct_wrong_wire
INSERT INTO guide_segment_constructions (id,guide_id,label,first_text,second_text,recorded_segment,recorded_wire,skip_validation) VALUES (100,1,'segment_construct_wrong_wire','(0,0)','(3,4)','[(0,0),(3,4)]','\x00',false);

-- name: segment_cross_interior
INSERT INTO guide_segment_crossings (id,guide_id,label,first_text,second_text,axis_text,recorded_crossing,recorded_point,recorded_distance,recorded_closest,recorded_line_crossing,recorded_on_line,recorded_line_distance,recorded_line_closest,skip_validation) VALUES (100,1,'segment_cross_interior','[(0,0),(4,0)]','[(2,-2),(2,2)]','{-1,0,2}',true,'(2,0)',0,'(2,0)',true,false,0,'(2,0)',false);
-- name: segment_cross_endpoints
INSERT INTO guide_segment_crossings (id,guide_id,label,first_text,second_text,axis_text,recorded_crossing,recorded_point,recorded_distance,recorded_closest,recorded_line_crossing,recorded_on_line,recorded_line_distance,recorded_line_closest,skip_validation) VALUES (100,1,'segment_cross_endpoints','[(0,0),(4,0)]','[(4,0),(4,2)]','{-1,0,4}',true,'(4,0)',0,'(4,0)',true,false,0,'(4,0)',false);
-- name: segment_cross_reversed
INSERT INTO guide_segment_crossings (id,guide_id,label,first_text,second_text,axis_text,recorded_crossing,recorded_point,recorded_distance,recorded_closest,recorded_line_crossing,recorded_on_line,recorded_line_distance,recorded_line_closest,skip_validation) VALUES (100,1,'segment_cross_reversed','[(4,0),(0,0)]','[(4,0),(4,2)]','{-1,0,4}',true,'(4,0)',0,'(4,0)',true,false,0,'(4,0)',false);
-- name: segment_cross_parallel
INSERT INTO guide_segment_crossings (id,guide_id,label,first_text,second_text,axis_text,recorded_crossing,recorded_point,recorded_distance,recorded_closest,recorded_line_crossing,recorded_on_line,recorded_line_distance,recorded_line_closest,skip_validation) VALUES (100,1,'segment_cross_parallel','[(0,0),(4,0)]','[(0,2),(4,2)]','{0,-1,2}',false,NULL,2,NULL,false,false,2,NULL,false);
-- name: segment_cross_collinear
INSERT INTO guide_segment_crossings (id,guide_id,label,first_text,second_text,axis_text,recorded_crossing,recorded_point,recorded_distance,recorded_closest,recorded_line_crossing,recorded_on_line,recorded_line_distance,recorded_line_closest,skip_validation) VALUES (100,1,'segment_cross_collinear','[(0,0),(4,0)]','[(2,0),(6,0)]','{0,-1,0}',false,NULL,0,NULL,false,true,0,NULL,false);
-- name: segment_cross_outside
INSERT INTO guide_segment_crossings (id,guide_id,label,first_text,second_text,axis_text,recorded_crossing,recorded_point,recorded_distance,recorded_closest,recorded_line_crossing,recorded_on_line,recorded_line_distance,recorded_line_closest,skip_validation) VALUES (100,1,'segment_cross_outside','[(0,0),(4,0)]','[(5,-2),(5,2)]','{-1,0,5}',false,NULL,1,'(5,0)',false,false,1,'(4,0)',false);
-- name: segment_cross_coincident
INSERT INTO guide_segment_crossings (id,guide_id,label,first_text,second_text,axis_text,recorded_crossing,recorded_point,recorded_distance,recorded_closest,recorded_line_crossing,recorded_on_line,recorded_line_distance,recorded_line_closest,skip_validation) VALUES (100,1,'segment_cross_coincident','[(0,0),(0,0)]','[(1,-1),(1,1)]','{-1,0,0}',false,NULL,1,NULL,false,true,0,NULL,false);
-- name: segment_cross_nan
INSERT INTO guide_segment_crossings (id,guide_id,label,first_text,second_text,axis_text,recorded_crossing,recorded_point,recorded_distance,recorded_closest,recorded_line_crossing,recorded_on_line,recorded_line_distance,recorded_line_closest,skip_validation) VALUES (100,1,'segment_cross_nan','[(NaN,0),(0,0)]','[(1,-1),(1,1)]','{-1,0,1}',false,NULL,NULL,NULL,false,false,NULL,NULL,false);
-- name: segment_cross_missing
INSERT INTO guide_segment_crossings (id,guide_id,label,first_text,second_text,axis_text,recorded_crossing,recorded_point,recorded_distance,recorded_closest,recorded_line_crossing,recorded_on_line,recorded_line_distance,recorded_line_closest,skip_validation) VALUES (100,1,'segment_cross_missing',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,false);
-- name: segment_cross_nullable
INSERT INTO guide_segment_crossings (id,guide_id,label,first_text,second_text,axis_text,recorded_crossing,recorded_point,recorded_distance,recorded_closest,recorded_line_crossing,recorded_on_line,recorded_line_distance,recorded_line_closest,skip_validation) VALUES (100,1,'segment_cross_nullable','[(0,0),(4,0)]','[(2,-2),(2,2)]','{-1,0,2}',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,false);
-- name: segment_cross_invalid
INSERT INTO guide_segment_crossings (id,guide_id,label,first_text,second_text,axis_text,recorded_crossing,recorded_point,recorded_distance,recorded_closest,recorded_line_crossing,recorded_on_line,recorded_line_distance,recorded_line_closest,skip_validation) VALUES (100,1,'segment_cross_invalid','bad','[(2,-2),(2,2)]','{-1,0,2}',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,false);
-- name: segment_cross_overflow
INSERT INTO guide_segment_crossings (id,guide_id,label,first_text,second_text,axis_text,recorded_crossing,recorded_point,recorded_distance,recorded_closest,recorded_line_crossing,recorded_on_line,recorded_line_distance,recorded_line_closest,skip_validation) VALUES (100,1,'segment_cross_overflow','[(1e308,0),(-1e308,1)]','[(0,0),(3,4)]','{0,-1,0}',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,false);
-- name: segment_cross_skipped
INSERT INTO guide_segment_crossings (id,guide_id,label,first_text,second_text,axis_text,recorded_crossing,recorded_point,recorded_distance,recorded_closest,recorded_line_crossing,recorded_on_line,recorded_line_distance,recorded_line_closest,skip_validation) VALUES (100,1,'segment_cross_skipped','bad','bad','bad',true,'(99,99)',1,'(99,99)',true,true,1,'(99,99)',true);
-- name: segment_cross_wrong_intersects
INSERT INTO guide_segment_crossings (id,guide_id,label,first_text,second_text,axis_text,recorded_crossing,recorded_point,recorded_distance,recorded_closest,recorded_line_crossing,recorded_on_line,recorded_line_distance,recorded_line_closest,skip_validation) VALUES (100,1,'segment_cross_wrong_intersects','[(0,0),(4,0)]','[(2,-2),(2,2)]','{-1,0,2}',false,'(2,0)',0,'(2,0)',true,false,0,'(2,0)',false);
-- name: segment_cross_wrong_point
INSERT INTO guide_segment_crossings (id,guide_id,label,first_text,second_text,axis_text,recorded_crossing,recorded_point,recorded_distance,recorded_closest,recorded_line_crossing,recorded_on_line,recorded_line_distance,recorded_line_closest,skip_validation) VALUES (100,1,'segment_cross_wrong_point','[(0,0),(4,0)]','[(2,-2),(2,2)]','{-1,0,2}',true,'(99,99)',0,'(2,0)',true,false,0,'(2,0)',false);
-- name: segment_cross_wrong_distance
INSERT INTO guide_segment_crossings (id,guide_id,label,first_text,second_text,axis_text,recorded_crossing,recorded_point,recorded_distance,recorded_closest,recorded_line_crossing,recorded_on_line,recorded_line_distance,recorded_line_closest,skip_validation) VALUES (100,1,'segment_cross_wrong_distance','[(0,0),(4,0)]','[(2,-2),(2,2)]','{-1,0,2}',true,'(2,0)',1,'(2,0)',true,false,0,'(2,0)',false);
-- name: segment_cross_wrong_closest
INSERT INTO guide_segment_crossings (id,guide_id,label,first_text,second_text,axis_text,recorded_crossing,recorded_point,recorded_distance,recorded_closest,recorded_line_crossing,recorded_on_line,recorded_line_distance,recorded_line_closest,skip_validation) VALUES (100,1,'segment_cross_wrong_closest','[(0,0),(4,0)]','[(2,-2),(2,2)]','{-1,0,2}',true,'(2,0)',0,'(99,99)',true,false,0,'(2,0)',false);
-- name: segment_cross_wrong_line_intersects
INSERT INTO guide_segment_crossings (id,guide_id,label,first_text,second_text,axis_text,recorded_crossing,recorded_point,recorded_distance,recorded_closest,recorded_line_crossing,recorded_on_line,recorded_line_distance,recorded_line_closest,skip_validation) VALUES (100,1,'segment_cross_wrong_line_intersects','[(0,0),(4,0)]','[(2,-2),(2,2)]','{-1,0,2}',true,'(2,0)',0,'(2,0)',false,false,0,'(2,0)',false);
-- name: segment_cross_wrong_on_line
INSERT INTO guide_segment_crossings (id,guide_id,label,first_text,second_text,axis_text,recorded_crossing,recorded_point,recorded_distance,recorded_closest,recorded_line_crossing,recorded_on_line,recorded_line_distance,recorded_line_closest,skip_validation) VALUES (100,1,'segment_cross_wrong_on_line','[(0,0),(4,0)]','[(2,-2),(2,2)]','{-1,0,2}',true,'(2,0)',0,'(2,0)',true,true,0,'(2,0)',false);
-- name: segment_cross_wrong_line_distance
INSERT INTO guide_segment_crossings (id,guide_id,label,first_text,second_text,axis_text,recorded_crossing,recorded_point,recorded_distance,recorded_closest,recorded_line_crossing,recorded_on_line,recorded_line_distance,recorded_line_closest,skip_validation) VALUES (100,1,'segment_cross_wrong_line_distance','[(0,0),(4,0)]','[(2,-2),(2,2)]','{-1,0,2}',true,'(2,0)',0,'(2,0)',true,false,1,'(2,0)',false);
-- name: segment_cross_wrong_line_closest
INSERT INTO guide_segment_crossings (id,guide_id,label,first_text,second_text,axis_text,recorded_crossing,recorded_point,recorded_distance,recorded_closest,recorded_line_crossing,recorded_on_line,recorded_line_distance,recorded_line_closest,skip_validation) VALUES (100,1,'segment_cross_wrong_line_closest','[(0,0),(4,0)]','[(2,-2),(2,2)]','{-1,0,2}',true,'(2,0)',0,'(2,0)',true,false,0,'(99,99)',false);
-- name: segment_project_interior
INSERT INTO guide_segment_projections (id,guide_id,label,point_text,segment_text,recorded_on_segment,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'segment_project_interior','(2,3)','[(0,0),(4,0)]',false,'(2,0)',3,false);
-- name: segment_project_endpoint
INSERT INTO guide_segment_projections (id,guide_id,label,point_text,segment_text,recorded_on_segment,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'segment_project_endpoint','(7,4)','[(0,0),(4,0)]',false,'(4,0)',5,false);
-- name: segment_project_reversed
INSERT INTO guide_segment_projections (id,guide_id,label,point_text,segment_text,recorded_on_segment,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'segment_project_reversed','(7,4)','[(4,0),(0,0)]',false,'(4,0)',5,false);
-- name: segment_project_contained
INSERT INTO guide_segment_projections (id,guide_id,label,point_text,segment_text,recorded_on_segment,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'segment_project_contained','(2,0)','[(0,0),(4,0)]',true,'(2,0)',0,false);
-- name: segment_project_coincident
INSERT INTO guide_segment_projections (id,guide_id,label,point_text,segment_text,recorded_on_segment,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'segment_project_coincident','(3,4)','[(0,0),(0,0)]',false,'(0,0)',5,false);
-- name: segment_project_tolerance
INSERT INTO guide_segment_projections (id,guide_id,label,point_text,segment_text,recorded_on_segment,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'segment_project_tolerance','(2,0.0000001)','[(0,0),(4,0)]',true,'(2,0)',1e-07,false);
-- name: segment_project_nan
INSERT INTO guide_segment_projections (id,guide_id,label,point_text,segment_text,recorded_on_segment,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'segment_project_nan','(NaN,1)','[(0,0),(4,0)]',false,NULL,'NaN',false);
-- name: segment_project_infinity
INSERT INTO guide_segment_projections (id,guide_id,label,point_text,segment_text,recorded_on_segment,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'segment_project_infinity','(Infinity,0)','[(0,0),(4,0)]',false,'(4,0)','Infinity',false);
-- name: segment_project_missing
INSERT INTO guide_segment_projections (id,guide_id,label,point_text,segment_text,recorded_on_segment,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'segment_project_missing',NULL,NULL,NULL,NULL,NULL,false);
-- name: segment_project_nullable
INSERT INTO guide_segment_projections (id,guide_id,label,point_text,segment_text,recorded_on_segment,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'segment_project_nullable','(2,3)','[(0,0),(4,0)]',NULL,NULL,NULL,false);
-- name: segment_project_invalid
INSERT INTO guide_segment_projections (id,guide_id,label,point_text,segment_text,recorded_on_segment,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'segment_project_invalid','bad','[(0,0),(4,0)]',NULL,NULL,NULL,false);
-- name: segment_project_overflow
INSERT INTO guide_segment_projections (id,guide_id,label,point_text,segment_text,recorded_on_segment,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'segment_project_overflow','(1e308,1e308)','[(-1e308,0),(1e308,1)]',NULL,NULL,NULL,false);
-- name: segment_project_skipped
INSERT INTO guide_segment_projections (id,guide_id,label,point_text,segment_text,recorded_on_segment,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'segment_project_skipped','bad','bad',true,'(99,99)',1,true);
-- name: segment_project_wrong_on
INSERT INTO guide_segment_projections (id,guide_id,label,point_text,segment_text,recorded_on_segment,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'segment_project_wrong_on','(2,3)','[(0,0),(4,0)]',true,'(2,0)',3,false);
-- name: segment_project_wrong_closest
INSERT INTO guide_segment_projections (id,guide_id,label,point_text,segment_text,recorded_on_segment,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'segment_project_wrong_closest','(2,3)','[(0,0),(4,0)]',false,'(99,99)',3,false);
-- name: segment_project_wrong_distance
INSERT INTO guide_segment_projections (id,guide_id,label,point_text,segment_text,recorded_on_segment,recorded_closest,recorded_distance,skip_validation) VALUES (100,1,'segment_project_wrong_distance','(2,3)','[(0,0),(4,0)]',false,'(2,0)',4,false);
