fn bit_overlay(
    input: BitValue,
    replacement: BitValue,
    position: Int4Value,
    length: Int4Value,
    has_length: bool,
) -> BitValue {
    let mut unresolved_flavor: i32 = 0;
    if let BitValue::Unknown = input { unresolved_flavor = 1; };
    if let BitValue::Unknown = replacement { unresolved_flavor = 1; };
    if let Int4Value::Unknown = position { unresolved_flavor = 1; };
    if let Int4Value::Unknown = length { unresolved_flavor = 1; };
    if let BitValue::Unimplemented = input { unresolved_flavor = 2; };
    if let BitValue::Unimplemented = replacement { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = position { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = length { unresolved_flavor = 2; };
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
    let mut condition_flavor_29_4: i32 = unresolved_flavor; if let BitValue::Unknown = input { if condition_flavor_29_4 < 1 { condition_flavor_29_4 = 1; }; }; if let BitValue::Unimplemented = input { condition_flavor_29_4 = 2; }; if let BitValue::Unknown = replacement { if condition_flavor_29_4 < 1 { condition_flavor_29_4 = 1; }; }; if let BitValue::Unimplemented = replacement { condition_flavor_29_4 = 2; }; if let Int4Value::Unknown = position { if condition_flavor_29_4 < 1 { condition_flavor_29_4 = 1; }; }; if let Int4Value::Unimplemented = position { condition_flavor_29_4 = 2; }; if let Int4Value::Unknown = length { if condition_flavor_29_4 < 1 { condition_flavor_29_4 = 1; }; }; if let Int4Value::Unimplemented = length { condition_flavor_29_4 = 2; }; if (input == BitValue::Unknown || input == BitValue::Unimplemented)
        || (replacement == BitValue::Unknown || replacement == BitValue::Unimplemented)
        || (position == Int4Value::Unknown || position == Int4Value::Unimplemented)
        || (length == Int4Value::Unknown || length == Int4Value::Unimplemented)
    {
        return bit_unresolved(condition_flavor_29_4);
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
    bit_unresolved(unresolved_flavor)
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
