const BYTEA_ARRAY_SUBSCRIPT_ERROR: u32 = 3452630;

fn bytea_payload_length(input: &str) -> i32 {
    let chars: Vec<char> = input.chars().collect();
    let mut index: usize = 0;
    let mut length: i32 = 0;
    while index < chars.len() {
        index = index + 2;
        length = length + 1;
    }
    length
}

fn bytea_read_byte(input: &str, position: i32) -> i32 {
    let chars: Vec<char> = input.chars().collect();
    let mut index: usize = 0;
    let mut current: i32 = 0;
    while current < position {
        index = index + 2;
        current = current + 1;
    }
    let high = hex_digit(chars[index]);
    let low = hex_digit(chars[index + 1]);
    high * 16 + low
}

fn bytea_patch_byte(input: &str, position: i32, replacement: i32) -> String {
    let chars: Vec<char> = input.chars().collect();
    let mut index: usize = 0;
    let mut current: i32 = 0;
    let mut output = String::new();
    while index < chars.len() {
        if current == position {
            output = bytea_append_byte(output, replacement);
        } else {
            output.push(chars[index]);
            output.push(chars[index + 1]);
        }
        index = index + 2;
        current = current + 1;
    }
    output
}

fn bytea_bit_mask(position: i32) -> i32 {
    let mut remaining = position;
    let mut mask: i32 = 1;
    while remaining > 0 {
        mask = mask * 2;
        remaining = remaining - 1;
    }
    mask
}

pub fn sql__pg_catalog__get_byte__48am(input: ByteaValue, position: Int4Value) -> Int4Value {
    if let ByteaValue::Error(error) = input {
        return Int4Value::Error(error);
    }
    if let Int4Value::Error(error) = position {
        return Int4Value::Error(error);
    }
    if input == ByteaValue::Unknown || position == Int4Value::Unknown {
        return Int4Value::Unknown;
    }
    if input == ByteaValue::Null || position == Int4Value::Null {
        return Int4Value::Null;
    }
    if let ByteaValue::Value(value) = input {
        if let Int4Value::Value(offset) = position {
            let length = bytea_payload_length(value.as_str());
            if offset < 0 || offset >= length {
                return Int4Value::Error(make_sql_error(BYTEA_ARRAY_SUBSCRIPT_ERROR));
            }
            let byte = bytea_read_byte(value.as_str(), offset);
            return Int4Value::Value(byte);
        }
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__get_bit__thv7(input: ByteaValue, position: Int8Value) -> Int4Value {
    if let ByteaValue::Error(error) = input {
        return Int4Value::Error(error);
    }
    if let Int8Value::Error(error) = position {
        return Int4Value::Error(error);
    }
    if input == ByteaValue::Unknown || position == Int8Value::Unknown {
        return Int4Value::Unknown;
    }
    if input == ByteaValue::Null || position == Int8Value::Null {
        return Int4Value::Null;
    }
    if let ByteaValue::Value(value) = input {
        if let Int8Value::Value(offset) = position {
            let length = bytea_payload_length(value.as_str());
            let wide_length = length as i64;
            let bit_length = wide_length * 8i64;
            if offset < 0i64 || offset >= bit_length {
                return Int4Value::Error(make_sql_error(BYTEA_ARRAY_SUBSCRIPT_ERROR));
            }
            let wide_byte = offset / 8i64;
            let byte_position = wide_byte as i32;
            let wide_bit = offset % 8i64;
            let bit_position = wide_bit as i32;
            let byte = bytea_read_byte(value.as_str(), byte_position);
            let mask = bytea_bit_mask(bit_position);
            return Int4Value::Value((byte / mask) % 2);
        }
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__set_byte__8mtw(
    input: ByteaValue,
    position: Int4Value,
    replacement: Int4Value,
) -> ByteaValue {
    if let ByteaValue::Error(error) = input {
        return ByteaValue::Error(error);
    }
    if let Int4Value::Error(error) = position {
        return ByteaValue::Error(error);
    }
    if let Int4Value::Error(error) = replacement {
        return ByteaValue::Error(error);
    }
    if input == ByteaValue::Unknown
        || position == Int4Value::Unknown
        || replacement == Int4Value::Unknown
    {
        return ByteaValue::Unknown;
    }
    if input == ByteaValue::Null || position == Int4Value::Null || replacement == Int4Value::Null {
        return ByteaValue::Null;
    }
    if let ByteaValue::Value(value) = input {
        if let Int4Value::Value(offset) = position {
            if let Int4Value::Value(new_value) = replacement {
                let length = bytea_payload_length(value.as_str());
                if offset < 0 || offset >= length {
                    return ByteaValue::Error(make_sql_error(BYTEA_ARRAY_SUBSCRIPT_ERROR));
                }
                let mut new_byte = new_value % 256;
                if new_byte < 0 {
                    new_byte = new_byte + 256;
                }
                let output = bytea_patch_byte(value.as_str(), offset, new_byte);
                return ByteaValue::Value(output);
            }
        }
    }
    ByteaValue::Unknown
}

pub fn sql__pg_catalog__set_bit__06f4(
    input: ByteaValue,
    position: Int8Value,
    replacement: Int4Value,
) -> ByteaValue {
    if let ByteaValue::Error(error) = input {
        return ByteaValue::Error(error);
    }
    if let Int8Value::Error(error) = position {
        return ByteaValue::Error(error);
    }
    if let Int4Value::Error(error) = replacement {
        return ByteaValue::Error(error);
    }
    if input == ByteaValue::Unknown
        || position == Int8Value::Unknown
        || replacement == Int4Value::Unknown
    {
        return ByteaValue::Unknown;
    }
    if input == ByteaValue::Null || position == Int8Value::Null || replacement == Int4Value::Null {
        return ByteaValue::Null;
    }
    if let ByteaValue::Value(value) = input {
        if let Int8Value::Value(offset) = position {
            if let Int4Value::Value(new_value) = replacement {
                let length = bytea_payload_length(value.as_str());
                let wide_length = length as i64;
                let bit_length = wide_length * 8i64;
                if offset < 0i64 || offset >= bit_length {
                    return ByteaValue::Error(make_sql_error(BYTEA_ARRAY_SUBSCRIPT_ERROR));
                }
                if new_value != 0 && new_value != 1 {
                    return ByteaValue::Error(make_sql_error(SQLSTATE_INVALID_PARAMETER_VALUE));
                }
                let wide_byte = offset / 8i64;
                let byte_position = wide_byte as i32;
                let wide_bit = offset % 8i64;
                let bit_position = wide_bit as i32;
                let byte = bytea_read_byte(value.as_str(), byte_position);
                let mask = bytea_bit_mask(bit_position);
                let old_bit = (byte / mask) % 2;
                let difference = (new_value - old_bit) * mask;
                let new_byte = byte + difference;
                let output = bytea_patch_byte(value.as_str(), byte_position, new_byte);
                return ByteaValue::Value(output);
            }
        }
    }
    ByteaValue::Unknown
}
