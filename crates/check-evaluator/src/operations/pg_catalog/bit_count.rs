pub fn sql__pg_catalog__bit_count__fri1(input: BitValue) -> Int8Value {
    let mut unresolved_flavor: i32 = 0;
    if let BitValue::Unknown = input { unresolved_flavor = 1; };
    if let BitValue::Unimplemented = input { unresolved_flavor = 2; };
    if let BitValue::Error(error) = input {
        return Int8Value::Error(error);
    }
    let mut condition_flavor_8_4: i32 = unresolved_flavor; if let BitValue::Unknown = input { if condition_flavor_8_4 < 1 { condition_flavor_8_4 = 1; }; }; if let BitValue::Unimplemented = input { condition_flavor_8_4 = 2; }; if (input == BitValue::Unknown || input == BitValue::Unimplemented) {
        return int8_unresolved(condition_flavor_8_4);
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
    int8_unresolved(unresolved_flavor)
}
