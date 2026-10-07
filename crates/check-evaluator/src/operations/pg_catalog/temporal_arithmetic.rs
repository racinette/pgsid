const TEMPORAL_RANGE_ERROR: u32 = 3452552;

pub fn sql__pg_catalog__date__bvna(left: TimestampValue) -> DateValue {
    if let TimestampValue::Error(error) = left {
        return DateValue::Error(error);
    }
    if left == TimestampValue::Unknown {
        return DateValue::Unknown;
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
        let mut days = left_value / 86400000000i64;
        if left_value < 0i64 && left_value % 86400000000i64 != 0i64 {
            days = days - 1i64;
        }
        return DateValue::Value(days as i32);
    }
    DateValue::Unknown
}

pub fn sql__pg_catalog__date_mi__f4wh(left: DateValue, right: DateValue) -> Int4Value {
    if let DateValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let DateValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == DateValue::Unknown || right == DateValue::Unknown {
        return Int4Value::Unknown;
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
    Int4Value::Unknown
}

pub fn sql__pg_catalog__date_mii__l50u(left: DateValue, right: Int4Value) -> DateValue {
    if let DateValue::Error(error) = left {
        return DateValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return DateValue::Error(error);
    }
    if left == DateValue::Unknown || right == Int4Value::Unknown {
        return DateValue::Unknown;
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
    DateValue::Unknown
}

pub fn sql__pg_catalog__date_pli__pxlb(left: DateValue, right: Int4Value) -> DateValue {
    if let DateValue::Error(error) = left {
        return DateValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return DateValue::Error(error);
    }
    if left == DateValue::Unknown || right == Int4Value::Unknown {
        return DateValue::Unknown;
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
    DateValue::Unknown
}

pub fn sql__pg_catalog__integer_pl_date__fjuj(left: Int4Value, right: DateValue) -> DateValue {
    if let Int4Value::Error(error) = left {
        return DateValue::Error(error);
    }
    if let DateValue::Error(error) = right {
        return DateValue::Error(error);
    }
    if left == Int4Value::Unknown || right == DateValue::Unknown {
        return DateValue::Unknown;
    }
    if left == Int4Value::Null || right == DateValue::Null {
        return DateValue::Null;
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
    DateValue::Unknown
}

pub fn sql__pg_catalog__timestamp__swxj(left: DateValue) -> TimestampValue {
    if let DateValue::Error(error) = left {
        return TimestampValue::Error(error);
    }
    if left == DateValue::Unknown {
        return TimestampValue::Unknown;
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
    TimestampValue::Unknown
}

