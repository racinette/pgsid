pub use pgsid_regex_engine::*;

pub mod checkruntime {
    include!("values.rs");
    include!("numeric.rs");
    include!("network.rs");
    include!("mac.rs");
    include!("uuid.rs");
    include!("json_syntax.rs");
    include!("json_read.rs");
    include!("json_array_paths.rs");
    include!("json_format.rs");
    include!("jsonb.rs");
    include!("jsonb_build.rs");
    include!("jsonb_array.rs");
    include!("jsonb_storage.rs");
    include!("jsonpath.rs");
    include!("jsonpath_storage.rs");
    include!("array_elements.rs");
    include!("composite.rs");
    include!("composite_text.rs");
    include!("range.rs");
    include!("multirange.rs");
    include!("domain.rs");
    include!("array.rs");
    include!("array_storage.rs");
    include!("array_quantifier.rs");
    include!("bit.rs");
    include!("hash.rs");
    include!("text_builder.rs");
    include!(concat!(env!("OUT_DIR"), "/unicode-tables.rs"));
    include!("unicode.rs");
    include!("date.rs");
    include!("timestamp.rs");
    include!("timestamptz.rs");
    include!("time.rs");
    include!("interval.rs");
    include!("logic.rs");
    include!("constants.rs");

    #[cfg(test)]
    mod constant_tests {
        use super::*;

        #[test]
        fn preparation_preserves_errors_before_unknown_and_ignores_known_values() {
            let first = CheckOutcome::Error(make_sql_error(3452547));
            let second = CheckOutcome::Error(make_sql_error(3452582));
            assert!(constant_finish(CheckOutcome::False, CheckOutcome::Null) == CheckOutcome::True);
            assert!(
                constant_finish(CheckOutcome::Unknown, CheckOutcome::True) == CheckOutcome::Unknown
            );
            assert!(constant_finish(CheckOutcome::Unknown, first) == first);
            assert!(constant_finish(first, CheckOutcome::Unknown) == first);
            assert!(constant_finish(first, second) == first);
        }
    }
}

pub use checkruntime::*;

pub mod pg_catalog {
    include!("operations/pg_catalog/catalog_vectors.rs");
    use super::*;

