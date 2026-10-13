pub fn sql__pg_catalog__date_trunc__d8uf(units: TextValue, input: IntervalValue) -> IntervalValue {
    if let TextValue::Error(error) = units {
        return IntervalValue::Error(error);
    };
    if let IntervalValue::Error(error) = input {
        return IntervalValue::Error(error);
    };
    if units == TextValue::Unknown || input == IntervalValue::Unknown {
        return IntervalValue::Unknown;
    };
    if units == TextValue::Null || input == IntervalValue::Null {
        return IntervalValue::Null;
    };
    if let TextValue::Value(unit) = units {
        if let IntervalValue::Value(span) = input {
            let code = temporal_unit_code(unit.as_str());
            if code == 0 || code == -2 {
                return IntervalValue::Error(make_sql_error(TEMPORAL_FIELD_UNIT_ERROR));
            };
            if code < 1 || code > 13 || code == 7 {
                return IntervalValue::Error(make_sql_error(TEMPORAL_FIELD_UNSUPPORTED_ERROR));
            };
            if interval_special(span) != 0 {
                return input;
            };
            let mut months = span.months;
            let mut days = span.days;
            let mut time = span.time;
            if code == 2 {
                time = (time / 1000i64) * 1000i64;
            };
            if code == 3 {
                time = (time / 1000000i64) * 1000000i64;
            };
            if code == 4 {
                time = (time / 60000000i64) * 60000000i64;
            };
            if code == 5 {
                time = (time / 3600000000i64) * 3600000000i64;
            };
            if code >= 6 {
                time = 0i64;
            };
            if code >= 8 {
                days = 0;
            };
            if code == 9 {
                months = (months / 3) * 3;
            };
            if code == 10 {
                months = (months / 12) * 12;
            };
            if code == 11 {
                months = (months / 120) * 120;
            };
            if code == 12 {
                months = (months / 1200) * 1200;
            };
            if code == 13 {
                months = (months / 12000) * 12000;
            };
            return make_interval_value(months, days, time);
        };
    };
    IntervalValue::Unknown
}
pub fn sql__pg_catalog__date_bin__67ed(
    stride: IntervalValue,
    input: TimestampValue,
    origin: TimestampValue,
) -> TimestampValue {
    if let IntervalValue::Error(error) = stride {
        return TimestampValue::Error(error);
    };
    if let TimestampValue::Error(error) = input {
        return TimestampValue::Error(error);
    };
    if let TimestampValue::Error(error) = origin {
        return TimestampValue::Error(error);
    };
    if stride == IntervalValue::Unknown
        || input == TimestampValue::Unknown
        || origin == TimestampValue::Unknown
    {
        return TimestampValue::Unknown;
    };
    if stride == IntervalValue::Null
        || input == TimestampValue::Null
        || origin == TimestampValue::Null
    {
        return TimestampValue::Null;
    };
    if let IntervalValue::Value(span) = stride {
        if let TimestampValue::Value(timestamp) = input {
            if let TimestampValue::Value(start) = origin {
                let low = -9223372036854775808i64;
                let high = 9223372036854775807i64;
                if timestamp == low || timestamp == high {
                    return input;
                };
                if start == low || start == high || interval_special(span) != 0 {
                    return TimestampValue::Error(make_sql_error(CLOCK_RANGE));
                };
                if span.months != 0 {
                    return TimestampValue::Error(make_sql_error(TEMPORAL_FIELD_UNSUPPORTED_ERROR));
                };
                let days = span.days as i64;
                if days < (-106751991i64) || days > 106751991i64 {
                    return TimestampValue::Error(make_sql_error(CLOCK_RANGE));
                };
                let day_time = days * 86400000000i64;
                if (span.time > 0i64 && day_time > high - span.time)
                    || (span.time < 0i64 && day_time < low - span.time)
                {
                    return TimestampValue::Error(make_sql_error(CLOCK_RANGE));
                };
                let width = day_time + span.time;
                if width <= 0i64 {
                    return TimestampValue::Error(make_sql_error(CLOCK_RANGE));
                };
                if (start > 0i64 && timestamp < low + start)
                    || (start < 0i64 && timestamp > high + start)
                {
                    return TimestampValue::Error(make_sql_error(CLOCK_RANGE));
                };
                let difference = timestamp - start;
                let remainder = difference % width;
                let mut result = timestamp - remainder;
                if remainder < 0i64 {
                    if result < low + width {
                        return TimestampValue::Error(make_sql_error(CLOCK_RANGE));
                    };
                    result = result - width;
                };
                if result == low || result == high {
                    return TimestampValue::Error(make_sql_error(CLOCK_RANGE));
                };
                return make_timestamp_value(result);
            };
        };
    };
    TimestampValue::Unknown
}
pub fn sql__pg_catalog__date_bin__0b5n(
    stride: IntervalValue,
    input: TimestamptzValue,
    origin: TimestamptzValue,
) -> TimestamptzValue {
    let source_time = interval_calendar_local_payload(input);
    let origin_time = interval_calendar_local_payload(origin);
    let result = sql__pg_catalog__date_bin__67ed(stride, source_time, origin_time);
    if let TimestampValue::Error(error) = result {
        return TimestamptzValue::Error(error);
    };
    if result == TimestampValue::Null {
        return TimestamptzValue::Null;
    };
    if let TimestampValue::Value(timestamp) = result {
        return make_timestamptz_value(timestamp);
    };
    TimestamptzValue::Unknown
}
