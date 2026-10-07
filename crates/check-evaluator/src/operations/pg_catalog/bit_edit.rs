const BIT_ARRAY_SUBSCRIPT_ERROR: u32 = 3452630;
const BIT_PROGRAM_LIMIT_EXCEEDED: u32 = 8584704;

fn bit_concat_length(left: i32, right: i32) -> Int4Value {
    if left > BIT_MAX_LENGTH - right {
        return Int4Value::Error(make_sql_error(BIT_PROGRAM_LIMIT_EXCEEDED));
    }
    Int4Value::Value(left + right)
}

pub fn sql__pg_catalog__bitcat__t5mn(left: BitValue, right: BitValue) -> BitValue {
    if let BitValue::Error(error) = left {
        return BitValue::Error(error);
    }
    if let BitValue::Error(error) = right {
        return BitValue::Error(error);
    }
    if left == BitValue::Unknown || right == BitValue::Unknown {
        return BitValue::Unknown;
    }
    if left == BitValue::Null || right == BitValue::Null {
        return BitValue::Null;
    }
    if let BitValue::Value(a) = left {
        if let BitValue::Value(b) = right {
            let first = bit_payload_length(a.as_str());
            let second = bit_payload_length(b.as_str());
            let length = bit_concat_length(first, second);
            if let Int4Value::Error(error) = length {
                return BitValue::Error(error);
            }
            let mut output = a;
            output.push_str(b.as_str());
            return BitValue::Value(output);
        }
    }
    BitValue::Unknown
}

pub fn sql__pg_catalog__get_bit__ygqy(input: BitValue, position: Int4Value) -> Int4Value {
    if let BitValue::Error(error) = input {
        return Int4Value::Error(error);
    }
    if let Int4Value::Error(error) = position {
        return Int4Value::Error(error);
    }
    if input == BitValue::Unknown || position == Int4Value::Unknown {
        return Int4Value::Unknown;
    }
    if input == BitValue::Null || position == Int4Value::Null {
        return Int4Value::Null;
    }
    if let BitValue::Value(value) = input {
        if let Int4Value::Value(offset) = position {
            if offset < 0 {
                return Int4Value::Error(make_sql_error(BIT_ARRAY_SUBSCRIPT_ERROR));
            }
            let chars: Vec<char> = value.chars().collect();
            let mut index: usize = 0;
            let mut current: i32 = 0;
            while index < chars.len() {
                if current == offset {
                    if chars[index] == '1' {
                        return Int4Value::Value(1);
                    }
                    return Int4Value::Value(0);
                }
                index += 1;
                current = current + 1;
            }
            return Int4Value::Error(make_sql_error(BIT_ARRAY_SUBSCRIPT_ERROR));
        }
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__set_bit__2mfa(
    input: BitValue,
    position: Int4Value,
    replacement: Int4Value,
) -> BitValue {
    if let BitValue::Error(error) = input {
        return BitValue::Error(error);
    }
    if let Int4Value::Error(error) = position {
        return BitValue::Error(error);
    }
    if let Int4Value::Error(error) = replacement {
        return BitValue::Error(error);
    }
    if input == BitValue::Unknown
        || position == Int4Value::Unknown
        || replacement == Int4Value::Unknown
    {
        return BitValue::Unknown;
    }
    if input == BitValue::Null || position == Int4Value::Null || replacement == Int4Value::Null {
        return BitValue::Null;
    }
    if let BitValue::Value(value) = input {
        if let Int4Value::Value(offset) = position {
            if let Int4Value::Value(bit) = replacement {
                let length = bit_payload_length(value.as_str());
                if offset < 0 || offset >= length {
                    return BitValue::Error(make_sql_error(BIT_ARRAY_SUBSCRIPT_ERROR));
                }
                if bit != 0 && bit != 1 {
                    return BitValue::Error(make_sql_error(SQLSTATE_INVALID_PARAMETER_VALUE));
                }
                let chars: Vec<char> = value.chars().collect();
                let mut output = String::new();
                let mut index: usize = 0;
                let mut current: i32 = 0;
                while index < chars.len() {
                    let mut ch = chars[index];
                    if current == offset {
                        ch = '0';
                        if bit == 1 {
                            ch = '1';
                        }
                    }
                    output.push(ch);
                    index += 1;
                    current = current + 1;
                }
                return BitValue::Value(output);
            }
        }
    }
    BitValue::Unknown
}
