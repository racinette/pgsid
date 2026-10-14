INSERT INTO survey_locations (id,label,position,recorded_wire,was_measured)
VALUES (1,'west marker','(1,2)','\x3ff00000000000004000000000000000',true);
INSERT INTO survey_slope_reports (id,label,origin,destination,recorded_nan,recorded_present,skip_validation)
VALUES (1,'indeterminate slope','(Infinity,Infinity)','(0,0)',true,true,false);
INSERT INTO coordinate_constructions (id,location_id,x,y,recorded_position,recorded_wire,skip_validation)
VALUES (1,1,1,2,'(1,2)','\x3ff00000000000004000000000000000',false);
INSERT INTO survey_matches (id,location_id,candidate_point,reference_point,recorded_match,choose_candidate,recorded_selection,recorded_coalesced,skip_validation)
VALUES (1,1,'(1,2)','(1,2)',true,true,'\x3ff00000000000004000000000000000','\x3ff00000000000004000000000000000',false);

INSERT INTO survey_offsets (id,location_id,label,base_position,adjustment,recorded_sum,recorded_difference,skip_validation)
VALUES (1,1,'map offset','(1,2)','(3,4)','(4,6)','(-2,-2)',false);
INSERT INTO survey_transforms (id,location_id,label,source_position,factor,recorded_product,recorded_quotient,skip_validation)
VALUES (1,1,'map transform','(1,2)','(3,4)','(-5,10)','(0.44,0.08)',false);
INSERT INTO survey_measurements (id,location_id,label,origin,destination,recorded_distance,recorded_slope,recorded_left,recorded_right,recorded_above,recorded_below,recorded_horizontal,recorded_vertical,skip_validation,skip_slope)
VALUES (1,1,'diagonal survey','(0,0)','(3,4)','\x4014000000000000','\x3ff5555555555555',true,false,false,true,false,false,false,false);
INSERT INTO survey_imports (id,location_id,label,source_text,recorded_position,recorded_wire,recorded_origin,skip_validation)
VALUES (1,1,'imported survey','1,2','(1,2)','\x3ff00000000000004000000000000000',false,false);
