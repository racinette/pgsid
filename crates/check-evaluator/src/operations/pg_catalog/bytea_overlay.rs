fn bytea_overlay(
    input: ByteaValue,
    replacement: ByteaValue,
    position: Int4Value,
    length: Int4Value,
    has_length: bool,
) -> ByteaValue {
    let mut unresolved_flavor: i32 = 0;
    if let ByteaValue::Unknown = input { unresolved_flavor = 1; };
    if let ByteaValue::Unspecified(_width) = input { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let ByteaValue::Unknown = replacement { unresolved_flavor = 1; };
    if let ByteaValue::Unspecified(_width) = replacement { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let Int4Value::Unknown = position { unresolved_flavor = 1; };
    if let Int4Value::Unknown = length { unresolved_flavor = 1; };
    if let ByteaValue::Unimplemented = input { unresolved_flavor = 2; };
    if let ByteaValue::Unimplemented = replacement { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = position { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = length { unresolved_flavor = 2; };
    if let ByteaValue::Error(error) = input {
        return ByteaValue::Error(error);
    }
    if let ByteaValue::Error(error) = replacement {
        return ByteaValue::Error(error);
    }
    if let Int4Value::Error(error) = position {
        return ByteaValue::Error(error);
    }
    if let Int4Value::Error(error) = length {
        return ByteaValue::Error(error);
    }
    let mut condition_flavor_29_4: i32 = unresolved_flavor; if let ByteaValue::Unknown = input { if condition_flavor_29_4 < 1 { condition_flavor_29_4 = 1; }; }; if let ByteaValue::Unimplemented = input { condition_flavor_29_4 = 2; }; if let ByteaValue::Unknown = replacement { if condition_flavor_29_4 < 1 { condition_flavor_29_4 = 1; }; }; if let ByteaValue::Unimplemented = replacement { condition_flavor_29_4 = 2; }; if let Int4Value::Unknown = position { if condition_flavor_29_4 < 1 { condition_flavor_29_4 = 1; }; }; if let Int4Value::Unimplemented = position { condition_flavor_29_4 = 2; }; if let Int4Value::Unknown = length { if condition_flavor_29_4 < 1 { condition_flavor_29_4 = 1; }; }; if let Int4Value::Unimplemented = length { condition_flavor_29_4 = 2; }; if (input == ByteaValue::Unknown || input == ByteaValue::Unimplemented)
        || (replacement == ByteaValue::Unknown || replacement == ByteaValue::Unimplemented)
        || (position == Int4Value::Unknown || position == Int4Value::Unimplemented)
        || (length == Int4Value::Unknown || length == Int4Value::Unimplemented)
    {
        return bytea_unresolved(condition_flavor_29_4);
    }
    if input == ByteaValue::Null
        || replacement == ByteaValue::Null
        || position == Int4Value::Null
        || length == Int4Value::Null
    {
        return ByteaValue::Null;
    }
    if let ByteaValue::Value(bytes) = replacement {
        if let Int4Value::Value(start) = position {
            if let Int4Value::Value(supplied) = length {
                if start <= 0 {
                    return ByteaValue::Error(make_sql_error(BYTEA_SUBSTRING_ERROR));
                }
                let mut count = supplied;
                if has_length == false {
                    count = bytea_payload_length(bytes.as_str());
                }
                if count > 0 && start > 2147483647 - count {
                    return ByteaValue::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
                }
                let end = start + count;
                let prefix = bytea_substring(
                    input.clone(),
                    Int4Value::Value(1),
                    Int4Value::Value(start - 1),
                    true,
                );
                let suffix =
                    bytea_substring(input, Int4Value::Value(end), Int4Value::Value(0), false);
                let combined = sql__pg_catalog__byteacat__zitv(prefix, ByteaValue::Value(bytes));
                return sql__pg_catalog__byteacat__zitv(combined, suffix);
            }
        }
    }
    bytea_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__overlay__9neg(
    input: ByteaValue,
    replacement: ByteaValue,
    position: Int4Value,
) -> ByteaValue {
    bytea_overlay(input, replacement, position, Int4Value::Value(0), false)
}

pub fn sql__pg_catalog__overlay__72ov(
    input: ByteaValue,
    replacement: ByteaValue,
    position: Int4Value,
    length: Int4Value,
) -> ByteaValue {
    bytea_overlay(input, replacement, position, length, true)
}
