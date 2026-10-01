fn timestamptz_from_microseconds(value: Int8Value) -> TimestamptzValue {
    if let Int8Value::Error(error) = value {
        return TimestamptzValue::Error(error);
    }
    if let Int8Value::Value(microseconds) = value {
        return make_timestamptz_value(microseconds);
    }
    if value == Int8Value::Null {
        return TimestamptzValue::Null;
    }
    TimestamptzValue::Unknown
}

pub fn timestamptz_from_calendar(
    year: i32,
    month: i32,
    day: i32,
    hour: i32,
    minute: i32,
    second: i32,
    microsecond: i32,
    offset_seconds: i32,
) -> TimestamptzValue {
    let parsed = timestamp_calendar_microseconds(
        year,
        month,
        day,
        hour,
        minute,
        second,
        microsecond,
        offset_seconds,
        true,
    );
    timestamptz_from_microseconds(parsed)
}

pub fn timestamptz_from_text(value: TextValue) -> TimestamptzValue {
    let parsed = parse_timestamp_text(value, true);
    timestamptz_from_microseconds(parsed)
}
