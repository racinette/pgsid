fn clock_scale_value(input: TimeValue, precision: Int4Value) -> TimeValue {
    if let TimeValue::Error(error) = input {
        return TimeValue::Error(error);
    }
    if let Int4Value::Error(error) = precision {
        return TimeValue::Error(error);
    }
    if input == TimeValue::Unknown || precision == Int4Value::Unknown {
        return TimeValue::Unknown;
    }
    if input == TimeValue::Null || precision == Int4Value::Null {
        return TimeValue::Null;
    }
    if let TimeValue::Value(clock) = input {
        if let Int4Value::Value(digits) = precision {
            if digits < 0 || digits >= 6 {
                return input;
            }
            let mut scale = 1i64;
            let mut remaining: i32 = 6;
            while remaining > digits {
                scale = scale * 10i64;
                remaining = remaining - 1;
            }
            return make_time_value(((clock + scale / 2i64) / scale) * scale);
        }
    }
    TimeValue::Unknown
}
pub fn sql__pg_catalog__time__bg2r(input: TimeValue, precision: Int4Value) -> TimeValue {
    clock_scale_value(input, precision)
}
pub fn sql__pg_catalog__timetz__7slr(input: TimetzValue, precision: Int4Value) -> TimetzValue {
    if let TimetzValue::Error(error) = input {
        return TimetzValue::Error(error);
    }
    if let Int4Value::Error(error) = precision {
        return TimetzValue::Error(error);
    }
    if input == TimetzValue::Unknown || precision == Int4Value::Unknown {
        return TimetzValue::Unknown;
    }
    if input == TimetzValue::Null || precision == Int4Value::Null {
        return TimetzValue::Null;
    }
    if let TimetzValue::Value(clock) = input {
        let scaled = clock_scale_value(make_time_value(clock.time), precision);
        if let TimeValue::Error(error) = scaled {
            return TimetzValue::Error(error);
        }
        if let TimeValue::Value(time) = scaled {
            return make_timetz_value(time, clock.zone);
        }
    }
    TimetzValue::Unknown
}
pub fn sql__pg_catalog__time__3gc2(input: TimestampValue) -> TimeValue {
    if let TimestampValue::Error(error) = input {
        return TimeValue::Error(error);
    }
    if input == TimestampValue::Null {
        return TimeValue::Null;
    }
    if let TimestampValue::Value(timestamp) = input {
        if timestamp == 9223372036854775807i64 || timestamp == (-9223372036854775808i64) {
            return TimeValue::Null;
        }
        let mut time = timestamp % 86400000000i64;
        if time < 0i64 {
            time = time + 86400000000i64;
        }
        return make_time_value(time);
    }
    TimeValue::Unknown
}
pub fn sql__pg_catalog__isfinite__0u09(input: IntervalValue) -> BoolValue {
    if let IntervalValue::Error(error) = input {
        return BoolValue::Error(error);
    }
    if input == IntervalValue::Null {
        return BoolValue::Null;
    }
    if let IntervalValue::Value(span) = input {
        return BoolValue::Value(interval_special(span) == 0);
    }
    BoolValue::Unknown
}
pub fn sql__pg_catalog__make_time__6c3q(
    hour: Int4Value,
    minute: Int4Value,
    second: Float8Value,
) -> TimeValue {
    if let Int4Value::Error(error) = hour {
        return TimeValue::Error(error);
    }
    if let Int4Value::Error(error) = minute {
        return TimeValue::Error(error);
    }
    if let Float8Value::Error(error) = second {
        return TimeValue::Error(error);
    }
    if hour == Int4Value::Unknown || minute == Int4Value::Unknown || second == Float8Value::Unknown
    {
        return TimeValue::Unknown;
    }
    if hour == Int4Value::Null || minute == Int4Value::Null || second == Float8Value::Null {
        return TimeValue::Null;
    }
    if let Int4Value::Value(h) = hour {
        if let Int4Value::Value(m) = minute {
            let known_second = float8_semantic(second);
            if let Float8Value::Value(bits) = known_second {
                let s = float8_number(bits);
                if h < 0 || h > 24 || m < 0 || m > 59 || s != s || s < -1.0f64 || s > 61.0f64 {
                    return TimeValue::Error(make_sql_error(CLOCK_RANGE));
                }
                let base_seconds = (h * 60 + m) * 60;
                let scaled = s * 1000000.0f64;
                let mut micros = scaled as i32;
                let fraction = scaled - (micros as f64);
                if fraction > 0.5f64 || (fraction == 0.5f64 && micros % 2 != 0) {
                    micros = micros + 1;
                }
                if fraction < -0.5f64 || (fraction == -0.5f64 && micros % 2 != 0) {
                    micros = micros - 1;
                }
                let time = (base_seconds as i64) * 1000000i64 + (micros as i64);
                if micros < 0 || micros > 60000000 || time > 86400000000i64 {
                    return TimeValue::Error(make_sql_error(CLOCK_RANGE));
                }
                return make_time_value(time);
            }
        }
    }
    TimeValue::Unknown
}
fn clock_date_timestamp(date: DateValue, clock: TimeValue) -> TimestampValue {
    if let DateValue::Error(error) = date {
        return TimestampValue::Error(error);
    }
    if let TimeValue::Error(error) = clock {
        return TimestampValue::Error(error);
    }
    if date == DateValue::Unknown || clock == TimeValue::Unknown {
        return TimestampValue::Unknown;
    }
    if date == DateValue::Null || clock == TimeValue::Null {
        return TimestampValue::Null;
    }
    let base = sql__pg_catalog__timestamp__swxj(date);
    if let TimestampValue::Error(error) = base {
        return TimestampValue::Error(error);
    }
    if let TimestampValue::Value(midnight) = base {
        if midnight == (-9223372036854775808i64) || midnight == 9223372036854775807i64 {
            return base;
        }
        if let TimeValue::Value(time) = clock {
            return make_timestamp_value(midnight + time);
        }
    }
    TimestampValue::Unknown
}
fn clock_date_timestamptz(date: DateValue, clock: TimetzValue) -> TimestamptzValue {
    if let DateValue::Error(error) = date {
        return TimestamptzValue::Error(error);
    }
    if let TimetzValue::Error(error) = clock {
        return TimestamptzValue::Error(error);
    }
    if date == DateValue::Unknown || clock == TimetzValue::Unknown {
        return TimestamptzValue::Unknown;
    }
    if date == DateValue::Null || clock == TimetzValue::Null {
        return TimestamptzValue::Null;
    }
    let base = sql__pg_catalog__timestamp__swxj(date);
    if let TimestampValue::Error(error) = base {
        return TimestamptzValue::Error(error);
    }
    if let TimestampValue::Value(midnight) = base {
        if midnight == (-9223372036854775808i64) || midnight == 9223372036854775807i64 {
            return make_timestamptz_value(midnight);
        }
        if let TimetzValue::Value(time) = clock {
            return make_timestamptz_value(midnight + time.time + (time.zone as i64) * 1000000i64);
        }
    }
    TimestamptzValue::Unknown
}
pub fn sql__pg_catalog__timestamp__4biu(date: DateValue, clock: TimeValue) -> TimestampValue {
    clock_date_timestamp(date, clock)
}
pub fn sql__pg_catalog__datetime_pl__wora(date: DateValue, clock: TimeValue) -> TimestampValue {
    clock_date_timestamp(date, clock)
}
pub fn sql__pg_catalog__timedate_pl__lhsk(clock: TimeValue, date: DateValue) -> TimestampValue {
    if let TimeValue::Error(error) = clock {
        return TimestampValue::Error(error);
    }
    clock_date_timestamp(date, clock)
}
pub fn sql__pg_catalog__timestamptz__zcph(date: DateValue, clock: TimetzValue) -> TimestamptzValue {
    clock_date_timestamptz(date, clock)
}
pub fn sql__pg_catalog__datetimetz_pl__w8dd(
    date: DateValue,
    clock: TimetzValue,
) -> TimestamptzValue {
    clock_date_timestamptz(date, clock)
}
pub fn sql__pg_catalog__timetzdate_pl__1ycq(
    clock: TimetzValue,
    date: DateValue,
) -> TimestamptzValue {
    if let TimetzValue::Error(error) = clock {
        return TimestamptzValue::Error(error);
    }
    clock_date_timestamptz(date, clock)
}
