fn text_has_prefix(text: &str, prefix: &str) -> bool {
    let text_chars: Vec<char> = text.chars().collect();
    let prefix_chars: Vec<char> = prefix.chars().collect();
    if prefix_chars.len() > text_chars.len() {
        return false;
    }
    let mut index = 0;
    while index < prefix_chars.len() {
        let text_code = text_chars[index] as u32;
        let prefix_code = prefix_chars[index] as u32;
        if text_code != prefix_code {
            return false;
        }
        index += 1;
    }
    true
}

fn text_codepoint_before(left: &str, right: &str) -> bool {
    let left_chars: Vec<char> = left.chars().collect();
    let right_chars: Vec<char> = right.chars().collect();
    let mut index = 0;
    while index < left_chars.len() && index < right_chars.len() {
        let left_code = left_chars[index] as u32;
        let right_code = right_chars[index] as u32;
        if left_code < right_code {
            return true;
        }
        if left_code > right_code {
            return false;
        }
        index += 1;
    }
    left_chars.len() < right_chars.len()
}

pub fn sql__pg_catalog__length__ehpe(value: TextValue) -> Int4Value {
    if let TextValue::Error(error) = value {
        return Int4Value::Error(error);
    }
    if value == TextValue::Unknown {
        return Int4Value::Unknown;
    }
    if value == TextValue::Null {
        return Int4Value::Null;
    }
    if let TextValue::Value(text) = value {
        let chars: Vec<char> = text.chars().collect();
        let mut index = 0;
        let mut length = 0;
        while index < chars.len() {
            index = index + 1;
            length = length + 1;
        }
        return Int4Value::Value(length);
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__texteq__aet8(left: TextValue, right: TextValue) -> BoolValue {
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
            return BoolValue::Value(left_value == right_value);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__textne__1urq(left: TextValue, right: TextValue) -> BoolValue {
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
            return BoolValue::Value(left_value != right_value);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__text_lt__zinq(left: TextValue, right: TextValue) -> BoolValue {
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
            return BoolValue::Value(text_codepoint_before(left_value, right_value));
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__text_le__wb3z(left: TextValue, right: TextValue) -> BoolValue {
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
            return BoolValue::Value(
                text_codepoint_before(left_value, right_value) || left_value == right_value,
            );
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__text_gt__rb7n(left: TextValue, right: TextValue) -> BoolValue {
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
            return BoolValue::Value(text_codepoint_before(right_value, left_value));
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__starts_with__6ctf(text: TextValue, prefix: TextValue) -> BoolValue {
    if let TextValue::Error(error) = text {
        return BoolValue::Error(error);
    }
    if let TextValue::Error(error) = prefix {
        return BoolValue::Error(error);
    }
    if text == TextValue::Unknown || prefix == TextValue::Unknown {
        return BoolValue::Unknown;
    }
    if text == TextValue::Null || prefix == TextValue::Null {
        return BoolValue::Null;
    }
    if let TextValue::Value(text_value) = text {
        if let TextValue::Value(prefix_value) = prefix {
            return BoolValue::Value(text_has_prefix(text_value, prefix_value));
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__text_ge__t8pg(left: TextValue, right: TextValue) -> BoolValue {
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
            return BoolValue::Value(
                text_codepoint_before(right_value, left_value) || left_value == right_value,
            );
        }
    }
    BoolValue::Unknown
}
