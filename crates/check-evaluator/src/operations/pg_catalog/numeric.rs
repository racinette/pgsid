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
    let mut numeric_unknown_left_1 = false; if let NumericValue::Unknown = left { numeric_unknown_left_1 = true; }; let mut numeric_unimplemented_left_2 = false; if let NumericValue::Unimplemented = left { numeric_unimplemented_left_2 = true; }; let mut numeric_unknown_right_3 = false; if let NumericValue::Unknown = right { numeric_unknown_right_3 = true; }; let mut numeric_unimplemented_right_4 = false; if let NumericValue::Unimplemented = right { numeric_unimplemented_right_4 = true; };
    let mut condition_flavor_13_4: i32 = unresolved_flavor; if let NumericValue::Unknown = left { if condition_flavor_13_4 < 1 { condition_flavor_13_4 = 1; }; }; if let NumericValue::Unimplemented = left { condition_flavor_13_4 = 2; }; if let NumericValue::Unknown = right { if condition_flavor_13_4 < 1 { condition_flavor_13_4 = 1; }; }; if let NumericValue::Unimplemented = right { condition_flavor_13_4 = 2; }; if (numeric_unknown_left_1 || numeric_unimplemented_left_2) || (numeric_unknown_right_3 || numeric_unimplemented_right_4) {
        return int4_unresolved(condition_flavor_13_4);
    }
    let mut numeric_null_left_5 = false; if let NumericValue::Null = left { numeric_null_left_5 = true; }; let mut numeric_null_right_6 = false; if let NumericValue::Null = right { numeric_null_right_6 = true; };
    if numeric_null_left_5 || numeric_null_right_6 {
        return Int4Value::Null;
    }
    if let NumericValue::Value(left_value) = left {
        if let NumericValue::Value(right_value) = right {
            return Int4Value::Value(numeric_var_compare_values(&left_value, &right_value));
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
    let mut condition_flavor_96_4: i32 = unresolved_flavor; if let Int4Value::Unknown = result { if condition_flavor_96_4 < 1 { condition_flavor_96_4 = 1; }; }; if let Int4Value::Unimplemented = result { condition_flavor_96_4 = 2; }; if result == Int4Value::Unknown || result == Int4Value::Unimplemented {
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
    let mut condition_flavor_118_4: i32 = unresolved_flavor; if let Int4Value::Unknown = result { if condition_flavor_118_4 < 1 { condition_flavor_118_4 = 1; }; }; if let Int4Value::Unimplemented = result { condition_flavor_118_4 = 2; }; if result == Int4Value::Unknown || result == Int4Value::Unimplemented {
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
    let mut condition_flavor_140_4: i32 = unresolved_flavor; if let Int4Value::Unknown = result { if condition_flavor_140_4 < 1 { condition_flavor_140_4 = 1; }; }; if let Int4Value::Unimplemented = result { condition_flavor_140_4 = 2; }; if result == Int4Value::Unknown || result == Int4Value::Unimplemented {
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
    let mut condition_flavor_162_4: i32 = unresolved_flavor; if let Int4Value::Unknown = result { if condition_flavor_162_4 < 1 { condition_flavor_162_4 = 1; }; }; if let Int4Value::Unimplemented = result { condition_flavor_162_4 = 2; }; if result == Int4Value::Unknown || result == Int4Value::Unimplemented {
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
    let mut condition_flavor_184_4: i32 = unresolved_flavor; if let Int4Value::Unknown = result { if condition_flavor_184_4 < 1 { condition_flavor_184_4 = 1; }; }; if let Int4Value::Unimplemented = result { condition_flavor_184_4 = 2; }; if result == Int4Value::Unknown || result == Int4Value::Unimplemented {
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
    let mut condition_flavor_206_4: i32 = unresolved_flavor; if let Int4Value::Unknown = result { if condition_flavor_206_4 < 1 { condition_flavor_206_4 = 1; }; }; if let Int4Value::Unimplemented = result { condition_flavor_206_4 = 2; }; if result == Int4Value::Unknown || result == Int4Value::Unimplemented {
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
