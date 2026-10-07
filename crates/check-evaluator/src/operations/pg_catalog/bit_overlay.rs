fn bit_overlay(
    input: BitValue,
    replacement: BitValue,
    position: Int4Value,
    length: Int4Value,
    has_length: bool,
) -> BitValue {
    if let BitValue::Error(error) = input {
        return BitValue::Error(error);
    }
    if let BitValue::Error(error) = replacement {
        return BitValue::Error(error);
    }
    if let Int4Value::Error(error) = position {
        return BitValue::Error(error);
    }
    if let Int4Value::Error(error) = length {
        return BitValue::Error(error);
    }
    if input == BitValue::Unknown
        || replacement == BitValue::Unknown
        || position == Int4Value::Unknown
        || length == Int4Value::Unknown
    {
        return BitValue::Unknown;
    }
    if input == BitValue::Null
        || replacement == BitValue::Null
        || position == Int4Value::Null
        || length == Int4Value::Null
    {
        return BitValue::Null;
    }
    if let BitValue::Value(bits) = replacement {
        if let Int4Value::Value(start) = position {
            if let Int4Value::Value(supplied) = length {
                if start <= 0 {
                    return BitValue::Error(make_sql_error(BIT_SUBSTRING_ERROR));
                }
                let mut count = supplied;
                if has_length == false {
                    count = bit_payload_length(bits.as_str());
                }
                if count > 0 && start > 2147483647 - count {
                    return BitValue::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
                }
                let end = start + count;
                let prefix = bit_substring(
                    input.clone(),
                    Int4Value::Value(1),
                    Int4Value::Value(start - 1),
                    true,
                );
                let suffix =
                    bit_substring(input, Int4Value::Value(end), Int4Value::Value(0), false);
                let combined = sql__pg_catalog__bitcat__t5mn(prefix, BitValue::Value(bits));
                return sql__pg_catalog__bitcat__t5mn(combined, suffix);
            }
        }
    }
    BitValue::Unknown
}

pub fn sql__pg_catalog__overlay__dac4(
    input: BitValue,
    replacement: BitValue,
    position: Int4Value,
) -> BitValue {
    bit_overlay(input, replacement, position, Int4Value::Value(0), false)
}

pub fn sql__pg_catalog__overlay__moi0(
    input: BitValue,
    replacement: BitValue,
    position: Int4Value,
    length: Int4Value,
) -> BitValue {
    bit_overlay(input, replacement, position, length, true)
}
