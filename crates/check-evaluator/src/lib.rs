pub use pgsid_regex_engine::*;

pub mod checkruntime {
    include!("values.rs");
    include!("numeric.rs");
    include!("network.rs");
    include!("mac.rs");
    include!("uuid.rs");
    include!("bit.rs");
    include!("hash.rs");
    include!("text_builder.rs");
    include!("date.rs");
    include!("timestamp.rs");
    include!("timestamptz.rs");
    include!("logic.rs");
}

pub use checkruntime::*;

pub mod pg_catalog {
    use super::*;

    include!("operations/pg_catalog/boolean.rs");
    include!("operations/pg_catalog/enumeration.rs");
    include!("operations/pg_catalog/date.rs");
    include!("operations/pg_catalog/timestamptz.rs");
    include!("operations/pg_catalog/timestamp.rs");
    include!("operations/pg_catalog/timezone.rs");
    include!("operations/pg_catalog/timezone_named.rs");
    include!("operations/pg_catalog/timezone_recurring.rs");
    include!(concat!(env!("OUT_DIR"), "/timezone-tables.rs"));
    include!("operations/pg_catalog/numeric.rs");
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
    include!("operations/pg_catalog/character.rs");
    include!("operations/pg_catalog/text_ascii.rs");
    include!("operations/pg_catalog/character_text.rs");
    include!("operations/pg_catalog/regex.rs");

    #[cfg(test)]
    mod binary_limit_tests {
        use super::*;

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
