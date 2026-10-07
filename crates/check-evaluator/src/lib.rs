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
    include!("operations/pg_catalog/bit.rs");
    include!("operations/pg_catalog/bit_bitwise.rs");
    include!("operations/pg_catalog/bit_cast.rs");
    include!("operations/pg_catalog/bit_integer.rs");
    include!("operations/pg_catalog/bit_edit.rs");
    include!("operations/pg_catalog/bit_substring.rs");
    include!("operations/pg_catalog/bit_overlay.rs");
    include!("operations/pg_catalog/bit_position.rs");
    include!("operations/pg_catalog/integer.rs");
    include!("operations/pg_catalog/smallint.rs");
    include!("operations/pg_catalog/integer_cast.rs");
    include!("operations/pg_catalog/bigint.rs");
    include!("operations/pg_catalog/bigint_arithmetic.rs");
    include!("operations/pg_catalog/text.rs");
    include!("operations/pg_catalog/character.rs");
    include!("operations/pg_catalog/regex.rs");

    #[cfg(test)]
    mod bit_limit_tests {
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
    }
}
