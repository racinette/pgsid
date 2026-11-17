// The stored NBASE digits as hash input, each in native two-byte little-endian order.
fn numeric_hash_digits(value: &NumericVar) -> Vec<HashByte> {
    let mut bytes: Vec<HashByte> = Vec::new();
    let mut index: usize = 0;
    while index < value.digits.len() {
        let group = value.digits[index] as i32;
        let low = group % 256;
        let high = group / 256;
        bytes.push(HashByte { value: low as i64 });
        bytes.push(HashByte { value: high as i64 });
        index += 1;
    }
    bytes
}

pub fn sql__pg_catalog__hash_numeric__0e7w(input: NumericValue, byte_order: i32) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
    if let NumericValue::Error(error) = input {
        return Int4Value::Error(error);
    }
    let mut numeric_unknown_input_1 = false; if let NumericValue::Unknown = input { numeric_unknown_input_1 = true; }; let mut numeric_unimplemented_input_2 = false; if let NumericValue::Unimplemented = input { numeric_unimplemented_input_2 = true; };
    let mut condition_flavor_48_4: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_48_4 < 1 { condition_flavor_48_4 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_48_4 = 2; }; if numeric_unknown_input_1 || numeric_unimplemented_input_2 {
        return int4_unresolved(condition_flavor_48_4);
    }
    let mut numeric_null_input_3 = false; if let NumericValue::Null = input { numeric_null_input_3 = true; };
    if numeric_null_input_3 {
        return Int4Value::Null;
    }
    if let NumericValue::Value(value) = input {
        if numeric_var_kind(&value) != 1 {
            return Int4Value::Value(0);
        }
        if numeric_var_count(&value) == 0 {
            return Int4Value::Value(-1);
        }
        let weight = value.weight;
        let bytes = numeric_hash_digits(&value);
        let hash = hash_native32(bytes, byte_order, 2);
        return sql__pg_catalog__int4xor__6j8h(hash, Int4Value::Value(weight));
    }
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__hash_numeric_extended__oglu(
    input: NumericValue,
    seed: Int8Value,
    byte_order: i32,
) -> Int8Value {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let Int8Value::Unknown = seed { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = seed { unresolved_flavor = 2; };
    if let NumericValue::Error(error) = input {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = seed {
        return Int8Value::Error(error);
    }
    let mut numeric_unknown_input_4 = false; if let NumericValue::Unknown = input { numeric_unknown_input_4 = true; }; let mut numeric_unimplemented_input_5 = false; if let NumericValue::Unimplemented = input { numeric_unimplemented_input_5 = true; };
    let mut condition_flavor_92_4: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_92_4 < 1 { condition_flavor_92_4 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_92_4 = 2; }; if let Int8Value::Unknown = seed { if condition_flavor_92_4 < 1 { condition_flavor_92_4 = 1; }; }; if let Int8Value::Unimplemented = seed { condition_flavor_92_4 = 2; }; if (numeric_unknown_input_4 || numeric_unimplemented_input_5) || (seed == Int8Value::Unknown || seed == Int8Value::Unimplemented) {
        return int8_unresolved(condition_flavor_92_4);
    }
    let mut numeric_null_input_6 = false; if let NumericValue::Null = input { numeric_null_input_6 = true; };
    if numeric_null_input_6 || seed == Int8Value::Null {
        return Int8Value::Null;
    }
    if let NumericValue::Value(value) = input {
        if let Int8Value::Value(salt) = seed {
            if numeric_var_kind(&value) != 1 {
                return Int8Value::Value(salt);
            }
            if numeric_var_count(&value) == 0 {
                if salt == -9223372036854775808i64 {
                    return Int8Value::Value(9223372036854775807i64);
                }
                return Int8Value::Value(salt - 1i64);
            }
            let wide_weight = value.weight as i64;
            let bytes = numeric_hash_digits(&value);
            let hash = hash_native64(bytes, salt, byte_order, 2);
            return sql__pg_catalog__int8xor__4v56(hash, Int8Value::Value(wide_weight));
        }
    }
    int8_unresolved(unresolved_flavor)
}
