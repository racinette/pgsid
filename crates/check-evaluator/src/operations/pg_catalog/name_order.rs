pub fn sql__pg_catalog__btnamecmp__9x5j(left: TextValue, right: TextValue) -> Int4Value {
    if let TextValue::Error(error) = left {
        return Int4Value::Error(error);
    };
    if let TextValue::Error(error) = right {
        return Int4Value::Error(error);
    };
    if let TextValue::Unknown = left {
        return Int4Value::Unknown;
    };
    if let TextValue::Unknown = right {
        return Int4Value::Unknown;
    };
    if let TextValue::Null = left {
        return Int4Value::Null;
    };
    if let TextValue::Null = right {
        return Int4Value::Null;
    };
    if let TextValue::Value(a) = left {
        if let TextValue::Value(b) = right {
            let first_hex = text_binary_hex(a.as_str(), false);
            let second_hex = text_binary_hex(b.as_str(), false);
            let first: Vec<char> = first_hex.chars().collect();
            let second: Vec<char> = second_hex.chars().collect();
            let mut position: usize = 0;
            while position < first.len() || position < second.len() {
                let mut first_byte: i32 = 0;
                let mut second_byte: i32 = 0;
                if position < first.len() {
                    first_byte = hex_digit(first[position]) * 16 + hex_digit(first[position + 1]);
                };
                if position < second.len() {
                    second_byte =
                        hex_digit(second[position]) * 16 + hex_digit(second[position + 1]);
                };
                if first_byte != second_byte {
                    return Int4Value::Value(first_byte - second_byte);
                };
                if first_byte == 0 {
                    return Int4Value::Value(0);
                };
                position += 2;
            }
            return Int4Value::Value(0);
        };
    };
    Int4Value::Unknown
}
