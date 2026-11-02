fn uuid_compare(left: UuidValue, right: UuidValue) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let UuidValue::Unknown = left { unresolved_flavor = 1; };
    if let UuidValue::Unknown = right { unresolved_flavor = 1; };
    if let UuidValue::Unimplemented = left { unresolved_flavor = 2; };
    if let UuidValue::Unimplemented = right { unresolved_flavor = 2; };
    if let UuidValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let UuidValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    let mut condition_flavor_13_4: i32 = unresolved_flavor; if let UuidValue::Unknown = left { if condition_flavor_13_4 < 1 { condition_flavor_13_4 = 1; }; }; if let UuidValue::Unimplemented = left { condition_flavor_13_4 = 2; }; if let UuidValue::Unknown = right { if condition_flavor_13_4 < 1 { condition_flavor_13_4 = 1; }; }; if let UuidValue::Unimplemented = right { condition_flavor_13_4 = 2; }; if (left == UuidValue::Unknown || left == UuidValue::Unimplemented) || (right == UuidValue::Unknown || right == UuidValue::Unimplemented) {
        return int4_unresolved(condition_flavor_13_4);
    }
    if left == UuidValue::Null || right == UuidValue::Null {
        return Int4Value::Null;
    }
    if let UuidValue::Value(a) = left {
        if let UuidValue::Value(b) = right {
            let mut index: i32 = 0;
            while index < 8 {
                let x = uuid_word(a, index);
                let y = uuid_word(b, index);
                if x / 256 != y / 256 {
                    return Int4Value::Value(x / 256 - y / 256);
                }
                if x % 256 != y % 256 {
                    return Int4Value::Value(x % 256 - y % 256);
                }
                index = index + 1;
            }
            return Int4Value::Value(0);
        }
    }
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__uuid_cmp__6t9k(left: UuidValue, right: UuidValue) -> Int4Value {
    uuid_compare(left, right)
}

