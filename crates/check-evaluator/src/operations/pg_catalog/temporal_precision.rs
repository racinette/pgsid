const TEMPORAL_PRECISION_ERROR: u32 = 3452619;

fn temporal_adjust_precision(value: i64, precision: i32) -> Int8Value {
    if value == -9223372036854775808i64
        || value == 9223372036854775807i64
        || precision == -1
        || precision == 6
    {
        return Int8Value::Value(value);
    }
    if precision < 0 || precision > 6 {
        return Int8Value::Error(make_sql_error(TEMPORAL_PRECISION_ERROR));
    }
    let mut scale: i64 = 1000000i64;
    let mut index: i32 = 0;
    while index < precision {
        scale = scale / 10i64;
        index = index + 1;
    }
    let offset = scale / 2i64;
    if value < 0i64 {
        return Int8Value::Value(0i64 - (((0i64 - value) + offset) / scale) * scale);
    }
    Int8Value::Value(((value + offset) / scale) * scale)
}

pub fn sql__pg_catalog__timestamp__akly(left: TimestampValue, right: Int4Value) -> TimestampValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestampValue::Unknown = left { unresolved_flavor = 1; };
    if let Int4Value::Unknown = right { unresolved_flavor = 1; };
    if let TimestampValue::Unimplemented = left { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = right { unresolved_flavor = 2; };
    if let TimestampValue::Error(error) = left {
        return TimestampValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return TimestampValue::Error(error);
    }
    let mut condition_flavor_39_4: i32 = unresolved_flavor; if let TimestampValue::Unknown = left { if condition_flavor_39_4 < 1 { condition_flavor_39_4 = 1; }; }; if let TimestampValue::Unimplemented = left { condition_flavor_39_4 = 2; }; if let Int4Value::Unknown = right { if condition_flavor_39_4 < 1 { condition_flavor_39_4 = 1; }; }; if let Int4Value::Unimplemented = right { condition_flavor_39_4 = 2; }; if (left == TimestampValue::Unknown || left == TimestampValue::Unimplemented) || (right == Int4Value::Unknown || right == Int4Value::Unimplemented) {
        return timestamp_unresolved(condition_flavor_39_4);
    }
    if left == TimestampValue::Null || right == Int4Value::Null {
        return TimestampValue::Null;
    }
    if let TimestampValue::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            let result = temporal_adjust_precision(left_value, right_value);
            if let Int8Value::Error(error) = result {
                return TimestampValue::Error(error);
            }
            if let Int8Value::Value(value) = result {
                return TimestampValue::Value(value);
            }
        }
    }
    timestamp_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamptz__uwsx(
    left: TimestamptzValue,
    right: Int4Value,
) -> TimestamptzValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestamptzValue::Unknown = left { unresolved_flavor = 1; };
    if let Int4Value::Unknown = right { unresolved_flavor = 1; };
    if let TimestamptzValue::Unimplemented = left { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = right { unresolved_flavor = 2; };
    if let TimestamptzValue::Error(error) = left {
        return TimestamptzValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return TimestamptzValue::Error(error);
    }
    let mut condition_flavor_74_4: i32 = unresolved_flavor; if let TimestamptzValue::Unknown = left { if condition_flavor_74_4 < 1 { condition_flavor_74_4 = 1; }; }; if let TimestamptzValue::Unimplemented = left { condition_flavor_74_4 = 2; }; if let Int4Value::Unknown = right { if condition_flavor_74_4 < 1 { condition_flavor_74_4 = 1; }; }; if let Int4Value::Unimplemented = right { condition_flavor_74_4 = 2; }; if (left == TimestamptzValue::Unknown || left == TimestamptzValue::Unimplemented) || (right == Int4Value::Unknown || right == Int4Value::Unimplemented) {
        return timestamptz_unresolved(condition_flavor_74_4);
    }
    if left == TimestamptzValue::Null || right == Int4Value::Null {
        return TimestamptzValue::Null;
    }
    if let TimestamptzValue::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            let result = temporal_adjust_precision(left_value, right_value);
            if let Int8Value::Error(error) = result {
                return TimestamptzValue::Error(error);
            }
            if let Int8Value::Value(value) = result {
                return TimestamptzValue::Value(value);
            }
        }
    }
    timestamptz_unresolved(unresolved_flavor)
}

