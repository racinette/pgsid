fn uuid_compare(left: UuidValue, right: UuidValue) -> Int4Value {
    if let UuidValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let UuidValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == UuidValue::Unknown || right == UuidValue::Unknown {
        return Int4Value::Unknown;
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
    Int4Value::Unknown
}

pub fn sql__pg_catalog__uuid_cmp__6t9k(left: UuidValue, right: UuidValue) -> Int4Value {
    uuid_compare(left, right)
}

pub fn sql__pg_catalog__uuid_eq__6czo(left: UuidValue, right: UuidValue) -> BoolValue {
    let result = uuid_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    if result == Int4Value::Unknown {
        return BoolValue::Unknown;
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order == 0);
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__uuid_ne__n2xp(left: UuidValue, right: UuidValue) -> BoolValue {
    let result = uuid_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    if result == Int4Value::Unknown {
        return BoolValue::Unknown;
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order != 0);
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__uuid_lt__50za(left: UuidValue, right: UuidValue) -> BoolValue {
    let result = uuid_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    if result == Int4Value::Unknown {
        return BoolValue::Unknown;
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order < 0);
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__uuid_le__g9j5(left: UuidValue, right: UuidValue) -> BoolValue {
    let result = uuid_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    if result == Int4Value::Unknown {
        return BoolValue::Unknown;
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order <= 0);
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__uuid_gt__0fj1(left: UuidValue, right: UuidValue) -> BoolValue {
    let result = uuid_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    if result == Int4Value::Unknown {
        return BoolValue::Unknown;
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order > 0);
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__uuid_ge__098n(left: UuidValue, right: UuidValue) -> BoolValue {
    let result = uuid_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    if result == Int4Value::Unknown {
        return BoolValue::Unknown;
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order >= 0);
    }
    BoolValue::Unknown
}

pub fn uuid_to_text(input: UuidValue) -> TextValue {
    if let UuidValue::Error(error) = input {
        return TextValue::Error(error);
    }
    if input == UuidValue::Unknown {
        return TextValue::Unknown;
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
    TextValue::Unknown
}
