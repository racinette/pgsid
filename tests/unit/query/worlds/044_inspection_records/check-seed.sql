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

-- name: HistoricalTextLikeValues
INSERT INTO inspection_text_like_history(score,divisor,expected_octet,expected_name,expected_cursor,expected_present,bypass) VALUES(1,1,'\xff','tail ','cursor é😊',true,false);

-- name: HistoricalTextLikeNullScore
INSERT INTO inspection_text_like_history(score,divisor,expected_octet,expected_name,expected_cursor,expected_present,bypass) VALUES(NULL,1,'\xff','tail ','cursor é😊',false,false);

-- name: HistoricalTextLikeWrongChar
INSERT INTO inspection_text_like_history(score,divisor,expected_octet,expected_name,expected_cursor,expected_present,bypass) VALUES(1,1,'\x80','tail ','cursor é😊',false,false);

-- name: HistoricalTextLikeWrongName
INSERT INTO inspection_text_like_history(score,divisor,expected_octet,expected_name,expected_cursor,expected_present,bypass) VALUES(1,1,'\xff','tail','cursor é😊',false,false);

-- name: HistoricalTextLikeWrongCursor
INSERT INTO inspection_text_like_history(score,divisor,expected_octet,expected_name,expected_cursor,expected_present,bypass) VALUES(1,1,'\xff','tail ','cursor',true,false);

-- name: HistoricalTextLikeWrongPresence
INSERT INTO inspection_text_like_history(score,divisor,expected_octet,expected_name,expected_cursor,expected_present,bypass) VALUES(1,1,'\xff','tail ','cursor é😊',false,false);

-- name: HistoricalTextLikeNullChar
INSERT INTO inspection_text_like_history(score,divisor,expected_octet,expected_name,expected_cursor,expected_present,bypass) VALUES(1,0,NULL,'tail ','cursor é😊',false,false);

-- name: HistoricalTextLikeNullName
INSERT INTO inspection_text_like_history(score,divisor,expected_octet,expected_name,expected_cursor,expected_present,bypass) VALUES(1,0,'\xff',NULL,'cursor é😊',false,false);

-- name: HistoricalTextLikeNullCursor
INSERT INTO inspection_text_like_history(score,divisor,expected_octet,expected_name,expected_cursor,expected_present,bypass) VALUES(1,1,'\xff','tail ',NULL,true,false);

-- name: HistoricalTextLikeNullPresence
INSERT INTO inspection_text_like_history(score,divisor,expected_octet,expected_name,expected_cursor,expected_present,bypass) VALUES(1,1,'\xff','tail ','cursor é😊',NULL,false);

-- name: HistoricalTextLikeReachedDivision
INSERT INTO inspection_text_like_history(score,divisor,expected_octet,expected_name,expected_cursor,expected_present,bypass) VALUES(1,0,'\xff','tail ','cursor é😊',true,false);

-- name: HistoricalTextLikeBypassedDivision
INSERT INTO inspection_text_like_history(score,divisor,expected_octet,expected_name,expected_cursor,expected_present,bypass) VALUES(1,0,NULL,NULL,NULL,false,true);

-- name: HistoricalGeometryValues
INSERT INTO inspection_geometry_history(score,divisor,expected_point,expected_path,expected_bounds,expected_fixed,expected_array,expected_present,bypass) VALUES(1,1,'\x80000000000000007ff8000000000000','\x00000000023ff0000000000000400000000000000040080000000000004010000000000000','\x4008000000000000401000000000000000000000000000000000000000000000','\x3ff0000000000000400000000000000080000000000000003ff0000000000000400000000000000040080000000000004010000000000000800000000000000040000000000000004008000000000000',true,true,false);

-- name: HistoricalGeometryNullScore
INSERT INTO inspection_geometry_history(score,divisor,expected_point,expected_path,expected_bounds,expected_fixed,expected_array,expected_present,bypass) VALUES(NULL,1,'\x80000000000000007ff8000000000000','\x00000000023ff0000000000000400000000000000040080000000000004010000000000000','\x4008000000000000401000000000000000000000000000000000000000000000','\x3ff0000000000000400000000000000080000000000000003ff0000000000000400000000000000040080000000000004010000000000000800000000000000040000000000000004008000000000000',true,false,false);

-- name: HistoricalGeometryWrongPoint
INSERT INTO inspection_geometry_history(score,divisor,expected_point,expected_path,expected_bounds,expected_fixed,expected_array,expected_present,bypass) VALUES(1,1,'\x00','\x00000000023ff0000000000000400000000000000040080000000000004010000000000000','\x4008000000000000401000000000000000000000000000000000000000000000','\x3ff0000000000000400000000000000080000000000000003ff0000000000000400000000000000040080000000000004010000000000000800000000000000040000000000000004008000000000000',true,false,false);

-- name: HistoricalGeometryWrongPath
INSERT INTO inspection_geometry_history(score,divisor,expected_point,expected_path,expected_bounds,expected_fixed,expected_array,expected_present,bypass) VALUES(1,1,'\x80000000000000007ff8000000000000','\x00','\x4008000000000000401000000000000000000000000000000000000000000000','\x3ff0000000000000400000000000000080000000000000003ff0000000000000400000000000000040080000000000004010000000000000800000000000000040000000000000004008000000000000',true,true,false);

-- name: HistoricalGeometryWrongBounds
INSERT INTO inspection_geometry_history(score,divisor,expected_point,expected_path,expected_bounds,expected_fixed,expected_array,expected_present,bypass) VALUES(1,1,'\x80000000000000007ff8000000000000','\x00000000023ff0000000000000400000000000000040080000000000004010000000000000','\x00','\x3ff0000000000000400000000000000080000000000000003ff0000000000000400000000000000040080000000000004010000000000000800000000000000040000000000000004008000000000000',true,true,false);

-- name: HistoricalGeometryWrongFixed
INSERT INTO inspection_geometry_history(score,divisor,expected_point,expected_path,expected_bounds,expected_fixed,expected_array,expected_present,bypass) VALUES(1,1,'\x80000000000000007ff8000000000000','\x00000000023ff0000000000000400000000000000040080000000000004010000000000000','\x4008000000000000401000000000000000000000000000000000000000000000','\x00',true,true,false);

-- name: HistoricalGeometryWrongArray
INSERT INTO inspection_geometry_history(score,divisor,expected_point,expected_path,expected_bounds,expected_fixed,expected_array,expected_present,bypass) VALUES(1,1,'\x80000000000000007ff8000000000000','\x00000000023ff0000000000000400000000000000040080000000000004010000000000000','\x4008000000000000401000000000000000000000000000000000000000000000','\x3ff0000000000000400000000000000080000000000000003ff0000000000000400000000000000040080000000000004010000000000000800000000000000040000000000000004008000000000000',false,true,false);

-- name: HistoricalGeometryWrongPresence
INSERT INTO inspection_geometry_history(score,divisor,expected_point,expected_path,expected_bounds,expected_fixed,expected_array,expected_present,bypass) VALUES(1,1,'\x80000000000000007ff8000000000000','\x00000000023ff0000000000000400000000000000040080000000000004010000000000000','\x4008000000000000401000000000000000000000000000000000000000000000','\x3ff0000000000000400000000000000080000000000000003ff0000000000000400000000000000040080000000000004010000000000000800000000000000040000000000000004008000000000000',true,false,false);

-- name: HistoricalGeometryNullPoint
INSERT INTO inspection_geometry_history(score,divisor,expected_point,expected_path,expected_bounds,expected_fixed,expected_array,expected_present,bypass) VALUES(1,0,NULL,'\x00000000023ff0000000000000400000000000000040080000000000004010000000000000','\x4008000000000000401000000000000000000000000000000000000000000000','\x3ff0000000000000400000000000000080000000000000003ff0000000000000400000000000000040080000000000004010000000000000800000000000000040000000000000004008000000000000',true,false,false);

-- name: HistoricalGeometryNullPresence
INSERT INTO inspection_geometry_history(score,divisor,expected_point,expected_path,expected_bounds,expected_fixed,expected_array,expected_present,bypass) VALUES(1,1,'\x80000000000000007ff8000000000000','\x00000000023ff0000000000000400000000000000040080000000000004010000000000000','\x4008000000000000401000000000000000000000000000000000000000000000','\x3ff0000000000000400000000000000080000000000000003ff0000000000000400000000000000040080000000000004010000000000000800000000000000040000000000000004008000000000000',true,NULL,false);

-- name: HistoricalGeometryReachedDivision
INSERT INTO inspection_geometry_history(score,divisor,expected_point,expected_path,expected_bounds,expected_fixed,expected_array,expected_present,bypass) VALUES(1,0,'\x80000000000000007ff8000000000000','\x00000000023ff0000000000000400000000000000040080000000000004010000000000000','\x4008000000000000401000000000000000000000000000000000000000000000','\x3ff0000000000000400000000000000080000000000000003ff0000000000000400000000000000040080000000000004010000000000000800000000000000040000000000000004008000000000000',true,true,false);

-- name: HistoricalGeometryBypassedDivision
INSERT INTO inspection_geometry_history(score,divisor,expected_point,expected_path,expected_bounds,expected_fixed,expected_array,expected_present,bypass) VALUES(1,0,NULL,NULL,NULL,NULL,false,false,true);

-- name: HistoricalSystemValues
INSERT INTO inspection_system_history(score,divisor,expected_words,expected_wide,expected_pointer,expected_array,expected_present,bypass) VALUES(1,1,'\xffffffffffffffffffffffff','\xffffffffffffffff8000000000000000','\x123456781234',true,true,false);

-- name: HistoricalSystemNullScore
INSERT INTO inspection_system_history(score,divisor,expected_words,expected_wide,expected_pointer,expected_array,expected_present,bypass) VALUES(NULL,1,'\xffffffffffffffffffffffff','\xffffffffffffffff8000000000000000','\x123456781234',true,false,false);

-- name: HistoricalSystemWrongWords
INSERT INTO inspection_system_history(score,divisor,expected_words,expected_wide,expected_pointer,expected_array,expected_present,bypass) VALUES(1,1,'\x00','\xffffffffffffffff8000000000000000','\x123456781234',true,false,false);

-- name: HistoricalSystemWrongWide
INSERT INTO inspection_system_history(score,divisor,expected_words,expected_wide,expected_pointer,expected_array,expected_present,bypass) VALUES(1,1,'\xffffffffffffffffffffffff','\x00','\x123456781234',true,true,false);

-- name: HistoricalSystemWrongPointer
INSERT INTO inspection_system_history(score,divisor,expected_words,expected_wide,expected_pointer,expected_array,expected_present,bypass) VALUES(1,1,'\xffffffffffffffffffffffff','\xffffffffffffffff8000000000000000','\x00',true,true,false);

-- name: HistoricalSystemWrongArray
INSERT INTO inspection_system_history(score,divisor,expected_words,expected_wide,expected_pointer,expected_array,expected_present,bypass) VALUES(1,1,'\xffffffffffffffffffffffff','\xffffffffffffffff8000000000000000','\x123456781234',false,true,false);

-- name: HistoricalSystemWrongPresence
INSERT INTO inspection_system_history(score,divisor,expected_words,expected_wide,expected_pointer,expected_array,expected_present,bypass) VALUES(1,1,'\xffffffffffffffffffffffff','\xffffffffffffffff8000000000000000','\x123456781234',true,false,false);

-- name: HistoricalSystemNullWords
INSERT INTO inspection_system_history(score,divisor,expected_words,expected_wide,expected_pointer,expected_array,expected_present,bypass) VALUES(1,0,NULL,'\xffffffffffffffff8000000000000000','\x123456781234',true,false,false);

-- name: HistoricalSystemNullPresence
INSERT INTO inspection_system_history(score,divisor,expected_words,expected_wide,expected_pointer,expected_array,expected_present,bypass) VALUES(1,1,'\xffffffffffffffffffffffff','\xffffffffffffffff8000000000000000','\x123456781234',true,NULL,false);

-- name: HistoricalSystemReachedDivision
INSERT INTO inspection_system_history(score,divisor,expected_words,expected_wide,expected_pointer,expected_array,expected_present,bypass) VALUES(1,0,'\xffffffffffffffffffffffff','\xffffffffffffffff8000000000000000','\x123456781234',true,true,false);

-- name: HistoricalSystemBypassedDivision
INSERT INTO inspection_system_history(score,divisor,expected_words,expected_wide,expected_pointer,expected_array,expected_present,bypass) VALUES(1,0,NULL,NULL,NULL,false,false,true);

-- name: HistoricalVectorValues
INSERT INTO inspection_vector_history(score,divisor,expected_positions,expected_types,expected_rank,expected_payload,expected_present,bypass) VALUES(1,1,'-32768 0 32767','4294967295 0',1,'{"positions":[-32768,0,32767],"type_ids":["4294967295","0"]}',true,false);

-- name: HistoricalVectorNullScore
INSERT INTO inspection_vector_history(score,divisor,expected_positions,expected_types,expected_rank,expected_payload,expected_present,bypass) VALUES(NULL,1,'-32768 0 32767','4294967295 0',1,'{"positions":[-32768,0,32767],"type_ids":["4294967295","0"]}',false,false);

-- name: HistoricalVectorWrongPositions
INSERT INTO inspection_vector_history(score,divisor,expected_positions,expected_types,expected_rank,expected_payload,expected_present,bypass) VALUES(1,1,'0','4294967295 0',1,'{"positions":[-32768,0,32767],"type_ids":["4294967295","0"]}',false,false);

-- name: HistoricalVectorWrongTypes
INSERT INTO inspection_vector_history(score,divisor,expected_positions,expected_types,expected_rank,expected_payload,expected_present,bypass) VALUES(1,1,'-32768 0 32767','0',1,'{"positions":[-32768,0,32767],"type_ids":["4294967295","0"]}',true,false);

-- name: HistoricalVectorWrongRank
INSERT INTO inspection_vector_history(score,divisor,expected_positions,expected_types,expected_rank,expected_payload,expected_present,bypass) VALUES(1,1,'-32768 0 32767','4294967295 0',0,'{"positions":[-32768,0,32767],"type_ids":["4294967295","0"]}',true,false);

-- name: HistoricalVectorWrongPayload
INSERT INTO inspection_vector_history(score,divisor,expected_positions,expected_types,expected_rank,expected_payload,expected_present,bypass) VALUES(1,1,'-32768 0 32767','4294967295 0',1,'{}',true,false);

-- name: HistoricalVectorWrongPresence
INSERT INTO inspection_vector_history(score,divisor,expected_positions,expected_types,expected_rank,expected_payload,expected_present,bypass) VALUES(1,1,'-32768 0 32767','4294967295 0',1,'{"positions":[-32768,0,32767],"type_ids":["4294967295","0"]}',false,false);

-- name: HistoricalVectorNullPositions
INSERT INTO inspection_vector_history(score,divisor,expected_positions,expected_types,expected_rank,expected_payload,expected_present,bypass) VALUES(1,0,NULL,'4294967295 0',1,'{"positions":[-32768,0,32767],"type_ids":["4294967295","0"]}',false,false);

-- name: HistoricalVectorNullRank
INSERT INTO inspection_vector_history(score,divisor,expected_positions,expected_types,expected_rank,expected_payload,expected_present,bypass) VALUES(1,1,'-32768 0 32767','4294967295 0',NULL,'{"positions":[-32768,0,32767],"type_ids":["4294967295","0"]}',true,false);

-- name: HistoricalVectorNullPresence
INSERT INTO inspection_vector_history(score,divisor,expected_positions,expected_types,expected_rank,expected_payload,expected_present,bypass) VALUES(1,1,'-32768 0 32767','4294967295 0',1,'{"positions":[-32768,0,32767],"type_ids":["4294967295","0"]}',NULL,false);

-- name: HistoricalVectorReachedDivision
INSERT INTO inspection_vector_history(score,divisor,expected_positions,expected_types,expected_rank,expected_payload,expected_present,bypass) VALUES(1,0,'-32768 0 32767','4294967295 0',1,'{"positions":[-32768,0,32767],"type_ids":["4294967295","0"]}',true,false);

-- name: HistoricalVectorBypassedDivision
INSERT INTO inspection_vector_history(score,divisor,expected_positions,expected_types,expected_rank,expected_payload,expected_present,bypass) VALUES(1,0,NULL,NULL,NULL,NULL,false,true);

