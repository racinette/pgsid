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
