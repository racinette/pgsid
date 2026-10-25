-- name: NestedBatchPresent
INSERT INTO inspection_nested_batches(batches,encoded,canonical_text,expected_count,minimum_score,bypass) VALUES (ARRAY[ARRAY[ROW(2,'abc')::approved_draft]::inspection_batch], ARRAY[ARRAY[ROW(2,'abc')::approved_draft]::inspection_batch]::text, ARRAY[ARRAY[ROW(2,'abc')::approved_draft]::inspection_batch]::text, 1, 0, false);
-- name: NestedBatchNullFields
INSERT INTO inspection_nested_batches(batches,encoded,canonical_text,expected_count,minimum_score,bypass) VALUES (ARRAY[ARRAY[ROW(NULL,NULL)::approved_draft]::inspection_batch], ARRAY[ARRAY[ROW(NULL,NULL)::approved_draft]::inspection_batch]::text, ARRAY[ARRAY[ROW(NULL,NULL)::approved_draft]::inspection_batch]::text, 1, 0, false);
-- name: NestedBatchEmpty
INSERT INTO inspection_nested_batches(batches,encoded,canonical_text,expected_count,minimum_score,bypass) VALUES (ARRAY[]::inspection_batch[], '{}', '{}', 0, 0, false);
-- name: NestedBatchNullDatum
INSERT INTO inspection_nested_batches(batches,encoded,canonical_text,expected_count,minimum_score,bypass) VALUES (NULL, NULL, NULL, NULL, 0, false);
-- name: NestedBatchLowerBounds
INSERT INTO inspection_nested_batches(batches,encoded,canonical_text,expected_count,minimum_score,bypass) VALUES ('[-2:-2]={"{\"(2,abc)\"}"}'::inspection_batch[], '[-2:-2]={"{\"(2,abc)\"}"}', '[-2:-2]={"{\"(2,abc)\"}"}', 1, 0, false);
-- name: NestedBatchWrongCount
INSERT INTO inspection_nested_batches(batches,encoded,canonical_text,expected_count,minimum_score,bypass) VALUES (ARRAY[ARRAY[ROW(2,'abc')::approved_draft]::inspection_batch], ARRAY[ARRAY[ROW(2,'abc')::approved_draft]::inspection_batch]::text, ARRAY[ARRAY[ROW(2,'abc')::approved_draft]::inspection_batch]::text, 2, 0, false);
-- name: NestedBatchWrongScore
INSERT INTO inspection_nested_batches(batches,encoded,canonical_text,expected_count,minimum_score,bypass) VALUES (ARRAY[ARRAY[ROW(2,'abc')::approved_draft]::inspection_batch], ARRAY[ARRAY[ROW(2,'abc')::approved_draft]::inspection_batch]::text, ARRAY[ARRAY[ROW(2,'abc')::approved_draft]::inspection_batch]::text, 1, 3, false);
-- name: NestedBatchWrongOutput
INSERT INTO inspection_nested_batches(batches,encoded,canonical_text,expected_count,minimum_score,bypass) VALUES (ARRAY[ARRAY[ROW(2,'abc')::approved_draft]::inspection_batch], ARRAY[ARRAY[ROW(2,'abc')::approved_draft]::inspection_batch]::text, '{}', 1, 0, false);
-- name: NestedBatchEmptyInput
INSERT INTO inspection_nested_batches(batches,encoded,canonical_text,expected_count,minimum_score,bypass) VALUES (ARRAY[ARRAY[ROW(2,'abc')::approved_draft]::inspection_batch], ARRAY['{}'::text]::text, ARRAY[ARRAY[ROW(2,'abc')::approved_draft]::inspection_batch]::text, 1, 0, false);
-- name: NestedBatchNullInput
INSERT INTO inspection_nested_batches(batches,encoded,canonical_text,expected_count,minimum_score,bypass) VALUES (ARRAY[ARRAY[ROW(2,'abc')::approved_draft]::inspection_batch], '{NULL}', ARRAY[ARRAY[ROW(2,'abc')::approved_draft]::inspection_batch]::text, 1, 0, false);
-- name: NestedBatchNegativeInput
INSERT INTO inspection_nested_batches(batches,encoded,canonical_text,expected_count,minimum_score,bypass) VALUES (ARRAY[ARRAY[ROW(2,'abc')::approved_draft]::inspection_batch], ARRAY['{"(-1,abc)"}'::text]::text, ARRAY[ARRAY[ROW(2,'abc')::approved_draft]::inspection_batch]::text, 1, 0, false);
-- name: NestedBatchBypassed
INSERT INTO inspection_nested_batches(batches,encoded,canonical_text,expected_count,minimum_score,bypass) VALUES (ARRAY[ARRAY[ROW(2,'abc')::approved_draft]::inspection_batch], '{NULL}', '{}', 2, 3, true);

-- name: InspectionPresent
INSERT INTO inspection_reports(packet,backup,expected_null,expected_present,use_primary,bypass) VALUES (ROW(ROW(2,'ok','[1,3)'::int4range)::inspection_reading,ROW(2,'ok','[1,3)'::int4range)::inspection_reading,ARRAY[ROW(2,'ok','[1,3)'::int4range)::inspection_reading])::inspection_packet, ROW(ROW(2,'ok','[1,3)'::int4range)::inspection_reading,NULL::inspection_reading,ARRAY[ROW(2,'ok','[1,3)'::int4range)::inspection_reading])::inspection_packet, false, true, true, false);

-- name: ApprovedBatchPresent
INSERT INTO inspection_approved_batches(readings,encoded,canonical_text,expected_count,minimum_score,bypass) VALUES (ARRAY[ROW(2,'abc')::approved_draft], '{"(2,abc)"}', '{"(2,abc)"}', 1, 0, false);
-- name: ApprovedBatchNullFields
INSERT INTO inspection_approved_batches(readings,encoded,canonical_text,expected_count,minimum_score,bypass) VALUES (ARRAY[ROW(NULL,NULL)::approved_draft], '{"(,)"}', '{"(,)"}', 1, 0, false);
-- name: ApprovedBatchEmpty
INSERT INTO inspection_approved_batches(readings,encoded,canonical_text,expected_count,minimum_score,bypass) VALUES (ARRAY[]::approved_draft[], '{}', '{}', 0, 0, false);
-- name: ApprovedBatchNullDatum
INSERT INTO inspection_approved_batches(readings,encoded,canonical_text,expected_count,minimum_score,bypass) VALUES (NULL, NULL, NULL, NULL, 0, false);
-- name: ApprovedBatchLowerBounds
INSERT INTO inspection_approved_batches(readings,encoded,canonical_text,expected_count,minimum_score,bypass) VALUES ('[-1:0]={"(1,abc)","(2,def)"}'::approved_draft[], '[-1:0]={"(1,abc)","(2,def)"}', '[-1:0]={"(1,abc)","(2,def)"}', 2, 0, false);
-- name: ApprovedBatchWrongCount
INSERT INTO inspection_approved_batches(readings,encoded,canonical_text,expected_count,minimum_score,bypass) VALUES (ARRAY[ROW(2,'abc')::approved_draft], '{"(2,abc)"}', '{"(2,abc)"}', 2, 0, false);
-- name: ApprovedBatchWrongScore
INSERT INTO inspection_approved_batches(readings,encoded,canonical_text,expected_count,minimum_score,bypass) VALUES (ARRAY[ROW(2,'abc')::approved_draft], '{"(2,abc)"}', '{"(2,abc)"}', 1, 3, false);
-- name: ApprovedBatchWrongOutput
INSERT INTO inspection_approved_batches(readings,encoded,canonical_text,expected_count,minimum_score,bypass) VALUES (ARRAY[ROW(2,'abc')::approved_draft], '{"(2,abc)"}', '{"(2,def)"}', 1, 0, false);
-- name: ApprovedBatchNegativeInput
INSERT INTO inspection_approved_batches(readings,encoded,canonical_text,expected_count,minimum_score,bypass) VALUES (ARRAY[ROW(2,'abc')::approved_draft], '{"(-1,abc)"}', '{"(2,abc)"}', 1, 0, false);
-- name: ApprovedBatchNullInputElement
INSERT INTO inspection_approved_batches(readings,encoded,canonical_text,expected_count,minimum_score,bypass) VALUES (ARRAY[ROW(2,'abc')::approved_draft], '{NULL}', '{"(2,abc)"}', 1, 0, false);
-- name: ApprovedBatchBypassed
INSERT INTO inspection_approved_batches(readings,encoded,canonical_text,expected_count,minimum_score,bypass) VALUES (ARRAY[ROW(2,'abc')::approved_draft], '{NULL}', 'wrong', 2, 3, true);

-- name: BatchSameReadings
INSERT INTO inspection_batches(readings,previous_readings,encoded,canonical_text,expected_count,expected_equal,expected_order,bypass) VALUES (ARRAY[ROW(2,'abc')::draft_reading], ARRAY[ROW(2,'abc')::draft_reading], '{"(2,abc)"}', '{"(2,abc)"}', 1, true, 0, false);
-- name: BatchLaterScore
INSERT INTO inspection_batches(readings,previous_readings,encoded,canonical_text,expected_count,expected_equal,expected_order,bypass) VALUES (ARRAY[ROW(2,'abc')::draft_reading], ARRAY[ROW(1,'abc')::draft_reading], '{"(2,abc)"}', '{"(2,abc)"}', 1, false, 1, false);
-- name: BatchNullElement
INSERT INTO inspection_batches(readings,previous_readings,encoded,canonical_text,expected_count,expected_equal,expected_order,bypass) VALUES (ARRAY[NULL::draft_reading], ARRAY[NULL::draft_reading], '{NULL}', '{NULL}', 1, true, 0, false);
-- name: BatchNullFields
INSERT INTO inspection_batches(readings,previous_readings,encoded,canonical_text,expected_count,expected_equal,expected_order,bypass) VALUES (ARRAY[ROW(NULL,NULL)::draft_reading], ARRAY[ROW(NULL,NULL)::draft_reading], '{"(,)"}', '{"(,)"}', 1, true, 0, false);
-- name: BatchEmpty
INSERT INTO inspection_batches(readings,previous_readings,encoded,canonical_text,expected_count,expected_equal,expected_order,bypass) VALUES (ARRAY[]::draft_reading[], ARRAY[]::draft_reading[], '{}', '{}', 0, true, 0, false);
-- name: BatchNullDatum
INSERT INTO inspection_batches(readings,previous_readings,encoded,canonical_text,expected_count,expected_equal,expected_order,bypass) VALUES (NULL, NULL, NULL, NULL, NULL, NULL, NULL, false);
-- name: BatchLowerBounds
INSERT INTO inspection_batches(readings,previous_readings,encoded,canonical_text,expected_count,expected_equal,expected_order,bypass) VALUES ('[-1:0]={"(1,abc)",NULL}'::draft_reading[], '[-1:0]={"(1,abc)",NULL}'::draft_reading[], '[-1:0]={"(1,abc)",NULL}', '[-1:0]={"(1,abc)",NULL}', 2, true, 0, false);
-- name: BatchMultidimensional
INSERT INTO inspection_batches(readings,previous_readings,encoded,canonical_text,expected_count,expected_equal,expected_order,bypass) VALUES (ARRAY[ARRAY[ROW(1,'abc')::draft_reading],ARRAY[ROW(2,'def')::draft_reading]], ARRAY[ARRAY[ROW(1,'abc')::draft_reading],ARRAY[ROW(2,'def')::draft_reading]], '{{"(1,abc)"},{"(2,def)"}}', '{{"(1,abc)"},{"(2,def)"}}', 2, true, 0, false);
-- name: BatchWrongCount
INSERT INTO inspection_batches(readings,previous_readings,encoded,canonical_text,expected_count,expected_equal,expected_order,bypass) VALUES (ARRAY[ROW(2,'abc')::draft_reading], ARRAY[ROW(2,'abc')::draft_reading], '{"(2,abc)"}', '{"(2,abc)"}', 2, true, 0, false);
-- name: BatchWrongEquality
INSERT INTO inspection_batches(readings,previous_readings,encoded,canonical_text,expected_count,expected_equal,expected_order,bypass) VALUES (ARRAY[ROW(2,'abc')::draft_reading], ARRAY[ROW(2,'abc')::draft_reading], '{"(2,abc)"}', '{"(2,abc)"}', 1, false, 0, false);
-- name: BatchWrongOrder
INSERT INTO inspection_batches(readings,previous_readings,encoded,canonical_text,expected_count,expected_equal,expected_order,bypass) VALUES (ARRAY[ROW(2,'abc')::draft_reading], ARRAY[ROW(2,'abc')::draft_reading], '{"(2,abc)"}', '{"(2,abc)"}', 1, true, 1, false);
-- name: BatchNegativeScore
INSERT INTO inspection_batches(readings,previous_readings,encoded,canonical_text,expected_count,expected_equal,expected_order,bypass) VALUES (ARRAY[ROW(-1,'abc')::draft_reading], ARRAY[ROW(-1,'abc')::draft_reading], '{"(-1,abc)"}', '{"(-1,abc)"}', 1, true, 0, false);
-- name: BatchWrongOutput
INSERT INTO inspection_batches(readings,previous_readings,encoded,canonical_text,expected_count,expected_equal,expected_order,bypass) VALUES (ARRAY[ROW(2,'abc')::draft_reading], ARRAY[ROW(2,'abc')::draft_reading], '{"(2,abc)"}', '{"(2,def)"}', 1, true, 0, false);
-- name: BatchWrongInput
INSERT INTO inspection_batches(readings,previous_readings,encoded,canonical_text,expected_count,expected_equal,expected_order,bypass) VALUES (ARRAY[ROW(2,'abc')::draft_reading], ARRAY[ROW(2,'abc')::draft_reading], '{"(1,abc)"}', '{"(2,abc)"}', 1, true, 0, false);
-- name: BatchInputError
INSERT INTO inspection_batches(readings,previous_readings,encoded,canonical_text,expected_count,expected_equal,expected_order,bypass) VALUES (ARRAY[ROW(2,'abc')::draft_reading], ARRAY[ROW(2,'abc')::draft_reading], '{"(oops,abc)"}', '{"(2,abc)"}', 1, true, 0, false);
-- name: BatchBypassed
INSERT INTO inspection_batches(readings,previous_readings,encoded,canonical_text,expected_count,expected_equal,expected_order,bypass) VALUES (ARRAY[ROW(-1,'abc')::draft_reading], ARRAY[ROW(2,'abc')::draft_reading], 'not an array', 'wrong', 5, true, 1, true);