    include!("operations/pg_catalog/boolean.rs");
    include!("operations/pg_catalog/composite_text.rs");
    include!("operations/pg_catalog/composite_compare.rs");
    include!("operations/pg_catalog/composite_hash.rs");
    include!("operations/pg_catalog/composite_binary.rs");
    include!("operations/pg_catalog/array_metadata.rs");
    include!("operations/pg_catalog/range_metadata.rs");
    include!("operations/pg_catalog/range_subdiff.rs");
    include!("operations/pg_catalog/multirange_metadata.rs");
    include!("operations/pg_catalog/multirange_construct.rs");
    include!("operations/pg_catalog/multirange_compare.rs");
    include!("operations/pg_catalog/multirange_set.rs");
    include!("operations/pg_catalog/multirange_input.rs");
    include!("operations/pg_catalog/multirange_output.rs");
    include!("operations/pg_catalog/multirange_binary.rs");
    include!("operations/pg_catalog/range_construct.rs");
    include!("operations/pg_catalog/range_input.rs");
    include!("operations/pg_catalog/literal_text_fields.rs");
    include!("operations/pg_catalog/range_output.rs");
    include!("operations/pg_catalog/range_compare.rs");
    include!("operations/pg_catalog/range_set.rs");
    include!("operations/pg_catalog/range_binary.rs");
    include!("operations/pg_catalog/range_hash.rs");
    include!("operations/pg_catalog/array_compare.rs");
    include!("operations/pg_catalog/array_hash.rs");
    include!("operations/pg_catalog/enumeration_support.rs");
    include!("operations/pg_catalog/array_search.rs");
    include!("operations/pg_catalog/array_transform.rs");
    include!("operations/pg_catalog/array_rewrite.rs");
    include!("operations/pg_catalog/array_fill_trim.rs");
    include!("operations/pg_catalog/name_order.rs");
    include!("operations/pg_catalog/scalar_input.rs");
    include!("operations/pg_catalog/array_input.rs");
    include!("operations/pg_catalog/array_output.rs");
    include!("operations/pg_catalog/array_string_io.rs");
    include!("operations/pg_catalog/array_reverse.rs");
    include!("operations/pg_catalog/array_sort.rs");
    include!("operations/pg_catalog/array_binary_io.rs");
    include!("operations/pg_catalog/json_core.rs");
    include!("operations/pg_catalog/jsonpath_scan.rs");
    include!("operations/pg_catalog/jsonpath_tables.generated.rs");
    include!("operations/pg_catalog/jsonpath_parse.rs");
    include!("operations/pg_catalog/jsonpath_value.rs");
    include!("operations/pg_catalog/jsonpath_input.rs");
    include!("operations/pg_catalog/jsonpath_output.rs");
    include!("operations/pg_catalog/jsonpath_arithmetic.rs");
    include!("operations/pg_catalog/jsonpath_predicates.rs");
    include!("operations/pg_catalog/jsonpath_regex.rs");
    include!("operations/pg_catalog/jsonpath_methods.rs");
    include!("operations/pg_catalog/jsonpath_conversions.rs");
    include!("operations/pg_catalog/jsonpath_temporal.rs");
    include!("operations/pg_catalog/jsonpath_template.rs");
    include!("operations/pg_catalog/jsonpath_calendar.rs");
    include!("operations/pg_catalog/jsonpath_names.rs");
    include!("operations/pg_catalog/jsonpath_keyvalue.rs");
    include!("operations/pg_catalog/jsonpath_execute.rs");
    include!("operations/pg_catalog/jsonb_core.rs");
    include!("operations/pg_catalog/jsonb_hash.rs");
    include!("operations/pg_catalog/json_extract.rs");
    include!("operations/pg_catalog/jsonb_extract.rs");
    include!("operations/pg_catalog/json_array_paths.rs");
    include!("operations/pg_catalog/jsonb_relations.rs");
    include!("operations/pg_catalog/jsonb_order.rs");
    include!("operations/pg_catalog/jsonb_cast.rs");
    include!("operations/pg_catalog/jsonb_edit.rs");
    include!("operations/pg_catalog/jsonb_format.rs");
    include!("operations/pg_catalog/jsonb_convert.rs");
    include!("operations/pg_catalog/jsonb_convert_context.rs");
    include!("operations/pg_catalog/jsonb_range.rs");
    include!("operations/pg_catalog/jsonb_construct.rs");
    include!("operations/pg_catalog/jsonb_array.rs");
    include!("operations/pg_catalog/jsonb_path_edit.rs");
    include!("operations/pg_catalog/json_object_arrays.rs");
    include!("operations/pg_catalog/json_format.rs");
    include!("operations/pg_catalog/json_convert.rs");
    include!("operations/pg_catalog/json_construct.rs");
    include!("operations/pg_catalog/enumeration.rs");
    include!("operations/pg_catalog/null_count.rs");
    include!("operations/pg_catalog/text_concat.rs");
    include!("operations/pg_catalog/text_format_grammar.rs");
    include!("operations/pg_catalog/text_format_state.rs");
    include!("operations/pg_catalog/text_format_bounds.rs");
    include!("operations/pg_catalog/text_format_choices.rs");
    include!("operations/pg_catalog/timezone_format_output.rs");
    include!("operations/pg_catalog/text_format_render.rs");
    include!("operations/pg_catalog/text_nullable_quote.rs");
    include!("operations/pg_catalog/text_generic_quote.rs");
    include!("operations/pg_catalog/date.rs");
    include!("operations/pg_catalog/timestamptz.rs");
    include!("operations/pg_catalog/timestamp.rs");
    include!("operations/pg_catalog/temporal_support.rs");
    include!("operations/pg_catalog/temporal_comparison.rs");
    include!("operations/pg_catalog/temporal_arithmetic.rs");
    include!("operations/pg_catalog/temporal_precision.rs");
    include!("operations/pg_catalog/temporal_fields.rs");
    include!("operations/pg_catalog/temporal_extract.rs");
    include!("operations/pg_catalog/temporal_timestamp_extract.rs");
    include!("operations/pg_catalog/timezone_comparison.rs");
    include!("operations/pg_catalog/timezone_local.rs");
    include!("operations/pg_catalog/timestamp_constructor.rs");
    include!("operations/pg_catalog/timezone_constructor.rs");
    include!("operations/pg_catalog/timezone_periods.rs");
    include!("operations/pg_catalog/timezone_extract.rs");
    include!("operations/pg_catalog/timezone_trunc.rs");
    include!("operations/pg_catalog/timezone.rs");
    include!("operations/pg_catalog/timezone_named.rs");
    include!("operations/pg_catalog/timezone_recurring.rs");
    include!("operations/pg_catalog/timezone_output.rs");
    include!("operations/pg_catalog/timezone_casts.rs");
    include!("operations/pg_catalog/timezone_interval.rs");
    include!("operations/pg_catalog/timezone_age.rs");
    include!(concat!(env!("OUT_DIR"), "/timezone-tables.rs"));
    include!("operations/pg_catalog/binary_send.rs");
    include!("operations/pg_catalog/time_send.rs");
    include!("operations/pg_catalog/value_order.rs");
    include!("operations/pg_catalog/time_core.rs");
    include!("operations/pg_catalog/time_arithmetic.rs");
    include!("operations/pg_catalog/time_constructors.rs");
    include!("operations/pg_catalog/interval_math.rs");
    include!("operations/pg_catalog/interval_calendar.rs");
    include!("operations/pg_catalog/time_output.rs");
    include!("operations/pg_catalog/interval_format.rs");
    include!("operations/pg_catalog/timestamp_format.rs");
    include!("operations/pg_catalog/timezone_format.rs");
    include!("operations/pg_catalog/timezone_template.rs");
    include!("operations/pg_catalog/temporal_hash.rs");
    include!("operations/pg_catalog/clock_extract.rs");
    include!("operations/pg_catalog/temporal_bins.rs");
    include!("operations/pg_catalog/temporal_age.rs");
    include!("operations/pg_catalog/temporal_range.rs");
    include!("operations/pg_catalog/timezone_calendar.rs");
    include!("operations/pg_catalog/temporal_overlaps.rs");
    include!("operations/pg_catalog/temporal_timestamp_legacy.rs");
    include!("operations/pg_catalog/temporal_scalar.rs");
    include!("operations/pg_catalog/time_zone.rs");
    include!("operations/pg_catalog/float_core.rs");
    include!("operations/pg_catalog/float_hash.rs");
    include!("operations/pg_catalog/float_arithmetic.rs");
    include!("operations/pg_catalog/float_math.rs");
    include!("operations/pg_catalog/point_core.rs");
    include!("operations/pg_catalog/line_core.rs");
    include!("operations/pg_catalog/point_operations.rs");
    include!("operations/pg_catalog/point_input.rs");
    include!("operations/pg_catalog/line_input.rs");
    include!("operations/pg_catalog/line_operations.rs");
    include!("operations/pg_catalog/lseg_core.rs");
    include!("operations/pg_catalog/lseg_input.rs");
    include!("operations/pg_catalog/lseg_operations.rs");
    include!("operations/pg_catalog/box_core.rs");
    include!("operations/pg_catalog/circle_core.rs");
    include!("operations/pg_catalog/circle_polygon_math.rs");
    include!("operations/pg_catalog/circle_polygon.rs");
    include!("operations/pg_catalog/path_core.rs");
    include!("operations/pg_catalog/path_operations.rs");
    include!("operations/pg_catalog/path_distance.rs");
    include!("operations/pg_catalog/path_predicates.rs");
    include!("operations/pg_catalog/path_input.rs");
    include!("operations/pg_catalog/polygon_core.rs");
    include!("operations/pg_catalog/polygon_center.rs");
    include!("operations/pg_catalog/polygon_relations.rs");
    include!("operations/pg_catalog/polygon_distance.rs");
    include!("operations/pg_catalog/polygon_input.rs");
    include!("operations/pg_catalog/circle_input.rs");
    include!("operations/pg_catalog/circle_operations.rs");
    include!("operations/pg_catalog/money_core.rs");
    include!("operations/pg_catalog/aclitem.rs");
    include!("operations/pg_catalog/tsvector_sort.rs");
    include!("operations/pg_catalog/tsvector_input.rs");
    include!("operations/pg_catalog/tsvector_value.rs");
    include!("operations/pg_catalog/tsvector_operations.rs");
    include!("operations/pg_catalog/tsquery_input.rs");
    include!("operations/pg_catalog/tsquery_output.rs");
    include!("operations/pg_catalog/tsquery_compare.rs");
    include!("operations/pg_catalog/tsquery_construct.rs");
    include!("operations/pg_catalog/tsquery_rewrite_tree.rs");
    include!("operations/pg_catalog/tsquery_rewrite.rs");
    include!("operations/pg_catalog/tsquery_match.rs");
    include!("operations/pg_catalog/tsquery_storage.rs");
    include!("operations/pg_catalog/ts_rank_distance.rs");
    include!("operations/pg_catalog/ts_rank_support.rs");
    include!("operations/pg_catalog/ts_rank.rs");
    include!("operations/pg_catalog/ts_rank_cd.rs");
    include!("operations/pg_catalog/internal_char.rs");
    include!("operations/pg_catalog/name_core.rs");
    include!("operations/pg_catalog/oid_core.rs");
    include!("operations/pg_catalog/oid_input.rs");
    include!("operations/pg_catalog/oid_aliases.rs");
    include!("operations/pg_catalog/system_identifiers.rs");
    include!("operations/pg_catalog/xid8_input.rs");
    include!("operations/pg_catalog/snapshot_input.rs");
    include!("operations/pg_catalog/snapshot_core.rs");
    include!("operations/pg_catalog/pg_lsn_core.rs");
    include!("operations/pg_catalog/pg_lsn_input.rs");
    include!("operations/pg_catalog/tid_core.rs");
    include!("operations/pg_catalog/tid_input.rs");
    include!("operations/pg_catalog/money_words.rs");
    include!("operations/pg_catalog/money_input.rs");
    include!("operations/pg_catalog/money_numeric.rs");
    include!("operations/pg_catalog/money_text.rs");
    include!("operations/pg_catalog/box_input.rs");
    include!("operations/pg_catalog/box_operations.rs");
    include!("operations/pg_catalog/float_input.rs");
    include!("operations/pg_catalog/float_send.rs");
    include!("operations/pg_catalog/float_numeric.rs");
    include!("operations/pg_catalog/float_output.rs");
    include!("operations/pg_catalog/numeric.rs");
    include!("operations/pg_catalog/numeric_work.rs");
    include!("operations/pg_catalog/numeric_arithmetic.rs");
    include!("operations/pg_catalog/numeric_hash.rs");
    include!("operations/pg_catalog/numeric_range.rs");
    include!("operations/pg_catalog/numeric_typmod.rs");
    include!("operations/pg_catalog/numeric_division.rs");
    include!("operations/pg_catalog/numeric_common.rs");
    include!("operations/pg_catalog/numeric_size.rs");
    include!("operations/pg_catalog/numeric_bucket.rs");
    include!("operations/pg_catalog/numeric_factorial.rs");
    include!("operations/pg_catalog/numeric_sqrt.rs");
    include!("operations/pg_catalog/numeric_logarithm.rs");
    include!("operations/pg_catalog/numeric_logarithm_base.rs");
    include!("operations/pg_catalog/numeric_exponential.rs");
    include!("operations/pg_catalog/numeric_power.rs");
    include!("operations/pg_catalog/numeric_inspection.rs");
    include!("operations/pg_catalog/numeric_round.rs");
    include!("operations/pg_catalog/numeric_integer.rs");
    include!("operations/pg_catalog/address_bits.rs");
    include!("operations/pg_catalog/network.rs");
    include!("operations/pg_catalog/mac.rs");
    include!("operations/pg_catalog/mac_output.rs");
    include!("operations/pg_catalog/uuid.rs");
    include!("operations/pg_catalog/uuid_output.rs");
    include!("operations/pg_catalog/uuid_timestamp.rs");
    include!("operations/pg_catalog/network_output.rs");
    include!("operations/pg_catalog/binary.rs");
    include!("operations/pg_catalog/bytea_core.rs");
    include!("operations/pg_catalog/bytea_edit.rs");
    include!("operations/pg_catalog/bytea_concat.rs");
    include!("operations/pg_catalog/bytea_substring.rs");
    include!("operations/pg_catalog/bytea_overlay.rs");
    include!("operations/pg_catalog/bytea_position.rs");
    include!("operations/pg_catalog/bytea_trim.rs");
    include!("operations/pg_catalog/bytea_integers.rs");
    include!("operations/pg_catalog/bytea_hash.rs");
    include!("operations/pg_catalog/bytea_encoding.rs");
    include!("operations/pg_catalog/bytea_output.rs");
    include!("operations/pg_catalog/calendar_output.rs");
    include!("operations/pg_catalog/interval_output.rs");
    include!("operations/pg_catalog/bytea_utf8.rs");
    include!("operations/pg_catalog/bytea_ascii.rs");
    include!("operations/pg_catalog/bytea_sha256.rs");
    include!("operations/pg_catalog/bytea_sha512.rs");
    include!("operations/pg_catalog/bytea_md5.rs");
    include!("operations/pg_catalog/bytea_like.rs");
    include!("operations/pg_catalog/bytea_input.rs");
    include!("operations/pg_catalog/numeric_send.rs");
    include!("operations/pg_catalog/bit.rs");
    include!("operations/pg_catalog/bit_bitwise.rs");
    include!("operations/pg_catalog/bit_cast.rs");
    include!("operations/pg_catalog/bit_integer.rs");
    include!("operations/pg_catalog/bit_edit.rs");
    include!("operations/pg_catalog/bit_substring.rs");
    include!("operations/pg_catalog/bit_overlay.rs");
    include!("operations/pg_catalog/bit_position.rs");
    include!("operations/pg_catalog/bit_count.rs");
    include!("operations/pg_catalog/bit_output.rs");
    include!("operations/pg_catalog/integer.rs");
    include!("operations/pg_catalog/smallint.rs");
    include!("operations/pg_catalog/integer_cast.rs");
    include!("operations/pg_catalog/integer_support.rs");
    include!("operations/pg_catalog/integer_hash.rs");
    include!("operations/pg_catalog/integer_bitwise.rs");
    include!("operations/pg_catalog/integer_range.rs");
    include!("operations/pg_catalog/integer_format.rs");
    include!("operations/pg_catalog/integer_metadata.rs");
    include!("operations/pg_catalog/bigint.rs");
    include!("operations/pg_catalog/bigint_arithmetic.rs");
    include!("operations/pg_catalog/text.rs");
    include!("operations/pg_catalog/text_work.rs");
    include!("operations/pg_catalog/text_measure.rs");
    include!("operations/pg_catalog/text_order.rs");
    include!("operations/pg_catalog/text_trim.rs");
    include!("operations/pg_catalog/text_case.rs");
    include!("operations/pg_catalog/text_hash.rs");
    include!("operations/pg_catalog/text_index_compare.rs");
    include!("operations/pg_catalog/text_slice.rs");
    include!("operations/pg_catalog/text_padding.rs");
    include!("operations/pg_catalog/text_search.rs");
    include!("operations/pg_catalog/text_width.rs");
    include!("operations/pg_catalog/text_quote.rs");
    include!("operations/pg_catalog/text_identifier.rs");
    include!("operations/pg_catalog/text_similar.rs");
    include!("operations/pg_catalog/text_similar_legacy.rs");
    include!("operations/pg_catalog/json_populate_input.rs");
    include!("operations/pg_catalog/json_populate_array.rs");
    include!("operations/pg_catalog/bit_input.rs");
    include!("operations/pg_catalog/json_populate_state.rs");
    include!("operations/pg_catalog/text_size_bytes.rs");
    include!("operations/pg_catalog/text_like.rs");
    include!("operations/pg_catalog/text_bool.rs");
    include!("operations/pg_catalog/character.rs");
    include!("operations/pg_catalog/text_ascii.rs");
    include!("operations/pg_catalog/text_to_ascii.rs");
    include!("operations/pg_catalog/text_unistr.rs");
    include!("operations/pg_catalog/text_unicode.rs");
    include!("operations/pg_catalog/xml_lexical.rs");
    include!("operations/pg_catalog/xml_text.rs");
    include!("operations/pg_catalog/xml_value.rs");
    include!("operations/pg_catalog/xml_declaration.rs");
    include!("operations/pg_catalog/xml_dtd.rs");
    include!("operations/pg_catalog/xml_entities.rs");
    include!("operations/pg_catalog/xml_subset.rs");
    include!("operations/pg_catalog/xml_validation.rs");
    include!("operations/pg_catalog/xml_query_stream.rs");
    include!("operations/pg_catalog/xml_scalar.rs");
    include!("operations/pg_catalog/xml_dtd_render_model.rs");
    include!("operations/pg_catalog/xml_dtd_render.rs");
    include!("operations/pg_catalog/xml_tree.rs");
    include!("operations/pg_catalog/xml_query_tree.rs");
    include!("operations/pg_catalog/xml_query_uri.rs");
    include!("operations/pg_catalog/xml_query_attributes.rs");
    include!("operations/pg_catalog/xml_xpath_names.rs");
    include!("operations/pg_catalog/xml_xpath_parse_state.rs");
    include!("operations/pg_catalog/xml_xpath_parse_steps.rs");
    include!("operations/pg_catalog/xml_xpath_parse.rs");
    include!("operations/pg_catalog/xml_xpath_parse_machine.rs");
    include!("operations/pg_catalog/xml_xpath_nodes.rs");
    include!("operations/pg_catalog/xml_xpath_order.rs");
    include!("operations/pg_catalog/xml_xpath_sort.rs");
    include!("operations/pg_catalog/xml_xpath_axes.rs");
    include!("operations/pg_catalog/xml_xpath_tests.rs");
    include!("operations/pg_catalog/xml_xpath_graph.rs");
    include!("operations/pg_catalog/xml_xpath_walk.rs");
    include!("operations/pg_catalog/xml_xpath_values.rs");
    include!("operations/pg_catalog/xml_xpath_content.rs");
    include!("operations/pg_catalog/xml_xpath_number.rs");
    include!("operations/pg_catalog/xml_xpath_number_output.rs");
    include!("operations/pg_catalog/xml_xpath_convert.rs");
    include!("operations/pg_catalog/xml_xpath_compare.rs");
    include!("operations/pg_catalog/xml_xpath_optimize.rs");
    include!("operations/pg_catalog/xml_xpath_runtime.rs");
    include!("operations/pg_catalog/xml_xpath_eval_state.rs");
    include!("operations/pg_catalog/xml_xpath_math.rs");
    include!("operations/pg_catalog/xml_xpath_strings.rs");
    include!("operations/pg_catalog/xml_xpath_lang.rs");
    include!("operations/pg_catalog/xml_xpath_ids.rs");
    include!("operations/pg_catalog/xml_xpath_window.rs");
    include!("operations/pg_catalog/xml_xpath_functions.rs");
    include!("operations/pg_catalog/xml_xpath_filter.rs");
    include!("operations/pg_catalog/xml_xpath_eval.rs");
    include!("operations/pg_catalog/xml_xpath_eval_machine_state.rs");
    include!("operations/pg_catalog/xml_xpath_eval_machine.rs");
    include!("operations/pg_catalog/xml_xpath_result.rs");
    include!("operations/pg_catalog/xml_xpath_sql.rs");
    include!("operations/pg_catalog/xml_indent.rs");
    include!("operations/pg_catalog/xml_legacy_names.rs");
    include!("operations/pg_catalog/xml_construct.rs");
    include!("operations/pg_catalog/xml_element.rs");
    include!("operations/pg_catalog/xml.rs");
    include!("operations/pg_catalog/chr.rs");
    include!("operations/pg_catalog/character_text.rs");
    include!("operations/pg_catalog/regex.rs");
    include!("operations/pg_catalog/regex_flags.rs");
    include!("operations/pg_catalog/regex_boolean.rs");
    include!("operations/pg_catalog/regex_count.rs");
    include!("operations/pg_catalog/regex_instr.rs");
    include!("operations/pg_catalog/regex_substr.rs");
    include!("operations/pg_catalog/regex_substring.rs");
    include!("operations/pg_catalog/regex_replace.rs");
    include!("operations/pg_catalog/regex_arrays.rs");
    include!("operations/pg_catalog/array_identifiers.rs");
    include!("operations/pg_catalog/array_aggregate_context.rs");
    include!("operations/pg_catalog/array_integer_state.rs");
    include!("operations/pg_catalog/array_float_state.rs");
    include!("operations/pg_catalog/array_float_transition.rs");

