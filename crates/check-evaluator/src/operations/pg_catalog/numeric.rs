fn numeric_compare(left: NumericValue, right: NumericValue) -> Int4Value {
    if let NumericValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let NumericValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == NumericValue::Unknown || right == NumericValue::Unknown {
        return Int4Value::Unknown;
    }
    if left == NumericValue::Null || right == NumericValue::Null {
        return Int4Value::Null;
    }
    if let NumericValue::Value(left_value) = left {
        if let NumericValue::Value(right_value) = right {
            let a = numeric_parts(left_value.as_str());
            let b = numeric_parts(right_value.as_str());
            if a.valid == false || b.valid == false {
                return Int4Value::Unknown;
            }
            if a.special < b.special {
                return Int4Value::Value(-1);
            }
            if a.special > b.special {
                return Int4Value::Value(1);
            }
            if a.special != 1 {
                return Int4Value::Value(0);
            }
            if a.sign < b.sign {
                return Int4Value::Value(-1);
            }
            if a.sign > b.sign {
                return Int4Value::Value(1);
            }
            if a.sign == 0 {
                return Int4Value::Value(0);
            }
            if a.weight < b.weight {
                return Int4Value::Value(0 - a.sign);
            }
            if a.weight > b.weight {
                return Int4Value::Value(a.sign);
            }
            let left_chars: Vec<char> = left_value.chars().collect();
            let right_chars: Vec<char> = right_value.chars().collect();
            let mut i = a.first;
            let mut j = b.first;
            while i < a.end || j < b.end {
                while i < a.end && (left_chars[i] == '.' || left_chars[i] == '_') {
                    i += 1;
                }
                while j < b.end && (right_chars[j] == '.' || right_chars[j] == '_') {
                    j += 1;
                }
                let mut x = '0';
                let mut y = '0';
                if i < a.end {
                    x = left_chars[i];
                    i += 1;
                }
                if j < b.end {
                    y = right_chars[j];
                    j += 1;
                }
                let x_code = x as u32;
                let y_code = y as u32;
                if x_code < y_code {
                    return Int4Value::Value(0 - a.sign);
                }
                if x_code > y_code {
                    return Int4Value::Value(a.sign);
                }
            }
            return Int4Value::Value(0);
        }
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__numeric_eq__fw7r(left: NumericValue, right: NumericValue) -> BoolValue {
    let result = numeric_compare(left, right);
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

pub fn sql__pg_catalog__numeric_ge__w8pw(left: NumericValue, right: NumericValue) -> BoolValue {
    let result = numeric_compare(left, right);
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

pub fn sql__pg_catalog__numeric_gt__h1pi(left: NumericValue, right: NumericValue) -> BoolValue {
    let result = numeric_compare(left, right);
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

pub fn sql__pg_catalog__numeric_le__bbpc(left: NumericValue, right: NumericValue) -> BoolValue {
    let result = numeric_compare(left, right);
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

pub fn sql__pg_catalog__numeric_lt__zl16(left: NumericValue, right: NumericValue) -> BoolValue {
    let result = numeric_compare(left, right);
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

pub fn sql__pg_catalog__numeric_ne__gyip(left: NumericValue, right: NumericValue) -> BoolValue {
    let result = numeric_compare(left, right);
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
