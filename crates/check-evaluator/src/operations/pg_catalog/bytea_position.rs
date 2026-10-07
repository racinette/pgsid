pub fn sql__pg_catalog__position__9w14(input: ByteaValue, pattern: ByteaValue) -> Int4Value {
    if let ByteaValue::Error(error) = input {
        return Int4Value::Error(error);
    }
    if let ByteaValue::Error(error) = pattern {
        return Int4Value::Error(error);
    }
    if input == ByteaValue::Unknown || pattern == ByteaValue::Unknown {
        return Int4Value::Unknown;
    }
    if input == ByteaValue::Null || pattern == ByteaValue::Null {
        return Int4Value::Null;
    }
    if let ByteaValue::Value(value) = input {
        if let ByteaValue::Value(needle) = pattern {
            let length = bytea_payload_length(value.as_str());
            let pattern_length = bytea_payload_length(needle.as_str());
            if pattern_length == 0 {
                return Int4Value::Value(1);
            }
            if pattern_length > length {
                return Int4Value::Value(0);
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
                start = start + 2;
                position = position + 1;
            }
            return Int4Value::Value(0);
        }
    }
    Int4Value::Unknown
}