    #[cfg(test)]
    mod binary_limit_tests {
        use super::*;

        #[test]
        fn similar_pattern_estimates_check_the_postgres_allocation_limit() {
            for bytes in [0i64, 1i64, 357913931i64, 357913932i64] {
                assert!(similar_pattern_capacity_fits(bytes));
            }
            for bytes in [357913933i64, 1073741819i64, 2147483647i64] {
                assert!(!similar_pattern_capacity_fits(bytes));
            }
            assert_eq!(
                sql_error_message(make_sql_error(SIMILAR_ALLOCATION_ERROR)).message,
                "internal error"
            );
        }

        #[test]
        fn concatenation_checks_lengths_before_adding_or_allocating() {
            for (left, right) in [
                (0, BIT_MAX_LENGTH),
                (BIT_MAX_LENGTH, 0),
                (1073741820, 1073741820),
            ] {
                assert!(bit_concat_length(left, right) == Int4Value::Value(BIT_MAX_LENGTH));
            }
            for (left, right) in [(1, BIT_MAX_LENGTH), (BIT_MAX_LENGTH, 1), (2147483647, 1)] {
                assert!(
                    bit_concat_length(left, right)
                        == Int4Value::Error(make_sql_error(BIT_PROGRAM_LIMIT_EXCEEDED))
                );
            }
            assert_eq!(
                sql_error_message(make_sql_error(BIT_PROGRAM_LIMIT_EXCEEDED)).message,
                "program limit exceeded"
            );
        }

