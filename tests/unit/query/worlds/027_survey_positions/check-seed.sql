-- name: location_recorded_position
INSERT INTO survey_locations (id,label,position,recorded_wire,was_measured)
VALUES (2,'north marker','(1,2)','\x3ff00000000000004000000000000000',true);
-- name: location_wrong_wire
INSERT INTO survey_locations (id,label,position,recorded_wire,was_measured)
VALUES (2,'north marker','(1,2)','\x40000000000000003ff0000000000000',true);
-- name: location_wrong_presence
INSERT INTO survey_locations (id,label,position,recorded_wire,was_measured)
VALUES (2,'unmeasured marker',NULL,NULL,true);
-- name: location_unmeasured
INSERT INTO survey_locations (id,label,position,recorded_wire,was_measured)
VALUES (2,'unmeasured marker',NULL,NULL,false);
-- name: location_signed_zero_bits
INSERT INTO survey_locations (id,label,position,recorded_wire,was_measured)
VALUES (2,'signed origin','(-0,0)','\x80000000000000000000000000000000',true);
-- name: location_nan_bits
INSERT INTO survey_locations (id,label,position,recorded_wire,was_measured)
VALUES (2,'unknown coordinate','(NaN,0)','\x7ff80000000000000000000000000000',true);

-- name: construction_coordinates
INSERT INTO coordinate_constructions (id,location_id,x,y,recorded_position,recorded_wire,skip_validation)
VALUES (2,1,1,2,'(1,2)','\x3ff00000000000004000000000000000',false);
-- name: construction_wrong_position
INSERT INTO coordinate_constructions (id,location_id,x,y,recorded_position,recorded_wire,skip_validation)
VALUES (2,1,1,2,'(2,1)','\x3ff00000000000004000000000000000',false);
-- name: construction_wrong_wire
INSERT INTO coordinate_constructions (id,location_id,x,y,recorded_position,recorded_wire,skip_validation)
VALUES (2,1,1,2,'(1,2)','\x40000000000000003ff0000000000000',false);
-- name: construction_signed_zero
INSERT INTO coordinate_constructions (id,location_id,x,y,recorded_position,recorded_wire,skip_validation)
VALUES (2,1,'-0','-0','(0,0)','\x80000000000000008000000000000000',false);
-- name: construction_infinite_coordinates
INSERT INTO coordinate_constructions (id,location_id,x,y,recorded_position,recorded_wire,skip_validation)
VALUES (2,1,'Infinity','-Infinity','(Infinity,-Infinity)','\x7ff0000000000000fff0000000000000',false);
-- name: construction_null_coordinate
INSERT INTO coordinate_constructions (id,location_id,x,y,recorded_position,recorded_wire,skip_validation)
VALUES (2,1,NULL,2,'(1,2)',NULL,false);
-- name: construction_lazy_wrong_position
INSERT INTO coordinate_constructions (id,location_id,x,y,recorded_position,recorded_wire,skip_validation)
VALUES (2,1,1,2,'(2,1)','\x00',true);

