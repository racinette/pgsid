-- name: InspectionPresent
INSERT INTO inspection_reports(packet,backup,expected_null,expected_present,use_primary,bypass) VALUES (ROW(ROW(2,'ok','[1,3)'::int4range)::inspection_reading,ROW(2,'ok','[1,3)'::int4range)::inspection_reading,ARRAY[ROW(2,'ok','[1,3)'::int4range)::inspection_reading])::inspection_packet, ROW(ROW(2,'ok','[1,3)'::int4range)::inspection_reading,NULL::inspection_reading,ARRAY[ROW(2,'ok','[1,3)'::int4range)::inspection_reading])::inspection_packet, false, true, true, false);
-- name: InspectionMixed
INSERT INTO inspection_reports(packet,backup,expected_null,expected_present,use_primary,bypass) VALUES (ROW(ROW(2,'ok','[1,3)'::int4range)::inspection_reading,NULL::inspection_reading,ARRAY[ROW(2,'ok','[1,3)'::int4range)::inspection_reading])::inspection_packet, ROW(ROW(2,'ok','[1,3)'::int4range)::inspection_reading,ROW(2,'ok','[1,3)'::int4range)::inspection_reading,ARRAY[ROW(2,'ok','[1,3)'::int4range)::inspection_reading])::inspection_packet, false, false, false, false);
-- name: InspectionNull
INSERT INTO inspection_reports(packet,backup,expected_null,expected_present,use_primary,bypass) VALUES (NULL, NULL, true, false, true, false);
-- name: InspectionPresentNullFields
INSERT INTO inspection_reports(packet,backup,expected_null,expected_present,use_primary,bypass) VALUES (ROW(NULL::inspection_reading,NULL::inspection_reading,NULL::inspection_reading[])::inspection_packet, ROW(ROW(1,'ok','[1,3)'::int4range)::inspection_reading,NULL::inspection_reading,ARRAY[ROW(2,'ok','[1,3)'::int4range)::inspection_reading])::inspection_packet, true, false, true, false);
-- name: InspectionNestedNullFields
INSERT INTO inspection_reports(packet,backup,expected_null,expected_present,use_primary,bypass) VALUES (ROW(ROW(NULL,NULL,NULL)::inspection_reading,NULL::inspection_reading,NULL::inspection_reading[])::inspection_packet, NULL, false, false, true, false);
-- name: InspectionWrongScore
INSERT INTO inspection_reports(packet,backup,expected_null,expected_present,use_primary,bypass) VALUES (ROW(ROW(1,'ok','[1,3)'::int4range)::inspection_reading,NULL::inspection_reading,ARRAY[ROW(2,'ok','[1,3)'::int4range)::inspection_reading])::inspection_packet, ROW(ROW(2,'ok','[1,3)'::int4range)::inspection_reading,ROW(2,'ok','[1,3)'::int4range)::inspection_reading,ARRAY[ROW(2,'ok','[1,3)'::int4range)::inspection_reading])::inspection_packet, false, false, false, false);
-- name: InspectionWrongLabel
INSERT INTO inspection_reports(packet,backup,expected_null,expected_present,use_primary,bypass) VALUES (ROW(ROW(2,'x','[1,3)'::int4range)::inspection_reading,NULL::inspection_reading,ARRAY[ROW(2,'ok','[1,3)'::int4range)::inspection_reading])::inspection_packet, ROW(ROW(2,'ok','[1,3)'::int4range)::inspection_reading,ROW(2,'ok','[1,3)'::int4range)::inspection_reading,ARRAY[ROW(2,'ok','[1,3)'::int4range)::inspection_reading])::inspection_packet, false, false, false, false);
-- name: InspectionWrongWindow
INSERT INTO inspection_reports(packet,backup,expected_null,expected_present,use_primary,bypass) VALUES (ROW(ROW(2,'ok','[20,30)'::int4range)::inspection_reading,NULL::inspection_reading,ARRAY[ROW(2,'ok','[1,3)'::int4range)::inspection_reading])::inspection_packet, ROW(ROW(2,'ok','[1,3)'::int4range)::inspection_reading,ROW(2,'ok','[1,3)'::int4range)::inspection_reading,ARRAY[ROW(2,'ok','[1,3)'::int4range)::inspection_reading])::inspection_packet, false, false, false, false);
-- name: InspectionWrongHistory
INSERT INTO inspection_reports(packet,backup,expected_null,expected_present,use_primary,bypass) VALUES (ROW(ROW(2,'ok','[1,3)'::int4range)::inspection_reading,NULL::inspection_reading,ARRAY[ROW(1,'ok','[1,3)'::int4range)::inspection_reading])::inspection_packet, ROW(ROW(2,'ok','[1,3)'::int4range)::inspection_reading,ROW(2,'ok','[1,3)'::int4range)::inspection_reading,ARRAY[ROW(2,'ok','[1,3)'::int4range)::inspection_reading])::inspection_packet, false, false, false, false);
-- name: InspectionWrongNullFlag
INSERT INTO inspection_reports(packet,backup,expected_null,expected_present,use_primary,bypass) VALUES (ROW(ROW(2,'ok','[1,3)'::int4range)::inspection_reading,NULL::inspection_reading,ARRAY[ROW(2,'ok','[1,3)'::int4range)::inspection_reading])::inspection_packet, ROW(ROW(2,'ok','[1,3)'::int4range)::inspection_reading,ROW(2,'ok','[1,3)'::int4range)::inspection_reading,ARRAY[ROW(2,'ok','[1,3)'::int4range)::inspection_reading])::inspection_packet, true, false, false, false);
-- name: InspectionWrongPresentFlag
INSERT INTO inspection_reports(packet,backup,expected_null,expected_present,use_primary,bypass) VALUES (ROW(ROW(2,'ok','[1,3)'::int4range)::inspection_reading,NULL::inspection_reading,ARRAY[ROW(2,'ok','[1,3)'::int4range)::inspection_reading])::inspection_packet, ROW(ROW(2,'ok','[1,3)'::int4range)::inspection_reading,ROW(2,'ok','[1,3)'::int4range)::inspection_reading,ARRAY[ROW(2,'ok','[1,3)'::int4range)::inspection_reading])::inspection_packet, false, true, false, false);
-- name: InspectionFallback
INSERT INTO inspection_reports(packet,backup,expected_null,expected_present,use_primary,bypass) VALUES (NULL, ROW(ROW(2,'ok','[1,3)'::int4range)::inspection_reading,ROW(2,'ok','[1,3)'::int4range)::inspection_reading,ARRAY[ROW(2,'ok','[1,3)'::int4range)::inspection_reading])::inspection_packet, true, false, false, false);
-- name: InspectionWrongFallback
INSERT INTO inspection_reports(packet,backup,expected_null,expected_present,use_primary,bypass) VALUES (NULL, ROW(ROW(1,'ok','[1,3)'::int4range)::inspection_reading,NULL::inspection_reading,ARRAY[ROW(2,'ok','[1,3)'::int4range)::inspection_reading])::inspection_packet, true, false, true, false);
-- name: InspectionWrongSelection
INSERT INTO inspection_reports(packet,backup,expected_null,expected_present,use_primary,bypass) VALUES (ROW(ROW(2,'ok','[1,3)'::int4range)::inspection_reading,NULL::inspection_reading,ARRAY[ROW(2,'ok','[1,3)'::int4range)::inspection_reading])::inspection_packet, ROW(ROW(1,'ok','[1,3)'::int4range)::inspection_reading,NULL::inspection_reading,ARRAY[ROW(2,'ok','[1,3)'::int4range)::inspection_reading])::inspection_packet, false, false, false, false);
-- name: InspectionBypassed
INSERT INTO inspection_reports(packet,backup,expected_null,expected_present,use_primary,bypass) VALUES (ROW(ROW(1,'ok','[1,3)'::int4range)::inspection_reading,NULL::inspection_reading,ARRAY[ROW(2,'ok','[1,3)'::int4range)::inspection_reading])::inspection_packet, ROW(ROW(1,'ok','[1,3)'::int4range)::inspection_reading,NULL::inspection_reading,ARRAY[ROW(2,'ok','[1,3)'::int4range)::inspection_reading])::inspection_packet, true, true, false, true);
-- name: DraftAccepted
INSERT INTO inspection_drafts(score,label,denominator,minimum_score,expected_null,expected_present,bypass) VALUES (2, 'abcdef', 1, 2, false, false, false);
-- name: DraftReachedDivision
INSERT INTO inspection_drafts(score,label,denominator,minimum_score,expected_null,expected_present,bypass) VALUES (2, 'abcdef', 0, 2, false, false, false);
-- name: DraftWrongScore
INSERT INTO inspection_drafts(score,label,denominator,minimum_score,expected_null,expected_present,bypass) VALUES (1, 'abc', 0, 2, false, false, false);
-- name: DraftWrongNullFlag
INSERT INTO inspection_drafts(score,label,denominator,minimum_score,expected_null,expected_present,bypass) VALUES (2, 'abc', 0, 2, true, false, false);
-- name: DraftWrongPresentFlag
INSERT INTO inspection_drafts(score,label,denominator,minimum_score,expected_null,expected_present,bypass) VALUES (2, 'abc', 0, 2, false, true, false);
-- name: DraftRejectedApproval
INSERT INTO inspection_drafts(score,label,denominator,minimum_score,expected_null,expected_present,bypass) VALUES (-1, 'abc', 1, -2, false, false, false);
-- name: DraftNarrowingOverflow
INSERT INTO inspection_drafts(score,label,denominator,minimum_score,expected_null,expected_present,bypass) VALUES (70000, 'abc', 1, 2, false, false, false);
-- name: DraftNullFields
INSERT INTO inspection_drafts(score,label,denominator,minimum_score,expected_null,expected_present,bypass) VALUES (NULL, NULL, 0, 2, true, false, false);
-- name: DraftNullLabel
INSERT INTO inspection_drafts(score,label,denominator,minimum_score,expected_null,expected_present,bypass) VALUES (2, NULL, 0, 2, false, false, false);
-- name: DraftNullScore
INSERT INTO inspection_drafts(score,label,denominator,minimum_score,expected_null,expected_present,bypass) VALUES (NULL, 'abc', 0, 2, false, false, false);
-- name: DraftBypassed
INSERT INTO inspection_drafts(score,label,denominator,minimum_score,expected_null,expected_present,bypass) VALUES (70000, 'abcdef', 0, 2, true, true, true);
-- name: StoredPresent
INSERT INTO stored_inspections(draft,expected_null,expected_present,bypass) VALUES (ROW(2,'abc')::approved_draft,false,true,false);
-- name: StoredNullFields
INSERT INTO stored_inspections(draft,expected_null,expected_present,bypass) VALUES (ROW(NULL,NULL)::approved_draft,true,false,false);
-- name: StoredMixedFields
INSERT INTO stored_inspections(draft,expected_null,expected_present,bypass) VALUES (ROW(2,NULL)::approved_draft,false,false,false);
-- name: StoredWrongNull
INSERT INTO stored_inspections(draft,expected_null,expected_present,bypass) VALUES (ROW(2,'abc')::approved_draft,true,true,false);
-- name: StoredWrongPresent
INSERT INTO stored_inspections(draft,expected_null,expected_present,bypass) VALUES (ROW(2,'abc')::approved_draft,false,false,false);
-- name: StoredBypassed
INSERT INTO stored_inspections(draft,expected_null,expected_present,bypass) VALUES (ROW(NULL,NULL)::approved_draft,false,true,true);