        fn synthetic_format_output(minimum: i64, maximum: i64) -> TextFormatOutput {
            let guard = BoolValue::Value(true);
            let mut output = format_begin_output(guard);
            output.minimum = minimum;
            output.maximum = maximum;
            output.known = false;
            output
        }

        #[test]
        fn format_output_bounds_preserve_earlier_limits_and_later_errors() {
            let value = make_text_value("x");
            let size = format_exact_bounds(1i64);
            let uncertain = format_append_output(
                synthetic_format_output(1073741819i64, 1073741822i64),
                value,
                size,
                0,
                false,
            );
            assert!(uncertain.status == CheckOutcome::Unknown);
            let value = make_text_value("x");
            let failed = format_append_output(
                synthetic_format_output(1073741822i64, 1073741822i64),
                value,
                size,
                0,
                false,
            );
            assert!(failed.status == CheckOutcome::Error(make_sql_error(TEXT_CONCAT_LIMIT_ERROR)));
            assert!(
                format_finish_output(synthetic_format_output(1073741818i64, 1073741819i64))
                    == TextValue::NonNull
            );
            assert!(
                format_finish_output(synthetic_format_output(1073741819i64, 1073741820i64))
                    == TextValue::Unknown
            );
            assert!(
                format_finish_output(synthetic_format_output(1073741820i64, 1073741821i64))
                    == TextValue::Error(make_sql_error(TEXT_CONCAT_ALLOCATION_ERROR))
            );
            assert!(format_finish_output(synthetic_format_output(0i64, 0i64)) == make_text_value(""));
            let mut state = format_begin(
                make_text_value("%"),
                Int4Value::Value(0),
                BoolValue::Value(true),
            );
            state.output = synthetic_format_output(1073741820i64, 1073741821i64);
            let reached = format_next(state);
            let wrapped = make_format_input(reached);
            assert!(
                format_finish(wrapped) == TextValue::Error(make_sql_error(TEXT_FORMAT_SYNTAX_ERROR))
            );
            let mut state = format_begin(
                make_text_value("%"),
                Int4Value::Value(0),
                BoolValue::Value(true),
            );
            state.output = uncertain;
            state.status = state.output.status;
            assert!(!format_continues(&state));
            let reached = format_next(state);
            let wrapped = make_format_input(reached);
            assert!(format_finish(wrapped) == TextValue::Unknown);
            let mut state = format_begin(
                make_text_value(""),
                Int4Value::Value(1),
                BoolValue::Value(true),
            );
            state.phase = 2;
            state.conversion = 115;
            state.width = i32::MIN;
            let deferred = format_accept(state, TextValue::Unknown, 0);
            let wrapped = make_format_input(deferred);
            assert!(format_finish(wrapped) == TextValue::Unknown);
        }