-- name: survey_equal_positions
INSERT INTO survey_matches (id,location_id,candidate_point,reference_point,recorded_match,choose_candidate,recorded_selection,recorded_coalesced,skip_validation)
VALUES (2,1,'(1,2)','(1,2)',true,true,'\x3ff00000000000004000000000000000','\x3ff00000000000004000000000000000',false);
-- name: survey_wrong_match
INSERT INTO survey_matches (id,location_id,candidate_point,reference_point,recorded_match,choose_candidate,recorded_selection,recorded_coalesced,skip_validation)
VALUES (2,1,'(1,2)','(1,2)',false,true,'\x3ff00000000000004000000000000000','\x3ff00000000000004000000000000000',false);
-- name: survey_wrong_selection
INSERT INTO survey_matches (id,location_id,candidate_point,reference_point,recorded_match,choose_candidate,recorded_selection,recorded_coalesced,skip_validation)
VALUES (2,1,'(1,2)','(1,2)',true,true,'\x00','\x3ff00000000000004000000000000000',false);
-- name: survey_wrong_coalesced
INSERT INTO survey_matches (id,location_id,candidate_point,reference_point,recorded_match,choose_candidate,recorded_selection,recorded_coalesced,skip_validation)
VALUES (2,1,'(1,2)','(1,2)',true,true,'\x3ff00000000000004000000000000000','\x00',false);
-- name: survey_close_positions
INSERT INTO survey_matches (id,location_id,candidate_point,reference_point,recorded_match,choose_candidate,recorded_selection,recorded_coalesced,skip_validation)
VALUES (2,1,'(0,0)','(0.0000005,-0.0000005)',true,true,'\x00000000000000000000000000000000','\x00000000000000000000000000000000',false);
-- name: survey_exact_tolerance_boundary
INSERT INTO survey_matches (id,location_id,candidate_point,reference_point,recorded_match,choose_candidate,recorded_selection,recorded_coalesced,skip_validation)
VALUES (2,1,'(0,0)','(0.000001,0)',true,true,'\x00000000000000000000000000000000','\x00000000000000000000000000000000',false);
-- name: survey_above_tolerance_boundary
INSERT INTO survey_matches (id,location_id,candidate_point,reference_point,recorded_match,choose_candidate,recorded_selection,recorded_coalesced,skip_validation)
VALUES (2,1,'(0,0)','(0.0000010000000002,0)',false,true,'\x00000000000000000000000000000000','\x00000000000000000000000000000000',false);
-- name: survey_nan_requires_exact_other_coordinate
INSERT INTO survey_matches (id,location_id,candidate_point,reference_point,recorded_match,choose_candidate,recorded_selection,recorded_coalesced,skip_validation)
VALUES (2,1,'(NaN,0)','(NaN,0.0000005)',false,true,'\x7ff80000000000000000000000000000','\x7ff80000000000000000000000000000',false);
-- name: survey_equal_nan_coordinates
INSERT INTO survey_matches (id,location_id,candidate_point,reference_point,recorded_match,choose_candidate,recorded_selection,recorded_coalesced,skip_validation)
VALUES (2,1,'(NaN,NaN)','(NaN,NaN)',true,true,'\x7ff80000000000007ff8000000000000','\x7ff80000000000007ff8000000000000',false);
-- name: survey_selects_reference
INSERT INTO survey_matches (id,location_id,candidate_point,reference_point,recorded_match,choose_candidate,recorded_selection,recorded_coalesced,skip_validation)
VALUES (2,1,'(1,2)','(0,0)',false,false,'\x00000000000000000000000000000000','\x3ff00000000000004000000000000000',false);
-- name: survey_coalesces_null_candidate
INSERT INTO survey_matches (id,location_id,candidate_point,reference_point,recorded_match,choose_candidate,recorded_selection,recorded_coalesced,skip_validation)
VALUES (2,1,NULL,'(1,2)',false,false,'\x3ff00000000000004000000000000000','\x3ff00000000000004000000000000000',false);
-- name: survey_missing_positions
INSERT INTO survey_matches (id,location_id,candidate_point,reference_point,recorded_match,choose_candidate,recorded_selection,recorded_coalesced,skip_validation)
VALUES (2,1,NULL,NULL,NULL,true,NULL,NULL,false);
-- name: survey_lazy_wrong_records
INSERT INTO survey_matches (id,location_id,candidate_point,reference_point,recorded_match,choose_candidate,recorded_selection,recorded_coalesced,skip_validation)
VALUES (2,1,'(1,2)','(1,2)',false,true,'\x00','\x00',true);