-- name: HistoricalSnapshotValues
INSERT INTO inspection_snapshot_history(score,divisor,input_text,expected_lower,expected_modern,expected_legacy,expected_upper,expected_visible,expected_payload,expected_present,bypass) VALUES(1,1,'1:9:3','1','\x000000020000000000000001000000000000000900000000000000030000000000000005','\x00000001fffffffffffffffefffffffffffffffffffffffffffffffe','-1',true,'["1:9:3,5",null,"1:1:"]',true,false);

-- name: HistoricalSnapshotNullScore
INSERT INTO inspection_snapshot_history(score,divisor,input_text,expected_lower,expected_modern,expected_legacy,expected_upper,expected_visible,expected_payload,expected_present,bypass) VALUES(NULL,1,'1:9:3','1','\x000000020000000000000001000000000000000900000000000000030000000000000005','\x00000001fffffffffffffffefffffffffffffffffffffffffffffffe','-1',true,'["1:9:3,5",null,"1:1:"]',false,false);

-- name: HistoricalSnapshotWrongModern
INSERT INTO inspection_snapshot_history(score,divisor,input_text,expected_lower,expected_modern,expected_legacy,expected_upper,expected_visible,expected_payload,expected_present,bypass) VALUES(1,1,'1:9:3','1','\x00','\x00000001fffffffffffffffefffffffffffffffffffffffffffffffe','-1',true,'["1:9:3,5",null,"1:1:"]',true,false);

-- name: HistoricalSnapshotWrongLegacy
INSERT INTO inspection_snapshot_history(score,divisor,input_text,expected_lower,expected_modern,expected_legacy,expected_upper,expected_visible,expected_payload,expected_present,bypass) VALUES(1,1,'1:9:3','1','\x000000020000000000000001000000000000000900000000000000030000000000000005','\x00','-1',true,'["1:9:3,5",null,"1:1:"]',true,false);

-- name: HistoricalSnapshotWrongUpper
INSERT INTO inspection_snapshot_history(score,divisor,input_text,expected_lower,expected_modern,expected_legacy,expected_upper,expected_visible,expected_payload,expected_present,bypass) VALUES(1,1,'1:9:3','1','\x000000020000000000000001000000000000000900000000000000030000000000000005','\x00000001fffffffffffffffefffffffffffffffffffffffffffffffe','18446744073709551615',true,'["1:9:3,5",null,"1:1:"]',true,false);

-- name: HistoricalSnapshotWrongVisible
INSERT INTO inspection_snapshot_history(score,divisor,input_text,expected_lower,expected_modern,expected_legacy,expected_upper,expected_visible,expected_payload,expected_present,bypass) VALUES(1,1,'1:9:3','1','\x000000020000000000000001000000000000000900000000000000030000000000000005','\x00000001fffffffffffffffefffffffffffffffffffffffffffffffe','-1',false,'["1:9:3,5",null,"1:1:"]',false,false);

-- name: HistoricalSnapshotWrongPayload
INSERT INTO inspection_snapshot_history(score,divisor,input_text,expected_lower,expected_modern,expected_legacy,expected_upper,expected_visible,expected_payload,expected_present,bypass) VALUES(1,1,'1:9:3','1','\x000000020000000000000001000000000000000900000000000000030000000000000005','\x00000001fffffffffffffffefffffffffffffffffffffffffffffffe','-1',true,'[]',true,false);

-- name: HistoricalSnapshotWrongPresence
INSERT INTO inspection_snapshot_history(score,divisor,input_text,expected_lower,expected_modern,expected_legacy,expected_upper,expected_visible,expected_payload,expected_present,bypass) VALUES(1,1,'1:9:3','1','\x000000020000000000000001000000000000000900000000000000030000000000000005','\x00000001fffffffffffffffefffffffffffffffffffffffffffffffe','-1',true,'["1:9:3,5",null,"1:1:"]',false,false);

-- name: HistoricalSnapshotNullPresence
INSERT INTO inspection_snapshot_history(score,divisor,input_text,expected_lower,expected_modern,expected_legacy,expected_upper,expected_visible,expected_payload,expected_present,bypass) VALUES(1,1,'1:9:3','1','\x000000020000000000000001000000000000000900000000000000030000000000000005','\x00000001fffffffffffffffefffffffffffffffffffffffffffffffe','-1',true,'["1:9:3,5",null,"1:1:"]',NULL,false);

-- name: HistoricalSnapshotNullInput
INSERT INTO inspection_snapshot_history(score,divisor,input_text,expected_lower,expected_modern,expected_legacy,expected_upper,expected_visible,expected_payload,expected_present,bypass) VALUES(1,1,NULL,NULL,'\x000000020000000000000001000000000000000900000000000000030000000000000005','\x00000001fffffffffffffffefffffffffffffffffffffffffffffffe','-1',true,'["1:9:3,5",null,"1:1:"]',true,false);

-- name: HistoricalSnapshotReachedDivision
INSERT INTO inspection_snapshot_history(score,divisor,input_text,expected_lower,expected_modern,expected_legacy,expected_upper,expected_visible,expected_payload,expected_present,bypass) VALUES(1,0,'1:9:3','1','\x000000020000000000000001000000000000000900000000000000030000000000000005','\x00000001fffffffffffffffefffffffffffffffffffffffffffffffe','-1',true,'["1:9:3,5",null,"1:1:"]',true,false);

-- name: HistoricalSnapshotInvalidEpochMinimum
INSERT INTO inspection_snapshot_history(score,divisor,input_text,expected_lower,expected_modern,expected_legacy,expected_upper,expected_visible,expected_payload,expected_present,bypass) VALUES(1,1,'4294967296:4294967297:','4294967296','\x000000020000000000000001000000000000000900000000000000030000000000000005','\x00000001fffffffffffffffefffffffffffffffffffffffffffffffe','-1',true,'["1:9:3,5",null,"1:1:"]',true,false);

-- name: HistoricalSnapshotInvalidEpochMaximum
INSERT INTO inspection_snapshot_history(score,divisor,input_text,expected_lower,expected_modern,expected_legacy,expected_upper,expected_visible,expected_payload,expected_present,bypass) VALUES(1,1,'1:4294967296:','1','\x000000020000000000000001000000000000000900000000000000030000000000000005','\x00000001fffffffffffffffefffffffffffffffffffffffffffffffe','-1',true,'["1:9:3,5",null,"1:1:"]',true,false);

-- name: HistoricalSnapshotBypassedErrors
INSERT INTO inspection_snapshot_history(score,divisor,input_text,expected_lower,expected_modern,expected_legacy,expected_upper,expected_visible,expected_payload,expected_present,bypass) VALUES(1,0,'bad','1',NULL,NULL,NULL,false,NULL,false,true);

