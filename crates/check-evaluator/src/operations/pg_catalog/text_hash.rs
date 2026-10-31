fn text_hash_value(input: TextValue, trim_spaces: bool, byte_order: i32, utf8: bool) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::NonNull = input { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TextValue::Error(error) = input {
        return Int4Value::Error(error);
    }
    let mut condition_flavor_8_4: i32 = unresolved_flavor; if let TextValue::Unknown = input { if condition_flavor_8_4 < 1 { condition_flavor_8_4 = 1; }; }; if let TextValue::Unimplemented = input { condition_flavor_8_4 = 2; }; if ((input == TextValue::Unknown || input == TextValue::Unimplemented) || input == TextValue::NonNull) {
        return int4_unresolved(condition_flavor_8_4);
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
                    return int4_unresolved(resolution_context(unresolved_flavor));
                };
                index += 1;
            }
        };
        let hex = text_binary_hex(value.as_str(), trim_spaces);
        let bytes = bytea_hash_bytes(hex.as_str());
        return hash_native32(bytes, byte_order, 1);
    }
    int4_unresolved(unresolved_flavor)
}

fn text_hash_extended(
    input: TextValue,
    seed: Int8Value,
    trim_spaces: bool,
    byte_order: i32,
    utf8: bool,
) -> Int8Value {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::NonNull = input { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let Int8Value::Unknown = seed { unresolved_flavor = 1; };
    if let TextValue::Unimplemented = input { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = seed { unresolved_flavor = 2; };
    if let TextValue::Error(error) = input {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = seed {
        return Int8Value::Error(error);
    }
    let mut condition_flavor_50_4: i32 = unresolved_flavor; if let TextValue::Unknown = input { if condition_flavor_50_4 < 1 { condition_flavor_50_4 = 1; }; }; if let TextValue::Unimplemented = input { condition_flavor_50_4 = 2; }; if let Int8Value::Unknown = seed { if condition_flavor_50_4 < 1 { condition_flavor_50_4 = 1; }; }; if let Int8Value::Unimplemented = seed { condition_flavor_50_4 = 2; }; if ((input == TextValue::Unknown || input == TextValue::Unimplemented) || input == TextValue::NonNull) || (seed == Int8Value::Unknown || seed == Int8Value::Unimplemented) {
        return int8_unresolved(condition_flavor_50_4);
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
                        return int8_unresolved(resolution_context(unresolved_flavor));
                    };
                    index += 1;
                }
            };
            let hex = text_binary_hex(value.as_str(), trim_spaces);
            let bytes = bytea_hash_bytes(hex.as_str());
            return hash_native64(bytes, salt, byte_order, 1);
        }
    }
    int8_unresolved(unresolved_flavor)
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