-- name: offset_matches_sum_and_difference
INSERT INTO survey_offsets (id,location_id,label,base_position,adjustment,recorded_sum,recorded_difference,skip_validation) VALUES (100,1,'recorded offset','(1,2)','(3,4)','(4,6)','(-2,-2)',false);
-- name: offset_wrong_sum
INSERT INTO survey_offsets (id,location_id,label,base_position,adjustment,recorded_sum,recorded_difference,skip_validation) VALUES (100,1,'wrong sum','(1,2)','(3,4)','(9,6)','(-2,-2)',false);
-- name: offset_wrong_difference
INSERT INTO survey_offsets (id,location_id,label,base_position,adjustment,recorded_sum,recorded_difference,skip_validation) VALUES (100,1,'wrong difference','(1,2)','(3,4)','(4,6)','(-9,-2)',false);
-- name: offset_missing_position
INSERT INTO survey_offsets (id,location_id,label,base_position,adjustment,recorded_sum,recorded_difference,skip_validation) VALUES (100,1,'missing position',NULL,'(3,4)',NULL,NULL,false);
-- name: offset_rejects_sum_overflow
INSERT INTO survey_offsets (id,location_id,label,base_position,adjustment,recorded_sum,recorded_difference,skip_validation) VALUES (100,1,'sum overflow','(1e308,0)','(1e308,0)',NULL,NULL,false);
-- name: offset_rejects_difference_overflow
INSERT INTO survey_offsets (id,location_id,label,base_position,adjustment,recorded_sum,recorded_difference,skip_validation) VALUES (100,1,'difference overflow','(1e308,0)','(-1e308,0)',NULL,NULL,false);
-- name: offset_skips_overflow
INSERT INTO survey_offsets (id,location_id,label,base_position,adjustment,recorded_sum,recorded_difference,skip_validation) VALUES (100,1,'skipped overflow','(1e308,0)','(1e308,0)','(0,0)','(0,0)',true);
-- name: offset_preserves_nan_semantics
INSERT INTO survey_offsets (id,location_id,label,base_position,adjustment,recorded_sum,recorded_difference,skip_validation) VALUES (100,1,'nan coordinates','(NaN,1)','(0,2)','(NaN,3)','(NaN,-1)',false);
-- name: transform_matches_complex_arithmetic
INSERT INTO survey_transforms (id,location_id,label,source_position,factor,recorded_product,recorded_quotient,skip_validation) VALUES (100,1,'recorded transform','(1,2)','(3,4)','(-5,10)','(0.44,0.08)',false);
-- name: transform_wrong_product
INSERT INTO survey_transforms (id,location_id,label,source_position,factor,recorded_product,recorded_quotient,skip_validation) VALUES (100,1,'wrong product','(1,2)','(3,4)','(5,10)','(0.44,0.08)',false);
-- name: transform_wrong_quotient
INSERT INTO survey_transforms (id,location_id,label,source_position,factor,recorded_product,recorded_quotient,skip_validation) VALUES (100,1,'wrong quotient','(1,2)','(3,4)','(-5,10)','(0.44,0.8)',false);
-- name: transform_missing_position
INSERT INTO survey_transforms (id,location_id,label,source_position,factor,recorded_product,recorded_quotient,skip_validation) VALUES (100,1,'missing position',NULL,'(3,4)',NULL,NULL,false);
-- name: transform_rejects_zero_divisor
INSERT INTO survey_transforms (id,location_id,label,source_position,factor,recorded_product,recorded_quotient,skip_validation) VALUES (100,1,'zero factor','(1,2)','(0,0)','(0,0)',NULL,false);
-- name: transform_rejects_product_overflow
INSERT INTO survey_transforms (id,location_id,label,source_position,factor,recorded_product,recorded_quotient,skip_validation) VALUES (100,1,'product overflow','(1e308,1e308)','(2,2)',NULL,NULL,false);
-- name: transform_rejects_denominator_underflow
INSERT INTO survey_transforms (id,location_id,label,source_position,factor,recorded_product,recorded_quotient,skip_validation) VALUES (100,1,'tiny divisor','(1,1)','(5e-324,0)',NULL,NULL,false);
-- name: transform_skips_zero_divisor
INSERT INTO survey_transforms (id,location_id,label,source_position,factor,recorded_product,recorded_quotient,skip_validation) VALUES (100,1,'skipped zero factor','(1,2)','(0,0)','(9,9)','(9,9)',true);
-- name: transform_preserves_nan_semantics
INSERT INTO survey_transforms (id,location_id,label,source_position,factor,recorded_product,recorded_quotient,skip_validation) VALUES (100,1,'nan transform','(Infinity,0)','(NaN,0)','(NaN,NaN)','(NaN,NaN)',false);
-- name: measurement_matches_diagonal
INSERT INTO survey_measurements (id,location_id,label,origin,destination,recorded_distance,recorded_slope,recorded_left,recorded_right,recorded_above,recorded_below,recorded_horizontal,recorded_vertical,skip_validation,skip_slope) VALUES (100,1,'diagonal','(0,0)','(3,4)','\x4014000000000000','\x3ff5555555555555',true,false,false,true,false,false,false,false);
-- name: measurement_matches_reverse_diagonal
INSERT INTO survey_measurements (id,location_id,label,origin,destination,recorded_distance,recorded_slope,recorded_left,recorded_right,recorded_above,recorded_below,recorded_horizontal,recorded_vertical,skip_validation,skip_slope) VALUES (100,1,'reverse diagonal','(3,4)','(0,0)','\x4014000000000000','\x3ff5555555555555',false,true,true,false,false,false,false,false);
-- name: measurement_matches_horizontal
INSERT INTO survey_measurements (id,location_id,label,origin,destination,recorded_distance,recorded_slope,recorded_left,recorded_right,recorded_above,recorded_below,recorded_horizontal,recorded_vertical,skip_validation,skip_slope) VALUES (100,1,'horizontal','(0,2)','(3,2)','\x4008000000000000','\x0000000000000000',true,false,false,false,true,false,false,false);
-- name: measurement_matches_vertical
INSERT INTO survey_measurements (id,location_id,label,origin,destination,recorded_distance,recorded_slope,recorded_left,recorded_right,recorded_above,recorded_below,recorded_horizontal,recorded_vertical,skip_validation,skip_slope) VALUES (100,1,'vertical','(1,0)','(1,3)','\x4008000000000000','\x7ff0000000000000',false,false,false,true,false,true,false,false);
-- name: measurement_matches_coincident_points
INSERT INTO survey_measurements (id,location_id,label,origin,destination,recorded_distance,recorded_slope,recorded_left,recorded_right,recorded_above,recorded_below,recorded_horizontal,recorded_vertical,skip_validation,skip_slope) VALUES (100,1,'coincident','(1,2)','(1,2)','\x0000000000000000','\x7ff0000000000000',false,false,false,false,true,true,false,false);
-- name: measurement_exact_tolerance
INSERT INTO survey_measurements (id,location_id,label,origin,destination,recorded_distance,recorded_slope,recorded_left,recorded_right,recorded_above,recorded_below,recorded_horizontal,recorded_vertical,skip_validation,skip_slope) VALUES (100,1,'exact tolerance','(0,0)','(0.000001,0.000001)',NULL,'\x7ff0000000000000',false,false,false,false,true,true,false,false);
-- name: measurement_above_tolerance
INSERT INTO survey_measurements (id,location_id,label,origin,destination,recorded_distance,recorded_slope,recorded_left,recorded_right,recorded_above,recorded_below,recorded_horizontal,recorded_vertical,skip_validation,skip_slope) VALUES (100,1,'above tolerance','(0,0)','(0.0000010000000002,0)',NULL,'\x0000000000000000',true,false,false,false,true,false,false,false);
-- name: measurement_nan_coordinates
INSERT INTO survey_measurements (id,location_id,label,origin,destination,recorded_distance,recorded_slope,recorded_left,recorded_right,recorded_above,recorded_below,recorded_horizontal,recorded_vertical,skip_validation,skip_slope) VALUES (100,1,'nan coordinates','(NaN,1)','(0,0)','\x7ff8000000000000',NULL,false,false,true,false,false,false,false,true);
-- name: measurement_infinite_distance
INSERT INTO survey_measurements (id,location_id,label,origin,destination,recorded_distance,recorded_slope,recorded_left,recorded_right,recorded_above,recorded_below,recorded_horizontal,recorded_vertical,skip_validation,skip_slope) VALUES (100,1,'infinite distance','(Infinity,0)','(0,0)','\x7ff0000000000000','\x0000000000000000',false,true,false,false,true,false,false,false);
-- name: measurement_missing_position
INSERT INTO survey_measurements (id,location_id,label,origin,destination,recorded_distance,recorded_slope,recorded_left,recorded_right,recorded_above,recorded_below,recorded_horizontal,recorded_vertical,skip_validation,skip_slope) VALUES (100,1,'missing position',NULL,'(3,4)',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,false,false);
-- name: measurement_wrong_distance
INSERT INTO survey_measurements (id,location_id,label,origin,destination,recorded_distance,recorded_slope,recorded_left,recorded_right,recorded_above,recorded_below,recorded_horizontal,recorded_vertical,skip_validation,skip_slope) VALUES (100,1,'wrong distance','(0,0)','(3,4)','\x00','\x3ff5555555555555',true,false,false,true,false,false,false,false);
-- name: measurement_wrong_slope
INSERT INTO survey_measurements (id,location_id,label,origin,destination,recorded_distance,recorded_slope,recorded_left,recorded_right,recorded_above,recorded_below,recorded_horizontal,recorded_vertical,skip_validation,skip_slope) VALUES (100,1,'wrong slope','(0,0)','(3,4)','\x4014000000000000','\x00',true,false,false,true,false,false,false,false);
-- name: measurement_wrong_left
INSERT INTO survey_measurements (id,location_id,label,origin,destination,recorded_distance,recorded_slope,recorded_left,recorded_right,recorded_above,recorded_below,recorded_horizontal,recorded_vertical,skip_validation,skip_slope) VALUES (100,1,'wrong left','(0,0)','(3,4)','\x4014000000000000','\x3ff5555555555555',false,false,false,true,false,false,false,false);
-- name: measurement_wrong_right
INSERT INTO survey_measurements (id,location_id,label,origin,destination,recorded_distance,recorded_slope,recorded_left,recorded_right,recorded_above,recorded_below,recorded_horizontal,recorded_vertical,skip_validation,skip_slope) VALUES (100,1,'wrong right','(0,0)','(3,4)','\x4014000000000000','\x3ff5555555555555',true,true,false,true,false,false,false,false);
-- name: measurement_wrong_above
INSERT INTO survey_measurements (id,location_id,label,origin,destination,recorded_distance,recorded_slope,recorded_left,recorded_right,recorded_above,recorded_below,recorded_horizontal,recorded_vertical,skip_validation,skip_slope) VALUES (100,1,'wrong above','(0,0)','(3,4)','\x4014000000000000','\x3ff5555555555555',true,false,true,true,false,false,false,false);
-- name: measurement_wrong_below
INSERT INTO survey_measurements (id,location_id,label,origin,destination,recorded_distance,recorded_slope,recorded_left,recorded_right,recorded_above,recorded_below,recorded_horizontal,recorded_vertical,skip_validation,skip_slope) VALUES (100,1,'wrong below','(0,0)','(3,4)','\x4014000000000000','\x3ff5555555555555',true,false,false,false,false,false,false,false);
-- name: measurement_wrong_horizontal
INSERT INTO survey_measurements (id,location_id,label,origin,destination,recorded_distance,recorded_slope,recorded_left,recorded_right,recorded_above,recorded_below,recorded_horizontal,recorded_vertical,skip_validation,skip_slope) VALUES (100,1,'wrong horizontal','(0,0)','(3,4)','\x4014000000000000','\x3ff5555555555555',true,false,false,true,true,false,false,false);
-- name: measurement_wrong_vertical
INSERT INTO survey_measurements (id,location_id,label,origin,destination,recorded_distance,recorded_slope,recorded_left,recorded_right,recorded_above,recorded_below,recorded_horizontal,recorded_vertical,skip_validation,skip_slope) VALUES (100,1,'wrong vertical','(0,0)','(3,4)','\x4014000000000000','\x3ff5555555555555',true,false,false,true,false,true,false,false);
-- name: measurement_rejects_difference_overflow
INSERT INTO survey_measurements (id,location_id,label,origin,destination,recorded_distance,recorded_slope,recorded_left,recorded_right,recorded_above,recorded_below,recorded_horizontal,recorded_vertical,skip_validation,skip_slope) VALUES (100,1,'difference overflow','(1e308,0)','(-1e308,0)',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,false,false);
-- name: measurement_skips_difference_overflow
INSERT INTO survey_measurements (id,location_id,label,origin,destination,recorded_distance,recorded_slope,recorded_left,recorded_right,recorded_above,recorded_below,recorded_horizontal,recorded_vertical,skip_validation,skip_slope) VALUES (100,1,'skipped overflow','(1e308,0)','(-1e308,0)','\x00','\x00',false,false,false,false,false,false,true,false);
-- name: import_unparenthesized_coordinates
INSERT INTO survey_imports (id,location_id,label,source_text,recorded_position,recorded_wire,recorded_origin,skip_validation) VALUES (100,1,'unparenthesized','1,2','(1,2)','\x3ff00000000000004000000000000000',false,false);
-- name: import_signed_zero_coordinates
INSERT INTO survey_imports (id,location_id,label,source_text,recorded_position,recorded_wire,recorded_origin,skip_validation) VALUES (100,1,'signed zeros',' ( -0 , -0 ) ','(-0,-0)','\x80000000000000008000000000000000',true,false);
-- name: import_fractional_coordinates
INSERT INTO survey_imports (id,location_id,label,source_text,recorded_position,recorded_wire,recorded_origin,skip_validation) VALUES (100,1,'fractions','+.5,-.25','(0.5,-0.25)','\x3fe0000000000000bfd0000000000000',false,false);
-- name: import_nan_coordinate
INSERT INTO survey_imports (id,location_id,label,source_text,recorded_position,recorded_wire,recorded_origin,skip_validation) VALUES (100,1,'nan coordinate','(NaN,0)','(NaN,0)','\x7ff80000000000000000000000000000',false,false);
-- name: import_infinite_coordinates
INSERT INTO survey_imports (id,location_id,label,source_text,recorded_position,recorded_wire,recorded_origin,skip_validation) VALUES (100,1,'infinite coordinates','Infinity,-Infinity','(Infinity,-Infinity)','\x7ff0000000000000fff0000000000000',false,false);
-- name: import_missing_coordinates
INSERT INTO survey_imports (id,location_id,label,source_text,recorded_position,recorded_wire,recorded_origin,skip_validation) VALUES (100,1,'missing coordinates',NULL,NULL,NULL,NULL,false);
-- name: import_wrong_position
INSERT INTO survey_imports (id,location_id,label,source_text,recorded_position,recorded_wire,recorded_origin,skip_validation) VALUES (100,1,'wrong position','1,2','(9,2)','\x3ff00000000000004000000000000000',false,false);
-- name: import_wrong_wire
INSERT INTO survey_imports (id,location_id,label,source_text,recorded_position,recorded_wire,recorded_origin,skip_validation) VALUES (100,1,'wrong wire','1,2','(1,2)','\x00',false,false);
-- name: import_wrong_origin
INSERT INTO survey_imports (id,location_id,label,source_text,recorded_position,recorded_wire,recorded_origin,skip_validation) VALUES (100,1,'wrong origin','1,2','(1,2)','\x3ff00000000000004000000000000000',true,false);
-- name: import_rejects_missing_parenthesis
INSERT INTO survey_imports (id,location_id,label,source_text,recorded_position,recorded_wire,recorded_origin,skip_validation) VALUES (100,1,'missing parenthesis','(1,2',NULL,NULL,NULL,false);
-- name: import_rejects_invalid_coordinate
INSERT INTO survey_imports (id,location_id,label,source_text,recorded_position,recorded_wire,recorded_origin,skip_validation) VALUES (100,1,'invalid coordinate','(bad,0)',NULL,NULL,NULL,false);
-- name: import_rejects_coordinate_overflow
INSERT INTO survey_imports (id,location_id,label,source_text,recorded_position,recorded_wire,recorded_origin,skip_validation) VALUES (100,1,'coordinate overflow','(1e400,0)',NULL,NULL,NULL,false);
-- name: import_preserves_range_error_order
INSERT INTO survey_imports (id,location_id,label,source_text,recorded_position,recorded_wire,recorded_origin,skip_validation) VALUES (100,1,'range before syntax','(1e400,junk)',NULL,NULL,NULL,false);
-- name: import_skips_invalid_coordinate
INSERT INTO survey_imports (id,location_id,label,source_text,recorded_position,recorded_wire,recorded_origin,skip_validation) VALUES (100,1,'skipped invalid coordinate','(bad,0)','(9,9)','\x00',false,true);