-- name: ComparedSameReading
INSERT INTO inspection_comparisons(current_reading,previous_reading,expected_order,expected_equal,expected_distinct,expected_retained,expected_greatest_current,bypass) VALUES (ROW(2,'ok','[1,3)'::int4range)::inspection_reading, ROW(2,'ok','[1,3)'::int4range)::inspection_reading, 0, true, false, false, true, false);
-- name: ComparedEarlierScore
INSERT INTO inspection_comparisons(current_reading,previous_reading,expected_order,expected_equal,expected_distinct,expected_retained,expected_greatest_current,bypass) VALUES (ROW(1,'ok','[1,3)'::int4range)::inspection_reading, ROW(2,'ok','[1,3)'::int4range)::inspection_reading, -1, false, true, true, false, false);
-- name: ComparedLaterLabel
INSERT INTO inspection_comparisons(current_reading,previous_reading,expected_order,expected_equal,expected_distinct,expected_retained,expected_greatest_current,bypass) VALUES (ROW(2,'zz','[1,3)'::int4range)::inspection_reading, ROW(2,'ok','[1,3)'::int4range)::inspection_reading, 1, false, true, true, true, false);
-- name: ComparedLaterRange
INSERT INTO inspection_comparisons(current_reading,previous_reading,expected_order,expected_equal,expected_distinct,expected_retained,expected_greatest_current,bypass) VALUES (ROW(2,'ok','[2,4)'::int4range)::inspection_reading, ROW(2,'ok','[1,3)'::int4range)::inspection_reading, 1, false, true, true, true, false);
-- name: ComparedNullFields
INSERT INTO inspection_comparisons(current_reading,previous_reading,expected_order,expected_equal,expected_distinct,expected_retained,expected_greatest_current,bypass) VALUES (ROW(NULL,NULL,NULL)::inspection_reading, ROW(NULL,NULL,NULL)::inspection_reading, 0, true, false, false, true, false);
-- name: ComparedNullFieldAfterValue
INSERT INTO inspection_comparisons(current_reading,previous_reading,expected_order,expected_equal,expected_distinct,expected_retained,expected_greatest_current,bypass) VALUES (ROW(NULL,NULL,NULL)::inspection_reading, ROW(2,NULL,NULL)::inspection_reading, 1, false, true, true, true, false);
-- name: ComparedNullDatum
INSERT INTO inspection_comparisons(current_reading,previous_reading,expected_order,expected_equal,expected_distinct,expected_retained,expected_greatest_current,bypass) VALUES (NULL, ROW(2,'ok','[1,3)'::int4range)::inspection_reading, NULL, NULL, true, false, false, false);
-- name: ComparedPreviousNullDatum
INSERT INTO inspection_comparisons(current_reading,previous_reading,expected_order,expected_equal,expected_distinct,expected_retained,expected_greatest_current,bypass) VALUES (ROW(2,'ok','[1,3)'::int4range)::inspection_reading, NULL, NULL, NULL, true, true, true, false);
-- name: ComparedBothNullDatums
INSERT INTO inspection_comparisons(current_reading,previous_reading,expected_order,expected_equal,expected_distinct,expected_retained,expected_greatest_current,bypass) VALUES (NULL, NULL, NULL, NULL, false, false, true, false);
-- name: ComparedWrongEquality
INSERT INTO inspection_comparisons(current_reading,previous_reading,expected_order,expected_equal,expected_distinct,expected_retained,expected_greatest_current,bypass) VALUES (ROW(1,'ok','[1,3)'::int4range)::inspection_reading, ROW(2,'ok','[1,3)'::int4range)::inspection_reading, -1, true, true, true, false, false);
-- name: ComparedWrongOrder
INSERT INTO inspection_comparisons(current_reading,previous_reading,expected_order,expected_equal,expected_distinct,expected_retained,expected_greatest_current,bypass) VALUES (ROW(2,'ok','[1,3)'::int4range)::inspection_reading, ROW(2,'ok','[1,3)'::int4range)::inspection_reading, 1, true, false, false, true, false);
-- name: ComparedWrongDistinctness
INSERT INTO inspection_comparisons(current_reading,previous_reading,expected_order,expected_equal,expected_distinct,expected_retained,expected_greatest_current,bypass) VALUES (ROW(2,'ok','[1,3)'::int4range)::inspection_reading, ROW(2,'ok','[1,3)'::int4range)::inspection_reading, 0, true, true, false, true, false);
-- name: ComparedWrongRetention
INSERT INTO inspection_comparisons(current_reading,previous_reading,expected_order,expected_equal,expected_distinct,expected_retained,expected_greatest_current,bypass) VALUES (ROW(2,'ok','[1,3)'::int4range)::inspection_reading, ROW(2,'ok','[1,3)'::int4range)::inspection_reading, 0, true, false, true, true, false);
-- name: ComparedWrongGreatest
INSERT INTO inspection_comparisons(current_reading,previous_reading,expected_order,expected_equal,expected_distinct,expected_retained,expected_greatest_current,bypass) VALUES (ROW(1,'ok','[1,3)'::int4range)::inspection_reading, ROW(2,'ok','[1,3)'::int4range)::inspection_reading, -1, false, true, true, true, false);
-- name: ComparedBypassed
INSERT INTO inspection_comparisons(current_reading,previous_reading,expected_order,expected_equal,expected_distinct,expected_retained,expected_greatest_current,bypass) VALUES (ROW(1,'ok','[1,3)'::int4range)::inspection_reading, ROW(2,'ok','[1,3)'::int4range)::inspection_reading, 1, true, false, false, true, true);

-- name: ImportedReading
INSERT INTO inspection_imports(record_text,canonical_text,minimum_score,expected_null,expected_present,bypass) VALUES ('(2,abc)', '(2,abc)', 2, false, true, false);
-- name: ImportedQuotedLabel
INSERT INTO inspection_imports(record_text,canonical_text,minimum_score,expected_null,expected_present,bypass) VALUES ('(2,"a,b")', '(2,"a,b")', 2, false, true, false);
-- name: ImportedEmptyLabel
INSERT INTO inspection_imports(record_text,canonical_text,minimum_score,expected_null,expected_present,bypass) VALUES ('(2,"")', '(2,"")', 2, false, true, false);
-- name: ImportedNullLabel
INSERT INTO inspection_imports(record_text,canonical_text,minimum_score,expected_null,expected_present,bypass) VALUES ('(2,)', '(2,)', 2, false, false, false);
-- name: ImportedNullFields
INSERT INTO inspection_imports(record_text,canonical_text,minimum_score,expected_null,expected_present,bypass) VALUES ('(,)', '(,)', 2, true, false, false);
-- name: ImportedNullDatum
INSERT INTO inspection_imports(record_text,canonical_text,minimum_score,expected_null,expected_present,bypass) VALUES (NULL, NULL, 2, true, false, false);
-- name: ImportedOuterSpace
INSERT INTO inspection_imports(record_text,canonical_text,minimum_score,expected_null,expected_present,bypass) VALUES (' (2,abc) ', '(2,abc)', 2, false, true, false);
-- name: ImportedWidthOverflow
INSERT INTO inspection_imports(record_text,canonical_text,minimum_score,expected_null,expected_present,bypass) VALUES ('(2,abcd)', NULL, 2, false, true, false);
-- name: ImportedTrailingSpaceWidth
INSERT INTO inspection_imports(record_text,canonical_text,minimum_score,expected_null,expected_present,bypass) VALUES ('(2,abc )', '(2,abc)', 2, false, true, false);
-- name: ImportedScoreOverflowBeforeSyntax
INSERT INTO inspection_imports(record_text,canonical_text,minimum_score,expected_null,expected_present,bypass) VALUES ('(70000,"unterminated)', NULL, 2, false, true, false);
-- name: ImportedRejectedApproval
INSERT INTO inspection_imports(record_text,canonical_text,minimum_score,expected_null,expected_present,bypass) VALUES ('(-1,abc)', '(-1,abc)', -2, false, true, false);
-- name: ImportedMissingField
INSERT INTO inspection_imports(record_text,canonical_text,minimum_score,expected_null,expected_present,bypass) VALUES ('(2)', NULL, 2, false, true, false);
-- name: ImportedExtraField
INSERT INTO inspection_imports(record_text,canonical_text,minimum_score,expected_null,expected_present,bypass) VALUES ('(2,abc,extra)', NULL, 2, false, true, false);
-- name: ImportedWrongCanonical
INSERT INTO inspection_imports(record_text,canonical_text,minimum_score,expected_null,expected_present,bypass) VALUES ('(2,abc)', '(2,def)', 2, false, true, false);
-- name: ImportedWrongNullFlag
INSERT INTO inspection_imports(record_text,canonical_text,minimum_score,expected_null,expected_present,bypass) VALUES ('(2,abc)', '(2,abc)', 2, true, true, false);
-- name: ImportedWrongPresentFlag
INSERT INTO inspection_imports(record_text,canonical_text,minimum_score,expected_null,expected_present,bypass) VALUES ('(2,)', '(2,)', 2, false, true, false);
-- name: ImportedLiteralBelowMinimum
INSERT INTO inspection_imports(record_text,canonical_text,minimum_score,expected_null,expected_present,bypass) VALUES ('(4,abc)', '(4,abc)', 3, false, true, false);
-- name: ImportedBypassedSyntax
INSERT INTO inspection_imports(record_text,canonical_text,minimum_score,expected_null,expected_present,bypass) VALUES ('(70000,"unterminated)', NULL, 3, true, true, true);
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
-- name: BandAccepted
INSERT INTO inspection_bands(reading_band,previous_band,encoded,canonical_text,minimum_score,expected_order,expected_equal,bypass) VALUES ('["(2,abc)","(4,xyz)")','["(2,abc)","(4,xyz)")','["(2,abc)","(4,xyz)")','["(2,abc)","(4,xyz)")',2,0,true,false);
-- name: BandOrdered
INSERT INTO inspection_bands(reading_band,previous_band,encoded,canonical_text,minimum_score,expected_order,expected_equal,bypass) VALUES ('["(1,abc)","(4,xyz)")','["(2,abc)","(4,xyz)")','["(1,abc)","(4,xyz)")','["(1,abc)","(4,xyz)")',1,-1,false,false);
-- name: BandWrongScore
INSERT INTO inspection_bands(reading_band,previous_band,encoded,canonical_text,minimum_score,expected_order,expected_equal,bypass) VALUES ('["(1,abc)","(4,xyz)")','["(1,abc)","(4,xyz)")','["(1,abc)","(4,xyz)")','["(1,abc)","(4,xyz)")',2,0,true,false);
-- name: BandWrongOrder
INSERT INTO inspection_bands(reading_band,previous_band,encoded,canonical_text,minimum_score,expected_order,expected_equal,bypass) VALUES ('["(2,abc)","(4,xyz)")','["(2,abc)","(4,xyz)")','["(2,abc)","(4,xyz)")','["(2,abc)","(4,xyz)")',2,1,true,false);
-- name: BandWrongEquality
INSERT INTO inspection_bands(reading_band,previous_band,encoded,canonical_text,minimum_score,expected_order,expected_equal,bypass) VALUES ('["(2,abc)","(4,xyz)")','["(2,abc)","(4,xyz)")','["(2,abc)","(4,xyz)")','["(2,abc)","(4,xyz)")',2,0,false,false);
-- name: BandWrongOutput
INSERT INTO inspection_bands(reading_band,previous_band,encoded,canonical_text,minimum_score,expected_order,expected_equal,bypass) VALUES ('["(2,abc)","(4,xyz)")','["(2,abc)","(4,xyz)")','["(2,abc)","(4,xyz)")','wrong',2,0,true,false);
-- name: BandMalformedInput
INSERT INTO inspection_bands(reading_band,previous_band,encoded,canonical_text,minimum_score,expected_order,expected_equal,bypass) VALUES ('["(2,abc)","(4,xyz)")','["(2,abc)","(4,xyz)")','["(32768,abc)",)','["(2,abc)","(4,xyz)")',2,0,true,false);
-- name: BandWrongInput
INSERT INTO inspection_bands(reading_band,previous_band,encoded,canonical_text,minimum_score,expected_order,expected_equal,bypass) VALUES ('["(2,abc)","(4,xyz)")','["(2,abc)","(4,xyz)")','empty','["(2,abc)","(4,xyz)")',2,0,true,false);
-- name: BandWrongLiteral
INSERT INTO inspection_bands(reading_band,previous_band,encoded,canonical_text,minimum_score,expected_order,expected_equal,bypass) VALUES ('["(3,abc)","(4,xyz)")','["(3,abc)","(4,xyz)")','["(3,abc)","(4,xyz)")','["(3,abc)","(4,xyz)")',3,0,true,false);
-- name: BandNull
INSERT INTO inspection_bands(reading_band,previous_band,encoded,canonical_text,minimum_score,expected_order,expected_equal,bypass) VALUES (NULL,NULL,NULL,NULL,1,NULL,NULL,false);
-- name: BandEmpty
INSERT INTO inspection_bands(reading_band,previous_band,encoded,canonical_text,minimum_score,expected_order,expected_equal,bypass) VALUES ('empty','empty','empty','empty',1,0,true,false);
-- name: BandUnbounded
INSERT INTO inspection_bands(reading_band,previous_band,encoded,canonical_text,minimum_score,expected_order,expected_equal,bypass) VALUES ('(,)','(,)','(,)','(,)',1,0,true,false);
-- name: BandNullFields
INSERT INTO inspection_bands(reading_band,previous_band,encoded,canonical_text,minimum_score,expected_order,expected_equal,bypass) VALUES ('["(,)","(,)"]','["(,)","(,)"]','["(,)","(,)"]','["(,)","(,)"]',1,0,true,false);
-- name: BandBypassed
INSERT INTO inspection_bands(reading_band,previous_band,encoded,canonical_text,minimum_score,expected_order,expected_equal,bypass) VALUES ('empty','(,)','bad','wrong',99,99,false,true);
-- name: BandEnvelopeRejected
INSERT INTO inspection_bands(reading_band,previous_band,encoded,canonical_text,minimum_score,expected_order,expected_equal,bypass) VALUES ('["(3,abc)","(4,xyz)")','["(2,abc)","(4,xyz)")','["(3,abc)","(4,xyz)")','["(3,abc)","(4,xyz)")',1,1,false,false);

