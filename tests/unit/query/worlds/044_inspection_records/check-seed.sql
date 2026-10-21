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
