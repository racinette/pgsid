fn text_hash_value(input: TextValue, trim_spaces: bool) -> Int4Value {
    if let TextValue::Error(error) = input {
        return Int4Value::Error(error);
    }
    if input == TextValue::Unknown {
        return Int4Value::Unknown;
    }
    if input == TextValue::Null {
        return Int4Value::Null;
    }
    if let TextValue::Value(value) = input {
        let hex = text_binary_hex(value.as_str(), trim_spaces);
        let bytes = bytea_hash_bytes(hex.as_str());
        return Int4Value::Value(hash_bytes32(bytes));
    }
    Int4Value::Unknown
}

fn text_hash_extended(input: TextValue, seed: Int8Value, trim_spaces: bool) -> Int8Value {
    if let TextValue::Error(error) = input {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = seed {
        return Int8Value::Error(error);
    }
    if input == TextValue::Unknown || seed == Int8Value::Unknown {
        return Int8Value::Unknown;
    }
    if input == TextValue::Null || seed == Int8Value::Null {
        return Int8Value::Null;
    }
    if let TextValue::Value(value) = input {
        if let Int8Value::Value(salt) = seed {
            let hex = text_binary_hex(value.as_str(), trim_spaces);
            let bytes = bytea_hash_bytes(hex.as_str());
            return Int8Value::Value(hash_bytes64(bytes, salt));
        }
    }
    Int8Value::Unknown
}

pub fn sql__pg_catalog__hashtext__cnj7(input: TextValue) -> Int4Value {
    text_hash_value(input, false)
}

pub fn sql__pg_catalog__hashbpchar__eeeo(input: TextValue) -> Int4Value {
    text_hash_value(input, true)
}

pub fn sql__pg_catalog__hashtextextended__dns6(input: TextValue, seed: Int8Value) -> Int8Value {
    text_hash_extended(input, seed, false)
}

pub fn sql__pg_catalog__hashbpcharextended__ca1t(input: TextValue, seed: Int8Value) -> Int8Value {
    text_hash_extended(input, seed, true)
}
