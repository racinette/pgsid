pub fn sql__pg_catalog__make_date__z9pv(year: Int4Value, month: Int4Value, day: Int4Value) -> DateValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int4Value::Unknown = year { unresolved_flavor = 1; };
    if let Int4Value::Unknown = month { unresolved_flavor = 1; };
    if let Int4Value::Unknown = day { unresolved_flavor = 1; };
    if let Int4Value::Unimplemented = year { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = month { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = day { unresolved_flavor = 2; };
    if let Int4Value::Error(error) = year {
        return DateValue::Error(error);
    }
    if let Int4Value::Error(error) = month {
        return DateValue::Error(error);
    }
    if let Int4Value::Error(error) = day {
        return DateValue::Error(error);
    }
    let mut condition_flavor_18_4: i32 = unresolved_flavor; if let Int4Value::Unknown = year { if condition_flavor_18_4 < 1 { condition_flavor_18_4 = 1; }; }; if let Int4Value::Unimplemented = year { condition_flavor_18_4 = 2; }; if let Int4Value::Unknown = month { if condition_flavor_18_4 < 1 { condition_flavor_18_4 = 1; }; }; if let Int4Value::Unimplemented = month { condition_flavor_18_4 = 2; }; if let Int4Value::Unknown = day { if condition_flavor_18_4 < 1 { condition_flavor_18_4 = 1; }; }; if let Int4Value::Unimplemented = day { condition_flavor_18_4 = 2; }; if (year == Int4Value::Unknown || year == Int4Value::Unimplemented) || (month == Int4Value::Unknown || month == Int4Value::Unimplemented) || (day == Int4Value::Unknown || day == Int4Value::Unimplemented) {
        return date_unresolved(condition_flavor_18_4);
    }
    if year == Int4Value::Null || month == Int4Value::Null || day == Int4Value::Null {
        return DateValue::Null;
    }
    if let Int4Value::Value(year_value) = year {
        if let Int4Value::Value(month_value) = month {
            if let Int4Value::Value(day_value) = day {
                return date_from_ymd(year_value, month_value, day_value);
            }
        }
    }
    date_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__date_eq__d4us(left: DateValue, right: DateValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let DateValue::Unknown = left { unresolved_flavor = 1; };
    if let DateValue::Unknown = right { unresolved_flavor = 1; };
    if let DateValue::Unimplemented = left { unresolved_flavor = 2; };
    if let DateValue::Unimplemented = right { unresolved_flavor = 2; };
    if let DateValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let DateValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_46_4: i32 = unresolved_flavor; if let DateValue::Unknown = left { if condition_flavor_46_4 < 1 { condition_flavor_46_4 = 1; }; }; if let DateValue::Unimplemented = left { condition_flavor_46_4 = 2; }; if let DateValue::Unknown = right { if condition_flavor_46_4 < 1 { condition_flavor_46_4 = 1; }; }; if let DateValue::Unimplemented = right { condition_flavor_46_4 = 2; }; if (left == DateValue::Unknown || left == DateValue::Unimplemented) || (right == DateValue::Unknown || right == DateValue::Unimplemented) {
        return bool_unresolved(condition_flavor_46_4);
    }
    if left == DateValue::Null || right == DateValue::Null {
        return BoolValue::Null;
    }
    if let DateValue::Value(left_value) = left {
        if let DateValue::Value(right_value) = right {
            return BoolValue::Value(left_value == right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__date_ne__npdb(left: DateValue, right: DateValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let DateValue::Unknown = left { unresolved_flavor = 1; };
    if let DateValue::Unknown = right { unresolved_flavor = 1; };
    if let DateValue::Unimplemented = left { unresolved_flavor = 2; };
    if let DateValue::Unimplemented = right { unresolved_flavor = 2; };
    if let DateValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let DateValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_72_4: i32 = unresolved_flavor; if let DateValue::Unknown = left { if condition_flavor_72_4 < 1 { condition_flavor_72_4 = 1; }; }; if let DateValue::Unimplemented = left { condition_flavor_72_4 = 2; }; if let DateValue::Unknown = right { if condition_flavor_72_4 < 1 { condition_flavor_72_4 = 1; }; }; if let DateValue::Unimplemented = right { condition_flavor_72_4 = 2; }; if (left == DateValue::Unknown || left == DateValue::Unimplemented) || (right == DateValue::Unknown || right == DateValue::Unimplemented) {
        return bool_unresolved(condition_flavor_72_4);
    }
    if left == DateValue::Null || right == DateValue::Null {
        return BoolValue::Null;
    }
    if let DateValue::Value(left_value) = left {
        if let DateValue::Value(right_value) = right {
            return BoolValue::Value(left_value != right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__date_lt__843e(left: DateValue, right: DateValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let DateValue::Unknown = left { unresolved_flavor = 1; };
    if let DateValue::Unknown = right { unresolved_flavor = 1; };
    if let DateValue::Unimplemented = left { unresolved_flavor = 2; };
    if let DateValue::Unimplemented = right { unresolved_flavor = 2; };
    if let DateValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let DateValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_98_4: i32 = unresolved_flavor; if let DateValue::Unknown = left { if condition_flavor_98_4 < 1 { condition_flavor_98_4 = 1; }; }; if let DateValue::Unimplemented = left { condition_flavor_98_4 = 2; }; if let DateValue::Unknown = right { if condition_flavor_98_4 < 1 { condition_flavor_98_4 = 1; }; }; if let DateValue::Unimplemented = right { condition_flavor_98_4 = 2; }; if (left == DateValue::Unknown || left == DateValue::Unimplemented) || (right == DateValue::Unknown || right == DateValue::Unimplemented) {
        return bool_unresolved(condition_flavor_98_4);
    }
    if left == DateValue::Null || right == DateValue::Null {
        return BoolValue::Null;
    }
    if let DateValue::Value(left_value) = left {
        if let DateValue::Value(right_value) = right {
            return BoolValue::Value(left_value < right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__date_le__5cqw(left: DateValue, right: DateValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let DateValue::Unknown = left { unresolved_flavor = 1; };
    if let DateValue::Unknown = right { unresolved_flavor = 1; };
    if let DateValue::Unimplemented = left { unresolved_flavor = 2; };
    if let DateValue::Unimplemented = right { unresolved_flavor = 2; };
    if let DateValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let DateValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_124_4: i32 = unresolved_flavor; if let DateValue::Unknown = left { if condition_flavor_124_4 < 1 { condition_flavor_124_4 = 1; }; }; if let DateValue::Unimplemented = left { condition_flavor_124_4 = 2; }; if let DateValue::Unknown = right { if condition_flavor_124_4 < 1 { condition_flavor_124_4 = 1; }; }; if let DateValue::Unimplemented = right { condition_flavor_124_4 = 2; }; if (left == DateValue::Unknown || left == DateValue::Unimplemented) || (right == DateValue::Unknown || right == DateValue::Unimplemented) {
        return bool_unresolved(condition_flavor_124_4);
    }
    if left == DateValue::Null || right == DateValue::Null {
        return BoolValue::Null;
    }
    if let DateValue::Value(left_value) = left {
        if let DateValue::Value(right_value) = right {
            return BoolValue::Value(left_value <= right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__date_gt__5025(left: DateValue, right: DateValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let DateValue::Unknown = left { unresolved_flavor = 1; };
    if let DateValue::Unknown = right { unresolved_flavor = 1; };
    if let DateValue::Unimplemented = left { unresolved_flavor = 2; };
    if let DateValue::Unimplemented = right { unresolved_flavor = 2; };
    if let DateValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let DateValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_150_4: i32 = unresolved_flavor; if let DateValue::Unknown = left { if condition_flavor_150_4 < 1 { condition_flavor_150_4 = 1; }; }; if let DateValue::Unimplemented = left { condition_flavor_150_4 = 2; }; if let DateValue::Unknown = right { if condition_flavor_150_4 < 1 { condition_flavor_150_4 = 1; }; }; if let DateValue::Unimplemented = right { condition_flavor_150_4 = 2; }; if (left == DateValue::Unknown || left == DateValue::Unimplemented) || (right == DateValue::Unknown || right == DateValue::Unimplemented) {
        return bool_unresolved(condition_flavor_150_4);
    }
    if left == DateValue::Null || right == DateValue::Null {
        return BoolValue::Null;
    }
    if let DateValue::Value(left_value) = left {
        if let DateValue::Value(right_value) = right {
            return BoolValue::Value(left_value > right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__date_ge__8wil(left: DateValue, right: DateValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let DateValue::Unknown = left { unresolved_flavor = 1; };
    if let DateValue::Unknown = right { unresolved_flavor = 1; };
    if let DateValue::Unimplemented = left { unresolved_flavor = 2; };
    if let DateValue::Unimplemented = right { unresolved_flavor = 2; };
    if let DateValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let DateValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_176_4: i32 = unresolved_flavor; if let DateValue::Unknown = left { if condition_flavor_176_4 < 1 { condition_flavor_176_4 = 1; }; }; if let DateValue::Unimplemented = left { condition_flavor_176_4 = 2; }; if let DateValue::Unknown = right { if condition_flavor_176_4 < 1 { condition_flavor_176_4 = 1; }; }; if let DateValue::Unimplemented = right { condition_flavor_176_4 = 2; }; if (left == DateValue::Unknown || left == DateValue::Unimplemented) || (right == DateValue::Unknown || right == DateValue::Unimplemented) {
        return bool_unresolved(condition_flavor_176_4);
    }
    if left == DateValue::Null || right == DateValue::Null {
        return BoolValue::Null;
    }
    if let DateValue::Value(left_value) = left {
        if let DateValue::Value(right_value) = right {
            return BoolValue::Value(left_value >= right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}