-- name: DocumentNullDatum
INSERT INTO inspection_documents(packet,expected_text,expected_document,pretty,bypass) VALUES (NULL,NULL,NULL,false,false);
-- name: DocumentNullFields
INSERT INTO inspection_documents(packet,expected_text,expected_document,pretty,bypass) VALUES (ROW(NULL,NULL,NULL)::inspection_packet,E'{"current_reading":null,"previous_reading":null,"history":null}',E'{"current_reading":null,"previous_reading":null,"history":null}',false,false);
-- name: DocumentNested
INSERT INTO inspection_documents(packet,expected_text,expected_document,pretty,bypass) VALUES (ROW(ROW(2,'ok','[1,3)'::int4range)::inspection_reading,NULL::inspection_reading,ARRAY[ROW(2,'ok','[1,3)'::int4range)::inspection_reading,NULL::inspection_reading])::inspection_packet,E'{"current_reading":{"score":2,"label":"ok","span":"[1,3)"},"previous_reading":null,"history":[{"score":2,"label":"ok","span":"[1,3)"},null]}',E'{"current_reading":{"score":2,"label":"ok","span":"[1,3)"},"previous_reading":null,"history":[{"score":2,"label":"ok","span":"[1,3)"},null]}',false,false);
-- name: DocumentPretty
INSERT INTO inspection_documents(packet,expected_text,expected_document,pretty,bypass) VALUES (ROW(ROW(2,'ok','[1,3)'::int4range)::inspection_reading,NULL::inspection_reading,ARRAY[ROW(2,'ok','[1,3)'::int4range)::inspection_reading,NULL::inspection_reading])::inspection_packet,E'{"current_reading":{"score":2,"label":"ok","span":"[1,3)"},\n "previous_reading":null,\n "history":[{"score":2,"label":"ok","span":"[1,3)"},null]}',E'{"current_reading":{"score":2,"label":"ok","span":"[1,3)"},"previous_reading":null,"history":[{"score":2,"label":"ok","span":"[1,3)"},null]}',true,false);
-- name: DocumentWrongText
INSERT INTO inspection_documents(packet,expected_text,expected_document,pretty,bypass) VALUES (ROW(ROW(2,'ok','[1,3)'::int4range)::inspection_reading,NULL::inspection_reading,ARRAY[ROW(2,'ok','[1,3)'::int4range)::inspection_reading,NULL::inspection_reading])::inspection_packet,E'{}',E'{"current_reading":{"score":2,"label":"ok","span":"[1,3)"},"previous_reading":null,"history":[{"score":2,"label":"ok","span":"[1,3)"},null]}',false,false);
-- name: DocumentWrongValue
INSERT INTO inspection_documents(packet,expected_text,expected_document,pretty,bypass) VALUES (ROW(ROW(2,'ok','[1,3)'::int4range)::inspection_reading,NULL::inspection_reading,ARRAY[ROW(2,'ok','[1,3)'::int4range)::inspection_reading,NULL::inspection_reading])::inspection_packet,E'{"current_reading":{"score":2,"label":"ok","span":"[1,3)"},"previous_reading":null,"history":[{"score":2,"label":"ok","span":"[1,3)"},null]}',E'{}',false,false);
-- name: DocumentBypassed
INSERT INTO inspection_documents(packet,expected_text,expected_document,pretty,bypass) VALUES (ROW(ROW(2,'ok','[1,3)'::int4range)::inspection_reading,NULL::inspection_reading,ARRAY[ROW(2,'ok','[1,3)'::int4range)::inspection_reading,NULL::inspection_reading])::inspection_packet,E'wrong',E'{}',false,true);

-- name: ProjectionDetailed
INSERT INTO inspection_projections(score,label,expected_document,detailed,bypass) VALUES (2,'ok','{"f1":2,"f2":"ok"}',true,false);
-- name: ProjectionCompact
INSERT INTO inspection_projections(score,label,expected_document,detailed,bypass) VALUES (2,'ok','{"f1":"ok"}',false,false);
-- name: ProjectionNullFields
INSERT INTO inspection_projections(score,label,expected_document,detailed,bypass) VALUES (NULL,NULL,'{"f1":null,"f2":null}',true,false);
-- name: ProjectionQuoted
INSERT INTO inspection_projections(score,label,expected_document,detailed,bypass) VALUES (2,'snow😊"','{"f1":"snow😊\""}',false,false);
-- name: ProjectionWrongLayout
INSERT INTO inspection_projections(score,label,expected_document,detailed,bypass) VALUES (2,'ok','{"f1":"ok"}',true,false);
-- name: ProjectionNegative
INSERT INTO inspection_projections(score,label,expected_document,detailed,bypass) VALUES (-1,'ok','{"f1":"ok"}',false,false);
-- name: ProjectionBypassed
INSERT INTO inspection_projections(score,label,expected_document,detailed,bypass) VALUES (-1,'ok','{}',true,true);

-- name: HashNullDatum
INSERT INTO inspection_hashes(draft,seed,expected_hash,expected_extended,expected_batch,bypass) VALUES (NULL,7,NULL,NULL,961,false);
-- name: HashNullFields
INSERT INTO inspection_hashes(draft,seed,expected_hash,expected_extended,expected_batch,bypass) VALUES (ROW(NULL,NULL)::draft_reading,7,0,0,961,false);
-- name: HashNestedBatch
INSERT INTO inspection_hashes(draft,seed,expected_hash,expected_extended,expected_batch,bypass) VALUES (ROW(2,'ok')::draft_reading,7,-1854282447,-916189391165704617,-1648180048,false);
-- name: HashNegative
INSERT INTO inspection_hashes(draft,seed,expected_hash,expected_extended,expected_batch,bypass) VALUES (ROW(-3,'abc')::draft_reading,7,1202743094,1168319434305396557,-1369668789,false);
-- name: HashNullSeed
INSERT INTO inspection_hashes(draft,seed,expected_hash,expected_extended,expected_batch,bypass) VALUES (ROW(2,'ok')::draft_reading,NULL,-1854282447,NULL,-1648180048,false);
-- name: HashWrong
INSERT INTO inspection_hashes(draft,seed,expected_hash,expected_extended,expected_batch,bypass) VALUES (ROW(2,'ok')::draft_reading,7,0,-916189391165704617,-1648180048,false);
-- name: HashExtendedWrong
INSERT INTO inspection_hashes(draft,seed,expected_hash,expected_extended,expected_batch,bypass) VALUES (ROW(2,'ok')::draft_reading,7,-1854282447,0,-1648180048,false);
-- name: HashBatchWrong
INSERT INTO inspection_hashes(draft,seed,expected_hash,expected_extended,expected_batch,bypass) VALUES (ROW(2,'ok')::draft_reading,7,-1854282447,-916189391165704617,0,false);
-- name: HashBypassed
INSERT INTO inspection_hashes(draft,seed,expected_hash,expected_extended,expected_batch,bypass) VALUES (ROW(2,'ok')::draft_reading,7,0,0,0,true);

-- name: FrameNull
INSERT INTO inspection_frames(vacant,expected,expected_length,use_primary,bypass) VALUES (NULL,NULL,NULL,true,false);
-- name: FrameEmpty
INSERT INTO inspection_frames(vacant,expected,expected_length,use_primary,bypass) VALUES ('()','\x00000000',4,true,false);
-- name: FrameFallback
INSERT INTO inspection_frames(vacant,expected,expected_length,use_primary,bypass) VALUES ('()','\x00000000',4,false,false);
-- name: FrameBytesWrong
INSERT INTO inspection_frames(vacant,expected,expected_length,use_primary,bypass) VALUES ('()','\x00',4,true,false);
-- name: FrameLengthWrong
INSERT INTO inspection_frames(vacant,expected,expected_length,use_primary,bypass) VALUES ('()','\x00000000',3,true,false);
-- name: FrameSelectionWrong
INSERT INTO inspection_frames(vacant,expected,expected_length,use_primary,bypass) VALUES (NULL,NULL,NULL,false,false);
-- name: FrameBypassed
INSERT INTO inspection_frames(vacant,expected,expected_length,use_primary,bypass) VALUES ('()','\x00',3,false,true);

-- name: ExpansionNull
INSERT INTO inspection_expansions(score,label,minimum_score,expected_document,expected_label,bypass) VALUES (NULL,NULL,NULL,'{"f1":null,"f2":null}',NULL,false);
-- name: ExpansionFields
INSERT INTO inspection_expansions(score,label,minimum_score,expected_document,expected_label,bypass) VALUES (2,'abc',2,'{"f1":2,"f2":"abc"}','abc',false);
-- name: ExpansionWidth
INSERT INTO inspection_expansions(score,label,minimum_score,expected_document,expected_label,bypass) VALUES (2,'abcdef',2,'{"f1":2,"f2":"abc"}','abc',false);
-- name: ExpansionQuoted
INSERT INTO inspection_expansions(score,label,minimum_score,expected_document,expected_label,bypass) VALUES (2,'a"😊',2,'{"f1":2,"f2":"a\"😊"}','a"😊',false);
-- name: ExpansionLowScore
INSERT INTO inspection_expansions(score,label,minimum_score,expected_document,expected_label,bypass) VALUES (-1,'abc',0,'{"f1":-1,"f2":"abc"}','abc',false);
-- name: ExpansionWrongDocument
INSERT INTO inspection_expansions(score,label,minimum_score,expected_document,expected_label,bypass) VALUES (2,'abc',2,'{}','abc',false);
-- name: ExpansionWrongLabel
INSERT INTO inspection_expansions(score,label,minimum_score,expected_document,expected_label,bypass) VALUES (2,'abc',2,'{"f1":2,"f2":"abc"}','wrong',false);
-- name: ExpansionWrongOwner
INSERT INTO inspection_expansions(score,label,minimum_score,expected_document,expected_label,bypass) VALUES (3,'abc',2,'{"f1":3,"f2":"abc"}','abc',false);
-- name: ExpansionOverflow
INSERT INTO inspection_expansions(score,label,minimum_score,expected_document,expected_label,bypass) VALUES (70000,'abc',70000,'{}','abc',false);
-- name: ExpansionBypassed
INSERT INTO inspection_expansions(score,label,minimum_score,expected_document,expected_label,bypass) VALUES (70000,'abcdef',99999,'{}','wrong',true);

-- name: FieldCallNull
INSERT INTO inspection_field_calls(reading,expected_score,expected_label,expected_document,expected_count,bypass) VALUES (NULL,NULL,NULL,NULL,NULL,false);
-- name: FieldCallAllNull
INSERT INTO inspection_field_calls(reading,expected_score,expected_label,expected_document,expected_count,bypass) VALUES (ROW(NULL,NULL,NULL)::inspection_display,NULL,NULL,'{"score":null,"to_jsonb":null,"labels":null}',NULL,false);
-- name: FieldCallKnown
INSERT INTO inspection_field_calls(reading,expected_score,expected_label,expected_document,expected_count,bypass) VALUES (ROW(2,'ok',ARRAY['a','b'])::inspection_display,2,'ok','{"score":2,"to_jsonb":"ok","labels":["a","b"]}',2,false);
-- name: FieldCallUnicode
INSERT INTO inspection_field_calls(reading,expected_score,expected_label,expected_document,expected_count,bypass) VALUES (ROW(-1,'snow😊',ARRAY[]::text[])::inspection_display,-1,'snow😊','{"score":-1,"to_jsonb":"snow😊","labels":[]}',0,false);
-- name: FieldCallWrongScore
INSERT INTO inspection_field_calls(reading,expected_score,expected_label,expected_document,expected_count,bypass) VALUES (ROW(2,'ok',ARRAY['a'])::inspection_display,3,'ok','{"score":2,"to_jsonb":"ok","labels":["a"]}',1,false);
-- name: FieldCallWrongLabel
INSERT INTO inspection_field_calls(reading,expected_score,expected_label,expected_document,expected_count,bypass) VALUES (ROW(2,'ok',ARRAY['a'])::inspection_display,2,'wrong','{"score":2,"to_jsonb":"ok","labels":["a"]}',1,false);
-- name: FieldCallWrongDocument
INSERT INTO inspection_field_calls(reading,expected_score,expected_label,expected_document,expected_count,bypass) VALUES (ROW(2,'ok',ARRAY['a'])::inspection_display,2,'ok','{}',1,false);
-- name: FieldCallWrongCount
INSERT INTO inspection_field_calls(reading,expected_score,expected_label,expected_document,expected_count,bypass) VALUES (ROW(2,'ok',ARRAY['a'])::inspection_display,2,'ok','{"score":2,"to_jsonb":"ok","labels":["a"]}',2,false);
-- name: FieldCallBypassed
INSERT INTO inspection_field_calls(reading,expected_score,expected_label,expected_document,expected_count,bypass) VALUES (ROW(2,'ok',ARRAY['a'])::inspection_display,3,'wrong','{}',2,true);

-- name: OriginNull
INSERT INTO inspection_origins(score,label) VALUES (NULL,NULL);
-- name: OriginKnown
INSERT INTO inspection_origins(score,label) VALUES (2,'ok');
-- name: OriginRejected
INSERT INTO inspection_origins(score,label) VALUES (-1,'bad');
-- name: ExtensionNull
INSERT INTO inspection_extensions(sequence,label,score,retained) VALUES (0,NULL,NULL,false);
-- name: ExtensionKnown
INSERT INTO inspection_extensions(sequence,label,score,retained) VALUES (0,'ok',2,true);
-- name: ExtensionRejected
INSERT INTO inspection_extensions(sequence,label,score,retained) VALUES (0,'bad',-1,true);
-- name: AncestorNull
INSERT INTO inspection_inherited_values(reading,minimum_score,expected_label,expected_document,bypass) VALUES (NULL,0,NULL,NULL,false);
-- name: AncestorAllNull
INSERT INTO inspection_inherited_values(reading,minimum_score,expected_label,expected_document,bypass) VALUES (ROW(99,NULL,NULL,true)::inspection_extensions,0,NULL,'{"score":null,"label":null}',false);
-- name: AncestorKnown
INSERT INTO inspection_inherited_values(reading,minimum_score,expected_label,expected_document,bypass) VALUES (ROW(99,'ok',2,true)::inspection_extensions,1,'ok','{"score":2,"label":"ok"}',false);
-- name: AncestorExternalValue
INSERT INTO inspection_inherited_values(reading,minimum_score,expected_label,expected_document,bypass) VALUES (ROW(99,'negative',-1,true)::inspection_extensions,-1,'negative','{"score":-1,"label":"negative"}',false);
-- name: AncestorLowScore
INSERT INTO inspection_inherited_values(reading,minimum_score,expected_label,expected_document,bypass) VALUES (ROW(99,'ok',2,true)::inspection_extensions,3,'ok','{"score":2,"label":"ok"}',false);
-- name: AncestorWrongLabel
INSERT INTO inspection_inherited_values(reading,minimum_score,expected_label,expected_document,bypass) VALUES (ROW(99,'ok',2,true)::inspection_extensions,1,'wrong','{"score":2,"label":"ok"}',false);
-- name: AncestorWrongDocument
INSERT INTO inspection_inherited_values(reading,minimum_score,expected_label,expected_document,bypass) VALUES (ROW(99,'ok',2,true)::inspection_extensions,1,'ok','{}',false);
-- name: AncestorBypassed
INSERT INTO inspection_inherited_values(reading,minimum_score,expected_label,expected_document,bypass) VALUES (ROW(99,'bad',-1,true)::inspection_extensions,999,'wrong','{}',true);

