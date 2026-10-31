pub fn sql__pg_catalog__position__93b9(input: BitValue, pattern: BitValue) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let BitValue::Unknown = input { unresolved_flavor = 1; };
    if let BitValue::Unknown = pattern { unresolved_flavor = 1; };
    if let BitValue::Unimplemented = input { unresolved_flavor = 2; };
    if let BitValue::Unimplemented = pattern { unresolved_flavor = 2; };
    if let BitValue::Error(error) = input {
        return Int4Value::Error(error);
    }
    if let BitValue::Error(error) = pattern {
        return Int4Value::Error(error);
    }
    let mut condition_flavor_13_4: i32 = unresolved_flavor; if let BitValue::Unknown = input { if condition_flavor_13_4 < 1 { condition_flavor_13_4 = 1; }; }; if let BitValue::Unimplemented = input { condition_flavor_13_4 = 2; }; if let BitValue::Unknown = pattern { if condition_flavor_13_4 < 1 { condition_flavor_13_4 = 1; }; }; if let BitValue::Unimplemented = pattern { condition_flavor_13_4 = 2; }; if (input == BitValue::Unknown || input == BitValue::Unimplemented) || (pattern == BitValue::Unknown || pattern == BitValue::Unimplemented) {
        return int4_unresolved(condition_flavor_13_4);
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
    int4_unresolved(unresolved_flavor)
}