-- name: HistoricalFulltextValues
INSERT INTO inspection_fulltext_history(score,divisor,expected_document,expected_query,expected_match,expected_array,expected_record,expected_present,bypass) VALUES(1,1,'''a'':1A,3B ''b'':2C',E'\\x0000000502020203010000630001000062000100006100',true,'["''a'':1A", null, "''b''"]','{"query": "''a'' & ''b'' & ''c''", "document": "''a'':1A"}',true,false);

-- name: HistoricalFulltextNullScore
INSERT INTO inspection_fulltext_history(score,divisor,expected_document,expected_query,expected_match,expected_array,expected_record,expected_present,bypass) VALUES(NULL,1,'''a'':1A,3B ''b'':2C',E'\\x0000000502020203010000630001000062000100006100',true,'["''a'':1A", null, "''b''"]','{"query": "''a'' & ''b'' & ''c''", "document": "''a'':1A"}',false,false);

-- name: HistoricalFulltextWrongDocument
INSERT INTO inspection_fulltext_history(score,divisor,expected_document,expected_query,expected_match,expected_array,expected_record,expected_present,bypass) VALUES(1,1,'different',E'\\x0000000502020203010000630001000062000100006100',true,'["''a'':1A", null, "''b''"]','{"query": "''a'' & ''b'' & ''c''", "document": "''a'':1A"}',true,false);

-- name: HistoricalFulltextWrongQuery
INSERT INTO inspection_fulltext_history(score,divisor,expected_document,expected_query,expected_match,expected_array,expected_record,expected_present,bypass) VALUES(1,1,'''a'':1A,3B ''b'':2C','\x00',true,'["''a'':1A", null, "''b''"]','{"query": "''a'' & ''b'' & ''c''", "document": "''a'':1A"}',true,false);

-- name: HistoricalFulltextWrongMatch
INSERT INTO inspection_fulltext_history(score,divisor,expected_document,expected_query,expected_match,expected_array,expected_record,expected_present,bypass) VALUES(1,1,'''a'':1A,3B ''b'':2C',E'\\x0000000502020203010000630001000062000100006100',false,'["''a'':1A", null, "''b''"]','{"query": "''a'' & ''b'' & ''c''", "document": "''a'':1A"}',false,false);

-- name: HistoricalFulltextWrongArray
INSERT INTO inspection_fulltext_history(score,divisor,expected_document,expected_query,expected_match,expected_array,expected_record,expected_present,bypass) VALUES(1,1,'''a'':1A,3B ''b'':2C',E'\\x0000000502020203010000630001000062000100006100',true,'[]','{"query": "''a'' & ''b'' & ''c''", "document": "''a'':1A"}',true,false);

-- name: HistoricalFulltextWrongRecord
INSERT INTO inspection_fulltext_history(score,divisor,expected_document,expected_query,expected_match,expected_array,expected_record,expected_present,bypass) VALUES(1,1,'''a'':1A,3B ''b'':2C',E'\\x0000000502020203010000630001000062000100006100',true,'["''a'':1A", null, "''b''"]','{}',true,false);

-- name: HistoricalFulltextWrongPresence
INSERT INTO inspection_fulltext_history(score,divisor,expected_document,expected_query,expected_match,expected_array,expected_record,expected_present,bypass) VALUES(1,1,'''a'':1A,3B ''b'':2C',E'\\x0000000502020203010000630001000062000100006100',true,'["''a'':1A", null, "''b''"]','{"query": "''a'' & ''b'' & ''c''", "document": "''a'':1A"}',false,false);

-- name: HistoricalFulltextNullPresence
INSERT INTO inspection_fulltext_history(score,divisor,expected_document,expected_query,expected_match,expected_array,expected_record,expected_present,bypass) VALUES(1,1,'''a'':1A,3B ''b'':2C',E'\\x0000000502020203010000630001000062000100006100',true,'["''a'':1A", null, "''b''"]','{"query": "''a'' & ''b'' & ''c''", "document": "''a'':1A"}',NULL,false);

-- name: HistoricalFulltextNullMatch
INSERT INTO inspection_fulltext_history(score,divisor,expected_document,expected_query,expected_match,expected_array,expected_record,expected_present,bypass) VALUES(1,0,'''a'':1A,3B ''b'':2C',E'\\x0000000502020203010000630001000062000100006100',NULL,'["''a'':1A", null, "''b''"]','{"query": "''a'' & ''b'' & ''c''", "document": "''a'':1A"}',false,false);

-- name: HistoricalFulltextReachedDivision
INSERT INTO inspection_fulltext_history(score,divisor,expected_document,expected_query,expected_match,expected_array,expected_record,expected_present,bypass) VALUES(1,0,'''a'':1A,3B ''b'':2C',E'\\x0000000502020203010000630001000062000100006100',true,'["''a'':1A", null, "''b''"]','{"query": "''a'' & ''b'' & ''c''", "document": "''a'':1A"}',true,false);

-- name: HistoricalFulltextBypassedDivision
INSERT INTO inspection_fulltext_history(score,divisor,expected_document,expected_query,expected_match,expected_array,expected_record,expected_present,bypass) VALUES(1,0,NULL,NULL,false,NULL,NULL,false,true);

-- name: HistoricalAliasValues
INSERT INTO inspection_alias_history(score,divisor,expected_text,expected_wire,expected_roles,expected_record,expected_present,bypass) VALUES(1,1,'-','\x00000000','["-",null]','{"current_object":"-","roles":["-",null]}',true,false);

-- name: HistoricalAliasNullScore
INSERT INTO inspection_alias_history(score,divisor,expected_text,expected_wire,expected_roles,expected_record,expected_present,bypass) VALUES(NULL,1,NULL,NULL,'["-",null]','{"current_object":"-","roles":["-",null]}',false,false);

-- name: HistoricalAliasNegativeScore
INSERT INTO inspection_alias_history(score,divisor,expected_text,expected_wire,expected_roles,expected_record,expected_present,bypass) VALUES(-1,1,NULL,NULL,'["-",null]','{"current_object":"-","roles":["-",null]}',true,false);

-- name: HistoricalAliasWrongText
INSERT INTO inspection_alias_history(score,divisor,expected_text,expected_wire,expected_roles,expected_record,expected_present,bypass) VALUES(1,1,'0','\x00000000','["-",null]','{"current_object":"-","roles":["-",null]}',true,false);

-- name: HistoricalAliasWrongWire
INSERT INTO inspection_alias_history(score,divisor,expected_text,expected_wire,expected_roles,expected_record,expected_present,bypass) VALUES(1,1,'-','\x00000001','["-",null]','{"current_object":"-","roles":["-",null]}',true,false);

-- name: HistoricalAliasWrongRoles
INSERT INTO inspection_alias_history(score,divisor,expected_text,expected_wire,expected_roles,expected_record,expected_present,bypass) VALUES(1,1,'-','\x00000000','["0",null]','{"current_object":"-","roles":["-",null]}',true,false);

-- name: HistoricalAliasWrongRecord
INSERT INTO inspection_alias_history(score,divisor,expected_text,expected_wire,expected_roles,expected_record,expected_present,bypass) VALUES(1,1,'-','\x00000000','["-",null]','{}',true,false);

-- name: HistoricalAliasWrongPresence
INSERT INTO inspection_alias_history(score,divisor,expected_text,expected_wire,expected_roles,expected_record,expected_present,bypass) VALUES(1,1,'-','\x00000000','["-",null]','{"current_object":"-","roles":["-",null]}',false,false);

-- name: HistoricalAliasNullPresence
INSERT INTO inspection_alias_history(score,divisor,expected_text,expected_wire,expected_roles,expected_record,expected_present,bypass) VALUES(1,1,'-','\x00000000','["-",null]','{"current_object":"-","roles":["-",null]}',NULL,false);

-- name: HistoricalAliasReachedDivision
INSERT INTO inspection_alias_history(score,divisor,expected_text,expected_wire,expected_roles,expected_record,expected_present,bypass) VALUES(1,0,'-','\x00000000','["-",null]','{"current_object":"-","roles":["-",null]}',true,false);

-- name: HistoricalAliasBypassedDivision
INSERT INTO inspection_alias_history(score,divisor,expected_text,expected_wire,expected_roles,expected_record,expected_present,bypass) VALUES(1,0,NULL,NULL,NULL,NULL,NULL,true);

-- name: HistoricalAclValues
INSERT INTO inspection_acl_history(score,divisor,expected_nonnull,expected_count,expected_equal,expected_present,obsolete_call,bypass) VALUES(1,1,true,2,false,true,false,false);

-- name: HistoricalAclNullScore
INSERT INTO inspection_acl_history(score,divisor,expected_nonnull,expected_count,expected_equal,expected_present,obsolete_call,bypass) VALUES(NULL,1,true,2,NULL,false,false,false);

-- name: HistoricalAclZeroIdentity
INSERT INTO inspection_acl_history(score,divisor,expected_nonnull,expected_count,expected_equal,expected_present,obsolete_call,bypass) VALUES(0,1,true,2,false,true,false,false);

-- name: HistoricalAclWrongPresence
INSERT INTO inspection_acl_history(score,divisor,expected_nonnull,expected_count,expected_equal,expected_present,obsolete_call,bypass) VALUES(1,1,false,2,false,true,false,false);

-- name: HistoricalAclWrongCount
INSERT INTO inspection_acl_history(score,divisor,expected_nonnull,expected_count,expected_equal,expected_present,obsolete_call,bypass) VALUES(1,1,true,3,false,true,false,false);

-- name: HistoricalAclWrongEquality
INSERT INTO inspection_acl_history(score,divisor,expected_nonnull,expected_count,expected_equal,expected_present,obsolete_call,bypass) VALUES(1,1,true,2,true,true,false,false);

-- name: HistoricalAclWrongResultPresence
INSERT INTO inspection_acl_history(score,divisor,expected_nonnull,expected_count,expected_equal,expected_present,obsolete_call,bypass) VALUES(1,1,true,2,false,false,false,false);

-- name: HistoricalAclNullPresence
INSERT INTO inspection_acl_history(score,divisor,expected_nonnull,expected_count,expected_equal,expected_present,obsolete_call,bypass) VALUES(1,1,NULL,2,false,true,false,false);

-- name: HistoricalAclReachedDivision
INSERT INTO inspection_acl_history(score,divisor,expected_nonnull,expected_count,expected_equal,expected_present,obsolete_call,bypass) VALUES(1,0,true,2,false,true,false,false);

-- name: HistoricalAclReachedObsoleteCall
INSERT INTO inspection_acl_history(score,divisor,expected_nonnull,expected_count,expected_equal,expected_present,obsolete_call,bypass) VALUES(1,1,true,2,false,true,true,false);

-- name: HistoricalAclBypassedErrors
INSERT INTO inspection_acl_history(score,divisor,expected_nonnull,expected_count,expected_equal,expected_present,obsolete_call,bypass) VALUES(1,0,NULL,NULL,NULL,NULL,true,true);

-- name: QuotedIdentifierKeyword
INSERT INTO inspection_quoted_identifiers(label,expected_text,expected_present,expected_selected,choose_label,divisor,bypass) VALUES('select','"select"',true,'"select"',true,1,false);

-- name: QuotedIdentifierCase
INSERT INTO inspection_quoted_identifiers(label,expected_text,expected_present,expected_selected,choose_label,divisor,bypass) VALUES('MixedCase','"MixedCase"',true,'"MixedCase"',true,1,false);

-- name: QuotedIdentifierQuote
INSERT INTO inspection_quoted_identifiers(label,expected_text,expected_present,expected_selected,choose_label,divisor,bypass) VALUES('a"b','"a""b"',true,'"a""b"',true,1,false);

-- name: QuotedIdentifierUnicode
INSERT INTO inspection_quoted_identifiers(label,expected_text,expected_present,expected_selected,choose_label,divisor,bypass) VALUES('é😀','"é😀"',true,'"é😀"',true,1,false);

-- name: QuotedIdentifierNull
INSERT INTO inspection_quoted_identifiers(label,expected_text,expected_present,expected_selected,choose_label,divisor,bypass) VALUES(NULL,NULL,false,NULL,true,1,false);

-- name: QuotedIdentifierSkippedLabel
INSERT INTO inspection_quoted_identifiers(label,expected_text,expected_present,expected_selected,choose_label,divisor,bypass) VALUES('select','"select"',true,NULL,false,1,false);

-- name: QuotedIdentifierWrongText
INSERT INTO inspection_quoted_identifiers(label,expected_text,expected_present,expected_selected,choose_label,divisor,bypass) VALUES('select','select',true,'"select"',true,1,false);

-- name: QuotedIdentifierWrongPresence
INSERT INTO inspection_quoted_identifiers(label,expected_text,expected_present,expected_selected,choose_label,divisor,bypass) VALUES('select','"select"',false,'"select"',true,1,false);

-- name: QuotedIdentifierWrongSelection
INSERT INTO inspection_quoted_identifiers(label,expected_text,expected_present,expected_selected,choose_label,divisor,bypass) VALUES('select','"select"',true,NULL,true,1,false);

-- name: QuotedIdentifierReachedError
INSERT INTO inspection_quoted_identifiers(label,expected_text,expected_present,expected_selected,choose_label,divisor,bypass) VALUES('select','"select"',true,'"select"',true,0,false);

-- name: QuotedIdentifierBypassedError
INSERT INTO inspection_quoted_identifiers(label,expected_text,expected_present,expected_selected,choose_label,divisor,bypass) VALUES('plain',NULL,NULL,NULL,true,0,true);

-- name: IdentifierPresenceWithoutSetting
INSERT INTO inspection_identifier_presence(label,expected_present,bypass) VALUES('plain',true,false);

-- name: IdentifierPresenceNull
INSERT INTO inspection_identifier_presence(label,expected_present,bypass) VALUES(NULL,false,false);

-- name: IdentifierPresenceRejected
INSERT INTO inspection_identifier_presence(label,expected_present,bypass) VALUES('plain',false,false);

-- name: IdentifierPresenceBypassed
INSERT INTO inspection_identifier_presence(label,expected_present,bypass) VALUES('plain',NULL,true);

-- name: NameCastEqual
INSERT INTO inspection_name_casts(source,varying_value,padded,reference,expected_equal,expected_padded,expected_less,expected_nulled,expected_array,bypass) VALUES('alpha','alpha','alpha','alpha',true,true,false,true,true,false);

-- name: NameCastIncreasing
INSERT INTO inspection_name_casts(source,varying_value,padded,reference,expected_equal,expected_padded,expected_less,expected_nulled,expected_array,bypass) VALUES('alpha','alpha','alpha','beta',false,false,true,false,false,false);

-- name: NameCastDecreasing
INSERT INTO inspection_name_casts(source,varying_value,padded,reference,expected_equal,expected_padded,expected_less,expected_nulled,expected_array,bypass) VALUES('beta','beta','beta','alpha',false,false,false,false,false,false);

-- name: NameCastPaddedTrimming
INSERT INTO inspection_name_casts(source,varying_value,padded,reference,expected_equal,expected_padded,expected_less,expected_nulled,expected_array,bypass) VALUES('a   ','a   ','a   ','a',false,true,false,false,false,false);

-- name: NameCastNullPair
INSERT INTO inspection_name_casts(source,varying_value,padded,reference,expected_equal,expected_padded,expected_less,expected_nulled,expected_array,bypass) VALUES(NULL,NULL,NULL,NULL,NULL,NULL,NULL,true,true,false);

-- name: NameCastNullSource
INSERT INTO inspection_name_casts(source,varying_value,padded,reference,expected_equal,expected_padded,expected_less,expected_nulled,expected_array,bypass) VALUES(NULL,NULL,NULL,'a',NULL,NULL,NULL,true,false,false);

-- name: NameCastNullReference
INSERT INTO inspection_name_casts(source,varying_value,padded,reference,expected_equal,expected_padded,expected_less,expected_nulled,expected_array,bypass) VALUES('a','a','a',NULL,NULL,NULL,NULL,false,false,false);

-- name: NameCastWrongEquality
INSERT INTO inspection_name_casts(source,varying_value,padded,reference,expected_equal,expected_padded,expected_less,expected_nulled,expected_array,bypass) VALUES('alpha','alpha','alpha','alpha',false,true,false,true,true,false);

-- name: NameCastWrongOrdering
INSERT INTO inspection_name_casts(source,varying_value,padded,reference,expected_equal,expected_padded,expected_less,expected_nulled,expected_array,bypass) VALUES('alpha','alpha','alpha','beta',false,false,false,false,false,false);

-- name: NameCastWrongArray
INSERT INTO inspection_name_casts(source,varying_value,padded,reference,expected_equal,expected_padded,expected_less,expected_nulled,expected_array,bypass) VALUES('alpha','alpha','alpha','alpha',true,true,false,true,false,false);

-- name: NameCastWrongNullif
INSERT INTO inspection_name_casts(source,varying_value,padded,reference,expected_equal,expected_padded,expected_less,expected_nulled,expected_array,bypass) VALUES('alpha','alpha','alpha','beta',false,false,true,true,false,false);

-- name: NameCastBypassed
INSERT INTO inspection_name_casts(source,varying_value,padded,reference,expected_equal,expected_padded,expected_less,expected_nulled,expected_array,bypass) VALUES('arbitrary','arbitrary','arbitrary','other',NULL,NULL,NULL,NULL,NULL,true);

-- name: FloatCastOne
INSERT INTO inspection_float_text(single_value,double_value,expected_single,expected_double,expected_short,expected_quotient,divisor,bypass) VALUES(1,1,'1','1','1','1',1,false);

-- name: FloatCastNegativeZero
INSERT INTO inspection_float_text(single_value,double_value,expected_single,expected_double,expected_short,expected_quotient,divisor,bypass) VALUES('-0','-0','-0','-0','-0','-0',1,false);

-- name: FloatCastSpecial
INSERT INTO inspection_float_text(single_value,double_value,expected_single,expected_double,expected_short,expected_quotient,divisor,bypass) VALUES('NaN','Infinity','NaN','Infinity','Infini','Infinity',1,false);

-- name: FloatCastNull
INSERT INTO inspection_float_text(single_value,double_value,expected_single,expected_double,expected_short,expected_quotient,divisor,bypass) VALUES(NULL,NULL,NULL,NULL,NULL,NULL,1,false);

-- name: FloatCastPrecision
INSERT INTO inspection_float_text(single_value,double_value,expected_single,expected_double,expected_short,expected_quotient,divisor,bypass) VALUES(1.23456789,1.2345678901234567,'1.2345679','1.2345678901234567','1.2345','1.2345678901234567',1,false);

-- name: FloatCastWrongSingle
INSERT INTO inspection_float_text(single_value,double_value,expected_single,expected_double,expected_short,expected_quotient,divisor,bypass) VALUES(1,1,'wrong','1','1','1',1,false);

-- name: FloatCastWrongDouble
INSERT INTO inspection_float_text(single_value,double_value,expected_single,expected_double,expected_short,expected_quotient,divisor,bypass) VALUES(1,1,'1','wrong','1','1',1,false);

-- name: FloatCastWrongWidth
INSERT INTO inspection_float_text(single_value,double_value,expected_single,expected_double,expected_short,expected_quotient,divisor,bypass) VALUES(1,1,'1','1','wrong','1',1,false);

-- name: FloatCastWrongQuotient
INSERT INTO inspection_float_text(single_value,double_value,expected_single,expected_double,expected_short,expected_quotient,divisor,bypass) VALUES(1,1,'1','1','1','wrong',1,false);

-- name: FloatCastDivisionError
INSERT INTO inspection_float_text(single_value,double_value,expected_single,expected_double,expected_short,expected_quotient,divisor,bypass) VALUES(1,1,'1','1','1','1',0,false);

-- name: FloatCastBypassed
INSERT INTO inspection_float_text(single_value,double_value,expected_single,expected_double,expected_short,expected_quotient,divisor,bypass) VALUES(1,1,'wrong','wrong','wrong','wrong',0,true);

-- name: BinaryCastControl
INSERT INTO inspection_binary_text(payload,expected_text,expected_short,expected_array,expected_document,expected_present,divisor,bypass) VALUES('\x00615c7fff','\x00615c7fff','\x006','{"\\x00615c7fff",NULL}','"\\x00615c7fff"'::jsonb,true,1,false);

-- name: BinaryCastNull
INSERT INTO inspection_binary_text(payload,expected_text,expected_short,expected_array,expected_document,expected_present,divisor,bypass) VALUES(NULL,NULL,NULL,'{NULL,NULL}',NULL,false,1,false);

-- name: BinaryCastAscii
INSERT INTO inspection_binary_text(payload,expected_text,expected_short,expected_array,expected_document,expected_present,divisor,bypass) VALUES('\x616263','\x616263','\x616','{"\\x616263",NULL}','"\\x616263"'::jsonb,true,1,false);

-- name: BinaryCastWrongText
INSERT INTO inspection_binary_text(payload,expected_text,expected_short,expected_array,expected_document,expected_present,divisor,bypass) VALUES('\x00615c7fff','wrong','\x006','{"\\x00615c7fff",NULL}','"\\x00615c7fff"'::jsonb,true,1,false);

-- name: BinaryCastWrongWidth
INSERT INTO inspection_binary_text(payload,expected_text,expected_short,expected_array,expected_document,expected_present,divisor,bypass) VALUES('\x00615c7fff','\x00615c7fff','wrong','{"\\x00615c7fff",NULL}','"\\x00615c7fff"'::jsonb,true,1,false);

-- name: BinaryCastWrongArray
INSERT INTO inspection_binary_text(payload,expected_text,expected_short,expected_array,expected_document,expected_present,divisor,bypass) VALUES('\x00615c7fff','\x00615c7fff','\x006','wrong','"\\x00615c7fff"'::jsonb,true,1,false);

-- name: BinaryCastWrongJson
INSERT INTO inspection_binary_text(payload,expected_text,expected_short,expected_array,expected_document,expected_present,divisor,bypass) VALUES('\x00615c7fff','\x00615c7fff','\x006','{"\\x00615c7fff",NULL}','null'::jsonb,true,1,false);

-- name: BinaryCastWrongPresence
INSERT INTO inspection_binary_text(payload,expected_text,expected_short,expected_array,expected_document,expected_present,divisor,bypass) VALUES('\x00615c7fff','\x00615c7fff','\x006','{"\\x00615c7fff",NULL}','"\\x00615c7fff"'::jsonb,false,1,false);

-- name: BinaryCastDivisionError
INSERT INTO inspection_binary_text(payload,expected_text,expected_short,expected_array,expected_document,expected_present,divisor,bypass) VALUES('\x00615c7fff','\x00615c7fff','\x006','{"\\x00615c7fff",NULL}','"\\x00615c7fff"'::jsonb,true,0,false);

-- name: BinaryCastBypassed
INSERT INTO inspection_binary_text(payload,expected_text,expected_short,expected_array,expected_document,expected_present,divisor,bypass) VALUES('\x00615c7fff','wrong','\x006','{"\\x00615c7fff",NULL}','"\\x00615c7fff"'::jsonb,true,0,true);

-- name: CalendarCastOrdinary
INSERT INTO inspection_calendar_text(day_value,stamp_value,expected_day,expected_stamp,expected_array,expected_present,bypass) VALUES('2001-02-03','2001-02-03 01:02:03.000004','2001-02-03','2001-02-03 01:02:03.000004','{2001-02-03,NULL}',true,false);

-- name: CalendarCastBc
INSERT INTO inspection_calendar_text(day_value,stamp_value,expected_day,expected_stamp,expected_array,expected_present,bypass) VALUES('0001-02-03 BC','0001-02-03 01:02:03.000004 BC','0001-02-03 BC','0001-02-03 01:02:03.000004 BC','{"0001-02-03 BC",NULL}',true,false);

-- name: CalendarCastNull
INSERT INTO inspection_calendar_text(day_value,stamp_value,expected_day,expected_stamp,expected_array,expected_present,bypass) VALUES(NULL,NULL,NULL,NULL,'{NULL,NULL}',false,false);

-- name: CalendarCastInfinity
INSERT INTO inspection_calendar_text(day_value,stamp_value,expected_day,expected_stamp,expected_array,expected_present,bypass) VALUES('infinity','-infinity','infinity','-infinity','{infinity,NULL}',true,false);

-- name: CalendarCastWrongDay
INSERT INTO inspection_calendar_text(day_value,stamp_value,expected_day,expected_stamp,expected_array,expected_present,bypass) VALUES('2001-02-03','2001-02-03','wrong','2001-02-03 00:00:00','{2001-02-03,NULL}',true,false);

-- name: CalendarCastWrongStamp
INSERT INTO inspection_calendar_text(day_value,stamp_value,expected_day,expected_stamp,expected_array,expected_present,bypass) VALUES('2001-02-03','2001-02-03','2001-02-03','wrong','{2001-02-03,NULL}',true,false);

-- name: CalendarCastWrongArray
INSERT INTO inspection_calendar_text(day_value,stamp_value,expected_day,expected_stamp,expected_array,expected_present,bypass) VALUES('2001-02-03','2001-02-03','2001-02-03','2001-02-03 00:00:00','wrong',true,false);

-- name: CalendarCastWrongPresence
INSERT INTO inspection_calendar_text(day_value,stamp_value,expected_day,expected_stamp,expected_array,expected_present,bypass) VALUES('2001-02-03','2001-02-03','2001-02-03','2001-02-03 00:00:00','{2001-02-03,NULL}',false,false);

-- name: CalendarCastBypassed
INSERT INTO inspection_calendar_text(day_value,stamp_value,expected_day,expected_stamp,expected_array,expected_present,bypass) VALUES('2001-02-03','2001-02-03','wrong','wrong','wrong',false,true);

-- name: IntervalCastOrdinary
INSERT INTO inspection_interval_text(duration,expected_text,expected_short,expected_array,expected_document,expected_present,bypass) VALUES('P1Y2M3DT4H5M6.123456S','1 year 2 mons 3 days 04:05:06.123456','1 year 2 mons 3','{"1 year 2 mons 3 days 04:05:06.123456",NULL}','"1 year 2 mons 3 days 04:05:06.123456"'::jsonb,true,false);

-- name: IntervalCastMixed
INSERT INTO inspection_interval_text(duration,expected_text,expected_short,expected_array,expected_document,expected_present,bypass) VALUES('-1 mons +2 days -3.000004 seconds','-1 mons +2 days -00:00:03.000004','-1 mons +2 days','{"-1 mons +2 days -00:00:03.000004",NULL}','"-1 mons +2 days -00:00:03.000004"'::jsonb,true,false);

-- name: IntervalCastZero
INSERT INTO inspection_interval_text(duration,expected_text,expected_short,expected_array,expected_document,expected_present,bypass) VALUES('PT0S','00:00:00','00:00:00','{00:00:00,NULL}','"00:00:00"'::jsonb,true,false);

-- name: IntervalCastInfinity
INSERT INTO inspection_interval_text(duration,expected_text,expected_short,expected_array,expected_document,expected_present,bypass) VALUES('infinity','infinity','infinity','{infinity,NULL}','"infinity"'::jsonb,true,false);

-- name: IntervalCastNull
INSERT INTO inspection_interval_text(duration,expected_text,expected_short,expected_array,expected_document,expected_present,bypass) VALUES(NULL,NULL,NULL,'{NULL,NULL}',NULL,false,false);

-- name: IntervalCastWrongText
INSERT INTO inspection_interval_text(duration,expected_text,expected_short,expected_array,expected_document,expected_present,bypass) VALUES('P1Y2M3DT4H5M6.123456S','wrong','1 year 2 mons 3','{"1 year 2 mons 3 days 04:05:06.123456",NULL}','"1 year 2 mons 3 days 04:05:06.123456"'::jsonb,true,false);

-- name: IntervalCastWrongWidth
INSERT INTO inspection_interval_text(duration,expected_text,expected_short,expected_array,expected_document,expected_present,bypass) VALUES('P1Y2M3DT4H5M6.123456S','1 year 2 mons 3 days 04:05:06.123456','wrong','{"1 year 2 mons 3 days 04:05:06.123456",NULL}','"1 year 2 mons 3 days 04:05:06.123456"'::jsonb,true,false);

-- name: IntervalCastWrongArray
INSERT INTO inspection_interval_text(duration,expected_text,expected_short,expected_array,expected_document,expected_present,bypass) VALUES('P1Y2M3DT4H5M6.123456S','1 year 2 mons 3 days 04:05:06.123456','1 year 2 mons 3','wrong','"1 year 2 mons 3 days 04:05:06.123456"'::jsonb,true,false);

-- name: IntervalCastWrongJson
INSERT INTO inspection_interval_text(duration,expected_text,expected_short,expected_array,expected_document,expected_present,bypass) VALUES('P1Y2M3DT4H5M6.123456S','1 year 2 mons 3 days 04:05:06.123456','1 year 2 mons 3','{"1 year 2 mons 3 days 04:05:06.123456",NULL}','null'::jsonb,true,false);

-- name: IntervalCastWrongPresence
INSERT INTO inspection_interval_text(duration,expected_text,expected_short,expected_array,expected_document,expected_present,bypass) VALUES('P1Y2M3DT4H5M6.123456S','1 year 2 mons 3 days 04:05:06.123456','1 year 2 mons 3','{"1 year 2 mons 3 days 04:05:06.123456",NULL}','"1 year 2 mons 3 days 04:05:06.123456"'::jsonb,false,false);

-- name: IntervalCastBypassed
INSERT INTO inspection_interval_text(duration,expected_text,expected_short,expected_array,expected_document,expected_present,bypass) VALUES('P1Y2M3DT4H5M6.123456S','wrong','1 year 2 mons 3','{"1 year 2 mons 3 days 04:05:06.123456",NULL}','"1 year 2 mons 3 days 04:05:06.123456"'::jsonb,true,true);

-- name: IntervalInputMixed
INSERT INTO inspection_interval_input(source,array_source,expected,rounded,bypass) VALUES('-1 day 2 hours 1 microsecond','{"-1 day 2 hours 1 microsecond",NULL}','P-1DT2H0.000001S','P-1DT2H',false);

-- name: IntervalInputSignedZero
INSERT INTO inspection_interval_input(source,array_source,expected,rounded,bypass) VALUES('-0 day 2 hours','{"-0 day 2 hours",NULL}','PT2H','PT2H',false);

-- name: IntervalInputNull
INSERT INTO inspection_interval_input(source,array_source,expected,rounded,bypass) VALUES(NULL,'{NULL,NULL}',NULL,NULL,false);

-- name: IntervalInputInfinity
INSERT INTO inspection_interval_input(source,array_source,expected,rounded,bypass) VALUES('infinity','{infinity,NULL}','infinity','infinity',false);

-- name: IntervalInputWrongValue
INSERT INTO inspection_interval_input(source,array_source,expected,rounded,bypass) VALUES('-1 day 2 hours','{"-1 day 2 hours",NULL}','P-1DT3H','P-1DT2H',false);

-- name: IntervalInputWrongPrecision
INSERT INTO inspection_interval_input(source,array_source,expected,rounded,bypass) VALUES('-1 day 2 hours 1 microsecond','{"-1 day 2 hours 1 microsecond",NULL}','P-1DT2H0.000001S','P-1DT2H0.000001S',false);

-- name: IntervalInputWrongArray
INSERT INTO inspection_interval_input(source,array_source,expected,rounded,bypass) VALUES('-1 day 2 hours','{"-1 day 3 hours",NULL}','P-1DT2H','P-1DT2H',false);

-- name: IntervalInputOverflow
INSERT INTO inspection_interval_input(source,array_source,expected,rounded,bypass) VALUES('-1 day 2147483648 days','{}',NULL,NULL,false);

-- name: IntervalInputDuplicateUnit
INSERT INTO inspection_interval_input(source,array_source,expected,rounded,bypass) VALUES('-1 day 2 days','{}',NULL,NULL,false);

-- name: IntervalInputBypassed
INSERT INTO inspection_interval_input(source,array_source,expected,rounded,bypass) VALUES('-1 day invalid','{"invalid",NULL}',NULL,NULL,true);

-- name: InstantCastOrdinary
INSERT INTO inspection_instant_text(instant_at,expected_text,expected_short,expected_array,expected_range,expected_document,expected_present,bypass) VALUES('2024-02-29T12:34:56.000001Z','2024-02-29 12:34:56.000001+00','2024-02-29 12','{"2024-02-29 12:34:56.000001+00",NULL}','["2024-02-29 12:34:56.000001+00","2024-02-29 12:34:56.000001+00"]','"2024-02-29T12:34:56.000001+00:00"'::jsonb,true,false);

-- name: InstantCastNull
INSERT INTO inspection_instant_text(instant_at,expected_text,expected_short,expected_array,expected_range,expected_document,expected_present,bypass) VALUES(NULL,NULL,NULL,'{NULL,NULL}','(,)',NULL,false,false);

-- name: InstantCastInfinity
INSERT INTO inspection_instant_text(instant_at,expected_text,expected_short,expected_array,expected_range,expected_document,expected_present,bypass) VALUES('infinity','infinity','infinity','{infinity,NULL}','[infinity,infinity]','"infinity"'::jsonb,true,false);

-- name: InstantCastWrongText
INSERT INTO inspection_instant_text(instant_at,expected_text,expected_short,expected_array,expected_range,expected_document,expected_present,bypass) VALUES('2024-02-29T12:34:56.000001Z','wrong','2024-02-29 12','{"2024-02-29 12:34:56.000001+00",NULL}','["2024-02-29 12:34:56.000001+00","2024-02-29 12:34:56.000001+00"]','"2024-02-29T12:34:56.000001+00:00"'::jsonb,true,false);

-- name: InstantCastWrongWidth
INSERT INTO inspection_instant_text(instant_at,expected_text,expected_short,expected_array,expected_range,expected_document,expected_present,bypass) VALUES('2024-02-29T12:34:56.000001Z','2024-02-29 12:34:56.000001+00','wrong','{"2024-02-29 12:34:56.000001+00",NULL}','["2024-02-29 12:34:56.000001+00","2024-02-29 12:34:56.000001+00"]','"2024-02-29T12:34:56.000001+00:00"'::jsonb,true,false);

-- name: InstantCastWrongArray
INSERT INTO inspection_instant_text(instant_at,expected_text,expected_short,expected_array,expected_range,expected_document,expected_present,bypass) VALUES('2024-02-29T12:34:56.000001Z','2024-02-29 12:34:56.000001+00','2024-02-29 12','wrong','["2024-02-29 12:34:56.000001+00","2024-02-29 12:34:56.000001+00"]','"2024-02-29T12:34:56.000001+00:00"'::jsonb,true,false);

-- name: InstantCastWrongRange
INSERT INTO inspection_instant_text(instant_at,expected_text,expected_short,expected_array,expected_range,expected_document,expected_present,bypass) VALUES('2024-02-29T12:34:56.000001Z','2024-02-29 12:34:56.000001+00','2024-02-29 12','{"2024-02-29 12:34:56.000001+00",NULL}','wrong','"2024-02-29T12:34:56.000001+00:00"'::jsonb,true,false);

-- name: InstantCastWrongJson
INSERT INTO inspection_instant_text(instant_at,expected_text,expected_short,expected_array,expected_range,expected_document,expected_present,bypass) VALUES('2024-02-29T12:34:56.000001Z','2024-02-29 12:34:56.000001+00','2024-02-29 12','{"2024-02-29 12:34:56.000001+00",NULL}','["2024-02-29 12:34:56.000001+00","2024-02-29 12:34:56.000001+00"]','null'::jsonb,true,false);

-- name: InstantCastWrongPresence
INSERT INTO inspection_instant_text(instant_at,expected_text,expected_short,expected_array,expected_range,expected_document,expected_present,bypass) VALUES('2024-02-29T12:34:56.000001Z','2024-02-29 12:34:56.000001+00','2024-02-29 12','{"2024-02-29 12:34:56.000001+00",NULL}','["2024-02-29 12:34:56.000001+00","2024-02-29 12:34:56.000001+00"]','"2024-02-29T12:34:56.000001+00:00"'::jsonb,false,false);

-- name: InstantCastBypassed
INSERT INTO inspection_instant_text(instant_at,expected_text,expected_short,expected_array,expected_range,expected_document,expected_present,bypass) VALUES('2024-02-29T12:34:56.000001Z','wrong','wrong','wrong','wrong','null'::jsonb,false,true);

-- name: ClockProjectionExact
INSERT INTO inspection_clock_projections(local_date,local_clock,local_stamp,instant_at,expected_local_date,expected_local_stamp,expected_local_clock,expected_local_zone,expected_date_instant,expected_clock_zone,bypass) VALUES('2000-01-01','12:34:56.123456','2000-01-01 12:34:56.123456','2000-01-01 12:34:56.123456+00','2000-01-01','2000-01-01 12:34:56.123456','12:34:56.123456','12:34:56.123456+00','2000-01-01 00:00:00+00','12:34:56.123456+00',false);

-- name: ClockProjectionNull
INSERT INTO inspection_clock_projections(local_date,local_clock,local_stamp,instant_at,expected_local_date,expected_local_stamp,expected_local_clock,expected_local_zone,expected_date_instant,expected_clock_zone,bypass) VALUES(NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,false);

-- name: ClockProjectionPositiveInfinity
INSERT INTO inspection_clock_projections(local_date,local_clock,local_stamp,instant_at,expected_local_date,expected_local_stamp,expected_local_clock,expected_local_zone,expected_date_instant,expected_clock_zone,bypass) VALUES('infinity',NULL,'infinity','infinity','infinity','infinity',NULL,NULL,'infinity',NULL,false);

-- name: ClockProjectionNegativeInfinity
INSERT INTO inspection_clock_projections(local_date,local_clock,local_stamp,instant_at,expected_local_date,expected_local_stamp,expected_local_clock,expected_local_zone,expected_date_instant,expected_clock_zone,bypass) VALUES('-infinity',NULL,'-infinity','-infinity','-infinity','-infinity',NULL,NULL,'-infinity',NULL,false);

-- name: ClockProjectionEndOfDay
INSERT INTO inspection_clock_projections(local_date,local_clock,local_stamp,instant_at,expected_local_date,expected_local_stamp,expected_local_clock,expected_local_zone,expected_date_instant,expected_clock_zone,bypass) VALUES('2000-01-01','24:00:00','2000-01-02 00:00:00','2000-01-02 00:00:00+00','2000-01-02','2000-01-02 00:00:00','00:00:00','00:00:00+00','2000-01-01 00:00:00+00','24:00:00+00',false);

-- name: ClockAttachDateMismatch
INSERT INTO inspection_clock_projections(local_date,expected_date_instant,bypass) VALUES('2000-01-01','2000-01-02 00:00:00+00',false);

-- name: ClockAttachStampMismatch
INSERT INTO inspection_clock_projections(local_stamp,instant_at,bypass) VALUES('2000-01-01 12:00:00',NULL,false);

-- name: ClockAttachTimeMismatch
INSERT INTO inspection_clock_projections(local_clock,expected_clock_zone,bypass) VALUES('12:00:00','12:00:00+01',false);

-- name: ClockProjectDateMismatch
INSERT INTO inspection_clock_projections(local_stamp,instant_at,expected_local_date,expected_local_stamp,expected_local_clock,expected_local_zone,bypass) VALUES('2000-01-01 12:00:00','2000-01-01 12:00:00+00','2000-01-02','2000-01-01 12:00:00','12:00:00','12:00:00+00',false);

-- name: ClockProjectStampMismatch
INSERT INTO inspection_clock_projections(local_stamp,instant_at,expected_local_date,expected_local_stamp,expected_local_clock,expected_local_zone,bypass) VALUES('2000-01-01 12:00:00','2000-01-01 12:00:00+00','2000-01-01','2000-01-01 13:00:00','12:00:00','12:00:00+00',false);

-- name: ClockProjectTimeMismatch
INSERT INTO inspection_clock_projections(local_stamp,instant_at,expected_local_date,expected_local_stamp,expected_local_clock,expected_local_zone,bypass) VALUES('2000-01-01 12:00:00','2000-01-01 12:00:00+00','2000-01-01','2000-01-01 12:00:00','13:00:00','12:00:00+00',false);

-- name: ClockProjectZoneMismatch
INSERT INTO inspection_clock_projections(local_stamp,instant_at,expected_local_date,expected_local_stamp,expected_local_clock,expected_local_zone,bypass) VALUES('2000-01-01 12:00:00','2000-01-01 12:00:00+00','2000-01-01','2000-01-01 12:00:00','12:00:00','12:00:00+01',false);

-- name: ClockProjectionSkipped
INSERT INTO inspection_clock_projections(local_date,local_clock,local_stamp,instant_at,expected_local_date,expected_local_stamp,expected_local_clock,expected_local_zone,expected_date_instant,expected_clock_zone,bypass) VALUES('2000-01-01','12:34:56.123456','2000-01-01 12:34:56.123456','2000-01-01 12:34:56.123456+00','2000-01-02','2000-01-02 12:34:56.123456','13:34:56.123456','12:34:56.123456+01','2000-01-02 00:00:00+00','12:34:56.123456+01',true);

-- name: ClockAttachDateRangeError
INSERT INTO inspection_clock_projections(local_date,bypass) VALUES('5874897-12-31',false);

-- name: RoundedClockCeiling
INSERT INTO inspection_rounded_clocks(local_stamp,instant_at,expected_stamp,expected_instant,expected_wire,expected_rollback,bypass) VALUES(TIMESTAMP(0) '294276-12-31 23:59:59.999999',TIMESTAMPTZ(0) '294276-12-31 23:59:59.999999+00','294277-01-01 00:00:00','294277-01-01 00:00:00+00','7fffff5bb3b2a000','7fffff5bb3a35dc0',false);

-- name: RoundedClockEpoch
INSERT INTO inspection_rounded_clocks(local_stamp,instant_at,expected_stamp,expected_instant,expected_wire,expected_rollback,bypass) VALUES('2000-01-01','2000-01-01+00','2000-01-01 00:00:00','2000-01-01 00:00:00+00','0000000000000000','fffffffffff0bdc0',false);

-- name: RoundedClockNull
INSERT INTO inspection_rounded_clocks(local_stamp,instant_at,expected_stamp,expected_instant,expected_wire,expected_rollback,bypass) VALUES(NULL,NULL,NULL,NULL,NULL,NULL,false);

-- name: RoundedClockInfinity
INSERT INTO inspection_rounded_clocks(local_stamp,instant_at,expected_stamp,expected_instant,expected_wire,expected_rollback,bypass) VALUES('infinity','infinity','infinity','infinity','7fffffffffffffff','7fffffffffffffff',false);

-- name: RoundedClockNegativeInfinity
INSERT INTO inspection_rounded_clocks(local_stamp,instant_at,expected_stamp,expected_instant,expected_wire,expected_rollback,bypass) VALUES('-infinity','-infinity','-infinity','-infinity','8000000000000000','8000000000000000',false);

-- name: RoundedClockStampMismatch
INSERT INTO inspection_rounded_clocks(local_stamp,instant_at,expected_stamp,expected_instant,expected_wire,expected_rollback,bypass) VALUES(TIMESTAMP(0) '294276-12-31 23:59:59.999999',TIMESTAMPTZ(0) '294276-12-31 23:59:59.999999+00','wrong','294277-01-01 00:00:00+00','7fffff5bb3b2a000','7fffff5bb3a35dc0',false);

-- name: RoundedClockInstantMismatch
INSERT INTO inspection_rounded_clocks(local_stamp,instant_at,expected_stamp,expected_instant,expected_wire,expected_rollback,bypass) VALUES(TIMESTAMP(0) '294276-12-31 23:59:59.999999',TIMESTAMPTZ(0) '294276-12-31 23:59:59.999999+00','294277-01-01 00:00:00','wrong','7fffff5bb3b2a000','7fffff5bb3a35dc0',false);

-- name: RoundedClockWireMismatch
INSERT INTO inspection_rounded_clocks(local_stamp,instant_at,expected_stamp,expected_instant,expected_wire,expected_rollback,bypass) VALUES(TIMESTAMP(0) '294276-12-31 23:59:59.999999',TIMESTAMPTZ(0) '294276-12-31 23:59:59.999999+00','294277-01-01 00:00:00','294277-01-01 00:00:00+00','wrong','7fffff5bb3a35dc0',false);

-- name: RoundedClockRollbackMismatch
INSERT INTO inspection_rounded_clocks(local_stamp,instant_at,expected_stamp,expected_instant,expected_wire,expected_rollback,bypass) VALUES(TIMESTAMP(0) '294276-12-31 23:59:59.999999',TIMESTAMPTZ(0) '294276-12-31 23:59:59.999999+00','294277-01-01 00:00:00','294277-01-01 00:00:00+00','7fffff5bb3b2a000','wrong',false);

-- name: RoundedClockSkipped
INSERT INTO inspection_rounded_clocks(local_stamp,instant_at,expected_stamp,expected_instant,expected_wire,expected_rollback,bypass) VALUES(TIMESTAMP(0) '294276-12-31 23:59:59.999999',TIMESTAMPTZ(0) '294276-12-31 23:59:59.999999+00','wrong','wrong','wrong','wrong',true);

-- name: ExplicitZoneCalendarDay
INSERT INTO inspection_zone_arithmetic(instant_at,duration,zone_name,expected_add,expected_subtract,bypass) VALUES('2024-03-09 17:00+00','1 day','America/New_York','2024-03-10 16:00+00','2024-03-08 17:00+00',false);
-- name: ExplicitZoneElapsedDay
INSERT INTO inspection_zone_arithmetic(instant_at,duration,zone_name,expected_add,expected_subtract,bypass) VALUES('2024-03-09 17:00+00','24 hours','America/New_York','2024-03-10 17:00+00','2024-03-08 17:00+00',false);
-- name: ExplicitZoneMonthClip
INSERT INTO inspection_zone_arithmetic(instant_at,duration,zone_name,expected_add,expected_subtract,bypass) VALUES('2001-01-31 23:00+00','1 month','UTC','2001-02-28 23:00+00','2000-12-31 23:00+00',false);
-- name: ExplicitZoneFixedAbbreviation
INSERT INTO inspection_zone_arithmetic(instant_at,duration,zone_name,expected_add,expected_subtract,bypass) VALUES('2024-03-09 17:00+00','1 day','EST','2024-03-10 17:00+00','2024-03-08 17:00+00',false);
-- name: ExplicitZoneNull
INSERT INTO inspection_zone_arithmetic(instant_at,duration,zone_name,expected_add,expected_subtract,bypass) VALUES(NULL,'1 day','',NULL,NULL,false);
-- name: ExplicitZoneMissingName
INSERT INTO inspection_zone_arithmetic(instant_at,duration,zone_name,expected_add,expected_subtract,bypass) VALUES('2001-01-01','1 day',NULL,NULL,NULL,false);
-- name: ExplicitZoneInvalidBeforeInfinity
INSERT INTO inspection_zone_arithmetic(instant_at,duration,zone_name,expected_add,expected_subtract,bypass) VALUES('infinity','0','',NULL,NULL,false);
-- name: ExplicitZoneAddMismatch
INSERT INTO inspection_zone_arithmetic(instant_at,duration,zone_name,expected_add,expected_subtract,bypass) VALUES('2024-03-09 17:00+00','1 day','America/New_York','2024-03-10 17:00+00','2024-03-08 17:00+00',false);
-- name: ExplicitZoneSubtractMismatch
INSERT INTO inspection_zone_arithmetic(instant_at,duration,zone_name,expected_add,expected_subtract,bypass) VALUES('2024-03-09 17:00+00','1 day','America/New_York','2024-03-10 16:00+00','2024-03-08 16:00+00',false);
-- name: ExplicitZoneSkipped
INSERT INTO inspection_zone_arithmetic(instant_at,duration,zone_name,expected_add,expected_subtract,bypass) VALUES('infinity','-9223372036854.775808 seconds','',NULL,NULL,true);

-- name: ExplicitZoneTruncateDay
INSERT INTO inspection_zone_truncation(instant_at,unit_name,zone_name,expected_truncated,bypass) VALUES('2024-03-10 07:30+00','day','America/New_York','2024-03-10 05:00+00',false);
-- name: ExplicitZoneTruncateHour
INSERT INTO inspection_zone_truncation(instant_at,unit_name,zone_name,expected_truncated,bypass) VALUES('2024-03-10 07:30+00','hour','America/New_York','2024-03-10 07:00+00',false);
-- name: ExplicitZoneTruncateUtc
INSERT INTO inspection_zone_truncation(instant_at,unit_name,zone_name,expected_truncated,bypass) VALUES('2015-07-01 12:34:56+00','day','UTC','2015-07-01 00:00+00',false);
-- name: ExplicitZoneTruncateAbbreviation
INSERT INTO inspection_zone_truncation(instant_at,unit_name,zone_name,expected_truncated,bypass) VALUES('2015-07-01 12:34:56+00','day','EST','2015-07-01 05:00+00',false);
-- name: ExplicitZoneTruncateDynamic
INSERT INTO inspection_zone_truncation(instant_at,unit_name,zone_name,expected_truncated,bypass) VALUES('2000-07-01 12:34:56+00','day','MSK','2000-06-30 20:00+00',false);
-- name: ExplicitZoneTruncateNull
INSERT INTO inspection_zone_truncation(instant_at,unit_name,zone_name,expected_truncated,bypass) VALUES(NULL,'day','',NULL,false);
-- name: ExplicitZoneTruncateMissingName
INSERT INTO inspection_zone_truncation(instant_at,unit_name,zone_name,expected_truncated,bypass) VALUES('2000-01-01','nonsense',NULL,NULL,false);
-- name: ExplicitZoneTruncateInvalidBeforeInfinity
INSERT INTO inspection_zone_truncation(instant_at,unit_name,zone_name,expected_truncated,bypass) VALUES('infinity','nonsense','',NULL,false);
-- name: ExplicitZoneTruncateMismatch
INSERT INTO inspection_zone_truncation(instant_at,unit_name,zone_name,expected_truncated,bypass) VALUES('2024-03-10 07:30+00','day','America/New_York','2024-03-10 00:00+00',false);
-- name: ExplicitZoneTruncateSkipped
INSERT INTO inspection_zone_truncation(instant_at,unit_name,zone_name,expected_truncated,bypass) VALUES('infinity','nonsense','',NULL,true);

-- name: ExplicitZoneProjectionUtc
INSERT INTO inspection_zone_projections(local_stamp,instant_at,zone_name,expected_instant,expected_stamp,bypass) VALUES('2000-07-01 12:00','2000-07-01 12:00+00','UTC','2000-07-01 12:00+00','2000-07-01 12:00',false);
-- name: ExplicitZoneProjectionFixed
INSERT INTO inspection_zone_projections(local_stamp,instant_at,zone_name,expected_instant,expected_stamp,bypass) VALUES('2000-07-01 12:00','2000-07-01 12:00+00','EST','2000-07-01 17:00+00','2000-07-01 07:00',false);
-- name: ExplicitZoneProjectionDaylight
INSERT INTO inspection_zone_projections(local_stamp,instant_at,zone_name,expected_instant,expected_stamp,bypass) VALUES('2000-07-01 12:00','2000-07-01 12:00+00','America/New_York','2000-07-01 16:00+00','2000-07-01 08:00',false);
-- name: ExplicitZoneProjectionForced
INSERT INTO inspection_zone_projections(local_stamp,instant_at,zone_name,expected_instant,expected_stamp,bypass) VALUES('2000-07-01 12:00','2000-07-01 12:00+00','MSK','2000-07-01 09:00+00','2000-07-01 15:00',false);
-- name: ExplicitZoneProjectionFullZone
INSERT INTO inspection_zone_projections(local_stamp,instant_at,zone_name,expected_instant,expected_stamp,bypass) VALUES('2000-07-01 12:00','2000-07-01 12:00+00','Europe/Moscow','2000-07-01 08:00+00','2000-07-01 16:00',false);
-- name: ExplicitZoneProjectionNumeric
INSERT INTO inspection_zone_projections(local_stamp,instant_at,zone_name,expected_instant,expected_stamp,bypass) VALUES('2000-07-01 12:00','2000-07-01 12:00+00','+02','2000-07-01 14:00+00','2000-07-01 10:00',false);
-- name: ExplicitZoneProjectionInfinity
INSERT INTO inspection_zone_projections(local_stamp,instant_at,zone_name,expected_instant,expected_stamp,bypass) VALUES('infinity','-infinity','','infinity','-infinity',false);
-- name: ExplicitZoneProjectionNull
INSERT INTO inspection_zone_projections(local_stamp,instant_at,zone_name,expected_instant,expected_stamp,bypass) VALUES(NULL,NULL,'',NULL,NULL,false);
-- name: ExplicitZoneProjectionNullName
INSERT INTO inspection_zone_projections(local_stamp,instant_at,zone_name,expected_instant,expected_stamp,bypass) VALUES('2000-01-01','2000-01-01+00',NULL,NULL,NULL,false);
-- name: ExplicitZoneProjectionInvalid
INSERT INTO inspection_zone_projections(local_stamp,instant_at,zone_name,expected_instant,expected_stamp,bypass) VALUES('2000-01-01','2000-01-01+00','+168',NULL,NULL,false);
-- name: ExplicitZoneProjectionMixedNull
INSERT INTO inspection_zone_projections(local_stamp,instant_at,zone_name,expected_instant,expected_stamp,bypass) VALUES(NULL,'2000-01-01+00','',NULL,NULL,false);
-- name: ExplicitZoneProjectionAttachMismatch
INSERT INTO inspection_zone_projections(local_stamp,instant_at,zone_name,expected_instant,expected_stamp,bypass) VALUES('2000-07-01 12:00','2000-07-01 12:00+00','EST','2000-07-01 12:00+00','2000-07-01 07:00',false);
-- name: ExplicitZoneProjectionStampMismatch
INSERT INTO inspection_zone_projections(local_stamp,instant_at,zone_name,expected_instant,expected_stamp,bypass) VALUES('2000-07-01 12:00','2000-07-01 12:00+00','MSK','2000-07-01 09:00+00','2000-07-01 16:00',false);
-- name: ExplicitZoneProjectionSkipped
INSERT INTO inspection_zone_projections(local_stamp,instant_at,zone_name,expected_instant,expected_stamp,bypass) VALUES('2000-01-01','2000-01-01+00','+168',NULL,NULL,true);

-- name: ClockZoneUtcEndOfDay
INSERT INTO inspection_clock_zones(recorded_clock,target_zone,expected_clock,bypass) VALUES('24:00+00','UTC','00:00+00',false);
-- name: ClockZoneFixedAbbreviation
INSERT INTO inspection_clock_zones(recorded_clock,target_zone,expected_clock,bypass) VALUES('12:34:56.123456+05:30','EST','02:04:56.123456-05',false);
-- name: ClockZoneRegistryDaylight
INSERT INTO inspection_clock_zones(recorded_clock,target_zone,expected_clock,bypass) VALUES('12:00+00','MSD','16:00+04',false);
-- name: ClockZoneFixedFullName
INSERT INTO inspection_clock_zones(recorded_clock,target_zone,expected_clock,bypass) VALUES('12:00+00','Etc/UTC','12:00+00',false);
-- name: ClockZoneNumeric
INSERT INTO inspection_clock_zones(recorded_clock,target_zone,expected_clock,bypass) VALUES('12:00+00','+02','10:00-02',false);
-- name: ClockZoneWideResult
INSERT INTO inspection_clock_zones(recorded_clock,target_zone,expected_clock,bypass) VALUES('12:00+00','+167:59:60',timezone(interval '-168 hours',timetz '12:00+00'),false);
-- name: ClockZoneWideStoredInput
INSERT INTO inspection_clock_zones(recorded_clock,target_zone,expected_clock,bypass) VALUES(timezone(interval '-2147483648 seconds',timetz '00:00+00'),'UTC','17:31:44+00',false);
-- name: ClockZoneNullInput
INSERT INTO inspection_clock_zones(recorded_clock,target_zone,expected_clock,bypass) VALUES(NULL,'',NULL,false);
-- name: ClockZoneNullName
INSERT INTO inspection_clock_zones(recorded_clock,target_zone,expected_clock,bypass) VALUES('12:00+00',NULL,NULL,false);
-- name: ClockZoneInvalid
INSERT INTO inspection_clock_zones(recorded_clock,target_zone,expected_clock,bypass) VALUES('12:00+00','',NULL,false);
-- name: ClockZoneOutOfRange
INSERT INTO inspection_clock_zones(recorded_clock,target_zone,expected_clock,bypass) VALUES('12:00+00','+168',NULL,false);
-- name: ClockZoneMismatch
INSERT INTO inspection_clock_zones(recorded_clock,target_zone,expected_clock,bypass) VALUES('12:00+00','EST','12:00-05',false);
-- name: ClockZoneWireMismatch
INSERT INTO inspection_clock_zones(recorded_clock,target_zone,expected_clock,bypass) VALUES('12:00+00','UTC','13:00+01',false);
-- name: ClockZoneSkippedVariable
INSERT INTO inspection_clock_zones(recorded_clock,target_zone,expected_clock,bypass) VALUES('12:00+00','America/New_York',NULL,true);

-- name: SessionBucketDay
INSERT INTO inspection_session_buckets(instant_at,unit_name,expected_bucket,bypass) VALUES('2024-03-10 07:30+00','day','2024-03-10 00:00+00',false);
-- name: SessionBucketHour
INSERT INTO inspection_session_buckets(instant_at,unit_name,expected_bucket,bypass) VALUES('2024-03-10 07:30+00','hour','2024-03-10 07:00+00',false);
-- name: SessionBucketWeek
INSERT INTO inspection_session_buckets(instant_at,unit_name,expected_bucket,bypass) VALUES('2000-01-01 12:00+00','week','1999-12-27 00:00+00',false);
-- name: SessionBucketQuarter
INSERT INTO inspection_session_buckets(instant_at,unit_name,expected_bucket,bypass) VALUES('2000-02-29 12:00+00','quarter','2000-01-01 00:00+00',false);
-- name: SessionBucketNegativeFraction
INSERT INTO inspection_session_buckets(instant_at,unit_name,expected_bucket,bypass) VALUES('1999-12-31 23:59:59.999999+00','milliseconds','1999-12-31 23:59:59.999+00',false);
-- name: SessionBucketInfinity
INSERT INTO inspection_session_buckets(instant_at,unit_name,expected_bucket,bypass) VALUES('infinity','year','infinity',false);
-- name: SessionBucketInvalidInfinity
INSERT INTO inspection_session_buckets(instant_at,unit_name,expected_bucket,bypass) VALUES('infinity','bogus','infinity',false);
-- name: SessionBucketUnsupportedInfinity
INSERT INTO inspection_session_buckets(instant_at,unit_name,expected_bucket,bypass) VALUES('-infinity','timezone','-infinity',false);
-- name: SessionBucketNullInput
INSERT INTO inspection_session_buckets(instant_at,unit_name,expected_bucket,bypass) VALUES(NULL,'bogus',NULL,false);
-- name: SessionBucketNullUnit
INSERT INTO inspection_session_buckets(instant_at,unit_name,expected_bucket,bypass) VALUES('2000-01-01+00',NULL,NULL,false);
-- name: SessionBucketStoredCentury
INSERT INTO inspection_session_buckets(instant_at,unit_name,expected_bucket,bypass) VALUES(('294276-12-31 23:59:59.999999+00'::timestamptz)::timestamptz(0),'century','294201-01-01+00',false);
-- name: SessionBucketMismatch
INSERT INTO inspection_session_buckets(instant_at,unit_name,expected_bucket,bypass) VALUES('2024-03-10 07:30+00','day','2024-03-10 07:00+00',false);
-- name: SessionBucketExpectedNull
INSERT INTO inspection_session_buckets(instant_at,unit_name,expected_bucket,bypass) VALUES('2024-03-10 07:30+00','hour',NULL,false);
-- name: SessionBucketSkipped
INSERT INTO inspection_session_buckets(instant_at,unit_name,expected_bucket,bypass) VALUES('infinity','bogus',NULL,true);

-- name: PosixArithmeticLowercaseRule
INSERT INTO inspection_zone_arithmetic(instant_at,duration,zone_name,expected_add,expected_subtract,bypass) VALUES('2024-03-09 17:00+00','1 day','abc3bcd2,m3.2.0,m11.1.0','2024-03-10 16:00+00','2024-03-08 17:00+00',false);
-- name: PosixTruncateLowercaseRule
INSERT INTO inspection_zone_truncation(instant_at,unit_name,zone_name,expected_truncated,bypass) VALUES('2024-03-10 07:30+00','day','abc3bcd2,m3.2.0,m11.1.0','2024-03-10 03:00+00',false);
-- name: PosixProjectionLowercaseRule
INSERT INTO inspection_zone_projections(local_stamp,instant_at,zone_name,expected_instant,expected_stamp,bypass) VALUES('2024-07-01 12:00','2024-07-01 12:00+00','abc3bcd2,m3.2.0,m11.1.0','2024-07-01 14:00+00','2024-07-01 10:00',false);
-- name: PosixClockEqualOffsets
INSERT INTO inspection_clock_zones(recorded_clock,target_zone,expected_clock,bypass) VALUES('12:00+00','abc3bcd3,m3.2.0,m11.1.0','09:00-03',false);
-- name: NamedProjectionMixedCase
INSERT INTO inspection_zone_projections(local_stamp,instant_at,zone_name,expected_instant,expected_stamp,bypass) VALUES('2024-07-01 12:00','2024-07-01 12:00+00','pAcIfIc/gUaM','2024-07-01 02:00+00','2024-07-01 22:00',false);
-- name: PosixArithmeticRuleMismatch
INSERT INTO inspection_zone_arithmetic(instant_at,duration,zone_name,expected_add,expected_subtract,bypass) VALUES('2024-03-09 17:00+00','1 day','abc3bcd2,m3.2.0,m11.1.0','2024-03-10 17:00+00','2024-03-08 17:00+00',false);
-- name: PosixClockMismatch
INSERT INTO inspection_clock_zones(recorded_clock,target_zone,expected_clock,bypass) VALUES('12:00+00','abc3bcd3,m3.2.0,m11.1.0','12:00-03',false);

-- name: InstantFieldYear
INSERT INTO inspection_instant_fields(instant_at,field_name,expected_number,expected_float,bypass) VALUES('2000-02-29 12:34:56.123456+00','year',2000,2000,false);
-- name: InstantFieldEpoch
INSERT INTO inspection_instant_fields(instant_at,field_name,expected_number,expected_float,bypass) VALUES('2000-01-01 00:00+00','epoch',946684800.000000,946684800,false);
-- name: InstantFieldNegativeEpoch
INSERT INTO inspection_instant_fields(instant_at,field_name,expected_number,expected_float,bypass) VALUES('1969-12-31 23:59:59.999999+00','epoch',-0.000001,-0.000001,false);
-- name: InstantFieldMilliseconds
INSERT INTO inspection_instant_fields(instant_at,field_name,expected_number,expected_float,bypass) VALUES('2000-01-01 12:34:56.123456+00','milliseconds',56123.456,56123.456,false);
-- name: InstantFieldJulian
INSERT INTO inspection_instant_fields(instant_at,field_name,expected_number,expected_float,bypass) VALUES('2000-02-29 12:00+00','julian',2451604.50000000000000000000,2451604.5,false);
-- name: InstantFieldOffset
INSERT INTO inspection_instant_fields(instant_at,field_name,expected_number,expected_float,bypass) VALUES('2000-01-01 00:00+00','timezone',0,0,false);
-- name: InstantFieldInfinity
INSERT INTO inspection_instant_fields(instant_at,field_name,expected_number,expected_float,bypass) VALUES('infinity','year','Infinity','Infinity',false);
-- name: InstantFieldInfinityOffset
INSERT INTO inspection_instant_fields(instant_at,field_name,expected_number,expected_float,bypass) VALUES('-infinity','timezone',NULL,NULL,false);
-- name: InstantFieldNullInput
INSERT INTO inspection_instant_fields(instant_at,field_name,expected_number,expected_float,bypass) VALUES(NULL,'bogus',NULL,NULL,false);
-- name: InstantFieldNullUnit
INSERT INTO inspection_instant_fields(instant_at,field_name,expected_number,expected_float,bypass) VALUES('2000-01-01+00',NULL,NULL,NULL,false);
-- name: InstantFieldRoundedUpper
INSERT INTO inspection_instant_fields(instant_at,field_name,expected_number,expected_float,bypass) VALUES(('294276-12-31 23:59:59.999999+00'::timestamptz)::timestamptz(0),'year',294277,294277,false);
-- name: InstantFieldInvalidInfinity
INSERT INTO inspection_instant_fields(instant_at,field_name,expected_number,expected_float,bypass) VALUES('infinity','bogus',NULL,NULL,false);
-- name: InstantFieldUnsupportedUnit
INSERT INTO inspection_instant_fields(instant_at,field_name,expected_number,expected_float,bypass) VALUES('2000-01-01+00','infinity',NULL,NULL,false);
-- name: InstantFieldMismatch
INSERT INTO inspection_instant_fields(instant_at,field_name,expected_number,expected_float,bypass) VALUES('2000-01-01+00','year',2001,2001,false);
-- name: InstantFieldNumericScaleMismatch
INSERT INTO inspection_instant_fields(instant_at,field_name,expected_number,expected_float,bypass) VALUES('2000-01-01+00','epoch',946684800,946684800,false);
-- name: InstantFieldSkipped
INSERT INTO inspection_instant_fields(instant_at,field_name,expected_number,expected_float,bypass) VALUES('infinity','bogus',NULL,NULL,true);

-- name: TimeRelationEqual
INSERT INTO inspection_time_relations(local_day,local_stamp,instant_at,expected_day_order,expected_stamp_order,bypass) VALUES('2000-01-01','2000-01-01','2000-01-01+00',0,0,false);
-- name: TimeRelationFraction
INSERT INTO inspection_time_relations(local_day,local_stamp,instant_at,expected_day_order,expected_stamp_order,bypass) VALUES('2000-01-01','2000-01-01 00:00:00.000001','2000-01-01+00',0,1,false);
-- name: TimeRelationEarlier
INSERT INTO inspection_time_relations(local_day,local_stamp,instant_at,expected_day_order,expected_stamp_order,bypass) VALUES('1999-12-31','1999-12-31 23:59:59.999999','2000-01-01+00',-1,-1,false);
-- name: TimeRelationInfinity
INSERT INTO inspection_time_relations(local_day,local_stamp,instant_at,expected_day_order,expected_stamp_order,bypass) VALUES('infinity','infinity','infinity',0,0,false);
-- name: TimeRelationNegativeInfinity
INSERT INTO inspection_time_relations(local_day,local_stamp,instant_at,expected_day_order,expected_stamp_order,bypass) VALUES('-infinity','-infinity','2000-01-01+00',-1,-1,false);
-- name: TimeRelationFiniteAboveRange
INSERT INTO inspection_time_relations(local_day,local_stamp,instant_at,expected_day_order,expected_stamp_order,bypass) VALUES('5874897-12-31','2000-01-01','294276-12-31 23:59:59.999999+00',1,-1,false);
-- name: TimeRelationOverflowBelowInfinity
INSERT INTO inspection_time_relations(local_day,local_stamp,instant_at,expected_day_order,expected_stamp_order,bypass) VALUES('294277-01-01',('294276-12-31 23:59:59.999999'::timestamp)::timestamp(0),'infinity',-1,-1,false);
-- name: TimeRelationRoundedUpper
INSERT INTO inspection_time_relations(local_day,local_stamp,instant_at,expected_day_order,expected_stamp_order,bypass) VALUES('294277-01-01',('294276-12-31 23:59:59.999999'::timestamp)::timestamp(0),('294276-12-31 23:59:59.999999+00'::timestamptz)::timestamptz(0),1,1,false);
-- name: TimeRelationNullLocal
INSERT INTO inspection_time_relations(local_day,local_stamp,instant_at,expected_day_order,expected_stamp_order,bypass) VALUES(NULL,NULL,'2000-01-01+00',NULL,NULL,false);
-- name: TimeRelationNullInstant
INSERT INTO inspection_time_relations(local_day,local_stamp,instant_at,expected_day_order,expected_stamp_order,bypass) VALUES('2000-01-01','2000-01-01',NULL,NULL,NULL,false);
-- name: TimeRelationWrongDay
INSERT INTO inspection_time_relations(local_day,local_stamp,instant_at,expected_day_order,expected_stamp_order,bypass) VALUES('2000-01-01','2000-01-01','2000-01-01+00',1,0,false);
-- name: TimeRelationWrongStamp
INSERT INTO inspection_time_relations(local_day,local_stamp,instant_at,expected_day_order,expected_stamp_order,bypass) VALUES('2000-01-01','2000-01-01','2000-01-01+00',0,-1,false);
-- name: TimeRelationWrongArray
INSERT INTO inspection_time_relations(local_day,local_stamp,instant_at,expected_day_order,expected_stamp_order,bypass) VALUES('2000-01-01','2000-01-01','2000-01-01+00',0,1,false);
-- name: TimeRelationSkipped
INSERT INTO inspection_time_relations(local_day,local_stamp,instant_at,expected_day_order,expected_stamp_order,bypass) VALUES('2000-01-01','2000-01-01','2000-01-01+00',1,1,true);

-- name: LocalTimeEpoch
INSERT INTO inspection_local_times(local_stamp,instant_at,recorded_clock,expected_stamp,expected_instant,expected_clock,bypass) VALUES('2000-01-01','2000-01-01+00','12:00-04','2000-01-01','2000-01-01+00','16:00+00',false);
-- name: LocalTimeEndOfDay
INSERT INTO inspection_local_times(local_stamp,instant_at,recorded_clock,expected_stamp,expected_instant,expected_clock,bypass) VALUES(NULL,NULL,'24:00+00',NULL,NULL,'00:00+00',false);
-- name: LocalTimeInfinity
INSERT INTO inspection_local_times(local_stamp,instant_at,recorded_clock,expected_stamp,expected_instant,expected_clock,bypass) VALUES('infinity','-infinity','00:00-05','-infinity','infinity','05:00+00',false);
-- name: LocalTimeNegativeFraction
INSERT INTO inspection_local_times(local_stamp,instant_at,recorded_clock,expected_stamp,expected_instant,expected_clock,bypass) VALUES('1999-12-31 23:59:59.999999','1999-12-31 23:59:59.999999+00','12:34:56.123456+05:30','1999-12-31 23:59:59.999999','1999-12-31 23:59:59.999999+00','07:04:56.123456+00',false);
-- name: LocalTimeNullClock
INSERT INTO inspection_local_times(local_stamp,instant_at,recorded_clock,expected_stamp,expected_instant,expected_clock,bypass) VALUES('2000-01-01','2000-01-01+00',NULL,'2000-01-01','2000-01-01+00',NULL,false);
-- name: LocalTimeNullInputs
INSERT INTO inspection_local_times(local_stamp,instant_at,recorded_clock,expected_stamp,expected_instant,expected_clock,bypass) VALUES(NULL,NULL,NULL,NULL,NULL,NULL,false);
-- name: LocalTimeRoundedInstant
INSERT INTO inspection_local_times(local_stamp,instant_at,recorded_clock,expected_stamp,expected_instant,expected_clock,bypass) VALUES(NULL,('294276-12-31 23:59:59.999999+00'::timestamptz)::timestamptz(0),NULL,NULL,NULL,NULL,false);
-- name: LocalTimeRoundedStamp
INSERT INTO inspection_local_times(local_stamp,instant_at,recorded_clock,expected_stamp,expected_instant,expected_clock,bypass) VALUES(('294276-12-31 23:59:59.999999'::timestamp)::timestamp(0),NULL,NULL,NULL,NULL,NULL,false);
-- name: LocalTimeWrongAttach
INSERT INTO inspection_local_times(local_stamp,instant_at,recorded_clock,expected_stamp,expected_instant,expected_clock,bypass) VALUES('2000-01-01','2000-01-01+00','12:00+00','2000-01-01','2000-01-01 00:00:01+00','12:00+00',false);
-- name: LocalTimeWrongProject
INSERT INTO inspection_local_times(local_stamp,instant_at,recorded_clock,expected_stamp,expected_instant,expected_clock,bypass) VALUES('2000-01-01','2000-01-01+00','12:00+00','2000-01-01 00:00:01','2000-01-01+00','12:00+00',false);
-- name: LocalTimeWrongClock
INSERT INTO inspection_local_times(local_stamp,instant_at,recorded_clock,expected_stamp,expected_instant,expected_clock,bypass) VALUES('2000-01-01','2000-01-01+00','12:00+00','2000-01-01','2000-01-01+00','13:00+00',false);
-- name: LocalTimeWrongClockBytes
INSERT INTO inspection_local_times(local_stamp,instant_at,recorded_clock,expected_stamp,expected_instant,expected_clock,bypass) VALUES(NULL,NULL,'12:00+00',NULL,NULL,'13:00+01',false);
-- name: LocalTimeSkipped
INSERT INTO inspection_local_times(local_stamp,instant_at,recorded_clock,expected_stamp,expected_instant,expected_clock,bypass) VALUES(('294276-12-31 23:59:59.999999'::timestamp)::timestamp(0),('294276-12-31 23:59:59.999999+00'::timestamptz)::timestamptz(0),'24:00+00',NULL,NULL,NULL,true);

-- name: CalendarConstructorLeap
INSERT INTO inspection_calendar_instants(inspection_year,inspection_month,inspection_day,hour_of_day,minute_of_hour,second_of_minute,zone_name,expected_local,expected_session,expected_zoned,bypass) VALUES(2000,2,29,12,34,56.123456,'UTC','2000-02-29 12:34:56.123456','2000-02-29 12:34:56.123456+00','2000-02-29 12:34:56.123456+00',false);
-- name: CalendarConstructorIsoOffset
INSERT INTO inspection_calendar_instants(inspection_year,inspection_month,inspection_day,hour_of_day,minute_of_hour,second_of_minute,zone_name,expected_local,expected_session,expected_zoned,bypass) VALUES(2000,1,1,0,0,0,'+02','2000-01-01','2000-01-01+00','1999-12-31 22:00+00',false);
-- name: CalendarConstructorPosixOffset
INSERT INTO inspection_calendar_instants(inspection_year,inspection_month,inspection_day,hour_of_day,minute_of_hour,second_of_minute,zone_name,expected_local,expected_session,expected_zoned,bypass) VALUES(2000,1,1,0,0,0,'UTC+02','2000-01-01','2000-01-01+00','2000-01-01 02:00+00',false);
-- name: CalendarConstructorCompactOffset
INSERT INTO inspection_calendar_instants(inspection_year,inspection_month,inspection_day,hour_of_day,minute_of_hour,second_of_minute,zone_name,expected_local,expected_session,expected_zoned,bypass) VALUES(2000,1,1,0,0,0,'+0001','2000-01-01','2000-01-01+00','1999-12-31 23:59+00',false);
-- name: CalendarConstructorColonZone
INSERT INTO inspection_calendar_instants(inspection_year,inspection_month,inspection_day,hour_of_day,minute_of_hour,second_of_minute,zone_name,expected_local,expected_session,expected_zoned,bypass) VALUES(2021,3,14,2,30,0,':America/New_York','2021-03-14 02:30','2021-03-14 02:30+00','2021-03-14 07:30+00',false);
-- name: CalendarConstructorEndOfDay
INSERT INTO inspection_calendar_instants(inspection_year,inspection_month,inspection_day,hour_of_day,minute_of_hour,second_of_minute,zone_name,expected_local,expected_session,expected_zoned,bypass) VALUES(2000,1,1,24,0,0,'UTC','2000-01-02','2000-01-02+00','2000-01-02+00',false);
-- name: CalendarConstructorLeapSecond
INSERT INTO inspection_calendar_instants(inspection_year,inspection_month,inspection_day,hour_of_day,minute_of_hour,second_of_minute,zone_name,expected_local,expected_session,expected_zoned,bypass) VALUES(2000,1,1,23,59,60,'UTC','2000-01-02','2000-01-02+00','2000-01-02+00',false);
-- name: CalendarConstructorLowerCarry
INSERT INTO inspection_calendar_instants(inspection_year,inspection_month,inspection_day,hour_of_day,minute_of_hour,second_of_minute,zone_name,expected_local,expected_session,expected_zoned,bypass) VALUES(-4714,11,23,24,0,0,'+00','4714-11-24 BC','4714-11-24 00:00+00 BC','4714-11-24 00:00+00 BC',false);
-- name: CalendarConstructorNegativeFraction
INSERT INTO inspection_calendar_instants(inspection_year,inspection_month,inspection_day,hour_of_day,minute_of_hour,second_of_minute,zone_name,expected_local,expected_session,expected_zoned,bypass) VALUES(2000,1,1,0,0,-0.0000004,'UTC','2000-01-01','2000-01-01+00','2000-01-01+00',false);
-- name: CalendarConstructorNullField
INSERT INTO inspection_calendar_instants(inspection_year,inspection_month,inspection_day,hour_of_day,minute_of_hour,second_of_minute,zone_name,expected_local,expected_session,expected_zoned,bypass) VALUES(NULL,13,1,0,0,0,'UTC',NULL,NULL,NULL,false);
-- name: CalendarConstructorNullZone
INSERT INTO inspection_calendar_instants(inspection_year,inspection_month,inspection_day,hour_of_day,minute_of_hour,second_of_minute,zone_name,expected_local,expected_session,expected_zoned,bypass) VALUES(2000,1,1,0,0,0,NULL,'2000-01-01','2000-01-01+00',NULL,false);
-- name: CalendarConstructorInvalidDateBeforeZone
INSERT INTO inspection_calendar_instants(inspection_year,inspection_month,inspection_day,hour_of_day,minute_of_hour,second_of_minute,zone_name,expected_local,expected_session,expected_zoned,bypass) VALUES(2000,13,1,0,0,0,'16',NULL,NULL,NULL,false);
-- name: CalendarConstructorInvalidNumericZone
INSERT INTO inspection_calendar_instants(inspection_year,inspection_month,inspection_day,hour_of_day,minute_of_hour,second_of_minute,zone_name,expected_local,expected_session,expected_zoned,bypass) VALUES(2000,1,1,0,0,0,'16','2000-01-01','2000-01-01+00',NULL,false);
-- name: CalendarConstructorInvalidHour
INSERT INTO inspection_calendar_instants(inspection_year,inspection_month,inspection_day,hour_of_day,minute_of_hour,second_of_minute,zone_name,expected_local,expected_session,expected_zoned,bypass) VALUES(2000,1,1,25,0,0,'UTC',NULL,NULL,NULL,false);
-- name: CalendarConstructorNaN
INSERT INTO inspection_calendar_instants(inspection_year,inspection_month,inspection_day,hour_of_day,minute_of_hour,second_of_minute,zone_name,expected_local,expected_session,expected_zoned,bypass) VALUES(2000,1,1,0,0,'NaN','UTC',NULL,NULL,NULL,false);
-- name: CalendarConstructorWrongLocal
INSERT INTO inspection_calendar_instants(inspection_year,inspection_month,inspection_day,hour_of_day,minute_of_hour,second_of_minute,zone_name,expected_local,expected_session,expected_zoned,bypass) VALUES(2000,1,1,0,0,0,'UTC','2000-01-02','2000-01-01+00','2000-01-01+00',false);
-- name: CalendarConstructorWrongSession
INSERT INTO inspection_calendar_instants(inspection_year,inspection_month,inspection_day,hour_of_day,minute_of_hour,second_of_minute,zone_name,expected_local,expected_session,expected_zoned,bypass) VALUES(2000,1,1,0,0,0,'UTC','2000-01-01','2000-01-02+00','2000-01-01+00',false);
-- name: CalendarConstructorWrongZoned
INSERT INTO inspection_calendar_instants(inspection_year,inspection_month,inspection_day,hour_of_day,minute_of_hour,second_of_minute,zone_name,expected_local,expected_session,expected_zoned,bypass) VALUES(2000,1,1,0,0,0,'+02','2000-01-01','2000-01-01+00','2000-01-01 02:00+00',false);
-- name: CalendarConstructorSkipped
INSERT INTO inspection_calendar_instants(inspection_year,inspection_month,inspection_day,hour_of_day,minute_of_hour,second_of_minute,zone_name,expected_local,expected_session,expected_zoned,bypass) VALUES(2000,13,1,25,0,'NaN','16',NULL,NULL,NULL,true);

-- name: DateClockConstructorOrdinary
INSERT INTO inspection_date_clocks(inspection_day,inspection_clock,expected_instant,bypass) VALUES('2000-01-01','12:34:56.123456','2000-01-01 12:34:56.123456+00',false);
-- name: DateClockConstructorEndOfDay
INSERT INTO inspection_date_clocks(inspection_day,inspection_clock,expected_instant,bypass) VALUES('2000-01-01','24:00','2000-01-02+00',false);
-- name: DateClockConstructorInfinity
INSERT INTO inspection_date_clocks(inspection_day,inspection_clock,expected_instant,bypass) VALUES('infinity','24:00','infinity',false);
-- name: DateClockConstructorNegativeInfinity
INSERT INTO inspection_date_clocks(inspection_day,inspection_clock,expected_instant,bypass) VALUES('-infinity','00:00','-infinity',false);
-- name: DateClockConstructorNullClock
INSERT INTO inspection_date_clocks(inspection_day,inspection_clock,expected_instant,bypass) VALUES('infinity',NULL,NULL,false);
-- name: DateClockConstructorNullDay
INSERT INTO inspection_date_clocks(inspection_day,inspection_clock,expected_instant,bypass) VALUES(NULL,'00:00',NULL,false);
-- name: DateClockConstructorUpperOverflow
INSERT INTO inspection_date_clocks(inspection_day,inspection_clock,expected_instant,bypass) VALUES('294276-12-31','24:00',NULL,false);
-- name: DateClockConstructorLargeDay
INSERT INTO inspection_date_clocks(inspection_day,inspection_clock,expected_instant,bypass) VALUES('294277-01-01','00:00',NULL,false);
-- name: DateClockConstructorMismatch
INSERT INTO inspection_date_clocks(inspection_day,inspection_clock,expected_instant,bypass) VALUES('2000-01-01','00:00','2000-01-02+00',false);
-- name: DateClockConstructorSkipped
INSERT INTO inspection_date_clocks(inspection_day,inspection_clock,expected_instant,bypass) VALUES('294277-01-01','24:00',NULL,true);

-- name: InstantLimitWithin
INSERT INTO inspection_instant_limits(recorded_at,center_at,tolerance,subtract_offset,compare_before,expected,bypass) VALUES('2000-01-01 12:00+00','2000-01-01+00','1 day',false,true,true,false);
-- name: InstantLimitBeyond
INSERT INTO inspection_instant_limits(recorded_at,center_at,tolerance,subtract_offset,compare_before,expected,bypass) VALUES('2000-01-02 12:00+00','2000-01-01+00','1 day',false,true,false,false);
-- name: InstantLimitLowerBoundary
INSERT INTO inspection_instant_limits(recorded_at,center_at,tolerance,subtract_offset,compare_before,expected,bypass) VALUES('2000-01-01+00','2000-01-02+00','1 day',true,false,true,false);
-- name: InstantLimitZero
INSERT INTO inspection_instant_limits(recorded_at,center_at,tolerance,subtract_offset,compare_before,expected,bypass) VALUES('2000-01-01+00','2000-01-01+00','0',false,false,true,false);
-- name: InstantLimitCalendarZeroSpan
INSERT INTO inspection_instant_limits(recorded_at,center_at,tolerance,subtract_offset,compare_before,expected,bypass) VALUES('2000-01-30 12:00+00','2000-01-31 12:00+00','1 month -30 days',false,true,true,false);
-- name: InstantLimitInfiniteAddition
INSERT INTO inspection_instant_limits(recorded_at,center_at,tolerance,subtract_offset,compare_before,expected,bypass) VALUES('infinity','-infinity','infinity',false,false,true,false);
-- name: InstantLimitInfiniteSubtraction
INSERT INTO inspection_instant_limits(recorded_at,center_at,tolerance,subtract_offset,compare_before,expected,bypass) VALUES('-infinity','infinity','infinity',true,true,true,false);
-- name: InstantLimitNegativeOffset
INSERT INTO inspection_instant_limits(recorded_at,center_at,tolerance,subtract_offset,compare_before,expected,bypass) VALUES('2000-01-01+00','2000-01-01+00','-1 day',false,true,NULL,false);
-- name: InstantLimitNegativeInfinity
INSERT INTO inspection_instant_limits(recorded_at,center_at,tolerance,subtract_offset,compare_before,expected,bypass) VALUES('2000-01-01+00','2000-01-01+00','-infinity',false,true,NULL,false);
-- name: InstantLimitNullFlag
INSERT INTO inspection_instant_limits(recorded_at,center_at,tolerance,subtract_offset,compare_before,expected,bypass) VALUES('2000-01-01+00','2000-01-01+00','-1 day',NULL,true,NULL,false);
-- name: InstantLimitNullValue
INSERT INTO inspection_instant_limits(recorded_at,center_at,tolerance,subtract_offset,compare_before,expected,bypass) VALUES(NULL,'infinity','-infinity',false,false,NULL,false);
-- name: InstantLimitNegationBeforeInfinity
INSERT INTO inspection_instant_limits(recorded_at,center_at,tolerance,subtract_offset,compare_before,expected,bypass) VALUES('2000-01-01+00','infinity','2147483647 days -9223372036854.775808 seconds',true,false,NULL,false);
-- name: InstantLimitWrongExpected
INSERT INTO inspection_instant_limits(recorded_at,center_at,tolerance,subtract_offset,compare_before,expected,bypass) VALUES('2000-01-02 12:00+00','2000-01-01+00','1 day',false,true,true,false);
-- name: InstantLimitSkipped
INSERT INTO inspection_instant_limits(recorded_at,center_at,tolerance,subtract_offset,compare_before,expected,bypass) VALUES('2000-01-01+00','2000-01-01+00','-infinity',false,true,NULL,true);

-- name: DurationPeriodOverlapping
INSERT INTO inspection_duration_periods(first_start,first_duration,first_end,second_start,second_duration,second_end,expected_both,expected_left,expected_right,bypass) VALUES('2000-01-01 12:00+00','1 day','2000-01-02 12:00+00','2000-01-02+00','1 day','2000-01-03+00',true,true,true,false);
-- name: DurationPeriodTouching
INSERT INTO inspection_duration_periods(first_start,first_duration,first_end,second_start,second_duration,second_end,expected_both,expected_left,expected_right,bypass) VALUES('2000-01-01+00','1 day','2000-01-02+00','2000-01-02+00','1 day','2000-01-03+00',false,false,false,false);
-- name: DurationPeriodPoints
INSERT INTO inspection_duration_periods(first_start,first_duration,first_end,second_start,second_duration,second_end,expected_both,expected_left,expected_right,bypass) VALUES('2000-01-01+00','0','2000-01-01+00','2000-01-01+00','0','2000-01-01+00',true,true,true,false);
-- name: DurationPeriodReversed
INSERT INTO inspection_duration_periods(first_start,first_duration,first_end,second_start,second_duration,second_end,expected_both,expected_left,expected_right,bypass) VALUES('2000-01-03+00','-2 days','2000-01-01+00','2000-01-02+00','-1 day','2000-01-01+00',true,true,true,false);
-- name: DurationPeriodNullFirst
INSERT INTO inspection_duration_periods(first_start,first_duration,first_end,second_start,second_duration,second_end,expected_both,expected_left,expected_right,bypass) VALUES(NULL,'1 month',NULL,'2000-01-01+00','0','2000-01-01+00',NULL,NULL,NULL,false);
-- name: DurationPeriodNullDuration
INSERT INTO inspection_duration_periods(first_start,first_duration,first_end,second_start,second_duration,second_end,expected_both,expected_left,expected_right,bypass) VALUES('2000-01-01+00',NULL,'2000-01-01+00','2000-01-01+00','0','2000-01-01+00',NULL,NULL,true,false);
-- name: DurationPeriodNullDurationKnownOverlap
INSERT INTO inspection_duration_periods(first_start,first_duration,first_end,second_start,second_duration,second_end,expected_both,expected_left,expected_right,bypass) VALUES('2000-01-02+00',NULL,'2000-01-03+00','2000-01-01+00','3 days','2000-01-04+00',true,true,true,false);
-- name: DurationPeriodNullWithError
INSERT INTO inspection_duration_periods(first_start,first_duration,first_end,second_start,second_duration,second_end,expected_both,expected_left,expected_right,bypass) VALUES(NULL,'0',NULL,'infinity','-infinity',NULL,NULL,NULL,NULL,false);
-- name: DurationPeriodFirstError
INSERT INTO inspection_duration_periods(first_start,first_duration,first_end,second_start,second_duration,second_end,expected_both,expected_left,expected_right,bypass) VALUES('infinity','-infinity',NULL,NULL,'0',NULL,NULL,NULL,NULL,false);
-- name: DurationPeriodInfinityPoints
INSERT INTO inspection_duration_periods(first_start,first_duration,first_end,second_start,second_duration,second_end,expected_both,expected_left,expected_right,bypass) VALUES('infinity','0','infinity','infinity','0','infinity',true,true,true,false);
-- name: DurationPeriodInfiniteEnds
INSERT INTO inspection_duration_periods(first_start,first_duration,first_end,second_start,second_duration,second_end,expected_both,expected_left,expected_right,bypass) VALUES('2000-01-01+00','infinity','infinity','2000-01-02+00','infinity','infinity',true,true,true,false);
-- name: DurationPeriodMonthEndTouching
INSERT INTO inspection_duration_periods(first_start,first_duration,first_end,second_start,second_duration,second_end,expected_both,expected_left,expected_right,bypass) VALUES('2000-01-31 12:00+00','1 month','2000-02-29 12:00+00','2000-02-29 12:00+00','1 day','2000-03-01 12:00+00',false,false,false,false);
-- name: DurationPeriodWrongBoth
INSERT INTO inspection_duration_periods(first_start,first_duration,first_end,second_start,second_duration,second_end,expected_both,expected_left,expected_right,bypass) VALUES('2000-01-01+00','1 day','2000-01-02+00','2000-01-02+00','1 day','2000-01-03+00',true,false,false,false);
-- name: DurationPeriodWrongLeft
INSERT INTO inspection_duration_periods(first_start,first_duration,first_end,second_start,second_duration,second_end,expected_both,expected_left,expected_right,bypass) VALUES('2000-01-01+00','1 day','2000-01-02+00','2000-01-02+00','1 day','2000-01-03+00',false,true,false,false);
-- name: DurationPeriodWrongRight
INSERT INTO inspection_duration_periods(first_start,first_duration,first_end,second_start,second_duration,second_end,expected_both,expected_left,expected_right,bypass) VALUES('2000-01-01+00','1 day','2000-01-02+00','2000-01-02+00','1 day','2000-01-03+00',false,false,true,false);
-- name: DurationPeriodSkipped
INSERT INTO inspection_duration_periods(first_start,first_duration,first_end,second_start,second_duration,second_end,expected_both,expected_left,expected_right,bypass) VALUES('infinity','-infinity',NULL,NULL,'0',NULL,NULL,NULL,NULL,true);

-- name: DurationLabelPositive
INSERT INTO inspection_duration_labels(elapsed,label_pattern,expected_label,bypass) VALUES ('1 year 2 months 3 days 04:05:06.123456','YYYY-MM-DD HH24:MI:SS.US','0001-02-03 04:05:06.123456',false);
-- name: DurationLabelNegative
INSERT INTO inspection_duration_labels(elapsed,label_pattern,expected_label,bypass) VALUES ('-1 year -2 months -3 days -04:05:06.123456','YYYY-MM-DD HH24:MI:SS.US','-0001--02--3 -04:-05:-06.-123456',false);
-- name: DurationLabelTotalHours
INSERT INTO inspection_duration_labels(elapsed,label_pattern,expected_label,bypass) VALUES ('49:02:03','HH24 HH12 AM SSSSS','49 01 AM 176523',false);
-- name: DurationLabelFractionFill
INSERT INTO inspection_duration_labels(elapsed,label_pattern,expected_label,bypass) VALUES ('0.001002 seconds','FMMS FMUS FF1 FF4','001 001002 0 0010',false);
-- name: DurationLabelRomanFullYear
INSERT INTO inspection_duration_labels(elapsed,label_pattern,expected_label,bypass) VALUES ('12 months','RM|FMRM|rm','XII |XII|xii ',false);
-- name: DurationLabelOrdinal
INSERT INTO inspection_duration_labels(elapsed,label_pattern,expected_label,bypass) VALUES ('21 days','DDth "day"','21st day',false);
-- name: DurationLabelEmptyQuarter
INSERT INTO inspection_duration_labels(elapsed,label_pattern,expected_label,bypass) VALUES ('0','Q','',false);
-- name: DurationLabelEmptyPattern
INSERT INTO inspection_duration_labels(elapsed,label_pattern,expected_label,bypass) VALUES ('1 day','',NULL,false);
-- name: DurationLabelQuotedEmpty
INSERT INTO inspection_duration_labels(elapsed,label_pattern,expected_label,bypass) VALUES ('1 day','""','',false);
-- name: DurationLabelNull
INSERT INTO inspection_duration_labels(elapsed,label_pattern,expected_label,bypass) VALUES (NULL,'HH24',NULL,false);
-- name: DurationLabelNullPattern
INSERT INTO inspection_duration_labels(elapsed,label_pattern,expected_label,bypass) VALUES ('1 day',NULL,NULL,false);
-- name: DurationLabelInfinity
INSERT INTO inspection_duration_labels(elapsed,label_pattern,expected_label,bypass) VALUES ('infinity','MONTH',NULL,false);
-- name: DurationLabelInvalidCalendar
INSERT INTO inspection_duration_labels(elapsed,label_pattern,expected_label,bypass) VALUES ('1 day','MONTH',NULL,false);
-- name: DurationLabelInvalidTimezone
INSERT INTO inspection_duration_labels(elapsed,label_pattern,expected_label,bypass) VALUES ('1 day','TZH',NULL,false);
-- name: DurationLabelSkipped
INSERT INTO inspection_duration_labels(elapsed,label_pattern,expected_label,bypass) VALUES ('1 day','MONTH',NULL,true);
-- name: DurationLabelWrong
INSERT INTO inspection_duration_labels(elapsed,label_pattern,expected_label,bypass) VALUES ('25 hours','HH24','01',false);

-- name: CalendarLabelOffset
INSERT INTO inspection_calendar_labels(reported_at,recorded_at,label_pattern,expected_local_label,expected_instant_label,bypass) VALUES ('1999-12-31 23:59:59.123456','2000-01-01 01:59:59.123456+02','YYYY-MM-DD HH24:MI:SS.US','1999-12-31 23:59:59.123456','1999-12-31 23:59:59.123456',false);
-- name: CalendarLabelMonth
INSERT INTO inspection_calendar_labels(reported_at,recorded_at,label_pattern,expected_local_label,expected_instant_label,bypass) VALUES ('2024-07-04','2024-07-04+00','FMMonth DD, YYYY','July 04, 2024','July 04, 2024',false);
-- name: CalendarLabelLocalized
INSERT INTO inspection_calendar_labels(reported_at,recorded_at,label_pattern,expected_local_label,expected_instant_label,bypass) VALUES ('2000-01-01','2000-01-01+00','TMDAY TMMonth','SATURDAY January','SATURDAY January',false);
-- name: CalendarLabelEra
INSERT INTO inspection_calendar_labels(reported_at,recorded_at,label_pattern,expected_local_label,expected_instant_label,bypass) VALUES ('0001-01-01 BC','0001-01-01+00 BC','YYYY BC CC','0001 BC -01','0001 BC -01',false);
-- name: CalendarLabelIsoWeek
INSERT INTO inspection_calendar_labels(reported_at,recorded_at,label_pattern,expected_local_label,expected_instant_label,bypass) VALUES ('2000-01-01','2000-01-01+00','IYYY-IW-ID IDDD DDD','1999-52-6 363 001','1999-52-6 363 001',false);
-- name: CalendarLabelTimezone
INSERT INTO inspection_calendar_labels(reported_at,recorded_at,label_pattern,expected_local_label,expected_instant_label,bypass) VALUES ('2000-01-01','2000-01-01+00','"["TZ"]" TZH:TZM OF','[] +00:00 +00','[UTC] +00:00 +00',false);
-- name: CalendarLabelFractionFill
INSERT INTO inspection_calendar_labels(reported_at,recorded_at,label_pattern,expected_local_label,expected_instant_label,bypass) VALUES ('2000-01-01 00:00:00.000001','2000-01-01 00:00:00.000001+00','FMUS FF6','000001 000001','000001 000001',false);
-- name: CalendarLabelEmptyPattern
INSERT INTO inspection_calendar_labels(reported_at,recorded_at,label_pattern,expected_local_label,expected_instant_label,bypass) VALUES ('2000-01-01','2000-01-01+00','',NULL,NULL,false);
-- name: CalendarLabelQuotedEmpty
INSERT INTO inspection_calendar_labels(reported_at,recorded_at,label_pattern,expected_local_label,expected_instant_label,bypass) VALUES ('2000-01-01','2000-01-01+00','""','','',false);
-- name: CalendarLabelNull
INSERT INTO inspection_calendar_labels(reported_at,recorded_at,label_pattern,expected_local_label,expected_instant_label,bypass) VALUES (NULL,NULL,'YYYY',NULL,NULL,false);
-- name: CalendarLabelInfinity
INSERT INTO inspection_calendar_labels(reported_at,recorded_at,label_pattern,expected_local_label,expected_instant_label,bypass) VALUES ('infinity','-infinity','MONTH',NULL,NULL,false);
-- name: CalendarLabelRoundedUpper
INSERT INTO inspection_calendar_labels(reported_at,recorded_at,label_pattern,expected_local_label,expected_instant_label,bypass) VALUES ((timestamp '294276-12-31 23:59:59.999999')::timestamp(0),(timestamptz '294276-12-31 23:59:59.999999+00')::timestamptz(0),'YYYY-MM-DD','294277-01-01','294277-01-01',false);
-- name: CalendarLabelWrongLocal
INSERT INTO inspection_calendar_labels(reported_at,recorded_at,label_pattern,expected_local_label,expected_instant_label,bypass) VALUES ('2000-01-01','2000-01-01+00','YYYY','1999','2000',false);
-- name: CalendarLabelWrongInstant
INSERT INTO inspection_calendar_labels(reported_at,recorded_at,label_pattern,expected_local_label,expected_instant_label,bypass) VALUES ('2000-01-01','2000-01-01+00','YYYY','2000','1999',false);
-- name: CalendarLabelSkipped
INSERT INTO inspection_calendar_labels(reported_at,recorded_at,label_pattern,expected_local_label,expected_instant_label,bypass) VALUES ('2000-01-01','2000-01-01+00','YYYY','1999','1999',true);

-- name: ImportedDatetimeLeapDay
INSERT INTO inspection_imported_datetimes(source_text,input_pattern,expected_day,expected_instant,bypass) VALUES ('2024-02-29 12:34:56.123456 +02','YYYY-MM-DD HH24:MI:SS.US TZH','2024-02-29','2024-02-29 10:34:56.123456+00',false);
-- name: ImportedDatetimeIsoWeek
INSERT INTO inspection_imported_datetimes(source_text,input_pattern,expected_day,expected_instant,bypass) VALUES ('2020-53-7','IYYY-IW-ID','2021-01-03','2021-01-03+00',false);
-- name: ImportedDatetimeLocalizedMonth
INSERT INTO inspection_imported_datetimes(source_text,input_pattern,expected_day,expected_instant,bypass) VALUES ('February 29 2024','TMMonth DD YYYY','2024-02-29','2024-02-29+00',false);
-- name: ImportedDatetimeEra
INSERT INTO inspection_imported_datetimes(source_text,input_pattern,expected_day,expected_instant,bypass) VALUES ('0001-01-01 BC','YYYY-MM-DD BC','0001-01-01 BC','0001-01-01+00 BC',false);
-- name: ImportedDatetimeFixedSeparators
INSERT INTO inspection_imported_datetimes(source_text,input_pattern,expected_day,expected_instant,bypass) VALUES ('2024x02y29 trailing','FXYYYY-MM-DD','2024-02-29','2024-02-29+00',false);
-- name: ImportedDatetimePartialInput
INSERT INTO inspection_imported_datetimes(source_text,input_pattern,expected_day,expected_instant,bypass) VALUES ('2024','YYYY-MM-DD','2024-01-01','2024-01-01+00',false);
-- name: ImportedDatetimeEmptyInput
INSERT INTO inspection_imported_datetimes(source_text,input_pattern,expected_day,expected_instant,bypass) VALUES ('','YYYY-MM-DD','0001-01-01 BC','0001-01-01+00 BC',false);
-- name: ImportedDatetimeAbbreviation
INSERT INTO inspection_imported_datetimes(source_text,input_pattern,expected_day,expected_instant,bypass) VALUES ('2024-02-29 12:00 EST','YYYY-MM-DD HH24:MI TZ','2024-02-29','2024-02-29 17:00+00',false);
-- name: ImportedDatetimeZonePrefix
INSERT INTO inspection_imported_datetimes(source_text,input_pattern,expected_day,expected_instant,bypass) VALUES ('2024-02-29 UTCsuffix','YYYY-MM-DD TZ','2024-02-29','2024-02-29+00',false);
-- name: ImportedDatetimeFractionWidth
INSERT INTO inspection_imported_datetimes(source_text,input_pattern,expected_day,expected_instant,bypass) VALUES ('-2147483 -2147483647','FXMS US','0001-01-01 BC','0001-01-01 00:00:00.000649+00 BC',false);
-- name: ImportedDatetimeUpperOffset
INSERT INTO inspection_imported_datetimes(source_text,input_pattern,expected_day,expected_instant,bypass) VALUES ('294277-01-01 00:00 +01','YYYY-MM-DD HH24:MI TZH','294277-01-01','294276-12-31 23:00+00',false);
-- name: ImportedDatetimeNullInput
INSERT INTO inspection_imported_datetimes(source_text,input_pattern,expected_day,expected_instant,bypass) VALUES (NULL,'YYYY',NULL,NULL,false);
-- name: ImportedDatetimeNullPattern
INSERT INTO inspection_imported_datetimes(source_text,input_pattern,expected_day,expected_instant,bypass) VALUES ('bad',NULL,NULL,NULL,false);
-- name: ImportedDatetimeInvalidCalendar
INSERT INTO inspection_imported_datetimes(source_text,input_pattern,expected_day,expected_instant,bypass) VALUES ('2023-02-29','YYYY-MM-DD',NULL,NULL,false);
-- name: ImportedDatetimeInvalidClock
INSERT INTO inspection_imported_datetimes(source_text,input_pattern,expected_day,expected_instant,bypass) VALUES ('2024-02-29 24:00','YYYY-MM-DD HH24:MI',NULL,NULL,false);
-- name: ImportedDatetimeInvalidOffset
INSERT INTO inspection_imported_datetimes(source_text,input_pattern,expected_day,expected_instant,bypass) VALUES ('2024-02-29 +99','YYYY-MM-DD TZH',NULL,NULL,false);
-- name: ImportedDatetimeWrongDay
INSERT INTO inspection_imported_datetimes(source_text,input_pattern,expected_day,expected_instant,bypass) VALUES ('2024-02-29','YYYY-MM-DD','2024-02-28','2024-02-29+00',false);
-- name: ImportedDatetimeWrongInstant
INSERT INTO inspection_imported_datetimes(source_text,input_pattern,expected_day,expected_instant,bypass) VALUES ('2024-02-29','YYYY-MM-DD','2024-02-29','2024-03-01+00',false);
-- name: ImportedDatetimeSkipped
INSERT INTO inspection_imported_datetimes(source_text,input_pattern,expected_day,expected_instant,bypass) VALUES ('bad','YYYY-MM-DD',NULL,NULL,true);

-- name: CalendarElapsedMonthBorrow
INSERT INTO inspection_calendar_elapsed(started_at,ended_at,expected_elapsed,bypass) VALUES ('2000-01-31 12:00+00','2000-02-29 12:00+00','29 days',false);
-- name: CalendarElapsedWholeMonths
INSERT INTO inspection_calendar_elapsed(started_at,ended_at,expected_elapsed,bypass) VALUES ('2000-01-31 12:00+00','2000-03-31 12:00+00','2 months',false);
-- name: CalendarElapsedFractionBorrow
INSERT INTO inspection_calendar_elapsed(started_at,ended_at,expected_elapsed,bypass) VALUES ('2000-01-31 12:00+00','2000-02-29 11:59:59.999999+00','28 days 23:59:59.999999',false);
-- name: CalendarElapsedLeapYearBorrow
INSERT INTO inspection_calendar_elapsed(started_at,ended_at,expected_elapsed,bypass) VALUES ('2000-02-29 12:00+00','2001-02-28 12:00+00','11 months 28 days',false);
-- name: CalendarElapsedReverse
INSERT INTO inspection_calendar_elapsed(started_at,ended_at,expected_elapsed,bypass) VALUES ('2000-02-29 11:59:59.999999+00','2000-01-31 12:00+00','-28 days -23:59:59.999999',false);
-- name: CalendarElapsedEra
INSERT INTO inspection_calendar_elapsed(started_at,ended_at,expected_elapsed,bypass) VALUES ('0001-01-01+00 BC','0001-01-01+00','1 year',false);
-- name: CalendarElapsedSameInstant
INSERT INTO inspection_calendar_elapsed(started_at,ended_at,expected_elapsed,bypass) VALUES ('2024-11-03 01:30-04','2024-11-03 05:30+00','0',false);
-- name: CalendarElapsedRoundedUpper
INSERT INTO inspection_calendar_elapsed(started_at,ended_at,expected_elapsed,bypass) VALUES ('294276-12-31 23:59:59.999999+00',(timestamptz '294276-12-31 23:59:59.999999+00')::timestamptz(0),'0.000001 seconds',false);
-- name: CalendarElapsedFutureInfinity
INSERT INTO inspection_calendar_elapsed(started_at,ended_at,expected_elapsed,bypass) VALUES ('2000-01-01+00','infinity','infinity',false);
-- name: CalendarElapsedPastInfinity
INSERT INTO inspection_calendar_elapsed(started_at,ended_at,expected_elapsed,bypass) VALUES ('2000-01-01+00','-infinity','-infinity',false);
-- name: CalendarElapsedOppositeInfinities
INSERT INTO inspection_calendar_elapsed(started_at,ended_at,expected_elapsed,bypass) VALUES ('-infinity','infinity','infinity',false);
-- name: CalendarElapsedIndeterminateInfinities
INSERT INTO inspection_calendar_elapsed(started_at,ended_at,expected_elapsed,bypass) VALUES ('infinity','infinity',NULL,false);
-- name: CalendarElapsedNullStart
INSERT INTO inspection_calendar_elapsed(started_at,ended_at,expected_elapsed,bypass) VALUES (NULL,'2000-01-01+00',NULL,false);
-- name: CalendarElapsedNullEnd
INSERT INTO inspection_calendar_elapsed(started_at,ended_at,expected_elapsed,bypass) VALUES ('2000-01-01+00',NULL,NULL,false);
-- name: CalendarElapsedWrongValue
INSERT INTO inspection_calendar_elapsed(started_at,ended_at,expected_elapsed,bypass) VALUES ('2000-01-31 12:00+00','2000-02-29 12:00+00','1 month',false);
-- name: CalendarElapsedSkippedError
INSERT INTO inspection_calendar_elapsed(started_at,ended_at,expected_elapsed,bypass) VALUES ('infinity','infinity',NULL,true);