pub fn sql__pg_catalog__uuid_eq__6czo(left: UuidValue, right: UuidValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let UuidValue::Unknown = left { unresolved_flavor = 1; };
    if let UuidValue::Unknown = right { unresolved_flavor = 1; };
    if let UuidValue::Unimplemented = left { unresolved_flavor = 2; };
    if let UuidValue::Unimplemented = right { unresolved_flavor = 2; };
    let result = uuid_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_53_4: i32 = unresolved_flavor; if let Int4Value::Unknown = result { if condition_flavor_53_4 < 1 { condition_flavor_53_4 = 1; }; }; if let Int4Value::Unimplemented = result { condition_flavor_53_4 = 2; }; if result == Int4Value::Unknown || result == Int4Value::Unimplemented {
        return bool_unresolved(condition_flavor_53_4);
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order == 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__uuid_ne__n2xp(left: UuidValue, right: UuidValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let UuidValue::Unknown = left { unresolved_flavor = 1; };
    if let UuidValue::Unknown = right { unresolved_flavor = 1; };
    if let UuidValue::Unimplemented = left { unresolved_flavor = 2; };
    if let UuidValue::Unimplemented = right { unresolved_flavor = 2; };
    let result = uuid_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_75_4: i32 = unresolved_flavor; if let Int4Value::Unknown = result { if condition_flavor_75_4 < 1 { condition_flavor_75_4 = 1; }; }; if let Int4Value::Unimplemented = result { condition_flavor_75_4 = 2; }; if result == Int4Value::Unknown || result == Int4Value::Unimplemented {
        return bool_unresolved(condition_flavor_75_4);
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order != 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__uuid_lt__50za(left: UuidValue, right: UuidValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let UuidValue::Unknown = left { unresolved_flavor = 1; };
    if let UuidValue::Unknown = right { unresolved_flavor = 1; };
    if let UuidValue::Unimplemented = left { unresolved_flavor = 2; };
    if let UuidValue::Unimplemented = right { unresolved_flavor = 2; };
    let result = uuid_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_97_4: i32 = unresolved_flavor; if let Int4Value::Unknown = result { if condition_flavor_97_4 < 1 { condition_flavor_97_4 = 1; }; }; if let Int4Value::Unimplemented = result { condition_flavor_97_4 = 2; }; if result == Int4Value::Unknown || result == Int4Value::Unimplemented {
        return bool_unresolved(condition_flavor_97_4);
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order < 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__uuid_le__g9j5(left: UuidValue, right: UuidValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let UuidValue::Unknown = left { unresolved_flavor = 1; };
    if let UuidValue::Unknown = right { unresolved_flavor = 1; };
    if let UuidValue::Unimplemented = left { unresolved_flavor = 2; };
    if let UuidValue::Unimplemented = right { unresolved_flavor = 2; };
    let result = uuid_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_119_4: i32 = unresolved_flavor; if let Int4Value::Unknown = result { if condition_flavor_119_4 < 1 { condition_flavor_119_4 = 1; }; }; if let Int4Value::Unimplemented = result { condition_flavor_119_4 = 2; }; if result == Int4Value::Unknown || result == Int4Value::Unimplemented {
        return bool_unresolved(condition_flavor_119_4);
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order <= 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__uuid_gt__0fj1(left: UuidValue, right: UuidValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let UuidValue::Unknown = left { unresolved_flavor = 1; };
    if let UuidValue::Unknown = right { unresolved_flavor = 1; };
    if let UuidValue::Unimplemented = left { unresolved_flavor = 2; };
    if let UuidValue::Unimplemented = right { unresolved_flavor = 2; };
    let result = uuid_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_141_4: i32 = unresolved_flavor; if let Int4Value::Unknown = result { if condition_flavor_141_4 < 1 { condition_flavor_141_4 = 1; }; }; if let Int4Value::Unimplemented = result { condition_flavor_141_4 = 2; }; if result == Int4Value::Unknown || result == Int4Value::Unimplemented {
        return bool_unresolved(condition_flavor_141_4);
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order > 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__uuid_ge__098n(left: UuidValue, right: UuidValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let UuidValue::Unknown = left { unresolved_flavor = 1; };
    if let UuidValue::Unknown = right { unresolved_flavor = 1; };
    if let UuidValue::Unimplemented = left { unresolved_flavor = 2; };
    if let UuidValue::Unimplemented = right { unresolved_flavor = 2; };
    let result = uuid_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_163_4: i32 = unresolved_flavor; if let Int4Value::Unknown = result { if condition_flavor_163_4 < 1 { condition_flavor_163_4 = 1; }; }; if let Int4Value::Unimplemented = result { condition_flavor_163_4 = 2; }; if result == Int4Value::Unknown || result == Int4Value::Unimplemented {
        return bool_unresolved(condition_flavor_163_4);
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order >= 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn uuid_to_text(input: UuidValue) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let UuidValue::Unknown = input { unresolved_flavor = 1; };
    if let UuidValue::Unimplemented = input { unresolved_flavor = 2; };
    if let UuidValue::Error(error) = input {
        return TextValue::Error(error);
    }
    let mut condition_flavor_182_4: i32 = unresolved_flavor; if let UuidValue::Unknown = input { if condition_flavor_182_4 < 1 { condition_flavor_182_4 = 1; }; }; if let UuidValue::Unimplemented = input { condition_flavor_182_4 = 2; }; if input == UuidValue::Unknown || input == UuidValue::Unimplemented {
        return text_unresolved(condition_flavor_182_4);
    }
    if input == UuidValue::Null {
        return TextValue::Null;
    }
    if let UuidValue::Value(value) = input {
        let mut output = String::new();
        let mut index: i32 = 0;
        while index < 8 {
            if index == 2 || index == 3 || index == 4 || index == 5 {
                output.push('-');
            }
            let word = uuid_word(value, index);
            if word < 4096 {
                output.push('0');
            }
            if word < 256 {
                output.push('0');
            }
            if word < 16 {
                output.push('0');
            }
            let digits = text_number(word, 16);
            output.push_str(digits.as_str());
            index = index + 1;
        }
        return TextValue::Value(output);
    }
    text_unresolved(unresolved_flavor)
}
