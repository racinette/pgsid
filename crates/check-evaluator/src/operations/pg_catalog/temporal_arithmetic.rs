const TEMPORAL_RANGE_ERROR: u32 = 3452552;

pub fn sql__pg_catalog__date__bvna(left: TimestampValue) -> DateValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestampValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestampValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TimestampValue::Error(error) = left {
        return DateValue::Error(error);
    }
    let mut condition_flavor_10_4: i32 = unresolved_flavor; if let TimestampValue::Unknown = left { if condition_flavor_10_4 < 1 { condition_flavor_10_4 = 1; }; }; if let TimestampValue::Unimplemented = left { condition_flavor_10_4 = 2; }; if (left == TimestampValue::Unknown || left == TimestampValue::Unimplemented) {
        return date_unresolved(condition_flavor_10_4);
    }
    if left == TimestampValue::Null {
        return DateValue::Null;
    }
    if let TimestampValue::Value(left_value) = left {
        if left_value == -9223372036854775808i64 {
            return DateValue::Value(-2147483647 - 1);
        }
        if left_value == 9223372036854775807i64 {
            return DateValue::Value(2147483647);
        }
        if left_value < -211813488000000000i64 {
            return DateValue::Error(make_sql_error(TEMPORAL_RANGE_ERROR));
        };
        let mut days = left_value / 86400000000i64;
        if left_value < 0i64 && left_value % 86400000000i64 != 0i64 {
            days = days - 1i64;
        }
        return DateValue::Value(days as i32);
    }
    date_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__date_mi__f4wh(left: DateValue, right: DateValue) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let DateValue::Unknown = left { unresolved_flavor = 1; };
    if let DateValue::Unknown = right { unresolved_flavor = 1; };
    if let DateValue::Unimplemented = left { unresolved_flavor = 2; };
    if let DateValue::Unimplemented = right { unresolved_flavor = 2; };
    if let DateValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let DateValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    let mut condition_flavor_47_4: i32 = unresolved_flavor; if let DateValue::Unknown = left { if condition_flavor_47_4 < 1 { condition_flavor_47_4 = 1; }; }; if let DateValue::Unimplemented = left { condition_flavor_47_4 = 2; }; if let DateValue::Unknown = right { if condition_flavor_47_4 < 1 { condition_flavor_47_4 = 1; }; }; if let DateValue::Unimplemented = right { condition_flavor_47_4 = 2; }; if (left == DateValue::Unknown || left == DateValue::Unimplemented) || (right == DateValue::Unknown || right == DateValue::Unimplemented) {
        return int4_unresolved(condition_flavor_47_4);
    }
    if left == DateValue::Null || right == DateValue::Null {
        return Int4Value::Null;
    }
    if let DateValue::Value(left_value) = left {
        if let DateValue::Value(right_value) = right {
            if left_value == -2147483647 - 1
                || left_value == 2147483647
                || right_value == -2147483647 - 1
                || right_value == 2147483647
            {
                return Int4Value::Error(make_sql_error(TEMPORAL_RANGE_ERROR));
            }
            return Int4Value::Value(left_value - right_value);
        }
    }
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__date_mii__l50u(left: DateValue, right: Int4Value) -> DateValue {
    let mut unresolved_flavor: i32 = 0;
    if let DateValue::Unknown = left { unresolved_flavor = 1; };
    if let Int4Value::Unknown = right { unresolved_flavor = 1; };
    if let DateValue::Unimplemented = left { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = right { unresolved_flavor = 2; };
    if let DateValue::Error(error) = left {
        return DateValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return DateValue::Error(error);
    }
    let mut condition_flavor_80_4: i32 = unresolved_flavor; if let DateValue::Unknown = left { if condition_flavor_80_4 < 1 { condition_flavor_80_4 = 1; }; }; if let DateValue::Unimplemented = left { condition_flavor_80_4 = 2; }; if let Int4Value::Unknown = right { if condition_flavor_80_4 < 1 { condition_flavor_80_4 = 1; }; }; if let Int4Value::Unimplemented = right { condition_flavor_80_4 = 2; }; if (left == DateValue::Unknown || left == DateValue::Unimplemented) || (right == Int4Value::Unknown || right == Int4Value::Unimplemented) {
        return date_unresolved(condition_flavor_80_4);
    }
    if left == DateValue::Null || right == Int4Value::Null {
        return DateValue::Null;
    }
    if let DateValue::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            if left_value == -2147483647 - 1 || left_value == 2147483647 {
                return DateValue::Value(left_value);
            }
            let result = (left_value as i64) - (right_value as i64);
            if result < -2451545i64 || result >= 2145031949i64 {
                return DateValue::Error(make_sql_error(TEMPORAL_RANGE_ERROR));
            }
            return DateValue::Value(result as i32);
        }
    }
    date_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__date_pli__pxlb(left: DateValue, right: Int4Value) -> DateValue {
    let mut unresolved_flavor: i32 = 0;
    if let DateValue::Unknown = left { unresolved_flavor = 1; };
    if let Int4Value::Unknown = right { unresolved_flavor = 1; };
    if let DateValue::Unimplemented = left { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = right { unresolved_flavor = 2; };
    if let DateValue::Error(error) = left {
        return DateValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return DateValue::Error(error);
    }
    let mut condition_flavor_113_4: i32 = unresolved_flavor; if let DateValue::Unknown = left { if condition_flavor_113_4 < 1 { condition_flavor_113_4 = 1; }; }; if let DateValue::Unimplemented = left { condition_flavor_113_4 = 2; }; if let Int4Value::Unknown = right { if condition_flavor_113_4 < 1 { condition_flavor_113_4 = 1; }; }; if let Int4Value::Unimplemented = right { condition_flavor_113_4 = 2; }; if (left == DateValue::Unknown || left == DateValue::Unimplemented) || (right == Int4Value::Unknown || right == Int4Value::Unimplemented) {
        return date_unresolved(condition_flavor_113_4);
    }
    if left == DateValue::Null || right == Int4Value::Null {
        return DateValue::Null;
    }
    if let DateValue::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            if left_value == -2147483647 - 1 || left_value == 2147483647 {
                return DateValue::Value(left_value);
            }
            let result = (left_value as i64) + (right_value as i64);
            if result < -2451545i64 || result >= 2145031949i64 {
                return DateValue::Error(make_sql_error(TEMPORAL_RANGE_ERROR));
            }
            return DateValue::Value(result as i32);
        }
    }
    date_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__integer_pl_date__fjuj(left: Int4Value, right: DateValue) -> DateValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int4Value::Unknown = left { unresolved_flavor = 1; };
    if let DateValue::Unknown = right { unresolved_flavor = 1; };
    if let Int4Value::Unimplemented = left { unresolved_flavor = 2; };
    if let DateValue::Unimplemented = right { unresolved_flavor = 2; };
    if let Int4Value::Error(error) = left {
        return DateValue::Error(error);
    }
    if let DateValue::Error(error) = right {
        return DateValue::Error(error);
    }
    if left == Int4Value::Null || right == DateValue::Null {
        return DateValue::Null;
    }
    let mut condition_flavor_149_4: i32 = unresolved_flavor; if let Int4Value::Unknown = left { if condition_flavor_149_4 < 1 { condition_flavor_149_4 = 1; }; }; if let Int4Value::Unimplemented = left { condition_flavor_149_4 = 2; }; if let DateValue::Unknown = right { if condition_flavor_149_4 < 1 { condition_flavor_149_4 = 1; }; }; if let DateValue::Unimplemented = right { condition_flavor_149_4 = 2; }; if (left == Int4Value::Unknown || left == Int4Value::Unimplemented) || (right == DateValue::Unknown || right == DateValue::Unimplemented) {
        return date_unresolved(condition_flavor_149_4);
    }
    if let Int4Value::Value(left_value) = left {
        if let DateValue::Value(right_value) = right {
            if right_value == -2147483647 - 1 || right_value == 2147483647 {
                return DateValue::Value(right_value);
            }
            let result = (right_value as i64) + (left_value as i64);
            if result < -2451545i64 || result >= 2145031949i64 {
                return DateValue::Error(make_sql_error(TEMPORAL_RANGE_ERROR));
            }
            return DateValue::Value(result as i32);
        }
    }
    date_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamp__swxj(left: DateValue) -> TimestampValue {
    let mut unresolved_flavor: i32 = 0;
    if let DateValue::Unknown = left { unresolved_flavor = 1; };
    if let DateValue::Unimplemented = left { unresolved_flavor = 2; };
    if let DateValue::Error(error) = left {
        return TimestampValue::Error(error);
    }
    let mut condition_flavor_174_4: i32 = unresolved_flavor; if let DateValue::Unknown = left { if condition_flavor_174_4 < 1 { condition_flavor_174_4 = 1; }; }; if let DateValue::Unimplemented = left { condition_flavor_174_4 = 2; }; if (left == DateValue::Unknown || left == DateValue::Unimplemented) {
        return timestamp_unresolved(condition_flavor_174_4);
    }
    if left == DateValue::Null {
        return TimestampValue::Null;
    }
    if let DateValue::Value(left_value) = left {
        if left_value == -2147483647 - 1 {
            return TimestampValue::Value(-9223372036854775808i64);
        }
        if left_value == 2147483647 {
            return TimestampValue::Value(9223372036854775807i64);
        }
        if left_value >= 106751983 {
            return TimestampValue::Error(make_sql_error(TEMPORAL_RANGE_ERROR));
        }
        return TimestampValue::Value((left_value as i64) * 86400000000i64);
    }
    timestamp_unresolved(unresolved_flavor)
}