-- name: WholeRowNullFields
INSERT INTO inspection_whole_rows(score,label,minimum_score,expected_present,bypass) VALUES (NULL,NULL,NULL,false,false);
-- name: WholeRowKnown
INSERT INTO inspection_whole_rows(score,label,minimum_score,expected_present,bypass) VALUES (3,'ok',1,true,false);
-- name: WholeRowMissingLabel
INSERT INTO inspection_whole_rows(score,label,minimum_score,expected_present,bypass) VALUES (3,NULL,1,false,false);
-- name: WholeRowLowScore
INSERT INTO inspection_whole_rows(score,label,minimum_score,expected_present,bypass) VALUES (-1,'bad',1,true,false);
-- name: WholeRowWrongPresence
INSERT INTO inspection_whole_rows(score,label,minimum_score,expected_present,bypass) VALUES (3,'ok',1,false,false);
-- name: WholeRowBypassed
INSERT INTO inspection_whole_rows(score,label,minimum_score,expected_present,bypass) VALUES (-1,NULL,999,true,true);
-- name: NamedRowNullColumn
INSERT INTO inspection_named_rows(inspection_named_rows,score,minimum_score,bypass) VALUES (NULL,3,1,false);
-- name: NamedRowKnown
INSERT INTO inspection_named_rows(inspection_named_rows,score,minimum_score,bypass) VALUES (2,3,1,false);
-- name: NamedRowNegativeColumn
INSERT INTO inspection_named_rows(inspection_named_rows,score,minimum_score,bypass) VALUES (-1,3,1,false);
-- name: NamedRowLowScore
INSERT INTO inspection_named_rows(inspection_named_rows,score,minimum_score,bypass) VALUES (2,3,4,false);
-- name: NamedRowBypassed
INSERT INTO inspection_named_rows(inspection_named_rows,score,minimum_score,bypass) VALUES (-1,3,999,true);

-- name: CommonRowSelected
INSERT INTO inspection_common_values(reading,fallback,readings,minimum_score,expected_document,expected_batch,bypass) VALUES (ROW(9,'ok',3,true)::inspection_extensions,ROW(7,'fallback')::inspection_origins,ARRAY[ROW(1,'a')::inspection_origins],1,'{"score":3,"label":"ok"}','[{"score":1,"label":"a"},{"score":3,"label":"ok"}]',false);
-- name: CommonRowFallback
INSERT INTO inspection_common_values(reading,fallback,readings,minimum_score,expected_document,expected_batch,bypass) VALUES (NULL,ROW(3,'ok')::inspection_origins,NULL,1,'{"score":3,"label":"ok"}','[null]',false);
-- name: CommonRowLiveNulls
INSERT INTO inspection_common_values(reading,fallback,readings,minimum_score,expected_document,expected_batch,bypass) VALUES (ROW(9,NULL,NULL,false)::inspection_extensions,ROW(3,'fallback')::inspection_origins,ARRAY[]::inspection_origins[],1,'{"score":null,"label":null}','[{"score":null,"label":null}]',false);
-- name: CommonRowLowScore
INSERT INTO inspection_common_values(reading,fallback,readings,minimum_score,expected_document,expected_batch,bypass) VALUES (ROW(9,'ok',0,true)::inspection_extensions,NULL,ARRAY[]::inspection_origins[],1,'{"score":0,"label":"ok"}','[{"score":0,"label":"ok"}]',false);
-- name: CommonRowWrongDocument
INSERT INTO inspection_common_values(reading,fallback,readings,minimum_score,expected_document,expected_batch,bypass) VALUES (ROW(9,'ok',3,true)::inspection_extensions,NULL,ARRAY[]::inspection_origins[],1,'{}','[{"score":3,"label":"ok"}]',false);
-- name: CommonRowWrongBatch
INSERT INTO inspection_common_values(reading,fallback,readings,minimum_score,expected_document,expected_batch,bypass) VALUES (ROW(9,'ok',3,true)::inspection_extensions,NULL,ARRAY[]::inspection_origins[],1,'{"score":3,"label":"ok"}','[]',false);
-- name: CommonRowBypassed
INSERT INTO inspection_common_values(reading,fallback,readings,minimum_score,expected_document,expected_batch,bypass) VALUES (ROW(9,'bad',-1,true)::inspection_extensions,NULL,NULL,999,NULL,NULL,true);

-- name: TypedReadingKnown
INSERT INTO inspection_typed_readings(score,label,approved,bypass) VALUES (3,'ok',true,false);
-- name: TypedReadingNull
INSERT INTO inspection_typed_readings(score,label,approved,bypass) VALUES (NULL,NULL,NULL,false);
-- name: TypedReadingNegative
INSERT INTO inspection_typed_readings(score,label,approved,bypass) VALUES (-1,'bad',true,false);
-- name: TypedReadingUnapproved
INSERT INTO inspection_typed_readings(score,label,approved,bypass) VALUES (3,'bad',false,false);
-- name: TypedReadingBypassed
INSERT INTO inspection_typed_readings(score,label,approved,bypass) VALUES (-1,'bad',false,true);
-- name: TypedBatchKnown
INSERT INTO inspection_typed_batches(reading,fallback,minimum_score,expected_batch,bypass) VALUES (ROW(3,'ok',true,false)::inspection_typed_readings,ROW(4,'fallback',true,false)::inspection_reading_kind,1,'[{"score":3,"label":"ok","approved":true,"bypass":false},{"score":4,"label":"fallback","approved":true,"bypass":false}]',false);
-- name: TypedBatchFallback
INSERT INTO inspection_typed_batches(reading,fallback,minimum_score,expected_batch,bypass) VALUES (NULL,ROW(3,'ok',true,false)::inspection_reading_kind,1,'[null,{"score":3,"label":"ok","approved":true,"bypass":false}]',false);
-- name: TypedBatchLiveNulls
INSERT INTO inspection_typed_batches(reading,fallback,minimum_score,expected_batch,bypass) VALUES (ROW(NULL,NULL,NULL,NULL)::inspection_typed_readings,NULL,1,'[{"score":null,"label":null,"approved":null,"bypass":null},null]',false);
-- name: TypedBatchLowScore
INSERT INTO inspection_typed_batches(reading,fallback,minimum_score,expected_batch,bypass) VALUES (ROW(0,'low',true,false)::inspection_typed_readings,NULL,1,'[{"score":0,"label":"low","approved":true,"bypass":false},null]',false);
-- name: TypedBatchWrongDocument
INSERT INTO inspection_typed_batches(reading,fallback,minimum_score,expected_batch,bypass) VALUES (ROW(3,'ok',true,false)::inspection_typed_readings,NULL,1,'[]',false);
-- name: TypedBatchBypassed
INSERT INTO inspection_typed_batches(reading,fallback,minimum_score,expected_batch,bypass) VALUES (ROW(-1,'bad',false,false)::inspection_typed_readings,NULL,999,NULL,true);

-- name: ImportedBatchKnown
INSERT INTO inspection_import_batches(reading,fallback,minimum_score,expected_batch,bypass) VALUES (ROW('3','ok','true','false')::inspection_import_fields,ROW(4,'fallback',true,false)::inspection_reading_kind,1,'[{"score":3,"label":"ok","approved":true,"bypass":false},{"score":4,"label":"fallback","approved":true,"bypass":false}]',false);
-- name: ImportedBatchFallback
INSERT INTO inspection_import_batches(reading,fallback,minimum_score,expected_batch,bypass) VALUES (NULL,ROW(3,'ok',true,false)::inspection_reading_kind,1,'[null,{"score":3,"label":"ok","approved":true,"bypass":false}]',false);
-- name: ImportedBatchLiveNulls
INSERT INTO inspection_import_batches(reading,fallback,minimum_score,expected_batch,bypass) VALUES (ROW(NULL,NULL,NULL,NULL)::inspection_import_fields,NULL,1,'[{"score":null,"label":null,"approved":null,"bypass":null},null]',false);
-- name: ImportedBatchLowScore
INSERT INTO inspection_import_batches(reading,fallback,minimum_score,expected_batch,bypass) VALUES (ROW('0','low','true','false')::inspection_import_fields,NULL,1,'[{"score":0,"label":"low","approved":true,"bypass":false},null]',false);
-- name: ImportedBatchWrongDocument
INSERT INTO inspection_import_batches(reading,fallback,minimum_score,expected_batch,bypass) VALUES (ROW('3','ok','true','false')::inspection_import_fields,NULL,1,'[]',false);
-- name: ImportedBatchBadScore
INSERT INTO inspection_import_batches(reading,fallback,minimum_score,expected_batch,bypass) VALUES (ROW('bad','ok','true','false')::inspection_import_fields,NULL,1,NULL,false);
-- name: ImportedBatchBadApproval
INSERT INTO inspection_import_batches(reading,fallback,minimum_score,expected_batch,bypass) VALUES (ROW('3','ok','bad','false')::inspection_import_fields,NULL,1,NULL,false);
-- name: ImportedBatchBypassed
INSERT INTO inspection_import_batches(reading,fallback,minimum_score,expected_batch,bypass) VALUES (ROW('bad','bad','bad','bad')::inspection_import_fields,NULL,999,NULL,true);
-- name: RecheckedRecordNull
INSERT INTO inspection_record_rechecks(reading,minimum_score,expected_empty,bypass) VALUES (NULL,1,true,false);
-- name: RecheckedRecordWrongNull
INSERT INTO inspection_record_rechecks(reading,minimum_score,expected_empty,bypass) VALUES (NULL,1,false,false);
-- name: RecheckedRecordTooWide
INSERT INTO inspection_record_rechecks(reading,minimum_score,expected_empty,bypass) VALUES (ROW(9,'ok',3,true)::inspection_extensions,1,false,false);
-- name: RecheckedRecordNullFields
INSERT INTO inspection_record_rechecks(reading,minimum_score,expected_empty,bypass) VALUES (ROW(NULL,NULL,NULL,NULL)::inspection_extensions,1,true,false);
-- name: RecheckedRecordBypassed
INSERT INTO inspection_record_rechecks(reading,minimum_score,expected_empty,bypass) VALUES (ROW(9,'bad',-1,false)::inspection_extensions,999,false,true);

-- name: MixedConversionRowKnown
INSERT INTO inspection_mixed_conversions(reading,fallback,minimum_score,expected_document,use_text,bypass) VALUES (ROW(9,'ok',3,true)::inspection_extensions,NULL,1,'{"score":3,"label":"ok"}',false,false);
-- name: MixedConversionRowFallback
INSERT INTO inspection_mixed_conversions(reading,fallback,minimum_score,expected_document,use_text,bypass) VALUES (NULL,ROW(3,'fallback')::inspection_origins,1,'{"score":3,"label":"fallback"}',false,false);
-- name: MixedConversionRowLiveNulls
INSERT INTO inspection_mixed_conversions(reading,fallback,minimum_score,expected_document,use_text,bypass) VALUES (ROW(NULL,NULL,NULL,NULL)::inspection_extensions,NULL,1,'{"score":null,"label":null}',false,false);
-- name: MixedConversionRowLowScore
INSERT INTO inspection_mixed_conversions(reading,fallback,minimum_score,expected_document,use_text,bypass) VALUES (ROW(9,'low',0,true)::inspection_extensions,NULL,1,'{"score":0,"label":"low"}',false,false);
-- name: MixedConversionRowWrongDocument
INSERT INTO inspection_mixed_conversions(reading,fallback,minimum_score,expected_document,use_text,bypass) VALUES (ROW(9,'ok',3,true)::inspection_extensions,NULL,1,'{}',false,false);
-- name: MixedConversionTextTooWide
INSERT INTO inspection_mixed_conversions(reading,fallback,minimum_score,expected_document,use_text,bypass) VALUES (ROW(9,'ok',3,true)::inspection_extensions,NULL,1,NULL,true,false);
-- name: MixedConversionTextNull
INSERT INTO inspection_mixed_conversions(reading,fallback,minimum_score,expected_document,use_text,bypass) VALUES (NULL,ROW(3,'fallback')::inspection_origins,1,NULL,true,false);
-- name: MixedConversionTextLiveNulls
INSERT INTO inspection_mixed_conversions(reading,fallback,minimum_score,expected_document,use_text,bypass) VALUES (ROW(NULL,NULL,NULL,NULL)::inspection_extensions,NULL,1,NULL,true,false);
-- name: MixedConversionBypassed
INSERT INTO inspection_mixed_conversions(reading,fallback,minimum_score,expected_document,use_text,bypass) VALUES (ROW(9,'bad',-1,false)::inspection_extensions,NULL,999,'{}',true,true);

-- name: AnonymousRecordsEqual
INSERT INTO inspection_anonymous_comparisons(n,m,label,other_label,divisor,pick_number,expected_equal,expected_order,expected_selected,expected_arithmetic,bypass) VALUES(1,1,'x','x',1,true,true,0,true,true,false);
-- name: AnonymousRecordsOrdered
INSERT INTO inspection_anonymous_comparisons(n,m,label,other_label,divisor,pick_number,expected_equal,expected_order,expected_selected,expected_arithmetic,bypass) VALUES(1,2,'x','x',1,true,false,-1,false,false,false);
-- name: AnonymousRecordsNullFields
INSERT INTO inspection_anonymous_comparisons(n,m,label,other_label,divisor,pick_number,expected_equal,expected_order,expected_selected,expected_arithmetic,bypass) VALUES(NULL,NULL,NULL,NULL,1,true,true,0,true,true,false);
-- name: AnonymousRecordsNullOrder
INSERT INTO inspection_anonymous_comparisons(n,m,label,other_label,divisor,pick_number,expected_equal,expected_order,expected_selected,expected_arithmetic,bypass) VALUES(NULL,1,NULL,NULL,1,true,false,1,false,false,false);
-- name: AnonymousRecordsSelectedText
INSERT INTO inspection_anonymous_comparisons(n,m,label,other_label,divisor,pick_number,expected_equal,expected_order,expected_selected,expected_arithmetic,bypass) VALUES(1,2,'x','x',1,false,false,-1,true,false,false);
-- name: AnonymousRecordsWrongExpectation
INSERT INTO inspection_anonymous_comparisons(n,m,label,other_label,divisor,pick_number,expected_equal,expected_order,expected_selected,expected_arithmetic,bypass) VALUES(1,1,'x','x',1,true,false,0,true,true,false);
-- name: AnonymousRecordsEagerError
INSERT INTO inspection_anonymous_comparisons(n,m,label,other_label,divisor,pick_number,expected_equal,expected_order,expected_selected,expected_arithmetic,bypass) VALUES(1,2,'x','x',0,true,false,-1,false,false,false);
-- name: AnonymousRecordsSkipped
INSERT INTO inspection_anonymous_comparisons(n,m,label,other_label,divisor,pick_number,expected_equal,expected_order,expected_selected,expected_arithmetic,bypass) VALUES(1,2,'x','x',0,true,true,999,true,true,true);
-- name: AnonymousRecordsReverseOrder
INSERT INTO inspection_anonymous_comparisons(n,m,label,other_label,divisor,pick_number,expected_equal,expected_order,expected_selected,expected_arithmetic,bypass) VALUES(2,1,'x','x',1,true,false,1,false,false,false);

