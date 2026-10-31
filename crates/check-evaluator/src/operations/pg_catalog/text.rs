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
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = value { unresolved_flavor = 1; };
    if let TextValue::NonNull = value { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unimplemented = value { unresolved_flavor = 2; };
    if let TextValue::Error(error) = value {
        return Int4Value::Error(error);
    }
    let mut condition_flavor_44_4: i32 = unresolved_flavor; if let TextValue::Unknown = value { if condition_flavor_44_4 < 1 { condition_flavor_44_4 = 1; }; }; if let TextValue::Unimplemented = value { condition_flavor_44_4 = 2; }; if ((value == TextValue::Unknown || value == TextValue::Unimplemented) || value == TextValue::NonNull) {
        return int4_unresolved(condition_flavor_44_4);
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
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__texteq__aet8(left: TextValue, right: TextValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = left { unresolved_flavor = 1; };
    if let TextValue::NonNull = left { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unknown = right { unresolved_flavor = 1; };
    if let TextValue::NonNull = right { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TextValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TextValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_75_4: i32 = unresolved_flavor; if let TextValue::Unknown = left { if condition_flavor_75_4 < 1 { condition_flavor_75_4 = 1; }; }; if let TextValue::Unimplemented = left { condition_flavor_75_4 = 2; }; if let TextValue::Unknown = right { if condition_flavor_75_4 < 1 { condition_flavor_75_4 = 1; }; }; if let TextValue::Unimplemented = right { condition_flavor_75_4 = 2; }; if ((left == TextValue::Unknown || left == TextValue::Unimplemented) || left == TextValue::NonNull) || ((right == TextValue::Unknown || right == TextValue::Unimplemented) || right == TextValue::NonNull) {
        return bool_unresolved(condition_flavor_75_4);
    }
    if left == TextValue::Null || right == TextValue::Null {
        return BoolValue::Null;
    }
    if let TextValue::Value(left_value) = left {
        if let TextValue::Value(right_value) = right {
            return BoolValue::Value(left_value == right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__textne__1urq(left: TextValue, right: TextValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = left { unresolved_flavor = 1; };
    if let TextValue::NonNull = left { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unknown = right { unresolved_flavor = 1; };
    if let TextValue::NonNull = right { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TextValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TextValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_101_4: i32 = unresolved_flavor; if let TextValue::Unknown = left { if condition_flavor_101_4 < 1 { condition_flavor_101_4 = 1; }; }; if let TextValue::Unimplemented = left { condition_flavor_101_4 = 2; }; if let TextValue::Unknown = right { if condition_flavor_101_4 < 1 { condition_flavor_101_4 = 1; }; }; if let TextValue::Unimplemented = right { condition_flavor_101_4 = 2; }; if ((left == TextValue::Unknown || left == TextValue::Unimplemented) || left == TextValue::NonNull) || ((right == TextValue::Unknown || right == TextValue::Unimplemented) || right == TextValue::NonNull) {
        return bool_unresolved(condition_flavor_101_4);
    }
    if left == TextValue::Null || right == TextValue::Null {
        return BoolValue::Null;
    }
    if let TextValue::Value(left_value) = left {
        if let TextValue::Value(right_value) = right {
            return BoolValue::Value(left_value != right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__text_lt__zinq(left: TextValue, right: TextValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = left { unresolved_flavor = 1; };
    if let TextValue::NonNull = left { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unknown = right { unresolved_flavor = 1; };
    if let TextValue::NonNull = right { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TextValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TextValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_127_4: i32 = unresolved_flavor; if let TextValue::Unknown = left { if condition_flavor_127_4 < 1 { condition_flavor_127_4 = 1; }; }; if let TextValue::Unimplemented = left { condition_flavor_127_4 = 2; }; if let TextValue::Unknown = right { if condition_flavor_127_4 < 1 { condition_flavor_127_4 = 1; }; }; if let TextValue::Unimplemented = right { condition_flavor_127_4 = 2; }; if ((left == TextValue::Unknown || left == TextValue::Unimplemented) || left == TextValue::NonNull) || ((right == TextValue::Unknown || right == TextValue::Unimplemented) || right == TextValue::NonNull) {
        return bool_unresolved(condition_flavor_127_4);
    }
    if left == TextValue::Null || right == TextValue::Null {
        return BoolValue::Null;
    }
    if let TextValue::Value(left_value) = left {
        if let TextValue::Value(right_value) = right {
            return BoolValue::Value(text_codepoint_before(left_value.as_str(), right_value.as_str()));
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__text_le__wb3z(left: TextValue, right: TextValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = left { unresolved_flavor = 1; };
    if let TextValue::NonNull = left { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unknown = right { unresolved_flavor = 1; };
    if let TextValue::NonNull = right { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TextValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TextValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_153_4: i32 = unresolved_flavor; if let TextValue::Unknown = left { if condition_flavor_153_4 < 1 { condition_flavor_153_4 = 1; }; }; if let TextValue::Unimplemented = left { condition_flavor_153_4 = 2; }; if let TextValue::Unknown = right { if condition_flavor_153_4 < 1 { condition_flavor_153_4 = 1; }; }; if let TextValue::Unimplemented = right { condition_flavor_153_4 = 2; }; if ((left == TextValue::Unknown || left == TextValue::Unimplemented) || left == TextValue::NonNull) || ((right == TextValue::Unknown || right == TextValue::Unimplemented) || right == TextValue::NonNull) {
        return bool_unresolved(condition_flavor_153_4);
    }
    if left == TextValue::Null || right == TextValue::Null {
        return BoolValue::Null;
    }
    if let TextValue::Value(left_value) = left {
        if let TextValue::Value(right_value) = right {
            return BoolValue::Value(
                text_codepoint_before(left_value.as_str(), right_value.as_str()) || left_value == right_value,
            );
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__text_gt__rb7n(left: TextValue, right: TextValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = left { unresolved_flavor = 1; };
    if let TextValue::NonNull = left { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unknown = right { unresolved_flavor = 1; };
    if let TextValue::NonNull = right { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TextValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TextValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_181_4: i32 = unresolved_flavor; if let TextValue::Unknown = left { if condition_flavor_181_4 < 1 { condition_flavor_181_4 = 1; }; }; if let TextValue::Unimplemented = left { condition_flavor_181_4 = 2; }; if let TextValue::Unknown = right { if condition_flavor_181_4 < 1 { condition_flavor_181_4 = 1; }; }; if let TextValue::Unimplemented = right { condition_flavor_181_4 = 2; }; if ((left == TextValue::Unknown || left == TextValue::Unimplemented) || left == TextValue::NonNull) || ((right == TextValue::Unknown || right == TextValue::Unimplemented) || right == TextValue::NonNull) {
        return bool_unresolved(condition_flavor_181_4);
    }
    if left == TextValue::Null || right == TextValue::Null {
        return BoolValue::Null;
    }
    if let TextValue::Value(left_value) = left {
        if let TextValue::Value(right_value) = right {
            return BoolValue::Value(text_codepoint_before(right_value.as_str(), left_value.as_str()));
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__starts_with__6ctf(text: TextValue, prefix: TextValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = text { unresolved_flavor = 1; };
    if let TextValue::NonNull = text { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unknown = prefix { unresolved_flavor = 1; };
    if let TextValue::NonNull = prefix { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unimplemented = text { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = prefix { unresolved_flavor = 2; };
    if let TextValue::Error(error) = text {
        return BoolValue::Error(error);
    }
    if let TextValue::Error(error) = prefix {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_207_4: i32 = unresolved_flavor; if let TextValue::Unknown = text { if condition_flavor_207_4 < 1 { condition_flavor_207_4 = 1; }; }; if let TextValue::Unimplemented = text { condition_flavor_207_4 = 2; }; if let TextValue::Unknown = prefix { if condition_flavor_207_4 < 1 { condition_flavor_207_4 = 1; }; }; if let TextValue::Unimplemented = prefix { condition_flavor_207_4 = 2; }; if ((text == TextValue::Unknown || text == TextValue::Unimplemented) || text == TextValue::NonNull) || ((prefix == TextValue::Unknown || prefix == TextValue::Unimplemented) || prefix == TextValue::NonNull) {
        return bool_unresolved(condition_flavor_207_4);
    }
    if text == TextValue::Null || prefix == TextValue::Null {
        return BoolValue::Null;
    }
    if let TextValue::Value(text_value) = text {
        if let TextValue::Value(prefix_value) = prefix {
            return BoolValue::Value(text_has_prefix(text_value.as_str(), prefix_value.as_str()));
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__text_ge__t8pg(left: TextValue, right: TextValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = left { unresolved_flavor = 1; };
    if let TextValue::NonNull = left { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unknown = right { unresolved_flavor = 1; };
    if let TextValue::NonNull = right { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TextValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TextValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_233_4: i32 = unresolved_flavor; if let TextValue::Unknown = left { if condition_flavor_233_4 < 1 { condition_flavor_233_4 = 1; }; }; if let TextValue::Unimplemented = left { condition_flavor_233_4 = 2; }; if let TextValue::Unknown = right { if condition_flavor_233_4 < 1 { condition_flavor_233_4 = 1; }; }; if let TextValue::Unimplemented = right { condition_flavor_233_4 = 2; }; if ((left == TextValue::Unknown || left == TextValue::Unimplemented) || left == TextValue::NonNull) || ((right == TextValue::Unknown || right == TextValue::Unimplemented) || right == TextValue::NonNull) {
        return bool_unresolved(condition_flavor_233_4);
    }
    if left == TextValue::Null || right == TextValue::Null {
        return BoolValue::Null;
    }
    if let TextValue::Value(left_value) = left {
        if let TextValue::Value(right_value) = right {
            return BoolValue::Value(
                text_codepoint_before(right_value.as_str(), left_value.as_str()) || left_value == right_value,
            );
        }
    }
    bool_unresolved(unresolved_flavor)
}
