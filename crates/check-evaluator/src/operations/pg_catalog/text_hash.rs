fn text_hash_value(input: TextValue, trim_spaces: bool, byte_order: i32, utf8: bool) -> Int4Value {
    if let TextValue::Error(error) = input {
        return Int4Value::Error(error);
    }
    if (input == TextValue::Unknown || input == TextValue::NonNull) {
        return Int4Value::Unknown;
    }
    if input == TextValue::Null {
        return Int4Value::Null;
    }
    if let TextValue::Value(value) = input {
        if utf8 == false {
            let chars: Vec<char> = value.chars().collect();
            let mut index: usize = 0;
            while index < chars.len() {
                if chars[index] as i32 > 127 {
                    return Int4Value::Unknown;
                };
                index += 1;
            }
        };
        let hex = text_binary_hex(value.as_str(), trim_spaces);
        let bytes = bytea_hash_bytes(hex.as_str());
        return hash_native32(bytes, byte_order, 1);
    }
    Int4Value::Unknown
}

fn text_hash_extended(
    input: TextValue,
    seed: Int8Value,
    trim_spaces: bool,
    byte_order: i32,
    utf8: bool,
) -> Int8Value {
    if let TextValue::Error(error) = input {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = seed {
        return Int8Value::Error(error);
    }
    if (input == TextValue::Unknown || input == TextValue::NonNull) || seed == Int8Value::Unknown {
        return Int8Value::Unknown;
    }
    if input == TextValue::Null || seed == Int8Value::Null {
        return Int8Value::Null;
    }
    if let TextValue::Value(value) = input {
        if let Int8Value::Value(salt) = seed {
            if utf8 == false {
                let chars: Vec<char> = value.chars().collect();
                let mut index: usize = 0;
                while index < chars.len() {
                    if chars[index] as i32 > 127 {
                        return Int8Value::Unknown;
                    };
                    index += 1;
                }
            };
            let hex = text_binary_hex(value.as_str(), trim_spaces);
            let bytes = bytea_hash_bytes(hex.as_str());
            return hash_native64(bytes, salt, byte_order, 1);
        }
    }
    Int8Value::Unknown
}

pub fn sql__pg_catalog__hashtext__cnj7(input: TextValue, byte_order: i32, utf8: bool) -> Int4Value {
    text_hash_value(input, false, byte_order, utf8)
}

pub fn sql__pg_catalog__hashbpchar__eeeo(
    input: TextValue,
    byte_order: i32,
    utf8: bool,
) -> Int4Value {
    text_hash_value(input, true, byte_order, utf8)
}

pub fn sql__pg_catalog__hashtextextended__dns6(
    input: TextValue,
    seed: Int8Value,
    byte_order: i32,
    utf8: bool,
) -> Int8Value {
    text_hash_extended(input, seed, false, byte_order, utf8)
}

pub fn sql__pg_catalog__hashbpcharextended__ca1t(
    input: TextValue,
    seed: Int8Value,
    byte_order: i32,
    utf8: bool,
) -> Int8Value {
    text_hash_extended(input, seed, true, byte_order, utf8)
}