-- name: AnonymousInputNull
INSERT INTO inspection_record_inputs(source_record,expected_document,expected_dimensions,expected_array_text,score,label,expected_row_text,bypass) VALUES(NULL,NULL,NULL,NULL,1,'x','{"(1,x)"}',false);
-- name: AnonymousInputEmpty
INSERT INTO inspection_record_inputs(source_record,expected_document,expected_dimensions,expected_array_text,score,label,expected_row_text,bypass) VALUES('{}','[]',NULL,'{}',1,'x','{"(1,x)"}',false);
-- name: AnonymousInputBounds
INSERT INTO inspection_record_inputs(source_record,expected_document,expected_dimensions,expected_array_text,score,label,expected_row_text,bypass) VALUES('[0:1]={NULL,NULL}','[null,null]','[0:1]','[0:1]={NULL,NULL}',NULL,NULL,'{"(,)"}',false);
-- name: AnonymousInputUnavailableRecord
INSERT INTO inspection_record_inputs(source_record,expected_document,expected_dimensions,expected_array_text,score,label,expected_row_text,bypass) VALUES('{x}',NULL,NULL,NULL,1,'x','{"(1,x)"}',false);
-- name: AnonymousInputMalformedArray
INSERT INTO inspection_record_inputs(source_record,expected_document,expected_dimensions,expected_array_text,score,label,expected_row_text,bypass) VALUES('{NULL,}',NULL,NULL,NULL,1,'x','{"(1,x)"}',false);
-- name: AnonymousInputWrongDocument
INSERT INTO inspection_record_inputs(source_record,expected_document,expected_dimensions,expected_array_text,score,label,expected_row_text,bypass) VALUES('{}','{}',NULL,'{}',1,'x','{"(1,x)"}',false);
-- name: AnonymousInputBadAliasScore
INSERT INTO inspection_record_inputs(source_record,expected_document,expected_dimensions,expected_array_text,score,label,expected_row_text,bypass) VALUES('{}','[]',NULL,'{}',32768,'x','{"(32768,x)"}',false);
-- name: AnonymousInputBypassed
INSERT INTO inspection_record_inputs(source_record,expected_document,expected_dimensions,expected_array_text,score,label,expected_row_text,bypass) VALUES('{x}','{}','wrong','wrong',32768,'long','wrong',true);

-- name: GenericArrayNamedFields
INSERT INTO inspection_generic_arrays(score,alternate_score,label,expected_document,expected_sorted,expected_text,extended_requested,bypass) VALUES(1,2,'x','[{"score":1,"label":"x"}]','[{"score":1,"label":"x"},{"score":2,"label":"x"}]','{"(1,x)"}',false,false);
-- name: GenericArrayReverseOrder
INSERT INTO inspection_generic_arrays(score,alternate_score,label,expected_document,expected_sorted,expected_text,extended_requested,bypass) VALUES(2,1,'x','[{"score":2,"label":"x"}]','[{"score":1,"label":"x"},{"score":2,"label":"x"}]','{"(2,x)"}',false,false);
-- name: GenericArrayNullFields
INSERT INTO inspection_generic_arrays(score,alternate_score,label,expected_document,expected_sorted,expected_text,extended_requested,bypass) VALUES(NULL,NULL,NULL,'[{"score":null,"label":null}]','[{"score":null,"label":null},{"score":null,"label":null}]','{"(,)"}',false,false);
-- name: GenericArrayWrongDocument
INSERT INTO inspection_generic_arrays(score,alternate_score,label,expected_document,expected_sorted,expected_text,extended_requested,bypass) VALUES(1,2,'x','{}','[{"score":1,"label":"x"},{"score":2,"label":"x"}]','{"(1,x)"}',false,false);
-- name: GenericArrayMissingExtendedHash
INSERT INTO inspection_generic_arrays(score,alternate_score,label,expected_document,expected_sorted,expected_text,extended_requested,bypass) VALUES(1,2,'x','[{"score":1,"label":"x"}]','[{"score":1,"label":"x"},{"score":2,"label":"x"}]','{"(1,x)"}',true,false);
-- name: GenericArrayBypassed
INSERT INTO inspection_generic_arrays(score,alternate_score,label,expected_document,expected_sorted,expected_text,extended_requested,bypass) VALUES(32768,-32769,'long','{}','{}','wrong',true,true);

-- name: HistoricalRowPresent
INSERT INTO inspection_historical_rows(score,denominator,expected_present,expected_text,bypass) VALUES(1,1,true,'(1)',false);
-- name: HistoricalRowNull
INSERT INTO inspection_historical_rows(score,denominator,expected_present,expected_text,bypass) VALUES(NULL,0,false,'()',false);
-- name: HistoricalRowMissingRatio
INSERT INTO inspection_historical_rows(score,denominator,expected_present,expected_text,bypass) VALUES(1,NULL,false,'(1)',false);
-- name: HistoricalRowOldError
INSERT INTO inspection_historical_rows(score,denominator,expected_present,expected_text,bypass) VALUES(1,0,true,'(1)',false);
-- name: HistoricalRowWrongPresence
INSERT INTO inspection_historical_rows(score,denominator,expected_present,expected_text,bypass) VALUES(1,1,false,'(1)',false);
-- name: HistoricalRowWrongText
INSERT INTO inspection_historical_rows(score,denominator,expected_present,expected_text,bypass) VALUES(1,1,true,'()',false);
-- name: HistoricalRowBypassed
INSERT INTO inspection_historical_rows(score,denominator,expected_present,expected_text,bypass) VALUES(1,0,false,'wrong',true);

-- name: HistoricalCaptionPresent
INSERT INTO inspection_historical_captions(score,label,expected_present,expected_document,bypass) VALUES(1,'blue',true,'{"score":1}',false);
-- name: HistoricalCaptionRemoved
INSERT INTO inspection_historical_captions(score,label,expected_present,expected_document,bypass) VALUES(1,'RED',false,'{"score":1}',false);
-- name: HistoricalCaptionNull
INSERT INTO inspection_historical_captions(score,label,expected_present,expected_document,bypass) VALUES(NULL,NULL,false,'{"score":null}',false);
-- name: HistoricalCaptionWrongPresence
INSERT INTO inspection_historical_captions(score,label,expected_present,expected_document,bypass) VALUES(1,'RED',true,'{"score":1}',false);
-- name: HistoricalCaptionWrongDocument
INSERT INTO inspection_historical_captions(score,label,expected_present,expected_document,bypass) VALUES(1,'blue',true,'{}',false);
-- name: HistoricalCaptionBypassed
INSERT INTO inspection_historical_captions(score,label,expected_present,expected_document,bypass) VALUES(1,'bad',false,'{}',true);

-- name: HistoricalComparisonSkippedRatio
INSERT INTO inspection_comparison_history(score,alternate_score,denominator,label,reference_label,expected_distinct,expected_member,bypass) VALUES(1,2,0,'abcdef','wrong',true,false,false);
-- name: HistoricalComparisonWidth
INSERT INTO inspection_comparison_history(score,alternate_score,denominator,label,reference_label,expected_distinct,expected_member,bypass) VALUES(1,1,1,'abc','ab',false,true,false);
-- name: HistoricalComparisonCaption
INSERT INTO inspection_comparison_history(score,alternate_score,denominator,label,reference_label,expected_distinct,expected_member,bypass) VALUES(1,1,1,'xy','ab',true,false,false);
-- name: HistoricalComparisonNulls
INSERT INTO inspection_comparison_history(score,alternate_score,denominator,label,reference_label,expected_distinct,expected_member,bypass) VALUES(NULL,NULL,0,NULL,NULL,false,NULL,false);
-- name: HistoricalComparisonOldError
INSERT INTO inspection_comparison_history(score,alternate_score,denominator,label,reference_label,expected_distinct,expected_member,bypass) VALUES(1,1,0,'ab','ab',true,false,false);
-- name: HistoricalComparisonWrongDifference
INSERT INTO inspection_comparison_history(score,alternate_score,denominator,label,reference_label,expected_distinct,expected_member,bypass) VALUES(1,2,0,'ab','ab',false,false,false);
-- name: HistoricalComparisonWrongMember
INSERT INTO inspection_comparison_history(score,alternate_score,denominator,label,reference_label,expected_distinct,expected_member,bypass) VALUES(1,1,1,'abc','ab',false,false,false);
-- name: HistoricalComparisonBypassed
INSERT INTO inspection_comparison_history(score,alternate_score,denominator,label,reference_label,expected_distinct,expected_member,bypass) VALUES(1,1,0,'abcdef','wrong',true,false,true);
-- name: HistoricalComparisonFixedRecord
INSERT INTO inspection_comparison_history(score,alternate_score,denominator,label,reference_label,expected_distinct,expected_member,bypass) VALUES(0,2,1,'ab','xy',true,false,false);

-- name: HistoricalNumericFraction
INSERT INTO inspection_numeric_history(score,alternate_score,denominator,fractional,expected_distinct,expected_present,bypass) VALUES(1,1,1,true,true,true,false);
-- name: HistoricalNumericWhole
INSERT INTO inspection_numeric_history(score,alternate_score,denominator,fractional,expected_distinct,expected_present,bypass) VALUES(1,1,1,false,false,true,false);
-- name: HistoricalNumericDifferentScores
INSERT INTO inspection_numeric_history(score,alternate_score,denominator,fractional,expected_distinct,expected_present,bypass) VALUES(1,2,1,false,true,true,false);
-- name: HistoricalNumericNullScores
INSERT INTO inspection_numeric_history(score,alternate_score,denominator,fractional,expected_distinct,expected_present,bypass) VALUES(NULL,NULL,1,false,false,false,false);
-- name: HistoricalNumericNullAmount
INSERT INTO inspection_numeric_history(score,alternate_score,denominator,fractional,expected_distinct,expected_present,bypass) VALUES(1,1,NULL,false,false,false,false);
-- name: HistoricalNumericOldError
INSERT INTO inspection_numeric_history(score,alternate_score,denominator,fractional,expected_distinct,expected_present,bypass) VALUES(1,1,0,true,true,true,false);
-- name: HistoricalNumericWrongDifference
INSERT INTO inspection_numeric_history(score,alternate_score,denominator,fractional,expected_distinct,expected_present,bypass) VALUES(1,1,1,true,false,true,false);
-- name: HistoricalNumericWrongPresence
INSERT INTO inspection_numeric_history(score,alternate_score,denominator,fractional,expected_distinct,expected_present,bypass) VALUES(1,1,1,false,false,false,false);
-- name: HistoricalNumericBypassed
INSERT INTO inspection_numeric_history(score,alternate_score,denominator,fractional,expected_distinct,expected_present,bypass) VALUES(1,1,0,true,false,false,true);

-- name: HistoricalFloatNan
INSERT INTO inspection_float_history(score,denominator,expected_nan,expected_present,expected_zero_present,bypass) VALUES(1,1,'\x7ff8000000000000'::bytea,true,true,false);
-- name: HistoricalFloatDifferentNan
INSERT INTO inspection_float_history(score,denominator,expected_nan,expected_present,expected_zero_present,bypass) VALUES(1,1,'\x0000000000000000'::bytea,false,true,false);
-- name: HistoricalFloatNullNan
INSERT INTO inspection_float_history(score,denominator,expected_nan,expected_present,expected_zero_present,bypass) VALUES(1,1,NULL,false,true,false);
-- name: HistoricalFloatNullScore
INSERT INTO inspection_float_history(score,denominator,expected_nan,expected_present,expected_zero_present,bypass) VALUES(NULL,1,'\x7ff8000000000000'::bytea,false,false,false);
-- name: HistoricalFloatNullRatio
INSERT INTO inspection_float_history(score,denominator,expected_nan,expected_present,expected_zero_present,bypass) VALUES(1,NULL,'\x7ff8000000000000'::bytea,false,false,false);
-- name: HistoricalFloatNanError
INSERT INTO inspection_float_history(score,denominator,expected_nan,expected_present,expected_zero_present,bypass) VALUES(1,0,'\x7ff8000000000000'::bytea,true,true,false);
-- name: HistoricalFloatZeroError
INSERT INTO inspection_float_history(score,denominator,expected_nan,expected_present,expected_zero_present,bypass) VALUES(1,0,'\x0000000000000000'::bytea,false,true,false);
-- name: HistoricalFloatWrongPresence
INSERT INTO inspection_float_history(score,denominator,expected_nan,expected_present,expected_zero_present,bypass) VALUES(1,1,'\x7ff8000000000000'::bytea,false,true,false);
-- name: HistoricalFloatWrongZero
INSERT INTO inspection_float_history(score,denominator,expected_nan,expected_present,expected_zero_present,bypass) VALUES(1,1,'\x7ff8000000000000'::bytea,true,false,false);
-- name: HistoricalFloatBypassed
INSERT INTO inspection_float_history(score,denominator,expected_nan,expected_present,expected_zero_present,bypass) VALUES(1,0,'\x7ff8000000000000'::bytea,false,false,true);

-- name: HistoricalTemporalBytes
INSERT INTO inspection_temporal_history(score,denominator,expected_instant,expected_duration,expected_instant_present,expected_duration_present,bypass) VALUES(1,1,'\x00001f5b645a48c0'::bytea,'\xfffffffd6daaacba00000002ffffffff'::bytea,true,true,false);
-- name: HistoricalTemporalDifferentInstant
INSERT INTO inspection_temporal_history(score,denominator,expected_instant,expected_duration,expected_instant_present,expected_duration_present,bypass) VALUES(1,1,'\x00'::bytea,'\xfffffffd6daaacba00000002ffffffff'::bytea,false,true,false);
-- name: HistoricalTemporalDifferentDuration
INSERT INTO inspection_temporal_history(score,denominator,expected_instant,expected_duration,expected_instant_present,expected_duration_present,bypass) VALUES(1,1,'\x00001f5b645a48c0'::bytea,'\x00'::bytea,true,false,false);
-- name: HistoricalTemporalNullBytes
INSERT INTO inspection_temporal_history(score,denominator,expected_instant,expected_duration,expected_instant_present,expected_duration_present,bypass) VALUES(1,1,NULL,NULL,false,false,false);
-- name: HistoricalTemporalNullScore
INSERT INTO inspection_temporal_history(score,denominator,expected_instant,expected_duration,expected_instant_present,expected_duration_present,bypass) VALUES(NULL,1,'\x00001f5b645a48c0'::bytea,'\xfffffffd6daaacba00000002ffffffff'::bytea,false,false,false);
-- name: HistoricalTemporalNullRatio
INSERT INTO inspection_temporal_history(score,denominator,expected_instant,expected_duration,expected_instant_present,expected_duration_present,bypass) VALUES(1,NULL,'\x00001f5b645a48c0'::bytea,'\xfffffffd6daaacba00000002ffffffff'::bytea,false,false,false);
-- name: HistoricalTemporalInstantError
INSERT INTO inspection_temporal_history(score,denominator,expected_instant,expected_duration,expected_instant_present,expected_duration_present,bypass) VALUES(1,0,'\x00001f5b645a48c0'::bytea,'\xfffffffd6daaacba00000002ffffffff'::bytea,true,true,false);
-- name: HistoricalTemporalDurationError
INSERT INTO inspection_temporal_history(score,denominator,expected_instant,expected_duration,expected_instant_present,expected_duration_present,bypass) VALUES(1,0,'\x00'::bytea,'\xfffffffd6daaacba00000002ffffffff'::bytea,false,true,false);
-- name: HistoricalTemporalSkippedErrors
INSERT INTO inspection_temporal_history(score,denominator,expected_instant,expected_duration,expected_instant_present,expected_duration_present,bypass) VALUES(1,0,'\x00'::bytea,'\x00'::bytea,false,false,false);
-- name: HistoricalTemporalWrongInstant
INSERT INTO inspection_temporal_history(score,denominator,expected_instant,expected_duration,expected_instant_present,expected_duration_present,bypass) VALUES(1,1,'\x00001f5b645a48c0'::bytea,'\xfffffffd6daaacba00000002ffffffff'::bytea,false,true,false);
-- name: HistoricalTemporalWrongDuration
INSERT INTO inspection_temporal_history(score,denominator,expected_instant,expected_duration,expected_instant_present,expected_duration_present,bypass) VALUES(1,1,'\x00001f5b645a48c0'::bytea,'\xfffffffd6daaacba00000002ffffffff'::bytea,true,false,false);
-- name: HistoricalTemporalBypassed
INSERT INTO inspection_temporal_history(score,denominator,expected_instant,expected_duration,expected_instant_present,expected_duration_present,bypass) VALUES(1,0,'\x00001f5b645a48c0'::bytea,'\xfffffffd6daaacba00000002ffffffff'::bytea,false,false,true);

