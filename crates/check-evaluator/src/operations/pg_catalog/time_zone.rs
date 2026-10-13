fn fixed_zone_wrapped_seconds(seconds: i64) -> i32 {
    let mut value = seconds % 4294967296i64;
    if value < (-2147483648i64) {
        value = value + 4294967296i64;
    };
    if value > 2147483647i64 {
        value = value - 4294967296i64;
    };
    value as i32
}
fn fixed_zone_offset(span: IntervalPayload, reverse: bool) -> Int4Value {
    if interval_special(span) != 0 || span.months != 0 || span.days != 0 {
        return Int4Value::Error(make_sql_error(TEMPORAL_FIELD_UNIT_ERROR));
    };
    let mut seconds = span.time / 1000000i64;
    if reverse {
        seconds = 0i64 - seconds;
    };
    make_int4_value(fixed_zone_wrapped_seconds(seconds))
}
fn fixed_zone_timestamp(
    zone: IntervalValue,
    input: TimestampValue,
    reverse: bool,
) -> TimestampValue {
    if let IntervalValue::Error(error) = zone {
        return TimestampValue::Error(error);
    };
    if let TimestampValue::Error(error) = input {
        return TimestampValue::Error(error);
    };
    if zone == IntervalValue::Unknown || input == TimestampValue::Unknown {
        return TimestampValue::Unknown;
    };
    if zone == IntervalValue::Null || input == TimestampValue::Null {
        return TimestampValue::Null;
    };
    if let TimestampValue::Value(time) = input {
        if time == (-9223372036854775808i64) || time == 9223372036854775807i64 {
            return input;
        };
        if let IntervalValue::Value(span) = zone {
            let offset = fixed_zone_offset(span, reverse);
            if let Int4Value::Error(error) = offset {
                return TimestampValue::Error(error);
            };
            if let Int4Value::Value(seconds) = offset {
                let result = clock_wrapped_subtract(time, (seconds as i64) * 1000000i64);
                if result == (-9223372036854775808i64) || result == 9223372036854775807i64 {
                    return TimestampValue::Error(make_sql_error(CLOCK_RANGE));
                };
                return make_timestamp_value(result);
            };
        };
    };
    TimestampValue::Unknown
}
pub fn sql__pg_catalog__timezone__lxij(
    zone: IntervalValue,
    input: TimestampValue,
) -> TimestamptzValue {
    let result = fixed_zone_timestamp(zone, input, false);
    if let TimestampValue::Error(error) = result {
        return TimestamptzValue::Error(error);
    };
    if result == TimestampValue::Null {
        return TimestamptzValue::Null;
    };
    if let TimestampValue::Value(time) = result {
        return make_timestamptz_value(time);
    };
    TimestamptzValue::Unknown
}
pub fn sql__pg_catalog__timezone__n8k4(
    zone: IntervalValue,
    input: TimestamptzValue,
) -> TimestampValue {
    fixed_zone_timestamp(zone, interval_calendar_local_payload(input), true)
}
pub fn sql__pg_catalog__timezone__5q6e(zone: IntervalValue, input: TimetzValue) -> TimetzValue {
    if let IntervalValue::Error(error) = zone {
        return TimetzValue::Error(error);
    };
    if let TimetzValue::Error(error) = input {
        return TimetzValue::Error(error);
    };
    if zone == IntervalValue::Unknown || input == TimetzValue::Unknown {
        return TimetzValue::Unknown;
    };
    if zone == IntervalValue::Null || input == TimetzValue::Null {
        return TimetzValue::Null;
    };
    if let IntervalValue::Value(span) = zone {
        if let TimetzValue::Value(time) = input {
            let offset = fixed_zone_offset(span, true);
            if let Int4Value::Error(error) = offset {
                return TimetzValue::Error(error);
            };
            if let Int4Value::Value(seconds) = offset {
                let difference = fixed_zone_wrapped_seconds((time.zone as i64) - (seconds as i64));
                let mut clock = (time.time + (difference as i64) * 1000000i64) % 86400000000i64;
                if clock < 0i64 {
                    clock = clock + 86400000000i64;
                };
                return TimetzValue::Value(TimetzPayload {
                    time: clock,
                    zone: seconds,
                });
            };
        };
    };
    TimetzValue::Unknown
}
