pub fn sql__pg_catalog__position__93b9(input: BitValue, pattern: BitValue) -> Int4Value {
    if let BitValue::Error(error) = input {
        return Int4Value::Error(error);
    }
    if let BitValue::Error(error) = pattern {
        return Int4Value::Error(error);
    }
    if input == BitValue::Unknown || pattern == BitValue::Unknown {
        return Int4Value::Unknown;
    }
    if input == BitValue::Null || pattern == BitValue::Null {
        return Int4Value::Null;
    }
    if let BitValue::Value(value) = input {
        if let BitValue::Value(needle) = pattern {
            let length = bit_payload_length(value.as_str());
            let pattern_length = bit_payload_length(needle.as_str());
            if length == 0 || pattern_length > length {
                return Int4Value::Value(0);
            }
            if pattern_length == 0 {
                return Int4Value::Value(1);
            }
            let chars: Vec<char> = value.chars().collect();
            let pattern_chars: Vec<char> = needle.chars().collect();
            let last = chars.len() - pattern_chars.len();
            let mut start: usize = 0;
            let mut position: i32 = 1;
            while start <= last {
                let mut index: usize = 0;
                let mut matches = true;
                while index < pattern_chars.len() && matches {
                    if chars[start + index] != pattern_chars[index] {
                        matches = false;
                    }
                    index += 1;
                }
                if matches {
                    return Int4Value::Value(position);
                }
                start += 1;
                position = position + 1;
            }
            return Int4Value::Value(0);
        }
    }
    Int4Value::Unknown
}