-- name: HistoricalBinaryValues
INSERT INTO inspection_binary_history(score,denominator,payload,identity_uuid,expected_payload_present,expected_identity_present,bypass) VALUES(1,1,'\x000180ff'::bytea,'01234567-89ab-cdef-8012-3456789abcde'::uuid,true,true,false);
-- name: HistoricalBinaryDifferentPayload
INSERT INTO inspection_binary_history(score,denominator,payload,identity_uuid,expected_payload_present,expected_identity_present,bypass) VALUES(1,1,'\x00'::bytea,'01234567-89ab-cdef-8012-3456789abcde'::uuid,false,true,false);
-- name: HistoricalBinaryDifferentIdentity
INSERT INTO inspection_binary_history(score,denominator,payload,identity_uuid,expected_payload_present,expected_identity_present,bypass) VALUES(1,1,'\x000180ff'::bytea,'00000000-0000-0000-0000-000000000000'::uuid,true,false,false);
-- name: HistoricalBinaryNullValues
INSERT INTO inspection_binary_history(score,denominator,payload,identity_uuid,expected_payload_present,expected_identity_present,bypass) VALUES(1,1,NULL,NULL,false,false,false);
-- name: HistoricalBinaryNullScore
INSERT INTO inspection_binary_history(score,denominator,payload,identity_uuid,expected_payload_present,expected_identity_present,bypass) VALUES(NULL,1,'\x000180ff'::bytea,'01234567-89ab-cdef-8012-3456789abcde'::uuid,false,false,false);
-- name: HistoricalBinaryNullRatio
INSERT INTO inspection_binary_history(score,denominator,payload,identity_uuid,expected_payload_present,expected_identity_present,bypass) VALUES(1,NULL,'\x000180ff'::bytea,'01234567-89ab-cdef-8012-3456789abcde'::uuid,false,false,false);
-- name: HistoricalBinaryPayloadError
INSERT INTO inspection_binary_history(score,denominator,payload,identity_uuid,expected_payload_present,expected_identity_present,bypass) VALUES(1,0,'\x000180ff'::bytea,'01234567-89ab-cdef-8012-3456789abcde'::uuid,true,true,false);
-- name: HistoricalBinaryIdentityError
INSERT INTO inspection_binary_history(score,denominator,payload,identity_uuid,expected_payload_present,expected_identity_present,bypass) VALUES(1,0,'\x00'::bytea,'01234567-89ab-cdef-8012-3456789abcde'::uuid,false,true,false);
-- name: HistoricalBinarySkippedErrors
INSERT INTO inspection_binary_history(score,denominator,payload,identity_uuid,expected_payload_present,expected_identity_present,bypass) VALUES(1,0,'\x00'::bytea,'00000000-0000-0000-0000-000000000000'::uuid,false,false,false);
-- name: HistoricalBinaryWrongPayload
INSERT INTO inspection_binary_history(score,denominator,payload,identity_uuid,expected_payload_present,expected_identity_present,bypass) VALUES(1,1,'\x000180ff'::bytea,'01234567-89ab-cdef-8012-3456789abcde'::uuid,false,true,false);
-- name: HistoricalBinaryWrongIdentity
INSERT INTO inspection_binary_history(score,denominator,payload,identity_uuid,expected_payload_present,expected_identity_present,bypass) VALUES(1,1,'\x000180ff'::bytea,'01234567-89ab-cdef-8012-3456789abcde'::uuid,true,false,false);
-- name: HistoricalBinaryBypassed
INSERT INTO inspection_binary_history(score,denominator,payload,identity_uuid,expected_payload_present,expected_identity_present,bypass) VALUES(1,0,'\x000180ff'::bytea,'01234567-89ab-cdef-8012-3456789abcde'::uuid,false,false,true);

-- name: HistoricalAddressValues
INSERT INTO inspection_address_history(score,denominator,ip_address,hardware,flags,expected_network_present,expected_flags_present,bypass) VALUES(1,1,'192.0.2.129','08:00:2b:ff:fe:01:02:03',B'10101',true,true,false);
-- name: HistoricalAddressOutside
INSERT INTO inspection_address_history(score,denominator,ip_address,hardware,flags,expected_network_present,expected_flags_present,bypass) VALUES(1,1,'198.51.100.1','08:00:2b:ff:fe:01:02:03',B'00101',false,false,false);
-- name: HistoricalAddressFlagsOnly
INSERT INTO inspection_address_history(score,denominator,ip_address,hardware,flags,expected_network_present,expected_flags_present,bypass) VALUES(1,1,'198.51.100.1','08:00:2b:ff:fe:01:02:03',B'10101',false,true,false);
-- name: HistoricalAddressDifferentHardware
INSERT INTO inspection_address_history(score,denominator,ip_address,hardware,flags,expected_network_present,expected_flags_present,bypass) VALUES(1,1,'192.0.2.129','00:00:00:00:00:00:00:00',B'10101',true,false,false);
-- name: HistoricalAddressNullValues
INSERT INTO inspection_address_history(score,denominator,ip_address,hardware,flags,expected_network_present,expected_flags_present,bypass) VALUES(1,1,NULL,NULL,NULL,false,false,false);
-- name: HistoricalAddressNullScore
INSERT INTO inspection_address_history(score,denominator,ip_address,hardware,flags,expected_network_present,expected_flags_present,bypass) VALUES(NULL,1,'192.0.2.129','08:00:2b:ff:fe:01:02:03',B'10101',false,false,false);
-- name: HistoricalAddressNullRatio
INSERT INTO inspection_address_history(score,denominator,ip_address,hardware,flags,expected_network_present,expected_flags_present,bypass) VALUES(1,NULL,'192.0.2.129','08:00:2b:ff:fe:01:02:03',B'10101',false,false,false);
-- name: HistoricalAddressNetworkError
INSERT INTO inspection_address_history(score,denominator,ip_address,hardware,flags,expected_network_present,expected_flags_present,bypass) VALUES(1,0,'192.0.2.129','08:00:2b:ff:fe:01:02:03',B'10101',true,true,false);
-- name: HistoricalAddressFlagsError
INSERT INTO inspection_address_history(score,denominator,ip_address,hardware,flags,expected_network_present,expected_flags_present,bypass) VALUES(1,0,'198.51.100.1','08:00:2b:ff:fe:01:02:03',B'10101',false,true,false);
-- name: HistoricalAddressEmptyFlags
INSERT INTO inspection_address_history(score,denominator,ip_address,hardware,flags,expected_network_present,expected_flags_present,bypass) VALUES(1,1,'198.51.100.1','08:00:2b:ff:fe:01:02:03',B'',false,false,false);
-- name: HistoricalAddressWrongNetwork
INSERT INTO inspection_address_history(score,denominator,ip_address,hardware,flags,expected_network_present,expected_flags_present,bypass) VALUES(1,1,'192.0.2.129','08:00:2b:ff:fe:01:02:03',B'10101',false,true,false);
-- name: HistoricalAddressWrongFlags
INSERT INTO inspection_address_history(score,denominator,ip_address,hardware,flags,expected_network_present,expected_flags_present,bypass) VALUES(1,1,'192.0.2.129','08:00:2b:ff:fe:01:02:03',B'10101',true,false,false);
-- name: HistoricalAddressBypassed
INSERT INTO inspection_address_history(score,denominator,ip_address,hardware,flags,expected_network_present,expected_flags_present,bypass) VALUES(1,0,'192.0.2.129','08:00:2b:ff:fe:01:02:03',B'',false,false,true);

-- name: HistoricalModifiersRoundedValues
INSERT INTO inspection_modifier_history(score,flags_text,amount_text,captured_text,expected_flags,expected_amount,expected_capture,bypass) VALUES(1,'1010111','1.235','2001-02-03 12:34:56.123456','\x00000006a8','\x000200000000000300010960','\x00001f650e8a90c0',false);
-- name: HistoricalModifiersNullInputs
INSERT INTO inspection_modifier_history(score,flags_text,amount_text,captured_text,expected_flags,expected_amount,expected_capture,bypass) VALUES(NULL,NULL,NULL,NULL,'\x00','\x00','\x00',false);
-- name: HistoricalModifiersWrongFlags
INSERT INTO inspection_modifier_history(score,flags_text,amount_text,captured_text,expected_flags,expected_amount,expected_capture,bypass) VALUES(1,'1010111','1.235','2001-02-03 12:34:56.123456','\x00000006ac','\x000200000000000300010960','\x00001f650e8a90c0',false);
-- name: HistoricalModifiersWrongAmount
INSERT INTO inspection_modifier_history(score,flags_text,amount_text,captured_text,expected_flags,expected_amount,expected_capture,bypass) VALUES(1,'1010111','1.235','2001-02-03 12:34:56.123456','\x00000006a8','\x00','\x00001f650e8a90c0',false);
-- name: HistoricalModifiersWrongCapture
INSERT INTO inspection_modifier_history(score,flags_text,amount_text,captured_text,expected_flags,expected_amount,expected_capture,bypass) VALUES(1,'1010111','1.235','2001-02-03 12:34:56.123456','\x00000006a8','\x000200000000000300010960','\x00',false);
-- name: HistoricalModifiersOldPrecisionOverflow
INSERT INTO inspection_modifier_history(score,flags_text,amount_text,captured_text,expected_flags,expected_amount,expected_capture,bypass) VALUES(1,'1010111','9999','2001-02-03 12:34:56.123456','\x00000006a8','\x00','\x00001f650e8a90c0',false);
-- name: HistoricalModifiersInvalidBits
INSERT INTO inspection_modifier_history(score,flags_text,amount_text,captured_text,expected_flags,expected_amount,expected_capture,bypass) VALUES(1,'bad','1.235','2001-02-03 12:34:56.123456','\x00','\x000200000000000300010960','\x00001f650e8a90c0',false);
-- name: HistoricalModifiersInvalidCapture
INSERT INTO inspection_modifier_history(score,flags_text,amount_text,captured_text,expected_flags,expected_amount,expected_capture,bypass) VALUES(1,'1010111','1.235','1900-02-29 00:00:00Z','\x00000006a8','\x000200000000000300010960','\x00',false);
-- name: HistoricalModifiersBypassedErrors
INSERT INTO inspection_modifier_history(score,flags_text,amount_text,captured_text,expected_flags,expected_amount,expected_capture,bypass) VALUES(1,'bad','9999','1900-02-29 00:00:00Z','\x00','\x00','\x00',true);

-- name: HistoricalArrayValues
INSERT INTO inspection_array_history(score,divisor,label,expected_present,expected_converted,expected_shape,bypass) VALUES(2,1,'1',true,true,true,false);
-- name: HistoricalArrayNullScore
INSERT INTO inspection_array_history(score,divisor,label,expected_present,expected_converted,expected_shape,bypass) VALUES(NULL,1,'1',false,false,false,false);
-- name: HistoricalArrayNullExpectations
INSERT INTO inspection_array_history(score,divisor,label,expected_present,expected_converted,expected_shape,bypass) VALUES(2,1,'1',NULL,NULL,NULL,false);
-- name: HistoricalArrayWrongPresence
INSERT INTO inspection_array_history(score,divisor,label,expected_present,expected_converted,expected_shape,bypass) VALUES(2,1,'1',false,true,true,false);
-- name: HistoricalArrayWrongConversion
INSERT INTO inspection_array_history(score,divisor,label,expected_present,expected_converted,expected_shape,bypass) VALUES(2,1,'1',true,false,true,false);
-- name: HistoricalArrayWrongShape
INSERT INTO inspection_array_history(score,divisor,label,expected_present,expected_converted,expected_shape,bypass) VALUES(2,1,'1',true,true,false,false);
-- name: HistoricalArrayDivisionError
INSERT INTO inspection_array_history(score,divisor,label,expected_present,expected_converted,expected_shape,bypass) VALUES(2,0,'1',true,true,true,false);
-- name: HistoricalArrayNarrowOverflow
INSERT INTO inspection_array_history(score,divisor,label,expected_present,expected_converted,expected_shape,bypass) VALUES(2,1,'32768',true,true,true,false);
-- name: HistoricalArrayInputError
INSERT INTO inspection_array_history(score,divisor,label,expected_present,expected_converted,expected_shape,bypass) VALUES(2,1,'bad',true,true,true,false);
-- name: HistoricalArrayRaggedShape
INSERT INTO inspection_array_history(score,divisor,label,expected_present,expected_converted,expected_shape,bypass) VALUES(2,2,'1',true,true,true,false);
-- name: HistoricalArrayEmptyInput
INSERT INTO inspection_array_history(score,divisor,label,expected_present,expected_converted,expected_shape,bypass) VALUES(2,1,'',true,true,true,false);
-- name: HistoricalArrayBypassedErrors
INSERT INTO inspection_array_history(score,divisor,label,expected_present,expected_converted,expected_shape,bypass) VALUES(2,0,'bad',false,false,false,true);

