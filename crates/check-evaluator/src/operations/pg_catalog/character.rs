fn bpchar_codepoint_compare(left: &str, right: &str) -> i32 {
    let left_chars: Vec<char> = left.chars().collect();
    let right_chars: Vec<char> = right.chars().collect();
    let mut left_length = left_chars.len();
    let mut right_length = right_chars.len();
    while left_length > 0 {
        if left_chars[left_length - 1] != ' ' {
            break;
        }
        left_length = left_length - 1;
    }
    while right_length > 0 {
        if right_chars[right_length - 1] != ' ' {
            break;
        }
        right_length = right_length - 1;
    }
    let mut index = 0;
    while index < left_length && index < right_length {
        let left_code = left_chars[index] as u32;
        let right_code = right_chars[index] as u32;
        if left_code < right_code {
            return -1;
        }
        if left_code > right_code {
            return 1;
        }
        index = index + 1;
    }
    if left_length < right_length {
        return -1;
    }
    if left_length > right_length {
        return 1;
    }
    0
}

pub fn sql__pg_catalog__bpchareq__npys(left: TextValue, right: TextValue) -> BoolValue {
    if let TextValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TextValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == TextValue::Unknown || right == TextValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == TextValue::Null || right == TextValue::Null {
        return BoolValue::Null;
    }
    if let TextValue::Value(left_value) = left {
        if let TextValue::Value(right_value) = right {
            let comparison = bpchar_codepoint_compare(left_value, right_value);
            return BoolValue::Value(comparison == 0);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__bpcharge__o6oj(left: TextValue, right: TextValue) -> BoolValue {
    if let TextValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TextValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == TextValue::Unknown || right == TextValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == TextValue::Null || right == TextValue::Null {
        return BoolValue::Null;
    }
    if let TextValue::Value(left_value) = left {
        if let TextValue::Value(right_value) = right {
            let comparison = bpchar_codepoint_compare(left_value, right_value);
            return BoolValue::Value(comparison >= 0);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__bpchargt__kxc4(left: TextValue, right: TextValue) -> BoolValue {
    if let TextValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TextValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == TextValue::Unknown || right == TextValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == TextValue::Null || right == TextValue::Null {
        return BoolValue::Null;
    }
    if let TextValue::Value(left_value) = left {
        if let TextValue::Value(right_value) = right {
            let comparison = bpchar_codepoint_compare(left_value, right_value);
            return BoolValue::Value(comparison > 0);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__bpcharle__0rch(left: TextValue, right: TextValue) -> BoolValue {
    if let TextValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TextValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == TextValue::Unknown || right == TextValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == TextValue::Null || right == TextValue::Null {
        return BoolValue::Null;
    }
    if let TextValue::Value(left_value) = left {
        if let TextValue::Value(right_value) = right {
            let comparison = bpchar_codepoint_compare(left_value, right_value);
            return BoolValue::Value(comparison <= 0);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__bpcharlt__qrb5(left: TextValue, right: TextValue) -> BoolValue {
    if let TextValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TextValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == TextValue::Unknown || right == TextValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == TextValue::Null || right == TextValue::Null {
        return BoolValue::Null;
    }
    if let TextValue::Value(left_value) = left {
        if let TextValue::Value(right_value) = right {
            let comparison = bpchar_codepoint_compare(left_value, right_value);
            return BoolValue::Value(comparison < 0);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__bpcharne__qkuu(left: TextValue, right: TextValue) -> BoolValue {
    if let TextValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TextValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == TextValue::Unknown || right == TextValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == TextValue::Null || right == TextValue::Null {
        return BoolValue::Null;
    }
    if let TextValue::Value(left_value) = left {
        if let TextValue::Value(right_value) = right {
            let comparison = bpchar_codepoint_compare(left_value, right_value);
            return BoolValue::Value(comparison != 0);
        }
    }
    BoolValue::Unknown
}
