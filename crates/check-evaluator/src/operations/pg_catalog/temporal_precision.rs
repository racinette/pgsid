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
    if let TimestampValue::Error(error) = left {
        return TimestampValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return TimestampValue::Error(error);
    }
    if left == TimestampValue::Unknown || right == Int4Value::Unknown {
        return TimestampValue::Unknown;
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
    TimestampValue::Unknown
}

pub fn sql__pg_catalog__timestamptz__uwsx(
    left: TimestamptzValue,
    right: Int4Value,
) -> TimestamptzValue {
    if let TimestamptzValue::Error(error) = left {
        return TimestamptzValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return TimestamptzValue::Error(error);
    }
    if left == TimestamptzValue::Unknown || right == Int4Value::Unknown {
        return TimestamptzValue::Unknown;
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
    TimestamptzValue::Unknown
}

