fn numeric_compare(left: NumericValue, right: NumericValue) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = left { unresolved_flavor = 1; };
    if let NumericValue::Unknown = right { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = left { unresolved_flavor = 2; };
    if let NumericValue::Unimplemented = right { unresolved_flavor = 2; };
    if let NumericValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let NumericValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    let mut condition_flavor_13_4: i32 = unresolved_flavor; if let NumericValue::Unknown = left { if condition_flavor_13_4 < 1 { condition_flavor_13_4 = 1; }; }; if let NumericValue::Unimplemented = left { condition_flavor_13_4 = 2; }; if let NumericValue::Unknown = right { if condition_flavor_13_4 < 1 { condition_flavor_13_4 = 1; }; }; if let NumericValue::Unimplemented = right { condition_flavor_13_4 = 2; }; if (left == NumericValue::Unknown || left == NumericValue::Unimplemented) || (right == NumericValue::Unknown || right == NumericValue::Unimplemented) {
        return int4_unresolved(condition_flavor_13_4);
    }
    if left == NumericValue::Null || right == NumericValue::Null {
        return Int4Value::Null;
    }
    if let NumericValue::Value(left_value) = left {
        if let NumericValue::Value(right_value) = right {
            let a = numeric_parts(left_value.as_str());
            let b = numeric_parts(right_value.as_str());
            if a.valid == false || b.valid == false {
                return int4_unresolved(unresolved_flavor);
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
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__numeric_eq__fw7r(left: NumericValue, right: NumericValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = left { unresolved_flavor = 1; };
    if let NumericValue::Unknown = right { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = left { unresolved_flavor = 2; };
    if let NumericValue::Unimplemented = right { unresolved_flavor = 2; };
    let result = numeric_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_96_4: i32 = unresolved_flavor; if let Int4Value::Unknown = result { if condition_flavor_96_4 < 1 { condition_flavor_96_4 = 1; }; }; if let Int4Value::Unimplemented = result { condition_flavor_96_4 = 2; }; if (result == Int4Value::Unknown || result == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_96_4);
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order == 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__numeric_ge__w8pw(left: NumericValue, right: NumericValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = left { unresolved_flavor = 1; };
    if let NumericValue::Unknown = right { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = left { unresolved_flavor = 2; };
    if let NumericValue::Unimplemented = right { unresolved_flavor = 2; };
    let result = numeric_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_118_4: i32 = unresolved_flavor; if let Int4Value::Unknown = result { if condition_flavor_118_4 < 1 { condition_flavor_118_4 = 1; }; }; if let Int4Value::Unimplemented = result { condition_flavor_118_4 = 2; }; if (result == Int4Value::Unknown || result == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_118_4);
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order >= 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__numeric_gt__h1pi(left: NumericValue, right: NumericValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = left { unresolved_flavor = 1; };
    if let NumericValue::Unknown = right { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = left { unresolved_flavor = 2; };
    if let NumericValue::Unimplemented = right { unresolved_flavor = 2; };
    let result = numeric_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_140_4: i32 = unresolved_flavor; if let Int4Value::Unknown = result { if condition_flavor_140_4 < 1 { condition_flavor_140_4 = 1; }; }; if let Int4Value::Unimplemented = result { condition_flavor_140_4 = 2; }; if (result == Int4Value::Unknown || result == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_140_4);
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order > 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__numeric_le__bbpc(left: NumericValue, right: NumericValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = left { unresolved_flavor = 1; };
    if let NumericValue::Unknown = right { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = left { unresolved_flavor = 2; };
    if let NumericValue::Unimplemented = right { unresolved_flavor = 2; };
    let result = numeric_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_162_4: i32 = unresolved_flavor; if let Int4Value::Unknown = result { if condition_flavor_162_4 < 1 { condition_flavor_162_4 = 1; }; }; if let Int4Value::Unimplemented = result { condition_flavor_162_4 = 2; }; if (result == Int4Value::Unknown || result == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_162_4);
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order <= 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__numeric_lt__zl16(left: NumericValue, right: NumericValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = left { unresolved_flavor = 1; };
    if let NumericValue::Unknown = right { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = left { unresolved_flavor = 2; };
    if let NumericValue::Unimplemented = right { unresolved_flavor = 2; };
    let result = numeric_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_184_4: i32 = unresolved_flavor; if let Int4Value::Unknown = result { if condition_flavor_184_4 < 1 { condition_flavor_184_4 = 1; }; }; if let Int4Value::Unimplemented = result { condition_flavor_184_4 = 2; }; if (result == Int4Value::Unknown || result == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_184_4);
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order < 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__numeric_ne__gyip(left: NumericValue, right: NumericValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = left { unresolved_flavor = 1; };
    if let NumericValue::Unknown = right { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = left { unresolved_flavor = 2; };
    if let NumericValue::Unimplemented = right { unresolved_flavor = 2; };
    let result = numeric_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_206_4: i32 = unresolved_flavor; if let Int4Value::Unknown = result { if condition_flavor_206_4 < 1 { condition_flavor_206_4 = 1; }; }; if let Int4Value::Unimplemented = result { condition_flavor_206_4 = 2; }; if (result == Int4Value::Unknown || result == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_206_4);
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order != 0);
    }
    bool_unresolved(unresolved_flavor)
}