        #[test]
        fn format_quoting_distinguishes_raw_and_sql_text_allocation_limits() {
            assert!(quote_literal_capacity(536870908i64, true));
            assert!(!quote_literal_capacity(536870909i64, true));
            assert!(quote_literal_capacity(536870909i64, false));
            assert!(!quote_literal_capacity(536870910i64, false));
            assert!(quote_identifier_capacity(1073741817i64, 0i64, true));
            assert!(!quote_identifier_capacity(1073741818i64, 0i64, true));
            assert!(quote_identifier_capacity(1073741820i64, 0i64, false));
            assert!(!quote_identifier_capacity(1073741821i64, 0i64, false));
            assert!(quote_identifier_capacity(1073741818i64, 2i64, false));
            assert!(!quote_identifier_capacity(1073741819i64, 2i64, false));
        }

        fn synthetic_concat_state(length: i64) -> TextConcatState {
            TextConcatState {
                status: CheckOutcome::True,
                output: String::new(),
                separator: "x".to_owned(),
                separator_known: true,
                length,
                printed: true,
                ready: false,
                pending_separator: false,
            }
        }

        #[test]
        fn text_concat_checks_buffer_and_result_limits_in_native_output_order() {
            for (length, expected) in [
                (1073741818i64, 0u32),
                (1073741819i64, TEXT_CONCAT_ALLOCATION_ERROR),
                (1073741821i64, TEXT_CONCAT_ALLOCATION_ERROR),
                (1073741822i64, TEXT_CONCAT_LIMIT_ERROR),
            ] {
                let state = synthetic_concat_state(length);
                let result = concat_before_argument(state, BoolValue::Value(false), true);
                let value = sql__pg_catalog__concat__ca4i(result);
                if expected == 0 {
                    assert!(value == TextValue::Value("x".to_owned()));
                } else {
                    assert!(value == TextValue::Error(make_sql_error(expected)));
                }
            }
            let output_error = make_sql_error(3452547);
            let expanded = concat_before_argument(
                synthetic_concat_state(1073741822i64),
                BoolValue::Value(false),
                true,
            );
            assert!(!concat_should_render(&expanded));
            assert!(
                sql__pg_catalog__concat__ca4i(expanded)
                    == TextValue::Error(make_sql_error(TEXT_CONCAT_LIMIT_ERROR))
            );
            let variadic = concat_before_argument(
                synthetic_concat_state(1073741822i64),
                BoolValue::Value(false),
                false,
            );
            assert!(concat_should_render(&variadic));
            let failed = concat_after_argument(variadic, TextValue::Error(output_error));
            assert!(sql__pg_catalog__concat_ws__dc5y(failed) == TextValue::Error(output_error));
            for (length, fails) in [(1073741807i64, false), (1073741808i64, true)] {
                let started = concat_before_argument(
                    synthetic_concat_state(length),
                    BoolValue::Value(false),
                    false,
                );
                let appended = concat_after_argument(started, TextValue::Value(String::new()));
                let result = sql__pg_catalog__concat_ws__dc5y(appended);
                if fails {
                    assert!(result == TextValue::Error(make_sql_error(TEXT_CONCAT_LIMIT_ERROR)));
                } else {
                    assert!(result == TextValue::Value("x".to_owned()));
                }
            }
            let mut unicode = synthetic_concat_state(1073741817i64);
            unicode.printed = false;
            let started = concat_before_argument(unicode, BoolValue::Value(false), true);
            let appended = concat_after_argument(started, TextValue::Value("雪".to_owned()));
            assert_eq!(appended.length, 1073741820i64);
            assert!(
                sql__pg_catalog__concat__ca4i(appended)
                    == TextValue::Error(make_sql_error(TEXT_CONCAT_ALLOCATION_ERROR))
            );
        }

