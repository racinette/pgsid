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
