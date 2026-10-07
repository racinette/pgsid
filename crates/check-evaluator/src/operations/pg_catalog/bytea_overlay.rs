fn bytea_overlay(
    input: ByteaValue,
    replacement: ByteaValue,
    position: Int4Value,
    length: Int4Value,
    has_length: bool,
) -> ByteaValue {
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
    if input == ByteaValue::Unknown
        || replacement == ByteaValue::Unknown
        || position == Int4Value::Unknown
        || length == Int4Value::Unknown
    {
        return ByteaValue::Unknown;
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
    ByteaValue::Unknown
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
