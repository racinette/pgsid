const BIT_STRING_RIGHT_TRUNCATION: u32 = 3452545;

fn bit_coerce(input: BitValue, width: Int4Value, explicit: BoolValue, varying: bool) -> BitValue {
    let mut unresolved_flavor: i32 = 0;
    if let BitValue::Unknown = input { unresolved_flavor = 1; };
    if let Int4Value::Unknown = width { unresolved_flavor = 1; };
    if let BoolValue::Unknown = explicit { unresolved_flavor = 1; };
    if let BitValue::Unimplemented = input { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = width { unresolved_flavor = 2; };
    if let BoolValue::Unimplemented = explicit { unresolved_flavor = 2; };
    if let BitValue::Error(error) = input {
        return BitValue::Error(error);
    }
    if let Int4Value::Error(error) = width {
        return BitValue::Error(error);
    }
    if let BoolValue::Error(error) = explicit {
        return BitValue::Error(error);
    }
    let mut condition_flavor_20_4: i32 = unresolved_flavor; if let BitValue::Unknown = input { if condition_flavor_20_4 < 1 { condition_flavor_20_4 = 1; }; }; if let BitValue::Unimplemented = input { condition_flavor_20_4 = 2; }; if let Int4Value::Unknown = width { if condition_flavor_20_4 < 1 { condition_flavor_20_4 = 1; }; }; if let Int4Value::Unimplemented = width { condition_flavor_20_4 = 2; }; if let BoolValue::Unknown = explicit { if condition_flavor_20_4 < 1 { condition_flavor_20_4 = 1; }; }; if let BoolValue::Unimplemented = explicit { condition_flavor_20_4 = 2; }; if (input == BitValue::Unknown || input == BitValue::Unimplemented) || (width == Int4Value::Unknown || width == Int4Value::Unimplemented) || (explicit == BoolValue::Unknown || explicit == BoolValue::Unimplemented) {
        return bit_unresolved(condition_flavor_20_4);
    }
    if input == BitValue::Null || width == Int4Value::Null || explicit == BoolValue::Null {
        return BitValue::Null;
    }
    if let BitValue::Value(value) = input {
        if let Int4Value::Value(length) = width {
            if let BoolValue::Value(is_explicit) = explicit {
                let current = bit_payload_length(value.as_str());
                if length <= 0 || length > BIT_MAX_LENGTH || length == current {
                    return BitValue::Value(value);
                }
                if varying && length > current {
                    return BitValue::Value(value);
                }
                if is_explicit == false {
                    if varying {
                        return BitValue::Error(make_sql_error(BIT_STRING_RIGHT_TRUNCATION));
                    }
                    return BitValue::Error(make_sql_error(BIT_STRING_LENGTH_MISMATCH));
                }
                let chars: Vec<char> = value.chars().collect();
                let mut output = String::new();
                let mut index: usize = 0;
                let mut count: i32 = 0;
                while count < length {
                    let mut ch = '0';
                    if index < chars.len() {
                        ch = chars[index];
                    }
                    output.push(ch);
                    index += 1;
                    count = count + 1;
                }
                return BitValue::Value(output);
            }
        }
    }
    bit_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__bit__eqck(
    input: BitValue,
    width: Int4Value,
    explicit: BoolValue,
) -> BitValue {
    bit_coerce(input, width, explicit, false)
}

pub fn sql__pg_catalog__varbit__7ap7(
    input: BitValue,
    width: Int4Value,
    explicit: BoolValue,
) -> BitValue {
    bit_coerce(input, width, explicit, true)
}
