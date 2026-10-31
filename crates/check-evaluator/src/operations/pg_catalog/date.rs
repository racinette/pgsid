pub fn sql__pg_catalog__make_date__z9pv(year: Int4Value, month: Int4Value, day: Int4Value) -> DateValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int4Value::Unknown = year { unresolved_flavor = 1; };
    if let Int4Value::Unknown = month { unresolved_flavor = 1; };
    if let Int4Value::Unknown = day { unresolved_flavor = 1; };
    if let Int4Value::Error(error) = year {
        return DateValue::Error(error);
    }
    if let Int4Value::Error(error) = month {
        return DateValue::Error(error);
    }
    if let Int4Value::Error(error) = day {
        return DateValue::Error(error);
    }
    if year == Int4Value::Unknown || month == Int4Value::Unknown || day == Int4Value::Unknown {
        return date_unresolved(unresolved_flavor);
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
    if let DateValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let DateValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == DateValue::Unknown || right == DateValue::Unknown {
        return bool_unresolved(unresolved_flavor);
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
    if let DateValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let DateValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == DateValue::Unknown || right == DateValue::Unknown {
        return bool_unresolved(unresolved_flavor);
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
    if let DateValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let DateValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == DateValue::Unknown || right == DateValue::Unknown {
        return bool_unresolved(unresolved_flavor);
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
    if let DateValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let DateValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == DateValue::Unknown || right == DateValue::Unknown {
        return bool_unresolved(unresolved_flavor);
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
    if let DateValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let DateValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == DateValue::Unknown || right == DateValue::Unknown {
        return bool_unresolved(unresolved_flavor);
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
    if let DateValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let DateValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == DateValue::Unknown || right == DateValue::Unknown {
        return bool_unresolved(unresolved_flavor);
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
