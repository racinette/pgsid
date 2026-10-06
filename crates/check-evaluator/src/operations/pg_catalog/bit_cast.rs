const BIT_STRING_RIGHT_TRUNCATION: u32 = 3452545;

fn bit_coerce(input: BitValue, width: Int4Value, explicit: BoolValue, varying: bool) -> BitValue {
    if let BitValue::Error(error) = input {
        return BitValue::Error(error);
    }
    if let Int4Value::Error(error) = width {
        return BitValue::Error(error);
    }
    if let BoolValue::Error(error) = explicit {
        return BitValue::Error(error);
    }
    if input == BitValue::Unknown || width == Int4Value::Unknown || explicit == BoolValue::Unknown {
        return BitValue::Unknown;
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
    BitValue::Unknown
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