-- name: HistoricalArrayConstantsRetainedValues
INSERT INTO inspection_array_constants(score,divisor,expected_present,expected_match,expected_matrix,expected_phase,bypass) VALUES(1,1,true,true,'[-1:0][2:3]={{1,NULL},{2,3}}','{middle,"",NULL}',false);
-- name: HistoricalArrayConstantsNullScore
INSERT INTO inspection_array_constants(score,divisor,expected_present,expected_match,expected_matrix,expected_phase,bypass) VALUES(NULL,1,false,false,'[-1:0][2:3]={{1,NULL},{2,3}}','{middle,"",NULL}',false);
-- name: HistoricalArrayConstantsNullExpectations
INSERT INTO inspection_array_constants(score,divisor,expected_present,expected_match,expected_matrix,expected_phase,bypass) VALUES(1,1,NULL,NULL,'[-1:0][2:3]={{1,NULL},{2,3}}','{middle,"",NULL}',false);
-- name: HistoricalArrayConstantsWrongPresence
INSERT INTO inspection_array_constants(score,divisor,expected_present,expected_match,expected_matrix,expected_phase,bypass) VALUES(1,1,false,true,'[-1:0][2:3]={{1,NULL},{2,3}}','{middle,"",NULL}',false);
-- name: HistoricalArrayConstantsWrongMatrix
INSERT INTO inspection_array_constants(score,divisor,expected_present,expected_match,expected_matrix,expected_phase,bypass) VALUES(1,1,true,true,'{{1,NULL},{2,3}}','{middle,"",NULL}',false);
-- name: HistoricalArrayConstantsOldPhaseLabel
INSERT INTO inspection_array_constants(score,divisor,expected_present,expected_match,expected_matrix,expected_phase,bypass) VALUES(1,1,true,true,'[-1:0][2:3]={{1,NULL},{2,3}}','{z,"",NULL}',false);
-- name: HistoricalArrayConstantsReachedDivision
INSERT INTO inspection_array_constants(score,divisor,expected_present,expected_match,expected_matrix,expected_phase,bypass) VALUES(1,0,true,true,'[-1:0][2:3]={{1,NULL},{2,3}}','{middle,"",NULL}',false);
-- name: HistoricalArrayConstantsSkippedDivision
INSERT INTO inspection_array_constants(score,divisor,expected_present,expected_match,expected_matrix,expected_phase,bypass) VALUES(1,0,true,true,'wrong','wrong',false);
-- name: HistoricalArrayConstantsNullComparison
INSERT INTO inspection_array_constants(score,divisor,expected_present,expected_match,expected_matrix,expected_phase,bypass) VALUES(1,0,true,true,NULL,NULL,false);
-- name: HistoricalArrayConstantsBypassedDivision
INSERT INTO inspection_array_constants(score,divisor,expected_present,expected_match,expected_matrix,expected_phase,bypass) VALUES(1,0,false,false,'[-1:0][2:3]={{1,NULL},{2,3}}','{middle,"",NULL}',true);

-- name: HistoricalJsonRetainedValues
INSERT INTO inspection_json_history(score,divisor,label,expected_source,expected_document,expected_field,expected_present,bypass) VALUES(1,1,'a',' { "a":1, "a":2.4500,"é":"😊" } ','{"a": 1.2300, "b": [true, null], "é": "😊"}','1.2300',true,false);
-- name: HistoricalJsonUnicodeField
INSERT INTO inspection_json_history(score,divisor,label,expected_source,expected_document,expected_field,expected_present,bypass) VALUES(1,1,'é',' { "a":1, "a":2.4500,"é":"😊" } ','{"a": 1.2300, "b": [true, null], "é": "😊"}','😊',true,false);
-- name: HistoricalJsonNullScore
INSERT INTO inspection_json_history(score,divisor,label,expected_source,expected_document,expected_field,expected_present,bypass) VALUES(NULL,1,'a',' { "a":1, "a":2.4500,"é":"😊" } ','{"a": 1.2300, "b": [true, null], "é": "😊"}','1.2300',false,false);
-- name: HistoricalJsonWrongSource
INSERT INTO inspection_json_history(score,divisor,label,expected_source,expected_document,expected_field,expected_present,bypass) VALUES(1,1,'a','{"a":2.4500}','{"a": 1.2300, "b": [true, null], "é": "😊"}','1.2300',true,false);
-- name: HistoricalJsonWrongDocument
INSERT INTO inspection_json_history(score,divisor,label,expected_source,expected_document,expected_field,expected_present,bypass) VALUES(1,1,'a',' { "a":1, "a":2.4500,"é":"😊" } ','{"a": 1.23, "b": [true, null], "é": "😊"}','1.2300',true,false);
-- name: HistoricalJsonWrongField
INSERT INTO inspection_json_history(score,divisor,label,expected_source,expected_document,expected_field,expected_present,bypass) VALUES(1,1,'a',' { "a":1, "a":2.4500,"é":"😊" } ','{"a": 1.2300, "b": [true, null], "é": "😊"}','wrong',true,false);
-- name: HistoricalJsonReachedDivision
INSERT INTO inspection_json_history(score,divisor,label,expected_source,expected_document,expected_field,expected_present,bypass) VALUES(1,0,'a',' { "a":1, "a":2.4500,"é":"😊" } ','{"a": 1.2300, "b": [true, null], "é": "😊"}','1.2300',true,false);
-- name: HistoricalJsonSkippedDivision
INSERT INTO inspection_json_history(score,divisor,label,expected_source,expected_document,expected_field,expected_present,bypass) VALUES(1,0,'missing','wrong','wrong','wrong',false,false);
-- name: HistoricalJsonNullComparison
INSERT INTO inspection_json_history(score,divisor,label,expected_source,expected_document,expected_field,expected_present,bypass) VALUES(1,0,'missing',NULL,NULL,NULL,false,false);
-- name: HistoricalJsonNullExpectation
INSERT INTO inspection_json_history(score,divisor,label,expected_source,expected_document,expected_field,expected_present,bypass) VALUES(1,1,'a',' { "a":1, "a":2.4500,"é":"😊" } ','{"a": 1.2300, "b": [true, null], "é": "😊"}','1.2300',NULL,false);
-- name: HistoricalJsonBypassedDivision
INSERT INTO inspection_json_history(score,divisor,label,expected_source,expected_document,expected_field,expected_present,bypass) VALUES(1,0,'a',' { "a":1, "a":2.4500,"é":"😊" } ','{"a": 1.2300, "b": [true, null], "é": "😊"}','1.2300',false,true);

-- name: HistoricalDefaultsMatchedValues
INSERT INTO inspection_default_history(score,divisor,document,path,expected_present,expected_exists,expected_max,bypass) VALUES(1,1,'3','$ ? (@ > 0)',true,true,1,false);
-- name: HistoricalDefaultsSkippedDivision
INSERT INTO inspection_default_history(score,divisor,document,path,expected_present,expected_exists,expected_max,bypass) VALUES(-1,0,'0','$ ? (@ > 0)',false,false,0,false);
-- name: HistoricalDefaultsNullDocument
INSERT INTO inspection_default_history(score,divisor,document,path,expected_present,expected_exists,expected_max,bypass) VALUES(1,1,NULL,'$ ? (@ > 0)',false,true,1,false);
-- name: HistoricalDefaultsNullScore
INSERT INTO inspection_default_history(score,divisor,document,path,expected_present,expected_exists,expected_max,bypass) VALUES(NULL,1,'3','$ ? (@ > 0)',false,true,1,false);
-- name: HistoricalDefaultsNullPath
INSERT INTO inspection_default_history(score,divisor,document,path,expected_present,expected_exists,expected_max,bypass) VALUES(1,1,'3',NULL,false,NULL,1,false);
-- name: HistoricalDefaultsWrongPresence
INSERT INTO inspection_default_history(score,divisor,document,path,expected_present,expected_exists,expected_max,bypass) VALUES(1,1,'3','$ ? (@ > 0)',false,true,1,false);
-- name: HistoricalDefaultsWrongNamedResult
INSERT INTO inspection_default_history(score,divisor,document,path,expected_present,expected_exists,expected_max,bypass) VALUES(1,1,'3','$ ? (@ > 0)',true,false,1,false);
-- name: HistoricalDefaultsWrongMutation
INSERT INTO inspection_default_history(score,divisor,document,path,expected_present,expected_exists,expected_max,bypass) VALUES(1,1,'3','$ ? (@ > 0)',true,true,2,false);
-- name: HistoricalDefaultsReachedDivision
INSERT INTO inspection_default_history(score,divisor,document,path,expected_present,expected_exists,expected_max,bypass) VALUES(1,0,'3','$ ? (@ > 0)',true,true,1,false);
-- name: HistoricalDefaultsStrictPathError
INSERT INTO inspection_default_history(score,divisor,document,path,expected_present,expected_exists,expected_max,bypass) VALUES(1,1,'{}','strict $.missing',true,true,1,false);
-- name: HistoricalDefaultsBypassedErrors
INSERT INTO inspection_default_history(score,divisor,document,path,expected_present,expected_exists,expected_max,bypass) VALUES(1,0,'{}','strict $.missing',false,false,2,true);

-- name: HistoricalSelectionMatchedValues
INSERT INTO inspection_selection_history(score,divisor,expected_present,bypass) VALUES(1,1,true,false);
-- name: HistoricalSelectionNestedCase
INSERT INTO inspection_selection_history(score,divisor,expected_present,bypass) VALUES(2,2,true,false);
-- name: HistoricalSelectionSkippedDivision
INSERT INTO inspection_selection_history(score,divisor,expected_present,bypass) VALUES(2,0,true,false);
-- name: HistoricalSelectionNullOperand
INSERT INTO inspection_selection_history(score,divisor,expected_present,bypass) VALUES(NULL,0,false,false);
-- name: HistoricalSelectionUnmatchedCase
INSERT INTO inspection_selection_history(score,divisor,expected_present,bypass) VALUES(3,0,true,false);
-- name: HistoricalSelectionWrongPresence
INSERT INTO inspection_selection_history(score,divisor,expected_present,bypass) VALUES(1,1,false,false);
-- name: HistoricalSelectionNullPresence
INSERT INTO inspection_selection_history(score,divisor,expected_present,bypass) VALUES(1,1,NULL,false);
-- name: HistoricalSelectionReachedDivision
INSERT INTO inspection_selection_history(score,divisor,expected_present,bypass) VALUES(1,0,true,false);
-- name: HistoricalSelectionBypassedDivision
INSERT INTO inspection_selection_history(score,divisor,expected_present,bypass) VALUES(1,0,false,true);

-- name: HistoricalContainerMatchedValues
INSERT INTO inspection_container_history(score,divisor,expected_present,bypass) VALUES(1,1,true,false);
-- name: HistoricalContainerNullScore
INSERT INTO inspection_container_history(score,divisor,expected_present,bypass) VALUES(NULL,1,false,false);
-- name: HistoricalContainerWrongPresence
INSERT INTO inspection_container_history(score,divisor,expected_present,bypass) VALUES(1,1,false,false);
-- name: HistoricalContainerNullPresence
INSERT INTO inspection_container_history(score,divisor,expected_present,bypass) VALUES(1,1,NULL,false);
-- name: HistoricalContainerReachedDivision
INSERT INTO inspection_container_history(score,divisor,expected_present,bypass) VALUES(1,0,true,false);
-- name: HistoricalContainerBypassedDivision
INSERT INTO inspection_container_history(score,divisor,expected_present,bypass) VALUES(1,0,false,true);

-- name: HistoricalXmlMoneyMatchedValues
INSERT INTO inspection_xml_money_history(score,divisor,expected_present,bypass) VALUES(1,1,true,false);
-- name: HistoricalXmlMoneyNullScore
INSERT INTO inspection_xml_money_history(score,divisor,expected_present,bypass) VALUES(NULL,1,false,false);
-- name: HistoricalXmlMoneyWrongPresence
INSERT INTO inspection_xml_money_history(score,divisor,expected_present,bypass) VALUES(1,1,false,false);
-- name: HistoricalXmlMoneyNullPresence
INSERT INTO inspection_xml_money_history(score,divisor,expected_present,bypass) VALUES(1,1,NULL,false);
-- name: HistoricalXmlMoneyReachedDivision
INSERT INTO inspection_xml_money_history(score,divisor,expected_present,bypass) VALUES(1,0,true,false);
-- name: HistoricalXmlMoneyBypassedDivision
INSERT INTO inspection_xml_money_history(score,divisor,expected_present,bypass) VALUES(1,0,false,true);

-- name: HistoricalOperationsMatchedValues
INSERT INTO inspection_operation_history(score,divisor,expected_present,bypass) VALUES(1,1,true,false);
-- name: HistoricalOperationsNullScore
INSERT INTO inspection_operation_history(score,divisor,expected_present,bypass) VALUES(NULL,0,false,false);
-- name: HistoricalOperationsWrongPresence
INSERT INTO inspection_operation_history(score,divisor,expected_present,bypass) VALUES(1,1,false,false);
-- name: HistoricalOperationsNullPresence
INSERT INTO inspection_operation_history(score,divisor,expected_present,bypass) VALUES(1,1,NULL,false);
-- name: HistoricalOperationsReachedDivision
INSERT INTO inspection_operation_history(score,divisor,expected_present,bypass) VALUES(1,0,true,false);
-- name: HistoricalOperationsSkippedDivision
INSERT INTO inspection_operation_history(score,divisor,expected_present,bypass) VALUES(2,0,true,false);
-- name: HistoricalOperationsBypassedDivision
INSERT INTO inspection_operation_history(score,divisor,expected_present,bypass) VALUES(1,0,false,true);

-- name: HistoricalPredicatesMatchedValues
INSERT INTO inspection_predicate_history(score,divisor,label,expected_present,bypass) VALUES(1,1,'x',true,false);
-- name: HistoricalPredicatesNullScore
INSERT INTO inspection_predicate_history(score,divisor,label,expected_present,bypass) VALUES(NULL,1,'x',false,false);
-- name: HistoricalPredicatesWrongPresence
INSERT INTO inspection_predicate_history(score,divisor,label,expected_present,bypass) VALUES(1,1,'x',false,false);
-- name: HistoricalPredicatesNullPresence
INSERT INTO inspection_predicate_history(score,divisor,label,expected_present,bypass) VALUES(1,1,'x',NULL,false);
-- name: HistoricalPredicatesReachedDivision
INSERT INTO inspection_predicate_history(score,divisor,label,expected_present,bypass) VALUES(1,0,'x',true,false);
-- name: HistoricalPredicatesBypassedDivision
INSERT INTO inspection_predicate_history(score,divisor,label,expected_present,bypass) VALUES(1,0,'x',false,true);

