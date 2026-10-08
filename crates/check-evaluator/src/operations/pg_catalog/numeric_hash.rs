fn numeric_hash_digits(value: &str) -> Vec<HashByte> {
    let layout = numeric_parts(value);
    let characters: Vec<char> = value.chars().collect();
    let mut remainder = layout.weight % 4;
    if remainder < 0 {
        remainder = remainder + 4;
    }
    let mut position = 3 - remainder;
    let mut group: i32 = 0;
    let mut index = layout.first;
    let mut bytes: Vec<HashByte> = Vec::new();
    while index < layout.end {
        let digit = numeric_wire_decimal_digit(characters[index]);
        if digit >= 0 {
            group = group * 10 + digit;
            position = position + 1;
            if position == 4 {
                let low = group % 256;
                let high = group / 256;
                bytes.push(HashByte { value: low as i64 });
                bytes.push(HashByte { value: high as i64 });
                position = 0;
                group = 0;
            }
        }
        index += 1;
    }
    if position > 0 {
        while position < 4 {
            group = group * 10;
            position = position + 1;
        }
        let low = group % 256;
        let high = group / 256;
        bytes.push(HashByte { value: low as i64 });
        bytes.push(HashByte { value: high as i64 });
    }
    bytes
}

pub fn sql__pg_catalog__hash_numeric__0e7w(input: NumericValue) -> Int4Value {
    if let NumericValue::Error(error) = input {
        return Int4Value::Error(error);
    }
    if input == NumericValue::Unknown {
        return Int4Value::Unknown;
    }
    if input == NumericValue::Null {
        return Int4Value::Null;
    }
    if let NumericValue::Value(value) = input {
        let layout = numeric_parts(value.as_str());
        if layout.valid == false {
            return Int4Value::Unknown;
        }
        if layout.special != 1 {
            return Int4Value::Value(0);
        }
        if layout.sign == 0 {
            return Int4Value::Value(-1);
        }
        let mut weight = layout.weight / 4;
        if layout.weight % 4 < 0 {
            weight = weight - 1;
        }
        let bytes = numeric_hash_digits(value.as_str());
        let hash = hash_bytes32(bytes);
        return sql__pg_catalog__int4xor__6j8h(Int4Value::Value(hash), Int4Value::Value(weight));
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__hash_numeric_extended__oglu(
    input: NumericValue,
    seed: Int8Value,
) -> Int8Value {
    if let NumericValue::Error(error) = input {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = seed {
        return Int8Value::Error(error);
    }
    if input == NumericValue::Unknown || seed == Int8Value::Unknown {
        return Int8Value::Unknown;
    }
    if input == NumericValue::Null || seed == Int8Value::Null {
        return Int8Value::Null;
    }
    if let NumericValue::Value(value) = input {
        if let Int8Value::Value(salt) = seed {
            let layout = numeric_parts(value.as_str());
            if layout.valid == false {
                return Int8Value::Unknown;
            }
            if layout.special != 1 {
                return Int8Value::Value(salt);
            }
            if layout.sign == 0 {
                if salt == -9223372036854775808i64 {
                    return Int8Value::Value(9223372036854775807i64);
                }
                return Int8Value::Value(salt - 1i64);
            }
            let mut weight = layout.weight / 4;
            if layout.weight % 4 < 0 {
                weight = weight - 1;
            }
            let wide_weight = weight as i64;
            let bytes = numeric_hash_digits(value.as_str());
            let hash = hash_bytes64(bytes, salt);
            return sql__pg_catalog__int8xor__4v56(
                Int8Value::Value(hash),
                Int8Value::Value(wide_weight),
            );
        }
    }
    Int8Value::Unknown
}
