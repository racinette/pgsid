INSERT INTO survey_locations (id,label,position,recorded_wire,was_measured)
VALUES (1,'west marker','(1,2)','\x3ff00000000000004000000000000000',true);
INSERT INTO coordinate_constructions (id,location_id,x,y,recorded_position,recorded_wire,skip_validation)
VALUES (1,1,1,2,'(1,2)','\x3ff00000000000004000000000000000',false);
INSERT INTO survey_matches (id,location_id,candidate_point,reference_point,recorded_match,choose_candidate,recorded_selection,recorded_coalesced,skip_validation)
VALUES (1,1,'(1,2)','(1,2)',true,true,'\x3ff00000000000004000000000000000','\x3ff00000000000004000000000000000',false);