-- name: HistoricalQuantifiersMatchedValues
INSERT INTO inspection_quantifier_history(score,divisor,label,expected_number,expected_text,bypass) VALUES(1,1,'1',true,true,false);
-- name: HistoricalQuantifiersUnmatchedValues
INSERT INTO inspection_quantifier_history(score,divisor,label,expected_number,expected_text,bypass) VALUES(2,1,'2',false,false,false);
-- name: HistoricalQuantifiersNullScore
INSERT INTO inspection_quantifier_history(score,divisor,label,expected_number,expected_text,bypass) VALUES(NULL,0,'1',false,false,false);
-- name: HistoricalQuantifiersWrongPresence
INSERT INTO inspection_quantifier_history(score,divisor,label,expected_number,expected_text,bypass) VALUES(1,1,'1',false,true,false);
-- name: HistoricalQuantifiersWrongTextPresence
INSERT INTO inspection_quantifier_history(score,divisor,label,expected_number,expected_text,bypass) VALUES(1,1,'1',true,false,false);
-- name: HistoricalQuantifiersNullPresence
INSERT INTO inspection_quantifier_history(score,divisor,label,expected_number,expected_text,bypass) VALUES(1,1,NULL,NULL,NULL,false);
-- name: HistoricalQuantifiersReachedDivision
INSERT INTO inspection_quantifier_history(score,divisor,label,expected_number,expected_text,bypass) VALUES(0,0,'1',true,true,false);
-- name: HistoricalQuantifiersSkippedDivision
INSERT INTO inspection_quantifier_history(score,divisor,label,expected_number,expected_text,bypass) VALUES(1,0,'1',false,true,false);
-- name: HistoricalQuantifiersBypassedDivision
INSERT INTO inspection_quantifier_history(score,divisor,label,expected_number,expected_text,bypass) VALUES(0,0,'1',false,false,true);

-- name: HistoricalCoercionsMatchedValues
INSERT INTO inspection_coercion_history(score,divisor,expected_present,bypass) VALUES(3,1,true,false);
-- name: HistoricalCoercionsNullScore
INSERT INTO inspection_coercion_history(score,divisor,expected_present,bypass) VALUES(NULL,1,false,false);
-- name: HistoricalCoercionsWrongPresence
INSERT INTO inspection_coercion_history(score,divisor,expected_present,bypass) VALUES(3,1,false,false);
-- name: HistoricalCoercionsNullPresence
INSERT INTO inspection_coercion_history(score,divisor,expected_present,bypass) VALUES(3,1,NULL,false);
-- name: HistoricalCoercionsTighterDomain
INSERT INTO inspection_coercion_history(score,divisor,expected_present,bypass) VALUES(1,1,true,false);
-- name: HistoricalCoercionsReachedDivision
INSERT INTO inspection_coercion_history(score,divisor,expected_present,bypass) VALUES(3,0,true,false);
-- name: HistoricalCoercionsBypassedDivision
INSERT INTO inspection_coercion_history(score,divisor,expected_present,bypass) VALUES(1,0,false,true);

-- name: HistoricalMismatchNullDatum
INSERT INTO inspection_mismatch_history(score,divisor,missing,expected_present,bypass) VALUES(1,0,true,false,false);
-- name: HistoricalMismatchWrongPresence
INSERT INTO inspection_mismatch_history(score,divisor,missing,expected_present,bypass) VALUES(1,0,true,true,false);
-- name: HistoricalMismatchNullPresence
INSERT INTO inspection_mismatch_history(score,divisor,missing,expected_present,bypass) VALUES(1,0,true,NULL,false);
-- name: HistoricalMismatchReachedDescriptor
INSERT INTO inspection_mismatch_history(score,divisor,missing,expected_present,bypass) VALUES(1,1,false,true,false);
-- name: HistoricalMismatchDivisionBeforeDescriptor
INSERT INTO inspection_mismatch_history(score,divisor,missing,expected_present,bypass) VALUES(1,0,false,true,false);
-- name: HistoricalMismatchNullField
INSERT INTO inspection_mismatch_history(score,divisor,missing,expected_present,bypass) VALUES(NULL,0,false,false,false);
-- name: HistoricalMismatchBypassedDescriptor
INSERT INTO inspection_mismatch_history(score,divisor,missing,expected_present,bypass) VALUES(1,0,false,true,true);

-- name: HistoricalCoercionParentRow
INSERT INTO historical_coercion_parent(score) VALUES(3);
-- name: HistoricalCoercionChildRow
INSERT INTO historical_coercion_child(score,divisor) VALUES(3,1);
-- name: HistoricalMismatchParentRow
INSERT INTO historical_mismatch_parent(current_score) VALUES(3);
-- name: HistoricalMismatchChildRow
INSERT INTO historical_mismatch_child(score,divisor) VALUES(3,1);
-- name: HistoricalCoercionParentRejectedRow
INSERT INTO historical_coercion_parent(score) VALUES(-1);
-- name: HistoricalCoercionChildRejectedRow
INSERT INTO historical_coercion_child(score,divisor) VALUES(-1,1);
-- name: HistoricalMismatchParentRejectedRow
INSERT INTO historical_mismatch_parent(current_score) VALUES(-1);
-- name: HistoricalMismatchChildRejectedRow
INSERT INTO historical_mismatch_child(score,divisor) VALUES(-1,1);

-- name: HistoricalOrderingEarlierLess
INSERT INTO inspection_ordering_history(score,peer,divisor,label,expected_order,expected_text,expected_present,bypass) VALUES(1,2,0,'a',true,true,true,false);
-- name: HistoricalOrderingEarlierGreater
INSERT INTO inspection_ordering_history(score,peer,divisor,label,expected_order,expected_text,expected_present,bypass) VALUES(2,1,0,'z',false,false,false,false);
-- name: HistoricalOrderingLaterGreater
INSERT INTO inspection_ordering_history(score,peer,divisor,label,expected_order,expected_text,expected_present,bypass) VALUES(2,2,1,'m',false,false,false,false);
-- name: HistoricalOrderingEqual
INSERT INTO inspection_ordering_history(score,peer,divisor,label,expected_order,expected_text,expected_present,bypass) VALUES(0,0,1,'m',false,false,false,false);
-- name: HistoricalOrderingNullLeft
INSERT INTO inspection_ordering_history(score,peer,divisor,label,expected_order,expected_text,expected_present,bypass) VALUES(NULL,0,0,'z',NULL,false,false,false);
-- name: HistoricalOrderingNullRight
INSERT INTO inspection_ordering_history(score,peer,divisor,label,expected_order,expected_text,expected_present,bypass) VALUES(1,NULL,0,'z',NULL,false,false,false);
-- name: HistoricalOrderingReachedDivision
INSERT INTO inspection_ordering_history(score,peer,divisor,label,expected_order,expected_text,expected_present,bypass) VALUES(1,1,0,'m',true,true,true,false);
-- name: HistoricalOrderingWrongOrder
INSERT INTO inspection_ordering_history(score,peer,divisor,label,expected_order,expected_text,expected_present,bypass) VALUES(1,2,1,'a',false,true,true,false);
-- name: HistoricalOrderingWrongText
INSERT INTO inspection_ordering_history(score,peer,divisor,label,expected_order,expected_text,expected_present,bypass) VALUES(1,2,1,'a',true,false,true,false);
-- name: HistoricalOrderingWrongPresence
INSERT INTO inspection_ordering_history(score,peer,divisor,label,expected_order,expected_text,expected_present,bypass) VALUES(1,2,1,'a',true,true,false,false);
-- name: HistoricalOrderingBypassedDivision
INSERT INTO inspection_ordering_history(score,peer,divisor,label,expected_order,expected_text,expected_present,bypass) VALUES(1,1,0,'m',false,false,false,true);
-- name: HistoricalOrderingNullExpectation
INSERT INTO inspection_ordering_history(score,peer,divisor,label,expected_order,expected_text,expected_present,bypass) VALUES(NULL,0,0,'m',NULL,NULL,NULL,false);

-- name: HistoricalVariadicValues
INSERT INTO inspection_variadic_history(score,divisor,label,missing,expected_payload,expected_numbers,expected_raw,expected_present,bypass) VALUES(1,2,'x',false,'[1,2,"x"]','[1,2]','{"x" : 0, "again" : "x"}',true,false);

-- name: HistoricalVariadicNullScore
INSERT INTO inspection_variadic_history(score,divisor,label,missing,expected_payload,expected_numbers,expected_raw,expected_present,bypass) VALUES(NULL,0,'x',false,'[null,0,"x"]','[null,0]','{"x" : null, "again" : "x"}',false,false);

-- name: HistoricalVariadicNullArray
INSERT INTO inspection_variadic_history(score,divisor,label,missing,expected_payload,expected_numbers,expected_raw,expected_present,bypass) VALUES(1,0,'x',true,'[1,0,"x"]',NULL,NULL,false,false);

-- name: HistoricalVariadicWrongPayload
INSERT INTO inspection_variadic_history(score,divisor,label,missing,expected_payload,expected_numbers,expected_raw,expected_present,bypass) VALUES(1,2,'x',false,'[]','[1,2]','{"x" : 0, "again" : "x"}',true,false);

-- name: HistoricalVariadicWrongNumbers
INSERT INTO inspection_variadic_history(score,divisor,label,missing,expected_payload,expected_numbers,expected_raw,expected_present,bypass) VALUES(1,2,'x',false,'[1,2,"x"]','[]','{"x" : 0, "again" : "x"}',true,false);

-- name: HistoricalVariadicWrongRaw
INSERT INTO inspection_variadic_history(score,divisor,label,missing,expected_payload,expected_numbers,expected_raw,expected_present,bypass) VALUES(1,2,'x',false,'[1,2,"x"]','[1,2]','{}',true,false);

-- name: HistoricalVariadicWrongPresence
INSERT INTO inspection_variadic_history(score,divisor,label,missing,expected_payload,expected_numbers,expected_raw,expected_present,bypass) VALUES(1,2,'x',false,'[1,2,"x"]','[1,2]','{"x" : 0, "again" : "x"}',false,false);

-- name: HistoricalVariadicNullExpectation
INSERT INTO inspection_variadic_history(score,divisor,label,missing,expected_payload,expected_numbers,expected_raw,expected_present,bypass) VALUES(1,2,'x',false,'[1,2,"x"]','[1,2]',NULL,NULL,false);

-- name: HistoricalVariadicReachedDivision
INSERT INTO inspection_variadic_history(score,divisor,label,missing,expected_payload,expected_numbers,expected_raw,expected_present,bypass) VALUES(1,0,'x',false,'[1,0,"x"]','[1,0]',NULL,true,false);

-- name: HistoricalVariadicNullKey
INSERT INTO inspection_variadic_history(score,divisor,label,missing,expected_payload,expected_numbers,expected_raw,expected_present,bypass) VALUES(1,1,NULL,false,'[1,1,null]','[1,1]',NULL,true,false);

-- name: HistoricalVariadicBypassedErrors
INSERT INTO inspection_variadic_history(score,divisor,label,missing,expected_payload,expected_numbers,expected_raw,expected_present,bypass) VALUES(1,0,NULL,false,NULL,NULL,NULL,false,true);

-- name: HistoricalVariadicDuplicateKeys
INSERT INTO inspection_variadic_history(score,divisor,label,missing,expected_payload,expected_numbers,expected_raw,expected_present,bypass) VALUES(1,1,'again',false,'[1,1,"again"]','[1,1]','{"again" : 1, "again" : "again"}',true,false);

-- name: HistoricalXmlExpressionsValues
INSERT INTO inspection_xml_expression_history(score,divisor,label,missing,expected_xml,expected_parse,expected_document,expected_present,bypass) VALUES(1,1,'<r/>',false,'<_x1F60A_ _x005F_x1F60A_="&lt;r/&gt;">1</_x1F60A_>',E'<r/>\n',true,true,false);

-- name: HistoricalXmlExpressionsNullScore
INSERT INTO inspection_xml_expression_history(score,divisor,label,missing,expected_xml,expected_parse,expected_document,expected_present,bypass) VALUES(NULL,0,'<r/>',false,'<_x1F60A_ _x005F_x1F60A_="&lt;r/&gt;"/>',E'<r/>\n',true,false,false);

-- name: HistoricalXmlExpressionsNullLabel
INSERT INTO inspection_xml_expression_history(score,divisor,label,missing,expected_xml,expected_parse,expected_document,expected_present,bypass) VALUES(1,1,NULL,false,'<_x1F60A_>1</_x1F60A_>',NULL,NULL,true,false);

-- name: HistoricalXmlExpressionsContentTail
INSERT INTO inspection_xml_expression_history(score,divisor,label,missing,expected_xml,expected_parse,expected_document,expected_present,bypass) VALUES(1,1,'<r/>tail',true,'<_x1F60A_ _x005F_x1F60A_="&lt;r/&gt;tail">1</_x1F60A_>',NULL,false,true,false);

-- name: HistoricalXmlExpressionsWrongXml
INSERT INTO inspection_xml_expression_history(score,divisor,label,missing,expected_xml,expected_parse,expected_document,expected_present,bypass) VALUES(1,1,'<r/>',false,'<wrong/>',E'<r/>\n',true,true,false);

-- name: HistoricalXmlExpressionsWrongSerialization
INSERT INTO inspection_xml_expression_history(score,divisor,label,missing,expected_xml,expected_parse,expected_document,expected_present,bypass) VALUES(1,1,'<r/>',false,'<_x1F60A_ _x005F_x1F60A_="&lt;r/&gt;">1</_x1F60A_>','<wrong/>',true,true,false);

-- name: HistoricalXmlExpressionsWrongDocument
INSERT INTO inspection_xml_expression_history(score,divisor,label,missing,expected_xml,expected_parse,expected_document,expected_present,bypass) VALUES(1,1,'<r/>',false,'<_x1F60A_ _x005F_x1F60A_="&lt;r/&gt;">1</_x1F60A_>',E'<r/>\n',false,true,false);

-- name: HistoricalXmlExpressionsWrongPresence
INSERT INTO inspection_xml_expression_history(score,divisor,label,missing,expected_xml,expected_parse,expected_document,expected_present,bypass) VALUES(1,1,'<r/>',false,'<_x1F60A_ _x005F_x1F60A_="&lt;r/&gt;">1</_x1F60A_>',E'<r/>\n',true,false,false);

-- name: HistoricalXmlExpressionsNullExpectation
INSERT INTO inspection_xml_expression_history(score,divisor,label,missing,expected_xml,expected_parse,expected_document,expected_present,bypass) VALUES(1,1,'<r/>',false,'<_x1F60A_ _x005F_x1F60A_="&lt;r/&gt;">1</_x1F60A_>',NULL,true,NULL,false);

-- name: HistoricalXmlExpressionsReachedDivision
INSERT INTO inspection_xml_expression_history(score,divisor,label,missing,expected_xml,expected_parse,expected_document,expected_present,bypass) VALUES(1,0,'<r/>',false,NULL,NULL,true,true,false);

-- name: HistoricalXmlExpressionsInvalidParse
INSERT INTO inspection_xml_expression_history(score,divisor,label,missing,expected_xml,expected_parse,expected_document,expected_present,bypass) VALUES(1,1,'<bad>',false,'<_x1F60A_ _x005F_x1F60A_="&lt;bad&gt;">1</_x1F60A_>',NULL,false,true,false);

-- name: HistoricalXmlExpressionsBypassedErrors
INSERT INTO inspection_xml_expression_history(score,divisor,label,missing,expected_xml,expected_parse,expected_document,expected_present,bypass) VALUES(1,0,'<bad>',false,NULL,NULL,false,false,true);
