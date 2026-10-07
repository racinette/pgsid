pub fn sql__pg_catalog__bit_count__fri1(input: BitValue) -> Int8Value {
    if let BitValue::Error(error) = input {
        return Int8Value::Error(error);
    }
    if input == BitValue::Unknown {
        return Int8Value::Unknown;
    }
    if input == BitValue::Null {
        return Int8Value::Null;
    }
    if let BitValue::Value(value) = input {
        let chars: Vec<char> = value.chars().collect();
        let mut index: usize = 0;
        let mut count: i64 = 0i64;
        while index < chars.len() {
            if chars[index] == '1' {
                count = count + 1i64;
            }
            index += 1;
        }
        return Int8Value::Value(count);
    }
    Int8Value::Unknown
}
