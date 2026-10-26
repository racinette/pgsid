pub fn sql__pg_catalog__make_timestamp__n30u(
    year: Int4Value,
    month: Int4Value,
    day: Int4Value,
    hour: Int4Value,
    minute: Int4Value,
    second: Float8Value,
) -> TimestampValue {
    if let Int4Value::Error(error) = year {
        return TimestampValue::Error(error);
    };
    if let Int4Value::Error(error) = month {
        return TimestampValue::Error(error);
    };
    if let Int4Value::Error(error) = day {
        return TimestampValue::Error(error);
    };
    if let Int4Value::Error(error) = hour {
        return TimestampValue::Error(error);
    };
    if let Int4Value::Error(error) = minute {
        return TimestampValue::Error(error);
    };
    if let Float8Value::Error(error) = second {
        return TimestampValue::Error(error);
    };
    if year == Int4Value::Unknown
        || month == Int4Value::Unknown
        || day == Int4Value::Unknown
        || hour == Int4Value::Unknown
        || minute == Int4Value::Unknown
        || second == Float8Value::Unknown
    {
        return TimestampValue::Unknown;
    };
    if year == Int4Value::Null
        || month == Int4Value::Null
        || day == Int4Value::Null
        || hour == Int4Value::Null
        || minute == Int4Value::Null
        || second == Float8Value::Null
    {
        return TimestampValue::Null;
    };
    if let Int4Value::Value(y) = year {
        if let Int4Value::Value(m) = month {
            if let Int4Value::Value(d) = day {
                if y == 0 || y < -4714 || y > 294276 || m < 1 || m > 12 || d < 1 {
                    return TimestampValue::Error(make_sql_error(CLOCK_RANGE));
                };
                let mut calendar_year = y;
                if y < 0 {
                    calendar_year = calendar_year + 1;
                };
                if d > interval_age_month_days(TemporalCalendarFields {
                    year: calendar_year,
                    month: m,
                    day: d,
                }) {
                    return TimestampValue::Error(make_sql_error(CLOCK_RANGE));
                };
                let days = temporal_julian_from_calendar(calendar_year, m, d) - 2451545i64;
                let clock = sql__pg_catalog__make_time__6c3q(hour, minute, second);
                if let TimeValue::Error(error) = clock {
                    return TimestampValue::Error(error);
                };
                if let TimeValue::Value(time) = clock {
                    return make_timestamp_value(days * 86400000000i64 + time);
                };
            };
        };
    };
    TimestampValue::Unknown
}
