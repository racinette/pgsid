fn temporal_compare(left: i64, right: i64) -> i32 {
    if left < right {
        return -1;
    }
    if left > right {
        return 1;
    }
    0
}

fn temporal_date_timestamp_order(date: i32, timestamp: i64) -> i32 {
    if date == -2147483647 - 1 {
        return temporal_compare(-9223372036854775808i64, timestamp);
    }
    if date == 2147483647 {
        return temporal_compare(9223372036854775807i64, timestamp);
    }
    if date >= 106751983 {
        if timestamp == 9223372036854775807i64 {
            return -1;
        }
        return 1;
    }
    temporal_compare((date as i64) * 86400000000i64, timestamp)
}

pub fn sql__pg_catalog__date_cmp_timestamp__ppmh(
    left: DateValue,
    right: TimestampValue,
) -> Int4Value {
    if let DateValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == DateValue::Unknown || right == TimestampValue::Unknown {
        return Int4Value::Unknown;
    }
    if left == DateValue::Null || right == TimestampValue::Null {
        return Int4Value::Null;
    }
    if let DateValue::Value(left_value) = left {
        if let TimestampValue::Value(right_value) = right {
            return Int4Value::Value(temporal_date_timestamp_order(left_value, right_value));
        }
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__date_eq_timestamp__6d24(
    left: DateValue,
    right: TimestampValue,
) -> BoolValue {
    if let DateValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == DateValue::Unknown || right == TimestampValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == DateValue::Null || right == TimestampValue::Null {
        return BoolValue::Null;
    }
    if let DateValue::Value(left_value) = left {
        if let TimestampValue::Value(right_value) = right {
            return BoolValue::Value(temporal_date_timestamp_order(left_value, right_value) == 0);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__date_ge_timestamp__dx1w(
    left: DateValue,
    right: TimestampValue,
) -> BoolValue {
    if let DateValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == DateValue::Unknown || right == TimestampValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == DateValue::Null || right == TimestampValue::Null {
        return BoolValue::Null;
    }
    if let DateValue::Value(left_value) = left {
        if let TimestampValue::Value(right_value) = right {
            return BoolValue::Value(temporal_date_timestamp_order(left_value, right_value) >= 0);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__date_gt_timestamp__0703(
    left: DateValue,
    right: TimestampValue,
) -> BoolValue {
    if let DateValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == DateValue::Unknown || right == TimestampValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == DateValue::Null || right == TimestampValue::Null {
        return BoolValue::Null;
    }
    if let DateValue::Value(left_value) = left {
        if let TimestampValue::Value(right_value) = right {
            return BoolValue::Value(temporal_date_timestamp_order(left_value, right_value) > 0);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__date_le_timestamp__q2yz(
    left: DateValue,
    right: TimestampValue,
) -> BoolValue {
    if let DateValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == DateValue::Unknown || right == TimestampValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == DateValue::Null || right == TimestampValue::Null {
        return BoolValue::Null;
    }
    if let DateValue::Value(left_value) = left {
        if let TimestampValue::Value(right_value) = right {
            return BoolValue::Value(temporal_date_timestamp_order(left_value, right_value) <= 0);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__date_lt_timestamp__jqrs(
    left: DateValue,
    right: TimestampValue,
) -> BoolValue {
    if let DateValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == DateValue::Unknown || right == TimestampValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == DateValue::Null || right == TimestampValue::Null {
        return BoolValue::Null;
    }
    if let DateValue::Value(left_value) = left {
        if let TimestampValue::Value(right_value) = right {
            return BoolValue::Value(temporal_date_timestamp_order(left_value, right_value) < 0);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__date_ne_timestamp__m0cz(
    left: DateValue,
    right: TimestampValue,
) -> BoolValue {
    if let DateValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == DateValue::Unknown || right == TimestampValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == DateValue::Null || right == TimestampValue::Null {
        return BoolValue::Null;
    }
    if let DateValue::Value(left_value) = left {
        if let TimestampValue::Value(right_value) = right {
            return BoolValue::Value(temporal_date_timestamp_order(left_value, right_value) != 0);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__timestamp_cmp_date__rsh8(
    left: TimestampValue,
    right: DateValue,
) -> Int4Value {
    if let TimestampValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let DateValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == TimestampValue::Unknown || right == DateValue::Unknown {
        return Int4Value::Unknown;
    }
    if left == TimestampValue::Null || right == DateValue::Null {
        return Int4Value::Null;
    }
    if let TimestampValue::Value(left_value) = left {
        if let DateValue::Value(right_value) = right {
            return Int4Value::Value(0 - temporal_date_timestamp_order(right_value, left_value));
        }
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__timestamp_eq_date__7q7f(
    left: TimestampValue,
    right: DateValue,
) -> BoolValue {
    if let TimestampValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let DateValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == TimestampValue::Unknown || right == DateValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == TimestampValue::Null || right == DateValue::Null {
        return BoolValue::Null;
    }
    if let TimestampValue::Value(left_value) = left {
        if let DateValue::Value(right_value) = right {
            return BoolValue::Value(
                0 - temporal_date_timestamp_order(right_value, left_value) == 0,
            );
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__timestamp_ge_date__6d0e(
    left: TimestampValue,
    right: DateValue,
) -> BoolValue {
    if let TimestampValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let DateValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == TimestampValue::Unknown || right == DateValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == TimestampValue::Null || right == DateValue::Null {
        return BoolValue::Null;
    }
    if let TimestampValue::Value(left_value) = left {
        if let DateValue::Value(right_value) = right {
            return BoolValue::Value(
                0 - temporal_date_timestamp_order(right_value, left_value) >= 0,
            );
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__timestamp_gt_date__ph8t(
    left: TimestampValue,
    right: DateValue,
) -> BoolValue {
    if let TimestampValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let DateValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == TimestampValue::Unknown || right == DateValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == TimestampValue::Null || right == DateValue::Null {
        return BoolValue::Null;
    }
    if let TimestampValue::Value(left_value) = left {
        if let DateValue::Value(right_value) = right {
            return BoolValue::Value(
                0 - temporal_date_timestamp_order(right_value, left_value) > 0,
            );
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__timestamp_le_date__sshx(
    left: TimestampValue,
    right: DateValue,
) -> BoolValue {
    if let TimestampValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let DateValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == TimestampValue::Unknown || right == DateValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == TimestampValue::Null || right == DateValue::Null {
        return BoolValue::Null;
    }
    if let TimestampValue::Value(left_value) = left {
        if let DateValue::Value(right_value) = right {
            return BoolValue::Value(
                0 - temporal_date_timestamp_order(right_value, left_value) <= 0,
            );
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__timestamp_lt_date__8wsq(
    left: TimestampValue,
    right: DateValue,
) -> BoolValue {
    if let TimestampValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let DateValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == TimestampValue::Unknown || right == DateValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == TimestampValue::Null || right == DateValue::Null {
        return BoolValue::Null;
    }
    if let TimestampValue::Value(left_value) = left {
        if let DateValue::Value(right_value) = right {
            return BoolValue::Value(
                0 - temporal_date_timestamp_order(right_value, left_value) < 0,
            );
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__timestamp_ne_date__bxi2(
    left: TimestampValue,
    right: DateValue,
) -> BoolValue {
    if let TimestampValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let DateValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == TimestampValue::Unknown || right == DateValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == TimestampValue::Null || right == DateValue::Null {
        return BoolValue::Null;
    }
    if let TimestampValue::Value(left_value) = left {
        if let DateValue::Value(right_value) = right {
            return BoolValue::Value(
                0 - temporal_date_timestamp_order(right_value, left_value) != 0,
            );
        }
    }
    BoolValue::Unknown
}

