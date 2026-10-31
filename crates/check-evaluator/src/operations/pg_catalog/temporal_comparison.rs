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
    let mut unresolved_flavor: i32 = 0;
    if let DateValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestampValue::Unknown = right { unresolved_flavor = 1; };
    if let DateValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TimestampValue::Unimplemented = right { unresolved_flavor = 2; };
    if let DateValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    let mut condition_flavor_42_4: i32 = unresolved_flavor; if let DateValue::Unknown = left { if condition_flavor_42_4 < 1 { condition_flavor_42_4 = 1; }; }; if let DateValue::Unimplemented = left { condition_flavor_42_4 = 2; }; if let TimestampValue::Unknown = right { if condition_flavor_42_4 < 1 { condition_flavor_42_4 = 1; }; }; if let TimestampValue::Unimplemented = right { condition_flavor_42_4 = 2; }; if (left == DateValue::Unknown || left == DateValue::Unimplemented) || (right == TimestampValue::Unknown || right == TimestampValue::Unimplemented) {
        return int4_unresolved(condition_flavor_42_4);
    }
    if left == DateValue::Null || right == TimestampValue::Null {
        return Int4Value::Null;
    }
    if let DateValue::Value(left_value) = left {
        if let TimestampValue::Value(right_value) = right {
            return Int4Value::Value(temporal_date_timestamp_order(left_value, right_value));
        }
    }
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__date_eq_timestamp__6d24(
    left: DateValue,
    right: TimestampValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let DateValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestampValue::Unknown = right { unresolved_flavor = 1; };
    if let DateValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TimestampValue::Unimplemented = right { unresolved_flavor = 2; };
    if let DateValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_71_4: i32 = unresolved_flavor; if let DateValue::Unknown = left { if condition_flavor_71_4 < 1 { condition_flavor_71_4 = 1; }; }; if let DateValue::Unimplemented = left { condition_flavor_71_4 = 2; }; if let TimestampValue::Unknown = right { if condition_flavor_71_4 < 1 { condition_flavor_71_4 = 1; }; }; if let TimestampValue::Unimplemented = right { condition_flavor_71_4 = 2; }; if (left == DateValue::Unknown || left == DateValue::Unimplemented) || (right == TimestampValue::Unknown || right == TimestampValue::Unimplemented) {
        return bool_unresolved(condition_flavor_71_4);
    }
    if left == DateValue::Null || right == TimestampValue::Null {
        return BoolValue::Null;
    }
    if let DateValue::Value(left_value) = left {
        if let TimestampValue::Value(right_value) = right {
            return BoolValue::Value(temporal_date_timestamp_order(left_value, right_value) == 0);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__date_ge_timestamp__dx1w(
    left: DateValue,
    right: TimestampValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let DateValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestampValue::Unknown = right { unresolved_flavor = 1; };
    if let DateValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TimestampValue::Unimplemented = right { unresolved_flavor = 2; };
    if let DateValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_100_4: i32 = unresolved_flavor; if let DateValue::Unknown = left { if condition_flavor_100_4 < 1 { condition_flavor_100_4 = 1; }; }; if let DateValue::Unimplemented = left { condition_flavor_100_4 = 2; }; if let TimestampValue::Unknown = right { if condition_flavor_100_4 < 1 { condition_flavor_100_4 = 1; }; }; if let TimestampValue::Unimplemented = right { condition_flavor_100_4 = 2; }; if (left == DateValue::Unknown || left == DateValue::Unimplemented) || (right == TimestampValue::Unknown || right == TimestampValue::Unimplemented) {
        return bool_unresolved(condition_flavor_100_4);
    }
    if left == DateValue::Null || right == TimestampValue::Null {
        return BoolValue::Null;
    }
    if let DateValue::Value(left_value) = left {
        if let TimestampValue::Value(right_value) = right {
            return BoolValue::Value(temporal_date_timestamp_order(left_value, right_value) >= 0);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__date_gt_timestamp__0703(
    left: DateValue,
    right: TimestampValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let DateValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestampValue::Unknown = right { unresolved_flavor = 1; };
    if let DateValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TimestampValue::Unimplemented = right { unresolved_flavor = 2; };
    if let DateValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_129_4: i32 = unresolved_flavor; if let DateValue::Unknown = left { if condition_flavor_129_4 < 1 { condition_flavor_129_4 = 1; }; }; if let DateValue::Unimplemented = left { condition_flavor_129_4 = 2; }; if let TimestampValue::Unknown = right { if condition_flavor_129_4 < 1 { condition_flavor_129_4 = 1; }; }; if let TimestampValue::Unimplemented = right { condition_flavor_129_4 = 2; }; if (left == DateValue::Unknown || left == DateValue::Unimplemented) || (right == TimestampValue::Unknown || right == TimestampValue::Unimplemented) {
        return bool_unresolved(condition_flavor_129_4);
    }
    if left == DateValue::Null || right == TimestampValue::Null {
        return BoolValue::Null;
    }
    if let DateValue::Value(left_value) = left {
        if let TimestampValue::Value(right_value) = right {
            return BoolValue::Value(temporal_date_timestamp_order(left_value, right_value) > 0);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__date_le_timestamp__q2yz(
    left: DateValue,
    right: TimestampValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let DateValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestampValue::Unknown = right { unresolved_flavor = 1; };
    if let DateValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TimestampValue::Unimplemented = right { unresolved_flavor = 2; };
    if let DateValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_158_4: i32 = unresolved_flavor; if let DateValue::Unknown = left { if condition_flavor_158_4 < 1 { condition_flavor_158_4 = 1; }; }; if let DateValue::Unimplemented = left { condition_flavor_158_4 = 2; }; if let TimestampValue::Unknown = right { if condition_flavor_158_4 < 1 { condition_flavor_158_4 = 1; }; }; if let TimestampValue::Unimplemented = right { condition_flavor_158_4 = 2; }; if (left == DateValue::Unknown || left == DateValue::Unimplemented) || (right == TimestampValue::Unknown || right == TimestampValue::Unimplemented) {
        return bool_unresolved(condition_flavor_158_4);
    }
    if left == DateValue::Null || right == TimestampValue::Null {
        return BoolValue::Null;
    }
    if let DateValue::Value(left_value) = left {
        if let TimestampValue::Value(right_value) = right {
            return BoolValue::Value(temporal_date_timestamp_order(left_value, right_value) <= 0);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__date_lt_timestamp__jqrs(
    left: DateValue,
    right: TimestampValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let DateValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestampValue::Unknown = right { unresolved_flavor = 1; };
    if let DateValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TimestampValue::Unimplemented = right { unresolved_flavor = 2; };
    if let DateValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_187_4: i32 = unresolved_flavor; if let DateValue::Unknown = left { if condition_flavor_187_4 < 1 { condition_flavor_187_4 = 1; }; }; if let DateValue::Unimplemented = left { condition_flavor_187_4 = 2; }; if let TimestampValue::Unknown = right { if condition_flavor_187_4 < 1 { condition_flavor_187_4 = 1; }; }; if let TimestampValue::Unimplemented = right { condition_flavor_187_4 = 2; }; if (left == DateValue::Unknown || left == DateValue::Unimplemented) || (right == TimestampValue::Unknown || right == TimestampValue::Unimplemented) {
        return bool_unresolved(condition_flavor_187_4);
    }
    if left == DateValue::Null || right == TimestampValue::Null {
        return BoolValue::Null;
    }
    if let DateValue::Value(left_value) = left {
        if let TimestampValue::Value(right_value) = right {
            return BoolValue::Value(temporal_date_timestamp_order(left_value, right_value) < 0);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__date_ne_timestamp__m0cz(
    left: DateValue,
    right: TimestampValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let DateValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestampValue::Unknown = right { unresolved_flavor = 1; };
    if let DateValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TimestampValue::Unimplemented = right { unresolved_flavor = 2; };
    if let DateValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_216_4: i32 = unresolved_flavor; if let DateValue::Unknown = left { if condition_flavor_216_4 < 1 { condition_flavor_216_4 = 1; }; }; if let DateValue::Unimplemented = left { condition_flavor_216_4 = 2; }; if let TimestampValue::Unknown = right { if condition_flavor_216_4 < 1 { condition_flavor_216_4 = 1; }; }; if let TimestampValue::Unimplemented = right { condition_flavor_216_4 = 2; }; if (left == DateValue::Unknown || left == DateValue::Unimplemented) || (right == TimestampValue::Unknown || right == TimestampValue::Unimplemented) {
        return bool_unresolved(condition_flavor_216_4);
    }
    if left == DateValue::Null || right == TimestampValue::Null {
        return BoolValue::Null;
    }
    if let DateValue::Value(left_value) = left {
        if let TimestampValue::Value(right_value) = right {
            return BoolValue::Value(temporal_date_timestamp_order(left_value, right_value) != 0);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamp_cmp_date__rsh8(
    left: TimestampValue,
    right: DateValue,
) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let TimestampValue::Unknown = left { unresolved_flavor = 1; };
    if let DateValue::Unknown = right { unresolved_flavor = 1; };
    if let TimestampValue::Unimplemented = left { unresolved_flavor = 2; };
    if let DateValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TimestampValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let DateValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    let mut condition_flavor_245_4: i32 = unresolved_flavor; if let TimestampValue::Unknown = left { if condition_flavor_245_4 < 1 { condition_flavor_245_4 = 1; }; }; if let TimestampValue::Unimplemented = left { condition_flavor_245_4 = 2; }; if let DateValue::Unknown = right { if condition_flavor_245_4 < 1 { condition_flavor_245_4 = 1; }; }; if let DateValue::Unimplemented = right { condition_flavor_245_4 = 2; }; if (left == TimestampValue::Unknown || left == TimestampValue::Unimplemented) || (right == DateValue::Unknown || right == DateValue::Unimplemented) {
        return int4_unresolved(condition_flavor_245_4);
    }
    if left == TimestampValue::Null || right == DateValue::Null {
        return Int4Value::Null;
    }
    if let TimestampValue::Value(left_value) = left {
        if let DateValue::Value(right_value) = right {
            return Int4Value::Value(0 - temporal_date_timestamp_order(right_value, left_value));
        }
    }
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamp_eq_date__7q7f(
    left: TimestampValue,
    right: DateValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestampValue::Unknown = left { unresolved_flavor = 1; };
    if let DateValue::Unknown = right { unresolved_flavor = 1; };
    if let TimestampValue::Unimplemented = left { unresolved_flavor = 2; };
    if let DateValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TimestampValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let DateValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_274_4: i32 = unresolved_flavor; if let TimestampValue::Unknown = left { if condition_flavor_274_4 < 1 { condition_flavor_274_4 = 1; }; }; if let TimestampValue::Unimplemented = left { condition_flavor_274_4 = 2; }; if let DateValue::Unknown = right { if condition_flavor_274_4 < 1 { condition_flavor_274_4 = 1; }; }; if let DateValue::Unimplemented = right { condition_flavor_274_4 = 2; }; if (left == TimestampValue::Unknown || left == TimestampValue::Unimplemented) || (right == DateValue::Unknown || right == DateValue::Unimplemented) {
        return bool_unresolved(condition_flavor_274_4);
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
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamp_ge_date__6d0e(
    left: TimestampValue,
    right: DateValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestampValue::Unknown = left { unresolved_flavor = 1; };
    if let DateValue::Unknown = right { unresolved_flavor = 1; };
    if let TimestampValue::Unimplemented = left { unresolved_flavor = 2; };
    if let DateValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TimestampValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let DateValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_305_4: i32 = unresolved_flavor; if let TimestampValue::Unknown = left { if condition_flavor_305_4 < 1 { condition_flavor_305_4 = 1; }; }; if let TimestampValue::Unimplemented = left { condition_flavor_305_4 = 2; }; if let DateValue::Unknown = right { if condition_flavor_305_4 < 1 { condition_flavor_305_4 = 1; }; }; if let DateValue::Unimplemented = right { condition_flavor_305_4 = 2; }; if (left == TimestampValue::Unknown || left == TimestampValue::Unimplemented) || (right == DateValue::Unknown || right == DateValue::Unimplemented) {
        return bool_unresolved(condition_flavor_305_4);
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
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamp_gt_date__ph8t(
    left: TimestampValue,
    right: DateValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestampValue::Unknown = left { unresolved_flavor = 1; };
    if let DateValue::Unknown = right { unresolved_flavor = 1; };
    if let TimestampValue::Unimplemented = left { unresolved_flavor = 2; };
    if let DateValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TimestampValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let DateValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_336_4: i32 = unresolved_flavor; if let TimestampValue::Unknown = left { if condition_flavor_336_4 < 1 { condition_flavor_336_4 = 1; }; }; if let TimestampValue::Unimplemented = left { condition_flavor_336_4 = 2; }; if let DateValue::Unknown = right { if condition_flavor_336_4 < 1 { condition_flavor_336_4 = 1; }; }; if let DateValue::Unimplemented = right { condition_flavor_336_4 = 2; }; if (left == TimestampValue::Unknown || left == TimestampValue::Unimplemented) || (right == DateValue::Unknown || right == DateValue::Unimplemented) {
        return bool_unresolved(condition_flavor_336_4);
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
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamp_le_date__sshx(
    left: TimestampValue,
    right: DateValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestampValue::Unknown = left { unresolved_flavor = 1; };
    if let DateValue::Unknown = right { unresolved_flavor = 1; };
    if let TimestampValue::Unimplemented = left { unresolved_flavor = 2; };
    if let DateValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TimestampValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let DateValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_367_4: i32 = unresolved_flavor; if let TimestampValue::Unknown = left { if condition_flavor_367_4 < 1 { condition_flavor_367_4 = 1; }; }; if let TimestampValue::Unimplemented = left { condition_flavor_367_4 = 2; }; if let DateValue::Unknown = right { if condition_flavor_367_4 < 1 { condition_flavor_367_4 = 1; }; }; if let DateValue::Unimplemented = right { condition_flavor_367_4 = 2; }; if (left == TimestampValue::Unknown || left == TimestampValue::Unimplemented) || (right == DateValue::Unknown || right == DateValue::Unimplemented) {
        return bool_unresolved(condition_flavor_367_4);
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
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamp_lt_date__8wsq(
    left: TimestampValue,
    right: DateValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestampValue::Unknown = left { unresolved_flavor = 1; };
    if let DateValue::Unknown = right { unresolved_flavor = 1; };
    if let TimestampValue::Unimplemented = left { unresolved_flavor = 2; };
    if let DateValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TimestampValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let DateValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_398_4: i32 = unresolved_flavor; if let TimestampValue::Unknown = left { if condition_flavor_398_4 < 1 { condition_flavor_398_4 = 1; }; }; if let TimestampValue::Unimplemented = left { condition_flavor_398_4 = 2; }; if let DateValue::Unknown = right { if condition_flavor_398_4 < 1 { condition_flavor_398_4 = 1; }; }; if let DateValue::Unimplemented = right { condition_flavor_398_4 = 2; }; if (left == TimestampValue::Unknown || left == TimestampValue::Unimplemented) || (right == DateValue::Unknown || right == DateValue::Unimplemented) {
        return bool_unresolved(condition_flavor_398_4);
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
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamp_ne_date__bxi2(
    left: TimestampValue,
    right: DateValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestampValue::Unknown = left { unresolved_flavor = 1; };
    if let DateValue::Unknown = right { unresolved_flavor = 1; };
    if let TimestampValue::Unimplemented = left { unresolved_flavor = 2; };
    if let DateValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TimestampValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let DateValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_429_4: i32 = unresolved_flavor; if let TimestampValue::Unknown = left { if condition_flavor_429_4 < 1 { condition_flavor_429_4 = 1; }; }; if let TimestampValue::Unimplemented = left { condition_flavor_429_4 = 2; }; if let DateValue::Unknown = right { if condition_flavor_429_4 < 1 { condition_flavor_429_4 = 1; }; }; if let DateValue::Unimplemented = right { condition_flavor_429_4 = 2; }; if (left == TimestampValue::Unknown || left == TimestampValue::Unimplemented) || (right == DateValue::Unknown || right == DateValue::Unimplemented) {
        return bool_unresolved(condition_flavor_429_4);
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
    bool_unresolved(unresolved_flavor)
}