        #[test]
        fn bytea_concatenation_preserves_the_allocation_error() {
            for (left, right) in [(0, BYTEA_MAX_LENGTH), (BYTEA_MAX_LENGTH, 0), (100, 200)] {
                assert!(bytea_concat_length(left, right) == Int4Value::Value(left + right));
            }
            for (left, right) in [
                (1, BYTEA_MAX_LENGTH),
                (BYTEA_MAX_LENGTH, 1),
                (BYTEA_MAX_LENGTH, BYTEA_MAX_LENGTH),
                (2147483647, 1),
            ] {
                assert!(
                    bytea_concat_length(left, right)
                        == Int4Value::Error(make_sql_error(BYTEA_ALLOCATION_ERROR))
                );
            }
            assert_eq!(
                sql_error_message(make_sql_error(BYTEA_ALLOCATION_ERROR)).message,
                "internal error"
            );
        }

        #[test]
        fn bytea_codecs_check_estimates_at_the_allocation_boundary() {
            assert!(bytea_codec_length_fits(1073741819i64));
            assert!(!bytea_codec_length_fits(1073741820i64));
            assert_eq!(bytea_base64_encoded_length(57i64), 77i64);
            assert_eq!(bytea_base64_encoded_length(794847840i64), 1073741818i64);
            assert_eq!(bytea_base64_encoded_length(794847841i64), 1073741822i64);
            assert_eq!(bytea_codec_utf8_length("aé😀"), 7i64);
            assert_eq!(bytea_escape_encoded_length("005c80ff41"), 15i64);
            assert!(bytea_escape_decoded_length(r"\000\377é😀\\a") == Int8Value::Value(10i64));
            assert!(
                bytea_escape_decoded_length(r"\400")
                    == Int8Value::Error(make_sql_error(BYTEA_SYNTAX_ERROR))
            );
        }
    }
}
